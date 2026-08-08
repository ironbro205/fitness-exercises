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
  AI_RECOMMENDATION_HISTORY: 'fitness_ai_recommendation_history',
  AI_REC_FAILED_DATE: 'fitness_ai_rec_failed_date',
  CHAT_SIGNALS: 'fitness_chat_signals',
  LAST_BACKUP: 'fitness_last_backup',
  // 종목별 사용자 지정 세트법 { "핵 스쿼트": "straight", ... }. 없으면 클래스 기본값(EXERCISE_CLASS_RULES.scheme).
  SET_SCHEMES: 'fitness_set_schemes'
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
    mode: (c.mode === 'walk') ? 'walk' : 'interval',   // 복원 시 모드가 유지돼야 경사·예고·라벨이 맞는다
    startedAtWall: run.startedAtWall,
    totalSec: run.totalSec,
    curIdx: run.curIdx,
    distanceKm: run.distanceKm,
    lastIntegrateElapsed: run.lastIntegrateElapsed,
    soundOn: run.soundOn,
    completed: !!run.completed,
    elapsedAtEnd: (run.elapsedAtEnd == null ? null : run.elapsedAtEnd),
    handrail: (run.handrail || null),                  // 걷기 모드 종료 후 문항 답(§5-2)
    segs: run.segs.map(function(s) {
      return { type: s.type, targetSpeed: s.targetSpeed, actualSpeed: s.actualSpeed, incline: (Number(s.incline) || 0), startSec: s.startSec, endSec: s.endSec, sec: s.sec, label: s.label };
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

// 유산소(러닝머신 인터벌 / 경사 걷기) 세션 저장 — 2단계 RUNNING 탭.
// session = { id, date, mode:'interval'|'walk', totalSec, totalDistKm,
//             segments:[{type,targetSpeed,actualSpeed,incline,sec}], completed(bool), rpe(1~10|null),
//             handrail:'none'|'light'|'hold'|null (걷기 모드 전용) }
// ★옛 기록에는 mode·incline·handrail 이 없다 → 읽는 쪽에서 mode||'interval', incline||0 으로 폴백한다.
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
var APP_VERSION = 'v55';
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
  KEYS.AI_REC_FAILED_DATE, // 오늘 추천 실패 잠금 (하루짜리 임시값)
  KEYS.WEEKLY_REVIEW,
  KEYS.PLATEAU_CHECK
];
// 참고: COACH_MEMORY(기억 노트)는 제외 목록에 없음 → 백업에 포함(새 폰 복원). 사용자가 큐레이션한 개인 정보.
// 이 기기에서만 의미 있는 기록용 값 → 파일에 담지 않는다. 복원 시에는 "파일이 만들어진 시각"으로 다시 세팅.
var BACKUP_META_KEYS = [
  KEYS.LAST_BACKUP          // 마지막 백업 일시(기기별 메모)
];
var BACKUP_EXCLUDE_KEYS = BACKUP_LOCAL_ONLY_KEYS.concat(BACKUP_TRANSIENT_KEYS, BACKUP_META_KEYS);

// 이 일수 이상 백업을 안 했으면 더보기 화면에 부드러운 리마인더를 띄운다.
var BACKUP_REMINDER_DAYS = 30;

// 백업/복원 대상 키 목록 (KEYS 중 제외 목록에 없는 것) — 내보내기·덮어쓰기가 같은 목록을 쓴다.
function getBackupKeys() {
  return Object.keys(KEYS).map(function(k) { return KEYS[k]; }).filter(function(key) {
    return BACKUP_EXCLUDE_KEYS.indexOf(key) === -1;
  });
}

// 현재 저장소를 복원 가능한 백업 객체로 직렬화
function buildBackupObject() {
  var data = {};
  getBackupKeys().forEach(function(key) {
    var val = storage.get(key, undefined);
    if (val !== undefined && val !== null) data[key] = val;
  });
  return { app: 'fitness', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: data };
}

// 백업 파일에 무엇이 들어있는지 사람이 읽을 수 있게 요약 — 덮어쓰기 확인 창에 보여준다.
function summarizeBackup(parsed) {
  var d = (parsed && parsed.data) || {};
  function count(key) { return Array.isArray(d[key]) ? d[key].length : 0; }
  var oneRM = d[KEYS.ONE_RM_DATA];
  return {
    exportedAt: (parsed && typeof parsed.exportedAt === 'string') ? parsed.exportedAt : null,
    workouts: count(KEYS.WORKOUT_LOG),
    cardio: count(KEYS.CARDIO_LOG),
    body: count(KEYS.BODY_LOG),
    records: count(KEYS.PERSONAL_RECORDS),
    memory: count(KEYS.COACH_MEMORY),
    oneRM: (oneRM && typeof oneRM === 'object' && !Array.isArray(oneRM)) ? Object.keys(oneRM).length : 0
  };
}

// 백업 파일(문자열 또는 객체)을 "검사만" 한다 — 저장소는 건드리지 않음.
// 덮어쓰기 확인 창을 띄우기 전에 먼저 부르는 용도.
// 반환: { ok: true, backup, summary } 또는 { ok: false, error }. 절대 throw 하지 않음.
function parseBackupFile(input) {
  var parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (e) {
    return { ok: false, error: '파일 내용이 깨져 있어요.\n헬스앱에서 내보낸 .json 백업 파일이 맞는지 확인해 주세요.' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    return { ok: false, error: '헬스앱 백업 파일이 아니에요.\n더보기 → 백업 내보내기로 만든 .json 파일을 골라 주세요.' };
  }
  if (parsed.app && parsed.app !== 'fitness') {
    return { ok: false, error: '헬스앱 백업 파일이 아니에요.\n다른 앱에서 만든 파일 같아요.' };
  }
  var version = Number(parsed.version);
  if (!version || version < 1) {
    return { ok: false, error: '백업 파일의 형식(버전)을 알 수 없어요.\n파일이 손상됐을 수 있습니다.' };
  }
  if (version > BACKUP_VERSION) {
    return { ok: false, error: '이 백업 파일은 더 새로운 버전의 앱에서 만들었어요.\n앱을 최신으로 새로고침한 뒤 다시 시도해 주세요.' };
  }
  // 모양 확인 — 프로필은 객체, 기록들은 목록이어야 한다.
  // (엉뚱한 모양이 들어오면 복원 뒤 화면이 하얗게 뜨므로, 저장하기 전에 막는다.)
  var prof = parsed.data[KEYS.PROFILE];
  if (prof !== undefined && (prof === null || typeof prof !== 'object' || Array.isArray(prof))) {
    return { ok: false, error: '백업 파일의 프로필 정보가 손상됐어요.\n다른 백업 파일을 골라 주세요.' };
  }
  for (var i = 0; i < BACKUP_LIST_KEYS.length; i++) {
    var v = parsed.data[BACKUP_LIST_KEYS[i]];
    if (v !== undefined && v !== null && !Array.isArray(v)) {
      return { ok: false, error: '백업 파일의 기록 형식이 손상됐어요.\n다른 백업 파일을 골라 주세요.' };
    }
  }
  // 저장해도 안전한 형태로 미리 정리한다 → 확인 창에 보여줄 개수와 실제로 저장될 내용이 같아진다.
  var safeData = sanitizeBackupData(parsed.data);
  if (!backupHasRecords(safeData)) {
    // 덮어쓰기는 되돌릴 수 없으므로, 알맹이가 없는 파일로는 기존 기록을 지우지 않는다.
    return { ok: false, error: '복원할 기록이 없어요.\n기록이 하나도 담기지 않은 백업 파일입니다.' };
  }
  var safeBackup = { app: 'fitness', version: version, exportedAt: parsed.exportedAt, data: safeData };
  return { ok: true, backup: safeBackup, summary: summarizeBackup(safeBackup) };
}

// 백업에 담기는 "목록형" 키 (모양 검사·빈 파일 판단에 함께 쓴다)
var BACKUP_LIST_KEYS = [KEYS.WORKOUT_LOG, KEYS.CARDIO_LOG, KEYS.BODY_LOG, KEYS.PERSONAL_RECORDS,
                        KEYS.CONDITION_LOG, KEYS.CYCLE_HISTORY, KEYS.COACH_MEMORY];

// 파일 안의 값들을 저장해도 안전한 형태로 정리 (알려진 키만, 종류별 규칙 적용)
function sanitizeBackupData(raw) {
  var out = {};
  getBackupKeys().forEach(function(key) {
    var val = raw[key];
    if (val === undefined || val === null) return;
    if (key === KEYS.PROFILE) {
      var p = sanitizeRestoredProfile(val);
      if (p) out[key] = p;
      return;
    }
    var safe = sanitizeRestoredValue(val, 0);
    if (key === KEYS.ONE_RM_DATA) { out[key] = sanitizeRestoredOneRM(safe); return; }
    safe = sanitizeRestoredList(safe);
    // 체중 기록은 숫자가 없으면 그래프·통계 계산이 멈추므로 그런 줄은 버린다.
    if (key === KEYS.BODY_LOG && Array.isArray(safe)) {
      safe = safe.filter(function(entry) {
        return entry && typeof entry === 'object' && typeof entry.weight === 'number' && isFinite(entry.weight);
      });
    }
    out[key] = safe;
  });
  return out;
}

// 정리된 백업에 실제로 복원할 알맹이가 있는가 (빈 목록만 든 파일 = 없음)
function backupHasRecords(data) {
  if (!data) return false;
  var hasList = BACKUP_LIST_KEYS.some(function(key) {
    return Array.isArray(data[key]) && data[key].length > 0;
  });
  if (hasList) return true;
  var prof = data[KEYS.PROFILE];
  if (prof && typeof prof === 'object' && Object.keys(prof).length > 0) return true;
  var oneRM = data[KEYS.ONE_RM_DATA];
  return !!(oneRM && typeof oneRM === 'object' && Object.keys(oneRM).length > 0);
}

// 식별자(id·date)만 앱이 만드는 형식으로 제한한다.
// 이 값들은 화면의 onclick="openItemDetail('workout','<여기>')" 처럼 **속성 안**에 들어가는데,
// 남의 파일이 따옴표나 HTML 엔티티(&#39; 등)를 심으면 코드로 해석될 수 있기 때문.
// 앱이 만드는 id/날짜(d1, mem_demo1, 1749..., 2026-08-01)는 이 범위 안이라 정상 백업은 그대로 보존된다.
// 사용자가 쓴 글(기억 노트 등)은 건드리지 않는다 — 글자는 화면에서 escapeHtml 로 막는다.
function sanitizeIdentifier(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  return String(v).replace(/[^A-Za-z0-9_.:\-]/g, '').slice(0, 64);
}

// 복원 값의 "구조"만 손본다 — 글자 내용은 그대로 둔다(정상 백업이 글자 하나 안 바뀌고 돌아오도록).
// 프로토타입을 건드리는 위험한 키를 버리고, 비정상적으로 깊은 파일을 잘라낸다.
function sanitizeRestoredValue(v, depth) {
  depth = depth || 0;
  if (typeof v !== 'object' || v === null) return v;           // 문자열·숫자·불리언·null 은 그대로
  if (depth > 12) return Array.isArray(v) ? [] : {};           // 비정상적으로 깊은 파일 방어
  if (Array.isArray(v)) {
    return v.map(function(item) { return sanitizeRestoredValue(item, depth + 1); });
  }
  var out = {};
  Object.keys(v).forEach(function(k) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
    out[k] = sanitizeRestoredValue(v[k], depth + 1);
  });
  return out;
}

// 숫자로 계산에 쓰이는 칸 — 글자가 들어오면 화면이 통째로 멈춘다(예: weight.toFixed).
var NUMERIC_RECORD_FIELDS = ['weight', 'reps', 'sets', 'duration', 'bodyFat', 'exerciseCount',
                             'previousWeight', 'previousReps', 'totalDistKm', 'totalSec', 'rpe'];

// 기록 목록(운동·체중·기억 노트…)의 모양을 맞춘다: id·날짜는 안전한 형식으로, 숫자칸은 숫자로.
// 사용자가 쓴 글(text·메모 등)은 손대지 않는다 — 화면에서 escapeHtml 로 막는다.
function sanitizeRestoredList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(function(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    ['id', 'startTime'].forEach(function(f) {
      if (item[f] !== undefined && item[f] !== null) item[f] = sanitizeIdentifier(item[f]);
    });
    // date 는 반드시 글자여야 한다 — 숫자(에폭 ms)가 들어오면 기록 탭 정렬(date.localeCompare)에서 멈춘다.
    if (item.date !== undefined && item.date !== null) item.date = String(sanitizeIdentifier(String(item.date)));
    NUMERIC_RECORD_FIELDS.forEach(function(f) {
      if (item[f] === undefined || item[f] === null || typeof item[f] === 'number') return;
      var n = Number(item[f]);
      item[f] = isFinite(n) ? n : null;
    });
    return item;
  });
}

// 1RM 표는 "종목명 → 무게(숫자)" 지도다. 무게 자리에 글자가 들어오면 화면에 그대로 찍히고
// 작업무게 계산(rm * 0.75)도 깨지므로, 숫자로 못 읽는 종목은 통째로 버린다.
function sanitizeRestoredOneRM(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
  var out = {};
  Object.keys(map).forEach(function(name) {
    var n = Number(map[name]);
    if (isFinite(n) && n > 0) out[name] = n;
  });
  return out;
}

// 기본 프로필 "복사본" — 전역 DEFAULT_PROFILE 을 그대로 state 에 물리면 사이클 정규화가
// 전역 기본값을 통째로 바꿔버린다(그 뒤로는 앱 어디서든 오염된 기본값을 쓰게 됨).
function cloneDefaultProfile() {
  var copy = {};
  Object.keys(DEFAULT_PROFILE).forEach(function(k) { copy[k] = DEFAULT_PROFILE[k]; });
  return copy;
}

// 프로필은 숫자 칸(나이·키·몸무게…)이 화면에 그대로 찍히므로 숫자로 못 읽는 값은 기본값으로 되돌린다.
function sanitizeRestoredProfile(profile) {
  var p = sanitizeRestoredValue(profile, 0);
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  Object.keys(DEFAULT_PROFILE).forEach(function(field) {
    if (typeof DEFAULT_PROFILE[field] !== 'number') return;
    if (p[field] === undefined || p[field] === null) return;   // 백업에 없던 칸은 그대로 — init() 이 채운다
    var n = Number(p[field]);
    p[field] = isFinite(n) ? n : DEFAULT_PROFILE[field];
  });
  return p;
}

// 백업 JSON(문자열 또는 객체)을 저장소로 복원. 알려진 키만, 민감키는 절대 복원 안 함.
// "덮어쓰기"이므로 백업에 없는 항목은 지운다 — 옛 기록이 섞여 남지 않도록.
// 저장이 하나라도 실패하면(저장공간 부족 등) 원래 값으로 되돌린다 — 반쪽 복원 상태를 만들지 않기 위해.
// 반환: { ok: true, summary } 또는 { ok: false, error }. 절대 throw 하지 않음.
function restoreFromBackup(input) {
  var checked = parseBackupFile(input);
  if (!checked.ok) return checked;
  var parsed = checked.backup;
  var keys = getBackupKeys();

  // 되돌리기용 스냅샷 (직렬화된 원본 문자열 그대로)
  var snapshot = {};
  try {
    keys.forEach(function(key) { snapshot[key] = localStorage.getItem(key); });
  } catch (e) {
    return { ok: false, error: '저장소를 읽지 못했어요.\n브라우저의 사이트 데이터 설정을 확인해 주세요.' };
  }
  // 되돌리기 — 한 곳이라도 못 되돌리면 false (사용자에게 사실대로 알리기 위해)
  function rollback() {
    var allBack = true;
    keys.forEach(function(key) {
      try {
        if (snapshot[key] === null || snapshot[key] === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, snapshot[key]);
      } catch (e) { allBack = false; }
    });
    return allBack;
  }

  var failed = false;
  try {
    keys.forEach(function(key) {
      if (failed) return;
      var val = parsed.data[key];
      if (val === undefined) {
        // 백업에 없는 항목 → 지움(진짜 덮어쓰기). 단 프로필은 비워두면 안 된다 —
        // 저장된 프로필이 없으면 앱이 기본값을 물고 돌면서 나이·키·사이클이 매번 초기화된다.
        if (key === KEYS.PROFILE) {
          if (!storage.set(key, cloneDefaultProfile())) failed = true;
          return;
        }
        localStorage.removeItem(key);
        return;
      }
      if (!storage.set(key, val)) failed = true;           // 저장 실패(용량 초과 등)
    });
    // 아래 두 플래그도 같은 실패 감시 안에서 쓴다 — 이것만 실패해도 복원은 반쪽이 된다.
    // 첫 실행 플래그: 없으면 다음 로드에서 데모 데이터가 복원한 기록 위에 다시 깔린다.
    if (!failed && !storage.set(KEYS.INITIALIZED, true)) failed = true;
    // 1RM을 실제로 복원했을 때만 '초기화됨' 플래그를 세운다 — 빈 표({})에 세우면
    // 다음 로드의 initializeOneRMData()가 기본 1RM(INITIAL_1RM)을 영영 못 심는다.
    if (!failed) {
      var restoredOneRM = parsed.data[KEYS.ONE_RM_DATA];
      if (restoredOneRM && Object.keys(restoredOneRM).length > 0) {
        if (!storage.set(KEYS.ONE_RM_INITIALIZED, true)) failed = true;
      } else {
        // 1RM이 비었는데 파일에 든 '초기화됨' 플래그가 남으면 기본 1RM이 영영 안 깔린다 → 지운다.
        try { localStorage.removeItem(KEYS.ONE_RM_INITIALIZED); } catch (e) {}
      }
    }
  } catch (e) {
    failed = true;
  }
  if (failed) {
    var restored = rollback();
    return { ok: false, error: restored
      ? '저장 공간이 부족해 복원을 끝내지 못했어요.\n원래 기록은 그대로 되돌려 놨습니다. 기기 저장 공간을 정리한 뒤 다시 시도해 주세요.'
      : '저장 공간이 부족해 복원을 끝내지 못했고, 일부 기록은 되돌리지도 못했어요.\n기기 저장 공간을 정리한 뒤 백업 파일로 다시 복원해 주세요.' };
  }

  // 기존 임시 진행상태·파생 캐시 정리 (옛 세션/캐시가 새 데이터와 충돌하지 않도록).
  // API 키·코치 대화 같은 로컬 전용 값은 그대로 둔다.
  BACKUP_TRANSIENT_KEYS.forEach(function(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  });
  // 마지막 백업 일시는 "파일이 만들어진 시각" 기준으로 다시 세팅 (새 폰에서도 백업 주기가 이어지도록)
  markBackupDone(parsed.exportedAt);
  return { ok: true, summary: checked.summary };
}

// 마지막 백업 일시 기록 (이 기기 전용 메모 — 백업 파일에는 안 담김)
function markBackupDone(atIso) {
  var t = atIso ? new Date(atIso).getTime() : NaN;
  var iso = isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
  storage.set(KEYS.LAST_BACKUP, { at: iso });
  return iso;
}

// 마지막 백업 상태 — 더보기 화면 표시 + 오래된 백업 리마인더 판단용.
// nowMs 를 넣어 기준 시각을 바꿀 수 있다(테스트용). 반환:
//   { at: ISO|null, daysSince: 숫자|null, never: 한 번도 안 함, stale: 리마인더 필요 }
function getBackupStatus(nowMs) {
  var rec = storage.get(KEYS.LAST_BACKUP, null);
  var at = (rec && typeof rec.at === 'string') ? rec.at : null;
  var t = at ? new Date(at).getTime() : NaN;
  if (!at || isNaN(t)) return { at: null, daysSince: null, never: true, stale: true };
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  var days = Math.floor((now - t) / 86400000);
  if (days < 0) days = 0;   // 기기 시계가 뒤로 간 경우 방어
  return { at: at, daysSince: days, never: false, stale: days >= BACKUP_REMINDER_DAYS };
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
    { id: 'p3', exerciseName: '머신 체스트 프레스', weight: 65, reps: 8, previousWeight: 62.5, date: new Date(today.getTime() - 14 * 86400000).toISOString().split('T')[0] }
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

// KST(UTC+9) 기준 시(0~23). 원시 new Date().getHours()는 기기 시간대를 따라가므로 쓰지 않는다.
// 용도: 이른 아침 경고(웜업 가이드) — 자는 동안 디스크가 물을 먹어 기상 직후 굽힘 응력이 약 300% 높다
// (Adams·Dolan·Hutton 1990). docs/research/warmup-stretching.md §4-E.
function getKstHour(d) {
  if (!d) d = new Date();
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
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

// 접이식 안내 — 화면에는 첫 줄(summary)만 두고, 나머지(detailHtml)는 ⓘ 를 눌렀을 때 편다.
// 네이티브 <details> 라 state·render() 를 거치지 않는다 → 펼쳐도 스크롤이 맨 위로 튀지 않는다.
// summary/detailHtml 은 **앱이 직접 쓴 고정 문구 전용**이다. 사용자·AI 문자열을 넣을 때는
// 부르는 쪽에서 escapeHtml 로 감싸 넣는다(여기서 이스케이프하면 <b> 같은 강조가 죽는다).
function noteBlock(summary, detailHtml) {
  return '<details class="note">' +
      '<summary>' + icon('info', 13) +
        '<span class="note-summary-text">' + summary + '</span>' +
        '<span class="note-caret">' + icon('chevron', 12) + '</span>' +
      '</summary>' +
      '<div class="note-body">' + detailHtml + '</div>' +
    '</details>';
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
  exerciseMenuOpen: false,      // 종목 메뉴 시트 (교체·추가·건너뛰기)
  exerciseSwapOpen: false,      // 종목 고르기 시트 (교체·추가 공용)
  exercisePickerMode: 'swap',   // 그 시트가 지금 무슨 일을 하는지 — 'swap'=교체 / 'add'=다음에 추가
  setSchemeOpen: false,
  restTimer: null,
  completedSession: null,
  // 정리 스트레칭 가이드 (완료 화면 위 오버레이). 진행상태는 완료 화면과 같은 수명 — 저장하지 않는다.
  // 세션 시작 웜업은 activeSession.warmup 에 들어가 세션과 함께 저장된다.
  stretchGuide: null,
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
  aiRecFailedDate: null,   // 오늘 자동 로드가 실패한 날짜(YYYY-MM-DD). 렌더마다 재호출되는 무한 재시도 방지용 잠금.
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
  routineExMapIdx: null,      // 루틴 미리보기에서 자극 근육 인체도를 펼친 종목 index (null=없음)
  routineExMapKey: null,      // 그 index 에 있던 종목명 — 루틴이 바뀌면 안 맞아서 저절로 닫힌다
  // 자극 근육 인체도 (js/bodymap.js)
  muscleMapZoom: null,        // 확대해서 보는 중인 종목명 (null=닫힘)
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

// 앱 스타일 안내 팝업 (버튼 1개 — 크롬 기본 alert 대체).
// 여러 줄 안내(\n)를 그대로 보여주므로 오류 안내처럼 설명이 필요한 곳에 쓴다.
function showAlert(message, opts) {
  opts = opts || {};
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 28px; animation: fadeIn 0.15s ease;';

  var card = document.createElement('div');
  card.style.cssText = 'background: var(--bg-1); border: 1px solid var(--bg-3); border-radius: 16px; padding: 20px; width: 100%; max-width: 320px; box-shadow: 0 20px 60px rgba(var(--black-rgb), 0.5);';

  if (opts.title) {
    var title = document.createElement('p');
    title.style.cssText = 'font-family: var(--font); font-size: 14px; font-weight: 800; color: ' + (opts.danger ? 'var(--danger)' : 'var(--accent)') + '; margin-bottom: 8px;';
    title.textContent = opts.title;
    card.appendChild(title);
  }

  var msg = document.createElement('p');
  msg.style.cssText = 'font-family: var(--font); font-size: 14px; line-height: 1.55; color: var(--text-soft); margin-bottom: 18px; white-space: pre-line; word-break: keep-all;';
  msg.textContent = message;

  var okBtn = document.createElement('button');
  okBtn.textContent = opts.confirmLabel || '확인';
  okBtn.style.cssText = 'width: 100%; padding: 12px; border-radius: 10px; border: none; background: var(--accent); color: var(--bg-0); font-family: var(--font); font-weight: 800; font-size: 13px;';

  function close() { overlay.remove(); if (typeof opts.onClose === 'function') opts.onClose(); }
  okBtn.onclick = close;
  overlay.onclick = function(e) { if (e.target === overlay) close(); };

  card.appendChild(msg);
  card.appendChild(okBtn);
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
// ⚠ onclick="fn('...')" 처럼 **JS 문자열** 자리에는 이것만으로 부족하다 —
//   &#39; 를 HTML 파서가 ' 로 되돌린 뒤 JS 가 읽으므로 문자열을 탈출할 수 있다.
//   그런 자리에는 sanitizeIdentifier 로 좁혀진 식별자만 넣거나(현재 코드가 그렇다),
//   자유 텍스트는 state 에 담고 핸들러에서 읽어라 (swapCurrentExercise 방식).
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

  // 저장된 프로필이 없으면 기본값을 "복사해서" 쓴다 — 전역 DEFAULT_PROFILE 을 그대로 물면
  // 바로 아래 사이클 정규화가 전역 기본값을 오염시킨다.
  state.profile = storage.get(KEYS.PROFILE, null) || cloneDefaultProfile();
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
  // 오늘 추천 실패 잠금 복원 — 메모리에만 두면 새로고침마다 잠금이 풀려
  // 실패할 때마다 유료 API가 다시 나간다(앱을 열 때마다 1회). 어제 것은 버린다.
  var failedDate = storage.get(KEYS.AI_REC_FAILED_DATE);
  state.aiRecFailedDate = (failedDate === getTodayStr()) ? failedDate : null;
  
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
      cst.mode = (savedCardio.mode === 'walk') ? 'walk' : 'interval';   // 모드 먼저 복원(경사·예고·라벨이 여기 달림)
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
        elapsedAtEnd: (typeof savedCardio.elapsedAtEnd === 'number') ? savedCardio.elapsedAtEnd : null,
        handrail: (savedCardio.handrail || null)
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
