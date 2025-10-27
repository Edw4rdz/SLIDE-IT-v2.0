import { generateAuthUrl, getTokensFromCode } from "../services/googleAuthService.js";

export const redirectToGoogleAuth = (req, res) => {
  try {
    const url = generateAuthUrl();
    console.log("➡️ Redirecting user to:", url);
    res.redirect(url);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

export const handleGoogleCallback = async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  try {
    const tokens = await getTokensFromCode(code);
    req.session.tokens = tokens;
    console.log("✅ Google tokens stored in session");
    res.redirect("http://localhost:3000/uploadTemplate");
  } catch (err) {
    res.status(500).send(err.message);
  }
};

export const logout = (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out from Google" });
  });
};

export const getAuthStatus = (req, res) => {
  res.json({ loggedIn: !!req.session.tokens });
};