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
import fs from 'node:fs';
import { loadApp, readAppSource } from './_harness.mjs';

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

test('워밍업 램프: 고중량 복합 3세트(50%·70%·85%) / 중강도 복합 1세트(55%) / 고립은 없음', () => {
  resetOverrides();
  seedLog([
    { date: daysAgo(3), exercises: [
      { name: '핵 스쿼트', setsDetail: [set(60, 8), set(60, 8)] },
      { name: '레그 프레스', setsDetail: [set(100, 10), set(100, 10)] },
      { name: '머신 레그 익스텐션', setsDetail: [set(40, 13), set(40, 13)] }
    ] }
  ]);
  // [v69] 워밍업 램프 50%×8 → 70%×4 → 85%×2(내림), 마지막 단은 탑의 88% 미만이어야 한다
  const heavy = app.getSessionSetPlan('핵 스쿼트', null, '8-10', { sets: 3 }).sets.filter((s) => s.isWarmup);
  assert.equal(heavy.length, 3);
  assert.equal(heavy[0].reps, 8);
  assert.equal(heavy[1].reps, 4);
  assert.equal(heavy[2].reps, 2, '피더는 준비지 피로가 아니다 — 2회');
  assert.equal(heavy.map((s) => s.weight).join(','), '30,40,50');

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
  assert.equal(warm[warm.length - 1].weight, 50, '85%×2 (내림) — 60kg의 85% = 51 → 5kg 격자로 내리면 50');
  assert.ok(warm[warm.length - 1].weight < work[0].weight, '피더는 첫 워킹세트보다 가벼워야 한다');
  assert.ok(warm[warm.length - 1].weight > warm[warm.length - 2].weight, '램프는 계속 올라가야 한다');

  // 20kg처럼 70% 단과 85% 단이 같은 칸이면 그 단을 넣지 않는다
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

test('[v69] top_backoff 설명은 더 이상 고정 비율(90%)을 말하지 않는다 (종목별로 달라짐)', () => {
  assert.equal(app.SET_SCHEMES.top_backoff.desc.indexOf('90%'), -1);
});

test('[v69] 덤벨·한쪽씩 종목은 백오프 85%·경량 자동 디로드 80%, 반복 범위는 8-12로 덮인다', () => {
  resetOverrides();
  seedLog([]);
  const name = '덤벨 불가리안 스플릿 스쿼트';
  // parseRepRange(null)은 이 함수와 무관한 전역 기본값('8-10')으로 먼저 떨어지므로, null 호출은
  // {low:8,high:12}가 아니라 {8,10}이 된다(8-10 ∩ 8-12) — 명시 폭(8-12)을 주면 클래스 상한 그대로 나온다.
  const rNull = app.clampRepsToClass(name, null);
  assert.equal(rNull.low, 8); assert.equal(rNull.high, 10);
  const r812 = app.clampRepsToClass(name, '8-12');
  assert.equal(r812.low, 8); assert.equal(r812.high, 12);

  const plan = app.getSessionSetPlan(name, 20, '8-12', { sets: 3, baseWeight: 20 });
  const warm = plan.sets.filter((s) => s.isWarmup);
  const work = plan.sets.filter((s) => !s.isWarmup);
  assert.equal(warm.map((s) => s.weight).join(','), '10,14', '한쪽씩·덤벨은 워밍업 2단(50%×8 → 75%×3)');
  assert.equal(warm.map((s) => s.reps).join(','), '8,3');
  assert.equal(work.map((s) => s.weight).join(','), '20,18,18', '백오프 = 20×0.85=17 → 5의 배수 아님 → 18');
  assert.equal(work[1].pct, app.BACKOFF_PCT_LIGHT);

  // 탑세트가 목표 미달 → 자동 디로드는 80%(BACKOFF_DELOAD_PCT_LIGHT)
  const ex = { name: name, scheme: 'top_backoff', targetReps: '8-12', sets: [
    { role: 'top', weight: 20, reps: 6, repsTarget: 10, completed: true, isWarmup: false },
    { role: 'backoff', weight: 18, reps: 8, completed: false, isWarmup: false },
    { role: 'backoff', weight: 18, reps: 8, completed: false, isWarmup: false }
  ] };
  assert.equal(app.applyTopSetAutoDeload(ex), 2);
  assert.deepEqual(ex.sets.map((s) => s.weight), [20, 16, 16], 'reduceWeight(20, 0.80) = 16');
});

test('[v69] 핵 스쿼트 탑 45kg — 워밍업 20/30/35(내림), 백오프 40', () => {
  resetOverrides();
  seedLog([]);
  const plan = app.getSessionSetPlan('핵 스쿼트', 45, '5-8', { sets: 3, baseWeight: 45 });
  const warm = plan.sets.filter((s) => s.isWarmup);
  const work = plan.sets.filter((s) => !s.isWarmup);
  assert.equal(warm.map((s) => s.weight).join(','), '20,30,35');
  assert.equal(work.map((s) => s.weight).join(','), '45,40,40');
});

test('[v69] 불변식 스윕 — 여러 종목 × 세트법 × 무게에서 checkSetPlanInvariants 가 늘 빈 배열', () => {
  resetOverrides();
  seedLog([]);
  const names = ['핵 스쿼트', '레그 프레스', '덤벨 불가리안 스플릿 스쿼트', '머신 레그 익스텐션'];
  const schemes = ['straight', 'top_backoff', 'pyramid', 'rpt'];
  let checked = 0;
  names.forEach((name) => {
    const step = app.getWeightIncrement(name);
    schemes.forEach((sc) => {
      for (let w = step; w <= 200; w += step) {
        checked++;
        app.setSetSchemeOverride(name, sc);
        const plan = app.getSessionSetPlan(name, w, null, { sets: 3, baseWeight: w });
        assert.deepEqual([...app.checkSetPlanInvariants(plan.sets, name)], [],
          `${name}/${sc} w=${w}: 불변식 위반`);
      }
    });
  });
  assert.ok(checked > 100, `스윕 조합이 너무 적다: ${checked}`);
  resetOverrides();
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
  // 클래스 범위(6-10, 2026-09 통일) 안에서 끝나는 스킴은 클램프된 표기(5-8 → 6-8) 그대로
  assert.equal(repsCol('straight').shown, '6-8');
  assert.equal(repsCol('top_backoff').shown, '6-8');
  // 피라미드(+4)는 6-8 이라 써 놓으면 실제 세트(10·8·6)를 다 담지 못한다
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



// ═══ 11. 세트법 전환 · 탑세트 무게 입력 (#72 3차 재설계) ═══
// 배경: 세트법 버튼이 추정 1RM에서 무게를 다시 매기던 채널(deriveSchemeSwitchWeight)은 폐기했다.
// 증량 엔진(더블 프로그레션)과 같은 무게를 서로 모르게 고쳐 써서, 처방대로 한 사용자가 감량되고
// 게이트를 우회한 증량이 세션마다 쌓였다(2차 리뷰 #2·#3·#4·#5·#6·#12).
//
// 지금의 계약
//  · 세트법 전환은 **무게를 건드리지 않는다.** 그 세션의 기준 세트 무게를 그대로 물려주고
//    사다리(SET_SCHEMES[].build.steps 의 배율)만 새로 만든다.
//  · 탑세트만 예외이고, 그것도 계산이 아니라 **질문**이다: 최근 실측을 미리 채운 입력 시트를 열고
//    사용자가 확인을 눌러야 세트가 바뀐다. 취소하면 아무것도 안 바뀐다.
//  · 기준 세트(sessionReferenceSet)는 **완료 여부를 보지 않는다** — 탑을 끝냈다고 카드가 뒤집히면 안 된다.
//
// 픽스처 주의(2차 리뷰 §6·§8): 옛 세션이 더 강한 로그·세트마다 무게가 다른 로그·일부 완료 상태를
// 반드시 섞는다. 같은 세션만 쓰면 모든 값이 항등식이 되어 결함이 드러나지 않는다.
// seedLog 는 _lastSetsCache 를 비운다 — 로그 길이가 같으면 캐시가 낡은 추천을 돌려준다.

function seedRecalc(log, oneRm) {
  resetOverrides();
  app.storage.set(app.KEYS.ONE_RM_DATA, oneRm || {});
  seedLog(log || []);
}
// 한 종목 한 세션 (워킹 3세트, 같은 무게·반복)
function session(name, weight, reps, days, extra) {
  return {
    date: daysAgo(days), sessionType: 'legs',
    exercises: [Object.assign({ name: name, setsDetail: [
      set(weight, reps), set(weight, reps), set(weight, reps)
    ] }, extra || {})]
  };
}
// 세트마다 무게가 다른 세션 (탑 100×5 / 백오프 90×8 — 2차 §6 맹점 픽스처)
function mixedSession(name, detail, days) {
  return { date: daysAgo(days), sessionType: 'legs', exercises: [{ name: name, setsDetail: detail }] };
}
function startSession(name) {
  app.state.restTimer = null;
  app.state.editingSet = null;
  app.state.sessionChatPending = null;
  app.state.topSetSheet = null;
  app.state.setSchemeOpen = true;
  app.state.activeSession = {
    sessionType: 'legs', sessionName: '테스트', startTime: Date.now() - 600000,
    currentExerciseIdx: 0, exercises: [app.buildSessionExercise(name)]
  };
  return app.state.activeSession.exercises[0];
}
function endSession() {
  app.state.activeSession = null;
  app.state.setSchemeOpen = false;
  app.state.topSetSheet = null;
  seedRecalc([]);
}
const workingSets = (ex) => ex.sets.filter((s) => !s.isWarmup && !app.isSetExtension(s));
const weightsOf = (ex) => workingSets(ex).map((s) => s.weight);
const rolesOf = (ex) => ex.sets.filter((s) => !s.isWarmup).map((s) => s.role);
// 토스트를 가로채 문구를 확인한다 (화면 대신)
function captureToast(fn) {
  const original = app.showToast;
  let last = '';
  app.showToast = (m) => { last = m; };
  try { fn(); } finally { app.showToast = original; }
  return last;
}
// 세트법 시트에서 한 항목을 누른다
function tapScheme(id) {
  app.state.setSchemeOpen = true;
  return captureToast(() => app.applySetScheme(id));
}
// 탑세트를 눌러 시트를 연 뒤(입력값을 바꿔) 확인까지 누른다. weight 를 안 주면 미리 채운 값 그대로.
function tapTopSet(weight) {
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  if (weight !== undefined && app.state.topSetSheet) app.state.topSetSheet.weight = weight;
  return captureToast(() => app.confirmTopSetWeight());
}
// 운동 중 화면의 '도전 권장 / 큰 숫자 / 추정 1RM' 카드는 걷었다(사용자 결정).
// 그 카드가 지키던 사실 — **세션 내내 같은 기준 세트를 가리키고, 완료해도 안 튄다** — 은
// 그대로 살아 있으므로, 검사를 화면 문자열이 아니라 그 값 자체로 옮긴다.
const refWeight = () => {
  const ex = app.state.activeSession.exercises[app.state.activeSession.currentExerciseIdx];
  const set = app.sessionReferenceSet(ex);
  return set && typeof set.weight === 'number' ? set.weight : null;
};
// 라벨(도전 권장 / 통증 — 증량 보류 / 재활 — 무게 유지)은 카드와 함께 사라졌다.
// 그 라벨을 정하던 근거는 추천 엔진에 그대로 있으니 거기서 확인한다.
const progOf = () => {
  const ex = app.state.activeSession.exercises[app.state.activeSession.currentExerciseIdx];
  return app.getProgressiveRecommendation(ex.name, ex.targetReps);
};

// ── A. 역산 채널 제거 ─────────────────────────────────────

test('[제거] 추정 1RM 역산 채널이 코드에 남아 있지 않다', () => {
  // 되살아나면 증량 엔진과 다시 충돌한다 — 이름만 남은 배관도 금지한다.
  assert.equal(typeof app.deriveSchemeSwitchWeight, 'undefined');
  assert.equal(typeof app.schemeReferenceRir, 'undefined');
  assert.equal(typeof app.rirMidpoint, 'undefined');
  const plan = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3, warmup: false });
  assert.equal(plan.recalculatedWeight, undefined, '죽은 필드도 남기지 않는다');
});

test('[불변] 세트법을 바꿔도 기준 무게는 그대로다 — 다섯 세트법 전부', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);          // 상단 미달 → 유지일
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  assert.deepEqual([...weightsOf(ex)], [90, 90, 90], '전제: 스트레이트 90kg 3세트');

  ['pyramid', 'rpt', 'drop', 'straight'].forEach((id) => {
    tapScheme(id);
    assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 90, id + ' 에서 기준 무게가 흔들렸다');
  });
  // 사다리는 세트법마다 다르게 남는다 — 강도차는 무게가 아니라 구성이 만든다
  tapScheme('pyramid');
  const pyr = weightsOf(ex);
  assert.ok(pyr[0] < pyr[pyr.length - 1], '피라미드는 오름 사다리');
  assert.equal(workingSets(ex)[workingSets(ex).length - 1].role, 'top', '피라미드는 마지막이 탑');
  tapScheme('rpt');
  const rpt = weightsOf(ex);
  assert.ok(rpt[0] > rpt[rpt.length - 1], '역피라미드는 내림 사다리');
  assert.equal(workingSets(ex)[0].role, 'top', '역피라미드는 첫 세트가 탑');
  endSession();
});

test('[불변] 세트마다 무게가 다른 로그에서도 기준 무게가 안 내려간다 (2차 #2)', () => {
  // 탑 100×6 / 백오프 90×8 을 그대로 따른 사용자. 옛 역산은 e1RM(탑)과 반복(백오프)을 섞어
  // 90kg 으로 깎았다 — 세션 안에서 복구 불가, 다음 세션 previousWeight 까지 90 으로 굳었다.
  // (반복은 6-8 하한 6 이상이어야 v69 REGRESS_SESSIONS 감량이 끼어들지 않는다)
  const detail = [set(100, 6), set(90, 8), set(90, 8)];
  seedRecalc([mixedSession('핵 스쿼트', detail, 3), mixedSession('핵 스쿼트', detail, 10)]);
  const ex = startSession('핵 스쿼트');                   // 기본값 = 탑세트
  assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 100, '전제: 탑 100kg');

  tapScheme('straight');
  assert.deepEqual([...weightsOf(ex)], [100, 100, 100], '스트레이트는 기준 무게를 그대로 쓴다');
  tapScheme('rpt');
  assert.equal(weightsOf(ex)[0], 100, '역피라미드도 탑은 100kg');
  endSession();
});

test('[불변] 옛 세션이 더 강해도 전환이 증량하지 않는다 (2차 #3 래칫)', () => {
  // 10일 전 90×8(e1RM 114) · 3일 전 90×6 → 엔진 판정은 maintain 90.
  // 옛 역산은 "4세션 최대 e1RM ÷ 직전 세션 반복" 이라 전 세트를 95kg 으로 올렸다.
  seedRecalc([session('핵 스쿼트', 90, 6, 3), session('핵 스쿼트', 90, 8, 10)]);
  assert.equal(app.getProgressiveRecommendation('핵 스쿼트', '5-8').weight, 90, '전제: 유지일');
  const ex = startSession('핵 스쿼트');
  assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 90);

  ['straight', 'pyramid', 'rpt', 'straight'].forEach((id) => {
    tapScheme(id);
    assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 90, id + ' 에서 증량이 새어 나왔다');
  });
  endSession();
});

test('[불변] 손수 고친 무게가 전환으로 사라지지 않는다 (2차 #4)', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  let ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  workingSets(ex).forEach((s) => { s.weight = 100; });    // 손수 올림
  tapScheme('pyramid');
  assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 100, '올린 무게가 그대로 남는다');

  seedRecalc([session('레그 익스텐션', 60, 15, 3)]);
  ex = startSession('레그 익스텐션');
  app.state.setSchemeOpen = false;
  workingSets(ex).forEach((s) => { s.weight = 20; });     // 컨디션이 나빠 손수 내림
  tapScheme('drop');
  assert.deepEqual([...weightsOf(ex)], [20, 20, 20], '내린 무게도 그대로다 (옛 PR은 30으로 리셋)');
  const drops = ex.sets.filter((s) => app.isSetExtension(s));
  assert.ok(drops.length === 2 && drops[0].weight < 20, '드롭은 그 무게에서 이어진다');
  endSession();
});

test('[불변] 경량 고립에 저반복 기록이 섞여도 무게를 외삽하지 않는다 (2차 #6)', () => {
  // 사이드 레터럴 10kg×20(상한 초과) + 16kg×10(포함) — 옛 역산은 이 e1RM 을 20회로 외삽했다.
  seedRecalc([mixedSession('덤벨 사이드 레터럴 레이즈',
    [set(10, 20), set(16, 10), set(10, 20)], 3)]);
  const ex = startSession('덤벨 사이드 레터럴 레이즈');
  const before = app.hardestWeight('덤벨 사이드 레터럴 레이즈', weightsOf(ex));
  tapScheme('pyramid');
  assert.equal(app.hardestWeight('덤벨 사이드 레터럴 레이즈', weightsOf(ex)), before,
    '기준 무게가 그대로여야 한다');
  assert.ok(weightsOf(ex).every((w) => w % 2 === 0), '덤벨 2kg 격자 위에 떨어진다');
  endSession();
});

test('[불변] 세트를 일부 끝낸 뒤 왕복해도 무게가 내려가지 않는다 (2차 #12)', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  const ex = startSession('핵 스쿼트');                   // 탑세트 [90, 80, 80]
  app.state.setSchemeOpen = false;
  assert.deepEqual([...weightsOf(ex)], [90, 80, 80]);
  workingSets(ex)[0].completed = true;                    // 탑 완료 — 남은 최중량은 80이다
  workingSets(ex)[0].reps = 7;

  tapScheme('straight');
  assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 90, '기준은 완료한 탑세트(90)다');
  tapScheme('rpt');
  assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 90, '두 번째 왕복도 90 그대로');
  endSession();
});

test('[불변] 어시스트·재활도 전환이 보조 무게를 되돌리지 않는다 (2차 #5)', () => {
  seedRecalc([session('어시스트 풀업', 30, 8, 3)]);
  const ex = startSession('어시스트 풀업');
  app.state.setSchemeOpen = false;
  workingSets(ex).forEach((s) => { s.weight = 40; });     // 보조를 더 줘 쉽게 해 둔 상태
  tapScheme('straight');
  assert.deepEqual([...weightsOf(ex)], [40, 40, 40], '보조 40kg 이 그대로 남는다');
  endSession();

  seedRecalc([session('페이스 풀', 20, 15, 3)]);
  const rehab = startSession('페이스 풀');
  const toast = tapScheme('drop');
  assert.equal(toast, '재활 종목은 세트법을 바꿀 수 없어요');
  assert.equal(app.sessionSchemeOf(rehab), 'straight');
  endSession();
});

// ── B. 탑세트 무게 입력 시트 ──────────────────────────────

test('[탑세트] 스트레이트에서 탭하면 오늘 쓰는 무게가 미리 채워진다 (3차 H3)', () => {
  // 이 기능의 **주 사용 흐름**: 스트레이트로 시작한 종목에서 '탑세트'를 고른다.
  // 3일 전 90kg, 10일 전 100kg — 지난 실측 최고는 100 이지만 오늘 세션이 쓰는 무게는 90 이다.
  // 지난 실측을 집으면 다른 세트법 전환(전부 그 세션 무게를 물려받는다)과 혼자 어긋난다.
  seedRecalc([session('핵 스쿼트', 90, 7, 3), session('핵 스쿼트', 100, 5, 10)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  assert.equal(app.recentTopWeight('핵 스쿼트'), 100, '전제: 지난 실측 최고는 100');

  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.ok(app.state.topSetSheet, '시트가 열린다');
  assert.equal(app.state.topSetSheet.weight, 90, '미리 채운 값 = 오늘 이 세션의 기준 세트');
  assert.equal(app.state.topSetSheet.source, 'session');
  assert.equal(app.state.topSetSheet.exName, '핵 스쿼트', '대상 종목을 못박는다');
  assert.equal(app.state.setSchemeOpen, false, '세트법 시트는 닫힌다');
  assert.equal(app.sessionSchemeOf(ex), 'straight', '확인 전에는 세트법이 안 바뀐다');
  assert.deepEqual([...weightsOf(ex)], [90, 90, 90], '확인 전에는 세트도 안 바뀐다');
  endSession();
});

test('[탑세트] 손수 올린 무게·증량일의 새 무게가 프리필에 그대로 산다 (3차 H3)', () => {
  // (a) 손수 올린 무게 — 옛 코드는 지난 세션 실측(90)으로 되돌려 −20kg 였다
  seedRecalc([session('벤치 프레스', 90, 7, 3)]);
  app.setSetSchemeOverride('벤치 프레스', 'straight');
  let ex = startSession('벤치 프레스');
  app.state.setSchemeOpen = false;
  workingSets(ex).forEach((s) => { s.weight = 110; });
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.weight, 110, '손수 올린 110 이 그대로');
  captureToast(() => app.confirmTopSetWeight());
  assert.equal(app.hardestWeight('벤치 프레스', weightsOf(ex)), 110, '탑이 110 으로 선다');
  endSession();

  // (b) 증량일 — 무게만 지난 세션 값으로 되돌아가면 더블 프로그레션 게이트가 얼어붙는다
  seedRecalc([session('핵 스쿼트', 100, 10, 3), session('핵 스쿼트', 100, 10, 10)]);   // 상단 = 10 (2026-09)
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  ex = startSession('핵 스쿼트');
  assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(ex)), 105, '전제: 2세션 상단 달성 → 105');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.weight, 105, '증량된 105 가 미리 채워진다 (옛 코드는 100)');
  endSession();
});

test('[탑세트] 오늘 세트에 무게가 없을 때만 지난 실측으로 내려간다', () => {
  // 직전 세션이 반복 0(기록만 남고 수행 안 함) → 추천 엔진이 무게를 못 낸다 → 오늘 세트도 무게 미상.
  // 그때 비로소 최근 4세션 실측(100kg)이 프리필이 된다.
  seedRecalc([
    mixedSession('핵 스쿼트', [set(100, 0), set(100, 0), set(100, 0)], 3),
    session('핵 스쿼트', 100, 8, 10)
  ]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  assert.equal(weightsOf(ex)[0], null, '전제: 오늘 세트는 무게 미상');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.source, 'recent');
  assert.equal(app.state.topSetSheet.weight, 100);
  endSession();
});

test('[탑세트] 통증으로 잠긴 종목은 프리필이 처방을 넘지 못한다 (3차 H1)', () => {
  // 3일 전 통증 기록(80kg) · 12일 전 95kg → 엔진은 painGated maintain 80.
  // 옛 코드는 "최근 4세션 실측 최고"만 봐서 통증 이전 세션의 95를 미리 채웠다 —
  // "통증 — 증량 보류" 카드 밑에 80 → 95 증량 화살표가 뜨는 경로였다.
  seedRecalc([
    session('벤치 프레스', 80, 8, 3, { painFlag: true }),
    session('벤치 프레스', 95, 6, 12)
  ]);
  app.setSetSchemeOverride('벤치 프레스', 'straight');
  const ex = startSession('벤치 프레스');
  const prog = app.getProgressiveRecommendation('벤치 프레스', ex.targetReps);
  assert.equal(prog.painGated, true, '전제: 통증 게이트가 걸렸다');
  assert.equal(app.recentTopWeight('벤치 프레스'), 95, '전제: 지난 실측 최고는 95');

  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.weight, prog.weight, '처방(80)까지만 채운다');
  assert.ok(app.state.topSetSheet.weight < 95, '통증 이전 세션의 무게로 올라가지 않는다');

  // 확인해도 **실제 세트 무게**가 처방(80)을 넘지 않는다 — 통증 이전 세션의 95로 올라가면 안 된다.
  // (progOf() 는 workoutLog 만 읽는 순수 함수라 확인 전후로 값이 같다 → 행위를 검사하지 못한다)
  captureToast(() => app.confirmTopSetWeight());
  const after = [...weightsOf(ex)];
  assert.equal(Math.max.apply(null, after), prog.weight, '가장 무거운 세트가 처방을 넘었다: ' + after.join('/'));
  assert.ok(after.every((w) => w <= 95 && w <= prog.weight), '통증 이전 세션의 무게로 올라갔다: ' + after.join('/'));
  assert.equal(refWeight(), prog.weight, '기준 세트도 처방 그대로');
  endSession();
});

test('[탑세트] 지난 실측 갈래도 통증 게이트에 클램프된다 (3차 H1 · 갈래 단위)', () => {
  // 위 경로는 오늘 세트 무게(=처방)가 먼저 잡혀 안전하다. 그 아래 갈래(지난 실측)도 같은 상한을
  // 지키는지 직접 확인한다 — 무게를 모르는 상태로 이 갈래에 들어오는 경우의 안전망이다.
  seedRecalc([
    session('벤치 프레스', 80, 8, 3, { painFlag: true }),
    session('벤치 프레스', 95, 6, 12)
  ]);
  app.setSetSchemeOverride('벤치 프레스', 'straight');
  const ex = startSession('벤치 프레스');
  const prog = app.getProgressiveRecommendation('벤치 프레스', ex.targetReps);
  workingSets(ex).forEach((s) => { s.weight = null; });     // 기준 세트 갈래를 비운다
  assert.equal(app.sessionReferenceSet(ex), null);

  const pre = app.topSetPrefill(ex);
  assert.equal(pre.source, 'recent', '전제: 지난 실측 갈래로 내려왔다');
  assert.equal(pre.weight, prog.weight, '95가 아니라 처방(80)으로 잘린다');
  endSession();
});

test('[탑세트] 취소하면 아무것도 바뀌지 않는다', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  app.state.topSetSheet.weight = 120;                     // 만졌다가
  app.closeTopSetWeightSheet();                           // 취소
  assert.equal(app.state.topSetSheet, null);
  assert.equal(app.getSetScheme('핵 스쿼트'), 'straight', '선택도 저장되지 않는다');
  assert.deepEqual([...weightsOf(ex)], [90, 90, 90]);
  endSession();
});

test('[탑세트] 확인하면 웜업 → 피더 → 탑 → 백오프로 구성된다', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  const toast = tapTopSet(95);

  assert.equal(app.sessionSchemeOf(ex), 'top_backoff');
  assert.deepEqual([...rolesOf(ex)], ['top', 'backoff', 'backoff']);
  assert.deepEqual([...weightsOf(ex)], [95, 85, 85], '백오프 = 탑의 90% (95×0.9=85.5 → 5kg 격자)');
  assert.equal(workingSets(ex)[0].rir, '1-2', '탑은 RIR 1~2');
  assert.equal(workingSets(ex)[1].pct, app.BACKOFF_PCT, '화면에 적히는 명목 배율은 90%');

  const warmups = ex.sets.filter((s) => s.isWarmup);
  const feeder = warmups[warmups.length - 1];
  assert.equal(feeder.weight, app.reduceWeight(95, app.FEEDER_PCT, '핵 스쿼트'), '피더 = 탑의 90%');
  assert.equal(feeder.reps, app.FEEDER_REPS);
  assert.ok(warmups.length >= 2 && warmups[0].weight < feeder.weight, '웜업 램프가 피더 앞에 온다');
  assert.equal(toast, '탑세트로 바꿨어요 — 탑 95kg');
  endSession();
});

test('[탑세트] 이미 탑세트면 같은 시트가 탑 무게 수정용으로 열린다', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  const ex = startSession('핵 스쿼트');                   // 기본값 = 탑세트 [90, 80, 80]
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.weight, 90, '지금 탑 무게가 미리 채워진다');
  assert.equal(app.state.topSetSheet.source, 'current');

  app.state.topSetSheet.weight = 100;
  const toast = captureToast(() => app.confirmTopSetWeight());
  assert.deepEqual([...weightsOf(ex)], [100, 90, 90], '탑을 고치면 백오프도 따라간다');
  assert.equal(toast, '탑세트로 바꿨어요 — 탑 100kg');
  endSession();
});

test('[탑세트] 다른 세트법을 다시 누르면 아무것도 안 바뀐다 (실제 적용값 기준)', () => {
  seedRecalc([session('레그 프레스', 100, 10, 3)]);
  const ex = startSession('레그 프레스');                  // 중강도 복합 = 스트레이트
  assert.equal(app.sessionSchemeOf(ex), 'straight');
  const before = [...weightsOf(ex)];
  const toast = tapScheme('straight');
  assert.equal(toast, '이미 쓰고 있는 세트법이에요');
  assert.deepEqual([...weightsOf(ex)], before);
  endSession();
});

test('[탑세트] 실측도 추천도 없으면 빈 칸 + 확인 불가 (없던 무게를 만들지 않는다)', () => {
  seedRecalc([]);
  const ex = startSession('사장님표 특수 운동');            // 기록 없음 · 1RM 없음
  assert.equal(weightsOf(ex)[0], null, '전제: 무게 미상');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.weight, null);
  assert.equal(app.state.topSetSheet.source, 'none');
  assert.equal(app.topSetWeightValid(), false, '확인 버튼이 잠긴다');
  captureToast(() => app.confirmTopSetWeight());
  assert.equal(weightsOf(ex)[0], null, '확인을 눌러도 무게가 생기지 않는다');
  endSession();

  // 맨몸으로만 기록해 온 종목도 같다 — 0kg 기록은 "맨몸으로 했다"는 뜻이지 탑 무게가 아니다
  seedRecalc([mixedSession('딥스', [set(0, 10), set(0, 9), set(0, 8)], 3)], { '딥스': 100 });
  const dips = startSession('딥스');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.weight, null);
  assert.equal(app.topSetWeightValid(), false);
  assert.equal(weightsOf(dips)[0], null);
  endSession();
});

test('[탑세트] 첫 시도 종목은 화면에 이미 있는 추천 무게가 미리 채워진다', () => {
  seedRecalc([], { '핵 스쿼트': 130 });                    // 기록 없음 → rm_estimate 갈래
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  // 그 추천값은 이미 오늘 세트에 깔려 있다 → 기준 세트 갈래로 잡힌다(같은 숫자, 더 이른 갈래).
  assert.equal(app.state.topSetSheet.source, 'session');
  assert.equal(app.state.topSetSheet.weight, weightsOf(ex)[0], '화면에 이미 있는 무게와 같다');
  endSession();
});

test('[탑세트] 스텝퍼·직접 입력은 그 종목 장비 격자로 스냅된다', () => {
  seedRecalc([session('덤벨 벤치 프레스', 20, 8, 3)]);
  startSession('덤벨 벤치 프레스');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  const start = app.state.topSetSheet.weight;
  app.adjustTopSetWeight(2);
  assert.equal(app.state.topSetSheet.weight, start + 2, '덤벨은 2kg 단위');
  app.adjustTopSetWeight(-4);
  assert.equal(app.state.topSetSheet.weight, start - 2);
  // 직접 입력은 격자로 반올림한다 (실행 불가 무게·오타 방지)
  app.state.topSetSheet.weight = app.snapWeightToEquipment(17.4, '덤벨 벤치 프레스');
  assert.equal(app.state.topSetSheet.weight, 18);
  // 0kg 아래로는 안 내려가고, 정방향 종목은 0kg 을 확인할 수 없다
  app.adjustTopSetWeight(-100);
  assert.equal(app.state.topSetSheet.weight, 0);
  assert.equal(app.topSetWeightValid(), false);
  endSession();
});

test('[탑세트] 운동 중 전환 — 탑세트가 사라지지 않는다 (2차 #7)', () => {
  seedRecalc([session('핵 스쿼트', 95, 7, 3)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  workingSets(ex)[0].completed = true;                    // 1세트 완료 (스트레이트 95)
  workingSets(ex)[0].reps = 7;
  const warmupsBefore = ex.sets.filter((s) => s.isWarmup).length;

  tapTopSet(95);
  const pending = workingSets(ex).filter((s) => !s.completed);
  assert.ok(pending.some((s) => s.role === 'top'), '남은 세트에 탑이 있다 (옛 PR은 통째로 삭제했다)');
  assert.equal(pending[0].role, 'top', '탑이 먼저다');
  assert.equal(ex.sets.filter((s) => s.isWarmup).length, warmupsBefore,
    '이미 시작한 종목에 웜업을 새로 끼우지 않는다 (남은 건 그대로)');
  endSession();
});

test('[탑세트] 탑을 이미 끝냈으면 남은 자리에 탑을 또 만들지 않는다', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  const ex = startSession('핵 스쿼트');                   // 탑세트 [90, 80, 80]
  app.state.setSchemeOpen = false;
  workingSets(ex)[0].completed = true;
  workingSets(ex)[0].reps = 7;

  tapScheme('straight');                                  // 다른 세트법으로 갔다가
  tapTopSet(90);                                          // 다시 탑세트로 돌아온다
  const tops = ex.sets.filter((s) => s.role === 'top' && !s.isWarmup);
  assert.equal(tops.length, 1, '한 종목에 탑은 하나다 (뱃지·자동 디로드·PR 판정이 이걸 읽는다)');
  assert.equal(tops[0].completed, true, '남은 건 방금 한 그 탑이다');
  endSession();
});

test('[탑세트] 입력 무게는 그 세션에만 남는다 (저장 키를 새로 만들지 않는다)', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  const keysBefore = Object.keys(app.KEYS).length;
  tapTopSet(105);
  assert.equal(weightsOf(ex)[0], 105);
  assert.equal(Object.keys(app.KEYS).length, keysBefore, '저장 키가 늘지 않는다');
  // 다음 세션은 기록(setsDetail)에서 나온 더블 프로그레션이 이어받는다 — 입력값이 따로 살아남지 않는다
  const next = app.getSessionSetPlan('핵 스쿼트', null, '5-8', { sets: 3, warmup: false });
  assert.equal(next.weight, 90, '로그가 그대로면 다음 계획도 그대로다');
  endSession();
});

// ── C. 표시·가드·되돌리기 ─────────────────────────────────

test('[표시] 탑세트를 끝내도 카드가 "무게 낮추기"로 뒤집히지 않는다 (2차 #1)', () => {
  seedRecalc([session('핵 스쿼트', 90, 10, 3), session('핵 스쿼트', 90, 10, 10)]);  // 상단 = 10 (2026-09 반복 범위 통일)
  const ex = startSession('핵 스쿼트');                   // 증량일 → [95, 85, 85]
  app.state.setSchemeOpen = false;
  assert.deepEqual([...weightsOf(ex)], [95, 85, 85]);

  assert.equal(refWeight(), 95);
  assert.ok(progOf().weight > progOf().previousWeight, '전제: 증량일이다');

  workingSets(ex)[0].completed = true;                    // 탑 완료
  workingSets(ex)[0].reps = 5;
  assert.equal(refWeight(), 95, '기준 세트는 완료해도 그대로다');

  workingSets(ex)[1].completed = true;                    // 백오프까지 완료
  workingSets(ex)[1].reps = 8;
  assert.equal(refWeight(), 95, '다 끝내도 백오프로 내려앉지 않는다');
  endSession();
});

test('[표시] 첫 시도 갈래도 세트를 다 끝내면 튀지 않는다 (2차 #14)', () => {
  seedRecalc([], { '핵 스쿼트': 130 });
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  const shown = refWeight();
  assert.equal(shown, app.hardestWeight('핵 스쿼트', weightsOf(ex)), '기준 = 배정된 가장 무거운 세트');
  workingSets(ex).forEach((s) => { s.completed = true; s.reps = 8; });
  assert.equal(refWeight(), shown, '다 끝내도 1RM 추정값으로 튀지 않는다');
  endSession();
});

test('[판정] 통증·재활은 증량을 멈춘다 (라벨이 사라져도 판정은 남는다)', () => {
  seedRecalc([session('핵 스쿼트', 90, 8, 3, { painFlag: true }), session('핵 스쿼트', 90, 8, 10)]);
  startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  const pain = progOf();
  assert.equal(pain.painGated, true, '통증 기록이 있으면 증량을 보류한다');
  assert.equal(pain.weight, pain.previousWeight, '무게를 올리지 않는다');
  endSession();

  seedRecalc([session('페이스 풀', 20, 15, 3)]);
  startSession('페이스 풀');
  app.state.setSchemeOpen = false;
  assert.equal(progOf().source, 'rehab', '재활 종목은 무게를 유지한다');
  endSession();
});

test('[가드] 본 세트를 다 끝낸 뒤에도 드롭은 붙는다 (2차 #9)', () => {
  seedRecalc([session('레그 익스텐션', 45, 15, 3)]);
  const ex = startSession('레그 익스텐션');
  app.state.setSchemeOpen = false;
  const base = weightsOf(ex)[0];
  workingSets(ex).forEach((s) => { s.completed = true; s.reps = 15; });

  const toast = tapScheme('drop');
  const drops = ex.sets.filter((s) => app.isSetExtension(s));
  assert.equal(drops.length, 2, '드롭 2단이 붙는다');
  assert.ok(drops[0].weight < base && drops[1].weight < drops[0].weight, '직전 세트에서 −25%씩');
  assert.equal(app.getSetScheme('레그 익스텐션'), 'drop', '선택도 저장된다');
  assert.equal(toast, '드롭세트로 바꿨어요');
  endSession();
});

test('[가드] 남은 세트가 없는 다른 세트법은 선택만 저장하고 알린다 (2차 #9)', () => {
  seedRecalc([session('레그 프레스', 100, 10, 3)]);
  const ex = startSession('레그 프레스');
  app.state.setSchemeOpen = false;
  workingSets(ex).forEach((s) => { s.completed = true; s.reps = 10; });
  const done = [...weightsOf(ex)];

  const toast = tapScheme('pyramid');
  assert.equal(app.getSetScheme('레그 프레스'), 'pyramid', '선택은 저장된다 (옛 PR은 버렸다)');
  assert.deepEqual([...weightsOf(ex)], done, '완료 기록 위에 새 세트를 얹지 않는다');
  assert.equal(toast, '남은 세트가 없어요 — 다음 세션부터 피라미드예요');
  endSession();
});

test('[가드] 무게가 생기면 접혔던 세트법을 복구할 수 있다 (2차 #8)', () => {
  seedRecalc([session('덤벨 컬', 4, 12, 3)]);
  app.setSetSchemeOverride('덤벨 컬', 'pyramid');
  const ex = startSession('덤벨 컬');
  app.state.setSchemeOpen = false;
  assert.equal(app.getSetScheme('덤벨 컬'), 'pyramid', '저장된 선택은 피라미드인데');
  assert.equal(app.sessionSchemeOf(ex), 'straight', '4kg 은 내릴 자리가 없어 스트레이트로 접혔다');

  workingSets(ex).forEach((s) => { s.weight = 12; });     // 무게가 생겼다
  tapScheme('pyramid');
  assert.equal(app.sessionSchemeOf(ex), 'pyramid', '이제 실제로 적용된다');
  assert.equal(app.hardestWeight('덤벨 컬', weightsOf(ex)), 12);
  endSession();
});

test('[가드] 건너뛴 종목은 세트법 변경으로 조용히 되살아나지 않는다 (2차 #13)', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  app.applySkipExercise(0);
  app.state.activeSession.currentExerciseIdx = 0;
  assert.equal(ex.skipped, true);

  tapScheme('straight');
  assert.equal(ex.skipped, true, '확인을 거치기 전에는 그대로 건너뛴 상태다');
  assert.equal(ex.sets.filter((s) => !s.completed).length, 0);
  // 떼어 둔 세트의 숫자를 어디에도 말하지 않는다 — 가리킬 세트 자체가 없다.
  assert.equal(refWeight(), null, '건너뛴 종목인데 기준 세트를 가리키고 있다');
  assert.ok(app.renderWorkoutSession().includes('건너뛴 종목'), '건너뛴 상태를 화면이 알린다');
  endSession();
});

test('[되돌리기] 세트법을 왕복해도 자동 디로드를 되돌릴 수 있다 (2차 #11)', () => {
  // 지난 세션 6회(하한) → 목표(v69 — C: 지난 최대+1) = 7회
  seedRecalc([session('핵 스쿼트', 90, 6, 3)]);
  const ex = startSession('핵 스쿼트');                   // 탑세트 [90, 80, 80]
  app.state.setSchemeOpen = false;
  let top = workingSets(ex)[0];
  top.completed = true;
  top.reps = 4;                                            // 목표(7회) 미달 → 백오프 한 스텝 더 내린다
  assert.equal(app.applyTopSetAutoDeload(ex), 2);
  assert.deepEqual([...weightsOf(ex)], [90, 75, 75]);
  assert.equal(workingSets(ex)[1].autoDeloaded, true);

  tapScheme('straight');
  tapTopSet(90);                                           // 왕복
  assert.deepEqual([...weightsOf(ex)], [90, 75, 75], '디로드한 무게가 살아남는다');
  assert.equal(workingSets(ex)[1].autoDeloaded, true, '표식도 살아남는다');

  // 반복 수를 정정하면 디로드가 풀린다 (양방향 멱등)
  ex.sets.filter((s) => s.role === 'top')[0].reps = 7;
  assert.equal(app.applyTopSetAutoDeload(ex), 2);
  assert.deepEqual([...weightsOf(ex)], [90, 80, 80], '평소 백오프로 복원된다');
  endSession();
});

test('[되돌리기] 미완료 워밍업은 세트법을 바꿔도 사라지지 않는다 (2차 #17)', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  const warmups = ex.sets.filter((s) => s.isWarmup).length;
  assert.ok(warmups >= 2, '전제: 워밍업 2개 이상');
  ex.sets.filter((s) => s.isWarmup)[0].completed = true;

  tapScheme('pyramid');
  assert.equal(ex.sets.filter((s) => s.isWarmup).length, warmups, '남은 워밍업이 그대로 있다');
  assert.equal(ex.sets.filter((s) => s.isWarmup && s.completed).length, 1);
  endSession();
});

test('[교체] 종목 교체·건너뛰기 되돌리기도 같은 재구성 규칙을 쓴다 (2차 #10)', () => {
  seedRecalc([session('레그 프레스', 100, 10, 3), session('핵 스쿼트', 90, 7, 3)]);
  const ex = startSession('레그 프레스');
  app.state.setSchemeOpen = false;
  workingSets(ex).slice(0, 2).forEach((s) => { s.completed = true; s.reps = 10; });

  app.state.exerciseSwapOpen = true;
  captureToast(() => app.applyExerciseSwap(ex, '핵 스쿼트'));
  assert.equal(ex.name, '핵 스쿼트');
  assert.equal(app.sessionSchemeOf(ex), 'top_backoff');
  const pending = workingSets(ex).filter((s) => !s.completed);
  assert.equal(pending.length, 1, '남은 세트 수는 그대로');
  assert.equal(pending[0].role, 'top', '자리가 하나면 핵심 세트(탑)를 남긴다');
  assert.equal(ex.sets.filter((s) => s.isWarmup).length, 0,
    '옛 종목 무게로 만든 웜업은 버린다 (새 종목엔 안 맞는다)');
  endSession();
});

test('[문구] 접힘 토스트가 원인을 정확히 말한다 (2차 #15)', () => {
  // (a) 무게는 아는데 한 칸 아래가 없다
  seedRecalc([session('덤벨 컬', 4, 12, 3)]);
  const light = startSession('덤벨 컬');
  app.state.setSchemeOpen = false;
  assert.equal(weightsOf(light)[0], 4, '전제: 화면에 4kg 이 보인다');
  assert.equal(tapScheme('pyramid'), '스트레이트로 했어요 — 무게가 낮아 감량할 자리가 없어요');
  endSession();

  // (b) 무게 자체를 모른다
  seedRecalc([]);
  const unknown = startSession('사장님표 특수 운동');
  app.state.setSchemeOpen = false;
  assert.equal(weightsOf(unknown)[0], null);
  assert.equal(tapScheme('pyramid'), '스트레이트로 했어요 — 무게를 모르는 종목이라 감량을 못 해요');
  endSession();
});

test('[문구] 세트법 토스트는 해요체 · 40자 이내 · 안 바뀐 무게는 말하지 않는다', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  app.setSetSchemeOverride('핵 스쿼트', 'straight');
  startSession('핵 스쿼트');
  const msgs = [
    tapScheme('pyramid'), tapScheme('rpt'), tapScheme('drop'), tapScheme('straight'),
    tapTopSet(95), tapScheme('straight')
  ];
  msgs.forEach((m) => {
    assert.ok(m.length <= 40, '40자 초과: ' + m + ' (' + m.length + '자)');
    assert.ok(m.indexOf('어요') !== -1, '해요체가 아니다: ' + m);
    assert.equal(/[!]|합니다|됩니다/.test(m), false, '느낌표·합쇼체 금지: ' + m);
  });
  // 무게가 안 바뀐 전환은 숫자를 붙이지 않는다 (화면에 없는 수를 말하지 않는다)
  assert.equal(msgs[0], '피라미드로 바꿨어요');
  assert.equal(msgs[4], '탑세트로 바꿨어요 — 탑 95kg', '실제로 바뀐 무게만 말한다');
  endSession();
});

test('[저장] override 는 별칭 키까지 지워져 기본값으로 되돌아간다 (2차 #16)', () => {
  resetOverrides();
  // 옛 저장분이 canonical 이 아닌 이름으로 남아 있는 경우
  app.storage.set(app.KEYS.SET_SCHEMES, { '랫풀다운': 'pyramid' });
  assert.equal(app.getSetScheme('랫풀다운'), 'pyramid', '전제: 별칭 키가 읽힌다');

  assert.equal(app.setSetSchemeOverride('랫풀다운', 'straight'), true);
  assert.equal(app.getSetScheme('랫풀다운'), 'straight', '기본값으로 되돌아간다');
  assert.equal(Object.keys(app.storage.get(app.KEYS.SET_SCHEMES, {})).length, 0, '별칭 키가 남지 않는다');
  resetOverrides();
});

test('[시트] 탑세트 무게 시트 HTML — 입력·스텝퍼·확인/취소가 있다', () => {
  seedRecalc([session('핵 스쿼트', 90, 7, 3)]);
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  const html = app.buildTopSetWeightSheetHtml(app.state.activeSession, ex);

  assert.ok(html.indexOf('topset-weight-value') !== -1, '무게 표시');
  assert.ok(html.indexOf('topset-weight-input') !== -1, '직접 입력칸');
  assert.ok(html.indexOf('adjustTopSetWeight(5)') !== -1, '장비 단위 스텝퍼(5kg)');
  assert.ok(html.indexOf('confirmTopSetWeight()') !== -1 && html.indexOf('취소') !== -1);
  assert.ok(html.indexOf('탑 무게 수정') !== -1, '이미 탑세트면 수정 모드로 뜬다');
  // 디자인 규칙: 이모지 금지 · 잔글씨 11px 하한 · 하드코딩 색 금지
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html), false, '이모지 금지');
  assert.equal(/#[0-9a-fA-F]{6}/.test(html), false, 'hex 색 직접 지정 금지');
  assert.equal(/text-\[(\d+)px\]/.test(html) && RegExp.$1 < 11, false, '잔글씨 하한 11px');
  endSession();
});

test('[시트] 확인 버튼은 값이 없으면 잠긴다', () => {
  seedRecalc([]);
  const ex = startSession('사장님표 특수 운동');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  const html = app.buildTopSetWeightSheetHtml(app.state.activeSession, ex);
  assert.ok(html.indexOf('disabled') !== -1, '확인 버튼이 잠겨 있다');
  assert.ok(html.indexOf('기록이 없어요') !== -1, '왜 잠겼는지 알려 준다');
  endSession();
});

// ── D. 3차 리뷰 회귀 (§6 테스트 맹점 12개) ────────────────
// 440건이 전부 녹색인데 18건이 살아 있던 이유는 픽스처가 한쪽에 몰려 있었기 때문이다:
// 시트 테스트는 전부 "이미 탑세트인 종목", 교체 테스트는 전부 "기록 있는 종목",
// 디로드 왕복은 top_backoff 로 되돌아온 뒤만 봤다. 아래는 그 빈칸을 메운다.

test('[교체] 기록 없는 종목으로 바꾸면 옛 종목 무게가 따라오지 않는다 (3차 H4-a)', () => {
  seedRecalc([session('레그 프레스', 120, 10, 3)]);
  const ex = startSession('레그 프레스');
  app.state.setSchemeOpen = false;
  assert.deepEqual([...weightsOf(ex)], [120, 120, 120], '전제: 레그 프레스 120kg');

  app.state.exerciseSwapOpen = true;
  captureToast(() => app.applyExerciseSwap(ex, '덤벨 사이드 레터럴 레이즈'));
  assert.equal(ex.name, '덤벨 사이드 레터럴 레이즈');
  assert.deepEqual([...weightsOf(ex)], [null, null, null],
    '기록도 1RM도 없는 종목은 무게 미상이다 (옛 코드는 120kg 을 물려줬다)');
  endSession();
});

test('[교체] 완료한 탑·자동 디로드가 새 종목에 물려지지 않는다 (3차 H4-b)', () => {
  const day = (d) => ({
    date: daysAgo(d), sessionType: 'legs', exercises: [
      { name: '핵 스쿼트', setsDetail: [set(100, 10), set(90, 10), set(90, 10)] },   // 상단 = 10 (2026-09)
      { name: '바벨 데드리프트', setsDetail: [set(140, 6), set(125, 6), set(125, 6)] }
    ]
  });
  seedRecalc([day(3), day(10)]);
  const ex = startSession('핵 스쿼트');                   // 2세션 상단 달성 → [105, 95, 95]
  app.state.setSchemeOpen = false;
  workingSets(ex)[0].completed = true;
  workingSets(ex)[0].reps = 3;                            // 탑 실패 → 백오프 한 스텝 더 내림
  assert.equal(app.applyTopSetAutoDeload(ex), 2);
  assert.deepEqual([...weightsOf(ex)], [105, 90, 90]);

  app.state.exerciseSwapOpen = true;
  captureToast(() => app.applyExerciseSwap(ex, '바벨 데드리프트'));
  const pending = workingSets(ex).filter((s) => !s.completed);
  const alone = app.getSessionSetPlan('바벨 데드리프트', null, '5-8', { sets: 2, warmup: false }).sets;
  assert.deepEqual(pending.map((s) => [s.role, s.weight]), alone.map((s) => [s.role, s.weight]),
    '새 종목 단독 구성과 같아야 한다 (자기 탑을 받고, 옛 실패로 감량되지 않는다)');
  assert.equal(ex.sets.filter((s) => s.autoDeloaded).length, 0, '옛 종목의 디로드 표식이 안 따라온다');
  assert.equal(workingSets(ex)[0].weight, 105, '옛 종목의 완료 기록 자체는 그대로 남는다');
  endSession();
});

test('[시트] 종목이 바뀌면 확인이 조용히 취소된다 (3차 H2)', () => {
  seedRecalc([session('핵 스쿼트', 100, 5, 3), session('레그 익스텐션', 45, 15, 3)]);
  app.state.topSetSheet = null;
  app.state.activeSession = {
    sessionType: 'legs', sessionName: '테스트', startTime: Date.now() - 600000, currentExerciseIdx: 0,
    exercises: ['핵 스쿼트', '레그 익스텐션', '페이스 풀'].map((n) => app.buildSessionExercise(n))
  };
  const [squat, legExt, rehab] = app.state.activeSession.exercises;
  const legExtBefore = [...weightsOf(legExt)];

  // (a) 다른 종목으로 넘어간 뒤 확인 → 아무것도 안 바뀐다
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.exName, '핵 스쿼트');
  app.state.activeSession.currentExerciseIdx = 1;         // 스와이프로 이동한 상태
  const toastA = captureToast(() => app.confirmTopSetWeight());
  assert.equal(toastA, '', '조용히 취소한다');
  assert.equal(app.state.topSetSheet, null, '시트는 닫힌다');
  assert.deepEqual([...weightsOf(legExt)], legExtBefore, '엉뚱한 종목이 안 바뀐다');
  assert.equal(Object.keys(app.storage.get(app.KEYS.SET_SCHEMES, {})).length, 0, 'override 도 안 남는다');
  assert.equal(app.hardestWeight('핵 스쿼트', weightsOf(squat)), 100, '원래 종목도 그대로');

  // (b) 재활 종목으로 넘어간 경우도 같다 — 잠금은 시트 경로에서도 유효하다
  app.state.activeSession.currentExerciseIdx = 0;
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  app.state.activeSession.currentExerciseIdx = 2;
  captureToast(() => app.confirmTopSetWeight());
  assert.equal(app.sessionSchemeOf(rehab), 'straight', '재활은 스트레이트 그대로');
  assert.equal(Object.keys(app.storage.get(app.KEYS.SET_SCHEMES, {})).length, 0);

  // (c) 안쪽 함수를 직접 불러도 잠금이 다시 걸린다 (setSetSchemeOverride 의 false 를 안 버린다)
  const toastC = captureToast(() => app.applySchemeToSession(rehab, 'top_backoff', 100));
  assert.equal(toastC, '재활 종목은 세트법을 바꿀 수 없어요');
  assert.equal(app.sessionSchemeOf(rehab), 'straight');
  assert.deepEqual([...weightsOf(rehab)], [null, null, null], '재활 세트는 손대지 않는다');
  endSession();
});

test('[시트] 스와이프 가드에 탑세트 시트가 들어 있다 (3차 H2)', () => {
  // 이벤트 리스너라 함수로 부를 수 없다 — 가드 목록에 이름이 있는지로 지킨다.
  // 휴식 타이머 가드 2곳에는 이미 들어 있었고 이 한 곳만 빠져 있었다.
  const src = readAppSource().code;
  const i = src.indexOf("document.addEventListener('touchend'");
  assert.ok(i > 0, 'touchend 스와이프 핸들러를 찾았다');
  assert.ok(src.slice(i, i + 1500).indexOf('state.topSetSheet') !== -1,
    '탑 무게를 입력하는 중에는 스와이프로 종목이 넘어가면 안 된다');
});

test('[디로드] 스트레이트로 착지해도 내려간 무게가 되올라가지 않는다 (3차 H5)', () => {
  seedRecalc([session('핵 스쿼트', 100, 5, 3)]);
  const ex = startSession('핵 스쿼트');                   // 탑세트 [100, 90, 90]
  app.state.setSchemeOpen = false;
  const top = workingSets(ex)[0];
  top.completed = true;
  top.reps = 4;                                            // 목표 미달 → 백오프 85 로 자동 디로드
  assert.equal(app.applyTopSetAutoDeload(ex), 2);
  assert.deepEqual([...weightsOf(ex)], [100, 85, 85]);

  const toast = tapScheme('straight');
  assert.deepEqual([...weightsOf(ex)], [100, 85, 85],
    '방금 실패한 100kg 을 두 세트 더 시키지 않는다 (옛 코드는 100 으로 되올렸다)');
  assert.equal(toast, '스트레이트로 바꿨어요', '안 바뀐 무게는 말하지 않는다');
  endSession();
});

test('[문구] 남은 세트 기준으로 토스트를 만든다 (3차 M2)', () => {
  // 완료한 탑이 있으면 세션 최중량은 안 변한다 — 그걸 기준으로 삼으면 남은 세트가 뭐가 되든
  // "안 바뀌었다"가 되고, 반대로 남은 세트가 그대로인데 없는 숫자를 말하기도 했다.
  seedRecalc([session('핵 스쿼트', 100, 5, 3)]);
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  workingSets(ex)[0].completed = true;
  workingSets(ex)[0].reps = 5;                             // [top 100✔, backoff 90, backoff 90]

  const toast = tapScheme('straight');
  assert.deepEqual([...weightsOf(ex)], [100, 90, 90], '남은 세트 무게는 그대로 90');
  assert.equal(toast, '스트레이트로 바꿨어요', '안 바뀐 무게에 숫자를 붙이지 않는다');
  endSession();
});

test('[수정] 끝낸 탑보다 무거운 값은 그 탑까지만 반영된다 (3차 M1)', () => {
  seedRecalc([session('핵 스쿼트', 100, 6, 3)]);   // 지난 최대 6회 → 목표(v69 — C: +1) = 7회
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  workingSets(ex)[0].completed = true;
  workingSets(ex)[0].reps = 7;                             // 탑 100 완료 (목표 7회 달성 — 자동 디로드 없음)

  const toast = tapTopSet(120);                            // 재탭 후 120 입력
  assert.deepEqual([...weightsOf(ex)], [100, 90, 90],
    '백오프가 탑보다 무거워지지 않는다 (옛 코드는 [100, 110, 110])');
  assert.equal(toast.indexOf('110') === -1 && toast.indexOf('120') === -1, true,
    '존재하지 않는 탑 무게를 말하지 않는다');
  assert.equal(refWeight(), 100, '기준 세트도 안 튄다');

  // 낮추는 방향은 그대로 먹힌다 — 남은 백오프를 실제로 조절할 수 있다
  tapTopSet(90);
  assert.deepEqual([...weightsOf(ex)], [100, 80, 80], '90 의 90% = 81 → 5kg 격자로 80');
  endSession();
});

test('[수정] 탑을 끝낸 뒤 피라미드·역피라미드가 꼭대기를 잃지 않는다 (3차 M3)', () => {
  seedRecalc([session('핵 스쿼트', 100, 5, 3)]);
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  workingSets(ex)[0].completed = true;
  workingSets(ex)[0].reps = 5;                             // [top 100✔, backoff 90, backoff 90]

  tapScheme('pyramid');
  let pending = workingSets(ex).filter((s) => !s.completed);
  assert.equal(pending[pending.length - 1].role, 'top', '피라미드의 마지막 단은 탑이다');
  assert.ok(pending[0].weight < pending[pending.length - 1].weight, '오름 사다리가 산다');

  tapScheme('rpt');
  pending = workingSets(ex).filter((s) => !s.completed);
  assert.equal(pending[0].role, 'top', '역피라미드의 첫 단은 탑이다');
  assert.ok(pending[0].weight > pending[pending.length - 1].weight, '내림 사다리가 산다');

  // 탑세트(자동 디로드 스킴)에서는 여전히 탑을 두 번 만들지 않는다
  tapTopSet(100);
  assert.equal(ex.sets.filter((s) => s.role === 'top' && !s.isWarmup).length, 1,
    '탑세트에서는 한 종목에 탑이 하나다');
  endSession();
});

test('[가드] 본 세트를 다 끝낸 뒤 탑세트는 시트를 열지 않는다 (3차 M5)', () => {
  seedRecalc([session('핵 스쿼트', 100, 5, 3)]);
  const ex = startSession('핵 스쿼트');
  app.state.setSchemeOpen = false;
  tapScheme('straight');
  workingSets(ex).forEach((s) => { s.completed = true; s.reps = 5; });
  const done = [...weightsOf(ex)];

  app.state.setSchemeOpen = true;
  const toast = captureToast(() => app.applySetScheme('top_backoff'));
  assert.equal(app.state.topSetSheet, null, '무게부터 입력시키지 않는다');
  assert.equal(toast, '남은 세트가 없어요 — 다음 세션부터 탑세트예요');
  assert.deepEqual([...weightsOf(ex)], done, '세트는 그대로');
  assert.equal(app.getSetScheme('핵 스쿼트'), 'top_backoff', '선택은 저장된다');
  endSession();
});

test('[저장] "이미 쓰고 있는 세트법"도 선택을 확정한다 (3차 M4)', () => {
  seedRecalc([session('덤벨 컬', 4, 12, 3)]);
  app.setSetSchemeOverride('덤벨 컬', 'pyramid');
  const ex = startSession('덤벨 컬');
  app.state.setSchemeOpen = false;
  assert.equal(app.sessionSchemeOf(ex), 'straight', '전제: 4kg 이라 스트레이트로 접혔다');
  assert.equal(app.getSetScheme('덤벨 컬'), 'pyramid', '전제: 저장된 선택은 아직 피라미드');

  const toast = tapScheme('straight');
  assert.equal(toast, '이미 쓰고 있는 세트법이에요');
  assert.equal(app.getSetScheme('덤벨 컬'), 'straight',
    '무게가 생겨도 조용히 피라미드로 돌아가지 않는다 (옛 코드는 저장을 건너뛰었다)');
  endSession();
});

test('[시트] 잠긴 확인 버튼은 눈에 보이게 잠기고, 입력하면 곧바로 풀린다 (3차 M6)', () => {
  const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.ok(/\.adj-btn:disabled\s*\{[^}]*opacity/.test(css),
    '.adj-btn 에도 disabled 표기가 있다 (.rest-done-btn:disabled 와 같은 규칙)');

  seedRecalc([]);
  const ex = startSession('사장님표 특수 운동');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  const html = app.buildTopSetWeightSheetHtml(app.state.activeSession, ex);
  assert.ok(html.indexOf('oninput="syncTopSetInput()"') !== -1,
    'blur 를 기다리지 않고 입력 즉시 확인 버튼을 동기화한다');
  assert.equal(typeof app.syncTopSetInput, 'function');
  endSession();
});

test('[프리필] 격자 밖 실측을 위로 올리지 않는다 (3차 L2)', () => {
  // 22.5kg 으로 기록한 종목에 25kg 을 미리 채우면, "가장 무겁게 든 무게"라면서
  // 든 적 없는 무게를 말하게 된다. getSessionSetPlan 의 격자 밖 보존과 같은 원칙이다.
  seedRecalc([{ date: daysAgo(3), sessionType: 'legs',
    exercises: [{ name: '덤벨 벤치 프레스', setsDetail: [set(22.5, 8), set(22.5, 8)] }] }]);
  assert.equal(app.recentTopWeight('덤벨 벤치 프레스'), 22.5);

  startSession('덤벨 벤치 프레스');
  app.state.setSchemeOpen = true;
  app.applySetScheme('top_backoff');
  assert.equal(app.state.topSetSheet.weight, 22.5, '시트에도 실측 그대로 뜬다');
  endSession();
});

test('[프리필] 날짜가 없는 기록에서도 최신 세션을 고른다 (3차 L6)', () => {
  // 인라인 비교자는 undefined 끼리 전부 0 을 돌려줘 정렬이 저장 순서(최신 우선)로 남았고,
  // slice(-4) 가 **가장 오래된 4개**를 집었다. 저장소 공용 sortByDateDesc 로 통일한다.
  const undated = (w) => ({ sessionType: 'legs', exercises: [{ name: '핵 스쿼트', setsDetail: [set(w, 5)] }] });
  seedRecalc([undated(110), undated(60), undated(60), undated(60), undated(200)]);
  assert.equal(app.recentTopWeight('핵 스쿼트'), 110,
    '최신 4세션(110·60·60·60)에서 고른다 — 창 밖의 옛 200kg 이 아니다');
  endSession();
});
