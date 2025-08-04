-- student_sessions 테이블에 student_id unique constraint 추가
ALTER TABLE student_sessions 
ADD CONSTRAINT student_sessions_student_id_unique UNIQUE (student_id);