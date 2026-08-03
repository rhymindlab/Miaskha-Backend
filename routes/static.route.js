
const {Router} = require("express");
const {handleSignUp, handleLogin, handlelogout, handleAddProduct, handleAddCategoryPage} = require('../controllers/static.controller');
const { restrictToLoggedinUserOnly, restrictToAdminOnly, restrictToUserOnly } = require("../middlewares/authentication");
const Product = require("../models/Product");
const MetalRate = require("../models/metalrate");
const Category = require("../models/category");
const Collection = require("../models/collection");
const Users = require("../models/users");
const Order = require("../models/order");
const router = Router();

router.get('/signup', handleSignUp);
router.get('/login', handleLogin);
router.get('/logout', handlelogout);

router.get("/profile", restrictToLoggedinUserOnly, async (req, res) => {
  try {
      const user = await Users.findById(req.user._id).select("-password -salt -role  ");
      
      if (!user) {
          return res.status(404).json({
              success: false,
              message: "User not found",
            });
    }

    return res.status(200).json({
        success: true,
        user,
    });
} catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


router.get(
    "/",
    restrictToAdminOnly,
    async (req, res) => {
        try {

            const [
                recentProducts,
                allMetalsRates,

                totalProducts,
                totalCategories,
                totalCollections,
                totalCustomers,

                totalOrders,
                pendingOrders,
                deliveredOrders,
                lowStockProducts,

                recentOrders,
                totalRevenue

            ] = await Promise.all([

                // Latest Products
                Product.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean(),

                // Metal Rates
                MetalRate.find().lean(),

                // Counts
                Product.countDocuments(),

                Category.countDocuments(),

                Collection.countDocuments(),

                Users.countDocuments(),

                Order.countDocuments(),

                Order.countDocuments({
                    orderStatus: {
                        $in: [
                            "PLACED",
                            "CONFIRMED",
                            "PACKED"
                        ]
                    }
                }),

                Order.countDocuments({
                    orderStatus: "DELIVERED"
                }),

                Product.countDocuments({
                    stock: {
                        $lte: 5
                    }
                }),

                // Recent Orders
                Order.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate("user", "fullName email")
                    .lean(),

                // Revenue
                Order.aggregate([
                    {
                        $match: {
                            paymentStatus: "SUCCESS"
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: "$amount"
                            }
                        }
                    }
                ])

            ]);

            res.render("pages/dashboard/dashboard", {

                pageTitle: "Dashboard",

                activePage: "dashboard",

                recentProducts,

                recentOrders,

                allMetalsRates,

                stats: {

                    totalProducts,

                    totalCategories,

                    totalCollections,

                    totalCustomers,

                    totalOrders,

                    pendingOrders,

                    deliveredOrders,

                    lowStockProducts,

                    totalRevenue:
                        totalRevenue.length > 0
                            ? totalRevenue[0].total
                            : 0

                }

            });

        } catch (err) {

            console.error(err);

            res.status(500).send("Server Error");

        }
    }
);
module.exports = router;