-- Make update_student_session run with elevated privileges so it can maintain sessions
CREATE OR REPLACE FUNCTION public.update_student_session(student_id_param VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO student_sessions (student_id, last_active, is_online)
    VALUES (student_id_param, NOW(), true)
    ON CONFLICT (student_id) 
    DO UPDATE SET 
        last_active = NOW(),
        is_online = true;
END;
$$;

-- Adjust chat_logs policies to support session-based access for students
DROP POLICY IF EXISTS "Students can view their own chat logs" ON public.chat_logs;
DROP POLICY IF EXISTS "Students can insert their own chat logs" ON public.chat_logs;

CREATE POLICY "Active students can view chat logs"
ON public.chat_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1
    FROM public.student_sessions ss
    WHERE ss.student_id = chat_logs.student_id
      AND ss.is_online = true
  )
);

CREATE POLICY "Active students can insert chat logs"
ON public.chat_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1
    FROM public.student_sessions ss
    WHERE ss.student_id = student_id
      AND ss.is_online = true
  )
);
