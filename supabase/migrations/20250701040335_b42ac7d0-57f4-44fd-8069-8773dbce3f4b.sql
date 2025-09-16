
-- 클래스별로 분리된 동료평가 배정을 위한 함수 수정 (균등 배정)
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
    target_evaluations_per_evaluator INTEGER;
    current_evaluator_count INTEGER;
BEGIN
    -- 제출된 응답 수 확인
    SELECT COUNT(*) INTO total_submitted
    FROM argumentation_responses ar
    JOIN students s ON ar.student_id = s.student_id
    WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true;
    
    -- 최소 인원 확인 (평가할 학생 수 + 1)
    IF total_submitted < (evaluations_per_student + 1) THEN
        RAISE EXCEPTION '동료평가를 진행하려면 최소 %명의 학생이 논증을 제출해야 합니다.', (evaluations_per_student + 1);
    END IF;
    
    -- 각 평가자가 해야 할 평가 개수 계산 (균등 배정)
    target_evaluations_per_evaluator := evaluations_per_student;
    
    -- 기존 배정 삭제 (재배정 시)
    DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    
    -- 제출된 응답들에 대해 같은 클래스 내에서만 배정
    FOR response_record IN 
        SELECT ar.id, ar.student_id, s.group_name, s.class_name
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true
        ORDER BY RANDOM() -- 응답 순서도 랜덤화
    LOOP
        -- 현재 응답을 평가할 학생들을 선택 (같은 클래스, 다른 모둠, 아직 충분히 배정받지 않은 학생)
        FOR evaluator_record IN 
            SELECT ar2.student_id 
            FROM argumentation_responses ar2
            JOIN students s2 ON ar2.student_id = s2.student_id
            WHERE ar2.activity_id = activity_id_param 
              AND ar2.is_submitted = true 
              AND ar2.student_id != response_record.student_id
              AND s2.class_name = response_record.class_name  -- 같은 클래스만
              AND (response_record.group_name IS NULL OR s2.group_name IS NULL OR s2.group_name != response_record.group_name) -- 다른 모둠
              -- 아직 충분한 평가를 배정받지 않은 학생들만 선택
              AND (
                SELECT COUNT(*) 
                FROM peer_evaluations pe 
                WHERE pe.evaluator_id = ar2.student_id 
                  AND pe.activity_id = activity_id_param
              ) < target_evaluations_per_evaluator
            ORDER BY 
              -- 현재 배정받은 평가 개수가 적은 순으로 우선 선택 (균등 배정)
              (SELECT COUNT(*) FROM peer_evaluations pe WHERE pe.evaluator_id = ar2.student_id AND pe.activity_id = activity_id_param),
              RANDOM()
            LIMIT evaluations_per_student
        LOOP
            -- 평가자의 현재 배정 개수 확인
            SELECT COUNT(*) INTO current_evaluator_count
            FROM peer_evaluations pe 
            WHERE pe.evaluator_id = evaluator_record.student_id 
              AND pe.activity_id = activity_id_param;
            
            -- 평가자가 아직 더 배정받을 수 있는 경우에만 배정
            IF current_evaluator_count < target_evaluations_per_evaluator THEN
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
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;
