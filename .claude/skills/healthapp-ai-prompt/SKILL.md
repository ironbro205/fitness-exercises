---
name: healthapp-ai-prompt
description: "헬스앱(이 저장소, fitness-exercises)의 AI 동작 — 코치 채팅 말투, 음식 분석 정확도, 루틴 생성, 주간 리뷰, 정체기 분석 — 을 좌우하는 프롬프트를 안전하게 수정·튜닝한다. 프롬프트가 어느 함수에 있는지, 어떤 모델(haiku/sonnet)을 쓰는지, 바꾼 뒤 실제 API로 어떻게 검증하는지 안내한다. 'AI 말투 바꿔', '코치 응답', '음식 분석이 틀려', '루틴 더 잘 짜게', '프롬프트 수정', '프롬프트 튜닝', 'AI 응답 개선', '다시 프롬프트 손봐' 요청 시 반드시 사용. AI와 무관한 일반 UI·로직 수정에는 사용하지 않는다."
---

# 헬스앱 AI 프롬프트 튜닝

헬스앱은 **브라우저에서 직접 Anthropic API**를 호출한다(`api.anthropic.com/v1/messages`, 헤더 `x-api-key` + `anthropic-dangerous-direct-browser-access: true`). 사용자가 **자기 API 키**를 입력해 쓴다(별도 백엔드 없음). 분리 후 이 코드는 `js/ai.js`에 모인다(분리 전엔 `index.html`의 해당 함수들).

## 프롬프트가 사는 곳

| AI 기능 | 함수 | 모델 |
|---|---|---|
| 코치 채팅 (말투·성격) | `getCoachSystemPrompt`, `callCoachAPI` | sonnet |
| AI에 넘기는 사용자 맥락 | `buildUserContext` | (입력 데이터) |
| 음식 분석 | `analyzeFoodWithAI` | **haiku** (빠르고 저렴) |
| 루틴 생성/수정 | `generateFullRoutine`, `modifyRoutineWithAI` | sonnet |
| 오늘의 추천 | `fetchAIRecommendation` | sonnet |
| 주간 리뷰 | `generateWeeklyReview` | sonnet |
| 정체기 분석 | `analyzePlateauWithAI` | sonnet |

> 말투/성격을 바꾸려면 보통 `getCoachSystemPrompt`를, "AI가 내 상황을 잘 모른다"면 `buildUserContext`(AI에 넘기는 데이터)를 손본다. 둘은 다른 문제다.

## 안전하게 바꾸는 원칙

- **프롬프트 문구(텍스트)만 바꾸고, API 구조는 건드리지 않는다** — 모델 id, 헤더, 요청 형식은 의도하지 않으면 그대로 둔다.
- **출력은 한국어 유지** — 앱이 한국어이므로 프롬프트도 한국어 응답을 지시해야 한다.
- **모델 선택 존중** — 음식 분석은 haiku(대량·저비용), 무거운 추론은 sonnet. 비용/품질 트레이드오프를 바꿀 때만 모델을 바꾼다.
- JSON 응답을 파싱하는 기능(음식·루틴)은 **출력 형식 지시를 깨지 않도록** 주의 — 형식이 틀어지면 파싱이 실패한다.

## 바꾼 뒤 검증 (필수)

프롬프트는 "고쳤다"로 끝나지 않는다. **실제로 더 나아졌는지 확인**해야 한다:

1. 대표적인 입력 1~3개를 정한다 (예: 음식 분석이면 "닭가슴살 200g과 현미밥 한 공기").
2. 실제 API 키로 호출해 **바꾸기 전/후 응답을 비교**한다.
3. 의도한 개선(더 정확/더 친절/더 짧게 등)이 보이고, 형식이 안 깨졌는지 본다.
4. 만족할 때까지 문구를 다듬어 반복한다. (캐시된 결과 때문에 옛 응답이 보이면 새로 호출되게 한다 — 일·주 단위 캐시 키 참고.)

## 마무리

- 구현은 메인 Claude 직접 또는 위임(필요 시 `Workflow`) → **Codex 리뷰** → **`.claude/QA_CHECKLIST.md`의 "AI 기능 변경 시" 항목**(실제 호출 1회) → **`healthapp-deploy`**로 출시.
- 다만 프롬프트 수정은 대개 단일 파일(`js/ai.js`)이라 메인 Claude 직접이 더 빠를 때가 많다. Codex 리뷰·배포 게이트는 어느 경로든 그대로 거친다.
