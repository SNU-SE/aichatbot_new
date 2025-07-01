
-- 클래스별로 분리된 특정 배정을 위한 함수 수정 (균등 배정)
CREATE OR REPLACE FUNCTION assign_peer_evaluations_specific(
    activity_id_param UUID,
    evaluations_per_student INTEGER DEFAULT 2,
    group_offset INTEGER DEFAULT 1
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
    
    -- 기존 배정 삭제 (재배정 시)
    DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    
    -- 클래스별로 처리
    FOR class_record IN 
        SELECT DISTINCT s.class_name
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.student_id
        WHERE ar.activity_id = activity_id_param AND ar.is_submitted = true
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
        
        -- 그룹 번호가 없으면 같은 클래스 내에서 랜덤 배정으로 fallback
        IF max_group_number IS NULL THEN
            -- 클래스 내 랜덤 배정 (기존 로직과 동일)
            FOR response_record IN 
                SELECT ar.id, ar.student_id, s.group_name, s.class_name
                FROM argumentation_responses ar
                JOIN students s ON ar.student_id = s.student_id
                WHERE ar.activity_id = activity_id_param 
                  AND ar.is_submitted = true
                  AND s.class_name = class_record.class_name
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
                      AND (
                        SELECT COUNT(*) 
                        FROM peer_evaluations pe 
                        WHERE pe.evaluator_id = ar2.student_id 
                          AND pe.activity_id = activity_id_param
                      ) < evaluations_per_student
                    ORDER BY 
                      (SELECT COUNT(*) FROM peer_evaluations pe WHERE pe.evaluator_id = ar2.student_id AND pe.activity_id = activity_id_param),
                      RANDOM()
                    LIMIT 1
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
                END LOOP;
            END LOOP;
        ELSE
            -- 그룹별 특정 배정 (균등 배정)
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
                -- 대상 그룹 계산
                target_group_number := group_record.group_num + group_offset;
                IF target_group_number > max_group_number THEN
                    target_group_number := target_group_number - max_group_number;
                END IF;
                
                -- 현재 그룹의 모든 응답들을 수집
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
                    -- 대상 그룹의 각 학생이 균등하게 평가하도록 배정
                    FOR evaluator_record IN 
                        SELECT ar2.student_id 
                        FROM argumentation_responses ar2
                        JOIN students s2 ON ar2.student_id = s2.student_id
                        WHERE ar2.activity_id = activity_id_param 
                          AND ar2.is_submitted = true 
                          AND s2.class_name = class_record.class_name
                          AND s2.group_name = target_group_number || '조'
                          -- 아직 충분한 평가를 배정받지 않은 학생만 선택
                          AND (
                            SELECT COUNT(*) 
                            FROM peer_evaluations pe 
                            WHERE pe.evaluator_id = ar2.student_id 
                              AND pe.activity_id = activity_id_param
                          ) < evaluations_per_student
                        ORDER BY 
                          -- 현재 배정받은 개수가 적은 순으로 우선 선택
                          (SELECT COUNT(*) FROM peer_evaluations pe WHERE pe.evaluator_id = ar2.student_id AND pe.activity_id = activity_id_param),
                          RANDOM()
                        LIMIT 1
                    LOOP
                        -- 평가자의 현재 배정 개수 확인
                        SELECT COUNT(*) INTO current_evaluator_count
                        FROM peer_evaluations pe 
                        WHERE pe.evaluator_id = evaluator_record.student_id 
                          AND pe.activity_id = activity_id_param;
                        
                        -- 평가자가 아직 더 배정받을 수 있는 경우에만 배정
                        IF current_evaluator_count < evaluations_per_student THEN
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
                        END IF;
                    END LOOP;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;
