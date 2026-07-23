# TASK-014 — Kanban with dynamic blocked column

- Status: done
- Owner: Antigravity
- Reviewer: Codex
- Dependencies: TASK-006,TASK-011
- Branch/worktree: chưa tạo
- Priority: P0
- Phase: Phase 4

## Requirement map

- FR-KAN-*
- ADR-004
- AC-KAN-*

Trước khi triển khai, owner phải bổ sung chính xác mã FR/BR/AC và file liên quan sau khi đọc requirements.

## Mục tiêu

Kanban/list, dynamic blocked, owner/admin drag, rollback/conflict.

## Trong phạm vi

- Kanban/list, dynamic blocked, owner/admin drag, rollback/conflict.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

Phải được chốt trong plan dựa trên cấu trúc source do TASK-001 tạo.

## Acceptance checklist

- [ ] Blocked returns original workflow column.
- [ ] Collaborator cannot drag.
- [ ] Mobile fallback.

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
