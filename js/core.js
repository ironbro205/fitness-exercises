// js/core.js — 저장소/state/날짜 유틸/init/공용 헬퍼
'use strict';
// ═══════════════════════════════════════════════
// 스토리지
// ═══════════════════════════════════════════════
var KEYS = {
  PROFILE: 'fitness_profile',
  WORKOUT_LOG: 'fitness_workout_log',
  CARDIO_LOG: 'fitness_cardio_log',
  BODY_LOG: 'fitness_body_log',
  PERSONAL_RECORDS: 'fitness_personal_records',
  INITIALIZED: 'fitness_initialized',
  EXERCISES_CACHE: 'fitness_exercises_cache',
  EXERCISES_VERSION: 'fitness_exercises_version',
  API_KEY: 'fitness_api_key',
  SETTINGS: 'fitness_settings',
  COACH_HISTORY: 'fitness_coach_history',
  AI_RECOMMENDATION: 'fitness_ai_recommendation',
  WEEKLY_REVIEW: 'fitness_weekly_review',
  PLATEAU_CHECK: 'fitness_plateau_check',
  ONE_RM_DATA: 'fitness_one_rm_data',
  ONE_RM_INITIALIZED: 'fitness_one_rm_initialized',
  CONDITION_LOG: 'fitness_condition_log',
  ACTIVE_SESSION: 'fitness_active_session',
  ACTIVE_CARDIO_RUN: 'fitness_active_cardio_run',
  REST_TIMER: 'fitness_rest_timer',
  WORKOUT_WIZARD: 'fitness_workout_wizard',
  CYCLE_HISTORY: 'fitness_cycle_history',
  COACH_MEMORY: 'fitness_coach_memory',
  AI_RECOMMENDATION_HISTORY: 'fitness_ai_recommendation_history'
};

var storage = {
  get: function(key, fallback) {
    if (fallback === undefined) fallback = null;
    try {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  }
};

function saveActiveSession() {
  storage.set(KEYS.ACTIVE_SESSION, state.activeSession);
}
// 진행 중인 유산소(러닝) 세션을 localStorage에 저장 — 백그라운드 메모리 회수·새로고침에도 진행이 남도록.
// 정밀 타이머는 performance.now(startPerf) 기준이라 세션 간 이어지지 않으므로, 복원 기준이 되는
// 벽시계 시작시각(startedAtWall)과 거리·적분위치·구간·소리 상태를 함께 스냅샷한다.
// (런타임 핸들 audioCtx/타이머/웨이크락은 직렬화 대상 아님 — 복원 때 새로 만든다.)
// running/rpe 단계만 저장한다. 삭제는 완주/종료 저장 시점에 localStorage.removeItem 으로 직접 한다.
function saveActiveCardio() {
  var c = state.cardio;
  var run = c && c.run;
  if (!run || !Array.isArray(run.segs) || !run.segs.length) return;
  if (c.phase !== 'running' && c.phase !== 'rpe') return;
  var snap = {
    phase: c.phase,
    startedAtWall: run.startedAtWall,
    totalSec: run.totalSec,
    curIdx: run.curIdx,
    distanceKm: run.distanceKm,
    lastIntegrateElapsed: run.lastIntegrateElapsed,
    soundOn: run.soundOn,
    completed: !!run.completed,
    elapsedAtEnd: (run.elapsedAtEnd == null ? null : run.elapsedAtEnd),
    segs: run.segs.map(function(s) {
      return { type: s.type, targetSpeed: s.targetSpeed, actualSpeed: s.actualSpeed, startSec: s.startSec, endSec: s.endSec, sec: s.sec, label: s.label };
    })
  };
  storage.set(KEYS.ACTIVE_CARDIO_RUN, snap);
}
function saveRestTimer() {
  storage.set(KEYS.REST_TIMER, state.restTimer);
}
function saveWizard() {
  storage.set(KEYS.WORKOUT_WIZARD, {
    workoutWizardStep: state.workoutWizardStep,
    selectedBodyPart: state.selectedBodyPart,
    generatedRoutine: state.generatedRoutine,
    routineChatHistory: state.routineChatHistory,
    routineChatInput: state.routineChatInput,
    routinePreviewExpanded: state.routinePreviewExpanded
  });
}
function clearWizard() {
  storage.set(KEYS.WORKOUT_WIZARD, null);
}

// 유산소(러닝머신 인터벌) 세션 저장 — 2단계 RUNNING 탭.
// session = { id, date, totalSec, totalDistKm, segments:[{type,targetSpeed,actualSpeed,sec}], completed(bool), rpe(1~10|null) }
// cardioLog 에 push → localStorage 저장 → 화면 재렌더.
// CARDIO_LOG 는 BACKUP_EXCLUDE_KEYS 에 없으므로 KEYS 순회 백업/복원에 자동 포함된다(운동 데이터).
window.saveCardioSession = function(session) {
  if (!session) return;
  if (!Array.isArray(state.data.cardioLog)) state.data.cardioLog = [];
  state.data.cardioLog.push(session);
  storage.set(KEYS.CARDIO_LOG, state.data.cardioLog);
  if (typeof render === 'function') render();
};

// ═══════════════════════════════════════════════
// 데이터 백업 / 복원 (묶음1)
// "운동 데이터만" 백업: API 키·코치 대화·임시 진행상태·AI 캐시는 제외.
// 새 폰에서 복원 가능한 JSON 포맷. REMAKE-PLAN.md 묶음1.
// ═══════════════════════════════════════════════
var BACKUP_VERSION = 1;

// 앱 표시 버전 — service-worker.js 의 CACHE_VERSION 과 항상 동일하게 맞춘다(배포 때 둘 다 올림).
// 더보기 화면 푸터에 노출 + "내 폰이 최신본인가?"를 눈으로 확인하는 단일 기준.
var APP_VERSION = 'v38';
// 백업에 담지 않는 키. 두 부류:
// (1) 로컬 전용·민감 → 복원해도 그대로 보존 (API 키·코치 대화)
// (2) 임시 진행상태·파생 캐시 → 복원 시 정리 (옛 세션/캐시가 새 데이터와 충돌 방지)
var BACKUP_LOCAL_ONLY_KEYS = [
  KEYS.API_KEY,            // 민감 (새 폰에서 다시 입력) — 복원 시 기존 값 보존
  KEYS.COACH_HISTORY       // 대화 기록 — 복원 시 기존 값 보존
];
var BACKUP_TRANSIENT_KEYS = [
  KEYS.ACTIVE_SESSION,     // 진행 중 세션
  KEYS.ACTIVE_CARDIO_RUN,  // 진행 중 유산소(러닝) 세션
  KEYS.REST_TIMER,
  KEYS.WORKOUT_WIZARD,
  KEYS.EXERCISES_CACHE,    // 재생성 가능
  KEYS.EXERCISES_VERSION,
  KEYS.AI_RECOMMENDATION,  // AI 캐시 (새 데이터 기준으로 재생성)
  KEYS.AI_RECOMMENDATION_HISTORY, // 추천 다양성용 이력 (재생성 가능)
  KEYS.WEEKLY_REVIEW,
  KEYS.PLATEAU_CHECK
];
// 참고: COACH_MEMORY(기억 노트)는 제외 목록에 없음 → 백업에 포함(새 폰 복원). 사용자가 큐레이션한 개인 정보.
var BACKUP_EXCLUDE_KEYS = BACKUP_LOCAL_ONLY_KEYS.concat(BACKUP_TRANSIENT_KEYS);

// 현재 저장소를 복원 가능한 백업 객체로 직렬화
function buildBackupObject() {
  var data = {};
  Object.keys(KEYS).forEach(function(k) {
    var key = KEYS[k];
    if (BACKUP_EXCLUDE_KEYS.indexOf(key) !== -1) return;
    var val = storage.get(key, undefined);
    if (val !== undefined && val !== null) data[key] = val;
  });
  return { app: 'fitness', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: data };
}

// 백업 JSON(문자열 또는 객체)을 저장소로 복원. 알려진 키만, 민감키는 절대 복원 안 함.
// 반환: { ok: true } 또는 { ok: false, error }. 절대 throw 하지 않음.
function restoreFromBackup(input) {
  try {
    var parsed = typeof input === 'string' ? JSON.parse(input) : input;
    if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
      return { ok: false, error: '헬스앱 백업 파일이 아닙니다.' };
    }
    if (parsed.data[KEYS.PROFILE] === undefined && parsed.data[KEYS.WORKOUT_LOG] === undefined) {
      return { ok: false, error: '복원할 운동 데이터가 없습니다.' };
    }
    var knownKeys = Object.keys(KEYS).map(function(k) { return KEYS[k]; });
    Object.keys(parsed.data).forEach(function(key) {
      if (knownKeys.indexOf(key) === -1) return;                 // 모르는 키 무시
      if (BACKUP_EXCLUDE_KEYS.indexOf(key) !== -1) return;        // 민감키 복원 안 함
      storage.set(key, parsed.data[key]);
    });
    // 기존 임시 진행상태·파생 캐시 정리 (옛 세션/캐시가 새 데이터와 충돌하지 않도록).
    // API 키·코치 대화 같은 로컬 전용 값은 그대로 둔다.
    BACKUP_TRANSIENT_KEYS.forEach(function(key) {
      try { localStorage.removeItem(key); } catch (e) {}
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: '파일을 읽을 수 없습니다.' };
  }
}

// ═══════════════════════════════════════════════
// 데모 데이터 생성
// ═══════════════════════════════════════════════
function generateDemoData() {
  var today = new Date();
  var todayStr = today.toISOString().split('T')[0];
  var dayOfWeek = today.getDay() || 7;
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  
  var workoutLog = [
    { id: 'd1', startTime: monday.getTime() + 10*60*60*1000, date: monday.toISOString().split('T')[0], sessionType: 'push', sessionName: 'PUSH', sessionKr: 'PUSH', duration: 52, sets: 18, exerciseCount: 6, exercises: [], completed: true },
    { id: 'd2', startTime: monday.getTime() + 86400000 + 10*60*60*1000, date: new Date(monday.getTime() + 86400000).toISOString().split('T')[0], sessionType: 'pull', sessionName: 'PULL', sessionKr: 'PULL', duration: 48, sets: 16, exerciseCount: 6, exercises: [], completed: true }
  ];
  
  var personalRecords = [
    { id: 'p1', exerciseName: '레그 프레스', weight: 120, reps: 10, previousWeight: 115, date: new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0] },
    { id: 'p2', exerciseName: '풀업', reps: 8, previousReps: 7, date: new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0] },
    { id: 'p3', exerciseName: '체스트 프레스', weight: 65, reps: 8, previousWeight: 62.5, date: new Date(today.getTime() - 14 * 86400000).toISOString().split('T')[0] }
  ];
  
  // 체중 기록 (최근 30일 추세: 78.0 → 77.2)
  var bodyLog = [];
  for (var i = 30; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    bodyLog.push({
      date: d.toISOString().split('T')[0],
      weight: parseFloat((78.0 - (i * 0.025) + (Math.sin(i) * 0.2)).toFixed(1)),
      bodyFat: null
    });
  }
  
  return { workoutLog: workoutLog, personalRecords: personalRecords, bodyLog: bodyLog };
}

// ═══════════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════════
function getTodayStr() {
  return getDateStr(new Date());
}

// KST(UTC+9) 기준 YYYY-MM-DD 문자열 — 한국 자정 기준으로 날짜 갱신.
// UTC 기준 toISOString()을 그대로 쓰면 한국 자정~오전 9시 사이 작업이
// 전날로 기록되는 버그가 발생하므로 모든 date 필드는 이 함수 사용.
function getDateStr(d) {
  if (!d) d = new Date();
  var kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

function fmtDate(d) {
  if (!d) d = new Date();
  var dt = new Date(d);
  return dt.getFullYear() + '.' + String(dt.getMonth()+1).padStart(2,'0') + '.' + String(dt.getDate()).padStart(2,'0');
}

function daysAgo(dateStr) {
  var d = new Date(dateStr);
  var t = new Date();
  t.setHours(0,0,0,0);
  d.setHours(0,0,0,0);
  var diff = Math.floor((t - d) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7) return diff + '일 전';
  if (diff < 30) return Math.floor(diff/7) + '주 전';
  return Math.floor(diff/30) + '개월 전';
}

function icon(name, size) {
  if (!size) size = 22;
  var svg = ICONS[name];
  return svg.replace('<svg ', '<svg width="' + size + '" height="' + size + '" ');
}

// ═══════════════════════════════════════════════
// 상태
// ═══════════════════════════════════════════════
var state = {
  currentTab: 'home',
  profile: null,
  data: { workoutLog: [], cardioLog: [], personalRecords: [], bodyLog: [], conditionLog: [], cycleHistory: [] },
  // 운동 세션 진행 중 상태
  activeSession: null,
  editingSet: null,
  exerciseSwapOpen: false,
  restTimer: null,
  completedSession: null,
  // 더보기 화면 - 모달
  apiKeyModalOpen: false,
  apiKeyInput: '',
  profileEditModalOpen: false,
  profileEdit: null,
  settings: { notifications: true, theme: 'dark', unit: 'kg' },
  apiKey: null,
  // 기록 화면
  statsPeriod: '1month',
  chartView: 'weight',
  // 코치 채팅
  coachChatOpen: false,
  coachMessages: [],
  coachInputText: '',
  coachThinking: false,
  // 세트 사이 채팅 (운동 중 — 3단계). 대화 내용은 activeSession.chat에 저장(세션과 함께 소멸)
  sessionChatOpen: false,
  sessionChatPending: null,     // 확인 대기 중인 추출 신호 {pain, painNote, feel, rpe, exIdx}
  _sessionChatStreaming: false,
  _sessionChatDraft: '',        // 입력 초안 (전체 렌더에도 살아남게 DOM 밖 보존)
  // AI 추천
  aiRecommendation: null,
  aiRecLoading: false,
  // 주간 리뷰
  weeklyReview: null,
  weeklyReviewLoading: false,
  weeklyReviewOpen: false,
  // 정체기 감지
  plateauCheck: null,
  plateauCheckLoading: false,
  plateauOpen: false,
  // 1RM 리스트
  oneRMListOpen: false,
  // 코치 기억 노트 (묶음3)
  coachMemory: [],            // [{id, category, text, source, date}]
  coachMemoryOpen: false,
  coachMemoryInput: '',
  coachMemoryCategory: 'other',
  coachMemoryEditingId: null, // 수정 중인 노트 id (null=새 추가)
  coachMemoryDeleteId: null,  // 삭제 확인 중인 노트 id
  // 운동 마법사 (새 구조)
  workoutWizardStep: 1,
  selectedBodyPart: null,
  generatedRoutine: null,
  routineLoading: false,
  routineChatHistory: [],
  routineChatInput: '',
  routineChatThinking: false,
  routinePreviewExpanded: false,
  // 기록 항목 상세 시트 (삭제용)
  itemDetailSheet: null,
  itemDeleteConfirming: false,  // 2단계 삭제 확인
  resetConfirming: false,  // 전체 초기화 2단계 확인
  // 뒤로가기 (묶음6-D) — 휘발(저장 안 함). 새로고침 시 history가 날아가므로 메모리에만 둔다.
  _navTabStack: ['home'],  // 탭 방문 순서(직전 탭으로 되돌리기용)
  _navExitArmed: false     // 루트에서 '한 번 더 누르면 종료' 준비 상태
};

function scrollRoutineChatToBottom() {
  setTimeout(function() {
    var area = document.getElementById('rc-area');
    if (area) area.scrollTop = area.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
  }, 80);
}

// 간단한 토스트 함수
function showToast(message, isError) {
  var toast = document.createElement('div');
  var bgColor = isError ? 'var(--danger)' : 'var(--accent)';
  var textColor = isError ? 'white' : 'var(--bg-0)';
  var shadow = isError ? 'rgba(var(--danger-rgb),0.4)' : 'rgba(var(--accent-rgb),0.4)';
  toast.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: ' + bgColor + '; color: ' + textColor + '; padding: 12px 24px; border-radius: 100px; font-family: var(--font); font-weight: 700; font-size: 13px; z-index: 9999; box-shadow: 0 8px 24px ' + shadow + '; max-width: 90vw; text-align: center;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2200);
}

// 앱 스타일 확인 팝업 (크롬 기본 confirm 대체 — 디자인 통일).
// onConfirm은 "확인" 버튼을 눌렀을 때만 호출. opts: { confirmLabel, cancelLabel, danger }
function showConfirm(message, onConfirm, opts) {
  opts = opts || {};
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 28px; animation: fadeIn 0.15s ease;';

  var card = document.createElement('div');
  card.style.cssText = 'background: var(--bg-1); border: 1px solid var(--bg-3); border-radius: 16px; padding: 20px; width: 100%; max-width: 320px; box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.5);';

  var msg = document.createElement('p');
  msg.style.cssText = 'font-family: var(--font); font-size: 14px; line-height: 1.55; color: var(--text-soft); margin-bottom: 18px; white-space: pre-line; word-break: keep-all;';
  msg.textContent = message;

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 8px;';

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = opts.cancelLabel || '취소';
  cancelBtn.style.cssText = 'flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--bg-3); background: transparent; color: var(--text-muted); font-family: var(--font); font-weight: 700; font-size: 13px;';

  var okBtn = document.createElement('button');
  okBtn.textContent = opts.confirmLabel || '확인';
  okBtn.style.cssText = 'flex: 1; padding: 12px; border-radius: 10px; border: none; background: ' + (opts.danger ? 'var(--danger)' : 'var(--accent)') + '; color: ' + (opts.danger ? 'white' : 'var(--bg-0)') + '; font-family: var(--font); font-weight: 800; font-size: 13px;';

  function close() { overlay.remove(); }
  cancelBtn.onclick = close;
  overlay.onclick = function(e) { if (e.target === overlay) close(); };
  okBtn.onclick = function() { close(); onConfirm(); };

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(okBtn);
  card.appendChild(msg);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// 채팅 스크롤 맨 아래로
function scrollChatToBottom() {
  setTimeout(function() {
    var chatArea = document.getElementById('chat-area');
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
  }, 50);
}

// HTML 이스케이프 (innerHTML/속성 값에 사용자·AI 텍스트 넣을 때)
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// API 키 마스킹
function maskApiKey(key) {
  if (!key || key.length < 12) return '';
  return key.substring(0, 10) + '••••••••' + key.substring(key.length - 4);
}

// ═══════════════════════════════════════════════
// 주간 리뷰 (Sonnet 4.6) - 일요일 자동 트리거
// ═══════════════════════════════════════════════

// 주차 식별자 (예: "2026-W21")
function getWeekId(date) {
  var d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO 주: 목요일 기준
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  var year = d.getFullYear();
  var firstDay = new Date(year, 0, 1);
  var weekNum = Math.ceil((((d - firstDay) / 86400000) + 1) / 7);
  return year + '-W' + String(weekNum).padStart(2, '0');
}

function scrollCoachToBottom() {
  setTimeout(function() {
    var area = document.getElementById('coach-chat-area');
    if (area) area.scrollTop = area.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
  }, 50);
}

// ═══════════════════════════════════════════════
// 기록 화면 - 데이터 계산 헬퍼
// ═══════════════════════════════════════════════

function getPeriodDays(period) {
  switch (period) {
    case '1week': return 7;
    case '1month': return 30;
    case '3month': return 90;
    case 'all': return 9999;
    default: return 30;
  }
}

function getPeriodLabel(period) {
  switch (period) {
    case '1week': return '1주';
    case '1month': return '1개월';
    case '3month': return '3개월';
    case 'all': return '전체';
    default: return '1개월';
  }
}

// 기간 내 데이터 필터
function filterByPeriod(items, period, dateField) {
  if (period === 'all') return items;
  
  var days = getPeriodDays(period);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  
  return items.filter(function(item) {
    var d = new Date(item[dateField || 'date']);
    return d >= cutoff;
  });
}

// ═══════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════
function init() {
  var initialized = storage.get(KEYS.INITIALIZED);
  
  if (!initialized) {
    storage.set(KEYS.PROFILE, DEFAULT_PROFILE);
    var demo = generateDemoData();
    storage.set(KEYS.WORKOUT_LOG, demo.workoutLog);
    storage.set(KEYS.PERSONAL_RECORDS, demo.personalRecords);
    storage.set(KEYS.BODY_LOG, demo.bodyLog);
    storage.set(KEYS.COACH_MEMORY, [
      { id: 'mem_demo1', category: 'injury', text: '왼쪽 어깨 약간 불편 — 오버헤드는 가볍게', source: 'manual', date: getTodayStr() },
      { id: 'mem_demo2', category: 'preference', text: '머신·덤벨 선호', source: 'manual', date: getTodayStr() }
    ]);
    storage.set(KEYS.INITIALIZED, true);
  }

  state.profile = storage.get(KEYS.PROFILE, DEFAULT_PROFILE);
  state.data = {
    workoutLog: storage.get(KEYS.WORKOUT_LOG, []),
    cardioLog: storage.get(KEYS.CARDIO_LOG, []),
    personalRecords: storage.get(KEYS.PERSONAL_RECORDS, []),
    bodyLog: storage.get(KEYS.BODY_LOG, []),
    conditionLog: storage.get(KEYS.CONDITION_LOG, []),
    cycleHistory: storage.get(KEYS.CYCLE_HISTORY, [])
  };

  // 사이클 필드 정규화 (구 7주/4단계 데이터 → 5주 빌드/디로드). cyclePhase는 주차에서 파생.
  if (state.profile) {
    if (!state.profile.currentCycle) state.profile.currentCycle = 1;
    if (!state.profile.currentWeek || state.profile.currentWeek > CYCLE_LENGTH) state.profile.currentWeek = 1;
    state.profile.cyclePhase = getPhaseByWeek(state.profile.currentWeek);
  }

  // API 키 + 설정 로드
  state.apiKey = storage.get(KEYS.API_KEY, null);
  state.settings = storage.get(KEYS.SETTINGS, { notifications: true, theme: 'dark', unit: 'kg' });

  // 코치 기억 노트 로드 (묶음3)
  state.coachMemory = storage.get(KEYS.COACH_MEMORY, []);
  
  // 1RM 초기 데이터 로드 (첫 실행 시 INITIAL_1RM 자동 입력)
  initializeOneRMData();
  
  // 캐시된 AI 추천 로드 (오늘 것만)
  var cachedRec = storage.get(KEYS.AI_RECOMMENDATION);
  if (cachedRec && cachedRec.date === getTodayStr()) {
    state.aiRecommendation = cachedRec;
  }
  
  // 캐시된 주간 리뷰 로드 (이번 주 것만)
  var cachedReview = storage.get(KEYS.WEEKLY_REVIEW);
  if (cachedReview && cachedReview.weekId === getWeekId(new Date())) {
    state.weeklyReview = cachedReview;
  }
  
  // 캐시된 정체기 체크 로드 (3일 이내)
  var cachedPlateau = storage.get(KEYS.PLATEAU_CHECK);
  if (cachedPlateau && cachedPlateau.detectedAt) {
    var daysDiff = (new Date() - new Date(cachedPlateau.detectedAt)) / 86400000;
    if (daysDiff < 3) {
      state.plateauCheck = cachedPlateau;
    }
  }

  // 진행 중이던 운동 세션 복원 (백그라운드/새로고침에서 돌아왔을 때)
  var savedSession = storage.get(KEYS.ACTIVE_SESSION);
  if (savedSession && savedSession.exercises && savedSession.startTime) {
    state.activeSession = savedSession;
  }

  // 진행 중이던 운동 마법사 상태 복원 (운동 짜는 단계가 백그라운드 후에도 유지되도록)
  var savedWizard = storage.get(KEYS.WORKOUT_WIZARD);
  if (savedWizard) {
    if (savedWizard.workoutWizardStep) state.workoutWizardStep = savedWizard.workoutWizardStep;
    if (savedWizard.selectedBodyPart) state.selectedBodyPart = savedWizard.selectedBodyPart;
    if (savedWizard.generatedRoutine) state.generatedRoutine = savedWizard.generatedRoutine;
    if (Array.isArray(savedWizard.routineChatHistory)) state.routineChatHistory = savedWizard.routineChatHistory;
    if (typeof savedWizard.routineChatInput === 'string') state.routineChatInput = savedWizard.routineChatInput;
    if (typeof savedWizard.routinePreviewExpanded === 'boolean') state.routinePreviewExpanded = savedWizard.routinePreviewExpanded;
  }
  var savedRest = storage.get(KEYS.REST_TIMER);
  if (savedRest && savedRest.startTime && savedRest.duration) {
    var elapsedSec = Math.floor((Date.now() - savedRest.startTime) / 1000);
    if (elapsedSec < savedRest.duration) {
      state.restTimer = savedRest;
      startRestTimerTick();
    } else {
      // 자리비운 사이 휴식 시간 종료된 경우 정리
      storage.set(KEYS.REST_TIMER, null);
    }
  }

  // 진행 중이던 유산소(러닝) 세션 복원 — performance.now 는 세션 간 이어지지 않으므로,
  // 저장된 벽시계 시작시각(startedAtWall)으로 경과를 다시 계산하고 startPerf 를 지금 기준으로
  // 재설정해 이어간다. (관련 런타임 함수는 screens.js — init() 는 그 파일 끝에서 호출되므로 안전.)
  var savedCardio = storage.get(KEYS.ACTIVE_CARDIO_RUN);
  if (savedCardio && Array.isArray(savedCardio.segs) && savedCardio.segs.length &&
      typeof savedCardio.startedAtWall === 'number' && savedCardio.totalSec > 0 &&
      typeof ensureCardioState === 'function') {
    var elapsedC = (Date.now() - savedCardio.startedAtWall) / 1000;
    if (!(elapsedC >= 0)) elapsedC = 0;
    if (elapsedC > savedCardio.totalSec + 6 * 3600) {
      // 너무 오래된 세션(계획 시간 + 6시간 초과)은 버림(좀비 복원 방지)
      try { localStorage.removeItem(KEYS.ACTIVE_CARDIO_RUN); } catch (e) {}
    } else {
      var cst = ensureCardioState();
      var nowPerf = cardioNow();
      var lastIntEl = (typeof savedCardio.lastIntegrateElapsed === 'number') ? savedCardio.lastIntegrateElapsed : elapsedC;
      if (lastIntEl < 0) lastIntEl = 0;
      if (lastIntEl > elapsedC) lastIntEl = elapsedC;
      cst.run = {
        startPerf: nowPerf - elapsedC * 1000,                    // 지금 기준으로 경과를 이어붙임
        startedAtWall: savedCardio.startedAtWall,
        lastIntegratePerf: nowPerf - (elapsedC - lastIntEl) * 1000,
        lastIntegrateElapsed: lastIntEl,
        segs: savedCardio.segs,
        totalSec: savedCardio.totalSec,
        curIdx: (typeof savedCardio.curIdx === 'number') ? savedCardio.curIdx : 0,
        distanceKm: (typeof savedCardio.distanceKm === 'number') ? savedCardio.distanceKm : 0,
        soundOn: savedCardio.soundOn !== false,
        completed: !!savedCardio.completed,
        elapsedAtEnd: (typeof savedCardio.elapsedAtEnd === 'number') ? savedCardio.elapsedAtEnd : null
      };
      state.currentTab = 'running';
      if (savedCardio.phase === 'rpe') {
        // RPE 입력 중 회수됨 → 그대로 RPE 단계로 복원(런타임 없음, 사용자가 평가만 제출)
        cst.phase = 'rpe';
      } else if (elapsedC >= savedCardio.totalSec) {
        // 자리 비운 사이 계획 시간이 끝남 → 완주로 마무리하고 RPE 입력 단계로
        cst.phase = 'rpe';
        cardioIntegrate();                                       // 완주 지점(totalSec)까지 구간별 적분
        cst.run.completed = true;
        cst.run.elapsedAtEnd = savedCardio.totalSec;
        saveActiveCardio();                                      // rpe 스냅샷으로 갱신
      } else {
        // 아직 진행 중 → 경과분 즉시 반영 + 런타임 재가동해 이어서 실행
        cst.phase = 'running';
        cst.run.curIdx = cardioSegIndexAt(cst.run.segs, elapsedC);
        cardioIntegrate();                                       // 자리 비운 사이 경과분 구간별 적분
        cardioStartRuntime(elapsedC);
      }
    }
  }

  render();
}
