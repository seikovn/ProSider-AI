// sidebar.js - logic iframe
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

  async function loadTools() {
    const data = await chrome.storage.local.get(['aiTools','apiKeys','proSideHistory']);
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
    const history = data.proSideHistory || [];
    renderHistory(history);
  }

  function renderHistory(history){
    historyList.innerHTML = '';
    history.slice().reverse().forEach(entry=>{
      const li = document.createElement('li');
      const time = new Date(entry.t).toLocaleString();
      li.innerHTML = `<strong style="color:#e6e6ee">${entry.tool}</strong> • ${time}<div style="margin-top:6px;color:#cfcfe8">${escapeHtml(entry.prompt)}</div><div style="margin-top:6px;color:#dcdcf0">${escapeHtml(entry.response)}</div>`;
      historyList.appendChild(li);
    });
  }

  function escapeHtml(s=''){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  async function pushHistory(tool,prompt,response){
    const existing = (await chrome.storage.local.get('proSideHistory')).proSideHistory || [];
    existing.push({ t: Date.now(), tool, prompt, response });
    const trimmed = existing.slice(-200);
    await chrome.storage.local.set({ proSideHistory: trimmed });
    renderHistory(trimmed);
  }

  async function sendToAI(toolId, prompt){
    const stored = await chrome.storage.local.get('apiKeys');
    const keys = stored.apiKeys || {};
    if (toolId === 'openai') {
      const key = keys['openai'];
      if (!key) throw new Error('Chưa cấu hình OpenAI API key trong Cài đặt.');
      const body = { model: 'gpt-3.5-turbo', messages: [{ role:'user', content: prompt }], max_tokens: 800, temperature: 0.6 };
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer '+key },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error('OpenAI lỗi: ' + resp.status + ' — ' + txt);
      }
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || JSON.stringify(data);
    }
    return `Demo trả lời (${toolId}) cho: ${prompt.substring(0,200)}`;
  }

  btnSend.addEventListener('click', async ()=>{
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

  btnUploadImage.addEventListener('click', ()=> imageInput.click());
  imageInput.addEventListener('change', async (ev)=>{
    const file = ev.target.files[0];
    if (!file) return;
    responseContent.textContent = 'Đang OCR...';
    const dataUrl = await readFileAsDataURL(file);
    const text = await runOCRFromDataUrl(dataUrl);
    responseContent.textContent = text;
  });

  btnCaptureRegion.addEventListener('click', async ()=>{
    responseContent.textContent = 'Yêu cầu chụp màn hình...';
    const result = await sendMessageToBackground({ type: 'captureVisibleTab' });
    if (!result || !result.success) {
      responseContent.textContent = 'Không thể chụp màn hình: ' + (result && result.error || 'unknown');
      return;
    }
    await startCropOverlay(result.dataUrl);
  });

  btnUploadPdf.addEventListener('click', ()=> pdfInput.click());
  pdfInput.addEventListener('change', async (ev)=>{
    const file = ev.target.files[0];
    if (!file) return;
    responseContent.textContent = 'Đang đọc PDF...';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(arrayBuffer);
      responseContent.textContent = text.slice(0, 3000) || 'Không trích xuất được';
      // Optionally send to AI
    } catch(err){
      responseContent.textContent = 'Lỗi đọc PDF: ' + err.message;
    }
  });

  btnSettings.addEventListener('click', ()=> chrome.runtime.sendMessage({ type: 'openOptions' }));
  btnClose.addEventListener('click', ()=> parent.postMessage({ type: 'closeProSideAI' }, '*'));
  btnClearHistory.addEventListener('click', async ()=> { await chrome.storage.local.set({ proSideHistory: [] }); renderHistory([]); });

  function readFileAsDataURL(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=> res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  async function runOCRFromDataUrl(dataUrl){
    responseContent.textContent = 'OCR đang chạy...';
    const worker = Tesseract.createWorker({ logger: m => console.log('tess:', m) });
    await worker.load();
    await worker.loadLanguage('eng+vie');
    await worker.initialize('eng+vie');
    const { data: { text } } = await worker.recognize(dataUrl);
    await worker.terminate();
    return text;
  }

  function sendMessageToBackground(message){
    return new Promise((res)=> chrome.runtime.sendMessage(message, (r)=> res(r)));
  }

  async function startCropOverlay(imageDataUrl){
    overlay.classList.remove('hidden');
    const img = new Image();
    img.src = imageDataUrl;
    await img.decode();
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.9;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    overlayCanvas.width = img.width * scale;
    overlayCanvas.height = img.height * scale;
    const ctx = overlayCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, overlayCanvas.width, overlayCanvas.height);

    let selecting = false;
    let startX=0,startY=0,currX=0,currY=0;
    function draw(){
      ctx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
      ctx.drawImage(img, 0, 0, overlayCanvas.width, overlayCanvas.height);
      if (selecting || (startX!==currX && startY!==currY)) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0,0,overlayCanvas.width, overlayCanvas.height);
        const x = Math.min(startX,currX), y = Math.min(startY,currY);
        const w = Math.abs(currX - startX), h = Math.abs(currY - startY);
        ctx.clearRect(x,y,w,h);
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
    overlayCanvas.onmouseup = ()=> selecting = false;

    cropOk.onclick = async ()=>{
      const x = Math.min(startX,currX), y = Math.min(startY,currY);
      const w = Math.abs(currX - startX) || overlayCanvas.width;
      const h = Math.abs(currY - startY) || overlayCanvas.height;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
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
    cropCancel.onclick = ()=> overlay.classList.add('hidden');
  }

  async function extractTextFromPdf(arrayBuffer){
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(i=>i.str).join(' ');
      fullText += `\n\n--- Page ${i} ---\n` + pageText;
      if (fullText.length > 50000) break;
    }
    return fullText;
  }

  await loadTools();
})();
