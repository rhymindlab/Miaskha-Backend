const express = require("express");

const {
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
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
router.put("/:id/status", restrictToAdminOnly, updateOrderStatus);


// Single order
router.get(
    "/:id",
    restrictToAdminOnly,
    getOrderDetails
);


module.exports = router;