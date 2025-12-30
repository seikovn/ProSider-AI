// options.js - quản lý tools & API keys
(async function(){
  const keyOpen = document.getElementById('key-openai');
  const keyGoogle = document.getElementById('key-google');
  const keyAnthropic = document.getElementById('key-anthropic');
  const toolsContainer = document.getElementById('tools-container');
  const addToolBtn = document.getElementById('add-tool');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  function renderTools(list){
    toolsContainer.innerHTML = '';
    list.forEach((t, idx)=>{
      const div = document.createElement('div');
      div.className = 'tool-row';
      div.innerHTML = `<input type="text" data-idx="${idx}" class="tool-name" value="${t.name}"/>
        <select data-idx="${idx}" class="tool-enabled"><option value="1">Enabled</option><option value="0">Disabled</option></select>
        <button data-idx="${idx}" class="remove">X</button>`;
      const sel = div.querySelector('.tool-enabled');
      sel.value = t.enabled ? '1' : '0';
      toolsContainer.appendChild(div);

      div.querySelector('.remove').addEventListener('click', ()=>{
        list.splice(idx,1);
        renderTools(list);
      });
    });
  }

  async function load() {
    const data = await chrome.storage.local.get(['aiTools','apiKeys']);
    const tools = data.aiTools || [
      { id: 'openai', name: 'ChatGPT (OpenAI)', enabled: true },
      { id: 'google', name: 'Gemini (Google)', enabled: false },
      { id: 'anthropic', name: 'Claude (Anthropic)', enabled: false }
    ];
    renderTools(tools);

    const keys = data.apiKeys || {};
    keyOpen.value = keys.openai || '';
    keyGoogle.value = keys.google || '';
    keyAnthropic.value = keys.anthropic || '';
  }

  addToolBtn.addEventListener('click', ()=>{
    // push a new custom tool
    const data = []; // reconstruct from current
    const rows = toolsContainer.querySelectorAll('.tool-row');
    rows.forEach((r, idx)=> {
      const name = r.querySelector('.tool-name').value || `tool-${idx}`;
      const enabled = r.querySelector('.tool-enabled').value === '1';
      data.push({ id: 'custom-'+Date.now()+idx, name, enabled});
    });
    data.push({ id: 'custom-'+Date.now(), name: 'New Tool', enabled: true });
    renderTools(data);
  });

  saveBtn.addEventListener('click', async ()=>{
    // gather tools
    const rows = toolsContainer.querySelectorAll('.tool-row');
    const tools = [];
    rows.forEach((r, idx)=>{
      const name = r.querySelector('.tool-name').value || `tool-${idx}`;
      const enabled = r.querySelector('.tool-enabled').value === '1';
      const idAttr = r.querySelector('.tool-name').dataset.idx;
      tools.push({ id: 'custom-'+idx, name, enabled });
    });

    const apiKeys = {
      openai: keyOpen.value.trim(),
      google: keyGoogle.value.trim(),
      anthropic: keyAnthropic.value.trim()
    };

    await chrome.storage.local.set({ aiTools: tools, apiKeys });
    status.textContent = 'Đã lưu';
    setTimeout(()=> status.textContent = '', 2500);
  });

  await load();
})();
