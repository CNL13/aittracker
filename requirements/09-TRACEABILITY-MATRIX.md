# Ma trận truy vết yêu cầu

| Nhóm | Yêu cầu chính | Dữ liệu | Trang/API nghiệp vụ | Acceptance |
|---|---|---|---|---|
| Auth | FR-AUTH-* | users, credentials, sessions, attempts | login, change-password, session admin | AC-AUTH-* |
| User | FR-USER-* | users, activity_logs | admin/users, profile | AC-USER-* |
| Project | FR-PRJ-* | projects, project_members | projects/detail | AC-PRJ-* |
| Task | FR-TSK-* | tasks, task_members | my-work, tasks, task detail | AC-TSK-* |
| Check-in | FR-CHK-* | daily_checkins/items | check-in/today, my-checkins, admin/checkins | AC-CHK-* |
| Blocker | FR-BLK-* | task_blockers | check-in, task detail, dashboard | AC-BLK-* |
| Kanban | FR-KAN-* | tasks, blockers | task Kanban | AC-KAN-* |
| Dashboard | FR-DASH-* | aggregate từ task/check-in | admin/dashboard | AC-DASH-* |
| Absence | FR-ABS-* | user_absences, non_working_days | admin/absences | AC-CHK-003/004 |
| Notification | FR-NOT-* | notifications_log | cron, email-log | AC-NOT-* |
| Audit | FR-AUD-* | activity_logs | admin/audit | AC-AUD-* |
| Search | FR-SRC-* | indexes từng miền | các trang list | AC-NFR-002 |
| Comments | FR-COM-* | comments | task detail P1 | nghiệm thu P1 |
| Documents | FR-DOC-* | documents | task/project P1 | nghiệm thu P1 |
| Settings | FR-SET-* | app_settings | config/server; UI P1 | AC-CHK/NOT |
| Security/NFR | SEC/NFR | toàn hệ thống | toàn hệ thống | AC-NFR-* |

## Checklist truy vết trước khi code một chức năng

Mỗi chức năng phải xác định:

1. Mã FR liên quan.
2. Quy tắc BR liên quan.
3. Bảng/trường bị tác động.
4. Vai trò và phạm vi dữ liệu.
5. Trang/trạng thái UI.
6. Acceptance scenarios.
7. Audit action.
8. Email/cảnh báo nếu có.
9. Transaction/idempotency/concurrency.
10. NFR/security áp dụng.

## Checklist thay đổi yêu cầu

Khi thay đổi một quyết định:

- cập nhật `DECISIONS.md`;
- cập nhật master;
- cập nhật FR;
- cập nhật BR;
- cập nhật data nếu cần;
- cập nhật permission;
- cập nhật UI;
- cập nhật acceptance;
- cập nhật matrix.
