const { randomBytes, createHmac } = require("crypto");
const { Schema, model } = require("mongoose");
const { createTokenForUser } = require("../services/authentication");

/* -------------------- Address Schema -------------------- */

const addressSchema = new Schema(
    {
        firstName: {
            type: String,
            default: "",
            trim: true,
        },

        lastName: {
            type: String,
            default: "",
            trim: true,
        },

        company: {
            type: String,
            default: "",
            trim: true,
        },

        country: {
            type: String,
            default: "",
            trim: true,
        },

        address: {
            type: String,
            default: "",
            trim: true,
        },

        city: {
            type: String,
            default: "",
            trim: true,
        },

        state: {
            type: String,
            default: "",
            trim: true,
        },

        pinCode: {
            type: String,
            default: "",
            trim: true,
        },

        mobile: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        _id: false,
    }
);

/* -------------------- User Schema -------------------- */

const usersSchema = new Schema(
    {
        firstName: {
            type: String,
            default: "",
        },

        lastName: {
            type: String,
            default: "",
        },

        userName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        salt: {
            type: String,
        },

        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER",
        },

        /* ---------- Billing ---------- */

        billingAddress: {
            type: addressSchema,
            default: () => ({}),
        },

        /* ---------- Shipping ---------- */

        shippingAddress: {
            type: addressSchema,
            default: () => ({}),
        },

        /* ---------- Same As Billing ---------- */

        sameAsBilling: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

/* -------------------- Password Hash -------------------- */

usersSchema.pre("save", function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    const salt = randomBytes(16).toString("hex");

    const hashedPassword = createHmac("sha256", salt)
        .update(this.password)
        .digest("hex");

    this.salt = salt;
    this.password = hashedPassword;

    next();
});

/* -------------------- Login -------------------- */

usersSchema.static(
    "matchPasswordAndGenerateToken",
    async function (email, password) {

        const user = await this.findOne({ email });

        if (!user) {
            throw new Error("User Not Found");
        }

        const hash = createHmac("sha256", user.salt)
            .update(password)
            .digest("hex");

        if (hash !== user.password) {
            throw new Error("Incorrect Password");
        }

        const token = createTokenForUser(user);

        return {
            token,
            role: user.role,
        };
    }
);

const Users = model("Users", usersSchema);

module.exports = Users;