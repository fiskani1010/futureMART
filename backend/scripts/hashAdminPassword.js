const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function run() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("Set ADMIN_PASSWORD in your environment before running this script.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  console.log(hash);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
