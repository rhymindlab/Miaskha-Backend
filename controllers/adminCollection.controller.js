const Collection = require("../models/collection");

/* ============================
   Collection List
============================ */

async function handleCollectionPage(req, res) {

    try {

        const collections = await Collection
            .find()
            .lean();

        return res.render("pages/collections/index", {

            pageTitle: "Collections",
            activePage: "collections",

            collections,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}

/* ============================
   Add Page
============================ */

async function handleAddCollectionPage(req, res) {

    return res.render("pages/collections/add", {

        pageTitle: "Add Collection",
        activePage: "collections",

    });

}

/* ============================
   Edit Page
============================ */

async function handleEditCollectionPage(req, res) {

    try {

        const collection = await Collection.findById(req.params.id).lean();

        if (!collection) {

            return res.status(404).send("Collection not found");

        }

        return res.render("pages/collections/edit", {

            pageTitle: "Edit Collection",
            activePage: "collections",

            collection,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}

module.exports = {

    handleCollectionPage,
    handleAddCollectionPage,
    handleEditCollectionPage,

};