import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// --- TEMPORARY DEBUG OVERLAY ---
// This catches any error that happens anywhere in the app and shows it
// directly on the screen as text, so it can be screenshotted.
// Safe to remove once the sign-in bug is found and fixed.
window.onerror = function (msg, url, line, col, error) {
  document.body.innerHTML =
    '<div style="padding:20px;font-family:monospace;font-size:14px;background:#fff;color:#c00;white-space:pre-wrap;">' +
    "ERROR: " + msg + "\nLine: " + line + "\n" + (error?.stack || "") +
    "</div>" + document.body.innerHTML;
};
window.addEventListener("unhandledrejection", function (e) {
  document.body.innerHTML =
    '<div style="padding:20px;font-family:monospace;font-size:14px;background:#fff;color:#c00;white-space:pre-wrap;">' +
    "PROMISE ERROR: " + (e.reason?.message || e.reason) + "\n" + (e.reason?.stack || "") +
    "</div>" + document.body.innerHTML;
});
// --- END DEBUG OVERLAY ---

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
