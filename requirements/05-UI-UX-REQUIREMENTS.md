# Yêu cầu UI/UX chi tiết

## 1. Nguyên tắc chung

- Giao diện tiếng Việt.
- Check-in mobile-first.
- Dashboard/admin desktop-first nhưng responsive.
- Không dùng màu làm tín hiệu duy nhất; phải có nhãn/icon/text.
- Form có validation inline.
- Khi API lỗi, không xóa dữ liệu đang nhập.
- Mutation có loading và chống gửi lặp.
- Hành động nguy hiểm có confirm.
- Conflict 409 có thông báo riêng.
- Empty state phải hướng dẫn bước tiếp theo.
- Filter quan trọng lưu trên URL.
- Ngày `dd/MM/yyyy`; giờ 24h.
- Múi giờ hiển thị rõ ở chỗ liên quan cutoff.

## 2. Điều hướng theo vai trò

### Member

- Công việc của tôi.
- Cập nhật hôm nay.
- Lịch sử báo cáo của tôi.
- Dự án của tôi.
- Hồ sơ/đổi mật khẩu.
- Đăng xuất.

### Admin

Ngoài mục member:

- Dashboard.
- Thành viên.
- Dự án.
- Tất cả task/Kanban.
- Check-in toàn nhóm.
- Ngày nghỉ và miễn báo cáo.
- Audit log.
- Email log.
- Cấu hình P1.

## 3. `/login`

Thành phần:

- username;
- password;
- hiện/ẩn password;
- đăng nhập;
- thông báo lỗi chung;
- trạng thái bị rate-limit;
- không có “quên mật khẩu” tự động trong MVP;
- hướng dẫn liên hệ admin.

Yêu cầu:

- Enter gửi form.
- Không ghi nhớ password trong app.
- Không phân biệt lỗi username/password.
- Sau thành công chuyển theo `must_change_password`.

## 4. `/change-password`

- Password hiện tại hoặc mật khẩu tạm.
- Password mới.
- Xác nhận password.
- Hiển thị chính sách.
- Sau thành công thông báo session nào bị thu hồi.
- Không cho điều hướng sang nghiệp vụ khi vẫn phải đổi password.

## 5. `/my-work`

Hiển thị:

- task đang hoạt động;
- nhóm theo overdue/blocked/due soon/today/khác;
- title, project, owner, role, due, priority, percent;
- CTA “Cập nhật hôm nay”;
- filter project/status/priority;
- search;
- empty state khi chưa có task.

## 6. `/check-in/today`

Phần đầu:

- ngày, cutoff;
- trạng thái required/exempt/not required;
- đã gửi lúc nào, on-time/late;
- cảnh báo draft local.

Form:

- summary chung;
- danh sách task đủ điều kiện;
- checkbox/chọn task đã làm;
- progress note;
- member percent;
- owner-only task percent/status;
- thời gian;
- help needed;
- tạo blocker;
- general difficulties;
- plan tomorrow;
- no activity + reason;
- tổng thời gian tùy chọn;
- nút lưu/gửi.

Hành vi:

- autosave draft local có debounce;
- khi task bị thay đổi/archived trong lúc form mở, server trả lỗi item cụ thể;
- submit lặp không tạo hai check-in;
- sau success hiển thị bản tóm tắt;
- cho sửa trong ngày;
- không cho member chọn task ngoài phạm vi.

## 7. `/my-checkins`

- Lịch sử theo ngày.
- Nhãn on-time/late.
- Xem chi tiết.
- Không sửa ngày cũ.
- Filter khoảng ngày.
- Empty state.

## 8. `/admin/dashboard`

- Chọn ngày mặc định hôm nay.
- Cards task và check-in.
- Bảng thành viên màu.
- Danh sách blocker/help.
- Filter.
- Drill-down.
- Refresh thủ công.
- Hiển thị thời điểm dữ liệu cập nhật.
- Không dùng biểu đồ trang trí nếu chưa có ý nghĩa.

## 9. `/admin/users`

Danh sách:

- username;
- full name;
- email;
- role/status;
- last login;
- email reminder availability;
- actions.

Form create/edit:

- validation username;
- password tạm hoặc generate;
- hiển thị password một lần;
- confirm lock/inactive/reset;
- chặn admin cuối cùng;
- session revoke action.

## 10. `/projects` và `/projects/:id`

Project list:

- name, status, dates, member count, active task count, warning count.
- search/filter/pagination.

Project detail:

- overview;
- members;
- task list/Kanban scoped;
- progress;
- blockers;
- activity;
- actions theo status.

## 11. `/tasks` và `/tasks/:id`

Task list:

- list/Kanban toggle;
- filters;
- no due date;
- archived toggle.

Task detail:

- metadata;
- assignments;
- progress;
- workflow status;
- flags;
- blocker;
- task-specific updates;
- history;
- comment/document P1.

Editing:

- version conflict UI;
- owner replacement atomic;
- done/reopen confirmation;
- archive confirmation.

## 12. `/admin/checkins`

- Chọn ngày/range.
- Danh sách required/on-time/late/missing/exempt.
- Mở check-in.
- Admin edit lịch sử với reason.
- Export không thuộc P0.
- Filter project/member/status.

## 13. `/admin/absences`

- Danh sách exemption.
- Tạo/sửa/hủy.
- Kiểm tra chồng lấn.
- Hiển thị ảnh hưởng tới các ngày.
- Quản lý non-working day.
- Audit action.

## 14. `/admin/audit`

- Filter actor/action/entity/date.
- Bảng phân trang.
- Xem old/new ở dạng dễ đọc.
- Dữ liệu nhạy cảm đã redacted.
- Không có nút xóa/sửa.

## 15. `/admin/email-log`

- status/type/recipient/date.
- provider id.
- lỗi an toàn.
- resend failed.
- filter và phân trang.
- hiển thị dedupe/original relation.
- Không hiển thị secret.

## 16. Trạng thái chung bắt buộc

Mỗi trang dữ liệu phải có:

- initial loading;
- refreshing;
- empty;
- filtered empty;
- validation error;
- unauthorized 401;
- forbidden 403;
- not found 404;
- conflict 409;
- rate limit 429;
- server/network error;
- success feedback.

## 17. Responsive

- Check-in dùng tốt từ 360 px.
- Kanban mobile dùng scroll ngang hoặc chế độ list rõ ràng.
- Bảng admin chuyển card/list hoặc scroll có kiểm soát.
- Tap target tối thiểu khoảng 44 px cho control chính.
- Không yêu cầu hover.
