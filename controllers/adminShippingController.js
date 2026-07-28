const Order = require("../models/order");
const Users = require("../models/users");


const {
  generateAWB,
  generatePickup,
} = require("../services/shiprocket.service");

const {
  buildShiprocketPayload,
} = require("./paymentController");


/* ============================================================
   READY TO SHIP
============================================================ */

exports.readyToShip = async (req, res) => {
  try {
    const { id } = req.params;

    /* ========================================================
       FIND ORDER
    ======================================================== */

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }


    /* ========================================================
       PAYMENT CHECK
    ======================================================== */

    if (order.paymentStatus !== "SUCCESS") {
      return res.status(400).json({
        success: false,
        message:
          "Payment must be successful before shipping.",
      });
    }


    /* ========================================================
       ORDER STATUS CHECK
    ======================================================== */

    const blockedStatuses = [
      "CANCELLED",
      "DELIVERED",
      "RETURNED",
    ];

    if (blockedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot ship an order with status ${order.orderStatus}.`,
      });
    }


    /* ========================================================
       SHIPROCKET SHIPMENT CHECK
    ======================================================== */

    if (!order.shiprocket?.shipmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Shiprocket shipment has not been created.",
      });
    }


    /* ========================================================
       PREVENT DUPLICATE AWB
    ======================================================== */

    if (order.shiprocket?.awbCode) {
      return res.status(200).json({
        success: true,
        message: "AWB has already been assigned.",
        orderStatus: order.orderStatus,
        shiprocket: order.shiprocket,
      });
    }


    /* ========================================================
       MARK ORDER PACKED
    ======================================================== */

    order.orderStatus = "PACKED";

    const packedExists = order.tracking.some(
      (item) => item.code === "PACKED"
    );

    if (!packedExists) {
      order.tracking.push({
        status: "Packed",
        code: "PACKED",
        location: "MIASHKA",
        message:
          "Your jewellery has been packed and is ready for dispatch.",
      });
    }

    await order.save();


    /* ========================================================
       GENERATE AWB
    ======================================================== */

    console.log(
      "Assigning Shiprocket AWB:",
      order.shiprocket.shipmentId
    );

    const awbResponse = await generateAWB(
      order.shiprocket.shipmentId
    );

    console.log(
      "Shiprocket AWB Response:",
      awbResponse
    );


    /* ========================================================
       GET AWB DATA

       Your actual Shiprocket response:

       response: {
         data: {
           awb_code: "...",
           courier_company_id: 252,
           courier_name: "...",
           pickup_scheduled_date: "..."
         }
       }
    ======================================================== */

    const awbData =
      awbResponse?.response?.data;


    if (!awbData?.awb_code) {
      return res.status(400).json({
        success: false,
        message:
          awbResponse?.message ||
          "Shiprocket could not assign an AWB.",
        shiprocketResponse: awbResponse,
      });
    }


    /* ========================================================
       SAVE AWB
    ======================================================== */

    order.shiprocket.awbCode =
      String(awbData.awb_code);

    order.shiprocket.courierId =
      awbData.courier_company_id
        ? Number(awbData.courier_company_id)
        : null;

    order.shiprocket.courierName =
      awbData.courier_name || null;

    order.shiprocket.currentStatus =
      "AWB Assigned";

    order.shiprocket.lastSyncedAt =
      new Date();


    /* ========================================================
       AWB TRACKING EVENT
    ======================================================== */

    const awbExists = order.tracking.some(
      (item) => item.code === "AWB_ASSIGNED"
    );

    if (!awbExists) {
      order.tracking.push({
        status: "AWB Assigned",
        code: "AWB_ASSIGNED",
        location: "MIASHKA",
        message: `Your shipment has been assigned to ${
          awbData.courier_name ||
          "our delivery partner"
        }.`,
      });
    }

    await order.save();


    console.log(
      "AWB assigned:",
      order.shiprocket.awbCode
    );


    /* ========================================================
       PICKUP HANDLING
    ======================================================== */

    let pickupRequested = false;
    let pickupScheduled = false;
    let pickupDate = null;
    let pickupError = null;


    /* ========================================================
       CASE 1:
       SHIPROCKET ALREADY SCHEDULED PICKUP

       This happened with Shadowfax in your response.
    ======================================================== */

    if (awbData.pickup_scheduled_date) {

      pickupScheduled = true;
      pickupRequested = true;

      pickupDate =
        awbData.pickup_scheduled_date;

      console.log(
        "Pickup already scheduled by Shiprocket:",
        pickupDate
      );


      order.shiprocket.pickupRequested = true;

      order.shiprocket.pickupRequestedAt =
        new Date();

      order.shiprocket.currentStatus =
        "Pickup Scheduled";

      order.shiprocket.lastSyncedAt =
        new Date();


      const pickupExists =
        order.tracking.some(
          (item) =>
            item.code === "PICKUP_SCHEDULED"
        );


      if (!pickupExists) {
        order.tracking.push({
          status: "Pickup Scheduled",
          code: "PICKUP_SCHEDULED",
          location: "MIASHKA",
          message:
            `Courier pickup has been scheduled for ${pickupDate}.`,
        });
      }


      await order.save();
    }


    /* ========================================================
       CASE 2:
       NO PICKUP DATE RETURNED

       Request pickup manually.
    ======================================================== */

    else {

      try {

        console.log(
          "Requesting Shiprocket pickup:",
          order.shiprocket.shipmentId
        );


        const pickupResponse =
          await generatePickup(
            order.shiprocket.shipmentId
          );


        console.log(
          "Shiprocket Pickup Response:",
          pickupResponse
        );


        pickupRequested = true;


        order.shiprocket.pickupRequested =
          true;

        order.shiprocket.pickupRequestedAt =
          new Date();

        order.shiprocket.currentStatus =
          "Pickup Requested";

        order.shiprocket.lastSyncedAt =
          new Date();


        const pickupExists =
          order.tracking.some(
            (item) =>
              item.code === "PICKUP_SCHEDULED"
          );


        if (!pickupExists) {
          order.tracking.push({
            status: "Pickup Scheduled",
            code: "PICKUP_SCHEDULED",
            location: "MIASHKA",
            message:
              "Courier pickup has been requested for your shipment.",
          });
        }


        await order.save();

      } catch (error) {

        pickupError =
          error.response?.data?.message ||
          error.message;


        console.error(
          "Shiprocket Pickup Error:",
          error.response?.data ||
          error.message
        );


        /*
         * IMPORTANT
         *
         * AWB assignment has already succeeded.
         * Therefore we DO NOT remove:
         *
         * awbCode
         * courierId
         * courierName
         *
         * even if pickup generation fails.
         */
      }
    }


    /* ========================================================
       RESPONSE
    ======================================================== */

    return res.status(200).json({
      success: true,

      message: pickupScheduled
        ? "Order is ready to ship and pickup is already scheduled."
        : pickupRequested
          ? "Order is ready to ship and pickup has been requested."
          : "AWB assigned successfully, but pickup could not be requested automatically.",

      orderStatus: order.orderStatus,

      shiprocket: {

        orderId:
          order.shiprocket.orderId,

        shipmentId:
          order.shiprocket.shipmentId,

        awbCode:
          order.shiprocket.awbCode,

        courierId:
          order.shiprocket.courierId,

        courierName:
          order.shiprocket.courierName,

        currentStatus:
          order.shiprocket.currentStatus,

        pickupRequested,

        pickupScheduled,

        pickupDate,

        pickupError,
      },
    });

  } catch (error) {

    console.error(
      "Ready To Ship Error:",
      error.response?.data ||
      error.message
    );


    return res.status(500).json({
      success: false,

      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to prepare shipment",
    });
  }
};

/* ============================================================
   REASSIGN / RECREATE SHIPMENT
============================================================ */

exports.reassignShipment = async (req, res) => {
  try {
    const { id } = req.params;

    // ========================================================
    // FIND ORDER
    // ========================================================

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ========================================================
    // PAYMENT CHECK
    // ========================================================

    if (order.paymentStatus !== "SUCCESS") {
      return res.status(400).json({
        success: false,
        message:
          "Payment must be successful before creating a shipment.",
      });
    }

    // ========================================================
    // ORDER STATUS CHECK
    // ========================================================

    if (
      ["CANCELLED", "DELIVERED", "RETURNED"].includes(
        order.orderStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot reassign shipment for ${order.orderStatus} order.`,
      });
    }

    // ========================================================
    // SHIPMENT CHECK
    // ========================================================

    if (!order.shiprocket?.shipmentId) {
      return res.status(400).json({
        success: false,
        message:
          "There is no existing shipment to reassign.",
      });
    }

    const currentShipmentStatus =
      String(
        order.shiprocket.currentStatus || ""
      )
        .trim()
        .toUpperCase();

    if (
      !currentShipmentStatus.includes("CANCEL")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only a cancelled Shiprocket shipment can currently be reassigned.",
      });
    }

    // ========================================================
    // GET CUSTOMER
    // ========================================================

    const user = await Users.findById(
      order.user
    )
      .select("email")
      .lean();

    if (!user?.email) {
      return res.status(400).json({
        success: false,
        message: "Customer email is missing.",
      });
    }

    // ========================================================
    // SAVE OLD SHIPMENT IN HISTORY
    // ========================================================

    if (!Array.isArray(order.shipmentHistory)) {
      order.shipmentHistory = [];
    }

    const alreadyArchived =
      order.shipmentHistory.some(
        (shipment) =>
          String(shipment.shipmentId) ===
          String(order.shiprocket.shipmentId)
      );

    if (!alreadyArchived) {
      order.shipmentHistory.push({
        orderId:
          order.shiprocket.orderId || null,

        shipmentId:
          order.shiprocket.shipmentId || null,

        awbCode:
          order.shiprocket.awbCode || null,

        courierId:
          order.shiprocket.courierId || null,

        courierName:
          order.shiprocket.courierName || null,

        status:
          order.shiprocket.currentStatus ||
          "Canceled",

        trackingUrl:
          order.shiprocket.trackingUrl || null,

        reason:
          "Previous courier shipment was cancelled.",

        closedAt: new Date(),
      });
    }

    // Save history before making external API request.
    await order.save();

    // ========================================================
    // IMPORTANT:
    // SHIPROCKET REQUIRES UNIQUE ORDER ID
    // ========================================================

    const originalOrderNumber =
      order.orderNumber;

    const shiprocketPayload =
      buildShiprocketPayload(order, user);

    /*
     * Do NOT reuse the original Shiprocket order_id.
     *
     * MIASHKA order number stays unchanged in MongoDB.
     * Only Shiprocket receives a unique replacement ID.
     */

    shiprocketPayload.order_id =
      `${originalOrderNumber}-R${Date.now()}`;

    console.log(
      "Recreating Shiprocket shipment:",
      shiprocketPayload.order_id
    );

    // ========================================================
    // CREATE NEW SHIPROCKET ORDER
    // ========================================================

    const shiprocketResponse =
      await createShiprocketOrder(
        shiprocketPayload
      );

    console.log(
      "Shiprocket Reassign Response:",
      shiprocketResponse
    );

    if (
      !shiprocketResponse?.order_id ||
      !shiprocketResponse?.shipment_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          shiprocketResponse?.message ||
          "New Shiprocket shipment could not be created.",
      });
    }

    // ========================================================
    // REPLACE ACTIVE SHIPMENT
    // ========================================================

    order.shiprocket.orderId =
      String(shiprocketResponse.order_id);

    order.shiprocket.shipmentId =
      String(shiprocketResponse.shipment_id);

    order.shiprocket.awbCode = null;

    order.shiprocket.courierId = null;

    order.shiprocket.courierName = null;

    order.shiprocket.trackingUrl = null;

    order.shiprocket.currentStatus =
      "Order Created";

    order.shiprocket.lastSyncedAt =
      new Date();

    /*
     * Reset pickup fields if they exist
     * in your shiprocketSchema.
     */

    order.shiprocket.pickupRequested =
      false;

    order.shiprocket.pickupRequestedAt =
      null;

    // ========================================================
    // TRACKING
    // ========================================================

    order.tracking.push({
      status: "Shipment Recreated",
      code: "SHIPMENT_RECREATED",
      location: "MIASHKA",
      message:
        "A new courier shipment has been created for your order.",
    });

    await order.save();

    return res.status(200).json({
      success: true,

      message:
        "New Shiprocket shipment created successfully. It is now ready for AWB assignment.",

      orderStatus:
        order.orderStatus,

      shiprocket: {
        orderId:
          order.shiprocket.orderId,

        shipmentId:
          order.shiprocket.shipmentId,

        awbCode: null,

        currentStatus:
          order.shiprocket.currentStatus,
      },
    });

  } catch (error) {
    console.error(
      "Reassign Shipment Error:",
      error.response?.data ||
      error.message
    );

    return res.status(500).json({
      success: false,

      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to reassign shipment",
    });
  }
};