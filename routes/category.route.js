const { Router } = require('express');
const { listCategories, createCategory, getCategoryFilters, updateCategory } = require('../controllers/category.controller');
const { restrictToLoggedinUserOnly, restrictToAdminOnly } = require("../middlewares/authentication");

const router = Router();

router.get('/', listCategories);
router.post('/', restrictToLoggedinUserOnly, restrictToAdminOnly, createCategory);
router.put('/:id',restrictToLoggedinUserOnly,restrictToAdminOnly, updateCategory)

router.get( "/filter/:slug", getCategoryFilters);

module.exports = router;
