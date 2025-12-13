import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const xaiKey = process.env.XAI_API_KEY;
if (!xaiKey) {
  throw new Error("Missing xAI API key: Please set XAI_API_KEY in your .env file.");
}

export const grokClient = new OpenAI({
  apiKey: xaiKey,
  baseURL: "https://api.x.ai/v1",
});

export const GROK_MODEL = "grok-4";
