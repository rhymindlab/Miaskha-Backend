const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");

const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/Product");
const Users = require("../models/users");

const {
    createOrder: createShiprocketOrder,
} = require("../services/shiprocket.service");

const getUserId = (req) => req.user?._id || req.user?.id;

const safeEqual = (a, b) => {

    if (!a || !b) return false;

    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(
        Buffer.from(a),
        Buffer.from(b)
    );

};

function generateOrderNumber() {

    const random = Math.floor(
        100000 + Math.random() * 900000
    );

    return `MSK-${new Date().getFullYear()}-${random}`;

}

function generateReceipt(userId) {

    return `MIA-${Date.now()}-${String(userId).slice(-6)}`;

}

function buildShiprocketPayload(order, user) {

    const address = order.shippingAddress;

    const totalWeight = order.items.reduce(
        (sum, item) =>
            sum +
            (
                (Number(item.shipping?.weight) || 0.5)
                * item.quantity
            ),
        0
    );

    const length = Math.max(
        ...order.items.map(
            item =>
                Number(item.shipping?.length) || 15
        )
    );

    const breadth = Math.max(
        ...order.items.map(
            item =>
                Number(item.shipping?.breadth) || 12
        )
    );

    const height = Math.max(
        ...order.items.map(
            item =>
                Number(item.shipping?.height) || 6
        )
    );

    return {

        order_id: order.orderNumber,

        order_date: new Date(order.createdAt)
            .toISOString()
            .slice(0, 16)
            .replace("T", " "),

        pickup_location:
            process.env.SHIPROCKET_PICKUP_LOCATION,

        billing_customer_name:
            address.firstName,

        billing_last_name:
            address.lastName || "",

        billing_address:
            address.address,

        billing_city:
            address.city,

        billing_state:
            address.state,

        billing_country:
            address.country || "India",

        billing_pincode:
            String(address.pinCode),

        billing_email:
            user.email,

        billing_phone:
            address.mobile,

        shipping_is_billing:
            order.sameAsBilling ?? true,

        order_items: order.items.map(item => ({

            name: item.title,

            sku:
                item.sku ||
                String(item.product),

            units:
                item.quantity,

            selling_price:
                Number(item.price),

            discount: 0,

            tax:
                Number(item.gst),

            hsn: "",

        })),

        payment_method:

            order.paymentMethod === "COD"
                ? "COD"
                : "Prepaid",

        shipping_charges:
            Number(order.shippingCharge) || 0,

        transaction_charges: 0,

        giftwrap_charges: 0,

        total_discount:
            Number(order.discount) || 0,

        sub_total:
            Number(order.subtotal),

        length,

        breadth,

        height,

        weight:
            Math.max(totalWeight, 0.5),

    };

}

// ==============================
// CREATE ORDER
// ==============================
exports.createOrder = async (req, res) => {

    try {

        if (!razorpay || !process.env.RAZORPAY_KEY_ID) {

            throw new Error(
                "Razorpay is not configured."
            );

        }

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({

                success: false,

                message: "Please login first.",

            });

        }

        const {

            shippingAddress,

            billingAddress,

        } = req.body;

        if (
            !shippingAddress ||
            !shippingAddress.firstName ||
            !shippingAddress.mobile
        ) {

            return res.status(400).json({

                success: false,

                message: "Shipping address is required.",

            });

        }

        const user = await Users.findById(userId)
            .select("firstName lastName email mobile")
            .lean();

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found.",

            });

        }

        const cartItems = await Cart.find({
            user_id: String(userId),
        });

        if (!cartItems.length) {

            return res.status(400).json({

                success: false,

                message: "Cart is empty.",

            });

        }

        const productIds = cartItems.map(
            item => item.product_id
        );

        const products = await Product.find({
            _id: { $in: productIds },
        }).lean();

        const productMap = new Map(
            products.map(product => [
                String(product._id),
                product,
            ])
        );

        let subtotal = 0;
        let gstTotal = 0;

        const items = [];

        for (const cartItem of cartItems) {

            const product =
                productMap.get(
                    String(cartItem.product_id)
                );

            if (!product) {

                throw new Error(
                    "Product no longer exists."
                );

            }

            const quantity =
                Math.max(
                    1,
                    Number(cartItem.quantity)
                );

            /* =====================================
               STOCK VALIDATION
            ===================================== */

            if (
                product.stock < quantity
            ) {

                throw new Error(
                    `${product.title} is out of stock.`
                );

            }

            const price =
                Number(cartItem.salePrice);

            const gst =
                Number(cartItem.gst);

            const itemSubtotal =
                price * quantity;

            const itemGST =
                gst * quantity;

            subtotal += itemSubtotal;
            gstTotal += itemGST;

            items.push({

                product:
                    cartItem.product_id,

                title:
                    cartItem.title ||
                    product.title,

                sku:
                    product.sku || "",

                image:
                    cartItem.image ||
                    product.images?.[0] ||
                    "",

                quantity,

                price,

                gst,

                total:
                    itemSubtotal +
                    itemGST,

                shipping: {

                    weight:
                        Number(product.shipping?.weight) ||
                        0.5,

                    length:
                        Number(product.shipping?.length) ||
                        15,

                    breadth:
                        Number(product.shipping?.breadth) ||
                        12,

                    height:
                        Number(product.shipping?.height) ||
                        6,

                },

            });

        }

        const amount =
            Math.round(
                subtotal + gstTotal
            );

        if (amount <= 0) {

            throw new Error(
                "Invalid order amount."
            );

        }

        const receipt =
            generateReceipt(userId);

        const razorpayOrder =
            await razorpay.orders.create({

                amount:
                    amount * 100,

                currency:
                    "INR",

                receipt,

            });
        console.log("User: ",user)
        

        const order =
            await Order.create({

                orderNumber:
                    generateOrderNumber(),

                user:
                    userId,

                customerName:
                    `${user.firstName} ${user.lastName}`,

                customerEmail:
                    user.email,

                customerPhone:
                    user.mobile,

                items,

                billingAddress,

                shippingAddress,

                subtotal,

                gstTotal,

                amount,

                receipt,

                razorpayOrderId:
                    razorpayOrder.id,

                paymentStatus:
                    "PENDING",

                orderStatus:
                    "PLACED",

                tracking: [

                    {

                        status:
                            "Order Placed",

                        code:
                            "PLACED",

                        location:
                            "Online Store",

                        message:
                            "Your order has been placed successfully.",

                    },

                ],

            });

        return res.status(201).json({

            success: true,

            key:
                process.env.RAZORPAY_KEY_ID,

            orderId:
                razorpayOrder.id,

            dbOrderId:
                order._id,

            amount:
                razorpayOrder.amount,

            currency:
                razorpayOrder.currency,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to create order",

        });

    }

};
// ==============================
// VERIFY PAYMENT
// ==============================
exports.verifyPayment = async (req, res) => {

    try {

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Please login first.",
            });

        }

        const {

            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            dbOrderId,

        } = req.body;

        if (

            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !dbOrderId

        ) {

            return res.status(400).json({

                success: false,
                message: "Payment information missing.",

            });

        }

        const order = await Order.findById(dbOrderId);

        if (!order) {

            return res.status(404).json({

                success: false,
                message: "Order not found.",

            });

        }

        if (String(order.user) !== String(userId)) {

            return res.status(403).json({

                success: false,
                message: "Unauthorized.",

            });

        }

        if (order.paymentStatus === "SUCCESS") {

            return res.status(200).json({

                success: true,

                message: "Payment already verified.",

                order,

            });

        }

        const generatedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                `${razorpay_order_id}|${razorpay_payment_id}`
            )
            .digest("hex");

        if (

            !safeEqual(
                generatedSignature,
                razorpay_signature
            )

        ) {

            return res.status(400).json({

                success: false,
                message:
                    "Invalid payment signature.",

            });

        }

        /* =====================================
            PAYMENT SUCCESS
        ===================================== */

        order.paymentStatus = "SUCCESS";

        order.orderStatus = "CONFIRMED";

        order.razorpayPaymentId =
            razorpay_payment_id;

        order.razorpaySignature =
            razorpay_signature;

        order.paidAt = new Date();

        order.tracking.push({

            status:
                "Payment Successful",

            code:
                "PAYMENT_SUCCESS",

            location:
                "Razorpay",

            message:
                "Payment received successfully.",

        });

        order.tracking.push({

            status:
                "Order Confirmed",

            code:
                "CONFIRMED",

            location:
                "MIASHKA",

            message:
                "Your order has been confirmed.",

        });

        await order.save();

        /* =====================================
            UPDATE STOCK
        ===================================== */

        for (const item of order.items) {

            const updated =
                await Product.findOneAndUpdate(

                    {

                        _id:
                            item.product,

                        stock: {

                            $gte:
                                item.quantity,

                        },

                    },

                    {

                        $inc: {

                            stock:
                                -item.quantity,

                        },

                    }

                );

            if (!updated) {

                throw new Error(

                    `${item.title} is out of stock.`

                );

            }

        }

        /* =====================================
            CLEAR CART
        ===================================== */

        await Cart.deleteMany({

            user_id: String(order.user),

        });

        /* =====================================
            CREATE SHIPROCKET ORDER
        ===================================== */

        let shiprocketCreated = false;
        let shiprocketError = null;

        try {

            if (!order.shiprocket?.orderId) {

                const user = await Users.findById(order.user)
                    .select("email")
                    .lean();

                const payload =
                    buildShiprocketPayload(
                        order,
                        user
                    );

                const response =
                    await createShiprocketOrder(
                        payload
                    );

                if (!response?.order_id) {

                    throw new Error(
                        response?.message ||
                        "Shiprocket order creation failed."
                    );

                }

                order.shiprocket.orderId =
                    String(response.order_id);

                order.shiprocket.shipmentId =
                    response.shipment_id
                        ? String(response.shipment_id)
                        : null;

                order.shiprocket.currentStatus =
                    "Order Created";

                order.shiprocket.lastSyncedAt =
                    new Date();

                order.tracking.push({

                    status:
                        "Shipment Created",

                    code:
                        "SHIPMENT_CREATED",

                    location:
                        "MIASHKA",

                    message:
                        "Shipment has been created successfully.",

                });

                await order.save();

                shiprocketCreated = true;

            } else {

                shiprocketCreated = true;

            }

        } catch (err) {

            console.error(
                "Shiprocket Error:",
                err.response?.data ||
                err.message
            );

            shiprocketError =
                err.response?.data?.message ||
                err.message;

        }

        /* =====================================
            RESPONSE
        ===================================== */

        return res.status(200).json({

            success: true,

            message:
                "Payment verified successfully.",

            order,

            shipping: {

                created:
                    shiprocketCreated,

                orderId:
                    order.shiprocket?.orderId,

                shipmentId:
                    order.shiprocket?.shipmentId,

                error:
                    shiprocketError,

            },

        });

    } catch (error) {

        console.error(
            "Verify Payment Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to verify payment.",

        });

    }

};

// ==============================
// PAYMENT FAILED
// ==============================
exports.paymentFailed = async (req, res) => {

    try {

        const userId = getUserId(req);

        const { dbOrderId } = req.body;

        if (!dbOrderId) {

            return res.status(400).json({

                success: false,
                message: "Order ID is required.",

            });

        }

        const order = await Order.findById(dbOrderId);

        if (!order) {

            return res.status(404).json({

                success: false,
                message: "Order not found.",

            });

        }

        if (String(order.user) !== String(userId)) {

            return res.status(403).json({

                success: false,
                message: "Unauthorized.",

            });

        }

        if (order.paymentStatus === "SUCCESS") {

            return res.status(400).json({

                success: false,
                message: "Payment already completed.",

            });

        }

        order.paymentStatus = "FAILED";

        order.orderStatus = "CANCELLED";

        order.cancelledAt = new Date();

        order.addTracking({

            status: "Payment Failed",

            code: "PAYMENT_FAILED",

            location: "Razorpay",

            message: "Payment could not be completed.",

        });

        await order.save();

        return res.status(200).json({

            success: true,

            message: "Payment marked as failed.",

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Unable to update payment.",

        });

    }

};

// ==============================
// RAZORPAY WEBHOOK
// ==============================

exports.razorpayWebhook = async (req, res) => {

    try {

        const signature =
            req.headers["x-razorpay-signature"];

        const body =
            JSON.stringify(req.body);

        const expectedSignature = crypto

            .createHmac(

                "sha256",

                process.env.RAZORPAY_WEBHOOK_SECRET

            )

            .update(body)

            .digest("hex");

        if (

            !safeEqual(

                expectedSignature,

                signature

            )

        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid webhook signature.",

            });

        }

        const event = req.body.event;

        /* ======================================
           PAYMENT CAPTURED
        ====================================== */

        if (event === "payment.captured") {

            const payment =
                req.body.payload.payment.entity;

            const order =
                await Order.findOne({

                    razorpayOrderId:
                        payment.order_id,

                });

            if (order) {

                if (

                    order.paymentStatus !==
                    "SUCCESS"

                ) {

                    order.paymentStatus =
                        "SUCCESS";

                    order.orderStatus =
                        "CONFIRMED";

                    order.razorpayPaymentId =
                        payment.id;

                    order.paidAt =
                        new Date();

                    order.addTracking({

                        status:
                            "Payment Successful",

                        code:
                            "PAYMENT_SUCCESS",

                        location:
                            "Razorpay",

                        message:
                            "Payment confirmed via webhook.",

                    });

                    await order.save();

                }

            }

        }

        /* ======================================
           PAYMENT FAILED
        ====================================== */

        if (event === "payment.failed") {

            const payment =
                req.body.payload.payment.entity;

            const order =
                await Order.findOne({

                    razorpayOrderId:
                        payment.order_id,

                });

            if (

                order &&
                order.paymentStatus ===
                    "PENDING"

            ) {

                order.paymentStatus =
                    "FAILED";

                order.orderStatus =
                    "CANCELLED";

                order.addTracking({

                    status:
                        "Payment Failed",

                    code:
                        "PAYMENT_FAILED",

                    location:
                        "Razorpay",

                    message:
                        payment.error_description ||
                        "Payment failed.",

                });

                await order.save();

            }

        }

        /* ======================================
           REFUND
        ====================================== */

        if (event === "refund.processed") {

            const refund =
                req.body.payload.refund.entity;

            const order =
                await Order.findOne({

                    razorpayPaymentId:
                        refund.payment_id,

                });

            if (order) {

                order.paymentStatus =
                    "REFUNDED";

                order.addTracking({

                    status:
                        "Refund Processed",

                    code:
                        "REFUNDED",

                    location:
                        "Razorpay",

                    message:
                        "Refund has been processed.",

                });

                await order.save();

            }

        }

        return res.status(200).json({

            success: true,

        });

    } catch (error) {

        console.error(

            "Webhook Error:",

            error

        );

        return res.status(500).json({

            success: false,

        });

    }

};

exports.buildShiprocketPayload = buildShiprocketPayload;