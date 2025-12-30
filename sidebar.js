// sidebar.js - logic UI trong iframe
(async function(){
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

  // Load tools from storage
  async function loadTools() {
    const data = await chrome.storage.local.get(['aiTools', 'apiKeys', 'proSideHistory']);
    const tools = data.aiTools || [
      { id: 'openai', name: 'ChatGPT (OpenAI)', enabled: true },
      { id: 'google', name: 'Gemini (Google)', enabled: false },
      { id: 'anthropic', name: 'Claude (Anthropic)', enabled: false }
    ];
    aiToolSelect.innerHTML = '';
    tools.filter(t=>t.enabled).forEach(t=>{
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      aiToolSelect.appendChild(opt);
    });

    // load history
    const history = data.proSideHistory || [];
    renderHistory(history);
  }

  function renderHistory(history) {
    historyList.innerHTML = '';
    history.slice().reverse().forEach(entry=>{
      const li = document.createElement('li');
      const time = new Date(entry.t).toLocaleString();
      li.innerHTML = `<strong>${entry.tool}</strong> • ${time}<div style="margin-top:6px">${escapeHtml(entry.prompt)}</div><div style="margin-top:6px;color:#222">${escapeHtml(entry.response)}</div>`;
      historyList.appendChild(li);
    });
  }

  function escapeHtml(s=''){
    return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  // Save history helper
  async function pushHistory(tool, prompt, response) {
    const existing = (await chrome.storage.local.get('proSideHistory')).proSideHistory || [];
    existing.push({ t: Date.now(), tool, prompt, response });
    // keep last 200
    const trimmed = existing.slice(-200);
    await chrome.storage.local.set({ proSideHistory: trimmed });
    renderHistory(trimmed);
  }

  // Placeholder: send prompt to selected AI tool
  // TODO: implement calls for each tool using their API endpoints and stored API keys
  async function sendToAI(toolId, prompt) {
    // Example: fetch to OpenAI API (this is only illustrative)
    // Use stored keys: const { apiKeys } = await chrome.storage.local.get('apiKeys')
    const keys = (await chrome.storage.local.get('apiKeys')).apiKeys || {};
    if (toolId === 'openai') {
      const key = keys['openai'];
      if (!key) throw new Error('No OpenAI API key configured in settings.');
      // Do actual call here. For security, you may want to proxy through your own server.
      // return await callOpenAI(key, prompt);

      // Placeholder response
      return `Demo trả lời (OpenAI) cho: ${prompt.substring(0,200)}`;
    }

    // For other tools, similar: use keys['google'], keys['anthropic']...
    return `Demo trả lời (${toolId}) cho: ${prompt.substring(0,200)}`;
  }

  btnSend.addEventListener('click', async () => {
    const tool = aiToolSelect.value;
    const prompt = promptEl.value.trim();
    if (!prompt) return;
    responseContent.textContent = 'Đang gửi...';
    try {
      const resp = await sendToAI(tool, prompt);
      responseContent.textContent = resp;
      await pushHistory(tool, prompt, resp);
    } catch (err) {
      responseContent.textContent = 'Lỗi: ' + err.message;
    }
  });

  // Upload image -> OCR
  btnUploadImage.addEventListener('click', ()=> imageInput.click());
  imageInput.addEventListener('change', async (ev)=>{
    const file = ev.target.files[0];
    if (!file) return;
    responseContent.textContent = 'Đang xử lý OCR...';
    const dataUrl = await readFileAsDataURL(file);
    const ocr = await runOCRFromDataUrl(dataUrl);
    responseContent.textContent = ocr;
  });

  // Capture region (screenshot + crop + OCR)
  btnCaptureRegion.addEventListener('click', async ()=>{
    responseContent.textContent = 'Yêu cầu chụp màn hình...';
    const result = await sendMessageToBackground({ type: 'captureVisibleTab' });
    if (!result || !result.success) {
      responseContent.textContent = 'Không thể chụp màn hình: ' + (result && result.error || 'unknown');
      return;
    }
    // Show overlay crop UI with returned dataUrl
    await startCropOverlay(result.dataUrl);
  });

  // PDF upload -> parse text -> show option to chat
  btnUploadPdf.addEventListener('click', ()=> pdfInput.click());
  pdfInput.addEventListener('change', async (ev)=>{
    const file = ev.target.files[0];
    if (!file) return;
    responseContent.textContent = 'Đang đọc PDF...';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(arrayBuffer);
      responseContent.textContent = 'Extracted text length: ' + text.length + '\n\n' + text.slice(0,2000);
      // Optionally send to AI
      const tool = aiToolSelect.value;
      const q = promptEl.value.trim() || 'Tóm tắt nội dung PDF';
      // combine or chunk: here simple demo
      const prompt = q + "\n\nContext from PDF:\n" + text.slice(0,20000); // be mindful of token limits
      const resp = await sendToAI(tool, prompt);
      responseContent.textContent = resp;
      await pushHistory(tool, q, resp);
    } catch(err){
      responseContent.textContent = 'Lỗi đọc PDF: ' + err.message;
    }
  });

  // Settings
  btnSettings.addEventListener('click', ()=> {
    // open options page
    chrome.runtime.sendMessage({ type: 'openOptions' });
  });

  btnClose.addEventListener('click', ()=> {
    // remove iframe by parent script
    parent.postMessage({ type: 'closeProSideAI' }, '*');
    // fallback: try remove self
    window.frameElement && window.frameElement.remove();
  });

  btnClearHistory.addEventListener('click', async ()=>{
    await chrome.storage.local.set({ proSideHistory: [] });
    renderHistory([]);
  });

  // Helper: read file to dataURL
  function readFileAsDataURL(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=> res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  // run OCR using Tesseract.js
  async function runOCRFromDataUrl(dataUrl) {
    responseContent.textContent = 'OCR đang chạy...';
    const worker = Tesseract.createWorker({
      logger: m => {
        // optional progress
        console.log('tess:', m);
      }
    });
    await worker.load();
    await worker.loadLanguage('eng+vie');
    await worker.initialize('eng+vie');
    const { data: { text } } = await worker.recognize(dataUrl);
    await worker.terminate();
    return text;
  }

  // Send message to background and await response
  function sendMessageToBackground(message){
    return new Promise((res)=>{
      chrome.runtime.sendMessage(message, (r)=> res(r));
    });
  }

  // Crop overlay flow
  async function startCropOverlay(imageDataUrl) {
    // show overlay, draw image on canvas and allow rectangle selection
    overlay.classList.remove('hidden');
    const img = new Image();
    img.src = imageDataUrl;
    await img.decode();

    // set canvas size to image natural size scaled to max constraints
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.9;
    let scale = Math.min(maxW / img.width, maxH / img.height, 1);
    overlayCanvas.width = img.width * scale;
    overlayCanvas.height = img.height * scale;
    const ctx = overlayCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, overlayCanvas.width, overlayCanvas.height);

    // selection rectangle
    let selecting = false;
    let startX=0,startY=0, currX=0,currY=0;
    function draw(){
      ctx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
      ctx.drawImage(img, 0, 0, overlayCanvas.width, overlayCanvas.height);
      if (selecting || (startX!==currX && startY!==currY)) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0,0,overlayCanvas.width, overlayCanvas.height);
        const x = Math.min(startX,currX), y = Math.min(startY,currY);
        const w = Math.abs(currX - startX), h = Math.abs(currY - startY);
        // clear selection area
        ctx.clearRect(x,y,w,h);
        // stroke
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1,y+1,w-2,h-2);
      }
    }

    overlayCanvas.onmousedown = (e)=>{
      selecting = true;
      const r = overlayCanvas.getBoundingClientRect();
      startX = e.clientX - r.left;
      startY = e.clientY - r.top;
      currX = startX; currY = startY;
      draw();
    };
    overlayCanvas.onmousemove = (e)=>{
      if (!selecting) return;
      const r = overlayCanvas.getBoundingClientRect();
      currX = e.clientX - r.left;
      currY = e.clientY - r.top;
      draw();
    };
    overlayCanvas.onmouseup = ()=> {
      selecting = false;
    };

    cropOk.onclick = async ()=>{
      // compute selection (if empty, use full image)
      const x = Math.min(startX,currX), y = Math.min(startY,currY);
      const w = Math.abs(currX - startX) || overlayCanvas.width;
      const h = Math.abs(currY - startY) || overlayCanvas.height;

      // extract imageData for the selection
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const tmpCtx = tmp.getContext('2d');
      tmpCtx.drawImage(overlayCanvas, x, y, w, h, 0, 0, w, h);
      const selDataUrl = tmp.toDataURL('image/png');

      overlay.classList.add('hidden');

      responseContent.textContent = 'OCR vùng đã chọn...';
      try {
        const text = await runOCRFromDataUrl(selDataUrl);
        responseContent.textContent = text;
      } catch(err){
        responseContent.textContent = 'Lỗi OCR: ' + err.message;
      }
    };

    cropCancel.onclick = ()=>{
      overlay.classList.add('hidden');
    };
  }

  // PDF extraction using pdf.js
  async function extractTextFromPdf(arrayBuffer) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(i=>i.str).join(' ');
      fullText += `\n\n--- Page ${i} ---\n` + pageText;
      // Optionally break early if too long
      if (fullText.length > 50000) break;
    }
    return fullText;
  }

  // Utility: read initial tools and history
  await loadTools();

  // Listen for messages from parent window to close iframe
  window.addEventListener('message', (ev)=>{
    if (ev.data && ev.data.type === 'closeProSideAI') {
      window.frameElement && window.frameElement.remove();
    }
  });

})();
