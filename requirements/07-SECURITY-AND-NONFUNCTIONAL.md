# Yêu cầu bảo mật và phi chức năng

## SEC — Bảo mật

### Password

- Hash bằng Argon2id; bcrypt chỉ là phương án tương thích.
- Không dùng hash nhanh trực tiếp.
- Password 8–128 ký tự.
- Không trùng username chuẩn hóa.
- Password tạm tự sinh tối thiểu 12 ký tự ngẫu nhiên.
- Không log hoặc gửi email plaintext password.
- Mật khẩu tạm hiển thị một lần.

### Session

- Token ngẫu nhiên entropy cao.
- DB chỉ lưu HMAC/hash.
- Cookie httpOnly, Secure production, SameSite=Lax, Path=/.
- Idle expiry 12 giờ; absolute 7 ngày.
- `last_seen_at` cập nhật có kiểm soát, không ghi DB mỗi request nếu gây tải.
- Reset/lock/inactive thu hồi toàn bộ.
- Logout thu hồi hiện tại.

### Login protection

- 5 lần sai/15 phút là cấu hình mặc định.
- Rate limit cả username và IP.
- Thông báo chung.
- Ghi login attempts.
- Không dùng in-memory rate limit làm nguồn duy nhất trên serverless.
- CAPTCHA chỉ P2 khi có nhu cầu.

### Authorization

- Middleware session trước query.
- Permission theo role + membership + ownership.
- Không tin ID/role từ client.
- Kiểm thử IDOR.
- API admin trả 403 cho member.
- Query phải scope dữ liệu, không query toàn bộ rồi lọc ở client.

### CSRF/Origin

- Mutation kiểm tra Origin/Referer.
- Endpoint nhạy cảm có CSRF token nếu kiến trúc yêu cầu.
- CORS allowlist.
- Không chấp nhận wildcard credentialed CORS.

### Input/output

- Schema validation server.
- Giới hạn độ dài.
- Escape/sanitize khi render.
- Không lộ stack trace production.
- Error code ổn định.
- File/link validation theo scope.

### Secrets

- Service role/backend secrets chỉ env server.
- `.env` không commit.
- Không in secret trong log/error.
- Có kiểm tra secret trước merge/deploy.

### Audit/privacy

- Redact credential.
- Admin only.
- Request ID.
- Không dùng dữ liệu thời gian làm để chấm KPI trong MVP.

## NFR — Phi chức năng

### NFR-PERF

- API list p95 ≤ 1,5 s.
- Dashboard p95 ≤ 3 s.
- Check-in p95 ≤ 2 s, không tính email.
- Pagination mặc định 20, max 100.
- Tránh N+1.
- Dashboard aggregate ở server/DB.

### NFR-SCALE

- 100 user.
- 10.000 task.
- 100.000 check-in item.
- 20 active session đồng thời.
- Thiết kế không dùng array collaborator.

### NFR-RELIABILITY

- Business transaction atomic.
- Idempotent cron.
- Idempotent submit.
- Optimistic locking.
- Backup trước migration lớn.
- Lỗi email không mất dữ liệu.
- Soft delete.

### NFR-USABILITY

- Check-in 1–2 phút cho 1–3 task.
- Mobile 360 px.
- Loading/error/empty rõ.
- Không mất draft.
- Keyboard cho chức năng chính.
- Không chỉ dùng màu.

### NFR-COMPATIBILITY

- Hai phiên bản ổn định gần nhất của Chrome/Edge/Firefox/Safari.
- Responsive desktop/mobile.
- Ngày/giờ theo VN.

### NFR-OBSERVABILITY

- Request ID.
- Structured log.
- Error log không chứa secret.
- Email failure view.
- Audit critical mutations.
- Health endpoint P1 hoặc trước production.

### NFR-MAINTAINABILITY

- TypeScript strict.
- Validation schema dùng chung khi phù hợp.
- Migration versioned.
- Không sửa migration đã chạy.
- Test unit/integration/E2E cho luồng chính.
- Các công thức nghiệp vụ tập trung, không sao chép ở nhiều nơi.

### NFR-BACKUP

- Có quy trình export Postgres.
- Xác minh restore trước production thực.
- Tần suất backup phụ thuộc gói hạ tầng; tối thiểu backup thủ công trước migration/release lớn.
- File link ngoài không được coi là đã backup bởi app.

### NFR-ACCESSIBILITY

- Label cho input.
- Focus state.
- Error liên kết field.
- Contrast đủ đọc.
- Tap target phù hợp.
- Modal quản lý focus.
