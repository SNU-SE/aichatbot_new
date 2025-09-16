
-- 벡터 확장 활성화 (먼저 실행)
CREATE EXTENSION IF NOT EXISTS vector;

-- document_chunks 테이블에 임베딩 컬럼 추가
ALTER TABLE public.document_chunks 
ADD COLUMN embedding vector(1536);

-- 임베딩 기반 유사도 검색을 위한 인덱스 추가
CREATE INDEX ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
