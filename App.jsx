import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  Flame, Send, ChevronRight, Lock, MessageCircle, Mic, MicOff,
  User, Home as HomeIcon, TrendingUp, Trophy, LogOut, ArrowLeft, X,
  Coffee, Sparkles, Sunrise, Check, ThumbsUp, ThumbsDown, Crown, Zap
} from "lucide-react";

// ---------- Design tokens ----------
// Dark, minimal, premium — Apple x Linear x Headspace x Tinder direction.
const COLORS = {
  bg: "#0A0A0B", surface: "#131416", card: "#1B1D21",
  ink: "#FFFFFF", inkSoft: "#A3A3A3", line: "#2A2A2A",
  primary: "#7C5CFF", primarySoft: "rgba(124,92,255,0.16)",
  accent: "#FF4D8D", accentSoft: "rgba(255,77,141,0.16)",
  good: "#3DDC97", goodSoft: "rgba(61,220,151,0.16)",
  mid: "#FFC857", midSoft: "rgba(255,200,87,0.16)",
  low: "#FF4D8D", lowSoft: "rgba(255,77,141,0.16)",
  gold: "#FFC857",
};
const GRADIENT = "linear-gradient(135deg, #7C5CFF 0%, #B54CFF 100%)";
const GRADIENT_PINK = "linear-gradient(135deg, #7C5CFF 0%, #FF4D8D 100%)";
const glass = (opacity = 0.05) => ({
  background: `rgba(255,255,255,${opacity})`,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: `1px solid ${COLORS.line}`,
});

function GlobalStyle() {
  return (
    <style>{`
      @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-5px); opacity: 1; } }
      @keyframes softPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,77,141,0.4); } 50% { box-shadow: 0 0 0 8px rgba(255,77,141,0); } }
      @keyframes floatBlob { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(10px,-14px) scale(1.05); } }
      * { box-sizing: border-box; }
      body, input, textarea, button { font-family: Inter, -apple-system, sans-serif; }
      input::placeholder { color: #6b6b70; }
      ::-webkit-scrollbar { width: 0px; height: 0px; }
    `}</style>
  );
}

const SCENARIOS = [
  { id: "coffee", name: "Coffee Date", tag: "Low stakes", desc: "Casual, short, easy small talk.", icon: Coffee, emoji: "☕", xp: 10, pro: false },
  { id: "online", name: "Online Chat", tag: "Warm-up", desc: "Early messaging before you've even met.", icon: MessageCircle, emoji: "💬", xp: 10, pro: false },
  { id: "first", name: "First Date", tag: "Medium stakes", desc: "Getting to know each other, a bit more vulnerable.", icon: Sunrise, emoji: "🌅", xp: 20, pro: true },
  { id: "dinner", name: "Dinner Date", tag: "Higher stakes", desc: "Slower pace, deeper conversation.", icon: Sunrise, emoji: "🍽️", xp: 25, pro: true },
  { id: "college", name: "College Date", tag: "Casual", desc: "Youthful, campus/study context.", icon: Coffee, emoji: "🎓", xp: 10, pro: true },
];

const PERSONALITIES = [
  { id: "friendly", name: "Friendly", desc: "Warm, easygoing, keeps things light.", emoji: "🙂", prompt: "You are warm, easygoing, curious about the user, quick to laugh, and keep things light and comfortable.", pro: false },
  { id: "confident", name: "Confident", desc: "Direct, playful, leads the conversation.", emoji: "😎", prompt: "You are confident and direct. You lead the conversation, tease playfully, and aren't afraid of a little banter.", pro: false },
  { id: "shy", name: "Shy", desc: "Reserved at first, opens up slowly.", emoji: "🙈", prompt: "You are shy and reserved. Give shorter replies early on and only gradually open up if the user is kind and patient.", pro: true },
  { id: "intellectual", name: "Intellectual", desc: "Curious, loves deep topics.", emoji: "🤓", prompt: "You are thoughtful and intellectually curious, steering toward interesting ideas rather than small talk.", pro: true },
  { id: "romantic", name: "Romantic", desc: "Sincere and emotionally warm.", emoji: "💗", prompt: "You are sincere, a little emotionally expressive and warm, without ever being explicit.", pro: true },
  { id: "introvert", name: "Introvert", desc: "Quiet, comfortable with pauses.", emoji: "🤫", prompt: "You are quieter, comfortable with pauses, and prefer one-on-one depth over rapid back-and-forth.", pro: true },
  { id: "extrovert", name: "Extrovert", desc: "Energetic, talkative, asks lots of questions.", emoji: "🎉", prompt: "You are energetic and talkative, ask lots of questions, and comfortably carry the conversation.", pro: true },
];

const DIFFICULTIES = [
  { id: "beginner", name: "Beginner", note: "AI helps carry the conversation." },
  { id: "intermediate", name: "Intermediate", note: "Balanced back-and-forth." },
  { id: "advanced", name: "Advanced", note: "AI is more naturally guarded — you do more of the work." },
];

// Polyfill for window.storage (only exists inside Claude's artifact sandbox).
// Once deployed as a real site, this uses the browser's own localStorage instead.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(key);
      if (raw === null) throw new Error("not found");
      return { key, value: raw, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}

const FREE_MESSAGE_WARNING = 12;
const FREE_MESSAGE_LIMIT = 18;
// A quiet, generous daily ceiling across ALL conversations (any plan) — protects
// against runaway API cost from a single account, without affecting normal usage.
// Most users won't come close to this; it only kicks in for extreme/abusive use.
const DAILY_FAIR_USE_CAP = 180;
const todayKey = () => new Date().toISOString().slice(0, 10);

// ---------- Claude API ----------
async function callClaude(system, messages, task = "chat") {
  // Calls our own backend function (api/chat.js) instead of Anthropic directly,
  // so the real API key never reaches the browser. The backend picks the
  // model and token limit based on `task` — see api/chat.js for details.
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, task }),
  });
  const data = await res.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

function baseSystemPrompt(personality, scenario, difficulty, aiGender, aiName) {
  const diffLine = difficulty
    ? difficulty.id === "advanced"
      ? "Be more naturally guarded and don't make it too easy — require real effort from the user to keep the conversation going."
      : difficulty.id === "beginner"
        ? "Be a bit more forthcoming and help carry the conversation so the user has an easier time."
        : "Keep a balanced, natural back-and-forth."
    : "";
  const genderLine = aiGender === "male"
    ? `You are playing a man named ${aiName}. Use he/him framing naturally if it comes up.`
    : `You are playing a woman named ${aiName}. Use she/her framing naturally if it comes up.`;
  return `You are roleplaying as a date partner in a dating-confidence coaching app. Stay fully in character. This is a PRACTICE tool, not a romance app: never escalate into explicit content, never simulate a real named public figure, never break character to give advice mid-conversation.

${genderLine}

If the user is abusive or inappropriate, respond the way a real person would — set a boundary or consider ending the date — rather than just refusing to engage.

Personality: ${personality.name}. ${personality.prompt}
Scenario: ${scenario.name}. ${scenario.desc}
${diffLine}

Keep replies natural, usually 1-3 sentences like real text messages. Occasionally ask a question back.`;
}

function feedbackSystemPrompt(isPro) {
  const shape = isPro
    ? `{"confidence_score": 0-100, "flow_score": 0-100, "listening_score": 0-100, "respectfulness_score": 0-100, "overall_score": 0-100, "strengths": [string, string], "suggestions": [string, string, string]}`
    : `{"overall_score": 0-100, "strengths": [string], "suggestions": [string]}`;
  return `You analyze a practice date conversation and score the USER (not the AI character) on their communication. Return ONLY valid JSON, no markdown fences, in exactly this shape:
${shape}
Every suggestion MUST reference a specific moment from the transcript — never generic advice. Be honest, not just encouraging.`;
}

// ---------- Voice helpers (browser Web Speech API — no external service) ----------
function speak(text, aiGender = "female") {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    const voices = window.speechSynthesis.getVoices() || [];
    const femaleHints = ["female", "woman", "samantha", "victoria", "zira", "susan", "karen"];
    const maleHints = ["male", "man", "daniel", "alex", "david", "fred", "george"];
    const hints = aiGender === "male" ? maleHints : femaleHints;
    const match = voices.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)));
    if (match) u.voice = match;
    window.speechSynthesis.speak(u);
  } catch {}
}

function getRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = false;
  r.interimResults = false;
  r.lang = "en-US";
  return r;
}

// Shrinks an uploaded photo to a small square before storing, so it stays
// well under storage limits and loads fast.
function fileToResizedDataUrl(file, maxSize = 240) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like an image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height) { if (width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; } }
        else { if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; } }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- UI primitives ----------
function AnimatedNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now(); const from = display;
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
}

function GradientRing({ value, size = 160, label = "Today's Confidence" }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const [dash, setDash] = useState(c);
  useEffect(() => { const t = setTimeout(() => setDash(c - (value / 100) * c), 150); return () => clearTimeout(t); }, [value, c]);
  const gid = "ringGrad";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.primary} />
            <stop offset="100%" stopColor="#B54CFF" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.line} strokeWidth="10" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${gid})`} strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={dash} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "Manrope, Inter, sans-serif", color: COLORS.ink }}><AnimatedNumber value={value} />%</div>
        <div style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function ScoreRing({ value, size = 140 }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? COLORS.good : value >= 50 ? COLORS.mid : COLORS.low;
  const [dash, setDash] = useState(c);
  useEffect(() => { const t = setTimeout(() => setDash(c - (value / 100) * c), 100); return () => clearTimeout(t); }, [value, c]);
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.line} strokeWidth="10" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="10" fill="none"
        strokeDasharray={c} strokeDashoffset={dash} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      <text x="50%" y="46%" textAnchor="middle" fontSize="34" fontWeight="700" fill={COLORS.ink}>{value}</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="12" fill={COLORS.inkSoft}>overall</text>
    </svg>
  );
}

function ScoreBar({ label, value }) {
  const color = value >= 75 ? COLORS.good : value >= 50 ? COLORS.mid : COLORS.low;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.inkSoft, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: COLORS.ink, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ background: COLORS.line, borderRadius: 999, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, background: color, height: "100%", borderRadius: 999, transition: "width 1s ease-out" }} />
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <motion.button
      onClick={onClick} disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.97 }}
      style={{
        background: disabled ? COLORS.line : GRADIENT_PINK, color: "#fff", border: "none",
        borderRadius: 20, padding: "16px 20px", fontSize: 15.5, fontWeight: 700,
        width: "100%", cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 8px 24px -8px rgba(124,92,255,0.6)",
        letterSpacing: 0.2, ...style,
      }}>{children}</motion.button>
  );
}

function GhostButton({ children, onClick, disabled, style }) {
  return (
    <motion.button
      onClick={onClick} disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.97 }}
      style={{
        ...glass(0.04), color: COLORS.ink, borderRadius: 20, padding: "14px 20px",
        fontSize: 14.5, fontWeight: 600, width: "100%", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, ...style,
      }}>{children}</motion.button>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: "home", label: "Home", Icon: HomeIcon },
    { id: "practice", label: "Practice", Icon: MessageCircle },
    { id: "progress", label: "Progress", Icon: TrendingUp },
    { id: "premium", label: "Premium", Icon: Crown },
    { id: "profile", label: "Profile", Icon: User },
  ];
  return (
    <div style={{ position: "sticky", bottom: 0, padding: "0 14px 18px", zIndex: 20 }}>
      <div style={{
        display: "flex", ...glass(0.06), borderRadius: 30, padding: "8px 6px",
        boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)",
      }}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} style={{
              flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, cursor: "pointer", padding: "8px 2px", position: "relative",
            }}>
              {isActive && (
                <motion.div layoutId="tabPill" style={{
                  position: "absolute", inset: 0, borderRadius: 20, background: COLORS.primarySoft,
                }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <Icon size={19} strokeWidth={2.2} color={isActive ? COLORS.primary : COLORS.inkSoft} style={{ position: "relative" }} />
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? COLORS.primary : COLORS.inkSoft, position: "relative" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProBadge() {
  return <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,200,87,0.16)", color: COLORS.gold, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px" }}><Crown size={11} /> PRO</div>;
}

function choiceCardStyle(active) {
  return { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderRadius: 18, textAlign: "left",
    border: `1.5px solid ${active ? COLORS.primary : COLORS.line}`, background: active ? COLORS.primarySoft : COLORS.card, color: COLORS.ink, fontSize: 15, fontWeight: 500, cursor: "pointer" };
}
const sectionTitle = { fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: COLORS.inkSoft, margin: "0 0 12px" };
const screenStyle = { padding: 20, display: "flex", flexDirection: "column", minHeight: "100%", boxSizing: "border-box" };
const pickCardStyle = { display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 20, border: `1px solid ${COLORS.line}`, background: COLORS.card, cursor: "pointer", width: "100%" };
const iconBubble = { width: 44, height: 44, borderRadius: 14, background: COLORS.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 };
const rowCard = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 18, border: `1px solid ${COLORS.line}`, marginBottom: 10, background: COLORS.card };
const noteCard = { border: "1px solid", borderRadius: 14, padding: "12px 14px", fontSize: 13.5, marginBottom: 8, lineHeight: 1.4, background: "rgba(255,255,255,0.02)" };
const settingsRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 16px", borderRadius: 18, border: `1px solid ${COLORS.line}`, background: COLORS.card, marginBottom: 10, fontSize: 14, color: COLORS.ink };
const fieldLabel = { fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 6, display: "block" };
const textInputStyle = { width: "100%", padding: "13px 14px", borderRadius: 16, border: `1px solid ${COLORS.line}`, fontSize: 15, marginBottom: 16, boxSizing: "border-box", fontFamily: "inherit", background: COLORS.card, color: COLORS.ink, outline: "none" };
function chipStyle(active) {
  return { padding: "9px 15px", borderRadius: 999, border: `1.5px solid ${active ? COLORS.primary : COLORS.line}`, background: active ? COLORS.primarySoft : COLORS.card, color: COLORS.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" };
}

function AvatarPicker({ photo, onPick, size = 92 })
