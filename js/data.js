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
  injury: { kr: '부상·제약', emoji: '🤕' },
  preference: { kr: '선호', emoji: '❤️' },
  goal: { kr: '목표', emoji: '🎯' },
  schedule: { kr: '일정', emoji: '📅' },
  other: { kr: '기타', emoji: '📝' }
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
  '어시스트 딥스': 66.67,
  
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
    exerciseCount: 7,
    setCount: 21,
    exercises: [
      { name: '머신 체스트 프레스', type: '머신', sets: 3, reps: '8-10', lastWeight: 60 },
      { name: '랫 풀 다운', type: '머신', sets: 3, reps: '8-12', lastWeight: 50 },
      { name: '머신 시티드 숄더 프레스', type: '머신', sets: 3, reps: '8-10', lastWeight: 40 },
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
var EXERCISE_CLASS_RULES = {
  compound_heavy:    { repMin: 5,  repMax: 8,  doubleSessions: 2, kr: '고중량 복합' },
  compound_moderate: { repMin: 8,  repMax: 12, doubleSessions: 1, kr: '중강도 복합' },
  isolation:         { repMin: 12, repMax: 15, doubleSessions: 1, kr: '고립' },
  light_isolation:   { repMin: 15, repMax: 25, doubleSessions: 2, kr: '경량 고립' },
  rehab:             { repMin: 15, repMax: 20, doubleSessions: 0, kr: '재활' }
};

// 클래스 명시 지정 (휴리스틱보다 우선). 페이스 풀은 사용자 어깨 재활 목적 → rehab.
var EXERCISE_CLASS_OVERRIDES = {
  '밴드 외회전': 'rehab',
  '클램쉘': 'rehab',
  '터미널 니 익스텐션': 'rehab',
  '페이스 풀': 'rehab'
};

// 재활 키워드 (미등록 종목 이름에서 감지)
var REHAB_NAME_KEYWORDS = ['밴드', '외회전', '내회전', '클램쉘', 'TKE', '터미널 니'];

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
    sub: { lower_back: '랫풀다운' },
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
    sub: { lower_back: '머신 시티드 숄더 프레스', shoulder: '사이드 레터럴 레이즈', wrist: '숄더 프레스 머신' },
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
    sub: { shoulder: '머신 체스트 프레스', wrist: '체스트 프레스 머신' },
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
    sub: { elbow: '해머 컬' },
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
    sub: { lower_back: '레그 익스텐션' },
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
    sub: { elbow: '랫풀다운' },
    mod: { elbow: '무게를 낮추고 통증이 없으면 유지하되 불편하면 중립·회내 그립으로 바꾼다.' },
    why: { elbow: '고정된 회외 그립이 내측 상과 굴곡근 기시부에 스트레스를 주지만 부하 조절이 가능해 관리 여지가 있다.' }
  },
  '리버스 브이 스쿼트': {
    caution: ['lower_back', 'knee'],
    sub: { lower_back: '레그 익스텐션', knee: '레그 프레스' },
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
    sub: { shoulder: '사이드 레터럴 레이즈' },
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
    sub: { wrist: '해머 컬', elbow: '해머 컬' },
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
    sub: { lower_back: '레그 익스텐션', knee: '레그 프레스' },
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
    sub: { shoulder: '사이드 레터럴 레이즈' },
    mod: { shoulder: '시트를 낮춰 시작점을 귀 높이 이상으로 올리고 통증 없는 부분 가동범위·가벼운 무게로 한다.' },
    why: { shoulder: '오버헤드 프레스 궤적이 견봉하 충돌 각도를 통과하고 머신 고정 궤적이 견갑 움직임을 제한한다.' }
  },
  '스미스 머신 스쿼트': {
    caution: ['lower_back', 'shoulder', 'knee'],
    sub: { lower_back: '레그 익스텐션', shoulder: '레그 프레스', knee: '레그 프레스' },
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
    sub: { lower_back: '머신 시티드 숄더 프레스', shoulder: '사이드 레터럴 레이즈', wrist: '머신 시티드 숄더 프레스' },
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
    sub: { shoulder: '랫풀다운', wrist: '랫풀다운', elbow: '랫풀다운' },
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
    sub: { elbow: '해머 컬' },
    mod: { elbow: '하단에서 완전 신전 전에 멈추는 부분 가동범위로 가벼운 무게만 사용한다.' },
    why: { elbow: '패드가 상완을 고정한 채 팔꿈치 완전 신전 부근에서 굴곡근 힘줄에 최대 인장 스트레스가 걸리는 구간이 생긴다.' }
  },
  '인클라인 덤벨 와이 레이즈': {
    rehab: ['shoulder'],
    why: { shoulder: '하부 승모근과 견갑 상방회전 근육을 강화해 견봉하 공간을 넓히는 충돌증후군 재활의 대표 운동이다.' }
  },
  '인클라인 덤벨 컬': {
    caution: ['shoulder', 'elbow'],
    sub: { shoulder: '덤벨 얼터네이트 컬', elbow: '해머 컬' },
    mod: { shoulder: '벤치 등받이를 더 세워 어깨가 뒤로 젖혀지는 각도를 줄인다.', elbow: '하단 완전 신전 구간을 제한하고 손목을 중립에 가깝게 유지하며 가볍게 수행한다.' },
    why: { shoulder: '어깨 신전 상태의 스트레치가 견관절을 지나는 이두 장두 힘줄과 전방 어깨에 부담을 준다.', elbow: '팔이 몸 뒤로 신장된 위치에서 원위 이두·팔꿈치 굴곡근에 긴 근길이 인장 스트레스가 커진다.' }
  },
  '인클라인 덤벨 프레스': {
    caution: ['shoulder', 'wrist'],
    sub: { shoulder: '머신 체스트 프레스', wrist: '체스트 프레스 머신' },
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
    sub: { shoulder: '리버스 그립 랫 풀 다운', wrist: '랫 풀 다운', elbow: '랫풀다운' },
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
    sub: { shoulder: '트라이셉스 푸시다운', elbow: '케이블 푸시 다운' },
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
    sub: { wrist: '해머 컬', elbow: '해머 컬' },
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
    sub: { shoulder: '랫풀다운', wrist: '랫풀다운', elbow: '랫풀다운' },
    mod: { shoulder: '밴드나 어시스트로 부하를 줄이고 통증 없는 가동범위에서만 당긴다.', wrist: '어시스트 머신이나 밴드로 부하를 크게 줄이고 통증 없는 범위에서 수행한다.', elbow: '밴드 보조로 부하를 줄이고 통증 없는 범위에서만 수행한다.' },
    why: { shoulder: '체중 전체가 어깨 최대 굴곡(오버헤드) 자세에 걸려 손상된 회전근개에 부하 조절이 불가능하다.', wrist: '체중 전체가 매달린 손목과 악력에 실려 손상 부위에 큰 견인·압박 부하가 간다.', elbow: '체중 부하의 팔꿈치 굴곡과 강한 악력 요구가 상과 기시부 힘줄을 자극할 수 있다.' }
  },
  '풀오버': {
    caution: ['shoulder'],
    sub: { shoulder: '랫풀다운' },
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
    sub: { lower_back: '레그 익스텐션', knee: '레그 프레스' },
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
    sub: { wrist: '해머 컬', elbow: '해머 컬' },
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
    sub: { lower_back: '머신 시티드 로우', wrist: '시티드 로우 머신' },
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
  '- 휴식: 복합 2~3분, 고립 1~2분. 너무 짧으면 다음 세트 수행 볼륨이 떨어져 손해 (Schoenfeld 2016).\n' +
  '- 점진적 과부하: 더블 프로그레션이 기본. 목표 횟수 상단을 2세션 연속 달성하면 무게 +한 칸(장비 단위: 덤벨 2kg·머신·케이블·바벨·스미스 5kg), 횟수는 하단으로 리셋.\n' +
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

  '### 8. 워밍업·가동성\n' +
  '- 본운동 전 일반 워밍업(가벼운 유산소 5분) + 해당 종목 점진적 램프업 세트(빈봉~목표무게로 2~4세트). 정적 스트레칭을 본세트 직전 길게 하는 건 권장하지 않음.\n' +
  '- 가동성 부족(발목/고관절/흉추/어깨)은 자세를 무너뜨림. 문제 부위 위주로 짧은 동적 가동성 루틴을 운동 전 배치.\n\n' +

  '### 9. 강도·진행 기법 (정체 돌파)\n' +
  '- 더블 프로그레션: 목표 횟수 상단 도달 → 무게↑ → 하단부터 다시. 가장 단순하고 신뢰도 높은 진행.\n' +
  '- 정체 시: 무게 +한 칸(덤벨 2kg·그 외 5kg) 도전, 종목/각도 변경, 볼륨 소폭↑, 또는 디로드 후 재도전 중 하나.\n' +
  '- 보조 기법(고립·마무리 한정): 드롭셋(실패 후 무게 내려 이어가기), 슈퍼셋(시간 절약), 렉스트포즈(짧은 휴식 후 추가 반복). 메인 복합운동보다는 고립/마무리 세트에 적합하며 회복 비용을 고려해 과용 금지.\n';
