const {Router} = require("express");
const { handleAddCategoryPage, handleCategoryPage, handleEditCategoryPage } = require("../controllers/adminCategory.controller");
const { restrictToAdminOnly, restrictToLoggedinUserOnly } = require("../middlewares/authentication");
const router = Router();

router.get('/', restrictToLoggedinUserOnly, restrictToAdminOnly, handleCategoryPage);
router.get('/add', restrictToLoggedinUserOnly, restrictToAdminOnly, handleAddCategoryPage);
router.get('/edit/:id', restrictToLoggedinUserOnly, restrictToAdminOnly, handleEditCategoryPage);
module.exports = router;