
-- Add RAG setting to class_prompt_settings table
ALTER TABLE class_prompt_settings 
ADD COLUMN rag_enabled boolean DEFAULT false;

-- Update existing records to have default RAG setting
UPDATE class_prompt_settings 
SET rag_enabled = false 
WHERE rag_enabled IS NULL;
