// Tệp: api/chat.js
export default async function handler(req, res) {

  // Cấu hình CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- API KEY ĐƯỢC DÁN CỨNG ĐỂ KIỂM TRA ---
  const GEMINI_API_KEY = 'AIzaSyBtbup9ntf3ALYoC8Xh5hVyvby0n7o_Nsg'; 
  
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('DÁN_KEY')) {
      return res.status(500).json({ error: 'Lỗi: Key chưa được điền hoặc bị trống!' });
  }

  // Sử dụng model gemini-pro (ổn định nhất)
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

  try {
    // Prompt kiểm tra kết nối
    const testPrompt = "Xin chào, hãy trả lời ngắn gọn là: 'Đã kết nối thành công!'";
    
    const requestBody = {
      contents: [{ parts: [{ text: testPrompt }] }]
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Nếu Key không đúng quyền, lỗi sẽ xuất hiện tại đây
      throw new Error(errorData.error.message);
    }

    const responseData = await response.json();
    const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Không có nội dung trả về";
    
    // Gửi câu trả lời về tiện ích
    return res.status(200).json({ answer: text });

  } catch (error) {
    return res.status(500).json({ error: `Lỗi Server: ${error.message}` });
  }
}
