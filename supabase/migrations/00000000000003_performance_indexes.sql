-- Migration 00000000000003_performance_indexes.sql
-- Add composite indexes to improve query performance

CREATE INDEX IF NOT EXISTS idx_daily_checkins_date_user ON daily_checkins (checkin_date, user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_checkin_items_checkin_task ON daily_checkin_items (checkin_id, task_id);
