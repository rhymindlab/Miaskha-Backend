const axios = require("axios");

const BASE_URL =
  "https://apiv2.shiprocket.in/v1/external";

let cachedToken = null;
let tokenExpiresAt = 0;

/* ============================================================
   GET AUTH TOKEN
============================================================ */

async function loginShiprocket() {
  try {
    // Reuse token while cached
    if (
      cachedToken &&
      Date.now() < tokenExpiresAt
    ) {
      return cachedToken;
    }

    if (
      !process.env.SHIPROCKET_EMAIL ||
      !process.env.SHIPROCKET_PASSWORD
    ) {
      throw new Error(
        "Shiprocket API credentials are missing"
      );
    }

    const response = await axios.post(
      `${BASE_URL}/auth/login`,
      {
        email: process.env.SHIPROCKET_EMAIL,
        password:
          process.env.SHIPROCKET_PASSWORD,
      }
    );

    if (!response.data?.token) {
      throw new Error(
        "Shiprocket token was not returned"
      );
    }

    cachedToken = response.data.token;

    // Cache locally for 9 days
    tokenExpiresAt =
      Date.now() +
      9 * 24 * 60 * 60 * 1000;

    return cachedToken;
  } catch (error) {
    console.error(
      "Shiprocket Login Error:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

/* ============================================================
   AUTH HEADERS
============================================================ */

async function getHeaders() {
  const token = await loginShiprocket();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/* ============================================================
   CREATE SHIPROCKET ORDER
============================================================ */

async function createOrder(payload) {
  try {
    const headers = await getHeaders();

    const response = await axios.post(
      `${BASE_URL}/orders/create/adhoc`,
      payload,
      {
        headers,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Shiprocket Create Order Error:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

/* ============================================================
   CHECK COURIER SERVICEABILITY
============================================================ */

async function checkServiceability({
  pickupPostcode,
  deliveryPostcode,
  weight,
  cod = 0,
  length,
  breadth,
  height,
  declaredValue,
}) {
  try {
    const headers = await getHeaders();

    const response = await axios.get(
      `${BASE_URL}/courier/serviceability/`,
      {
        headers,

        params: {
          pickup_postcode:
            pickupPostcode,

          delivery_postcode:
            deliveryPostcode,

          cod,

          weight,

          length,

          breadth,

          height,

          declared_value:
            declaredValue,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Shiprocket Serviceability Error:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

/* ============================================================
   ASSIGN AWB
============================================================ */

async function generateAWB(
  shipmentId,
  courierId = null
) {
  try {
    if (!shipmentId) {
      throw new Error(
        "Shipment ID is required to generate AWB"
      );
    }

    const headers = await getHeaders();

    const body = {
      shipment_id: Number(shipmentId),
    };

    /*
     * courier_id is optional.
     *
     * When omitted, Shiprocket can assign
     * the default courier according to
     * the account's courier priority.
     */
    if (courierId) {
      body.courier_id =
        Number(courierId);
    }

    const response = await axios.post(
      `${BASE_URL}/courier/assign/awb`,
      body,
      {
        headers,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Shiprocket AWB Error:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

/* ============================================================
   REQUEST PICKUP
============================================================ */

async function generatePickup(shipmentId) {
  try {
    if (!shipmentId) {
      throw new Error(
        "Shipment ID is required to generate pickup"
      );
    }

    const headers = await getHeaders();

    const response = await axios.post(
      `${BASE_URL}/courier/generate/pickup`,
      {
        shipment_id: [
          Number(shipmentId),
        ],
      },
      {
        headers,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Shiprocket Pickup Error:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

/* ============================================================
   TRACK SHIPMENT BY AWB
============================================================ */

async function getTrackingByAWB(awbCode) {
  try {
    if (!awbCode) {
      throw new Error(
        "AWB code is required"
      );
    }

    const headers = await getHeaders();

    const response = await axios.get(
      `${BASE_URL}/courier/track/awb/${encodeURIComponent(
        awbCode
      )}`,
      {
        headers,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Shiprocket Tracking Error:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

/* ============================================================
   EXPORT
============================================================ */

module.exports = {
  loginShiprocket,

  createOrder,

  checkServiceability,

  generateAWB,

  generatePickup,

  getTrackingByAWB,
};