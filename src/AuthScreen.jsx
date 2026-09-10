import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const COLORS = {
  bg: "#0F111A", card: "#181B28", ink: "#F3F4F6", inkSoft: "#9CA3AF",
  primary: "#6366F1", primarySoft: "rgba(99,102,241,0.18)",
  accent: "#818CF8", line: "#2A2E3D", low: "#F87171", gold: "#F59E0B",
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
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: 28, background: "linear-gradient(180deg, #0F111A 0%, #161926 100%)", boxSizing: "border-box", position: "relative", overflow: "hidden", color: COLORS.ink }}>
      <div style={{ position: "absolute", top: -80, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0) 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0) 70%)", pointerEvents: "none" }} />

      <div style={{ flex: 1 }} />

      <div style={{ backdropFilter: "blur(20px)", background: "rgba(24, 27, 40, 0.75)", border: `1px solid ${COLORS.line}`, borderRadius: 32, padding: "32px 24px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
          <Logo size={72} />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", color: COLORS.ink, textAlign: "center", letterSpacing: "-0.5px" }}>Fluent AI</h1>
        <p style={{ color: COLORS.inkSoft, fontSize: 15, margin: "0 0 28px", lineHeight: 1.5, textAlign: "center" }}>
          Master modern dating conversation with your personalized AI coach.
        </p>

        {error && <p style={{ color: COLORS.low, fontSize: 13, marginBottom: 16, textAlign: "center", background: "rgba(248,113,113,0.1)", padding: "10px 14px", borderRadius: 14 }}>{error}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={handleGoogle} disabled={loading} style={{
            width: "100%", padding: "16px", borderRadius: 20, border: `1px solid ${COLORS.line}`, background: "#FFFFFF",
            color: "#111827", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.15s ease"
          }}>
            <GoogleIcon />
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <button onClick={onGuestLogin} style={{
            width: "100%", padding: "16px", borderRadius: 20, border: "none", background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            color: "#FFFFFF", fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 20px -4px rgba(99,102,241,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.15s ease"
          }}>
            ⚡ Continue as Guest
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: COLORS.inkSoft, textAlign: "center", marginTop: 24 }}>
        Private & secure · Free practice environment
      </p>
      <div style={{ flex: 1.2 }} />
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
