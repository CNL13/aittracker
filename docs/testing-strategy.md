# Chiến lược kiểm thử

## 1. Unit

- normalize username;
- required check-in;
- working day;
- due soon/overdue;
- color precedence;
- project/task transitions;
- notification dedupe;
- permission policy helpers.

## 2. Integration

- auth/session/revoke;
- admin last invariant;
- create task + one owner;
- owner replacement transaction;
- check-in atomic;
- blocker alert after commit;
- optimistic lock;
- absence effect;
- dashboard count/drill-down;
- cron idempotency.

Dùng database test thật hoặc môi trường Postgres tương thích, không mock hết SQL.

## 3. E2E

Luồng bắt buộc:

1. Admin bootstrap/login.
2. Create member.
3. Member first login/change password.
4. Create project/add member.
5. Create task/assign.
6. Member checks in.
7. Dashboard reflects.
8. Blocker alert/log.
9. Late/missing cases.
10. Lock user/session revoked.

## 4. Security

- IDOR.
- forged actor IDs.
- role escalation.
- brute force.
- session fixation/revoke.
- CSRF/origin.
- secret scanning.
- log redaction.

## 5. Browser/mobile

Antigravity ưu tiên:

- viewport 360.
- Chrome/Edge/Safari/Firefox mục tiêu.
- keyboard.
- network failure.
- conflict.
- empty/error states.

## 6. Dataset performance

Seed gần production:

- 100 users;
- nhiều projects;
- 10.000 tasks;
- 100.000 check-in items.

Đo p95 theo NFR.
