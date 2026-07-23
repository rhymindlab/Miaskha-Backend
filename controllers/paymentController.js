// const crypto = require("crypto");

// const razorpay = require("../config/razorpay");

// const Order = require("../models/Order");
// const Cart = require("../models/Cart");
// const Product = require("../models/Product");

// /*
// =========================================
// Create Razorpay Order
// POST /api/payment/create-order
// =========================================
// */

// exports.createOrder = async (req, res) => {
//     try {

//         const userId = req.user.id;

//         const { shippingAddress } = req.body;

//         const cartItems = await Cart.find({ user_id: userId })
//             .populate("product_id");

//         if (!cartItems.length) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Cart is empty"
//             });
//         }

//         let amount = 0;

//         const items = [];

//         cartItems.forEach((item) => {

//             const total = item.salePrice * item.quantity;

//             amount += total;

//             items.push({
//                 product: item.product_id._id,
//                 title: item.product_id.title,
//                 image: item.product_id.images?.[0] || "",
//                 quantity: item.quantity,
//                 price: item.salePrice,
//                 total
//             });

//         });

//         const receipt = `receipt_${Date.now()}`;

//         const razorpayOrder = await razorpay.orders.create({

//             amount: Math.round(amount * 100),

//             currency: "INR",

//             receipt

//         });

//         const order = await Order.create({

//             user: userId,

//             items,

//             shippingAddress,

//             amount,

//             receipt,

//             razorpayOrderId: razorpayOrder.id,

//             paymentStatus: "PENDING"

//         });

//         return res.status(200).json({

//             success: true,

//             orderId: razorpayOrder.id,

//             amount: razorpayOrder.amount,

//             currency: razorpayOrder.currency,

//             key: process.env.RAZORPAY_KEY_ID,

//             dbOrderId: order._id

//         });

//     } catch (error) {

//         console.error(error);

//         return res.status(500).json({

//             success: false,

//             message: error.message

//         });

//     }
// };



// /*
// =========================================
// Verify Payment
// POST /api/payment/verify
// =========================================
// */

// exports.verifyPayment = async (req, res) => {

//     try {

//         const {

//             razorpay_order_id,

//             razorpay_payment_id,

//             razorpay_signature,

//             dbOrderId

//         } = req.body;

//         const generatedSignature = crypto
//             .createHmac(
//                 "sha256",
//                 process.env.RAZORPAY_KEY_SECRET
//             )
//             .update(
//                 razorpay_order_id + "|" + razorpay_payment_id
//             )
//             .digest("hex");

//         if (generatedSignature !== razorpay_signature) {

//             return res.status(400).json({

//                 success: false,

//                 message: "Payment Verification Failed"

//             });

//         }

//         const order = await Order.findById(dbOrderId);

//         if (!order) {

//             return res.status(404).json({

//                 success: false,

//                 message: "Order not found"

//             });

//         }

//         order.paymentStatus = "SUCCESS";

//         order.razorpayPaymentId = razorpay_payment_id;

//         order.razorpaySignature = razorpay_signature;

//         order.paidAt = new Date();

//         await order.save();

//         /*
//         =================================
//         Reduce Product Stock
//         =================================
//         */

//         for (const item of order.items) {

//             await Product.findByIdAndUpdate(

//                 item.product,

//                 {
//                     $inc: {
//                         stock: -item.quantity
//                     }
//                 }

//             );

//         }

//         /*
//         =================================
//         Clear Cart
//         =================================
//         */

//         await Cart.deleteMany({

//             user_id: order.user

//         });

//         return res.status(200).json({

//             success: true,

//             message: "Payment Successful",

//             order

//         });

//     } catch (error) {

//         console.error(error);

//         return res.status(500).json({

//             success: false,

//             message: error.message

//         });

//     }

// };



// /*
// =========================================
// Payment Failed
// =========================================
// */

// exports.paymentFailed = async (req, res) => {

//     try {

//         const {

//             dbOrderId

//         } = req.body;

//         await Order.findByIdAndUpdate(

//             dbOrderId,

//             {

//                 paymentStatus: "FAILED"

//             }

//         );

//         return res.status(200).json({

//             success: true,

//             message: "Payment Failed"

//         });

//     } catch (error) {

//         console.error(error);

//         return res.status(500).json({

//             success: false,

//             message: error.message

//         });

//     }

// };

// exports.razorpayWebhook = async (req, res) => {

//     try {

//         const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

//         const signature =
//             req.headers["x-razorpay-signature"];

//         const expectedSignature = crypto
//             .createHmac("sha256", secret)
//             .update(req.body)
//             .digest("hex");

//         if (expectedSignature !== signature) {

//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid Webhook Signature"
//             });

//         }

//         const event = JSON.parse(req.body);

//         switch (event.event) {

//             case "payment.captured":

//                 console.log("Payment Captured");

//                 break;

//             case "payment.failed":

//                 console.log("Payment Failed");

//                 break;

//             case "refund.processed":

//                 console.log("Refund Processed");

//                 break;

//             default:

//                 console.log(event.event);

//         }

//         return res.status(200).json({
//             success: true
//         });

//     } catch (err) {

//         console.log(err);

//         return res.status(500).json({
//             success: false
//         });

//     }

// };