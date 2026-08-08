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

// 코치 기억 노트 카테고리 (묶음3)
var MEMORY_CATEGORIES = ['injury', 'preference', 'goal', 'schedule', 'other'];
var MEMORY_CATEGORY_META = {
  // 화면에는 한국어 라벨만 쓴다(장식 이모지 금지 — 앱은 SVG 아이콘 세트를 쓴다).
  injury: { kr: '부상·제약' },
  preference: { kr: '선호' },
  goal: { kr: '목표' },
  schedule: { kr: '일정' },
  other: { kr: '기타' }
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
      { name: '덤벨 사이드 레터럴 레이즈', type: '덤벨', sets: 3, reps: '12-15', lastWeight: 8 },
      { name: '머신 펙 덱 플라이', type: '머신', sets: 3, reps: '12-15', lastWeight: 35 },
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
      { name: '페이스 풀', type: '케이블', sets: 3, reps: '12-15', lastWeight: 20 },
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
      { name: '머신 레그 익스텐션', type: '머신', sets: 3, reps: '12-15', lastWeight: 45 },
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
      { name: '덤벨 사이드 레터럴 레이즈', type: '덤벨', sets: 3, reps: '12-15', lastWeight: 8 },
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
  '케이블 원 암 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'cable' },
  '리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false, mainEligible: false, equipment: 'rear_pec_deck' },
  '원암 리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: [], compound: false, mainEligible: false, equipment: 'rear_pec_deck' },
  '페이스 풀': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false, mainEligible: false, equipment: 'cable' },
  '스미스 머신 오버헤드 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: true, equipment: 'smith' },
  
  // 삼두 (triceps)
  '케이블 푸시 다운': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
  '트라이셉스 푸시다운': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
  '케이블 오버헤드 트라이셉스 익스텐션': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'cable' },
  '케이블 트라이셉스 킥백': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, equipment: 'cable' },
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
  '원 암 케이블 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false, stretched: true, equipment: 'cable' },
  '해머 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false, equipment: 'hammer_row' },
  '스미스 머신 슈러그': { primary: 'traps', secondary: [], compound: false, mainEligible: false, equipment: 'smith' },
  
  // 이두 (biceps)
  '바벨 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false, equipment: 'barbell' },
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
  '덤벨 불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'dumbbell' },
  '불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'bodyweight' },
  '덤벨 싱글 레그 데드리프트': { primary: 'hamstrings', secondary: ['glutes'], compound: true, mainEligible: true, stretched: true, equipment: 'dumbbell' },
  '런지': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true, equipment: 'bodyweight' },
  '와이드 스탠스 레그 프레스': { primary: 'adductors', secondary: ['glutes', 'quads'], compound: true, mainEligible: false, stretched: true, equipment: 'leg_press' },
  '케이블 풀 스루': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: false, stretched: true, equipment: 'cable' },
  
  // 종아리
  '카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'bodyweight' },
  '시티드 카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true, equipment: 'calf_machine' },
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
  '행잉 니 레이즈': { primary: 'abs', secondary: ['obliques'], compound: false, mainEligible: false, stretched: true, equipment: 'assist_machine' },
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
  compound_heavy:    { repMin: 5,  repMax: 8,  doubleSessions: 2, kr: '고중량 복합', scheme: 'top_backoff', restSec: 180 },
  compound_moderate: { repMin: 8,  repMax: 12, doubleSessions: 1, kr: '중강도 복합', scheme: 'straight',    restSec: 150 },
  isolation:         { repMin: 12, repMax: 15, doubleSessions: 1, kr: '고립',        scheme: 'straight',    restSec: 120 },
  light_isolation:   { repMin: 15, repMax: 25, doubleSessions: 2, kr: '경량 고립',   scheme: 'straight',    restSec: 90  },
  rehab:             { repMin: 15, repMax: 20, doubleSessions: 0, kr: '재활',        scheme: 'straight',    restSec: 60, lockScheme: true }
};

// ─── 세트법(세트 스킴) ────────────────────────────────────────
// 근거 요약(docs/research/set-schemes.md §0·§1-G): 볼륨을 맞추면 세트법 간 근비대 차이는 없다
// (Angleri 2017 CSA +7.6/+7.5/+7.8%, Sødal 2023 메타 SMD 0.155 p=0.392).
// 그래서 "더 좋은 세트법"이 아니라 "문제에 맞는 세트법"을 배정한다:
//  · top_backoff = 고중량에서 뒤 세트 반복 붕괴로 잃는 볼륨 로드를 감량으로 보존 (근거 낮음 — 실무 합의)
//  · drop / myo  = 근비대는 동등하고 이득은 오직 시간(1/2~1/3). 그래서 조건부 "제안"으로만 쓴다.
var SET_SCHEMES = {
  straight:    { kr: '스트레이트',    short: '스트레이트', desc: '모든 세트를 같은 무게·횟수로' },
  top_backoff: { kr: '탑세트 + 백오프', short: '탑+백오프',  desc: '가장 무거운 1세트 → 90% 무게로 2세트' },
  drop:        { kr: '드롭세트',      short: '드롭',      desc: '마지막 세트에서 무게를 25%씩 낮춰 이어서' },
  myo_reps:    { kr: '마이오렙',      short: '마이오렙',   desc: '마지막 세트 후 20초 쉬고 미니세트 반복' }
};

// 세트 역할 → 화면 뱃지. 값이 없으면(옛 세션 복원 등) 뱃지를 그리지 않는다.
var SET_ROLE_KR = {
  warmup:  '워밍업',
  top:     '탑세트',
  backoff: '백오프',
  work:    '',
  drop:    '드롭',
  myo:     '미니'
};

// 백오프·드롭 감량 비율, 자가조절 규칙 상수 (§2-B 규칙②④ / §3-B / §3-C)
var BACKOFF_PCT = 0.90;         // 탑세트의 90% — 실무 권장 −5~15%의 중앙값이자 5kg 격자에 깔끔히 떨어짐
var DROP_PCT = 0.75;            // 드롭마다 −25% — Angleri 2017 DS 프로토콜(~50~75% 1RM 구간)을 2회 드롭으로 재현
var REST_WARMUP_SEC = 45;       // 워밍업은 피로를 유발하지 않는 세트
var REST_DROP_SEC = 10;         // 드롭 사이 = 무게 바꾸는 시간뿐(정의상 무휴식)
var REST_MYO_SEC = 20;          // 마이오렙 미니세트 사이(원 프로토콜 = 깊은 호흡 3~5회)
var REST_AUTOREG_BONUS_SEC = 30;// §3-C 자가조절: 직전 세트가 목표 하단 미달이면 +30초
var REST_MAX_SEC = 240;         // 자가조절 상한

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
  // 지정하지 않으면 '고중량 복합'(5~8회)으로 잡혀, SESSIONS PUSH/UPPER 템플릿이 적어 둔
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

// ─── 종목 안전 태그 (부상 대조) ─────────────────────────────
// 부상 부위 5종. 기억 노트(injury 카테고리)의 자유 텍스트와 keywords로 대조해
// 사용자의 현재 부상 부위를 찾는다. (부상 등록 UI는 따로 없음 — 기억 노트가 원천)
var INJURY_AREAS = {
  lower_back: { kr: '허리',   keywords: ['허리', '요추', '디스크', '좌골', '척추', '기립근'] },
  shoulder:   { kr: '어깨',   keywords: ['어깨', '회전근개', '충돌증후군', '견관절', '오십견'] },
  knee:       { kr: '무릎',   keywords: ['무릎', '슬개', '반월', '십자인대'] },
  wrist:      { kr: '손목',   keywords: ['손목', '수근관'] },
  elbow:      { kr: '팔꿈치', keywords: ['팔꿈치', '팔꿉', '엘보', '주관절'] }
};

// 종목별 안전 정보. contra=금기(부상 시 제외), caution=주의(수정하면 가능),
// rehab=그 부위 재활에 도움, sub=부위별 대체 종목, mod=부위별 수정 방법.
// 값은 INJURY_AREAS 키. 태그 없는 종목은 아예 항목이 없다(=모든 부상에 무난).
var EXERCISE_SAFETY = {
  '덤벨 로우': {
    caution: ['lower_back'],
    sub: { lower_back: '랫 풀 다운' },
    mod: { lower_back: '벤치에 손과 무릎을 확실히 지지하고 중립 척추로 반동 없이 수행하면 가능하다.' },
    why: { lower_back: '한 손·한 무릎을 벤치에 지지하면 요추 부하가 적지만, 지지 없이 하거나 반동을 쓰면 굴곡·회전 스트레스가 생긴다.' }
  },
  '덤벨 루마니안 데드리프트': {
    caution: ['lower_back', 'wrist', 'elbow'],
    sub: { lower_back: '시티드 레그 컬', wrist: '시티드 레그 컬', elbow: '라잉 레그 컬' },
    mod: { lower_back: '가벼운 덤벨로 무릎 높이까지만 내리고 중립 척추를 유지하면 가능하다.', wrist: '스트랩을 사용하거나 무게를 낮춰 악력 부담을 줄인다.', elbow: '스트랩을 사용해 악력 부하를 줄이고 통증 없는 중량으로 제한한다.' },
    why: { lower_back: '힙 힌지 자체는 요추 굴곡 모멘트를 만들지만 덤벨 경량으로는 관리 가능한 수준이다.', wrist: '무거운 덤벨을 지속적으로 쥐고 있어 손목·굴곡건에 부담이 된다.', elbow: '고중량 덤벨을 정적으로 쥐는 악력 부하가 상과 힘줄 기시부를 자극한다.' }
  },
  '덤벨 벤치 프레스': {
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '머신 체스트 프레스', wrist: '머신 체스트 프레스' },
    mod: { shoulder: '중립 그립으로 잡고 팔꿈치가 몸통 높이 아래로 내려가지 않게 가동범위를 제한한다.', wrist: '손목을 전완 바로 위에 수직으로 세워(중립) 무게를 낮추고 필요시 손목 보호대를 착용한다.' },
    why: { shoulder: '바닥 구간에서 어깨가 수평 외전·신전되며 전방 관절낭과 회전근개에 부하가 집중된다.', wrist: '프레스 시 손목이 신전된 채 축성 부하를 받기 쉽다.' }
  },
  '덤벨 불가리안 스플릿 스쿼트': {
    caution: ['knee'],
    sub: { knee: '레그 프레스' },
    mod: { knee: '보폭을 넓혀 앞정강이를 수직에 가깝게 유지하고 얕은 깊이·가벼운 중량으로, 필요 시 지지대를 잡고 수행한다.' },
    why: { knee: '한쪽 무릎에 체중과 부하가 집중되고 균형 요구가 커 슬개대퇴 압박·외반 스트레스가 크지만, 정강이 수직 유지와 얕은 깊이로 부하를 크게 낮출 수 있다.' }
  },
  '덤벨 사이드 레터럴 레이즈': {
    caution: ['shoulder'],
    mod: { shoulder: '엄지가 위를 향하게(약간 외회전) 견갑면(정면에서 약 30도 앞)에서 어깨 높이 이하로만 든다.' },
    why: { shoulder: '내회전 상태로 어깨 높이 이상 외전하면 극상근 힘줄이 견봉 아래에서 눌리는 전형적 충돌 자세가 된다.' }
  },
  '덤벨 숄더 프레스': {
    caution: ['lower_back', 'shoulder', 'wrist'],
    sub: { lower_back: '머신 시티드 숄더 프레스', shoulder: '덤벨 사이드 레터럴 레이즈', wrist: '머신 시티드 숄더 프레스' },
    mod: { lower_back: '등받이 있는 벤치에 앉아 허리를 등받이에 붙이고 수행하면 가능하다.', shoulder: '중립 그립으로 귀 높이까지만 내리는 부분 가동범위와 가벼운 무게로 수행한다.', wrist: '중립 그립(손바닥 마주보기)으로 바꾸고 무게를 낮춘다.' },
    why: { lower_back: '서거나 등받이 없이 머리 위로 밀면 요추가 과신전되며 축성 부하가 집중된다.', shoulder: '머리 위로 미는 동작은 견봉하 공간이 좁아지는 각도를 통과해 충돌·회전근개 자극 위험이 있다.', wrist: '머리 위 프레스에서 손목이 신전된 채 부하를 지지한다.' }
  },
  '덤벨 슈러그': {
    caution: ['wrist'],
    mod: { wrist: '스트랩을 사용해 악력 의존을 줄이고 중량을 낮춘다.' },
    why: { wrist: '무거운 덤벨을 정적으로 오래 쥐고 있어 굴곡건과 수근관에 지속적 압박이 걸린다.' }
  },
  '덤벨 싱글 레그 데드리프트': {
    caution: ['lower_back'],
    sub: { lower_back: '시티드 레그 컬' },
    mod: { lower_back: '맨몸 또는 아주 가벼운 덤벨로 가동범위를 줄이고 중립 척추를 유지하면 가능하다.' },
    why: { lower_back: '편측 힌지 동작이라 부하는 가볍지만 균형이 무너지면 요추 굴곡·회전이 발생할 수 있다.' }
  },
  '덤벨 아놀드 프레스': {
    contra: ['shoulder'],
    caution: ['lower_back', 'wrist'],
    sub: { lower_back: '머신 시티드 숄더 프레스', shoulder: '덤벨 숄더 프레스', wrist: '머신 시티드 숄더 프레스' },
    mod: { lower_back: '등받이 있는 벤치에 앉아 허리를 등받이에 붙이고 수행하면 가능하다.', wrist: '회전 동작을 생략하고 중립 그립 프레스로 수행한다.' },
    why: { lower_back: '오버헤드 프레스 계열로 지지 없이 하면 요추 과신전과 축성 부하가 발생한다.', shoulder: '외전 상태에서 내회전-외회전을 오가는 회전 동작이 견봉하 공간을 좁혀 충돌증후군을 직접 유발한다.', wrist: '부하 상태에서 손목·전완의 회전이 더해져 일반 프레스보다 손목 스트레스가 크다.' }
  },
  '덤벨 인클라인 벤치 프레스': {
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '머신 체스트 프레스', wrist: '머신 체스트 프레스' },
    mod: { shoulder: '중립 그립과 팔꿈치가 몸통 아래로 내려가지 않는 부분 가동범위로 수행한다.', wrist: '중립에 가까운 그립으로 손목을 전완 위에 수직으로 쌓고 무게를 줄인다.' },
    why: { shoulder: '인클라인 각도에서 어깨 굴곡이 커져 견봉하 공간 부하가 평벤치보다 늘어난다.', wrist: '인클라인 각도에서도 손목 신전 상태로 축성 부하가 걸린다.' }
  },
  '덤벨 인클라인 플라이': {
    caution: ['shoulder'],
    sub: { shoulder: '머신 펙 덱 플라이' },
    mod: { shoulder: '팔꿈치를 약간 굽힌 채 어깨가 몸통 라인 뒤로 넘어가지 않는 깊이까지만 내리고 무게를 크게 낮춘다.' },
    why: { shoulder: '바닥 구간에서 어깨가 수평 외전 끝범위까지 열려 전방 관절낭과 회전근개에 부하가 집중되는, 가슴 종목 중 어깨 신장 스트레스가 가장 큰 패턴이다.' }
  },
  '덤벨 프리처 컬': {
    caution: ['elbow'],
    sub: { elbow: '덤벨 해머 컬' },
    mod: { elbow: '하단에서 완전 신전 전에 멈추는 부분 가동범위로 가벼운 무게만 사용한다.' },
    why: { elbow: '패드가 상완을 고정한 채 팔꿈치 완전 신전 부근에서 굴곡근 힘줄에 최대 인장 스트레스가 걸리는 구간이 생긴다.' }
  },
  '덤벨 플라이': {
    caution: ['shoulder'],
    sub: { shoulder: '케이블 플라이' },
    mod: { shoulder: '팔꿈치를 더 굽히고 상완이 몸통 평면 아래로 내려가는 깊은 스트레치를 피한다.' },
    why: { shoulder: '바닥의 깊은 스트레치 구간에서 어깨 전방 구조물에 큰 신장성 부하가 걸린다.' }
  },
  '덤벨 해머 컬': {
    rehab: ['wrist'],
    why: { wrist: '중립 그립으로 손목 스트레스 없이 전완 근육을 강화해 손목 안정성 회복에 도움이 된다.' }
  },
  '데드리프트': {
    contra: ['lower_back'],
    caution: ['wrist', 'elbow'],
    sub: { lower_back: '시티드 레그 컬', wrist: '시티드 레그 컬', elbow: '라잉 레그 컬' },
    mod: { wrist: '스트랩을 사용해 악력 의존을 줄이고 중량을 낮춘다.', elbow: '스트랩을 사용해 악력 부하를 줄이고 통증 없는 중량으로 제한한다.' },
    why: { lower_back: '바닥에서 고중량을 당기는 동작은 요추 굴곡 노출이 가장 크고, 부하 상태의 반복 굴곡은 수핵을 후외측(신경근 방향)으로 밀어내는 디스크 탈출 기전 그 자체다(Callaghan & McGill 2001, Tampier 2007). 폼이 무너지는 순간을 앱이 감지할 수 없어 기본 차단하며, 햄스트링 볼륨은 척추 부하 없이 근비대 근거가 가장 강한 시티드 레그 컬로 대체한다(Maeo 2021).', wrist: '최대급 중량을 악력으로 지지해 손목·굴곡건 부하가 매우 크고 수근관 증상을 악화시킬 수 있다.', elbow: '고중량 정적 악력이 손목 굴곡근·신전근의 상과 기시부를 강하게 자극하는 대표적 그립 고부하 종목이다.' }
  },
  '딥스': {
    contra: ['shoulder', 'wrist', 'elbow'],
    sub: { shoulder: '케이블 크로스오버', wrist: '케이블 크로스오버', elbow: '케이블 크로스오버' },
    why: { shoulder: '몸이 내려갈 때 어깨가 깊은 신전·과도한 스트레치 자세로 들어가 전방 관절낭과 회전근개에 큰 전단력이 걸린다.', wrist: '체중 전체가 지지 자세의 손목에 축성 압박으로 실려 손목 염좌·수근관 증상에 고위험 부하를 강제한다.', elbow: '깊은 팔꿈치 굴곡 상태에서 체중 전체가 실려 팔꿈치 관절과 삼두 힘줄 부착부에 큰 압박·인장 스트레스를 강제한다.' }
  },
  '라잉 레그 컬': {
    rehab: ['knee'],
    why: { knee: '햄스트링 강화는 경골 전방 전위를 억제해 무릎(특히 전방십자인대) 안정성에 기여하며 관절 압박이 적다.' }
  },
  '러시안 트위스트': {
    contra: ['lower_back'],
    sub: { lower_back: '케이블 팔로프 프레스' },
    why: { lower_back: '굴곡된 요추를 반복해서 비트는 조합은 섬유륜에 원주형 균열을 만들고, 그 균열은 나중에 허리를 펴는 회복 동작조차 듣지 않게 만든다(Marshall & McGill 2010). 이 손상 기전은 부하 크기가 아니라 "굴곡+회전" 동작 자체에서 나오므로 무게를 빼도 사라지지 않는다 — 그래서 수정(caution)이 아니라 금기다. 회전 근력이 필요하면 척추를 중립으로 고정한 채 회전에 버티는 항회전 종목(케이블 팔로프 프레스)으로 대체한다.' }
  },
  '런지': {
    caution: ['knee'],
    sub: { knee: '레그 프레스' },
    mod: { knee: '리버스 런지로 바꾸고 보폭을 충분히 확보해 무릎이 발끝을 넘지 않게 한다.' },
    why: { knee: '전방 런지는 앞무릎의 전단력과 슬개대퇴 압박이 크다.' }
  },
  '레그 익스텐션': {
    caution: ['knee'],
    sub: { knee: '터미널 니 익스텐션' },
    mod: { knee: '가동범위를 90~45도 구간으로 제한하고 가벼운 무게로 수행한다.' },
    why: { knee: '열린사슬 말단 신전 구간(30~0도)에서 슬개대퇴 스트레스와 전방십자인대 긴장이 가장 크다.' }
  },
  '레그 프레스': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '머신 레그 익스텐션' },
    mod: { lower_back: '엉덩이가 시트에서 뜨지 않는 범위로 가동범위를 제한하고 무게를 낮추면 가능하다.', knee: '무릎 굴곡을 90도 이내로 제한하고 발판 위쪽에 발을 두어 통증 없는 중량으로 수행한다.' },
    why: { lower_back: '깊은 굴곡 구간에서 골반이 시트에서 말려 올라가며 요추 굴곡에 큰 압박이 실릴 수 있다.', knee: '깊은 굴곡과 고중량에서 슬개대퇴·반월판 압박이 크게 증가한다.' }
  },
  '루마니안 데드리프트': {
    caution: ['lower_back', 'wrist', 'elbow'],
    sub: { lower_back: '시티드 레그 컬', wrist: '햄스트링 컬', elbow: '라잉 레그 컬' },
    mod: { lower_back: '바를 다리에 붙이고 허리가 말리기 직전(무릎~정강이 중간 높이)에서 멈추며, 통증 없는 중량으로 낮춰 힙 힌지를 연습하듯 수행하면 가능하다. 다리로 뻗치는 통증이 있는 날은 하지 않는다.', wrist: '스트랩을 사용하고 중량을 낮춘다.', elbow: '스트랩을 사용해 악력 부하를 줄이고 통증 없는 중량으로 제한한다.' },
    why: { lower_back: '요추를 고정한 채 고관절만 접는 힙 힌지는 디스크 손상 기전인 "부하 상태의 반복 요추 굴곡"을 피하려고 쓰는 기술이라 요통 재활에서도 가르치는 패턴이다(McGill). 다만 같은 무게라면 요추 모멘트가 데드리프트보다 낮다는 근거는 없다 — 안전은 자세·가동범위·무게에서 나온다(같은 20kg도 몸에 붙여 들면 디스크 내압 52% 감소 — Wilke 1999).', wrist: '고중량을 쥔 채 유지하는 자세로 손목·악력 부하가 크다.', elbow: '고중량 바를 정적으로 쥐는 악력 부하가 상과 힘줄 기시부를 자극한다.' }
  },
  '리버스 그립 랫 풀 다운': {
    caution: ['elbow'],
    sub: { elbow: '랫 풀 다운' },
    mod: { elbow: '무게를 낮추고 통증이 없으면 유지하되 불편하면 중립·회내 그립으로 바꾼다.' },
    why: { elbow: '고정된 회외 그립이 내측 상과 굴곡근 기시부에 스트레스를 주지만 부하 조절이 가능해 관리 여지가 있다.' }
  },
  '리버스 브이 스쿼트': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '머신 레그 익스텐션', knee: '레그 프레스' },
    mod: { lower_back: '가동범위를 줄이고 무게를 낮춰 골반 후방경사 없이 수행하면 가능하다.', knee: '가동범위를 얕게 제한하고 가벼운 중량으로 수행한다.' },
    why: { lower_back: '등 지지가 있으나 머신 축을 따라 요추에 압박 부하가 전달된다.', knee: '머신 각도 특성상 무릎 굴곡이 깊어지면 슬개대퇴 압박이 커진다.' }
  },
  '리버스 펙 덱 플라이': {
    rehab: ['shoulder'],
    why: { shoulder: '후면 삼각근과 견갑 안정근을 저부하로 강화해 어깨 전후 근력 균형과 자세 회복에 도움이 된다.' }
  },
  '머신 라잉 레그 컬': {
    rehab: ['knee'],
    why: { knee: '햄스트링 강화는 경골 전방 전위를 억제해 무릎(특히 전방십자인대) 안정성에 기여하며 관절 압박이 적다.' }
  },
  '머신 레그 익스텐션': {
    caution: ['knee'],
    sub: { knee: '터미널 니 익스텐션' },
    mod: { knee: '가동범위를 90~45도 구간으로 제한하고 가벼운 무게로 수행한다.' },
    why: { knee: '열린사슬 말단 신전 구간(30~0도)에서 슬개대퇴 스트레스와 전방십자인대 긴장이 가장 크다.' }
  },
  '머신 시티드 숄더 프레스': {
    caution: ['shoulder'],
    sub: { shoulder: '덤벨 사이드 레터럴 레이즈' },
    mod: { shoulder: '시트를 낮춰 시작점을 귀 높이 이상으로 올리고 통증 없는 부분 가동범위·가벼운 무게로 한다.' },
    why: { shoulder: '오버헤드 프레스 궤적이 견봉하 충돌 각도를 통과하고 머신 고정 궤적이 견갑 움직임을 제한한다.' }
  },
  '머신 시티드 크런치': {
    caution: ['lower_back'],
    sub: { lower_back: '플랭크' },
    mod: { lower_back: '가장 가벼운 중량으로 요추가 말리지 않고 가슴만 살짝 굽는 얕은 범위까지만, 세트당 반복도 짧게 끊어 수행한다. 허리 당김이나 다리 저림이 오면 즉시 중단한다.' },
    why: { lower_back: '외부 중량을 얹은 반복적 요추 굴곡은 디스크 후방 압출 기전을 그대로 재현하는 부하 패턴이다. 손상 동인이 압박 크기보다 반복 굴곡 동작 자체라(Callaghan & McGill 2001) 무게를 줄이는 것만으로는 부족하고 가동범위와 총 반복 수를 함께 줄여야 한다.' }
  },
  '머신 체스트 프레스': {
    caution: ['shoulder'],
    mod: { shoulder: '시트와 손잡이를 조절해 팔꿈치가 어깨보다 낮은 높이에서 움직이게 하고 통증 없는 범위로만 민다.' },
    why: { shoulder: '수평 프레스 바닥 구간에서 어깨 전면에 부하가 걸리지만 머신 특성상 범위·부하 조절이 쉽다.' }
  },
  '머신 펙 덱 플라이': {
    caution: ['shoulder'],
    sub: { shoulder: '케이블 플라이' },
    mod: { shoulder: '가동범위 제한 장치로 시작점을 몸통 평면 앞으로 설정하고 가벼운 무게로 한다.' },
    why: { shoulder: '팔이 몸통 평면 뒤로 넘어가는 수평 외전 끝범위에서 전방 관절낭이 과신장된다.' }
  },
  '머신 힙 쓰러스트': {
    rehab: ['knee'],
    why: { knee: '무릎 관절 부하가 거의 없이 둔근을 강화해 하지 정렬과 무릎 안정성에 기여한다.' }
  },
  '머신 힙 어브덕션': {
    rehab: ['knee'],
    why: { knee: '고관절 외전근 강화는 무릎 외반 제어를 도와 슬개대퇴 통증 재활의 핵심 요소다.' }
  },
  '바벨 로우': {
    caution: ['lower_back', 'wrist'],
    sub: { lower_back: '머신 시티드 로우', wrist: '머신 시티드 로우' },
    mod: { lower_back: '가슴 지지 벤치(체스트 서포티드)로 바꾸거나, 상체를 45도 정도만 숙인 각도에서 중립 척추를 유지한 채 반동 없이 통증 없는 중량으로 수행하면 가능하다.', wrist: '스트랩을 사용해 악력 의존을 줄이고 중량을 낮춘다.' },
    why: { lower_back: '상체를 숙인 자세를 세트 내내 유지하며 중량을 당기므로 요추에 지속적인 전단력과 등척성 신전 부하가 걸린다(로우 계열 중 요추 압박이 가장 큰 편 — Fenwick 2009). 다만 가슴 지지·상체 각도·중량으로 이 부하는 크게 줄일 수 있다.', wrist: '고중량 바벨을 악력으로 지지한 채 반복 당기기를 수행해 데드리프트 계열과 동일하게 손목·굴곡건 부하가 크다.' }
  },
  '바벨 루마니안 데드리프트': {
    caution: ['lower_back', 'wrist', 'elbow'],
    sub: { lower_back: '시티드 레그 컬', wrist: '라잉 레그 컬', elbow: '라잉 레그 컬' },
    mod: { lower_back: '바를 다리에 붙이고 허리가 말리기 직전(무릎~정강이 중간 높이)에서 멈추며, 통증 없는 중량으로 낮춰 힙 힌지를 연습하듯 수행하면 가능하다. 다리로 뻗치는 통증이 있는 날은 하지 않는다.', wrist: '스트랩을 사용하고 중량을 낮춘다.', elbow: '스트랩을 사용해 악력 부하를 줄이고 통증 없는 중량으로 제한한다.' },
    why: { lower_back: '요추를 고정한 채 고관절만 접는 힙 힌지는 디스크 손상 기전인 "부하 상태의 반복 요추 굴곡"을 피하려고 쓰는 기술이라 요통 재활에서도 가르치는 패턴이다(McGill). 다만 같은 무게라면 요추 모멘트가 데드리프트보다 낮다는 근거는 없다 — 안전은 자세·가동범위·무게에서 나온다(같은 20kg도 몸에 붙여 들면 디스크 내압 52% 감소 — Wilke 1999).', wrist: '고중량 바벨을 오래 쥐고 있어 손목·악력에 지속적 부하가 걸린다.', elbow: '고중량 바를 정적으로 쥐는 악력 부하가 상과 힘줄 기시부를 자극한다.' }
  },
  '바벨 스쿼트': {
    contra: ['lower_back'],
    caution: ['shoulder', 'knee', 'wrist'],
    sub: { lower_back: '핵 스쿼트', shoulder: '레그 프레스', knee: '레그 프레스', wrist: '레그 프레스' },
    mod: { shoulder: '그립 폭을 넓게 잡아 어깨 외회전 요구를 줄이고 통증이 있으면 머신 스쿼트나 레그 프레스로 바꾼다.', knee: '통증 없는 깊이(하프~파라렐)로 제한하고 중량을 크게 낮춰 수행한다.', wrist: '그립을 넓혀 손목을 중립으로 유지하고 손은 바를 받치기만 한다(필요시 스미스 머신 활용).' },
    why: { lower_back: '등에 얹은 바벨이 요추에 축성 압박을 그대로 싣는다 — 하프 스쿼트 중강도에서도 L3-L4 압박이 체중의 6~10배로 측정됐다(Cappozzo 1985). 대체인 핵 스쿼트는 등판이 몸통 굴곡 모멘트를 없애 기립근 요구를 낮추고(Clark 2019), 머신으로 바꿔도 근비대 손실은 없다(Haugen 2023 메타분석).', shoulder: '바를 받치는 랙 자세가 어깨의 끝범위 외회전·외전을 강제해 회전근개 손상 시 통증을 유발한다.', knee: '깊은 무릎 굴곡에서 슬개대퇴 관절과 반월판 압박이 급증한다.', wrist: '바를 지지하는 손목이 부하 아래에서 신전 위치로 꺾이기 쉽다.' }
  },
  '바벨 인클라인 벤치 프레스': {
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '해머 인클라인 체스트 프레스', wrist: '해머 인클라인 체스트 프레스' },
    mod: { shoulder: '바가 가슴에 닿기 전에 멈추는 부분 가동범위와 가벼운 무게로 하고, 견갑이 자유로운 덤벨이나 좌우 독립 암 머신으로 바꾸는 것을 우선 고려한다.', wrist: '바를 손바닥 아래쪽(손꿈치)에 얹어 손목을 전완 위에 수직으로 세우고 손목 보호대와 함께 무게를 낮춘다.' },
    why: { shoulder: '인클라인 각도에서 어깨 굴곡이 커지고 고정된 바 궤적이 견갑의 자연스러운 움직임을 제한해 견봉하 공간 부하가 커진다.', wrist: '고정 바를 쥔 채 축성 부하를 받아 손목이 신전 위치로 꺾이기 쉽다.' }
  },
  '바벨 컬': {
    contra: ['wrist', 'elbow'],
    sub: { wrist: '덤벨 해머 컬', elbow: '덤벨 해머 컬' },
    why: { wrist: '일자 바가 손목을 완전 회외 위치에 고정해 굴곡건과 손목 관절에 비틀림 스트레스를 피할 수 없게 강제한다.', elbow: '곧은 바의 고정된 완전 회외 그립이 내측 상과의 굴곡근·회내근 기시부에 비틀림 스트레스를 강제해 골프 엘보를 직접 자극한다.' }
  },
  '바벨 힙 쓰러스트': {
    caution: ['lower_back'],
    rehab: ['knee'],
    sub: { lower_back: '머신 힙 쓰러스트' },
    mod: { lower_back: '무게를 낮추고 턱을 당겨 늑골을 내린 채 골반 후방경사로 락아웃해 요추 과신전 없이 수행하면 가능하다.' },
    why: { lower_back: '골반에 얹은 고중량 바벨을 밀어 올리는 락아웃 구간에서 골반 대신 요추가 과신전되기 쉬워 후관절·디스크에 신전 스트레스가 걸린다.', knee: '무릎 관절 부하가 거의 없이 둔근을 강화해 하지 정렬과 무릎 안정성에 기여한다.' }
  },
  '밴드 외회전': {
    rehab: ['shoulder'],
    why: { shoulder: '극하근·소원근 등 회전근개를 저부하로 직접 강화하는 표준 어깨 재활 운동이다.' }
  },
  '불가리안 스플릿 스쿼트': {
    caution: ['knee'],
    sub: { knee: '레그 프레스' },
    mod: { knee: '보폭을 넓혀 앞정강이를 수직에 가깝게 유지하고 얕은 깊이·가벼운 중량으로, 필요 시 지지대를 잡고 수행한다.' },
    why: { knee: '한쪽 무릎에 체중과 부하가 집중되고 균형 요구가 커 슬개대퇴 압박·외반 스트레스가 크지만, 정강이 수직 유지와 얕은 깊이로 부하를 크게 낮출 수 있다.' }
  },
  '브이 스쿼트': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '머신 레그 익스텐션', knee: '레그 프레스' },
    mod: { lower_back: '골반이 말리지 않는 깊이까지만, 중간 무게로 수행하면 가능하다.', knee: '발을 발판 위쪽에 두고 얕은 깊이·가벼운 중량으로 수행한다.' },
    why: { lower_back: '패드가 상체를 지지해 몸통 굴곡 모멘트는 작지만, 깊은 하강에서 골반이 말리면 요추 굴곡+압박이 생긴다.', knee: '머신 축이 무릎의 전방 이동을 키워 슬개대퇴 압박이 커진다.' }
  },
  '사이드 레터럴 레이즈': {
    caution: ['shoulder'],
    mod: { shoulder: '엄지가 위를 향하게(약간 외회전) 견갑면(정면에서 약 30도 앞)에서 어깨 높이 이하로만 든다.' },
    why: { shoulder: '내회전 상태로 어깨 높이 이상 외전하면 극상근 힘줄이 견봉 아래에서 눌리는 전형적 충돌 자세가 된다.' }
  },
  '숄더 프레스 머신': {
    caution: ['shoulder'],
    sub: { shoulder: '덤벨 사이드 레터럴 레이즈' },
    mod: { shoulder: '시트를 낮춰 시작점을 귀 높이 이상으로 올리고 통증 없는 부분 가동범위·가벼운 무게로 한다.' },
    why: { shoulder: '오버헤드 프레스 궤적이 견봉하 충돌 각도를 통과하고 머신 고정 궤적이 견갑 움직임을 제한한다.' }
  },
  '스미스 머신 스쿼트': {
    caution: ['lower_back', 'shoulder', 'knee'],
    sub: { lower_back: '머신 레그 익스텐션', shoulder: '레그 프레스', knee: '레그 프레스' },
    mod: { lower_back: '발을 앞에 두고 얕은 깊이·가벼운 무게로 몸통을 세워 수행하면 요추 부하를 크게 줄일 수 있다.', shoulder: '그립 폭을 넓게 잡아 어깨 외회전 요구를 줄이고 통증이 있으면 레그 프레스로 바꾼다.', knee: '발을 약간 앞쪽에 두어 무릎 전방 이동을 줄이고 깊이를 파라렐 이내로 제한한다.' },
    why: { lower_back: '궤도가 고정돼 있어도 어깨에 얹은 중량이 요추 축성 압박을 만든다.', shoulder: '바벨 스쿼트와 동일하게 바를 받치는 랙 자세가 어깨 끝범위 외회전·외전을 강제해 손상된 회전근개에 통증을 유발한다.', knee: '고정 궤도에서 무릎 굴곡이 깊어지면 슬개대퇴 압박·전단 부하가 커진다.' }
  },
  '스미스 머신 벤치 프레스': {
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '머신 체스트 프레스', wrist: '머신 체스트 프레스' },
    mod: { shoulder: '바가 가슴에 닿기 전에 멈추는 부분 가동범위로 하고 팔꿈치를 몸통에서 45~75도로 유지한다.', wrist: '바를 손꿈치에 얹어 손목을 중립으로 세우고 무게를 낮춘다.' },
    why: { shoulder: '고정된 수직 궤적이 견갑골의 자연스러운 움직임을 막아 손상된 어깨에 스트레스를 집중시킨다.', wrist: '고정 바 궤적이 손목 각도를 강제해 신전 부하를 스스로 조절하기 어렵다.' }
  },
  '스미스 머신 슈러그': {
    caution: ['lower_back'],
    sub: { lower_back: '케이블 슈러그' },
    mod: { lower_back: '중량을 낮추고 반동 없이 수직으로만 으쓱한다. 서 있는 자세가 부담되면 케이블 슈러그로 바꾼다.' },
    why: { lower_back: '고중량을 손에 든 채 서 있는 자세라 척추 압박이 누적되지만, 굴곡·회전 없이 수직 부하만 걸려 중량 조절로 관리할 수 있다.' }
  },
  '스미스 머신 오버헤드 프레스': {
    caution: ['lower_back', 'shoulder', 'wrist'],
    sub: { lower_back: '머신 시티드 숄더 프레스', shoulder: '덤벨 사이드 레터럴 레이즈', wrist: '머신 시티드 숄더 프레스' },
    mod: { lower_back: '등받이 있는 벤치에 앉아 허리를 등받이에 붙이고 수행하면 가능하다.', shoulder: '고정 궤적을 이용해 통증 없는 구간까지만 내리는 부분 가동범위로 제한하고 무게를 낮춘다.', wrist: '무게를 낮추고 손목을 전완 바로 위에 수직으로 세워 손목 보호대를 착용한다.' },
    why: { lower_back: '서서 하면 갈비뼈가 들리며 요추가 과신전되기 쉽다. 다만 궤도가 고정돼 있어 등받이에 앉으면 부하를 통제하기 쉽다.', shoulder: '오버헤드 궤적이 견봉하 충돌 각도를 통과한다. 대신 궤적이 고정돼 통증 없는 구간에서 정확히 끊기는 프리웨이트보다 쉽다.', wrist: '고정 바를 쥔 채 머리 위로 미는 구조라 손목이 신전 위치에서 축성 부하를 받는다.' }
  },
  '스미스 머신 클로즈 그립 벤치 프레스': {
    contra: ['wrist'],
    caution: ['shoulder', 'elbow'],
    sub: { shoulder: '케이블 푸시 다운', wrist: '케이블 트라이셉스 킥백', elbow: '케이블 푸시 다운' },
    mod: { shoulder: '팔꿈치를 몸통에 붙이고 바가 가슴에 닿기 전에 멈추는 부분 가동범위로 수행한다.', elbow: '무게를 낮추고 팔꿈치를 완전히 잠그기 직전에 멈추는 범위로 수행한다.' },
    why: { shoulder: '좁은 그립이라 어깨 외전은 적지만 바닥 구간의 어깨 신전 부하는 남는다.', wrist: '좁은 그립에서 손목이 강하게 신전된 채 고정 바의 축성 부하를 그대로 받는다 — 바벨 클로즈 그립 벤치와 같은 이유로 수근관 증상에서 회피 대상이다.', elbow: '삼두 주동 프레스라 팔꿈치 신전 부하가 크고, 궤적이 고정돼 통증을 피하는 각도를 만들기 어렵다.' }
  },
  '스미스 인클라인 벤치 프레스': {
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '덤벨 인클라인 벤치 프레스', wrist: '머신 체스트 프레스' },
    mod: { shoulder: '바가 가슴에 닿기 전에 멈추는 부분 가동범위와 가벼운 무게로 하고, 가능하면 견갑이 자유로운 덤벨로 바꾼다.', wrist: '바를 손바닥 아래쪽(손꿈치)에 얹어 손목 중립을 유지하고 손목 보호대와 함께 무게를 낮춘다.' },
    why: { shoulder: '고정된 바 궤적이 견갑골의 자연스러운 움직임을 막아 손상된 어깨에 스트레스를 집중시킨다.', wrist: '고정 바 궤적이 손목 각도를 강제해 신전 부하를 스스로 조절하기 어렵다.' }
  },
  '스탠딩 카프 레이즈': {
    caution: ['lower_back'],
    sub: { lower_back: '레그 프레스 카프 레이즈' },
    mod: { lower_back: '중량을 낮추거나 한 발씩 덤벨을 들고 하는 방식으로 척추 압박을 줄이면 가능하다. 아예 척추 부하를 없애려면 레그 프레스 카프 레이즈로 바꾼다.' },
    why: { lower_back: '어깨 패드형 머신은 중량이 척추를 따라 요추에 축성 압박으로 전달된다.' }
  },
  '시시 스쿼트': {
    contra: ['knee'],
    sub: { knee: '터미널 니 익스텐션' },
    why: { knee: '무릎이 발끝을 크게 넘어가는 극단적 굴곡을 종목 구조상 강제해 슬개대퇴 압박과 전단력이 최대가 되며 수정으로 완화할 수 없다.' }
  },
  '시티드 레그 컬': {
    rehab: ['knee'],
    why: { knee: '햄스트링 강화는 경골 전방 전위를 억제해 무릎(특히 전방십자인대) 안정성에 기여하며 관절 압박이 적다.' }
  },
  '어시스트 딥스': {
    contra: ['shoulder'],
    caution: ['wrist', 'elbow'],
    sub: { shoulder: '케이블 크로스오버', wrist: '케이블 크로스오버', elbow: '케이블 크로스오버' },
    mod: { wrist: '보조 중량을 충분히 높여 손목 부하를 크게 줄이고, 손목을 중립으로 유지하며 통증 없는 범위에서만 수행한다.', elbow: '보조 무게를 충분히 늘려 부하를 크게 줄이고 통증 없는 얕은 깊이까지만 내려간다.' },
    why: { shoulder: '부하를 줄여도 어깨 깊은 신전이라는 고위험 바닥 자세 자체는 동일해 회전근개 손상 시 피해야 한다.', wrist: '지지 구조는 딥스와 같지만 보조 중량으로 손목에 실리는 부하를 크게 줄일 수 있어 절대 금기까지는 아니다.', elbow: '보조가 있어도 깊은 팔꿈치 굴곡에서 관절·삼두 힘줄 부하가 크게 남는다.' }
  },
  '어시스트 풀업': {
    caution: ['shoulder', 'wrist', 'elbow'],
    sub: { shoulder: '랫 풀 다운', wrist: '랫 풀 다운', elbow: '랫 풀 다운' },
    mod: { shoulder: '보조 중량을 충분히 높여 부하를 크게 줄이고 통증 없는 가동범위에서만 당긴다.', wrist: '보조 중량을 높여 매달리는 부하를 줄이고 스트랩으로 악력 의존을 낮춘다.', elbow: '보조 중량을 높여 팔꿈치 굴곡 부하를 줄이고 통증 없는 범위에서만 수행한다.' },
    why: { shoulder: '맨몸 풀업과 같은 오버헤드 자세지만 보조 중량으로 부하를 정량 조절할 수 있어 통증 없는 구간을 찾기 쉽다 — 풀업의 권장 수정법 그 자체다.', wrist: '매달린 손목에 걸리는 견인 부하가 남지만 보조 중량만큼 줄어든다.', elbow: '팔꿈치 굴곡 부하와 악력 요구가 남지만 보조 중량으로 상과 기시부 부담을 낮출 수 있다.' }
  },
  '와이드 그립 랫 풀 다운': {
    caution: ['shoulder'],
    sub: { shoulder: '클로즈 그립 랫 풀 다운' },
    mod: { shoulder: '그립을 어깨너비보다 약간 넓은 정도로 좁히고 바를 쇄골 앞으로만 당긴다. 목 뒤로 당기는 변형은 하지 않는다.' },
    why: { shoulder: '넓은 회내 그립은 시작 자세에서 어깨 외전·내회전을 키워 견봉하 충돌 각도를 통과시킨다. 그립을 좁히거나 중립으로 바꾸면 근비대 손실 없이 부담이 줄어든다.' }
  },
  '와이드 스탠스 레그 프레스': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '힙 어덕션', knee: '힙 어덕션' },
    mod: { lower_back: '엉덩이가 시트에서 뜨기 직전까지만 내리고 무게를 낮추면 가능하다.', knee: '무릎이 발끝 방향을 벗어나 안으로 무너지지 않는 범위로 제한하고 깊이를 줄인다.' },
    why: { lower_back: '내전근을 늘리려 깊게 내리는 종목이라 골반이 시트에서 말려 올라가는 구간에 들어가기 쉽다.', knee: '발을 넓게 벌린 자세에서 깊게 내리면 무릎에 외반 스트레스가 걸릴 수 있다.' }
  },
  '원암 리버스 펙 덱 플라이': {
    rehab: ['shoulder'],
    why: { shoulder: '후면 삼각근과 견갑 안정근을 저부하로 강화해 어깨 전후 근력 균형과 자세 회복에 도움이 된다.' }
  },
  '이지 바 프리처 컬': {
    caution: ['elbow'],
    sub: { elbow: '덤벨 해머 컬' },
    mod: { elbow: '하단에서 완전 신전 전에 멈추는 부분 가동범위로 가벼운 무게만 사용한다.' },
    why: { elbow: '패드가 상완을 고정한 채 팔꿈치 완전 신전 부근에서 굴곡근 힘줄에 최대 인장 스트레스가 걸리는 구간이 생긴다.' }
  },
  '인클라인 덤벨 와이 레이즈': {
    rehab: ['shoulder'],
    why: { shoulder: '하부 승모근과 견갑 상방회전 근육을 강화해 견봉하 공간을 넓히는 충돌증후군 재활의 대표 운동이다.' }
  },
  '인클라인 덤벨 컬': {
    caution: ['shoulder', 'elbow'],
    sub: { shoulder: '덤벨 얼터네이트 컬', elbow: '덤벨 해머 컬' },
    mod: { shoulder: '벤치 등받이를 더 세워 어깨가 뒤로 젖혀지는 각도를 줄인다.', elbow: '하단 완전 신전 구간을 제한하고 손목을 중립에 가깝게 유지하며 가볍게 수행한다.' },
    why: { shoulder: '어깨 신전 상태의 스트레치가 견관절을 지나는 이두 장두 힘줄과 전방 어깨에 부담을 준다.', elbow: '팔이 몸 뒤로 신장된 위치에서 원위 이두·팔꿈치 굴곡근에 긴 근길이 인장 스트레스가 커진다.' }
  },
  '인클라인 덤벨 프레스': {
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '머신 체스트 프레스', wrist: '머신 체스트 프레스' },
    mod: { shoulder: '중립 그립과 팔꿈치가 몸통 아래로 내려가지 않는 부분 가동범위로 수행한다.', wrist: '중립에 가까운 그립으로 손목을 전완 위에 수직으로 쌓고 무게를 줄인다.' },
    why: { shoulder: '인클라인 각도에서 어깨 굴곡이 커져 견봉하 공간 부하가 평벤치보다 늘어난다.', wrist: '인클라인 각도에서도 손목 신전 상태로 축성 부하가 걸린다.' }
  },
  '체스트 프레스 머신': {
    caution: ['shoulder'],
    mod: { shoulder: '시트와 손잡이를 조절해 팔꿈치가 어깨보다 낮은 높이에서 움직이게 하고 통증 없는 범위로만 민다.' },
    why: { shoulder: '수평 프레스 바닥 구간에서 어깨 전면에 부하가 걸리지만 머신 특성상 범위·부하 조절이 쉽다.' }
  },
  '친업': {
    contra: ['elbow'],
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '리버스 그립 랫 풀 다운', wrist: '랫 풀 다운', elbow: '랫 풀 다운' },
    mod: { shoulder: '밴드나 어시스트로 부하를 줄이고 통증 없는 가동범위에서만 당긴다.', wrist: '어시스트 머신이나 밴드로 부하를 줄여 수행한다.' },
    why: { shoulder: '회외 그립이라 부담이 덜하지만 여전히 체중 전체가 오버헤드 자세에 걸려 부하 조절이 어렵다.', wrist: '체중 매달리기로 손목과 굴곡건에 큰 견인 부하가 걸리며 회외 그립이 부담을 더한다.', elbow: '회외 고정 그립으로 체중 전체를 당기며 강한 악력이 동반되어 내측 상과 굴곡근 기시부에 고부하가 걸린다.' }
  },
  '케이블 닐링 사이드 크런치': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '플랭크', knee: '러시안 트위스트' },
    mod: { lower_back: '가벼운 중량으로 가동범위를 절반 이하로 줄여 통증 없는 범위에서만 하면 가능하다.', knee: '무릎 아래 두꺼운 패드를 깔거나 서서 하는 변형으로 수행한다.' },
    why: { lower_back: '부하가 걸린 측방 굴곡은 디스크와 요방형근에 비대칭 압박 스트레스를 만든다.', knee: '무릎 꿇는 자세가 슬개골을 바닥에 직접 압박한다.' }
  },
  '케이블 암 풀 다운': {
    caution: ['shoulder'],
    sub: { shoulder: '덤벨 로우' },
    mod: { shoulder: '시작 높이를 어깨 높이 부근으로 낮춰 오버헤드 끝범위를 피하고 가벼운 무게로 수행한다.' },
    why: { shoulder: '시작 자세가 부하가 걸린 오버헤드 어깨 굴곡 끝범위라 풀오버와 같은 원리로 견봉하 공간과 회전근개를 자극할 수 있다.' }
  },
  '케이블 오버헤드 트라이셉스 익스텐션': {
    contra: ['elbow'],
    caution: ['shoulder'],
    sub: { shoulder: '케이블 푸시 다운', elbow: '케이블 푸시 다운' },
    mod: { shoulder: '가벼운 무게로 통증 없는 범위에서 하고, 아프면 팔을 몸 옆에 두는 푸시다운으로 바꾼다.' },
    why: { shoulder: '팔을 머리 위로 고정한 자세 자체가 어깨 최대 굴곡이라 충돌증후군에서 통증을 유발하기 쉽다.', elbow: '팔꿈치가 최대 굴곡·삼두가 최대 신장된 위치에서 저항을 받아 팔꿈치 힘줄에 인장 스트레스가 가장 큰 삼두 변형이다.' }
  },
  '케이블 원 암 레터럴 레이즈': {
    caution: ['shoulder'],
    mod: { shoulder: '어깨 높이 이하 가동범위에서 엄지를 위로 향하게 하고 가벼운 무게로 수행한다.' },
    why: { shoulder: '외전 동작이라 어깨 높이 이상 올리면 견봉하 충돌 위험이 있는 것은 덤벨 레터럴과 동일하다.' }
  },
  '케이블 컬': {
    caution: ['wrist', 'elbow'],
    sub: { wrist: '덤벨 해머 컬', elbow: '덤벨 해머 컬' },
    mod: { wrist: '로프나 개별 손잡이로 바꿔 손목이 자유롭게 회전할 수 있게 한다.', elbow: '로프나 싱글 핸들로 바꿔 중립에 가까운 그립으로 가벼운 무게만 사용한다.' },
    why: { wrist: '일자 바 사용 시 바벨 컬처럼 손목이 회외 위치에 고정된다.', elbow: '스트레이트 바 어태치먼트 사용 시 바벨 컬과 같은 고정 회외 그립이 내측 상과 굴곡근 기시부를 자극하지만 어태치먼트와 부하를 바꿀 수 있어 관리 가능하다.' }
  },
  '케이블 크런치': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '플랭크', knee: '머신 시티드 크런치' },
    mod: { lower_back: '가장 가벼운 중량으로 요추가 말리지 않고 흉추만 굽는 얕은 범위까지만, 반복도 짧게 끊어 수행한다. 허리 당김이나 다리 저림이 오면 즉시 중단한다.', knee: '무릎 아래 두꺼운 패드를 깔거나 벤치에 앉아서 하는 변형으로 수행한다.' },
    why: { lower_back: '케이블 하중을 얹은 반복적 요추 굴곡이라 머신 크런치와 같은 디스크 후방 압출 기전을 재현한다. 손상 동인이 압박 크기보다 반복 굴곡 동작 자체라(Callaghan & McGill 2001) 무게만 줄여선 부족하고 가동범위와 총 반복 수를 함께 줄여야 한다.', knee: '무릎 꿇는 자세가 슬개골을 바닥에 직접 압박한다.' }
  },
  '케이블 트라이셉스 킥백': {
    caution: ['elbow'],
    sub: { elbow: '케이블 푸시 다운' },
    mod: { elbow: '가벼운 무게로 팔꿈치를 완전히 잠그기 직전에 멈추고 손목을 중립으로 유지한다.' },
    why: { elbow: '팔꿈치 완전 신전 부근에서 저항이 최대가 되어 상과 부위와 삼두 힘줄에 반복적 신전 스트레스를 주지만 부하가 가벼워 조절 가능하다.' }
  },
  '케이블 팔로프 프레스': {
    rehab: ['lower_back'],
    why: { lower_back: '척추를 중립으로 고정한 채 케이블이 만드는 회전 모멘트에 버티는 항회전(anti-rotation) 종목이다. 요추를 실제로 굽히거나 비틀지 않고 코어 강성만 기르므로, 굴곡+회전 조합을 피해야 하는 허리 부상에서 러시안 트위스트를 대신할 표준 대안이다(McGill 계열 요추 안정화).' }
  },
  '케이블 푸시 다운': {
    caution: ['wrist', 'elbow'],
    sub: { wrist: '케이블 트라이셉스 킥백' },
    mod: { wrist: '로프 어태치먼트로 바꿔 중립 그립으로 손목을 곧게 유지한다.', elbow: '로프를 사용해 손목을 중립으로 두고 가벼운 무게로 통증 없는 범위에서만 수행한다.' },
    why: { wrist: '일자 바 그립은 저항이 손목 신전 방향으로 걸려 수근관 증상을 자극할 수 있다.', elbow: '저항에 맞선 반복적 팔꿈치 신전과 그립 부하가 상과 힘줄을 자극할 수 있으나 부하 조절이 쉬워 관리 가능하다.' }
  },
  '케이블 풀 스루': {
    caution: ['lower_back'],
    sub: { lower_back: '머신 힙 쓰러스트' },
    mod: { lower_back: '중량을 낮추고 허리가 말리기 직전까지만 고관절을 접으며, 무릎을 살짝 굽힌 채 엉덩이로만 밀어낸다.' },
    why: { lower_back: '힙 힌지 패턴이라 요추 굴곡 모멘트가 생기지만, 부하가 뒤에서 수평으로 당기는 케이블이라 RDL 계열 같은 축성 압박이 없어 힌지 종목 중에서는 요추 부담이 가장 낮은 축이다.' }
  },
  '크런치': {
    caution: ['lower_back'],
    sub: { lower_back: '플랭크' },
    mod: { lower_back: '허리 아래에 손을 받치고 요추는 바닥에 고정한 채 흉추 상부만 살짝 들어 올리는 방식(맥길 컬업)으로 하면 가능하다.' },
    why: { lower_back: '반복적 요추 굴곡 동작이라 디스크 후방부에 스트레스를 줄 수 있다.' }
  },
  '클램쉘': {
    rehab: ['lower_back', 'knee'],
    why: { lower_back: '중둔근을 활성화해 골반·요추의 동적 안정성을 높이는, 요통 재활 프로그램의 표준 보조 운동이다.', knee: '중둔근 강화로 동적 무릎 외반을 줄여 슬개골 트래킹을 개선한다.' }
  },
  '클로즈 그립 벤치 프레스': {
    contra: ['wrist'],
    caution: ['shoulder', 'elbow'],
    sub: { shoulder: '케이블 푸시 다운', wrist: '케이블 트라이셉스 킥백', elbow: '케이블 푸시 다운' },
    mod: { shoulder: '팔꿈치를 몸통에 붙이고 바가 가슴에 닿기 전에 멈추는 부분 가동범위로 수행한다.', elbow: '무게를 낮추고 팔꿈치를 완전히 잠그기 직전에 멈추는 범위로 수행한다.' },
    why: { shoulder: '어깨 부담이 적은 프레스 변형이지만 여전히 바닥 구간에서 어깨 전면에 압박이 걸린다.', wrist: '좁은 바벨 그립이 고부하에서 손목 신전과 척측 편위를 동시에 강제해 손상 부위에 큰 전단 스트레스를 준다.', elbow: '좁은 그립이 부하를 삼두와 팔꿈치 신전 구조물에 집중시켜 상과염 부위를 자극하기 쉽다.' }
  },
  '터미널 니 익스텐션': {
    rehab: ['knee'],
    why: { knee: '닫힌사슬 말단 신전으로 슬개대퇴 부하를 최소화하며 대퇴사두를 강화하는 표준 무릎 재활 종목이다.' }
  },
  '트라이셉스 푸시다운': {
    caution: ['wrist', 'elbow'],
    sub: { wrist: '케이블 트라이셉스 킥백' },
    mod: { wrist: '로프 어태치먼트로 바꿔 중립 그립으로 손목을 곧게 유지한다.', elbow: '로프를 사용해 손목을 중립으로 두고 가벼운 무게로 통증 없는 범위에서만 수행한다.' },
    why: { wrist: '일자 바 그립은 저항이 손목 신전 방향으로 걸려 수근관 증상을 자극할 수 있다.', elbow: '저항에 맞선 반복적 팔꿈치 신전과 그립 부하가 상과 힘줄을 자극할 수 있으나 부하 조절이 쉬워 관리 가능하다.' }
  },
  '페이스 풀': {
    rehab: ['shoulder'],
    why: { shoulder: '외회전과 견갑골 후인을 결합한 동작으로 회전근개와 하부 승모근을 강화해 어깨 안정성 회복에 도움이 된다.' }
  },
  '펙덱 플라이': {
    caution: ['shoulder'],
    sub: { shoulder: '케이블 플라이' },
    mod: { shoulder: '가동범위 제한 장치로 시작점을 몸통 평면 앞으로 설정하고 가벼운 무게로 한다.' },
    why: { shoulder: '팔이 몸통 평면 뒤로 넘어가는 수평 외전 끝범위에서 전방 관절낭이 과신장된다.' }
  },
  '풀업': {
    caution: ['shoulder', 'wrist', 'elbow'],
    sub: { shoulder: '랫 풀 다운', wrist: '랫 풀 다운', elbow: '랫 풀 다운' },
    mod: { shoulder: '밴드나 어시스트로 부하를 줄이고 통증 없는 가동범위에서만 당긴다.', wrist: '어시스트 머신이나 밴드로 부하를 크게 줄이고 통증 없는 범위에서 수행한다.', elbow: '밴드 보조로 부하를 줄이고 통증 없는 범위에서만 수행한다.' },
    why: { shoulder: '체중 전체가 어깨 최대 굴곡(오버헤드) 자세에 걸려 손상된 회전근개에 부하 조절이 불가능하다.', wrist: '체중 전체가 매달린 손목과 악력에 실려 손상 부위에 큰 견인·압박 부하가 간다.', elbow: '체중 부하의 팔꿈치 굴곡과 강한 악력 요구가 상과 기시부 힘줄을 자극할 수 있다.' }
  },
  '풀오버': {
    caution: ['shoulder'],
    sub: { shoulder: '랫 풀 다운' },
    mod: { shoulder: '팔꿈치를 살짝 굽히고 머리 위 끝범위 전에 멈추는 짧은 가동범위로 수행한다.' },
    why: { shoulder: '머리 뒤 끝범위까지 어깨를 굴곡시키며 부하를 거는 동작이라 관절낭과 회전근개가 과신장된다.' }
  },
  '프론트 스쿼트': {
    contra: ['lower_back'],
    caution: ['knee', 'wrist', 'elbow'],
    sub: { lower_back: '핵 스쿼트', knee: '레그 프레스', wrist: '핵 스쿼트', elbow: '레그 프레스' },
    mod: { knee: '얕은 깊이와 가벼운 중량으로 제한하고 무릎 전방 이동을 최소화한다.', wrist: '크로스암 그립 또는 스트랩 랙 포지션으로 바꿔 손목 신전을 제거한다.', elbow: '크로스 암 그립이나 스트랩 그립으로 바꿔 손목·팔꿈치 스트레스를 제거한다.' },
    why: { lower_back: '몸통이 곧게 서서 백스쿼트보다 요추 압박은 다소 낮을 수 있으나 전단력은 상충하는 측정이 있고(Russell & Phillips 1989), 흉추·발목 가동성이 부족하면 오히려 요추가 더 말린다. 바벨을 몸에 얹는 스쿼트 계열은 통증 유발 여부를 앱이 확인할 수 없어 보수적으로 차단하고 핵 스쿼트로 대체한다.', knee: '직립 상체 탓에 무릎이 더 전방으로 이동해 슬개대퇴 부하가 백스쿼트보다 크다.', wrist: '클린 그립 랙 포지션이 부하 상태에서 손목의 극단적 신전을 요구한다.', elbow: '클린 그립 랙 자세가 손목 과신전과 팔꿈치 부위 연부조직에 스트레스를 준다.' }
  },
  '플랭크': {
    rehab: ['lower_back'],
    why: { lower_back: '척추를 중립으로 고정한 채 코어 강성을 기르는 대표적 요추 안정화(McGill 계열) 운동으로 재활에 권장된다.' }
  },
  '해머 컬': {
    rehab: ['wrist'],
    why: { wrist: '중립 그립으로 손목 스트레스 없이 전완 근육(상완요골근 등)을 강화해 손목 안정성 회복에 도움이 된다.' }
  },
  '해머 체스트 프레스': {
    caution: ['shoulder'],
    sub: { shoulder: '머신 체스트 프레스' },
    mod: { shoulder: '시트를 올려 손잡이가 어깨보다 낮은 궤적으로 지나가게 하고 통증 없는 범위까지만 민다.' },
    why: { shoulder: '좌우 독립 암이라 팔 각도를 스스로 맞출 수 있어 고정 바보다 어깨 부담이 낮지만, 수평 프레스 바닥 구간에서 전방 관절낭에 걸리는 부하는 남는다.' }
  },
  '해머 인클라인 체스트 프레스': {
    caution: ['shoulder'],
    sub: { shoulder: '해머 체스트 프레스' },
    mod: { shoulder: '손잡이를 가슴 높이까지만 내리는 부분 가동범위로 제한하고 무게를 낮춘다.' },
    why: { shoulder: '인클라인 각도에서 어깨 굴곡이 커져 견봉하 공간 부하가 평각도보다 늘어난다.' }
  },
  '핵 스쿼트': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '머신 레그 익스텐션', knee: '레그 프레스' },
    mod: { lower_back: '골반이 말리지 않는 깊이까지만, 중간 무게로 수행하면 가능하다.', knee: '발을 발판 위쪽에 두고 얕은 깊이·가벼운 중량으로 수행한다.' },
    why: { lower_back: '등 패드가 척추를 지지하지만 깊은 하강에서 골반이 말리면 요추 굴곡+압박이 발생한다.', knee: '등판 고정 구조가 무릎의 전방 이동을 키워 슬개대퇴 압박 스트레스가 높다.' }
  },
  '햄스트링 컬': {
    rehab: ['knee'],
    why: { knee: '햄스트링 강화는 경골 전방 전위를 억제해 무릎(특히 전방십자인대) 안정성에 기여하며 관절 압박이 적다.' }
  },
  '행잉 니 레이즈': {
    caution: ['lower_back', 'shoulder'],
    sub: { lower_back: '플랭크', shoulder: '머신 시티드 크런치' },
    mod: { lower_back: '다리를 곧게 펴 들지 말고 무릎을 가슴 쪽으로 말아 올려 골반을 후방 경사시킨다. 골반이 안 말리고 다리만 올라가면 장요근 운동이 되어 요추 전단 부하가 커지므로 즉시 멈춘다.', shoulder: '어시스트 기구의 발판을 이용해 매달리는 시간을 줄이거나, 팔걸이형(캡틴 체어) 자세로 바꾼다.' },
    why: { lower_back: '골반 후방 경사 없이 다리를 들면 장요근이 요추를 앞으로 당겨 전단력이 커진다. 무릎을 말아 올리는 큐만 지키면 복직근 하부 운동으로 안전해진다.', shoulder: '체중 전체가 매달린 어깨의 오버헤드 견인 자세에 걸린다.' }
  },
  '이지 바 리버스 컬': {
    caution: ['wrist', 'elbow'],
    sub: { wrist: '덤벨 해머 컬', elbow: '덤벨 해머 컬' },
    mod: { wrist: 'EZ 바의 기울어진 그립을 써서 손목 각도 부담을 줄이고 무게를 크게 낮춘다.', elbow: '가벼운 무게로 반동 없이 수행하고, 통증이 있으면 중립 그립(해머 컬)으로 바꾼다.' },
    why: { wrist: '회내 그립으로 바를 들어 올려 손목 신전근에 지속적인 등척성 부하가 걸린다.', elbow: '전완 신전근 기시부(외측 상과)를 직접 겨냥하는 종목이라 테니스 엘보 증상에서 통증을 유발하기 쉽다. 반대로 통증이 없다면 같은 이유로 재활 강화 종목이 되기도 한다.' }
  },
  '힙 쓰러스트': {
    rehab: ['knee'],
    why: { knee: '무릎 관절 부하가 거의 없이 둔근을 강화해 하지 정렬과 무릎 안정성에 기여한다.' }
  },
  '힙 어브덕션': {
    rehab: ['knee'],
    why: { knee: '고관절 외전근 강화는 무릎 외반 제어를 도와 슬개대퇴 통증 재활의 핵심 요소다.' }
  },
  'T 바 로우': {
    caution: ['lower_back', 'wrist'],
    sub: { lower_back: '머신 시티드 로우', wrist: '머신 시티드 로우' },
    mod: { lower_back: '가슴 패드가 있는 T바 머신(체스트 서포티드)을 쓰고, 없으면 상체를 덜 숙인 각도에서 중립 척추를 유지한 채 중량을 낮춰 수행하면 가능하다.', wrist: '중립 그립 손잡이와 스트랩을 사용하고 중량을 낮춘다.' },
    why: { lower_back: '벤트오버 자세에서 고중량을 당기는 구조라 바벨 로우와 같은 계열의 등척성 요추 부하가 걸린다. 랜드마인 방식이라고 허리 부담이 저절로 줄지는 않으므로(전통 RDL과 랜드마인 RDL은 요추 가동범위·근활성에 차이 없음), 부담을 실제로 줄이는 건 가슴 패드 지지뿐이다.', wrist: '고중량을 손으로 지지하는 로우로 손목·악력에 지속적 부하가 걸린다.' }
  }
};

// 부위 그룹 (대분류) - 부위 균형 분석 및 합산 진단용
// 형식: 통합부위코드: { kr: '한국어명', subParts: ['세부 부위 코드들...'] }
var BODY_PART_GROUPS = {
  chest:           { kr: '가슴',       subParts: ['chest', 'chest_upper', 'chest_lower'], size: 'large' },
  shoulders_front: { kr: '어깨 전면',  subParts: ['shoulders_front'], size: 'small' },
  shoulders_side:  { kr: '어깨 측면',  subParts: ['shoulders_side'], size: 'small' },
  shoulders_rear:  { kr: '어깨 후면',  subParts: ['shoulders_rear'], size: 'small' },
  triceps:         { kr: '삼두',       subParts: ['triceps'], size: 'small' },
  lats:            { kr: '광배',       subParts: ['lats'], size: 'large' },
  upper_back:      { kr: '등 중부',    subParts: ['upper_back', 'traps'], size: 'large' },
  biceps:          { kr: '이두',       subParts: ['biceps'], size: 'small' },
  forearms:        { kr: '전완',       subParts: ['forearms'], size: 'small' },
  quads:           { kr: '대퇴사두',   subParts: ['quads'], size: 'large' },
  hamstrings:      { kr: '햄스트링',   subParts: ['hamstrings'], size: 'large' },
  glutes:          { kr: '둔근',       subParts: ['glutes', 'glutes_med'], size: 'large' },
  adductors:       { kr: '내전근',     subParts: ['adductors'], size: 'small' },
  // 종아리: 어떤 종목도 calves를 보조근(secondary)으로 두지 않아 복합운동 간접자극이 거의 0 →
  // '작은 근육=간접자극으로 목표 낮춤' 전제가 성립 안 함. 볼륨 목표는 큰 근육 수준으로 둔다(고볼륨 내성).
  // 이 size 값은 해부학적 크기가 아니라 '직접 볼륨 목표' 분류이며, getVolumeDiagnosis·ai.js 볼륨 임계가 함께 참조. 근거: RP/Schoenfeld.
  calves:          { kr: '종아리',     subParts: ['calves'], size: 'large' },
  abs:             { kr: '복근',       subParts: ['abs', 'obliques'], size: 'small' },
  lower_back:      { kr: '요추',       subParts: ['lower_back'], size: 'small' }
};

// 부족 부위 → 권장 종목 매핑 (AI에게 직접 매칭 제공)
// 각 종목의 primary 부위가 권장 부위와 일치해야 함 (예외: forearms/lower_back은 secondary 자극으로 보충)
var WEAK_PART_EXERCISE_MAP = {
  chest:           ['머신 펙 덱 플라이', '케이블 플라이', '머신 체스트 프레스', '스미스 인클라인 벤치 프레스'],
  shoulders_front: ['머신 시티드 숄더 프레스', '덤벨 숄더 프레스', '덤벨 아놀드 프레스'],
  shoulders_side:  ['케이블 원 암 레터럴 레이즈', '덤벨 사이드 레터럴 레이즈'],
  shoulders_rear:  ['리버스 펙 덱 플라이', '페이스 풀', '원암 리버스 펙 덱 플라이'],
  triceps:         ['케이블 푸시 다운', '케이블 오버헤드 트라이셉스 익스텐션', '케이블 트라이셉스 킥백'],
  lats:            ['풀업', '클로즈 그립 랫 풀 다운', '랫 풀 다운', '케이블 암 풀 다운'],
  upper_back:      ['머신 시티드 로우', 'T 바 로우', '케이블 슈러그'],
  biceps:          ['인클라인 덤벨 컬', '이지 바 프리처 컬', '바벨 컬'],
  forearms:        ['이지 바 리버스 컬', '덤벨 해머 컬(이두 보조 자극)'],
  quads:           ['레그 프레스', '핵 스쿼트', '머신 레그 익스텐션', '덤벨 불가리안 스플릿 스쿼트'],
  hamstrings:      ['바벨 루마니안 데드리프트', '시티드 레그 컬', '머신 라잉 레그 컬'],
  glutes:          ['머신 힙 쓰러스트', '머신 힙 어브덕션'],
  adductors:       ['힙 어덕션'],
  calves:          ['레그 프레스 카프 레이즈', '스탠딩 카프 레이즈', '덤벨 시티드 카프 레이즈'],
  abs:             ['머신 시티드 크런치', '케이블 크런치', '케이블 팔로프 프레스'],
  lower_back:      ['바벨 루마니안 데드리프트(햄스트링 보조 자극)']
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
// 코치 지식 베이스 (근비대·운동과학 근거 기반)
//  - 코치 시스템 프롬프트의 고정 블록(prompt caching 대상)에 주입된다.
//  - 모든 핵심 수치는 메타분석/포지션스탠드 근거. 새 항목 추가 시 출처를 함께 적을 것.
//  - 사용자 개인 데이터(무게/볼륨 등)는 여기 넣지 말 것 — 그건 가변 컨텍스트에서 주입됨.
// ═══════════════════════════════════════════════
var COACH_KNOWLEDGE =
  '### 1. 트레이닝 핵심 원리\n' +
  '- 볼륨: 부위당 주 10~20 직접세트가 핵심 구간. 세트 1개당 약 +0.24% 근비대, 이후 수확 체감(금지선 아님 — 회복 여력 되면 더 가능) (Pelland 2024). 4세트 미만=부족. 간접(보조근) 세트는 0.5로 합산해 판단.\n' +
  '- 빈도: 주간 총 세트가 같으면 주 1회든 2회든 근비대 차이가 없다 (Schoenfeld·Grgic·Krieger 2019, J Sports Sci 37(11):1286, 25개 연구 — 2016년 메타의 같은 저자들이 뒤집음). 그럼에도 주 2회를 권하는 이유는 두 가지다: ① 근력에는 빈도가 유의미하고(Pelland 2025), ② 주간 세트를 한 세션에 몰면 세션 내 수확 체감 구간에 들어가므로 나눠 담는 그릇이 필요하다. 사용자가 주 1회 분할을 선호하면 막지 말고 세션당 부위 세트 수만 점검한다.\n' +
  '- 강도(노력): 본세트는 실패 1~3회 전(RIR 1~3)에서 멈추는 것이 효율적. 매 세트 완전 실패는 피로만 누적 (Refalo 2023).\n' +
  '- 반복 범위: 약 5~30회 모두 실패에 근접하면 근비대 효과는 동등 (IUSCA 2021). 저반복=근력에 유리, 고반복=관절 부담↓·펌프.\n' +
  '- 신장 강조(스트레치): 근육이 늘어난 위치에서 부하가 큰 종목/가동범위가 근비대에 유리. 긴 근육 길이가 핵심이며 신장 부분반복은 전가동과 같거나 우월 (Maeo 2023, 2024~25 메타 재확인).\n' +
  '- 머신=프리웨이트: 근비대 효과는 동등. 환경/안전/안정성에 맞춰 고르면 됨 (Schwanbeck 2020).\n' +
  '- 휴식: 앱 기본값은 고중량복합 180초 · 중강도복합 150초 · 고립 120초 · 경량고립 90초 · 재활 60초. 훈련 경험자에서 3분 > 1분 (Schoenfeld 2016 JSCR). 단 90초 초과의 추가 이득은 불확실하다 (Frontiers 2024 베이지안 메타) — 긴 휴식이 작동하는 메커니즘은 "다음 세트 반복 수를 지켜주는 것"이라, 직전 세트가 목표 하단을 못 채웠을 때만 +30초를 더한다.\n' +
  '- 세트법: 볼륨이 같으면 스트레이트·피라미드·드롭세트의 근비대는 동등 (Angleri 2017 / Sødal 2023 메타 SMD 0.155 p=0.392). 그래서 앱은 "더 좋은 세트법"을 찾지 않고 문제에 맞춰 배정한다 — 고중량 복합만 탑세트+백오프(뒤 세트 반복 붕괴로 잃는 볼륨 로드를 보존), 나머지는 스트레이트. 드롭세트·마이오렙의 이득은 오직 시간(1/2~1/3)이라 시간 압박이 있을 때만 제안한다.\n' +
  '- 길항근 슈퍼세트: 세션 시간 약 −37%인데 볼륨 로드·근비대·근력 모두 동등 (Zhang 2025 메타 19연구, Burke 2024). 주 5일 × 60분 제약에서 볼륨을 늘릴 수 있는 가장 큰 지렛대. 단 체감 힘듦·대사 스트레스가 높아 세션당 2페어까지.\n' +
  '- 점진적 과부하: 더블 프로그레션이 기본. 목표 횟수 상단을 2세션 연속 달성하면 무게 +한 칸(장비 단위: 덤벨 2kg·머신·케이블·바벨·스미스 5kg), 횟수는 하단으로 리셋.\n' +
  '- ⚠️ 예외 — 어시스트(보조) 기구 종목(어시스트 풀업·어시스트 딥스): 스택 무게는 부하가 아니라 **체중을 상쇄해 주는 보조력**이다. 실제 부하 = 체중 − 보조 무게. 그래서 진행 방향이 정반대다 — 상단 횟수를 달성하면 보조를 한 칸 **내린다**(보조 40kg → 35kg = 증량). 보조를 올리는 것이 감량이고, 통증·디로드처럼 부하를 줄여야 할 때 보조를 올린다. 보조 0kg = 맨몸이 최종 목표이며 그 아래는 없다. 이 종목의 무게를 말할 때는 반드시 "보조 40kg"처럼 말하고, 1RM·e1RM은 계산하지 않는다(보조 무게로 뽑은 1RM은 강해질수록 내려가는 뒤집힌 값이다). 진행 지표는 보조 무게 감소 추이다. (ExRx Calculating Actual Resistance / ACSM 2009 — docs/research/assisted-progression.md)\n' +
  '- 주기화: 5주 사이클(빌드 4주 + 디로드 1주) 같은 구조. 주차는 날짜가 아니라 그 주 목표 운동 완료로 넘어감.\n\n' +

  '### 2. 종목 자세(폼) 핵심 큐 + 흔한 실수\n' +
  '- 공통: 본세트 전 점진적 워밍업, 통제된 신장(eccentric) 1~3초, 가동범위는 신장 위치까지 충분히. 반동/치팅으로 무게를 올리는 것은 자극을 분산시킴.\n' +
  '- 스쿼트/레그프레스: 무릎이 발끝 방향과 일치, 척추 중립, 무릎이 안으로 무너지지(valgus) 않게. 흔한 실수=상체 과도하게 숙임, 발뒤꿈치 들림.\n' +
  '- 데드리프트/힙힌지: 바를 몸에 붙이고 엉덩이로 밀기, 허리는 둥글게 말지 말 것. 흔한 실수=허리로 들기(요추 굴곡), 바가 몸에서 멀어짐.\n' +
  '- 벤치/체스트프레스: 견갑 후인·하강 고정, 팔꿈치 약 45~75도(어깨 옆으로 90도 활짝 금지). 흔한 실수=어깨 들림, 가동범위 짧음.\n' +
  '- 오버헤드프레스: 갈비뼈가 들리며 허리가 과신전되지 않게 복압 유지, 팔꿈치 약간 앞. 흔한 실수=허리 젖혀 들기.\n' +
  '- 로우/풀다운: 견갑을 먼저 모으고 팔꿈치로 당기기, 상체 반동 최소. 흔한 실수=이두로만 당김, 견갑 고정 안 됨.\n' +
  '- 측면/후면 레터럴 레이즈: 가벼운 무게로 통제, 승모근으로 으쓱 들지 말 것. 소근육은 다회수가 적합.\n\n' +

  '### 3. 부상·통증 대응 (안전 트리아지)\n' +
  '- 근육의 타는 듯한 피로감/펌프는 정상. 반대로 관절·인대의 날카롭거나 찌르는 통증, 저림, 한쪽만 아픈 통증은 멈춤 신호.\n' +
  '- 운동 중 날카로운 통증=즉시 중단. 통증을 참고 밀어붙이지 말 것. 가벼운 불편은 무게↓·가동범위 조정·통증 없는 종목으로 대체.\n' +
  '- 어깨: 임핀지먼트 흔함 → 팔꿈치 활짝 벌린 프레스/딥 줄이고 중립 그립·각도 조정, 후면/회전근개 보강.\n' +
  '- 허리: 굴곡/회전 부하에서 통증 흔함 → 힙힌지 패턴 점검, 복압·중립 유지, 일시적으로 무게↓.\n' +
  '- 무릎: 슬개건 통증 흔함 → 가동범위·템포 조정, 통증 없는 범위에서 볼륨 유지.\n' +
  '- 손목/팔꿈치: 그립·각도(EZ바/뉴트럴) 변경으로 완화되는 경우 많음.\n' +
  '- 2주 이상 지속·악화되거나 일상에 지장을 주면 의료/물리치료 전문가 상담 권유. 코치는 진단을 대신하지 않음.\n\n' +

  '### 4. 영양 — 단백질\n' +
  '- 총량이 거의 전부다: 하루 1.6 g/kg 체중 부근에서 수확 체감이 시작된다 (Morton 2018 BJSM, 49개 RCT·1,863명 — 1.62 g/kg을 넘겨도 제지방 증가분이 더 늘지 않음). Tagawa 2021(105편·5,402명)도 1.3 g/kg 아래에서 기울기가 급하고 그 위에서 완만해진다고 보고.\n' +
  '- 감량(적자) 중에는 더 높인다: 1.6~2.4 g/kg 체중 (Hector & Phillips 2018). Longland 2016(AJCN): 40% 적자 + 고강도 훈련 4주에서 2.4 g/kg 군은 제지방 +1.2kg / 지방 -4.8kg, 1.2 g/kg 군은 +0.1kg / -3.5kg. 적자 중에도 근육이 늘 수 있다.\n' +
  '- 흔한 통념 반박: "한 끼 20~30g 넘으면 낭비"는 틀렸다. Trommelen 2023(Cell Rep Med)에서 100g을 한 번에 먹어도 25g보다 근단백질 합성이 더 크고 더 오래 지속됐다. 옛 상한설은 관찰 시간을 3~5시간으로 짧게 잡아 생긴 착시다.\n' +
  '- 분배(끼니당 0.4 g/kg)는 총량이 부족할 때만 의미가 있다. 원 출처(Schoenfeld & Aragon 2018) 저자들도 추정치임을 밝혔고 이후 연구는 엇갈린다(Hudson 2017: 균등 vs 편중 분배 체성분 차이 없음). → 총량을 채웠으면 분배는 부차적이라고 답할 것.\n\n' +

  '### 5. 영양 — 에너지 균형과 리컴포지션\n' +
  '- 리컴포지션(체지방↓ + 근육↑ 동시)은 실제로 가능하다. 초보·복귀자·체지방이 여유 있는 사람에게서 특히 잘 일어난다 (Barakat 2020 Strength Cond J). 필수 조건은 (1) 점진적 과부하 (2) 충분한 단백질.\n' +
  '- 적자 상한: 하루 500 kcal를 넘기면 제지방 증가가 사라진다 (Murphy & Koehler 2022 메타회귀).\n' +
  '- 감량 속도: 주 0.5~1.0% 체중. Garthe 2011(IJSNEM): 주 0.7% 감량군은 제지방 +2.1%, 주 1.4% 감량군은 -0.2%로 정체 — 두 군 다 주 4회 웨이트를 했는데도 차이가 났다.\n' +
  '- 증량 속도: 주 +0.25~0.5% 체중, 유지 칼로리 대비 +10~20% (Iraki 2019).\n' +
  '- 단기 체중 변동은 지방이 아니다: 2주간 체중 변화의 84%가 제지방(주로 수분) (Bhutani 2017). 하루 체중 하나로 판단하지 말고 7일 이동평균 추세로 볼 것.\n' +
  '- 보충제는 6번 항목 기준으로 답한다 — 근육량과 직접 연관되는 건 크레아틴뿐이다.\n\n' +

  '### 6. 보충제 (근거 등급순)\n' +
  '- 크레아틴 모노하이드레이트: 근육량과 직접 연관되는 사실상 유일한 보충제. 매일 3~5g, 로딩 불필요(꾸준함이 핵심). 안전 (Kreider 2017, ISSN 포지션스탠드).\n' +
  '- 카페인: 운동 약 60분 전 3~6 mg/kg으로 근력·파워·근지구력 소폭 향상. 약 2mg/kg부터 효과 가능, 9mg/kg 이상은 부작용↑·추가 이득 없음 (ISSN 2021, Guest).\n' +
  '- 퍼포먼스 근거가 충분하다고 본 건 IOC 합의(Maughan 2018) 기준 카페인·크레아틴·질산염(비트루트)·중탄산나트륨·(아마도) 베타알라닌 다섯뿐이며, 이 중 근비대 목적에 실익이 있는 건 크레아틴·카페인이다.\n' +
  '- 그 외(시트룰린·BCAA·테스토 부스터 등)는 효과가 작거나 근거가 약하다. 확실하지 않으면 근거가 약하다고 정직하게 답할 것.\n\n' +

  '### 7. 회복 — 수면·디로드·부위 회복\n' +
  '- 수면 7~9시간. 4~6시간으로 줄면 MPS·테스토스테론↓, 회복·수행 저하.\n' +
  '- 부위 회복: 소근육(이두/삼두/측면) 약 24~36시간, 가슴/등/하체 약 48~72시간. 같은 부위를 너무 자주 무겁게 치지 말 것.\n' +
  '- 디로드: 약 5~6주마다 1주, 볼륨 약 50%로 낮추고 무게 유지, RIR 3~5로 가볍게. 누적 피로를 비우는 계획적 휴식.\n' +
  '- 컨디션/스트레스: 평균 RIR 체감이 급격히 높아지거나 컨디션이 떨어지면 강도·볼륨을 일시 낮추는 게 장기적으로 이득.\n\n' +

  '### 8. 워밍업·가동성·스트레칭\n' +
  '- 웜업 구조는 3단계다: ① 일반 유산소 3~5분(RPE 3~4) → ② 그날 부위 동적 드릴 3~5동작·2~3분 → ③ 종목별 램프업 세트. 총 6분 안팎이면 충분하고, 그 이상은 근비대 볼륨을 갉아먹는다.\n' +
  '- ①의 근거가 가장 확실하다: 근온이 1분당 약 0.1℃ 올라 수축 속도·신경전도가 개선된다(Bishop 2003). ②는 수행 +1.3%로 효과가 작다(Behm 2016) — "둔근을 깨우면 스쿼트가 강해진다" 식으로 과장하지 말고 "그날 쓸 패턴을 예행연습한다"로 말한다(활성화 운동의 직접 근거는 빈약).\n' +
  '- ⚠️ 본세트 전 한 근육당 60초 이상 정적 스트레칭 금지: 최대근력 −5.4%(Simic 2013, 104편), ≥60초 ES −0.84 / <60초 ES −0.18(Warneke 2024, 83편). 짧게(<60초) 하고 뒤에 동적 활동이 이어지면 손실은 무시할 만하다.\n' +
  '- 운동 후 스트레칭이 근거로 주는 건 **유연성(가동범위) 유지** 하나뿐이다(2025 국제 델파이 합의문, 연구자 20명 전 항목 80%+ 합의). 부위당 30초씩 3~4동작 = ACSM "유지" 기준(근육당 총 60초)은 맞지만, "유연성 향상"(3세트×120초) 기준에는 한참 못 미친다 — 이 차이를 정직하게 말한다.\n' +
  '- ★금지 문구(전부 근거 없음 — 사용자가 물어도 명확히 아니라고 답한다): "스트레칭하면 근육이 잘 큰다"(근비대 d=0.20, 근육당 15분×주5회 필요 vs 근력운동 d=1.60 · Warneke 2024) / "스트레칭하면 내일 안 아프다"(DOMS 유의차 없음 · Herbert 2011 Cochrane, Afonso 2021) / "스트레칭이 부상을 막는다"(유의하지 않음 · Lauersen 2014 — 부상을 실제로 줄이는 건 근력운동으로 1/3 미만).\n' +
  '- 전 가동범위 근력운동 자체가 스트레칭만큼 ROM을 올린다(Afonso 2021 ES −0.22 ns, Alizadeh 2023 ES 0.08 ns). 이미 주 5일 웨이트를 하면 유연성 이득의 상당 부분은 이미 얻고 있다.\n' +
  '- 허리디스크: 손상 기전은 큰 압박력이 아니라 **부하 상태의 반복 요추 굴곡**이다(McGill). 배제 = 선 채 발끝 닿기·앉아 전굴·무릎 가슴 당기기·차일드 포즈·크런치/싯업 웜업·로잉머신 웜업·허리 비틀기. 대체 = 누워서 스트랩 햄스트링 / 선 자세 광배 힌지 / 누워서 피겨-4 / 캣-카멜(무부하) / McGill 빅3. 순서는 "먼저 척추를 굳히고 그 다음 고관절을 움직인다"(캣-카멜 → 버드독 → 힙힌지·스쿼트 → 램프업).\n' +
  '- 기상 직후엔 디스크 내압이 약 240%, 굽힘 응력이 약 300% 높다(Adams·Dolan 1990) — 아침 운동이면 숙이는 동작을 특히 조심하라고 안내한다.\n' +
  '- 가동성 부족(발목/고관절/흉추/어깨)은 자세를 무너뜨린다. 문제 부위 위주로 짧은 동적 루틴을 운동 전에 배치한다.\n\n' +

  '### 9. 강도·진행 기법 (정체 돌파)\n' +
  '- 더블 프로그레션: 목표 횟수 상단 도달 → 무게↑ → 하단부터 다시. 가장 단순하고 신뢰도 높은 진행. (어시스트 종목만 반대: 보조 무게↓)\n' +
  '- 정체 시: 무게 +한 칸(덤벨 2kg·그 외 5kg / 어시스트 종목은 보조 −한 칸) 도전, 종목/각도 변경, 볼륨 소폭↑, 또는 디로드 후 재도전 중 하나.\n' +
  '- 보조 기법(고립·마무리 한정): 드롭셋(실패 후 무게 내려 이어가기), 슈퍼셋(시간 절약), 렉스트포즈(짧은 휴식 후 추가 반복). 메인 복합운동보다는 고립/마무리 세트에 적합하며 회복 비용을 고려해 과용 금지.\n';

// ═══════════════════════════════════════════════
// 인클라인 워킹(경사 걷기) 처방 상수
// 근거: docs/research/incline-walking.md — §2(단계별 처방표) · §3(세션 구조) · §4(점진 규칙) · §5(주의사항)
// 이 모드의 정직한 장점은 "평지 조깅에 가까운 열량을 무릎 부담 없이"다(§1-2·§1-4).
// ★'지방 연소·순삭' 류 마케팅 문구 금지 — 연구가 서로 엇갈리고(§1-3), 체지방은 총 에너지 적자가 정한다(§1-1).
// ═══════════════════════════════════════════════
var WALK_PRESCRIPTION = {
  inclineStart: 4,          // 기록 없을 때 첫 경사 % (§2-1 0~1단계: 4~6%에서 시작)
  inclineStartBack: 3,      // 허리디스크 이력 있을 때 첫 경사 % (§2-2)
  inclineMax: 12,           // ★절대 상한 — 초과 금지(§1-3: 15~20%는 이득 사라지고 지속률 붕괴)
  inclineMaxBack: 10,       // 허리 이력 시 권장 상한을 한 단계 낮춤 (§7-6 규칙7)
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
  { value: 'hold',  label: '계속 잡음',      desc: '다음엔 경사 −2%' }
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
    kr: '빠르게 걷기 · 실내자전거', phase: 'warmup',
    mode: 'time', sec: 180, gear: 'cardio',
    cue: 'RPE 3~4 — 숨은 차되 옆 사람과 대화는 되는 정도. 러닝머신이면 경사 3~5%로 걷기.',
    why: '근육 온도가 1분에 약 0.1℃ 오르면서 수축·이완 속도와 신경전도가 빨라진다(Bishop 2003). 웜업에서 기전이 가장 확실한 부분.',
    warn: '로잉머신은 쓰지 않는다 — 부하 상태의 요추 굴곡을 수백 번 반복하는 동작이라 디스크 손상 기전과 겹친다.',
    discSafe: true
  },

  // ── 웜업 드릴 (§3-B ~ §3-G) ─────────────────────────────
  cat_camel: {
    kr: '캣-카멜', phase: 'warmup',
    mode: 'reps', reps: 6, secPerRep: 4, gear: 'mat',
    cue: '네발 기기 자세에서 등을 둥글게 말았다가 아래로 내린다. 천천히, 통증 없는 범위까지만.',
    why: '척추를 부하 없이 움직여 뻣뻣함을 줄인다. 스트레칭이 아니라 관절 윤활이다 — McGill은 빅3 전에 5~6회를 권한다.',
    discSafe: true
  },
  bird_dog: {
    kr: '버드독', phase: 'warmup',
    mode: 'repsPerSide', reps: 6, secPerRep: 5, gear: 'mat',
    cue: '반대쪽 팔·다리를 뻗어 3~5초 버틴다. 허리는 중립 고정, 골반이 돌아가지 않게.',
    why: '척추를 굳힌 뒤 팔·다리를 움직이는 McGill 원칙. 허리엔 근력보다 지구력이 필요하다.',
    discSafe: true
  },
  mcgill_curlup: {
    kr: '맥길 컬업', phase: 'warmup',
    mode: 'repsPerSide', reps: 3, secPerRep: 12, gear: 'mat',
    cue: '한쪽 무릎만 세우고 손은 허리 아래에. 머리·목·상체를 통짜로 살짝만 들어 10초 버틴다.',
    why: '일반 윗몸일으키기와 달리 요추를 말지 않고 복부 지구력만 쓴다(McGill 빅3).',
    discSafe: true
  },
  side_bridge: {
    kr: '사이드 브리지', phase: 'warmup',
    mode: 'repsPerSide', reps: 3, secPerRep: 12, gear: 'mat',
    cue: '무릎 대고 하는 버전부터. 몸이 일직선이 되게 10초 버틴다.',
    why: 'McGill 빅3. 척추 강성을 지구력 방식으로 만든다.',
    discSafe: true
  },
  scap_pushup: {
    kr: '견갑 푸시업', phase: 'warmup',
    mode: 'reps', reps: 10, secPerRep: 3, gear: 'none',
    cue: '팔은 편 채로 어깨뼈만 모았다 벌린다. 힘들면 벽을 짚고 해도 된다.',
    why: '어깨뼈가 먼저 움직여야 미는 동작에서 어깨가 대신 무리하지 않는다.',
    discSafe: true
  },
  band_pull_apart: {
    kr: '팔 벌려 뒤로 모으기 (밴드 풀 어파트)', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'band',
    cue: '팔꿈치를 살짝 굽히고 가슴을 연다. 어깨를 으쓱하지 않는다. 밴드가 없으면 맨손으로 크게.',
    why: '그날 쓸 견갑 움직임을 가볍게 예행연습한다.',
    discSafe: true
  },
  wall_slide: {
    kr: '월 슬라이드', phase: 'warmup',
    mode: 'reps', reps: 10, secPerRep: 3, gear: 'wall',
    cue: '등·팔꿈치·손등을 벽에 붙인 채 팔을 위아래로. 허리가 벽에서 뜨지 않게.',
    why: '머리 위로 미는 동작 전에 어깨 가동범위를 확보한다.',
    discSafe: true
  },
  open_book: {
    kr: '오픈 북 (흉추 회전)', phase: 'warmup',
    mode: 'repsPerSide', reps: 6, secPerRep: 4, gear: 'mat',
    cue: '옆으로 누워 무릎은 붙인 채 위쪽 팔만 크게 연다. 가슴부터 돌리고, 허리를 비틀지 않는다.',
    why: '흉추(등 상부) 회전이다. 허리를 비트는 동작은 디스크에 전단력이 걸려 이 앱에서 아예 뺐다.',
    discSafe: true
  },
  straight_arm_pulldown: {
    kr: '스트레이트 암 풀다운 (밴드)', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'band',
    cue: '팔을 편 채 광배로 아래로 누른다. 아주 가벼운 부하로. 밴드가 없으면 팔을 뻗어 뒤로 당기는 동작으로.',
    why: '당기는 날 쓸 광배 패턴을 미리 한 번 지나간다.',
    discSafe: true
  },
  prone_y_raise: {
    kr: '프론 Y-레이즈', phase: 'warmup',
    mode: 'reps', reps: 8, secPerRep: 3, gear: 'mat',
    cue: '엎드려 이마는 바닥이나 수건에. 허리를 젖히지 말고 팔만 Y자로 든다.',
    why: '등 하부 승모근·회전근개를 가볍게 준비시킨다.',
    discSafe: true
  },
  arm_circle: {
    kr: '팔 원 그리기', phase: 'warmup',
    mode: 'reps', reps: 20, secPerRep: 1.5, gear: 'none',
    cue: '앞으로 10회, 뒤로 10회. 작게 시작해 점점 크게.',
    why: '어깨는 가동범위가 크고 불안정한 관절이라 미리 움직여두면 편하다.',
    discSafe: true
  },
  band_external_rotation: {
    kr: '밴드 외회전', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'band',
    cue: '팔꿈치를 옆구리에 붙이고 아래팔만 바깥으로. 밴드가 없으면 팔꿈치 90도로 벽을 5초씩 5회 민다.',
    why: '회전근개를 그날 각도로 미리 지나가게 한다.',
    discSafe: true
  },
  glute_bridge: {
    kr: '글루트 브리지', phase: 'warmup',
    mode: 'reps', reps: 12, secPerRep: 4, gear: 'mat',
    cue: '누워서 엉덩이 들고 위에서 2초. 허리로 젖히지 말고 엉덩이로 민다 — 갈비뼈가 들리면 잘못된 것.',
    why: '요추 중립을 유지한 채 고관절 신전을 예행연습한다.',
    discSafe: true
  },
  bw_squat: {
    kr: '맨몸 스쿼트', phase: 'warmup',
    mode: 'reps', reps: 12, secPerRep: 3, gear: 'none',
    cue: '얕게 시작해 점점 깊게. 무릎이 안으로 모이지 않게.',
    why: '그날 쓸 패턴을 부하 없이 한 번 지나간다.',
    discSafe: true
  },
  reverse_lunge: {
    kr: '리버스 런지', phase: 'warmup',
    mode: 'repsPerSide', reps: 8, secPerRep: 3, gear: 'none',
    cue: '뒤로 내딛는다(앞으로보다 무릎 부담이 적다). 뒷다리 고관절 앞쪽이 늘어나는 느낌으로.',
    why: '한 다리 균형과 고관절 굴곡근 길이를 함께 준비한다.',
    discSafe: true
  },
  ankle_wall_knee: {
    kr: '벽 무릎 터치 (발목)', phase: 'warmup',
    mode: 'repsPerSide', reps: 10, secPerRep: 2, gear: 'wall',
    cue: '발뒤꿈치를 떼지 말고 무릎으로 벽을 터치한다.',
    why: '발목이 안 굽으면 스쿼트 깊이가 안 나온다.',
    discSafe: true
  },
  wrist_circle: {
    kr: '손목 원 그리기 + 굴곡·신전', phase: 'warmup',
    mode: 'reps', reps: 10, secPerRep: 2, gear: 'none',
    cue: '원을 10회 그리고, 손목을 위아래로 10회 접었다 편다.',
    why: '컬·푸시다운 전에 손목을 준비시킨다.',
    discSafe: true
  },
  elbow_flex_ext: {
    kr: '팔꿈치 굴곡-신전 (맨몸)', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'none',
    cue: '완전히 폈다가 완전히 접는다. 전체 가동범위로.',
    why: '팔 종목 전 관절 가동범위를 한 번 확인한다.',
    discSafe: true
  },
  band_curl_pushdown: {
    kr: '밴드 컬 + 밴드 푸시다운', phase: 'warmup',
    mode: 'reps', reps: 15, secPerRep: 2, gear: 'band',
    cue: '아주 가벼운 부하로 각 15회.',
    why: '그날 쓸 팔 패턴의 예행연습.',
    discSafe: true
  },

  // ── 스트레칭 (§3-B ~ §3-G) ─────────────────────────────
  // 전부 30초 안팎이다: ACSM(2011)의 "10~30초 × 2~4회 = 근육당 총 60초" 유지 기준을 맞춘 값이며,
  // 델파이 합의문의 "만성 유연성 향상(3세트×120초)" 기준에는 못 미친다 — 화면 문구도 그렇게 정직하게 쓴다(§2-A).
  doorway_chest: {
    kr: '도어웨이 가슴 스트레칭', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'wall',
    cue: '팔꿈치 90도, 어깨 높이로 문틀·기둥에 대고 몸통을 천천히 돌린다. 가벼운 당김까지만.',
    why: '미는 종목 뒤 가슴·어깨 전면의 가동범위를 지킨다.',
    discSafe: true
  },
  cross_body_rear_delt: {
    kr: '어깨 후면 크로스바디', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    cue: '팔을 몸 앞으로 가로질러 당긴다. 어깨가 위로 올라가지 않게.',
    why: '미는 날·당기는 날 모두 많이 쓰는 후면 삼각근의 가동범위 유지.',
    discSafe: true
  },
  overhead_triceps: {
    kr: '삼두 오버헤드', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    cue: '팔꿈치를 머리 뒤로 넘긴다. 허리가 젖혀지지 않게 배에 살짝 힘.',
    why: '삼두 장두는 어깨를 지나가므로 팔을 올려야 늘어난다.',
    discSafe: true
  },
  tspine_foamroll: {
    kr: '흉추 폼롤러 신전 (선택)', phase: 'stretch',
    mode: 'time', sec: 40, gear: 'foamroller', optional: true,
    cue: '폼롤러를 등 상부(날개뼈 높이)에만 댄다.',
    why: '폼롤링은 가동범위를 소폭 올리고 수행을 떨어뜨리지 않는다(Wiewelhove 2019). 해도 되고 안 해도 되는 항목.',
    warn: '허리(요추)에는 폼롤러를 직접 대지 않는다.',
    discSafe: true
  },
  standing_lat_hinge: {
    kr: '선 자세 광배 스트레칭', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    cue: '랙이나 문틀을 잡고 고관절 힌지로 엉덩이만 뒤로 뺀다. 허리는 중립 — 요추가 말리면 잘못된 것.',
    why: '무릎 꿇고 상체를 낮추는 차일드 포즈는 허리를 말기 때문에, 이 자세로 대신한다.',
    discSafe: true
  },
  biceps_wall: {
    kr: '이두 · 전완 벽 스트레칭', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'wall',
    cue: '손바닥을 벽에 대고 몸통을 반대쪽으로 천천히 돌린다.',
    why: '당기는 날·팔 날에 짧아지기 쉬운 이두와 전완의 가동범위 유지.',
    discSafe: true
  },
  seated_tspine_rotation: {
    kr: '앉아서 흉추 회전', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    cue: '의자에 앉아 가슴부터 돌린다. 허리로 비틀지 않는다.',
    why: '흉추 회전이 나오지 않으면 어깨와 허리가 대신 움직인다.',
    discSafe: true
  },
  neck_lateral: {
    kr: '목 · 승모근 측면', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    cue: '머리를 옆으로 기울이고 반대 손은 아래로. 당기지 말고 머리 무게만 쓴다.',
    why: '어깨 종목 뒤 위쪽 승모근이 짧아진 느낌을 푼다.',
    discSafe: true
  },
  supine_hamstring_strap: {
    kr: '누워서 스트랩 햄스트링', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'mat',
    cue: '바닥에 누워 수건·밴드를 발바닥에 걸고 다리를 든다. 허리는 바닥에 붙인 채로. 반대쪽 무릎은 세워도 된다.',
    why: '바닥이 허리를 받쳐 중립이 강제된다. 선 채 발끝 닿기를 대신하는 가장 중요한 동작이다.',
    discSafe: true
  },
  lunge_hipflexor: {
    kr: '런지 자세 고관절 굴곡근', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'mat',
    cue: '뒷다리 쪽 엉덩이를 앞으로 밀며 골반을 살짝 뒤로 말아 허리가 젖혀지지 않게 한다.',
    why: '오래 앉아 있으면 짧아지는 부위. 골반을 말지 않으면 허리로 늘어난다.',
    discSafe: true
  },
  supine_figure4: {
    kr: '누워서 90/90 둔근 (피겨-4)', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'mat',
    cue: '누운 채 발목을 반대쪽 무릎에 걸고 허벅지를 당긴다.',
    why: '앉아서 상체를 숙이는 비둘기 자세 대신, 바닥에 누워 허리를 보호한다.',
    discSafe: true
  },
  calf_wall: {
    kr: '종아리 벽 스트레칭', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'wall',
    cue: '뒷발 뒤꿈치를 바닥에 붙이고 벽을 밀듯 앞으로 기댄다.',
    why: '발목 가동범위는 스쿼트 깊이에 직접 영향을 준다.',
    discSafe: true
  },
  quad_standing: {
    kr: '대퇴사두 (서서)', phase: 'stretch',
    mode: 'timePerSide', sec: 30, gear: 'none',
    cue: '무릎을 뒤로 접어 발목을 잡는다. 골반은 중립 — 허리가 젖혀지면 잘못된 것. 균형이 안 잡히면 옆으로 누워서.',
    why: '대퇴사두는 무릎을 접어야 늘어난다. 허리를 젖혀 보상하기 쉬운 동작이라 골반 위치가 핵심.',
    discSafe: true
  },
  wrist_flexor_extensor: {
    kr: '손목 굴곡근 · 신전근', phase: 'stretch',
    mode: 'time', sec: 40, gear: 'none',
    cue: '손바닥을 위로 20초, 아래로 뒤집어 20초.',
    why: '컬·데드행이 많은 날 전완 가동범위 유지.',
    discSafe: true
  },
  standing_side_bend: {
    kr: '서서 옆구리 측굴', phase: 'stretch',
    mode: 'timePerSide', sec: 20, gear: 'none',
    cue: '한 손을 머리 위로 올려 옆으로만 기운다. 앞으로 숙이거나 비틀지 않는다.',
    why: '굴곡·회전을 섞지 않으면 요추에 안전한 범위에서 옆구리를 늘릴 수 있다.',
    discSafe: true
  },
  breathing_9090: {
    kr: '누워서 90/90 호흡', phase: 'stretch',
    mode: 'time', sec: 60, gear: 'mat',
    cue: '다리를 의자·벽에 90도로 올리고 코로 4초 들이쉬고 6초 내쉰다. 갈비뼈를 내리는 감각.',
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
