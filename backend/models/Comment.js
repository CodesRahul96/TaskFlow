const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  task:    { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
  author:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  edited:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Comment", commentSchema);
