-- Migration: Add in-app notifications table
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('nudge_report', 'nudge_task', 'project_approved', 'project_rejected', 'task_assigned', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_in_app_notifications_recipient ON in_app_notifications(recipient_user_id, read_at, created_at DESC);
