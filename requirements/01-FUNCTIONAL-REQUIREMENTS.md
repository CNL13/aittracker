# Yêu cầu chức năng chi tiết

Quy ước:

- `MUST`: bắt buộc trong phạm vi nêu.
- `SHOULD`: nên có nhưng có thể hoãn nếu không ảnh hưởng P0.
- Mỗi yêu cầu có mã để truy vết.

## AUTH — Xác thực và phiên đăng nhập

- **FR-AUTH-001 (P0):** Hệ thống MUST cho phép đăng nhập bằng username/password.
- **FR-AUTH-002 (P0):** Username MUST được trim, chuyển dạng chuẩn không phân biệt hoa/thường trước khi tìm kiếm.
- **FR-AUTH-003 (P0):** Sai username và sai password MUST trả cùng thông báo.
- **FR-AUTH-004 (P0):** Tài khoản `locked` hoặc `inactive` MUST không đăng nhập được.
- **FR-AUTH-005 (P0):** Đăng nhập thành công MUST tạo opaque session token ngẫu nhiên và cookie bảo vệ.
- **FR-AUTH-006 (P0):** Hệ thống MUST chỉ lưu hash/HMAC của token.
- **FR-AUTH-007 (P0):** Session MUST có thời gian idle và absolute expiry.
- **FR-AUTH-008 (P0):** Logout MUST thu hồi session hiện tại.
- **FR-AUTH-009 (P0):** Admin MUST có thể thu hồi toàn bộ session của một user.
- **FR-AUTH-010 (P0):** Reset password, khóa hoặc vô hiệu hóa user MUST thu hồi toàn bộ session.
- **FR-AUTH-011 (P0):** User mới/reset MUST đổi mật khẩu trước khi dùng chức năng nghiệp vụ.
- **FR-AUTH-012 (P0):** Trang đổi mật khẩu MUST yêu cầu password hiện tại, trừ luồng mật khẩu tạm.
- **FR-AUTH-013 (P0):** Hệ thống MUST rate-limit đăng nhập theo username chuẩn hóa và IP.
- **FR-AUTH-014 (P0):** Admin MUST xem được danh sách session theo user ở mức thiết bị/thời gian, nhưng không thấy token.
- **FR-AUTH-015 (P0):** Không lưu session token ở `localStorage`.
- **FR-AUTH-016 (P1):** User SHOULD đăng xuất một thiết bị cụ thể.
- **FR-AUTH-017 (P2):** SSO được thêm qua ánh xạ identity, không đổi khóa ngoại nghiệp vụ.

## USER — Quản lý tài khoản

- **FR-USER-001 (P0):** Admin MUST tạo user với username, full name, role và password tạm.
- **FR-USER-002 (P0):** Username MUST unique theo dạng chuẩn và không được tái sử dụng.
- **FR-USER-003 (P0):** Admin MUST sửa họ tên, email, đơn vị, chức vụ và avatar URL.
- **FR-USER-004 (P0):** Admin MUST khóa, mở khóa và vô hiệu hóa user.
- **FR-USER-005 (P0):** Không có thao tác xóa cứng user đã phát sinh dữ liệu.
- **FR-USER-006 (P0):** Admin MUST reset password và nhận mật khẩu tạm chỉ một lần.
- **FR-USER-007 (P0):** Hệ thống MUST ngăn khóa/vô hiệu hóa/hạ quyền admin cuối cùng.
- **FR-USER-008 (P0):** Admin đang đăng nhập MUST không tự vô hiệu hóa chính mình nếu không còn admin active khác.
- **FR-USER-009 (P0):** Danh sách user MUST tìm theo username/họ tên/email và lọc theo role/status.
- **FR-USER-010 (P0):** Danh sách MUST phân trang và sắp xếp.
- **FR-USER-011 (P0):** Member MUST xem được hồ sơ của chính mình.
- **FR-USER-012 (P0):** Member chỉ thấy thông tin cơ bản của người cùng task/project theo quy tắc visibility.
- **FR-USER-013 (P0):** Mọi thao tác quản trị user MUST ghi audit log.
- **FR-USER-014 (P1):** Admin SHOULD nhập user hàng loạt từ CSV sau MVP P0.
- **FR-USER-015 (P1):** Avatar upload là tùy chọn; URL avatar được chấp nhận trước.

## PROJECT — Dự án

- **FR-PRJ-001 (P0):** Admin MUST tạo dự án với tên, mô tả, trạng thái, ngày bắt đầu/hạn tùy chọn.
- **FR-PRJ-002 (P0):** Admin MUST sửa dự án khi chưa archived.
- **FR-PRJ-003 (P0):** Admin MUST chuyển trạng thái planning/active/paused/completed/archived theo quy tắc.
- **FR-PRJ-004 (P0):** Project archived/completed MUST chỉ đọc với member.
- **FR-PRJ-005 (P0):** Hệ thống MUST ngăn hoàn thành dự án nếu còn task chưa done/archived, trừ khi admin xác nhận xử lý từng task trước.
- **FR-PRJ-006 (P0):** Admin MUST thêm user active vào project.
- **FR-PRJ-007 (P0):** Không được thêm trùng một project member đang hoạt động.
- **FR-PRJ-008 (P0):** Admin MUST gỡ thành viên khỏi project.
- **FR-PRJ-009 (P0):** Không được gỡ user đang là owner/collaborator/reviewer của task active nếu chưa gỡ/chuyển phân công.
- **FR-PRJ-010 (P0):** Member MUST thấy danh sách project mình đang tham gia.
- **FR-PRJ-011 (P0):** Project detail MUST hiển thị thành viên, task, tiến độ tổng hợp và cảnh báo.
- **FR-PRJ-012 (P0):** Danh sách project MUST tìm kiếm/lọc trạng thái/phân trang.
- **FR-PRJ-013 (P0):** Project archived MUST không tạo task/check-in mới.
- **FR-PRJ-014 (P0):** Admin MUST có thể mở lại completed project; hành động ghi log.
- **FR-PRJ-015 (P1):** Vai trò manager/viewer có thể được kích hoạt sau, nhưng MVP chỉ admin quản trị.

## TASK — Nhiệm vụ và phân công

- **FR-TSK-001 (P0):** Admin MUST tạo task trong project chưa archived.
- **FR-TSK-002 (P0):** Task MUST có title, project, priority, status và đúng một owner.
- **FR-TSK-003 (P0):** Description, start date và due date có thể để trống.
- **FR-TSK-004 (P0):** Nếu có cả start/due date, due date MUST không trước start date.
- **FR-TSK-005 (P0):** Owner/collaborator/reviewer MUST là project member active.
- **FR-TSK-006 (P0):** Admin MUST thêm/gỡ collaborator và reviewer.
- **FR-TSK-007 (P0):** Owner mới MUST được chỉ định trong cùng transaction khi thay/gỡ owner.
- **FR-TSK-008 (P0):** `report_required` MUST cấu hình theo từng task member.
- **FR-TSK-009 (P0):** Owner/collaborator mặc định report required; reviewer mặc định không bắt buộc.
- **FR-TSK-010 (P0):** Admin MUST sửa title, description, dates, priority, assignments và trạng thái.
- **FR-TSK-011 (P0):** Owner MUST cập nhật workflow status và percent tổng thể.
- **FR-TSK-012 (P0):** Collaborator/reviewer MUST không ghi đè percent tổng thể.
- **FR-TSK-013 (P0):** Chuyển done MUST đặt 100% và completed timestamp.
- **FR-TSK-014 (P0):** Mở lại done MUST ghi log và cập nhật completed timestamp.
- **FR-TSK-015 (P0):** `overdue` MUST tính động, không lưu status.
- **FR-TSK-016 (P0):** Task không có due date MUST có filter riêng và không bị coi overdue.
- **FR-TSK-017 (P0):** Cập nhật task MUST gửi version; version cũ trả 409.
- **FR-TSK-018 (P0):** Task MUST archive thay vì hard delete khi đã có lịch sử.
- **FR-TSK-019 (P0):** Member MUST chỉ xem task mình tham gia.
- **FR-TSK-020 (P0):** Task list MUST tìm theo title/description và lọc project, status, priority, participant, due range, flags.
- **FR-TSK-021 (P0):** Task detail MUST hiển thị lịch sử quan trọng.
- **FR-TSK-022 (P0):** Thay deadline, owner, status, priority, percent MUST ghi log.
- **FR-TSK-023 (P0):** Task thuộc project paused/completed/archived MUST không nhận cập nhật thông thường từ member.
- **FR-TSK-024 (P1):** Sao chép task có thể bổ sung sau.
- **FR-TSK-025 (P2):** Subtask, dependency và recurring task ngoài MVP.

## CHECKIN — Báo cáo hằng ngày

- **FR-CHK-001 (P0):** Một user MUST chỉ có một check-in cho mỗi ngày nghiệp vụ.
- **FR-CHK-002 (P0):** Check-in date MUST do server tính theo timezone.
- **FR-CHK-003 (P0):** Trang MUST tự hiển thị task người dùng đang tham gia và đủ điều kiện.
- **FR-CHK-004 (P0):** User MAY chọn một hoặc nhiều task đã làm; không bắt buộc nhập mọi task.
- **FR-CHK-005 (P0):** Nếu không chọn task, user MUST chọn “Không phát sinh công việc” và nhập lý do.
- **FR-CHK-006 (P0):** Check-in MUST có summary hoặc ít nhất một item có progress note.
- **FR-CHK-007 (P0):** Mỗi task chỉ xuất hiện một lần trong check-in.
- **FR-CHK-008 (P0):** Item MAY chứa progress note, member percent, time spent và help needed.
- **FR-CHK-009 (P0):** Owner MAY cập nhật task percent/status từ check-in.
- **FR-CHK-010 (P0):** Collaborator/reviewer chỉ cập nhật member percent.
- **FR-CHK-011 (P0):** User MAY tạo blocker từ item.
- **FR-CHK-012 (P0):** Check-in, items, blocker và task changes MUST được lưu atomic.
- **FR-CHK-013 (P0):** First submitted time MUST quyết định on-time/late.
- **FR-CHK-014 (P0):** Sửa check-in trong ngày MUST không thay đổi first submitted time.
- **FR-CHK-015 (P0):** User MAY sửa check-in hiện tại đến hết ngày.
- **FR-CHK-016 (P0):** User MUST không sửa ngày cũ.
- **FR-CHK-017 (P0):** Admin MAY sửa ngày cũ khi nhập lý do; hệ thống ghi old/new values.
- **FR-CHK-018 (P0):** Form MUST lưu tạm nội dung ở client để chống mất khi lỗi mạng/reload ngoài ý muốn.
- **FR-CHK-019 (P0):** Gửi thành công MUST xóa draft cục bộ tương ứng.
- **FR-CHK-020 (P0):** Hệ thống MUST phân biệt required, exempt, not required, non-working-day.
- **FR-CHK-021 (P0):** User vắng mặt được duyệt MUST không bị tính missing.
- **FR-CHK-022 (P0):** Member MUST xem lịch sử check-in của chính mình.
- **FR-CHK-023 (P0):** Admin MUST xem/lọc check-in toàn nhóm.
- **FR-CHK-024 (P0):** Member trong task chung chỉ thấy item gắn task chung, không thấy summary tổng quát của người khác.
- **FR-CHK-025 (P1):** Nhắc sớm trước cutoff qua in-app có thể bổ sung sau.

## BLOCKER — Vướng mắc và hỗ trợ

- **FR-BLK-001 (P0):** Mọi participant active của task MUST tạo blocker.
- **FR-BLK-002 (P0):** Blocker MUST có mô tả.
- **FR-BLK-003 (P0):** Có tối đa một blocker mở/user/task.
- **FR-BLK-004 (P0):** Reporter, owner hoặc admin MAY resolve; admin MAY dismiss.
- **FR-BLK-005 (P0):** Resolve/dismiss MUST có resolution note.
- **FR-BLK-006 (P0):** Mọi thay đổi blocker MUST ghi log.
- **FR-BLK-007 (P0):** Blocker mới MUST kích hoạt cảnh báo email admin sau khi transaction thành công.
- **FR-BLK-008 (P0):** Chỉnh mô tả blocker hiện có MUST không gửi alert mới.
- **FR-BLK-009 (P0):** Task có blocker mở MUST xuất hiện ở cột động “Bị vướng”.
- **FR-BLK-010 (P0):** Khi hết blocker mở, task MUST trở lại cột workflow status gốc.

## KANBAN — Bảng công việc

- **FR-KAN-001 (P0):** Kanban MUST có Todo, In progress, Waiting, Blocked và Done.
- **FR-KAN-002 (P0):** Blocked là cột động, không phải status đích để kéo.
- **FR-KAN-003 (P0):** Chỉ owner/admin MAY kéo đổi workflow status.
- **FR-KAN-004 (P0):** Member không đủ quyền MUST không thấy hoặc không dùng control kéo.
- **FR-KAN-005 (P0):** Card MUST hiển thị title, owner, due date, priority, percent và cảnh báo.
- **FR-KAN-006 (P0):** Kanban MUST lọc project, participant, priority, flags và search.
- **FR-KAN-007 (P0):** Lỗi cập nhật MUST hoàn tác card và hiển thị lỗi.
- **FR-KAN-008 (P0):** Conflict 409 MUST tải lại dữ liệu mới và thông báo người dùng.
- **FR-KAN-009 (P0):** Task archived MUST không xuất hiện mặc định.
- **FR-KAN-010 (P0):** Sort mặc định trong cột: overdue trước, due soon, priority cao, due date gần.

## DASH — Dashboard

- **FR-DASH-001 (P0):** Dashboard MUST mặc định ngày hiện tại.
- **FR-DASH-002 (P0):** MUST có bộ đếm task theo trạng thái và flag.
- **FR-DASH-003 (P0):** MUST có bộ đếm check-in required/on-time/late/missing/exempt.
- **FR-DASH-004 (P0):** MUST có bảng thành viên với màu theo precedence.
- **FR-DASH-005 (P0):** MUST có danh sách blocker và help request mở.
- **FR-DASH-006 (P0):** MUST lọc project, member, status, priority và date range.
- **FR-DASH-007 (P0):** Mỗi card MUST drill-down tới dữ liệu nguồn cùng filter.
- **FR-DASH-008 (P0):** Bộ đếm MUST tính ở backend/database.
- **FR-DASH-009 (P0):** User không phải báo cáo MUST không bị tính missing.
- **FR-DASH-010 (P0):** Dashboard MUST hiển thị “không có email” với user không thể nhận nhắc.
- **FR-DASH-011 (P0):** Admin MUST mở nhanh task/check-in/member từ bảng.
- **FR-DASH-012 (P1):** Biểu đồ xu hướng tuần/tháng để sau P0.

## ABSENCE — Ngày nghỉ và miễn báo cáo

- **FR-ABS-001 (P0):** Admin MUST khai báo ngày không làm việc toàn hệ thống.
- **FR-ABS-002 (P0):** Admin MUST tạo khoảng miễn báo cáo cho user.
- **FR-ABS-003 (P0):** Start date MUST không sau end date.
- **FR-ABS-004 (P0):** Khoảng miễn trùng nhau MAY được hợp nhất hoặc bị từ chối rõ ràng.
- **FR-ABS-005 (P0):** Exemption MUST ảnh hưởng dashboard và email ngay.
- **FR-ABS-006 (P0):** Xóa exemption quá khứ MUST ghi audit log.
- **FR-ABS-007 (P0):** Member MUST thấy trạng thái được miễn của chính mình.
- **FR-ABS-008 (P1):** Member tự gửi yêu cầu nghỉ ngoài MVP P0.

## NOTIFICATION — Email

- **FR-NOT-001 (P0):** Cron daily digest MUST chỉ xử lý ngày làm việc.
- **FR-NOT-002 (P0):** Một user tối đa một daily digest/ngày.
- **FR-NOT-003 (P0):** User không email MUST bị skip có log.
- **FR-NOT-004 (P0):** Member digest MUST chỉ gửi khi có nội dung cần chú ý.
- **FR-NOT-005 (P0):** Admin summary MUST gửi mỗi ngày làm việc cho admin có email.
- **FR-NOT-006 (P0):** Blocker alert MUST gửi một lần/blocker/admin.
- **FR-NOT-007 (P0):** Cron/request lặp MUST không gửi trùng.
- **FR-NOT-008 (P0):** Provider failure MUST ghi failed và error an toàn.
- **FR-NOT-009 (P0):** Admin MUST xem email log và gửi lại failed item.
- **FR-NOT-010 (P0):** Manual resend MUST ghi audit log.
- **FR-NOT-011 (P0):** Cron endpoint MUST xác thực secret.
- **FR-NOT-012 (P1):** In-app notification ngoài P0.

## AUDIT — Nhật ký

- **FR-AUD-001 (P0):** Audit log MUST bất biến với người dùng thông thường.
- **FR-AUD-002 (P0):** Chỉ admin MUST xem audit log.
- **FR-AUD-003 (P0):** Log MUST chứa actor, entity, action, time, old/new values phù hợp.
- **FR-AUD-004 (P0):** System/cron action MUST có actor kiểu system.
- **FR-AUD-005 (P0):** Không log password/hash/token/secret.
- **FR-AUD-006 (P0):** Audit list MUST lọc actor, action, entity, date.
- **FR-AUD-007 (P0):** Audit list MUST phân trang.
- **FR-AUD-008 (P0):** Không hỗ trợ xóa log qua UI MVP.

## SEARCH — Tìm kiếm và danh sách

- **FR-SRC-001 (P0):** Search MUST trim input và có giới hạn độ dài.
- **FR-SRC-002 (P0):** User search theo username/full name/email.
- **FR-SRC-003 (P0):** Project search theo name/description.
- **FR-SRC-004 (P0):** Task search theo title/description.
- **FR-SRC-005 (P0):** Default page size 20, cho 10/20/50; max API 100.
- **FR-SRC-006 (P0):** Pagination MUST ổn định với sort xác định.
- **FR-SRC-007 (P0):** Filter MUST được giữ trong URL ở màn hình quản trị chính.
- **FR-SRC-008 (P0):** Empty result MUST hiển thị rõ và có nút xóa filter.

## COMMENT/DOCUMENT — P1

- **FR-COM-001 (P1):** Participant/admin MAY bình luận trong task.
- **FR-COM-002 (P1):** Chỉ tác giả/admin MAY sửa hoặc xóa mềm bình luận.
- **FR-COM-003 (P1):** Bình luận xóa mềm MUST giữ dấu vết “đã xóa”.
- **FR-DOC-001 (P1):** Admin/participant MAY gắn link tài liệu vào task/project được phép xem.
- **FR-DOC-002 (P1):** Link MUST dùng https và được validate.
- **FR-DOC-003 (P1):** Document MUST có name và type.
- **FR-DOC-004 (P2):** Upload trực tiếp chỉ triển khai sau khi có kiểm soát MIME/size/signed URL.

## SETTINGS — Cấu hình

- **FR-SET-001 (P0):** Timezone cố định `Asia/Ho_Chi_Minh`.
- **FR-SET-002 (P0):** Working weekdays mặc định Mon–Fri.
- **FR-SET-003 (P0):** Cutoff mặc định 17:00.
- **FR-SET-004 (P0):** Due soon mặc định 2 ngày làm việc.
- **FR-SET-005 (P0):** Session idle 12 giờ, absolute 7 ngày.
- **FR-SET-006 (P1):** Admin UI chỉnh các giá trị trên sau P0; P0 có thể cấu hình server/DB.
