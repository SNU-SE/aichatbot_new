# AI 교육 플랫폼 아키텍처 및 구조 문서

## 개요
AI 챗봇을 이용해 수업을 도울 수 있는 교육용 플랫폼으로, 학생들의 논증 활동, 토론, 실험 등을 지원하며 교사가 실시간으로 모니터링할 수 있는 시스템입니다.

## 기술 스택

### 프론트엔드
- **React 18.3.1** - 사용자 인터페이스
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **React Router DOM 6.26.2** - 라우팅
- **TanStack React Query 5.56.2** - 상태 관리 및 캐싱
- **shadcn/ui + Radix UI** - UI 컴포넌트
- **Lucide React** - 아이콘

### 백엔드 & 인프라
- **Supabase** - BaaS (Backend as a Service)
  - PostgreSQL 데이터베이스
  - 실시간 기능
  - 인증 시스템
  - 파일 스토리지
  - Edge Functions
  - Vector Embeddings (RAG 기능)

### AI 통합
- **OpenAI API** - GPT 모델
- **Anthropic Claude** - 대체 AI 모델
- **RAG (Retrieval-Augmented Generation)** - 문서 기반 답변

## 프로젝트 구조

```
src/
├── components/
│   ├── admin/           # 관리자 전용 컴포넌트
│   │   ├── enhanced/    # 고급 관리 기능
│   │   ├── activity/    # 활동 관리
│   │   └── ai/         # AI 설정 관리
│   ├── auth/           # 인증 관련 컴포넌트
│   ├── student/        # 학생 전용 컴포넌트
│   └── ui/            # 재사용 가능한 UI 컴포넌트
├── hooks/             # 커스텀 React 훅
├── pages/             # 페이지 컴포넌트
├── types/             # TypeScript 타입 정의
├── utils/             # 유틸리티 함수
├── integrations/      # 외부 서비스 통합
└── lib/              # 라이브러리 설정

supabase/
├── functions/         # Edge Functions
├── migrations/        # 데이터베이스 마이그레이션
└── config.toml       # Supabase 설정
```

## 데이터베이스 아키텍처

### 핵심 테이블

#### 1. 사용자 관리
- **user_roles**: 사용자 역할 관리 (admin/student)
- **students**: 학생 정보 및 프로필
- **student_sessions**: 학생 세션 및 온라인 상태

#### 2. 활동 관리
- **activities**: 교육 활동 정의
- **activity_modules**: 활동 모듈 구조
- **checklist_items**: 체크리스트 항목
- **student_checklist_progress**: 학생별 체크리스트 진행상황

#### 3. 논증 및 평가
- **argumentation_responses**: 학생 논증 응답
- **peer_evaluations**: 동료평가 배정 및 결과
- **evaluation_reflections**: 평가 후 성찰

#### 4. AI 채팅 시스템
- **chat_logs**: 채팅 기록
- **question_frequency**: 질문 빈도 추적
- **document_chunks**: RAG용 문서 청크
- **admin_settings**: 글로벌 AI 설정
- **class_prompt_settings**: 클래스별 AI 설정
- **prompt_templates**: 프롬프트 템플릿

#### 5. 기타
- **student_work_drafts**: 학생 작업 임시저장
- **checklist_completion_history**: 체크리스트 완료 이력
- **peer_evaluation_phases**: 동료평가 단계 관리

### RLS (Row Level Security) 정책
- **관리자**: 모든 데이터 접근 가능
- **학생**: 본인 데이터만 접근 가능
- **공개 데이터**: 활동, 체크리스트 등은 모든 사용자 접근 가능

## 애플리케이션 아키텍처

### 라우팅 구조
```
/ (루트)
├── /auth - 로그인/회원가입
├── /admin - 관리자 대시보드
│   ├── 학생 관리
│   ├── 활동 관리
│   ├── AI 설정
│   ├── 실시간 모니터링
│   ├── 클래스 관리
│   └── 학생 기록
└── /student - 학생 대시보드
    ├── 활동 선택
    ├── 논증 활동
    ├── 토론 활동
    ├── 실험 활동
    └── 채팅 인터페이스
```

### 인증 시스템
- **Supabase Auth** 기반
- **역할 기반 접근 제어** (RBAC)
- **세션 관리** 및 자동 토큰 갱신
- **보안된 라우트** 보호

### 상태 관리
- **React Query**: 서버 상태 관리
- **React Context**: 전역 상태 (인증)
- **Local State**: 컴포넌트 레벨 상태

## 주요 기능별 구현

### 1. AI 채팅 시스템

#### Edge Function: ai-chat
```typescript
// supabase/functions/ai-chat/index.ts
- OpenAI/Claude API 통합
- RAG 기능 (문서 검색 + AI 답변)
- 실시간 스트리밍 응답
- 메시지 로깅 및 분석
```

#### 클라이언트 구현
```typescript
// src/components/student/ChatInterface.tsx
- 실시간 메시지 전송/수신
- 파일 업로드 지원
- 메시지 캐싱
- 가상화된 메시지 리스트
```

### 2. 논증 활동 시스템

#### 논증 제출
```typescript
// src/components/student/ArgumentationActivity.tsx
- 중복 제출 방지
- 실시간 저장
- 제출 상태 관리
```

#### 동료평가 시스템
```sql
-- Database Functions
assign_peer_evaluations() - 기본 랜덤 배정
assign_peer_evaluations_by_class() - 클래스별 배정  
assign_peer_evaluations_specific() - 그룹 기반 배정
```

### 3. 실시간 모니터링

#### 세션 관리
```typescript
// 학생 온라인 상태 추적
update_student_session()
cleanup_inactive_sessions()
```

#### 실시간 업데이트
```typescript
// Supabase Realtime 채널
- 채팅 메시지 실시간 동기화
- 학생 상태 변경 감지
- 체크리스트 진행상황 업데이트
```

### 4. RAG (검색 증강 생성) 시스템

#### PDF 처리
```typescript
// supabase/functions/process-pdf/index.ts
- PDF 텍스트 추출
- 문서 청킹
- Vector Embedding 생성
```

#### 벡터 검색
```typescript
// supabase/functions/rag-search/index.ts
- 코사인 유사도 검색
- 키워드 기반 검색
- 하이브리드 검색 결과
```

### 5. 파일 관리 시스템

#### 파일 업로드
```typescript
// src/utils/fileUpload.ts
- Supabase Storage 통합
- 파일 타입 검증
- 크기 제한 관리
```

#### 지원 파일 형식
- **이미지**: JPG, PNG, GIF 등
- **문서**: PDF (RAG 처리)
- **기타**: 텍스트 파일 등

## Edge Functions 상세

### 1. ai-chat
- **목적**: AI 모델과의 실시간 채팅
- **기능**: 
  - 다중 AI 제공자 지원
  - RAG 통합
  - 스트리밍 응답
  - 메시지 로깅

### 2. process-pdf
- **목적**: PDF 문서 처리 및 임베딩
- **기능**:
  - 텍스트 추출
  - 청킹 처리
  - Vector 임베딩 생성

### 3. rag-search
- **목적**: 문서 검색 및 컨텍스트 제공
- **기능**:
  - 벡터 유사도 검색
  - 키워드 검색
  - 결과 순위 매기기

### 4. verify-admin
- **목적**: 관리자 권한 검증
- **기능**:
  - JWT 토큰 검증
  - 역할 기반 접근 제어

## 보안 구현

### 1. 데이터 보안
- **RLS 정책**: 모든 테이블에 적용
- **사용자별 데이터 격리**
- **관리자 권한 분리**

### 2. API 보안
- **JWT 토큰 인증**
- **CORS 설정**
- **Rate Limiting** (Supabase 레벨)

### 3. 클라이언트 보안
- **인증된 라우트 보호**
- **XSS 방지**
- **입력 데이터 검증**

## 성능 최적화

### 1. 프론트엔드
- **React Query 캐싱**
- **가상화된 리스트** (react-window)
- **지연 로딩**
- **메모화** (React.memo, useMemo)

### 2. 백엔드
- **데이터베이스 인덱싱**
- **Vector 검색 최적화**
- **효율적인 쿼리 구조**

### 3. 실시간 기능
- **Supabase Realtime** 효율적 사용
- **채널 관리 최적화**
- **메모리 누수 방지**

## 모니터링 및 로깅

### 1. 사용자 활동 추적
- **채팅 로그**
- **활동 참여 기록**
- **체크리스트 완료 이력**

### 2. 시스템 메트릭스
- **API 사용량**
- **응답 시간**
- **에러 발생률**

### 3. 교육 분석
- **질문 패턴 분석**
- **학습 효과 측정**
- **참여도 통계**

## 확장성 고려사항

### 1. 모듈화 아키텍처
- **컴포넌트 재사용성**
- **기능별 분리**
- **플러그인 구조**

### 2. 데이터베이스 설계
- **스케일러블 스키마**
- **효율적인 인덱싱**
- **파티셔닝 준비**

### 3. API 설계
- **RESTful 패턴**
- **버전 관리**
- **캐싱 전략**

## 개발 및 배포

### 1. 개발 환경
- **Vite 개발 서버**
- **Hot Module Replacement**
- **TypeScript 타입 체킹**

### 2. 배포 전략
- **Lovable 플랫폼 배포**
- **Supabase Edge Functions 자동 배포**
- **환경 변수 관리**

### 3. 테스팅
- **컴포넌트 테스트**
- **통합 테스트**
- **E2E 테스트**

## 설정 및 환경

### 1. Supabase 설정
- **프로젝트 ID**: rbaqyzdixamkrssfpxdv
- **실시간 기능** 활성화
- **Vector Extension** 설치

### 2. AI 설정
- **다중 제공자 지원**
- **모델별 설정**
- **프롬프트 템플릿 관리**

### 3. 스토리지 설정
- **chat-files 버킷**
- **공개/비공개 정책**
- **파일 크기 제한**

## 문제 해결 가이드

### 1. 일반적인 문제
- **인증 오류**: 토큰 갱신 문제
- **실시간 연결**: 웹소켓 연결 문제
- **파일 업로드**: 권한 및 크기 문제

### 2. 성능 문제
- **느린 쿼리**: 인덱스 최적화
- **메모리 누수**: 이벤트 리스너 정리
- **번들 크기**: 코드 스플리팅

### 3. 데이터 일관성
- **중복 데이터**: 유니크 제약조건
- **동시 업데이트**: 낙관적 잠금
- **트랜잭션 관리**: 원자성 보장

## 향후 개선 계획

### 1. 기능 확장
- **다국어 지원** 강화
- **모바일 최적화**
- **오프라인 지원**

### 2. 성능 향상
- **CDN 활용**
- **캐싱 전략** 개선
- **데이터베이스 최적화**

### 3. 사용자 경험
- **접근성** 개선
- **반응형 디자인** 강화
- **사용자 피드백** 시스템

---

이 문서는 AI 교육 플랫폼의 전체적인 아키텍처와 구현 방식을 상세히 설명합니다. 새로운 개발자가 프로젝트에 참여할 때 이 문서를 참조하여 빠르게 시스템을 이해할 수 있도록 작성되었습니다.