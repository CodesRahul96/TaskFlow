const User = require("../models/User");
const Task = require("../models/Task");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const verifyRecaptcha = require("../utils/recaptcha");
const logAudit = require("../utils/audit");

/**
 * Authentication Controller
 * Handles user registration, verification, and multi-device login flows.
 * Uses a token-based magic link system for secure, passwordless authentication.
 */

/**
 * Registers a new user and initiates the email verification protocol.
 * Implements reCAPTCHA v3 integrity checks and collision detection for existing emails.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Registration data (name, email, captchaToken)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, captchaToken } = req.body;

    // Security Gate: reCAPTCHA verification
    const { success, score } = await verifyRecaptcha(captchaToken);
    if (!success) {
      return res.status(400).json({ 
        message: "Security verification failed. Please try again.",
        score 
      });
    }

    // Deterministic check for account collision
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      verificationToken,
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const message = `Welcome to taskflow, ${name}!\n\nPlease verify your email by clicking the link below:\n\n${verifyUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: `Verify your taskflow account`,
        message,
        html: `<h1>Welcome!</h1><p>Please click <a href="${verifyUrl}">here</a> to verify your account.</p>`,
      });
      
      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
      });

      await logAudit(user._id, user.name, "user_registered", null, { email: user.email });
    } catch (err) {
      // Recovery logic: Clear token if delivery fails to prevent invalid verification states
      user.verificationToken = undefined;
      await user.save();
      return res.status(500).json({ message: "Error sending verification email. Please try again later." });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Finalizes the email verification handshake.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.query.token - Cryptographic verification token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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

/**
 * Initiates the Magic Link authentication flow.
 * Generates a short-lived security token and dispatches it via the Email Gateway.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, captchaToken } = req.body;

    const { success, score } = await verifyRecaptcha(captchaToken);
    if (!success) {
      return res.status(400).json({ 
        message: "Security verification failed. Please try again.",
        score 
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Email not found." });
    if (!user.isVerified) return res.status(401).json({ message: "Please verify your email before logging in" });

    // State Management: Magic Link generation
    const loginToken = crypto.randomBytes(32).toString("hex");
    const sessionId = req.body.sessionId; 
    
    user.loginToken = loginToken;
    user.loginTokenExpires = Date.now() + 5 * 60 * 1000; // 5-minute TTL
    await user.save();

    let loginUrl = `${process.env.FRONTEND_URL}/verify-login?token=${loginToken}`;
    if (sessionId) loginUrl += `&sessionId=${sessionId}`;
    
    const message = `taskflow\n${loginUrl}\n\nThis security link expires in 5 minutes.`;

    try {
      await sendEmail({
        email: user.email,
        subject: `taskflow Login Link`,
        message,
        html: `<p>Click <a href="${loginUrl}">here</a> to log in to your dashboard. This link expires in 5 minutes.</p>`,
      });
      res.json({ message: "Login link sent to your email!" });
    } catch (err) {
      user.loginToken = undefined;
      user.loginTokenExpires = undefined;
      await user.save();
      return res.status(500).json({ message: "Error sending magic link." });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Finalizes the authentication handshake by verifying the Magic Link token.
 * Issues a JWT-backed secure HttpOnly cookie and notifies paired device nodes.
 */
exports.verifyLogin = async (req, res, next) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      loginToken: token,
      loginTokenExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired login link" });

    // Single-use token consumption
    user.loginToken = undefined;
    user.loginTokenExpires = undefined;
    await user.save();

    // Challenge redirection for MFA-enabled nodes
    if (user.mfaEnabled) {
      const mfaToken = jwt.sign({ id: user._id, type: 'mfa_challenge' }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.json({ mfaRequired: true, mfaToken });
    }

    const authToken = generateToken(user._id);

    // Secure Session Orchestration: HttpOnly cookie deployment
    res.cookie("tf_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, 
    });

    // Cross-node synchronization: Notify original requestor via Socket.IO
    const sessionId = req.query.sessionId;
    if (sessionId) {
      const io = req.app.get("io");
      io.to(`login:${sessionId}`).emit("login-success", { token: authToken, user });
    }

    res.json({ token: authToken, user, message: "Successfully logged in!" });
    await logAudit(user._id, user.name, "user_login", null, { method: "magic_link" });
  } catch (err) {
    next(err);
  }
};

/**
 * Purges the session cookie and terminates the user's interface session.
 */
exports.logout = async (req, res) => {
  res.clearCookie("tf_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Successfully logged out" });
};

/**
 * Initializes the MFA setup protocol.
 * Generates a cryptographic secret and corresponding OTPAuth QR code.
 */
exports.setupMFA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.mfaEnabled) return res.status(400).json({ message: "MFA is already enabled" });

    const secret = speakeasy.generateSecret({ name: `taskflow (${user.email})` });
    user.mfaSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    next(err);
  }
};

/**
 * Validates the initial MFA handshake and activates the user's neural shield.
 */
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
    await logAudit(user._id, user.name, "mfa_enabled", null, {});
  } catch (err) {
    next(err);
  }
};

/**
 * Validates the second factor (TOTP) during the authentication challenge sequence.
 */
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

    res.cookie("tf_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    if (sessionId) {
      const io = req.app.get("io");
      io.to(`login:${sessionId}`).emit("login-success", { token: authToken, user });
    }

    res.json({ token: authToken, user, message: "Successfully logged in!" });
  } catch (err) {
    res.status(401).json({ message: "MFA validation failed or token expired" });
  }
};

/**
 * Deactivates the Multi-Factor Authentication shield for the user node.
 */
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

/**
 * Retrieves the current authenticated operator's identity metadata.
 */
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

/**
 * Updates the user's profile metadata (name, avatar).
 */
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

