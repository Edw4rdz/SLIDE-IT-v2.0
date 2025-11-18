import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY is missing in environment variables.");
}


export const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});


export const GROK_MODEL = "grok-4";