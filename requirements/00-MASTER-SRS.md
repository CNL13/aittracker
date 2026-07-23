# AIT Work Tracker — Software Requirements Specification v3.0

## 1. Mục đích

Xây dựng ứng dụng web quản lý công việc và báo cáo tiến độ hằng ngày cho nhóm nghiên cứu AIT, quy mô ban đầu từ 30 đến 100 thành viên.

Ứng dụng phải giúp trưởng nhóm trả lời nhanh các câu hỏi:

- Hôm nay từng thành viên đang làm gì?
- Ai đã gửi báo cáo, ai chưa gửi, ai gửi muộn?
- Tiến độ từng task và dự án đang ở mức nào?
- Task nào sắp đến hạn, quá hạn hoặc chưa được đặt hạn?
- Ai đang gặp blocker hoặc cần hỗ trợ?
- Ai đã thay đổi deadline, người phụ trách, trạng thái hoặc tiến độ?
- Những cảnh báo nào đã được gửi và có gửi thất bại hay không?

Ứng dụng không được thiết kế như một bảng Kanban đơn thuần. Giá trị cốt lõi là:

1. check-in hằng ngày nhanh trong 1–2 phút;
2. dashboard giám sát đúng theo điều kiện nghiệp vụ;
3. lịch sử thay đổi có thể kiểm tra;
4. cảnh báo đủ sớm để trưởng nhóm can thiệp.

## 2. Đối tượng sử dụng

### 2.1. Admin/Trưởng nhóm

Admin quản trị toàn hệ thống:

- tài khoản;
- dự án;
- thành viên dự án;
- task và phân công;
- ngày nghỉ, miễn báo cáo;
- dashboard và lịch sử;
- reset mật khẩu;
- email lỗi và gửi lại;
- cấu hình nghiệp vụ được cho phép.

### 2.2. Thành viên

Thành viên:

- xem dự án và task mình tham gia;
- xem người cùng tham gia một task;
- cập nhật tiến độ cá nhân;
- owner cập nhật tiến độ/trạng thái tổng thể;
- gửi check-in hằng ngày;
- tạo blocker và yêu cầu hỗ trợ;
- xem lịch sử liên quan đến task mình tham gia;
- bình luận và gắn link tài liệu khi P1 được bật.

## 3. Phạm vi phát hành

### 3.1. P0 — Điều kiện nghiệm thu MVP

- Custom username/password và session.
- Quản lý tài khoản.
- Quản lý dự án và thành viên dự án.
- Quản lý task, owner, collaborator, reviewer.
- Trang Công việc của tôi.
- Check-in một lần/người/ngày.
- Quản lý blocker.
- Dashboard trưởng nhóm.
- Kanban.
- Quản lý ngày nghỉ và miễn báo cáo.
- Cảnh báo due soon, overdue, blocked, missing/late check-in.
- Email tổng hợp và email blocker.
- Audit log.
- Tìm kiếm, lọc, sắp xếp, phân trang.
- Responsive mobile/desktop.
- Kiểm tra quyền ở backend.
- Tiêu chí bảo mật và phi chức năng bắt buộc.

### 3.2. P1 — Sau khi P0 ổn định

- Bình luận trong task.
- Liên kết Google Drive/OneDrive.
- Avatar.
- Trang lịch sử task nâng cao.
- Cấu hình nghiệp vụ qua giao diện.
- Phân tích không tăng tiến độ nhiều ngày.

### 3.3. P2 — Ngoài MVP

- Upload file dung lượng lớn.
- Gantt/Timeline.
- Lịch nâng cao.
- Xuất Excel/PDF/Word.
- Báo cáo tuần/tháng tự động.
- Telegram/Teams.
- SSO.
- Ứng dụng native.
- Phụ thuộc task, subtask, recurring task.
- Chấm công, tính lương hoặc đánh giá KPI tự động.

## 4. Ràng buộc kỹ thuật đã chọn

- Frontend: React + Vite + TypeScript.
- Backend: Node.js + TypeScript trên Vercel Functions.
- Database: Supabase Postgres.
- Storage: Supabase Storage cho file nhỏ; link ngoài là chính.
- Email: Resend.
- Cron: Vercel Cron.
- Deploy: GitHub → Vercel.
- Múi giờ nghiệp vụ: `Asia/Ho_Chi_Minh`.
- Frontend không được tiếp xúc với service-role key hoặc database credential.
- Mọi dữ liệu nghiệp vụ đi qua backend API.
- Không dùng Supabase Auth trong MVP.

## 5. Mô hình trạng thái

### 5.1. User

- `active`: được sử dụng hệ thống.
- `locked`: bị khóa do admin hoặc bảo mật; không đăng nhập được.
- `inactive`: đã rời nhóm; không đăng nhập, dữ liệu lịch sử vẫn giữ.

### 5.2. Project

- `planning`: đang chuẩn bị.
- `active`: đang thực hiện.
- `paused`: tạm dừng; member chỉ đọc.
- `completed`: đã kết thúc; chỉ đọc, có thể mở lại bởi admin.
- `archived`: ẩn khỏi luồng hoạt động thông thường; chỉ đọc.

### 5.3. Task workflow

- `todo`: chưa bắt đầu.
- `in_progress`: đang thực hiện.
- `waiting`: đang chờ phản hồi, dữ liệu hoặc quyết định.
- `done`: hoàn thành.

`blocked`, `overdue`, `due_soon` và `no_due_date` là cờ tính toán, không phải workflow status.

### 5.4. Check-in

- `submitted_on_time`: lần gửi đầu tiên không muộn hơn 17:00.
- `submitted_late`: lần gửi đầu tiên sau 17:00.
- `missing`: thuộc diện bắt buộc nhưng chưa gửi.
- `not_required`: không thuộc diện bắt buộc.
- `exempt`: được miễn báo cáo/nghỉ.
- `non_working_day`: ngày không làm việc.

## 6. Luồng nghiệp vụ chính

### 6.1. Tạo tài khoản

1. Admin nhập username, họ tên, email tùy chọn và thông tin cơ bản.
2. Hệ thống kiểm tra username chuẩn hóa chưa tồn tại và chưa từng được dùng.
3. Admin nhập hoặc yêu cầu hệ thống sinh mật khẩu tạm.
4. Hệ thống hash mật khẩu và tạo tài khoản `active`.
5. `must_change_password = true`.
6. Mật khẩu tạm chỉ được hiển thị một lần; không được ghi log hoặc gửi email dạng rõ.
7. Hoạt động tạo tài khoản được ghi audit log.

### 6.2. Đăng nhập lần đầu

1. Người dùng nhập username/password.
2. Hệ thống trả cùng một thông báo cho username sai và password sai.
3. Nếu hợp lệ, tạo session cookie.
4. Nếu `must_change_password = true`, người dùng chỉ được truy cập trang đổi mật khẩu và đăng xuất.
5. Sau khi đổi thành công, session cũ được thu hồi theo chính sách và người dùng vào app.

### 6.3. Tạo dự án và phân công

1. Admin tạo dự án.
2. Admin thêm thành viên active vào dự án.
3. Task chỉ được giao cho thành viên đang thuộc dự án.
4. Mỗi task phải có đúng một owner.
5. Collaborator/reviewer là tùy chọn.
6. Nếu loại owner, phải chọn owner mới trong cùng thao tác.
7. Dự án archived/completed là chỉ đọc.

### 6.4. Check-in hằng ngày

Một người được yêu cầu check-in khi đồng thời:

- user `active`;
- hôm nay là ngày làm việc;
- không thuộc thời gian miễn báo cáo;
- là thành viên đang hoạt động của ít nhất một task có `report_required = true`;
- task thuộc project `active`;
- task chưa `done`, chưa archived;
- task đã đến ngày bắt đầu hoặc không có ngày bắt đầu.

Luồng:

1. Trang tự tải các task đủ điều kiện.
2. Người dùng chọn task đã làm và nhập cập nhật.
3. Nếu không làm task nào, chọn “Không phát sinh công việc” và nhập lý do.
4. Collaborator cập nhật tiến độ cá nhân.
5. Owner có thể đề xuất/cập nhật tiến độ tổng thể và trạng thái task.
6. Người dùng có thể tạo blocker.
7. Backend lưu check-in, items, thay đổi task và blocker trong một transaction.
8. Gửi email diễn ra sau khi transaction thành công.
9. Lần gửi đầu tiên quyết định on-time/late; chỉnh sửa sau đó không thay đổi trạng thái đúng hạn.

### 6.5. Dashboard

Dashboard mặc định hiển thị ngày hiện tại và có bộ lọc dự án, thành viên, trạng thái, ưu tiên, khoảng ngày.

Dashboard phải có:

- tổng task đang hoạt động;
- task todo/in progress/waiting/done;
- task overdue;
- task due soon;
- task blocked;
- task chưa đặt hạn;
- thành viên required;
- thành viên submitted on time;
- thành viên submitted late;
- thành viên missing;
- thành viên exempt/not required;
- danh sách yêu cầu hỗ trợ;
- liên kết drill-down từ số liệu đến danh sách nguồn.

## 7. Quy tắc dữ liệu quan trọng

- ID nghiệp vụ dùng UUID.
- Ngày nghiệp vụ tính ở server theo timezone hệ thống.
- Không tin `user_id`, `role`, `checkin_date`, `created_by` từ frontend.
- Không xóa cứng user/project/task/check-in đã có lịch sử.
- Username không phân biệt hoa/thường và không được tái sử dụng.
- Task phải có đúng một owner đang hoạt động.
- Một user chỉ có một check-in/ngày.
- Một task chỉ xuất hiện tối đa một lần trong một check-in.
- `percent_complete` từ 0 đến 100.
- Chuyển `done` đặt 100%; mở lại phải đặt lại trạng thái và ghi log.
- Cập nhật task phải dùng optimistic locking.
- Email phải có `dedupe_key` để không gửi trùng.
- Audit log không chứa password, hash, token hoặc secret.

## 8. Quy tắc quyền và nhìn thấy

- Member không được gọi API admin bằng request thủ công.
- Member chỉ xem task đang hoặc từng được phân công cho mình nếu quyền lịch sử cho phép.
- Trong task chung, member thấy:
  - nội dung task;
  - owner/collaborator/reviewer;
  - bình luận;
  - blocker;
  - cập nhật gắn trực tiếp với task đó.
- Member không thấy:
  - check-in tổng quát của người khác;
  - task khác không liên quan;
  - email cá nhân, trạng thái đăng nhập, audit log hệ thống;
  - dữ liệu quản trị tài khoản.
- Admin thấy toàn bộ dữ liệu nghiệp vụ cần quản trị.
- Dữ liệu archived vẫn chỉ xem theo cùng quy tắc quyền.

## 9. Quy tắc cảnh báo màu

Đánh giá màu của thành viên theo thứ tự ưu tiên:

1. **Đỏ**: có task overdue hoặc blocker mở.
2. **Vàng**: có task due soon hoặc có yêu cầu hỗ trợ chưa xử lý.
3. **Xám**: thuộc diện phải check-in nhưng chưa gửi; sau cutoff được coi là missing.
4. **Xanh**: đã check-in, không có điều kiện đỏ/vàng.
5. **Không màu/N/A**: không phải báo cáo, được miễn hoặc ngày nghỉ.

Một người vừa overdue vừa chưa check-in phải hiển thị đỏ, không hiển thị xám.

## 10. Email

### 10.1. Thành viên

Trong ngày làm việc, email tổng hợp chỉ gửi khi người dùng có email và có ít nhất một nội dung cần chú ý:

- chưa check-in;
- task due soon;
- task overdue;
- blocker mở;
- yêu cầu hỗ trợ hoặc phản hồi liên quan.

Tối đa một daily digest/user/ngày.

### 10.2. Admin

Admin nhận một bản tổng hợp/ngày làm việc, gồm:

- danh sách missing/late;
- task overdue/due soon;
- blocker mở;
- yêu cầu hỗ trợ;
- tài khoản cần chú ý;
- email gửi lỗi.

Blocker mới gửi cảnh báo ngay cho các admin active, một lần/blocker/admin.

### 10.3. Lỗi gửi

- Lỗi phải ghi `failed`.
- Không rollback dữ liệu nghiệp vụ vì email lỗi.
- Admin có thể gửi lại.
- Gửi lại phải có quy tắc dedupe và audit log.

## 11. Yêu cầu giao diện

- Toàn bộ tiếng Việt.
- Mobile-first cho check-in.
- Desktop ưu tiên dashboard và quản trị.
- Form phải có loading, empty, success, validation error, permission denied, conflict và network error.
- Nội dung đang nhập không bị mất khi request lỗi.
- Các thao tác nguy hiểm phải xác nhận.
- Thông báo lỗi không lộ chi tiết hệ thống.
- Mỗi số liệu dashboard có thể mở danh sách nguồn.
- Ngày hiển thị theo `dd/MM/yyyy`, giờ theo 24 giờ.
- Các nút và form chính dùng được bằng bàn phím.

## 12. Yêu cầu bảo mật

- Password chỉ lưu hash Argon2id hoặc bcrypt phù hợp.
- Cookie session: `httpOnly`, `Secure` production, `SameSite=Lax`, `Path=/`.
- Token gốc không lưu database; chỉ lưu HMAC/hash.
- Rate limit đăng nhập theo username và IP.
- Không tiết lộ tài khoản có tồn tại.
- Lock/inactive/reset password phải thu hồi session.
- Kiểm tra Origin/Referer cho mutation.
- Validation tại server.
- Service-role key chỉ ở backend.
- Log phải loại bỏ credential và dữ liệu nhạy cảm.
- Không cho admin cuối cùng tự khóa/vô hiệu hóa/hạ quyền.
- Không cho sửa migration đã áp dụng; tạo migration mới.

## 13. Yêu cầu phi chức năng

### 13.1. Quy mô mục tiêu

- 30–100 người dùng ban đầu.
- Tối thiểu 10.000 task và 100.000 check-in items mà không phải đổi mô hình dữ liệu.
- Tối thiểu 20 phiên hoạt động đồng thời trong quy mô MVP.

### 13.2. Hiệu năng mục tiêu

Trong điều kiện mạng và hạ tầng bình thường:

- API đọc danh sách phổ biến: p95 không quá 1,5 giây.
- Dashboard ngày hiện tại: p95 không quá 3 giây.
- Gửi check-in: p95 không quá 2 giây, không tính thời gian gửi email.
- First usable content của trang check-in trên mobile: mục tiêu dưới 3 giây.
- Danh sách lớn phải phân trang; không tải toàn bộ lịch sử cùng lúc.

### 13.3. Độ tin cậy

- Check-in và thay đổi liên quan phải atomic.
- Cron chạy lại không gửi email trùng.
- Xung đột cập nhật task trả `409`, không âm thầm ghi đè.
- Lỗi email không làm mất check-in.
- Trước migration lớn phải có backup/export.

### 13.4. Khả năng sử dụng

- Người dùng thông thường hoàn thành check-in trong 1–2 phút khi cập nhật 1–3 task.
- Mobile tối thiểu 360 px chiều rộng.
- Hỗ trợ hai phiên bản ổn định gần nhất của Chrome, Edge, Safari và Firefox.
- Không phụ thuộc hover cho chức năng chính.

## 14. Điều kiện hoàn thành MVP

MVP chỉ hoàn thành khi:

- toàn bộ P0 có tiêu chí nghiệm thu đạt;
- không có lỗi phân quyền mức nghiêm trọng/cao;
- không lộ secret;
- luồng admin tạo user → đổi password → giao task → check-in → dashboard hoạt động end-to-end;
- cảnh báo missing/late/overdue/blocked đúng công thức;
- email có chống gửi trùng;
- audit log đủ cho hành động quan trọng;
- giao diện check-in sử dụng tốt trên mobile;
- tài liệu triển khai và phục hồi dữ liệu được chuẩn bị.
