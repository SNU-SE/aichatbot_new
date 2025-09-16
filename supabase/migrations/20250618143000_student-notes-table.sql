
-- Create student_notes table for discussion notes
CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR NOT NULL,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, activity_id)
);

-- Add RLS policy
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_student_notes_student_activity 
ON student_notes(student_id, activity_id);
