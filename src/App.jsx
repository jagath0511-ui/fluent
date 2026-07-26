import React, { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
 Flame, Send, ChevronRight, Lock, MessageCircle, Mic, MicOff,
 History as HistoryIcon, User, Settings as SettingsIcon, Home as HomeIcon,
 Coffee, Sparkles, Sunrise, Check, ThumbsUp, ThumbsDown, Crown
} from "lucide-react";

// ---------- Design tokens ----------
const COLORS = {
 bg: "#FAF9F6", card: "#FFFFFF", ink: "#1C1B29", inkSoft: "#6F6C82",
 primary: "#4B4EFC", primarySoft: "#EDEDFF", accent: "#FF6F61", accentSoft: "#FFEDEA",
 good: "#2ECC71", mid: "#F5A623", low: "#E5484D", line: "#ECEAF3", gold: "#C9962C",
};

const SCENARIOS = [
 { id: "coffee", name: "Coffee Date", tag: "Low stakes", desc: "Casual, short, easy small talk.", icon: Coffee, pro: false },
 { id: "online", name: "Online Chat", tag: "Warm-up", desc: "Early messaging before you've even met.", icon: MessageCircle, pro: false },
 { id: "first", name: "First Date", tag: "Medium stakes", desc: "Getting to know each other, a bit more vulnerable.", icon: Sunrise, pro: true },
 { id: "dinner", name: "Dinner Date", tag: "Higher stakes", desc: "Slower pace, deeper conversation.", icon: Sunrise, pro: true },
 { id: "college", name: "College Date", tag: "Casual", desc: "Youthful, campus/study context.", icon: Coffee, pro: true },
];

const PERSONALITIES = [
 { id: "friendly", name: "Friendly", desc: "Warm, easygoing, keeps things light.", prompt: "You are warm, easygoing, curious about the user, quick to laugh, and keep things light and comfortable.", pro: false },
 { id: "confident", name: "Confident", desc: "Direct, playful, leads the conversation.", prompt: "You are confident and direct. You lead the conversation, tease playfully, and aren't afraid of a little banter.", pro: false },
 { id: "shy", name: "Shy", desc: "Reserved at first, opens up slowly.", prompt: "You are shy and reserved. Give shorter replies early on and only gradually open up if the user is kind and patient.", pro: true },
 { id: "intellectual", name: "Intellectual", desc: "Curious, loves deep topics.", prompt: "You are thoughtful and intellectually curious, steering toward interesting ideas rather than small talk.", pro: true },
 { id: "romantic", name: "Romantic", desc: "Sincere and emotionally warm.", prompt: "You are sincere, a little emotionally expressive and warm, without ever being explicit.", pro: true },
 { id: "introvert", name: "Introvert", desc: "Quiet, comfortable with pauses.", prompt: "You are quieter, comfortable with pauses, and prefer one-on-one depth over rapid back-and-forth.", pro: true },
 { id: "extrovert", name: "Extrovert", desc: "Energetic, talkative, asks lots of questions.", prompt: "You are energetic and talkative, ask lots of questions, and comfortably carry the conversation.", pro: true },
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

// Demo redeem codes — in production these should be validated against a backend,
// not checked client-side, so codes can't be read out of the page source.
const REDEEM_CODES = ["WELCOME2026", "EARLYBIRD", "FOUNDERSFRIEND", "PROMONTH1"];

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
 <button onClick={onClick} disabled={disabled} style={{
 background: disabled ? "#D8D6E8" : COLORS.primary, color: "#fff", border: "none",
 borderRadius: 20, padding: "14px 20px", fontSize: 15, fontWeight: 600,
 width: "100%", cursor: disabled ? "not-allowed" : "pointer", ...style,
 }}>{children}</button>
 );
}

function TabBar({ active, onChange }) {
 const tabs = [
 { id: "home", label: "Home", Icon: HomeIcon }, { id: "practice", label: "Practice", Icon: MessageCircle },
 { id: "history", label: "History", Icon: HistoryIcon }, { id: "profile", label: "Profile", Icon: User },
 { id: "settings", label: "Settings", Icon: SettingsIcon },
 ];
 return (
 <div style={{ position: "sticky", bottom: 0, background: COLORS.card, borderTop: `1px solid ${COLORS.line}`, display: "flex", padding: "8px 4px 14px" }}>
 {tabs.map(({ id, label, Icon }) => (
 <button key={id} onClick={() => onChange(id)} style={{
 flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column",
 alignItems: "center", gap: 4, cursor: "pointer", padding: 6, color: active === id ? COLORS.primary : COLORS.inkSoft,
 }}>
 <Icon size={20} strokeWidth={2} />
 <span style={{ fontSize: 11, fontWeight: active === id ? 600 : 400 }}>{label}</span>
 </button>
 ))}
 </div>
 );
}

function ProBadge() {
 return <div style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.gold + "22", color: COLORS.gold, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px" }}><Crown size={11} /> PRO</div>;
}

function choiceCardStyle(active) {
 return { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 14, textAlign: "left",
 border: `1.5px solid ${active ? COLORS.primary : COLORS.line}`, background: active ? COLORS.primarySoft : COLORS.card, color: COLORS.ink, fontSize: 15, fontWeight: 500, cursor: "pointer" };
}
const sectionTitle = { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.inkSoft, margin: "0 0 10px" };
const screenStyle = { padding: 20, display: "flex", flexDirection: "column", minHeight: "100%", boxSizing: "border-box" };
const pickCardStyle = { display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, border: `1px solid ${COLORS.line}`, background: COLORS.card, cursor: "pointer", width: "100%" };
const iconBubble = { width: 40, height: 40, borderRadius: 12, background: COLORS.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const rowCard = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 14, border: `1px solid ${COLORS.line}`, marginBottom: 10, background: COLORS.card };
const noteCard = { border: "1px solid", borderRadius: 12, padding: "10px 14px", fontSize: 13.5, marginBottom: 8, lineHeight: 1.4 };
const settingsRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 14, border: `1px solid ${COLORS.line}`, background: COLORS.card, marginBottom: 10, fontSize: 14 };
const fieldLabel = { fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 6, display: "block" };
const textInputStyle = { width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${COLORS.line}`, fontSize: 15, marginBottom: 16, boxSizing: "border-box", fontFamily: "inherit" };
function chipStyle(active) {
 return { padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${active ? COLORS.primary : COLORS.line}`, background: active ? COLORS.primarySoft : COLORS.card, color: COLORS.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" };
}

function AvatarPicker({ photo, onPick, size = 92 }) {
 const inputRef = useRef(null);
 const [err, setErr] = useState("");
 return (
 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
 <button type="button" onClick={() => inputRef.current?.click()} style={{
 width: size, height: size, borderRadius: "50%", cursor: "pointer",
 border: photo ? "none" : `2px dashed ${COLORS.line}`,
 background: photo ? `center/cover no-repeat url(${photo})` : COLORS.primarySoft,
 display: "flex", alignItems: "center", justifyContent: "center",
 }}>
 {!photo && <User size={30} color={COLORS.primary} />}
 </button>
 <span style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 8 }}>{photo ? "Tap to change photo" : "Add a photo (optional)"}</span>
 {err && <span style={{ fontSize: 11.5, color: COLORS.low, marginTop: 4 }}>{err}</span>}
 <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 try { setErr(""); const dataUrl = await fileToResizedDataUrl(file); onPick(dataUrl); }
 catch (ex) { setErr(ex.message || "Couldn't use that photo"); }
 }} />
 </div>
 );
}

function EmptyNote({ text }) { return <p style={{ color: COLORS.inkSoft, fontSize: 13, background: COLORS.line + "55", padding: 14, borderRadius: 12 }}>{text}</p>; }
function ScorePill({ value }) {
 if (value == null) return null;
 const color = value >= 75 ? COLORS.good : value >= 50 ? COLORS.mid : COLORS.low;
 return <div style={{ background: color + "22", color, fontWeight: 700, fontSize: 13, borderRadius: 999, padding: "4px 12px" }}>{value}</div>;
}
function BackHeader({ title, onBack }) {
 return (
 <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
 <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: COLORS.ink }}>←</button>
 <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
 </div>
 );
}

// ---------- Onboarding ----------
function Onboarding({ onDone }) {
 const [step, setStep] = useState(0);
 const [goals, setGoals] = useState([]);
 const [level, setLevel] = useState(null);
 const [photo, setPhoto] = useState(null);
 const [name, setName] = useState("");
 const [age, setAge] = useState("");
 const [userGender, setUserGender] = useState(null);
 const [aiGenderPref, setAiGenderPref] = useState(null);
 const goalOptions = ["Build confidence", "Improve small talk", "Reduce anxiety", "Practice listening"];
 const toggleGoal = (g) => setGoals((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]);
 const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];
 const ageNum = Number(age);
 const ageValid = age.trim() !== "" && Number.isFinite(ageNum) && ageNum >= 18 && ageNum <= 120;
 const profileValid = name.trim().length > 0 && ageValid && !!userGender;
 const steps = [
 { title: "What do you want to work on?", sub: "Pick as many as apply.",
 body: <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{goalOptions.map((g) => (
 <button key={g} onClick={() => toggleGoal(g)} style={choiceCardStyle(goals.includes(g))}>{g}{goals.includes(g) && <Check size={18} />}</button>
 ))}</div>, canNext: goals.length > 0 },
 { title: "Your experience level?", sub: "Calibrates how challenging sessions feel.",
 body: <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{["Beginner", "Intermediate", "Advanced"].map((l) => (
 <button key={l} onClick={() => setLevel(l)} style={choiceCardStyle(level === l)}>{l}{level === l && <Check size={18} />}</button>
 ))}</div>, canNext: !!level },
 { title: "Create your profile", sub: "Name, age, and gender are required. Your photo is optional and never shown to anyone else.",
 body: <div>
 <AvatarPicker photo={photo} onPick={setPhoto} />
 <label style={fieldLabel}>Name</label>
 <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={textInputStyle} />
 <label style={fieldLabel}>Age</label>
 <input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Your age" style={textInputStyle} />
 {age.trim() !== "" && !ageValid && (
 <p style={{ color: COLORS.low, fontSize: 12, marginTop: -10, marginBottom: 16 }}>
 {ageNum < 18 ? "You must be 18 or older to use this app." : "Enter a valid age."}
 </p>
 )}
 <label style={fieldLabel}>Gender</label>
 <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
 {genderOptions.map((g) => (
 <button key={g} onClick={() => setUserGender(g)} style={chipStyle(userGender === g)}>{g}</button>
 ))}
 </div>
 </div>, canNext: profileValid },
 { title: "Who would you like to practice with?", sub: "You can change this later in Settings.",
 body: <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
 <button onClick={() => setAiGenderPref("female")} style={choiceCardStyle(aiGenderPref === "female")}>Female{aiGenderPref === "female" && <Check size={18} />}</button>
 <button onClick={() => setAiGenderPref("male")} style={choiceCardStyle(aiGenderPref === "male")}>Male{aiGenderPref === "male" && <Check size={18} />}</button>
 </div>, canNext: !!aiGenderPref },
 ];
 const cur = steps[step];
 return (
 <div style={screenStyle}>
 <div style={{ height: 4, background: COLORS.line, borderRadius: 999, marginBottom: 28 }}>
 <div style={{ height: 4, width: `${((step
