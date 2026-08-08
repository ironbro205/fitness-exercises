# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

헬스앱 ("Health App") — a Korean-language, mobile-first **AI fitness coach PWA**. It tracks weight training, treadmill cardio (intervals / incline walking), and body metrics, and uses the Anthropic API for routine generation, a coach chat, weekly reviews, and plateau detection.

The five tabs are **홈 · 운동 · 러닝 · 기록 · 더보기**. There is **no food/nutrition feature** — it was removed in the remake, so ignore any older reference to a "연료" tab, `FOOD_DB`, or food analysis.

The app is **plain static files, no build step** — a thin `index.html` shell plus `css/styles.css` and six `js/*.js` files. No framework, no package manager, no backend in this repo. Logic is guarded by a small zero-dependency test harness (see Running & testing).

## 개발 원칙 — 근성장(근비대) 근거 기반 (최우선)

이 앱의 **모든 개발 방향 제시·기능 추천·기본값 설정은 반드시 근성장(근비대) 연구 결과를 근거로 한다.** 운동 로직(1RM 추적, 진행/과부하, 사이클·주기화, 디로드, 볼륨/세트 권장, AI 코치·추천 프롬프트 등)에 관한 결정을 내릴 때:

- 추측이나 일반 상식으로 정하지 말고, **근비대 과학(메타분석·리뷰: Schoenfeld, Helms, Israetel 등, Stronger By Science/MASS, Renaissance Periodization, NSCA)을 근거로** 제시한다.
- **지식이 부족하거나 불확실하면 먼저 웹 조사(WebSearch/WebFetch, 가능하면 다중 소스 교차검증)를 한 뒤** 제시한다. 근거 없는 단정 금지.
- 사용자에게 안을 제시할 때 **"왜 이게 근성장에 좋은지(근거)"를 함께** 설명한다. 출처를 남긴다.
- 단순함과 근거가 충돌하면, **근거가 뒷받침하는 가장 단순한 안**을 우선한다(1인 비선수 사용자 기준).

## Repository layout

- `index.html` — thin HTML shell: `<head>`, a `<link>` to the stylesheet, `<div id="app">`, and 6 `<script src>` tags loaded in order.
- `css/styles.css` — all styles.
- `js/*.js` — app logic as plain (non-module) scripts sharing one global scope, loaded `data → core → domain → bodymap → ai → screens` (see **Code map**). ES5-style `var`/function declarations; each file starts with `'use strict'`.
- `service-worker.js` — offline caching (Network-First).
- `manifest.json` — PWA manifest (standalone, portrait, Korean); `icon-*.png` — PWA icons.
- `tests/` — zero-dependency characterization tests (see Running & testing).

## Running & testing

No build step. The app needs a real HTTP origin (service worker + PWA do not work from `file://`):

```
python3 -m http.server 8000   # then open http://localhost:8000
```

Logic regression is guarded by **zero-dependency characterization tests** — run with:

```
node --test tests/characterization.test.mjs
```

(the bare-directory `node --test tests/` form is unreliable in this environment — name the file). The harness (`tests/_harness.mjs`) loads the app's JS in a Node `vm` with a stub DOM, then golden-master-checks the pure functions (1RM, progressive overload, volume analysis, cardio plan summary) and asserts no global function/data table went missing (`tests/golden-symbols.json`). It auto-loads `js/*.js` if present, else the inline `<script>` in `index.html`, so the same tests run before and after the split.

Visual/behavioral QA still needs a real browser — **hard-reload** (or enable DevTools "Update on reload") so the service worker doesn't keep serving a stale cached `index.html`.

## Shipping changes — bump the service-worker cache

`service-worker.js` caches the app shell under `CACHE_VERSION` (check the constant in that file for the current value). Because it caches `index.html`/`css`/`js`, **clients keep running the old code until the cache name changes.** Whenever you change any app file (`index.html`, `css/styles.css`, `js/*.js`), bump `CACHE_VERSION`. If you add a new static file, also add it to `CORE_ASSETS`.

## Architecture

**Single global `state` object + full re-render.** All UI state lives in one `state` object (`js/core.js`). `render()` (`js/screens.js`) is the only thing that paints the screen: it builds an HTML string and assigns it to `#app`'s `innerHTML` — no virtual DOM, no diffing, the whole screen is replaced. After mutating `state`, call `render()`.

`render()` routing is **priority-ordered**: full-screen overlays are checked first (1RM list → coach memory → weekly review → plateau → coach chat → stretch guide → completed session → warmup guide → active workout session → cardio RPE → cardio session); only if none are open does it switch on `state.currentTab` (`home`/`workout`/`running`/`stats`/`more`, unknown ids fall back to `home`) and append the tab bar. Each screen has a `renderX()` function returning an HTML string. Event handlers are wired through inline `onclick="..."` attributes that call global functions.

**Persistence: `localStorage` via the `storage` wrapper.** `storage.get/set` (`js/core.js`) JSON-serialize to keys defined in the `KEYS` map (all prefixed `fitness_`). `init()` (defined in `js/core.js`, called at the tail of `js/screens.js`) loads everything into `state` on startup and seeds demo data (`generateDemoData`) on first run. The active workout session, rest timer, and routine-builder wizard are persisted separately (`saveActiveSession`, `saveRestTimer`, `saveWizard`) so they survive backgrounding/refresh.

The user's tracked data lives in `state.data`: `workoutLog`, `cardioLog`, `personalRecords`, `bodyLog`, `conditionLog`, `cycleHistory`.

**Static data tables (`js/data.js`):**
- UI icons: `ICONS` — 31 inline SVGs. **UI must use these, never emoji** (see 디자인 규칙 below).
- Workout templates & body-part analysis: `SESSIONS`, `EXERCISE_BODY_PART_MAP`, `EXERCISES_BY_PRIMARY`, `BODY_PART_GROUPS`, `WEAK_PART_EXERCISE_MAP`, `BODY_PART_KR`.
- Set schemes / rest / supersets: `SET_SCHEMES`, `SET_ROLE_KR`, `REST_*`, `SUPERSET_*`.
- Safety & coaching knowledge: `INJURY_AREAS`, `EXERCISE_SAFETY`, `COACH_KNOWLEDGE`, `WALK_PRESCRIPTION`, `MOBILITY_DRILLS`.

**Progressive-overload / 1RM engine:** `calculate1RM`, `get1RM` / `update1RM`, `getProgressiveRecommendation`, `suggestWorkingWeight`, `estimate1RMFromPart`, `initializeOneRMData`. This drives the weight recommendations (#11 switched these from a fixed scheme to progressive overload).

**Dates are KST-based.** `getTodayStr` / `getDateStr` apply a +9h offset so the "day" rolls over at Korean midnight, not UTC. Use these helpers (not raw `new Date()`) for anything day-bucketed — weekly counts, "today" filters, etc. Several past bugs (#9, #10) came from timezone edges.

## AI integration

The app calls the Anthropic Messages API **directly from the browser**: `POST https://api.anthropic.com/v1/messages` with headers `x-api-key`, `anthropic-version`, and `anthropic-dangerous-direct-browser-access: true`. The user pastes **their own** API key, stored in `localStorage` (`fitness_api_key`); there is no proxy/backend.

Model selection by task:
- `claude-haiku-4-5` — fast/cheap signal extraction from the in-session chat (`extractWorkoutSignals`).
- `claude-sonnet-5` — everything heavier: routine generation (`generateFullRoutine`, `modifyRoutineWithAI`), daily recommendation (`fetchAIRecommendation`), coach chat (`callCoachAPI`, built from `getCoachSystemPrompt` + `buildUserContext`), weekly review (`generateWeeklyReview`), plateau analysis (`analyzePlateauWithAI`), cardio plan generation.

AI results are cached in `localStorage` and reused while fresh — daily recommendation (same `getTodayStr()`), weekly review (same `getWeekId()`), plateau check (within 3 days). The `load…IfNeeded` functions gate whether to hit the API again.

## 디자인 규칙 (감사 후 확정 — docs/research/design-audit.md §5)

새 화면·문구를 쓸 때 이 규칙을 따른다. 테스트가 일부를 실제로 막는다(`디자인 규칙 —` 로 시작하는 테스트).

**이모지**
1. 기본 UI에 이모지를 쓰지 않는다. 아이콘이 필요하면 `ICONS` 31종에서 고른다 (`icon('trophy', 16)`).
2. 아이콘 세트에 없으면 **아이콘 없이 글자만** 쓴다. 새 이모지를 넣지 않는다.
3. 경고·주의는 ⚠️ 대신 **`var(--warn)` 색 + `info` 아이콘**.
4. 축하 연출은 화면당 1개까지.
   (AI 프롬프트 문자열(`js/ai.js`·`js/data.js`의 지식 블록)은 화면이 아니라 예외다.)

**색**
1. `--accent`(주황) · `--warn`(앰버) · `--danger`(빨강) · `--success`(초록) · `--purple` 만 쓴다.
   JS·CSS에 `#RRGGBB` 를 직접 적지 않는다(`css/styles.css` `:root` 정의만 예외).
2. 주황은 "지금 눌러야 할 버튼 1개 + 지금 중요한 숫자 1개"까지. 라벨·부연·목록 숫자에는 쓰지 않는다.
3. 목록 전체를 같은 색으로 칠하지 않는다.
4. 화면당 강조색 글자 6개 이하를 목표로 한다.

**문구·크기**
1. **해요체로 통일.** "…합니다/…됩니다"를 섞지 않는다.
2. 한 문장 40자 이내, 안내는 카드당 1줄. 더 필요하면 `noteBlock(요약, 자세히)` 로 접는다(네이티브 `<details>` — 재렌더 없음).
3. 앱이 자기 행동을 설명하지 않는다("도와드릴게요", "표시합니다" 금지). 사용자가 할 일만 적는다.
4. 느낌표·칭찬 수식어를 쓰지 않는다. 칭찬은 사실로 대신한다("3세트 완료").
5. 예시는 본문에 쓰지 않는다. 퀵칩이나 입력칸 placeholder로 보여준다.
6. **잔글씨 하한은 11px**(`text-[11px]`). 탭바·단위 첨자만 10px.
7. 같은 사실을 두 화면·두 카드에서 반복하지 않는다.

## Conventions

- Commit subjects: short imperative, English, ending with the PR number — e.g. `Fix exercise GIF lookup with fuzzy token matching (#4)`. Changes land via PRs against `main`.
- User-facing copy is Korean; code identifiers and comments are mixed Korean/English.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues (`github.com/ironbro205/fitness-exercises`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`); none are created in the repo yet. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root (not created yet — produced lazily by `/grill-with-docs`). See `docs/agents/domain.md`.

## Code map (post-split)

Plain scripts loaded in this order (later files may call earlier ones; the tail of `screens.js` runs `init()`):

```
index.html      → HTML shell + <link> + 5 <script src> tags
css/styles.css  → all styles
js/data.js      → static tables: ICONS(31 SVG), DEFAULT_PROFILE, MEMORY_CATEGORY_META,
                  INITIAL_1RM, EXERCISE_ALIASES_1RM, SESSIONS, GYM_EQUIPMENT,
                  EXERCISE_BODY_PART_MAP, EXERCISES_BY_PRIMARY, SET_SCHEMES, REST_*,
                  INJURY_AREAS, EXERCISE_SAFETY, COACH_KNOWLEDGE, WALK_*, MOBILITY_*,
                  BODY_PART_* maps
js/core.js      → KEYS, storage, state, save*/clearWizard, generateDemoData, KST date utils,
                  helpers (icon/showToast/renderMarkdown), init()
js/domain.js    → pure logic: 1RM / progressive overload, set schemes, volume & balance
                  analysis, cardio progression, display-order helpers (sortByDateDesc)
js/bodymap.js   → 자극 근육 인체도: 앞/뒤 전신 SVG(자체 제작 원본) + 근육키→영역 매핑,
                  buildMuscleMapSvg / buildMuscleMapBlock (순수 함수) — docs/muscle-map-assets.md
js/ai.js        → buildUserContext, prompts, all Anthropic API calls + load…IfNeeded gates
js/screens.js   → renderX() builders + render() + window.* onclick handlers +
                  workout-session logic + swipe/touch init + the init() call (load tail)
```

Each `js/*.js` begins with `'use strict'` (the original was one strict script — preserve this). When adding a new static file, add it to `service-worker.js` `CORE_ASSETS` and bump `CACHE_VERSION`. The split was pure code movement (line-for-line identical, just regrouped); classification is for navigation only.

## 하네스: 헬스앱

**목표:** 비개발자가 헬스앱(개인용 피트니스 PWA)에 기능을 안전하게 계속 추가·배포하도록 돕는 작업 체계.

**트리거 (요청 → 스킬):**
- 새 기능·화면 추가, 기능 큰 변경, 리메이크 → `healthapp-feature`
- AI 동작(코치 말투·루틴·리뷰·정체기) 프롬프트 수정 → `healthapp-ai-prompt`
- 배포·출시·"폰에 반영"·캐시 버전 올리기 → `healthapp-deploy`
- 모든 코드 작업의 완료 조건 → `.claude/QA_CHECKLIST.md`
- 단순 질문·설명·사소한 한 줄 수정은 스킬 없이 직접 응답.

**실행 원칙 (전역 규칙 우선):** 구현은 **메인 Claude 직접도, `Workflow` 도구·서브에이전트 병렬 위임도 자유**(울트라코드 우선). `Workflow`는 완료를 스스로 추적하므로 옛 Stop hook 버그(#33049)에 영향받지 않는다 — 추적 안 되는 background plain executor 직접 spawn만 피한다. 외부 리뷰는 Codex가 담당. 새 기능·다중 파일 수정·배포는 **dev-pipeline** 게이트를 거친다.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-13 | 초기 구성 (스킬 3 + QA 체크리스트 + 분리 목표 구조) | `.claude/skills/healthapp-*`, `.claude/QA_CHECKLIST.md`, `CLAUDE.md` | 비개발자용 헬스앱 작업 하네스 |
| 2026-06-13 | index.html 분리 완료 (CSS + JS 5파일, 빌드 없음) | `index.html`, `css/`, `js/`, `service-worker.js`, `tests/` | 단일 11k줄 → 탐색·수정 쉬운 구조 |
