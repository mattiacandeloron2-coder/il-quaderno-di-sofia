import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-400-italic.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "./styles.css";
import App from "./App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Radice mancante");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
