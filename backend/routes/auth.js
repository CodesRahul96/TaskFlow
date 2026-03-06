const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/authController");

router.post("/register",
  [body("name").notEmpty(), body("email").isEmail(), body("password").isLength({ min: 6 })],
  validate, ctrl.register);

router.post("/login",
  [body("email").isEmail(), body("password").notEmpty()],
  validate, ctrl.login);

router.get("/me", protect, ctrl.getMe);
router.put("/profile", protect, ctrl.updateProfile);
router.put("/password", protect,
  [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 6 })],
  validate, ctrl.changePassword);

module.exports = router;
