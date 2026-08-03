const MetalRate = require("../models/metalrate");

/* ==============================
   Metal Rate List
============================== */

async function handleMetalPage(req, res) {

    try {

        const metals = await MetalRate
            .find()
            .sort({ metalType: 1, purity: 1 })
            .lean();

        return res.render("pages/metals/index", {

            pageTitle: "Metal Rates",
            activePage: "metals",

            metals,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}


/* ==============================
   Add Metal Rate Page
============================== */

async function handleAddMetalPage(req, res) {

    try {

        return res.render("pages/metals/add", {

            pageTitle: "Add Metal Rate",
            activePage: "metals",

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}


/* ==============================
   Edit Metal Rate Page
============================== */

async function handleEditMetalPage(req, res) {

    try {

        const metal = await MetalRate
            .findById(req.params.id)
            .lean();

        if (!metal) {

            return res.status(404).send("Metal Rate not found");

        }

        return res.render("pages/metals/edit", {

            pageTitle: "Edit Metal Rate",
            activePage: "metals",

            metal,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).send("Server Error");

    }

}

module.exports = {

    handleMetalPage,
    handleAddMetalPage,
    handleEditMetalPage,

};