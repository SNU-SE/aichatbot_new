-- Extend has_role to honor JWT role claims for admin tokens

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
    OR (
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          COALESCE(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)
        ) AS role_text
        WHERE role_text = _role::text
      )
    )
    OR (
      _role = 'admin'
      AND ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean IS TRUE)
    );
$$;
