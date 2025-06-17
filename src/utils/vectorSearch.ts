
// 벡터 검색을 위한 유틸리티 함수들

export interface VectorSearchResult {
  chunk_text: string;
  similarity: number;
  chunk_index: number;
}

export interface SearchParams {
  queryEmbedding: number[];
  activityId: string;
  similarityThreshold?: number;
  matchCount?: number;
}

// 코사인 유사도 계산 함수
export const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('벡터 길이가 일치하지 않습니다.');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// 벡터를 문자열로 변환 (PostgreSQL vector 타입용)
export const vectorToString = (vector: number[]): string => {
  return `[${vector.join(',')}]`;
};

// 문자열을 벡터로 변환
export const stringToVector = (vectorString: string): number[] => {
  return JSON.parse(vectorString);
};

// 임베딩 검증 함수
export const validateEmbedding = (embedding: number[]): boolean => {
  if (!Array.isArray(embedding)) return false;
  if (embedding.length !== 1536) return false; // text-embedding-3-small 차원
  return embedding.every(num => typeof num === 'number' && !isNaN(num));
};
