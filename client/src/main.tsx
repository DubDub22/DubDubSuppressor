import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Chrome deprecation warning from wouter's beforeunload handler
window.addEventListener("unload", () => {});

createRoot(document.getElementById("root")!).render(<App />);
