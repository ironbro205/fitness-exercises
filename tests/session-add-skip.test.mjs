// 운동 중 종목 추가 · 종목 건너뛰기 테스트
// 핵심 계약:
//  · 추가한 종목은 **현재 종목 바로 다음** 자리에 들어가고, 무게·세트는 기존 엔진(getSessionSetPlan)이 정한다
//  · 배열 중간 삽입으로 밀린 index(슈퍼세트 짝·제안무시·휴식타이머·편집중 세트·채팅신호)가 함께 밀린다
//  · 세션 지속성(localStorage)에 즉시 반영되어 새로고침 복원이 그대로 동작한다
//  · 건너뛰기는 **미완료 세트만** 떼어내고 완료 세트는 보존한다 → 완료 기록·볼륨 집계가 어긋나지 않는다
//  · 한 세트도 안 한 채 건너뛴 종목은 workoutLog에 빈 세트로 남지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();
const plain = (v) => JSON.parse(JSON.stringify(v));

function resetLog() {
  app.state.data.workoutLog = [];
  app._lastSetsCache = null; // 종목별 최근 세트 캐시 무효화
}

// 세션 하나를 새로 만든다. names 순서대로 종목이 들어간다.
function makeSession(names) {
  app.state.restTimer = null;
  app.state.editingSet = null;
  app.state.sessionChatPending = null;
  app.state.exerciseMenuOpen = false;
  app.state.exerciseSwapOpen = false;
  app.state.activeSession = {
    sessionType: 'pull',
    sessionName: '테스트 세션',
    startTime: Date.now() - 600000,
    currentExerciseIdx: 0,
    exercises: names.map((n) => app.buildSessionExercise(n)),
  };
  return app.state.activeSession;
}

function completeFirstWorkingSets(ex, n) {
  let done = 0;
  for (const s of ex.sets) {
    if (done >= n) break;
    if (s.isWarmup) continue;
    s.completed = true;
    done++;
  }
}

// ═══ 1. 세션 종목 만들기 (buildSessionExercise) ═══

test('추가 종목의 반복범위·세트법·휴식은 그 종목 클래스 규칙을 그대로 따른다', () => {
  resetLog();
  const heavy = app.buildSessionExercise('핵 스쿼트');       // compound_heavy 5-8, 탑+백오프
  assert.equal(heavy.targetReps, '5-8');
  assert.equal(heavy.scheme, 'top_backoff');
  assert.equal(heavy.type, '복합');
  assert.ok(heavy.sets.some((s) => s.role === 'top'));
  assert.ok(heavy.sets.some((s) => s.role === 'backoff'));

  const light = app.buildSessionExercise('덤벨 사이드 레터럴 레이즈'); // light_isolation 15-25
  assert.equal(light.targetReps, '15-25');
  assert.equal(light.scheme, 'straight');
  assert.equal(light.type, '고립');
  // 고립 이하는 첫 워킹세트가 자체 워밍업이라 워밍업 세트를 넣지 않는다
  assert.equal(light.sets.filter((s) => s.isWarmup).length, 0);
});

test('목록에 없는 이름도 그대로 추가된다 (무게 미정 = 사용자가 입력)', () => {
  resetLog();
  const ex = app.buildSessionExercise('사장님표 특수 운동');
  assert.equal(ex.name, '사장님표 특수 운동');
  assert.ok(ex.sets.length > 0);
  assert.equal(ex.sets[0].weight, null);
  assert.equal(ex.addedInSession, true);
});

test('기록이 있으면 추천 엔진의 무게가 그대로 쓰인다 (첫 시도면 1RM 추정)', () => {
  resetLog();
  const noRecord = app.buildSessionExercise('레그 프레스');
  const rmBased = app.getProgressiveRecommendation('레그 프레스', '8-12');
  assert.equal(rmBased.source, 'rm_estimate');

  // 실제 수행 기록을 심으면 추천이 기록 기반으로 바뀌고, 세트 무게도 그 값을 따라간다
  app.state.data.workoutLog = [{
    date: new Date().toISOString().slice(0, 10),
    exercises: [{
      name: '레그 프레스',
      setsDetail: [
        { weight: 120, reps: 12, completed: true, isWarmup: false },
        { weight: 120, reps: 12, completed: true, isWarmup: false },
      ],
    }],
  }];
  app._lastSetsCache = null;
  const withRecord = app.buildSessionExercise('레그 프레스');
  const prog = app.getProgressiveRecommendation('레그 프레스', '8-12');
  const firstWorking = withRecord.sets.find((s) => !s.isWarmup);
  assert.equal(firstWorking.weight, prog.weight);
  assert.notEqual(withRecord.sets.find((s) => !s.isWarmup).weight, noRecord.sets.find((s) => !s.isWarmup).weight);
  resetLog();
});

// ═══ 2. 종목 추가 — 삽입 위치 · 지속성 ═══

test('추가한 종목은 현재 종목 바로 다음 자리에 들어간다 (현재 위치는 그대로)', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬', '페이스 풀']);
  s.currentExerciseIdx = 1;
  app.addExerciseAfterCurrent('레그 프레스');
  assert.deepEqual(plain(s.exercises.map((e) => e.name)), ['랫 풀 다운', '바벨 컬', '레그 프레스', '페이스 풀']);
  assert.equal(s.currentExerciseIdx, 1, '추가해도 지금 하던 종목에 머문다');
  assert.equal(s.exercises[2].addedInSession, true);
});

test('추가는 세션 저장소에 즉시 반영된다 (새로고침 복원 계약)', () => {
  resetLog();
  makeSession(['랫 풀 다운', '바벨 컬']);
  app.addExerciseAfterCurrent('레그 프레스');
  const saved = JSON.parse(app.localStorage.getItem(app.KEYS.ACTIVE_SESSION));
  assert.deepEqual(plain(saved.exercises.map((e) => e.name)), ['랫 풀 다운', '레그 프레스', '바벨 컬']);
  assert.equal(saved.currentExerciseIdx, 0);
  // 복원 조건(exercises + startTime)을 만족해야 init()이 되살린다
  assert.ok(saved.startTime > 0);
});

test('빈 이름은 추가하지 않는다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬']);
  app.addExerciseAfterCurrent('   ');
  assert.equal(s.exercises.length, 2);
});

test('삽입 지점 뒤를 가리키던 index가 모두 한 칸씩 밀린다 (엉뚱한 종목에 기록 방지)', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬', '페이스 풀', '레그 프레스']);
  s.currentExerciseIdx = 0;
  // 슈퍼세트 짝: 1 ↔ 2
  s.exercises[1].supersetWith = 2;
  s.exercises[2].supersetWith = 1;
  // techDismissed(강도 기법 제안 거절 표시)는 기능 삭제로 사라진 데이터라 더는 밀 것이 없다.
  app.state.restTimer = { startTime: Date.now(), duration: 90, exerciseIdx: 2, setIdx: 0, nextExerciseIdx: 3 };
  app.state.editingSet = { exerciseIdx: 3, setIdx: 1 };
  app.state.sessionChatPending = { exIdx: 1, pain: true };

  app.addExerciseAfterCurrent('덤벨 사이드 레터럴 레이즈');

  assert.deepEqual(plain(s.exercises.map((e) => e.name)),
    ['랫 풀 다운', '덤벨 사이드 레터럴 레이즈', '바벨 컬', '페이스 풀', '레그 프레스']);
  assert.equal(s.exercises[2].supersetWith, 3, '바벨 컬의 짝이 페이스 풀(3)로 밀린다');
  assert.equal(s.exercises[3].supersetWith, 2);
  assert.equal(app.state.restTimer.exerciseIdx, 3);
  assert.equal(app.state.restTimer.nextExerciseIdx, 4);
  assert.equal(app.state.editingSet.exerciseIdx, 4);
  assert.equal(app.state.sessionChatPending.exIdx, 2);
  // 삽입 지점 앞(0)은 그대로여야 한다
  assert.equal(s.exercises[0].name, '랫 풀 다운');
  app.state.restTimer = null;
  app.state.editingSet = null;
  app.state.sessionChatPending = null;
});

test('추가한 종목은 슈퍼세트로 자동으로 묶이지 않는다 (진행 중 짝 재배치 금지)', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬']);
  app.addExerciseAfterCurrent('벤치 프레스'); // 등 ↔ 가슴 = 길항근이지만 자동 페어링 안 함
  assert.equal(s.exercises[1].supersetWith, undefined);
  assert.equal(s.exercises[0].supersetWith, undefined);
});

// ═══ 3. 종목 건너뛰기 ═══

test('건너뛰기: 남은 세트만 떼어내고 완료 세트는 보존한다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬', '페이스 풀']);
  const ex = s.exercises[0];
  const totalBefore = ex.sets.length;
  completeFirstWorkingSets(ex, 1);

  app.applySkipExercise(0);

  assert.equal(ex.skipped, true);
  assert.equal(ex.sets.length, 1, '완료한 1세트만 남는다');
  assert.ok(ex.sets.every((x) => x.completed));
  assert.equal(ex.skippedSets.length, totalBefore - 1, '떼어낸 세트는 되돌리기용으로 보관된다');
  assert.equal(s.currentExerciseIdx, 1, '다음 종목으로 이동');
});

test('건너뛰기: 슈퍼세트 짝은 양쪽 다 풀린다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '벤치 프레스', '바벨 컬']);
  s.exercises[0].supersetWith = 1;
  s.exercises[1].supersetWith = 0;
  s.exercises[0].supersetKr = s.exercises[1].supersetKr = '등 ↔ 가슴';

  app.applySkipExercise(0);
  assert.equal(s.exercises[0].supersetWith, undefined);
  assert.equal(s.exercises[1].supersetWith, undefined);
});

test('건너뛰기: 그 종목으로 넘어가라던 휴식 안내는 지운다 (휴식 자체는 유지)', () => {
  resetLog();
  makeSession(['랫 풀 다운', '벤치 프레스']);
  app.state.restTimer = { startTime: Date.now(), duration: 45, exerciseIdx: 0, setIdx: 1, nextExerciseIdx: 1 };
  app.applySkipExercise(1);
  assert.equal(app.state.restTimer.nextExerciseIdx, null);
  assert.equal(app.state.restTimer.duration, 45);
  app.state.restTimer = null;
});

test('건너뛰기 되돌리기: 떼어 뒀던 세트가 그대로 돌아온다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬']);
  const ex = s.exercises[0];
  const before = plain(ex.sets);
  completeFirstWorkingSets(ex, 1);

  app.applySkipExercise(0);
  app.unskipExercise(0);

  assert.equal(ex.skipped, undefined);
  assert.equal(ex.skippedSets, undefined);
  assert.equal(ex.sets.length, before.length);
  assert.equal(s.currentExerciseIdx, 0, '되돌리면 그 종목으로 돌아온다');
  assert.equal(ex.sets.filter((x) => !x.completed).length, before.length - 1);
});

test('다음 이동 대상은 "할 세트가 남은" 다음 종목이다 (건너뛴 종목은 건너뜀)', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬', '페이스 풀']);
  s.exercises[1].skipped = true;
  s.exercises[1].sets = [];
  assert.equal(app.findNextPendingExerciseIdx(s, 0), 2);
  // 뒤에 남은 게 하나도 없으면 바로 다음 칸(끝이면 제자리)
  assert.equal(app.findNextPendingExerciseIdx(s, 2), 2);
});

// ═══ 4. 완료 기록과의 정합성 (workoutLog) ═══

test('한 세트도 안 하고 건너뛴 종목은 완료 기록에 남지 않는다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬']);
  completeFirstWorkingSets(s.exercises[0], 2);
  app.applySkipExercise(1); // 바벨 컬 = 한 세트도 안 함

  app.finalizeSession();

  const log = app.state.data.workoutLog[0];
  assert.deepEqual(plain(log.exercises.map((e) => e.name)), ['랫 풀 다운']);
  assert.equal(log.exerciseCount, 1);
  assert.equal(log.sets, 2);
  assert.equal(app.state.completedSession.exerciseCount, 1);
  resetLog();
});

test('세트를 하다 건너뛴 종목은 그 세트만 기록되고 볼륨도 그만큼만 센다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬']);
  completeFirstWorkingSets(s.exercises[0], 1);  // 3세트 중 1세트만 하고 건너뜀
  completeFirstWorkingSets(s.exercises[1], 3);
  app.applySkipExercise(0);

  app.finalizeSession();

  const log = app.state.data.workoutLog[0];
  const lat = log.exercises.find((e) => e.name === '랫 풀 다운');
  assert.equal(lat.setsCount, 1, '완료한 1세트만 기록');
  assert.equal(app.countWorkingSets(lat.setsDetail), 1);
  assert.equal(log.sets, 4, '전체 세트 수 = 1 + 3');
  assert.equal(app.state.completedSession.setCount, 4);
  resetLog();
});

test('추가한 종목도 완료하면 다른 종목과 똑같이 기록된다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운']);
  app.addExerciseAfterCurrent('레그 프레스');
  completeFirstWorkingSets(s.exercises[0], 1);
  completeFirstWorkingSets(s.exercises[1], 2);

  app.finalizeSession();

  const log = app.state.data.workoutLog[0];
  assert.deepEqual(plain(log.exercises.map((e) => e.name)), ['랫 풀 다운', '레그 프레스']);
  assert.equal(log.exercises[1].setsCount, 2);
  assert.equal(log.sets, 3);
  resetLog();
});

// ═══ 5. 시트 모드 (교체 / 추가 공용 화면) ═══

test('종목 고르기 시트는 모드에 따라 버튼 문구와 동작이 바뀐다 (한 화면 공용)', () => {
  resetLog();
  makeSession(['랫 풀 다운', '바벨 컬']);

  app.openExerciseSwap();
  assert.equal(app.state.exerciseSwapOpen, true);
  assert.equal(app.state.exercisePickerMode, 'swap');
  const swapHtml = app.buildSwapListHtml('');
  assert.ok(swapHtml.includes('swapCurrentExercise('));
  // #59에서 줄마다 붙던 '교체 →' 글자는 공용 chevron 아이콘 하나로 바뀌었다(그 글자가 목록의 배경이 돼서).
  // 그래서 모드 차이는 이제 ① 누를 함수 ② "목록에 없는 이름" 카드의 문구에만 남는다 — 그 둘을 본다.
  assert.ok(app.buildSwapListHtml('듣도보도못한종목').includes('이 이름 그대로 교체'));

  app.openExerciseAdd();
  assert.equal(app.state.exercisePickerMode, 'add');
  assert.equal(app.state.exerciseMenuOpen, false, '메뉴는 시트를 열면 닫힌다');
  const addHtml = app.buildSwapListHtml('');
  assert.ok(addHtml.includes('addExerciseAfterCurrent('));
  assert.ok(app.buildSwapListHtml('듣도보도못한종목').includes('이 이름 그대로 추가'));
  assert.ok(!addHtml.includes('swapCurrentExercise('));

  app.closeExerciseSwap();
  assert.equal(app.state.exerciseSwapOpen, false);
  assert.equal(app.state.exercisePickerMode, 'swap', '닫으면 기본(교체) 모드로 돌아온다');
});

test('추가 모드에서 이미 오늘 루틴에 있는 종목은 표시로 알려준다 (막지는 않음)', () => {
  resetLog();
  makeSession(['랫 풀 다운', '바벨 컬']);
  app.openExerciseAdd();
  app.state._swapQuery = '바벨 컬';
  const html = app.buildSwapListHtml('바벨 컬');
  assert.ok(html.includes('오늘 이미 있음') || !html.includes('바벨 컬'),
    '루틴에 있는 종목이 후보로 뜨면 "오늘 이미 있음" 표시가 붙는다');
  app.closeExerciseSwap();
});

test('검색해서 목록에 없는 이름을 넣으면 그 이름 그대로 추가하는 카드가 뜬다', () => {
  resetLog();
  makeSession(['랫 풀 다운']);
  app.openExerciseAdd();
  const html = app.buildSwapListHtml('사장님표 특수 운동');
  assert.ok(html.includes('addExerciseAfterCurrent(String(state._swapQuery'));
  assert.ok(html.includes('이 이름 그대로 추가'));
  app.closeExerciseSwap();
});

// ═══ 6. 건너뛴 종목에 다른 조작이 겹칠 때 (상태 어긋남 방지) ═══

test('건너뛴 종목을 교체하면 되살아나서 새 종목의 세트가 만들어진다 (빈 종목 방지)', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬']);
  app.applySkipExercise(0);
  assert.equal(s.exercises[0].sets.length, 0);

  s.currentExerciseIdx = 0;
  app.swapCurrentExercise('레그 프레스');

  const ex = s.exercises[0];
  assert.equal(ex.name, '레그 프레스');
  assert.equal(ex.skipped, undefined);
  assert.equal(ex.skippedSets, undefined);
  assert.ok(ex.sets.filter((x) => !x.isWarmup).length > 0, '교체한 종목에 할 세트가 생긴다');
});

test('건너뛴 종목의 세트법을 바꿔도 조용히 되살아나지 않는다 (확인을 거친다)', () => {
  resetLog();
  const s = makeSession(['핵 스쿼트', '바벨 컬']);
  app.applySkipExercise(0);
  s.currentExerciseIdx = 0;

  // 세트를 다시 짜면 건너뛰기가 풀린다 — 건너뛰기 자체가 확인 팝업을 거치는 결정이라
  // 그 반대편도 사용자가 알아야 한다. 확인을 누르기 전에는 아무것도 안 바뀐다.
  app.applySetScheme('straight');
  assert.equal(s.exercises[0].skipped, true, '확인 전에는 건너뛴 상태 그대로다');
  assert.equal(s.exercises[0].sets.filter((x) => !x.completed).length, 0, '떼어 둔 세트도 그대로다');

  // 확인을 누르면(=되살리기) 세트가 돌아온다
  app.unskipExercise(0);
  assert.equal(s.exercises[0].skipped, undefined);
  assert.ok(s.exercises[0].sets.filter((x) => !x.completed).length > 0);
  app.storage.set(app.KEYS.SET_SCHEMES, {}); // override 정리
});

test('이미 건너뛴 종목을 또 건너뛰어도 되돌리기용 보관본이 지워지지 않는다', () => {
  resetLog();
  const s = makeSession(['랫 풀 다운', '바벨 컬']);
  const before = s.exercises[0].sets.length;
  app.applySkipExercise(0);
  const kept = s.exercises[0].skippedSets.length;
  app.applySkipExercise(0);          // 두 번째 호출은 무시돼야 한다
  assert.equal(s.exercises[0].skippedSets.length, kept);

  app.unskipExercise(0);
  assert.equal(s.exercises[0].sets.length, before);
});
