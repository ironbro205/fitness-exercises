# 디자인 정돈 — 전/후 비교 (v47 → v52)

- **전(before)**: `docs/research/design-audit/` — 감사 당시 라이브 **v47** 화면
- **후(after)**: 이 폴더 — 정돈 배포 후 라이브 **v52** 화면 (`https://fitness-exercises-iota.vercel.app`)
- 촬영 조건: 폰 크기 **가로 393px**, 헤드리스 크로미움, 전체 페이지 캡처
- 관련: PR #59 · 근거 문서 `docs/research/design-audit.md`

> **읽기 전 두 가지**
> 1. 전(v47) 캡처는 **사용자의 실제 데이터**, 후(v52) 캡처는 **재현 가능한 시드 데이터**로 찍었습니다.
>    그래서 길이 숫자는 "같은 화면을 같은 데이터로 잰 값"이 아니라 **대략의 비교**로 봐 주세요.
>    데이터 양에 좌우되지 않는 항목(이모지 수, 강조색 수, 반복 라벨 수)이 더 정확한 지표입니다.
> 2. 전(v47) 캡처는 리눅스에 이모지 글꼴이 없어 **이모지가 네모(□)로 보입니다.** 앱 버그가 아니었고,
>    "이모지는 기기 글꼴에 의존한다"는 게 이번에 SVG 아이콘으로 통일한 이유이기도 합니다.

> **되돌린 것 하나 (v53)** — 2단계 처방 표에서 "전 종목이 같은 값이면 세트·RIR 열을 접어
> 머리글 옆에 한 번만"은 종목별 세트 수를 못 읽게 만들어 되돌렸습니다. 값은 항상 종목 줄마다
> 적고, 고중량 복합에는 `탑세트 1 + 백오프 2 (90%)` 구성 줄을 더했습니다(PR #61).
> 후 캡처는 [03b-workout-step2-restored.png](03b-workout-step2-restored.png)가 최신입니다.

---

## 대표 화면 5곳

| # | 화면 | 전 (v47) | 후 (v52) | 핵심 변화 |
|---|---|---|---|---|
| 1 | **홈** | [01-home.png](../design-audit/01-home.png) | [01-home.png](01-home.png) | 제목 "홈" 블록 삭제(탭바와 중복) · 주간 횟수를 사이클 카드 한 곳에서만 · "1주차/5" 뱃지 삭제 · **최근 운동이 최신순으로 정렬**(08-08 → 08-06 → 08-04) · ✨📊⚠️ 제거 |
| 2 | **루틴 분석(2단계)** | [03-workout-step2.png](../design-audit/03-workout-step2.png) | [03b-workout-step2-restored.png](03b-workout-step2-restored.png) | 머리글을 **목록 위 한 번만**(라벨 24개 → 4개) · **폴백 루틴에는 "AI 분석 완료" 대신 회색 "기본 루틴"** · 강도 신호등 🟢🟡🔴 제거 |
| 3 | **운동 세션** | [10-session-active.png](../design-audit/10-session-active.png) | [10-session-active.png](10-session-active.png) | 무게 3종 → **추천 1개만 크게**, 지난 기록·추정 1RM은 아래 참고 한 줄 · 근육맵 기본 접힘(약 200px 회수) · 추정 1RM 소수점 반올림(93.33 → 93) |
| 4 | **기록** | [30-stats.png](../design-audit/30-stats.png) | [30-stats.png](30-stats.png) | 요약 3카드 → **한 줄 3칸** · 체중 목록 10줄 → **3줄 + 더 보기** · 0회 항목 숨김 · 사이클 카드 삭제(홈과 중복) · "클릭하여 상세 보기 / 삭제" 안내 삭제 · **운동 기록 최신순** |
| 5 | **더보기** | [40-more.png](../design-audit/40-more.png) | [40-more.png](40-more.png) | 섹션 **7개 → 3개**(AI 코칭 · 내 데이터·백업 · 앱) · 아이콘 타일 회색 통일(위험한 것만 빨강) · 백업 설명 두 겹 → 하나 · 영어 푸터(`FITNESS / Personal fitness tracker`) 삭제, 버전만 |

## 함께 찍은 화면

| 화면 | 전 | 후 | 핵심 변화 |
|---|---|---|---|
| 운동 — 부위 선택 | [02-workout.png](../design-audit/02-workout.png) | [02-workout.png](02-workout.png) | "목표 달성 %" 삭제(횟수와 같은 사실) · `오늘 어느 부위를 할까요?` → `부위 선택` · 0회 뱃지 숨김 · `STEP 1` → `1단계` |
| 러닝 — 시작 | [05-running.png](../design-audit/05-running.png) | [05-running.png](05-running.png) | 교육 문구 2문단 → 첫 문장 + ⓘ · 모드 아이콘 🏃⛰️ → SVG · 중복 각주 삭제 |
| 러닝 — 구성 완료 | [06-running-plan.png](../design-audit/06-running-plan.png) | [06-running-plan.png](06-running-plan.png) | **구간 17줄 → 5줄**(`반복 × 6회`로 접고 "구간 자세히"에 전체) |
| 운동 완료 | [17-session-complete.png](../design-audit/17-session-complete.png) | [17-session-complete.png](17-session-complete.png) | **색종이(컨페티) 삭제** — 축하는 체크 아이콘 하나 · `WORKOUT COMPLETE` 삭제 · `완료!` → `완료` · 컨디션 설명 2줄 → 양 끝 라벨 |
| 코치와 대화 | [41-coach-chat.png](../design-audit/41-coach-chat.png) | [41-coach-chat.png](41-coach-chat.png) | "API 키 필요" **3번 → 1번** · 인사말·예시 3줄 삭제(퀵칩과 글자까지 같았음) · 퀵칩 이모지 💪🍗📈⚠️😴 제거 |
| 내 1RM | [42-onerm-list.png](../design-audit/42-onerm-list.png) | [42-onerm-list.png](42-onerm-list.png) | 전부 앰버 → **흰색, 상위 5개만 강조** · 소수점 반올림 · 설명 7줄 → 1줄 + ⓘ · 부위 이모지 제거 |
| 주간 리뷰(키 없음) | [46-weekly-review.png](../design-audit/46-weekly-review.png) | [46-weekly-review.png](46-weekly-review.png) | **막다른 길 해소** — "키 설정하러 가기" 버튼 추가 |

---

## 숫자로 본 변화

데이터 양에 좌우되지 않는 지표 (코드 기준, 정확):

| 항목 | 전 (v47) | 후 (v52) |
|---|---:|---:|
| 화면 코드(`screens.js`)의 이모지 | **37종 / 87줄** | **0** |
| 코드에 직접 박은 색(`#RRGGBB`) | **57회** | **0** (`:root` 토큰 정의만) |
| 토큰 밖의 초록 | 3종(`#34d399`·`#10b981`·`--success`) | 1종(`--success`) |
| 가장 많이 쓰던 글자 크기 | **10px** (150회) | **11px** (10px는 단위 첨자만) |
| 격식체(합니다체) 문구 | **19개** | 0 |
| 루틴 카드의 반복 라벨 | 24개 | 4~5개 (머리글 한 줄) |
| 화면 제목 블록 | 5탭 전부 | 0 (탭바가 대신, 한국어) |

화면 길이 (시드 데이터 기준 — 위 주의사항 참고):

| 화면 | 전 (v47, 실사용 데이터) | 후 (v52, 시드 데이터) |
|---|---:|---:|
| 홈 | 964px | 852px (한 화면 안) |
| 운동 — 부위 선택 | 1,200px | 1,100px |
| 루틴 분석 | 1,469px | 1,396px |
| 러닝 구성 완료 | 1,764px | 1,270px |
| 운동 세션 | 1,120px | 1,049px |
| **기록** | **3,417px** | **2,025px** |
| 더보기 | 1,643px | 1,307px |

> 내 1RM 화면은 종목 45개를 나열하는 목록이라 길이가 거의 그대로입니다(3,342px).
> 줄어든 건 목록 위 설명 7줄뿐이고, 나머지는 사용자가 실제로 찾는 데이터입니다.

## 라이브 확인 결과

- `APP_VERSION` / `CACHE_VERSION` 모두 **v52** 서빙 확인
- 12개 화면 렌더 — **브라우저 콘솔 에러 0건**
- **가로 스크롤 0건** (`document.scrollWidth <= 393`, overflow 요소 없음)
