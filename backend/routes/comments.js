const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/commentController");

router.use(protect);
router.get("/:taskId",       ctrl.getComments);
router.post("/:taskId",      ctrl.addComment);
router.put("/:commentId",    ctrl.editComment);
router.delete("/:commentId", ctrl.deleteComment);

module.exports = router;
