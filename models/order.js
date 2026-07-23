// const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema(
//     {
//         user: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Users",
//             required: true,
//         },

//         items: [
//             {
//                 product: {
//                     type: mongoose.Schema.Types.ObjectId,
//                     ref: "Product",
//                     required: true,
//                 },

//                 title: String,

//                 image: String,

//                 quantity: {
//                     type: Number,
//                     required: true,
//                 },

//                 price: {
//                     type: Number,
//                     required: true,
//                 },

//                 total: Number,
//             },
//         ],

//         shippingAddress: {
//             firstName: String,

//             lastName: String,

//             company: String,

//             country: String,

//             address: String,

//             city: String,

//             state: String,

//             pinCode: String,

//             mobile: String,
//         },

//         amount: {
//             type: Number,
//             required: true,
//         },

//         currency: {
//             type: String,
//             default: "INR",
//         },

//         paymentStatus: {
//             type: String,
//             enum: [
//                 "PENDING",
//                 "SUCCESS",
//                 "FAILED",
//             ],
//             default: "PENDING",
//         },

//         orderStatus: {
//             type: String,
//             enum: [
//                 "PLACED",
//                 "CONFIRMED",
//                 "SHIPPED",
//                 "DELIVERED",
//                 "CANCELLED",
//             ],
//             default: "PLACED",
//         },

//         razorpayOrderId: String,

//         razorpayPaymentId: String,

//         razorpaySignature: String,

//         receipt: String,

//         paidAt: Date,
//     },
//     {
//         timestamps: true,
//     }
// );

// module.exports = mongoose.model("Order", orderSchema);