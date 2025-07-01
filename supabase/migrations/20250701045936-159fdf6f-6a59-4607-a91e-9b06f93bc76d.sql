
-- argumentation_responses 테이블에 최종 수정 주장을 저장할 컬럼 추가
ALTER TABLE argumentation_responses 
ADD COLUMN final_revised_argument text,
ADD COLUMN final_revision_submitted_at timestamp with time zone;
