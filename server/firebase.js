const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

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

const STORAGE_PREFIX = "images/user_uploads";
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "bereal-dupe.firebasestorage.app";
const bucket = admin.storage().bucket(bucketName);

/**
 * Upload a local file to Firebase Storage at images/user_uploads/{eventId}/{uuid}.{ext}.
 * @returns {Promise<string|null>} Firebase download URL or null on failure
 */
async function uploadToUserUploads(localFilePath, eventId, ext) {
  const extension = ext || path.extname(localFilePath).slice(1) || "jpg";
  const destPath = `${STORAGE_PREFIX}/${eventId}/${uuidv4()}.${extension}`;
  const downloadToken = uuidv4();

  try {
    await bucket.upload(localFilePath, {
      destination: destPath,
      metadata: {
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });
    const encodedPath = encodeURIComponent(destPath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
  } catch (err) {
    console.warn("Firebase Storage upload failed:", err.message);
    return null;
  }
}

module.exports = { admin, db, uploadToUserUploads };
