-- Update JWT-based policies to expect authenticated role tokens
DROP POLICY IF EXISTS "JWT students can view chat logs" ON public.chat_logs;
DROP POLICY IF EXISTS "JWT students can insert chat logs" ON public.chat_logs;

CREATE POLICY "JWT students can view chat logs"
ON public.chat_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (auth.jwt()->>'role' = 'authenticated' AND auth.jwt()->>'student_id' = chat_logs.student_id)
);

CREATE POLICY "JWT students can insert chat logs"
ON public.chat_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (auth.jwt()->>'role' = 'authenticated' AND auth.jwt()->>'student_id' = student_id)
);

DROP POLICY IF EXISTS "JWT students manage question frequency" ON public.question_frequency;

CREATE POLICY "JWT students manage question frequency"
ON public.question_frequency
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (auth.jwt()->>'role' = 'authenticated' AND auth.jwt()->>'student_id' = question_frequency.student_id)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (auth.jwt()->>'role' = 'authenticated' AND auth.jwt()->>'student_id' = question_frequency.student_id)
);
