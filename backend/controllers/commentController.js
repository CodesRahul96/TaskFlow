const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Task = require("../models/Task");
const logAudit = require("../utils/audit");

// GET /api/comments/:taskId
exports.getComments = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const canAccess =
      task.owner.equals(req.user._id) ||
      task.assignedTo.some(u => u.equals(req.user._id));
    if (!canAccess) return res.status(403).json({ message: "Not authorised" });
    const comments = await Comment.find({ task: req.params.taskId })
      .sort("createdAt")
      .populate("author", "name email");
    res.json({ comments });
  } catch (err) { next(err); }
};

/**
 * Comment Management Controller
 * Handles nested communication and task-level discussions.
 */

/**
 * Adds a new comment to a specified task.
 * @route POST /api/comments/:taskId
 * @access Private
 */
exports.addComment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const comment = await Comment.create({
      task: req.params.taskId,
      author: req.user._id,
      content: req.body.content,
    });
    await comment.populate("author", "name email");
    await logAudit(req.user._id, req.user.name, "comment_added", task._id, {});
    const io = req.app.get("io");
    io.to(`task:${req.params.taskId}`).emit("comment-added", { comment });

    // Build notification recipients (include owner + all assigned users, excluding current user)
    const recipients = new Set([
      task.owner.toString(),
      ...(task.assignedTo || []).map(u => u.toString())
    ]);
    recipients.delete(req.user._id.toString());

    for (const uid of recipients) {
      const note = await Notification.create({
        recipient: uid,
        sender: req.user._id,
        type: "comment_added",
        task: task._id,
        content: `commented on ${task.title}: "${req.body.content.substring(0, 30)}..."`
      });
      io.to(uid).emit("notification-received", { notification: note });
    }

    res.status(201).json({ comment });
  } catch (err) { next(err); }
};

// PUT /api/comments/:commentId
exports.editComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (!comment.author.equals(req.user._id)) return res.status(403).json({ message: "Not authorised" });
    comment.content = req.body.content;
    comment.edited = true;
    await comment.save();
    await comment.populate("author", "name email");
    res.json({ comment });
  } catch (err) { next(err); }
};

// DELETE /api/comments/:commentId
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (!comment.author.equals(req.user._id)) return res.status(403).json({ message: "Not authorised" });
    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (err) { next(err); }
};
