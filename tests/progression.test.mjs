// 점진적 과부하 엔진 — 종목 클래스 + 가드레일 테스트 (md 개편 지시문 Phase 5)
// 핵심 계약: 경량 고립(사이드 레터럴)에 "무겁게 10회" 같은 제안이 나오면 실패.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();

// ── 헬퍼 ──
function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}
function set(weight, reps, extra) {
  return Object.assign({ weight, reps, isWarmup: false, completed: true }, extra || {});
}
function workout(date, name, sets) {
  return { date, sessionKr: 'PUSH', duration: 60, sets: sets.length, exercises: [{ name, setsDetail: sets }] };
}
function seedLog(entries) {
  app.state.data.workoutLog = entries;
  app._lastSetsCache = null; // 종목별 최근 세트 캐시 무효화
}

// ═══ 1. 종목 클래스 분류 ═══
test('클래스: 경량 고립 (사이드 레터럴, 리버스 펙덱)', () => {
  assert.equal(app.getExerciseClass('사이드 레터럴 레이즈'), 'light_isolation');
  assert.equal(app.getExerciseClass('덤벨 사이드 레터럴 레이즈'), 'light_isolation');
  assert.equal(app.getExerciseClass('리버스 펙 덱 플라이'), 'light_isolation');
  assert.equal(app.getExerciseClass('카프 레이즈'), 'light_isolation');
});

test('클래스: 고중량 복합 (풀업, 벤치, 스쿼트, 데드)', () => {
  assert.equal(app.getExerciseClass('풀업'), 'compound_heavy');
  assert.equal(app.getExerciseClass('덤벨 벤치 프레스'), 'compound_heavy');
  assert.equal(app.getExerciseClass('핵 스쿼트'), 'compound_heavy');
  assert.equal(app.getExerciseClass('데드리프트'), 'compound_heavy');
});

test('클래스: 중강도 복합 (머신 로우, 레그 프레스)', () => {
  assert.equal(app.getExerciseClass('머신 시티드 로우'), 'compound_moderate');
  assert.equal(app.getExerciseClass('레그 프레스'), 'compound_moderate');
  assert.equal(app.getExerciseClass('머신 시티드 숄더 프레스'), 'compound_moderate');
});

test('클래스: 일반 고립 (컬, 트라이셉스)', () => {
  assert.equal(app.getExerciseClass('바벨 컬'), 'isolation');
  assert.equal(app.getExerciseClass('트라이셉스 푸시다운'), 'isolation');
});

test('클래스: 재활 (밴드·외회전·클램쉘·TKE·페이스풀 — 미등록 이름 포함)', () => {
  assert.equal(app.getExerciseClass('밴드 외회전'), 'rehab');
  assert.equal(app.getExerciseClass('클램쉘'), 'rehab');
  assert.equal(app.getExerciseClass('터미널 니 익스텐션'), 'rehab');
  assert.equal(app.getExerciseClass('페이스 풀'), 'rehab');
});

test('클래스: 미등록 무명 종목은 isolation 폴백', () => {
  assert.equal(app.getExerciseClass('처음 보는 이상한 운동'), 'isolation');
});

// ═══ 2. 반복범위 가드레일 (클램프) ═══
test('클램프: 경량 고립에 8-10 지시 → 클래스 범위(15-25)로 교정', () => {
  const r = app.clampRepsToClass('사이드 레터럴 레이즈', '8-10');
  assert.equal(r.low, 15);
  assert.equal(r.high, 25);
});

test('클램프: 범위 안이면 그대로, 걸치면 교집합', () => {
  const ok = app.clampRepsToClass('레그 프레스', '8-10'); // moderate 8-12 안
  assert.equal(ok.low, 8);
  assert.equal(ok.high, 10);
  const cut = app.clampRepsToClass('덤벨 벤치 프레스', '8-12'); // heavy 5-8과 교집합 = 8
  assert.equal(cut.low, 8);
  assert.equal(cut.high, 8);
});

// ═══ 3. md 필수 테스트: 사이드 레터럴 파괴 금지 ═══
test('경량 고립: 5kg×25 한 세션 → 증량 금지 + 저반복 제안 금지', () => {
  seedLog([workout(daysAgo(2), '덤벨 사이드 레터럴 레이즈', [set(5, 25), set(5, 25), set(5, 25)])]);
  const rec = app.getProgressiveRecommendation('덤벨 사이드 레터럴 레이즈', '8-10');
  assert.ok(rec, '추천이 나와야 함');
  assert.equal(rec.weight, 5, '한 세션 상단 달성으로는 증량 금지');
  assert.notEqual(rec.source, 'progress');
  assert.ok(rec.repRange.low >= 15, '15회 미만 제안 금지 (10회 제안 = md 실패 케이스)');
});

test('경량 고립: 상단 2세션 연속 달성 → 그때만 최소 단위 증량', () => {
  seedLog([
    workout(daysAgo(2), '덤벨 사이드 레터럴 레이즈', [set(6, 25), set(6, 25), set(6, 25)]),
    workout(daysAgo(5), '덤벨 사이드 레터럴 레이즈', [set(6, 25), set(6, 25), set(6, 25)]),
  ]);
  const rec = app.getProgressiveRecommendation('덤벨 사이드 레터럴 레이즈', '15-25');
  assert.equal(rec.source, 'progress');
  assert.equal(rec.weight, 8, '덤벨 최소 단위 +2kg만 (2kg 격자 스냅)');
});

// ═══ 4. md 필수 테스트: 재활 종목 증량 금지 ═══
test('재활: 밴드 외회전 → 어떤 경우에도 증량 제안 금지', () => {
  seedLog([
    workout(daysAgo(1), '밴드 외회전', [set(0, 20), set(0, 20)]),
    workout(daysAgo(4), '밴드 외회전', [set(0, 20), set(0, 20)]),
  ]);
  const rec = app.getProgressiveRecommendation('밴드 외회전', '15-20');
  assert.ok(rec, '재활 종목도 추천 카드는 나와야 함 (무게 0 허용)');
  assert.equal(rec.source, 'rehab');
  assert.notEqual(rec.source, 'progress');
});

// ═══ 5. 고중량 복합: 2세션 연속 상단 규칙 ═══
test('고중량 복합: 상단 1세션 달성 → 아직 유지', () => {
  seedLog([workout(daysAgo(2), '덤벨 벤치 프레스', [set(30, 8), set(30, 8), set(30, 8)])]);
  const rec = app.getProgressiveRecommendation('덤벨 벤치 프레스', '5-8');
  assert.equal(rec.source, 'maintain');
  assert.equal(rec.weight, 30);
});

test('고중량 복합: 상단 2세션 연속 달성 → 증량', () => {
  seedLog([
    workout(daysAgo(2), '덤벨 벤치 프레스', [set(30, 8), set(30, 8), set(30, 8)]),
    workout(daysAgo(5), '덤벨 벤치 프레스', [set(30, 8), set(30, 8), set(30, 8)]),
  ]);
  const rec = app.getProgressiveRecommendation('덤벨 벤치 프레스', '5-8');
  assert.equal(rec.source, 'progress');
  assert.equal(rec.weight, 32);
});

// ═══ 6. 중강도 복합·일반 고립: 기존 더블 프로그레션 (1세션 상단 → 증량) ═══
test('중강도 복합: 상단 1세션 달성 → 증량 (+5)', () => {
  seedLog([workout(daysAgo(2), '레그 프레스', [set(100, 12), set(100, 12), set(100, 12)])]);
  const rec = app.getProgressiveRecommendation('레그 프레스', '8-12');
  assert.equal(rec.source, 'progress');
  assert.equal(rec.weight, 105);
});

test('일반 고립: 상단 미달 → 같은 무게 유지', () => {
  seedLog([workout(daysAgo(2), '바벨 컬', [set(20, 13), set(20, 12), set(20, 11)])]);
  const rec = app.getProgressiveRecommendation('바벨 컬', '12-15');
  assert.equal(rec.source, 'maintain');
  assert.equal(rec.weight, 20);
});

// ═══ 7. 통증 게이트: 최근 2주 통증 기록 → 증량 금지 ═══
test('통증 게이트: 상단 달성해도 최근 통증 있으면 증량 금지', () => {
  seedLog([
    workout(daysAgo(2), '레그 프레스', [set(100, 12), set(100, 12, { painFlag: true, painSite: '무릎' })]),
  ]);
  const rec = app.getProgressiveRecommendation('레그 프레스', '8-12');
  assert.notEqual(rec.source, 'progress');
  assert.equal(rec.weight, 100);
  assert.ok(rec.painGated, '통증 게이트 표시가 있어야 함');
});

test('통증 게이트: 15일 지난 통증은 게이트 해제', () => {
  seedLog([
    workout(daysAgo(2), '레그 프레스', [set(100, 12), set(100, 12)]),
    workout(daysAgo(16), '레그 프레스', [set(100, 12, { painFlag: true })]),
  ]);
  const rec = app.getProgressiveRecommendation('레그 프레스', '8-12');
  assert.equal(rec.source, 'progress');
});
