// Tệp: api/chat.js (Phiên bản Hugging Face)
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
  
  // Lấy Token từ biến môi trường Vercel
  const HF_API_TOKEN = process.env.HF_API_TOKEN;
  // Dùng Mixtral 8x7B (Mô hình nguồn mở mạnh mẽ)
  const MODEL_ID = "mistralai/Mixtral-8x7B-Instruct-v0.1"; 
  
  if (!HF_API_TOKEN) {
    return res.status(500).json({ error: 'Lỗi: Biến môi trường HF_API_TOKEN chưa được cấu hình' });
  }

  // URL API Hugging Face Inference
  const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

  try {
    const { context, question } = req.body;

    // Định dạng prompt theo chuẩn Mixtral (rất quan trọng)
    const prompt = `[INST] Bạn là trợ lý thông minh. Dựa trên thông tin sau, hãy trả lời câu hỏi một cách ngắn gọn, chính xác:

    Thông tin: 
    ${context}

    Câu hỏi: ${question} [/INST]`;

    // Tạo request body cho Hugging Face
    const requestBody = {
      inputs: prompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.1
      },
      options: {
        wait_for_model: true 
      }
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Gửi Token qua Authorization Header
        'Authorization': `Bearer ${HF_API_TOKEN}` 
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
        // Xử lý lỗi từ HF 
        return res.status(500).json({ error: responseData.error || `Lỗi API Hugging Face: ${response.status}` });
    }
    
    // Lấy nội dung trả về
    const text = responseData[0]?.generated_text || "Không có nội dung trả về từ mô hình.";

    // Lọc bỏ phần prompt (Mixtral thường lặp lại prompt)
    const answer = text.replace(prompt, '').trim();

    // Gửi câu trả lời về tiện ích
    return res.status(200).json({ answer: answer });

  } catch (error) {
    return res.status(500).json({ error: `Lỗi Server: ${error.message}` });
  }
}
