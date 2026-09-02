> 조사일: 2026-09-02 · 재검증+보강 · 코드 수정 없음

# 볼륨 · 빈도 · 분할 · 세션당 상한 · 주간 볼륨 폐루프 (재검증 v2)

## 0) 한 장 요약 — 결론 5줄

1. **앱의 볼륨 뼈대는 대부분 견고해졌다.** Pelland 등의 메타회귀가 2026년 *Sports Medicine* 에 정식 출판(67연구·2,058명)되면서, 앱이 프리프린트로 인용하던 "주 10~20세트·수확 체감·세트당 +0.24%"가 동료심사를 통과한 근거가 됐다. **간접 세트 0.5 가중(fractional)** 도 "0.3~0.7 중 관례"에서 **세 방식(0.0/0.5/1.0) 중 통계적으로 가장 예측력이 높은 방식**으로 승급했다.
2. **가장 큰 결함은 "작은 근육 목표를 낮추는" 규칙이다.** 앱은 간접 세트를 이미 0.5로 **더해 놓고**, 같은 이유("작은 근육은 복합에서 간접자극을 받으니까")로 목표를 다시 **낮춘다** — 같은 보정을 두 번 한다. 그 결과 이두가 프랙셔널 12세트(직접은 6세트뿐)여도 🟢 적정으로 떠서, 정작 앱 자신의 규칙 ⑨("팔·측면어깨는 복합만으로 안 찬다")를 진단이 무력화한다. 앱이 근거로 든 RP 랜드마크조차 측면삼각 MAV 16~22 · 이두 14~20으로 가슴(12~20)보다 **낮지 않다**.
3. **고칠 자리는 두 곳이다.** ① 작은 근육 목표 8→10 · 상한 16→20 통일, ② 이미 계산해 놓고 **버리고 있는 `direct` 맵**을 써서 측면·후면어깨·이두·삼두·종아리에 "주 직접 4세트" 하한을 신설. 둘 다 코드 한 곳(`getVolumeThresholds`/`getVolumeDiagnosis`) 수정으로 끝난다.
4. **빈도·세션당 상한·종아리 예외는 그대로 둔다.** 빈도는 근비대에 무관(메타 2건 일치)·근력에는 유의(Pelland 2026 사후확률 100%)라는 앱 문장이 정확하다. 세션당 8 직접세트는 Remmert 2025(세션당 ~11 프랙셔널)보다 보수적이라 안전하다. 종아리를 큰 근육 목표로 둔 예외는 Kassiano 2024(주 12세트 > 6세트)로 오히려 뒷받침됐다.
5. **폐루프(목표까지 채우기)는 방향은 맞으나 창(window)이 틀렸다.** 지금은 "최근 2주 평균"으로 격차를 재서 **이번 주에 이미 한 세트가 반영되지 않는다** — 주 초반엔 과소, 주 후반엔 과대 처방이 난다. 근거가 아니라 정합성 문제이므로 등급과 무관하게 고쳐야 한다. 한편 2026년 최대 규모 RCT(Steele 등, 주 9 vs 36 프랙셔널 12주 **동등**)는 "더 채우면 더 큰다"에 정면으로 반대하는 결과라, 폐루프는 **하한 보장 장치**로 쓰고 상향 압박 도구로 쓰지 않는 게 맞다.

---

## 1) 현재 주장 표 — 앱이 지금 말하는 것

### 1-A. 코드 상수·로직 (`js/domain.js` · `js/data.js`)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| C1 | 큰 근육 주간 임계 | 부족 <4 / 하한 10 / 상한 20 / 목표 12 | `js/domain.js:2264-2274` |
| C2 | 작은 근육 주간 임계 | 부족 <3 / 하한 8 / 상한 16 / 목표 8 | `js/domain.js:2264-2274` |
| C3 | 작은 근육 목표가 낮은 이유 | "복합운동 간접자극으로 목표 낮음" | `js/domain.js:2290-2292` 주석 |
| C4 | 간접(보조근) 세트 가중치 | 0.5 (primary 1.0 + secondary 0.5) | `js/domain.js:2243-2248` |
| C5 | 직접 세트 맵 계산 | `direct` 맵을 만들지만 **진단에는 안 씀** (`fractional`만 반환) | `js/domain.js:2216-2257` |
| C6 | 진단 버킷 | 5종: `lacking` / `belowOptimal` / `optimal` / `excessive` / `untouched`(0세트 저우선) | `js/domain.js:2279-2323` |
| C7 | 종아리 = 큰 근육 예외 | `size:'large'` (간접자극 0이라) | `js/data.js:1348-1350` |
| C8 | 볼륨 부위 목록 | 14그룹 (전완·요추 제외) | `js/data.js:1331-1352` |
| C9 | 세션 템플릿 크기 | push/pull/legs/upper 각 **6종목 · 18세트**, free 4종목·12세트 | `js/data.js:156-235` |
| C10 | 사이클 | 5주(빌드 4 + 디로드 1), 볼륨 **점증 축 없음** | `js/domain.js:1808-1833` |

### 1-B. AI 프롬프트 (`js/ai.js`)

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| P1 | 볼륨 창 | **최근 2주 평균** | `js/ai.js:568` |
| P2 | 컨텍스트 볼륨 밴드 문장 | "큰 근육 10~20 / 작은 근육 8~16(작은 근육은 간접자극 받아 목표 낮다)" | `js/ai.js:575` |
| P3 | 폐루프 격차 | "목표 N세트까지 N세트 더" (target = 큰 12 / 작은 8) | `js/ai.js:595-621` |
| P4 | 규칙 ② 세션당 상한 | 한 부위 **직접 8세트 이하**(소프트, "정밀 근거 약함" 명시) | `js/ai.js:1189` |
| P5 | 규칙 ④ 시간 예산 | **5~6종목 / 15~18 워킹세트**, 7종목 금지(≈66분) | `js/ai.js:1199` |
| P6 | 규칙 ⑨ 필수 고립 | 팔·측면·후면어깨·종아리는 복합만으론 안 참 → 직접 고립, 어깨 세션엔 후면델트 필수 | `js/ai.js:1244-1246` |
| P7 | 수확 체감 | 큰 20+ / 작은 16+, "금지선 아님" 명시 | `js/ai.js:1190, 1277` |
| P8 | 빈도 | "볼륨 같으면 주 1회=2회 (Schoenfeld 2019)" — 근력 단서 **없음** | `js/ai.js:266, 956, 1615` |

### 1-C. 지식 블록·기존 문서

| # | 주장 | 현재 값 | 위치 |
|---|---|---|---|
| K1 | 볼륨 핵심 구간 | 부위당 주 10~20 직접세트, 세트당 +0.24%, 4세트 미만 = 부족 (Pelland 2024) | `js/data.js:1389` |
| K2 | 빈도 | 볼륨 동일 시 주 1회=2회(Schoenfeld 2019). 주 2회 권장 이유 ① 근력엔 빈도 유의(Pelland 2025) ② 세션 내 수확 체감 분산 | `js/data.js:1391` |
| K3 | 부위별 현실 배분표 | 주 80세트 예산 기준 합계 77세트(가슴 9·등 12·사두 10·햄 8·둔 5·측면 6·후면 5·이두 6·삼두 6·종아리 6·복근 4) | `docs/research/training-splits.md §4-A` |
| K4 | 세션당 상한 근거 | Remmert 2025 ~11 프랙셔널 → 앱은 8 직접으로 보수 운영 | `docs/research/training-splits.md §4-B` |
| K5 | 폐루프 원안 | "0세트 부위도 부족 목록에" → 실제 구현은 `untouched` 저우선 버킷으로 **다르게** 됨 | `docs/ai-routine-improvement-plan.md §②` |
| K6 | 간접 0.5 | "Pelland 2025 분할세트 예측력 최고, 0.3~0.7 중 0.5 — 정밀값 아님" | `docs/ai-routine-improvement-plan.md §⑤` |

---

## 2) 재검증 결과 — 2026년 9월 기준

### 2-A. 판정 요약

| 주장 | 판정 | 한 줄 근거 |
|---|---|---|
| K1 주 10~20세트·수확 체감 | **견고** | Pelland 2026 *Sports Med* 정식 출판(67연구·2,058명, 사후확률 100%) |
| K1 세트당 +0.24% | **견고**(단, 평균값) | Pelland 2024 프리프린트 0.24%/세트 (95%CrI 0.15~0.33), 제곱근 모델 |
| C4/K6 간접 0.5 | **견고로 승급** | Pelland 2026: fractional > total(strong), fractional > direct(very strong) |
| C2/C3/P2 작은 근육 목표 낮춤 | **근거 없음 + 이중 차감** | 어떤 메타회귀도 근육 크기별 목표를 나누지 않음. RP 랜드마크도 반대 |
| P8/K2 빈도 무관(근비대) | **견고** | Schoenfeld 2019 + Pelland 2026(사후확률 <100% = 무시 가능) |
| K2 근력엔 빈도 유의 | **견고** | Pelland 2026 근력 빈도 사후확률 **100%** |
| P4 세션당 8 직접세트 | **잠정** | Remmert 2025는 아직 **프리프린트**(세션당 ~11 프랙셔널) |
| P3/K5 폐루프 "채우기" | **잠정(찬반 충돌)** | 찬: Enes 2025·Robinson 2025 / 반: Steele 2026 동등성 RCT |
| C7 종아리 = 큰 근육 목표 | **견고쪽 잠정** | Kassiano 2024: 주 12세트 > 6세트 (미훈련 여성, 6주) |
| P6 팔 직접 고립 필요 | **견고쪽 잠정** | Mannarino 2021: 컬이 로우보다 주관절 굴곡근 성장 약 2배 |
| P6 측면어깨 직접 필요 | **잠정** | EMG·실무 근거 중심. 레터럴 기구 간 차이는 없음(2024 RCT) |
| P5 60분 = 15~18세트 | **근거 없음(내부 추정)** | 외부 연구 아님. 앱 자체 시간 계산. 타당하나 근거 등급은 없음 |
| C10 볼륨 고정(점증 없음) | **공백** | Enes 2025: 2주마다 세트 점증이 고정 22세트보다 우위(1RM·VL CSA) |

---

### 2-B. 주당 세트 최적 범위와 수확 체감 곡선 — **견고**

**Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC (2026).** *The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains.* **Sports Medicine.** DOI [10.1007/s40279-025-02344-w](https://doi.org/10.1007/s40279-025-02344-w) · PMID 41343037 · 프리프린트 [SportRxiv 460](https://sportrxiv.org/index.php/server/preprint/view/460)

- 67연구 · 2,058명. 볼륨이 오를수록 근비대·근력 모두 증가할 **사후확률 100%**.
- 두 결과 모두 **수확 체감**을 보이며, **근력 쪽 체감이 훨씬 가파르다**.
- 근비대에서는 **명확한 정체(plateau)가 관측되지 않았다.**
- 검출 가능한 우월성이 사라지는 지점(PUOS)은 **주 약 31 프랙셔널 세트**.
- 효율 구간: **최소 유효 4 프랙셔널 세트** → 5~10 구간에서는 약 +6세트마다 추가 이득이 검출 → 11~18 구간에서는 약 +8.5세트가 필요.
- 포함 연구의 평균 볼륨은 **주 8.1 프랙셔널 세트**, 중앙값 10.5 — 모델이 실제로 서 있는 구간이 여기다.

> **앱 대조**: `10~20`이라는 밴드는 이 곡선의 "효율이 아직 괜찮은 구간"과 잘 맞는다. 다만 앱이 20+를 `excessive`(🔥 이득 완만)로 부르는 것은 **31 프랙셔널**이라는 최신 PUOS보다 보수적이다. 60분×5일 예산에서는 어차피 도달하기 어려운 숫자라 실무 영향은 작다.

**보강**: [ACSM 2026 신 가이드라인](https://acsm.org/resistance-training-guidelines-update-2026/) — *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews* (MSSE 2026, 137개 체계적 리뷰·3만 명 이상). 근비대는 **주 약 10세트/부위**, **모든 주요 부위를 주 2회 이상**, 실패까지 미는 것은 평균적 성인에게 **일관된 이득 없음**. 앱은 아직 `ACSM 2009`를 인용 중이다(`js/data.js` COACH_KNOWLEDGE §8·어시스트 항목).

---

### 2-C. 반대 근거 — **반드시 함께 실어야 할 2026년 결과**

**Steele J, Gschneidner D, Carlson L, Fisher J (2026).** *A test of higher and lower fractional volumes of resistance training upon arm and thigh muscle area: A multi-site randomised trial.* [SportRxiv 810](https://sportrxiv.org/index.php/server/preprint/view/810)

- 22개 사이트 · 120명 배정(87명 완료) · 12주 · 훈련 경험자.
- **주 9 프랙셔널 세트 vs 주 36 프랙셔널 세트.**
- 결과: **통계적 동등성 지지.** 조건 간 표준화 차이 0.023 [90%CI −0.044 ~ 0.091], 동등성 p=0.032. 전체 시간 효과 자체도 작았다(0.087 [95%CI 0.047~0.128]).
- 결론: 훈련자에서 저항운동의 효과는 애초에 작게 기대해야 한다.

> **어떻게 읽어야 하나**: 메타회귀(Pelland)는 **연구 평균의 기울기**를, 이 RCT는 **한 모집단에서 4배 볼륨 차이의 실제 결과**를 본다. 측정법이 둘레+피부주름 추정 CSA라 초음파·MRI보다 둔감하다는 약점이 있어 "볼륨 무의미"로 읽으면 과잉이다. 그러나 **"목표를 못 채우면 성장이 멈춘다"는 식의 압박 문구는 지금 근거로 지지되지 않는다.** 폐루프는 하한 보장 장치로만 쓴다.

---

### 2-D. 간접 세트 가중치 — 0.5가 맞다 (**0.3~0.7 불확실성 해소**)

Pelland 2026은 기여 세트를 전부 **직접(direct)** 과 **간접(indirect)** 으로 분류한 뒤, 간접을 **0.0(direct법) / 0.5(fractional법) / 1.0(total법)** 세 가지로 세어 모델 적합도를 비교했다.

| 방법 | 간접 세트 가중 | 근비대 적합도 |
|---|---|---|
| total | 1.0 | fractional에 밀림 (strong evidence) |
| **fractional** | **0.5** | **최선** — 주 모델로 채택 |
| direct | 0.0 | fractional에 크게 밀림 (very strong evidence) |

근력 쪽에서는 반대로 **direct(0.0)** 법이 가장 잘 맞았다.

> **앱 대조**: `js/domain.js:2243-2248`의 0.5는 그대로 옳다. 다만 주석의 "0.3~0.7 휴리스틱 중 0.5"라는 겸양은 이제 **낡았다** — 세 후보 중 통계적으로 선택된 값이다. 그리고 **근비대는 fractional, 근력은 direct** 라는 비대칭은 앱에 아직 없는 지식이다.

---

### 2-E. 큰/작은 근육 목표 차등 — **근거 없음 + 같은 보정을 두 번**

앱의 논리는 이렇다.

1. `fractional` = 직접 1.0 + 간접 0.5 → **간접 자극을 이미 숫자에 더한다.**
2. 그 숫자를 판정할 때 작은 근육은 "복합에서 간접자극을 받으니까" **목표를 8로 낮춘다.**

**같은 사실을 두 번 반영한다.** 간접 자극이 많은 부위는 분자(볼륨)가 이미 커지는데, 분모(목표)까지 작아진다.

**실제로 어떤 일이 벌어지나** — 앱 자체 배분표(`training-splits.md §4-A`)의 숫자를 그대로 넣으면:

| 부위 | 직접 세트/주 | 프랙셔널 | 앱 판정(현행) | 앱 규칙 ⑨가 원하는 것 |
|---|---|---|---|---|
| 이두 | 6 | **≈12** | 🟢 적정 (목표 8) | "복합만으론 안 참 → 직접 고립 넣어라" |
| 삼두 | 6 | **≈11** | 🟢 적정 (목표 8) | 동일 |
| 가슴 | 9 | ≈9 | 🟡 하한 미달 (하한 10) | — |
| 측면삼각 | 6 | ≈6 | 🟡 하한 미달 | 직접 필요 |

즉 **진단(🟢)이 규칙 ⑨(직접 고립 필수)를 무력화한다.** AI는 "이두는 적정"이라는 컨텍스트를 먼저 읽는다.

**앱이 근거로 든 출처조차 반대한다** — [RP 볼륨 랜드마크](https://renaissanceperiodization.com/expert-advice/training-volume-landmarks-muscle-growth):

| 부위 | MEV | MAV | MRV |
|---|---|---|---|
| 가슴 | 10 | 12~20 | 22+ |
| 등 | 10 | 14~22 | 25+ |
| **측면삼각** | **8** | **16~22** | **26+** |
| **이두** | **6** | **14~20** | **26+** |
| 삼두 | 6 | 10~14 | 18+ |

작은 근육의 MAV가 **가슴보다 높거나 같다**. "작아서 덜 필요하다"는 말은 이 표에 없다. (RP 랜드마크는 **직접 세트** 기준이라 앱의 프랙셔널과 단위도 다르다 — 프랙셔널 목표 8은 RP MEV보다도 낮다.)

**Pelland 2026 역시 근육 크기별로 곡선을 나누지 않았다.** 상·하체 층화에서 하체에서만 용량 반응이 뚜렷했다는 분석이 있으나, 이는 "작은 근육 = 낮은 목표"와 방향이 다르다.

> **판정: 근거 없음(통념).** 다만 목표 차등이 **시간 예산 우선순위**로서는 합리적이다 — 60분×5일에서 모든 부위를 12세트로 채울 수 없다. **숫자를 남기더라도 "간접자극 때문"이라는 근거 문장은 지워야 한다.**

---

### 2-F. 종아리·팔·측면어깨 직접 볼륨 — 앱 방향이 맞다

| 부위 | 근거 | 판정 |
|---|---|---|
| **종아리** | Kassiano 등 (2024, *Int J Sports Med*): 주 6 / 9 / 12세트 비교, 6주·주3회. **12세트군이 외측비복근·가자미근·합계에서 6세트군보다 우위**, 9세트군은 양쪽과 유의차 없음 | 견고쪽 잠정 (미훈련 여성 · 6주) — 앱의 `size:'large'` 예외 **유지** |
| **이두·삼두** | Mannarino 등 (2021, *JSCR*): 같은 사람의 양팔에 각각 덤벨 컬 / 언더핸드 덤벨 로우. **컬 쪽 주관절 굴곡근 두께 증가가 약 2배** | 견고쪽 잠정 (단일 연구, 자기대조 설계는 강점) — 직접 고립 슬롯 **유지** |
| **측면어깨** | 오버헤드 프레스도 중간삼각을 쓰지만(27.9% MVIC vs 레터럴 30.3%), 레터럴 레이즈가 측면두 EMG 최고. 덤벨 vs 케이블 레터럴은 8주 3.3~4.6% 증가로 **동등**(2024 실험) | 잠정 (EMG·실무 중심) — 직접 슬롯 **유지**, 기구는 자유 |
| **후면어깨** | 프레스로 대체 불가(역학·EMG). 새 반대 근거 못 찾음 | 잠정 유지 |

> **공통 함의**: 이 네 부위는 **프랙셔널이 아니라 직접 세트로 관리해야 한다.** 앱은 `getRecentVolumeSplitByPart`에서 `direct` 맵을 **이미 계산해 놓고 버린다**(`js/domain.js:2256-2257`). 여기에 하한만 붙이면 된다.

---

### 2-G. 빈도 — 앱 문장이 정확하다 (**견고**)

| 출처 | 결과 |
|---|---|
| Schoenfeld·Grgic·Krieger 2019 (*J Sports Sci* 37(11):1286) | 볼륨 동일 시 주 1회 vs 2회 근비대 차이 없음 (같은 저자들이 2016년 자기 결론을 뒤집음) |
| **Pelland 2026** | 빈도→근비대 사후확률 **<100%** = 무시 가능한 효과와 양립. 빈도→**근력**은 사후확률 **100%**(체감 있음) |
| ACSM 2026 | 실무 권고는 여전히 **주요 부위 주 2회 이상** |

> **앱 대조**: `js/data.js:1391`은 이미 "근비대엔 무관 · 근력엔 유의 · 주 2회는 세트를 나눠 담는 그릇"까지 정확히 적어 놓았다. **문제는 요약본**이다 — `js/ai.js:266 / 956 / 1615`는 "빈도 무관"만 남기고 근력 단서를 뺐다. 주간 리뷰가 "빈도는 상관없다"고 단정하면 사용자의 주 5일 습관을 스스로 깎는다.
> 사용자는 주 5일 PPLUL로 **하체 주 2회 · 상체 각 부위 주 2회**를 이미 만족한다. 빈도는 손댈 필요 없는 축이다.

---

### 2-H. 세션당 부위 세트 상한 — **잠정 (앱 값 유지)**

**Remmert JF, Pelland JC, Robinson ZP, Hinson SR, Zourdos MC (2025).** *Is There Too Much of a Good Thing? Meta-Regressions of the Effect of Per-Session Volume on Hypertrophy and Strength.* [SportRxiv 537](https://sportrxiv.org/index.php/server/preprint/view/537) · DOI 10.51224/SRXIV.537 — **2026년 9월 현재도 프리프린트**(동료심사 통과 확인 못 함).

- 세션당 볼륨도 근비대·근력 모두 양의 용량 반응 + 수확 체감.
- PUOS: 근비대 **세션당 약 11 프랙셔널 세트**, 근력 **약 2 직접 세트**.
- 실용 종합: **주 3세션 × 세션당 11세트 ≈ 주 31 프랙셔널** 이면 그 이상에서 검출 가능한 우월이 없다.

> **앱 대조**: 앱의 "세션당 한 부위 **직접** 8세트"는 단위가 다르다. 직접 8세트짜리 세션은 간접까지 더하면 프랙셔널 10~12에 해당하니 **11과 사실상 같은 자리**다. 우연히 잘 맞았다. `js/ai.js:1189`이 "정밀 근거는 아직 약함"이라 스스로 밝힌 것도 프리프린트 상태와 정합적이다. **변경 불필요.**

---

### 2-I. 폐루프("목표까지 채우기") — 방향 잠정, **창(window)은 결함**

**찬성 근거**

| 출처 | 결과 |
|---|---|
| **Enes 등 2025** (*J Sports Sci* 43(4):381-392, [DOI 10.1080/02640414.2025.2459003](https://doi.org/10.1080/02640414.2025.2459003)) | 훈련 경험 2.1년 여성 30명, 12주. 고정 22세트/주(CG) vs 2주마다 +2세트(2SG) vs +4세트(4SG). **1RM은 4SG·2SG > CG**(p<0.001, p=0.032), **외측광근 CSA는 4SG > CG**(p=0.029). 대퇴 두께 합계는 차이 없음 |
| **Robinson 등 2025** (bioRxiv, 반복 편측 시험) | 16명·11주×2단계. 주 8세트 vs 16세트 편측 레그프레스. **16세트가 외측광근 CSA에서 소폭 우위(1.8 cm²)**, 최대근력은 차이 없음. **"개인별 최적 볼륨"의 실재 근거는 거의 없었다**(조건별 신뢰도 0.04~0.06) |

**반대 근거**: 2-C의 Steele 2026 (9 vs 36 프랙셔널 동등).

**정합성 결함 (근거와 무관)**

`js/ai.js:568`은 `getRecentVolumeByPart(2)` → **최근 14일 합계 ÷ 2**를 쓴다. 즉 폐루프의 "남은 세트"는 **지난 2주 평균과 목표의 차이**이지 **이번 주 잔여량이 아니다.**

- 월요일에 가슴 12세트를 하고 화요일에 루틴을 만들면, 평균은 (12+지난주)/2 → 예컨대 6 → "가슴 6세트 더 필요"라고 AI에 전달된다 → 같은 주에 가슴을 또 몰아넣는다.
- 반대로 지난주에 몰아쳤으면 이번 주 내내 "충분함"으로 뜬다.
- 사용자는 **자율 운영(요일 고정 아님)** 이라 주간 누적이 들쭉날쭉해 이 오차가 커진다.

> 고칠 방법: `getRecentVolumeSplitByPart` 를 **이번 주(월~오늘) 누적** 과 **지난 2주 평균** 두 값으로 뽑아, 프롬프트에 "이번 주 이미 N세트 / 목표 M세트 / 남은 M−N"으로 준다. 임계값 표는 건드리지 않아도 된다.

---

### 2-J. 60분 × 주 5일에서 실현 가능한 주간 세트 수 — **내부 추정(외부 근거 없음)**

앱의 계산(`js/ai.js:1199`, `training-splits.md §2`): 종목 1개 실소요 = 고중량복합 12분 / 중강도복합 10분 / 고립 9분 / 경량고립 8분 → **6종목 18세트 ≈ 57분**, 7종목 21세트 ≈ 66분.

**주간 총량 재계산**

| 회계 단위 | 주간 총량 | 14그룹에 나누면 |
|---|---|---|
| 직접 세트 | 5세션 × 15~18 = **75~90** | 그룹당 평균 5.4~6.4 |
| 프랙셔널(간접 0.5 포함) | 복합 비중을 고려하면 대략 **140~170 크레딧** | 그룹당 평균 10~12 |

- **"주 80세트 예산으로는 모든 부위를 채울 수 없다"는 앱 문서의 비관은 회계 단위 착오다.** 예산은 직접 세트로, 목표는 프랙셔널로 재고 있었다. 프랙셔널로 환산하면 **주요 부위 대부분을 10~12에 올리는 것이 실제로 가능하다.**
- 다만 **직접 세트로만 채워지는 부위**(측면·후면어깨·이두·삼두·종아리·복근)는 예산을 그대로 먹는다. 이 여섯 부위에 주 4세트씩만 배정해도 **24세트 = 주간 예산의 약 30%** 다. 여기가 진짜 병목이다.
- 결론: 시간 예산 문제는 "볼륨 목표를 낮춰서" 풀 게 아니라 **직접 고립 슬롯을 먼저 확보하고 복합으로 나머지를 덮는 순서**로 푸는 게 맞다.

---

## 3) 공백 — 앱에 없지만 코치가 알아야 할 것 (2024~2026)

| # | 공백 | 왜 중요한가 |
|---|---|---|
| G1 | **근비대 = fractional, 근력 = direct** 라는 회계 비대칭 (Pelland 2026) | 앱은 근비대·근력을 같은 프랙셔널 숫자로 판단한다. 1RM 정체 진단에는 **직접 세트**를 봐야 한다 |
| G2 | **주간 PUOS ≈ 31 프랙셔널 / 세션 PUOS ≈ 11 프랙셔널** | "20+ = 이득 완만"이라는 앱 라벨보다 실제 여유가 크다. 사용자가 볼륨을 늘릴 때 겁주지 않아도 된다 |
| G3 | **최소 유효 용량 = 주 4 프랙셔널 세트** | 앱의 "4세트 미만 = 부족"과 정확히 일치한다는 사실을 근거로 명시할 수 있다(현재는 값만 있고 출처 연결이 약함) |
| G4 | **볼륨 점증(주기화) 축** — Enes 2025 | 앱의 5주 사이클은 **강도·디로드만** 다루고 세트 수는 고정이다. "빌드 4주 동안 2주마다 +2세트"가 근거 있는 축인데 없다 |
| G5 | **개인별 최적 볼륨 차이는 대부분 노이즈** — Robinson 2025 | 앱이 "당신에게 맞는 볼륨"을 자처하면 근거를 넘어선다. 집단 권장값 + 컨디션 반응형이 정직한 선 |
| G6 | **훈련자에서 절대 효과는 작다** — Steele 2026 | 기대치 관리 문구가 앱에 없다. 12주에 팔·허벅지 둘레 변화가 미미한 건 실패가 아니다 |
| G7 | **ACSM 2026 신 가이드라인** (137 리뷰·3만 명) | 앱은 ACSM 2009를 인용 중. 주 ~10세트·주2회·실패 불필요는 앱 기본값과 일치하므로 인용만 갱신하면 된다 |
| G8 | **`direct` 맵 미사용** | 이미 계산된 데이터를 버리고 있다. 2-F의 네 부위 문제를 풀 수 있는 유일한 재료 |
| G9 | **폐루프 창이 주 단위가 아님** | §2-I. 근거 문제가 아니라 버그에 가깝다 |
| G10 | **`untouched`(0세트) 버킷이 저우선** | 볼륨 0은 최소 유효 용량(4) 미달 중에서도 최악인데 `lacking`보다 뒤로 밀린다. 복근·내전근 도배를 막으려던 조치가 **종아리·후면어깨 0세트도 함께 숨긴다** |

---

## 4) 앱 반영 수치 표 (가장 중요)

### 4-A. 코드값 변경 후보 (근거 **견고**)

| 항목 | 현재 값 | 권장 값 | 근거 등급 | 반영 위치 | 바꾸면 달라지는 사용자 경험 |
|---|---|---|---|---|---|
| **작은 근육 주간 목표** | 8 | **10** | 견고 (Pelland 2026 단일 프랙셔널 곡선 · RP 랜드마크) | `js/domain.js:2272` `getVolumeThresholds.target` | 측면·후면어깨·삼두가 "적정"으로 조기 졸업하지 않고, AI가 고립 슬롯을 계속 배정한다 |
| **작은 근육 수확 체감선** | 16 | **20** (큰 근육과 통일) | 견고 (동일) | `js/domain.js:2271` `optimalTop` | 이두·삼두가 복합 간접분만으로 🔥 경고를 받아 "더 늘리지 마"로 오독되는 일이 사라진다 |
| **직접 세트 하한 (신설)** | 없음 (`direct` 맵 폐기) | **주 4 직접세트** — 측면어깨·후면어깨·이두·삼두·종아리 | 견고 (Pelland 2026 direct/indirect 구분 · Mannarino 2021 · Kassiano 2024) | `js/domain.js:2256-2257` 에서 `direct` 도 반환 → `getVolumeDiagnosis` 에 `directShort` 버킷 추가 | 프랙셔널로는 🟢인데 직접 세트가 0~2인 부위를 잡아낸다. 규칙 ⑨가 진단과 같은 편이 된다 |
| **간접 0.5 주석 문구** | "0.3~0.7 휴리스틱 중 0.5" | "세 방식(0/0.5/1.0) 중 통계적 최선" | 견고 (Pelland 2026) | `js/domain.js:2243` 주석 | (내부용) 값은 그대로. 근거 강도가 올라 흔들 이유가 없어진다 |

> ⚠️ **테스트 주의**: `getVolumeThresholds`의 4/10/20·3/8/16은 `tests/characterization.test.mjs:1805-1814`에 골든값으로 박혀 있다. 값 변경 시 테스트도 함께 고쳐야 한다.

### 4-B. 프롬프트·문구 변경 후보 (근거 **잠정** 또는 정합성)

| 항목 | 현재 값 | 권장 값 | 근거 등급 | 반영 위치 | 바꾸면 달라지는 사용자 경험 |
|---|---|---|---|---|---|
| **작은 근육 목표 근거 문장** | "복합운동 간접자극을 받아 목표가 낮다" | **삭제** → "간접 세트는 이미 0.5로 더해져 있다. 목표 차이는 시간 예산 우선순위다" | 반박됨(이중 차감) | `js/ai.js:575, 1188, 1277` · `js/domain.js:2290-2292` 주석 | AI가 "팔은 복합으로 충분"이라 결론 내리는 경로가 막힌다 |
| **폐루프 창** | 최근 2주 평균 | **이번 주 누적 + 지난 2주 평균 병기** | 정합성(근거 아님) | `js/ai.js:568, 595-621` | 주 초반 과소·주 후반 과대 처방이 사라진다. "이번 주 가슴 6/12" 처럼 읽힌다 |
| **빈도 요약 문장** | "빈도 무관 (Schoenfeld 2019)" | **"근비대엔 무관, 근력엔 유의(Pelland 2026 사후확률 100%). 주 2회는 세트를 나눠 담는 그릇"** | 견고 | `js/ai.js:266, 956, 1615` | 주간 리뷰가 사용자의 주 5일 습관을 스스로 깎지 않는다 |
| **수확 체감 안내** | 큰 20+ / 작은 16+ | 문장에 **"주 31 프랙셔널까지는 검출 가능한 추가 이득이 있다"** 한 줄 추가 | 견고 (Pelland 2026 PUOS) | `js/ai.js:1190, 1277` · `js/data.js:1389` | 볼륨을 늘리려는 사용자를 근거 없이 말리지 않는다 |
| **볼륨 점증 축** | 없음(세트 고정) | **빌드 주차에 2주마다 부족 부위 +2세트** 제안(강제 아님) | 잠정 (Enes 2025 단일 RCT·여성) | `js/ai.js` 규칙 ⑬ 근처 · 지식 §1 | 5주 사이클이 강도뿐 아니라 볼륨으로도 진행된다 |
| **세션당 8 직접세트** | 8 (소프트) | **유지** | 잠정 (Remmert 2025 프리프린트) | `js/ai.js:1189` | 변경 없음 |
| **종아리 large 예외** | `size:'large'` | **유지** + 근거를 Kassiano 2024로 갱신 | 견고쪽 잠정 | `js/data.js:1348-1350` 주석 | 변경 없음. 근거 문장만 정확해진다 |

### 4-C. 지식 문서(COACH_KNOWLEDGE) 갱신 후보

| 항목 | 현재 값 | 권장 값 | 근거 등급 | 위치 |
|---|---|---|---|---|
| 볼륨 출처 | "Pelland 2024" (프리프린트) | **"Pelland 2026, Sports Med, 67연구·2,058명"** | 견고 | `js/data.js:1389` |
| 최소 유효 용량 | "4세트 미만 = 부족" | 유지 + **"주 4 프랙셔널이 검출 가능한 최소 용량"** 출처 연결 | 견고 | `js/data.js:1389` |
| 효율 구간 | 없음 | **"5~10 구간이 가장 효율적, 11~18은 +8.5세트마다 추가 이득"** | 견고 | `js/data.js:1389` |
| 반대 근거 | 없음 | **"단 훈련자 12주 RCT에서 주 9 vs 36 프랙셔널이 동등(Steele 2026) — 목표 미달을 실패로 말하지 않는다"** | 견고(단일 대규모 RCT) | `js/data.js:1389` |
| 근력 회계 | 없음 | **"근비대는 프랙셔널, 근력은 직접 세트로 센다"** | 견고 | `js/data.js:1389` |
| ACSM 인용 | 2009 | **2026 (MSSE, 137 리뷰)** | 견고 | `js/data.js` §8·어시스트 항목 |

### 4-D. 삭제 후보

| 항목 | 이유 |
|---|---|
| "작은 근육은 간접자극을 받아 목표가 낮다" (4곳) | 이중 차감. 프랙셔널 회계와 논리적으로 충돌 |
| `docs/research/training-splits.md §4-A`의 "주 80세트 예산" 비관 프레이밍 | 직접/프랙셔널 회계 단위를 섞었다. 프랙셔널 환산 표로 교체 권장 |
| `docs/ai-routine-improvement-plan.md §⑤`의 "0.5는 정밀값 아님" 단서 | Pelland 2026으로 해소됨 |

---

## 5) 정직한 한계

1. **Pelland 2026 본문을 직접 읽지 못했다.** *Sports Medicine* 원문 PDF는 텍스트 추출에 실패했고(폰트 인코딩), 초록·프리프린트 페이지·2차 요약을 교차 확인해 수치를 옮겼다. **주 31 프랙셔널 PUOS, 4/6/8.5세트 효율 티어**는 2차 출처 경유 수치라 원문 표와 소수점까지 일치한다고 보장할 수 없다. 코드값을 바꾸기 전에 원문 Figure(fractional weekly set volume marginal effects)를 한 번 더 확인하길 권한다.
2. **Remmert 2025는 프리프린트다.** 세션당 상한의 근거는 여전히 동료심사를 안 거쳤다. 앱이 이 값을 하드컷으로 쓰지 않는 현재 설계가 옳다.
3. **Pelland(메타회귀)와 Steele(대규모 RCT)이 상충한다.** 전자는 볼륨↑=성장↑(체감 있음), 후자는 9 vs 36 동등. 측정법(초음파/MRI vs 둘레+피부주름)·대상(혼합 vs 훈련자)·기간(다양 vs 12주)이 달라 단순 비교가 안 된다. **어느 쪽도 숨기지 않고 둘 다 싣는 것이 지금 할 수 있는 최선**이다.
4. **"작은 근육 목표 낮춤"에 대한 반박은 직접 실험이 아니다.** "작은 근육에는 낮은 목표가 맞다"를 검증한 RCT도, 반박한 RCT도 찾지 못했다. 내 반박은 ① 프랙셔널 회계와의 논리적 이중 차감 ② RP 랜드마크가 반대 방향 ③ 메타회귀가 크기별로 곡선을 나누지 않음, **세 가지 간접 논증**이다. 등급을 "반박됨"이 아니라 "근거 없음(통념)"으로 적은 이유다.
5. **종아리·팔 근거는 각각 단일 연구다.** Kassiano 2024는 미훈련 여성 6주, Mannarino 2021은 n이 작은 편측 설계다. 방향은 일관되지만 "견고"라고 부르기엔 이르다.
6. **60분 시간 예산과 프랙셔널 환산(140~170 크레딧)은 내 계산이다.** 외부 근거가 아니라 앱의 종목당 소요 시간 추정치에 기반한 산술이며, 실제 종목 구성에 따라 ±20% 흔들린다.
7. **Enes 2025는 여성 30명 12주 단일 RCT다.** 볼륨 점증을 사이클에 넣자는 제안은 잠정 등급을 넘지 못한다. 강제가 아니라 제안으로만 넣어야 한다.
8. **찾지 못한 것**: 근육 크기(대/소)별 용량 반응을 직접 비교한 메타회귀, 자율 분할(요일 비고정)에서 주간 볼륨 회계의 오차를 다룬 연구, 세션당 상한의 동료심사 판본.

---

## 6) 출처

**메타분석·메타회귀**
- Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC (2026). *The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains.* **Sports Medicine.** DOI [10.1007/s40279-025-02344-w](https://doi.org/10.1007/s40279-025-02344-w) · PMID 41343037 · 프리프린트: https://sportrxiv.org/index.php/server/preprint/view/460
- Remmert JF, Pelland JC, Robinson ZP, Hinson SR, Zourdos MC (2025). *Is There Too Much of a Good Thing? Meta-Regressions of the Effect of Per-Session Volume on Hypertrophy and Strength.* SportRxiv 프리프린트, DOI 10.51224/SRXIV.537 · https://sportrxiv.org/index.php/server/preprint/view/537
- Schoenfeld BJ, Grgic J, Krieger J (2019). *How many times per week should a muscle be trained to maximize muscle hypertrophy?* **J Sports Sci** 37(11):1286-1295. https://pubmed.ncbi.nlm.nih.gov/30558493/
- Schoenfeld BJ, Ogborn D, Krieger JW (2017). *Dose-response relationship between weekly resistance training volume and increases in muscle mass.* **J Sports Sci** 35(11):1073-1082. https://pubmed.ncbi.nlm.nih.gov/27433992/
- ACSM (2026). *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.* **MSSE.** https://acsm.org/resistance-training-guidelines-update-2026/

**RCT · 실험**
- Steele J, Gschneidner D, Carlson L, Fisher J (2026). *A test of higher and lower fractional volumes of resistance training upon arm and thigh muscle area: A multi-site randomised trial.* SportRxiv 810. https://sportrxiv.org/index.php/server/preprint/view/810
- Enes A 등 (2025). *Does increasing the resistance-training volume lead to greater gains? The effects of weekly set progressions on muscular adaptations in females.* **J Sports Sci** 43(4):381-392. DOI [10.1080/02640414.2025.2459003](https://doi.org/10.1080/02640414.2025.2459003) · https://pubmed.ncbi.nlm.nih.gov/39869076/
- Robinson ZP 등 (2025). *The Effect of Resistance Training Volume on Individual-Level Skeletal Muscle Adaptations: A Novel Replicated Within-Participant Unilateral Trial.* bioRxiv. https://www.biorxiv.org/content/10.1101/2025.07.24.666533v1.full
- Kassiano W 등 (2024). *Bigger Calves from Doing Higher Resistance Training Volume?* **Int J Sports Med.** https://www.thieme-connect.com/products/ejournals/abstract/10.1055/a-2316-7885
- Mannarino P 등 (2021). *Single-Joint Exercise Results in Higher Hypertrophy of Elbow Flexors Than Multijoint Exercise.* **J Strength Cond Res** 35(10). https://pubmed.ncbi.nlm.nih.gov/31356511/
- Coleman M 등 (2024/2025). *Dumbbell versus cable lateral raises for lateral deltoid hypertrophy: an experimental study.* https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12277279/

**실무 자료**
- Renaissance Periodization — *Training Volume Landmarks for Muscle Growth.* https://renaissanceperiodization.com/expert-advice/training-volume-landmarks-muscle-growth
- Stronger by Science — *Training Frequency for Muscle Growth: What the Data Say.* https://www.strongerbyscience.com/frequency-muscle/
- NSCA — *Training Volume and Hypertrophy: An Evidence-Based Approach for Personal Trainers.* https://www.nsca.com/education/articles/ptq/training-volume-and-hypertrophy-an-evidence-based-approach-for-personal-trainers/
- BioLayne REPS #36 — *Too Much Muscle Math? Finding the Ideal Training Volume per Session* (Remmert 2025 해설). https://biolayne.com/reps/issue-36/too-much-muscle-math-finding-the-ideal-training-volume-per-session/

**앱 내부 참조**
- `js/domain.js:2206-2323` (`getRecentVolumeSplitByPart` · `getVolumeThresholds` · `getVolumeDiagnosis`)
- `js/data.js:156-235` (SESSIONS) · `js/data.js:1331-1352` (BODY_PART_GROUPS) · `js/data.js:1388-1391` (COACH_KNOWLEDGE §1)
- `js/ai.js:568-640` (볼륨 컨텍스트·폐루프) · `js/ai.js:1183-1290` (루틴 생성 규칙 ②④⑨)
- `docs/research/training-splits.md §1-E · §2-D · §4-A · §4-B` · `docs/ai-routine-improvement-plan.md §② ⑤`
