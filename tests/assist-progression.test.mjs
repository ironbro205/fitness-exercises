// 역방향 진행(어시스트 보조 기구) — docs/research/assisted-progression.md
// 핵심 계약: 어시스트 풀업·딥스는 **보조 무게를 낮추는 것이 증량**이다.
// 이 파일의 테스트가 하나라도 깨지면 사용자는 "강해질수록 더 쉬운 세팅"을 추천받게 된다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();

// ── 헬퍼 (progression.test.mjs와 같은 관용구) ──
function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}
function set(weight, reps, extra) {
  return Object.assign({ weight, reps, isWarmup: false, completed: true }, extra || {});
}
function workout(date, name, sets) {
  return { date, sessionKr: 'PULL', duration: 60, sets: sets.length, exercises: [{ name, setsDetail: sets }] };
}
function seedLog(entries) {
  app.state.data.workoutLog = entries;
  app._lastSetsCache = null; // 종목별 최근 세트 캐시 무효화
}

// ═══ 1. 판정 ═══
test('판정: 어시스트 풀업·딥스는 역방향, 맨몸 풀업·딥스·행잉 니 레이즈는 아니다', () => {
  assert.equal(app.isReverseProgression('어시스트 풀업'), true);
  assert.equal(app.isReverseProgression('어시스트 딥스'), true);
  // 맨몸 종목은 보조 기구 태그가 붙어 있어도 역방향이 아니다 (무게 = 추가 중량)
  assert.equal(app.isReverseProgression('풀업'), false);
  assert.equal(app.isReverseProgression('친업'), false);
  assert.equal(app.isReverseProgression('딥스'), false);
  // 오탐 방지: 보조 기구 프레임에 매달릴 뿐 보조 하중 종목이 아니다
  assert.equal(app.isReverseProgression('행잉 니 레이즈'), false);
  assert.equal(app.isReverseProgression('랫 풀 다운'), false);
});

test('판정: AI가 만든 이름 변형도 키워드로 잡는다', () => {
  assert.equal(app.isReverseProgression('어시스티드 풀업'), true);
  assert.equal(app.isReverseProgression('머신 어시스트 딥스'), true);
  assert.equal(app.isReverseProgression('어시스트 친업'), true);
  // 띄어쓰기·하이픈·'보조' 표기 변형까지 (공백/하이픈 제거 후 매칭)
  assert.equal(app.isReverseProgression('어시스트 풀 업'), true);
  assert.equal(app.isReverseProgression('어시스티드 풀-업'), true);
  assert.equal(app.isReverseProgression('보조 풀업'), true);
  assert.equal(app.isReverseProgression('보조 딥스'), true);
});

test('판정: 밴드 보조는 제외한다 (가변 보조 — kg 한 칸 개념이 성립 안 함)', () => {
  assert.equal(app.isReverseProgression('밴드 보조 풀업'), false);
  assert.equal(app.isReverseProgression('밴드 어시스트 딥스'), false);
});

test('판정: "어시스트"만 있고 풀업/딥스가 아니면 역방향이 아니다 (키워드 오탐 방지)', () => {
  // 보조 기구는 풀업·친업·딥스 전용이다. 이 가드가 없으면 아래 이름의 1RM이 조용히 삭제된다.
  assert.equal(app.isReverseProgression('어시스트 레그 프레스'), false);
  assert.equal(app.isReverseProgression('어시스트 체스트 프레스'), false);
  assert.equal(app.isReverseProgression('보조 운동'), false); // '보조'는 movement 없이 단독으로 안 걸린다
});

// ═══ 2. 진행 방향 (핵심) ═══
test('진행: 상단 반복 2세션 연속 달성 → 보조 무게가 한 칸 내려간다 (증량)', () => {
  // 어시스트 풀업 = compound_heavy (5-8회, 2세션 연속 요구)
  seedLog([
    workout(daysAgo(2), '어시스트 풀업', [set(40, 8), set(40, 8), set(40, 8)]),
    workout(daysAgo(5), '어시스트 풀업', [set(40, 8), set(40, 8), set(40, 8)]),
  ]);
  const rec = app.getProgressiveRecommendation('어시스트 풀업', '5-8');
  assert.equal(rec.source, 'progress');
  assert.equal(rec.reverse, true);
  assert.equal(rec.weight, 35, '보조가 40 → 35kg으로 내려가야 한다 (올라가면 정반대)');
  assert.ok(rec.weight < rec.previousWeight, '진행 = 보조 감소');
  assert.match(rec.note, /보조/);
});

test('진행: 상단 미달이면 같은 보조 유지 + 문구가 "보조 −" 방향', () => {
  seedLog([workout(daysAgo(2), '어시스트 풀업', [set(40, 6), set(40, 5), set(40, 5)])]);
  const rec = app.getProgressiveRecommendation('어시스트 풀업', '5-8');
  assert.equal(rec.source, 'maintain');
  assert.equal(rec.weight, 40);
  assert.match(rec.note, /보조 −5kg/);
  assert.doesNotMatch(rec.note, /\+5kg/, '어시스트 종목에 "+5kg"라고 쓰면 안 된다');
});

test('진행: 기준 세트는 가장 무거운 세트가 아니라 **보조가 가장 적은** 세트다', () => {
  // 백오프(보조를 더 준 세트)가 섞여도 기준은 최소 보조(=가장 어려운 세트)여야 한다
  seedLog([
    workout(daysAgo(2), '어시스트 풀업', [set(35, 8), set(45, 8), set(45, 8)]),
    workout(daysAgo(5), '어시스트 풀업', [set(35, 8), set(45, 8), set(45, 8)]),
  ]);
  const rec = app.getProgressiveRecommendation('어시스트 풀업', '5-8');
  assert.equal(rec.previousWeight, 35, '기준 = 최소 보조 35kg (최대 45kg이 아니다)');
  assert.equal(rec.weight, 30);
});

test('진행: 보조 0kg(맨몸)이 바닥 — 그 아래로 내리지 않고 졸업 안내로 바뀐다', () => {
  seedLog([
    workout(daysAgo(2), '어시스트 풀업', [set(0, 8), set(0, 8), set(0, 8)]),
    workout(daysAgo(5), '어시스트 풀업', [set(0, 8), set(0, 8), set(0, 8)]),
  ]);
  const rec = app.getProgressiveRecommendation('어시스트 풀업', '5-8');
  assert.equal(rec.weight, 0, '음수 보조는 존재하지 않는다');
  assert.equal(rec.graduated, true);
  assert.match(rec.note, /맨몸/);
});

test('진행: 보조 0kg 세트도 진행 판정에 포함된다 (weight>0 필터에 삼켜지지 않음)', () => {
  seedLog([workout(daysAgo(2), '어시스트 풀업', [set(0, 5), set(0, 5), set(0, 5)])]);
  const rec = app.getProgressiveRecommendation('어시스트 풀업', '5-8');
  assert.ok(rec, '보조 0kg 기록이 있으면 "첫 시도"로 되돌아가면 안 된다');
  assert.equal(rec.source, 'maintain');
  assert.equal(rec.previousWeight, 0);
});

test('진행: 통증 게이트는 "보조 유지"로 말한다 (증량 금지가 아니라)', () => {
  seedLog([
    workout(daysAgo(2), '어시스트 풀업', [set(40, 8, { painFlag: true }), set(40, 8), set(40, 8)]),
    workout(daysAgo(5), '어시스트 풀업', [set(40, 8), set(40, 8), set(40, 8)]),
  ]);
  const rec = app.getProgressiveRecommendation('어시스트 풀업', '5-8');
  assert.equal(rec.source, 'maintain');
  assert.equal(rec.painGated, true);
  assert.equal(rec.weight, 40, '통증 기록 시 보조를 줄이지 않는다');
  assert.match(rec.note, /보조는 그대로/, '어시스트는 보조를 줄이는 게 증량이다 — 통증 때는 그대로 두라고 말해야 한다');
});

test('정방향 종목의 동작은 그대로다 (회귀 방지)', () => {
  seedLog([
    workout(daysAgo(2), '덤벨 벤치 프레스', [set(30, 8), set(30, 8), set(30, 8)]),
    workout(daysAgo(5), '덤벨 벤치 프레스', [set(30, 8), set(30, 8), set(30, 8)]),
  ]);
  const rec = app.getProgressiveRecommendation('덤벨 벤치 프레스', '5-8');
  assert.equal(rec.source, 'progress');
  assert.equal(rec.weight, 32);
  assert.equal(rec.reverse, false);
});

// ═══ 3. 세트 구성 ═══
test('세트: 워밍업은 보조를 **더** 준 세트다 (본세트보다 무거운 보조)', () => {
  const rows = app.buildSchemeSets('어시스트 풀업', 30, 8, { low: 5, high: 8 }, 'straight', { sets: 3, warmup: true });
  const warm = rows.filter(r => r.isWarmup);
  assert.ok(warm.length > 0, '고중량 복합이므로 워밍업이 있어야 한다');
  warm.forEach(r => assert.ok(r.weight > 30, '워밍업 보조 ' + r.weight + 'kg는 본세트 30kg보다 커야(=쉬워야) 한다'));
});

test('세트: 백오프는 보조를 한 칸 올린다 (감량 = 보조 증가)', () => {
  const rows = app.buildSchemeSets('어시스트 풀업', 30, 8, { low: 5, high: 8 }, 'top_backoff', { sets: 3, warmup: false });
  const top = rows.find(r => r.role === 'top');
  const backoff = rows.find(r => r.role === 'backoff');
  assert.equal(top.weight, 30);
  assert.equal(backoff.weight, 35, '백오프(더 쉬운 세트) = 보조 +5kg');
});

test('세트: 드롭도 보조가 올라가는 방향으로 이어진다', () => {
  const rows = app.buildSchemeSets('어시스트 풀업', 30, 8, { low: 5, high: 8 }, 'drop', { sets: 1, warmup: false });
  const drops = rows.filter(r => r.role === 'drop');
  assert.equal(drops.length, 2);
  assert.ok(drops[0].weight > 30 && drops[1].weight > drops[0].weight, '드롭마다 보조가 더 늘어야 한다');
});

test('세트: 보조 0kg에서도 세트법이 스트레이트로 접히지 않는다 (백오프 = 보조 추가)', () => {
  assert.equal(app.effectiveSetScheme('어시스트 풀업', 0), app.getSetScheme('어시스트 풀업'));
  const rows = app.buildSchemeSets('어시스트 풀업', 0, 8, { low: 5, high: 8 }, 'top_backoff', { sets: 3, warmup: false });
  assert.ok(rows.some(r => r.role === 'backoff'), '보조 0kg에서도 백오프가 가능하다');
});

test('세트: 무게 스냅이 보조 0kg을 허용한다 (정방향은 최소 한 칸 유지)', () => {
  assert.equal(app.snapWeightToEquipment(2, '어시스트 풀업'), 0);
  assert.equal(app.snapWeightToEquipment(2, '레그 프레스'), 5); // 정방향 회귀 방지
});

test('세트: 세션 세트 구성이 추천 카드와 같은 보조 무게를 쓴다', () => {
  seedLog([
    workout(daysAgo(2), '어시스트 풀업', [set(40, 8), set(40, 8), set(40, 8)]),
    workout(daysAgo(5), '어시스트 풀업', [set(40, 8), set(40, 8), set(40, 8)]),
  ]);
  const plan = app.getSessionSetPlan('어시스트 풀업', null, '5-8', { sets: 3, warmup: false });
  assert.equal(plan.weight, 35);
  assert.equal(plan.prog.weight, 35);
});

// ═══ 4. 1RM 제외 ═══
test('1RM: 어시스트 종목은 e1RM을 추적하지 않는다', () => {
  assert.equal(app.get1RM('어시스트 딥스'), null);
  assert.equal(app.update1RM('어시스트 딥스', 60, 8), false);
  assert.equal(app.calculateRollingMax1RM('어시스트 딥스'), null);
  assert.equal(app.estimate1RMFromPart('어시스트 풀업'), null);
  assert.equal(app.suggestWorkingWeight('어시스트 딥스', 0.7), null);
});

test('1RM: INITIAL_1RM에 어시스트 종목이 없고, 저장소에 남은 값은 정리된다', () => {
  assert.equal(app.INITIAL_1RM['어시스트 딥스'], undefined);
  // 옛 버전 사용자 시뮬레이션 — 보조 무게가 1RM으로 저장돼 있던 상태
  const data = app.storage.get(app.KEYS.ONE_RM_DATA, {});
  data['어시스트 딥스'] = 66.67;
  data['어시스트 레그 프레스'] = 120; // 정방향 커스텀 종목 (삭제되면 안 된다)
  app.storage.set(app.KEYS.ONE_RM_DATA, data);
  assert.equal(app.pruneReverseProgression1RM(), true);
  const after = app.storage.get(app.KEYS.ONE_RM_DATA, {});
  assert.equal(after['어시스트 딥스'], undefined);
  assert.equal(after['어시스트 레그 프레스'], 120, '이름에 "어시스트"만 있는 정방향 종목은 보존해야 한다');
  // 정방향 종목은 건드리지 않는다
  assert.ok(after['레그 프레스'] > 0);
  // 두 번째 호출은 지울 게 없다 (매 부팅 호출되므로 멱등해야 한다)
  assert.equal(app.pruneReverseProgression1RM(), false);
});

test('0kg 보존: 템플릿/AI가 준 보조 0kg(맨몸)이 falsy로 버려지지 않는다', () => {
  seedLog([]); // 기록 없음 → fallbackWeight 경로
  const plan = app.getSessionSetPlan('어시스트 풀업', 0, '5-8', { sets: 3, warmup: false });
  assert.equal(plan.weight, 0, '보조 0kg 지시가 체중 기반 첫 보조로 되돌아가면 안 된다');
  // 정방향은 기존 동작 유지 — 0은 "무게 미정"이라 폴백으로 넘어간다
  const fwd = app.getSessionSetPlan('레그 프레스', 0, '8-12', { sets: 3, warmup: false });
  assert.ok(fwd.weight > 0);
});

// ═══ 5. 진행 지표 (보조 감소 추이) ═══
test('추이: 최근 세션들의 최소 보조와 감소량을 낸다', () => {
  seedLog([
    workout(daysAgo(2), '어시스트 풀업', [set(30, 8), set(35, 8)]),
    workout(daysAgo(5), '어시스트 풀업', [set(35, 8), set(40, 8)]),
    workout(daysAgo(9), '어시스트 풀업', [set(40, 8), set(45, 8)]),
  ]);
  const t = app.getAssistProgressTrend('어시스트 풀업', 3);
  // vm 컨텍스트에서 만들어진 배열이라 deepStrictEqual은 프로토타입이 달라 실패한다 → 값으로 비교
  assert.equal(t.values.join(','), '30,35,40', '[0]=가장 최근, 각 세션의 최소 보조');
  assert.equal(t.delta, 10, '가장 오래된 40 → 최근 30 = 10kg 감소(진행)');
  assert.equal(app.getAssistProgressTrend('레그 프레스', 3), null, '정방향 종목은 이 지표를 쓰지 않는다');
});

test('추이: 실질 부하 = 체중 − 보조 (프로필 체중이 없으면 null)', () => {
  const prev = app.state.profile.weight;
  app.state.profile.weight = 70;
  assert.equal(app.assistNetLoad('어시스트 풀업', 30), 40);
  assert.equal(app.assistNetLoad('레그 프레스', 30), null, '정방향 종목엔 의미가 없다');
  app.state.profile.weight = 0;
  assert.equal(app.assistNetLoad('어시스트 풀업', 30), null);
  app.state.profile.weight = prev;
});

// ═══ 6. PR 문구 ═══
test('PR 문구: 어시스트는 "보조 −5kg"이 신기록, 정방향은 "+5.0kg"', () => {
  const revPR = { exerciseName: '어시스트 풀업', weight: 35, previousWeight: 40, reps: 8 };
  assert.equal(app.formatPRDelta(revPR), '보조 −5kg');
  assert.match(app.formatPRChange(revPR), /보조 40kg → 보조 35kg/);

  const fwdPR = { exerciseName: '레그 프레스', weight: 155, previousWeight: 150, reps: 8 };
  assert.equal(app.formatPRDelta(fwdPR), '+5.0kg');
});

// ═══ 7. 정체기 판정 (AI 컨텍스트) ═══
test('정체: 보조가 꾸준히 줄어드는 종목을 정체로 잡지 않는다', () => {
  // 4세션·4주 이상 관찰 가드를 넘기도록 넉넉히 심는다
  seedLog([
    workout(daysAgo(3), '어시스트 풀업', [set(25, 6), set(25, 6)]),
    workout(daysAgo(12), '어시스트 풀업', [set(30, 6), set(30, 6)]),
    workout(daysAgo(21), '어시스트 풀업', [set(35, 6), set(35, 6)]),
    workout(daysAgo(33), '어시스트 풀업', [set(40, 6), set(40, 6)]),
  ]);
  assert.ok(app.getStalledLifts().indexOf('어시스트 풀업') === -1, '보조 40 → 25kg은 훌륭한 진행이다');
});

test('정체: 보조도 반복도 그대로면 정체로 잡는다', () => {
  seedLog([
    workout(daysAgo(3), '어시스트 풀업', [set(40, 6), set(40, 6)]),
    workout(daysAgo(12), '어시스트 풀업', [set(40, 6), set(40, 6)]),
    workout(daysAgo(21), '어시스트 풀업', [set(40, 6), set(40, 6)]),
    workout(daysAgo(33), '어시스트 풀업', [set(40, 6), set(40, 6)]),
  ]);
  assert.ok(app.getStalledLifts().indexOf('어시스트 풀업') !== -1);
});

// ═══ 8. AI 프롬프트 ═══
test('프롬프트: 코치 지식 블록이 어시스트 방향 반전을 명시한다', () => {
  assert.match(app.COACH_KNOWLEDGE, /어시스트\(보조\) 기구 종목/);
  assert.match(app.COACH_KNOWLEDGE, /보조를 한 칸 \*\*내린다\*\*/);
});
