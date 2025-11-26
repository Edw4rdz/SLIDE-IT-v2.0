import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";



const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // Temporarily disabled StrictMode to reduce Firebase reads during development
  // StrictMode causes double-rendering which doubles API calls
  // Re-enable for production: <React.StrictMode><App /></React.StrictMode>
  <App />
);
