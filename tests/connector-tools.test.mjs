// Zero-dependency tests for api/_lib/tools.mjs (MCP tool logic). Run: node --test tests/connector-tools.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTools, NO_SNAPSHOT_TEXT, suggestNames, GROUPS, PLAN_TYPES, TYPE_CATALOG, TYPE_LABEL, resolveWeekStart, doneSessions } from '../api/_lib/tools.mjs';
import { GUIDE } from '../api/_lib/guide.mjs';
import { KEY_SNAPSHOT, KEY_PLAN_CARDIO, weekKey } from '../api/_lib/store.mjs';
import { kstDateStr, kstWeekStart, kstAddDays } from '../api/_lib/kst.mjs';
import { loadApp } from './_harness.mjs';

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
      legs: ['스쿼트', '레그 프레스', '루마니안 데드리프트'],
      upper: ['벤치프레스', '랫풀다운'],
      free: ['벤치프레스', '인클라인 덤벨 프레스', '덤벨 숄더 프레스', '푸시업', '케이블 플라이', '어시스트 풀업', '랫풀다운', '시티드 케이블 로우', '스쿼트', '레그 프레스', '루마니안 데드리프트']
    }
  };
  return Object.assign(s, overrides || {});
}

// A plan-session workout for week weekStart (the app records planWeek/planLabel/planType on these).
function planWorkout(date, weekStart, label, type) {
  return {
    date: date, session: 'upper', sessionName: label, durationMin: 60, rpe: 7, condition: 3,
    planWeek: weekStart, planLabel: label, planType: type,
    exercises: [{ name: '벤치프레스', assist: false, sets: [{ weight: 60, reps: 8, warmup: false }] }]
  };
}

function at(iso) { return function () { return new Date(iso); }; }
function text(r) { return r.content[0].text; }
function seq(prefix) { var n = 0; return function () { return prefix + (++n); }; }

var NOW = '2026-09-27T03:00:00.000Z';     // Sunday 12:00 KST, 2h after upload
var WED = '2026-09-23T03:00:00.000Z';     // Wednesday 12:00 KST
var THIS_MON = '2026-09-21';
var NEXT_MON = '2026-09-28';
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function session(label, type, exercises, extra) {
  return Object.assign({ label: label, type: type, exercises: exercises }, extra || {});
}
function ex(name, sets, extra) { return Object.assign({ name: name, sets: sets }, extra || {}); }

function upperA() { return session('상체 A', 'upper', [ex('벤치프레스', [{ weight: 40, reps: 10, warmup: true, restSec: 60 }, { weight: 62.5, reps: '6-8', restSec: 150 }]), ex('랫풀다운', [{ weight: 50, reps: 10 }], { note: '천천히' })]); }
function lowerA() { return session('하체 A', 'lower', [ex('스쿼트', [{ weight: 60, reps: 8 }])]); }
function upperB() { return session('상체 B', 'upper', [ex('랫풀다운', [{ weight: 55, reps: 8 }])]); }
function lowerB() { return session('하체 B', 'lower', [ex('레그 프레스', [{ weight: 100, reps: 12 }])]); }

function weekInput(overrides) {
  return Object.assign({ days: 4, targets: { chest: 12, lats: 10 }, sessions: [upperA(), lowerA(), upperB(), lowerB()] }, overrides || {});
}

// ---------- KST weeks ----------

test('kstWeekStart — 일요일은 6일 전 월요일, 월요일은 그날', () => {
  assert.equal(kstWeekStart('2026-09-27'), '2026-09-21');
  assert.equal(kstWeekStart('2026-09-28'), '2026-09-28');
  assert.equal(kstWeekStart('2026-10-04'), '2026-09-28');
});

test('kstWeekStart — 연·월 경계 (2027-01-01 금 → 2026-12-28)', () => {
  assert.equal(kstWeekStart('2027-01-01'), '2026-12-28');
  assert.equal(kstAddDays('2026-12-28', 7), '2027-01-04');
  assert.equal(kstAddDays('2026-03-01', -1), '2026-02-28');
});

test('resolveWeekStart — save 기본은 일요일만 다음 주, update 기본은 이번 주, week 지정이 우선', () => {
  var sun = new Date(NOW), wed = new Date(WED);
  assert.equal(resolveWeekStart(sun, undefined, 'save'), NEXT_MON);
  assert.equal(resolveWeekStart(sun, undefined, 'update'), THIS_MON);
  assert.equal(resolveWeekStart(sun, 'this', 'save'), THIS_MON);
  assert.equal(resolveWeekStart(wed, undefined, 'save'), THIS_MON);
  assert.equal(resolveWeekStart(wed, 'next', 'update'), NEXT_MON);
});

test('doneSessions — 그 주 planWeek만, 날짜는 가장 이른 것', () => {
  var snap = snapshot({ workouts: [
    planWorkout('2026-09-24', THIS_MON, '상체 A', 'upper'),
    planWorkout('2026-09-22', THIS_MON, '상체 A', 'upper'),
    planWorkout('2026-09-18', '2026-09-14', '하체 A', 'lower'),
    { date: '2026-09-23', session: 'push', sessionName: 'PUSH', durationMin: null, rpe: null, condition: null, exercises: [] }
  ] });
  assert.deepEqual(doneSessions(snap, THIS_MON), { '상체 A': '2026-09-22' });
  assert.deepEqual(doneSessions(null, THIS_MON), {});
});

// ---------- GROUPS ↔ app ----------

test('GROUPS — 앱 BODY_PART_GROUPS와 키·한글·순서가 같다', () => {
  var app = loadApp();
  var appGroups = app.BODY_PART_GROUPS;
  assert.ok(appGroups, 'BODY_PART_GROUPS를 앱에서 못 찾음');
  assert.deepEqual(GROUPS.map(function (g) { return g[0]; }), Object.keys(appGroups));
  assert.deepEqual(GROUPS.map(function (g) { return g[1]; }), Object.keys(appGroups).map(function (k) { return appGroups[k].kr; }));
  assert.equal(GROUPS.length, 14);
});

test('type 표 — PLAN_TYPES·TYPE_CATALOG·TYPE_LABEL', () => {
  assert.deepEqual(PLAN_TYPES, ['full', 'upper', 'lower', 'push', 'pull']);
  assert.deepEqual(TYPE_CATALOG, { full: 'free', upper: 'upper', lower: 'legs', push: 'push', pull: 'pull' });
  assert.deepEqual(TYPE_LABEL, { full: '전신', upper: '상체', lower: '하체', push: 'PUSH', pull: 'PULL' });
});

// ---------- get_training_context ----------

test('컨텍스트 — 스냅샷이 없으면 안내 한 줄만', async () => {
  var t = createTools({ store: fakeStore(), now: at(NOW) });
  var r = await t.getTrainingContext({});
  assert.equal(text(r), NO_SNAPSHOT_TEXT);
  assert.equal(NO_SNAPSHOT_TEXT, '헬스앱을 한 번 열면 기록이 올라와요.');
  assert.ok(!r.isError);
});

function planFixture(overrides) {
  return Object.assign({
    id: 'w-1', createdAt: WED, updatedAt: WED, weekStart: THIS_MON, days: 4, deload: false, note: '',
    targets: { lats: 10, chest: 12 },
    sessions: [
      { label: '상체 A', type: 'upper', note: '', updatedAt: WED, exercises: [{ name: '벤치프레스', note: '', sets: [{ weight: 40, reps: '10', warmup: true, restSec: 60 }, { weight: 60, reps: '6-8', warmup: false, restSec: null }] }] },
      { label: '하체 A', type: 'lower', note: '무릎 조심', updatedAt: WED, exercises: [{ name: '스쿼트', note: '', sets: [{ weight: null, reps: '15', warmup: false, restSec: null }] }] }
    ]
  }, overrides || {});
}

function fullSnapshot() {
  var snap = snapshot();
  snap.workouts.push(planWorkout('2026-09-22', THIS_MON, '상체 A', 'upper'));
  snap.weekSets = { weekStart: THIS_MON, byGroup: { quads: 3.5, chest: 6, lats: 0 } };
  snap.muscleWeights = { '벤치프레스': { triceps: 0.5, chest: 1, shoulders_front: 0.5 }, '스쿼트': { quads: 1, glutes: 0.5 } };
  return snap;
}

test('컨텍스트 — 절 순서 1~14', async () => {
  var store = fakeStore({
    [KEY_SNAPSHOT]: fullSnapshot(),
    [weekKey(THIS_MON)]: planFixture(),
    [weekKey(NEXT_MON)]: planFixture({ id: 'w-2', weekStart: NEXT_MON, deload: true, note: '가볍게' })
  });
  var s = text(await createTools({ store: store, now: at('2026-09-27T13:30:00.000Z') }).getTrainingContext({}));
  var marks = [
    '주의: 기록이 올라온 지 12시간이 넘었어요.',
    '올린 시각: 2026-09-27 10:00 (KST) · 12시간 전',
    '오늘: 2026-09-27 (일) · 이번 주 2026-09-21 ~ 2026-09-27',
    GUIDE, '## 사용자 정보', '## 이번 주 계획', '## 다음 주 계획', '## 이번 주 부위별 실제 세트',
    '## 웨이트 기록 (최근 8주, 최신순)', '## 8주 넘게 안 한 종목', '## 유산소 기록', '## 체중 기록', '## 종목 목록', '## 종목별 부위 세트 무게'
  ];
  var last = -1;
  marks.forEach(function (m) {
    var i = s.indexOf(m);
    assert.ok(i > last, '순서 어긋남: ' + m.slice(0, 30));
    last = i;
  });
  assert.ok(s.startsWith('주의:'));
});

test('컨텍스트 — 신선하면 첫 줄은 올린 시각, 둘째 줄은 오늘·이번 주', async () => {
  var t = createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snapshot() }), now: at(NOW) });
  var lines = text(await t.getTrainingContext({})).split('\n');
  assert.equal(lines[0], '올린 시각: 2026-09-27 10:00 (KST) · 2시간 전');
  assert.equal(lines[1], '오늘: 2026-09-27 (일) · 이번 주 2026-09-21 ~ 2026-09-27');
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

test('컨텍스트 — 사용자 정보는 나이·키·체중·보유 장비만', async () => {
  var t = createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snapshot() }), now: at(NOW) });
  var s = text(await t.getTrainingContext({}));
  var block = s.slice(s.indexOf('## 사용자 정보'), s.indexOf('## 이번 주 계획')).trim().split('\n');
  assert.deepEqual(block, ['## 사용자 정보', '- 나이: 34세', '- 키: 175cm', '- 체중: 72.4kg', '- 보유 장비: 덤벨, 바벨, 케이블']);
});

test('컨텍스트 — 이번 주 계획: 요일 수·목표 세트·끝남/남음·종목 줄', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: fullSnapshot(), [weekKey(THIS_MON)]: planFixture({ note: '어깨 아끼기' }) });
  var s = text(await createTools({ store: store, now: at(NOW) }).getTrainingContext({}));
  var block = s.slice(s.indexOf('## 이번 주 계획'), s.indexOf('## 이번 주 부위별 실제 세트')).trim().split('\n');
  assert.deepEqual(block, [
    '## 이번 주 계획',
    '4일',
    '어깨 아끼기',
    '### 목표 세트',
    '가슴(chest) 12 · 광배(lats) 10',
    '### 상체 A (upper) — 끝남 09-22(화)',
    '- 벤치프레스: 워밍업 40kg×10, 60kg×6-8',
    '### 하체 A (lower) — 남음',
    '무릎 조심',
    '- 스쿼트: 맨몸×15'
  ]);
  assert.ok(!s.includes('## 다음 주 계획'), '다음 주 계획이 없으면 절도 없다');
});

test('컨텍스트 — 계획이 없으면 「아직 없어요.」, 다음 주 계획은 디로드 표시', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot(), [weekKey(NEXT_MON)]: planFixture({ weekStart: NEXT_MON, days: 3, deload: true }) });
  var s = text(await createTools({ store: store, now: at(NOW) }).getTrainingContext({}));
  assert.ok(s.includes('## 이번 주 계획\n아직 없어요.\n'));
  assert.ok(s.includes('## 다음 주 계획\n3일 · 디로드\n### 목표 세트\n'));
  assert.ok(s.includes('### 상체 A (upper) — 남음'), '다음 주 세션은 남음');
});

test('컨텍스트 — 이번 주 실제 세트: 0 빼고 GROUPS 순서, 주가 다르면 안내 문구', async () => {
  var s = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: fullSnapshot() }), now: at(NOW) }).getTrainingContext({}));
  assert.ok(s.includes('## 이번 주 부위별 실제 세트\n가슴(chest) 6 · 대퇴사두(quads) 3.5\n'));
  var old = fullSnapshot();
  old.weekSets.weekStart = '2026-09-14';
  var s2 = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: old }), now: at(NOW) }).getTrainingContext({}));
  assert.ok(s2.includes('## 이번 주 부위별 실제 세트\n이번 주 기록이 아직 올라오지 않았어요.\n'));
  var none = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snapshot() }), now: at(NOW) }).getTrainingContext({}));
  assert.ok(none.includes('## 이번 주 부위별 실제 세트\n이번 주 기록이 아직 올라오지 않았어요.\n'), 'weekSets 없는 옛 스냅샷');
  var zero = fullSnapshot();
  zero.weekSets.byGroup = { chest: 0 };
  var s3 = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: zero }), now: at(NOW) }).getTrainingContext({}));
  assert.ok(s3.includes('## 이번 주 부위별 실제 세트\n아직 없어요.\n'));
});

test('컨텍스트 — 세션 머리줄·세트 표기·최신순, 계획 세션은 머리줄에 label', async () => {
  var s = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: fullSnapshot() }), now: at(NOW) }).getTrainingContext({}));
  assert.ok(s.includes('### 2026-09-26 (토) PUSH · 65분 · 세션 RPE 8 · 컨디션 4\n- 벤치프레스: 워밍업 40kg×10, 60kg×8, 60kg×8\n- 푸시업: 맨몸×10'));
  assert.ok(s.includes('### 2026-09-20 (일) PULL\n- 어시스트 풀업: 보조 30kg×8, 맨몸×5'), '값 없는 조각은 생략');
  assert.ok(s.includes('### 2026-09-22 (화) 상체 A · 60분 · 세션 RPE 7 · 컨디션 3 · 계획 세션 상체 A\n'));
  assert.ok(s.indexOf('### 2026-09-26') < s.indexOf('### 2026-09-22') && s.indexOf('### 2026-09-22') < s.indexOf('### 2026-09-20'), '최신순');
  assert.ok(s.includes('- 딥스 (2026-06-01): 맨몸×12'));
  assert.ok(s.includes('- 2026-09-25 (금) 경사 걷기 · 총 30분 · RPE 6 · 구간: 워밍업 5분 5km/h 0% → 걷기 10분 5.5km/h 10% ×2 → 쿨다운 5분 4km/h 0%'));
  assert.ok(s.indexOf('- 2026-09-26: 72.4kg · 체지방 18.2%') < s.indexOf('- 2026-08-01: 73.1kg'));
});

test('컨텍스트 — drop 세트는 「드롭 」을 앞에 붙인다 (웨이트 기록·8주 넘게 안 한 종목)', async () => {
  var snap = snapshot();
  snap.workouts[1].exercises[0].sets.push({ weight: 40, reps: 12, warmup: false, drop: true });
  snap.olderLastPerformed[0].sets.push({ weight: null, reps: 6, warmup: false, drop: true });
  var s = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snap }), now: at(NOW) }).getTrainingContext({}));
  assert.ok(s.includes('- 벤치프레스: 워밍업 40kg×10, 60kg×8, 60kg×8, 드롭 40kg×12\n'));
  assert.ok(s.includes('- 딥스 (2026-06-01): 맨몸×12, 드롭 맨몸×6'));
});

test('컨텍스트 — 스냅샷에 섞인 계산값은 글에 나오지 않는다', async () => {
  var snap = snapshot({ recommendedWeights: { '벤치프레스': 987.6 }, oneRM: { '벤치프레스': 876.5 }, weakParts: ['종아리임의값'] });
  snap.workouts[1].exercises[0].e1rm = 765.4;
  var t = createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snap }), now: at(NOW) });
  var s = text(await t.getTrainingContext({}));
  ['987.6', '876.5', '765.4', '종아리임의값', '1RM', '추천 무게', '정체', '부족 부위'].forEach(function (x) {
    assert.ok(!s.includes(x), '계산값이 글에 나옴: ' + x);
  });
});

test('컨텍스트 — type 지정 시 그 type 종목 목록만, 없으면 type별 전부', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(NOW) });
  var one = text(await t.getTrainingContext({ type: 'lower' }));
  assert.ok(one.includes('## 종목 목록 (lower)\n스쿼트, 레그 프레스, 루마니안 데드리프트\n'));
  assert.ok(!one.includes('### pull'));
  var all = text(await t.getTrainingContext({}));
  var cat = all.slice(all.indexOf('## 종목 목록'), all.indexOf('## 종목별 부위 세트 무게')).trim().split('\n');
  assert.deepEqual(cat, [
    '## 종목 목록',
    '### full (전체)', snapshot().catalog.free.join(', '),
    '### upper', '벤치프레스, 랫풀다운',
    '### lower', '스쿼트, 레그 프레스, 루마니안 데드리프트',
    '### push', snapshot().catalog.push.join(', '),
    '### pull', '어시스트 풀업, 랫풀다운, 시티드 케이블 로우'
  ]);
  var bad = await t.getTrainingContext({ type: 'legs' });
  assert.equal(bad.isError, true);
});

test('컨텍스트 — 종목별 부위 세트 무게: free 순서·GROUPS 순서, 없으면 안내 문구', async () => {
  var s = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: fullSnapshot() }), now: at(NOW) }).getTrainingContext({}));
  var block = s.slice(s.indexOf('## 종목별 부위 세트 무게')).split('\n');
  assert.equal(block[1], '- 벤치프레스: 가슴(chest) 1 · 어깨 전면(shoulders_front) 0.5 · 삼두(triceps) 0.5');
  assert.equal(block.length, 1 + snapshot().catalog.free.length);
  assert.ok(block.includes('- 스쿼트: 대퇴사두(quads) 1 · 둔근(glutes) 0.5'));
  var old = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snapshot() }), now: at(NOW) }).getTrainingContext({}));
  assert.ok(old.endsWith('## 종목별 부위 세트 무게\n헬스앱을 새 버전으로 열면 올라와요.'));
});

test('컨텍스트 — 부위 세트 무게: free 순서 뒤에 muscleWeights에만 있는 이름을 가나다순, 빈 객체는 부위 정보 없음', async () => {
  var snap = fullSnapshot();
  snap.muscleWeights['하체 머신'] = {};
  snap.muscleWeights['덤벨 컬'] = { biceps: 1 };
  snap.muscleWeights['가벼운 스트레칭'] = {};
  var s = text(await createTools({ store: fakeStore({ [KEY_SNAPSHOT]: snap }), now: at(NOW) }).getTrainingContext({}));
  var block = s.slice(s.indexOf('## 종목별 부위 세트 무게')).split('\n').slice(1);
  var free = snapshot().catalog.free;
  assert.deepEqual(block.slice(0, free.length).map(function (l) { return l.split(':')[0]; }), free.map(function (n) { return '- ' + n; }));
  assert.deepEqual(block.slice(free.length), ['- 가벼운 스트레칭: (부위 정보 없음)', '- 덤벨 컬: 이두(biceps) 1', '- 하체 머신: (부위 정보 없음)']);
});

// ---------- save_week_plan ----------

test('주간 저장 — 월요일 키에 계약 모양으로 저장, 세션마다 updatedAt', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(WED), uuid: function () { return 'w-1'; } });
  var r = await t.saveWeekPlan(weekInput({ note: '첫 주', sessions: [upperA(), Object.assign(lowerA(), { label: '  하체 A ', note: '무릎' })] }));
  assert.ok(!r.isError, text(r));
  assert.equal(text(r), '2026-09-21 주 계획을 저장했어요. 4일 · 세션 2개 · id w-1');
  assert.deepEqual(await store.getJSON(weekKey(THIS_MON)), {
    id: 'w-1', createdAt: WED, updatedAt: WED, weekStart: THIS_MON, days: 4, deload: false, note: '첫 주',
    targets: { chest: 12, lats: 10 },
    sessions: [
      { label: '상체 A', type: 'upper', note: '', updatedAt: WED, exercises: [
        { name: '벤치프레스', note: '', sets: [{ weight: 40, reps: '10', warmup: true, restSec: 60 }, { weight: 62.5, reps: '6-8', warmup: false, restSec: 150 }] },
        { name: '랫풀다운', note: '천천히', sets: [{ weight: 50, reps: '10', warmup: false, restSec: null }] }
      ] },
      { label: '하체 A', type: 'lower', note: '무릎', updatedAt: WED, exercises: [
        { name: '스쿼트', note: '', sets: [{ weight: 60, reps: '8', warmup: false, restSec: null }] }
      ] }
    ]
  });
  assert.equal(weekKey(THIS_MON), 'fitness/week/2026-09-21.json');
});

test('주간 저장 — 기본 id는 crypto.randomUUID 형식, 새로 저장하면 새 id', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(WED) });
  await t.saveWeekPlan(weekInput());
  var first = (await store.getJSON(weekKey(THIS_MON))).id;
  assert.match(first, UUID_RE);
  await t.saveWeekPlan(weekInput({ days: 5 }));
  var second = await store.getJSON(weekKey(THIS_MON));
  assert.match(second.id, UUID_RE);
  assert.notEqual(second.id, first);
  assert.equal(second.days, 5);
});

test('주간 저장 — 일요일(KST)은 다음 주 키, week:this면 이번 주 키', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(NOW), uuid: seq('w-') });
  var r = await t.saveWeekPlan(weekInput());
  assert.ok(text(r).startsWith('2026-09-28 주 계획을 저장했어요.'), text(r));
  assert.equal((await store.getJSON(weekKey(NEXT_MON))).weekStart, NEXT_MON);
  assert.equal(await store.getJSON(weekKey(THIS_MON)), null);
  await t.saveWeekPlan(weekInput({ week: 'this' }));
  assert.equal((await store.getJSON(weekKey(THIS_MON))).id, 'w-2');
  await createTools({ store: store, now: at(WED), uuid: seq('x-') }).saveWeekPlan(weekInput({ week: 'next' }));
  assert.equal((await store.getJSON(weekKey(NEXT_MON))).id, 'x-1');
});

test('주간 저장 — 한국 자정 경계: 일요일 UTC 14:59는 일요일(다음 주), 15:00은 월요일(그 주)', async () => {
  assert.equal(kstDateStr(new Date('2026-09-27T14:59:59.999Z')), '2026-09-27');
  assert.equal(kstDateStr(new Date('2026-09-27T15:00:00.000Z')), '2026-09-28');
  // Saturday 14:59 UTC = Saturday 23:59 KST → this week; 15:00 UTC = Sunday 00:00 KST → next week.
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  await createTools({ store: store, now: at('2026-09-26T14:59:00.000Z'), uuid: function () { return 'sat'; } }).saveWeekPlan(weekInput());
  assert.equal((await store.getJSON(weekKey(THIS_MON))).id, 'sat');
  await createTools({ store: store, now: at('2026-09-26T15:00:00.000Z'), uuid: function () { return 'sun'; } }).saveWeekPlan(weekInput());
  assert.equal((await store.getJSON(weekKey(NEXT_MON))).id, 'sun');
  // Sunday 15:00 UTC = Monday 00:00 KST → that Monday's week (not the one after).
  await createTools({ store: store, now: at('2026-09-27T15:00:00.000Z'), uuid: function () { return 'mon'; } }).saveWeekPlan(weekInput());
  assert.equal((await store.getJSON(weekKey(NEXT_MON))).id, 'mon');
  assert.equal(await store.getJSON(weekKey('2026-10-05')), null);
});

test('주간 저장 — 끝난 세션은 원래 값 그대로 앞에 남기고, 입력에 같은 label이면 거부', async () => {
  var snap = snapshot();
  snap.workouts.push(planWorkout('2026-09-22', THIS_MON, '상체 A', 'upper'));
  var store = fakeStore({ [KEY_SNAPSHOT]: snap, [weekKey(THIS_MON)]: planFixture() });
  var t = createTools({ store: store, now: at(WED), uuid: function () { return 'w-new'; } });
  var clash = await t.saveWeekPlan(weekInput({ sessions: [upperA(), lowerB()] }));
  assert.equal(clash.isError, true);
  assert.equal(text(clash), '이미 끝난 세션이라 바꿀 수 없어요: 상체 A');
  assert.equal((await store.getJSON(weekKey(THIS_MON))).id, 'w-1', '거부되면 그대로');

  var r = await t.saveWeekPlan(weekInput({ sessions: [lowerA(), upperB()] }));
  assert.ok(!r.isError, text(r));
  assert.equal(text(r), '2026-09-21 주 계획을 저장했어요. 4일 · 세션 3개 · id w-new 끝난 세션 1개는 그대로 뒀어요.');
  var saved = await store.getJSON(weekKey(THIS_MON));
  assert.equal(saved.id, 'w-new');
  assert.deepEqual(saved.sessions[0], planFixture().sessions[0], '끝난 세션은 원래 값 그대로');
  assert.deepEqual(saved.sessions.map(function (s) { return s.label; }), ['상체 A', '하체 A', '상체 B']);
  assert.equal(saved.sessions[1].updatedAt, WED);
});

test('주간 저장 — 끝난 세션을 합쳐 7개를 넘으면 거부', async () => {
  var snap = snapshot();
  snap.workouts.push(planWorkout('2026-09-22', THIS_MON, '상체 A', 'upper'));
  var store = fakeStore({ [KEY_SNAPSHOT]: snap, [weekKey(THIS_MON)]: planFixture() });
  var t = createTools({ store: store, now: at(WED) });
  var seven = Array.from({ length: 7 }, function (_, i) { return session('추가 ' + i, 'full', [ex('스쿼트', [{ weight: 60, reps: 8 }])]); });
  var r = await t.saveWeekPlan(weekInput({ sessions: seven }));
  assert.equal(r.isError, true);
  assert.equal((await store.getJSON(weekKey(THIS_MON))).id, 'w-1');
  assert.ok(!(await t.saveWeekPlan(weekInput({ sessions: seven.slice(0, 6) }))).isError);
});

test('주간 저장 — 종목 검사: lower는 legs 목록, full은 free 목록, 틀린 이름은 비슷한 이름 3개', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(WED) });
  var lowerWithBench = weekInput({ sessions: [session('하체 A', 'lower', [ex('벤치프레스', [{ weight: 60, reps: 8 }])])] });
  assert.equal((await t.saveWeekPlan(lowerWithBench)).isError, true);
  var upperWithSquat = weekInput({ sessions: [session('상체 A', 'upper', [ex('스쿼트', [{ weight: 60, reps: 8 }])])] });
  assert.equal((await t.saveWeekPlan(upperWithSquat)).isError, true);
  assert.equal(await store.getJSON(weekKey(THIS_MON)), null);
  var full = weekInput({ days: 3, sessions: [session('전신 A', 'full', [ex('랫풀다운', [{ weight: 50, reps: 10 }]), ex('스쿼트', [{ weight: 60, reps: 8 }]), ex('루마니안 데드리프트', [{ weight: 60, reps: 8 }])])] });
  assert.ok(!(await t.saveWeekPlan(full)).isError);

  var typo = weekInput({ sessions: [session('상체 A', 'push', [ex('인클라인 벤치 프레스', [{ weight: 30, reps: 10 }])])] });
  var r = await t.saveWeekPlan(typo);
  assert.equal(r.isError, true);
  var lines = text(r).split('\n');
  assert.equal(lines[0], '상체 A (push) 종목 목록에 없는 이름이 있어 저장하지 않았어요.');
  var sug = lines[1].split('비슷한 목록 이름: ')[1].split(', ');
  assert.equal(sug.length, 3);
  assert.equal(sug[0], '인클라인 덤벨 프레스');
  sug.forEach(function (n) { assert.ok(snapshot().catalog.push.includes(n)); });
});

test('주간 저장 — 스냅샷이 없으면 저장하지 않는다', async () => {
  var store = fakeStore();
  var r = await createTools({ store: store, now: at(WED) }).saveWeekPlan(weekInput());
  assert.equal(r.isError, true);
  assert.ok(text(r).includes('헬스앱'));
  assert.equal(await store.getJSON(weekKey(THIS_MON)), null);
});

test('주간 저장 — targets: 틀린 키는 허용 키 목록과 함께 거부, 값은 0~40', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(WED) });
  var r = await t.saveWeekPlan(weekInput({ targets: { chest: 12, back: 10 } }));
  assert.equal(r.isError, true);
  var s = text(r);
  assert.ok(s.includes('back'), s);
  GROUPS.forEach(function (g) { assert.ok(s.includes(g[0]), '허용 키 빠짐: ' + g[0]); });
  var cases = [{ chest: 41 }, { chest: -1 }, { chest: '12' }, [], null, 'chest'];
  for (var i = 0; i < cases.length; i++) {
    assert.equal((await t.saveWeekPlan(weekInput({ targets: cases[i] }))).isError, true, 'case ' + i + ' 통과됨');
  }
  assert.equal((await t.saveWeekPlan(weekInput({ targets: undefined }))).isError, true, 'targets는 필수');
  assert.equal(await store.getJSON(weekKey(THIS_MON)), null);
  assert.ok(!(await t.saveWeekPlan(weekInput({ targets: { chest: 0, abs: 40 } }))).isError, '경계값은 허용');
  assert.ok(!(await t.saveWeekPlan(weekInput({ targets: {} }))).isError, '빈 목표 허용');
});

test('주간 저장 — 범위 밖 입력은 거부', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(WED) });
  function withSet(set) { return weekInput({ sessions: [session('상체 A', 'upper', [ex('벤치프레스', [set])])] }); }
  function withSession(extra) { return weekInput({ sessions: [Object.assign(upperA(), extra)] }); }
  var cases = [
    weekInput({ days: 2 }),
    weekInput({ days: 6 }),
    weekInput({ days: '4' }),
    weekInput({ week: 'last' }),
    weekInput({ deload: 'yes' }),
    weekInput({ note: 3 }),
    weekInput({ sessions: [] }),
    weekInput({ sessions: Array.from({ length: 8 }, function (_, i) { return session('S' + i, 'upper', [ex('벤치프레스', [{ weight: 60, reps: 8 }])]); }) }),
    weekInput({ sessions: [upperA(), Object.assign(upperB(), { label: ' 상체 A' })] }),
    withSession({ label: '' }),
    withSession({ label: '   ' }),
    withSession({ label: '1234567890123' }),
    withSession({ type: 'legs' }),
    withSession({ note: 5 }),
    withSession({ exercises: [] }),
    withSession({ exercises: Array.from({ length: 21 }, function () { return ex('벤치프레스', [{ weight: 60, reps: 8 }]); }) }),
    withSession({ exercises: [ex('벤치프레스', Array.from({ length: 16 }, function () { return { weight: 60, reps: 8 }; }))] }),
    withSession({ exercises: [ex('벤치프레스', [])] }),
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
    var r = await t.saveWeekPlan(cases[i]);
    assert.equal(r.isError, true, 'case ' + i + ' 통과됨');
  }
  assert.equal(await store.getJSON(weekKey(THIS_MON)), null);
  var dup = await t.saveWeekPlan(weekInput({ sessions: [upperA(), Object.assign(upperB(), { label: '상체 A' })] }));
  assert.ok(text(dup).includes('같은 label'), text(dup));
  var labelErr = await t.saveWeekPlan(withSession({ label: '' }));
  assert.ok(text(labelErr).includes('- sessions[0].label은'), text(labelErr));
  var setErr = await t.saveWeekPlan(withSet({ weight: 501, reps: 8 }));
  assert.ok(text(setErr).includes('sessions[0].exercises[0].sets[0].weight는 0~500 숫자 또는 null이어야 해요.'), text(setErr));
  assert.ok(!(await t.saveWeekPlan(withSet({ weight: 500, reps: '1-100', restSec: 600 }))).isError, '경계값은 허용');
  assert.ok(!(await t.saveWeekPlan(withSet({ weight: 0, reps: 100, restSec: 0 }))).isError, '경계값은 허용');
  assert.ok(!(await t.saveWeekPlan(withSession({ label: '123456789012' }))).isError, 'label 12자 허용');
  assert.ok(!(await t.saveWeekPlan(weekInput({ days: 3, deload: true }))).isError);
  assert.equal((await store.getJSON(weekKey(THIS_MON))).deload, true);
});

test('주간 저장 — label 중복 검사는 toString·__proto__·constructor를 잘못 걸지 않는다', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(WED) });
  var names = ['toString', '__proto__', 'constructor', 'valueOf'];
  var r = await t.saveWeekPlan(weekInput({ sessions: names.map(function (n) { return session(n, 'upper', [ex('벤치프레스', [{ weight: 60, reps: 8 }])]); }) }));
  assert.ok(!r.isError, text(r));
  assert.deepEqual((await store.getJSON(weekKey(THIS_MON))).sessions.map(function (x) { return x.label; }), names);
  var dup = await t.saveWeekPlan(weekInput({ sessions: [session('toString', 'upper', [ex('벤치프레스', [{ weight: 60, reps: 8 }])]), session('toString', 'upper', [ex('랫풀다운', [{ weight: 50, reps: 8 }])])] }));
  assert.equal(dup.isError, true);
  assert.ok(text(dup).includes('같은 label이 여러 번 있어요: toString'));
  var snap = snapshot();
  snap.workouts.push(planWorkout('2026-09-22', THIS_MON, '__proto__', 'upper'));
  assert.deepEqual(Object.keys(doneSessions(snap, THIS_MON)), ['__proto__']);
  assert.deepEqual(Object.keys(doneSessions(snapshot(), THIS_MON)), []);
});

test('주간 저장 — label은 앞뒤 공백을 뺀 길이로 검사 (공백 포함 14자, 뺀 뒤 12자는 저장)', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var t = createTools({ store: store, now: at(WED) });
  var label = ' 123456789012 ';
  assert.equal(label.length, 14);
  var r = await t.saveWeekPlan(weekInput({ sessions: [Object.assign(upperA(), { label: label })] }));
  assert.ok(!r.isError, text(r));
  assert.equal((await store.getJSON(weekKey(THIS_MON))).sessions[0].label, '123456789012');
  assert.equal((await t.saveWeekPlan(weekInput({ sessions: [Object.assign(upperA(), { label: ' 1234567890123 ' })] }))).isError, true);
});

// ---------- update_week_sessions ----------

function storeWithPlan(snapOverride) {
  var snap = snapOverride || snapshot();
  return fakeStore({ [KEY_SNAPSHOT]: snap, [weekKey(THIS_MON)]: planFixture({
    sessions: planFixture().sessions.concat([
      { label: '상체 B', type: 'upper', note: '', updatedAt: WED, exercises: [{ name: '랫풀다운', note: '', sets: [{ weight: 50, reps: '10', warmup: false, restSec: null }] }] }
    ])
  }) });
}

var FRI = '2026-09-25T03:00:00.000Z';

test('수정 — upsert: 같은 label은 그 자리 교체, 새 label은 끝에 추가, id 유지·updatedAt 갱신', async () => {
  var store = storeWithPlan();
  var t = createTools({ store: store, now: at(FRI), uuid: function () { return 'never'; } });
  var r = await t.updateWeekSessions({ upsert: [
    session('하체 A', 'lower', [ex('레그 프레스', [{ weight: 120, reps: '10-12' }])], { note: '바꿈' }),
    session('전신 추가', 'full', [ex('스쿼트', [{ weight: 50, reps: 10 }])])
  ] });
  assert.ok(!r.isError, text(r));
  assert.equal(text(r), '2026-09-21 주 계획을 고쳤어요. 바꾼 세션 1개 · 더한 세션 1개 · 뺀 세션 0개');
  var saved = await store.getJSON(weekKey(THIS_MON));
  assert.equal(saved.id, 'w-1');
  assert.equal(saved.createdAt, WED);
  assert.equal(saved.updatedAt, FRI);
  assert.deepEqual(saved.sessions.map(function (s) { return s.label; }), ['상체 A', '하체 A', '상체 B', '전신 추가']);
  assert.deepEqual(saved.sessions.map(function (s) { return s.updatedAt; }), [WED, FRI, WED, FRI], '바뀐 세션만 updatedAt');
  assert.deepEqual(saved.sessions[1], { label: '하체 A', type: 'lower', note: '바꿈', updatedAt: FRI, exercises: [{ name: '레그 프레스', note: '', sets: [{ weight: 120, reps: '10-12', warmup: false, restSec: null }] }] });
  assert.deepEqual(saved.targets, planFixture().targets, 'targets를 안 주면 그대로');
});

test('수정 — remove·targets 통째 교체·note·deload·days', async () => {
  var store = storeWithPlan();
  var t = createTools({ store: store, now: at(FRI) });
  var r = await t.updateWeekSessions({ remove: ['상체 B'], targets: { quads: 12 }, note: '출장', deload: true, days: 3 });
  assert.ok(!r.isError, text(r));
  assert.equal(text(r), '2026-09-21 주 계획을 고쳤어요. 바꾼 세션 0개 · 더한 세션 0개 · 뺀 세션 1개');
  var saved = await store.getJSON(weekKey(THIS_MON));
  assert.deepEqual(saved.sessions.map(function (s) { return s.label; }), ['상체 A', '하체 A']);
  assert.deepEqual(saved.targets, { quads: 12 });
  assert.equal(saved.note, '출장');
  assert.equal(saved.deload, true);
  assert.equal(saved.days, 3);
  assert.equal(saved.id, 'w-1');
  assert.equal(saved.updatedAt, FRI);
  assert.deepEqual(saved.sessions.map(function (s) { return s.updatedAt; }), [WED, WED]);
});

test('수정 — 끝난 세션 label은 upsert·remove 모두 거부, 아무것도 저장 안 함', async () => {
  var snap = snapshot();
  snap.workouts.push(planWorkout('2026-09-22', THIS_MON, '상체 A', 'upper'));
  var store = storeWithPlan(snap);
  var before = await store.getJSON(weekKey(THIS_MON));
  var t = createTools({ store: store, now: at(FRI) });
  var up = await t.updateWeekSessions({ upsert: [upperA(), lowerA()] });
  assert.equal(up.isError, true);
  assert.equal(text(up), '이미 끝난 세션이라 바꿀 수 없어요: 상체 A');
  var rm = await t.updateWeekSessions({ remove: ['하체 A', '상체 A'] });
  assert.equal(rm.isError, true);
  assert.equal(text(rm), '이미 끝난 세션이라 바꿀 수 없어요: 상체 A');
  assert.deepEqual(await store.getJSON(weekKey(THIS_MON)), before);
  assert.ok(!(await t.updateWeekSessions({ remove: ['하체 A'] })).isError, '안 한 세션은 뺄 수 있다');
});

test('수정 — 계획에 없는 label remove는 거부', async () => {
  var store = storeWithPlan();
  var before = await store.getJSON(weekKey(THIS_MON));
  var r = await createTools({ store: store, now: at(FRI) }).updateWeekSessions({ remove: ['하체 Z'] });
  assert.equal(r.isError, true);
  assert.ok(text(r).includes('하체 Z'));
  assert.deepEqual(await store.getJSON(weekKey(THIS_MON)), before);
});

test('수정 — 그 주 계획이 없으면 거부 (기본은 이번 주, 일요일에도)', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot(), [weekKey(NEXT_MON)]: planFixture({ weekStart: NEXT_MON }) });
  var t = createTools({ store: store, now: at(NOW) });
  var r = await t.updateWeekSessions({ note: 'x' });
  assert.equal(r.isError, true);
  assert.equal(text(r), '이 주에는 저장된 계획이 없어요. save_week_plan으로 먼저 저장해 주세요.');
  assert.equal(await store.getJSON(weekKey(THIS_MON)), null);
  var next = await t.updateWeekSessions({ week: 'next', note: 'x' });
  assert.ok(!next.isError, text(next));
  assert.equal((await store.getJSON(weekKey(NEXT_MON))).note, 'x');
});

test('수정 — 바꿀 내용이 없는 입력은 거부', async () => {
  var store = storeWithPlan();
  var before = await store.getJSON(weekKey(THIS_MON));
  var t = createTools({ store: store, now: at(FRI) });
  var cases = [{}, { week: 'this' }, { upsert: [], remove: [] }];
  for (var i = 0; i < cases.length; i++) {
    var r = await t.updateWeekSessions(cases[i]);
    assert.equal(r.isError, true, 'case ' + i + ' 통과됨');
  }
  assert.deepEqual(await store.getJSON(weekKey(THIS_MON)), before);
});

test('수정 — 세션이 0개가 되거나 7개를 넘으면 거부', async () => {
  var store = storeWithPlan();
  var before = await store.getJSON(weekKey(THIS_MON));
  var t = createTools({ store: store, now: at(FRI) });
  var zero = await t.updateWeekSessions({ remove: ['상체 A', '하체 A', '상체 B'] });
  assert.equal(zero.isError, true);
  var five = Array.from({ length: 5 }, function (_, i) { return session('추가 ' + i, 'full', [ex('스쿼트', [{ weight: 60, reps: 8 }])]); });
  var eight = await t.updateWeekSessions({ upsert: five });
  assert.equal(eight.isError, true, '3 + 5 = 8개');
  assert.deepEqual(await store.getJSON(weekKey(THIS_MON)), before);
  assert.ok(!(await t.updateWeekSessions({ upsert: five.slice(0, 4) })).isError, '7개는 허용');
  assert.equal((await store.getJSON(weekKey(THIS_MON))).sessions.length, 7);
});

test('수정 — 종목 검사·targets 키 검사는 저장과 같다', async () => {
  var store = storeWithPlan();
  var before = await store.getJSON(weekKey(THIS_MON));
  var t = createTools({ store: store, now: at(FRI) });
  var badName = await t.updateWeekSessions({ upsert: [session('하체 A', 'lower', [ex('랫풀다운', [{ weight: 50, reps: 10 }])])] });
  assert.equal(badName.isError, true);
  assert.ok(text(badName).startsWith('하체 A (lower) 종목 목록에 없는 이름이 있어 저장하지 않았어요.'));
  var badKey = await t.updateWeekSessions({ targets: { legs: 10 } });
  assert.equal(badKey.isError, true);
  assert.ok(text(badKey).includes('chest'));
  assert.equal((await t.updateWeekSessions({ targets: { chest: 41 } })).isError, true);
  assert.equal((await t.updateWeekSessions({ days: 6 })).isError, true);
  assert.deepEqual(await store.getJSON(weekKey(THIS_MON)), before);
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

test('유산소 — KST 날짜 경계: UTC 15:00은 다음 날', async () => {
  var store = fakeStore();
  await createTools({ store: store, now: at('2026-09-26T15:00:00.000Z') }).saveTodayCardio({ mode: 'walk', title: '걷기', segments: [{ type: 'walk', sec: 600, speed: 5, incline: 8 }] });
  assert.equal((await store.getJSON(KEY_PLAN_CARDIO)).date, '2026-09-27');
});

// ---------- get_saved_plans / getAppPlans ----------

test('저장된 플랜 — 이번 주·다음 주 계획과 오늘 유산소만', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var sat = createTools({ store: store, now: at('2026-09-26T03:00:00.000Z'), uuid: seq('p-') });
  await sat.saveWeekPlan(weekInput());             // p-1 → this week
  await sat.saveWeekPlan(weekInput({ week: 'next' })); // p-2 → next week
  await sat.saveTodayCardio({ mode: 'walk', title: '걷기', segments: [{ type: 'walk', sec: 600, speed: 5, incline: 8 }] });
  var s = text(await sat.getSavedPlans());
  assert.ok(s.includes('## 이번 주(2026-09-21) 계획\n{'), s.slice(0, 80));
  assert.ok(s.includes('"id": "p-1"'));
  assert.ok(s.includes('## 다음 주(2026-09-28) 계획\n{'));
  assert.ok(s.includes('"id": "p-2"'));
  assert.ok(s.includes('## 오늘(2026-09-26) 유산소 플랜\n{'));
  assert.ok(s.includes('"title": "걷기"'));
  assert.ok(s.indexOf('p-1') < s.indexOf('p-2') && s.indexOf('p-2') < s.indexOf('"title": "걷기"'));

  var mon = createTools({ store: store, now: at('2026-09-28T03:00:00.000Z') });
  var s2 = text(await mon.getSavedPlans());
  assert.ok(s2.includes('## 이번 주(2026-09-28) 계획\n{'));
  assert.ok(s2.includes('"id": "p-2"'));
  assert.ok(s2.includes('## 다음 주(2026-10-05) 계획\n다음 주 계획이 없어요.'));
  assert.ok(s2.includes('## 오늘(2026-09-28) 유산소 플랜\n오늘 저장된 유산소 플랜이 없어요.'));
  assert.ok(!s2.includes('p-1'));
  var empty = text(await createTools({ store: fakeStore(), now: at(NOW) }).getSavedPlans());
  assert.ok(empty.includes('이번 주 계획이 없어요.'));
});

test('getAppPlans — 이번 주 계획만 week로, 다음 주 계획은 안 오고, 유산소는 오늘 것만', async () => {
  var store = fakeStore({ [KEY_SNAPSHOT]: snapshot() });
  var sun = createTools({ store: store, now: at(NOW), uuid: seq('a-') });
  assert.deepEqual(await sun.getAppPlans(), { week: null, cardio: null });
  await sun.saveWeekPlan(weekInput());   // Sunday → next week (a-1)
  assert.deepEqual(await sun.getAppPlans(), { week: null, cardio: null }, '다음 주 계획은 오지 않는다');
  await sun.saveWeekPlan(weekInput({ week: 'this' })); // a-2
  await sun.saveTodayCardio({ mode: 'walk', title: '걷기', segments: [{ type: 'walk', sec: 600, speed: 5, incline: 8 }] });
  var plans = await sun.getAppPlans();
  assert.deepEqual(Object.keys(plans).sort(), ['cardio', 'week']);
  assert.equal(plans.week.id, 'a-2');
  assert.equal(plans.week.weekStart, THIS_MON);
  assert.equal(plans.cardio.title, '걷기');
  var monday = await createTools({ store: store, now: at('2026-09-27T15:00:00.000Z') }).getAppPlans();
  assert.equal(monday.week.id, 'a-1', '월요일이 되면 그 주 계획');
  assert.equal(monday.cardio, null, '어제 유산소는 안 온다');
});

test('비슷한 이름 — 문자 겹침이 없으면 제안하지 않는다', () => {
  assert.deepEqual(suggestNames('xyz', ['벤치프레스']), []);
});
