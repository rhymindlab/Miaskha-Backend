const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/Product");

const getUserId = (req) => req.user?._id || req.user?.id;

const safeEqual = (first, second) => {
  if (!first || !second || first.length !== second.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(first, "utf8"),
    Buffer.from(second, "utf8")
  );
};

// POST /api/payment/create-order
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

    const cartItems = await Cart.find({ user_id: String(userId) });

    if (!cartItems.length) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    let subtotal = 0;
    let gstTotal = 0;
    const items = [];

    for (const item of cartItems) {
    const product = await Product.findById(item.product_id)
        .select("title name image")
        .lean();

    if (!product) {
        return res.status(400).json({
        success: false,
        message: "A product in your cart no longer exists",
        });
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Number(item.salePrice) || 0;
    const gst = Number(item.gst) || 0;

    const itemSubtotal = price * quantity;
    const itemGst = gst * quantity;
    const itemTotal = itemSubtotal + itemGst;

    subtotal += itemSubtotal;
    gstTotal += itemGst;

    items.push({
        product: item.product_id,

        // Uses cart title first, then retrieves title from Product.
        title:
        item.title ||
        item.name ||
        product.title ||
        product.name ||
        "Product",

        image: item.image || product.image || "",
        quantity,
        price,
        gst,
        total: itemTotal,
    });
    }

    const amount = subtotal + gstTotal;

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart amount",
      });
    }

    const receipt = `receipt_${Date.now()}_${String(userId).slice(-6)}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay uses paise
      currency: "INR",
      receipt,
    });

    const order = await Order.create({
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
    });

    return res.status(201).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      dbOrderId: order._id,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create order",
    });
  }
};

// POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured",
      });
    }

    const userId = getUserId(req);

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

    // Prevent duplicate callbacks from reducing stock twice.
    if (order.paymentStatus === "SUCCESS") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        order,
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!safeEqual(generatedSignature, razorpay_signature)) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    order.paymentStatus = "SUCCESS";
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paidAt = new Date();

    await order.save();

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    await Cart.deleteMany({ user_id: String(order.user) });

    return res.status(200).json({
      success: true,
      message: "Payment successful",
      order,
    });
  } catch (error) {
    console.error("Verify payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
};

// POST /api/payment/failed
exports.paymentFailed = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { dbOrderId } = req.body;

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

    // Never replace a confirmed successful payment with FAILED.
    if (order.paymentStatus === "PENDING") {
      order.paymentStatus = "FAILED";
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment marked as failed",
    });
  } catch (error) {
    console.error("Payment failed handler error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update payment status",
    });
  }
};

// POST /api/payment/webhook
exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!webhookSecret || !signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook request",
      });
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body || "");

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (!safeEqual(expectedSignature, signature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const event = JSON.parse(rawBody.toString("utf8"));

    console.log(`Razorpay webhook received: ${event.event}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);

    return res.status(500).json({ success: false });
  }
};