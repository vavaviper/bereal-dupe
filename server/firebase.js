const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const credPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const resolved = credPath
    ? path.isAbsolute(credPath)
      ? credPath
      : path.resolve(process.cwd(), credPath)
    : path.join(__dirname, "serviceAccountKey.json");

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Firebase service account key not found. Set FIREBASE_SERVICE_ACCOUNT env var (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH.`
    );
  }
  serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bereal-dupe-default-rtdb.firebaseio.com",
});

const db = admin.database();

module.exports = { admin, db };
