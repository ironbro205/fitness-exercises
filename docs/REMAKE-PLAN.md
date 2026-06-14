# 헬스앱 리메이크 계획 (grill-me 합의 기록)

작성: 2026-06-13. 비개발자(교사) 사용자와의 grill-me 인터뷰로 확정한 결정 모음.
세션이 끊기거나 /compact·/clear 후에도 여기서 이어서 진행한다.

## 진행 방식 (전역 규칙)
- 구현은 메인 Claude가 직접. 외부 리뷰는 Codex. 새 기능/다중파일/배포는 dev-pipeline 게이트.
- **운동 로직 결정은 무조건 근성장(근비대) 연구 근거 기반.** 모르면 먼저 조사. CLAUDE.md "## 개발 원칙 — 근성장 근거 기반" 참고.

## 작업 순서 — 6묶음 (확정)
1. 빠른 정리 (삭제 + 프로필 고치기)        ← **구현 완료 (594c1be)**
2. 엔진 수리 (1RM 자동 증감 + 사이클)       ← **구현 완료 (594c1be)**
3. AI 두뇌 (코치 기억·PT화 + 주간리뷰/정체기 코치통합 + 추천 다양화)  ← **구현 완료 (fc05290)**
4. GIF/영상 제거 (사용자=운동 숙련자, 영상 불필요)  ← **구현 완료** (영상칸·EXERCISE_GIFS·findExerciseGif 전면 삭제, 캐시 v17)
5. 화면 정리 (홈·운동·영양·기록 탭)         ← grill 예정
6. 디자인 (맨 마지막, 시안 보고 진행)        ← grill 예정

디자인을 맨 끝에 두는 이유: 기능·구조가 바뀌면 디자인을 두 번 하게 되므로.

---

## 묶음1 — 빠른 정리 (확정)
- **삭제 7개:** 종목 라이브러리 · 즐겨찾기 · 단위 · 알림 · 테마 · 도움말 · 앱정보
  - 전부 동작 없는 껍데기라 삭제 안전. (renderMore 내 해당 menu-row + 핸들러 제거)
  - 단위(settings.unit)·알림(toggleSetting('notifications'))·테마(settings.theme)는 저장만 되고 어디서도 안 읽힘 → 관련 토글/저장 코드도 제거.
- **프로필 수정 고치기:** 현재 more-profile-card(js/screens.js ~3525-3538)에 onclick 없음 + 편집 화면 자체가 없음.
  - 편집 필드 = **기본 + 목표**: 키·몸무게·나이 + 목표 단백질·목표 칼로리·운동 빈도(workoutFreq).
  - UI = **아래서 올라오는 모달(시트)**. (API 키 모달 등 기존 시트 패턴 재사용)
  - state.profile + KEYS.PROFILE 저장. DEFAULT_PROFILE(js/data.js 6-16) 필드 사용.
- **데이터 내보내기/가져오기/초기화 = 3개 다 유지하되 실제 작동 점검:**
  - 내보내기(exportData ~3423): 작동함. **새 폰에서 복원 가능한 백업 파일로 개선**(현재는 읽기용 .md).
  - 가져오기(~3691): **현재 가짜(alert만)** → **진짜 복원되게 구현** (내보내기 ↔ 가져오기 왕복 복원 검증).
  - 초기화(executeResetAll ~3699): 작동함. 유지.
  - 설정엔 "데이터 백업/복원" 한 줄로 조용히 배치.
  - 주의: Claude는 사용자 폰 로컬스토리지에 직접 접근 불가 → 백업의 출발점은 반드시 앱의 내보내기.

---

## 묶음2 — 엔진 수리 (확정, 근거 기반)

### ① 1RM 자동 증감 = "최근 3~4회 중 최고치"(rolling max)
- 현재 버그: update1RM(js/domain.js ~312-328)이 "newRM <= currentRM이면 갱신 거부" → 오를 때만 반영, 고정처럼 보임.
- 결정 방식:
  - 세트별 e1RM = Epley: weight × (1 + reps/30). (옵션: Brzycki 평균) **저횟수(≈1~10, 많아도 12)에서만 신뢰** — 고횟수 세트는 부정확하니 추세 신호에서 비중 낮춤.
  - 세션·종목별: 그날 최고 e1RM만 사용.
  - tracked1RM = **최근 N세션(기본 3~4회, 또는 ~2~3주) 중 최고 e1RM**.
    - 신기록이면 즉시 ↑(snap up). 최근에 못 들면 옛 최고가 윈도우에서 빠지며 자연 ↓. 한 번 삔 날로 폭락 안 함.
  - 대안: EMA(tracked = 0.9×tracked + 0.1×today, 하락 시만). 더 매끄럽지만 감쇠값 튜닝 필요. → 1차는 rolling max 채택.
- 표시: e1RM 추세 차트 + 헤드라인은 tracked1RM. "성장은 한 번이 아니라 몇 주 추세로 본다" 안내.
- 근거: e1RM은 노이즈 큼(RIR 오차 ~1회 → 부하 수%) → 단일 세션 신뢰 금물, asymmetric up-fast/down-slow가 표준(Fitbod). Epley/Brzycki 1~10회 오차 2~5%.
  - 출처: strongerbyscience.com/reps-in-reserve, massresearchreview.com RPE/RIR 가이드, theicss.org 1RM 가이드, UNM RM 예측논문.

### ② 사이클 구조 = "4주 빌드 + 1주 디로드"(5주 주기)
- 현재 버그: 사이클 기능 사실상 없음. currentCycle/currentWeek/cyclePhase(DEFAULT_PROFILE) 읽기만, 갱신 코드 없음. 메뉴 onclick 없음. → 영구 1차 1주차.
- 결정 구조: 1~4주 빌드(주마다 부위별 세트=볼륨 조금씩↑), 5주차 디로드(가볍게 회복), 이후 새 사이클(볼륨 MEV로 리셋, 시작 무게는 지난 블록 e1RM 반영).
  - **디로드는 "권장·건너뛰기 가능"으로 정직하게** 안내(자동 강제 X).
- 근거(중요): 근비대에서 주기화 모델 간 우열 거의 없음(Grgic 2017 메타분석 차이≈0). 진짜 동력 = 충분한 주간 세트 + 꾸준한 점진적 과부하(Schoenfeld 2017 용량반응; ~10~20세트/근육/주). 볼륨 램프·디로드가 "근육 더 키운다"는 직접 증거 약함(Enes 2024 볼륨증가 vs 유지 차이없음; Coleman 2024 디로드 효과 미확인, 단기 근력 약간↓). → 주기화는 피로관리·동기유지용 뼈대로만 사용, 과장 금지.
  - 디로드 실무: 4~6주마다 ~7일, 세트 ~40~50%↓(Bell 2023 Delphi 합의).
  - 출처: peerj.com/articles/3695 (Grgic), pubmed 27433992 (Schoenfeld), pubmed 39665246 (Enes), PMC10809978 (Coleman), rpstrength.com 볼륨 랜드마크.

### ③ 주차 진행 = "완료 기준"(그 주 운동을 다 마치면 다음 주)
- **핵심 재구성:** 좋은 프로그램은 날짜로 주차를 안 넘김 → 운동 완료로 넘김. 사용자가 의아해한 "날짜 지나도 안 넘어감"은 사실 정상 동작(프로그램이 사용자를 기다림). 지금 앱은 "기다림"조차 없는 게 문제.
- 결정 로직:
  - 메소사이클 = N 빌드주(기본 4~5) + 1 디로드주. 주별 계획 세션 수 = profile.workoutFreq 기반.
  - 그 주 계획 세션을 전부(또는 전부-1) 로그하면 → currentWeek += 1, 권장 볼륨/부하 한 단계↑.
  - **날짜는 currentWeek을 절대 자동 증가시키지 않음.** 단, 마지막 로그가 ~10~14일 넘으면 "한동안 쉬었네요, 이번 주 다시 시작/가벼운 복귀?" 알림(감시자 역할).
  - 디로드주 세션 완료 시 → 새 메소사이클(볼륨 MEV 리셋, 시작 무게 e1RM 반영). cycleHistory에 이전 사이클 기록 저장(현재 저장 구조 없음 → 신설).
  - 날짜 계산은 기존 KST 헬퍼(getTodayStr/getDateStr) 사용.
- 근거: 5/3/1("각 운동 4회 완료까지"), RP Hypertrophy(주간 피드백), GZCLP(완료 단계 기반), Helms 자기조절.
  - 출처: mensjournal.com 531-method, dr-muscle.com RP 리뷰, strongerbyscience.com/autoregulation.

---

## 묶음3 — AI 두뇌 (확정, grill 2026-06-14)

### ① 코치 기억 = "기억 노트"(장기 기억, PT화)
- 현재: 코치는 최근 대화 20개만 전송(저장 30개) → 오래된 정보(부상·선호·목표·일정)는 잊음. 프로필 숫자 외 장기 기억 없음.
- 결정: 코치가 중요한 사용자 정보를 짧은 **"기억 노트"**에 저장하고 매 대화에 참고(진짜 PT처럼). 토큰 부담 적음.
- 채우기 = **자동 추출 + 사용자 검토/수정/삭제**. 코치가 대화에서 기억할 항목을 자동 저장(사전 확인 없음), 사용자는 목록 보고 지우거나 직접 추가.
- 위치 = **더보기 'AI 코칭' 섹션에 "기억 노트" 메뉴**.
- 구현 메모: 새 KEYS.COACH_MEMORY(짧은 항목 배열+id). 자동추출 방식(코치 응답 구조화 출력 vs 별도 경량 호출)은 구현 시 결정. getCoachSystemPrompt에 노트 주입.

### ② 주간리뷰·정체기 = "코치 대화 안에서 직접"(도구화)
- 현재: 별도 오버레이(openWeeklyReview/openPlateauDetail), 코치와 분리.
- 결정: 코치에게 물으면 대화 안에서 바로 요약·진단. **별도 화면도 유지**(자세히 볼 때).
- 구현 메모: 최신 주간리뷰·정체기 요약을 코치 컨텍스트에 주입 + 필요 시 최신 분석 생성. 완전 tool-use 호출은 선택.

### ③ 추천 반복 해결 = "최근 기억 + 다양성 지시 + 후보 풀 확대"
- 현재: 일일 캐시(종일 고정) + 최근 추천/운동 기억 없음 + 후보 풀 부위당 2~4개 + 다양성 지시 없음.
- 결정: AI에 최근 추천·운동 종목을 알려주고 "겹치지 않게 다양하게" 지시 + 후보 풀 확대. (오늘의 추천 + 루틴 생성 양쪽.) 선택: "다시 뽑기" 버튼은 기존 refreshAIRecommendation 활용.
- 구현 메모: 최근 추천 N개 저장→프롬프트 주입, 후보 풀 확대, 다양성 문구 추가.

### 기타 (구현 시 같이)
- 코치 프롬프트의 "주기화 5~6주 사이클(적응→구축→강화→디로드)" → 묶음2 확정 **5주(빌드4+디로드1)** 로 정정.

---

## 남은 묶음 (6) — 다음에 캐물을 핵심
- **묶음4 GIF/영상 = 제거로 결정·완료** (2026-06-14): grill 도중 사용자(운동 숙련자)가 "영상 불필요, 통째로 지우고 깔끔히 재구성" 요청 → 운동 세션 화면의 영상칸 삭제 + 슬림 카드(운동명·종류만) 유지. EXERCISE_GIFS·findExerciseGif·관련 CSS/테스트 전면 제거, 캐시 v17. (당초 "커버리지 확대/퍼지매칭/운동명 통일" 안은 폐기.)
- **묶음5 화면정리 = 완료** (2026-06-14, PR #20 main `4045db6`, 캐시 v18): 5탭 전수 매핑(병렬 6화면) → grill 4개 결정. ①홈=요약판(코치·최근PR·바로가기·끼니분배 제거, 단백질 한 줄) ②코치 한마디 3곳 전부 제거(진짜 코치 채팅만 유지) ③기록 차트제목 중복숫자 제거(요약4카드 단일출처)+단백질'기간내 최고'만+체지방 토글 제거 ④영양 코치/중복 단백질막대/빈끼니 죽은버튼 제거. 운동 막대범례·STEP2 가짜로딩·'Sonnet 4.6' 배지(3곳)·완료화면 코치/죽은더보기(→전부표시)·더보기 죽은 사이클메뉴2개 제거. 고아 CSS 제거. 테스트 25/25, Codex approve.
  - **별도 발견(미수정, 범위 밖):** 기본 프로필에 `carbTarget`/`fatTarget` 없어 영양 탄수/지방 막대가 `170 / undefinedg`로 표출(원본부터 존재). 묶음6 또는 별도 처리.
- **묶음6 디자인:** 방향 유지하며 리뉴얼, 글꼴 점검, 시안 보고 진행. **+순수 장식 정리**(홈 헤더 펄스점·코치 온라인점, 프로필 'U'/'린매스' 배지, 'Built with science' 푸터).

## 참고 — 핵심 코드 위치 (post-split)
- js/screens.js: renderMore(~3463-3778), renderHome(6-284), renderWorkout(286~), renderFuel(2528~), renderStats(4431~), 코치(openCoachChat ~3851, sendCoachMessage ~3913), 주간리뷰/정체기 오버레이(~4104, ~4260), completeSet(~1815)/finalizeSession(~1522).
- js/domain.js: calculate1RM/get1RM/update1RM(~201-328), findExerciseGif(~158-194), getRecentVolumeByPart/getVolumeDiagnosis(~569-651).
- js/ai.js: buildUserContext(~273-596), getCoachSystemPrompt(~599-662), callCoachAPI(~665-708), fetchAIRecommendation(~714-826), generateFullRoutine(~832-1041), generateWeeklyReview(~1136), analyzePlateauWithAI(~1442).
- js/data.js: DEFAULT_PROFILE(6-16), EXERCISE_GIFS(~166-186), EXERCISE_ALIASES_1RM(~256-272), SESSIONS(~275-329), EXERCISE_BODY_PART_MAP(~339-447), WEAK_PART_EXERCISE_MAP(~484-501).
- js/core.js: KEYS(6-27), state(156-212), getTodayStr/getDateStr(~115-126), getWeekId(~256-266), init(~318-396).
- 배포: service-worker.js CACHE_VERSION(현재 health-app-v16) — 파일 바꾸면 올리기. 새 정적파일은 CORE_ASSETS에 추가.
