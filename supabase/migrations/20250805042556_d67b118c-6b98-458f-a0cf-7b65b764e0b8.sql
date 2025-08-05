-- CRITICAL: Force remove the dangerous "Allow all access" policy that's causing all chats to be visible
DROP POLICY IF EXISTS "Allow all access to chat_logs" ON public.chat_logs;

-- Verify all existing policies are correctly configured for student isolation
-- (The correct policies should already exist from the previous migration)