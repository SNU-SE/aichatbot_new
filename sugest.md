# 오류 가능성 진단과 수정 제안 (ai-chatbot-4-edu)

아래는 전체 코드를 빠르게 점검하며 빌드/런타임에서 문제가 발생할 가능성이 높은 지점과, 그에 따른 구체적인 수정 제안입니다. 각 항목에 파일 경로와 근거 라인을 함께 표기했습니다.

## 긴급 수정 권장 (빌드/런타임 에러 가능성 높음)

- 잘못된 Supabase import 경로 2건
  - 문제: 존재하지 않는 `../lib/supabase`를 import 하고 있습니다. 빌드 시 모듈을 찾지 못합니다.
  - 위치: 
    - `src/services/languageDetectionService.ts:6`
    - `src/services/multiLanguageSearchService.ts:6`
  - 제안: `@/integrations/supabase/client`로 수정
    - 예) `import { supabase } from '@/integrations/supabase/client';`

- Edge Function baseUrl 구성에 비공식 속성 사용
  - 문제: `supabase.supabaseUrl`은 퍼블릭 API로 보장되지 않습니다. 런타임에 `undefined`가 되어 함수 호출 실패 위험이 있습니다.
  - 위치:
    - `src/services/enhancedChatService.ts:36`
    - `src/services/vectorSearchService.ts:60`
  - 제안: 환경 설정에서 URL을 주입해 사용하도록 수정
    - `import { supabaseConfig } from '@/config/environment'`
    - `this.baseUrl = \
      (supabaseConfig.url?.replace(/\/$/, '')) + '/functions/v1';`

- 로컬 blob URL을 Edge Function에 전달 (외부에서 접근 불가)
  - 문제: `URL.createObjectURL(file)`로 만든 `blob:` URL은 사용자의 브라우저 로컬 컨텍스트에서만 유효합니다. Edge Function이 `fetch(pdfUrl)` 할 수 없어 실패합니다.
  - 위치: `src/utils/pdfProcessor.ts:7, 10-15`
  - 제안: 파일을 Supabase Storage에 업로드 후 public URL을 전달
    - 업로드 유틸 사용 → public URL 획득 → 그 URL을 Edge Function에 전달

- React 유틸 파일에서 React 네임스페이스 및 타임아웃 타입 사용 문제
  - 문제1: `React.useState`, `React.useEffect`를 사용하지만 `React`를 import하지 않았습니다.
  - 문제2: 브라우저 환경에서 `NodeJS.Timeout` 타입은 부정확합니다.
  - 위치: 
    - `src/utils/performanceOptimization.ts:6` (import)
    - `src/utils/performanceOptimization.ts:77-80` (React 네임스페이스 사용)
    - `src/utils/performanceOptimization.ts:16, 75, 114` 등 (NodeJS.Timeout)
  - 제안:
    - `import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react'`로 변경 후 `useState/useEffect` 직접 사용
    - `NodeJS.Timeout` → `ReturnType<typeof setTimeout>`로 변경

- CacheService가 즉시 IndexedDB 초기화 (테스트/SSR 환경에서 오류)
  - 문제: 모듈 로드 시 `indexedDB.open`을 바로 호출합니다. jsdom/SSR 환경 등에선 `indexedDB`가 없을 수 있습니다.
  - 위치: `src/services/cacheService.ts:54-56`
  - 제안: 
    - `if (typeof indexedDB !== 'undefined')` 가드 추가 후 지연 초기화(lazy init)
    - IndexedDB 미지원 시 메모리 캐시만 사용하도록 폴백

- 실시간 구독이 메시지 변경 때마다 재생성되는 이슈 (중복 구독/성능 문제)
  - 문제: `useEffect`의 deps에 `messages`가 포함되어 있어 메시지 변경 시마다 구독이 재생성됩니다.
  - 위치: `src/hooks/useEnhancedChat.ts:346-392`
  - 제안: deps에서 `messages` 제거하고, 중복 방지를 `useRef`로 처리하거나, 메시지 비교 로직을 콜백 내부에서만 수행

- Abort 취소 신호가 실제로 fetch로 전달되지 않음
  - 문제: `useEnhancedChat`에서 `AbortController`를 생성하지만, 서비스 메서드(`sendMessage`, `sendMessageStreaming`)에 `signal`을 넘기지 않아 취소가 동작하지 않습니다.
  - 위치: `src/hooks/useEnhancedChat.ts:185-191` (컨트롤러 생성), 서비스 쪽 fetch에는 signal 미전달
  - 제안: 서비스 메서드에 `signal?: AbortSignal` 파라미터 추가 후 `fetch(..., { signal })` 사용. 훅에서 `abortControllerRef.current.signal`을 전달

- 의사 난수 토큰 생성 (보안 취약 가능)
  - 문제: `Math.random()` 기반 토큰
  - 위치: `src/services/securityService.ts` 내 `generateSecureToken`
  - 제안: `crypto.getRandomValues` 또는 `crypto.randomUUID()` 사용

- 브라우저 환경 판별에 `process.env.NODE_ENV` 사용
  - 문제: Vite/브라우저 환경에서는 `process.env`가 기대와 다를 수 있습니다.
  - 위치: `src/services/errorHandlingService.ts:148`
  - 제안: `import.meta.env.MODE === 'development'`로 교체

- 환경설정 중복 파일 존재 (혼선 위험)
  - 문제: `src/config/env.ts`와 `src/config/environment.ts`가 공존. 실제 사용은 후자 중심이며, 전자는 미사용으로 보임.
  - 제안: 한 곳으로 통합. `environment.ts`만 유지하고 `env.ts`는 제거하거나 deprecated 주석 추가

- OpenAI 임베딩 모델 구버전 사용
  - 문제: `text-embedding-ada-002`는 deprecated.
  - 위치: `supabase/functions/rag-search/index.ts:94`
  - 제안: `text-embedding-3-small`(또는 `-large`)로 교체 및 응답 파싱 확인

- 파일 업로드 유틸 보강
  - 문제: 파일명 충돌 가능성(Math.random), MIME/용량 검증 부재, content-type 지정 없음, URL null 체크 부재
  - 위치: `src/utils/fileUpload.ts`
  - 제안: 
    - 파일명: `crypto.randomUUID()` 사용
    - 업로드 옵션에 `contentType: file.type`
    - 업로드 전 보안/형식 검증(`securityService.validateFileUpload` 등) 적용
    - `urlData?.publicUrl` 존재 체크

## 제안 변경 예시 (스니펫)

- Supabase import 경로 수정
  - `src/services/languageDetectionService.ts:6`
  - `src/services/multiLanguageSearchService.ts:6`
  - 변경:
    - `import { supabase } from '@/integrations/supabase/client';`

- Edge Function baseUrl 구성 수정
  - `src/services/enhancedChatService.ts:36`
  - `src/services/vectorSearchService.ts:60`
  - 변경(예):
    - `import { supabaseConfig } from '@/config/environment'`
    - `this.baseUrl = (supabaseConfig.url?.replace(/\/$/, '')) + '/functions/v1';`

- PDF 처리: blob URL → Storage public URL
  - `src/utils/pdfProcessor.ts:7, 10-15`
  - 변경(요지):
    - `const publicUrl = await uploadFile(file, activityId);`
    - `supabase.functions.invoke('process-pdf', { body: { pdfUrl: publicUrl, activityId } })`

- React 유틸 import/타입 수정
  - `src/utils/performanceOptimization.ts`
  - 변경(요지):
    - `import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react'`
    - `let timeout: ReturnType<typeof setTimeout> | null = null;`

- CacheService IndexedDB 가드
  - `src/services/cacheService.ts:54-56`
  - 변경(요지):
    - `if (typeof indexedDB !== 'undefined') { await this.initIndexedDB(); }`

- useEnhancedChat 실시간 구독 deps 정리
  - `src/hooks/useEnhancedChat.ts:392`
  - 변경(요지): deps를 `[currentSession]`로 축소, 중복 여부는 내부에서 ref로 관리

- AbortSignal 전달
  - 훅 → 서비스 메서드에 `signal` 전달, 서비스의 `fetch`에 `{ signal }` 추가

- 보안 난수 토큰
  - `src/services/securityService.ts`
  - 변경(요지): `crypto.getRandomValues(new Uint8Array(...))` 또는 `crypto.randomUUID()`

- 개발 모드 판별
  - `src/services/errorHandlingService.ts:148`
  - 변경: `if (import.meta.env.MODE === 'development') { ... }`

- OpenAI 임베딩 모델 업데이트
  - `supabase/functions/rag-search/index.ts:94`
  - 변경: `'text-embedding-3-small'`

- 파일 업로드 유틸 강화
  - `src/utils/fileUpload.ts`
  - 변경(요지): 업로드 전 `securityService.validateFileUpload` 적용, 파일명 `crypto.randomUUID()`, `contentType: file.type`, `urlData?.publicUrl` 체크

## 추가 개선 제안 (중간 우선순위)

- 에지 함수 환경 유틸 통일: 이미 `supabase/functions/_shared/environment.ts`가 있으므로 다른 함수에서도 동일 유틸로 환경 접근/검증 일원화
- 검색/챗 서비스의 에러 포맷 통일: `EnhancedErrorResponse` 사용 일관화, 사용자 피드백 메시지 표준화
- 임베딩 차원/모델 상수 중앙화: `types/enhanced-rag.ts`의 상수와 실제 함수 모델 사용 간 일치성 보장

## 빠른 체크리스트

- [ ] 잘못된 import 2건 수정 (빌드 실패 방지)
- [ ] baseUrl 구성 공식 경로로 교체 (런타임 실패 방지)
- [ ] PDF 처리 경로: blob → Storage public URL
- [ ] React 유틸 import/타입 수정 (런타임 오류 방지)
- [ ] CacheService IndexedDB 가드 추가 (테스트/SSR 안정화)
- [ ] useEnhancedChat 구독 deps 축소 및 AbortSignal 전달
- [ ] 보안 난수 토큰 적용
- [ ] 환경 판별 import.meta.env.MODE로 교체
- [ ] env 설정 파일 중복 정리 (`environment.ts`로 통합)
- [ ] OpenAI 임베딩 모델 최신화
- [ ] 업로드 유틸 검증/옵션 강화

필요하시면 위 제안 중 우선순위 높은 항목부터 실제 패치 적용까지 진행해 드리겠습니다.

