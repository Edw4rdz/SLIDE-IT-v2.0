// Dummy login
export const login = (req, res) => {
  res.json({ success: true, message: "Dummy login successful" });
};

// Dummy register
export const register = (req, res) => {
  res.json({ success: true, message: "Dummy register successful" });
};