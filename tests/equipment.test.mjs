// 보유 장비 필터 테스트
// 종목 표(EXERCISE_BODY_PART_MAP)와 장비 표(GYM_EQUIPMENT)가 어긋나지 않는지,
// 그리고 "헬스장에 없는 기구 종목"이 추천 경로로 새어 나가지 않는지 지킨다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();

// 괄호 설명이 붙은 표기('덤벨 해머 컬(이두 보조 자극)')에서 종목명만 뽑는다
const bare = (n) => String(n).replace(/\(.*\)$/, '').trim();

// ═══ 1. 표 무결성 ═══
test('모든 종목에 장비 태그가 있고, 그 id가 GYM_EQUIPMENT에 실제로 존재한다', () => {
  const ids = Object.keys(app.GYM_EQUIPMENT);
  Object.keys(app.EXERCISE_BODY_PART_MAP).forEach((name) => {
    const eq = app.EXERCISE_BODY_PART_MAP[name].equipment;
    assert.ok(eq, `"${name}"에 equipment 태그가 없음`);
    assert.ok(ids.includes(eq), `"${name}"의 장비 "${eq}"가 GYM_EQUIPMENT에 없음`);
  });
});

test('GYM_EQUIPMENT의 모든 항목이 kr·owned·source를 갖는다', () => {
  const sources = ['stated', 'inferred', 'universal', 'none'];
  Object.keys(app.GYM_EQUIPMENT).forEach((id) => {
    const e = app.GYM_EQUIPMENT[id];
    assert.equal(typeof e.kr, 'string', `${id}.kr 없음`);
    assert.equal(typeof e.owned, 'boolean', `${id}.owned 없음`);
    assert.ok(sources.includes(e.source), `${id}.source "${e.source}" 무효`);
  });
});

test('보유(owned) 장비에는 대응 종목이 최소 1개씩 있다 (사문 id 방지)', () => {
  const used = new Set(Object.keys(app.EXERCISE_BODY_PART_MAP).map((n) => app.EXERCISE_BODY_PART_MAP[n].equipment));
  Object.keys(app.GYM_EQUIPMENT).forEach((id) => {
    if (!app.GYM_EQUIPMENT[id].owned) return;
    assert.ok(used.has(id), `보유 장비 "${id}"(${app.GYM_EQUIPMENT[id].kr})를 쓰는 종목이 하나도 없다 — 사용자가 가진 기구인데 앱이 추천할 수 없다`);
  });
});

// ═══ 2. 추천 경로에 미보유 종목이 새지 않는다 ═══
test('SESSIONS 템플릿 종목은 전부 보유 장비로 가능하다', () => {
  Object.keys(app.SESSIONS).forEach((key) => {
    (app.SESSIONS[key].exercises || []).forEach((ex) => {
      assert.ok(app.isExerciseAvailable(ex.name), `SESSIONS.${key}의 "${ex.name}"이 보유 장비로 불가`);
    });
  });
});

// ═══ 3. 판정 함수 동작 ═══
test('isExerciseAvailable — 맨몸 가능 / 미보유 기구 불가 / 미등록 이름은 막지 않음', () => {
  assert.equal(app.isExerciseAvailable('플랭크'), true);          // bodyweight
  assert.equal(app.isExerciseAvailable('시티드 카프 레이즈'), false); // 전용 카프 머신 없음
  assert.equal(app.isExerciseAvailable('한 번도 본 적 없는 종목 XYZ'), true); // 태그 없음 = 막지 않는다
});

test('getExerciseEquipment — 미등록 이름도 퍼지 매칭으로 장비를 찾는다', () => {
  // SESSIONS 템플릿의 표시명들은 맵에 정확 키가 없지만 부위·장비가 해석돼야 한다
  assert.equal(app.getExerciseEquipment('카프 레이즈 머신'), 'calf_machine'); // 옛 템플릿 이름 = 미보유 전용 머신
  assert.equal(app.getExerciseEquipment('시티드 햄스트링 컬'), 'leg_curl');
  assert.equal(app.getExerciseEquipment('인클라인 덤벨 프레스'), 'dumbbell');
});

// ═══ 4. 신규 종목이 기존 스키마·규칙을 지킨다 ═══
test('mainEligible=true는 자유중량 대형 복합 + 큰 하체 머신만', () => {
  // 자유중량 = 바벨·덤벨·스미스 계열(인클라인 바벨 프레스 기구는 바벨 랙이다) + 맨몸/어시스트 대형 복합
  const freeWeight = ['barbell', 'dumbbell', 'smith', 'bodyweight', 'assist_machine', 'incline_barbell_press'];
  const bigLegMachine = ['leg_press', 'hack_squat'];
  Object.keys(app.EXERCISE_BODY_PART_MAP).forEach((name) => {
    const info = app.EXERCISE_BODY_PART_MAP[name];
    if (info.mainEligible !== true) return;
    assert.ok(info.compound, `"${name}"이 고립인데 mainEligible=true`);
    assert.ok(
      freeWeight.includes(info.equipment) || bigLegMachine.includes(info.equipment),
      `"${name}"(${info.equipment})은 메인 자격 대상이 아니다 — 머신·케이블 복합은 mainEligible:false`
    );
  });
});

test('신규 장비 종목이 부위 인덱스(EXERCISES_BY_PRIMARY)에 반영된다', () => {
  assert.ok(app.EXERCISES_BY_PRIMARY.forearms, '전완 primary 종목이 생겨야 한다');
  assert.ok(app.EXERCISES_BY_PRIMARY.forearms.includes('이지 바 리버스 컬'));
  assert.ok(app.EXERCISES_BY_PRIMARY.calves.includes('레그 프레스 카프 레이즈'));
  assert.ok(app.EXERCISES_BY_PRIMARY.obliques.includes('케이블 팔로프 프레스'));
});

test('새 종목 9개 — 부위·장비 등록, 전완 단독, 카탈로그 반영', () => {
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const wristCurls = ['덤벨 리스트 컬', '바벨 리스트 컬', '리버스 덤벨 리스트 컬', '리버스 바벨 리스트 컬'];
  const added = ['머신 레터럴 레이즈', '머신 원 암 레터럴 레이즈', '업라이트 로우', ...wristCurls, '스티프 데드리프트', '노르딕 컬'];
  assert.equal(added.length, 9);
  added.forEach((name) => {
    assert.ok(app.EXERCISE_BODY_PART_MAP[name], `"${name}"이 EXERCISE_BODY_PART_MAP에 없다`);
    assert.equal(app.isExerciseAvailable(name), true, `"${name}"을 할 수 없다고 나온다`);
  });

  wristCurls.forEach((name) => {
    const info = app.EXERCISE_BODY_PART_MAP[name];
    assert.equal(info.primary, 'forearms', name);
    assert.equal(info.secondary.length, 0, name);
    assert.deepEqual(plain(app.exerciseGroupWeights(name)), {}, `"${name}"이 주간 세트에 세인다`);
  });

  [...wristCurls, '이지 바 리버스 컬'].forEach((name) => {
    assert.ok(app.EXERCISES_BY_PRIMARY.forearms.includes(name), `"${name}"이 forearms 인덱스에 없다`);
    assert.ok(!app.EXERCISES_BY_PRIMARY.biceps.includes(name), `"${name}"이 biceps 인덱스에 있다`);
  });

  const cat = app.buildClaudeCatalog();
  ['pull', 'upper', 'free'].forEach((s) => assert.ok(cat[s].includes('덤벨 리스트 컬'), `${s}에 '덤벨 리스트 컬'이 없다`));
  ['push', 'legs'].forEach((s) => assert.ok(!cat[s].includes('덤벨 리스트 컬'), `${s}에 '덤벨 리스트 컬'이 있다`));

  ['스티프 데드리프트', '노르딕 컬'].forEach((name) => {
    assert.ok(app.EXERCISES_BY_PRIMARY.hamstrings.includes(name), `"${name}"이 hamstrings 인덱스에 없다`);
  });
  ['머신 레터럴 레이즈', '머신 원 암 레터럴 레이즈', '업라이트 로우'].forEach((name) => {
    assert.ok(app.EXERCISES_BY_PRIMARY.shoulders_side.includes(name), `"${name}"이 shoulders_side 인덱스에 없다`);
  });
});

test('표기 변형 — 리스트·손목·리버스 컬은 전완, 스티프·머신 사이드 변형은 표준명과 같다', () => {
  const plain = (v) => JSON.parse(JSON.stringify(v));
  ['케이블 리스트 컬', '손목 컬'].forEach((name) => {
    const info = app.getExercisePart(name);
    assert.equal(info.primary, 'forearms', name);
    assert.deepEqual(plain(info.secondary), [], name);
  });
  const rev = app.getExercisePart('바벨 리버스 컬');
  assert.equal(rev.primary, 'forearms');
  assert.deepEqual(plain(rev.secondary), ['biceps']);
  assert.equal(app.getExercisePart('덤벨 스파이더 컬').primary, 'biceps', '표에 없는 이두 컬은 그대로 이두');

  assert.deepEqual(plain(app.exerciseGroupWeights('스티프 레그 데드리프트')), plain(app.exerciseGroupWeights('스티프 데드리프트')));
  assert.deepEqual(plain(app.exerciseGroupWeights('스티프 레그드 데드리프트')), plain(app.exerciseGroupWeights('스티프 데드리프트')));
  assert.equal(app.getExerciseAxialLoad('스티프 레그 데드리프트'), 'high');
  assert.equal(app.getExerciseAxialLoad('스티프 레그드 데드리프트'), 'high');
  assert.equal(app.getExerciseEquipment('머신 사이드 레터럴 레이즈'), 'lateral_raise_machine');

  const free = app.buildClaudeCatalog().free;
  ['스티프 레그 데드리프트', '스티프 레그드 데드리프트', '머신 사이드 레터럴 레이즈'].forEach((name) => {
    assert.ok(!free.includes(name), `별칭 "${name}"이 카탈로그에 들어갔다`);
  });
});
