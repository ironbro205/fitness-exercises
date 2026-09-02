> 조사일: 2026-09-02 · 재검증+보강 · 코드 수정 없음

# v2 재조사 — 강도(실패 근접도·RIR) · 반복 범위 · 점진적 과부하 · 1RM 추정

담당 범위: 실패 근접도(RIR) 처방, 반복 범위(클래스별 repMin/repMax), 더블 프로그레션 증량 규칙, e1RM 공식과 반복 상한, 첫 시도 무게(%1RM).
범위 밖: 볼륨·빈도·분할, 세트법(스킴), 휴식 시간, 웜업, 카디오, 영양.

---

## 0. 한 장 요약 (결론 5줄)

1. **큰 그림은 그대로 유효하다.** "RIR 1~3에서 멈춘다 · 5~30회 모두 유효 · 더블 프로그레션" 세 축은 2026년 근거로도 흔들리지 않는다. 오히려 **ACSM이 2026년 3월 17년 만에 지침을 개정하며 %1RM 대신 RIR을 1차 강도 지표로 채택**해(Currier 2026, 137개 체계적 고찰 종합) 앱의 방향과 같은 쪽으로 움직였다.
2. **가장 확실한 결함은 "첫 시도 무게"다.** `domain.js`는 클래스 무관 **1RM의 70% 일괄**, `ai.js` 프롬프트는 **메인75/보조68/고립62%** — 두 값이 서로 모르는 채 공존한다. 게다가 70%는 실패까지 가면 평균 **약 15회**가 나오는 무게라(Nuzzo 2024 메타회귀, 269편·7,270명), 5~8회를 시키는 고중량 복합에는 **한 클래스만큼 가볍다**.
3. **반복↔%1RM은 종목마다 다르다 — 앱의 단일 근사표는 하체 머신에서 크게 빗나간다.** 같은 70% 1RM에서 벤치프레스 ≈ 11~14회, 레그프레스 ≈ 19회다(Nuzzo 2024). 앱의 `10회≈73%`를 레그프레스·핵스쿼트에 그대로 쓰면 **10%p 넘게 가벼운 무게**가 나온다.
4. **증량 "트리거"보다 증량 "폭"이 문제다.** 1세션 vs 2세션 연속은 어느 쪽도 RCT 근거가 없는 실무 관례지만(둘 다 무해), 장비 단위 절대값 증량(그 외 5kg)은 가벼운 머신·케이블에서 **한 번에 +20~25%**가 되어 ACSM의 2~10% 권고를 크게 넘는다. 앱은 어시스트 종목에만 이 가드(`ASSIST_JUMP_WARN_PCT`=0.10)를 걸어 두었다.
5. **e1RM의 RIR 미반영은 "추세 추적"에는 거의 무해하고 "무게 처방"에는 유해하다.** 같은 종목·같은 목표 RIR이면 편향이 상수라 롤링 최고 e1RM의 **추세는 그대로 맞다**. 반면 그 e1RM에 %를 곱해 무게를 뽑는 경로(`suggestWorkingWeight`)에서는 편향이 그대로 무게 오차가 된다. 우선순위를 이렇게 갈라야 한다.

---

## 1. 현재 주장 표

### 1-A. 실패 근접도(RIR)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| A1 | 본세트는 실패 1~3회 전에서 멈춘다 | RIR 1~3 | `js/data.js:1392` (COACH_KNOWLEDGE §1) |
| A2 | 클래스별 RIR 밴드 차등 | 복합 RIR 2~3 / 고립·머신 RIR 0~2(마지막 세트만 0~1) | `js/ai.js:1213` |
| A3 | 무거운 바벨 복합엔 완전 실패 금지 | RIR 0 금지 | `js/ai.js:1214` |
| A4 | RIR은 소프트 기준, 게이트 아님 | "자가 보고라 부정확" 명시 | `js/ai.js:1215` |
| A5 | 회복 모드 RIR 상향 | RPE≥8.5 또는 컨디션≤2 → 복합 RIR 3~4 | `js/ai.js:1277` |
| A6 | 디로드 RIR | RIR 3~4 | `js/ai.js:1284` |
| A7 | RIR이 진행 로직에 쓰이는가 | **안 쓰임** — 코드는 오직 "상단 반복 달성 여부"만 본다. 세트 객체에 `rir` 필드 없음 | `js/domain.js:345-488` |

### 1-B. 반복 범위

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| B1 | 반복 5~30회 근비대 동등 | 실패 근접 시 동등 | `js/data.js:1393` |
| B2 | 클래스별 처방 범위(코드) | compound_heavy 5-8 / compound_moderate 8-12 / isolation 12-15 / light_isolation 15-25 / rehab 15-20 | `js/data.js:491-497` |
| B3 | 클래스별 처방 범위(프롬프트) | 메인 복합 6-10 / 보조 복합 8-12 / 고립 10-20 / 소근육 고립 12-25 | `js/ai.js:1217-1222` |
| B4 | 근력 편향 5-8은 쓰지 않는다 | 프롬프트 명시 | `js/ai.js:1222` |
| B5 | 소근육 고립은 고반복 통제 | 12~25회, 30회 초과 금지 | `js/ai.js:1224-1227` |
| B6 | 계획서 원안 | 메인 5-8 → 6-10 재조정 | `docs/ai-routine-improvement-plan.md` §③ |

> ⚠️ **B2와 B3가 어긋난다.** 코드의 `compound_heavy`는 5-8인데 프롬프트는 "메인 복합 6-10, 5-8은 쓰지 않는다"라고 지시한다. `isolation`도 코드 12-15 vs 프롬프트 10-20으로 다르다. AI가 만든 루틴의 반복 범위는 `clampRepsToClass`가 코드 범위로 클램프하므로 **최종적으로는 코드(5-8)가 이긴다** — 즉 프롬프트의 6-10 지시는 화면에서 무효다.

### 1-C. 점진적 과부하(더블 프로그레션)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| C1 | 더블 프로그레션이 기본 | 반복 먼저, 상단 달성 후 무게 | `js/data.js:1399`, `js/data.js:1459` |
| C2 | 증량 트리거(코드) | `doubleSessions`: compound_heavy 2 · compound_moderate 1 · isolation 1 · light_isolation 2 · rehab 0 | `js/data.js:491-497` |
| C3 | 증량 트리거(프롬프트·지식) | **"2세션 연속" 일괄** | `js/ai.js:1231`, `js/data.js:1399` |
| C4 | 증량 폭 | 덤벨 2kg · 그 외 5kg (절대값) | `js/domain.js:1648-1653` |
| C5 | 상단 달성 판정 | 가장 무거운 세트의 모든 워킹세트가 `repMax` 이상 | `js/domain.js:418-425` |
| C6 | 통증 가드 | 최근 14일 통증 기록 시 증량 금지 | `js/domain.js:398` |
| C7 | 재활 클래스 | 무게 진행 금지, 지표=통증 감소 | `js/domain.js:386-397` |
| C8 | 어시스트(역방향) | 진행 = 보조 무게 −한 칸, 0kg에서 졸업 | `js/domain.js:434-458` |
| C9 | 어시스트 점프 경고 | 실질 부하 +10% 초과 시 경고 (ACSM 2~10% 근거) | `js/domain.js:495-501` |

> ⚠️ **C2와 C3가 어긋난다.** 코드는 5개 클래스 중 2개만 2세션을 요구하는데, 프롬프트와 지식 베이스는 "2세션 연속"을 일괄 규칙으로 말한다. 사용자가 코치에게 "언제 올려요?"라고 물으면 중강도 복합·고립에서 앱 화면(1세션)과 코치 답변(2세션)이 다르다.

### 1-D. 1RM 추정(e1RM)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| D1 | e1RM 공식 | Epley `w × (1 + reps/30)`, **RIR 미반영** | `js/domain.js:36-40` |
| D2 | 추적 1RM = 최근 N세션 최고 e1RM | 윈도우 4세션 | `js/domain.js:584`, `:610` |
| D3 | e1RM 반복 절대 상한 | 12회 | `js/domain.js:585` |
| D4 | e1RM 반복 기본 상한 | 10회, 단 그 종목 `repMax` 아래로는 안 내림 | `js/domain.js:602-608` |
| D5 | 첫 시도 무게(코드) | `suggestWorkingWeight(name, 0.7)` — **클래스 무관 70% 일괄** | `js/domain.js:361` |
| D6 | 첫 시도 무게(프롬프트) | 메인 ~75% / 보조 ~68% / 고립 ~62% | `js/ai.js:698` |
| D7 | 반복→%1RM 근사표 | 6회≈82% · 8회≈77% · 10회≈73% · 12회≈68% · 15회≈65% | `js/ai.js:1233` |
| D8 | 실제 수행 우선 | "1RM 표보다 최근 실제 수행 우선" | `js/ai.js:1230` |
| D9 | 감사 지적(미착수) | RIR 미반영 · 상한 12→10 권고 | `docs/research/ai-coaching-audit.md` §1-11② |

### 1-E. 이 주제에서 테스트가 잠근 값 (바꾸면 즉시 깨지는 곳)

| 잠긴 값 | 테스트 위치 | 이 조사의 권고와 충돌하는가 |
|---|---|---|
| `calculate1RM(100,5)=116.7` · `(80,10)=106.7` | `tests/characterization.test.mjs:54-60` | **충돌 없음** — §4 #14는 공식을 바꾸지 말라고 권고 |
| `suggestWorkingWeight(레그프레스, 0.7)=150` | `:71-74` | **충돌 없음** — 이 테스트는 0.7을 인자로 직접 넘긴다. §4 #1은 호출부(`domain.js:361`)의 인자만 바꾼다 |
| `calculateRollingMax1RM` 값(233.3/215.8) · 처방상단 미만 컷 금지(랫풀다운 12·데드리프트 10) | `:81-115` | **주의** — §4 #5(compound_heavy 5-8→6-10)는 데드리프트의 `repMax`를 8→10으로 올린다. `rolling1RMMaxReps` = `min(12, max(10, 10))` = **10 유지**라 이 테스트는 그대로 통과할 것으로 보이나 실행 확인 필요 |
| `getVolumeThresholds` 4/10/20 · 3/8/16 | `:1805-1814` | 범위 밖 |
| 처방 한 줄·세트구조 문구가 엔진 계산값과 일치 | `:3194-3315` | **주의** — §4 #5·#6·#7(반복 범위 변경)이 화면 처방 문구를 바꾼다 |
| 전역 함수/데이터 이름 목록(499+67) | `tests/golden-symbols.json` | §4 #8이 새 상수를 만들면 목록 갱신 필요. `ASSIST_JUMP_WARN_PCT` 재사용이면 불필요 |

---

## 2. 재검증 결과

판정: **견고**(메타분석 2건↑ 일치) / **잠정**(단일 RCT·논쟁 중·전문가 합의) / **반박됨** / **근거 없음**(통념)

### 2-0. 2024~2026에 실제로 바뀐 것

앱의 강도·진행 지식은 2021~2023년 근거 위에 서 있다. 그 뒤 3년간 이 주제에서 실제로 움직인 것은 셋뿐이고, **셋 다 앱의 방향을 지지하되 세부 수치 한 곳씩을 흔든다.**

1. **실패 근접도가 "이분법"에서 "연속선"이 됐다.** 2023년까지는 "실패 vs 비실패"를 비교했고 결론은 "차이 사소"였다. 2024년 Robinson의 메타회귀는 이걸 RIR 연속 변수로 다시 돌려 **근비대는 실패에 가까울수록 조금씩 늘고, 근력은 무관**하며, 그 관계가 **부하에 따라 달라진다**는 것을 보였다. 앱의 "복합 2~3 / 고립 0~2" 차등이 우연히 이 결론과 맞는다 — 근거를 붙여야 할 자리다.
2. **기관 지침이 %1RM에서 RIR로 넘어갔다.** ACSM 2026 개정은 근비대 부하 범위를 30~100% 1RM으로 열고 강도를 노력(RIR)으로 정의했다. 앱이 이미 "실제 수행 우선"으로 설계돼 있어 구조를 바꿀 일은 없지만, **인용 문헌이 통째로 낡았다.**
3. **반복↔%1RM 표가 근거 기반으로 다시 그려졌다.** Nuzzo 2024가 269편을 합쳐 만든 표는 성별·나이·경력이 아니라 **종목**이 결정적이라고 말한다. 앱의 단일 근사표와 "70% 일괄" 첫 무게가 여기서 가장 크게 어긋난다.

나머지(반복 범위 동등성, 더블 프로그레션, Epley 공식)는 **새 근거가 없다** — 즉 뒤집히지도, 더 단단해지지도 않았다.

### 2-1. 실패 근접도

| 주장 | 판정 | 근거 |
|---|---|---|
| **A1·A2 "RIR 1~3(복합 2~3)에서 멈추면 완전 실패와 동등"** | **견고** | Refalo 2023 메타(15편): 실패 vs 비실패 근비대 이점은 사소함(ES 0.19, 95% CI 0.00–0.37). Grgic 2021 메타도 같은 결론. **ACSM 2026 포지션 스탠드**(137개 체계적 고찰·3만 명 종합)가 "실패 2~3회 전에서 멈추면 완전 실패와 같은 결과를 더 적은 피로·낮은 부상 위험으로 얻는다"로 공식화. |
| **A3 "무거운 바벨 복합에 RIR 0 금지"** | **견고(피로 근거)** | Refalo 2023 (Sports Med Open, 크로스오버 24명, 벤치 75% 1RM): 4분 뒤 속도 저하가 **실패 −25% / 1-RIR −13% / 3-RIR −8%**로 선형 증가. 24시간에 대부분 회복. 즉 실패까지 가면 같은 세션 남은 세트의 볼륨을 갉아먹는다. Robinson 2023(38명, 8주 RPE 4-6/7-9/7-9+/10군): 벤치 근력이 **10 RPE(전 세트 실패)군에서 오히려 가장 나빴다**(<1kg vs 9~10kg). |
| **"실패에 가까울수록 근비대는 조금씩 더 는다"(앱 미반영)** | **잠정** | Robinson 2024 메타회귀(Sports Med, DOI 10.1007/s40279-024-02069-2): 근비대 최적 모델 전부에서 RIR 기울기가 **음(−)** = 실패에 가까울수록 성장 ↑. 반면 근력은 RIR과 사실상 무관(신뢰구간이 0 포함). 단 저자들이 "포함 연구의 RIR을 사후 추정한 탐색적 분석"이라고 못 박았다. |
| **A2 "고립은 복합보다 실패에 더 가까이(RIR 0~2)"** | **잠정** | 직접 비교 RCT 없음. 간접 근거 둘: ① Robinson 2024의 **부하 의존성** — "무거운 부하는 그만큼 낮은 RIR을 요구하지 않을 수 있다"(가벼운 부하일수록 실패에 가까워야 고역치 운동단위가 다 동원됨). ② Refalo 2023 피로 데이터 — 실패의 대가가 큰 건 복합이고, 고립은 그 대가가 작다. 고립이 복합보다 더 잘 큰다는 뜻은 아니다(단·다관절 근비대 동등, 7편 메타). |
| **A4 "자가 보고 RIR은 부정확"** | **견고, 단 정도는 논쟁 중** | Halperin 2022 메타(Sports Med, 262 효과크기/12 클러스터): 평균 **0.95회 과소예측**(생각보다 더 할 수 있었다) — 생각보다 작은 오차. Steele 2017(PeerJ 5:e4105)은 경험이 적을수록 오차가 크다고 보고. Refalo 2024(벤치 75% 1RM, 훈련자 24명): 평균 오차 **0.65±0.78회**. Refalo 2025(8주 개입)는 **훈련하면서 RIR 정확도가 더 좋아졌다**고 보고. 공통 결론: **실패에 가까울수록, 반복수가 적을수록(≤12회), 상체일수록, 훈련 경험이 많을수록 정확해진다.** |
| **A5·A6 회복/디로드 RIR 상향** | **잠정** | 직접 RCT 없음(전문가 합의 수준). Robinson 2024가 "근력은 RIR에 둔감"하다고 했으므로, 피로한 주에 RIR을 올려도 근력 손실은 거의 없다는 간접 지지는 된다. |

### 2-2. 반복 범위

| 주장 | 판정 | 근거 |
|---|---|---|
| **B1 "5~30회 동등"** | **견고** | Schoenfeld 2017·2021 메타, Grgic 2018·2021. **ACSM 2026**이 근비대 부하 범위를 **30~100% 1RM**으로 공식 확대("부하가 아니라 노력이 중요"). 단 저부하는 실패에 더 가까워야 한다는 조건부다. |
| **B4 "근비대 목적에 5-8은 근력 편향"** | **잠정(실무 합의)** | 5-8회도 실패 근접이면 근비대는 동등하다(B1). 다만 ① 같은 시간에 담을 볼륨이 적고 ② 요추 축성 부하·관절 부담이 커서(허리디스크 이력 사용자에게 특히), ③ 6~12회가 시간 효율 스윗스팟이라는 것이 일관된 실무 권고다. **"5-8이 덜 큰다"는 근거는 없다** — 그렇게 말하면 안 된다. |
| **B2 `compound_heavy` 5-8** | **반박됨(앱 내부 모순으로서)** | 근거상 5-8 자체는 틀리지 않지만, 앱이 프롬프트에서 "5-8을 쓰지 않는다"고 지시해 놓고 코드가 5-8로 클램프하는 상태는 **둘 중 하나가 반드시 틀렸다.** 근비대 목적·60분 예산·허리 이력을 감안하면 **6-10으로 통일**이 맞다. |
| **B5 "소근육 고립 12~25, 30회 초과 금지"** | **잠정** | 30회 초과에서 근비대가 떨어진다는 직접 근거는 얇다(5~30회 범위 밖은 연구가 적다). 다만 "가벼울수록 반드시 실패 근처로"라는 조건은 Robinson 2024의 부하 의존성과 일치. 관절·승모근 개입 논리는 실무 근거. |
| **B2 `light_isolation` 15-25 + `doubleSessions` 2** | **잠정** | 반복 범위 자체는 무해. 다만 25회 상단을 2세션 연속 채워야 증량하는 구조는 진행이 매우 느려 사실상 "무게 고정"에 가깝다 — 코드 주석도 "무게보다 반복·템포·컨트롤로 진행"이라고 자인한다. |

### 2-3. 점진적 과부하

| 주장 | 판정 | 근거 |
|---|---|---|
| **C1 "더블 프로그레션"** | **잠정(견고에 가까움)** | Plotkin 2022(PeerJ, n=43, 8주, 하체 4종목): 무게 증가군 vs 반복 증가군 — 근비대·근력 **차이 없음**(1RM 스쿼트 차 2.0kg, 90% CI −2.4~7.8). 즉 두 축 중 무엇으로 진행하든 되고, 둘을 번갈아 쓰는 더블 프로그레션은 안전한 기본값이다. **"더블 프로그레션이 더 낫다"는 근거는 아니다.** ACSM 2026도 복잡한 주기화가 단순 점진 과부하를 일관되게 못 이겼다고 정리. |
| **C2·C3 "증량 트리거 = 2세션 연속 상단"** | **근거 없음(무해한 실무 관례)** | 어떤 RCT도 1세션 vs 2세션 연속을 비교하지 않았다. 유일한 기관 권고는 **ACSM 2009**: "목표 반복보다 **1~2회 더** 할 수 있으면 부하를 **2~10%** 올린다" — 즉 **1세션 기준**에 가깝다. 2세션 규칙은 측정 잡음을 걸러 주는 보수적 선택이라 해로울 건 없으나, 근거로 포장하면 안 된다. |
| **C4 "증량 폭 = 덤벨 2kg / 그 외 5kg"(절대값)** | **반박됨** | ACSM 2009는 **상대값 2~10%**를 권고한다. 절대 5kg은 100kg 레그프레스에서 5%(적정)지만 **20kg 케이블 푸시다운에서 25%**, 25kg 머신 리어델트에서 20%다. 덤벨 2kg도 10kg 레터럴 레이즈에서 20%다. 앱은 이 계산을 **어시스트 종목에만** 해 두었다(`ASSIST_JUMP_WARN_PCT`=0.10, 근거로 ACSM 2009를 명시). 같은 논리를 정방향 종목에 적용하지 않을 이유가 없다. |
| **C5 "모든 워킹세트가 상단이어야 증량"** | **잠정** | 표준 관행. 탑세트+백오프에서는 탑세트만 보게 되는 구조도 관행과 일치(코드 주석에 이미 근거 표기). |
| **C6 통증 14일 가드** | **근거 없음(안전 여유로 타당)** | 14일이라는 숫자에 근거는 없다. 안전 방향의 보수적 선택이라 유지 권장. |
| **C8·C9 어시스트 역방향** | **견고(산술)** | 실질 부하 = 체중 − 보조. `docs/research/assisted-progression.md`에서 이미 검증됨. |

### 2-4. 1RM 추정

| 주장 | 판정 | 근거 |
|---|---|---|
| **D1 Epley 채택** | **잠정(적절)** | Epley가 Brzycki보다 정확하다는 보고가 다수이나 논쟁적이며, **둘 다 반복 ≤10에서만 신뢰할 만하다**(Reynolds 2006 — 5RM이 최고 정확, Mayhew 2008, LeSuer 1997 — 데드리프트는 모든 공식이 과소추정). 굳이 바꿀 이유는 없다. |
| **D1 RIR 미반영** | **부분 반박됨** | 모든 e1RM 공식은 "그 세트가 실패까지 갔다"를 전제한다. 앱은 RIR 2~3을 처방하므로 e1RM은 **RIR 1당 약 2~3%씩 과소추정**된다. 다만 **편향이 상수**라 (a) 롤링 최고 e1RM의 **추세·PR 판정에는 거의 무해**하고, (b) **e1RM×%로 무게를 뽑는 경로에서는 그대로 오차**다. 감사(§1-11②)가 이 둘을 구분하지 않았다. |
| **D3·D4 반복 상한 12 / 기본 10** | **잠정 — 현행 구조가 낫다** | "10회 이하가 더 정확"은 견고하지만, 상한을 일괄 10으로 낮추면 8-12회를 처방받는 `compound_moderate` 종목(랫풀다운·시티드로우·머신 체스트프레스)의 본세트가 통째로 잘려 e1RM이 `null`이 되는 실증 결함이 이미 코드 주석에 기록돼 있다. **현행 `min(12, max(10, repMax))`가 근거와 구조를 모두 만족하는 유일한 타협이다 — 감사 권고(12→10)는 채택하면 안 된다.** |
| **D5 첫 시도 70% 일괄** | **반박됨** | Nuzzo 2024 메타회귀(Sports Med, DOI 10.1007/s40279-023-01937-7, 269편·7,270명·952회 실패반복 검사): 실패까지 갔을 때 **60%→약 24회, 70%→약 15회, 80%→약 9회, 90%→약 5회**. 즉 70%는 "15RM 무게"다. 5~8회를 처방하는 `compound_heavy`에 70%를 주면 **첫 세트가 목표 상단을 훌쩍 넘어 끝나고**, 15~25회를 처방하는 `light_isolation`에는 **너무 무겁다.** |
| **D6 클래스별 75/68/62%** | **잠정(방향 맞음, 값은 다소 가벼움)** | Nuzzo 표에 RIR 2~3 여유를 얹어 역산하면 중간 반복 기준으로 **고중량복합 ≈78~80% / 중강도복합 ≈72~74% / 고립 ≈66~68% / 경량고립 ≈58~61%**가 나온다. 앱 값은 방향은 맞고 일관되게 약 4~6%p 가볍다 — 신규 종목 첫 시도로는 안전한 쪽이라 허용 가능. **문제는 값이 아니라 D5와 따로 논다는 것.** |
| **D7 근사표(6≈82·8≈77·10≈73·12≈68·15≈65%)** | **잠정 — 종목별 차이 미반영이 결함** | Nuzzo 2024는 **벤치프레스와 레그프레스에 별도 표가 필요**하다고 결론냈다: 같은 70% 1RM에서 벤치 **약 11~14회**, 레그프레스 **약 19회**. 80%에서도 벤치 9회 vs 레그프레스 13회. 반면 **성별·나이·훈련 경력은 거의 영향이 없었다.** 앱의 단일 표는 상체 기준으로는 (RIR 여유 포함) 합리적이지만 **레그프레스·핵스쿼트에서는 10%p 이상 가볍다.** |
| **D8 "실제 수행 우선"** | **견고** | ACSM 2026이 %1RM 기반 처방을 RIR 기반으로 대체한 것과 정확히 같은 방향. 유지. |
| **"근비대에 1RM 추정이 꼭 필요한가"** | **필요 없다(견고) — 단 앱에는 두 군데 남는다** | 자가조절(RIR) 처방과 %1RM 처방은 근력·근비대 결과가 **차이 없다**(Graham & Cleather 2021 등, 자가조절 메타). ACSM 2026은 1RM 검사가 어려운 대상에 RIR을 1차 지표로 권고. 앱은 이미 실측 우선 구조라 e1RM이 필요한 곳은 **① 기록 없는 신규 종목의 첫 무게 ② PR 배지·추세 표시** 둘뿐이다. 그 이상으로 e1RM을 의사결정에 끌어들이면 안 된다. |

### 2-5. 서로 충돌하는 근거 (판정을 하나로 못 내린 지점)

| 쟁점 | 한쪽 | 반대쪽 | 이 조사의 처리 |
|---|---|---|---|
| 실패까지 가면 근비대가 더 느는가 | Robinson 2024 메타회귀: RIR 기울기 음(−) = 가까울수록 ↑ | Refalo 2023 메타: 이점 사소(ES 0.19, CI가 0을 포함), 하위분석에서 **비선형** 시사(0~1 RIR 구간은 오히려 수확 체감) | "0~3 RIR 안에서는 실질 차이가 작다"로 수렴. **밴드 숫자는 건드리지 않는다** |
| 초중급자의 RIR 자가 보고가 쓸 만한가 | Halperin 2022 메타: 평균 0.95회 오차 → 쓸 만함 | Steele 2017 및 2차 해설: 경험 적으면 4~5회까지 빗나감 | 앱은 이미 "게이트 아님"으로 처리 중 — 어느 쪽이 맞아도 현행이 안전 |
| ACSM 2026이 실패 근접도를 얼마나 강조했나 | 2차 요약: "RIR 2~3이 완전 실패와 동등" | ACSM 공식 페이지: "실패까지 훈련 등은 평균적 성인에게 **일관된 영향 없음**"(더 약한 표현) | 약한 쪽 표현을 채택 (§4 #12) |
| e1RM 반복 상한 | Reynolds 2006·Mayhew 2008: 10 이하가 확실히 정확 | 앱 코드 주석의 실증: 상한 10이면 8-12회 처방 종목의 e1RM이 `null`로 죽음 | **구조 제약이 이긴다** — 현행 `min(12, max(10, repMax))` 유지 (§4 #13) |
| 종목 교체 주기 | (범위 밖 — 이미 8~12주 유지로 수정 완료) | — | 이 조사에서 재확인만: Fonseca 2014·Baz-Valle 2019가 여전히 유효 |

---

## 3. 공백 — 앱에 없지만 코치가 알아야 할 것 (2024~2026 신규)

| # | 발견 | 출처 | 앱에 왜 중요한가 |
|---|---|---|---|
| G1 | **ACSM이 2026년 3월, 17년 만에 저항운동 지침을 개정**했다. %1RM 대신 **RIR을 1차 강도 지표**로 채택하고, 근비대 부하 범위를 **30~100% 1RM**, 볼륨 하한을 **부위당 주 10세트 이상**, 빈도 하한을 **주 2회**로 제시. 복잡한 주기화가 단순 점진 과부하를 일관되게 이기지 못했다고 명시. | Currier BS, D'Souza AC, Phillips SM 외. *Med Sci Sports Exerc* 58(4):851-872, 2026. PMID 41843416 | 앱 지식 베이스에 **가장 권위 있는 최신 1차 인용**이 통째로 빠져 있다. 지금 COACH_KNOWLEDGE는 2009 ACSM·2021 IUSCA를 인용한다. |
| G2 | **실패 근접도와 근비대의 관계는 부하 의존적**이다 — 가벼운 부하일수록 실패에 더 가까이 가야 하고, 무거운 부하는 그럴 필요가 덜하다. | Robinson ZP 외, *Sports Med* 2024, DOI 10.1007/s40279-024-02069-2 | 앱의 "복합 2~3 / 고립 0~2" 차등에 **처음으로 실질적 근거**가 생긴다. 지금은 근거 표기 없이 관행으로만 적혀 있다. |
| G3 | **전 세트 완전 실패는 근력을 오히려 떨어뜨릴 수 있다.** 8주 RCT에서 RPE 10(전 세트 실패)군 벤치 향상 <1kg vs RPE 4-6/7-9군 9~10kg. | Robinson ZP 외, *J Strength Cond Res* 2023 (SportRxiv 343) | 앱의 A3 규칙("무거운 바벨 복합 RIR 0 금지")을 **근력 손실**이라는 더 강한 이유로 뒷받침할 수 있다. |
| G4 | **반복↔%1RM 표가 근거 기반으로 갱신됐다.** 269편·7,270명 메타회귀. 성별·나이·훈련 경력은 영향 미미, **종목(특히 벤치 vs 레그프레스)은 크게 영향**. 표준편차까지 모델링. | Nuzzo JL, Pinto MD, Nosaka K, Steele J. *Sports Med* 54:303-321, 2024. DOI 10.1007/s40279-023-01937-7 | 앱의 근사표를 **하체 머신 보정** 한 줄로 크게 개선할 수 있다. |
| G5 | **RIR 자가 보고 정확도는 훈련하면서 좋아진다.** 8주 개입에서 RIR 1~4 조건군의 추정 정확도가 유의하게 향상. 훈련자 절대 오차는 평균 1회 미만. | Refalo MC 외, *J Sci Sport Exerc* 2025, DOI 10.1007/s42978-025-00338-8; Halperin I 외, *Sports Med* 52:377-390, 2022 | 앱이 RIR 입력을 받기 시작해도 **초중급자에게 쓸 만하다**는 근거가 된다(백로그 #7의 전제). |
| G6 | **대규모 실사용 데이터로 최적화된 새 e1RM 공식.** 14,966명·388종목·303,494 실패근접 세트. `1RM = w × (1 + (r−1)^0.85 / (−2.55 + 4.58·ln w))`. 고전 4개 공식 대비 **불일치 17~22% 감소**. 핵심 개선은 **변환 계수가 무게에 의존**한다는 점(가벼운 무게일수록 같은 %에서 반복이 더 나온다). | Marzagão T. arXiv:2603.17495, 2026-03-18 (SportRxiv 768) | 앱의 "고반복 세트는 e1RM에서 제외" 상한 규칙을 **공식 교체로 완화**할 수 있는 길. 단 동료심사 전 프리프린트. |
| G7 | **실패를 넘긴 신장 위치 부분반복이 종아리에서 우월**(10주, 6.7% vs 9.6%). | Larsen S 외, *Front Psychol* 2025;16:1494323 | 앱의 `light_isolation`(종아리 포함)이 "무게보다 반복·템포"로 진행하는 현재 설계와 맞물리는 대안 진행축. 단 단일 RCT·부위 특이적. |
| G8 | **진행 폭을 상대값으로 관리해야 한다**는 원칙이 앱 안에 이미 있는데(어시스트 종목) 정방향에는 없다. | ACSM 2009 position stand (Med Sci Sports Exerc 41:687-708) + `js/domain.js:495` | 코드 일관성 문제이자, 가벼운 고립 종목에서 **한 번에 20~25% 증량**이 실제로 일어난다. |
| G9 | **RIR 추정은 실패에 가까울수록·반복이 적을수록·상체일수록 정확하다.** 즉 앱이 RIR을 물어볼 자리는 **경량 고립 20회 세트가 아니라 복합 8회 세트**다. | Halperin 2022; Zourdos 2016·2021; Refalo 2024 | 백로그 #7(세트별 RIR 실측)을 설계할 때, 전 세트에 묻지 말고 **마지막 워킹세트 하나만** 묻는 편이 데이터 품질이 좋다. |
| G10 | **무게 진행이 막혔을 때의 대안 축이 "반복"만은 아니다.** Plotkin 2022는 무게·반복 어느 쪽으로 진행해도 결과가 같다고 했고, Larsen 2025는 실패 이후 신장 위치 부분반복이라는 제3의 축을 보였다. | Plotkin 2022; Larsen 2025 | `light_isolation`처럼 **사실상 무게가 안 오르는 클래스**(15-25회 상단을 2세션 연속 요구)에 "이건 정체가 아니라 설계"라고 설명할 근거가 생긴다. |
| G11 | **일반 성인에게 복잡한 주기화는 단순 점진 과부하를 일관되게 못 이겼다.** | ACSM 2026 (Currier) | 앱의 5주 사이클(빌드4+디로드1)을 "성장 부스터"로 홍보하면 안 된다는 기존 판단을 기관 지침이 뒷받침한다. |

---

## 4. 앱 반영 수치 표 (핵심 산출물)

범례: **[코드]** = 견고 → 상수/로직 변경 후보 · **[프롬프트]** = 잠정 → 안내 문구로만 · **[삭제]** = 반박됨·근거 없음

| # | 항목 | 현재 값 | 권장 값 | 근거 등급 | 반영 위치 | 바뀌면 달라지는 것 |
|---|---|---|---|---|---|---|
| **1** | 신규 종목 첫 시도 무게 | `suggestWorkingWeight(name, **0.7**)` 일괄 | **클래스별**: compound_heavy **0.78** · compound_moderate **0.72** · isolation **0.66** · light_isolation **0.60** · rehab 현행 유지 | 견고 (Nuzzo 2024) → **[코드]** | `js/domain.js:361` | 새 종목 첫 세트가 목표 반복 범위 안에서 끝난다. 지금은 고중량 복합에서 상단을 훌쩍 넘고, 경량 고립에서는 목표 반복을 못 채운다. |
| **2** | 첫 시도 %가 두 곳에 따로 존재 | 코드 70% vs 프롬프트 75/68/62% | **#1의 한 표로 통일**하고 프롬프트는 그 표를 인용 | 견고(모순 제거) → **[코드+프롬프트]** | `js/domain.js:361` · `js/ai.js:698` | 세션 화면 무게와 AI 루틴 무게가 같아진다. 지금은 같은 신규 종목에 두 값이 나온다. |
| **3** | 반복→%1RM 근사표 | 6≈82 · 8≈77 · 10≈73 · 12≈68 · 15≈65% (전 종목 동일) | 상체·일반은 **현행 유지**(RIR 2 여유를 포함한 값이라고 명시), **하체 머신(레그프레스·핵스쿼트·레그컬/익스텐션)만 +8%p** | 견고 (Nuzzo 2024: 70%에서 벤치 11~14회 vs 레그프레스 19회) → **[프롬프트]** | `js/ai.js:1233` | 레그프레스 신규 처방이 지금처럼 우스울 만큼 가볍지 않다. |
| **4** | 근사표의 정체 표기 | "집단 평균 추정치" | "**실패까지 갔을 때가 아니라 RIR 2~3을 남겼을 때** 기준" 한 줄 추가 | 견고 → **[프롬프트]** | `js/ai.js:1233` | AI가 표를 실패 기준으로 오해해 과소 처방하는 일이 준다. |
| **5** | `compound_heavy` 반복 범위 | **5-8** | **6-10** | 잠정(실무 합의) + 앱 내부 모순 해소 → **[코드]** | `js/data.js:492` | 코드와 프롬프트(6-10)가 일치한다. 요추 부담이 줄고 60분 예산 안에 볼륨이 더 담긴다. e1RM 상한은 `min(12, max(10,10))=10`으로 **변화 없음**. |
| **6** | `isolation` 반복 범위 | 코드 **12-15** vs 프롬프트 10-20 | 코드 **10-15**로, 프롬프트도 10-15로 통일 | 잠정 → **[코드+프롬프트]** | `js/data.js:494` · `js/ai.js:1219` | 클램프로 잘려 사라지던 프롬프트 지시가 실제로 반영된다. |
| **7** | `light_isolation` 반복 범위 | 코드 15-25 vs 프롬프트 12-25 | **12-25로 통일** | 잠정 → **[코드+프롬프트]** | `js/data.js:495` · `js/ai.js:1219` | 위와 같음. |
| **8** | **증량 폭 상한 (신규)** | 없음(덤벨 2kg·그 외 5kg 절대값) | **증량 폭이 현재 무게의 10%를 넘으면 증량하지 않고 "반복으로 진행"으로 전환** + 그 이유를 note에 표시 | 견고 (ACSM 2009 2~10%; 앱이 어시스트에 이미 적용) → **[코드]** | `js/domain.js:345-488` (`getProgressiveRecommendation`), 상수는 `ASSIST_JUMP_WARN_PCT` 재사용 | 20kg 케이블에 +5kg(25%) 같은 점프가 사라진다. 지금은 다음 세션에 반복이 무너지고 사용자가 "왜 갑자기 못 하지"를 겪는다. |
| **9** | 증량 트리거 문구 | 코드 클래스별 1 또는 2 vs 프롬프트·지식 "2세션 연속" 일괄 | **프롬프트·지식을 코드에 맞춰 "종목 종류에 따라 1~2세션"으로 정정** | 근거 없음(관례) — **[프롬프트]**, 코드값은 그대로 | `js/ai.js:1231` · `js/data.js:1399` | 코치 답변과 화면 안내가 일치한다. |
| **10** | RIR 밴드 문구 | 지식 "RIR 1~3" vs 프롬프트 "복합 2~3 / 고립 0~2" | **"RIR 0~3, 기본 1~3. 부하가 가벼울수록 실패에 더 가까이"**로 통일하고 **부하 의존성 근거(Robinson 2024)를 명시** | 잠정 → **[프롬프트]** | `js/data.js:1392` · `js/ai.js:1213` | 고립을 왜 더 밀어야 하는지 코치가 설명할 수 있다. 지금은 근거 없이 숫자만 있다. |
| **11** | 실패 회피 근거 | "피로만 누적 (Refalo 2023)" | **"근력 향상 자체가 나빠질 수 있다(Robinson 2023: 전 세트 실패군 벤치 <1kg)"** 추가 | 잠정(단일 RCT) → **[프롬프트]** | `js/data.js:1392` | 사용자가 "실패까지 가야 큰다"고 물을 때 더 강한 답이 된다. |
| **12** | ACSM 인용 | 2009 포지션 스탠드 | **ACSM 2026(Currier 외) 추가** — RIR 1차 지표, 근비대 30~100% 1RM, 주 10세트 하한 | 견고 → **[프롬프트]** | `js/data.js` COACH_KNOWLEDGE §1·§9 | 지식 베이스가 최신 기관 지침을 인용한다. |
| **13** | e1RM 반복 상한 12 → 10 | 감사(§1-11②)·계획서 5c의 권고 | **채택하지 않음 — 현행 `min(12, max(10, repMax))` 유지** | 견고(현행 우세) → **[삭제 — 백로그에서 내림]** | `js/domain.js:585-608` | 8-12회 처방 종목의 e1RM이 `null`로 죽는 실증 결함을 피한다. 코드 주석이 이미 이유를 적어 두었다. |
| **14** | e1RM에 RIR 반영 | 미반영 | **추세·PR용은 현행 유지**(편향 상수라 무해). **무게 처방 경로만** #1의 클래스별 %로 대신한다. 세트별 RIR 실측(백로그 #7)이 들어오면 `calculate1RM(w, reps + rir)`로 확장 | 잠정 → **[프롬프트/백로그]**, 지금은 코드 변경 없음 | `js/domain.js:36` | 골든 테스트(`calculate1RM(100,5)=116.7`)를 깨지 않으면서 실제 문제(무게 오차)만 고친다. |
| **15** | e1RM 라벨 | "1RM" | 화면 문구를 **"추정 1RM"**으로 (이미 일부 그러함 — 전수 점검 대상) | 견고 → **[프롬프트/문구]** | `js/screens.js` 전반 | 사용자가 이 숫자를 실측으로 오해하지 않는다. |
| **16** | 통증 14일 증량 금지 | 14일 | **유지** (근거 없음이나 안전 방향) | 근거 없음 → **[유지]** | `js/domain.js:398` | — |
| **17** | 새 e1RM 공식(무게 의존) | Epley | **지금은 채택하지 않음.** 프리프린트 단계·골든 테스트 전면 재작성 필요. 백로그로 기록만 | 잠정(프리프린트) → **[백로그]** | `js/domain.js:36` | — |

### 4-1. 권장 %1RM 표의 산출 근거 (검산용)

Nuzzo 2024 일반 모델(실패까지): 60%→24회 · 70%→15회 · 80%→9회 · 90%→5회. 여기에 **RIR 2~3 여유**를 얹으면 "목표 N회를 RIR 2로 끝내는 무게" = "(N+2)RM 무게"다.

| 클래스 | 처방 범위 | 첫 시도 목표(중간) | +RIR 2 = 실질 RM | 일반 모델 %1RM | 권장 채택값 | 하체 머신 보정 |
|---|---|---|---|---|---|---|
| compound_heavy | 6-10 (권장) | 8회 | 10RM | ≈78% | **0.78** | +8%p → 0.86 |
| compound_moderate | 8-12 | 10회 | 12RM | ≈74% | **0.72** (안전측) | +8%p → 0.80 |
| isolation | 10-15 | 13회 | 15RM | ≈70% | **0.66** (안전측) | — |
| light_isolation | 12-25 | 18회 | 20RM | ≈64% | **0.60** (안전측) | — |

> 채택값을 산출값보다 2~4%p 낮게 잡은 이유: Nuzzo 표의 **표준편차가 크고**(70% 1RM에서 개인차 ±5회 이상), 신규 종목 첫 세트는 **가벼워서 생기는 손해(한 세트 낭비)가 무거워서 생기는 손해(폼 붕괴·부상)보다 훨씬 작기** 때문이다. 첫 세션 후에는 실측 우선 규칙(D8)이 이 값을 대체한다.

### 4-2. 우선순위

| 순위 | 항목 | 이유 |
|---|---|---|
| **P0** | #1·#2 (첫 무게 클래스별 통일) | 유일하게 "근거가 명확히 반박한" 값이고, 사용자가 매번 보는 숫자다 |
| **P0** | #8 (증량 폭 10% 상한) | 실제로 사용자가 겪는 결함이고, 같은 로직이 앱 안에 이미 있다 |
| **P1** | #5·#6·#7 (반복 범위 코드↔프롬프트 통일) | 지금 프롬프트 지시가 클램프에 잘려 무효다 |
| **P1** | #3·#4 (근사표 하체 보정·RIR 기준 명시) | 프롬프트 한 줄, 효과 큼 |
| **P2** | #9~#12 (문구·근거 정정) | 코치 답변 정확도 |
| **P3** | #13·#14·#17 (e1RM) | 현행 유지가 답이거나 백로그 |

### 4-3. 구현 시 연쇄 영향 (조사자가 본 것 — 실행 검증은 안 했다)

| 바꾸는 것 | 같이 움직이는 곳 | 확인해야 할 것 |
|---|---|---|
| #1 첫 시도 % 클래스별 | `getProgressiveRecommendation` 첫 시도 분기(`domain.js:361`)만. `suggestWorkingWeight` 자체는 그대로 | "기록 없음" 상태의 화면 처방 무게 스냅샷 테스트 |
| #5 `compound_heavy` 5-8 → 6-10 | ① `clampRepsToClass`가 쓰는 모든 화면 문구 ② `rolling1RMMaxReps`(계산상 10 유지) ③ `SET_SCHEMES.top_backoff`의 `repsDelta`(피라미드처럼 범위 밖으로 나가는 스킴은 클램프하지 않음) ④ 세션 시간 예산(고중량 복합 종목당 약 12분 가정 — 반복이 늘면 세트 시간도 는다) | `node --test tests/characterization.test.mjs`의 "처방 한 줄" 계열 |
| #6·#7 고립 범위 통일 | `light_isolation` 하단이 15→12로 내려가면 "경량 고립은 무게보다 반복" 안내 문구와의 정합 | 같은 테스트 |
| #8 증량 폭 10% 상한 | `getProgressiveRecommendation`의 `canProgress` 분기에 조건 하나 추가. note 문구가 늘어남(40자 규칙 주의) | 디자인 규칙 테스트(한 문장 40자·해요체) |
| #3 근사표 하체 보정 | 프롬프트 문자열만. `js/ai.js`는 디자인 규칙 검사 예외 | 프롬프트 캐싱 구조 테스트(`stable` 블록 크기 변화) |

**공통:** 어느 것을 건드리든 `service-worker.js`의 `CACHE_VERSION`을 올려야 폰에 반영된다.

---

## 5. 정직한 한계

1. **Robinson 2024는 탐색적이다.** 포함 연구 대부분이 RIR을 직접 보고하지 않아 저자들이 **사후 추정**했다. "실패에 가까울수록 근비대 ↑"는 방향은 믿을 만하지만, "RIR 1당 몇 %"라는 수치는 이 조사에서 **구하지 못했다**(Sports Medicine 본문과 Biolayne REPS 해설 모두 유료 장벽). 그래서 §4에서 RIR 밴드의 **숫자**를 바꾸자고 하지 않았다.
2. **자가 보고 RIR 정확도의 두 근거가 서로 다르다.** Halperin 2022 메타는 평균 과소예측 **0.95회**로 "생각보다 정확"이라 하고, Steele 2017과 여러 2차 해설은 초보자가 **4~5회**까지 빗나간다고 한다. 표본·과제·측정 시점이 달라 직접 비교가 어렵다. 앱은 이미 "RIR을 게이트로 쓰지 말라"고 하고 있으므로 **어느 쪽이 맞아도 현행 설계는 안전한 쪽**이다.
3. **ACSM 2026의 세부 수치를 1차 자료로 확인하지 못했다.** 저널 전문이 유료라 ACSM 공식 보도자료·인포그래픽·2차 요약으로 교차 확인했다. 그 과정에서 **불일치를 하나 발견했다**: 2차 요약들은 "RIR 2~3"을 강조하는데, **ACSM 공식 페이지 자체는 "실패까지 훈련하는 것 등은 평균적 성인에게 일관된 영향을 주지 않았다"는 더 약한 표현**을 쓴다. §4 #12는 이 약한 표현 쪽에 맞춰 적었다.
4. **Nuzzo 2024의 두 출처가 벤치프레스 70% 값에서 어긋난다**(11회 vs 14회). 원문 Table 1을 직접 열지 못해 **"11~14회"로 폭을 남겼다.** 하체 머신 보정폭 +8%p도 이 불확실성을 감안해 보수적으로 잡은 값이며, ±3%p 오차를 각오해야 한다.
5. **"1세션 vs 2세션 연속" 증량 트리거를 비교한 연구를 끝내 찾지 못했다.** 존재하지 않을 가능성이 높다. 그래서 코드값 변경 후보에서 뺐다.
6. **`light_isolation` 상단 25회 근처의 근거가 얇다.** 5~30회 동등성 연구 대부분이 30% 1RM 부근을 "저부하"로 다루는데, 앱의 경량 고립은 그보다 절대 부하가 훨씬 작다(레터럴 레이즈 8kg 등). 이 구간의 직접 데이터는 없다.
7. **Marzagão 2026(새 e1RM 공식)은 동료심사 전 프리프린트이고, 저자가 특정 피트니스 앱 데이터를 썼다**(선택 편향 가능 — 실제로 실패 근접이었는지 검증 불가). 흥미롭지만 지금 채택할 근거는 아니다.
8. **허리디스크 이력이 반복 범위 선택에 미치는 영향은 직접 근거를 찾지 못했다.** §2-2 B4에서 "요추 축성 부하" 논리를 든 것은 McGill 계열 실무 근거이지 반복 범위 RCT가 아니다.
9. **테스트 영향 미확인.** §4 #1·#5·#8은 `getProgressiveRecommendation`·`EXERCISE_CLASS_RULES` 골든값을 건드릴 가능성이 크다(다만 `suggestWorkingWeight(레그프레스, 0.7)=150` 테스트는 직접 호출이라 영향 없음). 실제 구현 전 `node --test tests/characterization.test.mjs`로 확인이 필요하다 — **이 조사에서는 코드를 실행하지 않았다.**

---

## 6. 출처

### 기관 지침
1. **Currier BS, D'Souza AC, Fiatarone Singh MA, … Phillips SM.** American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. *Med Sci Sports Exerc.* 2026;58(4):851-872. PMID 41843416. https://acsm.org/resistance-training-guidelines-update-2026/
2. **ACSM.** Progression Models in Resistance Training for Healthy Adults (Position Stand). *Med Sci Sports Exerc.* 2009;41(3):687-708. PMID 19204579. — "목표 반복보다 1~2회 더 가능하면 부하 2~10% 증가"

### 실패 근접도 · RIR
3. **Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ.** Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis. *Sports Med.* 2023;53(3):649-665. PMC9935748. — 실패 vs 비실패 ES 0.19 (95% CI 0.00–0.37)
4. **Robinson ZP, Pelland JC, Remmert JF, Refalo MC, Jukic I, Steele J, Zourdos MC.** Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. *Sports Med.* 2024;54:2209-2231. DOI 10.1007/s40279-024-02069-2. PMID 38970765. https://sportrxiv.org/index.php/server/preprint/view/295
5. **Refalo MC, Helms ER, Hamilton DL, Fyfe JJ.** Influence of Resistance Training Proximity-to-Failure, Determined by Repetitions-in-Reserve, on Neuromuscular Fatigue in Resistance-Trained Males and Females. *Sports Med Open.* 2023;9:10. PMC9908800. — 4분 후 속도 저하 실패 −25% / 1-RIR −13% / 3-RIR −8%
6. **Robinson ZP, Macarilla CT, Juber A, … Helms ER, Zourdos MC.** The Effect of Resistance Training Proximity to Failure on Muscular Adaptations and Longitudinal Fatigue in Trained Men. *J Strength Cond Res* / SportRxiv 343, 2023. https://sportrxiv.org/index.php/server/preprint/view/343 — 8주, 38명, RPE 4-6 / 7-9 / 7-9+ / 10
7. **Refalo MC 외.** Similar muscle hypertrophy following eight weeks of resistance training to momentary muscular failure or with repetitions-in-reserve. *J Sports Sci.* 2024;42(1). DOI 10.1080/02640414.2024.2321021
8. **Refalo MC 외.** Influence of Varying Proximity-to-Failure on Muscular Adaptations and Repetitions-in-Reserve Estimation Accuracy in Resistance-Trained Individuals. *J Sci Sport Exerc.* 2025. DOI 10.1007/s42978-025-00338-8
9. **Halperin I, Malleron T, Har-Nir I 외.** Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-analysis. *Sports Med.* 2022;52(2):377-390. DOI 10.1007/s40279-021-01559-x — 평균 0.95회 과소예측
10. **Steele J, Endres A, Fisher J, Gentil P, Giessing J.** Ability to predict repetitions to momentary failure is not perfectly accurate, though improves with resistance training experience. *PeerJ.* 2017;5:e4105.
11. **Zourdos MC, Klemp A, Dolan C 외.** Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve. *J Strength Cond Res.* 2016;30(1):267-275. — 속도-RPE 상관 숙련 r=−0.88 / 초보 r=−0.77
12. **Helms ER, Cronin J, Storey A, Zourdos MC.** Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. *Strength Cond J.* 2016;38(4):42-49. PMC4961270

### 반복 범위 · 부하
13. **Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW.** Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis. *J Strength Cond Res.* 2017;31(12):3508-3523. PMID 28834797
14. **Lopez P, Radaelli R, Taaffe DR 외.** Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis. *Med Sci Sports Exerc.* 2021;53(6):1206-1216. PMC8126497
15. **Pelland JC, Remmert JF, Robinson ZP 외.** The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain. *Sports Med.* 2026. DOI 10.1007/s40279-025-02344-w (볼륨 담당 조사와 중복 — 본 문서에서는 배경으로만 사용)

### 반복↔%1RM · 1RM 추정
16. **Nuzzo JL, Pinto MD, Nosaka K, Steele J.** Maximal Number of Repetitions at Percentages of the One Repetition Maximum: A Meta-Regression and Moderator Analysis of Sex, Age, Training Status, and Exercise. *Sports Med.* 2024;54:303-321. DOI 10.1007/s40279-023-01937-7. PMC10933212 — 일반 60%→24 / 70%→15 / 80%→9 / 90%→5회; 벤치 70%→11~14회 vs 레그프레스 70%→19회
17. **Hoeger WWK, Hopkins DR, Barette SL, Hale DF.** Relationship between Repetitions and Selected Percentages of One Repetition Maximum. *J Appl Sport Sci Res.* 1990;4(2):47-54. — 종목·개인 간 변동이 크다
18. **Richens B, Cleather DJ.** The relationship between the number of repetitions performed at given intensities is different in endurance and strength trained athletes. *Biol Sport.* 2014;31(2):157-161. — 레그프레스 70% 1RM에서 지구력 39.9회 vs 역도 17.9회
19. **Reynolds JM, Gordon TJ, Robergs RA.** Prediction of one repetition maximum strength from multiple repetition maximum testing and anthropometry. *J Strength Cond Res.* 2006;20(3):584-592. — 5RM이 가장 정확
20. **LeSuer DA, McCormick JH, Mayhew JL 외.** The accuracy of prediction equations for estimating 1-RM performance in the bench press, squat, and deadlift. *J Strength Cond Res.* 1997;11(4):211-213. — 데드리프트는 모든 공식이 과소추정
21. **Marzagão T.** A Weight-Dependent 1RM Prediction Equation Optimized on 303,494 Near-Failure Sets Across 388 Exercises. arXiv:2603.17495, 2026-03-18. https://arxiv.org/abs/2603.17495 (프리프린트) — 고전 4공식 대비 불일치 17~22% 감소

### 점진적 과부하 · 자가조절
22. **Plotkin D, Coleman M, Van Every D 외, Schoenfeld BJ.** Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. *PeerJ.* 2022;10:e14142. PMC9528903 — n=43, 8주, 무게 증가군 vs 반복 증가군 차이 없음
23. **Graham T, Cleather DJ 외.** The Effect of Load and Volume Autoregulation on Muscular Strength and Hypertrophy: A Systematic Review and Meta-Analysis. *Sports Med Open.* 2021;7:88. PMC8762534 — 자가조절(RIR) vs %1RM 처방 차이 없음
24. **Larsen S, Swinton P, Sandberg N 외, Wolf M.** Resistance training beyond momentary failure: the effects of past-failure partials on muscle hypertrophy in the gastrocnemius. *Front Psychol.* 2025;16:1494323. — 6.7% vs 9.6%

### 앱 내부 문서
25. `docs/research/ai-coaching-audit.md` §1-11②, §2 표 5c (2026-08-08)
26. `docs/ai-routine-improvement-plan.md` §③ §④ (2026-07-05)
27. `docs/research/assisted-progression.md` — `ASSIST_JUMP_WARN_PCT` 근거
28. `docs/research/set-schemes.md` §2-B ⚠️ · §5-D — 탑세트 증량 판정 완화의 의도된 근거
