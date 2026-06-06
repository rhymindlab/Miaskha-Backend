const {v4: uuidv4} = require('uuid');
const Users = require('../models/users');

async function handleSignUp(req, res){
    try {
        const {userName, password, email, role} = req.body;
        await Users.create({
            userName,
            password,
            email,
            role,
        });
        return res.json("SingUp Success");
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
    }
};

async function handleLogin(req, res){
    try{
        const {email, password} = req.body;
        console.log(req.body);
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




module.exports = {
    handleSignUp,
    handleLogin,
}