const express = require("express");
const auth = require("../middleware/auth.middleware");
const { getProfile, updateProfile } = require("../controllers/profile.controller");

const router = express.Router();

router.get("/", auth, getProfile);
router.put("/", auth, updateProfile);

module.exports = router;
