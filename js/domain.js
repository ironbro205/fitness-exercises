// js/domain.js — 순수 로직 (음식 분석, 1RM/점진적 과부하, 볼륨·밸런스 분석)
'use strict';
// ═══════════════════════════════════════════════
// 운동 화면 - 메인 (오늘 운동)
// ═══════════════════════════════════════════════

// AI가 추천하는 오늘 세션 (이번 주에 안 한 것 중 우선)
function getRecommendedSession() {
  var today = new Date();
  var dayOfWeek = today.getDay() || 7;
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  monday.setHours(0,0,0,0);

  var mondayStr = getDateStr(monday);
  var tdStr = getTodayStr();
  var thisWeek = state.data.workoutLog.filter(function(w) {
    return w.date >= mondayStr && w.date <= tdStr;
  });
  
  var done = thisWeek.map(function(w) { return w.session || w.sessionKr.toLowerCase(); });
  
  // 우선순위: PUSH → PULL → LEGS → FREE
  var priority = ['push', 'pull', 'legs', 'upper', 'free'];
  for (var i = 0; i < priority.length; i++) {
    if (done.indexOf(priority[i]) === -1) return priority[i];
  }
  return 'free';
}

// 음식 이름 정규화 (공백 제거 등)
function normalizeFood(name) {
  return name.replace(/\s+/g, '');
}

// DB에서 음식 찾기
// strict=true: 정확/별칭 매칭만 신뢰 (부분 매칭은 오작동 위험 → AI로 보낼 것)
function findFoodInDB(name, strict) {
  var norm = normalizeFood(name);

  // 1차: 직접 매칭
  if (FOOD_DB[norm]) return { key: norm, data: FOOD_DB[norm] };

  // 2차: 별칭 매칭
  if (FOOD_ALIASES[norm]) {
    var aliasKey = FOOD_ALIASES[norm];
    if (FOOD_DB[aliasKey]) return { key: aliasKey, data: FOOD_DB[aliasKey] };
  }

  if (strict) return null;

  // 3차: 부분 매칭 (포함 관계)
  var dbKeys = Object.keys(FOOD_DB);
  for (var i = 0; i < dbKeys.length; i++) {
    if (norm.indexOf(dbKeys[i]) !== -1 || dbKeys[i].indexOf(norm) !== -1) {
      return { key: dbKeys[i], data: FOOD_DB[dbKeys[i]] };
    }
  }

  // 4차: 별칭 부분 매칭
  var aliasKeys = Object.keys(FOOD_ALIASES);
  for (var i = 0; i < aliasKeys.length; i++) {
    if (norm.indexOf(aliasKeys[i]) !== -1) {
      var aliasKey = FOOD_ALIASES[aliasKeys[i]];
      if (FOOD_DB[aliasKey]) return { key: aliasKey, data: FOOD_DB[aliasKey] };
    }
  }

  return null;
}

// 양 추출
function extractAmount(text, defaultData) {
  for (var i = 0; i < AMOUNT_PATTERNS.length; i++) {
    var p = AMOUNT_PATTERNS[i];
    var match = text.match(p.regex);
    if (match) {
      var value;
      if (p.fixed) {
        value = p.multiplier;
      } else {
        value = parseFloat(match[1]) * p.multiplier;
      }
      return { amount: value, unit: p.unit, defaulted: false };
    }
  }
  return { amount: defaultData.defaultAmount, unit: defaultData.unit, defaulted: true };
}

// 음식 분석 (자연어 → 영양소)
function analyzeFood(text, strict) {
  // 음식 이름 찾기
  var found = findFoodInDB(text, strict);
  if (!found) return null;
  
  // 양 추출
  var amountInfo = extractAmount(text, found.data);
  
  // 단위 변환
  var multiplier;
  var data = found.data;
  
  if (amountInfo.unit === data.unit) {
    multiplier = amountInfo.amount / data.defaultAmount;
  } else if (amountInfo.unit === 'g' && data.unit === 'g') {
    multiplier = amountInfo.amount / 100;
  } else {
    multiplier = amountInfo.amount / data.defaultAmount;
  }
  
  // 무게 단위인 경우 100g 기준이라는 가정
  if (data.unit === 'g' && data.defaultAmount === 100) {
    multiplier = amountInfo.amount / 100;
  }
  
  // 표시용 양 텍스트
  var amountText;
  if (amountInfo.unit === 'g' || amountInfo.unit === 'ml') {
    amountText = amountInfo.amount + amountInfo.unit;
  } else {
    amountText = amountInfo.amount + amountInfo.unit;
  }
  
  return {
    name: found.key,
    amount: amountText,
    rawAmount: amountInfo.amount,
    unit: amountInfo.unit,
    defaulted: amountInfo.defaulted,
    protein: Math.round(data.p * multiplier * 10) / 10,
    kcal: Math.round(data.kcal * multiplier),
    carbs: Math.round(data.c * multiplier * 10) / 10,
    fat: Math.round(data.f * multiplier * 10) / 10
  };
}

// 여러 음식 입력 처리 ("닭가슴살 100g + 밥 한 공기")
function analyzeFoodInput(text, strict) {
  // 분리자: 와, 랑, +, 하고, 그리고
  var parts = text.split(/\s*(?:와|랑|이랑|\+|하고|그리고|,)\s*/);

  var results = [];
  var unmatched = [];

  parts.forEach(function(part) {
    if (!part.trim()) return;
    var result = analyzeFood(part.trim(), strict);
    if (result) {
      results.push(result);
    } else {
      unmatched.push(part.trim());
    }
  });

  return { matched: results, unmatched: unmatched };
}

// ═══════════════════════════════════════════════
// 1RM 헬퍼 함수
// ═══════════════════════════════════════════════

// Epley 공식: 1RM = 무게 × (1 + 횟수/30)
function calculate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// 종목명으로 1RM 조회 (별칭 자동 처리)
function get1RM(exerciseName) {
  var data = storage.get(KEYS.ONE_RM_DATA, {});
  
  // 1. 직접 매칭
  if (data[exerciseName] !== undefined) return data[exerciseName];
  
  // 2. 별칭 매칭
  var aliased = EXERCISE_ALIASES_1RM[exerciseName];
  if (aliased && data[aliased] !== undefined) return data[aliased];
  
  // 3. 역방향 별칭 매칭
  var keys = Object.keys(EXERCISE_ALIASES_1RM);
  for (var i = 0; i < keys.length; i++) {
    if (EXERCISE_ALIASES_1RM[keys[i]] === exerciseName && data[keys[i]] !== undefined) {
      return data[keys[i]];
    }
  }
  
  return null;
}

// 횟수 범위 문자열 파싱 ("8-12" → {low: 8, high: 12}, "10" → {low: 10, high: 10})
function parseRepRange(reps) {
  var parts = String(reps || '8-10').split('-');
  var low = parseInt(parts[0], 10) || 0;
  var high = parts.length > 1 ? (parseInt(parts[parts.length - 1], 10) || low) : low;
  return { low: low, high: high };
}

// 종목의 가장 최근 본 세트(워밍업 제외) 가져오기
// 운동 로그를 한 번만 스캔해서 모든 종목 → 마지막 세트 맵을 빌드한 뒤 캐시.
// workoutLog 길이가 같으면 재사용 (finalizeSession에서 길이가 증가하므로 자동 무효화).
var _lastSetsCache = null;
function getLastPerformedSets(exerciseName) {
  var log = state.data.workoutLog || [];
  if (!_lastSetsCache || _lastSetsCache.logLen !== log.length) {
    var map = {};
    for (var i = 0; i < log.length; i++) {
      var w = log[i];
      var exList = w.exercises || w.exercisesData;
      if (!exList || !Array.isArray(exList)) continue;
      for (var j = 0; j < exList.length; j++) {
        var ex = exList[j];
        if (!ex.name || map[ex.name]) continue; // 첫 매칭만
        if (ex.setsDetail && Array.isArray(ex.setsDetail)) {
          var working = ex.setsDetail.filter(function(s) { return !s.isWarmup; });
          if (working.length > 0) {
            map[ex.name] = { sets: working, date: w.date };
            continue;
          }
        }
        // 폴백: 요약된 maxWeight + reps (legacy 데이터)
        if (ex.maxWeight !== undefined || ex.weight !== undefined) {
          var wt = ex.maxWeight !== undefined ? ex.maxWeight : ex.weight;
          var rp = ex.reps || (Array.isArray(ex.repsArr) ? ex.repsArr[0] : 0);
          map[ex.name] = { sets: [{ weight: wt, reps: rp }], date: w.date };
        }
      }
    }
    _lastSetsCache = { logLen: log.length, map: map };
  }
  return _lastSetsCache.map[exerciseName] || null;
}

// 점진적 과부하 추천 (더블 프로그레션)
// 지난 본 세트 모두가 목표 횟수 상단을 달성하면 +한 칸(장비 단위), 그 외 같은 무게 유지
// 기록이 없으면 1RM 기반 추천으로 폴백
function getProgressiveRecommendation(exerciseName, targetReps) {
  var last = getLastPerformedSets(exerciseName);
  if (!last || !last.sets.length) {
    var w = suggestWorkingWeight(exerciseName, 0.7);
    if (w) return { weight: w, source: 'rm_estimate', note: '1RM 추정 기반 (첫 시도)' };
    return null;
  }

  var workingSets = last.sets.filter(function(s) { return s.weight > 0 && s.reps > 0; });
  if (!workingSets.length) return null;

  var maxW = Math.max.apply(null, workingSets.map(function(s) { return s.weight; }));
  var topReps = parseRepRange(targetReps).high || 10;
  var inc = getWeightIncrement(exerciseName); // 장비 증량 단위 (덤벨 2kg / 그 외 5kg)

  var setsAtMaxW = workingSets.filter(function(s) { return s.weight === maxW; });
  var allReachedTop = setsAtMaxW.length > 0 && setsAtMaxW.every(function(s) { return s.reps >= topReps; });

  if (allReachedTop) {
    var newW = snapWeightToEquipment(maxW + inc, exerciseName);
    return {
      weight: newW,
      source: 'progress',
      previousWeight: maxW,
      previousReps: setsAtMaxW.map(function(s) { return s.reps; }),
      note: '지난 ' + maxW + 'kg × 상단 ' + topReps + '+회 달성 → ' + newW + 'kg'
    };
  }

  return {
    weight: maxW,
    source: 'maintain',
    previousWeight: maxW,
    previousReps: workingSets.map(function(s) { return s.reps; }),
    note: '지난 ' + maxW + 'kg에서 ' + topReps + '회 도전 (상단 도달 시 +' + inc + 'kg)'
  };
}

// 1RM 갱신 (더 높으면). 고횟수(>12회)는 e1RM 신뢰도가 낮아 제외 — rolling max 경로와 동일 규칙.
function update1RM(exerciseName, weight, reps) {
  if (!weight || !reps) return false;
  if (reps > ROLLING_1RM_MAX_REPS) return false;

  var newRM = calculate1RM(weight, reps);
  var currentRM = get1RM(exerciseName);
  
  if (currentRM !== null && newRM <= currentRM) return false;
  
  var data = storage.get(KEYS.ONE_RM_DATA, {});
  
  // 별칭 우선
  var key = EXERCISE_ALIASES_1RM[exerciseName] || exerciseName;
  data[key] = newRM;
  
  storage.set(KEYS.ONE_RM_DATA, data);
  return true; // 갱신됨
}

// ── 1RM 자동 증감 (rolling max) ──
// tracked 1RM = "최근 N세션 중 최고 e1RM". 신기록이면 즉시↑, 옛 최고가 윈도우 밖으로
// 빠지면 자연히↓ (한 번 못 든 날로 폭락하지 않음). 고횟수(>12회) 세트는 e1RM 신뢰도가
// 낮아 추세 신호에서 제외한다. 근거: REMAKE-PLAN.md 묶음2 ①.
var ROLLING_1RM_WINDOW = 4; // 기본 추적 윈도우 (세션 수)
var ROLLING_1RM_MAX_REPS = 12; // 이 이상 반복은 e1RM 추정 부정확 → 제외

function calculateRollingMax1RM(exerciseName, windowSessions) {
  var n = windowSessions || ROLLING_1RM_WINDOW;
  var log = (state.data && state.data.workoutLog) || [];
  var canonical = EXERCISE_ALIASES_1RM[exerciseName] || exerciseName;

  var byDate = []; // { date, e1rm } — 세션(날짜)별 최고 e1RM
  for (var i = 0; i < log.length; i++) {
    var w = log[i];
    var exList = w.exercises || w.exercisesData;
    if (!exList || !Array.isArray(exList)) continue;
    var bestForDay = 0;
    for (var j = 0; j < exList.length; j++) {
      var ex = exList[j];
      if (!ex.name) continue;
      var exCanon = EXERCISE_ALIASES_1RM[ex.name] || ex.name;
      if (exCanon !== canonical && ex.name !== exerciseName) continue;
      if (!ex.setsDetail || !Array.isArray(ex.setsDetail)) continue;
      for (var k = 0; k < ex.setsDetail.length; k++) {
        var s = ex.setsDetail[k];
        if (s.isWarmup) continue;
        if (!s.weight || !s.reps) continue;
        if (s.reps > ROLLING_1RM_MAX_REPS) continue; // 고횟수 제외
        var e = calculate1RM(s.weight, s.reps);
        if (e > bestForDay) bestForDay = e;
      }
    }
    if (bestForDay > 0) byDate.push({ date: w.date, e1rm: bestForDay });
  }
  if (!byDate.length) return null;

  byDate.sort(function(a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  var recent = byDate.slice(-n);
  var max = 0;
  for (var m = 0; m < recent.length; m++) {
    if (recent[m].e1rm > max) max = recent[m].e1rm;
  }
  return { value: Math.round(max * 10) / 10, sessions: recent.length };
}

// 세션 종료 후 호출: 로그 기반 rolling max로 추적 1RM 보정.
// 상승은 즉시 반영, 하락은 윈도우에 2세션 이상 있을 때만 (느린 하락 = 안정성).
function reconcile1RMFromLog(exerciseNames) {
  if (!exerciseNames || !exerciseNames.length) return;
  var data = storage.get(KEYS.ONE_RM_DATA, {});
  var changed = false;
  for (var i = 0; i < exerciseNames.length; i++) {
    var name = exerciseNames[i];
    var roll = calculateRollingMax1RM(name);
    if (!roll) continue;
    var key = EXERCISE_ALIASES_1RM[name] || name;
    var cur = data[key];
    if (cur === undefined || roll.value >= cur || roll.sessions >= 2) {
      data[key] = roll.value;
      changed = true;
    }
  }
  if (changed) storage.set(KEYS.ONE_RM_DATA, data);
}

// 장비별 최소 무게 증량 단위 (사용자 짐 기준): 덤벨 2kg, 그 외(머신·케이블·바벨·스미스) 5kg.
// 종목 이름으로 판별 (예: "체스트 프레스 머신"→5, "덤벨 숄더 프레스"→2). 맨몸/무게없음은 호출부에서 걸러짐.
function getWeightIncrement(exerciseName) {
  return (exerciseName || '').indexOf('덤벨') >= 0 ? 2 : 5;
}

// 무게를 그 종목 장비가 실제로 낼 수 있는 단위로 스냅(반올림). .5kg 같은 실행 불가 무게 방지.
function snapWeightToEquipment(weight, exerciseName) {
  if (!weight || weight <= 0) return weight;
  var step = getWeightIncrement(exerciseName);
  return Math.max(step, Math.round(weight / step) * step); // 양수는 최소 1스텝 보장 (0kg 방지)
}

// 작업 무게 추천 (1RM의 N%) — 신규 종목 또는 기록 없는 종목용 백업
function suggestWorkingWeight(exerciseName, percentage) {
  var rm = get1RM(exerciseName);
  if (!rm) return null;

  var pct = percentage || 0.7; // 기본 70%
  var weight = rm * pct;
  
  // 장비별 실제 증량 단위로 스냅 (덤벨 2kg / 머신·케이블·바벨·스미스 5kg)
  return snapWeightToEquipment(weight, exerciseName);
}

// 1RM 없는 종목에 대해 같은 부위 종목의 1RM 평균으로 추정
// 안전장치: 표본 2개 이상에서만 추정 (표본 1개 = 변동성 너무 큼)
function estimate1RMFromPart(exerciseName) {
  // 이미 1RM 있으면 그거 사용
  var direct = get1RM(exerciseName);
  if (direct) return { weight: direct, source: 'direct', confidence: 'high' };
  
  var info = getExercisePart(exerciseName);
  if (!info) return null;
  
  var oneRMData = storage.get(KEYS.ONE_RM_DATA, {});
  var samePartRMs = [];
  
  Object.keys(EXERCISE_BODY_PART_MAP).forEach(function(name) {
    if (name === exerciseName) return;
    var otherInfo = EXERCISE_BODY_PART_MAP[name];
    if (otherInfo.primary !== info.primary) return;
    if (otherInfo.compound !== info.compound) return;
    var rm = oneRMData[name];
    if (rm) samePartRMs.push(rm);
  });
  
  if (samePartRMs.length === 0) return null;
  
  // 안전: 표본 1개는 신뢰도 낮음 → confidence: low로 표시 (시스템 프롬프트에서 활용 제한)
  var confidence = samePartRMs.length >= 3 ? 'medium' : (samePartRMs.length >= 2 ? 'low' : 'very_low');
  
  // 평균 × 0.85 (다른 종목이므로 보수적으로)
  var avg = samePartRMs.reduce(function(s, r) { return s + r; }, 0) / samePartRMs.length;
  var estimated = Math.round(avg * 0.85 / 2.5) * 2.5;
  
  return { 
    weight: estimated, 
    source: 'estimated_from_part', 
    basedOn: samePartRMs.length + '개 종목 평균',
    confidence: confidence
  };
}

// 1RM 초기화 (첫 실행)
function initializeOneRMData() {
  var alreadyInit = storage.get(KEYS.ONE_RM_INITIALIZED);
  if (alreadyInit) return;
  
  // INITIAL_1RM을 저장소에 복사
  var data = {};
  Object.keys(INITIAL_1RM).forEach(function(key) {
    data[key] = INITIAL_1RM[key];
  });
  
  storage.set(KEYS.ONE_RM_DATA, data);
  storage.set(KEYS.ONE_RM_INITIALIZED, true);
}

// ═══════════════════════════════════════════════
// 사이클 / 주차 진행 (묶음2: 4주 빌드 + 1주 디로드 = 5주)
// 주차는 "날짜"가 아니라 "그 주 목표 운동 완료"로 넘어간다. REMAKE-PLAN.md 묶음2 ②③.
// ═══════════════════════════════════════════════
var CYCLE_LENGTH = 5; // 빌드 4주 + 디로드 1주

// 주차 → 단계 라벨 (1~4 빌드, 5 디로드)
function getPhaseByWeek(week) {
  return week >= CYCLE_LENGTH ? '디로드' : '빌드';
}

// 이번 주 완료 세션 수가 목표(workoutFreq) 이상이면 다음 주차로. 5주차(디로드) 완료 시 새 사이클.
// 순수 함수: profile(+이번주 완료수)를 받아 갱신된 사이클 필드만 반환 (저장은 호출자 책임).
function advanceCycleOnSessionComplete(profile, sessionsCompletedThisWeek) {
  var wf = profile.workoutFreq || 4;
  var out = {
    currentCycle: profile.currentCycle || 1,
    currentWeek: profile.currentWeek || 1,
    cyclePhase: profile.cyclePhase || '빌드'
  };
  if (sessionsCompletedThisWeek >= wf) {
    out.currentWeek += 1;
    if (out.currentWeek > CYCLE_LENGTH) {
      out.currentCycle += 1;
      out.currentWeek = 1;
    }
    out.cyclePhase = getPhaseByWeek(out.currentWeek);
  }
  return out;
}

// 휴식 감시자: 마지막 운동이 10일 이상 지났으면 복귀 안내 메시지, 아니면 null.
function getIdleComebackMessage(workoutLog, todayStr) {
  var log = workoutLog || [];
  var lastDate = null;
  for (var i = 0; i < log.length; i++) {
    if (log[i].completed && (!lastDate || log[i].date > lastDate)) lastDate = log[i].date;
  }
  if (!lastDate) return null;
  var lastMs = new Date(lastDate + 'T00:00:00Z').getTime();
  var todayMs = new Date(todayStr + 'T00:00:00Z').getTime();
  var days = Math.round((todayMs - lastMs) / 86400000);
  if (days < 10) return null;
  return { days: days, message: days + '일째 쉬는 중이에요. 가볍게 다시 시작해볼까요?' };
}

// ═══════════════════════════════════════════════
// 코치 기억 노트 (묶음3): 코치 응답 끝의 숨김 블록 파싱 + 중복제거 병합
// ═══════════════════════════════════════════════

// 코치 응답 끝의 ```memory [...] ``` 블록을 떼어내고 항목을 추출.
// 반환: { clean: 블록 제거된 본문, items: [{category, text}] }. 절대 throw 안 함.
function parseCoachMemoryBlock(responseText) {
  var text = String(responseText == null ? '' : responseText);
  var re = /```memory\s*([\s\S]*?)```\s*$/;
  var m = text.match(re);
  if (!m) return { clean: text.trim(), items: [] };
  var clean = text.slice(0, m.index).trim();
  var items = [];
  try {
    var parsed = JSON.parse(m[1].trim());
    if (Array.isArray(parsed)) {
      parsed.forEach(function(it) {
        if (it && it.text && String(it.text).trim()) {
          items.push({ category: it.category || 'other', text: String(it.text).trim() });
        }
      });
    }
  } catch (e) { /* 망가진 블록 → 본문에서만 제거, 항목 없음 */ }
  return { clean: clean, items: items };
}

function normalizeMemoryKey(category, text) {
  return category + '|' + String(text).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 24);
}

// 기존 노트에 새 항목 병합. 중복(카테고리+텍스트 앞부분) 건너뛰기, 미지 카테고리는 other 보정.
// 최대 40개 유지(초과 시 오래된 auto부터 제거). 저장은 호출자 책임.
function mergeCoachMemory(existing, newItems, source, today, idBase) {
  var out = (existing || []).slice();
  var seen = {};
  out.forEach(function(m) { seen[normalizeMemoryKey(m.category, m.text)] = true; });
  (newItems || []).forEach(function(it, i) {
    if (!it || !it.text || !String(it.text).trim()) return;
    var cat = MEMORY_CATEGORIES.indexOf(it.category) !== -1 ? it.category : 'other';
    var key = normalizeMemoryKey(cat, it.text);
    if (seen[key]) return;
    seen[key] = true;
    out.push({
      id: (idBase || 'mem') + '_' + out.length + '_' + i,
      category: cat,
      text: String(it.text).trim().slice(0, 140),
      source: source || 'auto',
      date: today
    });
  });
  // 40개 초과 시 오래된 auto부터 제거 (manual은 최대한 보존)
  while (out.length > 40) {
    var idx = -1;
    for (var k = 0; k < out.length; k++) { if (out[k].source === 'auto') { idx = k; break; } }
    out.splice(idx === -1 ? 0 : idx, 1);
  }
  return out;
}

// 시스템 프롬프트용 기억 노트 텍스트. 없으면 '없음'.
function formatCoachMemoryForPrompt(items) {
  var list = items || [];
  if (!list.length) return '없음';
  return list.map(function(m) {
    var meta = MEMORY_CATEGORY_META[m.category] || MEMORY_CATEGORY_META.other;
    return '- [' + meta.kr + '] ' + m.text;
  }).join('\n');
}

// 통합 부위 코드 → 한국어 라벨 빠른 조회 (현재 직접 BODY_PART_GROUPS[g].kr 사용)
// 헬퍼 미사용 — 호출 위치 추가 시 재활성화

// volumeByPart (세부 부위 단위) → 그룹 합산 (가슴 합계, 어깨 합계 등)
function groupVolumeBy(volumeByPart) {
  var grouped = {};
  Object.keys(BODY_PART_GROUPS).forEach(function(g) {
    var total = 0;
    BODY_PART_GROUPS[g].subParts.forEach(function(sub) {
      total += (volumeByPart[sub] || 0);
    });
    if (total > 0) grouped[g] = total;
  });
  return grouped;
}

// 종목명 → 부위 정보 찾기 (퍼지 매칭)
function getExercisePart(exerciseName) {
  if (!exerciseName) return null;
  // 정확한 매칭
  if (EXERCISE_BODY_PART_MAP[exerciseName]) return EXERCISE_BODY_PART_MAP[exerciseName];
  
  // 부분 매칭 (포함 관계)
  var name = exerciseName.toLowerCase();
  for (var key in EXERCISE_BODY_PART_MAP) {
    if (key.toLowerCase().includes(name) || name.includes(key.toLowerCase())) {
      return EXERCISE_BODY_PART_MAP[key];
    }
  }
  
  // 키워드 기반 추측
  if (name.indexOf('체스트') >= 0 || name.indexOf('가슴') >= 0 || name.indexOf('벤치') >= 0 || name.indexOf('플라이') >= 0) {
    return { primary: 'chest', secondary: [], compound: name.indexOf('플라이') < 0, angle: name.indexOf('인클라인') >= 0 ? 'incline' : 'flat' };
  }
  if (name.indexOf('숄더') >= 0 || name.indexOf('레터럴') >= 0) {
    return { primary: name.indexOf('레터럴') >= 0 ? 'shoulders_side' : 'shoulders_front', secondary: [], compound: name.indexOf('프레스') >= 0 };
  }
  if (name.indexOf('컬') >= 0) return { primary: 'biceps', secondary: [], compound: false };
  if (name.indexOf('푸시 다운') >= 0 || name.indexOf('익스텐션') >= 0 && name.indexOf('트라이셉') >= 0) return { primary: 'triceps', secondary: [], compound: false };
  if (name.indexOf('로우') >= 0) return { primary: 'upper_back', secondary: ['lats', 'biceps'], compound: true };
  if (name.indexOf('풀다운') >= 0 || name.indexOf('풀 다운') >= 0 || name.indexOf('풀업') >= 0) return { primary: 'lats', secondary: ['biceps'], compound: true };
  if (name.indexOf('스쿼트') >= 0 || name.indexOf('레그 프레스') >= 0) return { primary: 'quads', secondary: ['glutes'], compound: true };
  if (name.indexOf('레그 익스텐션') >= 0) return { primary: 'quads', secondary: [], compound: false };
  if (name.indexOf('레그 컬') >= 0 || name.indexOf('햄스트링') >= 0 || name.indexOf('rdl') >= 0 || name.indexOf('데드리프트') >= 0) return { primary: 'hamstrings', secondary: ['glutes'], compound: true };
  if (name.indexOf('힙') >= 0) return { primary: 'glutes', secondary: [], compound: false };
  if (name.indexOf('카프') >= 0 || name.indexOf('종아리') >= 0) return { primary: 'calves', secondary: [], compound: false };
  
  return null;
}

// ═══════════════════════════════════════════════
// 루틴 균형 분석 (AI에게 줄 가공된 데이터)
// ═══════════════════════════════════════════════
function analyzeRoutineBalance(exercises) {
  if (!exercises || exercises.length === 0) return { partCounts: {}, totalExercises: 0, mainCount: 0, isolationCount: 0, stretchedCount: 0, warnings: [] };
  
  var partCounts = {};        // primary 기준 (정수)
  var partCountsWithSec = {}; // primary 1.0 + secondary 0.5 (소수)
  var compoundCount = 0;
  var isolationCount = 0;
  var stretchedCount = 0;
  var mainCount = 0;
  var unknownExercises = [];
  
  exercises.forEach(function(ex) {
    var info = getExercisePart(ex.name);
    if (!info) {
      unknownExercises.push(ex.name);
      return;
    }
    
    if (ex.isMain) mainCount++;
    
    // primary 부위 +1
    partCounts[info.primary] = (partCounts[info.primary] || 0) + 1;
    partCountsWithSec[info.primary] = (partCountsWithSec[info.primary] || 0) + 1.0;
    
    // secondary 부위 +0.5 (자극 기여도)
    if (info.secondary && info.secondary.length > 0) {
      info.secondary.forEach(function(s) {
        partCountsWithSec[s] = (partCountsWithSec[s] || 0) + 0.5;
      });
    }
    
    if (info.compound) compoundCount++;
    else isolationCount++;
    
    if (info.stretched) stretchedCount++;
  });
  
  var warnings = [];
  var totalEx = exercises.length;
  
  // 한 부위 primary 4개 이상 = 과잉
  Object.keys(partCounts).forEach(function(part) {
    if (partCounts[part] >= 4) {
      warnings.push((BODY_PART_KR[part] || part) + ' 종목 ' + partCounts[part] + '개 (과잉 - 3개 이하 권장)');
    }
  });
  
  // 동일 부위·각도 중복 체크
  var angleMap = {};
  exercises.forEach(function(ex) {
    var info = getExercisePart(ex.name);
    if (!info || !info.angle) return;
    var key = info.primary + '_' + info.angle;
    angleMap[key] = (angleMap[key] || 0) + 1;
  });
  Object.keys(angleMap).forEach(function(key) {
    if (angleMap[key] >= 2) {
      var parts = key.split('_');
      warnings.push('동일 부위·각도 중복: ' + (BODY_PART_KR[parts[0]] || parts[0]) + ' ' + parts[1] + ' ' + angleMap[key] + '개');
    }
  });
  
  if (mainCount === 0 && totalEx >= 3) {
    warnings.push('메인 종목(isMain) 없음 - 1~2개 지정 권장');
  }
  if (mainCount > 3) {
    warnings.push('메인 종목 ' + mainCount + '개 (1~2개 권장 - 너무 많음)');
  }
  
  if (stretchedCount === 0 && totalEx >= 4) {
    warnings.push('신장 위치 강조 종목 없음 - 1개 이상 권장 (Maeo 2023)');
  }
  
  return {
    partCounts: partCounts,
    partCountsWithSec: partCountsWithSec,
    totalExercises: totalEx,
    compoundCount: compoundCount,
    isolationCount: isolationCount,
    stretchedCount: stretchedCount,
    mainCount: mainCount,
    unknownExercises: unknownExercises,
    warnings: warnings
  };
}

// 균형 분석 결과를 텍스트로 변환
function formatBalanceAnalysis(analysis) {
  if (!analysis || analysis.totalExercises === 0) return '루틴 비어있음';
  
  var lines = [];
  lines.push('총 ' + analysis.totalExercises + '개 종목 (메인 ' + analysis.mainCount + ', 복합 ' + analysis.compoundCount + ', 고립 ' + analysis.isolationCount + ', 신장강조 ' + analysis.stretchedCount + ')');
  
  // primary 부위 카운트
  var partList = Object.keys(analysis.partCounts).sort(function(a, b) { return analysis.partCounts[b] - analysis.partCounts[a]; });
  if (partList.length > 0) {
    lines.push('primary 부위: ' + partList.map(function(p) { return (BODY_PART_KR[p] || p) + ' ' + analysis.partCounts[p]; }).join(', '));
  }
  
  // primary + secondary 통합 (실제 자극)
  if (analysis.partCountsWithSec) {
    var secList = Object.keys(analysis.partCountsWithSec).sort(function(a, b) { return analysis.partCountsWithSec[b] - analysis.partCountsWithSec[a]; });
    if (secList.length > 0) {
      lines.push('실제 자극 (secondary 0.5 포함): ' + secList.map(function(p) { return (BODY_PART_KR[p] || p) + ' ' + analysis.partCountsWithSec[p].toFixed(1); }).join(', '));
    }
  }
  
  if (analysis.warnings.length > 0) {
    lines.push('⚠️ 경고: ' + analysis.warnings.join(' | '));
  }
  
  if (analysis.unknownExercises && analysis.unknownExercises.length > 0) {
    lines.push('⚠️ 매핑 안 된 종목 (부위 추측 불가): ' + analysis.unknownExercises.join(', '));
  }
  
  return lines.join('\n');
}

// 최근 N주 부위별 누적 세트 수 (주간 볼륨 분석)
function getRecentVolumeByPart(weeks) {
  var today = new Date();
  var since = new Date(today);
  since.setDate(today.getDate() - (weeks * 7));
  
  var sinceStr = getDateStr(since);
  var workouts = state.data.workoutLog.filter(function(w) {
    return w.date >= sinceStr;
  });
  
  var volumeByPart = {};
  
  workouts.forEach(function(w) {
    if (!w.exercises || !Array.isArray(w.exercises)) return;
    w.exercises.forEach(function(ex) {
      var info = getExercisePart(ex.name);
      if (!info) return;
      
      // 실제 완료 세트 수 카운트 (우선순위: setsCount > sets(number) > setsDetail > sets(array))
      var setCount = 0;
      if (typeof ex.setsCount === 'number') {
        setCount = ex.setsCount;
      } else if (typeof ex.sets === 'number') {
        setCount = ex.sets;
      } else if (Array.isArray(ex.setsDetail)) {
        setCount = ex.setsDetail.filter(function(s) { return s.completed && !s.isWarmup; }).length;
      } else if (Array.isArray(ex.sets)) {
        setCount = ex.sets.filter(function(s) { return s.completed && !s.isWarmup; }).length;
      }
      
      if (setCount === 0) return;
      
      // primary 부위에 풀 세트
      volumeByPart[info.primary] = (volumeByPart[info.primary] || 0) + setCount;
      
      // secondary(보조근) 부위에 0.5 세트 (Pelland 2025 분할세트 예측력 최고; 0.3~0.7 휴리스틱 중 0.5)
      if (info.secondary && info.secondary.length > 0) {
        info.secondary.forEach(function(s) {
          volumeByPart[s] = (volumeByPart[s] || 0) + setCount * 0.5;
        });
      }
    });
  });
  
  return volumeByPart;
}

// 부족/과잉 부위 식별 (그룹 합산 기반)
// volumeByPart는 세부 부위 단위 → 가슴(chest+chest_upper+chest_lower) 합산해서 진단
function getVolumeDiagnosis(volumeByPart, weeks) {
  var lacking = [];
  var optimal = [];
  var excessive = [];
  var belowOptimal = []; // MEV 통과·최적 하한(주10세트) 미달 (🟡)
  var untouched = []; // 주0세트 미접촉 (저우선 참고 — '최우선' 도배 방지)
  
  // 그룹 합산
  var groupedVol = groupVolumeBy(volumeByPart);
  
  // 모든 그룹 평가 — 부위 크기(size)별 임계 적용 (조사 C: 작은 근육은 복합운동 간접자극으로 목표 낮음)
  //   large(가슴·등·대퇴사두·햄스트링·둔근): 부족<4 / 하한미달 4~10 / 적정 10~20 / 수확체감 20+, 목표 12
  //   small(어깨·이두·삼두·종아리·복근·내전근): 부족<3 / 하한미달 3~8 / 적정 8~16 / 수확체감 16+, 목표 8
  //   size는 BODY_PART_GROUPS[group].size, 없거나 'small'이 아니면 'large'로 안전 처리
  Object.keys(BODY_PART_GROUPS).forEach(function(g) {
    var weeklyVol = (groupedVol[g] || 0) / weeks;
    var label = BODY_PART_GROUPS[g].kr;
    var size = (BODY_PART_GROUPS[g] && BODY_PART_GROUPS[g].size === 'small') ? 'small' : 'large';
    var lackBelow  = size === 'small' ? 3 : 4;   // 부족(🔴) 상한
    var optimalLow = size === 'small' ? 8 : 10;  // 최적 하한(미달 시 🟡)
    var optimalTop = size === 'small' ? 16 : 20; // 최적 상한(초과 시 수확 체감 🔥)
    var target     = size === 'small' ? 8 : 12;  // 폐루프 목표 세트(ai.js volNeedNote가 참조)
    var entry = { group: g, label: label, vol: weeklyVol, size: size, target: target };

    if (weeklyVol === 0) {
      // 미접촉: 저우선 참고 버킷(전완·복근 등이 매번 '최우선'으로 도배되는 노이즈 방지)
      untouched.push(entry);
    } else if (weeklyVol < lackBelow) {
      entry.label += ' (주' + weeklyVol.toFixed(1) + '세트)';
      lacking.push(entry);
    } else if (weeklyVol < optimalLow) {
      // MEV는 넘었지만 최적 하한 미달 → 🟡 별도 등급
      entry.label += ' (주' + weeklyVol.toFixed(1) + '세트·하한 미달)';
      belowOptimal.push(entry);
    } else if (weeklyVol <= optimalTop) {
      entry.label += ' (주' + weeklyVol.toFixed(1) + '세트)';
      optimal.push(entry);
    } else {
      // 간접(보조근 0.5)까지 최적 상한 초과 = 수확 체감 구간(하드컷 아님)
      entry.label += ' (주' + weeklyVol.toFixed(1) + '세트)';
      excessive.push(entry);
    }
  });
  
  return { lacking: lacking, belowOptimal: belowOptimal, untouched: untouched, optimal: optimal, excessive: excessive };
}

// SVG path 생성 (선 그래프)
function generateLinePath(data, width, height, padding) {
  if (data.length === 0) return { path: '', area: '', points: '' };
  
  var values = data.map(function(d) { return d.value; });
  var minVal = Math.min.apply(null, values);
  var maxVal = Math.max.apply(null, values);
  var range = maxVal - minVal || 1;
  
  // Y 범위에 약간 여유
  var yMin = minVal - range * 0.1;
  var yMax = maxVal + range * 0.1;
  var yRange = yMax - yMin || 1;
  
  var pathData = '';
  var areaData = '';
  var pointsData = '';
  
  data.forEach(function(d, i) {
    var x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    var y = height - ((d.value - yMin) / yRange) * height;
    
    if (i === 0) {
      pathData = 'M ' + x + ',' + y;
      areaData = 'M ' + x + ',' + height + ' L ' + x + ',' + y;
    } else {
      pathData += ' L ' + x + ',' + y;
      areaData += ' L ' + x + ',' + y;
    }
    
    var isLast = i === data.length - 1;
    pointsData += '<circle cx="' + x + '" cy="' + y + '" r="' + (isLast ? 4 : 3) + '" fill="#00d4ff"' + (isLast ? ' stroke="white" stroke-width="2"' : '') + '/>';
  });
  
  areaData += ' L ' + width + ',' + height + ' Z';
  
  return {
    path: pathData,
    area: areaData,
    points: pointsData,
    yMin: yMin,
    yMax: yMax
  };
}
