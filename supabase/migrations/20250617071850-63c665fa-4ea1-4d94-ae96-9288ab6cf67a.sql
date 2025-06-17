
-- Enable RLS on class_prompt_settings table
ALTER TABLE public.class_prompt_settings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (since this is admin data)
CREATE POLICY "Allow all operations on class_prompt_settings" 
ON public.class_prompt_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Drop and recreate student_activity_view without SECURITY DEFINER
DROP VIEW IF EXISTS public.student_activity_view;

CREATE VIEW public.student_activity_view AS
SELECT 
  s.student_id,
  s.name,
  s.class_name,
  ss.is_online,
  ss.last_active,
  COUNT(cl.id) as total_messages,
  MAX(cl.timestamp) as last_message_time,
  COUNT(DISTINCT cl.activity_id) as activities_participated
FROM public.students s
LEFT JOIN public.student_sessions ss ON s.student_id = ss.student_id
LEFT JOIN public.chat_logs cl ON s.student_id = cl.student_id
GROUP BY s.student_id, s.name, s.class_name, ss.is_online, ss.last_active;
