const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/taskController");

router.use(protect);

// Task CRUD
router.get("/",    ctrl.getTasks);
router.post("/",   ctrl.createTask);
router.post("/sync-guest", ctrl.syncGuestTasks);
router.get("/:id", ctrl.getTask);
router.put("/:id", ctrl.updateTask);
router.delete("/:id", ctrl.deleteTask);

// Subtasks
router.post("/:id/subtasks",                ctrl.addSubtask);
router.put("/:id/subtasks/:subId",          ctrl.updateSubtask);
router.delete("/:id/subtasks/:subId",       ctrl.deleteSubtask);

// Time blocks
router.post("/:id/timeblocks",              ctrl.addTimeBlock);
router.put("/:id/timeblocks/:blockId",      ctrl.updateTimeBlock);
router.delete("/:id/timeblocks/:blockId",   ctrl.deleteTimeBlock);

module.exports = router;
