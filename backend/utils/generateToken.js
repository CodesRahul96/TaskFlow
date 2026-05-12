const jwt = require("jsonwebtoken");

module.exports = function generateToken(id, tokenVersion = 0) {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};
