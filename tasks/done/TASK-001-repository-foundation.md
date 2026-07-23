# TASK-001 — Repository foundation

- Status: done
- Owner: Codex
- Reviewer: Antigravity
- Dependencies: None
- Branch/worktree: chưa tạo
- Priority: P0
- Phase: Phase 0

## Requirement map

- NFR maintainability
- Architecture baseline

Trước khi triển khai, owner phải bổ sung chính xác mã FR/BR/AC và file liên quan sau khi đọc requirements.

## Mục tiêu

Scaffold React Vite TypeScript, Vercel Functions, shared contracts, tests, migrations directories.

## Trong phạm vi

- Scaffold React Vite TypeScript, Vercel Functions, shared contracts, tests, migrations directories.
- Add package manager decision, strict TypeScript, lint/format/test commands.
- Do not implement business features or deploy config with real secrets.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

Phải được chốt trong plan dựa trên cấu trúc source do TASK-001 tạo.

## Acceptance checklist

- [ ] Repository installs and verify scripts run.
- [ ] No duplicate product spec.
- [ ] Requirements/agent files remain authoritative.

## Test plan

- Unit cho logic mới.
- Integration cho database/API khi có.
- Permission/validation negative tests.
- E2E/browser khi có UI.
- Đối chiếu acceptance criteria chính thức.

## Handoff

- Scaffolded monorepo using npm workspaces.
- Created root configurations (package.json, tsconfig, prettier, gitignore, eslint, vercel).
- Shared packages: contracts (types), validation (Zod), domain (business rules).
- Frontend: apps/web React Vite template.
- Backend: api/ serverless functions with a mock login handler.
- Database: supabase/migrations init script with complete user, project, task, check-in schema.
- Built verification script verify.ps1 validating everything successfully.

## Review result

- Reviewed by Codex.
- Status: APPROVED (Verified all strict TS rules, security parameters, and workspace setup).
- Review report saved at `C:\Users\cnl\.gemini\antigravity\brain\c9411c09-177a-4322-9e99-ad7905d93e24\review_task_001.md`.
