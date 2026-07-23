# Bắt đầu tại đây

## 1. Mở workspace

Mở chính thư mục này làm workspace:

`AIT-Work-Tracker-Clean-Foundation`

Không mở đồng thời một thư mục chứa spec cũ.

## 2. Đọc tài liệu theo thứ tự

1. `requirements/DECISIONS.md`
2. `requirements/00-MASTER-SRS.md`
3. `requirements/10-SCOPE-AND-FUTURE.md`
4. `AGENTS.md`
5. `docs/architecture.md`
6. `docs/coordination.md`
7. `tasks/backlog.md`

## 3. Agent bắt đầu

### Codex

Dùng nội dung:

`prompts/CODEX-FIRST-RUN.md`

Codex bắt đầu với:

`tasks/backlog/TASK-001-repository-foundation.md`

### Antigravity

Dùng nội dung:

`prompts/ANTIGRAVITY-FIRST-RUN.md`

Antigravity trước tiên rà kế hoạch TASK-001, không tự triển khai song song cùng vùng file.

## 4. Nguyên tắc quan trọng

- Một task chỉ có một agent triển khai.
- Agent còn lại review.
- Không hai agent cùng sửa một file trong cùng thời điểm.
- Không code ngoài P0.
- Không dùng spec cũ.
- Không thay đổi nghiệp vụ chỉ để code dễ hơn.
- Không tuyên bố hoàn thành khi acceptance criteria chưa đạt.

## 5. Trạng thái hiện tại

- Requirements: đã baseline v3.0.
- Architecture: baseline sơ bộ.
- Source code: chưa tạo.
- Active task: chưa có.
- Task đầu tiên: TASK-001.
