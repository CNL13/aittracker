-- Migration: Add project chat and progress approval
-- Tables: progress_updates, project_messages

-- 1. Progress Updates (Yêu cầu cập nhật tiến độ)
CREATE TABLE IF NOT EXISTS progress_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id),
    
    -- Employee submission
    proposed_percent INT NOT NULL CHECK (proposed_percent BETWEEN 0 AND 100),
    description TEXT,
    evidence_url TEXT,
    
    -- PM review
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    final_percent INT CHECK (final_percent IS NULL OR (final_percent BETWEEN 0 AND 100)),
    review_note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_progress_updates_task ON progress_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_status ON progress_updates(status);

-- 2. Project Messages (Chat dự án)
CREATE TABLE IF NOT EXISTS project_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_project_messages_project ON project_messages(project_id, created_at DESC);
