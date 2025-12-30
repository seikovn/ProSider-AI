//sidebar.js
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const btnSend = document.getElementById('btn-send');
const btnClose = document.getElementById('btn-close');
const btnSettings = document.getElementById('btn-settings');
const modelSelect = document.getElementById('model-select');

// Thêm tin nhắn vào khung chat
function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  // Chuyển đổi ký tự xuống dòng thành thẻ <br> để dễ đọc
  div.innerHTML = text.replace(/\n/g, '<br>');
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Gọi API AI
async function callAI(prompt) {
  addMessage("Đang suy nghĩ...", 'ai');
  const loadingMsg = chatContainer.lastElementChild;
  
  const data = await chrome.storage.local.get('apiKeys');
  const keys = data.apiKeys || {};
  
  // Lấy model và xóa khoảng trắng thừa ở key
  const model = modelSelect.value;
  const googleKey = (keys.google || '').trim();
  const openaiKey = (keys.openai || '').trim();

  let responseText = "Chưa cấu hình API Key. Hãy bấm nút bánh răng ⚙️ để nhập Key.";

  try {
    if (model === 'gemini') {
      if (!googleKey) throw new Error("Cháu chưa nhập Google API Key.");
      
      // Sử dụng model mới nhất và nhẹ nhất: gemini-1.5-flash
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleKey}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      
      const json = await res.json();
      
      if (json.error) {
        // Xử lý lỗi từ Google gửi về
        throw new Error(`Lỗi Google: ${json.error.message}`);
      }
      
      responseText = json.candidates?.[0]?.content?.parts?.[0]?.text || "Không có câu trả lời.";
    } 
    else if (model === 'openai') {
      if (!openaiKey) throw new Error("Cháu chưa nhập OpenAI API Key.");
      
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }]
        })
      });
      
      const json = await res.json();
      
      if (json.error) {
        if (json.error.code === 'insufficient_quota') {
          throw new Error("Key OpenAI này đã hết tiền (hết hạn dùng thử). Cháu hãy chuyển sang dùng Gemini nhé!");
        }
        throw new Error(`Lỗi OpenAI: ${json.error.message}`);
      }
      
      responseText = json.choices?.[0]?.message?.content || "Không có câu trả lời.";
    }
  } catch (err) {
    responseText = "⚠️ " + err.message;
  }

  // Cập nhật câu trả lời vào tin nhắn đang chờ
  loadingMsg.innerHTML = responseText.replace(/\n/g, '<br>');
}

// Xử lý gửi tin
btnSend.addEventListener('click', () => {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  userInput.value = '';
  callAI(text);
});

// Xử lý nút Đóng
btnClose.addEventListener('click', () => {
  window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*');
});

// Xử lý nút Cài đặt
btnSettings.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'openOptions' });
});

// Nhận tin nhắn từ Menu bôi đen
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUTO_PROMPT') {
    const prompt = event.data.text;
    addMessage(prompt, 'user');
    callAI(prompt);
  }
});
