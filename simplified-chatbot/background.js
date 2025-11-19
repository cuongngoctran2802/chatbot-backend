const urls = [
  'https://teefan.github.io/keep-talking-and-nobody-explodes-vi/'
  // Bạn có thể thêm các link khác vào đây
];

/**
 * Hàm này dọn dẹp HTML thô thành văn bản thuần túy.
 * Nó biến các thẻ <div>, <p>, <tr> thành các dòng mới
 * và xóa tất cả các thẻ khác.
 */
function cleanHtml(html) {
  // 1. Thêm newline cho các thẻ block chính để giữ cấu trúc
  let text = html.replace(/<(div|p|br|tr|h[1-6])[^>]*>/gi, '\n');
  
  // 2. Xóa tất cả các thẻ HTML còn lại (như <table>, <span>, <img>)
  text = text.replace(/<[^>]*>/g, ' ');
  
  // 3. Giải mã các ký tự HTML cơ bản (quan trọng nhất là &nbsp;)
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  
  // 4. Dọn dẹp: Gộp nhiều dấu cách thành một
  text = text.replace(/[ \t]+/g, ' ');
  
  // 5. Dọn dẹp: Gộp nhiều dòng trống thành một (rất quan trọng cho hàm split)
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  // 6. Dọn dẹp: Xóa khoảng trắng ở đầu/cuối mỗi dòng
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  // 7. Trả về văn bản đã được làm sạch hoàn toàn
  return text.trim();
}

async function clearOldData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(k => k.startsWith('http') || k === 'web_data_status');
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          console.log('Đã xóa sạch dữ liệu web cũ.');
          resolve();
        });
      } else {
        resolve(); // Không có gì để xóa
      }
    });
  });
}

async function fetchAndStoreContent() {
  await clearOldData();
  console.log('Bắt đầu tải và dọn dẹp dữ liệu web...');

  if (urls.length === 0) {
    console.log('Không có link web nào để tải.');
    chrome.storage.local.set({ 'web_data_status': 'Không có link' });
    return;
  }

  let success = false;
  const fetchPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Lỗi HTTP ${response.status} khi tải ${url}`);
      }
      const html = await response.text(); // Lấy HTML thô
      
      // *** BƯỚC QUAN TRỌNG MỚI: DỌN DẸP HTML ***
      const cleanText = cleanHtml(html);
      
      // Lưu văn bản thuần túy đã dọn dẹp
      await chrome.storage.local.set({ [url]: cleanText }); 
      console.log(`Đã DỌN DẸP và lưu nội dung từ: ${url}`);
      success = true;
    } catch (error) {
      console.error(`Lỗi khi tải ${url}:`, error);
    }
  });

  await Promise.all(fetchPromises);

  if (success) {
    chrome.storage.local.set({ 'web_data_status': 'Đã tải xong' });
    console.log('Tất cả dữ liệu web đã được tải và dọn dẹp.');
  } else {
    chrome.storage.local.set({ 'web_data_status': 'Lỗi khi tải' });
    console.log('Không thể tải bất kỳ dữ liệu web nào.');
  }
}

// Các trình lắng nghe sự kiện không thay đổi
chrome.runtime.onInstalled.addListener(() => {
  fetchAndStoreContent();
  chrome.alarms.create('clearOldData', { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'clearOldData') {
    fetchAndStoreContent();
  }
});