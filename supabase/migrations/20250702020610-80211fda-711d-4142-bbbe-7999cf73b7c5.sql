
-- 학생 세션 추적을 위한 함수 생성
CREATE OR REPLACE FUNCTION public.update_student_session(student_id_param VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO student_sessions (student_id, last_active, is_online)
    VALUES (student_id_param, NOW(), true)
    ON CONFLICT (student_id) 
    DO UPDATE SET 
        last_active = NOW(),
        is_online = true;
END;
$$;

-- 세션 정리를 위한 함수 (5분 이상 비활성 상태면 오프라인으로 표시)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE student_sessions 
    SET is_online = false 
    WHERE last_active < NOW() - INTERVAL '5 minutes' 
    AND is_online = true;
END;
$$;

-- 학생 임시 작업 저장을 위한 테이블
CREATE TABLE IF NOT EXISTS public.student_work_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR NOT NULL,
    activity_id UUID NOT NULL REFERENCES activities(id),
    work_type VARCHAR NOT NULL, -- 'argumentation', 'experiment', 'discussion'
    draft_content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE public.student_work_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their own drafts" 
ON public.student_work_drafts 
FOR ALL 
USING (true);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_student_work_drafts_student_activity 
ON student_work_drafts(student_id, activity_id);
