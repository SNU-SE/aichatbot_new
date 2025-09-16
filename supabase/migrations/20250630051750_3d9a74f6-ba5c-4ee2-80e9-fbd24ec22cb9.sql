
-- Add RLS policies for class_prompt_settings table
-- Enable RLS if not already enabled
ALTER TABLE class_prompt_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to select all records
CREATE POLICY "Allow anonymous users to select class prompt settings" ON class_prompt_settings
    FOR SELECT TO anon USING (true);

-- Allow anonymous users to insert new records
CREATE POLICY "Allow anonymous users to insert class prompt settings" ON class_prompt_settings
    FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous users to update existing records
CREATE POLICY "Allow anonymous users to update class prompt settings" ON class_prompt_settings
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow anonymous users to delete records
CREATE POLICY "Allow anonymous users to delete class prompt settings" ON class_prompt_settings
    FOR DELETE TO anon USING (true);
