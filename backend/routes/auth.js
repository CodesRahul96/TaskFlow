const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/authController");

router.post("/register", authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }).withMessage("Name is too long"),
    body("email").trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
      .matches(/\d/).withMessage("Password must contain at least one number")
  ],
  validate, ctrl.register);

router.post("/login", authLimiter,
  [
    body("email").trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required")
  ],
  validate, ctrl.login);



router.get("/me", protect, ctrl.getMe);
router.put("/profile", protect, ctrl.updateProfile);
router.put("/password", protect,
  [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 6 })],
  validate, ctrl.changePassword);

module.exports = router;
