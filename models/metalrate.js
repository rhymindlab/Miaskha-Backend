const mongoose = require('mongoose');

const { Schema } = mongoose;

const simplePriceSchema = new Schema(
  {
    metalType: {
        type: String,
        enum: ["Gold", "Silver", "Platinum"],
        required: true,
    },

    purity: {
        type: String,
        enum: ["24K", "22K", "18K", "14K", "999", "925", "950"],
        required: true,
    },

    amount: { type: Number, required: true },
    currency: {
        type: String,
        enum: ["INR", "USD", "AED"],
        default: "INR",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SimplePrice', simplePriceSchema);
