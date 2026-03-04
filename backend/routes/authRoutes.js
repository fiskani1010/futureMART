const express = require("express");
const router = express.Router();
const {
    registerUser,
    requestPasswordResetCode,
    resetPasswordWithCode,
    loginUser,
    getSessionUser,
    logoutUser,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimitMiddleware");

const authLimiter = createRateLimiter({
    name: "auth-shared",
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 120,
    message: "Too many authentication requests. Please try again later.",
});

const loginLimiter = createRateLimiter({
    name: "auth-login",
    windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 40,
    keyGenerator: (req) => `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`,
    message: "Too many login requests. Please try again later.",
});

const otpLimiter = createRateLimiter({
    name: "auth-otp",
    windowMs: Number(process.env.OTP_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.OTP_RATE_LIMIT_MAX) || 30,
    keyGenerator: (req) => `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`,
    message: "Too many code requests. Please try again later.",
});

router.post("/register", authLimiter, registerUser);
// Legacy alias for older frontend builds. Registration now creates the account immediately.
router.post("/register/request-code", authLimiter, registerUser);
router.post("/password/request-code", authLimiter, otpLimiter, requestPasswordResetCode);
router.post("/password/reset", authLimiter, otpLimiter, resetPasswordWithCode);
router.post("/login", authLimiter, loginLimiter, loginUser);
router.get("/me", authenticateToken, getSessionUser);
router.post("/logout", logoutUser);

module.exports = router;
