const User = require("../models/User");
const Task = require("../models/Task");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

/**
 * AUTHENTICATION IMPLEMENTATION STEPS (Email + Magic Link):
 * 
 * 1. Register: Create user with `isVerified: false`. Generate `verificationToken` (hex).
 *    - User is NOT allowed to login until email is verified.
 * 2. Verify Email: Match `verificationToken` from query string. Set `isVerified: true`.
 * 3. Login: Verify email/pass. If OK, generate `loginToken` (Magic Link).
 *    - Magic Link expires in 10 minutes for security.
 * 4. Verify Login: Match `loginToken`. Generate JWT (long-lived session) and Return User.
 */

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    // 1. Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 2. Create user (isVerified defaults to false)
    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
    });

    // 3. Send verification email
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const message = `Welcome to TaskFlow, ${name}!\n\nPlease verify your email by clicking the link below:\n\n${verifyUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Verify your TaskFlow account",
        message,
        html: `<h1>Welcome!</h1><p>Please click <a href="${verifyUrl}">here</a> to verify your account.</p>`,
      });
      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
      });
    } catch (err) {
      // If email fails, we might want to delete the user or just inform them
      user.verificationToken = undefined;
      await user.save();
      return res.status(500).json({ message: "Error sending verification email. Please try again later." });
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/verify-email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification link or your email is already verified." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before logging in" });
    }

    // Generate login token (Magic Link)
    const loginToken = crypto.randomBytes(32).toString("hex");
    user.loginToken = loginToken;
    user.loginTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const loginUrl = `${process.env.FRONTEND_URL}/verify-login?token=${loginToken}`;
    const message = `Click the link below to log in to TaskFlow:\n\n${loginUrl}\n\nThis link expires in 10 minutes.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "TaskFlow Login Link",
        message,
        html: `<p>Click <a href="${loginUrl}">here</a> to log in to your dashboard. This link expires in 10 minutes.</p>`,
      });
      res.json({ message: "Login link sent to your email!" });
    } catch (err) {
      user.loginToken = undefined;
      user.loginTokenExpires = undefined;
      await user.save();
      return res.status(500).json({ message: "Error sending magic link. Please try again later." });
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/verify-login
exports.verifyLogin = async (req, res, next) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      loginToken: token,
      loginTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired login link" });
    }

    // Clear tokens
    user.loginToken = undefined;
    user.loginTokenExpires = undefined;
    await user.save();

    res.json({
      token: generateToken(user._id),
      user,
      message: "Successfully logged in!",
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true, runValidators: true },
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword)))
      return res.status(400).json({ message: "Current password incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
};
