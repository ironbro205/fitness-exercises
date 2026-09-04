# PR #72 최종 리뷰 (3차) — 커밋 752ad63 반영 후

- 대상: `ironbro205/setscheme-recalc` (ed6856f + 7f13247 + **752ad63**), base `main`(a83e2e3)
- 방법: **`/code-review max 72`**(15건 보고 + 추가 5건) + 워커 독립 정독 · **실행 재현**
  (리뷰 워크트리에서 `tests/_harness.mjs` 위 probe 10본. PR 작업 트리는 건드리지 않음)
  두 결과를 병합·중복 제거하고, **워커가 재현하지 못한 항목은 조건을 다시 잡아 재확인한 뒤** 아래 18건으로 정리했다.
- 테스트 기준선 재확인: **11개 파일 440/440 녹색**. `CACHE_VERSION` v59 유지(미배포·신규 정적 파일 없음) — 정상.
  golden-symbols 443 → **459**(신규 16 · 삭제 0, 산술 일치).
- **아래 18건 중 어느 것도 440건 테스트에 걸리지 않는다.**

## 결론: 머지 보류

설계 전환 자체는 성공했다. 2차 17건 중 **15건이 실측으로 닫혔고**, 역산 채널이 만들던 감량·래칫·
디로드 소실이 전부 사라졌다. 문제는 그 자리에 들어온 **탑세트 무게 입력 시트**다.
시트가 ①대상 종목을 확정하지 않고 ②세션이 지금 쓰는 무게와 안전 게이트를 보지 않아서,
**High 5건 중 4건이 "엉뚱한 무게를 엉뚱한 종목에 처방"** 한다. 전부 국소 수정으로 닫힌다(§7).

---

# 1. High

## H1 통증 게이트를 우회해 증량한다 — 확인 한 번
`js/domain.js:609 recentTopWeight` · `js/screens.js:2407 topSetPrefill` · `js/screens.js:3316 라벨`

`recentTopWeight` 는 최근 4세션의 실측 최대만 본다. **`hasRecentPain` 을 보지 않는다.**
그래서 통증으로 증량이 잠긴 종목에서도 "통증 이전 세션의 무게"가 프리필로 올라온다.

```
벤치 프레스 — 3일 전 세션에 painFlag, 12일 전 95kg×6
  엔진 판정 : maintain 80kg · painGated:true → 카드 '통증 — 증량 보류' [warn] 80
  '탑세트' 탭 → 시트 프리필 95  ('최근 4세션에서 가장 무겁게 든 무게예요')
  '확인'      → [top 95, backoff 85, backoff 85]   토스트 '탑세트로 바꿨어요 — 탑 95kg'
  카드        → '통증 — 증량 보류' [warn]  80 → 95      ← 증량을 말리면서 증량을 그린다
```
라벨 체인(`3316`)이 `painGated` 를 `heavier` 보다 먼저 보기 때문에 경고 문구와 증량 화살표가 같이 뜬다.
저장소 원칙(근거 기반 진행·안전 게이트)을 UI 한 번으로 넘는 경로다.

## H2 시트가 **대상 종목을 못박지 않는다** — 스와이프 한 번이면 다른 종목이 바뀐다
`js/screens.js:7674-7685`(스와이프 가드) · `js/screens.js:2486 confirmTopSetWeight` · `2312 applySchemeToSession`

document 레벨 touchend 가드는 `editingSet · exerciseSwapOpen · exerciseMenuOpen · setSchemeOpen ·
completedSession · itemDetailSheet · resetConfirming · muscleMapZoom · stretchGuide` 를 전부 나열하는데
**`state.topSetSheet` 만 빠졌다.** `goToExercise` 도 시트를 닫지 않고, `confirmTopSetWeight` 는
열 때 잡아 둔 종목이 아니라 `currentSessionExercise()` 를 **다시 읽는다**.
(휴식 타이머 가드 2곳(`2106`·`2116`)에는 `topSetSheet` 를 제대로 추가했다 — 이 한 곳만 누락.)

```
핵 스쿼트에서 '탑세트' 탭 → 시트 {weight:100}
좌로 스와이프 → 머신 레그 익스텐션(45kg)으로 이동. 시트는 그대로.
   재렌더된 시트 실측: 제목 '머신 레그 익스텐션' · 숫자 100 · 출처 '지금 탑세트 무게예요'  ← 거짓
'확인' → 레그 익스텐션 = [top 100, backoff 90, backoff 90]
        토스트 '탑세트로 바꿨어요 — 탑 100kg'
        localStorage override {"머신 레그 익스텐션":"top_backoff"} 영구 저장
```
**재활 종목까지 뚫린다.** 직접 탭하면 '재활 종목은 세트법을 바꿀 수 없어요'로 막히지만,
`confirmTopSetWeight → applySchemeToSession` 경로에는 `lockScheme` 재검사가 없고
`setSetSchemeOverride` 의 `false` 반환도 버린다.

```
페이스 풀(rehab, 20kg) 로 스와이프 후 '확인'
  → [work 100, work 100, work 100] × 15-20회         (20kg → 100kg, 5배)
  → 토스트 '스트레이트로 했어요 — 무게가 낮아 감량할 자리가 없어요'   ← 100kg 인데 "무게가 낮아"
```

## H3 탑세트 프리필이 **그 세션이 쓰고 있는 무게를 버린다** — 이 스킴만 그런다
`js/screens.js:2407 topSetPrefill`

프리필 순서는 `① 현재 탑 → ② recentTopWeight(지난 세션 실측) → ③ 추천값` 인데
**`sessionReferenceSet`(오늘 실제 세트 무게)을 안 본다.** 다른 세트법 전환은 전부
`applySchemeToSession` 이 `refSet.weight` 를 넘겨 오늘 무게를 유지한다 — 탑세트만 예외다.

```
(a) 손수 올린 무게가 사라진다
  벤치 90kg 기록 → 오늘 손수 110kg 으로 올림 (카드 '도전 권장' 90→110)
  '탑세트' 확인(프리필 90) → [top 90, backoff 80, backoff 80]     −20kg
  대조: 같은 상태에서 '피라미드' → [95, 100, top 110]              110 유지 ✔

(b) 증량일이 되돌아가고, 더블 프로그레션이 얼어붙는다
  100kg×8 × 2세션 → 엔진 '2세션 연속 100kg × 상단 8회 달성 → 105kg', 세션 세트 105kg@5
  '탑세트' 확인(프리필 100) → [top 100@5, backoff 90, backoff 90]
  카드 '도전 권장 100→105'  →  '동일 무게 100'
  ※ reps 는 증량 판정(progress)으로 이미 range.low=5 로 굳었는데 무게만 100으로 되돌아간다.
    reachedTopAt 은 상단(8회)을 요구하므로 **처방대로 하면 게이트가 다시는 안 열린다.**
```
`opts.baseWeight` 가 `reps` 계산 **뒤에** `weight` 만 덮어쓰기 때문이다(`js/domain.js:674-685`).

## H4 종목 교체가 **옛 종목의 무게·자동디로드·탑 상태**를 새 종목에 물려준다
`js/screens.js:2677` → `2248`(fallbackWeight) · `2253`(topDone) · `2258`(applyTopSetAutoDeload)

세 경로를 `rebuildPendingSets` 하나로 합치면서, 그 함수가 **`ex.name` 만 새 종목이고
나머지 입력은 전부 옛 종목 것**이라는 사실이 반영되지 않았다. `keepWarmups:false` 만 예외 처리됐다.

```
(a) 무게 누수 — ex.lastWeight 는 교체 *뒤* 에 갱신된다(2678행)
  레그 프레스 120kg 기록 → 덤벨 사이드 레터럴 레이즈(기록 없음) 교체
    752ad63 : [work 120, work 120, work 120] × 15회
    main    : [work null, work null, work null]
    7f13247 : [work null, work null, work null]     ← 752ad63 에서만 재현

(b) 자동 디로드 · topDone 누수
  핵 스쿼트 탑 100kg 3회(목표 8) 실패 → 백오프 85 자동 디로드
  → 바벨 데드리프트로 교체
    결과 : [핵스쿼트 탑 100✔, backoff 85(자동디로드 표식), backoff 85]  scheme=top_backoff
    대조 : 데드리프트 단독 구성 = [work null × 3]
  데드리프트는 자기 탑세트를 못 받고(topDone), 옛 종목의 실패 판정으로 감량된 채 시작한다.
```

## H5 자동 디로드가 전환 한 번에 **방금 실패한 무게**로 되올라간다
`js/screens.js:2313-2318` (`base = sessionReferenceSet(ex).weight` — 완료 세트 포함)

```
탑 100kg 목표 5회 → 4회 실패 → 자동 디로드 [top 100✔, backoff 85(D), backoff 85(D)]
'스트레이트' 탭 → [top 100✔, work 100, work 100]     ← 방금 실패한 무게를 2세트 더
                토스트 '스트레이트로 바꿨어요'        ← 숫자 없음
role 이 'work' 로 바뀌어 applyTopSetAutoDeload 가 그 종목에서 다시는 손대지 못한다.
```
2차 #4(자동 디로드 복구)가 **다른 메커니즘으로 재발**했다. PR 자체 테스트(`set-schemes.test.mjs:1748`)는
`straight → tapTopSet(90)` 으로 **다시 top_backoff 로 돌아온 뒤**만 검증해 이 중간 상태를 건너뛴다.

---

# 2. Medium

## M1 '탑 무게 수정'이 탑을 못 고치고, 백오프가 탑보다 무거워진다
`js/screens.js:2486` + `js/domain.js:1035 topDone`

탑을 끝낸 뒤 재탭하면 시트는 '탑 무게 수정' 제목에 완료된 탑 무게를 채운다. 그런데 `topDone` 이
램프에서 top 단을 지우므로 **탑은 안 바뀌고 백오프만 새 무게의 90% 로 다시 만들어진다.**

```
[top 100✔, backoff 90, backoff 90] 에서 재탭 → 120 입력 → 확인
  → [top 100✔, backoff 110, backoff 110]   백오프가 탑보다 10kg 무겁다
  → 토스트 '탑세트로 바꿨어요 — 탑 110kg'   110짜리 탑세트는 존재하지 않는다
  → 카드 '도전 권장' 100 → 110
105 를 넣으면 [top 100✔, backoff 95, backoff 95] — 감량폭이 사실상 사라진다.
```
시트 자신의 안내('탑 1세트 뒤 나머지는 90% 무게로 채워요')와 정면으로 어긋난다.
확정 무게를 이미 완료된 탑에 대해 클램프하는 곳이 없다.

## M2 토스트가 정작 바뀐 숫자를 감추고, 없는 숫자를 말한다
`js/screens.js:2289-2306 schemeChangeToastText`

before/after 를 `sessionReferenceSet`(= 세션 최중량, 완료 포함)으로 비교한다. 완료된 탑이 있으면
**남은 세트가 아무리 변해도 before == after** 라 숫자가 생략된다.

| 상황 | 남은 세트 실제 변화 | 토스트 |
|---|---|---|
| [top 100✔, backoff 90] → 스트레이트 | 90 → **100** | '스트레이트로 바꿨어요' |
| 디로드 [backoff 85] → 스트레이트 | 85 → **100** | '스트레이트로 바꿨어요' |
| 탑 무게 수정 100 → 120 | backoff 90 → **110** | '탑세트로 바꿨어요 — **탑 110kg**'(없는 탑) |

의도("실제로 바뀐 무게만 말한다")는 옳은데, 비교 대상이 **앞으로 들 무게**가 아니라 **세션 최중량**이라
정반대로 동작한다. H3·H5·M1 의 체감 피해가 전부 여기서 배가된다.

## M3 `topDone` 이 피라미드·역피라미드의 **100% 단까지 지운다**
`js/domain.js:1035`

`topDone` 은 role 이 `'top'` 인 단을 무조건 걸러낸다. 그런데 `top` 은 top_backoff 만의 역할이 아니다 —
피라미드는 `last:true` + `progressFrom:'last'` 앵커가, 역피라미드는 `progressFrom:'first'` 앵커가 `top` 이다.

```
탑 완료 후 '피라미드'  → [top 100✔, work 85, work 95]   top 역할 없음, 사다리가 92.5% 에서 끝
대조(아무것도 안 함)   → [work 85, work 95, top 100]
머리글·토스트는 둘 다 '피라미드'
```
덧붙여 스트레이트 접힘 판정(`domain.js:1024`)은 **필터 전 build** 로 하므로, 만들지도 않을 사다리를
기준으로 접힘 여부를 정한다.

## M4 '이미 쓰고 있는 세트법이에요'가 선택을 저장하지 않는다 (회귀)
`js/screens.js:2360`

새 가드가 `setSetSchemeOverride` **앞에서** return 한다. 옛 코드는 항상 먼저 저장했다.

```
저장 {'덤벨 컬':'pyramid'} · 무게 4kg 이라 실제로는 straight 로 접힘
사용자가 '스트레이트'를 눌러 확정하려 함
  → '이미 쓰고 있는 세트법이에요' · 저장은 여전히 {'덤벨 컬':'pyramid'}
  → 무게가 6kg 이 되는 순간 조용히 피라미드로 돌아간다(마지막 명시 선택은 스트레이트인데도)
```
옛 코드에서는 `straight === rules.scheme` 이라 override 가 삭제됐다. 2차 #8 수정의 부작용이다.

## M5 본 세트를 다 끝낸 뒤 '탑세트'는 아무것도 안 하면서 '바꿨어요'라고 한다
`js/screens.js:2353`(top_backoff 조기 return)이 `2369`("남은 세트 없음" 가드)보다 **위**에 있다.

```
워킹 3세트 전부 완료 상태에서
  '피라미드' → '남은 세트가 없어요 — 다음 세션부터 피라미드예요'   (정확)
  '탑세트'   → 무게 입력 시트 → 110 입력 → 확인 → 세트 변화 0
              토스트 '탑세트로 바꿨어요'                          (사실 아님)
```
override 는 저장되므로 다음 세션에는 반영된다 — **문구만 틀렸다.** 다만 무게까지 입력시킨 뒤라
사용자는 이번 세션이 바뀐 줄 안다. 같은 순서 때문에 '이미 쓰고 있는 세트법' 안내도 건너뛴다.

## M6 잠긴 '확인' 버튼이 활성 버튼과 똑같이 보이고, 타이핑 중에는 안 풀린다
`css/styles.css:857-877` · `js/screens.js:3489`

`.adj-btn` 에 `:disabled` 규칙이 없다 — 주황 테두리·주황 글자·`:active` 축소가 그대로 살아 있다
(저장소 다른 곳은 `.rest-done-btn:disabled { opacity:.5 }`). 게다가 입력칸에 `oninput` 이 없어
**숫자를 다 쳐도 blur 전까지 확인이 잠겨 있다** — 확인을 누르면 그 탭이 blur 에 먹히고, 한 번 더 눌러야 한다.
기록도 추천도 없는 종목(`source:'none'`, 숫자칸 `—`)에서 처음 만나는 화면이 이 상태다.
PR 테스트 `[시트] 확인 버튼은 값이 없으면 잠긴다` 는 attribute 만 본다.

---

# 3. Low

## L1 시트 안내문이 어시스트 종목에서 거짓
`js/screens.js:3498` — '탑 1세트 뒤 나머지는 90% 무게로 채워요' 는 하드코딩이고(`BACKOFF_PCT` 미참조),
역방향에서는 감량이 **보조를 더 주는** 방향이다. 실측: 어시스트 풀업 = `[top 30, backoff 35, backoff 35]`.
머리글은 '탑 보조 무게 / 낮출수록 ↑난이도'로 잘 적응하는데 바로 아래 안내만 어긋난다.
또 top_backoff 가 이 시트로 새면서, 역방향용 설명(`REVERSE_SCHEME_DESC`)은 선택 시점에 영영 안 보인다.

## L2 `recentTopWeight` 가 격자 밖 실측을 **위로** 스냅한다
`js/domain.js:640` — 22.5kg 로 기록한 종목의 프리필이 **25kg**. 문구는 '가장 무겁게 든 무게예요'인데
실제로 든 적 없는(더 무거운) 값이다. `getSessionSetPlan` 은 "5kg처럼 격자 밖 무게도 보존"하는데 여기만 다르다.

## L3 세트법 시트 '사용 중' 뱃지와 재탭 가드가 서로 다른 원천
`js/domain.js:791`(저장 선택) vs `js/screens.js:2360`(`sessionSchemeOf` = 실제 적용값).
접힌 종목은 시트에 '피라미드 · 사용 중'(주황 테두리)인데 머리글은 스트레이트다. M4 와 같은 뿌리.

## L4 남은 워밍업이 완료 세트 **뒤**로 밀려 '진행중'이 된다
`js/screens.js:2257` `doneSets.concat(keptWarmups, plan.sets)`.
워밍업을 건너뛰고 탑세트를 먼저 완료한 뒤 전환하면 `[top100✔, W50, W75, W90, …]` 이 되어
`activeSetIdx`(첫 미완료)가 50kg 워밍업을 가리킨다. 2차 #17(워밍업 소실)보다는 낫지만 순서가 뒤집힌다.

## L5 드롭 기준 무게가 마지막 워킹세트가 아니라 세션 최중량
`js/screens.js:2316`. `[top 100✔, backoff 90✔, backoff 90✔]` → 드롭 `75 / 55`(=100×0.75).
드롭은 직전 세트(90)의 연장이므로 67.5 기준이 자연스럽다. 처방 차이 약 +10%.

## L6 `recentTopWeight` 의 날짜 비교자가 `date` 누락에 불안정 (잠재)
`js/domain.js:634` — 인라인 `a.date < b.date ? -1 : …` 는 `undefined` 끼리 전부 0을 돌려준다.
정렬이 로그 순서(최신 우선) 그대로 남고 `.slice(-4)` 가 **가장 오래된 4개**를 고른다.
앱이 쓰는 로그에는 늘 date 가 있어 현재는 잠재적. 저장소에 `sortByDateDesc` 가 이미 있다.

## L7 '취소'가 세트법 시트가 아니라 세션으로 두 단계 내려간다
`openTopSetWeightSheet` 가 `setSchemeOpen=false` 로 만들어서, `getTopLayer` 가 두 층으로 모델링해도
실제로는 공존하지 않는다. 탑세트를 잘못 눌러 취소하면 목록으로 못 돌아가고 다시 열어야 한다.

## L8 통증 게이트 라벨과 표시 무게가 어긋날 수 있다
`js/screens.js:3312-3321`. H1 의 일반형 — `painGated` 는 라벨·색을 앰버로 고정하는데 표시 무게는
기준 세트라, 무게가 올라가면 '통증 — 증량 보류' 밑에 `80 → 95` 화살표가 뜬다.

---

# 4. 2차 리뷰 17건 처리 상태 (전부 실측)

| 2차 항목 | 상태 | 근거 |
|---|---|---|
| #1 탑 완료 시 카드가 '무게 낮추기'로 뒤집힘 | **닫힘** | 탑·백오프 완료 후에도 `도전 권장 / 95 / success` 유지 |
| #2 처방대로 한 사용자가 −10% 감량 | **닫힘** | 역산 채널 삭제 — 전환이 무게를 안 건드림 |
| #3 게이트 우회 증량 래칫 | **닫힘**(전환 경로) | 단 **H1·H3** 이 시트 경로로 같은 계열 문제를 새로 만듦 |
| #4 수동 조정·자동 디로드 소실 | **부분** | 전환 경로의 수동 조정은 닫힘. 자동 디로드는 **H5**, 수동 조정은 **H3(a)** 로 재발 |
| #5 드롭·어시스트에서 `prog.weight` 리셋 | **닫힘** | 손수 20 → 드롭 = `work 20·20·20 + drop 15·10` |
| #6 경량 고립 Epley 외삽 | **닫힘** | 저반복 혼입 로그에서도 기준 16kg 유지 → 피라미드 `12/14/16` |
| #7 진행 중 전환 시 탑 소멸 | **닫힘** | 1세트 완료 후 탑세트 = `[work✔100, top 95, backoff 85]`. 부작용은 **M3** |
| #8 접힌 세트법 복구 불가 | **닫힘**(가드) | 뱃지는 **L3**, 확정 저장은 **M4** |
| #9 다 끝낸 뒤 드롭 차단 + 선택 미저장 | **닫힘** | 드롭 부착·override 저장 확인. top_backoff 만 **M5** |
| #10 교체 경로 미수정 | **닫힘**(통합) | 같은 함수 공유. 단 **H4** 신규 |
| #11 디로드 표식 소실 | **부분** | top_backoff 왕복은 닫힘, 스트레이트 착지는 **H5** |
| #12 캡 기준점 드리프트 | **닫힘** | 캡·역산 자체가 없어짐 |
| #13 건너뛴 종목 조용한 부활 | **부분** | 정규 경로는 `showConfirm` 경유. **H2 경로는 여전히 우회**(`rebuildPendingSets` 의 무조건 `restoreSkippedSets`) |
| #14 rm_estimate 카드 튐 | **닫힘** | 두 갈래가 같은 `sessionReferenceSet` 사용 |
| #15 접힘 토스트가 원인 단정 | **닫힘** | 사유 2갈래 분기. 단 H2 경로에서 오작동 문구 |
| #16 override 별칭 키 삭제 불가 | **닫힘** | `if (exerciseName !== key) delete overrides[exerciseName]` |
| #17 미완료 워밍업 소실 | **닫힘** | `keptWarmups` 보존. 순서는 **L4** |

**15/17 닫힘, 2건 부분(#4·#11 — 둘 다 H5 로 수렴), #13 은 H2 경로 한정 잔존.**

---

# 5. `state.topSetSheet` 상태 관리 점검

| 항목 | 결과 |
|---|---|
| 선언·초기화 | `js/core.js:621` `topSetSheet: null` ✔ |
| 세션 종료 정리 | `endSession`(1465) · `finalizeSession`(1677) 둘 다 `null` ✔ |
| 렌더 우선순위 | `getTopLayer`(7491) · `navBack`(7535) 연결 ✔ (실효성은 **L7**) |
| 휴식 타이머 부분 갱신 | `startRestTimerTick`(2106·2116) 시트 목록에 포함 ✔ |
| 백그라운드 생존·세션 복원 | **저장하지 않는다** — 새로고침하면 시트만 사라지고 세션은 온전. 확인 전에는 세트를 안 바꾸므로 반쪽 상태가 안 남는다 ✔ (설계 의도대로) |
| 이중 확인 방어 | `topSetWeightValid()` 가 `state.topSetSheet` null 을 걸러 재진입 무해 ✔ |
| **종목 이동** | **✘ 가드 없음 — H2** |
| 입력칸 동기화 | `oninput` 없음 — **M6** |

---

# 6. 테스트 맹점 (440건 녹색인데 18건이 사는 이유)

1. **탑세트 시트 테스트가 전부 "이미 top_backoff 인 종목"** 을 쓴다 → 프리필이 늘 `source:'current'` 로
   현재 탑을 집어 항등식이 된다. **스트레이트 → 탑세트**(= 이 기능의 주 사용 흐름)에서만 `recentTopWeight`
   갈래를 타는데, 그 픽스처가 없다 → **H1 · H3**
2. **교체 픽스처가 늘 "기록 있는 종목"으로 교체한다**(`1787`) → `rm_estimate` 갈래 미검증 → **H4(a)**
3. **교체 × 완료된 탑세트 조합이 없다** → `topDone` · `applyTopSetAutoDeload` 누수 미검증 → **H4(b)**
4. **시트를 연 채 종목을 이동하는 시나리오가 없다** — `goToExercise`·스와이프 가드 자체에 테스트가 없다 → **H2**
5. **디로드 왕복 테스트가 top_backoff 로 되돌아온 뒤만 검증한다**(`1759-1762`) → 스트레이트 중간 상태 미검증 → **H5**
6. **`topDone` 수정 모드 조합이 없다**(재탭 + 다른 무게 확정) → **M1**
7. **`topDone` × 피라미드/역피라미드 조합이 없다** → **M3**
8. **토스트 테스트가 "기준 세트가 안 바뀐 케이스"만 본다** → 남은 세트만 바뀌는 조합 미검증 → **M2**
9. **"이미 쓰고 있는 세트법" 뒤 저장 상태를 확인하지 않는다** → **M4**
10. **본 세트 0개 × top_backoff** 만 빠져 있다(형제 스킴은 있음) → **M5**
11. `disabled` 는 attribute 만, 시각·입력 동기화 미검증 → **M6**
12. 통증 게이트 × 세트법 조합, 어시스트 × 시트 안내문, 격자 밖 무게 프리필 미검증 → **H1 · L1 · L2**

> 2차 §8 주의(캐시)는 지켜서 검증했다 — 모든 probe 가 `_lastSetsCache = null` 로 시작한다.
> `recentTopWeight` 는 이 캐시를 안 쓰지만 `getProgressiveRecommendation` 이 쓴다.

---

# 7. 머지 가부 의견 — **보류. 아래 5개를 고치면 머지 가능**

전부 국소 수정이고 설계 변경은 필요 없다. 이 5개가 High 5건 + Medium 3건을 함께 닫는다.

1. **시트에 대상 종목을 못박는다** (H2)
   `state.topSetSheet` 에 `exIdx`(또는 종목명)를 같이 담고, `confirmTopSetWeight` 가 현재 종목과
   다르면 조용히 취소한다. 더해서 ①스와이프 가드(`7679`)에 `if (state.topSetSheet) return;`
   ②`applySchemeToSession` 초입에 `lockScheme` 재검사 — 각 한 줄.
2. **프리필이 "오늘 쓰는 무게"와 안전 게이트를 본다** (H1 · H3)
   `topSetPrefill` 순서를 `현재 탑 → sessionReferenceSet → recentTopWeight → 추천값` 으로 바꾼다.
   `recentTopWeight` 는 통증 게이트가 걸린 종목에서 `prog.weight` 를 넘지 않게 클램프한다.
   (프리필을 세션 무게로 잡으면 reps/무게 짝 불일치도 함께 사라진다.)
3. **재구성 입력에서 "옛 종목" 흔적을 끊는다** (H4)
   `rebuildPendingSets` 에 `opts.freshExercise`(또는 `fallbackWeight`/`topDone`/`autoDeload` 개별 스위치)를
   두고 교체 경로에서 켠다 — `keepWarmups:false` 와 같은 이유, 같은 자리.
4. **전환 기준 무게·토스트를 "앞으로 들 세트" 기준으로** (H5 · M2)
   `applySchemeToSession` 의 `base` 와 토스트 비교값을 **남은 워킹세트의 기준 세트**로 잡는다.
   카드 표시용 `sessionReferenceSet`(2차 #1 수정의 핵심)은 **그대로 둔다** — 두 용도를 분리하면 된다.
5. **`topDone` 을 top_backoff 로 좁히고, 탑세트도 "남은 세트 없음" 가드를 지나게** (M1 · M3 · M5)
   `topDone` 은 `build.autoDeload` 가 있는 스킴(=top_backoff)에만 적용하거나, 확정 무게를
   완료된 탑 이하로 클램프한다. `applySetScheme` 의 top_backoff 분기를 `2369` 가드 **아래**로 옮긴다.

남은 Medium 2건(M4·M6)과 Low 8건은 머지 후 후속으로 충분하다.
배포 시에는 `CACHE_VERSION` 을 v60 으로 올려야 한다(현재 v59 유지는 미배포라 정상).
