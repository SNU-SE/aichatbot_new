
-- 모둠 기반 동료평가 랜덤 배정을 위한 함수 수정
CREATE OR REPLACE FUNCTION assign_peer_evaluations(activity_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    response_record RECORD;
    evaluator_record RECORD;
    assigned_count INTEGER := 0;
    evaluations_per_response INTEGER := 2; -- 각 응답당 평가자 수
    evaluations_per_evaluator INTEGER := 2; -- 각 평가자당 평가할 응답 수
BEGIN
    -- 기존 배정 삭제 (재배정 시)
    DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    
    -- 제출된 응답들에 대해 모둠 기반 랜덤 배정
    FOR response_record IN 
        SELECT ar.id, ar.student_id, s.group_name
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true
    LOOP
        -- 같은 모둠이 아닌 학생들 중에서 랜덤 선택하여 평가자로 배정
        FOR evaluator_record IN 
            SELECT ar2.student_id 
            FROM argumentation_responses ar2
            JOIN students s2 ON ar2.student_id = s2.student_id
            WHERE ar2.activity_id = activity_id_param 
              AND ar2.is_submitted = true 
              AND ar2.student_id != response_record.student_id
              AND (response_record.group_name IS NULL OR s2.group_name IS NULL OR s2.group_name != response_record.group_name)
              -- 이미 충분한 평가를 배정받지 않은 학생들만 선택
              AND (
                SELECT COUNT(*) 
                FROM peer_evaluations pe 
                WHERE pe.evaluator_id = ar2.student_id 
                  AND pe.activity_id = activity_id_param
              ) < evaluations_per_evaluator
            ORDER BY RANDOM()
            LIMIT evaluations_per_response
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
