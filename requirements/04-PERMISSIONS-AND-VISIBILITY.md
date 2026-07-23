# Ma trận quyền và phạm vi nhìn thấy dữ liệu

## 1. Nguyên tắc

- Quyền kiểm tra ở backend.
- UI ẩn control chỉ là hỗ trợ trải nghiệm.
- Admin có quyền toàn hệ thống nhưng vẫn chịu bất biến “admin cuối cùng”.
- Member có quyền theo quan hệ project/task.
- Quyền lịch sử không đồng nghĩa quyền xem dữ liệu mới sau khi bị gỡ.

## 2. Ma trận hành động

| Hành động | Admin | Member |
|---|:---:|:---:|
| Tạo/sửa/khóa/reset user | Có | Không |
| Xem danh sách user quản trị | Có | Không |
| Xem hồ sơ bản thân | Có | Có |
| Tạo/sửa/status/archive project | Có | Không |
| Thêm/gỡ project member | Có | Không |
| Xem project mình tham gia | Có | Có |
| Tạo/sửa/archive task | Có | Không |
| Thay owner/collaborator/reviewer | Có | Không |
| Xem task mình tham gia | Có | Có |
| Xem task không liên quan | Có | Không |
| Đổi workflow status | Có | Owner |
| Đổi task percent tổng thể | Có | Owner |
| Đổi deadline/priority | Có | Không |
| Cập nhật member progress | Có | Participant |
| Tạo blocker | Có | Participant |
| Resolve blocker | Có | Reporter hoặc owner |
| Dismiss blocker | Có | Không |
| Gửi/sửa check-in hôm nay | Có | Chính mình |
| Sửa check-in ngày cũ | Có, có lý do | Không |
| Xem check-in toàn nhóm | Có | Không |
| Xem item của người khác trong task chung | Có | Có |
| Xem summary chung của người khác | Có | Không |
| Xem audit log | Có | Không |
| Xem/gửi lại email lỗi | Có | Không |
| Quản lý ngày nghỉ/miễn báo cáo | Có | Không |
| Bình luận P1 | Có | Participant |
| Gắn link P1 | Có | Participant |

## 3. Thông tin member được thấy về người khác

Trong project/task chung:

- full name;
- avatar;
- vai trò trong task/project;
- task-specific progress note;
- blocker và comment trong task;
- trạng thái active/inactive ở mức cần thiết cho phân công.

Không được thấy:

- password/session/login attempt;
- email nếu không có nhu cầu nghiệp vụ;
- check-in summary tổng quát;
- task khác;
- absence reason chi tiết, trừ admin;
- audit log;
- notification log.

## 4. Sau khi bị gỡ khỏi task/project

- Không được nhận dữ liệu mới của task/project.
- Check-in và contribution cũ vẫn giữ.
- User được xem lịch sử của chính mình.
- Việc cho xem toàn bộ nội dung cũ của task sau khi bị gỡ không phải P0; mặc định chỉ xem bản ghi của chính mình và metadata tối thiểu.

## 5. Quyền đặc biệt của owner

Owner:

- cập nhật status/percent tổng thể;
- resolve blocker;
- xem tất cả item gắn với task;
- không được thay deadline, priority, assignments;
- không được archive task;
- không được xem check-in tổng quát của collaborator.

## 6. Quy tắc admin cuối cùng

Hệ thống phải từ chối khi thao tác làm số admin active còn 0:

- khóa;
- inactive;
- đổi role thành member;
- xóa/ẩn bằng bất kỳ API nào.

Thông báo phải rõ với admin, nhưng không lộ thông tin nhạy cảm cho member.
