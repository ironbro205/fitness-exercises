# Claude 커넥터 전환 설계서 (1단계)

> 2026-09-27 이후: 웨이트는 "오늘 루틴 1개"가 아니라 **한 주 계획**이다 — `docs/weekly-plan.md`가 정본. 이 문서의 결정 6(주간 계획·분할 제안 안 함), `save_today_routine`·`RoutinePlan`·`fitness/plan-routine.json`, 운동 탭 「Claude 추천」 줄은 그 문서로 대체됐다.

작성 2026-09-27 (grill 합의). 목표: 앱 안 API 요금 0. 판단은 폰 Claude 앱의 Opus가 하고, 헬스앱은 기록·실행 도구로 남는다.
Opus는 원격 MCP 커넥터로 기록을 읽고 오늘의 웨이트 루틴·유산소 플랜을 저장하며, 헬스앱은 그것을 가져와 그대로 실행한다.
운동 중 조언(세션 중 커넥터)은 2단계.

## 결정 (사용자 확정)
1. 앱 안 AI(API 키로 Sonnet·Haiku 호출) 전부 삭제 — API 키 메뉴 포함.
2. 부상 관리 앱 전체 삭제 — 금기 자동 교체·부상 안내 토스트·통증 시 증량 보류·`INJURY_AREAS`·`EXERCISE_SAFETY`·지침 속 부상 규칙. 부상은 사용자가 Claude 앱에 직접 말한다.
3. Claude 루틴의 숫자는 Opus가 정한 그대로 실행. 점진적 과부하도 Opus 몫 — 앱은 계산값(추천 무게·1RM·정체 판정·부족 부위·목표 세트)을 보내지 않는다.
4. 보낼 기록 = 최근 8주 원자료(모든 세션·모든 세트) + 8주 넘게 안 한 종목은 마지막 1회 + 유산소 8주 원자료 + 체중 기록.
5. 세트는 Opus가 세트마다 직접(무게×반복·워밍업 여부·휴식 초). Claude 루틴에서는 앱의 세트법 자동 배정·자동 워밍업·자동 슈퍼세트·운동 중 자동 조정(탑세트 미달 시 백오프 감량, 미달 시 휴식 +30초 등)을 끈다. 손으로 바꾸는 것은 그대로 된다.
6. 지침은 최소 안: ① 사용자 선호 — 웨이트 세션 70분 안팎(워밍업·휴식 포함, 유산소 별도), 오늘 할 부위는 사용자가 정한다(주간 계획·분할 제안 안 함) ② 앱 규칙 — 종목은 보유 장비 기준 종목 목록에서, 무게 단위(머신·바벨·케이블·스미스 5kg, 덤벨 2kg), 어시스트 종목 무게 = 보조 무게 ③ 원자료. 지식 베이스·루틴 규칙·금지·체크리스트·코치 원칙·답변 등급·영양 제외·종목 수·사이클 정보는 넣지 않는다.
7. 코치 기억 노트 기능 통째로 삭제.
8. 코칭 화면 전부 삭제 — 주간 리뷰(카드·화면), 정체기(카드·화면), 디로드 앞당기기 제안, 코치 채팅, 운동 중 채팅. 기록·그래프·PR·1RM 목록 같은 사실 표시는 남긴다.
9. 운동 탭 — 부위 카드(PUSH·PULL·LEGS·UPPER)는 Claude 추천이 없을 때 기본 틀(`SESSIONS` + 앱 점진 과부하)로 유지. FREE 카드와 AI 대화 3단계 삭제.
10. 유산소도 이번에 — Opus가 구간 플랜을 저장하고 러닝 탭이 가져온다. 러닝 탭의 AI 생성은 삭제, 규칙 기반 기본 플랜은 유지.
11. 사용자 정보 줄: 나이·키·현재 체중·보유 장비만. 목표(린매스)·경력·환경(풀업 포함) 줄, 주 목표 횟수, 사이클 정보는 보내지 않는다.
12. 잠금 = URL 경로 비밀 코드(`/api/mcp/<코드>`, 앱은 같은 코드를 Bearer로). 저장소 = Vercel Blob private(`useCache:false`). MCP = `mcp-handler@2.1.1` + `@modelcontextprotocol/server@2` + `zod@4`. claude.ai는 서버 `instructions`를 무시하므로 지침은 도구 결과 글로 준다.
13. Claude 세션 중 사용자가 직접 추가한 종목(Opus 값 없음)은 그 종목의 마지막 수행 작업 세트를 그대로 복사한다(무게·반복·세트 수, 워밍업 없음, 휴식은 지금 종목의 작업 세트 휴식). 기록이 없으면 무게 빈칸·10회·3세트. 세트법·자동 워밍업·앱 계산 없음. 건너뛰기 되돌리기에서 보관본이 없을 때도 같은 규칙.
14. Claude 연결 시트: [저장]은 시트를 닫고 알림을 띄운다. [지금 보내기]는 알림 없이 시트 안 '마지막 전송' 줄을 새 시각으로 바꾸고, 실패하면 그 자리에 한 줄 안내를 띄운다. 이 시트만 바꾸고 전역 알림 위치는 그대로.

## 서버 (새 파일, 앱 파일과 겹치지 않음)
| 파일 | 하는 일 |
|---|---|
| `package.json` | `private`, 의존성 4개(`@vercel/blob` 포함), `engines.node >=20`, build 스크립트 없음, `"type"` 없음(서버는 `.mjs`) |
| `.gitignore` | `node_modules/` 추가 |
| `api/_lib/auth.mjs` | `HEALTH_SYNC_TOKEN`과 시간 일정 비교. 없거나 20자 미만이면 전부 거부 |
| `api/_lib/store.mjs` | `getJSON`/`setJSON` — Blob private 구현 + 메모리 구현(`VERCEL` 환경변수가 있으면 메모리 구현 금지) |
| `api/_lib/kst.mjs` | 한국 날짜 `YYYY-MM-DD`(UTC+9, 앱 `getTodayStr`과 같은 규칙) |
| `api/_lib/guide.mjs` | 결정 6의 최소 지침 글(한국어) — 지침을 고칠 곳은 여기 한 곳 |
| `api/_lib/tools.mjs` | 도구 4개의 순수 로직(store·now 주입, 의존성 없음) + 스냅샷 → 읽기 좋은 글 변환 |
| `api/mcp/[token].mjs` | 경로 끝 코드 검사(틀리면 404) → mcp-handler로 도구 4개 |
| `api/snapshot.mjs` | `POST` 스냅샷 저장(최대 1MB, `schemaVersion:1`) |
| `api/plan.mjs` | `GET` → `{routine, cardio}`(각각 오늘 것만, 없으면 null) |
모든 응답 `Cache-Control: no-store`. Blob 키 `fitness/snapshot.json`·`fitness/plan-routine.json`·`fitness/plan-cardio.json`.

## MCP 도구 (설명 한국어, 계약을 정확히 — 행동 지시·예시는 넣지 않는다)
1. `get_training_context` (읽기) — 입력 `session?`(push|pull|legs|upper|free). 글: 올린 시각(KST)·경과 → 지침 → 사용자 정보 → 웨이트 8주 원자료 → 오래된 종목 마지막 1회 → 유산소 8주 → 체중 → 종목 목록(세션 지정 시 그 세션, 없으면 전부). 스냅샷 없음 = 헬스앱을 열어 달라는 한 줄, 12시간 초과 = 경고 한 줄.
2. `save_today_routine` (쓰기) — `session, title, note?, exercises[1..20]{name, note?, sets[1..15]{weight:number|null, reps:정수 또는 "8-10", warmup?:bool, restSec?:정수 0..600}}`. 이름이 그 세션 목록(free = 전체)에 없으면 저장하지 않고 틀린 이름과 비슷한 목록 이름을 돌려준다.
3. `save_today_cardio` (쓰기) — `mode(interval|walk), title, note?, segments[1..60]{type(warmup|walk|run|cooldown), sec:정수 10..3600, speed:km/h 0..20, incline?:% 0..12}`. walk 외 모드는 경사 0.
4. `get_saved_plans` (읽기) — 오늘 저장된 루틴·유산소.
저장 형태 `{id, createdAt, date(KST 오늘), ...입력}` — 같은 종류는 덮어쓴다.

## 앱 쪽 (js/)
- 삭제(결정 1·2·7·8·9·10): 해당 함수·화면·state·KEYS 사용처·CSS·시험. 파일 이름 `js/ai.js`는 유지하되 내용은 커넥터 동기화로 바뀐다. 옛 백업 파일(삭제된 키 포함) 가져오기가 깨지지 않게 한다.
- 새 키 `KEYS.SYNC_TOKEN`(`fitness_sync_token`, 기기 전용·백업 제외), `KEYS.CLAUDE_SYNC`(`{lastUploadAt, lastUploadHash, lastImportedRoutineId, lastImportedCardioId}`, 백업 제외).
- `buildClaudeSnapshot()` → `{schemaVersion:1, uploadedAt, todayKst, appVersion, profile:{age,heightCm,weightKg}, equipment[], workouts[], olderLastPerformed[], cardio[], body[], catalog:{push,pull,legs,upper,free:[이름]}}` — 원자료만(결정 3·4·11). 카탈로그는 별칭 제외·보유 장비 기준.
- `uploadClaudeSnapshot({force})`(해시 같으면 건너뜀, 실패는 조용히 — [지금 보내기]만 토스트), `fetchClaudePlans()`(오늘 날짜이고 가져온 적 없는 id만 `state.claudeRoutine`·`state.claudeCardio`).
- 시점: `init()` 끝, 다시 보일 때(`visibilitychange`, 60초 제한), 운동·유산소 저장 뒤(보내기만). 코드가 없으면 아무것도 안 한다.
- 루틴 가져오기: `generatedRoutine={source:'claude', bodyPart, headline, exercises[{name, note, claudeSets}]}` → 2단계. `startGeneratedRoutine`은 `claudeSets`가 있으면 세트를 그대로 만든다(무게는 장비 단위 스냅만, `getSessionSetPlan`·세트법·자동 워밍업·슈퍼세트 제안 없음). 세션에 `source:'claude'` → 운동 중 자동 조정 끔. 편집 시트는 Claude 종목에서 무게(작업 세트 일괄 ±)·반복·세트 수(마지막 작업 세트 복제/삭제)·빼기·바꾸기가 된다.
- 유산소 가져오기: `cardioNormalizePlan`으로 모양만 맞춰 `state.cardio.mode/plan/phase='preview'`.
- 서비스워커: 모든 호스트의 `/api/`는 가로채지 않는다. `CACHE_VERSION` +1, 새 정적 파일은 `CORE_ASSETS`.
- `CLAUDE.md`: AI 절·코드 지도·디자인 규칙 예외·검사 명령을 새 구조로 고치고, 「작업 규칙」 절(분할·주간 처방 금지, 브라우저별 저장소 — API 키 대신 연결 코드)을 넣는다.

## 화면
1. 더보기: API 키 줄 자리에 「Claude 연결」 → 시트(연결 코드 칸·가림, [저장], [지금 보내기], 마지막 전송 시각 한 줄). 주소 전체를 붙여도 코드만 뽑는다.
2. 운동 탭 첫 화면: `state.claudeRoutine`이 있을 때만 부위 카드 위 「Claude 추천 · PUSH 6종목」 한 줄 → 2단계. 한 번 열면 사라짐. FREE 카드 삭제 후에도 390×844 한 화면.
3. 러닝 탭: `state.claudeCardio`가 있을 때만 「Claude 유산소 · 경사 걷기 30분」 한 줄 → 미리보기.
4. 2단계의 Claude 종목 줄: 이름 + 세트 요약(예: `워밍업 2 · 60kg×8 · 55kg×10×2`).
5. 디자인 규칙(ICONS만·해요체·한 문장 40자·느낌표 없음·11px 하한·색 토큰·CSS에 있는 클래스만·제목 밑 설명 캡션 금지) 준수. 새 시트는 등록 6곳(state·render 꼬리·getTopLayer·navBack·세션 종료 정리·스와이프 가드).

## 시험·검증
- 무의존 시험: 커넥터 도구·인증·날짜·신선도, 스냅샷 모양(계산값 없음), 백업 제외·옛 백업 호환, 루틴·유산소 가져오기, Claude 세트 그대로 실행, 운동 중 자동 조정 꺼짐, 기본 틀 경로 무변화.
- 전역 함수 변화 → `tests/golden-symbols.json` 배열·개수. 검사는 파일 이름을 명시해 전부 돌린다.
- 로컬 통합: `scripts/dev-server.mjs`(정적 + `api/`, 메모리 저장소) → MCP Inspector CLI `tools/list`·`tools/call` 4종 → 헤드리스 크로미움 실제 클릭(코드 입력 → 전송 → 도구로 저장 → 새로고침 → 추천 줄 → 2단계 → [시작] → 세트 확인, 유산소 동일).

## 배포 (사용자 승인 뒤, 워크플로 밖)
Blob private 저장소 생성·연결 → `HEALTH_SYNC_TOKEN` 등록 → PR·병합(자동 배포) → 라이브 Inspector 확인 → 사용자가 claude.ai 웹에서 커넥터 추가·앱에 코드 입력.
