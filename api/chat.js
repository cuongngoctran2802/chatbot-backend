// Tệp: api/chat.js
export default async function handler(req, res) {

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

  // --- SỬA LẦN CUỐI: DÙNG GEMINI PRO (ỔN ĐỊNH NHẤT) ---
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Dựa vào thông tin trong bối cảnh sau đây:
  --- BỐI CẢNH ---
  ${context}
  --- KẾT THÚC BỐI CẢNH ---
  Hãy trả lời câu hỏi sau một cách ngắn gọn, chính xác và chỉ dựa vào thông tin trong bối cảnh đã cho.
  Câu hỏi: "${question}"`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Ghi log lỗi cụ thể để dễ debug nếu cần
      throw new Error(errorData.error.message);
    }

    const responseData = await response.json();
    
    // Kiểm tra kỹ cấu trúc trả về của Gemini Pro
    if (!responseData.candidates || responseData.candidates.length === 0) {
        throw new Error("AI không trả về kết quả nào.");
    }

    const text = responseData.candidates[0].content.parts[0].text;
    return res.status(200).json({ answer: text });

  } catch (error) {
    return res.status(500).json({ error: `Lỗi từ Google: ${error.message}` });
  }
}
