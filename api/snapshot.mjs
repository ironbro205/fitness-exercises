// POST /api/snapshot — the app uploads its raw-data snapshot (Bearer <code>, JSON body up to 1MB).
// 401 wrong/missing code (or server token not configured), 413 too large, 400 bad shape, 200 saved.
import { checkBearer } from './_lib/auth.mjs';
import { getStore, KEY_SNAPSHOT } from './_lib/store.mjs';
import { SESSIONS } from './_lib/tools.mjs';

export const MAX_BYTES = 1024 * 1024;

function json(status, body, extraHeaders) {
  var headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (extraHeaders) Object.keys(extraHeaders).forEach(function (k) { headers[k] = extraHeaders[k]; });
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

// Reads the body as text, stopping once it exceeds `limit` bytes. Returns null when too large.
async function readLimited(request, limit) {
  var declared = Number(request.headers.get('content-length'));
  if (isFinite(declared) && declared > limit) return null;
  if (!request.body) return '';
  var reader = request.body.getReader();
  var chunks = [], total = 0;
  for (;;) {
    var step = await reader.read();
    if (step.done) break;
    total += step.value.byteLength;
    if (total > limit) {
      try { await reader.cancel(); } catch (e) { /* ignore */ }
      return null;
    }
    chunks.push(step.value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map(function (c) { return Buffer.from(c); })));
}

// ---------- shape check (contract in docs/claude-connector-plan.md) ----------

var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function isNum(v) { return typeof v === 'number' && isFinite(v); }
function numOrNull(v) { return v === null || isNum(v); }
function isStr(v) { return typeof v === 'string'; }
function isDate(v) { return isStr(v) && DATE_RE.test(v); }
function arrOf(v, pred) { return Array.isArray(v) && v.every(pred); }

function isSet(s) {
  return isObj(s) && numOrNull(s.weight) && numOrNull(s.reps) && typeof s.warmup === 'boolean';
}

function isExercise(e) {
  return isObj(e) && isStr(e.name) && typeof e.assist === 'boolean' && arrOf(e.sets, isSet);
}

function isWorkout(w) {
  return isObj(w) && isDate(w.date) && isStr(w.session) && isStr(w.sessionName) &&
    numOrNull(w.durationMin) && numOrNull(w.rpe) && numOrNull(w.condition) &&
    arrOf(w.exercises, isExercise);
}

function isOlder(o) {
  return isObj(o) && isStr(o.name) && isDate(o.date) && typeof o.assist === 'boolean' && arrOf(o.sets, isSet);
}

function isSegment(s) {
  return isObj(s) && isStr(s.type) && isNum(s.sec) && isNum(s.speed) && isNum(s.incline);
}

function isCardio(c) {
  return isObj(c) && isDate(c.date) && (c.mode === 'interval' || c.mode === 'walk') &&
    isNum(c.totalSec) && numOrNull(c.rpe) && arrOf(c.segments, isSegment);
}

function isBody(b) {
  return isObj(b) && isDate(b.date) && isNum(b.weightKg) && numOrNull(b.bodyFatPct);
}

export function validateSnapshot(s) {
  if (!isObj(s)) return 'body must be an object';
  if (s.schemaVersion !== 1) return 'schemaVersion must be 1';
  if (!isStr(s.uploadedAt) || isNaN(Date.parse(s.uploadedAt))) return 'uploadedAt must be an ISO date-time';
  if (!isDate(s.todayKst)) return 'todayKst must be YYYY-MM-DD';
  if (!isStr(s.appVersion)) return 'appVersion must be a string';
  if (!isObj(s.profile) || !numOrNull(s.profile.age) || !numOrNull(s.profile.heightCm) || !numOrNull(s.profile.weightKg)) return 'profile shape';
  if (!arrOf(s.equipment, isStr)) return 'equipment shape';
  if (!arrOf(s.workouts, isWorkout)) return 'workouts shape';
  if (!arrOf(s.olderLastPerformed, isOlder)) return 'olderLastPerformed shape';
  if (!arrOf(s.cardio, isCardio)) return 'cardio shape';
  if (!arrOf(s.body, isBody)) return 'body shape';
  if (!isObj(s.catalog)) return 'catalog shape';
  for (var i = 0; i < SESSIONS.length; i++) {
    if (!arrOf(s.catalog[SESSIONS[i]], isStr)) return 'catalog.' + SESSIONS[i] + ' shape';
  }
  return null;
}

export async function handleSnapshot(request) {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { Allow: 'POST' });
  if (!checkBearer(request)) return json(401, { error: 'unauthorized' });
  var text = await readLimited(request, MAX_BYTES);
  if (text === null) return json(413, { error: 'too_large' });
  var body;
  try { body = JSON.parse(text); } catch (e) { return json(400, { error: 'invalid_json' }); }
  var problem = validateSnapshot(body);
  if (problem) return json(400, { error: 'invalid_shape', detail: problem });
  try {
    await getStore().setJSON(KEY_SNAPSHOT, body);
  } catch (e) {
    console.error('snapshot store error:', e && e.message);
    return json(500, { error: 'store_error' });
  }
  return json(200, { ok: true });
}

export default { fetch: handleSnapshot };
