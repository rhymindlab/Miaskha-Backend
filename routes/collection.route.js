const { Router } = require('express');
const { listCollections, createCollection } = require('../controllers/collection.controller');
const { restrictToLoggedinUserOnly, restrictToAdminOnly } = require("../middlewares/authentication");
const { handleFilterByCollection } = require('../controllers/product.controller');

const router = Router();

router.get('/', listCollections);
router.post('/', restrictToLoggedinUserOnly, restrictToAdminOnly, createCollection);
router.get("/:slug", handleFilterByCollection);

module.exports = router;
