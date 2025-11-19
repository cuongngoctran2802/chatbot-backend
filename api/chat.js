export default async function handler(req, res) {
  // CORS (thêm Authorization nếu client gửi token)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // LẤY KEY TỪ BIẾN MÔI TRƯỜNG (Vercel -> Environment Variables)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return res.status(500).json({ error: 'Server misconfigured: missing API key' });
    }

    // Lấy prompt từ body nếu client gửi, hoặc dùng prompt test
    const clientPrompt = (req.body && (req.body.prompt || req.body.message)) || null;
    const prompt = clientPrompt || "Xin chào, hãy trả lời ngắn gọn là: 'Đã kết nối thành công!'";

    // NOTE: Kiểm tra docs Generative Language API và điều chỉnh schema nếu cần
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    // Hỗ trợ cả 2 cách: key query param (API key Google) hoặc Bearer token
    const useKeyQuery = /^AIza/.test(GEMINI_API_KEY);
    const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const API_URL = useKeyQuery ? `${API_URL_BASE}?key=${GEMINI_API_KEY}` : API_URL_BASE;

    // Timeout cho fetch
    const controller = new AbortController();
    const timeoutMs = 30000; // 30s
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers = { 'Content-Type': 'application/json' };
    if (!useKeyQuery) {
      headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;
    }

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!upstream.ok) {
      // Cố gắng parse JSON lỗi, fallback sang text
      let detail;
      try {
        const errJson = await upstream.json();
        detail = JSON.stringify(errJson);
      } catch (e) {
        detail = await upstream.text().catch(() => 'No body');
      }
      console.error('Upstream API returned error', upstream.status, detail);
      return res.status(502).json({ error: 'Upstream API error', status: upstream.status, details: detail });
    }

    // Parse response (nhiều biến thể tùy API version)
    let data;
    try {
      data = await upstream.json();
    } catch (e) {
      console.error('Failed to parse upstream JSON', e);
      return res.status(502).json({ error: 'Invalid JSON from upstream API' });
    }

    // Cố gắng trích text theo nhiều cấu trúc khác nhau
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || data?.candidates?.[0]?.output
      || data?.output
      || null;

    if (!text) {
      console.warn('Upstream returned no text, returning full payload for debugging');
      return res.status(200).json({ answer: null, raw: data });
    }

    return res.status(200).json({ answer: text });

  } catch (err) {
    console.error('Handler error', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: 'Internal server error', message: String(err) });
  }
}