# Phác thảo triển khai

Không tạo config deploy thật trước TASK-001.

## 1. Environments

- local;
- preview;
- production.

Không dùng chung database production cho preview/local.

## 2. Vercel

- web và API deploy cùng project hoặc cấu trúc được TASK-001 chốt.
- env phân môi trường.
- cron daily digest.
- cron secret.

## 3. Supabase

- project riêng production.
- migration qua repository.
- không chỉnh schema thủ công production nếu không ghi migration.
- backup trước migration lớn.
- test restore trước vận hành thật.

## 4. Resend

- domain/from address hợp lệ.
- log provider ID.
- daily digest dedupe.
- xử lý free-tier quota bằng một digest/user/day.

## 5. Release gate

- migrations review.
- verification suite.
- E2E.
- secret scan.
- backup.
- rollback plan.
- smoke test.
