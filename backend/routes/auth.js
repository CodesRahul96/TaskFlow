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

router.post("/register-password", authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }).withMessage("Name is too long"),
    body("email").trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
  ],
  validate, ctrl.registerWithPassword);

router.post("/login-password", authLimiter,
  [
    body("email").trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required")
  ],
  validate, ctrl.loginWithPassword);

router.post("/google-auth", authLimiter,
  [
    body("idToken").notEmpty().withMessage("Google ID Token is required")
  ],
  validate, ctrl.googleAuth);

router.post("/set-password", protect,
  [
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
  ],
  validate, ctrl.setPassword);

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
