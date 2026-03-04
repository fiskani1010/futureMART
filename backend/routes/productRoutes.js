const express = require("express");
const router = express.Router();
const {
    getAllProducts,
    getFlashSaleProducts,
    getBestSellingProducts,
    getProductById,
} = require("../controllers/productController");

// GET all products
router.get("/flash-sales", getFlashSaleProducts);
router.get("/best-sellers", getBestSellingProducts);
router.get("/:id", getProductById);
router.get("/", getAllProducts);

module.exports = router;
