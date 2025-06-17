
-- Add is_active column to prompt_templates table
ALTER TABLE prompt_templates 
ADD COLUMN is_active boolean DEFAULT false;

-- Set up realtime for prompt_templates if not already enabled
ALTER TABLE prompt_templates REPLICA IDENTITY FULL;
