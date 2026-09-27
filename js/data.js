// js/data.js — 정적 데이터 테이블 (운동·세션·부위 맵, 아이콘)
'use strict';
// ═══════════════════════════════════════════════
// 기본 프로필
// ═══════════════════════════════════════════════
var DEFAULT_PROFILE = {
  age: 37,
  height: 170,
  weight: 77.5,
  workoutFreq: 4,
  currentCycle: 1,
  currentWeek: 1,
  cyclePhase: '빌드',
  weekSessionsDone: 0
};

// ═══════════════════════════════════════════════
// 아이콘 (SVG)
// ═══════════════════════════════════════════════
var ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9a2 2 0 1 1 0 6"/><path d="M21 9a2 2 0 1 0 0 6"/><rect x="6" y="6" width="2" height="12" rx="1"/><rect x="16" y="6" width="2" height="12" rx="1"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0V4z"/><path d="M5 12a7 7 0 1 1 14 0v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 3v9h9"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9"/><polyline points="7 14 12 9 17 14"/><line x1="12" y1="9" x2="12" y2="21"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  units: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  // 유산소(러닝) — RUNNING 탭·유산소 화면용 (개편 2단계). screens.js가 icon('running')/icon('treadmill')로 사용.
  running: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="1"/><path d="M4 17l5 1 .75-1.5"/><path d="M15 21v-4l-4-3 1-6"/><path d="M7 12V9l5-1 3 3 3 1"/></svg>',
  treadmill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h11l4-9"/><path d="M14.5 5H21"/><path d="M4 14v4h10v-4"/></svg>'
};

// 세션별 데이터
// ═══════════════════════════════════════════════
// 초기 1RM 데이터 (사용자가 기존 앱에서 가져온 값)
// 첫 실행 시 자동 입력, 이후 운동하면서 자동 갱신
// ═══════════════════════════════════════════════
var INITIAL_1RM = {
  // 하체
  '레그 프레스': 216,
  '핵 스쿼트': 110,
  '리버스 브이 스쿼트': 156,
  '머신 레그 익스텐션': 84.5,
  '바벨 루마니안 데드리프트': 76,
  '머신 라잉 레그 컬': 60,
  '머신 힙 쓰러스트': 53.33,
  '머신 힙 어브덕션': 94.5,
  '덤벨 불가리안 스플릿 스쿼트': 35.47,
  '덤벨 싱글 레그 데드리프트': 21,
  
  // 상체 푸시 (가슴)
  '머신 체스트 프레스': 93.33,
  '스미스 인클라인 벤치 프레스': 71.5,
  '머신 펙 덱 플라이': 66.67,
  '덤벨 인클라인 벤치 프레스': 28.8,
  '케이블 플라이': 40,
  
  // 상체 푸시 (어깨)
  '머신 시티드 숄더 프레스': 70,
  '덤벨 숄더 프레스': 20.8,
  '덤벨 아놀드 프레스': 22.4,
  '덤벨 사이드 레터럴 레이즈': 15.2,
  '케이블 원 암 레터럴 레이즈': 14,
  
  // 상체 푸시 (삼두)
  '케이블 푸시 다운': 68.33,
  '케이블 오버헤드 트라이셉스 익스텐션': 50.67,
  '케이블 트라이셉스 킥백': 31.67,
  // '어시스트 딥스' 제거 — 보조 무게로 계산한 e1RM은 "클수록 약하다"는 뜻이라 1RM으로 쓸 수 없다.
  // 어시스트 종목은 진행 지표가 **보조 무게 감소**다 (REVERSE_PROGRESSION_EXERCISES 참고).
  // 기존 사용자 저장소에 남아 있는 값은 pruneReverseProgression1RM()이 정리한다.

  // 상체 풀 (등)
  '머신 시티드 로우': 102,
  '케이블 시티드 로우': 84.58,
  '클로즈 그립 랫 풀 다운': 78,
  'T 바 로우': 53.33,
  '리버스 그립 랫 풀 다운': 70,
  '랫 풀 다운': 67.83,
  '케이블 암 풀 다운': 46.67,
  '덤벨 인클라인 로우': 29.33,
  '리버스 펙 덱 플라이': 61.67,
  '원암 리버스 펙 덱 플라이': 53.33,
  '페이스 풀': 30,
  '케이블 슈러그': 133.33,
  '켈소 슈러그': 28.67,
  
  // 상체 풀 (이두)
  '바벨 컬': 32.5,
  '덤벨 해머 컬': 19.13,
  '덤벨 프리처 컬': 15.2,
  '이지 바 프리처 컬': 24.67,
  '인클라인 덤벨 컬': 14.4,
  '덤벨 얼터네이트 컬': 10.67,
  
  // 코어
  '머신 시티드 크런치': 60,
  '케이블 닐링 사이드 크런치': 78,
  '인클라인 덤벨 와이 레이즈': 10.93
};

// 종목명 별칭 매핑 (앱 SESSIONS와 가져온 1RM 매칭)
var EXERCISE_ALIASES_1RM = {
  '체스트 프레스 머신': '머신 체스트 프레스',
  '인클라인 덤벨 프레스': '덤벨 인클라인 벤치 프레스',
  '인클라인 덤벨 벤치 프레스': '덤벨 인클라인 벤치 프레스',  // 옛 표준명 매핑
  '펙덱 플라이': '머신 펙 덱 플라이',
  '숄더 프레스 머신': '머신 시티드 숄더 프레스',
  '사이드 레터럴 레이즈': '덤벨 사이드 레터럴 레이즈',
  '트라이셉스 푸시다운': '케이블 푸시 다운',
  '스컬크러셔': '라잉 트라이셉스 익스텐션',
  '랫풀다운': '랫 풀 다운',
  '시티드 로우 머신': '머신 시티드 로우',
  '해머 컬': '덤벨 해머 컬',
  '레그프레스': '레그 프레스',
  '레그 익스텐션': '머신 레그 익스텐션'
  // 제거: '인클라인 덤벨 컬' → '인클라인 덤벨 컬' (자기 자신 무의미)
  // 제거: '시티드 햄스트링 컬' → '머신 라잉 레그 컬' (다른 운동 - 시티드/라잉 자세 다름)
  // 제거: '힙 어덕션' → '머신 힙 어브덕션' (어덕션=내전근 vs 어브덕션=둔근, 정반대 운동)
};

// 세션별 데이터
var SESSIONS = {
  push: {
    name: 'PUSH',
    description: '가슴 · 어깨 · 삼두',
    duration: 50,
    exerciseCount: 6,
    setCount: 18,
    exercises: [
      // 종목명은 EXERCISE_ALIASES_1RM 기준 **표준명**으로 쓴다 — 별칭 표기로 저장되면
      // 진행도·통증·자극 조회가 표준명 기록과 갈린다(정규화 이후에도 표기 통일이 원칙).
      { name: '머신 체스트 프레스', type: '머신', sets: 3, reps: '8-10', lastWeight: 60 },
      { name: '덤벨 인클라인 벤치 프레스', type: '덤벨', sets: 3, reps: '10-12', lastWeight: 20 },
      { name: '머신 시티드 숄더 프레스', type: '머신', sets: 3, reps: '8-10', lastWeight: 40 },
      { name: '덤벨 사이드 레터럴 레이즈', type: '덤벨', sets: 3, reps: '12-25', lastWeight: 8 },
      { name: '머신 펙 덱 플라이', type: '머신', sets: 3, reps: '10-15', lastWeight: 35 },
      { name: '케이블 푸시 다운', type: '케이블', sets: 3, reps: '10-15', lastWeight: 25 }
    ]
  },
  pull: {
    name: 'PULL',
    description: '등 · 이두',
    duration: 50,
    exerciseCount: 6,
    setCount: 18,
    exercises: [
      { name: '풀업', type: '체중', sets: 3, reps: '본인 최대', lastWeight: null, reps_done: 7 },
      { name: '랫 풀 다운', type: '머신', sets: 3, reps: '8-12', lastWeight: 50 },
      { name: '머신 시티드 로우', type: '머신', sets: 3, reps: '8-12', lastWeight: 55 },
      { name: '페이스 풀', type: '케이블', sets: 3, reps: '15-20', lastWeight: 20 },
      { name: '인클라인 덤벨 컬', type: '덤벨', sets: 3, reps: '10-12', lastWeight: 10 },
      { name: '덤벨 해머 컬', type: '덤벨', sets: 3, reps: '10-15', lastWeight: 12 }
    ]
  },
  legs: {
    name: 'LEGS',
    description: '하체 · 둔근',
    duration: 45,
    exerciseCount: 6,
    setCount: 18,
    exercises: [
      { name: '레그 프레스', type: '머신', sets: 3, reps: '8-10', lastWeight: 120 },
      { name: '머신 레그 익스텐션', type: '머신', sets: 3, reps: '10-15', lastWeight: 45 },
      // 종목명은 EXERCISE_BODY_PART_MAP의 정확 키를 쓴다 — 퍼지 매칭에 의존하면 부위·장비 판정이 어긋난다.
      // ('시티드 햄스트링 컬'·'카프 레이즈 머신'은 맵에 없는 이름이었고, 후자는 이 헬스장에 없는 전용 카프 머신을 가리켰다)
      { name: '시티드 레그 컬', type: '머신', sets: 3, reps: '10-12', lastWeight: 35 },
      { name: '힙 어덕션', type: '머신', sets: 3, reps: '15', lastWeight: 40 },
      { name: '핵 스쿼트', type: '머신', sets: 3, reps: '8-10', lastWeight: 60 },
      { name: '레그 프레스 카프 레이즈', type: '머신', sets: 3, reps: '15-20', lastWeight: 80 }
    ]
  },
  upper: {
    name: 'UPPER',
    description: '상체 전체 · 가슴·등·어깨·팔',
    duration: 55,
    exerciseCount: 6,
    setCount: 18,
    // 7종목 21세트 → 6종목 18세트로 축소.
    // 이유: 새 휴식 권장값(중강도복합 150초·고립 120초·경량고립 90초)을 적용하면 7종목은
    // 실측 기준 약 66분이 걸려 60분 예산을 넘긴다(docs/research/training-splits.md §2-C 조합 E·F).
    // 뺀 종목 = '머신 시티드 숄더 프레스'. 프레스 계열 중복도가 가장 높고(체스트 프레스와 겹침),
    // 같은 문서 §4-A의 부위별 주간 목표표에 **전면삼각 항목 자체가 없다**(측면 6·후면 5세트만 목표).
    // 측면삼각은 아래 사이드 레터럴로 직접 커버된다.
    exercises: [
      { name: '머신 체스트 프레스', type: '머신', sets: 3, reps: '8-10', lastWeight: 60 },
      { name: '랫 풀 다운', type: '머신', sets: 3, reps: '8-12', lastWeight: 50 },
      { name: '머신 시티드 로우', type: '머신', sets: 3, reps: '8-12', lastWeight: 55 },
      { name: '덤벨 사이드 레터럴 레이즈', type: '덤벨', sets: 3, reps: '12-25', lastWeight: 8 },
      { name: '인클라인 덤벨 컬', type: '덤벨', sets: 3, reps: '10-12', lastWeight: 10 },
      { name: '케이블 푸시 다운', type: '케이블', sets: 3, reps: '10-15', lastWeight: 25 }
    ]
  },
  free: {
    name: 'FREE',
    description: '자유 운동',
    duration: 40,
    exerciseCount: 4,
    setCount: 12,
    exercises: []
  }
};

// ═══════════════════════════════════════════════
// 코치 시스템 (Claude Sonnet 4.6)
// ═══════════════════════════════════════════════

// 사용자 데이터 컨텍스트 생성 (코치가 알아야 할 모든 정보)
// ═══════════════════════════════════════════════
// 보유 장비 (사용자 헬스장) — 종목 추천 필터의 단일 원천
// ═══════════════════════════════════════════════
// 모든 종목은 EXERCISE_BODY_PART_MAP의 equipment 필드로 여기 id 하나를 가리킨다.
// owned:false 인 장비를 쓰는 종목은 "이 헬스장에서 불가" → AI 종목 풀·추천에서 제외된다.
// 헬스장을 옮기거나 장비가 늘면 **이 표만** 고치면 된다(종목 표는 그대로).
//
// source: 'stated'   = 사용자가 직접 확인해 준 보유 목록
//         'inferred' = 사용자 목록엔 없지만 기존 1RM 기록(INITIAL_1RM)으로 보유가 증명된 장비
//         'universal'= 장비가 필요 없음(맨몸)
//         'none'     = 보유하지 않음
var GYM_EQUIPMENT = {
  // ── 장비 불필요 ──
  bodyweight:                 { kr: '맨몸',                          owned: true,  source: 'universal' },

  // ── 프리웨이트 (벤치·랙·EZ바 포함) ──
  barbell:                    { kr: '바벨',                          owned: true,  source: 'stated' },
  dumbbell:                   { kr: '덤벨',                          owned: true,  source: 'stated' },
  cable:                      { kr: '케이블',                        owned: true,  source: 'stated' },
  smith:                      { kr: '스미스 머신',                    owned: true,  source: 'stated' },

  // ── 사용자 확인 머신 ──
  assist_machine:             { kr: '어시스트 기구(풀업·딥스)',        owned: true,  source: 'stated' },
  chest_press_machine:        { kr: '체스트 프레스 머신',              owned: true,  source: 'stated' },
  hammer_chest_press:         { kr: '해머 체스트 프레스 머신',          owned: true,  source: 'stated' },
  hammer_incline_chest_press: { kr: '해머 인클라인 체스트 프레스 머신',  owned: true,  source: 'stated' },
  incline_barbell_press:      { kr: '인클라인 바벨 프레스 기구',        owned: true,  source: 'stated' },
  shoulder_press_machine:     { kr: '숄더 프레스 머신',                owned: true,  source: 'stated' },
  lat_pulldown:               { kr: '랫풀다운 머신',                  owned: true,  source: 'stated' },
  plate_lat_pulldown:         { kr: '플레이트 랫풀다운 머신',           owned: true,  source: 'stated' },
  wide_pulldown_rear:         { kr: '와이드 풀다운 리어 머신',          owned: true,  source: 'stated' },
  seated_row_machine:         { kr: '시티드 로우 머신',                owned: true,  source: 'stated' },
  cable_row_machine:          { kr: '케이블 로우 머신',                owned: true,  source: 'stated' },
  hammer_row:                 { kr: '해머 로우 머신',                  owned: true,  source: 'stated' },
  t_bar_row:                  { kr: 'T바 로우 머신(체스트 고정 없음)',   owned: true,  source: 'stated' },
  hack_squat:                 { kr: '핵스쿼트 머신',                  owned: true,  source: 'stated' },
  leg_press:                  { kr: '레그프레스 머신',                 owned: true,  source: 'stated' },
  v_squat:                    { kr: '브이스쿼트 머신',                 owned: true,  source: 'stated' },
  leg_extension:              { kr: '레그익스텐션 머신',               owned: true,  source: 'stated' },
  leg_curl:                   { kr: '레그컬 머신(라잉·시티드)',         owned: true,  source: 'stated' },
  hip_thrust_machine:         { kr: '힙쓰러스트 머신',                 owned: true,  source: 'stated' },
  adduction_machine:          { kr: '이너타이(힙 어덕션) 머신',         owned: true,  source: 'stated' },

  // ── 사용자 목록엔 없지만 기존 1RM 기록으로 보유가 확인된 장비 ──
  // (임의로 지우면 사용자의 실제 기록·PR이 있는 종목이 추천에서 사라진다)
  pec_deck:                   { kr: '펙 덱 머신',                     owned: true,  source: 'inferred' },
  rear_pec_deck:              { kr: '리버스 펙 덱 머신',               owned: true,  source: 'inferred' },
  ab_crunch_machine:          { kr: '복근 크런치 머신',                owned: true,  source: 'inferred' },
  abduction_machine:          { kr: '힙 어브덕션 머신',                owned: true,  source: 'inferred' },
  preacher_bench:             { kr: '프리처 컬 벤치',                  owned: true,  source: 'inferred' },
  band:                       { kr: '탄력 밴드',                      owned: true,  source: 'inferred' },

  // ── 미보유 (이 장비를 쓰는 종목은 추천되지 않는다) ──
  calf_machine:               { kr: '전용 카프 레이즈 머신',            owned: false, source: 'none' }
};

// ═══════════════════════════════════════════════
// 종목 → 부위 매핑 (균형 분석용)
// ═══════════════════════════════════════════════
// equipment: GYM_EQUIPMENT의 id. 종목 하나당 "가장 대표적인 장비" 1개만 적는다(단순함 우선).
var EXERCISE_BODY_PART_MAP = {
  // 가슴 (chest)
  '머신 체스트 프레스': { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: false, angle: 'flat', equipment: 'chest_press_machine' },
  '체스트 프레스 머신': { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: false, angle: 'flat', equipment: 'chest_press_machine' },
  '스미스 인클라인 벤치 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'incline', equipment: 'smith' },
  '덤벨 인클라인 벤치 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'incline', equipment: 'dumbbell' },  // 표준명 (1RM 데이터 키)
  '인클라인 덤벨 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'incline', equipment: 'dumbbell' },  // SESSIONS PUSH 템플릿 표시명 — 없으면 부위 판정이 null이 된다
  '덤벨 벤치 프레스': { primary: 'chest', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'flat', equipment: 'dumbbell' },
  '머신 펙 덱 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true, equipment: 'pec_deck' },
  '펙덱 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true, equipment: 'pec_deck' },
  '케이블 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true, equipment: 'cable' },
  '케이블 크로스오버': { primary: 'chest_lower', secondary: [], compound: false, mainEligible: false, angle: 'decline', stretched: true, equipment: 'cable' },
  '덤벨 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true, equipment: 'dumbbell' },
  '해머 체스트 프레스': { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: false, angle: 'flat', equipment: 'hammer_chest_press' },
  '해머 인클라인 체스트 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: false, angle: 'incline', equipment: 'hammer_incline_chest_press' },
  '바벨 인클라인 벤치 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'incline', equipment: 'incline_barbell_press' },
  '스미스 머신 벤치 프레스': { primary: 'chest', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'flat', equipment: 'smith' },
  '바벨 벤치 프레스': { primary: 'chest', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'flat', equipment: 'barbell' },
  '덤벨 인클라인 플라이': { primary: 'chest_upper', secondary: [], compound: false, mainEligible: false, angle: 'incline', stretched: true, equipment: 'dumbbell' },
  
  // 어깨 (shoulders)
  // 프레스류 보조부위에서 '어깨 측면(shoulders_side)' 제외: 오버헤드 프레스는 전면(front) 주동 + 삼두 보조이며,
  // 측면 델트 근비대 자극은 미미하다(측면은 사이드 레터럴 레이즈 같은 직접 고립이 필요). 근거: RP/Helms/Schoenfeld.
  '머신 시티드 숄더 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: false, equipment: 'shoulder_press_machine' },
  '숄더 프레스 머신': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: false, equipment: 'shoulder_press_machine' },
  '덤벨 숄더 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: true, equipment: 'dumbbell' },
  '덤벨 아놀드 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: true, equipment: 'dumbbell' },
  '덤벨 사이드 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '사이드 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '케이블 원 암 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, mainEligible: false, equipment: 'cable', unilateral: true },
  '리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false, mainEligible: false, equipment: 'rear_pec_deck' },
  '원암 리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: [], compound: false, mainEligible: false, equipment: 'rear_pec_deck', unilateral: true },
  '페이스 풀': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false, mainEligible: false, equipment: 'cable' },
  '스미스 머신 오버헤드 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: true, equipment: 'smith' },
  '바벨 오버헤드 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: true, equipment: 'barbell' },
  
  // 삼두 (triceps)
  '케이블 푸시 다운': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
  '트라이셉스 푸시다운': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
  '케이블 오버헤드 트라이셉스 익스텐션': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'cable' },
  '케이블 트라이셉스 킥백': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
  // 프리웨이트 삼두 고립. 이 둘이 들어오기 전까지 삼두 고립은 전부 케이블이라, 케이블이 붐비면 대체가 없었다.
  // stretched: 팔을 머리 쪽으로 넘길수록 장두가 늘어난 위치에서 부하를 받는다. 신장 강조의 정도는
  // 오버헤드 > 라잉 > 푸시다운 순이다 (Maeo 2022: 오버헤드 12주 장두 +28.5% vs 푸시다운 +19.6%).
  '라잉 트라이셉스 익스텐션': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'barbell' },
  '스컬크러셔': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'barbell' },
  '덤벨 오버헤드 트라이셉스 익스텐션': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'dumbbell' },
  '어시스트 딥스': { primary: 'chest_lower', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: true, equipment: 'assist_machine' },  // 상체 전방 기울임 = 가슴 강조 (사용자 기본). 직립 + 좁은 그립이면 삼두 강조.
  '딥스': { primary: 'chest_lower', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: true, equipment: 'assist_machine' },
  '클로즈 그립 벤치 프레스': { primary: 'triceps', secondary: ['chest', 'shoulders_front'], compound: true, mainEligible: false, equipment: 'barbell' },
  '스미스 머신 클로즈 그립 벤치 프레스': { primary: 'triceps', secondary: ['chest', 'shoulders_front'], compound: true, mainEligible: false, equipment: 'smith' },
  
  // 등/광배 (back/lats)
  '풀업': { primary: 'lats', secondary: ['biceps', 'upper_back'], compound: true, mainEligible: true, equipment: 'assist_machine' },
  '친업': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: true, equipment: 'assist_machine' },
  '랫풀다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, equipment: 'lat_pulldown' },
  '랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, equipment: 'lat_pulldown' },
  '클로즈 그립 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, equipment: 'lat_pulldown' },
  '리버스 그립 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, equipment: 'lat_pulldown' },
  '머신 시티드 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false, equipment: 'seated_row_machine' },
  '시티드 로우 머신': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false, equipment: 'seated_row_machine' },
  '케이블 시티드 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false, equipment: 'cable_row_machine' },
  'T 바 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false, equipment: 't_bar_row' },
  '덤벨 인클라인 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: true, equipment: 'dumbbell' },
  '덤벨 로우': { primary: 'lats', secondary: ['upper_back', 'biceps'], compound: true, mainEligible: true, equipment: 'dumbbell' },
  '바벨 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: true, equipment: 'barbell' },
  '케이블 암 풀 다운': { primary: 'lats', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'cable' },
  '풀오버': { primary: 'lats', secondary: ['chest'], compound: false, mainEligible: false, stretched: true, equipment: 'dumbbell' },
  '케이블 슈러그': { primary: 'traps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
  '켈소 슈러그': { primary: 'upper_back', secondary: ['traps'], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '덤벨 슈러그': { primary: 'traps', secondary: [], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '어시스트 풀업': { primary: 'lats', secondary: ['biceps', 'upper_back'], compound: true, mainEligible: true, equipment: 'assist_machine' },
  '플레이트 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, equipment: 'plate_lat_pulldown' },
  '와이드 그립 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, equipment: 'wide_pulldown_rear' },
  '원 암 케이블 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, stretched: true, equipment: 'cable', unilateral: true },
  '해머 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false, equipment: 'hammer_row' },
  '스미스 머신 슈러그': { primary: 'traps', secondary: [], compound: false, mainEligible: false, equipment: 'smith' },
  '바벨 슈러그': { primary: 'traps', secondary: [], compound: false, mainEligible: false, equipment: 'barbell' },
  
  // 이두 (biceps)
  '바벨 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false, equipment: 'barbell' },
  '덤벨 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '덤벨 해머 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '해머 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '덤벨 프리처 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false, equipment: 'preacher_bench' },
  '이지 바 프리처 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false, equipment: 'preacher_bench' },
  '인클라인 덤벨 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'dumbbell' },
  '덤벨 얼터네이트 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '컨센트레이션 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false, equipment: 'dumbbell' },
  '케이블 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
  '이지 바 리버스 컬': { primary: 'forearms', secondary: ['biceps'], compound: false, mainEligible: false, equipment: 'barbell' },
  
  // 하체 - 대퇴사두
  '레그 프레스': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'leg_press' },
  '핵 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true, mainEligible: true, equipment: 'hack_squat' },
  '리버스 브이 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true, mainEligible: false, equipment: 'v_squat' },
  '스미스 머신 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'smith' },
  '바벨 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'barbell' },
  '프론트 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true, mainEligible: true, equipment: 'barbell' },
  '머신 레그 익스텐션': { primary: 'quads', secondary: [], compound: false, mainEligible: false, equipment: 'leg_extension' },
  '레그 익스텐션': { primary: 'quads', secondary: [], compound: false, mainEligible: false, equipment: 'leg_extension' },
  '시시 스쿼트': { primary: 'quads', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'bodyweight' },
  '브이 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true, mainEligible: false, equipment: 'v_squat' },
  
  // 하체 - 햄스트링/둔근
  '바벨 루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, mainEligible: true, stretched: true, equipment: 'barbell' },
  '덤벨 루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, mainEligible: true, stretched: true, equipment: 'dumbbell' },
  '루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, mainEligible: true, stretched: true, equipment: 'barbell' },
  '데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back', 'upper_back'], compound: true, mainEligible: true, equipment: 'barbell' },
  '머신 라잉 레그 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false, equipment: 'leg_curl' },
  '라잉 레그 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false, equipment: 'leg_curl' },
  '시티드 레그 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'leg_curl' },
  '햄스트링 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false, equipment: 'leg_curl' },
  '머신 힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: false, equipment: 'hip_thrust_machine' },
  '바벨 힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: true, equipment: 'barbell' },
  '힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: false, equipment: 'hip_thrust_machine' },
  '머신 힙 어브덕션': { primary: 'glutes_med', secondary: [], compound: false, mainEligible: false, equipment: 'abduction_machine' },
  '힙 어덕션': { primary: 'adductors', secondary: [], compound: false, mainEligible: false, equipment: 'adduction_machine' },
  '힙 어브덕션': { primary: 'glutes_med', secondary: [], compound: false, mainEligible: false, equipment: 'abduction_machine' },
  '덤벨 불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'dumbbell', unilateral: true },
  '불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'bodyweight', unilateral: true },
  '덤벨 싱글 레그 데드리프트': { primary: 'hamstrings', secondary: ['glutes'], compound: true, mainEligible: true, stretched: true, equipment: 'dumbbell', unilateral: true },
  '런지': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'bodyweight', unilateral: true },
  '와이드 스탠스 레그 프레스': { primary: 'adductors', secondary: ['glutes', 'quads'], compound: true, mainEligible: false, stretched: true, equipment: 'leg_press' },
  '케이블 풀 스루': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: false, stretched: true, equipment: 'cable' },
  
  // 종아리
  '카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'bodyweight' },
  '시티드 카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, equipment: 'calf_machine' },
  '카프 레이즈 머신': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'calf_machine' },  // 옛 LEGS 템플릿 이름 (저장된 세션에 남아 있음) — 전용 카프 머신은 이 헬스장에 없다
  '스탠딩 카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'smith' },
  '레그 프레스 카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'leg_press' },
  '덤벨 시티드 카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'dumbbell' },
  
  // 코어
  '머신 시티드 크런치': { primary: 'abs', secondary: [], compound: false, mainEligible: false, equipment: 'ab_crunch_machine' },
  '크런치': { primary: 'abs', secondary: [], compound: false, mainEligible: false, equipment: 'bodyweight' },
  '케이블 닐링 사이드 크런치': { primary: 'obliques', secondary: ['abs'], compound: false, mainEligible: false, equipment: 'cable' },
  '러시안 트위스트': { primary: 'obliques', secondary: ['abs'], compound: false, mainEligible: false, equipment: 'bodyweight' },
  '플랭크': { primary: 'abs', secondary: ['obliques'], compound: false, mainEligible: false, equipment: 'bodyweight' },
  '케이블 크런치': { primary: 'abs', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'cable' },
  '케이블 팔로프 프레스': { primary: 'obliques', secondary: ['abs'], compound: false, mainEligible: false, equipment: 'cable' },
  '행잉 니 레이즈': { primary: 'abs', secondary: ['obliques'], compound: false, mainEligible: false, equipment: 'assist_machine' },
  '인클라인 덤벨 와이 레이즈': { primary: 'shoulders_rear', secondary: ['traps'], compound: false, mainEligible: false, equipment: 'dumbbell' },

  // 재활 (부상 부위 강화 목적 — 무게 진행 없음, 진행 지표 = 통증 감소)
  '밴드 외회전': { primary: 'shoulders_rear', secondary: [], compound: false, mainEligible: false, equipment: 'band' },
  '클램쉘': { primary: 'glutes_med', secondary: [], compound: false, mainEligible: false, equipment: 'bodyweight' },
  '터미널 니 익스텐션': { primary: 'quads', secondary: [], compound: false, mainEligible: false, equipment: 'bodyweight' }
};

// 종목명 → 표준명 (별칭 표기 흡수). 기록 조회(진행도·통증·자극·채팅 신호)는 전부 이걸 거쳐야
// '랫풀다운'과 '랫 풀 다운'의 히스토리가 갈리지 않는다. 1RM 계열(get1RM·update1RM·
// calculateRollingMax1RM)은 예전부터 같은 규칙을 쓰고 있었고, 나머지가 누락돼 있었다.
// data.js에 두는 이유: 바로 아래 EXERCISES_BY_PRIMARY IIFE가 로드 시점에 이미 이걸 쓴다.
function canonicalExerciseName(name) {
  return EXERCISE_ALIASES_1RM[name] || name;
}

// '표준명이 따로 있고 그 표준명도 종목표에 등록된' 별칭 표기인가.
// 종목 풀·교체 후보에서 중복 노출을 막는 데만 쓴다 — 표 항목 자체는 옛 기록의
// 부위·장비 판정용으로 그대로 남겨야 한다(지우면 과거 로그가 볼륨에서 사라진다).
function isAliasExerciseName(name) {
  var canon = EXERCISE_ALIASES_1RM[name];
  return !!(canon && canon !== name && EXERCISE_BODY_PART_MAP[canon]);
}

// primary 부위별 종목 이름 인덱스 (종목 변경 시트 등에서 O(1) 조회)
// 별칭 표기는 제외 — 같은 운동이 두 이름으로 교체 후보·대체 종목에 뜨는 것을 막는다.
var EXERCISES_BY_PRIMARY = (function() {
  var idx = {};
  Object.keys(EXERCISE_BODY_PART_MAP).forEach(function(name) {
    var info = EXERCISE_BODY_PART_MAP[name];
    if (!info || !info.primary) return;
    if (isAliasExerciseName(name)) return;
    if (!idx[info.primary]) idx[info.primary] = [];
    idx[info.primary].push(name);
  });
  return idx;
})();

// ═══════════════════════════════════════════════
// 종목 클래스 — 점진적 과부하 진행 규칙 결정 (md 개편 Phase 5)
// 근거: 근비대는 넓은 반복범위에서 가능하나(Schoenfeld 2017 메타), 실무 처방은
// 대형 프리웨이트=저반복 고중량, 고립=중고반복, 소근육(측면삼각근·종아리 등)=고반복이
// 관절 부담·자극 효율에서 유리(RP/Helms). 재활 종목은 부하 진행 금지, 지표=통증 감소.
// scheme  = 기본 세트법 (docs/research/set-schemes.md §2-A). 사용자가 종목별로 바꿀 수 있다(KEYS.SET_SCHEMES).
// restSec = 세트 간 기본 휴식 (같은 문서 §3-B). 훈련자에서 3분 > 1분(Schoenfeld 2016 JSCR),
//           고립 ≥1.5분(Helms), 재활은 비피로 목적이라 길게 쉴 이유가 없다.
var EXERCISE_CLASS_RULES = {
// 반복 범위(2026-09-02, 선별안 A5): 프롬프트가 지시하던 메인 6~10·고립 10~15·경량 고립 12~25를 코드 클램프가
// 5-8·12-15·15-25로 잘라 무효화하고 있었다 → 코드와 프롬프트를 같은 값으로 통일. 근비대에는 5~30회 동등(ACSM 2026).
  compound_heavy:    { repMin: 6,  repMax: 10, doubleSessions: 2, kr: '고중량 복합', scheme: 'top_backoff', restSec: 180 },
  compound_moderate: { repMin: 8,  repMax: 12, doubleSessions: 1, kr: '중강도 복합', scheme: 'straight',    restSec: 150 },
  isolation:         { repMin: 10, repMax: 15, doubleSessions: 1, kr: '고립',        scheme: 'straight',    restSec: 120 },
  light_isolation:   { repMin: 12, repMax: 25, doubleSessions: 2, kr: '경량 고립',   scheme: 'straight',    restSec: 90  },
  rehab:             { repMin: 15, repMax: 20, doubleSessions: 0, kr: '재활',        scheme: 'straight',    restSec: 60, lockScheme: true }
};

// 신규 종목 첫 시도 무게 = 1RM × 이 비율 (선별안 B1, docs/research/v2-intensity-progression.md §4-1).
// 옛 값 0.7 일괄은 실패까지 가면 평균 ~15회 나오는 무게라(Nuzzo 2024 메타회귀, 269편) 6~10회 처방엔 한 클래스만큼
// 가벼웠다. 값은 "목표 반복 중간값을 RIR 2로 끝내는 무게"에서 2~4%p 낮춘 보수적 채택값. 재활은 부하 진행이 없어 유지.
var FIRST_ATTEMPT_PCT = {
  compound_heavy: 0.78, compound_moderate: 0.72, isolation: 0.66, light_isolation: 0.60, rehab: 0.70
};
// 한 칸 증량이 현재 무게의 이 비율을 넘으면 무게 대신 반복으로 진행 (선별안 B2, ACSM 권고 증량 폭 2~10%).
// 절대값 격자(그 외 5kg)는 20kg 케이블에서 +25%가 돼 다음 세션 반복이 무너진다.
var WEIGHT_JUMP_MAX_PCT = 0.10;

// ─── 세트법(세트 스킴) ────────────────────────────────────────
// 근거 요약(docs/research/set-schemes.md §0·§1-G): 볼륨을 맞추면 세트법 간 근비대 차이는 없다
// (Angleri 2017 CSA +7.6/+7.5/+7.8%, Sødal 2023 메타 SMD 0.155 p=0.392).
// 그래서 "더 좋은 세트법"이 아니라 "문제에 맞는 세트법"을 배정한다:
//  · top_backoff = 고중량에서 뒤 세트 반복 붕괴로 잃는 볼륨 로드를 감량으로 보존 (근거 낮음 — 실무 합의)
//  · drop        = 근비대는 동등하고 이득은 오직 시간(1/2~1/3). 그래서 조건부 "제안"으로만 쓴다.
// v2 재조사(set-schemes-v2.md §0-B)도 같은 결론이다 — 메타 3편이 전부 "차이 0"이라, 늘어난 스킴
// (피라미드·역피라미드)도 **기본 배정은 하지 않고 선택지로만** 연다.

// 백오프·드롭 감량 비율, 자가조절 규칙 상수 (§2-B 규칙②④ / §3-B / §3-C)
// v2 재조사(docs/research/set-schemes-v2.md)에서 추가·검증된 값은 주석에 근거를 남긴다.
var BACKOFF_PCT = 0.90;         // 탑세트의 90% — 실무 권장 −5~15%의 중앙값이자 5kg 격자에 깔끔히 떨어짐
                                //   v2 §1-B 계산으로 재검증: 8RM 기준 백오프가 RIR 2~3에 착지하는 유일한 구간
var BACKOFF_DELOAD_PCT = 0.85;  // v2 §2-E③ — 탑세트가 목표 반복 미달이면 백오프를 한 스텝 더 (Khairallah 2009)
var BACKOFF_PCT_LIGHT = 0.85;        // 덤벨·한쪽씩·케이블·고립 백오프 −15% (사용자 스펙, 관례 등급)
var BACKOFF_DELOAD_PCT_LIGHT = 0.80; // 위 종목의 탑 미달 자동 디로드
var WARMUP_MAX_PCT = 0.88;           // 워밍업 마지막 단은 탑의 88% 미만
var WARMUP_RAMP = { full: [[0.50, 8], [0.70, 4], [0.85, 2]], short: [[0.50, 8], [0.75, 3]] }; // [배율, 반복]
var UNILATERAL_REP_RANGE = { low: 8, high: 12 };  // 한쪽씩 복합 종목
var REGRESS_SESSIONS = 2;            // 하한 미달이 이만큼 연속이면 한 단계 감량
var PYRAMID_PCTS = [0.85, 0.925, 1.00];  // v2 §1-D 어센딩 (Angleri 2017 CP 프로토콜의 3세트 축약)
var RPT_PCTS = [1.00, 0.90, 0.80];       // v2 §1-E 역피라미드 (IJSC 2024 디센딩)
var DROP_PCT = 0.75;            // 드롭마다 −25% — Angleri 2017 DS 프로토콜(~50~75% 1RM 구간)을 2회 드롭으로 재현
var REST_WARMUP_SEC = 45;       // 워밍업은 피로를 유발하지 않는 세트
var REST_DROP_SEC = 10;         // 드롭 사이 = 무게 바꾸는 시간뿐(정의상 무휴식)
var REST_AUTOREG_BONUS_SEC = 30;// §3-C 자가조절: 직전 세트가 목표 하단 미달이면 +30초
var REST_MAX_SEC = 240;         // 자가조절 상한

// 세트 생성 규칙을 **데이터로** 내린다 (v2 §4-A).
// 스킴이 4 → 7개가 되면서 buildSchemeSets 의 if/else 분기가 관리 불가능해지기 때문이다.
// 코드(buildSchemeSets)가 아는 패턴은 셋뿐이고, 스킴 추가 = 아래 표에 한 덩어리 추가다.
//   uniform : 전 워킹세트가 같은 무게·반복
//   ramp    : steps 배열대로 세트마다 무게 배율(pct)·반복 가감(repsDelta/repsAbs)을 적용
//   extend  : uniform 워킹세트 뒤에 연장 세트를 붙인다 (볼륨 카운트에서 제외되는 '마지막 세트의 연장')
// steps 필드
//   pct       : 워킹 무게 대비 배율. 1 미만이면 reduceWeight 를 거친다(= 가까운 배수 + 최소 한 단위 하강 보장)
//   repsDelta : 목표 반복 가감. **클래스 범위로 클램프하지 않는다** — 피라미드의 +4가 잘려 나가면 스킴이 무너진다
//   repsAbs   : [하한, 상한] 절대 반복 목표(클래스 범위 무시). amrap 과 함께 쓴다
//   repeat    : 'fill' 이면 남는 워킹세트를 이 단으로 채운다 / 숫자면 그 횟수만큼
//   last      : true 면 항상 마지막 워킹세트 자리를 차지한다
// progressFrom: 증량 판정의 기준 세트가 첫 세트인지('first') 마지막 세트인지('last').
//   실제 판정은 getProgressiveRecommendation 의 "가장 무거운 세트" 필터가 알아서 하고, 이 값은 문서·테스트용이다.
var SET_SCHEMES = {
  straight: {
    kr: '스트레이트', short: '스트레이트',
    desc: '모든 세트를 같은 무게·횟수로',
    build: { pattern: 'uniform' }
  },

  top_backoff: {
    // 내부 id는 top_backoff 그대로 두고 표시명만 '탑세트'로 줄인다 — 저장된 사용자 선택과
    // 과거 세션(exercise.scheme)이 전부 이 id를 들고 있어 바꾸면 이관이 또 필요해진다.
    kr: '탑세트', short: '탑세트',
    desc: '가장 무거운 1세트 뒤 한 단계 가벼운 무게로 채워요',
    build: {
      pattern: 'ramp', feeder: true, progressFrom: 'first',
      steps: [
        { pct: 1.00,        role: 'top',     repsDelta: 0, rir: '1-2' },
        { pct: BACKOFF_PCT, role: 'backoff', repsDelta: 0, rir: '2-3', repeat: 'fill' },
        { pct: BACKOFF_PCT, role: 'backoff', repsDelta: 0, rir: '0-1', last: true }
      ],
      // v2 §2-E③ — 탑세트가 목표 반복에 못 미치면 남은 백오프를 한 스텝 더 내린다
      autoDeload: { when: 'topMissedTarget', pct: BACKOFF_DELOAD_PCT }
    }
  },

  pyramid: {
    kr: '피라미드', short: '피라미드',
    desc: '가볍게 시작해 세트마다 무게를 올려요',
    build: {
      pattern: 'ramp', progressFrom: 'last',
      steps: [
        { pct: PYRAMID_PCTS[0], role: 'work', repsDelta: 4, rir: '3-4', repeat: 'fill' },
        { pct: PYRAMID_PCTS[1], role: 'work', repsDelta: 2, rir: '2-3' },
        { pct: PYRAMID_PCTS[2], role: 'top',  repsDelta: 0, rir: '0-1', last: true }
      ]
    }
  },

  rpt: {
    kr: '역피라미드', short: '역피라미드',
    desc: '가장 무거운 1세트부터, 세트마다 가볍고 길게',
    build: {
      // 첫 세트가 곧 가장 무거운 세트라 램프 끝의 피더가 특히 필요하다
      pattern: 'ramp', feeder: true, progressFrom: 'first',
      steps: [
        { pct: RPT_PCTS[0], role: 'top',  repsDelta: 0, rir: '0-2' },
        { pct: RPT_PCTS[1], role: 'work', repsDelta: 2, rir: '0-2' },
        { pct: RPT_PCTS[2], role: 'work', repsDelta: 4, rir: '0-2', repeat: 'fill' }
      ]
    }
  },

  drop: {
    kr: '드롭세트', short: '드롭',
    desc: '마지막 세트에서 무게를 25%씩 낮춰 이어서',
    build: {
      pattern: 'extend',
      // chainFrom: 'prev' = 배율을 직전 연장 세트에 다시 곱한다 (드롭1 = W×0.75, 드롭2 = 드롭1×0.75)
      steps: [
        { pct: DROP_PCT, role: 'drop', repsMode: 'high', rir: '0', rest: REST_DROP_SEC, chainFrom: 'prev' },
        { pct: DROP_PCT, role: 'drop', repsMode: 'high', rir: '0', chainFrom: 'prev' }
      ]
    }
  }
};

// 세트법 시트에 뜨는 순서 (v2 §3-B — 스트레이트 → 탑세트 → 피라미드 계열 → 연장 계열)
var SET_SCHEME_ORDER = ['straight', 'top_backoff', 'pyramid', 'rpt', 'drop'];

// 사라진 세트법 → 살아 있는 세트법. 저장된 사용자 선택·진행 중 세션에 남은 값을 로드 때 1회 이관한다
// (core.js migrateSetSchemeData). 이관하지 않으면 종목별 선택이 조용히 클래스 기본값으로 되돌아간다.
//  · top_backdown → top_backoff : 둘 다 "가장 무거운 1세트 + 감량 세트" 구조라 의도가 가장 가깝다
//  · myo_reps     → straight    : 연장 세트를 붙이지 않는 기본형. 대체할 만한 연장 스킴이 없다
var SET_SCHEME_MIGRATIONS = {
  top_backdown: 'top_backoff',
  myo_reps: 'straight'
};

// 세트 역할 → 화면 뱃지. 값이 없으면(옛 세션 복원 등) 뱃지를 그리지 않는다.
// backdown·myo 는 **과거 기록 전용**이다 — 두 세트법은 삭제됐지만 이미 저장된 운동 기록에
// 그 역할의 세트가 남아 있어, 뱃지를 지우면 지난 기록 화면에서 역할이 통째로 사라진다.
var SET_ROLE_KR = {
  warmup:   '워밍업',
  top:      '탑세트',
  backoff:  '백오프',
  backdown: '백다운',
  work:     '',
  drop:     '드롭',
  myo:      '미니'
};

// 진행 판정·1RM·'지난 기록'에서 빼야 하는 세트 역할.
//  · drop / myo  = 마지막 워킹세트의 **연장**이지 독립 세트가 아니다
//  · backdown    = 독립 워킹세트지만 목표 반복(12~15)이 클래스 범위 밖이라, 그대로 두면
//                  "지난 세션 최고 반복"이 백다운 15회로 잡혀 다음 세션 탑세트 목표가 튀어 오른다
// myo·backdown 은 지금 만들어지지 않지만 **과거 기록에 남아 있어** 목록에서 빼면 안 된다 —
// 빼는 순간 옛 마이오렙·백다운 세트가 다시 증량 판정·1RM에 섞여 목표가 튀어 오른다.
// **볼륨 카운트는 이 목록을 쓰지 않는다** — 백다운은 볼륨에 포함된다(v2 §3-C C-4).
var SET_ROLES_OFF_PROGRESS = ['drop', 'myo', 'backdown'];

// **마지막 워킹세트의 연장**이라 독립 세트로 세면 안 되는 역할 (= 볼륨 카운트에서 빼는 목록).
// 위 목록과 일부러 다르다: 백다운은 무게·휴식·목표가 따로 있는 독립 워킹세트라 볼륨에 들어간다.
// 두 목록을 하나로 합치면 3세트 종목이 5세트로 부풀거나(연장을 세면), 주간 볼륨이 깎인다(백다운을 빼면).
var SET_ROLES_EXTENSION = ['drop', 'myo'];

// ─── 길항근 슈퍼세트 ──────────────────────────────────────────
// 근거: Zhang 2025(Sports Med 55(4):953-975, 19연구 313명) — 세션 시간 약 −37%인데
// 총 볼륨 로드(SMD 0.05)·근비대(SMD −0.05)·최대근력(SMD 0.10) 모두 동등. Burke 2024도 −36% 동등.
// 단 젖산·주관적 힘듦(RPE)이 유의하게 높아 세션당 2페어까지만 자동 제안한다.
// 페어는 반드시 **길항(서로 반대로 움직이는) 관계**여야 한다 — 같은 근육을 연달아 쓰면 볼륨 로드가 떨어진다.
var SUPERSET_ANTAGONISTS = {
  chest: ['lats', 'upper_back'],
  chest_upper: ['lats', 'upper_back'],
  chest_lower: ['lats', 'upper_back'],
  lats: ['chest', 'chest_upper', 'chest_lower'],
  upper_back: ['chest', 'chest_upper', 'chest_lower'],
  biceps: ['triceps'],
  triceps: ['biceps'],
  quads: ['hamstrings'],
  hamstrings: ['quads'],
  shoulders_side: ['shoulders_rear'],
  shoulders_rear: ['shoulders_side']
};

var SUPERSET_SWITCH_SEC = 45;      // 페어의 앞 종목을 끝내고 뒤 종목으로 이동하는 시간
var SUPERSET_CYCLE_REST_RATIO = 0.6; // 페어 1바퀴를 돈 뒤 휴식 = 클래스 휴식 × 0.6 (최소 60초)
var SUPERSET_MAX_PAIRS = 2;        // 세션당 자동 제안 상한 (Zhang 2025의 높은 RPE·대사 스트레스 때문)
var SUPERSET_MIN_CYCLE_REST_SEC = 60;

// 요추 축성(세로) 압박이 큰 종목. 슈퍼세트 페어에서 제외하는 데만 쓴다 —
// 사용자가 허리디스크 보유라, 요추에 부하가 걸리는 두 종목을 쉬지 않고 번갈아 하면 안 된다
// (docs/research/training-splits.md §2-E 주의 3 · §5-C). 목록에 없으면 'low'.
var EXERCISE_AXIAL_LOAD = {
  '핵 스쿼트': 'high',
  '스미스 머신 스쿼트': 'high',
  '바벨 스쿼트': 'high',
  '프론트 스쿼트': 'high',
  '데드리프트': 'high',
  '루마니안 데드리프트': 'high',
  '바벨 루마니안 데드리프트': 'high',
  '스탠딩 카프 레이즈': 'high',
  '레그 프레스': 'mid',
  '머신 힙 쓰러스트': 'mid'
};

// 클래스 명시 지정 (휴리스틱보다 우선). 페이스 풀은 사용자 어깨 재활 목적 → rehab.
var EXERCISE_CLASS_OVERRIDES = {
  '밴드 외회전': 'rehab',
  '클램쉘': 'rehab',
  '터미널 니 익스텐션': 'rehab',
  '페이스 풀': 'rehab',
  // 이름에 '벤치 프레스'가 들어가 HEAVY_COMPOUND_KEYWORDS에 걸리지만 실제 처방은 10~12회다.
  // 지정하지 않으면 '고중량 복합'(6~10회)으로 잡혀, SESSIONS PUSH/UPPER 템플릿이 적어 둔
  // 10-12와 화면에 뜨는 목표 반복이 어긋난다(20kg 덤벨 인클라인 프레스는 대형 리프트가 아니다).
  // 바벨/스미스 인클라인·평벤치는 진짜 고중량 복합이라 그대로 둔다.
  '덤벨 인클라인 벤치 프레스': 'compound_moderate'
};

// 재활 키워드 (미등록 종목 이름에서 감지)
var REHAB_NAME_KEYWORDS = ['밴드', '외회전', '내회전', '클램쉘', 'TKE', '터미널 니'];

// ─── 역방향 진행 (어시스트 보조 기구) ───────────────────────────
// 어시스트 풀업·딥스 머신의 스택 무게는 **부하가 아니라 체중을 상쇄해 주는 보조력**이다.
// 실제로 드는 무게(순부하) = 체중 − 보조 무게. 그래서 다른 모든 종목과 진행 방향이 정반대다:
//   보조 40kg → 35kg 로 **낮추는 것**이 증량(+5kg)이고, 높이는 것이 감량이다.
// 이 앱의 점진적 과부하 엔진은 "무게 증가 = 진행"을 전제하므로, 이 목록의 종목만
// 방향을 뒤집어 다룬다 (isReverseProgression — js/domain.js).
// 근거: docs/research/assisted-progression.md
var REVERSE_PROGRESSION_EXERCISES = ['어시스트 풀업', '어시스트 딥스'];

// 이름 키워드 — AI가 만든 표기 변형('어시스티드 풀업', '머신 어시스트 딥스')도 잡는다.
// 단, '어시스트'만으로는 부족하다: 보조 기구는 풀업·친업·딥스 전용이므로 **두 키워드가 모두**
// 들어간 이름만 역방향으로 본다. ('어시스트'만 보면 '어시스트 레그 프레스' 같은 이름이
// 정방향인데도 1RM이 삭제되는 등 조용한 오탐이 생긴다.)
// '보조'는 단독으로 쓰면 오탐이 커서(보조 운동/보조근) 넣지 않는다.
// 두 키워드를 AND로 묶기 때문에 '보조'도 안전하게 넣을 수 있다('보조 풀업' ✅ / '보조 운동' ❌).
// 매칭 전에 공백·하이픈을 지우므로 '어시스트 풀 업', '어시스티드 풀-업'도 같이 잡힌다.
var ASSIST_NAME_KEYWORDS = ['어시스트', '어시스티드', '어시스티트', '보조'];
var ASSIST_MOVEMENT_KEYWORDS = ['풀업', '친업', '딥스', '펄업', '치닝'];

// 밴드 보조는 제외한다 — 밴드는 하단에서 보조가 최대이고 상단에서 거의 사라지는 **가변 보조**라
// "보조 몇 kg" 개념 자체가 성립하지 않는다(머신 카운터웨이트만 전 구간 일정).
// docs/research/assisted-progression.md §6
var ASSIST_EXCLUDE_KEYWORDS = ['밴드'];

// 첫 시도 보조 무게 = 체중 × 이 비율. 기록도 1RM도 없을 때만 쓰는 출발점이다.
// 어시스트 종목은 e1RM 추적에서 빠지므로(보조 무게로 계산한 1RM은 클수록 약하다는 뜻이라 무의미)
// 1RM 기반 폴백을 쓸 수 없다. 보조 = 체중의 약 40%(순부하 ≈ 체중의 60%)면 대부분 6~10회가
// 가능한 지점이라는 실무 권장에서 왔다. 첫 세트 후 사용자가 바로 조절하는 값이라 정밀도는 불필요.
var ASSIST_INITIAL_BW_RATIO = 0.4;

// 고중량 복합 판별 키워드 (프리웨이트 대형 리프트 + 맨몸 대형)
var HEAVY_COMPOUND_KEYWORDS = ['풀업', '친업', '딥스', '벤치 프레스', '스쿼트', '데드리프트', '바벨 로우'];

// 경량 고립 부위 (소근육 — 고반복·무게 거의 고정)
var LIGHT_ISOLATION_PARTS = ['shoulders_side', 'shoulders_rear', 'calves', 'abs', 'obliques', 'glutes_med', 'adductors', 'forearms'];

// 부위 그룹 (대분류) - 부위 균형 분석 및 합산 진단용
// 형식: 통합부위코드: { kr: '한국어명', subParts: ['세부 부위 코드들...'] }
//
// 전완·요추를 여기 두지 않는 이유 (주간 볼륨 추적 대상이 아니다):
//  - 요추(척추기립근): 직접 종목이 앱에 0개다. 스쿼트·데드에서 거의 등척성으로 버티는 역할이라
//    근비대 자극이 약하고, RP 등 표준 볼륨 랜드마크 표에도 별도 부위로 들어가지 않는다.
//    막대가 구조적으로 항상 0 → 영원히 '부족'으로 떠서 진단 전체의 신호를 깎아먹었다.
//  - 전완: RP는 정식 부위로 다루지만 '중립·회내 당기기가 이미 있으면 주 1회 해머/리버스컬로
//    MEV~MRV 충족'이라 별도 추적 이득이 작다. 이 앱은 직접 종목이 1개(이지 바 리버스 컬)뿐이라
//    역시 영구 부족 오탐이었고, 그 오탐이 AI 프롬프트에 '권장 종목: 이지 바 리버스 컬'을 항상
//    실어 보내 이두 질문에도 리버스컬만 답하게 만들었다(#5).
// 두 부위 모두 자극 인체도(js/bodymap.js)와 BODY_PART_KR 에는 그대로 남는다 — 표시는 하되 세지 않는다.
var BODY_PART_GROUPS = {
  chest:           { kr: '가슴',       subParts: ['chest', 'chest_upper', 'chest_lower'], size: 'large' },
  shoulders_front: { kr: '어깨 전면',  subParts: ['shoulders_front'], size: 'small' },
  shoulders_side:  { kr: '어깨 측면',  subParts: ['shoulders_side'], size: 'small' },
  shoulders_rear:  { kr: '어깨 후면',  subParts: ['shoulders_rear'], size: 'small' },
  triceps:         { kr: '삼두',       subParts: ['triceps'], size: 'small' },
  lats:            { kr: '광배',       subParts: ['lats'], size: 'large' },
  upper_back:      { kr: '등 중부',    subParts: ['upper_back', 'traps'], size: 'large' },
  biceps:          { kr: '이두',       subParts: ['biceps'], size: 'small' },
  quads:           { kr: '대퇴사두',   subParts: ['quads'], size: 'large' },
  hamstrings:      { kr: '햄스트링',   subParts: ['hamstrings'], size: 'large' },
  glutes:          { kr: '둔근',       subParts: ['glutes', 'glutes_med'], size: 'large' },
  adductors:       { kr: '내전근',     subParts: ['adductors'], size: 'small' },
  // 종아리: 어떤 종목도 calves를 보조근(secondary)으로 두지 않아 복합운동 간접자극이 거의 0 →
  // '작은 근육=간접자극으로 목표 낮춤' 전제가 성립 안 함. 볼륨 목표는 큰 근육 수준으로 둔다(고볼륨 내성).
  // 이 size 값은 해부학적 크기가 아니라 '직접 볼륨 목표' 분류이며, getVolumeDiagnosis·ai.js 볼륨 임계가 함께 참조. 근거: RP/Schoenfeld.
  calves:          { kr: '종아리',     subParts: ['calves'], size: 'large' },
  abs:             { kr: '복근',       subParts: ['abs', 'obliques'], size: 'small' }
};

// 부위 한국어
var BODY_PART_KR = {
  chest: '가슴', chest_upper: '가슴 상부', chest_lower: '가슴 하부',
  shoulders_front: '어깨 전면', shoulders_side: '어깨 측면', shoulders_rear: '어깨 후면',
  triceps: '삼두', biceps: '이두',
  lats: '광배', upper_back: '등 중부', traps: '승모근', forearms: '전완',
  quads: '대퇴사두', hamstrings: '햄스트링', glutes: '둔근', glutes_med: '중둔근',
  calves: '종아리', adductors: '내전근',
  abs: '복근', obliques: '복사근', lower_back: '요추'
};

// ═══════════════════════════════════════════════
// 인클라인 워킹(경사 걷기) 처방 상수
// 근거: docs/research/incline-walking.md — §2(단계별 처방표) · §3(세션 구조) · §4(점진 규칙) · §5(주의사항)
// 이 모드의 정직한 장점은 "평지 조깅에 가까운 열량을 무릎 부담 없이"다(§1-2·§1-4).
// ★'지방 연소·순삭' 류 마케팅 문구 금지 — 연구가 서로 엇갈리고(§1-3), 체지방은 총 에너지 적자가 정한다(§1-1).
// ═══════════════════════════════════════════════
var WALK_PRESCRIPTION = {
  inclineStart: 4,          // 기록 없을 때 첫 경사 % (§2-1 0~1단계: 4~6%에서 시작)
  inclineMax: 12,           // ★절대 상한 — 초과 금지(§1-3: 15~20%는 이득 사라지고 지속률 붕괴)
  inclineMin: 0,
  inclineFloor: 3,          // 하향 게이트가 내려도 이 아래로는 안 내림(0%면 걷기 모드 의미가 없음)
  speedDefault: 5.0,        // 본 구간 기본 속도 km/h (§2 처방표)
  speedMin: 4.5,
  speedMax: 5.5,            // 속도 상한 (§4-1: 4순위 축, +0.2~0.3씩만)
  cooldownSpeed: 4.5,       // 쿨다운 속도 (§3-2)
  mainMaxSec: 33 * 60,      // 본 구간 상한 33분 (§4-1 시간 축 상한)
  // 세션 총시간 상한 45분 = 몸풀기 5 + 램프 2 + 본 구간 33 + 정리 5 (§2-1 4단계 · §4-1).
  // 더 길게 요청해도 여기서 자른다 — 본 구간 33분을 넘기면 §4-1 시간 축 상한을 어기게 된다.
  // 주간 총량이 더 필요하면 세션을 길게 하지 말고 빈도를 늘리거나 인터벌·걸음 수로 채운다(§4-3).
  maxTotalSec: 45 * 60,
  precueSec: 10             // 구간 전환 예고 10초 전 (§7-4: 콘솔까지 손 뻗기 + 경사 모터 이동 5~15초)
};

// 본 구간 중 소리 없이 화면에만 회전 표시하는 코칭 문구 (§3-3 시나리오 · §5-2 손잡이 · §5-3 대화 테스트)
// 소리는 "지금 뭘 바꿔야 한다"는 신호로만 아껴 쓴다(§3-4).
var WALK_COACH_TIPS = [
  '손잡이 잡고 있나요? 놓으세요. 잡고 뒤로 기대면 강도의 3분의 1이 날아가요.',
  '지금 문장은 말할 수 있는데 노래는 안 되는 정도인가요? 그게 딱 맞아요.',
  '보폭을 늘리지 말고 발을 더 자주 놓으세요. 긴 보폭은 허리에 부담이 돼요.',
  '가슴은 들고 허리는 곧게. 접히는 곳은 허리가 아니라 고관절이에요.'
];

// 세션 종료 후 손잡이 문항 선택지 (§5-2 · §7-3) — 다음 세션 경사를 정하는 입력이라 값어치가 크다.
var WALK_HANDRAIL_OPTIONS = [
  { value: 'none',  label: '안 잡음',        desc: '가장 좋아요' },
  { value: 'light', label: '가볍게 얹음',    desc: '손실 거의 없음' },
  // 손잡이는 자세로 갈린다(선별안 B5 · Hofmann 2014): 상체를 세우고 잡으면 열량 −12%로 유의차 없음,
  // 뒤로 기대면 −32%(경사 이득 소멸). 그래서 '기댐'만 경사를 내린다.
  { value: 'hold_upright', label: '잡고 상체 세움', desc: '경사 유지' },
  { value: 'hold_lean',    label: '잡고 뒤로 기댐', desc: '다음엔 경사 −2%' }
];

// ═══════════════════════════════════════════════
// 웜업 · 스트레칭 동작 사전 (부위별 가이드)
// 근거: docs/research/warmup-stretching.md
//   §1 웜업 · §2 스트레칭 · §3 부위별 루틴 · §4 허리디스크 · §6 앱 적용 설계
//
// ★정직성 규칙 (§2 · Warneke 2025 델파이 합의문, 전문가 20명 전 항목 80%+ 합의):
//   스트레칭이 근거로 약속할 수 있는 건 **유연성(가동범위) 유지** 하나뿐이다.
//   근비대(d=0.20, 근육당 15분×주5회 필요) · 근육통/DOMS(유의차 없음) · 부상 예방(유의하지 않음)
//   — 이 셋을 시사하는 문구는 이 테이블·화면·AI 프롬프트 어디에도 쓰지 않는다.
// ★본세트 전 한 근육당 60초 이상 정적 스트레칭 금지 (§1-D: 최대근력 −5.4%, Simic 2013 / ES −0.84, Warneke 2024).
//   → 웜업 목록은 전부 동적 드릴이고, 정적 유지가 섞여도 한 부위 30초를 넘기지 않는다.
// ★허리디스크 (§4): 손상 기전은 "큰 압박력"이 아니라 **부하 상태의 반복 요추 굴곡**이다(McGill).
//   기본 목록에는 굴곡 동작을 애초에 넣지 않았다. discSafe:false 항목은 §4-A 배제 목록을 코드에
//   남겨둔 것이며 어떤 기본 목록에도 등장하지 않는다 — 목록에 잘못 섞이면 buildWarmupPlan이 discAlt로 치환한다.
// ★"활성화(activation)" 과대 표현 금지 (§1-F, 근거 등급 낮음): "둔근을 깨우면 스쿼트가 강해진다" X
//   → "그날 쓸 패턴을 가볍게 예행연습한다" O.
//
// kr : 화면에 뜨는 이름. **동작 이름 하나**로 쓴다 — '어깨뼈 풀기 — 바닥 밀어내기' 처럼
//      부위를 앞에 붙이면 이름이 길어져 두 줄로 접히고, 정작 무엇을 하는지가 뒤로 밀린다.
//      부위는 목록을 짜는 코드(*_BY_PART)가 이미 알고 있으니 이름에 다시 적지 않는다.
// mode: 'reps'(횟수) | 'time'(시간 유지) | 'timePerSide'(좌우 각각 시간) | 'repsPerSide'(좌우 각각 횟수)
// sec        : time 계열의 유지 시간(초) — 타이머가 실제로 세는 값
// reps/secPerRep : 횟수와 1회 참고 소요(초). secPerRep은 타이머가 아니라 **총시간 추정용**이다
//                  (횟수 모드는 사용자가 "완료"를 눌러 넘어간다 — §6-D)
// gear : 'none'|'mat'|'wall'|'band'|'foamroller'|'cardio' — 이 테이블 전용 값(GYM_EQUIPMENT id 아님)
// phase: 그 동작의 주 용도('warmup'|'stretch'). 어떤 목록에 들어갈지는 아래 *_BY_PART가 정한다
//        (캣-카멜처럼 양쪽에 쓰이는 동작이 있다).
// ═══════════════════════════════════════════════
var MOBILITY_DRILLS = {

  // ── 공통 오프닝 (§3-A · §1-A) ─────────────────────────────
  general_cardio: {
    kr: '몸 데우기', phase: 'warmup',
    mode: 'time', sec: 180, gear: 'cardio',
    prep: '러닝머신에 올라서거나 실내자전거에 앉아요. 러닝머신은 경사 3~5%로 맞춰요.',
    cue: '숨은 조금 차도 대화가 되는 정도로 움직여요. 자전거는 등을 세우고 앉아요.',
    std: '3분 동안 쉬지 않고 이어서 해요. 숨이 심하게 차면 속도를 낮춰요.',
    why: '근육 온도가 1분에 약 0.1℃ 오르면서 수축·이완 속도와 신경전도가 빨라진다(Bishop 2003). 웜업에서 기전이 가장 확실한 부분.',
    warn: '로잉머신은 쓰지 마세요. 힘을 받은 채 허리를 수백 번 굽혀 디스크에 부담이 돼요.',
    discSafe: true
  },

  // ── 웜업 드릴 (§3-B ~ §3-G) ─────────────────────────────
  cat_camel: {
    kr: '캣-카멜', phase: 'warmup',
    mode: 'reps', reps: 6, secPerRep: 4, gear: 'mat',
    prep: '매트에 네발로 엎드려요. 손은 어깨 아래, 무릎은 엉덩이 아래에 둬요.',
    cue: '등을 천천히 둥글게 올렸다가 평평하게 내려요. 끝까지 밀지 말고 편한 범위에서만 오가요.',
    std: '한 번에 4초쯤 천천히 오가요. 아프면 멈춰요.',
    why: '척추를 부하 없이 움직여 뻣뻣함을 줄인다. 스트레칭이 아니라 관절 윤활이다 — McGill은 빅3 전에 5~6회를 권한다.',
    discSafe: true
  },
  bird_dog: {
    kr: '버드독', phase: 'warmup',
    mode: 'repsPerSide', reps: 6, secPerRep: 5, gear: 'mat',
    prep: '매트에 네발로 엎드려요. 손목은 어깨 밑, 무릎은 엉덩이 밑에 둬요.',
    cue: '한쪽 팔은 앞으로, 반대쪽 다리는 뒤로 뻗어요. 등 높이보다 올리지 말고 골반은 돌리지 않아요.',
    std: '한쪽당 6번씩, 한 번에 3~5초 버텨요. 아프면 멈춰요.',
    why: '척추를 굳힌 뒤 팔·다리를 움직이는 McGill 원칙. 허리엔 근력보다 지구력이 필요하다.',
    discSafe: true
  },
  mcgill_curlup: {
    kr: '맥길 컬업', phase: 'warmup',
    mode: 'repsPerSide', reps: 3, secPerRep: 12, gear: 'mat',
    prep: '매트에 누워 한쪽 무릎만 세우고 반대 다리는 펴요. 두 손은 허리 밑에 넣어 받쳐요.',
    cue: '머리와 어깨를 한 덩어리로 3cm쯤만 들어요. 목을 접거나 허리를 바닥에 누르지 않아요.',
    std: '10초 버티고 내려요. 무릎 세운 쪽으로 3번 하고 다리를 바꿔요.',
    why: '일반 윗몸일으키기와 달리 요추를 말지 않고 복부 지구력만 쓴다(McGill 빅3).',
    discSafe: true
  },
  side_bridge: {
    kr: '사이드 브리지', phase: 'warmup',
    mode: 'repsPerSide', reps: 3, secPerRep: 12, gear: 'mat',
    prep: '매트에 옆으로 누워 무릎을 90도로 접어요. 아래쪽 팔꿈치는 어깨 바로 밑, 위쪽 손은 반대쪽 어깨에 얹어요.',
    cue: '엉덩이를 들어 무릎부터 머리까지 일직선을 만들어요. 몸이 앞으로 기울거나 엉덩이가 처지지 않게요.',
    std: '10초 버티고 내려요. 한쪽에서 3번 하고 반대쪽으로 바꿔요.',
    why: 'McGill 빅3. 척추 강성을 지구력 방식으로 만든다.',
    discSafe: true
  },
  scap_pushup: {
    kr: '바닥 밀어내기', phase: 'warmup',
    mode: 'reps', reps: 10, secPerRep: 3, gear: 'none',
    prep: '팔굽혀펴기 자세로 엎드려 팔을 곧게 펴요. 손은 어깨 바로 아래, 힘들면 벽을 짚고 서서 해요.',
    cue: '팔은 편 채 가슴을 내렸다가 바닥을 밀어 등을 넓혀요. 팔꿈치가 굽거나 허리가 처지지 않게 해요.',
    std: '한 번에 3초쯤 천천히 해요. 어깨가 아프면 멈춰요.',
    why: '어깨뼈가 먼저 움직여야 미는 동작에서 어깨가 대신 무리하지 않는다.',
    discSafe: true
  },
  band_pull_apart: {
    kr: '밴드 벌리기', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'band',
    prep: '서서 밴드를 잡고 두 팔을 앞으로 가슴 높이까지 뻗어요. 손은 어깨너비보다 조금 넓게 잡아요.',
    cue: '팔꿈치를 살짝 굽힌 채 밴드가 가슴에 닿게 벌려요. 어깨를 으쓱하지 않아요.',
    std: '15회가 가볍게 되는 밴드로 해요. 밴드가 없으면 맨손으로 크게 벌려요.',
    why: '그날 쓸 견갑 움직임을 가볍게 예행연습한다.',
    discSafe: true
  },
  wall_slide: {
    kr: '벽에 팔 올리기', phase: 'warmup',
    mode: 'reps', reps: 10, secPerRep: 3, gear: 'wall',
    prep: '벽에 등을 대고 서고, 발은 벽에서 한 뼘 앞에 둬요. 팔은 어깨 높이로 굽혀 팔꿈치와 손등을 벽에 붙여요.',
    cue: '팔꿈치와 손등을 벽에 붙인 채 천천히 위로 밀어 올렸다 내려요. 허리가 젖혀지면 거기서 멈춰요.',
    std: '손등이 벽에서 떨어지기 직전까지만 올려요. 아프면 멈춰요.',
    why: '머리 위로 미는 동작 전에 어깨 가동범위를 확보한다.',
    discSafe: true
  },
  open_book: {
    kr: '누워서 팔 열기', phase: 'warmup',
    mode: 'repsPerSide', reps: 6, secPerRep: 4, gear: 'mat',
    prep: '매트에 옆으로 누워 무릎을 배 앞으로 90도 접고 허벅지를 붙여요. 두 팔은 가슴 앞으로 나란히 뻗어요.',
    cue: '가슴부터 돌리며 위쪽 팔을 바닥 쪽으로 넘겨요. 무릎이 벌어지면 허리가 대신 비틀려요.',
    std: '한쪽 6회씩이에요. 당기는 느낌까지만, 아프면 멈춰요.',
    why: '흉추(등 상부) 회전이다. 허리를 비트는 동작은 디스크에 전단력이 걸려 이 앱에서 아예 뺐다.',
    discSafe: true
  },
  straight_arm_pulldown: {
    kr: '밴드 눌러 내리기', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'band',
    prep: '밴드를 문틀 위나 랙 높은 곳에 걸고 마주 서요. 팔 편 채로 잡고 한 걸음 물러나요.',
    cue: '팔을 편 채로 등 옆 근육으로 밴드를 허벅지까지 눌러요. 어깨가 귀 쪽으로 솟으면 잘못된 거예요.',
    std: '가벼운 밴드로 해요. 어깨가 아프면 멈춰요.',
    why: '당기는 날 쓸 광배 패턴을 미리 한 번 지나간다.',
    discSafe: true
  },
  prone_y_raise: {
    kr: '엎드려 Y 들기', phase: 'warmup',
    mode: 'reps', reps: 8, secPerRep: 3, gear: 'mat',
    prep: '매트에 엎드려 이마를 수건에 대요. 팔은 머리 위 Y자로 벌리고 엄지는 천장을 봐요.',
    cue: '팔을 편 채 바닥에서 살짝 들었다 내려요. 허리를 젖혀 몸통이 뜨면 잘못된 거예요.',
    std: '위에서 1~2초 멈췄다 내려요. 무게는 들지 않아요.',
    why: '등 하부 승모근·회전근개를 가볍게 준비시킨다.',
    discSafe: true
  },
  arm_circle: {
    kr: '팔로 원 그리기', phase: 'warmup',
    mode: 'reps', reps: 20, secPerRep: 1.5, gear: 'none',
    prep: '발을 어깨너비로 벌리고 서요. 두 팔을 옆으로 어깨 높이까지 들어요.',
    cue: '작은 원부터 시작해 점점 크게 돌려요. 어깨를 으쓱하거나 허리를 젖히지 않아요.',
    std: '앞으로 10회, 뒤로 10회 나눠 돌려요. 어깨가 결리면 원을 작게 해요.',
    why: '어깨는 가동범위가 크고 불안정한 관절이라 미리 움직여두면 편하다.',
    discSafe: true
  },
  band_external_rotation: {
    kr: '밴드로 어깨 돌리기', phase: 'warmup',
    // 한쪽씩 하는 동작이라 repsPerSide 다 — 'reps'로 두면 화면이 15회만 안내하고
    // 예상 시간도 반쪽만 잡는다(좌우 두 구간으로 쪼개져야 맞다).
    mode: 'repsPerSide', reps: 15, secPerRep: 2, gear: 'band',
    prep: '밴드를 문고리에 걸고 옆으로 서요. 문고리에서 먼 쪽 손으로 잡고 팔꿈치를 옆구리에 붙여요.',
    cue: '팔꿈치는 붙인 채 아래팔만 바깥으로 밀었다가 천천히 돌아와요. 몸통이 같이 돌아가지 않게 해요.',
    std: '한쪽 15회씩이에요. 밴드는 가볍게, 아프면 멈춰요.',
    why: '회전근개를 그날 각도로 미리 지나가게 한다.',
    discSafe: true
  },
  glute_bridge: {
    kr: '글루트 브리지', phase: 'warmup',
    mode: 'reps', reps: 12, secPerRep: 4, gear: 'mat',
    prep: '매트에 누워 무릎을 세우고 팔은 몸 옆에 둬요. 발은 엉덩이에서 한 뼘 앞, 골반 너비로 둬요.',
    cue: '발뒤꿈치로 밀어 엉덩이를 들어요. 어깨·엉덩이·무릎이 일직선이 되면 멈추고 더 젖히지 않아요.',
    std: '맨 위에서 2초 멈췄다 천천히 내려요. 허리가 아프면 멈춰요.',
    why: '요추 중립을 유지한 채 고관절 신전을 예행연습한다.',
    discSafe: true
  },
  bw_squat: {
    kr: '맨몸 스쿼트', phase: 'warmup',
    mode: 'reps', reps: 12, secPerRep: 3, gear: 'none',
    prep: '발을 어깨너비로 벌리고 서요. 발끝은 살짝 바깥으로 향해요.',
    cue: '엉덩이를 뒤로 빼며 앉았다 일어나요. 무릎이 안으로 모이지 않게, 뒤꿈치는 붙인 채로요.',
    std: '처음 몇 번은 얕게 해요. 허리가 말리기 직전 깊이까지만 내려가요.',
    why: '그날 쓸 패턴을 부하 없이 한 번 지나간다.',
    discSafe: true
  },
  reverse_lunge: {
    kr: '뒤로 런지', phase: 'warmup',
    mode: 'repsPerSide', reps: 8, secPerRep: 3, gear: 'none',
    prep: '발을 골반 너비로 두고 서요. 손은 허리에 얹고 배에 살짝 힘을 줘요.',
    cue: '한 발을 뒤로 크게 내딛고 뒤 무릎을 바닥 가까이 내려요. 상체는 세우고 앞 무릎은 발끝 방향으로요.',
    std: '한쪽 8회씩이에요. 흔들리면 벽이나 기둥을 짚어요.',
    why: '한 다리 균형과 고관절 굴곡근 길이를 함께 준비한다.',
    discSafe: true
  },
  ankle_wall_knee: {
    kr: '무릎으로 벽 밀기', phase: 'warmup',
    mode: 'repsPerSide', reps: 10, secPerRep: 2, gear: 'wall',
    prep: '벽을 보고 서서 두 손으로 벽을 짚어요. 앞발 발끝을 벽에서 5cm 떨어뜨리고 다른 발은 뒤에 둬요.',
    cue: '뒤꿈치를 바닥에 붙인 채 무릎을 앞으로 밀어 벽에 대요. 뒤꿈치가 뜨면 거기까지예요.',
    std: '한쪽 10회씩이에요. 쉬우면 앞발을 조금 더 뒤로 옮겨요.',
    why: '발목이 안 굽으면 스쿼트 깊이가 안 나온다.',
    discSafe: true
  },
  wrist_circle: {
    kr: '손목 돌리기', phase: 'warmup',
    mode: 'reps', reps: 10, secPerRep: 2, gear: 'none',
    prep: '서서 두 팔을 앞으로 뻗고 주먹을 가볍게 쥐어요. 팔꿈치는 움직이지 않아요.',
    cue: '손목만 써서 작은 원부터 점점 크게 그려요. 이어서 위아래로 천천히 접었다 펴요.',
    std: '원 10회, 접었다 펴기 10회예요. 아프지 않은 범위까지만 움직여요.',
    why: '컬·푸시다운 전에 손목을 준비시킨다.',
    discSafe: true
  },
  elbow_flex_ext: {
    kr: '팔꿈치 접었다 펴기', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'none',
    prep: '서서 팔을 옆으로 늘어뜨려요. 팔꿈치는 몸통 옆에 붙이고 손바닥은 앞을 봐요.',
    cue: '손바닥을 어깨 쪽으로 접었다가 다시 펴요. 어깨가 앞뒤로 흔들리면 잘못된 거예요.',
    std: '두 팔 같이, 무게 없이 해요. 걸리는 느낌이 있으면 그 앞까지만요.',
    why: '팔 종목 전 관절 가동범위를 한 번 확인한다.',
    discSafe: true
  },
  band_curl_pushdown: {
    kr: '밴드 컬·푸시다운', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'band',
    prep: '컬은 밴드 가운데를 한 발로 밟고 손바닥이 위로 오게 양끝을 잡아요. 푸시다운은 밴드를 문틀 위에 걸어요.',
    cue: '둘 다 팔꿈치를 옆구리에 붙인 채 손만 움직여요. 몸을 흔들어 반동을 쓰지 않아요.',
    std: '가장 약한 밴드로 컬 15회, 푸시다운 15회예요.',
    why: '그날 쓸 팔 패턴의 예행연습.',
    discSafe: true
  },

  // ── 스트레칭 (§3-B ~ §3-G) ─────────────────────────────
  // 전부 30초 안팎이다: ACSM(2011)의 "10~30초 × 2~4회 = 근육당 총 60초" 유지 기준을 맞춘 값이며,
  // 델파이 합의문의 "만성 유연성 향상(3세트×120초)" 기준에는 못 미친다 — 화면 문구도 그렇게 정직하게 쓴다(§2-A).
  doorway_chest: {
    kr: '문틀에 팔 대기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'wall',
    prep: '문틀 옆에 서요. 한쪽 팔꿈치를 어깨 높이로 들고 90도로 굽혀 아래팔을 문틀에 대요.',
    cue: '같은 쪽 발을 한 걸음 앞으로 내디뎌요. 허리를 젖히지 말고 체중만 앞으로 실어요.',
    std: '가슴 앞이 당기는 느낌까지만 해요. 어깨가 찌릿하면 멈춰요.',
    why: '미는 종목 뒤 가슴·어깨 전면의 가동범위를 지킨다.',
    discSafe: true
  },
  cross_body_rear_delt: {
    kr: '팔 가로질러 당기기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    prep: '편하게 서거나 앉아 어깨 힘을 빼요. 한쪽 팔을 펴서 반대쪽 어깨 쪽으로 보내요.',
    cue: '반대 손으로 팔꿈치 위쪽을 잡고 몸쪽으로 당겨요. 팔꿈치를 누르거나 어깨를 올리지 않아요.',
    std: '어깨 뒤가 당기는 정도까지만 해요. 저리면 바로 풀어요.',
    why: '미는 날·당기는 날 모두 많이 쓰는 후면 삼각근의 가동범위 유지.',
    discSafe: true
  },
  overhead_triceps: {
    kr: '팔꿈치 눌러 늘리기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    prep: '서서 한쪽 팔을 위로 뻗어요. 팔꿈치를 접어 손바닥이 등 가운데에 닿게 내려요.',
    cue: '반대 손으로 팔꿈치 바로 위를 잡고 지그시 눌러요. 허리가 젖혀지지 않게 배에 힘을 줘요.',
    std: '팔 뒤가 당기는 정도까지만 해요. 아프면 멈춰요.',
    why: '삼두 장두는 어깨를 지나가므로 팔을 올려야 늘어난다.',
    discSafe: true
  },
  tspine_foamroll: {
    kr: '폼롤러로 등 젖히기', phase: 'stretch',
    mode: 'time', sec: 40, gear: 'foamroller', optional: true,
    prep: '폼롤러를 가로로 두고 날개뼈 높이에 등을 대고 누워요. 무릎을 세우고 손은 머리 뒤로 깍지 껴요.',
    cue: '손으로 머리를 받친 채 등 위쪽만 뒤로 젖혀요. 엉덩이는 바닥에서 떼지 않아요.',
    std: '위치를 조금씩 옮겨 2~3곳 해요. 허리나 목이 아프면 멈춰요.',
    why: '폼롤링은 가동범위를 소폭 올리고 수행을 떨어뜨리지 않는다(Wiewelhove 2019). 해도 되고 안 해도 되는 항목.',
    warn: '허리(요추)에는 폼롤러를 직접 대지 마세요.',
    discSafe: true
  },
  standing_lat_hinge: {
    kr: '서서 엉덩이 빼기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    prep: '랙이나 문틀을 한 손으로 허리 높이쯤 잡아요. 팔이 펴질 만큼 뒤로 물러서요.',
    cue: '무릎을 살짝 굽히고 엉덩이만 뒤로 빼요. 허리는 편 채로, 등이 말리기 전까지만 가요.',
    std: '등 옆이 당기는 느낌까지만 해요. 허리가 뻐근하면 멈춰요.',
    why: '무릎 꿇고 상체를 낮추는 차일드 포즈는 허리를 말기 때문에, 이 자세로 대신한다.',
    discSafe: true
  },
  biceps_wall: {
    kr: '벽 짚고 몸 돌리기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'wall',
    prep: '벽을 옆에 두고 서요. 팔을 뒤로 펴 어깨 높이 벽에 손바닥을 붙이고 손가락은 뒤를 향해요.',
    cue: '발을 조금씩 옮겨 몸 전체를 벽 반대쪽으로 돌려요. 허리만 비틀거나 어깨를 올리지 않아요.',
    std: '팔 앞이 당기는 정도까지만 해요. 손이 저리면 멈춰요.',
    why: '당기는 날·팔 날에 짧아지기 쉬운 이두와 전완의 가동범위 유지.',
    discSafe: true
  },
  seated_tspine_rotation: {
    kr: '앉아서 상체 돌리기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    prep: '의자나 벤치에 앉아 두 발을 바닥에 붙여요. 팔짱 끼듯 양손으로 반대쪽 어깨를 잡아요.',
    cue: '무릎을 붙인 채 가슴만 한쪽으로 돌려요. 무릎이 벌어지면 허리까지 비튼 거예요.',
    std: '등 위쪽이 당기는 정도까지만 해요. 허리가 아프면 멈춰요.',
    why: '흉추 회전이 나오지 않으면 어깨와 허리가 대신 움직인다.',
    discSafe: true
  },
  neck_lateral: {
    kr: '귀를 어깨로', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    prep: '바르게 앉아 늘릴 쪽 손으로 의자 옆을 잡아요. 그 어깨를 아래로 내려요.',
    cue: '머리를 반대쪽으로 천천히 기울여요. 손으로 당기지 말고 머리 무게만 써요.',
    std: '목 옆이 당기는 정도까지만 해요. 팔이 저리면 멈춰요.',
    why: '어깨 종목 뒤 위쪽 승모근이 짧아진 느낌을 푼다.',
    discSafe: true
  },
  supine_hamstring_strap: {
    kr: '누워서 다리 올리기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'mat',
    prep: '매트에 누워 두 무릎을 세워요. 수건이나 밴드를 한쪽 발바닥에 걸고 양끝을 잡아요.',
    cue: '수건 건 다리를 무릎 편 채 위로 올려요. 허리가 바닥에서 뜨지 않게 해요.',
    std: '허벅지 뒤가 당기면 맞아요. 다리로 저림이 내려가면 멈춰요.',
    why: '바닥이 허리를 받쳐 중립이 강제된다. 선 채 발끝 닿기를 대신하는 가장 중요한 동작이다.',
    discSafe: true
  },
  lunge_hipflexor: {
    kr: '무릎 꿇고 밀기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'mat',
    prep: '매트에 늘릴 쪽 무릎을 대고 앉아요. 그 무릎은 엉덩이 아래, 앞발은 앞무릎 아래에 둬요.',
    cue: '바닥에 댄 쪽 엉덩이에 힘을 주고 몸을 앞으로 밀어요. 허리가 젖혀지면 덜 밀어요.',
    std: '무릎 댄 쪽 허벅지 앞이 당기면 맞아요. 허리가 아프면 멈춰요.',
    why: '오래 앉아 있으면 짧아지는 부위. 골반을 말지 않으면 허리로 늘어난다.',
    discSafe: true
  },
  supine_figure4: {
    kr: '누워서 4자 당기기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'mat',
    prep: '매트에 누워 두 무릎을 세워요. 늘릴 쪽 발목을 반대쪽 무릎 위에 걸쳐요.',
    // 이 동작은 '무릎 가슴으로 당기기'(요추 굴곡이라 배제)의 대체다. 무릎을 잡고 당기면 골반이 말려
    // 대체하려던 그 굴곡이 다시 생기므로, 허벅지 뒤를 잡고 골반이 말리기 전에 멈추게 한다.
    cue: '바닥 쪽 다리의 허벅지 뒤를 두 손으로 잡고 당겨요. 엉덩이가 바닥에서 들리면 덜 당겨요.',
    std: '걸친 쪽 엉덩이가 당기면 맞아요. 다리로 저림이 내려가면 멈춰요.',
    why: '앉아서 상체를 숙이는 비둘기 자세 대신, 바닥에 누워 허리를 보호한다.',
    discSafe: true
  },
  calf_wall: {
    kr: '벽에 기대 종아리 늘리기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'wall',
    prep: '벽에 두 손을 대고 서요. 한 발을 크게 뒤로 빼고, 뒤 무릎은 펴고 발끝은 벽을 향해요.',
    cue: '앞 무릎을 굽히며 몸을 벽 쪽으로 기울여요. 뒷발 뒤꿈치는 바닥에 붙인 채로요.',
    std: '종아리가 당기는 정도까지만 해요. 아프면 멈춰요.',
    why: '발목 가동범위는 스쿼트 깊이에 직접 영향을 준다.',
    discSafe: true
  },
  quad_standing: {
    kr: '서서 발목 잡기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    prep: '늘릴 다리 반대쪽 손으로 벽을 짚고 서요. 두 무릎은 나란히 붙여요.',
    cue: '무릎을 접어 같은 쪽 손으로 발목을 잡고 당겨요. 배에 힘을 줘 허리가 젖혀지지 않게요.',
    std: '허벅지 앞이 당기는 정도까지만 해요. 무릎이 아프면 멈춰요.',
    why: '대퇴사두는 무릎을 접어야 늘어난다. 허리를 젖혀 보상하기 쉬운 동작이라 골반 위치가 핵심.',
    discSafe: true
  },
  wrist_flexor_extensor: {
    kr: '손 맞대고 펴기', phase: 'stretch',
    mode: 'time', sec: 40, gear: 'none',
    prep: '가슴 앞에서 손바닥끼리 맞대고 손끝은 위로 향해요. 팔꿈치는 옆으로 벌려요.',
    cue: '손을 배꼽 쪽으로 천천히 내려요. 20초 남으면 손등끼리 맞대고 손끝을 아래로 두고 올려요.',
    std: '각 20초씩 나눠 해요. 팔뚝이 당기는 정도까지만, 손이 저리면 멈춰요.',
    why: '컬·데드행이 많은 날 전완 가동범위 유지.',
    discSafe: true
  },
  standing_side_bend: {
    kr: '팔 올려 옆으로 기울이기', phase: 'stretch',
    mode: 'timePerSide', sec: 20, gear: 'none',
    prep: '발을 골반 너비로 벌리고 서요. 한 손은 허리에 얹어요.',
    cue: '반대쪽 팔을 머리 위로 올리고, 허리에 손 얹은 쪽으로 기울여요. 앞으로 숙이거나 비틀지 않아요.',
    std: '옆구리가 당기는 정도까지만 해요. 아프면 멈춰요.',
    why: '굴곡·회전을 섞지 않으면 요추에 안전한 범위에서 옆구리를 늘릴 수 있다.',
    discSafe: true
  },
  breathing_9090: {
    kr: '90/90 호흡', phase: 'stretch',
    mode: 'time', sec: 60, gear: 'mat',
    prep: '매트에 누워 종아리를 의자나 소파에 올려요. 엉덩이와 무릎을 90도로 맞추고 한 손은 배에 얹어요.',
    cue: '코로 4초 들이쉬고 6초 내쉬어요. 가슴 말고 배가 부풀게 하고, 어깨는 힘을 빼요.',
    std: '천천히 여섯 번쯤 반복해요. 숨이 가쁘면 더 느리게 해요.',
    why: '운동이 끝났다는 신호를 주는 마무리 동작. 편안한 느낌 말고 다른 효과는 근거가 약하다.',
    discSafe: true
  },

  // ── ⚠️ 배제 동작 (§4-A) — 어떤 기본 목록에도 넣지 않는다 ─────────────────
  // 여기 남겨 둔 이유: ① "왜 이 동작이 없는가"를 코드에 문서로 남기고, ② 앞으로 목록에 잘못
  // 섞여 들어와도 buildWarmupPlan/buildStretchPlan이 discAlt로 자동 치환하게 하기 위해서다.
  standing_toe_touch: {
    kr: '선 채 발끝 닿기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    cue: '(앱에서 쓰지 않는 동작)',
    why: '요추 굴곡 + 중력 + 햄스트링 장력이 겹쳐 디스크 후벽에 부하가 몰린다.',
    discSafe: false, discAlt: 'supine_hamstring_strap'
  },
  seated_forward_fold: {
    kr: '앉아 전굴', phase: 'stretch',
    mode: 'time', sec: 30, gear: 'mat',
    cue: '(앱에서 쓰지 않는 동작)',
    why: '앉은 자세는 골반이 뒤로 말려 요추 굴곡이 더 커진다.',
    discSafe: false, discAlt: 'supine_hamstring_strap'
  },
  knee_to_chest: {
    kr: '무릎 가슴으로 당기기', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'mat',
    cue: '(앱에서 쓰지 않는 동작)',
    why: '순간 편해도 요추 굴곡이라 반복하면 손상 기전이 된다.',
    discSafe: false, discAlt: 'supine_figure4'
  },
  child_pose: {
    kr: '차일드 포즈', phase: 'stretch',
    mode: 'time', sec: 30, gear: 'mat',
    cue: '(앱에서 쓰지 않는 동작)',
    why: '요추 굴곡. 광배 스트레칭은 선 자세 힌지 버전으로 대체한다.',
    discSafe: false, discAlt: 'standing_lat_hinge'
  }
};

// 모든 날 맨 앞에 고정되는 일반 웜업 (§3-A · §1-A)
var WARMUP_GENERAL = ['general_cardio'];

// 부위(대분류 6개) → 웜업 드릴 (§3-B ~ §3-G)
var WARMUP_BY_PART = {
  chest:     ['scap_pushup', 'band_pull_apart', 'wall_slide', 'open_book'],
  back:      ['cat_camel', 'bird_dog', 'straight_arm_pulldown', 'band_pull_apart', 'prone_y_raise'],
  shoulders: ['arm_circle', 'band_external_rotation', 'wall_slide', 'band_pull_apart', 'open_book'],
  legs:      ['cat_camel', 'glute_bridge', 'bw_squat', 'reverse_lunge', 'ankle_wall_knee'],
  arms:      ['wrist_circle', 'elbow_flex_ext', 'scap_pushup', 'band_curl_pushdown'],
  core:      ['cat_camel', 'mcgill_curlup', 'side_bridge', 'bird_dog']
};

// 부위(대분류 6개) → 마무리 스트레칭 (§3-B ~ §3-G)
var STRETCH_BY_PART = {
  chest:     ['doorway_chest', 'cross_body_rear_delt', 'overhead_triceps', 'tspine_foamroll'],
  back:      ['standing_lat_hinge', 'cross_body_rear_delt', 'biceps_wall', 'seated_tspine_rotation'],
  shoulders: ['cross_body_rear_delt', 'doorway_chest', 'neck_lateral', 'overhead_triceps'],
  legs:      ['supine_hamstring_strap', 'lunge_hipflexor', 'supine_figure4', 'calf_wall', 'quad_standing'],
  arms:      ['overhead_triceps', 'biceps_wall', 'wrist_flexor_extensor'],
  core:      ['cat_camel', 'standing_side_bend', 'breathing_9090']
};

// 템플릿 세션 → 웜업 부위 (§3-H). free/AI 루틴은 null → 종목 목록에서 유도한다.
var SESSION_WARMUP_MAP = {
  push:  ['chest', 'shoulders'],
  pull:  ['back'],
  legs:  ['legs'],
  upper: ['chest', 'back', 'shoulders'],
  free:  null
};

// 세부 부위(EXERCISE_BODY_PART_MAP.primary) → 웜업 대분류 6개 (§6-B③)
var PART_TO_WARMUP_GROUP = {
  chest: 'chest', chest_upper: 'chest', chest_lower: 'chest',
  lats: 'back', upper_back: 'back', traps: 'back',
  shoulders_front: 'shoulders', shoulders_side: 'shoulders', shoulders_rear: 'shoulders',
  quads: 'legs', hamstrings: 'legs', glutes: 'legs', glutes_med: 'legs',
  calves: 'legs', adductors: 'legs',
  biceps: 'arms', triceps: 'arms', forearms: 'arms',
  abs: 'core', obliques: 'core', lower_back: 'core'
};
