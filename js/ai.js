// js/ai.js — Claude 커넥터 동기화 (앱 안 AI 호출은 삭제됨)
'use strict';
// ═══════════════════════════════════════════════
// Claude 커넥터 동기화 — docs/claude-connector-plan.md
// 앱은 원자료 스냅샷을 POST /api/snapshot 으로 올리고, Claude 앱(Opus)이 커넥터로 저장한
// 이번 주 계획·오늘 유산소를 GET /api/plan 으로 받아 온다(docs/weekly-plan.md). 판단(무게·세트·휴식)은
// Opus 몫이라 스냅샷에는 계산값(추천 무게·1RM·정체·부족 부위·목표 세트·볼륨 판정)을 넣지 않는다.
// 예외는 이번 주 부위별 실제 세트(weekSets)와 그것을 센 종목별 부위 무게표(muscleWeights) 둘뿐이다.
// 연결 코드가 없으면 아무 요청도 하지 않는다.
// ═══════════════════════════════════════════════

var CLAUDE_SNAPSHOT_SCHEMA = 1;
var CLAUDE_WINDOW_DAYS = 56;            // 최근 8주 원자료
var CLAUDE_VISIBLE_SYNC_MIN_MS = 60000; // 다시 보일 때 동기화 최소 간격
// 세션별 종목 목록의 부위 묶음 (free = 전체). 어깨 후면은 PULL 에 둔다.
var CLAUDE_CATALOG_PARTS = {
  push: ['chest', 'chest_upper', 'chest_lower', 'shoulders_front', 'shoulders_side', 'triceps'],
  pull: ['lats', 'upper_back', 'traps', 'shoulders_rear', 'biceps'],
  legs: ['quads', 'hamstrings', 'glutes', 'glutes_med', 'calves', 'adductors', 'abs', 'obliques'],
  upper: ['chest', 'chest_upper', 'chest_lower', 'shoulders_front', 'shoulders_side', 'triceps',
          'lats', 'upper_back', 'traps', 'shoulders_rear', 'biceps']
};
var CLAUDE_CARDIO_MODE_KR = { interval: '인터벌', walk: '경사 걷기' };

var _claudeLastSyncAt = 0;              // 마지막 자동 동기화 시각(메모리 — 60초 제한용)

// ── 저장소 ─────────────────────────────
function getSyncToken() {
  var t = storage.get(KEYS.SYNC_TOKEN, null);
  return (typeof t === 'string' && t) ? t : null;
}

function getClaudeSyncState() {
  var s = storage.get(KEYS.CLAUDE_SYNC, null);
  // 옛 버전이 남긴 lastImportedRoutineId 는 읽지 않는다(여기 없는 키는 버려진다).
  var base = { lastUploadAt: null, lastUploadHash: null, lastImportedCardioId: null };
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    Object.keys(base).forEach(function(k) { if (s[k] !== undefined) base[k] = s[k]; });
  }
  return base;
}

function setClaudeSyncState(patch) {
  var s = getClaudeSyncState();
  Object.keys(patch).forEach(function(k) { s[k] = patch[k]; });
  storage.set(KEYS.CLAUDE_SYNC, s);
  return s;
}

// 연결 코드 칸에 커넥터 주소 전체를 붙여도 /api/mcp/ 뒤 조각만 뽑는다.
function extractSyncToken(input) {
  var s = String(input == null ? '' : input).trim();
  var mark = '/api/mcp/';
  var at = s.indexOf(mark);
  if (at !== -1) s = s.slice(at + mark.length);
  s = s.split(/[\/?#\s]/)[0];
  return s;
}

// ── 날짜 (KST 문자열끼리 계산) ─────────────────────────────
function claudeShiftDateStr(dateStr, days) {
  var t = Date.parse(dateStr + 'T00:00:00Z');
  if (isNaN(t)) return dateStr;
  return new Date(t + days * 86400000).toISOString().split('T')[0];
}

// 창 안 = 오늘 포함 최근 56일(오늘-55일 ~ 오늘). 이 날짜보다 커야 창 안이다.
function claudeWindowCutoff(todayStr) {
  return claudeShiftDateStr(todayStr, -CLAUDE_WINDOW_DAYS);
}

function claudeInWindow(dateStr, cutoff) {
  return typeof dateStr === 'string' && dateStr > cutoff;
}

// 기록 날짜 → 'YYYY-MM-DD'. 'YYYY-M-D' 는 두 자리로 채우고, ISO 날짜·시각('2026-09-25T…')은 앞 10자.
// 그 밖(빈 값·숫자·이상한 글자·없는 날짜 '2026-02-30')은 null — 스냅샷에서 그 항목만 뺀다(서버 검사는 엄격).
function claudeNormDate(v) {
  if (typeof v !== 'string') return null;
  var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) || v.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (!m) return null;
  var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
  var t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return m[1] + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

// 날짜를 정규화한 얕은 사본 목록 (날짜가 망가진 항목은 빠진다). 원본 기록은 건드리지 않는다.
function claudeWithNormDates(list) {
  var out = [];
  (Array.isArray(list) ? list : []).forEach(function(item) {
    if (!item || typeof item !== 'object') return;
    var date = claudeNormDate(item.date);
    if (date === null) return;
    var copy = {};
    Object.keys(item).forEach(function(k) { copy[k] = item[k]; });
    copy.date = date;
    out.push(copy);
  });
  return out;
}

function claudeNum(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

// ── 스냅샷 ─────────────────────────────
function claudeOwnedEquipmentLabels() {
  return Object.keys(GYM_EQUIPMENT)
    .filter(function(id) { return id !== 'bodyweight' && GYM_EQUIPMENT[id].owned; })
    .map(function(id) { return GYM_EQUIPMENT[id].kr; });
}

// 세션별 종목 목록 — 별칭 표기를 빼고, 보유 장비로 할 수 있는 종목만.
function buildClaudeCatalog() {
  var out = { push: [], pull: [], legs: [], upper: [], free: [] };
  Object.keys(EXERCISE_BODY_PART_MAP).forEach(function(name) {
    if (isAliasExerciseName(name)) return;
    if (!isExerciseAvailable(name)) return;
    var primary = EXERCISE_BODY_PART_MAP[name].primary;
    out.free.push(name);
    ['push', 'pull', 'legs', 'upper'].forEach(function(s) {
      if (CLAUDE_CATALOG_PARTS[s].indexOf(primary) !== -1) out[s].push(name);
    });
  });
  return out;
}

// 드롭·마이오렙 같은 연장 세트에는 drop:true (세트 수에 세지 않는다 — 계약 5절). 본 세트에는 필드 없음.
function claudeSetsOf(logEx) {
  return loggedExerciseSets(logEx).map(function(s) {
    var out = { weight: claudeNum(s && s.weight), reps: claudeNum(s && s.reps), warmup: !!(s && s.isWarmup) };
    if (isSetExtension(s)) out.drop = true;
    return out;
  });
}

function claudeWorkoutEntry(w, condByWorkout) {
  var cond = condByWorkout[w.id] || null;
  var entry = {
    date: String(w.date),
    session: String(w.session || w.sessionType || ''),
    sessionName: String(w.sessionName || w.sessionKr || ''),
    durationMin: claudeNum(w.duration),
    rpe: cond ? claudeNum(cond.rpe) : null,
    condition: cond ? claudeNum(cond.condition) : null,
    exercises: (Array.isArray(w.exercises) ? w.exercises : []).filter(function(ex) {
      return ex && ex.name;
    }).map(function(ex) {
      return { name: String(ex.name), assist: isReverseProgression(ex.name), sets: claudeSetsOf(ex) };
    })
  };
  // 주간 계획 세션으로 한 운동에만 있다 (끝난 세션 판정용 · 계약 5절)
  ['planWeek', 'planLabel', 'planType'].forEach(function(k) {
    if (typeof w[k] === 'string' && w[k]) entry[k] = w[k];
  });
  return entry;
}

function claudeCardioEntry(c) {
  var segs = (Array.isArray(c.segments) ? c.segments : []).filter(function(s) { return s && typeof s === 'object'; });
  var segments = segs.map(function(s) {
    var sec = claudeNum(s.sec);
    if (sec === null) sec = (claudeNum(s.endSec) !== null && claudeNum(s.startSec) !== null) ? s.endSec - s.startSec : 0;
    var speed = claudeNum(s.actualSpeed);
    if (speed === null) speed = claudeNum(s.targetSpeed);
    if (speed === null) speed = claudeNum(s.speed);
    return { type: String(s.type || ''), sec: sec, speed: speed === null ? 0 : speed, incline: claudeNum(s.incline) || 0 };
  });
  var total = claudeNum(c.totalSec);
  if (total === null) total = segments.reduce(function(n, s) { return n + s.sec; }, 0);
  return {
    date: String(c.date),
    mode: c.mode === 'walk' ? 'walk' : 'interval',
    totalSec: total,
    rpe: claudeNum(c.rpe),
    segments: segments
  };
}

function claudeByDateDesc(list) {
  return (list || []).slice().sort(function(a, b) {
    return String((b && b.date) || '').localeCompare(String((a && a.date) || ''));
  });
}

// 계약(docs/claude-connector-plan.md · api/snapshot.mjs validateSnapshot) 그대로. 원자료만.
function buildClaudeSnapshot(nowDate) {
  var now = nowDate || new Date();
  var today = getDateStr(now);
  var cutoff = claudeWindowCutoff(today);
  var data = state.data || {};
  var profile = state.profile || {};

  var condByWorkout = {};
  (Array.isArray(data.conditionLog) ? data.conditionLog : []).forEach(function(c) {
    if (c && c.workoutId && !condByWorkout[c.workoutId]) condByWorkout[c.workoutId] = c;
  });

  // 날짜는 claudeNormDate 로 맞추고, 망가진 기록만 뺀다(8주 창 비교도 정규화된 날짜로).
  var log = sortByDateDesc(claudeWithNormDates(data.workoutLog));
  var workouts = [];
  var recentNames = {};
  var older = {};
  log.forEach(function(w) {
    if (claudeInWindow(w.date, cutoff)) {
      var entry = claudeWorkoutEntry(w, condByWorkout);
      entry.exercises.forEach(function(ex) { recentNames[canonicalExerciseName(ex.name)] = true; });
      workouts.push(entry);
      return;
    }
    // 창 밖 — 종목별 가장 최근 1회만 (log 는 최신순이라 처음 만난 것이 마지막 수행)
    (Array.isArray(w.exercises) ? w.exercises : []).forEach(function(ex) {
      if (!ex || !ex.name) return;
      var key = canonicalExerciseName(ex.name);
      if (older[key]) return;
      older[key] = { name: String(ex.name), date: String(w.date), assist: isReverseProgression(ex.name), sets: claudeSetsOf(ex) };
    });
  });
  var olderLastPerformed = claudeByDateDesc(Object.keys(older).filter(function(key) {
    return !recentNames[key];
  }).map(function(key) { return older[key]; }));

  var cardio = claudeByDateDesc(claudeWithNormDates(data.cardioLog).filter(function(c) {
    return claudeInWindow(c.date, cutoff);
  }).map(claudeCardioEntry));

  var bodyAll = claudeByDateDesc(claudeWithNormDates(data.bodyLog).filter(function(b) {
    return claudeNum(b.weight) !== null;
  }));
  var body = [];
  var tookOlderBody = false;
  bodyAll.forEach(function(b) {
    var inWin = claudeInWindow(b.date, cutoff);
    if (!inWin) {
      if (tookOlderBody) return;
      tookOlderBody = true;
    }
    body.push({ date: String(b.date), weightKg: claudeNum(b.weight), bodyFatPct: claudeNum(b.bodyFat) });
  });

  var catalog = buildClaudeCatalog();
  // 이번 주 부위별 실제 세트와 그것을 센 무게표 — 앱 카드와 같은 함수(js/domain.js)로 센다.
  var weekStart = getWeekStartStr(today);
  // 무게표 = catalog.free 전부 + 스냅샷 기록에 나오는 모든 종목 이름(별칭·자유 입력 포함, 빈 표여도 넣는다)
  var muscleWeights = {};
  function addWeights(name) {
    if (typeof name === 'string' && !muscleWeights.hasOwnProperty(name)) muscleWeights[name] = exerciseGroupWeights(name);
  }
  catalog.free.forEach(addWeights);
  workouts.forEach(function(w) { w.exercises.forEach(function(ex) { addWeights(ex.name); }); });
  olderLastPerformed.forEach(function(o) { addWeights(o.name); });

  return {
    schemaVersion: CLAUDE_SNAPSHOT_SCHEMA,
    uploadedAt: now.toISOString(),
    todayKst: today,
    appVersion: 'health-app-' + APP_VERSION,
    profile: { age: claudeNum(profile.age), heightCm: claudeNum(profile.height), weightKg: claudeNum(profile.weight) },
    equipment: claudeOwnedEquipmentLabels(),
    workouts: workouts,
    olderLastPerformed: olderLastPerformed,
    cardio: cardio,
    body: body,
    catalog: catalog,
    weekSets: { weekStart: weekStart, byGroup: getWeekGroupSets(weekStart) },
    muscleWeights: muscleWeights
  };
}

// uploadedAt 을 뺀 내용의 간단한 문자열 해시 (FNV-1a 32비트). 같으면 다시 보내지 않는다.
function claudeSnapshotHash(snapshot) {
  var copy = {};
  Object.keys(snapshot || {}).forEach(function(k) { if (k !== 'uploadedAt') copy[k] = snapshot[k]; });
  var str = JSON.stringify(copy);
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

// ── 네트워크 (실패는 조용히 — 절대 던지지 않는다) ─────────────────────────────
function claudeCanFetch() {
  return typeof fetch === 'function';
}

// 반환: Promise<{ ok, skipped?, status? }>
function uploadClaudeSnapshot(opts) {
  var force = !!(opts && opts.force);
  var token = getSyncToken();
  if (!token) return Promise.resolve({ ok: false, skipped: 'no_token' });
  if (!claudeCanFetch()) return Promise.resolve({ ok: false, skipped: 'no_fetch' });
  var snapshot, hash;
  try {
    snapshot = buildClaudeSnapshot();
    hash = claudeSnapshotHash(snapshot);
  } catch (e) {
    return Promise.resolve({ ok: false, skipped: 'build_error' });
  }
  if (!force && hash === getClaudeSyncState().lastUploadHash) {
    return Promise.resolve({ ok: true, skipped: 'unchanged' });
  }
  var req;
  try {
    req = fetch('/api/snapshot', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(snapshot)
    });
  } catch (e) {
    return Promise.resolve({ ok: false });
  }
  return Promise.resolve(req).then(function(res) {
    if (!res || !res.ok) return { ok: false, status: res ? res.status : 0 };
    setClaudeSyncState({ lastUploadAt: snapshot.uploadedAt, lastUploadHash: hash });
    return { ok: true, status: res.status };
  }).catch(function() { return { ok: false }; });
}

function claudeValidCardio(p) {
  return !!(p && typeof p === 'object' && typeof p.id === 'string' && p.id &&
    (p.mode === 'interval' || p.mode === 'walk') && Array.isArray(p.segments) && p.segments.length);
}

// 주간 계획 모양 — weekStart 글자, 세션 1개 이상, 세션마다 label·type·exercises(종목마다 name·sets).
function claudeValidWeek(p) {
  return !!(p && typeof p === 'object' && typeof p.weekStart === 'string' &&
    Array.isArray(p.sessions) && p.sessions.length &&
    p.sessions.every(function(s) {
      return s && typeof s.label === 'string' && s.label && PLAN_TYPE_CATALOG.hasOwnProperty(s.type) &&
        Array.isArray(s.exercises) &&
        s.exercises.every(function(ex) { return ex && typeof ex.name === 'string' && Array.isArray(ex.sets); });
    }));
}

function claudeWeekRev(p) {
  return p ? String(p.id) + '|' + String(p.updatedAt) : '';
}

// /api/plan 응답 { week, nextWeek, cardio } 를 state 에 둔다. 반환: 무엇이 바뀌었는가.
//  · week: 모양이 맞고 이번 주(월요일 기준) 것이면 저장, null 이면 지운다. 그 밖(모양이 틀림·다른 주)은 그대로 둔다.
//    적용 끝에 남은 계획이 이번 주 것이 아니면 지운다(앱을 켜 둔 채 월요일이 된 경우).
//  · nextWeek: 같은 규칙으로 다음 주(이번 주 월요일 + 7일) 것만. 월요일이 되면 그 계획은 week 로 온다.
//  · cardio: **오늘 것이고 가져온 적 없는 id** 만.
//  · 옛 서버의 routine 필드는 보지 않는다.
function applyClaudePlans(plans, todayStr) {
  var today = todayStr || getTodayStr();
  var sync = getClaudeSyncState();
  var w = plans ? plans.week : undefined;
  var c = plans && plans.cardio;
  var nw = plans ? plans.nextWeek : undefined;
  var thisMon = getWeekStartStr(today);
  var nextMon = addDaysStr(thisMon, 7);
  var beforeWeek = claudeWeekRev(state.weekPlan);
  var beforeNext = claudeWeekRev(state.nextWeekPlan);
  if (w === null) {
    state.weekPlan = null;
    try { localStorage.removeItem(KEYS.WEEK_PLAN); } catch (e) {}
  } else if (claudeValidWeek(w) && w.weekStart === getWeekStartStr(today)) {
    state.weekPlan = w;
    storage.set(KEYS.WEEK_PLAN, w);
  }
  if (state.weekPlan && state.weekPlan.weekStart !== getWeekStartStr(today)) {
    state.weekPlan = null;
    try { localStorage.removeItem(KEYS.WEEK_PLAN); } catch (e) {}
  }
  if (nw === null) {
    state.nextWeekPlan = null;
    try { localStorage.removeItem(KEYS.NEXT_WEEK_PLAN); } catch (e) {}
  } else if (claudeValidWeek(nw) && nw.weekStart === nextMon) {
    state.nextWeekPlan = nw;
    storage.set(KEYS.NEXT_WEEK_PLAN, nw);
  }
  if (state.nextWeekPlan && state.nextWeekPlan.weekStart !== nextMon) {
    state.nextWeekPlan = null;
    try { localStorage.removeItem(KEYS.NEXT_WEEK_PLAN); } catch (e) {}
  }
  var nextCardio = (claudeValidCardio(c) && c.date === today && c.id !== sync.lastImportedCardioId) ? c : null;
  var changed = beforeWeek !== claudeWeekRev(state.weekPlan) ||
                beforeNext !== claudeWeekRev(state.nextWeekPlan) ||
                (state.claudeCardio ? state.claudeCardio.id : null) !== (nextCardio ? nextCardio.id : null);
  state.claudeCardio = nextCardio;
  return changed;
}

// 반환: Promise<{ ok, changed?, skipped? }>
function fetchClaudePlans() {
  var token = getSyncToken();
  if (!token) return Promise.resolve({ ok: false, skipped: 'no_token' });
  if (!claudeCanFetch()) return Promise.resolve({ ok: false, skipped: 'no_fetch' });
  var req;
  try {
    req = fetch('/api/plan', { method: 'GET', cache: 'no-store', headers: { 'Authorization': 'Bearer ' + token } });
  } catch (e) {
    return Promise.resolve({ ok: false });
  }
  return Promise.resolve(req).then(function(res) {
    if (!res || !res.ok) return { ok: false, status: res ? res.status : 0 };
    return res.json().then(function(body) {
      var changed = applyClaudePlans(body);
      // 계획은 홈 카드·운동 탭·기록 탭 세트 카드·러닝 탭 줄에 뜬다 — 그 화면일 때만 다시 그린다.
      if (changed && !state.activeSession &&
          ['home', 'workout', 'running', 'stats'].indexOf(state.currentTab) !== -1 &&
          typeof render === 'function') {
        render();
      }
      return { ok: true, changed: changed };
    });
  }).catch(function() { return { ok: false }; });
}

// init() 끝 · 다시 보일 때: 보내고 받아 온다.
function runClaudeSync() {
  if (!getSyncToken()) return Promise.resolve({ ok: false, skipped: 'no_token' });
  _claudeLastSyncAt = Date.now();
  return uploadClaudeSnapshot().then(function() { return fetchClaudePlans(); });
}

function claudeSyncOnVisible() {
  if (typeof document === 'undefined' || !document || document.visibilityState !== 'visible') return;
  if (Date.now() - _claudeLastSyncAt < CLAUDE_VISIBLE_SYNC_MIN_MS) return;
  runClaudeSync();
}

(function() {
  if (typeof document === 'undefined' || !document || typeof document.addEventListener !== 'function') return;
  document.addEventListener('visibilitychange', claudeSyncOnVisible);
})();

// ── 가져오기 ─────────────────────────────
function claudeCardioTotalMin(plan) {
  var sec = ((plan && plan.segments) || []).reduce(function(n, s) { return n + (claudeNum(s && s.sec) || 0); }, 0);
  return Math.round(sec / 60);
}

// 러닝 탭 한 줄의 글자 (예: 'Claude 유산소 · 경사 걷기 30분')
function claudeCardioRowText(plan) {
  return 'Claude 유산소 · ' + (CLAUDE_CARDIO_MODE_KR[plan.mode] || '') + ' ' + claudeCardioTotalMin(plan) + '분';
}

// 주간 세션 → 2단계 종목 [{name, note, claudeSets}]. 이 세션을 손으로 고친 편집본이 있고
// 그 뒤로 Claude 가 세션을 다시 저장하지 않았으면(rev === session.updatedAt) 편집본, 아니면 계획 원본.
function claudeWeekSessionExercises(plan, session) {
  var edits = storage.get(KEYS.WEEK_EDITS, {}) || {};
  var e = edits[plan.weekStart + '|' + session.label];
  if (e && e.rev === session.updatedAt && Array.isArray(e.exercises)) {
    return JSON.parse(JSON.stringify(e.exercises));
  }
  return (session.exercises || []).map(function(ex) {
    return {
      name: ex.name,
      note: ex.note,
      claudeSets: (ex.sets || []).map(function(s) {
        return { weight: s.weight, reps: s.reps, warmup: s.warmup === true, restSec: s.restSec };
      })
    };
  });
}

// Claude 유산소 → cardioNormalizePlan 이 먹는 모양 (구간 sec → startSec/endSec 누적)
function claudeCardioToPlanInput(plan) {
  var t = 0;
  return {
    headline: plan.title,
    note: plan.note,
    segments: plan.segments.map(function(s) {
      var sec = claudeNum(s.sec) || 0;
      var seg = { type: s.type, startSec: t, endSec: t + sec, speed: s.speed, incline: s.incline };
      t += sec;
      return seg;
    })
  };
}

// ── Claude 세트 (2단계 미리보기 · 세션) ─────────────────────────────
// 반복 '8' 또는 '8-10' → { low, high }
function claudeRepsRange(reps) {
  var m = String(reps == null ? '' : reps).match(/^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/);
  if (!m) return null;
  var low = parseInt(m[1], 10);
  var high = m[2] ? parseInt(m[2], 10) : low;
  if (high < low) high = low;
  return { low: low, high: high };
}

function claudeWorkingSets(ex) {
  return ((ex && ex.claudeSets) || []).filter(function(s) { return s && !s.warmup; });
}

function isClaudePreviewExercise(ex) {
  return !!ex && !Array.isArray(ex.sets) && Array.isArray(ex.claudeSets);
}

function isClaudeSession() {
  return !!(state.activeSession && state.activeSession.source === 'claude');
}

function claudeWeightText(w, assist) {
  if (w === null || w === undefined) return '맨몸';
  return (assist ? '보조 ' : '') + w + 'kg';
}

// 화면에 적는 무게 = 세션이 실제로 만들 세트와 같은 숫자(장비 단위 스냅). 저장된 원값은 그대로 둔다.
function claudeShownWeight(w, name) {
  return (typeof w === 'number') ? snapWeightToEquipment(w, name) : w;
}

// 세트 요약 한 줄: '워밍업 2 · 60kg×8 · 55kg×10×2' (같은 무게×반복이 이어지면 ×N)
function claudeSetsSummary(ex) {
  var sets = (ex && ex.claudeSets) || [];
  var assist = isReverseProgression(ex && ex.name);
  var warm = sets.filter(function(s) { return s && s.warmup; }).length;
  var parts = warm ? ['워밍업 ' + warm] : [];
  var prev = null, count = 0;
  claudeWorkingSets(ex).forEach(function(s) {
    var t = claudeWeightText(claudeShownWeight(s.weight, ex.name), assist) + '×' + String(s.reps).replace(/-/g, '~');
    if (t === prev) { count++; return; }
    if (prev !== null) parts.push(count > 1 ? prev + '×' + count : prev);
    prev = t; count = 1;
  });
  if (prev !== null) parts.push(count > 1 ? prev + '×' + count : prev);
  return parts.join(' · ');
}

// 편집 시트가 적는 값 (Claude 종목) — 무게는 작업 세트 중 가장 무거운 값, 반복은 작업 세트 전부의 폭.
function claudeEditValues(ex) {
  var work = claudeWorkingSets(ex);
  var weights = work.map(function(s) { return claudeShownWeight(s.weight, ex.name); }).filter(function(w) { return typeof w === 'number'; });
  var reps = work.map(function(s) { return String(s.reps); });
  var same = reps.every(function(r) { return r === reps[0]; });
  var repsText = '';
  if (reps.length && same) repsText = reps[0];
  else if (reps.length) {
    var lows = [], highs = [];
    reps.forEach(function(r) { var g = claudeRepsRange(r); if (g) { lows.push(g.low); highs.push(g.high); } });
    repsText = lows.length ? Math.min.apply(null, lows) + '-' + Math.max.apply(null, highs) : '';
  }
  return {
    weight: weights.length ? Math.max.apply(null, weights) : null,
    reps: repsText,
    sets: work.length
  };
}

function claudeShiftReps(reps, delta) {
  var g = claudeRepsRange(reps);
  if (!g) return reps;
  var lo = Math.max(1, g.low + delta);
  var hi = Math.max(lo, g.high + delta);
  return (g.high > g.low) ? (lo + '-' + hi) : String(lo);
}

// Claude 종목 편집. field: 'weight'(작업 세트 전부 같은 폭 · 워밍업 제외 · 장비 단위) |
// 'reps'(작업 세트 전부) | 'sets'(+1 = 마지막 작업 세트 복제 / −1 = 삭제, 최소 1). 반환: 바뀌었는가.
var CLAUDE_EDIT_MAX_SETS = 10;
function applyClaudeExerciseEdit(ex, field, delta) {
  if (!isClaudePreviewExercise(ex)) return false;
  var changed = false;
  if (field === 'weight') {
    ex.claudeSets.forEach(function(s) {
      if (!s || s.warmup) return;
      if (typeof s.weight !== 'number' && delta <= 0) return;   // 맨몸(무게 없음)은 내려갈 곳이 없다
      var base = (typeof s.weight === 'number') ? s.weight : 0;
      var w = snapWeightToEquipment(Math.max(0, base + delta), ex.name);
      if (w !== s.weight) { s.weight = w; changed = true; }
    });
  } else if (field === 'reps') {
    ex.claudeSets.forEach(function(s) {
      if (!s || s.warmup) return;
      var r = claudeShiftReps(s.reps, delta);
      if (r !== s.reps) { s.reps = r; changed = true; }
    });
  } else if (field === 'sets') {
    var lastIdx = -1;
    ex.claudeSets.forEach(function(s, i) { if (s && !s.warmup) lastIdx = i; });
    var workCount = claudeWorkingSets(ex).length;
    if (lastIdx === -1) return false;
    if (delta > 0 && workCount < CLAUDE_EDIT_MAX_SETS) {
      var src = ex.claudeSets[lastIdx];
      ex.claudeSets.splice(lastIdx + 1, 0, { weight: src.weight, reps: src.reps, warmup: false, restSec: src.restSec });
      changed = true;
    } else if (delta < 0 && workCount > 1) {
      ex.claudeSets.splice(lastIdx, 1);
      changed = true;
    }
  }
  return changed;
}

// ── Claude 세션 종목 편집 (운동 중) ──
// 남은(미완료) 세트만 손댄다. 워밍업 추가·세트법 재배정·휴식 재계산은 하지 않는다(설계서 결정 5).
// field: 'weight'(미완료 작업 세트 전부 같은 폭 · 장비 단위) | 'reps'(미완료 작업 세트 전부) |
// 'sets'(+1 = 마지막 작업 세트 복제 / −1 = 마지막 미완료 작업 세트 삭제, 작업 세트 최소 1). 반환: 바뀌었는가.
function claudePendingWorkSets(ex) {
  return ((ex && ex.sets) || []).filter(function(st) { return st && !st.completed && !st.isWarmup; });
}

function claudeShiftSetReps(st, delta) {
  var before = [st.reps, st.repsTarget, st.repsMin, st.repsMax].join('/');
  if (typeof st.reps === 'number') st.reps = Math.max(1, st.reps + delta);
  if (typeof st.repsTarget === 'number') st.repsTarget = Math.max(1, st.repsTarget + delta);
  if (typeof st.repsMin === 'number' && typeof st.repsMax === 'number') {
    var lo = Math.max(1, st.repsMin + delta);
    st.repsMax = Math.max(lo, st.repsMax + delta);
    st.repsMin = lo;
  }
  return before !== [st.reps, st.repsTarget, st.repsMin, st.repsMax].join('/');
}

// 목표 반복 글자 = 작업 세트의 계획 반복 폭 (buildClaudeSessionExercise 와 같은 규칙)
function claudeSessionTargetReps(ex) {
  var lows = [], highs = [];
  ((ex && ex.sets) || []).forEach(function(st) {
    if (!st || st.isWarmup) return;
    var lo = (typeof st.repsMin === 'number') ? st.repsMin : (typeof st.repsTarget === 'number' ? st.repsTarget : st.reps);
    var hi = (typeof st.repsMax === 'number') ? st.repsMax : lo;
    if (typeof lo !== 'number') return;
    lows.push(lo); highs.push(hi);
  });
  if (!lows.length) return null;
  var l = Math.min.apply(null, lows), h = Math.max.apply(null, highs);
  return (h > l) ? (l + '-' + h) : String(l);
}

function claudeCloneWorkSet(src) {
  var planned = (src.completed && typeof src.repsTarget === 'number') ? src.repsTarget : src.reps;
  var row = { weight: src.weight, reps: planned, repsTarget: (typeof src.repsTarget === 'number') ? src.repsTarget : planned,
              isWarmup: false, completed: false, role: 'work' };
  if (typeof src.repsMin === 'number' && typeof src.repsMax === 'number') { row.repsMin = src.repsMin; row.repsMax = src.repsMax; }
  if (typeof src.rest === 'number' && src.rest >= 0) row.rest = src.rest;
  return row;
}

function applyClaudeSessionEdit(ex, field, delta) {
  if (!ex || !Array.isArray(ex.sets) || !delta) return false;
  restoreSkippedSets(ex);   // 건너뛴 종목을 고치면 건너뛰기는 풀린다 (세트법 재구성과 같은 규칙)
  var changed = false;
  if (field === 'weight') {
    claudePendingWorkSets(ex).forEach(function(st) {
      if (typeof st.weight !== 'number' && delta <= 0) return;   // 맨몸(무게 없음)은 내려갈 곳이 없다
      var base = (typeof st.weight === 'number') ? st.weight : 0;
      var w = snapWeightToEquipment(Math.max(0, base + delta), ex.name);
      if (w !== st.weight) { st.weight = w; changed = true; }
    });
  } else if (field === 'reps') {
    claudePendingWorkSets(ex).forEach(function(st) {
      if (claudeShiftSetReps(st, delta)) changed = true;
    });
  } else if (field === 'sets') {
    var steps = Math.abs(delta);
    for (var i = 0; i < steps; i++) {
      var work = ex.sets.filter(function(st) { return st && !st.isWarmup; });
      var pending = claudePendingWorkSets(ex);
      if (delta > 0) {
        if (!work.length || work.length >= CLAUDE_EDIT_MAX_SETS) break;
        var src = work[work.length - 1];
        ex.sets.splice(ex.sets.indexOf(src) + 1, 0, claudeCloneWorkSet(src));
        changed = true;
      } else {
        if (!pending.length || work.length <= 1) break;
        ex.sets.splice(ex.sets.indexOf(pending[pending.length - 1]), 1);
        changed = true;
      }
    }
  } else {
    return false;
  }
  if (changed) {
    var tr = claudeSessionTargetReps(ex);
    if (tr) { ex.targetReps = tr; ex.reps = tr; }
  }
  return changed;
}

// Claude 세션 종목 교체 — 받은 세트를 그대로 두고 이름만 바꾼다(2단계 교체와 같은 규칙).
// 남은 세트의 무게만 새 종목의 장비 단위로 맞춘다. 완료한 세트는 건드리지 않는다.
function swapClaudeSessionExercise(ex, newName) {
  restoreSkippedSets(ex);
  var info = EXERCISE_BODY_PART_MAP[newName] || getExercisePart(newName);
  ex.name = newName;
  if (info) ex.type = info.compound ? '복합' : '고립';
  (ex.sets || []).forEach(function(st) {
    if (!st || st.completed || typeof st.weight !== 'number') return;
    st.weight = snapWeightToEquipment(st.weight, newName);
  });
  ex.lastWeight = claudeLastHardestWeight(newName);
}

// 지난 세션에서 가장 어려운 작업 무게 — PR 판정용 사실값(추천 엔진을 거치지 않는다).
function claudeLastHardestWeight(name) {
  var last = getLastPerformedSets(name);
  if (!last || !Array.isArray(last.sets)) return null;
  var reverse = isReverseProgression(name);
  var ws = last.sets.filter(function(s) {
    return s && !s.isWarmup && !isOffProgressSet(s) && typeof s.weight === 'number' &&
      (reverse ? s.weight >= 0 : s.weight > 0) && s.reps > 0;
  }).map(function(s) { return s.weight; });
  return ws.length ? hardestWeight(name, ws) : null;
}

// Claude 종목 → 세션 종목. 세트는 받은 그대로(무게만 장비 단위 스냅).
function buildClaudeSessionExercise(ex) {
  var name = ex.name;
  var info = EXERCISE_BODY_PART_MAP[name] || getExercisePart(name);
  var lows = [], highs = [];
  var sets = ex.claudeSets.map(function(cs) {
    var g = claudeRepsRange(cs.reps) || { low: 0, high: 0 };
    var w = (cs.weight === null || cs.weight === undefined) ? null : snapWeightToEquipment(Number(cs.weight), name);
    var row = { weight: w, reps: g.low, repsTarget: g.low, isWarmup: cs.warmup === true, completed: false,
                role: cs.warmup === true ? 'warmup' : 'work' };
    if (g.high > g.low) { row.repsMin = g.low; row.repsMax = g.high; }
    if (typeof cs.restSec === 'number' && cs.restSec >= 0) row.rest = cs.restSec;
    if (!row.isWarmup) { lows.push(g.low); highs.push(g.high); }
    return row;
  });
  var lo = lows.length ? Math.min.apply(null, lows) : 0;
  var hi = highs.length ? Math.max.apply(null, highs) : 0;
  var targetReps = (hi > lo) ? (lo + '-' + hi) : String(lo);
  return {
    name: name,
    type: info ? (info.compound ? '복합' : '고립') : '고립',
    sets: sets,
    scheme: 'straight',
    reps: targetReps,
    targetReps: targetReps,
    lastWeight: claudeLastHardestWeight(name),
    lastReps: null,
    note: ex.note
  };
}

// Claude 세션 중 사용자가 직접 넣은 종목(Opus 값 없음)의 세트 — 설계서 결정 13.
// 그 종목의 마지막 수행 작업 세트를 그대로(무게·반복·세트 수), 워밍업 없음.
// 휴식 = 지금 종목의 마지막 작업 세트 휴식(claudeRestSec 규칙). 기록이 없으면 무게 빈칸·10회·3세트.
// 세트법·자동 워밍업·getSessionSetPlan 을 거치지 않는다.
function claudeUserAddedSets(name, currentEx) {
  var last = getRecentPerformances(name, 1)[0];
  var src = (last && Array.isArray(last.sets)) ? last.sets.filter(function(s) { return s && !s.isWarmup; }) : [];
  var curWork = ((currentEx && currentEx.sets) || []).filter(function(st) { return st && !st.isWarmup; });
  var rest = claudeRestSec(currentEx || { name: name }, curWork.length ? curWork[curWork.length - 1] : null);
  var rows = src.map(function(s) {
    var w = (s.weight === null || s.weight === undefined || s.weight === '') ? null : Number(s.weight);
    if (w !== null && isNaN(w)) w = null;
    var r = parseInt(s.reps, 10);
    if (isNaN(r)) r = 0;
    return { weight: w, reps: r };
  });
  if (!rows.length) rows = [{ weight: null, reps: 10 }, { weight: null, reps: 10 }, { weight: null, reps: 10 }];
  return rows.map(function(x) {
    return { weight: x.weight, reps: x.reps, repsTarget: x.reps, isWarmup: false, completed: false, role: 'work', rest: rest };
  });
}

function buildClaudeUserExercise(name, currentEx) {
  var info = EXERCISE_BODY_PART_MAP[name] || getExercisePart(name);
  var ex = {
    name: name,
    type: info ? (info.compound ? '복합' : '고립') : '고립',
    sets: claudeUserAddedSets(name, currentEx),
    scheme: 'straight',
    lastWeight: claudeLastHardestWeight(name),
    lastReps: null,
    addedInSession: true    // 운동 중에 끼워 넣은 종목 표시 (화면 뱃지용)
  };
  var tr = claudeSessionTargetReps(ex) || '10';
  ex.reps = tr;
  ex.targetReps = tr;
  return ex;
}

// Claude 세션의 휴식 — 세트에 적힌 휴식 그대로(자가조절 +30초 없음). 없으면 기본값.
function claudeRestSec(exercise, set) {
  if (set && typeof set.rest === 'number' && set.rest >= 0) return set.rest;
  return baseRestSec(exercise, set);
}

// 마지막 전송 시각 (KST) 'YYYY.MM.DD HH:MM'
function claudeFmtUploadAt(iso) {
  var t = iso ? Date.parse(iso) : NaN;
  if (isNaN(t)) return '';
  var k = new Date(t + 9 * 3600000);
  return k.getUTCFullYear() + '.' + String(k.getUTCMonth() + 1).padStart(2, '0') + '.' +
    String(k.getUTCDate()).padStart(2, '0') + ' ' + String(k.getUTCHours()).padStart(2, '0') + ':' +
    String(k.getUTCMinutes()).padStart(2, '0');
}
