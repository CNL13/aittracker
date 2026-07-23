# Phạm vi, không thuộc phạm vi và hướng mở rộng

## 1. P0 — MVP bắt buộc

- Username/password, session, RBAC.
- User lifecycle.
- Project/task lifecycle.
- Assignment.
- My Work.
- Check-in.
- Absence/non-working days.
- Blocker.
- Dashboard.
- Kanban.
- Email.
- Audit.
- Search/filter/pagination.
- Responsive.
- Security/NFR.

## 2. P1 — Sau MVP P0

- Comments.
- Link tài liệu.
- Avatar upload.
- Advanced task history.
- Admin UI settings.
- Trend/stagnation analysis.
- CSV import users.
- In-app notification cơ bản.

P1 không được dùng làm lý do trì hoãn nghiệm thu P0, trừ khi người dùng thay đổi phạm vi bằng văn bản.

## 3. P2 — Tương lai

- Supabase Auth/SSO.
- Project manager role thực thi đầy đủ.
- Gantt/calendar.
- Reports/export.
- Weekly/monthly automation.
- Telegram/Teams.
- Native app.
- File management nâng cao.
- Subtask/dependency/recurring.
- Public API/webhook.
- KPI/chấm công.

## 4. Không thuộc bài toán

Ứng dụng không:

- theo dõi màn hình/máy tính của thành viên;
- tự suy đoán người dùng đang làm gì nếu họ không báo cáo;
- tính lương;
- chấm điểm cá nhân tự động;
- thay thế hệ thống quản trị nhân sự;
- thay thế kho tài liệu chuyên dụng;
- tự động đọc nội dung Google Drive nếu chưa tích hợp;
- gửi password rõ qua email;
- cho agent AI tự thay đổi nghiệp vụ khi chưa duyệt.

## 5. Đường nâng cấp auth

MVP giữ `users.id` là định danh nghiệp vụ.

Khi thêm Supabase Auth/SSO:

- tạo/điền `external_identities`;
- thay lớp login/session;
- giữ khóa ngoại task/check-in/comment theo users.id;
- có kế hoạch migrate session;
- không cần đổi toàn bộ dữ liệu nghiệp vụ.

## 6. Điều kiện chuyển từ P0 sang P1

- E2E chính đạt.
- Không lỗi quyền nghiêm trọng.
- Dashboard count được đối chiếu.
- Check-in ổn định ít nhất một chu kỳ thử nghiệm.
- Email dedupe hoạt động.
- Có backup/restore thử nghiệm.
