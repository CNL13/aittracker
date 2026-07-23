DO $$
BEGIN
    CREATE TYPE work_schedule_shift AS ENUM ('morning', 'afternoon', 'full', 'overtime', 'online', 'off', 'custom');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    shift work_schedule_shift NOT NULL,
    custom_start TIME,
    custom_end TIME,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_work_schedule_user_date UNIQUE (user_id, work_date),
    CONSTRAINT check_work_schedule_min_date CHECK (work_date >= DATE '2025-01-01'),
    CONSTRAINT check_work_schedule_custom_time CHECK (
        (shift != 'custom' AND custom_start IS NULL AND custom_end IS NULL)
        OR
        (shift = 'custom' AND custom_start IS NOT NULL AND custom_end IS NOT NULL AND custom_end > custom_start)
    )
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_work_schedules_updated_at'
    ) THEN
        CREATE TRIGGER trg_work_schedules_updated_at
        BEFORE UPDATE ON work_schedules
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON work_schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_user_month ON work_schedules(user_id, work_date);
