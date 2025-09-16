-- Allow general chat activities by extending the type constraint
ALTER TABLE public.activities
DROP CONSTRAINT IF EXISTS activities_type_check;

ALTER TABLE public.activities
ADD CONSTRAINT activities_type_check
CHECK (type IN ('experiment', 'argumentation', 'discussion', 'general_chat'));

-- Ensure the dedicated general chat activity exists with a stable identifier
INSERT INTO public.activities (
  id,
  title,
  type,
  content,
  file_url,
  final_question,
  modules_count,
  is_hidden,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '챗봇과 대화하기',
  'general_chat',
  jsonb_build_object('description', '언제든지 AI 학습 도우미와 자유롭게 대화를 나눠보세요.'),
  NULL,
  NULL,
  NULL,
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  content = EXCLUDED.content,
  is_hidden = EXCLUDED.is_hidden,
  updated_at = now();
