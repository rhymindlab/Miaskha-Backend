const Product = require("../models/Product");
const Category = require("../models/category");
const Collection = require("../models/collection")


async function handleProductsPage (req, res)  {

    try {

        const products = await Product.find()
            .populate("category", "name")
            .populate("collections", "name")
            .sort({ createdAt: -1 })
            .lean();

        res.render("pages/products/index", {
            pageTitle: "Products",
            activePage: "products",
            products,
        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Server Error");

    }

}
async function handleAddProductsPage (req, res) {

    try {

        const categories = await Category.find().lean();
        const collections = await Collection.find().lean();

        res.render("pages/products/add", {
            pageTitle: "Add Product",
            activePage: "products",
            categories,
            collections,
        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Server Error");

    }

}
async function handleEditProductsPage(req, res) {

    try {

        const product = await Product.findById(req.params.id).lean();

        if (!product) {
            return res.status(404).send("Product not found");
        }

        const categories = await Category.find().lean();
        const collections = await Collection.find().lean();

        res.render("pages/products/edit", {

            pageTitle: "Edit Product",

            activePage: "products",

            product,

            categories,

            collections,

        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Server Error");

    }

}

async function handleViewProductsPage (req, res) {

    try {

        const product = await Product.findById(req.params.id)
            .populate("category")
            .populate("collections")
            .lean();

        if (!product) {
            return res.status(404).send("Product not found");
        }

        res.render("pages/products/details", {

            pageTitle: "Product Details",

            activePage: "products",

            product,

        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Server Error");

    }

}




module.exports = {

   handleProductsPage,
   handleAddProductsPage,
   handleEditProductsPage,
   handleViewProductsPage,

};