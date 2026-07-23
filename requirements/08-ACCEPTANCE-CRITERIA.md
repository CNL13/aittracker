# Tiêu chí nghiệm thu theo kịch bản

## AC-AUTH

### AC-AUTH-001 — Login thành công

**Given** user active, password đúng  
**When** gửi login  
**Then** tạo session cookie bảo vệ, cập nhật last login và vào đúng trang.

### AC-AUTH-002 — Lỗi chung

**Given** username không tồn tại hoặc password sai  
**When** login  
**Then** cùng status/message, không tiết lộ username tồn tại.

### AC-AUTH-003 — Tài khoản bị khóa

**Given** user locked/inactive  
**When** login hoặc dùng session cũ  
**Then** từ chối; session cũ không hợp lệ.

### AC-AUTH-004 — Đổi mật khẩu bắt buộc

**Given** `must_change_password=true`  
**When** login  
**Then** chỉ truy cập change-password/logout.

### AC-AUTH-005 — Reset

**Given** admin reset password  
**When** user dùng session cũ  
**Then** session bị từ chối; mật khẩu tạm yêu cầu đổi.

### AC-AUTH-006 — Brute force

**Given** vượt ngưỡng sai  
**When** tiếp tục login  
**Then** rate limited/locked tạm; không tạo session; có log.

## AC-USER

### AC-USER-001 — Tạo user

Admin tạo user hợp lệ → user xuất hiện active, username unique, password tạm hiển thị một lần, audit có bản ghi.

### AC-USER-002 — Username trùng

Tạo username khác hoa/thường nhưng cùng normalized → từ chối validation.

### AC-USER-003 — Admin cuối cùng

Thao tác làm không còn admin active → từ chối ở backend.

### AC-USER-004 — Inactive

User inactive không đăng nhập; dữ liệu lịch sử không mất.

## AC-PROJECT

### AC-PRJ-001 — Tạo project

Admin tạo project → xuất hiện danh sách; member không tự tạo.

### AC-PRJ-002 — Add member

Chỉ user active; add trùng bị từ chối/không tạo duplicate.

### AC-PRJ-003 — Remove member còn assignment

Nếu user còn task active → hệ thống yêu cầu xử lý assignment trước.

### AC-PRJ-004 — Complete project

Còn task chưa done → không complete cho đến khi xử lý.

### AC-PRJ-005 — Archived

Archived → không tạo task/check-in mới; dữ liệu cũ đọc được theo quyền.

## AC-TASK

### AC-TSK-001 — Một owner

Tạo task không owner hoặc nhiều owner → transaction bị từ chối.

### AC-TSK-002 — Assignment scope

Giao user không thuộc project → từ chối.

### AC-TSK-003 — Thay owner

Gỡ owner mà không có owner mới → từ chối; có owner mới → atomic.

### AC-TSK-004 — Done

Owner/admin chuyển done → percent 100, completed_at set, version tăng, audit có log.

### AC-TSK-005 — Reopen

Admin/owner theo quyền reopen → completed_at xử lý, version tăng, audit có log.

### AC-TSK-006 — Permission

Collaborator gửi request đổi deadline/priority/task percent → 403.

### AC-TSK-007 — Conflict

Hai client cùng version; client sau cập nhật → 409, không ghi đè.

### AC-TSK-008 — Overdue

Due date trước ngày hiện tại, chưa done → overdue; không thay status DB.

### AC-TSK-009 — No due date

Due null → không due soon/overdue; có trong filter no due date.

## AC-CHECKIN

### AC-CHK-001 — Required

User thỏa toàn bộ BR-02 → required.

### AC-CHK-002 — Not required

Không có task report-required → không bị missing.

### AC-CHK-003 — Exempt

Có absence bao phủ ngày → exempt, không email missing.

### AC-CHK-004 — Non-working day

Cuối tuần/ngày nghỉ → non-working, cron member digest không chạy.

### AC-CHK-005 — Multiple tasks

Một submit lưu nhiều item và một check-in duy nhất.

### AC-CHK-006 — Duplicate

Submit lại cùng user/date/idempotency → không tạo check-in thứ hai.

### AC-CHK-007 — No activity

Không item và không no-activity reason → validation fail. Có reason hợp lệ → submit được.

### AC-CHK-008 — On time

First submit trước/đúng cutoff → on-time.

### AC-CHK-009 — Late

First submit sau cutoff → late; sửa sau không đổi.

### AC-CHK-010 — Edit history

Member sửa ngày cũ → 403. Admin không reason → validation fail. Admin có reason → success + audit.

### AC-CHK-011 — Permission item

Member thêm task không tham gia vào payload → 403/validation fail.

### AC-CHK-012 — Atomic

Một item invalid → toàn transaction rollback; không có check-in nửa vời.

### AC-CHK-013 — Personal vs task progress

Collaborator member percent được lưu, task percent không đổi.

### AC-CHK-014 — Owner task progress

Owner cập nhật hợp lệ → task percent/status đổi và audit.

### AC-CHK-015 — Draft retention

Network error → nội dung form vẫn tồn tại; success → draft local xóa.

## AC-BLOCKER

### AC-BLK-001 — Tạo

Participant tạo blocker mô tả hợp lệ → open, task flagged, alert queued.

### AC-BLK-002 — Duplicate open

Cùng user/task có blocker open → không tạo blocker open thứ hai.

### AC-BLK-003 — Resolve

Reporter/owner/admin resolve với note → flag mất nếu không còn blocker khác.

### AC-BLK-004 — Dismiss

Member không phải admin dismiss → 403.

### AC-BLK-005 — Alert dedupe

Retry request/chỉnh mô tả → không gửi alert mới.

## AC-KANBAN

### AC-KAN-001 — Cột động

Task status in_progress + blocker open → chỉ hiện Blocked; resolve → trở về In progress.

### AC-KAN-002 — Drag

Owner/admin kéo hợp lệ → status đổi. Collaborator → không được.

### AC-KAN-003 — API failure

Drag rồi API lỗi → card quay về cột cũ và báo lỗi.

### AC-KAN-004 — Conflict

409 → tải dữ liệu mới và không ghi đè.

## AC-DASH

### AC-DASH-001 — Count match

Card count bằng số record drill-down cùng filter.

### AC-DASH-002 — Color precedence

User overdue + missing → red.

### AC-DASH-003 — Missing

User not-required/exempt → không vào missing.

### AC-DASH-004 — Filter consistency

Đổi project/date → tất cả card/table/list cùng phạm vi.

### AC-DASH-005 — Email unavailable

User required nhưng email null → dashboard hiển thị không nhận email.

## AC-NOTIFICATION

### AC-NOT-001 — Member digest

Có cảnh báo + email → tối đa một digest/ngày.

### AC-NOT-002 — No content

Không cảnh báo → không gửi member digest.

### AC-NOT-003 — Admin digest

Ngày làm việc → admin active có email nhận summary.

### AC-NOT-004 — User no email

Skip có log, không làm cron fail toàn job.

### AC-NOT-005 — Cron repeat

Chạy cùng job nhiều lần → không duplicate.

### AC-NOT-006 — Provider fail

Business data vẫn giữ; notification failed; admin resend được.

### AC-NOT-007 — Cron secret

Secret sai/thiếu → từ chối.

## AC-AUDIT

### AC-AUD-001 — Critical actions

Các action bắt buộc đều có actor/entity/time/old-new phù hợp.

### AC-AUD-002 — Secret redaction

Audit/log không chứa password/hash/token/service role.

### AC-AUD-003 — Member access

Member gọi audit API → 403.

## AC-NFR

### AC-NFR-001 — Mobile

Ở viewport 360 px, member login, xem task và gửi check-in không cần zoom ngang.

### AC-NFR-002 — Pagination

Danh sách > page size không tải toàn bộ và chuyển trang đúng.

### AC-NFR-003 — Performance

Đạt mục tiêu p95 trong môi trường kiểm thử gần production với dataset chuẩn.

### AC-NFR-004 — Browser

Luồng chính chạy trên các browser mục tiêu.

### AC-NFR-005 — End-to-end

Admin tạo user → user đổi password → admin tạo project/task → member check-in → dashboard/email log cập nhật.
