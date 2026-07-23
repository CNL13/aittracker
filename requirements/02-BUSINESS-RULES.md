# Quy tắc nghiệp vụ chi tiết

## BR-01 — Chuẩn hóa username

`normalized_username = lowercase(trim(username))`

- Không cho phép khoảng trắng ở giữa.
- Cho phép chữ cái ASCII, số, dấu `.`, `_`, `-`.
- Độ dài 3–50.
- Username hiển thị có thể giữ dạng người dùng nhập, nhưng uniqueness và login dùng dạng chuẩn.
- Username đã từng thuộc user inactive không được cấp lại.

## BR-02 — Ai phải check-in?

Một user được đánh dấu `required` trong ngày D khi tất cả điều kiện đúng:

1. `users.status = active`;
2. D theo timezone `Asia/Ho_Chi_Minh`;
3. D thuộc `working_weekdays`;
4. D không tồn tại trong `non_working_days`;
5. user không có exemption bao phủ D;
6. tồn tại ít nhất một task member active:
   - `task_members.removed_at IS NULL`;
   - `task_members.report_required = true`;
   - task chưa archived;
   - task status khác done;
   - task start date null hoặc `start_date <= D`;
   - project status = active;
   - project chưa archived.

Chỉ cần một task thỏa mãn là user required.

## BR-03 — Trạng thái check-in ngày

Với user và ngày D:

- `non_working_day`: D không phải ngày làm việc.
- `exempt`: user có exemption.
- `not_required`: ngày làm việc nhưng không có task cần báo cáo.
- `submitted_on_time`: required và `first_submitted_at <= cutoff`.
- `submitted_late`: required và `first_submitted_at > cutoff`.
- `missing`:
  - trước cutoff: dùng nhãn “chưa gửi”, chưa coi là vi phạm thời hạn;
  - từ cutoff đến hết ngày: missing;
  - sau ngày D: vẫn missing nếu chưa có check-in.

Thứ tự đánh giá: non-working → exempt → not required → submitted → missing.

## BR-04 — Hạn check-in

- Cutoff mặc định: 17:00.
- User được gửi trước hoặc sau cutoff.
- `first_submitted_at` không thay đổi khi sửa.
- Sửa trong ngày không biến late thành on-time.
- Sau 23:59:59, member không sửa.
- Admin sửa lịch sử bắt buộc nhập `edit_reason` tối thiểu 10 ký tự.

## BR-05 — Check-in hợp lệ

Check-in hợp lệ khi một trong hai trường hợp:

### Có làm task

- Có ít nhất một item.
- Mỗi item có `progress_note` không rỗng.
- Task thuộc phạm vi user.
- Task không lặp.
- Phần trăm hợp lệ 0–100.
- Time spent nếu có từ 0 đến 24.

### Không phát sinh công việc

- `no_activity = true`.
- Không có item hoặc item chỉ dùng để báo blocker theo thiết kế đã duyệt.
- `no_activity_reason` bắt buộc, tối thiểu 10 ký tự.
- Có thể chọn reason category: chờ phản hồi, họp/đào tạo, nghỉ đột xuất chưa duyệt, công việc khác, khác.

## BR-06 — Tiến độ cá nhân và tổng thể

- `member_percent_complete`: phần việc cá nhân của người check-in.
- `tasks.percent_complete`: tiến độ tổng thể.
- Collaborator/reviewer không được cập nhật tổng thể.
- Owner/admin có thể cập nhật tổng thể.
- Không tự tính trung bình member percent để ra task percent.
- Task percent không được giảm nếu status done, trừ thao tác reopen có log.
- Chuyển done → percent 100.
- Đặt percent 100 không tự động done; UI hỏi owner/admin có chuyển done không.

## BR-07 — Chuyển trạng thái task

Cho phép owner/admin:

- todo ↔ in_progress;
- todo/in_progress ↔ waiting;
- todo/in_progress/waiting → done;
- done → todo/in_progress/waiting bằng thao tác reopen.

Điều kiện:

- Project phải active, trừ admin reopen project/task.
- Chuyển done ghi `completed_at`.
- Reopen xóa/đặt lại `completed_at`, tăng version và ghi log.
- Blocked không phải trạng thái kéo thả.

## BR-08 — Blocker

Blocker mở khi `status = open`.

- Một user tối đa một blocker mở/task.
- Mô tả bắt buộc 10–2000 ký tự.
- Reporter, owner hoặc admin được resolve.
- Chỉ admin được dismiss.
- Resolve/dismiss cần note.
- Khi còn ít nhất một blocker mở, task có flag blocked.
- Khi blocker cuối cùng đóng, flag blocked mất.
- Alert chỉ tạo khi blocker mới được tạo, không khi chỉnh sửa.

## BR-09 — Overdue và due soon

Với ngày D:

`overdue = due_date < D AND status != done AND archived_at IS NULL`

`due_soon = due_date >= D AND due_date <= D + N ngày làm việc AND status != done`

- N mặc định 2 ngày làm việc.
- Bỏ qua cuối tuần và `non_working_days`.
- Task không due date: `no_due_date = true`.
- Task blocked vẫn có thể overdue/due soon.

## BR-10 — Màu thành viên

Tính trên tập task sau filter dashboard:

1. Red nếu có overdue hoặc blocker mở.
2. Yellow nếu không red và có due soon hoặc help request mở.
3. Gray nếu không red/yellow và required nhưng chưa gửi.
4. Green nếu không red/yellow/gray và đã gửi.
5. N/A nếu exempt/not required/non-working-day.

## BR-11 — Project lifecycle

- Planning: admin sửa, tạo member/task; member không phải check-in.
- Active: hoạt động đầy đủ.
- Paused: member chỉ đọc; không required check-in từ task của project này.
- Completed: chỉ đọc; không required.
- Archived: ẩn mặc định, chỉ đọc.
- Không chuyển completed nếu còn task active.
- Reopen completed → active, có audit.

## BR-12 — Gỡ thành viên

### Khỏi task

- Giữ assignment lịch sử bằng `removed_at`.
- Nếu là owner, phải chọn owner mới.
- Check-in cũ vẫn tham chiếu user/task bình thường.
- Sau khi gỡ, user không tạo cập nhật mới cho task.

### Khỏi project

- Phải xử lý tất cả assignment active trước.
- Không xóa lịch sử.
- User mất quyền xem dữ liệu mới; vẫn có thể xem lịch sử của chính mình theo chính sách đã chốt, nhưng không xem nội dung mới sau thời điểm gỡ.

## BR-13 — Email

- Member digest chỉ gửi khi có nội dung.
- Admin summary gửi ngày làm việc.
- User không email → skipped.
- Dedupe key:
  - `member-digest:{userId}:{date}`
  - `admin-digest:{adminId}:{date}`
  - `blocker-alert:{blockerId}:{adminId}`
- Manual resend tạo attempt mới nhưng liên kết notification gốc; không được tạo vô hạn mà không log.

## BR-14 — Quy tắc audit

Bắt buộc log:

- user create/update/lock/unlock/deactivate/reset;
- project create/update/status/member changes;
- task create/update/archive/assignment/status/percent/deadline/priority;
- blocker create/resolve/dismiss;
- historical check-in edit;
- email manual resend;
- app setting change.

Không log:

- plaintext password;
- password hash;
- token/cookie;
- service-role key;
- toàn bộ nội dung request nhạy cảm.

## BR-15 — Xung đột cập nhật

- Task có `version`.
- Client gửi version đang thấy.
- Nếu DB version khác, trả 409.
- Không merge tự động các trường task.
- UI hiển thị dữ liệu mới và cho người dùng thực hiện lại.
- Check-in cùng user/date dùng unique constraint; request lặp với idempotency key không tạo bản ghi trùng.

## BR-16 — Xóa mềm

- User: inactive.
- Project/task: archived timestamp.
- Comment/document: deleted timestamp.
- Check-in không xóa qua UI.
- Audit log không xóa qua UI.
