const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/auditController");

router.use(protect);
router.get("/user/me", ctrl.getUserAudit);
router.get("/:taskId", ctrl.getTaskAudit);

module.exports = router;
