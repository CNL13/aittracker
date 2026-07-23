---
name: implement-custom-auth
description: Triển khai hoặc sửa custom username/password, credential, session, reset và login protection của AIT Work Tracker.
---

# Quy trình


1. Đọc FR-AUTH, FR-USER, security requirements.
2. Không Supabase Auth.
3. Hash password an toàn.
4. Opaque session + token hash/HMAC.
5. Cookie bảo vệ.
6. Generic login errors.
7. Shared rate-limit store.
8. Revoke flows.
9. Admin-last invariant.
10. Viết security/integration tests.
