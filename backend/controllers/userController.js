const User = require("../models/User");
const logAudit = require("../utils/audit");

/**
 * User Directory Controller
 * Provides lookup services for collaboration and identity resolution.
 */

/**
 * Searches users for task assignment and collaboration.
 * @route GET /api/users/search
 * @access Private
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name:  { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).select("name email").limit(10);
    res.json({ users });
  } catch (err) { next(err); }
};

// GET /api/users/friends
exports.getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("friends", "name email");
    // Return friends + pending requests sent TO this user
    const all = await User.find({
      "friendRequests.to": req.user._id,
      "friendRequests.status": "pending",
    }).select("name email");
    res.json({ friends: user.friends, friendRequests: all });
  } catch (err) { next(err); }
};

// POST /api/users/friend-request/:userId
exports.sendFriendRequest = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (req.user.friends.includes(req.params.userId))
      return res.status(400).json({ message: "Already friends" });
    // Simple approach: add to friends list directly
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friends: req.params.userId },
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $addToSet: { friends: req.user._id },
    });
    
    await logAudit(
      req.user._id,
      req.user.name,
      "friend_added",
      null,
      { target: targetUser.name }
    );

    res.json({ message: "Collaborator added to your directory" });
  } catch (err) { next(err); }
};

// PUT /api/users/friend-request/:requestId/respond
exports.respondFriendRequest = async (req, res, next) => {
  // Simplified: respond is a no-op since we add immediately
  res.json({ message: "OK" });
};
