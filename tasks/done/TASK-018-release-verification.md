# TASK-018 — P0 release verification

- Status: done
- Owner: Antigravity
- Reviewer: Codex
- Dependencies: TASK-001–TASK-017
- Branch/worktree: chưa tạo
- Priority: P0
- Phase: Phase 6

## Requirement map

- All P0 FR/BR/AC
- AC-NFR-005

Trước khi triển khai, owner phải bổ sung chính xác mã FR/BR/AC và file liên quan sau khi đọc requirements.

## Mục tiêu

Full traceability, E2E, security, migration, backup/restore and release report.

## Trong phạm vi

- Full traceability, E2E, security, migration, backup/restore and release report.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

Phải được chốt trong plan dựa trên cấu trúc source do TASK-001 tạo.

## Acceptance checklist

- [ ] No critical/high auth issue.
- [ ] Main E2E passes.
- [ ] Release blockers explicit.

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
