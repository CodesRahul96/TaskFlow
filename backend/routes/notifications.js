const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/notificationController");

router.use(protect);

router.get("/",            ctrl.getNotifications);
router.put("/read-all",    ctrl.markAllAsRead);
router.put("/:id/read",    ctrl.markAsRead);
router.delete("/:id",      ctrl.deleteNotification);

module.exports = router;
