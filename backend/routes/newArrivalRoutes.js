const express = require("express");
const router = express.Router();
const { getPublicNewArrivals } = require("../controllers/newArrivalController");

router.get("/", getPublicNewArrivals);

module.exports = router;
