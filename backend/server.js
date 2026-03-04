const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = require("./config/db");

const app = express();
app.set("trust proxy", 1);

const normalizeOrigin = (value) => {
    const sanitized = String(value || "")
        .trim()
        .replace(/^['"]|['"]$/g, "");
    if (!sanitized) return "";

    try {
        return new URL(sanitized).origin.toLowerCase();
    } catch {
        return sanitized.replace(/\/+$/, "").toLowerCase();
    }
};

const allowedCorsOrigins = Array.from(
    new Set(
        String(process.env.CORS_ORIGIN || "")
            .split(",")
            .map((origin) => normalizeOrigin(origin))
            .filter(Boolean),
    ),
);
const allowAnyOrigin = allowedCorsOrigins.length === 0;

if (process.env.NODE_ENV === "production" && allowAnyOrigin) {
    console.warn("CORS_ORIGIN is empty in production. This allows any origin and is not recommended.");
}

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (allowAnyOrigin || allowedCorsOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
});

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
    res.json({ message: "Ecommerce API running successfully" });
});

app.get("/api/health", (req, res) => {
    db.query("SELECT 1 AS ok", (error) => {
        if (error) {
            return res.status(500).json({ status: "error", message: "Database connection failed" });
        }

        return res.status(200).json({
            status: "ok",
            service: "futuremart-api",
            timestamp: new Date().toISOString(),
        });
    });
});

// authentication routing
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// account routes
const accountRoutes = require("./routes/accountRoutes");
app.use("/api/account", accountRoutes);

// order routes
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// product route
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

// hero slide routes
const heroSlideRoutes = require("./routes/heroSlideRoutes");
app.use("/api/hero-slides", heroSlideRoutes);

// team member routes
const teamRoutes = require("./routes/teamRoutes");
app.use("/api/team-members", teamRoutes);

// new arrival routes
const newArrivalRoutes = require("./routes/newArrivalRoutes");
app.use("/api/new-arrivals", newArrivalRoutes);

// admin routes
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
    if (err?.message === "CORS origin not allowed") {
        return res.status(403).json({ message: "Request origin is not allowed" });
    }

    console.error("Unhandled server error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 5000;
if (require.main === module) {
    db.query("SELECT 1", (error) => {
        if (error) {
            console.error("Database healthcheck failed:", error.message);
        }
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
