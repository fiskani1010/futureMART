const jwt = require("jsonwebtoken");

const parseCookieHeader = (cookieHeader = "") => {
    return cookieHeader
        .split(";")
        .map((segment) => segment.trim())
        .filter(Boolean)
        .reduce((acc, cookiePart) => {
            const separatorIndex = cookiePart.indexOf("=");
            if (separatorIndex <= 0) return acc;

            const key = cookiePart.slice(0, separatorIndex).trim();
            const value = cookiePart.slice(separatorIndex + 1).trim();
            if (!key) return acc;

            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
};

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const cookieToken = parseCookieHeader(req.headers.cookie).auth_token || "";
    const token = bearerToken || cookieToken;

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "Server auth configuration is missing" });
    }

    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

exports.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
    }

    next();
};
