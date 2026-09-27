// Claude 커넥터 — 앱 쪽 (js/ai.js · 화면 연결) 시험.
// 설계서: docs/claude-connector-plan.md 「앱 쪽」「화면」.
// 스냅샷 모양은 서버의 검사기(api/snapshot.mjs validateSnapshot)로 교차 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp } from './_harness.mjs';
import { validateSnapshot } from '../api/snapshot.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const plain = (v) => JSON.parse(JSON.stringify(v));

// 오늘 기준 n일 전 KST 날짜
function kstDaysAgo(app, n) {
  return app.claudeShiftDateStr(app.getTodayStr(), -n);
}

// fetch 가짜 — 부른 기록을 남기고, 경로별 응답을 돌려준다.
function fakeFetch(app, routes) {
  const calls = [];
  app.fetch = (url, init) => {
    calls.push({ url, init });
    const handler = routes && routes[url];
    const body = handler ? handler(init) : { ok: true };
    const status = (body && body.__status) || 200;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  };
  return calls;
}

function withToken(app, token) {
  app.storage.set(app.KEYS.SYNC_TOKEN, token || 'qa-token-0123456789abcdef');
}

function sampleData(app) {
  const d = (n) => kstDaysAgo(app, n);
  app.state.profile = { age: 37, height: 170, weight: 77.5, workoutFreq: 4, currentCycle: 1, currentWeek: 2, cyclePhase: '빌드', weekSessionsDone: 1 };
  app.state.data.workoutLog = [
    { id: 'w_recent', startTime: 3, date: d(1), session: 'push', sessionType: 'push', sessionName: 'PUSH', duration: 62,
      exercises: [
        { name: '머신 체스트 프레스', setsDetail: [
          { weight: 60, reps: 8, isWarmup: false, completed: true, role: 'top' },
          { weight: 55, reps: 10, isWarmup: false, completed: true, role: 'backoff' }] },
        { name: '어시스트 풀업', setsDetail: [{ weight: 30, reps: 8, isWarmup: false, completed: true }] }] },
    { id: 'w_edge_in', startTime: 2, date: d(55), sessionType: 'legs', sessionName: 'LEGS', duration: 50,
      exercises: [{ name: '레그 프레스', weights: [120, 120], reps: [10, 10] }] },
    { id: 'w_edge_out', startTime: 1, date: d(56), sessionType: 'pull', sessionName: 'PULL', duration: 40,
      exercises: [
        { name: '바벨 컬', setsDetail: [{ weight: 30, reps: 10, isWarmup: false }] },
        { name: '머신 체스트 프레스', setsDetail: [{ weight: 50, reps: 12, isWarmup: false }] }] },
    { id: 'w_old', startTime: 0, date: d(90), sessionType: 'pull', sessionName: 'PULL', duration: 40,
      exercises: [{ name: '바벨 컬', setsDetail: [{ weight: 25, reps: 12, isWarmup: false }] }] },
  ];
  app.state.data.conditionLog = [{ id: 'cd_1', date: d(1), workoutId: 'w_recent', rpe: 8, condition: 4 }];
  app.state.data.cardioLog = [
    { id: 'c_old', date: d(60), mode: 'walk', totalSec: 1800, rpe: 5, segments: [{ type: 'walk', sec: 1800, targetSpeed: 5, actualSpeed: 5, incline: 8 }] },
    { id: 'c_new', date: d(2), mode: 'interval', totalSec: 600, rpe: null, completed: true,
      segments: [{ type: 'warmup', sec: 300, targetSpeed: 5, actualSpeed: 5.2, incline: 0 }, { type: 'run', sec: 300, targetSpeed: 8, actualSpeed: 8, incline: 0 }] },
  ];
  app.state.data.bodyLog = [
    { date: d(100), weight: 80, bodyFat: null },
    { date: d(70), weight: 79, bodyFat: 18 },
    { date: d(10), weight: 78, bodyFat: null },
    { date: d(0), weight: 77.5, bodyFat: 17.5 },
  ];
  app._lastSetsCache = null;
}

// ═══ 1. 스냅샷 ═══
test('스냅샷 — 서버 계약 검사를 통과하고 키가 계약 그대로다', () => {
  const app = loadApp();
  sampleData(app);
  const snap = plain(app.buildClaudeSnapshot());
  assert.equal(validateSnapshot(snap), null, '서버 모양 검사 통과');
  assert.deepEqual(Object.keys(snap).sort(), ['appVersion', 'body', 'cardio', 'catalog', 'equipment', 'olderLastPerformed',
    'profile', 'schemaVersion', 'todayKst', 'uploadedAt', 'workouts'].sort());
  assert.equal(snap.schemaVersion, 1);
  assert.equal(snap.todayKst, app.getTodayStr());
  assert.equal(snap.appVersion, 'health-app-' + app.APP_VERSION);
  assert.deepEqual(snap.profile, { age: 37, heightCm: 170, weightKg: 77.5 });
  assert.deepEqual(Object.keys(snap.workouts[0]).sort(), ['condition', 'date', 'durationMin', 'exercises', 'rpe', 'session', 'sessionName'].sort());
  assert.deepEqual(Object.keys(snap.workouts[0].exercises[0]).sort(), ['assist', 'name', 'sets']);
  assert.deepEqual(Object.keys(snap.workouts[0].exercises[0].sets[0]).sort(), ['reps', 'warmup', 'weight']);
  assert.deepEqual(Object.keys(snap.cardio[0]).sort(), ['date', 'mode', 'rpe', 'segments', 'totalSec']);
  assert.deepEqual(Object.keys(snap.cardio[0].segments[0]).sort(), ['incline', 'sec', 'speed', 'type']);
  assert.deepEqual(Object.keys(snap.body[0]).sort(), ['bodyFatPct', 'date', 'weightKg']);
  assert.deepEqual(Object.keys(snap.catalog).sort(), ['free', 'legs', 'pull', 'push', 'upper']);
});

test('스냅샷 — 계산값(추천·1RM·정체·부족 부위·목표 세트·볼륨·사이클)이 없다', () => {
  const app = loadApp();
  sampleData(app);
  const snap = plain(app.buildClaudeSnapshot());
  const BANNED = /1rm|onerm|e1rm|recommend|suggest|plateau|stall|weak|target|volume|cycle|phase|week|prog|deload|freq|goal/i;
  const keys = [];
  (function walk(v) {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') Object.keys(v).forEach((k) => { keys.push(k); walk(v[k]); });
  })(snap);
  assert.deepEqual(keys.filter((k) => BANNED.test(k)), [], '계산값 키가 들어갔다');
  const text = JSON.stringify(snap);
  assert.ok(!/빌드|디로드|주차/.test(text), '사이클 정보가 새지 않는다');
});

test('스냅샷 — 56일 경계: 오늘-55일은 창 안, 오늘-56일은 창 밖', () => {
  const app = loadApp();
  sampleData(app);
  const snap = plain(app.buildClaudeSnapshot());
  const dates = snap.workouts.map((w) => w.date);
  assert.deepEqual(dates, [kstDaysAgo(app, 1), kstDaysAgo(app, 55)], '최신순 · 경계 안쪽만');
  assert.deepEqual(snap.cardio.map((c) => c.date), [kstDaysAgo(app, 2)]);
  // 체중: 창 안 전부 + 그 이전 마지막 1건
  assert.deepEqual(snap.body.map((b) => b.date), [kstDaysAgo(app, 0), kstDaysAgo(app, 10), kstDaysAgo(app, 70)]);
  assert.deepEqual(snap.body[0], { date: kstDaysAgo(app, 0), weightKg: 77.5, bodyFatPct: 17.5 });
});

test('스냅샷 — 원자료: 세트 전부·세션 RPE/컨디션·어시스트 표시·구형 기록', () => {
  const app = loadApp();
  sampleData(app);
  const snap = plain(app.buildClaudeSnapshot());
  const w = snap.workouts[0];
  assert.equal(w.session, 'push');
  assert.equal(w.sessionName, 'PUSH');
  assert.equal(w.durationMin, 62);
  assert.equal(w.rpe, 8);
  assert.equal(w.condition, 4);
  assert.deepEqual(w.exercises[0].sets, [{ weight: 60, reps: 8, warmup: false }, { weight: 55, reps: 10, warmup: false }]);
  assert.equal(w.exercises[0].assist, false);
  assert.equal(w.exercises[1].assist, true, '어시스트 종목 표시');
  // weights[]/reps[] 구형 기록도 세트로 되살린다
  assert.deepEqual(snap.workouts[1].exercises[0].sets, [{ weight: 120, reps: 10, warmup: false }, { weight: 120, reps: 10, warmup: false }]);
  assert.equal(snap.workouts[1].rpe, null, '컨디션 기록이 없으면 null');
  // 유산소 구간: 실제 속력 · 인터벌 경사 0
  assert.deepEqual(snap.cardio[0], { date: kstDaysAgo(app, 2), mode: 'interval', totalSec: 600, rpe: null,
    segments: [{ type: 'warmup', sec: 300, speed: 5.2, incline: 0 }, { type: 'run', sec: 300, speed: 8, incline: 0 }] });
});

test('스냅샷 — olderLastPerformed: 56일 안에 없는 종목만, 마지막 1회', () => {
  const app = loadApp();
  sampleData(app);
  const snap = plain(app.buildClaudeSnapshot());
  assert.deepEqual(snap.olderLastPerformed, [
    { name: '바벨 컬', date: kstDaysAgo(app, 56), assist: false, sets: [{ weight: 30, reps: 10, warmup: false }] },
  ], '머신 체스트 프레스는 창 안에 있어 빠지고, 바벨 컬은 가장 최근(56일 전) 1회만');
});

test('스냅샷 — 보유 장비·종목 목록: 별칭 제외·보유 장비 기준·세션 묶음', () => {
  const app = loadApp();
  const snap = plain(app.buildClaudeSnapshot());
  assert.ok(snap.equipment.includes('덤벨') && snap.equipment.includes('바벨'));
  assert.ok(!snap.equipment.includes('맨몸'), '맨몸은 장비가 아니다');
  assert.ok(!snap.equipment.includes('전용 카프 레이즈 머신'), '미보유 장비 제외');
  const c = snap.catalog;
  assert.ok(c.push.includes('머신 체스트 프레스') && !c.push.includes('체스트 프레스 머신'), '별칭 표기 제외');
  assert.ok(!c.free.includes('시티드 카프 레이즈'), '미보유 장비 종목 제외');
  assert.ok(c.pull.includes('어시스트 풀업') && !c.push.includes('어시스트 풀업'));
  assert.ok(c.legs.includes('레그 프레스'));
  c.upper.forEach((n) => assert.ok(c.push.includes(n) || c.pull.includes(n), 'UPPER = PUSH + PULL: ' + n));
  ['push', 'pull', 'legs', 'upper'].forEach((s) => c[s].forEach((n) => assert.ok(c.free.includes(n), 'FREE = 전체: ' + n)));
});

// ═══ 2. 백업 제외 ═══
test('백업 — 연결 코드·동기화 상태는 파일에 안 담기고, 복원해도 이 기기 값이 남는다', () => {
  const app = loadApp();
  app.localStorage.clear();
  app.storage.set(app.KEYS.SYNC_TOKEN, 'qa-token-0123456789abcdef');
  app.storage.set(app.KEYS.CLAUDE_SYNC, { lastUploadAt: '2026-09-27T00:00:00.000Z', lastUploadHash: 'abcd1234', lastImportedRoutineId: 'r1', lastImportedCardioId: null });
  app.storage.set(app.KEYS.WORKOUT_LOG, [{ id: 'w1', date: '2026-09-01' }]);
  const backup = app.buildBackupObject();
  assert.equal(backup.data.fitness_sync_token, undefined, '연결 코드가 백업에 들어갔다');
  assert.equal(backup.data.fitness_claude_sync, undefined, '동기화 상태가 백업에 들어갔다');

  // 다른 기기에서 만든 파일에 두 키를 억지로 넣어도 복원하지 않는다
  const evil = JSON.parse(JSON.stringify(backup));
  evil.data.fitness_sync_token = 'other-device-token-xxxxxxxx';
  evil.data.fitness_claude_sync = { lastUploadHash: 'zzz' };
  assert.equal(app.restoreFromBackup(JSON.stringify(evil)).ok, true);
  assert.equal(app.storage.get(app.KEYS.SYNC_TOKEN), 'qa-token-0123456789abcdef');
  assert.equal(app.storage.get(app.KEYS.CLAUDE_SYNC).lastUploadHash, 'abcd1234');
});

test('백업 — 삭제된 키(API 키·기억 노트·주간 리뷰)가 든 옛 백업도 복원된다', () => {
  const app = loadApp();
  app.localStorage.clear();
  const old = { app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z', data: {
    fitness_profile: { age: 40, height: 175, weight: 80, workoutFreq: 4 },
    fitness_workout_log: [{ id: 'a', date: '2026-07-30' }],
    fitness_api_key: 'sk-ant-old', fitness_coach_memory: [{ id: 'm', text: '메모' }],
    fitness_weekly_review: { weekId: '2026-W31' }, fitness_chat_signals: [{ x: 1 }],
  } };
  const res = app.restoreFromBackup(JSON.stringify(old));
  assert.equal(res.ok, true);
  assert.equal(res.summary.workouts, 1);
  ['fitness_api_key', 'fitness_coach_memory', 'fitness_weekly_review', 'fitness_chat_signals'].forEach((k) => {
    assert.equal(app.localStorage.getItem(k), null, k + ' 가 되살아났다');
  });
});

// ═══ 3. 전송 ═══
test('전송 — 연결 코드가 없으면 어떤 요청도 하지 않는다 (init 포함)', async () => {
  const app = loadApp();
  app.localStorage.removeItem('fitness_sync_token');
  const calls = fakeFetch(app, {});
  await app.uploadClaudeSnapshot();
  await app.uploadClaudeSnapshot({ force: true });
  await app.fetchClaudePlans();
  await app.runClaudeSync();
  app.init();
  await new Promise((r) => setImmediate(r));
  assert.equal(calls.length, 0, 'fetch 가 불렸다: ' + calls.map((c) => c.url).join(', '));
});

test('전송 — fetch 가 없는 환경에서도 던지지 않는다', async () => {
  const app = loadApp();
  withToken(app);
  app.fetch = undefined;
  const r1 = await app.uploadClaudeSnapshot({ force: true });
  const r2 = await app.fetchClaudePlans();
  assert.equal(r1.ok, false);
  assert.equal(r2.ok, false);
});

test('전송 — Bearer 로 POST 하고, 내용이 같으면(uploadedAt 제외) 다시 보내지 않는다', async () => {
  const app = loadApp();
  sampleData(app);
  withToken(app);
  const calls = fakeFetch(app, { '/api/snapshot': () => ({ ok: true }) });

  const r1 = await app.uploadClaudeSnapshot();
  assert.equal(r1.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer qa-token-0123456789abcdef');
  assert.equal(validateSnapshot(JSON.parse(calls[0].init.body)), null);
  const st = app.getClaudeSyncState();
  assert.ok(st.lastUploadAt && st.lastUploadHash, '전송 시각·해시 기록');

  const r2 = await app.uploadClaudeSnapshot();
  assert.equal(r2.skipped, 'unchanged');
  assert.equal(calls.length, 1, '같은 내용인데 또 보냈다');

  const r3 = await app.uploadClaudeSnapshot({ force: true });
  assert.equal(r3.ok, true);
  assert.equal(calls.length, 2, '[지금 보내기](force)는 해시가 같아도 보낸다');

  app.state.data.bodyLog.push({ date: app.getTodayStr(), weight: 77.0, bodyFat: null });
  await app.uploadClaudeSnapshot();
  assert.equal(calls.length, 3, '기록이 바뀌면 보낸다');
});

test('전송 — 실패는 조용히: 401 이면 해시를 남기지 않는다', async () => {
  const app = loadApp();
  withToken(app);
  const calls = fakeFetch(app, { '/api/snapshot': () => ({ __status: 401, error: 'unauthorized' }) });
  const r = await app.uploadClaudeSnapshot();
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
  assert.equal(app.getClaudeSyncState().lastUploadHash, null);
  await app.uploadClaudeSnapshot();
  assert.equal(calls.length, 2, '실패한 뒤에는 다음 기회에 다시 보낸다');
});

test('전송 — 다시 보일 때(visibilitychange)는 60초에 한 번만', async () => {
  const app = loadApp();
  withToken(app);
  const calls = fakeFetch(app, { '/api/plan': () => ({ routine: null, cardio: null }) });
  app.document.visibilityState = 'visible';
  const doc = { visibilityState: 'visible' };
  app.document = doc;
  await app.runClaudeSync();
  const after = calls.length;
  app.claudeSyncOnVisible();
  await new Promise((r) => setImmediate(r));
  assert.equal(calls.length, after, '60초 안에 다시 동기화했다');
});

// ═══ 4. 계획 받기 ═══
function routinePlan(app, over) {
  return Object.assign({
    id: 'r-1', createdAt: new Date().toISOString(), date: app.getTodayStr(), session: 'push', title: '가슴 상부 위주', note: '',
    exercises: [
      { name: '머신 체스트 프레스', note: '', sets: [
        { weight: 30, reps: '8', warmup: true, restSec: 60 },
        { weight: 45, reps: '5', warmup: true, restSec: 90 },
        { weight: 60, reps: '8', warmup: false, restSec: 150 },
        { weight: 55, reps: '10', warmup: false, restSec: 120 },
        { weight: 55, reps: '10', warmup: false, restSec: 120 }] },
      { name: '덤벨 벤치 프레스', note: '', sets: [
        { weight: 21, reps: '8-10', warmup: false, restSec: 90 },
        { weight: 21, reps: '8-10', warmup: false, restSec: null }] },
      { name: '어시스트 풀업', note: '', sets: [{ weight: 30, reps: '8', warmup: false, restSec: 0 }] },
    ],
  }, over || {});
}

function cardioPlan(app, over) {
  return Object.assign({
    id: 'c-1', createdAt: new Date().toISOString(), date: app.getTodayStr(), mode: 'walk', title: '경사 걷기', note: '',
    segments: [
      { type: 'warmup', sec: 300, speed: 4.5, incline: 0 },
      { type: 'walk', sec: 1380, speed: 5, incline: 8.3 },
      { type: 'cooldown', sec: 120, speed: 4.5, incline: 0 }],
  }, over || {});
}

test('계획 받기 — 오늘 것이고 가져온 적 없는 id 만 state 에 둔다', async () => {
  const app = loadApp();
  withToken(app);
  let plans = { routine: routinePlan(app), cardio: cardioPlan(app) };
  const calls = fakeFetch(app, { '/api/plan': () => plans });
  await app.fetchClaudePlans();
  assert.equal(calls[0].init.headers.Authorization, 'Bearer qa-token-0123456789abcdef');
  assert.equal(app.state.claudeRoutine.id, 'r-1');
  assert.equal(app.state.claudeCardio.id, 'c-1');

  // 오늘 날짜가 아니면 무시
  plans = { routine: routinePlan(app, { date: kstDaysAgo(app, 1) }), cardio: cardioPlan(app, { date: kstDaysAgo(app, 1) }) };
  await app.fetchClaudePlans();
  assert.equal(app.state.claudeRoutine, null);
  assert.equal(app.state.claudeCardio, null);

  // 이미 가져온 id 면 무시
  app.setClaudeSyncState({ lastImportedRoutineId: 'r-1', lastImportedCardioId: 'c-1' });
  plans = { routine: routinePlan(app), cardio: cardioPlan(app) };
  await app.fetchClaudePlans();
  assert.equal(app.state.claudeRoutine, null);
  assert.equal(app.state.claudeCardio, null);

  // 새 id 면 다시 뜬다
  plans = { routine: routinePlan(app, { id: 'r-2' }), cardio: null };
  await app.fetchClaudePlans();
  assert.equal(app.state.claudeRoutine.id, 'r-2');
});

// ═══ 5. 루틴 가져오기 · 2단계 ═══
function importRoutine(app, plan) {
  app.applyClaudePlans({ routine: plan || routinePlan(app), cardio: null });
  app.state.currentTab = 'workout';
  app.state.workoutWizardStep = 1;
}

test('루틴 가져오기 — 첫 화면 한 줄 → 2단계, 한 번 열면 사라진다', () => {
  const app = loadApp();
  app.state.currentTab = 'workout';
  app.state.workoutWizardStep = 1;
  assert.ok(!app.renderWorkout().includes('openClaudeRoutine()'), '계획이 없으면 줄이 없다');

  importRoutine(app);
  const step1 = app.renderWorkout();
  assert.ok(step1.includes('Claude 추천 · PUSH 3종목'), '줄 글자: 세션명·종목 수');
  assert.ok(step1.indexOf('openClaudeRoutine()') < step1.indexOf('body-part-grid'), '부위 카드 위');

  app.openClaudeRoutine();
  assert.equal(app.state.workoutWizardStep, 2);
  assert.equal(app.state.selectedBodyPart, 'push');
  assert.equal(app.state.claudeRoutine, null, '한 번 열면 사라진다');
  assert.equal(app.getClaudeSyncState().lastImportedRoutineId, 'r-1');
  const r = plain(app.state.generatedRoutine);
  assert.equal(r.source, 'claude');
  assert.equal(r.bodyPart, 'push');
  assert.equal(r.headline, '가슴 상부 위주');
  assert.deepEqual(r.exercises[0].claudeSets[2], { weight: 60, reps: '8', warmup: false, restSec: 150 });
  assert.equal(app.storage.get(app.KEYS.WORKOUT_WIZARD).generatedRoutine.source, 'claude', '마법사 저장');

  app.state.currentTab = 'workout';
  app.state.workoutWizardStep = 1;
  assert.ok(!app.renderWorkout().includes('openClaudeRoutine()'));
});

test('2단계 — Claude 종목 줄은 이름 + 세트 요약, 헤더 합계는 작업 세트에서', () => {
  const app = loadApp();
  importRoutine(app);
  app.openClaudeRoutine();
  const html = app.renderWorkoutStep2();
  assert.ok(html.includes('워밍업 2 · 60kg×8 · 55kg×10×2'), '세트 요약(연속 같은 값은 ×N)');
  assert.ok(html.includes('22kg×8~10×2'), '범위 반복은 물결로 · 무게는 장비 단위(21 → 덤벨 22)');
  assert.ok(html.includes('보조 30kg×8'), '어시스트는 보조');
  assert.ok(html.includes('3종목 · 6세트'), '헤더: 3종목 · 작업 세트 6');
  assert.ok(!html.includes('undefined'), '없는 값(예상 시간)을 적지 않는다');
  assert.ok(html.includes("openExerciseEdit('preview', 0)"));
});

test('편집 시트 — Claude 종목: 무게(작업 세트 일괄·장비 단위)·반복·세트 수·빼기·바꾸기', () => {
  const app = loadApp();
  importRoutine(app);
  app.openClaudeRoutine();
  const ex = () => app.state.generatedRoutine.exercises[0];
  app.openExerciseEdit('preview', 0);
  let sheet = app.buildExerciseEditSheetHtml();
  assert.ok(sheet.includes('목표 반복') && sheet.includes('세트'));
  assert.ok(!sheet.includes('쉬는시간'), 'Claude 종목은 세트별 휴식이라 한 값 스테퍼가 없다');

  // 무게 +5: 작업 세트 전부 같은 폭, 워밍업 그대로
  app.adjustExerciseEdit('weight', 5);
  assert.deepEqual(ex().claudeSets.map((s) => s.weight), [30, 45, 65, 60, 60]);
  // 반복 +1: 작업 세트 전부
  app.adjustExerciseEdit('reps', 1);
  assert.deepEqual(ex().claudeSets.map((s) => s.reps), ['8', '5', '9', '11', '11']);
  // 세트 +1: 마지막 작업 세트 복제
  app.adjustExerciseEdit('sets', 1);
  assert.equal(ex().claudeSets.length, 6);
  assert.deepEqual(plain(ex().claudeSets[5]), { weight: 60, reps: '11', warmup: false, restSec: 120 });
  // 세트 −1 을 여러 번: 최소 1 작업 세트
  for (let i = 0; i < 6; i++) app.adjustExerciseEdit('sets', -1);
  assert.equal(ex().claudeSets.filter((s) => !s.warmup).length, 1);
  assert.equal(ex().claudeSets.filter((s) => s.warmup).length, 2, '워밍업은 세트 수 조절에서 빠진다');
  // 요약·헤더가 편집을 따라온다
  const html = app.renderWorkoutStep2();
  assert.ok(html.includes('워밍업 2 · 65kg×9'), '요약이 편집을 따라온다');
  assert.ok(html.includes('3종목 · 4세트'), '헤더 합계가 편집을 따라온다');
  assert.equal(app.storage.get(app.KEYS.WORKOUT_WIZARD).generatedRoutine.exercises[0].claudeSets.length, 3, '편집이 저장된다');

  // 덤벨은 2kg 단위, 범위 반복은 폭을 지킨 채 이동
  app.state.exerciseEdit = null;
  app.openExerciseEdit('preview', 1);
  app.adjustExerciseEdit('weight', 2);
  assert.deepEqual(app.state.generatedRoutine.exercises[1].claudeSets.map((s) => s.weight), [24, 24], '21+2=23 → 덤벨 2kg 단위로 스냅(24)');
  app.adjustExerciseEdit('reps', -1);
  assert.deepEqual(app.state.generatedRoutine.exercises[1].claudeSets.map((s) => s.reps), ['7-9', '7-9']);

  // 바꾸기: 세트는 그대로, 이름만
  const before = plain(app.state.generatedRoutine.exercises[1].claudeSets);
  app.exerciseEditSwap();
  app.swapCurrentExercise('덤벨 인클라인 벤치 프레스');
  assert.equal(app.state.generatedRoutine.exercises[1].name, '덤벨 인클라인 벤치 프레스');
  assert.deepEqual(plain(app.state.generatedRoutine.exercises[1].claudeSets), before);

  // 빼기
  app.showConfirm = (m, ok) => ok();
  app.openExerciseEdit('preview', 2);
  app.exerciseEditRemove();
  assert.equal(app.state.generatedRoutine.exercises.length, 2);
});

// ═══ 6. 실행 ═══
test('Claude 세트 그대로 실행 — 무게는 장비 단위 스냅만, 반복·워밍업·세트별 휴식 그대로', () => {
  const app = loadApp();
  importRoutine(app);
  app.openClaudeRoutine();
  app.startGeneratedRoutine();
  const s = app.state.activeSession;
  assert.equal(s.source, 'claude');
  const ex0 = s.exercises[0];
  assert.deepEqual(plain(ex0.sets.map((st) => [st.weight, st.reps, st.isWarmup, st.rest])),
    [[30, 8, true, 60], [45, 5, true, 90], [60, 8, false, 150], [55, 10, false, 120], [55, 10, false, 120]]);
  assert.equal(ex0.scheme, 'straight');
  const ex1 = s.exercises[1];
  assert.deepEqual(plain(ex1.sets.map((st) => [st.weight, st.reps, st.repsMin, st.repsMax])), [[22, 8, 8, 10], [22, 8, 8, 10]], '21kg 덤벨 → 22kg(2kg 단위 반올림)');
  assert.equal(ex1.targetReps, '8-10');
  assert.equal(ex1.sets[1].rest, undefined, 'restSec null 은 비워 둔다');
  assert.equal(s.exercises[2].sets[0].weight, 30, '어시스트 보조 무게 그대로');
  assert.ok(s.exercises.every((e) => e.supersetWith === undefined), '슈퍼세트 자동 제안 없음');
  // 세션 화면: 범위 목표를 그대로 적는다
  app.state.activeSession.warmup = null;
  app.state.activeSession.currentExerciseIdx = 1;
  assert.ok(app.renderWorkoutSession().includes('8~10'));
});

test('Claude 세션 — 자동 조정 꺼짐: 탑세트 미달 백오프 감량 없음 · 미달 +30초 없음 · 휴식은 세트 값', () => {
  const app = loadApp();
  importRoutine(app);
  app.openClaudeRoutine();
  app.startGeneratedRoutine();
  const s = app.state.activeSession;
  s.warmup = null;
  const ex = s.exercises[0];
  // 목표 8회 작업 세트를 3회로 끝냄 → 휴식은 세트에 적힌 150초 그대로 (+30 없음)
  app.state.editingSet = { exerciseIdx: 0, setIdx: 2 };
  ex.sets[2].reps = 3;
  app.completeSet();
  assert.equal(app.state.restTimer.duration, 150);
  app.state.restTimer = null;

  // 손으로 탑+백오프 모양을 만들어도 Claude 세션에서는 백오프를 자동으로 깎지 않는다
  ex.scheme = 'top_backoff';
  ex.sets[3].role = 'top'; ex.sets[3].repsTarget = 10;
  ex.sets[4].role = 'backoff';
  const backoffBefore = ex.sets[4].weight;
  app.state.editingSet = { exerciseIdx: 0, setIdx: 3 };
  ex.sets[3].reps = 4;
  app.completeSet();
  assert.equal(ex.sets[4].weight, backoffBefore, 'Claude 세션에서 백오프가 자동으로 깎였다');
  assert.equal(app.state.restTimer.duration, 120);

  // 대조군: 같은 조작을 기본 세션에서 하면 +30초가 붙는다(자가조절이 살아 있음)
  const b = loadApp();
  b.selectBodyPart('push');
  b.startGeneratedRoutine();
  const bs = b.state.activeSession;
  bs.warmup = null;
  const bex = bs.exercises.find((e) => e.sets.some((st) => !st.isWarmup && st.role !== 'top' && st.role !== 'drop'));
  const bi = bs.exercises.indexOf(bex);
  const si = bex.sets.findIndex((st) => !st.isWarmup && st.role !== 'top' && st.role !== 'drop');
  const base = b.baseRestSec(bex, bex.sets[si]);
  b.state.editingSet = { exerciseIdx: bi, setIdx: si };
  bex.sets[si].reps = 1;
  b.completeSet();
  assert.equal(b.state.restTimer.duration, Math.min(b.REST_MAX_SEC, base + b.REST_AUTOREG_BONUS_SEC), '대조군: 기본 세션은 +30초');
});

test('기본 틀 경로 — claudeSets 가 없으면 예전과 같은 세션을 만든다 (source 없음 · 엔진 세트 · 슈퍼세트 제안)', () => {
  const app = loadApp();
  app.selectBodyPart('pull');
  const routine = plain(app.state.generatedRoutine);
  app.startGeneratedRoutine();
  const s = app.state.activeSession;
  assert.equal('source' in s, false, '기본 틀 세션에 source 가 붙었다');
  // 기대값: 같은 엔진 호출로 직접 만든 세트
  const expected = routine.exercises.map((ex) => {
    const plan = app.getSessionSetPlan(ex.name, ex.weight, ex.reps || '8-12', app.routinePlanOpts(ex, { warmup: !!ex.isMain }));
    return { name: ex.name, sets: plain(plan.sets), scheme: plan.scheme, targetReps: app.repRangeToStr(plan.repRange) };
  });
  const expectedEx = expected.map((e) => ({ name: e.name, sets: e.sets, scheme: e.scheme, targetReps: e.targetReps }));
  app.applySupersetSuggestions(expectedEx);
  assert.deepEqual(plain(s.exercises.map((e) => ({ name: e.name, sets: e.sets, scheme: e.scheme, targetReps: e.targetReps, supersetWith: e.supersetWith }))),
    plain(expectedEx.map((e) => ({ name: e.name, sets: e.sets, scheme: e.scheme, targetReps: e.targetReps, supersetWith: e.supersetWith }))));
  assert.equal(s.isGenerated, true);
});

// ═══ 7. 유산소 가져오기 ═══
test('유산소 가져오기 — 러닝 탭 한 줄 → 모양만 맞춰 미리보기', () => {
  const app = loadApp();
  app.state.currentTab = 'running';
  assert.ok(!app.renderRunning().includes('openClaudeCardio()'));
  app.applyClaudePlans({ routine: null, cardio: cardioPlan(app) });
  const html = app.renderRunning();
  assert.ok(html.includes('Claude 유산소 · 경사 걷기 30분'), '줄 글자: 모드·총 분');
  app.openClaudeCardio();
  const c = app.state.cardio;
  assert.equal(c.mode, 'walk');
  assert.equal(c.phase, 'preview');
  assert.equal(app.state.claudeCardio, null);
  assert.equal(app.getClaudeSyncState().lastImportedCardioId, 'c-1');
  assert.deepEqual(plain(c.plan.segments.map((s) => [s.type, s.startSec, s.endSec, s.speed, s.incline])),
    [['warmup', 0, 300, 4.5, 0], ['walk', 300, 1680, 5, 8.5], ['cooldown', 1680, 1800, 4.5, 0]], '경사는 0.5 격자로만 정리');
  assert.equal(c.plan.totalSec, 1800);
  assert.ok(app.renderRunning().includes('startCardio()'), '이후 시작 흐름은 기존 그대로');

  // 인터벌은 경사 없이
  const b = loadApp();
  b.applyClaudePlans({ routine: null, cardio: cardioPlan(b, { id: 'c-2', mode: 'interval', segments: [
    { type: 'warmup', sec: 300, speed: 5, incline: 0 }, { type: 'run', sec: 60, speed: 8, incline: 0 }, { type: 'walk', sec: 120, speed: 5.5, incline: 0 }] }) });
  b.openClaudeCardio();
  assert.equal(b.state.cardio.mode, 'interval');
  assert.equal(b.state.cardio.plan.segments[1].incline, undefined);
  assert.equal(b.state.cardio.plan.totalSec, 480);
});

// ═══ 8. 더보기 > Claude 연결 ═══
test('연결 코드 — 커넥터 주소 전체를 붙여도 /api/mcp/ 뒤 조각만', () => {
  const app = loadApp();
  assert.equal(app.extractSyncToken('https://fitness.vercel.app/api/mcp/abcDEF0123456789xyz'), 'abcDEF0123456789xyz');
  assert.equal(app.extractSyncToken('  https://x.app/api/mcp/tok_123/?a=1#f  '), 'tok_123');
  assert.equal(app.extractSyncToken('qa-token-0123456789abcdef'), 'qa-token-0123456789abcdef');
  assert.equal(app.extractSyncToken('  qa-token  '), 'qa-token');
  assert.equal(app.extractSyncToken(''), '');

  app.openClaudeSyncSheet();
  app.updateClaudeSyncInput('https://fitness.vercel.app/api/mcp/abcDEF0123456789xyz');
  app.saveClaudeSyncToken();
  assert.equal(app.storage.get(app.KEYS.SYNC_TOKEN), 'abcDEF0123456789xyz');
});

test('Claude 연결 시트 — 더보기 줄 · 가림 입력 · 저장·지금 보내기 · 마지막 전송 한 줄 · 등록 6곳', () => {
  const app = loadApp();
  app.state.currentTab = 'more';
  const more = app.renderMore();
  assert.ok(more.includes('Claude 연결') && more.includes('openClaudeSyncSheet()'));
  assert.ok(!more.includes('API 키'), '옛 API 키 줄이 남아 있다');

  app.openClaudeSyncSheet();
  const sheet = app.renderClaudeSyncSheet();
  assert.ok(/<input type="password"[^>]*id="claude-sync-input"/.test(sheet), '코드 칸은 가려진다');
  assert.ok(sheet.includes('saveClaudeSyncToken()') && sheet.includes('sendClaudeSnapshotNow()'));
  assert.ok(sheet.includes('아직 보낸 적 없어요'));
  app.setClaudeSyncState({ lastUploadAt: '2026-09-27T03:05:00.000Z' });
  assert.ok(app.renderClaudeSyncSheet().includes('마지막 전송 · 2026.09.27 12:05'), 'KST 로 적는다');

  // 속성 탈출 불가
  app.state.claudeSyncInput = '" autofocus onfocus=eeek() x="';
  assert.ok(!app.renderClaudeSyncSheet().includes('" autofocus'), '입력값이 속성을 탈출한다');

  // 등록: getTopLayer · navBack · 스와이프 가드 · 세션 종료 정리 · render 꼬리
  assert.equal(app.getTopLayer(), 'claudeSync');
  app.setTimeout = (fn) => { fn(); return 0; };
  app.navBack();
  assert.equal(app.state.claudeSyncSheetOpen, false, '뒤로가기가 시트를 닫는다');
  const src = fs.readFileSync(path.join(DIR, '..', 'js', 'screens.js'), 'utf8');
  const handler = src.slice(src.indexOf("document.addEventListener('touchend'"));
  assert.ok(handler.slice(0, handler.indexOf('var touch = e.changedTouches[0]')).includes('if (state.claudeSyncSheetOpen) return;'), '스와이프 가드');
  const renderSrc = src.slice(src.indexOf('function render()'), src.indexOf('function renderResetConfirm()'));
  assert.ok(renderSrc.includes('renderClaudeSyncSheet()'), 'render 꼬리');
  assert.equal((src.match(/state\.claudeSyncSheetOpen = false;/g) || []).length >= 3, true, '세션 종료 정리(취소·완료) + 닫기');
});

test('지금 보내기 — 토스트 없이 시트 안에서: 코드 없음·실패는 안내 한 줄(warn+info), 성공은 마지막 전송 줄 갱신 (결정 14)', async () => {
  const app = loadApp();
  app.localStorage.removeItem('fitness_sync_token');
  const toasts = [];
  app.showToast = (m, err) => toasts.push([m, !!err]);
  let fail = false;
  const calls = fakeFetch(app, { '/api/snapshot': () => (fail ? { __status: 500 } : { ok: true }) });
  const tick = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
  const warnLine = (html, msg) => {
    const m = html.match(/<p class="([^"]*)" style="color:var\(--warn\);">(.*?)<\/p>/);
    return !!m && m[2].includes(app.icon('info', 13)) && m[2].includes(msg);
  };
  app.openClaudeSyncSheet();

  app.sendClaudeSnapshotNow();
  await tick();
  assert.equal(calls.length, 0);
  assert.deepEqual(toasts, [], '코드가 없어도 토스트는 없다');
  let sheet = app.renderClaudeSyncSheet();
  assert.ok(warnLine(sheet, '연결 코드를 먼저 저장해 주세요'), '시트 안 안내 한 줄');
  assert.ok(!sheet.includes('아직 보낸 적 없어요'), '안내는 마지막 전송 줄 자리에 뜬다');

  withToken(app);
  app.setClaudeSyncState({ lastUploadAt: '2026-09-27T03:05:00.000Z', lastUploadHash: app.claudeSnapshotHash(app.buildClaudeSnapshot()) });
  app.sendClaudeSnapshotNow();
  await tick();
  assert.equal(calls.length, 1, '해시가 같아도 [지금 보내기]는 보낸다');
  assert.deepEqual(toasts, [], '성공해도 토스트는 없다');
  const at = app.getClaudeSyncState().lastUploadAt;
  assert.notEqual(at, '2026-09-27T03:05:00.000Z');
  sheet = app.renderClaudeSyncSheet();
  assert.ok(sheet.includes('마지막 전송 · ' + app.claudeFmtUploadAt(at)), '마지막 전송 줄이 새 시각');
  assert.ok(!sheet.includes('var(--warn)'), '성공하면 안내 줄은 사라진다');

  fail = true;
  app.sendClaudeSnapshotNow();
  await tick();
  assert.equal(calls.length, 2);
  assert.deepEqual(toasts, [], '실패해도 토스트는 없다');
  sheet = app.renderClaudeSyncSheet();
  assert.ok(warnLine(sheet, '보내지 못했어요. 연결 코드를 확인해 주세요'), '실패 안내 한 줄');
  assert.ok(!sheet.includes('마지막 전송 · '), '안내는 마지막 전송 줄 자리에 뜬다');

  // 다시 열면 안내는 지워지고 마지막 전송 줄로 돌아온다
  app.setTimeout = (fn) => { fn(); return 0; };
  app.closeClaudeSyncSheet();
  app.openClaudeSyncSheet();
  assert.ok(app.renderClaudeSyncSheet().includes('마지막 전송 · ' + app.claudeFmtUploadAt(at)));
});

test('저장 — 코드를 저장하면 시트를 닫고 토스트 (결정 14)', () => {
  const app = loadApp();
  const toasts = [];
  app.showToast = (m, err) => toasts.push([m, !!err]);
  app.setTimeout = (fn) => { fn(); return 0; };
  app.openClaudeSyncSheet();
  app.updateClaudeSyncInput('https://fitness.vercel.app/api/mcp/abcDEF0123456789xyz');
  app.saveClaudeSyncToken();
  assert.equal(app.storage.get(app.KEYS.SYNC_TOKEN), 'abcDEF0123456789xyz');
  assert.equal(app.state.claudeSyncSheetOpen, false, '시트가 닫힌다');
  assert.deepEqual(toasts, [['연결 코드를 저장했어요', false]]);
});

// ═══ 9. 서비스워커 · 문구 규칙 ═══
test('서비스워커 — 모든 호스트의 /api/ 는 가로채지 않는다, 캐시 버전 = 앱 버전', () => {
  const sw = fs.readFileSync(path.join(DIR, '..', 'service-worker.js'), 'utf8');
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
  const bypass = sw.indexOf("url.pathname.startsWith('/api/')");
  assert.ok(bypass > sw.indexOf("event.request.method !== 'GET'") && bypass < sw.indexOf('event.respondWith'), 'respondWith 전에 빠진다');
  const app = loadApp();
  const v = sw.match(/CACHE_VERSION = '([^']+)'/)[1];
  assert.equal(v, 'health-app-' + app.APP_VERSION, 'APP_VERSION 과 CACHE_VERSION 이 어긋났다');
});

test('디자인 규칙 — js/ai.js 문구도 화면 규칙을 지킨다 (이모지·색·해요체·느낌표·40자)', () => {
  const src = fs.readFileSync(path.join(DIR, '..', 'js', 'ai.js'), 'utf8');
  const lines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
  assert.deepEqual(lines.filter((l) => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(l)), [], '이모지');
  assert.deepEqual(lines.filter((l) => /#[0-9a-fA-F]{6}\b/.test(l)), [], '색 직접 표기');
  const strs = [];
  lines.forEach((l) => {
    const singles = l.match(/'(?:[^'\\]|\\.)*'/g) || [];
    // 큰따옴표 문자열도 같은 규칙 — 작은따옴표 문자열(HTML 속성의 " 포함)을 걷어 낸 나머지에서 찾는다.
    const doubles = l.replace(/'(?:[^'\\]|\\.)*'/g, "''").match(/"(?:[^"\\]|\\.)*"/g) || [];
    singles.concat(doubles).forEach((q) => { if (/[가-힣]/.test(q)) strs.push(q.slice(1, -1)); });
  });
  assert.ok(strs.length > 5, '문자열을 못 모았다');
  strs.forEach((s) => {
    assert.ok(!/(합니다|됩니다|입니다|습니다)/.test(s), '합니다체: ' + s);
    assert.ok(!/[가-힣][^A-Za-z<>]{0,4}!/.test(s), '느낌표: ' + s);
    assert.ok([...s].length <= 40, '40자 초과: ' + s);
  });
});

test('디자인 규칙 — js/ai.js 도 11px 하한 · CSS 에 있는 클래스만 · class 속성 백슬래시 금지', () => {
  const src = fs.readFileSync(path.join(DIR, '..', 'js', 'ai.js'), 'utf8');
  const lines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
  // 11px 하한 — 단위 첨자 예외는 screens.js 몫이라 ai.js 에는 10px 이하가 하나도 없어야 한다.
  lines.forEach((l) => {
    for (const m of l.matchAll(/text-\[(\d+)px\]|font-size:\s*(\d+)px/g)) {
      assert.ok(Number(m[1] || m[2]) >= 11, '11px 미만 글씨: ' + l.trim().slice(0, 80));
    }
  });
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const defined = new Set();
  for (const [, selector] of css.matchAll(/([^{}]+)\{/g)) {
    if (selector.includes('@')) continue;
    for (const m of selector.matchAll(/\.((?:[\w-]|\\.)+)/g)) defined.add(m[1].replace(/\\(.)/g, '$1'));
  }
  lines.forEach((l) => {
    for (const m of l.matchAll(/class=\\?(["'])(.*?)\\?\1/g)) {
      let value = m[2];
      assert.ok(!value.includes('\\'), 'class 속성에 백슬래시: ' + l.trim().slice(0, 80));
      // `class="a b' + x + '"` 처럼 문자열이 끊기면 끊긴 앞까지만, 반쪽 토큰은 버린다.
      const cut = value.search(/['"]/);
      if (cut !== -1) {
        value = value.slice(0, cut);
        if (!/\s$/.test(value)) value = value.replace(/\S+$/, '');
      }
      value.split(/\s+/).filter(Boolean).forEach((cls) => {
        assert.ok(defined.has(cls), 'CSS 에 없는 클래스: ' + cls);
      });
    }
  });
});

// ═══ 10. 시점 ═══
test('시점 — 코드가 있으면 init() 끝에서 보내고(POST) 받아 온다(GET)', async () => {
  const app = loadApp();
  withToken(app);
  const calls = fakeFetch(app, { '/api/plan': () => ({ routine: null, cardio: null }) });
  app.init();
  for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls.map((c) => [c.url, c.init.method]), [['/api/snapshot', 'POST'], ['/api/plan', 'GET']]);
});

test('시점 — 운동 완료·유산소 저장 뒤에는 보내기만 한다 (계획 요청 없음)', async () => {
  const app = loadApp();
  withToken(app);
  const calls = fakeFetch(app, { '/api/snapshot': () => ({ ok: true }) });

  // 운동 완료
  app.selectBodyPart('push');
  app.startGeneratedRoutine();
  const s = app.state.activeSession;
  s.warmup = null;
  const ex = s.exercises[0];
  const si = ex.sets.findIndex((st) => !st.isWarmup);
  ex.sets[si].completed = true;
  app.finalizeSession();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls.map((c) => [c.url, c.init.method]), [['/api/snapshot', 'POST']], '운동 완료 뒤');
  assert.ok(JSON.parse(calls[0].init.body).workouts.length >= 1, '방금 끝낸 운동이 스냅샷에 들어간다');

  // 유산소 저장
  app.saveCardioSession({ id: 'c_now', date: app.getTodayStr(), mode: 'walk', totalSec: 600, completed: true, rpe: null,
    segments: [{ type: 'walk', sec: 600, targetSpeed: 5, actualSpeed: 5, incline: 6 }] });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls.map((c) => c.url), ['/api/snapshot', '/api/snapshot'], '유산소 저장 뒤');
  assert.equal(JSON.parse(calls[1].init.body).cardio[0].date, app.getTodayStr());
});

test('시점 — 다시 보일 때: 60초가 지나면 동기화하고, 숨은 상태에서는 하지 않는다', async () => {
  const app = loadApp();
  withToken(app);
  const calls = fakeFetch(app, { '/api/plan': () => ({ routine: null, cardio: null }) });
  app.document = { visibilityState: 'hidden' };
  app._claudeLastSyncAt = 0;
  app.claudeSyncOnVisible();
  await new Promise((r) => setImmediate(r));
  assert.equal(calls.length, 0, '숨은 상태에서 동기화했다');

  app.document = { visibilityState: 'visible' };
  app._claudeLastSyncAt = Date.now() - 61000;
  app.claudeSyncOnVisible();
  for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls.map((c) => c.url), ['/api/snapshot', '/api/plan']);
});

test('Claude 세션 — 세트를 다시 짜도(rebuildPendingSets) 자동 디로드를 하지 않는다', () => {
  // 같은 모양(탑 3회 미달 + 남은 백오프 2)을 기본 세션과 Claude 세션에서 다시 짜서 비교한다.
  function setup(claude) {
    const app = loadApp();
    app.storage.set(app.KEYS.SET_SCHEMES, { '머신 체스트 프레스': 'top_backoff' });
    app.selectBodyPart('push');
    app.startGeneratedRoutine();
    const s = app.state.activeSession;
    s.warmup = null;
    if (claude) s.source = 'claude';
    const ex = s.exercises.find((e) => e.name === '머신 체스트 프레스');
    ex.scheme = 'top_backoff';
    ex.sets = [
      { weight: 60, reps: 3, repsTarget: 8, isWarmup: false, completed: true, role: 'top' },
      { weight: 55, reps: 10, repsTarget: 10, isWarmup: false, completed: false, role: 'backoff' },
      { weight: 55, reps: 10, repsTarget: 10, isWarmup: false, completed: false, role: 'backoff' }];
    app.rebuildPendingSets(ex, { baseWeight: 60 });
    return plain(ex.sets.filter((st) => !st.completed).map((st) => [st.weight, !!st.autoDeloaded]));
  }
  assert.deepEqual(setup(false), [[50, true], [50, true]], '대조군: 기본 세션은 백오프를 한 칸 낮춘다');
  assert.deepEqual(setup(true), [[55, false], [55, false]], 'Claude 세션은 자동 디로드 없음');
});

// ═══ 7. Claude 세션 편집 — 남은 세트만 손댄다 (설계서 결정 5 · 편집 시트 규칙) ═══
function startClaudeSession(app) {
  importRoutine(app);
  app.openClaudeRoutine();
  app.startGeneratedRoutine();
  const s = app.state.activeSession;
  s.warmup = null;
  return s;
}
const setRows = (ex) => plain(ex.sets.map((st) => [st.weight, st.reps, st.isWarmup, st.rest === undefined ? null : st.rest, !!st.completed]));

test('Claude 세션 편집 — 세트 +1 복제 · 무게 같은 폭 · 반복 전부 · −1 삭제, 워밍업·세트법·휴식 재계산 없음', () => {
  const app = loadApp();
  const s = startClaudeSession(app);
  const ex = s.exercises[0];
  app.state.editingSet = { exerciseIdx: 0, setIdx: 2 };   // 첫 작업 세트(60×8)를 끝낸다
  app.completeSet();
  app.state.restTimer = null;
  const done = plain(ex.sets[2]);
  app.openExerciseEdit('session', 0);

  app.adjustExerciseEdit('sets', 1);
  assert.deepEqual(setRows(ex), [[30, 8, true, 60, false], [45, 5, true, 90, false], [60, 8, false, 150, true],
    [55, 10, false, 120, false], [55, 10, false, 120, false], [55, 10, false, 120, false]], '세트 +1 = 마지막 작업 세트 복제');

  app.adjustExerciseEdit('weight', 5);
  assert.deepEqual(setRows(ex).map((r) => r[0]), [30, 45, 60, 60, 60, 60], '무게 + = 미완료 작업 세트만 같은 폭');

  app.adjustExerciseEdit('reps', 1);
  assert.deepEqual(setRows(ex).map((r) => r[1]), [8, 5, 8, 11, 11, 11], '반복 = 미완료 작업 세트 전부');

  app.adjustExerciseEdit('sets', -1);
  assert.deepEqual(setRows(ex), [[30, 8, true, 60, false], [45, 5, true, 90, false], [60, 8, false, 150, true],
    [60, 11, false, 120, false], [60, 11, false, 120, false]], '세트 −1 = 마지막 미완료 작업 세트 삭제');
  for (let i = 0; i < 5; i++) app.adjustExerciseEdit('sets', -1);
  assert.equal(ex.sets.filter((st) => !st.isWarmup).length, 1, '작업 세트는 최소 1');
  assert.deepEqual(plain(ex.sets.find((st) => st.completed)), done, '완료한 세트는 그대로');
  assert.equal(ex.scheme, 'straight', '세트법 재배정 없음');

  // 휴식은 편집 시트에서 정한 값만 — 워밍업은 받은 값 그대로
  app.adjustExerciseEdit('sets', 1);
  const pending = ex.sets.findIndex((st) => !st.completed && !st.isWarmup);
  const restBefore = app.claudeRestSec(ex, ex.sets[pending]);
  app.adjustExerciseEdit('rest', 15);
  assert.equal(app.claudeRestSec(ex, ex.sets[pending]), restBefore + 15);
  assert.equal(app.claudeRestSec(ex, ex.sets[0]), 60, '워밍업 휴식은 그대로');
  assert.equal(app.storage.get(app.KEYS.ACTIVE_SESSION).exercises[0].sets.length, ex.sets.length, '편집이 저장된다');
});

test('Claude 세션 편집 — 시작 전 종목도 워밍업을 새로 만들지 않고, 덤벨은 2kg 단위', () => {
  const app = loadApp();
  const s = startClaudeSession(app);
  const ex = s.exercises[1];   // 덤벨 벤치 프레스 22×8-10 ×2 (워밍업 없음, 휴식 90 · 없음)
  app.openExerciseEdit('session', 1);
  app.adjustExerciseEdit('sets', 1);
  app.adjustExerciseEdit('weight', 2);
  app.adjustExerciseEdit('reps', 1);
  assert.deepEqual(plain(ex.sets.map((st) => [st.weight, st.reps, st.repsMin, st.repsMax, st.isWarmup, st.rest === undefined ? null : st.rest])),
    [[24, 9, 9, 11, false, 90], [24, 9, 9, 11, false, null], [24, 9, 9, 11, false, null]]);
  assert.equal(ex.targetReps, '9-11');
});

test('Claude 세션 — 종목 교체는 받은 세트를 그대로 두고 이름만 (무게만 새 장비 단위)', () => {
  const app = loadApp();
  const s = startClaudeSession(app);
  s.currentExerciseIdx = 1;
  const ex = s.exercises[1];
  const before = setRows(ex);
  app.applyExerciseSwap(ex, '덤벨 인클라인 벤치 프레스');
  assert.equal(ex.name, '덤벨 인클라인 벤치 프레스');
  assert.deepEqual(setRows(ex), before, '세트 그대로');
  assert.equal(ex.scheme, 'straight');
  app.applyExerciseSwap(ex, '스미스 머신 벤치 프레스');
  assert.deepEqual(setRows(ex).map((r) => r[0]), [20, 20], '22kg → 스미스 5kg 단위(20)');
  assert.deepEqual(setRows(ex).map((r) => r.slice(1)), before.map((r) => r.slice(1)), '반복·워밍업·휴식 그대로');
});

test('Claude 세션 — 세트법 시트·탑세트 시트는 열리지 않고 종목 메뉴에도 없다', () => {
  const app = loadApp();
  const s = startClaudeSession(app);
  const ex = s.exercises[0];
  const before = setRows(ex);
  app.state.exerciseMenuOpen = true;
  assert.ok(!app.renderWorkoutSession().includes('openSetSchemeFromMenu()'), '메뉴에 세트법 바꾸기가 없다');
  app.state.exerciseMenuOpen = false;
  app.openSetSchemeSheet();
  assert.equal(app.state.setSchemeOpen, false);
  app.applySetScheme('pyramid');
  app.openTopSetWeightSheet();
  assert.equal(app.state.topSetSheet, null);
  assert.deepEqual(setRows(ex), before, '세트 그대로');

  // 대조군: 기본 세션은 메뉴에 그대로 있다
  const b = loadApp();
  b.selectBodyPart('push');
  b.startGeneratedRoutine();
  b.state.activeSession.warmup = null;
  b.state.exerciseMenuOpen = true;
  assert.ok(b.renderWorkoutSession().includes('openSetSchemeFromMenu()'));
});

test('2단계·편집 시트 — 무게는 장비 단위로 맞춘 값(세션 세트와 같은 숫자), 저장 원값은 그대로', () => {
  const app = loadApp();
  importRoutine(app);
  app.openClaudeRoutine();
  const ex1 = app.state.generatedRoutine.exercises[1];
  assert.ok(app.renderWorkoutStep2().includes('22kg×8~10×2'));
  assert.equal(app.claudeEditValues(ex1).weight, 22);
  app.openExerciseEdit('preview', 1);
  assert.ok(app.buildExerciseEditSheetHtml().includes('>22<'), '편집 시트 무게 칸 22');
  assert.deepEqual(ex1.claudeSets.map((cs) => cs.weight), [21, 21], '저장 원값은 그대로');
});

test('시점 — 운동 완료 뒤 RPE·컨디션을 저장하면(goHome·goToWorkout) 다시 보낸다', async () => {
  for (const fn of ['goHome', 'goToWorkout']) {
    const app = loadApp();
    sampleData(app);
    app.state.data.conditionLog = [];
    withToken(app);
    const calls = fakeFetch(app, { '/api/snapshot': () => ({ ok: true }) });
    await app.uploadClaudeSnapshot();
    app.state.completedSession = { workoutId: 'w_recent', sessionName: 'PUSH', rpe: 7, condition: 4, duration: 62 };
    app[fn]();
    for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r));
    assert.equal(calls.length, 2, fn + ' 뒤에 다시 보내지 않았다');
    const w = JSON.parse(calls[1].init.body).workouts.find((x) => x.date === kstDaysAgo(app, 1));
    assert.equal(w.rpe, 7);
    assert.equal(w.condition, 4);
  }
});

// ═══ 11. Claude 세션 — 세션 화면 버튼·휴식 표시도 받은 값 그대로 (설계서 결정 5) ═══
function startClaudeSessionWith(app, exercises) {
  importRoutine(app, routinePlan(app, { exercises }));
  app.openClaudeRoutine();
  app.startGeneratedRoutine();
  const s = app.state.activeSession;
  s.warmup = null;
  return s;
}
const fullRows = (ex) => plain(ex.sets.map((st) => [st.weight, st.reps,
  st.repsMin === undefined ? null : st.repsMin, st.repsMax === undefined ? null : st.repsMax,
  st.isWarmup, st.rest === undefined ? null : st.rest, !!st.completed]));

test('Claude 세션 — [＋ 세트 추가]도 편집 시트 +1 과 같다: 마지막 작업 세트 복제, 휴식·반복 폭 그대로', () => {
  const EX = [{ name: '머신 체스트 프레스', note: '', sets: [
    { weight: 30, reps: '8', warmup: true, restSec: 60 },
    { weight: 55, reps: '10-12', warmup: false, restSec: 90 },
    { weight: 55, reps: '10-12', warmup: false, restSec: 90 }] }];
  const finishTwo = (app) => {
    for (const i of [1, 2]) { app.state.editingSet = { exerciseIdx: 0, setIdx: i }; app.completeSet(); }
    app.state.restTimer = null;
  };
  const a = loadApp();
  const sa = startClaudeSessionWith(a, EX);
  finishTwo(a);
  a.addSetToExercise(0);
  const rows = fullRows(sa.exercises[0]);
  assert.deepEqual(rows[rows.length - 1], [55, 10, 10, 12, false, 90, false], '받은 휴식 90·반복 10-12 그대로');

  const b = loadApp();
  const sb = startClaudeSessionWith(b, EX);
  finishTwo(b);
  b.openExerciseEdit('session', 0);
  b.adjustExerciseEdit('sets', 1);
  assert.deepEqual(rows, fullRows(sb.exercises[0]), '세션 버튼과 편집 시트 +1 의 결과가 같다');

  a.state.editingSet = { exerciseIdx: 0, setIdx: 3 };
  a.completeSet();
  assert.equal(a.state.restTimer.duration, 90, '추가한 세트의 휴식 타이머도 받은 값');

  // 편집 시트에서 휴식을 바꾼 뒤 [＋ 세트 추가] → 사용자가 정한 휴식을 따른다 (세트법 표 아님)
  const c = loadApp();
  const sc = startClaudeSessionWith(c, EX);
  c.openExerciseEdit('session', 0);
  c.adjustExerciseEdit('rest', 15);
  c.closeExerciseEdit();
  c.addSetToExercise(0);
  const exc = sc.exercises[0];
  assert.equal(c.claudeRestSec(exc, exc.sets[exc.sets.length - 1]), 105);
  assert.equal(exc.scheme, 'straight', '세트법 재배정 없음');
});

test('Claude 세션 — 받은 휴식 0초: 편집 시트 쉬는시간도 0초(타이머와 같은 값), +15 는 0 에서 출발', () => {
  const app = loadApp();
  const s = startClaudeSession(app);
  const ex = s.exercises[2];   // 어시스트 풀업 보조 30×8 · 휴식 0
  assert.equal(app.claudeRestSec(ex, ex.sets[0]), 0, '타이머는 0초');
  app.openExerciseEdit('session', 2);
  assert.equal(app.exerciseEditValues(ex).rest, 0, '시트 값도 0초 (클래스 기본값 아님)');
  assert.ok(app.buildExerciseEditSheetHtml().includes('>0<span class="ex-edit-unit">초</span>'), '시트 쉬는시간 줄 = 0초');
  app.adjustExerciseEdit('rest', 15);
  assert.equal(app.claudeRestSec(ex, ex.sets[0]), 30, '0+15 → 하한 30 (195 아님)');
});

// ═══ 10. Claude 세션 중 직접 추가한 종목 · 보관본 없는 되돌리기 (설계서 결정 13) ═══
function logWith(app, name, setsDetail) {
  app.state.data.workoutLog = [{ date: kstDaysAgo(app, 3), exercises: [{ name, setsDetail }] }];
  app._lastSetsCache = null;
}
const addRows = (ex) => plain(ex.sets.map((st) => [st.weight, st.reps, st.isWarmup, st.rest === undefined ? null : st.rest, st.role]));

test('Claude 세션 종목 추가 — 기록이 있으면 마지막 작업 세트 그대로, 워밍업·세트법 없음, 휴식은 지금 종목의 작업 세트 휴식', () => {
  const app = loadApp();
  logWith(app, '바벨 벤치 프레스', [
    { weight: 40, reps: 8, isWarmup: true, completed: true },
    { weight: 60, reps: 6, isWarmup: false, completed: true },
    { weight: 55, reps: 8, isWarmup: false, completed: true },
    { weight: 55, reps: 7, isWarmup: false, completed: true }]);
  const s = startClaudeSessionWith(app, routinePlan(app).exercises);
  app.addExerciseAfterCurrent('바벨 벤치 프레스');
  const ex = s.exercises[1];
  assert.equal(ex.name, '바벨 벤치 프레스');
  assert.deepEqual(addRows(ex), [[60, 6, false, 120, 'work'], [55, 8, false, 120, 'work'], [55, 7, false, 120, 'work']],
    '작업 세트 3개 그대로 · 휴식 = 머신 체스트 프레스 작업 세트 휴식 120');
  assert.equal(ex.scheme, 'straight', '세트법 배정 없음');
  assert.equal(ex.addedInSession, true);
  assert.equal(s.exercises[2].name, '덤벨 벤치 프레스', '지금 종목 다음 자리');
});

test('Claude 세션 종목 추가 — 기록이 없으면 무게 빈칸·10회·3세트, 지금 종목에 휴식이 없으면 claudeRestSec 규칙', () => {
  const app = loadApp();
  app.state.data.workoutLog = [];
  app._lastSetsCache = null;
  const s = startClaudeSessionWith(app, [{ name: '머신 체스트 프레스', note: '', sets: [
    { weight: 60, reps: '8', warmup: false }, { weight: 60, reps: '8', warmup: false }] }]);
  const cur = s.exercises[0];
  const rest = app.claudeRestSec(cur, cur.sets[cur.sets.length - 1]);
  assert.equal(rest, app.baseRestSec(cur, cur.sets[1]));
  app.addExerciseAfterCurrent('머신 펙 덱 플라이');
  assert.deepEqual(addRows(s.exercises[1]), [[null, 10, false, rest, 'work'], [null, 10, false, rest, 'work'], [null, 10, false, rest, 'work']]);
  assert.equal(s.exercises[1].scheme, 'straight');
});

test('Claude 세션 종목 추가 — 추가한 종목도 Claude 규칙: 편집은 복제·같은 폭, 완료 뒤 휴식은 세트 값', () => {
  const app = loadApp();
  logWith(app, '바벨 벤치 프레스', [
    { weight: 60, reps: 6, isWarmup: false, completed: true },
    { weight: 55, reps: 8, isWarmup: false, completed: true }]);
  const s = startClaudeSessionWith(app, routinePlan(app).exercises);
  app.addExerciseAfterCurrent('바벨 벤치 프레스');
  s.currentExerciseIdx = 1;
  app.state.editingSet = { exerciseIdx: 1, setIdx: 0 };
  s.exercises[1].sets[0].reps = 3;
  app.completeSet();
  assert.equal(app.state.restTimer.duration, 120, '미달이어도 휴식 +30초 없음');
  app.state.restTimer = null;
  app.openExerciseEdit('session', 1);
  app.adjustExerciseEdit('sets', 1);
  app.adjustExerciseEdit('weight', 5);
  app.closeExerciseEdit();
  const ex = s.exercises[1];
  assert.deepEqual(addRows(ex).map((r) => [r[0], r[2], r[3]]), [[60, false, 120], [60, false, 120], [60, false, 120]],
    '마지막 작업 세트 복제 · 남은 세트 같은 폭 · 워밍업 없음');
  assert.equal(ex.scheme, 'straight');
});

test('Claude 세션 되돌리기 — 보관본이 없으면 마지막 작업 세트 복사 (세트법 재구성 없음)', () => {
  const app = loadApp();
  logWith(app, '덤벨 벤치 프레스', [
    { weight: 22, reps: 10, isWarmup: false, completed: true },
    { weight: 22, reps: 9, isWarmup: false, completed: true }]);
  const s = startClaudeSessionWith(app, routinePlan(app).exercises);
  const ex = s.exercises[1];
  s.currentExerciseIdx = 1;
  ex.sets = [{ weight: 21, reps: 9, repsTarget: 9, isWarmup: false, completed: true, role: 'work', rest: 90 }];
  ex.skipped = true;
  delete ex.skippedSets;
  app.unskipExercise(1);
  assert.equal(ex.skipped, undefined);
  assert.deepEqual(addRows(ex), [[21, 9, false, 90, 'work'], [22, 10, false, 90, 'work'], [22, 9, false, 90, 'work']]);
  assert.equal(ex.scheme, 'straight');
});

test('기본 틀 세션 — 종목 추가는 예전 엔진 그대로 (buildSessionExercise)', () => {
  const app = loadApp();
  app.selectBodyPart('push');
  app.startGeneratedRoutine();
  const s = app.state.activeSession;
  assert.equal(s.source, undefined);
  const expected = plain(app.buildSessionExercise('바벨 벤치 프레스'));
  app.addExerciseAfterCurrent('바벨 벤치 프레스');
  assert.deepEqual(plain(s.exercises[s.currentExerciseIdx + 1]), expected);
});
