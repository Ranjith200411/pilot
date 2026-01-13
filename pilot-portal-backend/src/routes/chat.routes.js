const express = require("express");
const { chat } = require("../controllers/chat.controller");

const router = express.Router();

// Chat route is public - no authentication required for FREE chatbot
router.post("/", chat);

module.exports = router;
