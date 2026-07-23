# Kế hoạch triển khai bảo mật

## 1. Password

Ưu tiên Argon2id; bcrypt là fallback.

- 8–128 ký tự.
- Password tạm ≥12 ký tự ngẫu nhiên.
- Không log.
- Không email plaintext.
- `must_change_password`.

## 2. Session

- Opaque random token.
- Cookie httpOnly, Secure production, SameSite=Lax.
- DB lưu HMAC/hash.
- Idle 12 giờ, absolute 7 ngày.
- Revoke khi logout/reset/lock/inactive.
- Kiểm tra user status mỗi request hoặc cache cực ngắn có cơ chế revoke.

## 3. Brute force

- Shared store/database.
- Username + IP window.
- Generic response.
- Audit/security log.
- Không rate-limit chỉ bằng RAM function.

## 4. Authorization tests

Bắt buộc kiểm thử:

- member gọi admin API;
- collaborator đổi task tổng thể;
- user đọc task khác;
- user đưa user_id giả;
- gỡ owner không owner mới;
- admin cuối cùng;
- historical check-in;
- blocker dismiss;
- archived/paused project mutation.

## 5. CSRF/CORS

- SameSite cookie.
- Origin/Referer allowlist cho mutation.
- CORS không wildcard credentials.
- Cron secret.
- Không GET mutation.

## 6. Secrets/logging

- Environment server only.
- Redaction.
- Request ID.
- Không log body login/change-password.
- Không in `.env`.
