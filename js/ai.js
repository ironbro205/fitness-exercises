// js/ai.js — Anthropic API 호출 + 프롬프트 (코치/루틴/리뷰/정체기)
'use strict';

// AI 응답에서 첫 '{'부터 짝이 맞는 '}'까지 정확히 잘라낸다 (문자열·이스케이프 고려).
// 응답 끝에 잡담이 붙거나, 탐욕적 정규식(/\{[\s\S]*\}/)이 과하게 무는 문제를 막는다.
// 닫는 '}'를 못 찾으면(=응답이 중간에 잘림) null 을 돌려준다.
// 응답 content 배열에서 텍스트 블록만 모아 반환.
// Sonnet 5는 답 앞에 thinking(생각) 블록을 붙일 수 있어 content[0]이 텍스트가 아닐 수 있다 —
// 첫 조각만 읽으면 "AI 응답이 비어있어요" 오판이 난다. 반드시 이 헬퍼로 읽을 것.
function getResponseText(data) {
  if (!data || !Array.isArray(data.content)) return '';
  var out = '';
  for (var i = 0; i < data.content.length; i++) {
    var b = data.content[i];
    if (b && b.type === 'text' && typeof b.text === 'string') out += b.text;
  }
  return out.trim();
}

function extractBalancedJson(s) {
  var start = s.indexOf('{');
  if (start === -1) return null;
  var depth = 0, inStr = false, esc = false;
  for (var i = start; i < s.length; i++) {
    var ch = s[i];
    if (inStr) {
      if (esc) { esc = false; }
      else if (ch === '\\') { esc = true; }
      else if (ch === '"') { inStr = false; }
    } else if (ch === '"') { inStr = true; }
    else if (ch === '{') { depth++; }
    else if (ch === '}') { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  return null;
}

// ═══════════════════════════════════════════════
// 파싱 경계 타입 강제 — AI가 준 값을 앱이 쓰는 타입으로 접는다.
//
// 모델은 JSON 스키마를 지켜 달라고 해도 숫자 칸에 "3-4" · "40kg" · "90초" 같은 글자를 넣는다.
// #57 에서 화면 출력은 escapeHtml 로 막았지만 **타입은 그대로**라, 그 글자가 계산까지 흘러간다:
//   · sets "3-4"  → buildSchemeSets 의 Math.max(0, "3-4") = NaN → for 루프 0회 → 그 종목 세트가 0개
//   · weight "40kg" → snapWeightToEquipment 안에서 NaN → 모든 세트 무게가 NaN, 저장하면 null 로 굳음
//   · totalSets 생략 → reduce 가 문자열 이어붙이기로 변해 "03-43-4"
//   · rest "빠르게" → 화면에 "NaN분"
// 그래서 **화면이 아니라 파싱 지점에서** 한 번만 접는다. 여기를 지나면 숫자 칸은 항상 숫자다.
// ═══════════════════════════════════════════════

// 시간 칸의 단위 배수. ★단위를 무시하고 숫자만 읽으면 "2분 쉬세요"가 2초가 되고,
// 유산소 구간이 "5분"·"120초" 로 섞여 오면 5:120 비율로 짜인다(옳게는 300:120).
// 단위 표기가 없으면 그 칸의 기본 단위로 준 것으로 보고 1배.
function aiTimeFactor(text, baseUnit) {
  var perSec;
  if (/시간|hours?\b|hrs?\b|\d\s*h\b/i.test(text)) perSec = 3600;
  else if (/분|minutes?\b|mins?\b|\d\s*m\b/i.test(text)) perSec = 60;
  else if (/초|seconds?\b|secs?\b|\d\s*s\b/i.test(text)) perSec = 1;
  else return 1;
  return (baseUnit === 'min') ? (perSec / 60) : perSec;
}

// 숫자 강제. 글자면 앞에 나오는 첫 숫자를 읽는다 — "3-4"→3, "8~12"→8 처럼
// 범위를 준 경우 **아래값**을 택한다(세트·무게를 부풀리지 않는 쪽이 안전).
// 읽을 수 없으면 fallback 을 그대로 돌려준다(호출부가 기본값을 정한다).
// opts.min / opts.max: 범위 밖은 잘라서 병적인 값(999999kg)이 저장되지 않게 한다.
// opts.positive: 0 이하를 "값 없음"으로 본다 — 기존 `parsed.X || 기본값` 의 falsy 동작을 그대로 유지하는 스위치.
// opts.unit: 'sec' | 'min' — 시간 칸이면 단위를 읽어 그 기준으로 환산한다("1시간"→3600초).
function aiNum(value, fallback, opts) {
  opts = opts || {};
  var n;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string') {
    // 맨 앞 숫자를 먼저 본다("-5" 의 부호를 살리려고). 앞이 글자면 뒤에서 부호 없는 첫 숫자("약 3세트"→3).
    var m = value.match(/^\s*(-?\d+(?:\.\d+)?)/) || value.match(/(\d+(?:\.\d+)?)/);
    n = m ? parseFloat(m[1]) : NaN;
    if (isFinite(n) && opts.unit) n = n * aiTimeFactor(value, opts.unit);
  } else {
    n = NaN;                                   // boolean · null · 배열 · 객체
  }
  if (!isFinite(n)) return fallback;
  if (opts.positive && n <= 0) return fallback;
  if (typeof opts.min === 'number' && n < opts.min) n = opts.min;
  if (typeof opts.max === 'number' && n > opts.max) n = opts.max;
  return n;
}

// 정수 강제 (세트 수·RIR·휴식초처럼 소수가 의미 없는 칸).
function aiInt(value, fallback, opts) {
  var n = aiNum(value, null, opts);
  return (n === null) ? fallback : Math.round(n);
}

// ★반복·RIR·휴식은 **범위 문자열이 정상값**이다 — 숫자로 접으면 안 된다.
//   이 앱의 루틴 프롬프트가 직접 "reps":"8-10" · "rir":"2-3" · "rest":"120-180" 을 요구하고,
//   읽는 쪽도 범위를 그대로 읽는다: parseRepRange("8-12") · restMin("120-180")→"2-3분" ·
//   getEffectiveRestSec 의 parseInt("120-180")→120. 안전 가드레일(js/domain.js)도 교체 종목에
//   '2-3' · '120-180' 을 다시 써 넣는다. 하나로 접으면 "2-3분 쉬세요"가 "2분"이 된다.
// 그래서 여기서는 **형식만** 통일한다: "8~12"→"8-12", "12회"→"12", "많이"→fallback.
function aiRange(value, fallback, opts) {
  opts = opts || {};
  var min = (typeof opts.min === 'number') ? opts.min : 1;
  var max = (typeof opts.max === 'number') ? opts.max : 1000;
  var s = (typeof value === 'number' && isFinite(value)) ? String(Math.round(value))
        : (typeof value === 'string' ? value : '');
  var m = s.match(/(\d+(?:\.\d+)?)\s*(?:[-~–—]\s*(\d+(?:\.\d+)?))?/);
  if (!m) return fallback;
  // 범위의 양끝에 같은 단위를 적용한다 — "2-3분" 은 120-180초 (한쪽만 환산하면 범위가 뒤집힌다).
  var factor = opts.unit ? aiTimeFactor(s, opts.unit) : 1;
  var lo = Math.round(parseFloat(m[1]) * factor);
  var hi = m[2] ? Math.round(parseFloat(m[2]) * factor) : lo;
  if (hi < lo) hi = lo;                        // 뒤집힌 범위("12-8")는 아래값만
  if (lo < min) lo = min;
  if (hi < lo) hi = lo;
  if (lo > max) lo = max;                      // 병적인 값 방어 (반복 100회·휴식 15분 초과는 이 앱의 범위 밖)
  if (hi > max) hi = max;
  return (lo === hi) ? String(lo) : (lo + '-' + hi);
}

// 정해진 라벨만 통과시킨다(등급·강도·심각도). 목록 밖이면 fallback.
function aiEnum(value, allowed, fallback) {
  return (typeof value === 'string' && allowed.indexOf(value) !== -1) ? value : fallback;
}

// 글자 칸. 글자가 아니면 빈 문자열 — 객체가 들어와 화면에 "[object Object]" 로 찍히는 것을 막는다.
// (숫자는 글자로 바꿔 살린다: 모델이 title 에 숫자 하나만 넣는 경우.)
function aiText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && isFinite(value)) return String(value);
  return '';
}

// 글자 목록(주간 리뷰의 wins·정체기의 recommendations 등). 배열이 아니면 빈 목록,
// 배열이면 글자로 읽히는 칸만 남긴다 — 목록 한 칸이 객체여도 그 줄만 사라지고 화면은 멀쩡하다.
function aiTextList(value) {
  if (!Array.isArray(value)) return [];
  var out = [];
  for (var i = 0; i < value.length; i++) {
    var s = aiText(value[i]);
    if (s) out.push(s);
  }
  return out;
}

var AI_INTENSITY_LEVELS = ['light', 'moderate', 'challenging'];
var AI_GRADES = ['S', 'A', 'B', 'C', 'D'];
var AI_SEVERITIES = ['low', 'medium', 'high'];

// AI 루틴 종목 1건 → 앱이 쓰는 타입.
// ★루틴을 새로 만드는 길(generateFullRoutine)과 대화로 고치는 길(modifyRoutineWithAI)이
//   **같은** 정규화를 쓴다. 예전엔 대화 수정만 이 단계를 통째로 건너뛰어서, 한 번 고치는 순간
//   무게 스냅(실제 기구 단위)도 숫자 강제도 같이 풀렸다.
function normalizeAIExercise(ex) {
  ex = ex || {};
  var name = (typeof ex.name === 'string' && ex.name.trim()) ? ex.name.trim() : '종목';
  var weight = aiNum(ex.weight, null, { min: 0, max: 500 });
  // 어시스트 종목의 보조 0kg(맨몸)은 유효한 값이라 falsy로 버리면 안 된다.
  var hasWeight = (weight !== null) && (weight > 0 || isReverseProgression(name));
  return {
    name: name,
    type: (typeof ex.type === 'string' && ex.type.trim()) ? ex.type.trim() : '보조',
    isMain: !!ex.isMain,
    sets: aiInt(ex.sets, 3, { positive: true, max: 10 }),   // 세트 수만 진짜 숫자다(프롬프트도 "sets":3)
    reps: aiRange(ex.reps, '8-12', { min: 1, max: 100 }),
    weight: hasWeight ? snapWeightToEquipment(weight, name) : null,
    rir: aiRange(ex.rir, 2, { min: 0, max: 10 }),           // RIR 0("실패까지")도 유효한 값이라 min 0
    rest: aiRange(ex.rest, null, { min: 10, max: 900, unit: 'sec' }),   // 초 단위 범위 — restMin 이 "120-180"→"2-3분" 으로 읽는다
    note: (typeof ex.note === 'string') ? ex.note : ''
  };
}

// 루틴 껍데기(종목 배열 밖)의 숫자·라벨 칸. 대상 객체를 제자리에서 고친다.
// fallback 을 null 로 두는 이유: 호출부가 `pr.duration || 기존값` 으로 이어받기 때문 —
// 못 읽은 칸은 비워 둬야 이전 값이 살아남는다.
function normalizeAIRoutineMeta(routine) {
  if (!routine) return routine;
  routine.headline = (typeof routine.headline === 'string') ? routine.headline : '';
  routine.duration = aiInt(routine.duration, null, { positive: true, max: 300, unit: 'min' });
  routine.totalSets = aiInt(routine.totalSets, null, { positive: true, max: 100 });
  routine.intensity = aiEnum(routine.intensity, AI_INTENSITY_LEVELS, null);
  return routine;
}

// AI에게 루틴 수정 요청
async function modifyRoutineWithAI(currentRoutine, userRequest, chatHistory) {
  if (!state.apiKey) return { error: 'API 키가 필요합니다.' };
  
  var context = buildUserContext();
  
  // FREE 모드인지 판단
  var isFree = currentRoutine.isFree || currentRoutine.bodyPart === 'free';
  
  var freeIntro = isFree ?
    '\n\n## ⭐ FREE 모드 (현재 활성)\n' +
    '- 사용자가 "자유 구성"을 선택했습니다.\n' +
    '- 현재 루틴은 비어있거나 사용자 요청대로 구성 중입니다.\n' +
    '- 사용자 요청을 바탕으로 종목을 추가/제거/수정하세요.\n' +
    '- 부위가 명시되지 않으면 사용자 데이터(이번 주 부족한 부위, 1RM 등)를 보고 추천하되, 반드시 확인 받으세요.\n' +
    '- 빈 루틴에 처음 종목을 추가할 때는 6~7개로 완전한 루틴을 구성하세요.\n'
    : '';
  
  // 무게 추천 계산 (1RM 기반)
  var oneRMData = storage.get(KEYS.ONE_RM_DATA, {});
  var routineBalance = analyzeRoutineBalance(currentRoutine.exercises);
  var safetyBlock = buildSafetyPromptBlock();

  var systemPrompt = '당신은 과학적 근거 기반의 피트니스 코치다. ' +
    '운동 루틴 화면에서 사용자가 보낸 메시지를 두 가지 의도로 분기 처리: (1) modify=루틴 수정 (2) question=일반 질문/대화. JSON으로만 응답.\n' +
    freeIntro + '\n' +

    '═════════════════════════════════════\n' +
    '🎯 [데이터] 현재 루틴 자동 분석 (이 데이터 그대로 신뢰)\n' +
    '═════════════════════════════════════\n' +
    formatBalanceAnalysis(routineBalance) + '\n\n' +

    '═════════════════════════════════════\n' +
    '📋 [데이터] 사용자 컨텍스트\n' +
    '═════════════════════════════════════\n' +
    context + '\n' +
    (safetyBlock ? safetyBlock + '\n' : '') +
    buildEquipmentPromptBlock() + '\n' +

    '═════════════════════════════════════\n' +
    '⚙️ [규칙] 의도 판단 + 응답 형식\n' +
    '═════════════════════════════════════\n' +
    
    '## intent 판단\n' +
    '- "modify": 루틴 변경 (추가/제거/교체/무게·세트 조정)\n' +
    '  예) "체스트 프레스 빼줘", "어깨 더", "다시 짜봐", "무게 줄여"\n' +
    '- "question": 운동 지식/이론/방법 질문, 대화\n' +
    '  예) "후방어깨는 당기기?", "RIR이 뭐야?", "왜 이 순서?"\n' +
    '- 모호한 변경 의도 ("별로야", "마음에 안 들어", "다른 거") → Case B (modify + 선택지) 우선\n' +
    '  → 단순 의견 질문("이 종목 좋아?")만 question\n' +
    '- 헷갈리면 question (수정은 확실할 때만 직접 적용)\n\n' +
    
    '## modify 응답 원칙 (가장 중요!)\n' +
    '1. **위 자동 분석 데이터 인용 필수** — reply 첫 문장에 부위별 종목 수 명시\n' +
    '   예: "현재 가슴 3개, 어깨 측면 0개라..."\n' +
    '2. **부족 부위 우선 보충** — 사용자 컨텍스트 "부족 부위" 종목으로 교체 권장\n' +
    '3. **모호 요청 시 옵션 제시** — "별로야" 같은 요청은 1-2-3 선택지로\n' +
    '   이때 changes=[], updatedRoutine=null (확정 안 함)\n' +
    '4. **확실한 요청 시만 updatedRoutine 생성**\n' +
    '5. **종목별 자동 분석 활용**: 한 부위 4개 이상 = 과잉 / 동일 부위·각도 중복 금지\n' +
    '   - **같은 주 중복 회피**: 컨텍스트 "이번 주 이미 수행한 종목"에 있는 종목은 가능하면 추가하지 말고 다른 종목/각도로 새 자극을 준다 (부족 부위·점진적 과부하 우선).\n' +
    '   - **메인 자격 (루틴 생성 규칙과 동일 기준)**: isMain:true(메인 복합)은 종목 풀에 [메인가능]으로 표시된 것 = 자유중량 대형 복합(바벨·덤벨·스미스)과 큰 하체 머신(레그프레스·핵스쿼트)만 해당한다. 머신·케이블 복합·고립은 절대 isMain:true로 두지 말 것(보조).\n' +
    '6. **무게 — 점진적 과부하 우선**\n' +
    '   - "최근 종목별 실제 수행" 표에 데이터 있으면 그 무게 기준 더블 프로그레션 (상단 횟수 2세션 연속 달성 시 +한 칸[덤벨 2kg·그 외 5kg], 미달 시 동일)\n' +
    '   - ⚠️ 어시스트(보조) 종목은 weight가 **보조 무게**라 방향이 반대다: 증량 = 보조 −5kg, 감량 = 보조 +5kg, 하한 0kg(맨몸). 1RM 추정 금지.\n' +
    '   - 사용자가 무게를 낮춘 적이 있으면 그 낮춘 무게가 새 기준선 (1RM 표 무시)\n' +
    '   - 실제 수행 기록 없는 신규 종목만 1RM 추정 사용 (메인 70~80%, 보조 65~75%, 고립 60~70%)\n' +
    '   - 장비 단위로 반올림 (덤벨 2kg·그 외 5kg 배수)\n' +
    '7. **횟수 (type별 필수 가이드 — 루틴 생성 규칙과 동일)**:\n' +
    '   - 메인 복합 (isMain:true): "6-10"\n' +
    '   - 보조 복합 (compound, isMain:false): "8-12"\n' +
    '   - 고립 일반: "10-15"\n' +
    '   - 소근육 고립 (사이드/리어 레터럴 레이즈, 페이스 풀, 푸시다운, 컬류, 카프 레이즈, 힙 어덕션 등): "12-25" (중간~가벼운 무게로 반동 없이 실패 2~3회 전까지)\n' +
    '   ※ 가벼운 무게 다회수 운동을 무겁게 적은 횟수로 추천하지 말 것\n\n' +
    
    '## ❌ 절대 금지\n' +
    '- 자동 분석 무시하고 단일 종목만 평가\n' +
    '- "체스트 프레스 별로" → "인클라인 체스트 프레스로 교체" (같은 부위 재추가 = 무의미)\n' +
    '- 사용자 부족 부위 무시\n' +
    '- 자동 적용된 것처럼 표현 ("수정했어요" X / "어떠세요?" O)\n\n' +
    
    '## 🧬 과학 근거 (인용 시 활용)\n' +
    '- 부위당 주 10~20세트(환산 기준, 20+는 수확 체감이지 금지선 아님) (Pelland 2026) / RIR 0~3, 기본 1~3 — 가벼운 부하일수록 실패 가까이 (Robinson 2024)\n' +
    '- 빈도: 볼륨 같으면 근비대는 주 1회=2회 (Schoenfeld 2019; Pelland 2026), 근력에는 빈도가 유의 — 주 2회는 세트를 나눠 담는 수단\n' +
    '- 신장 위치에서 저항이 실제로 걸리는 종목이 소폭 유리 (2026 메타 ES 0.28; Pedrosa 2026) / 머신=프리웨이트 (Haugen 2023 메타)\n' +
    '- 5~30회 반복 모두 유효 (IUSCA 2021)\n\n' +
    
    '## 응답 형식\n' +
    '### Case A (intent=modify, 확정안 있음)\n' +
    '{\n' +
    '  "intent": "modify",\n' +
    '  "reply": "자동 분석 인용 + 변경안 제안 (1~3문장)",\n' +
    '  "changes": [{"type": "add|remove|replace|modify", "exercise": "종목명", "detail": "변경 내용"}],\n' +
    '  "updatedRoutine": {\n' +
    '    "headline": "한 줄", "duration": 60, "totalSets": 18, "intensity": "moderate",\n' +
    '    "exercises": [{"name":"종목","type":"복합|고립|보조","isMain":bool,"sets":3,"reps":"8-10","weight":150,"rir":"2-3","note":"이유"}]\n' +
    '  }\n' +
    '}\n\n' +
    
    '### Case B (intent=modify, 모호해서 확인 필요)\n' +
    '{\n' +
    '  "intent": "modify",\n' +
    '  "reply": "자동 분석 인용 + 1-2-3 선택지 제시",\n' +
    '  "changes": [],\n' +
    '  "updatedRoutine": null\n' +
    '}\n\n' +
    
    '### Case C (intent=question)\n' +
    '{\n' +
    '  "intent": "question",\n' +
    '  "reply": "답변 (2~5문장, 과학 근거 인용)"\n' +
    '}\n\n' +
    
    '## 현재 루틴 (JSON)\n' +
    JSON.stringify({
      headline: currentRoutine.headline,
      bodyPart: currentRoutine.bodyPart,
      isFree: isFree,
      exercises: currentRoutine.exercises
    }, null, 2);
  
  // 대화 이력 포함
  var messages = chatHistory.slice(-10).map(function(m) {
    return { role: m.role, content: m.content };
  });
  
  // 마지막 사용자 메시지 추가
  messages.push({ role: 'user', content: userRequest });
  
  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        // 4096: 6~7종목 전체 루틴 JSON(이유/note 포함)이 잘리지 않도록 충분히 확보.
        // (2048은 응답 중간 잘림 → JSON 파싱 실패 → 날 JSON 노출 + 적용버튼 사라짐 버그의 원인이었다)
        max_tokens: 4096,
        // 지식 베이스는 고정 블록(cache_control)으로, 루틴 분석·사용자데이터(systemPrompt)는 분기점 뒤
        system: [
          { type: 'text', text: '## 🧬 운동과학 지식 베이스 (루틴·코칭 결정에 활용)\n' + COACH_KNOWLEDGE, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: systemPrompt }
        ],
        messages: messages
      })
    });
    
    if (!response.ok) {
      return { error: 'API 오류 (' + response.status + ')' };
    }
    
    var data = await response.json();
    if (!getResponseText(data)) {
      return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    }
    var content = getResponseText(data);

    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    var parsed = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      var jsonStr = extractBalancedJson(cleaned);
      if (jsonStr) {
        try { parsed = JSON.parse(jsonStr); } catch (e2) { parsed = null; }
      }
    }

    if (!parsed) {
      // JSON 파싱 실패. 응답이 JSON을 의도한 것(=중간에 잘림)이면 날 JSON을 사용자에게 보여주지 않는다.
      // 단, 본문에 우연히 든 중괄호 한 글자(이모지 ':}', 세트표기 '{3~4}' 등)로 진짜 자연어 답변을
      // 끊김으로 오인하지 않도록 좁게 판정한다: '{'로 시작하거나, JSON 전용 키+콜론이 보일 때만.
      var looksLikeJson = cleaned.charAt(0) === '{' ||
        /"(intent|updatedRoutine|exercises|changes|reply)"\s*:/.test(cleaned);
      if (looksLikeJson) {
        return {
          intent: 'question',
          reply: '수정안을 만들다가 응답이 끊긴 것 같아요. 한 번만 더, 조금 더 짧게 말씀해 주시겠어요? (예: "무게 살짝 줄여줘", "어깨 종목 하나 추가")',
          changes: [],
          updatedRoutine: null
        };
      }
      // 진짜 자연어 답변(JSON 흔적 없음)이면 그대로 보여준다.
      return {
        intent: 'question',
        reply: cleaned || '응답을 받지 못했어요. 다시 질문해주세요.',
        changes: [],
        updatedRoutine: null
      };
    }

    // 변경안(updatedRoutine)은 종목이 1개 이상 있을 때만 유효로 친다.
    // 빈/종목없는 변경안을 그대로 통과시키면 [적용하기]를 눌러도 루틴이 비어 있어
    // "운동 시작" 버튼이 계속 비활성으로 남는다(generateFullRoutine 과 동일한 가드).
    var validRoutine = (parsed.updatedRoutine &&
      Array.isArray(parsed.updatedRoutine.exercises) &&
      parsed.updatedRoutine.exercises.length > 0) ? parsed.updatedRoutine : null;

    // 타입 강제를 가드레일보다 **먼저** 건다 — 아래 가드레일이 종목을 교체할 때
    // 이미 접힌 값 위에서 판단하도록(그리고 이 경로가 무게 스냅을 건너뛰지 않도록).
    if (validRoutine) {
      validRoutine.exercises = validRoutine.exercises.map(normalizeAIExercise);
      normalizeAIRoutineMeta(validRoutine);
    }

    // VETO 가드레일: 수정안에 금기 종목이 들어왔으면 교체/제거하고 답변에 알림
    var replyText = (typeof parsed.reply === 'string') ? parsed.reply : '';
    if (validRoutine) {
      var guarded = applySafetyGuardrail(validRoutine.exercises);
      if (guarded.changes.length) {
        validRoutine.exercises = guarded.exercises;
        var changeMsgs = guarded.changes.map(function(c) {
          return c.to ? (c.from + ' → ' + c.to + ' (' + c.areaKr + ' 보호)') : (c.from + ' 제외 (' + c.areaKr + ' 보호)');
        });
        replyText += '\n\n🛡️ 안전 교체: ' + changeMsgs.join(', ');
      }
      // 장비 가드레일 (안전 다음) — 프롬프트를 어기고 없는 기구 종목이 들어왔으면 여기서 교체/제거
      var eqGuarded = applyEquipmentGuardrail(validRoutine.exercises);
      if (eqGuarded.changes.length) {
        validRoutine.exercises = eqGuarded.exercises;
        replyText += '\n\n🏋️ 장비 교체: ' + eqGuarded.changes.map(function(c) {
          return c.to ? (c.from + ' → ' + c.to) : (c.from + ' 제외');
        }).join(', ') + ' (헬스장에 없는 기구)';
      }
      if (!validRoutine.exercises.length) validRoutine = null;
    }

    return {
      intent: parsed.intent || (validRoutine ? 'modify' : 'question'),
      reply: replyText,
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
      updatedRoutine: validRoutine
    };
  } catch (error) {
    return { error: error.message };
  }
}

function buildUserContext(options) {
  options = options || {};
  // options.focusBodyPart: 'push' | 'pull' | 'legs' → 그 부위 1RM만 포함 (토큰 절약)
  var focusBodyPart = options.focusBodyPart || null;
  var profile = state.profile;
  var today = new Date();

  // 최근 4주 운동
  var fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(today.getDate() - 28);
  var recentWorkouts = state.data.workoutLog
    .filter(function(w) { return new Date(w.date) >= fourWeeksAgo; })
    .sort(function(a, b) { return b.date.localeCompare(a.date); });
  
  // 이번 주 운동
  var dayOfWeek = today.getDay() || 7;
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  var mondayStr = getDateStr(monday);
  var thisWeekWorkouts = state.data.workoutLog.filter(function(w) {
    return w.date >= mondayStr;
  });
  
  // 부위별 카운트 (최근 4주)
  var pushCnt = recentWorkouts.filter(function(w) { return w.sessionKr === 'PUSH'; }).length;
  var pullCnt = recentWorkouts.filter(function(w) { return w.sessionKr === 'PULL'; }).length;
  var legsCnt = recentWorkouts.filter(function(w) { return w.sessionKr === 'LEGS'; }).length;
  var upperCnt = recentWorkouts.filter(function(w) { return w.sessionKr === 'UPPER'; }).length;
  
  // 체중 추이
  var bodyLog = state.data.bodyLog || [];
  var currentWeight = bodyLog.length > 0 ? bodyLog[bodyLog.length - 1].weight : profile.weight;
  var weightMonthAgo = bodyLog.length > 14 ? bodyLog[Math.max(0, bodyLog.length - 30)].weight : currentWeight;
  var weightChange = (currentWeight - weightMonthAgo).toFixed(1);
  
  // PR
  var recentPRs = state.data.personalRecords.slice(0, 5);
  
  // 최근 운동 종목별 무게 + 본 세트 반복수 (점진적 과부하 판단용)
  var recentLifts = {};
  recentWorkouts.slice(0, 10).forEach(function(w) {
    var exList = w.exercises || w.exercisesData;
    if (!exList || !Array.isArray(exList)) return;
    exList.forEach(function(ex) {
      if (!ex.name) return;
      var weight = ex.maxWeight !== undefined ? ex.maxWeight : (ex.weight !== undefined ? ex.weight : null);
      // 어시스트 종목의 대표값은 '최대'가 아니라 **최소 보조**(가장 어려웠던 세트)다.
      if (isReverseProgression(ex.name) && ex.setsDetail && Array.isArray(ex.setsDetail)) {
        var av = ex.setsDetail.filter(function(s) {
          return s && !s.isWarmup && !isOffProgressSet(s) && s.reps > 0 && s.weight >= 0;
        }).map(function(s) { return s.weight; });
        if (av.length) weight = Math.min.apply(null, av);
      }
      if (weight === null || weight === undefined) return;

      // 본 세트(워밍업 제외) 반복수 수집
      var repsList = [];
      if (ex.setsDetail && Array.isArray(ex.setsDetail)) {
        ex.setsDetail.forEach(function(s) {
          if (s && !s.isWarmup && s.reps) repsList.push(s.reps);
        });
      } else if (ex.reps !== undefined) {
        repsList.push(ex.reps);
      }

      // 별칭 표기는 표준명으로 합친다 — 같은 운동이 두 줄로 보이면 정체기(plateau) 판정도 갈린다
      var liftKey = canonicalExerciseName(ex.name);
      if (!recentLifts[liftKey]) {
        recentLifts[liftKey] = { weight: weight, date: w.date, history: [], lastReps: repsList };
      }
      recentLifts[liftKey].history.push({ weight: weight, date: w.date, reps: repsList });
    });
  });
  
  // 정체기 감지: 최근 3회 무게 동일 AND 본세트 최고 반복도 안 늚 → plateau
  //   (무게가 같아도 반복이 오르는 중이면 더블 프로그레션 정상 진행이므로 plateau=false)
  Object.keys(recentLifts).forEach(function(name) {
    var hist = recentLifts[name].history.slice(0, 3);  // [0]=최근, [2]=3회 전
    if (hist.length < 3) return;
    var weightSame = hist[0].weight === hist[1].weight && hist[1].weight === hist[2].weight;
    if (!weightSame) return;
    function maxReps(h) {
      return (h.reps && h.reps.length) ? Math.max.apply(null, h.reps) : null;
    }
    var repsNew = maxReps(hist[0]);  // 최근 세션 본세트 최고 반복
    var repsOld = maxReps(hist[2]);  // 3회 전 세션
    // 반복이 오르는 중(최근 > 3회 전)이면 정체 아님. 반복 데이터가 없으면 무게 기준만으로 정체 처리(보수적).
    var repsRising = (repsNew !== null && repsOld !== null && repsNew > repsOld);
    if (!repsRising) recentLifts[name].plateau = true;
  });
  
  // 컨텍스트 문자열 구성
  var pullupRangeStr = profile.pullupRange || '4~8';
  var ctx = '## 사용자 정보\n';
  ctx += '- 나이: ' + profile.age + '세, 키: ' + profile.height + 'cm, 체중: ' + currentWeight + 'kg\n';
  ctx += '- 목표: 린매스 (체지방↓ + 근육↑)\n';
  ctx += '- 경력: 명목상 중급, 실질 초~중급\n';
  ctx += '- 환경: 헬스장 머신/덤벨 위주, 풀업 ' + pullupRangeStr + '개 가능\n';
  // 보유 장비 — 이 한 줄이 buildUserContext를 쓰는 모든 프롬프트(루틴 생성·수정·코치 채팅·오늘의 추천·정체기)에 전파된다.
  ctx += '- 보유 장비 (이 기구로 가능한 종목만 추천할 것): ' + getOwnedEquipmentLabels().join(' · ') + '\n';
  ctx += '- 사이클: ' + profile.currentCycle + '차 / ' + profile.currentWeek + '주차 (' + profile.cyclePhase + ')\n';
  ctx += '- 목표: 주 ' + profile.workoutFreq + '회 운동\n\n';
  
  ctx += '## 이번 주 운동\n';
  if (thisWeekWorkouts.length > 0) {
    ctx += '- ' + thisWeekWorkouts.length + '회 완료 (목표 ' + profile.workoutFreq + '회)\n';
    thisWeekWorkouts.forEach(function(w) {
      var dayName = ['일','월','화','수','목','금','토'][new Date(w.date).getDay()];
      ctx += '  · ' + dayName + ': ' + w.sessionKr + ' (' + w.duration + '분, ' + w.sets + '세트)\n';
    });

    // 이번 주 실제 수행한 종목명 (같은 주 같은 부위 중복 회피용 — 추가 요구사항)
    var thisWeekExNames = [];
    thisWeekWorkouts.forEach(function(w) {
      var exList = w.exercises || w.exercisesData;
      if (!Array.isArray(exList)) return;
      exList.forEach(function(ex) {
        var exCanon = ex && ex.name ? canonicalExerciseName(ex.name) : null;
        if (exCanon && thisWeekExNames.indexOf(exCanon) === -1) thisWeekExNames.push(exCanon);
      });
    });
    if (thisWeekExNames.length > 0) {
      ctx += '- 이번 주 이미 수행한 종목: ' + thisWeekExNames.join(', ') + '\n';
      ctx += '  ⚠️ 같은 주에 같은 부위를 다시 운동할 때는 위 종목과 **다른 종목/각도**를 골라 새로운 자극을 준다 (부족 부위 보충·점진적 과부하는 우선).\n';
    }
  } else {
    ctx += '- 아직 운동 안 함\n';
  }
  ctx += '\n';
  
  ctx += '## 최근 4주 패턴\n';
  ctx += '- 총 ' + recentWorkouts.length + '회 운동\n';
  ctx += '- PUSH: ' + pushCnt + '회, PULL: ' + pullCnt + '회, LEGS: ' + legsCnt + '회, UPPER: ' + upperCnt + '회\n';
  if (Math.abs(parseFloat(weightChange)) > 0) {
    ctx += '- 체중 변화 (1개월): ' + (weightChange > 0 ? '+' : '') + weightChange + 'kg\n';
  }
  ctx += '\n';
  
  // ⭐ 부위별 주간 볼륨 분석 (가장 중요)
  var volumeByPart = getRecentVolumeByPart(2);  // 2주 기준
  var volumeKeys = Object.keys(volumeByPart);
  if (volumeKeys.length > 0) {
    var diagnosis = getVolumeDiagnosis(volumeByPart, 2);
    var groupedVol = groupVolumeBy(volumeByPart);
    
    ctx += '## 부위별 주간 볼륨 분석 (최근 2주 평균, 세트/주, 그룹 합산)\n';
    ctx += '※ 큰 근육(가슴·등·대퇴사두·햄스트링·둔근) 주 10~20세트 / 작은 근육(어깨·이두·삼두·복근) 주 8~16세트가 적정(간접 세트는 이미 0.5로 환산돼 있으니 "복합으로 충분"이라 결론 내리지 말 것 — 팔·측면/후면 어깨·종아리는 직접 세트가 주 4세트 이상 필요). 큰 근육 20+·작은 근육 16+는 수확 체감. 간접(보조근) 세트는 0.5로 합산\n';
    ctx += '※ 가슴 = chest+chest_upper+chest_lower 합산. 어깨 측면/전면/후면 별도. 등 중부 = upper_back+traps.\n';
    
    // 그룹 단위로 표시 (가슴 합산)
    var partVolStrs = [];
    Object.keys(BODY_PART_GROUPS).forEach(function(g) {
      var vol = (groupedVol[g] || 0) / 2;
      if (vol > 0) {
        var isSmall = (BODY_PART_GROUPS[g] && BODY_PART_GROUPS[g].size === 'small');
        var status = isSmall
          ? (vol < 3 ? '🔴' : (vol < 8 ? '🟡' : (vol <= 16 ? '🟢' : '🔥')))
          : (vol < 4 ? '🔴' : (vol < 10 ? '🟡' : (vol <= 20 ? '🟢' : '🔥')));
        partVolStrs.push(status + ' ' + BODY_PART_GROUPS[g].kr + ' ' + vol.toFixed(1));
      }
    });
    if (partVolStrs.length > 0) {
      ctx += partVolStrs.join(' / ') + '\n';
    }
    
    // 폐루프: 부위별 목표(큰 근육 12 / 작은 근육 8, domain diagnosis의 item.target)까지 남은 직접 세트를 함께 제시 → AI가 이번 세션 크기를 격차에 맞춤
    function volNeedNote(v, target) {
      target = target || 12;
      var need = target - v;
      return need > 0 ? (' — 목표 ' + target + '세트까지 ' + (Math.round(need * 10) / 10) + '세트 더') : '';
    }
    if (diagnosis.lacking.length > 0) {
      ctx += '⚠️ **부족 부위 (최우선 보충)**:\n';
      diagnosis.lacking.forEach(function(item) {
        // 보유 장비로 못 하는 종목은 권장에서 뺀다 (장비 표만 고쳐도 추천이 따라오도록 런타임 필터)
        // 이름 뒤 괄호 주석('(이두 보조 자극)')은 떼고 넘긴다 — AI가 그대로 베껴 쓰면
        // 1RM·진행도·통증 조회가 전부 '이름 완전 일치'라 기록이 통째로 빗나간다.
        var recs = (WEAK_PART_EXERCISE_MAP[item.group] || []).map(function(n) {
          return n.replace(/\(.*\)$/, '');
        }).filter(function(n) {
          return isExerciseAvailable(n);
        });
        ctx += '- ' + item.label + volNeedNote(item.vol, item.target);
        if (recs.length > 0) {
          ctx += ' → 권장 종목: ' + recs.slice(0, 3).join(', ');
        }
        ctx += '\n';
      });
    }
    if (diagnosis.belowOptimal && diagnosis.belowOptimal.length > 0) {
      ctx += '🟡 **최적 하한 미달 (여유 있으면 보충)**:\n';
      diagnosis.belowOptimal.forEach(function(item) {
        ctx += '- ' + item.label + volNeedNote(item.vol, item.target) + '\n';
      });
    }
    if (diagnosis.untouched && diagnosis.untouched.length > 0) {
      ctx += '◽ 미접촉(주 0세트, 저우선 참고 — 필요시만 고려): ' + diagnosis.untouched.map(function(e) { return e.label; }).join(', ') + '\n';
    }
    if (diagnosis.excessive.length > 0) {
      ctx += '🔥 **수확 체감 구간 (충분히 함 — 더 안 늘려도 됨, 하드컷 아님)**: ' + diagnosis.excessive.map(function(e) { return e.label; }).join(', ') + '\n';
    }
    ctx += '\n';
  }
  
  if (recentPRs.length > 0) {
    ctx += '## 최근 PR\n';
    recentPRs.forEach(function(pr) {
      if (pr.weight !== undefined && isReverseProgression(pr.exerciseName)) {
        // 어시스트 종목: 숫자가 내려간 것이 신기록이다. 표기를 안 바꾸면 AI가 퇴보로 읽는다.
        ctx += '- ' + pr.exerciseName + ': 보조 ' + pr.previousWeight + 'kg → 보조 ' + pr.weight + 'kg × ' + pr.reps + '회 (보조 감소 = 진행, ' + daysAgo(pr.date) + ')\n';
      } else if (pr.weight) {
        ctx += '- ' + pr.exerciseName + ': ' + pr.previousWeight + 'kg → ' + pr.weight + 'kg × ' + pr.reps + '회 (' + daysAgo(pr.date) + ')\n';
      } else {
        ctx += '- ' + pr.exerciseName + ': ' + (pr.previousReps || 0) + ' → ' + pr.reps + '회 (' + daysAgo(pr.date) + ')\n';
      }
    });
    ctx += '\n';
  }
  
  if (Object.keys(recentLifts).length > 0) {
    // 정체기 종목 별도 추출
    var plateauList = [];
    Object.keys(recentLifts).forEach(function(name) {
      if (recentLifts[name].plateau) plateauList.push(name + ' ' + recentLifts[name].weight + 'kg');
    });
    
    if (plateauList.length > 0) {
      ctx += '## 🔥 정체기 감지 (최근 3회 무게 동일 + 최고 반복도 비상승 — 반복이 오르는 중이면 정상 진행이라 제외)\n';
      ctx += '- ' + plateauList.join(', ') + '\n';
      ctx += '- 권장: +한 칸(덤벨 2kg·그 외 5kg) 도전 또는 종목 변경 / 더블 프로그레션 적용\n\n';
    }
    
    ctx += '## 최근 종목별 실제 수행 (점진적 과부하 기준 — 이 값이 1RM 표보다 우선)\n';
    Object.keys(recentLifts).forEach(function(name) {
      var info = recentLifts[name];
      if (info.weight === null || info.weight === undefined) return;
      var marker = info.plateau ? ' 🔥' : '';
      // 세트 사이 채팅에서 추출된 신호 반영 (3단계 피드백 루프)
      if (hasRecentPain(name, 14)) marker += ' ⚠️최근 통증 보고(증량 금지, 가볍게 또는 대체 고려)';
      else if (getRecentFeel(name, 14) === 'bad') marker += ' 😕자극 나쁨(종목·각도 교체 고려)';
      var repsStr = (info.lastReps && info.lastReps.length) ? ' × ' + info.lastReps.join(',') + '회' : '';
      // 어시스트 종목은 '보조 40kg'으로 적고, 방향이 반대라는 것을 그 줄에서 못 박는다.
      if (isReverseProgression(name)) {
        ctx += '- ' + name + ': 보조 ' + info.weight + 'kg' + repsStr + ' (' + daysAgo(info.date) + ') ⇄보조 무게(낮출수록 증량 — 진행 시 보조를 −5kg)' + marker + '\n';
      } else {
        ctx += '- ' + name + ': ' + info.weight + 'kg' + repsStr + ' (' + daysAgo(info.date) + ')' + marker + '\n';
      }
    });
    ctx += '\n';
  }
  
  // 1RM 데이터 (부위별 그룹화 + 추천 작업 무게 자동 계산)
  // focusBodyPart 옵션 시 그 부위만 표시 (토큰 절약)
  var oneRMData = storage.get(KEYS.ONE_RM_DATA, {});
  var oneRMKeys = Object.keys(oneRMData);
  if (oneRMKeys.length > 0) {
    // 부위 필터 (focusBodyPart 있을 때)
    var partFilter = null;
    if (focusBodyPart) {
      var partKeysByGroup = {
        push: ['chest', 'chest_upper', 'chest_lower', 'shoulders_front', 'shoulders_side', 'triceps'],
        pull: ['lats', 'upper_back', 'traps', 'shoulders_rear', 'biceps'],
        upper: ['chest', 'chest_upper', 'chest_lower', 'shoulders_front', 'shoulders_side', 'triceps', 'lats', 'upper_back', 'traps', 'shoulders_rear', 'biceps'],
        legs: ['quads', 'hamstrings', 'glutes', 'glutes_med', 'calves', 'adductors', 'abs', 'obliques']
      };
      partFilter = partKeysByGroup[focusBodyPart] || null;
    }
    
    ctx += '## 🏋️ 사용자 1RM + 추천 작업 무게' + (focusBodyPart ? ' (' + focusBodyPart.toUpperCase() + ' 부위만)' : ' (부위별)') + '\n';
    ctx += '※ 반복 목표에 맞춘 추정 작업무게(메인 ~75% / 보조 ~68% / 고립 ~62% 1RM), 그 종목 장비 단위로 스냅됨(덤벨 2kg·그 외 5kg). 집단 평균이라 상체·고립은 편차 큼 → 실제로는 목표 RIR로 재보정. **신규 종목에만 사용**, "최근 실제 수행" 있으면 그쪽 우선.\n\n';
    
    // 부위별 자동 그룹화
    var byPart = {};
    oneRMKeys.forEach(function(name) {
      var info = getExercisePart(name);
      if (!info) {
        if (focusBodyPart) return;  // 필터 활성 시 미매핑 제외
        if (!byPart['기타']) byPart['기타'] = [];
        byPart['기타'].push(name);
        return;
      }
      // 부위 필터 적용
      if (partFilter && partFilter.indexOf(info.primary) === -1) return;
      
      var partKr = BODY_PART_KR[info.primary] || info.primary;
      if (!byPart[partKr]) byPart[partKr] = [];
      byPart[partKr].push(name);
    });
    
    Object.keys(byPart).sort().forEach(function(partKr) {
      ctx += '### ' + partKr + '\n';
      byPart[partKr].forEach(function(name) {
        var rm = oneRMData[name];
        var rmDisplay = Math.round(rm);
        var main = snapWeightToEquipment(rm * 0.75, name);
        var sub = snapWeightToEquipment(rm * 0.68, name);
        var iso = snapWeightToEquipment(rm * 0.62, name);
        ctx += '- ' + name + ': 1RM ' + rmDisplay + 'kg → 메인 ' + main + 'kg / 보조 ' + sub + 'kg / 고립 ' + iso + 'kg\n';
      });
    });
    ctx += '\n';
  }
  
  // 컨디션 추이 (최근 5회)
  var conditionLog = state.data.conditionLog || [];
  if (conditionLog.length > 0) {
    var recent5 = conditionLog.slice(0, 5);
    var avgRpe = 0, avgCond = 0, rpeCnt = 0, condCnt = 0;
    recent5.forEach(function(c) {
      if (c.rpe) { avgRpe += c.rpe; rpeCnt++; }
      if (c.condition) { avgCond += c.condition; condCnt++; }
    });
    ctx += '## 컨디션 추이 (최근 ' + recent5.length + '회)\n';
    if (recent5.length < 3) {
      ctx += '※ 표본 부족 (3회 미만) - 추세 판단 보류, 참고용\n';
    }
    if (rpeCnt > 0) {
      var avgRpeNum = avgRpe / rpeCnt;
      var rpeStatus;
      if (recent5.length < 3) {
        rpeStatus = '(참고)';
      } else {
        rpeStatus = avgRpeNum >= 8.5 ? '🔥 매우 높음 (오버트레이닝 위험)' :
                    avgRpeNum >= 7 ? '🟡 도전적' :
                    avgRpeNum >= 5 ? '🟢 적정' : '🔵 가벼움';
      }
      ctx += '- 강도 체감(RPE) 평균: ' + avgRpeNum.toFixed(1) + '/10 ' + rpeStatus + '\n';
    }
    if (condCnt > 0) {
      var avgCondNum = avgCond / condCnt;
      var condStatus;
      if (recent5.length < 3) {
        condStatus = '(참고)';
      } else {
        condStatus = avgCondNum <= 2 ? '🔴 회복 부족 (디로드 권장)' :
                     avgCondNum <= 3 ? '🟡 보통' : '🟢 양호';
      }
      ctx += '- 전반 컨디션 평균: ' + avgCondNum.toFixed(1) + '/5 ' + condStatus + '\n';
    }
    // 최신 1회 detail
    var latest = recent5[0];
    if (latest.rpe || latest.condition) {
      ctx += '- 마지막 세션 (' + latest.date + '): RPE ' + (latest.rpe || '-') + '/10, 컨디션 ' + (latest.condition || '-') + '/5\n';
    }
    ctx += '\n';
  }

  // ── 최신 AI 분석 요약 (묶음3: 코치가 주간리뷰·정체기를 중복 분석 없이 대화에서 인용) ──
  var weeklyReview = storage.get(KEYS.WEEKLY_REVIEW);
  if (weeklyReview && weeklyReview.weekId === getWeekId(new Date())) {
    ctx += '## 📊 이번 주 리뷰 요약 (AI 자동 분석)\n';
    ctx += '- 등급: ' + (weeklyReview.grade || '-') + (weeklyReview.headline ? ' · ' + weeklyReview.headline : '') + '\n';
    if (weeklyReview.wins && weeklyReview.wins.length) ctx += '- 잘한 점: ' + weeklyReview.wins.slice(0, 2).join(', ') + '\n';
    if (weeklyReview.improvements && weeklyReview.improvements.length) ctx += '- 개선점: ' + weeklyReview.improvements[0] + '\n';
    ctx += '\n';
  }
  var plateauCheck = storage.get(KEYS.PLATEAU_CHECK);
  if (plateauCheck && plateauCheck.signals && plateauCheck.signals.length && plateauCheck.detectedAt) {
    var pDays = Math.floor((new Date() - new Date(plateauCheck.detectedAt)) / 86400000);
    if (pDays < 3) {
      ctx += '## 🔥 현재 정체기 신호 (' + pDays + '일 전 감지)\n';
      if (plateauCheck.primary_cause) ctx += '- 주요 원인: ' + plateauCheck.primary_cause + '\n';
      ctx += '- 심각도: ' + (plateauCheck.severity || '-') + ' (' + plateauCheck.signals.length + '개 신호)\n';
      if (plateauCheck.recommendations && plateauCheck.recommendations.length) ctx += '- 권장: ' + plateauCheck.recommendations[0] + '\n';
      ctx += '\n';
    }
  }

  return ctx;
}

// 코치 시스템 프롬프트를 [고정 지식블록, 가변 사용자블록] 두 덩어리로 만든다.
//  - stable: 역할·원칙·지식 베이스·답변규칙 (사용자 데이터 없음 → 호출마다 동일 → prompt caching 적중)
//  - dynamic: 기억 노트 + 사용자 현재 데이터 (매번 바뀜 → 캐시 분기점 뒤)
function buildCoachSystemParts() {
  var stable = '당신은 사용자의 개인 피트니스 코치다. 운동생리학·스포츠과학의 메타분석 근거와 아래 지식 베이스에 기반해 코칭한다.\n\n' +

    '## 코칭 원칙\n' +
    '1. **근거 우선** — 메타분석/원리를 근거로 말한다. 확실하지 않으면 모른다고 밝히고 추측을 단정하지 않는다.\n' +
    '2. **데이터 기반 개인화** — 내 데이터(부족/과잉 부위, 1RM 등)에 관한 질문은 그 데이터를 직접 인용한다.\n' +
    '3. **사용자 환경 존중** — 머신/덤벨 중심. 프리웨이트 강요 금지.\n' +
    '4. **점진적 과부하** — 구체적 수치 (예: 62.5 → 65kg).\n' +
    '5. **훈련 외 주제는 다루지 않는다** — 영양·단백질·칼로리·보충제·식단 질문은 이 앱의 범위 밖이다. 한 문장으로 "훈련 외 주제라 여기서는 다루지 않아요"라고 답하고, 훈련 변수(볼륨·강도·진행·회복)로 돌아온다. 수치나 출처를 지어내지 않는다.\n\n' +

    '## 🧬 지식 베이스 (이 내용을 활용해 충실히 답한다)\n' +
    COACH_KNOWLEDGE + '\n' +

    // 종목 목록이 없으면 코치가 프롬프트에서 본 유일한 종목 이름에 갇힌다 (#5).
    // 장비·별칭이 이미 걸러진 목록이라 여기 있는 이름은 그대로 말해도 안전하다.
    buildExerciseCatalogBlock() + '\n' +

    '## 답변 방식 (질문 유형별 — 중요)\n' +
    '사용자 메시지를 두 종류로 구분해 답한다.\n' +
    '1. **개인 데이터 질문** (내 루틴/볼륨/무게/진도 등 "나"에 관한 것)\n' +
    '   → 아래 "사용자 현재 데이터"를 직접 인용해 개인화한다. 데이터에 없는 내 수치를 지어내지 말 것.\n' +
    '2. **일반 운동 지식 질문** (종목 자세, 부상·통증, 원리 등)\n' +
    '   → 위 지식 베이스와 너의 운동과학 지식으로 충실하고 구체적으로 답한다. 막연한 응원 대신 근거(메타분석/원리)를 들어 설명하고, 확실하지 않은 부분은 불확실하다고 밝힌다.\n' +
    '3. 두 종류가 섞이면 일반 지식으로 원리를 설명한 뒤 사용자 데이터로 개인화한다.\n\n' +

    '## 🎯 개인 데이터 인용 예시\n' +
    '- "이번 주 어깨 측면 주 2.5세트로 부족해요" (부위별 볼륨 인용)\n' +
    '- "1RM 레그프레스 240kg 기준, 작업 무게 168kg 권장" (1RM 인용)\n' +
    '- "체스트프레스 65kg 3회 연속 같음 = 정체기, +5kg 도전" (정체기 활용)\n' +
    '※ "부위별 주간 볼륨"은 그룹 합산(가슴 = chest+chest_upper+chest_lower 등). 그대로 인용 OK.\n\n' +

    '## 답변 등급 (종목·통증 조언 시 — 안전)\n' +
    '- 추천(RECOMMEND): 문제없으면 평소처럼 추천한다.\n' +
    '- 조정(ADJUST): 부상·통증과 얽힌 종목이면 "하되 이렇게 바꿔라" — 그립·각도·가동범위·무게 수정을 구체적으로 제시한다.\n' +
    '- 거부(VETO): 아래 "부상 안전 규칙"의 금기 종목은 사용자가 하겠다고 해도 명확히 거부하고 대체 종목을 제시한다. 얼버무리지 말 것.\n' +
    '- 병원 권고: 날카로운 통증·저림·일상생활에 지장 주는 통증이 계속된다고 하면, 운동 조언 대신 병원 진료를 우선 권한다.\n\n' +

    // 코치는 앱을 직접 못 바꾼다. 이 규칙이 없어서 "쉬는시간 줄였어요" 라고 답해 놓고
    // 실제 운동은 그대로였다(#2). 루틴 수정 화면이 쓰던 규칙과 승인 흐름을 그대로 가져온다.
    '## 설정 변경 요청을 받았을 때 (중요)\n' +
    '너는 앱 설정을 **직접 바꾸지 못한다.** 사용자가 쉬는시간·무게·반복·세트를 바꿔 달라고 하면:\n' +
    '1. "바꿨어요/줄였어요" 처럼 이미 적용된 것처럼 말하지 않는다. "이렇게 바꿔볼까요?" 로 제안한다.\n' +
    '2. 답변 **맨 끝**에 아래 블록을 붙인다. 화면에 [적용] 버튼이 뜨고, 사용자가 누르면 그때 반영된다.\n' +
    '```apply\n' +
    '[{"action":"rest","exercise":"인클라인 덤벨 프레스","value":90}]\n' +
    '```\n' +
    '- action: rest(초, 30~240) · weight(kg) · reps("8-10") · sets(개, 1~10) 네 가지만.\n' +
    '- exercise: 종목 이름. 지금 하고 있는 종목이면 비워도 된다.\n' +
    '- 바꿀 게 없거나 사용자가 그냥 물어본 것이면 이 블록을 붙이지 않는다.\n' +
    '- 이 블록은 사용자에게 안 보인다. 본문에서 무엇을 왜 바꾸는지 따로 말한다.\n\n' +

    '## 응답 스타일\n' +
    '- **길이**: 단순 질문은 2~4문장. 자세·부상·식단 전략처럼 설명이 필요한 질문은 필요한 만큼 충분히(소제목·목록 사용 가능). 묻지 않은 것까지 늘어놓지 말 것.\n' +
    '- **구체**: "더 무겁게" X → "65 → 67.5kg" O.\n' +
    '- **담백하고 전문적**: 군더더기 인사·응원 없이 본론부터. 코치다운 자신감으로 한국어로 답한다.\n' +
    '- 강조는 **굵게**, 운동명은 `백틱`.';

  var safetyBlock = buildSafetyPromptBlock();
  var dynamic = (safetyBlock ? safetyBlock + '\n' : '') +
    buildEquipmentPromptBlock() + '\n' +
    '## 📌 기억 노트 (이 사용자에 대해 장기 기억 — 부상·선호·목표·일정)\n' +
    formatCoachMemoryForPrompt(state.coachMemory) + '\n\n' +
    '## 사용자 현재 데이터\n' +
    buildUserContext();

  return { stable: stable, dynamic: dynamic };
}

// 코치 시스템 프롬프트 (문자열). 캐싱이 필요한 호출은 buildCoachSystemParts()를 직접 쓴다.
function getCoachSystemPrompt() {
  var parts = buildCoachSystemParts();
  return parts.stable + '\n\n' + parts.dynamic;
}

// 코치 API 호출 (대화 이력 포함)
async function callCoachAPI(messages) {
  var apiKey = state.apiKey;
  if (!apiKey) return { error: 'API 키가 설정되지 않았습니다. 더보기 > Anthropic API 키에서 설정해주세요.' };

  // 고정 지식블록은 cache_control로 캐싱, 가변 사용자블록은 분기점 뒤 → 지식을 늘려도 호출 비용↑ 거의 없음
  var coachParts = buildCoachSystemParts();

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        max_tokens: 1024,
        system: [
          { type: 'text', text: coachParts.stable, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: coachParts.dynamic }
        ],
        messages: messages
      })
    });
    
    if (!response.ok) {
      var errorText = await response.text();
      console.error('Coach API error:', response.status, errorText);
      
      if (response.status === 401) return { error: 'API 키가 유효하지 않습니다. 더보기에서 키를 확인해주세요.' };
      if (response.status === 429) return { error: '요청 한도 초과. 잠시 후 다시 시도해주세요.' };
      if (response.status === 400) return { error: '요청 형식 오류. 다시 시도해주세요.' };
      
      return { error: 'API 오류 (' + response.status + '): ' + errorText.substring(0, 100) };
    }
    
    var data = await response.json();
    if (!getResponseText(data)) {
      return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    }
    var text = getResponseText(data);
    
    return { text: text };
  } catch (error) {
    console.error('Coach API 호출 실패:', error);
    return { error: '네트워크 오류: ' + error.message };
  }
}

// ═══════════════════════════════════════════════
// AI 운동 추천 (Sonnet 4.6)
// ═══════════════════════════════════════════════

async function fetchAIRecommendation() {
  if (!state.apiKey) return null;
  
  // 캐시 확인 (오늘 이미 요청했으면 재사용)
  var todayStr = getTodayStr();
  var cached = storage.get(KEYS.AI_RECOMMENDATION);
  if (cached && cached.date === todayStr) {
    return cached;
  }
  
  var context = buildUserContext();

  // 다양성용: 최근 추천 기록 (묶음3)
  var recHistory = storage.get(KEYS.AI_RECOMMENDATION_HISTORY, []);
  var recentRecsNote = recHistory.length
    ? recHistory.slice(-5).map(function(r) { return r.date + ' ' + r.session; }).join(', ')
    : '없음';

  var systemPrompt = '당신은 사용자의 피트니스 코치입니다. 사용자 데이터를 분석해서 오늘 어떤 부위를 운동해야 하는지 추천하세요. ' +
    '반드시 JSON 형식으로만 응답하세요. 추가 설명 없이 JSON만.\n\n' +
    
    '## 🧬 과학적 근거\n' +
    '- 주간 총 세트가 같으면 빈도(주 1회 vs 2회)는 근비대에 무관 (Schoenfeld 2019). 주 2회는 세트를 나눠 담는 수단\n' +
    '- 부위당 주 10~20세트 최적 (Pelland 2024)\n' +
    '- 48~72시간 회복 보장 (큰 근육)\n\n' +
    
    '## 🎯 추천 로직 (이 순서대로 판단)\n' +
    '1. **부족 부위 확인**: 사용자 데이터의 "부족 부위" 리스트 보기\n' +
    '   - 가슴/어깨/삼두 부족 → push 추천\n' +
    '   - 광배/등/이두 부족 → pull 추천\n' +
    '   - 하체/햄스트링/둔근 부족 → legs 추천\n' +
    '2. **이번 주 운동 부위**: 24시간 이내 같은 부위 운동했으면 다른 부위\n' +
    '3. **컨디션 반영** (3회 이상 데이터가 있으면 우선): 평균 RPE ≥ 8.5 또는 컨디션 ≤ 2 → intensity:"light" + caution에 회복 권유\n' +
    '4. **사이클 단계 반영**: 컨텍스트 "사이클 단계"가 "디로드"면 intensity를 "light"로 낮추고 caution에 "회복·부상 예방용 주간"임을 적는다. "빌드" 단계면 컨디션에 따라 moderate~challenging.\n' +
    '5. **수면/회복 신호**: 데이터 부족하면 moderate 안전 권장\n\n' +
    
    '## 응답 형식\n' +
    '{\n' +
    '  "session": "push" | "pull" | "legs" | "upper" | "free",\n' +
    '  "title": "추천 한 줄 (예: 오늘은 PULL이 적절합니다)",\n' +
    '  "reason": "왜 이 부위인지 - 사용자 부족 부위 데이터 인용 필수 (2~3문장)",\n' +
    '  "caution": "주의사항 (1문장, 없으면 빈 문자열)",\n' +
    '  "suggestion": "메인 종목 무게/횟수 제안 (1문장, 사용자의 1RM 기반)",\n' +
    '  "intensity": "light" | "moderate" | "challenging"\n' +
    '}\n\n' +

    '## 🔄 다양성 (최근 추천 회피)\n' +
    '- 최근 추천 기록: ' + recentRecsNote + '\n' +
    '- 위 최근 추천과 같은 부위를 반복하지 마라. 단, 데이터상 부족 부위가 그것뿐이면 재추천 가능(reason에 이유 명시).\n\n' +

    (function() { var sb = buildSafetyPromptBlock(); return sb ? sb + '(suggestion에 금기 종목을 제안하지 말 것)\n\n' : ''; })() +
    '## 사용자 데이터\n' + context;
  
  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          { role: 'user', content: '오늘 어떤 운동을 해야 할까요? 사용자 데이터 기반으로 분석해서 JSON으로만 답하세요.' }
        ]
      })
    });
    
    if (!response.ok) {
      console.error('AI 추천 실패:', response.status);
      return null;
    }
    
    var data = await response.json();
    if (!getResponseText(data)) {
      return null;
    }
    var content = getResponseText(data);
    
    // JSON 추출
    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return null;
      }
    }
    
    // 유효성 검증
    var validSessions = ['push', 'pull', 'legs', 'upper', 'free'];
    if (!validSessions.includes(parsed.session)) {
      console.error('잘못된 session:', parsed.session);
      return null;
    }
    
    var result = {
      session: parsed.session,
      title: aiText(parsed.title),
      reason: aiText(parsed.reason),
      caution: aiText(parsed.caution),
      suggestion: aiText(parsed.suggestion),
      intensity: aiEnum(parsed.intensity, AI_INTENSITY_LEVELS, 'moderate'),
      date: todayStr,
      aiGenerated: true
    };
    
    // 캐시 저장
    storage.set(KEYS.AI_RECOMMENDATION, result);

    // 추천 이력 갱신 (다양성용): 오늘 항목 교체, 최근 7개 유지
    var hist = storage.get(KEYS.AI_RECOMMENDATION_HISTORY, []).filter(function(r) { return r.date !== todayStr; });
    hist.push({ date: todayStr, session: result.session });
    storage.set(KEYS.AI_RECOMMENDATION_HISTORY, hist.slice(-7));

    return result;
  } catch (error) {
    console.error('AI 추천 호출 실패:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════
// 전체 루틴 생성 (STEP 2 - 부위 선택 후)
// 사용자가 부위 선택 → 6~7개 종목으로 구성된 완전한 루틴 생성
// ═══════════════════════════════════════════════
async function generateFullRoutine(bodyPart) {
  if (!state.apiKey) return null;
  
  // FREE 모드는 전체 컨텍스트, PUSH/PULL/LEGS는 해당 부위만 (토큰 절약)
  var context = buildUserContext(bodyPart !== 'free' ? { focusBodyPart: bodyPart } : {});
  
  // 부위별 영문 매핑
  var partInfo = {
    push: { name: 'PUSH', kor: '가슴/어깨/삼두', muscles: '대흉근, 전면/측면 삼각근, 삼두근' },
    pull: { name: 'PULL', kor: '등/이두', muscles: '광배근, 능형근, 후면 삼각근, 이두근' },
    legs: { name: 'LEGS', kor: '하체/코어', muscles: '대퇴사두, 햄스트링, 둔근, 종아리, 코어' },
    upper: { name: 'UPPER', kor: '상체 전체', muscles: '대흉근, 광배근·능형근, 전면/측면/후면 삼각근, 삼두근, 이두근' },
    free: { name: 'FREE', kor: '자유', muscles: '사용자 선택' }
  };
  var info = partInfo[bodyPart];
  
  // 종목 풀 동적 생성 (EXERCISE_BODY_PART_MAP에서 자동 추출)
  function getExercisePoolFor(bp) {
    // shoulders_rear은 PULL 전용 (PUSH 종목 풀에서 제외) - 의도된 분류
    // 가슴/어깨/삼두 = PUSH / 등/후면어깨/이두 = PULL / 하체/코어 = LEGS
    var partKeysByGroup = {
      push: ['chest', 'chest_upper', 'chest_lower', 'shoulders_front', 'shoulders_side', 'triceps'],
      pull: ['lats', 'upper_back', 'traps', 'shoulders_rear', 'biceps'],
      upper: ['chest', 'chest_upper', 'chest_lower', 'shoulders_front', 'shoulders_side', 'triceps', 'lats', 'upper_back', 'traps', 'shoulders_rear', 'biceps'],
      legs: ['quads', 'hamstrings', 'glutes', 'glutes_med', 'calves', 'adductors', 'abs', 'obliques']
    };
    var targetParts = partKeysByGroup[bp] || [];
    var byPart = {};
    var addedNames = {};
    var oneRMData = storage.get(KEYS.ONE_RM_DATA, {});
    
    // 1. EXERCISE_BODY_PART_MAP 종목들
    Object.keys(EXERCISE_BODY_PART_MAP).forEach(function(name) {
      var info = EXERCISE_BODY_PART_MAP[name];
      if (targetParts.indexOf(info.primary) === -1) return;
      if (isAliasExerciseName(name)) return;   // 같은 운동의 별칭 표기 — AI에겐 표준명만 보여준다
      if (!isExerciseAvailable(name)) return;  // 헬스장에 없는 기구 종목은 풀에서 제외

      var partKr = BODY_PART_KR[info.primary] || info.primary;
      if (!byPart[partKr]) byPart[partKr] = [];
      var tags = [];
      if (info.compound) tags.push('복합');
      else tags.push('고립');
      if (info.mainEligible === true) tags.push('메인가능');
      if (info.stretched) tags.push('신장강조');
      if (info.angle) tags.push(info.angle);
      
      // 1RM 정보 추가 (직접 또는 추정)
      // confidence 'medium' 이상만 표시 (low/very_low는 표본 부족으로 신뢰 X)
      var rmInfo = '';
      if (oneRMData[name]) {
        rmInfo = ', 1RM ' + Math.round(oneRMData[name]) + 'kg';
      } else {
        var est = estimate1RMFromPart(name);
        if (est && est.source === 'estimated_from_part' && est.confidence === 'medium') {
          rmInfo = ', 추정 1RM ~' + est.weight + 'kg (' + est.basedOn + ')';
        }
      }
      
      byPart[partKr].push(name + ' [' + tags.join('/') + rmInfo + ']');
      addedNames[name] = true;
    });
    
    // 2. 사용자가 1RM 등록한 종목 중 매핑 외 (퍼지 매칭)
    // 여기는 장비 필터를 걸지 않는다 — 사용자가 실제로 수행해 1RM을 남긴 종목이라 수행 가능이 이미 증명됐다.
    Object.keys(oneRMData).forEach(function(name) {
      if (addedNames[name]) return;
      var info = getExercisePart(name);
      if (!info) return;
      if (targetParts.indexOf(info.primary) === -1) return;
      var partKr = BODY_PART_KR[info.primary] || info.primary;
      if (!byPart[partKr]) byPart[partKr] = [];
      var tags = ['사용자종목'];
      if (info.compound) tags.push('복합');
      else tags.push('고립');
      if (info.mainEligible === true) tags.push('메인가능');
      byPart[partKr].push(name + ' [' + tags.join('/') + ', 1RM ' + Math.round(oneRMData[name]) + 'kg]');
      addedNames[name] = true;
    });
    
    var lines = [];
    Object.keys(byPart).forEach(function(p) {
      lines.push('- ' + p + ': ' + byPart[p].join(', '));
    });
    return lines.join('\n');
  }
  
  // 부상·제약(injury)만 안전 반영 — 선호/목표/일정은 루틴 생성에서 제외
  var injuryMemory = (state.coachMemory || []).filter(function(m) { return m.category === 'injury'; });
  var safetyBlock = buildSafetyPromptBlock();

  var systemPrompt = '당신은 과학적 근거 기반 피트니스 코치다. ' +
    info.name + ' (' + info.kor + ') 루틴 5~6개 종목 생성 (60분 예산 — 규칙 4). JSON으로만 응답.\n' +
    
    '═════════════════════════════════════\n' +
    '📋 [데이터] 사용자 컨텍스트\n' +
    '═════════════════════════════════════\n' +
    context + '\n' +
    (injuryMemory.length ? ('## 🩹 부상·제약 (안전 최우선 — 종목 선택 시 반드시 반영)\n' + formatCoachMemoryForPrompt(injuryMemory) + '\n\n') : '') +
    (safetyBlock ? safetyBlock + '\n' : '') +
    buildEquipmentPromptBlock() + '\n' +

    '═════════════════════════════════════\n' +
    '🏋️ [데이터] ' + info.name + ' 사용 가능 종목 풀 (보유 장비로 가능한 것만 추림)\n' +
    '═════════════════════════════════════\n' +
    getExercisePoolFor(bodyPart) + '\n\n' +
    
    '═════════════════════════════════════\n' +
    '⚖️ [규칙] 루틴 구성 원칙\n' +
    '═════════════════════════════════════\n' +
    
    `## 핵심 원칙 (사용자 데이터 + 근비대 근거)

**1. 안전 최우선 — 부상·제약 회피 (다른 모든 규칙보다 우선)**
- 컨텍스트에 부상·제약(코치 기억) 정보가 있으면: 그 부위·동작에 통증을 주는 종목은 통증 없는 대체 종목으로 바꾼다(예: 어깨 통증 → 통증 나는 프레스 각도 대신 중립 그립·부분 가동범위, 허리 통증 → 척추 부담 큰 종목 대신 지지형 종목).
- 우선순위: 통증 회피 > 부족 부위 보충 > 종목 최적화. 애매하면 안전한 쪽으로.

**2. 부족 부위 우선 + 주간 볼륨 폐루프 (세트 수를 격차에 맞춤)**
- 컨텍스트 "부족 부위(최우선 보충)"와 "🟡 최적 하한 미달"에 나온 부위를 이번 루틴에 우선 포함한다.
- 각 항목 옆의 "목표 N세트까지 N세트 더"를 읽고, 이번 세션의 그 부위 세트 수를 그 격차에 맞춰 정한다(많이 부족할수록 세트를 더, 거의 찼으면 적게). 주간 목표는 부위 크기별로 다르다 — 큰 근육(가슴·등·대퇴사두·햄스트링·둔근) 약 12세트, 작은 근육(어깨·이두·삼두·복근) 약 8세트(목표 차이는 시간 예산 우선순위 때문이지 "복합으로 충분"해서가 아니다 — 간접 세트는 이미 0.5로 환산돼 있다. 측면/후면 어깨·이두·삼두·종아리는 직접 세트가 주 4세트 이상 필요하다).
- 세션당 한 부위 직접 세트는 약 8세트 이하로 둔다(소프트 상한 — 정밀 근거는 아직 약함). 격차가 커서 한 세션에 다 못 넣으면 초과분은 그 주 두 번째 세션으로 분할한다.
- 컨텍스트 "🔥 수확 체감 구간"으로 표시된 부위는 더 늘리지 않는다. 단 이는 절대 상한이 아니라 수확 체감 지점이다(큰 근육 20+·작은 근육 16+, 넘어도 성장이 멈추는 건 아님) — "금지선"처럼 단정하지 말 것.

**3. 다양성 (같은 주 중복 회피)**
- 컨텍스트 "이번 주 이미 수행한 종목"에 있는 종목은 이번 루틴에 다시 넣지 않는다 — 같은 부위라도 다른 종목·각도로 새 자극을 준다. "최근 종목별 실제 수행"과도 가능하면 안 겹치게. (단, 부족 부위 보충·점진적 과부하가 우선)

**4. 종목 수·구성 + 60분 시간 예산 (하드 상한)**
- 부위별 1~3개(4개 이상 = 과잉), 동일 부위·동일 각도 중복 금지.
- 메인 복합 1~2개(isMain: true, type "복합")로 시작한다.
- isMain: true는 종목 풀에 **[메인가능]**으로 표시된 종목만 가능하다(자유중량 대형 복합 + 큰 하체 머신 = 레그프레스·핵스쿼트). 머신·케이블 복합(체스트 프레스·펙덱·시티드 로우·랫풀다운 등)과 고립은 메인이 될 수 없다(isMain:false, 보조).
- **⏱ 60분 예산: 5~6종목 / 워킹 15~18세트가 상한이다. 7종목 이상은 넣지 않는다.**
  종목 1개 실소요(새 휴식 기준 + 종목 이동 90초 포함): 고중량복합 약 12분 / 중강도복합 약 10분 / 고립 약 9분 / 경량고립 약 8분.
  7종목 21세트는 약 66분으로 예산을 넘긴다. 넘칠 것 같으면 부족 부위 우선순위가 낮은 종목부터 뺀다.

**4-1. 세트법·휴식·세트별 무게는 앱이 계산한다 (AI는 정하지 않는다)**
- 너는 **종목·세트 수·반복 범위**만 정하면 된다. 세트법·세트별 무게·휴식 초는 앱이 종목 클래스로 결정론적으로 배정한다.
- 참고로 앱의 기본 배정은 이렇다(설명용 — JSON에 넣지 말 것): 고중량 복합 = 탑세트(가장 무거운 1세트 + 백오프 2세트, 탑의 90%), 나머지 = 스트레이트 3세트.
  즉 고중량 복합에 sets:3을 주면 화면에는 탑 1 + 백오프 2로 펼쳐진다. **sets는 워킹세트 총 개수**를 뜻한다.
  사용자가 종목별로 다른 세트법(피라미드·역피라미드·드롭)을 골라 뒀을 수도 있지만,
  그때도 sets 의 뜻은 같다 — 앱이 그 수만큼 펼친다.
- 응답에 scheme·세트별 무게 배열 같은 필드를 만들지 말 것. 세트법은 코드가 일관되게 정하는 편이 낫다.

**5. 모든 세트 RIR 밴드 명시 (평상시·도전 모드 전부 포함)**
- RIR = 그 세트에서 힘이 다 빠지기 전 남긴 반복 수(0 = 완전 실패).
- 기본 밴드: 복합 = RIR 2~3, 고립·머신 = RIR 0~2(마지막 세트만 0~1). 부하가 가벼울수록 실패에 더 가까이 가야 근비대 자극이 같아진다(Robinson 2024 메타회귀 — 실패 근접도는 근비대에 소폭 유의, 근력엔 무관).
- 무거운 바벨 복합(스쿼트·데드리프트·벤치 등)에는 완전 실패(RIR 0)를 넣지 않는다 — 부상·피로 대비 이득이 없다.
- RIR은 마감 판단용 소프트 기준이지 통과/탈락 게이트가 아니다(자가 보고라 부정확). RIR 4가 나와도 "정크 세트"로 낙인찍지 말고, 다음 세트나 다음 세션에서 반복·무게로 조금씩 당긴다.

**6. 반복 범위 (근비대 중심)**
- 메인 복합: 6~10
- 보조 복합: 8~12
- 고립: 10~15 (사이드/리어 레터럴 레이즈, 페이스풀, 푸시다운, 컬, 카프 레이즈 등 소근육 고립은 12~25 — 아래 6-1)
- 근력 편향 5~8은 쓰지 않는다.

**6-1. 소근육 고립 = 고반복 통제 (실용 권장)**
- 측면·후면 어깨, 종아리, 이두 등 **소근육 고립**은 중간~가벼운 무게로 **12~25회**, 반동 없이 통제해서 실패 2~3회 전까지 수행한다.
- 이유: 근비대는 반복수와 거의 무관하지만, 소근육 고립을 무겁게 실으면 관절·힘줄 부담·승모근 개입·반동으로 타깃 자극이 줄고 부상 위험이 커지므로, 실용적으로 고반복을 기본값으로 둔다("저중량 고반복이 근비대에 더 우월"이라서가 아니다).
- 너무 가볍게(약 30회 초과) 가지 말 것 — 가벼운 세트일수록 반드시 실패 근처까지 민다.
- 이 규칙은 소근육 고립에만 적용한다. 복합운동(스쿼트·벤치 등)엔 적용하지 않는다.

**7. 무게 — 더블 프로그레션 + 실제 수행 우선**
- "최근 종목별 실제 수행" 표가 있으면 그 무게가 시작점이다(1RM 표보다 우선). 사용자가 낮춘 무게가 있으면 그 낮춘 값을 새 기준선으로 쓴다.
- 더블 프로그레션: 먼저 반복을 목표 범위 안에서 올리고, 목표 범위 상단을 종목 종류별 요구 세션 수만큼 연속 달성했을 때만 무게를 장비 단위 한 칸 올린다(8번) — 고중량 복합·경량 고립은 2세션 연속, 중강도 복합·고립은 1세션(앱 계산과 동일). 한 칸이 현재 무게의 10%를 넘는 가벼운 케이블·머신은 무게 대신 반복으로 진행한다.
- 목표 미달이면 같은 무게 유지.
- 신규 종목(실제 수행 기록 없음)만 컨텍스트 "1RM + 추천 작업 무게"의 메인/보조/고립 값을 그대로 쓴다(이미 장비 단위로 스냅됨). 특정 반복 목표로 추정이 필요하면 근사표: 6회≈82% · 8회≈77% · 10회≈73% · 12회≈68% · 15회≈65% (RIR 2~3을 남기고 끝내는 기준의 집단 평균 추정치이지 실패 기준이 아니다. 하체 머신(레그프레스·핵스쿼트·레그컬/익스텐션)은 같은 %에서 반복이 훨씬 많이 나오므로 +8%p — 예: 10회≈81%. 상체·고립은 편차가 커서 첫 세션 후 RIR로 재보정. Nuzzo 2024).
- 1RM도 실제 수행도 없으면 weight: null (사용자가 측정).

**8. ★무게 스냅 — 반드시 장비 단위로 딱 떨어지게**
- 추천 weight는 실행 가능한 값이어야 한다: 덤벨 종목 = 2kg 배수, 그 외(머신·케이블·바벨·스미스) = 5kg 배수. 62.5·47.5kg처럼 못 맞추는 값 금지.
- 실제 수행값이 장비 단위와 안 맞으면 가장 가까운 배수로 맞춘다.
- 증량 폭도 장비 단위 한 칸: 덤벨 +2kg / 그 외 +5kg. (컨텍스트에 "+2.5kg"라고 적혀 있어도 장비 단위로 반올림한다.)
- ⚠️ 어시스트(보조) 종목(어시스트 풀업·어시스트 딥스 등)의 weight는 **보조 무게**다. 증량 = 보조 −5kg(낮출수록 어려워짐), 감량 = 보조 +5kg. 0kg 미만은 없다(0 = 맨몸). 이 종목에는 1RM 추정을 쓰지 말고 "최근 종목별 실제 수행"의 보조 무게에서 출발하라. reason에 무게를 언급할 땐 "보조 35kg"처럼 적는다.
- 머신 5kg는 한 칸이 큰 점프라, 그래서 7번 더블 프로그레션(반복부터 채우고 → 2세션 연속 상단일 때만 +5kg)이 정석이다.

**9. 분할(간접) 세트 보정 + 필수 고립 슬롯**
- 복합운동은 보조근(팔·어깨 등)에 절반 정도(약 0.5세트)만 쌓인다(정밀값 아닌 휴리스틱).
- 따라서 팔(이두·삼두)·측면 어깨·후면 어깨·종아리는 복합만으로는 볼륨이 안 찬다 → 직접 고립 종목을 넣는다.
- 어깨가 들어가는 세션에는 후면 어깨(리어 델트) 고립을 반드시 1개 넣는다(프레스로 대체 불가).

**9-1. 길항근 슈퍼세트 (시간 절약 — 제안만, 강제 금지)**
- 60분 안에 세트를 더 담아야 할 때 쓸 수 있는 유일하게 큰 지렛대다: 세션 시간 약 −37%인데 볼륨 로드·근비대·근력은 전부 동등(Zhang 2025 메타 19연구, Burke 2024 RCT −36%).
- 조건: ① 두 종목의 타깃이 **서로 길항 관계**(가슴↔등, 이두↔삼두, 사두↔햄스트링, 측면어깨↔후면어깨) ② 둘 다 머신·케이블 ③ 최근 통증 기록 없음 ④ 요추 축성 부하가 큰 종목(핵 스쿼트·스탠딩 카프 레이즈 등)은 넣지 않는다.
- 같은 근육을 연달아 쓰는 페어(벤치 → 푸시다운)는 볼륨 로드가 떨어지므로 쓰지 않는다.
- 체감 힘듦(RPE)·대사 스트레스가 유의하게 높으니 **세션당 2페어까지만**.
- 실제 페어링은 앱이 자동으로 잡는다. 너는 note에 "○○와 슈퍼세트 가능" 정도만 적고, 종목 순서에서 두 종목을 가까이 배치하면 된다.

**10. 신장 강조·부위 커버 (소프트 가중, 단정 금지)**
- 부위별로 근육이 늘어난 자세에서 부하가 큰 종목(신장 강조)을 최소 1개 가볍게 우선한다(삼두 = 오버헤드, 햄스트링 = 시티드 레그컬, 종아리 = 스탠딩 등). 풀에 "신장강조" 태그로 표시된다.
- 가슴은 상부(인클라인)+중/하부, 등은 수직(풀다운·풀업)+수평(로우)을 고루 커버한다.
- 단 이건 저비용 헤지(있으면 약간 이득)일 뿐 주 지렛대가 아니다 — "이게 있어야 큰다"는 식으로 과대선전하지 말 것.

**11. 순서 = 메인 고중량 복합을 맨 앞에 (필수)**
- 그 세션에서 가장 무거운 메인 복합 종목(isMain:true — 자유중량 대형 복합과 큰 하체 머신[레그 프레스·핵 스쿼트], 규칙 "메인 자격"과 동일 기준)을 반드시 1~2번째에 배치한다. 신선할 때 해야 무게·반복 수행이 최대가 되고 폼이 지켜지며(특히 허리 보호), 앞에 한 종목이 근력 이득을 더 가져간다(우선순위 원칙 — Nunes 2021).
- 그 다음 순서: 보조 복합 → 고립 → 코어·카프. 약점·강조 부위는 같은 등급 안에서만 앞으로 당긴다(메인 복합보다 앞에 두지 않는다).

**12. 컨디션 반영 (자동 조절)**
- 컨텍스트 "컨디션 추이"로 강도를 조절한다:
  - 평균 RPE ≥ 8.5 또는 컨디션 ≤ 2 = 회복 모드: 볼륨 -20%, RIR을 한두 칸 위로(복합 3~4), intensity "light".
  - 평균 RPE 7~8.4 또는 컨디션 3 = 평상시(위 5번 밴드 그대로), intensity "moderate".
  - 평균 RPE < 7 + 컨디션 4~5 = 도전 가능(밴드 하단까지 밀기), intensity "challenging".
  - 컨디션 데이터 3회 미만 = 표본 부족, 평상시 처리.

**13. 디로드 (주기화 — 피로·부상 관리용)**
- 다음 중 하나면 디로드 처방을 한다: 컨텍스트 사이클 단계가 "디로드"이거나, (정체 신호 — 컨텍스트 "정체" 표시는 4세션·28일 가드를 통과한 것만 — + 컨디션 저하)가 동시일 때.
- 처방: 종목·빈도·무게는 그대로 유지, 세트 수 -40~50%, RIR 3~4(밴드 여유롭게), intensity "light", 5~7일. 완전 휴식이 아니다. 디로드 다음 주는 직전 무게에서 세트를 원래대로 되돌린다.
- 이 감량은 "성장 부스터"가 아니라 누적 피로·관절·부상 회복용이다(디로드가 근성장을 더 늘린다는 직접 근거는 약함). caution에 "회복·부상 예방용 주간"이라고 적는다.

## 🧬 과학 근거 (요지)
- 주간 볼륨이 근비대 1순위 동력, 부위당 주 10~20 환산 세트가 실용 최적(Pelland 2026, Sports Med 67연구; Baz-Valle 2022) — 20+는 수확 체감이지 금지선이 아니다(주 31세트까지 이득 검출). 간접 세트는 0.5로 환산해 이미 더해져 있으므로 작은 근육 목표를 "복합으로 충분"이라며 낮추지 않는다. 측면/후면 어깨·이두·삼두·종아리는 직접 세트가 주 4세트 이상 필요하다(Mannarino 2021; Kassiano 2024). 반대 근거(Steele 2026: 주 9 vs 36 동등)도 있으니 목표 미달을 실패로 말하지 않는다.
- 실패 근접도(RIR)가 근비대에 소폭 유의(근력엔 무관)하나 완전 실패까진 불필요, 부하가 가벼울수록 실패에 가까이(Robinson 2024; Refalo 2023). 5~30회 모두 유효, 6~12회가 효율 스윗스팟(Schoenfeld·Grgic 2021; ACSM 2026 포지션 스탠드는 RIR을 1차 강도 지표로 채택).
- 머신 = 프리웨이트 동등, 국소 비대까지(Haugen 2023 메타; Amanuma 2025). 신장 강조는 "늘어난 위치에서 저항이 실제로 걸릴 때"만 소폭 우위(2026 메타 ES 0.28; Pedrosa 2026 — 효과는 작다). 종목 순서는 총 근비대에 무관(Nunes 2021)하며, 순서를 정하는 이유는 수행·안전이다 — 배치는 규칙 11을 따른다.
- 휴식(앱 기본값): 고중량복합 180초 · 중강도복합 150초 · 고립 120초 · 경량고립 90초 · 재활 60초. 근비대에는 60초 이상이면 충분하고 90초를 넘긴 추가 이득은 확인되지 않았다(Singer 2024 베이지안 메타) — 앱이 길게 쉬는 이유는 근비대가 아니라 다음 세트의 반복 수와 기술을 지키기 위해서다. 직전 세트가 목표 하단을 못 채웠을 때만 +30초.
- 세트법: 볼륨을 맞추면 스트레이트·피라미드·드롭세트의 근비대는 동등하다(Angleri 2017 CSA +7.6/+7.5/+7.8%; Havers 2026 드롭세트 메타 12연구 SMD 0.04). 드롭세트의 이득은 **오직 시간**(30~70% 단축)이고 체감 힘듦·젖산이 크게 오르므로(RPE SMD 1.62) 세션당 1종목까지, 시간 압박이 있을 때만 값어치가 있다.

## ❌ 절대 금지
- 풀에 없는 종목 사용 금지(반드시 위 "사용 가능 종목 풀"에서만 고른다).
- 부상·제약 부위에 통증 주는 종목 사용 금지.
- 한 부위 4개 이상 / 동일 부위·각도 중복 / 메인 0개.
- 실행 불가능한 무게(장비 단위 안 맞는 .5kg 등) 출력 금지.
- 부족 부위 무시 금지.
- RIR·주간 볼륨 상한(큰 근육 20·작은 근육 16)·세션당 8세트를 "탈락 게이트"처럼 단정하지 말 것 — 전부 소프트 기준이다.

## 응답 형식 (JSON만)
{
  "headline": "한 줄 (예: PUSH 후면어깨·삼두 보충)",
  "reason": "왜 (부족 부위·볼륨 격차 인용 필수, 2~3문장)",
  "duration": 60, "totalSets": 18, "intensity": "moderate", "caution": "",
  "exercises": [{"name":"종목","type":"복합|고립|보조","isMain":bool,"sets":3,"reps":"8-10","weight":150,"rir":"2-3","rest":"120-180","note":"이유+근거"}]
}
- 각 exercise에 rest(휴식 초) 필수: 고중량복합 "180", 중강도복합 "150", 고립 "120", 경량고립 "90".
- rir은 밴드 문자열(복합 "2-3", 고립 "0-2").
- weight는 장비 단위 스냅값(덤벨 2kg·그 외 5kg 배수) 또는 null. **세트별 무게는 앱이 계산하므로 하나만 준다**(고중량 복합이면 그게 탑세트 무게가 된다).
- sets는 **워킹세트 총 개수**다(워밍업 제외 — 워밍업도 앱이 클래스별로 붙인다).
- duration은 60분 예산 기준 추정치다. 규칙 4의 종목당 소요로 계산해 60을 넘지 않게 맞춘다.

## 응답 전 체크
☐ 부상·제약 부위에 통증 주는 종목을 회피했나?
☐ 부족 부위를 포함하고 세트 수를 "N세트 더" 격차(큰 근육 12·작은 근육 8 목표)에 맞췄나?
☐ 모든 종목에 reps(메인 6~10 / 보조 8~12 / 고립 10~15 · 소근육 고립 12~25)·rir 밴드·rest를 넣었나?
☐ 모든 weight가 장비 단위(덤벨 2kg·그 외 5kg)로 딱 떨어지나?
☐ isMain:true가 [메인가능] 종목인가? (머신·케이블 복합·고립은 메인 불가)
☐ 팔·측면/후면 어깨·종아리가 있으면 직접 고립을 넣었나? (어깨 세션 = 리어델트 필수)
☐ 신장 강조 1개+? 메인 1~2개? 한 부위 4개 미만?
☐ **5~6종목 / 워킹 15~18세트 안에 들어왔나?** (7종목 = 60분 초과)
☐ scheme·세트별 무게 배열 같은 필드를 만들지 않았나? (세트법·휴식은 앱이 계산)
☐ 풀에 없는 종목은 없나?
☐ 디로드/회복 조건이면 볼륨·RIR을 낮췄나?`;
  
  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        // 4096: 7종목 루틴 + reason/note 가 잘리지 않도록 (2048은 중간 잘림 위험)
        max_tokens: 4096,
        // 지식 베이스는 고정 블록(cache_control)으로, 부위·종목풀·사용자데이터(systemPrompt)는 분기점 뒤
        system: [
          { type: 'text', text: '## 🧬 운동과학 지식 베이스 (루틴·코칭 결정에 활용)\n' + COACH_KNOWLEDGE, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: systemPrompt }
        ],
        messages: [
          { role: 'user', content: info.name + ' 루틴을 만들어주세요. JSON으로만 답하세요.' }
        ]
      })
    });
    
    if (!response.ok) {
      console.error('루틴 생성 실패:', response.status);
      return { error: 'API 오류 (' + response.status + ')' };
    }
    
    var data = await response.json();
    if (!getResponseText(data)) {
      return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    }
    var content = getResponseText(data);
    
    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    var parsed = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      var jsonStr = extractBalancedJson(cleaned);
      if (jsonStr) { try { parsed = JSON.parse(jsonStr); } catch (e2) { parsed = null; } }
    }
    if (!parsed) return { error: 'AI 응답을 이해하지 못했어요. 다시 시도해주세요.' };

    if (!Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
      return { error: '종목 목록이 없습니다' };
    }

    var mappedExercises = parsed.exercises.map(normalizeAIExercise);

    // VETO 가드레일: AI가 프롬프트를 어기고 금기 종목을 넣었어도 여기서 교체/제거
    var guarded = applySafetyGuardrail(mappedExercises);
    if (!guarded.exercises.length) {
      return { error: '부상 안전 필터로 모든 종목이 제외됐어요. 다시 시도해주세요.' };
    }
    var cautionText = aiText(parsed.caution);
    // 가드레일이 종목을 바꾼 사실은 **caution 과 분리해서** 담는다.
    // 예전엔 caution 문자열에 이어 붙였는데, 화면에서 주의사항 박스를 걷자 "앱이 내 루틴을
    // 이렇게 바꿨다"는 알림까지 조용히 같이 사라졌다. 이건 AI 의 조언이 아니라 앱의 행동이라
    // 사용자가 반드시 알아야 한다.
    var swapNotes = [];
    if (guarded.changes.length) {
      var changeMsgs = guarded.changes.map(function(c) {
        return c.to ? (c.from + ' → ' + c.to + ' (' + c.areaKr + ' 보호)') : (c.from + ' 제외 (' + c.areaKr + ' 보호)');
      });
      swapNotes.push('안전 교체: ' + changeMsgs.join(', '));
    }
    // 장비 가드레일 (안전 다음) — 풀에 없는 미보유 기구 종목이 응답에 섞여 들어왔으면 여기서 교체/제거
    var eqGuarded = applyEquipmentGuardrail(guarded.exercises);
    if (!eqGuarded.exercises.length) {
      return { error: '보유 장비 필터로 모든 종목이 제외됐어요. 다시 시도해주세요.' };
    }
    guarded.exercises = eqGuarded.exercises;
    if (eqGuarded.changes.length) {
      swapNotes.push('장비 교체: ' + eqGuarded.changes.map(function(c) {
        return c.to ? (c.from + ' → ' + c.to) : (c.from + ' 제외');
      }).join(', ') + ' (헬스장에 없는 기구)');
    }

    // e.sets 는 normalizeAIExercise 를 지나 항상 숫자다 — 이 합계가 문자열 이어붙이기로 변하지 않는다.
    var setsSum = guarded.exercises.reduce(function(s, e) { return s + e.sets; }, 0);

    return {
      bodyPart: bodyPart,
      headline: (typeof parsed.headline === 'string' && parsed.headline.trim()) ? parsed.headline : (info.name + ' 루틴'),
      reason: (typeof parsed.reason === 'string') ? parsed.reason : '',
      duration: aiInt(parsed.duration, 60, { positive: true, max: 300, unit: 'min' }),
      totalSets: aiInt(parsed.totalSets, setsSum, { positive: true, max: 100 }),
      intensity: aiEnum(parsed.intensity, AI_INTENSITY_LEVELS, 'moderate'),
      caution: cautionText,
      swaps: swapNotes,          // 앱이 바꾼 종목 — 2단계가 이 줄만 따로 그린다
      exercises: guarded.exercises,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('루틴 생성 호출 실패:', error);
    return { error: error.message };
  }
}

// 홈 화면 진입 시 오늘의 추천 로드 (백그라운드) — 캐시가 KST 날짜 기준이라 자동 호출은 하루 1회
async function loadAIRecommendationIfNeeded() {
  if (!state.apiKey) {
    state.aiRecommendation = null;
    return;
  }
  
  // 이미 로딩 중이거나 오늘 캐시 있으면 스킵
  if (state.aiRecLoading) return;
  
  var todayStr = getTodayStr();
  var cached = storage.get(KEYS.AI_RECOMMENDATION);
  if (cached && cached.date === todayStr) {
    state.aiRecommendation = cached;
    return;
  }

  // 오늘 이미 실패했으면 자동 재시도하지 않는다.
  // fetchAIRecommendation은 실패 시 null만 돌려주고 아무것도 캐시하지 않으므로,
  // 이 잠금이 없으면 render()마다 API를 다시 부른다. 재시도는 새로고침 버튼으로만.
  if (state.aiRecFailedDate === todayStr) return;

  // 앱을 켜둔 채 KST 자정을 넘겼으면 어제 추천은 버린다
  if (state.aiRecommendation && state.aiRecommendation.date !== todayStr) {
    state.aiRecommendation = null;
  }
  
  state.aiRecLoading = true;
  render();
  
  var rec = await fetchAIRecommendation();
  state.aiRecommendation = rec;
  // 실패(null)면 오늘은 자동 재시도 금지 — 성공하면 잠금 해제.
  // localStorage에도 남긴다: 메모리에만 두면 새로고침·서비스워커 갱신 때마다 잠금이 풀려
  // 실패가 반복될 때 앱을 열 때마다 유료 호출이 한 번씩 더 나간다.
  state.aiRecFailedDate = rec ? null : todayStr;
  storage.set(KEYS.AI_REC_FAILED_DATE, state.aiRecFailedDate);
  state.aiRecLoading = false;
  render();
}

// 이번 주 데이터 수집
function collectWeekData() {
  var today = new Date();
  var dayOfWeek = today.getDay() || 7;
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  var weekWorkouts = state.data.workoutLog.filter(function(w) {
    var d = new Date(w.date);
    return d >= monday && d <= sunday;
  });
  
  var weekPRs = state.data.personalRecords.filter(function(p) {
    var d = new Date(p.date);
    return d >= monday && d <= sunday;
  });
  
  // 체중 변화
  var weekBodyLogs = (state.data.bodyLog || []).filter(function(b) {
    var d = new Date(b.date);
    return d >= monday && d <= sunday;
  });
  var startWeight = weekBodyLogs.length > 0 ? weekBodyLogs[0].weight : state.profile.weight;
  var endWeight = weekBodyLogs.length > 0 ? weekBodyLogs[weekBodyLogs.length - 1].weight : state.profile.weight;
  var weightChange = (endWeight - startWeight).toFixed(2);
  
  return {
    monday: getDateStr(monday),
    sunday: getDateStr(sunday),
    workouts: weekWorkouts,
    workoutCount: weekWorkouts.length,
    pushCount: weekWorkouts.filter(function(w) { return w.sessionKr === 'PUSH'; }).length,
    pullCount: weekWorkouts.filter(function(w) { return w.sessionKr === 'PULL'; }).length,
    legsCount: weekWorkouts.filter(function(w) { return w.sessionKr === 'LEGS'; }).length,
    freeCount: weekWorkouts.filter(function(w) { return w.sessionKr === 'FREE'; }).length,
    upperCount: weekWorkouts.filter(function(w) { return w.sessionKr === 'UPPER'; }).length,
    prs: weekPRs,
    weightChange: parseFloat(weightChange),
    startWeight: startWeight,
    endWeight: endWeight
  };
}

// 주간 리뷰 생성
async function generateWeeklyReview(forceRefresh) {
  if (!state.apiKey) return null;
  
  var weekData = collectWeekData();
  var weekId = getWeekId(new Date());
  
  // 캐시 확인
  if (!forceRefresh) {
    var cached = storage.get(KEYS.WEEKLY_REVIEW);
    if (cached && cached.weekId === weekId) {
      return cached;
    }
  }
  
  var profile = state.profile;
  var dayMap = ['일','월','화','수','목','금','토'];
  
  var weekSummary = '## 이번 주 데이터 (' + weekData.monday + ' ~ ' + weekData.sunday + ')\n\n';
  
  weekSummary += '### 운동\n';
  weekSummary += '- 총 ' + weekData.workoutCount + '회 (목표 ' + profile.workoutFreq + '회)\n';
  weekSummary += '- PUSH: ' + weekData.pushCount + '회, PULL: ' + weekData.pullCount + '회, LEGS: ' + weekData.legsCount + '회, FREE: ' + weekData.freeCount + '회, UPPER: ' + weekData.upperCount + '회\n';
  if (weekData.workouts.length > 0) {
    weekData.workouts.forEach(function(w) {
      var d = new Date(w.date);
      weekSummary += '  · ' + dayMap[d.getDay()] + ': ' + w.sessionKr + ' (' + w.duration + '분, ' + w.sets + '세트)\n';
    });
  }
  weekSummary += '\n### 체중\n';
  weekSummary += '- 시작: ' + weekData.startWeight + 'kg → 종료: ' + weekData.endWeight + 'kg (' + (weekData.weightChange > 0 ? '+' : '') + weekData.weightChange + 'kg)\n';
  if (weekData.prs.length > 0) {
    weekSummary += '\n### PR (' + weekData.prs.length + '개)\n';
    weekData.prs.forEach(function(p) {
      if (p.weight !== undefined && isReverseProgression(p.exerciseName)) {
        weekSummary += '- ' + p.exerciseName + ': 보조 ' + p.previousWeight + 'kg → 보조 ' + p.weight + 'kg × ' + p.reps + '회 (보조 감소 = 진행)\n';
      } else if (p.weight) {
        weekSummary += '- ' + p.exerciseName + ': ' + p.previousWeight + 'kg → ' + p.weight + 'kg × ' + p.reps + '회\n';
      } else {
        weekSummary += '- ' + p.exerciseName + ': ' + (p.previousReps || 0) + ' → ' + p.reps + '회\n';
      }
    });
  }
  
  // 부위별 볼륨 분석 (이번 주만)
  var weeklyVolByPart = {};
  if (weekData.workouts) {
    weekData.workouts.forEach(function(w) {
      if (!w.exercises || !Array.isArray(w.exercises)) return;
      w.exercises.forEach(function(ex) {
        var info = getExercisePart(ex.name);
        if (!info) return;
        var setCount = 0;
        if (typeof ex.setsCount === 'number') setCount = ex.setsCount;
        else if (typeof ex.sets === 'number') setCount = ex.sets;
        else if (Array.isArray(ex.setsDetail)) setCount = countWorkingSets(ex.setsDetail); // 연장 세트(드롭 등) 제외
        else if (Array.isArray(ex.sets)) setCount = countWorkingSets(ex.sets);
        if (setCount === 0) return;
        weeklyVolByPart[info.primary] = (weeklyVolByPart[info.primary] || 0) + setCount;
        if (info.secondary) info.secondary.forEach(function(s) {
          weeklyVolByPart[s] = (weeklyVolByPart[s] || 0) + setCount * 0.5;
        });
      });
    });
  }
  
  // 부위 볼륨 텍스트 추가 (그룹 합산 적용)
  var volKeys = Object.keys(weeklyVolByPart);
  if (volKeys.length > 0) {
    var weekGrouped = groupVolumeBy(weeklyVolByPart);
    weekSummary += '\n### 부위별 볼륨 (이번 주, 세트, 그룹 합산)\n';
    var groupKeys = Object.keys(weekGrouped).sort(function(a, b) { return weekGrouped[b] - weekGrouped[a]; });
    groupKeys.forEach(function(g) {
      var vol = weekGrouped[g];
      // 부위 크기별 임계 (큰 근육 10~20 / 작은 근육 8~16) — buildUserContext와 동일 기준
      var isSmallG = BODY_PART_GROUPS[g] && BODY_PART_GROUPS[g].size === 'small';
      var loV = isSmallG ? 3 : 4;
      var mevV = isSmallG ? 8 : 10;
      var optV = isSmallG ? 16 : 20;
      // 라벨은 buildUserContext(:451, :460)와 같은 말을 쓴다 — 같은 앱의 두 프롬프트가 다른 말을 하면 안 된다.
      // 'MEV'는 검증된 용어가 아니고(Israetel 외 자비출판 휴리스틱, 경계값을 검증한 동료심사 연구 없음),
      // 상한 초과도 "손해"가 아니라 이득 증가폭이 완만해지는 구간이다(Pelland 2025 — 꺾이는 지점 미확인).
      var status = vol < loV ? '🔴 부족' : (vol < mevV ? '🟡 하한 미달' : (vol <= optV ? '🟢 적정' : '🔥 이득 완만'));
      weekSummary += '- ' + BODY_PART_GROUPS[g].kr + ': ' + vol.toFixed(1) + '세트 (' + status + ')\n';
    });
  }
  
  // 이번 주 컨디션 추이
  var weekStart = new Date(weekData.monday + 'T00:00:00');
  var weekConditions = (state.data.conditionLog || []).filter(function(c) {
    return new Date(c.date) >= weekStart;
  });
  if (weekConditions.length > 0) {
    var avgRpe = 0, avgCond = 0, rpeCnt = 0, condCnt = 0;
    weekConditions.forEach(function(c) {
      if (c.rpe) { avgRpe += c.rpe; rpeCnt++; }
      if (c.condition) { avgCond += c.condition; condCnt++; }
    });
    weekSummary += '\n### 컨디션 (' + weekConditions.length + '회 기록)\n';
    if (rpeCnt > 0) weekSummary += '- 강도 체감(RPE) 평균: ' + (avgRpe / rpeCnt).toFixed(1) + '/10\n';
    if (condCnt > 0) weekSummary += '- 전반 컨디션 평균: ' + (avgCond / condCnt).toFixed(1) + '/5\n';
  }
  
  var systemPrompt = '당신은 사용자의 피트니스 코치입니다. 이번 주 운동/체중 데이터를 분석해 주간 리뷰를 작성하세요. ' +
    '반드시 JSON으로만 응답하세요.\n\n' +
    
    '## 🧬 평가 기준 (과학 근거)\n' +
    '- **운동 빈도**: 주간 총 세트가 같으면 빈도는 근비대에 무관 (Schoenfeld 2019, 25개 연구; Pelland 2026), 근력에는 유의. 주 2회 분할은 세트를 나눠 담는 수단이므로, 주 1회로 몰렸을 때만 세션당 부위 세트 수를 지적한다. 사용자의 주 5일 습관을 깎는 방향으로 쓰지 않는다\n' +
    '- **부위 볼륨**: 큰 근육(가슴·등·다리·둔근) 주 10~20세트 / 작은 근육(팔·어깨) 주 8~16세트 적정 (Pelland 2026, 간접세트 0.5 환산). 간접 세트는 이미 환산돼 있으니 "팔은 복합으로 충분"이라고 쓰지 말 것 — 팔·측면/후면 어깨·종아리는 직접 세트가 주 4세트 이상 필요. 하한 미만 = 부족, 상한 초과 = 수확 체감(금지선 아님)\n' +
    '- **부위 균형**: PUSH/PULL/LEGS 골고루. 한 부위에만 몰리지 않게.\n' +
    '- **PR 갱신**: 점진적 과부하 성과 지표. 어시스트(보조) 종목의 PR은 **보조 무게가 줄어든 것**이다(보조 40kg→35kg = 신기록). 숫자가 내려갔다고 퇴보로 쓰지 말 것\n\n' +
    
    '## 등급 기준\n' +
    '- S: 운동 빈도 달성 + 부위 균형 + PR 갱신 있음\n' +
    '- A: 운동 빈도 달성 + 부위 균형\n' +
    '- B: 운동 빈도 70%+\n' +
    '- C: 부분 달성 (40~60%)\n' +
    '- D: 거의 미실행 (40% 미만)\n\n' +
    
    '## 응답 형식\n' +
    '{\n' +
    '  "headline": "이번 주 핵심 한 줄 (예: 운동 빈도 좋았으나 어깨 측면 부족)",\n' +
    '  "grade": "S" | "A" | "B" | "C" | "D",\n' +
    '  "wins": ["잘한 점 1 (구체적 수치 인용)", "잘한 점 2", "잘한 점 3"],\n' +
    '  "improvements": ["개선점 1 (구체적 부위/수치)", "개선점 2"],\n' +
    '  "nextWeek": ["다음 주 조정 1 (예: 어깨 측면 주 +4세트 추가)", "다음 주 조정 2", "다음 주 조정 3"],\n' +
    '  "coachNote": "이번 주 데이터에서 가장 중요한 한 가지 짚기 (수치 인용, 응원·미사여구 없이 한두 문장)"\n' +
    '}\n\n' +
    
    '## 사용자 프로필\n' +
    '- ' + profile.age + '세, ' + profile.height + 'cm, 목표: 린매스\n' +
    '- 목표: 주 ' + profile.workoutFreq + '회 운동\n' +
    '- 사이클: ' + profile.currentCycle + '차 / ' + profile.currentWeek + '주차 (' + profile.cyclePhase + ')\n' +
    // 이 함수만 buildUserContext를 쓰지 않아 장비 정보가 없다 → 여기서 직접 넣는다.
    '- 보유 장비: ' + getOwnedEquipmentLabels().join(' · ') + ' (nextWeek 조정에 없는 기구 종목을 제안하지 말 것)\n\n' +
    (function() { var sb = buildSafetyPromptBlock(); return sb ? sb + '(nextWeek 조정에 금기 종목을 제안하지 말 것)\n\n' : ''; })() +
    weekSummary;
  
  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        max_tokens: 1500,
        // 주간 리뷰는 주 1회 호출이라 캐싱 효과 없음 → 지식 주입만(품질↑), cache_control 미적용
        system: '## 🧬 운동과학 지식 베이스 (주간 리뷰 평가에 활용)\n' + COACH_KNOWLEDGE + '\n\n' + systemPrompt,
        messages: [
          { role: 'user', content: '이번 주 데이터를 분석해서 리뷰를 JSON으로 작성하세요.' }
        ]
      })
    });
    
    if (!response.ok) {
      console.error('주간 리뷰 실패:', response.status);
      return null;
    }
    
    var data = await response.json();
    if (!getResponseText(data)) {
      return null;
    }
    var content = getResponseText(data);
    
    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return null;
      }
    }
    
    var result = {
      weekId: weekId,
      monday: weekData.monday,
      sunday: weekData.sunday,
      headline: aiText(parsed.headline),
      grade: aiEnum(parsed.grade, AI_GRADES, 'B'),
      wins: aiTextList(parsed.wins),
      improvements: aiTextList(parsed.improvements),
      nextWeek: aiTextList(parsed.nextWeek),
      coachNote: aiText(parsed.coachNote),
      stats: {
        workoutCount: weekData.workoutCount,
        weightChange: weekData.weightChange,
        prCount: weekData.prs.length
      },
      generatedAt: new Date().toISOString()
    };
    
    storage.set(KEYS.WEEKLY_REVIEW, result);
    return result;
  } catch (error) {
    console.error('주간 리뷰 호출 실패:', error);
    return null;
  }
}

// 주간 리뷰 표시 여부 (일요일이거나 새 주차)
function shouldShowWeeklyReview() {
  if (!state.apiKey) return false;
  
  var today = new Date();
  var dayOfWeek = today.getDay(); // 0=일, 6=토
  
  // 일요일이면 항상 표시
  if (dayOfWeek === 0) return true;
  
  // 또는 현재 주 리뷰가 캐시에 있으면 표시
  var cached = storage.get(KEYS.WEEKLY_REVIEW);
  if (cached && cached.weekId === getWeekId(today)) return true;
  
  return false;
}

// 주간 리뷰 자동 로드
async function loadWeeklyReviewIfNeeded() {
  if (!shouldShowWeeklyReview()) return;
  if (state.weeklyReviewLoading) return;
  
  var weekId = getWeekId(new Date());
  var cached = storage.get(KEYS.WEEKLY_REVIEW);
  if (cached && cached.weekId === weekId) {
    state.weeklyReview = cached;
    return;
  }
  
  // 일요일이면 자동 생성
  var dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) {
    state.weeklyReviewLoading = true;
    render();
    
    var review = await generateWeeklyReview();
    state.weeklyReview = review;
    state.weeklyReviewLoading = false;
    render();
  }
}

// ═══════════════════════════════════════════════
// 정체기 감지 (Sonnet 4.6)
// ═══════════════════════════════════════════════

// ── 정체 판정 기준 ─────────────────────────────────────────
// 1RM 검사–재검사 변동계수(CV) 중앙값이 4.2%인데(Grgic 2020, Sports Med Open 6:31),
// 비선수 중급자의 현실적 e1RM 증가폭은 주당 0.25~1%다. 즉 2주치(0.5~2%)는 측정 잡음보다 작아
// "정체"와 "정상 진행"을 원리상 구분할 수 없다 → 최소 세션 수·최소 기간 가드를 둔다.
// ※ "몇 세션 정체하면 진짜 정체"에 대한 직접적인 RCT 기준은 존재하지 않는다.
//    아래 값은 측정학 원칙에서 도출한 보수적 기준이지 연구 결과가 아니다.
var PLATEAU_MIN_SESSIONS = 4; // 종목당 최소 세션 수 (이 미만이면 판정 자체를 금지)
var PLATEAU_MIN_DAYS = 28;    // 종목당 최소 관찰 기간(일)
var PLATEAU_WINDOW_DAYS = 42; // 관찰 창(일) — 이 안의 기록만 본다 (6주)

// "무게도 반복도 안 오르는" 종목 목록.
// 더블 프로그레션(무게 고정 + 반복 상승)은 정상 진행이므로 정체로 세지 않는다 —
// buildUserContext의 recentLifts[].plateau와 같은 발상이되, 여기엔 표본·기간 가드를 추가로 건다.
function getStalledLifts() {
  var log = (state.data && state.data.workoutLog) || [];
  var windowStart = getDateStr(new Date(Date.now() - PLATEAU_WINDOW_DAYS * 86400000));
  var byName = {};

  // 한 묶음(앞/뒤 절반) 안의 최고치 — 한 세션 컨디션 난조로 판정이 뒤집히지 않게 한다
  function bestOf(list, field) {
    var b = 0;
    for (var n = 0; n < list.length; n++) {
      if (list[n][field] > b) b = list[n][field];
    }
    return b;
  }
  // 역방향(어시스트) 전용 — 값이 **작을수록** 좋은 지표의 최솟값.
  function leastOf(list, field) {
    var m = null;
    for (var n = 0; n < list.length; n++) {
      if (m === null || list[n][field] < m) m = list[n][field];
    }
    return m === null ? Infinity : m;
  }

  for (var i = 0; i < log.length; i++) {
    var w = log[i];
    if (!w.date || w.date < windowStart) continue; // 관찰 창 밖
    var exList = w.exercises || w.exercisesData;
    if (!exList || !Array.isArray(exList)) continue;
    for (var j = 0; j < exList.length; j++) {
      var ex = exList[j];
      if (!ex.name) continue;
      var weight = ex.maxWeight !== undefined ? ex.maxWeight : (ex.weight !== undefined ? ex.weight : null);
      // 어시스트 종목은 '가장 무거운 세트'가 곧 '가장 많이 도움받은 세트'다. 진행을 나타내는 값은
      // 세션 최소 보조 무게이므로 여기서 뒤집어 담는다 — 안 그러면 보조를 줄여도 정체로 잡힌다.
      if (isReverseProgression(ex.name)) {
        var assistVals = [];
        if (ex.setsDetail && Array.isArray(ex.setsDetail)) {
          for (var a = 0; a < ex.setsDetail.length; a++) {
            var sd = ex.setsDetail[a];
            if (sd && !sd.isWarmup && !isOffProgressSet(sd) && sd.reps > 0 && sd.weight >= 0) assistVals.push(sd.weight);
          }
        } else if (Array.isArray(ex.weights)) {
          assistVals = ex.weights.filter(function(v) { return typeof v === 'number' && v >= 0; });
        }
        if (assistVals.length) weight = Math.min.apply(null, assistVals);
      }
      if (weight === null || weight === undefined) continue;

      // 본 세트(워밍업 제외) 최고 반복
      var topReps = 0;
      if (ex.setsDetail && Array.isArray(ex.setsDetail)) {
        for (var k = 0; k < ex.setsDetail.length; k++) {
          var s = ex.setsDetail[k];
          if (s && !s.isWarmup && s.reps && s.reps > topReps) topReps = s.reps;
        }
      } else if (ex.reps) {
        // 옛 기록은 reps가 배열([8,10,12])이거나 문자열일 수 있다.
        // 위 setsDetail 분기와 같은 의미가 되려면 **최댓값**을 써야 한다 —
        // 첫 세트만 보면 세션 안에서 반복을 올린 사용자([8,8,8] → [8,10,12])가
        // 둘 다 8로 읽혀 "반복도 안 오름" = 정체로 오판된다(더블 프로그레션 정상 진행인데).
        var repsArr = Array.isArray(ex.reps) ? ex.reps : [ex.reps];
        for (var r = 0; r < repsArr.length; r++) {
          var rv = parseInt(repsArr[r], 10) || 0;
          if (rv > topReps) topReps = rv;
        }
      }

      // 별칭 표기('랫풀다운')와 표준명('랫 풀 다운')이 한 종목으로 모이게 표준명을 키로 쓴다 —
      // 갈리면 세션 수·관찰 기간 가드에 걸려 진짜 정체를 영영 못 잡는다.
      var stallKey = canonicalExerciseName(ex.name);
      if (!byName[stallKey]) byName[stallKey] = [];
      byName[stallKey].push({ date: w.date, weight: weight, reps: topReps });
    }
  }

  var stalled = [];
  Object.keys(byName).forEach(function(name) {
    var hist = byName[name].sort(function(a, b) {
      return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
    });
    if (hist.length < PLATEAU_MIN_SESSIONS) return; // 표본 부족 → 판정 금지
    var spanDays = (new Date(hist[hist.length - 1].date) - new Date(hist[0].date)) / 86400000;
    if (spanDays < PLATEAU_MIN_DAYS) return;        // 기간 부족 → 판정 금지
    var half = Math.floor(hist.length / 2);
    var oldHalf = hist.slice(0, half);
    var newHalf = hist.slice(hist.length - half);
    // 어시스트 종목은 '진행 = 보조 감소'라 부등호가 반대다 (위에서 weight를 세션 최소 보조로 담았다).
    var weightRising = isReverseProgression(name)
      ? leastOf(newHalf, 'weight') < leastOf(oldHalf, 'weight')
      : bestOf(newHalf, 'weight') > bestOf(oldHalf, 'weight');
    var repsRising = bestOf(newHalf, 'reps') > bestOf(oldHalf, 'reps');
    if (!weightRising && !repsRising) stalled.push(name); // 무게도 반복도 안 오름 = 진짜 정체
  });
  return stalled;
}

// 정체기 신호 감지 (규칙 기반 pre-check)
// 변경 근거:
//  (1) 2주·3세션 문턱은 측정 잡음보다 작아 거짓양성이 난다(위 주석) → 종목당 4세션·4주 가드.
//  (2) weight_stalled(2주 체중 변화 <0.3kg) 삭제 — 린매스 목표에서 "체중 유지 + 수행 상승"은
//      리컴포지션 정상 진행이지 정체가 아니다. 오히려 바람직한 상태를 경고로 띄우면 안 된다.
//  (3) pr_stalled 재정의 — PR은 maxWeight 갱신 시에만 찍히는데 더블 프로그레션은 무게를 고정하고
//      반복을 올리는 기간이 정상이라 그동안 PR이 0이다. 그래서 2주→4주로 올리고,
//      실제 수행 정체(getStalledLifts)가 함께 잡힐 때만 신호로 센다.
function detectPlateauSignals() {
  var today = new Date();
  var signals = [];

  // 1. 수행 정체 — 무게도 반복도 안 오르는 종목이 2개 이상 (가장 직접적인 신호)
  var stalled = getStalledLifts();
  if (stalled.length >= 2) {
    signals.push('lift_stalled');
  }

  // 2. PR 갱신 없음 (4주) — 단, 수행 정체 종목이 최소 1개 있을 때만
  var fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(today.getDate() - 28);
  var recentPRs = state.data.personalRecords.filter(function(p) {
    return new Date(p.date) >= fourWeeksAgo;
  });
  if (recentPRs.length === 0 && stalled.length >= 1 && state.data.workoutLog.length > 10) {
    signals.push('pr_stalled');
  }

  // 3. 운동 빈도 감소 (보조 신호 — 회복·실행 문제를 잡는다)
  var oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);
  var oneWeekAgoStr = getDateStr(oneWeekAgo);
  var thisWeekCount = state.data.workoutLog.filter(function(w) {
    return w.date >= oneWeekAgoStr;
  }).length;
  if (thisWeekCount < state.profile.workoutFreq - 1) {
    signals.push('frequency_drop');
  }

  return signals;
}

// 정체기 분석 (AI)
async function analyzePlateauWithAI(signals) {
  if (!state.apiKey || signals.length === 0) return null;
  
  var context = buildUserContext();
  
  var signalDescriptions = {
    'lift_stalled': '4주 이상·4세션 이상 관찰했는데 무게도 반복도 안 오르는 종목이 2개 이상 (어시스트 종목은 "보조 무게가 안 줄어드는 것"이 정체다)',
    'pr_stalled': '최근 4주간 PR 갱신 없음 (수행 정체 종목과 동반 확인됨)',
    'frequency_drop': '이번 주 운동 빈도가 목표보다 적음'
  };
  
  // 옛 캐시(weight_stalled 등)로 호출돼도 프롬프트에 'undefined'가 찍히지 않게 폴백
  var signalText = signals.map(function(s) { return '- ' + (signalDescriptions[s] || s); }).join('\n');
  
  var systemPrompt = '당신은 사용자의 피트니스 코치입니다. 사용자 데이터에서 정체기 신호가 감지됐습니다. ' +
    '원인을 분석하고 구체적인 변형/조정 방안을 제안하세요. JSON으로만 응답.\n\n' +
    '## 감지된 신호\n' + signalText + '\n\n' +
    '## 응답 형식\n' +
    '{\n' +
    '  "severity": "low" | "medium" | "high",\n' +
    '  "diagnosis": "원인 진단 (2~3문장)",\n' +
    '  "primary_cause": "주요 원인 한 줄",\n' +
    '  "recommendations": ["조정안 1", "조정안 2", "조정안 3"],\n' +
    '  "encouragement": "정체는 흔한 신호라는 사실 + 먼저 시도할 조정 1개를 담담하게 1문장 (응원조 금지)"\n' +
    '}\n\n' +
    '## 정체기 분석 원칙\n' +
    '- 점진 과부하 실패: 중량도 반복도 정체 → 회복 점검 → 디로드 1주(볼륨 -40~50%, 무게 유지) 순으로 먼저\n' +
    '- 회복 부족: 빈도/수면 → 휴식일 늘리기\n' +
    // "같은 종목 N주 이상이면 교체"는 근거 없는 통념이라 삭제했다.
    //   Fonseca 2014(JSCR 28(11):3085) — 12주 종목 고정군도 대퇴사두 총 CSA 11.6~12.0% 증가로 변화군과 동등. 단 스쿼트만 한 군은 대퇴직근·중간광근이 안 컸다(근두별 공백) — 규칙 ⑩ 부위 커버의 직접 근거
    //   Kassiano 2024(RQES, n=70) — 고정 vs 순환 종목 RCT, 근비대 동등
    //   Baz-Valle 2019(PLoS One 14(12):e0226989) — 매 세션 무작위 변경 vs 고정, 1RM·근두께 군간 차이 없음
    //   Kassiano 2022(JSCR 36(6):1753) — 과도·무작위 변화는 오히려 근육 발달을 저해할 수 있음
    // 게다가 종목을 바꾸면 getRecentPerformances 히스토리가 끊겨 더블 프로그레션 추적선이 사라진다.
    '- 종목 교체는 "몇 주 했는가"가 아니라 사유로 판단한다:\n' +
    '  (a) 해부학적 공백 — 루틴이 특정 근육·각도를 못 덮을 때\n' +
    '  (b) 통증·장비 제약\n' +
    '  (c) 회복 점검·디로드를 이미 해봤는데도 정체가 계속될 때\n' +
    '  (d) 최근 4주 완수율 하락(동기 저하) — 이때만 새 종목을 권하되 이유를 "근성장"이 아니라 "재미·지속"으로 정직하게 설명 (Baz-Valle 2019)\n' +
    '- 진행 중인 종목은 최소 8~12주 유지가 기본. 무게나 반복이 오르는 중이면 바꿀 이유가 없다. **어시스트(보조) 종목은 보조 무게가 내려가는 중이면 "오르는 중"이다** — 숫자가 줄었다고 정체로 판정하지 말 것.\n' +
    '- 개입 순서(종목 교체는 마지막): ① 회복 점검(수면·완수율) → ② 디로드 1주 → ③ 해당 부위 주간 세트 수 조정 → ④ 종목 변경. 이 순서는 검증된 순서가 아니라 위험·비용 순이다 — 볼륨 격차가 명백하면 ③을 ②보다 먼저 권한다. 디로드는 성장을 늘리지 않는다(Coleman 2024; Pancar 2026)\n\n' +
    (function() { var sb = buildSafetyPromptBlock(); return sb ? sb + '(조정안에 금기 종목을 제안하지 말 것)\n\n' : ''; })() +
    '## 사용자 데이터\n' + context;
  
  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: '정체기 신호를 분석해서 JSON으로 답하세요.' }
        ]
      })
    });
    
    if (!response.ok) return null;
    
    var data = await response.json();
    if (!getResponseText(data)) {
      return null;
    }
    var content = getResponseText(data);
    
    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return null;
    }
    
    var result = {
      detectedAt: getTodayStr(),
      signals: signals,
      severity: aiEnum(parsed.severity, AI_SEVERITIES, 'medium'),
      diagnosis: aiText(parsed.diagnosis),
      primary_cause: aiText(parsed.primary_cause),
      recommendations: aiTextList(parsed.recommendations),
      encouragement: aiText(parsed.encouragement)
    };
    
    storage.set(KEYS.PLATEAU_CHECK, result);
    return result;
  } catch (error) {
    console.error('정체기 분석 실패:', error);
    return null;
  }
}

// 정체기 자동 로드
async function loadPlateauCheckIfNeeded() {
  if (!state.apiKey) return;
  if (state.plateauCheckLoading) return;
  
  // 캐시 (3일 유효)
  var cached = storage.get(KEYS.PLATEAU_CHECK);
  if (cached && cached.detectedAt) {
    var cachedDate = new Date(cached.detectedAt);
    var daysDiff = (new Date() - cachedDate) / 86400000;
    if (daysDiff < 3) {
      state.plateauCheck = cached;
      return;
    }
  }
  
  // 신호 감지
  var signals = detectPlateauSignals();
  // 빈도만 떨어진 건 "정체"가 아니라 실행 문제다 → 수행 근거(lift_stalled·pr_stalled)가 있을 때만 AI를 부른다.
  var hasPerfEvidence = signals.indexOf('lift_stalled') !== -1 || signals.indexOf('pr_stalled') !== -1;
  if (signals.length < 2 || !hasPerfEvidence) {
    state.plateauCheck = null;
    storage.set(KEYS.PLATEAU_CHECK, null);
    return;
  }
  
  state.plateauCheckLoading = true;
  render();
  
  var analysis = await analyzePlateauWithAI(signals);
  state.plateauCheck = analysis;
  state.plateauCheckLoading = false;
  render();
}

// ═══════════════════════════════════════════════
// 유산소 구간 정규화 — 인터벌 모드·걷기(경사) 모드 공용
// AI/폴백이 준 구간(길이 sec 기반)을 totalSec 에 "정확히" 맞춘다.
//  - 각 구간 경계를 30초 배수(30·60·90…)로 스냅한다 → 모든 구간 길이가 30초 단위(연구: ±15~30초 진행).
//  - totalSec 은 항상 60의 배수(mins*60)라 30 격자로 스냅해도 총합은 정확히 totalSec(초과·미달 0).
//  - 종류/속력 이상값 정리, 퇴화(0초) 구간 제거, 첫 구간 0초부터 연속 보장.
//  - opts.incline 이 true 면 incline(경사 %)도 정리해 함께 싣는다(걷기 모드). 상한은 opts.inclineMax.
//  - opts.allowedTypes / opts.speedMin / opts.speedMax 로 모드별 허용 범위를 좁힐 수 있다.
// ★시간·경사·종류·속력 상한은 프롬프트만 믿지 않고 여기(코드)에서 절대 불가하게 보정한다.
// ═══════════════════════════════════════════════
var CARDIO_ALLOWED_TYPES = { warmup: 1, run: 1, walk: 1, cooldown: 1 };
// 걷기 모드는 'run' 을 쓰지 않는다 — 걷기 쪽 모든 로직(경사 기록·코칭 문구·기록 요약)이
// type === 'walk' 를 본 구간으로 삼기 때문에, run 이 섞이면 그 세션의 경사 기록이 통째로 사라진다.
var CARDIO_WALK_ALLOWED_TYPES = { warmup: 1, walk: 1, cooldown: 1 };

function cardioFitToTotal(raw, totalSec, opts) {
  opts = opts || {};
  var defSpeed = opts.defaultSpeed || {};
  var defLabel = opts.defaultLabel || {};
  var wantIncline = !!opts.incline;
  var inclineMax = (typeof opts.inclineMax === 'number') ? opts.inclineMax : 0;
  var allowed = opts.allowedTypes || CARDIO_ALLOWED_TYPES;
  var spdMin = (typeof opts.speedMin === 'number') ? opts.speedMin : 1;
  var spdMax = (typeof opts.speedMax === 'number') ? opts.speedMax : 20;
  var list = Array.isArray(raw) ? raw : [];

  // 속력 숫자 정리: km/h, 모드별 범위로 클램프, 소수 1자리. 이상값이면 종류별 기본값.
  // aiNum 을 쓰는 이유: Number("8.0km/h") 는 NaN 이라 모델이 단위를 붙이면 처방이 통째로 기본값으로 주저앉는다.
  function cleanSpeed(v, type) {
    var n = aiNum(v, null, { positive: true });
    if (n === null) n = defSpeed[type] || 4;
    if (n < spdMin) n = spdMin;
    if (n > spdMax) n = spdMax;
    return Math.round(n * 10) / 10;
  }
  // 경사 정리: 0~상한 클램프, 0.5% 격자. 상한 초과는 코드가 잘라낸다(§1-3 12% 초과 금지).
  function cleanIncline(v) {
    var n = aiNum(v, 0, { min: 0 });
    if (n > inclineMax) n = inclineMax;
    return Math.round(n * 2) / 2;
  }

  var clean = [];
  var sum = 0;
  for (var i = 0; i < list.length; i++) {
    var seg = list[i] || {};
    var type = allowed[seg.type] ? seg.type : 'walk';       // 허용 밖 종류(걷기 모드의 run 등)는 walk 로 접는다
    // "300초" 처럼 단위가 붙어도 구간을 통째로 버리지 않는다. 길이는 어차피 아래에서
    // 총시간에 맞춰 비율로 다시 늘려 쓰므로, 단위를 잘못 읽어도 구간 비율은 살아남는다.
    var sec = aiNum(seg.sec, null, { positive: true, unit: 'sec' });
    if (sec === null) continue;
    var item = {
      type: type,
      sec: sec,
      speed: cleanSpeed(seg.speed, type),
      label: (typeof seg.label === 'string' && seg.label.trim()) ? seg.label.trim() : (defLabel[type] || '구간')
    };
    if (wantIncline) item.incline = cleanIncline(seg.incline);
    clean.push(item);
    sum += sec;
  }
  if (!clean.length || sum <= 0) return null;

  var STEP = 30;                                         // 30초 격자
  var out = [];
  var prev = 0;                                          // 확정된 끝(항상 30의 배수)
  var cum = 0;
  var n = clean.length;
  for (var j = 0; j < n; j++) {
    cum += clean[j].sec * totalSec / sum;               // 스케일된 이상적 끝(실수, 초)
    var end;
    if (j === n - 1) {
      end = totalSec;                                    // 마지막 구간은 정확히 총시간(30의 배수)
    } else {
      end = Math.round(cum / STEP) * STEP;               // 30초 격자에 스냅
      var minEnd = prev + STEP;                          // 이 구간 최소 30초 확보
      var maxEnd = totalSec - (n - 1 - j) * STEP;        // 이후 구간마다 30초씩 남겨두기
      if (end < minEnd) end = minEnd;
      if (end > maxEnd) end = maxEnd;
    }
    if (end <= prev) continue;                           // 격자 부족 시 병합(누적은 유지)
    var outSeg = {
      startSec: prev,
      endSec: end,
      type: clean[j].type,
      speed: clean[j].speed,
      label: clean[j].label
    };
    if (wantIncline) outSeg.incline = clean[j].incline;
    out.push(outSeg);
    prev = end;
  }
  if (!out.length) return null;
  // 마지막 구간이 정확히 끝(totalSec)까지 덮게 보정
  if (out[out.length - 1].endSec !== totalSec) out[out.length - 1].endSec = totalSec;
  return out;
}

// ═══════════════════════════════════════════════
// 유산소 인터벌 생성 (러닝머신 걷기·뛰기) — Sonnet
// 입력: 운동 시간(분)만. 출력: 그 시간에 "딱 맞는" 구간 리스트.
// 반환: { headline, totalSec, segments:[{startSec,endSec,type,speed,label}], note } | null(API 키 없음)
// 근거: cardio-research.md — 첫 회 보수적 처방 / 향상 우선순위(★속력 아님: 비율·시간 먼저) /
//       완주+RPE 게이트 / 담백한 톤(과장 금지·면책은 화면 배너에) / 안전 가드레일(워밍업·쿨다운·10%·속력 상한).
// ★시간 초과는 프롬프트만 믿지 않고 코드(fitToTotal)에서 절대 불가하게 보정한다.
// ═══════════════════════════════════════════════
async function generateCardioInterval(totalMinutes) {
  // 계약: API 키 없으면 null (상위 화면이 안내)
  if (!state.apiKey) return null;

  // 입력 시간 정규화 (분 → 초). 병적 입력(음수·NaN·초대형)만 방어적으로 클램프.
  var mins = Math.round(Number(totalMinutes) || 0);
  mins = Math.max(3, Math.min(180, mins));
  var totalSec = mins * 60;

  var DEFAULT_LABEL = { warmup: '워밍업 걷기', run: '뛰기', walk: '걷기 회복', cooldown: '쿨다운 걷기' };
  // 첫 회 기본 하한(사용자=중급): 걷기(회복) ≥5.5, 뛰기 ≥8.0, 워밍업·쿨다운 걷기 5.0. AI가 speed를 빠뜨렸을 때의 기본값.
  var DEFAULT_SPEED = { warmup: 5.0, run: 8.0, walk: 5.5, cooldown: 5.0 };

  // 총시간 정확히 맞추기 + 30초 격자 스냅은 공용 cardioFitToTotal 이 담당(걷기 모드와 동일 알고리즘).
  function fitToTotal(raw) {
    return cardioFitToTotal(raw, totalSec, { defaultSpeed: DEFAULT_SPEED, defaultLabel: DEFAULT_LABEL });
  }

  // 지난 유산소 기록 요약 → 점진·게이트 컨텍스트. 기록 없으면 첫 회 안내.
  // ★인터벌 세션만 본다 — 경사 걷기 세션이 같은 cardioLog 에 함께 쌓이므로,
  //   걷기 세션을 기준선으로 삼으면 "뛰기 0회"를 읽고 엉뚱한 판정이 나온다.
  function cardioHistoryContext() {
    var log = (state.data && Array.isArray(state.data.cardioLog)) ? state.data.cardioLog : [];
    var sorted = cardioIntervalSessions(log);
    if (!sorted.length) return '기록 없음 — 첫 회입니다. 위 "첫 회 처방"을 그대로 적용하고, 속력 욕심 없이 완주를 목표로 보수적으로 짜세요.';
    var recent = sorted.slice(0, 3);

    function avg(arr, pick) {
      var vals = [];
      arr.forEach(function(g) {
        var v = Number(pick(g));
        if (isFinite(v) && v > 0) vals.push(v);
      });
      if (!vals.length) return null;
      var s = 0; vals.forEach(function(v) { s += v; });
      return s / vals.length;
    }

    var lines = [];
    recent.forEach(function(s, idx) {
      if (!s) return;
      var m = s.totalSec ? Math.round(s.totalSec / 60) : '?';
      var segs = Array.isArray(s.segments) ? s.segments : [];
      var runs = segs.filter(function(g) { return g && g.type === 'run'; });
      var walks = segs.filter(function(g) { return g && g.type === 'walk'; });
      var runSpeed = avg(runs, function(g) { return (typeof g.actualSpeed === 'number' ? g.actualSpeed : g.targetSpeed); });
      var runSec = avg(runs, function(g) { return g.sec; });
      var walkSec = avg(walks, function(g) { return g.sec; });
      var done = s.completed ? '완주O' : '미완주X';
      var rpe = (typeof s.rpe === 'number') ? ('RPE ' + s.rpe) : 'RPE기록없음';
      var detail = '뛰기 ' + runs.length + '회' +
        (runSec ? ' 각 ~' + Math.round(runSec) + '초' : '') +
        (runSpeed ? ' ~' + (Math.round(runSpeed * 10) / 10) + 'km/h' : '') +
        (walkSec ? ' / 걷기 각 ~' + Math.round(walkSec) + '초' : '');
      var tag = idx === 0 ? '지난 회(기준선)' : (s.date || '이전');
      lines.push('- ' + tag + ': ' + m + '분 · ' + done + ' · ' + rpe + ' · ' + detail);
    });

    // 코드가 완주+RPE로 향상/유지/하향을 1차 판정(참고). 최종 축·폭은 프롬프트 규칙대로.
    var last = recent[0] || {};
    var gate;
    if (!last.completed) gate = '지난 회 미완주 → 이번엔 하향(걷기 +30초 또는 뛰기 -15초, 통증·컨디션 나빴으면 뛰기 속력도 -0.3~0.5km/h까지 낮춰 더 보수적으로).';
    else if (typeof last.rpe === 'number' && last.rpe <= 7) gate = '지난 회 완주 + RPE≤7 → 향상 우선순위에서 "한 축만" 소폭 상향(먼저 걷기 단축/비율↑, 그다음 뛰기 시간↑, 속력·경사는 맨 마지막).';
    else if (typeof last.rpe === 'number' && last.rpe >= 8) gate = '지난 회 완주지만 RPE 높음(8~9) → 이번엔 유지(그대로).';
    else gate = '지난 회 완주(RPE 미기록) → 유지하거나 아주 소폭만 상향(보수적).';

    return lines.join('\n') + '\n\n코드 판정(참고): ' + gate;
  }

  // 파싱 실패/네트워크 오류 시 폴백: 연구 첫 회 템플릿을 시간에 맞춰 스케일(기능이 항상 동작하도록).
  function fallbackPlan() {
    // ★첫 회(기록 없음) 기본 하한 — 사용자=중급: 뛰기 8.0, 걷기 회복 5.5, 워밍업·쿨다운 걷기 5.0.
    //   길이는 30초 배수(warm을 미리 30으로 스냅; 최종 30 격자 스냅은 fitToTotal이 보장).
    var warm = Math.round(Math.min(300, Math.max(120, totalSec * 0.2)) / 30) * 30;
    var cool = warm;
    var mid = totalSec - warm - cool;
    var raw = [{ type: 'warmup', sec: warm, speed: 5.0, label: '워밍업 걷기' }];
    if (mid < 120) {
      raw.push({ type: 'walk', sec: Math.max(30, Math.round(mid / 30) * 30), speed: 5.5, label: '빠르게 걷기' });
    } else {
      var reps = Math.max(1, Math.floor(mid / 180));       // [뛰기 60초 + 걷기 120초] 반복
      for (var i = 0; i < reps; i++) {
        raw.push({ type: 'run', sec: 60, speed: 8.0, label: '뛰기' });
        raw.push({ type: 'walk', sec: 120, speed: 5.5, label: '걷기 회복' });
      }
    }
    raw.push({ type: 'cooldown', sec: cool, speed: 5.0, label: '쿨다운 걷기' });
    var segs = fitToTotal(raw);
    if (!segs) return null;
    return {
      headline: mins + '분 걷기·뛰기 인터벌 (완주 목표)',
      totalSec: totalSec,
      segments: segs,
      note: '무리 말고 완주가 목표예요. 뛰기는 "짧은 말은 되는데 대화는 벅찬" 정도로 편하게, 통증 있으면 쉬세요.'
    };
  }

  var systemPrompt =
`당신은 초보자의 러닝머신 인터벌 유산소(걷기·뛰기)를 안전하게 설계하는 코치다. 사용자가 준 '운동 시간' 안에 워밍업 + 인터벌 본운동 + 쿨다운을 빠짐없이 채우되 그 시간을 절대 넘기지 않게 구간을 짠다. 반드시 JSON으로만 응답한다(설명 문장 없이 JSON 하나).

## ⏱️ 시간 규칙 (가장 중요)
- 모든 구간 sec(초)의 합 = 정확히 ${totalSec}초 (= ${mins}분). 절대 초과 금지, 모자라게도 하지 말 것.
- 각 구간 길이(sec)는 30초의 배수(30·60·90·120…)로 한다 — 워밍업·쿨다운·뛰기·걷기 모두. (연구 권고: 인터벌은 ±15~30초 단위 진행)
- 반드시 warmup(걷기)로 시작하고 cooldown(걷기)로 끝낸다.
- 시간이 짧으면 워밍업/쿨다운을 각각 최소 2~3분(120~180초)으로 압축하고, 인터벌(뛰기) 반복 횟수부터 줄인다.

## 🐣 첫 회(기록 없음) 처방 — 목표 = 완주 (사용자는 중급: 평소 6km/h 걷기·8km/h+ 뛰기)
- 워밍업 걷기 약 5분(5.0~5.5km/h) → [뛰기 60초 + 걷기 120초] 6~8회 반복 → 쿨다운 걷기 약 5분(5.0~5.5km/h).
- ★기본 하한(평상시 이 밑으론 내리지 말 것): 걷기(회복) ≥ 5.5km/h, 뛰기 ≥ 8.0km/h. 워밍업·쿨다운 걷기만 5.0~5.5 허용. 단, 통증 복귀·컨디션 나쁜 날은 이 하한 아래로 속력을 낮춰 "느리게 걷는 회복"을 줘도 된다.
- ★상한(과속 방지): 뛰기 속력은 13km/h를 넘기지 말 것(초보~중급 안전 상한).
- 뛰기 속력 = "짧은 말은 되지만 대화는 벅찬" 편한 조깅(8.0km/h부터 시작, 전력질주는 금지).
- 주어진 시간이 위 템플릿보다 짧으면 뛰기 반복 횟수를 줄여 시간에 맞춘다.

## 📈 향상 우선순위 (★속력이 아니다 — 한 번에 "한 축만")
1. 걷기 구간 단축 / 뛰기:걷기 비율↑  (최우선, 속력은 그대로)
2. 뛰기 구간 시간↑  (+15~30초)
3. 속력·경사↑  (맨 마지막, +0.5km/h 정도. 단, 뛰기 속력 상한 13km/h를 넘기지 않는다)
- 주당 총량은 이전 대비 +10% 이내. 한 세션에 여러 축을 동시에 올리지 말 것(정강이통증 예방).

## ✅ 향상 게이트 (지난 기록 기반)
- 지난 회 완주 AND 뛰기 RPE ≤ 7 → 위 우선순위에서 한 축만 소폭 상향.
- 완주했지만 RPE 8~9(매우 힘듦) → 유지(그대로).
- 미완주/통증/컨디션 나쁨 → 하향(걷기 +30초 또는 뛰기 -15초, 필요하면 뛰기 속력도 -0.3~0.5km/h. 통증·회복이 목적이면 느리게 걷기 위주로).
- 지난 회 "실제 뛴 속력·구간"을 이번 기준선(anchor)으로 삼되, 올릴 때는 반드시 위 축 순서로.

## 🗣️ 강도 지표 (초보용)
- 대화 테스트 1순위: 뛰기 = "짧은 단어만 가능", 걷기 = "노래도 될 만큼 편함".
- RPE 보조: 뛰기 6~7 / 걷기 2~3 (중급자라 8.0km/h 뛰기도 대개 RPE 6~7 범위).

## 🙅 톤 (담백하게)
- 과장 금지: "지방 순삭/애프터번 폭발" 같은 표현을 쓰지 않는다. note에는 오늘 할 일과 그 이유만 담는다.
- 지방·살·다이어트는 사용자가 직접 물었을 때만 짧게 사실을 정정한다(체지방은 총에너지소비·식사·꾸준함이 핵심). 묻지 않았으면 넣지 않는다.
- 지방 순삭 부정·근손실 주의 같은 면책은 화면 배너가 이미 안내하니 note에 반복하지 않는다.
- 안전: 워밍업·쿨다운 필수, 주 3회+회복일, 통증 시 하향·휴식.

## 📒 사용자 지난 유산소 기록
${cardioHistoryContext()}

## 📤 응답 형식 (JSON만)
{
  "headline": "한 줄 요약 (예: 첫 회 · 완주 목표 걷기·뛰기 / 또는 지난 회보다 걷기 10초 단축)",
  "note": "오늘의 포인트(왜 향상/유지/하향) 1~2문장. 담백하게, 과장·군더더기 없이.",
  "segments": [
    {"type":"warmup","sec":300,"speed":5,"label":"워밍업 걷기"},
    {"type":"run","sec":60,"speed":8,"label":"뛰기"},
    {"type":"walk","sec":120,"speed":5.5,"label":"걷기 회복"},
    {"type":"cooldown","sec":300,"speed":5,"label":"쿨다운 걷기"}
  ]
}
- type은 warmup|run|walk|cooldown 넷 중 하나. sec는 30초 배수(정수 초), speed는 km/h 숫자, label은 짧은 한국어.
- 걷기 속력 5~6, 뛰기 속력 8~9 권장(첫 회 하한: 걷기 5.5 · 뛰기 8.0). 각 sec은 30초 배수, 합은 정확히 ${totalSec}.`;

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: mins + '분(= ' + totalSec + '초)짜리 러닝머신 인터벌을 만들어줘. 구간 sec 합이 정확히 ' + totalSec + '이 되게, JSON으로만.' }
        ]
      })
    });

    if (!response.ok) {
      console.error('유산소 인터벌 생성 실패:', response.status);
      return fallbackPlan();                                // API 오류여도 기능은 동작하게(연구 첫 회 템플릿)
    }

    var data = await response.json();
    if (!getResponseText(data)) {
      return fallbackPlan();
    }
    var content = getResponseText(data);

    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var parsed = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      var jsonStr = extractBalancedJson(cleaned);
      if (jsonStr) { try { parsed = JSON.parse(jsonStr); } catch (e2) { parsed = null; } }
    }

    if (!parsed || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      return fallbackPlan();
    }

    // ★AI가 준 구간을 totalSec에 정확히 맞춘다(초과·미달 코드에서 원천 차단).
    var segments = fitToTotal(parsed.segments);
    if (!segments) return fallbackPlan();

    return {
      headline: (typeof parsed.headline === 'string' && parsed.headline.trim()) ? parsed.headline.trim() : (mins + '분 걷기·뛰기 인터벌'),
      totalSec: totalSec,
      segments: segments,
      note: (typeof parsed.note === 'string' && parsed.note.trim()) ? parsed.note.trim() : '무리 말고 완주가 목표예요. 뛰기는 편하게, 통증 있으면 쉬세요.'
    };
  } catch (error) {
    console.error('유산소 인터벌 호출 실패:', error);
    return fallbackPlan();                                  // 네트워크 예외에도 유산소 시작 가능하게
  }
}

// ═══════════════════════════════════════════════
// 경사 걷기(인클라인 워킹) 세션 생성 — Sonnet
// 입력: 운동 시간(분)만. 출력: 정속 4구간(몸풀기 → 준비(램프) → 본 구간 → 정리).
// 반환: { headline, totalSec, segments:[{startSec,endSec,type,speed,incline,label}], note } | null(API 키 없음)
// 근거: docs/research/incline-walking.md — §2(처방표) §3(세션 구조) §4(점진 규칙) §5(주의사항) §7-6(프롬프트 설계)
// ★인터벌 모드와 같은 뼈대(JSON만 · cardioFitToTotal · 폴백)를 쓰고 프롬프트·경사 규칙만 다르다.
// ═══════════════════════════════════════════════

// 지난 "걷기 모드" 세션만 요약 → 점진·게이트 컨텍스트(§4-2). 기록 없으면 첫 회 안내.
// ctx 는 cardioWalkContext() 결과(생략 시 여기서 계산) — 한 번의 생성에서 로그를 여러 번 훑지 않도록,
// 그리고 프롬프트에 넣는 기준 경사와 폴백이 쓰는 기준 경사가 반드시 같은 값이도록 넘겨받는다.
function cardioWalkHistoryContext(ctx) {
  var c = ctx || cardioWalkContext();
  var sessions = c.sessions;
  var startInc = c.back ? WALK_PRESCRIPTION.inclineStartBack : WALK_PRESCRIPTION.inclineStart;

  if (!sessions.length) {
    return '기록 없음 — 경사 걷기 첫 회입니다. 경사 ' + startInc + '%, 속도 ' + WALK_PRESCRIPTION.speedDefault +
      'km/h 로 시작하고 본 구간은 15~20분을 넘기지 마세요. 경사 욕심 없이 완주가 목표입니다.';
  }

  var HANDRAIL_KR = { none: '손잡이 안 잡음', light: '손가락만 가볍게', hold: '★손잡이 계속 잡음' };
  var recent = sessions.slice(0, 3);
  var lines = [];
  recent.forEach(function(s, idx) {
    if (!s) return;
    var m = s.totalSec ? Math.round(s.totalSec / 60) : '?';
    var inc = cardioWalkMainIncline(s);
    var segs = Array.isArray(s.segments) ? s.segments : [];
    var mains = segs.filter(function(g) { return g && g.type === 'walk'; });
    var mainSec = 0, spd = 0;
    mains.forEach(function(g) {
      var sec = Number(g.sec) || 0;
      mainSec += sec;
      var v = Number((g.actualSpeed != null) ? g.actualSpeed : g.targetSpeed);
      if (isFinite(v) && v > spd) spd = v;
    });
    var done = s.completed ? '완주O' : '미완주X';
    var rpe = (typeof s.rpe === 'number') ? ('RPE ' + s.rpe) : 'RPE기록없음';
    var hr = HANDRAIL_KR[s.handrail] || '손잡이 기록없음';
    var tag = (idx === 0) ? '지난 회(기준선)' : (s.date || '이전');
    lines.push('- ' + tag + ': 총 ' + m + '분 · 본 구간 ' + Math.round(mainSec / 60) + '분 · 경사 ' + inc + '%' +
      (spd ? (' · 속도 ' + (Math.round(spd * 10) / 10) + 'km/h') : '') + ' · ' + done + ' · ' + rpe + ' · ' + hr);
  });

  // 최근 7일 세션 수 — 빈도 축(2순위) 판단용. 주 4회를 넘기지 않는다(§4-1 · §6-3).
  var since = getDateStr(new Date(Date.now() - 6 * 86400000));
  var weekCount = sessions.filter(function(s) { return s && String(s.date) >= since; }).length;

  // 코드가 지난 기록으로 1차 판정(참고). 최종 축·폭은 프롬프트 규칙대로.
  var last = recent[0] || {};
  var gate;
  if (last.handrail === 'hold') gate = '지난 회 손잡이를 계속 잡음 → 경사가 너무 높았다는 신호. 이번엔 경사 −2%(무조건).';
  else if (!last.completed) gate = '지난 회 미완주 → 하향(경사 −2% + 본 구간 −5분).';
  else if (typeof last.rpe === 'number' && last.rpe >= 9) gate = '지난 회 RPE 9 이상 → 하향(경사 −2%).';
  else if (typeof last.rpe === 'number' && last.rpe >= 7) gate = '지난 회 RPE 7~8 → 유지(그대로 반복).';
  else if (typeof last.rpe === 'number' && last.rpe <= 6) gate = '지난 회 완주 + RPE ≤ 6 → 우선순위(시간 → 빈도 → 경사 → 속도)에서 "한 축만" 소폭 상향.';
  else gate = '지난 회 완주(RPE 미기록) → 유지하거나 시간 축만 아주 소폭 상향(보수적).';

  return lines.join('\n') +
    '\n\n최근 7일 걷기 세션 수: ' + weekCount + '회 (상한 주 4회)' +
    '\n코드 판정(참고): ' + gate +
    '\n코드가 계산한 안전 경사(하향 게이트 반영, 상향은 미포함): ' + c.anchorIncline + '%';
}

async function generateCardioWalk(totalMinutes) {
  // 계약: API 키 없으면 null (상위 화면이 로컬 폴백으로 처리)
  if (!state.apiKey) return null;

  // 본 구간 33분 상한(§4-1) → 세션 총시간은 45분을 넘지 않는다. 더 요청해도 여기서 자른다.
  var totalSec = cardioWalkClampTotalSec(Math.max(3, Math.min(180, Math.round(Number(totalMinutes) || 0))) * 60);
  var mins = Math.round(totalSec / 60);

  var ctx = cardioWalkContext();                             // 로그·부상·기준 경사를 한 번만 계산
  var back = ctx.back;
  var cap = ctx.cap;                                         // 허리 이력이면 10%, 아니면 12%
  var anchorIncline = ctx.anchorIncline;                     // 하향 게이트까지 반영된 기준 경사

  var DEFAULT_LABEL = { warmup: '몸풀기', walk: '본 구간', cooldown: '정리' };
  var DEFAULT_SPEED = {
    warmup: WALK_PRESCRIPTION.speedDefault,
    walk: WALK_PRESCRIPTION.speedDefault,
    cooldown: WALK_PRESCRIPTION.cooldownSpeed
  };
  function fitWalk(raw) {
    return cardioFitToTotal(raw, totalSec, {
      defaultSpeed: DEFAULT_SPEED, defaultLabel: DEFAULT_LABEL,
      incline: true, inclineMax: cap,
      allowedTypes: CARDIO_WALK_ALLOWED_TYPES,               // run 금지는 프롬프트가 아니라 코드가 강제
      speedMin: WALK_PRESCRIPTION.speedMin, speedMax: WALK_PRESCRIPTION.speedMax
    });
  }

  // 파싱 실패·네트워크 오류 시 폴백 — 화면의 로컬 폴백(buildFallbackWalk)과 같은 구성을 쓴다.
  // (허리 자세 큐 같은 안내가 경로에 따라 달라지지 않도록 한 곳에서만 만든다.)
  function fallbackPlan() {
    if (typeof buildFallbackWalk === 'function') return buildFallbackWalk(mins, false);
    var segs = fitWalk(buildWalkRawSegments(totalSec, anchorIncline));
    if (!segs) return null;
    return {
      headline: mins + '분 · 경사 ' + anchorIncline + '% 정속 걷기',
      totalSec: totalSec,
      segments: segs,
      note: '본 구간은 아무것도 바꾸지 않고 그대로 걷습니다. 손잡이는 놓고, 문장은 말할 수 있는 정도로 유지하세요.'
    };
  }

  // 허리디스크 등록 시 주입되는 블록(§5-1) — 부상 없으면 토큰 0.
  var backBlock = back ?
`
## ⚠️ 허리(디스크) 이력 있음 — 반드시 반영
- 경사 상한을 한 단계 낮춘다: 이번 처방의 경사는 **${cap}% 를 절대 넘기지 않는다.**
- 경사는 가장 늦게, 가장 조심스럽게 올리는 축이다. 시간·빈도를 먼저 다 쓴 뒤에만 경사를 건드린다.
- note 에 자세 큐를 반드시 1개 넣는다: "가슴은 들고 허리는 곧게 — 접히는 곳은 허리가 아니라 고관절".
- 다리로 내려가는 저림·방사통이 있었다면 경사를 절반으로 내린다.
` : '';

  var systemPrompt =
`당신은 러닝머신 '경사 걷기(인클라인 워킹)' 세션을 설계하는 코치다. 목표는 체지방 감소이고, 수단은 무릎 부담이 적은 정속 유산소다. 사용자가 준 '운동 시간' 안에 몸풀기 + 준비(램프) + 본 구간 + 정리를 빠짐없이 채우되 그 시간을 절대 넘기지 않는다. 반드시 JSON으로만 응답한다(설명 문장 없이 JSON 하나).

★앱은 러닝머신을 제어하지 못한다. 사용자가 화면 안내를 보고 직접 경사·속도 버튼을 누른다. 그래서 구간을 자주 바꾸면 안 된다.

## ⏱️ 시간 규칙 (가장 중요)
- 모든 구간 sec(초)의 합 = 정확히 ${totalSec}초 (= ${mins}분). 초과·미달 금지.
- 각 구간 길이(sec)는 30초의 배수.

## 🧱 구조 고정 (정확히 4구간, 순서 고정)
1. warmup — 몸풀기, **경사 0%**, 속도 5.0, 약 5분(시간이 짧으면 2~3분)
2. warmup — 준비 구간(램프), **경사 = 목표의 절반**, 속도 5.0, 2분
3. walk — **본 구간(정속)**, 목표 경사, 목표 속도, 세션의 심장
4. cooldown — 정리, **경사 0%**, 속도 ${WALK_PRESCRIPTION.cooldownSpeed}, 3~5분
- ★본 구간을 여러 개로 쪼개지 말 것. 인터벌(경사·속도 오르내림)은 이 모드에서 금지다 — 이미 인터벌 모드가 따로 있다.
- 경사 조작은 세션 전체에서 총 3회(램프 진입 / 본 구간 진입 / 정리 진입)뿐이어야 한다.
- 본 구간은 최대 ${Math.round(WALK_PRESCRIPTION.mainMaxSec / 60)}분을 넘기지 않는다.

## ⛰️ 경사 규칙
- 이번 세션의 기준 경사(anchor) = **${anchorIncline}%** (지난 기록의 하향 게이트까지 반영된 값).
- ★상한 **${cap}%** — 어떤 경우에도 초과 금지. (근거: 15~20%는 지방 산화 이득이 사라지고 즐거움·지속률이 무너진다)
- 경사를 올릴 땐 한 번에 +1~2% 까지만.
- 램프 구간 경사 = 본 구간 경사의 절반(반올림해 0.5% 단위).

## 🚶 속도 규칙
- 범위 ${WALK_PRESCRIPTION.speedMin}~${WALK_PRESCRIPTION.speedMax} km/h. 기본 ${WALK_PRESCRIPTION.speedDefault}.
- ★경사가 오르면 속도는 올리지 않는다(오히려 내린다). 경사 11% 이상이면 4.8 권장.
- 속도는 올릴 때 +0.2~0.3 km/h 씩만.

## 📈 향상 우선순위 — **시간 → 빈도 → 경사 → 속도** (한 번에 "한 축만")
1. 시간: 본 구간 +5분 (상한 ${Math.round(WALK_PRESCRIPTION.mainMaxSec / 60)}분) — 관절·허리 피크 부하를 전혀 안 올리는 가장 안전한 축
2. 빈도: 주 +1회 (상한 주 4회) — 이번 응답에서 바꿀 수 없는 축이니 note 로만 제안
3. 경사: +1~2% (상한 ${cap}%)
4. 속도: +0.2~0.3 km/h (상한 ${WALK_PRESCRIPTION.speedMax})
- 주간 총량은 이전 주 대비 +10% 이내. 같은 축을 3주 연속 올리지 않는다.

## ✅ 향상 게이트 (지난 기록 기반)
- 완주 O + RPE ≤ 6 + 허리·종아리 통증 없음 → 위 우선순위에서 한 축만 소폭 상향.
- 완주 O + RPE 7~8 → 유지(그대로 반복).
- 완주 O + RPE ≥ 9 → 하향(경사 −2% 또는 본 구간 −5분).
- 미완주 → 하향(경사 −2% + 본 구간 −5분).
- ★**손잡이 "계속 잡음" 기록이면 무조건 경사 −2%.** 잡고 뒤로 기대면 강도의 3분의 1이 사라지므로, 실제로는 기록보다 낮은 경사를 한 것이다.
${backBlock}
## 🗣️ 강도 지표
- 대화 테스트가 1순위: "문장은 말할 수 있는데 노래는 안 되는" 정도가 딱 맞다.
- RPE는 0~10 척도다. 4~6이 정상(인터벌 모드보다 낮다 — 30분을 균일하게 유지하는 운동이라 그렇다).
- 웨이트와 같은 날이면 웨이트 먼저 → 걷기 나중. 근비대에는 같은 날·같은 세션이어도 손해가 없다(Schumann 2022; Held 2026). 하체 웨이트 다음 날은 경사 −2% 또는 본 구간 −5분으로 한 단계 낮춘다.
- 손잡이를 놓을 수 없다면 경사가 너무 높다는 신호다.

## 🙅 톤 (담백하게)
- ★과장 금지: "지방 연소/지방 순삭/애프터번 폭발" 같은 표현을 절대 쓰지 않는다. 경사 걷기가 지방을 더 태운다는 근거는 연구가 서로 엇갈린다.
- 장점은 정직하게 한 가지뿐: **평지 조깅에 가까운 열량을 무릎 부담 없이** 가져온다는 것.
- 체지방은 총 에너지 적자와 식사가 정한다. 지방·다이어트 이야기는 사용자가 물었을 때만 짧게 사실을 정정한다.
- note 에는 오늘 할 일과 그 이유만 1~2문장. 면책·주의 문구는 화면 배너가 이미 안내하니 반복하지 않는다.

## 📒 사용자 지난 경사 걷기 기록
${cardioWalkHistoryContext(ctx)}

## 📤 응답 형식 (JSON만)
{
  "headline": "한 줄 요약 (예: 경사 6% · 본 구간 20분 / 또는 지난 회보다 본 구간 5분 증가)",
  "note": "오늘의 포인트(왜 향상/유지/하향) 1~2문장. 담백하게.",
  "segments": [
    {"type":"warmup","sec":300,"speed":5,"incline":0,"label":"몸풀기"},
    {"type":"warmup","sec":120,"speed":5,"incline":3,"label":"준비 구간"},
    {"type":"walk","sec":1200,"speed":5,"incline":6,"label":"본 구간"},
    {"type":"cooldown","sec":180,"speed":4.5,"incline":0,"label":"정리"}
  ]
}
- type 은 warmup|walk|cooldown 만 쓴다(run 금지). sec 는 30초 배수, speed 는 km/h, incline 은 % 숫자(0~${cap}), label 은 짧은 한국어.
- 구간 sec 의 합은 정확히 ${totalSec}.`;

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: mins + '분(= ' + totalSec + '초)짜리 경사 걷기 세션을 만들어줘. 구간 sec 합이 정확히 ' + totalSec + '이 되게, JSON으로만.' }
        ]
      })
    });

    if (!response.ok) {
      console.error('경사 걷기 세션 생성 실패:', response.status);
      return fallbackPlan();                                // API 오류여도 기능은 동작하게
    }

    var data = await response.json();
    if (!getResponseText(data)) return fallbackPlan();
    var content = getResponseText(data);

    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var parsed = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      var jsonStr = extractBalancedJson(cleaned);
      if (jsonStr) { try { parsed = JSON.parse(jsonStr); } catch (e2) { parsed = null; } }
    }

    if (!parsed || !Array.isArray(parsed.segments) || parsed.segments.length === 0) return fallbackPlan();

    var segments = fitWalk(parsed.segments);
    if (!segments) return fallbackPlan();

    return {
      headline: (typeof parsed.headline === 'string' && parsed.headline.trim()) ? parsed.headline.trim() : (mins + '분 경사 걷기'),
      totalSec: totalSec,
      segments: segments,
      note: (typeof parsed.note === 'string' && parsed.note.trim()) ? parsed.note.trim() : '본 구간은 그대로 유지하세요. 손잡이는 놓고, 문장은 말할 수 있는 정도로.'
    };
  } catch (error) {
    console.error('경사 걷기 호출 실패:', error);
    return fallbackPlan();                                  // 네트워크 예외에도 시작 가능하게
  }
}

// ═══════════════════════════════════════════════
// 세트 사이 채팅 (운동 중 — 3단계)
// ═══════════════════════════════════════════════

// 현재 세션·종목 상황을 짧은 컨텍스트 블록으로 (세트 사이 채팅 전용)
function buildSessionChatContext() {
  var session = state.activeSession;
  if (!session || !session.exercises || !session.exercises.length) return '';
  var ex = session.exercises[session.currentExerciseIdx];
  var working = ex.sets.filter(function(s) { return !s.isWarmup; });
  var done = working.filter(function(s) { return s.completed; });
  var setsStr = done.map(function(s) { return s.weight + 'kg×' + s.reps; }).join(', ') || '아직 없음';
  var ctx = '## 🏋️ 지금 운동 중 (세트 사이 휴식)\n' +
    '- 세션: ' + session.sessionName + ' — 종목 ' + (session.currentExerciseIdx + 1) + '/' + session.exercises.length + '\n' +
    '- 현재 종목: ' + ex.name + ' (' + (ex.type || '') + ', 목표 ' + (ex.targetReps || '?') + '회)\n' +
    '- 오늘 이 종목 완료 세트: ' + setsStr + ' (' + done.length + '/' + working.length + ')\n';
  var prog = getProgressiveRecommendation(ex.name, ex.targetReps);
  if (prog && prog.previousWeight !== undefined && prog.previousWeight !== null) {
    var wPrefix = isReverseProgression(ex.name) ? '보조 ' : '';
    // 화면과 같은 표기를 쓴다 — 여기만 대표 무게로 접으면 코치가 "40kg 를 10회나 들었네" 로 읽는다(#4).
    var lastLog = getLastPerformedSets(ex.name);
    var prevSummary = lastLog ? formatSetsSummary(lastLog.sets, { unitPrefix: wPrefix }) : '';
    ctx += '- 지난 세션 수행: ' + (prevSummary ||
      (wPrefix + prog.previousWeight + 'kg × ' + (prog.previousReps || []).join(',') + '회')) + '\n';
  }
  // 세트 사이 코치가 "지난번보다 무겁게"라고 말하면 어시스트 종목에선 정반대 지시가 된다.
  if (isReverseProgression(ex.name)) {
    ctx += '- ⚠️ 이 종목은 어시스트(보조) 기구다: 화면의 kg은 **보조 무게**이며 낮출수록 어려워진다. 더 힘들게 = 보조 −5kg, 더 쉽게(통증·실패 시) = 보조 +5kg. 하한 0kg(맨몸).\n';
  }
  var safety = checkExerciseSafety(ex.name);
  if (safety.level === 'caution') {
    ctx += '- ⚠️ 사용자 부상(' + INJURY_AREAS[safety.area].kr + ') 주의 종목: ' + (safety.mod || '가볍게, 통증 없는 범위로') + '\n';
  } else if (safety.level === 'contra') {
    ctx += '- 🚫 사용자 부상(' + INJURY_AREAS[safety.area].kr + ') 금기 종목' + (safety.sub ? ' (대체: ' + safety.sub + ')' : '') + ' — 중단을 권할 것\n';
  }
  return ctx;
}

// SSE(스트리밍) 버퍼에서 완성된 줄만 파싱해 텍스트 조각을 뽑는다 (순수 함수 — 테스트 대상).
// 반환: { deltas: [텍스트 조각들], rest: 아직 줄이 안 끝난 나머지 버퍼 }
function parseSSEStream(buffer) {
  var deltas = [];
  var rest = buffer;
  var idx;
  while ((idx = rest.indexOf('\n')) !== -1) {
    var line = rest.slice(0, idx).replace(/\r$/, '');
    rest = rest.slice(idx + 1);
    if (line.indexOf('data: ') !== 0) continue;
    var payload = line.slice(6);
    try {
      var evt = JSON.parse(payload);
      if (evt.type === 'content_block_delta' && evt.delta && typeof evt.delta.text === 'string') {
        deltas.push(evt.delta.text);
      }
    } catch (e) { /* data가 JSON이 아니면 무시 */ }
  }
  return { deltas: deltas, rest: rest };
}

// 세트 사이 코치 호출 — 스트리밍. onDelta(지금까지의 전체 텍스트)가 조각마다 불린다.
async function callSessionCoachAPI(messages, onDelta) {
  var apiKey = state.apiKey;
  if (!apiKey) return { error: 'API 키가 설정되지 않았습니다. 더보기 > Anthropic API 키에서 설정해주세요.' };

  var coachParts = buildCoachSystemParts();
  var sessionBlock = buildSessionChatContext() +
    '\n## 지금 모드: 세트 사이 짧은 코칭 (중요)\n' +
    '- 사용자는 운동 중이고 휴식 시간에 묻는다. **1~3문장으로 짧게**, 지금 바로 실행할 수 있게 답한다. 긴 설명·목록 금지.\n' +
    '- 통증을 말하면: 무게를 낮추거나 가동범위를 줄이거나 이 종목을 중단하라고 명확히 권한다(안전 우선). 부상 안전 규칙의 금기 종목이면 즉시 거부(VETO)하고 대체를 제시한다.\n' +
    '- 자극이 안 온다고 하면: 자세 큐 1~2개 또는 무게·템포 조정을 제안한다.\n' +
    '- 남은 세트 무게·횟수 판단을 물으면 위 "오늘 완료 세트"와 목표 반복을 근거로 구체적 수치로 답한다.\n';

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' }, // Sonnet 5 기본 생각모드가 max_tokens를 소진해 빈 응답이 오는 사고 방지 (+생각 토큰 요금 절감)
        max_tokens: 512,
        stream: true,
        // 코치 채팅과 같은 stable 블록 재사용 → 프롬프트 캐시 공유로 비용 절감
        system: [
          { type: 'text', text: coachParts.stable, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: coachParts.dynamic + '\n' + sessionBlock }
        ],
        messages: messages
      })
    });

    if (!response.ok) {
      var errorText = await response.text();
      console.error('Session coach API error:', response.status, errorText);
      if (response.status === 401) return { error: 'API 키가 유효하지 않습니다. 더보기에서 키를 확인해주세요.' };
      if (response.status === 429) return { error: '요청 한도 초과. 잠시 후 다시 시도해주세요.' };
      return { error: 'API 오류 (' + response.status + ')' };
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buf = '';
    var full = '';
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buf += decoder.decode(chunk.value, { stream: true });
      var parsed = parseSSEStream(buf);
      buf = parsed.rest;
      if (parsed.deltas.length) {
        full += parsed.deltas.join('');
        if (onDelta) onDelta(full);
      }
    }
    if (!full) return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    return { text: full };
  } catch (error) {
    console.error('세트 사이 코치 호출 실패:', error);
    return { error: '네트워크 오류: ' + error.message };
  }
}

// 사용자 채팅 한 마디에서 통증·자극·RPE 신호 추출 (haiku — 빠르고 저렴).
// 신호가 없거나 실패하면 null. 저장은 사용자 확인 후에만 한다.
async function extractWorkoutSignals(userText, exerciseName) {
  if (!state.apiKey) return null;
  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        system: '운동 중 사용자가 코치에게 보낸 채팅 한 마디에서 신호를 추출한다. JSON만 출력.\n' +
          '형식: {"pain": true|false, "painNote": "부위+증상 요약(10자 내)" 또는 null, "feel": "good"|"bad"|null, "rpe": 1~10 정수 또는 null}\n' +
          '- pain: 지금 이 운동으로 아픔·통증·불편·시큰함·결림을 말할 때만 true. 과거 이야기, 일반 질문("어깨 아플 땐 뭐가 좋아?")은 false.\n' +
          '- feel: 자극이 잘 온다(good) / 안 온다·엉뚱한 데로 샌다(bad)를 말할 때만.\n' +
          '- rpe: "너무 힘들다"(9), "여유 있다"(6)처럼 강도 표현이 명확할 때만 1~10 정수로.\n' +
          '- 확실하지 않으면 전부 false/null. 절대 추측하지 않는다.',
        messages: [
          { role: 'user', content: '종목: ' + exerciseName + '\n메시지: ' + userText }
        ]
      })
    });
    if (!response.ok) return null;
    var data = await response.json();
    if (!getResponseText(data)) return null;
    var cleaned = getResponseText(data).replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var parsed = null;
    try { parsed = JSON.parse(cleaned); } catch (e) {
      var m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; } }
    }
    if (!parsed) return null;
    // haiku 가 rpe 를 "8" 로 주는 일이 잦다 — 숫자만 받던 예전 판정은 그 신호를 통째로 버렸다.
    // 범위 밖(0, 15)은 클램프하지 않고 버린다: 애매한 강도 신호를 지어내느니 없는 편이 낫다.
    var rpeNum = aiInt(parsed.rpe, null);
    var sig = {
      pain: !!parsed.pain,
      painNote: (parsed.pain && typeof parsed.painNote === 'string') ? parsed.painNote.slice(0, 30) : null,
      feel: (parsed.feel === 'good' || parsed.feel === 'bad') ? parsed.feel : null,
      rpe: (rpeNum !== null && rpeNum >= 1 && rpeNum <= 10) ? rpeNum : null
    };
    if (!sig.pain && !sig.feel && !sig.rpe) return null;
    return sig;
  } catch (error) {
    console.error('신호 추출 실패:', error);
    return null;
  }
}
