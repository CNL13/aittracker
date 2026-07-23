# AIT Work Tracker

Bộ nền tảng sạch để bắt đầu dự án AIT Work Tracker bằng Antigravity và Codex.

Gói này chứa:

1. Bộ yêu cầu v3.0 — nguồn sự thật duy nhất.
2. Kiến trúc kỹ thuật sơ bộ bám đúng yêu cầu.
3. Hướng dẫn phối hợp Antigravity và Codex.
4. Skills/rules/workflows dùng chung.
5. Backlog P0 đã tạo lại từ yêu cầu v3.0.
6. Prompt khởi động cho từng agent.

Gói này **chưa chứa mã nguồn ứng dụng**. Agent đầu tiên phải thực hiện `TASK-001`.

## Nguồn sự thật

Thứ tự ưu tiên:

1. `requirements/DECISIONS.md`
2. `requirements/00-MASTER-SRS.md`
3. `requirements/01-FUNCTIONAL-REQUIREMENTS.md`
4. `requirements/02-BUSINESS-RULES.md`
5. Các tài liệu yêu cầu còn lại
6. `docs/`
7. `tasks/`

Nếu task hoặc tài liệu kỹ thuật mâu thuẫn với requirements, requirements được ưu tiên và task phải được sửa trước khi code.

## Không có trong gói

Các nội dung sau đã chủ động loại bỏ:

- `aitwork-app-spec(3).md` và mọi spec cũ;
- `docs/product-spec.md` cũ;
- backlog 14 task cũ;
- GAP review, validation report và manifest nội bộ;
- `.env.example`, CI, Vercel config và scripts giả định trước khi scaffold;
- comments/documents trong P0;
- plugin và cấu hình MCP không cần thiết;
- bất kỳ mã nguồn app thử nghiệm nào.

## Bắt đầu

Đọc `START-HERE.md`.
