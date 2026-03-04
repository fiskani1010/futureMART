const express = require("express");
const router = express.Router();
const { getPublicTeamMembers } = require("../controllers/teamMemberController");

router.get("/", getPublicTeamMembers);

module.exports = router;
