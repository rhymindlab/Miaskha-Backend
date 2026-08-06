const {v4: uuidv4} = require('uuid');
const Users = require('../models/users');


function generateUsername(firstName, lastName) {
    const random = Math.floor(1000 + Math.random() * 9000);

    return `${firstName}${lastName}${random}`
        .toLowerCase()
        .replace(/\s+/g, "");
}

async function handleUserSignUp(req, res) {
    try {
        const { firstName, lastName, password, email, termsandConditions} = req.body;

        let userName;

        do {
            userName = generateUsername(firstName, lastName);
        } while (await Users.exists({ userName }));

        await Users.create({
            firstName,
            lastName,
            userName,
            password,
            email,
            role: "USER",
            terms: termsandConditions || true,
        });

        // Login immediately after signup
        const { token, role: userRole } =
            await Users.matchPasswordAndGenerateToken(email, password);

        return res
            .cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite:
                    process.env.NODE_ENV === "production"
                        ? "none"
                        : "lax",
            })
            .status(201)
            .json({
                success: true,
                message: "Sign Up Success",
                role: userRole,
                userName,
            });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
}

async function handleAddAdmin(req, res){
    try {
        const {userName, password, email} = req.body;
        await Users.create({
            userName,
            password,
            email,
            role: "ADMIN",
            terms: true,
        });
        return res.status(200).send('New Admin has Been Added');
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
    }
};

async function handleSignUp(req, res){
    try {
        const {userName, password, email, role} = req.body;
        await Users.create({
            userName,
            password,   
            email,  
            role,
            terms: true,
        });
        return res.render("login")
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
    }
};

async function handleLogin(req, res){
    try{
        const {email, password} = req.body;
        
        const {token, role} = await Users.matchPasswordAndGenerateToken(email, password);
        if(role === 'ADMIN'){
            return res.cookie('token', token,).redirect("/");
        }
        else{
            return res.cookie('token', token,{
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production"
                    ? "none"
                    : "lax",
            }).json({success: true, role: "USER"});
            ;
        }

    }
    catch (error) {
        console.log(error)
        return res.render("login", {
            error: "Incorrect Email or Password"
        })
    }

};


async function handleDetailChange(req, res) {
    try {
        const updateData = {};

        // Root profile fields
        const fields = [
            "firstName",
            "lastName",
            "mobile",
            "address",
            "company",
            "country",
            "city",
            "state",
            "pinCode",
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // Billing Address
        if (req.body.billingAddress) {
            updateData.billingAddress = req.body.billingAddress;
        }

        // Shipping Address
        if (req.body.sameAsBilling !== undefined) {
            updateData.sameAsBilling = req.body.sameAsBilling;
        }

        if (req.body.sameAsBilling === true && req.body.billingAddress) {
            updateData.shippingAddress = req.body.billingAddress;
        }

        if (req.body.sameAsBilling === false && req.body.shippingAddress) {
            updateData.shippingAddress = req.body.shippingAddress;
        }

        const updatedUser = await Users.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("-password -salt");

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
}

module.exports = {
    handleUserSignUp,
    handleLogin,
    handleDetailChange,
    handleSignUp,
}