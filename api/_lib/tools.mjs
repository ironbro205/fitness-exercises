// Pure logic for the four MCP tools (no dependencies; store and clock are injected).
// Every tool returns an MCP CallToolResult: { content: [{ type: 'text', text }], isError? }.
// The context text is raw data only — no computed values, no interpretation.
import { GUIDE } from './guide.mjs';
import { kstDateStr, kstDateTimeStr, weekdayKr } from './kst.mjs';
import { KEY_SNAPSHOT, KEY_PLAN_ROUTINE, KEY_PLAN_CARDIO } from './store.mjs';

export const SESSIONS = ['push', 'pull', 'legs', 'upper', 'free'];
export const CARDIO_MODES = ['interval', 'walk'];
export const SEGMENT_TYPES = ['warmup', 'walk', 'run', 'cooldown'];
export const STALE_MS = 12 * 60 * 60 * 1000;
export const NO_SNAPSHOT_TEXT = '헬스앱을 한 번 열면 기록이 올라와요.';

var SESSION_LABEL = { push: 'PUSH', pull: 'PULL', legs: 'LEGS', upper: 'UPPER', free: 'FREE' };
var CARDIO_MODE_LABEL = { interval: '인터벌', walk: '경사 걷기' };
var SEGMENT_LABEL = { warmup: '워밍업', walk: '걷기', run: '달리기', cooldown: '쿨다운' };

function textResult(text, isError) {
  var r = { content: [{ type: 'text', text: text }] };
  if (isError) r.isError = true;
  return r;
}

function errorResult(lines) {
  return textResult(lines.join('\n'), true);
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

function byDateDesc(list) {
  return (Array.isArray(list) ? list.slice() : []).sort(function (a, b) {
    var da = String(a && a.date || ''), db = String(b && b.date || '');
    return da < db ? 1 : da > db ? -1 : 0;
  });
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
  return (set && set.warmup ? '워밍업 ' : '') + body;
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

export function formatContext(snapshot, nowDate, session) {
  var lines = [];
  var uploaded = new Date(snapshot.uploadedAt);
  var elapsed = nowDate.getTime() - uploaded.getTime();
  if (elapsed > STALE_MS) {
    lines.push('주의: 기록이 올라온 지 12시간이 넘었어요. 그 뒤의 운동은 빠져 있을 수 있어요.');
  }
  lines.push('올린 시각: ' + kstDateTimeStr(uploaded) + ' (KST) · ' + formatElapsed(elapsed));
  lines.push('');
  lines.push(GUIDE);
  lines.push('');

  // User info
  var p = snapshot.profile || {};
  lines.push('## 사용자 정보');
  if (isNum(p.age)) lines.push('- 나이: ' + p.age + '세');
  if (isNum(p.heightCm)) lines.push('- 키: ' + p.heightCm + 'cm');
  if (isNum(p.weightKg)) lines.push('- 체중: ' + p.weightKg + 'kg');
  if (Array.isArray(snapshot.equipment) && snapshot.equipment.length) {
    lines.push('- 보유 장비: ' + snapshot.equipment.join(', '));
  }
  lines.push('');

  // Weight training, 8 weeks
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

  // Older exercises, last performance
  lines.push('## 8주 넘게 안 한 종목 (마지막 1회)');
  var older = byDateDesc(snapshot.olderLastPerformed);
  if (older.length === 0) lines.push('기록 없음');
  older.forEach(function (o) {
    lines.push('- ' + o.name + ' (' + o.date + '): ' + formatSets(o.sets, o.assist));
  });
  lines.push('');

  // Cardio, 8 weeks
  lines.push('## 유산소 기록 (최근 8주, 최신순)');
  var cardio = byDateDesc(snapshot.cardio);
  if (cardio.length === 0) lines.push('기록 없음');
  cardio.forEach(function (c) { lines.push(cardioLine(c)); });
  lines.push('');

  // Body weight
  lines.push('## 체중 기록');
  var body = byDateDesc(snapshot.body);
  if (body.length === 0) lines.push('기록 없음');
  body.forEach(function (b) { lines.push(bodyLine(b)); });
  lines.push('');

  // Catalog
  var catalog = snapshot.catalog || {};
  if (session) {
    lines.push('## 종목 목록 (' + SESSION_LABEL[session] + ')');
    lines.push(catalogLine(catalog[session]));
  } else {
    lines.push('## 종목 목록');
    SESSIONS.forEach(function (s) {
      lines.push('### ' + SESSION_LABEL[s]);
      lines.push(catalogLine(catalog[s]));
    });
  }
  return lines.join('\n');
}

function catalogLine(list) {
  return Array.isArray(list) && list.length ? list.join(', ') : '(없음)';
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

function validateRoutineInput(input) {
  var errs = [];
  if (!input || typeof input !== 'object') return ['입력이 객체가 아니에요.'];
  if (SESSIONS.indexOf(input.session) === -1) errs.push('session은 push·pull·legs·upper·free 중 하나여야 해요.');
  if (!isNonEmptyString(input.title)) errs.push('title이 비어 있어요.');
  if (input.note !== undefined && input.note !== null && typeof input.note !== 'string') errs.push('note는 문자열이어야 해요.');
  if (!Array.isArray(input.exercises) || input.exercises.length < 1 || input.exercises.length > 20) {
    errs.push('exercises는 1~20개여야 해요.');
    return errs;
  }
  input.exercises.forEach(function (ex, i) {
    var where = 'exercises[' + i + ']';
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

// ---------- tools ----------

export function createTools(deps) {
  var store = deps.store;
  var now = deps.now || function () { return new Date(); };
  var uuid = deps.uuid || function () { return globalThis.crypto.randomUUID(); };

  async function getTrainingContext(args) {
    var session = args && args.session;
    if (session !== undefined && session !== null && SESSIONS.indexOf(session) === -1) {
      return errorResult(['session은 push·pull·legs·upper·free 중 하나여야 해요.']);
    }
    var snapshot = await store.getJSON(KEY_SNAPSHOT);
    if (!snapshot) return textResult(NO_SNAPSHOT_TEXT);
    return textResult(formatContext(snapshot, now(), session || null));
  }

  async function saveTodayRoutine(input) {
    var errs = validateRoutineInput(input);
    if (errs.length) return errorResult(['입력이 형식에 맞지 않아 저장하지 않았어요.'].concat(errs.map(function (e) { return '- ' + e; })));
    var snapshot = await store.getJSON(KEY_SNAPSHOT);
    if (!snapshot) return errorResult(['헬스앱 기록이 아직 올라오지 않아 저장하지 않았어요. 사용자가 헬스앱을 한 번 열면 기록이 올라와요.']);
    var catalogList = (snapshot.catalog && Array.isArray(snapshot.catalog[input.session])) ? snapshot.catalog[input.session] : [];
    var bad = [];
    input.exercises.forEach(function (ex) {
      if (catalogList.indexOf(ex.name) === -1 && bad.indexOf(ex.name) === -1) bad.push(ex.name);
    });
    if (bad.length) {
      var lines = [SESSION_LABEL[input.session] + ' 종목 목록에 없는 이름이 있어 저장하지 않았어요.'];
      bad.forEach(function (name) {
        var sug = suggestNames(name, catalogList);
        lines.push('- ' + name + ' → 비슷한 목록 이름: ' + (sug.length ? sug.join(', ') : '(없음)'));
      });
      return errorResult(lines);
    }
    var nowDate = now();
    var plan = {
      id: uuid(),
      createdAt: nowDate.toISOString(),
      date: kstDateStr(nowDate),
      session: input.session,
      title: input.title,
      note: typeof input.note === 'string' ? input.note : '',
      exercises: input.exercises.map(function (ex) {
        return {
          name: ex.name,
          note: typeof ex.note === 'string' ? ex.note : '',
          sets: ex.sets.map(function (s) {
            return {
              weight: s.weight,
              reps: normalizeReps(s.reps),
              warmup: s.warmup === true,
              restSec: isInt(s.restSec) ? s.restSec : null
            };
          })
        };
      })
    };
    await store.setJSON(KEY_PLAN_ROUTINE, plan);
    return textResult(plan.date + ' 루틴을 저장했어요. ' + SESSION_LABEL[plan.session] + ' · ' + plan.exercises.length + '종목 · id ' + plan.id);
  }

  async function saveTodayCardio(input) {
    var errs = validateCardioInput(input);
    if (errs.length) return errorResult(['입력이 형식에 맞지 않아 저장하지 않았어요.'].concat(errs.map(function (e) { return '- ' + e; })));
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

  async function getTodayPlans() {
    var today = kstDateStr(now());
    var routine = await store.getJSON(KEY_PLAN_ROUTINE);
    var cardio = await store.getJSON(KEY_PLAN_CARDIO);
    return {
      routine: routine && routine.date === today ? routine : null,
      cardio: cardio && cardio.date === today ? cardio : null
    };
  }

  async function getSavedPlans() {
    var plans = await getTodayPlans();
    var today = kstDateStr(now());
    var lines = ['오늘(' + today + ') 저장된 플랜', ''];
    lines.push('## 웨이트 루틴');
    lines.push(plans.routine ? JSON.stringify(plans.routine, null, 2) : '오늘 저장된 루틴이 없어요.');
    lines.push('');
    lines.push('## 유산소 플랜');
    lines.push(plans.cardio ? JSON.stringify(plans.cardio, null, 2) : '오늘 저장된 유산소 플랜이 없어요.');
    return textResult(lines.join('\n'));
  }

  return {
    getTrainingContext: getTrainingContext,
    saveTodayRoutine: saveTodayRoutine,
    saveTodayCardio: saveTodayCardio,
    getSavedPlans: getSavedPlans,
    getTodayPlans: getTodayPlans
  };
}
