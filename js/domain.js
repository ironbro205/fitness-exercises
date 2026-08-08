// js/domain.js — 순수 로직 (1RM/점진적 과부하, 볼륨·밸런스 분석)
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
// 어시스트 종목은 1RM 개념이 성립하지 않는다 — 보조 무게로 뽑은 e1RM은 "클수록 약하다"는
// 뜻이라 부호가 뒤집힌 지표다(보조 40→30kg으로 강해지면 e1RM은 오히려 떨어진다).
// 진행 지표는 getAssistProgressTrend(보조 무게 감소 추이)가 대신한다.
function get1RM(exerciseName) {
  if (isReverseProgression(exerciseName)) return null;
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

// 종목의 최근 수행 세트(워밍업 제외) 가져오기 — 종목당 최근 3세션까지 보관.
// 운동 로그를 한 번만 스캔해서 모든 종목 → 최근 수행 목록 맵을 빌드한 뒤 캐시.
// workoutLog 길이가 같으면 재사용 (finalizeSession에서 길이가 증가하므로 자동 무효화).
var _lastSetsCache = null;
var RECENT_PERFORMANCES_KEEP = 3;
function _buildRecentSetsMap() {
  var log = state.data.workoutLog || [];
  if (!_lastSetsCache || _lastSetsCache.logLen !== log.length) {
    var map = {};
    for (var i = 0; i < log.length; i++) {
      var w = log[i];
      var exList = w.exercises || w.exercisesData;
      if (!exList || !Array.isArray(exList)) continue;
      for (var j = 0; j < exList.length; j++) {
        var ex = exList[j];
        if (!ex.name) continue;
        // 별칭 표기('랫풀다운')와 표준명('랫 풀 다운')이 한 칸에 모이게 표준명으로 키를 잡는다
        var exKey = canonicalExerciseName(ex.name);
        if (map[exKey] && map[exKey].length >= RECENT_PERFORMANCES_KEEP) continue;
        var entry = null;
        if (ex.setsDetail && Array.isArray(ex.setsDetail)) {
          var working = ex.setsDetail.filter(function(s) { return !s.isWarmup; });
          if (working.length > 0) entry = { sets: working, date: w.date };
        }
        // 폴백: 요약된 maxWeight + reps (legacy 데이터). reps가 배열([12,12,12])이거나
        // 문자열이어도 숫자로 정규화 — 아니면 진행도 계산에서 조용히 누락됨.
        if (!entry && (ex.maxWeight !== undefined || ex.weight !== undefined)) {
          var wt = ex.maxWeight !== undefined ? ex.maxWeight : ex.weight;
          var rp = ex.reps;
          if (Array.isArray(rp)) rp = rp[0];
          if (!rp && Array.isArray(ex.repsArr)) rp = ex.repsArr[0];
          rp = parseInt(rp, 10) || 0;
          entry = { sets: [{ weight: wt, reps: rp }], date: w.date };
        }
        if (entry) {
          if (!map[exKey]) map[exKey] = [];
          map[exKey].push(entry); // log[0]=최신이므로 [0]=가장 최근
        }
      }
    }
    _lastSetsCache = { logLen: log.length, map: map };
  }
  return _lastSetsCache.map;
}

function getLastPerformedSets(exerciseName) {
  var list = _buildRecentSetsMap()[canonicalExerciseName(exerciseName)];
  return (list && list[0]) || null;
}

// 최근 n세션 수행 목록 ([0]=가장 최근). 고중량 복합/경량 고립의 "2세션 연속" 판정용.
function getRecentPerformances(exerciseName, n) {
  var list = _buildRecentSetsMap()[canonicalExerciseName(exerciseName)] || [];
  return list.slice(0, n || 2);
}

// 표시용 정렬 — 최신이 위. 원본 배열은 건드리지 않는다(복사본을 정렬).
// 운동 기록은 저장이 unshift(최신 먼저)라 화면에서 slice(-N).reverse() 를 쓰면
// 기록이 N개를 넘는 순간 "가장 오래된 것"만 남았다. 자르기 전에 날짜(같은 날이면
// 시작시각) 내림차순으로 다시 세워, 저장 순서와 상관없이 최신 N개가 나오게 한다.
function sortByDateDesc(list) {
  return (list || []).slice().sort(function(a, b) {
    var byDate = String((b && b.date) || '').localeCompare(String((a && a.date) || ''));
    if (byDate !== 0) return byDate;
    return (Number(b && b.startTime) || 0) - (Number(a && a.startTime) || 0);
  });
}

// ═══════════════════════════════════════════════
// 역방향 진행 (어시스트 보조 기구) — docs/research/assisted-progression.md
// ═══════════════════════════════════════════════
// 어시스트 풀업·딥스 머신의 스택 무게는 부하가 아니라 **체중을 상쇄하는 보조력**이다.
// 순부하 = 체중 − 보조 무게 → 보조를 낮출수록 어려워진다. 진행 방향이 정반대라
// "무게 증가 = 진행"을 전제한 엔진 전체가 이 종목에서는 거꾸로 동작한다.
// 아래 한 개의 판정 함수를 단일 원천으로 삼아, 진행·세트구성·1RM·문구가 같은 방향을 본다.

function isReverseProgression(exerciseName) {
  var raw = canonicalExerciseName(exerciseName || '');
  if (REVERSE_PROGRESSION_EXERCISES.indexOf(raw) !== -1) return true;

  // 표기 변형 흡수 — 공백·하이픈·가운뎃점을 지우고 매칭한다 ('어시스트 풀 업', '어시스티드 풀-업').
  var name = raw.replace(/[\s\-_·]/g, '');

  // 밴드 보조는 가변 보조라 이 축에 올릴 수 없다 (data.js ASSIST_EXCLUDE_KEYWORDS 주석).
  for (var e = 0; e < ASSIST_EXCLUDE_KEYWORDS.length; e++) {
    if (name.indexOf(ASSIST_EXCLUDE_KEYWORDS[e]) !== -1) return false;
  }

  // 키워드 경로는 '어시스트/보조' + '풀업/친업/딥스'가 **둘 다** 있어야 한다 (오탐 방지).
  var hasAssist = false, hasMovement = false;
  for (var i = 0; i < ASSIST_NAME_KEYWORDS.length; i++) {
    if (name.indexOf(ASSIST_NAME_KEYWORDS[i]) !== -1) { hasAssist = true; break; }
  }
  if (!hasAssist) return false;
  for (var j = 0; j < ASSIST_MOVEMENT_KEYWORDS.length; j++) {
    if (name.indexOf(ASSIST_MOVEMENT_KEYWORDS[j]) !== -1) { hasMovement = true; break; }
  }
  return hasMovement;
}

// 이 종목에서 "더 어려운 쪽" 무게. 정방향=최대, 역방향=최소(보조가 적을수록 어렵다).
// 진행 판정의 기준 세트를 고르는 데 쓴다 (탑세트 = 가장 어려운 세트).
function hardestWeight(exerciseName, weights) {
  if (!weights || !weights.length) return null;
  return isReverseProgression(exerciseName)
    ? Math.min.apply(null, weights)
    : Math.max.apply(null, weights);
}

// 한 칸 진행한 무게 (정방향 +inc / 역방향 −inc, 보조는 0kg에서 바닥).
// 0kg = 맨몸. 그 아래로는 내려갈 수 없으므로 호출부가 "졸업" 안내로 전환한다.
function progressedWeight(exerciseName, weight, inc) {
  if (isReverseProgression(exerciseName)) {
    return Math.max(0, snapWeightToEquipment(weight - inc, exerciseName));
  }
  return snapWeightToEquipment(weight + inc, exerciseName);
}

// 첫 시도 보조 무게 (기록·1RM 모두 없을 때). 프로필 체중이 없으면 추천을 생략한다.
function suggestInitialAssistWeight(exerciseName) {
  var bw = (state.profile && state.profile.weight) ? Number(state.profile.weight) : 0;
  if (!bw || bw <= 0) return null;
  return snapWeightToEquipment(bw * ASSIST_INITIAL_BW_RATIO, exerciseName);
}

// ═══════════════════════════════════════════════
// 종목 클래스 + 반복범위 가드레일 (md 개편 Phase 5)
// ═══════════════════════════════════════════════

// 종목 → 진행 규칙 클래스. 명시 지정 → 재활 키워드 → 부위맵 휴리스틱 순.
function getExerciseClass(exerciseName) {
  var name = exerciseName || '';
  if (EXERCISE_CLASS_OVERRIDES[name]) return EXERCISE_CLASS_OVERRIDES[name];

  // 재활 키워드 (미등록 종목 이름도 감지)
  for (var i = 0; i < REHAB_NAME_KEYWORDS.length; i++) {
    if (name.indexOf(REHAB_NAME_KEYWORDS[i]) !== -1) return 'rehab';
  }

  var info = EXERCISE_BODY_PART_MAP[name] || getExercisePart(name);
  if (!info) return 'isolation'; // 미등록 종목 — 보수적 기본값 (12-15회, 소폭 증량)

  if (info.compound) {
    for (var k = 0; k < HEAVY_COMPOUND_KEYWORDS.length; k++) {
      if (name.indexOf(HEAVY_COMPOUND_KEYWORDS[k]) !== -1) return 'compound_heavy';
    }
    return 'compound_moderate';
  }

  return LIGHT_ISOLATION_PARTS.indexOf(info.primary) !== -1 ? 'light_isolation' : 'isolation';
}

// 목표 반복을 클래스 허용 범위로 교정 (교집합, 어긋나면 클래스 범위 전체).
// "사이드 레터럴에 10회" 같은 범위 밖 제안을 시스템 레벨에서 차단하는 가드레일.
function clampRepsToClass(exerciseName, targetReps) {
  var rules = EXERCISE_CLASS_RULES[getExerciseClass(exerciseName)];
  var r = parseRepRange(targetReps);
  var low = Math.max(r.low || rules.repMin, rules.repMin);
  var high = Math.min(r.high || rules.repMax, rules.repMax);
  if (low > high) { low = rules.repMin; high = rules.repMax; } // 교집합 없음 → 클래스 범위
  return { low: low, high: high };
}

// 반복범위 객체 → "15-25" / "8" 문자열 (targetReps 필드용)
function repRangeToStr(range) {
  return range.low === range.high ? String(range.low) : range.low + '-' + range.high;
}

// 최근 N일 내 이 종목에 통증 기록이 있는지 (세트별 painFlag 또는 종목별 painFlag)
function hasRecentPain(exerciseName, days) {
  // 세트 사이 채팅에서 확인된 통증 신호 (전용 저장소 — 세션 취소·0세트 종료에도 보존됨)
  var chatSignals = _recentChatSignals(exerciseName, days);
  for (var c = 0; c < chatSignals.length; c++) {
    if (chatSignals[c].pain) return true;
  }
  var cutoff = new Date(Date.now() - (days || 14) * 86400000).toISOString().slice(0, 10);
  var canonical = canonicalExerciseName(exerciseName);
  var log = state.data.workoutLog || [];
  for (var i = 0; i < log.length; i++) {
    var w = log[i];
    if (!w.date || w.date < cutoff) continue;
    var exList = w.exercises || w.exercisesData;
    if (!Array.isArray(exList)) continue;
    for (var j = 0; j < exList.length; j++) {
      var ex = exList[j];
      if (canonicalExerciseName(ex.name) !== canonical) continue;
      if (ex.painFlag) return true;
      var sets = ex.setsDetail;
      if (Array.isArray(sets)) {
        for (var k = 0; k < sets.length; k++) {
          if (sets[k] && (sets[k].painFlag || sets[k].pain_flag)) return true;
        }
      }
    }
  }
  return false;
}

// 점진적 과부하 추천 — 종목 클래스별 진행 규칙 (더블 프로그레션 기반)
// · compound_heavy / light_isolation: 상단 반복 2세션 연속 달성해야 증량 (경량 고립은 "아주 드물게")
// · compound_moderate / isolation: 상단 1세션 달성 → 증량 (장비 최소 단위)
// · rehab: 무게 진행 금지 — 진행 지표는 통증 감소
// · **역방향(어시스트)**: 같은 더블 프로그레션이되 진행 = 보조 무게 **감소**. 0kg(맨몸)에서 바닥.
// · 하드 가드레일: 반복은 클래스 범위로 클램프, 최근 2주 통증 기록 시 증량 금지
// 기록이 없으면 1RM 기반 추천으로 폴백
function getProgressiveRecommendation(exerciseName, targetReps) {
  var cls = getExerciseClass(exerciseName);
  var rules = EXERCISE_CLASS_RULES[cls];
  var range = clampRepsToClass(exerciseName, targetReps);
  var reverse = isReverseProgression(exerciseName);

  var recent = getRecentPerformances(exerciseName, 2);
  var last = recent[0];
  if (!last || !last.sets.length) {
    // 어시스트 종목은 1RM 추적 대상이 아니라 1RM 폴백을 쓸 수 없다 → 체중 기반 첫 보조 무게.
    if (reverse) {
      var a0 = suggestInitialAssistWeight(exerciseName);
      if (a0 === null) return null;
      return { weight: a0, source: 'rm_estimate', reverse: true, repRange: range, exClass: cls,
               note: '첫 시도 — 체중의 약 ' + Math.round(ASSIST_INITIAL_BW_RATIO * 100) + '%를 보조로. 한 세트 해보고 조절하세요' };
    }
    var w = suggestWorkingWeight(exerciseName, 0.7);
    // 라벨이 이미 "첫 시도 추천"이라 note 에 '(첫 시도)'를 또 붙이지 않는다.
    if (w) return { weight: w, source: 'rm_estimate', note: '1RM 추정 기반', repRange: range, exClass: cls };
    return null;
  }

  // 재활: 무게 0(밴드)도 유효 — reps만 있으면 인정
  // 드롭·마이오렙 세트는 **마지막 워킹세트의 연장**이지 독립 세트가 아니다. 진행 판정에서 뺀다 —
  // 특히 마이오렙 미니세트는 본 세트와 무게가 같고 반복이 5회라, 그대로 두면 아래 reachedTopAt이
  // "모든 세트가 상단 반복"을 영원히 만족하지 못해 증량이 통째로 막힌다.
  // 역방향(어시스트)은 보조 0kg(= 맨몸)이 유효한 최종 목표값이라 재활과 같이 0을 허용한다.
  var workingSets = last.sets.filter(function(s) {
    if (isOffProgressSet(s)) return false;
    return ((cls === 'rehab' || reverse) ? s.weight >= 0 : s.weight > 0) && s.reps > 0;
  });
  if (!workingSets.length) return null;

  // 기준 세트 = 가장 **어려운** 세트. 정방향은 최대 무게, 역방향은 최소 보조.
  var maxW = hardestWeight(exerciseName, workingSets.map(function(s) { return s.weight; }));
  var lastReps = workingSets.map(function(s) { return s.reps; });

  if (cls === 'rehab') {
    return {
      weight: maxW,
      source: 'rehab',
      previousWeight: maxW,
      previousReps: lastReps,
      repRange: range,
      exClass: cls,
      note: '재활 종목 — 무게를 올리지 않아요. 통증 없이 ' + range.low + '~' + range.high + '회 컨트롤이 목표 (진행 지표 = 통증 감소)'
    };
  }

  var inc = getWeightIncrement(exerciseName); // 장비 증량 단위 (덤벨 2kg / 그 외 5kg)
  var topReps = range.high;

  // 하드 가드레일: 최근 2주 통증 기록 → 증량 금지, 점검 제안으로 전환
  if (hasRecentPain(exerciseName, 14)) {
    return {
      weight: maxW,
      source: 'maintain',
      painGated: true,
      reverse: reverse,
      previousWeight: maxW,
      previousReps: lastReps,
      repRange: range,
      exClass: cls,
      note: reverse
        ? '최근 2주 내 통증 기록 — 보조를 줄이지 말고 폼·그립·가동범위를 점검해요'
        : '최근 2주 내 통증 기록 — 증량 대신 폼·그립·가동범위를 점검해요'
    };
  }

  // 탑세트+백오프 스킴에서 백오프(탑의 90%)는 무게가 달라 여기서 자동으로 빠진다 →
  // 증량 기준이 "3세트 전부 상단" 에서 "탑세트가 상단" 으로 느슨해진다. 이는 탑세트 방식의
  // 통상 관행과 일치하며, compound_heavy는 doubleSessions:2(2세션 연속 요구)가 완충한다.
  // (docs/research/set-schemes.md §2-B ⚠️ · §5-D — 의도된 변경)
  function reachedTopAt(perf, weight) {
    var ws = perf.sets.filter(function(s) {
      if (isOffProgressSet(s)) return false;
      return s.weight === weight && s.reps > 0 && !s.isWarmup;
    });
    return ws.length > 0 && ws.every(function(s) { return s.reps >= topReps; });
  }

  var lastReachedTop = reachedTopAt(last, maxW);
  var needSessions = rules.doubleSessions; // 증량에 필요한 "상단 달성" 연속 세션 수
  var prevReachedTop = recent.length > 1 && reachedTopAt(recent[1], maxW);
  var canProgress = lastReachedTop && (needSessions <= 1 || prevReachedTop);

  if (canProgress) {
    // 역방향에서 보조 0kg은 바닥이다 — 더 내릴 수 없으니 "맨몸 졸업" 안내로 전환한다.
    if (reverse && maxW <= 0) {
      return {
        weight: 0,
        source: 'maintain',
        reverse: true,
        graduated: true,
        previousWeight: maxW,
        previousReps: lastReps,
        repRange: range,
        exClass: cls,
        note: '보조 0kg에서 상단 ' + topReps + '회 달성 — 이제 맨몸 풀업/딥스예요! 다음은 중량조끼·딥벨트로 무게를 더할 차례'
      };
    }
    var newW = progressedWeight(exerciseName, maxW, inc);
    return {
      weight: newW,
      source: 'progress',
      reverse: reverse,
      previousWeight: maxW,
      previousReps: lastReps,
      repRange: range,
      exClass: cls,
      note: reverse
        ? (needSessions > 1 ? '2세션 연속 ' : '지난 ') + '보조 ' + maxW + 'kg × 상단 ' + topReps + '회 달성 → 보조 ' + newW + 'kg (−' + (maxW - newW) + 'kg = 더 어려워져요)' + assistJumpWarning(exerciseName, maxW, newW)
        : (needSessions > 1 ? '2세션 연속 ' : '지난 ') + maxW + 'kg × 상단 ' + topReps + '회 달성 → ' + newW + 'kg'
    };
  }

  var holdNote;
  if (reverse) {
    // 역방향의 "유지"는 보조 무게를 그대로 두고 반복을 쌓는 것 = 더블 프로그레션의 앞 단계.
    if (lastReachedTop && needSessions > 1) {
      holdNote = '보조 ' + maxW + 'kg × ' + topReps + '회 달성! 한 세션 더 유지하면 보조 −' + inc + 'kg';
    } else {
      holdNote = '지난 보조 ' + maxW + 'kg에서 ' + topReps + '회 도전 (상단 도달 시 보조 −' + inc + 'kg = 증량)';
    }
  } else if (lastReachedTop && needSessions > 1) {
    holdNote = maxW + 'kg × ' + topReps + '회 달성! 한 세션 더 유지하면 +' + inc + 'kg' +
      (cls === 'light_isolation' ? ' (경량 고립은 무게보다 반복·템포·컨트롤로 진행)' : '');
  } else if (cls === 'light_isolation') {
    holdNote = maxW + 'kg 고정, ' + range.low + '~' + range.high + '회에서 반복·템포·컨트롤로 진행';
  } else {
    holdNote = '지난 ' + maxW + 'kg에서 ' + topReps + '회 도전 (상단 도달 시 +' + inc + 'kg)';
  }

  return {
    weight: maxW,
    source: 'maintain',
    reverse: reverse,
    previousWeight: maxW,
    previousReps: lastReps,
    repRange: range,
    exClass: cls,
    note: holdNote
  };
}

// 보조를 한 칸 내렸을 때 **실질 부하(체중 − 보조)** 가 몇 % 뛰는지 경고.
// 보조를 X kg 내리면 실질 부하는 정확히 X kg 늘어나는데, 남은 실질 부하가 작을수록
// 같은 X kg이 훨씬 큰 상대 점프가 된다(체중 70·보조 45 → 실질 25kg에서 −5kg = +20%).
// ACSM 권고 증량 폭은 2~10%이므로 그 상한을 넘으면 "반복이 떨어지는 게 정상"이라고 미리 알린다.
// 근거: ACSM position stand(2009) · ExRx Calculating Actual Resistance — docs/research/assisted-progression.md
var ASSIST_JUMP_WARN_PCT = 0.10;
function assistJumpWarning(exerciseName, oldAssist, newAssist) {
  var net = assistNetLoad(exerciseName, oldAssist);
  if (net === null || net <= 0) return '';
  var jump = (oldAssist - newAssist) / net;
  if (jump <= ASSIST_JUMP_WARN_PCT) return '';
  return ' ※ 실질 부하 +' + Math.round(jump * 100) + '% — 반복이 떨어져도 정상이에요';
}

// 실질 부하 = 체중 − 보조 무게 (어시스트 머신의 실제 저항. ExRx 공식).
// 프로필 체중이 없으면 계산 불가 → null. 역방향 종목이 아니면 의미가 없으므로 null.
function assistNetLoad(exerciseName, assistWeight) {
  if (!isReverseProgression(exerciseName)) return null;
  if (assistWeight === null || assistWeight === undefined) return null;
  var bw = (state.profile && state.profile.weight) ? Number(state.profile.weight) : 0;
  if (!bw || bw <= 0) return null;
  return Math.round((bw - assistWeight) * 10) / 10;
}

// PR 표시 문구 — 정방향은 '+5kg', 역방향(어시스트)은 '보조 −5kg'이 신기록이다.
// 화면 세 곳(홈 PR 카드·완료 화면·기록 PR 히스토리)이 같은 문구를 쓰도록 여기 하나로 모은다.
function formatPRDelta(pr) {
  if (!pr) return '';
  if (pr.weight !== undefined && pr.previousWeight !== undefined && pr.previousWeight !== null) {
    var diff = pr.weight - pr.previousWeight;
    if (isReverseProgression(pr.exerciseName)) return '보조 −' + Math.abs(Math.round(diff * 10) / 10) + 'kg';
    return '+' + diff.toFixed(1) + 'kg';
  }
  if (pr.reps !== undefined) return '+' + (pr.reps - (pr.previousReps || 0)) + '회';
  return '';
}

// PR 변화 한 줄 ('35kg → 40kg (+5.0kg)' / '보조 40kg → 보조 35kg (보조 −5kg)').
function formatPRChange(pr) {
  if (!pr) return '';
  if (pr.weight !== undefined && pr.previousWeight !== undefined && pr.previousWeight !== null) {
    var p = isReverseProgression(pr.exerciseName) ? '보조 ' : '';
    return p + pr.previousWeight + 'kg → ' + p + pr.weight + 'kg (' + formatPRDelta(pr) + ')';
  }
  return (pr.previousReps || 0) + '회 → ' + pr.reps + '회 (' + formatPRDelta(pr) + ')';
}

// 어시스트 종목의 진행 지표 = **보조 무게 감소 추이** (e1RM 대신 쓰는 값).
// [0]=가장 최근. drop/myo는 본 세트의 연장이라 제외하고, 세션마다 가장 어려운(=최소) 보조를 뽑는다.
// 반환: { values: [최근→과거 보조kg], delta: 최초 대비 감소량(양수=진행), sessions: n }
function getAssistProgressTrend(exerciseName, n) {
  if (!isReverseProgression(exerciseName)) return null;
  var perfs = getRecentPerformances(exerciseName, n || RECENT_PERFORMANCES_KEEP);
  var values = [];
  for (var i = 0; i < perfs.length; i++) {
    var ws = perfs[i].sets.filter(function(s) {
      return !isOffProgressSet(s) && !s.isWarmup && s.reps > 0 && s.weight >= 0;
    });
    if (!ws.length) continue;
    values.push(Math.min.apply(null, ws.map(function(s) { return s.weight; })));
  }
  if (!values.length) return null;
  return {
    values: values,
    delta: Math.round((values[values.length - 1] - values[0]) * 10) / 10, // 양수 = 보조가 줄었다 = 진행
    sessions: values.length
  };
}

// 1RM 갱신 (더 높으면). 고횟수는 e1RM 신뢰도가 낮아 제외 — rolling max 경로와 동일 규칙(클래스별 상한).
function update1RM(exerciseName, weight, reps) {
  if (isReverseProgression(exerciseName)) return false; // 보조 무게는 1RM 근거가 될 수 없다 (get1RM 주석)
  if (!weight || !reps) return false;
  if (reps > rolling1RMMaxReps(exerciseName)) return false;

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
// 빠지면 자연히↓ (한 번 못 든 날로 폭락하지 않음). 고횟수 세트는 e1RM 신뢰도가
// 낮아 추세 신호에서 제외한다. 근거: REMAKE-PLAN.md 묶음2 ①.
var ROLLING_1RM_WINDOW = 4; // 기본 추적 윈도우 (세션 수)
var ROLLING_1RM_MAX_REPS = 12; // 절대 상한(클래스별 상한의 천장) — 이 이상은 어떤 종목도 제외

// e1RM 반복 상한 (종목 클래스별).
// 근거상 10회 이하가 확실히 더 정확하다 (Reynolds 2006 — 5RM이 가장 정확 / Mayhew 2008 — 10회 미만에서 우수).
//
// ★ 철칙: 상한이 그 종목의 **처방 반복 상단(repMax) 아래로 내려가면 안 된다.**
//   앱이 스스로 시키는 반복을 e1RM 추적에서 잘라내면, 지시대로 운동한 사용자의 본세트가 전부
//   제외돼 calculateRollingMax1RM이 null → reconcile1RMFromLog가 건너뛰고(`if (!roll) continue`)
//   추적 1RM이 INITIAL_1RM에 영원히 묶이며 PR 배지도 다시는 안 뜬다.
//   (repMin을 쓰면 '중강도 복합'(8~12회 처방)이 상한 10이 되어 11·12회 본세트가 통째로 잘린다 —
//    랫 풀 다운·머신 시티드 로우·머신 체스트 프레스가 정확히 이 경우다.)
// 그래서 repMax를 바닥으로 삼고, 기존 상한(12)보다 느슨해지지도 않게 min/max로 묶는다.
//   compound_heavy(5~8회 처방)   → 10 (강화. 처방이 8회를 넘지 않으므로 잘리는 세트가 없다)
//   compound_moderate(8~12회)    → 12 (유지)
//   isolation(12~15) · light_isolation(15~25) · rehab(15~20) → 12 (유지)
// 즉 "처방 범위는 절대 자르지 않되, 그 위로는 12회를 천장으로 둔다"가 실제 규칙이다.
// 근본 해결(반복 12회 초과 구간까지 정확한 e1RM)은 세트별 RIR 실측이 필요하다 — 백로그 #7.
var ROLLING_1RM_BASE_MAX_REPS = 10;

function rolling1RMMaxReps(exerciseName) {
  var rules = EXERCISE_CLASS_RULES[getExerciseClass(exerciseName)];
  if (!rules) return ROLLING_1RM_MAX_REPS;
  return Math.min(ROLLING_1RM_MAX_REPS, Math.max(ROLLING_1RM_BASE_MAX_REPS, rules.repMax));
}

function calculateRollingMax1RM(exerciseName, windowSessions) {
  // 어시스트 종목은 e1RM 추적 대상이 아니다. 그대로 두면 "세션별 최고 e1RM"이 곧
  // "가장 많이 보조받은(=가장 쉬운) 세트"가 되어, 보조를 줄일수록 1RM이 떨어지는 역전이 생긴다.
  if (isReverseProgression(exerciseName)) return null;
  var n = windowSessions || ROLLING_1RM_WINDOW;
  var log = (state.data && state.data.workoutLog) || [];
  var canonical = EXERCISE_ALIASES_1RM[exerciseName] || exerciseName;
  var maxReps = rolling1RMMaxReps(exerciseName); // 클래스별 e1RM 신뢰 반복 상한 (루프 밖에서 1회 계산)

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
        // 드롭·마이오렙 세트 제외 (완료 시점의 update1RM과 같은 규칙 — 세 경로가 어긋나면 안 된다).
        // 특히 경량 고립은 워킹세트(20회)가 반복 상한에 걸려 빠지는데 미니세트(5회)만 남아,
        // 지친 상태의 미니세트가 그 종목의 유일한 e1RM 근거가 되는 역전이 생긴다.
        if (isOffProgressSet(s)) continue;
        if (!s.weight || !s.reps) continue;
        if (s.reps > maxReps) continue; // 고횟수 제외 (클래스별 상한)
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

// 세션 세트 구성용 시작 무게·횟수 — 추천 카드(getProgressiveRecommendation)와 반드시 일치.
// · 수행 기록 있음: 추천 무게 그대로 (유지=지난 실제 무게, 증량=스냅된 새 무게 — 5kg처럼 격자 밖 무게도 보존)
// · 기록 없음: AI/템플릿 제안 무게를 장비 단위로 스냅
// · 횟수: 유지/재활이면 지난 세션 최고 반복(범위로 클램프) = "지난 기록에 도전", 증량이면 범위 하단부터 다시
// · sets: 세트법(스킴)에 따라 만들어진 세트 배열 — opts = { sets: 워킹세트 수, warmup: bool }
function getSessionSetPlan(exerciseName, fallbackWeight, targetReps, opts) {
  var range = clampRepsToClass(exerciseName, targetReps);
  var prog = getProgressiveRecommendation(exerciseName, targetReps);

  // 어시스트 종목은 **보조 0kg(맨몸)이 유효한 값**이다 — falsy라고 버리면 AI/템플릿이 지정한
  // "맨몸으로 하세요"가 조용히 체중 기반 첫 보조(30kg 등)로 되돌아간다.
  var hasFallback = isReverseProgression(exerciseName)
    ? (typeof fallbackWeight === 'number' && fallbackWeight >= 0)
    : !!fallbackWeight;

  var weight = null;
  if (prog && prog.source !== 'rm_estimate') {
    weight = prog.weight;
  } else if (hasFallback) {
    weight = snapWeightToEquipment(fallbackWeight, exerciseName);
  } else if (prog) {
    weight = prog.weight; // 1RM 추정 폴백
  }

  var reps = range.low;
  if (prog && prog.source !== 'progress' && prog.previousReps && prog.previousReps.length) {
    var lastMax = Math.max.apply(null, prog.previousReps);
    reps = Math.min(Math.max(lastMax, range.low), range.high);
  }

  var scheme = effectiveSetScheme(exerciseName, weight);
  return {
    weight: weight, reps: reps, repRange: range, prog: prog,
    scheme: scheme,
    // 세트 배열. 기존 4개 필드는 그대로 둔다(하위호환) — 호출부가 sets를 쓰지 않아도 깨지지 않는다.
    sets: buildSchemeSets(exerciseName, weight, reps, range, scheme, opts)
  };
}

// 그 세트법이 **감량(무게를 낮추는 단)** 위에 서 있는가. 스킴 표에서 직접 읽는다 —
// 스킴이 늘어날 때마다 여기 이름을 추가하는 걸 잊으면 미리보기와 실제 세트가 어긋난다(v2 §4-E).
function schemeNeedsWeight(scheme) {
  var b = SET_SCHEMES[scheme] && SET_SCHEMES[scheme].build;
  if (!b || !Array.isArray(b.steps)) return false;
  for (var i = 0; i < b.steps.length; i++) {
    if (typeof b.steps[i].pct === 'number' && b.steps[i].pct < 1) return true;
  }
  return false;
}

// 실제로 적용되는 세트법. 무게를 모르는 종목(맨몸·미측정)은 감량 자체가 불가능하므로
// 탑+백오프·백다운·피라미드·역피라미드·드롭이 성립하지 않는다
// → 스트레이트로 접어서 **화면 표기와 실제 세트를 일치시킨다**.
function effectiveSetScheme(exerciseName, weight) {
  var scheme = getSetScheme(exerciseName);
  // 역방향(어시스트)은 보조 0kg에서도 "더 쉽게"가 가능하다(보조를 더 준다) → 스킴을 접지 않는다.
  if (isReverseProgression(exerciseName)) return scheme;
  if ((!weight || weight <= 0) && schemeNeedsWeight(scheme)) return 'straight';
  return scheme;
}

// ═══════════════════════════════════════════════
// 세트 스킴 (세트 구성) — docs/research/set-schemes.md
// ═══════════════════════════════════════════════
// 핵심 사실: 볼륨을 맞추면 세트법 간 근비대 차이는 **없다**(Angleri 2017 / Sødal 2023 메타).
// 그래서 여기 로직의 목적은 "더 좋은 세트법 찾기"가 아니라 **문제에 맞는 세트법 배정**이다.
//  · 고중량 복합 = 탑세트+백오프 → 뒤 세트 반복 붕괴로 잃는 볼륨 로드를 감량으로 보존
//  · 그 외        = 스트레이트 유지 → 근거가 뒷받침하는 가장 단순한 안
//  · 드롭·마이오렙 = 근비대 동등, 이득은 오직 시간 → 조건부 "제안"으로만(§4)

// 이 종목에 적용할 세트법. 사용자 지정(종목별 override) > 클래스 기본값.
// 재활은 lockScheme — 무게 진행 금지 원칙이라 드롭·마이오렙을 절대 허용하지 않는다.
function getSetScheme(exerciseName) {
  var rules = EXERCISE_CLASS_RULES[getExerciseClass(exerciseName)];
  if (rules.lockScheme) return rules.scheme;
  var overrides = storage.get(KEYS.SET_SCHEMES, {}) || {};
  var picked = overrides[canonicalExerciseName(exerciseName)] || overrides[exerciseName];
  return (picked && SET_SCHEMES[picked]) ? picked : rules.scheme;
}

// 사용자가 종목별 세트법을 바꾼다. 클래스 기본값과 같으면 override를 지운다(기본값 변경을 따라가도록).
function setSetSchemeOverride(exerciseName, scheme) {
  var rules = EXERCISE_CLASS_RULES[getExerciseClass(exerciseName)];
  if (rules.lockScheme || !SET_SCHEMES[scheme]) return false;
  var overrides = storage.get(KEYS.SET_SCHEMES, {}) || {};
  var key = canonicalExerciseName(exerciseName);
  if (scheme === rules.scheme) delete overrides[key];
  else overrides[key] = scheme;
  storage.set(KEYS.SET_SCHEMES, overrides);
  return true;
}

// 어시스트(역방향) 종목에서 다시 쓰는 설명문. "가볍게 = 보조를 더" 라서 %·감량 표기가 정반대로 읽힌다.
var REVERSE_SCHEME_DESC = {
  top_backoff:  '가장 낮은 보조로 1세트 → 보조를 한 칸 올려 2세트',
  top_backdown: '가장 낮은 보조로 1세트 → 보조를 크게 올려 12~15회',
  pyramid:      '보조를 많이 준 세트부터 시작해 점점 줄여요',
  rpt:          '가장 낮은 보조로 시작해 세트마다 보조를 늘려요',
  drop:         '마지막 세트에서 보조를 두 칸씩 올려 이어서'
};

// 세트법 선택지 (세션 화면 "세트법 바꾸기" 시트용).
// 재활은 스트레이트 하나뿐. 나머지는 7종을 모두 고를 수 있되, 근거상 권장 여부를 warn으로 알려준다
// — 자동 배정은 앱이 하지만 최종 선택은 사용자 몫이라는 게 이 기능의 요구사항이다.
// warn 문구는 v2 §4-C② 표를 그대로 옮긴 것이다(해요체 · 40자 이내).
function getSetSchemeOptions(exerciseName) {
  var cls = getExerciseClass(exerciseName);
  var rules = EXERCISE_CLASS_RULES[cls];
  var current = getSetScheme(exerciseName);
  if (rules.lockScheme) {
    return [{ id: 'straight', kr: SET_SCHEMES.straight.kr, desc: '재활 종목은 스트레이트 고정이에요 (무게 진행 금지)',
              current: true, suggested: true, warn: '' }];
  }
  var machineOrCable = isMachineOrCableExercise(exerciseName);
  var reverse = isReverseProgression(exerciseName);
  var freeHeavy = (cls === 'compound_heavy' || cls === 'compound_moderate') && !machineOrCable;
  return SET_SCHEME_ORDER.map(function(id) {
    var warn = '';
    if (id === 'top_backoff' && cls !== 'compound_heavy') warn = '고중량 복합에 맞춘 방식이에요';
    if (id === 'top_backdown' && cls === 'compound_heavy') warn = '시간이 3분쯤 더 들어요';
    if (id === 'top_backdown' && freeHeavy) warn = '프리웨이트에선 마지막에 폼이 흔들려요';
    if (id === 'pyramid') warn = '첫 세트는 자극이 약해요';
    if (id === 'rpt' && freeHeavy) warn = '첫 세트부터 한계라 폼이 흔들려요';
    if (id === 'drop' && !machineOrCable) warn = '프리웨이트에선 위험해요 — 마이오렙을 권해요';
    if (id === 'drop' && cls === 'compound_heavy') warn = '고중량 복합에는 권하지 않아요 (피로 대비 이득 없음)';
    if (id === 'myo_reps' && cls === 'compound_heavy') warn = '고중량 복합에는 권하지 않아요';
    return {
      id: id, kr: SET_SCHEMES[id].kr,
      desc: (reverse && REVERSE_SCHEME_DESC[id]) || SET_SCHEMES[id].desc,
      current: id === current, suggested: id === rules.scheme, warn: warn
    };
  });
}

// 세션 화면이 "이 종목은 지금 무슨 세트법인가"를 물을 때 쓰는 단일 원천.
// 세트를 만들 때 확정된 값(exercise.scheme)이 우선이다 — 저장된 사용자 선택(getSetScheme)은
// 무게를 모르는 종목에서 스트레이트로 접히기 전의 값이라, 그걸 그대로 적으면 화면이 거짓말을 한다.
// scheme 이 없는 옛 세션은 저장된 선택으로 되돌아간다(하위호환).
function sessionSchemeOf(exercise) {
  var s = exercise && exercise.scheme;
  if (s && SET_SCHEMES[s]) return s;
  return getSetScheme(exercise ? exercise.name : '');
}

// 그 스킴이 탑세트 **다음**에 두는 단 (없으면 null).
// "세트 추가"가 탑세트 뒤에 무엇을 붙일지 결정하는 데 쓴다 — 탑+백오프면 백오프, 탑+백다운이면 백다운.
function nextStepAfterTop(scheme) {
  var build = SET_SCHEMES[scheme] && SET_SCHEMES[scheme].build;
  if (!build || build.pattern !== 'ramp' || !Array.isArray(build.steps)) return null;
  var seenTop = false;
  for (var i = 0; i < build.steps.length; i++) {
    if (build.steps[i].role === 'top') { seenTop = true; continue; }
    if (seenTop && typeof build.steps[i].pct === 'number' && build.steps[i].pct < 1) return build.steps[i];
  }
  return null;
}

// [v2 §2-E③] 탑세트가 목표 반복을 못 채웠으면 **아직 안 한 백오프**를 한 스텝 더 내린다.
// 근거: Khairallah 2009 — 필요한 감량폭은 그날 컨디션·종목에 따라 다르고, 탑세트가 이미 무너졌다면
// 10% 감량으로는 백오프에서 반복이 또 무너진다. Helms 2018도 감량폭을 키우면 총 볼륨이 산다고 보고했다.
// 세션 중에(탑세트를 실제로 기록한 뒤) 부르는 자가조절 규칙이라 미리보기 계획은 건드리지 않는다.
// 반환: 실제로 낮춘 세트 수 (0이면 아무것도 안 바뀜)
function applyTopSetAutoDeload(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return 0;
  var build = SET_SCHEMES[sessionSchemeOf(exercise)] && SET_SCHEMES[sessionSchemeOf(exercise)].build;
  if (!build || !build.autoDeload) return 0;

  var top = null;
  for (var i = 0; i < exercise.sets.length; i++) {
    var s = exercise.sets[i];
    if (s && s.completed && !s.isWarmup && s.role === 'top') top = s;
  }
  if (!top || top.weight === null || top.weight === undefined || !(top.reps > 0)) return 0;

  var range = clampRepsToClass(exercise.name, exercise.targetReps);
  if (top.reps >= range.high) return 0;                 // 목표 달성 — 현행 감량폭 유지

  // 평소 백오프보다 **반드시 한 스텝 더** 쉬운 무게. 반올림으로 두 값이 같아지는 구간을 막는다.
  var step = getWeightIncrement(exercise.name);
  var normal = reduceWeight(top.weight, BACKOFF_PCT, exercise.name);
  var deloaded = reduceWeight(top.weight, build.autoDeload.pct, exercise.name);
  if (isReverseProgression(exercise.name)) {
    if (deloaded <= normal) deloaded = normal + step;    // 보조는 더 늘어야 쉬워진다
  } else if (deloaded >= normal) {
    deloaded = Math.max(step, normal - step);
  }
  if (deloaded === normal) return 0;                     // 더 내릴 자리가 없다 (최저 중량)

  var changed = 0;
  exercise.sets.forEach(function(s) {
    if (!s || s.completed || s.isWarmup || s.role !== 'backoff') return;
    if (s.weight === deloaded) return;
    s.weight = deloaded;
    s.autoDeloaded = true;
    changed++;
  });
  return changed;
}

// 장비가 머신·케이블인가 (드롭세트 조건 §4-A②: 안정성이 높아 실패 지점에서도 부상 위험이 낮다 — Sødal 2023)
function isMachineOrCableExercise(exerciseName) {
  var eq = getExerciseEquipment(exerciseName);
  if (!eq) return false;
  if (eq === 'cable') return true;
  if (eq === 'barbell' || eq === 'dumbbell' || eq === 'bodyweight' || eq === 'smith') return false;
  return true; // 나머지 GYM_EQUIPMENT id는 전부 머신
}

// 클래스별 기본 휴식(초). 옛 로직은 종목 이름 키워드 배열로 복합/고립을 따로 판정해
// getExerciseClass와 어긋날 수 있었다 — 판정 원천을 클래스 하나로 통합한다.
function getExerciseRestSec(exerciseName) {
  return EXERCISE_CLASS_RULES[getExerciseClass(exerciseName)].restSec;
}

// 진행 판정·1RM·'지난 기록'에서 빼야 하는 세트인가 (data.js SET_ROLES_OFF_PROGRESS 가 단일 원천).
// **볼륨 카운트에는 쓰지 않는다** — 백다운은 독립 워킹세트라 볼륨에 들어간다(v2 §3-C C-4).
function isOffProgressSet(s) {
  return !!(s && s.role && SET_ROLES_OFF_PROGRESS.indexOf(s.role) !== -1);
}

// 볼륨 카운트용 워킹세트 수.
// 드롭·마이오렙 세트는 **마지막 워킹세트의 연장**이지 독립 세트가 아니다. 그대로 세면
// 3세트 종목이 5세트로 잡혀 주간 볼륨 폐루프(AI 프롬프트·부족 부위 판정)가 부풀려진다.
// setsCount가 없는 옛/복원 데이터도 같은 규칙으로 세도록 이 헬퍼를 단일 원천으로 쓴다.
function countWorkingSets(sets) {
  if (!Array.isArray(sets)) return 0;
  return sets.filter(function(s) {
    return s && s.completed && !s.isWarmup && s.role !== 'drop' && s.role !== 'myo';
  }).length;
}

// 램프 스텝을 실제 워킹세트 수(n)에 맞춰 펼친다 (v2 §4-A build.steps 해석기).
// 규칙:
//  · repeat:'fill' 스텝은 남는 자리를 전부 채운다 (백오프·백다운·피라미드 하단)
//  · last:true 스텝은 언제나 **마지막 자리**를 차지한다 (백오프의 RIR 0~1 세트, 피라미드의 탑세트)
//  · n이 스텝 수보다 적으면 **핵심 세트부터** 남긴다 — 핵심은 progressFrom 이 가리키는 쪽
//    (증량 판정 기준 세트가 사라지면 그 스킴은 진행이 멈춘다)
// 반환: 선언 순서대로 정렬된 스텝 배열 (길이 = n)
function expandRampSteps(build, n) {
  if (n <= 0) return [];
  var steps = (build && build.steps) || [];
  if (!steps.length) return [];

  var fillIdx = -1, lastIdx = -1;
  for (var i = 0; i < steps.length; i++) {
    if (steps[i].repeat === 'fill' && fillIdx < 0) fillIdx = i;
    if (steps[i].last) lastIdx = i;
  }

  // 세트 수가 모자랄 때 남길 우선순위. 피라미드는 마지막(가장 무거운) 세트가 핵심이다.
  var priority = [];
  for (var f = 0; f < steps.length; f++) {
    if (f !== fillIdx) priority.push(f);
  }
  if (build.progressFrom === 'last') priority.reverse();
  if (fillIdx >= 0) priority.push(fillIdx);   // fill 은 남는 자리를 채우는 역할이라 마지막 순위

  var keep = {}, kept = 0;
  for (var p = 0; p < priority.length && kept < n; p++) { keep[priority[p]] = 1; kept++; }

  // 남는 자리는 전부 fill 스텝 차지. 다른 스텝은 한 자리씩이므로 먼저 세어 두고 나머지를 넘긴다
  // (여기서 자리 수를 잘못 세면 마지막에 slice 로 탑세트가 잘려 나간다).
  var fixedKept = 0;
  for (var q = 0; q < steps.length; q++) if (keep[q] && q !== fillIdx) fixedKept++;
  var fillTimes = keep[fillIdx] ? Math.max(1, n - fixedKept) : 0;

  var out = [];
  for (var s = 0; s < steps.length; s++) {
    if (!keep[s] || s === lastIdx) continue;                  // last 스텝은 맨 끝에 따로 붙인다
    var times = (s === fillIdx) ? fillTimes : 1;
    for (var t = 0; t < times; t++) out.push(steps[s]);
  }
  if (lastIdx >= 0 && keep[lastIdx]) out.push(steps[lastIdx]);
  return out.slice(0, n);
}

// 세트 배열 생성. opts = { sets: 워킹세트 수, warmup: 워밍업 포함 여부 }
// 무게를 모르는 종목(맨몸·미측정)은 감량 자체가 불가능하므로 감량 기반 스킴을 스트레이트로 접는다.
// sets: 0 은 유효한 값이다 — "남은 워킹세트가 없다"는 뜻이고, 이때 새 워킹세트를 만들면 안 된다.
// **세트 생성 규칙은 코드가 아니라 SET_SCHEMES[scheme].build 에 있다** (v2 §4-A) — 여기는 해석기다.
function buildSchemeSets(exerciseName, weight, reps, range, scheme, opts) {
  var requested = (opts && opts.sets !== undefined && opts.sets !== null) ? opts.sets : 3;
  var workingCount = Math.max(0, requested);
  var wantWarmup = !opts || opts.warmup !== false;
  var classRest = getExerciseRestSec(exerciseName);
  var cls = getExerciseClass(exerciseName);
  var reverse = isReverseProgression(exerciseName);

  // 역방향(어시스트)은 보조 0kg에서도 감량(=보조 증가)이 가능하므로 스킴을 접지 않는다.
  if (!reverse && (!weight || weight <= 0) && schemeNeedsWeight(scheme)) scheme = 'straight';
  var build = (SET_SCHEMES[scheme] && SET_SCHEMES[scheme].build) || SET_SCHEMES.straight.build;

  // ── 워킹세트를 **먼저** 만든다. 워밍업 램프의 마지막 단(피더)이 첫 워킹세트보다
  //    무거우면 안 되기 때문이다(피라미드는 첫 워킹세트가 이미 85%라 피더가 들어갈 자리가 없다).
  var workRows = [];
  if (workingCount > 0 && build.pattern === 'ramp') {
    var plan = expandRampSteps(build, workingCount);
    // 사다리 무게는 **한 번에** 계산한다 — 단마다 따로 반올림하면 두 단이 같은 값으로 뭉개진다.
    var pcts = [];
    plan.forEach(function(st) { if (pcts.indexOf(st.pct) === -1) pcts.push(st.pct); });
    pcts.sort(function(a, b) { return b - a; });          // 무거운 순
    var ladder = buildWeightLadder(exerciseName, weight, pcts);
    plan.forEach(function(st) {
      workRows.push(workRow(st.role || 'work', ladder[st.pct], stepReps(st), st.rest || classRest, st.rir, st));
    });
  } else if (workingCount > 0) {
    var rir = (cls === 'compound_heavy' || cls === 'compound_moderate') ? '2-3' : '0-2';
    for (var i = 0; i < workingCount; i++) workRows.push(workRow('work', weight, reps, classRest, rir, null));
  }

  // ── 워밍업 (§2-B 규칙①) — 자극이 아니라 준비이므로 저부하 고반복은 피로만 준다.
  //    고립 이하는 첫 워킹세트가 자체 워밍업 역할을 하므로 넣지 않는다.
  //    맨몸 복합(풀업 등)은 무게를 낮출 수 없으니 램프 대신 1세트만 (기존 동작 유지).
  var rows = [];
  if (wantWarmup && workingCount > 0) {
    if (reverse && (cls === 'compound_heavy' || cls === 'compound_moderate')) {
      // 역방향: 워밍업 = 보조를 **더 준** 가벼운 세트 (보조 0kg에서도 성립한다)
      var wstep = getWeightIncrement(exerciseName);
      var base = weight > 0 ? weight : 0;
      if (cls === 'compound_heavy') rows.push(warmupRow(base + wstep * 3, 8));
      rows.push(warmupRow(base + wstep, cls === 'compound_heavy' ? 4 : 8));
    } else if (weight > 0 && cls === 'compound_heavy') {
      rows.push(warmupRow(snapWeightToEquipment(weight * 0.50, exerciseName), 8));
      rows.push(warmupRow(snapWeightToEquipment(weight * 0.75, exerciseName), 4));
      // [v2 §2-F] 피더 단 — 램프가 75%에서 멈추면 첫 워킹세트가 무겁게 느껴진다.
      // 근거는 "마지막 웜업 단을 더 무겁게, 더 적은 반복으로"(De Freitas PAP 등, 급성 수행 개선 = 중간).
      // 첫 워킹세트보다 가벼울 때만 넣는다 — 피라미드처럼 첫 세트가 이미 가벼운 스킴엔 자리가 없다.
      var feeder = reduceWeight(weight, FEEDER_PCT, exerciseName);
      var firstWorkW = workRows.length ? workRows[0].weight : weight;
      var rampTop = rows[rows.length - 1].weight;
      if (build.feeder && feeder > rampTop && feeder < firstWorkW) {
        rows.push(warmupRow(feeder, FEEDER_REPS));
      }
    } else if (weight > 0 && cls === 'compound_moderate') {
      rows.push(warmupRow(snapWeightToEquipment(weight * 0.55, exerciseName), 8));
    } else if (!weight && (cls === 'compound_heavy' || cls === 'compound_moderate')) {
      rows.push(warmupRow(null, 8));
    }
  }
  rows = rows.concat(workRows);

  // ── 마지막 워킹세트에만 붙는 확장 (§2-B 규칙④⑤ — build.pattern === 'extend').
  //    워킹세트가 0개여도(=본 세트를 이미 다 끝냈어도) 붙는다 — 그 경우 호출부가 들고 있는
  //    "완료된 마지막 세트"에 이어지므로, rows가 비어 있을 때는 rest 덮어쓰기만 건너뛴다.
  //    마이오렙은 무게를 바꾸지 않으므로 맨몸 종목에서도 성립한다 — 감량이 필요한 드롭만 무게를 요구한다.
  var extendOk = !schemeNeedsWeight(scheme) || (reverse ? weight >= 0 : weight > 0);
  if (build.pattern === 'extend' && extendOk) {
    var extRows = [];
    var chainW = weight;
    (build.steps || []).forEach(function(st) {
      var times = (typeof st.repeat === 'number') ? st.repeat : 1;
      for (var k = 0; k < times; k++) {
        var w = (st.pct >= 1) ? weight
              : reduceWeight(st.chainFrom === 'prev' ? chainW : weight, st.pct, exerciseName);
        chainW = w;
        extRows.push(workRow(st.role, w, stepReps(st), st.rest || classRest, st.rir, st));
      }
    });
    if (extRows.length) {
      // 연장 세트 **사이**의 짧은 휴식이 이 스킴의 정의다 — 직전 세트의 휴식도 그 값으로 덮어쓴다.
      var gap = (build.steps[0] && build.steps[0].rest) || classRest;
      if (rows.length) rows[rows.length - 1].rest = gap;
      for (var e = 0; e < extRows.length - 1; e++) extRows[e].rest = gap;
      extRows[extRows.length - 1].rest = classRest;   // 마지막 연장 뒤는 클래스 휴식으로 복귀
      rows = rows.concat(extRows);
    }
  }

  return rows;

  // 그 단의 목표 반복. repsAbs 는 절대값, repsDelta 는 가감, repsMode:'high' 는 범위 상단.
  // **클래스 범위로 클램프하지 않는다** — 피라미드의 +4나 백다운의 12~15가 잘리면 스킴이 무너진다
  // (v2 §4-E "가장 놓치기 쉬운 지점").
  function stepReps(st) {
    if (!st) return reps;
    if (Array.isArray(st.repsAbs)) return st.repsAbs[0];
    if (st.repsMode === 'high') return range.high;
    return Math.max(1, reps + (st.repsDelta || 0));
  }
  function warmupRow(w, r) {
    return { weight: w, reps: r, completed: false, isWarmup: true, role: 'warmup', rest: REST_WARMUP_SEC };
  }
  function workRow(role, w, r, rest, rirBand, st) {
    var row = { weight: w, reps: r, completed: false, isWarmup: false, role: role, rest: rest, rir: rirBand };
    // 미리보기(describeSetStructure)가 화면에 적을 **명목 배율**. 실제 무게에서 역산하지 않는 이유는
    // 반올림 때문에 60kg의 90%가 "92%"로 뜨는 등 스킴이 선언한 규칙과 다른 숫자가 나가기 때문이다.
    if (st && typeof st.pct === 'number' && st.pct < 1) row.pct = st.pct;
    if (st && st.amrap && Array.isArray(st.repsAbs)) { row.amrap = true; row.repsMax = st.repsAbs[1]; }
    return row;
  }
}

// 루틴 미리보기(2단계 처방 표 · 대화 미리보기)가 쓰는 세트 계획.
// **시작 버튼(startGeneratedRoutine)과 같은 인자**로 계획해야 미리보기와 실제 세션이 어긋나지 않는다.
// 워밍업만 뺀다 — 미리보기는 워킹세트 구성만 말하고, 워킹세트는 워밍업 유무와 무관하다.
function getRoutinePreviewPlan(ex) {
  if (!ex || !ex.name) return null;
  return getSessionSetPlan(ex.name, ex.weight, ex.reps || '8-12', { sets: ex.sets || 3, warmup: false });
}

// 미리보기 처방 표 한 줄의 값 — 무게·반복·세트·RIR·휴식.
// **전부 계획(getRoutinePreviewPlan)에서 뽑는다.** AI가 준 원본을 적으면 화면이 거짓말을 한다:
//  · 무게: 수행 기록이 있으면 세션은 점진적 과부하 추천값으로 시작한다(AI 무게가 아니라)
//  · 반복: 종목 클래스 범위로 교정된다(clampRepsToClass 가드레일)
//  · RIR : 세트 역할이 정한다(탑 1-2 / 백오프·복합 2-3 / 그 외 0-2). AI의 rir 은 세션이 안 쓴다
//  · 휴식: resolveRestSec 이 세트가 들고 있는 값을 먼저 쓰므로 결국 클래스 기본값이다
// 표기는 첫 워킹세트 기준 — 탑세트+백오프처럼 세트마다 다른 경우는 아래 세트 구성 줄이 풀어 준다.
function buildPrescriptionValues(ex, plan) {
  var first = plan ? plan.sets.filter(function(s) { return s && !s.isWarmup; })[0] : null;
  if (!plan || !first) {
    // 계획을 못 세우는 종목(이름 없음·워킹세트 0개)은 AI가 준 값이라도 보여준다.
    // 다만 숫자 자리에 숫자가 아닌 게 오면 적지 않는다 — 'abc세트' 같은 줄이 나가면 안 된다.
    // parseInt 는 '3abc'를 3으로 읽어 주므로 문자열 전체를 먼저 본다(restSecToMin 과 같은 규칙).
    var rawSets = /^\d+$/.test(String(ex ? ex.sets : '').trim()) ? parseInt(ex.sets, 10) : NaN;
    return {
      weight: (ex && ex.weight !== undefined && ex.weight !== null) ? ex.weight : null,
      reps: ex ? ex.reps : null,
      sets: (rawSets > 0) ? rawSets : null,
      rir: ex ? ex.rir : null,
      rest: (ex && ex.rest) ? restSecToMin(ex.rest) : null
    };
  }
  return {
    weight: (plan.weight === null || plan.weight === undefined) ? null : plan.weight,
    reps: repRangeToStr(plan.repRange),
    // 드롭·마이오렙 세트는 마지막 워킹세트의 연장이지 독립 세트가 아니다(countWorkingSets 와 같은 규칙).
    sets: plan.sets.filter(function(s) {
      return s && !s.isWarmup && s.role !== 'drop' && s.role !== 'myo';
    }).length,
    rir: first.rir,
    rest: restSecToMin(first.rest)
  };
}

// 휴식 초 → "3분" / "1.5-2분" (AI가 준 "90-120" 같은 범위 문자열도 받는다).
// 숫자로 못 읽히는 값은 통째로 버린다 — 'NaN분'을 화면에 내보내느니 아무것도 안 적는 게 낫다.
function restSecToMin(v) {
  var raw = String(v === null || v === undefined ? '' : v).trim();
  // "180" 또는 "90-120" 만 받는다. 음수·문자는 통째로 버린다 ('-90'을 '-'로 쪼개면 90초가 돼 버린다).
  if (!/^\d+(-\d+)?$/.test(raw)) return null;
  var mins = raw.split('-').map(function(x) {
    var sec = parseInt(x, 10);
    if (!(sec > 0)) return null;
    var m = sec / 60;
    return (m % 1 === 0) ? m : Math.round(m * 10) / 10;
  }).filter(function(m) { return m !== null; });
  return mins.length ? mins.join('-') + '분' : null;
}

// 배율 → 화면 문자열. 82.5%·92.5% 처럼 0.5 단위가 있는 스킴이 있으므로 소수 한 자리까지 살린다
// (정수로 반올림하면 시트 설명의 '82.5%'와 미리보기의 '83%'가 어긋난다).
function formatPct(pct) {
  var v = Math.round(pct * 1000) / 10;
  return (v % 1 === 0 ? String(v) : v.toFixed(1)) + '%';
}

// 세트 구성 한 줄 — "탑세트 1 + 백오프 2 (90%)".
// 숫자·비율을 화면에서 따로 적지 않고 **실제로 만들어진 세트 배열에서 센다**. 그래야 사용자가
// 세트법을 바꾸거나(종목별 override), 무게를 몰라 스트레이트로 접힐 때(effectiveSetScheme)
// 미리보기가 저절로 따라온다 — 화면과 세션이 서로 다른 말을 할 수 없다.
// 스트레이트(전부 work)는 '세트' 열이 이미 같은 사실을 말하므로 빈 문자열을 돌려준다.
// 세트마다 RIR이 다르면(탑 1-2 / 백오프 2-3) 역할별로 같이 적는다 — 'RIR' 열은 한 값만 담아서
// 첫 세트 기준이 되는데, 그 줄만 보면 뒤 세트도 같은 강도인 줄 읽힌다.
function describeSetStructure(sets, exerciseName) {
  if (!Array.isArray(sets)) return '';
  var order = [], count = {}, rirOf = {}, rirSeen = {}, rirKinds = 0, pctsOf = {}, ampOf = {}, wOf = {}, allW = [];
  sets.forEach(function(s) {
    if (!s || s.isWarmup) return;
    var role = s.role || 'work';
    if (count[role] === undefined) { count[role] = 0; order.push(role); rirOf[role] = s.rir; pctsOf[role] = []; wOf[role] = []; }
    count[role]++;
    if (typeof s.weight === 'number') {
      allW.push(s.weight);
      if (wOf[role].indexOf(s.weight) === -1) wOf[role].push(s.weight);
    }
    // 명목 배율은 세트 배열이 들고 있는 값을 그대로 쓴다(buildSchemeSets 가 스탬프한 build.steps[].pct).
    // 실제 무게에서 역산하면 반올림 때문에 "90% 백오프"가 화면에 92%로 뜬다.
    if (typeof s.pct === 'number' && pctsOf[role].indexOf(s.pct) === -1) pctsOf[role].push(s.pct);
    if (s.amrap && s.repsMax && !ampOf[role]) ampOf[role] = s.reps + '~' + s.repsMax + '회';
    if (s.rir !== undefined && s.rir !== null && !rirSeen[s.rir]) { rirSeen[s.rir] = true; rirKinds++; }
  });
  if (!order.length) return '';
  if (order.length === 1 && order[0] === 'work') return '';

  // 역방향(어시스트)은 "가볍게 = 보조를 더" 라서 90%·−25% 가 정반대로 읽힌다.
  // 보조 종목의 %는 실질 부하(체중 − 보조)와 아무 관계가 없으므로 **실제 무게 차이를 '칸'으로** 적는다.
  var reverse = isReverseProgression(exerciseName);
  var baseW = allW.length ? Math.min.apply(null, allW) : null;   // 보조가 가장 적은 = 가장 어려운 세트
  var inc = getWeightIncrement(exerciseName);
  var STEP_KR = ['', '한', '두', '세', '네', '다섯'];

  var parts = order.map(function(role, i) {
    var kr = SET_ROLE_KR[role];                      // work 는 빈 문자열 = 역할 이름이 없는 보통 세트
    var label = kr ? kr + ' ' + count[role] : count[role] + '세트';
    var notes = [];
    var pcts = pctsOf[role] || [];
    if (pcts.length) {
      if (reverse) {
        var steps = [];
        (wOf[role] || []).forEach(function(w) {
          var d = Math.round((w - baseW) / inc);
          var t = STEP_KR[d] || String(d);
          if (d > 0 && steps.indexOf(t) === -1) steps.push(t);
        });
        if (steps.length) notes.push('보조 ' + steps.join('→') + ' 칸');
      } else if (role === 'drop') {
        notes.push('−' + Math.round((1 - pcts[0]) * 100) + '%');   // 드롭은 "매번 −25%"가 더 읽기 쉽다
      } else {
        notes.push(pcts.map(formatPct).join('→'));
      }
    }
    if (ampOf[role]) notes.push(ampOf[role]);
    // RIR은 **첫 역할 다음부터**만 적는다 — 첫 역할의 값은 이미 'RIR' 열에 있다.
    if (i > 0 && rirKinds > 1 && rirOf[role] !== undefined && rirOf[role] !== null) notes.push('RIR ' + rirOf[role]);
    return label + (notes.length ? ' (' + notes.join(' · ') + ')' : '');
  });
  return parts.join(' + ');
}

// 실제 휴식 시간 결정 (세트 완료 시 호출).
// 우선순위: 세트가 지정한 rest > AI가 지정한 exercise.rest > 클래스 기본값
// 그 위에 §3-C 자가조절: **직전 세트가 목표 반복 하단을 못 채웠으면 +30초(상한 240초)**.
// 90초를 넘는 휴식의 직접 이득은 근거가 약하지만(Frontiers 2024), 긴 휴식이 작동하는
// 메커니즘은 일관되게 "반복 수를 지켜주는 것"이다 → 고정 시간을 늘리기보다 반복이 실제로
// 떨어졌을 때만 늘리는 쪽이 더 정확하고 시간도 아낀다 (Israetel/JTS 원칙의 코드화).
function resolveRestSec(exercise, set) {
  if (!set) return getExerciseRestSec(exercise ? exercise.name : '');
  if (set.isWarmup) return (typeof set.rest === 'number' && set.rest > 0) ? set.rest : REST_WARMUP_SEC;

  var base;
  if (typeof set.rest === 'number' && set.rest > 0) {
    base = set.rest;
  } else {
    var aiRest = exercise && exercise.rest ? parseInt(String(exercise.rest), 10) : NaN; // "120-180" → 120
    base = (!isNaN(aiRest) && aiRest > 0) ? aiRest : getExerciseRestSec(exercise ? exercise.name : '');
  }

  // 드롭·마이오렙 사이의 짧은 휴식은 그 스킴의 정의 그 자체라 자가조절 대상이 아니다.
  if (isOffProgressSet(set)) return base;

  var range = clampRepsToClass(exercise ? exercise.name : '', exercise ? exercise.targetReps : null);
  if (set.reps > 0 && set.reps < range.low) base += REST_AUTOREG_BONUS_SEC;
  return Math.min(REST_MAX_SEC, base);
}

// ═══════════════════════════════════════════════
// 길항근 슈퍼세트 (docs/research/training-splits.md §2-E)
// ═══════════════════════════════════════════════
// Zhang 2025 메타(19연구): 세션 시간 −37%, 볼륨 로드·근비대·근력은 전부 동등.
// 주 5일 × 60분이라는 예산에서 이게 사용자에게 열린 **가장 큰 지렛대**다
// (분할법을 바꿔서 얻는 이득은 메타 3건이 모두 "차이 없음"이라고 말한다).

function getExercisePrimaryPart(exerciseName) {
  var info = EXERCISE_BODY_PART_MAP[exerciseName] || getExercisePart(exerciseName);
  return info ? info.primary : null;
}

function getExerciseAxialLoad(exerciseName) {
  return EXERCISE_AXIAL_LOAD[canonicalExerciseName(exerciseName)] || EXERCISE_AXIAL_LOAD[exerciseName] || 'low';
}

// 슈퍼세트 페어에 들어갈 수 있는 종목인가.
// 고중량 복합은 제외 — 3분 휴식이 필요한 종목을 45초 만에 다음 종목으로 넘기면 그 휴식의 목적이 사라진다.
function canSupersetExercise(exerciseName) {
  var cls = getExerciseClass(exerciseName);
  if (cls === 'compound_heavy' || cls === 'rehab') return false;
  if (getExerciseAxialLoad(exerciseName) === 'high') return false; // 허리 보호
  if (!isMachineOrCableExercise(exerciseName)) return false;       // 한 자리에서 번갈아 되는 조합만
  if (hasRecentPain(exerciseName, 14)) return false;
  return true;
}

function isAntagonistPair(nameA, nameB) {
  var a = getExercisePrimaryPart(nameA);
  var b = getExercisePrimaryPart(nameB);
  if (!a || !b) return false;
  var list = SUPERSET_ANTAGONISTS[a];
  return !!list && list.indexOf(b) !== -1;
}

// 세션 종목 배열에서 길항근 페어를 찾는다. 반환: [{ a: idx, b: idx, kr: '가슴 ↔ 광배' }]
// **붙어 있는 종목끼리 먼저** 묶는다 — 루틴 순서상 이웃한 두 종목이 기구도 가까울 확률이 높고,
// 번갈아 오가는 이동이 짧아야 슈퍼세트의 시간 이득이 실제로 남는다.
// 그다음에야 떨어진 조합을 본다. 세션당 SUPERSET_MAX_PAIRS까지만 제안한다.
function buildSupersetSuggestions(exercises) {
  if (!Array.isArray(exercises)) return [];
  var pairs = [];
  var taken = {};

  function tryPair(i, j) {
    if (pairs.length >= SUPERSET_MAX_PAIRS) return false;
    if (taken[i] || taken[j] || !exercises[i] || !exercises[j]) return false;
    if (!canSupersetExercise(exercises[i].name) || !canSupersetExercise(exercises[j].name)) return false;
    if (!isAntagonistPair(exercises[i].name, exercises[j].name)) return false;
    taken[i] = taken[j] = true;
    pairs.push({
      a: i, b: j,
      kr: (BODY_PART_KR[getExercisePrimaryPart(exercises[i].name)] || '') + ' ↔ ' +
          (BODY_PART_KR[getExercisePrimaryPart(exercises[j].name)] || '')
    });
    return true;
  }

  for (var gap = 1; gap < exercises.length && pairs.length < SUPERSET_MAX_PAIRS; gap++) {
    for (var i = 0; i + gap < exercises.length && pairs.length < SUPERSET_MAX_PAIRS; i++) {
      tryPair(i, i + gap);
    }
  }
  return pairs.sort(function(x, y) { return x.a - y.a; });
}

// 세션 종목 배열에 페어 정보를 얹는다 (기존 세션 구조를 깨지 않는 추가 필드).
function applySupersetSuggestions(exercises) {
  buildSupersetSuggestions(exercises).forEach(function(p) {
    exercises[p.a].supersetWith = p.b;
    exercises[p.b].supersetWith = p.a;
    exercises[p.a].supersetKr = exercises[p.b].supersetKr = p.kr;
  });
  return exercises;
}

// 슈퍼세트 휴식.
// 페어 앞 종목 → 45초(이동) / 뒤 종목 → 클래스 휴식 × 0.6 (최소 60초).
// 이렇게 하면 **각 근육이 실제로 쉬는 시간**은 45초 + 상대 종목 세트(약 50초) + 사이클 휴식이라
// 클래스 권장 휴식보다 오히려 길다. 줄어드는 건 벽시계 시간뿐 — 그게 슈퍼세트의 원리다.
function supersetRestSec(exercise, partner, isFirstOfPair) {
  if (isFirstOfPair) return SUPERSET_SWITCH_SEC;
  var classRest = Math.max(
    getExerciseRestSec(exercise ? exercise.name : ''),
    getExerciseRestSec(partner ? partner.name : '')
  );
  return Math.max(SUPERSET_MIN_CYCLE_REST_SEC, Math.round(classRest * SUPERSET_CYCLE_REST_RATIO));
}

// ═══════════════════════════════════════════════
// 세션 시간 예산 · 드롭세트/마이오렙 제안 조건 (§4)
// ═══════════════════════════════════════════════
// 원칙: 자동 적용 금지. 드롭·마이오렙의 근비대 이득은 **동등할 뿐 더 크지 않다**(Sødal 2023).
// 이득은 오직 시간이다. 시간이 충분한데 쓰면 피로만 더 지고 이득은 0이다.

var SET_TEMPO_SEC_PER_REP = 3.5;   // 실측 기준 템포 (training-splits.md §2-A)
var SET_SETUP_SEC = 10;            // 세트 준비·정리
var EXERCISE_TRANSITION_SEC = 90;  // 종목 이동·세팅·대기

function estimateRemainingMinutes(session) {
  if (!session || !Array.isArray(session.exercises)) return 0;
  var total = 0;
  session.exercises.forEach(function(ex) {
    var pending = (ex.sets || []).filter(function(s) { return !s.completed; });
    if (!pending.length) return;
    total += EXERCISE_TRANSITION_SEC;
    pending.forEach(function(s, k) {
      total += (s.reps || 10) * SET_TEMPO_SEC_PER_REP + SET_SETUP_SEC;
      if (k < pending.length - 1) total += resolveRestSec(ex, s);
    });
  });
  return Math.round(total / 60);
}

// 남은 시간이 예산을 넘는가 (드롭·마이오렙 제안의 필수 조건 §4-A④)
function isSessionTimePressured(session) {
  if (!session) return false;
  var budget = (SESSIONS[session.sessionType] && SESSIONS[session.sessionType].duration) || 60;
  var elapsedMin = Math.floor((Date.now() - session.startTime) / 60000);
  return estimateRemainingMinutes(session) > (budget - elapsedMin);
}

// 이번 주(최근 7일) 이 부위에 드롭·마이오렙을 몇 번 썼나 — 빈도 상한 §4-A⑤
function intensityTechniqueCountThisWeek(exerciseName) {
  var part = getExercisePrimaryPart(exerciseName);
  var cutoff = getDateStr(new Date(Date.now() - 6 * 86400000)); // KST 기준 최근 7일(오늘 포함)
  var log = state.data.workoutLog || [];
  var count = 0;
  for (var i = 0; i < log.length; i++) {
    if (!log[i].date || log[i].date < cutoff) continue;
    var exList = log[i].exercises || log[i].exercisesData;
    if (!Array.isArray(exList)) continue;
    for (var j = 0; j < exList.length; j++) {
      var ex = exList[j];
      if (part && getExercisePrimaryPart(ex.name) !== part) continue;
      var sets = ex.setsDetail;
      if (Array.isArray(sets) && sets.some(function(s) { return s && (s.role === 'drop' || s.role === 'myo'); })) count++;
    }
  }
  return count;
}

// §4-A / §4-B — 어느 쪽을 제안할지 (없으면 null).
// 드롭세트는 머신·케이블에만(실패 지점에서 무게판을 바꾸는 위험이 없다),
// 프리웨이트에는 무게를 바꿀 필요가 없는 마이오렙을 제안한다.
function suggestIntensityTechnique(exerciseName, session) {
  var cls = getExerciseClass(exerciseName);
  if (EXERCISE_CLASS_RULES[cls].lockScheme) return null;                 // 재활 절대 금지
  if (cls !== 'isolation' && cls !== 'light_isolation') return null;     // 복합은 대상 아님
  if (getSetScheme(exerciseName) !== 'straight') return null;            // 이미 다른 스킴이면 제안 안 함
  if (hasRecentPain(exerciseName, 14)) return null;
  if (!isSessionTimePressured(session)) return null;                     // 시간 압박이 없으면 이득 0
  if (intensityTechniqueCountThisWeek(exerciseName) > 1) return null;    // 부위당 주 1회까지
  return isMachineOrCableExercise(exerciseName) ? 'drop' : 'myo_reps';
}

// 세트 완료취소/삭제 후 1RM 되돌리기.
// 후보(과거 로그 rolling max, 세션에 남은 완료 세트 최고 e1RM, 갱신 직전 값) 중
// 최댓값이 현재 1RM보다 낮으면 그 값으로 내린다 — 잘못 입력한 세트로 부풀려진 1RM 교정.
function recalc1RMAfterEdit(exerciseName, prevRM) {
  if (isReverseProgression(exerciseName)) return; // 애초에 1RM을 올리지 않으므로 되돌릴 것도 없다
  var key = EXERCISE_ALIASES_1RM[exerciseName] || exerciseName;
  var data = storage.get(KEYS.ONE_RM_DATA, {});
  var cur = data[key];
  if (cur === undefined) return;

  var candidates = [];
  var roll = calculateRollingMax1RM(exerciseName);
  if (roll) candidates.push(roll.value);
  if (prevRM !== null && prevRM !== undefined) candidates.push(prevRM);

  // 진행 중 세션에 남아 있는 완료 본 세트들의 e1RM (다른 세트가 세운 기록은 유지)
  var maxReps = rolling1RMMaxReps(exerciseName); // 위 두 경로와 동일한 클래스별 상한
  if (state.activeSession && Array.isArray(state.activeSession.exercises)) {
    state.activeSession.exercises.forEach(function(ex) {
      // 표준명으로 비교한다 — 한 세션에 같은 운동이 두 표기로 들어 있으면(복원된 세션·AI 루틴)
      // 위의 key/roll은 표준명 하나로 합쳐지는데 여기만 원문 비교라 다른 표기의 완료 세트를
      // 통째로 놓쳐, 기록이 살아 있는데도 추적 1RM이 깎여 내려간다.
      if (canonicalExerciseName(ex.name) !== key) return;
      (ex.sets || []).forEach(function(s) {
        if (!s.completed || s.isWarmup || !s.weight || !s.reps) return;
        if (isOffProgressSet(s)) return; // 위 두 경로와 같은 규칙 (§5-D 1RM 오염 방지)
        if (s.reps > maxReps) return;
        candidates.push(calculate1RM(s.weight, s.reps));
      });
    });
  }

  if (!candidates.length) return; // 근거 없음 — 건드리지 않음 (보수적)
  var best = Math.max.apply(null, candidates);
  if (best < cur) {
    data[key] = best;
    storage.set(KEYS.ONE_RM_DATA, data);
  }
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
// 이 값이 **모든 무게 계산의 격자**다 — 추천·스냅·감량이 전부 여기를 통과하므로 소수점 무게가 나올 수 없다.
// 판정 원천 두 가지: ① 종목 이름의 '덤벨' ② 종목표의 장비 태그 'dumbbell'.
// ②가 필요한 이유: '해머 컬'·'사이드 레터럴 레이즈'·'풀오버'·'컨센트레이션 컬'·'켈소 슈러그'처럼
// 이름에 '덤벨'이 없는 덤벨 종목이 있고, 이들이 5kg 격자를 쓰면 8kg 덤벨의 다음 칸이 10kg이 아니라
// 13kg으로 잡혀 실행 불가능한 무게가 나온다.
function getWeightIncrement(exerciseName) {
  if ((exerciseName || '').indexOf('덤벨') >= 0) return 2;
  return getExerciseEquipment(exerciseName) === 'dumbbell' ? 2 : 5;
}

// 무게를 그 종목 장비가 실제로 낼 수 있는 단위로 스냅(반올림). .5kg 같은 실행 불가 무게 방지.
// 역방향(어시스트)은 **보조 0kg = 맨몸**이 유효한 목표값이라 "최소 1스텝" 바닥을 적용하지 않는다.
function snapWeightToEquipment(weight, exerciseName) {
  if (isReverseProgression(exerciseName)) {
    if (!weight || weight <= 0) return 0;
    var s = getWeightIncrement(exerciseName);
    return Math.max(0, Math.round(weight / s) * s);
  }
  if (!weight || weight <= 0) return weight;
  var step = getWeightIncrement(exerciseName);
  return Math.max(step, Math.round(weight / step) * step); // 양수는 최소 1스텝 보장 (0kg 방지)
}

// 백오프·드롭 전용 감량 계산 — **최소 한 스텝은 반드시 내려간다**.
// snapWeightToEquipment는 반올림(Math.round)이라 감량이 통째로 사라지는 구간이 있다:
//   25kg × 0.90 = 22.5 → round(4.5)*5 = 25kg (감량 0%!),  덤벨 8kg × 0.90 = 7.2 → 8kg (감량 0%)
// 백오프의 존재 이유가 "무게를 낮춰 반복을 지킨다"이므로 감량 0은 스킴 자체를 무효로 만든다.
// (docs/research/set-schemes.md §2-B 반올림 함정 · §5-D 리스크표)
function reduceWeight(top, pct, exerciseName) {
  // 역방향(어시스트): "가볍게 한다" = 보조를 **더 준다**. 백오프(90%)는 한 칸, 그보다 큰 감량은 두 칸.
  // 보조 무게에 0.9를 곱하면 오히려 더 어려워져 백오프·드롭의 존재 이유가 정반대로 뒤집힌다.
  // 비율을 그대로 쓰지 않는 이유: 보조 무게의 %는 실질 부하와 아무 관계가 없다(실질 = 체중 − 보조).
  if (isReverseProgression(exerciseName)) {
    var rstep = getWeightIncrement(exerciseName);
    var steps = pct >= 0.85 ? 1 : 2;
    return (top || 0) + rstep * steps;
  }
  if (!top || top <= 0) return top;              // 맨몸·무게 미정 종목은 그대로 (호출부가 스킴을 접는다)
  var step = getWeightIncrement(exerciseName);
  var w = Math.round(top * pct / step) * step;   // **가까운 배수** — 목표 %에서 가장 적게 벗어난다
  if (w >= top) w = top - step;                  // 반올림으로 감량이 사라졌을 때 방어 (탑 20의 90% = 18 → 20 → 15)
  return Math.min(top, Math.max(step, w));       // 0kg 이하 방지. 한 스텝 아래가 0인 저중량은 top 을 넘지 않게 유지
}

// 여러 단으로 내려가는 감량 사다리(피라미드·역피라미드의 세트별 무게)의 무게표.
// pcts 는 **무거운 순(내림차순)**. 반환값은 { pct: 무게 } 맵.
// reduceWeight 를 단마다 따로 부르면 두 단이 같은 값으로 뭉개진다 —
//   예) 30kg 피라미드: 92.5% → 28 → 30, 85% → 25.5 → 25 ... 5kg 격자에선 둘 다 25가 되는 구간이 생긴다.
// 그래서 **직전(더 무거운) 단보다 반드시 한 스텝 아래**가 되도록 사다리를 이어서 만든다.
// 역방향(어시스트)은 방향이 뒤집힌다 — 가벼운 단 = 보조가 **더 많은** 단이므로 위로 벌린다.
function buildWeightLadder(exerciseName, topWeight, pcts) {
  var out = {};
  if (!Array.isArray(pcts) || !pcts.length) return out;
  var reverse = isReverseProgression(exerciseName);
  var step = getWeightIncrement(exerciseName);
  var prev = null;
  for (var i = 0; i < pcts.length; i++) {
    var pct = pcts[i];
    var w = (pct >= 1) ? topWeight : reduceWeight(topWeight, pct, exerciseName);
    if (prev !== null && typeof w === 'number' && typeof prev === 'number') {
      if (reverse) {
        if (w <= prev) w = prev + step;                        // 보조는 단마다 늘어난다
      } else if (w >= prev && prev > step) {
        w = Math.max(step, prev - step);                       // 무게는 단마다 줄어든다
      }
    }
    out[pct] = w;
    prev = w;
  }
  return out;
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
  // 어시스트 종목: 같은 부위 종목(랫 풀 다운 등)의 1RM 평균은 '들어올리는 무게'라
  // 보조 무게와 단위가 아예 다르다. 추정하면 안 된다.
  if (isReverseProgression(exerciseName)) return null;
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
  if (!storage.get(KEYS.ONE_RM_INITIALIZED)) {
    // INITIAL_1RM을 저장소에 복사
    var data = {};
    Object.keys(INITIAL_1RM).forEach(function(key) {
      data[key] = INITIAL_1RM[key];
    });

    storage.set(KEYS.ONE_RM_DATA, data);
    storage.set(KEYS.ONE_RM_INITIALIZED, true);
  }
  // 매 실행 호출 — 기존 사용자 저장소에 남아 있는 어시스트 종목 1RM을 정리한다.
  pruneReverseProgression1RM();
}

// 저장된 1RM에서 어시스트(역방향) 종목을 제거한다 (마이그레이션).
// 예전 버전은 '어시스트 딥스'의 보조 무게를 1RM(66.67kg)으로 저장했는데, 이 값은
// "보조를 많이 받을수록 큰 수"라 강해질수록 내려간다 — 화면·AI 프롬프트 어디에 써도 거짓말이 된다.
function pruneReverseProgression1RM() {
  var data = storage.get(KEYS.ONE_RM_DATA, {}) || {};
  var changed = false;
  Object.keys(data).forEach(function(name) {
    if (isReverseProgression(name)) { delete data[name]; changed = true; }
  });
  if (changed) storage.set(KEYS.ONE_RM_DATA, data);
  return changed;
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

// 종목명 → 부위 정보 찾기 (정확 → 별칭 → 부분 매칭 → 키워드 추측)
function getExercisePart(exerciseName) {
  if (!exerciseName) return null;
  // 공백·대소문자만 다른 표기를 같은 이름으로 본다 ('랫 풀다운' == '랫풀다운')
  function squash(s) { return String(s).toLowerCase().replace(/\s+/g, ''); }

  // 1. 정확한 매칭
  if (EXERCISE_BODY_PART_MAP[exerciseName]) return EXERCISE_BODY_PART_MAP[exerciseName];

  // 2. 별칭 테이블 → 표준명 (1RM 조회와 같은 표를 쓴다. 별칭이 늘어도 여기 한 곳만 거치면 된다)
  var canonical = EXERCISE_ALIASES_1RM[exerciseName];
  if (canonical && EXERCISE_BODY_PART_MAP[canonical]) return EXERCISE_BODY_PART_MAP[canonical];

  // 3. 부분 매칭 — 맵 키가 질의 이름 **안에** 통째로 들어있을 때만, 그 중 가장 긴(=가장 구체적인) 키.
  //    이 방향을 먼저 두는 이유: '스탠딩 카프 레이즈 머신'이 '카프 레이즈'(맨몸)가 아니라
  //    '스탠딩 카프 레이즈'(스미스)로 가야 장비 판정이 맞는다.
  //    반대 방향(질의가 키의 일부)은 오탐이 많아 5번(최후 수단)으로 내렸다 —
  //    '덤벨 프레스'가 '인클라인 덤벨 프레스'(가슴 상부)로 잡히던 문제.
  var q = squash(exerciseName);
  var bestKey = null;
  var bestLen = 0;
  for (var key in EXERCISE_BODY_PART_MAP) {
    var k = squash(key);
    if (q.indexOf(k) !== -1 && k.length > bestLen) { bestKey = key; bestLen = k.length; }
  }
  if (bestKey) return EXERCISE_BODY_PART_MAP[bestKey];

  // 4. 키워드 기반 추측
  var name = exerciseName.toLowerCase();
  // 레그컬·햄스트링은 아래 '컬'(이두) 규칙보다 먼저 — '레그 컬 머신'이 이두로 잡히던 버그
  if (name.indexOf('레그 컬') >= 0 || name.indexOf('레그컬') >= 0 || name.indexOf('햄스트링') >= 0 || name.indexOf('노르딕') >= 0) return { primary: 'hamstrings', secondary: [], compound: false };
  // 리버스 플라이 계열은 후면 삼각근 — 아래 '플라이'(가슴) 규칙보다 먼저
  if (name.indexOf('리버스') >= 0 && (name.indexOf('플라이') >= 0 || name.indexOf('펙') >= 0)) return { primary: 'shoulders_rear', secondary: ['upper_back'], compound: false };
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
  if (name.indexOf('rdl') >= 0 || name.indexOf('데드리프트') >= 0) return { primary: 'hamstrings', secondary: ['glutes'], compound: true };
  if (name.indexOf('힙') >= 0) return { primary: 'glutes', secondary: [], compound: false };
  if (name.indexOf('카프') >= 0 || name.indexOf('종아리') >= 0) return { primary: 'calves', secondary: [], compound: false };
  // ── 아래는 '한 단어만 남은' 짧은 이름을 위한 마지막 키워드들. 반드시 위 구체 규칙 뒤에 둔다
  //    (예: '레그 프레스'·'벤치 프레스'는 위에서 이미 잡히고, 여기까지 오지 않는다).
  //    이게 없으면 '바벨 오버헤드 프레스' 같은 미등록 이름이 null이 되어
  //    볼륨 집계에서 통째로 빠지고 휴식 타이머도 고립(90초)으로 떨어진다.
  if (name.indexOf('오버헤드') >= 0 || name.indexOf('밀리터리') >= 0) return { primary: 'shoulders_front', secondary: ['triceps'], compound: true };
  if (name.indexOf('프레스') >= 0) return { primary: 'chest', secondary: ['triceps', 'shoulders_front'], compound: true };
  if (name.indexOf('레이즈') >= 0) return { primary: 'shoulders_side', secondary: [], compound: false };
  if (name.indexOf('익스텐션') >= 0) return { primary: 'triceps', secondary: [], compound: false };
  if (name.indexOf('펙') >= 0) return { primary: 'chest', secondary: [], compound: false };

  // 5. 최후 수단 — 질의가 맵 키의 일부일 때(짧은 축약 이름). 가장 **짧은**(=가장 일반적인) 키를 고른다.
  //    각도·장비 같은 구체 속성을 잘못 물고 오는 걸 줄이기 위해 최장이 아니라 최단을 쓴다.
  //    부위 그룹(BODY_PART_GROUPS)은 chest/chest_upper/chest_lower를 하나로 합치므로
  //    세부 부위가 조금 어긋나도 볼륨 집계는 맞고, null이 되어 세트가 통째로 사라지는 것보다 낫다.
  var shortKey = null;
  var shortLen = Infinity;
  for (var rk in EXERCISE_BODY_PART_MAP) {
    var rkS = squash(rk);
    if (rkS.indexOf(q) !== -1 && rkS.length < shortLen) { shortKey = rk; shortLen = rkS.length; }
  }
  if (shortKey) return EXERCISE_BODY_PART_MAP[shortKey];

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

// 최근 N주 부위별 누적 세트 수 — 직접(primary만) / 분할환산(간접 0.5 포함) 두 벌을 함께 반환.
// STATS 화면이 '직접 몇 세트'를 따로 보여줘야 해서 분리. 계산 규칙은 기존과 동일.
function getRecentVolumeSplitByPart(weeks) {
  var today = new Date();
  var since = new Date(today);
  since.setDate(today.getDate() - (weeks * 7));
  
  var sinceStr = getDateStr(since);
  var workouts = state.data.workoutLog.filter(function(w) {
    return w.date >= sinceStr;
  });
  
  var direct = {};      // primary 부위만 (사용자가 그 부위를 직접 노린 세트)
  var fractional = {};  // primary 1.0 + secondary 0.5 (분할환산)
  
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
        setCount = countWorkingSets(ex.setsDetail);   // 드롭·마이오렙 제외 (setsCount 있는 경로와 같은 규칙)
      } else if (Array.isArray(ex.sets)) {
        setCount = countWorkingSets(ex.sets);
      }
      
      if (setCount === 0) return;
      
      // primary 부위에 풀 세트 (직접·분할환산 둘 다)
      direct[info.primary] = (direct[info.primary] || 0) + setCount;
      fractional[info.primary] = (fractional[info.primary] || 0) + setCount;
      
      // secondary(보조근) 부위에 0.5 세트 (Pelland 2025 분할세트 예측력 최고; 0.3~0.7 휴리스틱 중 0.5)
      if (info.secondary && info.secondary.length > 0) {
        info.secondary.forEach(function(s) {
          fractional[s] = (fractional[s] || 0) + setCount * 0.5;
        });
      }
    });
  });
  
  return { direct: direct, fractional: fractional };
}

// 기존 호출부 호환 — 분할환산(간접 0.5 포함) 맵만 돌려준다. 동작 변경 없음.
function getRecentVolumeByPart(weeks) {
  return getRecentVolumeSplitByPart(weeks).fractional;
}

// 부위 그룹 → 주간 볼륨 임계(세트). getVolumeDiagnosis와 STATS 화면이 같은 숫자를 쓰도록 한 곳에만 둔다.
//   large: 부족<4 / 하한미달 4~10 / 적정 10~20 / 이득 완만 20+, 목표 12
//   small: 부족<3 / 하한미달 3~8 / 적정 8~16 / 이득 완만 16+, 목표 8
//   size는 BODY_PART_GROUPS[group].size, 없거나 'small'이 아니면 'large'로 안전 처리
function getVolumeThresholds(group) {
  var g = BODY_PART_GROUPS[group];
  var size = (g && g.size === 'small') ? 'small' : 'large';
  return {
    size: size,
    lackBelow:  size === 'small' ? 3 : 4,
    optimalLow: size === 'small' ? 8 : 10,
    optimalTop: size === 'small' ? 16 : 20,
    target:     size === 'small' ? 8 : 12
  };
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
    var th = getVolumeThresholds(g);             // 임계는 getVolumeThresholds 한 곳에서만 정의
    var lackBelow  = th.lackBelow;               // 부족(🔴) 상한
    var optimalLow = th.optimalLow;              // 최적 하한(미달 시 🟡)
    var optimalTop = th.optimalTop;              // 최적 상한(초과 시 수확 체감 🔥)
    var entry = { group: g, label: label, vol: weeklyVol, size: th.size, target: th.target };

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
    pointsData += '<circle cx="' + x + '" cy="' + y + '" r="' + (isLast ? 4 : 3) + '" fill="var(--accent)"' + (isLast ? ' stroke="white" stroke-width="2"' : '') + '/>';
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

// ═══════════════════════════════════════════════
// 보유 장비 필터 (헬스장에 없는 기구를 쓰는 종목은 추천하지 않는다)
// ═══════════════════════════════════════════════
// 원천은 js/data.js의 GYM_EQUIPMENT 하나뿐 — 헬스장이 바뀌면 그 표만 고치면 된다.

// 종목이 필요로 하는 장비 id. 미등록 종목 이름은 퍼지 매칭으로 추정한다.
function getExerciseEquipment(exerciseName) {
  var info = EXERCISE_BODY_PART_MAP[exerciseName] || getExercisePart(exerciseName);
  return (info && info.equipment) || null;
}

// 이 헬스장에서 수행 가능한가.
// 장비 태그가 없거나 GYM_EQUIPMENT에 없는 id면 true(=막지 않는다).
// 태그를 빠뜨린 실수가 종목을 조용히 지워버리는 쪽보다, 그대로 두고 테스트가 잡는 쪽이 안전하다.
function isExerciseAvailable(exerciseName) {
  var eq = getExerciseEquipment(exerciseName);
  if (!eq) return true;
  var spec = GYM_EQUIPMENT[eq];
  if (!spec) return true;
  return spec.owned !== false;
}

// 보유 장비 한국어 이름 목록 (맨몸 제외 — 프롬프트에 나열용)
function getOwnedEquipmentLabels() {
  return Object.keys(GYM_EQUIPMENT)
    .filter(function(id) { return id !== 'bodyweight' && GYM_EQUIPMENT[id].owned; })
    .map(function(id) { return GYM_EQUIPMENT[id].kr; });
}

// 보유 장비로 불가능한 등록 종목 이름들 (AI에게 "쓰지 말 것"으로 넘김)
function getUnavailableExerciseNames() {
  return Object.keys(EXERCISE_BODY_PART_MAP).filter(function(name) {
    return !isExerciseAvailable(name);
  });
}

// AI 프롬프트용 '보유 장비' 블록. 루틴 생성·루틴 수정·코치 채팅이 공유한다.
function buildEquipmentPromptBlock() {
  var block = '## 🏋️ 보유 장비 (사용자 헬스장에 실제로 있는 기구 — 종목 추천의 절대 제약)\n' +
    '맨몸 운동은 항상 가능하고, 그 외에는 아래 장비로 할 수 있는 종목만 추천한다.\n' +
    getOwnedEquipmentLabels().join(' · ') + '\n' +
    '- 위 목록에 없는 기구가 필요한 종목은 추천하지 말 것. 같은 부위를 보유 장비로 자극하는 종목으로 대체한다.\n' +
    '- 사용자가 없는 기구의 종목을 요청하면 "그 기구는 헬스장에 없다"고 알리고 가능한 대안을 제시한다.\n';
  var unavailable = getUnavailableExerciseNames();
  if (unavailable.length) {
    block += '- 장비가 없어 사용 금지인 종목: ' + unavailable.join(', ') + '\n';
  }
  return block;
}

// 장비 코드 가드레일: AI가 프롬프트를 어기고 이 헬스장에 없는 기구 종목을 넣었을 때
// 같은 부위의 보유 종목으로 교체(마땅한 게 없으면 제거)한다.
// 안전 가드레일(applySafetyGuardrail) **다음에** 돌린다 — 안전 교체가 우선이고, 그 결과를 장비로 한 번 더 거른다.
// 반환: { exercises: 교정된 배열, changes: [{from, to}] }
function applyEquipmentGuardrail(exercises) {
  if (!Array.isArray(exercises) || !exercises.length) return { exercises: exercises, changes: [] };
  var changes = [];
  var names = {};
  exercises.forEach(function(e) { if (e && e.name) names[e.name] = true; });
  var out = exercises.map(function(ex) {
    if (!ex || !ex.name || isExerciseAvailable(ex.name)) return ex;
    var info = EXERCISE_BODY_PART_MAP[ex.name] || getExercisePart(ex.name);
    var pool = (info && EXERCISES_BY_PRIMARY[info.primary]) || [];
    // 같은 부위 후보 중 점수가 가장 높은 것을 고른다:
    // 복합/고립 성격이 같으면 +2, 부하를 걸 수 있으면(맨몸이 아니면) +1.
    // 무게를 싣던 머신 종목이 맨몸 종목으로 바뀌어 자극이 통째로 빠지는 걸 막는다.
    var sub = null, best = -1;
    for (var i = 0; i < pool.length; i++) {
      var cand = pool[i];
      if (cand === ex.name || names[cand] || !isExerciseAvailable(cand)) continue;
      var candInfo = EXERCISE_BODY_PART_MAP[cand];
      var score = 0;
      if (info && candInfo.compound === info.compound) score += 2;
      if (candInfo.equipment !== 'bodyweight') score += 1;
      if (score > best) { best = score; sub = cand; }
    }
    if (!sub) { changes.push({ from: ex.name, to: null }); return null; }
    changes.push({ from: ex.name, to: sub });
    names[sub] = true;
    var copy = {};
    Object.keys(ex).forEach(function(k) { copy[k] = ex[k]; });
    copy.name = sub;
    copy.weight = null; // 다른 종목이므로 무게는 기록 기반으로 다시 계산
    var subInfo = EXERCISE_BODY_PART_MAP[sub];
    if (subInfo) {
      copy.type = subInfo.compound ? '복합' : '고립';
      copy.isMain = !!(ex.isMain && subInfo.mainEligible);
    }
    if (copy.reps !== undefined) copy.reps = repRangeToStr(clampRepsToClass(sub, copy.reps));
    if (copy.rir !== undefined) copy.rir = (copy.type === '복합') ? '2-3' : '0-2';
    if (copy.rest !== undefined && copy.rest) copy.rest = (copy.type === '복합') ? '120-180' : '60-120';
    copy.note = '헬스장에 ' + ex.name + ' 기구가 없어 대신 배치';
    return copy;
  }).filter(Boolean);
  return { exercises: out, changes: changes };
}

// ═══════════════════════════════════════════════
// 종목 안전 (부상 대조 + VETO 가드레일)
// ═══════════════════════════════════════════════

// 기억 노트(injury)의 자유 텍스트에서 부상 부위 키워드를 찾아 부위 키 배열 반환 (예: ['lower_back'])
function getUserInjuryAreas() {
  var notes = (state.coachMemory || []).filter(function(m) { return m.category === 'injury'; });
  if (!notes.length) return [];
  var areas = [];
  Object.keys(INJURY_AREAS).forEach(function(key) {
    var kws = INJURY_AREAS[key].keywords;
    var hit = notes.some(function(n) {
      var text = n.text || '';
      return kws.some(function(kw) { return text.indexOf(kw) !== -1; });
    });
    if (hit) areas.push(key);
  });
  return areas;
}

// 종목 하나를 사용자 부상과 대조: { level: 'contra'|'caution'|null, area, sub, mod }
// userAreas를 생략하면 getUserInjuryAreas()로 계산 (반복 호출 시엔 미리 구해 넘길 것)
function checkExerciseSafety(exerciseName, userAreas) {
  var safety = EXERCISE_SAFETY[exerciseName];
  // 별칭(예: '인클라인 덤벨 프레스')으로 들어오면 표준명으로 한 번 더 조회
  if (!safety && EXERCISE_ALIASES_1RM[exerciseName]) {
    safety = EXERCISE_SAFETY[EXERCISE_ALIASES_1RM[exerciseName]];
  }
  if (!safety) return { level: null, area: null, sub: null, mod: null };
  if (userAreas === undefined) userAreas = getUserInjuryAreas();
  var result = { level: null, area: null, sub: null, mod: null };
  userAreas.forEach(function(area) {
    if (safety.contra && safety.contra.indexOf(area) !== -1) {
      if (result.level !== 'contra') {
        result = { level: 'contra', area: area, sub: (safety.sub && safety.sub[area]) || null, mod: null };
      }
    } else if (safety.caution && safety.caution.indexOf(area) !== -1 && result.level !== 'contra') {
      result = { level: 'caution', area: area, sub: (safety.sub && safety.sub[area]) || null, mod: (safety.mod && safety.mod[area]) || null };
    }
  });
  return result;
}

// AI 프롬프트 주입용 안전 블록: 등록된 부상에 걸리는 종목만 압축해 텍스트로.
// 부상이 없으면 '' (프롬프트에 아무것도 안 들어감 = 토큰 0)
function buildSafetyPromptBlock() {
  var areas = getUserInjuryAreas();
  if (!areas.length) return '';
  var contraLines = [];
  var cautionLines = [];
  var rehabLines = [];
  Object.keys(EXERCISE_SAFETY).forEach(function(name) {
    var s = EXERCISE_SAFETY[name];
    areas.forEach(function(area) {
      var kr = INJURY_AREAS[area].kr;
      if (s.contra && s.contra.indexOf(area) !== -1) {
        var sub = s.sub && s.sub[area];
        contraLines.push('- ' + name + ' (' + kr + ')' + (sub ? ' → 대체: ' + sub : ''));
      } else if (s.caution && s.caution.indexOf(area) !== -1) {
        var mod = (s.mod && s.mod[area]) || '가볍게·통증 없는 범위로';
        cautionLines.push('- ' + name + ' (' + kr + '): ' + mod);
      }
      if (s.rehab && s.rehab.indexOf(area) !== -1) {
        rehabLines.push('- ' + name + ' (' + kr + ' 재활)');
      }
    });
  });
  var areaKrs = areas.map(function(a) { return INJURY_AREAS[a].kr; }).join(', ');
  var block = '## 🚫 부상 안전 규칙 (등록된 부상: ' + areaKrs + ' — 기억 노트와 자동 대조됨)\n';
  if (contraLines.length) block += '**금기 — 절대 루틴에 넣지 말 것 (VETO). 사용자가 요구해도 거부하고 대체를 제시한다:**\n' + contraLines.join('\n') + '\n';
  if (cautionLines.length) block += '**주의 — 이렇게 수정하면 가능 (ADJUST):**\n' + cautionLines.join('\n') + '\n';
  if (rehabLines.length) block += '**재활 추천 — 이 부상에 오히려 도움:**\n' + rehabLines.join('\n') + '\n';
  return block;
}

// VETO 코드 가드레일: AI가 만든 루틴 종목 배열에서 금기 종목을 대체로 교체(불가하면 제거).
// AI가 프롬프트를 어겨도 금기 종목이 사용자 화면까지 못 오게 하는 마지막 방어선.
// 반환: { exercises: 교정된 배열, changes: [{from, to, areaKr}] }
function applySafetyGuardrail(exercises) {
  if (!Array.isArray(exercises) || !exercises.length) return { exercises: exercises, changes: [] };
  var areas = getUserInjuryAreas();
  if (!areas.length) return { exercises: exercises, changes: [] };
  var changes = [];
  var names = {};
  exercises.forEach(function(e) { if (e && e.name) names[e.name] = true; });
  var out = exercises.map(function(ex) {
    if (!ex || !ex.name) return ex;
    var chk = checkExerciseSafety(ex.name, areas);
    if (chk.level !== 'contra') return ex;
    var areaKr = INJURY_AREAS[chk.area].kr;
    // 대체 종목이 이 헬스장에 없는 기구면 쓰지 않는다(→ 아래 제거 폴백).
    // 안전 표는 테스트로도 강제하지만, 데이터 실수가 사용자 화면까지 새지 않게 하는 이중 방어선이다.
    if (chk.sub && !isExerciseAvailable(chk.sub)) chk.sub = null;
    if (chk.sub && !names[chk.sub]) {
      changes.push({ from: ex.name, to: chk.sub, areaKr: areaKr });
      names[chk.sub] = true;
      var copy = {};
      Object.keys(ex).forEach(function(k) { copy[k] = ex[k]; });
      copy.name = chk.sub;
      copy.weight = null; // 다른 종목이므로 무게는 기록 기반으로 다시 계산
      // 메타데이터도 대체 종목 기준으로 갱신 (원 종목 값이 남으면 메인 표시·웜업·반복수가 잘못됨)
      var subInfo = EXERCISE_BODY_PART_MAP[chk.sub];
      if (subInfo) {
        copy.type = subInfo.compound ? '복합' : '고립';
        copy.isMain = !!(ex.isMain && subInfo.mainEligible);
      }
      if (copy.reps !== undefined) copy.reps = repRangeToStr(clampRepsToClass(chk.sub, copy.reps));
      if (copy.rir !== undefined) copy.rir = (copy.type === '복합') ? '2-3' : '0-2';
      if (copy.rest !== undefined && copy.rest) copy.rest = (copy.type === '복합') ? '120-180' : '60-120';
      copy.note = areaKr + ' 부상 보호 — ' + ex.name + ' 대신 배치';
      // 대체 종목 자체가 사용자의 부상 부위에 '주의'면 그 수정 지침까지 붙인다.
      // (예: 바벨 스쿼트 → 핵 스쿼트는 "골반이 말리지 않는 깊이까지만"이 있어야 안전 교체가 완성된다)
      // 부위별로 따로 조회한다 — checkExerciseSafety에 부위를 한꺼번에 넘기면
      // caution끼리 서로 덮어써서 교체 사유와 다른 부위의 문구가 붙을 수 있다.
      var subMods = [];
      [chk.area].concat(areas).forEach(function(a) {
        if (areas.indexOf(a) === -1) return;
        var sc = checkExerciseSafety(chk.sub, [a]);
        if (sc.level === 'caution' && sc.mod && subMods.indexOf(sc.mod) === -1) subMods.push(sc.mod);
      });
      if (subMods.length) copy.note += ' · ' + subMods.join(' · ');
      return copy;
    }
    changes.push({ from: ex.name, to: null, areaKr: areaKr });
    return null; // 대체 불가(이미 루틴에 있음/대체 없음)면 제거
  }).filter(Boolean);
  return { exercises: out, changes: changes };
}

// ═══════════════════════════════════════════════
// 세트 사이 채팅 신호 (3단계 — 통증·자극·RPE 피드백 루프)
// ═══════════════════════════════════════════════

// 최근 N일 내 이 종목의 자극 평가 ('bad'|'good'|null). 가장 최근 기록 우선.
function getRecentFeel(exerciseName, days) {
  // 채팅 신호 저장소 먼저 ([0]=최신)
  var chatSignals = _recentChatSignals(exerciseName, days);
  for (var c = 0; c < chatSignals.length; c++) {
    if (chatSignals[c].feel === 'bad' || chatSignals[c].feel === 'good') return chatSignals[c].feel;
  }
  var cutoff = new Date(Date.now() - (days || 14) * 86400000).toISOString().slice(0, 10);
  var canonical = canonicalExerciseName(exerciseName);
  var log = state.data.workoutLog || [];
  for (var i = 0; i < log.length; i++) {
    var w = log[i];
    if (!w.date || w.date < cutoff) continue;
    var exList = w.exercises || w.exercisesData;
    if (!Array.isArray(exList)) continue;
    for (var j = 0; j < exList.length; j++) {
      var ex = exList[j];
      if (canonicalExerciseName(ex.name) === canonical && (ex.feel === 'bad' || ex.feel === 'good')) return ex.feel;
    }
  }
  return null;
}

// 확인된 채팅 신호를 전용 저장소에 즉시 기록 (세션 취소·0세트 종료·종목 교체와 무관하게 보존).
// 통증 게이트(hasRecentPain)·자극 조회(getRecentFeel)가 workoutLog와 함께 이 저장소도 읽는다.
function recordChatSignal(exerciseName, signal) {
  if (!exerciseName || !signal) return false;
  var log = storage.get(KEYS.CHAT_SIGNALS, []);
  if (!Array.isArray(log)) log = []; // 손상됐지만 JSON으로는 읽히는 값 방어
  log.unshift({
    date: getTodayStr(),
    name: exerciseName,
    pain: !!signal.pain,
    painNote: signal.painNote || null,
    feel: signal.feel || null,
    rpe: signal.rpe || null
  });
  return storage.set(KEYS.CHAT_SIGNALS, log.slice(0, 200));
}

// 최근 N일 내 채팅 신호 조회 (내부용 — [0]=최신)
// 저장된 date가 KST(getTodayStr) 기준이므로 cutoff도 KST로 계산 (UTC면 오전 9시 전 하루 오차)
function _recentChatSignals(exerciseName, days) {
  var cutoff = getDateStr(new Date(Date.now() - (days || 14) * 86400000));
  var canonical = canonicalExerciseName(exerciseName);
  var log = storage.get(KEYS.CHAT_SIGNALS, []);
  if (!Array.isArray(log)) return [];
  return log.filter(function(s) {
    return s && canonicalExerciseName(s.name) === canonical && s.date && s.date >= cutoff;
  });
}

// 추출된 채팅 신호를 세션 종목 객체에 적용 (사용자 확인 후 호출).
// painFlag는 1단계 통증 게이트(hasRecentPain)가 읽어 증량을 자동 중단한다.
function applyChatSignalToExercise(ex, signal) {
  if (!ex || !signal) return false;
  var applied = false;
  if (signal.pain) {
    ex.painFlag = true;
    if (signal.painNote) ex.painNote = signal.painNote;
    applied = true;
  }
  if (signal.feel === 'good' || signal.feel === 'bad') {
    ex.feel = signal.feel;
    applied = true;
  }
  if (typeof signal.rpe === 'number') {
    ex.chatRpe = signal.rpe;
    applied = true;
  }
  return applied;
}

// ═══════════════════════════════════════════════
// 인클라인 워킹(경사 걷기) — 처방 계산 (순수 함수)
// 근거: docs/research/incline-walking.md §2(처방표) · §4(점진 규칙) · §5(주의사항)
// 화면(screens.js)의 로컬 폴백 구성과 AI 프롬프트(ai.js)의 앵커가 같은 값을 쓰도록 여기 한 곳에 모은다.
// ═══════════════════════════════════════════════

// cardioLog 에서 한 모드의 세션만 최신순(최신이 앞)으로 추린다.
// ★두 모드가 같은 cardioLog 를 공유하므로, 각 모드의 "지난 회 기준선"은 반드시 자기 모드만 봐야 한다.
//   (안 그러면 인터벌 처방이 걷기 세션을 기준선으로 삼아 "뛰기 0회"를 읽고 엉뚱하게 상향한다.)
// ★날짜(date)는 YYYY-MM-DD라 시각이 없다. 같은 날 두 세션이면 날짜만으로는 순서를 못 가리고,
//   Array.prototype.sort 는 안정 정렬이라 "먼저 기록된 쪽"이 앞에 남는다 → 그러면 하향 게이트가
//   나중 세션(손잡이 잡음·미완주)을 못 보고 넘어간다. 그래서 동률은 저장 순서(뒤에 push 된 쪽이 최신)로 가른다.
// 옛 기록에는 mode 필드가 없다 → 'interval' 로 간주(하위 호환, §7-2).
function cardioSessionsByMode(log, mode) {
  var arr = Array.isArray(log) ? log : [];
  var want = (mode === 'walk') ? 'walk' : 'interval';
  var picked = [];
  arr.forEach(function(s, i) {
    if (!s) return;
    var m = (s.mode === 'walk') ? 'walk' : 'interval';
    if (m === want) picked.push({ s: s, i: i });
  });
  picked.sort(function(a, b) {
    var da = a.s.date ? String(a.s.date) : '';
    var db = b.s.date ? String(b.s.date) : '';
    if (da !== db) return da < db ? 1 : -1;       // 최근 날짜가 앞으로
    return b.i - a.i;                             // 같은 날이면 나중에 저장된 쪽이 앞으로
  });
  return picked.map(function(p) { return p.s; });
}

function cardioWalkSessions(log) { return cardioSessionsByMode(log, 'walk'); }
function cardioIntervalSessions(log) { return cardioSessionsByMode(log, 'interval'); }

// 세션의 본 구간(walk) 경사 % — 본 구간이 여러 개면 가장 높은 값. 없으면 0.
function cardioWalkMainIncline(session) {
  var segs = (session && Array.isArray(session.segments)) ? session.segments : [];
  var max = 0;
  segs.forEach(function(s) {
    if (!s || s.type !== 'walk') return;
    var v = Number(s.incline);
    if (isFinite(v) && v > max) max = v;
  });
  return max;
}

// 권장 경사 상한 — 허리(lower_back) 이력이면 한 단계 낮춘다(§7-6 규칙7).
// 절대 상한 12%는 어떤 경우에도 넘지 않는다(§1-3).
function cardioWalkInclineCap(injuryAreas) {
  var areas = Array.isArray(injuryAreas) ? injuryAreas : [];
  return (areas.indexOf('lower_back') !== -1) ? WALK_PRESCRIPTION.inclineMaxBack : WALK_PRESCRIPTION.inclineMax;
}

// 이번 세션에 쓸 경사 % — §4-2 향상 게이트를 코드로 구현한 보수적 판정.
// ★로컬 계산은 "올리지 않는다"(유지 또는 하향만). 상향은 시간 축이 먼저이고(§4-1),
//   축 선택·폭 판단은 지난 기록 전체를 보는 AI(generateCardioWalk)가 맡는다.
function cardioWalkNextIncline(log, injuryAreas) {
  var cap = cardioWalkInclineCap(injuryAreas);
  var areas = Array.isArray(injuryAreas) ? injuryAreas : [];
  var back = areas.indexOf('lower_back') !== -1;
  var start = back ? WALK_PRESCRIPTION.inclineStartBack : WALK_PRESCRIPTION.inclineStart;

  var sessions = cardioWalkSessions(log);
  if (!sessions.length) return Math.min(start, cap);

  var last = sessions[0];
  // 기준 경사는 "본 구간 경사가 기록된 가장 최근 세션"에서 가져온다.
  // ★지난 세션을 몸풀기(경사 0%) 도중에 중단하면 본 구간 기록이 없어 경사가 0으로 읽힌다.
  //   그때 첫 회 값(4%)으로 되돌리면 몇 주치 진행이 통째로 날아가므로, 그 앞 세션까지 거슬러 찾는다.
  var inc = 0;
  for (var i = 0; i < sessions.length; i++) {
    inc = cardioWalkMainIncline(sessions[i]);
    if (inc > 0) break;
  }
  if (!(inc > 0)) return Math.min(start, cap);     // 걷기 기록은 있지만 본 구간을 한 번도 못 한 경우

  // 하향 게이트(§4-2)는 "가장 최근 세션"의 결과로 판정한다(기준 경사를 어디서 가져왔든).
  // 여러 조건에 걸려도 한 세션에 한 번만 내린다(과하향 방지).
  if (last.handrail === 'hold') inc -= 2;                                  // 손잡이 계속 잡음 = 강도가 이미 샌 상태(§5-2)
  else if (!last.completed) inc -= 2;                                      // 미완주
  else if (typeof last.rpe === 'number' && last.rpe >= 9) inc -= 2;        // RPE 9 이상

  if (inc < WALK_PRESCRIPTION.inclineFloor) inc = WALK_PRESCRIPTION.inclineFloor;
  if (inc > cap) inc = cap;
  return Math.round(inc * 2) / 2;                                          // 0.5% 격자
}

// 경사가 오르면 속도는 내린다(§2 설계원칙 2 — 경사 12%에서 5.5km/h면 손잡이를 잡게 된다).
function cardioWalkSpeedFor(incline) {
  var inc = Number(incline);
  if (!isFinite(inc) || inc < 0) inc = 0;
  var spd = (inc >= 11) ? 4.8 : WALK_PRESCRIPTION.speedDefault;
  if (spd < WALK_PRESCRIPTION.speedMin) spd = WALK_PRESCRIPTION.speedMin;
  if (spd > WALK_PRESCRIPTION.speedMax) spd = WALK_PRESCRIPTION.speedMax;
  return Math.round(spd * 10) / 10;
}

// ACSM 걷기 대사공식으로 세션 소모 열량을 "대략" 추정 (§1-2).
//   VO₂(ml·kg⁻¹·min⁻¹) = 3.5 + (0.1 × 속도[m/분]) + (1.8 × 속도[m/분] × 경사[소수])
//   kcal/분 = VO₂ × 체중(kg) ÷ 1000 × 5   (산소 1L ≈ 5 kcal)
// ★실측 대비 약 +6% 과대추정이므로 화면에는 반드시 "대략"으로 표시한다(§7-8).
function cardioWalkKcal(segments, weightKg) {
  var w = Number(weightKg);
  if (!isFinite(w) || w <= 0) return 0;
  var segs = Array.isArray(segments) ? segments : [];
  var kcal = 0;
  segs.forEach(function(s) {
    if (!s) return;
    var sec = Number(s.sec);
    if (!isFinite(sec) || sec <= 0) return;
    var kmh = Number((s.actualSpeed != null) ? s.actualSpeed : s.targetSpeed);
    if (!isFinite(kmh) || kmh < 0) kmh = 0;
    var mPerMin = kmh * 1000 / 60;
    var grade = Number(s.incline);
    if (!isFinite(grade) || grade < 0) grade = 0;
    var vo2 = 3.5 + (0.1 * mPerMin) + (1.8 * mPerMin * (grade / 100));
    kcal += vo2 * w / 1000 * 5 * (sec / 60);
  });
  return Math.round(kcal);
}

// 화면 표시용 체중 — 최근 체중 기록 → 프로필 → 70kg(연구 표 기준값) 순.
function cardioWalkBodyWeight() {
  var bodyLog = (state.data && Array.isArray(state.data.bodyLog)) ? state.data.bodyLog : [];
  var last = bodyLog.length ? Number(bodyLog[bodyLog.length - 1].weight) : NaN;
  if (isFinite(last) && last > 0) return last;
  var pw = (state.profile && Number(state.profile.weight));
  if (isFinite(pw) && pw > 0) return pw;
  return 70;
}

// 걷기 처방에 필요한 값을 한 번만 계산해 묶는다 — 로컬 폴백(screens.js)과 AI 프롬프트(ai.js)가
// 같은 기준 경사를 쓰도록, 그리고 한 번의 생성에서 로그를 여러 번 훑지 않도록.
function cardioWalkContext() {
  var log = (state.data && Array.isArray(state.data.cardioLog)) ? state.data.cardioLog : [];
  var areas = (typeof getUserInjuryAreas === 'function') ? getUserInjuryAreas() : [];
  return {
    log: log,
    areas: areas,
    back: areas.indexOf('lower_back') !== -1,
    sessions: cardioWalkSessions(log),
    cap: cardioWalkInclineCap(areas),
    anchorIncline: cardioWalkNextIncline(log, areas)
  };
}

// 걷기 세션 총시간 상한(§4-1) — 본 구간 33분을 넘기지 않도록 총시간 자체를 자른다.
// ★cardioFitToTotal 은 구간을 totalSec 에 비례 스케일하므로, 구간만 잘라도 다시 늘어난다.
//   그래서 상한은 반드시 "총시간" 단계에서 걸어야 한다.
function cardioWalkClampTotalSec(totalSec) {
  var T = Math.max(60, Math.round(Number(totalSec) || 0));
  return Math.min(T, WALK_PRESCRIPTION.maxTotalSec);
}

// §3-2 표준 4구간 구조를 총시간에 맞춰 스케일한 원시 구간 배열(길이 sec 기반).
//   몸풀기(경사 0%) → 준비 구간/램프(목표의 절반) → 본 구간(목표 경사 정속) → 정리(경사 0%)
// ai.js 의 AI 폴백과 screens.js 의 로컬 폴백이 같은 구조를 쓰도록 여기 한 곳에서 만든다.
// 30초 격자 스냅·총시간 정확히 맞추기는 cardioFitToTotal 이 마무리한다.
function buildWalkRawSegments(totalSec, targetIncline) {
  var T = cardioWalkClampTotalSec(totalSec);                   // 본 구간 33분 상한을 총시간 단계에서 강제(§4-1)
  function snap30(x) { return Math.round(x / 30) * 30; }

  var inc = Number(targetIncline);
  if (!isFinite(inc) || inc < 0) inc = WALK_PRESCRIPTION.inclineStart;
  if (inc > WALK_PRESCRIPTION.inclineMax) inc = WALK_PRESCRIPTION.inclineMax;
  inc = Math.round(inc * 2) / 2;
  var rampInc = Math.round(inc) / 2;                           // 목표의 절반(0.5% 격자) — 심박·아킬레스 예열
  var spd = cardioWalkSpeedFor(inc);

  var wu = Math.min(300, Math.max(120, snap30(T * 0.167)));    // 몸풀기 ~5분 (경사 0%: 시작부터 요추에 굴곡 부하를 주지 않음)
  var ramp = (T >= 900) ? 120 : 60;                            // 램프 2분(짧은 세션은 1분)
  var cd = Math.min(300, Math.max(120, snap30(T * 0.10)));     // 정리 3~5분
  var main = T - wu - ramp - cd;
  if (main < 180) {                                            // 본 구간 최소 3분 확보 — 짧은 세션은 앞뒤를 압축
    ramp = 0;
    wu = Math.max(60, snap30((T - 180) / 2));
    cd = Math.max(60, T - 180 - wu);
    main = T - wu - ramp - cd;
  }
  if (main < 60) { wu = 60; ramp = 0; cd = 60; main = Math.max(60, T - 120); }
  // 본 구간 33분 상한(§4-1). 총시간은 이미 45분으로 잘렸지만, 반올림 때문에 몇십 초 넘칠 수 있다.
  // 넘친 만큼은 정리 → 몸풀기 순으로(각 5분까지) 옮겨 총시간을 그대로 지킨다.
  if (main > WALK_PRESCRIPTION.mainMaxSec) {
    var over = main - WALK_PRESCRIPTION.mainMaxSec;
    main -= over;
    var giveCd = Math.min(over, Math.max(0, 300 - cd)); cd += giveCd; over -= giveCd;
    var giveWu = Math.min(over, Math.max(0, 300 - wu)); wu += giveWu; over -= giveWu;
    if (over > 0) main += over;                                // 더 둘 곳이 없으면 되돌린다(총시간 보존 우선)
  }

  var segs = [{ type: 'warmup', sec: wu, speed: WALK_PRESCRIPTION.speedDefault, incline: 0, label: '몸풀기' }];
  if (ramp > 0 && rampInc > 0) {
    segs.push({ type: 'warmup', sec: ramp, speed: WALK_PRESCRIPTION.speedDefault, incline: rampInc, label: '준비 구간' });
  } else if (ramp > 0) {
    segs[0].sec += ramp;                                       // 램프가 의미 없을 때(경사 0%)는 몸풀기에 합침
  }
  segs.push({ type: 'walk', sec: main, speed: spd, incline: inc, label: '본 구간' });
  segs.push({ type: 'cooldown', sec: cd, speed: WALK_PRESCRIPTION.cooldownSpeed, incline: 0, label: '정리' });
  return segs;
}

// ═══════════════════════════════════════════════
// 웜업 · 스트레칭 계획 조립 (순수 함수)
// 근거: docs/research/warmup-stretching.md §6-C(조립 규칙) · §3-H(발췌 규칙) · §4-D(요추 보호 순서)
//
// 역할 분담(§1-B) — 이 파일은 "본운동 앞단"만 만든다:
//   [웜업 화면] 일반 웜업 3분 + 부위별 동적 드릴 2~3분   ← 여기
//   [본운동]    첫 종목 카드의 램프업 세트 → 워킹세트     ← set-schemes.md §2 규칙①(buildSchemeSets)
//   램프업 세트는 웜업 시간 수지에 넣지 않는다. 이미 본운동 시간에 포함돼 있다(§1-B · §5-A).
// ═══════════════════════════════════════════════

// 드릴 상한 — §5-A 시간 수지(웜업 일반 3분 + 드릴 2~3분, 스트레칭 4~5분)에서 나온 값
var MOBILITY_WARMUP_LIMIT = 5;   // 일반 웜업 제외한 부위 드릴 수
var MOBILITY_STRETCH_LIMIT = 4;
// 요추 보호 순서(§4-D): 캣-카멜(무부하 가동) → McGill 계열(척추 강성) → 나머지(고관절·어깨 패턴).
// "먼저 척추를 굳히고, 그 다음에 팔·다리를 움직인다."
var MOBILITY_LUMBAR_LEAD = 'cat_camel';
var MOBILITY_MCGILL_KEYS = ['bird_dog', 'mcgill_curlup', 'side_bridge'];

// 세션 종목 목록에서 웜업 대분류를 유도한다 (§6-B 유도 로직).
// 각 종목의 primary 부위 → PART_TO_WARMUP_GROUP → 등장 횟수 많은 순 상위 2개.
// 동률이면 먼저 나온 종목(= 그날의 첫 종목·메인)의 부위를 앞에 둔다 — §3-H 규칙3.
function deriveWarmupGroups(exercises) {
  var order = [];
  var count = {};
  (exercises || []).forEach(function(ex) {
    var name = ex && (ex.name || ex);
    if (!name) return;
    var map = EXERCISE_BODY_PART_MAP[name];
    if (!map && EXERCISE_ALIASES_1RM[name]) map = EXERCISE_BODY_PART_MAP[EXERCISE_ALIASES_1RM[name]];
    var group = map && PART_TO_WARMUP_GROUP[map.primary];
    if (!group) return;
    if (count[group] === undefined) { count[group] = 0; order.push(group); }
    count[group]++;
  });
  // 동률 판정에 쓸 "첫 등장 순서"는 정렬 전에 찍어 둔다.
  // order 를 정렬하면서 order.indexOf 를 부르면 반쯤 정렬된 배열을 읽어 비교가 뒤집힌다.
  var firstSeen = {};
  order.forEach(function(g, i) { firstSeen[g] = i; });
  order.sort(function(a, b) {
    if (count[b] !== count[a]) return count[b] - count[a];
    return firstSeen[a] - firstSeen[b];           // 동률 → 첫 등장 순서 유지
  });
  return order.slice(0, 2);
}

// 세션 타입(빠른 경로) 또는 종목 목록(유도)으로 웜업 대분류를 정한다.
function resolveWarmupGroups(sessionType, exercises) {
  var mapped = SESSION_WARMUP_MAP[sessionType];
  if (mapped && mapped.length) return mapped.slice();
  var derived = deriveWarmupGroups(exercises);
  return derived.length ? derived : ['core'];   // 아무것도 못 찾으면 척추 보호 기본 세트
}

// 여러 부위의 목록을 라운드로빈으로 섞어 중복 없이 합친다.
// 단순 연결(concat)이면 첫 부위 목록만 상한을 다 먹어버려 UPPER 날에 등 드릴이 하나도 안 남는다.
// 부위마다 한 개씩 번갈아 뽑으면 §3-H "각 부위 1~2개 발췌"가 자연스럽게 나온다.
function mobilityMergeRoundRobin(groups, table) {
  var lists = (groups || []).map(function(g) { return (table[g] || []).slice(); });
  var out = [];
  var seen = {};
  var maxLen = 0;
  lists.forEach(function(l) { if (l.length > maxLen) maxLen = l.length; });
  for (var i = 0; i < maxLen; i++) {
    for (var j = 0; j < lists.length; j++) {
      var key = lists[j][i];
      if (!key || seen[key]) continue;
      seen[key] = true;
      out.push(key);
    }
  }
  return out;
}

// 요추 굴곡 동작(discSafe:false)을 안전한 대체 동작으로 치환한다 (§6-C 규칙4).
// 이 앱은 1인용이고 사용자가 허리디스크 보유자라 조건 분기 없이 **항상** 적용한다
// (§6-C 설계 판단: "기본 목록에 애초에 넣지 않는 것이 가장 단순 · 런타임 분기는 최소화").
// 대체 동작이 없으면 조용히 빼지 않고 목록에서 제거한 사실이 omitted 수에 반영된다.
function mobilitySubstituteUnsafe(keys) {
  var out = [];
  var seen = {};
  (keys || []).forEach(function(key) {
    var d = MOBILITY_DRILLS[key];
    if (!d) return;
    var finalKey = key;
    if (d.discSafe === false) {
      finalKey = d.discAlt && MOBILITY_DRILLS[d.discAlt] ? d.discAlt : null;
    }
    if (!finalKey || seen[finalKey]) return;
    seen[finalKey] = true;
    out.push(finalKey);
  });
  return out;
}

// 요추 보호 정렬 (§4-D): 캣-카멜을 맨 앞으로, McGill 계열을 그 바로 뒤로, 나머지는 원래 순서 유지.
function mobilityOrderForLumbar(keys) {
  var lead = [];
  var mcgill = [];
  var rest = [];
  (keys || []).forEach(function(key) {
    if (key === MOBILITY_LUMBAR_LEAD) lead.push(key);
    else if (MOBILITY_MCGILL_KEYS.indexOf(key) !== -1) mcgill.push(key);
    else rest.push(key);
  });
  return lead.concat(mcgill, rest);
}

// 공통 조립기. 반환 { keys, groups, omitted } — omitted 는 상한에 걸려 잘라낸 개수다.
// 잘라낸 게 있으면 화면에 "생략된 동작 N개"로 표시한다. 말없이 자르지 않는다(§6-C 규칙7).
function buildMobilityPlan(table, sessionType, exercises, limit, leadKeys) {
  var groups = resolveWarmupGroups(sessionType, exercises);
  var merged = mobilityOrderForLumbar(mobilitySubstituteUnsafe(mobilityMergeRoundRobin(groups, table)));
  var kept = merged.slice(0, limit);
  return {
    keys: (leadKeys || []).concat(kept),
    groups: groups,
    omitted: Math.max(0, merged.length - kept.length)
  };
}

// 세션 시작 웜업: 일반 웜업(고정 1개) + 부위별 동적 드릴 최대 5개.
// short=true 면 §5-C "압축 모드" — 일반 웜업 3분만. 근거상 손실이 거의 없는 바쁜 날용 선택지다.
function buildWarmupPlan(sessionType, exercises, opts) {
  var short = !!(opts && opts.short);
  if (short) return { keys: WARMUP_GENERAL.slice(), groups: resolveWarmupGroups(sessionType, exercises), omitted: 0 };
  return buildMobilityPlan(WARMUP_BY_PART, sessionType, exercises, MOBILITY_WARMUP_LIMIT, WARMUP_GENERAL);
}

// 세션 종료 스트레칭: 부위별 3~4동작. 일반 웜업 같은 고정 항목은 없다.
function buildStretchPlan(sessionType, exercises) {
  return buildMobilityPlan(STRETCH_BY_PART, sessionType, exercises, MOBILITY_STRETCH_LIMIT, []);
}

// 드릴 키 목록 → 화면이 한 칸씩 진행할 구간 목록.
// 좌우 동작(timePerSide/repsPerSide)은 왼쪽·오른쪽 두 구간으로 쪼갠다 — 전환 시점에 예고·소리를 줄 수 있어야 하기 때문(§6-D).
// mode 는 'time'(자동 카운트다운) 또는 'reps'(사용자가 "완료"를 눌러 진행) 둘 중 하나로 정규화된다.
function expandMobilitySegments(keys) {
  var out = [];
  (keys || []).forEach(function(key) {
    var d = MOBILITY_DRILLS[key];
    if (!d) return;
    var perSide = (d.mode === 'timePerSide' || d.mode === 'repsPerSide');
    var isTime = (d.mode === 'time' || d.mode === 'timePerSide');
    var sides = perSide ? ['left', 'right'] : [null];
    sides.forEach(function(side) {
      out.push({
        key: key,
        kr: d.kr,
        side: side,
        mode: isTime ? 'time' : 'reps',
        // time: 실제로 세는 초 / reps: 총시간 추정에만 쓰는 참고값(타이머 아님)
        sec: isTime ? (d.sec || 30) : Math.round((d.reps || 10) * (d.secPerRep || 3)),
        reps: isTime ? null : (d.reps || 10),
        // 설명은 준비(prep) → 동작(cue) → 기준(std) 세 줄로 나눠 화면에 그대로 얹는다.
        // 처음 보는 동작을 글만 읽고 따라하려면 "어디에 어떻게 자리 잡는지"가 먼저 있어야 한다.
        prep: d.prep || '',
        cue: d.cue || '',
        std: d.std || '',
        why: d.why || '',
        warn: d.warn || '',
        gear: d.gear || 'none',
        optional: !!d.optional
      });
    });
  });
  return out;
}

// 구간 목록의 예상 총 소요(초). 횟수 구간은 추정값이라 화면에서 "약 N분"으로만 쓴다.
function mobilitySegmentsTotalSec(segs) {
  return (segs || []).reduce(function(sum, s) { return sum + (Number(s && s.sec) || 0); }, 0);
}

// 구간 이름 — 좌우가 있으면 붙여 준다.
function mobilitySegmentLabel(seg) {
  if (!seg) return '';
  if (seg.side === 'left') return seg.kr + ' · 왼쪽';
  if (seg.side === 'right') return seg.kr + ' · 오른쪽';
  return seg.kr;
}

// 구간의 분량 표시 — 시간 모드는 "30초", 횟수 모드는 "12회".
function mobilitySegmentAmount(seg) {
  if (!seg) return '';
  return (seg.mode === 'time') ? (seg.sec + '초') : (seg.reps + '회');
}
