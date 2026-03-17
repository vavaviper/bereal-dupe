const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bereal-dupe-default-rtdb.firebaseio.com",
});

const db = admin.database();

module.exports = { admin, db };
