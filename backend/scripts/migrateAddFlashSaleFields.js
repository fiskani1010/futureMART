const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function ensureColumn(connection, columnName, columnSql) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = ?
    `,
    [process.env.DB_NAME, columnName],
  );

  if (rows[0]?.total > 0) {
    console.log(`COLUMN_EXISTS ${columnName}`);
    return;
  }

  await connection.query(`ALTER TABLE products ADD COLUMN ${columnSql}`);
  console.log(`COLUMN_ADDED ${columnName}`);
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await ensureColumn(connection, "old_price", "old_price DECIMAL(10,2) NULL AFTER price");
    await ensureColumn(connection, "is_flash_sale", "is_flash_sale TINYINT(1) NOT NULL DEFAULT 0 AFTER stock");
    console.log("MIGRATION_OK");
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error("MIGRATION_ERROR", error.message);
  process.exit(1);
});
