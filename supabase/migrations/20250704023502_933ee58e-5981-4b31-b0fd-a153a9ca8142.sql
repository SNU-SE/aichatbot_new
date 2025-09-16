
-- 동료평가 단계 관리를 위한 테이블 생성
CREATE TABLE public.peer_evaluation_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  class_name character varying NOT NULL,
  phase character varying NOT NULL DEFAULT 'argument',
  teacher_completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(activity_id, class_name)
);

-- RLS 정책 설정
ALTER TABLE public.peer_evaluation_phases ENABLE ROW LEVEL SECURITY;

-- 모든 접근 허용 (기존 패턴과 일치)
CREATE POLICY "Allow all access to peer_evaluation_phases" 
  ON public.peer_evaluation_phases 
  FOR ALL 
  USING (true);

-- 단계 업데이트 함수 생성
CREATE OR REPLACE FUNCTION public.update_peer_evaluation_phase(
  activity_id_param uuid,
  class_name_param character varying,
  new_phase character varying
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO peer_evaluation_phases (activity_id, class_name, phase, updated_at)
  VALUES (activity_id_param, class_name_param, new_phase, now())
  ON CONFLICT (activity_id, class_name)
  DO UPDATE SET 
    phase = new_phase,
    updated_at = now(),
    teacher_completed_at = CASE 
      WHEN new_phase = 'evaluation-check' THEN now()
      ELSE peer_evaluation_phases.teacher_completed_at
    END;
END;
$$;

-- 평가 완료 상태 확인 함수
CREATE OR REPLACE FUNCTION public.is_peer_evaluation_completed(
  activity_id_param uuid,
  class_name_param character varying
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  current_phase character varying;
BEGIN
  SELECT phase INTO current_phase 
  FROM peer_evaluation_phases 
  WHERE activity_id = activity_id_param AND class_name = class_name_param;
  
  RETURN COALESCE(current_phase = 'evaluation-check', false);
END;
$$;
