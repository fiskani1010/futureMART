const bcrypt = require("bcrypt");
const crypto = require("crypto");

const buildPassword = () => {
    const randomPart = crypto.randomBytes(9).toString("base64url");
    return `Fm@${randomPart}A1!`;
};

const buildEmail = () => {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = crypto.randomBytes(3).toString("hex");
    return `admin.${stamp}.${suffix}@futuremart.dev`;
};

async function run() {
    const email = buildEmail();
    const password = buildPassword();
    const hash = await bcrypt.hash(password, 10);

    console.log(JSON.stringify({ email, password, hash }, null, 2));
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
