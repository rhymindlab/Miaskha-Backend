const JWT = require("jsonwebtoken");

function createTokenForUser(user){
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set in environment');
    }

    const payload = {
        _id: user._id,
        firstName: user.firstName,
        lastName:user.lastName,
        email: user.email,
        role: user.role,
        userName:user.userName,
        address:user.address,
        mobile: user.mobile,
        company: user.company,
        country: user.country,
        city: user.city,
        state: user.state,
        pinCode: user.pinCode
    };

    const token = JWT.sign(payload, secret);

    return token;

}

function validateToken(token){
    const secret = process.env.JWT_SECRET;
    if (!secret) { 
        throw new Error('JWT_SECRET is not set in environment');
    }
    const payload = JWT.verify(token, secret);
    return payload;
}

module.exports ={
    createTokenForUser,
    validateToken,
}