# TASK-002 — Database baseline

- Status: done
- Owner: Codex
- Reviewer: Antigravity
- Dependencies: TASK-001
- Branch/worktree: chưa tạo
- Priority: P0
- Phase: Phase 0

## Requirement map

- FR-USER
- FR-PRJ
- FR-TSK
- FR-CHK
- FR-BLK
- FR-ABS
- FR-AUD
- FR-NOT

Trước khi triển khai, owner phải bổ sung chính xác mã FR/BR/AC và file liên quan sau khi đọc requirements.

## Mục tiêu

Create P0 schema migrations and bootstrap admin mechanism.

## Trong phạm vi

- Create P0 schema migrations and bootstrap admin mechanism.
- Implement constraints/indexes from data requirements.
- No comments/documents tables in P0.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

- `supabase/migrations/00000000000000_init.sql`
- `scripts/bootstrap-admin.ts`
- `tests/integration/database.test.ts`
- `tasks/active/TASK-002-database-baseline.md`
- `package.json`
- `package-lock.json`

## Acceptance checklist

- [x] Clean migration succeeds.
- [x] One-owner/check-in/dedupe constraints tested.
- [x] No plaintext bootstrap password.

## Test plan

- Unit cho logic mới.
- Integration cho database/API khi có.
- Permission/validation negative tests.
- E2E/browser khi có UI.
- Đối chiếu acceptance criteria chính thức.

## Handoff

- Đã thiết kế lại 100% schema baseline P0 gồm 17 bảng nghiệp vụ trong `supabase/migrations/00000000000000_init.sql`.
- Đã cài đặt `bcryptjs`, `@types/bcryptjs`, và `tsx` cho dự án.
- Đã viết script bootstrap admin an toàn trong `scripts/bootstrap-admin.ts`.
- Đã viết integration tests kiểm thử các bất biến trong `tests/integration/database.test.ts`.
- Sẵn sàng chạy `verify.ps1` để xác minh.

## Review result

- Reviewed by Antigravity.
- Status: APPROVED (All 17 P0 tables, complex database constraints, check constraints, security rules, and trigger behaviors checked and verified).
- Review report saved at `C:\Users\cnl\.gemini\antigravity\brain\c9411c09-177a-4322-9e99-ad7905d93e24\review_task_002.md`.
