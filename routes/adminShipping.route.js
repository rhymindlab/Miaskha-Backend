const express = require("express");

const {
  readyToShip,
  reassignShipment,
} = require("../controllers/adminShippingController");

// Change this import to your actual auth middleware
const {restrictToAdminOnly,
} = require("../middlewares/authentication");

const router = express.Router();

router.post(
  "/orders/:id/ready-to-ship", restrictToAdminOnly,
  readyToShip
);
router.post(
  "/orders/:id/reassign",
  restrictToAdminOnly,
  reassignShipment
);

module.exports = router;