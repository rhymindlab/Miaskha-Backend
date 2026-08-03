const SimplePrice = require("../models/metalrate");

/* ===============================
   Get All Metal Rates (API)
=============================== */

async function handleGetMetal(req, res) {

    try {

        const metals = await SimplePrice
            .find()
            .sort({ metalType: 1, purity: 1 })
            .lean();

        return res.json(metals);

    } catch (error) {

        console.error(error);

        return res.status(500).send(error.message);

    }

}


/* ===============================
   Get Single Metal Rate (API)
=============================== */

async function handleGetSingleMetal(req, res) {

    try {

        const metal = await SimplePrice.findById(req.params.id).lean();

        if (!metal) {

            return res.status(404).send("Metal rate not found");

        }

        return res.json(metal);

    } catch (error) {

        console.error(error);

        return res.status(500).send(error.message);

    }

}


/* ===============================
   Create Metal Rate
=============================== */

async function handleMetalDetailAddition(req, res) {

    try {

        const {
            metalType,
            purity,
            amount,
            currency,
        } = req.body;

        await SimplePrice.create({

            metalType,
            purity,
            amount,
            currency,

        });

        return res.redirect("/admin/metals");

    } catch (error) {

        console.error(error);

        return res.status(500).send(error.message);

    }

}


/* ===============================
   Update Metal Rate
=============================== */

async function handleUpdateMetal(req, res) {

    try {

        const {
            metalType,
            purity,
            amount,
            currency,
        } = req.body;

        const metal = await SimplePrice.findByIdAndUpdate(

            req.params.id,

            {
                metalType,
                purity,
                amount,
                currency,
            },

            {
                new: true,
                runValidators: true,
            }

        );

        if (!metal) {

            return res.status(404).send("Metal rate not found");

        }

        return res.redirect("/admin/metals");

    } catch (error) {

        console.error(error);

        return res.status(500).send(error.message);

    }

}


/* ===============================
   Delete Metal Rate
=============================== */

async function handleDeleteMetal(req, res) {

    try {

        const metal = await SimplePrice.findByIdAndDelete(req.params.id);

        if (!metal) {

            return res.status(404).send("Metal rate not found");

        }

        return res.redirect("/admin/metals");

    } catch (error) {

        console.error(error);

        return res.status(500).send(error.message);

    }

}

module.exports = {

    handleGetMetal,
    handleGetSingleMetal,

    handleMetalDetailAddition,
    handleUpdateMetal,
    handleDeleteMetal,

};