const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT) || 10;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,

  ssl: {
    ca: fs.readFileSync("/etc/secrets/ca.pem", "utf8"),
    rejectUnauthorized: true,
    servername: process.env.DB_HOST,
  },

  connectTimeout: 20000,
});

module.exports = db;