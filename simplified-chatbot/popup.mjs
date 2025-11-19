// Tệp: popup.mjs

// === BƯỚC 1: IMPORT THƯ VIỆN PDF ===
import * as pdfjsLib from './pdf.mjs';
// Lưu ý: Không còn import config.js nữa vì key đã ở trên Server

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.mjs');

// === BƯỚC 2: LOGIC CHÍNH ===
document.addEventListener('DOMContentLoaded', () => {
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatMessages = document.getElementById('chat-messages');
  const pdfUpload = document.getElementById('pdf-upload');
  const statusMessage = document.getElementById('status-message');

  // --- KHỞI TẠO TRẠNG THÁI ---
  chrome.storage.local.get(['pdfFileName', 'web_data_status'], (result) => {
    let status = [];
    if (result.web_data_status) {
      status.push(`Web: ${result.web_data_status}`);
    } else {
      status.push("Web: Đang tải...");
    }
    if (result.pdfFileName) {
      status.push(`PDF: ${result.pdfFileName}`);
    } else {
      status.push("Chưa có PDF.");
    }
    statusMessage.textContent = status.join(' | ');
  });

  // --- XỬ LÝ TẢI PDF ---
  pdfUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      statusMessage.textContent = 'Lỗi: Vui lòng chọn tệp PDF.';
      return;
    }

    statusMessage.textContent = 'Đang đọc PDF...';
    try {
      const fullText = await parsePDF(file);
      chrome.storage.local.set({
        'pdf_content': fullText,
        'pdfFileName': file.name
      }, () => {
        statusMessage.textContent = `Đã xong: ${file.name}`;
      });
    } catch (error) {
      statusMessage.textContent = 'Lỗi đọc PDF.';
      console.error(error);
    }
  });

  async function parsePDF(file) {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n';
          }
          resolve(fullText);
        } catch (e) { reject(e); }
      };
      fileReader.readAsArrayBuffer(file);
    });
  }

  // --- XỬ LÝ CHAT ---
  const handleSend = async () => {
    const question = userInput.value.trim();
    if (!question) return;

    appendMessage(question, 'user');
    userInput.value = '';
    
    const thinkingMsg = appendMessage("Đang kết nối máy chủ...", 'bot thinking');

    try {
      // 1. Tìm ngữ cảnh trong dữ liệu đã tải (PDF + Web)
      const context = await findBestContext(question);
      
      if (!context) {
        thinkingMsg.remove();
        appendMessage("Tôi không tìm thấy thông tin nào liên quan trong tài liệu của bạn.", 'bot');
        return;
      }

      // 2. Gửi ngữ cảnh + câu hỏi lên SERVER VERCEL
      const answer = await callVercelBackend(context, question);
      
      thinkingMsg.remove();
      appendMessage(answer, 'bot');

    } catch (error) {
      thinkingMsg.remove();
      console.error("Lỗi:", error);
      appendMessage(`Lỗi kết nối: ${error.message}`, 'bot error-notice');
    }
  };

  sendButton.addEventListener('click', handleSend);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  function appendMessage(text, type) {
    const div = document.createElement('div');
    div.textContent = text;
    div.className = `message ${type}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  // --- HÀM TÌM KIẾM LOCAL (Giữ nguyên) ---
  function findBestContext(question) {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        let bestChunk = "";
        let maxScore = 0;
        const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const checkContent = (text) => {
          // Chia nhỏ văn bản thành các đoạn
          const chunks = text.split(/\n\s*\n/);
          chunks.forEach(chunk => {
            if (chunk.length < 50) return; 
            let score = 0;
            const lowerChunk = chunk.toLowerCase();
            keywords.forEach(word => {
              if (lowerChunk.includes(word)) score++;
            });
            if (score > maxScore) {
              maxScore = score;
              bestChunk = chunk;
            }
          });
        };

        for (let key in items) {
          if (key.startsWith('http') || key === 'pdf_content') {
            checkContent(items[key]);
          }
        }
        
        // Nếu không tìm thấy đoạn nào khớp, trả về null
        resolve(maxScore > 0 ? bestChunk : null);
      });
    });
  }

  // --- HÀM GỌI SERVER VERCEL (MỚI) ---
  async function callVercelBackend(context, question) {
    // ĐÂY LÀ URL MÁY CHỦ CỦA BẠN
    const BACKEND_URL = 'https://chatbot-backend-silk-theta.vercel.app/api/chat';

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context: context,
        question: question
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Lỗi từ máy chủ Vercel");
    }

    return data.answer;
  }
});