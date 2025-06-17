
-- 학생 정보 테이블
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL UNIQUE,
  class_name VARCHAR(100) NOT NULL,
  name VARCHAR(100),
  mother_tongue VARCHAR(50) DEFAULT 'Korean',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 관리자 설정 테이블
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  selected_provider VARCHAR(20) DEFAULT 'openai',
  selected_model VARCHAR(50) DEFAULT 'gpt-4o',
  system_prompt TEXT DEFAULT '학생의 질문에 직접적으로 답을 하지 말고, 그 답이 나오기까지 필요한 최소한의 정보를 제공해. 단계별로 학생들이 생각하고 질문할 수 있도록 유도해줘.',
  rag_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 학습 활동 테이블
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('experiment', 'argumentation', 'discussion')),
  content JSONB NOT NULL DEFAULT '{}',
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 학생 세션 테이블 (접속 상태 추적)
CREATE TABLE public.student_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL REFERENCES public.students(student_id),
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_online BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 챗봇 대화 기록 테이블
CREATE TABLE public.chat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL REFERENCES public.students(student_id),
  activity_id UUID REFERENCES public.activities(id),
  message TEXT NOT NULL,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('student', 'bot')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Row Level Security 활성화
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 대한 SELECT, INSERT, UPDATE, DELETE 정책 (인증 없이 접근 가능)
CREATE POLICY "Allow all access to students" ON public.students FOR ALL USING (true);
CREATE POLICY "Allow all access to admin_settings" ON public.admin_settings FOR ALL USING (true);
CREATE POLICY "Allow all access to activities" ON public.activities FOR ALL USING (true);
CREATE POLICY "Allow all access to student_sessions" ON public.student_sessions FOR ALL USING (true);
CREATE POLICY "Allow all access to chat_logs" ON public.chat_logs FOR ALL USING (true);

-- 기본 관리자 설정 데이터 삽입
INSERT INTO public.admin_settings (id) VALUES (gen_random_uuid());
