const { validationResult } = require("express-validator");

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    return res.status(400).json({ 
      success: false,
      message: errorArray[0].msg, 
      errors: errorArray.map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

