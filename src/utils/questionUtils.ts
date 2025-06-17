
// 질문 해시 생성 함수
export const generateQuestionHash = (question: string): string => {
  // 질문을 정규화 (소문자, 공백 제거, 특수문자 제거)
  const normalized = question
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // 간단한 해시 함수 (실제로는 더 강력한 해시 함수를 사용해야 함)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  
  return Math.abs(hash).toString(16);
};

// 질문 유사성 검사 함수
export const areQuestionsSimilar = (question1: string, question2: string): boolean => {
  const normalize = (q: string) => q
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const norm1 = normalize(question1);
  const norm2 = normalize(question2);
  
  // 정확히 같거나 75% 이상 유사하면 같은 질문으로 간주
  if (norm1 === norm2) return true;
  
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  if (longer.length === 0) return false;
  
  const similarity = (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
  return similarity >= 0.75;
};

// 레벤슈타인 거리 계산
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
