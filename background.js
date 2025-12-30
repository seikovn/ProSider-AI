//background.js
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === 'openOptions') {
    chrome.runtime.openOptionsPage();
  } else if (msg.type === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      respond({ success: true, dataUrl });
    });
    return true; // Báo hiệu sẽ trả lời sau (bất đồng bộ)
  }
});
