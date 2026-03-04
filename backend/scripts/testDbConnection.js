const path = require("path");
const mysql = require("mysql2");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connection.connect((error) => {
  if (error) {
    console.error("DB_CONNECTION_FAILED:", error.message);
    process.exit(1);
  }

  console.log("DB_CONNECTION_OK");
  connection.end();
  process.exit(0);
});
