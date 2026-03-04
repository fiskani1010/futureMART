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

  const onePixelPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wm7x5kAAAAASUVORK5CYII=";
  const pngBytes = Buffer.from(onePixelPngBase64, "base64");

  const form = new FormData();
  form.append("image", new Blob([pngBytes], { type: "image/png" }), "pixel.png");

  const uploadRes = await fetch(`${baseUrl}/api/admin/upload-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginData.token}`,
    },
    body: form,
  });

  const uploadData = await uploadRes.json().catch(() => ({}));
  console.log("UPLOAD_STATUS", uploadRes.status);
  console.log("UPLOAD_URL", uploadData.url || null);
  console.log("UPLOAD_ABSOLUTE_URL", uploadData.absolute_url || null);
}

run().catch((error) => {
  console.error("SCRIPT_ERROR", error.message);
  process.exit(1);
});
