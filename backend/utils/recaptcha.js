/**
 * Verifies a reCAPTCHA v3 token with Google's API.
 * @param {string} token - The token received from the frontend.
 * @returns {Promise<{success: boolean, score: number}>}
 */
const verifyRecaptcha = async (token) => {
  if (!token) return { success: false, score: 0 };
  
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.warn("RECAPTCHA_SECRET_KEY is not defined in environment variables.");
      // In development, if no key is provided, we might want to bypass or allow.
      // For now, let's treat it as a failure to ensure security.
      return { success: false, score: 0 };
    }

    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
      method: "POST",
    });

    const data = await response.json();

    // Development Bypass: If in development, we allow it to pass even if Google rejects it (e.g. domain mismatch)
    if (!data.success && process.env.NODE_ENV === "development") {
      console.warn("reCAPTCHA check failed, but bypassing because NODE_ENV is 'development'.");
      return { success: true, score: 1.0, isBypass: true };
    }

    if (!data.success) {
      console.error("reCAPTCHA Verification Failed:", data["error-codes"]);
    }

    return {
      success: data.success && data.score >= 0.5,
      score: data.score || 0,
      errors: data["error-codes"],
    };
  } catch (err) {
    console.error("error during reCAPTCHA verification:", err);
    return { success: false, score: 0 };
  }
};

module.exports = verifyRecaptcha;
