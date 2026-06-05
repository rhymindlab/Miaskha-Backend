const {Router} = require("express");
const { handleSignUp, handleLogin } = require('../controllers/user')
const router = Router();


router.post("/signup", handleSignUp);
router.post("/login", handleLogin);


module.exports = router;