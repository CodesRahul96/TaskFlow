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
