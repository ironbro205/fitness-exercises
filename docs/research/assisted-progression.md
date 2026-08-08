# 어시스트(보조) 기구 종목의 점진적 과부하 — 역방향 진행

> 대상: 어시스트 풀업 / 어시스트 딥스 (카운터웨이트 방식 보조 머신)
> 이 문서는 `js/domain.js`의 역방향 진행 로직이 왜 그렇게 생겼는지의 근거다.
> 관련 코드: `isReverseProgression` · `getProgressiveRecommendation` · `getAssistProgressTrend` · `pruneReverseProgression1RM`

---

## §0. 한 줄 요약

어시스트 머신의 스택 무게는 **부하가 아니라 체중을 상쇄해 주는 보조력**이다.
실질 부하 = **체중 − 보조 무게**. 그래서 **보조를 낮추는 것이 증량**이고, 앱의 모든 "무게 ↑ = 진행" 가정이 이 종목에서만 정반대로 뒤집힌다.

```
보조 45kg → 40kg → 35kg → … → 0kg(맨몸) → (그다음은 가중 풀업/딥스)
   약함 ────────────────────────────────────────────────→ 강함
```

---

## §1. 진행 규칙 — 방향만 뒤집은 더블 프로그레션

일반 종목과 **같은 더블 프로그레션**을 쓰되 부호만 반대다.

- 목표 반복 범위의 **상단을 모든 워킹세트에서 달성** → 다음 세션에 보조를 한 칸 **내린다**.
- 못 채우면 같은 보조 무게로 반복을 더 쌓는다(= 유지).

근거:
- **ACSM position stand (2009)** — "현재 부하로 목표 반복보다 1~2회를 더 할 수 있게 되면 부하를 2~10% 올린다." 어시스트 머신에서 "부하를 올린다" = "보조를 내린다"로 1:1 대응된다.
  https://pubmed.ncbi.nlm.nih.gov/19204579/
- **NSCA 2-for-2 규칙** (Baechle & Earle, *Essentials of Strength Training and Conditioning*) — "2세션 연속으로 목표보다 2회 이상" 나올 때만 올린다. 어시스트는 상대 점프가 크므로 이 보수적 트리거가 특히 잘 맞는다.
  https://athleticperformancetc.wordpress.com/2012/10/08/resistance-training-part-5-training-load-and-repetition/
- **ExRx — Calculating Actual Resistance** — "머신 보조 운동에서는 머신에 건 무게가 사용자의 체중에서 빠지므로, 실제 저항은 체중 − 머신에 선택한 무게다."
  https://exrx.net/WeightTraining/Bodyweight

앱에서 어시스트 풀업·딥스는 이름에 `풀업`/`딥스`가 들어가 `compound_heavy`(5~8회, `doubleSessions: 2`)로 분류된다 — 즉 **2세션 연속 상단 달성**이 증량 조건이며, 이는 위 NSCA 2-for-2와 같은 보수성이다.

---

## §2. 한 칸의 크기 — 왜 5kg 그대로 두었나

ExRx의 계산법은 "보조 무게의 %"가 아니라 **실질 부하의 2.5~10%**다:

```
실질부하 = 체중 − 현재보조
목표실질 = 실질부하 × 1.025~1.10
새보조   = 체중 − 목표실질
```

ExRx 예시: 체중 130 lb, 보조 30 lb → 실질 100 lb → +5% (105 lb) → 새 보조 25 lb (보조 −5 lb).

**함정**: 보조를 X kg 내리면 실질 부하는 정확히 X kg 늘어나는데, 실질 부하가 작을수록 같은 X kg의 상대 점프가 폭발적으로 커진다.

| 체중 | 보조 | 실질 | 보조 −5kg의 상대 증가 |
|---|---|---|---|
| 70kg | 45kg | 25kg | **+20%** (ACSM 상한의 2배) |
| 70kg | 10kg | 60kg | +8.3% (정상) |

상용 기기의 최소 증분은 실제로 두 배 이상 차이 난다:

| 기기 | 스택 | 최소 증분 |
|---|---|---|
| Matrix Versa Chin/Dip Assist | 68kg (150 lb) | 5 lb (2.3kg) |
| Life Fitness Insignia Assist Dip Chin | 85kg (170 lb) | 5 lb (2.5kg) 다이얼 2개 |
| 국내 보급형·구형 다수 | 60~90kg | **5kg** |

**이 앱의 결정**: 증분은 앱 전역 규칙(`getWeightIncrement`: 덤벨 2kg / 그 외 5kg)을 **그대로 5kg으로 둔다.**
- 이유 ①: 2.5kg으로 바꾸면 5kg 판만 있는 기기에서 **실행 불가능한 값**(42.5kg)을 추천하게 된다. 실행 가능성이 정밀도보다 우선한다.
- 이유 ②: 기기별 증분을 사용자 설정으로 빼는 것은 이번 범위 밖(설정 항목 신설 = 새 기능).
- 대신 **상대 점프가 10%를 넘으면 추천 문구에 경고를 붙인다**(`assistJumpWarning`): "실질 부하 +20% — 큰 점프예요. 반복이 하단으로 떨어져도 정상이에요". 막지는 않는다 — 막으면 초보 구간에서 진행이 영구히 얼어붙는다.
- 사용자의 기기에 2.5kg 애드온 핀이 있다면 그것을 먼저 쓰는 편이 근거상 낫다(세트 편집 화면에서 직접 입력 가능).

**보조를 못 내리는 구간의 대안**: 반복 진행으로 대체해도 근비대는 동등하다 — Chaves et al. / Plotkin et al. (부하 진행 vs 반복 진행, 근비대 차이 없음; 근력만 부하 진행이 +5.9%).
https://www.strongerbyscience.com/progressive-overload-strategies/

---

## §3. 1RM(e1RM)을 계산하지 않는 이유

**보조 무게를 Epley 공식에 넣으면 부호가 뒤집힌 지표가 나온다.**

> 보조 40kg × 10회 → e1RM 53kg. 사용자가 강해져 보조 30kg으로 내려가면 → e1RM 40kg으로 **하락**.
> 진행이 퇴보로 기록된다.

그래서 어시스트 종목은 1RM 시스템에서 **완전히 제외**한다(`get1RM`/`update1RM`/`calculateRollingMax1RM`/`estimate1RMFromPart`/`recalc1RMAfterEdit`가 모두 조기 반환).
`INITIAL_1RM['어시스트 딥스'] = 66.67`은 삭제했고, 기존 사용자 저장소에 남은 값은 `pruneReverseProgression1RM()`이 부팅 때 지운다.

**실질 부하(체중−보조)로 e1RM을 계산하는 안은 채택하지 않았다**:
1. 세션 시점의 체중 스냅샷이 없어 과거 소급 계산이 불가능하다(체중 2kg 변동 = 실질 부하 2kg 변동).
2. 이 앱은 반복 12회까지 e1RM을 쓰는데, 1RM 추정 공식은 2~10회 구간에서만 검증됐다 — 어시스트는 구조상 반복이 높아 이 함정에 가장 잘 걸린다 (Mayhew 2008 / LeSuer 1997 / Brzycki 원문).
   https://journals.lww.com/nsca-jscr/fulltext/2008/09000/accuracy_of_prediction_equations_for_determining.24.aspx
3. 실질 부하 e1RM은 체중이 포함된 값이라 벤치 e1RM과 같은 리스트(`renderOneRMList`)에 섞으면 의미가 없다.

**대체 진행 지표 (간단한 방식 우선)**:
- `getAssistProgressTrend` — 최근 세션들의 **최소 보조 무게** 추이 + 감소량. 세션 화면 추천 카드에 "보조 추이 40 → 35 → 30kg (−10kg 진행 🔻)"로 한 줄 표시.
- **PR 판정 방향 반전** — 어시스트는 보조가 줄어든 날이 신기록이다. 기존 PR 시스템(배지·완료 화면·PR 히스토리·주간 리뷰)을 그대로 재사용하고 부등호만 뒤집었다. 새 차트 인프라는 만들지 않았다.
- `assistNetLoad` — 프로필 체중이 있으면 "실질 약 47.5kg"을 보조 옆에 함께 보여준다(연구가 권장하는 "위로 올라가는 지표").

---

## §4. 세트법(스킴) 상호작용

어시스트에서 "가볍게 한다" = **보조를 더 준다**. 그래서 감량 계산이 전부 뒤집힌다.

| 요소 | 정방향 | 역방향(어시스트) |
|---|---|---|
| 워밍업 | 본세트의 50%/75% 무게 | 본세트 보조 **+3칸 / +1칸** (보조가 많을수록 가볍다) |
| 백오프 (탑의 90%) | 무게 −10% | 보조 **+1칸** |
| 드롭 (−25%) | 무게 −25%씩 | 보조 **+2칸**씩 |
| 스킴 접기 | 무게 0 → 스트레이트로 접음 | 접지 않음 (보조 0kg에서도 "보조 추가"가 가능) |

`reduceWeight`에서 보조 무게에 0.9를 곱하면 오히려 **더 어려운** 백오프가 되어 그 세트법의 존재 이유가 정반대로 뒤집힌다. 비율(%)을 그대로 쓰지 않고 "칸" 단위로 바꾼 이유는, 보조 무게의 %가 실질 부하와 아무 관계가 없기 때문이다.

---

## §5. 보조 0kg 도달 이후

보조 0kg = 맨몸 풀업/딥스. 그 아래는 존재하지 않으므로 추천이 "졸업 안내"로 바뀐다:

> 🏅 보조 0kg에서 상단 8회 달성 — 이제 맨몸 풀업/딥스예요! 다음은 중량조끼·딥벨트로 무게를 더할 차례

가중(weighted) 단계는 **이 기능 범위 밖**이다 — 사용자가 종목을 `풀업`/`딥스`(맨몸 종목으로 이미 종목표에 존재)로 교체하면 정방향 진행이 자연스럽게 이어진다.

---

## §6. 판정 방식 — 왜 `equipment: 'assist_machine'`을 쓰지 않았나

종목표에서 `equipment: 'assist_machine'`이 붙은 종목은 6개인데, 그중 **실제 보조 하중 종목은 2개뿐**이다:

| 종목 | 역방향? | 이유 |
|---|---|---|
| 어시스트 딥스 | ✅ | 보조 하중 |
| 어시스트 풀업 | ✅ | 보조 하중 |
| 풀업 / 친업 / 딥스 | ❌ | 맨몸 종목 (무게가 있다면 **추가** 중량) |
| 행잉 니 레이즈 | ❌ | 보조 기구 프레임에 매달릴 뿐 |

그래서 판정은 **명시 목록(`REVERSE_PROGRESSION_EXERCISES`) + 이름 키워드(`ASSIST_NAME_KEYWORDS`)** 로 한다. 키워드가 필요한 이유는 AI 루틴 생성이 `어시스티드 풀업`, `머신 어시스트 딥스` 같은 미등록 표기를 만들어내기 때문이다(같은 이유로 `REHAB_NAME_KEYWORDS`가 이미 존재한다). `보조`는 단독으로 쓰면 오탐이 커서(보조 운동/보조근) 키워드에 넣지 않았다.

---

## §7. 남은 과제 (이번 범위 밖)

1. **반복 범위** — 연구는 어시스트 복합 풀에 6~12회를 권한다(큰 점프 후에도 범위 안에 남도록). 현재는 `compound_heavy`(5~8회)다. 5kg 점프에서 8회 → 6회로 떨어져도 범위 안이라 당장 깨지지는 않지만, 별도 `assisted` 클래스 신설을 검토할 만하다.
2. **기기별 증분 설정** — 2.3 / 2.5 / 5kg 선택지(§2).
3. **세션별 체중 스냅샷** — 실질 부하를 과거까지 정확히 소급 계산하려면 필요.
4. **가중 단계 연속 축** — 보조를 음수 무게로 저장하면 어시스트→맨몸→가중이 한 축이 되지만, 기존 로그·표시 전체를 바꿔야 해서 채택하지 않았다.

---

## 출처

- ExRx.net — Calculating Actual Resistance · https://exrx.net/WeightTraining/Bodyweight
- ACSM position stand: Progression models in resistance training for healthy adults (2009) · https://pubmed.ncbi.nlm.nih.gov/19204579/
- NSCA, *Essentials of Strength Training and Conditioning* (Baechle & Earle) — 2-for-2 rule, 2.5~10% 증량 · https://athleticperformancetc.wordpress.com/2012/10/08/resistance-training-part-5-training-load-and-repetition/
- Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis. *JSCR* 31(12):3508-3523, 2017 · https://pubmed.ncbi.nlm.nih.gov/28834797/
- Zourdos M. When to Use Specific Progressive Overload Strategies (MASS/Stronger by Science, 2024 — Chaves et al. / Plotkin et al. 리뷰) · https://www.strongerbyscience.com/progressive-overload-strategies/
- Mayhew JL et al. Accuracy of Prediction Equations for Determining One Repetition Maximum Bench Press. *JSCR* 22(5):1570-1577, 2008 · https://journals.lww.com/nsca-jscr/fulltext/2008/09000/accuracy_of_prediction_equations_for_determining.24.aspx
- Brzycki M. Strength Testing—Predicting a One-Rep Max from Reps-to-Fatigue · https://paulogentil.com/pdf/Strength%20Testing%E2%80%94Predicting%20a%20One-Rep%20Max%20from%20Reps-to-Fatigue.pdf
- Matrix Versa Chin/Dip Assist 스펙 (스택 68kg, 증분 2.3kg) · https://images.jhtassets.com/89db4d6df1ed55c1044919abc67959a35633f25f/
- Life Fitness Insignia Series Assist Dip Chin (스택 85kg, 2.5kg 다이얼 증분) · https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/insignia-series-assist-dip-chin
- Technogym Kneeling Easy Chin Dip (표준 스택 84kg) · https://www.technogym.com/en-US/product/kneeling-easy-chin-dip_MB91.html
