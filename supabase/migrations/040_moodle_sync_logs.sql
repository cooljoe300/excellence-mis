-- Moodle synchronization log table
-- Tracks all Moodle sync operations for audit trail and debugging

CREATE TYPE moodle_sync_action AS ENUM (
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'ENROL_USER',
  'UNENROL_USER',
  'ASSIGN_ROLE',
  'SYNC_COURSE',
  'SYNC_GRADE',
  'BULK_SYNC'
);

CREATE TYPE moodle_sync_status AS ENUM (
  'SUCCESS',
  'FAILED',
  'PENDING',
  'RETRY'
);

CREATE TABLE IF NOT EXISTS moodle_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'lecturer', 'course', 'enrolment')),
  entity_id UUID NOT NULL,
  action moodle_sync_action NOT NULL,
  status moodle_sync_status NOT NULL DEFAULT 'PENDING',
  moodle_id TEXT,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_moodle_sync_logs_entity ON moodle_sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_moodle_sync_logs_status ON moodle_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_moodle_sync_logs_created_at ON moodle_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moodle_sync_logs_pending ON moodle_sync_logs(status) WHERE status = 'PENDING' OR status = 'RETRY';

-- Enable RLS
ALTER TABLE moodle_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can read all logs
CREATE POLICY "Admins can read all moodle sync logs"
  ON moodle_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: No one can insert directly (only through server actions)
CREATE POLICY "No direct inserts to moodle sync logs"
  ON moodle_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Policy: No one can update directly (only through server actions)
CREATE POLICY "No direct updates to moodle sync logs"
  ON moodle_sync_logs FOR UPDATE
  TO authenticated
  WITH CHECK (false);

-- Policy: No one can delete directly
CREATE POLICY "No direct deletes to moodle sync logs"
  ON moodle_sync_logs FOR DELETE
  TO authenticated
  WITH CHECK (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_moodle_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_moodle_sync_logs_updated_at
  BEFORE UPDATE ON moodle_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_moodle_sync_logs_updated_at();

-- Comment
COMMENT ON TABLE moodle_sync_logs IS 'Audit log for Moodle LMS synchronization operations';
COMMENT ON COLUMN moodle_sync_logs.entity_type IS 'Type of entity being synced (student, lecturer, course, enrolment)';
COMMENT ON COLUMN moodle_sync_logs.entity_id IS 'UUID of the entity in Supabase';
COMMENT ON COLUMN moodle_sync_logs.action IS 'The Moodle API action performed';
COMMENT ON COLUMN moodle_sync_logs.status IS 'Current status of the sync operation';
COMMENT ON COLUMN moodle_sync_logs.moodle_id IS 'The Moodle entity ID (if successful)';
COMMENT ON COLUMN moodle_sync_logs.request_data IS 'Request data sent to Moodle API (for debugging)';
COMMENT ON COLUMN moodle_sync_logs.response_data IS 'Response data from Moodle API (for debugging)';
COMMENT ON COLUMN moodle_sync_logs.error_message IS 'Human-readable error message';
COMMENT ON COLUMN moodle_sync_logs.error_code IS 'Moodle error code (if available)';
COMMENT ON COLUMN moodle_sync_logs.retry_count IS 'Number of retry attempts';
COMMENT ON COLUMN moodle_sync_logs.max_retries IS 'Maximum retry attempts allowed';
