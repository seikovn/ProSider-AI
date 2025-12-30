//content.js
(function() {
  // Tránh chạy 2 lần
  if (window.hasProSiderLoaded) return;
  window.hasProSiderLoaded = true;

  let sidebarIframe = null;
  let toggleButton = null;
  let textMenu = null;

  // 1. Tạo khung Sidebar
  function createSidebar() {
    sidebarIframe = document.createElement('iframe');
    sidebarIframe.src = chrome.runtime.getURL('sidebar.html');
    sidebarIframe.style.cssText = `
      position: fixed; top: 0; right: 0; width: 400px; height: 100vh;
      border: none; border-left: 1px solid #ccc;
      z-index: 2147483647; background: #fff;
      box-shadow: -5px 0 15px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
      transform: translateX(100%); /* Mặc định ẩn */
    `;
    document.body.appendChild(sidebarIframe);
  }

  // 2. Tạo nút Robot
  function createToggleButton() {
    toggleButton = document.createElement('div');
    toggleButton.innerHTML = '🤖'; 
    toggleButton.title = "Mở ProSider AI";
    toggleButton.style.cssText = `
      position: fixed; bottom: 30px; right: 30px; 
      width: 60px; height: 60px;
      background: linear-gradient(135deg, #4a90e2, #9013fe); 
      color: white; border-radius: 50%; 
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; cursor: pointer; z-index: 2147483647;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    `;
    toggleButton.onclick = () => toggleSidebar(true);
    document.body.appendChild(toggleButton);
  }

  // 3. Hàm Đóng/Mở
  function toggleSidebar(show) {
    if (show) {
      sidebarIframe.style.transform = 'translateX(0)';
      toggleButton.style.display = 'none';
    } else {
      sidebarIframe.style.transform = 'translateX(100%)';
      toggleButton.style.display = 'flex';
    }
  }

  // 4. Gửi tin nhắn cho Sidebar (Đã sửa lỗi delay)
  function sendToSidebar(promptText) {
    console.log("ProSider: Gửi lệnh ->", promptText);
    toggleSidebar(true); // Mở sidebar lên
    
    // Gửi tin nhắn ngay lập tức
    if (sidebarIframe && sidebarIframe.contentWindow) {
      sidebarIframe.contentWindow.postMessage({ type: 'AUTO_PROMPT', text: promptText }, '*');
    }
  }

  // 5. Xử lý bôi đen văn bản
  function handleTextSelection(event) {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    // Xóa menu cũ nếu có
    removeMenu();

    if (text.length > 0) {
      textMenu = document.createElement('div');
      textMenu.style.cssText = `
        position: absolute; left: ${event.pageX + 5}px; top: ${event.pageY + 10}px;
        background: #222; color: #fff; padding: 6px; border-radius: 6px;
        z-index: 2147483648; display: flex; gap: 8px; 
        font-family: sans-serif; font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: default; /* Tránh đổi con trỏ chuột */
      `;

      // Nút Dịch
      const btnTranslate = document.createElement('button');
      btnTranslate.innerText = 'Dịch 🇻🇳';
      btnTranslate.style.cssText = 'background:#4a90e2; border:none; color:white; border-radius:4px; padding:4px 8px; cursor:pointer; font-weight:bold;';
      
      // SỰ KIỆN CLICK (Đã sửa lỗi)
      btnTranslate.onclick = (e) => {
        // e.stopPropagation() và e.preventDefault() giúp chặn các hành động thừa
        e.stopPropagation(); 
        e.preventDefault();
        sendToSidebar('Dịch đoạn này sang tiếng Việt: ' + text);
        removeMenu(); // Tự xóa menu sau khi bấm
      };
      
      // Nút Giải thích
      const btnExplain = document.createElement('button');
      btnExplain.innerText = 'Giải thích 🧠';
      btnExplain.style.cssText = 'background:#f5a623; border:none; color:white; border-radius:4px; padding:4px 8px; cursor:pointer; font-weight:bold;';
      
      btnExplain.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        sendToSidebar('Giải thích đoạn này dễ hiểu cho học sinh lớp 7: ' + text);
        removeMenu();
      };

      textMenu.appendChild(btnTranslate);
      textMenu.appendChild(btnExplain);
      document.body.appendChild(textMenu);
    }
  }

  function removeMenu() {
    if (textMenu) {
      textMenu.remove();
      textMenu = null;
    }
  }

  // Khởi động
  createSidebar();
  createToggleButton();

  // --- PHẦN QUAN TRỌNG ĐÃ SỬA ---
  // Chỉ hiện menu khi nhả chuột ra (mouseup)
  document.addEventListener('mouseup', (event) => {
    // Nếu click vào chính cái menu thì ĐỪNG làm gì cả (để nút bấm hoạt động)
    if (textMenu && textMenu.contains(event.target)) {
      return;
    }
    handleTextSelection(event);
  });

  // Chỉ xóa menu khi nhấn chuột RA NGOÀI menu
  document.addEventListener('mousedown', (event) => {
    if (textMenu && !textMenu.contains(event.target)) {
      removeMenu();
    }
  });

  // Lắng nghe lệnh đóng từ Sidebar
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLOSE_SIDEBAR') {
      toggleSidebar(false);
    }
  });

})();
