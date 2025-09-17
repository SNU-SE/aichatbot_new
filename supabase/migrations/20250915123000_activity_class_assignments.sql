-- Activity class assignments table to manage per-class visibility

CREATE TABLE public.activity_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(activity_id, class_name)
);

ALTER TABLE public.activity_class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view activity class assignments"
ON public.activity_class_assignments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify activity class assignments"
ON public.activity_class_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_activity_class_assignments_activity
  ON public.activity_class_assignments(activity_id);

CREATE INDEX idx_activity_class_assignments_class
  ON public.activity_class_assignments(class_name);
