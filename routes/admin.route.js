const {Router} = require("express");
const { handleSignUp } = require("../controllers/user");
const router = Router();

router.post("/signup", handleSignUp)

module.exports = router;