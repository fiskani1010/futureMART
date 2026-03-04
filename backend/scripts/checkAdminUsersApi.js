const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function run() {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.");
    return;
  }

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      role: "admin",
    }),
  });

  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok || !loginData.token) {
    console.log("LOGIN_FAILED", loginRes.status, loginData);
    return;
  }

  const usersRes = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });

  const usersData = await usersRes.json().catch(() => ({}));
  if (!usersRes.ok) {
    console.log("USERS_API_FAILED", usersRes.status, usersData);
    return;
  }

  console.log("USERS_API_OK", Array.isArray(usersData) ? usersData.length : "non-array");
}

run().catch((error) => {
  console.error("SCRIPT_ERROR", error.message);
  process.exit(1);
});
