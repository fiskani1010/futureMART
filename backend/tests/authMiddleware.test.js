const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const { authenticateToken } = require("../middleware/authMiddleware");

const createMockRes = () => {
    const state = {
        statusCode: 200,
        body: null,
    };

    return {
        state,
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

test("authenticateToken accepts valid bearer token", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = jwt.sign({ id: 1, email: "admin@example.com", role: "admin" }, process.env.JWT_SECRET);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();

    let nextCalled = false;
    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.email, "admin@example.com");
});

test("authenticateToken accepts valid cookie token", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = jwt.sign({ id: 9, email: "user@example.com", role: "user" }, process.env.JWT_SECRET);

    const req = { headers: { cookie: `auth_token=${encodeURIComponent(token)}` } };
    const res = createMockRes();

    let nextCalled = false;
    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 9);
});

test("authenticateToken rejects when token is missing", () => {
    process.env.JWT_SECRET = "test-secret";
    const req = { headers: {} };
    const res = createMockRes();

    authenticateToken(req, res, () => {});

    assert.equal(res.state.statusCode, 401);
    assert.deepEqual(res.state.body, { message: "Authentication required" });
});
