const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:      { type: String, enum: ["task_assigned", "comment_added", "task_updated"], required: true },
  task:      { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  content:   { type: String, default: "" },
  isRead:    { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
