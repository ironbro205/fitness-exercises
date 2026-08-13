// 세트 스킴(세트법) · 휴식시간 · 슈퍼세트 엔진 테스트
// 근거 문서: docs/research/set-schemes.md · docs/research/set-schemes-v2.md · docs/research/training-splits.md
// 핵심 계약:
//  · 고중량 복합만 탑세트(가장 무거운 1세트 + 90% 백오프), 나머지는 스트레이트
//  · 무게는 가까운 배수(덤벨 2kg / 그 외 5kg)로 맞추되, 감량은 기준보다 최소 한 단위 낮다 (§2-B 함정)
//  · 휴식 기본값이 클래스별 새 권장치이고, 반복이 하단 미달이면 +30초
//  · 드롭·마이오렙·백다운 세트가 증량 판정·1RM을 오염시키지 않는다 (백다운은 볼륨엔 포함)
//    — 마이오렙·백다운 세트법은 삭제됐지만 **옛 기록에 남은 세트**는 계속 이 규칙으로 읽힌다
//  · 세트 생성 규칙은 코드가 아니라 SET_SCHEMES[].build 데이터에 있다 (v2 §4-A)
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

// ═══ 2-B. 무게 반올림 규칙 (사용자 확정 · v2 §1-B) ═══
// 규칙: 계산된 무게는 **가까운 배수**(덤벨 2kg / 그 외 5kg)로 맞추되,
//       감량 목적 세트는 기준 세트보다 **최소 한 단위 낮은 것을 보장**한다. 소수점은 나오지 않는다.
// '무조건 내림'을 쓰지 않는 이유: 5kg 격자에서 백오프 90%가 −14~−18%로 이탈해
// 보고서가 계산한 자극 미달 구간(RIR 4 이상)에 떨어진다(v2 §1-B 표).

test('반올림: 백오프 90%가 목표 %에 붙는다 — 55/60/65/70kg (내림이면 −14~−18%로 이탈)', () => {
  const table = [[55, 50], [60, 55], [65, 60], [70, 65], [80, 70], [100, 90]];
  table.forEach(([top, expected]) => {
    const got = app.reduceWeight(top, app.BACKOFF_PCT, '핵 스쿼트');
    assert.equal(got, expected, `${top}kg의 90% → ${expected}kg 이어야 함 (받은 값 ${got})`);
    const ratio = got / top;
    assert.ok(ratio >= 0.85 && ratio < 1, `${top}kg: 실제 배율 ${Math.round(ratio * 1000) / 10}% — 85% 미만은 자극 미달 구간`);
  });
});

test('반올림: 감량 소멸 방지 — 반올림이 원래 무게로 되돌리면 한 단위 내린다', () => {
  // 탑 20kg의 90% = 18 → 가까운 배수는 20 → 감량 0. 최소 한 단위 보장이 15로 끌어내린다.
  assert.equal(app.snapWeightToEquipment(20 * 0.9, '핵 스쿼트'), 20, '전제: 그냥 스냅하면 감량이 사라진다');
  assert.equal(app.reduceWeight(20, 0.9, '핵 스쿼트'), 15);
  assert.equal(app.reduceWeight(25, 0.9, '핵 스쿼트'), 20);
  assert.equal(app.reduceWeight(8, 0.9, '덤벨 벤치 프레스'), 6, '덤벨도 같은 규칙 (2kg 격자)');
});

test('반올림: 덤벨은 2kg 격자 — 이름에 "덤벨"이 없는 덤벨 종목도 장비 태그로 잡는다', () => {
  assert.equal(app.getWeightIncrement('덤벨 벤치 프레스'), 2);
  assert.equal(app.getWeightIncrement('핵 스쿼트'), 5);
  // 종목표의 equipment: 'dumbbell' 만으로 판정되는 이름들 (5kg 격자면 8kg 다음이 13kg이 된다)
  ['해머 컬', '사이드 레터럴 레이즈', '컨센트레이션 컬', '풀오버', '켈소 슈러그'].forEach((n) => {
    assert.equal(app.getWeightIncrement(n), 2, `${n}은 덤벨 종목 — 2kg 격자여야 함`);
  });
  assert.equal(app.reduceWeight(30, 0.825, '덤벨 벤치 프레스'), 24, '30kg의 82.5% = 24.75 → 24');
  assert.equal(app.reduceWeight(20, 0.9, '해머 컬'), 18, '2kg 격자라 18kg이 나와야 한다 (5kg 격자면 15)');
});

test('반올림: 감량은 언제나 기준보다 낮고, 소수점이 없다 (전 스킴 배율 × 넓은 무게대)', () => {
  const pcts = [app.BACKOFF_PCT, app.BACKOFF_DELOAD_PCT, app.DROP_PCT, 0.925, 0.85, 0.825, 0.80];
  ['핵 스쿼트', '덤벨 벤치 프레스'].forEach((name) => {
    const step = app.getWeightIncrement(name);
    for (let top = step * 2; top <= 200; top += step) {
      pcts.forEach((p) => {
        const w = app.reduceWeight(top, p, name);
        assert.equal(w % step, 0, `${name} ${top}kg × ${p} → ${w}kg 가 ${step}kg 배수가 아니다`);
        assert.ok(w < top, `${name} ${top}kg × ${p} → ${w}kg — 감량이 사라졌다`);
        assert.ok(w >= step, `${name} ${top}kg × ${p} → ${w}kg — 0 이하로 내려갔다`);
      });
    }
  });
});

test('반올림 사다리: 여러 단이 같은 값으로 뭉개지지 않는다 (피라미드 30kg 함정)', () => {
  // 30kg에서 92.5%·85%를 따로 반올림하면 둘 다 25kg이 된다 → 사다리가 무너진다
  assert.equal(app.reduceWeight(30, 0.925, '핵 스쿼트'), 25);
  assert.equal(app.reduceWeight(30, 0.85, '핵 스쿼트'), 25, '전제: 따로 계산하면 충돌한다');
  const ladder = app.buildWeightLadder('핵 스쿼트', 30, [1.0, 0.925, 0.85]);
  assert.equal(ladder[1.0], 30);
  assert.equal(ladder[0.925], 25);
  assert.equal(ladder[0.85], 20, '앞 단보다 반드시 한 스텝 아래');

  // 어시스트(역방향)는 방향이 뒤집힌다 — 가벼운 단 = 보조가 더 많은 단
  const rev = app.buildWeightLadder('어시스트 풀업', 30, [1.0, 0.9, 0.8]);
  assert.ok(rev[1.0] < rev[0.9] && rev[0.9] < rev[0.8], '보조는 단마다 늘어야 한다');
});

test('반올림: 증량 추천은 가까운 배수 그대로 (감량 규칙이 진행 로직을 건드리지 않는다)', () => {
  resetOverrides();
  seedLog([
    { date: daysAgo(3), exercises: [{ name: '레그 프레스', setsDetail: [set(100, 12), set(100, 12)] }] }
  ]);
  const prog = app.getProgressiveRecommendation('레그 프레스', '8-12');
  assert.equal(prog.source, 'progress');
  assert.equal(prog.weight, 105, '증량은 +1 스텝 (5kg)');
  assert.equal(app.snapWeightToEquipment(63, '레그 프레스'), 65, '스냅은 가까운 배수');
  assert.equal(app.snapWeightToEquipment(9, '덤벨 벤치 프레스'), 10);
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

test('워밍업 램프: 고중량 복합 3세트(50%·75%·피더 90%) / 중강도 복합 1세트(55%) / 고립은 없음', () => {
  resetOverrides();
  seedLog([
    { date: daysAgo(3), exercises: [
      { name: '핵 스쿼트', setsDetail: [set(60, 8), set(60, 8)] },
      { name: '레그 프레스', setsDetail: [set(100, 10), set(100, 10)] },
      { name: '머신 레그 익스텐션', setsDetail: [set(40, 13), set(40, 13)] }
    ] }
  ]);
  // [v2 §2-F] 램프가 75%에서 멈추면 첫 워킹세트가 무겁게 느껴진다 → 마지막 단을 90%×2회로 올린다
  const heavy = app.getSessionSetPlan('핵 스쿼트', null, '8-10', { sets: 3 }).sets.filter((s) => s.isWarmup);
  assert.equal(heavy.length, 3);
  assert.equal(heavy[0].reps, 8);
  assert.equal(heavy[1].reps, 4);
  assert.equal(heavy[2].reps, 2, '피더는 준비지 피로가 아니다 — 2회');
  assert.equal(heavy.map((s) => s.weight).join(','), '30,45,55');

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

test('삭제된 세트법은 고를 수 없다 — override 로도 안 들어간다 (표에 없는 id)', () => {
  resetOverrides();
  ['myo_reps', 'top_backdown'].forEach((id) => {
    assert.equal(app.SET_SCHEMES[id], undefined, `${id}: 스킴 표에서 지워져야 한다`);
    assert.equal(app.setSetSchemeOverride('인클라인 덤벨 컬', id), false, `${id}: 저장을 거부해야 한다`);
    assert.equal(app.getSetScheme('인클라인 덤벨 컬'), 'straight');
  });
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

test('sets:0 은 "남은 워킹세트 없음" — 새 워킹세트를 만들지 않는다 (코드리뷰 회귀)', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '머신 레그 익스텐션', setsDetail: [set(40, 13), set(40, 13)] }] }]);

  // 스트레이트: 만들 게 없다
  const straight = app.getSessionSetPlan('머신 레그 익스텐션', null, '12-15', { sets: 0, warmup: false }).sets;
  assert.equal(straight.length, 0);

  // 드롭: 이미 끝낸 마지막 세트에 확장만 이어 붙인다 ("마지막 세트를 드롭으로"의 정확한 의미)
  app.setSetSchemeOverride('머신 레그 익스텐션', 'drop');
  const drop = app.getSessionSetPlan('머신 레그 익스텐션', null, '12-15', { sets: 0, warmup: false }).sets;
  assert.equal(drop.map((s) => s.role).join(','), 'drop,drop');
  resetOverrides();

  // opts.sets를 아예 안 주면 기본 3세트 (기존 동작)
  assert.equal(app.getSessionSetPlan('머신 레그 익스텐션', null, '12-15').sets.length, 3);
});

test('countWorkingSets: 옛 로그의 드롭·마이오렙 세트도 볼륨에서 뺀다 (코드리뷰 회귀)', () => {
  const rows = [
    { completed: true, isWarmup: false, role: 'work' },
    { completed: true, isWarmup: false, role: 'work' },
    { completed: true, isWarmup: false, role: 'work' },
    { completed: true, isWarmup: false, role: 'drop' },
    { completed: true, isWarmup: false, role: 'myo' },
    { completed: true, isWarmup: true, role: 'warmup' },
    { completed: false, isWarmup: false, role: 'work' }
  ];
  assert.equal(app.countWorkingSets(rows), 3);
  assert.equal(app.countWorkingSets(null), 0);
  // role이 없는 옛 데이터는 그대로 다 센다 (하위호환)
  assert.equal(app.countWorkingSets([{ completed: true, isWarmup: false }, { completed: true, isWarmup: false }]), 2);

  // 주간 볼륨 집계도 같은 규칙 — setsCount 없이 setsDetail만 있는 로그
  seedLog([{ date: daysAgo(1), exercises: [{ name: '머신 레그 익스텐션', setsDetail: [
    set(40, 13), set(40, 13), set(40, 13), set(30, 13, { role: 'drop' }), set(20, 13, { role: 'drop' })
  ] }] }]);
  assert.equal(app.getRecentVolumeSplitByPart(2).direct.quads, 3);
});

// ═══ 3-B. 세트법 개편 v2 — 탑세트 보정 3건 + 신규 스킴 3종 ═══

function heavySeed() {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '핵 스쿼트', setsDetail: [set(60, 8), set(60, 8)] }] }]);
}
function working(scheme, opts) {
  app.setSetSchemeOverride('핵 스쿼트', scheme);
  return app.getSessionSetPlan('핵 스쿼트', null, '5-8', opts || { sets: 3, warmup: false }).sets;
}

test('[보정①] 피더 단은 첫 워킹세트보다 가볍고, 자리가 없으면 넣지 않는다', () => {
  heavySeed();
  const warm = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3 }).sets.filter((s) => s.isWarmup);
  const work = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3 }).sets.filter((s) => !s.isWarmup);
  assert.equal(warm[warm.length - 1].weight, 55);
  assert.ok(warm[warm.length - 1].weight < work[0].weight, '피더는 첫 워킹세트보다 가벼워야 한다');
  assert.ok(warm[warm.length - 1].weight > warm[warm.length - 2].weight, '램프는 계속 올라가야 한다');

  // 20kg처럼 75% 단(15kg)과 90% 단(15kg)이 같은 칸이면 피더를 넣지 않는다
  seedLog([{ date: daysAgo(3), exercises: [{ name: '핵 스쿼트', setsDetail: [set(20, 8), set(20, 8)] }] }]);
  const low = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3 }).sets.filter((s) => s.isWarmup);
  assert.equal(low.length, 2, '격자에 자리가 없으면 램프는 2단 그대로');

  // 피라미드는 첫 워킹세트가 이미 85%라 피더가 들어갈 자리가 없다
  heavySeed();
  const pyr = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3 });
  app.setSetSchemeOverride('핵 스쿼트', 'pyramid');
  const pyr2 = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3 });
  assert.equal(pyr2.sets.filter((s) => s.isWarmup).length, 2, '피라미드엔 피더를 붙이지 않는다');
  assert.ok(pyr.sets.length > 0);
  resetOverrides();
});

test('[보정②] 마지막 백오프만 RIR 0~1, 앞 백오프는 2~3', () => {
  heavySeed();
  const rows = working('top_backoff');
  assert.equal(rows.map((s) => s.role).join(','), 'top,backoff,backoff');
  assert.equal(rows[0].rir, '1-2');
  assert.equal(rows[1].rir, '2-3');
  assert.equal(rows[2].rir, '0-1', '사용자가 원한 "한계까지 한 세트"를 볼륨 손실 없이 흡수한다');

  // 백오프가 1개뿐이면 그 하나가 곧 마지막 세트다
  const two = working('top_backoff', { sets: 2, warmup: false });
  assert.equal(two.map((s) => s.rir).join(','), '1-2,0-1');
  resetOverrides();
});

test('[보정③] 탑세트가 목표 미달이면 남은 백오프를 한 칸 더 내린다 (달성하면 그대로)', () => {
  heavySeed();
  const mk = () => ({
    name: '핵 스쿼트', scheme: 'top_backoff', targetReps: '5-8',
    sets: [
      { role: 'top', weight: 60, reps: 8, completed: true, isWarmup: false },
      { role: 'backoff', weight: 55, reps: 8, completed: false, isWarmup: false },
      { role: 'backoff', weight: 55, reps: 8, completed: false, isWarmup: false }
    ]
  });

  const ok = mk();
  assert.equal(app.applyTopSetAutoDeload(ok), 0, '상단 8회 달성 → 감량폭 유지');
  assert.equal(ok.sets[1].weight, 55);

  const missed = mk();
  missed.sets[0].reps = 6;                       // 상단(8) 미달
  assert.equal(app.applyTopSetAutoDeload(missed), 2);
  assert.equal(missed.sets[1].weight, 50, '60kg의 85% = 51 → 50 (평소 백오프 55보다 한 칸 아래)');
  assert.equal(missed.sets[2].weight, 50);
  assert.ok(missed.sets[1].autoDeloaded);

  // 이미 완료된 백오프는 건드리지 않는다 (기록 조작 금지)
  const partly = mk();
  partly.sets[0].reps = 6;
  partly.sets[1].completed = true;
  assert.equal(app.applyTopSetAutoDeload(partly), 1);
  assert.equal(partly.sets[1].weight, 55, '완료된 세트는 그대로');

  // 다른 스킴은 이 규칙을 갖고 있지 않다
  const other = mk();
  other.scheme = 'straight';
  other.sets[0].reps = 6;
  assert.equal(app.applyTopSetAutoDeload(other), 0);
  resetOverrides();
});

test('[신규] 피라미드의 반복 목표는 클래스 범위로 잘리지 않는다 (v2 §4-E 최대 함정)', () => {
  heavySeed();
  // compound_heavy 는 5~8회 클래스인데, 피라미드 첫 세트는 +4회(12회)여야 한다
  const py = working('pyramid');
  assert.equal(py.map((s) => s.reps).join(','), '12,10,8', 'R.high+4 → +2 → R.high');
  assert.ok(py[0].reps > app.EXERCISE_CLASS_RULES.compound_heavy.repMax);
  resetOverrides();
});

test('[신규] pyramid: 무게는 오르고 횟수는 줄고, 가장 무거운 마지막 세트가 탑세트다', () => {
  heavySeed();
  const rows = working('pyramid');
  assert.equal(rows.map((s) => s.role).join(','), 'work,work,top');
  assert.equal(rows.map((s) => s.weight).join(','), '50,55,60');
  assert.equal(rows.map((s) => s.reps).join(','), '12,10,8');
  assert.equal(rows.map((s) => s.rir).join(','), '3-4,2-3,0-1');
  assert.equal(app.SET_SCHEMES.pyramid.build.progressFrom, 'last', '증량 판정 기준 = 가장 무거운 마지막 세트');
  resetOverrides();
});

test('[신규] rpt: 첫 세트가 가장 무겁고 뒤로 갈수록 가볍고 길어진다', () => {
  heavySeed();
  const rows = working('rpt');
  assert.equal(rows.map((s) => s.role).join(','), 'top,work,work');
  assert.equal(rows.map((s) => s.weight).join(','), '60,55,50');
  assert.equal(rows.map((s) => s.reps).join(','), '8,10,12');
  rows.forEach((s) => assert.equal(s.rir, '0-2'));
  assert.equal(app.SET_SCHEMES.rpt.build.progressFrom, 'first');
  resetOverrides();
});

test('[신규] 세트 수가 3이 아니어도 핵심 세트(증량 판정 기준)는 살아남는다', () => {
  heavySeed();
  // 피라미드는 마지막(가장 무거운) 세트가 핵심 — 1세트만 남아도 탑세트여야 한다
  assert.equal(working('pyramid', { sets: 1, warmup: false }).map((s) => s.role).join(','), 'top');
  assert.equal(working('pyramid', { sets: 2, warmup: false }).map((s) => s.weight).join(','), '55,60');
  assert.equal(working('pyramid', { sets: 4, warmup: false }).map((s) => s.weight).join(','), '50,50,55,60');
  // 탑세트 계열은 첫 세트가 핵심
  assert.equal(working('rpt', { sets: 1, warmup: false }).map((s) => s.role).join(','), 'top');
  assert.equal(working('top_backoff', { sets: 1, warmup: false }).map((s) => s.role).join(','), 'top');
  assert.equal(working('top_backoff', { sets: 4, warmup: false }).map((s) => s.rir).join(','), '1-2,2-3,2-3,0-1');
  resetOverrides();
});

test('[신규] 무게를 모르는 종목은 감량 기반 스킴을 전부 스트레이트로 접는다 (표기 = 실제)', () => {
  resetOverrides();
  seedLog([]);
  app.storage.set(app.KEYS.ONE_RM_DATA, {});
  ['pyramid', 'rpt', 'top_backoff', 'drop'].forEach((id) => {
    assert.equal(app.schemeNeedsWeight(id), true, `${id}은 감량 기반 스킴`);
    app.setSetSchemeOverride('풀업', id);
    const plan = app.getSessionSetPlan('풀업', null, '본인 최대', { sets: 3 });
    assert.equal(plan.scheme, 'straight', `${id}: 감량 불가 종목에서 스트레이트로 접혀야 한다`);
    assert.ok(plan.sets.filter((s) => !s.isWarmup).every((s) => s.role === 'work'), `${id}: 세트도 스트레이트여야 한다`);
  });
  // 스트레이트는 감량 자체가 없으니 접을 것도 없다
  assert.equal(app.schemeNeedsWeight('straight'), false);
  resetOverrides();
});

test('[불변식] 세션 화면은 저장된 선택이 아니라 **실제 적용된** 세트법을 말한다', () => {
  resetOverrides();
  seedLog([]);
  app.storage.set(app.KEYS.ONE_RM_DATA, {});
  app.setSetSchemeOverride('풀업', 'pyramid');          // 무게를 모르는 종목 → 스트레이트로 접힌다
  const plan = app.getSessionSetPlan('풀업', null, '본인 최대', { sets: 3 });
  assert.equal(app.getSetScheme('풀업'), 'pyramid', '저장된 선택은 그대로 유지된다');
  assert.equal(plan.scheme, 'straight');
  assert.equal(app.sessionSchemeOf({ name: '풀업', scheme: plan.scheme }), 'straight',
    '화면이 "피라미드"라 써 놓고 스트레이트 세트를 보여 주면 안 된다');
  // scheme 필드가 없는 옛 세션은 저장된 선택으로 되돌아간다 (하위호환)
  assert.equal(app.sessionSchemeOf({ name: '풀업' }), 'pyramid');
  resetOverrides();
});

test('[옛 기록] 백다운은 볼륨에는 들어가고, 증량 판정·지난기록·1RM은 오염시키지 않는다', () => {
  resetOverrides();
  // 탑 60×8 2세션 연속 + 백다운 50×15 → 탑세트 기준으로 증량돼야 하고, 백다운 15회가 섞이면 안 된다
  seedLog([
    { date: daysAgo(3), exercises: [{ name: '핵 스쿼트', setsDetail: [
      set(60, 8, { role: 'top' }), set(50, 15, { role: 'backdown' }), set(50, 13, { role: 'backdown' })
    ] }] },
    { date: daysAgo(6), exercises: [{ name: '핵 스쿼트', setsDetail: [
      set(60, 8, { role: 'top' }), set(50, 14, { role: 'backdown' })
    ] }] }
  ]);
  const prog = app.getProgressiveRecommendation('핵 스쿼트', '5-8');
  assert.equal(prog.source, 'progress', '2세션 연속 탑세트 상단 → 증량');
  assert.equal(prog.weight, 65);
  assert.equal(prog.previousReps.join(','), '8', '백다운 반복이 "지난 기록"에 섞이면 다음 세션 목표가 튄다');

  // 두 제외 목록이 서로 다르다는 게 이 설계의 핵심 — 합치면 볼륨이 부풀거나 깎인다
  assert.equal(app.SET_ROLES_OFF_PROGRESS.slice().sort().join(','), 'backdown,drop,myo');
  assert.equal(app.SET_ROLES_EXTENSION.slice().sort().join(','), 'drop,myo');
  assert.equal(app.isSetExtension({ role: 'backdown' }), false, '백다운은 연장이 아니라 독립 워킹세트');
  assert.equal(app.isOffProgressSet({ role: 'backdown' }), true, '다만 진행 판정에서는 빠진다');

  // 볼륨(주간 세트 카운트)에는 백다운이 **들어간다** — 독립 워킹세트다 (v2 §3-C C-4)
  assert.equal(app.countWorkingSets([
    { completed: true, isWarmup: false, role: 'top' },
    { completed: true, isWarmup: false, role: 'backdown' },
    { completed: true, isWarmup: false, role: 'backdown' },
    { completed: true, isWarmup: false, role: 'drop' }
  ]), 3);

  // e1RM 근거에서는 빠진다 (드롭·마이오렙과 같은 규칙)
  seedLog([{ date: daysAgo(2), exercises: [{ name: '핵 스쿼트', setsDetail: [
    set(60, 8, { role: 'top' }), set(50, 12, { role: 'backdown' })
  ] }] }]);
  assert.equal(app.calculateRollingMax1RM('핵 스쿼트').value, app.calculate1RM(60, 8), '탑세트만 반영');
  seedLog([]);
});

test('[신규] 세트법 시트에 5종이 뜨고, 근거상 주의는 warn으로 알려준다', () => {
  resetOverrides();
  // vm 컨텍스트의 배열은 프로토타입 출신이 달라 deepEqual 이 실패한다 → 문자열로 비교 (하네스 주석 참조)
  const ids = app.getSetSchemeOptions('핵 스쿼트').map((o) => o.id).join(',');
  assert.equal(ids, 'straight,top_backoff,pyramid,rpt,drop');

  const byId = {};
  app.getSetSchemeOptions('핵 스쿼트').forEach((o) => { byId[o.id] = o; });
  assert.equal(byId.top_backoff.suggested, true, '고중량 복합 기본값은 그대로 탑세트');
  assert.equal(byId.top_backoff.kr, '탑세트', '표시명은 탑세트 하나로 줄인다');
  assert.equal(byId.pyramid.suggested, false, '나머지는 기본 배정하지 않는다 (근비대 차이 0)');
  assert.ok(byId.pyramid.warn);
  assert.ok(byId.drop.warn);
  // warn 문구가 사라진 세트법을 대안으로 권하면 안 된다
  Object.keys(byId).forEach((id) => {
    assert.equal(byId[id].warn.indexOf('마이오렙'), -1, `${id}: 없는 세트법을 권하고 있다`);
    assert.equal(byId[id].warn.indexOf('백다운'), -1, `${id}: 없는 세트법을 권하고 있다`);
  });

  // 재활은 여전히 스트레이트 하나뿐
  assert.equal(app.getSetSchemeOptions('페이스 풀').length, 1);

  // 어시스트 종목은 % 설명이 정반대로 읽히므로 '보조' 문구로 바꿔 준다
  app.getSetSchemeOptions('어시스트 풀업').forEach((o) => {
    if (app.REVERSE_SCHEME_DESC[o.id]) assert.ok(o.desc.indexOf('보조') >= 0, `${o.id} 설명이 보조 기준이어야 한다`);
  });
});

test('[신규] 어시스트 종목: 새 스킴도 보조가 늘어나는 방향으로 만들어지고, 설명이 "칸"으로 뒤집힌다', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '어시스트 풀업', setsDetail: [set(30, 8), set(30, 8)] }] }]);
  ['top_backoff', 'pyramid', 'rpt'].forEach((id) => {
    app.setSetSchemeOverride('어시스트 풀업', id);
    const plan = app.getSessionSetPlan('어시스트 풀업', null, '5-8', { sets: 3 });
    const work = plan.sets.filter((s) => !s.isWarmup);
    const top = work.filter((s) => s.role === 'top')[0];
    assert.ok(top, `${id}: 탑세트가 있어야 한다`);
    work.forEach((s) => {
      if (s.role === 'top') return;
      assert.ok(s.weight > top.weight, `${id}: 가벼운 세트 = 보조가 더 많은 세트여야 한다 (${s.weight} vs 탑 ${top.weight})`);
    });
    // 무게 %가 아니라 '보조 N칸'으로 적어야 정반대로 읽히지 않는다
    const line = app.describeSetStructure(plan.sets, '어시스트 풀업');
    assert.ok(line.indexOf('보조') >= 0 && line.indexOf('%') === -1, `${id}: "${line}" — 보조 종목에 %를 적으면 안 된다`);
  });
  resetOverrides();
  seedLog([]);
});

test('[신규] SET_SCHEMES 표 자체의 무결성 (pct 범위·rir 형식·role 뱃지 등록)', () => {
  Object.keys(app.SET_SCHEMES).forEach((id) => {
    const s = app.SET_SCHEMES[id];
    assert.ok(s.kr && s.short && s.desc, `${id}: kr/short/desc 필수`);
    assert.ok(s.desc.length <= 40, `${id}: 설명 40자 이내 (디자인 규칙) — ${s.desc.length}자`);
    assert.ok(!/(합니다|됩니다|입니다)/.test(s.desc), `${id}: 해요체로 통일 (디자인 규칙)`);
    assert.ok(s.build && ['uniform', 'ramp', 'extend'].indexOf(s.build.pattern) >= 0, `${id}: 알 수 없는 pattern`);
    (s.build.steps || []).forEach((st, i) => {
      assert.ok(typeof st.pct === 'number' && st.pct > 0 && st.pct <= 1, `${id}[${i}]: pct는 0~1`);
      assert.ok(typeof st.role === 'string' && app.SET_ROLE_KR[st.role] !== undefined,
        `${id}[${i}]: role '${st.role}'이 SET_ROLE_KR에 없다 — 뱃지가 안 그려진다`);
      assert.ok(/^\d(-\d)?$/.test(st.rir), `${id}[${i}]: rir 형식 '${st.rir}'`);
      if (st.repsAbs) assert.ok(Array.isArray(st.repsAbs) && st.repsAbs[0] <= st.repsAbs[1], `${id}[${i}]: repsAbs`);
    });
  });
  // 시트 순서 목록과 스킴 표가 서로 빠짐없이 대응한다
  assert.equal(app.SET_SCHEME_ORDER.slice().sort().join(','), Object.keys(app.SET_SCHEMES).sort().join(','));
});

test('[신규] "세트 추가"가 스킴이 정한 다음 단을 이어 붙인다 (탑 → 백오프)', () => {
  heavySeed();
  const expected = {
    top_backoff:  'top:60x8/180 backoff:55x8/180 backoff:55x8/180'
  };
  Object.keys(expected).forEach((sc) => {
    app.setSetSchemeOverride('핵 스쿼트', sc);
    const plan = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3, warmup: false });
    app.state.activeSession = {
      currentExerciseIdx: 0,
      exercises: [{ name: '핵 스쿼트', targetReps: '5-8', scheme: plan.scheme, sets: [plan.sets[0]] }]
    };
    app.addSetToExercise(0);   // 탑세트 뒤 → 스킴이 정한 단
    app.addSetToExercise(0);   // 그 뒤 → 같은 단이 이어진다 (휴식·한계반복 표기까지)
    const got = app.state.activeSession.exercises[0].sets
      .map((s) => `${s.role}:${s.weight}x${s.reps}${s.amrap ? '~' + s.repsMax : ''}/${s.rest}`).join(' ');
    assert.equal(got, expected[sc].replace('60x8~15', '60x8'), sc);
  });
  app.state.activeSession = null;
  resetOverrides();
});

test('[불변식] 미리보기 처방 표와 실제 세션 세트의 무게·반복이 같다 (반올림 포함)', () => {
  heavySeed();
  app.SET_SCHEME_ORDER.forEach((id) => {
    app.setSetSchemeOverride('핵 스쿼트', id);
    const preview = app.getRoutinePreviewPlan({ name: '핵 스쿼트', reps: '5-8', sets: 3 });
    const session = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3, warmup: true });
    const strip = (rows) => rows.filter((s) => !s.isWarmup).map((s) => s.role + ':' + s.weight + 'x' + s.reps);
    assert.deepEqual(strip(preview.sets), strip(session.sets), `${id}: 표와 세션이 어긋난다`);
    assert.equal(preview.weight, session.weight, `${id}: 추천 카드 무게가 어긋난다`);

    // 세트 구성 한 줄도 실제 배열에서 나온다
    const line = app.describeSetStructure(preview.sets, '핵 스쿼트');
    if (id !== 'straight') assert.ok(line.length > 0, `${id}: 세트 구성 문구가 비었다`);
  });
  resetOverrides();
});

test('[불변식] 전 스킴 × 전 클래스 × 무게 3~200kg × 세트 1~6 전수 — 세트 배열이 항상 말이 된다', () => {
  resetOverrides();
  seedLog([]);
  const names = ['핵 스쿼트', '레그 프레스', '머신 레그 익스텐션', '덤벨 사이드 레터럴 레이즈',
                 '덤벨 벤치 프레스', '해머 컬', '어시스트 풀업'];
  const bad = [];
  let checked = 0;

  names.forEach((name) => {
    const rev = app.isReverseProgression(name);
    const step = app.getWeightIncrement(name);
    const rules = app.EXERCISE_CLASS_RULES[app.getExerciseClass(name)];
    const range = { low: rules.repMin, high: rules.repMax };
    // 역방향은 "가볍다 = 보조가 많다" 라 모든 비교가 뒤집힌다
    const easier = (a, b) => (rev ? a > b : a < b);

    app.SET_SCHEME_ORDER.forEach((sc) => {
      for (let w = step * 3; w <= 200; w += step) {
        [1, 2, 3, 4, 6].forEach((n) => {
          checked++;
          const where = `${name}/${sc} w=${w} n=${n}`;
          const rows = app.buildSchemeSets(name, w, range.low, range, sc, { sets: n, warmup: true });
          const work = rows.filter((s) => !s.isWarmup);
          const warm = rows.filter((s) => s.isWarmup);

          rows.forEach((s) => {
            if (typeof s.weight !== 'number') return;
            if (Math.abs(s.weight % step) > 1e-9) bad.push(`${where}: ${s.weight}kg 가 ${step}kg 격자 밖 (소수점 금지)`);
            if (s.weight < 0) bad.push(`${where}: 음수 무게 ${s.weight}`);
            if (!(s.reps >= 1)) bad.push(`${where}: 반복 ${s.reps}`);
            if (!(s.rest > 0)) bad.push(`${where}: 휴식 ${s.rest}`);
          });

          // 감량 세트는 탑세트보다 반드시 쉽다
          const top = work.filter((s) => s.role === 'top')[0];
          if (top && top.weight > 0) {
            work.forEach((s) => {
              if (s.role === 'top' || typeof s.weight !== 'number') return;
              if (!easier(s.weight, top.weight)) bad.push(`${where}: ${s.role} ${s.weight} 가 탑 ${top.weight} 보다 안 쉽다`);
            });
          }

          // 사다리의 서로 다른 배율 단은 서로 다른 무게여야 한다 (반올림 뭉개짐 방지)
          const byPct = {};
          work.forEach((s) => { if (typeof s.pct === 'number') byPct[s.pct] = s.weight; });
          const ks = Object.keys(byPct).map(Number).sort((a, b) => b - a);
          for (let i = 1; i < ks.length; i++) {
            if (!easier(byPct[ks[i]], byPct[ks[i - 1]])) bad.push(`${where}: ${ks[i - 1]}·${ks[i]} 단이 같은 무게(${byPct[ks[i]]})로 뭉갰다`);
          }

          // 워밍업은 첫 워킹세트보다 쉽고, 램프는 계속 올라간다
          if (warm.length && work.length && typeof work[0].weight === 'number') {
            warm.forEach((s) => {
              if (!easier(s.weight, work[0].weight)) bad.push(`${where}: 워밍업 ${s.weight} 이 첫 워킹세트 ${work[0].weight} 보다 안 쉽다`);
            });
            for (let i = 1; i < warm.length; i++) {
              if (easier(warm[i].weight, warm[i - 1].weight)) bad.push(`${where}: 램프가 거꾸로 간다 (${warm[i - 1].weight} → ${warm[i].weight})`);
            }
          }
        });
      }
    });
  });

  // 스킴 5종 × 종목 7 × 무게대 × 세트 수 = 약 11,150 조합. 스킴을 지워도 이 검사가 헛돌면 안 된다.
  assert.ok(checked > 10000, `전수 검사 조합이 너무 적다: ${checked}`);
  assert.equal(bad.slice(0, 5).join(' | '), '', `${bad.length}건 위반 (앞 5건만 표시)`);
});

// ═══ 3-C. 코드리뷰에서 나온 회귀 (Codex) ═══

test('[리뷰] 한 스텝 아래가 없는 최저 중량은 감량 스킴을 접는다 (탑 5 / 백오프 5 / 백오프 5 방지)', () => {
  resetOverrides();
  const range = { low: 5, high: 8 };
  // 5kg 격자의 5kg · 덤벨 2kg 격자의 2kg = 아래가 0kg뿐 → 백오프가 탑과 같은 무게가 된다
  assert.equal(app.canReduceWeight('핵 스쿼트', 5), false);
  assert.equal(app.canReduceWeight('핵 스쿼트', 10), true);
  assert.equal(app.canReduceWeight('덤벨 벤치 프레스', 2), false);
  assert.equal(app.canReduceWeight('덤벨 벤치 프레스', 4), true);
  assert.equal(app.canReduceWeight('어시스트 풀업', 0), true, '보조는 늘리는 방향이라 바닥이 없다');

  const roles = (name, w) => app.buildSchemeSets(name, w, 8, range, 'top_backoff', { sets: 3, warmup: false })
    .map((s) => s.role + ':' + s.weight).join(' ');
  assert.equal(roles('핵 스쿼트', 5), 'work:5 work:5 work:5', '접혀서 스트레이트가 되어야 한다');
  assert.equal(roles('핵 스쿼트', 10), 'top:10 backoff:5 backoff:5');
  assert.equal(roles('덤벨 벤치 프레스', 2), 'work:2 work:2 work:2');
  assert.equal(roles('덤벨 벤치 프레스', 4), 'top:4 backoff:2 backoff:2');
  assert.equal(app.effectiveSetScheme('핵 스쿼트', 5), 'straight', '표기도 같이 접힌다 (표 = 세션)');
});

test('[리뷰] 어시스트 감량도 격자 위에 떨어지고, 보조 무게를 모르면 만들어내지 않는다', () => {
  // 기록에 격자 밖 보조(32kg)가 남아 있어도 결과는 5kg 격자여야 실행 가능하다
  const ladder = app.buildWeightLadder('어시스트 풀업', 32, [1, 0.9, 0.8]);
  assert.equal(ladder[0.9] % 5, 0, `보조 ${ladder[0.9]}kg 이 격자 밖`);
  assert.equal(ladder[0.8] % 5, 0);
  assert.ok(ladder[0.9] > 32 && ladder[0.8] > ladder[0.9], '보조는 단마다 늘어난다');

  // 보조를 모르면(null) 감량도 null — 탑은 '—' 인데 백오프만 5kg으로 뜨면 안 된다
  assert.equal(app.reduceWeight(null, 0.9, '어시스트 풀업'), null);
  const rows = app.buildSchemeSets('어시스트 풀업', null, 8, { low: 5, high: 8 }, 'top_backoff', { sets: 3, warmup: false });
  assert.ok(rows.every((s) => s.weight === null), '전 세트가 무게 미정이어야 한다: ' + JSON.stringify(rows.map((s) => s.weight)));
});

test('[리뷰] 처방 표 반복 열이 클래스 범위 밖 목표를 감추지 않는다', () => {
  heavySeed();
  const repsCol = (sc) => {
    app.setSetSchemeOverride('핵 스쿼트', sc);
    const plan = app.getRoutinePreviewPlan({ name: '핵 스쿼트', reps: '5-8', sets: 3 });
    return { shown: app.buildPrescriptionValues({ name: '핵 스쿼트' }, plan).reps, plan: plan };
  };
  // 클래스 범위(5-8) 안에서 끝나는 스킴은 기존 표기 그대로
  assert.equal(repsCol('straight').shown, '5-8');
  assert.equal(repsCol('top_backoff').shown, '5-8');
  // 피라미드(+4)는 5-8 이라 써 놓으면 실제 세트를 하나도 안 담는다
  assert.equal(repsCol('pyramid').shown, '8-12');
  assert.equal(repsCol('rpt').shown, '8-12');

  // 적힌 폭이 실제 워킹세트를 전부 담는지 (표 = 세션)
  ['pyramid', 'rpt'].forEach((sc) => {
    const r = repsCol(sc);
    const bounds = r.shown.split('-').map(Number);
    r.plan.sets.filter((s) => !s.isWarmup && !app.isSetExtension(s)).forEach((s) => {
      const hi = s.amrap && s.repsMax ? s.repsMax : s.reps;
      assert.ok(s.reps >= bounds[0] && hi <= bounds[1], `${sc}: ${s.reps}회 세트가 표기 ${r.shown} 밖`);
    });
  });
  resetOverrides();
});

test('[리뷰·옛 기록] 휴식 자가조절이 백다운의 자기 목표(12회)를 기준으로 본다', () => {
  const ex = { name: '핵 스쿼트', targetReps: '5-8' };
  // 클래스 하한(5회)으로 보면 백다운 4회도 "달성"으로 잡혀 +30초가 안 붙는다
  assert.equal(app.resolveRestSec(ex, { reps: 4, rest: 120, role: 'backdown', repsMin: 12 }), 150);
  assert.equal(app.resolveRestSec(ex, { reps: 13, rest: 120, role: 'backdown', repsMin: 12 }), 120);
  // 드롭·마이오렙의 짧은 휴식은 그 스킴의 정의라 여전히 자가조절 대상이 아니다
  assert.equal(app.resolveRestSec({ name: '머신 레그 익스텐션', targetReps: '12-15' }, { reps: 5, rest: 10, role: 'drop' }), 10);
  // repsMin 이 없는 옛 세션은 클래스 하한으로 되돌아간다 (하위호환)
  assert.equal(app.resolveRestSec(ex, { reps: 4, role: 'backoff' }), 210);
});

test('[리뷰] 자가조절은 클래스 상한이 아니라 **그 세트에 처방된 목표**와 비교한다', () => {
  resetOverrides();
  const mk = (topReps) => ({
    name: '핵 스쿼트', scheme: 'top_backoff', targetReps: '5-8',
    sets: [
      { role: 'top', weight: 100, reps: topReps, repsTarget: 5, completed: true, isWarmup: false },
      { role: 'backoff', weight: 90, reps: 5, completed: false, isWarmup: false },
      { role: 'backoff', weight: 90, reps: 5, completed: false, isWarmup: false }
    ]
  });
  // 증량 직후 탑세트 처방은 범위 하단(5회)이다. 상한(8)과 비교하면 목표를 채운 날에도 감량이 발동한다.
  const hit = mk(5);
  assert.equal(app.applyTopSetAutoDeload(hit), 0, '처방 5회를 채웠는데 감량이 발동했다');
  assert.equal(hit.sets.map((s) => s.weight).join(','), '100,90,90');

  const missed = mk(3);
  assert.equal(app.applyTopSetAutoDeload(missed), 2);
  assert.equal(missed.sets.map((s) => s.weight).join(','), '100,85,85');

  // repsTarget 이 없는 옛 세션은 클래스 상한으로 되돌아간다 (하위호환)
  const old = mk(8);
  delete old.sets[0].repsTarget;
  assert.equal(app.applyTopSetAutoDeload(old), 0);
});

test('[리뷰] 자가조절은 양방향 — 반복 수를 고쳐 저장하면 감량도 되돌아온다', () => {
  resetOverrides();
  const ex = {
    name: '핵 스쿼트', scheme: 'top_backoff', targetReps: '5-8',
    sets: [
      { role: 'top', weight: 100, reps: 3, repsTarget: 5, completed: true, isWarmup: false },
      { role: 'backoff', weight: 90, reps: 5, completed: false, isWarmup: false },
      { role: 'backoff', weight: 90, reps: 5, completed: false, isWarmup: false }
    ]
  };
  assert.equal(app.applyTopSetAutoDeload(ex), 2);
  assert.equal(ex.sets[1].weight, 85);
  assert.equal(ex.sets[1].autoDeloaded, true);

  ex.sets[0].reps = 5;                                   // 잘못 입력한 걸 고쳐 저장
  assert.equal(app.applyTopSetAutoDeload(ex), 2, '되돌릴 길이 없으면 남은 세트 내내 가볍게 든다');
  assert.equal(ex.sets.map((s) => s.weight).join(','), '100,90,90');
  assert.equal(ex.sets[1].autoDeloaded, undefined);

  // 사용자가 직접 고친 무게는 자동 조정이 건드리지 않는다
  const manual = {
    name: '핵 스쿼트', scheme: 'top_backoff', targetReps: '5-8',
    sets: [
      { role: 'top', weight: 100, reps: 3, repsTarget: 5, completed: true, isWarmup: false },
      { role: 'backoff', weight: 80, reps: 5, completed: false, isWarmup: false }
    ]
  };
  app.applyTopSetAutoDeload(manual);
  assert.equal(manual.sets[1].weight, 80, '손으로 정한 무게를 덮어쓰면 안 된다');
});

test('[리뷰] 덤벨 격자는 종목표에 정확히 등록된 이름에서만 온다 (퍼지 매칭 금지)', () => {
  // getExerciseEquipment 는 미등록 이름을 부분 문자열로 추정한다 — 그 경로를 타면
  // '케이블 풀오버'가 덤벨 종목 '풀오버'에 걸려 5kg 스택 머신이 2kg 격자가 된다.
  assert.equal(app.getWeightIncrement('풀오버'), 2, '등록된 덤벨 종목');
  assert.equal(app.getWeightIncrement('케이블 풀오버'), 5, '케이블은 5kg 격자여야 한다');
  assert.equal(app.getWeightIncrement('머신 풀오버'), 5);
  assert.equal(app.getWeightIncrement('케이블 해머 컬'), 5);
  assert.equal(app.getWeightIncrement('덤벨 해머 컬'), 2, "이름에 '덤벨'이 있으면 그대로 덤벨");
  assert.equal(app.getWeightIncrement('랫 풀 다운'), 5);
});

test('[리뷰] 고중량 복합은 어떤 세트법이든 워밍업 램프를 잃지 않는다', () => {
  resetOverrides();
  const range = { low: 5, high: 8 };
  [20, 30, 40, 60, 100].forEach((w) => {
    ['top_backoff', 'pyramid', 'rpt'].forEach((sc) => {
      const rows = app.buildSchemeSets('핵 스쿼트', w, 8, range, sc, { sets: 3, warmup: true });
      const warm = rows.filter((s) => s.isWarmup);
      const work = rows.filter((s) => !s.isWarmup);
      assert.ok(warm.length >= 1, `${sc} ${w}kg: 워밍업이 통째로 사라졌다`);
      warm.forEach((s) => assert.ok(s.weight < work[0].weight,
        `${sc} ${w}kg: 워밍업 ${s.weight} 이 첫 워킹세트 ${work[0].weight} 보다 안 가볍다`));
    });
  });
});

test('[리뷰] 사다리 단이 격자에 다 안 들어가면 그 스킴을 접는다 (10,5,5 피라미드 방지)', () => {
  resetOverrides();
  const range = { low: 5, high: 8 };
  // 피라미드는 85%·92.5% 두 단이 필요하다 → 5kg 격자에서 최소 15kg
  assert.equal(app.schemeReductionRungs('pyramid'), 2);
  assert.equal(app.schemeReductionRungs('top_backoff'), 1, '백오프는 한 단만 필요');
  const w = (weight, sc) => app.buildSchemeSets('핵 스쿼트', weight, 8, range, sc, { sets: 3, warmup: false })
    .map((s) => s.weight).join(',');
  assert.equal(w(10, 'pyramid'), '10,10,10', '단이 안 들어가면 스트레이트로 접힌다');
  assert.equal(w(15, 'pyramid'), '5,10,15');
  assert.equal(w(10, 'top_backoff'), '10,5,5', '백오프는 한 단이면 되니 10kg에서도 성립');
});

test('[리뷰] "세트 추가"가 연장 세트의 짧은 휴식을 물려받지 않는다', () => {
  resetOverrides();
  seedLog([{ date: daysAgo(3), exercises: [{ name: '머신 레그 익스텐션', setsDetail: [set(40, 13), set(40, 13)] }] }]);
  ['drop'].forEach((sc) => {
    app.setSetSchemeOverride('머신 레그 익스텐션', sc);
    const plan = app.getSessionSetPlan('머신 레그 익스텐션', null, '12-15', { sets: 3, warmup: false });
    app.state.activeSession = {
      currentExerciseIdx: 0,
      exercises: [{ name: '머신 레그 익스텐션', targetReps: '12-15', scheme: plan.scheme, sets: plan.sets }]
    };
    app.addSetToExercise(0);
    const added = app.state.activeSession.exercises[0].sets.filter((s) => !s.completed && s.role === 'work').pop();
    assert.equal(added.rest, 120, `${sc}: 추가한 본 세트가 연장 간격(10~20초)을 물려받았다`);
  });
  app.state.activeSession = null;
  resetOverrides();
});

test('[리뷰] "세트 추가"가 스킴의 repsDelta 를 반영한다 (역피라미드 +2)', () => {
  heavySeed();
  app.setSetSchemeOverride('핵 스쿼트', 'rpt');
  const plan = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3, warmup: false });
  app.state.activeSession = {
    currentExerciseIdx: 0,
    exercises: [{ name: '핵 스쿼트', targetReps: '5-8', scheme: plan.scheme, sets: [plan.sets[0]] }]
  };
  app.state.activeSession.exercises[0].sets[0].reps = 8;   // 탑세트 실제 수행
  app.addSetToExercise(0);
  const added = app.state.activeSession.exercises[0].sets[1];
  assert.equal(added.weight, 55, '역피라미드 2세트는 탑의 90%');
  assert.equal(added.reps, 10, '무게가 내려가면 횟수는 올라간다 (+2) — 그게 RPT의 전부다');
  app.state.activeSession = null;
  resetOverrides();
});

test('[리뷰] 처방 표 한 줄이 전부 같은 기준 세트를 가리킨다', () => {
  heavySeed();
  app.SET_SCHEME_ORDER.forEach((sc) => {
    app.setSetSchemeOverride('핵 스쿼트', sc);
    const plan = app.getRoutinePreviewPlan({ name: '핵 스쿼트', reps: '5-8', sets: 3 });
    const p = app.buildPrescriptionValues({ name: '핵 스쿼트' }, plan);
    const working = plan.sets.filter((s) => !s.isWarmup);
    const anchor = working.reduce((a, s) => (s.weight > a.weight ? s : a), working[0]);
    assert.equal(p.weight, anchor.weight, `${sc}: '무게' 열이 기준 세트와 다르다`);
    assert.equal(p.rir, anchor.rir, `${sc}: 'RIR' 열이 다른 세트를 가리킨다`);
    assert.equal(p.rest, app.restSecToMin(anchor.rest), `${sc}: '휴식' 열이 다른 세트를 가리킨다`);
  });
  resetOverrides();
});

test('[리뷰] 마지막 백오프의 RIR 0~1 처방이 화면에 드러난다', () => {
  heavySeed();
  app.setSetSchemeOverride('핵 스쿼트', 'top_backoff');
  const plan = app.getRoutinePreviewPlan({ name: '핵 스쿼트', reps: '5-8', sets: 3 });
  const line = app.describeSetStructure(plan.sets, '핵 스쿼트');
  assert.ok(line.indexOf('0-1') >= 0, `마지막 백오프 처방이 어디에도 안 뜬다: "${line}"`);
  assert.equal(line, '탑세트 1 + 백오프 2 (90% · RIR 2-3→0-1)');
  resetOverrides();
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

test('[옛 기록] 마이오렙 미니세트가 증량 판정을 막지 않는다 (같은 무게 5회가 상단 미달로 잡히면 안 됨)', () => {
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

test('드롭·마이오렙 세트는 rolling 1RM 근거에서도 빠진다 (세 경로가 같은 규칙)', () => {
  resetOverrides();
  // 경량 고립: 워킹세트 20회는 e1RM 반복 상한(12)에 걸려 빠진다.
  // 미니세트(5회)를 막지 않으면 지친 미니세트가 그 종목의 **유일한** e1RM 근거가 되는 역전이 생긴다.
  seedLog([
    { date: daysAgo(2), exercises: [{ name: '덤벨 사이드 레터럴 레이즈', setsDetail: [
      set(8, 20), set(8, 20),
      set(8, 5, { role: 'myo' })
    ] }] }
  ]);
  assert.equal(app.calculateRollingMax1RM('덤벨 사이드 레터럴 레이즈'), null);

  // 드롭 세트도 마찬가지 — 감량된 무게의 e1RM이 기록으로 남으면 안 된다
  seedLog([
    { date: daysAgo(2), exercises: [{ name: '머신 레그 익스텐션', setsDetail: [
      set(40, 12), set(30, 12, { role: 'drop' })
    ] }] }
  ]);
  const roll = app.calculateRollingMax1RM('머신 레그 익스텐션');
  assert.equal(roll.value, app.calculate1RM(40, 12), '본 세트만 반영');
  seedLog([]);
});

// ═══ 6. 길항근 슈퍼세트 (Zhang 2025) ═══

test('슈퍼세트: 길항 관계 + 머신·케이블 조합만 페어로 묶는다', () => {
  seedLog([]);
  const pairs = app.buildSupersetSuggestions([
    { name: '머신 펙 덱 플라이' },     // chest (고립)
    { name: '케이블 암 풀 다운' },     // lats (고립) — 길항 ✅
    { name: '덤벨 사이드 레터럴 레이즈' } // 덤벨 = 프리웨이트 → 제외
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a + ',' + pairs[0].b, '0,1');
});

test('슈퍼세트: 같은 근육끼리(가슴 → 삼두)는 묶지 않는다 — 볼륨 로드가 떨어진다', () => {
  seedLog([]);
  const pairs = app.buildSupersetSuggestions([
    { name: '머신 펙 덱 플라이' },
    { name: '케이블 푸시 다운' }
  ]);
  assert.equal(pairs.length, 0);
});

test('슈퍼세트: 고립·경량 고립만 묶는다 (복합은 전부 제외 — 뒤 종목 반복이 무너진다)', () => {
  seedLog([]);
  assert.equal(app.canSupersetExercise('핵 스쿼트'), false, '고중량 복합 + 축성 부하 high');
  assert.equal(app.canSupersetExercise('머신 체스트 프레스'), false, '중강도 복합도 제외');
  assert.equal(app.canSupersetExercise('레그 프레스'), false, '중강도 복합도 제외');
  assert.equal(app.canSupersetExercise('랫 풀 다운'), false, '중강도 복합도 제외');
  assert.equal(app.canSupersetExercise('페이스 풀'), false, '재활 종목');
  assert.equal(app.canSupersetExercise('머신 레그 익스텐션'), true, '고립');
  assert.equal(app.canSupersetExercise('힙 어덕션'), true, '경량 고립');
  assert.equal(app.canSupersetExercise('인클라인 덤벨 컬'), false, '고립이어도 프리웨이트는 제외');
  assert.equal(app.getExerciseAxialLoad('핵 스쿼트'), 'high');
  assert.equal(app.getExerciseAxialLoad('머신 레그 익스텐션'), 'low');
});

test('슈퍼세트: 세션당 2페어까지만 제안한다 (RPE·대사 스트레스가 높다)', () => {
  seedLog([]);
  const pairs = app.buildSupersetSuggestions([
    { name: '머신 펙 덱 플라이' }, { name: '케이블 암 풀 다운' },
    { name: '머신 레그 익스텐션' }, { name: '시티드 레그 컬' },
    { name: '케이블 컬' }, { name: '케이블 푸시 다운' }
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
  // 0번(레그 익스텐션·사두)도 2번(레그컬·햄)과 길항이지만, 인접한 1↔2가 우선이어야 한다
  const pairs = app.buildSupersetSuggestions([
    { name: '레그 익스텐션' }, { name: '머신 레그 익스텐션' }, { name: '시티드 레그 컬' }
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a + ',' + pairs[0].b, '1,2');
});

test('applySupersetSuggestions: 양쪽 종목에 페어 정보를 얹는다', () => {
  seedLog([]);
  const exercises = [{ name: '머신 펙 덱 플라이' }, { name: '케이블 암 풀 다운' }];
  app.applySupersetSuggestions(exercises);
  assert.equal(exercises[0].supersetWith, 1);
  assert.equal(exercises[1].supersetWith, 0);
  assert.ok(exercises[0].supersetKr.includes('↔'));
});

// ═══ 7. 강도 기법 자동 제안은 삭제됐다 ═══
// 드롭세트 제안 카드(제안 → 수락/거절)와 판정 함수 3종을 통째로 뺐다. 근거상 이득이 시간뿐이라
// 앱이 먼저 권할 이유가 없었고, 세트법은 사용자가 세트법 시트에서 직접 고른다.

test('강도 기법 자동 제안 함수가 남아 있지 않다 (기능 삭제 — 되살아나면 UI 없는 죽은 코드)', () => {
  ['suggestIntensityTechnique', 'isSessionTimePressured', 'intensityTechniqueCountThisWeek']
    .forEach((fn) => assert.equal(typeof app[fn], 'undefined', `${fn}: 삭제된 함수가 되살아났다`));
  // 드롭세트 자체는 세트법으로 남아 있다 — 사라진 건 "앱이 먼저 권하는" 흐름뿐이다
  assert.ok(app.SET_SCHEMES.drop, '드롭세트 세트법까지 지우면 안 된다');
  assert.ok(app.SET_SCHEME_ORDER.indexOf('drop') >= 0, '세트법 시트에는 계속 뜬다');
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

// ═══ 10. 삭제된 세트법 이관 (core.js migrateSetSchemeData) ═══
// 이관하지 않으면 ① 종목별 사용자 선택이 조용히 클래스 기본값으로 되돌아가고
// ② 진행 중 세션의 scheme 이 표에 없는 id라 화면이 세트법을 못 읽는다.

test('[이관] 이관표가 가리키는 곳은 살아 있는 세트법이다', () => {
  Object.keys(app.SET_SCHEME_MIGRATIONS).forEach((from) => {
    assert.equal(app.SET_SCHEMES[from], undefined, `${from}: 아직 스킴 표에 남아 있다`);
    assert.ok(app.SET_SCHEMES[app.SET_SCHEME_MIGRATIONS[from]], `${from}: 이관 대상이 표에 없다`);
  });
  assert.equal(app.SET_SCHEME_MIGRATIONS.top_backdown, 'top_backoff');
  assert.equal(app.SET_SCHEME_MIGRATIONS.myo_reps, 'straight');
});

test('[이관] 저장된 종목별 선택을 갈아 끼운다 · 살아 있는 값은 그대로 · 멱등', () => {
  resetOverrides();
  app.storage.set(app.KEYS.SET_SCHEMES, {
    '핵 스쿼트': 'top_backdown',
    '머신 레그 익스텐션': 'myo_reps',
    '레그 프레스': 'drop'
  });
  assert.equal(app.migrateSetSchemeData(), 2, '바꾼 값의 개수를 돌려준다');

  const saved = app.storage.get(app.KEYS.SET_SCHEMES, {});
  assert.equal(saved['핵 스쿼트'], 'top_backoff');
  assert.equal(saved['머신 레그 익스텐션'], 'straight');
  assert.equal(saved['레그 프레스'], 'drop', '살아 있는 선택은 건드리지 않는다');
  assert.equal(app.getSetScheme('핵 스쿼트'), 'top_backoff', '이관 전이면 클래스 기본값으로 되돌아갔을 값');

  assert.equal(app.migrateSetSchemeData(), 0, '두 번째 실행은 바꿀 게 없다');
  resetOverrides();
});

test('[이관] 진행 중 세션의 세트법도 갈아 끼우되, 이미 기록된 세트는 건드리지 않는다', () => {
  resetOverrides();
  app.storage.set(app.KEYS.ACTIVE_SESSION, {
    startTime: Date.now(),
    exercises: [
      { name: '핵 스쿼트', scheme: 'top_backdown',
        sets: [{ role: 'top', weight: 60, reps: 8, completed: true, isWarmup: false },
               { role: 'backdown', weight: 50, reps: 12, completed: false, isWarmup: false }] },
      { name: '머신 레그 익스텐션', scheme: 'myo_reps', sets: [] },
      { name: '레그 프레스', scheme: 'straight', sets: [] }
    ]
  });
  assert.equal(app.migrateSetSchemeData(), 2);

  const s = app.storage.get(app.KEYS.ACTIVE_SESSION);
  assert.equal(s.exercises.map((e) => e.scheme).join(','), 'top_backoff,straight,straight');
  assert.equal(app.sessionSchemeOf(s.exercises[0]), 'top_backoff', '화면이 세트법 이름을 읽을 수 있어야 한다');
  // 하는 중인 운동의 남은 처방을 도중에 바꾸지 않는다 — 역할 뱃지도 그대로 뜬다
  assert.equal(s.exercises[0].sets.map((x) => x.role).join(','), 'top,backdown');
  assert.equal(app.SET_ROLE_KR.backdown, '백다운');
  assert.equal(app.SET_ROLE_KR.myo, '미니');

  app.storage.set(app.KEYS.ACTIVE_SESSION, null);
  resetOverrides();
});

test('[이관] init() 이 세션을 복원하기 전에 이관을 끝낸다 (앱을 열면 저절로 갈린다)', () => {
  resetOverrides();
  app.storage.set(app.KEYS.SET_SCHEMES, { '핵 스쿼트': 'top_backdown' });
  app.storage.set(app.KEYS.ACTIVE_SESSION, {
    startTime: Date.now(), currentExerciseIdx: 0,
    exercises: [{ name: '머신 레그 익스텐션', targetReps: '12-15', scheme: 'myo_reps',
                  sets: [{ role: 'work', weight: 40, reps: 13, completed: false, isWarmup: false }] }]
  });

  app.init();

  assert.equal(app.storage.get(app.KEYS.SET_SCHEMES, {})['핵 스쿼트'], 'top_backoff');
  assert.equal(app.state.activeSession.exercises[0].scheme, 'straight',
    '복원된 세션이 표에 없는 id를 들고 있으면 안 된다');

  app.state.activeSession = null;
  app.storage.set(app.KEYS.ACTIVE_SESSION, null);
  resetOverrides();
  seedLog([]);
});
