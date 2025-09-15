# Netlify 배포 가이드 - Enhanced RAG Education Platform

이 가이드는 Enhanced RAG Education Platform을 Netlify에 배포하는 방법을 단계별로 설명합니다.

## 목차

1. [사전 준비사항](#사전-준비사항)
2. [Netlify 계정 설정](#netlify-계정-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [수동 배포](#수동-배포)
5. [자동 배포 (GitHub Actions)](#자동-배포-github-actions)
6. [배포 확인 및 모니터링](#배포-확인-및-모니터링)
7. [문제 해결](#문제-해결)

## 사전 준비사항

### 필수 도구 설치
```bash
# Node.js 18 이상 설치 확인
node --version  # v18.0.0 이상이어야 함

# npm 패키지 설치
npm install

# Netlify CLI 설치 (전역)
npm install -g netlify-cli

# Supabase CLI 설치 (전역)
npm install -g supabase
```

### 필수 계정 및 서비스
- ✅ GitHub 계정 (코드 저장소)
- ✅ Netlify 계정 (호스팅)
- ✅ Supabase 계정 (데이터베이스 및 Edge Functions)
- ✅ OpenAI 계정 (AI 임베딩 및 채팅)
- ✅ Claude 계정 (선택사항, 대체 AI 제공자)

## Netlify 계정 설정

### 1. Netlify 계정 생성 및 로그인
```bash
# Netlify CLI로 로그인
netlify login
```

브라우저가 열리면 Netlify 계정으로 로그인하고 CLI 접근을 승인합니다.

### 2. 새 사이트 생성

#### 방법 A: CLI를 통한 사이트 생성
```bash
# 프로젝트 루트에서 실행
netlify init

# 또는 기존 Git 저장소와 연결
netlify link
```

#### 방법 B: Netlify 웹 대시보드에서 생성
1. [Netlify 대시보드](https://app.netlify.com)에 로그인
2. "New site from Git" 클릭
3. GitHub 저장소 선택
4. 빌드 설정:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

### 3. 사이트 정보 확인
```bash
# 사이트 정보 확인
netlify status

# 사이트 ID 및 URL 확인
netlify sites:list
```

## 환경 변수 설정

### 1. 로컬 환경 변수 설정

`.env.local` 파일 생성:
```bash
cp .env.example .env.local
```

`.env.local` 파일 편집:
```env
# Supabase 설정
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI 설정
VITE_OPENAI_API_KEY=your_openai_api_key

# Claude 설정 (선택사항)
VITE_CLAUDE_API_KEY=your_claude_api_key

# 애플리케이션 설정
VITE_APP_NAME="Enhanced RAG Education Platform"
VITE_APP_VERSION="1.0.0"
VITE_MAX_FILE_SIZE=52428800
VITE_ALLOWED_FILE_TYPES="application/pdf"

# 벡터 검색 설정
VITE_DEFAULT_SIMILARITY_THRESHOLD=0.7
VITE_MAX_SEARCH_RESULTS=10
VITE_EMBEDDING_DIMENSION=1536

# 채팅 설정
VITE_MAX_CHAT_HISTORY=50
VITE_CHAT_TIMEOUT=30000

# 개발 설정
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL="info"
```

### 2. Netlify 환경 변수 설정

#### CLI를 통한 설정:
```bash
# 환경 변수 설정
netlify env:set VITE_SUPABASE_URL "https://your-project-id.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your_supabase_anon_key"
netlify env:set VITE_OPENAI_API_KEY "your_openai_api_key"
netlify env:set VITE_CLAUDE_API_KEY "your_claude_api_key"
netlify env:set VITE_APP_NAME "Enhanced RAG Education Platform"
netlify env:set VITE_APP_VERSION "1.0.0"
netlify env:set VITE_MAX_FILE_SIZE "52428800"
netlify env:set VITE_ALLOWED_FILE_TYPES "application/pdf"
netlify env:set VITE_DEFAULT_SIMILARITY_THRESHOLD "0.7"
netlify env:set VITE_MAX_SEARCH_RESULTS "10"
netlify env:set VITE_EMBEDDING_DIMENSION "1536"
netlify env:set VITE_MAX_CHAT_HISTORY "50"
netlify env:set VITE_CHAT_TIMEOUT "30000"
netlify env:set VITE_DEBUG_MODE "false"
netlify env:set VITE_LOG_LEVEL "info"

# 환경 변수 확인
netlify env:list
```

#### 웹 대시보드를 통한 설정:
1. Netlify 대시보드에서 사이트 선택
2. "Site settings" → "Environment variables" 이동
3. "Add a variable" 클릭하여 각 환경 변수 추가

### 3. GitHub Secrets 설정 (자동 배포용)

GitHub 저장소에서 Settings → Secrets and variables → Actions로 이동하여 다음 시크릿 추가:

```
# Netlify 관련
NETLIFY_SITE_ID=your_netlify_site_id
NETLIFY_AUTH_TOKEN=your_netlify_personal_access_token
NETLIFY_SITE_NAME=your_site_name

# Supabase 관련
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_PROJECT_REF=your_supabase_project_ref
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_DB_PASSWORD=your_supabase_db_password

# AI 제공자 관련
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_CLAUDE_API_KEY=your_claude_api_key
```

#### Netlify Personal Access Token 생성:
1. Netlify 대시보드 → User settings → Personal access tokens
2. "New access token" 클릭
3. 토큰 이름 입력 후 생성
4. 생성된 토큰을 GitHub Secrets에 `NETLIFY_AUTH_TOKEN`으로 저장

## 수동 배포

### 1. 로컬 빌드 및 테스트
```bash
# 의존성 설치
npm install

# 타입 체크
npm run type-check

# 린트 검사
npm run lint

# 테스트 실행
npm run test:run

# 프로덕션 빌드
npm run build

# 로컬에서 빌드 결과 미리보기
npm run preview
```

### 2. Netlify에 배포

#### 프리뷰 배포 (테스트용):
```bash
# 프리뷰 배포
npm run deploy:preview

# 또는 직접 명령어
netlify deploy --dir=dist
```

배포 완료 후 제공되는 프리뷰 URL에서 사이트를 확인합니다.

#### 프로덕션 배포:
```bash
# 프로덕션 배포
npm run deploy:production

# 또는 직접 명령어
netlify deploy --prod --dir=dist
```

### 3. 배포 상태 확인
```bash
# 배포 상태 확인
netlify status

# 최근 배포 목록 확인
netlify deploy:list

# 사이트 열기
netlify open
```

## 자동 배포 (GitHub Actions)

프로젝트에는 이미 GitHub Actions 워크플로우가 설정되어 있습니다.

### 1. 자동 배포 트리거

#### 프로덕션 배포:
- `main` 브랜치에 푸시할 때 자동 실행
- 수동으로 실행: GitHub Actions 탭에서 "Netlify Deployment & Monitoring" 워크플로우 실행

#### 프리뷰 배포:
- `develop` 브랜치에 푸시할 때 자동 실행
- Pull Request 생성 시 자동 실행

### 2. 워크플로우 단계

1. **사전 배포 검사**: 환경 및 브랜치 확인
2. **빌드 및 테스트**: 
   - 타입 체크
   - 린트 검사
   - 포맷 체크
   - 종합 테스트 실행
   - 프로덕션 빌드
3. **Netlify 배포**: 환경별 배포 실행
4. **배포 후 검증**:
   - 헬스 체크
   - Lighthouse 성능 감사
5. **Supabase Edge Functions 배포** (프로덕션만)
6. **모니터링 설정**

### 3. 배포 모니터링

GitHub Actions 탭에서 워크플로우 실행 상태를 확인할 수 있습니다:
- ✅ 성공: 배포 완료
- ❌ 실패: 로그 확인 후 문제 해결
- 🟡 진행 중: 배포 진행 중

## 배포 확인 및 모니터링

### 1. 배포 확인

#### 기본 접근성 확인:
```bash
# 헬스 체크
curl -f https://your-site.netlify.app/api/health

# 또는 로컬에서
npm run health-check
```

#### 웹 브라우저에서 확인:
1. 사이트 URL 접속
2. 주요 기능 테스트:
   - 문서 업로드
   - 검색 기능
   - AI 채팅
   - 사용자 인증

### 2. 모니터링 대시보드

배포된 사이트에서 `/monitoring` 경로로 접속하여 실시간 모니터링 확인:
- 시스템 헬스 상태
- 성능 메트릭
- 서비스 연결 상태
- 배포 정보

### 3. 성능 확인

#### Lighthouse 점수 확인:
- 성능: > 80점
- 접근성: > 90점
- 모범 사례: > 90점
- SEO: > 80점

#### 응답 시간 확인:
- 페이지 로드: < 3초
- API 응답: < 2초
- 검색 응답: < 5초

## 문제 해결

### 일반적인 문제들

#### 1. 빌드 실패
```bash
# 로그 확인
netlify logs

# 로컬에서 빌드 테스트
npm run build

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

**해결 방법:**
- Node.js 버전 확인 (18 이상)
- 환경 변수 설정 확인
- 타입스크립트 오류 수정

#### 2. 환경 변수 문제
```bash
# Netlify 환경 변수 확인
netlify env:list

# 환경 변수 재설정
netlify env:set VARIABLE_NAME "value"
```

**해결 방법:**
- 모든 필수 환경 변수 설정 확인
- 환경 변수 값의 따옴표 처리 확인
- Supabase URL 및 키 유효성 확인

#### 3. 라우팅 문제 (404 오류)
`netlify.toml`에 SPA 리다이렉트 설정이 있는지 확인:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 4. API 연결 문제
```bash
# Supabase 연결 테스트
curl -H "apikey: your_anon_key" \
     -H "Authorization: Bearer your_anon_key" \
     https://your-project.supabase.co/rest/v1/
```

**해결 방법:**
- Supabase 프로젝트 상태 확인
- API 키 유효성 확인
- CORS 설정 확인

#### 5. Edge Functions 문제
```bash
# Supabase Edge Functions 배포
supabase functions deploy --project-ref your-project-ref

# 함수 로그 확인
supabase functions logs enhanced-document-processor
```

### 디버깅 도구

#### 로그 확인:
```bash
# Netlify 배포 로그
netlify logs

# Netlify 함수 로그
netlify functions:logs

# Supabase 로그
supabase logs --project-ref your-project-ref
```

#### 로컬 개발 서버:
```bash
# 로컬 개발 서버 실행
npm run dev

# Netlify Dev 실행 (Edge Functions 포함)
netlify dev
```

### 성능 최적화

#### 빌드 최적화:
```bash
# 번들 분석
npm run build
npx vite-bundle-analyzer dist

# 의존성 분석
npm audit
npm outdated
```

#### 캐싱 최적화:
- 정적 자산 캐싱 (1년)
- API 응답 캐싱 설정
- Service Worker 활용

## 배포 체크리스트

### 배포 전 확인사항
- [ ] 모든 환경 변수 설정 완료
- [ ] 로컬 빌드 성공 확인
- [ ] 테스트 통과 확인
- [ ] Supabase 데이터베이스 설정 완료
- [ ] Edge Functions 배포 완료
- [ ] API 키 유효성 확인

### 배포 후 확인사항
- [ ] 사이트 접근 가능 확인
- [ ] 헬스 체크 통과 확인
- [ ] 주요 기능 동작 확인
- [ ] 성능 점수 확인
- [ ] 모니터링 대시보드 확인
- [ ] 오류 로그 확인

## 유지보수

### 정기 작업
```bash
# 시스템 백업
npm run backup

# 종합 모니터링
npm run monitor

# 의존성 업데이트
npm update
npm audit fix
```

### 모니터링 설정
- 헬스 체크 자동화 (1분마다)
- 성능 모니터링 (30초마다)
- 오류 알림 설정
- 백업 스케줄 설정

## 추가 리소스

### 공식 문서
- [Netlify 문서](https://docs.netlify.com/)
- [Supabase 문서](https://supabase.com/docs)
- [Vite 문서](https://vitejs.dev/)

### 유용한 명령어
```bash
# 전체 상태 확인
netlify status && npm run health-check

# 빠른 배포
npm run build && npm run deploy:preview

# 프로덕션 배포
npm run build && npm run deploy:production

# 로그 모니터링
netlify logs --live
```

---

이 가이드를 따라 하시면 Enhanced RAG Education Platform을 성공적으로 Netlify에 배포할 수 있습니다. 문제가 발생하면 문제 해결 섹션을 참고하거나 로그를 확인하여 디버깅하세요.