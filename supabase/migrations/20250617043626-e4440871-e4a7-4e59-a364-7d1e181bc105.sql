
-- Create prompt_templates table
CREATE TABLE public.prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  prompt TEXT NOT NULL,
  category VARCHAR NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for prompt_templates
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to manage prompt templates
CREATE POLICY "Allow all operations on prompt templates" 
  ON public.prompt_templates 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
