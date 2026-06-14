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

// ── 음식 이름 정규화 ──
test('normalizeFood — 공백 제거', () => {
  assert.equal(app.normalizeFood('닭 가슴살'), '닭가슴살');
});

// ── 1RM 조회 + 작업 무게 추천 (init()이 INITIAL_1RM을 시드함 → 저장소 경로까지 포함) ──
test('get1RM / suggestWorkingWeight — 시드된 1RM 기반', () => {
  assert.equal(app.get1RM('레그 프레스'), 216);
  assert.equal(app.suggestWorkingWeight('레그 프레스', 0.7), 150); // round(216*0.7/2.5)*2.5
});

// ── 음식 분석 (DB/별칭/부분매칭 + 영양소 계산) ──
test('analyzeFoodInput — 부분매칭과 strict 모드', () => {
  // strict=true: "닭가슴살 200g"은 정확/별칭 매칭 실패 → 미매칭(=AI로 보냄)
  assert.deepEqual(plain(app.analyzeFoodInput('닭가슴살 200g', true)), {
    matched: [],
    unmatched: ['닭가슴살 200g'],
  });
  // non-strict: "현미밥 한 공기" → 부분매칭 + 1공기 영양소
  assert.deepEqual(plain(app.analyzeFoodInput('현미밥 한 공기', false)), {
    matched: [
      { name: '현미밥', amount: '1공기', rawAmount: 1, unit: '공기', defaulted: false, protein: 7, kcal: 320, carbs: 65, fat: 2 },
    ],
    unmatched: [],
  });
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
  assert.ok(sys.includes('```memory'), 'memory 블록 저장 지시');
  assert.ok(sys.includes('5주 사이클'), '5주 사이클로 정정');
  assert.ok(!sys.includes('5~6주 사이클 (적응'), '옛 5~6주 표현 제거');
});

// ═══════════════════════════════════════════════
// 묶음5 — 화면정리 (중복·죽은 위젯 제거)
// ═══════════════════════════════════════════════

test('묶음5 renderHome — 요약판: 코치카드/빠른입력/최근PR/끼니분배 제거, 핵심 요약 유지', () => {
  const fresh = loadApp();
  fresh.state.data.personalRecords = [
    { exerciseName: '벤치프레스', weight: 100, previousWeight: 95, reps: 5, date: '2026-06-10' },
  ];
  const home = fresh.renderHome();
  // 제거
  assert.ok(!home.includes('openCoachChat'), '홈 코치 메시지 카드 제거');
  assert.ok(!home.includes('빠른 입력'), '빠른 입력 섹션 제거');
  assert.ok(!home.includes("setTab('workout')") && !home.includes("setTab('fuel')") && !home.includes("setTab('stats')"), '하단 바로가기 버튼 제거');
  assert.ok(!home.includes('최근 PR'), '홈 최근 PR 카드 제거(기록 탭으로)');
  assert.ok(!home.includes('끼니 분배'), '홈 단백질 끼니분배 상세 제거(영양 탭으로)');
  // 유지
  assert.ok(home.includes('오늘 단백질'), '단백질 한 줄 요약 유지');
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

test('묶음5 renderFuel — 코치카드 + 빈끼니 죽은버튼 제거, 도넛/매크로 유지', () => {
  const fresh = loadApp();
  const fuel = fresh.renderFuel();
  assert.ok(!fuel.includes('COACH'), '영양 코치 메시지 카드 제거');
  assert.ok(!fuel.includes('+ 추가'), '빈 끼니 죽은 "+ 추가" 버튼 제거');
  assert.ok(fuel.includes('donut-chart'), '단백질 도넛 유지');
  assert.ok(fuel.includes('탄수화물') && fuel.includes('지방'), '탄수화물/지방 매크로 막대 유지');
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
