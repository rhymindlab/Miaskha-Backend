const Collection = require('../models/collection');

async function listCollections(req, res) {
  try {
    const collections = await Collection.find().select("slug name image").lean();
    return res.json(collections);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createCollection(req, res) {

    try {

        let {
            name,
            slug,
            image,
        } = req.body;

        if (!slug || !slug.trim()) {

            slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

        }

        const collection = await Collection.create({

            name,
            slug,
            image,

        });

        return res.redirect("/admin/collection");

    } catch (error) {

        console.error(error);

        return res.status(500).send(error.message);

    }

}

async function updateCollection(req, res) {

    try {

        let {
            name,
            slug,
            image,
        } = req.body;

        if (!slug || !slug.trim()) {

            slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

        }

        await Collection.findByIdAndUpdate(

            req.params.id,

            {
                name,
                slug,
                image,
            },

            {
                new: true,
                runValidators: true,
            }

        );

        return res.redirect("/admin/collection");

    } catch (error) {

        console.error(error);

        return res.status(500).send(error.message);

    }

}

module.exports = {
  listCollections,
  createCollection,
  updateCollection,
};
