
-- PDF 문서 저장을 위한 테이블
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 질문 빈도 추적을 위한 테이블
CREATE TABLE public.question_frequency (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR NOT NULL,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  question_hash VARCHAR NOT NULL,
  question_text TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  last_asked TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, activity_id, question_hash)
);

-- 인덱스 추가
CREATE INDEX idx_document_chunks_activity_id ON public.document_chunks(activity_id);
CREATE INDEX idx_question_frequency_student_activity ON public.question_frequency(student_id, activity_id);
CREATE INDEX idx_question_frequency_hash ON public.question_frequency(question_hash);

-- RLS 정책 설정
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_frequency ENABLE ROW LEVEL SECURITY;

-- document_chunks 정책
CREATE POLICY "Allow read access to document chunks" 
  ON public.document_chunks 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert to document chunks" 
  ON public.document_chunks 
  FOR INSERT 
  WITH CHECK (true);

-- question_frequency 정책
CREATE POLICY "Allow all operations on question frequency" 
  ON public.question_frequency 
  FOR ALL 
  USING (true);
