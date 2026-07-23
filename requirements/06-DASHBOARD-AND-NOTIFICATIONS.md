# Dashboard, cảnh báo và thông báo

## 1. Phạm vi dữ liệu dashboard

Mặc định:

- ngày hiện tại;
- project active;
- task chưa archived;
- tất cả thành viên active.

Filter phải áp dụng đồng nhất cho card, bảng và drill-down.

## 2. Định nghĩa cards

### Task

- `Tổng task hoạt động`: todo + in_progress + waiting + done trong phạm vi, không archived.
- `Đang thực hiện`: status in_progress.
- `Đang chờ`: status waiting.
- `Hoàn thành`: status done.
- `Quá hạn`: công thức BR-09.
- `Sắp đến hạn`: công thức BR-09.
- `Bị vướng`: có blocker open.
- `Chưa đặt hạn`: due_date null, chưa done.

Một task có thể thuộc nhiều flag cards, ví dụ vừa blocked vừa overdue. Workflow cards thì loại trừ nhau.

### Check-in

- `Phải báo cáo`.
- `Đúng hạn`.
- `Muộn`.
- `Chưa gửi`.
- `Được miễn`.
- `Không phải báo cáo`.

## 3. Bảng thành viên

Cột tối thiểu:

- họ tên;
- project/task đang hoạt động;
- trạng thái check-in;
- giờ gửi;
- overdue count;
- due soon count;
- blocker count;
- help request;
- màu;
- email reminder availability;
- action mở chi tiết.

## 4. Màu và precedence

- Red: overdue hoặc blocker.
- Yellow: due soon/help.
- Gray: required chưa gửi.
- Green: đã gửi và không warning.
- N/A: exempt/not required/non-working.

Hiển thị kèm text lý do, không chỉ màu.

## 5. Drill-down

Nhấn card phải mở danh sách đã áp filter tương ứng.

Ví dụ:

- Card overdue → task list với `flag=overdue`.
- Card missing → admin check-ins với `state=missing`.
- Blocked → task list `flag=blocked`.

Số card và số dòng drill-down phải khớp tại cùng thời điểm/filter.

## 6. Refresh và consistency

- Sau check-in thành công, dashboard phải phản ánh khi refresh/query lại ngay.
- Có thể dùng cache ngắn nhưng không quá 60 giây ở MVP.
- Hiển thị `Cập nhật lúc`.
- Không đếm dữ liệu ở client từ danh sách chưa đầy đủ.

## 7. Email member digest

Điều kiện chạy:

- ngày làm việc;
- user active;
- có email hợp lệ;
- có ít nhất một cảnh báo/nội dung.

Nội dung:

- trạng thái check-in;
- task due soon/overdue;
- blocker mở của user;
- help/request liên quan;
- link trực tiếp.

Không chứa:

- dữ liệu task không liên quan;
- password;
- thông tin cá nhân người khác không cần thiết.

## 8. Admin digest

Gửi cho mỗi admin active có email, mỗi ngày làm việc.

Nội dung:

- required/on-time/late/missing;
- overdue/due soon/no due date;
- blocker/help;
- user thiếu email;
- email failures;
- link dashboard với filter ngày.

## 9. Blocker alert

Kích hoạt sau khi blocker mới commit thành công.

Nội dung:

- task/project;
- người báo;
- mô tả;
- thời điểm;
- link task.

Không gửi lại khi:

- sửa mô tả;
- mở lại trang;
- retry request cùng idempotency key.

## 10. Notification log

Mỗi attempt cần:

- recipient;
- type;
- date;
- status;
- dedupe;
- provider id/error;
- timestamps;
- original id nếu resend.

## 11. Cron safety

- Endpoint yêu cầu secret.
- Job idempotent.
- Không tin thời điểm browser.
- Nếu chạy trễ vẫn dùng ngày nghiệp vụ đúng theo timezone.
- Không gửi member digest vào non-working day.
- Email lỗi không rollback business transaction.
