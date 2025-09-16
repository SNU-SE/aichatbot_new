
-- 동료평가 랜덤 배정을 위한 함수
CREATE OR REPLACE FUNCTION assign_peer_evaluations(activity_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    response_record RECORD;
    evaluator_record RECORD;
    assigned_count INTEGER := 0;
BEGIN
    -- 기존 배정 삭제 (재배정 시)
    DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    
    -- 제출된 응답들에 대해 랜덤 배정
    FOR response_record IN 
        SELECT id, student_id 
        FROM argumentation_responses 
        WHERE activity_id = activity_id_param AND is_submitted = true
    LOOP
        -- 본인을 제외한 다른 학생들 중에서 랜덤 선택
        FOR evaluator_record IN 
            SELECT student_id 
            FROM argumentation_responses 
            WHERE activity_id = activity_id_param 
              AND is_submitted = true 
              AND student_id != response_record.student_id
            ORDER BY RANDOM()
            LIMIT 2  -- 각 응답당 2명이 평가
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

-- 동료평가 통계 조회 함수
CREATE OR REPLACE FUNCTION get_peer_evaluation_stats(activity_id_param UUID)
RETURNS TABLE (
    total_responses INTEGER,
    submitted_responses INTEGER,
    total_evaluations INTEGER,
    completed_evaluations INTEGER,
    completion_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM argumentation_responses WHERE activity_id = activity_id_param),
        (SELECT COUNT(*)::INTEGER FROM argumentation_responses WHERE activity_id = activity_id_param AND is_submitted = true),
        (SELECT COUNT(*)::INTEGER FROM peer_evaluations WHERE activity_id = activity_id_param),
        (SELECT COUNT(*)::INTEGER FROM peer_evaluations WHERE activity_id = activity_id_param AND is_completed = true),
        CASE 
            WHEN (SELECT COUNT(*) FROM peer_evaluations WHERE activity_id = activity_id_param) = 0 THEN 0
            ELSE ROUND(
                (SELECT COUNT(*)::NUMERIC FROM peer_evaluations WHERE activity_id = activity_id_param AND is_completed = true) * 100.0 /
                (SELECT COUNT(*) FROM peer_evaluations WHERE activity_id = activity_id_param), 1
            )
        END;
END;
$$;

-- 학생별 동료평가 현황 조회 함수
CREATE OR REPLACE FUNCTION get_student_evaluation_status(student_id_param VARCHAR, activity_id_param UUID)
RETURNS TABLE (
    has_submitted_response BOOLEAN,
    assigned_evaluations INTEGER,
    completed_evaluations INTEGER,
    received_evaluations INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM argumentation_responses WHERE student_id = student_id_param AND activity_id = activity_id_param AND is_submitted = true),
        (SELECT COUNT(*)::INTEGER FROM peer_evaluations WHERE evaluator_id = student_id_param AND activity_id = activity_id_param),
        (SELECT COUNT(*)::INTEGER FROM peer_evaluations WHERE evaluator_id = student_id_param AND activity_id = activity_id_param AND is_completed = true),
        (SELECT COUNT(*)::INTEGER FROM peer_evaluations pe 
         JOIN argumentation_responses ar ON pe.target_response_id = ar.id 
         WHERE ar.student_id = student_id_param AND pe.activity_id = activity_id_param AND pe.is_completed = true);
END;
$$;
