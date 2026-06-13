---
name: healthapp-feature
description: "헬스앱(이 저장소, fitness-exercises)에 새 기능·화면을 추가하거나 기존 기능을 크게 바꾼다. 어떤 파일/섹션을 고치고, render() 화면 라우팅·전역 state·localStorage 저장에 어떻게 연결하며, 서비스워커 캐시·QA·배포까지 dev-pipeline에 맞춰 안내한다. '새 기능', '기능 추가', '화면 추가', '운동/영양 기능 만들어', '~기능 넣어줘', '리메이크', '이것도 다시', '기능 개선' 요청 시 반드시 사용. 텍스트 오타·색상 같은 사소한 한 줄 수정이나 단순 질문에는 사용하지 않는다."
---

# 헬스앱 새 기능 추가

헬스앱에 기능을 더할 때의 길잡이. **이 작업은 dev-pipeline 하드 게이트 대상이다** — 반드시 dev-pipeline(계획→구현→검증)으로 진행한다. UI가 포함되면 **구현 전에 UI 요구사항 목록을 뽑아 사용자 확인**부터 받는다(전역 규칙).

## 헬스앱이 동작하는 방식 (먼저 이해)

- 전역 객체 **`state`** 하나에 모든 화면 상태가 있다. 상태를 바꾼 뒤 **`render()`**를 부르면 화면 전체가 다시 그려진다(가상 DOM 없음, `#app`의 innerHTML 교체).
- **`render()`는 우선순위 라우팅**이다: 전체화면 오버레이(1RM·주간리뷰·정체기·코치챗·음식입력·완료·진행세션)를 먼저 확인하고, 없으면 `state.currentTab`(home/workout/fuel/stats/more)으로 분기 + 탭바.
- 영속 데이터는 **`localStorage`** — `storage.get/set` + `KEYS` 맵(접두사 `fitness_`)으로 다룬다. `init()`이 시작 시 전부 불러온다.
- 이벤트는 대부분 인라인 `onclick="전역함수()"`로 연결돼 있다.

## 어디를 고치나 (분리 후 구조 기준 — `js/` 파일들)

| 추가하려는 것 | 고칠 파일/위치 |
|---|---|
| 새 고정 데이터(음식·운동·세션 템플릿·부위맵) | `js/data.js` |
| 새 상태값 / 새 저장 항목 | `js/core.js` — `state`에 필드 추가, `KEYS`에 키 추가, 저장/복원 연결 |
| 순수 계산 로직(1RM·볼륨·분석·음식 파싱) | `js/domain.js` |
| 새 AI 호출/프롬프트 | `js/ai.js` (→ `healthapp-ai-prompt` 스킬 참고) |
| 새 화면 | `js/screens.js` — `renderX()` 추가 + `render()` 분기/탭바에 연결 |

> 아직 분리 전이라면 위 구분은 `index.html` 한 파일 안의 해당 섹션을 가리킨다(`CLAUDE.md`의 함수 지도 참고).

## 새 화면을 추가하는 표준 연결 (가장 흔한 케이스)

1. `state`에 화면 플래그/데이터 필드 추가 (예: `myFeatureOpen: false`).
2. `renderMyFeature()` 작성 — HTML 문자열을 반환.
3. `render()`에 분기 추가 — 오버레이면 우선순위 위치에, 탭이면 `switch(state.currentTab)`와 `renderTabbar()`에.
4. 진입/이탈 버튼을 `onclick`으로 연결, 상태 바꾼 뒤 `render()` 호출.
5. 영속이 필요하면 `KEYS`에 키 추가 + `storage.set` 저장 + `init()`에서 복원.

## 마무리 (빠뜨리면 미완성)

- **구현은 메인 Claude가 직접** 한다(executor 위임 금지 — 전역 규칙). 읽기전용 탐색은 `Explore`, 리뷰는 Codex로.
- 구현 직후 **Codex 리뷰** → needs-attention이면 수정·재리뷰.
- **`.claude/QA_CHECKLIST.md`**로 수동 QA. 새 파일을 만들었으면 `index.html` 연결 + 서비스워커 `CORE_ASSETS` 추가.
- 내보낼 때는 **`healthapp-deploy` 스킬**(캐시 버전 +1 → PR → 병합 → Vercel)로.
