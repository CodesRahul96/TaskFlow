import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { ThemeProvider } from "./context/ThemeProvider.jsx";

console.log(
  "%c🚀 TaskFlow v2.4.1 | Engineered by Vaishnavi",
  "color: #6366f1; font-weight: bold; font-size: 14px; background: #0f0f1a; padding: 4px 8px; border-radius: 4px;"
);
console.log("%cSystem integrity verified. Multi-node sync active.", "color: #a3a3a3; font-style: italic;");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
