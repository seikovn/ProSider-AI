// sidebar.js - logic UI trong iframe
(async function(){
  // ... phần đầu giữ nguyên (không thay đổi) ...
  // (mình chỉ sửa phần btnClose và message gửi về parent)

  const aiToolSelect = document.getElementById('ai-tool');
  const promptEl = document.getElementById('prompt');
  const btnSend = document.getElementById('btn-send');
  const btnUploadImage = document.getElementById('btn-upload-image');
  const btnCaptureRegion = document.getElementById('btn-capture-region');
  const imageInput = document.getElementById('image-input');
  const responseContent = document.getElementById('response-content');
  const historyList = document.getElementById('history-list');
  const btnUploadPdf = document.getElementById('btn-upload-pdf');
  const pdfInput = document.getElementById('pdf-input');
  const btnSettings = document.getElementById('btn-settings');
  const btnClose = document.getElementById('btn-close');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // overlay crop elements
  const overlay = document.getElementById('overlay-crop');
  const overlayCanvas = document.getElementById('overlay-canvas');
  const cropOk = document.getElementById('crop-ok');
  const cropCancel = document.getElementById('crop-cancel');

  // ... (giữ nguyên phần loadTools, renderHistory, escapeHtml, pushHistory, sendToAI, v.v.) ...

  // Settings
  btnSettings.addEventListener('click', ()=> {
    // open options page
    chrome.runtime.sendMessage({ type: 'openOptions' });
  });

  // Thay đổi: btnClose sẽ toggle (ẩn) chứ không xóa iframe ngay
  btnClose.addEventListener('click', ()=> {
    try {
      // gửi message sang parent để toggle/ẩn sidebar
      parent.postMessage({ type: 'toggleProSideAI' }, '*');
    } catch (err) {
      // fallback: nếu không thể postMessage (hiếm khi xảy ra), thử remove frameElement
      try { window.frameElement && window.frameElement.remove(); } catch(e){}
    }
  });

  btnClearHistory.addEventListener('click', async ()=>{
    await chrome.storage.local.set({ proSideHistory: [] });
    renderHistory([]);
  });

  // ... (các helper và phần còn lại giữ nguyên) ...

  // Utility: read initial tools and history
  await loadTools();

  // Listen for messages from parent window to close iframe
  window.addEventListener('message', (ev)=>{
    if (ev.data && ev.data.type === 'closeProSideAI') {
      window.frameElement && window.frameElement.remove();
    }
  });

})();
