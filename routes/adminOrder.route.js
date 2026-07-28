const express = require("express");

const {
    getAllOrders,
    getOrderDetails,
} = require("../controllers/adminOrderController");

const {
    restrictToAdminOnly,
} = require("../middlewares/authentication");

const router = express.Router();


/* ============================================================
   ADMIN ORDERS
============================================================ */

// All orders
router.get(
    "/",
    restrictToAdminOnly,
    getAllOrders
);


// Single order
router.get(
    "/:id",
    restrictToAdminOnly,
    getOrderDetails
);


module.exports = router;