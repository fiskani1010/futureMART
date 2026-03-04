const express = require("express");
const router = express.Router();
const { getMyProfile, updateMyProfile } = require("../controllers/accountController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get("/profile", getMyProfile);
router.put("/profile", updateMyProfile);

module.exports = router;
