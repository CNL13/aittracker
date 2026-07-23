# TASK-015 — Email and cron notifications

- Status: done
- Owner: Codex
- Reviewer: Antigravity
- Dependencies: TASK-007,TASK-011,TASK-012
- Branch/worktree: chưa tạo
- Priority: P0
- Phase: Phase 5

## Requirement map

- FR-NOT-*
- BR-13
- AC-NOT-*

Trước khi triển khai, owner phải bổ sung chính xác mã FR/BR/AC và file liên quan sau khi đọc requirements.

## Mục tiêu

Member/admin digest, blocker alert, dedupe, cron secret, failure log.

## Trong phạm vi

- Member/admin digest, blocker alert, dedupe, cron secret, failure log.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

Phải được chốt trong plan dựa trên cấu trúc source do TASK-001 tạo.

## Acceptance checklist

- [ ] No duplicate.
- [ ] No-email skipped.
- [ ] Failure does not rollback business data.

## Test plan

- Unit cho logic mới.
- Integration cho database/API khi có.
- Permission/validation negative tests.
- E2E/browser khi có UI.
- Đối chiếu acceptance criteria chính thức.

## Handoff

Chưa cập nhật.

## Review result

Chưa review.
