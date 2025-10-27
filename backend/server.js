import app from "./App.js"; // Import the app from App.js

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => 
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
);