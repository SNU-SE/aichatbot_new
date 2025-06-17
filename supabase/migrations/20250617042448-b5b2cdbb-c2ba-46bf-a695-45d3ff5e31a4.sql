
-- Enable realtime for student_sessions table
ALTER TABLE public.student_sessions REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_sessions;

-- Enable realtime for chat_logs table
ALTER TABLE public.chat_logs REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_logs;

-- Create a view for student activity monitoring
CREATE OR REPLACE VIEW public.student_activity_view AS
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
