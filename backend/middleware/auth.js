const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.tf_token) {
    token = req.cookies.tf_token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorised, no token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("+password");
    if (!req.user) return res.status(401).json({ message: "User not found" });

    // Verify token version for session revocation
    const tokenVersion = decoded.tokenVersion || 0;
    if (tokenVersion !== req.user.tokenVersion) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    next();
  } catch {
    res.status(401).json({ message: "Token invalid or expired" });
  }
};
