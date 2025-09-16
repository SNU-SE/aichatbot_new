
-- 벡터 유사도 검색을 위한 PostgreSQL 함수 생성
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding TEXT,
  activity_id_param UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  chunk_text TEXT,
  similarity FLOAT,
  chunk_index INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding::vector) AS similarity,
    dc.chunk_index
  FROM document_chunks dc
  WHERE 
    dc.activity_id = activity_id_param
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding::vector) >= similarity_threshold
  ORDER BY dc.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
