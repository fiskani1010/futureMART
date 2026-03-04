const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const LOGIN_WINDOW_MS = Number(process.env.LOGIN_ATTEMPT_WINDOW_MS) || 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 6;
const COOKIE_MAX_AGE_MS = Number(process.env.JWT_COOKIE_MAX_AGE_MS) || 24 * 60 * 60 * 1000;
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;

const OTP_PURPOSES = {
    REGISTER: "register",
    RESET_PASSWORD: "reset_password",
};

const loginAttempts = new Map();
let ensureOtpTablePromise = null;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const query = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });

const parseOtpPayload = (payloadJson) => {
    if (!payloadJson) return {};
    try {
        const parsed = JSON.parse(payloadJson);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const maskEmail = (email) => {
    const [localPart, domain] = String(email || "").split("@");
    if (!localPart || !domain) return email;
    if (localPart.length <= 2) return `**@${domain}`;
    return `${localPart.slice(0, 2)}${"*".repeat(Math.max(2, localPart.length - 2))}@${domain}`;
};

const getOtpEmailTemplate = ({ code, purpose, recipientName = "" }) => {
    const purposeLabel =
        purpose === OTP_PURPOSES.RESET_PASSWORD ? "password reset" : "account registration";
    const heading =
        purpose === OTP_PURPOSES.RESET_PASSWORD
            ? "Reset Your FutureMart Password"
            : "Verify Your FutureMart Account";
    const previewText =
        purpose === OTP_PURPOSES.RESET_PASSWORD
            ? "Use this 6-digit code to reset your password."
            : "Use this 6-digit code to complete your registration.";

    const greetingName = recipientName ? recipientName.trim() : "there";

    return {
        subject: `FutureMart ${purposeLabel} code`,
        html: `
            <div style="font-family: Arial, sans-serif; background: #f5f7fb; padding: 20px;">
                <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e9f3; border-radius: 12px; padding: 24px;">
                    <h1 style="margin: 0 0 8px; font-size: 20px; color: #101828;">${heading}</h1>
                    <p style="margin: 0 0 16px; color: #475467; font-size: 14px;">Hi ${greetingName},</p>
                    <p style="margin: 0 0 20px; color: #475467; font-size: 14px;">${previewText}</p>
                    <div style="display: inline-block; letter-spacing: 8px; font-weight: 700; font-size: 30px; color: #db4444; background: #fff1f1; border: 1px dashed #f2b6b6; border-radius: 10px; padding: 10px 16px;">
                        ${code}
                    </div>
                    <p style="margin: 20px 0 0; color: #667085; font-size: 13px;">
                        This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not request this, ignore this email.
                    </p>
                </div>
            </div>
        `,
    };
};

const resolveEmailProvider = () => {
    const explicitProvider = String(process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
    if (explicitProvider) {
        return explicitProvider;
    }

    if (String(process.env.RESEND_API_KEY || "").trim()) {
        return "resend";
    }

    if (String(process.env.BREVO_API_KEY || "").trim()) {
        return "brevo";
    }

    return process.env.NODE_ENV === "production" ? "disabled" : "console";
};

const sendOtpEmail = async ({ to, code, purpose, recipientName }) => {
    const provider = resolveEmailProvider();
    const fromEmail = String(process.env.EMAIL_FROM || "").trim();
    const { subject, html } = getOtpEmailTemplate({ code, purpose, recipientName });

    if (provider === "console" || !provider) {
        console.log(`[OTP:${purpose}] ${to} => ${code}`);
        return;
    }

    if (provider === "disabled") {
        throw new Error("EMAIL_PROVIDER is not configured for production");
    }

    if (provider === "resend") {
        const apiKey = String(process.env.RESEND_API_KEY || "").trim();
        if (!apiKey || !fromEmail) {
            throw new Error("Email provider is configured as resend, but RESEND_API_KEY/EMAIL_FROM is missing");
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [to],
                subject,
                html,
            }),
        });

        if (!response.ok) {
            const failure = await response.text().catch(() => "");
            throw new Error(`Resend request failed: ${failure || response.statusText}`);
        }

        return;
    }

    if (provider === "brevo") {
        const apiKey = String(process.env.BREVO_API_KEY || "").trim();
        if (!apiKey || !fromEmail) {
            throw new Error("Email provider is configured as brevo, but BREVO_API_KEY/EMAIL_FROM is missing");
        }

        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sender: { email: fromEmail, name: "FutureMart" },
                to: [{ email: to }],
                subject,
                htmlContent: html,
            }),
        });

        if (!response.ok) {
            const failure = await response.text().catch(() => "");
            throw new Error(`Brevo request failed: ${failure || response.statusText}`);
        }

        return;
    }

    throw new Error("EMAIL_PROVIDER is not supported. Use console, resend, or brevo.");
};

const getPublicOtpErrorMessage = (error, fallbackMessage) => {
    const rawMessage = String(error?.message || "");
    const normalized = rawMessage.toLowerCase();

    if (
        rawMessage.includes("RESEND_API_KEY/EMAIL_FROM is missing") ||
        rawMessage.includes("BREVO_API_KEY/EMAIL_FROM is missing") ||
        rawMessage.includes("EMAIL_PROVIDER is not configured for production")
    ) {
        return "Email service is not configured. Set EMAIL_PROVIDER, EMAIL_FROM, and provider API key.";
    }

    if (rawMessage.includes("EMAIL_PROVIDER is not supported")) {
        return "EMAIL_PROVIDER is invalid. Use console, resend, or brevo.";
    }

    if (rawMessage.startsWith("Resend request failed") || rawMessage.startsWith("Brevo request failed")) {
        return "Email provider rejected the request. Verify EMAIL_FROM and API key settings.";
    }

    if (normalized.includes("fetch is not defined")) {
        return "Email sending requires Node.js 18 or newer.";
    }

    return fallbackMessage;
};

const ensureOtpTable = async () => {
    if (!ensureOtpTablePromise) {
        ensureOtpTablePromise = query(`
            CREATE TABLE IF NOT EXISTS auth_email_otps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(150) NOT NULL,
                purpose ENUM('register', 'reset_password') NOT NULL,
                code_hash VARCHAR(255) NOT NULL,
                payload_json TEXT NULL,
                attempt_count INT DEFAULT 0,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_auth_email_otps_lookup (email, purpose, used_at, expires_at)
            )
        `).catch((error) => {
            ensureOtpTablePromise = null;
            throw error;
        });
    }

    return ensureOtpTablePromise;
};

const saveOtpCode = async ({ email, purpose, code, payload = {} }) => {
    await ensureOtpTable();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await query(
        "UPDATE auth_email_otps SET used_at = NOW() WHERE email = ? AND purpose = ? AND used_at IS NULL",
        [email, purpose],
    );

    await query(
        `
            INSERT INTO auth_email_otps (email, purpose, code_hash, payload_json, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `,
        [email, purpose, codeHash, JSON.stringify(payload || {}), expiresAt],
    );
};

const getLatestOtpRecord = async ({ email, purpose }) => {
    await ensureOtpTable();
    const rows = await query(
        `
            SELECT id, code_hash, payload_json, attempt_count, expires_at
            FROM auth_email_otps
            WHERE email = ? AND purpose = ? AND used_at IS NULL
            ORDER BY id DESC
            LIMIT 1
        `,
        [email, purpose],
    );
    return rows?.[0] || null;
};

const markOtpUsed = async (otpId) => {
    await query("UPDATE auth_email_otps SET used_at = NOW() WHERE id = ?", [otpId]);
};

const registerOtpAttemptFailure = async ({ otpId, nextAttempts }) => {
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await markOtpUsed(otpId);
        return;
    }
    await query("UPDATE auth_email_otps SET attempt_count = ? WHERE id = ?", [nextAttempts, otpId]);
};

const validateOtpCode = async ({ email, purpose, code }) => {
    const record = await getLatestOtpRecord({ email, purpose });
    if (!record) {
        return { ok: false, message: "Invalid or expired verification code." };
    }

    const now = Date.now();
    const expiryTime = new Date(record.expires_at).getTime();
    if (!Number.isFinite(expiryTime) || expiryTime <= now) {
        await markOtpUsed(record.id);
        return { ok: false, message: "Verification code expired. Request a new one." };
    }

    const currentAttempts = Number(record.attempt_count) || 0;
    if (currentAttempts >= OTP_MAX_ATTEMPTS) {
        await markOtpUsed(record.id);
        return { ok: false, message: "Too many invalid attempts. Request a new code." };
    }

    const isMatch = await bcrypt.compare(String(code || ""), record.code_hash);
    if (!isMatch) {
        await registerOtpAttemptFailure({ otpId: record.id, nextAttempts: currentAttempts + 1 });
        return { ok: false, message: "Invalid verification code." };
    }

    await markOtpUsed(record.id);
    return {
        ok: true,
        payload: parseOtpPayload(record.payload_json),
    };
};

const getClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
        return forwardedFor.split(",")[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || "unknown";
};

const getAttemptKey = (req, email) => `${getClientIp(req)}:${normalizeEmail(email)}`;

const pruneAttemptStore = (now) => {
    for (const [key, entry] of loginAttempts.entries()) {
        if (entry.lockUntil <= now && now - entry.lastAttemptAt > LOGIN_WINDOW_MS) {
            loginAttempts.delete(key);
        }
    }
};

const getLoginThrottleState = (req, email) => {
    const now = Date.now();
    const key = getAttemptKey(req, email);
    const state = loginAttempts.get(key);

    pruneAttemptStore(now);

    if (!state) {
        return { key, blocked: false, retryAfterSeconds: 0 };
    }

    if (state.lockUntil > now) {
        return {
            key,
            blocked: true,
            retryAfterSeconds: Math.ceil((state.lockUntil - now) / 1000),
        };
    }

    return { key, blocked: false, retryAfterSeconds: 0 };
};

const registerFailedLoginAttempt = (key) => {
    const now = Date.now();
    const state = loginAttempts.get(key);

    if (!state || now - state.windowStart > LOGIN_WINDOW_MS) {
        loginAttempts.set(key, {
            count: 1,
            windowStart: now,
            lastAttemptAt: now,
            lockUntil: 0,
        });
        return;
    }

    const nextCount = state.count + 1;
    const shouldLock = nextCount >= LOGIN_MAX_ATTEMPTS;

    loginAttempts.set(key, {
        ...state,
        count: nextCount,
        lastAttemptAt: now,
        lockUntil: shouldLock ? now + LOGIN_WINDOW_MS : state.lockUntil,
    });
};

const clearLoginAttempts = (key) => {
    loginAttempts.delete(key);
};

const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    const configuredSameSite = String(process.env.COOKIE_SAME_SITE || "").trim().toLowerCase();
    const defaultSameSite = isProduction ? "none" : "lax";
    const sameSite =
        configuredSameSite === "strict" ||
        configuredSameSite === "none" ||
        configuredSameSite === "lax"
            ? configuredSameSite
            : defaultSameSite;
    const secureFromEnv = String(process.env.COOKIE_SECURE || "").trim().toLowerCase() === "true";
    // Browsers reject SameSite=None cookies unless Secure is also true.
    const secure = secureFromEnv || isProduction || sameSite === "none";

    const cookieOptions = {
        httpOnly: true,
        secure,
        sameSite,
        maxAge: COOKIE_MAX_AGE_MS,
        path: "/",
    };

    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    return cookieOptions;
};

const getPublicUserPayload = (user) => ({
    id: user.id,
    name: user.name || "",
    email: user.email,
    role: user.role,
});

// REGISTER USER - Step 1: request OTP code
exports.registerUser = async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    try {
        const existingRows = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        if (existingRows.length > 0) {
            return res.status(409).json({ message: "Email already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const otpCode = generateOtpCode();

        await saveOtpCode({
            email,
            purpose: OTP_PURPOSES.REGISTER,
            code: otpCode,
            payload: {
                name,
                password_hash: passwordHash,
            },
        });

        await sendOtpEmail({
            to: email,
            code: otpCode,
            purpose: OTP_PURPOSES.REGISTER,
            recipientName: name,
        });

        return res.status(200).json({
            message: `A 6-digit verification code was sent to ${maskEmail(email)}.`,
        });
    } catch (error) {
        console.error("Could not send registration code:", error.message);
        return res.status(500).json({
            message: getPublicOtpErrorMessage(error, "Could not send verification code"),
        });
    }
};

// REGISTER USER - Step 2: verify OTP and create account
exports.verifyRegistrationCode = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();

    if (!email || !code) {
        return res.status(400).json({ message: "Email and verification code are required" });
    }

    try {
        const validation = await validateOtpCode({
            email,
            purpose: OTP_PURPOSES.REGISTER,
            code,
        });

        if (!validation.ok) {
            return res.status(400).json({ message: validation.message });
        }

        const payload = validation.payload || {};
        const name = String(payload.name || "").trim();
        const passwordHash = String(payload.password_hash || "").trim();
        if (!name || !passwordHash) {
            return res.status(400).json({ message: "Verification payload is invalid. Request a new code." });
        }

        const existingRows = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        if (existingRows.length > 0) {
            return res.status(409).json({ message: "Email already exists" });
        }

        await query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, passwordHash]);
        return res.status(201).json({ message: "Account verified and created successfully" });
    } catch (error) {
        console.error("Could not verify registration code:", error.message);
        return res.status(500).json({ message: "Could not verify code right now" });
    }
};

// FORGOT PASSWORD - Step 1: request OTP code
exports.requestPasswordResetCode = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const userRows = await query("SELECT id, name FROM users WHERE email = ? LIMIT 1", [email]);
        if (userRows.length > 0) {
            const user = userRows[0];
            const otpCode = generateOtpCode();
            await saveOtpCode({
                email,
                purpose: OTP_PURPOSES.RESET_PASSWORD,
                code: otpCode,
                payload: {
                    user_id: user.id,
                },
            });

            await sendOtpEmail({
                to: email,
                code: otpCode,
                purpose: OTP_PURPOSES.RESET_PASSWORD,
                recipientName: user.name || "",
            });
        }

        return res.status(200).json({
            message: "If this email exists, a 6-digit reset code has been sent.",
        });
    } catch (error) {
        console.error("Could not send password reset code:", error.message);
        return res.status(500).json({
            message: getPublicOtpErrorMessage(error, "Could not send password reset code"),
        });
    }
};

// FORGOT PASSWORD - Step 2: verify code and set new password
exports.resetPasswordWithCode = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const newPassword = String(req.body?.new_password || "");

    if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "Email, code, and new password are required" });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    try {
        const validation = await validateOtpCode({
            email,
            purpose: OTP_PURPOSES.RESET_PASSWORD,
            code,
        });

        if (!validation.ok) {
            return res.status(400).json({ message: validation.message });
        }

        const userRows = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        if (userRows.length === 0) {
            return res.status(400).json({ message: "Account does not exist for this email" });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await query("UPDATE users SET password = ? WHERE email = ?", [passwordHash, email]);

        return res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
        console.error("Could not reset password:", error.message);
        return res.status(500).json({ message: "Could not reset password right now" });
    }
};

// LOGIN USER
exports.loginUser = (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const role = typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }

    if (role && role !== "user" && role !== "admin") {
        return res.status(400).json({ message: "Invalid role selected" });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "Server auth configuration is missing" });
    }

    const throttleState = getLoginThrottleState(req, email);
    if (throttleState.blocked) {
        res.setHeader("Retry-After", String(Math.max(throttleState.retryAfterSeconds, 1)));
        return res.status(429).json({ message: "Too many login attempts. Try again later." });
    }

    db.query("SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1", [email], async (err, rows) => {
        if (err) {
            console.error("Login query failed:", err.message);
            return res.status(500).json({ message: "Could not complete login" });
        }

        if (rows.length === 0) {
            registerFailedLoginAttempt(throttleState.key);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];

        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                registerFailedLoginAttempt(throttleState.key);
                return res.status(401).json({ message: "Invalid credentials" });
            }
        } catch (compareErr) {
            console.error("Password compare failed:", compareErr.message);
            return res.status(500).json({ message: "Could not complete login" });
        }

        if (role && user.role !== role) {
            registerFailedLoginAttempt(throttleState.key);
            return res.status(403).json({ message: "Selected role does not match this account" });
        }

        clearLoginAttempts(throttleState.key);

        const publicUser = getPublicUserPayload(user);
        const token = jwt.sign(publicUser, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d",
        });

        res.cookie("auth_token", token, getCookieOptions());

        return res.status(200).json({
            message: "Login successful",
            user: publicUser,
            token,
        });
    });
};

exports.getSessionUser = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }

    return res.status(200).json({
        user: {
            id: req.user.id,
            name: req.user.name || "",
            email: req.user.email,
            role: req.user.role,
        },
    });
};

exports.logoutUser = (req, res) => {
    const cookieOptions = getCookieOptions();
    const clearOptions = {
        path: "/",
        httpOnly: true,
        sameSite: cookieOptions.sameSite,
        secure: cookieOptions.secure,
    };

    if (cookieOptions.domain) {
        clearOptions.domain = cookieOptions.domain;
    }

    res.clearCookie("auth_token", {
        ...clearOptions,
    });

    return res.status(200).json({ message: "Logged out successfully" });
};
