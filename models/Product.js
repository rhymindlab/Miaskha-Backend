const mongoose = require("mongoose");

/* ============================================================
   CUSTOMIZATION FIELD SCHEMA
============================================================ */

const customizationFieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["select", "text", "number", "checkbox", "radio"],
      required: true,
    },

    options: {
      type: [String],
      default: [],
    },

    required: {
      type: Boolean,
      default: false,
    },

    placeholder: {
      type: String,
      default: "",
    },

    dependsOn: {
      field: String,
      value: String,
    },
  },
  { _id: false }
);

/* ============================================================
   STONE SCHEMA
============================================================ */

const stoneSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "",
    },

    shape: {
      type: String,
      default: "",
    },

    weight: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      default: 1,
    },

    price: {
      type: Number,
      default: 0,
    },

    pricingType: {
      type: String,
      enum: ["fixed", "perCarat"],
      default: "fixed",
    },

    color: {
      type: String,
      default: "",
    },

    clarity: {
      type: String,
      default: "",
    },

    sizeRange: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

/* ============================================================
   SHIPPING / PACKAGE SCHEMA
============================================================ */

const shippingSchema = new mongoose.Schema(
  {
    // Final packed parcel weight in KG
    // Do not use metalWeight as shipping weight.
    weight: {
      type: Number,
      default: 0.5,
      min: 0,
    },

    // Package dimensions in CM
    length: {
      type: Number,
      default: 15,
      min: 0,
    },

    breadth: {
      type: Number,
      default: 12,
      min: 0,
    },

    height: {
      type: Number,
      default: 6,
      min: 0,
    },
  },
  { _id: false }
);

/* ============================================================
   PRODUCT SCHEMA
============================================================ */

const productSchema = new mongoose.Schema(
  {
    /* ========================================================
       BASIC INFORMATION
    ======================================================== */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    /* ========================================================
       PRODUCT TYPE
    ======================================================== */

    productType: {
      type: String,
      enum: [
        "Ring",
        "Pendant",
        "Chain",
        "Necklace",
        "Bracelet",
        "Bangle",
        "Earrings",
        "Coin",
        "Loose Diamond",
        "Gemstone",
        "Mangalsutra",
        "Nose Pin",
        "Anklet",
        "Gifting",
        "Other",
      ],
      required: true,
    },

    /* ========================================================
       CATEGORY
    ======================================================== */

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    collections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Collection",
      },
    ],

    /* ========================================================
       PRICING
    ======================================================== */

    pricing: {
      mode: {
        type: String,
        enum: ["dynamic", "manual", "fixed"],
        default: "dynamic",
      },

      fixedPrice: {
        type: Number,
        default: 0,
      },

      dynamicMetal: {
        type: Boolean,
        default: true,
      },

      dynamicStone: {
        type: Boolean,
        default: false,
      },

      dynamicMakingCharges: {
        type: Boolean,
        default: false,
      },
    },

    mrp: {
      type: Number,
      default: 0,
    },

    salePrice: {
      type: Number,
      default: 0,
    },
    productDiscount: {
      type: Number,
      default: 0,
    },

    makingCharges: {
      value: {
        type: Number,
        default: 0,
      },

      type: {
        type: String,
        enum: ["fixed", "perGram", "percentage"],
        default: "fixed",
      },

      discount: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ["fixed", "percentage"],
          default: "fixed",
        },
      },

    },

    stoneDiscount:{
        type: Number,
        default: 0,
    },

    /* ========================================================
       STOCK
    ======================================================== */

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ========================================================
       MEDIA
    ======================================================== */

    images: {
      type: [String],
      default: [],
    },

    videos: {
      type: [String],
      default: [],
    },

    /* ========================================================
       METAL
    ======================================================== */

    metalType: {
      type: String,
      default: "",
    },

    purity: {
      type: String,
      enum: ["24K", "22K", "18K", "14K", "999", "925"],
    },

    // Metal weight in grams
    metalWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Jewellery/product weight
    // Keep this separate from shipping package weight.
    productWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ========================================================
       SHIPPING / SHIPROCKET PACKAGE DETAILS
    ======================================================== */

    shipping: {
      type: shippingSchema,
      default: () => ({
        weight: 0.5,
        length: 15,
        breadth: 12,
        height: 6,
      }),
    },

    /* ========================================================
       STONES
    ======================================================== */

    stones: {
      type: [stoneSchema],
      default: [],
    },

    /* ========================================================
       SPECIFICATIONS
    ======================================================== */

    specifications: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /* ========================================================
       CUSTOMIZATION
    ======================================================== */

    customizationFields: {
      type: [customizationFieldSchema],
      default: [],
    },

    /* ========================================================
       SEO
    ======================================================== */

    seoTitle: {
      type: String,
      default: "",
      trim: true,
    },

    seoDescription: {
      type: String,
      default: "",
      trim: true,
    },

    seoKeywords: {
      type: [String],
      default: [],
    },

    /* ========================================================
       STATUS
    ======================================================== */

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
   INDEXES
============================================================ */

// category and active product queries
productSchema.index({
  category: 1,
  isActive: 1,
});

// collection filtering
productSchema.index({
  collections: 1,
});

// product type filtering
productSchema.index({
  productType: 1,
  isActive: 1,
});

// featured products
productSchema.index({
  isFeatured: 1,
  isActive: 1,
});

/* ============================================================
   MODEL
============================================================ */

module.exports = mongoose.model("Product", productSchema);