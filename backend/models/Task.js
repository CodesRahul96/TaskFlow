const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  completed:   { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  completedAt: { type: Date },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

const timeBlockSchema = new mongoose.Schema({
  title:     { type: String, trim: true },
  startTime: { type: Date, required: true },
  endTime:   { type: Date, required: true },
  color:     { type: String, default: "#6366f1" },
  notes:     { type: String, default: "" },
}, { timestamps: true });

timeBlockSchema.pre("validate", function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error("endTime must be after startTime"));
  }
  next();
});

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: "", maxlength: 2000 },
  status:      { type: String, enum: ["todo","in-progress","completed","cancelled"], default: "todo" },
  priority:    { type: String, enum: ["low","medium","high","urgent"], default: "medium" },
  deadline:    { type: Date },
  tags:        [{ type: String, trim: true }],
  color:       { type: String, default: "#6366f1" },
  order:       { type: Number, default: 0 },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assignedTo:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  subtasks:    [subtaskSchema],
  timeBlocks:  [timeBlockSchema],
  guestId:     { type: String, index: true },
}, { timestamps: true });

taskSchema.index({ owner: 1, status: 1 });
taskSchema.index({ owner: 1, priority: 1 });
taskSchema.index({ owner: 1, deadline: 1 });

module.exports = mongoose.model("Task", taskSchema);
