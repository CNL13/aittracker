---
name: create-database-migration
description: Tạo migration Postgres an toàn cho AIT Work Tracker; dùng khi thêm hoặc đổi schema.
---

# Quy trình


1. Đọc data requirements.
2. Kiểm tra migration hiện có.
3. Không sửa migration đã áp dụng.
4. Tạo forward migration mới.
5. Constraints/index/foreign keys.
6. Data migration nếu cần.
7. Transaction và rollback plan.
8. Test clean DB và upgraded DB.
9. Cập nhật database docs.
