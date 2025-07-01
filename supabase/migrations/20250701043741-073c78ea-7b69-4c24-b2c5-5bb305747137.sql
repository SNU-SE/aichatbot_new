
-- 클래스별 동료평가 통계를 가져오는 함수 생성
CREATE OR REPLACE FUNCTION get_peer_evaluation_stats_by_class(activity_id_param UUID)
RETURNS TABLE(
    class_name TEXT,
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
        s.class_name::TEXT,
        COUNT(ar.id)::INTEGER as total_responses,
        COUNT(CASE WHEN ar.is_submitted = true THEN 1 END)::INTEGER as submitted_responses,
        COALESCE(pe_stats.total_evaluations, 0)::INTEGER as total_evaluations,
        COALESCE(pe_stats.completed_evaluations, 0)::INTEGER as completed_evaluations,
        CASE 
            WHEN COALESCE(pe_stats.total_evaluations, 0) = 0 THEN 0
            ELSE ROUND(
                COALESCE(pe_stats.completed_evaluations, 0)::NUMERIC * 100.0 /
                COALESCE(pe_stats.total_evaluations, 1), 1
            )
        END as completion_rate
    FROM argumentation_responses ar
    JOIN students s ON ar.student_id = s.student_id
    LEFT JOIN (
        SELECT 
            s2.class_name,
            COUNT(pe.id) as total_evaluations,
            COUNT(CASE WHEN pe.is_completed = true THEN 1 END) as completed_evaluations
        FROM peer_evaluations pe
        JOIN students s2 ON pe.evaluator_id = s2.student_id
        WHERE pe.activity_id = activity_id_param
        GROUP BY s2.class_name
    ) pe_stats ON s.class_name = pe_stats.class_name
    WHERE ar.activity_id = activity_id_param
    GROUP BY s.class_name, pe_stats.total_evaluations, pe_stats.completed_evaluations
    ORDER BY s.class_name;
END;
$$;
