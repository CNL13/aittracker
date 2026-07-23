# ADR-001 — Custom username/password

## Status
Accepted for MVP.

## Decision

Dùng username/password do admin tạo, custom opaque session, không dùng Supabase Auth trong MVP.

## Consequences

Phải tự triển khai:

- password hashing;
- session revoke/expiry;
- brute-force;
- reset;
- cookie/CSRF;
- audit.

Để nâng cấp sau:

- `users.id` là định danh nghiệp vụ;
- credential/session tách bảng;
- có `external_identities`.
