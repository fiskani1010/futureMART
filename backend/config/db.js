const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const toBoolean = (value, fallback = false) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const toOptionalPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const readSslCaCertificate = () => {
  const inlineCa = String(process.env.DB_SSL_CA || "").trim();
  if (inlineCa) {
    return inlineCa.replace(/\\n/g, "\n");
  }

  const encodedCa = String(process.env.DB_SSL_CA_BASE64 || "").trim();
  if (encodedCa) {
    try {
      return Buffer.from(encodedCa, "base64").toString("utf8");
    } catch (error) {
      console.warn("Could not decode DB_SSL_CA_BASE64:", error.message);
    }
  }

  const caPath = String(process.env.DB_SSL_CA_PATH || "/etc/secrets/ca.pem").trim();
  if (!caPath || !fs.existsSync(caPath)) {
    return "";
  }

  try {
    return fs.readFileSync(caPath, "utf8");
  } catch (error) {
    console.warn(`Could not read DB SSL CA file at ${caPath}:`, error.message);
    return "";
  }
};

const buildSslConfig = (host) => {
  const sslRequested = toBoolean(process.env.DB_SSL, false);
  const ca = readSslCaCertificate();

  if (!sslRequested && !ca) {
    return undefined;
  }

  const ssl = {
    rejectUnauthorized: toBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  };

  if (host) {
    ssl.servername = host;
  }

  if (ca) {
    ssl.ca = ca;
  } else if (ssl.rejectUnauthorized) {
    // Without a CA certificate we cannot verify the remote cert chain.
    ssl.rejectUnauthorized = false;
    console.warn("DB SSL enabled without CA certificate. Falling back to rejectUnauthorized=false.");
  }

  return ssl;
};

const host = String(process.env.DB_HOST || "").trim();
const port = toOptionalPositiveNumber(process.env.DB_PORT);
const connectionLimit = toOptionalPositiveNumber(process.env.DB_CONNECTION_LIMIT) || 10;

const poolConfig = {
  host,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,
  connectTimeout: 20000,
};

if (port) {
  poolConfig.port = port;
}

const ssl = buildSslConfig(host);
if (ssl) {
  poolConfig.ssl = ssl;
}

const db = mysql.createPool(poolConfig);

module.exports = db;

db.getConnection((error, connection) => {
  if (error) {
    console.error("Database connection failed:", error.message || error);
    return;
  }

  console.log("Connected to MySQL");
  connection.release();
});
