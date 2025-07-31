-- Add is_hidden column to activities table
ALTER TABLE public.activities 
ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;