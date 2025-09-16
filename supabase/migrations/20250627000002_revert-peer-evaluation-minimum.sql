
-- 기존 함수들의 최소 학생 수를 원래 설정으로 되돌림
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
        RAISE EXCEPTION '동료평가를 진행하려면 최소 %명 이상의 학생이 논증을 제출해야 합니다.', (evaluations_per_student + 1);
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

-- 특정 배정 함수도 원래 설정으로 되돌림
CREATE OR REPLACE FUNCTION assign_peer_evaluations_specific(
    activity_id_param UUID,
    evaluations_per_student INTEGER DEFAULT 2,
    group_offset INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    response_record RECORD;
    evaluator_record RECORD;
    assigned_count INTEGER := 0;
    total_submitted INTEGER;
    max_group_number INTEGER;
    target_group_number INTEGER;
BEGIN
    -- 제출된 응답 수 확인
    SELECT COUNT(*) INTO total_submitted
    FROM argumentation_responses ar
    WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true;
    
    -- 최소 인원 확인 (평가할 학생 수 + 1)
    IF total_submitted < (evaluations_per_student + 1) THEN
        RAISE EXCEPTION '동료평가를 진행하려면 최소 %명 이상의 학생이 논증을 제출해야 합니다.', (evaluations_per_student + 1);
    END IF;
    
    -- 최대 그룹 번호 확인
    SELECT MAX(CAST(REPLACE(s.group_name, '조', '') AS INTEGER)) INTO max_group_number
    FROM argumentation_responses ar
    JOIN students s ON ar.student_id = s.student_id
    WHERE ar.activity_id = activity_id_param 
      AND ar.is_submitted = true 
      AND s.group_name IS NOT NULL
      AND s.group_name ~ '^\d+조$';
    
    -- 그룹 번호가 없으면 기본 랜덤 배정으로 fallback
    IF max_group_number IS NULL THEN
        RETURN assign_peer_evaluations(activity_id_param, evaluations_per_student);
    END IF;
    
    -- 기존 배정 삭제 (재배정 시)
    DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    
    -- 제출된 응답들에 대해 특정 배정
    FOR response_record IN 
        SELECT ar.id, ar.student_id, s.group_name
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true
    LOOP
        -- 현재 학생의 그룹 번호에서 offset만큼 더한 그룹을 계산
        IF response_record.group_name IS NOT NULL AND response_record.group_name ~ '^\d+조$' THEN
            target_group_number := CAST(REPLACE(response_record.group_name, '조', '') AS INTEGER) + group_offset;
            
            -- 최대 그룹 번호를 초과하면 순환
            IF target_group_number > max_group_number THEN
                target_group_number := target_group_number - max_group_number;
            END IF;
            
            -- 대상 그룹의 학생들 중에서 평가자로 배정
            FOR evaluator_record IN 
                SELECT ar2.student_id 
                FROM argumentation_responses ar2
                JOIN students s2 ON ar2.student_id = s2.student_id
                WHERE ar2.activity_id = activity_id_param 
                  AND ar2.is_submitted = true 
                  AND ar2.student_id != response_record.student_id
                  AND s2.group_name = target_group_number || '조'
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
        END IF;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;
