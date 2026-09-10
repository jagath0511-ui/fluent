import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const COLORS = {
  bg: "#F7F8FC", card: "#FFFFFF", ink: "#1E1B2E", inkSoft: "#8C8AA0",
  primary: "#4C5FD9", line: "#E5E7F0", low: "#E8536B", gold: "#D9A441",
};

export default function AuthScreen({ onGuestLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      if (!auth) throw new Error("Firebase Auth is not configured");
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign-in error:", err);
      setError(`Google sign-in issue: ${err.code || err.message || "please try again."}`);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: 24, background: COLORS.bg, boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, left: -60, width: 260, height: 260, borderRadius: "50%", background: COLORS.primary, opacity: 0.08, filter: "blur(80px)" }} />
      <div style={{ flex: 1 }} />
      <div style={{ marginBottom: 20 }}>
        <Logo size={64} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", color: COLORS.ink, fontFamily: "Manrope, Inter, sans-serif" }}>fluent</h1>
      <p style={{ color: COLORS.inkSoft, fontSize: 14.5, margin: "0 0 36px", lineHeight: 1.5 }}>
        Practice the conversation before it matters.
      </p>

      {error && <p style={{ color: COLORS.low, fontSize: 13, marginBottom: 14 }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={handleGoogle} disabled={loading} style={{
          width: "100%", padding: "15px", borderRadius: 999, border: `1px solid ${COLORS.line}`, background: "#fff",
          color: "#1a1a1a", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1,
          boxShadow: "0 2px 12px rgba(30,27,46,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <GoogleIcon />
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        <button onClick={onGuestLogin} style={{
          width: "100%", padding: "15px", borderRadius: 999, border: `1px solid ${COLORS.line}`, background: COLORS.primarySoft,
          color: COLORS.primary, fontSize: 15, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          Continue as Guest
        </button>
      </div>

      <p style={{ fontSize: 11.5, color: COLORS.inkSoft, textAlign: "center", marginTop: 16 }}>
        Apple Sign-In is ready to turn on once you have an Apple Developer account.
      </p>

      <p style={{ fontSize: 11, color: COLORS.inkSoft, textAlign: "center", marginTop: 28 }}>
        This is a practice tool only — for building real-world communication confidence.
      </p>
      <div style={{ flex: 2 }} />
    </div>
  );
}

export function Logo({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5A6BE0" />
          <stop offset="100%" stopColor="#4C5FD9" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="44" fill="url(#logoBg)" />
      <path
        d="M55 145 C 55 145, 75 145, 90 120 C 105 95, 95 85, 110 80 C 125 75, 135 90, 145 65"
        fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round"
      />
      <circle cx="55" cy="145" r="14" fill="#FFFFFF" />
      <circle cx="145" cy="65" r="14" fill="#D9A441" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.16.27-1.7V4.97H.94A9 9 0 000 9c0 1.45.35 2.83.94 4.03l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
