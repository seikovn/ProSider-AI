// inject.js - chèn sidebar (iframe) vào mọi trang
(function() {
  if (window.__proSideAIInjected) return;
  window.__proSideAIInjected = true;

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('sidebar.html');
  iframe.id = 'pro-side-ai-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.right = '0';
  iframe.style.height = '100vh';
  iframe.style.width = '420px';
  iframe.style.zIndex = '2147483647';
  iframe.style.border = '0';
  iframe.style.boxShadow = '0 0 12px rgba(0,0,0,0.35)';
  iframe.style.background = 'transparent';
  iframe.style.transition = 'transform 0.2s ease';
  iframe.style.transform = 'translateX(0)';

  document.documentElement.appendChild(iframe);

  // allow closing via postMessage (sidebar can postMessage to parent)
  window.addEventListener('message', (ev) => {
    if (ev.data && ev.data.type === 'closeProSideAI') {
      const el = document.getElementById('pro-side-ai-iframe');
      if (el) el.remove();
    }
  });
})();
