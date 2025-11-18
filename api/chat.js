// Tệp: api/chat.js
export default async function handler(req, res) {

  // Cấu hình CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { context, question } = req.body;
  
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key chưa được cấu hình' });
  }

  // --- SỬA THÀNH GEMINI-PRO (CHẠY ĐƯỢC MỌI TÀI KHOẢN) ---
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [{ parts: [{ text: `Dựa vào: \n${context}\n\nTrả lời: ${question}` }] }]
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message);
    }

    const responseData = await response.json();
    const text = responseData.candidates[0].content.parts[0].text;
    return res.status(200).json({ answer: text });

  } catch (error) {
    return res.status(500).json({ error: `Lỗi Google: ${error.message}` });
  }
}
