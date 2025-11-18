// Tệp: api/chat.js
export default async function handler(req, res) {
  // 1. Cấu hình CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- KIỂM TRA MÔI TRƯỜNG VERCEL ---
  if (typeof fetch === 'undefined') {
    return res.status(500).json({ 
      error: 'LỖI MÔI TRƯỜNG: Node.js trên Vercel quá cũ, không có lệnh fetch. Hãy vào Settings > General > Node.js Version và chọn bản 18.x hoặc 20.x' 
    });
  }

  try {
    // --- DÙNG KEY CỨNG ĐỂ TEST ---
    const GEMINI_API_KEY = 'AIzaSyAfoDhnXqJl1og1kT8j_bsHXBKJUeXKKlQ';

    // --- BỎ QUA req.body, TEST BẰNG CÂU CHÀO CỐ ĐỊNH ---
    // Điều này giúp loại trừ lỗi do dữ liệu gửi lên bị sai
    const testPrompt = "Hãy trả lời 'Kết nối thành công!' nếu bạn nhận được tin nhắn này.";
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: testPrompt }] }]
      }),
    });

    const responseData = await response.json();

    // Nếu Google báo lỗi, trả về chi tiết lỗi đó
    if (!response.ok) {
      return res.status(500).json({ 
        error: `Google chặn: ${responseData.error?.message || 'Lỗi không xác định'}` 
      });
    }

    // Nếu thành công
    const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Không có nội dung trả về";
    return res.status(200).json({ answer: text });

  } catch (error) {
    // Bắt mọi lỗi sập server và in ra
    return res.status(500).json({ 
      error: `SERVER CRASH: ${error.message}`,
      stack: error.stack 
    });
  }
}
