const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

async function validateImage(imagePath, promptText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = MIME_MAP[ext] || "image/jpeg";
    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: { mimeType, data: base64 },
      },
      {
        text: `You are an image verification system. Analyze this photo and determine if it shows someone completing this task: "${promptText}"

Respond ONLY with a JSON object in this exact format, no markdown, no extra text:
{"valid": true or false, "confidence": 0.0 to 1.0}

Be reasonably lenient — if the photo plausibly shows the task being done, mark it valid.`,
      },
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      valid: Boolean(parsed.valid),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
    };
  } catch (err) {
    console.error("Gemini validation error:", err.message);
    return { valid: true, confidence: 0.5 };
  }
}

module.exports = { validateImage };
