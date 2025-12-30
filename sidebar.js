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
  div.textContent = text;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Gọi API AI
async function callAI(prompt) {
  addMessage("Đang suy nghĩ...", 'ai');
  const loadingMsg = chatContainer.lastElementChild;
  
  const data = await chrome.storage.local.get('apiKeys');
  const keys = data.apiKeys || {};
  const model = modelSelect.value;
  let responseText = "Chưa cấu hình API Key. Hãy bấm nút bánh răng ⚙️ để nhập Key.";

  try {
    if (model === 'gemini') {
      if (!keys.google) throw new Error("Thiếu Google API Key");
      
      // --- SỬA Ở ĐÂY: Đổi sang gemini-pro cho ổn định ---
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${keys.google}`;
      // ----------------------------------------------------

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const json = await res.json();
      
      // Kiểm tra xem Google có báo lỗi chi tiết không
      if (json.error) {
        throw new Error(json.error.message);
      }
      
      responseText = json.candidates?.[0]?.content?.parts?.[0]?.text || "Lỗi: Không nhận được phản hồi.";
    } 
    else if (model === 'openai') {
      if (!keys.openai) throw new Error("Thiếu OpenAI API Key");
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.openai}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      responseText = json.choices?.[0]?.message?.content || "Lỗi: Không nhận được phản hồi.";
    }
  } catch (err) {
    responseText = "Lỗi: " + err.message;
  }

  loadingMsg.textContent = responseText;
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

// Nhận tin nhắn từ Menu bôi đen (content.js gửi vào)
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUTO_PROMPT') {
    const prompt = event.data.text;
    addMessage(prompt, 'user'); // Hiện câu hỏi
    callAI(prompt); // Gửi cho AI
  }
});
