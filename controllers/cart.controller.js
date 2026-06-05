const cart = require("../models/cart");

async function handleGetCart(req,res){
    const id = req.body.id;
    const data = await cart.find({user_id:id})
    return res.json(data);
}
async function handleGetCartForAdmin(req,res){
    const data = await cart.find()
    return res.json(data);
}
async function handleAddtoCart(req,res){
    try{
        const {user_id, product_id, customizations, salePrice, gst,} = req.body;
        const existingItem = await cart.findOne({user_id, product_id,
            "customizations.Matarial": customizations.Matarial,
            "customizations.Purity": customizations.Purity });
        

        if (existingItem) {
            await cart.findByIdAndUpdate(existingItem._id, {$inc: { quantity: 1 }})
        }
        else{
            await cart.create({user_id, product_id, customizations, salePrice, gst, quantity:1});
        }
        return res.status(201).json({success: true,});

    }catch(error){
        console.log(error);
        return res.status(500).json({ error: 'Server error' });
    }
    
}

async function handleMergeCart(req, res) {
  try {
    const { id, carts } = req.body;

    await cart.deleteMany({ user_id: id });
    
    const docs = carts.map((item) => ({
        user_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        image: item.image,
        customizations: item.customizations,
        salePrice: item.salePrice,
        gst: item.gst,
    }));
    console.log(docs)

    await cart.insertMany(docs);

    const data = await cart.find({user_id:id});

    return res.json(data);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
    });
  }
}

module.exports = {
    handleAddtoCart,
    handleGetCart,
    handleGetCartForAdmin,
    handleMergeCart,
}