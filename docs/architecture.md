# Kiến trúc kỹ thuật baseline

## 1. Mục tiêu

Kiến trúc này cụ thể hóa requirements v3.0 nhưng không thay đổi nghiệp vụ.

## 2. Sơ đồ logic

```text
Browser
  └─ React + Vite + TypeScript
       └─ HTTPS /api/*
            └─ Vercel Functions — Node.js/TypeScript
                 ├─ Auth/session service
                 ├─ Authorization policy
                 ├─ Validation
                 ├─ Business services
                 ├─ Transaction/repository layer
                 ├─ Supabase Postgres
                 ├─ Resend
                 └─ Cron endpoints
```

## 3. Nguyên tắc

- Không service-role key ở browser.
- Không business rule quan trọng chỉ nằm ở UI.
- API lấy actor từ session.
- Ngày nghiệp vụ tính ở server theo Asia/Ho_Chi_Minh.
- Query được scope theo quyền từ database/repository.
- Transaction bao trùm các mutation được yêu cầu atomic.
- Email chạy sau commit.
- Dashboard aggregate ở server/database.
- Schema giữ `users.id` làm định danh nghiệp vụ để nâng cấp auth sau.

## 4. Cấu trúc source đề xuất sau TASK-001

```text
apps/
  web/
    src/
      app/
      components/
      features/
      lib/
      routes/
      styles/
api/
  _shared/
  auth/
  users/
  projects/
  tasks/
  checkins/
  blockers/
  dashboard/
  absences/
  audit/
  notifications/
packages/
  contracts/
  validation/
  domain/
supabase/
  migrations/
  seeds/
tests/
  unit/
  integration/
  e2e/
```

Có thể điều chỉnh trong TASK-001 nếu vẫn giữ các ranh giới trên.

## 5. Các lớp backend

1. Handler: HTTP, request ID, response.
2. Auth middleware: session.
3. Authorization: role/membership/owner.
4. Validation: schema.
5. Service: nghiệp vụ.
6. Repository: SQL.
7. Transaction boundary.
8. Audit/notification event sau hoặc trong transaction theo quy tắc.

## 6. Session

- Browser nhận cookie opaque.
- Server hash/HMAC token để lookup.
- User locked/inactive làm session không hợp lệ.
- Reset password thu hồi session.
- Không dùng localStorage.

## 7. Concurrency

- `tasks.version`.
- Update theo `WHERE id=? AND version=?`.
- Không match → 409.
- Check-in unique user/date.
- Idempotency key cho submit và cron.

## 8. Error contract

- 400 invalid request.
- 401 unauthenticated.
- 403 forbidden.
- 404 not found trong phạm vi quyền.
- 409 conflict.
- 422 business validation nếu chọn dùng.
- 429 rate limited.
- 500 generic production error.

Không trả stack trace production.
