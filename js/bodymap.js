'use strict';

// ═══════════════════════════════════════════════
// 근육 자극 부위 인체도 (Muscle body map)
// ═══════════════════════════════════════════════
//
// 종목명을 받아 앞/뒤 두 장의 전신 SVG 를 만들고,
// EXERCISE_BODY_PART_MAP 의 primary(주동근) / secondary(보조근) 근육을 색칠한다.
//
// ── 자산 출처 / 라이선스 ────────────────────────────────────────────────
// Muscle map SVG paths — ORIGINAL WORK, hand-authored for this repository.
// No third-party artwork, no traced source, no external asset. Owned by this project.
//
// 이 파일의 SVG path 는 전부 이 저장소를 위해 **직접 제작한 원본 도형**이다.
// 외부 인체도(위키미디어 등)를 베끼거나 트레이싱하지 않았고, 참고 자산도 쓰지 않았다.
// 따라서 3rd-party 라이선스 의무(출처 표기·share-alike)가 없다.
// 해부학적 위치(근육이 앞/뒤 어느 면에 보이는지, 서로 어디서 맞닿는지)만
// 일반 해부학 지식을 따랐다 — 사실(fact)은 저작권 대상이 아니다.
// 외부 URL·이미지 파일을 전혀 쓰지 않으므로 오프라인(PWA)에서도 그대로 그려진다.
//
// ⚠️ muscle-highlighter 계열 오픈소스(react-native-body-highlighter 등)의 path 를
//    여기에 붙여 넣지 말 것. 코드 라이선스는 MIT/Apache 지만 **그림 자체의 출처가
//    어느 저장소에도 기록돼 있지 않다**(조사 결과: docs/muscle-map-assets.md).
//    출처가 완전히 추적되는 유일한 인체도(위키미디어 Termininja)는 CC BY-SA —
//    share-alike 가 전염되므로 이 앱에 쓸 수 없다.
//
// ── 도형 구조 ──────────────────────────────────────────────────────────
// 사람 몸은 좌우 대칭이므로 **왼쪽 절반만** 그리고(가운데선 x=100),
// 같은 도형을 x=100 기준으로 뒤집어(transform) 오른쪽을 만든다.
// → path 를 절반만 관리하면 되고, 좌우가 어긋날 일이 없다.
// 좌표계: viewBox "0 0 200 400" (머리 꼭대기 y≈8, 발바닥 y≈392).
// 앞모습·뒷모습의 실루엣은 같은 path 를 공유하고, 위에 얹는 근육 영역만 다르다.

// 중심선(좌우 대칭축)과 캔버스 크기
var BODY_MAP_VIEWBOX = '0 0 200 400';
var BODY_MAP_MIRROR = 'translate(200,0) scale(-1,1)';

// 전신 윤곽선 (왼쪽 절반, 열린 path). 머리 꼭대기 → 팔 → 다리 → 발 → 안쪽 다리 → 사타구니.
// 이 선은 **테두리 그리기용**이라 가운데선(x=100)을 포함하지 않는다.
// (닫아서 테두리를 그리면 몸 한가운데 세로줄이 생겨 그림이 갈라져 보인다)
var BODY_CONTOUR = 'M100 8'
  + 'C89 8 81 17 81 30'                 // 머리 왼쪽
  + 'C81 42 86 52 94 56'                // 관자놀이 → 턱
  + 'L92 63'                            // 목 옆
  + 'C90 67 87 69 82 71'                // 승모근 시작
  + 'C72 74 61 79 55 88'                // 어깨 경사 → 삼각근
  + 'C49 96 47 107 48 118'              // 삼각근 바깥 → 위팔 바깥
  + 'C49 128 50 136 51 145'             // 팔꿈치 바깥
  + 'C48 159 45 175 44 190'             // 아래팔 바깥
  + 'C43 200 45 210 50 217'             // 손 바깥/아래
  + 'C56 213 60 204 60 194'             // 손 안쪽으로 올라옴
  + 'C61 179 63 163 65 149'             // 아래팔 안쪽
  + 'C66 139 67 129 68 119'             // 팔꿈치 안쪽 → 위팔 안쪽
  + 'C69 111 69 105 69 100'             // 겨드랑이
  + 'C71 117 73 134 74 151'             // 옆구리 → 허리
  + 'C73 163 71 173 69 183'             // 골반 벌어짐
  + 'C66 195 64 209 64 225'             // 허벅지 바깥
  + 'C65 245 67 263 69 281'             // 허벅지 → 무릎
  + 'C70 293 71 303 73 313'             // 무릎
  + 'C77 329 80 347 81 363'             // 종아리 → 발목
  + 'L82 375'
  + 'C80 383 77 389 75 393'             // 뒤꿈치/발
  + 'L96 393'
  + 'L96 377'
  + 'C95 361 94 341 93 321'             // 안쪽 종아리
  + 'C92 303 91 293 91 285'             // 안쪽 무릎
  + 'C92 263 94 233 96 203'             // 안쪽 허벅지
  + 'L98 191'
  + 'L100 189';

// 같은 윤곽선을 가운데선으로 닫은 것 — 이건 **채우기용**(테두리 없음).
// 가운데선을 x=100 이 아니라 101 로 넘겨 좌우 절반이 1유닛 겹치게 한다.
// 딱 맞물리게 두면 두 절반 사이에 안티에일리어싱 실틈이 생겨 몸 한가운데 세로줄로 보인다.
var BODY_SILHOUETTE = BODY_CONTOUR + ' L101 189 L101 8 Z';

// 실루엣 위에 얹는 얇은 안내선 (근육 경계 힌트 — 색칠과 무관, 그림처럼 보이게 하는 용도)
var BODY_DETAIL_LINES = {
  front: [
    'M100 78 L100 122',                 // 복장뼈
    'M100 126 L100 184',                // 백선(복부 가운데)
    'M87 142 L99 143',                  // 복근 가로 힘줄 3줄
    'M86 158 L99 159',
    'M86 173 L99 174',
    'M71 293 C77 297 85 297 90 293'     // 무릎
  ],
  back: [
    'M100 60 L100 192',                 // 척추
    'M83 105 C88 116 93 124 98 131',    // 견갑골 힌트
    'M77 233 L90 235',                  // 둔근/햄스트링 경계
    'M71 293 C77 297 85 297 90 293'     // 오금
  ]
};

// 가슴은 한 덩어리(대흉근)를 상·중·하 3단으로 나눠 그린다.
// 'chest'(전체) 키는 3단 전부를 가지고, 'chest_upper'/'chest_lower' 는 자기 단만 가진다.
// → 인클라인(chest_upper)은 윗단만 진하게, 플랫 벤치(chest)는 가슴 전체가 진하게 칠해진다.
var PEC_UPPER = 'M97 78 C89 78 79 80 71 85 C69 88 68 92 68 96 L97 94 Z';
var PEC_MID = 'M97 95 L68 97 C68 102 70 107 73 111 L97 109 Z';
var PEC_LOWER = 'M97 110 L74 112 C78 119 85 125 93 128 L97 129 Z';

// 삼각근은 앞뒤 뷰에서 같은 자리에 있다. 바깥 띠 = 측면(side), 안쪽 = 전면/후면.
var DELT_OUTER = 'M64 75 C56 80 49 89 48 100 C48 110 50 119 53 127 L59 124 C55 115 54 104 56 94 C58 86 61 79 65 75 Z';
var DELT_INNER = 'M65 75 C61 79 58 86 56 94 C54 104 55 115 59 124 L68 120 C70 109 70 96 70 88 C70 81 68 77 66 75 Z';

// 아래팔은 앞뒤가 같은 자리
var FOREARM = 'M52 150 C48 163 46 178 45 192 L58 189 C59 175 61 161 64 152 Z';

// ── 근육 영역 ─────────────────────────────────────────────────────────
// key = EXERCISE_BODY_PART_MAP 의 primary/secondary 값 (BODY_PART_KR 과 같은 키).
// 값 = 그 근육을 이루는 왼쪽 절반 path 배열 (오른쪽은 자동 대칭 복사).
// 어떤 뷰(front/back)에 등장하는지가 곧 "그 근육이 앞/뒤 어디서 보이는가" 매핑이다.
// 같은 층(tier)끼리는 살짝 겹쳐도 된다 — 색이 같아 티가 안 나고,
// 강조되는 근육은 항상 마지막에 그려서 위로 올라오기 때문이다(buildMuscleMapSvgFor 참고).
var MUSCLE_REGIONS = {
  front: {
    traps: ['M99 58 C89 61 77 67 65 75 C70 78 76 79 82 78 C88 76 94 71 99 65 Z'],
    shoulders_side: [DELT_OUTER],
    shoulders_front: [DELT_INNER],
    chest: [PEC_UPPER, PEC_MID, PEC_LOWER],
    chest_upper: [PEC_UPPER],
    chest_lower: [PEC_LOWER],
    // 앞뷰의 옆구리 띠 — 해부학적으로는 전거근에 가깝지만 앱에 serratus 키가 없어 lats 로 흡수한다.
    lats: ['M69 102 C71 115 73 128 73 140 C73 147 74 152 76 157 L82 152 C80 134 77 116 72 102 Z'],
    abs: ['M99 124 L85 127 C82 144 82 166 85 183 L99 185 Z'],
    obliques: ['M84 128 C78 133 74 143 73 155 C72 167 74 178 78 187 L85 184 C82 166 82 145 84 128 Z'],
    biceps: ['M57 122 C55 130 54 138 55 147 L66 144 C67 135 68 127 68 118 Z'],
    triceps: ['M50 120 C49 129 49 138 50 147 L54 146 C53 137 53 128 54 121 Z'],
    forearms: [FOREARM],
    glutes_med: ['M69 172 C65 179 64 189 65 198 L74 195 C74 186 73 178 73 173 Z'],
    quads: ['M94 196 C85 196 76 201 71 211 C66 224 65 245 67 266 C68 276 70 284 73 292 L86 292 C88 273 89 249 90 225 C90 211 92 200 94 196 Z'],
    adductors: ['M97 192 C89 195 82 204 80 217 C78 235 79 253 82 268 L95 268 C93 250 92 230 94 212 C95 202 96 195 97 192 Z'],
    calves: ['M76 300 C73 320 75 343 81 362 L92 356 C93 336 92 317 90 300 Z']
  },
  back: {
    traps: ['M99 57 C88 60 76 66 65 75 C73 79 81 90 86 103 L99 112 Z'],
    upper_back: ['M99 115 L85 107 C80 114 78 125 79 136 L99 142 Z'],
    shoulders_side: [DELT_OUTER],
    shoulders_rear: [DELT_INNER],
    lats: ['M69 103 C72 117 75 132 80 145 C83 153 86 159 90 163 L99 167 L99 143 C94 138 88 129 82 118 C77 110 73 106 69 103 Z'],
    lower_back: ['M99 167 L85 162 C83 172 85 182 90 190 L99 193 Z'],
    triceps: ['M56 121 C54 130 53 139 54 148 L67 145 C68 135 69 127 69 118 Z'],
    forearms: [FOREARM],
    glutes: ['M99 188 C91 186 83 188 77 194 C70 200 67 209 67 217 C67 226 72 233 80 235 C88 237 95 234 99 230 Z'],
    glutes_med: ['M71 176 C66 182 64 191 65 200 C66 205 67 208 69 210 C71 200 75 192 81 188 C77 183 74 179 71 176 Z'],
    hamstrings: ['M97 234 C89 234 80 236 74 242 C70 254 69 270 71 286 L88 288 C91 270 93 250 96 238 Z'],
    calves: ['M74 298 C71 317 73 341 79 359 L92 355 C94 335 93 315 91 298 Z']
  }
};

// 근육 키 → 보이는 뷰 목록. MUSCLE_REGIONS 에서 자동으로 뽑는다(표를 두 번 관리하지 않기 위해).
// 예) chest=['front'], lats=['front','back'], shoulders_side=['front','back']
function getMuscleViews(muscleKey) {
  var views = [];
  if (MUSCLE_REGIONS.front[muscleKey]) views.push('front');
  if (MUSCLE_REGIONS.back[muscleKey]) views.push('back');
  return views;
}

// 이 인체도가 그릴 줄 아는 근육 키인가
function isMappedMuscle(muscleKey) {
  return !!muscleKey && getMuscleViews(muscleKey).length > 0;
}

// ── 종목 → 근육 ────────────────────────────────────────────────────────
// 정확 매칭(EXERCISE_BODY_PART_MAP) → 실패 시 앱 공용 퍼지 매칭(getExercisePart) 순.
// 둘 다 실패하거나 primary 를 그릴 수 없으면 null → 호출부에서 그림을 통째로 숨긴다.
function getExerciseMuscles(exerciseName) {
  if (!exerciseName) return null;
  var info = (typeof EXERCISE_BODY_PART_MAP !== 'undefined' && EXERCISE_BODY_PART_MAP[exerciseName])
    ? EXERCISE_BODY_PART_MAP[exerciseName]
    : (typeof getExercisePart === 'function' ? getExercisePart(exerciseName) : null);
  if (!info || !info.primary) return null;
  if (!isMappedMuscle(info.primary)) return null; // 그릴 수 없는 부위 → 숨김

  var secondary = (info.secondary || []).filter(isMappedMuscle);
  return { primary: info.primary, secondary: secondary };
}

// ── SVG 생성 ───────────────────────────────────────────────────────────
// 순수 함수: 같은 입력이면 항상 같은 문자열. (테스트하기 쉬우라고 DOM 을 안 만짐)
// view: 'front' | 'back'
function buildMuscleMapSvg(exerciseName, view) {
  var muscles = getExerciseMuscles(exerciseName);
  if (!muscles) return '';
  return buildMuscleMapSvgFor(muscles, view);
}

// 근육 집합({primary, secondary})으로 직접 그린다 — 종목 없이도 쓸 수 있게 분리.
function buildMuscleMapSvgFor(muscles, view) {
  var regions = MUSCLE_REGIONS[view];
  if (!regions) return '';

  var secondarySet = {};
  (muscles.secondary || []).forEach(function(k) { secondarySet[k] = true; });

  // 색칠 안 된 근육이 먼저, 보조근, 주동근 순으로 그려야 강조색이 위로 올라온다.
  var order = { off: [], secondary: [], primary: [] };
  Object.keys(regions).forEach(function(key) {
    var tier = key === muscles.primary ? 'primary' : (secondarySet[key] ? 'secondary' : 'off');
    regions[key].forEach(function(d) {
      order[tier].push('<path class="mm-region mm-' + tier + '" d="' + d + '"></path>');
    });
  });

  var lines = (BODY_DETAIL_LINES[view] || []).map(function(d) {
    return '<path class="mm-line" d="' + d + '"></path>';
  }).join('');

  var half = '<path class="mm-skin" d="' + BODY_SILHOUETTE + '"></path>'
    + order.off.join('') + order.secondary.join('') + order.primary.join('')
    + lines
    + '<path class="mm-contour" d="' + BODY_CONTOUR + '"></path>';

  return '<svg class="mm-svg" viewBox="' + BODY_MAP_VIEWBOX + '" aria-hidden="true" focusable="false">'
    + '<g>' + half + '</g>'
    + '<g transform="' + BODY_MAP_MIRROR + '">' + half + '</g>'
    + '</svg>';
}

// 근육 키 → 한국어 이름 (BODY_PART_KR 재사용, 없으면 키 그대로)
function muscleLabel(key) {
  if (typeof BODY_PART_KR !== 'undefined' && BODY_PART_KR[key]) return BODY_PART_KR[key];
  return key;
}

// "주동근 대퇴사두 · 보조근 둔근, 햄스트링" 같은 설명 문자열
function buildMuscleLegendText(exerciseName) {
  var muscles = getExerciseMuscles(exerciseName);
  if (!muscles) return '';
  var text = '주동근 ' + muscleLabel(muscles.primary);
  if (muscles.secondary.length) {
    text += ' · 보조근 ' + muscles.secondary.map(muscleLabel).join(', ');
  }
  return text;
}

// onclick 속성에 문자열 인자를 안전하게 넣기 위한 이스케이프.
// 이 값은 **작은따옴표 JS 문자열** 안에 들어가고, 그 전체가 **큰따옴표 HTML 속성** 안에 들어간다.
// 그래서 두 단계를 다 막아야 한다:
//   1) JS 문자열 깨짐 — 역슬래시·작은따옴표·줄바꿈(작은따옴표 문자열에 생 줄바꿈은 문법 오류)
//   2) HTML 속성 깨짐 — escapeHtml 이 & < > " ' 를 엔티티로
// (AI 가 만든 종목명·사용자가 직접 입력한 종목명이 그대로 들어올 수 있다)
function muscleMapJsArg(s) {
  return escapeHtml(
    String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
  );
}

// ── 화면에 넣는 블록 ───────────────────────────────────────────────────
// 앞/뒤 두 장을 나란히 작게. 탭하면 확대 오버레이가 열린다.
// 매핑 실패 시 빈 문자열 → 호출부는 아무것도 안 그림(안전한 동작).
function buildMuscleMapBlock(exerciseName, opts) {
  var muscles = getExerciseMuscles(exerciseName);
  if (!muscles) return '';
  opts = opts || {};

  var arg = muscleMapJsArg(exerciseName);
  var compactCls = opts.compact ? ' mm-block-compact' : '';

  return '<div class="mm-block' + compactCls + '" role="button" tabindex="0" '
      + 'aria-label="자극 근육 그림 크게 보기" '
      + 'onclick="openMuscleMapZoom(\'' + arg + '\')" '
      // role="button" 을 붙였으면 키보드로도 눌려야 한다 (Enter/Space)
      + 'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openMuscleMapZoom(\'' + arg + '\');}">'
      + '<div class="mm-views">'
        + '<div class="mm-view">' + buildMuscleMapSvgFor(muscles, 'front') + '<span class="mm-view-label">앞</span></div>'
        + '<div class="mm-view">' + buildMuscleMapSvgFor(muscles, 'back') + '<span class="mm-view-label">뒤</span></div>'
      + '</div>'
      + '<div class="mm-legend">'
        + '<span class="mm-swatch mm-swatch-primary"></span><span class="mm-legend-txt">' + escapeHtml(muscleLabel(muscles.primary)) + '</span>'
        + (muscles.secondary.length
            ? '<span class="mm-swatch mm-swatch-secondary"></span><span class="mm-legend-txt">' + escapeHtml(muscles.secondary.map(muscleLabel).join(', ')) + '</span>'
            : '')
        + '<span class="mm-zoom-hint">' + (typeof icon === 'function' ? icon('search', 12) : '') + '</span>'
      + '</div>'
    + '</div>';
}

// 확대 오버레이 (state.muscleMapZoom 에 종목명이 들어 있으면 렌더)
function buildMuscleMapZoomHtml() {
  var name = state && state.muscleMapZoom;
  if (!name) return '';
  var muscles = getExerciseMuscles(name);
  if (!muscles) return '';

  return '<div class="mm-zoom-overlay" onclick="closeMuscleMapZoom()">'
    + '<div class="mm-zoom-card" onclick="event.stopPropagation()">'
      + '<div class="mm-zoom-head">'
        + '<div>'
          + '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">자극 근육</p>'
          + '<p class="font-bebas text-2xl mt-1">' + escapeHtml(name) + '</p>'
        + '</div>'
        + '<button class="session-header-btn" onclick="closeMuscleMapZoom()" aria-label="닫기">'
          + (typeof icon === 'function' ? icon('close', 18) : '✕')
        + '</button>'
      + '</div>'
      + '<div class="mm-views mm-views-lg">'
        + '<div class="mm-view">' + buildMuscleMapSvgFor(muscles, 'front') + '<span class="mm-view-label">앞</span></div>'
        + '<div class="mm-view">' + buildMuscleMapSvgFor(muscles, 'back') + '<span class="mm-view-label">뒤</span></div>'
      + '</div>'
      + '<div class="mm-zoom-legend">'
        + '<div class="mm-zoom-legend-row"><span class="mm-swatch mm-swatch-primary"></span>'
          + '<span>주동근 · <strong>' + escapeHtml(muscleLabel(muscles.primary)) + '</strong></span></div>'
        + (muscles.secondary.length
            ? '<div class="mm-zoom-legend-row"><span class="mm-swatch mm-swatch-secondary"></span>'
              + '<span>보조근 · ' + escapeHtml(muscles.secondary.map(muscleLabel).join(', ')) + '</span></div>'
            : '')
      + '</div>'
    + '</div>'
  + '</div>';
}

// ── 이벤트 핸들러 ──────────────────────────────────────────────────────
window.openMuscleMapZoom = function(exerciseName) {
  if (!exerciseName) return;
  state.muscleMapZoom = exerciseName;
  render();
};

window.closeMuscleMapZoom = function() {
  if (!state.muscleMapZoom) return;
  state.muscleMapZoom = null;
  render();
};

// 루틴 미리보기에서 종목 한 줄을 펼치고/접는다 (한 번에 한 종목만)
window.toggleRoutineExerciseMap = function(idx) {
  state.routineExMapIdx = (state.routineExMapIdx === idx) ? null : idx;
  render();
};
