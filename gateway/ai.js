import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-3.6-flash";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAI(task) {
  if (!task || typeof task !== "string") {
    throw new Error("AI task must be a non-empty string.");
  }

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: task,
      });

      return {
        model: MODEL,
        result: response.text,
      };
    } catch (error) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : String(error);

      const retryable =
        message.includes('"code":503') ||
        message.includes('"status":"UNAVAILABLE"') ||
        message.includes("503") ||
        message.includes("UNAVAILABLE");

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      const delay = 1000 * 2 ** (attempt - 1);

      console.log(
        `Gemini temporarily unavailable. Retry ${attempt}/${maxAttempts - 1} in ${delay}ms...`
      );

      await sleep(delay);
    }
  }
}

