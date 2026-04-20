/**
 * 🔒 System Vault: Error Sanitizer
 * Precludes the leakage of sensitive stack traces, field names, or paths
 * to the public internet during system failure.
 */

module.exports = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";
  const statusCode = err.statusCode || 500;

  // Log full error for internal audit
  if (isDev) {
    console.error(`[SEC-AUDIT] ${err.stack}`);
  }

  // Sanitize message to prevent data structure leakage
  let message = err.message || "Industrial system failure. Please contact administrator.";
  
  // Specific sanitization for common DB errors
  if (err.name === 'MongoServerError' && err.code === 11000) {
    message = "Resource collision detected. The requested data already exists.";
  }
  
  if (err.name === 'ValidationError') {
    message = "Data validation protocol failed. Please verify your input format.";
  }

  res.status(statusCode).json({
    status: "error",
    message,
    ...(isDev && { 
        stack: err.stack,
        vault_id: "SANDBOX_TRACE_ACTIVE" 
    }),
  });
};
