const {Router} = require("express");
const { handleUserSignUp, handleLogin, handleDetailChange, handleSignUp } = require('../controllers/user');
const { restrictToLoggedinUserOnly, restrictToAdminOnly } = require("../middlewares/authentication");
const router = Router();


router.post("/signup", handleUserSignUp);
router.post("/login", handleLogin);
router.put("/update", restrictToLoggedinUserOnly, handleDetailChange);




module.exports = router;