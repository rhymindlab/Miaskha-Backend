// const express = require("express");
// const router = express.Router();

// const {
//     createOrder,
//     verifyPayment,
//     paymentFailed,
//     razorpayWebhook
// } = require("../controllers/paymentController");

// const auth = require("../middleware/auth");

// // Create Razorpay Order
// router.post("/create-order", auth, createOrder);

// // Verify Payment
// router.post("/verify", auth, verifyPayment);

// // Payment Failed
// router.post("/failed", auth, paymentFailed);

// // Razorpay Webhook
// router.post(
//     "/webhook",
//     express.raw({ type: "application/json" }),
//     razorpayWebhook
// );

// module.exports = router;