// Zero-dependency tests for api/snapshot.mjs and api/plan.mjs, called directly with the memory store.
// Run: node --test tests/connector-http.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

var TOKEN = 'test-token-0123456789-abcdef';
delete process.env.VERCEL;
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.CONNECTOR_STORE = 'memory';
process.env.HEALTH_SYNC_TOKEN = TOKEN;

var snapshotMod = await import('../api/snapshot.mjs');
var planMod = await import('../api/plan.mjs');
var storeMod = await import('../api/_lib/store.mjs');
var toolsMod = await import('../api/_lib/tools.mjs');
var kstMod = await import('../api/_lib/kst.mjs');

function validSnapshot() {
  return {
    schemaVersion: 1,
    uploadedAt: new Date().toISOString(),
    todayKst: kstMod.kstDateStr(new Date()),
    appVersion: 'health-app-v70',
    profile: { age: 34, heightCm: 175, weightKg: 72 },
    equipment: ['덤벨'],
    workouts: [{ date: '2026-09-26', session: 'push', sessionName: 'PUSH', durationMin: 60, rpe: null, condition: 3,
      exercises: [{ name: '벤치프레스', assist: false, sets: [{ weight: 60, reps: 8, warmup: false }] }] }],
    olderLastPerformed: [],
    cardio: [{ date: '2026-09-25', mode: 'interval', totalSec: 1200, rpe: 7, segments: [{ type: 'run', sec: 60, speed: 10, incline: 0 }] }],
    body: [{ date: '2026-09-26', weightKg: 72, bodyFatPct: null }],
    catalog: { push: ['벤치프레스'], pull: [], legs: [], upper: ['벤치프레스'], free: ['벤치프레스'] }
  };
}

function post(body, token, extraHeaders) {
  var headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {});
  if (token !== undefined) headers.Authorization = 'Bearer ' + token;
  return new Request('http://localhost/api/snapshot', { method: 'POST', headers: headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

function getPlan(token) {
  var headers = {};
  if (token !== undefined) headers.Authorization = 'Bearer ' + token;
  return new Request('http://localhost/api/plan', { headers: headers });
}

function assertNoStore(res) {
  assert.equal(res.headers.get('cache-control'), 'no-store');
}

test('snapshot — 코드 없음·틀림은 401', async () => {
  storeMod.resetMemoryStore();
  for (var tok of [undefined, 'wrong', TOKEN + 'x']) {
    var res = await snapshotMod.default.fetch(post(validSnapshot(), tok));
    assert.equal(res.status, 401);
    assertNoStore(res);
  }
  assert.equal(await storeMod.getStore().getJSON(storeMod.KEY_SNAPSHOT), null);
});

test('snapshot — 서버 토큰이 없거나 짧으면 401(fail closed)', async () => {
  var prev = process.env.HEALTH_SYNC_TOKEN;
  try {
    delete process.env.HEALTH_SYNC_TOKEN;
    assert.equal((await snapshotMod.default.fetch(post(validSnapshot(), 'undefined'))).status, 401);
    process.env.HEALTH_SYNC_TOKEN = 'short';
    assert.equal((await snapshotMod.default.fetch(post(validSnapshot(), 'short'))).status, 401);
    assert.equal((await planMod.default.fetch(getPlan('short'))).status, 401);
  } finally {
    process.env.HEALTH_SYNC_TOKEN = prev;
  }
});

test('snapshot — 1MB 넘으면 413', async () => {
  var big = validSnapshot();
  big.appVersion = 'x'.repeat(1024 * 1024);
  var res = await snapshotMod.default.fetch(post(big, TOKEN));
  assert.equal(res.status, 413);
  assertNoStore(res);
  // Content-Length alone over the limit is enough.
  var declared = new Request('http://localhost/api/snapshot', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Length': String(2 * 1024 * 1024) }, body: '{}' });
  assert.equal((await snapshotMod.handleSnapshot(declared)).status, 413);
});

test('snapshot — JSON 아님·모양 오류는 400', async () => {
  storeMod.resetMemoryStore();
  var bad = [
    '{not json',
    [],
    Object.assign(validSnapshot(), { schemaVersion: 2 }),
    Object.assign(validSnapshot(), { todayKst: '2026/09/27' }),
    Object.assign(validSnapshot(), { uploadedAt: 'yesterday' }),
    Object.assign(validSnapshot(), { profile: { age: '34', heightCm: null, weightKg: null } }),
    Object.assign(validSnapshot(), { equipment: [1] }),
    Object.assign(validSnapshot(), { catalog: { push: [], pull: [], legs: [], upper: [] } }),
    Object.assign(validSnapshot(), { cardio: [{ date: '2026-09-25', mode: 'run', totalSec: 10, rpe: null, segments: [] }] })
  ];
  var w = validSnapshot(); w.workouts[0].exercises[0].sets[0].warmup = 'no'; bad.push(w);
  for (var i = 0; i < bad.length; i++) {
    var res = await snapshotMod.default.fetch(post(bad[i], TOKEN));
    assert.equal(res.status, 400, 'case ' + i);
    assertNoStore(res);
  }
  assert.equal(await storeMod.getStore().getJSON(storeMod.KEY_SNAPSHOT), null);
});

test('snapshot — 올바르면 200, 저장소에 들어간다', async () => {
  storeMod.resetMemoryStore();
  var snap = validSnapshot();
  var res = await snapshotMod.default.fetch(post(snap, TOKEN));
  assert.equal(res.status, 200);
  assertNoStore(res);
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(await storeMod.getStore().getJSON(storeMod.KEY_SNAPSHOT), snap);
});

test('snapshot — 새 선택 필드(planWeek·planLabel·planType·weekSets·muscleWeights)가 있어도 200', async () => {
  storeMod.resetMemoryStore();
  var snap = validSnapshot();
  Object.assign(snap.workouts[0], { planWeek: '2026-09-21', planLabel: '상체 A', planType: 'upper' });
  snap.weekSets = { weekStart: '2026-09-21', byGroup: { chest: 6, triceps: 1.5 } };
  snap.muscleWeights = { '벤치프레스': { chest: 1, triceps: 0.5, shoulders_front: 0.5 } };
  var res = await snapshotMod.default.fetch(post(snap, TOKEN));
  assert.equal(res.status, 200);
  assert.deepEqual(await storeMod.getStore().getJSON(storeMod.KEY_SNAPSHOT), snap);
  var empty = validSnapshot();
  empty.weekSets = { weekStart: '2026-09-21', byGroup: {} };
  empty.muscleWeights = {};
  assert.equal((await snapshotMod.default.fetch(post(empty, TOKEN))).status, 200);
});

test('snapshot — plan 필드가 null이어도 200 (없는 것과 같게)', async () => {
  storeMod.resetMemoryStore();
  var snap = validSnapshot();
  Object.assign(snap.workouts[0], { planWeek: null, planLabel: null, planType: null });
  var res = await snapshotMod.default.fetch(post(snap, TOKEN));
  assert.equal(res.status, 200);
  assert.deepEqual(await storeMod.getStore().getJSON(storeMod.KEY_SNAPSHOT), snap);
});

test('snapshot — 세트 drop은 선택: true/false면 200, boolean이 아니면 400', async () => {
  storeMod.resetMemoryStore();
  var snap = validSnapshot();
  snap.workouts[0].exercises[0].sets.push({ weight: 40, reps: 12, warmup: false, drop: true });
  snap.olderLastPerformed = [{ name: '딥스', date: '2026-06-01', assist: false, sets: [{ weight: null, reps: 6, warmup: false, drop: false }] }];
  assert.equal((await snapshotMod.default.fetch(post(snap, TOKEN))).status, 200);
  for (var v of ['yes', 1, null]) {
    var bad = validSnapshot();
    bad.workouts[0].exercises[0].sets[0].drop = v;
    assert.equal((await snapshotMod.default.fetch(post(bad, TOKEN))).status, 400, 'drop=' + v);
  }
});

test('snapshot — 새 선택 필드의 모양이 틀리면 400', async () => {
  storeMod.resetMemoryStore();
  function withWorkout(extra) { var s = validSnapshot(); Object.assign(s.workouts[0], extra); return s; }
  var bad = [
    withWorkout({ planWeek: 20260921 }),
    withWorkout({ planLabel: 5 }),
    withWorkout({ planType: ['upper'] }),
    Object.assign(validSnapshot(), { weekSets: [] }),
    Object.assign(validSnapshot(), { weekSets: null }),
    Object.assign(validSnapshot(), { weekSets: { weekStart: 1, byGroup: {} } }),
    Object.assign(validSnapshot(), { weekSets: { weekStart: '2026-09-21' } }),
    Object.assign(validSnapshot(), { weekSets: { weekStart: '2026-09-21', byGroup: { chest: '6' } } }),
    Object.assign(validSnapshot(), { muscleWeights: [] }),
    Object.assign(validSnapshot(), { muscleWeights: { '벤치프레스': 1 } }),
    Object.assign(validSnapshot(), { muscleWeights: { '벤치프레스': { chest: '1' } } })
  ];
  for (var i = 0; i < bad.length; i++) {
    var res = await snapshotMod.default.fetch(post(bad[i], TOKEN));
    assert.equal(res.status, 400, 'case ' + i);
  }
  assert.equal(await storeMod.getStore().getJSON(storeMod.KEY_SNAPSHOT), null);
});

test('snapshot — POST 외에는 405', async () => {
  var res = await snapshotMod.default.fetch(new Request('http://localhost/api/snapshot', { headers: { Authorization: 'Bearer ' + TOKEN } }));
  assert.equal(res.status, 405);
  assertNoStore(res);
});

test('plan — 401, 저장 전 null, 저장 뒤 {week: 이번 주 계획, nextWeek, cardio: 오늘 것}, routine 없음', async () => {
  storeMod.resetMemoryStore();
  var r401 = await planMod.default.fetch(getPlan('nope'));
  assert.equal(r401.status, 401);
  assertNoStore(r401);

  var empty = await planMod.default.fetch(getPlan(TOKEN));
  assert.equal(empty.status, 200);
  assertNoStore(empty);
  assert.deepEqual(await empty.json(), { week: null, nextWeek: null, cardio: null });

  var store = storeMod.getStore();
  await store.setJSON(storeMod.KEY_SNAPSHOT, validSnapshot());
  var tools = toolsMod.createTools({ store: store });
  var session = { label: '상체 A', type: 'upper', exercises: [{ name: '벤치프레스', sets: [{ weight: 60, reps: '8-10' }] }] };
  var next = await tools.saveWeekPlan({ week: 'next', days: 3, targets: {}, sessions: [Object.assign({}, session, { label: '다음 주' })] });
  assert.ok(!next.isError, next.content[0].text);
  var onlyNext = await (await planMod.default.fetch(getPlan(TOKEN))).json();
  assert.equal(onlyNext.week, null, '다음 주 계획은 week 로 오지 않는다');

  var saved = await tools.saveWeekPlan({ week: 'this', days: 4, targets: { chest: 10 }, sessions: [session] });
  assert.ok(!saved.isError, saved.content[0].text);
  await tools.saveTodayCardio({ mode: 'walk', title: '걷기', segments: [{ type: 'walk', sec: 600, speed: 5, incline: 6 }] });

  var res = await planMod.default.fetch(getPlan(TOKEN));
  assert.equal(res.status, 200);
  assertNoStore(res);
  var body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['cardio', 'nextWeek', 'week']);
  assert.ok(!('routine' in body));
  assert.equal(body.week.weekStart, kstMod.kstWeekStart(kstMod.kstDateStr(new Date())));
  assert.equal(body.week.sessions[0].label, '상체 A');
  assert.equal(body.week.sessions[0].exercises[0].sets[0].reps, '8-10');
  assert.equal(body.cardio.segments[0].incline, 6);

  // A cardio plan dated another day is hidden.
  var old = await store.getJSON(storeMod.KEY_PLAN_CARDIO);
  old.date = '2000-01-01';
  await store.setJSON(storeMod.KEY_PLAN_CARDIO, old);
  var body2 = await (await planMod.default.fetch(getPlan(TOKEN))).json();
  assert.equal(body2.cardio, null);
  assert.equal(body2.week.sessions[0].label, '상체 A');
});

test('plan — 응답 키는 week·nextWeek·cardio, nextWeek = 다음 주 계획', async () => {
  storeMod.resetMemoryStore();
  var store = storeMod.getStore();
  await store.setJSON(storeMod.KEY_SNAPSHOT, validSnapshot());
  var tools = toolsMod.createTools({ store: store });
  var session = { label: '다음 A', type: 'upper', exercises: [{ name: '벤치프레스', sets: [{ weight: 60, reps: '8-10' }] }] };
  var saved = await tools.saveWeekPlan({ week: 'next', days: 3, targets: {}, sessions: [session] });
  assert.ok(!saved.isError, saved.content[0].text);
  var res = await planMod.default.fetch(getPlan(TOKEN));
  assert.equal(res.status, 200);
  assertNoStore(res);
  var body = await res.json();
  assert.deepEqual(Object.keys(body), ['week', 'nextWeek', 'cardio']);
  assert.equal(body.week, null);
  assert.equal(body.nextWeek.weekStart, kstMod.kstAddDays(kstMod.kstWeekStart(kstMod.kstDateStr(new Date())), 7));
  assert.equal(body.nextWeek.sessions[0].label, '다음 A');
});

test('plan — GET 외에는 405', async () => {
  var res = await planMod.default.fetch(new Request('http://localhost/api/plan', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: '{}' }));
  assert.equal(res.status, 405);
  assertNoStore(res);
});

test('store — VERCEL이 있으면 메모리 설정이어도 Blob, 설정이 없으면 오류', () => {
  var saved = { VERCEL: process.env.VERCEL, CONNECTOR_STORE: process.env.CONNECTOR_STORE, BLOB: process.env.BLOB_READ_WRITE_TOKEN };
  try {
    process.env.VERCEL = '1';
    process.env.CONNECTOR_STORE = 'memory';
    assert.equal(storeMod.getStore().kind, 'blob');
    process.env.VERCEL = '';
    assert.equal(storeMod.getStore().kind, 'blob', 'VERCEL이 빈 값이어도 있으면 메모리 금지');
    delete process.env.VERCEL;
    assert.equal(storeMod.getStore().kind, 'memory');
    delete process.env.CONNECTOR_STORE;
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_dummy';
    assert.equal(storeMod.getStore().kind, 'blob');
    delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.throws(function () { storeMod.getStore(); }, /not configured/);
  } finally {
    if (saved.VERCEL === undefined) delete process.env.VERCEL; else process.env.VERCEL = saved.VERCEL;
    process.env.CONNECTOR_STORE = saved.CONNECTOR_STORE;
    if (saved.BLOB === undefined) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = saved.BLOB;
  }
});
