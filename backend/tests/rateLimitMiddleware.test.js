const test = require("node:test");
const assert = require("node:assert/strict");

const { createRateLimiter } = require("../middleware/rateLimitMiddleware");

const createMockReq = ({ ip = "127.0.0.1", path = "/api/auth/login", body = {} } = {}) => ({
    ip,
    path,
    body,
    headers: {},
});

const createMockRes = () => {
    const state = {
        statusCode: 200,
        body: null,
        headers: {},
    };

    return {
        state,
        setHeader: (key, value) => {
            state.headers[key] = value;
        },
        status: (code) => {
            state.statusCode = code;
            return {
                json: (payload) => {
                    state.body = payload;
                    return payload;
                },
            };
        },
    };
};

test("createRateLimiter allows requests within configured limit", () => {
    const limiter = createRateLimiter({
        name: "test-allow",
        windowMs: 60_000,
        max: 2,
    });

    let nextCalls = 0;
    const next = () => {
        nextCalls += 1;
    };
    const req = createMockReq();

    limiter(req, createMockRes(), next);
    limiter(req, createMockRes(), next);

    assert.equal(nextCalls, 2);
});

test("createRateLimiter blocks requests above the configured limit", () => {
    const limiter = createRateLimiter({
        name: "test-block",
        windowMs: 60_000,
        max: 1,
        message: "Rate limit reached",
    });

    const next = () => {};
    const req = createMockReq({ ip: "10.0.0.3" });

    limiter(req, createMockRes(), next);
    const blockedRes = createMockRes();
    limiter(req, blockedRes, next);

    assert.equal(blockedRes.state.statusCode, 429);
    assert.deepEqual(blockedRes.state.body, { message: "Rate limit reached" });
    assert.equal(typeof blockedRes.state.headers["Retry-After"], "string");
});
