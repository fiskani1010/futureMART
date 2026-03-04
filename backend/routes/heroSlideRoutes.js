const express = require("express");
const router = express.Router();
const { getPublicHeroSlides } = require("../controllers/heroSlideController");

router.get("/", getPublicHeroSlides);

module.exports = router;
