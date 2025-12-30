```markdown
# Pro Sider AI - Chrome Extension (scaffold)

Mục tiêu: một assistant xuất hiện dạng cửa sổ bên phải (sidebar/floating iframe) có:
- Chọn công cụ AI (ChatGPT, Gemini, Claude, ...)
- Quản lý API keys (trên trang Options)
- Lưu lịch sử tương tác
- OCR: upload ảnh hoặc chụp vùng màn hình
- Chat với PDF: upload PDF -> trích xuất text -> hỏi AI

Hướng dẫn cài đặt (local, unpacked):
1. Mở Chrome > chrome://extensions/
2. Bật "Developer mode".
3. "Load unpacked" -> chọn thư mục chứa các file ở trên.
4. Truy cập một trang web bất kì; extension sẽ inject sidebar bên phải.

Lưu ý triển khai:
- Các hàm gọi API (sendToAI) là placeholder. Bạn phải triển khai cách gọi tới OpenAI/Anthropic/Google... và lưu API keys trong Options.
- Bảo mật: lưu API keys chỉ trong chrome.storage. Tránh gọi trực tiếp từ content script nếu bạn không muốn lộ key; cân nhắc proxy server.
- OCR: sử dụng Tesseract.js (đã thêm CDN). Nếu muốn giảm kích thước, có thể xử lý trên server.
- PDF: sử dụng pdf.js (CDN).

Storage schema (gợi ý):
- aiTools: [{id, name, enabled}, ...]
- apiKeys: { openai: "...", google: "...", anthropic: "..." }
- proSideHistory: [{t:timestamp, tool, prompt, response}, ...]

Tiếp theo bạn có thể:
- Triển khai hàm sendToAI cho từng provider (OpenAI Chat Completions / HTTP to Anthropic / Google Vertex AI / Deepseek).
- Thêm UI để hiển thị token usage, costs, trạng thái kết nối.
- Thêm authentication flow (OAuth) nếu muốn (vd. Google).
```
