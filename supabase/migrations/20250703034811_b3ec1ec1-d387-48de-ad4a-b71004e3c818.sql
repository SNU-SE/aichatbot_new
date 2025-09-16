
-- 클래스별 동료평가 배정 함수 생성
CREATE OR REPLACE FUNCTION assign_peer_evaluations_by_class(
    activity_id_param UUID,
    evaluations_per_student INTEGER DEFAULT 2,
    target_class TEXT DEFAULT NULL
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
    -- 제출된 응답 수 확인 (클래스 필터링 적용)
    IF target_class IS NULL THEN
        SELECT COUNT(*) INTO total_submitted
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true;
    ELSE
        SELECT COUNT(*) INTO total_submitted
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true AND s.class_name = target_class;
    END IF;
    
    -- 최소 인원 확인
    IF total_submitted < (evaluations_per_student + 1) THEN
        RAISE EXCEPTION '동료평가를 진행하려면 최소 %명의 학생이 논증을 제출해야 합니다.', (evaluations_per_student + 1);
    END IF;
    
    target_evaluations_per_evaluator := evaluations_per_student;
    
    -- 기존 배정 삭제 (클래스별 또는 전체)
    IF target_class IS NULL THEN
        DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    ELSE
        DELETE FROM peer_evaluations 
        WHERE activity_id = activity_id_param
        AND evaluator_id IN (
            SELECT student_id FROM students WHERE class_name = target_class
        );
    END IF;
    
    -- 제출된 응답들에 대해 클래스별 배정
    FOR response_record IN 
        SELECT ar.id, ar.student_id, s.group_name, s.class_name
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true
        AND (target_class IS NULL OR s.class_name = target_class)
        ORDER BY RANDOM()
    LOOP
        FOR evaluator_record IN 
            SELECT ar2.student_id 
            FROM argumentation_responses ar2
            JOIN students s2 ON ar2.student_id = s2.student_id
            WHERE ar2.activity_id = activity_id_param 
              AND ar2.is_submitted = true 
              AND ar2.student_id != response_record.student_id
              AND s2.class_name = response_record.class_name
              AND (response_record.group_name IS NULL OR s2.group_name IS NULL OR s2.group_name != response_record.group_name)
              AND (
                SELECT COUNT(*) 
                FROM peer_evaluations pe 
                WHERE pe.evaluator_id = ar2.student_id 
                  AND pe.activity_id = activity_id_param
              ) < target_evaluations_per_evaluator
            ORDER BY 
              (SELECT COUNT(*) FROM peer_evaluations pe WHERE pe.evaluator_id = ar2.student_id AND pe.activity_id = activity_id_param),
              RANDOM()
            LIMIT evaluations_per_student
        LOOP
            SELECT COUNT(*) INTO current_evaluator_count
            FROM peer_evaluations pe 
            WHERE pe.evaluator_id = evaluator_record.student_id 
              AND pe.activity_id = activity_id_param;
            
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

-- 클래스별 특정 동료평가 배정 함수 생성
CREATE OR REPLACE FUNCTION assign_peer_evaluations_specific_by_class(
    activity_id_param UUID,
    evaluations_per_student INTEGER DEFAULT 2,
    group_offset INTEGER DEFAULT 1,
    target_class TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    class_record RECORD;
    group_record RECORD;
    response_record RECORD;
    evaluator_record RECORD;
    assigned_count INTEGER := 0;
    total_submitted INTEGER;
    max_group_number INTEGER;
    target_group_number INTEGER;
    evaluator_assignments INTEGER;
BEGIN
    -- 제출된 응답 수 확인 (클래스 필터링 적용)
    IF target_class IS NULL THEN
        SELECT COUNT(*) INTO total_submitted
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true;
    ELSE
        SELECT COUNT(*) INTO total_submitted
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true AND s.class_name = target_class;
    END IF;
    
    -- 최소 인원 확인
    IF total_submitted < (evaluations_per_student + 1) THEN
        RAISE EXCEPTION '동료평가를 진행하려면 최소 %명의 학생이 논증을 제출해야 합니다.', (evaluations_per_student + 1);
    END IF;
    
    -- 기존 배정 삭제
    IF target_class IS NULL THEN
        DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    ELSE
        DELETE FROM peer_evaluations 
        WHERE activity_id = activity_id_param
        AND evaluator_id IN (
            SELECT student_id FROM students WHERE class_name = target_class
        );
    END IF;
    
    -- 클래스별로 처리
    FOR class_record IN 
        SELECT DISTINCT s.class_name
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true
        AND (target_class IS NULL OR s.class_name = target_class)
    LOOP
        -- 현재 클래스의 최대 그룹 번호 확인
        SELECT MAX(CAST(REPLACE(s.group_name, '조', '') AS INTEGER)) INTO max_group_number
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param 
          AND ar.is_submitted = true 
          AND s.class_name = class_record.class_name
          AND s.group_name IS NOT NULL
          AND s.group_name ~ '^\d+조$';
        
        -- 그룹 번호가 없으면 같은 클래스 내에서 랜덤 배정
        IF max_group_number IS NULL THEN
            FOR response_record IN 
                SELECT ar.id, ar.student_id, s.group_name, s.class_name
                FROM argumentation_responses ar
                JOIN students s ON ar.student_id = s.student_id
                WHERE ar.activity_id = activity_id_param 
                  AND ar.is_submitted = true
                  AND s.class_name = class_record.class_name
                ORDER BY RANDOM()
            LOOP
                evaluator_assignments := 0;
                FOR evaluator_record IN 
                    SELECT ar2.student_id 
                    FROM argumentation_responses ar2
                    JOIN students s2 ON ar2.student_id = s2.student_id
                    WHERE ar2.activity_id = activity_id_param 
                      AND ar2.is_submitted = true 
                      AND ar2.student_id != response_record.student_id
                      AND s2.class_name = response_record.class_name
                      AND (
                        SELECT COUNT(*) 
                        FROM peer_evaluations pe 
                        WHERE pe.evaluator_id = ar2.student_id 
                          AND pe.activity_id = activity_id_param
                      ) < evaluations_per_student
                    ORDER BY 
                      (SELECT COUNT(*) FROM peer_evaluations pe WHERE pe.evaluator_id = ar2.student_id AND pe.activity_id = activity_id_param),
                      RANDOM()
                LOOP
                    INSERT INTO peer_evaluations (
                        activity_id, 
                        evaluator_id, 
                        target_response_id,
                        created_at
                    ) VALUES (
                        activity_id_param,
                        evaluator_record.student_id,
                        response_record.id,
                        NOW()
                    );
                    assigned_count := assigned_count + 1;
                    evaluator_assignments := evaluator_assignments + 1;
                    
                    IF evaluator_assignments >= evaluations_per_student THEN
                        EXIT;
                    END IF;
                END LOOP;
            END LOOP;
        ELSE
            -- 그룹별 특정 배정
            FOR group_record IN 
                SELECT DISTINCT CAST(REPLACE(s.group_name, '조', '') AS INTEGER) as group_num
                FROM argumentation_responses ar
                JOIN students s ON ar.student_id = s.student_id
                WHERE ar.activity_id = activity_id_param 
                  AND ar.is_submitted = true 
                  AND s.class_name = class_record.class_name
                  AND s.group_name ~ '^\d+조$'
                ORDER BY group_num
            LOOP
                target_group_number := group_record.group_num + group_offset;
                IF target_group_number > max_group_number THEN
                    target_group_number := target_group_number - max_group_number;
                END IF;
                
                FOR evaluator_record IN 
                    SELECT ar2.student_id 
                    FROM argumentation_responses ar2
                    JOIN students s2 ON ar2.student_id = s2.student_id
                    WHERE ar2.activity_id = activity_id_param 
                      AND ar2.is_submitted = true 
                      AND s2.class_name = class_record.class_name
                      AND s2.group_name = target_group_number || '조'
                      AND (
                        SELECT COUNT(*) 
                        FROM peer_evaluations pe 
                        WHERE pe.evaluator_id = ar2.student_id 
                          AND pe.activity_id = activity_id_param
                      ) < evaluations_per_student
                    ORDER BY 
                      (SELECT COUNT(*) FROM peer_evaluations pe WHERE pe.evaluator_id = ar2.student_id AND pe.activity_id = activity_id_param),
                      RANDOM()
                LOOP
                    evaluator_assignments := 0;
                    FOR response_record IN 
                        SELECT ar.id, ar.student_id
                        FROM argumentation_responses ar
                        JOIN students s ON ar.student_id = s.student_id
                        WHERE ar.activity_id = activity_id_param 
                          AND ar.is_submitted = true 
                          AND s.class_name = class_record.class_name
                          AND s.group_name = group_record.group_num || '조'
                        ORDER BY RANDOM()
                    LOOP
                        IF (SELECT COUNT(*) FROM peer_evaluations pe WHERE pe.evaluator_id = evaluator_record.student_id AND pe.activity_id = activity_id_param) < evaluations_per_student 
                           AND evaluator_assignments < evaluations_per_student THEN
                            INSERT INTO peer_evaluations (
                                activity_id, 
                                evaluator_id, 
                                target_response_id,
                                created_at
                            ) VALUES (
                                activity_id_param,
                                evaluator_record.student_id,
                                response_record.id,
                                NOW()
                            );
                            assigned_count := assigned_count + 1;
                            evaluator_assignments := evaluator_assignments + 1;
                        END IF;
                        
                        IF evaluator_assignments >= evaluations_per_student THEN
                            EXIT;
                        END IF;
                    END LOOP;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;
