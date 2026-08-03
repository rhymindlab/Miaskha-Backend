const {Router} = require("express");
const { restrictToAdminOnly, restrictToLoggedinUserOnly } = require("../middlewares/authentication");
const { handleCollectionPage, handleEditCollectionPage, handleAddCollectionPage } = require("../controllers/adminCollection.controller");
const router = Router();

router.get('/', restrictToLoggedinUserOnly, restrictToAdminOnly, handleCollectionPage);
router.get('/add', restrictToLoggedinUserOnly, restrictToAdminOnly, handleAddCollectionPage);
router.get('/edit/:id', restrictToLoggedinUserOnly, restrictToAdminOnly, handleEditCollectionPage);
module.exports = router;