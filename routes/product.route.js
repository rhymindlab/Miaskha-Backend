const { Router } = require("express");
const { handleAddProduct, handleDeleteProduct, handleProduct, handleProductUpdation, handleGetAllProducts, handleFilterByCategory } = require("../controllers/product.controller");
const { restrictToLoggedinUserOnly, restrictToAdminOnly } = require("../middlewares/authentication");


const router = Router();
router.get('/', handleGetAllProducts)
router.post('/addproduct', restrictToLoggedinUserOnly, restrictToAdminOnly, handleAddProduct);
router.get('/:id', handleProduct)
router.patch('/:id',restrictToLoggedinUserOnly, restrictToAdminOnly, handleProductUpdation);
router.delete('/:id', restrictToLoggedinUserOnly, restrictToAdminOnly, handleDeleteProduct);
router.get("/category/:slug", handleFilterByCategory); 



module.exports = router;