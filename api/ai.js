// Vercel Serverless Function — Gemini API 프록시
// 프론트엔드에서 /api/ai 로 요청하면 여기서 Google Gemini API를 대신 호출해요.
// API 키는 서버 환경변수에만 두기 때문에 브라우저에 노출되지 않아요.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY 환경변수가 설정돼 있지 않아요.',
    });
  }

  try {
    const {
      prompt,
      model = 'gemini-2.5-flash',
      max_tokens = 4096,
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'prompt 필드가 필요해요.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: max_tokens,
          responseMimeType: 'application/json', // JSON 모드 — 깔끔한 JSON 응답 유도
          temperature: 0.3,
          // gemini-2.5-flash는 thinking 토큰을 먼저 소비해서 답변이 잘리는 경우가 있어
          // thinking 예산을 낮춰 실제 JSON 답변 분량을 확보
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.error?.message || 'Gemini API 오류',
        detail: data,
      });
    }

    // Gemini 응답 형식: data.candidates[0].content.parts[0].text
    const cand = data.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text || '').join('') || '';
    // 응답이 토큰 한도로 잘렸는지 알려줌 (디버깅용)
    const truncated = cand?.finishReason === 'MAX_TOKENS';
    return res.status(200).json({ text, truncated });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
