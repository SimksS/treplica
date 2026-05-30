import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { App } from "./App";
import { StealthOverlay } from "../features/stealth/StealthOverlay";
import { lockdownWebView } from "../lib/lockdown";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "../styles/global.css";
import "../styles/stealth-overlay.css";

lockdownWebView();

const isStealth = getCurrentWebviewWindow().label === "stealth";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isStealth ? <StealthOverlay /> : <App />}
  </React.StrictMode>,
);
