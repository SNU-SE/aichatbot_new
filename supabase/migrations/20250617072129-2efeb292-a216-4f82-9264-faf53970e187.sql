
-- Force drop the view and recreate it completely
DROP VIEW IF EXISTS public.student_activity_view CASCADE;

-- Recreate the view without any SECURITY DEFINER property
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
