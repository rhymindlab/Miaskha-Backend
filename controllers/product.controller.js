const Product = require("../models/Product");
const Category = require('../models/category');
const Collection = require('../models/collection');
const { getCategoryFilters } = require("./category.controller");
const { handleAddCategoryPage } = require("./static.controller");

const parseStoneArray = (val, isNumber = false) => {
    if (!val) return [];
    // Remove brackets and quotes if they accidentally got sent from frontend serialization
    const cleanVal = Array.isArray(val) ? val.map(v => String(v).replace(/[\[\]"']/g, '')) 
        : String(val).replace(/[\[\]"']/g, '');

    const arr = Array.isArray(cleanVal) ? cleanVal.flatMap(v => v.split(',')) : cleanVal.split(',');
    return arr.map(s => isNumber ? Number(String(s).trim()) : String(s).trim()).filter(v => v !== '' && !Number.isNaN(v));
};


async function handleAddProduct(req, res) {

    try {

        const { title, sku, mrp, salePrice, stock, productWeight, metalWeight, metalType, purity,
            makingCharges, stoneType, stoneShape, stonePrice, stoneWeight, stoneColor, stoneClarity, 
            stoneSizeRange, shortDescription, description, images, videos, category, collections,
            customizationFields, isFeatured } = req.body;
            console.log(customizationFields)

        let formattedCustomizationFields = [];

        if (customizationFields) {
            
            // Convert to array if it is an object with numerical keys
            const fieldsArray = Array.isArray(customizationFields) ? customizationFields : Object.values(customizationFields);

            formattedCustomizationFields = fieldsArray.filter(field => field && field.name && field.name.trim() !== '').map(field => {

                    return {

                        name: field.name,

                        label: field.label,

                        type: field.type,

                        placeholder: field.placeholder,

                        required: field.required === "on",

                        options: field.options ? field.options.split(",").map(item => item.trim()) : [],

                        dependsOn: {
                            field: field.dependsOn?.field || "",
                            value: field.dependsOn?.value || ""
                        }

                    };

                });

        }

        const filteredImages = (Array.isArray(images) ? images : [images]).filter(img => img && img.trim() !== "");

        const filteredVideos = (Array.isArray(videos) ? videos : [videos] ).filter(video => video && video.trim() !== "");

        await Product.create({ title, sku, mrp, salePrice, stock, productWeight, metalWeight,
            metalType, purity, makingCharges, stoneType,
            stoneShape: parseStoneArray(stoneShape),
            stonePrice: parseStoneArray(stonePrice, true),
            stoneWeight: parseStoneArray(stoneWeight, true),
            stoneColor: parseStoneArray(stoneColor),
            stoneClarity: parseStoneArray(stoneClarity),
            stoneSizeRange: parseStoneArray(stoneSizeRange),

            shortDescription, description, images: filteredImages, videos: filteredVideos, category,

            collections: collections ? (Array.isArray(collections) ? collections : [collections]): [],

            isFeatured: isFeatured === "on",

            customizationFields: formattedCustomizationFields

        });

        return res.redirect("/");

    } catch (error) {

        console.log(error);

        return res
            .status(500)
            .send("Error");

    }

}

async function handleDeleteProduct(req, res){
    try{
        console.log("DELETE ROUTE HIT");

        await Product.findByIdAndDelete(req.params.id);

        return res.json({ success: true });
    } catch(error){
        console.log(error);

        return res.status(500).json({ error: "Error" });
    }

}

async function handleProductUpdation(req, res) {

    try {

        req.body.isFeatured =
            req.body.isFeatured === "on";

        if (req.body.customizationFields) {

            req.body.customizationFields =
                Object.values(
                    req.body.customizationFields
                )
                .filter(field => field && field.name && field.name.trim() !== '')
                .map(field => {

                    return {

                        name: field.name,

                        label: field.label,

                        type: field.type,

                        options:
                            field.options
                                ? field.options
                                    .split(",")
                                    .map(opt =>
                                        opt.trim()
                                    )
                                : [],

                        placeholder:
                            field.placeholder,

                        required:
                            field.required === "on",

                        dependsOn: {

                            field:
                                field.dependsOn?.field || "",

                            value:
                                field.dependsOn?.value || ""

                        }

                    };

                });

        }

        if (req.body.stoneShape !== undefined) req.body.stoneShape = parseStoneArray(req.body.stoneShape);
        if (req.body.stonePrice !== undefined) req.body.stonePrice = parseStoneArray(req.body.stonePrice, true);
        if (req.body.stoneWeight !== undefined) req.body.stoneWeight = parseStoneArray(req.body.stoneWeight, true);
        if (req.body.stoneColor !== undefined) req.body.stoneColor = parseStoneArray(req.body.stoneColor);
        if (req.body.stoneClarity !== undefined) req.body.stoneClarity = parseStoneArray(req.body.stoneClarity);
        if (req.body.stoneSizeRange !== undefined) req.body.stoneSizeRange = parseStoneArray(req.body.stoneSizeRange);

        await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        return res.redirect("/");

    } catch (error) {

        console.log(error);

        return res
            .status(500)
            .send("Server Error");

    }

}
async function handleProduct(req, res) {
    const categories = await Category.find().lean();
    const collections = await Collection.find().lean();
    const product = await Product.findById(req.params.id);
    return res.render("editproduct",{product, categories, collections},);

}

async function handleGetAllProducts(req, res){
    const Products = await Product.find();
    return res.json(Products);
}
async function handleFilterByCategory(req,res){
    try{
    const { slug } = req.params;
    const category = await Category.findOne({ slug });

    if (!category) {
        return res.status(404).json({
        success: false,
        message: "Category not found"
    });
}

    const filter = {
        category: category._id,
    };

    const collections = Array.isArray(req.query.collections) ? req.query.collections : req.query.collections
    ? [req.query.collections] : [];

    if (collections.length > 0) {

      const collectionDocs = await Collection.find({
        slug: { $in: collections }
      });

      filter.collections = {
        $in: collectionDocs.map(item => item._id)
      };
    }

     const purity = Array.isArray(req.query.purity) ? req.query.purity : req.query.purity ? [req.query.purity] : [];

    if (purity.length > 0) {
      filter.purity = { $in: purity };
    }

    // PRICE FILTER
    if (req.query.minPrice || req.query.maxPrice) {

      filter.salePrice = {};

      if (req.query.minPrice) {
        filter.salePrice.$gte = Number(req.query.minPrice);
      }

      if (req.query.maxPrice) {
        filter.salePrice.$lte = Number(req.query.maxPrice);
      }
    }

    const products = await Product.find(filter).populate("category").populate("collections");
    
    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
    
}
};


module.exports = {
    handleAddProduct,
    handleDeleteProduct,
    handleProductUpdation,
    handleProduct,
    handleGetAllProducts,
    handleFilterByCategory,
};