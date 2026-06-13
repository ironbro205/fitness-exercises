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
  
  var todayMeals = data.nutritionLog.filter(function(m) { return m.date === tdStr; });
  var todayProtein = todayMeals.reduce(function(s, m) { return s + m.protein; }, 0);
  var proteinPercent = Math.round((todayProtein / profile.proteinTarget) * 100);
  var proteinRemaining = Math.max(0, profile.proteinTarget - todayProtein);
  var thresholdPassed = todayMeals.filter(function(m) { return m.thresholdPassed; }).length;
  
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
  
  // 7주 도트
  var weekDots = '';
  for (var i = 0; i < 7; i++) {
    weekDots += '<div class="dot ' + (i === profile.currentWeek - 1 ? 'dot-ideal' : 'dot-pending') + '"></div>';
    if (i < 6) weekDots += '<div class="flex-1 h-px bg-stone-800"></div>';
  }
  
  // 끼니별
  var meals = '';
  ['아침','점심','저녁','간식'].forEach(function(meal, idx) {
    var key = ['breakfast','lunch','dinner','snack'][idx];
    var m = todayMeals.find(function(x) { return x.meal === key; });
    var passed = m && m.thresholdPassed;
    meals += '<div class="text-center">' +
      '<div class="flex justify-center mb-1\\.5"><div class="dot ' + (passed ? 'dot-passed' : 'dot-pending') + '"></div></div>' +
      '<p class="text-[10px] font-mono text-stone-400">' + meal + '</p>' +
      '<p class="text-[11px] font-mono text-stone-300 mt-0\\.5">' + (m ? m.protein + 'g' : '—') + '</p>' +
    '</div>';
  });
  
  // 주간 요일 박스
  var weekBoxes = '';
  weekDays.forEach(function(day, idx) {
    var completed = weekMap[idx];
    var isToday = idx === todayDayIdx;
    var boxClass = completed ? 'day-box-done' : (isToday ? 'day-box-today' : 'day-box-empty');
    var dayColor = isToday ? '#00d4ff' : '#6b7a99';
    
    weekBoxes += '<div class="text-center">' +
      '<div class="day-box ' + boxClass + '">' +
        (completed ? '<p class="text-[9px] font-display font-bold accent">' + completed + '</p>' : '') +
        (!completed && isToday ? '<div class="today-dot"></div>' : '') +
      '</div>' +
      '<p class="text-[9px] font-mono mt-1" style="color: ' + dayColor + '">' + day + '</p>' +
    '</div>';
  });
  
  // PR 카드
  var prCards = '';
  recentPRs.forEach(function(pr) {
    prCards += '<div class="pr-badge">' +
      '<div>' +
        '<p class="text-sm font-display font-bold">' + pr.exerciseName + '</p>' +
        '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + daysAgo(pr.date) + (pr.weight ? ' · ' + pr.reps + '회' : '') + '</p>' +
      '</div>' +
      '<div class="text-right">' +
        '<p class="font-bebas text-2xl accent">' + (pr.weight ? pr.weight : pr.reps) + '<span class="text-xs text-stone-500">' + (pr.weight ? 'kg' : '회') + '</span></p>' +
        '<p class="text-[10px] font-mono text-stone-500">' + (pr.weight && pr.previousWeight ? '+' + (pr.weight - pr.previousWeight).toFixed(1) + 'kg' : (pr.previousReps ? '+' + (pr.reps - pr.previousReps) + '회' : '')) + '</p>' +
      '</div>' +
    '</div>';
  });
  
  return '' +
    // 헤더
    '<div class="px-5 pt-12 pb-5">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<p class="text-xs uppercase font-mono text-stone-500" style="letter-spacing: 0.3em;">' + fmtDate(today) + ' · ' + dayNames[today.getDay()] + '</p>' +
        '<div class="flex items-center gap-2">' +
          '<span class="status-dot animate-pulse"></span>' +
          '<p class="text-xs font-mono accent">CYCLE ' + profile.currentCycle + ' · WK ' + profile.currentWeek + '/7</p>' +
        '</div>' +
      '</div>' +
      '<h1 class="font-bebas text-4xl">홈</h1>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      
      // 사이클 카드
      '<div class="card-accent mb-4">' +
        '<div class="relative">' +
          '<div class="flex items-baseline justify-between mb-1">' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">현재 단계</p>' +
            '<p class="text-xs font-mono accent">' + profile.currentWeek + '주차 / 7</p>' +
          '</div>' +
          '<div class="flex items-end justify-between mb-4">' +
            '<h2 class="font-bebas text-4xl">' + profile.cyclePhase + '</h2>' +
            '<p class="text-xs text-stone-500 font-mono">가볍게 시작</p>' +
          '</div>' +
          '<div class="flex items-center gap-1\\.5">' + weekDots + '</div>' +
          '<div class="flex items-center justify-between mt-2">' +
            '<p class="text-[10px] text-stone-600 font-mono uppercase">적응</p>' +
            '<p class="text-[10px] text-stone-600 font-mono uppercase">구축</p>' +
            '<p class="text-[10px] text-stone-600 font-mono uppercase">강화</p>' +
            '<p class="text-[10px] text-stone-600 font-mono uppercase">디로드</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 단백질 카드
      '<div class="card mb-4">' +
        '<div class="flex items-baseline justify-between mb-4">' +
          '<div>' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">오늘 단백질</p>' +
            '<p class="font-bebas text-4xl">' + todayProtein + '<span class="text-xl text-stone-500">/' + profile.proteinTarget + 'g</span></p>' +
          '</div>' +
          '<div class="text-right">' +
            '<p class="text-xs text-stone-500 font-mono">남은 양</p>' +
            '<p class="font-bebas text-2xl accent">' + proteinRemaining + 'g</p>' +
          '</div>' +
        '</div>' +
        '<div class="progress-bg mb-4"><div class="progress-fill" style="width: ' + Math.min(100, proteinPercent) + '%"></div></div>' +
        '<div class="border-t pt-4">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3">끼니 분배 · 임계점 ' + thresholdPassed + '/4</p>' +
          '<div class="grid grid-cols-4 gap-2">' + meals + '</div>' +
        '</div>' +
      '</div>' +
      
      // 이번 주 운동
      '<div class="card mb-4">' +
        '<div class="flex items-baseline justify-between mb-4">' +
          '<div>' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">이번 주 운동</p>' +
            '<p class="font-bebas text-4xl">' + thisWeekWorkouts.length + '<span class="text-xl text-stone-500">회</span></p>' +
          '</div>' +
          '<div class="text-right">' +
            '<p class="text-xs text-stone-500 font-mono">목표</p>' +
            '<p class="text-sm font-display font-bold accent">주 ' + profile.workoutFreq + '회</p>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-7 gap-1\\.5">' + weekBoxes + '</div>' +
        
        // 최근 운동 리스트 (있을 시)
        (thisWeekWorkouts.length > 0 ? 
          '<div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #1a2540;">' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2">최근 운동 (클릭하여 상세)</p>' +
            thisWeekWorkouts.slice(-3).reverse().map(function(w) {
              var d = new Date(w.date);
              var dStr = ['일','월','화','수','목','금','토'][d.getDay()];
              return '<div class="workout-history-row" onclick="openItemDetail(\'workout\', \'' + (w.startTime || w.id) + '\')">' +
                '<div class="flex items-center gap-3">' +
                  '<div class="workout-history-dot"></div>' +
                  '<div>' +
                    '<p class="text-xs font-display font-bold">' + (w.sessionKr || w.sessionName) + '</p>' +
                    '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + w.date.substring(5) + ' (' + dStr + ') · ' + (w.duration || 0) + '분 · ' + (w.sets || 0) + '세트</p>' +
                  '</div>' +
                '</div>' +
                '<div style="color: #6b7a99;">' + icon('chevron', 14) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' : '') +
      '</div>' +
      
      // 주간 리뷰 카드 (일요일 또는 새 주차)
      (state.weeklyReview ? 
        '<div class="weekly-review-card mb-4" onclick="openWeeklyReview()">' +
          '<div class="relative">' +
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="ai-badge">📊 주간 리뷰</span>' +
              '<p class="text-[10px] font-mono text-stone-500">' + state.weeklyReview.monday.substring(5) + ' ~ ' + state.weeklyReview.sunday.substring(5) + '</p>' +
            '</div>' +
            '<div class="flex items-baseline gap-3 mb-2">' +
              '<p class="font-bebas text-5xl" style="color: ' + ({S:'#00d4ff',A:'#00d4ff',B:'#a78bfa',C:'#fbbf24',D:'#ef4444'}[state.weeklyReview.grade] || '#a78bfa') + ';">' + state.weeklyReview.grade + '</p>' +
              '<p class="text-sm font-display font-bold leading-tight">' + state.weeklyReview.headline + '</p>' +
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
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">이번 주 데이터 종합 중...</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '')) +
      
      // 정체기 경고 카드 (감지 시)
      (state.plateauCheck ? 
        '<div class="plateau-card mb-4" onclick="openPlateauDetail()">' +
          '<div class="flex items-start gap-3">' +
            '<div style="color: #fbbf24; flex-shrink: 0;">' + icon('info', 22) + '</div>' +
            '<div class="flex-1">' +
              '<div class="flex items-center justify-between mb-1">' +
                '<p class="text-xs font-display font-bold" style="color: #fbbf24;">⚠️ 정체기 신호 감지</p>' +
                '<p class="text-[10px] font-mono text-stone-500">' + state.plateauCheck.signals.length + '개 신호</p>' +
              '</div>' +
              '<p class="text-sm text-stone-200 leading-relaxed mb-2">' + (state.plateauCheck.primary_cause || '진행이 정체되고 있어요.') + '</p>' +
              '<p class="text-[11px] font-mono" style="color: #fbbf24;">분석 보기 →</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '') +
      
      // 코치 메시지
      '<div class="card-coach mb-4" onclick="openCoachChat()" style="cursor: pointer;">' +
        '<div class="flex items-start gap-3">' +
          '<div class="coach-icon accent">' + icon('msg', 18) + '</div>' +
          '<div class="flex-1">' +
            '<div class="flex items-baseline justify-between mb-1\\.5">' +
              '<p class="text-xs font-mono accent uppercase tracking-widest">COACH</p>' +
              '<p class="text-[10px] font-mono accent">대화하기 →</p>' +
            '</div>' +
            '<p class="text-sm text-stone-200 leading-relaxed">' +
              (proteinRemaining > 0 
                ? '이번 주는 적응 단계예요. 무게보다 폼에 집중하세요. 단백질 ' + proteinRemaining + 'g 더 채우면 오늘 목표 달성입니다.'
                : '오늘 단백질 목표 달성! 회복에 집중하세요.') +
            '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // PR
      (recentPRs.length > 0 ? (
        '<div class="card mb-4">' +
          '<div class="flex items-center justify-between mb-3">' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">최근 PR</p>' +
            '<p class="text-xs font-mono accent">이번 달 ' + data.personalRecords.length + '개</p>' +
          '</div>' +
          '<div style="display: flex; flex-direction: column; gap: 8px;">' + prCards + '</div>' +
        '</div>'
      ) : '') +
      
      // 빠른 입력
      '<div>' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3 px-1">빠른 입력</p>' +
        '<div class="grid grid-cols-3 gap-2">' +
          '<button class="quick-btn" onclick="setTab(\'workout\')">' +
            '<div class="quick-btn-icon">' + icon('dumbbell', 20) + '</div>' +
            '<p class="text-xs font-display font-bold">운동</p>' +
          '</button>' +
          '<button class="quick-btn" onclick="setTab(\'fuel\')">' +
            '<div class="quick-btn-icon">' + icon('apple', 20) + '</div>' +
            '<p class="text-xs font-display font-bold">영양</p>' +
          '</button>' +
          '<button class="quick-btn" onclick="setTab(\'stats\')">' +
            '<div class="quick-btn-icon">' + icon('scale', 20) + '</div>' +
            '<p class="text-xs font-display font-bold">체중</p>' +
          '</button>' +
        '</div>' +
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
      var part = w.sessionKr ? w.sessionKr.toLowerCase() : 'free';
      var heightPct = Math.min(90, 50 + (w.duration || 60) / 2);
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
    var countClass = count === 0 ? 'zero' : (count >= 2 ? 'done' : '');
    
    return '<div class="' + cardClass + '" onclick="selectBodyPart(\'' + key + '\')">' +
      (isRecommended ? '<span class="recommend-badge">✨ 추천</span>' : '') +
      '<div class="body-part-header">' +
        '<p class="body-part-name' + (isRecommended ? ' recommended' : '') + '">' + name + '</p>' +
        '<div class="body-part-count">' +
          '<p class="body-part-count-num ' + countClass + '">' + count + '</p>' +
          '<p class="body-part-count-label">이번 주</p>' +
        '</div>' +
      '</div>' +
      '<p class="body-part-desc">' + koreanName + ' · ' + desc + '</p>' +
    '</div>';
  }
  
  return '' +
    // 헤더
    '<div class="px-5 pt-12 pb-5">' +
      '<p class="text-xs uppercase font-mono text-stone-500 mb-2" style="letter-spacing: 0.3em;">WORKOUT</p>' +
      '<h1 class="font-bebas text-4xl">오늘 운동</h1>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      
      // 스텝 인디케이터
      '<div class="step-indicator">' +
        '<div class="step-dot active"></div>' +
        '<div class="step-line"></div>' +
        '<div class="step-dot"></div>' +
        '<div class="step-line"></div>' +
        '<div class="step-dot"></div>' +
        '<p class="text-[10px] font-mono accent ml-2">STEP 1 · 부위 선택</p>' +
      '</div>' +
      
      // 주간 기록 (7일 막대)
      '<div class="weekly-bars-card">' +
        '<div class="weekly-bars-header">' +
          '<div>' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-1">이번 주 기록</p>' +
            '<p class="font-bebas text-2xl">' + thisWeek.length + '<span class="text-sm text-stone-500"> / ' + state.profile.workoutFreq + '회</span></p>' +
          '</div>' +
          '<div class="text-right">' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-1">목표 달성</p>' +
            '<p class="font-bebas text-2xl accent">' + Math.round((thisWeek.length / state.profile.workoutFreq) * 100) + '<span class="text-sm text-stone-500">%</span></p>' +
          '</div>' +
        '</div>' +
        '<div class="weekly-bars-grid">' + dayBarsHtml + '</div>' +
        '<div class="weekly-legend">' +
          '<div class="legend-item"><div class="legend-dot" style="background: #00d4ff;"></div>PUSH</div>' +
          '<div class="legend-item"><div class="legend-dot" style="background: #a78bfa;"></div>PULL</div>' +
          '<div class="legend-item"><div class="legend-dot" style="background: #fbbf24;"></div>LEGS</div>' +
          '<div class="legend-item"><div class="legend-dot" style="background: #6b7a99;"></div>FREE</div>' +
        '</div>' +
      '</div>' +
      
      // 부위 선택
      '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-3 px-1">오늘 어느 부위를 할까요?</p>' +
      
      partCard('push', 'PUSH', '가슴 · 어깨 · 삼두', '밀기 동작', pushCount) +
      partCard('pull', 'PULL', '등 · 이두', '당기기 동작', pullCount) +
      partCard('legs', 'LEGS', '하체 · 코어', '레그 데이', legsCount) +
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
        content: '오늘 어떤 운동을 하고 싶으세요? 자유롭게 말씀해주세요.\n\n예를 들어:\n· "어깨 위주로 30분만"\n· "가슴 + 이두 같이"\n· "오늘은 가볍게 풀바디"\n· "1RM의 70% 정도로 6종목"\n\n원하는 부위, 시간, 강도를 알려주시면 루틴을 제안할게요. [✓ 적용하기] 버튼으로 반영됩니다.'
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
      reason: 'API 키가 설정되지 않아 기본 루틴을 표시합니다. 더보기에서 키를 설정하면 AI가 1RM 기반으로 맞춤 루틴을 만들어줍니다.',
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
    var partKor = { push: '가슴/어깨/삼두', pull: '등/이두', legs: '하체/코어', free: '자유' };
    var part = state.selectedBodyPart;

    state.routineChatHistory = [
      {
        role: 'assistant',
        content: '루틴 수정을 도와드릴게요. 어떤 부분을 바꾸고 싶으세요?\n\n변경안을 제안하면 [✓ 적용하기] 버튼을 눌러 반영할 수 있어요.\n\n예시:\n· "스쿼트 빼고 핵스쿼트 추가"\n· "전체 무게 좀 가볍게"\n· "시간 30분 안으로 줄여"\n· "이두 운동도 같이 하고 싶어"'
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
      content: '⚠️ API 키가 필요해요. 더보기 > Anthropic API 키에서 설정해주세요.'
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
      content: '⚠️ 수정 실패: ' + result.error
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
    state.routineChatHistory.push({
      role: 'assistant',
      content: result.reply,
      changes: result.changes,
      pendingRoutine: result.updatedRoutine,  // 사용자 승인 대기
      approvalStatus: result.updatedRoutine ? 'pending' : null  // pending | applied | cancelled
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
    return '<div class="px-5 pt-12 text-center"><p class="text-sm text-stone-400">루틴이 없습니다</p>' +
      '<button onclick="backToStep1()" class="text-xs accent mt-4">처음으로</button></div>';
  }
  
  var partNames = { push: 'PUSH', pull: 'PULL', legs: 'LEGS', free: 'FREE' };
  var partName = partNames[state.selectedBodyPart] || routine.bodyPart || '';
  
  // 미리보기 - 종목 리스트
  var previewExHtml = '';
  if (state.routinePreviewExpanded) {
    routine.exercises.forEach(function(ex, idx) {
      var weight = ex.weight ? ex.weight + 'kg × ' : '';
      previewExHtml += 
        '<div class="routine-preview-ex">' +
          '<span class="flex-1"><strong>' + (idx + 1) + '. ' + ex.name + '</strong></span>' +
          '<span class="text-stone-400 font-mono text-[10px]">' + weight + ex.reps + ' · ' + ex.sets + '세트</span>' +
        '</div>';
    });
  }
  
  // 채팅 메시지
  var messagesHtml = '';
  state.routineChatHistory.forEach(function(msg, idx) {
    if (msg.role === 'assistant') {
      var changesHtml = '';
      if (msg.changes && msg.changes.length > 0) {
        var changeLines = msg.changes.map(function(c) {
          var iconCls = c.type === 'add' ? 'add' : c.type === 'remove' ? 'remove' : 'modify';
          var sym = c.type === 'add' ? '+' : c.type === 'remove' ? '−' : '~';
          return '<div class="change-line">' +
            '<div class="change-icon ' + iconCls + '">' + sym + '</div>' +
            '<span class="text-stone-200"><strong>' + c.exercise + '</strong> ' + c.detail + '</span>' +
          '</div>';
        }).join('');
        
        // 승인 상태별 액션 버튼
        var actionHtml = '';
        if (msg.approvalStatus === 'pending') {
          actionHtml = 
            '<div class="change-approval-actions">' +
              '<button class="change-approval-btn cancel" onclick="cancelRoutineChange(' + idx + ')">취소</button>' +
              '<button class="change-approval-btn apply" onclick="approveRoutineChange(' + idx + ')">✓ 적용하기</button>' +
            '</div>';
        } else if (msg.approvalStatus === 'applied') {
          actionHtml = 
            '<div class="change-approval-actions" style="grid-template-columns: 1fr;">' +
              '<button class="change-approval-btn applied">✓ 적용 완료</button>' +
            '</div>';
        } else if (msg.approvalStatus === 'cancelled') {
          actionHtml = 
            '<div class="change-approval-actions" style="grid-template-columns: 1fr;">' +
              '<button class="change-approval-btn cancel" style="pointer-events: none; opacity: 0.6;">취소됨</button>' +
            '</div>';
        }
        
        changesHtml = '<div class="routine-change-card">' +
          '<p class="text-[10px] font-mono accent uppercase tracking-widest mb-1\\.5">✨ 제안된 변경사항</p>' +
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
      '<div class="px-5 pt-12 pb-3" style="border-bottom: 1px solid #1a2540;">' +
        '<div class="flex items-center justify-between">' +
          '<button onclick="backToStep2()" class="session-header-btn" title="뒤로">' + icon('arrowLeft', 18) + '</button>' +
          '<div class="text-center">' +
            '<p class="text-[10px] font-mono text-stone-500" style="letter-spacing: 0.2em;">' + (isFree ? 'FREE · 자유 구성' : 'STEP 3 · 대화 수정') + '</p>' +
            '<p class="text-[10px] font-mono text-stone-600 mt-0\\.5">' + partName + '</p>' +
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
            '<span class="ai-badge">' + partName + '</span>' +
            '<div>' +
              '<p class="text-xs font-display font-bold">' + (isEmpty ? '아직 종목이 없어요' : routine.headline) + '</p>' +
              '<p class="text-[10px] font-mono text-stone-500">' + (isEmpty ? '대화로 종목을 추가해주세요' : exCount + '개 종목 · ' + routine.totalSets + '세트 · ' + routine.duration + '분' + (routine.wasModified ? ' · ✨수정됨' : '')) + '</p>' +
            '</div>' +
          '</div>' +
          (isEmpty ? '' : '<div class="chevron-icon ' + (state.routinePreviewExpanded ? 'expanded' : '') + '" style="color: #6b7a99;">' + icon('chevron', 16) + '</div>') +
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
            '<input type="text" id="rc-input" placeholder="' + (state.apiKey ? (isFree ? '원하는 운동을 말해주세요...' : '수정 요청...') : 'API 키 필요') + '" value="' + state.routineChatInput + '" oninput="updateRoutineChatInput(this.value)" onkeydown="if(event.key===\'Enter\') sendRoutineModification()" ' + (state.routineChatThinking ? 'disabled' : '') + ' />' +
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
      
    '</div>';
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
    var sets = [];
    
    // 워밍업 1세트 (메인 종목만)
    if (ex.isMain) {
      sets.push({
        weight: ex.weight ? Math.round((ex.weight * 0.5) / 2.5) * 2.5 : null,
        reps: 10,
        completed: false,
        isWarmup: true
      });
    }
    
    // 본 세트
    for (var s = 0; s < (ex.sets || 3); s++) {
      sets.push({
        weight: ex.weight || null,
        reps: parseInt(String(ex.reps).split('-')[0]) || 8,
        completed: false,
        isWarmup: false
      });
    }
    
    return {
      name: ex.name,
      type: ex.type || '보조',
      sets: sets,
      reps: ex.reps,
      targetReps: ex.reps || '8-12',  // 세션 화면에서 사용
      lastWeight: ex.weight !== undefined ? ex.weight : null,
      lastReps: null,
      reps_done: ex.reps,
      note: ex.note
    };
  });
  
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
  var partNames = { push: 'PUSH', pull: 'PULL', legs: 'LEGS', free: 'FREE' };
  var partKor = { push: '가슴 · 어깨 · 삼두', pull: '등 · 이두', legs: '하체 · 코어', free: '자유 구성' };
  var part = state.selectedBodyPart;
  var routine = state.generatedRoutine;
  
  // 헤더 (공통)
  var headerHtml = 
    '<div class="px-5 pt-12 pb-3">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<button onclick="backToStep1()" class="text-xs font-mono accent">← 뒤로</button>' +
        '<p class="text-[10px] font-mono text-stone-500" style="letter-spacing: 0.2em;">STEP 2 · 루틴 분석</p>' +
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
        '<p class="font-bebas text-3xl mb-1" style="color: #00d4ff;">' + partNames[part] + '</p>' +
        '<p class="text-xs text-stone-400 mb-1">' + partKor[part] + '</p>' +
        '<p class="text-sm text-stone-300 mt-4">AI가 맞춤 루틴 분석 중...</p>' +
        
        '<div class="routine-loading-steps">' +
          '<div class="routine-loading-step done">' +
            '<div class="routine-loading-step-dot"></div>' +
            '<span>사용자 1RM 데이터 분석</span>' +
          '</div>' +
          '<div class="routine-loading-step done">' +
            '<div class="routine-loading-step-dot"></div>' +
            '<span>최근 4주 패턴 검토</span>' +
          '</div>' +
          '<div class="routine-loading-step active">' +
            '<div class="routine-loading-step-dot"></div>' +
            '<span>최적 종목 6~7개 선정 중</span>' +
          '</div>' +
          '<div class="routine-loading-step">' +
            '<div class="routine-loading-step-dot"></div>' +
            '<span>작업 무게 계산</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '</div>';
  }
  
  // 에러 화면
  if (!routine || routine.error) {
    return headerHtml +
      '<div class="card-warning text-center" style="padding: 40px 20px;">' +
        '<p class="font-bebas text-2xl mb-2" style="color: #fbbf24;">루틴 생성 실패</p>' +
        '<p class="text-sm text-stone-400 mb-4">' + (routine ? routine.error : '알 수 없는 오류') + '</p>' +
        '<button class="routine-btn-modify" onclick="regenerateRoutine()">다시 시도</button>' +
      '</div>' +
      '</div>';
  }
  
  // 강도 표시
  var intensityLabel = { 
    light: '🟢 가볍게', 
    moderate: '🟡 적당히', 
    challenging: '🔴 도전' 
  }[routine.intensity] || '🟡 적당히';
  
  // 종목 카드 렌더
  var exercisesHtml = '';
  routine.exercises.forEach(function(ex, idx) {
    var cardCls = ex.isMain ? 'routine-exercise main' : 'routine-exercise';
    var numCls = ex.isMain ? 'routine-ex-num main' : 'routine-ex-num';
    var typeTag = ex.isMain ? '<span class="routine-ex-tag">메인</span>' : '';
    
    exercisesHtml += 
      '<div class="' + cardCls + '">' +
        '<div class="routine-ex-header">' +
          '<div class="flex items-start gap-3 flex-1">' +
            '<div class="' + numCls + '">' + (idx + 1) + '</div>' +
            '<div class="flex-1">' +
              '<p class="routine-ex-name">' + ex.name + typeTag + '</p>' +
              '<p class="routine-ex-type">' + ex.type + (ex.note ? ' · ' + ex.note : '') + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="routine-ex-prescription">' +
          (ex.weight !== null && ex.weight !== undefined ? 
            '<div class="routine-ex-stat">' +
              '<p class="routine-ex-stat-label">무게</p>' +
              '<p class="routine-ex-stat-value">' + ex.weight + '<span class="text-[10px] text-stone-500">kg</span></p>' +
            '</div>' : '') +
          '<div class="routine-ex-stat">' +
            '<p class="routine-ex-stat-label">반복</p>' +
            '<p class="routine-ex-stat-value regular">' + ex.reps + '</p>' +
          '</div>' +
          '<div class="routine-ex-stat">' +
            '<p class="routine-ex-stat-label">세트</p>' +
            '<p class="routine-ex-stat-value regular">' + ex.sets + '</p>' +
          '</div>' +
          '<div class="routine-ex-stat">' +
            '<p class="routine-ex-stat-label">RIR</p>' +
            '<p class="routine-ex-stat-value regular">' + ex.rir + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  });
  
  return headerHtml +
    
    // 분석 헤더 카드
    '<div class="routine-analysis-card">' +
      '<div class="flex items-center justify-between mb-2 relative">' +
        '<div class="flex items-center gap-2">' +
          '<span class="ai-badge">✨ AI 분석 완료</span>' +
          (routine.isFallback ? '' : '<span class="api-status-badge" style="background: rgba(0,212,255,0.1); color: #00d4ff; border-color: rgba(0,212,255,0.3); font-size: 9px; padding: 3px 7px;">Sonnet 4.6</span>') +
        '</div>' +
        '<button onclick="regenerateRoutine()" style="color: #00d4ff; opacity: 0.6;" title="다시 분석">' + icon('refresh', 14) + '</button>' +
      '</div>' +
      '<p class="font-bebas text-4xl mb-1 relative" style="color: #00d4ff;">' + partNames[part] + '</p>' +
      '<p class="text-sm text-stone-300 leading-relaxed mb-1 relative">' + routine.headline + '</p>' +
      '<p class="text-xs text-stone-500 relative">' + partKor[part] + '</p>' +
      
      '<div class="routine-meta-grid">' +
        '<div class="routine-meta-item">' +
          '<p class="routine-meta-num">' + routine.exercises.length + '</p>' +
          '<p class="routine-meta-label">종목</p>' +
        '</div>' +
        '<div class="routine-meta-item">' +
          '<p class="routine-meta-num">' + routine.totalSets + '</p>' +
          '<p class="routine-meta-label">세트</p>' +
        '</div>' +
        '<div class="routine-meta-item">' +
          '<p class="routine-meta-num">' + routine.duration + '<span class="text-xs text-stone-500">분</span></p>' +
          '<p class="routine-meta-label">예상</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    
    // AI 이유 / 주의사항
    (routine.reason ? 
      '<div class="routine-insight">' +
        '<p class="routine-insight-label accent">💡 왜 이렇게 구성했나</p>' +
        '<p class="text-sm text-stone-200 leading-relaxed">' + routine.reason + '</p>' +
      '</div>' : '') +
    
    (routine.caution ? 
      '<div class="routine-insight warning">' +
        '<p class="routine-insight-label" style="color: #fbbf24;">⚠️ 주의사항</p>' +
        '<p class="text-sm text-stone-200 leading-relaxed">' + routine.caution + '</p>' +
      '</div>' : '') +
    
    // 강도 + 종목 헤더
    '<div class="flex items-center justify-between mt-5 mb-3 px-1">' +
      '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">추천 루틴</p>' +
      '<p class="text-[10px] font-mono">' + intensityLabel + '</p>' +
    '</div>' +
    
    // 종목 리스트
    exercisesHtml +
    
    // 액션 버튼 (수정/시작)
    '<div class="routine-actions">' +
      '<button class="routine-btn-modify" onclick="goToStep3()">' +
        '💬 수정하기' +
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
  } else if (type === 'meal') {
    data = state.data.nutritionLog.find(function(m) { return String(m.id) === idStr; });
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

window.closeItemDetail = function() {
  state.itemDetailSheet = null;
  state.itemDeleteConfirming = false;
  render();
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
  } else if (type === 'meal') {
    beforeCount = state.data.nutritionLog.length;
    console.log('[executeDelete] 대상 음식:', JSON.stringify({id: data.id, date: data.date, meal: data.meal}));
    state.data.nutritionLog = state.data.nutritionLog.filter(function(m) {
      if (data.id !== undefined && m.id !== undefined && String(m.id) === String(data.id)) return false;
      // id 없으면 date+meal로 매칭 (폴백)
      if (data.id === undefined && m.date === data.date && m.meal === data.meal) return false;
      return true;
    });
    afterCount = state.data.nutritionLog.length;
    storage.set(KEYS.NUTRITION_LOG, state.data.nutritionLog);
    console.log('[삭제] 영양 ' + beforeCount + ' → ' + afterCount);
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
    showToast('✓ 삭제 완료');
  } else {
    showToast('⚠ 삭제 실패 - 항목을 찾지 못함', true);
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
    var dateStr = data.date + ' (' + ['일','월','화','수','목','금','토'][dateObj.getDay()] + ')';
    var sessionLabel = data.sessionKr || data.sessionName || data.sessionType || data.session || 'WORKOUT';
    
    var exercisesList = '';
    if (data.exercises && Array.isArray(data.exercises) && data.exercises.length > 0) {
      exercisesList = data.exercises.map(function(ex, idx) {
        var exName = ex.name || ex.exerciseName || '종목 ' + (idx + 1);
        var setSummary = '';
        if (ex.sets && ex.sets.length > 0) {
          var completedSets = ex.sets.filter(function(s) { return s.completed && !s.isWarmup; });
          if (completedSets.length > 0) {
            var lastSet = completedSets[completedSets.length - 1];
            setSummary = (lastSet.weight ? lastSet.weight + 'kg × ' : '') + lastSet.reps + ' · ' + completedSets.length + '세트';
          }
        } else if (ex.weight) {
          setSummary = ex.weight + 'kg × ' + (ex.reps || '?') + ' · ' + (ex.completedSets || ex.setsCount || '?') + '세트';
        }
        return '<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1a2540; font-size: 12px;">' +
          '<span><strong>' + (idx + 1) + '.</strong> ' + exName + '</span>' +
          '<span class="font-mono text-stone-400">' + setSummary + '</span>' +
        '</div>';
      }).join('');
    }
    
    bodyHtml = 
      '<div class="text-center mb-5">' +
        '<p class="font-bebas text-4xl mb-1" style="color: #00d4ff;">' + sessionLabel + '</p>' +
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
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2">종목 기록</p>' +
          exercisesList +
        '</div>' : '');
        
  } else if (type === 'meal') {
    headerLabel = '음식 기록';
    var mealKrLabel = data.mealKr || ({ breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' }[data.meal] || data.meal);
    
    // foods 리스트 (있으면)
    var foodsListHtml = '';
    if (data.foods && data.foods.length > 0) {
      foodsListHtml = '<div class="card mb-4" style="padding: 14px;">' +
        '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2">음식 목록</p>' +
        data.foods.map(function(f, idx) {
          return '<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: ' + (idx < data.foods.length - 1 ? '1px solid #1a2540' : 'none') + ';">' +
            '<div>' +
              '<p class="text-xs font-display font-bold">' + (f.name || '음식') + '</p>' +
              (f.amount ? '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + f.amount + '</p>' : '') +
            '</div>' +
            '<div class="text-right">' +
              '<p class="text-xs font-mono accent">' + (f.protein || 0) + 'g</p>' +
              '<p class="text-[9px] font-mono text-stone-500">' + (f.kcal || f.calories || 0) + 'kcal</p>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    }
    
    bodyHtml = 
      '<div class="text-center mb-5">' +
        '<p class="font-display font-bold text-xl mb-1">' + mealKrLabel + '</p>' +
        '<p class="text-xs font-mono text-stone-400">' + data.date + (data.time ? ' · ' + data.time : '') + '</p>' +
      '</div>' +
      
      '<div class="grid grid-cols-4 gap-2 mb-4">' +
        '<div class="stat-sheet-card">' +
          '<p class="stat-sheet-label">단백질</p>' +
          '<p class="stat-sheet-value accent">' + (data.protein || 0) + '<span class="stat-sheet-unit">g</span></p>' +
        '</div>' +
        '<div class="stat-sheet-card">' +
          '<p class="stat-sheet-label">탄수</p>' +
          '<p class="stat-sheet-value">' + (data.carbs || 0) + '<span class="stat-sheet-unit">g</span></p>' +
        '</div>' +
        '<div class="stat-sheet-card">' +
          '<p class="stat-sheet-label">지방</p>' +
          '<p class="stat-sheet-value">' + (data.fat || 0) + '<span class="stat-sheet-unit">g</span></p>' +
        '</div>' +
        '<div class="stat-sheet-card">' +
          '<p class="stat-sheet-label">칼로리</p>' +
          '<p class="stat-sheet-value">' + (data.kcal || data.calories || 0) + '</p>' +
        '</div>' +
      '</div>' +
      
      foodsListHtml;
      
  } else if (type === 'body') {
    headerLabel = '체중 기록';
    bodyHtml = 
      '<div class="text-center mb-5">' +
        '<p class="font-bebas text-5xl mb-1" style="color: #00d4ff;">' + data.weight + '<span class="text-lg text-stone-400">kg</span></p>' +
        '<p class="text-xs font-mono text-stone-400">' + data.date + '</p>' +
      '</div>';
  }
  
  return '' +
    '<div class="sheet-overlay" onclick="closeItemDetail()">' +
      '<div class="sheet" onclick="event.stopPropagation()">' +
        '<div class="sheet-handle"></div>' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">' + headerLabel + '</p>' +
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
    alert('자유 운동은 다음 단계에서 구현됩니다');
    return;
  }
  
  // 세션 데이터 초기화
  var exercises = sessionData.exercises.map(function(ex) {
    var sets = [];
    // 워밍업 1세트 + 본 세트 3개
    sets.push({ 
      weight: ex.lastWeight ? Math.round(ex.lastWeight * 0.5) : null, 
      reps: 10, 
      isWarmup: true, 
      completed: false 
    });
    for (var i = 0; i < ex.sets; i++) {
      sets.push({ 
        weight: ex.lastWeight, 
        reps: parseInt(String(ex.reps || '8-10').split('-')[0]) || 10, 
        isWarmup: false, 
        completed: false 
      });
    }
    return {
      name: ex.name,
      type: ex.type,
      targetReps: ex.reps,
      lastWeight: ex.lastWeight,
      lastReps: ex.reps_done,
      sets: sets
    };
  });
  
  state.activeSession = {
    sessionType: sessionType,
    sessionName: sessionData.name,
    startTime: Date.now(),
    currentExerciseIdx: 0,
    exercises: exercises
  };
  saveActiveSession();

  render();
};

// 세션 종료
window.endSession = function() {
  // 종료 확인 (운동 중인 세트 있으면)
  var hasCompleted = false;
  if (state.activeSession) {
    state.activeSession.exercises.forEach(function(ex) {
      ex.sets.forEach(function(s) { if (s.completed && !s.isWarmup) hasCompleted = true; });
    });
  }
  
  if (!hasCompleted) {
    // 완료한 본 세트가 없으면 그냥 취소
    if (!confirm('운동을 취소하시겠어요? 기록이 저장되지 않습니다.')) return;
    state.activeSession = null;
    state.restTimer = null;
    state.editingSet = null;
    saveActiveSession();
    saveRestTimer();
    if (restTickerInterval) { clearInterval(restTickerInterval); restTickerInterval = null; }
    render();
    return;
  }
  
  // 완료 화면 표시 (저장 + PR 감지는 화면 진입 시)
  finalizeSession();
};

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
    if (doneSets.length > 0) {
      completedSets += doneSets.length;
      
      // 종목별 요약
      var weights = doneSets.map(function(s) { return s.weight; });
      var reps = doneSets.map(function(s) { return s.reps; });
      var maxWeight = Math.max.apply(null, weights);
      
      exercisesDone.push({
        name: ex.name,
        type: ex.type,
        sets: doneSets.length,        // 숫자 (기존 호환)
        setsCount: doneSets.length,   // 명시적 (새 분석 함수용)
        setsDetail: doneSets,          // 풀 세트 배열 (상세 분석용)
        weights: weights,
        reps: reps,
        maxWeight: maxWeight,
        lastWeight: ex.lastWeight,
        lastReps: ex.lastReps,
        isMain: !!ex.isMain
      });
      
      // PR 감지
      if (ex.lastWeight !== null && maxWeight > ex.lastWeight) {
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
  
  // 완료 화면용 데이터 저장
  state.completedSession = {
    workoutId: newWorkout.id,
    sessionName: session.sessionName,
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
  render();
};

// 완료 화면 → 운동 메인으로
window.goToWorkout = function() {
  saveCompletionCondition();
  state.completedSession = null;
  state.currentTab = 'workout';
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
      // 무게는 0.5kg 단위로 반올림
      set.weight = Math.round(n * 2) / 2;
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
  set.weight = Math.max(0, (set.weight || 0) + delta);
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

// 세트 완료 → 휴식 타이머 시작
window.completeSet = function() {
  if (!state.editingSet) return;
  var s = state.editingSet;
  var exercise = state.activeSession.exercises[s.exerciseIdx];
  var set = exercise.sets[s.setIdx];
  set.completed = true;
  
  // 1RM 자동 갱신 (워밍업 세트 제외)
  if (!set.isWarmup && set.weight && set.reps) {
    var updated = update1RM(exercise.name, set.weight, set.reps);
    if (updated) {
      set.is1RMUpdate = true; // PR 표시용
    }
  }
  
  // 휴식 시간 결정 (복합 vs 고립)
  var isCompound = ['프레스', '풀업', '랫풀다운', '로우', '스쿼트', '데드리프트', '레그 프레스', '핵 스쿼트'].some(function(k) {
    return exercise.name.indexOf(k) !== -1;
  });
  var restDuration = set.isWarmup ? 60 : (isCompound ? 150 : 90); // 워밍업 1분, 복합 2.5분, 고립 1.5분
  
  state.restTimer = {
    startTime: Date.now(),
    duration: restDuration,
    exerciseIdx: s.exerciseIdx,
    setIdx: s.setIdx
  };
  state.editingSet = null;
  saveActiveSession();
  saveRestTimer();

  render();
  startRestTimerTick();
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
      render();
      return;
    }
    // 시트(편집/종목변경)가 열려 있으면 시트가 깜빡이지 않도록 타이머만 부분 갱신
    if (state.editingSet || state.exerciseSwapOpen) {
      var el = document.getElementById('rest-time-text');
      if (el) {
        var remaining = state.restTimer.duration - elapsed;
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        el.textContent = mins + ':' + String(secs).padStart(2, '0');
      }
      return;
    }
    render();
  }, 1000);
}

// 종목 변경 (이동)
window.goToExercise = function(idx) {
  if (state.activeSession) {
    state.activeSession.currentExerciseIdx = idx;
    saveActiveSession();
    render();
  }
};

// 운동 중 현재 종목을 다른 종목으로 교체
window.openExerciseSwap = function() {
  state.exerciseSwapOpen = true;
  render();
};

window.closeExerciseSwap = function() {
  state.exerciseSwapOpen = false;
  render();
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

  // 완료된 본 세트가 있으면 경고
  var doneCount = (ex.sets || []).filter(function(s) { return s.completed && !s.isWarmup; }).length;
  if (doneCount > 0) {
    if (!confirm('이미 완료한 ' + doneCount + '세트가 있어요. 종목을 바꾸면 그 기록이 새 종목으로 옮겨갑니다. 진행할까요?')) {
      return;
    }
  }

  // 종목명/타입 갱신 (정확 매칭 없으면 fuzzy)
  var info = EXERCISE_BODY_PART_MAP[newName] || getExercisePart(newName);
  ex.name = newName;
  if (info) {
    ex.type = info.compound ? '복합' : '고립';
  }

  // 미완료 세트의 무게/횟수를 새 종목 기준으로 재추천
  var prog = getProgressiveRecommendation(newName, ex.targetReps);
  if (prog && prog.weight) {
    var lowReps = parseRepRange(ex.targetReps).low || 8;
    (ex.sets || []).forEach(function(s) {
      if (s.completed) return;
      s.weight = prog.weight;
      if (!s.isWarmup) s.reps = lowReps;
    });
    ex.lastWeight = prog.previousWeight !== undefined ? prog.previousWeight : null;
  } else {
    ex.lastWeight = null;
  }

  state.exerciseSwapOpen = false;
  saveActiveSession();
  render();
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
  var progressPct = Math.round((doneSets / totalSets) * 100);
  
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
      status = '<div style="color: #00d4ff;">' + icon('check', 16) + '</div>';
    } else if (idx === activeSetIdx) {
      setClass += ' active';
      labelClass += ' active-label';
      valueClass += ' active';
      status = '<span class="set-status-pill">진행중</span>';
    } else {
      valueClass += ' pending';
    }
    
    var labelText = set.isWarmup ? 'W' : String(idx - (exercise.sets.findIndex(function(s) { return !s.isWarmup; }) >= 0 ? exercise.sets.findIndex(function(s) { return !s.isWarmup; }) : 0));
    // 더 단순한 라벨링: warmup은 W, 본 세트는 1, 2, 3...
    var setNum = 0;
    for (var j = 0; j <= idx; j++) {
      if (!exercise.sets[j].isWarmup) setNum++;
    }
    labelText = set.isWarmup ? 'W' : String(setNum);
    
    setRows += 
      '<div class="' + setClass + '" onclick="openSetEditor(' + session.currentExerciseIdx + ', ' + idx + ')">' +
        '<div class="' + labelClass + '">' + labelText + '</div>' +
        '<div class="set-info-grid">' +
          '<div>' +
            '<p class="set-info-label">무게</p>' +
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
  var prevText = exercise.lastWeight !== null 
    ? exercise.lastWeight + 'kg × ' + (parseInt(String(exercise.targetReps || '8').split('-')[0]) || 8) + ' · ' + (exercise.sets.filter(function(s) { return !s.isWarmup; }).length) + '세트'
    : (exercise.lastReps ? exercise.lastReps + '회 × ' + (exercise.sets.filter(function(s) { return !s.isWarmup; }).length) + '세트' : '첫 시도');
  
  // 휴식 타이머
  var restTimerHtml = '';
  if (state.restTimer) {
    var restElapsed = Math.floor((Date.now() - state.restTimer.startTime) / 1000);
    var restRemaining = Math.max(0, state.restTimer.duration - restElapsed);
    var restMins = Math.floor(restRemaining / 60);
    var restSecs = restRemaining % 60;
    var restStr = restMins + ':' + String(restSecs).padStart(2, '0');
    
    restTimerHtml = 
      '<div class="rest-timer-wrap">' +
        '<div class="rest-timer">' +
          '<div class="flex items-center gap-3">' +
            '<div class="rest-icon">' + icon('clock', 18) + '</div>' +
            '<div>' +
              '<p class="text-[10px] font-mono text-stone-500 uppercase">휴식 중</p>' +
              '<p id="rest-time-text" class="font-bebas text-2xl accent">' + restStr + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex gap-2">' +
            '<button class="rest-skip-btn" onclick="addRestTime()">+30s</button>' +
            '<button class="rest-done-btn" onclick="skipRest()">완료</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  
  // 세트 편집 시트
  // 종목 변경 시트
  var swapSheetHtml = '';
  if (state.exerciseSwapOpen) {
    // 현재 종목 정보 (정확 매칭 우선, 없으면 fuzzy)
    var curInfo = EXERCISE_BODY_PART_MAP[exercise.name] || getExercisePart(exercise.name);
    var primary = curInfo ? curInfo.primary : null;
    var compound = curInfo ? curInfo.compound : null;

    // 같은 primary 부위의 다른 종목 — 인덱스에서 O(1) 조회, compound 일치 우선 정렬
    var candidates = (primary ? (EXERCISES_BY_PRIMARY[primary] || []) : [])
      .filter(function(name) { return name !== exercise.name; })
      .sort(function(a, b) {
        var ai = EXERCISE_BODY_PART_MAP[a].compound === compound ? 0 : 1;
        var bi = EXERCISE_BODY_PART_MAP[b].compound === compound ? 0 : 1;
        return ai - bi;
      });

    var listHtml = '';
    if (candidates.length === 0) {
      listHtml = '<p class="text-xs text-stone-500 text-center py-4">교체 가능한 종목이 없어요.</p>';
    } else {
      listHtml = candidates.map(function(name) {
        var info = EXERCISE_BODY_PART_MAP[name];
        var tag = info && info.compound ? '복합' : '고립';
        var prog = getProgressiveRecommendation(name, exercise.targetReps);
        var hint = prog && prog.previousWeight !== undefined
          ? '지난 ' + prog.previousWeight + 'kg → ' + prog.weight + 'kg'
          : (prog ? prog.weight + 'kg (1RM 추정)' : '무게 미정');
        return '<button class="option-card" style="width: 100%; margin-bottom: 6px; text-align: left;" onclick="swapCurrentExercise(\'' + name.replace(/'/g, "\\'") + '\')">' +
          '<div class="flex items-center justify-between gap-2">' +
            '<div>' +
              '<p class="font-display text-sm">' + name + '</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + tag + ' · ' + hint + '</p>' +
            '</div>' +
            '<span class="text-xs accent">교체 →</span>' +
          '</div>' +
        '</button>';
      }).join('');
    }

    swapSheetHtml =
      '<div class="sheet-overlay" onclick="closeExerciseSwap()">' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          '<div class="flex items-center justify-between mb-3">' +
            '<div>' +
              '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">종목 변경</p>' +
              '<p class="font-bebas text-2xl mt-1">' + exercise.name + '</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeExerciseSwap()">' + icon('close', 18) + '</button>' +
          '</div>' +
          '<p class="text-xs font-mono text-stone-400 mb-3">같은 부위의 다른 종목으로 교체합니다.</p>' +
          '<div style="max-height: 55vh; overflow-y: auto; padding-right: 4px;">' +
            listHtml +
          '</div>' +
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
              '<p id="sheet-set-label" class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">' + setLabel + ' 편집</p>' +
              '<p class="font-bebas text-2xl mt-1">' + ex.name + '</p>' +
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
              '<p>무게</p>' +
              '<p>kg</p>' +
            '</div>' +
            '<div class="number-display" onclick="enterEditMode(\'weight\')">' +
              '<p id="sheet-weight-value">' + (set.weight !== null ? set.weight : 0) + '</p>' +
              '<input id="sheet-weight-input" class="number-input" type="number" inputmode="decimal" step="0.5" min="0" style="display:none;" onclick="event.stopPropagation()" onblur="commitEdit(\'weight\')" onkeydown="if(event.key===\'Enter\')this.blur()" />' +
            '</div>' +
            '<div class="adj-grid">' +
              '<button class="adj-btn" onclick="adjustWeight(-5)">−5</button>' +
              '<button class="adj-btn" onclick="adjustWeight(-2.5)">−2.5</button>' +
              '<button class="adj-btn" onclick="adjustWeight(2.5)">+2.5</button>' +
              '<button class="adj-btn accent-btn" onclick="adjustWeight(5)">+5</button>' +
            '</div>' +
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
    if (dotDone) {
      dotStyle = 'background: #00d4ff; box-shadow: 0 0 6px #00d4ff;';
    } else if (dotActive) {
      dotStyle = 'background: #00d4ff; box-shadow: 0 0 8px #00d4ff, inset 0 0 0 2px white;';
    } else {
      dotStyle = 'background: #1a2540;';
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
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">' + session.sessionName + ' · 종목 ' + (session.currentExerciseIdx + 1) + '/' + totalExercises + '</p>' +
          '<p class="text-xs font-mono accent mt-0\\.5">⏱ ' + elapsedStr + '</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="openExerciseSwap()" title="종목 변경">' + icon('dots', 18) + '</button>' +
      '</div>' +
      
      // 전체 진행률
      '<div class="session-progress mb-3"><div class="session-progress-fill" style="width: ' + progressPct + '%"></div></div>' +
      
      // 종목 도트
      '<div class="flex items-center gap-1">' + exerciseDots + '</div>' +
    '</div>' +
    
    '<div class="px-5" style="padding-bottom: ' + (state.restTimer ? '180px' : '120px') + ';">' +
      
      // 현재 종목 정보
      '<div class="exercise-info-card">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">현재 종목</p>' +
        '<h2 class="font-bebas text-2xl mb-1">' + exercise.name + '</h2>' +
        '<p class="text-xs font-mono text-stone-400">' + exercise.type + '</p>' +
        '<div class="exercise-gif-wrap">' +
          (function() {
            var gifUrl = findExerciseGif(exercise.name);
            return gifUrl
              ? '<img src="' + gifUrl + '" alt="' + exercise.name + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\'" />' +
                '<div class="exercise-gif-placeholder" style="display: none;">이미지 로드 실패</div>'
              : '<div class="exercise-gif-placeholder" style="display: flex;">동작 가이드 준비 중</div>';
          })() +
        '</div>' +
      '</div>' +
      
      // 이전 기록
      // 지난 기록 + 다음 추천 카드 (점진적 과부하)
      (function() {
        var prog = getProgressiveRecommendation(exercise.name, exercise.targetReps);
        var rm = get1RM(exercise.name);
        // 새 카드가 같은 정보를 더 정확히 보여주므로, prog가 실 수행 기록이면 옛 prev-record는 생략
        var fallbackPrevHtml = (!prog || prog.source === 'rm_estimate')
          ? '<div class="prev-record">' +
              '<div class="flex items-center gap-2" style="color: #6b7a99;">' +
                icon('clock', 14) +
                '<p class="text-[10px] font-mono uppercase">지난 기록</p>' +
              '</div>' +
              '<p class="text-xs font-mono text-stone-300">' + prevText + '</p>' +
            '</div>'
          : '';
        if (!prog && !rm) return '';

        var html = '<div class="rm-card">';

        if (prog && prog.source !== 'rm_estimate' && prog.previousWeight !== undefined) {
          // 실제 수행 기록이 있는 경우
          var prevRepsStr = (prog.previousReps || []).join(', ') + '회';
          var color = prog.source === 'progress' ? '#10b981' : '#00d4ff';
          var label = prog.source === 'progress' ? '🎯 도전 권장' : '🔁 동일 무게';
          html +=
            '<div class="flex items-center justify-between mb-2">' +
              '<p class="text-[10px] font-mono uppercase tracking-widest text-stone-400">지난 기록</p>' +
              '<p class="font-mono text-xs text-stone-300">' + prog.previousWeight + 'kg × ' + prevRepsStr + '</p>' +
            '</div>' +
            '<div class="flex items-center justify-between pt-3 border-t" style="border-color: rgba(0, 212, 255, 0.15);">' +
              '<div>' +
                '<p class="text-[10px] font-mono uppercase tracking-widest" style="color: ' + color + ';">' + label + '</p>' +
                '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + prog.note + '</p>' +
              '</div>' +
              '<p class="font-bebas text-3xl" style="color: ' + color + ';">' + prog.weight + '<span class="text-xs text-stone-400">kg</span></p>' +
            '</div>';
        } else if (prog && prog.source === 'rm_estimate') {
          // 첫 시도 - 1RM 기반
          html +=
            '<div class="flex items-center justify-between">' +
              '<div>' +
                '<p class="text-[10px] font-mono uppercase tracking-widest accent">첫 시도 추천</p>' +
                '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + prog.note + '</p>' +
              '</div>' +
              '<p class="font-bebas text-3xl accent">' + prog.weight + '<span class="text-xs text-stone-400">kg</span></p>' +
            '</div>';
        }

        if (rm) {
          html +=
            '<p class="text-[10px] font-mono text-stone-500 mt-3 text-right">추정 1RM ' + rm + 'kg</p>';
        }

        html += '</div>';
        return fallbackPrevHtml + html;
      })() +

      // 세트 목록
      '<div class="mb-3">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3 px-1">세트</p>' +
        '<div style="display: flex; flex-direction: column; gap: 8px;">' + setRows + '</div>' +
      '</div>' +
      
      // 이전/다음 종목
      '<div class="grid grid-cols-2 gap-2 mt-4">' +
        (session.currentExerciseIdx > 0 
          ? '<button class="option-card" onclick="goToExercise(' + (session.currentExerciseIdx - 1) + ')"><p class="text-xs font-mono text-stone-400">← 이전 종목</p></button>'
          : '<div></div>') +
        (session.currentExerciseIdx < totalExercises - 1
          ? '<button class="option-card" onclick="goToExercise(' + (session.currentExerciseIdx + 1) + ')"><p class="text-xs font-mono accent">다음 종목 →</p></button>'
          : '<button class="option-card" onclick="endSession()"><p class="text-xs font-mono accent">운동 종료 ✓</p></button>') +
      '</div>' +
      
    '</div>' +
    
    restTimerHtml +
    sheetHtml +
    swapSheetHtml;
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
      var prValue, prChange;
      if (pr.weight !== undefined && pr.previousWeight !== undefined) {
        prValue = pr.weight + 'kg × ' + pr.reps + '회';
        prChange = pr.previousWeight + 'kg → ' + pr.weight + 'kg (+' + (pr.weight - pr.previousWeight).toFixed(1) + 'kg)';
      } else {
        prValue = pr.reps + '회';
        prChange = pr.previousReps + '회 → ' + pr.reps + '회 (+' + (pr.reps - pr.previousReps) + ')';
      }
      
      prAlertsHtml += 
        '<div class="card-accent mb-4">' +
          '<div class="relative flex items-center gap-3">' +
            '<div class="pr-alert-icon">' + icon('trophy', 20) + '</div>' +
            '<div class="flex-1">' +
              '<p class="text-[10px] font-mono accent uppercase tracking-widest mb-0\\.5">PR 갱신!</p>' +
              '<p class="text-sm font-display font-bold">' + pr.exerciseName + '</p>' +
              '<p class="text-[11px] font-mono text-stone-400 mt-0\\.5">' + prChange + '</p>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
  }
  
  // 종목별 요약
  var exerciseSummary = '';
  var displayCount = Math.min(cs.exercises.length, 4);
  for (var i = 0; i < displayCount; i++) {
    var ex = cs.exercises[i];
    var hasPR = cs.newPRs.some(function(pr) { return pr.exerciseName === ex.name; });
    var repsStr = ex.reps.join(', ');
    var weightStr = ex.maxWeight !== null ? (ex.maxWeight + 'kg') : '';
    var detail = weightStr ? (weightStr + ' × ' + repsStr) : (repsStr + '회');
    
    exerciseSummary += 
      '<div class="exercise-summary-row">' +
        '<div class="flex items-center gap-3">' +
          '<div class="ex-num" style="width: 30px; height: 30px; font-size: 10px;">' + String(i+1).padStart(2,'0') + '</div>' +
          '<div>' +
            '<p class="text-sm font-display font-bold">' + ex.name + '</p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + detail + '</p>' +
          '</div>' +
        '</div>' +
        (hasPR ? '<span class="pr-tag">PR</span>' : '') +
      '</div>';
  }
  if (cs.exercises.length > 4) {
    exerciseSummary += '<div class="text-center pt-2"><button class="text-xs font-mono accent uppercase tracking-widest">+ ' + (cs.exercises.length - 4) + '개 더 보기</button></div>';
  }
  
  // 코치 메시지
  var coachMsg;
  if (cs.newPRs.length > 0) {
    var prNames = cs.newPRs.map(function(p) { return p.exerciseName; }).slice(0, 2).join(', ');
    coachMsg = prNames + ' PR 갱신 잘 했어요! 단백질 30~40g 보충 잊지 마세요. 다음 세션엔 다른 종목도 +2.5kg 도전해봐도 좋겠어요.';
  } else if (cs.duration < 30) {
    coachMsg = '오늘은 짧은 세션이었네요. 충분한 휴식 취하시고, 단백질 보충 잊지 마세요.';
  } else {
    coachMsg = '오늘 운동 잘 했어요. 단백질 30~40g 보충하고 충분한 수면 취하세요. 다음 세션도 화이팅!';
  }
  
  return '' +
    // 축하 헤더
    '<div class="px-5 pt-12 pb-5 text-center">' +
      '<div class="complete-icon">' + icon('check', 28) + '</div>' +
      '<p class="text-xs uppercase accent font-mono mb-2" style="letter-spacing: 0.3em;">WORKOUT COMPLETE</p>' +
      '<h1 class="font-bebas text-5xl">완료!</h1>' +
      '<p class="text-sm text-stone-400 mt-2">' + cs.sessionName + ' · ' + dateStr + '</p>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      
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
            '<p class="condition-hint">1: 너무 쉬움 / 5: 적정 / 10: 한계</p>' +
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
            '<p class="condition-hint">1: 매우 나쁨 / 5: 매우 좋음</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 코치 메시지
      '<div class="card-coach mb-4">' +
        '<div class="flex items-start gap-3">' +
          '<div class="coach-icon accent">' + icon('msg', 18) + '</div>' +
          '<div class="flex-1">' +
            '<p class="text-xs font-mono accent uppercase tracking-widest mb-1\\.5">COACH</p>' +
            '<p class="text-sm text-stone-200 leading-relaxed">' + coachMsg + '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 액션 버튼
      '<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 8px;">' +
        '<button class="complete-action-btn complete-primary" onclick="goHome()">홈으로</button>' +
        '<button class="complete-action-btn complete-secondary" onclick="goToWorkout()">기록 자세히 보기</button>' +
      '</div>' +
      
    '</div>';
}

// ═══════════════════════════════════════════════
// 영양 메인 화면
// ═══════════════════════════════════════════════
function renderFuel() {
  var profile = state.profile;
  var tdStr = getTodayStr();
  var today = new Date();
  var dayNames = ['일','월','화','수','목','금','토'];
  var monthDay = (today.getMonth() + 1) + '월 ' + today.getDate() + '일';
  
  // 오늘 끼니
  var todayMeals = state.data.nutritionLog.filter(function(m) { return m.date === tdStr; });
  
  // 총합 계산
  var totalProtein = todayMeals.reduce(function(s, m) { return s + (m.protein || 0); }, 0);
  var totalCarbs = todayMeals.reduce(function(s, m) { return s + (m.carbs || 0); }, 0);
  var totalFat = todayMeals.reduce(function(s, m) { return s + (m.fat || 0); }, 0);
  var totalKcal = todayMeals.reduce(function(s, m) { return s + (m.kcal || 0); }, 0);
  
  var proteinPercent = Math.min(100, Math.round((totalProtein / profile.proteinTarget) * 100));
  var carbPercent = Math.min(100, Math.round((totalCarbs / profile.carbTarget) * 100));
  var fatPercent = Math.min(100, Math.round((totalFat / profile.fatTarget) * 100));
  var kcalRemaining = Math.max(0, profile.calorieTarget - totalKcal);
  var proteinRemaining = Math.max(0, profile.proteinTarget - totalProtein);
  
  // 임계점 통과 끼니 수
  var thresholdPassed = todayMeals.filter(function(m) { return m.thresholdPassed; }).length;
  
  // 도넛 차트 (conic-gradient 각도)
  var donutDeg = Math.round((proteinPercent / 100) * 360);
  
  // 임계점 도트
  var thresholdDots = '';
  for (var i = 0; i < 4; i++) {
    var dotCls = i < thresholdPassed ? 'dot dot-passed' : 'dot dot-pending';
    thresholdDots += '<div class="' + dotCls + '"></div>';
  }
  
  // 끼니별 카드
  var mealKeys = ['breakfast', 'lunch', 'dinner', 'snack'];
  var mealNames = ['아침', '점심', '저녁', '간식 / 야식'];
  var mealCardsHtml = '';
  
  mealKeys.forEach(function(key, idx) {
    var m = todayMeals.find(function(x) { return x.meal === key; });
    var name = mealNames[idx];
    
    if (m) {
      var passed = m.thresholdPassed;
      var cardClass = passed ? 'meal-card passed' : 'meal-card';
      var dotCls = passed ? 'dot dot-passed' : 'dot dot-pending';
      var pillHtml = passed 
        ? '<span class="meal-status-pill passed">통과</span>'
        : '<span class="meal-status-pill warning">부족</span>';
      var proteinColor = passed ? '#00d4ff' : '#d6d3d1';
      
      // 음식 표시 (끼니 안의 foods 배열)
      var foodsHtml = '';
      if (m.foods && m.foods.length > 0) {
        foodsHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #1a2540;">' +
          m.foods.map(function(f) {
            return '<div class="food-item-row" style="cursor: default;">' +
              '<div class="flex-1">' +
                '<p class="text-xs font-display">' + (f.name || '음식') + '</p>' +
                (f.amount ? '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + f.amount + '</p>' : '') +
              '</div>' +
              '<div class="text-right">' +
                '<p class="text-xs font-mono accent">' + (f.protein || 0) + 'g</p>' +
                '<p class="text-[9px] font-mono text-stone-500">' + (f.kcal || f.calories || 0) + 'kcal</p>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      }
      
      // 부족 시 보조 안내
      var subInfo = '';
      if (!passed && m.protein < 30) {
        var needed = 30 - m.protein;
        subInfo = '<p class="text-[10px] font-mono mt-1\\.5" style="color: #fbbf24;">+ ' + needed + 'g 더 추가하면 임계점 통과</p>';
      }
      
      mealCardsHtml += 
        '<div class="' + cardClass + '" onclick="openItemDetail(\'meal\', \'' + m.id + '\')" style="cursor: pointer;">' +
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center gap-2">' +
              '<div class="' + dotCls + '"></div>' +
              '<p class="font-display font-bold text-sm">' + name + '</p>' +
              pillHtml +
            '</div>' +
            '<p class="font-bebas text-xl" style="color: ' + proteinColor + ';">' + m.protein + '<span class="text-xs text-stone-400">g</span></p>' +
          '</div>' +
          foodsHtml +
          subInfo +
        '</div>';
    } else {
      mealCardsHtml += 
        '<div class="meal-card empty">' +
          '<div class="flex items-center justify-between">' +
            '<div class="flex items-center gap-2">' +
              '<div class="dot dot-pending"></div>' +
              '<p class="font-display font-bold text-sm text-stone-500">' + name + '</p>' +
            '</div>' +
            '<button class="text-[10px] font-mono accent uppercase tracking-widest">+ 추가</button>' +
          '</div>' +
        '</div>';
    }
  });
  
  // 코치 메시지
  var coachMsg;
  if (proteinRemaining > 0) {
    var dinnerMeal = todayMeals.find(function(m) { return m.meal === 'dinner'; });
    if (dinnerMeal && !dinnerMeal.thresholdPassed) {
      var needed = 30 - dinnerMeal.protein;
      coachMsg = '저녁 단백질이 ' + needed + 'g 부족해요. 그릭요거트 100g (10g) 또는 단백질 셰이크 반 스쿱이면 임계점 통과합니다.';
    } else {
      coachMsg = '오늘 단백질 ' + proteinRemaining + 'g 더 필요해요. 끼니마다 30g 이상 분배하면 근단백질합성(MPS) 최대 자극.';
    }
  } else {
    coachMsg = '오늘 단백질 목표 달성! 매크로 균형도 잘 맞췄어요. 회복에 집중하세요.';
  }
  
  return '' +
    // 헤더
    '<div class="px-5 pt-12 pb-5">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<p class="text-xs uppercase font-mono text-stone-500" style="letter-spacing: 0.3em;">FUEL</p>' +
        '<p class="text-xs font-mono text-stone-500">' + monthDay + ' ' + dayNames[today.getDay()] + '</p>' +
      '</div>' +
      '<h1 class="font-bebas text-4xl">영양</h1>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      
      // 단백질 메인 카드 (도넛)
      '<div class="card-accent mb-4">' +
        '<div class="relative flex items-center gap-5">' +
          '<div class="donut-chart" style="background: conic-gradient(#00d4ff 0deg ' + donutDeg + 'deg, #1a2540 ' + donutDeg + 'deg 360deg);">' +
            '<div class="donut-content">' +
              '<p class="donut-main">' + totalProtein + '</p>' +
              '<p class="donut-sub">/ ' + profile.proteinTarget + 'g</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex-1">' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2">단백질</p>' +
            '<p class="font-bebas text-2xl mb-1">' + proteinPercent + '<span class="text-base text-stone-500">%</span></p>' +
            '<p class="text-xs text-stone-400 mb-3">목표까지 <span class="accent font-bold">' + proteinRemaining + 'g</span></p>' +
            '<div>' +
              '<div class="flex items-center justify-between mb-1\\.5">' +
                '<p class="text-[10px] font-mono text-stone-500 uppercase">임계점</p>' +
                '<p class="text-[10px] font-mono accent">' + thresholdPassed + ' / 4</p>' +
              '</div>' +
              '<div class="flex gap-1\\.5">' + thresholdDots + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 칼로리 + 매크로
      '<div class="card mb-4">' +
        '<div class="flex items-baseline justify-between mb-4">' +
          '<div>' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">칼로리</p>' +
            '<p class="font-bebas text-3xl">' + totalKcal.toLocaleString() + '<span class="text-sm text-stone-500">/' + profile.calorieTarget.toLocaleString() + '</span></p>' +
          '</div>' +
          '<p class="text-xs font-mono accent">남은 ' + kcalRemaining + ' kcal</p>' +
        '</div>' +
        '<div class="border-t pt-4" style="display: flex; flex-direction: column; gap: 12px;">' +
          '<div>' +
            '<div class="flex items-center justify-between mb-1\\.5">' +
              '<p class="text-[10px] font-mono text-stone-400 uppercase">탄수화물</p>' +
              '<p class="text-[10px] font-mono text-stone-300">' + totalCarbs + ' / ' + profile.carbTarget + 'g</p>' +
            '</div>' +
            '<div class="macro-bg"><div class="macro-fill" style="width: ' + carbPercent + '%; background: #fbbf24;"></div></div>' +
          '</div>' +
          '<div>' +
            '<div class="flex items-center justify-between mb-1\\.5">' +
              '<p class="text-[10px] font-mono text-stone-400 uppercase">단백질</p>' +
              '<p class="text-[10px] font-mono text-stone-300">' + totalProtein + ' / ' + profile.proteinTarget + 'g</p>' +
            '</div>' +
            '<div class="macro-bg"><div class="macro-fill" style="width: ' + proteinPercent + '%; background: #00d4ff;"></div></div>' +
          '</div>' +
          '<div>' +
            '<div class="flex items-center justify-between mb-1\\.5">' +
              '<p class="text-[10px] font-mono text-stone-400 uppercase">지방</p>' +
              '<p class="text-[10px] font-mono text-stone-300">' + totalFat + ' / ' + profile.fatTarget + 'g</p>' +
            '</div>' +
            '<div class="macro-bg"><div class="macro-fill" style="width: ' + fatPercent + '%; background: #a78bfa;"></div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 끼니별
      '<div class="mb-4">' +
        '<div class="flex items-center justify-between mb-3 px-1">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">끼니별 기록</p>' +
          '<p class="text-xs font-mono text-stone-500">' + todayMeals.length + ' / 4</p>' +
        '</div>' +
        '<div style="display: flex; flex-direction: column; gap: 10px;">' + mealCardsHtml + '</div>' +
      '</div>' +
      
      // 코치 메시지
      '<div class="card-coach">' +
        '<div class="flex items-start gap-3">' +
          '<div class="coach-icon accent">' + icon('msg', 18) + '</div>' +
          '<div class="flex-1">' +
            '<p class="text-xs font-mono accent uppercase tracking-widest mb-1\\.5">COACH</p>' +
            '<p class="text-sm text-stone-200 leading-relaxed">' + coachMsg + '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
    '</div>' +
    
    // FAB
    '<button class="fab" onclick="openFoodInput()">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' +
      '</svg>' +
    '</button>';
}

// ═══════════════════════════════════════════════
// 음식 입력 화면 - 핸들러
// ═══════════════════════════════════════════════

// 음식 입력 화면 열기
window.openFoodInput = function() {
  state.foodInputOpen = true;
  var hasAI = !!state.apiKey;
  state.foodChatHistory = [
    { 
      type: 'bot', 
      text: '뭐 드셨어요? 자연스럽게 적어주세요.', 
      hint: hasAI 
        ? '예: 닭가슴살 150g + 현미밥 한 공기 · AI 분석 활성화됨'
        : '예: 닭가슴살 150g + 현미밥 한 공기 · DB 50+ 음식'
    }
  ];
  state.foodInputText = '';
  state.pendingResult = null;
  render();
  setTimeout(function() {
    var input = document.getElementById('food-chat-input');
    if (input) input.focus();
  }, 100);
};

// 음식 입력 화면 닫기
window.closeFoodInput = function() {
  state.foodInputOpen = false;
  state.foodChatHistory = [];
  state.foodInputText = '';
  state.pendingResult = null;
  state.manualInputMode = false;
  state.manualInputData = null;
  render();
};

// 입력 텍스트 업데이트
window.updateFoodInput = function(text) {
  state.foodInputText = text;
  // re-render 없이 버튼만 활성화/비활성화
  var sendBtn = document.getElementById('food-send-btn');
  if (sendBtn) sendBtn.disabled = !text.trim();
};

// 프리셋 클릭
window.applyPreset = function(text) {
  state.foodInputText = text;
  var input = document.getElementById('food-chat-input');
  if (input) input.value = text;
  sendFoodMessage();
};

// 메시지 전송
window.sendFoodMessage = async function() {
  var text = state.foodInputText.trim();
  if (!text) {
    var input = document.getElementById('food-chat-input');
    if (input) text = input.value.trim();
    if (!text) return;
  }
  
  // 사용자 메시지 추가
  state.foodChatHistory.push({ type: 'user', text: text });
  state.foodInputText = '';

  // API 키 있으면 DB 부분 매칭 비활성 → 정확/별칭 매칭만 신뢰, 나머지는 AI로
  // (API 키 없으면 기존대로 부분 매칭까지 사용)
  var strict = !!state.apiKey;
  var analysis = analyzeFoodInput(text, strict);
  
  // DB로 모두 매칭 성공
  if (analysis.matched.length > 0 && analysis.unmatched.length === 0) {
    showAnalysisResult(analysis.matched, []);
    return;
  }
  
  // 부분 매칭 또는 매칭 실패 → API 키 있으면 AI 시도
  if (state.apiKey) {
    // 로딩 메시지
    state.foodChatHistory.push({ type: 'bot', text: '분석 중...', loading: true });
    render();
    scrollChatToBottom();
    
    // AI 호출 (매칭 안 된 부분만 또는 전체)
    var aiText;
    if (analysis.matched.length > 0) {
      // 부분 매칭 → 매칭 안 된 부분만 AI
      aiText = analysis.unmatched.join(', ');
    } else {
      // 전체 매칭 실패 → 전체 AI
      aiText = text;
    }
    
    var aiResult = await analyzeFoodWithAI(aiText);
    
    // 로딩 메시지 제거
    state.foodChatHistory = state.foodChatHistory.filter(function(m) { return !m.loading; });
    
    if (aiResult && aiResult.foods && aiResult.foods.length > 0) {
      // AI 분석 성공
      var allFoods = analysis.matched.concat(aiResult.foods);
      showAnalysisResult(allFoods, []);
    } else if (aiResult && aiResult.error) {
      // AI 호출 실패
      var errMsg = 'AI 분석 실패: ' + aiResult.error;
      if (analysis.matched.length > 0) {
        // 부분 결과라도 표시
        showAnalysisResult(analysis.matched, analysis.unmatched);
        state.foodChatHistory.push({
          type: 'bot',
          text: errMsg + ' 매칭된 음식만 표시했어요.'
        });
      } else {
        state.foodChatHistory.push({
          type: 'bot',
          text: errMsg,
          hint: '직접 입력하시거나, 더 구체적으로 적어주세요.',
          manualButton: { name: text }
        });
      }
      render();
      scrollChatToBottom();
    } else {
      // 알 수 없는 오류
      showFailureMessage(text, analysis);
    }
  } else {
    // API 키 없음
    if (analysis.matched.length > 0) {
      showAnalysisResult(analysis.matched, analysis.unmatched);
    } else {
      showFailureMessage(text, analysis);
    }
  }
};

// 분석 결과 표시
function showAnalysisResult(matched, unmatched) {
  var totalP = matched.reduce(function(s, f) { return s + f.protein; }, 0);
  var totalKcal = matched.reduce(function(s, f) { return s + f.kcal; }, 0);
  var totalC = matched.reduce(function(s, f) { return s + f.carbs; }, 0);
  var totalF = matched.reduce(function(s, f) { return s + f.fat; }, 0);
  
  state.pendingResult = {
    foods: matched,
    totalProtein: Math.round(totalP * 10) / 10,
    totalKcal: totalKcal,
    totalCarbs: Math.round(totalC * 10) / 10,
    totalFat: Math.round(totalF * 10) / 10,
    unmatched: unmatched || []
  };
  
  state.foodChatHistory.push({ type: 'result', data: state.pendingResult });
  render();
  scrollChatToBottom();
}

// 매칭 실패 메시지
function showFailureMessage(text, analysis) {
  state.foodChatHistory.push({
    type: 'bot',
    text: '"' + text + '"을(를) DB에서 찾을 수 없어요.',
    hint: 'AI 분석을 사용하려면 더보기 > API 키 설정. 또는 직접 입력하세요.',
    manualButton: { name: text }
  });
  render();
  scrollChatToBottom();
}

// 끼니 선택 → 저장
window.addToMeal = function(mealKey, mealKr) {
  if (!state.pendingResult) return;
  
  var pr = state.pendingResult;
  var tdStr = getTodayStr();
  
  // 기존 끼니 확인 (오늘 같은 끼니가 있으면 합치기)
  var existingIdx = state.data.nutritionLog.findIndex(function(m) {
    return m.date === tdStr && m.meal === mealKey;
  });
  
  if (existingIdx !== -1) {
    // 기존 끼니에 합치기
    var existing = state.data.nutritionLog[existingIdx];
    existing.protein += pr.totalProtein;
    existing.carbs += pr.totalCarbs;
    existing.fat += pr.totalFat;
    existing.kcal += pr.totalKcal;
    
    if (!existing.foods) existing.foods = [];
    pr.foods.forEach(function(f) {
      existing.foods.push({
        name: f.name,
        amount: f.amount,
        protein: f.protein,
        kcal: f.kcal
      });
    });
    
    // 임계점 재계산
    existing.thresholdPassed = existing.protein >= 30;
    
    // 반올림
    existing.protein = Math.round(existing.protein * 10) / 10;
    existing.carbs = Math.round(existing.carbs * 10) / 10;
    existing.fat = Math.round(existing.fat * 10) / 10;
  } else {
    // 새 끼니 추가
    var now = new Date();
    state.data.nutritionLog.push({
      id: 'm_' + Date.now(),
      date: tdStr,
      meal: mealKey,
      mealKr: mealKr,
      time: String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'),
      protein: pr.totalProtein,
      carbs: pr.totalCarbs,
      fat: pr.totalFat,
      kcal: pr.totalKcal,
      foods: pr.foods.map(function(f) {
        return {
          name: f.name,
          amount: f.amount,
          protein: f.protein,
          kcal: f.kcal
        };
      }),
      thresholdPassed: pr.totalProtein >= 30
    });
  }
  
  // 저장
  storage.set(KEYS.NUTRITION_LOG, state.data.nutritionLog);
  
  // 봇 응답 (성공 메시지)
  state.foodChatHistory.push({
    type: 'bot',
    text: '✓ ' + mealKr + '에 추가됐어요! 단백질 ' + pr.totalProtein + 'g 기록.',
    success: true
  });
  
  state.pendingResult = null;
  
  // 1초 후 닫기
  setTimeout(function() {
    closeFoodInput();
    state.currentTab = 'fuel';
    render();
  }, 1500);
  
  render();
};

// 손코딩 입력 모달 열기
window.openManualInput = function(name) {
  state.manualInputMode = true;
  state.manualInputData = { name: name || '', protein: 0, kcal: 0 };
  render();
};

// 손코딩 입력 모달 닫기
window.closeManualInput = function() {
  state.manualInputMode = false;
  state.manualInputData = null;
  render();
};

// 손코딩 입력 필드 업데이트
window.updateManualField = function(field, value) {
  if (!state.manualInputData) return;
  if (field === 'name') {
    state.manualInputData.name = value;
  } else {
    state.manualInputData[field] = parseFloat(value) || 0;
  }
};

// 손코딩 입력 → 분석 결과로 만들기
window.submitManualInput = function() {
  var d = state.manualInputData;
  if (!d || !d.name || d.protein < 0) return;
  
  state.pendingResult = {
    foods: [{
      name: d.name,
      amount: '수동 입력',
      protein: d.protein,
      kcal: d.kcal,
      carbs: 0,
      fat: 0
    }],
    totalProtein: d.protein,
    totalKcal: d.kcal,
    totalCarbs: 0,
    totalFat: 0,
    unmatched: []
  };
  
  state.foodChatHistory.push({ type: 'result', data: state.pendingResult });
  state.manualInputMode = false;
  state.manualInputData = null;
  render();
};

// ═══════════════════════════════════════════════
// 음식 입력 화면 - 렌더
// ═══════════════════════════════════════════════
function renderFoodInput() {
  // 채팅 메시지 렌더
  var messagesHtml = '';
  state.foodChatHistory.forEach(function(msg) {
    if (msg.type === 'bot') {
      // 로딩 메시지
      if (msg.loading) {
        messagesHtml += 
          '<div class="chat-bot">' +
            '<div class="flex items-center gap-2">' +
              '<div class="loading-spinner"></div>' +
              '<p class="text-sm">' + msg.text + '</p>' +
            '</div>' +
          '</div>';
        return;
      }
      
      var hintHtml = msg.hint ? '<p class="text-[10px] font-mono text-stone-400 mt-1\\.5">' + msg.hint + '</p>' : '';
      var manualBtn = msg.manualButton 
        ? '<button class="mt-2 px-3 py-1\\.5 rounded-lg text-[11px] font-mono accent" style="background: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.4);" onclick="openManualInput(\'' + msg.manualButton.name.replace(/'/g, "\\'") + '\')">직접 입력하기</button>'
        : '';
      var successStyle = msg.success ? ' style="background: rgba(0, 212, 255, 0.15); border-color: rgba(0, 212, 255, 0.5);"' : '';
      
      messagesHtml += 
        '<div class="chat-bot"' + successStyle + '>' +
          '<p class="text-sm leading-relaxed">' + msg.text + '</p>' +
          hintHtml +
          manualBtn +
        '</div>';
    } else if (msg.type === 'user') {
      messagesHtml += 
        '<div class="chat-user">' +
          '<p class="text-sm">' + msg.text + '</p>' +
        '</div>';
    } else if (msg.type === 'result') {
      var d = msg.data;
      var foodsHtml = '';
      d.foods.forEach(function(f) {
        var color = f.protein >= 10 ? '#00d4ff' : '#d6d3d1';
        var defaultedNote = f.defaulted ? ' <span class="text-[9px] text-amber-400">(기본양)</span>' : '';
        var aiNote = f.aiAnalyzed ? ' <span class="text-[9px]" style="color: #a78bfa;">AI</span>' : '';
        foodsHtml += 
          '<div class="food-analysis-card">' +
            '<div>' +
              '<p class="text-sm font-display font-bold">' + f.name + ' ' + f.amount + defaultedNote + aiNote + '</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + f.kcal + 'kcal · 탄' + f.carbs + 'g · 지' + f.fat + 'g</p>' +
            '</div>' +
            '<p class="font-bebas text-lg" style="color: ' + color + ';">' + f.protein + '<span class="text-[10px] text-stone-400">g</span></p>' +
          '</div>';
      });
      
      var unmatchedHtml = '';
      if (d.unmatched && d.unmatched.length > 0) {
        unmatchedHtml = 
          '<div class="food-analysis-card not-found">' +
            '<div>' +
              '<p class="text-xs font-mono text-amber-400">매칭 실패: ' + d.unmatched.join(', ') + '</p>' +
            '</div>' +
            '<button class="text-[10px] font-mono accent" onclick="openManualInput(\'' + d.unmatched[0].replace(/'/g, "\\'") + '\')">+ 추가</button>' +
          '</div>';
      }
      
      messagesHtml += 
        '<div class="chat-bot">' +
          '<p class="text-sm leading-relaxed mb-3">분석했어요</p>' +
          '<div style="margin: 4px 0;">' + foodsHtml + unmatchedHtml + '</div>' +
          '<div class="flex items-center justify-between mt-3 pt-3 border-t" style="border-color: rgba(0, 212, 255, 0.2);">' +
            '<p class="text-xs font-mono text-stone-400">총합</p>' +
            '<div class="flex items-center gap-3">' +
              '<span class="text-xs font-mono text-stone-400">' + d.totalKcal + ' kcal</span>' +
              '<span class="font-bebas text-xl accent">' + d.totalProtein + 'g</span>' +
            '</div>' +
          '</div>' +
          '<p class="text-[10px] font-mono text-stone-500 mt-2 mb-2">어느 끼니에 추가할까요?</p>' +
          '<div class="meal-select-grid">' +
            '<button class="meal-select-btn" onclick="addToMeal(\'breakfast\', \'아침\')">아침</button>' +
            '<button class="meal-select-btn" onclick="addToMeal(\'lunch\', \'점심\')">점심</button>' +
            '<button class="meal-select-btn" onclick="addToMeal(\'dinner\', \'저녁\')">저녁</button>' +
            '<button class="meal-select-btn" onclick="addToMeal(\'snack\', \'간식\')">간식</button>' +
          '</div>' +
        '</div>';
    }
  });
  
  // 손코딩 모달
  var manualModalHtml = '';
  if (state.manualInputMode && state.manualInputData) {
    var d = state.manualInputData;
    manualModalHtml = 
      '<div class="manual-input-overlay" onclick="closeManualInput()">' +
        '<div class="manual-input-sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          '<div class="flex items-center justify-between mb-5">' +
            '<div>' +
              '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">직접 입력</p>' +
              '<p class="font-bebas text-2xl mt-1">음식 추가</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeManualInput()">' + icon('close', 18) + '</button>' +
          '</div>' +
          
          '<div class="input-group">' +
            '<div class="input-label"><p>음식 이름</p></div>' +
            '<input type="text" class="input-field" id="manual-name" placeholder="예: 단백질바" value="' + (d.name || '') + '" oninput="updateManualField(\'name\', this.value)" />' +
          '</div>' +
          
          '<div class="input-group">' +
            '<div class="input-label"><p>단백질</p><p>g</p></div>' +
            '<input type="number" class="input-field" id="manual-protein" placeholder="0" value="' + (d.protein || '') + '" oninput="updateManualField(\'protein\', this.value)" />' +
          '</div>' +
          
          '<div class="input-group">' +
            '<div class="input-label"><p>칼로리</p><p>kcal</p></div>' +
            '<input type="number" class="input-field" id="manual-kcal" placeholder="0" value="' + (d.kcal || '') + '" oninput="updateManualField(\'kcal\', this.value)" />' +
          '</div>' +
          
          '<button class="sheet-submit" onclick="submitManualInput()">분석 결과로 만들기</button>' +
        '</div>' +
      '</div>';
  }
  
  // 자주 먹는 음식 프리셋 (DB에서 추출)
  var presetItems = [
    { label: '⚡ 닭가슴살 100g', text: '닭가슴살 100g' },
    { label: '🥚 계란 3개', text: '계란 3개' },
    { label: '🥛 그릭요거트', text: '그릭요거트 150g' },
    { label: '🍚 현미밥', text: '현미밥 한 공기' },
    { label: '🥩 소고기 100g', text: '소고기 100g' },
    { label: '🍌 바나나', text: '바나나 1개' },
    { label: '💪 프로틴 1스쿱', text: '웨이프로틴 1스쿱' }
  ];
  
  var presetsHtml = presetItems.map(function(p) {
    return '<button class="preset-chip" onclick="applyPreset(\'' + p.text + '\')">' + p.label + '</button>';
  }).join('');
  
  var sendDisabled = !state.foodInputText.trim();
  
  return '' +
    '<div class="food-input-screen">' +
      
      // 헤더
      '<div class="food-input-header">' +
        '<button class="session-header-btn" onclick="closeFoodInput()">' + icon('close', 18) + '</button>' +
        '<div class="text-center">' +
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">기록 추가</p>' +
          '<p class="text-sm font-display font-bold mt-0\\.5">음식 입력</p>' +
        '</div>' +
        (state.apiKey 
          ? '<div class="api-status-badge active" style="font-size: 9px; padding: 4px 8px;">AI ✓</div>'
          : '<div style="width: 36px;"></div>') +
      '</div>' +
      
      // 채팅 영역
      '<div class="chat-area" id="chat-area">' + messagesHtml + '</div>' +
      
      // 하단 입력 영역
      '<div class="food-input-bottom">' +
        '<div class="preset-row">' + presetsHtml + '</div>' +
        '<div class="chat-input-bar">' +
          '<input type="text" id="food-chat-input" placeholder="음식 입력..." value="' + state.foodInputText + '" oninput="updateFoodInput(this.value)" onkeydown="if(event.key===\'Enter\') sendFoodMessage()" />' +
          '<button class="chat-send-btn" id="food-send-btn" onclick="sendFoodMessage()"' + (sendDisabled ? ' disabled' : '') + '>' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      
    '</div>' +
    
    manualModalHtml;
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
  state.apiKeyModalOpen = false;
  state.apiKeyInput = '';
  render();
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
    if (!confirm('"sk-ant-"로 시작하지 않습니다. 그래도 저장하시겠습니까?')) return;
  }
  state.apiKey = key;
  storage.set(KEYS.API_KEY, key);
  state.apiKeyModalOpen = false;
  state.apiKeyInput = '';
  render();
  // 토스트 대체
  setTimeout(function() {
    alert('API 키가 저장되었습니다. 이제 DB에 없는 음식도 AI가 분석합니다.');
  }, 100);
};

// API 키 삭제
window.deleteApiKey = function() {
  if (!confirm('API 키를 삭제하시겠습니까? 이후 음식 분석은 DB만 사용합니다.')) return;
  state.apiKey = null;
  storage.set(KEYS.API_KEY, null);
  state.apiKeyModalOpen = false;
  render();
};

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
  
  var categories = {
    '🦵 하체': ['레그 프레스', '핵 스쿼트', '리버스 브이 스쿼트', '머신 레그 익스텐션', '바벨 루마니안 데드리프트', '머신 라잉 레그 컬', '머신 힙 쓰러스트', '머신 힙 어브덕션', '덤벨 불가리안 스플릿 스쿼트', '덤벨 싱글 레그 데드리프트'],
    '💪 가슴': ['머신 체스트 프레스', '스미스 인클라인 벤치 프레스', '머신 펙 덱 플라이', '덤벨 인클라인 벤치 프레스', '케이블 플라이'],
    '🏋️ 어깨': ['머신 시티드 숄더 프레스', '덤벨 숄더 프레스', '덤벨 아놀드 프레스', '덤벨 사이드 레터럴 레이즈', '케이블 원 암 레터럴 레이즈'],
    '💥 삼두': ['케이블 푸시 다운', '케이블 오버헤드 트라이셉스 익스텐션', '케이블 트라이셉스 킥백', '어시스트 딥스'],
    '🔙 등': ['머신 시티드 로우', '케이블 시티드 로우', '클로즈 그립 랫 풀 다운', 'T 바 로우', '리버스 그립 랫 풀 다운', '랫 풀 다운', '케이블 암 풀 다운', '덤벨 인클라인 로우', '리버스 펙 덱 플라이', '원암 리버스 펙 덱 플라이', '페이스 풀', '케이블 슈러그', '켈소 슈러그'],
    '💪 이두': ['바벨 컬', '덤벨 해머 컬', '덤벨 프리처 컬', '이지 바 프리처 컬', '인클라인 덤벨 컬', '덤벨 얼터네이트 컬'],
    '🎯 코어': ['머신 시티드 크런치', '케이블 닐링 사이드 크런치', '인클라인 덤벨 와이 레이즈']
  };
  
  var totalCount = Object.keys(data).length;
  
  var categoriesHtml = '';
  Object.keys(categories).forEach(function(cat) {
    var items = categories[cat].filter(function(name) { return data[name] !== undefined; });
    if (items.length === 0) return;
    
    var itemsHtml = items.map(function(name) {
      var rm = data[name];
      var w75 = Math.round((rm * 0.75) / 2.5) * 2.5;
      return '<div class="menu-row" style="cursor: default;">' +
        '<div class="flex-1">' +
          '<p class="text-sm font-display font-bold">' + name + '</p>' +
          '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">75% 작업무게 ' + w75 + 'kg</p>' +
        '</div>' +
        '<p class="font-bebas text-xl" style="color: #fbbf24;">' + rm + '<span class="text-xs text-stone-400">kg</span></p>' +
      '</div>';
    }).join('');
    
    categoriesHtml += 
      '<div class="mb-5">' +
        '<div class="flex items-center justify-between mb-2 px-1">' +
          '<p class="text-xs font-display font-bold">' + cat + '</p>' +
          '<p class="text-[10px] font-mono text-stone-500">' + items.length + '개</p>' +
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
            '<p class="text-[10px] font-mono text-stone-500">총 ' + totalCount + '개 종목</p>' +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="resetOneRM()" title="초기화">' + icon('refresh', 16) + '</button>' +
      '</div>' +
      
      '<div class="px-5 pt-5 pb-20">' +
        
        '<div class="card mb-4" style="padding: 14px; background: rgba(251, 191, 36, 0.06); border-color: rgba(251, 191, 36, 0.25);">' +
          '<div class="flex items-start gap-2">' +
            '<div style="color: #fbbf24; flex-shrink: 0;">🏆</div>' +
            '<div>' +
              '<p class="text-xs font-display font-bold" style="color: #fbbf24;">자동 갱신됨</p>' +
              '<p class="text-[10px] font-mono text-stone-400 leading-relaxed mt-1">운동할 때마다 1RM이 자동 계산되어 갱신됩니다. 더 무거운 무게/더 많은 횟수를 들수록 증가해요. (Epley 공식 적용)</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        
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
  state.resetConfirming = false;
  render();
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
  localStorage.setItem(KEYS.NUTRITION_LOG, JSON.stringify([]));
  localStorage.setItem(KEYS.PERSONAL_RECORDS, JSON.stringify([]));
  localStorage.setItem(KEYS.BODY_LOG, JSON.stringify([]));
  localStorage.setItem(KEYS.CONDITION_LOG, JSON.stringify([]));
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
  
  showToast('✓ 모든 데이터 삭제 완료');
  setTimeout(function() {
    location.reload();
  }, 1000);
};

// 백업/내보내기 (.md 파일)
window.exportData = function() {
  var data = {
    profile: state.profile,
    workoutLog: state.data.workoutLog,
    nutritionLog: state.data.nutritionLog,
    personalRecords: state.data.personalRecords,
    settings: state.settings,
    exportedAt: new Date().toISOString()
  };
  
  var md = '# 피트니스 데이터 백업\n\n';
  md += '내보낸 시간: ' + new Date().toLocaleString('ko-KR') + '\n\n';
  md += '## 프로필\n';
  md += '- 체중: ' + state.profile.weight + 'kg\n';
  md += '- 목표 단백질: ' + state.profile.proteinTarget + 'g\n';
  md += '- 사이클: ' + state.profile.currentCycle + ' / 주차: ' + state.profile.currentWeek + '\n\n';
  md += '## 운동 기록 (' + state.data.workoutLog.length + '회)\n';
  state.data.workoutLog.forEach(function(w) {
    md += '- ' + w.date + ' · ' + w.sessionKr + ' · ' + w.duration + '분\n';
  });
  md += '\n## PR (' + state.data.personalRecords.length + '개)\n';
  state.data.personalRecords.forEach(function(pr) {
    md += '- ' + pr.exerciseName + ': ' + (pr.weight ? pr.weight + 'kg' : pr.reps + '회') + ' (' + pr.date + ')\n';
  });
  md += '\n## 원본 데이터 (JSON)\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n';
  
  var blob = new Blob([md], { type: 'text/markdown' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'fitness-backup-' + new Date().toISOString().split('T')[0] + '.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ═══════════════════════════════════════════════
// 더보기 화면 - 렌더
// ═══════════════════════════════════════════════
function renderMore() {
  var profile = state.profile;
  var apiKey = state.apiKey;
  var settings = state.settings;
  
  // API 키 모달
  var apiModalHtml = '';
  if (state.apiKeyModalOpen) {
    apiModalHtml = 
      '<div class="manual-input-overlay" onclick="closeApiKeyModal()">' +
        '<div class="manual-input-sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          
          '<div class="flex items-center justify-between mb-5">' +
            '<div>' +
              '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">AI 음식 분석</p>' +
              '<p class="font-bebas text-2xl mt-1">Anthropic API 키</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeApiKeyModal()">' + icon('close', 18) + '</button>' +
          '</div>' +
          
          // 안내
          '<div class="card mb-4" style="padding: 14px; background: rgba(0, 212, 255, 0.06); border-color: rgba(0, 212, 255, 0.25);">' +
            '<div class="flex items-start gap-2">' +
              '<div style="color: #00d4ff; flex-shrink: 0; margin-top: 2px;">' + icon('info', 16) + '</div>' +
              '<div>' +
                '<p class="text-xs accent font-mono uppercase tracking-widest mb-1">왜 필요한가요?</p>' +
                '<p class="text-xs text-stone-300 leading-relaxed">DB에 없는 음식(예: "단백질바", "수제 도시락")을 입력하면 Claude Haiku AI가 영양 정보를 분석해줍니다. API 키 없이도 50+ 한국 음식은 DB로 작동합니다.</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          
          // 입력
          '<div class="input-group">' +
            '<div class="input-label">' +
              '<p>API 키</p>' +
              '<p>console.anthropic.com</p>' +
            '</div>' +
            '<input type="password" class="api-key-input" id="api-key-field" placeholder="sk-ant-..." value="' + (state.apiKeyInput || '') + '" oninput="updateApiKeyInput(this.value)" />' +
            '<p class="text-[10px] font-mono text-stone-500 mt-2 px-1">키는 본인 기기에만 저장되며 외부로 전송되지 않습니다.</p>' +
          '</div>' +
          
          // 저장 버튼
          '<button class="sheet-submit" onclick="saveApiKey()">저장</button>' +
          
          // 삭제 버튼 (기존 키 있을 때만)
          (apiKey ? '<button class="btn-danger mt-2" onclick="deleteApiKey()">API 키 삭제</button>' : '') +
          
        '</div>' +
      '</div>';
  }
  
  return '' +
    // 헤더
    '<div class="px-5 pt-12 pb-5">' +
      '<p class="text-xs uppercase font-mono text-stone-500 mb-2" style="letter-spacing: 0.3em;">MORE</p>' +
      '<h1 class="font-bebas text-4xl">더보기</h1>' +
    '</div>' +
    
    '<div class="px-5 pb-32" style="display: flex; flex-direction: column; gap: 20px;">' +
      
      // 프로필 카드
      '<div class="more-profile-card">' +
        '<div class="flex items-center gap-3">' +
          '<div class="avatar-box">U</div>' +
          '<div class="flex-1">' +
            '<p class="font-display font-bold text-base">사용자</p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-1">' + profile.age + '세 · ' + profile.height + 'cm · ' + profile.weight + 'kg</p>' +
            '<div class="flex items-center gap-2 mt-1">' +
              '<span class="api-status-badge active" style="font-size: 9px; padding: 3px 8px;">린매스</span>' +
              '<span class="text-[10px] font-mono text-stone-500">목표 ' + profile.proteinTarget + 'g/일</span>' +
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
              (apiKey ? '운동·식단·컨디션 질문하기 · Sonnet 4.6' : 'API 키 설정 후 사용 가능') +
            '</p>' +
          '</div>' +
          '<div style="color: #00d4ff;">' + icon('chevron', 18) + '</div>' +
        '</div>' +
      '</button>' +
      
      // AI 코칭 ⭐ 핵심
      '<div>' +
        '<p class="section-label">AI 코칭</p>' +
        '<div class="section-group">' +
          '<div class="menu-row" onclick="openApiKeyModal()">' +
            '<div class="menu-icon-sm accent-bg-soft">' + icon('key', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">Anthropic API 키</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + 
                (apiKey ? maskApiKey(apiKey) : 'AI 음식 분석/코칭 활성화') + 
              '</p>' +
            '</div>' +
            '<span class="api-status-badge ' + (apiKey ? 'active' : 'inactive') + '">' +
              (apiKey ? '✓ 활성' : '비활성') +
            '</span>' +
          '</div>' +
          
          (apiKey ? 
            '<div class="menu-row" onclick="openWeeklyReview()">' +
              '<div class="menu-icon-sm accent-bg-soft">' + icon('chart', 18) + '</div>' +
              '<div class="menu-row-content">' +
                '<p class="text-sm font-display font-bold">주간 리뷰</p>' +
                '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + (state.weeklyReview ? '이번 주 ' + state.weeklyReview.grade + '등급 리뷰' : '이번 주 종합 분석') + '</p>' +
              '</div>' +
              '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
            '</div>'
          : '') +
          
          (apiKey ? 
            '<div class="menu-row" onclick="openPlateauDetail()">' +
              '<div class="menu-icon-sm ' + (state.plateauCheck ? '' : 'accent-bg-soft') + '" ' + (state.plateauCheck ? 'style="background: rgba(251, 191, 36, 0.12); color: #fbbf24;"' : '') + '>' + icon('info', 18) + '</div>' +
              '<div class="menu-row-content">' +
                '<p class="text-sm font-display font-bold">정체기 분석</p>' +
                '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + (state.plateauCheck ? '⚠️ ' + state.plateauCheck.signals.length + '개 신호 감지됨' : '진행 정체 자동 진단') + '</p>' +
              '</div>' +
              (state.plateauCheck ? '<span class="api-status-badge" style="background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4);">감지</span>' : '<div class="menu-arrow">' + icon('chevron', 16) + '</div>') +
            '</div>'
          : '') +
        '</div>' +
      '</div>' +
      
      // 사이클
      '<div>' +
        '<p class="section-label">사이클</p>' +
        '<div class="section-group">' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm accent-bg-soft">' + icon('refresh', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">현재 사이클</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">Cycle ' + profile.currentCycle + ' · ' + profile.cyclePhase + ' · ' + profile.currentWeek + '/7주</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm">' + icon('calendar', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">사이클 히스토리</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">지난 사이클 기록</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm">' + icon('plus', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">새 사이클 시작</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">7주 프로그램 재설계</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 종목
      '<div>' +
        '<p class="section-label">종목</p>' +
        '<div class="section-group">' +
          '<div class="menu-row" onclick="openOneRMList()">' +
            '<div class="menu-icon-sm" style="background: rgba(251, 191, 36, 0.12); color: #fbbf24;">🏆</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">내 1RM</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + Object.keys(storage.get(KEYS.ONE_RM_DATA, {})).length + '개 종목 추적 중</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm accent-bg-soft">' + icon('search', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">종목 라이브러리</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">940개 운동 검색·탐색</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm">' + icon('star', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">즐겨찾기 종목</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">자주 하는 운동 관리</p>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 8px;">' +
              '<p class="text-[10px] font-mono accent">0개</p>' +
              '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 앱
      '<div>' +
        '<p class="section-label">앱</p>' +
        '<div class="section-group">' +
          '<div class="menu-row" onclick="installPWA()">' +
            '<div class="menu-icon-sm accent-bg-soft">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' +
              '</svg>' +
            '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold" style="color: #00d4ff;">홈 화면에 설치</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">앱처럼 사용 · 오프라인 지원</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 데이터
      '<div>' +
        '<p class="section-label">데이터</p>' +
        '<div class="section-group">' +
          '<div class="menu-row" onclick="exportData()">' +
            '<div class="menu-icon-sm">' + icon('download', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">백업 / 내보내기</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">주간 리포트 .md 파일</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row" onclick="alert(\'가져오기는 다음 단계에서 구현됩니다\')">' +
            '<div class="menu-icon-sm">' + icon('upload', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">가져오기</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">백업 파일 복원</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row" onclick="resetAllData()">' +
            '<div class="menu-icon-sm danger-bg-soft">' + icon('trash', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold" style="color: #ef4444;">전체 초기화</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">모든 데이터 삭제</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 설정
      '<div>' +
        '<p class="section-label">설정</p>' +
        '<div class="section-group">' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm">' + icon('units', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">단위</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">무게 · 길이</p>' +
            '</div>' +
            '<p class="text-[11px] font-mono accent" style="margin-right: 8px;">KG · CM</p>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row" onclick="toggleSetting(\'notifications\')">' +
            '<div class="menu-icon-sm">' + icon('bell', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">알림</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">단백질 · 운동 리마인더</p>' +
            '</div>' +
            '<div class="toggle-switch-sm ' + (settings.notifications ? 'on' : '') + '">' +
              '<div class="toggle-knob-sm"></div>' +
            '</div>' +
          '</div>' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm">' + icon('sun', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">테마</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">화면 색상</p>' +
            '</div>' +
            '<p class="text-[11px] font-mono accent" style="margin-right: 8px;">DARK</p>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 정보
      '<div>' +
        '<p class="section-label">정보</p>' +
        '<div class="section-group">' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm">' + icon('help', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">도움말</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">사용 가이드</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row">' +
            '<div class="menu-icon-sm">' + icon('info', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">앱 정보</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">v1.0.0 · Personal</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // 푸터
      '<div class="app-footer">' +
        '<p class="app-footer-brand">FITNESS</p>' +
        '<p class="text-[10px] font-mono text-stone-600 mt-1">Personal fitness tracker</p>' +
        '<p class="text-[10px] font-mono text-stone-700 mt-1">Built with science</p>' +
      '</div>' +
      
    '</div>' +
    
    apiModalHtml;
}

// AI 추천 새로고침
window.refreshAIRecommendation = async function() {
  // 캐시 무효화
  storage.set(KEYS.AI_RECOMMENDATION, null);
  
  state.aiRecLoading = true;
  state.aiRecommendation = null;
  render();
  
  var rec = await fetchAIRecommendation();
  state.aiRecommendation = rec;
  state.aiRecLoading = false;
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
  if (!confirm('정체기 알림을 닫으시겠습니까? 3일 후 다시 체크됩니다.')) return;
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
    var greeting = '안녕하세요! 사용자의 개인 피트니스 코치입니다.\n\n' +
      '현재 **Cycle ' + profile.currentCycle + ' · ' + profile.cyclePhase + '** 진행 중이시네요. ' +
      '운동·식단·컨디션 뭐든 물어보세요.\n\n' +
      '예: "오늘 어떤 운동 해야 해?", "정체기 같은데 어떻게 해?", "단백질 어떻게 더 늘려?"';
    
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
      content: '⚠️ API 키가 설정되지 않았어요.\n\n' +
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
      content: '⚠️ ' + result.error 
    });
  } else {
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
        '<div style="color: #fbbf24; flex-shrink: 0;">' + icon('info', 18) + '</div>' +
        '<div class="flex-1">' +
          '<p class="text-xs font-display font-bold" style="color: #fbbf24;">API 키 필요</p>' +
          '<p class="text-[10px] font-mono text-stone-400 mt-0\\.5">더보기 → Anthropic API 키 설정</p>' +
        '</div>' +
      '</div>';
  }
  
  // 빠른 질문 (대화 적을 때만)
  var quickQuestions = [];
  if (state.coachMessages.length <= 1) {
    quickQuestions = [
      { icon: '💪', text: '오늘 어떤 운동 해야 해?' },
      { icon: '🍗', text: '단백질 어떻게 더 늘려?' },
      { icon: '📈', text: '내 진행 상황 어때?' },
      { icon: '⚠️', text: '정체기 같은데 어떻게?' },
      { icon: '😴', text: '회복이 부족해' }
    ];
  }
  
  var quickHtml = quickQuestions.length > 0 
    ? '<div class="coach-quick-questions">' + 
        quickQuestions.map(function(q) {
          return '<button class="coach-quick-chip" onclick="applyCoachQuickQuestion(\'' + q.text.replace(/'/g, "\\'") + '\')">' + q.icon + ' ' + q.text + '</button>';
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
            '<p class="text-[10px] font-mono text-stone-500"><span class="coach-online-dot"></span> ' + (hasApiKey ? 'Sonnet 4.6' : 'API 키 필요') + '</p>' +
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
          '<input type="text" id="coach-chat-input" placeholder="' + (hasApiKey ? '코치에게 물어보기...' : 'API 키 설정 후 사용 가능') + '" value="' + state.coachInputText + '" oninput="updateCoachInput(this.value)" onkeydown="if(event.key===\'Enter\') sendCoachMessage()" ' + (state.coachThinking ? 'disabled' : '') + ' />' +
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
              '<p class="text-[10px] font-mono text-stone-500">분석 중...</p>' +
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
            : '') +
        '</div>' +
      '</div>';
  }
  
  // 등급 색상
  var gradeColors = { 'S': '#00d4ff', 'A': '#00d4ff', 'B': '#a78bfa', 'C': '#fbbf24', 'D': '#ef4444' };
  var gradeColor = gradeColors[review.grade] || '#a78bfa';
  
  // 잘한 점
  var winsHtml = review.wins.map(function(w) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: #00d4ff;"></div>' +
      '<p>' + w + '</p>' +
    '</div>';
  }).join('');
  
  // 개선점
  var improvementsHtml = review.improvements.map(function(i) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: #fbbf24;"></div>' +
      '<p>' + i + '</p>' +
    '</div>';
  }).join('');
  
  // 다음 주
  var nextWeekHtml = review.nextWeek.map(function(n) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: #00d4ff;"></div>' +
      '<p>' + n + '</p>' +
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
            '<p class="text-[10px] font-mono text-stone-500">' + review.monday + ' ~ ' + review.sunday + '</p>' +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="refreshWeeklyReview()" title="다시 분석">' + icon('refresh', 16) + '</button>' +
      '</div>' +
      
      '<div class="px-5 pt-5 pb-20">' +
        
        // 등급 + 헤드라인
        '<div class="text-center mb-6">' +
          '<div style="display: inline-block; font-family: \'Bebas Neue\', sans-serif; font-size: 80px; line-height: 1; color: ' + gradeColor + '; text-shadow: 0 0 30px ' + gradeColor + '40;">' + review.grade + '</div>' +
          '<p class="text-xs font-mono text-stone-500 uppercase tracking-widest mt-1 mb-3">이번 주 평가</p>' +
          '<p class="text-base font-display font-bold leading-relaxed">' + review.headline + '</p>' +
        '</div>' +
        
        // 통계 요약
        '<div class="grid grid-cols-2 gap-3 mb-5">' +
          '<div class="stat-mini-card">' +
            '<p class="stat-mini-label">운동</p>' +
            '<p class="stat-mini-value">' + review.stats.workoutCount + '<span class="stat-mini-unit">회</span></p>' +
          '</div>' +
          '<div class="stat-mini-card">' +
            '<p class="stat-mini-label">단백질 평균</p>' +
            '<p class="stat-mini-value">' + review.stats.avgProtein + '<span class="stat-mini-unit">g</span></p>' +
          '</div>' +
          '<div class="stat-mini-card">' +
            '<p class="stat-mini-label">PR</p>' +
            '<p class="stat-mini-value">' + review.stats.prCount + '<span class="stat-mini-unit">개</span></p>' +
          '</div>' +
          '<div class="stat-mini-card">' +
            '<p class="stat-mini-label">체중 변화</p>' +
            '<p class="stat-mini-value">' + (review.stats.weightChange >= 0 ? '+' : '') + review.stats.weightChange + '<span class="stat-mini-unit">kg</span></p>' +
          '</div>' +
        '</div>' +
        
        // 잘한 점
        (winsHtml ? 
          '<div class="review-section highlight">' +
            '<p class="text-[10px] font-mono accent uppercase tracking-widest mb-3">✓ 잘한 점</p>' +
            winsHtml +
          '</div>' : '') +
        
        // 개선점
        (improvementsHtml ? 
          '<div class="review-section warning">' +
            '<p class="text-[10px] font-mono uppercase tracking-widest mb-3" style="color: #fbbf24;">⚠ 개선점</p>' +
            improvementsHtml +
          '</div>' : '') +
        
        // 다음 주
        (nextWeekHtml ? 
          '<div class="review-section">' +
            '<p class="text-[10px] font-mono text-stone-400 uppercase tracking-widest mb-3">→ 다음 주 조정</p>' +
            nextWeekHtml +
          '</div>' : '') +
        
        // 코치 한 마디
        (review.coachNote ? 
          '<div class="card-coach mt-5">' +
            '<div class="flex items-start gap-3">' +
              '<div class="coach-icon accent">' + icon('msg', 18) + '</div>' +
              '<div class="flex-1">' +
                '<p class="text-xs font-mono accent uppercase tracking-widest mb-1\\.5">COACH</p>' +
                '<p class="text-sm text-stone-200 leading-relaxed">' + review.coachNote + '</p>' +
              '</div>' +
            '</div>' +
          '</div>' : '') +
        
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
  
  // 신호 라벨
  var signalLabels = {
    'pr_stalled': '🏆 PR 갱신 정체 (2주)',
    'weight_stalled': '⚖️ 체중 변화 없음',
    'frequency_drop': '📉 운동 빈도 감소',
    'protein_low': '🥩 단백질 평균 부족'
  };
  
  var signalsHtml = p.signals.map(function(s) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: #fbbf24;"></div>' +
      '<p>' + (signalLabels[s] || s) + '</p>' +
    '</div>';
  }).join('');
  
  // 권장사항
  var recsHtml = p.recommendations.map(function(r) {
    return '<div class="review-bullet">' +
      '<div class="review-bullet-dot" style="background: #00d4ff;"></div>' +
      '<p>' + r + '</p>' +
    '</div>';
  }).join('');
  
  // 심각도 색상
  var severityColors = { 'low': '#fbbf24', 'medium': '#fbbf24', 'high': '#ef4444' };
  var sevColor = severityColors[p.severity] || '#fbbf24';
  var sevLabel = { 'low': '낮음', 'medium': '중간', 'high': '높음' }[p.severity] || '중간';
  
  return '' +
    '<div class="review-detail-screen">' +
      // 헤더
      '<div class="coach-header">' +
        '<button class="session-header-btn" onclick="closePlateauDetail()">' + icon('close', 18) + '</button>' +
        '<div class="coach-header-info">' +
          '<div>' +
            '<p class="text-sm font-display font-bold">정체기 분석</p>' +
            '<p class="text-[10px] font-mono text-stone-500">' + p.detectedAt + ' 감지</p>' +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="dismissPlateau()" title="알림 닫기">' + icon('close', 16) + '</button>' +
      '</div>' +
      
      '<div class="px-5 pt-5 pb-20">' +
        
        // 진단
        '<div class="text-center mb-6">' +
          '<div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: ' + sevColor + '20; border: 1px solid ' + sevColor + '60; color: ' + sevColor + '; font-size: 10px; font-family: \'JetBrains Mono\', monospace; text-transform: uppercase; letter-spacing: 0.1em;">심각도 ' + sevLabel + '</div>' +
          '<p class="font-bebas text-3xl mt-4 mb-2">정체기 신호 감지</p>' +
          '<p class="text-sm text-stone-300 leading-relaxed">' + p.diagnosis + '</p>' +
        '</div>' +
        
        // 주요 원인
        (p.primary_cause ? 
          '<div class="review-section warning">' +
            '<p class="text-[10px] font-mono uppercase tracking-widest mb-2" style="color: #fbbf24;">⚠ 주요 원인</p>' +
            '<p class="text-sm font-display font-bold">' + p.primary_cause + '</p>' +
          '</div>' : '') +
        
        // 감지된 신호
        '<div class="review-section">' +
          '<p class="text-[10px] font-mono text-stone-400 uppercase tracking-widest mb-3">📊 감지된 신호</p>' +
          signalsHtml +
        '</div>' +
        
        // 권장 조정
        (recsHtml ? 
          '<div class="review-section highlight">' +
            '<p class="text-[10px] font-mono accent uppercase tracking-widest mb-3">→ 권장 조정</p>' +
            recsHtml +
          '</div>' : '') +
        
        // 격려
        (p.encouragement ? 
          '<div class="card-coach mt-5">' +
            '<div class="flex items-start gap-3">' +
              '<div class="coach-icon accent">' + icon('msg', 18) + '</div>' +
              '<div class="flex-1">' +
                '<p class="text-xs font-mono accent uppercase tracking-widest mb-1\\.5">COACH</p>' +
                '<p class="text-sm text-stone-200 leading-relaxed">' + p.encouragement + '</p>' +
              '</div>' +
            '</div>' +
          '</div>' : '') +
        
        // 코치와 대화 버튼
        '<button class="coach-chat-card mt-5" onclick="closePlateauDetail(); openCoachChat();" style="width: 100%;">' +
          '<div class="flex items-center gap-3">' +
            '<div class="coach-chat-icon">' + icon('msg', 22) + '</div>' +
            '<div class="flex-1 text-left">' +
              '<p class="font-display font-bold text-sm">코치와 더 자세히 상담</p>' +
              '<p class="text-[10px] font-mono text-stone-400 mt-0\\.5">맞춤 계획 세우기</p>' +
            '</div>' +
            '<div style="color: #00d4ff;">' + icon('chevron', 16) + '</div>' +
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
  var nutritionLog = filterByPeriod(state.data.nutritionLog, period);
  var personalRecords = filterByPeriod(state.data.personalRecords, period);
  
  // 정렬 (날짜 오름차순)
  bodyLog = bodyLog.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
  
  // 핵심 지표 계산
  var currentWeight = bodyLog.length > 0 ? bodyLog[bodyLog.length - 1].weight : profile.weight;
  var startWeight = bodyLog.length > 0 ? bodyLog[0].weight : profile.weight;
  var weightChange = (currentWeight - startWeight).toFixed(1);
  var weightChangeSign = weightChange >= 0 ? '+' : '';
  
  // 단백질 일평균
  var nutritionByDate = {};
  nutritionLog.forEach(function(m) {
    if (!nutritionByDate[m.date]) nutritionByDate[m.date] = 0;
    nutritionByDate[m.date] += m.protein || 0;
  });
  var dailyProteins = Object.values(nutritionByDate);
  var avgProtein = dailyProteins.length > 0 
    ? Math.round(dailyProteins.reduce(function(s, p) { return s + p; }, 0) / dailyProteins.length)
    : 0;
  
  // 단백질 목표 달성일 (155g 이상)
  var achievedDays = dailyProteins.filter(function(p) { return p >= profile.proteinTarget; }).length;
  
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
              '<stop offset="0%" stop-color="#00d4ff" stop-opacity="0.3"/>' +
              '<stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path d="' + line.area + '" fill="url(#weightGrad)"/>' +
          '<path d="' + line.path + '" stroke="#00d4ff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
          line.points +
        '</svg>' +
        '<div class="chart-x-labels">' +
          '<p>' + (period === '1week' ? '1주전' : period === '1month' ? '4주전' : '시작') + '</p>' +
          '<p style="color: #00d4ff;">오늘</p>' +
        '</div>' +
      '</div>';
  } else {
    chartHtml = 
      '<div style="height: 140px; display: flex; align-items: center; justify-content: center; color: #4a5568; font-family: \'JetBrains Mono\', monospace; font-size: 12px;">' +
        '데이터가 없습니다' +
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
    var labelStyle = w.isCurrent ? 'color: #00d4ff;' : '';
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
  var freeCount = workoutLog.filter(function(w) { return w.sessionKr === 'FREE'; }).length;
  var totalCount = pushCount + pullCount + legsCount + freeCount;
  
  function partRow(name, count) {
    var pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return '<div style="margin-bottom: 10px;">' +
      '<div class="flex items-center justify-between mb-1">' +
        '<p class="text-xs font-display">' + name + '</p>' +
        '<p class="text-[10px] font-mono text-stone-400">' + count + '회</p>' +
      '</div>' +
      '<div class="progress-bg"><div class="progress-fill" style="width: ' + pct + '%;"></div></div>' +
    '</div>';
  }
  
  var partsHtml = partRow('PUSH', pushCount) + partRow('PULL', pullCount) + partRow('LEGS', legsCount) + partRow('FREE', freeCount);
  
  // 일별 단백질 (지난 7일)
  var proteinDays = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    var dStr = getDateStr(d);
    var dayProtein = state.data.nutritionLog
      .filter(function(m) { return m.date === dStr; })
      .reduce(function(s, m) { return s + (m.protein || 0); }, 0);
    proteinDays.push({
      day: ['일','월','화','수','목','금','토'][d.getDay()],
      protein: dayProtein,
      isToday: i === 0
    });
  }
  
  var maxProteinDay = Math.max.apply(null, proteinDays.map(function(p) { return p.protein; }).concat([profile.proteinTarget]));
  
  var proteinBarsHtml = '';
  proteinDays.forEach(function(p) {
    var pct = (p.protein / maxProteinDay);
    var height = p.protein > 0 ? Math.max(5, pct * 90) : 4;
    var cls = p.protein === 0 ? 'bar-shape' : (p.protein >= profile.proteinTarget ? 'bar-shape active' : 'bar-shape partial');
    var labelStyle = p.isToday ? 'color: #00d4ff;' : '';
    proteinBarsHtml += 
      '<div class="bar-col" style="gap: 4px;">' +
        '<div class="' + cls + '" style="height: ' + height + 'px; border-radius: 3px 3px 0 0;"></div>' +
        '<p class="text-[8px] font-mono" style="' + labelStyle + (p.isToday ? '' : 'color: #4a5568;') + '">' + p.day + '</p>' +
      '</div>';
  });
  
  // PR 히스토리
  var prListHtml = '';
  if (personalRecords.length === 0) {
    prListHtml = '<p class="text-xs text-stone-500 font-mono text-center" style="padding: 20px 0;">기간 내 PR 기록이 없습니다</p>';
  } else {
    personalRecords.slice(0, 5).forEach(function(pr) {
      var prValue, prChange;
      if (pr.weight !== undefined && pr.previousWeight !== undefined) {
        prValue = pr.weight;
        prChange = pr.previousWeight + ' → ' + pr.weight + ' <span class="accent">(+' + (pr.weight - pr.previousWeight).toFixed(1) + 'kg)</span>';
      } else {
        prValue = pr.reps;
        prChange = (pr.previousReps || 0) + ' → ' + pr.reps + ' <span class="accent">(+' + (pr.reps - (pr.previousReps || 0)) + ')</span>';
      }
      var unit = pr.weight ? 'kg' : '회';
      
      prListHtml += 
        '<div class="pr-history-item" style="margin-bottom: 8px;">' +
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center gap-2">' +
              '<div style="color: #00d4ff;">' + icon('trophy', 14) + '</div>' +
              '<p class="text-sm font-display font-bold">' + pr.exerciseName + '</p>' +
            '</div>' +
            '<p class="text-[10px] font-mono text-stone-500">' + daysAgo(pr.date) + '</p>' +
          '</div>' +
          '<div class="flex items-baseline justify-between">' +
            '<div class="flex items-baseline gap-2">' +
              '<p class="font-bebas text-2xl accent">' + prValue + '<span class="text-sm text-stone-400">' + unit + '</span></p>' +
              (pr.weight ? '<p class="text-[10px] font-mono text-stone-500">× ' + pr.reps + '회</p>' : '') +
            '</div>' +
            '<p class="text-[10px] font-mono text-stone-400">' + prChange + '</p>' +
          '</div>' +
        '</div>';
    });
  }
  
  return '' +
    // 헤더
    '<div class="px-5 pt-12 pb-4">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<p class="text-xs uppercase font-mono text-stone-500" style="letter-spacing: 0.3em;">STATS</p>' +
        '<button class="session-header-btn" onclick="exportData()">' + icon('download', 16) + '</button>' +
      '</div>' +
      '<h1 class="font-bebas text-4xl">기록</h1>' +
      
      // 기간 탭
      '<div class="flex gap-2 mt-4" style="overflow-x: auto;">' + periodTabs + '</div>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      
      // 핵심 지표 (2x2)
      '<div class="grid grid-cols-2 gap-3 mb-4">' +
        '<div class="stat-mini-card">' +
          '<p class="stat-mini-label">체중</p>' +
          '<div class="flex items-baseline gap-1\\.5">' +
            '<p class="stat-mini-value">' + currentWeight.toFixed(1) + '</p>' +
            '<p class="stat-mini-unit">kg</p>' +
          '</div>' +
          (weightChange != 0 ? 
            '<p class="stat-mini-change" style="color: ' + (weightChange < 0 ? '#00d4ff' : '#fbbf24') + ';">' + weightChangeSign + weightChange + 'kg / ' + getPeriodLabel(period) + '</p>'
            : '<p class="stat-mini-change text-stone-500">변동 없음</p>') +
        '</div>' +
        '<div class="stat-mini-card">' +
          '<p class="stat-mini-label">PR</p>' +
          '<div class="flex items-baseline gap-1\\.5">' +
            '<p class="stat-mini-value">' + personalRecords.length + '</p>' +
            '<p class="stat-mini-unit">개</p>' +
          '</div>' +
          '<p class="stat-mini-change text-stone-500">' + getPeriodLabel(period) + ' 갱신</p>' +
        '</div>' +
        '<div class="stat-mini-card">' +
          '<p class="stat-mini-label">운동</p>' +
          '<div class="flex items-baseline gap-1\\.5">' +
            '<p class="stat-mini-value">' + workoutLog.length + '</p>' +
            '<p class="stat-mini-unit">회</p>' +
          '</div>' +
          '<p class="stat-mini-change accent">평균 주 ' + (workoutLog.length > 0 ? Math.round((workoutLog.length / Math.max(1, getPeriodDays(period) / 7)) * 10) / 10 : 0) + '회</p>' +
        '</div>' +
        '<div class="stat-mini-card">' +
          '<p class="stat-mini-label">단백질</p>' +
          '<div class="flex items-baseline gap-1\\.5">' +
            '<p class="stat-mini-value">' + avgProtein + '</p>' +
            '<p class="stat-mini-unit">g</p>' +
          '</div>' +
          '<p class="stat-mini-change text-stone-500">일평균 · ' + achievedDays + '일 달성</p>' +
        '</div>' +
      '</div>' +
      
      // 체중/체지방 차트
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<div class="flex items-center gap-2">' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">변화</p>' +
            '<div class="chart-toggle">' +
              '<button class="chart-toggle-btn ' + (state.chartView === 'weight' ? 'active' : '') + '" onclick="toggleChartView(\'weight\')">체중</button>' +
              '<button class="chart-toggle-btn ' + (state.chartView === 'bodyFat' ? 'active' : '') + '" onclick="toggleChartView(\'bodyFat\')">체지방</button>' +
            '</div>' +
          '</div>' +
          '<button class="text-[10px] font-mono accent uppercase tracking-wider" onclick="addBodyRecord()">+ 기록</button>' +
        '</div>' +
        
        '<div class="flex items-baseline justify-between mb-4">' +
          '<div>' +
            '<p class="font-bebas text-4xl">' + currentWeight.toFixed(1) + '<span class="text-base text-stone-500">kg</span></p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">오늘</p>' +
          '</div>' +
          '<div class="text-right">' +
            '<p class="text-xs font-mono ' + (weightChange < 0 ? 'accent' : 'text-stone-500') + '">' + weightChangeSign + weightChange + 'kg</p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">시작 ' + startWeight.toFixed(1) + 'kg</p>' +
          '</div>' +
        '</div>' +
        
        chartHtml +
      '</div>' +
      
      // 주간 운동
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">주간 운동</p>' +
          '<p class="text-xs font-mono accent">' + workoutLog.length + ' 세션</p>' +
        '</div>' +
        
        '<div class="bar-chart" style="height: 140px;">' + weekBarsHtml + '</div>' +
        
        '<div class="border-t pt-4 mt-5">' +
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-3">부위별 분배</p>' +
          partsHtml +
        '</div>' +
      '</div>' +
      
      // 단백질 달성 (지난 7일)
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">단백질 (지난 7일)</p>' +
          '<p class="text-xs font-mono accent">평균 ' + avgProtein + 'g</p>' +
        '</div>' +
        
        '<div class="bar-chart" style="height: 100px;">' + proteinBarsHtml + '</div>' +
        
        '<div class="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">' +
          '<div>' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase mb-1">평균</p>' +
            '<p class="font-bebas text-xl">' + avgProtein + '<span class="text-[10px] text-stone-500">g</span></p>' +
          '</div>' +
          '<div>' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase mb-1">최고</p>' +
            '<p class="font-bebas text-xl">' + (proteinDays.length > 0 ? Math.max.apply(null, proteinDays.map(function(p) { return p.protein; })) : 0) + '<span class="text-[10px] text-stone-500">g</span></p>' +
          '</div>' +
          '<div>' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase mb-1">달성</p>' +
            '<p class="font-bebas text-xl accent">' + proteinDays.filter(function(p) { return p.protein >= profile.proteinTarget; }).length + '<span class="text-[10px] text-stone-500">/7</span></p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      // PR 히스토리
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">PR 히스토리</p>' +
          '<p class="text-xs font-mono accent">' + personalRecords.length + '개</p>' +
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
          '<p class="text-[10px] font-mono text-stone-500 mb-3">클릭하여 상세 보기 / 삭제</p>' +
          '<div>' +
            workoutLog.slice(-10).reverse().map(function(w) {
              var d = new Date(w.date);
              var dStr = ['일','월','화','수','목','금','토'][d.getDay()];
              return '<div class="workout-history-row" onclick="openItemDetail(\'workout\', \'' + (w.startTime || w.id) + '\')">' +
                '<div class="flex items-center gap-3">' +
                  '<div class="workout-history-dot"></div>' +
                  '<div>' +
                    '<p class="text-xs font-display font-bold">' + (w.sessionKr || w.sessionName) + '</p>' +
                    '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + w.date + ' (' + dStr + ') · ' + (w.duration || 0) + '분 · ' + (w.sets || 0) + '세트</p>' +
                  '</div>' +
                '</div>' +
                '<div style="color: #6b7a99;">' + icon('chevron', 14) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          (workoutLog.length > 10 ? '<p class="text-[10px] font-mono text-stone-500 text-center mt-2">최근 10개만 표시 (총 ' + workoutLog.length + '개)</p>' : '') +
        '</div>' : '') +
      
      // 체중 기록 (클릭하여 삭제 가능)
      ((state.data.bodyLog && state.data.bodyLog.length > 0) ? 
        '<div class="card mb-4">' +
          '<div class="flex items-center justify-between mb-3">' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">체중 기록</p>' +
            '<p class="text-xs font-mono accent">' + state.data.bodyLog.length + '개</p>' +
          '</div>' +
          '<p class="text-[10px] font-mono text-stone-500 mb-3">클릭하여 상세 보기 / 삭제</p>' +
          '<div>' +
            state.data.bodyLog.slice(-10).reverse().map(function(b) {
              return '<div class="workout-history-row" onclick="openItemDetail(\'body\', \'' + b.date + '\')">' +
                '<div class="flex items-center gap-3">' +
                  '<div class="workout-history-dot" style="background: #a78bfa; box-shadow: 0 0 6px rgba(167, 139, 250, 0.5);"></div>' +
                  '<div>' +
                    '<p class="text-xs font-display font-bold">' + b.weight + 'kg</p>' +
                    '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + b.date + '</p>' +
                  '</div>' +
                '</div>' +
                '<div style="color: #6b7a99;">' + icon('chevron', 14) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +
      
      // 사이클 진행
      '<div class="card">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3">현재 사이클</p>' +
        '<div class="flex items-baseline justify-between mb-3">' +
          '<p class="font-bebas text-3xl">Cycle ' + profile.currentCycle + '</p>' +
          '<p class="text-xs font-mono accent">' + profile.currentWeek + ' / 7 주</p>' +
        '</div>' +
        '<div class="progress-bg mb-2"><div class="progress-fill" style="width: ' + Math.round((profile.currentWeek / 7) * 100) + '%;"></div></div>' +
        '<p class="text-[10px] font-mono text-stone-500">' + profile.cyclePhase + ' · ' + (7 - profile.currentWeek) + '주 후 디로드</p>' +
      '</div>' +
      
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
        '<p class="text-xs text-stone-600 mt-2 leading-relaxed">다음 단계에서 구현됩니다</p>' +
      '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 탭바
// ═══════════════════════════════════════════════
function renderTabbar() {
  var tabs = [
    { id: 'home', label: 'HOME', iconName: 'home' },
    { id: 'workout', label: 'WORKOUT', iconName: 'dumbbell' },
    { id: 'fuel', label: 'FUEL', iconName: 'apple' },
    { id: 'stats', label: 'STATS', iconName: 'chart' },
    { id: 'more', label: 'MORE', iconName: 'more' }
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
  // 1RM 리스트 (최우선)
  if (state.oneRMListOpen) {
    document.getElementById('app').innerHTML = renderOneRMList();
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
  
  // 음식 입력 화면
  if (state.foodInputOpen) {
    document.getElementById('app').innerHTML = renderFoodInput();
    return;
  }
  
  // 완료 화면
  if (state.completedSession) {
    document.getElementById('app').innerHTML = renderWorkoutComplete();
    window.scrollTo(0, 0);
    return;
  }
  
  // 활성 세션이 있으면 세션 화면
  if (state.activeSession) {
    document.getElementById('app').innerHTML = renderWorkoutSession();
    return;
  }
  
  var content = '';
  switch (state.currentTab) {
    case 'home': content = renderHome(); break;
    case 'workout': content = renderWorkout(); break;
    case 'fuel': content = renderFuel(); break;
    case 'stats': content = renderStats(); break;
    case 'more': content = renderMore(); break;
  }
  
  // 항목 상세 시트 오버레이 (있을 시)
  var detailSheet = state.itemDetailSheet ? renderItemDetailSheet() : '';
  
  // 전체 초기화 확인 오버레이
  var resetOverlay = state.resetConfirming ? renderResetConfirm() : '';
  
  document.getElementById('app').innerHTML = content + renderTabbar() + detailSheet + resetOverlay;
  window.scrollTo(0, 0);
}

// 전체 초기화 확인 모달
function renderResetConfirm() {
  return '' +
    '<div class="sheet-overlay" onclick="cancelResetAll()">' +
      '<div class="sheet" onclick="event.stopPropagation()">' +
        '<div class="sheet-handle"></div>' +
        '<div class="text-center mb-4">' +
          '<div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>' +
          '<p class="font-display font-bold text-xl mb-2" style="color: #ef4444;">전체 데이터 삭제</p>' +
          '<p class="text-xs text-stone-400 leading-relaxed">' +
            '운동 기록, 영양 기록, 체중 기록, PR, 1RM,<br/>' +
            '코치 채팅 등 <strong style="color: #fbbf24;">모든 데이터</strong>가 영구 삭제됩니다.<br/>' +
            '이 작업은 되돌릴 수 없습니다.' +
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
window.setTab = function(tabId) {
  // 모든 탭 진입 시 데이터 강제 재로드 (삭제 즉시 반영 보장)
  state.data.workoutLog = storage.get(KEYS.WORKOUT_LOG) || [];
  state.data.nutritionLog = storage.get(KEYS.NUTRITION_LOG) || [];
  state.data.bodyLog = storage.get(KEYS.BODY_LOG) || [];
  state.data.personalRecords = storage.get(KEYS.PERSONAL_RECORDS) || [];
  console.log('[setTab] ' + tabId + ' - 운동:' + state.data.workoutLog.length + ' 영양:' + state.data.nutritionLog.length);

  // 운동 탭 진입 시 마법사는 이전 진행 단계를 그대로 유지 (저장된 state 복원됨)
  state.currentTab = tabId;
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
      showToast('✓ 설치 시작!');
    }
    deferredInstallPrompt = null;
  });
};

init();

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
    if (state.completedSession) return;
    if (state.foodInputOpen) return;
    if (state.itemDetailSheet) return;
    if (state.resetConfirming) return;

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
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(reg) {
        console.log('[PWA] Service Worker 등록 성공:', reg.scope);
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
  showToast('✓ 헬스앱 설치 완료');
});
