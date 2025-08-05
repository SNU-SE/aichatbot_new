-- Step 1: Remove the problematic "Allow all access" policy
DROP POLICY IF EXISTS "Allow all access to chat_logs" ON public.chat_logs;

-- Step 2: Create proper RLS policies for chat_logs
CREATE POLICY "Students can view their own chat logs" 
ON public.chat_logs 
FOR SELECT 
USING (
  -- Allow if user is admin OR if student_id matches the authenticated student's student_id
  has_role(auth.uid(), 'admin'::app_role) OR 
  student_id IN (
    SELECT s.student_id 
    FROM public.students s 
    WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own chat logs" 
ON public.chat_logs 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin OR if student_id matches the authenticated student's student_id
  has_role(auth.uid(), 'admin'::app_role) OR 
  student_id IN (
    SELECT s.student_id 
    FROM public.students s 
    WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Only admins can update chat logs" 
ON public.chat_logs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete chat logs" 
ON public.chat_logs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));