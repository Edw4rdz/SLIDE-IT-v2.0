import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const xaiKey = process.env.GROK_IMAGE_API_KEY || process.env.XAI_API_KEY;
if (!xaiKey) {
  throw new Error("Missing xAI API key: set GROK_IMAGE_API_KEY or XAI_API_KEY.");
}

export const grokClient = new OpenAI({
  apiKey: xaiKey,
  baseURL: "https://api.x.ai/v1",
});

export const GROK_MODEL = "grok-4";
// Prefer env override; default to the currently-deployed Grok image model
export const GROK_IMAGE_MODEL = process.env.GROK_IMAGE_MODEL || "grok-2-image";