# TASK-003 — Custom auth and session

- Status: done
- Owner: Codex / Antigravity
- Reviewer: Antigravity
- Dependencies: TASK-002
- Branch/worktree: main
- Priority: P0
- Phase: Phase 1

## Requirement map

- FR-AUTH-*
- FR-USER-006/007
- AC-AUTH-*

## Mục tiêu

Login/logout/session/change password, opaque cookie, revoke, rate-limit.

## Trong phạm vi

- Login/logout/session/change password, opaque cookie, revoke, rate-limit.
- Security tests and generic errors.

## Ngoài phạm vi

- P1/P2.
- Thay đổi quyết định nghiệp vụ.
- File ngoài allowed files chưa được owner/reviewer thống nhất.

## Allowed files

- `api/auth/login.ts`
- `api/auth/logout.ts`
- `api/auth/change-password.ts`
- `api/_shared/auth.ts`
- `tests/integration/auth.test.ts`

## Acceptance checklist

- [x] Locked/inactive rejected.
- [x] Reset revokes.
- [x] No token in localStorage/database raw.

## Test plan

- Integration tests in `tests/integration/auth.test.ts` (12 tests covering successful/failed logins, session expiration, absolute/idle timeouts, change password, session revocation, and rate limiting).
- Run `npm run test` and `verify.ps1` to confirm typecheck, lint, build, and tests are passing.

## Handoff

- Opaque HTTP-only cookie-based session management using SHA-256 session token hashes in database.
- Locked/inactive checks and timed locked account lookup on login.
- Rate-limiting (10 attempts / 15 minutes) with failed login count tracking.
- Change password force logout of other active user sessions.

## Review result

- Antigravity reviewed and verified all implementations and test cases. All tests passed successfully.
