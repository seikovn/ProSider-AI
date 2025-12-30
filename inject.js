// inject.js
// Chèn một iframe sidebar vào page (right fixed panel). Nếu đã có thì không chèn lại.
// Cải tiến: append vào document.body, và lắng nghe message từ iframe để remove.

// Nếu đã inject thì bỏ qua
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
  iframe.style.boxShadow = '0 0 12px rgba(0,0,0,0.3)';
  iframe.style.background = 'white';
  iframe.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  iframe.style.transform = 'translateX(0)'; // visible by default
  iframe.setAttribute('aria-hidden', 'false');

  // Append to body (safer than documentElement)
  const parentEl = document.body || document.documentElement;
  parentEl.appendChild(iframe);

  // Listen for postMessage from iframe to close/remove it.
  function onMessage(ev) {
    // For safety, check shape of message
    try {
      const data = ev.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'closeProSideAI') {
        // remove iframe if still present
        const el = document.getElementById('pro-side-ai-iframe');
        if (el && el.parentNode) el.parentNode.removeChild(el);
        // also cleanup listener
        window.removeEventListener('message', onMessage);
        // unset flag so future injections possible
        window.__proSideAIInjected = false;
      }
    } catch (err) {
      // ignore bad message
      console.warn('ProSider: message handler error', err);
    }
  }
  window.addEventListener('message', onMessage, false);

  // Optional: allow closing by receiving a specific custom event (from page)
  window.addEventListener('ProSideAIClose', function() {
    const el = document.getElementById('pro-side-ai-iframe');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    window.removeEventListener('message', onMessage);
    window.__proSideAIInjected = false;
  }, false);
})();
