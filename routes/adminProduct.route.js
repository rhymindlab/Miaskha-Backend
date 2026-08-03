const { Router } = require("express");;

const {
    restrictToLoggedinUserOnly,
    restrictToAdminOnly,
} = require("../middlewares/authentication");
const { handleViewProductsPage, handleEditProductsPage, handleAddProductsPage, handleProductsPage } = require("../controllers/adminProducts.controller");

const router = Router();

router.get("/", restrictToLoggedinUserOnly, restrictToAdminOnly, handleProductsPage);

router.get("/add", restrictToLoggedinUserOnly, restrictToAdminOnly, handleAddProductsPage);

router.get("/:id/edit", restrictToLoggedinUserOnly, restrictToAdminOnly, handleEditProductsPage);

router.get("/:id", restrictToLoggedinUserOnly,restrictToAdminOnly, handleViewProductsPage);

module.exports = router;