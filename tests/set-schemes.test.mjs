// 세트 스킴(세트법) · 휴식시간 · 슈퍼세트 엔진 테스트
// 근거 문서: docs/research/set-schemes.md · docs/research/training-splits.md
// 핵심 계약:
//  · 고중량 복합만 탑세트+백오프, 나머지는 스트레이트
//  · 백오프·드롭 감량이 반올림 때문에 사라지지 않는다 (§2-B 함정)
//  · 휴식 기본값이 클래스별 새 권장치이고, 반복이 하단 미달이면 +30초
//  · 드롭·마이오렙 세트가 증량 판정·볼륨 카운트를 오염시키지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}
function set(weight, reps, extra) {
  return Object.assign({ weight, reps, isWarmup: false, completed: true }, extra || {});
}
function seedLog(entries) {
  app.state.data.workoutLog = entries;
  app._lastSetsCache = null; // 종목별 최근 세트 캐시 무효화
}
function resetOverrides() {
  app.storage.set(app.KEYS.SET_SCHEMES, {});
}

// ═══ 1. 클래스별 기본 세트법 배정 (§2-A) ═══

test('기본 세트법: 고중량 복합만 탑세트+백오프, 나머지는 스트레이트', () => {
  resetOverrides();
  assert.equal(app.getSetScheme('핵 스쿼트'), 'top_backoff');        // compound_heavy
  assert.equal(app.getSetScheme('풀업'), 'top_backoff');             // compound_heavy
  assert.equal(app.getSetScheme('레그 프레스'), 'straight');          // compound_moderate
  assert.equal(app.getSetScheme('머신 시티드 로우'), 'straight');      // compound_moderate
  assert.equal(app.getSetScheme('바벨 컬'), 'straight');              // isolation
  assert.equal(app.getSetScheme('덤벨 사이드 레터럴 레이즈'), 'straight'); // light_isolation
  assert.equal(app.getSetScheme('페이스 풀'), 'straight');            // rehab
});

test('재활 종목은 세트법을 바꿀 수 없다 (lockScheme — 무게 진행 금지 원칙)', () => {
  resetOverrides();
  assert.equal(app.setSetSchemeOverride('페이스 풀', 'drop'), false);
  assert.equal(app.getSetScheme('페이스 풀'), 'straight');
  const opts = app.getSetSchemeOptions('페이스 풀');
  assert.equal(opts.length, 1);
  assert.equal(opts[0].id, 'straight');
});

test('사용자 override가 클래스 기본값을 이긴다 · 기본값과 같으면 override를 지운다', () => {
  resetOverrides();
  assert.equal(app.setSetSchemeOverride('핵 스쿼트', 'straight'), true);
  assert.equal(app.getSetScheme('핵 스쿼트'), 'straight');

  // 기본값으로 되돌리면 저장소에서 사라진다 (나중에 기본값이 바뀌면 따라가도록)
  assert.equal(app.setSetSchemeOverride('핵 스쿼트', 'top_backoff'), true);
  assert.equal(app.getSetScheme('핵 스쿼트'), 'top_backoff');
  assert.equal(Object.keys(app.storage.get(app.KEYS.SET_SCHEMES, {})).length, 0);
});

test('override는 표준명으로 저장된다 — 별칭으로 바꿔도 표준명 조회에 반영된다', () => {
  resetOverrides();
  app.setSetSchemeOverride('랫풀다운', 'drop');            // 별칭 표기로 지정
  assert.equal(app.getSetScheme('랫 풀 다운'), 'drop');     // 표준명으로 조회
  resetOverrides();
});

// ═══ 2. 반올림 함정 — 감량이 사라지면 안 된다 (§2-B) ═══

test('reduceWeight: 반올림으로 감량이 0이 되는 구간에서도 최소 한 스텝 내려간다', () => {
  // 25kg × 0.90 = 22.5 → Math.round(4.5)*5 = 25kg 였다 (감량 0%)
  assert.equal(app.snapWeightToEquipment(25 * 0.9, '핵 스쿼트'), 25, '전제: 기존 스냅은 감량을 삼킨다');
  assert.equal(app.reduceWeight(25, 0.9, '핵 스쿼트'), 20);

  // 덤벨 8kg × 0.90 = 7.2 → 8kg 였다
  assert.equal(app.snapWeightToEquipment(8 * 0.9, '덤벨 벤치 프레스'), 8);
  assert.equal(app.reduceWeight(8, 0.9, '덤벨 벤치 프레스'), 6);
});

test('reduceWeight: 정상 구간은 그대로 스냅값 (60→55, 100→90)', () => {
  assert.equal(app.reduceWeight(60, 0.9, '핵 스쿼트'), 55);
  assert.equal(app.reduceWeight(100, 0.9, '핵 스쿼트'), 90);
  assert.equal(app.reduceWeight(70, 0.9, '핵 스쿼트'), 65);
});

test('reduceWeight: 0kg 이하로 내려가지 않고, 무게 없는 종목은 그대로', () => {
  assert.equal(app.reduceWeight(5, 0.75, '레그 프레스'), 5); // 한 스텝 아래가 0 → 최소 1스텝 유지
  assert.equal(app.reduceWeight(null, 0.9, '풀업'), null);
  assert.equal(app.reduceWeight(0, 0.9, '풀업'), 0);
});

// ═══ 3. 세트 배열 생성 (§2-B 규칙①②③) ═══

test('탑세트+백오프: 탑 1개 + 백오프 2개(90%), 반복 목표는 같다', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '핵 스쿼트', setsDetail: [set(60, 6), set(60, 6), set(60, 5)] }] }]);
  const plan = app.getSessionSetPlan('핵 스쿼트', null, '8-10', { sets: 3 });

  assert.equal(plan.scheme, 'top_backoff');
  const working = plan.sets.filter((s) => !s.isWarmup);
  assert.equal(working.length, 3);
  assert.equal(working.map((s) => s.role).join(','), 'top,backoff,backoff');
  assert.equal(working[0].weight, 60);
  assert.equal(working[1].weight, 55, '백오프 = 탑의 90% 스냅');
  assert.equal(working[2].weight, 55);
  // 백오프도 같은 반복 목표를 쓴다 — 이게 볼륨 로드 보존 메커니즘 그 자체다
  assert.equal(working[1].reps, working[0].reps);
});

test('워밍업 램프: 고중량 복합 2세트(50%·75%) / 중강도 복합 1세트(55%) / 고립은 없음', () => {
  resetOverrides();
  seedLog([
    { date: daysAgo(3), exercises: [
      { name: '핵 스쿼트', setsDetail: [set(60, 8), set(60, 8)] },
      { name: '레그 프레스', setsDetail: [set(100, 10), set(100, 10)] },
      { name: '머신 레그 익스텐션', setsDetail: [set(40, 13), set(40, 13)] }
    ] }
  ]);
  const heavy = app.getSessionSetPlan('핵 스쿼트', null, '8-10', { sets: 3 }).sets.filter((s) => s.isWarmup);
  assert.equal(heavy.length, 2);
  assert.equal(heavy[0].reps, 8);
  assert.equal(heavy[1].reps, 4);

  const mod = app.getSessionSetPlan('레그 프레스', null, '8-12', { sets: 3 }).sets.filter((s) => s.isWarmup);
  assert.equal(mod.length, 1);

  const iso = app.getSessionSetPlan('머신 레그 익스텐션', null, '12-15', { sets: 3 }).sets.filter((s) => s.isWarmup);
  assert.equal(iso.length, 0, '고립은 첫 워킹세트가 자체 워밍업 역할');
});

test('warmup:false 옵션이면 워밍업을 붙이지 않는다 (진행 중 종목 재구성용)', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '핵 스쿼트', setsDetail: [set(60, 8), set(60, 8)] }] }]);
  const sets = app.getSessionSetPlan('핵 스쿼트', null, '8-10', { sets: 3, warmup: false }).sets;
  assert.equal(sets.filter((s) => s.isWarmup).length, 0);
});

test('무게를 모르는 종목(맨몸)은 탑+백오프를 스트레이트로 접고, 표기도 스트레이트로 맞춘다', () => {
  resetOverrides();
  seedLog([]);
  app.storage.set(app.KEYS.ONE_RM_DATA, {}); // 1RM 추정도 없게
  const plan = app.getSessionSetPlan('풀업', null, '본인 최대', { sets: 3 });
  const working = plan.sets.filter((s) => !s.isWarmup);
  assert.equal(working.length, 3);
  assert.ok(working.every((s) => s.role === 'work'), '감량 자체가 불가능하므로 백오프를 만들지 않는다');
  // 화면 표기(scheme)와 실제 세트가 어긋나면 "탑+백오프"라 써놓고 스트레이트가 나온다
  assert.equal(plan.scheme, 'straight');
  assert.equal(app.effectiveSetScheme('풀업', null), 'straight');
  assert.equal(app.getSetScheme('풀업'), 'top_backoff', '클래스 기본값 자체는 그대로다');
  // 맨몸 복합도 워밍업 1세트는 유지 (무게를 낮출 수 없으니 램프 대신 1세트)
  assert.equal(plan.sets.filter((s) => s.isWarmup).length, 1);
});

test('드롭세트: 마지막 워킹세트 뒤에 −25%씩 2개가 붙고 그 사이 휴식은 10초', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '머신 레그 익스텐션', setsDetail: [set(40, 13), set(40, 13)] }] }]);
  app.setSetSchemeOverride('머신 레그 익스텐션', 'drop');
  const sets = app.getSessionSetPlan('머신 레그 익스텐션', null, '12-15', { sets: 3 }).sets;

  assert.equal(sets.map((s) => s.role).join(','), 'work,work,work,drop,drop');
  assert.equal(sets[2].rest, 10, '본세트 → 드롭 사이는 무게 바꾸는 시간뿐');
  assert.equal(sets[3].weight, 30);  // 40 × 0.75 = 30
  // 30 × 0.75 = 22.5 → 5kg 격자에서 25kg. −25%가 아니라 −16.7%지만 실행 가능한 가장 가까운 무게이고,
  // reduceWeight의 계약(=최소 한 스텝은 반드시 내려간다)은 지켜졌다.
  assert.equal(sets[4].weight, 25);
  assert.ok(sets[4].weight < sets[3].weight, '드롭마다 반드시 내려가야 한다');
  assert.equal(sets[4].rest, 120, '마지막 드롭 뒤는 클래스 휴식');
  resetOverrides();
});

test('마이오렙: 같은 무게 미니세트 3개 + 사이 휴식 20초 (프리웨이트 안전 대안)', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '인클라인 덤벨 컬', setsDetail: [set(10, 13), set(10, 13)] }] }]);
  app.setSetSchemeOverride('인클라인 덤벨 컬', 'myo_reps');
  const sets = app.getSessionSetPlan('인클라인 덤벨 컬', null, '12-15', { sets: 3 }).sets;

  const myo = sets.filter((s) => s.role === 'myo');
  assert.equal(myo.length, 3);
  assert.ok(myo.every((s) => s.weight === 10), '무게를 바꾸지 않는 게 마이오렙의 핵심(프리웨이트 안전)');
  assert.equal(myo[0].rest, 20);
  assert.equal(myo[2].rest, 120);
  resetOverrides();
});

test('세트 배열은 하위호환 필드(weight·reps·repRange·prog)를 그대로 유지한다', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '레그 프레스', setsDetail: [set(100, 10), set(100, 10)] }] }]);
  const plan = app.getSessionSetPlan('레그 프레스', null, '8-12', { sets: 3 });
  assert.equal(typeof plan.weight, 'number');
  assert.equal(typeof plan.reps, 'number');
  assert.ok(plan.repRange && plan.repRange.low && plan.repRange.high);
  assert.ok(plan.prog);
});

// ═══ 4. 휴식시간 (§3-B 권장표 · §3-C 자가조절) ═══

test('휴식 기본값: 180 / 150 / 120 / 90 / 60초 (클래스별 새 권장치)', () => {
  assert.equal(app.getExerciseRestSec('핵 스쿼트'), 180);              // compound_heavy
  assert.equal(app.getExerciseRestSec('레그 프레스'), 150);            // compound_moderate
  assert.equal(app.getExerciseRestSec('바벨 컬'), 120);                // isolation (기존 90초 → 상향)
  assert.equal(app.getExerciseRestSec('덤벨 사이드 레터럴 레이즈'), 90); // light_isolation
  assert.equal(app.getExerciseRestSec('페이스 풀'), 60);               // rehab (기존 90초 → 하향)
});

test('휴식 자가조절: 직전 세트가 목표 하단 미달이면 +30초, 상한 240초', () => {
  const ex = { name: '핵 스쿼트', targetReps: '5-8' };
  assert.equal(app.resolveRestSec(ex, { reps: 8, role: 'top' }), 180);
  assert.equal(app.resolveRestSec(ex, { reps: 4, role: 'backoff' }), 210, '하단(5) 미달 → +30초');

  // 상한
  const ex2 = { name: '핵 스쿼트', targetReps: '5-8', rest: '230' };
  assert.equal(app.resolveRestSec(ex2, { reps: 3, role: 'top' }), 240);
});

test('휴식 우선순위: 세트 지정 > AI 지정 > 클래스 기본값, 워밍업은 45초', () => {
  const ex = { name: '레그 프레스', targetReps: '8-12', rest: '120-180' };
  assert.equal(app.resolveRestSec(ex, { reps: 10, rest: 200, role: 'work' }), 200, '세트 지정이 최우선');
  assert.equal(app.resolveRestSec(ex, { reps: 10, role: 'work' }), 120, 'AI 지정 "120-180" → 하단 120');
  assert.equal(app.resolveRestSec({ name: '레그 프레스', targetReps: '8-12' }, { reps: 10, role: 'work' }), 150);
  assert.equal(app.resolveRestSec(ex, { reps: 8, isWarmup: true }), 45);
});

test('드롭·마이오렙 사이의 짧은 휴식은 자가조절 대상이 아니다 (그게 스킴의 정의)', () => {
  const ex = { name: '머신 레그 익스텐션', targetReps: '12-15' };
  assert.equal(app.resolveRestSec(ex, { reps: 5, rest: 10, role: 'drop' }), 10);
  assert.equal(app.resolveRestSec(ex, { reps: 5, rest: 20, role: 'myo' }), 20);
});

// ═══ 5. 증량 판정·볼륨 오염 방지 (§5-D 리스크) ═══

test('마이오렙 미니세트가 증량 판정을 막지 않는다 (같은 무게 5회가 상단 미달로 잡히면 안 됨)', () => {
  resetOverrides();
  seedLog([
    { date: daysAgo(3), exercises: [{ name: '머신 레그 익스텐션', setsDetail: [
      set(40, 15), set(40, 15), set(40, 15),
      set(40, 5, { role: 'myo' }), set(40, 5, { role: 'myo' })
    ] }] }
  ]);
  const prog = app.getProgressiveRecommendation('머신 레그 익스텐션', '12-15');
  assert.equal(prog.source, 'progress', '상단 15회를 세 세트 다 채웠으므로 증량이어야 한다');
  assert.equal(prog.weight, 45);
});

test('백오프 세트는 무게가 달라 증량 판정에서 자동으로 빠진다 (의도된 완화 — 탑세트 기준)', () => {
  resetOverrides();
  seedLog([
    { date: daysAgo(3), exercises: [{ name: '핵 스쿼트', setsDetail: [
      set(60, 8, { role: 'top' }), set(55, 6, { role: 'backoff' }), set(55, 5, { role: 'backoff' })
    ] }] },
    { date: daysAgo(6), exercises: [{ name: '핵 스쿼트', setsDetail: [
      set(60, 8, { role: 'top' }), set(55, 6, { role: 'backoff' })
    ] }] }
  ]);
  const prog = app.getProgressiveRecommendation('핵 스쿼트', '5-8');
  assert.equal(prog.source, 'progress', '2세션 연속 탑세트 상단 → 증량');
  assert.equal(prog.weight, 65);
});

test('드롭세트가 증량 판정을 오염시키지 않는다', () => {
  resetOverrides();
  seedLog([
    { date: daysAgo(3), exercises: [{ name: '머신 레그 익스텐션', setsDetail: [
      set(40, 15), set(40, 15), set(40, 15),
      set(30, 12, { role: 'drop' }), set(20, 10, { role: 'drop' })
    ] }] }
  ]);
  const prog = app.getProgressiveRecommendation('머신 레그 익스텐션', '12-15');
  assert.equal(prog.source, 'progress');
  assert.equal(prog.previousReps.join(','), '15,15,15', '드롭 세트는 지난 기록 표시에서도 빠진다');
});

// ═══ 6. 길항근 슈퍼세트 (Zhang 2025) ═══

test('슈퍼세트: 길항 관계 + 머신·케이블 조합만 페어로 묶는다', () => {
  seedLog([]);
  const pairs = app.buildSupersetSuggestions([
    { name: '머신 체스트 프레스' },   // chest
    { name: '머신 시티드 로우' },     // upper_back — 길항 ✅
    { name: '덤벨 사이드 레터럴 레이즈' } // 덤벨 = 프리웨이트 → 제외
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a + ',' + pairs[0].b, '0,1');
});

test('슈퍼세트: 같은 근육끼리(가슴 → 삼두)는 묶지 않는다 — 볼륨 로드가 떨어진다', () => {
  seedLog([]);
  const pairs = app.buildSupersetSuggestions([
    { name: '머신 체스트 프레스' },
    { name: '케이블 푸시 다운' }
  ]);
  assert.equal(pairs.length, 0);
});

test('슈퍼세트: 고중량 복합·요추 축성 부하 종목은 페어에서 제외한다 (허리 보호)', () => {
  seedLog([]);
  assert.equal(app.canSupersetExercise('핵 스쿼트'), false, '고중량 복합 + 축성 부하 high');
  assert.equal(app.canSupersetExercise('페이스 풀'), false, '재활 종목');
  assert.equal(app.canSupersetExercise('머신 레그 익스텐션'), true);
  assert.equal(app.getExerciseAxialLoad('핵 스쿼트'), 'high');
  assert.equal(app.getExerciseAxialLoad('머신 레그 익스텐션'), 'low');
});

test('슈퍼세트: 세션당 2페어까지만 제안한다 (RPE·대사 스트레스가 높다)', () => {
  seedLog([]);
  const pairs = app.buildSupersetSuggestions([
    { name: '머신 체스트 프레스' }, { name: '머신 시티드 로우' },
    { name: '머신 레그 익스텐션' }, { name: '시티드 레그 컬' },
    { name: '머신 펙 덱 플라이' }, { name: '랫 풀 다운' }
  ]);
  assert.equal(pairs.length, 2);
});

test('슈퍼세트 휴식: 앞 종목은 45초(이동), 뒤 종목은 클래스 휴식 × 0.6 (최소 60초)', () => {
  const a = { name: '머신 레그 익스텐션' };  // isolation 120초
  const b = { name: '시티드 레그 컬' };      // isolation 120초
  assert.equal(app.supersetRestSec(a, b, true), 45);
  assert.equal(app.supersetRestSec(b, a, false), 72); // 120 × 0.6

  // 각 근육이 실제로 쉬는 시간(45 + 상대 세트 ~50초 + 72)은 클래스 권장 120초보다 길다 —
  // 줄어드는 건 벽시계 시간뿐이라는 게 슈퍼세트의 원리다.
  assert.ok(45 + 50 + 72 >= 120);
});

test('슈퍼세트: 붙어 있는 종목을 먼저 묶는다 (이동이 짧아야 시간 이득이 남는다)', () => {
  seedLog([]);
  // 0번(레그프레스·사두)도 2번(레그컬·햄)과 길항이지만, 인접한 1↔2가 우선이어야 한다
  const pairs = app.buildSupersetSuggestions([
    { name: '레그 프레스' }, { name: '머신 레그 익스텐션' }, { name: '시티드 레그 컬' }
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a + ',' + pairs[0].b, '1,2');
});

test('applySupersetSuggestions: 양쪽 종목에 페어 정보를 얹는다', () => {
  seedLog([]);
  const exercises = [{ name: '머신 체스트 프레스' }, { name: '머신 시티드 로우' }];
  app.applySupersetSuggestions(exercises);
  assert.equal(exercises[0].supersetWith, 1);
  assert.equal(exercises[1].supersetWith, 0);
  assert.ok(exercises[0].supersetKr.includes('↔'));
});

// ═══ 7. 드롭·마이오렙 제안 조건 (§4) ═══

test('제안 조건: 시간 압박이 없으면 제안하지 않는다 (이득은 오직 시간)', () => {
  resetOverrides();
  seedLog([]);
  const session = {
    sessionType: 'legs',
    startTime: Date.now(),
    exercises: [{ name: '머신 레그 익스텐션', targetReps: '12-15',
      sets: [{ reps: 15, completed: false }] }]
  };
  assert.equal(app.isSessionTimePressured(session), false);
  assert.equal(app.suggestIntensityTechnique('머신 레그 익스텐션', session), null);
});

test('제안 조건: 시간이 빠듯하면 머신·케이블엔 드롭세트, 프리웨이트엔 마이오렙', () => {
  resetOverrides();
  seedLog([]);
  const many = (name) => ({
    name, targetReps: '12-15',
    sets: Array.from({ length: 3 }, () => ({ reps: 15, completed: false }))
  });
  // 종목을 많이 남겨 예상 소요가 예산을 넘게 만든다
  const session = {
    sessionType: 'legs', startTime: Date.now(),
    exercises: [many('머신 레그 익스텐션'), many('시티드 레그 컬'), many('머신 펙 덱 플라이'),
                many('인클라인 덤벨 컬'), many('힙 어덕션'), many('레그 프레스')]
  };
  assert.equal(app.isSessionTimePressured(session), true);
  assert.equal(app.suggestIntensityTechnique('머신 레그 익스텐션', session), 'drop');
  assert.equal(app.suggestIntensityTechnique('인클라인 덤벨 컬', session), 'myo_reps');
  // 복합·재활은 대상이 아니다
  assert.equal(app.suggestIntensityTechnique('레그 프레스', session), null);
  assert.equal(app.suggestIntensityTechnique('페이스 풀', session), null);
});

test('제안 조건: 최근 통증 기록이 있으면 제안하지 않는다', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(2), exercises: [
    { name: '머신 레그 익스텐션', painFlag: true, setsDetail: [set(40, 15)] }
  ] }]);
  const many = (name) => ({
    name, targetReps: '12-15',
    sets: Array.from({ length: 3 }, () => ({ reps: 15, completed: false }))
  });
  const session = {
    sessionType: 'legs', startTime: Date.now(),
    exercises: [many('머신 레그 익스텐션'), many('시티드 레그 컬'), many('머신 펙 덱 플라이'),
                many('힙 어덕션'), many('레그 프레스'), many('머신 시티드 로우')]
  };
  assert.equal(app.suggestIntensityTechnique('머신 레그 익스텐션', session), null);
  seedLog([]);
});

// ═══ 8. 60분 시간 예산 — 템플릿이 예산 안에 들어오는가 (training-splits.md §2-C) ═══

test('모든 세션 템플릿이 5~6종목 / 워킹 15~18세트 (60분 예산)', () => {
  ['push', 'pull', 'legs', 'upper'].forEach((key) => {
    const s = app.SESSIONS[key];
    const exCount = s.exercises.length;
    const setCount = s.exercises.reduce((n, e) => n + e.sets, 0);
    assert.ok(exCount >= 5 && exCount <= 6, `${key}: ${exCount}종목 — 5~6이어야 함`);
    assert.ok(setCount >= 15 && setCount <= 18, `${key}: ${setCount}세트 — 15~18이어야 함`);
    assert.equal(s.exerciseCount, exCount, `${key}: exerciseCount 메타가 실제와 다름`);
    assert.equal(s.setCount, setCount, `${key}: setCount 메타가 실제와 다름`);
  });
});

test('새 휴식 기준으로도 템플릿 세션이 60분을 넘지 않는다', () => {
  resetOverrides();
  seedLog([]);
  const TEMPO = 3.5, SETUP = 10, MOVE = 90;
  ['push', 'pull', 'legs', 'upper'].forEach((key) => {
    let sec = 0;
    app.SESSIONS[key].exercises.forEach((ex) => {
      const plan = app.getSessionSetPlan(ex.name, ex.lastWeight, ex.reps || '8-10', { sets: ex.sets });
      sec += MOVE;
      plan.sets.forEach((s, i) => {
        sec += (s.reps || 10) * TEMPO + SETUP;
        if (i < plan.sets.length - 1) sec += s.rest;
      });
    });
    assert.ok(sec / 60 <= 60, `${key}: 약 ${Math.round(sec / 60)}분 — 60분 예산 초과`);
  });
});

// ═══ 9. EXERCISE_SAFETY 표기 정리 (별칭 → 표준명) ═══

test('EXERCISE_SAFETY의 대체 종목(sub)이 전부 표준명이다', () => {
  const offenders = [];
  Object.keys(app.EXERCISE_SAFETY).forEach((name) => {
    const sub = app.EXERCISE_SAFETY[name].sub || {};
    Object.keys(sub).forEach((area) => {
      if (app.EXERCISE_ALIASES_1RM[sub[area]]) offenders.push(`${name}.${area} = ${sub[area]}`);
    });
  });
  assert.equal(offenders.join(' | '), '', '별칭 표기가 남아 있으면 진행도·통증 조회가 표준명 기록과 갈린다');
});

test('EXERCISE_SAFETY의 대체 종목이 모두 종목표에 등록된 이름이다', () => {
  const unknown = [];
  Object.keys(app.EXERCISE_SAFETY).forEach((name) => {
    const sub = app.EXERCISE_SAFETY[name].sub || {};
    Object.keys(sub).forEach((area) => {
      if (!app.EXERCISE_BODY_PART_MAP[sub[area]]) unknown.push(`${name}.${area} = ${sub[area]}`);
    });
  });
  assert.equal(unknown.join(' | '), '');
});
