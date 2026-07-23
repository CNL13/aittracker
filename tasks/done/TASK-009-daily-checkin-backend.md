# TASK-009 — Daily check-in backend

- Status: done
- Owner: Codex
- Reviewer: Antigravity
- Dependencies: TASK-006,TASK-007
- Branch/worktree: chưa tạo
- Priority: P0
- Phase: Phase 3

## Requirement map

- FR-CHK-*
- BR-02–06/15
- AC-CHK-*

Trước khi triển khai, owner phải bổ sung chính xác mã FR/BR/AC và file liên quan sau khi đọc requirements.

## Mục tiêu

Context endpoint and atomic submit/edit/history.

## Trong phạm vi

- Context endpoint and atomic submit/edit/history.
- Idempotency and first-submitted rules.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

Phải được chốt trong plan dựa trên cấu trúc source do TASK-001 tạo.

## Acceptance checklist

- [ ] One check-in/day.
- [ ] Rollback invalid item.
- [ ] Collaborator cannot change task total.

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
