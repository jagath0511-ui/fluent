export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, systemPrompt, system } = req.body || {};
    const effectiveSystemPrompt = systemPrompt || system || '';

    const contents = (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : String(m.content || '') }]
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    let lastData = null;
    let reply = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: effectiveSystemPrompt }] },
              generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.9
              }
            })
          }
        );

        const data = await response.json();
        if (response.ok) {
          reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (reply) {
            return res.status(200).json({ reply, content: [{ type: 'text', text: reply }] });
          }
        } else {
          lastData = data;
          console.warn(`Model ${model} failed:`, data);
        }
      } catch (e) {
        console.warn(`Fetch failed for ${model}:`, e);
      }
    }

    console.error('All Gemini API models failed:', lastData);
    return res.status(500).json({ error: 'Failed to get AI response', details: lastData });

  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
