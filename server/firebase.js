const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const credPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS;
const resolved = credPath
  ? path.isAbsolute(credPath)
    ? credPath
    : path.resolve(process.cwd(), credPath)
  : path.join(__dirname, "bereal-dupe-firebase-adminsdk-fbsvc-d134b29a7e.json");

if (!fs.existsSync(resolved)) {
  throw new Error(`Firebase service account key not found at ${resolved}. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env`);
}

const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bereal-dupe-default-rtdb.firebaseio.com",
});

const db = admin.database();

module.exports = { admin, db };
