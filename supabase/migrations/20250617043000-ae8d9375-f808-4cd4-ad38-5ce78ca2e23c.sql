
-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create RLS policies for the bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-files');

-- Add file_url column to chat_logs table for storing uploaded files
ALTER TABLE public.chat_logs ADD COLUMN file_url TEXT;
ALTER TABLE public.chat_logs ADD COLUMN file_name TEXT;
ALTER TABLE public.chat_logs ADD COLUMN file_type TEXT;
