# Thiết kế database baseline

Nguồn chi tiết: `requirements/03-DATA-REQUIREMENTS.md`.

## 1. Bảng P0

- users
- user_credentials
- auth_sessions
- auth_login_attempts
- external_identities
- projects
- project_members
- tasks
- task_members
- daily_checkins
- daily_checkin_items
- task_blockers
- user_absences
- non_working_days
- activity_logs
- notifications_log
- app_settings

Comments/documents không thuộc P0.

## 2. Quan hệ chính

```text
users
 ├─ credentials
 ├─ sessions
 ├─ project_members ─ projects
 ├─ task_members ─ tasks ─ projects
 ├─ daily_checkins ─ daily_checkin_items ─ tasks
 ├─ task_blockers
 ├─ user_absences
 ├─ activity_logs
 └─ notifications_log
```

## 3. Bất biến database

- normalized_username unique, không tái sử dụng.
- một check-in/user/date.
- một item/check-in/task.
- một task member active/user/task.
- đúng một owner active/task.
- một blocker open/reporter/task.
- due date không trước start date.
- percent 0–100.
- done → 100 và completed_at.
- notification dedupe unique.
- không enum blocked/overdue trong task status.

## 4. Migration order

1. Extensions/types.
2. users/auth.
3. projects/members.
4. tasks/task_members.
5. checkins/items.
6. blockers/absence/calendar.
7. audit/notifications/settings.
8. indexes/constraints.
9. bootstrap admin seed.

## 5. Bootstrap admin

Không commit password cố định.

Phương án:

- script seed nhận username/password từ secure input/env;
- hash trong script;
- từ chối nếu admin đã tồn tại;
- không in password;
- sau tạo có thể bắt đổi password.

## 6. Soft delete/lifecycle

- user → inactive.
- project/task → archived.
- history không xóa.
- assignment dùng removed_at.
- audit/notification không xóa qua app.

## 7. Index

Bắt buộc đối chiếu lại dataset và query plan trước release:

- username;
- status/role;
- project/status;
- task due/status/project;
- active memberships;
- checkin user/date;
- blocker task/status;
- audit entity/time;
- notification dedupe.
