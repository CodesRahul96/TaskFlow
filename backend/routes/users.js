const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/userController");

router.use(protect);
router.get("/search",          ctrl.searchUsers);
router.get("/friends",         ctrl.getFriends);
router.post("/friend-request/:userId", ctrl.sendFriendRequest);
router.put("/friend-request/:requestId/respond", ctrl.respondFriendRequest);

module.exports = router;
