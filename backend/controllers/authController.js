const User = require("../models/User");
const Task = require("../models/Task");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

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
    const { name, email } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    // 1. Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 2. Create user (isVerified defaults to false)
    const user = await User.create({
      name,
      email,
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
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Email not found. Please register first." });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before logging in" });
    }

    // Generate login token (Magic Link)
    const loginToken = crypto.randomBytes(32).toString("hex");
    const sessionId = req.body.sessionId; // Get sessionId from frontend
    user.loginToken = loginToken;
    user.loginTokenExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    let loginUrl = `${process.env.FRONTEND_URL}/verify-login?token=${loginToken}`;
    if (sessionId) loginUrl += `&sessionId=${sessionId}`;
    
    const message = `Click the link below to log in to TaskFlow:\n\n${loginUrl}\n\nThis link expires in 5 minutes.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "TaskFlow Login Link",
        message,
        html: `<p>Click <a href="${loginUrl}">here</a> to log in to your dashboard. This link expires in 5 minutes.</p>`,
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

    user.loginToken = undefined;
    user.loginTokenExpires = undefined;
    await user.save();

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // Return a temporary token for the MFA challenge
      const mfaToken = jwt.sign({ id: user._id, type: 'mfa_challenge' }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.json({
        mfaRequired: true,
        mfaToken,
        message: "MFA code required",
      });
    }

    const authToken = generateToken(user._id);

    // Set HttpOnly Cookie
    res.cookie("tf_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // If sessionId exists, notify the original device via Socket.IO
    const sessionId = req.query.sessionId;
    if (sessionId) {
      const io = req.app.get("io");
      io.to(`login:${sessionId}`).emit("login-success", {
        token: authToken,
        user,
      });
    }

    res.json({
      token: authToken, // Balanced: still return for backward compatibility but encourage cookie usage
      user,
      message: "Successfully logged in!",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.clearCookie("tf_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Successfully logged out" });
};

// --- MFA FLOW ---

// GET /api/auth/mfa/setup
exports.setupMFA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.mfaEnabled) return res.status(400).json({ message: "MFA is already enabled" });

    const secret = speakeasy.generateSecret({ name: `TaskFlow (${user.email})` });
    user.mfaSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/mfa/verify
exports.verifyMFASetup = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select("+mfaSecret");

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token,
    });

    if (!verified) return res.status(400).json({ message: "Invalid MFA token" });

    user.mfaEnabled = true;
    await user.save();

    res.json({ message: "MFA enabled successfully" });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/mfa/validate (Login Challenge)
exports.validateMFA = async (req, res, next) => {
  try {
    const { mfaToken, code, sessionId } = req.body;
    const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
    if (decoded.type !== 'mfa_challenge') throw new Error("Invalid token type");

    const user = await User.findById(decoded.id).select("+mfaSecret");
    if (!user) return res.status(404).json({ message: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token: code,
    });

    if (!verified) return res.status(400).json({ message: "Invalid MFA code" });

    const authToken = generateToken(user._id);

    // Set HttpOnly Cookie
    res.cookie("tf_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Notify other device if sessionId exists
    if (sessionId) {
      const io = req.app.get("io");
      io.to(`login:${sessionId}`).emit("login-success", {
        token: authToken,
        user,
      });
    }

    res.json({ token: authToken, user, message: "Successfully logged in!" });
  } catch (err) {
    res.status(401).json({ message: "MFA validation failed or token expired" });
  }
};

// POST /api/auth/mfa/disable
exports.disableMFA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save();
    res.json({ message: "MFA disabled" });
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

