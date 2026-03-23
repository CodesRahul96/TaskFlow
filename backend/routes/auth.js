const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/authController");

router.post("/register", authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }).withMessage("Name is too long"),
    body("email").trim().isEmail().withMessage("Invalid email format").normalizeEmail()
  ],
  validate, ctrl.register);

router.post("/login", authLimiter,
  [
    body("email").trim().isEmail().withMessage("Invalid email format").normalizeEmail()
  ],
  validate, ctrl.login);

router.get("/verify-email", ctrl.verifyEmail);
router.get("/verify-login", ctrl.verifyLogin);
router.post("/logout", ctrl.logout);

// MFA Routes
router.get("/mfa/setup", protect, ctrl.setupMFA);
router.post("/mfa/verify", protect, ctrl.verifyMFASetup);
router.post("/mfa/validate", ctrl.validateMFA); // Public challenge
router.post("/mfa/disable", protect, ctrl.disableMFA);

router.get("/me", protect, ctrl.getMe);
router.put("/profile", protect, ctrl.updateProfile);

module.exports = router;
