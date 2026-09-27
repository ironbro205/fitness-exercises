// Zero-dependency tests for api/_lib/tools.mjs (MCP tool logic). Run: node --test tests/connector-tools.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTools, NO_SNAPSHOT_TEXT, suggestNames } from '../api/_lib/tools.mjs';
import { GUIDE } from '../api/_lib/guide.mjs';
import { KEY_SNAPSHOT, KEY_PLAN_ROUTINE, KEY_PLAN_CARDIO } from '../api/_lib/store.mjs';
import { kstDateStr } from '../api/_lib/kst.mjs';

function fakeStore(initial) {
  var m = new Map();
  if (initial) Object.keys(initial).forEach(function (k) { m.set(k, JSON.stringify(initial[k])); });
  return {
    map: m,
    async getJSON(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async setJSON(k, v) { m.set(k, JSON.stringify(v)); }
  };
}

function snapshot(overrides) {
  var s = {
    schemaVersion: 1,
    uploadedAt: '2026-09-27T01:00:00.000Z', // 10:00 KST
    todayKst: '2026-09-27',
    appVersion: 'health-app-v70',
    profile: { age: 34, heightCm: 175, weightKg: 72.4 },
    equipment: ['덤벨', '바벨', '케이블'],
    workouts: [
      {
        date: '2026-09-20', session: 'pull', sessionName: 'PULL', durationMin: null, rpe: null, condition: null,
        exercises: [{ name: '어시스트 풀업', assist: true, sets: [{ weight: 30, reps: 8, warmup: false }, { weight: null, reps: 5, warmup: false }] }]
      },
      {
        date: '2026-09-26', session: 'push', sessionName: 'PUSH', durationMin: 65, rpe: 8, condition: 4,
        exercises: [
          { name: '벤치프레스', assist: false, sets: [{ weight: 40, reps: 10, warmup: true }, { weight: 60, reps: 8, warmup: false }, { weight: 60, reps: 8, warmup: false }] },
          { name: '푸시업', assist: false, sets: [{ weight: null, reps: 10, warmup: false }] }
        ]
      }
    ],
    olderLastPerformed: [{ name: '딥스', date: '2026-06-01', assist: false, sets: [{ weight: null, reps: 12, warmup: false }] }],
    cardio: [{ date: '2026-09-25', mode: 'walk', totalSec: 1800, rpe: 6, segments: [
      { type: 'warmup', sec: 300, speed: 5, incline: 0 },
      { type: 'walk', sec: 600, speed: 5.5, incline: 10 },
      { type: 'walk', sec: 600, speed: 5.5, incline: 10 },
      { type: 'cooldown', sec: 300, speed: 4, incline: 0 }
    ] }],
    body: [{ date: '2026-08-01', weightKg: 73.1, bodyFatPct: null }, { date: '2026-09-26', weightKg: 72.4, bodyFatPct: 18.2 }],
    catalog: {
      push: ['벤치프레스', '인클라인 덤벨 프레스', '덤벨 숄더 프레스', '푸시업', '케이블 플라이'],
      pull: ['어시스트 풀업', '랫풀다운', '시티드 케이블 로우'],
      legs: ['스쿼트', '레그 프레스'],
      upper: ['벤치프레스', '랫풀다운'],
      free: ['벤치프레스', '인클라인 덤벨 프레스', '덤벨 숄더 프레스', '푸시업', '케이블 플라이', '어시스트 풀업', '랫풀다운', '시티드 케이블 로우', '스쿼트', '레그 프레스']
    }
  };
  return Object.assign(s, overrides || {});
}

function at(iso) { return function () { return new Date(iso); }; }
function text(r) { return r.content[0].text; }

var NOW = '2026-09-27T03:00:00.000Z'; // 12:00 KST, 2h after upload

function routineInput(overrides) {
  return Object.assign({
    session: 'push', title: '가슴 위주', note: '',
    exercises: [
      { name: '벤치프레스', sets: [{ weight: 40, reps: 10, warmup: true, restSec: 60 }, { weight: 62.5, reps: '6-8', restSec: 150 }] },
      { name: '푸시업', note: '마지막', sets: [{ weight: null, reps: 12 }] }
    ]
  }, overrides || {});
}

// ---------- get_training_context ----------

test('컨텍스트 — 스냅샷이 없으면 안내 한 줄만', async () => {
  var t = createTools({ store: fakeStore(), now: at(NOW) });
  var r = await t.getTrainingContext({});
  assert.equal(text(r), NO_SNAPSHOT_TEXT);
  assert.equal(NO_SNAPSHOT_TEXT, '헬스앱을 한 번 열면 기록이 올라와요.');
  assert.ok(!r.isError);
});

test('컨텍스트 — 절 순서: 올린 시각 → 지침 → 사용자 → 웨이트 → 오래된 종목 → 유산소 → 체중 → 종목 목록', async () => {
  var t = createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snapshot() }), now: at(NOW) });
  var s = text(await t.getTrainingContext({}));
  var marks = ['올린 시각: 2026-09-27 10:00 (KST) · 2시간 전', GUIDE, '## 사용자 정보', '## 웨이트 기록', '## 8주 넘게 안 한 종목', '## 유산소 기록', '## 체중 기록', '## 종목 목록'];
  var last = -1;
  marks.forEach(function (m) {
    var i = s.indexOf(m);
    assert.ok(i > last, '순서 어긋남: ' + m.slice(0, 20));
    last = i;
  });
  assert.ok(s.startsWith('올린 시각:'), '신선하면 첫 줄은 올린 시각');
});

test('컨텍스트 — 사용자 정보는 나이·키·체중·보유 장비만', async () => {
  var t = createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snapshot() }), now: at(NOW) });
  var s = text(await t.getTrainingContext({}));
  var block = s.slice(s.indexOf('## 사용자 정보'), s.indexOf('## 웨이트 기록')).trim().split('\n');
  assert.deepEqual(block, ['## 사용자 정보', '- 나이: 34세', '- 키: 175cm', '- 체중: 72.4kg', '- 보유 장비: 덤벨, 바벨, 케이블']);
});

test('컨텍스트 — 세션 머리줄·세트 표기·최신순', async () => {
  var t = createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snapshot() }), now: at(NOW) });
  var s = text(await t.getTrainingContext({}));
  assert.ok(s.includes('### 2026-09-26 (토) PUSH · 65분 · 세션 RPE 8 · 컨디션 4\n- 벤치프레스: 워밍업 40kg×10, 60kg×8, 60kg×8\n- 푸시업: 맨몸×10'));
  assert.ok(s.includes('### 2026-09-20 (일) PULL\n- 어시스트 풀업: 보조 30kg×8, 맨몸×5'), '값 없는 조각은 생략');
  assert.ok(s.indexOf('### 2026-09-26') < s.indexOf('### 2026-09-20'), '최신순');
  assert.ok(s.includes('- 딥스 (2026-06-01): 맨몸×12'));
  assert.ok(s.includes('- 2026-09-25 (금) 경사 걷기 · 총 30분 · RPE 6 · 구간: 워밍업 5분 5km/h 0% → 걷기 10분 5.5km/h 10% ×2 → 쿨다운 5분 4km/h 0%'));
  assert.ok(s.indexOf('- 2026-09-26: 72.4kg · 체지방 18.2%') < s.indexOf('- 2026-08-01: 73.1kg'));
});

test('컨텍스트 — 스냅샷에 섞인 계산값은 글에 나오지 않는다', async () => {
  var snap = snapshot({ recommendedWeights: { '벤치프레스': 987.6 }, oneRM: { '벤치프레스': 876.5 }, weakParts: ['종아리임의값'] });
  snap.workouts[1].exercises[0].e1rm = 765.4;
  var t = createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snap }), now: at(NOW) });
  var s = text(await t.getTrainingContext({}));
  ['987.6', '876.5', '765.4', '종아리임의값', '1RM', '추천 무게', '정체', '부족 부위', '목표 세트'].forEach(function (x) {
    assert.ok(!s.includes(x), '계산값이 글에 나옴: ' + x);
  });
});

test('컨텍스트 — 12시간 넘으면 첫 줄 경고, 12시간 이내면 없음', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var fresh = text(await createTools({ store: store, now: at('2026-09-27T13:00:00.000Z') }).getTrainingContext({}));
  assert.ok(fresh.startsWith('올린 시각:'));
  var stale = text(await createTools({ store: store, now: at('2026-09-27T13:00:01.000Z') }).getTrainingContext({}));
  var first = stale.split('\n')[0];
  assert.ok(first.startsWith('주의:') && first.includes('12시간'), first);
  assert.ok(stale.split('\n')[1].startsWith('올린 시각:'));
});

test('컨텍스트 — session 지정 시 그 세션 종목 목록만, 없으면 세션별 전부', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(NOW) });
  var one = text(await t.getTrainingContext({ session: 'pull' }));
  assert.ok(one.endsWith('## 종목 목록 (PULL)\n어시스트 풀업, 랫풀다운, 시티드 케이블 로우'));
  var all = text(await t.getTrainingContext({}));
  ['### PUSH', '### PULL', '### LEGS', '### UPPER', '### FREE'].forEach(function (h) { assert.ok(all.includes(h), h); });
  var bad = await t.getTrainingContext({ session: 'arms' });
  assert.equal(bad.isError, true);
});

// ---------- save_today_routine ----------

test('루틴 — 저장 모양: reps 문자열 정규화·기본값·id·KST 날짜', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(NOW), uuid: function () { return 'id-1'; } });
  var r = await t.saveTodayRoutine(routineInput());
  assert.ok(!r.isError, text(r));
  var saved = await store.getJSON(KEY_PLAN_ROUTINE);
  assert.deepEqual(saved, {
    id: 'id-1', createdAt: NOW, date: '2026-09-27', session: 'push', title: '가슴 위주', note: '',
    exercises: [
      { name: '벤치프레스', note: '', sets: [{ weight: 40, reps: '10', warmup: true, restSec: 60 }, { weight: 62.5, reps: '6-8', warmup: false, restSec: 150 }] },
      { name: '푸시업', note: '마지막', sets: [{ weight: null, reps: '12', warmup: false, restSec: null }] }
    ]
  });
});

test('루틴 — 기본 id는 crypto.randomUUID 형식', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  await createTools({ store: store, now: at(NOW) }).saveTodayRoutine(routineInput());
  assert.match((await store.getJSON(KEY_PLAN_ROUTINE)).id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('루틴 — 목록에 없는 이름이면 저장하지 않고 비슷한 이름 3개', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(NOW) });
  var input = routineInput();
  input.exercises[0].name = '인클라인 벤치 프레스';
  var r = await t.saveTodayRoutine(input);
  assert.equal(r.isError, true);
  assert.equal(await store.getJSON(KEY_PLAN_ROUTINE), null);
  var line = text(r).split('\n').find(function (l) { return l.startsWith('- 인클라인 벤치 프레스'); });
  assert.ok(line, text(r));
  var sug = line.split('비슷한 목록 이름: ')[1].split(', ');
  assert.equal(sug.length, 3);
  assert.equal(sug[0], '인클라인 덤벨 프레스');
  sug.forEach(function (n) { assert.ok(snapshot().catalog.push.includes(n)); });
});

test('루틴 — 세션 목록 기준으로 검사하고 free는 free 목록', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(NOW) });
  var pushWithPull = routineInput({ exercises: [{ name: '랫풀다운', sets: [{ weight: 50, reps: 10 }] }] });
  assert.equal((await t.saveTodayRoutine(pushWithPull)).isError, true);
  var free = routineInput({ session: 'free', exercises: [{ name: '랫풀다운', sets: [{ weight: 50, reps: 10 }] }, { name: '스쿼트', sets: [{ weight: 60, reps: 8 }] }] });
  assert.ok(!(await t.saveTodayRoutine(free)).isError);
});

test('루틴 — 스냅샷이 없으면 저장하지 않는다', async () => {
  var store = fakeStore();
  var r = await createTools({ store: store, now: at(NOW) }).saveTodayRoutine(routineInput());
  assert.equal(r.isError, true);
  assert.ok(text(r).includes('헬스앱'));
  assert.equal(await store.getJSON(KEY_PLAN_ROUTINE), null);
});

test('루틴 — 범위 밖 입력은 거부', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(NOW) });
  function withSet(set) { return routineInput({ exercises: [{ name: '벤치프레스', sets: [set] }] }); }
  var cases = [
    routineInput({ session: 'arms' }),
    routineInput({ title: '' }),
    routineInput({ exercises: [] }),
    routineInput({ exercises: Array.from({ length: 21 }, function () { return { name: '벤치프레스', sets: [{ weight: 60, reps: 8 }] }; }) }),
    routineInput({ exercises: [{ name: '벤치프레스', sets: Array.from({ length: 16 }, function () { return { weight: 60, reps: 8 }; }) }] }),
    routineInput({ exercises: [{ name: '벤치프레스', sets: [] }] }),
    withSet({ weight: 501, reps: 8 }),
    withSet({ weight: -1, reps: 8 }),
    withSet({ weight: 60, reps: 0 }),
    withSet({ weight: 60, reps: 101 }),
    withSet({ weight: 60, reps: 8.5 }),
    withSet({ weight: 60, reps: '10-8' }),
    withSet({ weight: 60, reps: '8' }),
    withSet({ weight: 60, reps: '8~10' }),
    withSet({ weight: 60, reps: 8, restSec: 601 }),
    withSet({ weight: 60, reps: 8, restSec: 30.5 }),
    withSet({ weight: 60, reps: 8, warmup: 'yes' })
  ];
  for (var i = 0; i < cases.length; i++) {
    var r = await t.saveTodayRoutine(cases[i]);
    assert.equal(r.isError, true, 'case ' + i + ' 통과됨');
  }
  assert.equal(await store.getJSON(KEY_PLAN_ROUTINE), null);
  assert.ok(!(await t.saveTodayRoutine(withSet({ weight: 500, reps: '1-100', restSec: 600 }))).isError, '경계값은 허용');
  assert.ok(!(await t.saveTodayRoutine(withSet({ weight: 0, reps: 100, restSec: 0 }))).isError, '경계값은 허용');
});

test('루틴 — 같은 종류는 덮어쓴다', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var n = 0;
  var t = createTools({ store: store, now: at(NOW), uuid: function () { return 'id-' + (++n); } });
  await t.saveTodayRoutine(routineInput({ title: '첫 번째' }));
  await t.saveTodayRoutine(routineInput({ title: '두 번째' }));
  var saved = await store.getJSON(KEY_PLAN_ROUTINE);
  assert.equal(saved.id, 'id-2');
  assert.equal(saved.title, '두 번째');
});

// ---------- KST date boundary ----------

test('KST 날짜 경계 — UTC 14:59는 그날, 15:00은 다음 날', async () => {
  assert.equal(kstDateStr(new Date('2026-09-26T14:59:59.999Z')), '2026-09-26');
  assert.equal(kstDateStr(new Date('2026-09-26T15:00:00.000Z')), '2026-09-27');
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  await createTools({ store: store, now: at('2026-09-26T14:59:00.000Z') }).saveTodayRoutine(routineInput());
  assert.equal((await store.getJSON(KEY_PLAN_ROUTINE)).date, '2026-09-26');
  await createTools({ store: store, now: at('2026-09-26T15:00:00.000Z') }).saveTodayCardio({ mode: 'walk', title: '걷기', segments: [{ type: 'walk', sec: 600, speed: 5, incline: 8 }] });
  assert.equal((await store.getJSON(KEY_PLAN_CARDIO)).date, '2026-09-27');
});

// ---------- save_today_cardio ----------

test('유산소 — 저장 모양, walk는 경사 유지·없으면 0, interval은 경사 0', async () => {
  var store = fakeStore();
  var t = createTools({ store: store, now: at(NOW), uuid: function () { return 'c-1'; } });
  var r = await t.saveTodayCardio({ mode: 'walk', title: '경사 걷기 30분', segments: [{ type: 'warmup', sec: 300, speed: 5 }, { type: 'walk', sec: 1500, speed: 5.5, incline: 12 }] });
  assert.ok(!r.isError, text(r));
  assert.deepEqual(await store.getJSON(KEY_PLAN_CARDIO), {
    id: 'c-1', createdAt: NOW, date: '2026-09-27', mode: 'walk', title: '경사 걷기 30분', note: '',
    segments: [{ type: 'warmup', sec: 300, speed: 5, incline: 0 }, { type: 'walk', sec: 1500, speed: 5.5, incline: 12 }]
  });
  await t.saveTodayCardio({ mode: 'interval', title: '인터벌', note: 'n', segments: [{ type: 'run', sec: 60, speed: 10, incline: 5 }, { type: 'walk', sec: 90, speed: 5, incline: 3 }] });
  var saved = await store.getJSON(KEY_PLAN_CARDIO);
  assert.equal(saved.mode, 'interval');
  assert.deepEqual(saved.segments.map(function (s) { return s.incline; }), [0, 0]);
});

test('유산소 — 범위 밖 입력은 거부', async () => {
  var store = fakeStore();
  var t = createTools({ store: store, now: at(NOW) });
  function seg(s) { return { mode: 'walk', title: 't', segments: [s] }; }
  var cases = [
    { mode: 'run', title: 't', segments: [{ type: 'walk', sec: 60, speed: 5 }] },
    { mode: 'walk', title: '', segments: [{ type: 'walk', sec: 60, speed: 5 }] },
    { mode: 'walk', title: 't', segments: [] },
    { mode: 'walk', title: 't', segments: Array.from({ length: 61 }, function () { return { type: 'walk', sec: 60, speed: 5 }; }) },
    seg({ type: 'sprint', sec: 60, speed: 5 }),
    seg({ type: 'walk', sec: 9, speed: 5 }),
    seg({ type: 'walk', sec: 3601, speed: 5 }),
    seg({ type: 'walk', sec: 60.5, speed: 5 }),
    seg({ type: 'walk', sec: 60, speed: 20.1 }),
    seg({ type: 'walk', sec: 60, speed: -1 }),
    seg({ type: 'walk', sec: 60, speed: 5, incline: 12.5 }),
    seg({ type: 'walk', sec: 60, speed: 5, incline: -1 })
  ];
  for (var i = 0; i < cases.length; i++) {
    assert.equal((await t.saveTodayCardio(cases[i])).isError, true, 'case ' + i + ' 통과됨');
  }
  assert.equal(await store.getJSON(KEY_PLAN_CARDIO), null);
  assert.ok(!(await t.saveTodayCardio(seg({ type: 'cooldown', sec: 3600, speed: 20, incline: 12 }))).isError);
  assert.ok(!(await t.saveTodayCardio(seg({ type: 'warmup', sec: 10, speed: 0, incline: 0 }))).isError);
});

// ---------- get_saved_plans ----------

test('저장된 플랜 — 오늘 것만 보이고, 오늘이 아니면 숨긴다', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var day1 = createTools({ store: store, now: at('2026-09-27T03:00:00.000Z'), uuid: function () { return 'r-1'; } });
  await day1.saveTodayRoutine(routineInput());
  await day1.saveTodayCardio({ mode: 'walk', title: '걷기', segments: [{ type: 'walk', sec: 600, speed: 5, incline: 8 }] });
  var same = text(await day1.getSavedPlans());
  assert.ok(same.includes('"id": "r-1"'));
  assert.ok(same.includes('"title": "걷기"'));
  var today = await day1.getTodayPlans();
  assert.equal(today.routine.id, 'r-1');
  var day2 = createTools({ store: store, now: at('2026-09-27T15:00:00.000Z') });
  var next = text(await day2.getSavedPlans());
  assert.ok(next.includes('오늘 저장된 루틴이 없어요.'));
  assert.ok(next.includes('오늘 저장된 유산소 플랜이 없어요.'));
  assert.ok(!next.includes('r-1'));
  assert.deepEqual(await day2.getTodayPlans(), { routine: null, cardio: null });
});

test('비슷한 이름 — 문자 겹침이 없으면 제안하지 않는다', () => {
  assert.deepEqual(suggestNames('xyz', ['벤치프레스']), []);
});
