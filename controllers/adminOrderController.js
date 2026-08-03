const Order = require("../models/order");
const {
    getTrackingByAWB,
} = require("../services/shiprocket.service");
/* ============================================================
   ADMIN - GET ALL ORDERS
============================================================ */

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "firstName lastName userName email mobile")
            .sort({ createdAt: -1 })
            .lean();

        return res.render("pages/orders/index", {

            pageTitle: "Orders",
            activePage: "orders",

            orders,
            user: req.user,

        });

    } catch (error) {
        console.error("Admin Get Orders Error:", error);

        return res.status(500).send(
            "Unable to load orders"
        );
    }
};


/* ============================================================
   ADMIN - GET ORDER DETAILS
============================================================ */

exports.getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Don't use .lean() yet because we may update the order.
        let order = await Order.findById(id)
            .populate(
                "user",
                "firstName lastName userName email mobile"
            )
            .populate(
                "items.product",
                "title slug sku images productType"
            );

        if (!order) {
            return res.status(404).send(
                "Order not found"
            );
        }

        /* ====================================================
           SYNC LATEST SHIPROCKET STATUS
        ==================================================== */

        if (order.shiprocket?.awbCode) {

            try {

                console.log(
                    "Admin: Syncing Shiprocket tracking:",
                    order.shiprocket.awbCode
                );

                const response =
                    await getTrackingByAWB(
                        order.shiprocket.awbCode
                    );

                const trackingData =
                    response?.tracking_data;

                if (trackingData) {

                    const shipmentTrack =
                        Array.isArray(
                            trackingData.shipment_track
                        )
                            ? trackingData.shipment_track
                            : [];

                    const latestShipment =
                        shipmentTrack[0] || {};


                    // Example:
                    // "Canceled"
                    // "In Transit"
                    // "Delivered"

                    const currentStatus =
                        latestShipment.current_status ||
                        order.shiprocket.currentStatus ||
                        "";


                    /* ==========================================
                       UPDATE SHIPROCKET INFORMATION
                    ========================================== */

                    if (currentStatus) {
                        order.shiprocket.currentStatus =
                            currentStatus;
                    }


                    if (latestShipment.courier_name) {
                        order.shiprocket.courierName =
                            latestShipment.courier_name;
                    }


                    if (trackingData.track_url) {
                        order.shiprocket.trackingUrl =
                            trackingData.track_url;
                    }


                    order.shiprocket.lastSyncedAt =
                        new Date();


                    /* ==========================================
                       UPDATE DELIVERY PROGRESS

                       IMPORTANT:
                       Courier cancellation does NOT cancel
                       the MIASHKA customer order.
                    ========================================== */

                    const normalizedStatus =
                        String(currentStatus)
                            .trim()
                            .toUpperCase()
                            .replace(/[\s-]+/g, "_");


                    if (
                        normalizedStatus.includes(
                            "DELIVERED"
                        )
                    ) {

                        order.orderStatus =
                            "DELIVERED";

                        if (!order.deliveredAt) {
                            order.deliveredAt =
                                new Date();
                        }

                    } else if (
                        normalizedStatus.includes(
                            "OUT_FOR_DELIVERY"
                        )
                    ) {

                        order.orderStatus =
                            "OUT_FOR_DELIVERY";

                    } else if (
                        normalizedStatus.includes(
                            "IN_TRANSIT"
                        ) ||
                        normalizedStatus.includes(
                            "SHIPPED"
                        ) ||
                        normalizedStatus.includes(
                            "PICKED_UP"
                        )
                    ) {

                        order.orderStatus =
                            "SHIPPED";

                    }

                    /*
                     * DO NOT do:
                     *
                     * if status === Canceled
                     * order.orderStatus = "CANCELLED"
                     *
                     * A cancelled courier shipment and
                     * cancelled customer order are different.
                     */


                    await order.save();


                    console.log(
                        "Shiprocket status synced:",
                        currentStatus
                    );
                }

            } catch (shiprocketError) {

                /*
                 * Shiprocket being temporarily unavailable
                 * should NOT stop admin from viewing the order.
                 */

                console.error(
                    "Admin Shiprocket Sync Error:",
                    shiprocketError.response?.data ||
                    shiprocketError.message
                );
            }
        }


        /* ====================================================
           RENDER UPDATED ORDER
        ==================================================== */

        return res.render(
            "pages/orders/details",
            {

                pageTitle: "Order Details",
                activePage: "orders",

                order: order.toObject(),
                user: req.user,

            }
        );

    } catch (error) {

        console.error(
            "Admin Order Details Error:",
            error
        );

        return res.status(500).send(
            "Unable to load order details"
        );
    }
};

exports.updateOrderStatus = async (req, res) => {

    try {

        const { id } = req.params;

        const { orderStatus } = req.body;

        await Order.findByIdAndUpdate(

            id,

            {
                orderStatus,
            },

            {
                new: true,
                runValidators: true,
            }

        );

        return res.redirect(`/admin/orders/${id}`);

    } catch (error) {

        console.error(error);

        return res.status(500).send("Unable to update order.");

    }

};