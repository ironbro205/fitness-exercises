// 헬스앱 특성화(골든 마스터) 테스트.
// 목적: index.html 분리 리팩터링이 동작을 바꾸지 않았음을 보장한다.
// 원본에서 관찰한 출력을 골든값으로 고정 → 분리 후에도 동일해야 통과.
// 테스트는 전역 "공개 함수"만 호출하므로, 파일을 어떻게 재배치해도 살아남는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp, readAppSource } from './_harness.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const app = loadApp();

// vm 컨텍스트에서 만든 객체는 프로토타입 출신이 달라 deepStrictEqual 이 실패한다.
// 순수 데이터를 JSON 으로 정규화해 현재 realm 의 객체로 되돌린 뒤 비교한다.
const plain = (v) => JSON.parse(JSON.stringify(v));

// ── 스모크: 분리 후에도 모든 전역 함수·데이터표가 그대로 존재하는가 (리팩터링 핵심 가드) ──
test('전역 심볼 집합이 골든 스냅샷과 일치한다 (함수 누락/중복 없음)', () => {
  const golden = JSON.parse(fs.readFileSync(path.join(DIR, 'golden-symbols.json'), 'utf8'));
  const names = app.__APP_GLOBALS__;
  const functions = names.filter((n) => typeof app[n] === 'function').sort();
  const objects = names.filter((n) => app[n] !== null && typeof app[n] === 'object').sort();
  assert.equal(functions.length, golden.functionCount, '전역 함수 개수가 달라짐');
  assert.deepEqual(functions, golden.functions, '전역 함수 목록이 달라짐');
  assert.deepEqual(objects, golden.objects, '전역 데이터객체 목록이 달라짐');
});

// ── strict 모드 보존: 원본은 단일 스크립트가 'use strict'로 시작했다.
//    분리 후에도 각 스크립트가 strict 여야 동작(예: 미선언 대입 시 throw)이 같다. ──
test("strict 모드 보존 — 각 스크립트가 'use strict'로 시작", () => {
  const firstStmtIsStrict = (src) => {
    for (const raw of src.split('\n')) {
      const l = raw.trim();
      if (l === '' || l.startsWith('//')) continue; // 헤더 주석·빈줄 건너뜀
      return /^['"]use strict['"];?$/.test(l);
    }
    return false;
  };
  if (readAppSource().mode === 'split') {
    for (const f of ['data', 'core', 'domain', 'ai', 'screens']) {
      const src = fs.readFileSync(path.join(DIR, '..', 'js', `${f}.js`), 'utf8');
      assert.ok(firstStmtIsStrict(src), `js/${f}.js 는 'use strict'로 시작해야 함`);
    }
  } else {
    const html = fs.readFileSync(path.join(DIR, '..', 'index.html'), 'utf8');
    const code = html.match(/<script>\n([\s\S]*?)\n<\/script>/)[1];
    assert.ok(firstStmtIsStrict(code), "인라인 스크립트는 'use strict'로 시작해야 함");
  }
});

// ── 순수 계산: 1RM ──
test('calculate1RM — Epley 공식', () => {
  assert.equal(app.calculate1RM(100, 1), 100); // reps 1 → 그대로
  assert.equal(app.calculate1RM(100, 5), 116.7);
  assert.equal(app.calculate1RM(80, 10), 106.7);
  assert.equal(app.calculate1RM(0, 5), 0); // 무게 0 → 0
  assert.equal(app.calculate1RM(100, 0), 0); // 횟수 0 → 0
});

// ── 횟수 범위 파싱 ──
test('parseRepRange — 범위/단일/기본값', () => {
  assert.deepEqual(plain(app.parseRepRange('8-12')), { low: 8, high: 12 });
  assert.deepEqual(plain(app.parseRepRange('10')), { low: 10, high: 10 });
  assert.deepEqual(plain(app.parseRepRange('')), { low: 8, high: 10 }); // 기본 '8-10'
  assert.deepEqual(plain(app.parseRepRange(undefined)), { low: 8, high: 10 });
});

// ── 1RM 조회 + 작업 무게 추천 (init()이 INITIAL_1RM을 시드함 → 저장소 경로까지 포함) ──
test('get1RM / suggestWorkingWeight — 시드된 1RM 기반', () => {
  assert.equal(app.get1RM('레그 프레스'), 216);
  assert.equal(app.suggestWorkingWeight('레그 프레스', 0.7), 150); // round(216*0.7/2.5)*2.5
});

// ═══════════════════════════════════════════════
// 묶음2 — 엔진 수리 (1RM rolling max + 사이클/주차 진행)
// ═══════════════════════════════════════════════

// ── 1RM 자동 증감: 최근 N세션 윈도우 최고 e1RM (rolling max) ──
test('calculateRollingMax1RM — 최근 N세션 윈도우 최고 e1RM', () => {
  app.state.data.workoutLog = [
    { date: '2026-06-01', completed: true, exercises: [{ name: '레그 프레스', setsDetail: [{ weight: 200, reps: 5, isWarmup: false }] }] },
    { date: '2026-06-08', completed: true, exercises: [{ name: '레그 프레스', setsDetail: [{ weight: 180, reps: 5, isWarmup: false }] }] },
    { date: '2026-06-15', completed: true, exercises: [{ name: '레그 프레스', setsDetail: [{ weight: 185, reps: 5, isWarmup: false }] }] },
  ];
  const all = app.calculateRollingMax1RM('레그 프레스', 4);
  assert.equal(all.value, 233.3);  // 200*(1+5/30)=233.33 → 233.3
  assert.equal(all.sessions, 3);
  const win1 = app.calculateRollingMax1RM('레그 프레스', 1);
  assert.equal(win1.value, 215.8); // 최근 1세션: 185*(1+5/30)=215.83 → 215.8
  assert.equal(app.calculateRollingMax1RM('없는운동xyz', 4), null);
});

test('calculateRollingMax1RM — 고횟수(>12회) 세트는 추세에서 제외', () => {
  app.state.data.workoutLog = [
    { date: '2026-06-01', completed: true, exercises: [{ name: '랫풀다운', setsDetail: [
      { weight: 60, reps: 20, isWarmup: false }, // 20회 → e1RM 신뢰 낮음 → 제외
      { weight: 70, reps: 8, isWarmup: false },  // 70*(1+8/30)=88.67 → 88.7
    ] }] },
  ];
  assert.equal(app.calculateRollingMax1RM('랫풀다운', 4).value, 88.7);
});

// ── 사이클: 주차 → 단계 (1~4 빌드, 5 디로드) ──
test('getPhaseByWeek — 1~4 빌드, 5 디로드', () => {
  assert.equal(app.getPhaseByWeek(1), '빌드');
  assert.equal(app.getPhaseByWeek(4), '빌드');
  assert.equal(app.getPhaseByWeek(5), '디로드');
});

// ── 사이클: 완료 기준 진행 (날짜 아님) ──
test('advanceCycleOnSessionComplete — 목표 달성 시에만 다음 주차/사이클', () => {
  // 미달 → 그대로
  assert.deepEqual(plain(app.advanceCycleOnSessionComplete({ currentCycle: 1, currentWeek: 2, cyclePhase: '빌드', workoutFreq: 4 }, 3)),
    { currentCycle: 1, currentWeek: 2, cyclePhase: '빌드' });
  // 목표 달성 → 다음 주차
  assert.deepEqual(plain(app.advanceCycleOnSessionComplete({ currentCycle: 1, currentWeek: 2, cyclePhase: '빌드', workoutFreq: 4 }, 4)),
    { currentCycle: 1, currentWeek: 3, cyclePhase: '빌드' });
  // 5주차(디로드) 완료 → 새 사이클 1주차
  assert.deepEqual(plain(app.advanceCycleOnSessionComplete({ currentCycle: 1, currentWeek: 5, cyclePhase: '디로드', workoutFreq: 4 }, 4)),
    { currentCycle: 2, currentWeek: 1, cyclePhase: '빌드' });
});

// ═══════════════════════════════════════════════
// 묶음3 — 코치 기억 노트 (응답 파싱 + 중복제거 병합)
// ═══════════════════════════════════════════════

// ── 코치 응답 끝의 숨김 memory 블록 파싱 (본문에서 제거 + 항목 추출) ──
test('parseCoachMemoryBlock — memory 블록 추출 + 본문 분리', () => {
  const r = app.parseCoachMemoryBlock('좋아요. 어깨 조심하세요.\n```memory\n[{"category":"injury","text":"왼쪽 어깨 통증"}]\n```');
  assert.equal(r.clean, '좋아요. 어깨 조심하세요.');
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].category, 'injury');
  assert.equal(r.items[0].text, '왼쪽 어깨 통증');

  // 블록 없음 → 본문 그대로, 항목 없음
  const r2 = app.parseCoachMemoryBlock('그냥 일반 답변입니다.');
  assert.equal(r2.clean, '그냥 일반 답변입니다.');
  assert.deepEqual(plain(r2.items), []);

  // 망가진 JSON → 블록은 제거(사용자에게 raw JSON 안 보임), 항목은 없음
  const r3 = app.parseCoachMemoryBlock('답변.\n```memory\n망가진 JSON{\n```');
  assert.equal(r3.clean, '답변.');
  assert.deepEqual(plain(r3.items), []);
});

// ── 기억 노트 병합: 중복 제거 + 카테고리 보정 + 출처/날짜 ──
test('mergeCoachMemory — 중복 건너뛰기 + 미지 카테고리는 other', () => {
  const base = [{ id: 'a', category: 'preference', text: '덤벨 선호', source: 'manual', date: '2026-06-01' }];
  const merged = app.mergeCoachMemory(base, [
    { category: 'injury', text: '무릎 통증' },
    { category: 'preference', text: '덤벨 선호' }, // 중복
  ], 'auto', '2026-06-14', 'mem_x');
  assert.equal(merged.length, 2);
  const added = merged.find((m) => m.category === 'injury');
  assert.equal(added.text, '무릎 통증');
  assert.equal(added.source, 'auto');
  assert.equal(added.date, '2026-06-14');

  const m2 = app.mergeCoachMemory([], [{ category: 'weird', text: '테스트' }], 'auto', '2026-06-14', 'mem_y');
  assert.equal(m2[0].category, 'other'); // 미지 카테고리 보정
});

// ── 진행은 완료 "횟수" 기준(캘린더 아님): 부분 진행도가 유지된다 ──
test('advanceCycleIfWeekComplete — 부분 진행도 누적 후 목표 도달 시 다음 주차', () => {
  const fresh = loadApp();
  fresh.state.profile = { workoutFreq: 4, currentCycle: 1, currentWeek: 1, cyclePhase: '빌드', weekSessionsDone: 0 };
  fresh.state.data.cycleHistory = [];
  fresh.advanceCycleIfWeekComplete(); fresh.advanceCycleIfWeekComplete(); fresh.advanceCycleIfWeekComplete(); // 3회
  assert.equal(fresh.state.profile.weekSessionsDone, 3, '부분 진행도 유지');
  assert.equal(fresh.state.profile.currentWeek, 1, '아직 같은 주차');
  fresh.advanceCycleIfWeekComplete(); // 4회 → 목표 달성
  assert.equal(fresh.state.profile.currentWeek, 2, '다음 주차로');
  assert.equal(fresh.state.profile.weekSessionsDone, 0, '진행도 리셋');
});

// ── 휴식 감시자: 오래 쉬면 복귀 안내 ──
test('getIdleComebackMessage — 10일 이상 쉬면 복귀 안내', () => {
  assert.equal(app.getIdleComebackMessage([{ date: '2026-06-12', completed: true }], '2026-06-14'), null); // 2일 → 없음
  const r = app.getIdleComebackMessage([{ date: '2026-06-01', completed: true }], '2026-06-14');           // 13일
  assert.equal(r.days, 13);
  assert.ok(r.message.length > 0);
  assert.equal(app.getIdleComebackMessage([], '2026-06-14'), null); // 기록 없음 → 없음
});

// ═══════════════════════════════════════════════
// 묶음1 — 백업/복원 (왕복 복원 + 민감키 제외)
// ═══════════════════════════════════════════════
test('buildBackupObject / restoreFromBackup — 왕복 복원, API키·대화 제외', () => {
  app.localStorage.clear();
  app.localStorage.setItem('fitness_profile', JSON.stringify({ age: 40, height: 175, weight: 80, workoutFreq: 5 }));
  app.localStorage.setItem('fitness_workout_log', JSON.stringify([{ id: 'x', date: '2026-06-01', completed: true }]));
  app.localStorage.setItem('fitness_body_log', JSON.stringify([{ date: '2026-06-01', weight: 80 }]));
  app.localStorage.setItem('fitness_api_key', JSON.stringify('sk-secret'));
  app.localStorage.setItem('fitness_coach_history', JSON.stringify([{ role: 'user', text: 'hi' }]));

  const backup = app.buildBackupObject();
  assert.equal(backup.data.fitness_api_key, undefined);       // 민감키 제외
  assert.equal(backup.data.fitness_coach_history, undefined); // 대화 제외
  assert.deepEqual(plain(backup.data.fitness_profile), { age: 40, height: 175, weight: 80, workoutFreq: 5 });
  assert.equal(typeof backup.exportedAt, 'string');
  assert.ok(backup.version);

  app.localStorage.clear();
  const res = app.restoreFromBackup(JSON.stringify(backup));
  assert.equal(res.ok, true);
  assert.deepEqual(plain(JSON.parse(app.localStorage.getItem('fitness_profile'))), { age: 40, height: 175, weight: 80, workoutFreq: 5 });
  assert.equal(app.restoreFromBackup('쓰레기{').ok, false);   // 잘못된 입력 → throw 안 함

  // 복원은 기존 임시 진행상태를 정리하고, 로컬 전용(API키)은 보존한다
  app.localStorage.clear();
  app.localStorage.setItem('fitness_active_session', JSON.stringify({ exercises: [], startTime: 1 }));
  app.localStorage.setItem('fitness_api_key', JSON.stringify('sk-keep'));
  const res2 = app.restoreFromBackup(JSON.stringify(backup));
  assert.equal(res2.ok, true);
  assert.equal(app.localStorage.getItem('fitness_active_session'), null);                 // 임시상태 정리됨
  assert.equal(JSON.parse(app.localStorage.getItem('fitness_api_key')), 'sk-keep');       // API키 보존
});

// ═══════════════════════════════════════════════
// 묶음1/2 UI 회귀 (fresh app — 격리)
// ═══════════════════════════════════════════════
test('renderMore — 껍데기 메뉴 7개 삭제 + 백업/프로필 반영', () => {
  const fresh = loadApp();
  const more = fresh.renderMore();
  ['종목 라이브러리', '즐겨찾기 종목', '단위', '테마', '도움말', '앱 정보'].forEach((m) => {
    assert.ok(!more.includes(m), '"' + m + '" 메뉴가 아직 남아있음');
  });
  assert.ok(more.includes('내 1RM'), '내 1RM 유지');
  assert.ok(more.includes('openProfileEditModal'), '프로필 수정 진입');
  assert.ok(more.includes('openBackupImport'), '가져오기 연결');
  assert.ok(more.includes('.json'), 'JSON 백업 안내');
});

test('renderHome — 사이클 5주(빌드/디로드), 옛 4단계 라벨 제거', () => {
  const fresh = loadApp();
  const home = fresh.renderHome();
  assert.ok(home.includes('빌드'), '빌드 단계 표시');
  assert.ok(!home.includes('구축') && !home.includes('강화'), '옛 4단계 라벨(구축/강화) 제거');
  assert.ok(home.includes('다 하면 다음 주차') || home.includes('목표 달성') || home.includes('쉬는 중'), '이번주 진행/복귀 안내');
});

// ── 묶음3 UI/프롬프트 회귀 ──
test('renderMore + renderCoachMemory — 기억 노트 메뉴/화면', () => {
  const fresh = loadApp();
  const more = fresh.renderMore();
  assert.ok(more.includes('기억 노트') && more.includes('openCoachMemory'), '더보기 기억 노트 메뉴');
  fresh.openCoachMemory();
  const mem = fresh.renderCoachMemory();
  assert.ok(mem.includes('memory-input'), '기억 노트 추가 입력창');
  assert.ok(mem.includes('부상·제약'), '카테고리 라벨');
});

test('getCoachSystemPrompt — 기억 노트 주입 + memory 저장 지시 + 5주 정정', () => {
  const fresh = loadApp();
  const sys = fresh.getCoachSystemPrompt();
  assert.ok(sys.includes('기억 노트'), '기억 노트 섹션 주입');
  assert.ok(!sys.includes('```memory'), '자동 memory 저장 지시 제거됨(기억은 수동 입력만)');
  assert.ok(sys.includes('5주 사이클'), '5주 사이클로 정정');
  assert.ok(!sys.includes('5~6주 사이클 (적응'), '옛 5~6주 표현 제거');
});

// ═══════════════════════════════════════════════
// 묶음5 — 화면정리 (중복·죽은 위젯 제거)
// ═══════════════════════════════════════════════

test('묶음5 renderHome — 요약판: 코치카드/빠른입력/최근PR 제거, 핵심 요약 유지', () => {
  const fresh = loadApp();
  fresh.state.data.personalRecords = [
    { exerciseName: '벤치프레스', weight: 100, previousWeight: 95, reps: 5, date: '2026-06-10' },
  ];
  const home = fresh.renderHome();
  // 제거
  assert.ok(!home.includes('openCoachChat'), '홈 코치 메시지 카드 제거');
  assert.ok(!home.includes('빠른 입력'), '빠른 입력 섹션 제거');
  assert.ok(!home.includes("setTab('workout')") && !home.includes("setTab('running')") && !home.includes("setTab('stats')"), '하단 바로가기 버튼 제거');
  assert.ok(!home.includes('최근 PR'), '홈 최근 PR 카드 제거(기록 탭으로)');
  // 유지
  assert.ok(home.includes('이번 주 운동'), '이번 주 운동 카드 유지');
  assert.ok(home.includes('현재 단계'), '사이클 단계 카드 유지');
});

test('묶음5 renderMore — 죽은 사이클 메뉴 2개 + 잘못된 모델 배지 제거, 현재 사이클/기억 노트 유지', () => {
  const fresh = loadApp();
  const more = fresh.renderMore();
  assert.ok(!more.includes('새 사이클 시작'), '죽은 "새 사이클 시작" 메뉴 제거');
  assert.ok(!more.includes('사이클 히스토리'), '죽은 "사이클 히스토리" 메뉴 제거');
  assert.ok(!more.includes('Sonnet 4'), '코치 카드 모델 배지 제거');
  assert.ok(more.includes('현재 사이클'), '현재 사이클 정보 행 유지');
  assert.ok(more.includes('기억 노트'), '기억 노트 메뉴 유지');
});

test('묶음5 renderStats — 체지방 토글 제거, 핵심지표 카드 유지', () => {
  const fresh = loadApp();
  fresh.state.statsPeriod = 'all';
  fresh.state.chartView = 'weight';
  const stats = fresh.renderStats();
  assert.ok(!stats.includes('체지방'), '체지방 토글 제거(입력 경로 없음)');
  assert.ok(!stats.includes('toggleChartView'), '차트뷰 토글 버튼 제거');
  assert.ok(!stats.includes(' 세션</p>'), '주간운동 제목의 중복 "N 세션" 배지 제거');
  assert.ok(stats.includes('stat-mini-card'), '핵심지표 카드 유지');
  assert.ok(stats.includes('PR 히스토리'), 'PR 히스토리 섹션 유지');
});

test('묶음5 renderWorkoutComplete — 종목 전부 표시(죽은 더보기 제거) + 코치카드 제거', () => {
  const fresh = loadApp();
  fresh.state.completedSession = {
    date: new Date('2026-06-14T09:00:00'),
    newPRs: [],
    exercises: Array.from({ length: 6 }, (_, i) => ({ name: '종목' + (i + 1), reps: [8, 8], maxWeight: 50 + i })),
    duration: 40, sessionName: 'PUSH', exerciseCount: 6, setCount: 12, rpe: 0, condition: 0,
  };
  const done = fresh.renderWorkoutComplete();
  assert.ok(done.includes('종목6'), '6개 종목 모두 표시');
  assert.ok(!done.includes('더 보기'), '죽은 "+N개 더 보기" 버튼 제거');
  assert.ok(!done.includes('COACH'), '완료화면 코치 메시지 카드 제거');
});

// ── 묶음6-A: 디자인 토큰화 + 한글폰트(원티드 산스) + 옛 라틴폰트 제거 ──
// CSS/HTML은 render 하네스가 실행하지 않으므로 파일 텍스트로 특성화한다.
test('묶음6-A 디자인 토큰 — :root 색 토큰 정의 + var() 적용, 직접 hex 누수 없음', () => {
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  assert.match(css, /:root\s*\{/, ':root 토큰 블록이 있어야 함');
  assert.match(css, /--accent:\s*#F68460/i, '--accent 토큰(오렌지)이 정의돼야 함');
  assert.match(css, /--accent-rgb:\s*246,\s*132,\s*96/i, '--accent-rgb 토큰(투명도용)이 정의돼야 함');
  assert.ok(css.includes('var(--accent)'), 'var(--accent) 가 실제로 쓰여야 함');
  assert.ok(css.includes('rgba(var(--accent-rgb)'), '투명 액센트가 토큰화돼야 함');
  // 액센트 직접 hex 는 :root 정의 1곳만 남고 나머지는 토큰으로 치환됐어야 함(누수 가드)
  const bareAccent = (css.match(/#F68460(?![0-9a-f])/gi) || []).length;
  assert.ok(bareAccent <= 1, `#F68460 직접 사용은 토큰 정의 1곳만 허용 (현재 ${bareAccent})`);
  // 옛 형광 청록 값은 완전히 사라져야 함
  assert.ok(!/:\s*#00d4ff/i.test(css), '옛 청록 액센트 값이 남지 않아야 함');
});

test('묶음6-A 한글폰트 — index.html에 원티드 산스 로드, 폰트 토큰에 Wanted Sans, 옛 라틴폰트 제거', () => {
  const html = fs.readFileSync(path.join(DIR, '..', 'index.html'), 'utf8');
  assert.match(html, /wanted-sans/i, 'index.html 이 원티드 산스 웹폰트를 로드해야 함');
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  assert.match(css, /--font:\s*[^;]*Wanted Sans/i, '폰트 토큰에 Wanted Sans 가 포함돼야 함');
  assert.ok(css.includes('var(--font-mono)'), '폰트도 토큰(var(--font-mono))으로 적용돼야 함');
  assert.ok(!/'Inter'/.test(css), '안 불러오던 Inter 선언이 제거돼야 함');
  assert.ok(!/Bebas Neue|Space Grotesk|JetBrains Mono/.test(html), '옛 라틴 전용 폰트 로드가 제거돼야 함');
});

// ── 묶음6-B: 장식 선별 정리 (죽은 장식 CSS 삭제 + 무의미 라벨/아바타 제거 + 점류 발광만 제거) ──
test('묶음6-B renderMore — U 아바타 + 린매스 배지 + Built with science 제거, 프로필 핵심/푸터 유지', () => {
  const fresh = loadApp();
  const more = fresh.renderMore();
  // 제거
  assert.ok(!more.includes('avatar-box'), "프로필 'U' 아바타 박스 제거");
  assert.ok(!more.includes('린매스'), "무의미한 '린매스' 배지 제거");
  assert.ok(!more.includes('Built with science'), "'Built with science' 푸터 줄 제거");
  // 유지 (프로필 정보·목표·기존 푸터 브랜드는 남는다)
  assert.ok(more.includes('사용자'), '프로필 이름 유지');
  assert.ok(more.includes('목표'), '프로필 목표 요약(주 N회) 유지');
  assert.ok(more.includes('app-footer'), '앱 푸터 블록 유지');
  assert.ok(more.includes('Personal fitness tracker'), '푸터 기본 설명 유지');
});

// CSS/HTML은 render 하네스가 실행하지 않으므로 파일 텍스트로 특성화한다.
test('묶음6-B 장식 CSS — 죽은 pulse/animate-pulse/status-dot/avatar-box 삭제', () => {
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  assert.ok(!/@keyframes\s+pulse\b/.test(css), '죽은 @keyframes pulse(중복 포함) 제거');
  assert.ok(!/\.animate-pulse\b/.test(css), '안 쓰이는 .animate-pulse 제거');
  assert.ok(!/\.status-dot\b/.test(css), '안 쓰이는 헤더 .status-dot 제거');
  assert.ok(!/\.avatar-box\b/.test(css), '안 쓰이는 .avatar-box CSS 제거');
});

test('묶음6-B 코치 온라인점 — 점/규칙은 유지하되 발광(box-shadow)만 제거', () => {
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  const block = css.match(/\.coach-online-dot\s*\{([^}]*)\}/);
  assert.ok(block, '.coach-online-dot 규칙 자체는 유지(점은 남김)');
  assert.ok(!/box-shadow/.test(block[1]), '코치 온라인점 발광(box-shadow) 제거');
  // 상태 텍스트('온라인')는 screens.js 렌더에 그대로 있어야 함
  const screens = fs.readFileSync(path.join(DIR, '..', 'js', 'screens.js'), 'utf8');
  assert.ok(screens.includes('coach-online-dot'), '온라인점 마크업 유지');
  assert.ok(screens.includes('온라인'), '상태 텍스트(온라인) 유지');
});

// ── 묶음6-C① : 진입/피드백 애니메이션 (화면 떠오르기·세트완료 pop·완료축하 컨페티 + reduced-motion) ──
// CSS는 render 하네스가 실행하지 않으므로 파일 텍스트로 특성화. (#app.innerHTML은 스텁이라 검사 불가 → CSS 규칙으로 가드)
test('묶음6-C① 애니메이션 CSS — 진입/팝/축하/컨페티 keyframes·규칙 정의', () => {
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  assert.match(css, /@keyframes\s+screenRise\b/, '화면 진입 keyframe');
  assert.match(css, /\.screen-enter\s*>\s*\*/, '화면 진입은 자식 요소에만 적용(고정요소 보호)');
  assert.match(css, /@keyframes\s+popBounce\b/, '세트완료 pop keyframe');
  assert.match(css, /\.set-row\.just-completed\b/, '세트완료 pop 적용 규칙');
  assert.match(css, /@keyframes\s+popIn\b/, '완료 아이콘 등장 keyframe');
  assert.match(css, /\.complete-icon\.pop-in\b/, '완료 아이콘 pop-in 규칙');
  assert.match(css, /@keyframes\s+cardRise\b/, '완료 카드 스태거 keyframe');
  assert.match(css, /\.complete-celebrate-list\s*>\s*\*/, '완료 카드 스태거 규칙');
  assert.match(css, /@keyframes\s+confettiFall\b/, '컨페티 낙하 keyframe');
  assert.match(css, /\.confetti-piece\b/, '컨페티 조각 규칙');
});

test('묶음6-C① 접근성 — prefers-reduced-motion에서 동작 끔 + 컨페티 숨김', () => {
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  const m = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\n\})/);
  assert.ok(m, 'prefers-reduced-motion 미디어 블록 존재');
  assert.match(m[1], /animation-duration:\s*0\.0*1m?s\s*!important/i, '애니메이션 사실상 제거');
  assert.match(m[1], /confetti-layer[\s\S]*display:\s*none/i, '컨페티는 reduced-motion에서 숨김');
});

test('묶음6-C① renderWorkoutComplete — 축하 연출은 첫 진입 1회만(평점 재렌더 시 반복 안 함)', () => {
  const fresh = loadApp();
  fresh.state.completedSession = {
    date: new Date('2026-06-14T09:00:00'),
    newPRs: [],
    exercises: Array.from({ length: 5 }, (_, i) => ({ name: '종목' + (i + 1), reps: [8, 8], maxWeight: 50 + i })),
    duration: 40, sessionName: 'PUSH', exerciseCount: 5, setCount: 12, rpe: 0, condition: 0,
  };
  // 완료 첫 진입(축하 대기 플래그 ON)
  fresh.state._celebratePending = true;
  const first = fresh.renderWorkoutComplete();
  assert.ok(first.includes('complete-icon pop-in'), '첫 진입: 아이콘 pop-in');
  assert.ok(first.includes('complete-celebrate-list'), '첫 진입: 카드 스태거');
  assert.ok(first.includes('confetti-layer') && first.includes('confetti-piece'), '첫 진입: 컨페티');
  // 평점 탭 등으로 재렌더 → 축하 연출 빠짐(반복 방지)
  const second = fresh.renderWorkoutComplete();
  assert.ok(!second.includes('confetti-piece'), '재렌더: 컨페티 없음');
  assert.ok(!second.includes('pop-in'), '재렌더: 아이콘 pop-in 없음');
  assert.ok(!second.includes('complete-celebrate-list'), '재렌더: 카드 스태거 없음');
});

// ── 묶음6-C② : 핵심 시트 닫기 슬라이드 + 휴식 타이머 원형 링 + 종목 스와이프 방향 슬라이드 ──
test('묶음6-C② 닫기 슬라이드 CSS — slideDown/fadeOut keyframes + .closing 규칙', () => {
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  assert.match(css, /@keyframes\s+slideDown\b/, '닫기 슬라이드 keyframe');
  assert.match(css, /@keyframes\s+fadeOut\b/, '오버레이 페이드아웃 keyframe');
  assert.match(css, /\.sheet\.closing\b/, '시트 닫기 규칙');
  assert.match(css, /\.manual-input-sheet\.closing\b/, '입력 시트 닫기 규칙');
  assert.match(css, /\.sheet-overlay\.closing\b/, '오버레이 닫기 규칙');
  // 닫히는 동안: 시트 버튼은 비활성(취소 후 재실행 사고 방지)
  const sheetClosing = css.match(/\.sheet\.closing[^}]*\}/);
  assert.ok(sheetClosing && /pointer-events:\s*none/.test(sheetClosing[0]), '닫기 중 시트 버튼 차단(pointer-events:none)');
  // 오버레이는 계속 뒤 화면을 막아야 함 → none이면 탭이 통과되므로 금지
  const overlayClosing = css.match(/\.sheet-overlay\.closing[^}]*\}/);
  assert.ok(overlayClosing && !/pointer-events:\s*none/.test(overlayClosing[0]), '닫기 중 오버레이는 통과 방지(pointer-events:none 금지)');
});

test('묶음6-C② 닫기 슬라이드 — 핵심 시트 4종 dismiss가 공용 헬퍼 경유', () => {
  const app = loadApp();
  assert.equal(typeof app.animateSheetCloseThen, 'function', 'animateSheetCloseThen 전역 헬퍼 존재');
  const screens = fs.readFileSync(path.join(DIR, '..', 'js', 'screens.js'), 'utf8');
  const calls = (screens.match(/animateSheetCloseThen\(function/g) || []).length;
  assert.ok(calls >= 4, '닫기 4종(상세시트·프로필·API키·초기화확인)이 헬퍼 사용 (현재 ' + calls + ')');
});

test('묶음6-C② 휴식 원형 링 + 종목 스와이프 슬라이드 — CSS/마크업 마커', () => {
  const css = fs.readFileSync(path.join(DIR, '..', 'css', 'styles.css'), 'utf8');
  assert.match(css, /\.rest-ring-fg\b/, '휴식 progress 링 클래스');
  assert.match(css, /@keyframes\s+exSlide(Next|Prev)\b/, '종목 슬라이드 keyframe');
  assert.match(css, /\.ex-slide-(next|prev)\b/, '종목 슬라이드 클래스');
  const screens = fs.readFileSync(path.join(DIR, '..', 'js', 'screens.js'), 'utf8');
  assert.ok(screens.includes('rest-ring-fg'), '휴식 링 SVG 마크업');
  assert.ok(screens.includes("getElementById('rest-ring-fg')"), '휴식 링이 부분 갱신 경로(시트 열림 중)에서도 갱신됨');
  assert.ok(screens.includes('ex-slide-') || screens.includes("'ex-slide-'"), '종목 슬라이드 클래스 적용');
});

// ═══════════════════════════════════════════════
// 묶음6-D — 뒤로가기(자연스러운 단계 되돌리기)
//   폰/브라우저 뒤로가기로 "지금 떠 있는 가장 위 단계부터 한 겹씩" 닫는다.
//   getTopLayer()는 현재 state에서 가장 위 레이어를 판별(순수 함수) → 테스트 핵심.
// ═══════════════════════════════════════════════
test('묶음6-D getTopLayer — 현재 떠 있는 가장 위 레이어를 판별(우선순위)', () => {
  const a = loadApp();
  const s = a.state;
  assert.equal(typeof a.getTopLayer, 'function', 'getTopLayer 전역 함수 존재');

  // 홈 + 아무것도 안 열림 → root
  s.currentTab = 'home';
  assert.equal(a.getTopLayer(), 'root');

  // 비홈 탭 → tab
  s.currentTab = 'stats';
  assert.equal(a.getTopLayer(), 'tab');

  // 운동 탭 + 마법사 단계 (STEP1=탭 레벨, 2/3=마법사 한 겹)
  s.currentTab = 'workout'; s.workoutWizardStep = 1;
  assert.equal(a.getTopLayer(), 'tab', 'STEP1은 운동 탭 자체(탭 레벨)');
  s.workoutWizardStep = 2;
  assert.equal(a.getTopLayer(), 'wizard2');
  s.workoutWizardStep = 3;
  assert.equal(a.getTopLayer(), 'wizard3');

  // 진행 중 세션 (마법사보다 위)
  s.workoutWizardStep = 1;
  s.activeSession = { exercises: [], startTime: 1, currentExerciseIdx: 0 };
  assert.equal(a.getTopLayer(), 'session');
  // 세션 위 세트 편집 시트 → setEditor가 위
  s.editingSet = { exerciseIdx: 0, setIdx: 0 };
  assert.equal(a.getTopLayer(), 'setEditor');
  s.editingSet = null;
  // 세션 위 종목 교체 시트 → exerciseSwap이 위
  s.exerciseSwapOpen = true;
  assert.equal(a.getTopLayer(), 'exerciseSwap');
  s.exerciseSwapOpen = false;
  s.activeSession = null;

  // 완료 화면
  s.completedSession = { sessionName: 'PUSH' };
  assert.equal(a.getTopLayer(), 'completed');
  s.completedSession = null;

  // 전체화면 오버레이
  s.coachChatOpen = true;
  assert.equal(a.getTopLayer(), 'coachChat');
  s.coachChatOpen = false;
  s.oneRMListOpen = true;
  assert.equal(a.getTopLayer(), 'oneRMList');
  s.oneRMListOpen = false;

  // 탭 위 시트/모달 4종
  s.currentTab = 'stats';
  s.itemDetailSheet = { type: 'workout', data: {} };
  assert.equal(a.getTopLayer(), 'itemDetail');
  s.itemDetailSheet = null;
  s.currentTab = 'more';
  s.apiKeyModalOpen = true;
  assert.equal(a.getTopLayer(), 'apiKey');
  s.apiKeyModalOpen = false;
  s.profileEditModalOpen = true;
  assert.equal(a.getTopLayer(), 'profileEdit');
  s.profileEditModalOpen = false;
  s.resetConfirming = true;
  assert.equal(a.getTopLayer(), 'resetConfirm');
  s.resetConfirming = false;
});

test('묶음6-D navBack — 위 레이어부터 한 겹씩 닫음(오버레이·마법사·완료·세션)', () => {
  const a = loadApp();
  const s = a.state;
  assert.equal(typeof a.navBack, 'function', 'navBack 전역 함수 존재');

  // 오버레이(코치채팅) → 뒤로 → 닫힘, 뒤 화면 유지
  s.coachChatOpen = true;
  a.navBack();
  assert.equal(s.coachChatOpen, false, '코치채팅 닫힘');

  // 마법사 STEP3 → STEP2 → STEP1 (한 단계씩)
  s.currentTab = 'workout';
  s.workoutWizardStep = 3; s.selectedBodyPart = 'push'; s.generatedRoutine = { exercises: [] };
  a.navBack();
  assert.equal(s.workoutWizardStep, 2, 'STEP3→STEP2');
  a.navBack();
  assert.equal(s.workoutWizardStep, 1, 'STEP2→STEP1');

  // 완료 화면 → 뒤로 → 홈으로 닫힘
  s.completedSession = { sessionName: 'PUSH' };
  a.navBack();
  assert.equal(s.completedSession, null, '완료화면 닫힘');
  assert.equal(s.currentTab, 'home', '홈으로');

  // 진행 세션(완료 본세트 없음) → 뒤로 → 확인(stub=동의) → 세션 폐기
  s.activeSession = { exercises: [{ sets: [{ completed: false, isWarmup: false }] }], startTime: 1, currentExerciseIdx: 0 };
  a.navBack();
  assert.equal(s.activeSession, null, '세션 종료(확인창 동의 시)');
});

test('묶음6-D 탭 방문순서 — setTab이 스택 기록, navBack은 직전 탭으로', () => {
  const a = loadApp();
  const s = a.state;
  assert.deepEqual(plain(s._navTabStack), ['home'], '부팅 시 홈만');

  a.setTab('stats');
  assert.deepEqual(plain(s._navTabStack), ['home', 'stats']);
  a.setTab('more');
  assert.deepEqual(plain(s._navTabStack), ['home', 'stats', 'more']);
  assert.equal(s.currentTab, 'more');

  // 뒤로 → 직전 탭(stats)
  a.navBack();
  assert.equal(s.currentTab, 'stats');
  assert.deepEqual(plain(s._navTabStack), ['home', 'stats']);
  // 뒤로 → 홈
  a.navBack();
  assert.equal(s.currentTab, 'home');

  // 같은 탭 연속 진입은 중복 push 안 함
  a.setTab('running'); a.setTab('running');
  assert.deepEqual(plain(s._navTabStack), ['home', 'running']);
  // 홈으로 가면 스택 리셋(루트 정규화)
  a.setTab('home');
  assert.deepEqual(plain(s._navTabStack), ['home']);
});

test('묶음6-D 루트 종료 — 홈에서 뒤로는 바로 종료 허용(흡수·재확인 없음)', () => {
  const a = loadApp();
  const s = a.state;
  s.currentTab = 'home';
  assert.equal(a.getTopLayer(), 'root');

  // 홈에서 뒤로 = 앱 종료(폰 첫화면). 토스트·재확인 없이 첫 뒤로부터 종료 허용(false 반환).
  assert.equal(a.navBack(), false, '홈에서 뒤로는 바로 종료 허용');
  assert.equal(s.currentTab, 'home', '화면 그대로');
});

test('묶음6-D 뒤로가기 배선 — popstate 리스너 + 부팅 트랩(ensureBackTrap) + 핵심 함수', () => {
  const screens = fs.readFileSync(path.join(DIR, '..', 'js', 'screens.js'), 'utf8');
  assert.match(screens, /addEventListener\(\s*['"]popstate['"]/, 'popstate 리스너 등록');
  assert.ok(screens.includes('function ensureBackTrap'), '트랩 확보 함수(ensureBackTrap) 정의');
  assert.match(screens, /ensureBackTrap\(\)/, '부팅 시 트랩 확보 호출');
  assert.match(screens, /history\.pushState\(/, '트랩용 pushState 사용');
  assert.ok(screens.includes('function getTopLayer') && screens.includes('function navBack'), '뒤로가기 핵심 함수 정의');
});

// ═══════════════════════════════════════════════
// 코치 지식 강화 — 지식 베이스 확장 + 질문 유형별 답변 + prompt caching
// ═══════════════════════════════════════════════

// ── Cycle A: 지식 베이스 상수 (data.js) — 운동과학 전 영역 + 근거 표기 ──
test('코치지식 COACH_KNOWLEDGE — 운동/부상/보충제/회복 전 영역 + 근거', () => {
  const app = loadApp();
  assert.equal(typeof app.COACH_KNOWLEDGE, 'string', 'COACH_KNOWLEDGE 문자열 상수 존재');
  assert.ok(app.COACH_KNOWLEDGE.length > 2500, '지식 베이스가 충분히 풍부 (기존 ~25줄 대비 대폭 확장)');
  // 도메인 커버리지: 새로 추가된 영역들이 실제로 들어있어야 함
  const k = app.COACH_KNOWLEDGE;
  assert.ok(k.includes('자세') || k.includes('폼'), '종목 자세/폼 큐 포함');
  assert.ok(k.includes('부상') || k.includes('통증'), '부상·통증 대응 포함');
  assert.ok(k.includes('크레아틴') && k.includes('카페인'), '보충제(크레아틴/카페인) 포함');
  assert.ok(k.includes('워밍업') || k.includes('가동성'), '워밍업·가동성 포함');
  // 근거 표기(메타분석 저자/연도)는 유지
  assert.ok(/Pelland|Schoenfeld|Morton/.test(k), '메타분석 근거 표기 유지');
});

// ── Cycle B: 캐싱 분리 — 고정(지식) 블록과 가변(사용자데이터) 블록 ──
test('코치지식 buildCoachSystemParts — 고정 지식블록 / 가변 사용자블록 분리', () => {
  const app = loadApp();
  assert.equal(typeof app.buildCoachSystemParts, 'function', 'buildCoachSystemParts 함수 존재');
  const parts = app.buildCoachSystemParts();
  assert.equal(typeof parts.stable, 'string', 'stable(고정) 블록 존재');
  assert.equal(typeof parts.dynamic, 'string', 'dynamic(가변) 블록 존재');
  // 고정 블록: 지식 베이스 포함, 사용자 데이터는 없어야 캐시가 호출마다 적중
  assert.ok(parts.stable.includes('크레아틴'), '고정 블록에 지식 베이스 주입');
  assert.ok(!parts.stable.includes('사용자 정보'), '고정 블록에 사용자 데이터 없음(캐시 적중 위해)');
  // 가변 블록: 사용자 컨텍스트 포함
  assert.ok(parts.dynamic.includes('사용자 정보') || parts.dynamic.includes('사용자 현재 데이터'), '가변 블록에 사용자 데이터');
});

// ── Cycle C: 질문 유형별 답변 + 옛 "데이터 안에서만" 제약 제거 + 레거시 보존 ──
test('코치지식 getCoachSystemPrompt — 질문 유형 분기 + 입막음 제거 + 레거시 유지', () => {
  const app = loadApp();
  const sys = app.getCoachSystemPrompt();
  // 새: 질문 유형별 답변 지시(일반 지식 질문 허용)
  assert.ok(sys.includes('질문 유형') || sys.includes('일반 운동'), '질문 유형별 답변 지시 주입');
  assert.ok(sys.includes('지식 베이스') || sys.includes('크레아틴'), '지식 베이스가 프롬프트에 포함');
  // 옛 입막음 제약 제거
  assert.ok(!sys.includes('위 데이터 안에서만'), '"위 데이터 안에서만 답하기" 제약 제거');
  assert.ok(!sys.includes('데이터에 없는 추측 금지'), '"데이터에 없는 추측 금지" 제약 제거');
  // 레거시 보존 (기존 테스트와 동일 계약)
  assert.ok(sys.includes('기억 노트'), '기억 노트 섹션 유지');
  assert.ok(!sys.includes('```memory'), '자동 memory 저장 지시 제거됨');
  assert.ok(sys.includes('5주 사이클'), '5주 사이클 표현 유지');
});

// ── Cycle D: callCoachAPI — system 배열 + cache_control(prompt caching) ──
test('코치지식 callCoachAPI — system 배열 + cache_control ephemeral(고정), 가변 분리', async () => {
  const app = loadApp();
  app.state.apiKey = 'sk-test';
  let captured = null;
  app.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: 'ok' }] }),
      text: () => Promise.resolve(''),
    });
  };
  const res = await app.callCoachAPI([{ role: 'user', content: '안녕' }]);
  assert.equal(res.text, 'ok', '정상 응답 파싱');
  assert.ok(Array.isArray(captured.system), 'system이 배열(캐싱 구조)');
  assert.ok(captured.system.length >= 2, '고정/가변 두 블록으로 분리');
  // 고정 블록: 지식 + cache_control, 사용자 데이터 없음(호출마다 동일 → 캐시 적중)
  assert.equal(captured.system[0].type, 'text');
  assert.deepEqual(captured.system[0].cache_control, { type: 'ephemeral' }, '고정 블록에 cache_control ephemeral');
  assert.ok(captured.system[0].text.includes('크레아틴'), '고정 블록 = 지식 베이스');
  assert.ok(!captured.system[0].text.includes('사용자 정보'), '고정 블록에 사용자 데이터 없음');
  // 가변 블록: 사용자 데이터, 캐시 분기점 뒤라 cache_control 없음
  assert.ok(captured.system[1].text.includes('사용자 정보') || captured.system[1].text.includes('사용자 현재 데이터'), '두 번째 블록 = 사용자 데이터');
  assert.ok(!captured.system[1].cache_control, '가변 블록엔 cache_control 없음');
});

// ── Phase B: 루틴 생성 — 지식 주입 + 캐싱 ──
test('코치지식 generateFullRoutine — 지식 주입 + cache_control(캐싱)', async () => {
  const app = loadApp();
  app.state.apiKey = 'sk-test';
  let captured = null;
  app.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: '{"headline":"t","reason":"r","exercises":[{"name":"벤치프레스","type":"복합","isMain":true,"sets":3,"reps":"6-8","weight":60,"rir":2,"note":"n"}]}' }] }),
      text: () => Promise.resolve(''),
    });
  };
  await app.generateFullRoutine('push');
  assert.ok(captured, 'fetch 호출됨');
  assert.ok(Array.isArray(captured.system), 'system 배열(캐싱 구조)');
  assert.deepEqual(captured.system[0].cache_control, { type: 'ephemeral' }, '고정 블록 cache_control ephemeral');
  assert.ok(captured.system[0].text.includes('크레아틴'), '고정 블록 = 지식 베이스');
  assert.ok(captured.system[1].text.includes('루틴'), '가변 블록 = 기존 루틴 프롬프트');
  assert.ok(!captured.system[1].cache_control, '가변 블록엔 cache_control 없음');
});

// ── Phase B: 루틴 수정·질문 대화 — 지식 주입 + 캐싱 ──
test('코치지식 modifyRoutineWithAI — 지식 주입 + cache_control(캐싱)', async () => {
  const app = loadApp();
  app.state.apiKey = 'sk-test';
  let captured = null;
  app.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: '{"intent":"question","reply":"ok","changes":[],"updatedRoutine":null}' }] }),
      text: () => Promise.resolve(''),
    });
  };
  const routine = { headline: 'h', bodyPart: 'push', isFree: false, exercises: [{ name: '벤치프레스', type: '복합', sets: 3 }] };
  await app.modifyRoutineWithAI(routine, '어깨 더 넣어줘', []);
  assert.ok(captured, 'fetch 호출됨');
  assert.ok(Array.isArray(captured.system), 'system 배열(캐싱 구조)');
  assert.deepEqual(captured.system[0].cache_control, { type: 'ephemeral' }, '고정 블록 cache_control ephemeral');
  assert.ok(captured.system[0].text.includes('크레아틴'), '고정 블록 = 지식 베이스');
  assert.ok(captured.system[1].text.includes('루틴'), '가변 블록 = 기존 수정 프롬프트');
  assert.ok(!captured.system[1].cache_control, '가변 블록엔 cache_control 없음');
});

// ── Phase B: 주간 리뷰 — 지식 주입(품질↑), 캐싱은 미적용(주 1회 호출이라 효과 없음) ──
test('코치지식 generateWeeklyReview — 지식 주입(문자열 system), 캐싱 미적용', async () => {
  const app = loadApp();
  app.state.apiKey = 'sk-test';
  let captured = null;
  app.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: '{"headline":"h","grade":"A","wins":[],"improvements":[],"nextWeek":[],"coachNote":"n"}' }] }),
      text: () => Promise.resolve(''),
    });
  };
  await app.generateWeeklyReview(true);
  assert.ok(captured, 'fetch 호출됨');
  assert.equal(typeof captured.system, 'string', 'system 문자열(캐싱 미적용)');
  assert.ok(captured.system.includes('크레아틴'), '지식 베이스 주입됨');
  assert.ok(captured.system.includes('등급') || captured.system.includes('주간 리뷰'), '기존 주간 리뷰 프롬프트 유지');
});
