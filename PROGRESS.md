# PROGRESS — 헬스앱

## 마지막 한 일 (2026-06-13)
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
- [ ] 운영 앱에서 새 버전(`v14`) 최종 확인 — 강력 새로고침 후 5탭 + 운동/음식/코치 흐름 점검
- [ ] (선택) `js/screens.js`(약 5,097줄)가 부담되면 화면별로 더 잘게 분리
- [ ] (선택) 특성화 테스트 커버리지 보강 (화면 렌더 스냅샷 등)
- [ ] 새 기능 추가 시 `healthapp-feature` 스킬로 진행 (dev-pipeline 게이트 준수)

## 막힌 점 / 주의
- 이 프로젝트는 **빌드/린트/타입체크 없음**(순수 정적 파일). 검사 = `node --test tests/characterization.test.mjs` (현재 **8/8 통과**).
- `node --test tests/`(폴더 형식)는 이 환경에서 깨짐 → **파일 명시형**으로 실행.
- 앱 코드(`index.html`/`css`/`js`) 변경 시 **반드시 `service-worker.js`의 `CACHE_VERSION`을 올릴 것** (안 올리면 사용자에게 새 코드가 안 보임). 새 정적 파일 추가 시 `CORE_ASSETS`에도 등록.
- 각 `js/*.js`는 첫 문장이 `'use strict'`여야 함(원본 동작 보존).

## 마지막 커밋
- `08d07b5` — Merge PR #14: index.html 분리 (css/ + js/*.js) + 특성화 테스트 (2026-06-13)
- `main` 클린, 원격(origin) 동기화 완료.

_다음 세션 재개: "헬스앱 작업 이어서 해줘" — 운영앱 v14 최종 확인, 또는 새 기능 추가(`healthapp-feature`)부터._
