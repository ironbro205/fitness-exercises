> 조사일: 2026-09-02 · 재검증+보강 · 코드 수정 없음

# 종목 선택 재검증 (v2) — 부위 매핑 · 가동범위 · 신장 강조 · 운동 순서 · 머신/프리 · 교체 주기 · 허리 안전

조사 범위: `js/data.js`(EXERCISE_BODY_PART_MAP·EXERCISES_BY_PRIMARY·WEAK_PART_EXERCISE_MAP·EXERCISE_SAFETY·COACH_KNOWLEDGE §1·§2) · `js/domain.js`(analyzeRoutineBalance) · `js/ai.js`(루틴 생성 규칙 ⑨~⑪·정체기 프롬프트) · 기존 문서 3편.
방식: 코드의 현재 값을 직접 열어 확인 → 각 주장을 2024~2026 최신 문헌으로 반박 시도 → 4등급 판정.

---

## 0. 한 장 요약 (결론 5줄)

1. **"신장 위치에서 훈련하는 게 낫다"는 견고하다. 단 이유가 앱이 적어 둔 것과 다르다.** 2026 메타(ES 0.283)와 2026 리뷰가 모으는 결론은 "근육이 늘어난 위치일 것"이 아니라 **"늘어난 위치에서 외부 토크(저항)가 실제로 걸릴 것"**이다. `stretched` 태그 31개 중 이 조건을 못 채우는 것이 몇 개 있다.
2. **"신장 부분반복이 전가동보다 낫다"는 2024년의 잠정 우세에서 2025~26년 "동등"으로 후퇴했다.** 앱 COACH_KNOWLEDGE §1의 "부분반복은 전가동과 같거나 우월"은 지금 기준으로 **딱 맞다** — 다만 "같거나"에 무게가 실렸다. 문구는 유지, 강조 톤만 낮출 것.
3. **머신=프리웨이트는 더 견고해졌다.** 2023 메타(13편·1,016명)에 더해 2025 within-subject 연구가 **국소(regional) 비대까지 동등**을 보고했다. 허리 이력자에게 머신을 권하는 앱의 태도는 근거상 손해가 없다.
4. **종목 교체 "8~12주 유지"는 2024년 새 RCT로 더 튼튼해졌다**(Kassiano 2024, 고정 vs 변화 = 동등). 다만 Fonseca 2014는 앱 주석이 적은 것과 달리 **"차이 없음"이 아니라 "총 CSA는 같고 근두(head)별 성장은 변화군이 고르다"**였다 — 주석 한 줄이 사실과 어긋난다.
5. **허리 금기 9종목은 "근거"가 아니라 "안전 마진"이다.** 부하 상태 반복 굴곡의 손상 기전(McGill 계열)은 시체·동물 모델이 근거이고, 생체 코호트 메타(Saraceni 2020)는 굴곡–통증 연관을 못 찾았으며, 데드리프트는 오히려 요통 재활 종목으로 쓰인 RCT가 있다(Berglund 2015). 앱이 차단하는 것 자체는 1인 무감독 사용자에겐 합리적이지만, **코치가 "위험해서 금지"라고 단정하면 그건 과장이다.**

---

## 1. 현재 주장 표

### 1-A. 부위 매핑·카탈로그 (`js/data.js`)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| A1 | 종목→부위 매핑을 primary 1개 + secondary 배열로 둔다 | 약 130개 항목(별칭 포함) | `data.js:302-455` |
| A2 | 오버헤드 프레스류 secondary에서 **측면 삼각을 뺀다** ("측면 자극 미미, 직접 고립 필요") | `secondary: ['triceps']`만 | `data.js:324-325` 주석 + 326-331 |
| A3 | 신장 강조 종목에 `stretched: true` 태그 | **31개 종목** | `data.js` 전역(grep 실측) |
| A4 | 삼두 신장 강조 정도는 오버헤드 > 라잉 > 푸시다운 | 주석에 Maeo 2022 인용(장두 +28.5% vs +19.6%) | `data.js:342-344` |
| A5 | 시티드 레그 컬은 신장 강조, 라잉 레그 컬은 아님 | `시티드 레그 컬 stretched:true` / `머신 라잉 레그 컬` 태그 없음 | `data.js:419-421` |
| A6 | 데드리프트 primary = 햄스트링 | `primary:'hamstrings', secondary:['glutes','lower_back','upper_back']`, `stretched` 없음 | `data.js:417` |
| A7 | 종아리는 어떤 종목도 secondary로 두지 않아 간접자극 0 → 볼륨 목표를 큰 근육급으로 | `calves: { size:'large' }` | `data.js:1345-1347` |
| A8 | 부족 부위 14그룹 → 권장 종목 3~4개 | `WEAK_PART_EXERCISE_MAP` 14키 | `data.js:1354-1370` |
| A9 | 가슴은 chest / chest_upper / chest_lower 3개 세부부위로 갈라 매핑 | `angle: flat/incline/decline` 동반 | `data.js:304-317` |
| A10 | 등은 lats(수직 당김 주)와 upper_back(수평 당김 주)으로 갈라 매핑 | 랫풀다운류=lats, 로우류=upper_back, 덤벨 로우만 예외로 lats | `data.js:358-380` |

### 1-B. 균형 분석 로직 (`js/domain.js` `analyzeRoutineBalance`)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| B1 | secondary 부위는 0.5세트로 합산 | `partCountsWithSec[s] += 0.5` | `domain.js:2113-2117` |
| B2 | 한 부위 primary **4개 이상 = 과잉 경고** | `if (partCounts[part] >= 4)` | `domain.js:2125-2129` |
| B3 | 동일 부위·각도 **2개 이상 = 중복 경고** | `if (angleMap[key] >= 2)` | `domain.js:2131-2143` |
| B4 | 메인 종목 0개(3종목↑) 또는 3개 초과 = 경고 | `mainCount === 0` / `mainCount > 3` | `domain.js:2145-2150` |
| B5 | 4종목 이상 루틴에 **신장 강조 0개 = 경고** | `stretchedCount === 0 && totalEx >= 4` (Maeo 2023 인용) | `domain.js:2152-2154` |

### 1-C. AI 프롬프트 (`js/ai.js`)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| C1 | 신장 강조 최소 1개(소프트), "저비용 헤지일 뿐 주 지렛대 아님" | 규칙 ⑩ | `ai.js` 규칙 10 블록 |
| C2 | 가슴은 상부+중/하부, 등은 수직+수평을 고루 커버 | 규칙 ⑩ 2번째 줄 | 같은 곳 |
| C3 | 어깨 세션엔 후면 삼각 고립을 **반드시 1개**(프레스로 대체 불가) | 규칙 ⑨ | `ai.js` 규칙 9 블록 |
| C4 | 메인 고중량 복합을 반드시 1~2번째(Nunes 2021), 다음 보조복합→고립→코어·카프 | 규칙 ⑪ | `ai.js` 규칙 11 블록 |
| C5 | 종목 순서는 총 근비대에 사실상 무관, 앞 종목의 수행·근력 이득만 있음 | 과학 근거 요지 3번째 줄 | `ai.js` 근거 블록 |
| C6 | 머신=프리웨이트 동등(Schwanbeck), 신장 강조 소폭 우위(Maeo 2021·2023, "효과 작고 논쟁적") | 같은 블록 | 같은 곳 |
| C7 | 종목 교체는 기간이 아니라 사유(a~d)로, 진행 중이면 **8~12주 유지 기본** | 정체기 프롬프트 | `ai.js:1946-1955` |
| C8 | Fonseca 2014 = "12주 고정군도 대퇴사두 CSA 11.6~12.0% 증가, 변화군과 차이 없음" | 주석 | `ai.js:1944` |
| C9 | 한 부위 4개 이상 / 동일 부위·각도 중복 / 메인 0개는 **절대 금지** | ❌ 절대 금지 블록 | `ai.js` 금지 블록 |

### 1-D. 허리 안전 (`js/data.js` `EXERCISE_SAFETY`)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| D1 | `contra`(전면 차단) 태그는 총 15건, 그중 허리는 **4건**뿐 | `contra:['lower_back']` = 데드리프트(`843`) · 러시안 트위스트(`866`) · 바벨 스쿼트(`975`) · 프론트 스쿼트(`1255`). `caution:['lower_back']`은 26건 | `data.js:747-1330` |
| D2 | 문서(`training-splits.md` §5-B)는 허리 금기를 **9종목**으로 기재 | 데드·RDL·바벨 RDL·바벨 스쿼트·프론트 스쿼트·바벨 로우·T바 로우·러시안 트위스트·머신 시티드 크런치 | `training-splits.md:310` 부근 |
| D3 | 손상 기전 = 큰 압박력이 아니라 **부하 상태의 반복 요추 굴곡**(McGill) | COACH_KNOWLEDGE §8 | `data.js:1454` |
| D4 | 요추 부하 3등급(높음/중간/낮음) + 축성 부하 주 1일 제한 | 문서에만 있고 **코드에 `axialLoad` 태그는 없음** | `training-splits.md:328-345`, 코드 미구현 |
| D5 | 대체 종목: 데드리프트 → 시티드 레그 컬, 바벨 스쿼트 → 핵 스쿼트 | `sub` 필드 | `data.js:845`, `978` |

> ⚠️ **D1 vs D2 불일치(실측)**: 문서는 허리 금기를 9종목이라고 적었는데 코드의 `contra:['lower_back']`은 **4건뿐**이다. 루마니안 데드리프트·바벨 루마니안 데드리프트·바벨 로우·T바 로우·머신 시티드 크런치는 지금 `caution`(수정하면 가능) 쪽에 있다. **문서를 믿고 판단하면 안 된다 — 코드를 열어야 한다.**

---

## 2. 재검증 결과

### 2-1. 신장 위치 강조 (stretch-mediated hypertrophy) — **견고**, 단 조건부

| 항목 | 판정 | 근거 |
|---|---|---|
| 긴 근육 길이 > 짧은 근육 길이 | **견고** | 2026 메타 8편: 전체 ES 0.283 (95%CI 0.04–0.52, p=0.036), 원위부 ES 0.433 (p=0.048), 중앙부 ES 0.276 (p=0.028) — Sport Sci Health 22:33, doi:10.1007/s11332-025-01586-5 |
| 신장 부분반복 > 전가동 | **잠정 → 최근 후퇴** | 2024 SBS 정리 시점엔 부분반복이 +6.76%(95%CI −29.5~22.1)로 우세 경향. 그러나 2025 PeerJ 훈련자 대상 RCT는 **동등**(PeerJ 13:e18904), 2026 리뷰도 "전가동 또는 신장 부분반복 어느 쪽이든 신장 위치를 포함하면 된다"로 정리 |
| 왜 효과가 나는가 | **잠정(중요)** | Pedrosa·Kassiano 2026 리뷰: **"근육 길이 자체가 아니라, 늘어난 위치에서 외부 토크가 실제로 걸릴 때"** 이득이 난다. 신장 위치에 저항이 없는 종목(예: 저항이 위쪽에 몰린 컬)은 길이를 늘려도 이득이 없었다 — Sports Med Int Open 10:a27337605, doi:10.1055/a-2733-7605 |

**부위별 일관성** (앱이 태그를 붙일 때 신뢰해도 되는 순서)

| 부위 | 직접 근거 | 효과 크기 | 앱 태그 상태 |
|---|---|---|---|
| 종아리(비복근) | Kassiano 2023 (신장 부분반복 vs 전가동) | 외측 +14.9% vs +7.3%, 내측 +15.2% vs +6.7% (약 2배) | ✅ 카프류 6종 전부 `stretched` |
| 햄스트링 | Maeo 2021 (시티드 vs 프론 레그컬) | +14.1% vs +9.3% | ✅ 시티드만 태그 — **정확** |
| 삼두 장두 | Maeo 2022 (오버헤드 vs 푸시다운) | 장두 +28.5% vs +19.6% | ✅ 오버헤드·라잉 태그 |
| 대퇴사두 | 2026 메타 주 표본(VL 5편, RF 3편) | ES 0.28~0.43 | △ 시시 스쿼트만 태그 |
| 이두 | Kassiano 2025 / Kobayashi 2024 | "우월"이 아니라 **부위가 갈림** — 인클라인 컬은 근위 +11.2%(vs 8.3%), 프리처는 원위 +10.3%(vs 6.4%) | △ 인클라인 컬만 태그 |
| 측면 삼각 | Larsen·Wolf·Schoenfeld 2025 (덤벨 vs 케이블 레터럴 레이즈) | **차이 없음** — 8주 +3.3~4.6%, 베이즈 팩터가 귀무가설을 "extreme" 지지(BF<0.01) | ❌ 앱은 케이블만 `stretched` — **반박됨** |
| 가슴·광배·복근 | 직접 비교 RCT 없음 | — | ❌ 태그는 있으나 추론 기반 |

**판정**: 종아리·햄스트링·삼두는 **견고**. 사두는 **잠정(견고에 가까움)**. 이두는 **"우월"이 아니라 "국소 분화"로 재서술 필요**. 측면 삼각의 케이블 우대는 **반박됨**.

### 2-2. 가동범위(전체 vs 부분) — **견고**(전가동이 기본값으로 안전)

- Wolf 2023 메타(23편): 전가동이 부분가동보다 근비대 SMD 0.12 — 사소한(trivial) 차이. 그러나 하위분석에서 **짧은 길이 부분반복은 확실히 열등**.
- 2026 메타: 긴 길이 부분 > 짧은 길이 부분(ES 0.283).
- 실무 결론: **"전가동을 하되 신장 구간을 절대 잘라먹지 말 것"**이 모든 결과와 모순 없는 유일한 규칙. 앱의 COACH_KNOWLEDGE §2 공통 큐("가동범위는 신장 위치까지 충분히")가 이미 정확하다.

### 2-3. 운동 순서 — **견고**(단 앱의 근거 서술이 미묘하게 어긋남)

- Nunes 2021 메타(11편·268명): **근력**은 앞 종목이 유리(다관절 먼저 ES 0.32, p=0.034 / 단관절 먼저면 단관절 근력 ES −0.58, p=0.032). **근비대는 순서 무관.**
- 앱 규칙 ⑪은 "신선할 때 무게·반복이 최대, 폼이 지켜짐(특히 허리 보호)"을 이유로 든다 — 근력 부분은 맞다. **"허리 보호"는 Nunes에서 나오지 않는 추가 주장**이며 별도 근거가 필요하다(피로 시 요추 굴곡 증가는 생체역학 논문 영역).
- 앱 근거 요지(C5) "총 근비대에 사실상 무관"은 **정확**. 규칙 ⑪을 "필수"로 못 박은 것은 근비대가 아니라 **안전·수행 근거**임을 명시하는 게 정직하다.

### 2-4. 머신 vs 프리웨이트 — **견고**(더 강해짐)

| 근거 | 결과 |
|---|---|
| Haugen 2023 메타 (BMC Sports Sci Med Rehabil 15:103, 13편·1,016명) | 근비대 **차이 없음**. 근력은 검사 방식에 특이적(프리로 훈련→프리 검사 유리, 머신→머신 검사 유리). 점프 수행도 차이 없음 |
| Schwanbeck 2020 (JSCR) | 앱이 이미 인용 중, 동일 결론 |
| Amanuma 2025 (J Bodyw Mov Ther 45:562-568) | within-subject 설계로 **무릎 신전근의 국소(regional) 비대까지 동등** — "머신은 부위별로 덜 고르게 큰다"는 통념까지 반박 |

**판정: 견고.** 허리 이력자에게 머신·지지형 종목을 권하는 앱의 태도는 근비대 손실이 없다고 말해도 된다.

### 2-5. 종목 다양성·교체 주기 — **견고**(앱 결론 유지), 단 주석 1건 수정 필요

| 연구 | 실제 결과 | 앱 서술과의 차이 |
|---|---|---|
| Fonseca 2014 (JSCR 28(11):3085) | 총 대퇴사두 CSA는 군간 차이 없음. **단, 스쿼트만 한 군은 대퇴직근·중간광근이 성장하지 않았고, 종목을 바꾼 군은 4개 근두 모두 성장** | ❌ `ai.js:1944` 주석은 "변화군과 차이 없음"만 적어 **국소 결과를 누락**. 사실 오기재는 아니나 반쪽 |
| Baz-Valle 2019 (PLoS One 14(12):e0226989) | 매 세션 무작위 변경 vs 고정, 근두께·1RM 군간 차이 없음(근두께는 고정군이 미세 우세) | ✅ 정확 |
| Kassiano 2022 (JSCR 36(6):1753) 체계적 리뷰 | **계획된** 변화는 국소 적응에 도움, **과도·무작위** 변화는 오히려 손해 | ✅ 정확 |
| **Kassiano 2024** (Res Q Exerc Sport, doi:10.1080/02701367.2024.2409961) — 신규 | 여성 70명·고정 vs 3세션 순환 변화: 근두께 +7.8~17.7% vs +7.5~19.3%, 1RM +24.4~32.1% vs +29.0~30.1% → **동등** | 🆕 앱에 없음. 앱 결론을 **강화**하는 최신 RCT |

**판정: 견고.** "8~12주 유지, 교체는 사유로"는 그대로 두되, ① Kassiano 2024를 근거로 추가하고 ② Fonseca 주석에 "단 한 종목만 고집하면 일부 근두가 안 큰다"를 되살릴 것. 후자는 규칙 ⑩(부위 커버)의 **유일한 직접 근거**다.

### 2-6. 부위 커버 규칙(가슴 상/중/하 · 등 수직/수평 · 어깨 3갈래) — **잠정~근거 없음**

| 규칙 | 판정 | 근거 |
|---|---|---|
| 가슴 상부 별도 커버(인클라인) | **잠정** | Chaves 2020 (Int J Exerc Sci, 미훈련 남성 47명·8주): 인클라인 전용군만 쇄골두 두께가 유의하게 더 증가. **딱 1편·미훈련자·주 1회 훈련**이라 일반화가 약하다 |
| EMG로 국소 비대를 예측 가능한가 | **반박됨** | Albarello 연구 리뷰(Helms, MASS 2023): 인클라인/플랫의 EMG 차이는 예상대로 나왔지만 **급성 부종(swelling) 결과와 어긋났고, 장기 비대 데이터와도 어긋났다.** 정규화 방식 한계로 EMG 값 비교 자체가 성립하지 않았다 → **"EMG가 높으니 이 종목이 그 부위를 키운다"는 추론을 앱 문구에 쓰면 안 된다** |
| 등 수직(풀다운)+수평(로우) 둘 다 필요 | **근거 없음** | 직접 비교한 장기 비대 RCT를 찾지 못함. 있는 것은 EMG(광배는 로우·풀다운 간 유의차 없음, 승모근만 로우 우세)와 2024 고밀도 EMG 국소 차이뿐. **해부학적 타당성은 있으나 근거 등급은 통념** |
| 어깨 3갈래(전/측/후) 분리 볼륨 | **잠정** | 앱의 A2(프레스 secondary에서 측면 제외)는 EMG(오버헤드 프레스 전면 33.3% MVIC vs 측면 27.9%, 레터럴 레이즈 측면 30.3%)와 실무 합의에 기댄다. **프레스가 측면 삼각을 얼마나 키우는지 직접 측정한 장기 RCT는 못 찾았다.** 방향은 맞을 가능성이 높으나 "미미하다"는 단정은 과하다 |
| 후면 삼각 직접 고립 **필수** | **잠정** | 로우·프레스는 후면 삼각을 보조로만 쓴다는 EMG(레터럴 레이즈 후면 24% vs 오버헤드 프레스 11.4% MVIC)와 실무 합의뿐. **"필수"라고 말할 만한 RCT는 없다.** 다만 비용이 0에 가까운 헤지라 규칙 유지에 반대할 이유도 없다 |
| 같은 근육 안에서 **근위/원위**를 나눠 커버 | **잠정(신규·근거 더 강함)** | Kassiano 2025 이두(인클라인=근위, 프리처=원위), Kobayashi 2024(프리처→상완근, 인클라인→상완이두), Fonseca 2014(근두별) — **"각도를 나눠라"보다 "관절 위치를 나눠라"가 근거가 더 많다** |

### 2-7. 허리 디스크 이력자 종목 선택 — **잠정**(방향은 옳고, 단정이 과하다)

| 주장 | 판정 | 근거 |
|---|---|---|
| 부하 상태 반복 요추 굴곡이 디스크 탈출 기전 | **잠정** | Callaghan & McGill 2001, Marshall & McGill 2010 등 — 근거의 대부분이 **돼지 척추 표본·시체 모델**이다. 기전 설명으로는 강력하나 사람 코호트로 확인된 바 없다 |
| 굴곡을 피하면 요통이 줄어든다 | **반박됨** | Saraceni 2020 메타(JOSPT 50(3):121-130, doi:10.2519/jospt.2020.9218): **"들 때의 요추 굴곡이 큰 것은 요통 발생·지속의 위험 요인도, 유·무증상 집단의 구분자도 아니었다."** 직접 측정한 어떤 연구도 연관을 찾지 못함 |
| 스쿼트/데드리프트는 허리 이력자에게 위험 | **반박됨(부분)** | Berglund 2015 (JSCR 29(7):1803): 기계적 요통 환자 대상 **데드리프트 8주 훈련**에서 2/3가 통증·활동에서 임상적으로 유의한 개선(>30%). 저부하 운동제어 훈련과 결과 차이 없음. 즉 데드리프트는 요통 **재활 종목으로 쓰인 적이 있다** |
| 직업 리프팅 가이드라인의 "안전 한계" 개념 | **논쟁 중** | J Occup Rehabil 2024 사설(34:473-480): NIOSH식 압박 한계(3,400 N)는 생체역학·시체 모델 기반이며 **실제 척추 부하를 예측하지 못한다**는 비판. 임상 요통 지침(생물심리사회 모델)과 충돌한다 |
| 저항운동 자체가 만성 요통에 유효 | **견고** | 최근 체계적 리뷰들이 통증·장애 감소에 중등도 확실성으로 권고 |

**정직한 판정**: 앱이 데드리프트·바벨 스쿼트를 **기본 차단**하는 것은 "위험해서"가 아니라 **"1인·무감독·폼 붕괴를 앱이 감지할 수 없어서"**다. `data.js:845`의 why 문구가 이미 "폼이 무너지는 순간을 앱이 감지할 수 없어 기본 차단하며"라고 정확히 적어 두었다 — **이 프레이밍이 근거상 옳고, 코치 답변도 여기서 벗어나면 안 된다.** 대체안(핵 스쿼트·시티드 레그 컬)이 근비대 손실이 없다는 것은 §2-4로 뒷받침된다.

### 2-8. 균형 분석 임계값 — **근거 없음**(휴리스틱)

| 규칙 | 판정 | 설명 |
|---|---|---|
| B2 부위 primary 4개 이상 = 과잉 | **근거 없음** | "한 부위 종목 수" 상한을 시험한 연구를 찾지 못했다. 실제로 관리되는 변수는 **세트 수**이며 앱은 이미 볼륨 임계(큰 10~20 / 작은 8~16)로 따로 관리한다. 종목 수 상한은 60분 시간 제약의 대리 지표에 가깝다 |
| B3 동일 부위·각도 2개 = 중복 | **근거 없음** | 같은 각도 2종목이 손해라는 근거 없음. §2-6의 "근위/원위 커버"가 근거가 더 있는 대안 규칙 |
| B4 메인 1~2개 | **잠정** | Nunes 2021의 "앞 종목이 근력 이득을 더 가져간다"에서 파생. 개수 자체의 근거는 없음 |
| B5 신장 강조 0개 경고 | **잠정** | §2-1대로 방향은 맞다. 단 `stretched` 태그의 정의가 "외부 토크가 신장 위치에 걸리는가"로 바뀌어야 경고가 의미를 갖는다 |
| C9 이 셋을 "❌ 절대 금지"로 둠 | **과함** | 근거 없는 휴리스틱을 RIR·볼륨 상한(소프트)보다 강하게 못 박고 있다. 프롬프트 안에서 위상이 뒤집혀 있다 |

---

## 3. 공백 — 앱에 없지만 코치가 알아야 할 것 (2024~2026)

1. **"신장 위치 = 외부 토크 위치"라는 재정의** (Pedrosa·Kassiano 2026). 근육이 늘어나는 것만으로는 부족하고 그 지점에서 저항이 실려야 한다. 앱의 `stretched` 태그를 이 기준으로 재정의하면 몇 개가 탈락한다(아래 §4-표 참조).
2. **신장 부분반복 열풍의 냉각** (PeerJ 2025 훈련자 RCT = 동등). 사용자가 "신장 부분반복 해야 하나요"라고 물으면 **"전가동으로 신장 구간을 다 쓰면 그걸로 충분하다"**가 2026년의 정답이다.
3. **국소 비대는 EMG로 예측되지 않는다** (Helms/MASS 2023 리뷰). 앱은 EMG를 직접 쓰진 않지만 "이 종목이 여길 자극한다"는 문구가 EMG 통념에서 나왔다면 근거 등급을 낮춰야 한다.
4. **같은 근육의 근위/원위 분화** (Kassiano 2025·Kobayashi 2024): 이두는 인클라인 컬(근위·상완이두) vs 프리처(원위·상완근)로 갈린다. 앱은 둘 다 카탈로그에 있으나 **"둘 다 넣으면 좋다"는 안내가 없다.**
5. **종아리는 무릎 각도로 갈린다** (Kinoshita 2023, Front Physiol 14:1272106): MRI 근육 부피 기준 스탠딩(무릎 편) 비복근 외측 +12.4% vs 시티드 +1.7%, 내측 +9.2% vs +0.6%. 가자미근은 동등(+2.1% vs +2.9%). (2026-09-02 검산: 초록 원문 수치로 정정) → **시티드 카프 레이즈에 `stretched:true`가 붙어 있는 것은 가자미근엔 맞고 비복근엔 틀리다.**
6. **덤벨 vs 케이블 레터럴 레이즈 동등** (Larsen 2025). 케이블을 "신장 강조"로 우대할 근거가 사라졌다.
7. **머신의 국소 비대까지 동등** (Amanuma 2025). "머신은 고르게 안 큰다"는 반박 논리를 코치가 알고 있어야 한다.
8. **요추 굴곡–통증 무관 메타** (Saraceni 2020) + **데드리프트 재활 RCT** (Berglund 2015). 사용자가 "왜 데드리프트를 막느냐"고 물을 때 정직하게 답할 재료.
9. **디스크 이력자 실무 대체안**: 트랩바/블록 풀(상체 직립, 전단력↓), 고블릿·벨트 스쿼트, 지지형 스플릿 스쿼트. 앱 카탈로그에 트랩바·벨트 스쿼트가 **없다**.

---

## 4. 앱 반영 수치·문구 표 (핵심 산출물)

### 4-A. 코드값 변경 후보 (견고 등급만)

| 항목 | 현재 값 | 권장 값 | 등급 | 반영 위치 | 사용자 경험 변화 |
|---|---|---|---|---|---|
| 시티드 카프 레이즈의 신장 태그 | `stretched: true` | `false`로 내리거나 "가자미근 한정" 주석 | 견고 (Kinoshita 2023) | `data.js:434-436` | 종아리 신장 강조 슬롯에 스탠딩·레그프레스 카프가 우선 배치돼 비복근 성장이 유리해진다 |
| 케이블 원 암 레터럴 레이즈의 신장 태그 | `stretched: true` (덤벨은 없음) | 두 종목을 **동등**하게(둘 다 태그 없음 또는 둘 다 있음) | 견고 (Larsen 2025, BF<0.01) | `data.js:333` | 케이블 줄이 붐빌 때 덤벨 레터럴이 열등한 선택처럼 보이지 않는다 |
| 데드리프트 `stretched` | 없음 | 없음 유지(정확) — 대신 **RDL과 역할이 다름**을 주석에 | 견고 | `data.js:417` | (문구만) |
| Fonseca 2014 주석 | "변화군과 차이 없음" | "총 CSA는 동등, **다만 스쿼트만 한 군은 대퇴직근·중간광근이 안 컸다**" | 견고 | `ai.js:1944` | 코치가 "종목 안 바꿔도 된다"와 "한 종목만 고집하면 빈 곳이 생긴다"를 동시에 말할 수 있게 된다 |
| 종목 유지 기간 근거 | Fonseca·Baz-Valle·Kassiano 2022 | **+ Kassiano 2024 (RQES, 고정 vs 순환 동등, n=70)** 추가 | 견고 | `ai.js:1944` 주석 / COACH_KNOWLEDGE §9 | (근거 보강, 값 불변) |
| 머신=프리 근거 | Schwanbeck 2020 | **+ Haugen 2023 메타(13편·1,016명), Amanuma 2025(국소까지 동등)** | 견고 | `data.js` COACH_KNOWLEDGE §1 | 허리 이력 대체안을 권할 때 코치가 더 단단히 말한다 |

### 4-B. 프롬프트·지식 문서 안내 후보 (잠정 등급)

| 항목 | 현재 | 권장 | 등급 | 위치 | 경험 변화 |
|---|---|---|---|---|---|
| 신장 강조의 정의 | "근육이 늘어난 위치에서 부하가 큰 종목" | "늘어난 위치에서 **외부 저항이 실제로 걸리는** 종목" 한 구절 추가 | 잠정 (Pedrosa 2026) | COACH_KNOWLEDGE §1, `ai.js` 규칙 ⑩ | 잘못된 종목이 신장 강조 슬롯을 차지하는 일이 준다 |
| 신장 부분반복 서술 | "전가동과 같거나 우월 (Maeo 2023, 2024~25 메타 재확인)" | "전가동으로 신장 구간까지 쓰면 충분. 부분반복이 더 낫다는 근거는 2025년 이후 **동등**으로 수렴" | 잠정 (PeerJ 2025) | COACH_KNOWLEDGE §1 | 사용자가 유행어를 물어도 코치가 과장하지 않는다 |
| 이두 종목 안내 | 인클라인 컬만 신장 강조 | "인클라인 컬=근위, 프리처=원위로 **자라는 자리가 다르다**" | 잠정 (Kassiano 2025, Kobayashi 2024) | COACH_KNOWLEDGE §2 또는 규칙 ⑩ | 팔 정체 시 "둘 다 넣기"라는 구체적 조정안이 나온다 |
| 부위 커버 규칙 프레이밍 | "가슴 상/중하, 등 수직/수평" | 유지하되 **"각도"보다 "관절 위치(근위/원위)"** 문장을 우선 | 잠정 | `ai.js` 규칙 ⑩ | 근거 있는 쪽으로 우선순위 이동 |
| 후면 삼각 "반드시" | 필수 | "필수" 유지 가능하나 근거는 **EMG·합의**임을 지식 문서에 명기 | 잠정 | 규칙 ⑨ / COACH_KNOWLEDGE | 코치가 근거를 물으면 정직하게 답한다 |
| 규칙 ⑪ "허리 보호" | Nunes 2021 인용에 포함 | "근비대는 순서 무관(Nunes 2021), **순서를 정하는 이유는 수행·안전**"으로 분리 | 견고(Nunes) + 잠정(안전) | `ai.js` 규칙 ⑪ | 근거 인용이 정확해진다 |
| 허리 차단 프레이밍 | why에는 정확히 적혀 있음 | **코치 시스템 프롬프트에도** "위험해서가 아니라 앱이 폼을 못 봐서 보수적으로 차단"을 명시 | 잠정 (Saraceni 2020, Berglund 2015) | COACH_KNOWLEDGE §3·§8 | "데드는 허리에 나쁘다"는 과장된 답변이 줄고, 사용자가 물으면 정직한 설명이 나온다 |
| 요추 부하 등급(`axialLoad`) | 문서에만 존재, 코드 없음 | 태그 신설 또는 문서에서 "미구현" 명시 | 잠정 | `data.js` / `training-splits.md:328` | 슈퍼세트·요일 배치 규칙이 실제로 작동한다 |

### 4-C. 삭제·완화 후보 (반박됨 / 근거 없음)

| 항목 | 현재 | 권장 | 등급 | 위치 |
|---|---|---|---|---|
| "한 부위 4개 이상 / 동일 부위·각도 중복 / 메인 0개" 를 **절대 금지**에 둠 | ❌ 절대 금지 블록 | **소프트 경고로 강등** (RIR·볼륨 상한과 같은 위상). 진짜 금지는 "풀에 없는 종목·금기 종목·실행 불가 무게" 셋 | 근거 없음 | `ai.js` 금지 블록 |
| 동일 부위·각도 중복 경고(B3) | `>= 2` 경고 | 유지하되 경고 문구에서 "중복"→"각도 편중" 정도로 완화, 또는 근위/원위 기준으로 교체 | 근거 없음 | `domain.js:2131-2143` |
| 프레스류 secondary 측면 제외 주석의 "미미하다" | 단정 | "직접 고립이 필요하다"로만 (EMG 기반임을 명시) | 잠정 | `data.js:324-325` |
| 문서-코드 불일치 (허리 금기 9 vs 4) | `training-splits.md` §5-B | 문서를 코드 실측값으로 갱신 | — | `training-splits.md:310` 부근 |

### 4-D. 20개 표본 부위 매핑 대조 (해부학·근거 기준)

| 종목 | 앱 primary / secondary | 대조 결과 |
|---|---|---|
| 바벨 벤치 프레스 | chest / 전면삼각·삼두 | ✅ |
| 스미스 인클라인 벤치 프레스 | chest_upper / 전면삼각·삼두 | ✅ (Chaves 2020, 잠정) |
| 케이블 크로스오버 | chest_lower(decline) / — | △ "하부" 특이성은 EMG 통념. 근거 약함 |
| 머신 펙 덱 플라이 | chest / — , stretched | ✅ (저항이 신장 위치에 걸림 — Pedrosa 기준 통과) |
| 덤벨 숄더 프레스 | shoulders_front / 삼두 | △ 측면 제외는 잠정 |
| 덤벨 사이드 레터럴 레이즈 | shoulders_side / — | ✅ |
| 케이블 원 암 레터럴 레이즈 | shoulders_side / — , **stretched** | ❌ 덤벨과 동등 (Larsen 2025) |
| 리버스 펙 덱 플라이 | shoulders_rear / upper_back | ✅ |
| 케이블 오버헤드 트라이셉스 익스텐션 | triceps / — , stretched | ✅ (Maeo 2022) |
| 라잉 트라이셉스 익스텐션 | triceps / — , stretched | △ 장두를 완전히 늘리지 못한다는 지적 있음(Wolf 2024 논평). 오버헤드보다 약한 태그 |
| 클로즈 그립 벤치 프레스 | triceps / chest·전면삼각 | △ 가슴이 주동이라는 반론 가능. 삼두 볼륨으로 세는 것은 관대함 |
| 풀업 | lats / 이두·upper_back | ✅ |
| 랫 풀 다운 | lats / 이두 | ✅ |
| 머신 시티드 로우 | upper_back / lats·이두 | ✅ |
| 덤벨 로우 | **lats** / upper_back·이두 | △ 바벨 로우는 upper_back인데 덤벨 로우만 lats. 근거 없는 비대칭 |
| 풀오버 | lats / chest | △ 대흉근 기여가 크다는 EMG 다수. primary 재검토 대상 |
| 데드리프트 | hamstrings / 둔근·요추·upper_back | △ 햄스트링 비대 근거는 RDL이 더 강하다. 다만 앱은 허리 금기로 기본 차단이라 실무 영향 작음 |
| 시티드 레그 컬 | hamstrings / — , stretched | ✅ (Maeo 2021) |
| 머신 라잉 레그 컬 | hamstrings / — , 태그 없음 | ✅ (정확한 구분) |
| 스탠딩 카프 레이즈 | calves / — , stretched | ✅ (Kinoshita 2023 straight-leg 우세) |
| 시티드 카프 레이즈 | calves / — , **stretched** | ❌ 비복근엔 오히려 불리. 가자미근 한정 |
| 행잉 니 레이즈 | abs / obliques, **stretched** | ❌ 장요근 주도. 신장 강조 근거 없음 |
| 와이드 스탠스 레그 프레스 | adductors / 둔근·사두, stretched | ✅ (대내전근은 큰 고관절 신전근) |

### 4-E. 신장 강조 우선 종목 목록 (부위별 · 근거 순)

| 부위 | 1순위 (직접 RCT) | 2순위 (타당하나 간접) | 쓰지 말 것 |
|---|---|---|---|
| 종아리 | 스탠딩 카프 레이즈 · 레그 프레스 카프 레이즈(무릎 편 상태) | — | 시티드 카프 레이즈를 "신장 강조"로 부르는 것 |
| 햄스트링 | 시티드 레그 컬 · 루마니안 데드리프트 | 덤벨 싱글 레그 데드리프트 | 라잉 레그 컬(정상 종목이나 신장 강조 아님) |
| 삼두 | 케이블/덤벨 오버헤드 트라이셉스 익스텐션 | 라잉 트라이셉스 익스텐션 | 푸시다운 |
| 사두 | (부분반복 연구 기반) 깊은 레그 프레스·핵 스쿼트 | 시시 스쿼트 | 레그 익스텐션 상단 구간 |
| 가슴 | — (직접 RCT 없음) | 펙 덱·케이블 플라이·덤벨 플라이(저항이 신장 위치) | — |
| 이두 | 인클라인 덤벨 컬(근위 강조) | 프리처 컬은 원위 강조 — **경쟁이 아니라 분업** | — |
| 광배 | — | 케이블 암 풀 다운·원 암 케이블 랫 풀 다운·풀오버 | — |
| 측면 삼각 | 없음 | 덤벨·케이블 어느 쪽이든 동등 | 케이블만 우대하는 것 |

---

## 5. 정직한 한계

1. **찾지 못한 근거**
   - 등 수직 당김 vs 수평 당김의 **장기 근비대 비교 RCT**. EMG와 해부학적 추론뿐이다. 앱 규칙 ⑩의 절반은 근거 없는 통념 위에 서 있다.
   - 후면 삼각 "직접 고립이 없으면 안 큰다"를 보인 **장기 RCT**. 실무 합의만 있다.
   - "한 부위 종목 수 상한"을 시험한 연구 자체가 없다.
   - 프레스가 측면 삼각을 얼마나 키우는지 측정한 **비대** 연구(EMG만 있음).
2. **상충하는 연구**
   - 신장 부분반복: 2023~24년 자료(Kassiano 종아리 2배, Maeo 힙익스텐션 2배)는 큰 우위를, 2025년 훈련자 대상 RCT(PeerJ)는 동등을 보고한다. **훈련 경력·부위에 따라 갈릴 가능성**이 크며 현재 어느 쪽도 확정이 아니다.
   - 허리: 기전 연구(McGill 계열, 시체·동물)와 역학 연구(Saraceni 2020, 사람 코호트)가 정반대 방향을 가리킨다. 앱은 기전 쪽만 인용하고 있어 **한쪽에 치우쳤다**. 그럼에도 무감독 1인 사용자에게 보수적으로 가는 선택 자체는 방어 가능하다.
3. **확신 없는 부분**
   - `stretched` 태그 31개 중 직접 근거로 검증한 것은 8개뿐이다(종아리 6·햄스트링 1·삼두 3 계열, 중복 포함). 나머지 20여 개는 저항 프로파일 추론이며, 이 문서의 재정의(외부 토크 기준)를 적용하면 **개별 재심사가 필요**하다. 이번 조사에서 전수 재심사는 하지 않았다.
   - 4-D의 매핑 대조는 **20개 표본**이다. 나머지 110여 항목은 보지 않았다.
   - EXERCISE_SAFETY 101종목 중 허리 관련(`contra` 4건·`caution` 26건)만 grep으로 훑었고, `mod`/`why` 문구 111문장의 사실성은 검증하지 않았다.
4. **의도적으로 다루지 않은 것**: 영양·보충제(범위 밖), 세트법·휴식·볼륨(다른 조사자 담당), 분할법 배치(training-splits.md 담당).

---

## 6. 출처

**신장 위치·가동범위**
- Muscle hypertrophy from partial repetition at long vs. short muscle length: A systematic review and meta-analysis. *Sport Sciences for Health* 22:33 (2026-01-05). doi:10.1007/s11332-025-01586-5
- Wolf M, Androulakis Korakakis P, Roberts MD, Plotkin DL, Franchi MV, Contreras B, Henselmans M, Larsen S, Schoenfeld BJ. Does longer-muscle length resistance training cause greater longitudinal growth in humans? A systematic review. *Sports Medicine and Health Science* (2025). doi:10.1016/j.smhs.2025.03.001
- Pedrosa GF, Pereira MR, Kassiano W. The interplay between muscle length, range of motion, and exercise selection: a review. *Sports Medicine International Open* 10:a27337605 (2026). doi:10.1055/a-2733-7605
- Lengthened partial repetitions elicit similar muscular adaptations as full range of motion repetitions during resistance training in trained individuals. *PeerJ* 13:e18904 (2025). https://peerj.com/articles/18904/
- Wolf M. Do Lengthened Partials Really Stimulate Stretch-Mediated Hypertrophy? *Stronger by Science* (2024-04-29). https://www.strongerbyscience.com/stretch-mediated-hypertrophy/
- Maeo S, et al. Greater hamstrings muscle hypertrophy but similar damage protection after training at long versus short muscle lengths. *Med Sci Sports Exerc* 53(4):825-837 (2021). doi:10.1249/MSS.0000000000002523
- Maeo S, et al. Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position. *Eur J Sport Sci* (2022). doi:10.1080/17461391.2022.2100279
- Kinoshita M, et al. Triceps surae muscle hypertrophy is greater after standing versus seated calf raise training. *Front Physiol* 14:1272106 (2023).
- Kassiano W, et al. 종아리 신장 부분반복 vs 전가동 (외측 +14.9% vs +7.3%, 내측 +15.2% vs +6.7%) — Wolf 2024 SBS 리뷰 경유 인용.
- Kassiano W, et al. Distinct muscle growth and strength adaptations after preacher and incline biceps curl (2025). https://ro.ecu.edu.au/ecuworks2022-2026/5817/
- Larsen S, Wolf M, Schoenfeld BJ, et al. Dumbbell versus cable lateral raises for lateral deltoid hypertrophy: an experimental study. *Front Physiol* (2025). PMC12277279 / PubMed 40692697

**운동 순서**
- Nunes JP, et al. What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy? A systematic review and meta-analysis. *Eur J Sport Sci* 21(2):149-157 (2021). doi:10.1080/17461391.2020.1733672 / PubMed 32077380

**머신 vs 프리웨이트**
- Haugen ME, et al. Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance — a systematic review and meta-analysis. *BMC Sports Sci Med Rehabil* 15:103 (2023). doi:10.1186/s13102-023-00713-4
- Amanuma MT, et al. Comparable regional hypertrophy of the knee extensor muscles in response to resistance training with machines versus free weights: a randomized within-subject approach. *J Bodyw Mov Ther* 45:562-568 (2025). doi:10.1016/j.jbmt.2025.09.027
- Schwanbeck SR, et al. (2020) *JSCR* — 앱이 이미 인용 중

**종목 다양성·교체**
- Fonseca RM, et al. Changes in exercises are more effective than in loading schemes to improve muscle strength. *JSCR* 28(11):3085-3092 (2014).
- Baz-Valle E, et al. The effects of exercise variation in muscle thickness, maximal strength and motivation in resistance trained men. *PLoS One* 14(12):e0226989 (2019).
- Kassiano W, et al. Does varying resistance exercises promote superior muscle hypertrophy and strength gains? A systematic review. *JSCR* 36(6):1753-1762 (2022). PubMed 35438660
- Kassiano W, et al. Muscle hypertrophy and strength adaptations to systematically varying resistance exercises. *Res Q Exerc Sport* (2024). doi:10.1080/02701367.2024.2409961

**부위 커버·EMG 한계**
- Chaves SFN, et al. Effects of horizontal and incline bench press on neuromuscular adaptations in untrained young men. *Int J Exerc Sci* (2020). PubMed 32922646
- Helms E. Is Regional Hypertrophy Predictable? *Stronger by Science / MASS* (2023-01). https://www.strongerbyscience.com/regional-hypertrophy/ (Albarello et al. 리뷰)
- Kobayashi 등 (2024) MRI 프리처 vs 인클라인 컬 — 상완근 vs 상완이두 분화

**허리·요추**
- Saraceni N, et al. To flex or not to flex? Is there a relationship between lumbar spine flexion during lifting and low back pain? A systematic review with meta-analysis. *JOSPT* 50(3):121-130 (2020). doi:10.2519/jospt.2020.9218
- Berglund L, Aasa B, Michaelson P, Aasa U. Which patients with low back pain benefit from deadlift training? *JSCR* 29(7):1803-1811 (2015).
- Tensions of Low-Back Pain and Lifting; Bridging Clinical Low-Back Pain and Occupational Lifting Guidelines. *J Occup Rehabil* 34:473-480 (2024). doi:10.1007/s10926-024-10210-1
- Callaghan JP & McGill SM (2001), Marshall LW & McGill SM (2010), Cappozzo A (1985) — 앱이 이미 인용 중(기전·시체/동물 모델)
