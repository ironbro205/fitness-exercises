// js/data.js — 정적 데이터 테이블 (음식·운동·세션·부위 맵, 아이콘)
'use strict';
// ═══════════════════════════════════════════════
// 기본 프로필
// ═══════════════════════════════════════════════
var DEFAULT_PROFILE = {
  age: 37,
  height: 170,
  weight: 77.5,
  proteinTarget: 155,
  calorieTarget: 2360,
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
  units: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>'
};

// ═══════════════════════════════════════════════
// 한국 음식 영양 DB (영양_과학.md 기반)
// ═══════════════════════════════════════════════
// 형식: name → [단백질g, 칼로리, 탄수g, 지방g] per 100g 또는 표준량
var FOOD_DB = {
  // 동물성 단백질 (100g 기준)
  '닭가슴살': { p: 23, kcal: 165, c: 0, f: 3.6, unit: 'g', defaultAmount: 100 },
  '닭다리살': { p: 20, kcal: 170, c: 0, f: 9, unit: 'g', defaultAmount: 100 },
  '닭갈비': { p: 20, kcal: 160, c: 5, f: 8, unit: 'g', defaultAmount: 300, presetLabel: '1인분 300g' },
  '소고기': { p: 26, kcal: 250, c: 0, f: 15, unit: 'g', defaultAmount: 100 },
  '돼지안심': { p: 22, kcal: 145, c: 0, f: 4, unit: 'g', defaultAmount: 100 },
  '돼지등심': { p: 21, kcal: 240, c: 0, f: 15, unit: 'g', defaultAmount: 100 },
  '삼겹살': { p: 18, kcal: 330, c: 0, f: 28, unit: 'g', defaultAmount: 200, presetLabel: '1인분 200g' },
  '제육볶음': { p: 18, kcal: 220, c: 8, f: 13, unit: 'g', defaultAmount: 200 },
  '연어': { p: 25, kcal: 208, c: 0, f: 13, unit: 'g', defaultAmount: 100 },
  '고등어': { p: 21, kcal: 200, c: 0, f: 13, unit: 'g', defaultAmount: 100 },
  '참치캔': { p: 25, kcal: 110, c: 0, f: 1, unit: 'g', defaultAmount: 100 },
  '대구': { p: 18, kcal: 90, c: 0, f: 0.7, unit: 'g', defaultAmount: 100 },
  '계란': { p: 6, kcal: 70, c: 0.4, f: 5, unit: '개', defaultAmount: 1 },
  '달걀': { p: 6, kcal: 70, c: 0.4, f: 5, unit: '개', defaultAmount: 1 },
  '그릭요거트': { p: 10, kcal: 60, c: 4, f: 0.5, unit: 'g', defaultAmount: 150 },
  '우유': { p: 3.5, kcal: 50, c: 5, f: 2, unit: 'ml', defaultAmount: 200 },
  '코티지치즈': { p: 11, kcal: 100, c: 3, f: 4, unit: 'g', defaultAmount: 100 },
  
  // 한국 음식 (1인분 기준)
  '비빔밥': { p: 30, kcal: 600, c: 90, f: 12, unit: '인분', defaultAmount: 1 },
  '김치찌개': { p: 25, kcal: 350, c: 15, f: 18, unit: '그릇', defaultAmount: 1 },
  '된장찌개': { p: 12, kcal: 200, c: 18, f: 8, unit: '그릇', defaultAmount: 1 },
  '부대찌개': { p: 28, kcal: 500, c: 30, f: 25, unit: '인분', defaultAmount: 1 },
  '김밥': { p: 8, kcal: 320, c: 50, f: 8, unit: '줄', defaultAmount: 1 },
  '회': { p: 20, kcal: 110, c: 0, f: 2, unit: 'g', defaultAmount: 200, presetLabel: '1인분 200g' },
  '치킨': { p: 27, kcal: 290, c: 9, f: 18, unit: 'g', defaultAmount: 200 },
  '라면': { p: 8, kcal: 500, c: 80, f: 14, unit: '개', defaultAmount: 1 },
  
  // 탄수화물
  '흰밥': { p: 6, kcal: 300, c: 65, f: 0.5, unit: '공기', defaultAmount: 1 },
  '현미밥': { p: 7, kcal: 320, c: 65, f: 2, unit: '공기', defaultAmount: 1 },
  '잡곡밥': { p: 8, kcal: 310, c: 60, f: 2, unit: '공기', defaultAmount: 1 },
  '바나나': { p: 1.3, kcal: 100, c: 27, f: 0.3, unit: '개', defaultAmount: 1 },
  '고구마': { p: 1.6, kcal: 120, c: 28, f: 0.1, unit: '개', defaultAmount: 1 },
  '오트밀': { p: 13, kcal: 380, c: 67, f: 7, unit: 'g', defaultAmount: 50 },
  '떡': { p: 4, kcal: 220, c: 50, f: 0.5, unit: 'g', defaultAmount: 100 },
  
  // 견과류 & 보충제
  '아몬드': { p: 21, kcal: 580, c: 22, f: 50, unit: 'g', defaultAmount: 20 },
  '땅콩': { p: 25, kcal: 567, c: 16, f: 49, unit: 'g', defaultAmount: 20 },
  '두부': { p: 8, kcal: 76, c: 2, f: 5, unit: 'g', defaultAmount: 150 },
  '낫토': { p: 18, kcal: 200, c: 12, f: 11, unit: '팩', defaultAmount: 1 },
  
  // 보충제
  '웨이프로틴': { p: 24, kcal: 120, c: 3, f: 2, unit: '스쿱', defaultAmount: 1 },
  '카제인프로틴': { p: 24, kcal: 110, c: 3, f: 1, unit: '스쿱', defaultAmount: 1 },
  '프로틴쉐이크': { p: 24, kcal: 130, c: 4, f: 2, unit: '스쿱', defaultAmount: 1 },
  
  // 김치류 (부가)
  '김치': { p: 2, kcal: 30, c: 5, f: 0.5, unit: 'g', defaultAmount: 50 },
  '깍두기': { p: 1, kcal: 40, c: 8, f: 0.3, unit: 'g', defaultAmount: 50 }
};

// 별칭 (사용자가 다양하게 부르는 이름)
var FOOD_ALIASES = {
  '치킨가슴살': '닭가슴살',
  '닭가슴': '닭가슴살',
  '치킨브레스트': '닭가슴살',
  '닭다리': '닭다리살',
  '연어회': '연어',
  '광어': '회',
  '회덮밥': '회',
  '소시지': '돼지등심',
  '안심': '돼지안심',
  '등심': '돼지등심',
  '돼지고기': '돼지등심',
  '소불고기': '소고기',
  '닭볶음탕': '닭갈비',
  '계란후라이': '계란',
  '계란프라이': '계란',
  '스크램블': '계란',
  '오믈렛': '계란',
  '요거트': '그릭요거트',
  '코티지': '코티지치즈',
  '백미': '흰밥',
  '쌀밥': '흰밥',
  '밥': '흰밥',
  '비빔국수': '비빔밥',
  '김치국': '김치찌개',
  '치킨가라아게': '치킨',
  '후라이드치킨': '치킨',
  '양념치킨': '치킨',
  '프로틴': '웨이프로틴',
  '단백질쉐이크': '웨이프로틴',
  '쉐이크': '웨이프로틴'
};

// 양 단위 (정규식)
var AMOUNT_PATTERNS = [
  { regex: /(\d+\.?\d*)\s*g/, unit: 'g', multiplier: 1 },
  { regex: /(\d+\.?\d*)\s*ml/, unit: 'ml', multiplier: 1 },
  { regex: /(\d+)\s*개/, unit: '개', multiplier: 1 },
  { regex: /(\d+\.?\d*)\s*인분/, unit: '인분', multiplier: 1 },
  { regex: /(\d+\.?\d*)\s*그릇/, unit: '그릇', multiplier: 1 },
  { regex: /(\d+\.?\d*)\s*공기/, unit: '공기', multiplier: 1 },
  { regex: /(\d+)\s*줄/, unit: '줄', multiplier: 1 },
  { regex: /(\d+\.?\d*)\s*스쿱/, unit: '스쿱', multiplier: 1 },
  { regex: /(\d+)\s*팩/, unit: '팩', multiplier: 1 },
  { regex: /반\s*공기/, unit: '공기', multiplier: 0.5, fixed: true },
  { regex: /반\s*인분/, unit: '인분', multiplier: 0.5, fixed: true },
  { regex: /반\s*그릇/, unit: '그릇', multiplier: 0.5, fixed: true },
  { regex: /한\s*공기/, unit: '공기', multiplier: 1, fixed: true },
  { regex: /두\s*공기/, unit: '공기', multiplier: 2, fixed: true },
  { regex: /한\s*인분/, unit: '인분', multiplier: 1, fixed: true },
  { regex: /한\s*줌/, unit: 'g', multiplier: 20, fixed: true }
];

// 세션별 종목 GIF URL 매핑 (Vercel 호스팅 데이터 활용)
var EXERCISE_GIFS = {
  '체스트 프레스 머신': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0577-T0yTjgW.gif',
  '인클라인 덤벨 프레스': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0314-ns0SIbU.gif',
  '숄더 프레스 머신': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0603-67n3r98.gif',
  '사이드 레터럴 레이즈': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0178-goJ6ezq.gif',
  '펙덱 플라이': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0596-v3xmPAR.gif',
  '트라이셉스 푸시다운': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0201-3ZflifB.gif',
  '풀업': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0017-kiJ4Z2K.gif',
  '랫풀다운': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2330-LEprlgG.gif',
  '시티드 로우 머신': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0861-fUBheHs.gif',
  '페이스 풀': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0203-wqNPGCg.gif',
  '인클라인 덤벨 컬': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0318-ae9UoXQ.gif',
  '해머 컬': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0165-HPlPoQA.gif',
  '레그 프레스': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1463-2Qh2J1e.gif',
  '레그 익스텐션': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0585-my33uHU.gif',
  '시티드 햄스트링 컬': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0599-Zg3XY7P.gif',
  '힙 어덕션': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0168-hBGWILP.gif',
  '핵 스쿼트': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0743-Qa55kX1.gif',
  '카프 레이즈 머신': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0594-bOOdeyc.gif'
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
  '머신 체스트 프레스': { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true, angle: 'flat' },
  '체스트 프레스 머신': { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true, angle: 'flat' },
  '스미스 인클라인 벤치 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, angle: 'incline' },
  '덤벨 인클라인 벤치 프레스': { primary: 'chest_upper', secondary: ['shoulders_front', 'triceps'], compound: true, angle: 'incline' },  // 표준명 (1RM 데이터 키)
  '덤벨 벤치 프레스': { primary: 'chest', secondary: ['shoulders_front', 'triceps'], compound: true, angle: 'flat' },
  '머신 펙 덱 플라이': { primary: 'chest', secondary: [], compound: false, angle: 'flat', stretched: true },
  '펙덱 플라이': { primary: 'chest', secondary: [], compound: false, angle: 'flat', stretched: true },
  '케이블 플라이': { primary: 'chest', secondary: [], compound: false, angle: 'flat', stretched: true },
  '케이블 크로스오버': { primary: 'chest_lower', secondary: [], compound: false, angle: 'decline', stretched: true },
  '덤벨 플라이': { primary: 'chest', secondary: [], compound: false, angle: 'flat', stretched: true },
  
  // 어깨 (shoulders)
  '머신 시티드 숄더 프레스': { primary: 'shoulders_front', secondary: ['shoulders_side', 'triceps'], compound: true },
  '숄더 프레스 머신': { primary: 'shoulders_front', secondary: ['shoulders_side', 'triceps'], compound: true },
  '덤벨 숄더 프레스': { primary: 'shoulders_front', secondary: ['shoulders_side', 'triceps'], compound: true },
  '덤벨 아놀드 프레스': { primary: 'shoulders_front', secondary: ['shoulders_side', 'triceps'], compound: true },
  '덤벨 사이드 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false },
  '사이드 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false },
  '케이블 원 암 레터럴 레이즈': { primary: 'shoulders_side', secondary: [], compound: false, stretched: true },
  '리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false },
  '원암 리버스 펙 덱 플라이': { primary: 'shoulders_rear', secondary: [], compound: false },
  '페이스 풀': { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false },
  
  // 삼두 (triceps)
  '케이블 푸시 다운': { primary: 'triceps', secondary: [], compound: false },
  '트라이셉스 푸시다운': { primary: 'triceps', secondary: [], compound: false },
  '케이블 오버헤드 트라이셉스 익스텐션': { primary: 'triceps', secondary: [], compound: false, stretched: true },
  '케이블 트라이셉스 킥백': { primary: 'triceps', secondary: [], compound: false },
  '어시스트 딥스': { primary: 'chest_lower', secondary: ['triceps', 'shoulders_front'], compound: true },  // 상체 전방 기울임 = 가슴 강조 (사용자 기본). 직립 + 좁은 그립이면 삼두 강조.
  '딥스': { primary: 'chest_lower', secondary: ['triceps', 'shoulders_front'], compound: true },
  '클로즈 그립 벤치 프레스': { primary: 'triceps', secondary: ['chest', 'shoulders_front'], compound: true },
  
  // 등/광배 (back/lats)
  '풀업': { primary: 'lats', secondary: ['biceps', 'upper_back'], compound: true },
  '친업': { primary: 'lats', secondary: ['biceps'], compound: true },
  '랫풀다운': { primary: 'lats', secondary: ['biceps'], compound: true },
  '랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true },
  '클로즈 그립 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true },
  '리버스 그립 랫 풀 다운': { primary: 'lats', secondary: ['biceps'], compound: true },
  '머신 시티드 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true },
  '시티드 로우 머신': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true },
  '케이블 시티드 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true },
  'T 바 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true },
  '덤벨 인클라인 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true },
  '덤벨 로우': { primary: 'lats', secondary: ['upper_back', 'biceps'], compound: true },
  '바벨 로우': { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true },
  '케이블 암 풀 다운': { primary: 'lats', secondary: [], compound: false, stretched: true },
  '풀오버': { primary: 'lats', secondary: ['chest'], compound: false, stretched: true },
  '케이블 슈러그': { primary: 'traps', secondary: [], compound: false },
  '켈소 슈러그': { primary: 'upper_back', secondary: ['traps'], compound: false },
  '덤벨 슈러그': { primary: 'traps', secondary: [], compound: false },
  
  // 이두 (biceps)
  '바벨 컬': { primary: 'biceps', secondary: ['forearms'], compound: false },
  '덤벨 해머 컬': { primary: 'biceps', secondary: ['forearms'], compound: false },
  '해머 컬': { primary: 'biceps', secondary: ['forearms'], compound: false },
  '덤벨 프리처 컬': { primary: 'biceps', secondary: [], compound: false },
  '이지 바 프리처 컬': { primary: 'biceps', secondary: [], compound: false },
  '인클라인 덤벨 컬': { primary: 'biceps', secondary: [], compound: false, stretched: true },
  '덤벨 얼터네이트 컬': { primary: 'biceps', secondary: ['forearms'], compound: false },
  '컨센트레이션 컬': { primary: 'biceps', secondary: [], compound: false },
  '케이블 컬': { primary: 'biceps', secondary: [], compound: false },
  
  // 하체 - 대퇴사두
  '레그 프레스': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true },
  '핵 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true },
  '리버스 브이 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true },
  '스미스 머신 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true },
  '바벨 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true },
  '프론트 스쿼트': { primary: 'quads', secondary: ['glutes'], compound: true },
  '머신 레그 익스텐션': { primary: 'quads', secondary: [], compound: false },
  '레그 익스텐션': { primary: 'quads', secondary: [], compound: false },
  '시시 스쿼트': { primary: 'quads', secondary: [], compound: false, stretched: true },
  
  // 하체 - 햄스트링/둔근
  '바벨 루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, stretched: true },
  '덤벨 루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, stretched: true },
  '루마니안 데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back'], compound: true, stretched: true },
  '데드리프트': { primary: 'hamstrings', secondary: ['glutes', 'lower_back', 'upper_back'], compound: true },
  '머신 라잉 레그 컬': { primary: 'hamstrings', secondary: [], compound: false },
  '라잉 레그 컬': { primary: 'hamstrings', secondary: [], compound: false },
  '시티드 레그 컬': { primary: 'hamstrings', secondary: [], compound: false, stretched: true },
  '햄스트링 컬': { primary: 'hamstrings', secondary: [], compound: false },
  '머신 힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true },
  '바벨 힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true },
  '힙 쓰러스트': { primary: 'glutes', secondary: ['hamstrings'], compound: true },
  '머신 힙 어브덕션': { primary: 'glutes_med', secondary: [], compound: false },
  '힙 어덕션': { primary: 'adductors', secondary: [], compound: false },
  '힙 어브덕션': { primary: 'glutes_med', secondary: [], compound: false },
  '덤벨 불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true },
  '불가리안 스플릿 스쿼트': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true },
  '덤벨 싱글 레그 데드리프트': { primary: 'hamstrings', secondary: ['glutes'], compound: true, stretched: true },
  '런지': { primary: 'quads', secondary: ['glutes', 'hamstrings'], compound: true },
  
  // 종아리
  '카프 레이즈': { primary: 'calves', secondary: [], compound: false, stretched: true },
  '시티드 카프 레이즈': { primary: 'calves', secondary: [], compound: false, stretched: true },
  '스탠딩 카프 레이즈': { primary: 'calves', secondary: [], compound: false, stretched: true },
  
  // 코어
  '머신 시티드 크런치': { primary: 'abs', secondary: [], compound: false },
  '크런치': { primary: 'abs', secondary: [], compound: false },
  '케이블 닐링 사이드 크런치': { primary: 'obliques', secondary: ['abs'], compound: false },
  '러시안 트위스트': { primary: 'obliques', secondary: ['abs'], compound: false },
  '플랭크': { primary: 'abs', secondary: ['obliques'], compound: false },
  '인클라인 덤벨 와이 레이즈': { primary: 'shoulders_rear', secondary: ['traps'], compound: false }
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

// 부위 그룹 (대분류) - 부위 균형 분석 및 합산 진단용
// 형식: 통합부위코드: { kr: '한국어명', subParts: ['세부 부위 코드들...'] }
var BODY_PART_GROUPS = {
  chest:           { kr: '가슴',       subParts: ['chest', 'chest_upper', 'chest_lower'] },
  shoulders_front: { kr: '어깨 전면',  subParts: ['shoulders_front'] },
  shoulders_side:  { kr: '어깨 측면',  subParts: ['shoulders_side'] },
  shoulders_rear:  { kr: '어깨 후면',  subParts: ['shoulders_rear'] },
  triceps:         { kr: '삼두',       subParts: ['triceps'] },
  lats:            { kr: '광배',       subParts: ['lats'] },
  upper_back:      { kr: '등 중부',    subParts: ['upper_back', 'traps'] },
  biceps:          { kr: '이두',       subParts: ['biceps'] },
  forearms:        { kr: '전완',       subParts: ['forearms'] },
  quads:           { kr: '대퇴사두',   subParts: ['quads'] },
  hamstrings:      { kr: '햄스트링',   subParts: ['hamstrings'] },
  glutes:          { kr: '둔근',       subParts: ['glutes', 'glutes_med'] },
  adductors:       { kr: '내전근',     subParts: ['adductors'] },
  calves:          { kr: '종아리',     subParts: ['calves'] },
  abs:             { kr: '복근',       subParts: ['abs', 'obliques'] },
  lower_back:      { kr: '요추',       subParts: ['lower_back'] }
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
