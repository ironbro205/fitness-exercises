// 자극 근육 인체도(js/bodymap.js) 테스트.
// 핵심 보장 3가지:
//  1) 커버리지 — EXERCISE_BODY_PART_MAP 에 등장하는 근육 키가 전부 SVG 영역을 가진다.
//  2) 안전한 폴백 — 매핑을 못 찾으면 그림을 통째로 숨긴다(빈 문자열).
//  3) 오프라인 — 만들어진 SVG 에 외부 URL 이 하나도 없다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();

// vm 컨텍스트에서 만든 배열은 프로토타입 출신이 달라 deepEqual 이 실패한다 → JSON 으로 정규화.
const plain = (v) => JSON.parse(JSON.stringify(v));

// EXERCISE_BODY_PART_MAP 에 실제로 쓰이는 근육 키 전부 (primary + secondary)
function allUsedMuscleKeys() {
  const map = app.EXERCISE_BODY_PART_MAP;
  const keys = new Set();
  for (const name of Object.keys(map)) {
    const info = map[name];
    if (info.primary) keys.add(info.primary);
    (info.secondary || []).forEach((s) => keys.add(s));
  }
  return [...keys].sort();
}

// ── 1. 커버리지 ──
test('커버리지 — 종목표에 쓰인 모든 근육 키가 인체도 영역을 가진다', () => {
  const missing = allUsedMuscleKeys().filter((k) => !app.isMappedMuscle(k));
  assert.deepEqual(missing, [], '인체도 영역이 없는 근육 키: ' + missing.join(', '));
});

test('커버리지 — 모든 종목이 앞/뒤 SVG 를 만들어낸다 (숨겨지는 종목 0개)', () => {
  const names = Object.keys(app.EXERCISE_BODY_PART_MAP);
  assert.ok(names.length >= 100, '종목 수가 갑자기 줄었다: ' + names.length);
  const hidden = names.filter((n) => !app.buildMuscleMapSvg(n, 'front') || !app.buildMuscleMapSvg(n, 'back'));
  assert.deepEqual(hidden, [], '인체도가 안 그려지는 종목: ' + hidden.join(', '));
});

test('BODY_PART_KR 의 모든 키가 인체도에 존재한다 (표시명 ↔ 그림 짝 맞음)', () => {
  const missing = Object.keys(app.BODY_PART_KR).filter((k) => !app.isMappedMuscle(k));
  assert.deepEqual(missing, []);
});

// ── 2. 앞/뒤 뷰 매핑 ──
test('앞/뒤 뷰 매핑 — 근육이 실제로 보이는 면에만 그려진다', () => {
  const expected = {
    // 앞에서만
    chest: ['front'], chest_upper: ['front'], chest_lower: ['front'],
    shoulders_front: ['front'], abs: ['front'], obliques: ['front'],
    quads: ['front'], adductors: ['front'],
    // 뒤에서만
    shoulders_rear: ['back'], upper_back: ['back'],
    hamstrings: ['back'], glutes: ['back'], lower_back: ['back'],
    // 양쪽
    shoulders_side: ['front', 'back'], traps: ['front', 'back'], lats: ['front', 'back'],
    triceps: ['front', 'back'], forearms: ['front', 'back'],
    calves: ['front', 'back'], glutes_med: ['front', 'back'],
    // 이두는 앞에서만 (뒤 sliver 는 두지 않았다)
    biceps: ['front'],
  };
  for (const [key, views] of Object.entries(expected)) {
    assert.deepEqual(plain(app.getMuscleViews(key)), views, key + ' 의 뷰가 달라짐');
  }
});

// ── 3. 색칠 규칙 ──
test('색칠 — 주동근은 mm-primary, 보조근은 mm-secondary, 나머지는 기본 톤', () => {
  // 바벨 스쿼트: primary quads, secondary glutes·hamstrings
  const info = app.EXERCISE_BODY_PART_MAP['바벨 스쿼트'];
  assert.equal(info.primary, 'quads');

  const front = app.buildMuscleMapSvg('바벨 스쿼트', 'front');
  const primaryCount = (front.match(/mm-region mm-primary/g) || []).length;
  // 왼쪽 절반 + 미러 = 2벌. quads 는 path 1개짜리라 정확히 2번.
  assert.equal(primaryCount, 2, '주동근 path 가 좌우 2개여야 함');
  assert.ok(front.includes('mm-region mm-off'), '색칠 안 된 근육은 기본 톤이어야 함');

  const back = app.buildMuscleMapSvg('바벨 스쿼트', 'back');
  assert.ok(back.includes('mm-region mm-secondary'), '뒤 뷰에 보조근(둔근/햄스트링)이 연한 색으로 있어야 함');
  // quads 는 뒤 뷰에 없으므로 주동근은 앞에서만 진하다
  assert.ok(!back.includes('mm-primary'), 'quads 는 뒤 뷰에 없어야 함');
});

test('색칠 순서 — 기본 톤 → 보조근 → 주동근 순으로 그려 강조색이 위로 올라온다', () => {
  // 좌우 2벌이 이어 붙으므로 왼쪽 절반만 떼어서 순서를 본다.
  const half = app.buildMuscleMapSvgFor(
    { primary: 'lats', secondary: ['biceps', 'upper_back'] }, 'back'
  ).split('<g transform=')[0];
  const lastOff = half.lastIndexOf('mm-off');
  const firstSecondary = half.indexOf('mm-secondary');
  const firstPrimary = half.indexOf('mm-primary');
  assert.ok(lastOff < firstSecondary, '기본 톤이 보조근보다 먼저 그려져야 함');
  assert.ok(firstSecondary < firstPrimary, '보조근이 주동근보다 먼저 그려져야 함');
});

test('가슴 — chest 는 대흉근 3단 전부, chest_upper 는 윗단만 진하다', () => {
  const whole = app.buildMuscleMapSvgFor({ primary: 'chest', secondary: [] }, 'front');
  const upper = app.buildMuscleMapSvgFor({ primary: 'chest_upper', secondary: [] }, 'front');
  // 좌우 2벌이므로 3밴드 × 2 = 6, 1밴드 × 2 = 2
  assert.equal((whole.match(/mm-primary/g) || []).length, 6);
  assert.equal((upper.match(/mm-primary/g) || []).length, 2);
});

// ── 4. 안전한 폴백 ──
test('폴백 — 매핑에 없는 종목은 그림을 통째로 숨긴다 (빈 문자열)', () => {
  for (const junk of ['한글듣도보도못한종목', 'zzz unknown movement', '', null, undefined]) {
    assert.equal(app.buildMuscleMapSvg(junk, 'front'), '', String(junk) + ' 는 숨겨져야 함');
    assert.equal(app.buildMuscleMapBlock(junk), '', String(junk) + ' 블록은 숨겨져야 함');
    assert.equal(app.getExerciseMuscles(junk), null);
  }
});

test('폴백 — 이름이 조금 달라도 앱 공용 퍼지 매칭으로 살아난다', () => {
  // getExercisePart 의 키워드 추측 경로 (AI 가 만든 이름 변형 대비)
  const m = app.getExerciseMuscles('덤벨 해머 컬 변형');
  assert.ok(m, '퍼지 매칭이 동작해야 함');
  assert.equal(m.primary, 'biceps');
});

test('폴백 — 없는 뷰 이름을 주면 빈 문자열', () => {
  assert.equal(app.buildMuscleMapSvgFor({ primary: 'quads', secondary: [] }, 'side'), '');
});

// ── 5. 순수 함수 / 오프라인 ──
test('순수 함수 — 같은 입력이면 항상 같은 SVG 문자열', () => {
  const a = app.buildMuscleMapSvg('랫 풀다운', 'back');
  const b = app.buildMuscleMapSvg('랫 풀다운', 'back');
  assert.equal(a, b);
  assert.ok(a.length > 500);
});

test('오프라인 — SVG 에 외부 URL·이미지 참조가 하나도 없다', () => {
  const names = Object.keys(app.EXERCISE_BODY_PART_MAP);
  for (const view of ['front', 'back']) {
    for (const n of names) {
      const svg = app.buildMuscleMapSvg(n, view);
      assert.ok(!/https?:/i.test(svg), n + ' (' + view + ') 에 외부 URL 이 있음');
      assert.ok(!/<image/i.test(svg), n + ' (' + view + ') 에 <image> 가 있음');
    }
  }
});

test('SVG 구조 — 좌우 대칭 2벌 + 실루엣 + 윤곽선', () => {
  const svg = app.buildMuscleMapSvg('벤치 프레스', 'front') || app.buildMuscleMapSvg('바벨 벤치 프레스', 'front');
  assert.ok(svg.includes('viewBox="0 0 200 400"'));
  assert.equal((svg.match(/mm-skin/g) || []).length, 2, '실루엣이 좌우 2벌이어야 함');
  assert.equal((svg.match(/mm-contour/g) || []).length, 2, '윤곽선이 좌우 2벌이어야 함');
  assert.ok(svg.includes('transform="translate(200,0) scale(-1,1)"'), '오른쪽은 미러링이어야 함');
  assert.ok(svg.includes('aria-hidden="true"'), '그림은 스크린리더에서 건너뛰고 옆 텍스트로 읽힌다');
});

test('path 데이터가 전부 정상 형식 (M 으로 시작, Z 로 닫힘)', () => {
  for (const view of ['front', 'back']) {
    for (const [key, paths] of Object.entries(app.MUSCLE_REGIONS[view])) {
      for (const d of paths) {
        assert.ok(/^M[\s\d]/.test(d), view + '/' + key + ' path 가 M 으로 시작해야 함');
        assert.ok(d.trim().endsWith('Z'), view + '/' + key + ' path 가 Z 로 닫혀야 함');
      }
    }
  }
  assert.ok(app.BODY_SILHOUETTE.trim().endsWith('Z'), '실루엣은 닫힌 도형');
  assert.ok(!app.BODY_CONTOUR.trim().endsWith('Z'), '윤곽선은 열린 선 (닫으면 몸 가운데 세로줄이 생김)');
});

// ── 6. 화면 블록 / 이스케이프 ──
test('블록 — 앞·뒤 2장 + 근육 이름 범례를 담고, 탭하면 확대된다', () => {
  const html = app.buildMuscleMapBlock('랫 풀다운');
  assert.ok(html.includes('mm-block'));
  assert.equal((html.match(/class="mm-svg"/g) || []).length, 2, '인체도는 앞/뒤 2장');
  assert.ok(html.includes('>앞<') && html.includes('>뒤<'));
  assert.ok(html.includes('openMuscleMapZoom('));
  assert.ok(html.includes('광배'), '주동근 한국어 이름이 보여야 함');
});

test('범례 문구 — 주동근/보조근을 한국어로 적는다', () => {
  const txt = app.buildMuscleLegendText('랫 풀다운');
  assert.ok(txt.startsWith('주동근 광배'), txt);
  assert.ok(txt.includes('보조근'), txt);
  assert.equal(app.buildMuscleLegendText('한글듣도보도못한종목'), '');
});

test('이스케이프 — 따옴표·꺾쇠·줄바꿈이 든 종목명이 onclick 을 깨뜨리지 않는다', () => {
  // 작은따옴표: JS 용으로 \' 로 막고 그 따옴표를 다시 HTML 엔티티로
  assert.equal(app.muscleMapJsArg("오늘's 스쿼트"), '오늘\\&#39;s 스쿼트');
  // 역슬래시는 두 배로 (안 그러면 뒤 문자를 이스케이프해 버림)
  assert.equal(app.muscleMapJsArg('a\\b'), 'a\\\\b');
  // 생 줄바꿈은 작은따옴표 JS 문자열에서 문법 오류 → \n 으로
  assert.equal(app.muscleMapJsArg('line1\nline2'), 'line1\\nline2');
  assert.ok(!app.muscleMapJsArg('line1\nline2').includes('\n'));
  // HTML 속성을 깨는 문자는 전부 엔티티로
  assert.ok(!app.muscleMapJsArg('<img src=x onerror=alert(1)>').includes('<'));
  assert.ok(!app.muscleMapJsArg('a"b').includes('"'));
});

// muscleMapJsArg 단위 테스트만으로는, buildMuscleMapBlock 이 그 함수를 안 쓰게 바뀌거나
// onclick 문자열을 잘못 조립해도 통과해 버린다. 실제로 만들어진 속성을 뜯어본다.
test('블록 — 위험한 종목명이 들어와도 만들어진 onclick 속성이 안 깨진다', () => {
  const nasty = [
    "'); alert(1); ('",          // JS 문자열 탈출 시도
    '" onmouseover="alert(1)',   // HTML 속성 탈출 시도
    '</div><script>alert(1)<\/script>',
    'back\\slash',
    'line1\nline2',
  ];
  for (const evil of nasty) {
    // 퍼지 매칭에 걸리도록 실제 종목 키워드를 섞는다 (안 그러면 그냥 숨겨져서 검증이 무의미)
    const name = evil + ' 바벨 스쿼트';
    const html = app.buildMuscleMapBlock(name);
    assert.ok(html, name + ' 은 매핑돼서 블록이 나와야 검증이 의미 있음');

    // 1) onclick 속성값을 통째로 뽑아낸다 (속성이 조기 종료됐다면 여기서 티가 난다)
    const m = html.match(/onclick="([^"]*)"/);
    assert.ok(m, 'onclick 속성을 찾지 못함: ' + html.slice(0, 200));
    const attr = m[1];

    // 2) 속성값 안에 날 것의 " 가 없어야 한다 (있으면 속성이 거기서 끊긴 것)
    assert.ok(!attr.includes('"'), 'onclick 속성이 따옴표로 끊김: ' + attr);
    // 3) 태그를 새로 여는 문자가 남아 있으면 안 된다
    assert.ok(!attr.includes('<') && !attr.includes('>'), '꺾쇠가 살아남음: ' + attr);
    // 4) 생 줄바꿈이 남으면 작은따옴표 JS 문자열이 문법 오류가 된다
    assert.ok(!/[\r\n]/.test(attr), '줄바꿈이 살아남음: ' + JSON.stringify(attr));

    // 5) HTML 엔티티를 되돌린 뒤에도 openMuscleMapZoom('...') 한 덩어리여야 한다
    const decoded = attr
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    assert.ok(/^openMuscleMapZoom\('.*'\)$/s.test(decoded), '핸들러 형태가 깨짐: ' + decoded);

    // 6) 작은따옴표 JS 문자열로서 성립하는지 + 원래 이름으로 되돌아오는지 (이스케이프 왕복)
    //    eval/new Function 은 쓰지 않는다 — 이스케이프가 깨졌을 때 그 코드가 진짜로 실행돼버린다.
    const jsLiteral = decoded.slice('openMuscleMapZoom('.length, -1);
    assert.ok(jsLiteral.startsWith("'") && jsLiteral.endsWith("'"), '따옴표로 감싸이지 않음: ' + jsLiteral);
    const inner = jsLiteral.slice(1, -1);

    // 이스케이프 안 된 작은따옴표가 하나라도 있으면 문자열이 거기서 끝나 버린다 = 탈출
    let restored = '';
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (c !== '\\') {
        assert.notEqual(c, "'", '이스케이프 안 된 작은따옴표로 문자열 탈출: ' + inner);
        restored += c;
        continue;
      }
      const next = inner[++i];
      assert.ok(next !== undefined, '역슬래시로 끝남: ' + inner);
      restored += next === 'n' ? '\n' : next === 'r' ? '\r' : next; // \\ \' \n \r
    }
    assert.equal(restored, name, '이스케이프 왕복에서 이름이 달라짐');
  }
});

test('블록 — role="button" 이면 키보드(Enter/Space)로도 확대된다', () => {
  const html = app.buildMuscleMapBlock('랫 풀다운');
  assert.ok(html.includes('role="button"'));
  assert.ok(html.includes('onkeydown='), 'role=button 인데 키보드 핸들러가 없으면 접근성 함정');
  assert.ok(html.includes("event.key==='Enter'"));
});

test('확대 오버레이 — state.muscleMapZoom 이 있을 때만 그려진다', () => {
  app.state.muscleMapZoom = null;
  assert.equal(app.buildMuscleMapZoomHtml(), '');

  app.state.muscleMapZoom = '랫 풀다운';
  const html = app.buildMuscleMapZoomHtml();
  assert.ok(html.includes('mm-zoom-overlay'));
  assert.ok(html.includes('주동근'));
  assert.ok(html.includes('closeMuscleMapZoom()'));

  app.state.muscleMapZoom = '한글듣도보도못한종목';
  assert.equal(app.buildMuscleMapZoomHtml(), '', '매핑 없으면 오버레이도 안 뜬다');
  app.state.muscleMapZoom = null;
});

// 미리보기에서 종목 줄을 누르면 이제 인체도를 펼치는 대신 **종목 편집 시트**가 열린다(#1).
// 인체도는 그 시트 안에 들어 있다 — 정보를 잃지 않으면서 한 줄이 한 가지 일만 하게 된다.
test('루틴 미리보기 — 종목 줄을 누르면 편집 시트가 열리고 그 안에 인체도가 있다', () => {
  app.state.generatedRoutine = { bodyPart: 'pull', exercises: [
    { name: '바벨 스쿼트', sets: 3, reps: '5-8' },
    { name: '랫 풀 다운', sets: 3, reps: '8-12' }
  ] };
  app.state.routinePreviewExpanded = true;
  app.state.workoutWizardStep = 3;

  const preview = app.renderWorkoutStep3();
  assert.ok(preview.includes("openExerciseEdit('preview', 1)"), '종목 줄이 편집 시트를 열지 않는다');
  assert.ok(!preview.includes('mm-views'), '인체도가 미리보기에 그대로 펼쳐져 있다');

  app.openExerciseEdit('preview', 1);
  assert.equal(app.state.exerciseEdit.name, '랫 풀 다운');
  const sheet = app.buildExerciseEditSheetHtml();
  assert.ok(sheet.includes('mm-views'), '편집 시트 안에 인체도가 없다');
  assert.ok(sheet.includes('종목 바꾸기') && sheet.includes('종목 빼기'));

  // 시트가 떠 있는 동안 루틴이 바뀌어 그 자리에 다른 종목이 오면 조용히 닫힌 것처럼 읽힌다
  app.state.generatedRoutine.exercises[1] = { name: '케이블 로우', sets: 3, reps: '8-12' };
  assert.equal(app.buildExerciseEditSheetHtml(), '', '엉뚱한 종목을 고치지 않도록 대상이 안 잡혀야 한다');
  app.state.exerciseEdit = null;
  app.state.generatedRoutine = null;
});

test('뒤로가기 — 확대 오버레이가 가장 위 레이어로 잡힌다', () => {
  app.state.muscleMapZoom = '랫 풀다운';
  assert.equal(app.getTopLayer(), 'muscleMapZoom');
  app.state.muscleMapZoom = null;
  assert.notEqual(app.getTopLayer(), 'muscleMapZoom');
});
