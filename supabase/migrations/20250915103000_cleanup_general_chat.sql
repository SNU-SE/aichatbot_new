-- Normalize existing general chat data
UPDATE public.chat_logs AS cl
SET activity_id = '00000000-0000-0000-0000-000000000000'
FROM public.activities AS a
WHERE cl.activity_id = a.id
  AND a.type = 'general_chat'
  AND a.id <> '00000000-0000-0000-0000-000000000000';

UPDATE public.chat_logs
SET activity_id = '00000000-0000-0000-0000-000000000000'
WHERE activity_id IS NULL;

DELETE FROM public.activities
WHERE type = 'general_chat'
  AND id <> '00000000-0000-0000-0000-000000000000';
