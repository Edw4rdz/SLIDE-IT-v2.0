import { oauth2Client, scopes } from "../config/googleAuth.js";

export const generateAuthUrl = () => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
    });
    return url;
  } catch (err) {
    console.error("❌ Failed to generate Google Auth URL:", err);
    throw new Error("Failed to generate auth URL.");
  }
};

export const getTokensFromCode = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("✅ Tokens received:", tokens);
    oauth2Client.setCredentials(tokens);
    return tokens;
  } catch (err) {
    console.error("❌ Google Auth failed:", err.response?.data || err.message || err);
    throw new Error("Authentication failed: " + err.message);
  }
};