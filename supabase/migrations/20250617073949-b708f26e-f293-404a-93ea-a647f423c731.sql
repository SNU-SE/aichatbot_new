
-- Create user roles enum and table for proper role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Enable RLS on all sensitive tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on class_prompt_settings" ON public.class_prompt_settings;

-- Create proper RLS policies for students table
CREATE POLICY "Students can view all student records"
ON public.students
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify students"
ON public.students
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create proper RLS policies for chat_logs
CREATE POLICY "Students can view their own chat logs"
ON public.chat_logs
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public.students 
    WHERE id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Students can insert their own chat logs"
ON public.chat_logs
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (
    SELECT student_id 
    FROM public.students 
    WHERE id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only admins can update chat logs"
ON public.chat_logs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete chat logs"
ON public.chat_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create proper RLS policies for student_sessions
CREATE POLICY "Students can manage their own sessions"
ON public.student_sessions
FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public.students 
    WHERE id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  student_id IN (
    SELECT student_id 
    FROM public.students 
    WHERE id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

-- Create proper RLS policies for admin_settings (admin only)
CREATE POLICY "Only admins can access admin settings"
ON public.admin_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create proper RLS policies for class_prompt_settings (admin only)
CREATE POLICY "Only admins can access class prompt settings"
ON public.class_prompt_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create proper RLS policies for activities
CREATE POLICY "Everyone can view activities"
ON public.activities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify activities"
ON public.activities
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add user_id column to students table to link with auth.users
ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create unique index to ensure one student per user
CREATE UNIQUE INDEX idx_students_user_id ON public.students(user_id) WHERE user_id IS NOT NULL;

-- Remove API keys from admin_settings table (will use Supabase secrets instead)
ALTER TABLE public.admin_settings 
DROP COLUMN IF EXISTS openai_api_key,
DROP COLUMN IF EXISTS anthropic_api_key;

-- Create user_roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
