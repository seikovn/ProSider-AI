// inject.js
// Chèn một iframe sidebar vào page (right fixed panel). Nếu đã có thì không chèn lại.

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
  iframe.style.transition = 'transform 0.2s ease';
  // start hidden (transform) to allow toggling later if needed
  iframe.style.transform = 'translateX(0)';

  document.documentElement.appendChild(iframe);
})();
