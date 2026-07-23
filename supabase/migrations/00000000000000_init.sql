-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TYPES & ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE user_status AS ENUM ('active', 'locked', 'inactive');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'archived', 'rejected');
CREATE TYPE project_role AS ENUM ('manager', 'member', 'viewer');
CREATE TYPE task_workflow_status AS ENUM ('todo', 'in_progress', 'waiting', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_assignment_role AS ENUM ('owner', 'collaborator', 'reviewer');
CREATE TYPE blocker_status AS ENUM ('open', 'resolved', 'dismissed');

-- 2. SHARED FUNCTIONS FOR TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. USERS & CREDENTIALS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    normalized_username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) UNIQUE,
    role user_role NOT NULL DEFAULT 'member',
    status user_status NOT NULL DEFAULT 'active',
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    department VARCHAR(120),
    position VARCHAR(120),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_username_length CHECK (char_length(username) BETWEEN 3 AND 50),
    CONSTRAINT check_normalized_username_lowercase CHECK (normalized_username = LOWER(TRIM(username))),
    CONSTRAINT check_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 120),
    CONSTRAINT check_deactivated_at CHECK (
        (status = 'inactive' AND deactivated_at IS NOT NULL) OR
        (status != 'inactive' AND deactivated_at IS NULL)
    )
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE user_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
    last_failed_login_at TIMESTAMP WITH TIME ZONE,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_user_credentials_updated_at
BEFORE UPDATE ON user_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. SESSIONS & SECURITY
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    user_agent VARCHAR(500),
    ip_hash VARCHAR(128)
);

-- Trigger to revoke sessions when a user is deactivated
CREATE OR REPLACE FUNCTION revoke_inactive_user_sessions()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'inactive' THEN
        UPDATE auth_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.id AND revoked_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_revoke_inactive_user_sessions
AFTER UPDATE OF status ON users
FOR EACH ROW
EXECUTE FUNCTION revoke_inactive_user_sessions();

CREATE TABLE auth_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normalized_username VARCHAR(50) NOT NULL,
    ip_hash VARCHAR(128),
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    failure_reason VARCHAR(255)
);

CREATE TABLE external_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
);

-- 5. PROJECTS & MEMBERS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'planning',
    start_date DATE,
    due_date DATE,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_project_name CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT check_project_description CHECK (description IS NULL OR char_length(description) <= 10000),
    CONSTRAINT check_project_dates CHECK (start_date IS NULL OR due_date IS NULL OR due_date >= start_date),
    CONSTRAINT check_project_archived_at CHECK (
        (status = 'archived' AND archived_at IS NOT NULL) OR
        (status != 'archived' AND archived_at IS NULL)
    )
);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_role project_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_project_member_removed_after_joined CHECK (removed_at IS NULL OR removed_at >= joined_at)
);

-- Trigger to ensure only active users can be added to projects
CREATE OR REPLACE FUNCTION check_project_member_user_active()
RETURNS TRIGGER AS $$
DECLARE
    u_status user_status;
BEGIN
    SELECT status INTO u_status FROM users WHERE id = NEW.user_id;
    IF u_status != 'active' THEN
        RAISE EXCEPTION 'Only active users can be added to projects.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_project_member_user_active
BEFORE INSERT OR UPDATE OF user_id ON project_members
FOR EACH ROW
EXECUTE FUNCTION check_project_member_user_active();

-- 6. TASKS & MEMBERS
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    description TEXT,
    start_date DATE,
    due_date DATE,
    priority task_priority NOT NULL DEFAULT 'medium',
    status task_workflow_status NOT NULL DEFAULT 'todo',
    percent_complete INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id),
    status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_task_title CHECK (char_length(title) BETWEEN 1 AND 250),
    CONSTRAINT check_task_description CHECK (description IS NULL OR char_length(description) <= 20000),
    CONSTRAINT check_task_dates CHECK (start_date IS NULL OR due_date IS NULL OR due_date >= start_date),
    CONSTRAINT check_task_percent CHECK (percent_complete BETWEEN 0 AND 100),
    CONSTRAINT check_task_version CHECK (version >= 1),
    CONSTRAINT check_task_done_invariants CHECK (
        (status = 'done' AND percent_complete = 100 AND completed_at IS NOT NULL) OR
        (status != 'done' AND completed_at IS NULL)
    )
);

-- Trigger to increment task version and track status changes
CREATE OR REPLACE FUNCTION update_task_version_and_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = CURRENT_TIMESTAMP;
    IF NEW.status != OLD.status THEN
        NEW.status_changed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_task_version
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_version_and_timestamp();

CREATE TABLE task_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_role task_assignment_role NOT NULL DEFAULT 'collaborator',
    report_required BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_task_member_removed_after_assigned CHECK (removed_at IS NULL OR removed_at >= assigned_at)
);

-- Trigger to default report_required based on role
CREATE OR REPLACE FUNCTION set_task_member_report_required()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_required IS NULL THEN
        IF NEW.assignment_role IN ('owner', 'collaborator') THEN
            NEW.report_required = TRUE;
        ELSE
            NEW.report_required = FALSE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_task_member_report_required
BEFORE INSERT ON task_members
FOR EACH ROW
EXECUTE FUNCTION set_task_member_report_required();

-- 7. CHECK-INS & ITEMS
CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    summary_today TEXT,
    no_activity BOOLEAN NOT NULL DEFAULT FALSE,
    no_activity_reason VARCHAR(1000),
    general_difficulties TEXT,
    help_needed TEXT,
    plan_tomorrow TEXT,
    total_time_spent_hours NUMERIC(4, 2),
    first_submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_by_admin_at TIMESTAMP WITH TIME ZONE,
    admin_edit_reason TEXT,
    CONSTRAINT unique_user_checkin_date UNIQUE (user_id, checkin_date),
    CONSTRAINT check_checkin_summary CHECK (summary_today IS NULL OR char_length(summary_today) <= 5000),
    CONSTRAINT check_checkin_no_activity_reason CHECK (no_activity_reason IS NULL OR char_length(no_activity_reason) <= 1000),
    CONSTRAINT check_checkin_no_activity CHECK (
        (no_activity = TRUE AND no_activity_reason IS NOT NULL AND char_length(no_activity_reason) > 0) OR
        (no_activity = FALSE AND no_activity_reason IS NULL)
    ),
    CONSTRAINT check_checkin_general_difficulties CHECK (general_difficulties IS NULL OR char_length(general_difficulties) <= 3000),
    CONSTRAINT check_checkin_help_needed CHECK (help_needed IS NULL OR char_length(help_needed) <= 3000),
    CONSTRAINT check_checkin_plan_tomorrow CHECK (plan_tomorrow IS NULL OR char_length(plan_tomorrow) <= 3000),
    CONSTRAINT check_checkin_total_time CHECK (total_time_spent_hours IS NULL OR (total_time_spent_hours BETWEEN 0 AND 24)),
    CONSTRAINT check_checkin_admin_edit CHECK (
        (edited_by_admin_at IS NOT NULL AND admin_edit_reason IS NOT NULL AND char_length(admin_edit_reason) > 0) OR
        (edited_by_admin_at IS NULL AND admin_edit_reason IS NULL)
    )
);

-- Trigger to protect first_submitted_at and update updated_at
CREATE OR REPLACE FUNCTION protect_first_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.first_submitted_at = OLD.first_submitted_at;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_first_submitted_at
BEFORE UPDATE ON daily_checkins
FOR EACH ROW
EXECUTE FUNCTION protect_first_submitted_at();

CREATE TABLE daily_checkin_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkin_id UUID NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    progress_note TEXT NOT NULL,
    member_percent_complete INTEGER,
    proposed_task_percent INTEGER,
    proposed_task_status task_workflow_status,
    time_spent_hours NUMERIC(4, 2),
    help_needed TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_checkin_task UNIQUE (checkin_id, task_id),
    CONSTRAINT check_item_progress_note CHECK (char_length(progress_note) BETWEEN 1 AND 5000),
    CONSTRAINT check_item_member_percent CHECK (member_percent_complete IS NULL OR (member_percent_complete BETWEEN 0 AND 100)),
    CONSTRAINT check_item_proposed_percent CHECK (proposed_task_percent IS NULL OR (proposed_task_percent BETWEEN 0 AND 100)),
    CONSTRAINT check_item_time_spent CHECK (time_spent_hours IS NULL OR (time_spent_hours BETWEEN 0 AND 24))
);

CREATE TRIGGER trg_daily_checkin_items_updated_at
BEFORE UPDATE ON daily_checkin_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. BLOCKERS, ABSENCES, CALENDAR
CREATE TABLE task_blockers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_item_id UUID REFERENCES daily_checkin_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    status blocker_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_note TEXT,
    CONSTRAINT check_blocker_description CHECK (char_length(description) BETWEEN 10 AND 2000),
    CONSTRAINT check_blocker_resolution CHECK (
        (status = 'open' AND resolved_at IS NULL AND resolved_by IS NULL AND resolved_note IS NULL) OR 
        (status != 'open' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL AND resolved_note IS NOT NULL AND char_length(resolved_note) > 0)
    )
);

CREATE TABLE user_absences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_absence_dates CHECK (end_date >= start_date),
    CONSTRAINT check_absence_reason CHECK (char_length(reason) <= 1000)
);

CREATE TRIGGER trg_user_absences_updated_at
BEFORE UPDATE ON user_absences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to detect overlapping absences
CREATE OR REPLACE FUNCTION check_absence_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM user_absences
        WHERE user_id = NEW.user_id
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND NOT (NEW.end_date < start_date OR NEW.start_date > end_date)
    ) THEN
        RAISE EXCEPTION 'Absence periods cannot overlap for the same user.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_absence_overlap
BEFORE INSERT OR UPDATE ON user_absences
FOR EACH ROW
EXECUTE FUNCTION check_absence_overlap();

CREATE TABLE non_working_days (
    id UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    work_date DATE PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_non_working_day_name CHECK (char_length(name) BETWEEN 1 AND 200)
);

-- 9. AUDIT, NOTIFICATIONS, SETTINGS
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'system')),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    request_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to make activity_logs read-only
CREATE OR REPLACE FUNCTION protect_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Activity logs are read-only.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_activity_logs
BEFORE UPDATE OR DELETE ON activity_logs
FOR EACH ROW
EXECUTE FUNCTION protect_audit_logs();

CREATE TABLE notifications_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notification_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notification_type VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    dedupe_key VARCHAR(255) NOT NULL UNIQUE,
    provider_message_id VARCHAR(255),
    error_code VARCHAR(100),
    error_message TEXT,
    original_notification_id UUID REFERENCES notifications_log(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Trigger to prevent deleting notification logs
CREATE OR REPLACE FUNCTION protect_notifications_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Notifications log cannot be deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_notifications_delete
BEFORE DELETE ON notifications_log
FOR EACH ROW
EXECUTE FUNCTION protect_notifications_delete();

CREATE TABLE app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 10. ADDITIONAL INDEXES & PARTIAL UNIQUE CONSTRAINTS

-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status_role ON users(status, role);

-- Sessions
CREATE INDEX idx_auth_sessions_user_active ON auth_sessions(user_id, revoked_at, expires_at);

-- Login attempts
CREATE INDEX idx_auth_login_attempts_username_time ON auth_login_attempts(normalized_username, attempted_at);
CREATE INDEX idx_auth_login_attempts_ip_time ON auth_login_attempts(ip_hash, attempted_at);

-- Projects
CREATE INDEX idx_projects_status ON projects(status);

-- Project Members
-- Partial unique: an active user can only belong to a project once
CREATE UNIQUE INDEX idx_project_members_active_project_user ON project_members(project_id, user_id) WHERE (removed_at IS NULL);
CREATE INDEX idx_project_members_user_removed ON project_members(user_id, removed_at);

-- Tasks
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_due_status ON tasks(due_date, status);

-- Task Members
-- Partial unique: an active user can only belong to a task once
CREATE UNIQUE INDEX idx_task_members_active_task_user ON task_members(task_id, user_id) WHERE (removed_at IS NULL);
-- Partial unique: exactly one active owner per task
CREATE UNIQUE INDEX idx_task_members_active_owner ON task_members(task_id) WHERE (assignment_role = 'owner' AND removed_at IS NULL);
CREATE INDEX idx_task_members_user_removed ON task_members(user_id, removed_at);

-- Checkins
CREATE INDEX idx_daily_checkins_user_date ON daily_checkins(user_id, checkin_date);

-- Checkin Items
CREATE INDEX idx_daily_checkin_items_task ON daily_checkin_items(task_id);

-- Blockers
CREATE INDEX idx_task_blockers_task_status_time ON task_blockers(task_id, status, created_at);
-- Partial unique: one open blocker per reporter per task
CREATE UNIQUE INDEX idx_task_blockers_active_open ON task_blockers(task_id, reported_by) WHERE (status = 'open');

-- Audit Logs (Activity Logs)
CREATE INDEX idx_activity_logs_entity_time ON activity_logs(entity_type, created_at);
CREATE INDEX idx_activity_logs_actor_time ON activity_logs(actor_id, created_at);
CREATE INDEX idx_activity_logs_action_time ON activity_logs(action, created_at);

-- Notifications
CREATE INDEX idx_notifications_log_dedupe ON notifications_log(dedupe_key);
