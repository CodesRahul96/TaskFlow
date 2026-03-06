const AuditLog = require("../models/AuditLog");

// GET /api/audit/user/me
exports.getUserAudit = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const logs = await AuditLog.find({ user: req.user._id })
      .sort("-createdAt")
      .limit(limit)
      .populate("task", "title");
    res.json({ logs });
  } catch (err) { next(err); }
};

// GET /api/audit/:taskId
exports.getTaskAudit = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ task: req.params.taskId })
      .sort("-createdAt")
      .limit(100)
      .populate("task", "title");
    res.json({ logs });
  } catch (err) { next(err); }
};
