# Netlify 환경 변수 설정 가이드 (빠른 설정용)

이 문서는 Netlify 대시보드에서 반드시 설정해야 하는 환경 변수와 권장 값을 간결하게 정리합니다. 상세 배포 가이드는 `NETLIFY_DEPLOY.md`를 참고하세요.

## 필수 (Required)
- VITE_SUPABASE_URL
  - 예: https://YOUR_PROJECT.supabase.co
- VITE_SUPABASE_ANON_KEY
  - 예: supabase 대시보드 > Project Settings > API > anon key

## 선택 (Optional)
- VITE_OPENAI_API_KEY
  - OpenAI API 호출/헬스체크에 사용. 미설정 시 기능 제한 없이 헬스 상태가 "degraded"로 표기될 수 있습니다.
- VITE_CLAUDE_API_KEY
  - Anthropic(Claude) 사용 시에만 필요.
- VITE_APP_NAME
  - 예: Enhanced RAG Education Platform
- VITE_APP_VERSION
  - 예: 1.0.0
- VITE_MAX_FILE_SIZE
  - 예: 52428800 (50MB)
- VITE_ALLOWED_FILE_TYPES
  - 예: application/pdf
- VITE_DEFAULT_SIMILARITY_THRESHOLD
  - 예: 0.7
- VITE_MAX_SEARCH_RESULTS
  - 예: 10
- VITE_EMBEDDING_DIMENSION
  - 예: 1536
- VITE_MAX_CHAT_HISTORY
  - 예: 50
- VITE_CHAT_TIMEOUT
  - 예: 30000
- VITE_DEBUG_MODE
  - 예: false
- VITE_LOG_LEVEL
  - 예: info

## Netlify 대시보드에서 설정 방법
1. Site settings → Environment variables → Add a variable
2. 위 필수 항목부터 추가 (Key / Value 입력)
3. 저장 후 재배포 (Deploy site)

## 빌드/런타임 유의사항
- CSP(보안 헤더): `netlify.toml`의 `connect-src`에 `https://*.supabase.co`와 `wss://*.supabase.co`가 포함되어 있어 Supabase Realtime 연결이 허용됩니다.
- Edge Functions: 프론트는 Supabase Edge Functions를 `VITE_SUPABASE_URL + /functions/v1`로 호출합니다.
- 환경 검증: 빌드 전 `npm run validate:env`가 실행됩니다. Netlify에서는 `.env.local` 없이도 대시보드에 설정된 환경 변수를 자동으로 감지합니다.

## 빠른 점검 체크리스트
- [ ] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 입력 완료
- [ ] (선택) VITE_OPENAI_API_KEY 입력
- [ ] 배포 후 `/api/health` 응답 200 확인
- [ ] 업로드/검색/채팅 기능 확인

---

자세한 절차와 문제 해결은 `NETLIFY_DEPLOY.md`를 참고하세요.
