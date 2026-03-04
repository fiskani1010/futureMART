const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function countUsers(database) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
  });

  try {
    const [rows] = await connection.query("SELECT COUNT(*) AS total FROM users");
    return rows[0]?.total ?? 0;
  } finally {
    await connection.end();
  }
}

async function run() {
  const primaryDbName = process.env.DB_NAME || "ecommerce";
  const optionalDbName = process.env.ALT_DB_NAME || "";
  const dbNames = [primaryDbName, optionalDbName].filter(Boolean);

  for (const dbName of dbNames) {
    try {
      const total = await countUsers(dbName);
      console.log(`${dbName}: ${total}`);
    } catch (error) {
      console.log(`${dbName}: ERROR (${error.code || error.message})`);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
