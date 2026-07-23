# API contracts baseline

Tất cả endpoint dưới `/api`.

## 1. Chuẩn response

Success:

```json
{
  "data": {},
  "meta": {},
  "requestId": "..."
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "fields": {}
  },
  "requestId": "..."
}
```

Không trả internal stack/SQL.

## 2. Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `POST /auth/change-password`

Admin session:

- `GET /admin/users/:id/sessions`
- `POST /admin/users/:id/sessions/revoke-all`

## 3. Users

- `GET /admin/users`
- `POST /admin/users`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/reset-password`
- `POST /admin/users/:id/lock`
- `POST /admin/users/:id/unlock`
- `POST /admin/users/:id/deactivate`

## 4. Projects

- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `POST /projects/:id/status`
- `GET /projects/:id/members`
- `POST /projects/:id/members`
- `DELETE /projects/:id/members/:userId`

## 5. Tasks

- `GET /tasks`
- `POST /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `POST /tasks/:id/status`
- `POST /tasks/:id/reopen`
- `POST /tasks/:id/archive`
- `PUT /tasks/:id/members`

Mutation task phải gửi version.

## 6. My work/check-in

- `GET /me/tasks`
- `GET /me/checkins`
- `GET /me/checkins/:date`
- `GET /checkins/today/context`
- `PUT /checkins/today`

`PUT /checkins/today` dùng idempotency key.

## 7. Blockers

- `GET /tasks/:id/blockers`
- `POST /tasks/:id/blockers`
- `POST /blockers/:id/resolve`
- `POST /blockers/:id/dismiss`

## 8. Dashboard

- `GET /admin/dashboard`
- `GET /admin/dashboard/members`
- `GET /admin/checkins`
- `GET /admin/checkins/:id`
- `PATCH /admin/checkins/:id`

## 9. Absence/calendar

- `GET /admin/absences`
- `POST /admin/absences`
- `PATCH /admin/absences/:id`
- `DELETE /admin/absences/:id`
- `GET /admin/non-working-days`
- `POST /admin/non-working-days`
- `DELETE /admin/non-working-days/:date`

## 10. Audit/notifications

- `GET /admin/audit`
- `GET /admin/notification-log`
- `POST /admin/notification-log/:id/resend`
- `POST /cron/daily-digest`

## 11. Pagination/filter

- `page`, `pageSize`.
- max pageSize 100.
- sort allowlist.
- filter validate server.
- filter admin pages lưu trong URL.

## 12. Permission

Mỗi endpoint phải tham chiếu FR/permission matrix trong implementation notes và tests.
