// js/ai.js — Anthropic API 호출 + 프롬프트 (코치/루틴/리뷰/정체기)
'use strict';

// AI 응답에서 첫 '{'부터 짝이 맞는 '}'까지 정확히 잘라낸다 (문자열·이스케이프 고려).
// 응답 끝에 잡담이 붙거나, 탐욕적 정규식(/\{[\s\S]*\}/)이 과하게 무는 문제를 막는다.
// 닫는 '}'를 못 찾으면(=응답이 중간에 잘림) null 을 돌려준다.
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
    '   - 사용자가 무게를 낮춘 적이 있으면 그 낮춘 무게가 새 기준선 (1RM 표 무시)\n' +
    '   - 실제 수행 기록 없는 신규 종목만 1RM 추정 사용 (메인 70~80%, 보조 65~75%, 고립 60~70%)\n' +
    '   - 장비 단위로 반올림 (덤벨 2kg·그 외 5kg 배수)\n' +
    '7. **횟수 (type별 필수 가이드 — 루틴 생성 규칙과 동일)**:\n' +
    '   - 메인 복합 (isMain:true): "6-10"\n' +
    '   - 보조 복합 (compound, isMain:false): "8-12"\n' +
    '   - 고립 일반: "10-20"\n' +
    '   - 소근육 고립 (사이드/리어 레터럴 레이즈, 페이스 풀, 푸시다운, 컬류, 카프 레이즈, 힙 어덕션 등): "12-25" (중간~가벼운 무게로 반동 없이 실패 2~3회 전까지)\n' +
    '   ※ 가벼운 무게 다회수 운동을 무겁게 적은 횟수로 추천하지 말 것\n\n' +
    
    '## ❌ 절대 금지\n' +
    '- 자동 분석 무시하고 단일 종목만 평가\n' +
    '- "체스트 프레스 별로" → "인클라인 체스트 프레스로 교체" (같은 부위 재추가 = 무의미)\n' +
    '- 사용자 부족 부위 무시\n' +
    '- 자동 적용된 것처럼 표현 ("수정했어요" X / "어떠세요?" O)\n\n' +
    
    '## 🧬 과학 근거 (인용 시 활용)\n' +
    '- 부위당 주 10~20세트 (Pelland 2024) / RIR 1~3 (Refalo 2023)\n' +
    '- 부위당 주 2회 자극 우월 (Schoenfeld 2016)\n' +
    '- 신장 위치 강조 우월 (Maeo 2023) / 머신=프리웨이트 (Schwanbeck)\n' +
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
        model: 'claude-sonnet-4-5',
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
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    }
    var content = data.content[0].text;

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

    return {
      intent: parsed.intent || (validRoutine ? 'modify' : 'question'),
      reply: parsed.reply || '',
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

      if (!recentLifts[ex.name]) {
        recentLifts[ex.name] = { weight: weight, date: w.date, history: [], lastReps: repsList };
      }
      recentLifts[ex.name].history.push({ weight: weight, date: w.date, reps: repsList });
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
        if (ex && ex.name && thisWeekExNames.indexOf(ex.name) === -1) thisWeekExNames.push(ex.name);
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
    ctx += '※ 큰 근육(가슴·등·대퇴사두·햄스트링·둔근) 주 10~20세트 / 작은 근육(어깨·이두·삼두·종아리·복근) 주 8~16세트가 적정(작은 근육은 복합운동 간접자극을 받아 목표가 낮다). 큰 근육 20+·작은 근육 16+는 수확 체감. 간접(보조근) 세트는 0.5로 합산\n';
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
        var recs = WEAK_PART_EXERCISE_MAP[item.group] || [];
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
      if (pr.weight) {
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
      var repsStr = (info.lastReps && info.lastReps.length) ? ' × ' + info.lastReps.join(',') + '회' : '';
      ctx += '- ' + name + ': ' + info.weight + 'kg' + repsStr + ' (' + daysAgo(info.date) + ')' + marker + '\n';
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
    '5. **근손실 방지 넛지** — 체지방을 빼는 시기에도 근육을 지키려면 웨이트(근력운동)를 병행하고 단백질을 충분히 확보하라고 조언할 수 있다(앱에 영양 추적 기능은 없으니 일반 텍스트 조언으로만).\n\n' +

    '## 🧬 지식 베이스 (이 내용을 활용해 충실히 답한다)\n' +
    COACH_KNOWLEDGE + '\n' +

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

    '## 응답 스타일\n' +
    '- **길이**: 단순 질문은 2~4문장. 자세·부상·식단 전략처럼 설명이 필요한 질문은 필요한 만큼 충분히(소제목·목록 사용 가능). 묻지 않은 것까지 늘어놓지 말 것.\n' +
    '- **구체**: "더 무겁게" X → "65 → 67.5kg" O.\n' +
    '- **담백하고 전문적**: 군더더기 인사·응원 없이 본론부터. 코치다운 자신감으로 한국어로 답한다.\n' +
    '- 강조는 **굵게**, 운동명은 `백틱`.';

  var dynamic = '## 📌 기억 노트 (이 사용자에 대해 장기 기억 — 부상·선호·목표·일정)\n' +
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
        model: 'claude-sonnet-4-5',
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
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    }
    var text = data.content[0].text;
    
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
    '- 부위당 주 2회 자극이 1회보다 우월 (Schoenfeld 2016)\n' +
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
        model: 'claude-sonnet-4-5',
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
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return null;
    }
    var content = data.content[0].text;
    
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
      title: parsed.title || '',
      reason: parsed.reason || '',
      caution: parsed.caution || '',
      suggestion: parsed.suggestion || '',
      intensity: parsed.intensity || 'moderate',
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

  var systemPrompt = '당신은 과학적 근거 기반 피트니스 코치다. ' +
    info.name + ' (' + info.kor + ') 루틴 5~7개 종목 생성. JSON으로만 응답.\n' +
    
    '═════════════════════════════════════\n' +
    '📋 [데이터] 사용자 컨텍스트\n' +
    '═════════════════════════════════════\n' +
    context + '\n' +
    (injuryMemory.length ? ('## 🩹 부상·제약 (안전 최우선 — 종목 선택 시 반드시 반영)\n' + formatCoachMemoryForPrompt(injuryMemory) + '\n\n') : '') +

    '═════════════════════════════════════\n' +
    '🏋️ [데이터] ' + info.name + ' 사용 가능 종목 풀\n' +
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
- 각 항목 옆의 "목표 N세트까지 N세트 더"를 읽고, 이번 세션의 그 부위 세트 수를 그 격차에 맞춰 정한다(많이 부족할수록 세트를 더, 거의 찼으면 적게). 주간 목표는 부위 크기별로 다르다 — 큰 근육(가슴·등·대퇴사두·햄스트링·둔근) 약 12세트, 작은 근육(어깨·이두·삼두·종아리·복근) 약 8세트(복합운동 간접자극을 받아 목표가 낮다).
- 세션당 한 부위 직접 세트는 약 8세트 이하로 둔다(소프트 상한 — 정밀 근거는 아직 약함). 격차가 커서 한 세션에 다 못 넣으면 초과분은 그 주 두 번째 세션으로 분할한다.
- 컨텍스트 "🔥 수확 체감 구간"으로 표시된 부위는 더 늘리지 않는다. 단 이는 절대 상한이 아니라 수확 체감 지점이다(큰 근육 20+·작은 근육 16+, 넘어도 성장이 멈추는 건 아님) — "금지선"처럼 단정하지 말 것.

**3. 다양성 (같은 주 중복 회피)**
- 컨텍스트 "이번 주 이미 수행한 종목"에 있는 종목은 이번 루틴에 다시 넣지 않는다 — 같은 부위라도 다른 종목·각도로 새 자극을 준다. "최근 종목별 실제 수행"과도 가능하면 안 겹치게. (단, 부족 부위 보충·점진적 과부하가 우선)

**4. 종목 수·구성**
- 부위별 1~3개(4개 이상 = 과잉), 동일 부위·동일 각도 중복 금지.
- 메인 복합 1~2개(isMain: true, type "복합")로 시작한다.
- isMain: true는 종목 풀에 **[메인가능]**으로 표시된 종목만 가능하다(자유중량 대형 복합 + 큰 하체 머신 = 레그프레스·핵스쿼트). 머신·케이블 복합(체스트 프레스·펙덱·시티드 로우·랫풀다운 등)과 고립은 메인이 될 수 없다(isMain:false, 보조).

**5. 모든 세트 RIR 밴드 명시 (평상시·도전 모드 전부 포함)**
- RIR = 그 세트에서 힘이 다 빠지기 전 남긴 반복 수(0 = 완전 실패).
- 기본 밴드: 복합 = RIR 2~3, 고립·머신 = RIR 0~2(마지막 세트만 0~1).
- 무거운 바벨 복합(스쿼트·데드리프트·벤치 등)에는 완전 실패(RIR 0)를 넣지 않는다 — 부상·피로 대비 이득이 없다.
- RIR은 마감 판단용 소프트 기준이지 통과/탈락 게이트가 아니다(자가 보고라 부정확). RIR 4가 나와도 "정크 세트"로 낙인찍지 말고, 다음 세트나 다음 세션에서 반복·무게로 조금씩 당긴다.

**6. 반복 범위 (근비대 중심)**
- 메인 복합: 6~10
- 보조 복합: 8~12
- 고립: 10~20 (사이드/리어 레터럴 레이즈, 페이스풀, 푸시다운, 컬, 카프 레이즈 등 소근육 고립은 12~25 — 아래 6-1)
- 근력 편향 5~8은 쓰지 않는다.

**6-1. 소근육 고립 = 고반복 통제 (실용 권장)**
- 측면·후면 어깨, 종아리, 이두 등 **소근육 고립**은 중간~가벼운 무게로 **12~25회**, 반동 없이 통제해서 실패 2~3회 전까지 수행한다.
- 이유: 근비대는 반복수와 거의 무관하지만, 소근육 고립을 무겁게 실으면 관절·힘줄 부담·승모근 개입·반동으로 타깃 자극이 줄고 부상 위험이 커지므로, 실용적으로 고반복을 기본값으로 둔다("저중량 고반복이 근비대에 더 우월"이라서가 아니다).
- 너무 가볍게(약 30회 초과) 가지 말 것 — 가벼운 세트일수록 반드시 실패 근처까지 민다.
- 이 규칙은 소근육 고립에만 적용한다. 복합운동(스쿼트·벤치 등)엔 적용하지 않는다.

**7. 무게 — 더블 프로그레션 + 실제 수행 우선**
- "최근 종목별 실제 수행" 표가 있으면 그 무게가 시작점이다(1RM 표보다 우선). 사용자가 낮춘 무게가 있으면 그 낮춘 값을 새 기준선으로 쓴다.
- 더블 프로그레션: 먼저 반복을 목표 범위 안에서 올리고, 목표 범위 상단을 2세션 연속 달성했을 때만 무게를 장비 단위 한 칸 올린다(8번). 1세션 만에 올리지 않는다.
- 목표 미달이면 같은 무게 유지.
- 신규 종목(실제 수행 기록 없음)만 컨텍스트 "1RM + 추천 작업 무게"의 메인/보조/고립 값을 그대로 쓴다(이미 장비 단위로 스냅됨). 특정 반복 목표로 추정이 필요하면 근사표: 6회≈82% · 8회≈77% · 10회≈73% · 12회≈68% · 15회≈65% (집단 평균 추정치 — 상체·고립은 편차가 커서 첫 세션 후 RIR로 재보정).
- 1RM도 실제 수행도 없으면 weight: null (사용자가 측정).

**8. ★무게 스냅 — 반드시 장비 단위로 딱 떨어지게**
- 추천 weight는 실행 가능한 값이어야 한다: 덤벨 종목 = 2kg 배수, 그 외(머신·케이블·바벨·스미스) = 5kg 배수. 62.5·47.5kg처럼 못 맞추는 값 금지.
- 실제 수행값이 장비 단위와 안 맞으면 가장 가까운 배수로 맞춘다.
- 증량 폭도 장비 단위 한 칸: 덤벨 +2kg / 그 외 +5kg. (컨텍스트에 "+2.5kg"라고 적혀 있어도 장비 단위로 반올림한다.)
- 머신 5kg는 한 칸이 큰 점프라, 그래서 7번 더블 프로그레션(반복부터 채우고 → 2세션 연속 상단일 때만 +5kg)이 정석이다.

**9. 분할(간접) 세트 보정 + 필수 고립 슬롯**
- 복합운동은 보조근(팔·어깨 등)에 절반 정도(약 0.5세트)만 쌓인다(정밀값 아닌 휴리스틱).
- 따라서 팔(이두·삼두)·측면 어깨·후면 어깨·종아리는 복합만으로는 볼륨이 안 찬다 → 직접 고립 종목을 넣는다.
- 어깨가 들어가는 세션에는 후면 어깨(리어 델트) 고립을 반드시 1개 넣는다(프레스로 대체 불가).

**10. 신장 강조·부위 커버 (소프트 가중, 단정 금지)**
- 부위별로 근육이 늘어난 자세에서 부하가 큰 종목(신장 강조)을 최소 1개 가볍게 우선한다(삼두 = 오버헤드, 햄스트링 = 시티드 레그컬, 종아리 = 스탠딩 등). 풀에 "신장강조" 태그로 표시된다.
- 가슴은 상부(인클라인)+중/하부, 등은 수직(풀다운·풀업)+수평(로우)을 고루 커버한다.
- 단 이건 저비용 헤지(있으면 약간 이득)일 뿐 주 지렛대가 아니다 — "이게 있어야 큰다"는 식으로 과대선전하지 말 것.

**11. 순서 = 약점/강조 부위를 앞에 (근비대엔 순서 자체는 무관)**
- 종목 순서가 근비대 결과를 바꾸지는 않는다. 다만 먼저 하는 종목이 가장 신선하므로, 부족·약점·강조하고 싶은 부위를 1~2번째 슬롯에 둔다. 나머지 순서는 자유.

**12. 컨디션 반영 (자동 조절)**
- 컨텍스트 "컨디션 추이"로 강도를 조절한다:
  - 평균 RPE ≥ 8.5 또는 컨디션 ≤ 2 = 회복 모드: 볼륨 -20%, RIR을 한두 칸 위로(복합 3~4), intensity "light".
  - 평균 RPE 7~8.4 또는 컨디션 3 = 평상시(위 5번 밴드 그대로), intensity "moderate".
  - 평균 RPE < 7 + 컨디션 4~5 = 도전 가능(밴드 하단까지 밀기), intensity "challenging".
  - 컨디션 데이터 3회 미만 = 표본 부족, 평상시 처리.

**13. 디로드 (주기화 — 피로·부상 관리용)**
- 다음 중 하나면 디로드 처방을 한다: 컨텍스트 사이클 단계가 "디로드"이거나, (정체 🔥 3세션 + 컨디션 저하)가 동시일 때.
- 처방: 종목은 그대로 유지, 세트 수 -40~50%, RIR 3~4(밴드 여유롭게), intensity "light", 약 1주.
- 이 감량은 "성장 부스터"가 아니라 누적 피로·관절·부상 회복용이다(디로드가 근성장을 더 늘린다는 직접 근거는 약함). caution에 "회복·부상 예방용 주간"이라고 적는다.

## 🧬 과학 근거 (요지)
- 주간 볼륨이 근비대 1순위 동력, 부위당 주 10~20세트가 실용 최적(Pelland 2024; Baz-Valle 2022) — 20+는 수확 체감이지 금지선이 아니다. 작은 근육(어깨·이두·삼두·종아리)은 복합운동 간접자극을 받아 목표가 약 절반(주 8~16세트)으로 낮다.
- 실패 근접도(RIR)가 근비대에 유의미하나 완전 실패까진 불필요, 6~12회가 효율 스윗스팟이며 5~30회 모두 유효(Refalo 2023; Schoenfeld·Grgic 2021).
- 머신 = 프리웨이트 동등(Schwanbeck). 신장 강조 소폭 우위(Maeo 2021·2023, 효과는 작고 논쟁적). 종목 순서는 근비대에 사실상 무관(Nunes 2021).
- 휴식: 복합 2~3분, 고립 1~2분(휴식이 짧으면 다음 세트 볼륨이 깎인다).

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
- 각 exercise에 rest(휴식 초) 필수: 복합 "120-180", 고립 "60-120".
- rir은 밴드 문자열(복합 "2-3", 고립 "0-2").
- weight는 장비 단위 스냅값(덤벨 2kg·그 외 5kg 배수) 또는 null.
- duration은 추정치일 뿐 상한이 없다(시간 제한 없음 — 슈퍼셋을 강제하지 말 것).

## 응답 전 체크
☐ 부상·제약 부위에 통증 주는 종목을 회피했나?
☐ 부족 부위를 포함하고 세트 수를 "N세트 더" 격차(큰 근육 12·작은 근육 8 목표)에 맞췄나?
☐ 모든 종목에 reps(메인 6~10 / 보조 8~12 / 고립 10~20 · 소근육 고립 12~25)·rir 밴드·rest를 넣었나?
☐ 모든 weight가 장비 단위(덤벨 2kg·그 외 5kg)로 딱 떨어지나?
☐ isMain:true가 [메인가능] 종목인가? (머신·케이블 복합·고립은 메인 불가)
☐ 팔·측면/후면 어깨·종아리가 있으면 직접 고립을 넣었나? (어깨 세션 = 리어델트 필수)
☐ 신장 강조 1개+? 메인 1~2개? 한 부위 4개 미만?
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
        model: 'claude-sonnet-4-5',
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
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    }
    var content = data.content[0].text;
    
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
    
    return {
      bodyPart: bodyPart,
      headline: parsed.headline || (info.name + ' 루틴'),
      reason: parsed.reason || '',
      duration: parsed.duration || 60,
      totalSets: parsed.totalSets || parsed.exercises.reduce(function(s, e) { return s + (e.sets || 3); }, 0),
      intensity: parsed.intensity || 'moderate',
      caution: parsed.caution || '',
      exercises: parsed.exercises.map(function(ex) {
        return {
          name: ex.name || '종목',
          type: ex.type || '보조',
          isMain: !!ex.isMain,
          sets: ex.sets || 3,
          reps: ex.reps || '8-12',
          weight: ex.weight ? snapWeightToEquipment(ex.weight, ex.name) : null,
          rir: ex.rir || 2,
          rest: ex.rest || null,
          note: ex.note || ''
        };
      }),
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('루틴 생성 호출 실패:', error);
    return { error: error.message };
  }
}

// 운동 화면 진입 시 AI 추천 로드
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
  
  state.aiRecLoading = true;
  render();
  
  var rec = await fetchAIRecommendation();
  state.aiRecommendation = rec;
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
      if (p.weight) {
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
        else if (Array.isArray(ex.setsDetail)) setCount = ex.setsDetail.filter(function(s) { return s.completed && !s.isWarmup; }).length;
        else if (Array.isArray(ex.sets)) setCount = ex.sets.filter(function(s) { return s.completed && !s.isWarmup; }).length;
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
      var status = vol < loV ? '🔴 부족' : (vol < mevV ? '🟡 MEV' : (vol <= optV ? '🟢 적정' : '🔥 과잉'));
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
    '- **운동 빈도**: 부위당 주 2회 자극 우월 (Schoenfeld 2016)\n' +
    '- **부위 볼륨**: 큰 근육(가슴·등·다리·둔근) 주 10~20세트 / 작은 근육(팔·어깨·종아리) 주 8~16세트 적정 (Pelland 2024, 간접세트 0.5 합산). 작은 근육은 복합운동 간접자극으로 목표가 낮다. 하한 미만 = 부족, 상한 초과 = 수확 체감\n' +
    '- **부위 균형**: PUSH/PULL/LEGS 골고루. 한 부위만 과잉 X.\n' +
    '- **체중 변화**: 리컴포지션 목표 시 ±0.3kg/주 적정\n' +
    '- **PR 갱신**: 점진적 과부하 성과 지표\n\n' +
    
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
    '- 사이클: ' + profile.currentCycle + '차 / ' + profile.currentWeek + '주차 (' + profile.cyclePhase + ')\n\n' +
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
        model: 'claude-sonnet-4-5',
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
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return null;
    }
    var content = data.content[0].text;
    
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
      headline: parsed.headline || '',
      grade: parsed.grade || 'B',
      wins: Array.isArray(parsed.wins) ? parsed.wins : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      nextWeek: Array.isArray(parsed.nextWeek) ? parsed.nextWeek : [],
      coachNote: parsed.coachNote || '',
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

// 정체기 신호 감지 (규칙 기반 pre-check)
function detectPlateauSignals() {
  var today = new Date();
  var twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);
  
  var signals = [];
  
  // 1. PR 갱신 없음 (2주)
  var recentPRs = state.data.personalRecords.filter(function(p) {
    return new Date(p.date) >= twoWeeksAgo;
  });
  if (recentPRs.length === 0 && state.data.workoutLog.length > 5) {
    signals.push('pr_stalled');
  }
  
  // 2. 체중 변화 없음 (2주, 0.3kg 미만)
  var bodyLog = state.data.bodyLog || [];
  if (bodyLog.length >= 5) {
    var recent = bodyLog.slice(-1)[0];
    var twoWeeksAgoLog = bodyLog.find(function(b) {
      return new Date(b.date) >= twoWeeksAgo;
    });
    if (twoWeeksAgoLog && Math.abs(recent.weight - twoWeeksAgoLog.weight) < 0.3) {
      signals.push('weight_stalled');
    }
  }
  
  // 3. 운동 빈도 감소
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
    'pr_stalled': '최근 2주간 PR 갱신 없음',
    'weight_stalled': '최근 2주간 체중 변화 0.3kg 미만',
    'frequency_drop': '이번 주 운동 빈도가 목표보다 적음'
  };
  
  var signalText = signals.map(function(s) { return '- ' + signalDescriptions[s]; }).join('\n');
  
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
    '- 점진 과부하 실패: 중량/횟수 정체 → 디로드 또는 변형 자극\n' +
    '- 회복 부족: 빈도/수면 → 휴식일 늘리기\n' +
    '- 자극 적응: 같은 종목 6주 이상 → 종목 교체\n\n' +
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
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: '정체기 신호를 분석해서 JSON으로 답하세요.' }
        ]
      })
    });
    
    if (!response.ok) return null;
    
    var data = await response.json();
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return null;
    }
    var content = data.content[0].text;
    
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
      severity: parsed.severity || 'medium',
      diagnosis: parsed.diagnosis || '',
      primary_cause: parsed.primary_cause || '',
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      encouragement: parsed.encouragement || ''
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
  if (signals.length < 2) {
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

  var ALLOWED_TYPES = { warmup: 1, run: 1, walk: 1, cooldown: 1 };
  var DEFAULT_LABEL = { warmup: '워밍업 걷기', run: '뛰기', walk: '걷기 회복', cooldown: '쿨다운 걷기' };
  // 첫 회 기본 하한(사용자=중급): 걷기(회복) ≥5.5, 뛰기 ≥8.0, 워밍업·쿨다운 걷기 5.0. AI가 speed를 빠뜨렸을 때의 기본값.
  var DEFAULT_SPEED = { warmup: 5.0, run: 8.0, walk: 5.5, cooldown: 5.0 };

  // 속력 숫자 정리: km/h, 1~20 클램프, 소수 1자리. 이상값이면 종류별 기본값.
  function cleanSpeed(v, type) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) n = DEFAULT_SPEED[type] || 4;
    if (n < 1) n = 1;
    if (n > 20) n = 20;
    return Math.round(n * 10) / 10;
  }

  // AI/폴백 구간(길이 sec 기반)을 totalSec에 "정확히" 맞춘다.
  //  - 각 구간 경계를 30초 배수(30·60·90…)로 스냅한다 → 모든 구간 길이가 30초 단위(연구: ±15~30초 진행).
  //  - totalSec은 항상 60의 배수(mins*60)라 30 격자로 스냅해도 총합은 정확히 totalSec(초과·미달 0).
  //  - 종류/속력 이상값 정리, 퇴화(0초) 구간 제거, 첫 구간 0초부터 연속 보장.
  function fitToTotal(raw) {
    var clean = [];
    var sum = 0;
    for (var i = 0; i < raw.length; i++) {
      var seg = raw[i] || {};
      var type = ALLOWED_TYPES[seg.type] ? seg.type : 'walk';
      var sec = Number(seg.sec);
      if (!isFinite(sec) || sec <= 0) continue;
      clean.push({
        type: type,
        sec: sec,
        speed: cleanSpeed(seg.speed, type),
        label: (typeof seg.label === 'string' && seg.label.trim()) ? seg.label.trim() : (DEFAULT_LABEL[type] || '구간')
      });
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
      out.push({
        startSec: prev,
        endSec: end,
        type: clean[j].type,
        speed: clean[j].speed,
        label: clean[j].label
      });
      prev = end;
    }
    if (!out.length) return null;
    // 마지막 구간이 정확히 끝(totalSec)까지 덮게 보정
    if (out[out.length - 1].endSec !== totalSec) out[out.length - 1].endSec = totalSec;
    return out;
  }

  // 지난 유산소 기록 요약 → 점진·게이트 컨텍스트. 기록 없으면 첫 회 안내.
  function cardioHistoryContext() {
    var log = (state.data && Array.isArray(state.data.cardioLog)) ? state.data.cardioLog : [];
    if (!log.length) return '기록 없음 — 첫 회입니다. 위 "첫 회 처방"을 그대로 적용하고, 속력 욕심 없이 완주를 목표로 보수적으로 짜세요.';

    var sorted = log.slice().sort(function(a, b) {
      var da = (a && a.date) ? String(a.date) : '';
      var db = (b && b.date) ? String(b.date) : '';
      if (da === db) return 0;
      return da < db ? 1 : -1;                             // 최근이 앞으로
    });
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
        model: 'claude-sonnet-4-5',
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
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return fallbackPlan();
    }
    var content = data.content[0].text;

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
