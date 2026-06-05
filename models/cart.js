const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user_id:{
        type: String,
    },
    product_id: {
        type: String,
    },
    name: String,
    image: String,

    customizations:{
        Material:{
            type:String,
        },
        Purity:{
            type:String,
        },
        
    },
    salePrice: {
        type:Number
    },
    gst:{
        type:Number,
    },
    quantity:{
        type:Number,
        default:1,
    },


},{timestamps: true});

module.exports = mongoose.model("Cart", cartSchema);