
-- 모둠 기반 동료평가 랜덤 배정을 위한 함수 수정 (평가자 수 매개변수 추가)
CREATE OR REPLACE FUNCTION assign_peer_evaluations(
    activity_id_param UUID,
    evaluations_per_student INTEGER DEFAULT 2
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    response_record RECORD;
    evaluator_record RECORD;
    assigned_count INTEGER := 0;
    total_submitted INTEGER;
BEGIN
    -- 제출된 응답 수 확인
    SELECT COUNT(*) INTO total_submitted
    FROM argumentation_responses ar
    WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true;
    
    -- 최소 인원 확인 (평가할 학생 수 + 1)
    IF total_submitted < (evaluations_per_student + 1) THEN
        RAISE EXCEPTION '동료평가를 진행하려면 최소 %명의 학생이 논증을 제출해야 합니다.', (evaluations_per_student + 1);
    END IF;
    
    -- 기존 배정 삭제 (재배정 시)
    DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    
    -- 제출된 응답들에 대해 모둠 기반 배정
    FOR response_record IN 
        SELECT ar.id, ar.student_id, s.group_name
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true
    LOOP
        -- 같은 모둠이 아닌 학생들 중에서 평가자로 배정
        FOR evaluator_record IN 
            SELECT ar2.student_id 
            FROM argumentation_responses ar2
            JOIN students s2 ON ar2.student_id = s2.student_id
            WHERE ar2.activity_id = activity_id_param 
              AND ar2.is_submitted = true 
              AND ar2.student_id != response_record.student_id
              AND (response_record.group_name IS NULL OR s2.group_name IS NULL OR s2.group_name != response_record.group_name)
            ORDER BY RANDOM()
            LIMIT evaluations_per_student
        LOOP
            INSERT INTO peer_evaluations (
                activity_id, 
                evaluator_id, 
                target_response_id,
                created_at
            )
            VALUES (
                activity_id_param,
                evaluator_record.student_id,
                response_record.id,
                NOW()
            );
            assigned_count := assigned_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;
