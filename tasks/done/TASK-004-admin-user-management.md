# TASK-004 — Admin user management and login shell

- Status: done
- Owner: Antigravity / Codex
- Reviewer: Codex / Antigravity
- Dependencies: TASK-003
- Branch/worktree: main
- Priority: P0
- Phase: Phase 1

## Requirement map

- FR-USER-*
- UI login/users

## Mục tiêu

Login/change-password UI and admin user CRUD/status/reset/session UI.

## Trong phạm vi

- Login/change-password UI and admin user CRUD/status/reset/session UI.
- Mobile and error states.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

- `api/users/me.ts`
- `api/users/list.ts`
- `api/users/create.ts`
- `api/users/update.ts`
- `api/users/toggle-status.ts`
- `api/users/reset-password.ts`
- `api/users/sessions.ts`
- `api/users/sessions/revoke.ts`
- `apps/web/src/app/App.tsx`
- `tests/integration/users.test.ts`

## Acceptance checklist

- [x] Admin-last UI + backend behavior.
- [x] Password temporary shown once.
- [x] Member cannot access admin pages.

## Test plan

- Integration tests in `tests/integration/users.test.ts` (14 tests covering user retrieval, searching & filtering, creating users with temporary passwords, updating details, status changes with session revocation, password resets, and session management/revocations).
- Run `verify.ps1` to confirm build, typecheck, lint, and all 52 tests are passing.

## Handoff

- Created backend endpoints for user self-retrieval, administration list, create, update, toggle active/inactive status, password reset, active session listings, and session revocation.
- Implemented robust UI for login, force password changes, user management dashboard, add/edit user modal, status control, and session inspector.
- Built-in audit logging for all critical administration actions (`create_user`, `update_user`, `toggle_status`, `reset_password`, `revoke_session`, `revoke_all_sessions`).
- Enforced admin-safety checks to prevent removing/deactivating the last active administrator.

## Review result

- All backend endpoints and frontend components have been verified.
- Compilation, typechecking, ESLint rules, and Vitest suite (all 52 tests) pass successfully.
