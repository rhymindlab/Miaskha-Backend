const Collection = require("../models/collection");
const Category = require("../models/category");

/* ==========================================
   Category List Page
========================================== */

async function handleCategoryPage(req, res) {

    try {

       const categories = await Category.find()
        .populate("parentCategory")
        .lean();

        const collections = await Collection.find().lean();

        return res.render("pages/categories/index", {

            pageTitle: "Categories",
            activePage: "categories",

            categories,
            collections,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}


/* ==========================================
   Add Category Page
========================================== */

async function handleAddCategoryPage(req, res) {

    try {

        const categories = await Category.find().lean();
        const collections = await Collection.find().lean();

        return res.render("pages/categories/add", {

            pageTitle: "Add Category",
            activePage: "categories",

            categories,
            collections,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}

/* ==========================================
   Edit Category Page
========================================== */

async function handleEditCategoryPage(req, res) {

    try {

        const { id } = req.params;

        const category = await Category
            .findById(id)
            .lean();

        if (!category) {

            return res.status(404).send("Category not found");

        }

        const categories = await Category
            .find({
                _id: {
                    $ne: id,
                },
            })
            .lean();

        const collections = await Collection.find().lean();

        return res.render("pages/categories/edit", {

            pageTitle: "Edit Category",
            activePage: "categories",

            category,
            categories,
            collections,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}
module.exports = {

    handleCategoryPage,
    handleAddCategoryPage,
    handleEditCategoryPage,

};