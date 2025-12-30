// background.js (service worker)
// Lắng nghe message để capture visible tab (dùng cho OCR vùng màn hình)
// Lưu ý: MV3 service worker có lifecycle ngắn, sử dụng chrome.runtime.onMessage

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg && msg.type === 'captureVisibleTab') {
    // captureVisibleTab requires "tabs" permission via chrome API; here we already declared "tabs"
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        respond({ success: false, error: chrome.runtime.lastError.message });
      } else {
        respond({ success: true, dataUrl });
      }
    });
    // indicate we will respond asynchronously
    return true;
  }

  if (msg && msg.type === 'openOptions') {
    chrome.runtime.openOptionsPage();
    respond({ success: true });
    return;
  }
});
