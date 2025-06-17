
-- 활동 세부 구조를 위한 테이블들 추가

-- 활동 모듈 테이블 (실험용)
CREATE TABLE public.activity_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 체크리스트 항목 테이블 (모든 활동 타입용)
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.activity_modules(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 학생 체크리스트 진행상태 테이블
CREATE TABLE public.student_checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL REFERENCES public.students(student_id),
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, checklist_item_id)
);

-- 논증 응답 테이블
CREATE TABLE public.argumentation_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL REFERENCES public.students(student_id),
  response_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_submitted BOOLEAN DEFAULT false,
  UNIQUE(activity_id, student_id)
);

-- 동료평가 배정 테이블
CREATE TABLE public.peer_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  evaluator_id VARCHAR(50) NOT NULL REFERENCES public.students(student_id),
  target_response_id UUID NOT NULL REFERENCES public.argumentation_responses(id) ON DELETE CASCADE,
  evaluation_text TEXT,
  is_completed BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evaluator_id, target_response_id)
);

-- 평가 확인 응답 테이블
CREATE TABLE public.evaluation_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL REFERENCES public.students(student_id),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  reflection_text TEXT NOT NULL,
  usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, activity_id)
);

-- activities 테이블에 논증용 필드 추가
ALTER TABLE public.activities ADD COLUMN final_question TEXT;
ALTER TABLE public.activities ADD COLUMN modules_count INTEGER DEFAULT 1;

-- RLS 정책 활성화
ALTER TABLE public.activity_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.argumentation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reflections ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 대한 정책 (인증 없이 접근 가능)
CREATE POLICY "Allow all access to activity_modules" ON public.activity_modules FOR ALL USING (true);
CREATE POLICY "Allow all access to checklist_items" ON public.checklist_items FOR ALL USING (true);
CREATE POLICY "Allow all access to student_checklist_progress" ON public.student_checklist_progress FOR ALL USING (true);
CREATE POLICY "Allow all access to argumentation_responses" ON public.argumentation_responses FOR ALL USING (true);
CREATE POLICY "Allow all access to peer_evaluations" ON public.peer_evaluations FOR ALL USING (true);
CREATE POLICY "Allow all access to evaluation_reflections" ON public.evaluation_reflections FOR ALL USING (true);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_activity_modules_activity_id ON public.activity_modules(activity_id);
CREATE INDEX idx_checklist_items_activity_id ON public.checklist_items(activity_id);
CREATE INDEX idx_checklist_items_module_id ON public.checklist_items(module_id);
CREATE INDEX idx_student_progress_student_id ON public.student_checklist_progress(student_id);
CREATE INDEX idx_argumentation_responses_activity_student ON public.argumentation_responses(activity_id, student_id);
CREATE INDEX idx_peer_evaluations_evaluator ON public.peer_evaluations(evaluator_id);
CREATE INDEX idx_peer_evaluations_activity ON public.peer_evaluations(activity_id);
