const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  avatar:   { type: String, default: "" },
  friends:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  loginToken: { type: String },
  loginTokenExpires: { type: Date },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, select: false },
  googleId: { type: String, sparse: true, unique: true },
  tokenVersion: { type: Number, default: 0 },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual("hasPassword").get(function () {
  return !!this.password;
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.mfaSecret;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
