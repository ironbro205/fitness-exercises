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
      { name: '체스트 프레스 머신', type: '머신', sets: 3, reps: '8-10', lastWeight: 60 },
      { name: '인클라인 덤벨 프레스', type: '덤벨', sets: 3, reps: '10-12', lastWeight: 20 },
      { name: '숄더 프레스 머신', type: '머신', sets: 3, reps: '8-10', lastWeight: 40 },
      { name: '사이드 레터럴 레이즈', type: '덤벨', sets: 3, reps: '12-15', lastWeight: 8 },
      { name: '펙덱 플라이', type: '머신', sets: 3, reps: '12-15', lastWeight: 35 },
      { name: '트라이셉스 푸시다운', type: '케이블', sets: 3, reps: '10-15', lastWeight: 25 }
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
      { name: '랫풀다운', type: '머신', sets: 3, reps: '8-12', lastWeight: 50 },
      { name: '시티드 로우 머신', type: '머신', sets: 3, reps: '8-12', lastWeight: 55 },
      { name: '페이스 풀', type: '케이블', sets: 3, reps: '12-15', lastWeight: 20 },
      { name: '인클라인 덤벨 컬', type: '덤벨', sets: 3, reps: '10-12', lastWeight: 10 },
      { name: '해머 컬', type: '덤벨', sets: 3, reps: '10-15', lastWeight: 12 }
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
      { name: '레그 익스텐션', type: '머신', sets: 3, reps: '12-15', lastWeight: 45 },
      { name: '시티드 햄스트링 컬', type: '머신', sets: 3, reps: '10-12', lastWeight: 35 },
      { name: '힙 어덕션', type: '머신', sets: 3, reps: '15', lastWeight: 40 },
      { name: '핵 스쿼트', type: '머신', sets: 3, reps: '8-10', lastWeight: 60 },
      { name: '카프 레이즈 머신', type: '머신', sets: 3, reps: '15-20', lastWeight: 80 }
    ]
  },
  upper: {
    name: 'UPPER',
    description: '상체 전체 · 가슴·등·어깨·팔',
    duration: 55,
    exerciseCount: 7,
    setCount: 21,
    exercises: [
      { name: '체스트 프레스 머신', type: '머신', sets: 3, reps: '8-10', lastWeight: 60 },
      { name: '랫풀다운', type: '머신', sets: 3, reps: '8-12', lastWeight: 50 },
      { name: '숄더 프레스 머신', type: '머신', sets: 3, reps: '8-10', lastWeight: 40 },
      { name: '시티드 로우 머신', type: '머신', sets: 3, reps: '8-12', lastWeight: 55 },
      { name: '사이드 레터럴 레이즈', type: '덤벨', sets: 3, reps: '12-15', lastWeight: 8 },
      { name: '인클라인 덤벨 컬', type: '덤벨', sets: 3, reps: '10-12', lastWeight: 10 },
      { name: '트라이셉스 푸시다운', type: '케이블', sets: 3, reps: '10-15', lastWeight: 25 }
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
// 종목 → 부위 매핑 (균형 분석용)
// ═══════════════════════════════════════════════
var EXERCISE_BODY_PART_MAP = {
  // 가슴 (chest)
  '머신 체스트 프레스': { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: false, angle: 'flat' },
  '체스트 프레스 머신': { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: false, angle: 'flat' },
  '스미스 인클라인 벤치 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'incline' },
  '덤벨 인클라인 벤치 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'incline' },  // 표준명 (1RM 데이터 키)
  '덤벨 벤치 프레스': { primary: 'chest', secondary: ['shoulders_front', 'triceps'], compound: true, mainEligible: true, angle: 'flat' },
  '머신 펙 덱 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true },
  '펙덱 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true },
  '케이블 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true },
  '케이블 크로스오버': { primary: 'chest_lower', secondary: [], compound: false, mainEligible: false, angle: 'decline', stretched: true },
  '덤벨 플라이': { primary: 'chest', secondary: [], compound: false, mainEligible: false, angle: 'flat', stretched: true },
  
  // 어깨 (shoulders)
  // 프레스류 보조부위에서 '어깨 측면(shoulders_side)' 제외: 오버헤드 프레스는 전면(front) 주동 + 삼두 보조이며,
  // 측면 델트 근비대 자극은 미미하다(측면은 사이드 레터럴 레이즈 같은 직접 고립이 필요). 근거: RP/Helms/Schoenfeld.
  '머신 시티드 숄더 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: false },
  '숄더 프레스 머신': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: false },
  '덤벨 숄더 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: true },
  '덤벨 아놀드 프레스': { primary: 'shoulders_front', secondary: ['triceps'], compound: true, mainEligible: true },
  '덤벨 사이드 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, mainEligible: false },
  '사이드 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, mainEligible: false },
  '케이블 원 암 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, mainEligible: false, stretched: true },
  '리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false, mainEligible: false },
  '원암 리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: [], compound: false, mainEligible: false },
  '페이스 풀': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false, mainEligible: false },
  
  // 삼두 (triceps)
  '케이블 푸시 다운': { primary: 'triceps', secondary: [], compound: false, mainEligible: false },
  '트라이셉스 푸시다운': { primary: 'triceps', secondary: [], compound: false, mainEligible: false },
  '케이블 오버헤드 트라이셉스 익스텐션': { primary: 'triceps', secondary: [], compound: false, mainEligible: false, stretched: true },
  '케이블 트라이셉스 킥백': { primary: 'triceps', secondary: [], compound: false, mainEligible: false },
  '어시스트 딥스': { primary: 'chest_lower', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: true },  // 상체 전방 기울임 = 가슴 강조 (사용자 기본). 직립 + 좁은 그립이면 삼두 강조.
  '딥스': { primary: 'chest_lower', secondary: ['triceps', 'shoulders_front'], compound: true, mainEligible: true },
  '클로즈 그립 벤치 프레스': { primary: 'triceps', secondary: ['chest', 'shoulders_front'], compound: true, mainEligible: false },
  
  // 등/광배 (back/lats)
  '풀업': { primary: 'lats', secondary: ['biceps', 'upper_back'], compound: true, mainEligible: true },
  '친업': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: true },
  '랫풀다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false },
  '랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false },
  '클로즈 그립 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false },
  '리버스 그립 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true, mainEligible: false },
  '머신 시티드 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false },
  '시티드 로우 머신': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false },
  '케이블 시티드 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false },
  'T 바 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: false },
  '덤벨 인클라인 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: true },
  '덤벨 로우': { primary: 'lats', secondary: ['upper_back', 'biceps'], compound: true, mainEligible: true },
  '바벨 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true, mainEligible: true },
  '케이블 암 풀 다운': { primary: 'lats', secondary: [], compound: false, mainEligible: false, stretched: true },
  '풀오버': { primary: 'lats', secondary: ['chest'], compound: false, mainEligible: false, stretched: true },
  '케이블 슈러그': { primary: 'traps', secondary: [], compound: false, mainEligible: false },
  '켈소 슈러그': { primary: 'upper_back', secondary: ['traps'], compound: false, mainEligible: false },
  '덤벨 슈러그': { primary: 'traps', secondary: [], compound: false, mainEligible: false },
  
  // 이두 (biceps)
  '바벨 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false },
  '덤벨 해머 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false },
  '해머 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false },
  '덤벨 프리처 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false },
  '이지 바 프리처 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false },
  '인클라인 덤벨 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false, stretched: true },
  '덤벨 얼터네이트 컬': { primary: 'biceps', secondary: ['forearms'], compound: false, mainEligible: false },
  '컨센트레이션 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false },
  '케이블 컬': { primary: 'biceps', secondary: [], compound: false, mainEligible: false },
  
  // 하체 - 대퇴사두
  '레그 프레스': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true },
  '핵 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true, mainEligible: true },
  '리버스 브이 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true, mainEligible: false },
  '스미스 머신 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true },
  '바벨 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true },
  '프론트 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true, mainEligible: true },
  '머신 레그 익스텐션': { primary: 'quads', secondary: [], compound: false, mainEligible: false },
  '레그 익스텐션': { primary: 'quads', secondary: [], compound: false, mainEligible: false },
  '시시 스쿼트': { primary: 'quads', secondary: [], compound: false, mainEligible: false, stretched: true },
  
  // 하체 - 햄스트링/둔근
  '바벨 루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, mainEligible: true, stretched: true },
  '덤벨 루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, mainEligible: true, stretched: true },
  '루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, mainEligible: true, stretched: true },
  '데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back', 'upper_back'], compound: true, mainEligible: true },
  '머신 라잉 레그 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false },
  '라잉 레그 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false },
  '시티드 레그 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false, stretched: true },
  '햄스트링 컬': { primary: 'hamstrings', secondary: [], compound: false, mainEligible: false },
  '머신 힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: false },
  '바벨 힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: true },
  '힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true, mainEligible: false },
  '머신 힙 어브덕션': { primary: 'glutes_med', secondary: [], compound: false, mainEligible: false },
  '힙 어덕션': { primary: 'adductors', secondary: [], compound: false, mainEligible: false },
  '힙 어브덕션': { primary: 'glutes_med', secondary: [], compound: false, mainEligible: false },
  '덤벨 불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true },
  '불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true },
  '덤벨 싱글 레그 데드리프트': { primary: 'hamstrings', secondary: ['glutes'], compound: true, mainEligible: true, stretched: true },
  '런지': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true, mainEligible: true },
  
  // 종아리
  '카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true },
  '시티드 카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true },
  '스탠딩 카프 레이즈': { primary: 'calves', secondary: [], compound: false, mainEligible: false, stretched: true },
  
  // 코어
  '머신 시티드 크런치': { primary: 'abs', secondary: [], compound: false, mainEligible: false },
  '크런치': { primary: 'abs', secondary: [], compound: false, mainEligible: false },
  '케이블 닐링 사이드 크런치': { primary: 'obliques', secondary: ['abs'], compound: false, mainEligible: false },
  '러시안 트위스트': { primary: 'obliques', secondary: ['abs'], compound: false, mainEligible: false },
  '플랭크': { primary: 'abs', secondary: ['obliques'], compound: false, mainEligible: false },
  '인클라인 덤벨 와이 레이즈': { primary: 'shoulders_rear', secondary: ['traps'], compound: false, mainEligible: false },

  // 재활 (부상 부위 강화 목적 — 무게 진행 없음, 진행 지표 = 통증 감소)
  '밴드 외회전': { primary: 'shoulders_rear', secondary: [], compound: false, mainEligible: false },
  '클램쉘': { primary: 'glutes_med', secondary: [], compound: false, mainEligible: false },
  '터미널 니 익스텐션': { primary: 'quads', secondary: [], compound: false, mainEligible: false }
};

// primary 부위별 종목 이름 인덱스 (종목 변경 시트 등에서 O(1) 조회)
var EXERCISES_BY_PRIMARY = (function() {
  var idx = {};
  Object.keys(EXERCISE_BODY_PART_MAP).forEach(function(name) {
    var info = EXERCISE_BODY_PART_MAP[name];
    if (!info || !info.primary) return;
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
  forearms:        ['덤벨 해머 컬(이두 보조 자극)', '바벨 컬(이두 보조 자극)'],
  quads:           ['레그 프레스', '핵 스쿼트', '머신 레그 익스텐션', '덤벨 불가리안 스플릿 스쿼트'],
  hamstrings:      ['바벨 루마니안 데드리프트', '시티드 레그 컬', '머신 라잉 레그 컬'],
  glutes:          ['머신 힙 쓰러스트', '머신 힙 어브덕션'],
  adductors:       ['힙 어덕션'],
  calves:          ['시티드 카프 레이즈', '스탠딩 카프 레이즈'],
  abs:             ['머신 시티드 크런치', '케이블 닐링 사이드 크런치'],
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
  '- 빈도: 같은 부위 주 2회 자극이 1회보다 우월. 주간 볼륨이 같다면 2회 분할이 유리 (Schoenfeld 2016 메타).\n' +
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

  '### 6. 보충제 (근거 등급순)\n' +
  '- 크레아틴 모노하이드레이트: 가장 입증된 근력·근비대 보조. 매일 3~5g, 로딩 불필요(꾸준함이 핵심). 안전 (ISSN).\n' +
  '- 카페인: 운동 약 60분 전 3~6 mg/kg으로 근력·파워·근지구력 소폭 향상. 약 2mg/kg부터 효과 가능, 9mg/kg 이상은 부작용↑·추가 이득 없음 (ISSN 2021, Guest).\n' +
  '- 그 외(시트룰린·베타알라닌 등)는 효과가 작거나 상황 한정. 크레아틴·카페인이 우선.\n\n' +

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
