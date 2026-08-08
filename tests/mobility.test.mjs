// 웜업 · 스트레칭 가이드 엔진 테스트
// 근거 문서: docs/research/warmup-stretching.md
// 핵심 계약:
//  · 웜업은 항상 일반 유산소로 시작하고, 부위 드릴은 5개 · 스트레칭은 4개를 넘지 않는다 (§5-A · §6-C)
//  · 요추 굴곡 동작(discSafe:false)은 어떤 기본 목록에도 없고, 섞이면 discAlt로 치환된다 (§4-A · §6-C 규칙4)
//  · 요추 보호 순서: 캣-카멜 → McGill 계열 → 나머지 (§4-D)
//  · 좌우 동작은 두 구간으로 쪼개지고, 횟수 구간은 타이머가 아니다 (§6-D)
//  · 본세트 전 한 근육당 60초 이상 정적 스트레칭이 웜업 목록에 없다 (§1-D)
//  · 화면 문구가 근비대·근육통·부상예방 효과를 약속하지 않는다 (§2 델파이 합의)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp } from './_harness.mjs';

const app = loadApp();
// vm 샌드박스가 만든 배열은 Node 렐름의 Array와 프로토타입이 달라 deepStrictEqual이 실패한다.
// 다른 테스트 파일과 같은 방식으로 값만 비교한다.
const plain = (v) => JSON.parse(JSON.stringify(v));
const DIR = path.dirname(fileURLToPath(import.meta.url));

const DRILLS = app.MOBILITY_DRILLS;
const ALL_LIST_KEYS = [
  ...Object.values(app.WARMUP_BY_PART).flat(),
  ...Object.values(app.STRETCH_BY_PART).flat(),
  ...app.WARMUP_GENERAL,
];

// ── 데이터 무결성 ──────────────────────────────

test('모든 목록 키가 MOBILITY_DRILLS에 존재한다', () => {
  for (const key of ALL_LIST_KEYS) {
    assert.ok(DRILLS[key], `사전에 없는 드릴 키: ${key}`);
  }
});

test('모든 드릴이 필수 필드(kr·mode·cue·why·discSafe)를 갖는다', () => {
  for (const [key, d] of Object.entries(DRILLS)) {
    assert.equal(typeof d.kr, 'string', `${key}.kr`);
    assert.ok(['reps', 'time', 'timePerSide', 'repsPerSide'].includes(d.mode), `${key}.mode=${d.mode}`);
    assert.equal(typeof d.cue, 'string', `${key}.cue`);
    assert.ok(d.why && d.why.length > 0, `${key}.why`);
    assert.equal(typeof d.discSafe, 'boolean', `${key}.discSafe`);
    if (d.mode === 'time' || d.mode === 'timePerSide') assert.ok(d.sec > 0, `${key}.sec`);
    else assert.ok(d.reps > 0 && d.secPerRep > 0, `${key}.reps/secPerRep`);
  }
});

// 설명은 "준비(어디에 어떻게) → 동작(뭘 어떻게) → 기준(얼마나·어디까지)" 세 조각이 다 있어야 한다.
// 이 동작을 처음 보는 사람이 글만 읽고 따라할 수 있어야 하기 때문이다.
// (discSafe:false 는 화면에 안 나오는 배제 동작이라 문서용 cue 한 줄만 둔다.)
test('화면에 나오는 드릴은 준비·동작·기준 세 줄을 다 갖는다', () => {
  for (const [key, d] of Object.entries(DRILLS)) {
    if (d.discSafe === false) continue;
    assert.ok(d.prep && d.prep.length > 0, `${key}.prep 이 비어 있다 — 준비 자세가 없으면 따라할 수 없다`);
    assert.ok(d.cue && d.cue.length > 0, `${key}.cue`);
    assert.ok(d.std && d.std.length > 0, `${key}.std 가 비어 있다 — 얼마나·어디까지가 없다`);
  }
});

test('expandMobilitySegments — 준비·기준이 구간까지 실려 화면에 그려진다', () => {
  const [seg] = app.expandMobilitySegments(['ankle_wall_knee']);
  assert.equal(seg.prep, DRILLS.ankle_wall_knee.prep);
  assert.equal(seg.std, DRILLS.ankle_wall_knee.std);

  // 소스에 호출이 있는지가 아니라 **실제로 그려진 HTML**에 세 줄이 다 들어 있는지를 본다.
  // (호출이 죽은 가지로 옮겨가도 통과하던 검사를 피하려고.)
  const fresh = loadApp();
  fresh.state.stretchGuide = null;
  fresh.state.completedSession = null;
  fresh.state.activeSession = null;
  fresh.startSession('legs');
  const first = fresh.expandMobilitySegments(fresh.state.activeSession.warmup.keys)[0];
  const html = fresh.buildMobilityGuideHtml('warmup');
  for (const [label, text] of [['준비', first.prep], ['동작', first.cue], ['기준', first.std]]) {
    assert.ok(html.includes('>' + label + '</span>'), `${label} 라벨이 화면에서 빠졌다`);
    assert.ok(html.includes(text), `${label} 본문이 화면에서 빠졌다: ${text}`);
  }
});

// 디자인 규칙(문구·크기): 해요체 통일 · 한 문장 40자 이내 · 느낌표 금지.
// 동작 이름은 28px 큰 글씨로 나오고 좌우 동작은 뒤에 ' · 왼쪽'이 붙어서 길면 세 줄로 깨진다.
test('디자인 규칙 — 드릴 이름 18자 이내, 설명은 해요체·한 문장 40자 이내', () => {
  for (const [key, d] of Object.entries(DRILLS)) {
    assert.ok([...d.kr].length <= 18, `${key}.kr 이 18자를 넘는다: ${d.kr}`);
    if (d.discSafe === false) continue;
    for (const field of ['prep', 'cue', 'std']) {
      const text = d[field];
      assert.ok([...text].length <= 75, `${key}.${field} 가 75자를 넘는다`);
      assert.ok(!/[!]/.test(text), `${key}.${field} 에 느낌표가 있다`);
      assert.ok(!/(다\.|니다\.|한다$|합니다|됩니다)/.test(text),
        `${key}.${field} 가 해요체가 아니다: ${text}`);
      for (const sentence of text.split(/(?<=[.?])\s+/)) {
        assert.ok([...sentence].length <= 40,
          `${key}.${field} 의 한 문장이 40자를 넘는다: ${sentence}`);
      }
    }
  }
});

// §4-A: 요추 굴곡 동작은 "왜 없는지"를 남기려고 사전에만 두고, 목록에는 절대 넣지 않는다.
test('요추 굴곡 동작(discSafe:false)은 어떤 기본 목록에도 없다', () => {
  const unsafeInLists = ALL_LIST_KEYS.filter((k) => DRILLS[k] && DRILLS[k].discSafe === false);
  assert.deepEqual(unsafeInLists, []);
  // 배제 목록은 사전에 남아 있어야 한다(문서 + 치환 대상)
  for (const k of ['standing_toe_touch', 'seated_forward_fold', 'knee_to_chest', 'child_pose']) {
    assert.equal(DRILLS[k].discSafe, false, `${k}는 배제 대상으로 남아 있어야 함`);
    assert.ok(DRILLS[DRILLS[k].discAlt], `${k}.discAlt가 실제 동작을 가리켜야 함`);
  }
});

// §1-D: 본세트 전 한 근육당 60초 이상 정적 스트레칭 = 최대근력 −5.4%. 웜업 목록엔 긴 정적 유지가 없어야 한다.
test('웜업 목록에 60초 이상 유지하는 정적 동작이 없다', () => {
  const warmupKeys = [...new Set(Object.values(app.WARMUP_BY_PART).flat())];
  for (const key of warmupKeys) {
    const d = DRILLS[key];
    if (d.mode === 'time' || d.mode === 'timePerSide') {
      assert.ok(d.sec < 60, `${key}: 웜업 정적 유지가 ${d.sec}초 (60초 미만이어야 함)`);
    }
  }
});

// ── 부위 유도 ──────────────────────────────

test('resolveWarmupGroups — 템플릿 세션은 빠른 경로', () => {
  assert.deepEqual(plain(app.resolveWarmupGroups('push', [])), ['chest', 'shoulders']);
  assert.deepEqual(plain(app.resolveWarmupGroups('pull', [])), ['back']);
  assert.deepEqual(plain(app.resolveWarmupGroups('legs', [])), ['legs']);
  assert.deepEqual(plain(app.resolveWarmupGroups('upper', [])), ['chest', 'back', 'shoulders']);
});

test('resolveWarmupGroups — free/AI 루틴은 종목에서 상위 2개 부위를 유도', () => {
  const groups = app.resolveWarmupGroups('free', [
    { name: '레그 프레스' }, { name: '레그 익스텐션' }, { name: '레그 컬' }, { name: '케이블 푸시 다운' },
  ]);
  assert.equal(groups[0], 'legs');
  assert.ok(groups.length <= 2);
});

test('resolveWarmupGroups — 부위를 못 찾으면 척추 보호 기본(core)', () => {
  assert.deepEqual(plain(app.resolveWarmupGroups('free', [{ name: '알 수 없는 종목' }])), ['core']);
  assert.deepEqual(plain(app.resolveWarmupGroups(null, [])), ['core']);
});

// ── 계획 조립 ──────────────────────────────

test('buildWarmupPlan — 일반 웜업이 항상 맨 앞, 드릴은 5개 상한', () => {
  for (const type of ['push', 'pull', 'legs', 'upper']) {
    const plan = app.buildWarmupPlan(type, []);
    assert.equal(plan.keys[0], 'general_cardio', `${type}: 일반 웜업이 맨 앞`);
    assert.ok(plan.keys.length <= 1 + app.MOBILITY_WARMUP_LIMIT, `${type}: ${plan.keys.length}개`);
    assert.equal(new Set(plan.keys).size, plan.keys.length, `${type}: 중복 없음`);
  }
});

test('buildWarmupPlan — 짧게 모드는 일반 웜업 3분만 (§5-C 압축 모드)', () => {
  const plan = app.buildWarmupPlan('legs', [], { short: true });
  assert.deepEqual(plain(plan.keys), ['general_cardio']);
  assert.equal(app.MOBILITY_DRILLS.general_cardio.sec, 180);
});

// §4-D: "먼저 척추를 굳히고, 그 다음에 고관절을 움직인다"
test('buildWarmupPlan — 하체 날 요추 보호 순서 (캣-카멜 → 나머지)', () => {
  const keys = app.buildWarmupPlan('legs', []).keys;
  assert.equal(keys[0], 'general_cardio');
  assert.equal(keys[1], 'cat_camel');
  assert.ok(keys.indexOf('bw_squat') > keys.indexOf('cat_camel'), '스쿼트 패턴은 캣-카멜 뒤');
});

test('buildWarmupPlan — 등 날은 캣-카멜 → 버드독(McGill) → 광배 동작 순서', () => {
  const keys = app.buildWarmupPlan('pull', []).keys;
  assert.equal(keys[1], 'cat_camel');
  assert.equal(keys[2], 'bird_dog');
  assert.ok(keys.indexOf('straight_arm_pulldown') > keys.indexOf('bird_dog'));
});

// §3-H: 부위가 겹치면 라운드로빈으로 각 부위를 1~2개씩 발췌한다(연결이면 첫 부위가 상한을 다 먹는다).
test('buildWarmupPlan — UPPER 날은 세 부위가 모두 대표된다', () => {
  const keys = app.buildWarmupPlan('upper', []).keys.slice(1);
  const covered = ['chest', 'back', 'shoulders'].filter((g) =>
    app.WARMUP_BY_PART[g].some((k) => keys.includes(k)));
  assert.deepEqual(covered.sort(), ['back', 'chest', 'shoulders']);
});

test('buildWarmupPlan — 잘라낸 동작 수를 omitted로 정직하게 보고한다', () => {
  const plan = app.buildWarmupPlan('upper', []);
  assert.ok(plan.omitted > 0, 'UPPER는 후보가 상한보다 많아 생략이 생긴다');
  assert.equal(app.buildWarmupPlan('arms', [{ name: '바벨 컬' }]).omitted, 0);
});

test('buildStretchPlan — 4개 상한, 하체 5개 중 1개 생략', () => {
  const plan = app.buildStretchPlan('legs', []);
  assert.equal(plan.keys.length, app.MOBILITY_STRETCH_LIMIT);
  assert.equal(plan.omitted, 1);
  assert.equal(plan.keys[0], 'supine_hamstring_strap'); // §4-C 가장 중요한 치환 동작
});

test('buildStretchPlan — 전 세션 타입에서 요추 굴곡 동작이 나오지 않는다', () => {
  for (const type of ['push', 'pull', 'legs', 'upper', 'free', null]) {
    for (const key of app.buildStretchPlan(type, []).keys) {
      assert.notEqual(DRILLS[key].discSafe, false, `${type} → ${key}`);
    }
  }
});

// ── 치환 · 정렬 (순수 함수) ──────────────────────────────

test('mobilitySubstituteUnsafe — 굴곡 동작을 discAlt로 치환하고 중복은 합친다', () => {
  assert.deepEqual(
    plain(app.mobilitySubstituteUnsafe(['standing_toe_touch', 'child_pose', 'calf_wall'])),
    ['supine_hamstring_strap', 'standing_lat_hinge', 'calf_wall']);
  // 이미 치환 대상이 목록에 있으면 두 번 넣지 않는다
  assert.deepEqual(
    plain(app.mobilitySubstituteUnsafe(['supine_hamstring_strap', 'standing_toe_touch'])),
    ['supine_hamstring_strap']);
  // 사전에 없는 키는 조용히 버린다
  assert.deepEqual(plain(app.mobilitySubstituteUnsafe(['없는키', 'calf_wall'])), ['calf_wall']);
});

test('mobilityOrderForLumbar — 캣-카멜 → McGill 계열 → 나머지', () => {
  assert.deepEqual(
    plain(app.mobilityOrderForLumbar(['bw_squat', 'bird_dog', 'cat_camel', 'glute_bridge', 'side_bridge'])),
    ['cat_camel', 'bird_dog', 'side_bridge', 'bw_squat', 'glute_bridge']);
  // 캣-카멜이 없으면 McGill 계열이 앞으로만 온다
  assert.deepEqual(plain(app.mobilityOrderForLumbar(['bw_squat', 'bird_dog'])), ['bird_dog', 'bw_squat']);
});

// ── 구간 펼치기 ──────────────────────────────

test('expandMobilitySegments — 좌우 동작은 두 구간, 단일 동작은 한 구간', () => {
  const segs = app.expandMobilitySegments(['general_cardio', 'bird_dog', 'supine_hamstring_strap']);
  assert.equal(segs.length, 5); // 1 + 2 + 2
  assert.equal(segs[0].mode, 'time');
  assert.equal(segs[0].sec, 180);
  assert.equal(segs[0].side, null);
  assert.deepEqual([segs[1].side, segs[2].side], ['left', 'right']);
  assert.equal(segs[1].mode, 'reps');      // 횟수 구간은 타이머가 아니다
  assert.equal(segs[1].reps, 6);
  assert.deepEqual([segs[3].side, segs[4].side], ['left', 'right']);
  assert.equal(segs[3].mode, 'time');
  assert.equal(segs[3].sec, 30);
});

// 한쪽씩 하는 동작을 mode:'reps'로 두면 화면이 "15회"만 안내하고(실제로는 30회) 예상 시간도 반만 잡는다.
// 되돌아가기 쉬운 한 글자짜리 실수라 이 동작 하나를 이름으로 못 박는다.
test('band_external_rotation — 한쪽씩 하는 동작이라 좌우 두 구간으로 쪼개진다', () => {
  assert.equal(DRILLS.band_external_rotation.mode, 'repsPerSide');
  const segs = app.expandMobilitySegments(['band_external_rotation']);
  assert.equal(segs.length, 2);
  assert.deepEqual([segs[0].side, segs[1].side], ['left', 'right']);
  segs.forEach((s) => {
    assert.equal(s.mode, 'reps');                    // 타이머가 아니라 사용자가 완료를 누른다
    assert.equal(app.mobilitySegmentAmount(s), '15회');
    assert.equal(s.sec, 30);                         // 15회 × 2초 = 한쪽 30초(추정값)
  });
  assert.equal(app.mobilitySegmentsTotalSec(segs), 60);
});

test('expandMobilitySegments — 사전에 없는 키는 건너뛴다', () => {
  assert.deepEqual(plain(app.expandMobilitySegments(['없는키'])), []);
  assert.deepEqual(plain(app.expandMobilitySegments(null)), []);
});

test('mobilitySegmentLabel / Amount — 좌우와 분량 표기', () => {
  const [l, r] = app.expandMobilitySegments(['supine_hamstring_strap']);
  assert.equal(app.mobilitySegmentLabel(l), '허벅지 뒤 — 누워서 다리 올리기 · 왼쪽');
  assert.equal(app.mobilitySegmentLabel(r), '허벅지 뒤 — 누워서 다리 올리기 · 오른쪽');
  assert.equal(app.mobilitySegmentAmount(l), '30초');
  const [squat] = app.expandMobilitySegments(['bw_squat']);
  assert.equal(app.mobilitySegmentLabel(squat), '하체 풀기 — 맨몸 스쿼트');
  assert.equal(app.mobilitySegmentAmount(squat), '12회');
});

// ── 시간 수지 (§5-A) ──────────────────────────────

test('표준 웜업은 5~9분, 스트레칭은 4~6분 안에 들어온다', () => {
  for (const type of ['push', 'pull', 'legs', 'upper']) {
    const w = app.mobilitySegmentsTotalSec(app.expandMobilitySegments(app.buildWarmupPlan(type, []).keys));
    assert.ok(w >= 300 && w <= 540, `${type} 웜업 ${w}초`);
    const s = app.mobilitySegmentsTotalSec(app.expandMobilitySegments(app.buildStretchPlan(type, []).keys));
    assert.ok(s >= 200 && s <= 360, `${type} 스트레칭 ${s}초`);
  }
});

// ── 정직성 문구 (§2 델파이 합의) ──────────────────────────────
// 스트레칭이 약속할 수 있는 건 유연성 유지 하나뿐이다. 근비대·DOMS·부상예방 주장을 코드에서 금지한다.

test('드릴 설명(cue/why)이 근비대·근육통·부상예방 효과를 약속하지 않는다', () => {
  const banned = ['근육이 커', '근성장에 도움', '근비대에 도움', '근육통이 줄', '내일 안 아프', '부상을 예방', '부상 예방에'];
  for (const [key, d] of Object.entries(DRILLS)) {
    const text = `${d.prep || ''} ${d.cue} ${d.std || ''} ${d.why} ${d.warn || ''}`;
    for (const phrase of banned) {
      assert.ok(!text.includes(phrase), `${key}: 금지 문구 "${phrase}"`);
    }
  }
});

test('화면 문구에 근거 한계가 명시돼 있다', () => {
  const src = fs.readFileSync(path.join(DIR, '..', 'js', 'screens.js'), 'utf8');
  assert.ok(src.includes('유연성 유지'), '스트레칭 화면이 "유연성 유지"로 한정해 말해야 함');
  assert.ok(src.includes('근육통·부상 예방·근성장 효과는 기대하지 마세요'), '기대치를 낮추는 문구 필요');
  assert.ok(src.includes('60초 넘게'), '본세트 전 장시간 정적 스트레칭 경고 문구 필요');
});

// ── 진행 상태머신 · 복원 · 라우팅 ──────────────────────────────
// 순수 함수가 아니라 state를 건드리므로 매 테스트마다 세션을 새로 만든다.

function freshWarmup(app2, type = 'legs') {
  app2.state.stretchGuide = null;
  app2.state.completedSession = null;
  app2.state.activeSession = null;
  app2.startSession(type);
  return app2.state.activeSession.warmup;
}

test('mobilityNext — 늦게 도착한 탭은 한 구간을 더 건너뛰지 않는다', () => {
  const w = freshWarmup(app);
  assert.equal(w.idx, 0);
  app.mobilityNext(0);                 // 정상 탭
  assert.equal(app.state.activeSession.warmup.idx, 1);
  app.mobilityNext(0);                 // 타이머가 먼저 넘긴 뒤 도착한 옛 버튼의 탭 → 무시
  assert.equal(app.state.activeSession.warmup.idx, 1);
  app.mobilityNext(1);                 // 지금 구간 번호면 진행
  assert.equal(app.state.activeSession.warmup.idx, 2);
});

test('mobilitySkipStep — 좌우로 쪼개진 동작은 통째로 넘긴다', () => {
  const w = freshWarmup(app);
  const segs = app.expandMobilitySegments(w.keys);
  // 좌우 구간(리버스 런지 등)의 첫 번째 위치를 찾는다
  const leftIdx = segs.findIndex((s) => s.side === 'left');
  assert.ok(leftIdx > 0, '좌우 구간이 있어야 함');
  app.state.activeSession.warmup.idx = leftIdx;
  app.mobilitySkipStep(leftIdx);
  const after = app.state.activeSession.warmup.idx;
  assert.ok(after > leftIdx + 1 || after >= segs.length,
    `건너뛰기는 오른쪽 구간까지 넘어야 함 (${leftIdx} → ${after})`);
  if (segs[after]) assert.notEqual(segs[after].key, segs[leftIdx].key);
  // 반면 "완료"는 한 구간만 넘어간다
  const w2 = freshWarmup(app);
  const segs2 = app.expandMobilitySegments(w2.keys);
  const l2 = segs2.findIndex((s) => s.side === 'left');
  app.state.activeSession.warmup.idx = l2;
  app.mobilityNext(l2);
  assert.equal(app.state.activeSession.warmup.idx, l2 + 1);
  assert.equal(segs2[l2 + 1].side, 'right');
});

// 3분 유산소 중에 "짧게"를 누르면 타이머가 되감겨 짧게 > 표준이 되는 역전이 있었다.
test('setWarmupMode — 같은 구간을 하고 있으면 카운트다운을 이어간다', () => {
  freshWarmup(app);
  const w = app.state.activeSession.warmup;
  w.segEndsAt = Date.now() + 42000;    // 일반 유산소 진행 중(남은 42초)
  app.setWarmupMode('short');
  assert.equal(app.state.activeSession.warmup.mode, 'short');
  assert.equal(app.state.activeSession.warmup.segEndsAt, w.segEndsAt, '남은 시간이 되감기면 안 됨');
  assert.equal(app.state.activeSession.warmup.done, false);
});

test('setWarmupMode — 드릴 구간에서 짧게로 바꾸면 웜업이 끝난다', () => {
  freshWarmup(app);
  app.state.activeSession.warmup.idx = 3;   // 일반 웜업을 지나 드릴 진행 중
  app.setWarmupMode('short');
  assert.equal(app.state.activeSession.warmup.done, true);
});

test('mobilityRepairState — 범위 밖 idx로 복원돼도 갇히지 않는다', () => {
  freshWarmup(app);
  app.state.activeSession.warmup.idx = 999;  // 옛 저장분 / 목록이 바뀐 경우
  app.render();
  assert.equal(app.state.activeSession.warmup.done, true, '웜업을 끝난 것으로 정리해야 함');

  // 사전에서 사라진 키만 남은 경우도 마찬가지
  freshWarmup(app);
  app.state.activeSession.warmup.keys = ['사라진_동작'];
  app.state.activeSession.warmup.idx = 0;
  app.render();
  assert.equal(app.state.activeSession.warmup.done, true);

  // 스트레칭 가이드도 같은 방식으로 정리된다
  app.state.activeSession = null;
  app.state.stretchGuide = { keys: ['calf_wall'], idx: 99, segEndsAt: null, soundOn: true, omitted: 0 };
  app.render();
  assert.equal(app.state.stretchGuide, null);
});

test('웜업이 끝나지 않은 세션은 본운동보다 웜업 화면이 먼저다', () => {
  freshWarmup(app);
  assert.equal(app.getTopLayer(), 'warmupGuide');
  app.mobilitySkipAll();
  assert.equal(app.getTopLayer(), 'session');
  // 스트레칭은 완료 화면보다 위
  app.state.activeSession = null;
  app.state.completedSession = { workoutId: 'w', sessionName: 'LEGS', sessionType: 'legs', duration: 50,
    exerciseCount: 1, setCount: 3, exercises: [{ name: '레그 프레스', reps: [10], maxWeight: 100 }], newPRs: [], date: new Date() };
  assert.equal(app.getTopLayer(), 'completed');
  app.openStretchGuide();
  assert.equal(app.getTopLayer(), 'stretchGuide');
  app.closeStretchGuide();
  assert.equal(app.getTopLayer(), 'completed');
});

test('warmup 필드가 없는 옛 저장 세션은 웜업 화면을 건너뛴다 (하위 호환)', () => {
  freshWarmup(app);
  delete app.state.activeSession.warmup;
  app.render();
  assert.equal(app.getTopLayer(), 'session');
});
