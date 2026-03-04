const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT) || 10;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT), // add port
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,

    // 🔐 REQUIRED for Aiven
    ssl: {
        ca: fs.readFileSync("/etc/secrets/aiven-ca.pem")
    }
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }

    console.log(`Connected to MySQL database (pool size: ${connectionLimit})`);
    connection.release();
});

module.exports = db;