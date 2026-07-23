# TASK-016 — Audit, admin check-ins and email log

- Status: done
- Owner: Codex
- Reviewer: Antigravity
- Dependencies: TASK-004,TASK-009,TASK-015
- Branch/worktree: chưa tạo
- Priority: P0
- Phase: Phase 5

## Requirement map

- FR-AUD-*
- FR-CHK-023/024
- FR-NOT-009/010

Trước khi triển khai, owner phải bổ sung chính xác mã FR/BR/AC và file liên quan sau khi đọc requirements.

## Mục tiêu

Audit list, admin check-in history/edit, notification log/resend.

## Trong phạm vi

- Audit list, admin check-in history/edit, notification log/resend.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

Phải được chốt trong plan dựa trên cấu trúc source do TASK-001 tạo.

## Acceptance checklist

- [ ] Historical edit reason + old/new.
- [ ] Member 403.
- [ ] Secrets redacted.

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
