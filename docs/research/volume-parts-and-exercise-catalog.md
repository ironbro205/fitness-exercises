> 작성: 2026-08-25 · 사용자 제보 #5·#6·#7 조사 결과. 반영 상태는 커밋 로그 참조.

# 주간 볼륨 부위 정리 + 빠진 종목 보충

## 1) 한 줄 요약

사용자 제보 **"AI가 이두 추천에 자꾸 바벨 리버스컬만 준다"(#5)** 와 **"주간 볼륨에 전완·요추가 왜 있나"(#6)** 는 **같은 원인**이었다. 전완·요추를 볼륨 부위에서 빼면 둘 다 사라진다. 겸사겸사 카탈로그의 빈 칸(#7)도 채웠다.

## 2) 원인 — 볼륨 오탐이 프롬프트를 오염시켰다

`이지 바 리버스 컬`은 데이터상 이두가 아니라 **전완 종목**이다(`primary: 'forearms'`). 그런데 전완은 직접 종목이 앱 전체에 이것 하나뿐이라 주간 볼륨이 구조적으로 항상 목표 미달이었다. `buildUserContext`는 부족 부위마다 권장 종목을 붙여 주므로, **모든 AI 호출**(코치 채팅·루틴 생성·루틴 수정·오늘의 추천·정체기 분석)의 프롬프트에 아래 두 줄이 매번 실렸다:

```
- 전완 (주2.3세트) — 목표 8세트까지 5.8세트 더 → 권장 종목: 이지 바 리버스 컬, 덤벨 해머 컬
- 요추 (주1.5세트) — 목표 8세트까지 6.5세트 더 → 권장 종목: 바벨 루마니안 데드리프트
```

게다가 코치 채팅 프롬프트에는 종목 목록이 **하나도** 들어가지 않았다. 모델 입장에서 프롬프트 안에 등장하는 유일한 팔 종목 이름이 리버스 컬이었으니, 이두를 물어도 그것을 답한 것이다.

## 3) 결정과 근거

### 요추(척추기립근) — 볼륨 부위에서 제외

- 앱에 **직접 종목이 0개**다. `WEAK_PART_EXERCISE_MAP`조차 `'바벨 루마니안 데드리프트(햄스트링 보조 자극)'`라 적어 직접 종목이 없음을 스스로 인정하고 있었다. 막대는 언제나 간접 0.5 환산분뿐이라 영구 "부족"이다.
- 척추기립근은 스쿼트·데드리프트에서 **사실상 등척성으로 버티는 역할**이고, 등척성 수축은 근비대·동적 근력 자극으로는 약하다.
- RP(Renaissance Periodization) 등 널리 쓰이는 볼륨 랜드마크 표에 **별도 부위로 들어가지 않는다**. 표가 다루는 부위는 가슴·등·승모·전/측/후면 삼각근·이두·삼두·전완·복근·대퇴사두·햄스트링·둔근·종아리다.

### 전완 — 볼륨 부위에서 제외

- RP는 전완을 **정식 부위로 다룬다**(전용 가이드와 랜드마크가 있다). 그래서 "부위가 아니다"는 틀린 말이다.
- 다만 같은 가이드가 **"중립·회내 그립 당기기가 이미 프로그램에 있으면 주 1회 해머/리버스컬만으로 브라키오라디알리스가 MEV~MRV 구간에 들어간다"**고 본다 — 별도 추적의 이득이 작다.
- 이 앱은 직접 종목이 1개뿐이라 실제로는 추적이 아니라 **영구 오탐 생성기**로 동작했다. 1인 비선수 사용자 기준으로 "근거가 뒷받침하는 가장 단순한 안"은 세지 않는 쪽이다.

**두 부위 모두 자극 인체도(`js/bodymap.js`)와 `BODY_PART_KR`에는 그대로 둔다** — 어느 근육이 쓰이는지는 계속 보여주되, 주간 세트로 세지 않는다.

### 리버스 컬은 이두 종목이 아니다

회외(supination)가 빠지면 상완이두 활성이 떨어진다. EMG 비교에서 **전통(회외) 컬 > 해머 컬 > 리버스 컬** 순으로 상완이두가 쓰이며, 리버스 컬에서 두드러지는 것은 상완요골근과 상완근이다. 이두 근비대가 목적이면 회외 컬이 먼저다. 그중 **인클라인 덤벨 컬**은 어깨가 신전된 자세라 장두가 늘어난 위치에서 부하를 받아 근위부 성장에 유리하다(프리처 컬과 비교한 실험에서 근위부 두께 증가가 더 컸다).

→ 코치 프롬프트에 부위별 종목 목록(`buildExerciseCatalogBlock`)을 주입하고, "노린 근육을 주동근으로 쓰는 종목을 먼저 고른다"는 규칙과 함께 이 사례를 예시로 박아 두었다.

## 4) 채운 빈 칸 (#7)

| 추가 종목 | 부위 | 왜 |
|---|---|---|
| 라잉 트라이셉스 익스텐션(별칭 스컬크러셔) | 삼두 | 사용자 지목. **프리웨이트 삼두 고립이 앱에 하나도 없었다** — 삼두 고립 3종이 전부 케이블이라 케이블 타워가 붐비면 대체가 없었다 |
| 덤벨 오버헤드 트라이셉스 익스텐션 | 삼두 | 같은 이유. 오버헤드는 장두가 가장 늘어난 자세다 |
| 덤벨 컬 | 이두 | 가장 기본형이 없었다(얼터네이트·인클라인·컨센트레이션만 있었음) |
| 바벨 벤치 프레스(플랫) | 가슴 | 헬스장에서 가장 유명한 종목인데 표에 없었다. 사용자가 평벤치 보유 확인 |
| 바벨 오버헤드 프레스 | 어깨 전면 | 스미스 버전만 있었다. `getExercisePart`에 이름 폴백만 있고 정작 종목표엔 없어, AI가 추천하면 부위 판정이 퍼지 매칭으로 넘어갔다 |
| 바벨 슈러그 | 승모근 | 덤벨·스미스·케이블만 있었다 |

**삼두 신장 강조 근거:** Maeo 등(2022) 12주 편측 비교 — 오버헤드 신전이 푸시다운보다 장두 **+28.5% vs +19.6%**, 예상 밖으로 외측·내측두도 **+14.6% vs +10.5%** 더 컸다. 장두는 어깨를 함께 지나는 두 관절 근육이라 팔을 머리 위로 들수록 길어진다. 신장 강조의 정도는 **오버헤드 > 라잉 > 푸시다운** 순이며, 그래서 `WEAK_PART_EXERCISE_MAP.triceps`도 이 순서로 다시 세웠다.

> 단서: 신장 강조의 효과 크기 자체는 크지 않고 논쟁적이다(`docs/ai-routine-improvement-plan.md` §3-⑥ 참고). 종목 배치의 **저비용 헤지**로만 쓰고, 사용자에게 단정해 말하지 않는다.

## 5) 종목을 새로 넣을 때 함께 손댈 표

하나라도 빠지면 테스트가 잡는다.

1. `EXERCISE_BODY_PART_MAP` (`js/data.js`) — `equipment` 태그 필수
2. `EXERCISE_SAFETY` — 부상별 금기/주의·대체·수정법·이유
3. `renderOneRMList`의 `categories` (`js/screens.js`) — 여기 없으면 1RM 화면에 영원히 안 보인다
4. 흔히 쓰는 다른 이름이 있으면 `EXERCISE_ALIASES_1RM` **와** `EXERCISE_BODY_PART_MAP` 양쪽에 (교체 검색이 종목표를 훑기 때문)
5. `tests/golden-symbols.json` — 새 전역 함수를 만들었을 때만

`EXERCISES_BY_PRIMARY`는 자동 파생이라 손댈 필요가 없다.

## 6) 출처

- Renaissance Periodization — [Training Volume Landmarks for Muscle Growth](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth), [Forearm Training Guide](https://rpstrength.com/blogs/articles/forearm-hypertrophy-training-tips)
- Maeo et al. (2022) — [Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position](https://www.tandfonline.com/doi/full/10.1080/17461391.2022.2100279) (Eur J Sport Sci) · [Stronger by Science 해설](https://www.strongerbyscience.com/research-spotlight-triceps/)
- 컬 그립별 근활성 — [Biceps Brachii and Brachioradialis Excitation in Biceps Curl Exercise: Different Handgrips, Different Synergy](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10054060/) (2023)
- 이두 신장 위치 — [The new science of how to maximize biceps growth (Menno Henselmans)](https://mennohenselmans.com/the-new-science-of-how-to-maximize-biceps-growth/)
- 척추기립근의 등척성 역할 — [Lower Back Training for Athletes (SimpliFaster)](https://simplifaster.com/articles/lower-back-strength-training-athletes/)
