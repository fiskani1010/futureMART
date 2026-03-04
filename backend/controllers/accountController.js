const bcrypt = require("bcrypt");
const db = require("../config/db");

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

let ensureProfileTablePromise = null;

const ensureUserProfileTable = async () => {
    if (!ensureProfileTablePromise) {
        ensureProfileTablePromise = query(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INT PRIMARY KEY,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone_number VARCHAR(60),
                address_line VARCHAR(255),
                city VARCHAR(120),
                payment_method VARCHAR(80),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `).catch((error) => {
            ensureProfileTablePromise = null;
            throw error;
        });
    }

    return ensureProfileTablePromise;
};

const normalizeText = (value, max = 255) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    return normalized.slice(0, max);
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const splitName = (fullName) => {
    const parts = String(fullName || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) {
        return { first_name: "", last_name: "" };
    }

    return {
        first_name: parts[0],
        last_name: parts.slice(1).join(" "),
    };
};

const fetchUserAndProfile = async (userId) => {
    const userRows = await query(
        "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
        [userId],
    );
    if (!Array.isArray(userRows) || userRows.length === 0) {
        return null;
    }

    const profileRows = await query(
        `
            SELECT user_id, first_name, last_name, phone_number, address_line, city, payment_method, updated_at
            FROM user_profiles
            WHERE user_id = ?
            LIMIT 1
        `,
        [userId],
    );

    const user = userRows[0];
    const profile = profileRows[0];
    const fallbackName = splitName(user.name || "");

    return {
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
        },
        profile: {
            first_name: profile?.first_name || fallbackName.first_name,
            last_name: profile?.last_name || fallbackName.last_name,
            phone_number: profile?.phone_number || "",
            address_line: profile?.address_line || "",
            city: profile?.city || "",
            payment_method: profile?.payment_method || "",
            updated_at: profile?.updated_at || null,
            display_name: user.name || "",
        },
    };
};

exports.getMyProfile = async (req, res) => {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        await ensureUserProfileTable();
        const payload = await fetchUserAndProfile(userId);
        if (!payload) {
            return res.status(404).json({ message: "Account not found" });
        }

        return res.status(200).json(payload);
    } catch (error) {
        console.error("Could not load profile:", error.message);
        return res.status(500).json({ message: "Could not load profile" });
    }
};

exports.updateMyProfile = async (req, res) => {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: "Authentication required" });
    }

    const firstName = normalizeText(req.body?.first_name, 100);
    const lastName = normalizeText(req.body?.last_name, 100);
    const email = normalizeEmail(req.body?.email);
    const phoneNumber = normalizeText(req.body?.phone_number, 60);
    const addressLine = normalizeText(req.body?.address_line, 255);
    const city = normalizeText(req.body?.city, 120);
    const paymentMethod = normalizeText(req.body?.payment_method, 80);
    const currentPassword = String(req.body?.current_password || "");
    const newPassword = String(req.body?.new_password || "");

    if (!firstName) {
        return res.status(400).json({ message: "First name is required" });
    }

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Email format is invalid" });
    }

    if (newPassword && newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    if (newPassword && !currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
    }

    try {
        await ensureUserProfileTable();

        const userRows = await query(
            "SELECT id, name, email, password FROM users WHERE id = ? LIMIT 1",
            [userId],
        );
        if (!Array.isArray(userRows) || userRows.length === 0) {
            return res.status(404).json({ message: "Account not found" });
        }

        const currentUser = userRows[0];

        if (currentUser.email !== email) {
            const duplicateRows = await query(
                "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
                [email, userId],
            );
            if (Array.isArray(duplicateRows) && duplicateRows.length > 0) {
                return res.status(409).json({ message: "Email already in use" });
            }
        }

        let passwordHash = null;
        if (newPassword) {
            const isPasswordMatch = await bcrypt.compare(currentPassword, currentUser.password);
            if (!isPasswordMatch) {
                return res.status(401).json({ message: "Current password is incorrect" });
            }
            passwordHash = await bcrypt.hash(newPassword, 12);
        }

        const fullName = `${firstName} ${lastName}`.trim();

        if (passwordHash) {
            await query("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?", [
                fullName,
                email,
                passwordHash,
                userId,
            ]);
        } else {
            await query("UPDATE users SET name = ?, email = ? WHERE id = ?", [fullName, email, userId]);
        }

        await query(
            `
                INSERT INTO user_profiles (
                    user_id,
                    first_name,
                    last_name,
                    phone_number,
                    address_line,
                    city,
                    payment_method
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    phone_number = VALUES(phone_number),
                    address_line = VALUES(address_line),
                    city = VALUES(city),
                    payment_method = VALUES(payment_method),
                    updated_at = CURRENT_TIMESTAMP
            `,
            [userId, firstName, lastName, phoneNumber, addressLine, city, paymentMethod],
        );

        const payload = await fetchUserAndProfile(userId);
        return res.status(200).json({
            message: "Profile updated successfully",
            ...payload,
        });
    } catch (error) {
        console.error("Could not update profile:", error.message);
        return res.status(500).json({ message: "Could not update profile" });
    }
};
