// js/ai.js — Anthropic API 호출 + 프롬프트 (코치/음식/루틴/리뷰/정체기)
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

// ═══════════════════════════════════════════════
// Haiku API 호출 (DB 매칭 실패 시)
// ═══════════════════════════════════════════════
async function analyzeFoodWithAI(text) {
  var apiKey = state.apiKey;
  if (!apiKey) return null;
  
  var systemPrompt = '당신은 한국 음식 영양 분석 전문가입니다. 사용자가 입력한 음식의 단백질(g), 칼로리(kcal), 탄수화물(g), 지방(g)을 분석해 JSON으로만 응답하세요. 양이 명시되지 않으면 일반적인 1인분 기준. 한국 음식과 양 단위(인분, 그릇, 공기, 줌 등)에 익숙합니다. 응답은 반드시 다음 형식의 JSON만 포함하세요:\n{"foods": [{"name": "음식명", "amount": "양 표시(예: 100g)", "protein": 숫자, "kcal": 숫자, "carbs": 숫자, "fat": 숫자}]}\n\n여러 음식이 있으면 foods 배열에 각각 분리. 추가 설명 금지, JSON만 출력.';
  
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
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: text }
        ]
      })
    });
    
    if (!response.ok) {
      var errorText = await response.text();
      console.error('API error:', response.status, errorText);
      return { error: 'API 오류 (' + response.status + ')', detail: errorText };
    }
    
    var data = await response.json();
    if (!data || !Array.isArray(data.content) || data.content.length === 0 || !data.content[0].text) {
      return { error: 'AI 응답이 비어있어요. 다시 시도해주세요.' };
    }
    var content = data.content[0].text;
    
    // JSON 추출 (```json 블록 제거)
    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // JSON 추출 시도 (텍스트 중간에 JSON이 있을 경우)
      var match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw e;
      }
    }
    
    if (!parsed.foods || !Array.isArray(parsed.foods)) {
      return { error: '응답 형식 오류' };
    }
    
    // 형식 정규화
    return {
      foods: parsed.foods.map(function(f) {
        return {
          name: f.name || '음식',
          amount: f.amount || '1인분',
          protein: Math.round((parseFloat(f.protein) || 0) * 10) / 10,
          kcal: Math.round(parseFloat(f.kcal) || 0),
          carbs: Math.round((parseFloat(f.carbs) || 0) * 10) / 10,
          fat: Math.round((parseFloat(f.fat) || 0) * 10) / 10,
          aiAnalyzed: true
        };
      })
    };
  } catch (error) {
    console.error('AI 분석 실패:', error);
    return { error: '네트워크 오류 또는 응답 파싱 실패: ' + error.message };
  }
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
    '6. **무게 — 점진적 과부하 우선**\n' +
    '   - "최근 종목별 실제 수행" 표에 데이터 있으면 그 무게 기준 더블 프로그레션 (상단 횟수 달성 시 +2.5kg, 미달 시 동일)\n' +
    '   - 사용자가 무게를 낮춘 적이 있으면 그 낮춘 무게가 새 기준선 (1RM 표 무시)\n' +
    '   - 실제 수행 기록 없는 신규 종목만 1RM 추정 사용 (메인 70~80%, 보조 65~75%, 고립 60~70%)\n' +
    '   - 2.5kg 단위 반올림\n' +
    '7. **횟수 (type별 필수 가이드)**:\n' +
    '   - 메인 복합 (isMain:true): "5-8" 또는 "6-8"\n' +
    '   - 보조 복합 (compound, isMain:false): "8-10" 또는 "8-12"\n' +
    '   - 고립 일반: "10-15"\n' +
    '   - 소근육 고립 (사이드/리어 레터럴 레이즈, 페이스 풀, 푸시다운, 컬류, 카프 레이즈, 힙 어덕션 등): "12-20"\n' +
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
    '    "exercises": [{"name":"종목","type":"복합|고립|보조","isMain":bool,"sets":3,"reps":"8-10","weight":150,"rir":2,"note":"이유"}]\n' +
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
  var todayStr = getTodayStr();
  
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
  
  // 오늘 영양
  var todayMeals = state.data.nutritionLog.filter(function(m) { return m.date === todayStr; });
  var todayProtein = todayMeals.reduce(function(s, m) { return s + (m.protein || 0); }, 0);
  var todayKcal = todayMeals.reduce(function(s, m) { return s + (m.kcal || 0); }, 0);
  var thresholdCnt = todayMeals.filter(function(m) { return m.thresholdPassed; }).length;
  
  // 최근 7일 단백질 평균
  var sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  var sevenDaysAgoStr = getDateStr(sevenDaysAgo);
  var recentMeals = state.data.nutritionLog.filter(function(m) { return m.date >= sevenDaysAgoStr; });
  var dailyP = {};
  recentMeals.forEach(function(m) {
    if (!dailyP[m.date]) dailyP[m.date] = 0;
    dailyP[m.date] += m.protein || 0;
  });
  var avgP7 = Object.values(dailyP).length > 0 
    ? Math.round(Object.values(dailyP).reduce(function(s, p) { return s + p; }, 0) / Object.values(dailyP).length) 
    : 0;
  
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
  
  // 정체기 감지: 최근 3회 같은 무게 시 표시
  Object.keys(recentLifts).forEach(function(name) {
    var hist = recentLifts[name].history.slice(0, 3);
    if (hist.length >= 3 && hist[0].weight === hist[1].weight && hist[1].weight === hist[2].weight) {
      recentLifts[name].plateau = true;
    }
  });
  
  // 컨텍스트 문자열 구성
  var pullupRangeStr = profile.pullupRange || '4~8';
  var ctx = '## 사용자 정보\n';
  ctx += '- 나이: ' + profile.age + '세, 키: ' + profile.height + 'cm, 체중: ' + currentWeight + 'kg\n';
  ctx += '- 목표: 린매스 (체지방↓ + 근육↑)\n';
  ctx += '- 경력: 명목상 중급, 실질 초~중급\n';
  ctx += '- 환경: 헬스장 머신/덤벨 위주, 풀업 ' + pullupRangeStr + '개 가능\n';
  ctx += '- 사이클: ' + profile.currentCycle + '차 / ' + profile.currentWeek + '주차 (' + profile.cyclePhase + ')\n';
  ctx += '- 목표: 단백질 ' + profile.proteinTarget + 'g, 칼로리 ' + profile.calorieTarget + 'kcal/일, 주 ' + profile.workoutFreq + '회 운동\n\n';
  
  ctx += '## 오늘 상태 (' + todayStr + ')\n';
  ctx += '- 단백질: ' + todayProtein + 'g / ' + profile.proteinTarget + 'g (' + thresholdCnt + '/4 끼니 임계점 통과)\n';
  ctx += '- 칼로리: ' + todayKcal + 'kcal\n';
  if (todayMeals.length > 0) {
    ctx += '- 오늘 먹은 끼니: ' + todayMeals.map(function(m) { return m.mealKr + '(' + m.protein + 'g)'; }).join(', ') + '\n';
  } else {
    ctx += '- 아직 기록한 끼니 없음\n';
  }
  ctx += '\n';
  
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
  ctx += '- PUSH: ' + pushCnt + '회, PULL: ' + pullCnt + '회, LEGS: ' + legsCnt + '회\n';
  ctx += '- 단백질 7일 평균: ' + avgP7 + 'g (목표 ' + profile.proteinTarget + 'g)\n';
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
    ctx += '※ Pelland 2024: 부위당 주 10~20세트가 최적 / 4세트 미만 = 부족 / 20세트 초과 = 과잉\n';
    ctx += '※ 가슴 = chest+chest_upper+chest_lower 합산. 어깨 측면/전면/후면 별도. 등 중부 = upper_back+traps.\n';
    
    // 그룹 단위로 표시 (가슴 합산)
    var partVolStrs = [];
    Object.keys(BODY_PART_GROUPS).forEach(function(g) {
      var vol = (groupedVol[g] || 0) / 2;
      if (vol > 0) {
        var status = vol < 4 ? '🔴' : (vol < 10 ? '🟡' : (vol <= 20 ? '🟢' : '🔥'));
        partVolStrs.push(status + ' ' + BODY_PART_GROUPS[g].kr + ' ' + vol.toFixed(1));
      }
    });
    if (partVolStrs.length > 0) {
      ctx += partVolStrs.join(' / ') + '\n';
    }
    
    if (diagnosis.lacking.length > 0) {
      ctx += '⚠️ **부족 부위 (보충 필요)**:\n';
      diagnosis.lacking.forEach(function(item) {
        var recs = WEAK_PART_EXERCISE_MAP[item.group] || [];
        ctx += '- ' + item.label;
        if (recs.length > 0) {
          ctx += ' → 권장 종목: ' + recs.slice(0, 3).join(', ');
        }
        ctx += '\n';
      });
    }
    if (diagnosis.excessive.length > 0) {
      ctx += '🔥 **과잉 부위 (휴식 권장)**: ' + diagnosis.excessive.map(function(e) { return e.label; }).join(', ') + '\n';
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
      ctx += '## 🔥 정체기 감지 (3회 이상 같은 무게)\n';
      ctx += '- ' + plateauList.join(', ') + '\n';
      ctx += '- 권장: +2.5kg 도전 또는 종목 변경 / 더블 프로그레션 적용\n\n';
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
        legs: ['quads', 'hamstrings', 'glutes', 'glutes_med', 'calves', 'adductors', 'abs', 'obliques']
      };
      partFilter = partKeysByGroup[focusBodyPart] || null;
    }
    
    ctx += '## 🏋️ 사용자 1RM + 추천 작업 무게' + (focusBodyPart ? ' (' + focusBodyPart.toUpperCase() + ' 부위만)' : ' (부위별)') + '\n';
    ctx += '※ 메인(70%)/보조(65%)/고립(60%) 단순 계산. **이 표는 "최근 실제 수행" 기록이 없는 신규 종목에만 사용**. 위 "최근 실제 수행" 표가 있으면 그쪽이 우선.\n\n';
    
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
        var main = Math.round(rm * 0.70 / 2.5) * 2.5;
        var sub = Math.round(rm * 0.65 / 2.5) * 2.5;
        var iso = Math.round(rm * 0.60 / 2.5) * 2.5;
        ctx += '- ' + name + ': 1RM ' + rmDisplay + 'kg → 메인 ' + main + 'kg / 보조 ' + sub + 'kg / 고립 ' + iso + 'kg\n';
      });
    });
    ctx += '\n';
  }
  
  // 영양 × 운동 연결 분석
  var workedOutToday = state.data.workoutLog.some(function(w) { return w.date === todayStr; });
  if (workedOutToday) {
    var proteinDeficit = profile.proteinTarget - todayProtein;
    if (proteinDeficit > 30) {
      ctx += '## ⚠️ 영양·회복 경고\n';
      ctx += '- 오늘 운동 완료. 현재 단백질 ' + todayProtein + 'g (목표 대비 -' + proteinDeficit + 'g 부족)\n';
      ctx += '- 회복 위해 단백질 ' + proteinDeficit + 'g 추가 섭취 권장 (운동 후 24시간 내 핵심)\n\n';
    } else if (todayKcal < profile.calorieTarget * 0.6) {
      ctx += '## ⚠️ 영양·회복 경고\n';
      ctx += '- 오늘 운동 완료. 칼로리 ' + todayKcal + 'kcal (목표의 60% 미만)\n';
      ctx += '- 큰 적자 시 근손실 위험. 추가 섭취 권장\n\n';
    }
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
  var stable = '당신은 사용자의 개인 피트니스 코치다. 운동생리학·영양학·스포츠과학의 메타분석 근거와 아래 지식 베이스에 기반해 코칭한다.\n\n' +

    '## 코칭 원칙\n' +
    '1. **근거 우선** — 메타분석/원리를 근거로 말한다. 확실하지 않으면 모른다고 밝히고 추측을 단정하지 않는다.\n' +
    '2. **데이터 기반 개인화** — 내 데이터(부족/과잉 부위, 1RM, 단백질 평균 등)에 관한 질문은 그 데이터를 직접 인용한다.\n' +
    '3. **사용자 환경 존중** — 머신/덤벨 중심. 프리웨이트 강요 금지.\n' +
    '4. **점진적 과부하** — 구체적 수치 (예: 62.5 → 65kg).\n\n' +

    '## 🧬 지식 베이스 (이 내용을 활용해 충실히 답한다)\n' +
    COACH_KNOWLEDGE + '\n' +

    '## 답변 방식 (질문 유형별 — 중요)\n' +
    '사용자 메시지를 두 종류로 구분해 답한다.\n' +
    '1. **개인 데이터 질문** (내 루틴/볼륨/무게/단백질/진도 등 "나"에 관한 것)\n' +
    '   → 아래 "사용자 현재 데이터"를 직접 인용해 개인화한다. 데이터에 없는 내 수치를 지어내지 말 것.\n' +
    '2. **일반 운동·영양 지식 질문** (종목 자세, 부상·통증, 식단 전략, 보충제, 원리 등)\n' +
    '   → 위 지식 베이스와 너의 운동과학 지식으로 충실하고 구체적으로 답한다. 막연한 응원 대신 근거(메타분석/원리)를 들어 설명하고, 확실하지 않은 부분은 불확실하다고 밝힌다.\n' +
    '3. 두 종류가 섞이면 일반 지식으로 원리를 설명한 뒤 사용자 데이터로 개인화한다.\n\n' +

    '## 🎯 개인 데이터 인용 예시\n' +
    '- "이번 주 어깨 측면 주 2.5세트로 부족해요" (부위별 볼륨 인용)\n' +
    '- "1RM 레그프레스 240kg 기준, 작업 무게 168kg 권장" (1RM 인용)\n' +
    '- "단백질 7일 평균 130g인데 목표 155g과 25g 차이" (영양 인용)\n' +
    '- "체스트프레스 65kg 3회 연속 같음 = 정체기, +2.5kg 도전" (정체기 활용)\n' +
    '※ "부위별 주간 볼륨"은 그룹 합산(가슴 = chest+chest_upper+chest_lower 등). 그대로 인용 OK.\n\n' +

    '## 응답 스타일\n' +
    '- **길이**: 단순 질문은 2~4문장. 자세·부상·식단 전략처럼 설명이 필요한 질문은 필요한 만큼 충분히(소제목·목록 사용 가능). 묻지 않은 것까지 늘어놓지 말 것.\n' +
    '- **구체**: "더 무겁게" X → "65 → 67.5kg" O.\n' +
    '- **친근하면서 전문적**: 코치다운 자신감. 한국어로 답한다.\n' +
    '- 강조는 **굵게**, 운동명은 `백틱`.\n\n' +

    '## 기억 규칙\n' +
    '대화에서 앞으로도 기억할 가치가 있는 새 정보(부상·제약, 선호, 목표, 일정)를 알게 되면, ' +
    '응답 맨 끝에 아래 형식의 숨김 블록을 덧붙여라(사용자에겐 표시되지 않음). 새 정보가 없으면 블록을 생략한다.\n' +
    '```memory\n[{"category":"injury|preference|goal|schedule|other","text":"한 줄 요약"}]\n```\n' +
    '기억 노트에 이미 있는 내용은 다시 쓰지 마라. 임시적인 잡담은 기억하지 마라.';

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
    '4. **사이클 단계 고려**: 적응기 light, 구축기 moderate, 강화기 challenging\n' +
    '5. **수면/회복 신호**: 데이터 부족하면 moderate 안전 권장\n\n' +
    
    '## 응답 형식\n' +
    '{\n' +
    '  "session": "push" | "pull" | "legs" | "free",\n' +
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
    var validSessions = ['push', 'pull', 'legs', 'free'];
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
      byPart[partKr].push(name + ' [' + tags.join('/') + ', 1RM ' + Math.round(oneRMData[name]) + 'kg]');
      addedNames[name] = true;
    });
    
    var lines = [];
    Object.keys(byPart).forEach(function(p) {
      lines.push('- ' + p + ': ' + byPart[p].join(', '));
    });
    return lines.join('\n');
  }
  
  var systemPrompt = '당신은 과학적 근거 기반 피트니스 코치다. ' +
    info.name + ' (' + info.kor + ') 루틴 5~7개 종목 생성. JSON으로만 응답.\n' +
    
    '═════════════════════════════════════\n' +
    '📋 [데이터] 사용자 컨텍스트\n' +
    '═════════════════════════════════════\n' +
    context + '\n' +
    
    '═════════════════════════════════════\n' +
    '🏋️ [데이터] ' + info.name + ' 사용 가능 종목 풀\n' +
    '═════════════════════════════════════\n' +
    getExercisePoolFor(bodyPart) + '\n\n' +
    
    '═════════════════════════════════════\n' +
    '⚖️ [규칙] 루틴 구성 원칙\n' +
    '═════════════════════════════════════\n' +
    
    '## 핵심 원칙 (사용자 데이터 + 과학 근거)\n' +
    '1. **부족 부위 우선 보충** — 컨텍스트 "부족 부위" 리스트의 부위를 메인/고립으로 1~2개 포함\n' +
    '2. **부위별 1~3개** (4개 이상 = 과잉) / 동일 부위·각도 중복 금지\n' +
    '   - **다양성 (중요)**: 컨텍스트 "이번 주 이미 수행한 종목"에 있는 종목은 이번 루틴에 **다시 넣지 않는다** — 같은 부위라도 다른 종목·각도로 새로운 자극을 준다. "최근 종목별 실제 수행"과도 가능하면 겹치지 않게 한다. (부족 부위 보충·점진적 과부하는 우선)\n' +
    '3. **메인 1~2개** (isMain: true, 복합, 첫 1~2번째) + **신장 강조 최소 1개**\n' +
    '4. **순서**: 메인 복합 → 보조 복합 → 고립 → 신장 강조 → 펌프\n' +
    '5. **무게 — 점진적 과부하 우선**\n' +
    '   - "최근 종목별 실제 수행" 표에 데이터가 있으면 → 그 무게를 시작점으로 사용\n' +
    '     · 마지막 세션 모든 본 세트가 목표 횟수 상단(예: 8-12에서 12회) 달성 → 무게 +2.5kg\n' +
    '     · 미달 → 같은 무게 유지\n' +
    '     · 사용자가 무게를 낮춘 적이 있으면 그 낮춘 무게를 새 기준선으로 사용 (1RM 표 무시)\n' +
    '   - 실제 수행 기록이 없는 신규 종목만 → 1RM 표 사용 (메인 70% / 보조 65% / 고립 60%)\n' +
    '6. 1RM 없고 실제 수행 기록도 없는 종목 → weight: null (사용자가 측정)\n' +
    '7. 정체기(🔥) 표시된 종목은 무게 +2.5kg 도전 또는 종목 교체 제안\n' +
    '8. **횟수 (type별 필수 가이드)**:\n' +
    '   - 메인 복합 (isMain:true, type:"복합"): "5-8" 또는 "6-8"\n' +
    '   - 보조 복합 (type:"보조"): "8-10" 또는 "8-12"\n' +
    '   - 고립 일반 (type:"고립"): "10-15"\n' +
    '   - 소근육 고립 (사이드/리어 레터럴 레이즈, 페이스 풀, 푸시다운, 컬류, 카프 레이즈, 힙 어덕션 등): "12-20"\n' +
    '   ※ 가벼운 무게·다회수가 적절한 종목을 무겁게 적은 횟수로 추천 금지\n' +
    '9. **컨디션 반영**: 컨텍스트 "컨디션 추이"가 있으면 강도 조절 (buildUserContext 분류와 동일)\n' +
    '   - 평균 RPE ≥ 8.5 또는 컨디션 ≤ 2 = 회복 모드 (RIR 3~4, 볼륨 -20%, intensity:"light")\n' +
    '   - 평균 RPE 7~8.4 또는 컨디션 3 = 평상시 (intensity:"moderate")\n' +
    '   - 평균 RPE < 7 + 컨디션 4~5 = 도전 가능 (intensity:"challenging")\n' +
    '   - 컨디션 데이터 3회 미만은 표본 부족, 평상시 처리\n\n' +
    
    '## 🧬 과학 근거\n' +
    '부위당 주 10~20세트 (Pelland 2024) / RIR 1~3 (Refalo) / 5~30회 모두 유효 (IUSCA 2021) / 신장강조 우월 (Maeo 2023) / 머신=프리웨이트 (Schwanbeck) / 휴식 복합 2~3분\n\n' +
    
    '## ❌ 절대 금지\n' +
    '- 한 부위 4개 이상 / 동일 부위·각도 2개 이상 / 메인 0개 / 신장 강조 0개\n' +
    '- 사용자 부족 부위 무시 / 풀에 없는 종목 사용\n\n' +
    
    '## 응답 형식 (JSON만)\n' +
    '{\n' +
    '  "headline": "한 줄 (예: PUSH 어깨 측면 보충)",\n' +
    '  "reason": "왜 (부족 부위 인용 필수, 2~3문장)",\n' +
    '  "duration": 60, "totalSets": 18, "intensity": "moderate", "caution": "",\n' +
    '  "exercises": [{"name":"종목","type":"복합|고립|보조","isMain":bool,"sets":3,"reps":"8-10","weight":150,"rir":2,"note":"이유+근거"}]\n' +
    '}\n\n' +
    
    '## 응답 전 체크\n' +
    '☐ 부족 부위 포함? ☐ 한 부위 4개 미만? ☐ 메인 1~2개? ☐ 신장 강조 1개+? ☐ 무게는 위 표 그대로?';
  
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
          weight: ex.weight || null,
          rir: ex.rir || 2,
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
  
  var weekMeals = state.data.nutritionLog.filter(function(m) {
    var d = new Date(m.date);
    return d >= monday && d <= sunday;
  });
  
  var weekPRs = state.data.personalRecords.filter(function(p) {
    var d = new Date(p.date);
    return d >= monday && d <= sunday;
  });
  
  // 일별 단백질
  var dailyP = {};
  weekMeals.forEach(function(m) {
    if (!dailyP[m.date]) dailyP[m.date] = 0;
    dailyP[m.date] += m.protein || 0;
  });
  var dailyProteins = Object.values(dailyP);
  var avgProtein = dailyProteins.length > 0 
    ? Math.round(dailyProteins.reduce(function(s, p) { return s + p; }, 0) / dailyProteins.length)
    : 0;
  var achievedDays = dailyProteins.filter(function(p) { return p >= state.profile.proteinTarget; }).length;
  
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
    prs: weekPRs,
    avgProtein: avgProtein,
    achievedDays: achievedDays,
    daysTracked: dailyProteins.length,
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
  weekSummary += '- PUSH: ' + weekData.pushCount + '회, PULL: ' + weekData.pullCount + '회, LEGS: ' + weekData.legsCount + '회, FREE: ' + weekData.freeCount + '회\n';
  if (weekData.workouts.length > 0) {
    weekData.workouts.forEach(function(w) {
      var d = new Date(w.date);
      weekSummary += '  · ' + dayMap[d.getDay()] + ': ' + w.sessionKr + ' (' + w.duration + '분, ' + w.sets + '세트)\n';
    });
  }
  weekSummary += '\n### 영양\n';
  weekSummary += '- 단백질 일평균: ' + weekData.avgProtein + 'g (목표 ' + profile.proteinTarget + 'g)\n';
  weekSummary += '- 목표 달성일: ' + weekData.achievedDays + '/' + Math.max(1, weekData.daysTracked) + '일\n';
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
          weeklyVolByPart[s] = (weeklyVolByPart[s] || 0) + setCount * 0.3;
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
      var status = vol < 4 ? '🔴 부족' : (vol < 10 ? '🟡 MEV' : (vol <= 20 ? '🟢 적정' : '🔥 과잉'));
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
  
  var systemPrompt = '당신은 사용자의 피트니스 코치입니다. 이번 주 운동/영양/체중 데이터를 분석해 주간 리뷰를 작성하세요. ' +
    '반드시 JSON으로만 응답하세요.\n\n' +
    
    '## 🧬 평가 기준 (과학 근거)\n' +
    '- **운동 빈도**: 부위당 주 2회 자극 우월 (Schoenfeld 2016)\n' +
    '- **부위 볼륨**: 주 10~20세트 최적 (Pelland 2024). 4세트 미만 = 부족, 20초과 = 과잉\n' +
    '- **부위 균형**: PUSH/PULL/LEGS 골고루. 한 부위만 과잉 X.\n' +
    '- **단백질**: 목표 달성률 (1.6~2.2g/kg 권장)\n' +
    '- **체중 변화**: 리컴포지션 목표 시 ±0.3kg/주 적정\n' +
    '- **PR 갱신**: 점진적 과부하 성과 지표\n\n' +
    
    '## 등급 기준\n' +
    '- S: 운동 빈도 달성 + 부위 균형 + 단백질 90%+ + PR 갱신 있음\n' +
    '- A: 운동 빈도 달성 + 단백질 80%+\n' +
    '- B: 운동 빈도 70%+ 또는 단백질 70%+\n' +
    '- C: 부분 달성 (40~60%)\n' +
    '- D: 거의 미실행 (40% 미만)\n\n' +
    
    '## 응답 형식\n' +
    '{\n' +
    '  "headline": "이번 주 핵심 한 줄 (예: 운동 빈도 좋았으나 어깨 측면 부족)",\n' +
    '  "grade": "S" | "A" | "B" | "C" | "D",\n' +
    '  "wins": ["잘한 점 1 (구체적 수치 인용)", "잘한 점 2", "잘한 점 3"],\n' +
    '  "improvements": ["개선점 1 (구체적 부위/수치)", "개선점 2"],\n' +
    '  "nextWeek": ["다음 주 조정 1 (예: 어깨 측면 주 +4세트 추가)", "다음 주 조정 2", "다음 주 조정 3"],\n' +
    '  "coachNote": "마지막 격려/지적 한 문단 (사용자 데이터 직접 인용)"\n' +
    '}\n\n' +
    
    '## 사용자 프로필\n' +
    '- ' + profile.age + '세, ' + profile.height + 'cm, 목표: 린매스\n' +
    '- 목표: 주 ' + profile.workoutFreq + '회 운동, 단백질 ' + profile.proteinTarget + 'g/일\n' +
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
        avgProtein: weekData.avgProtein,
        achievedDays: weekData.achievedDays,
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

  // 4. 단백질 평균 부족
  var recentMeals = state.data.nutritionLog.filter(function(m) {
    return m.date >= oneWeekAgoStr;
  });
  var dailyP = {};
  recentMeals.forEach(function(m) {
    if (!dailyP[m.date]) dailyP[m.date] = 0;
    dailyP[m.date] += m.protein || 0;
  });
  var values = Object.values(dailyP);
  if (values.length > 0) {
    var avg = values.reduce(function(s, p) { return s + p; }, 0) / values.length;
    if (avg < state.profile.proteinTarget * 0.85) {
      signals.push('protein_low');
    }
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
    'frequency_drop': '이번 주 운동 빈도가 목표보다 적음',
    'protein_low': '최근 7일 단백질 평균이 목표 대비 85% 미만'
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
    '  "encouragement": "격려 한 문단"\n' +
    '}\n\n' +
    '## 정체기 분석 원칙\n' +
    '- 점진 과부하 실패: 중량/횟수 정체 → 디로드 또는 변형 자극\n' +
    '- 영양 부족: 단백질/칼로리 → 분배 또는 총량 조정\n' +
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
