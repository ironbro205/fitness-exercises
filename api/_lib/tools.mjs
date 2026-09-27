// Pure logic for the five MCP tools (no dependencies; store and clock are injected).
// Every tool returns an MCP CallToolResult: { content: [{ type: 'text', text }], isError? }.
// The context text is raw data only — no computed values, no interpretation — except the app-counted
// weekly sets per group (snapshot.weekSets) and the per-exercise group weights they are counted with.
import { GUIDE } from './guide.mjs';
import { kstDateStr, kstDateTimeStr, weekdayKr, kstWeekStart, kstAddDays } from './kst.mjs';
import { KEY_SNAPSHOT, KEY_PLAN_CARDIO, weekKey } from './store.mjs';

// Snapshot catalog keys (the app's session kinds).
export const SESSIONS = ['push', 'pull', 'legs', 'upper', 'free'];
export const PLAN_TYPES = ['full', 'upper', 'lower', 'push', 'pull'];
export const TYPE_CATALOG = { full: 'free', upper: 'upper', lower: 'legs', push: 'push', pull: 'pull' };
export const TYPE_LABEL = { full: '전신', upper: '상체', lower: '하체', push: 'PUSH', pull: 'PULL' };
// Body-part groups — same keys, Korean names and order as the app's BODY_PART_GROUPS (js/data.js).
export const GROUPS = [
  ['chest', '가슴'],
  ['shoulders_front', '어깨 전면'],
  ['shoulders_side', '어깨 측면'],
  ['shoulders_rear', '어깨 후면'],
  ['triceps', '삼두'],
  ['lats', '광배'],
  ['upper_back', '등 중부'],
  ['biceps', '이두'],
  ['quads', '대퇴사두'],
  ['hamstrings', '햄스트링'],
  ['glutes', '둔근'],
  ['adductors', '내전근'],
  ['calves', '종아리'],
  ['abs', '복근']
];
export const WEEK_CHOICES = ['this', 'next'];
export const MAX_SESSIONS = 7;
export const CARDIO_MODES = ['interval', 'walk'];
export const SEGMENT_TYPES = ['warmup', 'walk', 'run', 'cooldown'];
export const STALE_MS = 12 * 60 * 60 * 1000;
export const NO_SNAPSHOT_TEXT = '헬스앱을 한 번 열면 기록이 올라와요.';

var GROUP_KEYS = GROUPS.map(function (g) { return g[0]; });
var CARDIO_MODE_LABEL = { interval: '인터벌', walk: '경사 걷기' };
var SEGMENT_LABEL = { warmup: '워밍업', walk: '걷기', run: '달리기', cooldown: '쿨다운' };
var NO_SNAPSHOT_SAVE_TEXT = '헬스앱 기록이 아직 올라오지 않아 저장하지 않았어요. 사용자가 헬스앱을 한 번 열면 기록이 올라와요.';

function textResult(text, isError) {
  var r = { content: [{ type: 'text', text: text }] };
  if (isError) r.isError = true;
  return r;
}

function errorResult(lines) {
  return textResult(lines.join('\n'), true);
}

function inputErrorResult(errs) {
  return errorResult(['입력이 형식에 맞지 않아 저장하지 않았어요.'].concat(errs.map(function (e) { return '- ' + e; })));
}

function isNum(v) {
  return typeof v === 'number' && isFinite(v);
}

function isInt(v) {
  return typeof v === 'number' && Number.isInteger(v);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function byDateDesc(list) {
  return (Array.isArray(list) ? list.slice() : []).sort(function (a, b) {
    var da = String(a && a.date || ''), db = String(b && b.date || '');
    return da < db ? 1 : da > db ? -1 : 0;
  });
}

// ---------- weeks ----------

// Monday (KST) of the week a tool acts on. week: 'this' | 'next' | undefined.
// With no week, rule 'save' picks next week on a Sunday (KST) and this week otherwise; rule 'update' picks this week.
export function resolveWeekStart(nowDate, week, defaultRule) {
  var today = kstDateStr(nowDate);
  var mon = kstWeekStart(today);
  if (week === 'this') return mon;
  if (week === 'next') return kstAddDays(mon, 7);
  if (defaultRule === 'save' && weekdayKr(today) === '일') return kstAddDays(mon, 7);
  return mon;
}

// { planLabel: earliest date } for workouts in the latest snapshot that belong to the given week's plan.
export function doneSessions(snapshot, weekStart) {
  // Map, not a plain object: labels such as 'toString' or '__proto__' must not hit Object.prototype.
  var done = new Map();
  if (snapshot && Array.isArray(snapshot.workouts)) {
    snapshot.workouts.forEach(function (w) {
      if (!w || w.planWeek !== weekStart || typeof w.planLabel !== 'string') return;
      var d = String(w.date || '');
      if (!done.has(w.planLabel) || d < done.get(w.planLabel)) done.set(w.planLabel, d);
    });
  }
  return Object.fromEntries(done); // own data properties only (also for '__proto__')
}

// ---------- formatting ----------

function formatElapsed(ms) {
  if (ms < 0) ms = 0;
  var min = Math.floor(ms / 60000);
  if (min < 60) return min + '분 전';
  var hours = Math.floor(min / 60);
  if (hours < 48) return hours + '시간 전';
  return Math.floor(hours / 24) + '일 전';
}

function formatDuration(sec) {
  var m = Math.floor(sec / 60), s = sec % 60;
  if (m && s) return m + '분 ' + s + '초';
  if (m) return m + '분';
  return s + '초';
}

function formatSet(set, assist) {
  var reps = set && set.reps !== null && set.reps !== undefined ? String(set.reps) : '?';
  var w = set ? set.weight : null;
  var body;
  if (w === null || w === undefined) body = '맨몸×' + reps;
  else body = (assist ? '보조 ' : '') + w + 'kg×' + reps;
  return (set && set.warmup ? '워밍업 ' : '') + (set && set.drop === true ? '드롭 ' : '') + body;
}

function formatSets(sets, assist) {
  if (!Array.isArray(sets) || sets.length === 0) return '(세트 없음)';
  return sets.map(function (s) { return formatSet(s, assist); }).join(', ');
}

function workoutHeader(w) {
  var parts = ['### ' + w.date + ' (' + weekdayKr(w.date) + ') ' + (w.sessionName || w.session || '')];
  if (isNum(w.durationMin)) parts.push(w.durationMin + '분');
  if (isNum(w.rpe)) parts.push('세션 RPE ' + w.rpe);
  if (isNum(w.condition)) parts.push('컨디션 ' + w.condition);
  if (isNonEmptyString(w.planLabel)) parts.push('계획 세션 ' + w.planLabel);
  return parts.join(' · ');
}

function segmentText(seg) {
  var label = SEGMENT_LABEL[seg.type] || String(seg.type);
  return label + ' ' + formatDuration(seg.sec) + ' ' + seg.speed + 'km/h ' + seg.incline + '%';
}

// Consecutive identical segments are merged as "×N"; everything else is listed as-is.
function segmentsSummary(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return '';
  var out = [];
  var prev = null, count = 0;
  segments.forEach(function (seg) {
    var t = segmentText(seg);
    if (t === prev) { count++; return; }
    if (prev !== null) out.push(count > 1 ? prev + ' ×' + count : prev);
    prev = t; count = 1;
  });
  out.push(count > 1 ? prev + ' ×' + count : prev);
  return out.join(' → ');
}

function cardioLine(c) {
  var parts = ['- ' + c.date + ' (' + weekdayKr(c.date) + ') ' + (CARDIO_MODE_LABEL[c.mode] || String(c.mode))];
  if (isNum(c.totalSec)) parts.push('총 ' + formatDuration(Math.round(c.totalSec)));
  if (isNum(c.rpe)) parts.push('RPE ' + c.rpe);
  var seg = segmentsSummary(c.segments);
  if (seg) parts.push('구간: ' + seg);
  return parts.join(' · ');
}

function bodyLine(b) {
  var s = '- ' + b.date + ': ' + b.weightKg + 'kg';
  if (isNum(b.bodyFatPct)) s += ' · 체지방 ' + b.bodyFatPct + '%';
  return s;
}

// "가슴(chest) 12 · 광배(lats) 10" in GROUPS order. keep(value) decides which entries appear.
function groupLine(map, keep) {
  var obj = isPlainObject(map) ? map : {};
  return GROUPS.filter(function (g) {
    return Object.prototype.hasOwnProperty.call(obj, g[0]) && keep(obj[g[0]]);
  }).map(function (g) { return g[1] + '(' + g[0] + ') ' + obj[g[0]]; }).join(' · ');
}

function mmddWeekday(dateStr) {
  return String(dateStr).slice(5, 10) + '(' + weekdayKr(dateStr) + ')';
}

// Lines for one WeekPlan (after its "## …" heading).
function weekPlanLines(plan, done) {
  var lines = [];
  lines.push(plan.days + '일' + (plan.deload ? ' · 디로드' : ''));
  if (isNonEmptyString(plan.note)) lines.push(plan.note);
  lines.push('### 목표 세트');
  lines.push(groupLine(plan.targets, isNum) || '(없음)');
  (plan.sessions || []).forEach(function (s) {
    var status = Object.prototype.hasOwnProperty.call(done, s.label) ? '끝남 ' + mmddWeekday(done[s.label]) : '남음';
    lines.push('### ' + s.label + ' (' + s.type + ') — ' + status);
    if (isNonEmptyString(s.note)) lines.push(s.note);
    (s.exercises || []).forEach(function (ex) {
      lines.push('- ' + ex.name + ': ' + formatSets(ex.sets, false));
    });
  });
  return lines;
}

function catalogLine(list) {
  return Array.isArray(list) && list.length ? list.join(', ') : '(없음)';
}

// weekPlans: { thisWeek: WeekPlan|null, nextWeek: WeekPlan|null }.
export function formatContext(snapshot, nowDate, type, weekPlans) {
  var plans = weekPlans || {};
  var lines = [];
  var uploaded = new Date(snapshot.uploadedAt);
  var elapsed = nowDate.getTime() - uploaded.getTime();
  var today = kstDateStr(nowDate);
  var mon = kstWeekStart(today);
  var nextMon = kstAddDays(mon, 7);

  // 1) staleness warning, 2) upload time, 3) today and this week
  if (elapsed > STALE_MS) {
    lines.push('주의: 기록이 올라온 지 12시간이 넘었어요. 그 뒤의 운동은 빠져 있을 수 있어요.');
  }
  lines.push('올린 시각: ' + kstDateTimeStr(uploaded) + ' (KST) · ' + formatElapsed(elapsed));
  lines.push('오늘: ' + today + ' (' + weekdayKr(today) + ') · 이번 주 ' + mon + ' ~ ' + kstAddDays(mon, 6));
  lines.push('');

  // 4) guide
  lines.push(GUIDE);
  lines.push('');

  // 5) user info
  var p = snapshot.profile || {};
  lines.push('## 사용자 정보');
  if (isNum(p.age)) lines.push('- 나이: ' + p.age + '세');
  if (isNum(p.heightCm)) lines.push('- 키: ' + p.heightCm + 'cm');
  if (isNum(p.weightKg)) lines.push('- 체중: ' + p.weightKg + 'kg');
  if (Array.isArray(snapshot.equipment) && snapshot.equipment.length) {
    lines.push('- 보유 장비: ' + snapshot.equipment.join(', '));
  }
  lines.push('');

  // 6) this week's plan
  lines.push('## 이번 주 계획');
  if (plans.thisWeek) lines.push.apply(lines, weekPlanLines(plans.thisWeek, doneSessions(snapshot, mon)));
  else lines.push('아직 없어요.');
  lines.push('');

  // 7) next week's plan (only when saved)
  if (plans.nextWeek) {
    lines.push('## 다음 주 계획');
    lines.push.apply(lines, weekPlanLines(plans.nextWeek, doneSessions(snapshot, nextMon)));
    lines.push('');
  }

  // 8) this week's actual sets per group (counted by the app)
  lines.push('## 이번 주 부위별 실제 세트');
  var ws = snapshot.weekSets;
  if (isPlainObject(ws) && ws.weekStart === mon) {
    lines.push(groupLine(ws.byGroup, function (v) { return isNum(v) && v !== 0; }) || '아직 없어요.');
  } else {
    lines.push('이번 주 기록이 아직 올라오지 않았어요.');
  }
  lines.push('');

  // 9) weight training, 8 weeks
  lines.push('## 웨이트 기록 (최근 8주, 최신순)');
  var workouts = byDateDesc(snapshot.workouts);
  if (workouts.length === 0) lines.push('기록 없음');
  workouts.forEach(function (w) {
    lines.push(workoutHeader(w));
    (w.exercises || []).forEach(function (ex) {
      lines.push('- ' + ex.name + ': ' + formatSets(ex.sets, ex.assist));
    });
  });
  lines.push('');

  // 10) older exercises, last performance
  lines.push('## 8주 넘게 안 한 종목 (마지막 1회)');
  var older = byDateDesc(snapshot.olderLastPerformed);
  if (older.length === 0) lines.push('기록 없음');
  older.forEach(function (o) {
    lines.push('- ' + o.name + ' (' + o.date + '): ' + formatSets(o.sets, o.assist));
  });
  lines.push('');

  // 11) cardio, 8 weeks
  lines.push('## 유산소 기록 (최근 8주, 최신순)');
  var cardio = byDateDesc(snapshot.cardio);
  if (cardio.length === 0) lines.push('기록 없음');
  cardio.forEach(function (c) { lines.push(cardioLine(c)); });
  lines.push('');

  // 12) body weight
  lines.push('## 체중 기록');
  var body = byDateDesc(snapshot.body);
  if (body.length === 0) lines.push('기록 없음');
  body.forEach(function (b) { lines.push(bodyLine(b)); });
  lines.push('');

  // 13) catalog
  var catalog = snapshot.catalog || {};
  if (type) {
    lines.push('## 종목 목록 (' + type + ')');
    lines.push(catalogLine(catalog[TYPE_CATALOG[type]]));
  } else {
    lines.push('## 종목 목록');
    PLAN_TYPES.forEach(function (t) {
      lines.push('### ' + t + (t === 'full' ? ' (전체)' : ''));
      lines.push(catalogLine(catalog[TYPE_CATALOG[t]]));
    });
  }
  lines.push('');

  // 14) per-exercise group weights
  lines.push('## 종목별 부위 세트 무게');
  var mw = snapshot.muscleWeights;
  if (isPlainObject(mw)) {
    // catalog.free order first, then names only in muscleWeights (recorded aliases, free input) in 가나다 order.
    var free = Array.isArray(catalog.free) ? catalog.free : [];
    var extra = Object.keys(mw).filter(function (n) { return free.indexOf(n) === -1; })
      .sort(function (a, b) { return a.localeCompare(b, 'ko'); });
    free.concat(extra).forEach(function (name) {
      var line = hasOwn(mw, name) ? groupLine(mw[name], isNum) : '';
      lines.push('- ' + name + ': ' + (line || '(부위 정보 없음)'));
    });
  } else {
    lines.push('헬스앱을 새 버전으로 열면 올라와요.');
  }
  return lines.join('\n');
}

// ---------- name suggestions ----------

function charCounts(s) {
  var m = new Map();
  Array.from(String(s).replace(/\s+/g, '')).forEach(function (ch) {
    m.set(ch, (m.get(ch) || 0) + 1);
  });
  return m;
}

function overlap(a, b) {
  var ca = charCounts(a), cb = charCounts(b), n = 0;
  ca.forEach(function (cnt, ch) {
    if (cb.has(ch)) n += Math.min(cnt, cb.get(ch));
  });
  return n;
}

// Top 3 catalog names by shared-character count (ties: closer length, then catalog order).
export function suggestNames(name, catalogList) {
  var len = String(name).replace(/\s+/g, '').length;
  return (catalogList || []).map(function (c, i) {
    return { name: c, score: overlap(name, c), diff: Math.abs(String(c).replace(/\s+/g, '').length - len), i: i };
  }).filter(function (x) { return x.score > 0; })
    .sort(function (a, b) { return b.score - a.score || a.diff - b.diff || a.i - b.i; })
    .slice(0, 3)
    .map(function (x) { return x.name; });
}

// ---------- input validation (mirrors the zod schemas in api/mcp/[token].mjs) ----------

var REPS_RANGE_RE = /^(\d{1,3})-(\d{1,3})$/;

function normalizeReps(reps) {
  if (isInt(reps) && reps >= 1 && reps <= 100) return String(reps);
  if (typeof reps === 'string') {
    var m = REPS_RANGE_RE.exec(reps);
    if (m) {
      var a = Number(m[1]), b = Number(m[2]);
      if (a >= 1 && b <= 100 && a < b) return a + '-' + b;
    }
  }
  return null;
}

function trimmedLabel(label) {
  return typeof label === 'string' ? label.trim() : '';
}

function validateExercises(exercises, prefix) {
  var errs = [];
  if (!Array.isArray(exercises) || exercises.length < 1 || exercises.length > 20) {
    errs.push(prefix + 'exercises는 1~20개여야 해요.');
    return errs;
  }
  exercises.forEach(function (ex, i) {
    var where = prefix + 'exercises[' + i + ']';
    if (!ex || typeof ex !== 'object') { errs.push(where + '가 객체가 아니에요.'); return; }
    if (!isNonEmptyString(ex.name)) errs.push(where + '.name이 비어 있어요.');
    if (ex.note !== undefined && ex.note !== null && typeof ex.note !== 'string') errs.push(where + '.note는 문자열이어야 해요.');
    if (!Array.isArray(ex.sets) || ex.sets.length < 1 || ex.sets.length > 15) {
      errs.push(where + '.sets는 1~15개여야 해요.');
      return;
    }
    ex.sets.forEach(function (s, j) {
      var sw = where + '.sets[' + j + ']';
      if (!s || typeof s !== 'object') { errs.push(sw + '가 객체가 아니에요.'); return; }
      if (!(s.weight === null || (isNum(s.weight) && s.weight >= 0 && s.weight <= 500))) errs.push(sw + '.weight는 0~500 숫자 또는 null이어야 해요.');
      if (normalizeReps(s.reps) === null) errs.push(sw + ".reps는 1~100 정수 또는 '8-10' 같은 범위 문자열이어야 해요.");
      if (s.warmup !== undefined && typeof s.warmup !== 'boolean') errs.push(sw + '.warmup은 true/false여야 해요.');
      if (s.restSec !== undefined && s.restSec !== null && !(isInt(s.restSec) && s.restSec >= 0 && s.restSec <= 600)) errs.push(sw + '.restSec는 0~600 정수여야 해요.');
    });
  });
  return errs;
}

// One plan session. prefix locates it in the error text (e.g. 'sessions[0].').
export function validateSessionInput(session, prefix) {
  prefix = prefix || '';
  if (!isPlainObject(session)) return [(prefix ? prefix.replace(/\.$/, '') : '세션') + '가 객체가 아니에요.'];
  var errs = [];
  var label = trimmedLabel(session.label);
  if (label.length < 1 || label.length > 12) errs.push(prefix + 'label은 앞뒤 공백을 빼고 1~12자여야 해요.');
  if (PLAN_TYPES.indexOf(session.type) === -1) errs.push(prefix + 'type은 full·upper·lower·push·pull 중 하나여야 해요.');
  if (session.note !== undefined && session.note !== null && typeof session.note !== 'string') errs.push(prefix + 'note는 문자열이어야 해요.');
  return errs.concat(validateExercises(session.exercises, prefix));
}

export function validateTargets(targets) {
  if (!isPlainObject(targets)) return ['targets는 객체여야 해요.'];
  var errs = [];
  var badKeys = Object.keys(targets).filter(function (k) { return GROUP_KEYS.indexOf(k) === -1; });
  if (badKeys.length) {
    errs.push('targets에 쓸 수 없는 키가 있어요: ' + badKeys.join(', ') + '. 쓸 수 있는 키: ' + GROUP_KEYS.join(', '));
  }
  Object.keys(targets).forEach(function (k) {
    if (GROUP_KEYS.indexOf(k) === -1) return;
    var v = targets[k];
    if (!(isNum(v) && v >= 0 && v <= 40)) errs.push('targets.' + k + '는 0~40 숫자여야 해요.');
  });
  return errs;
}

function validateWeek(week) {
  if (week === undefined || week === null || WEEK_CHOICES.indexOf(week) !== -1) return [];
  return ['week는 this 또는 next여야 해요.'];
}

function validateDays(days) {
  return days === 3 || days === 4 || days === 5 ? [] : ['days는 3·4·5 중 하나여야 해요.'];
}

function duplicateLabels(sessions) {
  var seen = new Set(), dup = [];
  sessions.forEach(function (s) {
    var l = trimmedLabel(s && s.label);
    if (!l) return;
    if (seen.has(l) && dup.indexOf(l) === -1) dup.push(l);
    seen.add(l);
  });
  return dup;
}

function validateSessionList(sessions, name, min) {
  if (!Array.isArray(sessions) || sessions.length < min || sessions.length > MAX_SESSIONS) {
    return [name + '는 ' + min + '~' + MAX_SESSIONS + '개여야 해요.'];
  }
  var errs = [];
  sessions.forEach(function (s, i) {
    errs = errs.concat(validateSessionInput(s, name + '[' + i + '].'));
  });
  var dup = duplicateLabels(sessions);
  if (dup.length) errs.push(name + '에 같은 label이 여러 번 있어요: ' + dup.join(', '));
  return errs;
}

function validateWeekPlanInput(input) {
  if (!isPlainObject(input)) return ['입력이 객체가 아니에요.'];
  var errs = [];
  errs = errs.concat(validateWeek(input.week));
  errs = errs.concat(validateDays(input.days));
  if (input.deload !== undefined && input.deload !== null && typeof input.deload !== 'boolean') errs.push('deload는 true/false여야 해요.');
  if (input.note !== undefined && input.note !== null && typeof input.note !== 'string') errs.push('note는 문자열이어야 해요.');
  errs = errs.concat(validateTargets(input.targets));
  errs = errs.concat(validateSessionList(input.sessions, 'sessions', 1));
  return errs;
}

function validateUpdateInput(input) {
  if (!isPlainObject(input)) return ['입력이 객체가 아니에요.'];
  var errs = [];
  errs = errs.concat(validateWeek(input.week));
  if (input.upsert !== undefined && input.upsert !== null) errs = errs.concat(validateSessionList(input.upsert, 'upsert', 0));
  if (input.remove !== undefined && input.remove !== null) {
    if (!Array.isArray(input.remove) || !input.remove.every(isNonEmptyString)) errs.push('remove는 label 문자열 배열이어야 해요.');
  }
  if (input.targets !== undefined && input.targets !== null) errs = errs.concat(validateTargets(input.targets));
  if (input.note !== undefined && input.note !== null && typeof input.note !== 'string') errs.push('note는 문자열이어야 해요.');
  if (input.deload !== undefined && input.deload !== null && typeof input.deload !== 'boolean') errs.push('deload는 true/false여야 해요.');
  if (input.days !== undefined && input.days !== null) errs = errs.concat(validateDays(input.days));
  return errs;
}

function validateCardioInput(input) {
  var errs = [];
  if (!input || typeof input !== 'object') return ['입력이 객체가 아니에요.'];
  if (CARDIO_MODES.indexOf(input.mode) === -1) errs.push('mode는 interval 또는 walk여야 해요.');
  if (!isNonEmptyString(input.title)) errs.push('title이 비어 있어요.');
  if (input.note !== undefined && input.note !== null && typeof input.note !== 'string') errs.push('note는 문자열이어야 해요.');
  if (!Array.isArray(input.segments) || input.segments.length < 1 || input.segments.length > 60) {
    errs.push('segments는 1~60개여야 해요.');
    return errs;
  }
  input.segments.forEach(function (seg, i) {
    var where = 'segments[' + i + ']';
    if (!seg || typeof seg !== 'object') { errs.push(where + '가 객체가 아니에요.'); return; }
    if (SEGMENT_TYPES.indexOf(seg.type) === -1) errs.push(where + '.type은 warmup·walk·run·cooldown 중 하나여야 해요.');
    if (!(isInt(seg.sec) && seg.sec >= 10 && seg.sec <= 3600)) errs.push(where + '.sec는 10~3600 정수여야 해요.');
    if (!(isNum(seg.speed) && seg.speed >= 0 && seg.speed <= 20)) errs.push(where + '.speed는 0~20 숫자여야 해요.');
    if (seg.incline !== undefined && seg.incline !== null && !(isNum(seg.incline) && seg.incline >= 0 && seg.incline <= 12)) errs.push(where + '.incline은 0~12 숫자여야 해요.');
  });
  return errs;
}

// Names missing from each session's type catalog → error lines (empty when all names are known).
function catalogErrors(snapshot, sessions) {
  var lines = [];
  sessions.forEach(function (s) {
    var key = TYPE_CATALOG[s.type];
    var list = (snapshot.catalog && Array.isArray(snapshot.catalog[key])) ? snapshot.catalog[key] : [];
    var bad = [];
    s.exercises.forEach(function (ex) {
      if (list.indexOf(ex.name) === -1 && bad.indexOf(ex.name) === -1) bad.push(ex.name);
    });
    if (!bad.length) return;
    lines.push(trimmedLabel(s.label) + ' (' + s.type + ') 종목 목록에 없는 이름이 있어 저장하지 않았어요.');
    bad.forEach(function (name) {
      var sug = suggestNames(name, list);
      lines.push('- ' + name + ' → 비슷한 목록 이름: ' + (sug.length ? sug.join(', ') : '(없음)'));
    });
  });
  return lines;
}

function normalizeSession(s, iso) {
  return {
    label: trimmedLabel(s.label),
    type: s.type,
    note: typeof s.note === 'string' ? s.note : '',
    updatedAt: iso,
    exercises: s.exercises.map(function (ex) {
      return {
        name: ex.name,
        note: typeof ex.note === 'string' ? ex.note : '',
        sets: ex.sets.map(function (set) {
          return {
            weight: set.weight,
            reps: normalizeReps(set.reps),
            warmup: set.warmup === true,
            restSec: isInt(set.restSec) ? set.restSec : null
          };
        })
      };
    })
  };
}

function hasOwn(obj, k) {
  return Object.prototype.hasOwnProperty.call(obj, k);
}

// ---------- tools ----------

export function createTools(deps) {
  var store = deps.store;
  var now = deps.now || function () { return new Date(); };
  var uuid = deps.uuid || function () { return globalThis.crypto.randomUUID(); };

  async function getTrainingContext(args) {
    var type = args && args.type;
    if (type !== undefined && type !== null && PLAN_TYPES.indexOf(type) === -1) {
      return errorResult(['type은 full·upper·lower·push·pull 중 하나여야 해요.']);
    }
    var snapshot = await store.getJSON(KEY_SNAPSHOT);
    if (!snapshot) return textResult(NO_SNAPSHOT_TEXT);
    var nowDate = now();
    var mon = kstWeekStart(kstDateStr(nowDate));
    var thisWeek = await store.getJSON(weekKey(mon));
    var nextWeek = await store.getJSON(weekKey(kstAddDays(mon, 7)));
    return textResult(formatContext(snapshot, nowDate, type || null, { thisWeek: thisWeek, nextWeek: nextWeek }));
  }

  async function saveWeekPlan(input) {
    var errs = validateWeekPlanInput(input);
    if (errs.length) return inputErrorResult(errs);
    var snapshot = await store.getJSON(KEY_SNAPSHOT);
    if (!snapshot) return errorResult([NO_SNAPSHOT_SAVE_TEXT]);
    var catErrs = catalogErrors(snapshot, input.sessions);
    if (catErrs.length) return errorResult(catErrs);

    var nowDate = now();
    var weekStart = resolveWeekStart(nowDate, input.week, 'save');
    var existing = await store.getJSON(weekKey(weekStart));
    var done = doneSessions(snapshot, weekStart);
    var clash = input.sessions.map(function (s) { return trimmedLabel(s.label); }).filter(function (l) { return hasOwn(done, l); });
    if (clash.length) return errorResult(['이미 끝난 세션이라 바꿀 수 없어요: ' + clash.join(', ')]);

    var kept = existing && Array.isArray(existing.sessions)
      ? existing.sessions.filter(function (s) { return hasOwn(done, s.label); })
      : [];
    if (kept.length + input.sessions.length > MAX_SESSIONS) {
      return errorResult(['세션은 끝난 세션 ' + kept.length + '개를 합쳐 ' + MAX_SESSIONS + '개까지예요. 저장하지 않았어요.']);
    }
    var iso = nowDate.toISOString();
    var plan = {
      id: uuid(),
      createdAt: iso,
      updatedAt: iso,
      weekStart: weekStart,
      days: input.days,
      deload: input.deload === true,
      note: typeof input.note === 'string' ? input.note : '',
      targets: Object.assign({}, input.targets),
      sessions: kept.concat(input.sessions.map(function (s) { return normalizeSession(s, iso); }))
    };
    await store.setJSON(weekKey(weekStart), plan);
    var msg = weekStart + ' 주 계획을 저장했어요. ' + plan.days + '일 · 세션 ' + plan.sessions.length + '개 · id ' + plan.id;
    if (kept.length) msg += ' 끝난 세션 ' + kept.length + '개는 그대로 뒀어요.';
    return textResult(msg);
  }

  async function updateWeekSessions(input) {
    var errs = validateUpdateInput(input);
    if (errs.length) return inputErrorResult(errs);
    var upsert = Array.isArray(input.upsert) ? input.upsert : [];
    var remove = Array.isArray(input.remove) ? input.remove.map(trimmedLabel) : [];
    var has = function (k) { return input[k] !== undefined && input[k] !== null; };
    if (!upsert.length && !remove.length && !has('targets') && !has('note') && !has('deload') && !has('days')) {
      return errorResult(['바꿀 내용이 없어 저장하지 않았어요. upsert·remove·targets·note·deload·days 중 하나는 있어야 해요.']);
    }

    var nowDate = now();
    var weekStart = resolveWeekStart(nowDate, input.week, 'update');
    var plan = await store.getJSON(weekKey(weekStart));
    if (!plan) return errorResult(['이 주에는 저장된 계획이 없어요. save_week_plan으로 먼저 저장해 주세요.']);
    var snapshot = await store.getJSON(KEY_SNAPSHOT);
    if (upsert.length) {
      if (!snapshot) return errorResult([NO_SNAPSHOT_SAVE_TEXT]);
      var catErrs = catalogErrors(snapshot, upsert);
      if (catErrs.length) return errorResult(catErrs);
    }

    var done = doneSessions(snapshot, weekStart);
    var touched = upsert.map(function (s) { return trimmedLabel(s.label); }).concat(remove);
    var clash = touched.filter(function (l, i) { return hasOwn(done, l) && touched.indexOf(l) === i; });
    if (clash.length) return errorResult(['이미 끝난 세션이라 바꿀 수 없어요: ' + clash.join(', ')]);

    var sessions = Array.isArray(plan.sessions) ? plan.sessions.slice() : [];
    var labels = sessions.map(function (s) { return s.label; });
    var missing = remove.filter(function (l, i) { return labels.indexOf(l) === -1 && remove.indexOf(l) === i; });
    if (missing.length) return errorResult(['계획에 없는 세션이라 뺄 수 없어요: ' + missing.join(', ')]);

    var iso = nowDate.toISOString();
    var removedCount = 0, replaced = 0, added = 0;
    sessions = sessions.filter(function (s) {
      if (remove.indexOf(s.label) === -1) return true;
      removedCount++;
      return false;
    });
    upsert.forEach(function (s) {
      var ns = normalizeSession(s, iso);
      var idx = sessions.findIndex(function (x) { return x.label === ns.label; });
      if (idx === -1) { sessions.push(ns); added++; } else { sessions[idx] = ns; replaced++; }
    });
    if (sessions.length < 1 || sessions.length > MAX_SESSIONS) {
      return errorResult(['고친 뒤 세션이 ' + sessions.length + '개가 돼요. 세션은 1~' + MAX_SESSIONS + '개여야 해서 저장하지 않았어요.']);
    }

    var next = Object.assign({}, plan, { updatedAt: iso, sessions: sessions });
    if (has('targets')) next.targets = Object.assign({}, input.targets);
    if (has('note')) next.note = input.note;
    if (has('deload')) next.deload = input.deload;
    if (has('days')) next.days = input.days;
    await store.setJSON(weekKey(weekStart), next);
    return textResult(weekStart + ' 주 계획을 고쳤어요. 바꾼 세션 ' + replaced + '개 · 더한 세션 ' + added + '개 · 뺀 세션 ' + removedCount + '개');
  }

  async function saveTodayCardio(input) {
    var errs = validateCardioInput(input);
    if (errs.length) return inputErrorResult(errs);
    var nowDate = now();
    var plan = {
      id: uuid(),
      createdAt: nowDate.toISOString(),
      date: kstDateStr(nowDate),
      mode: input.mode,
      title: input.title,
      note: typeof input.note === 'string' ? input.note : '',
      segments: input.segments.map(function (seg) {
        return {
          type: seg.type,
          sec: seg.sec,
          speed: seg.speed,
          incline: input.mode === 'walk' && isNum(seg.incline) ? seg.incline : 0
        };
      })
    };
    await store.setJSON(KEY_PLAN_CARDIO, plan);
    return textResult(plan.date + ' 유산소 플랜을 저장했어요. ' + CARDIO_MODE_LABEL[plan.mode] + ' · ' + plan.segments.length + '구간 · id ' + plan.id);
  }

  async function todayCardio(today) {
    var cardio = await store.getJSON(KEY_PLAN_CARDIO);
    return cardio && cardio.date === today ? cardio : null;
  }

  // What the app fetches (GET /api/plan): this week's plan and today's cardio plan.
  async function getAppPlans() {
    var today = kstDateStr(now());
    var week = await store.getJSON(weekKey(kstWeekStart(today)));
    return { week: week || null, cardio: await todayCardio(today) };
  }

  async function getSavedPlans() {
    var today = kstDateStr(now());
    var mon = kstWeekStart(today);
    var nextMon = kstAddDays(mon, 7);
    var thisWeek = await store.getJSON(weekKey(mon));
    var nextWeek = await store.getJSON(weekKey(nextMon));
    var cardio = await todayCardio(today);
    var lines = [];
    lines.push('## 이번 주(' + mon + ') 계획');
    lines.push(thisWeek ? JSON.stringify(thisWeek, null, 2) : '이번 주 계획이 없어요.');
    lines.push('');
    lines.push('## 다음 주(' + nextMon + ') 계획');
    lines.push(nextWeek ? JSON.stringify(nextWeek, null, 2) : '다음 주 계획이 없어요.');
    lines.push('');
    lines.push('## 오늘(' + today + ') 유산소 플랜');
    lines.push(cardio ? JSON.stringify(cardio, null, 2) : '오늘 저장된 유산소 플랜이 없어요.');
    return textResult(lines.join('\n'));
  }

  return {
    getTrainingContext: getTrainingContext,
    saveWeekPlan: saveWeekPlan,
    updateWeekSessions: updateWeekSessions,
    saveTodayCardio: saveTodayCardio,
    getSavedPlans: getSavedPlans,
    getAppPlans: getAppPlans
  };
}
