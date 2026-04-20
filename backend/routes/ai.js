const express = require("express");
const router = express.Router();
const { chatWithAI } = require("../controllers/aiController");
const auth = require("../middleware/auth");

/**
 * AI Synergy Routes
 * Base Path: /api/ai
 */

router.post("/chat", auth.protect, chatWithAI);

module.exports = router;
