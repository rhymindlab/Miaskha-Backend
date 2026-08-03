const Category = require('../models/category');

async function listCategories(req, res) {
  try {
    const categories = await Category.find().select(" name slug image parentCategory collections ").lean();
    return res.json(categories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createCategory(req, res) {

    try {

        let {
            name,
            slug,
            image,
            category: parentCategory,
            collections,
        } = req.body;

        if (!name || !name.trim()) {

            return res.status(400).json({
                error: "Name is required",
            });

        }

        // Auto generate slug if empty

        if (!slug || !slug.trim()) {

            slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

        }

        // Always store collections as array

        if (!collections) {

            collections = [];

        } else if (!Array.isArray(collections)) {

            collections = [collections];

        }

        const category = await Category.create({

            name,

            slug,

            image,

            parentCategory: parentCategory || null,

            collections,

        });

        return res.status(201).json(category);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            error: error.message,

        });

    }

;}

async function updateCategory(req, res) {

    try {

        let {
            name,
            slug,
            image,
            category: parentCategory,
            collections,
        } = req.body;

        if (!name || !name.trim()) {

            return res.status(400).json({
                error: "Category name is required",
            });

        }

        // Auto-generate slug if empty
        if (!slug || !slug.trim()) {

            slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

        }

        // Ensure collections is always an array
        if (!collections) {

            collections = [];

        } else if (!Array.isArray(collections)) {

            collections = [collections];

        }

        const updatedCategory = await Category.findByIdAndUpdate(

            req.params.id,

            {
                name,
                slug,
                image,
                parentCategory: parentCategory || null,
                collections,
            },

            {
                new: true,
                runValidators: true,
            }

        );

        if (!updatedCategory) {

            return res.status(404).json({
                error: "Category not found",
            });

        }

        return res.redirect("/admin/category");

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: error.message,
        });

    }

}

async function getCategoryFilters(req, res) {
  try {

    const { slug } = req.params;

    const category = await Category.findOne({ slug }).populate("collections", "name slug");
    console.log(category);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const filterData = {
      collections: category.collections.map(collection => collection)
    };

    return res.status(200).json({
      success: true,
      category: category.name,
      filterData
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
  listCategories,
  createCategory,
  getCategoryFilters,
  updateCategory,
};
