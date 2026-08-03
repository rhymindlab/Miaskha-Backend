
const category = require('../models/category');
const Category = require('../models/category');
const Collection = require('../models/collection');

async function handleSignUp(req, res) {
    return res.render('signUp');
}

async function handleLogin(req, res) {
    return res.render('login');
}

async function handlelogout(req, res){
    res.clearCookie("token",{
        httpOnly: true,
        secure: true,
        sameSite: "none",
    }).status(200).json({
        success: true,
        message: "Logout successful",
    });
}




module.exports = {
    handleSignUp,
    handleLogin,
    handlelogout,
}