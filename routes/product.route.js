const { Router } = require("express");
const { handleAddProduct, handleDeleteProduct, handleProduct, handleProductUpdation, handleGetAllProducts, handleFilterByCategory } = require("../controllers/product.controller");
const { restrictToLoggedinUserOnly, restrictToAdminOnly } = require("../middlewares/authentication");
const Product = require("../models/Product");
const Collection = require("../models/collection");
const Category = require("../models/category")


const router = Router();
// router.get('/', handleGetAllProducts)
router.post('/addproduct', restrictToLoggedinUserOnly, restrictToAdminOnly, handleAddProduct);
router.get('/:id', handleProduct)
router.patch('/:id',restrictToLoggedinUserOnly, restrictToAdminOnly, handleProductUpdation);
router.delete('/:id', restrictToLoggedinUserOnly, restrictToAdminOnly, handleDeleteProduct);
router.get("/category/:slug", handleFilterByCategory); 

router.get("/", async (req, res) => {

    try {

        const {

            category,

            collection,

            minPrice,

            maxPrice,

            sort

        } = req.query;

        const filter = {};

        /*
        --------------------------
        CATEGORY
        --------------------------
        */

        if (category) {

            const categories = Array.isArray(category)

                ? category

                : [category];

            const categoryDocs = await Category.find({

                slug: {

                    $in: categories

                }

            });

            filter.category = {

                $in: categoryDocs.map(item => item._id)

            };

        }

        /*
        --------------------------
        COLLECTION
        --------------------------
        */

        if (collection) {

            const collections = Array.isArray(collection)

                ? collection

                : [collection];

            const collectionDocs = await Collection.find({

                slug: {

                    $in: collections

                }

            });

            filter.collection = {

                $in: collectionDocs.map(item => item._id)

            };

        }

        /*
        --------------------------
        PRICE
        --------------------------
        */

        if (minPrice || maxPrice) {

            filter.salePrice = {};

            if (minPrice) {

                filter.salePrice.$gte = Number(minPrice);

            }

            if (maxPrice) {

                filter.salePrice.$lte = Number(maxPrice);

            }

        }

        /*
        --------------------------
        QUERY
        --------------------------
        */

        let query = Product.find(filter)

            .populate("category", "name slug")

            .populate("collections", "name slug");

        /*
        --------------------------
        SORTING
        --------------------------
        */

        switch (sort) {

            case "price-low-high":

                query = query.sort({

                    salePrice: 1

                });

                break;

            case "price-high-low":

                query = query.sort({

                    salePrice: -1

                });

                break;

            case "newest":

                query = query.sort({

                    createdAt: -1

                });

                break;

            case "oldest":

                query = query.sort({

                    createdAt: 1

                });

                break;

            default:

                break;

        }   
        const products = await query;

        return res.json(products);

    }

    catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});

module.exports = router;