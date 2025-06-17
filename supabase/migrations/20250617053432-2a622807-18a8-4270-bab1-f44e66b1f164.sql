
-- Add target_class column to prompt_templates table for class-specific prompts
ALTER TABLE prompt_templates 
ADD COLUMN target_class varchar DEFAULT 'all';

-- Create class_prompt_settings table to store active prompts per class
CREATE TABLE IF NOT EXISTS class_prompt_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name varchar NOT NULL,
  active_prompt_id uuid REFERENCES prompt_templates(id),
  system_prompt text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(class_name)
);

-- Remove is_active column from prompt_templates since we'll use class_prompt_settings instead
ALTER TABLE prompt_templates 
DROP COLUMN IF EXISTS is_active;

-- Set up realtime for class_prompt_settings
ALTER TABLE class_prompt_settings REPLICA IDENTITY FULL;
