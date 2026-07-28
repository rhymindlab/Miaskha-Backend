const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/Product");
const Users = require("../models/users");
const {
  createOrder: createShiprocketOrder,
} = require("../services/shiprocket.service");

const getUserId = (req) => req.user?._id || req.user?.id;

const safeEqual = (first, second) => {
  if (!first || !second || first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(first, "utf8"),
    Buffer.from(second, "utf8")
  );
};

const buildShiprocketPayload = (order, user) => {
  const address = order.shippingAddress;

  // Shiprocket expects one package's dimensions.
  // For multiple products, use the largest dimensions and
  // total packed weight as a practical starting point.
  const totalWeight = order.items.reduce((total, item) => {
    const weight = Number(item.shipping?.weight) || 0.5;
    return total + weight * item.quantity;
  }, 0);

  const length = Math.max(
    ...order.items.map(
      (item) => Number(item.shipping?.length) || 15
    )
  );

  const breadth = Math.max(
    ...order.items.map(
      (item) => Number(item.shipping?.breadth) || 12
    )
  );

  const height = Math.max(
    ...order.items.map(
      (item) => Number(item.shipping?.height) || 6
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

    billing_pincode:
      String(address.pinCode),

    billing_state:
      address.state,

    billing_country:
      address.country || "India",

    billing_email:
      user.email,

    billing_phone:
      address.mobile,

    shipping_is_billing: true,

    order_items: order.items.map((item) => ({
      name: item.title,

      sku:
        item.sku ||
        String(item.product),

      units: item.quantity,

      selling_price: Number(item.price),

      discount: 0,

      tax: Number(item.gst) || 0,

      hsn: "",
    })),

    payment_method: "Prepaid",

    shipping_charges:
      Number(order.shippingCharge) || 0,

    giftwrap_charges: 0,

    transaction_charges: 0,

    total_discount:
      Number(order.discount) || 0,

    sub_total:
      Number(order.subtotal) || Number(order.amount),

    length,

    breadth,

    height,

    weight: Math.max(totalWeight, 0.5),
  };
};

// ==============================
// CREATE ORDER
// ==============================
exports.createOrder = async (req, res) => {
  try {
    if (!razorpay || !process.env.RAZORPAY_KEY_ID) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured",
      });
    }

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const { shippingAddress } = req.body;

    if (!shippingAddress?.firstName || !shippingAddress?.mobile) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    const cartItems = await Cart.find({
      user_id: String(userId),
    }).lean();

    if (!cartItems.length) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // ----------------------------------
    // Fetch all products in one query
    // ----------------------------------

    const productIds = cartItems.map((item) => item.product_id);

    const products = await Product.find({
      _id: {
        $in: productIds,
      },
    })
      .select("title images sku shipping productWeight")
      .lean();

    const productMap = new Map(
      products.map((product) => [
        String(product._id),
        product,
      ])
    );

    let subtotal = 0;
    let gstTotal = 0;

    const items = [];

    for (const item of cartItems) {
      const product = productMap.get(
        String(item.product_id)
      );

      if (!product) {
        return res.status(400).json({
          success: false,
          message:
            "A product in your cart no longer exists.",
        });
      }

      const quantity =
        Math.max(1, Number(item.quantity) || 1);

      const price =
        Number(item.salePrice) || 0;

      const gst =
        Number(item.gst) || 0;

      const itemSubtotal =
        price * quantity;

      const itemGST =
        gst * quantity;

      const itemTotal =
        itemSubtotal + itemGST;

      subtotal += itemSubtotal;
      gstTotal += Math.round(itemGST);

      items.push({
        product: item.product_id,

        title:
          item.title ||
          product.title ||
          "Product",

        sku:
          product.sku || "",

        image:
          item.image ||
          product.images?.[0] ||
          "",

        quantity,

        price,

        gst,

        total: itemTotal,

        shipping: {
          weight:
            Number(product.shipping?.weight) || 0.5,

          length:
            Number(product.shipping?.length) || 15,

          breadth:
            Number(product.shipping?.breadth) || 12,

          height:
            Number(product.shipping?.height) || 6,
        },
      });
    }

    const amount = Math.round(subtotal + gstTotal);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart amount",
      });
    }

    const receipt = `receipt_${Date.now()}_${String(
      userId
    ).slice(-6)}`;

    const razorpayOrder =
      await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt,
      });
    
    const orderNumber = `MIA${Date.now()}`;

    const order = await Order.create({
    orderNumber,

    user: userId,

    items,

    shippingAddress,

    subtotal,

    gstTotal,

    amount,

    currency: "INR",

    receipt,

    razorpayOrderId: razorpayOrder.id,

    paymentStatus: "PENDING",

    orderStatus: "PLACED",

    tracking: [
        {
        status: "Order Placed",
        location: "Online Store",
        message: "Your order has been placed successfully.",
        },
    ],
    });

    return res.status(201).json({
      success: true,

      orderId: razorpayOrder.id,

      amount: razorpayOrder.amount,

      currency:
        razorpayOrder.currency,

      key: process.env.RAZORPAY_KEY_ID,

      dbOrderId: order._id,
    });
  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create order",
    });
  }
};

// ==============================
// VERIFY PAYMENT
// ==============================
exports.verifyPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured",
      });
    }

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
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
        message: "Missing payment details",
      });
    }

    const order = await Order.findById(dbOrderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay order",
      });
    }

    /* ==========================================
       ALREADY VERIFIED
    ========================================== */

    if (order.paymentStatus === "SUCCESS") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        order,
      });
    }

    /* ==========================================
       VERIFY RAZORPAY SIGNATURE
    ========================================== */

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
        message: "Payment verification failed",
      });
    }

    /* ==========================================
       PAYMENT SUCCESS
    ========================================== */

    order.paymentStatus = "SUCCESS";
    order.orderStatus = "CONFIRMED";

    order.razorpayPaymentId =
      razorpay_payment_id;

    order.razorpaySignature =
      razorpay_signature;

    order.paidAt = new Date();

    const hasPaymentSuccess =
      order.tracking.some(
        (item) =>
          item.status === "Payment Successful"
      );

    if (!hasPaymentSuccess) {
      order.tracking.push({
        status: "Payment Successful",
        code: "PAYMENT_SUCCESS",
        location: "Online Payment",
        message:
          "Payment received successfully.",
      });

      order.tracking.push({
        status: "Order Confirmed",
        code: "CONFIRMED",
        location: "MIASHKA",
        message:
          "Your order has been confirmed.",
      });
    }

    // Save payment FIRST.
    // Shiprocket failure must never undo payment success.
    await order.save();

    /* ==========================================
       UPDATE STOCK
    ========================================== */

    if (order.items.length) {
      await Product.bulkWrite(
        order.items.map((item) => ({
          updateOne: {
            filter: {
              _id: item.product,
            },

            update: {
              $inc: {
                stock: -item.quantity,
              },
            },
          },
        }))
      );
    }

    /* ==========================================
       CLEAR CART
    ========================================== */

    await Cart.deleteMany({
      user_id: String(order.user),
    });

    /* ==========================================
       CREATE SHIPROCKET ORDER
    ========================================== */

    let shiprocketCreated = false;
    let shiprocketError = null;

    try {
      if (
        !process.env.SHIPROCKET_EMAIL ||
        !process.env.SHIPROCKET_PASSWORD ||
        !process.env.SHIPROCKET_PICKUP_LOCATION
      ) {
        throw new Error(
          "Shiprocket environment variables are missing"
        );
      }

      /*
       * Prevent duplicate Shiprocket orders.
       *
       * This is important because the frontend could
       * potentially call payment verification more than once.
       */
      if (!order.shiprocket?.orderId) {
        const user = await Users.findById(
          order.user
        )
          .select("email")
          .lean();

        if (!user?.email) {
          throw new Error(
            "Customer email is missing"
          );
        }

        const shiprocketPayload =
          buildShiprocketPayload(
            order,
            user
          );

        console.log(
          "Creating Shiprocket order:",
          order.orderNumber
        );

        const shiprocketResponse =
          await createShiprocketOrder(
            shiprocketPayload
          );

        console.log(
          "Shiprocket response:",
          shiprocketResponse
        );

        /*
         * Shiprocket create-order responses normally
         * contain order_id and shipment_id.
         */

        if (!shiprocketResponse?.order_id) {
          throw new Error(
            shiprocketResponse?.message ||
              "Shiprocket order was not created"
          );
        }

        order.shiprocket.orderId =
          String(
            shiprocketResponse.order_id
          );

        order.shiprocket.shipmentId =
          shiprocketResponse.shipment_id
            ? String(
                shiprocketResponse.shipment_id
              )
            : null;

        order.shiprocket.currentStatus =
          "Order Created";

        order.shiprocket.lastSyncedAt =
          new Date();

        order.tracking.push({
          status: "Shipment Created",
          code: "SHIPMENT_CREATED",
          location: "MIASHKA",
          message:
            "Your shipment has been created and is being prepared for dispatch.",
        });

        await order.save();

        shiprocketCreated = true;

        console.log(
          "Shiprocket order created:",
          order.shiprocket.orderId
        );
      } else {
        shiprocketCreated = true;

        console.log(
          "Shiprocket order already exists:",
          order.shiprocket.orderId
        );
      }
    } catch (shiprocketErr) {
      shiprocketError =
        shiprocketErr.response?.data?.message ||
        shiprocketErr.response?.data?.errors ||
        shiprocketErr.message ||
        "Unable to create Shiprocket order";

      console.error(
        "Shiprocket creation failed:",
        shiprocketErr.response?.data ||
          shiprocketErr.message
      );

      /*
       * IMPORTANT:
       *
       * Do NOT:
       *
       * order.paymentStatus = "FAILED"
       *
       * Razorpay payment has already succeeded.
       */
    }

    /* ==========================================
       RESPONSE
    ========================================== */

    return res.status(200).json({
      success: true,

      message: "Payment successful",

      order,

      shipping: {
        shiprocketCreated,

        orderId:
          order.shiprocket?.orderId ||
          null,

        shipmentId:
          order.shiprocket?.shipmentId ||
          null,

        error:
          shiprocketError,
      },
    });
  } catch (error) {
    console.error(
      "Verify payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
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
        message: "Order ID is required",
      });
    }

    const order = await Order.findById(dbOrderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Don't overwrite successful payment
    if (order.paymentStatus === "PENDING") {

        order.paymentStatus = "FAILED";

        order.orderStatus = "CANCELLED";

        order.tracking.push({
            status: "Payment Failed",
            location: "Online Payment",
            message: "Payment could not be completed."
        });

        await order.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment marked as failed",
    });
  } catch (error) {
    console.error("Payment failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update payment status",
    });
  }
};

exports.razorpayWebhook = async (req, res) => {
  try {
    console.log("Webhook received");

    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
    });
  }
};
exports.buildShiprocketPayload = buildShiprocketPayload;