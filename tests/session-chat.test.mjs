// 세트 사이 채팅 (3단계) — SSE 파서 + 신호 적용 + 피드백 루프 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();
const plain = (v) => JSON.parse(JSON.stringify(v));

// ═══ 1. SSE 스트림 파서 (순수 함수) ═══
test('SSE 파서: content_block_delta 텍스트만 뽑는다', () => {
  const buf =
    'event: message_start\n' +
    'data: {"type":"message_start"}\n\n' +
    'event: content_block_delta\n' +
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"안녕"}}\n\n' +
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"하세요"}}\n';
  const r = app.parseSSEStream(buf);
  assert.deepEqual(plain(r.deltas), ['안녕', '하세요']);
  assert.equal(r.rest, '');
});

test('SSE 파서: 줄이 안 끝난 조각은 rest로 남긴다 (청크 경계)', () => {
  const part1 = 'data: {"type":"content_block_delta","delta":{"text":"완성"}}\ndata: {"type":"content_bl';
  const r1 = app.parseSSEStream(part1);
  assert.deepEqual(plain(r1.deltas), ['완성']);
  assert.equal(r1.rest, 'data: {"type":"content_bl');
  // 다음 청크가 오면 이어붙여 파싱
  const r2 = app.parseSSEStream(r1.rest + 'ock_delta","delta":{"text":"이어짐"}}\n');
  assert.deepEqual(plain(r2.deltas), ['이어짐']);
});

test('SSE 파서: 깨진 JSON·다른 이벤트는 조용히 무시', () => {
  const buf = 'data: {broken json}\ndata: {"type":"message_stop"}\n\n';
  const r = app.parseSSEStream(buf);
  assert.deepEqual(plain(r.deltas), []);
});

// ═══ 2. 신호 적용 (확인 후 저장) ═══
test('신호 적용: 통증 → painFlag + painNote', () => {
  const ex = { name: '덤벨 벤치 프레스', sets: [] };
  const ok = app.applyChatSignalToExercise(ex, { pain: true, painNote: '어깨 앞쪽 찌릿', feel: null, rpe: null });
  assert.equal(ok, true);
  assert.equal(ex.painFlag, true);
  assert.equal(ex.painNote, '어깨 앞쪽 찌릿');
});

test('신호 적용: 자극·RPE / 빈 신호는 false', () => {
  const ex = { name: '랫풀다운' };
  assert.equal(app.applyChatSignalToExercise(ex, { feel: 'bad', rpe: 9 }), true);
  assert.equal(ex.feel, 'bad');
  assert.equal(ex.chatRpe, 9);
  assert.equal(app.applyChatSignalToExercise({ name: 'x' }, {}), false);
  assert.equal(app.applyChatSignalToExercise(null, { pain: true }), false);
});

// ═══ 3. 피드백 루프: painFlag → 통증 게이트, feel → 컨텍스트 표식 ═══
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

test('피드백: 채팅으로 저장된 painFlag를 통증 게이트(hasRecentPain)가 읽는다', () => {
  const origLog = app.state.data.workoutLog;
  app.state.data.workoutLog = [{
    date: daysAgo(2), sessionKr: 'PUSH', duration: 50,
    exercises: [{ name: '덤벨 벤치 프레스', painFlag: true, painNote: '어깨 찌릿',
      setsDetail: [{ weight: 30, reps: 8, completed: true, isWarmup: false }] }]
  }];
  app._lastSetsCache = null;
  assert.equal(app.hasRecentPain('덤벨 벤치 프레스', 14), true);
  app.state.data.workoutLog = origLog;
  app._lastSetsCache = null;
});

test('피드백: feel=bad가 최근 자극 조회로 나온다 (15일 지나면 무시)', () => {
  const origLog = app.state.data.workoutLog;
  app.state.data.workoutLog = [{
    date: daysAgo(3), exercises: [{ name: '랫풀다운', feel: 'bad', setsDetail: [{ weight: 50, reps: 10, completed: true, isWarmup: false }] }]
  }, {
    date: daysAgo(20), exercises: [{ name: '풀업', feel: 'bad', setsDetail: [{ weight: 0, reps: 8, completed: true, isWarmup: false }] }]
  }];
  app._lastSetsCache = null;
  assert.equal(app.getRecentFeel('랫풀다운', 14), 'bad');
  assert.equal(app.getRecentFeel('풀업', 14), null);
  assert.equal(app.getRecentFeel('없는종목', 14), null);
  app.state.data.workoutLog = origLog;
  app._lastSetsCache = null;
});

test('피드백: buildUserContext 최근 수행 표에 통증·자극 표식이 붙는다', () => {
  const origLog = app.state.data.workoutLog;
  app.state.data.workoutLog = [{
    date: daysAgo(2), sessionKr: 'PUSH', duration: 50,
    exercises: [
      { name: '덤벨 벤치 프레스', maxWeight: 30, painFlag: true, setsDetail: [{ weight: 30, reps: 8, completed: true, isWarmup: false }] },
      { name: '랫풀다운', maxWeight: 50, feel: 'bad', setsDetail: [{ weight: 50, reps: 10, completed: true, isWarmup: false }] }
    ]
  }];
  app._lastSetsCache = null;
  const ctx = app.buildUserContext();
  assert.ok(ctx.includes('최근 통증 보고'), '통증 표식 누락');
  assert.ok(ctx.includes('자극 나쁨'), '자극 표식 누락');
  app.state.data.workoutLog = origLog;
  app._lastSetsCache = null;
});

// ═══ 4. 세션 채팅 컨텍스트 블록 ═══
test('세션 컨텍스트: 현재 종목·완료 세트가 들어간다', () => {
  const origSession = app.state.activeSession;
  app.state.activeSession = {
    sessionName: 'PUSH', currentExerciseIdx: 0,
    exercises: [{ name: '덤벨 벤치 프레스', type: '복합', targetReps: '5-8', sets: [
      { weight: 30, reps: 8, completed: true, isWarmup: false },
      { weight: 30, reps: 8, completed: false, isWarmup: false }
    ] }]
  };
  const ctx = app.buildSessionChatContext();
  assert.ok(ctx.includes('덤벨 벤치 프레스'));
  assert.ok(ctx.includes('30kg×8'));
  assert.ok(ctx.includes('1/2'));
  app.state.activeSession = origSession;
});

test('세션 컨텍스트: 세션 없으면 빈 문자열', () => {
  const origSession = app.state.activeSession;
  app.state.activeSession = null;
  assert.equal(app.buildSessionChatContext(), '');
  app.state.activeSession = origSession;
});
