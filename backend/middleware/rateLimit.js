const rateLimit = require("express-rate-limit");

// Limit for login and register: 100 attempts per 15 minutes per IP (increased for development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: {
    success: false,
    message: "Too many attempts from this IP, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter };
