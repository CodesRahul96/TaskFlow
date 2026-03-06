const AuditLog = require("../models/AuditLog");

module.exports = async function logAudit(userId, userName, action, taskId, details = {}) {
  try {
    await AuditLog.create({ user: userId, userName, action, task: taskId, details });
  } catch (e) {
    // Non-critical – never crash the request
  }
};
