const { Router } = require("express");

const {

    handleMetalPage,
    handleAddMetalPage,
    handleEditMetalPage,

} = require("../controllers/adminMetal.controller");

const {

    restrictToLoggedinUserOnly,
    restrictToAdminOnly,

} = require("../middlewares/authentication");

const router = Router();


router.get(
    "/",
    restrictToLoggedinUserOnly,
    restrictToAdminOnly,
    handleMetalPage
);

router.get(
    "/add",
    restrictToLoggedinUserOnly,
    restrictToAdminOnly,
    handleAddMetalPage
);

router.get(
    "/edit/:id",
    restrictToLoggedinUserOnly,
    restrictToAdminOnly,
    handleEditMetalPage
);

module.exports = router;