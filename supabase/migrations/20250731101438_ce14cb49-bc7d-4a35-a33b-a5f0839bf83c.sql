-- 중복 제출 방지를 위한 유니크 제약조건 추가
ALTER TABLE public.peer_evaluations 
ADD CONSTRAINT unique_peer_evaluation 
UNIQUE (activity_id, evaluator_id, target_response_id);

-- 실시간 업데이트를 위한 설정
ALTER TABLE public.peer_evaluations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_evaluations;