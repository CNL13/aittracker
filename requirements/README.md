# AIT Work Tracker — Bộ yêu cầu đầy đủ v3.0

Đây là **bộ tài liệu yêu cầu**, chưa chứa mã nguồn, task cho agent, workflow phát triển hoặc script triển khai.

## Mục tiêu của bộ tài liệu

Bộ tài liệu này được dùng làm nguồn sự thật trước khi:

- thiết kế giao diện;
- thiết kế database/API chi tiết;
- giao việc cho Antigravity và Codex;
- bắt đầu viết mã nguồn;
- kiểm thử và nghiệm thu MVP.

## Thứ tự đọc

1. `00-MASTER-SRS.md` — đặc tả tổng thể.
2. `01-FUNCTIONAL-REQUIREMENTS.md` — yêu cầu chức năng có mã định danh.
3. `02-BUSINESS-RULES.md` — điều kiện và công thức nghiệp vụ.
4. `03-DATA-REQUIREMENTS.md` — dữ liệu, ràng buộc và vòng đời.
5. `04-PERMISSIONS-AND-VISIBILITY.md` — quyền và phạm vi nhìn thấy dữ liệu.
6. `05-UI-UX-REQUIREMENTS.md` — trang, luồng và trạng thái giao diện.
7. `06-DASHBOARD-AND-NOTIFICATIONS.md` — dashboard, cảnh báo, email.
8. `07-SECURITY-AND-NONFUNCTIONAL.md` — bảo mật và yêu cầu phi chức năng.
9. `08-ACCEPTANCE-CRITERIA.md` — tiêu chí nghiệm thu theo kịch bản.
10. `09-TRACEABILITY-MATRIX.md` — đối chiếu yêu cầu với màn hình, dữ liệu và kiểm thử.
11. `10-SCOPE-AND-FUTURE.md` — phạm vi MVP và phần để sau.
12. `DECISIONS.md` — các quyết định đã chốt để tránh agent tự suy diễn.

## Nguyên tắc sử dụng

- Khi có mâu thuẫn, `00-MASTER-SRS.md` và `DECISIONS.md` được ưu tiên.
- Không tự thêm chức năng ngoài phạm vi MVP chỉ vì “có vẻ hữu ích”.
- Không bỏ qua tiêu chí nghiệm thu vì giao diện đã chạy được.
- Mọi thay đổi nghiệp vụ phải cập nhật đồng thời tài liệu yêu cầu và ma trận truy vết.

## Phiên bản

- Phiên bản: 3.0
- Trạng thái: Baseline yêu cầu MVP
- Ngôn ngữ giao diện: Tiếng Việt
- Múi giờ nghiệp vụ: `Asia/Ho_Chi_Minh`
