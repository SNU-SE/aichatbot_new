-- 세션 정리 함수를 2시간 기준으로 수정
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE student_sessions 
    SET is_online = false 
    WHERE last_active < NOW() - INTERVAL '2 hours' 
    AND is_online = true;
END;
$function$;

-- 세션 정리 및 localStorage 정리를 위한 새로운 함수 추가
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions_with_logging()
 RETURNS TABLE(cleaned_count INTEGER, session_ids TEXT[])
 LANGUAGE plpgsql
AS $function$
DECLARE
    cleaned_sessions TEXT[];
    session_count INTEGER;
BEGIN
    -- 만료된 세션의 student_id들을 수집
    SELECT ARRAY_AGG(student_id) INTO cleaned_sessions
    FROM student_sessions 
    WHERE last_active < NOW() - INTERVAL '2 hours' 
    AND is_online = true;
    
    -- 세션 상태 업데이트
    UPDATE student_sessions 
    SET is_online = false 
    WHERE last_active < NOW() - INTERVAL '2 hours' 
    AND is_online = true;
    
    GET DIAGNOSTICS session_count = ROW_COUNT;
    
    RETURN QUERY SELECT session_count, COALESCE(cleaned_sessions, ARRAY[]::TEXT[]);
END;
$function$;