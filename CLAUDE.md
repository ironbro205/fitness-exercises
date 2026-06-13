# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

헬스앱 ("Health App") — a Korean-language, mobile-first **AI fitness coach PWA**. It tracks workouts, nutrition, and body metrics, and uses the Anthropic API for food analysis, routine generation, a coach chat, weekly reviews, and plateau detection.

The entire application is **one file**: `index.html` (~11k lines). There is no build step, no framework, no package manager, no automated tests, and no backend in this repo.

## Repository layout

- `index.html` — the whole app. The `<style>` block (~lines 25–2886) holds all CSS; a single `<script>` block (~lines 2891–11152) holds all JS (plain ES5-style `var`/function declarations, no modules/imports).
- `service-worker.js` — offline caching (Network-First).
- `manifest.json` — PWA manifest (standalone, portrait, Korean).
- `icon-*.png` — PWA icons.

## Running & testing

No build step. The app needs a real HTTP origin (service worker + PWA do not work from `file://`):

```
python3 -m http.server 8000   # then open http://localhost:8000
```

Logic regression is guarded by **zero-dependency characterization tests** — run with:

```
node --test tests/characterization.test.mjs
```

(the bare-directory `node --test tests/` form is unreliable in this environment — name the file). The harness (`tests/_harness.mjs`) loads the app's JS in a Node `vm` with a stub DOM, then golden-master-checks the pure functions (1RM, food parsing, GIF fuzzy-match) and asserts no global function/data table went missing (`tests/golden-symbols.json`). It auto-loads `js/*.js` if present, else the inline `<script>` in `index.html`, so the same tests run before and after the split.

Visual/behavioral QA still needs a real browser — **hard-reload** (or enable DevTools "Update on reload") so the service worker doesn't keep serving a stale cached `index.html`.

## Shipping changes — bump the service-worker cache

`service-worker.js` caches assets under `CACHE_VERSION` (currently `health-app-v12`). Because it caches `index.html` itself, **clients keep running the old code until the cache name changes.** Whenever you change `index.html`, bump `CACHE_VERSION` in `service-worker.js` (established step — see commit #1, "bump SW cache").

## Architecture

**Single global `state` object + full re-render.** All UI state lives in one `state` object (~line 3097). `render()` (~line 10854) is the only thing that paints the screen: it builds an HTML string and assigns it to `#app`'s `innerHTML` — no virtual DOM, no diffing, the whole screen is replaced. After mutating `state`, call `render()`.

`render()` routing is **priority-ordered**: full-screen overlays are checked first (1RM list → weekly review → plateau → coach chat → food input → completed session → active workout session); only if none are open does it switch on `state.currentTab` (`home`/`workout`/`fuel`/`stats`/`more`) and append the tab bar. Each screen has a `renderX()` function returning an HTML string. Event handlers are wired through inline `onclick="..."` attributes that call global functions.

**Persistence: `localStorage` via the `storage` wrapper.** `storage.get/set` (~line 2920) JSON-serialize to keys defined in the `KEYS` map (all prefixed `fitness_`). `init()` (~line 10965) loads everything into `state` on startup and seeds demo data (`generateDemoData`) on first run. The active workout session, rest timer, and routine-builder wizard are persisted separately (`saveActiveSession`, `saveRestTimer`, `saveWizard`) so they survive backgrounding/refresh.

The user's tracked data lives in `state.data`: `workoutLog`, `nutritionLog`, `personalRecords`, `bodyLog`, `conditionLog`.

**Static data tables (in-file constants):**
- Food parsing: `FOOD_DB`, `FOOD_ALIASES`, `AMOUNT_PATTERNS` → `analyzeFoodInput` / `normalizeFood` / `extractAmount`. Ambiguous input falls through to the AI (see commit #8).
- Exercise media: `EXERCISE_GIFS` (Korean exercise name → external GIF URL). `findExerciseGif` does exact match, then **fuzzy token matching** so AI-generated name variants still resolve (#4).
- Workout templates & body-part analysis: `SESSIONS`, `EXERCISE_BODY_PART_MAP`, `BODY_PART_GROUPS`, `WEAK_PART_EXERCISE_MAP`, `BODY_PART_KR`.

**Progressive-overload / 1RM engine:** `calculate1RM`, `get1RM` / `update1RM`, `getProgressiveRecommendation`, `suggestWorkingWeight`, `estimate1RMFromPart`, `initializeOneRMData`. This drives the weight recommendations (#11 switched these from a fixed scheme to progressive overload).

**Dates are KST-based.** `getTodayStr` / `getDateStr` apply a +9h offset so the "day" rolls over at Korean midnight, not UTC. Use these helpers (not raw `new Date()`) for anything day-bucketed — weekly counts, "today" filters, etc. Several past bugs (#9, #10) came from timezone edges.

## AI integration

The app calls the Anthropic Messages API **directly from the browser**: `POST https://api.anthropic.com/v1/messages` with headers `x-api-key`, `anthropic-version`, and `anthropic-dangerous-direct-browser-access: true`. The user pastes **their own** API key, stored in `localStorage` (`fitness_api_key`); there is no proxy/backend.

Model selection by task:
- `claude-haiku-4-5` — fast/cheap food analysis (`analyzeFoodWithAI`).
- `claude-sonnet-4-5` — everything heavier: routine generation (`generateFullRoutine`, `modifyRoutineWithAI`), daily recommendation (`fetchAIRecommendation`), coach chat (`callCoachAPI`, built from `getCoachSystemPrompt` + `buildUserContext`), weekly review (`generateWeeklyReview`), plateau analysis (`analyzePlateauWithAI`).

AI results are cached in `localStorage` and reused while fresh — daily recommendation (same `getTodayStr()`), weekly review (same `getWeekId()`), plateau check (within 3 days). The `load…IfNeeded` functions gate whether to hit the API again.

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

## Planned file structure (split target — NOT done yet)

`index.html` will be split into plain static files (no build step), loaded in order. **Until that refactor lands, these names refer to sections _inside_ `index.html`**; the `healthapp-feature` skill maps work to them.

```
index.html        → HTML shell: <head>, css/js links, <div id="app">, <script> tags in load order
css/styles.css    → all styles (was the <style> block)
js/data.js        → static tables: ICONS, DEFAULT_PROFILE, FOOD_DB, FOOD_ALIASES, AMOUNT_PATTERNS, EXERCISE_GIFS, SESSIONS, body-part maps
js/core.js        → KEYS, storage, state, save*/clearWizard, generateDemoData, KST date utils, helpers (icon/showToast/renderMarkdown), init()
js/domain.js      → pure logic: food parsing, 1RM / progressive overload, exercise GIF lookup, volume & balance analysis
js/ai.js          → buildUserContext, prompts, all Anthropic API calls
js/screens.js     → all renderX() builders + render() + workout-session logic + swipe/touch init
```

Load order: data → core → domain → ai → screens (`screens` runs `init()` last). When splitting: add the new files to `service-worker.js` `CORE_ASSETS` and bump `CACHE_VERSION`.

## 하네스: 헬스앱

**목표:** 비개발자가 헬스앱(개인용 피트니스 PWA)에 기능을 안전하게 계속 추가·배포하도록 돕는 작업 체계.

**트리거 (요청 → 스킬):**
- 새 기능·화면 추가, 기능 큰 변경, 리메이크 → `healthapp-feature`
- AI 동작(코치 말투·음식 분석·루틴·리뷰·정체기) 프롬프트 수정 → `healthapp-ai-prompt`
- 배포·출시·"폰에 반영"·캐시 버전 올리기 → `healthapp-deploy`
- 모든 코드 작업의 완료 조건 → `.claude/QA_CHECKLIST.md`
- 단순 질문·설명·사소한 한 줄 수정은 스킬 없이 직접 응답.

**실행 원칙 (전역 규칙 우선):** 구현은 **메인 Claude가 직접** 한다(executor/팀 위임 금지). 외부 리뷰는 Codex가 담당. 읽기전용 탐색·분석만 기존 에이전트(`Explore`, `code-reviewer` 등)를 활용. 새 기능·다중 파일 수정·배포는 **dev-pipeline** 게이트를 거친다. 이 하네스는 구현을 위임하는 오케스트레이터를 두지 않는다.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-13 | 초기 구성 (스킬 3 + QA 체크리스트 + 분리 목표 구조) | `.claude/skills/healthapp-*`, `.claude/QA_CHECKLIST.md`, `CLAUDE.md` | 비개발자용 헬스앱 작업 하네스 |
