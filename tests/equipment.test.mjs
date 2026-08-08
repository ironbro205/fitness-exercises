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

test('미보유 장비로 태그된 종목은 실제로 불가로 판정된다', () => {
  const unavailable = app.getUnavailableExerciseNames();
  assert.ok(unavailable.length > 0, '미보유 종목이 하나도 없으면 필터가 동작하는지 알 수 없다');
  unavailable.forEach((n) => assert.equal(app.isExerciseAvailable(n), false));
});

// ═══ 2. 추천 경로에 미보유 종목이 새지 않는다 ═══
test('SESSIONS 템플릿 종목은 전부 보유 장비로 가능하다', () => {
  Object.keys(app.SESSIONS).forEach((key) => {
    (app.SESSIONS[key].exercises || []).forEach((ex) => {
      assert.ok(app.isExerciseAvailable(ex.name), `SESSIONS.${key}의 "${ex.name}"이 보유 장비로 불가`);
    });
  });
});

test('WEAK_PART_EXERCISE_MAP의 권장 종목은 전부 보유 장비로 가능하다', () => {
  Object.keys(app.WEAK_PART_EXERCISE_MAP).forEach((part) => {
    app.WEAK_PART_EXERCISE_MAP[part].forEach((n) => {
      assert.ok(app.isExerciseAvailable(bare(n)), `WEAK_PART_EXERCISE_MAP.${part}의 "${n}"이 보유 장비로 불가`);
    });
  });
});

test('EXERCISE_SAFETY의 부상 대체 종목은 전부 보유 장비로 가능하다', () => {
  // 안전 교체(applySafetyGuardrail)가 못 하는 종목을 집어넣으면 안 된다
  Object.keys(app.EXERCISE_SAFETY).forEach((name) => {
    const sub = app.EXERCISE_SAFETY[name].sub || {};
    Object.keys(sub).forEach((area) => {
      assert.ok(app.isExerciseAvailable(sub[area]), `"${name}"의 ${area} 대체 "${sub[area]}"가 보유 장비로 불가`);
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
  assert.equal(app.getExerciseEquipment('카프 레이즈 머신'), 'bodyweight');
  assert.equal(app.getExerciseEquipment('시티드 햄스트링 컬'), 'leg_curl');
  assert.equal(app.getExerciseEquipment('인클라인 덤벨 프레스'), 'dumbbell');
});

test('buildEquipmentPromptBlock — 보유 장비를 나열하고 미보유 종목을 금지로 명시', () => {
  const block = app.buildEquipmentPromptBlock();
  assert.match(block, /보유 장비/);
  assert.match(block, /레그프레스 머신/);
  assert.match(block, /시티드 카프 레이즈/); // 사용 금지 목록에 등장
  // 미보유 장비 이름 자체는 "보유 목록"에 없어야 한다
  const labels = app.getOwnedEquipmentLabels();
  assert.ok(!labels.includes('시티드 카프 레이즈 머신'));
  assert.ok(labels.includes('핵스쿼트 머신'));
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

// ═══ 5. 허리 금기 기준 (별도 작업으로 확정된 3종 + 굴곡·회전) ═══
test('lower_back 금기는 축성 부하 스쿼트·데드리프트 3종 + 러시안 트위스트뿐', () => {
  const contra = Object.keys(app.EXERCISE_SAFETY).filter((n) =>
    ((app.EXERCISE_SAFETY[n].contra) || []).includes('lower_back')
  ).sort();
  assert.deepEqual(contra, ['데드리프트', '러시안 트위스트', '바벨 스쿼트', '프론트 스쿼트'].sort());
});

test('러시안 트위스트의 허리 대체는 보유 장비로 가능한 항회전 종목이다', () => {
  const s = app.EXERCISE_SAFETY['러시안 트위스트'];
  assert.deepEqual([...s.contra], ['lower_back']);
  assert.equal(s.sub.lower_back, '케이블 팔로프 프레스');
  assert.ok(app.isExerciseAvailable('케이블 팔로프 프레스'));
  // 대체 종목이 오히려 허리 재활에 도움되는 종목이어야 한다
  assert.ok((app.EXERCISE_SAFETY['케이블 팔로프 프레스'].rehab || []).includes('lower_back'));
  // 금기면 mod는 의미가 없다 (수정해도 못 하는 종목)
  assert.equal(s.mod, undefined);
});
