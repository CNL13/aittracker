# Phối hợp Antigravity và Codex

## 1. Mô hình

Một agent triển khai, một agent review.

Không chia “frontend luôn Antigravity, backend luôn Codex” một cách máy móc; owner được ghi trong task.

## 2. Quy trình task

```text
backlog
→ active
→ review
→ changes_requested (nếu có)
→ verified
→ done
```

## 3. Ownership

Task chứa:

- Owner.
- Reviewer.
- Branch/worktree.
- Allowed files.
- Forbidden/out-of-scope.
- FR/BR/AC.
- Dependencies.

Agent không sửa file ngoài allowed files trừ khi task được cập nhật.

## 4. Handoff

Implementer ghi:

- summary;
- changed files;
- migrations;
- tests;
- known issues;
- screenshots/artifacts nếu UI;
- security notes.

Reviewer:

- không sửa trực tiếp;
- kiểm tra scope;
- chạy verification;
- đối chiếu AC;
- ghi accepted hoặc changes requested.

## 5. Song song

Được chạy song song khi:

- dependency độc lập;
- không trùng file/schema/API;
- contracts đã ổn định.

Không chạy UI trước API contract/database liên quan nếu chưa chốt.

## 6. Conflict

Nếu agent phát hiện conflict:

- dừng thay đổi file chồng lấn;
- không tự merge;
- ghi task;
- chọn owner duy nhất;
- rebase/merge dưới kiểm soát con người.

## 7. Phân vai gợi ý

Codex:

- schema/migration;
- auth;
- API;
- transaction;
- test;
- review logic.

Antigravity:

- kế hoạch;
- UI;
- browser/E2E;
- responsive;
- walkthrough;
- review trải nghiệm.

## 8. Người dùng là người quyết định cuối

Agent không được tự chốt thay đổi nghiệp vụ hoặc phạm vi.
