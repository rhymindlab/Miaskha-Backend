const mongoose = require("mongoose");

const customizationFieldSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["select", "text", "number"],
    required: true
  },

  options: [String],

  required: {
    type: Boolean,
    default: false
  },

  label: String,

  placeholder: String,

  dependsOn: {
    field: String,
    value: String
  }

}, { _id: false });


const productSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
    trim: true,
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },

  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  mrp: {
    type: Number,
    required: true,
  },

  salePrice: {
    type: Number,
    required: true,
  },

  shortDescription: String,

  description: String,

  images: [String],
  videos: [String],

  stock: {
    type: Number,
    default: 0,
  },

  productWeight: Number,
  metalWeight: Number,

  purity: {
    type: String,
    enum: ["14K", "18K", "22K", "24K","999","925"]
  },

  metalType: {
    type: String,
    enum: ["Gold", "Silver", "Platinum"]
  },

  makingCharges: Number,

  stoneType: String,
  stoneShape: [String],
  stonePrice: [Number],
  stoneWeight: [Number],
  stoneColor: [String],
  stoneClarity: [String],
  stoneSizeRange: [String],

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },

  collections: [

      String,
  ],

  customizationFields: [customizationFieldSchema],

  isFeatured: {
    type: Boolean,
    default: false,
  },

  isActive: {
    type: Boolean,
    default: true,
  }

}, {
  timestamps: true
});


module.exports = mongoose.model("Product", productSchema);