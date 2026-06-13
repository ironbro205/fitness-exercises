# 헬스앱 QA 체크리스트 (Phase 완료 조건)

이 프로젝트는 **자동화된 테스트가 없다.** 그래서 완료 조건 = 아래 **수동 점검**을 통과하는 것이다.
빌드/린트/타입체크 명령도 없으므로(순수 정적 HTML/JS), 이 체크리스트가 그 자리를 대신한다.

> 미리보기: `python3 -m http.server 8000` 후 `http://localhost:8000`. **반드시 강력 새로고침**(또는 DevTools "Update on reload")으로 서비스워커 캐시를 우회해 최신 코드를 확인할 것.

## 항상 확인 (모든 변경)

- [ ] 앱이 정상 로드된다 — 흰 화면/멈춤 없음, 브라우저 콘솔에 빨간 에러 없음
- [ ] 5개 탭(홈·운동·연료·기록·더보기)이 모두 열린다
- [ ] 바꾼 기능이 **의도한 대로** 동작한다 (구체적 시나리오를 직접 눌러서 확인)
- [ ] 기존 `localStorage` 데이터와 호환된다 — `KEYS`(접두사 `fitness_`) 구조를 깨지 않았다
- [ ] 모바일 세로 화면(포트레이트) 폭에서 레이아웃이 깨지지 않는다
- [ ] **서비스워커 `CACHE_VERSION`을 올렸다** (코드가 바뀌면 필수 — 안 올리면 사용자에게 새 코드가 안 보임)

## 변경 유형별 추가 확인

- **새 정적 파일 추가 시** (예: `js/*.js`, `css/*.css`):
  - [ ] `index.html`에 `<script>`/`<link>`로 **올바른 순서**로 연결했다
  - [ ] `service-worker.js`의 `CORE_ASSETS` 목록에 추가했다
- **날짜·주간 관련 변경 시**:
  - [ ] KST(한국시간) 헬퍼(`getTodayStr`/`getDateStr`)를 썼다 — 자정 경계가 한국 기준으로 맞는다
- **AI 기능 변경 시**:
  - [ ] 실제 API 키로 **1회 호출**해 응답이 정상인지 확인했다 (모델 id·헤더 안 깨짐)
  - [ ] 응답이 한국어로 나온다
- **운동 세션/마법사/휴식 타이머 변경 시**:
  - [ ] 백그라운드/새로고침 후 진행 상태 **복원**이 여전히 동작한다 (`init()`의 복원 로직)

## 완료 보고 필수 항목 (dev-pipeline 게이트)

아래가 없으면 "완료"로 인정하지 않는다:
Pipeline skill · Plan source · Human approval · Implementer · Reviewer · Review status ·
Verifier · Verification · Manual QA(위 체크리스트 결과) · Scope check · Commit hash

> 이 프로젝트엔 린트/타입체크/테스트 통과 항목이 없으므로, "Verification"은 위 수동 QA 통과로 갈음한다.
