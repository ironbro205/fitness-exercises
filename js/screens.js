// js/screens.js — 화면 렌더 + render() + 세션 로직 + 스와이프 + 부팅(init 호출)
'use strict';
// ═══════════════════════════════════════════════
// 홈 화면 렌더
// ═══════════════════════════════════════════════
function renderHome() {
  var profile = state.profile;
  var data = state.data;
  var today = new Date();
  var tdStr = getTodayStr();
  var dayOfWeek = today.getDay() || 7;
  var dayNames = ['일','월','화','수','목','금','토'];
  
  // 주간 리뷰 자동 로드 (백그라운드, 일요일)
  if (state.apiKey && !state.weeklyReview && !state.weeklyReviewLoading && shouldShowWeeklyReview()) {
    loadWeeklyReviewIfNeeded();
  }
  
  // 정체기 자동 체크 (백그라운드)
  if (state.apiKey && !state.plateauCheck && !state.plateauCheckLoading) {
    loadPlateauCheckIfNeeded();
  }

  // 오늘의 추천 자동 로드 (백그라운드) — 캐시가 KST 날짜 기준이라 하루 1회만 API를 쓴다.
  // await 하지 않으므로 첫 페인트를 막지 않는다 (주간 리뷰·정체기와 같은 패턴).
  if (state.apiKey && !state.aiRecLoading && state.aiRecFailedDate !== tdStr &&
      (!state.aiRecommendation || state.aiRecommendation.date !== tdStr)) {
    loadAIRecommendationIfNeeded();
  }

  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  monday.setHours(0,0,0,0);

  var mondayStr = getDateStr(monday);
  var thisWeekWorkouts = data.workoutLog.filter(function(w) {
    return w.date >= mondayStr && w.date <= tdStr;
  });
  
  var weekDays = ['월','화','수','목','금','토','일'];
  var weekMap = {};
  thisWeekWorkouts.forEach(function(w) {
    var day = new Date(w.date).getDay();
    var idx = day === 0 ? 6 : day - 1;
    weekMap[idx] = w.sessionKr;
  });
  var todayDayIdx = dayOfWeek === 7 ? 6 : dayOfWeek - 1;
  var recentPRs = data.personalRecords.slice(0, 2);
  
  // 사이클 도트 (5주: 빌드 4 + 디로드 1). 마지막(디로드)은 빈 점으로 구분.
  var weekDots = '';
  for (var i = 0; i < CYCLE_LENGTH; i++) {
    var isCur = i === profile.currentWeek - 1;
    var isDeloadDot = i === CYCLE_LENGTH - 1;
    var dotStyle = (!isCur && isDeloadDot) ? ' style="border:1px solid var(--bg-4);background:transparent;"' : '';
    weekDots += '<div class="dot ' + (isCur ? 'dot-ideal' : 'dot-pending') + '"' + dotStyle + '></div>';
    if (i < CYCLE_LENGTH - 1) weekDots += '<div class="flex-1 h-px bg-stone-800"></div>';
  }
  // 사이클 단계 안내 + 이번 주 진행
  var isDeloadWeek = profile.currentWeek >= CYCLE_LENGTH;
  var phaseHint = isDeloadWeek ? '가볍게 · 건너뛰기 가능' : '조금씩 늘리기';
  var weekGoal = profile.workoutFreq || 4;
  var doneTowardWeek = profile.weekSessionsDone || 0; // 이번 주차 완료 수(캘린더 아님)
  var idleMsg = getIdleComebackMessage(data.workoutLog, getTodayStr());
  var cycleStatusLine = idleMsg
    ? idleMsg.message
    : (doneTowardWeek >= weekGoal
        ? '이번 주차 목표 달성 — 다음 운동이면 다음 주차로'
        : '이번 주차 ' + weekGoal + '회 중 ' + doneTowardWeek + '회 · 다 하면 다음 주차로');
  
  // 주간 요일 박스
  var weekBoxes = '';
  weekDays.forEach(function(day, idx) {
    var completed = weekMap[idx];
    var isToday = idx === todayDayIdx;
    var boxClass = completed ? 'day-box-done' : (isToday ? 'day-box-today' : 'day-box-empty');
    var dayColor = isToday ? 'var(--accent)' : 'var(--text-muted)';
    
    weekBoxes += '<div class="text-center">' +
      '<div class="day-box ' + boxClass + '">' +
        (completed ? '<p class="text-[11px] font-display font-bold accent">' + escapeHtml(completed) + '</p>' : '') +
        (!completed && isToday ? '<div class="today-dot"></div>' : '') +
      '</div>' +
      '<p class="text-[11px] font-mono mt-1" style="color: ' + dayColor + '">' + day + '</p>' +
    '</div>';
  });
  
  // PR 카드
  var prCards = '';
  recentPRs.forEach(function(pr) {
    prCards += '<div class="pr-badge">' +
      '<div>' +
        '<p class="text-sm font-display font-bold">' + escapeHtml(pr.exerciseName) + '</p>' +
        '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + daysAgo(pr.date) + (pr.weight ? ' · ' + pr.reps + '회' : '') + '</p>' +
      '</div>' +
      '<div class="text-right">' +
        '<p class="font-bebas text-2xl accent">' +
          (pr.weight !== undefined && isReverseProgression(pr.exerciseName) ? '<span class="text-xs text-stone-500">보조 </span>' : '') +
          (pr.weight !== undefined ? pr.weight : pr.reps) + '<span class="text-xs text-stone-500">' + (pr.weight !== undefined ? 'kg' : '회') + '</span></p>' +
        '<p class="text-[11px] font-mono text-stone-500">' + escapeHtml(formatPRDelta(pr)) + '</p>' +
      '</div>' +
    '</div>';
  });
  
  return '' +
    // 헤더 — 화면 이름은 탭바가 이미 말한다. 날짜만 남긴다.
    '<div class="px-5 pt-12 pb-4">' +
      '<p class="text-xs uppercase font-mono text-stone-500" style="letter-spacing: 0.3em;">' + fmtDate(today) + ' · ' + dayNames[today.getDay()] + '</p>' +
    '</div>' +

    '<div class="px-5 pb-32">' +
      
      // 사이클 카드
      '<div class="card-accent mb-4">' +
        '<div class="relative">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">현재 단계</p>' +
          '<div class="flex items-end justify-between mb-4">' +
            '<h2 class="font-bebas text-4xl">' + escapeHtml(profile.cyclePhase) + (isDeloadWeek ? '' : ' ' + escapeHtml(profile.currentWeek) + '주차') + '</h2>' +
            '<p class="text-xs text-stone-500 font-mono">' + phaseHint + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-1\\.5">' + weekDots + '</div>' +
          '<div class="flex items-center justify-between mt-2">' +
            '<p class="text-[11px] text-stone-600 font-mono uppercase">빌드 1~4주</p>' +
            '<p class="text-[11px] text-stone-600 font-mono uppercase">디로드</p>' +
          '</div>' +
          '<p class="text-[11px] font-mono mt-3 ' + (idleMsg ? 'text-amber-400' : 'text-stone-400') + '">' + cycleStatusLine + '</p>' +
        '</div>' +
      '</div>' +
      
      // 이번 주 — 횟수/목표 숫자는 위 사이클 카드가 이미 말한다(같은 사실 두 번 금지).
      //          여기는 "어느 요일에 했나"만 보여준다.
      '<div class="card mb-4">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3">이번 주</p>' +
        '<div class="grid grid-cols-7 gap-1\\.5">' + weekBoxes + '</div>' +

        // 최근 운동 리스트 (있을 시) — 저장이 최신 먼저라 날짜 내림차순으로 다시 정렬해 자른다.
        (thisWeekWorkouts.length > 0 ?
          '<div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--bg-3);">' +
            '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-2">최근 운동</p>' +
            sortByDateDesc(thisWeekWorkouts).slice(0, 3).map(function(w) {
              var d = new Date(w.date);
              var dStr = ['일','월','화','수','목','금','토'][d.getDay()];
              return '<div class="workout-history-row" onclick="openItemDetail(\'workout\', \'' + escapeHtml(w.startTime || w.id) + '\')">' +
                '<div class="flex items-center gap-3">' +
                  '<div class="workout-history-dot"></div>' +
                  '<div>' +
                    '<p class="text-xs font-display font-bold">' + escapeHtml(w.sessionKr || w.sessionName) + '</p>' +
                    '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + escapeHtml(String(w.date).substring(5)) + ' (' + dStr + ') · ' + escapeHtml(w.duration || 0) + '분 · ' + escapeHtml(w.sets || 0) + '세트</p>' +
                  '</div>' +
                '</div>' +
                '<div style="color: var(--text-muted);">' + icon('chevron', 14) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' : '') +
      '</div>' +
      
      // 오늘의 추천 카드 (AI 일일 추천 — 하루 1회)
      renderAIRecommendationCard() +

      // 주간 리뷰 카드 (일요일 또는 새 주차)
      (state.weeklyReview ? 
        '<div class="weekly-review-card mb-4" onclick="openWeeklyReview()">' +
          '<div class="relative">' +
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="ai-badge">' + icon('chart', 12) + '주간 리뷰</span>' +
              '<p class="text-[11px] font-mono text-stone-500">' + state.weeklyReview.monday.substring(5) + ' ~ ' + state.weeklyReview.sunday.substring(5) + '</p>' +
            '</div>' +
            '<div class="flex items-baseline gap-3 mb-2">' +
              '<p class="font-bebas text-5xl" style="color: ' + gradeColor(state.weeklyReview.grade) + ';">' + escapeHtml(state.weeklyReview.grade) + '</p>' +
              '<p class="text-sm font-display font-bold leading-tight">' + escapeHtml(state.weeklyReview.headline) + '</p>' +
            '</div>' +
            '<p class="text-[11px] font-mono accent">자세히 보기 →</p>' +
          '</div>' +
        '</div>'
      : (state.weeklyReviewLoading ? 
        '<div class="weekly-review-card mb-4">' +
          '<div class="flex items-center gap-3">' +
            '<div class="loading-spinner"></div>' +
            '<div>' +
              '<p class="text-sm font-display font-bold">주간 리뷰 분석 중</p>' +
              '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">이번 주 데이터 종합 중...</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '')) +
      
      // 정체기 경고 카드 (감지 시)
      (state.plateauCheck ? 
        '<div class="plateau-card mb-4" onclick="openPlateauDetail()">' +
          '<div class="flex items-start gap-3">' +
            '<div style="color: var(--warn); flex-shrink: 0;">' + icon('info', 22) + '</div>' +
            '<div class="flex-1">' +
              '<div class="flex items-center justify-between mb-1">' +
                '<p class="text-xs font-display font-bold" style="color: var(--warn);">정체기 신호 감지</p>' +
                '<p class="text-[11px] font-mono text-stone-500">' + state.plateauCheck.signals.length + '개 신호</p>' +
              '</div>' +
              '<p class="text-sm text-stone-200 leading-relaxed mb-2">' + escapeHtml(state.plateauCheck.primary_cause || '진행이 정체되고 있어요.') + '</p>' +
              '<p class="text-[11px] font-mono" style="color: var(--warn);">분석 보기 →</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '') +
      
      // 정체기 경고 카드 끝 → 바로 컨테이너 닫힘 (코치/최근PR/빠른입력 제거: 묶음5)
      
    '</div>';
}

// ═══════════════════════════════════════════════
// 오늘의 추천 카드 (홈) — AI 일일 추천
// 상태 4가지: API 키 없음 / 로딩 / 오늘 실패 / 결과
// CSS는 이미 있는 .ai-rec-card 계열을 그대로 쓴다 (css/styles.css:1978~2029)
// ═══════════════════════════════════════════════
// 주간 리뷰 등급 → 색상. AI가 준 grade 를 **객체 키로 그냥 조회하면** 프로토타입까지 훑는다
// (grade='__proto__' 면 [object Object], 'constructor' 면 함수 소스가 색상 자리에 들어가 CSS가 깨진다).
// 소유 속성일 때만 인정하고 아니면 기본색 — S/A/B/C/D 외에는 전부 기본색이라는 뜻이다.
var GRADE_COLORS = { S: 'var(--accent)', A: 'var(--accent)', B: 'var(--purple)', C: 'var(--warn)', D: 'var(--danger)' };
function gradeColor(grade) {
  return Object.prototype.hasOwnProperty.call(GRADE_COLORS, grade) ? GRADE_COLORS[grade] : 'var(--purple)';
}

function renderAIRecommendationCard() {
  // API 키 없음 — 키 모달은 더보기 화면에서만 렌더되므로 탭 이동으로 유도
  if (!state.apiKey) {
    return '<div class="coach-api-required" onclick="setTab(\'more\')">' +
      '<div style="color: var(--warn); flex-shrink: 0;">' + icon('info', 18) + '</div>' +
      '<div class="flex-1">' +
        '<p class="text-xs font-display font-bold" style="color: var(--warn);">오늘의 추천 — API 키 필요</p>' +
        '<p class="text-[11px] font-mono text-stone-400 mt-0\\.5">더보기 → Anthropic API 키 설정</p>' +
      '</div>' +
    '</div>';
  }

  // 로딩 (백그라운드 로드 중 — 첫 페인트는 이미 끝난 상태)
  if (state.aiRecLoading) {
    return '<div class="ai-rec-card mb-4">' +
      '<div class="flex items-center gap-3">' +
        '<div class="loading-spinner"></div>' +
        '<div>' +
          '<p class="text-sm font-display font-bold">오늘의 추천 분석 중</p>' +
          '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">컨디션 · 부족 부위 · 사이클 확인 중...</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var rec = state.aiRecommendation;

  // 오늘 실패 — 자동 재시도는 막고(무한 호출 방지) 수동 재시도 버튼만 준다
  if (!rec) {
    if (state.aiRecFailedDate !== getTodayStr()) return '';
    return '<div class="ai-rec-card mb-4">' +
      '<div class="flex items-center justify-between gap-3">' +
        '<div>' +
          '<p class="text-sm font-display font-bold">오늘의 추천을 못 받았어요</p>' +
          '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">네트워크·API 키를 확인한 뒤 다시 시도</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="refreshAIRecommendation()" title="다시 추천">' + icon('refresh', 16) + '</button>' +
      '</div>' +
    '</div>';
  }

  // 결과 — session은 fetchAIRecommendation이 5종(push/pull/legs/upper/free)으로 검증한 값.
  // 옛 캐시가 이상한 값을 갖고 있어도 free로 폴백해 렌더가 깨지지 않게 한다.
  var session = SESSIONS[rec.session] || SESSIONS.free;
  var intensityKr = { light: '가볍게', moderate: '보통', challenging: '도전적' }[rec.intensity] || '보통';

  return '<div class="ai-rec-card mb-4">' +
    '<div class="relative">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<span class="ai-badge">' + icon('star', 12) + '오늘의 추천</span>' +
        '<button class="session-header-btn" onclick="refreshAIRecommendation()" title="다시 추천">' + icon('refresh', 16) + '</button>' +
      '</div>' +
      '<div class="flex items-baseline gap-3 mb-1">' +
        '<p class="font-bebas text-4xl accent">' + session.name + '</p>' +
        '<p class="text-[11px] font-mono text-stone-500">' + session.description + ' · 강도 ' + intensityKr + '</p>' +
      '</div>' +
      (rec.title ? '<p class="text-sm font-display font-bold">' + escapeHtml(rec.title) + '</p>' : '') +
      (rec.reason ? '<div class="ai-rec-reason"><p class="text-xs text-stone-200 leading-relaxed">' + escapeHtml(rec.reason) + '</p></div>' : '') +
      (rec.suggestion ? '<div class="ai-rec-suggestion"><p class="text-xs text-stone-200 leading-relaxed">' + escapeHtml(rec.suggestion) + '</p></div>' : '') +
      (rec.caution ? '<div class="ai-rec-caution"><p class="text-xs leading-relaxed" style="color: var(--warn);">' + escapeHtml(rec.caution) + '</p></div>' : '') +
      '<p class="text-[11px] font-mono text-stone-500 mt-3">운동 탭에 추천으로 표시돼 있어요</p>' +
    '</div>' +
  '</div>';
}


function renderWorkout() {
  // STEP 2/3는 다른 함수에서 처리, 여기는 STEP 1 (부위 선택)
  if (state.workoutWizardStep === 2) {
    return renderWorkoutStep2();
  }
  if (state.workoutWizardStep === 3) {
    return renderWorkoutStep3();
  }
  
  // STEP 1: 부위 선택
  var today = new Date();
  var dayOfWeek = today.getDay() || 7;
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  monday.setHours(0,0,0,0);
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);
  
  var thisWeek = state.data.workoutLog.filter(function(w) {
    var wd = new Date(w.date);
    return wd >= monday && wd <= sunday;
  });
  
  // 부위별 카운트
  var pushCount = thisWeek.filter(function(w) { return w.sessionKr === 'PUSH'; }).length;
  var pullCount = thisWeek.filter(function(w) { return w.sessionKr === 'PULL'; }).length;
  var legsCount = thisWeek.filter(function(w) { return w.sessionKr === 'LEGS'; }).length;
  var freeCount = thisWeek.filter(function(w) { return w.sessionKr === 'FREE'; }).length;
  var upperCount = thisWeek.filter(function(w) { return w.sessionKr === 'UPPER'; }).length;

  // 추천 부위 (가장 적게 한 부위, 룰: legs < pull < push)
  var counts = { push: pushCount, pull: pullCount, legs: legsCount };
  var minCount = Math.min(pushCount, pullCount, legsCount);
  var recommended = pushCount === minCount ? 'push' 
                  : pullCount === minCount ? 'pull' 
                  : 'legs';
  // 우선순위: legs > pull > push
  if (legsCount === minCount) recommended = 'legs';
  else if (pullCount === minCount) recommended = 'pull';
  else recommended = 'push';

  // 오늘의 AI 추천이 있으면 그 부위를 우선 (홈 카드와 '추천' 배지가 어긋나지 않도록).
  // AI는 컨디션(RPE)·디로드 단계·부족 부위·최근 추천 다양성까지 보고 고르므로
  // 룰(이번 주 최소 횟수)보다 근거가 많다.
  var aiRec = state.aiRecommendation;
  if (aiRec && aiRec.date === getTodayStr() && SESSIONS[aiRec.session]) {
    recommended = aiRec.session;
  }
  
  // 7일 막대 그래프 데이터
  var dayBarsHtml = '';
  var dayLabels = ['월','화','수','목','금','토','일'];
  for (var d = 0; d < 7; d++) {
    var dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + d);
    var dayStr = getDateStr(dayDate);
    var todayStr = getTodayStr();
    var isToday = dayStr === todayStr;
    var isFuture = dayDate > today;
    
    // 해당 날짜의 운동
    var dayWorkouts = thisWeek.filter(function(w) { return w.date === dayStr; });
    
    var barHtml;
    if (dayWorkouts.length > 0) {
      var w = dayWorkouts[0];
      var part = w.sessionKr ? escapeHtml(String(w.sessionKr).toLowerCase()) : 'free';
      var heightPct = Math.min(90, 50 + (Number(w.duration) || 60) / 2);
      barHtml = '<div class="day-bar-shape ' + part + (isToday ? ' today' : '') + '" style="height: ' + heightPct + '%;"></div>';
    } else {
      var height = isFuture ? 6 : 8;
      barHtml = '<div class="day-bar-shape' + (isToday ? ' today' : '') + '" style="height: ' + height + 'px;"></div>';
    }
    
    dayBarsHtml += 
      '<div class="day-bar-col">' +
        barHtml +
        '<p class="day-bar-label' + (isToday ? ' today' : '') + '">' + dayLabels[d] + '</p>' +
      '</div>';
  }
  
  // 부위 카드 생성 헬퍼
  function partCard(key, name, koreanName, desc, count) {
    var isRecommended = key === recommended;
    var cardClass = 'body-part-card' + (isRecommended ? ' recommended' : '') + (count >= 2 ? ' completed' : '');
    var countClass = count >= 2 ? 'done' : '';
    // 0회는 뱃지를 아예 달지 않는다 — 카드 5장에 "0 / 이번 주"가 네 번 반복되면
    // 뱃지가 정보가 아니라 배경이 된다. "한 부위"만 표시하면 그 자체가 신호다.
    var countBadge = count > 0
      ? '<div class="body-part-count">' +
          '<p class="body-part-count-num ' + countClass + '">' + count + '</p>' +
          '<p class="body-part-count-label">이번 주</p>' +
        '</div>'
      : '';

    return '<div class="' + cardClass + '" onclick="selectBodyPart(\'' + key + '\')">' +
      (isRecommended ? '<span class="recommend-badge">추천</span>' : '') +
      '<div class="body-part-header">' +
        '<p class="body-part-name' + (isRecommended ? ' recommended' : '') + '">' + name + '</p>' +
        countBadge +
      '</div>' +
      '<p class="body-part-desc">' + koreanName + ' · ' + desc + '</p>' +
    '</div>';
  }
  
  return '' +
    '<div class="px-5 pt-12 pb-32">' +

      // 스텝 인디케이터
      '<div class="step-indicator">' +
        '<div class="step-dot active"></div>' +
        '<div class="step-line"></div>' +
        '<div class="step-dot"></div>' +
        '<div class="step-line"></div>' +
        '<div class="step-dot"></div>' +
        '<p class="text-[11px] font-mono accent ml-2">1단계 · 부위 선택</p>' +
      '</div>' +

      // 주간 기록 (7일 막대) — "3/4회"와 "달성 75%"는 같은 사실이라 횟수만 남긴다.
      '<div class="weekly-bars-card">' +
        '<div class="weekly-bars-header">' +
          '<div>' +
            '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-1">이번 주 기록</p>' +
            '<p class="font-bebas text-2xl">' + thisWeek.length + '<span class="text-sm text-stone-500"> / ' + state.profile.workoutFreq + '회</span></p>' +
          '</div>' +
        '</div>' +
        '<div class="weekly-bars-grid">' + dayBarsHtml + '</div>' +
      '</div>' +

      // 부위 선택
      '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-3 px-1">부위 선택</p>' +
      
      partCard('push', 'PUSH', '가슴 · 어깨 · 삼두', '밀기 동작', pushCount) +
      partCard('pull', 'PULL', '등 · 이두', '당기기 동작', pullCount) +
      partCard('legs', 'LEGS', '하체 · 코어', '레그 데이', legsCount) +
      partCard('upper', 'UPPER', '상체 전체', '가슴·등·어깨·팔', upperCount) +
      partCard('free', 'FREE', '자유 구성', '직접 종목 선택', freeCount) +
      
    '</div>';
}


// ═══════════════════════════════════════════════
// 운동 마법사 - 핸들러
// ═══════════════════════════════════════════════

window.selectBodyPart = async function(part) {
  state.selectedBodyPart = part;
  state.generatedRoutine = null;
  
  // FREE는 STEP 3 (대화형)로 바로 이동 — 빈 루틴부터 대화로 채워감
  if (part === 'free') {
    state.workoutWizardStep = 3;
    state.routineLoading = false;
    state.routineChatHistory = [];
    state.routineChatInput = '';
    state.routinePreviewExpanded = false;
    
    // 빈 루틴 초기화
    state.generatedRoutine = {
      bodyPart: 'free',
      headline: '자유 루틴 구성 중',
      duration: 60,
      totalSets: 0,
      intensity: 'moderate',
      caution: '',
      exercises: [],
      isFree: true
    };
    
    // AI 첫 메시지
    state.routineChatHistory = [
      {
        role: 'assistant',
        // 예시는 바로 아래 퀵칩과 글자까지 겹쳤다 → 말풍선에서는 뺀다(예시는 칩으로만).
        content: '부위·시간·강도를 알려 주세요.'
      }
    ];

    saveWizard();
    render();
    setTimeout(function() {
      var input = document.getElementById('rc-input');
      if (input) input.focus();
    }, 100);
    return;
  }
  
  // 정형 (PUSH/PULL/LEGS): STEP 2 → AI 루틴 생성
  state.workoutWizardStep = 2;
  state.routineLoading = true;
  saveWizard();
  render();
  
  if (!state.apiKey) {
    // API 키 없을 시 폴백 (SESSIONS에서 가져오기)
    var fallback = SESSIONS[part];
    state.generatedRoutine = {
      bodyPart: part,
      headline: fallback.description,
      reason: '더보기에서 API 키를 넣으면 내 1RM에 맞춰 짜여요.',
      duration: fallback.duration,
      totalSets: fallback.setCount,
      intensity: 'moderate',
      caution: '',
      exercises: fallback.exercises.map(function(ex) {
        return {
          name: ex.name,
          type: ex.type,
          isMain: false,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.lastWeight,
          rir: 2,
          note: ''
        };
      }),
      isFallback: true
    };
    state.routineLoading = false;
    saveWizard();
    render();
    return;
  }

  // AI 루틴 생성
  var routine = await generateFullRoutine(part);

  if (routine && !routine.error) {
    state.generatedRoutine = routine;
  } else {
    state.generatedRoutine = {
      error: routine ? routine.error : '루틴 생성 실패',
      bodyPart: part
    };
  }

  state.routineLoading = false;
  saveWizard();
  render();
};

window.backToStep1 = function() {
  state.workoutWizardStep = 1;
  state.selectedBodyPart = null;
  state.generatedRoutine = null;
  state.routineLoading = false;
  saveWizard();
  render();
};

window.regenerateRoutine = async function() {
  if (!state.selectedBodyPart) return;
  state.routineLoading = true;
  state.generatedRoutine = null;
  saveWizard();
  render();

  var routine = await generateFullRoutine(state.selectedBodyPart);
  if (routine && !routine.error) {
    state.generatedRoutine = routine;
  } else {
    state.generatedRoutine = {
      error: routine ? routine.error : '루틴 생성 실패',
      bodyPart: state.selectedBodyPart
    };
  }
  state.routineLoading = false;
  saveWizard();
  render();
};

window.goToStep3 = function() {
  if (!state.generatedRoutine) return;

  state.workoutWizardStep = 3;
  state.routinePreviewExpanded = false;

  // 첫 진입 시 첫 봇 메시지
  if (state.routineChatHistory.length === 0) {
    var partKor = { push: '가슴/어깨/삼두', pull: '등/이두', legs: '하체/코어', upper: '가슴/등/어깨/팔', free: '자유' };
    var part = state.selectedBodyPart;

    state.routineChatHistory = [
      {
        role: 'assistant',
        // 예시는 바로 아래 퀵칩과 겹친다 → 말풍선에서는 뺀다(예시는 칩으로만).
        content: '어디를 바꿀까요? 제안이 오면 [적용하기]로 반영돼요.'
      }
    ];
  }

  saveWizard();
  render();
  setTimeout(function() {
    var input = document.getElementById('rc-input');
    if (input) input.focus();
    scrollRoutineChatToBottom();
  }, 100);
};

window.backToStep2 = function() {
  // FREE는 STEP 2가 없으므로 STEP 1로 직행
  if (state.selectedBodyPart === 'free') {
    state.workoutWizardStep = 1;
    state.selectedBodyPart = null;
    state.generatedRoutine = null;
    state.routineChatHistory = [];
    state.routineChatInput = '';
    state.routinePreviewExpanded = false;
    saveWizard();
    render();
    return;
  }
  state.workoutWizardStep = 2;
  saveWizard();
  render();
};

window.toggleRoutinePreview = function() {
  state.routinePreviewExpanded = !state.routinePreviewExpanded;
  state.routineExMapIdx = null;   // 접었다 펴면 인체도도 초기화
  state.routineExMapKey = null;
  saveWizard();
  render();
};

window.updateRoutineChatInput = function(text) {
  state.routineChatInput = text;
  var sendBtn = document.getElementById('rc-send-btn');
  if (sendBtn) sendBtn.disabled = !text.trim() || state.routineChatThinking;
};

window.applyRoutineQuickChip = function(text) {
  var input = document.getElementById('rc-input');
  if (input) input.value = text;
  state.routineChatInput = text;
  sendRoutineModification();
};

window.clearRoutineChat = function() {
  if (!confirm('대화를 초기화하시겠어요?')) return;
  state.routineChatHistory = [];
  saveWizard();
  goToStep3();
};

window.sendRoutineModification = async function() {
  if (state.routineChatThinking) return;
  
  var text = state.routineChatInput.trim();
  if (!text) {
    var input = document.getElementById('rc-input');
    if (input) text = input.value.trim();
    if (!text) return;
  }
  
  // 사용자 메시지 추가
  state.routineChatHistory.push({ role: 'user', content: text });
  state.routineChatInput = '';
  state.routineChatThinking = true;
  saveWizard();
  render();
  scrollRoutineChatToBottom();
  
  if (!state.apiKey) {
    state.routineChatHistory.push({
      role: 'assistant',
      content: 'API 키가 필요해요. 더보기 → Anthropic API 키에서 설정해 주세요.'
    });
    state.routineChatThinking = false;
    render();
    scrollRoutineChatToBottom();
    return;
  }
  
  // AI 수정 요청
  var result = await modifyRoutineWithAI(
    state.generatedRoutine,
    text,
    state.routineChatHistory.slice(0, -1) // 마지막 user 메시지 제외 (위에서 별도 전달)
  );
  
  state.routineChatThinking = false;
  
  if (result.error) {
    state.routineChatHistory.push({
      role: 'assistant',
      content: '수정 실패: ' + result.error
    });
  } else if (result.intent === 'question') {
    // 일반 질문/대화 - 답변만 표시, 변경안 없음
    state.routineChatHistory.push({
      role: 'assistant',
      content: result.reply,
      changes: [],
      pendingRoutine: null,
      approvalStatus: null
    });
  } else {
    // 루틴 수정 (modify) - 변경 카드 + 대기 중인 변경안
    // 새 변경안이 생기면, 아직 적용 안 한 이전 pending 카드를 '대체됨'으로 내린다.
    // (옛 카드를 나중에 눌러 방금 적용한 변경을 조용히 되돌리는 사고 방지)
    if (result.updatedRoutine) {
      state.routineChatHistory.forEach(function(m) {
        if (m.approvalStatus === 'pending') m.approvalStatus = 'superseded';
      });
    }
    state.routineChatHistory.push({
      role: 'assistant',
      content: result.reply,
      changes: result.changes,
      pendingRoutine: result.updatedRoutine,  // 사용자 승인 대기
      approvalStatus: result.updatedRoutine ? 'pending' : null  // pending | applied | cancelled | superseded
    });
    // 루틴은 자동 업데이트 X - 사용자가 [적용] 눌러야 반영
  }

  saveWizard();
  render();
  scrollRoutineChatToBottom();
};

// 변경안 적용
window.approveRoutineChange = function(msgIdx) {
  var msg = state.routineChatHistory[msgIdx];
  if (!msg || !msg.pendingRoutine) return;
  
  var pr = msg.pendingRoutine;
  state.generatedRoutine = Object.assign({}, state.generatedRoutine, {
    headline: pr.headline || state.generatedRoutine.headline,
    duration: pr.duration || state.generatedRoutine.duration,
    totalSets: pr.totalSets || state.generatedRoutine.totalSets,
    intensity: pr.intensity || state.generatedRoutine.intensity,
    exercises: pr.exercises || state.generatedRoutine.exercises,
    wasModified: true
  });
  
  msg.approvalStatus = 'applied';
  saveWizard();
  render();
};

// 변경안 취소
window.cancelRoutineChange = function(msgIdx) {
  var msg = state.routineChatHistory[msgIdx];
  if (!msg) return;
  msg.approvalStatus = 'cancelled';
  saveWizard();
  render();
};

// STEP 3: 대화 수정 화면
function renderWorkoutStep3() {
  var routine = state.generatedRoutine;
  if (!routine) {
    return '<div class="px-5 pt-12 text-center"><p class="text-sm text-stone-400">루틴이 없어요</p>' +
      '<button onclick="backToStep1()" class="text-xs accent mt-4">처음으로</button></div>';
  }
  
  var partNames = { push: 'PUSH', pull: 'PULL', legs: 'LEGS', upper: 'UPPER', free: 'FREE' };
  var partName = partNames[state.selectedBodyPart] || routine.bodyPart || '';
  
  // 미리보기 - 종목 리스트
  var previewExHtml = '';
  if (state.routinePreviewExpanded) {
    routine.exercises.forEach(function(ex, idx) {
      // 2단계 처방 표와 **같은 계획**에서 값을 뽑는다 — 두 미리보기가 다른 숫자를 말하면 안 된다.
      var previewPlan = getRoutinePreviewPlan(ex);
      var p = buildPrescriptionValues(ex, previewPlan);
      var weight = (p.weight !== null && p.weight !== '')
        ? (isReverseProgression(ex.name) ? '보조 ' : '') + escapeHtml(p.weight) + 'kg × ' : '';
      // 종목 줄을 누르면 그 종목의 자극 근육 인체도를 펼친다 (한 번에 한 종목만).
      // index + 종목명이 둘 다 맞아야 펼친다 — 루틴이 바뀌면 저절로 닫힌다.
      var mapOpen = isRoutineExerciseMapOpen(idx, ex.name);
      var mapHtml = mapOpen ? buildMuscleMapBlock(ex.name, { compact: true }) : '';
      // 자유 구성은 2단계(처방 표)를 건너뛰므로 세트법을 알 자리가 여기뿐이다.
      // 한 줄에 들어가야 해서 짧은 이름(탑+백오프)만 붙이고, 스트레이트면 아무것도 안 붙인다.
      var schemeShort = (previewPlan && previewPlan.scheme !== 'straight' && SET_SCHEMES[previewPlan.scheme])
        ? ' · ' + SET_SCHEMES[previewPlan.scheme].short : '';
      previewExHtml +=
        '<div class="routine-preview-ex" onclick="toggleRoutineExerciseMap(' + idx + ')">' +
          '<span class="flex-1"><strong>' + (idx + 1) + '. ' + escapeHtml(ex.name) + '</strong></span>' +
          '<span class="routine-preview-ex-stat text-stone-400 font-mono text-[11px]">' + weight + escapeHtml(p.reps) + ' · ' + escapeHtml(p.sets) + '세트' + escapeHtml(schemeShort) + '</span>' +
        '</div>' +
        (mapHtml ? '<div style="margin: -2px 0 6px;">' + mapHtml + '</div>' : '');
    });
  }
  
  // 채팅 메시지
  var messagesHtml = '';
  state.routineChatHistory.forEach(function(msg, idx) {
    if (msg.role === 'assistant') {
      var changesHtml = '';
      var hasChanges = msg.changes && msg.changes.length > 0;
      // 변경 카드는 (1) 변경 목록이 있거나 (2) 승인 대기/완료/취소 상태가 있으면 표시한다.
      // pendingRoutine 은 있는데 changes 가 비어도 [✓ 적용하기] 버튼이 사라지지 않게 한다(버그 수정).
      if (hasChanges || msg.approvalStatus) {
        var changeLines = '';
        if (hasChanges) {
          changeLines = msg.changes.map(function(c) {
            var iconCls = c.type === 'add' ? 'add' : c.type === 'remove' ? 'remove' : 'modify';
            var sym = c.type === 'add' ? '+' : c.type === 'remove' ? '−' : '~';
            return '<div class="change-line">' +
              '<div class="change-icon ' + iconCls + '">' + sym + '</div>' +
              '<span class="text-stone-200"><strong>' + escapeHtml(c.exercise) + '</strong> ' + escapeHtml(c.detail) + '</span>' +
            '</div>';
          }).join('');
        }

        // 승인 상태별 액션 버튼
        var actionHtml = '';
        if (msg.approvalStatus === 'pending') {
          actionHtml = 
            '<div class="change-approval-actions">' +
              '<button class="change-approval-btn cancel" onclick="cancelRoutineChange(' + idx + ')">취소</button>' +
              '<button class="change-approval-btn apply" onclick="approveRoutineChange(' + idx + ')">' + icon('check', 14) + ' 적용하기</button>' +
            '</div>';
        } else if (msg.approvalStatus === 'applied') {
          actionHtml = 
            '<div class="change-approval-actions" style="grid-template-columns: 1fr;">' +
              '<button class="change-approval-btn applied">' + icon('check', 14) + ' 적용 완료</button>' +
            '</div>';
        } else if (msg.approvalStatus === 'cancelled') {
          actionHtml =
            '<div class="change-approval-actions" style="grid-template-columns: 1fr;">' +
              '<button class="change-approval-btn cancel" style="pointer-events: none; opacity: 0.6;">취소됨</button>' +
            '</div>';
        } else if (msg.approvalStatus === 'superseded') {
          actionHtml =
            '<div class="change-approval-actions" style="grid-template-columns: 1fr;">' +
              '<button class="change-approval-btn cancel" style="pointer-events: none; opacity: 0.6;">최신 제안으로 대체됨</button>' +
            '</div>';
        }
        
        var cardLabel = hasChanges ? '제안된 변경사항' : '새 루틴 준비됨';
        changesHtml = '<div class="routine-change-card">' +
          '<p class="text-[11px] font-mono accent uppercase tracking-widest mb-1\\.5">' + cardLabel + '</p>' +
          changeLines +
          actionHtml +
        '</div>';
      }
      
      messagesHtml += 
        '<div class="rc-msg-bot">' +
          '<p class="text-sm">' + renderMarkdown(msg.content) + '</p>' +
          changesHtml +
        '</div>';
    } else {
      messagesHtml += 
        '<div class="rc-msg-user">' +
          '<p class="text-sm">' + renderMarkdown(msg.content) + '</p>' +
        '</div>';
    }
  });
  
  // 생각 중
  if (state.routineChatThinking) {
    messagesHtml += 
      '<div class="rc-msg-bot">' +
        '<div class="flex items-center gap-2">' +
          '<div class="loading-spinner"></div>' +
          '<p class="text-sm text-stone-400">수정 중...</p>' +
        '</div>' +
      '</div>';
  }
  
  // 빠른 칩 (대화 적을 때)
  var quickChips = [];
  if (state.routineChatHistory.length <= 1) {
    if (state.selectedBodyPart === 'free') {
      // FREE 모드: 부위/시간 시작 옵션
      quickChips = [
        '어깨 위주 30분',
        '가슴 + 이두 같이',
        '오늘은 풀바디 가볍게',
        '이번 주 부족한 부위 추천',
        '60분 짜리 등 운동'
      ];
    } else {
      // 정형: 수정 옵션
      quickChips = [
        '전체 무게 살짝 가볍게',
        '시간 줄여줘 (30분)',
        '메인 종목 하나만 추가',
        '고립 운동 빼줘',
        '신장 강조 종목 추가'
      ];
    }
  }
  
  var quickHtml = quickChips.length > 0
    ? '<div class="routine-quick-chips">' +
        quickChips.map(function(c) {
          return '<button class="rc-quick-chip" onclick="applyRoutineQuickChip(\'' + c.replace(/'/g, "\\'") + '\')">' + c + '</button>';
        }).join('') +
      '</div>'
    : '';
  
  var sendDisabled = !state.routineChatInput.trim() || state.routineChatThinking;
  
  var isFree = state.selectedBodyPart === 'free';
  var exCount = routine.exercises.length;
  var isEmpty = exCount === 0;
  
  return '' +
    '<div class="routine-chat-screen">' +
      
      // 헤더
      '<div class="px-5 pt-12 pb-3" style="border-bottom: 1px solid var(--bg-3);">' +
        '<div class="flex items-center justify-between">' +
          '<button onclick="backToStep2()" class="session-header-btn" title="뒤로">' + icon('arrowLeft', 18) + '</button>' +
          '<div class="text-center">' +
            '<p class="text-[11px] font-mono text-stone-500" style="letter-spacing: 0.2em;">' + (isFree ? '자유 구성' : '3단계 · 대화 수정') + '</p>' +
            '<p class="text-[11px] font-mono text-stone-600 mt-0\\.5">' + escapeHtml(partName) + '</p>' +
          '</div>' +
          '<div style="width: 36px;"></div>' +
        '</div>' +
        '<div class="step-indicator mt-3" style="margin-bottom: 0;">' +
          '<div class="step-dot completed"></div>' +
          (isFree 
            ? '<div class="step-line active"></div><div class="step-dot active"></div><div class="step-line active"></div><div class="step-dot active"></div>' 
            : '<div class="step-line active"></div><div class="step-dot completed"></div><div class="step-line active"></div><div class="step-dot active"></div>') +
        '</div>' +
      '</div>' +
      
      // 루틴 미리보기 (접힘/펼침)
      '<div class="routine-preview">' +
        '<div class="routine-preview-collapsed" onclick="' + (isEmpty ? '' : 'toggleRoutinePreview()') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="ai-badge">' + escapeHtml(partName) + '</span>' +
            '<div>' +
              '<p class="text-xs font-display font-bold">' + (isEmpty ? '아직 종목이 없어요' : escapeHtml(routine.headline)) + '</p>' +
              '<p class="text-[11px] font-mono text-stone-500">' + (isEmpty ? '대화로 종목을 추가해 주세요' : exCount + '개 종목 · ' + escapeHtml(routine.totalSets) + '세트 · ' + escapeHtml(routine.duration) + '분' + (routine.wasModified ? ' · 수정됨' : '')) + '</p>' +
            '</div>' +
          '</div>' +
          (isEmpty ? '' : '<div class="chevron-icon ' + (state.routinePreviewExpanded ? 'expanded' : '') + '" style="color: var(--text-muted);">' + icon('chevron', 16) + '</div>') +
        '</div>' +
        (state.routinePreviewExpanded && !isEmpty ? '<div class="routine-preview-expanded">' + previewExHtml + '</div>' : '') +
      '</div>' +
      
      // 채팅 영역
      '<div class="routine-chat-area" id="rc-area">' + messagesHtml + '</div>' +
      
      // 하단 입력 + 시작
      '<div class="routine-chat-bottom">' +
        quickHtml +
        '<div class="routine-chat-input-row">' +
          '<div class="routine-chat-input-bar">' +
            '<input type="text" id="rc-input" placeholder="' + (state.apiKey ? (isFree ? '예: 어깨 위주 30분' : '예: 전체 무게 살짝 가볍게') : 'API 키 필요') + '" value="' + escapeHtml(state.routineChatInput) + '" oninput="updateRoutineChatInput(this.value)" onkeydown="if(event.key===\'Enter\') sendRoutineModification()" ' + (state.routineChatThinking ? 'disabled' : '') + ' />' +
          '</div>' +
          '<button class="rc-send-btn" id="rc-send-btn" onclick="sendRoutineModification()"' + (sendDisabled ? ' disabled' : '') + '>' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<button class="routine-final-start" onclick="startGeneratedRoutine()"' + (isEmpty ? ' disabled style="opacity: 0.4; cursor: not-allowed; box-shadow: none;"' : '') + '>' +
          icon('play', 16) + ' ' + (isEmpty ? '종목을 먼저 추가하세요' : '이 루틴으로 시작') +
        '</button>' +
      '</div>' +

    '</div>' +
    buildMuscleMapZoomHtml();
}

// 생성된 루틴으로 운동 세션 시작
window.startGeneratedRoutine = function() {
  if (!state.generatedRoutine || !state.generatedRoutine.exercises || state.generatedRoutine.exercises.length === 0) {
    alert('종목이 없어요. 먼저 추가해주세요.');
    return;
  }
  
  var r = state.generatedRoutine;
  var sessionType = r.bodyPart;
  // FREE는 SESSIONS에 없으므로 임시 sessionData 생성
  var sessionData = SESSIONS[sessionType] || {
    name: 'FREE',
    description: r.headline || '자유 구성 루틴',
    duration: r.duration || 60,
    setCount: r.totalSets || r.exercises.length * 3
  };
  
  // 종목 데이터를 운동 세션 형식으로 변환
  var exercises = r.exercises.map(function(ex, idx) {
    // 가드레일 + 추천 일치: 세트 시작 무게·횟수를 추천 카드와 같은 계산(getSessionSetPlan)으로.
    // (AI 무게를 따로 스냅하면 "5kg 유지" 카드 옆 세트가 6kg로 어긋나는 문제 방지)
    // 세트 배열 자체도 여기서 나온다 — 세트법(스킴)별 무게·횟수·역할이 세트마다 개별로 붙는다.
    var plan = getSessionSetPlan(ex.name, ex.weight, ex.reps || '8-12', {
      sets: ex.sets || 3,
      warmup: !!ex.isMain   // 워밍업은 메인 종목만 (기존 동작 유지)
    });

    return {
      name: ex.name,
      type: ex.type || '보조',
      rest: ex.rest,
      sets: plan.sets,
      scheme: plan.scheme,
      reps: ex.reps,
      targetReps: repRangeToStr(plan.repRange),  // 세션 화면에서 사용 (클래스 범위로 교정됨)
      lastWeight: (plan.prog && plan.prog.previousWeight !== undefined) ? plan.prog.previousWeight : (ex.weight !== undefined ? ex.weight : null),
      lastReps: null,
      reps_done: ex.reps,
      note: ex.note
    };
  });

  // 길항근 슈퍼세트 자동 제안 (사용자가 종목 메뉴에서 해제 가능)
  applySupersetSuggestions(exercises);

  state.activeSession = {
    sessionType: sessionType,
    sessionName: sessionData.name || sessionType.toUpperCase(),
    sessionKr: sessionData.name || sessionType.toUpperCase(),
    exercises: exercises,
    currentExerciseIdx: 0,
    startTime: Date.now(),
    isGenerated: true,
    routineMeta: {
      headline: r.headline,
      reason: r.reason
    }
  };
  // FREE·AI 루틴은 세션 타입이 없을 수 있어, 종목 목록에서 웜업 부위를 유도한다(buildWarmupPlan 내부).
  attachWarmupToSession(state.activeSession);
  saveActiveSession();

  // 마법사 상태 리셋 (운동이 시작됐으니 마법사는 비움)
  state.workoutWizardStep = 1;
  state.generatedRoutine = null;
  state.selectedBodyPart = null;
  state.routineChatHistory = [];
  state.routineChatInput = '';
  state.routinePreviewExpanded = false;
  clearWizard();

  render();
};

// STEP 2: AI 루틴 분석 결과 화면
function renderWorkoutStep2() {
  var partNames = { push: 'PUSH', pull: 'PULL', legs: 'LEGS', upper: 'UPPER', free: 'FREE' };
  var partKor = { push: '가슴 · 어깨 · 삼두', pull: '등 · 이두', legs: '하체 · 코어', upper: '가슴 · 등 · 어깨 · 팔', free: '자유 구성' };
  var part = state.selectedBodyPart;
  var routine = state.generatedRoutine;
  
  // 헤더 (공통)
  var headerHtml = 
    '<div class="px-5 pt-12 pb-3">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<button onclick="backToStep1()" class="text-xs font-mono accent">← 뒤로</button>' +
        '<p class="text-[11px] font-mono text-stone-500" style="letter-spacing: 0.2em;">2단계 · 루틴 분석</p>' +
        '<div style="width: 40px;"></div>' +
      '</div>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      '<div class="step-indicator">' +
        '<div class="step-dot completed"></div>' +
        '<div class="step-line active"></div>' +
        '<div class="step-dot active"></div>' +
        '<div class="step-line"></div>' +
        '<div class="step-dot"></div>' +
      '</div>';
  
  // 로딩 화면
  if (state.routineLoading) {
    return headerHtml +
      '<div class="routine-loading-card">' +
        '<div class="loading-spinner"></div>' +
        '<p class="font-bebas text-3xl mb-1" style="color: var(--accent);">' + partNames[part] + '</p>' +
        '<p class="text-xs text-stone-400 mb-1">' + partKor[part] + '</p>' +
        '<p class="text-sm text-stone-300 mt-4">AI가 맞춤 루틴 분석 중...</p>' +
      '</div>' +
      '</div>';
  }
  
  // 에러 화면
  if (!routine || routine.error) {
    return headerHtml +
      '<div class="card-warning text-center" style="padding: 40px 20px;">' +
        '<p class="font-bebas text-2xl mb-2" style="color: var(--warn);">루틴 생성 실패</p>' +
        '<p class="text-sm text-stone-400 mb-4">' + escapeHtml(routine ? routine.error : '알 수 없는 오류') + '</p>' +
        '<button class="routine-btn-modify" onclick="regenerateRoutine()">다시 시도</button>' +
      '</div>' +
      '</div>';
  }
  
  // 강도 표시 — 이모지 신호등 대신 말로. 색은 "지금 눌러야 할 것"에만 쓴다.
  var intensityLabel = {
    light: '가볍게',
    moderate: '적당히',
    challenging: '도전'
  }[routine.intensity] || '적당히';

  // ── 처방 표: 머리글(무게/반복/세트/RIR/휴식)은 목록 맨 위에 한 번만 두고,
  //    값은 **종목마다 전부** 적는다. 카드마다 라벨을 붙이면 6종목 × 4라벨 = 24개라 값보다
  //    라벨이 많아지지만, 값까지 접어(공통값을 머리글로 올려) 버리면 "이 종목이 몇 세트인지"를
  //    종목 줄에서 못 읽는다 — 그건 표가 아니라 요약이다. 라벨만 접고 값은 접지 않는다.
  var exList = routine.exercises || [];
  // 표에 적는 값은 전부 **[시작]을 누르면 실제로 만들어질 세트**에서 온다(getRoutinePreviewPlan).
  // AI가 준 원본(ex.weight/ex.rir/ex.rest)을 그대로 적으면 화면이 거짓말을 한다 — 세션은
  // 기록 기반 추천 무게로 시작하고, RIR·휴식은 종목 클래스와 세트 역할이 정한다.
  var plans = exList.map(function(ex) { return getRoutinePreviewPlan(ex); });
  var pres = exList.map(function(ex, i) { return buildPrescriptionValues(ex, plans[i]); });
  // 열 자체는 값이 하나라도 있을 때만 만든다(전 종목 맨몸이면 '무게' 열은 —만 6줄이 된다).
  var showWeight = pres.some(function(p) { return p.weight !== null; });
  var statCell = function(v) {
    return '<p class="routine-ex-stat-value regular">' +
      ((v === null || v === undefined || v === '') ? '<span class="text-stone-500">—</span>' : escapeHtml(v)) +
    '</p>';
  };
  // 열 폭은 그 열이 담는 값에 맞춘다 — 세트·RIR은 한 자리, 휴식은 '1.5-2분'까지 온다.
  // 다섯 열을 똑같이 나누면 좁은 폰(360px)에서 휴식·반복이 두 줄로 접힌다.
  var cols = [];
  if (showWeight) cols.push({ label: '무게', w: 1.2 });
  cols.push({ label: '반복', w: 1.2 });
  cols.push({ label: '세트', w: 0.6 });
  cols.push({ label: 'RIR', w: 0.7 });
  cols.push({ label: '휴식', w: 1.4 });
  var colStyle = ' style="grid-template-columns: ' +
    cols.map(function(c) { return 'minmax(0, ' + c.w + 'fr)'; }).join(' ') + ';"';
  var prescriptionHead =
    '<div class="routine-ex-prescription-head"' + colStyle + '>' +
      cols.map(function(c) { return '<p>' + c.label + '</p>'; }).join('') +
    '</div>';

  // 종목 카드 렌더
  var exercisesHtml = '';
  exList.forEach(function(ex, idx) {
    var cardCls = ex.isMain ? 'routine-exercise main' : 'routine-exercise';
    var numCls = ex.isMain ? 'routine-ex-num main' : 'routine-ex-num';
    var typeTag = ex.isMain ? '<span class="routine-ex-tag">메인</span>' : '';
    // 세트 구성(탑세트+백오프 등)도 같은 세트 배열에서 센다 — 여기서 다시 정하지 않는다.
    var p = pres[idx];
    var structure = plans[idx] ? describeSetStructure(plans[idx].sets, ex.name) : '';

    exercisesHtml += 
      '<div class="' + cardCls + '">' +
        '<div class="routine-ex-header">' +
          '<div class="flex items-start gap-3 flex-1">' +
            '<div class="' + numCls + '">' + (idx + 1) + '</div>' +
            '<div class="flex-1">' +
              '<p class="routine-ex-name">' + escapeHtml(ex.name) + typeTag + '</p>' +
              '<p class="routine-ex-type">' + escapeHtml(ex.type) + (ex.note ? ' · ' + escapeHtml(ex.note) : '') + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="routine-ex-prescription"' + colStyle + '>' +
          (showWeight
            ? '<p class="routine-ex-stat-value">' +
                (p.weight !== null
                  ? (isReverseProgression(ex.name) ? '<span class="text-[11px] text-stone-500">보조 </span>' : '') +
                    escapeHtml(p.weight) + '<span class="text-[11px] text-stone-500">kg</span>'
                  : '<span class="text-stone-500">—</span>') +
              '</p>'
            : '') +
          statCell(p.reps) +
          statCell(p.sets) +
          statCell(p.rir) +
          statCell(p.rest) +
        '</div>' +
        // 세트 열의 숫자가 어떻게 나뉘는지 (스트레이트면 적지 않는다 — 세트 열이 이미 말한 사실)
        (structure ? '<p class="routine-ex-scheme">' + escapeHtml(structure) + '</p>' : '') +
      '</div>';
  });
  
  return headerHtml +
    
    // 분석 헤더 카드
    '<div class="routine-analysis-card">' +
      '<div class="flex items-center justify-between mb-2 relative">' +
        '<div class="flex items-center gap-2">' +
          // 폴백(기본 루틴)에까지 "AI 분석 완료"를 붙이면 배지와 본문이 서로 반대말을 한다.
          (routine.isFallback
            ? '<span class="ai-badge" style="color: var(--text-muted); background: rgba(var(--muted-rgb), 0.12); border-color: rgba(var(--muted-rgb), 0.3);">기본 루틴</span>'
            : '<span class="ai-badge">' + icon('star', 12) + 'AI 분석 완료</span>') +
        '</div>' +
        '<button onclick="regenerateRoutine()" style="color: var(--accent); opacity: 0.6;" title="다시 분석">' + icon('refresh', 14) + '</button>' +
      '</div>' +
      '<p class="font-bebas text-4xl mb-1 relative" style="color: var(--accent);">' + partNames[part] + '</p>' +
      '<p class="text-sm text-stone-300 leading-relaxed relative">' + escapeHtml(routine.headline) + '</p>' +
      
      '<div class="routine-meta-grid">' +
        '<div class="routine-meta-item">' +
          '<p class="routine-meta-num">' + routine.exercises.length + '</p>' +
          '<p class="routine-meta-label">종목</p>' +
        '</div>' +
        '<div class="routine-meta-item">' +
          '<p class="routine-meta-num">' + escapeHtml(routine.totalSets) + '</p>' +
          '<p class="routine-meta-label">세트</p>' +
        '</div>' +
        '<div class="routine-meta-item">' +
          '<p class="routine-meta-num">' + escapeHtml(routine.duration) + '<span class="text-xs text-stone-500">분</span></p>' +
          '<p class="routine-meta-label">예상</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    
    // AI 이유 / 주의사항
    (routine.reason ? 
      '<div class="routine-insight">' +
        '<p class="routine-insight-label accent">왜 이렇게 구성했나</p>' +
        '<p class="text-sm text-stone-200 leading-relaxed">' + escapeHtml(routine.reason) + '</p>' +
      '</div>' : '') +
    
    (routine.caution ? 
      '<div class="routine-insight warning">' +
        '<p class="routine-insight-label" style="color: var(--warn);">주의사항</p>' +
        '<p class="text-sm text-stone-200 leading-relaxed">' + escapeHtml(routine.caution) + '</p>' +
      '</div>' : '') +
    
    // 강도 + 종목 헤더
    '<div class="flex items-center justify-between mt-5 mb-1 px-1">' +
      '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">추천 루틴</p>' +
      '<p class="text-[11px] font-mono text-stone-400">강도 ' + intensityLabel + '</p>' +
    '</div>' +
    prescriptionHead +

    // 종목 리스트
    exercisesHtml +

    // 액션 버튼 (수정/시작)
    '<div class="routine-actions">' +
      '<button class="routine-btn-modify" onclick="goToStep3()">' +
        icon('msg', 16) + ' 수정하기' +
      '</button>' +
      '<button class="routine-btn-start" onclick="startGeneratedRoutine()">' +
        icon('play', 16) + ' 시작' +
      '</button>' +
    '</div>' +
    
    '</div>';
}

// ═══════════════════════════════════════════════
// 기록 항목 상세 시트 (삭제 기능)
// ═══════════════════════════════════════════════

// 상세 시트 열기
window.openItemDetail = function(type, identifier) {
  var data = null;
  var idStr = String(identifier);
  
  if (type === 'workout') {
    data = state.data.workoutLog.find(function(w) { 
      return String(w.startTime) === idStr || String(w.id) === idStr; 
    });
  } else if (type === 'body') {
    data = (state.data.bodyLog || []).find(function(b) { return String(b.date) === idStr; });
  }
  
  if (!data) {
    alert('항목을 찾을 수 없어요 (id: ' + idStr + ')');
    return;
  }
  
  state.itemDetailSheet = { type: type, data: data };
  render();
};

// 6-C② 핵심 시트 닫기 슬라이드: 살아있는 시트 DOM에 closing 클래스를 직접 달아 애니메이션 재생 후 실제 닫기 실행
// (full re-render 구조라 exit 애니가 어려운데, 닫기 직전 잠깐 지연시켜 슬라이드를 보여줌)
function animateSheetCloseThen(closeFn) {
  var sheet = (typeof document !== 'undefined' && document.querySelector) ? document.querySelector('.sheet, .manual-input-sheet') : null;
  if (!sheet || !sheet.classList || !sheet.classList.add) { closeFn(); return; }
  var overlay = document.querySelector('.sheet-overlay, .manual-input-overlay');
  sheet.classList.add('closing');
  if (overlay && overlay.classList && overlay.classList.add) overlay.classList.add('closing');
  setTimeout(closeFn, 240);
}

window.closeItemDetail = function() {
  animateSheetCloseThen(function() {
    state.itemDetailSheet = null;
    state.itemDeleteConfirming = false;
    render();
  });
};

// 1단계: 삭제 의도 확인 (버튼이 "정말 삭제?"로 변함)
window.deleteItem = function() {
  if (!state.itemDetailSheet) return;
  state.itemDeleteConfirming = true;
  render();
};

// 1단계 취소
window.cancelDeleteConfirm = function() {
  state.itemDeleteConfirming = false;
  render();
};

// 2단계: 실제 삭제
window.executeDelete = function() {
  var sheet = state.itemDetailSheet;
  if (!sheet) return;
  
  var type = sheet.type;
  var data = sheet.data;
  var beforeCount = 0;
  var afterCount = 0;
  
  if (type === 'workout') {
    beforeCount = state.data.workoutLog.length;
    console.log('[executeDelete] 대상 운동:', JSON.stringify({id: data.id, startTime: data.startTime, date: data.date}));
    state.data.workoutLog = state.data.workoutLog.filter(function(w) {
      // id 매칭 (가장 정확)
      if (data.id !== undefined && w.id !== undefined && String(w.id) === String(data.id)) return false;
      // startTime 매칭 (id 없을 때)
      if (data.startTime !== undefined && w.startTime !== undefined && String(w.startTime) === String(data.startTime)) return false;
      return true;
    });
    afterCount = state.data.workoutLog.length;
    storage.set(KEYS.WORKOUT_LOG, state.data.workoutLog);
    console.log('[삭제] 운동 ' + beforeCount + ' → ' + afterCount);
  } else if (type === 'body') {
    beforeCount = (state.data.bodyLog || []).length;
    state.data.bodyLog = (state.data.bodyLog || []).filter(function(b) {
      return b.date !== data.date;
    });
    afterCount = state.data.bodyLog.length;
    storage.set(KEYS.BODY_LOG, state.data.bodyLog);
    console.log('[삭제] 체중 ' + beforeCount + ' → ' + afterCount);
  }
  
  state.itemDetailSheet = null;
  state.itemDeleteConfirming = false;
  render();
  
  // 토스트 알림
  var deletedCount = beforeCount - afterCount;
  if (deletedCount > 0) {
    showToast('삭제 완료');
  } else {
    showToast('삭제 실패 — 항목을 찾지 못했어요', true);
  }
};

// 상세 시트 렌더링
function renderItemDetailSheet() {
  var sheet = state.itemDetailSheet;
  if (!sheet) return '';
  
  var type = sheet.type;
  var data = sheet.data;
  
  var headerLabel = '';
  var bodyHtml = '';
  
  if (type === 'workout') {
    headerLabel = '운동 기록';
    var exCount = (data.exercises && data.exercises.length) || data.exerciseCount || 0;
    var totalSets = data.sets || 0;
    var dateObj = new Date(data.date);
    var dateStr = escapeHtml(data.date) + ' (' + ['일','월','화','수','목','금','토'][dateObj.getDay()] + ')';
    var sessionLabel = escapeHtml(data.sessionKr || data.sessionName || data.sessionType || data.session || 'WORKOUT');
    
    var exercisesList = '';
    if (data.exercises && Array.isArray(data.exercises) && data.exercises.length > 0) {
      exercisesList = data.exercises.map(function(ex, idx) {
        var exName = ex.name || ex.exerciseName || '종목 ' + (idx + 1);
        var setSummary = '';
        if (ex.sets && ex.sets.length > 0) {
          // 드롭·마이오렙 제외 — 안 빼면 요약이 가장 가벼운 드롭 무게로 뜨고 세트 수도 부풀려진다
          var completedSets = ex.sets.filter(function(s) {
            return s.completed && !s.isWarmup && s.role !== 'drop' && s.role !== 'myo';
          });
          if (completedSets.length > 0) {
            var lastSet = completedSets[completedSets.length - 1];
            var wPre = isReverseProgression(exName) ? '보조 ' : '';
            setSummary = (lastSet.weight ? wPre + escapeHtml(lastSet.weight) + 'kg × ' : '') + escapeHtml(lastSet.reps) + ' · ' + completedSets.length + '세트';
          }
        } else if (ex.weight) {
          setSummary = (isReverseProgression(exName) ? '보조 ' : '') + escapeHtml(ex.weight) + 'kg × ' + escapeHtml(ex.reps || '?') + ' · ' + escapeHtml(ex.completedSets || ex.setsCount || '?') + '세트';
        }
        return '<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-3); font-size: 12px;">' +
          '<span><strong>' + (idx + 1) + '.</strong> ' + escapeHtml(exName) + '</span>' +
          '<span class="font-mono text-stone-400">' + setSummary + '</span>' +
        '</div>';
      }).join('');
    }
    
    bodyHtml = 
      '<div class="text-center mb-5">' +
        '<p class="font-bebas text-4xl mb-1" style="color: var(--accent);">' + sessionLabel + '</p>' +
        '<p class="text-xs font-mono text-stone-400">' + dateStr + '</p>' +
      '</div>' +
      
      '<div class="grid grid-cols-3 gap-2 mb-4">' +
        '<div class="stat-sheet-card">' +
          '<p class="stat-sheet-label">시간</p>' +
          '<p class="stat-sheet-value">' + (data.duration || 0) + '<span class="stat-sheet-unit">분</span></p>' +
        '</div>' +
        '<div class="stat-sheet-card">' +
          '<p class="stat-sheet-label">종목</p>' +
          '<p class="stat-sheet-value">' + exCount + '</p>' +
        '</div>' +
        '<div class="stat-sheet-card">' +
          '<p class="stat-sheet-label">세트</p>' +
          '<p class="stat-sheet-value">' + totalSets + '</p>' +
        '</div>' +
      '</div>' +
      
      (exercisesList ? 
        '<div class="card mb-4" style="padding: 14px;">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-2">종목 기록</p>' +
          exercisesList +
        '</div>' : '');
        
  } else if (type === 'body') {
    headerLabel = '체중 기록';
    bodyHtml = 
      '<div class="text-center mb-5">' +
        '<p class="font-bebas text-5xl mb-1" style="color: var(--accent);">' + escapeHtml(data.weight) + '<span class="text-lg text-stone-400">kg</span></p>' +
        '<p class="text-xs font-mono text-stone-400">' + escapeHtml(data.date) + '</p>' +
      '</div>';
  }
  
  return '' +
    '<div class="sheet-overlay" onclick="closeItemDetail()">' +
      '<div class="sheet" onclick="event.stopPropagation()">' +
        '<div class="sheet-handle"></div>' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">' + headerLabel + '</p>' +
          '<button onclick="closeItemDetail()" class="text-stone-500" style="padding: 4px;">' + icon('close', 18) + '</button>' +
        '</div>' +
        
        bodyHtml +
        
        (state.itemDeleteConfirming
          ? '<div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 8px; margin-top: 12px;">' +
              '<button class="sheet-cancel-btn" onclick="cancelDeleteConfirm()">취소</button>' +
              '<button class="sheet-delete-btn-confirm" onclick="executeDelete()">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
                '</svg>' +
                '<span>정말 삭제</span>' +
              '</button>' +
            '</div>'
          : '<button class="sheet-delete-btn" onclick="deleteItem()">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
              '</svg>' +
              '<span>삭제</span>' +
            '</button>'
        ) +
        
      '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 운동 세션 시작
// ═══════════════════════════════════════════════
window.startSession = function(sessionType) {
  var sessionData = SESSIONS[sessionType];
  if (!sessionData || !sessionData.exercises || sessionData.exercises.length === 0) {
    alert('자유 운동은 아직 준비 중이에요');
    return;
  }
  
  // 세션 데이터 초기화
  var exercises = sessionData.exercises.map(function(ex) {
    // 가드레일 + 추천 일치: 템플릿 세트도 추천 카드와 같은 계산(getSessionSetPlan)으로.
    // 워밍업 구성도 클래스가 정한다 — 고중량 복합 2세트 / 중강도 복합 1세트 / 고립 이하는 없음
    // (고립은 첫 워킹세트가 자체 워밍업 역할. 60분 예산을 맞추는 전제이기도 하다)
    var plan = getSessionSetPlan(ex.name, ex.lastWeight, ex.reps || '8-10', { sets: ex.sets });
    return {
      name: ex.name,
      type: ex.type,
      targetReps: repRangeToStr(plan.repRange),
      lastWeight: (plan.prog && plan.prog.previousWeight !== undefined) ? plan.prog.previousWeight : ex.lastWeight,
      lastReps: ex.reps_done,
      sets: plan.sets,
      scheme: plan.scheme
    };
  });

  // 길항근 슈퍼세트 자동 제안 (사용자가 종목 메뉴에서 해제 가능)
  applySupersetSuggestions(exercises);

  state.activeSession = {
    sessionType: sessionType,
    sessionName: sessionData.name,
    startTime: Date.now(),
    currentExerciseIdx: 0,
    exercises: exercises
  };
  // 그날 부위 맞춤 웜업(일반 유산소 3분 + 동적 드릴)을 본운동 앞에 붙인다 — 건너뛰기 가능.
  attachWarmupToSession(state.activeSession);
  saveActiveSession();

  render();
};

// 세션 종료
window.endSession = function(fromBack) {
  // 완료한 본 세트가 있는지
  var hasCompleted = false;
  if (state.activeSession) {
    state.activeSession.exercises.forEach(function(ex) {
      ex.sets.forEach(function(s) { if (s.completed && !s.isWarmup) hasCompleted = true; });
    });
  }

  // 세션 취소(기록 저장 안 함) 공통 처리
  function cancelSession() {
    state.activeSession = null;
    state.restTimer = null;
    state.editingSet = null;
    state.setSchemeOpen = false;        // 세션 위 시트는 세션과 함께 닫는다 (남으면 다른 화면의 뒤로가기·스와이프를 먹는다)
    state.exerciseSwapOpen = false;
    state.exerciseMenuOpen = false;
    state.exercisePickerMode = 'swap';
    state.sessionChatOpen = false;      // 세트 사이 채팅은 세션과 함께 소멸
    state.sessionChatPending = null;
    state._sessionChatStreaming = false;
    invalidateSessionChat();            // 아직 도착 안 한 스트림·신호 콜백 무효화
    saveActiveSession();
    saveRestTimer();
    if (restTickerInterval) { clearInterval(restTickerInterval); restTickerInterval = null; }
    render();
  }

  if (fromBack) {
    // 폰 뒤로가기 = 완료 세트 유무와 무관하게 항상 "종료할까요?" 팝업 (앱 스타일)
    showConfirm('운동을 종료할까요?', function() {
      if (hasCompleted) finalizeSession(); else cancelSession();
    }, { confirmLabel: '종료' });
    return;
  }

  // 화면 안 종료 버튼: 완료 본세트 없으면 취소 확인, 있으면 완료 화면으로
  if (!hasCompleted) {
    showConfirm('운동을 취소할까요?\n기록이 저장되지 않아요.', cancelSession, { confirmLabel: '운동 취소', danger: true });
    return;
  }
  finalizeSession();
};

// 사이클/주차 진행: "완료 세션 수" 기준(캘린더 아님). 며칠 쉬어도 진행도(weekSessionsDone)가
// 유지되어 이어서 채울 수 있다 — 프로그램이 사용자를 기다린다(REMAKE-PLAN ③).
// 이번 주차 완료 수가 목표(workoutFreq)에 도달하면 다음 주차로, 5주차(디로드) 완료 시 새 사이클.
function advanceCycleIfWeekComplete() {
  var profile = state.profile;
  if (!profile) return;
  var goal = profile.workoutFreq || 4;
  var done = (profile.weekSessionsDone || 0) + 1; // 이번 세션 포함
  if (done < goal) {
    profile.weekSessionsDone = done; // 진행도 누적(주차 유지)
    storage.set(KEYS.PROFILE, profile);
    return;
  }
  // 목표 달성 → 다음 주차(또는 새 사이클), 진행도 리셋
  var updated = advanceCycleOnSessionComplete(profile, done);
  var newCycleStarted = updated.currentCycle > (profile.currentCycle || 1);
  profile.currentCycle = updated.currentCycle;
  profile.currentWeek = updated.currentWeek;
  profile.cyclePhase = updated.cyclePhase;
  profile.weekSessionsDone = 0;
  storage.set(KEYS.PROFILE, profile);
  if (newCycleStarted) {
    state.data.cycleHistory = state.data.cycleHistory || [];
    state.data.cycleHistory.unshift({ cycle: updated.currentCycle - 1, endedAt: getTodayStr() });
    storage.set(KEYS.CYCLE_HISTORY, state.data.cycleHistory);
    showToast('새 사이클 ' + updated.currentCycle + ' 시작!');
  } else {
    showToast(updated.currentWeek + '주차로 진행 · ' + updated.cyclePhase);
  }
}

// 세션 마무리: 통계 계산 + 저장 + 완료 화면
function finalizeSession() {
  var session = state.activeSession;
  var endTime = Date.now();
  var durationMin = Math.floor((endTime - session.startTime) / 60000);
  
  // 완료된 본 세트만 카운트
  var completedSets = 0;
  var exercisesDone = [];
  var newPRs = [];
  
  session.exercises.forEach(function(ex) {
    var doneSets = ex.sets.filter(function(s) { return s.completed && !s.isWarmup; });
    // 볼륨 카운트용 세트 수에서는 드롭·마이오렙을 뺀다. 이들은 마지막 워킹세트의 **연장**이지
    // 독립 세트가 아니다 — 그대로 세면 3세트 종목이 5세트로 잡혀 주간 볼륨 폐루프가 부풀려진다.
    // (근비대 이득도 동등할 뿐 더 크지 않다 — Sødal 2023 SMD 0.155 p=0.392)
    var countedSets = doneSets.filter(function(s) { return s.role !== 'drop' && s.role !== 'myo'; });
    if (!countedSets.length) countedSets = doneSets; // 본 세트를 지우고 드롭만 남은 예외 — 0세트로 기록하지 않는다
    // (같은 규칙의 단일 원천은 domain.js countWorkingSets — setsCount 없는 옛 로그도 그쪽에서 같게 센다)
    if (doneSets.length > 0) {
      completedSets += countedSets.length;

      // 종목별 요약
      var weights = doneSets.map(function(s) { return s.weight; });
      var reps = doneSets.map(function(s) { return s.reps; });
      var maxWeight = Math.max.apply(null, weights);

      var doneEntry = {
        name: ex.name,
        type: ex.type,
        sets: countedSets.length,        // 숫자 (기존 호환)
        setsCount: countedSets.length,   // 명시적 (새 분석 함수용)
        setsDetail: doneSets,            // 풀 세트 배열 (드롭·마이오렙 포함 — 상세 분석용)
        weights: weights,
        reps: reps,
        maxWeight: maxWeight,
        lastWeight: ex.lastWeight,
        lastReps: ex.lastReps,
        isMain: !!ex.isMain
      };
      // 세트 사이 채팅에서 확인 후 저장된 신호 (3단계) — 통증 게이트·다음 추천이 읽는다
      if (ex.painFlag) { doneEntry.painFlag = true; if (ex.painNote) doneEntry.painNote = ex.painNote; }
      if (ex.feel) doneEntry.feel = ex.feel;
      if (ex.chatRpe) doneEntry.chatRpe = ex.chatRpe;
      exercisesDone.push(doneEntry);

      // PR 감지
      // 어시스트 종목은 방향이 반대다 — **보조 무게가 줄어든 날**이 신기록이다.
      // (그대로 두면 보조를 더 받은 날이 PR로 잡히고, 진짜 진행한 날은 영원히 PR을 못 받는다.)
      if (isReverseProgression(ex.name)) {
        var minAssist = Math.min.apply(null, weights);
        if (ex.lastWeight !== null && ex.lastWeight !== undefined && minAssist < ex.lastWeight) {
          newPRs.push({
            id: 'pr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            exerciseName: ex.name,
            weight: minAssist,
            reps: reps[weights.indexOf(minAssist)],
            previousWeight: ex.lastWeight,
            reverse: true,
            date: getTodayStr()
          });
        }
      } else if (ex.lastWeight !== null && maxWeight > ex.lastWeight) {
        newPRs.push({
          id: 'pr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          exerciseName: ex.name,
          weight: maxWeight,
          reps: reps[weights.indexOf(maxWeight)],
          previousWeight: ex.lastWeight,
          date: getTodayStr()
        });
      }
      // 체중 운동 (풀업 등)
      if (ex.lastWeight === null && ex.lastReps && reps[0] > ex.lastReps) {
        newPRs.push({
          id: 'pr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          exerciseName: ex.name,
          reps: reps[0],
          previousReps: ex.lastReps,
          date: getTodayStr()
        });
      }
    }
    // 완료 세트 0개 종목·취소된 세션의 채팅 신호는 여기 안 담겨도 유실되지 않는다 —
    // 확인 시점에 recordChatSignal이 전용 저장소(CHAT_SIGNALS)에 이미 기록했다.
  });
  
  // workoutLog에 추가
  var newWorkout = {
    id: 'w_' + Date.now(),
    startTime: Date.now(),  // 식별자로 사용
    date: getTodayStr(),
    session: session.sessionType,
    sessionType: session.sessionType,
    sessionName: session.sessionName,
    sessionKr: session.sessionName,
    duration: durationMin,
    exercises: exercisesDone,  // 종목 데이터 (사용자가 상세에서 볼 것)
    exerciseCount: exercisesDone.length,
    sets: completedSets,
    completed: true
  };
  
  state.data.workoutLog.unshift(newWorkout);
  storage.set(KEYS.WORKOUT_LOG, state.data.workoutLog);
  
  // PR 추가
  if (newPRs.length > 0) {
    newPRs.forEach(function(pr) {
      state.data.personalRecords.unshift(pr);
    });
    storage.set(KEYS.PERSONAL_RECORDS, state.data.personalRecords);
    
    // 프로필 자동 갱신: 풀업/친업 PR 시 pullupRange 업데이트
    var pullupPR = newPRs.find(function(pr) {
      return (pr.exerciseName === '풀업' || pr.exerciseName === '친업') && pr.reps;
    });
    if (pullupPR && pullupPR.reps) {
      var newReps = pullupPR.reps;
      var lo = Math.max(1, newReps - 2);
      var hi = newReps + 2;
      state.profile.pullupRange = lo + '~' + hi;
      storage.set(KEYS.PROFILE, state.profile);
    }
  }

  // ── 1RM rolling max 보정 (이번 세션 종목들; 상승 즉시·하락 느리게) ──
  reconcile1RMFromLog(exercisesDone.map(function(e) { return e.name; }));

  // ── 사이클/주차 자동 진행 (그 주 목표 운동 완료 기준, 날짜로 안 넘김) ──
  advanceCycleIfWeekComplete();

  // 완료 화면용 데이터 저장
  state._celebratePending = true; // 6-C① 축하 연출은 완료 첫 진입 1회만(평점 탭 재렌더 시 반복 방지)
  state.completedSession = {
    workoutId: newWorkout.id,
    sessionName: session.sessionName,
    sessionType: session.sessionType,   // 정리 스트레칭 부위를 정하는 데 쓴다(buildStretchPlan)
    duration: durationMin,
    exerciseCount: exercisesDone.length,
    setCount: completedSets,
    exercises: exercisesDone,
    newPRs: newPRs,
    date: new Date()
  };
  
  // 세션 정리
  state.activeSession = null;
  state.restTimer = null;
  state.editingSet = null;
  state.setSchemeOpen = false;          // 세션 위 시트는 세션과 함께 닫는다
  state.exerciseSwapOpen = false;
  state.exerciseMenuOpen = false;
  state.exercisePickerMode = 'swap';
  state.sessionChatOpen = false;        // 세트 사이 채팅은 세션과 함께 소멸
  state.sessionChatPending = null;
  state._sessionChatStreaming = false;
  invalidateSessionChat();              // 아직 도착 안 한 스트림·신호 콜백 무효화
  saveActiveSession();
  saveRestTimer();
  if (restTickerInterval) { clearInterval(restTickerInterval); restTickerInterval = null; }

  render();
}

// 완료 화면 → 홈으로
window.goHome = function() {
  // 컨디션 데이터 저장
  saveCompletionCondition();
  state.completedSession = null;
  state.currentTab = 'home';
  state._navTabStack = ['home'];           // 루트 정규화 (뒤로가기 6-D)
  render();
};

// 완료 화면 → 운동 메인으로
window.goToWorkout = function() {
  saveCompletionCondition();
  state.completedSession = null;
  state.currentTab = 'workout';
  state._navTabStack = ['home', 'workout']; // 운동 탭에서 뒤로 → 홈 (뒤로가기 6-D)
  render();
};

// RPE 선택
window.setCompleteRpe = function(rpe) {
  if (state.completedSession) {
    state.completedSession.rpe = rpe;
    render();
  }
};

// 컨디션 선택
window.setCompleteCondition = function(c) {
  if (state.completedSession) {
    state.completedSession.condition = c;
    render();
  }
};

// 완료 시점 컨디션 저장
function saveCompletionCondition() {
  if (!state.completedSession) return;
  var cs = state.completedSession;
  // RPE 또는 컨디션 중 하나라도 입력했으면 저장
  if (!cs.rpe && !cs.condition) return;
  
  var entry = {
    id: 'cd_' + Date.now(),
    date: getTodayStr(),
    workoutId: cs.workoutId || null,
    sessionName: cs.sessionName,
    rpe: cs.rpe || null,           // 1~10 (Rate of Perceived Exertion)
    condition: cs.condition || null, // 1~5 (전반 컨디션)
    duration: cs.duration,
    timestamp: Date.now()
  };
  
  if (!state.data.conditionLog) state.data.conditionLog = [];
  state.data.conditionLog.unshift(entry);
  storage.set(KEYS.CONDITION_LOG, state.data.conditionLog);
}

// 세트 클릭 → 편집 시트 열기
window.openSetEditor = function(exerciseIdx, setIdx) {
  state.editingSet = { exerciseIdx: exerciseIdx, setIdx: setIdx };
  render();
};

window.closeSetEditor = function() {
  state.editingSet = null;
  render();
};

// 시트 내부 표시만 부분 업데이트 (시트 깜빡임 방지 - 전체 render 대신 사용)
function updateEditSheetDisplay() {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var ex = state.activeSession.exercises[s.exerciseIdx];
  var set = ex.sets[s.setIdx];

  var weightVal = set.weight !== null ? set.weight : 0;
  var w = document.getElementById('sheet-weight-value');
  if (w) w.textContent = weightVal;
  var wInput = document.getElementById('sheet-weight-input');
  if (wInput && wInput.style.display === 'none') wInput.value = weightVal;

  var r = document.getElementById('sheet-reps-value');
  if (r) r.textContent = set.reps;
  var rInput = document.getElementById('sheet-reps-input');
  if (rInput && rInput.style.display === 'none') rInput.value = set.reps;

  var t = document.getElementById('sheet-warmup-toggle');
  if (t) {
    if (set.isWarmup) t.classList.add('on');
    else t.classList.remove('on');
  }

  var label = document.getElementById('sheet-set-label');
  if (label) {
    var setNum = 0;
    for (var k = 0; k <= s.setIdx; k++) {
      if (!ex.sets[k].isWarmup) setNum++;
    }
    label.textContent = (set.isWarmup ? '워밍업' : '세트 ' + setNum) + ' 편집';
  }
}

// 숫자 영역 탭 → input 모드 (키패드로 직접 입력)
window.enterEditMode = function(field) {
  if (!state.editingSet) return;
  var p = document.getElementById('sheet-' + field + '-value');
  var input = document.getElementById('sheet-' + field + '-input');
  if (!p || !input) return;
  if (input.style.display !== 'none') return; // 이미 input 모드

  input.value = p.textContent;
  p.style.display = 'none';
  input.style.display = 'block';
  // iOS Safari 호환을 위해 약간 지연 후 focus/select
  setTimeout(function() {
    input.focus();
    try { input.select(); } catch (e) {}
  }, 0);
};

// input blur/Enter → 값 커밋 후 p로 복원
window.commitEdit = function(field) {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var set = state.activeSession.exercises[s.exerciseIdx].sets[s.setIdx];
  var input = document.getElementById('sheet-' + field + '-input');
  var p = document.getElementById('sheet-' + field + '-value');
  if (!input || !p) return;

  var n = parseFloat(input.value);
  if (!isNaN(n) && n >= 0) {
    if (field === 'reps') {
      set.reps = Math.floor(n);
    } else {
      // 무게는 그 종목 장비 단위로 스냅 (덤벨 2kg·그 외 5kg — .5kg 실행 불가 방지 + 오타 보정)
      set.weight = snapWeightToEquipment(n, state.activeSession.exercises[s.exerciseIdx].name);
    }
    saveActiveSession();
  }

  p.textContent = (field === 'weight' ? (set.weight !== null ? set.weight : 0) : set.reps);
  input.style.display = 'none';
  p.style.display = '';
};

// 무게/횟수 조정
window.adjustWeight = function(delta) {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var set = state.activeSession.exercises[s.exerciseIdx].sets[s.setIdx];
  set.weight = snapWeightToEquipment(Math.max(0, (set.weight || 0) + delta), state.activeSession.exercises[s.exerciseIdx].name);
  saveActiveSession();
  updateEditSheetDisplay();
};

window.adjustReps = function(delta) {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var set = state.activeSession.exercises[s.exerciseIdx].sets[s.setIdx];
  set.reps = Math.max(0, (set.reps || 0) + delta);
  saveActiveSession();
  updateEditSheetDisplay();
};

window.toggleWarmup = function() {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var set = state.activeSession.exercises[s.exerciseIdx].sets[s.setIdx];
  set.isWarmup = !set.isWarmup;
  saveActiveSession();
  updateEditSheetDisplay();
};

// 이미 완료한 세트의 완료 취소 (기록 실수 복구)
window.uncompleteSet = function() {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var exercise = state.activeSession.exercises[s.exerciseIdx];
  var set = exercise.sets[s.setIdx];
  set.completed = false;
  // 이 세트가 올려놓은 1RM 되돌리기 (다른 세트·과거 기록이 세운 값은 유지)
  if (set.is1RMUpdate) {
    recalc1RMAfterEdit(exercise.name, set.prev1RM);
  }
  set.is1RMUpdate = false;
  delete set.prev1RM;
  state.editingSet = null;
  saveActiveSession();
  render();
};

// 세트 삭제 (진행 중 세션에서 세트 줄 자체를 제거) — 앱 스타일 확인 팝업
window.deleteSet = function() {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var exercise = state.activeSession.exercises[s.exerciseIdx];
  if (exercise.sets.length <= 1) {
    showToast('마지막 세트는 삭제할 수 없어요');
    return;
  }
  showConfirm('이 세트를 삭제할까요?', function() { applyDeleteSet(s); }, { confirmLabel: '삭제', danger: true });
};

function applyDeleteSet(s) {
  var exercise = state.activeSession.exercises[s.exerciseIdx];
  var removed = exercise.sets.splice(s.setIdx, 1)[0];
  // 삭제한 세트가 올려놓은 1RM 되돌리기
  if (removed && removed.is1RMUpdate) {
    recalc1RMAfterEdit(exercise.name, removed.prev1RM);
  }
  // 휴식 타이머 정리: 삭제된 그 세트의 타이머면 종료, 뒤 세트를 가리키면 인덱스 당김
  if (state.restTimer && state.restTimer.exerciseIdx === s.exerciseIdx) {
    if (state.restTimer.setIdx === s.setIdx) {
      if (restTickerInterval) { clearInterval(restTickerInterval); restTickerInterval = null; }
      state.restTimer = null;
    } else if (state.restTimer.setIdx > s.setIdx) {
      state.restTimer.setIdx -= 1;
    }
    saveRestTimer();
  }
  state.editingSet = null;
  saveActiveSession();
  render();
};

// 세트 추가 (마지막 본 세트의 무게·횟수를 이어받음)
window.addSetToExercise = function(exerciseIdx) {
  if (!state.activeSession) return;
  var exercise = state.activeSession.exercises[exerciseIdx];
  if (!exercise) return;
  // 드롭·마이오렙은 마지막 워킹세트의 연장이라 이어받을 기준이 아니다 — 본 워킹세트에서 이어받는다.
  var working = exercise.sets.filter(function(s) {
    return !s.isWarmup && s.role !== 'drop' && s.role !== 'myo';
  });
  var lastSet = working.length ? working[working.length - 1] : exercise.sets[exercise.sets.length - 1];
  // 탑세트 뒤에 세트를 더하면 그건 백오프다 — 역할과 함께 무게도 탑의 90%로 내려간다.
  var addedRole = (lastSet && lastSet.role === 'top') ? 'backoff' : ((lastSet && lastSet.role) || 'work');
  var addedWeight = lastSet ? lastSet.weight : null;
  if (addedRole === 'backoff' && lastSet && lastSet.role === 'top') {
    addedWeight = reduceWeight(lastSet.weight, BACKOFF_PCT, exercise.name);
  }
  exercise.sets.push({
    weight: addedWeight,
    reps: lastSet ? lastSet.reps : (clampRepsToClass(exercise.name, exercise.targetReps).low),
    isWarmup: false,
    completed: false,
    role: addedRole,
    rest: getExerciseRestSec(exercise.name)
  });
  saveActiveSession();
  render();
};

// 세트 완료 → 휴식 타이머 시작 (이미 완료된 세트는 값만 저장, 타이머 재시작 안 함)
window.completeSet = function() {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var exercise = state.activeSession.exercises[s.exerciseIdx];
  var set = exercise.sets[s.setIdx];
  var wasCompleted = set.completed;
  set.completed = true;

  // 1RM 자동 갱신 (워밍업 세트 제외). 갱신 직전 값을 세트에 보관 — 완료취소/삭제 시 되돌리기용.
  // 재저장으로 또 갱신돼도 최초 기준값을 보존해야 완전한 롤백이 됨 (자기 자신이 올린 값으로 덮어쓰기 방지)
  // 드롭·마이오렙 세트는 제외 — 마지막 워킹세트의 연장이라 1RM 근거로 삼으면 로그 해석이 꼬인다
  // (docs/research/set-schemes.md §5-D)
  if (!set.isWarmup && set.role !== 'drop' && set.role !== 'myo' && set.weight && set.reps) {
    var prevRM = get1RM(exercise.name);
    var updated = update1RM(exercise.name, set.weight, set.reps);
    if (updated) {
      set.is1RMUpdate = true; // PR 표시용
      if (set.prev1RM === undefined) set.prev1RM = prevRM;
    }
  }
  
  // 이미 완료된 세트의 재저장이면 휴식 타이머·pop 없이 값만 저장하고 닫기
  if (wasCompleted) {
    state.editingSet = null;
    saveActiveSession();
    render();
    return;
  }

  // 휴식 시간 결정 — 판정 원천을 종목 클래스 하나로 통합했다(resolveRestSec).
  // 옛 로직은 키워드 배열로 복합/고립을 따로 판정해 getExerciseClass와 어긋날 수 있었고,
  // 기본값도 근거보다 짧았다(고립 90초 → 120초, 고중량 복합 150초 → 180초).
  // 세트가 지정한 rest(탑세트·백오프·드롭 사이 등) > AI 지정 rest > 클래스 기본값,
  // 그 위에 §3-C 자가조절(직전 세트가 목표 하단 미달이면 +30초, 상한 240초).
  var restDuration = resolveRestSec(exercise, set);
  var nextExerciseIdx = null;

  // 길항근 슈퍼세트: 페어의 앞 종목을 끝냈으면 짧게 쉬고 상대 종목으로 넘어간다.
  // 벽시계 시간은 줄지만 각 근육이 실제로 쉬는 시간은 오히려 늘어난다 (Zhang 2025 −37%, 근비대 동등).
  var partnerIdx = exercise.supersetWith;
  if (!set.isWarmup && typeof partnerIdx === 'number' && state.activeSession.exercises[partnerIdx]) {
    var partner = state.activeSession.exercises[partnerIdx];
    var partnerHasPending = (partner.sets || []).some(function(ps) { return !ps.completed && !ps.isWarmup; });
    var isFirstOfPair = s.exerciseIdx < partnerIdx;
    if (partnerHasPending) {
      restDuration = supersetRestSec(exercise, partner, isFirstOfPair);
      if (isFirstOfPair) nextExerciseIdx = partnerIdx;
    }
  }

  state.restTimer = {
    startTime: Date.now(),
    duration: restDuration,
    exerciseIdx: s.exerciseIdx,
    setIdx: s.setIdx,
    nextExerciseIdx: nextExerciseIdx,
    label: set.role && SET_ROLE_KR[set.role] ? SET_ROLE_KR[set.role] + ' 완료' : ''
  };
  state.editingSet = null;
  saveActiveSession();
  saveRestTimer();

  // 6-C① 세트완료 pop: 영구 저장 안 되는 임시 state에만 표시(새로고침/복원 시 잔류·무한 반복 방지)
  state._justCompletedSet = { ex: s.exerciseIdx, set: s.setIdx };
  render();
  startRestTimerTick();
  // pop은 1회만: 잠시 후 임시 플래그 해제(다음 tick 재렌더에서 반복 안 되도록)
  setTimeout(function() { state._justCompletedSet = null; }, 600);
};

// 휴식 스킵
window.skipRest = function() {
  if (restTickerInterval) { clearInterval(restTickerInterval); restTickerInterval = null; }
  state.restTimer = null;
  saveRestTimer();
  render();
};

// 휴식 +30초
window.addRestTime = function() {
  if (state.restTimer) {
    state.restTimer.duration += 30;
    saveRestTimer();
    render();
  }
};

// 휴식 타이머 tick
var restTickerInterval = null;
function startRestTimerTick() {
  if (restTickerInterval) clearInterval(restTickerInterval);
  restTickerInterval = setInterval(function() {
    if (!state.restTimer) {
      clearInterval(restTickerInterval);
      restTickerInterval = null;
      return;
    }
    var elapsed = Math.floor((Date.now() - state.restTimer.startTime) / 1000);
    if (elapsed >= state.restTimer.duration) {
      // 시간 다 됨 - 알림 (진동)
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      state.restTimer = null;
      saveRestTimer();
      clearInterval(restTickerInterval);
      restTickerInterval = null;
      // 시트(편집/종목변경/채팅)가 열려 있으면 전체 렌더 대신 타이머 UI만 제거
      // (채팅 입력·스트리밍 중 전체 렌더는 키보드/포커스/말풍선을 끊는다)
      if (state.editingSet || state.exerciseMenuOpen || state.exerciseSwapOpen || state.setSchemeOpen || state.sessionChatOpen || state.muscleMapZoom) {
        var wrapEl = document.querySelector('.rest-timer-wrap');
        if (wrapEl && wrapEl.parentNode) wrapEl.parentNode.removeChild(wrapEl);
      } else {
        render();
      }
      return;
    }
    // 시트(편집/종목변경/세트사이채팅)가 열려 있으면 시트가 깜빡이지 않도록 타이머만 부분 갱신
    // (채팅은 입력·스트리밍 중이라 전체 렌더가 매초 돌면 입력이 초기화된다)
    if (state.editingSet || state.exerciseMenuOpen || state.exerciseSwapOpen || state.setSchemeOpen || state.sessionChatOpen || state.muscleMapZoom) {
      var remaining = state.restTimer.duration - elapsed;
      var el = document.getElementById('rest-time-text');
      if (el) {
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        el.textContent = mins + ':' + String(secs).padStart(2, '0');
      }
      // 6-C② 원형 링도 부분 갱신(전체 렌더 없이) — 시트 열린 동안 링이 멈추지 않도록
      var ringEl = document.getElementById('rest-ring-fg');
      if (ringEl && ringEl.setAttribute) {
        var ringProg = state.restTimer.duration > 0 ? (remaining / state.restTimer.duration) : 0;
        ringEl.setAttribute('stroke-dashoffset', (113.1 * (1 - ringProg)).toFixed(1));
      }
      return;
    }
    render();
  }, 1000);
}

// 종목 변경 (이동)
window.goToExercise = function(idx) {
  if (state.activeSession) {
    state.muscleMapZoom = null;   // 종목이 바뀌면 열려 있던 자극 근육 확대는 닫는다
    var cur = state.activeSession.currentExerciseIdx;
    state._exSwipeDir = (idx === cur) ? null : (idx > cur ? 'next' : 'prev'); // 6-C② 들어오는 카드 방향
    state.activeSession.currentExerciseIdx = idx;
    saveActiveSession();
    render();
    state._exSwipeDir = null; // 1회만(다음 tick 재렌더에서 반복 안 되도록)
  }
};

// ═══════════════════════════════════════════════
// 종목 메뉴 (교체 · 다음에 추가 · 건너뛰기)
// ═══════════════════════════════════════════════
// 운동 중 "종목 단위"로 할 수 있는 일이 셋이 되어 헤더 ··· 버튼을 메뉴로 만들었다.
// 종목 고르기 화면(시트)은 교체·추가가 **같은 것을 공유**한다 — state.exercisePickerMode 만 다르다.

window.openExerciseMenu = function() {
  state.exerciseMenuOpen = true;
  render();
};

window.closeExerciseMenu = function() {
  state.exerciseMenuOpen = false;
  render();
};

// 운동 중 현재 종목을 다른 종목으로 교체
window.openExerciseSwap = function() {
  state.exerciseMenuOpen = false;
  state.exercisePickerMode = 'swap';
  state.exerciseSwapOpen = true;
  state._swapQuery = '';
  render();
};

// 현재 종목 **바로 다음 순서**에 새 종목 넣기 (같은 시트를 추가 모드로 연다)
window.openExerciseAdd = function() {
  state.exerciseMenuOpen = false;
  state.exercisePickerMode = 'add';
  state.exerciseSwapOpen = true;
  state._swapQuery = '';
  render();
};

window.closeExerciseSwap = function() {
  state.exerciseSwapOpen = false;
  state.exercisePickerMode = 'swap';
  state._swapQuery = '';
  render();
};

function isExerciseAddMode() {
  return state.exercisePickerMode === 'add';
}

// ═══════════════════════════════════════════════
// 세트법(세트 스킴) 변경 · 슈퍼세트 해제 · 강도기법 제안
// ═══════════════════════════════════════════════

// 건너뛴 종목을 되살린다 — 떼어 뒀던 세트를 도로 붙이고 표시를 지운다.
// 되돌리기·종목 교체·세트법 변경이 이걸 공유한다: 세트를 다시 짜는 순간 그 종목은 더 이상 "건너뜀"이 아니다.
// 반환값은 "건너뛴 상태였는가" — 호출부가 뒤처리(세트가 0개면 새로 만들기)를 판단하는 데 쓴다.
function restoreSkippedSets(ex) {
  if (!ex || !ex.skipped) return false;
  if (Array.isArray(ex.skippedSets) && ex.skippedSets.length) {
    ex.sets = (ex.sets || []).concat(ex.skippedSets);
  }
  delete ex.skippedSets;
  delete ex.skipped;
  return true;
}

// 진행 중인 종목의 **미완료 세트만** 현재 세트법 기준으로 다시 만든다 (완료한 기록은 그대로 보존).
function rebuildPendingSets(ex) {
  restoreSkippedSets(ex);   // 건너뛴 종목의 세트를 다시 짜면 건너뛰기는 자동으로 풀린다
  var doneSets = (ex.sets || []).filter(function(s) { return s.completed; });
  var pendingWorking = (ex.sets || []).filter(function(s) {
    return !s.completed && !s.isWarmup && s.role !== 'drop' && s.role !== 'myo';
  }).length;
  // pendingWorking이 0이면 본 세트를 이미 다 끝냈다는 뜻이다. 여기서 3으로 되돌리면
  // "드롭만 남은 상태에서 스트레이트로 바꾸기"가 완료 3세트 뒤에 새 3세트를 덧붙인다.
  var plan = getSessionSetPlan(ex.name, ex.lastWeight, ex.targetReps, {
    sets: pendingWorking,
    warmup: doneSets.length === 0   // 이미 시작한 종목에 워밍업을 새로 끼워 넣지 않는다
  });
  ex.targetReps = repRangeToStr(plan.repRange);
  ex.scheme = plan.scheme;
  ex.sets = doneSets.concat(plan.sets);
  return plan;
}

// 슈퍼세트 페어 연결 해제 (양쪽 모두)
function unlinkSuperset(exercises, idx) {
  if (!Array.isArray(exercises) || !exercises[idx]) return;
  var partnerIdx = exercises[idx].supersetWith;
  if (typeof partnerIdx === 'number' && exercises[partnerIdx]) {
    delete exercises[partnerIdx].supersetWith;
    delete exercises[partnerIdx].supersetKr;
  }
  delete exercises[idx].supersetWith;
  delete exercises[idx].supersetKr;
}

window.openSetSchemeSheet = function() {
  state.setSchemeOpen = true;
  state.exerciseSwapOpen = false;
  state.exerciseMenuOpen = false;
  render();
};

window.closeSetSchemeSheet = function() {
  state.setSchemeOpen = false;
  render();
};

// 사용자가 세트법을 고름 — 종목별 override로 저장되어 다음 세션에도 유지된다.
window.applySetScheme = function(schemeId) {
  var session = state.activeSession;
  if (!session) return;
  var ex = session.exercises[session.currentExerciseIdx];
  if (!ex) return;
  if (!setSetSchemeOverride(ex.name, schemeId)) {
    showToast('재활 종목은 세트법을 바꿀 수 없어요');
    return;
  }
  rebuildPendingSets(ex);
  state.setSchemeOpen = false;
  saveActiveSession();
  render();
  showToast(SET_SCHEMES[schemeId].kr + '로 바꿨어요');
};

// 슈퍼세트 제안 해제 (기구가 붐비거나 힘들 때 — 사용자 판단 존중)
window.releaseSuperset = function() {
  var session = state.activeSession;
  if (!session) return;
  unlinkSuperset(session.exercises, session.currentExerciseIdx);
  state.setSchemeOpen = false;
  saveActiveSession();
  render();
  showToast('슈퍼세트를 풀었어요 — 따로 진행해요');
};

// 드롭세트·마이오렙 제안 수락/거절 (자동 적용 금지 — 반드시 사용자가 눌러야 반영)
window.acceptTechniqueSuggestion = function(schemeId) {
  window.applySetScheme(schemeId);
};

window.dismissTechniqueSuggestion = function() {
  var session = state.activeSession;
  if (!session) return;
  if (!session.techDismissed) session.techDismissed = {};
  session.techDismissed[session.currentExerciseIdx] = true;
  saveActiveSession();
  render();
};

// 종목 후보 목록 HTML. 검색어 없음 = 같은 부위(기존 동작), 검색어 있음 = 전체 종목 검색.
// 등록 안 된 이름은 "그대로" 카드로 자유 입력 허용.
// 교체(swap)와 추가(add)가 이 목록을 공유한다 — 다른 건 버튼 문구와 눌렀을 때 부르는 함수뿐이다.
function buildSwapListHtml(query) {
  var session = state.activeSession;
  if (!session) return '';
  var exercise = session.exercises[session.currentExerciseIdx];
  if (!exercise) return '';
  var addMode = isExerciseAddMode();
  var actionFn = addMode ? 'addExerciseAfterCurrent' : 'swapCurrentExercise';
  // 줄마다 '교체 →'를 반복하면 그 글자가 목록의 배경이 된다 → 다른 목록과 같은 회색 > 아이콘 하나로.
  var actionMark = '<span style="color: var(--text-muted); flex-shrink: 0;">' + icon('chevron', 14) + '</span>';
  var curInfo = EXERCISE_BODY_PART_MAP[exercise.name] || getExercisePart(exercise.name);
  var primary = curInfo ? curInfo.primary : null;
  var compound = curInfo ? curInfo.compound : null;

  var norm = function(s) { return String(s).replace(/\s+/g, '').toLowerCase(); };
  var q = String(query || '').trim();
  var nq = norm(q);

  // 헬스장에 없는 기구 종목은 후보에서 뺀다 (아래 "그대로 추가"로는 여전히 자유 입력 가능)
  var candidates;
  if (!nq) {
    // 같은 primary 부위의 다른 종목 — compound 일치 우선 정렬 (기존 동작)
    candidates = (primary ? (EXERCISES_BY_PRIMARY[primary] || []) : [])
      .filter(function(name) { return canonicalExerciseName(name) !== canonicalExerciseName(exercise.name) && isExerciseAvailable(name); })
      .sort(function(a, b) {
        var ai = EXERCISE_BODY_PART_MAP[a].compound === compound ? 0 : 1;
        var bi = EXERCISE_BODY_PART_MAP[b].compound === compound ? 0 : 1;
        return ai - bi;
      });
  } else {
    // 전체 종목에서 검색 (공백 무시 부분일치), 같은 부위 우선.
    // 별칭 표기도 **검색 대상에는 남기고** 결과만 표준명으로 접는다 — 별칭을 검색에서 아예 빼면
    // 어순이 뒤집힌 쌍('체스트 프레스 머신' ↔ '머신 체스트 프레스')은 옛 이름으로 검색했을 때
    // 결과가 0건이 된다. 사용자의 저장된 기록에 아직 남아 있는 이름이라 반드시 찾혀야 한다.
    var seenCanon = {};
    candidates = Object.keys(EXERCISE_BODY_PART_MAP)
      .filter(function(name) { return norm(name).indexOf(nq) !== -1 && isExerciseAvailable(name); })
      .map(function(name) {
        var canon = canonicalExerciseName(name);
        return EXERCISE_BODY_PART_MAP[canon] ? canon : name; // 표준명이 종목표에 있을 때만 접는다
      })
      .filter(function(name) {
        if (name === canonicalExerciseName(exercise.name)) return false; // 자기 자신 제외
        if (seenCanon[name]) return false;                               // 별칭·표준명 중복 제거
        seenCanon[name] = true;
        return true;
      })
      .sort(function(a, b) {
        var ap = EXERCISE_BODY_PART_MAP[a].primary === primary ? 0 : 1;
        var bp = EXERCISE_BODY_PART_MAP[b].primary === primary ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.localeCompare(b, 'ko');
      });
  }

  var partKr = function(name) {
    var info = EXERCISE_BODY_PART_MAP[name];
    return (info && BODY_PART_KR[info.primary]) || '';
  };

  // 추가 모드에서는 "이미 오늘 루틴에 있는 종목"을 알려준다 (막지는 않는다 — 일부러 두 번 넣는 사람도 있다)
  var inSession = {};
  if (addMode) {
    session.exercises.forEach(function(e) {
      if (e && e.name) inSession[canonicalExerciseName(e.name)] = true;
    });
  }

  var listHtml = candidates.map(function(name) {
    var info = EXERCISE_BODY_PART_MAP[name];
    var tag = info && info.compound ? '복합' : '고립';
    var part = partKr(name);
    var prog = getProgressiveRecommendation(name, exercise.targetReps);
    var swapPre = isReverseProgression(name) ? '보조 ' : '';
    var hint = prog && prog.previousWeight !== undefined
      ? '지난 ' + swapPre + prog.previousWeight + 'kg → ' + swapPre + prog.weight + 'kg'
      : (prog ? swapPre + prog.weight + 'kg' + (swapPre ? ' (첫 시도)' : ' (1RM 추정)') : '무게 미정');
    if (addMode && inSession[canonicalExerciseName(name)]) hint = '오늘 이미 있음 · ' + hint;
    return '<button class="option-card" style="width: 100%; margin-bottom: 6px; text-align: left;" onclick="' + actionFn + '(\'' + name.replace(/'/g, "\\'") + '\')">' +
      '<div class="flex items-center justify-between gap-2">' +
        '<div>' +
          '<p class="font-display text-sm">' + name + '</p>' +
          '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + (nq && part ? part + ' · ' : '') + tag + ' · ' + hint + '</p>' +
        '</div>' +
        actionMark +
      '</div>' +
    '</button>';
  }).join('');

  // 등록 안 된 이름 → 입력한 그대로 쓰기 허용
  // XSS 방지: 사용자 입력을 onclick 문자열에 넣지 않고 전역 state에서 직접 읽는다
  if (q && !EXERCISE_BODY_PART_MAP[q]) {
    listHtml +=
      '<button class="option-card" style="width: 100%; margin-bottom: 6px; text-align: left; border-style: dashed;" onclick="' + actionFn + '(String(state._swapQuery || \'\').trim())">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div>' +
            '<p class="font-display text-sm">“' + escapeHtml(q) + '”</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">목록에 없는 종목 — 이 이름 그대로 ' + (addMode ? '추가' : '교체') + '</p>' +
          '</div>' +
          actionMark +
        '</div>' +
      '</button>';
  }

  if (!listHtml) {
    listHtml = '<p class="text-xs text-stone-500 text-center py-4">' +
      (addMode ? '넣을 만한 종목이 없어요.' : '교체 가능한 종목이 없어요.') +
      ' 검색해서 전체 종목에서 찾아보세요.</p>';
  }
  return listHtml;
}

// 검색 입력 → 목록만 부분 갱신 (전체 render 시 input 포커스가 날아가는 것 방지)
window.updateSwapSearch = function(q) {
  state._swapQuery = q;
  var el = document.getElementById('swap-list');
  if (el) el.innerHTML = buildSwapListHtml(q);
};

window.swapCurrentExercise = function(newName) {
  if (!state.activeSession) { state.exerciseSwapOpen = false; render(); return; }
  var idx = state.activeSession.currentExerciseIdx;
  var ex = state.activeSession.exercises[idx];
  if (!ex || ex.name === newName) {
    state.exerciseSwapOpen = false;
    render();
    return;
  }

  // 완료된 본 세트가 있으면 경고 (앱 스타일 확인 팝업)
  var doneCount = (ex.sets || []).filter(function(s) { return s.completed && !s.isWarmup; }).length;
  if (doneCount > 0) {
    showConfirm(
      '이미 완료한 ' + doneCount + '세트가 있어요.\n종목을 바꾸면 그 기록이 새 종목으로 옮겨갑니다.',
      function() { applyExerciseSwap(ex, newName); },
      { confirmLabel: '종목 변경' }
    );
    return;
  }
  applyExerciseSwap(ex, newName);
};

// 종목 교체 실제 적용 (확인 팝업 통과 후)
function applyExerciseSwap(ex, newName) {
  // 건너뛴 종목을 교체하면 = 되살려서 다른 종목으로 바꾸는 것. 먼저 세트를 도로 붙여야
  // 아래 "남은 워킹세트 수" 계산이 0이 되어 세트 없는 빈 종목이 되는 걸 막는다.
  restoreSkippedSets(ex);

  // 채팅 신호는 옛 종목의 것 — 새 종목에 귀속되지 않게 객체에서 제거
  // (신호 자체는 확인 시점에 recordChatSignal이 옛 이름으로 이미 저장했다)
  if (ex.painFlag || ex.feel || ex.chatRpe) {
    delete ex.painFlag; delete ex.painNote; delete ex.feel; delete ex.chatRpe;
  }
  // 확인 대기 중인 신호 칩이 이 슬롯 것이면 폐기 (엉뚱한 종목에 기록 방지)
  if (state.sessionChatPending && state.activeSession &&
      state.activeSession.exercises[state.sessionChatPending.exIdx] === ex) {
    state.sessionChatPending = null;
  }

  // 종목명/타입 갱신 (정확 매칭 없으면 fuzzy)
  var info = EXERCISE_BODY_PART_MAP[newName] || getExercisePart(newName);
  ex.name = newName;
  if (info) {
    ex.type = info.compound ? '복합' : '고립';
  }

  // 새 종목의 세트법이 다를 수 있으므로(예: 고립 → 고중량 복합 = 탑세트+백오프)
  // **완료된 세트는 그대로 두고 미완료 세트만** 새 종목 기준으로 다시 만든다.
  var doneSets = (ex.sets || []).filter(function(s) { return s.completed; });
  var pendingWorking = (ex.sets || []).filter(function(s) {
    return !s.completed && !s.isWarmup && s.role !== 'drop' && s.role !== 'myo';
  }).length;
  var plan = getSessionSetPlan(newName, null, ex.targetReps, {
    sets: pendingWorking,           // 0이면 새 워킹세트를 만들지 않는다 (완료 기록만 새 종목으로 이월)
    warmup: doneSets.length === 0   // 이미 시작한 종목에 워밍업을 새로 끼워 넣지 않는다
  });
  ex.targetReps = repRangeToStr(plan.repRange);
  ex.scheme = plan.scheme;
  ex.sets = doneSets.concat(plan.sets);
  ex.lastWeight = (plan.weight && plan.prog && plan.prog.previousWeight !== undefined) ? plan.prog.previousWeight : null;

  // 슈퍼세트 페어는 길항 관계 전제라 종목이 바뀌면 성립하지 않는다 → 양쪽 연결 해제
  unlinkSuperset(state.activeSession.exercises, state.activeSession.currentExerciseIdx);

  state.exerciseSwapOpen = false;
  saveActiveSession();
  render();

  warnExerciseSafety(newName);
}

// 부상 대조 경고 토스트 (교체·추가가 같은 규칙을 쓰도록 한 곳에 모음). 막지는 않는다 — 사용자 선택 존중.
function warnExerciseSafety(name) {
  var safety = checkExerciseSafety(name);
  if (safety.level === 'contra') {
    showToast(INJURY_AREAS[safety.area].kr + ' 부상 등록됨 — 이 종목은 금기예요' + (safety.sub ? ' (대체: ' + safety.sub + ')' : ''));
  } else if (safety.level === 'caution') {
    showToast(INJURY_AREAS[safety.area].kr + ' 주의: ' + (safety.mod || '가볍게, 통증 없는 범위로'));
  }
}

// ═══════════════════════════════════════════════
// 종목 추가 (현재 종목 바로 다음 순서에 끼워 넣기)
// ═══════════════════════════════════════════════

// 세션에 넣을 종목 객체 한 개. 무게·반복·세트 구성은 **기존 엔진 그대로** —
// startSession과 같은 getSessionSetPlan을 쓰므로 기록이 있으면 추천 무게, 없으면 1RM 추정 폴백이 붙는다.
function buildSessionExercise(name) {
  var info = EXERCISE_BODY_PART_MAP[name] || getExercisePart(name);
  // 목표 반복은 그 종목 **클래스의 권장 범위 전체**로 시작한다. 루틴 템플릿처럼 정해진 값이 없기 때문이다.
  // (빈 값을 넘기면 parseRepRange가 '8-10'으로 기본값을 잡아, 고중량 복합이 5-8이 아니라 8로 좁혀진다)
  var rules = EXERCISE_CLASS_RULES[getExerciseClass(name)];
  var plan = getSessionSetPlan(name, null, rules.repMin + '-' + rules.repMax, {});
  return {
    name: name,
    type: info ? (info.compound ? '복합' : '고립') : '고립',
    targetReps: repRangeToStr(plan.repRange),
    lastWeight: (plan.prog && plan.prog.previousWeight !== undefined) ? plan.prog.previousWeight : null,
    lastReps: null,
    sets: plan.sets,
    scheme: plan.scheme,
    addedInSession: true    // 운동 중에 끼워 넣은 종목 표시 (화면 뱃지용)
  };
}

// 종목 배열 중간에 하나를 끼워 넣으면 **저장돼 있던 종목 index가 전부 한 칸씩 밀린다.**
// 슈퍼세트 짝·제안 무시 기록·휴식 타이머·편집 중 세트·채팅 신호가 전부 index로 종목을 가리키므로
// splice 전에 여기서 같이 밀어 준다. 안 밀면 엉뚱한 종목에 기록이 붙는다.
function shiftSessionExerciseIndexes(session, insertAt) {
  var bump = function(v) { return (typeof v === 'number' && v >= insertAt) ? v + 1 : v; };

  session.exercises.forEach(function(ex) {
    if (typeof ex.supersetWith === 'number') ex.supersetWith = bump(ex.supersetWith);
  });

  if (session.techDismissed) {
    var moved = {};
    Object.keys(session.techDismissed).forEach(function(k) {
      moved[String(bump(parseInt(k, 10)))] = session.techDismissed[k];
    });
    session.techDismissed = moved;
  }

  if (state.restTimer) {
    state.restTimer.exerciseIdx = bump(state.restTimer.exerciseIdx);
    if (typeof state.restTimer.nextExerciseIdx === 'number') {
      state.restTimer.nextExerciseIdx = bump(state.restTimer.nextExerciseIdx);
    }
    saveRestTimer();
  }
  if (state.editingSet) state.editingSet.exerciseIdx = bump(state.editingSet.exerciseIdx);
  if (state.sessionChatPending) state.sessionChatPending.exIdx = bump(state.sessionChatPending.exIdx);
}

window.addExerciseAfterCurrent = function(newName) {
  var session = state.activeSession;
  if (!session) { closeExerciseSwap(); return; }
  var name = String(newName || '').trim();
  if (!name) return;

  var insertAt = session.currentExerciseIdx + 1;
  var newEx = buildSessionExercise(name);
  shiftSessionExerciseIndexes(session, insertAt);
  session.exercises.splice(insertAt, 0, newEx);

  // 새 종목은 슈퍼세트로 자동 묶지 않는다 — 세션 중에 짝을 다시 짜면 이미 진행한 종목의 짝까지 흔들린다.
  state.exerciseSwapOpen = false;
  state.exercisePickerMode = 'swap';
  state._swapQuery = '';
  saveActiveSession();
  render();

  showToast('“' + name + '” 추가 — 지금 종목 다음 차례예요');
  warnExerciseSafety(name);
};

// ═══════════════════════════════════════════════
// 종목 건너뛰기 (남은 세트만 빼고 다음 종목으로)
// ═══════════════════════════════════════════════

// 현재 위치 다음에서 아직 할 세트가 남은 종목을 찾는다. 없으면 바로 다음 종목(끝이면 그대로).
function findNextPendingExerciseIdx(session, fromIdx) {
  for (var i = fromIdx + 1; i < session.exercises.length; i++) {
    var ex = session.exercises[i];
    if (ex && !ex.skipped && (ex.sets || []).some(function(s) { return !s.completed; })) return i;
  }
  return Math.min(fromIdx + 1, session.exercises.length - 1);
}

window.skipCurrentExercise = function() {
  var session = state.activeSession;
  if (!session) return;
  var idx = session.currentExerciseIdx;
  var ex = session.exercises[idx];
  if (!ex) return;

  var pending = (ex.sets || []).filter(function(s) { return !s.completed; }).length;
  if (!pending) {
    state.exerciseMenuOpen = false;
    render();
    showToast('남은 세트가 없어요 — 이미 끝낸 종목이에요');
    return;
  }

  var doneWorking = countWorkingSets(ex.sets);
  var msg = doneWorking > 0
    ? '남은 ' + pending + '세트를 건너뛰고 다음 종목으로 갈까요?\n이미 완료한 ' + doneWorking + '세트는 그대로 기록돼요.'
    : '“' + ex.name + '”을(를) 건너뛸까요?\n한 세트도 안 했으니 기록에는 남지 않아요.';

  showConfirm(msg, function() { applySkipExercise(idx); }, { confirmLabel: '건너뛰기' });
};

// 건너뛰기 실제 적용 (확인 팝업 통과 후).
// 남은(미완료) 세트만 떼어 skippedSets에 보관한다 — 완료한 세트는 그대로 남아 기록·볼륨에 들어가고,
// 보관해 둔 세트 덕분에 "되돌리기"가 새로고침 뒤에도 된다(세션과 함께 저장되므로).
function applySkipExercise(idx) {
  var session = state.activeSession;
  if (!session) return;
  var ex = session.exercises[idx];
  if (!ex || ex.skipped) return;   // 두 번 건너뛰면 되돌리기용 보관본을 빈 배열로 덮어쓴다

  ex.skippedSets = (ex.sets || []).filter(function(s) { return !s.completed; });
  ex.sets = (ex.sets || []).filter(function(s) { return s.completed; });
  ex.skipped = true;

  // 슈퍼세트는 두 종목을 번갈아 한다는 전제라 한쪽을 건너뛰면 성립하지 않는다 → 양쪽 연결 해제
  unlinkSuperset(session.exercises, idx);

  // 건너뛴 종목으로 넘어가라고 안내하던 휴식 타이머는 그 안내만 지운다 (휴식 자체는 유지)
  if (state.restTimer && state.restTimer.nextExerciseIdx === idx) state.restTimer.nextExerciseIdx = null;
  if (state.editingSet && state.editingSet.exerciseIdx === idx) state.editingSet = null;

  state.exerciseMenuOpen = false;
  state.muscleMapZoom = null;
  session.currentExerciseIdx = findNextPendingExerciseIdx(session, idx);
  saveActiveSession();
  saveRestTimer();
  render();
  showToast('건너뛰었어요 — 그 종목으로 돌아가면 되돌릴 수 있어요');
}

// 건너뛰기 되돌리기 — 떼어 뒀던 세트를 그대로 다시 붙인다.
window.unskipExercise = function(idx) {
  var session = state.activeSession;
  if (!session) return;
  var ex = session.exercises[idx];
  if (!ex || !ex.skipped) return;

  restoreSkippedSets(ex);

  // 보관본이 없는 예외(옛 세션 등) — 남은 세트를 현재 세트법 기준으로 새로 만든다(완료분 제외한 만큼)
  if (!(ex.sets || []).some(function(s) { return !s.completed; })) {
    var done = countWorkingSets(ex.sets);
    var plan = getSessionSetPlan(ex.name, ex.lastWeight, ex.targetReps, {
      sets: Math.max(1, 3 - done),
      warmup: done === 0
    });
    ex.targetReps = repRangeToStr(plan.repRange);
    ex.scheme = plan.scheme;
    ex.sets = (ex.sets || []).filter(function(s) { return s.completed; }).concat(plan.sets);
  }

  session.currentExerciseIdx = idx;
  saveActiveSession();
  render();
  showToast('되돌렸어요 — 남은 세트가 다시 생겼어요');
};

// ═══════════════════════════════════════════════
// 운동 세션 화면 (운동 중)
// ═══════════════════════════════════════════════
function renderWorkoutSession() {
  var session = state.activeSession;
  var exercise = session.exercises[session.currentExerciseIdx];
  var totalExercises = session.exercises.length;
  
  // 전체 진행률
  var totalSets = session.exercises.reduce(function(s, ex) { return s + ex.sets.length; }, 0);
  var doneSets = session.exercises.reduce(function(s, ex) {
    return s + ex.sets.filter(function(set) { return set.completed; }).length;
  }, 0);
  // 모든 종목을 건너뛰면 남은 세트가 0이 될 수 있다 — 0으로 나눠 NaN%가 되지 않게 막는다
  var progressPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  
  // 경과 시간
  var elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  var mins = Math.floor(elapsed / 60);
  var secs = elapsed % 60;
  var elapsedStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  
  // 활성 세트 (다음 미완료 세트)
  var activeSetIdx = -1;
  for (var i = 0; i < exercise.sets.length; i++) {
    if (!exercise.sets[i].completed) {
      activeSetIdx = i;
      break;
    }
  }
  
  // 세트 행들
  var setRows = '';
  exercise.sets.forEach(function(set, idx) {
    var setClass = 'set-row';
    var labelClass = 'set-label';
    var valueClass = 'set-info-value';
    var status = '';
    
    if (set.isWarmup) {
      setClass += ' warmup';
      labelClass += ' warmup-label';
    }
    
    if (set.completed) {
      setClass += ' completed';
      labelClass += ' done';
      valueClass += ' done';
      status = '<div style="color: var(--accent);">' + icon('check', 16) + '</div>';
    } else if (idx === activeSetIdx) {
      setClass += ' active';
      labelClass += ' active-label';
      valueClass += ' active';
      status = '<span class="set-status-pill">진행중</span>';
    } else {
      valueClass += ' pending';
    }
    if (state._justCompletedSet && state._justCompletedSet.ex === session.currentExerciseIdx && state._justCompletedSet.set === idx) setClass += ' just-completed'; // 6-C① 세트완료 pop (임시 state 기반)

    var labelText = set.isWarmup ? 'W' : String(idx - (exercise.sets.findIndex(function(s) { return !s.isWarmup; }) >= 0 ? exercise.sets.findIndex(function(s) { return !s.isWarmup; }) : 0));
    // 더 단순한 라벨링: warmup은 W, 본 세트는 1, 2, 3...
    var setNum = 0;
    for (var j = 0; j <= idx; j++) {
      if (!exercise.sets[j].isWarmup) setNum++;
    }
    labelText = set.isWarmup ? 'W' : String(setNum);

    // 세트 역할 뱃지 (탑세트 / 백오프 / 드롭 / 미니). 옛 세션 복원처럼 role이 없으면 아무것도 안 그린다.
    var roleKr = set.role ? SET_ROLE_KR[set.role] : '';
    var roleBadge = roleKr && !set.isWarmup
      ? '<span class="set-role-badge set-role-' + set.role + '">' + roleKr + '</span>'
      : '';

    setRows +=
      '<div class="' + setClass + '" onclick="openSetEditor(' + session.currentExerciseIdx + ', ' + idx + ')">' +
        '<div class="' + labelClass + '">' + labelText + '</div>' +
        '<div class="set-info-grid">' +
          '<div>' +
            // 어시스트 종목은 '무게'가 아니라 '보조'다 — 라벨을 바꾸지 않으면 사용자가 정반대로 세팅한다.
            '<p class="set-info-label">' + (isReverseProgression(exercise.name) ? '보조' : '무게') + roleBadge + '</p>' +
            '<p class="' + valueClass + '">' + (set.weight !== null ? set.weight : '—') + '<span class="text-xs text-stone-500">kg</span></p>' +
          '</div>' +
          '<div>' +
            '<p class="set-info-label">횟수</p>' +
            '<p class="' + valueClass + '">' + set.reps + '<span class="text-xs text-stone-500">회</span></p>' +
          '</div>' +
        '</div>' +
        status +
      '</div>';
  });
  
  // 이전 기록
  // lastWeight·lastReps는 AI 루틴에서 그대로 넘어올 수 있다(대화 수정 경로는 무게 스냅을 거치지 않는다) → 이스케이프
  var prevText = exercise.lastWeight !== null
    ? (isReverseProgression(exercise.name) ? '보조 ' : '') + escapeHtml(exercise.lastWeight) + 'kg × ' + (parseInt(String(exercise.targetReps || '8').split('-')[0]) || 8) + ' · ' + (exercise.sets.filter(function(s) { return !s.isWarmup; }).length) + '세트'
    : (exercise.lastReps ? escapeHtml(exercise.lastReps) + '회 × ' + (exercise.sets.filter(function(s) { return !s.isWarmup; }).length) + '세트' : '첫 시도');
  
  // 휴식 타이머
  var restTimerHtml = '';
  if (state.restTimer) {
    var restElapsed = Math.floor((Date.now() - state.restTimer.startTime) / 1000);
    var restRemaining = Math.max(0, state.restTimer.duration - restElapsed);
    var restMins = Math.floor(restRemaining / 60);
    var restSecs = restRemaining % 60;
    var restStr = restMins + ':' + String(restSecs).padStart(2, '0');

    // 6-C② 원형 링: 남은 시간만큼 둘레가 차 있음 (r=18 → 둘레 ≈ 113.1, 1초 단위 갱신)
    var ringCirc = 113.1;
    var restProgress = state.restTimer.duration > 0 ? (restRemaining / state.restTimer.duration) : 0;
    var ringOffset = (ringCirc * (1 - restProgress)).toFixed(1);

    // 슈퍼세트 페어의 앞 종목을 끝냈으면 "다음 종목으로 이동"을 안내한다 (쉬지 않고 번갈아 하는 게 핵심)
    var nextSupersetName = (typeof state.restTimer.nextExerciseIdx === 'number' &&
        session.exercises[state.restTimer.nextExerciseIdx])
      ? session.exercises[state.restTimer.nextExerciseIdx].name : '';

    restTimerHtml =
      '<div class="rest-timer-wrap">' +
        '<div class="rest-timer">' +
          '<div class="flex items-center gap-3">' +
            '<div class="rest-ring-wrap">' +
              '<svg class="rest-ring" width="40" height="40" viewBox="0 0 40 40">' +
                '<circle class="rest-ring-bg" cx="20" cy="20" r="18" fill="none" stroke-width="3"/>' +
                '<circle id="rest-ring-fg" class="rest-ring-fg" cx="20" cy="20" r="18" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + ringCirc + '" stroke-dashoffset="' + ringOffset + '"/>' +
              '</svg>' +
              '<div class="rest-ring-icon">' + icon('clock', 16) + '</div>' +
            '</div>' +
            '<div>' +
              '<p class="text-[11px] font-mono text-stone-500 uppercase">' +
                (nextSupersetName ? escapeHtml(nextSupersetName) + '로 이동' : (state.restTimer.label || '휴식 중')) +
              '</p>' +
              '<p id="rest-time-text" class="font-bebas text-2xl accent">' + restStr + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex gap-2">' +
            (nextSupersetName
              ? '<button class="rest-done-btn" onclick="goToExercise(' + state.restTimer.nextExerciseIdx + ')">다음 →</button>'
              : '<button class="rest-skip-btn" onclick="addRestTime()">+30s</button>') +
            '<button class="rest-done-btn" onclick="skipRest()">완료</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  
  // 세트 편집 시트
  // 종목 고르기 시트 — 교체 모드와 추가 모드가 이 시트를 공유한다 (문구만 다름)
  var swapSheetHtml = '';
  if (state.exerciseSwapOpen) {
    var addMode = isExerciseAddMode();
    swapSheetHtml =
      '<div class="sheet-overlay" onclick="closeExerciseSwap()">' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          '<div class="flex items-center justify-between mb-3">' +
            '<div>' +
              '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">' +
                (addMode ? '종목 추가 — 지금 종목 다음에' : '종목 변경') + '</p>' +
              '<p class="font-bebas text-2xl mt-1">' + escapeHtml(exercise.name) + '</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeExerciseSwap()">' + icon('close', 18) + '</button>' +
          '</div>' +
          // 검색 규칙은 placeholder 가 이미 말한다 → 안내 문단은 두지 않는다.
          // 추가 모드에서만, 헤더가 말하지 않는 한 가지(무게·세트 자동)를 한 줄로.
          '<input id="swap-search" type="search" placeholder="종목 검색 — 없으면 그대로 추가" ' +
            'value="' + escapeHtml(state._swapQuery || '') + '" ' +
            'oninput="updateSwapSearch(this.value)" onclick="event.stopPropagation()" ' +
            'style="width:100%; padding:10px 12px; margin-bottom:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:inherit; font-size:14px; outline:none;" />' +
          (addMode ? '<p class="text-[11px] font-mono text-stone-400 mb-3">무게·세트는 기록을 보고 자동으로 정해요.</p>' : '') +
          '<div id="swap-list" style="max-height: 48vh; overflow-y: auto; padding-right: 4px;">' +
            buildSwapListHtml(state._swapQuery || '') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // 종목 메뉴 시트 (··· 버튼) — 종목 단위로 할 수 있는 일 모음
  var exerciseMenuHtml = '';
  if (state.exerciseMenuOpen) {
    var menuPending = (exercise.sets || []).filter(function(s) { return !s.completed; }).length;
    exerciseMenuHtml =
      '<div class="sheet-overlay" onclick="closeExerciseMenu()">' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          '<div class="flex items-center justify-between mb-4">' +
            '<div>' +
              '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">종목 메뉴</p>' +
              '<p class="font-bebas text-2xl mt-1">' + escapeHtml(exercise.name) + '</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeExerciseMenu()">' + icon('close', 18) + '</button>' +
          '</div>' +
          '<button class="option-card" style="width:100%; margin-bottom:6px; text-align:left;" onclick="openExerciseSwap()">' +
            '<p class="font-display text-sm">종목 교체</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">지금 종목을 다른 종목으로 바꿔요</p>' +
          '</button>' +
          '<button class="option-card" style="width:100%; margin-bottom:6px; text-align:left;" onclick="openExerciseAdd()">' +
            '<p class="font-display text-sm">종목 추가</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">새 종목을 지금 종목 <b>다음 차례</b>에 넣어요</p>' +
          '</button>' +
          (exercise.skipped
            ? '<button class="option-card" style="width:100%; text-align:left;" onclick="unskipExercise(' + session.currentExerciseIdx + ')">' +
                '<p class="font-display text-sm">건너뛰기 되돌리기</p>' +
                '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">건너뛴 세트를 다시 살려요</p>' +
              '</button>'
            : '<button class="option-card" style="width:100%; text-align:left;" onclick="skipCurrentExercise()">' +
                '<p class="font-display text-sm" style="color:var(--danger);">이 종목 건너뛰기</p>' +
                '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">남은 ' + menuPending + '세트를 빼고 다음 종목으로 가요' +
                  (countWorkingSets(exercise.sets) > 0 ? ' (완료한 세트는 그대로 기록)' : '') + '</p>' +
              '</button>') +
        '</div>' +
      '</div>';
  }

  var sheetHtml = '';
  if (state.editingSet) {
    var s = state.editingSet;
    var ex = state.activeSession.exercises[s.exerciseIdx];
    var set = ex.sets[s.setIdx];
    var setNum = 0;
    for (var k = 0; k <= s.setIdx; k++) {
      if (!ex.sets[k].isWarmup) setNum++;
    }
    var setLabel = set.isWarmup ? '워밍업' : ('세트 ' + setNum);
    
    sheetHtml = 
      '<div class="sheet-overlay" onclick="closeSetEditor()">' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          
          '<div class="flex items-center justify-between mb-5">' +
            '<div>' +
              '<p id="sheet-set-label" class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">' + setLabel + ' 편집</p>' +
              '<p class="font-bebas text-2xl mt-1">' + escapeHtml(ex.name) + '</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeSetEditor()">' + icon('close', 18) + '</button>' +
          '</div>' +

          // 워밍업 토글
          '<div class="warmup-toggle">' +
            '<p class="text-sm font-display">워밍업 세트</p>' +
            '<div id="sheet-warmup-toggle" class="toggle-switch ' + (set.isWarmup ? 'on' : '') + '" onclick="toggleWarmup()">' +
              '<div class="toggle-knob"></div>' +
            '</div>' +
          '</div>' +

          // 무게 입력
          '<div class="input-group">' +
            '<div class="input-label">' +
              // 어시스트 종목은 스택에 거는 값이 '보조 무게'다 (낮출수록 어려워진다).
              '<p>' + (isReverseProgression(ex.name) ? '보조 무게' : '무게') + '</p>' +
              '<p>' + (isReverseProgression(ex.name) ? '낮출수록 ↑난이도' : 'kg') + '</p>' +
            '</div>' +
            '<div class="number-display" onclick="enterEditMode(\'weight\')">' +
              '<p id="sheet-weight-value">' + (set.weight !== null ? set.weight : 0) + '</p>' +
              '<input id="sheet-weight-input" class="number-input" type="number" inputmode="decimal" step="' + getWeightIncrement(ex.name) + '" min="0" style="display:none;" onclick="event.stopPropagation()" onblur="commitEdit(\'weight\')" onkeydown="if(event.key===\'Enter\')this.blur()" />' +
            '</div>' +
            // 조절 버튼 = 종목 장비 단위 (덤벨 ±2/±4, 그 외 ±5/±10). 1칸 = getWeightIncrement
            // 강조(accent) 버튼은 "진행 방향" — 어시스트 종목은 보조를 **줄이는** 쪽이 증량이다.
            (function(inc, rev) {
              return '<div class="adj-grid">' +
                '<button class="adj-btn' + (rev ? ' accent-btn' : '') + '" onclick="adjustWeight(' + (-2 * inc) + ')">−' + (2 * inc) + '</button>' +
                '<button class="adj-btn" onclick="adjustWeight(' + (-inc) + ')">−' + inc + '</button>' +
                '<button class="adj-btn" onclick="adjustWeight(' + inc + ')">+' + inc + '</button>' +
                '<button class="adj-btn' + (rev ? '' : ' accent-btn') + '" onclick="adjustWeight(' + (2 * inc) + ')">+' + (2 * inc) + '</button>' +
              '</div>';
            })(getWeightIncrement(ex.name), isReverseProgression(ex.name)) +
          '</div>' +

          // 횟수 입력
          '<div class="input-group">' +
            '<div class="input-label">' +
              '<p>횟수</p>' +
              '<p>목표: ' + ex.targetReps + '</p>' +
            '</div>' +
            '<div class="number-display" onclick="enterEditMode(\'reps\')">' +
              '<p id="sheet-reps-value">' + set.reps + '</p>' +
              '<input id="sheet-reps-input" class="number-input" type="number" inputmode="numeric" step="1" min="0" style="display:none;" onclick="event.stopPropagation()" onblur="commitEdit(\'reps\')" onkeydown="if(event.key===\'Enter\')this.blur()" />' +
            '</div>' +
            '<div class="adj-grid">' +
              '<button class="adj-btn" onclick="adjustReps(-5)">−5</button>' +
              '<button class="adj-btn" onclick="adjustReps(-1)">−1</button>' +
              '<button class="adj-btn" onclick="adjustReps(1)">+1</button>' +
              '<button class="adj-btn accent-btn" onclick="adjustReps(5)">+5</button>' +
            '</div>' +
          '</div>' +
          
          '<button class="sheet-submit" onclick="completeSet()">' +
            (set.completed ? '저장' : '세트 완료 · 휴식 시작') +
          '</button>' +

          // 세트 관리: 완료 취소(완료된 세트만) / 세트 삭제
          '<div class="flex gap-2 mt-2">' +
            (set.completed
              ? '<button class="adj-btn" style="flex:1;" onclick="uncompleteSet()">완료 취소</button>'
              : '') +
            '<button class="adj-btn" style="flex:1; color: var(--danger);" onclick="deleteSet()">세트 삭제</button>' +
          '</div>' +

        '</div>' +
      '</div>';
  }
  
  // 종목 선택 도트 (상단 진행 도트)
  var exerciseDots = '';
  for (var i = 0; i < totalExercises; i++) {
    var dotEx = session.exercises[i];
    var dotDone = dotEx.sets.every(function(s) { return s.completed; });
    var dotActive = i === session.currentExerciseIdx;
    
    var dotStyle = '';
    if (dotEx.skipped) {
      // 건너뛴 종목은 "완료"와 구분되어야 한다 — 속이 빈 점으로 표시
      dotStyle = 'background: transparent; box-shadow: inset 0 0 0 2px var(--bg-3);' + (dotActive ? ' outline: 1px solid var(--text-muted);' : '');
    } else if (dotDone) {
      dotStyle = 'background: var(--accent); box-shadow: 0 0 6px var(--accent);';
    } else if (dotActive) {
      dotStyle = 'background: var(--accent); box-shadow: 0 0 8px var(--accent), inset 0 0 0 2px white;';
    } else {
      dotStyle = 'background: var(--bg-3);';
    }
    
    exerciseDots += '<div onclick="goToExercise(' + i + ')" style="width: 8px; height: 8px; border-radius: 50%; cursor: pointer;' + dotStyle + '"></div>';
    if (i < totalExercises - 1) {
      exerciseDots += '<div class="flex-1 h-px bg-stone-800"></div>';
    }
  }
  
  return '' +
    // 헤더
    '<div class="px-5 pt-12" style="padding-bottom: 20px;">' +
      '<div class="flex items-center justify-between mb-4">' +
        '<button class="session-header-btn" onclick="endSession()">' + icon('close', 18) + '</button>' +
        '<div class="text-center">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">' + escapeHtml(session.sessionName) + ' · 종목 ' + (session.currentExerciseIdx + 1) + '/' + totalExercises + '</p>' +
          '<p class="text-xs font-mono accent mt-0\\.5" style="display:flex;align-items:center;justify-content:center;gap:4px;">' + icon('clock', 12) + elapsedStr + '</p>' +
        '</div>' +
        '<div class="flex gap-2">' +
          '<button class="session-header-btn" onclick="openSessionChat()" title="세트 사이 코치">' + icon('msg', 18) + '</button>' +
          '<button class="session-header-btn" onclick="openSetSchemeSheet()" title="세트법 바꾸기" style="font-size:11px; font-weight:600;">세트법</button>' +
          '<button class="session-header-btn" onclick="openExerciseMenu()" title="종목 메뉴 (교체·추가·건너뛰기)">' + icon('dots', 18) + '</button>' +
        '</div>' +
      '</div>' +
      
      // 전체 진행률
      '<div class="session-progress mb-3"><div class="session-progress-fill" style="width: ' + progressPct + '%"></div></div>' +
      
      // 종목 도트
      '<div class="flex items-center gap-1">' + exerciseDots + '</div>' +
    '</div>' +
    
    '<div class="px-5' + (state._exSwipeDir ? ' ex-slide-' + state._exSwipeDir : '') + '" style="padding-bottom: ' + (state.restTimer ? '180px' : '120px') + ';">' +

      // 현재 종목 정보
      '<div class="exercise-info-card">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">현재 종목' +
          (exercise.addedInSession ? ' · 운동 중 추가' : '') + (exercise.skipped ? ' · 건너뜀' : '') + '</p>' +
        '<h2 class="font-bebas text-2xl mb-1">' + escapeHtml(exercise.name) + '</h2>' +
        '<p class="text-xs font-mono text-stone-400">' + escapeHtml(exercise.type) +
          ' · ' + (SET_SCHEMES[getSetScheme(exercise.name)] || SET_SCHEMES.straight).short +
          ' · 휴식 ' + getExerciseRestSec(exercise.name) + '초</p>' +
        (typeof exercise.supersetWith === 'number' && session.exercises[exercise.supersetWith]
          ? '<p class="text-[11px] font-mono mt-1" style="color: var(--accent);">슈퍼세트 ' +
              (exercise.supersetKr || '') + ' — ' + escapeHtml(session.exercises[exercise.supersetWith].name) +
              '와 번갈아 (시간 −37%, 근비대 동등)</p>'
          : '') +
      '</div>' +

      // 스트레이트 안내 · 강도기법 제안 카드
      buildSetSchemeNoticeHtml(session, exercise) +

      // 자극 근육 인체도 (앞/뒤). 매핑 없는 종목이면 빈 문자열 → 아무것도 안 그림.
      // 세션 화면에서는 접어 둔다 — 200px 을 쓰면서 알려주는 건 근육 이름 두 단어뿐이었다.
      buildMuscleMapBlock(exercise.name, { fold: true }) +

      // 이전 기록
      // 지난 기록 + 다음 추천 카드 (점진적 과부하)
      (function() {
        var prog = getProgressiveRecommendation(exercise.name, exercise.targetReps);
        // 큰 숫자는 "지금 들 무게" 하나. 추정 1RM 은 헬스장에서 맞출 수 없는 소수점을 버린다.
        var rm = get1RM(exercise.name);
        if (rm) rm = Math.round(rm);
        if (!prog && !rm) return '';

        var html = '<div class="rm-card">';

        var isReverse = isReverseProgression(exercise.name);
        // 어시스트 종목은 숫자 앞에 '보조'를 붙여야 뜻이 통한다 (40kg = 40kg만큼 도와준다).
        var unitPrefix = isReverse ? '보조 ' : '';

        // 참고 숫자(지난 기록·추정 1RM)는 카드 맨 아래 한 줄로 합친다 — 큰 숫자는 "지금 들 무게" 하나뿐.
        // prog 가 실제 수행 기록을 못 찾았을 때만 옛 표기(prevText)를 참고로 쓴다.
        var refs = [];
        if (!prog || prog.source === 'rm_estimate') refs.push('지난 기록 ' + prevText);

        if (prog && prog.source !== 'rm_estimate' && prog.previousWeight !== undefined) {
          // 실제 수행 기록이 있는 경우
          var prevRepsStr = (prog.previousReps || []).join(', ') + '회';
          var color = prog.source === 'progress' ? 'var(--success)' : 'var(--accent)';
          var label = prog.source === 'progress' ? (isReverse ? '보조 낮추기 (증량)' : '도전 권장')
            : prog.graduated ? '맨몸 졸업'
            : prog.source === 'rehab' ? '재활 — 무게 유지'
            : prog.painGated ? (isReverse ? '통증 기록 — 보조 유지' : '통증 기록 — 증량 보류')
            : (isReverse ? '동일 보조' : '동일 무게');
          refs.push('지난 기록 ' + unitPrefix + escapeHtml(prog.previousWeight) + 'kg × ' + escapeHtml(prevRepsStr));
          html +=
            '<div class="flex items-end justify-between gap-3">' +
              '<div style="flex:1; min-width:0;">' +
                '<p class="text-[11px] font-mono uppercase tracking-widest" style="color: ' + color + ';">' + label + '</p>' +
                '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + prog.note + '</p>' +
              '</div>' +
              '<p class="font-bebas text-4xl" style="color: ' + color + '; flex-shrink:0;">' +
                (isReverse ? '<span class="text-xs text-stone-400">보조 </span>' : '') +
                prog.weight + '<span class="text-xs text-stone-400">kg</span></p>' +
            '</div>';
        } else if (prog && prog.source === 'rm_estimate') {
          // 첫 시도 - 1RM 기반
          // ⚠️ 카드와 세트가 어긋나지 않게 **실제로 배정된 첫 워킹세트 무게**를 보여준다.
          // getSessionSetPlan은 rm_estimate일 때 템플릿/AI가 준 무게(fallbackWeight)를 우선하는데,
          // 여기서 prog.weight(1RM 추정값)를 그대로 찍으면 "75kg 추천" 옆 세트가 60kg으로 뜬다.
          var firstWorking = (exercise.sets || []).filter(function(s) {
            return !s.isWarmup && s.role !== 'drop' && s.role !== 'myo';
          })[0];
          var shownWeight = (firstWorking && firstWorking.weight) ? firstWorking.weight : prog.weight;
          html +=
            '<div class="flex items-end justify-between gap-3">' +
              '<div style="flex:1; min-width:0;">' +
                '<p class="text-[11px] font-mono uppercase tracking-widest accent">첫 시도 추천</p>' +
                '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + prog.note + '</p>' +
              '</div>' +
              '<p class="font-bebas text-4xl accent" style="flex-shrink:0;">' +
                (isReverse ? '<span class="text-xs text-stone-400">보조 </span>' : '') +
                shownWeight + '<span class="text-xs text-stone-400">kg</span></p>' +
            '</div>';
        }

        if (rm) {
          refs.push('추정 1RM ' + rm + 'kg');
        } else if (isReverse) {
          // 어시스트 종목의 진행 지표는 e1RM이 아니라 **보조 무게 감소 추이**다.
          // (보조로 계산한 e1RM은 강해질수록 내려가는 뒤집힌 값이라 아예 추적하지 않는다.)
          var trend = getAssistProgressTrend(exercise.name, 4);
          var netNow = assistNetLoad(exercise.name, prog ? prog.weight : null);
          var trendStr = '';
          if (trend && trend.sessions > 1) {
            trendStr = '보조 추이 ' + trend.values.slice().reverse().join(' → ') + 'kg' +
              (trend.delta > 0 ? ' (−' + trend.delta + 'kg 진행)' : '');
          } else {
            trendStr = '진행 지표 = 보조 무게가 줄어드는 것';
          }
          if (netNow !== null && netNow > 0) trendStr += ' · 실질 약 ' + netNow + 'kg';
          refs.push(escapeHtml(trendStr));
        }

        if (refs.length) {
          // refs 의 조각들은 담을 때 이미 이스케이프했다 — 여기서 또 하면 &lt; 가 &amp;lt; 로 두 번 죽는다.
          html += '<p class="text-[11px] font-mono text-stone-500 mt-3">' + refs.join(' · ') + '</p>';
        }
        html += '</div>';
        return html;
      })() +

      // 세트 목록 (건너뛴 종목이면 안내 + 되돌리기)
      '<div class="mb-3">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3 px-1">세트</p>' +
        (exercise.skipped
          ? '<div class="rm-card">' +
              '<p class="text-[11px] font-mono uppercase tracking-widest text-stone-400">건너뛴 종목</p>' +
              '<p class="text-xs text-stone-300 mt-1">남은 세트를 뺐어요. 완료한 세트가 있으면 그건 그대로 기록돼요.</p>' +
              '<button class="adj-btn accent-btn" style="width:100%; margin-top:10px;" onclick="unskipExercise(' + session.currentExerciseIdx + ')">되돌리기</button>' +
            '</div>'
          : '') +
        (setRows ? '<div style="display: flex; flex-direction: column; gap: 8px;">' + setRows + '</div>' : '') +
        (exercise.skipped
          ? ''
          : '<button class="option-card" style="width: 100%; margin-top: 8px; text-align: center;" onclick="addSetToExercise(' + session.currentExerciseIdx + ')">' +
              '<p class="text-xs font-mono text-stone-400">＋ 세트 추가</p>' +
            '</button>') +
        '<button class="option-card" style="width: 100%; margin-top: 8px; text-align: center;" onclick="openExerciseAdd()">' +
          '<p class="text-xs font-mono text-stone-400">＋ 종목 추가 (다음 차례에)</p>' +
        '</button>' +
      '</div>' +
      
      // 이전/다음 종목
      '<div class="grid grid-cols-2 gap-2 mt-4">' +
        (session.currentExerciseIdx > 0 
          ? '<button class="option-card" onclick="goToExercise(' + (session.currentExerciseIdx - 1) + ')"><p class="text-xs font-mono text-stone-400">← 이전 종목</p></button>'
          : '<div></div>') +
        (session.currentExerciseIdx < totalExercises - 1
          ? '<button class="option-card" onclick="goToExercise(' + (session.currentExerciseIdx + 1) + ')"><p class="text-xs font-mono accent">다음 종목 →</p></button>'
          : '<button class="option-card" onclick="endSession()"><p class="text-xs font-mono accent">운동 종료</p></button>') +
      '</div>' +
      
    '</div>' +
    
    restTimerHtml +
    sheetHtml +
    exerciseMenuHtml +
    swapSheetHtml +
    buildSetSchemeSheetHtml(session, exercise) +
    buildSessionChatSheetHtml(session, exercise) +
    buildMuscleMapZoomHtml();
}

// 세트법 안내 한 줄 + 드롭세트·마이오렙 제안 카드.
// 제안은 **자동 적용하지 않는다** — 근비대 이득은 동등할 뿐이고 이득은 오직 시간이므로,
// 시간 압박이 실제로 있을 때만 값어치가 있다(§4-C). 사용자가 눌러야 반영된다.
function buildSetSchemeNoticeHtml(session, exercise) {
  var html = '';
  var scheme = getSetScheme(exercise.name);

  // 어시스트 종목은 "가볍게 = 보조를 더" 라서 안내 문구를 그대로 두면 정반대로 읽힌다.
  var rev = isReverseProgression(exercise.name);

  if (scheme === 'straight') {
    html += '<p class="text-[11px] font-mono text-stone-500 px-1 mb-2">' +
      (rev
        ? '뒤 세트에서 반복이 1~2회 줄어드는 건 정상이에요. 보조를 늘리지 말고 그대로 하세요.'
        : '뒤 세트에서 반복이 1~2회 줄어드는 건 정상이에요. 무게를 낮추지 말고 그대로 하세요.') + '</p>';
  } else if (scheme === 'top_backoff') {
    html += '<p class="text-[11px] font-mono text-stone-500 px-1 mb-2">' +
      (rev
        ? '탑세트 1개를 <b>가장 낮은 보조</b>로, 백오프 2세트는 보조를 한 칸 올려 <b>같은 횟수</b>를 노려요 (볼륨 보존).'
        : '탑세트 1개를 가장 무겁게, 백오프 2세트는 90% 무게로 <b>같은 횟수</b>를 노려요 (볼륨 보존).') + '</p>';
  }

  var dismissed = session.techDismissed && session.techDismissed[session.currentExerciseIdx];
  if (!dismissed) {
    var suggested = suggestIntensityTechnique(exercise.name, session);
    if (suggested) {
      var kr = SET_SCHEMES[suggested].kr;
      html +=
        '<div class="rm-card mb-3">' +
          '<p class="text-[11px] font-mono uppercase tracking-widest accent" style="display:flex;align-items:center;gap:4px;">' + icon('clock', 12) + kr + ' 제안</p>' +
          '<p class="text-xs text-stone-300 mt-1 mb-2">남은 시간이 빠듯해요. 마지막 세트를 ' + kr +
            '으로 바꾸면 시간은 절반 이하, 근비대는 그대로예요.</p>' +
          noteBlock('왜 같은가요?',
            '근거: Sødal 2023 메타 — 드롭세트와 전통 세트의 근비대 차이 없음(p=0.392), 시간은 1/2~1/3. 대신 피로가 크니 이번 한 종목만.') +
          '<div class="flex gap-2 mt-2">' +
            '<button class="adj-btn accent-btn" style="flex:1;" onclick="acceptTechniqueSuggestion(\'' + suggested + '\')">' + kr + '으로 바꾸기</button>' +
            '<button class="adj-btn" style="flex:1;" onclick="dismissTechniqueSuggestion()">그냥 할게요</button>' +
          '</div>' +
        '</div>';
    }
  }
  return html;
}

// 세트법 바꾸기 시트
function buildSetSchemeSheetHtml(session, exercise) {
  if (!state.setSchemeOpen) return '';
  var options = getSetSchemeOptions(exercise.name);
  var cls = getExerciseClass(exercise.name);
  var clsKr = EXERCISE_CLASS_RULES[cls].kr;

  var list = options.map(function(o) {
    return '<button class="option-card" style="width:100%; margin-bottom:6px; text-align:left;' +
        (o.current ? ' border-color: var(--accent);' : '') + '" onclick="applySetScheme(\'' + o.id + '\')">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div>' +
            '<p class="font-display text-sm">' + o.kr +
              (o.suggested ? ' <span class="text-[11px] accent">· 기본</span>' : '') + '</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + o.desc + '</p>' +
            (o.warn ? '<p class="text-[11px] font-mono mt-0\\.5" style="color:var(--warn);">' + o.warn + '</p>' : '') +
          '</div>' +
          (o.current
            ? '<span class="text-xs accent" style="flex-shrink:0;">사용 중</span>'
            : '<span style="color: var(--text-muted); flex-shrink:0;">' + icon('chevron', 14) + '</span>') +
        '</div>' +
      '</button>';
  }).join('');

  var supersetRow = (typeof exercise.supersetWith === 'number' && session.exercises[exercise.supersetWith])
    ? '<button class="option-card" style="width:100%; margin-top:8px; text-align:left;" onclick="releaseSuperset()">' +
        '<p class="font-display text-sm">슈퍼세트 풀기</p>' +
        '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' +
          escapeHtml(session.exercises[exercise.supersetWith].name) + '와 번갈아 하는 구성을 해제하고 따로 진행해요</p>' +
      '</button>'
    : '';

  return '<div class="sheet-overlay" onclick="closeSetSchemeSheet()">' +
      '<div class="sheet" onclick="event.stopPropagation()">' +
        '<div class="sheet-handle"></div>' +
        '<div class="flex items-center justify-between mb-3">' +
          '<div>' +
            '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">세트법 · ' + clsKr + '</p>' +
            '<p class="font-bebas text-2xl mt-1">' + escapeHtml(exercise.name) + '</p>' +
          '</div>' +
          '<button class="session-header-btn" onclick="closeSetSchemeSheet()">' + icon('close', 18) + '</button>' +
        '</div>' +
        noteBlock('아직 안 한 세트에만 적용돼요.',
          '볼륨이 같으면 세트법 간 근비대 차이는 없어요(Angleri 2017). 종목에 맞게 자동으로 골라 두지만 바꿔도 돼요.') +
        '<div style="max-height: 48vh; overflow-y: auto; padding-right: 4px;">' + list + supersetRow + '</div>' +
      '</div>' +
    '</div>';
}

// 세트 사이 코치 시트 (운동 중 채팅 — 3단계)
function buildSessionChatSheetHtml(session, exercise) {
  if (!state.sessionChatOpen) return '';

  var msgs = (session.chat || []).map(function(m) {
    return '<div class="chat-line ' + (m.role === 'user' ? 'user' : 'coach') + '">' + renderMarkdown(m.content) + '</div>';
  }).join('');

  var streamingHtml = state._sessionChatStreaming
    ? '<div class="chat-line coach"><span id="session-chat-stream"></span><span class="chat-cursor">▌</span></div>'
    : '';

  // 추출 신호 확인 칩 (확인 후 저장)
  var pendingHtml = (state.sessionChatPending && !state._sessionChatStreaming) ? buildChatSignalChipHtml() : '';

  return '' +
    '<div class="sheet-overlay" onclick="closeSessionChat()">' +
      '<div class="sheet" onclick="event.stopPropagation()" style="display:flex; flex-direction:column; max-height:70vh;">' +
        '<div class="sheet-handle"></div>' +
        '<div class="flex items-center justify-between mb-2">' +
          '<div>' +
            '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">세트 사이 코치</p>' +
            '<p class="font-bebas text-xl mt-1">' + escapeHtml(exercise.name) + '</p>' +
          '</div>' +
          '<button class="session-header-btn" onclick="closeSessionChat()">' + icon('close', 18) + '</button>' +
        '</div>' +
        '<div id="session-chat-list" style="flex:1; overflow-y:auto; min-height:120px; padding:4px 2px;">' +
          (msgs || '<p class="text-xs font-mono text-stone-500" style="padding:12px 4px;">자세·무게·통증, 뭐든 물어보세요.</p>') +
          streamingHtml +
          pendingHtml +
        '</div>' +
        '<div class="flex gap-2 mt-3">' +
          '<input id="session-chat-input" type="text" placeholder="메시지 입력…" ' +
            (state._sessionChatStreaming ? 'disabled ' : '') +
            'value="' + escapeHtml(state._sessionChatDraft || '') + '" ' +
            'oninput="state._sessionChatDraft = this.value" ' +
            'onkeydown="if(event.key===\'Enter\')sendSessionChatMessage()" onclick="event.stopPropagation()" ' +
            'style="flex:1; padding:10px 12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:inherit; font-size:14px; outline:none;" />' +
          '<button class="rest-done-btn" onclick="sendSessionChatMessage()"' + (state._sessionChatStreaming ? ' disabled' : '') + '>전송</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// 추출 신호 확인 칩 HTML (시트 렌더와 DOM 직접 삽입 양쪽에서 사용)
function buildChatSignalChipHtml() {
  var p = state.sessionChatPending;
  var session = state.activeSession;
  if (!p || !session) return '';
  var parts = [];
  if (p.pain) parts.push('통증' + (p.painNote ? ' (' + escapeHtml(p.painNote) + ')' : ''));
  if (p.feel === 'bad') parts.push('자극 나쁨');
  if (p.feel === 'good') parts.push('자극 좋음');
  if (p.rpe) parts.push('RPE ' + p.rpe);
  var targetEx = session.exercises[p.exIdx];
  return '<div class="chat-signal-chip" id="session-chat-chip">' +
      '<p class="text-xs">' + parts.join(' · ') + ' — <b>' + escapeHtml(p.exName || (targetEx ? targetEx.name : '')) + '</b>에 기록할까요?' +
        (p.pain ? '<br/><span class="text-stone-400">통증 기록 시 이 종목 증량이 자동 중단돼요</span>' : '') + '</p>' +
      '<div class="flex gap-2 mt-2">' +
        '<button class="adj-btn accent-btn" style="flex:1;" onclick="confirmChatSignal()">기록</button>' +
        '<button class="adj-btn" style="flex:1;" onclick="dismissChatSignal()">아니오</button>' +
      '</div>' +
    '</div>';
}

// ── 세트 사이 코치: 열기/닫기/전송/신호 확인 ──
function openSessionChat() {
  if (!state.activeSession) return;
  if (!state.activeSession.chat) state.activeSession.chat = [];
  state.sessionChatOpen = true;
  render();
  scrollSessionChatToBottom();
}

function closeSessionChat() {
  state.sessionChatOpen = false;
  render();
}

// 바닥 근처일 때만 자동 스크롤 (위로 올려 읽는 중이면 방해 안 함). force=true면 무조건.
function scrollSessionChatToBottom(force) {
  var list = document.getElementById('session-chat-list');
  if (!list) return;
  var nearBottom = (list.scrollHeight - list.scrollTop - list.clientHeight) < 60;
  if (force || nearBottom) list.scrollTop = list.scrollHeight;
}

// 진행 중인 전송의 세대 토큰 — 세션 종료/새 전송 시 증가해, 늦게 도착한
// 스트림·신호 추출 콜백이 다음 세션이나 다음 전송을 오염시키지 못하게 한다.
var _sessionChatGen = 0;
function invalidateSessionChat() {
  _sessionChatGen++;
}

function sendSessionChatMessage() {
  if (state._sessionChatStreaming) return;
  var input = document.getElementById('session-chat-input');
  var text = (input && input.value || '').trim();
  if (!text) return;
  var session = state.activeSession;
  if (!session) return;
  if (!session.chat) session.chat = [];

  session.chat.push({ role: 'user', content: text });
  if (session.chat.length > 40) session.chat = session.chat.slice(-40); // 세션 내 캡
  state._sessionChatStreaming = true;
  state._sessionChatDraft = '';
  saveActiveSession();
  render();
  scrollSessionChatToBottom(true);

  var gen = ++_sessionChatGen;
  var exIdx = session.currentExerciseIdx;
  var exName = session.exercises[exIdx].name;

  // 신호 추출 (haiku, 병렬) — 결과는 확인 칩으로만, 저장은 사용자 확인 후
  extractWorkoutSignals(text, exName).then(function(sig) {
    // 세션이 바뀌었거나(종료 후 새 세션) 다른 전송으로 넘어갔으면 폐기
    if (!sig || gen !== _sessionChatGen || state.activeSession !== session) return;
    sig.exIdx = exIdx;
    sig.exName = exName;
    // 미확정 칩이 같은 종목이면 병합 (덮어쓰기로 이전 신호가 사라지지 않게)
    var prev = state.sessionChatPending;
    if (prev && prev.exIdx === exIdx && prev.exName === exName) {
      sig.pain = sig.pain || prev.pain;
      sig.painNote = sig.painNote || prev.painNote;
      sig.feel = sig.feel || prev.feel;
      sig.rpe = sig.rpe || prev.rpe;
    }
    state.sessionChatPending = sig;
    if (!state.sessionChatOpen) return;
    // 전체 렌더 대신 칩만 DOM에 삽입 — 사용자가 다음 메시지를 입력 중이어도 끊지 않는다
    if (!state._sessionChatStreaming) insertPendingChipDom();
  });

  // 코치 응답 (스트리밍)
  var apiMessages = buildChatApiMessages(session.chat);

  callSessionCoachAPI(apiMessages, function(fullText) {
    if (gen !== _sessionChatGen) return; // 옛 스트림이 새 화면을 덮어쓰지 않게
    var el = document.getElementById('session-chat-stream');
    if (el) { el.textContent = fullText; scrollSessionChatToBottom(); }
  }).then(function(result) {
    if (state.activeSession !== session) return; // 세션 종료 후 도착 → 통째로 폐기
    if (gen !== _sessionChatGen) return;         // 다른 전송으로 대체됨 → 폐기
    state._sessionChatStreaming = false;
    if (result.error) {
      session.chat.push({ role: 'assistant', content: result.error, isError: true });
    } else {
      session.chat.push({ role: 'assistant', content: result.text });
    }
    saveActiveSession();
    if (state.sessionChatOpen) { render(); scrollSessionChatToBottom(true); }
  });
}

// 대화 이력 → API 메시지 배열 (순수 함수 — 테스트 대상).
// 에러 메시지 제외 후 최근 12개로 자르고, 반드시 user로 시작하게 앞부분을 정리한다
// (Anthropic API는 첫 메시지가 assistant면 400을 반환 → 자르기가 어긋나면 채팅이 영구 먹통).
function buildChatApiMessages(chat) {
  var msgs = (chat || [])
    .filter(function(m) { return !m.isError; })
    .slice(-12)
    .map(function(m) { return { role: m.role, content: m.content }; });
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

// 확인 칩을 전체 렌더 없이 채팅 목록 끝에 삽입 (입력 포커스 보존)
function insertPendingChipDom() {
  var list = document.getElementById('session-chat-list');
  if (!list) return;
  var old = document.getElementById('session-chat-chip');
  if (old && old.parentNode) old.parentNode.removeChild(old);
  list.insertAdjacentHTML('beforeend', buildChatSignalChipHtml());
  scrollSessionChatToBottom();
}

function confirmChatSignal() {
  var sig = state.sessionChatPending;
  state.sessionChatPending = null;
  if (sig && state.activeSession) {
    var ex = state.activeSession.exercises[sig.exIdx];
    // 종목이 교체됐으면(이름 불일치) 엉뚱한 종목에 기록하지 않는다
    if (ex && sig.exName && ex.name !== sig.exName) {
      showToast('종목이 바뀌어 기록을 취소했어요 (' + sig.exName + ' → ' + ex.name + ')');
    } else if (ex && applyChatSignalToExercise(ex, sig)) {
      // 전용 저장소에 즉시 기록 — 세션 취소·0세트 종료·종목 교체에도 신호가 보존된다
      recordChatSignal(sig.exName || ex.name, sig);
      saveActiveSession();
      showToast(sig.pain ? '통증 기록됨 — 이 종목 증량을 중단해요' : '기록했어요 — 다음 추천에 반영돼요');
    }
  }
  render();
}

function dismissChatSignal() {
  state.sessionChatPending = null;
  render();
}

// ═══════════════════════════════════════════════
// 운동 완료 화면
// ═══════════════════════════════════════════════
function renderWorkoutComplete() {
  var cs = state.completedSession;
  if (!cs) return '';
  
  var dateStr = cs.date.getMonth() + 1 + '월 ' + cs.date.getDate() + '일 ' + ['일','월','화','수','목','금','토'][cs.date.getDay()] + '요일';
  
  // PR 알림
  var prAlertsHtml = '';
  if (cs.newPRs.length > 0) {
    cs.newPRs.forEach(function(pr) {
      // 어시스트 종목은 '보조 40kg → 보조 35kg (보조 −5kg)'. 옛/가져온 기록의 값이 숫자가
      // 아닐 수 있어 PR 히스토리 화면과 같은 규칙으로 escape한다.
      var prChange = escapeHtml(formatPRChange(pr));

      prAlertsHtml += 
        '<div class="card-accent mb-4">' +
          '<div class="relative flex items-center gap-3">' +
            '<div class="pr-alert-icon">' + icon('trophy', 20) + '</div>' +
            '<div class="flex-1">' +
              '<p class="text-[11px] font-mono accent uppercase tracking-widest mb-0\\.5">PR 갱신</p>' +
              '<p class="text-sm font-display font-bold">' + escapeHtml(pr.exerciseName) + '</p>' +
              '<p class="text-[11px] font-mono text-stone-400 mt-0\\.5">' + prChange + '</p>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
  }
  
  // 종목별 요약
  var exerciseSummary = '';
  var displayCount = cs.exercises.length;
  for (var i = 0; i < displayCount; i++) {
    var ex = cs.exercises[i];
    var hasPR = cs.newPRs.some(function(pr) { return pr.exerciseName === ex.name; });
    var repsStr = ex.reps.join(', ');
    // 어시스트 종목의 대표값은 최대가 아니라 **최소 보조**(가장 어려웠던 세트)다.
    var summaryWeight = (isReverseProgression(ex.name) && Array.isArray(ex.weights) && ex.weights.length)
      ? Math.min.apply(null, ex.weights) : ex.maxWeight;
    var weightStr = (summaryWeight !== null && summaryWeight !== undefined)
      ? ((isReverseProgression(ex.name) ? '보조 ' : '') + summaryWeight + 'kg') : '';
    var detail = weightStr ? (weightStr + ' × ' + repsStr) : (repsStr + '회');
    
    exerciseSummary += 
      '<div class="exercise-summary-row">' +
        '<div class="flex items-center gap-3">' +
          '<div class="ex-num" style="width: 30px; height: 30px; font-size: 10px;">' + String(i+1).padStart(2,'0') + '</div>' +
          '<div>' +
            '<p class="text-sm font-display font-bold">' + escapeHtml(ex.name) + '</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + detail + '</p>' +
          '</div>' +
        '</div>' +
        (hasPR ? '<span class="pr-tag">PR</span>' : '') +
      '</div>';
  }
  // 6-C① 축하 연출은 완료 첫 진입 1회만 (평점 탭 등 재렌더 시 컨페티/팝 반복 방지)
  var celebrate = !!state._celebratePending;
  state._celebratePending = false;

  // 축하 연출은 화면당 하나만 둔다 — 체크 아이콘 pop-in. 색종이(컨페티)는 뺐다.
  var completeIconClass = celebrate ? 'complete-icon pop-in' : 'complete-icon';
  var completeListClass = celebrate ? 'px-5 pb-32 complete-celebrate-list' : 'px-5 pb-32';

  return '' +
    // 축하 헤더 — 체크 아이콘 하나 + 한 단어
    '<div class="px-5 pt-12 pb-5 text-center">' +
      '<div class="' + completeIconClass + '">' + icon('check', 28) + '</div>' +
      '<h1 class="font-bebas text-5xl">완료</h1>' +
      '<p class="text-sm text-stone-400 mt-2">' + escapeHtml(cs.sessionName) + ' · ' + dateStr + '</p>' +
    '</div>' +
    
    '<div class="' + completeListClass + '">' +

      // 핵심 수치
      '<div class="grid grid-cols-3 gap-2 mb-4">' +
        '<div class="stat-card">' +
          '<p class="stat-card-label">시간</p>' +
          '<p class="stat-card-value">' + cs.duration + '</p>' +
          '<p class="stat-card-unit">분</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<p class="stat-card-label">종목</p>' +
          '<p class="stat-card-value">' + cs.exerciseCount + '</p>' +
          '<p class="stat-card-unit">개</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<p class="stat-card-label">세트</p>' +
          '<p class="stat-card-value">' + cs.setCount + '</p>' +
          '<p class="stat-card-unit">완료</p>' +
        '</div>' +
      '</div>' +
      
      // PR 알림
      prAlertsHtml +
      
      // 종목별 요약
      '<div class="card mb-4">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3">종목별 기록</p>' +
        '<div>' + exerciseSummary + '</div>' +
      '</div>' +
      
      // 컨디션 입력 카드
      '<div class="card mb-4">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3">오늘 컨디션</p>' +
        '<div class="condition-grid">' +
          // 운동 강도 체감 (RPE 1~10, 5칸 × 2줄)
          '<div class="condition-row">' +
            '<p class="condition-label">강도 체감</p>' +
            '<div class="condition-buttons rpe-10">' +
              (function() {
                var rpe = state.completedSession.rpe || 0;
                var html = '';
                for (var i = 1; i <= 10; i++) {
                  var sel = i === rpe ? ' selected' : '';
                  html += '<button class="cond-btn' + sel + '" onclick="setCompleteRpe(' + i + ')">' + i + '</button>';
                }
                return html;
              })() +
            '</div>' +
            '<div class="condition-ends"><span>쉬움</span><span>한계</span></div>' +
          '</div>' +
          // 전반 컨디션 (1~5)
          '<div class="condition-row">' +
            '<p class="condition-label">전반 컨디션</p>' +
            '<div class="condition-buttons">' +
              (function() {
                var c = state.completedSession.condition || 0;
                return [1,2,3,4,5].map(function(i) {
                  var sel = i === c ? ' selected' : '';
                  return '<button class="cond-btn cond-btn-wide' + sel + '" onclick="setCompleteCondition(' + i + ')">' + i + '</button>';
                }).join('');
              })() +
            '</div>' +
            '<div class="condition-ends"><span>나쁨</span><span>좋음</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 정리 스트레칭 (선택) — 본운동이 이미 끝난 자리라 건너뛰어도 세트를 잃지 않는다(§5-B).
      // 약속하는 효과는 "유연성 유지" 하나뿐이다. 근육통·부상 예방·근성장은 쓰지 않는다(§2 델파이 합의).
      '<button class="card mobility-cta" onclick="openStretchGuide()">' +
        '<div class="flex items-center justify-between">' +
          '<div style="text-align:left;">' +
            '<p class="text-sm font-display font-bold">정리 스트레칭 · 약 4분</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">오늘 쓴 부위 3~4동작 · 유연성 유지용 (선택)</p>' +
          '</div>' +
          '<p class="text-sm font-mono accent">시작</p>' +
        '</div>' +
      '</button>' +

      // 액션 버튼
      '<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 8px;">' +
        '<button class="complete-action-btn complete-primary" onclick="goHome()">홈으로</button>' +
        '<button class="complete-action-btn complete-secondary" onclick="goToWorkout()">기록 자세히 보기</button>' +
      '</div>' +
      
    '</div>';
}

// ═══════════════════════════════════════════════
// 웜업 · 스트레칭 타이머 가이드 (부위별)
// 근거: docs/research/warmup-stretching.md §6-A(화면 흐름) · §6-D(타이머 UI) · §5-C(건너뛰기)
//
// 흐름:
//   운동 시작 → renderWarmupGuide()  → (완료·건너뛰기) → renderWorkoutSession()
//   운동 완료 → renderWorkoutComplete() → (선택) renderStretchGuide()
//
// ★카디오(러닝) 화면과 코드를 공유하지 않는다 (§6-D 권고).
//   카디오는 속력·거리·RPE가 얽혀 있어 일반화하면 양쪽 다 복잡해지고, 여기엔 카디오에 없는
//   "횟수 기반 구간"(타이머 대신 사용자 탭)과 "좌/우 분할 구간"이 있다. 패턴만 베끼고 구현은 따로 둔다.
//   유일한 예외는 순수 포맷 함수 cardioFmtClock — 전역이라 그냥 부른다(§6-D "공유해도 되는 것").
//
// ★강제하지 않는다 (§5-C): 건너뛰기를 항상 노출하고, "짧게(3분) / 표준" 토글을 둔다.
//   시간이 없는 날은 일반 웜업 3분 + 램프업 세트만 해도 근거상 손해가 거의 없다.
// ═══════════════════════════════════════════════

// 런타임 핸들(직렬화 대상 아님) — 타이머·오디오·웨이크락. state 밖 모듈 변수.
var mobilityRuntime = { intervalId: null, audioCtx: null, wakeLock: null, wakeLockPending: false, lastCueSec: null };

// 지금 떠 있는 가이드를 돌려준다. { kind:'warmup'|'stretch', g:<진행상태> } | null
// render() 라우팅과 같은 우선순위(스트레칭이 위)를 쓴다.
function mobilityCurrent() {
  if (state.stretchGuide) return { kind: 'stretch', g: state.stretchGuide };
  var s = state.activeSession;
  if (s && s.warmup && !s.warmup.done) return { kind: 'warmup', g: s.warmup };
  return null;
}

// 진행상태의 구간 목록. keys 만 저장해 두고 화면에서 펼친다(저장 용량↓, 데이터 중복 없음).
function mobilitySegsOf(g) {
  return expandMobilitySegments((g && g.keys) || []);
}

// 진행상태 저장 — 웜업은 activeSession 안에 있으므로 세션과 함께 저장된다(§6-E: 백그라운드 복귀 시 유지).
// 스트레칭은 완료 화면과 같은 수명(메모리)이라 별도 저장하지 않는다 — completedSession 도 저장하지 않는다.
function mobilityPersist(kind) {
  if (kind === 'warmup') saveActiveSession();
}

// 세션 시작 시 웜업 계획을 붙인다. 기존 저장 세션에 warmup 이 없으면 웜업 화면을 띄우지 않는다(하위 호환).
function attachWarmupToSession(session) {
  if (!session) return;
  var plan = buildWarmupPlan(session.sessionType, session.exercises, { short: false });
  session.warmup = {
    keys: plan.keys,
    groups: plan.groups,
    omitted: plan.omitted,
    mode: 'standard',
    idx: 0,
    done: false,
    segEndsAt: null,
    soundOn: true
  };
}

// ── 타이머 ─────────────────────────────
// 기준 시계는 벽시계(Date.now)다. 카디오처럼 performance.now 를 쓰지 않는 이유:
// 구간이 20~180초로 짧아 드리프트가 무의미한 반면, 백그라운드 회수·새로고침 뒤에도 남는 값이어야
// 저장·복원이 한 줄로 끝나기 때문이다(segEndsAt 하나만 직렬화하면 된다).
function mobilityEnsureTicker() {
  var cur = mobilityCurrent();
  if (!cur) { mobilityStopRuntime(); return; }
  var segs = mobilitySegsOf(cur.g);
  var seg = segs[cur.g.idx];
  if (!seg) { mobilityStopRuntime(); return; }
  mobilityRequestWakeLock();
  // 횟수 구간은 사용자가 "완료"를 눌러야 넘어간다 — 셀 게 없으니 타이머를 돌리지 않는다(배터리).
  if (seg.mode !== 'time') { mobilityClearTicker(); return; }
  if (!cur.g.segEndsAt) {
    cur.g.segEndsAt = Date.now() + seg.sec * 1000;
    mobilityPersist(cur.kind);
  }
  if (mobilityRuntime.intervalId) return;
  if (typeof setInterval === 'undefined') return;
  mobilityRuntime.intervalId = setInterval(mobilityTick, 250);
}

function mobilityClearTicker() {
  if (mobilityRuntime.intervalId) { try { clearInterval(mobilityRuntime.intervalId); } catch (e) {} mobilityRuntime.intervalId = null; }
  mobilityRuntime.lastCueSec = null;
}

function mobilityStopRuntime() {
  mobilityClearTicker();
  mobilityReleaseWakeLock();
  if (mobilityRuntime.audioCtx) { try { mobilityRuntime.audioCtx.close(); } catch (e) {} mobilityRuntime.audioCtx = null; }
}

// 250ms 마다: 남은 시간을 벽시계 절대차로 다시 계산(드리프트 0) → 화면은 부분 갱신(전체 render 아님).
// 자리를 비운 사이 구간이 끝났으면 다음 구간을 처음부터 시작한다 — 안 하는 동안 시간이 흐른 걸
// "했다"고 치지 않기 위해서다.
function mobilityTick() {
  var cur = mobilityCurrent();
  if (!cur) { mobilityStopRuntime(); return; }
  var segs = mobilitySegsOf(cur.g);
  var seg = segs[cur.g.idx];
  if (!seg) { mobilityStopRuntime(); return; }
  if (seg.mode !== 'time') { mobilityPaintDynamic(seg, null); return; }
  if (!cur.g.segEndsAt) cur.g.segEndsAt = Date.now() + seg.sec * 1000;
  var remain = (cur.g.segEndsAt - Date.now()) / 1000;
  if (remain <= 0) { mobilityAdvance(true); return; }
  // 전환 3초 전 예고음(매초 1회) — 좌→우 전환처럼 "지금 바꿔야 하는" 순간을 놓치지 않게.
  var whole = Math.ceil(remain);
  if (whole <= 3 && mobilityRuntime.lastCueSec !== whole) {
    mobilityRuntime.lastCueSec = whole;
    if (cur.g.soundOn !== false) mobilityBeep('tick');
  }
  mobilityPaintDynamic(seg, remain);
}

// 동적 요소만 id 로 직접 갱신 (전체 재렌더 없이 → 깜빡임 방지)
function mobilityPaintDynamic(seg, remain) {
  if (typeof document === 'undefined' || !document.getElementById) return;
  var amountEl = document.getElementById('mob-amount');
  var fillEl = document.getElementById('mob-seg-fill');
  var cueEl = document.getElementById('mob-precue');
  if (remain === null) {
    if (cueEl) { cueEl.style.display = 'none'; cueEl.textContent = ''; }
    return;
  }
  if (amountEl) amountEl.textContent = cardioFmtClock(Math.max(0, Math.ceil(remain)));
  if (fillEl) {
    var doneRatio = seg.sec > 0 ? Math.min(1, Math.max(0, (seg.sec - remain) / seg.sec)) : 1;
    fillEl.style.width = (doneRatio * 100).toFixed(1) + '%';
  }
  if (cueEl) {
    if (remain <= 3) {
      cueEl.style.display = '';
      cueEl.textContent = Math.ceil(remain) + '초 뒤 다음 동작';
    } else { cueEl.style.display = 'none'; cueEl.textContent = ''; }
  }
}

// 한 구간 진행. auto=true 면 타이머 만료(자동), false 면 사용자가 "완료"를 누른 것.
// expectedIdx: 그 버튼이 그려질 때의 구간 번호. 타이머가 자동으로 넘긴 직후 도착한 "늦은 탭"이
//   한 구간을 더 건너뛰지 않도록, 지금 구간과 다르면 무시한다(버튼 HTML에 번호를 박아 둔다).
// wholeDrill=true 면 같은 동작(좌·우 두 구간)을 통째로 넘긴다 — "건너뛰기"는 한쪽만 빼는 게 아니다.
function mobilityAdvance(auto, expectedIdx, wholeDrill) {
  var cur = mobilityCurrent();
  if (!cur) return;
  if (expectedIdx !== undefined && expectedIdx !== null && Number(expectedIdx) !== cur.g.idx) return;
  var segs = mobilitySegsOf(cur.g);
  var curKey = segs[cur.g.idx] && segs[cur.g.idx].key;
  var nextIdx = (cur.g.idx || 0) + 1;
  if (wholeDrill && curKey) {
    while (segs[nextIdx] && segs[nextIdx].key === curKey) nextIdx++;
  }
  cur.g.idx = nextIdx;
  cur.g.segEndsAt = null;
  mobilityRuntime.lastCueSec = null;
  if (cur.g.idx >= segs.length) { mobilityFinish(cur.kind); return; }
  var next = segs[cur.g.idx];
  if (next.mode === 'time') cur.g.segEndsAt = Date.now() + next.sec * 1000;
  if (cur.g.soundOn !== false) mobilityBeep(auto ? 'next' : 'tap');
  if (typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(90); } catch (e) {} }
  mobilityPersist(cur.kind);
  render();
}

// 복원된 진행상태가 깨져 있으면(idx 가 범위 밖 · 사전에서 사라진 키) 조용히 정리한다.
// 안 하면 "가이드 없음"만 뜨고 본운동으로 나갈 버튼이 없어 사용자가 갇힌다.
// render() 맨 앞에서 부른다 — 여기서 render()를 다시 부르지 않으므로 재귀가 없다.
function mobilityRepairState() {
  var s = state.activeSession;
  if (s && s.warmup && !s.warmup.done) {
    if (!(s.warmup.idx >= 0)) s.warmup.idx = 0;
    var wsegs = expandMobilitySegments(s.warmup.keys);
    if (!wsegs.length || s.warmup.idx >= wsegs.length) {
      s.warmup.done = true;
      s.warmup.segEndsAt = null;
      saveActiveSession();
    }
  }
  var g = state.stretchGuide;
  if (g) {
    if (!(g.idx >= 0)) g.idx = 0;
    var ssegs = expandMobilitySegments(g.keys);
    if (!ssegs.length || g.idx >= ssegs.length) state.stretchGuide = null;
  }
}

// 가이드 종료 — 웜업은 본운동으로, 스트레칭은 완료 화면으로 돌아간다.
function mobilityFinish(kind) {
  mobilityStopRuntime();
  if (kind === 'warmup') {
    if (state.activeSession && state.activeSession.warmup) {
      state.activeSession.warmup.done = true;
      state.activeSession.warmup.segEndsAt = null;
      saveActiveSession();
    }
    render();
    showToast('웜업 완료 · 본운동 시작');
    return;
  }
  state.stretchGuide = null;
  render();
  showToast('정리 스트레칭 완료');
}

// ── 소리 (Web Audio, 파일 없이) ─────────────────────────────
// 카디오처럼 미리 예약하지 않고 필요한 순간에 바로 울린다 — 총 5~6분짜리 가이드라 사용자가
// 화면을 보고 있고, 예약 스케줄러까지 둘 만큼의 이득이 없다.
function mobilityBeep(kind) {
  if (typeof window === 'undefined') return;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!mobilityRuntime.audioCtx) mobilityRuntime.audioCtx = new AC();
    var ctx = mobilityRuntime.audioCtx;
    if (ctx.resume) { try { ctx.resume(); } catch (e) {} }
    var spec = kind === 'next' ? { freq: 1046, dur: 0.22, gain: 0.28, type: 'square' }
             : kind === 'tap'  ? { freq: 784,  dur: 0.10, gain: 0.18, type: 'sine' }
             :                   { freq: 660,  dur: 0.12, gain: 0.18, type: 'sine' };
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.value = spec.freq;
    g.gain.value = spec.gain;
    osc.connect(g); g.connect(ctx.destination);
    var t0 = ctx.currentTime;
    osc.start(t0);
    g.gain.setValueAtTime(spec.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.dur);
    osc.stop(t0 + spec.dur + 0.02);
  } catch (e) {}
}

// ── 화면 꺼짐 방지 (베스트에포트) ─────────────────────────────
// 30초 유지 동작 중 화면이 자면 남은 시간이 안 보인다. 실패해도 타이머는 벽시계 기준이라 문제없다.
function mobilityRequestWakeLock() {
  // render 마다 불리므로 이미 잡았거나 요청이 떠 있으면 겹쳐 부르지 않는다.
  if (mobilityRuntime.wakeLock || mobilityRuntime.wakeLockPending) return;
  if (typeof navigator === 'undefined' || !navigator.wakeLock || !navigator.wakeLock.request) return;
  try {
    mobilityRuntime.wakeLockPending = true;
    navigator.wakeLock.request('screen').then(function(lock) {
      mobilityRuntime.wakeLockPending = false;
      // 요청이 도는 사이 가이드를 나갔으면 바로 반납한다.
      if (!mobilityCurrent()) { if (lock && lock.release) { try { lock.release(); } catch (e) {} } return; }
      mobilityRuntime.wakeLock = lock;
      if (lock && lock.addEventListener) {
        lock.addEventListener('release', function() { mobilityRuntime.wakeLock = null; });
      }
    }).catch(function() { mobilityRuntime.wakeLockPending = false; });
  } catch (e) { mobilityRuntime.wakeLockPending = false; }
}
function mobilityReleaseWakeLock() {
  var lock = mobilityRuntime.wakeLock;
  mobilityRuntime.wakeLock = null;
  if (lock && lock.release) { try { lock.release(); } catch (e) {} }
}

// ── 핸들러 ─────────────────────────────

// "완료 ✓" — 횟수 구간을 사용자가 끝냈을 때, 또는 시간 구간을 먼저 끝내고 싶을 때. 한 구간만 넘어간다.
window.mobilityNext = function(expectedIdx) { mobilityAdvance(false, expectedIdx, false); };

// "건너뛰기" — 이 동작을 통째로 넘긴다(좌우로 쪼개진 동작이면 두 구간 모두).
window.mobilitySkipStep = function(expectedIdx) { mobilityAdvance(false, expectedIdx, true); };

// 가이드 전체 건너뛰기. 웜업은 본운동으로, 스트레칭은 완료 화면으로.
window.mobilitySkipAll = function() {
  var cur = mobilityCurrent();
  if (!cur) return;
  mobilityStopRuntime();
  if (cur.kind === 'warmup') {
    state.activeSession.warmup.done = true;
    state.activeSession.warmup.segEndsAt = null;
    saveActiveSession();
    render();
    return;
  }
  state.stretchGuide = null;
  render();
};

window.toggleMobilitySound = function() {
  var cur = mobilityCurrent();
  if (!cur) return;
  cur.g.soundOn = (cur.g.soundOn === false);
  mobilityPersist(cur.kind);
  render();
};

// 짧게(3분 · 일반 웜업만) / 표준(6분 · 일반 + 부위별 드릴) 토글 — §5-C 시간 압박 모드.
window.setWarmupMode = function(mode) {
  var s = state.activeSession;
  if (!s || !s.warmup || s.warmup.done) return;
  if (s.warmup.mode === mode) return;
  var before = expandMobilitySegments(s.warmup.keys)[s.warmup.idx] || null;
  var plan = buildWarmupPlan(s.sessionType, s.exercises, { short: mode === 'short' });
  var segs = expandMobilitySegments(plan.keys);
  s.warmup.mode = mode;
  s.warmup.keys = plan.keys;
  s.warmup.omitted = plan.omitted;
  // 지금 하고 있는 동작이 그대로면 카운트다운을 이어간다. 안 그러면 3분 유산소 중에 "짧게"를 눌렀을 때
  // 타이머가 3분으로 되감겨 "짧게"가 표준보다 길어지는 역전이 생긴다.
  var after = segs[s.warmup.idx] || null;
  var sameSeg = !!(before && after && before.key === after.key && before.side === after.side);
  if (!sameSeg) {
    s.warmup.segEndsAt = null;
    mobilityRuntime.lastCueSec = null;
  }
  // 짧게로 바꿨는데 이미 그 지점을 지났으면(일반 웜업을 마친 뒤) 웜업을 끝낸 것으로 본다.
  if (s.warmup.idx >= segs.length) { mobilityFinish('warmup'); return; }
  saveActiveSession();
  render();
};

// 완료 화면 → 정리 스트레칭 시작
window.openStretchGuide = function() {
  var cs = state.completedSession;
  if (!cs) return;
  var plan = buildStretchPlan(cs.sessionType || null, cs.exercises);
  state.stretchGuide = {
    keys: plan.keys,
    groups: plan.groups,
    omitted: plan.omitted,
    idx: 0,
    segEndsAt: null,
    soundOn: true
  };
  render();
};

// 스트레칭 화면 닫기(완료 화면으로 돌아감) — 기록은 그대로다.
window.closeStretchGuide = function() {
  mobilityStopRuntime();
  state.stretchGuide = null;
  render();
};

// ── 화면 ─────────────────────────────

function renderWarmupGuide() { return buildMobilityGuideHtml('warmup'); }
function renderStretchGuide() { return buildMobilityGuideHtml('stretch'); }

// 설명 한 줄 — 왼쪽에 짧은 라벨(준비/동작/기준), 오른쪽에 문장. 값이 없으면 줄 자체를 그리지 않는다.
function mobilityStepLine(label, text) {
  if (!text) return '';
  return '<p class="mobility-step">' +
      '<span class="mobility-step-label">' + label + '</span>' +
      '<span class="mobility-step-text">' + escapeHtml(text) + '</span>' +
    '</p>';
}

// 두 화면은 같은 골격을 쓰고 문구·푸터만 다르다. (카디오와는 공유하지 않는다 — 위 주석 참조)
function buildMobilityGuideHtml(kind) {
  var cur = mobilityCurrent();
  if (!cur || cur.kind !== kind) return '<div class="px-5 pt-12">가이드 없음</div>';
  var g = cur.g;
  var segs = mobilitySegsOf(g);
  var seg = segs[g.idx];
  if (!seg) return '<div class="px-5 pt-12">가이드 없음</div>';
  var isWarmup = (kind === 'warmup');
  var next = segs[g.idx + 1] || null;
  var totalMin = Math.max(1, Math.round(mobilitySegmentsTotalSec(segs) / 60));
  var progPct = segs.length > 0 ? (g.idx / segs.length) * 100 : 0;

  // 시간 구간이면 남은 시간, 횟수 구간이면 횟수. 남은 시간은 타이머가 매 250ms 덮어쓴다.
  var isTime = (seg.mode === 'time');
  var remain = isTime ? Math.max(0, Math.ceil(((g.segEndsAt || (Date.now() + seg.sec * 1000)) - Date.now()) / 1000)) : 0;
  var amountText = isTime ? cardioFmtClock(remain) : (seg.reps + '회');
  var segFillPct = isTime && seg.sec > 0 ? Math.min(100, Math.max(0, ((seg.sec - remain) / seg.sec) * 100)) : 0;

  // 이른 아침 경고 (§4-E) — 자는 동안 디스크가 물을 먹어 기상 직후 굽힘 응력이 약 300% 높다.
  var morningWarn = '';
  if (isWarmup) {
    var kstHour = getKstHour();
    if (kstHour >= 4 && kstHour < 9) {
      morningWarn =
        '<div class="mobility-note mobility-note-warn">' +
          '아침엔 디스크에 물이 차 있어서 허리를 숙이는 동작이 하루 중 가장 위험해요. ' +
          '캣-카멜은 아주 살살, 하체 웜업은 조금 더 천천히 하세요.' +
        '</div>';
    }
  }

  // 등록된 부상이 있으면 "통증 없는 범위" 한 줄 (§3-D 주의)
  var injuryNote = '';
  var injuries = (typeof getUserInjuryAreas === 'function') ? getUserInjuryAreas() : [];
  if (injuries && injuries.length) {
    var injuryKr = injuries.map(function(a) {
      return (typeof INJURY_AREAS !== 'undefined' && INJURY_AREAS[a] && INJURY_AREAS[a].kr) ? INJURY_AREAS[a].kr : a;
    }).join(' · ');
    // "어깨 이 등록돼" 같은 조사 오류를 피하려고 부위 이름 뒤에 '부상이'를 붙인다(받침 유무와 무관).
    injuryNote =
      '<div class="mobility-note">' +
        '기억 노트에 <b>' + escapeHtml(injuryKr) + '</b> 부상이 등록돼 있어요. 전부 <b>통증 없는 범위</b>까지만 하세요.' +
      '</div>';
  }

  var warnLine = seg.warn ? '<p class="mobility-warn">' + escapeHtml(seg.warn) + '</p>' : '';
  var optionalTag = seg.optional ? '<span class="mobility-tag">선택</span>' : '';
  var omittedLine = (g.omitted > 0)
    ? '<p class="mobility-omitted">시간 수지에 맞춰 ' + g.omitted + '개 동작을 뺐어요 (' + (isWarmup ? '웜업 ' + MOBILITY_WARMUP_LIMIT : '스트레칭 ' + MOBILITY_STRETCH_LIMIT) + '동작 상한)</p>'
    : '';

  // 두 화면의 정직성 문구 — 근거가 말하는 것 이상을 약속하지 않는다.
  var honesty = isWarmup
    ? '길게 늘이는 정적 스트레칭은 <b>운동이 끝난 뒤</b> 하세요. 본세트 전에 한 근육을 60초 넘게 늘이면 그날 최대근력이 약 5% 떨어집니다 (Simic 2013).'
    : '이 스트레칭이 근거로 해주는 건 <b>유연성 유지</b> 하나예요. 근육통·부상 예방·근성장 효과는 기대하지 마세요 (2025 국제 전문가 합의).';

  var modeToggle = '';
  if (isWarmup) {
    var isShort = (g.mode === 'short');
    modeToggle =
      '<div class="mobility-modes">' +
        '<button class="mobility-mode-btn' + (isShort ? '' : ' active') + '" onclick="setWarmupMode(\'standard\')">표준 6분</button>' +
        '<button class="mobility-mode-btn' + (isShort ? ' active' : '') + '" onclick="setWarmupMode(\'short\')">짧게 3분</button>' +
      '</div>';
  }

  return '' +
    // 헤더
    '<div class="px-5 pt-12" style="padding-bottom:14px;">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<button class="session-header-btn" onclick="' + (isWarmup ? 'endSession(false)' : 'closeStretchGuide()') + '">' + icon('close', 18) + '</button>' +
        '<div class="text-center">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">' + (isWarmup ? '오늘의 웜업' : '정리 스트레칭') + '</p>' +
          '<p class="text-xs font-mono accent mt-0\\.5">약 ' + totalMin + '분 · ' + (g.idx + 1) + ' / ' + segs.length + '</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="toggleMobilitySound()" title="' + (g.soundOn === false ? '소리 켜기' : '소리 끄기') + '" style="' + (g.soundOn === false ? 'opacity:0.45;' : '') + '">' + icon('bell', 18) + '</button>' +
      '</div>' +
      '<div class="session-progress"><div class="session-progress-fill" style="width:' + progPct.toFixed(1) + '%"></div></div>' +
    '</div>' +

    '<div class="px-5" style="padding-bottom:150px;">' +

      morningWarn +
      injuryNote +

      // 동작 이름
      '<div class="text-center" style="margin-top:14px;">' +
        '<p class="mobility-name">' + escapeHtml(mobilitySegmentLabel(seg)) + optionalTag + '</p>' +
      '</div>' +

      // 분량 (시간 = 카운트다운 / 횟수 = 사용자가 완료를 누름)
      '<div class="text-center" style="margin-top:6px;">' +
        '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">' + (isTime ? '남은 시간' : '목표 횟수') + '</p>' +
        '<p id="mob-amount" class="font-bebas" style="font-size:72px;line-height:1;letter-spacing:1px;">' + amountText + '</p>' +
        (isTime
          ? '<div class="mobility-segbar"><div id="mob-seg-fill" class="mobility-segbar-fill" style="width:' + segFillPct.toFixed(1) + '%"></div></div>'
          : '<p class="text-[11px] font-mono text-stone-600 mt-1">천천히 · 반동 없이 · 다 하면 완료를 누르세요 (약 ' + seg.sec + '초)</p>') +
      '</div>' +

      // 전환 예고 배너 (3초 전)
      '<div id="mob-precue" class="mobility-precue" style="display:none;"></div>' +

      // 자세 지시(준비 → 동작 → 기준) + 왜 하는지(why)
      '<div class="card" style="margin-top:16px;">' +
        mobilityStepLine('준비', seg.prep) +
        mobilityStepLine('동작', seg.cue) +
        mobilityStepLine('기준', seg.std) +
        warnLine +
        (seg.why ? '<p class="mobility-why">ⓘ ' + escapeHtml(seg.why) + '</p>' : '') +
      '</div>' +

      // 진행 버튼
      // 버튼에 지금 구간 번호를 박아 둔다 — 타이머가 자동으로 넘긴 직후 도착한 늦은 탭을 무시하기 위해서다.
      // 설명이 준비·동작·기준 세 줄로 길어져서, 320px 폭 · 세로 640px 화면에선 이 줄이 접힘선 아래로 내려간다.
      // 횟수 구간은 사용자가 "완료"를 눌러야 넘어가므로 화면 아래에 고정해 항상 손이 닿게 한다(sticky).
      '<div class="flex gap-2 mobility-actions">' +
        '<button class="option-card mobility-btn" onclick="mobilitySkipStep(' + g.idx + ')"><p class="text-sm font-mono text-stone-400">건너뛰기</p></button>' +
        '<button class="option-card mobility-btn mobility-btn-primary" onclick="mobilityNext(' + g.idx + ')"><p class="text-sm font-mono accent">완료</p></button>' +
      '</div>' +

      // 다음 구간 예고
      '<div class="mobility-next">' +
        '<p class="text-[11px] text-stone-500">다음</p>' +
        '<p class="text-sm font-display" style="color:#fff;">' +
          (next ? escapeHtml(mobilitySegmentLabel(next) + ' · ' + mobilitySegmentAmount(next)) : (isWarmup ? '본운동 시작' : '마지막 동작')) +
        '</p>' +
      '</div>' +

      omittedLine +
      modeToggle +

      '<p class="mobility-honesty">' + honesty + '</p>' +

      '<button class="option-card" style="width:100%;margin-top:14px;text-align:center;padding:14px 0;" onclick="mobilitySkipAll()">' +
        '<p class="text-sm font-mono accent">' + (isWarmup ? '웜업 건너뛰고 바로 시작 →' : '스트레칭 그만하기') + '</p>' +
      '</button>' +

    '</div>';
}

// ═══════════════════════════════════════════════
// 더보기 화면 - 핸들러
// ═══════════════════════════════════════════════

// API 키 모달 열기
window.openApiKeyModal = function() {
  state.apiKeyModalOpen = true;
  state.apiKeyInput = state.apiKey || '';
  render();
  setTimeout(function() {
    var input = document.getElementById('api-key-field');
    if (input && !state.apiKey) input.focus();
  }, 100);
};

// API 키 모달 닫기
window.closeApiKeyModal = function() {
  animateSheetCloseThen(function() {
    state.apiKeyModalOpen = false;
    state.apiKeyInput = '';
    render();
  });
};

// API 키 입력 업데이트
window.updateApiKeyInput = function(value) {
  state.apiKeyInput = value;
};

// API 키 저장
window.saveApiKey = function() {
  var key = state.apiKeyInput.trim();
  if (!key) {
    alert('API 키를 입력해주세요');
    return;
  }
  if (!key.startsWith('sk-ant-')) {
    if (!confirm('"sk-ant-"로 시작하지 않아요. 그래도 저장할까요?')) return;
  }
  state.apiKey = key;
  storage.set(KEYS.API_KEY, key);
  state.apiKeyModalOpen = false;
  state.apiKeyInput = '';
  render();
  // 토스트 대체
  setTimeout(function() {
    alert('API 키를 저장했어요. 이제 코치 대화·맞춤 루틴·주간 리뷰를 쓸 수 있어요.');
  }, 100);
};

// API 키 삭제
window.deleteApiKey = function() {
  if (!confirm('API 키를 삭제할까요? 삭제하면 코치 대화·맞춤 루틴·주간 리뷰를 쓸 수 없어요.')) return;
  state.apiKey = null;
  storage.set(KEYS.API_KEY, null);
  state.apiKeyModalOpen = false;
  render();
};

// ═══════════════════════════════════════════════
// 프로필 수정 모달 (묶음1): 기본(나이·키·체중) + 주간 운동 횟수
// ═══════════════════════════════════════════════
window.openProfileEditModal = function() {
  var p = state.profile || {};
  state.profileEdit = {
    age: p.age, height: p.height, weight: p.weight,
    workoutFreq: p.workoutFreq
  };
  state.profileEditModalOpen = true;
  render();
};

window.closeProfileEditModal = function() {
  animateSheetCloseThen(function() {
    state.profileEditModalOpen = false;
    state.profileEdit = null;
    render();
  });
};

window.updateProfileEditField = function(field, value) {
  if (!state.profileEdit) return;
  state.profileEdit[field] = value;
};

window.saveProfileEdit = function() {
  var e = state.profileEdit || {};
  var fields = [
    { k: 'age', label: '나이', min: 10, max: 120, int: true },
    { k: 'height', label: '키(cm)', min: 100, max: 250 },
    { k: 'weight', label: '체중(kg)', min: 25, max: 300 },
    { k: 'workoutFreq', label: '주간 운동 횟수', min: 1, max: 14, int: true }
  ];
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var v = parseFloat(e[f.k]);
    if (isNaN(v) || v < f.min || v > f.max) {
      alert(f.label + ' 값을 확인해주세요 (' + f.min + '~' + f.max + ').');
      return;
    }
    e[f.k] = f.int ? Math.round(v) : v;
  }
  state.profile.age = e.age;
  state.profile.height = e.height;
  state.profile.weight = e.weight;
  state.profile.workoutFreq = e.workoutFreq;
  storage.set(KEYS.PROFILE, state.profile);
  state.profileEditModalOpen = false;
  state.profileEdit = null;
  render();
  showToast('프로필을 저장했어요');
};

function renderProfileEditModal() {
  if (!state.profileEditModalOpen) return '';
  var e = state.profileEdit || {};
  function field(label, key, unit, step) {
    return '<div class="input-group">' +
      '<div class="input-label"><p>' + label + '</p>' + (unit ? '<p>' + unit + '</p>' : '') + '</div>' +
      '<input type="number" inputmode="decimal" class="api-key-input"' +
        (step ? ' step="' + step + '"' : '') +
        ' value="' + escapeHtml(e[key] != null ? e[key] : '') + '"' +
        ' oninput="updateProfileEditField(\'' + key + '\', this.value)" />' +
    '</div>';
  }
  return '<div class="manual-input-overlay" onclick="closeProfileEditModal()">' +
    '<div class="manual-input-sheet" onclick="event.stopPropagation()">' +
      '<div class="sheet-handle"></div>' +
      '<div class="flex items-center justify-between mb-5">' +
        '<div>' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">내 정보</p>' +
          '<p class="font-bebas text-2xl mt-1">프로필 수정</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="closeProfileEditModal()">' + icon('close', 18) + '</button>' +
      '</div>' +
      field('나이', 'age', '세', '1') +
      field('키', 'height', 'cm', '0.1') +
      field('체중', 'weight', 'kg', '0.1') +
      field('주간 운동 횟수', 'workoutFreq', '회 / 주', '1') +
      '<button class="sheet-submit mt-2" onclick="saveProfileEdit()">저장</button>' +
      '<button class="mt-2" onclick="closeProfileEditModal()" style="width:100%;padding:12px;border-radius:14px;background:transparent;border:1px solid var(--bg-4);color:var(--text-soft);font-family:var(--font);font-weight:700;font-size:13px;">취소</button>' +
    '</div>' +
  '</div>';
}

// ═══════════════════════════════════════════════
// 1RM 리스트 화면
// ═══════════════════════════════════════════════
window.openOneRMList = function() {
  state.oneRMListOpen = true;
  render();
};

window.closeOneRMList = function() {
  state.oneRMListOpen = false;
  render();
};

window.resetOneRM = function() {
  if (!confirm('1RM 데이터를 초기 값으로 되돌리시겠어요? (기존 앱에서 가져온 값으로 복원)')) return;
  storage.set(KEYS.ONE_RM_INITIALIZED, null);
  initializeOneRMData();
  render();
  alert('1RM 데이터가 초기화됐어요.');
};

function renderOneRMList() {
  var data = storage.get(KEYS.ONE_RM_DATA, {});
  
  // 종목을 추가할 때 EXERCISE_BODY_PART_MAP에만 넣으면 이 화면에는 안 보인다 — 여기에도 함께 넣을 것.
  var categories = {
    '하체': ['레그 프레스', '핵 스쿼트', '리버스 브이 스쿼트', '브이 스쿼트', '머신 레그 익스텐션', '바벨 루마니안 데드리프트', '머신 라잉 레그 컬', '머신 힙 쓰러스트', '머신 힙 어브덕션', '덤벨 불가리안 스플릿 스쿼트', '덤벨 싱글 레그 데드리프트', '와이드 스탠스 레그 프레스', '케이블 풀 스루', '레그 프레스 카프 레이즈', '덤벨 시티드 카프 레이즈'],
    '가슴': ['머신 체스트 프레스', '스미스 인클라인 벤치 프레스', '머신 펙 덱 플라이', '덤벨 인클라인 벤치 프레스', '케이블 플라이', '해머 체스트 프레스', '해머 인클라인 체스트 프레스', '바벨 인클라인 벤치 프레스', '스미스 머신 벤치 프레스', '덤벨 인클라인 플라이'],
    '어깨': ['머신 시티드 숄더 프레스', '덤벨 숄더 프레스', '덤벨 아놀드 프레스', '덤벨 사이드 레터럴 레이즈', '케이블 원 암 레터럴 레이즈', '스미스 머신 오버헤드 프레스'],
    '삼두': ['케이블 푸시 다운', '케이블 오버헤드 트라이셉스 익스텐션', '케이블 트라이셉스 킥백', '어시스트 딥스', '스미스 머신 클로즈 그립 벤치 프레스'],
    '등': ['머신 시티드 로우', '케이블 시티드 로우', '클로즈 그립 랫 풀 다운', 'T 바 로우', '리버스 그립 랫 풀 다운', '랫 풀 다운', '케이블 암 풀 다운', '덤벨 인클라인 로우', '리버스 펙 덱 플라이', '원암 리버스 펙 덱 플라이', '페이스 풀', '케이블 슈러그', '켈소 슈러그', '어시스트 풀업', '해머 로우', '플레이트 랫 풀 다운', '와이드 그립 랫 풀 다운', '원 암 케이블 랫 풀 다운', '스미스 머신 슈러그'],
    '이두': ['바벨 컬', '덤벨 해머 컬', '덤벨 프리처 컬', '이지 바 프리처 컬', '인클라인 덤벨 컬', '덤벨 얼터네이트 컬', '이지 바 리버스 컬'],
    '코어': ['머신 시티드 크런치', '케이블 닐링 사이드 크런치', '인클라인 덤벨 와이 레이즈', '케이블 크런치', '케이블 팔로프 프레스', '행잉 니 레이즈']
  };
  
  var totalCount = Object.keys(data).length;

  // 목록 46줄을 전부 앰버로 칠하면 강조가 배경이 된다 → 숫자는 흰색, 무거운 상위 5개만 강조색.
  var topFive = {};
  Object.keys(data)
    .sort(function(a, b) { return (Number(data[b]) || 0) - (Number(data[a]) || 0); })
    .slice(0, 5)
    .forEach(function(name) { topFive[name] = true; });

  var categoriesHtml = '';
  Object.keys(categories).forEach(function(cat) {
    var items = categories[cat].filter(function(name) { return data[name] !== undefined; });
    if (items.length === 0) return;

    var itemsHtml = items.map(function(name) {
      // 헬스장에서 0.33kg 을 맞출 방법은 없다 → 정수로 반올림해 보여준다(저장값은 그대로).
      var rm = Math.round(Number(data[name]) || 0);
      var w75 = snapWeightToEquipment(data[name] * 0.75, name);
      var isTop = !!topFive[name];
      return '<div class="menu-row" style="cursor: default;">' +
        '<div class="flex-1">' +
          '<p class="text-sm font-display font-bold">' + escapeHtml(name) + '</p>' +
          '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">작업 ' + escapeHtml(w75) + 'kg</p>' +
        '</div>' +
        '<p class="font-bebas text-xl' + (isTop ? ' accent' : '') + '">' + escapeHtml(rm) + '<span class="text-xs text-stone-400">kg</span></p>' +
      '</div>';
    }).join('');

    categoriesHtml +=
      '<div class="mb-5">' +
        '<div class="flex items-center justify-between mb-2 px-1">' +
          '<p class="text-xs font-display font-bold">' + cat + '</p>' +
          '<p class="text-[11px] font-mono text-stone-500">' + items.length + '개</p>' +
        '</div>' +
        '<div class="section-group">' + itemsHtml + '</div>' +
      '</div>';
  });
  
  return '' +
    '<div class="review-detail-screen">' +
      '<div class="coach-header">' +
        '<button class="session-header-btn" onclick="closeOneRMList()">' + icon('close', 18) + '</button>' +
        '<div class="coach-header-info">' +
          '<div>' +
            '<p class="text-sm font-display font-bold">내 1RM</p>' +
            '<p class="text-[11px] font-mono text-stone-500">총 ' + totalCount + '개 종목</p>' +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="resetOneRM()" title="초기화">' + icon('refresh', 16) + '</button>' +
      '</div>' +
      
      '<div class="px-5 pt-5 pb-20">' +
        
        // 첫 줄만 남기고 나머지는 ⓘ 안으로. 근거(Epley·Nuzzo 2024)는 지우지 않고 접기만 한다.
        '<p class="text-xs text-stone-300 leading-relaxed mb-2">최근 기록으로 계산한 추정값이에요. 종목끼리 비교하지 말고, 같은 종목이 오르는지만 보세요.</p>' +
        noteBlock('어떻게 계산하나요? · 작업무게란?',
          '최근 몇 번의 운동 중 최고 기록으로 추적해요(Epley 공식). 신기록은 바로 반영되고, 한동안 못 들면 천천히 내려가요 — 컨디션 난조 한 번으로 폭락하지 않아요.<br>' +
          '실제로 1회 들어본 값이 아니라서 종목에 따라 10~15% 차이날 수 있어요. 그래서 종목 간 비교에는 못 써요.<br>' +
          '<b>작업</b>은 1RM의 75% — 보통 8~12회를 낼 수 있는 무게예요.') +
        
        categoriesHtml +
        
      '</div>' +
    '</div>';
}

// 설정 토글
window.toggleSetting = function(field) {
  state.settings[field] = !state.settings[field];
  storage.set(KEYS.SETTINGS, state.settings);
  render();
};

// 전체 초기화 (1단계: 확인 UI 띄움)
window.resetAllData = function() {
  state.resetConfirming = true;
  render();
};

// 전체 초기화 취소
window.cancelResetAll = function() {
  animateSheetCloseThen(function() {
    state.resetConfirming = false;
    render();
  });
};

// 전체 초기화 실행
window.executeResetAll = function() {
  // 모든 localStorage 삭제
  Object.values(KEYS).forEach(function(key) {
    localStorage.removeItem(key);
  });
  
  // INITIALIZED 플래그는 다시 설정 (데모 데이터 재생성 방지!)
  // 빈 배열들로 초기화
  localStorage.setItem(KEYS.INITIALIZED, JSON.stringify(true));
  localStorage.setItem(KEYS.WORKOUT_LOG, JSON.stringify([]));
  localStorage.setItem(KEYS.PERSONAL_RECORDS, JSON.stringify([]));
  localStorage.setItem(KEYS.BODY_LOG, JSON.stringify([]));
  localStorage.setItem(KEYS.CONDITION_LOG, JSON.stringify([]));
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
  
  showToast('모든 데이터 삭제 완료');
  setTimeout(function() {
    location.reload();
  }, 1000);
};

// 백업/내보내기 (복원 가능한 JSON 파일)
// 파일 하나에 운동·유산소·체중·1RM·기억 노트 등 기록을 모아 담는다.
// API 키(fitness_api_key)와 코치 대화는 보안·용량 때문에 담지 않는다 (BACKUP_LOCAL_ONLY_KEYS).
window.exportData = function() {
  var url = null;
  // 파일 만들기 + 내려받기 시작까지만 try 로 감싼다 (뒤의 화면 갱신이 실패해도 '백업 실패'로 보이지 않게)
  try {
    var json = JSON.stringify(buildBackupObject(), null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fitness-backup-' + getTodayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    if (url) URL.revokeObjectURL(url);
    showAlert('백업 파일을 만들지 못했어요.\n잠시 뒤 다시 시도해 주세요.', { title: '백업 실패', danger: true });
    return;
  }
  // 링크 주소는 조금 뒤에 해제한다 — 클릭 직후 바로 해제하면 브라우저가 내려받기를 취소할 수 있다.
  if (url) setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  // 주의: 브라우저는 "실제로 저장됐는지"를 알려주지 않는다(공유 시트 취소 등도 감지 불가).
  // 그래서 여기 기록은 "저장을 시도한 시각"이다 — 그래서 화면에서도 파일 확인을 권한다.
  markBackupDone();                         // 마지막 백업 일시 기록 → 더보기 화면 표시·리마인더 갱신
  showToast('백업 파일을 저장했어요 (API 키 제외)');
  render();
};

// 가져오기: 파일 선택 → 검사 → "덮어씁니다" 확인 → 복원 → 새로고침.
// (운동 데이터만 복원. API 키·코치 대화는 백업에 없으므로 이 폰 값이 그대로 남는다.)
window.openBackupImport = function() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) { applyBackupText(ev.target.result); };
    reader.onerror = function() {
      showAlert('파일을 열지 못했어요.\n파일이 지워졌거나 접근 권한이 없을 수 있어요.', { title: '가져오기 실패', danger: true });
    };
    reader.readAsText(file);
  };
  input.click();
};

// 읽어들인 백업 파일 내용(문자열) 처리: 검사 → 덮어쓰기 확인 → 복원 → 새로고침.
// 파일 고르기(FileReader)와 분리해 둬서 브라우저 QA·테스트에서 이 경로를 그대로 확인할 수 있다.
window.applyBackupText = function(text) {
  var checked = parseBackupFile(text);
  if (!checked.ok) {
    showAlert(checked.error || '백업 파일을 읽지 못했어요.', { title: '가져오기 실패', danger: true });
    return;
  }
  showConfirm(buildRestoreConfirmMessage(checked.summary), function() {
    var res = restoreFromBackup(checked.backup);
    if (!res.ok) {
      showAlert(res.error || '복원하지 못했어요.', { title: '복원 실패', danger: true });
      return;
    }
    showToast('복원 완료 — 새로고침할게요');
    setTimeout(function() { location.reload(); }, 1000);
  }, { confirmLabel: '덮어쓰기', danger: true });
};

// 덮어쓰기 확인 문구 — 백업 파일에 뭐가 들어있는지 먼저 보여주고 되돌릴 수 없음을 알린다.
function buildRestoreConfirmMessage(s) {
  s = s || {};
  var when = s.exportedAt ? fmtDate(s.exportedAt) + ' 백업' : '날짜를 알 수 없는 백업';
  var items = [];
  if (s.workouts) items.push('운동 ' + s.workouts + '회');
  if (s.cardio) items.push('유산소 ' + s.cardio + '회');
  if (s.body) items.push('체중 ' + s.body + '개');
  if (s.records) items.push('기록 ' + s.records + '개');
  if (s.oneRM) items.push('1RM ' + s.oneRM + '종목');
  if (s.memory) items.push('기억 노트 ' + s.memory + '개');
  return when + '\n' + (items.length ? items.join(' · ') : '담긴 기록 없음') + '\n\n' +
    '지금 이 폰에 있는 기록을 이 파일 내용으로 모두 바꿉니다. 되돌릴 수 없어요.\n' +
    '(API 키와 코치 대화는 그대로 남아요)';
}

// ═══════════════════════════════════════════════
// 더보기 화면 - 렌더
// ═══════════════════════════════════════════════
function renderMore() {
  var profile = state.profile;
  var apiKey = state.apiKey;
  var settings = state.settings;

  // ── 데이터 백업 섹션 (마지막 백업 표시 + 오래되면 부드러운 리마인더) ──
  var backupStatus = getBackupStatus();
  // 경과일은 getBackupStatus 한 곳에서만 계산한다(리마인더와 같은 값) — daysAgo 는 기기 시계가
  // 앞서 있을 때 '-3일 전' 같은 음수를 그대로 보여주므로 0일일 때는 쓰지 않는다.
  var backupWhenText = backupStatus.never
    ? '아직 백업한 적이 없어요'
    : (backupStatus.daysSince === 0 ? '오늘' : daysAgo(backupStatus.at)) + ' · ' + fmtDate(backupStatus.at);
  var backupReminderHtml = '';
  if (backupStatus.stale) {
    var reminderText = backupStatus.never
      ? '아직 백업 파일을 만든 적이 없어요. 지금 한 번 저장해 두면 폰을 바꿔도 기록을 그대로 옮길 수 있어요.'
      : '마지막 백업이 ' + backupStatus.daysSince + '일 전이에요. 그 뒤로 쌓인 기록은 아직 저장돼 있지 않아요.';
    backupReminderHtml =
      '<div class="backup-reminder">' +
        '<div class="backup-reminder-icon">' + icon('info', 16) + '</div>' +
        '<div class="flex-1">' +
          '<p class="text-xs leading-relaxed" style="color: var(--text-soft);">' + escapeHtml(reminderText) + '</p>' +
          '<button class="backup-reminder-btn" onclick="exportData()">지금 백업하기</button>' +
        '</div>' +
      '</div>';
  }
  var backupRowsHtml =
        '<div class="menu-row" onclick="exportData()">' +
          '<div class="menu-icon-sm">' + icon('download', 18) + '</div>' +
          '<div class="menu-row-content">' +
            '<p class="text-sm font-display font-bold">백업 파일 저장 (내보내기)' + (backupStatus.stale ? ' <span class="backup-dot"></span>' : '') + '</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">기록 전체를 파일 하나(.json)로 내려받기</p>' +
          '</div>' +
          '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
        '</div>' +
        '<div class="menu-row" onclick="openBackupImport()">' +
          '<div class="menu-icon-sm">' + icon('upload', 18) + '</div>' +
          '<div class="menu-row-content">' +
            '<p class="text-sm font-display font-bold">백업 파일 불러오기 (가져오기)</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">저장해 둔 파일로 되돌리기 · 지금 기록은 덮어써져요</p>' +
          '</div>' +
          '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
        '</div>' +
        '<div class="menu-row" style="cursor: default;">' +
          '<div class="menu-icon-sm">' + icon('calendar', 18) + '</div>' +
          '<div class="menu-row-content">' +
            '<p class="text-sm font-display font-bold">마지막 백업</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + escapeHtml(backupWhenText) + '</p>' +
          '</div>' +
        '</div>';
  // 위 리마인더 카드가 이미 같은 말을 할 때는 문단을 두지 않는다(같은 설명 두 번 금지).
  var backupHintHtml = backupStatus.stale ? '' :
        '<p class="backup-hint">폰을 바꾸거나 브라우저 기록을 지우면 데이터가 사라져요. 백업 파일로 옮길 수 있어요.<br>' +
          '<span style="opacity:0.7;">(API 키는 백업에 포함되지 않아요)</span></p>';

  // API 키 모달
  var apiModalHtml = '';
  if (state.apiKeyModalOpen) {
    apiModalHtml = 
      '<div class="manual-input-overlay" onclick="closeApiKeyModal()">' +
        '<div class="manual-input-sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          
          '<div class="flex items-center justify-between mb-5">' +
            '<div>' +
              '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">AI 코치·루틴</p>' +
              '<p class="font-bebas text-2xl mt-1">Anthropic API 키</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeApiKeyModal()">' + icon('close', 18) + '</button>' +
          '</div>' +
          
          // 안내
          '<div class="card mb-4" style="padding: 14px; background: rgba(var(--accent-rgb), 0.06); border-color: rgba(var(--accent-rgb), 0.25);">' +
            '<div class="flex items-start gap-2">' +
              '<div style="color: var(--accent); flex-shrink: 0; margin-top: 2px;">' + icon('info', 16) + '</div>' +
              '<div>' +
                '<p class="text-xs accent font-mono uppercase tracking-widest mb-1">왜 필요한가요?</p>' +
                '<p class="text-xs text-stone-300 leading-relaxed">AI 코치·루틴·주간 리뷰·정체기 분석에 Anthropic Claude를 써요. 키가 없으면 그 기능만 꺼져요.</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          
          // 입력
          '<div class="input-group">' +
            '<div class="input-label">' +
              '<p>API 키</p>' +
              '<p>console.anthropic.com</p>' +
            '</div>' +
            '<input type="password" class="api-key-input" id="api-key-field" placeholder="sk-ant-..." value="' + escapeHtml(state.apiKeyInput || '') + '" oninput="updateApiKeyInput(this.value)" />' +
            '<p class="text-[11px] font-mono text-stone-500 mt-2 px-1">키는 이 기기에만 저장돼요.</p>' +
          '</div>' +
          
          // 저장 버튼
          '<button class="sheet-submit" onclick="saveApiKey()">저장</button>' +
          
          // 삭제 버튼 (기존 키 있을 때만)
          (apiKey ? '<button class="btn-danger mt-2" onclick="deleteApiKey()">API 키 삭제</button>' : '') +
          
        '</div>' +
      '</div>';
  }
  
  return '' +
    '<div class="px-5 pt-12 pb-32" style="display: flex; flex-direction: column; gap: 20px;">' +
      
      // 프로필 카드 (탭하면 수정 모달)
      '<div class="more-profile-card" onclick="openProfileEditModal()" style="cursor: pointer;">' +
        '<div class="flex items-center gap-3">' +
          '<div class="flex-1">' +
            '<p class="font-display font-bold text-base">사용자</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-1">' + escapeHtml(profile.age) + '세 · ' + escapeHtml(profile.height) + 'cm · ' + escapeHtml(profile.weight) + 'kg</p>' +
            '<div class="flex items-center gap-2 mt-1">' +
              '<span class="text-[11px] font-mono text-stone-500">주 ' + (profile.workoutFreq || 4) + '회 운동</span>' +
            '</div>' +
          '</div>' +
          '<div class="menu-arrow">' + icon('chevron', 18) + '</div>' +
        '</div>' +
      '</div>' +
      
      // 코치와 대화 (강조)
      '<button class="coach-chat-card" onclick="openCoachChat()">' +
        '<div class="flex items-center gap-3">' +
          '<div class="coach-chat-icon">' + icon('msg', 22) + '</div>' +
          '<div class="flex-1 text-left">' +
            '<p class="font-display font-bold text-base">코치와 대화</p>' +
            '<p class="text-[11px] font-mono text-stone-400 mt-0\\.5">' + 
              (apiKey ? '운동·식단·컨디션 질문하기' : 'API 키 설정 후 사용 가능') +
            '</p>' +
          '</div>' +
          '<div style="color: var(--accent);">' + icon('chevron', 18) + '</div>' +
        '</div>' +
      '</button>' +
      
      // ── 섹션은 3개(AI 코칭 · 내 데이터 · 앱)로 묶는다. 7개로 잘게 쪼개면 목록이 계단처럼 보인다.
      //    아이콘 타일 색도 통일 — 회색 하나, 위험한 것(전체 초기화)만 빨강.
      '<div>' +
        '<p class="section-label">AI 코칭</p>' +
        '<div class="section-group">' +
          '<div class="menu-row" onclick="openApiKeyModal()">' +
            '<div class="menu-icon-sm">' + icon('key', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">Anthropic API 키</p>' +
              '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' +
                (apiKey ? escapeHtml(maskApiKey(apiKey)) : 'AI 코치·맞춤 루틴·주간 리뷰 켜기') +
              '</p>' +
            '</div>' +
            '<span class="api-status-badge ' + (apiKey ? 'active' : 'inactive') + '">' +
              (apiKey ? '활성' : '비활성') +
            '</span>' +
          '</div>' +

          (apiKey ?
            '<div class="menu-row" onclick="openWeeklyReview()">' +
              '<div class="menu-icon-sm">' + icon('chart', 18) + '</div>' +
              '<div class="menu-row-content">' +
                '<p class="text-sm font-display font-bold">주간 리뷰</p>' +
                '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + (state.weeklyReview ? '이번 주 ' + escapeHtml(state.weeklyReview.grade) + '등급 리뷰' : '이번 주 종합 분석') + '</p>' +
              '</div>' +
              '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
            '</div>'
          : '') +

          (apiKey ?
            '<div class="menu-row" onclick="openPlateauDetail()">' +
              '<div class="menu-icon-sm">' + icon('info', 18) + '</div>' +
              '<div class="menu-row-content">' +
                '<p class="text-sm font-display font-bold">정체기 분석</p>' +
                '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + (state.plateauCheck ? state.plateauCheck.signals.length + '개 신호 감지됨' : '진행 정체 자동 진단') + '</p>' +
              '</div>' +
              (state.plateauCheck ? '<span class="api-status-badge" style="background: rgba(var(--warn-rgb), 0.15); color: var(--warn); border: 1px solid rgba(var(--warn-rgb), 0.4);">감지</span>' : '<div class="menu-arrow">' + icon('chevron', 16) + '</div>') +
            '</div>'
          : '') +
          // 기억 노트 (API 키 없어도 직접 추가 가능)
          '<div class="menu-row" onclick="openCoachMemory()">' +
            '<div class="menu-icon-sm">' + icon('msg', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">기억 노트</p>' +
              '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">코치가 기억할 부상·선호·목표·일정</p>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
              '<p class="text-[11px] font-mono text-stone-500">' + (state.coachMemory ? state.coachMemory.length : 0) + '개</p>' +
              '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // 내 데이터 — 사이클·1RM·데이터 백업·초기화를 한 목록으로
      '<div>' +
        '<p class="section-label">내 데이터 · 백업</p>' +
        backupReminderHtml +
        '<div class="section-group">' +
          '<div class="menu-row" style="cursor: default;">' +
            '<div class="menu-icon-sm">' + icon('refresh', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">현재 사이클</p>' +
              '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">Cycle ' + escapeHtml(profile.currentCycle) + ' · ' + escapeHtml(profile.cyclePhase) + ' · ' + escapeHtml(profile.currentWeek) + '/' + CYCLE_LENGTH + '주</p>' +
            '</div>' +
          '</div>' +
          '<div class="menu-row" onclick="openOneRMList()">' +
            '<div class="menu-icon-sm">' + icon('trophy', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">내 1RM</p>' +
              '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + Object.keys(storage.get(KEYS.ONE_RM_DATA, {})).length + '개 종목 추적 중</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          backupRowsHtml +
          '<div class="menu-row" onclick="resetAllData()">' +
            '<div class="menu-icon-sm danger-bg-soft">' + icon('trash', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold" style="color: var(--danger);">전체 초기화</p>' +
              '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">모든 데이터 삭제</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</div>' +
        backupHintHtml +
      '</div>' +

      // 앱
      '<div>' +
        '<p class="section-label">앱</p>' +
        '<div class="section-group">' +
          '<div class="menu-row" onclick="installPWA()">' +
            '<div class="menu-icon-sm">' + icon('download', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">홈 화면에 설치</p>' +
              '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">앱처럼 사용 · 오프라인 지원</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // 푸터 — 영어 태그라인은 뺐다. 버전만.
      '<div class="app-footer">' +
        '<p class="text-[11px] font-mono text-stone-600">버전 ' + APP_VERSION + '</p>' +
      '</div>' +
      
    '</div>' +

    apiModalHtml +
    renderProfileEditModal();
}

// AI 추천 새로고침
window.refreshAIRecommendation = async function() {
  if (!state.apiKey) {
    showToast('API 키가 필요해요. 더보기에서 설정해주세요.', true);
    return;
  }
  if (state.aiRecLoading) return;  // 연타 방지 (호출 2번 = 요금 2번)

  // 캐시 무효화 + 실패 잠금 해제 (수동 새로고침은 항상 새로 부른다)
  storage.set(KEYS.AI_RECOMMENDATION, null);
  state.aiRecFailedDate = null;
  
  state.aiRecLoading = true;
  state.aiRecommendation = null;
  render();
  
  var rec = await fetchAIRecommendation();
  state.aiRecommendation = rec;
  state.aiRecLoading = false;
  if (!rec) {
    // 실패하면 오늘은 자동 재시도 잠금 (홈 렌더가 다시 부르지 않도록)
    state.aiRecFailedDate = getTodayStr();
    showToast('추천을 못 받았어요. 잠시 후 다시 시도해주세요.', true);
  }
  render();
};

// 주간 리뷰 새로고침
window.refreshWeeklyReview = async function() {
  state.weeklyReviewLoading = true;
  state.weeklyReview = null;
  render();
  
  var review = await generateWeeklyReview(true);
  state.weeklyReview = review;
  state.weeklyReviewLoading = false;
  render();
};

// 주간 리뷰 상세 열기
window.openWeeklyReview = async function() {
  if (!state.weeklyReview && state.apiKey && !state.weeklyReviewLoading) {
    state.weeklyReviewLoading = true;
    state.weeklyReviewOpen = true;
    render();
    
    var review = await generateWeeklyReview();
    state.weeklyReview = review;
    state.weeklyReviewLoading = false;
    render();
  } else {
    state.weeklyReviewOpen = true;
    render();
  }
};

window.closeWeeklyReview = function() {
  state.weeklyReviewOpen = false;
  render();
};

window.openPlateauDetail = function() {
  state.plateauOpen = true;
  render();
};

window.closePlateauDetail = function() {
  state.plateauOpen = false;
  render();
};

window.dismissPlateau = function() {
  if (!confirm('정체기 알림을 닫을까요? 3일 뒤에 다시 확인해요.')) return;
  state.plateauCheck = null;
  storage.set(KEYS.PLATEAU_CHECK, null);
  state.plateauOpen = false;
  render();
};

// ═══════════════════════════════════════════════
// 코치 채팅 - 핸들러
// ═══════════════════════════════════════════════

window.openCoachChat = function() {
  state.coachChatOpen = true;
  
  // 기존 대화 이력 불러오기
  var saved = storage.get(KEYS.COACH_HISTORY, []);
  
  if (saved.length === 0) {
    // 첫 인사
    var profile = state.profile;
    var greeting = '**Cycle ' + profile.currentCycle + ' · ' + profile.cyclePhase + '** 진행 중이에요. ' +
      '운동·식단·컨디션 뭐든 물어보세요.';
    
    state.coachMessages = [{ role: 'assistant', content: greeting }];
  } else {
    state.coachMessages = saved;
  }
  
  state.coachInputText = '';
  state.coachThinking = false;
  render();
  
  setTimeout(function() {
    scrollCoachToBottom();
    var input = document.getElementById('coach-chat-input');
    if (input) input.focus();
  }, 100);
};

window.closeCoachChat = function() {
  // 저장
  if (state.coachMessages.length > 0) {
    // 최근 30개만 저장
    var toSave = state.coachMessages.slice(-30);
    storage.set(KEYS.COACH_HISTORY, toSave);
  }
  
  state.coachChatOpen = false;
  render();
};

window.updateCoachInput = function(text) {
  state.coachInputText = text;
  var sendBtn = document.getElementById('coach-send-btn');
  if (sendBtn) sendBtn.disabled = !text.trim() || state.coachThinking;
};

window.applyCoachQuickQuestion = function(text) {
  var input = document.getElementById('coach-chat-input');
  if (input) input.value = text;
  state.coachInputText = text;
  sendCoachMessage();
};

window.clearCoachHistory = function() {
  if (!confirm('대화 기록을 모두 삭제하시겠어요?')) return;
  state.coachMessages = [];
  storage.set(KEYS.COACH_HISTORY, []);
  openCoachChat();
};

window.sendCoachMessage = async function() {
  if (state.coachThinking) return;
  
  var text = state.coachInputText.trim();
  if (!text) {
    var input = document.getElementById('coach-chat-input');
    if (input) text = input.value.trim();
    if (!text) return;
  }
  
  if (!state.apiKey) {
    state.coachMessages.push({ role: 'user', content: text });
    state.coachMessages.push({ 
      role: 'assistant', 
      content: 'API 키가 필요해요.\n\n' +
        '코치 기능을 사용하려면:\n' +
        '1. **더보기** 탭으로 이동\n' +
        '2. **Anthropic API 키** 메뉴\n' +
        '3. 키 입력 후 저장\n\n' +
        '키는 본인 기기에만 저장되며 외부로 전송되지 않습니다.' 
    });
    state.coachInputText = '';
    render();
    scrollCoachToBottom();
    return;
  }
  
  // 사용자 메시지 추가
  state.coachMessages.push({ role: 'user', content: text });
  state.coachInputText = '';
  state.coachThinking = true;
  render();
  scrollCoachToBottom();
  
  // API에 보낼 메시지 (마지막 20개만)
  var apiMessages = state.coachMessages.slice(-20).map(function(m) {
    return { role: m.role, content: m.content };
  });
  
  // API 호출
  var result = await callCoachAPI(apiMessages);
  
  state.coachThinking = false;
  
  if (result.error) {
    state.coachMessages.push({ 
      role: 'assistant', 
      content: result.error 
    });
  } else {
    // 코치 원문 그대로 표시 (자동 기억 저장 폐지 — 기억은 수동 입력만: openCoachMemory)
    state.coachMessages.push({
      role: 'assistant',
      content: result.text
    });
  }

  // 저장
  var toSave = state.coachMessages.slice(-30);
  storage.set(KEYS.COACH_HISTORY, toSave);
  
  render();
  scrollCoachToBottom();
};

// ═══════════════════════════════════════════════
// 코치 기억 노트 화면 (묶음3)
// ═══════════════════════════════════════════════
window.openCoachMemory = function() {
  state.coachMemoryOpen = true;
  state.coachMemoryInput = '';
  state.coachMemoryCategory = 'other';
  state.coachMemoryEditingId = null;
  state.coachMemoryDeleteId = null;
  render();
};
window.closeCoachMemory = function() {
  state.coachMemoryOpen = false;
  state.coachMemoryEditingId = null;
  state.coachMemoryDeleteId = null;
  render();
};
window.updateMemoryInput = function(value) { state.coachMemoryInput = value; };
window.setMemoryCategory = function(cat) { state.coachMemoryCategory = cat; render(); };

window.saveMemoryNote = function() {
  var text = (state.coachMemoryInput || '').trim();
  if (!text) return;
  var cat = state.coachMemoryCategory || 'other';
  if (state.coachMemoryEditingId) {
    state.coachMemory = state.coachMemory.map(function(m) {
      return m.id === state.coachMemoryEditingId
        ? { id: m.id, category: cat, text: text.slice(0, 140), source: m.source, date: m.date }
        : m;
    });
    state.coachMemoryEditingId = null;
  } else {
    state.coachMemory = mergeCoachMemory(state.coachMemory, [{ category: cat, text: text }], 'manual', getTodayStr(), 'mem_' + Date.now());
  }
  storage.set(KEYS.COACH_MEMORY, state.coachMemory);
  state.coachMemoryInput = '';
  state.coachMemoryCategory = 'other';
  render();
  showToast('기억 노트 저장됨');
};

window.editMemoryNote = function(id) {
  var note = (state.coachMemory || []).find(function(m) { return m.id === id; });
  if (!note) return;
  state.coachMemoryEditingId = id;
  state.coachMemoryInput = note.text;
  state.coachMemoryCategory = note.category;
  state.coachMemoryDeleteId = null;
  render();
  setTimeout(function() { var el = document.getElementById('memory-input'); if (el) el.focus(); }, 50);
};

window.deleteMemoryNote = function(id) { state.coachMemoryDeleteId = id; render(); };
window.cancelMemoryDelete = function() { state.coachMemoryDeleteId = null; render(); };
window.executeDeleteMemory = function(id) {
  state.coachMemory = (state.coachMemory || []).filter(function(m) { return m.id !== id; });
  storage.set(KEYS.COACH_MEMORY, state.coachMemory);
  state.coachMemoryDeleteId = null;
  if (state.coachMemoryEditingId === id) { state.coachMemoryEditingId = null; state.coachMemoryInput = ''; }
  render();
  showToast('삭제됨');
};

function renderCoachMemory() {
  var notes = state.coachMemory || [];
  var groups = '';
  MEMORY_CATEGORIES.forEach(function(cat) {
    var meta = MEMORY_CATEGORY_META[cat];
    var inCat = notes.filter(function(m) { return m.category === cat; });
    if (!inCat.length) return;
    var rows = inCat.map(function(m) {
      if (state.coachMemoryDeleteId === m.id) {
        return '<div class="menu-row" style="background: rgba(239,68,68,0.08);">' +
          '<div class="flex-1"><p class="text-sm">' + escapeHtml(m.text) + '</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">정말 삭제할까요?</p></div>' +
          '<div style="display:flex; gap:6px;">' +
            '<button onclick="cancelMemoryDelete()" style="padding:6px 12px; border-radius:10px; background:transparent; border:1px solid var(--bg-4); color:var(--text-soft); font-size:12px;">취소</button>' +
            '<button class="btn-danger" style="padding:6px 12px; width:auto;" onclick="executeDeleteMemory(\'' + escapeHtml(m.id) + '\')">삭제</button>' +
          '</div>' +
        '</div>';
      }
      var srcBadge = m.source === 'auto'
        ? '<span class="accent">자동</span>'
        : '<span class="text-stone-500">직접</span>';
      return '<div class="menu-row">' +
        '<div class="flex-1" onclick="editMemoryNote(\'' + escapeHtml(m.id) + '\')" style="cursor:pointer;">' +
          '<p class="text-sm">' + escapeHtml(m.text) + '</p>' +
          '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + srcBadge + ' · ' + escapeHtml(m.date || '') + '</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="deleteMemoryNote(\'' + escapeHtml(m.id) + '\')">' + icon('trash', 16) + '</button>' +
      '</div>';
    }).join('');
    groups += '<p class="section-label">' + meta.kr + '</p><div class="section-group" style="margin-bottom:16px;">' + rows + '</div>';
  });
  if (!groups) {
    groups = '<p class="text-sm text-stone-500 text-center" style="padding:40px 0; line-height:1.6;">아직 기억 노트가 없어요.<br>아래에서 직접 추가해 주세요 (부상·제약·선호 등).</p>';
  }

  var chips = MEMORY_CATEGORIES.map(function(cat) {
    var meta = MEMORY_CATEGORY_META[cat];
    var on = state.coachMemoryCategory === cat;
    var style = 'padding:5px 10px; border-radius:999px; font-size:11px; font-family:monospace; cursor:pointer; border:1px solid ' +
      (on ? 'var(--accent)' : 'var(--bg-4)') + '; background:' + (on ? 'rgba(var(--accent-rgb),0.15)' : 'transparent') + '; color:' + (on ? 'var(--accent)' : 'var(--text-soft)') + ';';
    return '<button style="' + style + '" onclick="setMemoryCategory(\'' + cat + '\')">' + meta.kr + '</button>';
  }).join('');

  return '<div class="review-detail-screen">' +
    '<div class="coach-header">' +
      '<button class="session-header-btn" onclick="closeCoachMemory()">' + icon('close', 18) + '</button>' +
      '<div class="coach-header-info"><p class="text-sm font-display font-bold">기억 노트</p>' +
        '<p class="text-[11px] font-mono text-stone-500">총 ' + notes.length + '개 · 코치가 참고해요</p></div>' +
      '<div style="width:36px;"></div>' +
    '</div>' +
    '<div class="px-5 pt-5" style="padding-bottom:160px;">' + groups + '</div>' +
    '<div style="position:fixed; left:0; right:0; bottom:0; padding:12px 16px calc(14px + env(safe-area-inset-bottom)); background:var(--bg-0); border-top:1px solid var(--bg-3); z-index:50;">' +
      '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">' + chips + '</div>' +
      '<div style="display:flex; gap:8px;">' +
        '<input type="text" id="memory-input" class="api-key-input" style="flex:1;" placeholder="' + (state.coachMemoryEditingId ? '수정 내용' : '기억할 내용 추가') + '" value="' + escapeHtml(state.coachMemoryInput || '') + '" oninput="updateMemoryInput(this.value)" onkeydown="if(event.key===\'Enter\'){saveMemoryNote();}" />' +
        '<button class="sheet-submit" style="width:auto; padding:0 18px;" onclick="saveMemoryNote()">' + (state.coachMemoryEditingId ? '수정' : '추가') + '</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// 간단한 마크다운 → HTML (안전한 기본 변환)
function renderMarkdown(text) {
  if (!text) return '';
  
  // HTML 이스케이프 먼저
  var escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 마크다운 변환
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

// ═══════════════════════════════════════════════
// 코치 채팅 - 렌더
// ═══════════════════════════════════════════════
function renderCoachChat() {
  var hasApiKey = !!state.apiKey;
  
  // 메시지 렌더
  var messagesHtml = '';
  state.coachMessages.forEach(function(msg) {
    if (msg.role === 'assistant') {
      messagesHtml += 
        '<div class="coach-msg-bot">' +
          '<p class="msg-content">' + renderMarkdown(msg.content) + '</p>' +
        '</div>';
    } else if (msg.role === 'user') {
      messagesHtml += 
        '<div class="coach-msg-user">' +
          '<p class="text-sm">' + renderMarkdown(msg.content) + '</p>' +
        '</div>';
    }
  });
  
  // 생각 중 인디케이터
  if (state.coachThinking) {
    messagesHtml += 
      '<div class="coach-msg-bot">' +
        '<div class="flex items-center gap-2">' +
          '<div class="loading-spinner"></div>' +
          '<p class="text-sm text-stone-400">분석 중...</p>' +
        '</div>' +
      '</div>';
  }
  
  // API 키 없으면 안내
  var apiWarning = '';
  if (!hasApiKey) {
    apiWarning = 
      '<div class="coach-api-required">' +
        '<div style="color: var(--warn); flex-shrink: 0;">' + icon('info', 18) + '</div>' +
        '<div class="flex-1">' +
          '<p class="text-xs font-display font-bold" style="color: var(--warn);">API 키 필요</p>' +
          '<p class="text-[11px] font-mono text-stone-400 mt-0\\.5">더보기 → Anthropic API 키 설정</p>' +
        '</div>' +
      '</div>';
  }
  
  // 빠른 질문 (대화 적을 때만)
  var quickQuestions = [];
  if (state.coachMessages.length <= 1) {
    quickQuestions = [
      '오늘 어떤 운동 해야 해?',
      '단백질 어떻게 더 늘려?',
      '내 진행 상황 어때?',
      '정체기 같은데 어떻게?',
      '회복이 부족해'
    ];
  }
  
  var quickHtml = quickQuestions.length > 0 
    ? '<div class="coach-quick-questions">' + 
        quickQuestions.map(function(q) {
          return '<button class="coach-quick-chip" onclick="applyCoachQuickQuestion(\'' + q.replace(/'/g, "\\'") + '\')">' + q + '</button>';
        }).join('') + 
      '</div>'
    : '';
  
  var sendDisabled = !state.coachInputText.trim() || state.coachThinking;
  
  return '' +
    '<div class="coach-screen">' +
      
      // 헤더
      '<div class="coach-header">' +
        '<button class="session-header-btn" onclick="closeCoachChat()">' + icon('close', 18) + '</button>' +
        '<div class="coach-header-info">' +
          '<div class="coach-avatar">' + icon('msg', 18) + '</div>' +
          '<div>' +
            '<p class="text-sm font-display font-bold">코치</p>' +
            // 키가 없다는 말은 아래 카드에서 한 번만 한다(헤더 점·placeholder 중복 제거).
            (hasApiKey ? '<p class="text-[11px] font-mono text-stone-500"><span class="coach-online-dot"></span> 온라인</p>' : '') +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="clearCoachHistory()" title="대화 초기화">' + icon('refresh', 16) + '</button>' +
      '</div>' +
      
      // 채팅 영역
      '<div class="coach-chat-area" id="coach-chat-area">' +
        apiWarning +
        messagesHtml +
      '</div>' +
      
      // 하단 입력
      '<div class="coach-input-bottom">' +
        quickHtml +
        '<div class="chat-input-bar">' +
          '<input type="text" id="coach-chat-input" placeholder="메시지 입력…" value="' + escapeHtml(state.coachInputText) + '" oninput="updateCoachInput(this.value)" onkeydown="if(event.key===\'Enter\') sendCoachMessage()" ' + (state.coachThinking ? 'disabled' : '') + ' />' +
          '<button class="chat-send-btn" id="coach-send-btn" onclick="sendCoachMessage()"' + (sendDisabled ? ' disabled' : '') + '>' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      
    '</div>';
}

// ═══════════════════════════════════════════════
// 주간 리뷰 상세 화면
// ═══════════════════════════════════════════════
function renderWeeklyReviewDetail() {
  var review = state.weeklyReview;
  var loading = state.weeklyReviewLoading;
  
  if (loading) {
    return '' +
      '<div class="review-detail-screen">' +
        '<div class="coach-header">' +
          '<button class="session-header-btn" onclick="closeWeeklyReview()">' + icon('close', 18) + '</button>' +
          '<div class="coach-header-info">' +
            '<div>' +
              '<p class="text-sm font-display font-bold">주간 리뷰</p>' +
              '<p class="text-[11px] font-mono text-stone-500">분석 중…</p>' +
            '</div>' +
          '</div>' +
          '<div style="width: 36px;"></div>' +
        '</div>' +
        '<div style="padding: 80px 20px; text-align: center;">' +
          '<div class="loading-spinner" style="width: 32px; height: 32px; margin: 0 auto 16px;"></div>' +
          '<p class="text-sm text-stone-400">코치가 이번 주를 분석하고 있어요...</p>' +
        '</div>' +
      '</div>';
  }
  
  if (!review) {
    return '' +
      '<div class="review-detail-screen">' +
        '<div class="coach-header">' +
          '<button class="session-header-btn" onclick="closeWeeklyReview()">' + icon('close', 18) + '</button>' +
          '<div class="coach-header-info">' +
            '<div>' +
              '<p class="text-sm font-display font-bold">주간 리뷰</p>' +
            '</div>' +
          '</div>' +
          '<div style="width: 36px;"></div>' +
        '</div>' +
        '<div style="padding: 80px 20px; text-align: center;">' +
          '<p class="text-sm text-stone-400 mb-4">' + (state.apiKey ? '리뷰 생성에 실패했어요.' : 'API 키가 필요해요.') + '</p>' +
          (state.apiKey
            ? '<button class="sheet-submit" onclick="refreshWeeklyReview()" style="max-width: 200px;">다시 분석</button>'
            // 키가 없을 때 "필요해요"만 띄우면 여기서 할 수 있는 게 없다 → 설정으로 가는 길을 준다.
            : '<button class="sheet-submit" onclick="closeWeeklyReview(); setTab(\'more\'); openApiKeyModal();" style="max-width: 220px;">키 설정하러 가기</button>') +
        '</div>' +
      '</div>';
  }
  
  // 등급 색상 — 홈 카드와 같은 함수(프로토타입 조회 안전 + 토큰 색)
  var gradeCol = gradeColor(review.grade);
  
  // 잘한 점
  var winsHtml = review.wins.map(function(w) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: var(--accent);"></div>' +
      '<p>' + escapeHtml(w) + '</p>' +
    '</div>';
  }).join('');
  
  // 개선점
  var improvementsHtml = review.improvements.map(function(i) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: var(--warn);"></div>' +
      '<p>' + escapeHtml(i) + '</p>' +
    '</div>';
  }).join('');
  
  // 다음 주
  var nextWeekHtml = review.nextWeek.map(function(n) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: var(--accent);"></div>' +
      '<p>' + escapeHtml(n) + '</p>' +
    '</div>';
  }).join('');
  
  return '' +
    '<div class="review-detail-screen">' +
      // 헤더
      '<div class="coach-header">' +
        '<button class="session-header-btn" onclick="closeWeeklyReview()">' + icon('close', 18) + '</button>' +
        '<div class="coach-header-info">' +
          '<div>' +
            '<p class="text-sm font-display font-bold">주간 리뷰</p>' +
            '<p class="text-[11px] font-mono text-stone-500">' + review.monday + ' ~ ' + review.sunday + '</p>' +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="refreshWeeklyReview()" title="다시 분석">' + icon('refresh', 16) + '</button>' +
      '</div>' +
      
      '<div class="px-5 pt-5 pb-20">' +
        
        // 등급 + 헤드라인
        '<div class="text-center mb-6">' +
          '<div style="display: inline-block; font-family: var(--font); font-weight: 800; font-size: 80px; line-height: 1; color: ' + gradeCol + ';">' + escapeHtml(review.grade) + '</div>' +
          '<p class="text-xs font-mono text-stone-500 uppercase tracking-widest mt-1 mb-3">이번 주 평가</p>' +
          '<p class="text-base font-display font-bold leading-relaxed">' + escapeHtml(review.headline) + '</p>' +
        '</div>' +
        
        // 통계 요약
        '<div class="grid grid-cols-3 gap-2 mb-5">' +
          '<div class="stat-card">' +
            '<p class="stat-card-label">운동</p>' +
            '<p class="stat-card-value">' + review.stats.workoutCount + '</p>' +
            '<p class="stat-card-unit">회</p>' +
          '</div>' +
          '<div class="stat-card">' +
            '<p class="stat-card-label">PR</p>' +
            '<p class="stat-card-value">' + review.stats.prCount + '</p>' +
            '<p class="stat-card-unit">개</p>' +
          '</div>' +
          '<div class="stat-card">' +
            '<p class="stat-card-label">체중</p>' +
            '<p class="stat-card-value">' + (review.stats.weightChange >= 0 ? '+' : '') + review.stats.weightChange + '</p>' +
            '<p class="stat-card-unit">kg</p>' +
          '</div>' +
        '</div>' +
        
        // 잘한 점
        (winsHtml ? 
          '<div class="review-section highlight">' +
            '<p class="text-[11px] font-mono accent uppercase tracking-widest mb-3">잘한 점</p>' +
            winsHtml +
          '</div>' : '') +
        
        // 개선점
        (improvementsHtml ? 
          '<div class="review-section warning">' +
            '<p class="text-[11px] font-mono uppercase tracking-widest mb-3" style="color: var(--warn);">개선점</p>' +
            improvementsHtml +
          '</div>' : '') +
        
        // 다음 주
        (nextWeekHtml ? 
          '<div class="review-section">' +
            '<p class="text-[11px] font-mono text-stone-400 uppercase tracking-widest mb-3">다음 주 조정</p>' +
            nextWeekHtml +
          '</div>' : '') +
        
        // 코치 한 마디
        (review.coachNote ? 
          '<div class="card-coach mt-5">' +
            '<div class="flex items-start gap-3">' +
              '<div class="coach-icon accent">' + icon('msg', 18) + '</div>' +
              '<div class="flex-1">' +
                '<p class="text-xs font-mono accent uppercase tracking-widest mb-1\\.5">코치 한마디</p>' +
                '<p class="text-sm text-stone-200 leading-relaxed">' + escapeHtml(review.coachNote) + '</p>' +
              '</div>' +
            '</div>' +
          '</div>' : '') +

        // 코치와 상담 (코치가 이 주간리뷰를 자동 인용)
        '<button class="coach-chat-card mt-5" onclick="closeWeeklyReview(); openCoachChat();" style="width: 100%;">' +
          '<div class="flex items-center gap-3">' +
            '<div class="coach-chat-icon">' + icon('msg', 22) + '</div>' +
            '<div class="flex-1 text-left">' +
              '<p class="font-display font-bold text-sm">이번 주에 대해 코치와 상담</p>' +
              '<p class="text-[11px] font-mono text-stone-400 mt-0\\.5">개선 전략 짜기</p>' +
            '</div>' +
            '<div style="color: var(--accent);">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</button>' +

      '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 정체기 상세 화면
// ═══════════════════════════════════════════════
function renderPlateauDetail() {
  var p = state.plateauCheck;
  
  if (!p) {
    return '' +
      '<div class="review-detail-screen">' +
        '<div class="coach-header">' +
          '<button class="session-header-btn" onclick="closePlateauDetail()">' + icon('close', 18) + '</button>' +
          '<div class="coach-header-info">' +
            '<div><p class="text-sm font-display font-bold">정체기 분석</p></div>' +
          '</div>' +
          '<div style="width: 36px;"></div>' +
        '</div>' +
        '<div style="padding: 80px 20px; text-align: center;">' +
          '<p class="text-sm text-stone-400">정체기 신호가 감지되지 않았어요.</p>' +
        '</div>' +
      '</div>';
  }
  
  // 신호 라벨 — js/ai.js detectPlateauSignals가 만드는 키와 **반드시** 같이 유지할 것.
  // (키가 없으면 아래 폴백이 'lift_stalled' 같은 영문 식별자를 그대로 화면에 찍는다)
  // weight_stalled는 삭제됐다 — 체중 유지 + 수행 상승은 리컴포지션 정상 진행이지 정체가 아니다.
  // 3일짜리 옛 캐시에 남아 있을 수 있어 라벨만 남겨 둔다.
  var signalLabels = {
    'lift_stalled': '무게·횟수 둘 다 정체 (4주 이상)',
    'pr_stalled': 'PR 갱신 정체 (4주)',
    'frequency_drop': '운동 빈도 감소',
    'weight_stalled': '체중 변화 없음 (옛 기준)'
  };
  
  var signalsHtml = p.signals.map(function(s) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: var(--warn);"></div>' +
      '<p>' + escapeHtml(signalLabels[s] || s) + '</p>' +
    '</div>';
  }).join('');
  
  // 권장사항
  var recsHtml = p.recommendations.map(function(r) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: var(--accent);"></div>' +
      '<p>' + escapeHtml(r) + '</p>' +
    '</div>';
  }).join('');
  
  // 심각도 색상
  var severityColors = { 'low': 'var(--warn)', 'medium': 'var(--warn)', 'high': 'var(--danger)' };
  var sevColor = Object.prototype.hasOwnProperty.call(severityColors, p.severity) ? severityColors[p.severity] : 'var(--warn)';
  var sevLabel = { 'low': '낮음', 'medium': '중간', 'high': '높음' }[p.severity] || '중간';
  
  return '' +
    '<div class="review-detail-screen">' +
      // 헤더
      '<div class="coach-header">' +
        '<button class="session-header-btn" onclick="closePlateauDetail()">' + icon('close', 18) + '</button>' +
        '<div class="coach-header-info">' +
          '<div>' +
            '<p class="text-sm font-display font-bold">정체기 분석</p>' +
            '<p class="text-[11px] font-mono text-stone-500">' + p.detectedAt + ' 감지</p>' +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="dismissPlateau()" title="알림 닫기">' + icon('close', 16) + '</button>' +
      '</div>' +
      
      '<div class="px-5 pt-5 pb-20">' +
        
        // 진단
        '<div class="text-center mb-6">' +
          '<div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: ' + sevColor + '20; border: 1px solid ' + sevColor + '60; color: ' + sevColor + '; font-size: 10px; font-family: var(--font); font-weight: 700;">심각도 ' + sevLabel + '</div>' +
          '<p class="font-bebas text-3xl mt-4 mb-2">정체기 신호 감지</p>' +
          '<p class="text-sm text-stone-300 leading-relaxed">' + escapeHtml(p.diagnosis) + '</p>' +
        '</div>' +
        
        // 주요 원인
        (p.primary_cause ? 
          '<div class="review-section warning">' +
            '<p class="text-[11px] font-mono uppercase tracking-widest mb-2" style="color: var(--warn);">주요 원인</p>' +
            '<p class="text-sm font-display font-bold">' + escapeHtml(p.primary_cause) + '</p>' +
          '</div>' : '') +
        
        // 감지된 신호
        '<div class="review-section">' +
          '<p class="text-[11px] font-mono text-stone-400 uppercase tracking-widest mb-3">감지된 신호</p>' +
          signalsHtml +
        '</div>' +
        
        // 권장 조정
        (recsHtml ? 
          '<div class="review-section highlight">' +
            '<p class="text-[11px] font-mono accent uppercase tracking-widest mb-3">→ 권장 조정</p>' +
            recsHtml +
          '</div>' : '') +
        
        // 격려
        (p.encouragement ? 
          '<div class="card-coach mt-5">' +
            '<div class="flex items-start gap-3">' +
              '<div class="coach-icon accent">' + icon('msg', 18) + '</div>' +
              '<div class="flex-1">' +
                '<p class="text-xs font-mono accent uppercase tracking-widest mb-1\\.5">코치 한마디</p>' +
                '<p class="text-sm text-stone-200 leading-relaxed">' + escapeHtml(p.encouragement) + '</p>' +
              '</div>' +
            '</div>' +
          '</div>' : '') +
        
        // 코치와 대화 버튼
        '<button class="coach-chat-card mt-5" onclick="closePlateauDetail(); openCoachChat();" style="width: 100%;">' +
          '<div class="flex items-center gap-3">' +
            '<div class="coach-chat-icon">' + icon('msg', 22) + '</div>' +
            '<div class="flex-1 text-left">' +
              '<p class="font-display font-bold text-sm">코치와 더 자세히 상담</p>' +
              '<p class="text-[11px] font-mono text-stone-400 mt-0\\.5">맞춤 계획 세우기</p>' +
            '</div>' +
            '<div style="color: var(--accent);">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</button>' +
        
      '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 기록 화면 - 핸들러
// ═══════════════════════════════════════════════

window.setStatsPeriod = function(period) {
  state.statsPeriod = period;
  render();
};

window.toggleChartView = function(view) {
  state.chartView = view;
  render();
};

window.addBodyRecord = function() {
  var lastWeight = state.data.bodyLog.length > 0 
    ? state.data.bodyLog[state.data.bodyLog.length - 1].weight 
    : state.profile.weight;
  
  var input = prompt('현재 체중 (kg)을 입력하세요:', lastWeight);
  if (input === null) return;
  
  var weight = parseFloat(input);
  if (isNaN(weight) || weight < 30 || weight > 200) {
    alert('30~200kg 사이로 입력해주세요');
    return;
  }
  
  var tdStr = getTodayStr();
  var existingIdx = state.data.bodyLog.findIndex(function(b) { return b.date === tdStr; });
  
  if (existingIdx !== -1) {
    state.data.bodyLog[existingIdx].weight = weight;
  } else {
    state.data.bodyLog.push({
      date: tdStr,
      weight: weight,
      bodyFat: null
    });
  }
  
  storage.set(KEYS.BODY_LOG, state.data.bodyLog);
  
  // 프로필 체중도 업데이트
  state.profile.weight = weight;
  storage.set(KEYS.PROFILE, state.profile);
  
  render();
};

// ═══════════════════════════════════════════════
// 기록 화면 - 렌더
// ═══════════════════════════════════════════════
function renderStats() {
  var profile = state.profile;
  var period = state.statsPeriod;
  var today = new Date();
  
  // 기간별 데이터 필터
  var bodyLog = filterByPeriod(state.data.bodyLog || [], period);
  var workoutLog = filterByPeriod(state.data.workoutLog, period);
  var personalRecords = filterByPeriod(state.data.personalRecords, period);
  
  // 정렬 (날짜 오름차순)
  bodyLog = bodyLog.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
  
  // 핵심 지표 계산
  var currentWeight = bodyLog.length > 0 ? bodyLog[bodyLog.length - 1].weight : profile.weight;
  var startWeight = bodyLog.length > 0 ? bodyLog[0].weight : profile.weight;
  var weightChange = (currentWeight - startWeight).toFixed(1);
  var weightChangeSign = weightChange >= 0 ? '+' : '';
  
  // 기간 선택 탭
  var periodTabs = ['1week', '1month', '3month', 'all'].map(function(p) {
    return '<button class="period-tab ' + (period === p ? 'active' : '') + '" onclick="setStatsPeriod(\'' + p + '\')">' + getPeriodLabel(p) + '</button>';
  }).join('');
  
  // 체중 차트 데이터 준비
  var chartData = bodyLog.map(function(b) {
    return {
      date: b.date,
      value: state.chartView === 'weight' ? b.weight : (b.bodyFat || 0)
    };
  }).filter(function(d) { return d.value > 0; });
  
  // 데이터가 너무 많으면 다운샘플링
  if (chartData.length > 30) {
    var step = Math.ceil(chartData.length / 30);
    chartData = chartData.filter(function(_, i) { return i % step === 0; });
  }
  
  var chartHtml = '';
  if (chartData.length > 0) {
    var chartW = 320;
    var chartH = 100;
    var line = generateLinePath(chartData, chartW, chartH);
    
    var yLabelsHtml = '';
    var ySteps = 4;
    for (var i = 0; i < ySteps; i++) {
      var val = line.yMax - (i * (line.yMax - line.yMin) / (ySteps - 1));
      yLabelsHtml += '<p>' + val.toFixed(1) + '</p>';
    }
    
    var gridLines = '';
    for (var i = 0; i < ySteps; i++) {
      gridLines += '<div class="chart-grid-line"></div>';
    }
    
    chartHtml = 
      '<div class="chart-container">' +
        '<div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between;">' + gridLines + '</div>' +
        '<div class="chart-y-labels">' + yLabelsHtml + '</div>' +
        '<svg style="position: absolute; left: 28px; right: 0; top: 0; bottom: 20px; width: calc(100% - 28px); height: calc(100% - 20px);" viewBox="0 0 ' + chartW + ' ' + chartH + '" preserveAspectRatio="none">' +
          '<defs>' +
            '<linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>' +
              '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path d="' + line.area + '" fill="url(#weightGrad)"/>' +
          '<path d="' + line.path + '" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
          line.points +
        '</svg>' +
        '<div class="chart-x-labels">' +
          '<p>' + (period === '1week' ? '1주전' : period === '1month' ? '4주전' : '시작') + '</p>' +
          '<p style="color: var(--accent);">오늘</p>' +
        '</div>' +
      '</div>';
  } else {
    chartHtml = 
      '<div style="height: 140px; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-family: var(--font); font-size: 12px;">' +
        '아직 데이터가 없어요' +
      '</div>';
  }
  
  // 주간 운동 차트 (4주)
  var weekWorkoutData = [];
  for (var w = 3; w >= 0; w--) {
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) - (w * 7));
    weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    var weekCount = state.data.workoutLog.filter(function(wk) {
      var wd = new Date(wk.date);
      return wd >= weekStart && wd <= weekEnd;
    }).length;
    
    weekWorkoutData.push({ week: w === 0 ? '이번주' : 'W' + (4 - w), count: weekCount, isCurrent: w === 0 });
  }
  
  var maxWeekCount = Math.max.apply(null, weekWorkoutData.map(function(w) { return w.count; }).concat([profile.workoutFreq]));
  var weekBarHeight = 100;
  
  var weekBarsHtml = '';
  weekWorkoutData.forEach(function(w) {
    var height = w.count > 0 ? Math.max(15, (w.count / maxWeekCount) * weekBarHeight) : 4;
    var cls = w.count === 0 ? 'bar-shape' : (w.isCurrent ? 'bar-shape partial' : 'bar-shape active');
    var labelStyle = w.isCurrent ? 'color: var(--accent);' : '';
    weekBarsHtml += 
      '<div class="bar-col">' +
        '<p class="bar-value" style="' + labelStyle + '">' + w.count + '</p>' +
        '<div class="' + cls + '" style="height: ' + height + 'px;"></div>' +
        '<p class="bar-label" style="' + labelStyle + '">' + w.week + '</p>' +
      '</div>';
  });
  
  // 부위별 분배 (전체 기간 또는 선택 기간)
  var pushCount = workoutLog.filter(function(w) { return w.sessionKr === 'PUSH'; }).length;
  var pullCount = workoutLog.filter(function(w) { return w.sessionKr === 'PULL'; }).length;
  var legsCount = workoutLog.filter(function(w) { return w.sessionKr === 'LEGS'; }).length;
  var upperCount = workoutLog.filter(function(w) { return w.sessionKr === 'UPPER'; }).length;
  var freeCount = workoutLog.filter(function(w) { return w.sessionKr === 'FREE'; }).length;
  var totalCount = pushCount + pullCount + legsCount + upperCount + freeCount;
  
  // 0회 항목은 빈 막대로 자리만 차지한다 → 한 번이라도 한 타입만 보여준다.
  function partRow(name, count) {
    if (!count) return '';
    var pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return '<div style="margin-bottom: 10px;">' +
      '<div class="flex items-center justify-between mb-1">' +
        '<p class="text-xs font-display">' + name + '</p>' +
        '<p class="text-[11px] font-mono text-stone-400">' + count + '회</p>' +
      '</div>' +
      '<div class="progress-bg"><div class="progress-fill" style="width: ' + pct + '%;"></div></div>' +
    '</div>';
  }

  var partsHtml = partRow('PUSH', pushCount) + partRow('PULL', pullCount) + partRow('LEGS', legsCount) + partRow('UPPER', upperCount) + partRow('FREE', freeCount);
  var partsBlock = partsHtml
    ? '<div class="border-t pt-4 mt-5">' +
        '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-3">세션 타입 분배</p>' +
        partsHtml +
      '</div>'
    : '';
  
  // 체중 기록 줄 (최신 먼저) — bodyLog 는 저장이 오래된 것부터라 뒤집어 쓴다.
  var bodyRows = (state.data.bodyLog || []).slice().reverse().map(function(b) {
    return '<div class="workout-history-row" onclick="openItemDetail(\'body\', \'' + escapeHtml(b.date) + '\')">' +
        '<div class="flex items-center gap-3">' +
          '<div class="workout-history-dot" style="background: var(--text-muted); box-shadow: 0 0 6px rgba(var(--muted-rgb), 0.45);"></div>' +
          '<div>' +
            '<p class="text-xs font-display font-bold">' + escapeHtml(b.weight) + 'kg</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + escapeHtml(b.date) + '</p>' +
          '</div>' +
        '</div>' +
        '<div style="color: var(--text-muted);">' + icon('chevron', 14) + '</div>' +
      '</div>';
  });

  // PR 히스토리
  var prListHtml = '';
  if (personalRecords.length === 0) {
    prListHtml = '<p class="text-xs text-stone-500 font-mono text-center" style="padding: 20px 0;">기간 내 PR 기록이 없어요</p>';
  } else {
    personalRecords.slice(0, 5).forEach(function(pr) {
      var prValue = (pr.weight !== undefined) ? pr.weight : pr.reps;
      // 어시스트 종목은 감소가 신기록 — formatPRChange가 방향에 맞는 문구를 만든다.
      var prChange = escapeHtml(formatPRChange(pr)).replace(/\(([^)]*)\)$/, '<span class="accent">($1)</span>');
      var unit = (pr.weight !== undefined) ? 'kg' : '회';
      
      prListHtml += 
        '<div class="pr-history-item" style="margin-bottom: 8px;">' +
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center gap-2">' +
              '<div style="color: var(--accent);">' + icon('trophy', 14) + '</div>' +
              '<p class="text-sm font-display font-bold">' + escapeHtml(pr.exerciseName) + '</p>' +
            '</div>' +
            '<p class="text-[11px] font-mono text-stone-500">' + daysAgo(pr.date) + '</p>' +
          '</div>' +
          '<div class="flex items-baseline justify-between">' +
            '<div class="flex items-baseline gap-2">' +
              '<p class="font-bebas text-2xl accent">' +
                (pr.weight !== undefined && isReverseProgression(pr.exerciseName) ? '<span class="text-sm text-stone-400">보조 </span>' : '') +
                prValue + '<span class="text-sm text-stone-400">' + unit + '</span></p>' +
              (pr.weight !== undefined ? '<p class="text-[11px] font-mono text-stone-500">× ' + pr.reps + '회</p>' : '') +
            '</div>' +
            '<p class="text-[11px] font-mono text-stone-400">' + prChange + '</p>' +
          '</div>' +
        '</div>';
    });
  }
  
  return '' +
    // 헤더 — 제목은 탭바가 대신한다. 기간 탭 + 내보내기만 남긴다.
    '<div class="px-5 pt-12 pb-4">' +
      '<div class="flex items-center gap-2">' +
        '<div class="flex gap-2 flex-1" style="overflow-x: auto;">' + periodTabs + '</div>' +
        '<button class="session-header-btn" onclick="exportData()" title="내보내기">' + icon('download', 16) + '</button>' +
      '</div>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      
      // 핵심 지표 — 카드 3장(400px) 대신 완료 화면과 같은 한 줄 3칸(120px)
      '<div class="grid grid-cols-3 gap-2 mb-4">' +
        '<div class="stat-card">' +
          '<p class="stat-card-label">체중</p>' +
          '<p class="stat-card-value">' + currentWeight.toFixed(1) + '</p>' +
          '<p class="stat-card-unit">' + (weightChange != 0 ? weightChangeSign + weightChange + 'kg' : 'kg') + '</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<p class="stat-card-label">PR</p>' +
          '<p class="stat-card-value">' + personalRecords.length + '</p>' +
          '<p class="stat-card-unit">개</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<p class="stat-card-label">운동</p>' +
          '<p class="stat-card-value">' + workoutLog.length + '</p>' +
          '<p class="stat-card-unit">주 ' + (workoutLog.length > 0 ? Math.round((workoutLog.length / Math.max(1, getPeriodDays(period) / 7)) * 10) / 10 : 0) + '회</p>' +
        '</div>' +
      '</div>' +

      // 체중/체지방 차트
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">체중 변화</p>' +
          '<button class="text-[11px] font-mono accent uppercase tracking-wider" onclick="addBodyRecord()">+ 기록</button>' +
        '</div>' +
        
        chartHtml +
      '</div>' +
      
      // 주간 운동
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">주간 운동</p>' +
        '</div>' +
        
        '<div class="bar-chart" style="height: 140px;">' + weekBarsHtml + '</div>' +
        
        partsBlock +
      '</div>' +

      // 부위별 주간 볼륨 (최근 2주 — AI 프롬프트와 같은 수치)
      volumeByPartCardHtml() +

      // 유산소 요약(기록 있을 때만)
      cardioSummaryCardHtml(period) +

      // PR 히스토리
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">PR 히스토리</p>' +
        '</div>' +
        '<div>' + prListHtml + '</div>' +
      '</div>' +
      
      // 운동 기록 (클릭하여 삭제 가능)
      (workoutLog.length > 0 ? 
        '<div class="card mb-4">' +
          '<div class="flex items-center justify-between mb-3">' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">운동 기록</p>' +
            '<p class="text-xs font-mono accent">' + workoutLog.length + '개</p>' +
          '</div>' +
          '<div>' +
            sortByDateDesc(workoutLog).slice(0, 10).map(function(w) {
              var d = new Date(w.date);
              var dStr = ['일','월','화','수','목','금','토'][d.getDay()];
              return '<div class="workout-history-row" onclick="openItemDetail(\'workout\', \'' + escapeHtml(w.startTime || w.id) + '\')">' +
                '<div class="flex items-center gap-3">' +
                  '<div class="workout-history-dot"></div>' +
                  '<div>' +
                    '<p class="text-xs font-display font-bold">' + escapeHtml(w.sessionKr || w.sessionName) + '</p>' +
                    '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + escapeHtml(w.date) + ' (' + dStr + ') · ' + escapeHtml(w.duration || 0) + '분 · ' + escapeHtml(w.sets || 0) + '세트</p>' +
                  '</div>' +
                '</div>' +
                '<div style="color: var(--text-muted);">' + icon('chevron', 14) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          (workoutLog.length > 10 ? '<p class="text-[11px] font-mono text-stone-500 text-center mt-2">최근 10개만 (총 ' + workoutLog.length + '개)</p>' : '') +
        '</div>' : '') +
      
      // 체중 기록 (클릭하여 삭제 가능)
      ((state.data.bodyLog && state.data.bodyLog.length > 0) ? 
        '<div class="card mb-4">' +
          '<div class="flex items-center justify-between mb-3">' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">체중 기록</p>' +
            '<p class="text-xs font-mono accent">' + state.data.bodyLog.length + '개</p>' +
          '</div>' +
          // 위 그래프가 추세를 이미 보여준다 → 목록은 최근 3줄만, 나머지는 접는다.
          '<div>' + bodyRows.slice(0, 3).join('') + '</div>' +
          (bodyRows.length > 3
            ? noteBlock('나머지 ' + (bodyRows.length - 3) + '개 더 보기', '<div style="margin-left:-20px;">' + bodyRows.slice(3).join('') + '</div>')
            : '') +
        '</div>' : '') +
      
      // 사이클 카드는 홈 첫 화면에 이미 있다 → 여기서는 뺀다(같은 사실 두 번 금지).

    '</div>';
}

// ═══════════════════════════════════════════════
// 부위별 주간 볼륨 카드 (STATS)
//  - AI 프롬프트(buildUserContext)가 보는 것과 "같은 함수·같은 인자(2주)"를 써서 숫자가 어긋나지 않게 한다.
//  - 기간 탭(state.statsPeriod)과 무관하게 항상 최근 2주 평균이다.
//  - 상한 초과는 '과잉'이 아니라 '이득 완만' — 볼륨-근비대 곡선이 꺾이는 지점은 아직 확인된 적이 없다
//    (Pelland 2025/2026, 67개 연구·2,058명: 기울기>0 사후확률 100%).
// ═══════════════════════════════════════════════
function volumeByPartCardHtml() {
  var WEEKS = 2; // js/ai.js buildUserContext 의 getRecentVolumeByPart(2) 와 반드시 동일
  var log = (state.data && state.data.workoutLog) ? state.data.workoutLog : [];
  if (!log.length) return '';

  // 최소 표본 가드 — 두 조건을 **모두** 만족해야 판정한다.
  //  (1) 첫 기록부터 오늘까지 14일 이상: 볼륨은 항상 2로 나눈 주간 평균이라 3일 쓴 사용자는
  //      전 부위가 '부족'으로 보인다.
  //  (2) 최근 2주 창 안에 운동이 2회 이상: (1)만 보면 1년 전에 한 번 기록한 복귀 사용자가
  //      복귀 첫날 바로 전 부위 '부족' 빨간 배지를 보게 된다 — 가드가 막으려던 바로 그 오해다.
  var dates = log.map(function(w) { return String(w.date || ''); }).filter(function(s) { return s; }).sort();
  var todayD = new Date(getTodayStr() + 'T00:00:00');
  var spanDays = 0;
  if (dates.length > 0) {
    var firstD = new Date(dates[0] + 'T00:00:00');
    spanDays = Math.floor((todayD.getTime() - firstD.getTime()) / 86400000) + 1;
  }
  var windowStartStr = getDateStr(new Date(todayD.getTime() - WEEKS * 7 * 86400000));
  var sessionsInWindow = dates.filter(function(d) { return d >= windowStartStr; }).length;
  var enoughData = spanDays >= WEEKS * 7 && sessionsInWindow >= 2;

  var split = getRecentVolumeSplitByPart(WEEKS);
  var groupedFrac = groupVolumeBy(split.fractional);
  var groupedDirect = groupVolumeBy(split.direct);

  // 판정은 도메인의 getVolumeDiagnosis 한 곳에서만 — 프롬프트와 같은 버킷을 쓴다
  var diag = getVolumeDiagnosis(split.fractional, WEEKS);
  var verdictOf = {};
  var buckets = [
    ['lacking',      '부족',      'var(--danger)',  'var(--danger-rgb)'],
    ['belowOptimal', '하한 미달', 'var(--warn)',    'var(--warn-rgb)'],
    ['optimal',      '적정',      'var(--success)', 'var(--success-rgb)'],
    ['excessive',    '이득 완만', 'var(--purple)',  'var(--purple-rgb)']
  ];
  buckets.forEach(function(b) {
    (diag[b[0]] || []).forEach(function(e) {
      verdictOf[e.group] = { text: b[1], color: b[2], rgb: b[3] };
    });
  });

  // 그룹별 행 (주간 평균 = 최근 2주 누적 / 2)
  var rows = [];
  var untouched = [];
  Object.keys(BODY_PART_GROUPS).forEach(function(g) {
    var frac = (groupedFrac[g] || 0) / WEEKS;
    if (frac <= 0) { untouched.push(BODY_PART_GROUPS[g].kr); return; }
    var th = getVolumeThresholds(g);
    rows.push({
      kr: BODY_PART_GROUPS[g].kr,
      frac: frac,
      direct: (groupedDirect[g] || 0) / WEEKS,
      th: th,
      verdict: verdictOf[g] || null
    });
  });

  var head =
    '<div class="flex items-center justify-between mb-1">' +
      '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">부위별 주간 볼륨</p>' +
      '<p class="text-[11px] font-mono text-stone-500">최근 2주 평균</p>' +
    '</div>';

  if (rows.length === 0) {
    return '<div class="card mb-4">' + head +
        '<p class="text-xs text-stone-500 font-mono text-center" style="padding: 16px 0;">최근 2주 세트 기록이 없어요</p>' +
      '</div>';
  }

  // 모자란 부위가 위로 (숫자는 그대로, 보는 순서만 바꾼다)
  rows.sort(function(a, b) { return (a.frac / a.th.optimalLow) - (b.frac / b.th.optimalLow); });

  // 한 행 = 부위명 + 상태 배지 + 가로 막대(적정 범위 밴드) + 직접/간접 세트 수
  function volRow(r) {
    var color = 'var(--text-muted)';
    var rgb = 'var(--muted-rgb)';
    var pill = '';
    if (enoughData && r.verdict) {
      color = r.verdict.color;
      rgb = r.verdict.rgb;
      pill = '<span class="meal-status-pill" style="color: ' + color + '; background: rgba(' + rgb + ', 0.15);">' + r.verdict.text + '</span>';
    }
    // 눈금 상한 = 적정 상한 × 1.4 → 큰/작은 근육 모두 밴드가 같은 위치(36%~71%)에 와서 한눈에 비교된다
    var scaleMax = r.th.optimalTop * 1.4;
    var pctFrac = Math.min(100, (r.frac / scaleMax) * 100);
    var pctDirect = Math.min(100, (r.direct / scaleMax) * 100);
    var bandL = (r.th.optimalLow / scaleMax) * 100;
    var bandR = (r.th.optimalTop / scaleMax) * 100;

    return '<div style="margin-bottom: 12px;">' +
      '<div class="flex items-center justify-between mb-1">' +
        '<p class="text-xs font-display font-bold">' + r.kr + '</p>' +
        pill +
      '</div>' +
      '<div class="progress-bg" style="position: relative; height: 9px;">' +
        // 적정 범위 밴드
        '<div style="position: absolute; top: 0; bottom: 0; left: ' + bandL.toFixed(1) + '%; width: ' + (bandR - bandL).toFixed(1) + '%; background: rgba(var(--success-rgb), 0.16);"></div>' +
        // 간접 포함(분할환산) — 연한 막대
        '<div style="position: absolute; top: 0; bottom: 0; left: 0; width: ' + pctFrac.toFixed(1) + '%; border-radius: 9999px; background: rgba(' + rgb + ', 0.38);"></div>' +
        // 직접 세트(primary) — 진한 막대
        '<div style="position: absolute; top: 0; bottom: 0; left: 0; width: ' + pctDirect.toFixed(1) + '%; border-radius: 9999px; background: ' + color + ';"></div>' +
        // 적정 하한/상한 눈금
        '<div style="position: absolute; top: 0; bottom: 0; left: ' + bandL.toFixed(1) + '%; width: 1px; background: rgba(var(--white-rgb), 0.45);"></div>' +
        '<div style="position: absolute; top: 0; bottom: 0; left: ' + bandR.toFixed(1) + '%; width: 1px; background: rgba(var(--white-rgb), 0.45);"></div>' +
      '</div>' +
      '<div class="flex items-center justify-between mt-1">' +
        '<p class="text-[11px] font-mono text-stone-500">직접 ' + r.direct.toFixed(1) + ' · 간접 포함 ' + r.frac.toFixed(1) + '세트/주</p>' +
        '<p class="text-[11px] font-mono text-stone-600 flex-shrink-0">적정 ' + r.th.optimalLow + '~' + r.th.optimalTop + '</p>' +
      '</div>' +
    '</div>';
  }

  // 판정 보류 안내는 접어 둔다 — 판정 배지가 없다는 것 자체가 이미 신호다.
  var guardHtml = enoughData ? '' :
    noteBlock('아직 판단하기 일러요 — 세트 수만 보여줘요',
      '기록이 2주 이상 쌓이면 부족·적정을 표시해요.');

  return '<div class="card mb-4">' + head +
      '<p class="text-[11px] font-mono text-stone-600 mb-3">진한 막대 = 직접 세트 · 연한 막대 = 간접 포함</p>' +
      guardHtml +
      rows.map(volRow).join('') +
      (untouched.length > 0 ? '<p class="text-[11px] font-mono text-stone-600 mt-2">주 0세트: ' + untouched.join(' · ') + '</p>' : '') +
      noteBlock('이 범위는 어디서 왔나요?',
        '연구 평균이라 본인 반응은 다를 수 있어요. 간접 세트는 보조근을 0.5로 셈해요.') +
    '</div>';
}


// ═══════════════════════════════════════════════
// 자리표시 화면
// ═══════════════════════════════════════════════
function renderPlaceholder(title, label, iconName) {
  return '' +
    '<div class="px-5 pt-12 pb-32">' +
      '<p class="text-xs uppercase font-mono text-stone-500 mb-2" style="letter-spacing: 0.3em;">' + label + '</p>' +
      '<h1 class="font-bebas text-4xl">' + title + '</h1>' +
      '<div class="mt-20 text-center">' +
        '<div class="placeholder-icon">' + icon(iconName, 36) + '</div>' +
        '<p class="text-sm text-stone-500 font-mono">준비 중</p>' +
        '<p class="text-xs text-stone-600 mt-2 leading-relaxed">아직 준비 중이에요</p>' +
      '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 러닝(유산소) 화면 — 러닝머신 인터벌 유산소 (2단계)
//   흐름: 시간(분) 입력 → generateCardioInterval(AI) 구성 → 미리보기 → 시작
//        → 실행화면(정밀 타이머·소리 알림·속력 조정) → 종료 → RPE 입력 → saveCardioSession
//   ⓐ 시간 측정은 performance.now() 절대시각 기준(setInterval 드리프트 금지, 백그라운드 복귀 시 재동기화).
//   ⓑ 소리는 Web Audio 오실레이터(파일 없이). 구간 경계 3초 전 예고음 + 경계 전환음(올림/내림 톤 구분).
//   ⓒ 백그라운드(안드로이드): 무음 오디오 루프 + Wake Lock으로 화면 꺼짐/유튜브 중에도 소리 유지 시도(실패해도 안죽음).
// ═══════════════════════════════════════════════

// 런타임 핸들(직렬화 대상 아님 — 오디오 컨텍스트·타이머·웨이크락). state 밖 모듈 변수.
var cardioRuntime = { intervalId: null, audioCtx: null, keepAlive: null, scheduled: [], wakeLock: null, visHandler: null };

// 단조 증가 시계(performance.now 우선, 없으면 Date.now). start/elapsed 를 같은 시계로 통일.
function cardioNow() {
  return (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
}

// state.cardio 지연 초기화(core.js state 에 없으므로 여기서 안전하게 확보).
// mode: 'interval'(걷기·뛰기 인터벌 · 기본값) | 'walk'(경사 걷기). 기존 사용자 흐름이 바뀌지 않도록 기본은 interval.
function ensureCardioState() {
  if (!state.cardio) state.cardio = { mode: 'interval', phase: 'idle', inputMin: '', loading: false, error: null, plan: null, run: null, reqId: 0 };
  if (!state.cardio.mode) state.cardio.mode = 'interval';        // 옛 저장분 복원 시 하위 호환
  return state.cardio;
}

// 현재 유산소 모드 — state 가 없거나 옛 데이터면 'interval'.
function cardioMode() {
  return (state.cardio && state.cardio.mode === 'walk') ? 'walk' : 'interval';
}

// 초 → "MM:SS"(1시간+면 "H:MM:SS")
function cardioFmtClock(totalSec) {
  totalSec = Math.max(0, Math.floor(totalSec || 0));
  var h = Math.floor(totalSec / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
// mode 를 넘기면 걷기(경사) 모드용 이름으로 바꿔 준다. 안 넘기면 기존(인터벌) 이름 그대로 — 하위 호환.
function cardioTypeLabel(type, mode) {
  if (mode === 'walk') {
    return type === 'warmup' ? '몸풀기' : type === 'cooldown' ? '정리' : '본 구간';
  }
  return type === 'run' ? '뛰기' : type === 'walk' ? '걷기' : type === 'warmup' ? '워밍업' : type === 'cooldown' ? '쿨다운' : '구간';
}
// 구간 요약 — 인터벌 계획은 "뛰기 1분 / 걷기 2분"이 6번 되풀이돼 17줄이 된다.
// 앞(워밍업)·뒤(쿨다운)를 떼고, 가운데가 같은 단위의 반복이면 접어서 돌려준다.
//   { head, unit, times, rest, tail }  — rest 는 반복이 끊긴 뒤 남은 구간(총 시간 맞추느라
//   마지막 걷기만 1분으로 잘리는 경우가 흔하다). 반복이 2회 미만이면 null → 접지 않고 그대로 편다.
// 순수 함수(입력 배열을 바꾸지 않는다).
function cardioPlanSummary(segments) {
  var segs = segments || [];
  if (segs.length < 6) return null;                       // 짧으면 접을 이득이 없다
  var keyOf = function(s) {
    return s.type + '|' + Math.round((s.endSec - s.startSec)) + '|' +
      (Number(s.speed) || 0).toFixed(1) + '|' + cardioFmtIncline(s.incline) + '|' + (s.label || '');
  };
  var headN = (segs[0] && segs[0].type === 'warmup') ? 1 : 0;
  var tailN = (segs[segs.length - 1] && segs[segs.length - 1].type === 'cooldown') ? 1 : 0;
  var mid = segs.slice(headN, segs.length - tailN);
  if (mid.length < 4) return null;

  // 단위 길이 u 를 앞에서부터 시험해, 앞쪽이 몇 번 온전히 되풀이되는지 센다.
  var best = null;
  for (var u = 1; u <= 4; u++) {
    if (mid.length < u * 2) break;
    var times = 1;
    while ((times + 1) * u <= mid.length) {
      var same = true;
      for (var i = 0; i < u; i++) {
        if (keyOf(mid[times * u + i]) !== keyOf(mid[i])) { same = false; break; }
      }
      if (!same) break;
      times++;
    }
    if (times >= 2 && (!best || times * u > best.times * best.u)) best = { u: u, times: times };
  }
  if (!best) return null;

  return {
    head: segs.slice(0, headN),
    unit: mid.slice(0, best.u),
    times: best.times,
    rest: mid.slice(best.u * best.times),
    tail: tailN ? segs.slice(segs.length - tailN) : []
  };
}

// 구간 이름: 걷기 모드는 계획이 준 label(몸풀기/준비 구간/본 구간/정리)을 우선 — 램프 구간을 구분해 보여주기 위함.
function cardioSegDisplayLabel(seg, mode) {
  if (!seg) return '';
  if (mode === 'walk') return seg.label || cardioTypeLabel(seg.type, 'walk');
  return cardioTypeLabel(seg.type);
}
// 경사 표시: 정수는 "8", 반 칸은 "8.5"
function cardioFmtIncline(v) {
  var n = Number(v);
  if (!isFinite(n) || n < 0) n = 0;
  return (n % 1 === 0) ? String(n) : n.toFixed(1);
}
// "경사 8% · 5.0km/h" — 경사와 속도는 항상 함께 말한다(§3-4: 하나만 말하면 나머지를 건드린다).
function cardioInclineLabel(seg) {
  if (!seg) return '';
  var spd = Number((seg.targetSpeed != null) ? seg.targetSpeed : seg.speed) || 0;
  return '경사 ' + cardioFmtIncline(seg.incline) + '% · ' + spd.toFixed(1) + 'km/h';
}
// 다음 구간 안내 문구 — "올리세요/내리세요"로 방향을 명시한다(§3-4).
function cardioInclineCue(cur, next) {
  if (!next) return '곧 완주!';
  var ci = Number(cur && cur.incline) || 0;
  var ni = Number(next.incline) || 0;
  var spd = Number((next.targetSpeed != null) ? next.targetSpeed : next.speed) || 0;
  var dir = (ni > ci) ? '올리세요' : (ni < ci) ? '내리세요' : '유지';
  return '곧 경사 ' + cardioFmtIncline(ni) + '% · 속도 ' + spd.toFixed(1) + ' ' + dir;
}
// 본 구간에서 소리 없이 화면에만 띄우는 코칭 문구(§3-3). 진입 2분 뒤부터 5분마다 회전.
function cardioWalkTip(seg, elapsed) {
  if (!seg || seg.type !== 'walk') return '';
  if (typeof WALK_COACH_TIPS === 'undefined' || !WALK_COACH_TIPS.length) return '';
  var into = elapsed - seg.startSec;
  if (!(into >= 120)) return '';
  var i = Math.floor((into - 120) / 300) % WALK_COACH_TIPS.length;
  return WALK_COACH_TIPS[i];
}

// RUNNING 탭 아이콘 이름 — data.js 에 러닝 아이콘이 추가되면 자동 사용, 없으면 clock 로 안전 폴백
// (icon() 은 미등록 이름에서 예외를 던지므로 반드시 존재 확인 후 반환).
function cardioTabIconName() {
  var cand = ['running', 'run', 'runner', 'shoe', 'footsteps', 'sneaker', 'treadmill'];
  if (typeof ICONS !== 'undefined' && ICONS) {
    for (var i = 0; i < cand.length; i++) { if (ICONS[cand[i]]) return cand[i]; }
  }
  return 'clock';
}

// ── AI 응답 정규화 & 로컬 폴백 구성 ─────────────────────────────
// generateCardioInterval 결과를 안전한 구간 배열로 정규화(연속·정렬 보장, 속력 숫자화).
function cardioNormalizePlan(res, min, mode) {
  var isWalk = (mode === 'walk');
  var segsIn = (res && res.segments) ? res.segments : [];
  var segs = [];
  var cursor = 0;
  for (var i = 0; i < segsIn.length; i++) {
    var s = segsIn[i] || {};
    var type = (s.type === 'run' || s.type === 'walk' || s.type === 'warmup' || s.type === 'cooldown') ? s.type : 'walk';
    var start = (typeof s.startSec === 'number') ? s.startSec : cursor;
    var end = (typeof s.endSec === 'number') ? s.endSec : (start + 60);
    if (end <= start) end = start + 30;
    var speed = Number(s.speed);
    if (!isFinite(speed) || speed < 0) speed = isWalk ? WALK_PRESCRIPTION.speedDefault
      : (type === 'run' ? 8.0 : type === 'walk' ? 5.5 : type === 'warmup' ? 5.0 : 5.0);
    var seg = { startSec: Math.round(start), endSec: Math.round(end), type: type, speed: Math.round(speed * 10) / 10, label: s.label || cardioTypeLabel(type, mode) };
    if (isWalk) {
      // 경사는 화면 진입 직전에도 한 번 더 잘라낸다(상한 12% 절대 초과 금지 — §1-3).
      var inc = Number(s.incline);
      if (!isFinite(inc) || inc < 0) inc = 0;
      if (inc > WALK_PRESCRIPTION.inclineMax) inc = WALK_PRESCRIPTION.inclineMax;
      seg.incline = Math.round(inc * 2) / 2;
    }
    segs.push(seg);
    cursor = end;
  }
  // 정렬 후 0 부터 연속으로 재배치(겹침·구멍 제거) → 총시간 명확
  segs.sort(function(a, b) { return a.startSec - b.startSec; });
  var t = 0;
  for (var j = 0; j < segs.length; j++) {
    var dur = Math.max(5, segs[j].endSec - segs[j].startSec);
    segs[j].startSec = t; segs[j].endSec = t + dur; t += dur;
  }
  if (!segs.length) return isWalk ? buildFallbackWalk(min, !state.apiKey) : buildFallbackInterval(min, !state.apiKey);
  return {
    headline: res.headline || (Math.round(t / 60) + (isWalk ? '분 경사 걷기' : '분 인터벌')),
    totalSec: t, segments: segs, note: res.note || '', source: 'ai'
  };
}

// AI 미사용(키 없음·함수 없음·오류) 시 로컬 보수적 구성 — cardio-research.md 첫 회 처방 기반.
// 워밍업 걷기 → [뛰기 1분 + 걷기 2분] 반복 → 쿨다운 걷기. 시간 짧으면 워밍업/쿨다운 압축(최소 2분).
function buildFallbackInterval(min, noKey) {
  var T = Math.max(5, Math.min(120, Math.round(min || 30)));
  var totalSec = T * 60;                                 // 항상 60의 배수(=30의 배수)
  function snap30(x) { return Math.round(x / 30) * 30; } // 30초 격자에 맞춤(구간 길이 30초 단위)
  var wu = Math.min(300, Math.max(120, snap30(totalSec * 0.2)));
  var cd = Math.min(300, Math.max(120, snap30(totalSec * 0.2)));
  if (wu + cd > totalSec - 60) { // 본 인터벌 최소 60초 확보
    wu = Math.max(60, snap30((totalSec - 60) / 2));
    cd = Math.max(60, totalSec - 60 - wu);
    if (wu + cd > totalSec) { wu = snap30(totalSec * 0.3); cd = totalSec - wu; }
  }
  var midSec = Math.max(0, totalSec - wu - cd);          // 30배수들의 차 → 30배수
  var segs = [];
  var t = 0;
  function push(type, dur, speed) { if (dur <= 0) return; segs.push({ startSec: t, endSec: t + dur, type: type, speed: speed, label: cardioTypeLabel(type) }); t += dur; }
  push('warmup', wu, 5.0);
  var remaining = midSec;
  // ★첫 회 기본 하한(사용자=중급): 뛰기 8.0, 걷기 회복 5.5, 워밍업·쿨다운 걷기 5.0. RUN/WALK 길이는 30초 배수.
  var RUN = 60, WALK = 120, RUNSPD = 8.0, WALKSPD = 5.5;
  while (remaining >= RUN + WALK) { push('run', RUN, RUNSPD); push('walk', WALK, WALKSPD); remaining -= (RUN + WALK); }
  if (remaining >= RUN) { push('run', RUN, RUNSPD); remaining -= RUN; if (remaining > 0) { push('walk', remaining, WALKSPD); remaining = 0; } }
  else if (remaining > 0) { push('walk', remaining, WALKSPD); remaining = 0; }
  push('cooldown', cd, 5.0);
  var tot = segs.length ? segs[segs.length - 1].endSec : totalSec;
  var note = '완주가 목표예요. 힘들면 속력을 낮추세요.';
  if (noKey) note += ' (더보기에서 AI 키를 넣으면 기록 기반 맞춤 구성을 받아요.)';
  return { headline: '오늘 ' + T + '분 · 몸풀기 → 걷기·뛰기 반복 → 정리', totalSec: tot, segments: segs, note: note, source: 'fallback' };
}

// AI 미사용(키 없음·함수 없음·오류) 시 경사 걷기 로컬 구성 — §3-2 4구간 구조를 시간에 맞춰 스케일.
// 경사는 최근 걷기 기록에서 이어받고(하향 게이트 반영), 기록이 없으면 4%(허리 이력 있으면 3%).
function buildFallbackWalk(min, noKey) {
  var asked = Math.max(5, Math.min(120, Math.round(min || 30)));
  // 본 구간 33분 상한(§4-1) → 세션 총시간은 45분까지. 더 길게 요청하면 잘리고, 그 사실을 note 로 알린다.
  var totalSec = cardioWalkClampTotalSec(asked * 60);
  var T = Math.round(totalSec / 60);
  var ctx = cardioWalkContext();
  var inc = ctx.anchorIncline;

  var segs = (cardioFitToTotal(buildWalkRawSegments(totalSec, inc), totalSec, {
    incline: true, inclineMax: ctx.cap,
    allowedTypes: CARDIO_WALK_ALLOWED_TYPES,                 // run 금지는 코드가 강제
    speedMin: WALK_PRESCRIPTION.speedMin, speedMax: WALK_PRESCRIPTION.speedMax
  }) || []).map(function(s) {
    return { startSec: s.startSec, endSec: s.endSec, type: s.type, speed: s.speed, incline: s.incline, label: s.label };
  });
  var tot = segs.length ? segs[segs.length - 1].endSec : totalSec;
  var note = '본 구간은 아무것도 바꾸지 않고 그대로 걸어요. 손잡이는 놓고(균형이 필요하면 손가락만 가볍게), ' +
    '"문장은 말할 수 있는데 노래는 안 되는" 정도로 유지하세요.';
  if (ctx.back) note += ' 가슴은 들고 허리는 곧게 — 접히는 곳은 허리가 아니라 고관절이에요.';
  if (asked > T) note += ' 본 구간 상한(33분)에 맞춰 ' + T + '분으로 줄였어요. 더 채우고 싶으면 세션을 늘리지 말고 횟수를 늘리세요.';
  if (noKey) note += ' (더보기에서 AI 키를 넣으면 기록 기반 맞춤 구성을 받아요.)';
  return {
    headline: '오늘 ' + T + '분 · 경사 ' + cardioFmtIncline(inc) + '% 정속 걷기',
    totalSec: tot, segments: segs, note: note, source: 'fallback'
  };
}

// ── 모드 전환(인터벌 ↔ 경사 걷기) ─────────────────────────────
window.setCardioMode = function(mode) {
  ensureCardioState();
  var c = state.cardio;
  var next = (mode === 'walk') ? 'walk' : 'interval';
  if (c.mode === next) return;
  if (c.phase === 'running' || c.phase === 'rpe') return;      // 진행 중엔 못 바꿈
  c.mode = next;
  c.plan = null; c.phase = 'idle'; c.error = null;             // 모드가 다르면 구성도 다르다 → 초기화
  // ★생성 중(AI 대기)에 모드를 바꾸면 먼저 보낸 요청의 응답이 나중에 도착한다.
  //   그 응답이 새 모드 화면에 꽂히면 경사 없는 걷기 세션(또는 그 반대)이 만들어지고 기록도 잘못된 모드로 저장된다.
  //   토큰을 올려 "지금 유효한 요청"을 바꾸면, 늦게 온 옛 응답은 buildCardioPlan 에서 버려진다.
  c.reqId = (c.reqId || 0) + 1;
  c.loading = false;
  render();
};

// ── 시간(분) 입력 → 구성 만들기 ─────────────────────────────
window.buildCardioPlan = function(explicitMin) {
  ensureCardioState();
  var c = state.cardio;
  var mode = cardioMode();
  var min = explicitMin;
  if (min == null) {
    var el = (typeof document !== 'undefined' && document.getElementById) ? document.getElementById('cardio-min-input') : null;
    min = el ? parseInt(el.value, 10) : NaN;
  }
  if (!min || isNaN(min) || min < 5) { showToast('5분 이상 입력해 주세요', true); return; }
  if (min > 120) min = 120;
  c.inputMin = min; c.loading = true; c.error = null; c.plan = null; c.phase = 'idle';
  // 이 요청의 표. 응답이 돌아왔을 때 이 값이 그대로면 "아직 유효한 요청", 달라졌으면 모드가 바뀐 뒤라 버린다.
  c.reqId = (c.reqId || 0) + 1;
  var myReq = c.reqId;
  function stale() { return c.reqId !== myReq; }
  render();

  var generate = (mode === 'walk') ? (typeof generateCardioWalk === 'function' ? generateCardioWalk : null)
                                   : (typeof generateCardioInterval === 'function' ? generateCardioInterval : null);
  function usefallback() {
    if (stale()) return;
    c.loading = false;
    c.plan = (mode === 'walk') ? buildFallbackWalk(min, !state.apiKey) : buildFallbackInterval(min, !state.apiKey);
    c.phase = 'preview';
    render();
  }
  try {
    if (generate) {
      Promise.resolve(generate(min)).then(function(res) {
        if (stale()) return;                                   // 모드가 바뀐 뒤 도착한 옛 응답 → 폐기
        if (res && res.segments && res.segments.length) {
          c.loading = false; c.plan = cardioNormalizePlan(res, min, mode); c.phase = 'preview'; render();
        } else {
          usefallback(); // null(키 없음) 또는 형식 이상 → 로컬 폴백
        }
      }).catch(function() { usefallback(); });
    } else {
      usefallback();
    }
  } catch (e) { usefallback(); }
};

window.resetCardioPlan = function() {
  ensureCardioState();
  state.cardio.plan = null; state.cardio.phase = 'idle';
  render();
};

// ── 실행 시작 ─────────────────────────────
window.startCardio = function() {
  ensureCardioState();
  var c = state.cardio;
  if (!c.plan || !c.plan.segments || !c.plan.segments.length) { showToast('먼저 구성을 만들어 주세요', true); return; }
  if (state.activeSession) { showToast('웨이트 세션 중에는 시작할 수 없어요', true); return; }
  var mode = cardioMode();
  var segs = c.plan.segments.map(function(s) {
    return {
      type: s.type,
      targetSpeed: Number(s.speed) || 0,
      actualSpeed: Number(s.speed) || 0,   // 실제 속력 = 목표에서 시작, 구간별로 조정 가능
      incline: Math.max(0, Number(s.incline) || 0),   // 경사 % — 인터벌 모드는 항상 0(하위 호환)
      startSec: s.startSec, endSec: s.endSec,
      sec: Math.max(0, Math.round(s.endSec - s.startSec)),
      label: s.label || cardioTypeLabel(s.type, mode)
    };
  });
  var totalSec = segs.length ? segs[segs.length - 1].endSec : (c.plan.totalSec || 0);
  var now = cardioNow();
  c.run = {
    startPerf: now,               // 경과 기준(단조 시계)
    startedAtWall: Date.now(),    // 복원 기준 벽시계(performance.now 는 세션 간 이어지지 않음)
    lastIntegratePerf: now,       // 거리 적분 기준점(단조 시계)
    lastIntegrateElapsed: 0,      // 거리 적분 기준점(경과초) — 구간별 정확 적분·복원용
    segs: segs, totalSec: totalSec, curIdx: 0,
    distanceKm: 0, soundOn: true, completed: false, elapsedAtEnd: null,
    handrail: null                // 걷기 모드 종료 후 문항(§5-2) — 다음 세션 경사를 정하는 입력
  };
  c.phase = 'running';
  saveActiveCardio();             // 시작 즉시 저장(백그라운드 회수·새로고침에도 진행 유지)

  // 오디오·웨이크락·가시성핸들러·정밀타이머 기동. 사용자 탭 제스처(이 함수) 안이라 안드로이드에서 소리가 난다.
  cardioStartRuntime(0);
  render();
};

// 런타임(오디오·톤·웨이크락·가시성핸들러·정밀타이머) 기동 — 새 시작과 복원(이어하기) 공용.
// fromElapsed: 톤 예약 시작 기준 경과초(새 시작=0, 복원=현재 경과). 복원 경로는 사용자 제스처가 없어
// 오디오가 suspended 로 시작될 수 있으나, 이후 탭(속력조정)·가시성 복귀에서 resume 된다.
function cardioStartRuntime(fromElapsed) {
  fromElapsed = fromElapsed || 0;
  cardioStartAudio();
  cardioScheduleTones(fromElapsed);
  cardioRequestWakeLock();
  if (typeof document !== 'undefined' && document.addEventListener) {
    cardioRuntime.visHandler = function() {
      if (!(state.cardio && state.cardio.phase === 'running' && state.cardio.run)) return;
      var run = state.cardio.run;
      if (document.visibilityState !== 'visible') {
        // 백그라운드로 감 — 경과분 적분 후 최신 진행 저장(메모리 회수 대비)
        cardioIntegrate();
        saveActiveCardio();
        return;
      }
      // 복귀: 웨이크락 재획득 + 오디오 재개 + 경과분 정확 적분 + 현재 구간 재계산 + 톤 재예약 + 화면 재동기화
      cardioRequestWakeLock();
      if (cardioRuntime.audioCtx && cardioRuntime.audioCtx.resume) { try { cardioRuntime.audioCtx.resume(); } catch (e) {} }
      var el = (cardioNow() - run.startPerf) / 1000; if (el < 0) el = 0;
      cardioIntegrate();                             // 자리 비운 사이 경과분을 구간별 실제속력으로 정확히 적분
      if (el >= run.totalSec) { finishCardio(); return; }   // 자리 비운 사이 완주됨
      run.curIdx = cardioSegIndexAt(run.segs, el);   // 복귀 즉시 현재 구간 재계산(최대 250ms 스테일 표시 방지)
      cardioScheduleTones(el);
      cardioPaintDynamic(el);
      saveActiveCardio();
    };
    document.addEventListener('visibilitychange', cardioRuntime.visHandler);
  }
  cardioStartInterval();
}

// ── 정밀 타이머 ─────────────────────────────
function cardioStartInterval() {
  cardioClearInterval();
  if (typeof setInterval === 'undefined') return;
  cardioRuntime.intervalId = setInterval(cardioTick, 250);
}
function cardioClearInterval() {
  if (cardioRuntime.intervalId) { try { clearInterval(cardioRuntime.intervalId); } catch (e) {} cardioRuntime.intervalId = null; }
}
// 현재 시각 t(초)가 속한 구간 인덱스
function cardioSegIndexAt(segs, t) {
  for (var i = 0; i < segs.length; i++) { if (t < segs[i].endSec) return i; }
  return segs.length - 1;
}
// 이동거리 적분: 마지막 적분 지점(경과초)부터 현재 경과초까지를 "구간 경계로 쪼개어" 각 구간의
// 실제속력으로 더한다. 백그라운드로 여러 구간 경계를 지나 복귀해도(공백이 커도) 구간별 속력으로
// 정확히 적분된다(옛 버전은 공백 전체를 현재 한 구간 속력으로 곱해 과·과소 계상됐다).
// 매 틱·속력변경·구간전환·복귀·종료 시 호출. 경과는 performance.now 기준(startPerf)으로 계산.
function cardioIntegrate() {
  var run = state.cardio && state.cardio.run; if (!run) return;
  var now = cardioNow();
  var toEl = (now - run.startPerf) / 1000;
  if (toEl < 0) toEl = 0;
  if (toEl > run.totalSec) toEl = run.totalSec;
  var fromEl = (typeof run.lastIntegrateElapsed === 'number')
    ? run.lastIntegrateElapsed
    : ((run.lastIntegratePerf - run.startPerf) / 1000);
  if (!(fromEl >= 0)) fromEl = 0;
  if (toEl > fromEl) {
    var segs = run.segs;
    for (var i = 0; i < segs.length; i++) {
      var lo = Math.max(fromEl, segs[i].startSec);
      var hi = Math.min(toEl, segs[i].endSec);
      if (hi > lo) run.distanceKm += (segs[i].actualSpeed || 0) * (hi - lo) / 3600;
    }
  }
  run.lastIntegratePerf = now;
  run.lastIntegrateElapsed = toEl;
}
// 매 250ms: 경과를 performance.now 절대차로 재계산(드리프트 0). 화면은 부분 갱신(전체 render 아님).
function cardioTick() {
  if (!(state.cardio && state.cardio.phase === 'running' && state.cardio.run)) { cardioClearInterval(); return; }
  var run = state.cardio.run;
  var elapsed = (cardioNow() - run.startPerf) / 1000; if (elapsed < 0) elapsed = 0;
  cardioIntegrate();
  if (elapsed >= run.totalSec) { finishCardio(); return; }
  var idx = cardioSegIndexAt(run.segs, elapsed);
  var segChanged = (idx !== run.curIdx);
  if (segChanged) {
    run.curIdx = idx;
    if (typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(120); } catch (e) {} }
  }
  cardioPaintDynamic(elapsed);
  // 진행 저장: 구간 전환 시 즉시, 그 외엔 ~3초마다(백그라운드 회수·새로고침 대비 · 저장 폭주 방지)
  var nowWall = Date.now();
  if (segChanged || !run._lastSaveWall || (nowWall - run._lastSaveWall) >= 3000) {
    run._lastSaveWall = nowWall;
    saveActiveCardio();
  }
}
// 실행화면의 동적 요소만 id 로 직접 갱신(전체 재렌더 없이 → 깜빡임·포커스 손실 방지).
function cardioPaintDynamic(elapsed) {
  if (typeof document === 'undefined' || !document.getElementById) return;
  var run = state.cardio && state.cardio.run; if (!run) return;
  var idx = run.curIdx;
  var seg = run.segs[idx]; if (!seg) return;
  var next = run.segs[idx + 1] || null;
  var mode = cardioMode();
  var isWalk = (mode === 'walk');
  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  set('cardio-elapsed', cardioFmtClock(elapsed));
  set('cardio-seg-icon', cardioTypeIcon(seg.type, mode));
  set('cardio-seg-label', cardioSegDisplayLabel(seg, mode));
  set('cardio-seg-remain', '남은 ' + cardioFmtClock(Math.max(0, Math.ceil(seg.endSec - elapsed))));
  set('cardio-target', (seg.targetSpeed || 0).toFixed(1));
  set('cardio-actual', (seg.actualSpeed || 0).toFixed(1));
  set('cardio-dist', run.distanceKm.toFixed(2));
  set('cardio-segcount', (idx + 1) + ' / ' + run.segs.length);
  if (isWalk) {
    set('cardio-incline', cardioFmtIncline(seg.incline));
    set('cardio-next', next ? (cardioTypeIcon(next.type, mode) + ' ' + cardioSegDisplayLabel(next, mode) + ' · ' + cardioInclineLabel(next)) : '마지막 구간');
    // 본 구간 코칭 문구(무음) — 소리는 "지금 뭘 바꿔야 한다"는 신호로만 아껴 쓴다(§3-4)
    var tipEl = document.getElementById('cardio-tip');
    if (tipEl) {
      var tip = cardioWalkTip(seg, elapsed);
      if (tip) { tipEl.style.display = ''; tipEl.textContent = tip; }
      else { tipEl.style.display = 'none'; tipEl.textContent = ''; }
    }
  } else {
    set('cardio-next', next ? (cardioTypeIcon(next.type) + ' ' + cardioTypeLabel(next.type) + ' ' + (next.targetSpeed || 0).toFixed(1)) : '마지막 구간');
  }
  var pf = document.getElementById('cardio-progress-fill');
  if (pf) { var pct = run.totalSec > 0 ? Math.min(100, (elapsed / run.totalSec) * 100) : 0; pf.style.width = pct.toFixed(1) + '%'; }
  var pc = document.getElementById('cardio-precue');
  if (pc) {
    // 걷기 모드는 10초 전 예고 — 콘솔까지 손을 뻗고 버튼을 누르고 경사 모터가 이동하는 시간이 필요하다(§7-4).
    var lead = isWalk ? WALK_PRESCRIPTION.precueSec : 3;
    var ttl = seg.endSec - elapsed;
    if (ttl > 0 && ttl <= lead) {
      pc.style.display = '';
      if (isWalk) {
        pc.textContent = cardioInclineCue(seg, next) + ' (' + Math.ceil(ttl) + ')';
      } else {
        pc.textContent = next ? ('곧 ' + cardioTypeIcon(next.type) + ' ' + cardioTypeLabel(next.type) + ' ' + (next.targetSpeed || 0).toFixed(1) + '! (' + Math.ceil(ttl) + ')') : ('곧 완주! (' + Math.ceil(ttl) + ')');
      }
    } else { pc.style.display = 'none'; pc.textContent = ''; }
  }
}

// 속력 −/+ 조정: 현재 구간의 실제속력 변경 → 그 값이 기록됨. 부분 갱신만.
window.adjustCardioSpeed = function(delta) {
  var run = state.cardio && state.cardio.run; if (!run) return;
  cardioIntegrate(); // 바뀌기 전 속력으로 지금까지 거리 적분
  var seg = run.segs[run.curIdx]; if (!seg) return;
  var v = (seg.actualSpeed || 0) + delta;
  if (v < 0.5) v = 0.5; if (v > 25) v = 25;
  seg.actualSpeed = Math.round(v * 10) / 10;
  if (typeof document !== 'undefined' && document.getElementById) {
    var el = document.getElementById('cardio-actual'); if (el) el.textContent = seg.actualSpeed.toFixed(1);
  }
  // 실제속력이 바뀌면 다가올 경계음(올림/내림 판정)이 달라지므로 재예약한다. 진행도 즉시 저장.
  if (cardioRuntime.audioCtx && cardioRuntime.audioCtx.resume) { try { cardioRuntime.audioCtx.resume(); } catch (e) {} }
  var elNow = (cardioNow() - run.startPerf) / 1000; if (elNow < 0) elNow = 0;
  cardioScheduleTones(elNow);
  saveActiveCardio();
};

// 소리 켜기/끄기
window.toggleCardioSound = function() {
  var run = state.cardio && state.cardio.run; if (!run) return;
  run.soundOn = !run.soundOn;
  if (run.soundOn) {
    if (cardioRuntime.audioCtx && cardioRuntime.audioCtx.resume) { try { cardioRuntime.audioCtx.resume(); } catch (e) {} }
    var el = (cardioNow() - run.startPerf) / 1000; if (el < 0) el = 0;
    cardioScheduleTones(el);
  } else {
    try { (cardioRuntime.scheduled || []).forEach(function(nd) { try { nd.stop(); } catch (e) {} }); } catch (e) {}
    cardioRuntime.scheduled = [];
  }
  render();
};

// ── Web Audio: 오실레이터 알림음(파일 없이) ─────────────────────────────
function cardioStartAudio() {
  if (typeof window === 'undefined') return;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    var ctx = new AC();
    cardioRuntime.audioCtx = ctx;
    if (ctx.resume) { try { ctx.resume(); } catch (e) {} }
    // 무음 루프(1샘플) — 오디오 세션을 살려 백그라운드에서도 예약음이 울리도록 시도(안드로이드 베스트에포트).
    var buf = ctx.createBuffer(1, 1, 22050);
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    var g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(g); g.connect(ctx.destination); src.start(0);
    cardioRuntime.keepAlive = src;
  } catch (e) { cardioRuntime.audioCtx = null; }
}
function cardioStopAudio() {
  try { (cardioRuntime.scheduled || []).forEach(function(n) { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); } catch (e) {}
  cardioRuntime.scheduled = [];
  if (cardioRuntime.keepAlive) { try { cardioRuntime.keepAlive.stop(); } catch (e) {} try { cardioRuntime.keepAlive.disconnect(); } catch (e) {} cardioRuntime.keepAlive = null; }
  if (cardioRuntime.audioCtx) { try { cardioRuntime.audioCtx.close(); } catch (e) {} cardioRuntime.audioCtx = null; }
}
// 톤 시퀀스 예약: kind = tick(예고 '따' 단음 — 전환 3·2·1초 전 매초) / up(전환 '딴!' 올림·높은 톤) /
//   down(전환 '딴!' 내림·낮은 톤) / finish(완주 상승 팡파레). 올림/내림은 마지막 '딴!'의 주파수로 구분.
function cardioSchedSeq(ctx, at, kind) {
  var seqs = {
    tick:   { freqs: [660],            dur: 0.16, gap: 0.00, gain: 0.20, type: 'sine' },     // 예고 '따'(단음, 확실히 들리게)
    up:     { freqs: [1046],           dur: 0.24, gap: 0.00, gain: 0.30, type: 'square' },   // '딴!' 올림 — 더 높고·길고·강하게
    down:   { freqs: [440],            dur: 0.24, gap: 0.00, gain: 0.30, type: 'square' },   // '딴!' 내림 — 더 낮고·길고·강하게
    finish: { freqs: [659, 880, 1175], dur: 0.18, gap: 0.03, gain: 0.28, type: 'triangle' }  // 완주 상승 팡파레
  };
  var spec = seqs[kind] || seqs.tick;
  var nodes = [];
  for (var i = 0; i < spec.freqs.length; i++) {
    var t0 = at + i * (spec.dur + spec.gap);
    try {
      var osc = ctx.createOscillator(); var g = ctx.createGain();
      osc.type = spec.type; osc.frequency.value = spec.freqs[i];
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(spec.gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + spec.dur + 0.02);
      nodes.push(osc);
    } catch (e) {}
  }
  return nodes;
}
function cardioPushTones(nodes) { if (nodes && nodes.length) cardioRuntime.scheduled = cardioRuntime.scheduled.concat(nodes); }
// fromElapsed(초) 이후의 모든 구간 경계에 대해 예고음(-3s)+전환음을 예약. 기존 예약은 취소 후 재예약(재개·무음전환 대응).
function cardioScheduleTones(fromElapsed) {
  try { (cardioRuntime.scheduled || []).forEach(function(n) { try { n.stop(); } catch (e) {} }); } catch (e) {}
  cardioRuntime.scheduled = [];
  var ctx = cardioRuntime.audioCtx;
  var run = state.cardio && state.cardio.run;
  if (!ctx || !run || !run.soundOn) return;
  var base = ctx.currentTime;
  var segs = run.segs;
  var isWalk = (cardioMode() === 'walk');
  // 걷기 모드는 경계 10초 전부터 예고한다 — 콘솔까지 손을 뻗고 버튼을 누르고 경사 모터가 이동하는 시간(§7-4).
  var lead = isWalk ? WALK_PRESCRIPTION.precueSec : 3;
  for (var i = 0; i < segs.length; i++) {
    var b = segs[i].endSec;              // 구간 경계(마지막은 완주 지점)
    if (b <= fromElapsed + 0.05) continue;
    var isFinal = (i === segs.length - 1);
    // 예고 '따' 3번(인터벌: 3·2·1초 전 / 걷기: 10·9·8초 전) — 놓치지 않게 연속으로.
    for (var k = lead; k >= lead - 2; k--) {
      if (k < 1) continue;
      var pt = b - k;
      if (pt > fromElapsed + 0.05) cardioPushTones(cardioSchedSeq(ctx, base + (pt - fromElapsed), 'tick'));
    }
    // 전환 순간 '딴!' — 더 높고 길게 강조. 올림/내림은 톤(주파수)으로 구분.
    if (isFinal) {
      cardioPushTones(cardioSchedSeq(ctx, base + (b - fromElapsed), 'finish'));
    } else {
      var harder;
      if (isWalk) {
        // 걷기 모드에서 강도를 정하는 축은 속력이 아니라 경사다. 같으면 속도로 판정.
        var ci = Number(segs[i].incline) || 0, ni = Number(segs[i + 1].incline) || 0;
        harder = (ni > ci) || (ni === ci && segs[i + 1].targetSpeed > segs[i].actualSpeed);
      } else {
        var cur = segs[i].actualSpeed, nxt = segs[i + 1].targetSpeed;
        harder = (nxt > cur) || (segs[i + 1].type === 'run' && segs[i].type !== 'run');
      }
      cardioPushTones(cardioSchedSeq(ctx, base + (b - fromElapsed), harder ? 'up' : 'down'));
    }
  }
}

// ── Wake Lock(화면 유지) ─────────────────────────────
function cardioRequestWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request('screen').then(function(wl) { cardioRuntime.wakeLock = wl; }).catch(function() {});
    }
  } catch (e) {}
}
function cardioReleaseWakeLock() {
  try { if (cardioRuntime.wakeLock && cardioRuntime.wakeLock.release) cardioRuntime.wakeLock.release(); } catch (e) {}
  cardioRuntime.wakeLock = null;
}
// 세션 종료 시 모든 런타임 자원 정리.
// delayAudioMs > 0 이면 '오디오 정리'만 그만큼 미룬다(완주 팡파레가 끝까지 울리도록). 나머지(타이머·웨이크락·이벤트)는 즉시.
function teardownCardioRuntime(delayAudioMs) {
  cardioClearInterval();
  if (delayAudioMs > 0) {
    // 지연 중 새 세션이 시작될 수 있으니, 지금 오디오 노드/컨텍스트를 캡처해 그것만 뒤늦게 정리한다.
    var nodes = cardioRuntime.scheduled || [];
    var keepAlive = cardioRuntime.keepAlive;
    var ctx = cardioRuntime.audioCtx;
    cardioRuntime.scheduled = [];
    cardioRuntime.keepAlive = null;
    cardioRuntime.audioCtx = null;
    setTimeout(function() {
      try { nodes.forEach(function(n) { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); } catch (e) {}
      if (keepAlive) { try { keepAlive.stop(); } catch (e) {} try { keepAlive.disconnect(); } catch (e) {} }
      if (ctx) { try { ctx.close(); } catch (e) {} }
    }, delayAudioMs);
  } else {
    cardioStopAudio();
  }
  cardioReleaseWakeLock();
  if (cardioRuntime.visHandler && typeof document !== 'undefined' && document.removeEventListener) {
    try { document.removeEventListener('visibilitychange', cardioRuntime.visHandler); } catch (e) {}
  }
  cardioRuntime.visHandler = null;
}

// ── 종료(완주 / 중단) → RPE ─────────────────────────────
function finishCardio() {
  var run = state.cardio && state.cardio.run; if (!run) return;
  cardioIntegrate();
  run.completed = true; run.elapsedAtEnd = run.totalSec;
  teardownCardioRuntime(800);   // 완주 팡파레(약 0.6초)가 끝까지 울리도록 오디오 정리만 지연
  if (typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate([200, 100, 200]); } catch (e) {} }
  state.cardio.phase = 'rpe';
  saveActiveCardio();          // rpe 단계로 저장(RPE 입력 중 회수돼도 복원 가능)
  render();
}
// 화면 종료 버튼 / 폰 뒤로가기(fromBack) — 둘 다 확인 팝업(1단계 endSession 패턴, 앱 스타일).
window.stopCardio = function(fromBack) {
  var c0 = state.cardio; if (!c0 || !c0.run) return;
  showConfirm('운동을 종료할까요?', function() { applyStopCardio(); }, { confirmLabel: '종료' });
};

function applyStopCardio() {
  var c = state.cardio; var run = c && c.run; if (!run) return;
  cardioIntegrate();
  var elapsed = (cardioNow() - run.startPerf) / 1000; if (elapsed < 0) elapsed = 0; if (elapsed > run.totalSec) elapsed = run.totalSec;
  run.elapsedAtEnd = elapsed; run.completed = false;
  teardownCardioRuntime();
  // 시작 직후 실수 종료(거의 안 뛴 경우)는 저장 안 함
  if (elapsed < 20 && run.distanceKm < 0.02) {
    c.phase = 'idle'; c.run = null;
    try { localStorage.removeItem(KEYS.ACTIVE_CARDIO_RUN); } catch (e) {}   // 진행 저장 삭제
    render(); showToast('기록 없이 종료했어요');
    return;
  }
  c.phase = 'rpe';
  saveActiveCardio();          // rpe 단계로 저장(RPE 입력 중 회수 대비)
  render();
}
// 손잡이 문항(걷기 모드 전용, §5-2) — 이 한 문항이 다음 세션 경사를 정한다.
window.setCardioHandrail = function(v) {
  var run = state.cardio && state.cardio.run; if (!run) return;
  run.handrail = (v === 'none' || v === 'light' || v === 'hold') ? v : null;
  saveActiveCardio();          // RPE 입력 중 회수돼도 답이 남도록
  render();
};

// RPE(1~10 또는 null=건너뛰기) → 세션 저장(saveCardioSession) 후 초기화
window.submitCardioRpe = function(rpe) {
  var c = state.cardio; var run = c && c.run;
  if (!run) { if (c) { c.phase = 'idle'; } try { localStorage.removeItem(KEYS.ACTIVE_CARDIO_RUN); } catch (e) {} render(); return; }
  var mode = cardioMode();
  var endSec = (run.elapsedAtEnd != null) ? run.elapsedAtEnd : run.totalSec;
  // 실제 수행한 구간만 기록(중단 시 진행중 구간은 실제 경과분만)
  var outSegs = [];
  for (var i = 0; i < run.segs.length; i++) {
    var s = run.segs[i];
    if (s.startSec >= endSec - 0.5) break;
    var segEnd = Math.min(s.endSec, endSec);
    var sec = Math.max(0, Math.round(segEnd - s.startSec));
    if (sec <= 0) continue;
    outSegs.push({ type: s.type, targetSpeed: s.targetSpeed, actualSpeed: s.actualSpeed, incline: Number(s.incline) || 0, sec: sec });
  }
  if (!outSegs.length) outSegs = run.segs.map(function(s) { return { type: s.type, targetSpeed: s.targetSpeed, actualSpeed: s.actualSpeed, incline: Number(s.incline) || 0, sec: s.sec }; });
  var session = {
    id: 'cardio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    date: getTodayStr(),
    mode: mode,                                   // 'interval' | 'walk' — 옛 기록엔 없으므로 읽는 쪽에서 폴백
    totalSec: Math.round(endSec),
    totalDistKm: Math.round(run.distanceKm * 100) / 100,
    segments: outSegs,
    completed: !!run.completed,
    rpe: (rpe == null ? null : rpe),
    handrail: (mode === 'walk') ? (run.handrail || null) : null
  };
  c.run = null; c.plan = null; c.phase = 'idle';
  try { localStorage.removeItem(KEYS.ACTIVE_CARDIO_RUN); } catch (e) {}   // 진행 저장 삭제(세션이 CARDIO_LOG 로 확정됨)
  state.currentTab = 'running';
  if (typeof window.saveCardioSession === 'function') { window.saveCardioSession(session); } else { render(); }
  showToast(session.completed ? '완주 · 유산소 기록 저장 완료' : '유산소 기록 저장 완료');
};

// ── 화면: 러닝 탭(입력/구성 미리보기) ─────────────────────────────
function renderRunning() {
  ensureCardioState();
  var c = state.cardio;
  var accent = 'var(--accent)';
  var mode = cardioMode();
  var isWalk = (mode === 'walk');

  // 모드 선택(§7-5) — 인터벌(걷기·뛰기) / 경사 걷기. 기본은 인터벌.
  function modeCard(id, iconName, title, sub) {
    var on = (mode === id);
    return '<button class="option-card" style="flex:1;padding:12px 6px;' +
      (on ? 'border-color:' + accent + ';background:var(--bg-3);' : '') + '" onclick="setCardioMode(\'' + id + '\')">' +
      '<div style="display:flex;justify-content:center;' + (on ? 'color:var(--accent);' : 'color:var(--text-muted);') + '">' + icon(iconName, 20) + '</div>' +
      '<p class="text-xs font-display mt-1' + (on ? ' accent' : '') + '">' + title + '</p>' +
      '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + sub + '</p>' +
      '</button>';
  }
  var modeToggle =
    '<div class="flex gap-2" style="margin-top:16px;">' +
      modeCard('interval', 'running', '인터벌', '걷기·뛰기 반복') +
      modeCard('walk', 'treadmill', '경사 걷기', '정속 · 무릎 편함') +
    '</div>';

  // 정직한 톤 배너 — 모드별로 다르되 과장은 금지(docs/research/incline-walking.md §0·§1-1: '지방 연소' 문구 금지)
  var banner = isWalk ?
    '<div class="card mb-4" style="margin-top:12px;border-color:rgba(var(--accent-rgb),0.15);">' +
      '<p class="text-xs font-display mb-2" style="line-height:1.65;">경사 10% 걷기는 평지 조깅의 <b>약 90% 열량</b>을 쓰면서, 무릎 충격은 걷기 수준으로 남아요.</p>' +
      noteBlock('살은 얼마나 빠지나요?', '살 빠짐은 총 소비와 식사로 정해져요. 주 4회 45분씩 해도 운동만으로는 주 0.2kg 남짓이에요.') +
    '</div>' :
    '<div class="card mb-4" style="margin-top:12px;border-color:rgba(var(--accent-rgb),0.15);">' +
      '<p class="text-xs font-display mb-2" style="line-height:1.65;">살 빠짐은 <b>총 소비와 식사</b>로 정해져요. 유산소는 소비를 안전하게 늘리는 방법이에요.</p>' +
      noteBlock('근육은 안 빠지나요?', '유산소만 하면 근육이 빠질 수 있어요. 웨이트와 단백질을 함께 챙기세요.') +
    '</div>';

  // 경사 걷기 안전 안내(§5-2 · §5-4) — 손잡이 규칙이 이 모드의 가장 중요한 실행 규칙이다.
  var safetyNote = isWalk ?
    '<div class="card mb-4" style="border-color:rgba(var(--warn-rgb),0.25);">' +
      '<p class="text-[11px] font-mono mb-2" style="color:var(--warn);line-height:1.7;">손잡이는 놓으세요. 균형이 필요하면 손가락만 가볍게 얹기.</p>' +
      noteBlock('왜 놓아야 하나요?',
        '<b>손잡이를 놓을 수 없다면 경사가 너무 높다는 신호</b>예요 — 잡고 12%보다, 놓고 8%가 실제로 더 센 운동이에요.<br>' +
        '세션 뒤 종아리 스트레칭 30초씩 2번. 도입 2~3주엔 종아리·아킬레스가 가장 먼저 아파요.') +
    '</div>' : '';

  // 시간 입력 + 구성 버튼 + 빠른 선택 칩
  var quickChips = [15, 20, 30, 40, 50].map(function(m) {
    return '<button class="option-card" style="flex:1;padding:9px 0;text-align:center;" onclick="buildCardioPlan(' + m + ')"><p class="text-xs font-mono">' + m + '</p></button>';
  }).join('');
  var input =
    '<div class="card mb-4">' +
      '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">운동 시간</p>' +
      '<div class="flex items-center gap-2">' +
        '<input id="cardio-min-input" type="number" inputmode="numeric" min="5" max="120" step="1" value="' + escapeHtml(c.inputMin || '') + '"' + (c.loading ? ' disabled' : '') + ' style="flex:1;min-width:0;background:var(--bg-1);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px;color:#fff;font-family:var(--font);font-weight:800;font-size:26px;" onkeydown="if(event.key===\'Enter\')buildCardioPlan()" />' +
        '<span class="text-sm font-mono text-stone-400">분</span>' +
        '<button class="sheet-submit" style="width:auto;padding:12px 20px;margin:0;flex-shrink:0;" onclick="buildCardioPlan()"' + (c.loading ? ' disabled' : '') + '>구성</button>' +
      '</div>' +
      '<div class="flex gap-2 mt-3">' + quickChips + '</div>' +
    '</div>';

  // 로딩 / 미리보기
  var mid = '';
  if (c.loading) {
    mid = '<div class="card mb-4 text-center" style="padding:28px 0;"><p class="text-sm font-mono accent">AI가 구성 중…</p><p class="text-[11px] font-mono text-stone-500 mt-2">' +
      (isWalk ? '시간에 딱 맞게 몸풀기·본 구간·정리를 짜요' : '시간에 딱 맞게 워밍업·인터벌·쿨다운을 짜요') + '</p></div>';
  } else if (c.plan) {
    var plan = c.plan;
    var segRow = function(s) {
      var dur = s.endSec - s.startSec;
      var right = isWalk
        ? '<div style="text-align:right;">' +
            '<p class="font-bebas text-xl' + (s.type === 'walk' ? ' accent' : '') + '">' + cardioFmtIncline(s.incline) + '<span class="text-[11px] text-stone-500"> %</span></p>' +
            '<p class="text-[11px] font-mono text-stone-500">' + (Number(s.speed) || 0).toFixed(1) + ' km/h</p>' +
          '</div>'
        : '<p class="font-bebas text-xl' + (s.type === 'run' ? ' accent' : '') + '">' + (Number(s.speed) || 0).toFixed(1) + '<span class="text-[11px] text-stone-500"> km/h</span></p>';
      return '<div class="flex items-center justify-between" style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06);">' +
          '<div><p class="text-xs font-display">' + escapeHtml(cardioSegDisplayLabel(s, mode)) + '</p>' +
            '<p class="text-[11px] font-mono text-stone-500">' + cardioFmtClock(dur) + '</p></div>' +
          right +
        '</div>';
    };
    var segList = plan.segments.map(segRow).join('');

    // 구간 요약 — 인터벌은 같은 조합이 6번 반복돼 17줄이 된다. 반복은 "× 6회" 한 번으로 접고,
    // 전체 목록은 '구간 자세히'에 넣는다. 규칙이 안 잡히면(속력이 매번 다르면) 접지 않고 그대로 편다.
    var summary = cardioPlanSummary(plan.segments);
    var segBlock;
    if (summary) {
      segBlock =
        summary.head.map(segRow).join('') +
        '<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06);">' +
          '<p class="text-[11px] font-mono accent uppercase tracking-widest mb-1">반복 × ' + summary.times + '회</p>' +
          '<div style="padding-left:10px;border-left:1px solid rgba(var(--accent-rgb),0.3);">' +
            summary.unit.map(segRow).join('') +
          '</div>' +
        '</div>' +
        summary.rest.map(segRow).join('') +
        summary.tail.map(segRow).join('') +
        noteBlock('구간 자세히 (' + plan.segments.length + '개)', segList);
    } else {
      segBlock = segList;
    }
    // 경사 걷기: 예상 소모 열량을 "대략"으로만 (ACSM 공식은 실측 대비 약 +6% 과대추정 — §1-2·§7-8)
    var kcalLine = '';
    if (isWalk && typeof cardioWalkKcal === 'function') {
      var kcal = cardioWalkKcal(plan.segments.map(function(s) {
        return { sec: s.endSec - s.startSec, targetSpeed: s.speed, incline: s.incline };
      }), cardioWalkBodyWeight());
      if (kcal > 0) kcalLine = '<p class="text-[11px] font-mono text-stone-500 mt-2">예상 소모 <b>대략 ' + kcal + ' kcal</b> · 추정값이라 오차가 있어요</p>';
    }
    mid =
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-1">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">오늘 구성</p>' +
          '<p class="font-bebas text-2xl accent">' + cardioFmtClock(plan.totalSec) + '</p>' +
        '</div>' +
        (plan.headline ? '<p class="text-sm font-display mb-2">' + escapeHtml(plan.headline) + '</p>' : '') +
        (plan.source === 'fallback' ? '<p class="text-[11px] font-mono" style="color:var(--warn);">AI 키가 없어 기본 구성을 썼어요</p>' : '') +
        '<div class="mt-2">' + segBlock + '</div>' + kcalLine +
        (plan.note ? '<p class="text-[11px] font-mono text-stone-400 mt-3" style="line-height:1.6;">' + escapeHtml(plan.note) + '</p>' : '') +
        '<button class="sheet-submit" style="margin-top:14px;" onclick="startCardio()">시작</button>' +
        '<button class="option-card" style="width:100%;margin-top:8px;text-align:center;" onclick="resetCardioPlan()"><p class="text-xs font-mono text-stone-400">다시 구성</p></button>' +
      '</div>';
  }

  // 최근 유산소 한 줄 — 걷기 모드에선 걷기 세션만 보여준다(모드가 섞이면 기준선이 헷갈린다)
  var all = (state.data && state.data.cardioLog) ? state.data.cardioLog : [];
  var pool = (isWalk ? cardioWalkSessions(all) : cardioIntervalSessions(all)).slice(0, 1);
  var last = pool.length ? pool[0] : null;
  var recent = last
    ? '<p class="text-[11px] font-mono text-stone-500 text-center mt-6">최근: ' + last.date + ' · ' + cardioFmtClock(last.totalSec || 0) +
      (isWalk ? (' · 경사 ' + cardioFmtIncline(cardioWalkMainIncline(last)) + '%') : (' · ' + ((last.totalDistKm || 0).toFixed(2)) + 'km')) +
      (last.completed ? ' · 완주' : '') + '</p>'
    : '';

  return '' +
    '<div class="px-5 pt-12 pb-32">' +
      '<p class="text-xs font-mono text-stone-400">' + (isWalk ? '러닝머신 경사 걷기 · 정속 한 구간' : '러닝머신 인터벌 · 시간만 정하면 AI가 구성') + '</p>' +
      modeToggle + banner + safetyNote + input + mid + recent +
    '</div>';
}

// ── 화면: 실행 중(경과·목표속력 크게 + 보조 정보) ─────────────────────────────
function renderCardioSession() {
  var c = state.cardio; var run = c && c.run;
  if (!run) return '<div class="px-5 pt-12">세션 없음</div>';
  var elapsed = (cardioNow() - run.startPerf) / 1000; if (elapsed < 0) elapsed = 0; if (elapsed > run.totalSec) elapsed = run.totalSec;
  var idx = cardioSegIndexAt(run.segs, elapsed);
  var seg = run.segs[idx] || run.segs[run.segs.length - 1];
  var next = run.segs[idx + 1] || null;
  var progPct = run.totalSec > 0 ? Math.min(100, (elapsed / run.totalSec) * 100) : 0;
  var accent = 'var(--accent)';
  var round = 'width:52px;height:52px;border-radius:50%;border:1px solid rgba(255,255,255,0.14);background:var(--bg-2);color:#fff;font-family:var(--font);font-weight:800;font-size:26px;line-height:1;display:flex;align-items:center;justify-content:center;';
  var chip = 'padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:var(--bg-1);color:var(--text-soft);font-family:var(--font);font-size:12px;';
  var mode = cardioMode();
  var isWalk = (mode === 'walk');

  // 걷기 모드: 경사를 속도와 같은 크기로 나란히(§7-5 — 이 모드에서 경사가 속도보다 중요한 변수다).
  var walkNumbers = isWalk ?
    ('<div class="card" style="margin-top:16px;">' +
      '<div class="flex" style="gap:10px;">' +
        '<div style="flex:1;text-align:center;">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">경사</p>' +
          '<p class="font-bebas accent" style="font-size:52px;line-height:1.05;"><span id="cardio-incline">' + cardioFmtIncline(seg.incline) + '</span><span class="text-sm text-stone-400"> %</span></p>' +
        '</div>' +
        '<div style="width:1px;background:rgba(255,255,255,0.08);"></div>' +
        '<div style="flex:1;text-align:center;">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">속도</p>' +
          '<p class="font-bebas" style="font-size:52px;line-height:1.05;"><span id="cardio-actual">' + (seg.actualSpeed || 0).toFixed(1) + '</span><span class="text-sm text-stone-400"> km/h</span></p>' +
        '</div>' +
      '</div>' +
      '<div class="flex items-center justify-center gap-2" style="margin-top:12px;">' +
        '<button style="' + round + '" onclick="adjustCardioSpeed(-0.1)">−</button>' +
        '<p class="text-[11px] font-mono text-stone-500" style="width:120px;text-align:center;line-height:1.5;">속도만 미세 조정<br>목표 <span id="cardio-target">' + (seg.targetSpeed || 0).toFixed(1) + '</span> km/h</p>' +
        '<button style="' + round + '" onclick="adjustCardioSpeed(0.1)">+</button>' +
      '</div>' +
    '</div>' +
    '<div id="cardio-tip" class="card" style="display:none;margin-top:10px;padding:12px 14px;border-color:rgba(var(--accent-rgb),0.18);font-family:var(--font);font-size:13px;line-height:1.6;color:var(--text-soft);"></div>')
    : '';

  return '' +
    // 헤더
    '<div class="px-5 pt-12" style="padding-bottom:14px;">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<button class="session-header-btn" onclick="stopCardio(false)">' + icon('close', 18) + '</button>' +
        '<div class="text-center">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">' + (isWalk ? '러닝 · 경사 걷기' : '러닝 · 인터벌') + '</p>' +
          '<p class="text-xs font-mono accent mt-0\\.5">총 ' + cardioFmtClock(run.totalSec) + '</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="toggleCardioSound()" title="' + (run.soundOn ? '소리 끄기' : '소리 켜기') + '" style="' + (run.soundOn ? '' : 'opacity:0.45;') + '">' + icon('bell', 18) + '</button>' +
      '</div>' +
      '<div class="session-progress"><div id="cardio-progress-fill" class="session-progress-fill" style="width:' + progPct.toFixed(1) + '%"></div></div>' +
    '</div>' +

    '<div class="px-5" style="padding-bottom:120px;">' +

      // 현재 구간
      '<div class="text-center" style="margin-top:6px;">' +
        '<p class="text-sm" style="color:var(--text-soft);"><span id="cardio-seg-label" class="font-display">' + escapeHtml(cardioSegDisplayLabel(seg, mode)) + '</span></p>' +
        '<p id="cardio-seg-remain" class="text-[11px] font-mono text-stone-500 mt-1">남은 ' + cardioFmtClock(Math.max(0, Math.ceil(seg.endSec - elapsed))) + '</p>' +
      '</div>' +

      // 경과시간(히어로)
      '<div class="text-center" style="margin-top:10px;">' +
        '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">경과 시간</p>' +
        '<p id="cardio-elapsed" class="font-bebas" style="font-size:76px;line-height:1;letter-spacing:1px;">' + cardioFmtClock(elapsed) + '</p>' +
      '</div>' +

      // 예고 배너(3초 전)
      '<div id="cardio-precue" class="text-center" style="display:none;margin-top:8px;color:var(--warn);font-family:var(--font);font-weight:700;font-size:15px;"></div>' +

      // 걷기 모드: 경사·속도 큰 숫자 카드 / 인터벌 모드: 기존 목표·실제 속력 카드
      (isWalk ? walkNumbers :
      '<div class="card" style="margin-top:16px;">' +
        '<div class="flex items-center justify-between mb-1">' +
          '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">목표 속력</p>' +
          '<p class="font-bebas text-2xl accent"><span id="cardio-target">' + (seg.targetSpeed || 0).toFixed(1) + '</span><span class="text-xs text-stone-400"> km/h</span></p>' +
        '</div>' +
        '<div class="flex items-center justify-between" style="margin-top:10px;">' +
          '<button style="' + round + '" onclick="adjustCardioSpeed(-0.5)">−</button>' +
          '<div class="text-center">' +
            '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">실제 속력</p>' +
            '<p class="font-bebas" style="font-size:46px;line-height:1;"><span id="cardio-actual">' + (seg.actualSpeed || 0).toFixed(1) + '</span><span class="text-sm text-stone-400"> km/h</span></p>' +
          '</div>' +
          '<button style="' + round + '" onclick="adjustCardioSpeed(0.5)">+</button>' +
        '</div>' +
        '<div class="flex items-center justify-center gap-2" style="margin-top:10px;">' +
          '<button class="option-card" style="padding:6px 14px;" onclick="adjustCardioSpeed(-0.1)"><p class="text-xs font-mono text-stone-400">−0.1</p></button>' +
          '<button class="option-card" style="padding:6px 14px;" onclick="adjustCardioSpeed(0.1)"><p class="text-xs font-mono text-stone-400">+0.1</p></button>' +
        '</div>' +
      '</div>') +

      // 보조 정보(거리·다음·구간)
      '<div class="flex gap-2" style="margin-top:12px;">' +
        '<div style="flex:1;' + chip + '"><p class="text-[11px] text-stone-500">이동거리</p><p class="font-bebas text-xl accent"><span id="cardio-dist">' + run.distanceKm.toFixed(2) + '</span> km</p></div>' +
        '<div style="flex:1;' + chip + '"><p class="text-[11px] text-stone-500">구간</p><p class="font-bebas text-xl"><span id="cardio-segcount">' + (idx + 1) + ' / ' + run.segs.length + '</span></p></div>' +
      '</div>' +
      '<div style="' + chip + 'margin-top:8px;"><p class="text-[11px] text-stone-500">다음 구간</p><p class="text-sm font-display" style="color:#fff;"><span id="cardio-next">' +
        (next ? (isWalk ? (escapeHtml(cardioSegDisplayLabel(next, mode)) + ' · ' + cardioInclineLabel(next))
                        : (cardioTypeLabel(next.type) + ' ' + (next.targetSpeed || 0).toFixed(1)))
              : '마지막 구간') + '</span></p></div>' +

      '<button class="option-card" style="width:100%;margin-top:18px;text-align:center;padding:14px 0;" onclick="stopCardio(false)"><p class="text-sm font-mono accent">운동 종료</p></button>' +

    '</div>';
}

// ── 화면: 종료 후 RPE 입력 ─────────────────────────────
function renderCardioRPE() {
  var c = state.cardio; var run = c && c.run;
  if (!run) return '<div class="px-5 pt-12">기록 없음</div>';
  var endSec = (run.elapsedAtEnd != null) ? run.elapsedAtEnd : run.totalSec;
  var completed = !!run.completed;
  var mode = cardioMode();
  var isWalk = (mode === 'walk');
  // 색은 세기를 뜻하지 않는다 — 4색 신호등이면 "4~6 적당"인데도 주황이라 경고처럼 읽힌다.
  // 전부 같은 회색으로 두고, 고른 값만 강조색으로 바뀐다(선택 상태는 다시 그릴 때 반영).
  var btns = '';
  for (var n = 1; n <= 10; n++) {
    var picked = (run.rpe === n);
    btns += '<button onclick="submitCardioRpe(' + n + ')" style="width:52px;height:52px;border-radius:14px;border:1.5px solid ' +
      (picked ? 'var(--accent)' : 'var(--bg-4)') + ';background:' + (picked ? 'var(--accent)' : 'var(--bg-1)') +
      ';color:' + (picked ? 'var(--bg-0)' : 'var(--text-soft)') + ';font-family:var(--font);font-weight:800;font-size:24px;">' + n + '</button>';
  }

  // 걷기 모드 전용 손잡이 문항(§5-2 · §7-5) — 이 한 문항이 다음 세션 경사를 결정한다.
  var handrailCard = '';
  if (isWalk) {
    var opts = (typeof WALK_HANDRAIL_OPTIONS !== 'undefined') ? WALK_HANDRAIL_OPTIONS : [];
    var hbtns = opts.map(function(o) {
      var on = (run.handrail === o.value);
      return '<button class="option-card" style="flex:1;padding:10px 4px;' + (on ? 'border-color:var(--accent);background:var(--bg-3);' : '') + '" onclick="setCardioHandrail(\'' + o.value + '\')">' +
        '<p class="text-xs font-display' + (on ? ' accent' : '') + '">' + o.label + '</p>' +
        '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + o.desc + '</p>' +
        '</button>';
    }).join('');
    handrailCard =
      '<div class="card" style="margin-top:16px;">' +
        '<p class="text-sm font-display text-center mb-1">손잡이, 잡고 있었나요?</p>' +
        '<p class="text-[11px] font-mono text-stone-500 text-center mb-3" style="line-height:1.6;">잡고 뒤로 기대면 경사 10%가 5%가 돼요.</p>' +
        '<div class="flex gap-2">' + hbtns + '</div>' +
      '</div>';
  }

  // 오늘 대략 소모 열량(걷기 모드) — ACSM 추정치라 "대략"으로만 표시한다(§7-8).
  var kcalLine = '';
  if (isWalk && typeof cardioWalkKcal === 'function') {
    var doneSegs = [];
    run.segs.forEach(function(s) {
      if (s.startSec >= endSec - 0.5) return;
      var sec = Math.max(0, Math.round(Math.min(s.endSec, endSec) - s.startSec));
      if (sec > 0) doneSegs.push({ sec: sec, actualSpeed: s.actualSpeed, incline: s.incline });
    });
    var kcal = cardioWalkKcal(doneSegs, cardioWalkBodyWeight());
    if (kcal > 0) kcalLine = '<p class="text-xs font-mono text-stone-500 mt-1">오늘 대략 ' + kcal + ' kcal</p>';
  }

  return '' +
    '<div class="px-5 pt-12 pb-32">' +
      '<div class="text-center" style="margin-top:8px;">' +
        '<div class="complete-icon" style="color:var(--accent);">' + icon('check', 28) + '</div>' +
        '<h1 class="font-bebas text-4xl mt-1">' + (completed ? '완주' : '중단') + '</h1>' +
        '<p class="text-sm font-mono text-stone-400 mt-2">' + cardioFmtClock(endSec) + ' · ' + run.distanceKm.toFixed(2) + 'km</p>' +
        kcalLine +
        (isWalk ? '<p class="text-[11px] font-mono text-stone-500 mt-2">종아리 스트레칭 30초씩 2번 하고 가세요 (무릎 편 상태 / 굽힌 상태)</p>' : '') +
      '</div>' +

      handrailCard +

      '<div class="card" style="margin-top:16px;">' +
        '<p class="text-sm font-display text-center mb-3">오늘 세션, 얼마나 힘들었나요?</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + btns + '</div>' +
        '<div class="condition-ends" style="max-width:280px;margin:8px auto 0;"><span>쉬움</span><span>한계</span></div>' +
        noteBlock('이 값이 다음 구성에 어떻게 쓰이나요?',
          isWalk
            ? '완주하고 RPE 6 이하면 다음엔 한 축만 조금 올라가요(시간 → 빈도 → 경사 → 속도 순). 허리·종아리 통증이 있으면 쉬세요.'
            : '뛰기가 7 이하로 완주했다면 다음 구성은 걷기가 조금 줄어들어요. 통증이 있으면 쉬세요.') +
        '<button class="option-card" style="width:100%;margin-top:12px;text-align:center;" onclick="submitCardioRpe(null)"><p class="text-xs font-mono text-stone-400">평가 건너뛰기</p></button>' +
      '</div>' +
      (isWalk ? '<p class="text-[11px] font-mono text-stone-600 text-center mt-4" style="line-height:1.7;">디스크 증상은 몇 시간 뒤에 나올 수 있어요.<br>오늘 저녁까지 허리·다리 저림이 없는지 확인하고 다음 세션을 정하세요.</p>' : '') +
    '</div>';
}

// ── 기록 탭용: 유산소 요약 카드 ─────────────────────────────
function cardioAvgRunSpeed(session) {
  var segs = (session && session.segments) ? session.segments : [];
  var tsec = 0, tdist = 0;
  segs.forEach(function(s) { if (s.type === 'run') { tsec += (s.sec || 0); tdist += (s.actualSpeed || 0) * (s.sec || 0); } });
  return tsec > 0 ? (tdist / tsec) : 0;
}
function cardioSummaryCardHtml(period) {
  var all = (state.data && state.data.cardioLog) ? state.data.cardioLog : [];
  if (!all.length) return '';
  var list = filterByPeriod(all, period);
  var sorted = list.slice().sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); });
  var n = sorted.length;
  if (!n) return '';
  var totalKm = sorted.reduce(function(s, x) { return s + (x.totalDistKm || 0); }, 0);
  var totalMin = Math.round(sorted.reduce(function(s, x) { return s + (x.totalSec || 0); }, 0) / 60);
  var completedN = sorted.filter(function(x) { return x.completed; }).length;
  var walkN = sorted.filter(function(x) { return x.mode === 'walk'; }).length;
  var rpes = sorted.filter(function(x) { return typeof x.rpe === 'number'; }).map(function(x) { return x.rpe; });
  var avgRpe = rpes.length ? (rpes.reduce(function(s, x) { return s + x; }, 0) / rpes.length) : null;
  var recent = sorted.slice(-8);
  // ★막대는 "시간"으로 그린다. 두 모드가 한 로그에 섞이는데 거리로 그리면, 같은 30분이라도 경사 걷기(5km/h)가
  //   인터벌(8km/h)의 절반 높이로 보여 훈련이 후퇴한 것처럼 읽힌다 — 이 모드의 요지("같은 열량, 낮은 충격")와 정반대다.
  var maxSec = Math.max.apply(null, recent.map(function(x) { return x.totalSec || 0; }).concat([1]));
  var bars = recent.map(function(x, i) {
    var h = Math.max(6, Math.round(((x.totalSec || 0) / maxSec) * 70));
    var isLast = i === recent.length - 1;
    var isW = (x.mode === 'walk');
    return '<div style="flex:1;display:flex;justify-content:center;align-items:flex-end;height:76px;"><div style="width:60%;height:' + h + 'px;border-radius:4px;background:' + (isLast ? 'var(--accent)' : (isW ? 'rgba(var(--accent-rgb), 0.45)' : 'var(--bg-3)')) + ';"></div></div>';
  }).join('');
  var rows = sorted.slice(-5).reverse().map(function(x) {
    // 옛 기록엔 mode 가 없다 → 'interval' 로 간주(하위 호환)
    var isWalkRow = (x.mode === 'walk');
    var runSpd = isWalkRow ? 0 : cardioAvgRunSpeed(x);
    var detail = isWalkRow ? (' · 경사 ' + cardioFmtIncline(cardioWalkMainIncline(x)) + '%') : (runSpd ? (' · 뛰기 ' + runSpd.toFixed(1)) : '');
    return '<div class="workout-history-row">' +
        '<div class="flex items-center gap-3">' +
          '<div class="workout-history-dot"></div>' +
          '<div>' +
            '<p class="text-xs font-display font-bold">' + cardioFmtClock(x.totalSec || 0) + ' · ' + ((x.totalDistKm || 0).toFixed(2)) + 'km</p>' +
            '<p class="text-[11px] font-mono text-stone-500 mt-0\\.5">' + (isWalkRow ? '경사 걷기 · ' : '') + x.date + ' · ' + (x.completed ? '완주' : '중단') + (typeof x.rpe === 'number' ? (' · RPE ' + x.rpe) : '') + detail + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');
  return '<div class="card mb-4">' +
      '<div class="flex items-center justify-between mb-4">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">유산소</p>' +
        '<p class="text-xs font-mono accent">' + n + '회</p>' +
      '</div>' +
      // 칸을 균등 격자로 — flex+gap 이면 라벨끼리 붙어 '총 분총 km완주'로 읽혔다.
      '<div style="display:grid; grid-template-columns: repeat(' + (avgRpe != null ? 4 : 3) + ', minmax(0, 1fr)); gap: 10px; align-items: end; margin-bottom: 12px;">' +
        '<div><p class="font-bebas text-3xl accent">' + totalMin + '</p><p class="text-[11px] font-mono text-stone-500">총 분</p></div>' +
        '<div><p class="font-bebas text-3xl">' + totalKm.toFixed(1) + '</p><p class="text-[11px] font-mono text-stone-500">총 km</p></div>' +
        '<div><p class="font-bebas text-3xl">' + completedN + '</p><p class="text-[11px] font-mono text-stone-500">완주</p></div>' +
        (avgRpe != null ? '<div><p class="font-bebas text-3xl">' + avgRpe.toFixed(1) + '</p><p class="text-[11px] font-mono text-stone-500">평균 RPE</p></div>' : '') +
      '</div>' +
      (walkN ? noteBlock('경사 걷기 ' + walkN + '회 포함', '걷기는 같은 시간에 거리가 짧게 남아요(속도가 낮아서). 열량은 경사가 채워요.') : '') +
      (recent.length >= 2 ? '<p class="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-2">시간 추이</p><div style="display:flex;align-items:flex-end;gap:4px;margin-bottom:12px;">' + bars + '</div>' : '') +
      '<div>' + rows + '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 탭바
// ═══════════════════════════════════════════════
function renderTabbar() {
  // 화면 이름은 이제 탭바에만 있다 → 한국어 앱이니 한국어로 적는다(영어 라벨 3중 겹침 해소).
  var tabs = [
    { id: 'home', label: '홈', iconName: 'home' },
    { id: 'workout', label: '운동', iconName: 'dumbbell' },
    { id: 'running', label: '러닝', iconName: cardioTabIconName() },
    { id: 'stats', label: '기록', iconName: 'chart' },
    { id: 'more', label: '더보기', iconName: 'more' }
  ];
  
  var html = '<div class="tabbar">';
  tabs.forEach(function(t) {
    html += '<div class="tab ' + (state.currentTab === t.id ? 'active' : '') + '" onclick="setTab(\'' + t.id + '\')">' +
      icon(t.iconName, 22) +
      '<span>' + t.label + '</span>' +
    '</div>';
  });
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════
// 메인 렌더
// ═══════════════════════════════════════════════
function render() {
  // 복원된 웜업/스트레칭 진행상태가 깨져 있으면 먼저 정리한다(갇힘 방지).
  mobilityRepairState();
  // 웜업/스트레칭 가이드가 떠 있지 않으면 그 타이머·오디오·웨이크락은 확실히 정리한다.
  if (!mobilityCurrent()) mobilityStopRuntime();

  // 1RM 리스트 (최우선)
  if (state.oneRMListOpen) {
    document.getElementById('app').innerHTML = renderOneRMList();
    return;
  }

  // 코치 기억 노트
  if (state.coachMemoryOpen) {
    document.getElementById('app').innerHTML = renderCoachMemory();
    return;
  }

  // 주간 리뷰 상세
  if (state.weeklyReviewOpen) {
    document.getElementById('app').innerHTML = renderWeeklyReviewDetail();
    return;
  }
  
  // 정체기 상세
  if (state.plateauOpen) {
    document.getElementById('app').innerHTML = renderPlateauDetail();
    return;
  }
  
  // 코치 채팅
  if (state.coachChatOpen) {
    document.getElementById('app').innerHTML = renderCoachChat();
    return;
  }
  
  // 정리 스트레칭 가이드 — 완료 화면 위에 뜬다 (스트레칭 중엔 이 화면이 보여야 한다)
  if (state.stretchGuide) {
    document.getElementById('app').innerHTML = renderStretchGuide();
    mobilityEnsureTicker();
    return;
  }

  // 완료 화면
  if (state.completedSession) {
    document.getElementById('app').innerHTML = renderWorkoutComplete();
    window.scrollTo(0, 0);
    return;
  }

  // 세션 시작 웜업 가이드 — 본운동 화면보다 먼저. warmup 이 없는 옛 저장 세션은 그냥 통과한다(하위 호환).
  if (state.activeSession && state.activeSession.warmup && !state.activeSession.warmup.done) {
    document.getElementById('app').innerHTML = renderWarmupGuide();
    mobilityEnsureTicker();
    return;
  }

  // 활성 세션이 있으면 세션 화면
  if (state.activeSession) {
    document.getElementById('app').innerHTML = renderWorkoutSession();
    return;
  }

  // 유산소(러닝) — 종료 후 RPE 입력 / 진행 중(웨이트 세션과 상호배타)
  if (state.cardio && state.cardio.phase === 'rpe') {
    document.getElementById('app').innerHTML = renderCardioRPE();
    window.scrollTo(0, 0);
    return;
  }
  if (state.cardio && state.cardio.phase === 'running') {
    document.getElementById('app').innerHTML = renderCardioSession();
    return;
  }

  // 옛 탭 id('fuel' 등)가 들어오면 아무것도 안 그려 빈 화면이 됐다 → 홈으로 되돌린다.
  var content = '';
  switch (state.currentTab) {
    case 'home': content = renderHome(); break;
    case 'workout': content = renderWorkout(); break;
    case 'running': content = renderRunning(); break;
    case 'stats': content = renderStats(); break;
    case 'more': content = renderMore(); break;
    default:
      state.currentTab = 'home';
      content = renderHome();
      break;
  }
  
  // 항목 상세 시트 오버레이 (있을 시)
  var detailSheet = state.itemDetailSheet ? renderItemDetailSheet() : '';
  
  // 전체 초기화 확인 오버레이
  var resetOverlay = state.resetConfirming ? renderResetConfirm() : '';
  
  // 6-C① 탭이 바뀔 때만 진입 애니메이션 래퍼(같은 탭 내 재렌더는 그대로 — 반복 튐 방지)
  var tabChanged = state._lastRenderedTab !== state.currentTab;
  state._lastRenderedTab = state.currentTab;
  var wrappedContent = tabChanged ? ('<div class="screen-enter">' + content + '</div>') : content;
  document.getElementById('app').innerHTML = wrappedContent + renderTabbar() + detailSheet + resetOverlay;
  window.scrollTo(0, 0);
}

// 전체 초기화 확인 모달
function renderResetConfirm() {
  return '' +
    '<div class="sheet-overlay" onclick="cancelResetAll()">' +
      '<div class="sheet" onclick="event.stopPropagation()">' +
        '<div class="sheet-handle"></div>' +
        '<div class="text-center mb-4">' +
          '<div style="color: var(--danger); display:flex; justify-content:center; margin-bottom: 10px;">' + icon('trash', 32) + '</div>' +
          '<p class="font-display font-bold text-xl mb-2" style="color: var(--danger);">전체 데이터 삭제</p>' +
          '<p class="text-xs text-stone-400 leading-relaxed">' +
            '운동·체중·PR·1RM·코치 대화가 <strong style="color: var(--warn);">모두</strong> 지워져요.<br/>' +
            '되돌릴 수 없어요.' +
          '</p>' +
        '</div>' +
        
        '<div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 8px;">' +
          '<button class="sheet-cancel-btn" onclick="cancelResetAll()">취소</button>' +
          '<button class="sheet-delete-btn-confirm" onclick="executeResetAll()">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
            '</svg>' +
            '<span>모두 삭제</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 탭 전환
// ═══════════════════════════════════════════════
window.setTab = function(tabId, fromNav) {
  // 모든 탭 진입 시 데이터 강제 재로드 (삭제 즉시 반영 보장)
  state.data.workoutLog = storage.get(KEYS.WORKOUT_LOG) || [];
  state.data.bodyLog = storage.get(KEYS.BODY_LOG) || [];
  state.data.personalRecords = storage.get(KEYS.PERSONAL_RECORDS) || [];
  console.log('[setTab] ' + tabId + ' - 운동:' + state.data.workoutLog.length);

  // 운동 탭 진입 시 마법사는 이전 진행 단계를 그대로 유지 (저장된 state 복원됨)
  state.currentTab = tabId;
  // 뒤로가기용 탭 방문 순서 기록 (fromNav=뒤로가기가 부른 경우는 기록 안 함)
  if (!fromNav) {
    if (!state._navTabStack) state._navTabStack = ['home'];
    if (tabId === 'home') {
      state._navTabStack = ['home'];                                  // 홈으로 가면 루트 정규화
    } else if (state._navTabStack[state._navTabStack.length - 1] !== tabId) {
      state._navTabStack.push(tabId);                                 // 같은 탭 연속은 중복 제외
    }
  }
  render();
};

// PWA 설치 프롬프트 (Android Chrome)
var deferredInstallPrompt = null;

// 외부에서 호출 가능한 설치 함수
window.installPWA = function() {
  if (!deferredInstallPrompt) {
    alert('이미 설치되었거나, 브라우저 메뉴에서 "홈 화면에 추가"를 선택하세요.');
    return;
  }
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(function(choice) {
    if (choice.outcome === 'accepted') {
      showToast('설치를 시작했어요');
    }
    deferredInstallPrompt = null;
  });
};

init();

// ═══════════════════════════════════════════════
// 뒤로가기(자연스러운 단계 되돌리기) — 묶음6-D
//   화면을 통째로 다시 그리는 구조라, history 깊이로 레이어를 흉내내지 않는다.
//   대신 "트랩 1칸"만 깔아두고, 뒤로가기가 눌릴 때마다 현재 state에서
//   "지금 떠 있는 가장 위 단계"를 계산(getTopLayer)해 그 한 겹만 닫고 트랩을 다시 깐다.
//   → 열기/닫기 함수와 화면 안 X버튼을 건드리지 않아도 history 어긋남이 없다.
// ═══════════════════════════════════════════════

// 지금 화면에서 "가장 위에 떠 있는 단계"를 문자열로 판별 (render 우선순위와 정합)
function getTopLayer() {
  // 모달/시트 (다른 화면 위에 겹쳐 뜨는 가장 위 레이어)
  if (state.muscleMapZoom) return 'muscleMapZoom';    // 자극 근육 확대 (세션/미리보기 위)
  if (state.itemDetailSheet) return 'itemDetail';     // 기록 상세 (탭 위)
  if (state.editingSet) return 'setEditor';           // 세트 편집 (세션 위)
  if (state.exerciseSwapOpen) return 'exerciseSwap';  // 종목 고르기 — 교체·추가 공용 (종목 메뉴 위)
  if (state.exerciseMenuOpen) return 'exerciseMenu';  // 종목 메뉴 (세션 위)
  if (state.setSchemeOpen) return 'setScheme';        // 세트법 변경 (세션 위)
  if (state.sessionChatOpen) return 'sessionChat';    // 세트 사이 채팅 (세션 위)
  if (state.apiKeyModalOpen) return 'apiKey';         // (더보기 위)
  if (state.profileEditModalOpen) return 'profileEdit';
  if (state.resetConfirming) return 'resetConfirm';
  // 전체화면 오버레이 (render 우선순위와 동일한 순서)
  if (state.oneRMListOpen) return 'oneRMList';
  if (state.coachMemoryOpen) return 'coachMemory';
  if (state.weeklyReviewOpen) return 'weeklyReview';
  if (state.plateauOpen) return 'plateau';
  if (state.coachChatOpen) return 'coachChat';
  // 웜업/스트레칭 가이드 · 완료 화면 / 진행 중 세션 (render 우선순위와 동일한 순서)
  if (state.stretchGuide) return 'stretchGuide';
  if (state.completedSession) return 'completed';
  if (state.activeSession && state.activeSession.warmup && !state.activeSession.warmup.done) return 'warmupGuide';
  if (state.activeSession) return 'session';
  // 유산소(러닝) 세션 — RPE 입력 / 진행 중
  if (state.cardio && state.cardio.phase === 'rpe') return 'cardioRpe';
  if (state.cardio && state.cardio.phase === 'running') return 'cardioSession';
  // 루틴 만들기 마법사 (운동 탭 내부 단계). STEP1은 탭 자체라 'tab'으로 처리.
  if (state.currentTab === 'workout' && state.workoutWizardStep === 3) return 'wizard3';
  if (state.currentTab === 'workout' && state.workoutWizardStep === 2) return 'wizard2';
  // 일반 탭 / 루트(홈)
  if (state.currentTab !== 'home') return 'tab';
  return 'root';
}

// 뒤로가기 한 번 처리. 반환값: true=흡수(트랩 다시 깔기), false=앱을 실제로 떠나도 됨(홈에서 종료)
function navBack() {
  var top = getTopLayer();

  if (top === 'root') {
    // 홈 탭에서 뒤로 = 앱 종료(폰 첫화면). 토스트·재확인 없이 바로 내보낸다.
    return false;
  }

  switch (top) {
    // 모달/시트 — 기존 닫기 함수 그대로 재사용(애니가 있는 4종은 그 안에서 처리)
    case 'muscleMapZoom': closeMuscleMapZoom(); break;
    case 'itemDetail': closeItemDetail(); break;
    case 'setEditor': closeSetEditor(); break;
    case 'exerciseSwap': closeExerciseSwap(); break;
    case 'exerciseMenu': closeExerciseMenu(); break;
    case 'setScheme': closeSetSchemeSheet(); break;
    case 'sessionChat': closeSessionChat(); break;
    case 'apiKey': closeApiKeyModal(); break;
    case 'profileEdit': closeProfileEditModal(); break;
    case 'resetConfirm': cancelResetAll(); break;
    // 전체화면 오버레이
    case 'oneRMList': closeOneRMList(); break;
    case 'coachMemory': closeCoachMemory(); break;
    case 'weeklyReview': closeWeeklyReview(); break;
    case 'plateau': closePlateauDetail(); break;
    case 'coachChat': closeCoachChat(); break;
    // 웜업/스트레칭 가이드 — 스트레칭 뒤로 = 완료 화면으로 / 웜업 뒤로 = 세션과 동일하게 종료 확인
    case 'stretchGuide': window.closeStretchGuide(); break;
    case 'warmupGuide': endSession(true); break;
    // 완료 화면 / 진행 세션
    case 'completed': goHome(); break;
    case 'session': endSession(true); break;        // 운동 중 뒤로 = 항상 "종료할까요?" 팝업
    // 유산소 — 진행 중 뒤로 = "종료할까요?" 팝업 / RPE 화면 뒤로 = 평가 건너뛰고 저장
    case 'cardioSession': window.stopCardio(true); break;
    case 'cardioRpe': window.submitCardioRpe(null); break;
    // 마법사 단계
    case 'wizard3': backToStep2(); break;           // FREE면 backToStep2가 STEP1로 직행
    case 'wizard2': backToStep1(); break;
    // 일반 탭 → 방문 순서상 직전 탭으로
    case 'tab': {
      var stack = state._navTabStack;
      if (stack && stack.length > 1) {
        stack.pop();                                 // 현재 탭 제거
        setTab(stack[stack.length - 1], true);       // 직전 탭(fromNav=true → 스택 재조작 안 함)
      } else {
        setTab('home', true);
      }
      break;
    }
  }
  return true;
}

// ═══════════════════════════════════════════════
// 뒤로가기 트랩 (안드로이드 standalone PWA 대응)
//   원인: standalone PWA는 (1) 부팅 파싱 시점의 pushState가 초기 히스토리 항목에
//   흡수되어 "되돌릴 항목"이 안 생기는 경우가 있고, (2) 홈에서 앱을 다시 부르면
//   페이지가 새로 로드되지 않아(백그라운드 복귀·bfcache) 부팅 트랩이 사라져 있을 수 있다.
//   → 첫 뒤로가기가 트랩 없이 곧장 앱 종료로 빠진다.
//   해결: history.state 표식으로 idempotent하게 트랩을 "확보"(ensureBackTrap)하고,
//   부팅 + load + pageshow(복원) + 포그라운드 복귀 + popstate 흡수 직후에 매번 확보한다.
// ═══════════════════════════════════════════════
var BACK_TRAP_FLAG = '__healthBackTrap';
var BACK_BASE_FLAG = '__healthBackBase';           // 맨 아래(진짜 시작) 항목 표식 — replaceState로 심는다

// 최상단 항목이 트랩이 아니면 트랩을 하나 push 한다(있으면 그대로 — 중복 방지). history.state 표식으로 판별.
function ensureBackTrap() {
  if (typeof history === 'undefined' || !history.pushState) return;
  try {
    var st = history.state;
    if (!st || !st[BACK_TRAP_FLAG]) {
      var s = {}; s[BACK_TRAP_FLAG] = true;
      history.pushState(s, '');
    }
  } catch (e) {}
}

(function() {
  if (typeof window === 'undefined' || !window.addEventListener || typeof history === 'undefined') return;

  // 부팅: 먼저 현재(맨 아래) 항목을 base로 "마킹"한다. replaceState는 새 항목을 추가하지 않고
  //   현재 항목만 바꾸므로 standalone 부팅에서 흡수될 여지가 없다(=바닥이 확실히 우리 표식이 됨).
  //   그 위에 pushState로 트랩을 하나 더 쌓아 최소 2중(base + trap)을 확보 → 뒤로가기 한 번에 앱이 닫히지 않게.
  //   (단, 이미 트랩 항목 위에서 새로고침된 경우엔 그 트랩을 덮지 않는다.)
  try {
    if (history.replaceState && (!history.state || !history.state[BACK_TRAP_FLAG])) {
      var base = {}; base[BACK_BASE_FLAG] = true;
      history.replaceState(base, '');
    }
  } catch (e) {}
  ensureBackTrap();                                  // 부팅 즉시 트랩 확보(base 위 1칸)

  // standalone 부팅 시 pushState가 초기 항목에 흡수되는 문제 대비 — 로드 완료 후 다시 확보
  window.addEventListener('load', ensureBackTrap);
  // bfcache/홈에서 재실행 등으로 페이지가 복원될 때 트랩이 없으면 다시 확보
  window.addEventListener('pageshow', function() { ensureBackTrap(); });

  // ★자동 이벤트(load·pageshow)의 pushState는 안드로이드 standalone에서 흡수될 수 있다.
  //   첫 사용자 상호작용(제스처) 컨텍스트의 pushState는 브라우저가 확실히 반영하므로,
  //   touchstart/click에서 한 번만(once) 트랩을 재확보한다.
  var gestureArmed = false;
  function armBackTrapOnce() {
    if (gestureArmed) return;
    gestureArmed = true;
    ensureBackTrap();
  }
  window.addEventListener('touchstart', armBackTrapOnce, { once: true, passive: true });
  window.addEventListener('click', armBackTrapOnce, { once: true });

  // 안드로이드 PWA 포그라운드 복귀 시 트랩 재확보
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') ensureBackTrap();
    });
  }

  window.addEventListener('popstate', function() {
    var keep = navBack();
    if (keep) {
      ensureBackTrap();                              // 흡수 → 트랩 다시 확보
    } else {
      try { history.back(); } catch (e) {}           // 홈에서 종료 → 실제로 앱을 떠난다
    }
  });
})();

// ═══════════════════════════════════════════════
// 운동 화면 좌우 스와이프 → 다음/이전 종목
// ═══════════════════════════════════════════════
(function() {
  var startX = 0;
  var startY = 0;
  var startTime = 0;
  var tracking = false;

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    // 스크롤 가능한 입력 영역(input, textarea)에서 시작한 터치는 무시
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
      tracking = false;
      return;
    }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!tracking) return;
    tracking = false;

    // 운동 진행 중 + 다른 오버레이 없을 때만 동작
    if (!state.activeSession) return;
    if (state.editingSet) return;
    if (state.exerciseSwapOpen) return;
    if (state.exerciseMenuOpen) return;
    if (state.setSchemeOpen) return;
    if (state.completedSession) return;
    if (state.itemDetailSheet) return;
    if (state.resetConfirming) return;
    if (state.muscleMapZoom) return;   // 자극 근육 확대 중엔 스와이프로 종목이 넘어가면 안 된다
    if (state.stretchGuide) return;    // 웜업/스트레칭 가이드 위에서는 종목이 조용히 넘어가면 안 된다
    if (state.activeSession.warmup && !state.activeSession.warmup.done) return;

    var touch = e.changedTouches[0];
    if (!touch) return;

    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;
    var dt = Date.now() - startTime;

    // 임계값: 수평 60px 이상, 수평이 수직보다 1.5배 이상 우세, 800ms 이내
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dt > 800) return;

    var session = state.activeSession;
    var idx = session.currentExerciseIdx;
    var total = session.exercises.length;

    if (dx < 0 && idx < total - 1) {
      // 좌로 스와이프 → 다음 종목
      window.goToExercise(idx + 1);
    } else if (dx > 0 && idx > 0) {
      // 우로 스와이프 → 이전 종목
      window.goToExercise(idx - 1);
    }
  }, { passive: true });
})();

// ═══════════════════════════════════════════════
// PWA - Service Worker 등록
// ═══════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    // 새 버전 안내 배너 — 전역 오염 방지를 위해 콜백 내부 지역 함수로 둔다.
    // 새 서비스워커가 '설치됨' 상태가 되었고, 이미 페이지를 제어하는 SW가 있으면(=첫 설치가 아닌 업데이트)
    // 사용자에게 새로고침을 권한다. 자동 새로고침은 하지 않는다(루프·작업중단 방지).
    var updateBannerShown = false;
    function showAppUpdateBanner() {
      if (updateBannerShown) return;
      updateBannerShown = true;
      var bar = document.createElement('div');
      bar.style.cssText = 'position: fixed; left: 50%; bottom: 100px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: var(--accent); color: var(--bg-0); padding: 11px 14px 11px 16px; border-radius: 100px; font-family: var(--font); font-size: 13px; font-weight: 700; z-index: 9999; box-shadow: 0 8px 24px rgba(var(--accent-rgb),0.45); max-width: 92vw;';
      var label = document.createElement('span');
      label.textContent = '🆕 새 버전이 있어요';
      var reloadBtn = document.createElement('button');
      reloadBtn.textContent = '새로고침';
      reloadBtn.style.cssText = 'background: var(--bg-0); color: var(--accent); border: none; border-radius: 100px; padding: 6px 12px; font-weight: 700; font-size: 12px; font-family: inherit; cursor: pointer;';
      reloadBtn.addEventListener('click', function() { window.location.reload(); });
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', '닫기');
      closeBtn.style.cssText = 'background: transparent; color: var(--bg-0); border: none; font-size: 14px; font-weight: 700; cursor: pointer; padding: 2px 4px; line-height: 1;';
      closeBtn.addEventListener('click', function() { bar.remove(); });
      bar.appendChild(label);
      bar.appendChild(reloadBtn);
      bar.appendChild(closeBtn);
      document.body.appendChild(bar);
    }

    navigator.serviceWorker.register('/service-worker.js')
      .then(function(reg) {
        console.log('[PWA] Service Worker 등록 성공:', reg.scope);
        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showAppUpdateBanner();
            }
          });
        });
      })
      .catch(function(err) {
        console.warn('[PWA] Service Worker 등록 실패:', err);
      });
  });
}
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
  console.log('[PWA] 설치 가능');
});

window.addEventListener('appinstalled', function() {
  console.log('[PWA] 앱 설치 완료');
  showToast('헬스앱 설치 완료');
});
