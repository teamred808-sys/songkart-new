import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global safeguard to prevent browser permission popups on initial load
if (typeof navigator !== 'undefined' && navigator.share) {
  navigator.share = () => Promise.reject(new Error("Share disabled"));
}

createRoot(document.getElementById("root")!).render(<App />);
