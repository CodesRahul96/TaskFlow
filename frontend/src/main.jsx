import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { ThemeProvider } from "./context/ThemeProvider.jsx";
import { GoogleOAuthProvider } from '@react-oauth/google';

console.log(
  "%c🚀 TaskFlow | Engineered by CodesRahul",
  "color: #6366f1; font-weight: bold; font-size: 14px; background: #0f0f1a; padding: 4px 8px; border-radius: 4px;"
);
console.log("%cSystem integrity verified. Multi-node sync active.", "color: #a3a3a3; font-style: italic;");

// Use import.meta.env or a placeholder if missing during build
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
