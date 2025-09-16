
-- 체크리스트 완료 기록 히스토리 테이블 생성
CREATE TABLE public.checklist_completion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  checklist_item_id UUID NOT NULL,
  activity_id UUID NOT NULL,
  description TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reset_at TIMESTAMP WITH TIME ZONE -- 초기화된 시점 기록
);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_checklist_history_student_id ON public.checklist_completion_history(student_id);
CREATE INDEX idx_checklist_history_activity_id ON public.checklist_completion_history(activity_id);
CREATE INDEX idx_checklist_history_completed_at ON public.checklist_completion_history(completed_at);

-- RLS 정책 활성화
ALTER TABLE public.checklist_completion_history ENABLE ROW LEVEL SECURITY;

-- 모든 접근 허용 정책 (기존 테이블들과 동일)
CREATE POLICY "Allow all access to checklist_completion_history" 
ON public.checklist_completion_history FOR ALL USING (true);

-- 기존 완료된 체크리스트 데이터를 히스토리 테이블로 마이그레이션
INSERT INTO public.checklist_completion_history (
  student_id,
  checklist_item_id,
  activity_id,
  description,
  activity_title,
  completed_at
)
SELECT 
  scp.student_id,
  scp.checklist_item_id,
  ci.activity_id,
  ci.description,
  a.title,
  scp.completed_at
FROM public.student_checklist_progress scp
JOIN public.checklist_items ci ON scp.checklist_item_id = ci.id
JOIN public.activities a ON ci.activity_id = a.id
WHERE scp.is_completed = true AND scp.completed_at IS NOT NULL;

-- 체크리스트 완료 시 히스토리에 자동 저장하는 함수
CREATE OR REPLACE FUNCTION save_checklist_completion_to_history()
RETURNS TRIGGER AS $$
BEGIN
  -- 완료 상태로 변경되었을 때만 히스토리에 저장
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    INSERT INTO checklist_completion_history (
      student_id,
      checklist_item_id,
      activity_id,
      description,
      activity_title,
      completed_at
    )
    SELECT 
      NEW.student_id,
      NEW.checklist_item_id,
      ci.activity_id,
      ci.description,
      a.title,
      NEW.completed_at
    FROM checklist_items ci
    JOIN activities a ON ci.activity_id = a.id
    WHERE ci.id = NEW.checklist_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_save_checklist_completion_history
  AFTER INSERT OR UPDATE ON public.student_checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION save_checklist_completion_to_history();
