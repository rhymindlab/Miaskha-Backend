const Order = require("../models/order");
const Product = require("../models/Product");

const {
    getTrackingByAWB,
} = require("../services/shiprocket.service");

/* ===========================================================
   GET MY ORDERS
=========================================================== */

exports.getMyOrders = async (req, res) => {

    try {

        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first",
            });
        }

        const orders = await Order.find({
            user: userId,
        })

            .select(`
                orderNumber
                items
                amount
                paymentStatus
                paymentMethod
                orderStatus
                createdAt
                tracking
                shiprocket
            `)

            .sort({
                createdAt: -1,
            })

            .lean();

        return res.status(200).json({

            success: true,

            count: orders.length,

            orders,

        });

    } catch (error) {

        console.error("Get Orders Error:", error);

        return res.status(500).json({

            success: false,

            message: "Unable to fetch orders",

        });

    }

};

/* ===========================================================
   GET ORDER DETAILS
=========================================================== */

exports.getOrderById = async (req, res) => {

    try {

        const userId = req.user?._id || req.user?.id;

        const { id } = req.params;

        const order = await Order.findById(id)

            .select(`
                user
                orderNumber
                items
                billingAddress
                shippingAddress
                subtotal
                gstTotal
                shippingCharge
                discount
                amount
                paymentMethod
                paymentStatus
                orderStatus
                tracking
                shiprocket
                createdAt
            `)

            .populate(
                "items.product",
                "_id title slug images"
            );

        if (!order) {

            return res.status(404).json({

                success: false,

                message: "Order not found",

            });

        }

        if (String(order.user) !== String(userId)) {

            return res.status(403).json({

                success: false,

                message: "Unauthorized",

            });

        }

        return res.status(200).json({

            success: true,

            order,

        });

    } catch (error) {

        console.error("Get Order Error:", error);

        return res.status(500).json({

            success: false,

            message: "Unable to fetch order",

        });

    }

};

/* ===========================================================
   GET LIVE ORDER TRACKING
=========================================================== */

exports.getTracking = async (req, res) => {

    try {

        const userId = req.user?._id || req.user?.id;

        const { id } = req.params;

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Please login first",
            });

        }

        const order = await Order.findById(id).select(`
            user
            orderNumber
            orderStatus
            tracking
            shiprocket
            deliveredAt
        `);

        if (!order) {

            return res.status(404).json({
                success: false,
                message: "Order not found",
            });

        }

        if (String(order.user) !== String(userId)) {

            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });

        }

        /* ======================================================
           NO AWB YET
        ====================================================== */

        if (!order.shiprocket?.awbCode) {

            return res.status(200).json({

                success: true,

                source: "INTERNAL",

                orderNumber: order.orderNumber,

                orderStatus: order.orderStatus,

                shiprocket: order.shiprocket,

                tracking: order.tracking,

            });

        }

        /* ======================================================
           CACHE TRACKING FOR 10 MINUTES
        ====================================================== */

        const lastSync = order.shiprocket?.lastSyncedAt;

        if (
            lastSync &&
            Date.now() - new Date(lastSync).getTime() < 10 * 60 * 1000
        ) {

            return res.status(200).json({

                success: true,

                source: "CACHE",

                orderNumber: order.orderNumber,

                orderStatus: order.orderStatus,

                shiprocket: order.shiprocket,

                tracking: order.tracking,

            });

        }

        /* ======================================================
           FETCH LIVE SHIPROCKET TRACKING
        ====================================================== */

        try {

            const shiprocketResponse =
                await getTrackingByAWB(
                    order.shiprocket.awbCode
                );

            console.log(
                "Shiprocket Tracking:",
                JSON.stringify(
                    shiprocketResponse,
                    null,
                    2
                )
            );

            const trackingData =
                shiprocketResponse?.tracking_data;

            if (!trackingData) {

                throw new Error(
                    "Tracking data unavailable"
                );

            }
            /* ======================================================
   CURRENT STATUS
====================================================== */

const shipmentTrack = Array.isArray(
    trackingData.shipment_track
)
    ? trackingData.shipment_track
    : [];

const latestShipment =
    shipmentTrack[0] || {};

const shipmentStatus =
    latestShipment.current_status ||
    trackingData.track_status ||
    trackingData.shipment_status ||
    order.shiprocket.currentStatus ||
    "";

/* ======================================================
   UPDATE SHIPROCKET DETAILS
====================================================== */

if (trackingData.track_url) {
    order.shiprocket.trackingUrl =
        trackingData.track_url;
}

order.shiprocket.currentStatus =
    shipmentStatus;

order.shiprocket.lastSyncedAt =
    new Date();

/* ======================================================
   LIVE TRACKING
====================================================== */

const activities = Array.isArray(
    trackingData.shipment_track_activities
)
    ? trackingData.shipment_track_activities
    : [];

const liveTracking = activities.map((activity) => ({

    status:
        activity["sr-status-label"] &&
        activity["sr-status-label"] !== "NA"
            ? activity["sr-status-label"]
            : activity.status || "Shipment Update",

    location:
        activity.location || "",

    message:
        activity.activity ||
        activity.status ||
        "Shipment updated",

    date:
        activity.date
            ? new Date(activity.date)
            : new Date(),

}));

liveTracking.sort(
    (a, b) =>
        new Date(a.date) -
        new Date(b.date)
);

/* ======================================================
   NORMALIZE STATUS
====================================================== */

const normalizedStatus = String(
    shipmentStatus
)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

switch (normalizedStatus) {

    case "DELIVERED":

        order.orderStatus =
            "DELIVERED";

        if (!order.deliveredAt) {
            order.deliveredAt =
                new Date();
        }

        break;

    case "OUT_FOR_DELIVERY":

        order.orderStatus =
            "OUT_FOR_DELIVERY";

        break;

    default:

        if (
            normalizedStatus.includes(
                "SHIPPED"
            ) ||
            normalizedStatus.includes(
                "IN_TRANSIT"
            ) ||
            normalizedStatus.includes(
                "PICKED_UP"
            )
        ) {

            order.orderStatus =
                "SHIPPED";

        }

}

/* ======================================================
   MERGE TRACKING
====================================================== */

const combinedTracking = [

    ...order.tracking.map((item) => ({

        status: item.status,

        location: item.location,

        message: item.message,

        date: item.date,

    })),

    ...liveTracking,

];

combinedTracking.sort(
    (a, b) =>
        new Date(a.date) -
        new Date(b.date)
);

/* ======================================================
   REMOVE DUPLICATES
====================================================== */

const seen = new Set();

const tracking =
    combinedTracking.filter((item) => {

        const key = [

            item.status,

            item.location,

            item.message,

            new Date(item.date).getTime(),

        ].join("|");

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;

    });

/* ======================================================
   SAVE LATEST TRACKING
====================================================== */

order.tracking = tracking;

await order.save();
/* ======================================================
   RESPONSE
====================================================== */

return res.status(200).json({

    success: true,

    source: "SHIPROCKET",

    orderNumber: order.orderNumber,

    orderStatus: order.orderStatus,

    shiprocket: {

        orderId: order.shiprocket?.orderId || null,

        shipmentId: order.shiprocket?.shipmentId || null,

        awbCode: order.shiprocket?.awbCode || null,

        courierId: order.shiprocket?.courierId || null,

        courierName: order.shiprocket?.courierName || null,

        trackingUrl: order.shiprocket?.trackingUrl || null,

        currentStatus: order.shiprocket?.currentStatus || null,

        lastSyncedAt: order.shiprocket?.lastSyncedAt || null,

    },

    tracking,

});

} catch (shiprocketError) {

    console.error(
        "Shiprocket Tracking Error:",
        shiprocketError.response?.data ||
        shiprocketError.message
    );

    return res.status(200).json({

        success: true,

        source: "INTERNAL",

        message:
            "Live courier tracking is temporarily unavailable.",

        orderNumber: order.orderNumber,

        orderStatus: order.orderStatus,

        shiprocket: order.shiprocket,

        tracking: order.tracking,

    });

}

} catch (error) {

    console.error("Tracking Error:", error);

    return res.status(500).json({

        success: false,

        message: "Unable to fetch tracking",

    });

}

};

/* ===========================================================
   CANCEL ORDER
=========================================================== */

exports.cancelOrder = async (req, res) => {

    try {

        const userId = req.user?._id || req.user?.id;

        const { id } = req.params;

        const order = await Order.findById(id);

        if (!order) {

            return res.status(404).json({

                success: false,

                message: "Order not found",

            });

        }

        if (String(order.user) !== String(userId)) {

            return res.status(403).json({

                success: false,

                message: "Unauthorized",

            });

        }

        if (

            [

                "SHIPPED",

                "OUT_FOR_DELIVERY",

                "DELIVERED",

                "RETURNED",

            ].includes(order.orderStatus)

        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This order can no longer be cancelled.",

            });

        }

        if (order.orderStatus === "CANCELLED") {

            return res.status(400).json({

                success: false,

                message:
                    "Order already cancelled.",

            });

        }

        /* ==========================================
           RESTORE STOCK
        ========================================== */

        for (const item of order.items) {

            await Product.findByIdAndUpdate(

                item.product,

                {

                    $inc: {

                        stock: item.quantity,

                    },

                }

            );

        }

        /* ==========================================
           UPDATE ORDER
        ========================================== */

        order.orderStatus = "CANCELLED";

        order.cancelledAt = new Date();

        await order.addTracking({

            status: "Cancelled",

            code: "CANCELLED",

            location: "MIASHKA",

            message:
                "Your order has been cancelled successfully.",

        });

        return res.status(200).json({

            success: true,

            message:
                "Order cancelled successfully.",

        });

    } catch (error) {

        console.error(
            "Cancel Order Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to cancel order",

        });

    }

};