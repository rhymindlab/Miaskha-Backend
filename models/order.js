const mongoose = require("mongoose");

const shipmentHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      default: null,
    },

    shipmentId: {
      type: String,
      default: null,
    },

    awbCode: {
      type: String,
      default: null,
    },

    courierId: {
      type: Number,
      default: null,
    },

    courierName: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      default: "",
    },

    trackingUrl: {
      type: String,
      default: null,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/* ----------------------------------------------------------
   Tracking Timeline
---------------------------------------------------------- */

const trackingSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      default: "",
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

/* ----------------------------------------------------------
   Shiprocket Details
---------------------------------------------------------- */

const shiprocketSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      default: null,
    },

    shipmentId: {
      type: String,
      default: null,
    },

    awbCode: {
      type: String,
      default: null,
    },

    courierId: {
      type: Number,
      default: null,
    },

    courierName: {
      type: String,
      default: null,
    },

    channelOrderId: {
      type: String,
      default: null,
    },

    trackingUrl: {
      type: String,
      default: null,
    },

    pickupTokenNumber: {
      type: String,
      default: null,
    },
    pickupRequested: {
      type: Boolean,
      default: false,
    },

    pickupRequestedAt: {
      type: Date,
      default: null,
    },

    currentStatus: {
      type: String,
      default: "Order Placed",
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/* ----------------------------------------------------------
   Order Items
---------------------------------------------------------- */

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Price of one item before GST

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // GST per item

    gst: {
      type: Number,
      default: 0,
      min: 0,
    },

    // (price + gst) × quantity

    total: {
      type: Number,
      required: true,
      min: 0,
    },
    sku: {
  type: String,
  default: "",
  trim: true,
},

shipping: {
  weight: {
    type: Number,
    default: 0.5,
  },

  length: {
    type: Number,
    default: 15,
  },

  breadth: {
    type: Number,
    default: 12,
  },

  height: {
    type: Number,
    default: 6,
  },
},
  },
  {
    _id: false,
  }
);


/* ----------------------------------------------------------
   Shipping Address
---------------------------------------------------------- */

const shippingAddressSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      default: "",
      trim: true,
    },

    company: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pinCode: {
      type: String,
      default: "",
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* ----------------------------------------------------------
   Order Schema
---------------------------------------------------------- */

const orderSchema = new mongoose.Schema(
  {
    // Human-readable Order Number

    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,

      validate: {
        validator: (items) => items.length > 0,
        message: "Order must contain at least one product.",
      },
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    gstTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Final Payable Amount

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    paymentMethod: {
      type: String,

      enum: [
        "RAZORPAY",
        "COD",
      ],

      default: "RAZORPAY",
    },

    paymentStatus: {
      type: String,

      enum: [
        "PENDING",
        "SUCCESS",
        "FAILED",
        "REFUNDED",
      ],

      default: "PENDING",

      index: true,
    },

    orderStatus: {
      type: String,

      enum: [
        "PLACED",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ],

      default: "PLACED",

      index: true,
    },

    /* ---------------- Razorpay ---------------- */

    razorpayOrderId: {
      type: String,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    razorpaySignature: {
      type: String,
      default: "",
    },

    /* ---------------- Shiprocket ---------------- */

    shiprocket: {
      type: shiprocketSchema,
      default: () => ({}),
    },
    // Previous Shiprocket shipments / AWBs
    shipmentHistory: {
      type: [shipmentHistorySchema],
      default: [],
    },

    /* ---------------- Tracking Timeline ---------------- */

    tracking: {
      type: [trackingSchema],

      default: [
        {
          status: "Order Placed",
          code: "PLACED",
          location: "MIASHKA Store",
          message: "Your order has been placed successfully.",
        },
      ],
    },

    receipt: {
      type: String,
      unique: true,
      sparse: true,
    },

    paidAt: Date,

    deliveredAt: Date,

    cancelledAt: Date,

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

      },
  {
    timestamps: true,
  }
);

/* ----------------------------------------------------------
   Auto Generate Order Number
---------------------------------------------------------- */

orderSchema.pre("save", function () {
  if (!this.orderNumber) {
    const random = Math.floor(100000 + Math.random() * 900000);

    this.orderNumber = `MSK-${new Date().getFullYear()}-${random}`;
  }
});

/* ----------------------------------------------------------
   Instance Methods
---------------------------------------------------------- */

orderSchema.methods.addTracking = function ({
  status,
  code = "",
  location = "",
  message = "",
  date = new Date(),
}) {
  this.tracking.push({
    status,
    code,
    location,
    message,
    date,
  });

  return this.save();
};

/* ----------------------------------------------------------
   Model
---------------------------------------------------------- */

module.exports = mongoose.model("Order", orderSchema);