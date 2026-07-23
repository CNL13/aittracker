# AIT Work Tracker — Instructions for Coding Agents

Áp dụng cho Codex, Antigravity và mọi coding agent làm việc trong repository.

## 1. Mục tiêu

Xây dựng AIT Work Tracker cho nhóm nghiên cứu AIT từ 30–100 thành viên, tập trung vào:

- quản lý dự án và task;
- một check-in/người/ngày;
- dashboard biết ai đang làm gì;
- blocker, due soon, overdue, missing và late check-in;
- custom username/password;
- audit và email có chống gửi trùng.

Đây không phải Trello thuần và không phải hệ thống chấm công.

## 2. Nguồn sự thật bắt buộc

Ưu tiên:

1. `requirements/DECISIONS.md`
2. `requirements/00-MASTER-SRS.md`
3. `requirements/01-FUNCTIONAL-REQUIREMENTS.md`
4. `requirements/02-BUSINESS-RULES.md`
5. `requirements/03-DATA-REQUIREMENTS.md`
6. `requirements/04-PERMISSIONS-AND-VISIBILITY.md`
7. `requirements/05-UI-UX-REQUIREMENTS.md`
8. `requirements/06-DASHBOARD-AND-NOTIFICATIONS.md`
9. `requirements/07-SECURITY-AND-NONFUNCTIONAL.md`
10. `requirements/08-ACCEPTANCE-CRITERIA.md`
11. `requirements/09-TRACEABILITY-MATRIX.md`
12. `requirements/10-SCOPE-AND-FUTURE.md`

Không dùng file spec cũ ngoài thư mục `requirements/`.

## 3. Baseline kỹ thuật

- React + Vite + TypeScript.
- Node.js + TypeScript trên Vercel Functions.
- Supabase Postgres.
- Supabase Storage chỉ cho file nhỏ ở P2; link ngoài là chính ở P1.
- Resend email.
- Vercel Cron.
- Custom username/password trong MVP.
- Opaque server-side session bằng httpOnly cookie.
- Frontend không gọi database bằng service-role key.
- Mọi dữ liệu nghiệp vụ đi qua backend API.

Không tự chuyển sang Next.js, Supabase Auth hoặc framework khác nếu chưa có quyết định mới.

## 4. Phạm vi P0

Chỉ triển khai P0 được ghi trong requirements.

Không tự thêm:

- comments;
- document links;
- uploads;
- Gantt;
- export;
- Telegram;
- SSO;
- subtask/dependencies;
- chấm công/KPI.

## 5. Trước khi code

Agent phải:

1. Đọc task.
2. Xác định FR/BR/AC liên quan.
3. Đọc data, permissions, UI và security tương ứng.
4. Kiểm tra dependency của task.
5. Ghi kế hoạch ngắn.
6. Liệt kê file dự kiến sửa.
7. Kiểm tra không có agent khác sở hữu cùng file.
8. Chuyển task sang active trước khi sửa.

Nếu yêu cầu mâu thuẫn hoặc không đủ, dừng và ghi rõ vấn đề; không tự đoán.

## 6. Trong khi code

- Backend kiểm tra authentication, authorization và validation.
- Không tin `user_id`, `role`, ngày nghiệp vụ hoặc creator từ client.
- Mutation quan trọng dùng transaction.
- Task mutation dùng optimistic locking.
- Request lặp cần idempotency khi yêu cầu quy định.
- Không hardcode secret.
- Không log password, hash, token hoặc service role key.
- Không sửa migration đã áp dụng.
- Không hard-delete dữ liệu lịch sử.
- Không query tất cả rồi lọc quyền ở client.
- Không dùng `any` nếu không có lý do và giải thích.
- Không thay đổi schema/API ngoài task mà không cập nhật docs.

## 7. Sau khi code

Agent phải:

1. Format.
2. Typecheck.
3. Lint.
4. Chạy test liên quan.
5. Chạy test quyền và validation liên quan.
6. Đối chiếu acceptance criteria.
7. Cập nhật task:
   - file đã sửa;
   - test đã chạy;
   - kết quả;
   - vấn đề còn lại;
   - migration nếu có.
8. Đưa task sang review.
9. Không tự đánh dấu done trước review độc lập.

## 8. Phối hợp Antigravity–Codex

- Một task: một implementer, một reviewer.
- Reviewer không sửa trực tiếp branch/worktree của implementer.
- Review ghi nhận xét trong task hoặc artifact review.
- Hai task có file chồng lấn không chạy song song.
- Database migration và API contract phải được review trước UI phụ thuộc.
- Agent làm UI phải dùng API contract đã duyệt.
- Agent làm backend không tự thiết kế UI thay vì đọc UI requirements.

Phân vai mặc định:

- Codex: database, auth, API, transaction, validation, tests, refactor.
- Antigravity: plan, UI, responsive, browser verification, E2E, walkthrough.
- Đây là mặc định, không phải giới hạn tuyệt đối.

## 9. Git và file safety

Cấm khi chưa có người dùng cho phép rõ:

- `git push --force`;
- `git reset --hard`;
- xóa working tree có thay đổi;
- sửa lịch sử migration;
- chạy destructive production command;
- đọc/in toàn bộ `.env`;
- commit secret;
- merge khi test fail.

Ưu tiên branch/worktree riêng theo task.

## 10. Definition of Done

Task chỉ done khi:

- scope đạt;
- FR/BR/AC liên quan đạt;
- test đạt;
- không lỗi quyền;
- không secret;
- docs/API/schema được cập nhật;
- reviewer xác nhận;
- không còn issue blocker chưa ghi nhận.

## 11. Quy tắc cập nhật tài liệu

Khi đổi nghiệp vụ:

- không sửa requirements âm thầm;
- tạo đề xuất thay đổi;
- sau khi người dùng duyệt mới sửa DECISIONS, SRS, FR, BR, data, permissions, UI, AC và traceability.

Khi đổi kiến trúc:

- cập nhật `docs/`;
- tạo ADR nếu ảnh hưởng toàn hệ thống;
- cập nhật task phụ thuộc.
