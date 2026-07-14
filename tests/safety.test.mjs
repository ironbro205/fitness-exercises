// 종목 안전 (2단계) — 부상 대조 + 프롬프트 블록 + VETO 가드레일 테스트
// 핵심 계약: 기억 노트의 부상 자유 글 → 부위 키워드 대조 → 금기 종목이 AI 루틴에서 교체/제거.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();

// vm 샌드박스 배열은 프로토타입 출신이 달라 deepStrictEqual이 실패 → JSON 정규화 후 비교
const plain = (v) => JSON.parse(JSON.stringify(v));

function injuryNote(text) {
  return { id: 'm_' + text, category: 'injury', text, source: 'manual', date: '2026-07-14' };
}

// 합성 안전 표 주입 (실제 표 내용과 무관하게 로직 계약을 고정)
const SYNTH = {
  '바벨 로우': { contra: ['lower_back'], sub: { lower_back: '머신 시티드 로우' } },
  '풀업': { caution: ['shoulder'], mod: { shoulder: '중립 그립으로' }, sub: { shoulder: '랫풀다운' } },
  '밴드 외회전': { rehab: ['shoulder'] },
  '데드리프트': { contra: ['lower_back'] } // 대체 없음 → 제거 케이스
};
function withSynth(fn) {
  const orig = app.EXERCISE_SAFETY;
  const origMem = app.state.coachMemory;
  app.EXERCISE_SAFETY = SYNTH;
  try { fn(); } finally {
    app.EXERCISE_SAFETY = orig;
    app.state.coachMemory = origMem;
  }
}

// ═══ 1. 부상 부위 대조 (기억 노트 자유 글 → 부위 키) ═══
test('부상 대조: "허리 디스크" → lower_back', () => {
  const origMem = app.state.coachMemory;
  app.state.coachMemory = [injuryNote('작년에 허리 디스크 진단, 무리하면 아픔')];
  assert.deepEqual(plain(app.getUserInjuryAreas()), ['lower_back']);
  app.state.coachMemory = origMem;
});

test('부상 대조: 여러 부위 동시 인식 (어깨+무릎)', () => {
  const origMem = app.state.coachMemory;
  app.state.coachMemory = [injuryNote('왼쪽 어깨 불편'), injuryNote('무릎 시큰거림')];
  const areas = app.getUserInjuryAreas();
  assert.ok(areas.includes('shoulder'));
  assert.ok(areas.includes('knee'));
  app.state.coachMemory = origMem;
});

test('부상 대조: injury 카테고리만 본다 (preference 무시)', () => {
  const origMem = app.state.coachMemory;
  app.state.coachMemory = [{ id: 'p1', category: 'preference', text: '어깨 운동 좋아함', source: 'manual', date: '2026-07-14' }];
  assert.deepEqual(plain(app.getUserInjuryAreas()), []);
  app.state.coachMemory = origMem;
});

test('부상 대조: 노트 없으면 빈 배열', () => {
  const origMem = app.state.coachMemory;
  app.state.coachMemory = [];
  assert.deepEqual(plain(app.getUserInjuryAreas()), []);
  app.state.coachMemory = origMem;
});

// ═══ 2. 종목 안전 판정 ═══
test('판정: 금기 종목 → contra + 대체 종목', () => {
  withSynth(() => {
    app.state.coachMemory = [injuryNote('허리 디스크')];
    const r = app.checkExerciseSafety('바벨 로우');
    assert.equal(r.level, 'contra');
    assert.equal(r.sub, '머신 시티드 로우');
  });
});

test('판정: 주의 종목 → caution + 수정법', () => {
  withSynth(() => {
    app.state.coachMemory = [injuryNote('어깨 충돌증후군')];
    const r = app.checkExerciseSafety('풀업');
    assert.equal(r.level, 'caution');
    assert.equal(r.mod, '중립 그립으로');
  });
});

test('판정: 태그 없는 종목·부상 없는 사용자 → null', () => {
  withSynth(() => {
    app.state.coachMemory = [injuryNote('허리 디스크')];
    assert.equal(app.checkExerciseSafety('케이블 컬').level, null);
    app.state.coachMemory = [];
    assert.equal(app.checkExerciseSafety('바벨 로우').level, null);
  });
});

// ═══ 3. 프롬프트 안전 블록 ═══
test('프롬프트 블록: 부상 없으면 빈 문자열 (토큰 0)', () => {
  withSynth(() => {
    app.state.coachMemory = [];
    assert.equal(app.buildSafetyPromptBlock(), '');
  });
});

test('프롬프트 블록: 등록 부상에 걸리는 종목만 포함', () => {
  withSynth(() => {
    app.state.coachMemory = [injuryNote('허리 디스크')];
    const block = app.buildSafetyPromptBlock();
    assert.ok(block.includes('바벨 로우'));
    assert.ok(block.includes('머신 시티드 로우')); // 대체
    assert.ok(!block.includes('풀업')); // 어깨 태그는 허리 부상과 무관
  });
});

// ═══ 4. VETO 가드레일 (AI 루틴 교정) ═══
test('가드레일: 금기 종목을 대체로 교체 (무게 리셋 + note)', () => {
  withSynth(() => {
    app.state.coachMemory = [injuryNote('허리 디스크')];
    const routine = [
      { name: '바벨 로우', sets: 3, reps: '8-12', weight: 60, note: '' },
      { name: '랫풀다운', sets: 3, reps: '8-12', weight: 50, note: '' }
    ];
    const r = app.applySafetyGuardrail(routine);
    assert.equal(r.exercises.length, 2);
    assert.equal(r.exercises[0].name, '머신 시티드 로우');
    assert.equal(r.exercises[0].weight, null);
    assert.ok(r.exercises[0].note.includes('허리'));
    assert.equal(r.changes.length, 1);
    assert.equal(r.changes[0].from, '바벨 로우');
  });
});

test('가드레일: 대체가 이미 루틴에 있거나 대체 없음 → 제거', () => {
  withSynth(() => {
    app.state.coachMemory = [injuryNote('허리 디스크')];
    const routine = [
      { name: '바벨 로우', sets: 3 },
      { name: '머신 시티드 로우', sets: 3 }, // 대체 종목이 이미 있음
      { name: '데드리프트', sets: 3 }        // 대체 정의 없음
    ];
    const r = app.applySafetyGuardrail(routine);
    assert.deepEqual(plain(r.exercises.map(e => e.name)), ['머신 시티드 로우']);
    assert.equal(r.changes.length, 2);
    assert.equal(r.changes[0].to, null);
    assert.equal(r.changes[1].to, null);
  });
});

test('가드레일: 부상 없으면 그대로 통과', () => {
  withSynth(() => {
    app.state.coachMemory = [];
    const routine = [{ name: '바벨 로우', sets: 3 }];
    const r = app.applySafetyGuardrail(routine);
    assert.equal(r.exercises.length, 1);
    assert.equal(r.changes.length, 0);
  });
});

// ═══ 5. 실제 EXERCISE_SAFETY 표 무결성 (내용이 바뀌어도 구조는 지켜야 함) ═══
test('표 무결성: 모든 키·대체 종목이 실제 종목이고, 대체가 같은 부상에 다시 금기면 실패', () => {
  const validAreas = Object.keys(app.INJURY_AREAS);
  Object.keys(app.EXERCISE_SAFETY).forEach(name => {
    assert.ok(app.EXERCISE_BODY_PART_MAP[name], `표의 종목 "${name}"이 EXERCISE_BODY_PART_MAP에 없음`);
    const s = app.EXERCISE_SAFETY[name];
    ['contra', 'caution', 'rehab'].forEach(k => {
      (s[k] || []).forEach(a => assert.ok(validAreas.includes(a), `${name}.${k}의 부위 "${a}" 무효`));
    });
    Object.keys(s.sub || {}).forEach(area => {
      const subName = s.sub[area];
      assert.ok(app.EXERCISE_BODY_PART_MAP[subName], `${name}의 대체 "${subName}"이 실제 종목이 아님`);
      const subSafety = app.EXERCISE_SAFETY[subName];
      const subContra = (subSafety && subSafety.contra) || [];
      assert.ok(!subContra.includes(area), `${name}의 대체 "${subName}"가 같은 부위(${area})에 금기`);
    });
  });
});

test('표 무결성: 재활 종목 3종이 재활 태그를 가짐', () => {
  // 앱의 재활 종목(1단계 rehab 클래스)과 안전 표가 어긋나지 않는지 최소 확인
  const s = app.EXERCISE_SAFETY['밴드 외회전'];
  assert.ok(s && Array.isArray(s.rehab) && s.rehab.length > 0, '밴드 외회전에 rehab 태그 없음');
});
