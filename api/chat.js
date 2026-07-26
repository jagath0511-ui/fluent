// This runs on Vercel's server, never in the user's browser.
// Your real Anthropic API key lives in Vercel's environment variables,
// not in this file and not in any code the browser can see.
//
// Cost controls in this file (see README for the full explanation):
// 1. Model routing — casual chat replies use the cheap model (Haiku),
// the once-per-conversation feedback report uses the better model (Sonnet).
// 2. Tight max_tokens — replies are meant to be short, so we don't pay for
// headroom nobody uses.
// 3. Prompt caching — a growing conversation resends its whole history every
// turn; caching everything except the newest message means you only pay
// full price for the one new turn, not the whole transcript again.
export default async function handler(req, res) {
 if (req.method !== "POST") {
 return res.status(405).json({ error: "Method not allowed" });
 }

 const apiKey = process.env.ANTHROPIC_API_KEY;
 if (!apiKey) {
 return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
 }

 const { system, messages, task } = req.body || {};
 if (!messages || !Array.isArray(messages)) {
 return res.status(400).json({ error: "Missing messages" });
 }

 // Basic abuse guardrails — keeps a stranger from sending something huge
 // and running up your Anthropic bill.
 if (messages.length > 60) {
 return res.status(400).json({ error: "Conversation too long" });
 }
 const totalChars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
 if (totalChars > 20000 || (system && system.length > 4000)) {
 return res.status(400).json({ error: "Message too large" });
 }

 const isFeedback = task === "feedback";
 const model = isFeedback ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
 const max_tokens = isFeedback ? 700 : 220;

 // Mark the system prompt cacheable, and mark the last message BEFORE the
 // newest one as the cache boundary — everything up to that point matches
 // the previous request byte-for-byte, so it's billed at ~10% of full price.
 const systemBlock = [{ type: "text", text: system || "", cache_control: { type: "ephemeral" } }];
 const cachedMessages = messages.map((m, i) =>
 i === messages.length - 2
 ? { role: m.role, content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }] }
 : m
 );

 try {
 const response = await fetch("https://api.anthropic.com/v1/messages", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "x-api-key": apiKey,
 "anthropic-version": "2023-06-01",
 },
 body: JSON.stringify({
 model,
 max_tokens,
 system: systemBlock,
 messages: cachedMessages,
 }),
 });

 const data = await response.json();
 if (!response.ok) {
 return res.status(response.status).json({ error: data });
 }
 return res.status(200).json(data);
 } catch (err) {
 return res.status(500).json({ error: String(err) });
 }
}

