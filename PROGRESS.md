# PROGRESS — 헬스앱

## 마지막 한 일 (2026-06-13 — 세션 2: 리메이크 grill·계획)
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
- [ ] **묶음3(AI) grill 이어가기** — 코치 기억 정책 / 주간리뷰·정체기 코치통합 방식 / 추천 반복 해결 (REMAKE-PLAN.md 참고)
- [ ] 묶음4(GIF)·5(화면정리)·6(디자인) 순차 grill
- [ ] 합의 끝난 **묶음1·2 구현** (dev-pipeline → Codex 리뷰 → 검증 → 배포: `CACHE_VERSION` 올리기)
- [ ] 운영 앱에서 새 버전(`v14`) 최종 확인 — 강력 새로고침 후 5탭 + 운동/음식/코치 흐름 점검
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
- `9500b9d` — docs: add PROGRESS.md session log (브랜치 `docs/progress-md`)
- 세션2 문서(계획·근성장 원칙) 커밋은 **사용자 승인 후** 진행 예정 — 코드 변경 없음(문서만), Codex 리뷰 불필요.

_다음 세션 재개: "REMAKE-PLAN.md 읽고 묶음3부터 이어서 grill 해줘" (또는 합의된 묶음1·2 구현 시작)._
