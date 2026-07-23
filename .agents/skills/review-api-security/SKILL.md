---
name: review-api-security
description: Review API của AIT Work Tracker về auth, quyền, IDOR, validation, CSRF, secret và log.
---

# Quy trình


1. Liệt kê endpoints/dữ liệu.
2. Kiểm tra session.
3. Kiểm tra permission query scope.
4. Thử forged IDs/role/user_id.
5. Validation/limits.
6. Origin/CORS.
7. Log redaction.
8. Transaction/idempotency/conflict.
9. Ghi severity và bằng chứng.
10. Không tự sửa khi là reviewer.
