# PROGRESS — 헬스앱

## 마지막 한 일 (2026-06-14 — 세션 5: 묶음1·2·3 main 머지 + 운영 배포)
- **시각 QA 통과** → 사용자 승인("좋아 보여 합쳐줘").
- **묶음1·2·3 전부 main 머지 완료.** main `2c35f88`. 묶음1·2(PR #16) 먼저 → 묶음3(PR #18) 순차 머지. v16 운영(Vercel Production) 배포 **success**.
- 검증: main에서 특성화 테스트 **21/21**, 캐시 v16 확인.
- ⚠️ 머지 사고/교훈: PR #16(묶음1·2) 머지하며 가지 삭제 → 그 위에 스택돼 있던 PR #17(묶음3)이 깃허브에서 **자동 CLOSE**됨(기준 가지 사라짐). 재오픈은 API가 거부. 해결 = 묶음3 가지에서 **main 기준 새 PR #18**을 만들어 머지. (다음에 스택 PR 머지할 땐 위 PR base를 먼저 main으로 바꾸고 아래를 머지할 것.)

### 이전 (2026-06-14 — 세션 4: 묶음3 grill + 구현)
- **묶음3(AI 두뇌) grill 완료** → REMAKE-PLAN.md 기록. 결정: 코치 기억 노트(자동+수정/삭제) / 주간리뷰·정체기 코치 대화 통합(별도 화면 유지) / 추천 최근기억+다양성+풀확대 / 노트는 더보기 AI코칭 메뉴.
- **묶음3 구현 (TDD)** → 브랜치 `feat/healthapp-remake-bundle-3`, 커밋 `fc05290` 푸시.
  - 코치 기억 노트: 응답 끝 숨김 ```memory 블록 자동 추출(parseCoachMemoryBlock) → 중복제거 병합(mergeCoachMemory) → getCoachSystemPrompt 주입. 노트 화면(카테고리·추가/수정/삭제), 백업 포함, 데모 시드.
  - 리뷰/정체기: buildUserContext에 최신 요약 주입 + 주간리뷰 "코치와 상담" 버튼.
  - 추천 다양화: AI_RECOMMENDATION_HISTORY 최근 추천 회피 + 루틴 다양성 지시.
  - 코치 프롬프트 "5~6주"→"5주(빌드4+디로드1)" 정정.
- 검증: 특성화 테스트 **21/21**, 렌더 스모크 통과. 캐시 v15→v16.
- 리뷰: **Codex approve (1라운드, 이슈 0)**.
- 보류: 추천 카드 "최근 추천" 텍스트(현재 UI에 추천 카드 표출 지점 없음 — AI 레벨 다양성은 동작).

### 이전 (2026-06-14 — 세션 3: 묶음1·2 구현)
- **묶음1+2 동시 구현 (TDD)** → 브랜치 `feat/healthapp-remake-bundle-1-2`, 커밋 `594c1be` 푸시.
- 묶음1: 껍데기 메뉴 7개 삭제 / 프로필 수정 모달 신규 / 백업·복원 JSON 전환(운동데이터만, API키·대화 제외, 복원 시 임시세션·캐시 정리).
- 묶음2(근거 기반): 1RM rolling max(최근 4세션, >12회 제외, 상승즉시·하락느리게) / 사이클 5주(빌드4+디로드1) 화면 재설계 / 주차진행 = **완료 횟수(weekSessionsDone) 기준**(캘린더 무관) / 휴식 복귀 안내 / cycleHistory 신설.
- 검증: 특성화 테스트 **17/17**, 렌더 스모크 통과, 5파일 node --check OK. 캐시 v14→v15.
- 리뷰: **Codex 4라운드 approve**. needs-attention 3건 수정 — ①update1RM에도 >12회 제외 ②복원 시 임시/캐시 키 정리(API키·대화 보존) ③진행도 캘린더→완료횟수 기준.

### 이전 (2026-06-13 — 세션 2: 리메이크 grill·계획)
- `/grill-me`로 사용자 요청 5페이즈를 **6묶음**으로 재정리(순서 합의): 빠른정리 → 엔진수리 → AI두뇌 → GIF정합 → 화면정리 → 디자인(맨 끝).
- **묶음1·2 결정 확정** (`docs/REMAKE-PLAN.md`에 전부 기록):
  - 묶음1: 설정 7개 삭제 / 프로필 수정(기본+목표, 모달) 신규 / 데이터 내보내기·가져오기·초기화 유지+작동점검.
  - 묶음2(근성장 근거): 1RM=최근 3~4회 최고치(↑즉시·↓완만) / 사이클=4주 빌드+1주 디로드 / 주차=완료 기준(날짜 아님, 날짜는 휴식 알림용).
- **근성장 과학 조사**(WebSearch 다중 소스 교차검증): e1RM 추적·주기화·디로드·주차진행 → 출처까지 REMAKE-PLAN.md에 정리.
- **CLAUDE.md에 "## 개발 원칙 — 근성장 근거 기반(최우선)" 추가** + 장기 메모리 저장(개발 방향은 무조건 근비대 근거, 모르면 조사).

### 이전 (2026-06-13 — 세션 1: 분리/하네스)
- `/init`로 `CLAUDE.md` 생성 — 단일 HTML PWA의 구조·실행·서비스워커·AI 연동 안내.
- **Matt Pocock 엔지니어링 스킬 설정** (`docs/agents/`): 이슈트래커=GitHub(`gh`), 표준 트리아지 라벨, 단일 컨텍스트 + `.gitignore`에 `.omc/` → **PR #12 병합**.
- **헬스앱 작업 하네스 구성** → **PR #13 병합**:
  - `.claude/skills/healthapp-feature` (새 기능), `healthapp-ai-prompt` (AI 프롬프트 튜닝), `healthapp-deploy` (배포)
  - `.claude/QA_CHECKLIST.md` (수동 QA 완료 조건), `CLAUDE.md` "하네스: 헬스앱" 섹션
  - 원칙: 구현은 메인 Claude 직접 + dev-pipeline + Codex 리뷰 (위임 오케스트레이터 없음)
- **`index.html`(11,154줄) 빌드 없이 분리** → `css/styles.css` + `js/{data,core,domain,ai,screens}.js` (+ ~35줄 셸) → **PR #14 병합 (`08d07b5`)**:
  - dev-pipeline + TDD: zero-dependency Node `vm` 특성화 테스트(`tests/`)로 GREEN 기준선 → 분리 후에도 통과 확인
  - 안전망: 줄 멀티셋 불변식 + `node --check` ×5 + 특성화 테스트 8/8 + 렌더 스모크
  - Codex 리뷰 2라운드 — `'use strict'` 누락 지적 → 5개 파일에 복원 + 회귀 테스트 추가
  - 서비스워커 캐시 `v12 → v14`, `CORE_ASSETS`에 css/js 등록
  - Vercel 미리보기에서 사용자 시각·동작 QA 확인 완료

## 다음 할 일
- [x] **PR 머지** — 묶음1·2(#16) + 묶음3(#18) → main 완료 (2c35f88, v16 운영 배포 success). ~~스택 PR #17은 사고로 CLOSE → #18로 재제출~~
- [ ] **묶음4(GIF) grill** — 운동명↔GIF 정합(GIF **18개** vs 운동 종목 수십개[부위맵 43+AI 변형명]): 커버리지·퍼지매칭·정표 운동명. 이후 5(화면정리)·6(디자인)
- [ ] 운영 앱에서 새 버전(`v16`) 최종 확인 — 강력 새로고침 후 5탭 + 기억 노트 + 코치 흐름 점검
- [ ] (선택) `js/screens.js`(약 5,097줄)가 부담되면 화면별로 더 잘게 분리
- [ ] (선택) 특성화 테스트 커버리지 보강 (화면 렌더 스냅샷 등)
- [ ] 새 기능 추가 시 `healthapp-feature` 스킬로 진행 (dev-pipeline 게이트 준수)

## 막힌 점 / 주의
- 이 프로젝트는 **빌드/린트/타입체크 없음**(순수 정적 파일). 검사 = `node --test tests/characterization.test.mjs` (현재 **8/8 통과**).
- `node --test tests/`(폴더 형식)는 이 환경에서 깨짐 → **파일 명시형**으로 실행.
- 앱 코드(`index.html`/`css`/`js`) 변경 시 **반드시 `service-worker.js`의 `CACHE_VERSION`을 올릴 것** (안 올리면 사용자에게 새 코드가 안 보임). 새 정적 파일 추가 시 `CORE_ASSETS`에도 등록.
- 각 `js/*.js`는 첫 문장이 `'use strict'`여야 함(원본 동작 보존).
- **세션 중 API 400 "no low surrogate in string" 발생** — 큰 도구 출력이 잘리며 이모지 등 멀티바이트 글자가 반쪽으로 대화기록에 박힌 탓. 해결 = 세션 종료 후 `/compact`(또는 `/clear`)로 기록 재정리. 구현엔 영향 없음.
- 배경 워크플로우(근성장 조사)는 사용량 한도로 21:28 종료 → 종합 결과는 journal에서 추출해 REMAKE-PLAN.md에 반영 완료(현재 도는 프로세스 없음).

## 마지막 커밋
- `fc05290` — feat: 묶음3 구현 (브랜치 `feat/healthapp-remake-bundle-3`, 푸시됨)
- `594c1be` — feat: 묶음1·2 구현 (브랜치 `feat/healthapp-remake-bundle-1-2`, PR #16)
- 미머지: PR 머지는 미리보기 시각 QA 후. (3은 1·2 위에 스택)

_다음 세션 재개: "REMAKE-PLAN.md 읽고 묶음4(GIF)부터 grill 해줘". (묶음1·2·3은 이미 main 머지·배포 완료)_
