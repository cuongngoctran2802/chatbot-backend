// Tệp: api/chat.js
export default async function handler(req, res) {

  // 1. Cấu hình CORS (Cho phép tiện ích gọi đến)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý yêu cầu kiểm tra trước (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- PHẦN QUAN TRỌNG: API KEY ĐƯỢC DÁN TRỰC TIẾP ---
  // Đây là key bạn đã cung cấp: AIzaSyAfoDhnXqJl1og1kT8j_bsHXBKJUeXKKlQ
  const GEMINI_API_KEY = 'AIzaSyAfoDhnXqJl1og1kT8j_bsHXBKJUeXKKlQ';

  // Sử dụng model chuẩn: gemini-1.5-flash
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const { context, question } = req.body;

    // Tạo nội dung gửi đi
    const prompt = `Dựa vào thông tin sau đây:\n${context}\n\nHãy trả lời câu hỏi: ${question}`;
    
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    // Gọi đến Google
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // Xử lý lỗi từ Google trả về
    if (!response.ok) {
      const errorData = await response.json();
      // Trả về nguyên văn lỗi để dễ debug
      throw new Error(errorData.error.message);
    }

    // Xử lý kết quả thành công
    const responseData = await response.json();
    
    if (!responseData.candidates || responseData.candidates.length === 0) {
        throw new Error("AI không trả về nội dung nào.");
    }

    const text = responseData.candidates[0].content.parts[0].text;
    
    // Gửi câu trả lời về tiện ích
    return res.status(200).json({ answer: text });

  } catch (
