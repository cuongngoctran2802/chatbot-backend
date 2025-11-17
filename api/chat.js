// Tệp: api/chat.js
// Code này chạy trên máy chủ Vercel (ở Mỹ)
export default async function handler(req, res) {

  // Thêm các header CORS quan trọng
  // Cho phép tiện ích Chrome của bạn gọi đến máy chủ này
  res.setHeader('Access-Control-Allow-Origin', '*'); // Trong thực tế, bạn nên đổi '*' thành 'chrome-extension://YOUR_EXTENSION_ID'
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý các yêu cầu OPTIONS (trình duyệt gửi trước)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Lấy bối cảnh và câu hỏi từ tiện ích gửi lên
  const { context, question } = req.body;

  // 3. Lấy API key MỘT CÁCH AN TOÀN từ "Biến Môi trường"
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key chưa được cấu hình trên máy chủ' });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Dựa vào thông tin trong bối cảnh sau đây:
  --- BỐI CẢNH ---
  ${context}
  --- KẾT THÚC BỐI CẢNH ---
  Hãy trả lời câu hỏi sau một cách ngắn gọn, chính xác và chỉ dựa vào thông tin trong bối cảnh đã cho. Không thêm thông tin bên ngoài.
  Câu hỏi: "${question}"`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  try {
    // 4. Máy chủ Vercel (ở Mỹ) gọi đến Google
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Ném lỗi từ Google
      throw new Error(`Lỗi từ Google: ${errorData.error.message}`);
    }

    const responseData = await response.json();
    const text = responseData.candidates[0].content.parts[0].text;

    // 5. Gửi câu trả lời sạch về lại cho tiện ích
    return res.status(200).json({ answer: text });

  } catch (error) {
    // Gửi lỗi về tiện ích
    return res.status(500).json({ error: error.message });
  }
}
