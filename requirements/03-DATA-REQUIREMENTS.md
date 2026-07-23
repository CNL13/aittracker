# Yêu cầu dữ liệu và từ điển dữ liệu

## 1. Quy ước chung

- Primary key: UUID.
- Timestamp lưu UTC; chuyển sang `Asia/Ho_Chi_Minh` khi tính/người dùng xem.
- `created_at`, `updated_at` bắt buộc ở bảng thay đổi được.
- Foreign key phải khai báo rõ.
- Không dùng array để lưu collaborators.
- Không lưu overdue/blocked thành task status.
- Không lưu plaintext password/session token.
- Giá trị enum phải có constraint hoặc kiểu enum tương đương.
- Trường text phải có giới hạn ở server và database khi phù hợp.

## 2. `users`

| Trường | Bắt buộc | Yêu cầu |
|---|:---:|---|
| id | Có | UUID |
| username | Có | unique theo normalized username, 3–50 |
| normalized_username | Có | lowercase/trim, unique |
| full_name | Có | 1–120 |
| email | Không | email hợp lệ, tối đa 254 |
| role | Có | admin/member |
| status | Có | active/locked/inactive |
| must_change_password | Có | default true khi tạo/reset |
| avatar_url | Không | URL hợp lệ |
| department | Không | tối đa 120 |
| position | Không | tối đa 120 |
| last_login_at | Không | timestamp |
| created_by | Không | FK users; null cho bootstrap |
| created_at/updated_at | Có | timestamp |
| deactivated_at | Không | chỉ khi inactive |

Bất biến:

- Không tái sử dụng normalized username.
- Tối thiểu một admin active.
- User inactive không có session active.

## 3. `user_credentials`

| Trường | Bắt buộc | Yêu cầu |
|---|:---:|---|
| user_id | Có | PK/FK users |
| password_hash | Có | Argon2id/bcrypt |
| password_changed_at | Có | timestamp |
| failed_login_count | Có | default 0 |
| last_failed_login_at | Không | timestamp |
| locked_until | Không | timestamp |
| created_at/updated_at | Có | timestamp |

## 4. `auth_sessions`

- id UUID.
- token_hash unique.
- user_id FK.
- created_at, last_seen_at, expires_at.
- revoked_at nullable.
- user_agent tối đa 500.
- ip_hash nullable.
- Index user_id + revoked_at + expires_at.
- Session hợp lệ khi chưa revoked, chưa absolute expire, chưa idle expire và user active.

## 5. `auth_login_attempts`

- id.
- normalized_username.
- ip_hash.
- success boolean.
- attempted_at.
- failure_reason mã nội bộ, không trả client.
- Retention đề xuất 90 ngày.
- Index username/time và IP/time.

## 6. `external_identities`

Dùng cho tương lai:

- id.
- user_id.
- provider.
- provider_user_id.
- created_at.
- Unique provider/provider_user_id.

MVP không dùng để đăng nhập.

## 7. `projects`

| Trường | Bắt buộc | Yêu cầu |
|---|:---:|---|
| id | Có | UUID |
| name | Có | 1–200 |
| description | Không | tối đa 10.000 |
| status | Có | planning/active/paused/completed/archived |
| start_date | Không | date |
| due_date | Không | date >= start_date nếu cả hai có |
| manager_id | Không | dự phòng |
| created_by | Có | admin |
| created_at/updated_at | Có | timestamp |
| archived_at | Không | khi archived |

Tên dự án không bắt buộc unique, nhưng UI phải cảnh báo tên trùng.

## 8. `project_members`

- project_id FK.
- user_id FK.
- project_role manager/member/viewer.
- joined_at.
- removed_at nullable.
- Partial unique active project/user.
- Chỉ user active được thêm.
- MVP có thể lưu role member; admin là quyền hệ thống.

## 9. `tasks`

| Trường | Bắt buộc | Yêu cầu |
|---|:---:|---|
| id | Có | UUID |
| project_id | Có | FK |
| title | Có | 1–250 |
| description | Không | tối đa 20.000 |
| start_date | Không | date |
| due_date | Không | date |
| priority | Có | low/medium/high |
| status | Có | todo/in_progress/waiting/done |
| percent_complete | Có | integer 0–100 |
| version | Có | integer >=1 |
| created_by | Có | FK |
| status_changed_at | Có | timestamp |
| completed_at | Không | chỉ done |
| archived_at | Không | soft delete |
| created_at/updated_at | Có | timestamp |

Constraints:

- due date >= start date khi cả hai có.
- done → percent 100 và completed_at khác null.
- status khác done → completed_at null, trừ dữ liệu migration được xử lý.
- version tăng mỗi mutation.
- Không có enum blocked/overdue.

## 10. `task_members`

- task_id.
- user_id.
- assignment_role owner/collaborator/reviewer.
- report_required boolean.
- assigned_at.
- removed_at.
- Partial unique task/user active.
- Partial unique đúng một owner active/task.
- Owner và collaborator default report required true.
- Reviewer default false.

## 11. `daily_checkins`

| Trường | Bắt buộc | Yêu cầu |
|---|:---:|---|
| id | Có | UUID |
| user_id | Có | FK |
| checkin_date | Có | server date |
| summary_today | Không | tối đa 5.000 |
| no_activity | Có | boolean |
| no_activity_reason | Không | bắt buộc nếu no_activity |
| general_difficulties | Không | tối đa 3.000 |
| help_needed | Không | tối đa 3.000 |
| plan_tomorrow | Không | tối đa 3.000 |
| total_time_spent_hours | Không | decimal 0–24 |
| first_submitted_at | Có | bất biến |
| updated_at | Có | timestamp |
| edited_by_admin_at | Không | timestamp |
| admin_edit_reason | Không | bắt buộc khi admin sửa ngày cũ |

Unique user/checkin_date.

## 12. `daily_checkin_items`

- id.
- checkin_id.
- task_id.
- progress_note 1–5.000.
- member_percent_complete nullable 0–100.
- proposed/applied task percent nullable 0–100.
- proposed/applied task status nullable.
- time_spent_hours nullable 0–24.
- help_needed nullable.
- created_at/updated_at.
- Unique checkin/task.
- Tổng item time không bắt buộc bằng total time; nếu cả hai có, UI cảnh báo chênh lệch nhưng không chặn.

## 13. `task_blockers`

- id.
- task_id.
- reported_by.
- checkin_item_id nullable.
- description 10–2.000.
- status open/resolved/dismissed.
- created_at.
- resolved_at/by/note.
- Partial unique open task/reporter.
- resolved/dismissed → resolved_at/by/note bắt buộc.

## 14. `user_absences`

- id.
- user_id.
- start_date/end_date.
- reason 0–1.000.
- approved_by.
- created_at/updated_at.
- end >= start.
- Chồng lấn phải được phát hiện.

## 15. `non_working_days`

- work_date PK.
- name 1–200.
- created_by.
- created_at.
- Không tạo trùng ngày.

## 16. `comments` — P1

- id, task_id, user_id.
- content 1–5.000.
- created_at/updated_at/deleted_at.
- Không hard delete.
- Comment sau khi user rời task vẫn giữ lịch sử.

## 17. `documents` — P1/P2

- id.
- project_id.
- task_id nullable.
- name.
- document_type.
- storage_type link/upload.
- url_or_path.
- mime_type/size nullable.
- uploaded_by.
- version_label nullable.
- timestamps/deleted_at.
- Nếu task_id có, task phải thuộc project_id.
- Link bắt buộc https.
- Upload P2 có size/MIME allowlist.

## 18. `activity_logs`

- id.
- actor_id nullable.
- actor_type user/system.
- entity_type.
- entity_id.
- action code ổn định.
- old_values/new_values JSONB đã lọc.
- request_id.
- created_at.
- Không update/delete qua ứng dụng.
- Index entity/time, actor/time, action/time.

## 19. `notifications_log`

- id.
- recipient_user_id nullable.
- notification_date.
- notification_type.
- channel email.
- status pending/sent/failed/skipped.
- dedupe_key unique.
- provider_message_id.
- error_code/error_message an toàn.
- original_notification_id cho resend.
- created_at/sent_at.
- Không lưu body chứa secret.

## 20. `app_settings`

Các key P0:

- timezone.
- working_weekdays.
- checkin_cutoff.
- due_soon_working_days.
- session_idle_hours.
- session_absolute_days.
- member_digest_enabled.
- admin_digest_enabled.

P0 có thể cấu hình bằng seed/env; P1 mới cần UI.

## 21. Transaction bắt buộc

Một transaction cho:

- tạo task + task members;
- thay owner;
- gửi check-in + items + blocker + task changes;
- reset password + revoke sessions;
- deactivate user + revoke sessions;
- project member removal sau khi xử lý assignments;
- archive project/task khi cập nhật dữ liệu liên quan.

## 22. Dữ liệu không được hard delete

- users;
- projects;
- tasks;
- check-ins/items;
- blockers;
- activity logs;
- notifications logs.

## 23. Index tối thiểu

- users normalized_username.
- users status/role.
- task project/status.
- task due_date/status.
- task member user/removed_at.
- checkin user/date.
- checkin item task.
- blocker task/status/time.
- project member user/removed_at.
- audit entity/time và actor/time.
- notification dedupe unique.
