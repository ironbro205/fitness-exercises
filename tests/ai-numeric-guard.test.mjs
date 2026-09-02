// AI 응답 파싱 경계의 타입 강제 회귀 테스트.
//
// 배경: 모델은 숫자 칸에 "3-4" · "40kg" · "90초" 같은 글자를 넣는다. #57 에서 화면 출력은
// escapeHtml 로 막았지만 **타입은 그대로**여서 그 글자가 계산까지 흘러갔다.
// 이 파일은 js/ai.js 의 파싱 지점(aiNum/aiInt/aiRange/aiEnum + normalizeAIExercise)이
// 그 값을 실제로 접는지, 그리고 접힌 값이 세션·저장까지 성한지를 지킨다.
//
// ★이 테스트들은 "화면에 어떻게 보이나"가 아니라 **타입과 계산 결과**를 본다.
//   이스케이프(#57)는 이미 다른 테스트가 지킨다.
// ★칸마다 목표 타입이 다르다: 세트 수·무게·시간은 **숫자**, 반복·RIR·휴식은 **범위 문자열**
//   ("rir":"2-3" · "rest":"120-180" 은 이 앱의 프롬프트가 직접 요구하는 정상값이다).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

// vm 안에서 만들어진 객체는 프로토타입이 달라 deepStrictEqual 이 걸린다 — 값만 비교하려고 한 번 평탄화한다.
const plain = (v) => JSON.parse(JSON.stringify(v));

// 앱 로드 + Anthropic 응답 한 통을 흉내 내는 fetch 스텁.
// 앱 코드는 전역 fetch 를 부르므로 sandbox 의 fetch 만 바꿔 끼우면 된다.
function appWithAIResponse(payload) {
  const app = loadApp();
  app.state.apiKey = 'sk-test';
  app.fetch = () => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ content: [{ type: 'text', text: JSON.stringify(payload) }] }),
  });
  return app;
}

const app = loadApp();

// ═══════════════════════════════════════════════
// 1. 강제 헬퍼 자체
// ═══════════════════════════════════════════════

test('aiNum — 글자 속 첫 숫자를 읽는다 (범위는 아래값 = 보수적)', () => {
  assert.equal(app.aiNum('3-4', 99), 3, '"3-4" 는 아래값 3');
  assert.equal(app.aiNum('8~12', 99), 8, '물결표 범위도 아래값');
  assert.equal(app.aiNum('40kg', 99), 40);
  assert.equal(app.aiNum('90초', 99), 90);
  assert.equal(app.aiNum('약 3세트', 99), 3, '앞이 글자여도 뒤의 숫자를 찾는다');
  assert.equal(app.aiNum('7.5', 99), 7.5);
  assert.equal(app.aiNum('-5', 99), -5, '맨 앞의 부호는 살린다');
  assert.equal(app.aiNum(42, 99), 42);
});

test('aiNum — 숫자로 읽을 수 없으면 기본값을 그대로 돌려준다', () => {
  for (const bad of ['많이', '', '   ', null, undefined, true, false, {}, [], NaN, Infinity, -Infinity]) {
    assert.equal(app.aiNum(bad, 'FALLBACK'), 'FALLBACK', `${String(bad)} 는 기본값이어야 한다`);
  }
  assert.equal(app.aiNum('많이', null), null, '기본값이 null 이면 null');
});

test('aiNum — min/max 는 자르고, positive 는 0 이하를 "값 없음"으로 본다', () => {
  assert.equal(app.aiNum(999999, 0, { max: 500 }), 500);
  assert.equal(app.aiNum(-10, 0, { min: 0 }), 0);
  assert.equal(app.aiNum(0, 'FALLBACK', { positive: true }), 'FALLBACK');
  assert.equal(app.aiNum(-3, 'FALLBACK', { positive: true }), 'FALLBACK');
  assert.equal(app.aiNum(0, 0, {}), 0, 'positive 없이는 0 도 유효한 값');
});

test('aiInt — 반올림한 정수, 못 읽으면 기본값', () => {
  assert.equal(app.aiInt('3-4', 9), 3);
  assert.equal(app.aiInt(3.6, 9), 4);
  assert.equal(app.aiInt('많이', 9), 9);
  assert.equal(app.aiInt(undefined, null), null);
});

test('aiRange — 반복·RIR·휴식은 숫자가 아니라 "범위 문자열"로 접는다', () => {
  assert.equal(app.aiRange('8-12', 'X'), '8-12', '정상 범위는 그대로 — 접어 버리면 "2-3분"이 "2분"이 된다');
  assert.equal(app.aiRange('8~12', 'X'), '8-12', '물결표를 하이픈으로 통일');
  assert.equal(app.aiRange('10 - 15', 'X'), '10-15', '공백 제거');
  assert.equal(app.aiRange('12회', 'X'), '12');
  assert.equal(app.aiRange(8, 'X'), '8', '숫자로 와도 문자열로');
  assert.equal(app.aiRange('12-8', 'X'), '12', '뒤집힌 범위는 아래값만');
  assert.equal(app.aiRange('많이', 'X'), 'X');
  assert.equal(app.aiRange(null, 'X'), 'X');
  assert.equal(app.aiRange({}, 'X'), 'X');
  assert.equal(app.aiRange('', 'X'), 'X');
  assert.equal(app.aiRange('0-2', 'X', { min: 0 }), '0-2', 'RIR 0("실패까지")은 유효한 값');
  assert.equal(app.aiRange('0-5', 'X', { min: 1 }), '1-5', '반복 0회는 하한으로 올린다');
  assert.equal(app.aiRange('300-400', 'X', { max: 100 }), '100', '상한 초과는 잘라낸다');
  // parseRepRange · restMin 이 실제로 읽을 수 있는 형식인지까지 확인 (계약의 반대편)
  assert.deepEqual(plain(app.parseRepRange(app.aiRange('8~12', 'X'))), { low: 8, high: 12 });
});

test('시간 칸 — 단위를 읽어 환산한다 (숫자만 읽으면 "2분 쉬세요"가 2초가 된다)', () => {
  const REST = { min: 10, max: 900, unit: 'sec' };
  assert.equal(app.aiRange('2분', null, REST), '120');
  assert.equal(app.aiRange('2-3분', null, REST), '120-180', '범위는 양끝에 같은 단위를 적용한다');
  assert.equal(app.aiRange('1.5분', null, REST), '90', '소수 분도 초로');
  assert.equal(app.aiRange('90초', null, REST), '90');
  assert.equal(app.aiRange('120-180', null, REST), '120-180', '단위가 없으면 그 칸의 기본 단위(초)로 본다');

  const DUR = { positive: true, max: 300, unit: 'min' };
  assert.equal(app.aiInt('1시간', 60, DUR), 60);
  assert.equal(app.aiInt('60분', 60, DUR), 60);
  assert.equal(app.aiInt('90 min', 60, DUR), 90);
  assert.equal(app.aiInt(60, 60, DUR), 60, '숫자로 오면 그대로');

  // 단위를 안 보는 칸(무게·반복)은 영향받지 않는다
  assert.equal(app.aiNum('40kg', null, { min: 0, max: 500 }), 40);
  assert.equal(app.aiRange('8-12', 'X', { min: 1, max: 100 }), '8-12');
});

test('유산소 — 구간 시간 단위가 섞여도 비율이 맞는다', () => {
  // "5분"(=300초)과 "120초"가 섞여 오는 경우. 숫자만 읽으면 5:120 비율로 짜여
  // 몸풀기가 30초, 본 구간이 29분30초가 된다.
  const segs = app.cardioFitToTotal(
    [
      { type: 'warmup', sec: '5분', speed: 5, label: 'w' },
      { type: 'walk', sec: '600초', speed: 5.5, label: 'm' },
    ],
    1800,
    { defaultSpeed: { warmup: 5, walk: 5.5 }, defaultLabel: { warmup: '몸풀기', walk: '본 구간' } }
  );
  assert.ok(segs);
  assert.equal(segs[0].endSec, 600, '300:600 비율 → 30분의 1/3 = 10분');
  assert.equal(segs[1].endSec, 1800);
});

test('루틴 종목 — 휴식을 "2-3분"으로 줘도 화면 표기가 "2-3분" 그대로다', () => {
  const ex = app.normalizeAIExercise({ name: '벤치프레스', rest: '2-3분' });
  assert.equal(ex.rest, '120-180');
  assert.equal(parseInt(String(ex.rest), 10), 120, 'getEffectiveRestSec 이 읽는 아래값');
});

test('aiEnum — 목록 밖 라벨은 기본값으로 접는다', () => {
  assert.equal(app.aiEnum('moderate', app.AI_INTENSITY_LEVELS, 'moderate'), 'moderate');
  assert.equal(app.aiEnum('빡세게', app.AI_INTENSITY_LEVELS, 'moderate'), 'moderate');
  assert.equal(app.aiEnum('A', app.AI_GRADES, 'B'), 'A');
  assert.equal(app.aiEnum('A+', app.AI_GRADES, 'B'), 'B');
  assert.equal(app.aiEnum(null, app.AI_SEVERITIES, 'medium'), 'medium');
});

// ═══════════════════════════════════════════════
// 2. 루틴 종목 정규화 (normalizeAIExercise)
// ═══════════════════════════════════════════════

test('normalizeAIExercise — 숫자 칸은 언제나 숫자로 나온다', () => {
  const ex = app.normalizeAIExercise({
    name: '벤치프레스', type: '복합', isMain: true,
    sets: '3-4', reps: '6~8', weight: '60kg', rir: '2~3', rest: '120~180초', note: 'n',
  });
  assert.equal(typeof ex.sets, 'number', '세트 수는 진짜 숫자 (buildSchemeSets 의 for 루프가 이걸 센다)');
  assert.equal(ex.sets, 3);
  assert.equal(typeof ex.weight, 'number');
  assert.equal(ex.weight, 60);
  // 반복·RIR·휴식은 범위를 살린 채 형식만 통일한다
  assert.equal(ex.reps, '6-8');
  assert.equal(ex.rir, '2-3');
  assert.equal(ex.rest, '120-180');
});

test('normalizeAIExercise — 휴식 범위는 화면 표기("2-3분")까지 살아남는다', () => {
  const ex = app.normalizeAIExercise({ name: '벤치프레스', rest: '120-180' });
  assert.equal(ex.rest, '120-180', '숫자 하나로 접으면 "2-3분"이 "2분"이 된다');
  // 읽는 쪽 계약: getEffectiveRestSec 은 parseInt 로 아래값을 쓴다
  assert.equal(parseInt(String(ex.rest), 10), 120);
});

test('normalizeAIExercise — 무게를 못 읽으면 NaN 이 아니라 null (무게 미정)', () => {
  const ex = app.normalizeAIExercise({ name: '벤치프레스', weight: '가볍게' });
  assert.equal(ex.weight, null);
  assert.ok(!Number.isNaN(ex.weight), 'NaN 이 세트 무게로 굳으면 저장 시 조용히 사라진다');
});

test('normalizeAIExercise — 어시스트 종목의 보조 0kg(맨몸)은 살아남는다', () => {
  const ex = app.normalizeAIExercise({ name: '어시스트 풀업', weight: 0 });
  assert.equal(ex.weight, 0, '0 을 falsy 라고 버리면 "맨몸으로"가 기본 보조로 되돌아간다');
  const normal = app.normalizeAIExercise({ name: '벤치프레스', weight: 0 });
  assert.equal(normal.weight, null, '일반 종목의 0kg 은 무게 미정');
});

test('normalizeAIExercise — 빠진 칸·엉뚱한 타입은 기존 기본값으로', () => {
  const ex = app.normalizeAIExercise({});
  assert.deepEqual(
    plain({ name: ex.name, type: ex.type, sets: ex.sets, reps: ex.reps, weight: ex.weight, rir: ex.rir, rest: ex.rest, note: ex.note }),
    { name: '종목', type: '보조', sets: 3, reps: '8-12', weight: null, rir: 2, rest: null, note: '' }
  );
  const junk = app.normalizeAIExercise({ name: 123, type: {}, sets: [], reps: true, note: 7 });
  assert.equal(junk.name, '종목');
  assert.equal(junk.type, '보조');
  assert.equal(junk.sets, 3);
  assert.equal(junk.reps, '8-12');
  assert.equal(junk.note, '');
});

test('normalizeAIExercise — 병적인 값은 잘라낸다', () => {
  assert.equal(app.normalizeAIExercise({ name: '벤치프레스', sets: 99 }).sets, 10);
  assert.equal(app.normalizeAIExercise({ name: '벤치프레스', weight: 999999 }).weight, 500);
  assert.equal(app.normalizeAIExercise({ name: '벤치프레스', weight: -20 }).weight, null);
});

// ═══════════════════════════════════════════════
// 3. 실제 파싱 경로 — 루틴 생성
// ═══════════════════════════════════════════════

test('루틴 생성 — 문자열 세트가 그대로 흘러들어오지 않는다', async () => {
  const a = appWithAIResponse({
    headline: 'h', reason: 'r', duration: '1시간', intensity: '빡세게',
    exercises: [
      { name: '벤치프레스', type: '복합', isMain: true, sets: '3-4', reps: '6-8', weight: '60kg', rir: 2, rest: '90초' },
      { name: '인클라인 덤벨 프레스', type: '복합', sets: '3', reps: '8-12', weight: 20, rir: 2 },
    ],
  });
  const r = await a.generateFullRoutine('push');

  assert.equal(typeof r.exercises[0].sets, 'number');
  assert.equal(r.exercises[0].sets, 3);
  assert.equal(r.exercises[0].weight, 60);
  assert.equal(r.exercises[0].rest, '90');
  assert.equal(r.duration, 60, '"1시간" 은 60분 — 단위를 안 보면 1분짜리 루틴이 된다');
  assert.equal(r.intensity, 'moderate', '목록 밖 강도는 기본값');
});

test('루틴 생성 — totalSets 가 빠지면 숫자 합계가 나온다 (문자열 이어붙이기 금지)', async () => {
  const a = appWithAIResponse({
    headline: 'h',
    exercises: [
      { name: '벤치프레스', type: '복합', sets: '4', reps: '6-8', weight: 60, rir: 2 },
      { name: '랫풀다운', type: '복합', sets: '3', reps: '8-12', weight: 50, rir: 2 },
    ],
  });
  const r = await a.generateFullRoutine('push');
  assert.equal(typeof r.totalSets, 'number', '예전엔 "043" 같은 문자열이 됐다');
  assert.equal(r.totalSets, 7);
});

test('루틴 생성 — totalSets 에 단위가 붙어도 숫자로 읽는다', async () => {
  const a = appWithAIResponse({
    headline: 'h', totalSets: '18세트', duration: 60,
    exercises: [{ name: '벤치프레스', type: '복합', sets: 3, reps: '6-8', weight: 60, rir: 2 }],
  });
  const r = await a.generateFullRoutine('push');
  assert.equal(typeof r.totalSets, 'number');
  assert.equal(r.totalSets, 18);
});

test('루틴 생성 — 문자열 세트여도 운동 시작 시 세트가 실제로 만들어진다', async () => {
  const a = appWithAIResponse({
    headline: 'h', duration: 60, totalSets: 12, intensity: 'moderate',
    exercises: [{ name: '벤치프레스', type: '복합', isMain: true, sets: '3-4', reps: '6-8', weight: 60, rir: 2 }],
  });
  a.state.generatedRoutine = await a.generateFullRoutine('push');
  a.startGeneratedRoutine();

  const ex = a.state.activeSession.exercises[0];
  const working = ex.sets.filter((s) => !s.isWarmup);
  assert.ok(working.length > 0,
    '세트 수가 문자열이면 buildSchemeSets 의 Math.max(0,"3-4")=NaN → for 루프 0회 → 세트가 통째로 0개가 됐다');
  assert.equal(working.length, 3);
  assert.ok(ex.sets.every((s) => s.weight === null || !Number.isNaN(s.weight)), '세트 무게에 NaN 이 없다');
});

test('루틴 생성 — 무게 단위가 붙어도 세트 무게가 NaN 이 되지 않는다', async () => {
  const a = appWithAIResponse({
    headline: 'h', duration: 60, totalSets: 9, intensity: 'moderate',
    exercises: [{ name: '벤치프레스', type: '복합', isMain: true, sets: 3, reps: '6-8', weight: '60kg', rir: 2 }],
  });
  a.state.generatedRoutine = await a.generateFullRoutine('push');
  a.startGeneratedRoutine();

  const ex = a.state.activeSession.exercises[0];
  assert.ok(ex.sets.every((s) => !Number.isNaN(s.weight)), 'NaN 무게는 저장하면 null 로 굳어 기록이 사라진다');
  assert.ok(ex.sets.some((s) => s.weight === 60), '스냅된 60kg 이 실제 세트에 실린다');
});

// ═══════════════════════════════════════════════
// 4. 실제 파싱 경로 — 대화로 루틴 수정
//    (예전엔 이 경로만 정규화를 통째로 건너뛰어서, 한 번 고치면 강제가 같이 풀렸다)
// ═══════════════════════════════════════════════

test('대화 수정 — 수정안도 루틴 생성과 똑같이 접힌다', async () => {
  const a = appWithAIResponse({
    intent: 'modify', reply: 'ok', changes: [],
    updatedRoutine: {
      headline: 'h', duration: '45분', totalSets: '9', intensity: '아주 빡세게',
      exercises: [{ name: '벤치프레스', type: '복합', sets: '4-5', reps: '6~8', weight: '65kg', rir: '1~2', rest: '120초' }],
    },
  });
  const res = await a.modifyRoutineWithAI(
    { headline: 'h', bodyPart: 'push', exercises: [{ name: '벤치프레스', sets: 3, reps: '6-8', weight: 60 }] },
    '더 빡세게', []
  );

  const ex = res.updatedRoutine.exercises[0];
  assert.equal(typeof ex.sets, 'number');
  assert.equal(ex.sets, 4);
  assert.equal(ex.reps, '6-8');
  assert.equal(ex.weight, 65, '이 경로도 무게 스냅(실제 기구 단위)을 거친다');
  assert.equal(ex.rir, '1-2');
  assert.equal(ex.rest, '120');
  assert.equal(res.updatedRoutine.duration, 45);
  assert.equal(res.updatedRoutine.totalSets, 9);
  assert.equal(res.updatedRoutine.intensity, null, '목록 밖 강도는 비워 둬야 기존 값이 살아남는다');
});

test('대화 수정 — 못 읽은 껍데기 값은 비워 두고, 적용하면 기존 값이 남는다', async () => {
  const a = appWithAIResponse({
    intent: 'modify', reply: 'ok', changes: [],
    updatedRoutine: {
      exercises: [{ name: '벤치프레스', type: '복합', sets: 4, reps: '6-8', weight: 60, rir: 2 }],
    },
  });
  const res = await a.modifyRoutineWithAI(
    { headline: 'h', bodyPart: 'push', exercises: [{ name: '벤치프레스', sets: 3 }] }, '고쳐줘', []
  );
  assert.equal(res.updatedRoutine.duration, null);
  assert.equal(res.updatedRoutine.totalSets, null);

  // approveRoutineChange 의 `pr.duration || 기존값` 계약이 성립하는지 (null 이어야 기존 값이 산다)
  a.state.generatedRoutine = { headline: '기존', duration: 60, totalSets: 18, intensity: 'moderate', exercises: [] };
  a.state.routineChatHistory = [{ pendingRoutine: res.updatedRoutine }];
  a.approveRoutineChange(0);
  assert.equal(a.state.generatedRoutine.duration, 60);
  assert.equal(a.state.generatedRoutine.totalSets, 18);
  assert.equal(a.state.generatedRoutine.intensity, 'moderate');
});

test('대화 수정 — 수정안이 저장(새로고침 복원)까지 숫자로 남는다', async () => {
  const a = appWithAIResponse({
    intent: 'modify', reply: 'ok', changes: [],
    updatedRoutine: { exercises: [{ name: '벤치프레스', type: '복합', sets: '4-5', reps: '6-8', weight: '65kg', rir: 2 }] },
  });
  const res = await a.modifyRoutineWithAI(
    { headline: 'h', bodyPart: 'push', exercises: [{ name: '벤치프레스', sets: 3 }] }, '고쳐줘', []
  );
  a.state.generatedRoutine = { headline: 'h', duration: 60, totalSets: 12, intensity: 'moderate', exercises: [] };
  a.state.routineChatHistory = [{ pendingRoutine: res.updatedRoutine }];
  a.approveRoutineChange(0);
  a.saveWizard();

  // 마법사·활성세션 저장소는 백업 복원 sanitizer 를 타지 않는다 → 파싱 경계에서 접지 않으면 새로고침 후에도 문자열로 남는다.
  const restored = a.storage.get(a.KEYS.WORKOUT_WIZARD).generatedRoutine.exercises[0];
  assert.equal(typeof restored.sets, 'number');
  assert.equal(restored.sets, 4);
  assert.equal(restored.weight, 65);
});

// ═══════════════════════════════════════════════
// 5. 나머지 파싱 지점
// ═══════════════════════════════════════════════

test('주간 리뷰 — 등급은 정해진 목록만, 목록 항목은 글자만 남는다', async () => {
  const a = appWithAIResponse({
    headline: 'h', grade: 'A+', coachNote: 'c',
    wins: ['좋았어요', { obj: 1 }, 3], improvements: 'not-an-array', nextWeek: [],
  });
  a.state.data.workoutLog = [];
  const r = await a.generateWeeklyReview(true);
  assert.equal(r.grade, 'B', '"A+" 는 목록 밖 → 기본 등급');
  assert.deepEqual(plain(r.wins), ['좋았어요', '3'], '객체 항목만 빠지고 나머지는 남는다');
  assert.deepEqual(plain(r.improvements), [], '배열이 아니면 빈 목록');
});

test('정체기 분석 — 심각도는 정해진 목록만', async () => {
  const a = appWithAIResponse({ severity: '아주높음', diagnosis: 'd', primary_cause: 'p', recommendations: ['r'], encouragement: 'e' });
  const r = await a.analyzePlateauWithAI(['lift_stalled']);
  assert.equal(r.severity, 'medium');
  assert.deepEqual(plain(r.recommendations), ['r']);
});

test('유산소 — 속도·경사·시간에 단위가 붙어도 구간을 버리지 않는다', () => {
  // ★기본값과 다른 속도를 일부러 쓴다 — 기본값과 같으면 "강제했는지"와 "폴백으로 떨어졌는지"를 구분할 수 없다.
  const segs = app.cardioFitToTotal(
    [
      { type: 'warmup', sec: '300초', speed: '4.5km/h', incline: '0%', label: 'w' },
      { type: 'walk', sec: '1500초', speed: '6.2 km/h', incline: '8%', label: 'm' },
    ],
    1800,
    { defaultSpeed: { warmup: 5, walk: 5.5 }, defaultLabel: { warmup: '몸풀기', walk: '본 구간' }, incline: true, inclineMax: 12 }
  );
  assert.ok(segs, 'Number("300초")=NaN 이라 예전엔 두 구간 모두 버려져 폴백으로 떨어졌다');
  assert.equal(segs.length, 2);
  assert.equal(segs[0].speed, 4.5, '"4.5km/h" 를 기본값(5)이 아니라 4.5 로 읽는다');
  assert.equal(segs[1].speed, 6.2, '"6.2 km/h" 를 기본값(5.5)이 아니라 6.2 로 읽는다');
  assert.equal(segs[1].incline, 8, '"8%" 를 0 이 아니라 8 로 읽는다');
  assert.equal(segs[segs.length - 1].endSec, 1800, '총시간 계약은 그대로');
});

test('세트 사이 채팅 — RPE 를 글자로 줘도 신호를 버리지 않는다', async () => {
  const a = appWithAIResponse({ pain: false, painNote: null, feel: null, rpe: '8' });
  const sig = await a.extractWorkoutSignals('좀 힘드네요', '벤치프레스');
  assert.ok(sig, '"8" 을 숫자가 아니라고 버리면 신호가 통째로 사라진다');
  assert.equal(sig.rpe, 8);

  const b = appWithAIResponse({ pain: false, painNote: null, feel: null, rpe: 15 });
  assert.equal(await b.extractWorkoutSignals('x', '벤치프레스'), null, '범위 밖 RPE 는 지어내지 않고 버린다');
});
