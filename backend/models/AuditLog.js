const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  userName:  { type: String },
  action:    { type: String, required: true },
  task:      { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  details:   { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 90 * 24 * 60 * 60 }, // TTL 90 days
});

auditSchema.index({ user: 1, createdAt: -1 });
auditSchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditSchema);
