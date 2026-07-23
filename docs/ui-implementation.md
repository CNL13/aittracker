# Baseline triển khai UI

Nguồn chi tiết: `requirements/05-UI-UX-REQUIREMENTS.md`.

## 1. Routes P0

Member:

- `/login`
- `/change-password`
- `/my-work`
- `/check-in/today`
- `/my-checkins`
- `/projects`
- `/projects/:id`
- `/tasks/:id`
- `/profile`

Admin thêm:

- `/admin/dashboard`
- `/admin/users`
- `/admin/users/:id`
- `/admin/projects`
- `/admin/tasks`
- `/admin/checkins`
- `/admin/absences`
- `/admin/audit`
- `/admin/email-log`

## 2. UI primitives

- App shell.
- Protected route.
- Role guard.
- Form field/error.
- Confirm dialog.
- Toast/status.
- Empty state.
- Loading skeleton.
- Pagination.
- Filter bar.
- Status/priority badges.
- Error boundary.
- Conflict dialog.

## 3. Check-in UX

Ưu tiên cao nhất:

- tối ưu 360 px;
- tự liệt kê task;
- chọn task đã làm;
- note ngắn;
- member percent;
- owner controls;
- blocker/help;
- no activity;
- local draft;
- submit một lần.

## 4. Dashboard

- Cards có drill-down.
- Bảng member có text + màu.
- Filter đồng bộ.
- Không tính count từ list chưa đủ.
- Hiển thị update time.

## 5. Kanban

- Blocked là cột động.
- Mobile có list mode/scroll.
- Drag chỉ owner/admin.
- rollback lỗi.
- conflict 409.

## 6. Accessibility

- Keyboard.
- Focus.
- Label.
- Không màu-only.
- Tap target.
- Modal focus.
