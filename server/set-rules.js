/**
 * One-time script to set Firebase RTDB security rules with indexes.
 * Run: node set-rules.js
 */
const { admin } = require("./firebase");

const rules = {
  rules: {
    events: {
      ".read": true,
      ".write": true,
    },
    prompts: {
      ".read": true,
      ".write": true,
      ".indexOn": ["event_id"],
    },
    submissions: {
      ".read": true,
      ".write": true,
      ".indexOn": ["prompt_id"],
    },
    participants: {
      ".read": true,
      ".write": true,
      ".indexOn": ["event_id"],
    },
  },
};

async function main() {
  const db = admin.database();
  const rulesRef = db.app.options.databaseURL;
  console.log("Setting rules on:", rulesRef);

  // Use the REST API via admin SDK's internal auth
  const token = await admin.app().options.credential.getAccessToken();
  const url = `${rulesRef}/.settings/rules.json?access_token=${token.access_token}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });

  if (res.ok) {
    console.log("Rules set successfully!");
  } else {
    const text = await res.text();
    console.error("Failed to set rules:", res.status, text);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
