# Các quyết định đã chốt cho MVP

Các quyết định dưới đây thay thế phần “cần chốt” của bản đặc tả trước.

| Mã | Quyết định MVP |
|---|---|
| DEC-001 | Đăng nhập bằng `username/password`; tài khoản do admin tạo. |
| DEC-002 | Không dùng Supabase Auth trong MVP; dữ liệu hồ sơ và credential phải tách riêng để nâng cấp sau. |
| DEC-003 | Dùng opaque session token lưu trong cookie `httpOnly`; session có thể thu hồi. |
| DEC-004 | MVP có hai vai trò hệ thống: `admin` và `member`. |
| DEC-005 | Mỗi task có đúng một owner đang hoạt động; có thể có nhiều collaborator/reviewer. |
| DEC-006 | Owner được chuyển task sang `done`; admin có thể mở lại. |
| DEC-007 | Thành viên chỉ xem đầy đủ task mình tham gia. Trong task chung, họ thấy người tham gia, bình luận và cập nhật gắn với task đó; không thấy check-in tổng quát hoặc task khác của người khác. |
| DEC-008 | Ngày làm việc mặc định từ thứ Hai đến thứ Sáu. Ngày nghỉ chung và miễn báo cáo cá nhân có thể được admin khai báo. |
| DEC-009 | Giờ chốt check-in là 17:00 theo `Asia/Ho_Chi_Minh`. Gửi sau 17:00 vẫn được nhận nhưng bị đánh dấu `late`. |
| DEC-010 | Người dùng có thể sửa check-in của ngày hiện tại đến 23:59. Ngày cũ chỉ admin sửa, bắt buộc nhập lý do và ghi audit log. |
| DEC-011 | Một người gửi một check-in mỗi ngày; trong check-in có thể cập nhật nhiều task. |
| DEC-012 | Thành viên không làm task nào trong ngày vẫn phải check-in bằng lựa chọn “Không phát sinh công việc” và nhập lý do nếu họ thuộc diện bắt buộc báo cáo. |
| DEC-013 | Tiến độ cá nhân không tự ghi đè tiến độ tổng thể. Chỉ owner/admin cập nhật tiến độ và trạng thái tổng thể của task. |
| DEC-014 | `blocked` và `overdue` là trạng thái tính toán, không phải workflow status được lưu trong `tasks.status`. |
| DEC-015 | Email không bắt buộc để đăng nhập; tài khoản không có email sẽ không nhận nhắc qua email và dashboard admin phải hiển thị tình trạng này. |
| DEC-016 | Thời gian làm việc là trường tùy chọn, không dùng để chấm công hoặc đánh giá hiệu suất trong MVP. |
| DEC-017 | Quản lý miễn báo cáo/nghỉ phép và ngày nghỉ chung là P0 vì ảnh hưởng trực tiếp đến cảnh báo “chưa cập nhật”. |
| DEC-018 | Bình luận và liên kết tài liệu là P1; upload file trực tiếp không phải điều kiện nghiệm thu P0. |
| DEC-019 | Không có xóa cứng dữ liệu nghiệp vụ đã phát sinh lịch sử. |
| DEC-020 | Dự án `archived` là chỉ đọc; không tạo check-in mới cho task thuộc dự án archived. |
| DEC-021 | Khi muốn xóa owner khỏi task, admin phải chỉ định owner thay thế trong cùng thao tác. |
| DEC-022 | Admin không được khóa, vô hiệu hóa hoặc hạ quyền admin cuối cùng của hệ thống. |
| DEC-023 | Task không có hạn hoàn thành được phép tồn tại nhưng không được tính `due_soon/overdue`; dashboard có bộ lọc “Chưa đặt hạn”. |
| DEC-024 | Cột Kanban “Bị vướng” là cột động. Task có blocker mở chỉ xuất hiện tại cột này, nhưng vẫn giữ workflow status để trở lại đúng cột sau khi blocker được giải quyết. |
