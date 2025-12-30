//options.js
const keyGoogle = document.getElementById('key-google');
const keyOpenAI = document.getElementById('key-openai');
const statusDiv = document.getElementById('status');

// Load key đã lưu khi mở lên
chrome.storage.local.get('apiKeys', (data) => {
  if (data.apiKeys) {
    keyGoogle.value = data.apiKeys.google || '';
    keyOpenAI.value = data.apiKeys.openai || '';
  }
});

document.getElementById('save').addEventListener('click', () => {
  const apiKeys = {
    google: keyGoogle.value.trim(),
    openai: keyOpenAI.value.trim()
  };
  chrome.storage.local.set({ apiKeys }, () => {
    statusDiv.textContent = "Đã lưu thành công! Cháu có thể đóng tab này.";
  });
});
