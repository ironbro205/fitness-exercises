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
        '<p class="text-sm font-display font-bold">' + escapeHtml(pr.exerciseName) + '</p>' +
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
      '</div>' +
      '<h1 class="font-bebas text-4xl">홈</h1>' +
    '</div>' +
    
    '<div class="px-5 pb-32">' +
      
      // 사이클 카드
      '<div class="card-accent mb-4">' +
        '<div class="relative">' +
          '<div class="flex items-baseline justify-between mb-1">' +
            '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">현재 단계</p>' +
            '<p class="text-xs font-mono accent">' + profile.currentWeek + '주차 / ' + CYCLE_LENGTH + '</p>' +
          '</div>' +
          '<div class="flex items-end justify-between mb-4">' +
            '<h2 class="font-bebas text-4xl">' + profile.cyclePhase + (isDeloadWeek ? '' : ' ' + profile.currentWeek + '주차') + '</h2>' +
            '<p class="text-xs text-stone-500 font-mono">' + phaseHint + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-1\\.5">' + weekDots + '</div>' +
          '<div class="flex items-center justify-between mt-2">' +
            '<p class="text-[10px] text-stone-600 font-mono uppercase">빌드 1~4주</p>' +
            '<p class="text-[10px] text-stone-600 font-mono uppercase">디로드</p>' +
          '</div>' +
          '<p class="text-[11px] font-mono mt-3 ' + (idleMsg ? 'text-amber-400' : 'text-stone-400') + '">' + cycleStatusLine + '</p>' +
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
          '<div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--bg-3);">' +
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
                '<div style="color: var(--text-muted);">' + icon('chevron', 14) + '</div>' +
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
              '<p class="font-bebas text-5xl" style="color: ' + ({S:'var(--accent)',A:'var(--accent)',B:'#a78bfa',C:'#fbbf24',D:'#ef4444'}[state.weeklyReview.grade] || '#a78bfa') + ';">' + state.weeklyReview.grade + '</p>' +
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
              '<p class="text-sm text-stone-200 leading-relaxed mb-2">' + escapeHtml(state.plateauCheck.primary_cause || '진행이 정체되고 있어요.') + '</p>' +
              '<p class="text-[11px] font-mono" style="color: #fbbf24;">분석 보기 →</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '') +
      
      // 정체기 경고 카드 끝 → 바로 컨테이너 닫힘 (코치/최근PR/빠른입력 제거: 묶음5)
      
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
    var countClass = count >= 2 ? 'done' : '';
    // '안 한 부위'(0회)는 은은한 중립으로 — 경고 노랑(zero 클래스)은 진짜 경고에만.
    var countStyle = count === 0 ? ' style="color: var(--text-faint);"' : '';
    
    return '<div class="' + cardClass + '" onclick="selectBodyPart(\'' + key + '\')">' +
      (isRecommended ? '<span class="recommend-badge">✨ 추천</span>' : '') +
      '<div class="body-part-header">' +
        '<p class="body-part-name' + (isRecommended ? ' recommended' : '') + '">' + name + '</p>' +
        '<div class="body-part-count">' +
          '<p class="body-part-count-num ' + countClass + '"' + countStyle + '>' + count + '</p>' +
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
      '</div>' +
      
      // 부위 선택
      '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-3 px-1">오늘 어느 부위를 할까요?</p>' +
      
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
    var partKor = { push: '가슴/어깨/삼두', pull: '등/이두', legs: '하체/코어', upper: '가슴/등/어깨/팔', free: '자유' };
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
    return '<div class="px-5 pt-12 text-center"><p class="text-sm text-stone-400">루틴이 없습니다</p>' +
      '<button onclick="backToStep1()" class="text-xs accent mt-4">처음으로</button></div>';
  }
  
  var partNames = { push: 'PUSH', pull: 'PULL', legs: 'LEGS', upper: 'UPPER', free: 'FREE' };
  var partName = partNames[state.selectedBodyPart] || routine.bodyPart || '';
  
  // 미리보기 - 종목 리스트
  var previewExHtml = '';
  if (state.routinePreviewExpanded) {
    routine.exercises.forEach(function(ex, idx) {
      var weight = ex.weight ? ex.weight + 'kg × ' : '';
      previewExHtml += 
        '<div class="routine-preview-ex">' +
          '<span class="flex-1"><strong>' + (idx + 1) + '. ' + escapeHtml(ex.name) + '</strong></span>' +
          '<span class="text-stone-400 font-mono text-[10px]">' + weight + ex.reps + ' · ' + ex.sets + '세트</span>' +
        '</div>';
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
        } else if (msg.approvalStatus === 'superseded') {
          actionHtml =
            '<div class="change-approval-actions" style="grid-template-columns: 1fr;">' +
              '<button class="change-approval-btn cancel" style="pointer-events: none; opacity: 0.6;">최신 제안으로 대체됨</button>' +
            '</div>';
        }
        
        var cardLabel = hasChanges ? '✨ 제안된 변경사항' : '✨ 새 루틴 준비됨';
        changesHtml = '<div class="routine-change-card">' +
          '<p class="text-[10px] font-mono accent uppercase tracking-widest mb-1\\.5">' + cardLabel + '</p>' +
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
              '<p class="text-xs font-display font-bold">' + (isEmpty ? '아직 종목이 없어요' : escapeHtml(routine.headline)) + '</p>' +
              '<p class="text-[10px] font-mono text-stone-500">' + (isEmpty ? '대화로 종목을 추가해주세요' : exCount + '개 종목 · ' + routine.totalSets + '세트 · ' + routine.duration + '분' + (routine.wasModified ? ' · ✨수정됨' : '')) + '</p>' +
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
            '<input type="text" id="rc-input" placeholder="' + (state.apiKey ? (isFree ? '원하는 운동을 말해주세요...' : '수정 요청...') : 'API 키 필요') + '" value="' + escapeHtml(state.routineChatInput) + '" oninput="updateRoutineChatInput(this.value)" onkeydown="if(event.key===\'Enter\') sendRoutineModification()" ' + (state.routineChatThinking ? 'disabled' : '') + ' />' +
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
    // 가드레일 + 추천 일치: 세트 시작 무게·횟수를 추천 카드와 같은 계산(getSessionSetPlan)으로.
    // (AI 무게를 따로 스냅하면 "5kg 유지" 카드 옆 세트가 6kg로 어긋나는 문제 방지)
    var plan = getSessionSetPlan(ex.name, ex.weight, ex.reps || '8-12');

    // 워밍업 1세트 (메인 종목만)
    if (ex.isMain) {
      sets.push({
        weight: plan.weight ? snapWeightToEquipment(plan.weight * 0.5, ex.name) : null,
        reps: 10,
        completed: false,
        isWarmup: true
      });
    }

    // 본 세트
    for (var s = 0; s < (ex.sets || 3); s++) {
      sets.push({
        weight: plan.weight,
        reps: plan.reps,
        completed: false,
        isWarmup: false
      });
    }

    return {
      name: ex.name,
      type: ex.type || '보조',
      rest: ex.rest,
      sets: sets,
      reps: ex.reps,
      targetReps: repRangeToStr(plan.repRange),  // 세션 화면에서 사용 (클래스 범위로 교정됨)
      lastWeight: (plan.prog && plan.prog.previousWeight !== undefined) ? plan.prog.previousWeight : (ex.weight !== undefined ? ex.weight : null),
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
  var partNames = { push: 'PUSH', pull: 'PULL', legs: 'LEGS', upper: 'UPPER', free: 'FREE' };
  var partKor = { push: '가슴 · 어깨 · 삼두', pull: '등 · 이두', legs: '하체 · 코어', upper: '가슴 · 등 · 어깨 · 팔', free: '자유 구성' };
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
              '<p class="routine-ex-name">' + escapeHtml(ex.name) + typeTag + '</p>' +
              '<p class="routine-ex-type">' + escapeHtml(ex.type) + (ex.note ? ' · ' + escapeHtml(ex.note) : '') + '</p>' +
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
          (ex.rest ? (
            '<div class="routine-ex-stat">' +
              '<p class="routine-ex-stat-label">휴식</p>' +
              '<p class="routine-ex-stat-value regular">' + String(ex.rest).split('-').map(function(x){ var m = parseInt(x, 10) / 60; return (m % 1 === 0) ? m : Math.round(m * 10) / 10; }).join('-') + '분</p>' +
            '</div>'
          ) : '') +
        '</div>' +
      '</div>';
  });
  
  return headerHtml +
    
    // 분석 헤더 카드
    '<div class="routine-analysis-card">' +
      '<div class="flex items-center justify-between mb-2 relative">' +
        '<div class="flex items-center gap-2">' +
          '<span class="ai-badge">✨ AI 분석 완료</span>' +
          '' +
        '</div>' +
        '<button onclick="regenerateRoutine()" style="color: var(--accent); opacity: 0.6;" title="다시 분석">' + icon('refresh', 14) + '</button>' +
      '</div>' +
      '<p class="font-bebas text-4xl mb-1 relative" style="color: var(--accent);">' + partNames[part] + '</p>' +
      '<p class="text-sm text-stone-300 leading-relaxed mb-1 relative">' + escapeHtml(routine.headline) + '</p>' +
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
        '<p class="routine-insight-label accent">왜 이렇게 구성했나</p>' +
        '<p class="text-sm text-stone-200 leading-relaxed">' + escapeHtml(routine.reason) + '</p>' +
      '</div>' : '') +
    
    (routine.caution ? 
      '<div class="routine-insight warning">' +
        '<p class="routine-insight-label" style="color: #fbbf24;">⚠️ 주의사항</p>' +
        '<p class="text-sm text-stone-200 leading-relaxed">' + escapeHtml(routine.caution) + '</p>' +
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
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2">종목 기록</p>' +
          exercisesList +
        '</div>' : '');
        
  } else if (type === 'body') {
    headerLabel = '체중 기록';
    bodyHtml = 
      '<div class="text-center mb-5">' +
        '<p class="font-bebas text-5xl mb-1" style="color: var(--accent);">' + data.weight + '<span class="text-lg text-stone-400">kg</span></p>' +
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
    // 가드레일 + 추천 일치: 템플릿 세트도 추천 카드와 같은 계산(getSessionSetPlan)으로
    var plan = getSessionSetPlan(ex.name, ex.lastWeight, ex.reps || '8-10');
    // 워밍업 1세트 + 본 세트 3개
    sets.push({
      weight: plan.weight ? snapWeightToEquipment(plan.weight * 0.5, ex.name) : null,
      reps: 10,
      isWarmup: true,
      completed: false
    });
    for (var i = 0; i < ex.sets; i++) {
      sets.push({
        weight: plan.weight,
        reps: plan.reps,
        isWarmup: false,
        completed: false
      });
    }
    return {
      name: ex.name,
      type: ex.type,
      targetReps: repRangeToStr(plan.repRange),
      lastWeight: (plan.prog && plan.prog.previousWeight !== undefined) ? plan.prog.previousWeight : ex.lastWeight,
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
    showConfirm('운동을 취소할까요?\n기록이 저장되지 않습니다.', cancelSession, { confirmLabel: '운동 취소', danger: true });
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

  // ── 1RM rolling max 보정 (이번 세션 종목들; 상승 즉시·하락 느리게) ──
  reconcile1RMFromLog(exercisesDone.map(function(e) { return e.name; }));

  // ── 사이클/주차 자동 진행 (그 주 목표 운동 완료 기준, 날짜로 안 넘김) ──
  advanceCycleIfWeekComplete();

  // 완료 화면용 데이터 저장
  state._celebratePending = true; // 6-C① 축하 연출은 완료 첫 진입 1회만(평점 탭 재렌더 시 반복 방지)
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
  var working = exercise.sets.filter(function(s) { return !s.isWarmup; });
  var lastSet = working.length ? working[working.length - 1] : exercise.sets[exercise.sets.length - 1];
  exercise.sets.push({
    weight: lastSet ? lastSet.weight : null,
    reps: lastSet ? lastSet.reps : (clampRepsToClass(exercise.name, exercise.targetReps).low),
    isWarmup: false,
    completed: false
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
  if (!set.isWarmup && set.weight && set.reps) {
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

  // 휴식 시간 결정: AI가 지정한 rest(초) 우선, 없으면 복합/고립 기본값 (B안)
  var isCompound = ['프레스', '풀업', '랫풀다운', '로우', '스쿼트', '데드리프트', '레그 프레스', '핵 스쿼트'].some(function(k) {
    return exercise.name.indexOf(k) !== -1;
  });
  var aiRest = exercise.rest ? parseInt(String(exercise.rest), 10) : NaN; // 범위 "120-180"이면 하단 120초
  var restDuration = set.isWarmup ? 60 : ((!isNaN(aiRest) && aiRest > 0) ? aiRest : (isCompound ? 150 : 90));

  state.restTimer = {
    startTime: Date.now(),
    duration: restDuration,
    exerciseIdx: s.exerciseIdx,
    setIdx: s.setIdx
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
      render();
      return;
    }
    // 시트(편집/종목변경)가 열려 있으면 시트가 깜빡이지 않도록 타이머만 부분 갱신
    if (state.editingSet || state.exerciseSwapOpen) {
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
    var cur = state.activeSession.currentExerciseIdx;
    state._exSwipeDir = (idx === cur) ? null : (idx > cur ? 'next' : 'prev'); // 6-C② 들어오는 카드 방향
    state.activeSession.currentExerciseIdx = idx;
    saveActiveSession();
    render();
    state._exSwipeDir = null; // 1회만(다음 tick 재렌더에서 반복 안 되도록)
  }
};

// 운동 중 현재 종목을 다른 종목으로 교체
window.openExerciseSwap = function() {
  state.exerciseSwapOpen = true;
  state._swapQuery = '';
  render();
};

window.closeExerciseSwap = function() {
  state.exerciseSwapOpen = false;
  state._swapQuery = '';
  render();
};

// 교체 후보 목록 HTML. 검색어 없음 = 같은 부위(기존 동작), 검색어 있음 = 전체 종목 검색.
// 등록 안 된 이름은 "그대로 추가" 카드로 자유 교체 허용.
function buildSwapListHtml(query) {
  var session = state.activeSession;
  if (!session) return '';
  var exercise = session.exercises[session.currentExerciseIdx];
  if (!exercise) return '';
  var curInfo = EXERCISE_BODY_PART_MAP[exercise.name] || getExercisePart(exercise.name);
  var primary = curInfo ? curInfo.primary : null;
  var compound = curInfo ? curInfo.compound : null;

  var norm = function(s) { return String(s).replace(/\s+/g, '').toLowerCase(); };
  var q = String(query || '').trim();
  var nq = norm(q);

  var candidates;
  if (!nq) {
    // 같은 primary 부위의 다른 종목 — compound 일치 우선 정렬 (기존 동작)
    candidates = (primary ? (EXERCISES_BY_PRIMARY[primary] || []) : [])
      .filter(function(name) { return name !== exercise.name; })
      .sort(function(a, b) {
        var ai = EXERCISE_BODY_PART_MAP[a].compound === compound ? 0 : 1;
        var bi = EXERCISE_BODY_PART_MAP[b].compound === compound ? 0 : 1;
        return ai - bi;
      });
  } else {
    // 전체 종목에서 검색 (공백 무시 부분일치), 같은 부위 우선
    candidates = Object.keys(EXERCISE_BODY_PART_MAP)
      .filter(function(name) { return name !== exercise.name && norm(name).indexOf(nq) !== -1; })
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

  var listHtml = candidates.map(function(name) {
    var info = EXERCISE_BODY_PART_MAP[name];
    var tag = info && info.compound ? '복합' : '고립';
    var part = partKr(name);
    var prog = getProgressiveRecommendation(name, exercise.targetReps);
    var hint = prog && prog.previousWeight !== undefined
      ? '지난 ' + prog.previousWeight + 'kg → ' + prog.weight + 'kg'
      : (prog ? prog.weight + 'kg (1RM 추정)' : '무게 미정');
    return '<button class="option-card" style="width: 100%; margin-bottom: 6px; text-align: left;" onclick="swapCurrentExercise(\'' + name.replace(/'/g, "\\'") + '\')">' +
      '<div class="flex items-center justify-between gap-2">' +
        '<div>' +
          '<p class="font-display text-sm">' + name + '</p>' +
          '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + (nq && part ? part + ' · ' : '') + tag + ' · ' + hint + '</p>' +
        '</div>' +
        '<span class="text-xs accent">교체 →</span>' +
      '</div>' +
    '</button>';
  }).join('');

  // 등록 안 된 이름 → 입력한 그대로 추가 허용
  // XSS 방지: 사용자 입력을 onclick 문자열에 넣지 않고 전역 state에서 직접 읽는다
  if (q && !EXERCISE_BODY_PART_MAP[q]) {
    listHtml +=
      '<button class="option-card" style="width: 100%; margin-bottom: 6px; text-align: left; border-style: dashed;" onclick="swapCurrentExercise(String(state._swapQuery || \'\').trim())">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div>' +
            '<p class="font-display text-sm">“' + escapeHtml(q) + '”</p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">목록에 없는 종목 — 이 이름 그대로 교체</p>' +
          '</div>' +
          '<span class="text-xs accent">추가 →</span>' +
        '</div>' +
      '</button>';
  }

  if (!listHtml) {
    listHtml = '<p class="text-xs text-stone-500 text-center py-4">교체 가능한 종목이 없어요. 검색해서 전체 종목에서 찾아보세요.</p>';
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
  // 종목명/타입 갱신 (정확 매칭 없으면 fuzzy)
  var info = EXERCISE_BODY_PART_MAP[newName] || getExercisePart(newName);
  ex.name = newName;
  if (info) {
    ex.type = info.compound ? '복합' : '고립';
  }

  // 목표 반복 교정 + 미완료 세트의 무게/횟수를 새 종목 기준으로 재추천 (추천 카드와 동일 계산)
  var plan = getSessionSetPlan(newName, null, ex.targetReps);
  ex.targetReps = repRangeToStr(plan.repRange);
  if (plan.weight) {
    (ex.sets || []).forEach(function(s) {
      if (s.completed) return;
      s.weight = plan.weight;
      if (!s.isWarmup) s.reps = plan.reps;
    });
    ex.lastWeight = (plan.prog && plan.prog.previousWeight !== undefined) ? plan.prog.previousWeight : null;
  } else {
    ex.lastWeight = null;
  }

  state.exerciseSwapOpen = false;
  saveActiveSession();
  render();

  // 부상 대조 경고 (막지는 않음 — 사용자 선택 존중)
  var safety = checkExerciseSafety(newName);
  if (safety.level === 'contra') {
    showToast('⚠️ ' + INJURY_AREAS[safety.area].kr + ' 부상 등록됨 — 이 종목은 금기예요' + (safety.sub ? ' (대체: ' + safety.sub + ')' : ''));
  } else if (safety.level === 'caution') {
    showToast('⚠️ ' + INJURY_AREAS[safety.area].kr + ' 주의: ' + (safety.mod || '가볍게, 통증 없는 범위로'));
  }
}

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

    // 6-C② 원형 링: 남은 시간만큼 둘레가 차 있음 (r=18 → 둘레 ≈ 113.1, 1초 단위 갱신)
    var ringCirc = 113.1;
    var restProgress = state.restTimer.duration > 0 ? (restRemaining / state.restTimer.duration) : 0;
    var ringOffset = (ringCirc * (1 - restProgress)).toFixed(1);

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
    swapSheetHtml =
      '<div class="sheet-overlay" onclick="closeExerciseSwap()">' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div class="sheet-handle"></div>' +
          '<div class="flex items-center justify-between mb-3">' +
            '<div>' +
              '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">종목 변경</p>' +
              '<p class="font-bebas text-2xl mt-1">' + escapeHtml(exercise.name) + '</p>' +
            '</div>' +
            '<button class="session-header-btn" onclick="closeExerciseSwap()">' + icon('close', 18) + '</button>' +
          '</div>' +
          '<input id="swap-search" type="search" placeholder="종목 검색 — 모든 부위에서 찾기" ' +
            'value="' + escapeHtml(state._swapQuery || '') + '" ' +
            'oninput="updateSwapSearch(this.value)" onclick="event.stopPropagation()" ' +
            'style="width:100%; padding:10px 12px; margin-bottom:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:inherit; font-size:14px; outline:none;" />' +
          '<p class="text-xs font-mono text-stone-400 mb-3">검색 없이는 같은 부위 종목을 보여줘요. 검색하면 전체 종목에서 찾고, 없는 종목은 이름 그대로 추가할 수 있어요.</p>' +
          '<div id="swap-list" style="max-height: 48vh; overflow-y: auto; padding-right: 4px;">' +
            buildSwapListHtml(state._swapQuery || '') +
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
              '<p>무게</p>' +
              '<p>kg</p>' +
            '</div>' +
            '<div class="number-display" onclick="enterEditMode(\'weight\')">' +
              '<p id="sheet-weight-value">' + (set.weight !== null ? set.weight : 0) + '</p>' +
              '<input id="sheet-weight-input" class="number-input" type="number" inputmode="decimal" step="' + getWeightIncrement(ex.name) + '" min="0" style="display:none;" onclick="event.stopPropagation()" onblur="commitEdit(\'weight\')" onkeydown="if(event.key===\'Enter\')this.blur()" />' +
            '</div>' +
            // 조절 버튼 = 종목 장비 단위 (덤벨 ±2/±4, 그 외 ±5/±10). 1칸 = getWeightIncrement
            (function(inc) {
              return '<div class="adj-grid">' +
                '<button class="adj-btn" onclick="adjustWeight(' + (-2 * inc) + ')">−' + (2 * inc) + '</button>' +
                '<button class="adj-btn" onclick="adjustWeight(' + (-inc) + ')">−' + inc + '</button>' +
                '<button class="adj-btn" onclick="adjustWeight(' + inc + ')">+' + inc + '</button>' +
                '<button class="adj-btn accent-btn" onclick="adjustWeight(' + (2 * inc) + ')">+' + (2 * inc) + '</button>' +
              '</div>';
            })(getWeightIncrement(ex.name)) +
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
            '<button class="adj-btn" style="flex:1; color: #f87171;" onclick="deleteSet()">세트 삭제</button>' +
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
    if (dotDone) {
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
    
    '<div class="px-5' + (state._exSwipeDir ? ' ex-slide-' + state._exSwipeDir : '') + '" style="padding-bottom: ' + (state.restTimer ? '180px' : '120px') + ';">' +

      // 현재 종목 정보
      '<div class="exercise-info-card">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-1">현재 종목</p>' +
        '<h2 class="font-bebas text-2xl mb-1">' + escapeHtml(exercise.name) + '</h2>' +
        '<p class="text-xs font-mono text-stone-400">' + exercise.type + '</p>' +
      '</div>' +
      
      // 이전 기록
      // 지난 기록 + 다음 추천 카드 (점진적 과부하)
      (function() {
        var prog = getProgressiveRecommendation(exercise.name, exercise.targetReps);
        var rm = get1RM(exercise.name);
        // 새 카드가 같은 정보를 더 정확히 보여주므로, prog가 실 수행 기록이면 옛 prev-record는 생략
        var fallbackPrevHtml = (!prog || prog.source === 'rm_estimate')
          ? '<div class="prev-record">' +
              '<div class="flex items-center gap-2" style="color: var(--text-muted);">' +
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
          var color = prog.source === 'progress' ? '#10b981' : 'var(--accent)';
          var label = prog.source === 'progress' ? '🎯 도전 권장'
            : prog.source === 'rehab' ? '🩹 재활 — 무게 유지'
            : prog.painGated ? '⚠️ 통증 기록 — 증량 보류'
            : '🔁 동일 무게';
          html +=
            '<div class="flex items-center justify-between mb-2">' +
              '<p class="text-[10px] font-mono uppercase tracking-widest text-stone-400">지난 기록</p>' +
              '<p class="font-mono text-xs text-stone-300">' + prog.previousWeight + 'kg × ' + prevRepsStr + '</p>' +
            '</div>' +
            '<div class="flex items-center justify-between pt-3 border-t" style="border-color: rgba(var(--accent-rgb), 0.15);">' +
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
        '<button class="option-card" style="width: 100%; margin-top: 8px; text-align: center;" onclick="addSetToExercise(' + session.currentExerciseIdx + ')">' +
          '<p class="text-xs font-mono text-stone-400">＋ 세트 추가</p>' +
        '</button>' +
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
    var weightStr = ex.maxWeight !== null ? (ex.maxWeight + 'kg') : '';
    var detail = weightStr ? (weightStr + ' × ' + repsStr) : (repsStr + '회');
    
    exerciseSummary += 
      '<div class="exercise-summary-row">' +
        '<div class="flex items-center gap-3">' +
          '<div class="ex-num" style="width: 30px; height: 30px; font-size: 10px;">' + String(i+1).padStart(2,'0') + '</div>' +
          '<div>' +
            '<p class="text-sm font-display font-bold">' + escapeHtml(ex.name) + '</p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + detail + '</p>' +
          '</div>' +
        '</div>' +
        (hasPR ? '<span class="pr-tag">PR</span>' : '') +
      '</div>';
  }
  // 6-C① 축하 연출은 완료 첫 진입 1회만 (평점 탭 등 재렌더 시 컨페티/팝 반복 방지)
  var celebrate = !!state._celebratePending;
  state._celebratePending = false;

  // 컨페티(색종이) — reduced-motion에서는 CSS가 숨김
  var confettiHtml = '';
  if (celebrate) {
    var confettiColors = ['var(--accent)', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'];
    confettiHtml = '<div class="confetti-layer" aria-hidden="true">';
    for (var ci = 0; ci < 16; ci++) {
      confettiHtml +=
        '<span class="confetti-piece" style="left:' + Math.round(Math.random() * 100) + '%;' +
        ' background:' + confettiColors[ci % confettiColors.length] + ';' +
        ' animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;' +
        ' animation-duration:' + (1.2 + Math.random() * 0.8).toFixed(2) + 's;"></span>';
    }
    confettiHtml += '</div>';
  }
  var completeIconClass = celebrate ? 'complete-icon pop-in' : 'complete-icon';
  var completeListClass = celebrate ? 'px-5 pb-32 complete-celebrate-list' : 'px-5 pb-32';

  return confettiHtml +
    // 축하 헤더
    '<div class="px-5 pt-12 pb-5 text-center">' +
      '<div class="' + completeIconClass + '">' + icon('check', 28) + '</div>' +
      '<p class="text-xs uppercase accent font-mono mb-2" style="letter-spacing: 0.3em;">WORKOUT COMPLETE</p>' +
      '<h1 class="font-bebas text-5xl">완료!</h1>' +
      '<p class="text-sm text-stone-400 mt-2">' + cs.sessionName + ' · ' + dateStr + '</p>' +
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
      
      // 액션 버튼
      '<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 8px;">' +
        '<button class="complete-action-btn complete-primary" onclick="goHome()">홈으로</button>' +
        '<button class="complete-action-btn complete-secondary" onclick="goToWorkout()">기록 자세히 보기</button>' +
      '</div>' +
      
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
    if (!confirm('"sk-ant-"로 시작하지 않습니다. 그래도 저장하시겠습니까?')) return;
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
// 프로필 수정 모달 (묶음1): 기본(나이·키·체중) + 목표(단백질·칼로리·운동빈도)
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
        ' value="' + (e[key] != null ? e[key] : '') + '"' +
        ' oninput="updateProfileEditField(\'' + key + '\', this.value)" />' +
    '</div>';
  }
  return '<div class="manual-input-overlay" onclick="closeProfileEditModal()">' +
    '<div class="manual-input-sheet" onclick="event.stopPropagation()">' +
      '<div class="sheet-handle"></div>' +
      '<div class="flex items-center justify-between mb-5">' +
        '<div>' +
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">내 정보</p>' +
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
      var w75 = snapWeightToEquipment(rm * 0.75, name);
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
              '<p class="text-[10px] font-mono text-stone-400 leading-relaxed mt-1">최근 몇 번의 운동 중 최고 기록으로 추적해요. 신기록은 바로 반영, 한동안 못 들면 천천히 내려갑니다. 한 번의 컨디션 난조로 폭락하지 않아요. (Epley 공식)</p>' +
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
  
  showToast('✓ 모든 데이터 삭제 완료');
  setTimeout(function() {
    location.reload();
  }, 1000);
};

// 백업/내보내기 (복원 가능한 JSON 파일)
window.exportData = function() {
  var json = JSON.stringify(buildBackupObject(), null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'fitness-backup-' + getTodayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('백업 파일을 저장했어요');
};

// 가져오기: 파일 선택 → 복원 → 새로고침. (운동 데이터만 복원; API키·대화는 미포함)
window.openBackupImport = function() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var res = restoreFromBackup(ev.target.result);
      if (res.ok) {
        showToast('복원 완료 — 새로고침합니다');
        setTimeout(function() { location.reload(); }, 1000);
      } else {
        alert('복원 실패: ' + (res.error || '알 수 없는 오류'));
      }
    };
    reader.onerror = function() { alert('파일을 읽지 못했습니다.'); };
    reader.readAsText(file);
  };
  input.click();
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
              '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">AI 코치·루틴</p>' +
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
                '<p class="text-xs text-stone-300 leading-relaxed">AI 코치 채팅·루틴 생성·주간 리뷰·정체기 분석에 Anthropic Claude를 씁니다. 본인 키를 넣어 직접 사용하며, 없으면 해당 AI 기능만 비활성화됩니다.</p>' +
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
      
      // 프로필 카드 (탭하면 수정 모달)
      '<div class="more-profile-card" onclick="openProfileEditModal()" style="cursor: pointer;">' +
        '<div class="flex items-center gap-3">' +
          '<div class="flex-1">' +
            '<p class="font-display font-bold text-base">사용자</p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-1">' + profile.age + '세 · ' + profile.height + 'cm · ' + profile.weight + 'kg</p>' +
            '<div class="flex items-center gap-2 mt-1">' +
              '<span class="text-[10px] font-mono text-stone-500">주 ' + (profile.workoutFreq || 4) + '회 운동</span>' +
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
      
      // AI 코칭 ⭐ 핵심
      '<div>' +
        '<p class="section-label">AI 코칭</p>' +
        '<div class="section-group">' +
          '<div class="menu-row" onclick="openApiKeyModal()">' +
            '<div class="menu-icon-sm accent-bg-soft">' + icon('key', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">Anthropic API 키</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + 
                (apiKey ? maskApiKey(apiKey) : 'AI 코치·맞춤 루틴·주간 리뷰 켜기') +
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
          // 기억 노트 (API 키 없어도 직접 추가 가능)
          '<div class="menu-row" onclick="openCoachMemory()">' +
            '<div class="menu-icon-sm accent-bg-soft">' + icon('msg', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">기억 노트</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">코치가 기억할 부상·선호·목표·일정</p>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
              '<p class="text-[10px] font-mono text-stone-500">' + (state.coachMemory ? state.coachMemory.length : 0) + '개</p>' +
              '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
            '</div>' +
          '</div>' +
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
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">Cycle ' + profile.currentCycle + ' · ' + profile.cyclePhase + ' · ' + profile.currentWeek + '/' + CYCLE_LENGTH + '주</p>' +
            '</div>' +
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
              '<p class="text-sm font-display font-bold" style="color: var(--accent);">홈 화면에 설치</p>' +
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
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">운동 데이터 백업 파일 (.json)</p>' +
            '</div>' +
            '<div class="menu-arrow">' + icon('chevron', 16) + '</div>' +
          '</div>' +
          '<div class="menu-row" onclick="openBackupImport()">' +
            '<div class="menu-icon-sm">' + icon('upload', 18) + '</div>' +
            '<div class="menu-row-content">' +
              '<p class="text-sm font-display font-bold">가져오기</p>' +
              '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">백업 파일에서 복원</p>' +
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
      
      // 푸터
      '<div class="app-footer">' +
        '<p class="app-footer-brand">FITNESS</p>' +
        '<p class="text-[10px] font-mono text-stone-600 mt-1">Personal fitness tracker</p>' +
        '<p class="text-[10px] font-mono text-stone-600 mt-0\\.5">버전 ' + APP_VERSION + '</p>' +
      '</div>' +
      
    '</div>' +

    apiModalHtml +
    renderProfileEditModal();
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
    var greeting = '안녕하세요, 개인 코치예요.\n\n' +
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
            '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">정말 삭제할까요?</p></div>' +
          '<div style="display:flex; gap:6px;">' +
            '<button onclick="cancelMemoryDelete()" style="padding:6px 12px; border-radius:10px; background:transparent; border:1px solid var(--bg-4); color:var(--text-soft); font-size:12px;">취소</button>' +
            '<button class="btn-danger" style="padding:6px 12px; width:auto;" onclick="executeDeleteMemory(\'' + m.id + '\')">삭제</button>' +
          '</div>' +
        '</div>';
      }
      var srcBadge = m.source === 'auto'
        ? '<span class="accent">자동</span>'
        : '<span class="text-stone-500">직접</span>';
      return '<div class="menu-row">' +
        '<div class="flex-1" onclick="editMemoryNote(\'' + m.id + '\')" style="cursor:pointer;">' +
          '<p class="text-sm">' + escapeHtml(m.text) + '</p>' +
          '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + srcBadge + ' · ' + (m.date || '') + ' · 탭하여 수정</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="deleteMemoryNote(\'' + m.id + '\')">' + icon('trash', 16) + '</button>' +
      '</div>';
    }).join('');
    groups += '<p class="section-label">' + meta.emoji + ' ' + meta.kr + '</p><div class="section-group" style="margin-bottom:16px;">' + rows + '</div>';
  });
  if (!groups) {
    groups = '<p class="text-sm text-stone-500 text-center" style="padding:40px 0; line-height:1.6;">아직 기억 노트가 없어요.<br>아래에서 직접 추가해 주세요 (부상·제약·선호 등).</p>';
  }

  var chips = MEMORY_CATEGORIES.map(function(cat) {
    var meta = MEMORY_CATEGORY_META[cat];
    var on = state.coachMemoryCategory === cat;
    var style = 'padding:5px 10px; border-radius:999px; font-size:11px; font-family:monospace; cursor:pointer; border:1px solid ' +
      (on ? 'var(--accent)' : 'var(--bg-4)') + '; background:' + (on ? 'rgba(var(--accent-rgb),0.15)' : 'transparent') + '; color:' + (on ? 'var(--accent)' : 'var(--text-soft)') + ';';
    return '<button style="' + style + '" onclick="setMemoryCategory(\'' + cat + '\')">' + meta.emoji + ' ' + meta.kr + '</button>';
  }).join('');

  return '<div class="review-detail-screen">' +
    '<div class="coach-header">' +
      '<button class="session-header-btn" onclick="closeCoachMemory()">' + icon('close', 18) + '</button>' +
      '<div class="coach-header-info"><p class="text-sm font-display font-bold">기억 노트</p>' +
        '<p class="text-[10px] font-mono text-stone-500">총 ' + notes.length + '개 · 코치가 참고해요</p></div>' +
      '<div style="width:36px;"></div>' +
    '</div>' +
    '<div class="px-5 pt-5" style="padding-bottom:160px;">' + groups + '</div>' +
    '<div style="position:fixed; left:0; right:0; bottom:0; padding:12px 16px calc(14px + env(safe-area-inset-bottom)); background:var(--bg-0); border-top:1px solid var(--bg-3); z-index:50;">' +
      '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">' + chips + '</div>' +
      '<div style="display:flex; gap:8px;">' +
        '<input type="text" id="memory-input" class="api-key-input" style="flex:1;" placeholder="' + (state.coachMemoryEditingId ? '수정 내용...' : '기억할 내용 추가...') + '" value="' + escapeHtml(state.coachMemoryInput || '') + '" oninput="updateMemoryInput(this.value)" onkeydown="if(event.key===\'Enter\'){saveMemoryNote();}" />' +
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
            '<p class="text-[10px] font-mono text-stone-500"><span class="coach-online-dot"></span> ' + (hasApiKey ? '온라인' : 'API 키 필요') + '</p>' +
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
          '<input type="text" id="coach-chat-input" placeholder="' + (hasApiKey ? '코치에게 물어보기...' : 'API 키 설정 후 사용 가능') + '" value="' + escapeHtml(state.coachInputText) + '" oninput="updateCoachInput(this.value)" onkeydown="if(event.key===\'Enter\') sendCoachMessage()" ' + (state.coachThinking ? 'disabled' : '') + ' />' +
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
  var gradeColors = { 'S': '#F68460', 'A': '#F68460', 'B': '#a78bfa', 'C': '#fbbf24', 'D': '#ef4444' };
  var gradeColor = gradeColors[review.grade] || '#a78bfa';
  
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
      '<div class="review-bullet-dot" style="background: #fbbf24;"></div>' +
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
            '<p class="text-[10px] font-mono text-stone-500">' + review.monday + ' ~ ' + review.sunday + '</p>' +
          '</div>' +
        '</div>' +
        '<button class="session-header-btn" onclick="refreshWeeklyReview()" title="다시 분석">' + icon('refresh', 16) + '</button>' +
      '</div>' +
      
      '<div class="px-5 pt-5 pb-20">' +
        
        // 등급 + 헤드라인
        '<div class="text-center mb-6">' +
          '<div style="display: inline-block; font-family: var(--font); font-weight: 800; font-size: 80px; line-height: 1; color: ' + gradeColor + '; text-shadow: 0 0 30px ' + gradeColor + '40;">' + review.grade + '</div>' +
          '<p class="text-xs font-mono text-stone-500 uppercase tracking-widest mt-1 mb-3">이번 주 평가</p>' +
          '<p class="text-base font-display font-bold leading-relaxed">' + escapeHtml(review.headline) + '</p>' +
        '</div>' +
        
        // 통계 요약
        '<div class="grid grid-cols-2 gap-3 mb-5">' +
          '<div class="stat-mini-card">' +
            '<p class="stat-mini-label">운동</p>' +
            '<p class="stat-mini-value">' + review.stats.workoutCount + '<span class="stat-mini-unit">회</span></p>' +
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
              '<p class="text-[10px] font-mono text-stone-400 mt-0\\.5">개선 전략 짜기</p>' +
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
  
  // 신호 라벨
  var signalLabels = {
    'pr_stalled': '🏆 PR 갱신 정체 (2주)',
    'weight_stalled': '⚖️ 체중 변화 없음',
    'frequency_drop': '📉 운동 빈도 감소'
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
      '<div class="review-bullet-dot" style="background: var(--accent);"></div>' +
      '<p>' + escapeHtml(r) + '</p>' +
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
          '<div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: ' + sevColor + '20; border: 1px solid ' + sevColor + '60; color: ' + sevColor + '; font-size: 10px; font-family: var(--font); font-weight: 700;">심각도 ' + sevLabel + '</div>' +
          '<p class="font-bebas text-3xl mt-4 mb-2">정체기 신호 감지</p>' +
          '<p class="text-sm text-stone-300 leading-relaxed">' + escapeHtml(p.diagnosis) + '</p>' +
        '</div>' +
        
        // 주요 원인
        (p.primary_cause ? 
          '<div class="review-section warning">' +
            '<p class="text-[10px] font-mono uppercase tracking-widest mb-2" style="color: #fbbf24;">⚠ 주요 원인</p>' +
            '<p class="text-sm font-display font-bold">' + escapeHtml(p.primary_cause) + '</p>' +
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
              '<p class="text-[10px] font-mono text-stone-400 mt-0\\.5">맞춤 계획 세우기</p>' +
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
              '<stop offset="0%" stop-color="#F68460" stop-opacity="0.3"/>' +
              '<stop offset="100%" stop-color="#F68460" stop-opacity="0"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path d="' + line.area + '" fill="url(#weightGrad)"/>' +
          '<path d="' + line.path + '" stroke="#F68460" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
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
  
  var partsHtml = partRow('PUSH', pushCount) + partRow('PULL', pullCount) + partRow('LEGS', legsCount) + partRow('UPPER', upperCount) + partRow('FREE', freeCount);
  
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
              '<div style="color: var(--accent);">' + icon('trophy', 14) + '</div>' +
              '<p class="text-sm font-display font-bold">' + escapeHtml(pr.exerciseName) + '</p>' +
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
            '<p class="stat-mini-change" style="color: ' + (weightChange < 0 ? 'var(--accent)' : '#fbbf24') + ';">' + weightChangeSign + weightChange + 'kg / ' + getPeriodLabel(period) + '</p>'
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
      '</div>' +

      // 체중/체지방 차트
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">체중 변화</p>' +
          '<button class="text-[10px] font-mono accent uppercase tracking-wider" onclick="addBodyRecord()">+ 기록</button>' +
        '</div>' +
        
        chartHtml +
      '</div>' +
      
      // 주간 운동
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">주간 운동</p>' +
        '</div>' +
        
        '<div class="bar-chart" style="height: 140px;">' + weekBarsHtml + '</div>' +
        
        '<div class="border-t pt-4 mt-5">' +
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-3">부위별 분배</p>' +
          partsHtml +
        '</div>' +
      '</div>' +

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
                '<div style="color: var(--text-muted);">' + icon('chevron', 14) + '</div>' +
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
                  '<div class="workout-history-dot" style="background: var(--text-muted); box-shadow: 0 0 6px rgba(var(--muted-rgb), 0.45);"></div>' +
                  '<div>' +
                    '<p class="text-xs font-display font-bold">' + b.weight + 'kg</p>' +
                    '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + b.date + '</p>' +
                  '</div>' +
                '</div>' +
                '<div style="color: var(--text-muted);">' + icon('chevron', 14) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +
      
      // 사이클 진행
      '<div class="card">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3">현재 사이클</p>' +
        '<div class="flex items-baseline justify-between mb-3">' +
          '<p class="font-bebas text-3xl">Cycle ' + profile.currentCycle + '</p>' +
          '<p class="text-xs font-mono accent">' + profile.currentWeek + ' / ' + CYCLE_LENGTH + ' 주</p>' +
        '</div>' +
        '<div class="progress-bg mb-2"><div class="progress-fill" style="width: ' + Math.round((profile.currentWeek / CYCLE_LENGTH) * 100) + '%;"></div></div>' +
        '<p class="text-[10px] font-mono text-stone-500">' + profile.cyclePhase + ' · ' + (profile.currentWeek >= CYCLE_LENGTH ? '디로드 주간' : (CYCLE_LENGTH - profile.currentWeek) + '주 후 디로드') + '</p>' +
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
function ensureCardioState() {
  if (!state.cardio) state.cardio = { phase: 'idle', inputMin: '', loading: false, error: null, plan: null, run: null };
  return state.cardio;
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
function cardioTypeLabel(type) {
  return type === 'run' ? '뛰기' : type === 'walk' ? '걷기' : type === 'warmup' ? '워밍업' : type === 'cooldown' ? '쿨다운' : '구간';
}
function cardioTypeIcon(type) {
  return type === 'run' ? '🏃' : type === 'warmup' ? '🔥' : type === 'cooldown' ? '🧊' : '🚶';
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
function cardioNormalizePlan(res, min) {
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
    if (!isFinite(speed) || speed < 0) speed = (type === 'run' ? 8.0 : type === 'walk' ? 5.5 : type === 'warmup' ? 5.0 : 5.0);
    segs.push({ startSec: Math.round(start), endSec: Math.round(end), type: type, speed: Math.round(speed * 10) / 10, label: s.label || cardioTypeLabel(type) });
    cursor = end;
  }
  // 정렬 후 0 부터 연속으로 재배치(겹침·구멍 제거) → 총시간 명확
  segs.sort(function(a, b) { return a.startSec - b.startSec; });
  var t = 0;
  for (var j = 0; j < segs.length; j++) {
    var dur = Math.max(5, segs[j].endSec - segs[j].startSec);
    segs[j].startSec = t; segs[j].endSec = t + dur; t += dur;
  }
  if (!segs.length) return buildFallbackInterval(min, !state.apiKey);
  return { headline: res.headline || (Math.round(t / 60) + '분 인터벌'), totalSec: t, segments: segs, note: res.note || '', source: 'ai' };
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
  var note = '완주가 목표예요. 힘들면 속력을 낮추세요. 뛰기는 "짧은 말은 되는데 대화는 벅찬" 정도가 적당해요.';
  if (noKey) note += ' (더보기에서 AI 키를 넣으면 기록 기반 맞춤 구성을 받아요.)';
  return { headline: '오늘 ' + T + '분 · 몸풀기 → 걷기·뛰기 반복 → 정리', totalSec: tot, segments: segs, note: note, source: 'fallback' };
}

// ── 시간(분) 입력 → 구성 만들기 ─────────────────────────────
window.buildCardioPlan = function(explicitMin) {
  ensureCardioState();
  var c = state.cardio;
  var min = explicitMin;
  if (min == null) {
    var el = (typeof document !== 'undefined' && document.getElementById) ? document.getElementById('cardio-min-input') : null;
    min = el ? parseInt(el.value, 10) : NaN;
  }
  if (!min || isNaN(min) || min < 5) { showToast('5분 이상 입력해 주세요', true); return; }
  if (min > 120) min = 120;
  c.inputMin = min; c.loading = true; c.error = null; c.plan = null; c.phase = 'idle';
  render();

  function usefallback() { c.loading = false; c.plan = buildFallbackInterval(min, !state.apiKey); c.phase = 'preview'; render(); }
  try {
    if (typeof generateCardioInterval === 'function') {
      Promise.resolve(generateCardioInterval(min)).then(function(res) {
        if (res && res.segments && res.segments.length) {
          c.loading = false; c.plan = cardioNormalizePlan(res, min); c.phase = 'preview'; render();
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
  var segs = c.plan.segments.map(function(s) {
    return {
      type: s.type,
      targetSpeed: Number(s.speed) || 0,
      actualSpeed: Number(s.speed) || 0,   // 실제 속력 = 목표에서 시작, 구간별로 조정 가능
      startSec: s.startSec, endSec: s.endSec,
      sec: Math.max(0, Math.round(s.endSec - s.startSec)),
      label: s.label || cardioTypeLabel(s.type)
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
    distanceKm: 0, soundOn: true, completed: false, elapsedAtEnd: null
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
  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  set('cardio-elapsed', cardioFmtClock(elapsed));
  set('cardio-seg-icon', cardioTypeIcon(seg.type));
  set('cardio-seg-label', cardioTypeLabel(seg.type));
  set('cardio-seg-remain', '남은 ' + cardioFmtClock(Math.max(0, Math.ceil(seg.endSec - elapsed))));
  set('cardio-target', (seg.targetSpeed || 0).toFixed(1));
  set('cardio-actual', (seg.actualSpeed || 0).toFixed(1));
  set('cardio-dist', run.distanceKm.toFixed(2));
  set('cardio-segcount', (idx + 1) + ' / ' + run.segs.length);
  set('cardio-next', next ? (cardioTypeIcon(next.type) + ' ' + cardioTypeLabel(next.type) + ' ' + (next.targetSpeed || 0).toFixed(1)) : '마지막 구간');
  var pf = document.getElementById('cardio-progress-fill');
  if (pf) { var pct = run.totalSec > 0 ? Math.min(100, (elapsed / run.totalSec) * 100) : 0; pf.style.width = pct.toFixed(1) + '%'; }
  var pc = document.getElementById('cardio-precue');
  if (pc) {
    var ttl = seg.endSec - elapsed;
    if (ttl > 0 && ttl <= 3) {
      pc.style.display = '';
      pc.textContent = next ? ('곧 ' + cardioTypeIcon(next.type) + ' ' + cardioTypeLabel(next.type) + ' ' + (next.targetSpeed || 0).toFixed(1) + '! (' + Math.ceil(ttl) + ')') : ('곧 완주! (' + Math.ceil(ttl) + ')');
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
  for (var i = 0; i < segs.length; i++) {
    var b = segs[i].endSec;              // 구간 경계(마지막은 완주 지점)
    if (b <= fromElapsed + 0.05) continue;
    var isFinal = (i === segs.length - 1);
    // 전환 3초 전·2초 전·1초 전 매초 예고 '따'(총 3번) — 카운트다운처럼 놓치지 않게.
    for (var k = 3; k >= 1; k--) {
      var pt = b - k;
      if (pt > fromElapsed + 0.05) cardioPushTones(cardioSchedSeq(ctx, base + (pt - fromElapsed), 'tick'));
    }
    // 전환 순간 '딴!' — 더 높고 길게 강조. 올림/내림은 톤(주파수)으로 구분.
    if (isFinal) {
      cardioPushTones(cardioSchedSeq(ctx, base + (b - fromElapsed), 'finish'));
    } else {
      var cur = segs[i].actualSpeed, nxt = segs[i + 1].targetSpeed;
      var harder = (nxt > cur) || (segs[i + 1].type === 'run' && segs[i].type !== 'run');
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
// RPE(1~10 또는 null=건너뛰기) → 세션 저장(saveCardioSession) 후 초기화
window.submitCardioRpe = function(rpe) {
  var c = state.cardio; var run = c && c.run;
  if (!run) { if (c) { c.phase = 'idle'; } try { localStorage.removeItem(KEYS.ACTIVE_CARDIO_RUN); } catch (e) {} render(); return; }
  var endSec = (run.elapsedAtEnd != null) ? run.elapsedAtEnd : run.totalSec;
  // 실제 수행한 구간만 기록(중단 시 진행중 구간은 실제 경과분만)
  var outSegs = [];
  for (var i = 0; i < run.segs.length; i++) {
    var s = run.segs[i];
    if (s.startSec >= endSec - 0.5) break;
    var segEnd = Math.min(s.endSec, endSec);
    var sec = Math.max(0, Math.round(segEnd - s.startSec));
    if (sec <= 0) continue;
    outSegs.push({ type: s.type, targetSpeed: s.targetSpeed, actualSpeed: s.actualSpeed, sec: sec });
  }
  if (!outSegs.length) outSegs = run.segs.map(function(s) { return { type: s.type, targetSpeed: s.targetSpeed, actualSpeed: s.actualSpeed, sec: s.sec }; });
  var session = {
    id: 'cardio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    date: getTodayStr(),
    totalSec: Math.round(endSec),
    totalDistKm: Math.round(run.distanceKm * 100) / 100,
    segments: outSegs,
    completed: !!run.completed,
    rpe: (rpe == null ? null : rpe)
  };
  c.run = null; c.plan = null; c.phase = 'idle';
  try { localStorage.removeItem(KEYS.ACTIVE_CARDIO_RUN); } catch (e) {}   // 진행 저장 삭제(세션이 CARDIO_LOG 로 확정됨)
  state.currentTab = 'running';
  if (typeof window.saveCardioSession === 'function') { window.saveCardioSession(session); } else { render(); }
  showToast(session.completed ? '완주! 유산소 기록 저장 완료 💪' : '유산소 기록 저장 완료');
};

// ── 화면: 러닝 탭(입력/구성 미리보기) ─────────────────────────────
function renderRunning() {
  ensureCardioState();
  var c = state.cardio;
  var accent = 'var(--accent)';

  // 정직한 톤 배너(cardio-research.md) + 근손실 넛지
  var banner =
    '<div class="card mb-4" style="margin-top:16px;border-color:rgba(var(--accent-rgb),0.15);">' +
      '<p class="text-xs font-display" style="line-height:1.65;">살 빠짐은 <b>총 소비와 식사</b>로 정해져요. 유산소는 소비를 안전하게 늘리는 방법이에요.</p>' +
      '<p class="text-[10px] font-mono text-stone-500 mt-2">유산소만 하면 근육이 빠질 수 있어요. 웨이트와 단백질을 함께 챙기세요.</p>' +
    '</div>';

  // 시간 입력 + 구성 버튼 + 빠른 선택 칩
  var quickChips = [15, 20, 30, 40, 50].map(function(m) {
    return '<button class="option-card" style="flex:1;padding:9px 0;text-align:center;" onclick="buildCardioPlan(' + m + ')"><p class="text-xs font-mono">' + m + '</p></button>';
  }).join('');
  var input =
    '<div class="card mb-4">' +
      '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">운동 시간</p>' +
      '<div class="flex items-center gap-2">' +
        '<input id="cardio-min-input" type="number" inputmode="numeric" min="5" max="120" step="1" value="' + (c.inputMin || '') + '" placeholder="예: 30"' + (c.loading ? ' disabled' : '') + ' style="flex:1;min-width:0;background:var(--bg-1);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px;color:#fff;font-family:var(--font);font-weight:800;font-size:26px;" onkeydown="if(event.key===\'Enter\')buildCardioPlan()" />' +
        '<span class="text-sm font-mono text-stone-400">분</span>' +
        '<button class="sheet-submit" style="width:auto;padding:12px 20px;margin:0;flex-shrink:0;" onclick="buildCardioPlan()"' + (c.loading ? ' disabled' : '') + '>구성</button>' +
      '</div>' +
      '<div class="flex gap-2 mt-3">' + quickChips + '</div>' +
    '</div>';

  // 로딩 / 미리보기
  var mid = '';
  if (c.loading) {
    mid = '<div class="card mb-4 text-center" style="padding:28px 0;"><p class="text-sm font-mono accent">AI가 구성 중…</p><p class="text-[10px] font-mono text-stone-500 mt-2">시간에 딱 맞게 워밍업·인터벌·쿨다운을 짜요</p></div>';
  } else if (c.plan) {
    var plan = c.plan;
    var segList = plan.segments.map(function(s) {
      var dur = s.endSec - s.startSec;
      return '<div class="flex items-center justify-between" style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06);">' +
          '<div class="flex items-center gap-2">' +
            '<span style="font-size:17px;">' + cardioTypeIcon(s.type) + '</span>' +
            '<div><p class="text-xs font-display">' + cardioTypeLabel(s.type) + '</p>' +
            '<p class="text-[10px] font-mono text-stone-500">' + cardioFmtClock(dur) + '</p></div>' +
          '</div>' +
          '<p class="font-bebas text-xl' + (s.type === 'run' ? ' accent' : '') + '">' + (Number(s.speed) || 0).toFixed(1) + '<span class="text-[10px] text-stone-500"> km/h</span></p>' +
        '</div>';
    }).join('');
    mid =
      '<div class="card mb-4">' +
        '<div class="flex items-center justify-between mb-1">' +
          '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">오늘 구성</p>' +
          '<p class="font-bebas text-2xl accent">' + cardioFmtClock(plan.totalSec) + '</p>' +
        '</div>' +
        (plan.headline ? '<p class="text-sm font-display mb-2">' + escapeHtml(plan.headline) + '</p>' : '') +
        (plan.source === 'fallback' ? '<p class="text-[10px] font-mono" style="color:#fbbf24;">AI 키가 없어 기본 구성을 사용했어요</p>' : '') +
        '<div class="mt-2">' + segList + '</div>' +
        (plan.note ? '<p class="text-[10px] font-mono text-stone-400 mt-3" style="line-height:1.6;">' + escapeHtml(plan.note) + '</p>' : '') +
        '<button class="sheet-submit" style="margin-top:14px;" onclick="startCardio()">▶ 시작</button>' +
        '<button class="option-card" style="width:100%;margin-top:8px;text-align:center;" onclick="resetCardioPlan()"><p class="text-xs font-mono text-stone-400">다시 구성</p></button>' +
      '</div>';
  }

  // 최근 유산소 한 줄
  var all = (state.data && state.data.cardioLog) ? state.data.cardioLog : [];
  var recent = all.length
    ? '<p class="text-[10px] font-mono text-stone-500 text-center mt-6">최근: ' + all[all.length - 1].date + ' · ' + cardioFmtClock(all[all.length - 1].totalSec || 0) + ' · ' + ((all[all.length - 1].totalDistKm || 0).toFixed(2)) + 'km' + (all[all.length - 1].completed ? ' · 완주' : '') + '</p>'
    : '<p class="text-[10px] font-mono text-stone-600 text-center mt-6">첫 세션은 보수적으로 · 완주가 목표예요</p>';

  return '' +
    '<div class="px-5 pt-12 pb-32">' +
      '<p class="text-xs uppercase font-mono text-stone-500 mb-2" style="letter-spacing: 0.3em;">RUNNING</p>' +
      '<h1 class="font-bebas text-4xl">러닝</h1>' +
      '<p class="text-xs font-mono text-stone-400 mt-1">러닝머신 인터벌 · 시간만 정하면 AI가 구성</p>' +
      banner + input + mid + recent +
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

  return '' +
    // 헤더
    '<div class="px-5 pt-12" style="padding-bottom:14px;">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<button class="session-header-btn" onclick="stopCardio(false)">' + icon('close', 18) + '</button>' +
        '<div class="text-center">' +
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">러닝 · 인터벌</p>' +
          '<p class="text-xs font-mono accent mt-0\\.5">총 ' + cardioFmtClock(run.totalSec) + '</p>' +
        '</div>' +
        '<button class="session-header-btn" onclick="toggleCardioSound()" title="소리">' + (run.soundOn ? '🔊' : '🔇') + '</button>' +
      '</div>' +
      '<div class="session-progress"><div id="cardio-progress-fill" class="session-progress-fill" style="width:' + progPct.toFixed(1) + '%"></div></div>' +
    '</div>' +

    '<div class="px-5" style="padding-bottom:120px;">' +

      // 현재 구간
      '<div class="text-center" style="margin-top:6px;">' +
        '<p class="text-sm" style="color:var(--text-soft);"><span id="cardio-seg-icon">' + cardioTypeIcon(seg.type) + '</span> <span id="cardio-seg-label" class="font-display">' + cardioTypeLabel(seg.type) + '</span></p>' +
        '<p id="cardio-seg-remain" class="text-[10px] font-mono text-stone-500 mt-1">남은 ' + cardioFmtClock(Math.max(0, Math.ceil(seg.endSec - elapsed))) + '</p>' +
      '</div>' +

      // 경과시간(히어로)
      '<div class="text-center" style="margin-top:10px;">' +
        '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">경과 시간</p>' +
        '<p id="cardio-elapsed" class="font-bebas" style="font-size:76px;line-height:1;letter-spacing:1px;">' + cardioFmtClock(elapsed) + '</p>' +
      '</div>' +

      // 예고 배너(3초 전)
      '<div id="cardio-precue" class="text-center" style="display:none;margin-top:8px;color:#fbbf24;font-family:var(--font);font-weight:700;font-size:15px;"></div>' +

      // 목표 속력 + 실제 속력 조정
      '<div class="card" style="margin-top:16px;">' +
        '<div class="flex items-center justify-between mb-1">' +
          '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">목표 속력</p>' +
          '<p class="font-bebas text-2xl accent"><span id="cardio-target">' + (seg.targetSpeed || 0).toFixed(1) + '</span><span class="text-xs text-stone-400"> km/h</span></p>' +
        '</div>' +
        '<div class="flex items-center justify-between" style="margin-top:10px;">' +
          '<button style="' + round + '" onclick="adjustCardioSpeed(-0.5)">−</button>' +
          '<div class="text-center">' +
            '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest">실제 속력</p>' +
            '<p class="font-bebas" style="font-size:46px;line-height:1;"><span id="cardio-actual">' + (seg.actualSpeed || 0).toFixed(1) + '</span><span class="text-sm text-stone-400"> km/h</span></p>' +
          '</div>' +
          '<button style="' + round + '" onclick="adjustCardioSpeed(0.5)">+</button>' +
        '</div>' +
        '<div class="flex items-center justify-center gap-2" style="margin-top:10px;">' +
          '<button class="option-card" style="padding:6px 14px;" onclick="adjustCardioSpeed(-0.1)"><p class="text-xs font-mono text-stone-400">−0.1</p></button>' +
          '<button class="option-card" style="padding:6px 14px;" onclick="adjustCardioSpeed(0.1)"><p class="text-xs font-mono text-stone-400">+0.1</p></button>' +
        '</div>' +
      '</div>' +

      // 보조 정보(거리·다음·구간)
      '<div class="flex gap-2" style="margin-top:12px;">' +
        '<div style="flex:1;' + chip + '"><p class="text-[10px] text-stone-500">이동거리</p><p class="font-bebas text-xl" style="color:#34d399;"><span id="cardio-dist">' + run.distanceKm.toFixed(2) + '</span> km</p></div>' +
        '<div style="flex:1;' + chip + '"><p class="text-[10px] text-stone-500">구간</p><p class="font-bebas text-xl"><span id="cardio-segcount">' + (idx + 1) + ' / ' + run.segs.length + '</span></p></div>' +
      '</div>' +
      '<div style="' + chip + 'margin-top:8px;"><p class="text-[10px] text-stone-500">다음 구간</p><p class="text-sm font-display" style="color:#fff;"><span id="cardio-next">' + (next ? (cardioTypeIcon(next.type) + ' ' + cardioTypeLabel(next.type) + ' ' + (next.targetSpeed || 0).toFixed(1)) : '마지막 구간') + '</span></p></div>' +

      '<button class="option-card" style="width:100%;margin-top:18px;text-align:center;padding:14px 0;" onclick="stopCardio(false)"><p class="text-sm font-mono accent">운동 종료 ✓</p></button>' +

    '</div>';
}

// ── 화면: 종료 후 RPE 입력 ─────────────────────────────
function renderCardioRPE() {
  var c = state.cardio; var run = c && c.run;
  if (!run) return '<div class="px-5 pt-12">기록 없음</div>';
  var endSec = (run.elapsedAtEnd != null) ? run.elapsedAtEnd : run.totalSec;
  var completed = !!run.completed;
  var btns = '';
  for (var n = 1; n <= 10; n++) {
    var col = n <= 3 ? '#10b981' : n <= 6 ? 'var(--accent)' : n <= 8 ? '#fbbf24' : '#ef4444';
    btns += '<button onclick="submitCardioRpe(' + n + ')" style="width:52px;height:52px;border-radius:14px;border:1.5px solid ' + col + ';background:var(--bg-1);color:' + col + ';font-family:var(--font);font-weight:800;font-size:24px;">' + n + '</button>';
  }
  return '' +
    '<div class="px-5 pt-12 pb-32">' +
      '<div class="text-center" style="margin-top:8px;">' +
        '<div style="font-size:44px;">' + (completed ? '🎉' : '👏') + '</div>' +
        '<h1 class="font-bebas text-4xl mt-1">' + (completed ? '완주!' : '수고했어요') + '</h1>' +
        '<p class="text-sm font-mono text-stone-400 mt-2">' + cardioFmtClock(endSec) + ' · ' + run.distanceKm.toFixed(2) + 'km</p>' +
      '</div>' +

      '<div class="card" style="margin-top:22px;">' +
        '<p class="text-sm font-display text-center mb-1">오늘 세션, 얼마나 힘들었나요?</p>' +
        '<p class="text-[10px] font-mono text-stone-500 text-center mb-4">1~3 쉬움 · 4~6 적당 · 7~8 힘듦 · 9~10 매우 힘듦</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + btns + '</div>' +
        '<p class="text-[10px] font-mono text-stone-500 text-center mt-4" style="line-height:1.6;">뛰기가 7 이하로 완주했다면 다음 구성은 걷기가 조금 줄어들어요. 통증이 있으면 쉬세요.</p>' +
        '<button class="option-card" style="width:100%;margin-top:12px;text-align:center;" onclick="submitCardioRpe(null)"><p class="text-xs font-mono text-stone-400">평가 건너뛰기</p></button>' +
      '</div>' +
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
  var completedN = sorted.filter(function(x) { return x.completed; }).length;
  var rpes = sorted.filter(function(x) { return typeof x.rpe === 'number'; }).map(function(x) { return x.rpe; });
  var avgRpe = rpes.length ? (rpes.reduce(function(s, x) { return s + x; }, 0) / rpes.length) : null;
  var recent = sorted.slice(-8);
  var maxKm = Math.max.apply(null, recent.map(function(x) { return x.totalDistKm || 0; }).concat([0.1]));
  var bars = recent.map(function(x, i) {
    var h = Math.max(6, Math.round(((x.totalDistKm || 0) / maxKm) * 70));
    var isLast = i === recent.length - 1;
    return '<div style="flex:1;display:flex;justify-content:center;align-items:flex-end;height:76px;"><div style="width:60%;height:' + h + 'px;border-radius:4px;background:' + (isLast ? 'var(--accent)' : 'var(--bg-3)') + ';"></div></div>';
  }).join('');
  var rows = sorted.slice(-5).reverse().map(function(x) {
    var runSpd = cardioAvgRunSpeed(x);
    return '<div class="workout-history-row">' +
        '<div class="flex items-center gap-3">' +
          '<div class="workout-history-dot" style="background:#34d399;box-shadow:0 0 6px rgba(52,211,153,0.5);"></div>' +
          '<div>' +
            '<p class="text-xs font-display font-bold">' + cardioFmtClock(x.totalSec || 0) + ' · ' + ((x.totalDistKm || 0).toFixed(2)) + 'km</p>' +
            '<p class="text-[10px] font-mono text-stone-500 mt-0\\.5">' + x.date + ' · ' + (x.completed ? '완주' : '중단') + (typeof x.rpe === 'number' ? (' · RPE ' + x.rpe) : '') + (runSpd ? (' · 뛰기 ' + runSpd.toFixed(1)) : '') + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');
  return '<div class="card mb-4">' +
      '<div class="flex items-center justify-between mb-4">' +
        '<p class="text-xs uppercase tracking-widest text-stone-500 font-mono">유산소</p>' +
        '<p class="text-xs font-mono accent">' + n + '회</p>' +
      '</div>' +
      '<div class="flex items-baseline gap-4 mb-3">' +
        '<div><p class="font-bebas text-3xl accent">' + totalKm.toFixed(1) + '</p><p class="text-[10px] font-mono text-stone-500">총 km</p></div>' +
        '<div><p class="font-bebas text-3xl">' + completedN + '</p><p class="text-[10px] font-mono text-stone-500">완주</p></div>' +
        (avgRpe != null ? '<div><p class="font-bebas text-3xl">' + avgRpe.toFixed(1) + '</p><p class="text-[10px] font-mono text-stone-500">평균 RPE</p></div>' : '') +
      '</div>' +
      (recent.length >= 2 ? '<p class="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2">거리 추이</p><div style="display:flex;align-items:flex-end;gap:4px;margin-bottom:12px;">' + bars + '</div>' : '') +
      '<div>' + rows + '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════
// 탭바
// ═══════════════════════════════════════════════
function renderTabbar() {
  var tabs = [
    { id: 'home', label: 'HOME', iconName: 'home' },
    { id: 'workout', label: 'WORKOUT', iconName: 'dumbbell' },
    { id: 'running', label: 'RUNNING', iconName: cardioTabIconName() },
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

  var content = '';
  switch (state.currentTab) {
    case 'home': content = renderHome(); break;
    case 'workout': content = renderWorkout(); break;
    case 'running': content = renderRunning(); break;
    case 'stats': content = renderStats(); break;
    case 'more': content = renderMore(); break;
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
          '<div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>' +
          '<p class="font-display font-bold text-xl mb-2" style="color: #ef4444;">전체 데이터 삭제</p>' +
          '<p class="text-xs text-stone-400 leading-relaxed">' +
            '운동 기록, 체중 기록, PR, 1RM,<br/>' +
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
      showToast('✓ 설치 시작!');
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
  if (state.itemDetailSheet) return 'itemDetail';     // 기록 상세 (탭 위)
  if (state.editingSet) return 'setEditor';           // 세트 편집 (세션 위)
  if (state.exerciseSwapOpen) return 'exerciseSwap';  // 종목 교체 (세션 위)
  if (state.apiKeyModalOpen) return 'apiKey';         // (더보기 위)
  if (state.profileEditModalOpen) return 'profileEdit';
  if (state.resetConfirming) return 'resetConfirm';
  // 전체화면 오버레이 (render 우선순위와 동일한 순서)
  if (state.oneRMListOpen) return 'oneRMList';
  if (state.coachMemoryOpen) return 'coachMemory';
  if (state.weeklyReviewOpen) return 'weeklyReview';
  if (state.plateauOpen) return 'plateau';
  if (state.coachChatOpen) return 'coachChat';
  // 완료 화면 / 진행 중 세션
  if (state.completedSession) return 'completed';
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
    case 'itemDetail': closeItemDetail(); break;
    case 'setEditor': closeSetEditor(); break;
    case 'exerciseSwap': closeExerciseSwap(); break;
    case 'apiKey': closeApiKeyModal(); break;
    case 'profileEdit': closeProfileEditModal(); break;
    case 'resetConfirm': cancelResetAll(); break;
    // 전체화면 오버레이
    case 'oneRMList': closeOneRMList(); break;
    case 'coachMemory': closeCoachMemory(); break;
    case 'weeklyReview': closeWeeklyReview(); break;
    case 'plateau': closePlateauDetail(); break;
    case 'coachChat': closeCoachChat(); break;
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
    if (state.completedSession) return;
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
      closeBtn.textContent = '✕';
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
  showToast('✓ 헬스앱 설치 완료');
});
