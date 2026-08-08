> 생성: 2026-08-08 · 연구 1/3 (세트 구성 + 휴식시간) · **코드 변경 없음 — 조사 보고서**
> 대상 사용자 전제: 1인 비선수 **초중급자**, 목표 = **근비대**. 앱이 세트법을 자동 배정하되 사용자가 종목별로 바꿀 수 있어야 함.

# 헬스앱 세트 구성(세트 스킴) · 휴식시간 근거 보고서

## 0) 한 장 요약 — 결론부터

**가장 중요한 발견: "세트법을 바꾸면 근육이 더 큰다"는 근거는 없다.** 볼륨(총 세트 수)을 맞추면 스트레이트 세트·피라미드·드롭세트가 12주 근비대에서 **통계적으로 동일**했다(Angleri 2017: 근단면적 +7.6% / +7.5% / +7.8%). 드롭세트 메타분석도 마찬가지(SMD 0.155, p=0.392).

그래서 이 보고서는 "더 좋은 세트법으로 갈아타자"가 아니라 **"세트법마다 잘 푸는 문제가 다르니, 문제에 맞춰 배정하자"** 는 입장을 권한다.

| 무엇을 | 어떻게 | 왜 (근거 등급) |
|---|---|---|
| **기본은 스트레이트 유지** | `compound_moderate` · `isolation` · `light_isolation` · `rehab` = 지금 그대로 3세트 동일 무게 | 세트법 간 근비대 차이 없음 → 가장 단순한 안 (**높음**) |
| **고중량 복합만 탑세트+백오프** | `compound_heavy` = 탑세트 1 + 백오프 2세트(탑의 **90%**) | 고중량 3세트 동일무게는 뒤 세트 반복이 무너져 볼륨 로드 손실. 백오프가 이를 보존 (**낮음 — 실무 합의**) |
| **휴식시간을 올린다** | 고중량복합 180초 / 중강도복합 150초 / 고립 120초 / 경량고립 90초 / 재활 60초 | 훈련자에서 3분 > 1분(Schoenfeld 2016). 현행 고립 90초는 짧음 (**중간**) |
| **드롭세트는 "시간 절약 옵션"으로만** | 머신·케이블 고립 종목의 **마지막 세트에만**, 조건 충족 시 제안 | 근비대는 동등하지만 시간은 1/2~1/3 (**높음**) |
| **피라미드·역피라미드는 기본 배정 안 함** | 사용자가 원하면 고를 수 있는 옵션으로만 | 근비대 우위 근거 없음. 오름 피라미드는 초반 세트가 자극 미달 위험 (**중간**) |

---

## 1) 세트법별 정의 · 근거 · 출처

용어를 먼저 풀어둔다.
- **워킹세트**: 실제로 근육을 자극하는 본 세트(워밍업 제외).
- **볼륨 로드**: 무게 × 반복 × 세트를 합한 총량. "얼마나 많은 일을 했나".
- **RIR (Reps In Reserve)**: 그 세트에서 **더 할 수 있었던 반복 수**. RIR 2 = "2회 더 할 수 있었다".
- **실패(failure)**: 더는 한 번도 못 드는 지점. RIR 0.

### 1-A. 스트레이트 세트 (straight sets) — 지금 앱의 방식

**정의**: 모든 워킹세트를 같은 무게, 같은 목표 반복으로.
예: 벤치 60kg × 8회 × 3세트.

**근거**
- Angleri 등(2017, *Eur J Appl Physiol*): 잘 훈련된 남성 32명, **다리별 무작위 배정**(같은 사람의 좌·우 다리에 다른 방식 적용 → 개인차가 결과를 오염시키지 않음), 12주. 전통(TRAD, 3~5세트 6~12회 @75%1RM) vs 오름 피라미드(CP) vs 드롭세트(DS). **근단면적(CSA) 증가: TRAD +7.6%, CP +7.5%, DS +7.8% — 차이 없음.** 레그프레스·레그익스텐션 1RM도 동일.
- 이 결과는 "세트법은 근비대의 주된 변수가 아니다"라는 뜻이다. 주된 변수는 **주간 볼륨**과 **실패 근접도**다.

**약점 (앱에서 실제로 문제가 되는 지점)**
- 무게를 고정하면 피로가 쌓여 뒤 세트 반복이 떨어진다. 8회 목표인데 8 / 6 / 5회가 되는 식. **이 자체는 정상이고 나쁜 게 아니다.**
- 그런데 앱의 증량 판정(`js/domain.js` 내 `reachedTopAt`)은 `every(s => s.reps >= topReps)` — **그 무게의 모든 세트가 범위 상단을 채워야** 증량한다. 고중량 복합에서 이 기준은 매우 빡세서, 반복이 정상적으로 떨어지는 사람은 증량이 계속 막힌다.
- → 고중량 복합에 한해 탑세트+백오프를 쓰면 이 문제가 구조적으로 풀린다(§2-B에서 설명).

**출처**
- [Angleri et al. 2017 — Crescent pyramid and drop-set systems do not promote greater strength gains… (PubMed)](https://pubmed.ncbi.nlm.nih.gov/28130627/) / [Springer 원문](https://link.springer.com/article/10.1007/s00421-016-3529-1)

---

### 1-B. 탑세트 + 백오프 (top set + back-off sets)

**정의**: 그날 가장 무거운 1세트(**탑세트**)를 먼저 하고, 무게를 낮춰 2~3세트를 더 한다(**백오프**).
예: 벤치 탑세트 70kg × 6회 → 백오프 65kg × 6회 × 2세트.

**근거 — 정직하게 말하면 "직접 RCT 증거는 없다"**
탑세트+백오프가 스트레이트보다 근육을 더 키운다는 무작위 대조시험은 확인되지 않았다. 이 방식의 정당성은 **세 가지 간접 논리**에서 나온다.

1. **볼륨 로드 보존** — 휴식시간 메타분석(Frontiers 2024)이 "긴 휴식이 유리한 이유는 세트 간 반복 수를 지켜주기 때문"이라고 설명한다. 백오프는 **무게를 낮춰서** 같은 일을 한다. 메커니즘이 동일하다.
2. **자가조절(autoregulation)** — 탑세트 결과로 그날 컨디션을 읽고 백오프 무게를 조정할 수 있다. Helms의 RPE 기반 처방과 같은 논리.
3. **1RM 추정 신선도** — 탑세트는 낮은 반복·고중량이라 Epley 공식(`calculate1RM`)의 신뢰도가 높다. 앱은 이미 `ROLLING_1RM_MAX_REPS` 초과(12회 초과) 세트를 1RM 갱신에서 제외하고 있는데, 탑세트는 항상 이 조건을 만족한다.

**실무 감량폭 권장치 (여러 출처 종합)**
- 보수적: 탑세트의 **-5~15%** (탑세트가 깔끔하게 끝났을 때)
- 근비대 지향: **-20~30%** (전신 피로가 큰 종목, 탑세트가 한계였을 때)
- 흔히 인용되는 범위: 백오프 = 탑세트의 **70~85%**, 3~5세트 6~12회

→ **앱 권장값은 90% (-10%)**. 이유는 §2-B의 "장비 단위" 문제 때문. **근거 등급: 낮음(실무 합의).**

**출처**
- [Andy Baker — Top Set / Back Off Set Programming](https://www.andybaker.com/top-set-back-off-set-programming/)
- [Arvo — Top Set + Backoff Sets: Complete Guide](https://arvo.guru/resources/top-set-backoff)
- [Frontiers 2024 — Give it a rest (볼륨 로드 보존 메커니즘)](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full)

---

### 1-C. 오름 피라미드 (pyramid / crescent pyramid)

**정의**: 세트마다 무게를 올리고 반복을 줄인다. 예: 50kg×12 → 60kg×10 → 70kg×8.

**근거**
- Angleri 2017에서 전통 방식과 **완전히 동일**(CSA +7.5% vs +7.6%).
- 이론적 약점: 초반 가벼운 세트는 실패에서 멀어 **자극 세트가 되지 못할 위험**이 있다. Robinson 등(2024) 메타회귀는 "실패에 가까울수록 근비대가 커지되 약 2 RIR 이후로는 기울기가 평탄해진다"고 보고했다. 12회 목표에 RIR 5~6짜리 첫 세트는 사실상 **워밍업을 워킹세트로 위장**하는 셈이다.

**권장: 앱에서 기본 배정하지 않는다.**

**출처**
- [Angleri et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28130627/)
- [Robinson et al. 2024 — Dose–Response … Proximity to Failure (Sports Medicine)](https://link.springer.com/article/10.1007/s40279-024-02069-2)

---

### 1-D. 역피라미드 (reverse pyramid, RPT)

**정의**: 첫 세트가 가장 무겁고 이후 세트마다 감량. 예: 70kg×6 → 62kg×8 → 55kg×10.

**근거**
- **직접 연구가 매우 희박하다.** 확인된 것은 *World Journal of Sports Sciences*의 미훈련 여성 대상 연구 하나로, 역피라미드가 이두 근력에서 소폭 우세했으나 **근손상 지표도 더 높았다**. 근비대 우위 증거는 아니다.
- 실질적으로 **탑세트+백오프의 다세트 버전**이다. 별도 스킴으로 유지할 실익이 낮다.

**권장: 기본 배정 안 함. 사용자가 원하면 고르는 옵션으로만.**

**출처**
- [A Workout Routine — Pyramid Sets vs Reverse Pyramid vs Straight Sets](https://www.aworkoutroutine.com/pyramid-sets-vs-reverse-pyramid-training-vs-straight-sets/)
- [Cathe — Straight Pyramids or Reverse Pyramids?](https://cathe.com/pyramid-training-are-straight-pyramids-or-reverse-pyramids-more-effective/)

---

### 1-E. 드롭세트 (drop set)

**정의**: 한 세트를 실패(또는 실패 직전)까지 → **휴식 없이 즉시** 무게를 낮춰 다시 실패까지. 1~2회 반복.

**근거 — 여기는 증거가 탄탄하다**
- **Sødal 등(2023, *Sports Medicine – Open*) 메타분석**: 5개 연구, 142명(남 114·여 28). 드롭세트 vs 전통 **집단 간 차이 없음 (SMD 0.155, 95% CI −0.199~0.509, p = 0.392)**. 두 방식 모두 기준선 대비 유의하게 증가.
- **시간 절약이 핵심 이점**: 보고된 두 연구에서 드롭세트 145.4±21초 vs 전통 315.8±42.2초, 그리고 2.1±0.1분 vs 6.8±0.13분. → **전통의 1/2~1/3 시간**.
- 저자 권장: **시간 제약이 있는 사람**, 그리고 **머신 기반 종목**("안정성이 높아 실패 지점에 도달해도 부상 위험이 낮다").
- Coleman 등(2022) 메타분석도 "trivial 효과크기, 드롭세트가 근소 우세하나 실질 동등"으로 같은 결론.
- Angleri 2017의 DS 프로토콜은 **~50~75% 1RM 구간을 훑으며 실패까지** 수행했다 → 실제 감량폭 설계의 근거.

**비용 (자동 남용을 막아야 하는 이유)**
- 드롭세트는 급성 피로와 신경근 수행 저하가 크다. 매 세션·모든 종목에 적용하면 회복을 잠식한다. → **빈도 상한과 적용 조건이 필요**(§4).

**출처**
- [Sødal et al. 2023 — Effects of Drop Sets on Skeletal Muscle Hypertrophy: SR & Meta-analysis (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10390395/)
- [Coleman et al. — Muscular Adaptations in Drop Set vs. Traditional Training: A meta-analysis](https://journal.iusca.org/index.php/Journal/article/view/135)
- [Acute and Chronic Effects of Drop-Set Training: A Meta-Analysis (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC13043944/)

---

### 1-F. 레스트-포즈 / 마이오렙 (rest-pause / myo-reps) — 드롭세트의 프리웨이트 대안

**정의**: 실패 근접까지 1세트(활성화 세트) → **짧은 휴식(15~30초, 또는 깊은 호흡 3~5회)** → 미니세트 3~5회 → 반복. 무게는 그대로 둔다.

**근거**
- Prestes 등: 레스트-포즈·드롭세트가 전통 세트와 **근력·근비대 동등**.
- 마이오렙 8주 RCT: 전통 3×12 대비 **근비대 동등**, 총 반복 약 **30% 적고**, 훈련 시간 약 **70% 절약**.

**드롭세트 대비 장점**: 무게를 바꿀 필요가 없어 **덤벨·바벨에서도 안전**하다. 드롭세트가 머신·케이블에 한정되는 것과 대비된다.

**출처**
- [Prestes et al. — Rest-pause and drop-set training elicit similar strength and hypertrophy adaptations (PubMed)](https://pubmed.ncbi.nlm.nih.gov/34260860/)
- [Myo-Reps vs. Traditional Straight-Sets in Resistance-Trained Men (PubMed)](https://pubmed.ncbi.nlm.nih.gov/42112925/)

---

### 1-G. 세트법 비교 요약표

| 세트법 | 근비대 효과 | 피로 비용 | 시간 | 근거 등급 | 앱 기본 배정 |
|---|---|---|---|---|---|
| 스트레이트 | 기준(=100%) | 보통 | 보통 | 높음 | ✅ 기본 |
| 탑세트+백오프 | 동등 (직접 비교 없음) | 보통 | 보통 | 낮음(실무) | ✅ 고중량 복합만 |
| 오름 피라미드 | 동등 | 낮음 | 김 | 중간 | ❌ |
| 역피라미드 | 동등(근거 희박) | **높음**(근손상 지표↑) | 보통 | 낮음 | ❌ (옵션) |
| 드롭세트 | 동등 | **높음** | **1/2~1/3** | 높음 | ⚠️ 조건부 제안 |
| 마이오렙 | 동등 | 높음 | **~1/3** | 중간 | ⚠️ 조건부 제안(프리웨이트) |

---

## 2) 종목 유형별 기본 세트법 + 무게·횟수 산출 규칙

앱은 이미 `EXERCISE_CLASS_RULES`(`js/data.js:366`)로 종목을 5개 클래스로 나누고 있다. 새 분류 체계를 만들 필요 없이 **여기에 두 필드만 얹으면 된다.**

### 2-A. 클래스별 기본 세트법

| 클래스 (현행 반복범위) | 기본 세트법 | 세트 구성 | 왜 |
|---|---|---|---|
| `compound_heavy` (5–8회) | **탑세트 + 백오프** | 워밍업 2 + 탑 1 + 백오프 2 | 고중량에서 3세트 동일무게는 반복 붕괴가 크다. 탑세트로 1RM 신선도, 백오프로 볼륨 보존 |
| `compound_moderate` (8–12회) | **스트레이트** | 워밍업 1 + 워킹 3 | 8~12회 부하대는 반복 붕괴가 완만. 근거상 가장 단순한 안 |
| `isolation` (12–15회) | **스트레이트** (+드롭 옵션) | 워킹 3 | 동일. 머신·케이블이면 드롭세트 후보 |
| `light_isolation` (15–25회) | **스트레이트** (+드롭 최우선 후보) | 워킹 3 | 소근육·저부하 → 드롭세트가 가장 안전·효율적 |
| `rehab` (15–20회) | **스트레이트 고정 (변경 금지)** | 워킹 3 | 무게 진행 금지 원칙 유지. 드롭·마이오렙 **절대 금지** |

### 2-B. 무게·횟수 산출 규칙 (구체 수치)

기준값 정의 — **모두 기존 함수에서 나온다**:
```
W    = getProgressiveRecommendation(name, targetReps).weight   // 오늘의 추천 무게
R    = clampRepsToClass(name, targetReps)                      // {low, high}
step = getWeightIncrement(name)                                // 덤벨 2kg, 그 외 5kg
```

#### ⚠️ 먼저 해결해야 할 함정: 반올림 때문에 감량이 사라진다

현재 `snapWeightToEquipment`는 **반올림**(`Math.round`)을 쓴다. 그래서:

| 탑세트 | ×0.90 | 현행 스냅 결과 | 실제 감량 |
|---|---|---|---|
| 25 kg | 22.5 | `Math.round(4.5)*5` = **25 kg** | **0% — 감량 없음!** ❌ |
| 60 kg | 54 | 55 kg | −8.3% ✅ |
| 8 kg(덤벨) | 7.2 | 8 kg | **0%** ❌ |

→ 백오프·드롭 무게 전용 헬퍼가 **반드시** 필요하다. 최소 한 스텝은 내려가도록 보장한다.

```js
// 제안: 백오프/드롭 전용 감량 계산 (최소 1스텝 하강 보장)
function reduceWeight(top, pct, exerciseName) {
  var step = getWeightIncrement(exerciseName);
  var w = Math.round(top * pct / step) * step;
  if (w >= top) w = top - step;        // 반올림으로 감량이 사라지는 경우 방어
  return Math.max(step, w);            // 0kg 이하 방지
}
```

#### 규칙 ① 워밍업

| 클래스 | 워밍업 구성 | 휴식 |
|---|---|---|
| `compound_heavy` | `W×0.50` × 8회 → `W×0.75` × 4회 (2세트) | 45초 |
| `compound_moderate` | `W×0.55` × 8회 (1세트) | 45초 |
| `isolation` 이하 | 없음 (첫 워킹세트가 자체 워밍업 역할) | — |

- **현행**: 모든 종목 `W×0.5` × 10회 1세트(`js/screens.js:1342`, `:891`).
- **근거 등급: 낮음(실무 관행).** 워밍업은 자극이 아니라 준비이므로 저부하 고반복은 피로만 준다. 다만 현행도 큰 문제는 아니므로 **적용 우선순위는 가장 낮다.**

#### 규칙 ② 탑세트 + 백오프 (`compound_heavy`)

```
탑세트   : 무게 = W,                          목표 = R.high 회,  RIR 1~2
백오프×2 : 무게 = reduceWeight(W, 0.90, name), 목표 = R.high 회,  RIR 2~3
```

예시 (벤치 프레스, R = 5–8, step 5kg):
| W | 탑세트 | 백오프 |
|---|---|---|
| 60 kg | 60 × 8회 | **55** × 8회 × 2 |
| 70 kg | 70 × 8회 | **65** × 8회 × 2 |
| 100 kg | 100 × 8회 | **90** × 8회 × 2 |

**왜 90%(−10%)인가**
- 실무 권장 범위(−5~15%)의 중앙값이면서, 5kg 스냅 환경에서 60~100kg 구간이 정확히 1~2스텝에 떨어져 계산이 깔끔하다.
- −20~30%도 근비대 목적으로 쓰이지만, 부하-반복 관계상 반복이 +6~8회 늘어 `compound_heavy`의 5–8회 범위를 크게 벗어난다. 앱의 `clampRepsToClass` 가드레일과 충돌한다.
- **백오프도 같은 반복 목표(R.high)를 쓴다**는 게 핵심이다. 탑세트에서 8회를 못 채웠어도 백오프에서는 채울 수 있고, 이것이 볼륨 로드 보존이라는 메커니즘 그 자체다.

**⚠️ 증량 판정에 미치는 영향 — 반드시 QA할 것**
- 기존 `reachedTopAt(perf, weight)`는 `s.weight === maxW`인 세트만 검사한다. 백오프(90%)는 무게가 달라 **판정에서 자동으로 빠진다.**
- 결과: 증량 기준이 "3세트 전부 상단 반복" → **"탑세트 1개가 상단 반복"** 으로 느슨해진다.
- 이건 탑세트 방식의 통상 관행과 일치하고, `compound_heavy`는 `doubleSessions: 2`(2세션 연속 요구)라서 완충된다. 하지만 **의도된 변경임을 문서화하고 QA에서 확인**해야 한다.

#### 규칙 ③ 스트레이트 (`compound_moderate` / `isolation` / `light_isolation` / `rehab`)

```
워킹세트 ×3 : 무게 = W, 목표 = R.low ~ R.high,
              RIR = 복합 2~3 / 고립 0~2 (마지막 세트 0~1)
```

**현행과 동일 — 코드를 바꿀 필요가 없다.** 다만 UI에 한 줄 안내를 넣을 것을 권한다:
> "뒤 세트에서 반복이 1~2회 줄어드는 건 정상이에요. 무게를 낮추지 말고 그대로 하세요."

RIR 근거: Robinson 등(2024) 메타회귀 — 실패에 가까울수록 근비대가 커지되 **약 2 RIR 이후 기울기가 평탄**. 즉 RIR 0~2면 충분하고, 무거운 바벨 복합에서 완전 실패(RIR 0)는 부상·피로 비용 대비 이득이 없다.

#### 규칙 ④ 드롭세트 (옵션 — §4 조건 충족 시에만)

```
마지막 워킹세트만:
  본세트  : 무게 = W,                          RIR 0~1 까지
  드롭 1  : 무게 = reduceWeight(W, 0.75, name), 실패까지    (휴식 0~10초)
  드롭 2  : 무게 = reduceWeight(드롭1, 0.75, name), 실패까지 (선택)
```
- **−25%** 근거: Angleri 2017의 DS 프로토콜이 ~50~75% 1RM 구간을 훑었다. 2회 드롭이면 100% → 75% → 56%로 그 구간을 재현한다.
- 드롭 사이 휴식은 **무게를 바꾸는 시간(0~10초)** 뿐이다.

#### 규칙 ⑤ 마이오렙 (옵션 — 프리웨이트 시간 절약용)

```
활성화 세트 : 무게 = W, RIR 0~1 까지
미니세트    : 같은 무게로 3~5회, 사이 휴식 20초
종료 조건   : 미니세트 3~4회 완료, 또는 미니세트가 3회 미만으로 떨어지면 중단
```
무게 변경이 없어 덤벨·바벨에서도 안전하다.

---

## 3) 세트 간 휴식시간 권장표

### 3-A. 근거 정리

| 출처 | 내용 |
|---|---|
| **Schoenfeld 등 2016 (*JSCR*)** | 훈련 경험자 남성 21명, 8주, 주3회 전신, 7종목 × 3세트 8–12RM. **1분 vs 3분 → 3분 그룹이 근력·근비대 모두 우세.** |
| **Grgic 등 2017 (*Eur J Sport Sci*) 체계적 문헌고찰** | 미훈련자는 짧은/긴 휴식 **둘 다 유효**. **훈련 경험자는 긴 쪽이 유리할 수 있음.** |
| **Frontiers 2024 베이지안 메타분석 "Give it a rest"** | 긴 휴식이 **소폭** 유리: 팔 SMD 0.13, 허벅지 SMD 0.17, 전신 SMD −0.08 (모두 신뢰구간이 0을 포함 = 불확실). 임계는 **60초**. **90초를 넘는 추가 이득은 의문**이며 120초 vs 180초는 볼륨 로드 차이가 평탄해진다. 결론: **"기존 기관 권장은 재고가 필요하다."** |
| **Helms — *The Muscle & Strength Pyramid*** | 고립 **최소 1.5분**, 대형 복합 **최소 2.5분**. 교대 세트 사용 시 복합 ~2분 / 고립 ~1분. |
| **Stronger by Science** | 고립 **1.5~2분**, 무거운 복합 **3~5분+**. 8~15회, 실패 2~3회 전. |
| **Israetel / RP · JTS** | **1~3분**. 핵심 원칙: *"다음 세트에서 목표 반복을 못 채웠다면 덜 쉰 것이다."* |
| **NSCA 전통 권장** | 근력·파워 2~5분, **근비대 30초~1.5분**. → ⚠️ 이 근비대 권장치는 최신 근거와 충돌한다. **채택하지 않는다.** |

### 3-B. 앱 기본값 권장표

| 클래스 | **권장 기본값** | 현행 | 근거 |
|---|---|---|---|
| `compound_heavy` | **180초 (3분)** | 150초 | Schoenfeld 2016(3분 > 1분, 훈련자); Helms 대형 복합 ≥2.5분; SBS 3~5분 |
| `compound_moderate` | **150초 (2.5분)** | 150초 | Helms ≥2.5분 ↔ Frontiers 2024(>90초 이득 불확실) 절충 |
| `isolation` | **120초 (2분)** | 90초 ⬆️ | Helms 고립 ≥1.5분; SBS 1.5~2분 |
| `light_isolation` | **90초** | 90초 | 소근육은 회복이 빠름. 60초 임계는 확실히 넘김 |
| `rehab` | **60초** | 90초 ⬇️ | 저부하·비피로 목적. 길게 쉴 이유 없음 |
| 워밍업 세트 | **45초** | 60초 | 피로를 유발하지 않는 세트 |
| 드롭세트 내 드롭 사이 | **0~10초** | — | 정의상 무휴식(무게 바꾸는 시간만) |
| 마이오렙 미니세트 사이 | **20초** | — | 원 프로토콜(깊은 호흡 3~5회) |

**현행 로직**(`js/screens.js:1864`)은 종목 이름에 `'프레스','풀업','랫풀다운','로우','스쿼트','데드리프트','레그 프레스','핵 스쿼트'`가 들어가면 복합(150초), 아니면 고립(90초)으로 판정한다. 이건 `getExerciseClass()`가 이미 하는 일을 **별도 키워드 배열로 중복 구현**한 것이라, 두 판정이 어긋날 수 있다. 클래스 기반으로 통합할 것을 권한다.

### 3-C. 고정값보다 우선하는 자가조절 규칙 ⭐

> **직전 세트가 목표 반복 하단(`R.low`)을 못 채웠으면, 다음 휴식을 +30초 (최대 240초).**

- **왜**: 90초를 넘는 휴식의 직접 이득은 근거가 약하다(Frontiers 2024). 하지만 긴 휴식이 작동하는 **메커니즘은 "반복 수를 지켜주는 것"** 으로 일관되게 설명된다. 그렇다면 고정 시간을 늘리는 것보다 **반복이 실제로 떨어졌을 때만 늘리는 것**이 더 정확하고 시간도 절약된다.
- Israetel/JTS의 원칙("목표 반복을 못 채우면 덜 쉰 것")을 그대로 코드화한 것이다.
- 앱은 이미 세트별 `reps` 입력을 받으므로 **추가 입력 없이 구현 가능**하다.

---

## 4) 드롭세트·마이오렙 자동 추천 기준

**원칙: 자동 적용 금지. "제안 카드"로만 띄우고 사용자가 수락해야 반영.**

### 4-A. 드롭세트 제안 조건 (모두 만족할 때만)

1. 클래스가 `isolation` 또는 `light_isolation` — `compound_heavy`는 **제외**. `compound_moderate`는 장비가 머신일 때만.
2. 장비 유형(`ex.type`)이 **머신 또는 케이블** — Sødal 2023의 명시적 권장(안정성 높아 실패 지점 부상 위험 낮음).
3. **최근 14일 통증 기록 없음** — 기존 `hasRecentPain(name, 14)` 그대로 재사용.
4. **시간 압박 신호**: 세션 남은 종목의 예상 소요가 사용자 목표 시간을 초과하거나, 사용자가 "오늘 시간 없음"을 선택.
5. **빈도 상한**: 해당 부위에 이번 주 드롭세트 사용이 1회 이하.
6. **마지막 워킹세트에만** 적용.
7. `rehab` 클래스에는 **절대 금지**.

### 4-B. 마이오렙 제안 조건

- 위 1·3·4·5·6·7은 동일하되, **조건 2를 뒤집는다**: 장비가 **덤벨·바벨(프리웨이트)** 일 때 드롭세트 대신 마이오렙을 제안.
- 이유: 프리웨이트에서 실패 지점에 무게판을 바꾸는 건 위험하다. 마이오렙은 무게를 그대로 두므로 이 위험이 없다.

### 4-C. 왜 조건을 이렇게 빡세게 두는가

드롭세트·마이오렙은 근비대 이득이 **동등할 뿐 더 크지 않다**(Sødal 2023, SMD 0.155 p=0.392). 이득은 **오직 시간**이다. 반면 급성 피로 비용은 크다. 따라서 **시간 압박이 실제로 있을 때만** 값어치가 있다. 시간이 충분한데 드롭세트를 쓰면 **피로만 더 지고 이득은 0**이다.

---

## 5) 앱 적용 설계 초안 (개요 수준 — 구현은 별도 작업)

### 5-A. 데이터 구조

**① `js/data.js` — `EXERCISE_CLASS_RULES`에 필드 2개 추가**
```js
var EXERCISE_CLASS_RULES = {
  compound_heavy:    { repMin: 5,  repMax: 8,  doubleSessions: 2, kr: '고중량 복합',
                       scheme: 'top_backoff', restSec: 180 },   // ← 추가
  compound_moderate: { repMin: 8,  repMax: 12, doubleSessions: 1, kr: '중강도 복합',
                       scheme: 'straight',     restSec: 150 },
  isolation:         { repMin: 12, repMax: 15, doubleSessions: 1, kr: '고립',
                       scheme: 'straight',     restSec: 120 },
  light_isolation:   { repMin: 15, repMax: 25, doubleSessions: 2, kr: '경량 고립',
                       scheme: 'straight',     restSec: 90 },
  rehab:             { repMin: 15, repMax: 20, doubleSessions: 0, kr: '재활',
                       scheme: 'straight',     restSec: 60, lockScheme: true }
};
```
새 상수 `SET_SCHEMES` — 스킴 이름 → 세트 역할 배열 생성 규칙 + 한국어 이름.

**② `js/core.js` — 사용자 override 저장소 신설**
```js
KEYS.SET_SCHEMES = 'fitness_set_schemes';   // { "벤치 프레스": "straight", ... }
```
종목별로 사용자가 바꾼 세트법. 없으면 클래스 기본값 사용.

**③ `js/domain.js` — `getSessionSetPlan`이 세트 배열을 함께 반환**

현재 (`js/domain.js:369`)는 `{ weight, reps, repRange, prog }` **하나의 무게·반복**만 돌려주고, 호출부가 그걸 3번 복사해서 세트를 만든다. **이게 "모든 세트 동일 무게·횟수"의 정확한 원인 지점이다.**

```js
// 기존 필드는 그대로 두고(하위호환) sets 배열만 추가
return {
  weight: weight, reps: reps, repRange: range, prog: prog,
  scheme: scheme,          // ← 추가
  sets: [                  // ← 추가
    { role: 'warmup',  weight: …, reps: 8,  isWarmup: true,  rest: 45  },
    { role: 'top',     weight: W,  reps: R.high, isWarmup: false, rest: 180, rir: '1-2' },
    { role: 'backoff', weight: …, reps: R.high, isWarmup: false, rest: 180, rir: '2-3' },
    …
  ]
};
```
새 헬퍼 `reduceWeight(top, pct, name)`(§2-B)와 `getSetScheme(name)`(override → 클래스 기본값) 추가.

**④ `js/screens.js` — 세션 생성부 2곳을 배열 순회로 교체**
- `js/screens.js:882` 부근 (AI 루틴에서 세션 시작)
- `js/screens.js:1336` 부근 (템플릿에서 세션 시작)

둘 다 지금은 `for (i < ex.sets) { sets.push({weight: plan.weight, reps: plan.reps, …}) }` 형태다. 이걸 `plan.sets.forEach(...)`로 바꾸면 끝난다. **세션 데이터 형식(`sets` 배열)은 그대로**라서 나머지 코드(완료 처리·1RM 갱신·로그 저장)는 손댈 필요가 없다.

**⑤ `js/screens.js:1864` — 휴식 타이머를 클래스 기반으로**
```
현행: 키워드 배열로 isCompound 판정 → 복합 150초 / 고립 90초
권장: set.rest (세트가 지정) > exercise.rest (AI 지정)
      > EXERCISE_CLASS_RULES[getExerciseClass(name)].restSec
      + 자가조절: 직전 세트가 R.low 미달 → +30초 (상한 240초)
```

### 5-B. UI 변경 방향

1. **세트 줄에 역할 뱃지**: `워밍업` / `탑세트` / `백오프` / `드롭` / `미니`. 색으로 구분하면 비개발자도 한눈에 이해된다.
2. **종목 메뉴(⋯ 버튼, `js/screens.js:2408` 부근 `openExerciseSwap` 옆)에 "세트법 바꾸기" 추가** — 스트레이트 / 탑세트+백오프 / 드롭세트 / 마이오렙 선택. `rehab`은 잠금(`lockScheme`).
3. **드롭세트 제안은 수락/거절 카드**로. 자동 적용하지 않는다.
4. **안내 문구 한 줄**: 스트레이트 세트에서 "뒤 세트 반복이 줄어드는 건 정상"이라는 설명.

### 5-C. AI 연동 — 권장: **하지 않기**

`js/ai.js`의 루틴 생성 응답 스키마에 종목별 `scheme` 필드를 **추가하지 말 것을 권한다.**
- 세트법은 코드가 결정론적으로 배정하는 편이 일관되다. 이건 이미 `docs/ai-routine-improvement-plan.md` §④가 세운 방침("`getProgressiveRecommendation` 계산값을 AI에 주입, AI 눈대중 금지")과 같은 원칙이다.
- AI는 **종목·세트 수·반복 범위**만 정하면 되고, 세트법·무게·휴식은 코드가 계산한다.

### 5-D. 리스크 · 체크리스트

| 항목 | 내용 |
|---|---|
| ⚠️ **증량 판정 변화** | `reachedTopAt`이 백오프 세트를 자동 제외 → 기준이 "탑세트 1개"로 느슨해짐. 의도된 변경이지만 QA 필수 |
| ⚠️ **반올림 감량 소실** | `snapWeightToEquipment`의 `Math.round`로 25kg×0.9가 25kg가 됨. `reduceWeight` 헬퍼 필수 |
| ⚠️ **1RM 오염 방지** | 드롭세트의 감량 세트는 `update1RM` 대상에서 제외해야 함(고반복 저중량이 e1RM을 낮추진 않지만, 로그 해석이 꼬임) |
| 📋 **테스트** | 새 전역 함수 추가 시 `tests/golden-symbols.json` 갱신. `node --test tests/characterization.test.mjs` 통과 확인 |
| 📋 **배포** | `service-worker.js`의 `CACHE_VERSION` 상향 필수 (안 하면 폰에 반영 안 됨) |
| 📋 **하위호환** | 이미 진행 중인 세션(`fitness_active_session`)에 `role` 필드가 없어도 깨지지 않아야 함 |

### 5-E. 적용 우선순위 (효과 ÷ 노력)

| 순위 | 항목 | 효과 | 노력 |
|---|---|---|---|
| **1** | 휴식 기본값 클래스 기반으로 교체 + 자가조절 +30초 | 高 | **低** — 한 줄 로직 |
| **2** | `reduceWeight` 헬퍼 + `compound_heavy` 탑세트+백오프 | 中 | 中 |
| **3** | 세트법 사용자 override UI | 中 | 中 |
| **4** | 드롭세트·마이오렙 조건부 제안 | 低~中 | 中 |
| **5** | 워밍업 램프 개선 | 低 | 低 |

**1번만 해도 근거상 이득의 상당 부분을 가져간다.** 세트법 변경은 근비대 이득이 "동등"이지만, 휴식시간은 실제로 차이를 만든 유일한 변수다(Schoenfeld 2016).

---

## 6) 근거 등급 요약 (과신 방지)

| 주장 | 등급 |
|---|---|
| 볼륨이 같으면 세트법 간 근비대 차이 없음 | **높음** — RCT + 메타분석 다수 |
| 드롭세트가 시간을 1/2~1/3로 줄임 | **높음** — 메타분석에 실측 |
| 실패 근접도가 근비대에 특이적, ~2 RIR 이후 평탄 | **높음** — 55개 효과 메타회귀 |
| 훈련자에게 긴 휴식(3분) > 짧은 휴식(1분) | **중간** — RCT 1편 + 문헌고찰. 베이지안 메타는 효과가 작고 불확실하다고 봄 |
| 90초 초과 휴식의 추가 이득 | **낮음** — Frontiers 2024가 명시적으로 의문 제기 |
| 백오프 90%, 드롭 −25% 같은 구체 수치 | **낮음** — 실무 합의. 원리(볼륨 로드 보존)는 근거 있으나 정확한 수치는 임의 |
| 워밍업 램프 구성, 드롭세트 빈도 상한 | **낮음** — 실무 관행 |

---

## 참고문헌

**메타분석 · 체계적 문헌고찰**
- [Angleri V, Ugrinowitsch C, Libardi CA (2017). Crescent pyramid and drop-set systems do not promote greater strength gains, muscle hypertrophy, and changes on muscle architecture compared with traditional resistance training in well-trained men. *Eur J Appl Physiol* 117(2):359-369.](https://pubmed.ncbi.nlm.nih.gov/28130627/)
- [Sødal LK et al. (2023). Effects of Drop Sets on Skeletal Muscle Hypertrophy: A Systematic Review and Meta-analysis. *Sports Med Open* 9:66.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10390395/)
- [Coleman M et al. Muscular Adaptations in Drop Set vs. Traditional Training: A meta-analysis. *Int J Strength Cond*.](https://journal.iusca.org/index.php/Journal/article/view/135)
- [Acute and Chronic Effects of Drop-Set Training: A Meta-Analysis and Systematic Review. *Sports Med Open*.](https://pmc.ncbi.nlm.nih.gov/articles/PMC13043944/)
- [Robinson ZP et al. (2024). Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. *Sports Med*.](https://link.springer.com/article/10.1007/s40279-024-02069-2)
- [Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy (2024). *Front Sports Act Living* 6:1429789.](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full)
- [Grgic J, Lazinica B, Mikulic P, Krieger JW, Schoenfeld BJ (2017). The effects of short versus long inter-set rest intervals in resistance training on measures of muscle hypertrophy: A systematic review. *Eur J Sport Sci* 17(8):983-993.](https://www.semanticscholar.org/paper/The-effects-of-short-versus-long-inter-set-rest-in-Grgic-Lazinica/894bec83607f538afc1a7b38d55025526ffa9785)

**개별 연구**
- [Schoenfeld BJ, Pope ZK, Benik FM, et al. (2016). Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. *J Strength Cond Res* 30(7):1805-12.](https://journals.lww.com/nsca-jscr/fulltext/2016/07000/longer_interset_rest_periods_enhance_muscle.3.aspx)
- [Prestes J et al. Rest-pause and drop-set training elicit similar strength and hypertrophy adaptations compared with traditional sets in resistance-trained males.](https://pubmed.ncbi.nlm.nih.gov/34260860/)
- [Similar Strength and Hypertrophic Adaptations in Less Time? Myo-Reps vs. Traditional Straight-Sets in Resistance-Trained Men.](https://pubmed.ncbi.nlm.nih.gov/42112925/)

**실무 지침**
- [Stronger by Science — Are compound exercises best for hypertrophy?](https://www.strongerbyscience.com/compound-exercises-for-hypertrophy/)
- [Stronger by Science — The "Hypertrophy Rep Range": Fact or Fiction?](https://www.strongerbyscience.com/hypertrophy-range-fact-fiction/)
- [Eric Helms — The Muscle & Strength Pyramid: Training (휴식 권장치)](https://www.boostcamp.app/coaches/muscle-and-strength-pyramid/intermediate-bodybuilding-program)
- [Juggernaut Training Systems / Mike Israetel — How Long Should You Rest Between Sets?](https://www.jtsstrength.com/how-long-should-you-rest-between-sets/)
- [NSCA — A Brief Review: How Much Rest between Sets? *Strength Cond J* (2008)](https://journals.lww.com/nsca-scj/fulltext/2008/06000/a_brief_review__how_much_rest_between_sets_.9.aspx)
- [Andy Baker — Top Set / Back Off Set Programming](https://www.andybaker.com/top-set-back-off-set-programming/)
