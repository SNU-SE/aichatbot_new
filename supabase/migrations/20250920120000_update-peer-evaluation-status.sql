-- Add status tracking and return metadata to peer evaluations
ALTER TABLE public.peer_evaluations
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.peer_evaluations
  ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.peer_evaluations
  ADD COLUMN return_reason TEXT;

ALTER TABLE public.peer_evaluations
  ADD COLUMN returned_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.peer_evaluations
  ADD CONSTRAINT peer_evaluations_status_check
  CHECK (status IN ('pending', 'submitted', 'returned'));

-- Backfill existing records so historical submissions reflect the new fields
UPDATE public.peer_evaluations
SET
  status = CASE
    WHEN COALESCE(is_completed, false) THEN 'submitted'
    ELSE 'pending'
  END,
  locked_at = CASE
    WHEN COALESCE(is_completed, false) AND submitted_at IS NOT NULL THEN submitted_at
    ELSE locked_at
  END;
