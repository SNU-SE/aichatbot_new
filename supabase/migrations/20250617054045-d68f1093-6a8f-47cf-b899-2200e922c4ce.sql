
-- Add model selection columns to class_prompt_settings table
ALTER TABLE class_prompt_settings 
ADD COLUMN selected_provider varchar DEFAULT 'openai',
ADD COLUMN selected_model varchar DEFAULT 'gpt-4o';
