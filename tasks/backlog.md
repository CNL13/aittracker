# P0 Backlog

| Task | Tên | Owner | Reviewer | Dependencies | Phase |
|---|---|---|---|---|---|
| TASK-001 | Repository foundation | Codex | Antigravity | None | Phase 0 |
| TASK-002 | Database baseline | Codex | Antigravity | TASK-001 | Phase 0 |
| TASK-003 | Custom auth and session | Codex | Antigravity | TASK-002 | Phase 1 |
| TASK-004 | Admin user management and login shell | Antigravity | Codex | TASK-003 | Phase 1 |
| TASK-005 | Project lifecycle and membership | Codex | Antigravity | TASK-002,TASK-004 | Phase 2 |
| TASK-006 | Task and assignment lifecycle | Codex | Antigravity | TASK-005 | Phase 2 |
| TASK-007 | Absence and non-working days | Codex | Antigravity | TASK-004 | Phase 2 |
| TASK-008 | My Work page and scoped task access | Antigravity | Codex | TASK-006 | Phase 2 |
| TASK-009 | Daily check-in backend | Codex | Antigravity | TASK-006,TASK-007 | Phase 3 |
| TASK-010 | Daily check-in mobile UI | Antigravity | Codex | TASK-008,TASK-009 | Phase 3 |
| TASK-011 | Blockers and help requests | Codex | Antigravity | TASK-009,TASK-010 | Phase 3 |
| TASK-012 | Dashboard aggregate API | Codex | Antigravity | TASK-006,TASK-007,TASK-009,TASK-011 | Phase 4 |
| TASK-013 | Admin dashboard UI | Antigravity | Codex | TASK-012 | Phase 4 |
| TASK-014 | Kanban with dynamic blocked column | Antigravity | Codex | TASK-006,TASK-011 | Phase 4 |
| TASK-015 | Email and cron notifications | Codex | Antigravity | TASK-007,TASK-011,TASK-012 | Phase 5 |
| TASK-016 | Audit, admin check-ins and email log | Codex | Antigravity | TASK-004,TASK-009,TASK-015 | Phase 5 |
| TASK-017 | Search, pagination, accessibility and performance | Antigravity | Codex | TASK-004–TASK-016 | Phase 5 |
| TASK-018 | P0 release verification | Antigravity | Codex | TASK-001–TASK-017 | Phase 6 |
