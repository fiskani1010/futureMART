const express = require("express");
const router = express.Router();
const { createOrder, getMyOrders } = require("../controllers/orderController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.post("/", createOrder);
router.get("/my-orders", getMyOrders);

module.exports = router;
