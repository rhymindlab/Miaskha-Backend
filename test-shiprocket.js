require("dotenv").config();
const axios = require("axios");

async function test() {
    const email = process.env.SHIPROCKET_EMAIL?.trim();
    const password = process.env.SHIPROCKET_PASSWORD?.trim();

    console.log("Email:", JSON.stringify(email));
    console.log("Password loaded:", Boolean(password));
    console.log("Password length:", password?.length);

    try {
        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/auth/login",
            {
                email,
                password,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("SHIPROCKET LOGIN SUCCESS");
        console.log("Token received:", Boolean(response.data?.token));
        console.log("Account email:", response.data?.email);

    } catch (error) {
        console.log("SHIPROCKET LOGIN FAILED");
        console.log("HTTP:", error.response?.status);
        console.log("Response:", error.response?.data);
    }
}

test();