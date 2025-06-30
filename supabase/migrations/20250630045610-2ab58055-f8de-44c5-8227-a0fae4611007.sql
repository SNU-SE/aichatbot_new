
-- 활동과 관련된 모든 데이터를 삭제하는 함수 생성
CREATE OR REPLACE FUNCTION delete_activity_with_related_data(activity_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb := '{}';
    chat_logs_count int := 0;
    checklist_progress_count int := 0;
    checklist_history_count int := 0;
    document_chunks_count int := 0;
    argumentation_responses_count int := 0;
    peer_evaluations_count int := 0;
    evaluation_reflections_count int := 0;
    question_frequency_count int := 0;
    checklist_items_count int := 0;
    activity_modules_count int := 0;
BEGIN
    -- 각 테이블의 데이터 개수 확인
    SELECT COUNT(*) INTO chat_logs_count FROM chat_logs WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_progress_count FROM student_checklist_progress scp 
        JOIN checklist_items ci ON scp.checklist_item_id = ci.id 
        WHERE ci.activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_history_count FROM checklist_completion_history WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO document_chunks_count FROM document_chunks WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO argumentation_responses_count FROM argumentation_responses WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO peer_evaluations_count FROM peer_evaluations WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO evaluation_reflections_count FROM evaluation_reflections WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO question_frequency_count FROM question_frequency WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_items_count FROM checklist_items WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO activity_modules_count FROM activity_modules WHERE activity_id = activity_id_param;

    -- 결과 JSON 생성
    result := jsonb_build_object(
        'chat_logs', chat_logs_count,
        'checklist_progress', checklist_progress_count,
        'checklist_history', checklist_history_count,
        'document_chunks', document_chunks_count,
        'argumentation_responses', argumentation_responses_count,
        'peer_evaluations', peer_evaluations_count,
        'evaluation_reflections', evaluation_reflections_count,
        'question_frequency', question_frequency_count,
        'checklist_items', checklist_items_count,
        'activity_modules', activity_modules_count
    );

    -- 관련 데이터 삭제 (순서 중요)
    DELETE FROM student_checklist_progress WHERE checklist_item_id IN (
        SELECT id FROM checklist_items WHERE activity_id = activity_id_param
    );
    DELETE FROM checklist_completion_history WHERE activity_id = activity_id_param;
    DELETE FROM chat_logs WHERE activity_id = activity_id_param;
    DELETE FROM document_chunks WHERE activity_id = activity_id_param;
    DELETE FROM peer_evaluations WHERE activity_id = activity_id_param;
    DELETE FROM argumentation_responses WHERE activity_id = activity_id_param;
    DELETE FROM evaluation_reflections WHERE activity_id = activity_id_param;
    DELETE FROM question_frequency WHERE activity_id = activity_id_param;
    DELETE FROM checklist_items WHERE activity_id = activity_id_param;
    DELETE FROM activity_modules WHERE activity_id = activity_id_param;
    DELETE FROM activities WHERE id = activity_id_param;

    RETURN result;
END;
$$;

-- 활동과 관련된 데이터 개수만 확인하는 함수 (삭제 전 확인용)
CREATE OR REPLACE FUNCTION get_activity_related_data_count(activity_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb := '{}';
    chat_logs_count int := 0;
    checklist_progress_count int := 0;
    checklist_history_count int := 0;
    document_chunks_count int := 0;
    argumentation_responses_count int := 0;
    peer_evaluations_count int := 0;
    evaluation_reflections_count int := 0;
    question_frequency_count int := 0;
    checklist_items_count int := 0;
    activity_modules_count int := 0;
BEGIN
    -- 각 테이블의 데이터 개수 확인
    SELECT COUNT(*) INTO chat_logs_count FROM chat_logs WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_progress_count FROM student_checklist_progress scp 
        JOIN checklist_items ci ON scp.checklist_item_id = ci.id 
        WHERE ci.activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_history_count FROM checklist_completion_history WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO document_chunks_count FROM document_chunks WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO argumentation_responses_count FROM argumentation_responses WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO peer_evaluations_count FROM peer_evaluations WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO evaluation_reflections_count FROM evaluation_reflections WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO question_frequency_count FROM question_frequency WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_items_count FROM checklist_items WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO activity_modules_count FROM activity_modules WHERE activity_id = activity_id_param;

    -- 결과 JSON 생성
    result := jsonb_build_object(
        'chat_logs', chat_logs_count,
        'checklist_progress', checklist_progress_count,
        'checklist_history', checklist_history_count,
        'document_chunks', document_chunks_count,
        'argumentation_responses', argumentation_responses_count,
        'peer_evaluations', peer_evaluations_count,
        'evaluation_reflections', evaluation_reflections_count,
        'question_frequency', question_frequency_count,
        'checklist_items', checklist_items_count,
        'activity_modules', activity_modules_count
    );

    RETURN result;
END;
$$;
