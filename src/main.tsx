import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupQzSecurity } from "@/lib/qz";

/* Register QZ security handlers once — before React renders. */
setupQzSecurity();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);