# ADR-002 — Một check-in/người/ngày

## Status
Accepted.

## Decision

Một `daily_checkins` cho mỗi user/date, chứa nhiều `daily_checkin_items`.

## Reason

- phù hợp “hôm nay làm gì”;
- điền 1–2 phút;
- tránh một form/task;
- vẫn truy vết từng task.

## Consequences

- unique user/date;
- unique checkin/task;
- transaction toàn submit;
- first_submitted_at bất biến.
