const {Router} = require("express");
const { restrictToLoggedinUserOnly, restrictToAdminOnly, restrictToUserOnly } = require("../middlewares/authentication");
const { handleAddtoCart, handleGetCartForAdmin, handleGetCart, handleMergeCart } = require("../controllers/cart.controller");
const router = Router();


router.get('/',restrictToLoggedinUserOnly,restrictToAdminOnly, handleGetCartForAdmin);
router.post('/id',restrictToLoggedinUserOnly, restrictToUserOnly, handleGetCart);
router.post('/merge',restrictToLoggedinUserOnly, restrictToUserOnly, handleMergeCart);


module.exports = router;