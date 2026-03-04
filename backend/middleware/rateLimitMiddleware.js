const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;

const stores = new Map();

const pruneEntries = (store, now) => {
    for (const [key, entry] of store.entries()) {
        if (entry.windowStart + entry.windowMs <= now) {
            store.delete(key);
        }
    }
};

const getClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
        return forwardedFor.split(",")[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || "unknown";
};

exports.createRateLimiter = ({
    name = "default",
    windowMs = DEFAULT_WINDOW_MS,
    max = DEFAULT_MAX_REQUESTS,
    message = "Too many requests. Please try again later.",
    keyGenerator,
} = {}) => {
    const storeName = String(name || "default");

    if (!stores.has(storeName)) {
        stores.set(storeName, new Map());
    }

    const store = stores.get(storeName);

    return (req, res, next) => {
        const now = Date.now();
        pruneEntries(store, now);

        const derivedKey = keyGenerator ? keyGenerator(req) : null;
        const rateLimitKey =
            String(derivedKey || `${getClientIp(req)}:${req.path || "path"}`).toLowerCase();

        const current = store.get(rateLimitKey);
        if (!current || current.windowStart + windowMs <= now) {
            store.set(rateLimitKey, {
                count: 1,
                windowStart: now,
                windowMs,
            });
            return next();
        }

        current.count += 1;
        if (current.count <= max) {
            store.set(rateLimitKey, current);
            return next();
        }

        const retryAfterSeconds = Math.ceil((current.windowStart + windowMs - now) / 1000);
        res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
        return res.status(429).json({ message });
    };
};
