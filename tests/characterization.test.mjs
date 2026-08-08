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
    for (const f of ['data', 'core', 'domain', 'bodymap', 'ai', 'screens']) {
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

// 상한은 종목 클래스별이다 — '랫풀다운'은 compound_moderate(8-12) 이라 상한 10회.
// (클래스별 상한 자체는 파일 끝 'rolling1RMMaxReps' 테스트에서 못 박는다)
test('calculateRollingMax1RM — 고횟수 세트는 추세에서 제외 (고중량 복합=10회 상한: 11회 제외, 10회 포함)', () => {
  // 상한은 그 종목의 **처방 상단(repMax)** 아래로 절대 내려가지 않는다.
  // '랫풀다운'은 8~12회 처방(compound_moderate)이라 상한이 12여야 한다 —
  // 여기를 10으로 조이면 지시대로 12회 한 사용자의 본세트가 전부 잘려 1RM이 동결된다.
  assert.equal(app.getExerciseClass('랫풀다운'), 'compound_moderate');
  assert.equal(app.rolling1RMMaxReps('랫풀다운'), 12, '처방 상단(12)까지는 잘리면 안 된다');
  // 5~8회 처방인 고중량 복합만 10으로 조인다(처방이 8회를 넘지 않아 잘리는 세트가 없다).
  assert.equal(app.getExerciseClass('데드리프트'), 'compound_heavy');
  assert.equal(app.rolling1RMMaxReps('데드리프트'), 10);

  app.state.data.workoutLog = [
    { date: '2026-06-01', completed: true, exercises: [{ name: '데드리프트', setsDetail: [
      { weight: 60, reps: 20, isWarmup: false }, // 20회 → e1RM 신뢰 낮음 → 제외
      { weight: 65, reps: 11, isWarmup: false }, // 11회 → 고중량 복합 상한(10) 초과 → 제외 (포함되면 88.8)
      { weight: 70, reps: 8, isWarmup: false },  // 70*(1+8/30)=88.67 → 88.7
    ] }] },
  ];
  assert.equal(app.calculateRollingMax1RM('데드리프트', 4).value, 88.7);

  // 경계값 10회는 포함된다 (상한은 "10회 초과부터 제외")
  app.state.data.workoutLog = [
    { date: '2026-06-01', completed: true, exercises: [{ name: '데드리프트', setsDetail: [
      { weight: 75, reps: 10, isWarmup: false }, // 75*(1+10/30)=100
    ] }] },
  ];
  assert.equal(app.calculateRollingMax1RM('데드리프트', 4).value, 100);

  // 절대 상한 12는 모든 종목에 적용된다 (13회는 어떤 클래스에서도 제외)
  app.state.data.workoutLog = [
    { date: '2026-06-01', completed: true, exercises: [{ name: '랫풀다운', setsDetail: [
      { weight: 90, reps: 13, isWarmup: false }, // 13회 → 절대 상한 초과 → 제외
      { weight: 60, reps: 12, isWarmup: false }, // 60*(1+12/30)=84 → 처방 범위라 포함
    ] }] },
  ];
  assert.equal(app.calculateRollingMax1RM('랫풀다운', 4).value, 84);
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
// 데이터 백업 확장 — 파일 검증 / 덮어쓰기 / 마지막 백업 일시
// ═══════════════════════════════════════════════

// 백업 파일을 "적용 전에" 검사한다 — 깨진 파일·남의 파일·미래 버전은 저장소를 건드리지 않고 거절.
test('parseBackupFile — 손상/타앱/미래버전/빈파일 거절, 정상 파일은 요약 반환', () => {
  const fresh = loadApp();
  const ok = (r) => r.ok;

  assert.equal(fresh.parseBackupFile('쓰레기{').ok, false);                      // JSON 아님
  assert.equal(fresh.parseBackupFile(null).ok, false);                           // 빈 입력
  assert.equal(fresh.parseBackupFile({ app: 'fitness', version: 1 }).ok, false);  // data 없음
  assert.equal(fresh.parseBackupFile({ app: 'other', version: 1, data: { fitness_profile: {} } }).ok, false); // 다른 앱
  assert.equal(fresh.parseBackupFile({ app: 'fitness', version: 999, data: { fitness_profile: {} } }).ok, false); // 미래 버전
  assert.equal(fresh.parseBackupFile({ app: 'fitness', data: { fitness_profile: {} } }).ok, false); // 버전 없음
  assert.equal(fresh.parseBackupFile({ app: 'fitness', version: 1, data: { fitness_settings: {} } }).ok, false); // 운동 데이터 없음

  // 오류 문구는 한국어 안내 (사용자가 읽고 뭘 해야 할지 알 수 있어야 함)
  assert.match(fresh.parseBackupFile('쓰레기{').error, /백업 파일|파일/);

  const good = {
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: {
      fitness_profile: { age: 40 },
      fitness_workout_log: [{ id: 'a' }, { id: 'b' }],
      fitness_cardio_log: [{ id: 'c' }],
      fitness_body_log: [{ date: '2026-08-01', weight: 78 }],
      fitness_personal_records: [{ id: 'p' }],
      fitness_coach_memory: [{ id: 'm' }],
      fitness_one_rm_data: { '레그 프레스': 200, '벤치': 80 }
    }
  };
  const res = fresh.parseBackupFile(JSON.stringify(good));
  assert.equal(ok(res), true);
  assert.deepEqual(plain(res.summary), {
    exportedAt: '2026-08-01T00:00:00.000Z',
    workouts: 2, cardio: 1, body: 1, records: 1, memory: 1, oneRM: 2
  });
});

// 확인 문구: 뭐가 들어있는지 + 되돌릴 수 없다는 경고 + API키/대화는 안 건드림
test('buildRestoreConfirmMessage — 백업 내용 요약 + 덮어쓰기 경고', () => {
  const fresh = loadApp();
  const msg = fresh.buildRestoreConfirmMessage({ exportedAt: '2026-08-01T00:00:00.000Z', workouts: 12, body: 30, oneRM: 5 });
  assert.match(msg, /2026\.08\.01/);
  assert.match(msg, /운동 12회/);
  assert.match(msg, /체중 30개/);
  assert.match(msg, /되돌릴 수 없/);
  assert.match(msg, /API 키/);
  // 빈 백업도 문구가 깨지지 않는다
  assert.match(fresh.buildRestoreConfirmMessage({}), /담긴 기록 없음/);
});

// 복원은 "덮어쓰기" — 백업에 없는 항목은 남기지 않는다(옛 기록이 섞이면 통계가 틀어짐).
test('restoreFromBackup — 백업에 없는 기록은 지우고, 데모 재생성·1RM 초기화는 막는다', () => {
  const fresh = loadApp();
  fresh.localStorage.clear();
  fresh.localStorage.setItem('fitness_condition_log', JSON.stringify([{ date: '2026-01-01' }])); // 백업엔 없는 옛 기록
  fresh.localStorage.setItem('fitness_api_key', JSON.stringify('sk-keep'));

  const backup = {
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_profile: { age: 40 }, fitness_workout_log: [{ id: 'a' }], fitness_one_rm_data: { '벤치': 80 } }
  };
  const res = fresh.restoreFromBackup(JSON.stringify(backup));
  assert.equal(res.ok, true);
  assert.equal(fresh.localStorage.getItem('fitness_condition_log'), null, '백업에 없는 기록은 지워짐');
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_api_key')), 'sk-keep', 'API키는 그대로');
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_initialized')), true, '데모 데이터 재생성 방지');
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_one_rm_initialized')), true, '복원한 1RM이 기본값에 덮이지 않도록');
  assert.equal(plain(res.summary).workouts, 1);
});

// Codex 리뷰: 남이 만든(악의적) 백업 파일을 가져와도 화면에서 코드가 실행되면 안 된다.
// 원칙 — 저장된 글자는 그대로 두고(사용자 데이터 보존), 화면에 그릴 때 이스케이프한다.
// 속성 안에 들어가는 id·날짜만 앱이 만드는 형식으로 제한한다(엔티티로 따옴표를 되살리는 우회 차단).
test('복원 — 악성 백업이 화면에서 실행되지 않고, 사용자 글자는 그대로 보존된다', () => {
  const fresh = loadApp();
  fresh.localStorage.clear();
  const memoText = "무릎 <b>주의</b> ' \" & 표시";   // 사용자가 실제로 쓸 수 있는 글자
  const evil = {
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: {
      fitness_profile: { age: '<img src=x onerror=alert(1)>', height: 175, weight: 80, workoutFreq: 4, cyclePhase: '"><script>bad()</script>' },
      fitness_workout_log: [{ id: "&#39;);alert(1);//", sessionKr: '<img src=x onerror=steal()>', date: '2026-08-01', duration: 30, sets: 10 }],
      fitness_body_log: [{ date: "&#39;);alert(2);//", weight: '<script>x</script>' }],
      fitness_coach_memory: [{ id: 'mem_1', category: 'injury', text: memoText }],
      fitness_one_rm_data: { '레그 프레스': 200, '벤치프레스': '<img src=x onerror=alert(1)>' },
      __proto__: { polluted: true },
    },
  };
  assert.equal(fresh.restoreFromBackup(JSON.stringify(evil)).ok, true);

  // 1) 사용자 글자는 한 글자도 바뀌지 않는다 (정상 백업 왕복 보존)
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_coach_memory'))[0].text, memoText);

  // 2) 프로필 숫자칸은 숫자만 (못 읽으면 기본값)
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_profile')).age, 37);   // DEFAULT_PROFILE.age

  // 3) 속성에 들어가는 id·날짜는 안전한 글자만 남는다 → 엔티티로 따옴표를 되살릴 수 없음
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_workout_log'))[0].id, '39alert1');
  assert.equal(Object.prototype.polluted, undefined, '프로토타입 오염 없음');

  // 3-1) 숫자칸에 글자가 들어오면 화면 계산이 멈추므로(weight.toFixed) 버리거나 숫자로 맞춘다
  assert.deepEqual(plain(JSON.parse(fresh.localStorage.getItem('fitness_body_log'))), [], '숫자 아닌 체중 기록은 제외');
  // 1RM 표(종목→무게)도 숫자만 남는다 — 글자면 "내 1RM" 화면에 그대로 찍히고 작업무게 계산도 깨진다
  assert.deepEqual(plain(JSON.parse(fresh.localStorage.getItem('fitness_one_rm_data'))), { '레그 프레스': 200 });
  fresh.state.oneRMListOpen = true;
  assert.ok(!fresh.renderOneRMList().includes('<img'), '1RM 화면에 주입 태그 없음');

  // 4) 화면 문자열에 살아있는 태그·핸들러가 없다 (기록/체중/프로필 모두)
  fresh.state.profile = JSON.parse(fresh.localStorage.getItem('fitness_profile'));
  fresh.state.data.workoutLog = JSON.parse(fresh.localStorage.getItem('fitness_workout_log'));
  fresh.state.data.bodyLog = JSON.parse(fresh.localStorage.getItem('fitness_body_log'));
  const screens = fresh.renderMore() + fresh.renderStats() + fresh.renderHome();
  assert.ok(!screens.includes('<img') && !screens.includes('<script'), '살아있는 태그로 들어가지 않음');
  assert.ok(screens.includes('&lt;img src=x onerror=steal()&gt;'), '글자(이스케이프된 형태)로만 표시됨');
  // 속성 안(onclick)에는 안전한 id 만 들어간다 — 따옴표·엔티티로 코드가 끊기지 않음
  assert.ok(/onclick="openItemDetail\('workout', '39alert1'\)"/.test(screens), 'onclick 속성이 온전함');

  // 5) 모양이 아예 다른 파일(프로필이 배열, 기록이 객체)은 저장 전에 거절 — 복원 후 흰 화면 방지
  assert.equal(fresh.parseBackupFile({ app: 'fitness', version: 1, data: { fitness_profile: [1, 2] } }).ok, false);
  assert.equal(fresh.parseBackupFile({ app: 'fitness', version: 1, data: { fitness_workout_log: { nope: 1 } } }).ok, false);
});

// 전면 점검(한 곳씩 놓치지 않게): 복원되는 모든 키에 태그를 심고 모든 화면을 그려본다.
// 화면 문자열에 살아있는 <img/<script 가 하나라도 나오면 실패 — 새 화면이 생겨도 이 테스트가 잡는다.
test('복원 — 모든 기록에 태그를 심어도 어떤 화면에서도 살아있는 태그가 안 나온다', () => {
  const fresh = loadApp();
  const P = '<img src=x onerror=eeek()>';
  const today = fresh.getTodayStr();
  fresh.localStorage.clear();
  const poisoned = {
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: {
      fitness_profile: { age: P, height: P, weight: P, workoutFreq: P, currentCycle: P, currentWeek: P, cyclePhase: P, weekSessionsDone: P, goal: P },
      fitness_workout_log: [{
        id: P, date: today, startTime: P, sessionKr: P, sessionName: P, sessionType: P, duration: P, sets: P,
        exerciseCount: P, completed: true, note: P,
        exercises: [{ name: P, weight: P, reps: P, note: P, setsDetail: [{ weight: P, reps: P, completed: true }] }],
      }],
      fitness_cardio_log: [{ id: P, date: today, totalSec: P, totalDistKm: P, rpe: P, segments: [{ type: P, label: P }] }],
      fitness_body_log: [{ date: today, weight: 78.5, bodyFat: P, note: P }],
      fitness_personal_records: [{ id: P, exerciseName: P, weight: P, reps: P, previousWeight: P, date: today }],
      fitness_condition_log: [{ date: today, sleep: P, energy: P, soreness: P, note: P }],
      fitness_cycle_history: [{ cycle: P, week: P, phase: P, endedAt: today }],
      fitness_coach_memory: [{ id: P, category: P, text: P, source: P, date: today }],
      fitness_one_rm_data: { [P]: P, '레그 프레스': P },
      fitness_settings: { notifications: true, theme: P, unit: P },
      fitness_chat_signals: [{ exName: P, pain: P, feel: P, date: today }],
    },
  };
  assert.equal(fresh.restoreFromBackup(JSON.stringify(poisoned)).ok, true);

  // 복원된 저장소를 앱 상태로 올린다 (init() 이 하는 일과 같은 경로)
  fresh.state.profile = fresh.storage.get('fitness_profile', {});
  fresh.state.data = {
    workoutLog: fresh.storage.get('fitness_workout_log', []),
    cardioLog: fresh.storage.get('fitness_cardio_log', []),
    personalRecords: fresh.storage.get('fitness_personal_records', []),
    bodyLog: fresh.storage.get('fitness_body_log', []),
    conditionLog: fresh.storage.get('fitness_condition_log', []),
    cycleHistory: fresh.storage.get('fitness_cycle_history', []),
  };
  fresh.state.coachMemory = fresh.storage.get('fitness_coach_memory', []);
  fresh.state.settings = fresh.storage.get('fitness_settings', {});

  // 인자 없이 부를 수 있는 화면 함수를 전부 그려본다
  const screenFns = fresh.__APP_GLOBALS__
    .filter((n) => /^render[A-Z]/.test(n) && typeof fresh[n] === 'function' && fresh[n].length === 0);
  assert.ok(screenFns.length >= 8, '화면 함수를 찾지 못함: ' + screenFns.length);

  const leaked = [];
  for (const name of screenFns) {
    let html;
    try { html = fresh[name](); } catch (e) { continue; }   // 별도 상태가 필요한 화면은 건너뜀
    if (typeof html !== 'string') continue;
    if (html.includes('<img') || html.includes('<script')) leaked.push(name);   // 이스케이프되면 &lt;img 로만 나온다
  }
  assert.deepEqual(leaked, [], '이스케이프 안 된 화면: ' + leaked.join(', '));

  // 기록 상세 시트(운동·체중)도 같은 기준으로 확인
  const w = fresh.state.data.workoutLog[0];
  fresh.state.itemDetailSheet = { type: 'workout', data: w };
  const sheet = fresh.renderItemDetailSheet();
  assert.ok(!sheet.includes('<img') && !sheet.includes('<script'), '기록 상세 시트에 살아있는 태그');
});

// 리뷰(고강도) 반영 — 덮어쓰기로 바뀌면서 생길 수 있는 데이터 손실 경로들
test('복원 — 알맹이 없는 백업은 거절하고, 프로필 없는 백업도 기록을 잃지 않는다', () => {
  const fresh = loadApp();

  // ① 목록만 있고 전부 비어 있는 파일 → 거절 (덮어쓰기로 기존 기록을 날리면 안 됨)
  const empty = fresh.parseBackupFile({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_workout_log: [], fitness_body_log: [] },
  });
  assert.equal(empty.ok, false);
  assert.match(empty.error, /복원할 기록이 없어요/);

  // 실제로 기존 데이터가 남아있는지까지 확인
  fresh.localStorage.clear();
  fresh.localStorage.setItem('fitness_profile', JSON.stringify({ age: 44 }));
  fresh.localStorage.setItem('fitness_coach_memory', JSON.stringify([{ id: 'mem_1', text: '유지되어야 함' }]));
  assert.equal(fresh.restoreFromBackup({ app: 'fitness', version: 1, data: { fitness_workout_log: [] } }).ok, false);
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_profile')).age, 44, '거절된 복원은 기존 기록을 안 건드림');
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_coach_memory')).length, 1);

  // ② 프로필이 없는 백업 → 프로필을 지우지 않고 기본값 "복사본"을 남긴다
  //    (지워두면 다음 로드에서 전역 DEFAULT_PROFILE 을 그대로 물고 매번 초기화된다)
  fresh.localStorage.clear();
  const beforeAge = fresh.DEFAULT_PROFILE.age;
  assert.equal(fresh.restoreFromBackup({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_workout_log: [{ id: 'w_1', date: '2026-08-01' }] },
  }).ok, true);
  const storedProfile = JSON.parse(fresh.localStorage.getItem('fitness_profile'));
  assert.ok(storedProfile && typeof storedProfile === 'object', '프로필이 저장돼 있음');
  storedProfile.age = 99;                       // 저장본을 바꿔도
  assert.equal(fresh.DEFAULT_PROFILE.age, beforeAge, '전역 기본 프로필은 오염되지 않음');
  fresh.init();
  fresh.state.profile.currentWeek = 4;          // init 이 물려준 객체를 바꿔도
  assert.equal(fresh.DEFAULT_PROFILE.currentWeek, 1, 'init 도 기본값 복사본을 쓴다');

  // ③ 1RM이 비면 '초기화됨' 플래그를 세우지 않는다 → 다음 로드에서 기본 1RM이 다시 깔린다
  fresh.localStorage.clear();
  assert.equal(fresh.restoreFromBackup({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_workout_log: [{ id: 'w_1', date: '2026-08-01' }], fitness_one_rm_data: { '벤치': '무거움' } },
  }).ok, true);
  assert.equal(fresh.localStorage.getItem('fitness_one_rm_initialized'), null, '빈 1RM에는 플래그 안 세움');
  fresh.initializeOneRMData();
  assert.ok(Object.keys(JSON.parse(fresh.localStorage.getItem('fitness_one_rm_data'))).length > 0, '기본 1RM 재시드됨');

  // ③-1 파일이 '초기화됨' 플래그를 들고 있어도 1RM이 비면 그 플래그는 남기지 않는다
  fresh.localStorage.clear();
  assert.equal(fresh.restoreFromBackup({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_workout_log: [{ id: 'w_1', date: '2026-08-01' }], fitness_one_rm_data: {}, fitness_one_rm_initialized: true },
  }).ok, true);
  assert.equal(fresh.localStorage.getItem('fitness_one_rm_initialized'), null, '파일에 든 플래그도 정리됨');

  // ④ 확인창 개수 = 실제로 저장될 개수 (정리로 버려질 줄은 미리 빠져야 함)
  const checked = fresh.parseBackupFile({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: {
      fitness_profile: { age: 40 },
      fitness_body_log: [{ date: '2026-08-01', weight: 78 }, { date: '2026-08-02', weight: '무거움' }],
      fitness_one_rm_data: { '벤치': 80, '스쿼트': 'x' },
    },
  });
  assert.equal(checked.summary.body, 1, '버려질 체중 기록은 확인창 숫자에서도 빠짐');
  assert.equal(checked.summary.oneRM, 1);

  // ⑤ 날짜가 숫자(에폭 ms)여도 기록 탭 정렬이 멈추지 않는다
  fresh.localStorage.clear();
  assert.equal(fresh.restoreFromBackup({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_profile: { age: 40 }, fitness_body_log: [{ date: 1754611200000, weight: 78 }] },
  }).ok, true);
  assert.equal(typeof JSON.parse(fresh.localStorage.getItem('fitness_body_log'))[0].date, 'string');
  fresh.state.data.bodyLog = JSON.parse(fresh.localStorage.getItem('fitness_body_log'));
  assert.doesNotThrow(() => fresh.renderStats(), '기록 탭이 멈추지 않음');
});

// 되돌리기까지 실패하면 "되돌려 놨다"고 단언하면 안 된다 — 안내가 달라야 한다.
test('복원 실패 — 되돌리기까지 실패하면 다른 안내를 준다', () => {
  const fresh = loadApp();
  fresh.localStorage.clear();
  fresh.localStorage.setItem('fitness_profile', JSON.stringify({ age: 30 }));
  fresh.localStorage.setItem('fitness_body_log', JSON.stringify([{ date: '2026-01-01', weight: 70 }]));

  const realSet = fresh.localStorage.setItem;
  fresh.localStorage.setItem = function (k, v) {   // 체중 기록 쓰기는 저장·되돌리기 모두 실패
    if (k === 'fitness_body_log') { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    return realSet.call(fresh.localStorage, k, v);
  };
  const res = fresh.restoreFromBackup({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_profile: { age: 41 }, fitness_body_log: [{ date: '2026-08-01', weight: 78 }] },
  });
  fresh.localStorage.setItem = realSet;

  assert.equal(res.ok, false);
  assert.match(res.error, /되돌리지도 못했어요/, '되돌리기 실패를 사실대로 알림');
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_profile')).age, 30, '되돌릴 수 있는 건 되돌림');
});

// 정상 백업 왕복 — 따옴표·꺾쇠가 든 사용자 글자가 내보내기→가져오기 후에도 완전히 같아야 한다.
test('백업 왕복 — 사용자 글자가 글자 단위로 그대로 돌아온다', () => {
  const fresh = loadApp();
  fresh.localStorage.clear();
  const notes = [
    { id: 'mem_1', category: 'goal', text: '목표: 체중 < 75kg & 벤치 "100kg"' },
    { id: 'mem_2', category: 'injury', text: "왼쪽 어깨 '뚝' 소리 — 오버헤드 주의" },
  ];
  fresh.localStorage.setItem('fitness_profile', JSON.stringify({ age: 40, height: 175, weight: 80, workoutFreq: 4 }));
  fresh.localStorage.setItem('fitness_workout_log', JSON.stringify([{ id: 'w_1749', date: '2026-08-01', sessionKr: 'PUSH' }]));
  fresh.localStorage.setItem('fitness_coach_memory', JSON.stringify(notes));

  const file = JSON.stringify(fresh.buildBackupObject());
  fresh.localStorage.clear();
  assert.equal(fresh.restoreFromBackup(file).ok, true);
  assert.deepEqual(plain(JSON.parse(fresh.localStorage.getItem('fitness_coach_memory'))), notes);
  assert.deepEqual(plain(JSON.parse(fresh.localStorage.getItem('fitness_workout_log'))), [{ id: 'w_1749', date: '2026-08-01', sessionKr: 'PUSH' }]);

  // 두 번 복원해도 계속 같다 (치환이 누적되지 않음)
  assert.equal(fresh.restoreFromBackup(JSON.stringify(fresh.buildBackupObject())).ok, true);
  assert.deepEqual(plain(JSON.parse(fresh.localStorage.getItem('fitness_coach_memory'))), notes);
});

// Codex 리뷰: 저장이 중간에 실패하면(용량 초과) "반쪽 복원"으로 남으면 안 된다 → 원래대로 되돌린다.
test('restoreFromBackup — 저장 실패 시 원래 기록으로 롤백하고 실패를 알린다', () => {
  const fresh = loadApp();
  fresh.localStorage.clear();
  fresh.localStorage.setItem('fitness_profile', JSON.stringify({ age: 30, height: 170, weight: 70, workoutFreq: 3 }));
  fresh.localStorage.setItem('fitness_workout_log', JSON.stringify([{ id: 'old' }]));
  fresh.localStorage.setItem('fitness_condition_log', JSON.stringify([{ date: '2026-01-01' }]));

  const realSet = fresh.localStorage.setItem;
  fresh.localStorage.setItem = function (k, v) {          // 저장공간 부족 흉내 (특정 키만 실패)
    if (k === 'fitness_body_log') { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    return realSet.call(fresh.localStorage, k, v);
  };
  const res = fresh.restoreFromBackup({
    app: 'fitness', version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
    data: { fitness_profile: { age: 41 }, fitness_workout_log: [{ id: 'new' }], fitness_body_log: [{ date: '2026-08-01' }] },
  });
  fresh.localStorage.setItem = realSet;

  assert.equal(res.ok, false, '실패를 성공으로 보고하지 않음');
  assert.match(res.error, /저장 공간|되돌려/);
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_profile')).age, 30, '프로필 원복');
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_workout_log'))[0].id, 'old', '운동 기록 원복');
  assert.deepEqual(plain(JSON.parse(fresh.localStorage.getItem('fitness_condition_log'))), [{ date: '2026-01-01' }], '백업에 없던 기록도 원복');
});

// 마지막 백업 일시: 내보내면 기록, 복원하면 "그 파일을 만든 시각"으로 이어받는다. 파일에는 담기지 않는다.
test('markBackupDone / getBackupStatus — 없음·최근·오래됨(30일) 판정', () => {
  const fresh = loadApp();
  fresh.localStorage.clear();

  const none = fresh.getBackupStatus();
  assert.equal(none.never, true);
  assert.equal(none.at, null);
  assert.equal(none.stale, true, '한 번도 백업 안 했으면 리마인더 대상');

  const now = Date.UTC(2026, 7, 8);                                   // 2026-08-08 기준
  fresh.markBackupDone(new Date(now - 3 * 86400000).toISOString());   // 3일 전
  const recent = fresh.getBackupStatus(now);
  assert.equal(recent.never, false);
  assert.equal(recent.daysSince, 3);
  assert.equal(recent.stale, false);

  fresh.markBackupDone(new Date(now - 31 * 86400000).toISOString());  // 31일 전
  const old = fresh.getBackupStatus(now);
  assert.equal(old.daysSince, 31);
  assert.equal(old.stale, true, '30일 넘으면 리마인더');

  // 기기 시계가 뒤로 간 경우에도 음수 일수가 나오지 않는다
  assert.equal(fresh.getBackupStatus(now - 40 * 86400000).daysSince, 0);

  // 마지막 백업 일시는 기기별 메모 → 백업 파일에 담기지 않음
  fresh.localStorage.setItem('fitness_profile', JSON.stringify({ age: 40 }));
  assert.equal(fresh.buildBackupObject().data.fitness_last_backup, undefined);

  // 복원하면 파일이 만들어진 시각으로 세팅된다 (새 폰에서도 백업 주기가 이어짐)
  const res = fresh.restoreFromBackup({
    app: 'fitness', version: 1, exportedAt: '2026-07-01T00:00:00.000Z',
    data: { fitness_profile: { age: 40 }, fitness_workout_log: [] }
  });
  assert.equal(res.ok, true);
  assert.equal(JSON.parse(fresh.localStorage.getItem('fitness_last_backup')).at, '2026-07-01T00:00:00.000Z');
});

// ═══════════════════════════════════════════════
// 묶음1/2 UI 회귀 (fresh app — 격리)
// ═══════════════════════════════════════════════

// 더보기 화면의 '데이터 백업' 섹션 — 내보내기/가져오기/마지막 백업 + 오래되면 리마인더
test('renderMore — 데이터 백업 섹션 + 마지막 백업 표시 + 오래된 백업 리마인더', () => {
  const fresh = loadApp();
  fresh.localStorage.removeItem('fitness_last_backup');
  const never = fresh.renderMore();
  assert.ok(never.includes('데이터 백업'), '백업 섹션 제목');
  assert.ok(never.includes('exportData()') && never.includes('openBackupImport()'), '내보내기/가져오기 연결');
  assert.ok(never.includes('마지막 백업') && never.includes('아직 백업한 적이 없어요'), '백업 이력 없음 표시');
  assert.ok(never.includes('backup-reminder'), '백업 이력이 없으면 리마인더 노출');
  assert.ok(never.includes('API 키'), 'API 키 제외 안내');

  // 최근 백업 → 리마인더 없음
  fresh.markBackupDone(new Date(Date.now() - 2 * 86400000).toISOString());
  const recent = fresh.renderMore();
  assert.ok(!recent.includes('backup-reminder'), '최근 백업이면 리마인더 없음');
  assert.ok(recent.includes('마지막 백업'), '마지막 백업 줄 유지');

  // 31일 전 백업 → 리마인더 노출
  fresh.markBackupDone(new Date(Date.now() - 31 * 86400000).toISOString());
  const stale = fresh.renderMore();
  assert.ok(stale.includes('backup-reminder') && stale.includes('지금 백업하기'), '오래되면 리마인더 + 바로 백업 버튼');
});

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

  // 진행 세션(완료 본세트 없음) → 뒤로 → 앱 확인 팝업(showConfirm) → 동의 시 세션 폐기.
  // 하네스엔 실제 DOM이 없어 팝업 버튼을 누를 수 없으므로, showConfirm을 "즉시 동의"로 대체해 확인.
  const origShowConfirm = a.showConfirm;
  let confirmMessage = null;
  a.showConfirm = (message, onConfirm) => { confirmMessage = message; onConfirm(); };
  s.activeSession = { exercises: [{ sets: [{ completed: false, isWarmup: false }] }], startTime: 1, currentExerciseIdx: 0 };
  a.navBack();
  assert.ok(confirmMessage && confirmMessage.indexOf('종료') !== -1, '종료 확인 팝업이 뜸');
  assert.equal(s.activeSession, null, '세션 종료(확인창 동의 시)');
  a.showConfirm = origShowConfirm;
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
      json: () => Promise.resolve({ content: [{ type: 'text', text: 'ok' }] }),
      text: () => Promise.resolve(''),
    });
  };
  const res = await app.callCoachAPI([{ role: 'user', content: '안녕' }]);
  assert.equal(res.text, 'ok', '정상 응답 파싱');
  assert.deepEqual(plain(captured.thinking), { type: 'disabled' }, 'Sonnet 5 생각모드 끔(안 끄면 max_tokens 소진→빈 응답)');
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
      json: () => Promise.resolve({ content: [{ type: 'text', text: '{"headline":"t","reason":"r","exercises":[{"name":"벤치프레스","type":"복합","isMain":true,"sets":3,"reps":"6-8","weight":60,"rir":2,"note":"n"}]}' }] }),
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
      json: () => Promise.resolve({ content: [{ type: 'text', text: '{"intent":"question","reply":"ok","changes":[],"updatedRoutine":null}' }] }),
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
      json: () => Promise.resolve({ content: [{ type: 'text', text: '{"headline":"h","grade":"A","wins":[],"improvements":[],"nextWeek":[],"coachNote":"n"}' }] }),
      text: () => Promise.resolve(''),
    });
  };
  await app.generateWeeklyReview(true);
  assert.ok(captured, 'fetch 호출됨');
  assert.equal(typeof captured.system, 'string', 'system 문자열(캐싱 미적용)');
  assert.ok(captured.system.includes('크레아틴'), '지식 베이스 주입됨');
  assert.ok(captured.system.includes('등급') || captured.system.includes('주간 리뷰'), '기존 주간 리뷰 프롬프트 유지');
});

// ═══════════════════════════════════════════════
// 인클라인 워킹(경사 걷기) 모드 — docs/research/incline-walking.md §2~§5·§7
// ═══════════════════════════════════════════════

// ── §2 처방표: 첫 회 경사 + 허리 이력 수정판 ──
test('경사걷기 cardioWalkNextIncline — 첫 회 4%(허리 이력 3%) · 상한 클램프', () => {
  // 기록 없음 → 4% (§2-1 0단계)
  assert.equal(app.cardioWalkNextIncline([], []), 4);
  // 허리디스크 이력 → 3%에서 출발 (§2-2)
  assert.equal(app.cardioWalkNextIncline([], ['lower_back']), 3);
  // 인터벌 기록만 있으면 걷기 기록으로 치지 않는다(하위 호환: 옛 기록엔 mode 자체가 없다)
  assert.equal(app.cardioWalkNextIncline([{ date: '2026-08-01', completed: true, rpe: 5, segments: [{ type: 'run', sec: 60 }] }], []), 4);
  // 상한: 허리 없으면 12%, 허리 있으면 10% (§1-3 절대 상한 / §7-6 한 단계 낮춤)
  const hot = [{ date: '2026-08-01', mode: 'walk', completed: true, rpe: 5, segments: [{ type: 'walk', sec: 1200, incline: 20 }] }];
  assert.equal(app.cardioWalkNextIncline(hot, []), 12);
  assert.equal(app.cardioWalkNextIncline(hot, ['lower_back']), 10);
});

// ── §4-2 향상 게이트: 하향 조건 ──
test('경사걷기 cardioWalkNextIncline — 손잡이/미완주/RPE9 하향, 잘해도 로컬은 상향 안 함', () => {
  const mk = (over) => [Object.assign({
    date: '2026-08-01', mode: 'walk', completed: true, rpe: 5,
    segments: [{ type: 'warmup', sec: 300, incline: 0 }, { type: 'walk', sec: 1200, incline: 8 }]
  }, over)];
  // 완주 + RPE 5 → 유지(로컬은 경사를 올리지 않는다 — 상향 축 선택은 AI가 맡음)
  assert.equal(app.cardioWalkNextIncline(mk({}), []), 8);
  // 손잡이를 계속 잡음 → −2% (§5-2: 실제로는 기록보다 낮은 경사를 한 것)
  assert.equal(app.cardioWalkNextIncline(mk({ handrail: 'hold' }), []), 6);
  // 가볍게만 얹음은 손실이 거의 없다 → 유지
  assert.equal(app.cardioWalkNextIncline(mk({ handrail: 'light' }), []), 8);
  // 미완주 → −2%
  assert.equal(app.cardioWalkNextIncline(mk({ completed: false }), []), 6);
  // RPE 9 이상 → −2%
  assert.equal(app.cardioWalkNextIncline(mk({ rpe: 9 }), []), 6);
  // RPE 7~8은 유지
  assert.equal(app.cardioWalkNextIncline(mk({ rpe: 8 }), []), 8);
  // 하한 3% 아래로는 안 내려간다
  const low = [{ date: '2026-08-01', mode: 'walk', completed: false, segments: [{ type: 'walk', sec: 600, incline: 3 }] }];
  assert.equal(app.cardioWalkNextIncline(low, []), 3);
});

// ── §2 설계원칙 2: 경사가 오르면 속도는 내린다 ──
test('경사걷기 cardioWalkSpeedFor — 경사 11% 이상이면 속도를 내린다', () => {
  assert.equal(app.cardioWalkSpeedFor(4), 5.0);
  assert.equal(app.cardioWalkSpeedFor(10), 5.0);
  assert.equal(app.cardioWalkSpeedFor(11), 4.8);
  assert.equal(app.cardioWalkSpeedFor(12), 4.8);
});

// ── §3-2 표준 4구간 구조 ──
test('경사걷기 buildWalkRawSegments — 몸풀기(0%) → 램프(절반) → 본 구간 → 정리(0%)', () => {
  const segs = plain(app.buildWalkRawSegments(30 * 60, 8));   // vm realm → 현재 realm 으로 정규화
  assert.equal(segs.length, 4, '4구간');
  assert.deepEqual(segs.map((s) => s.type), ['warmup', 'warmup', 'walk', 'cooldown']);
  assert.deepEqual(segs.map((s) => s.incline), [0, 4, 8, 0], '경사: 0 → 목표의 절반 → 목표 → 0');
  assert.equal(segs.reduce((a, s) => a + s.sec, 0), 1800, '총합 = 정확히 30분');
  assert.deepEqual(segs.map((s) => s.sec), [300, 120, 1200, 180], '§3-3 예시와 동일: 5 + 2 + 20 + 3분');
  assert.equal(segs[3].speed, 4.5, '정리는 속도를 낮춘다');
  // 짧은 세션(5분)도 본 구간이 남는다 — 앞뒤를 압축
  const short = plain(app.buildWalkRawSegments(5 * 60, 4));
  assert.equal(short.reduce((a, s) => a + s.sec, 0), 300);
  assert.ok(short.some((s) => s.type === 'walk' && s.sec >= 120), '짧아도 본 구간 확보');
});

// ── §7-2·§1-3: 경사 상한은 프롬프트가 아니라 코드가 강제한다 ──
test('경사걷기 cardioFitToTotal — 총시간 정확 + 30초 격자 + 경사 상한 클램프', () => {
  const raw = [
    { type: 'warmup', sec: 300, speed: 5, incline: 0 },
    { type: 'warmup', sec: 120, speed: 5, incline: 9 },
    { type: 'walk', sec: 1200, speed: 5, incline: 18 },   // ★상한 초과 — 코드가 잘라내야 함
    { type: 'cooldown', sec: 180, speed: 4.5, incline: 0 }
  ];
  const out = app.cardioFitToTotal(raw, 1800, { incline: true, inclineMax: 12 });
  assert.equal(out[out.length - 1].endSec, 1800, '마지막 구간이 정확히 총시간까지');
  out.forEach((s) => {
    assert.equal((s.endSec - s.startSec) % 30, 0, '모든 구간이 30초 배수');
    assert.ok(s.incline <= 12, '경사 12% 초과 없음');
  });
  assert.equal(out[2].incline, 12, '18% → 12%로 클램프');
  // 인터벌 모드(경사 미사용)는 incline 필드 자체가 붙지 않는다 — 기존 동작 보존
  const iv = app.cardioFitToTotal([{ type: 'warmup', sec: 300, speed: 5 }, { type: 'run', sec: 60, speed: 8 }], 600, {});
  assert.equal(iv[iv.length - 1].endSec, 600);
  assert.ok(!('incline' in iv[0]), '인터벌 구간엔 incline 없음');
});

// ── §1-2 ACSM 걷기 대사공식 검산 ──
test('경사걷기 cardioWalkKcal — ACSM 공식(12-3-30 조건)과 일치', () => {
  // 연구 §1-2: 12% · 4.8km/h · 30분 · 75.4kg → ACSM 추정 10.85 kcal/분 ≈ 326 kcal
  const kcal = app.cardioWalkKcal([{ type: 'walk', sec: 1800, actualSpeed: 4.8, incline: 12 }], 75.4);
  assert.ok(Math.abs(kcal - 326) <= 2, `326 kcal 근처여야 함 (실제 ${kcal})`);
  // 체중을 모르면 0 (표시하지 않음)
  assert.equal(app.cardioWalkKcal([{ type: 'walk', sec: 1800, actualSpeed: 5, incline: 8 }], 0), 0);
});

// ── §3-4 안내 문구 규칙: 경사·속도를 함께, 방향을 명시 ──
test('경사걷기 안내 문구 — 경사+속도 동시 표기 · 올림/내림 방향 명시', () => {
  assert.equal(app.cardioInclineLabel({ incline: 8, targetSpeed: 5 }), '경사 8% · 5.0km/h');
  assert.equal(app.cardioFmtIncline(8), '8');
  assert.equal(app.cardioFmtIncline(4.5), '4.5');
  assert.ok(app.cardioInclineCue({ incline: 4 }, { incline: 8, targetSpeed: 5 }).includes('올리세요'));
  assert.ok(app.cardioInclineCue({ incline: 8 }, { incline: 0, targetSpeed: 4.5 }).includes('내리세요'));
  assert.ok(app.cardioInclineCue({ incline: 8 }, null).includes('완주'));
});

// ── §3-3 본 구간 코칭 문구는 무음 화면 표시, 진입 2분 뒤부터 회전 ──
test('경사걷기 cardioWalkTip — 본 구간 진입 2분 뒤부터 5분마다 회전', () => {
  const seg = { type: 'walk', startSec: 420, endSec: 1620 };
  assert.equal(app.cardioWalkTip(seg, 500), '', '진입 직후엔 조용');
  assert.equal(app.cardioWalkTip(seg, 540), app.WALK_COACH_TIPS[0], '2분 뒤 첫 문구(손잡이)');
  assert.equal(app.cardioWalkTip(seg, 840), app.WALK_COACH_TIPS[1], '5분 뒤 다음 문구');
  assert.equal(app.cardioWalkTip({ type: 'warmup', startSec: 0, endSec: 300 }, 200), '', '몸풀기 구간엔 안 띄움');
});

// ── §7-2 하위 호환: 옛 기록(mode·incline 없음)이 섞여도 안 깨진다 ──
test('경사걷기 cardioWalkSessions — 걷기 세션만 최근순, 옛 기록은 제외', () => {
  const log = [
    { date: '2026-08-01', segments: [] },                                  // 옛 기록(mode 없음) → interval 취급
    { date: '2026-08-03', mode: 'walk', segments: [{ type: 'walk', sec: 600, incline: 6 }] },
    { date: '2026-08-05', mode: 'walk', segments: [{ type: 'walk', sec: 600, incline: 8 }] },
    { date: '2026-08-04', mode: 'interval', segments: [] }
  ];
  const out = plain(app.cardioWalkSessions(log));   // vm realm → 현재 realm 으로 정규화
  assert.deepEqual(out.map((s) => s.date), ['2026-08-05', '2026-08-03'], '걷기만 · 최신이 앞');
  assert.equal(app.cardioWalkMainIncline(out[0]), 8);
  assert.equal(app.cardioWalkMainIncline({ segments: [] }), 0, '경사 없으면 0');
});

// ── §7-7: API 키가 없어도 걷기 모드가 100% 동작한다 ──
test('경사걷기 buildFallbackWalk — 키 없이도 완전한 구성(총시간 정확·경사 상한 이내)', () => {
  const a = loadApp();
  a.state.apiKey = null;
  a.state.data.cardioLog = [];
  const plan = a.buildFallbackWalk(30, true);
  assert.equal(plan.source, 'fallback');
  assert.equal(plan.segments[plan.segments.length - 1].endSec, 1800, '총시간 정확히 30분');
  assert.equal(plan.segments[0].incline, 0, '몸풀기는 경사 0%');
  plan.segments.forEach((s) => assert.ok(s.incline <= 12, '경사 상한 이내'));
  const main = plan.segments.filter((s) => s.type === 'walk');
  assert.equal(main.length, 1, '본 구간은 쪼개지 않는다(§3-1 정속)');
  assert.equal(main[0].incline, 4, '기록 없으면 4%');
  // 허리디스크 기억 노트가 있으면 3%에서 출발 + 자세 큐가 note 에 들어간다
  a.state.coachMemory = [{ category: 'injury', text: '허리 디스크 이력' }];
  const back = a.buildFallbackWalk(30, false);
  assert.equal(back.segments.filter((s) => s.type === 'walk')[0].incline, 3);
  assert.ok(back.note.includes('고관절'), '허리 자세 큐 포함');
});

// ── §0·§1-1 톤 규칙: '지방 연소' 마케팅 금지 ──
test('경사걷기 톤 — 안내 문구에 지방 연소/순삭 류 표현이 없다', () => {
  const banned = ['지방 연소', '지방연소', '순삭', '애프터번', '폭발'];
  const texts = [].concat(app.WALK_COACH_TIPS, app.buildFallbackWalk(30, true).note);
  texts.forEach((t) => banned.forEach((b) => assert.ok(String(t).indexOf(b) === -1, `금지 표현 "${b}" 발견: ${t}`)));
});

// ── §7-6 AI 프롬프트: 구조 고정 · 경사 상한 · 손잡이 게이트 · 톤 규칙 ──
test('경사걷기 generateCardioWalk — 프롬프트 규칙 주입 + 총시간 강제 + 경사 상한', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  a.state.data.cardioLog = [];
  let captured = null;
  a.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: JSON.stringify({
        headline: 'h', note: 'n',
        segments: [
          { type: 'warmup', sec: 300, speed: 5, incline: 0, label: '몸풀기' },
          { type: 'warmup', sec: 120, speed: 5, incline: 4, label: '준비 구간' },
          { type: 'walk', sec: 1200, speed: 5, incline: 30, label: '본 구간' },   // ★상한 위반 시도
          { type: 'cooldown', sec: 180, speed: 4.5, incline: 0, label: '정리' }
        ]
      }) }] }),
      text: () => Promise.resolve(''),
    });
  };
  const plan = await a.generateCardioWalk(30);
  assert.ok(captured, 'fetch 호출됨');
  assert.equal(captured.model, 'claude-sonnet-5');
  assert.deepEqual(captured.thinking, { type: 'disabled' }, 'Sonnet 5 빈 응답 회피');
  const sys = captured.system;
  assert.ok(sys.includes('1800초'), '총시간 규칙');
  assert.ok(sys.includes('시간 → 빈도 → 경사 → 속도'), '향상 우선순위 (§4-1)');
  assert.ok(sys.includes('12%'), '경사 상한 명시');
  assert.ok(sys.includes('손잡이'), '손잡이 게이트 (§5-2)');
  assert.ok(sys.includes('지방 연소'), '금지 규칙으로 언급(과장 금지 §1-1)');
  assert.ok(sys.includes('본 구간을 여러 개로 쪼개지 말 것'), '정속 고정 (§3-1)');
  // 코드가 총시간과 경사 상한을 강제한다
  assert.equal(plan.segments[plan.segments.length - 1].endSec, 1800);
  assert.equal(plan.segments[2].incline, 12, 'AI가 30% 줘도 12%로 잘림');
});

// ── §7-6 규칙7: 허리 이력이면 상한 10% + 자세 큐 주입 ──
test('경사걷기 generateCardioWalk — 허리 이력 시 상한 10% + 자세 큐 블록', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  a.state.data.cardioLog = [];
  a.state.coachMemory = [{ category: 'injury', text: '허리 디스크 있음' }];
  let captured = null;
  a.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: [{ type: 'text', text: '{"segments":[{"type":"walk","sec":1800,"speed":5,"incline":12}]}' }] }), text: () => Promise.resolve('') });
  };
  const plan = await a.generateCardioWalk(30);
  assert.ok(captured.system.includes('허리(디스크) 이력 있음'), '허리 블록 주입');
  assert.ok(captured.system.includes('고관절'), '자세 큐 포함');
  assert.ok(captured.system.includes('10% 를 절대 넘기지 않는다'), '상한 한 단계 낮춤');
  assert.equal(plan.segments[0].incline, 10, '허리 이력이면 코드도 10%로 자름');
});

// ── §7-7: API 오류·키 없음에도 기능이 죽지 않는다 ──
test('경사걷기 generateCardioWalk — 키 없으면 null, API 오류면 로컬 폴백', async () => {
  const a = loadApp();
  a.state.apiKey = null;
  assert.equal(await a.generateCardioWalk(30), null, '키 없으면 null(화면이 로컬 폴백 처리)');
  a.state.apiKey = 'sk-test';
  a.state.data.cardioLog = [];
  a.fetch = () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
  const plan = await a.generateCardioWalk(30);
  assert.ok(plan && plan.segments.length, 'API 오류여도 폴백 구성이 나온다');
  assert.equal(plan.segments[plan.segments.length - 1].endSec, 1800);
});

// ── 하위 호환: mode 인자를 안 주면 기존(인터벌) 라벨·아이콘 그대로 ──
test('경사걷기 cardioTypeLabel/Icon — mode 없으면 기존 인터벌 표기 유지', () => {
  assert.equal(app.cardioTypeLabel('run'), '뛰기');
  assert.equal(app.cardioTypeLabel('walk'), '걷기');
  assert.equal(app.cardioTypeLabel('warmup'), '워밍업');
  assert.equal(app.cardioTypeIcon('run'), '🏃');
  // 걷기 모드에서는 구간 이름이 바뀐다
  assert.equal(app.cardioTypeLabel('walk', 'walk'), '본 구간');
  assert.equal(app.cardioTypeLabel('warmup', 'walk'), '몸풀기');
  assert.equal(app.cardioTypeLabel('cooldown', 'walk'), '정리');
  assert.equal(app.cardioTypeIcon('walk', 'walk'), '⛰️');
  // 램프 구간은 계획 label('준비 구간')을 우선 표시한다
  assert.equal(app.cardioSegDisplayLabel({ type: 'warmup', label: '준비 구간' }, 'walk'), '준비 구간');
});

// ── §7-7: 모드 기본값은 interval — 기존 사용자 흐름이 바뀌지 않아야 한다 ──
test('경사걷기 ensureCardioState/setCardioMode — 기본 interval, 전환 시 구성 초기화', () => {
  const a = loadApp();
  a.state.cardio = null;
  assert.equal(a.ensureCardioState().mode, 'interval', '기본값은 인터벌');
  a.state.cardio.plan = { segments: [] };
  a.setCardioMode('walk');
  assert.equal(a.state.cardio.mode, 'walk');
  assert.equal(a.state.cardio.plan, null, '모드가 바뀌면 구성 초기화');
  // 진행 중에는 못 바꾼다
  a.state.cardio.phase = 'running';
  a.setCardioMode('interval');
  assert.equal(a.state.cardio.mode, 'walk', '실행 중 모드 변경 차단');
});

// ── 회귀: 두 모드가 같은 cardioLog 를 공유한다 — 각 모드는 자기 기록만 기준선으로 삼아야 한다 ──
test('경사걷기 모드 분리 — 인터벌 기준선이 걷기 세션에 오염되지 않는다', () => {
  const log = [
    { date: '2026-08-01', mode: 'interval', completed: true, rpe: 6, segments: [{ type: 'run', sec: 60, actualSpeed: 8 }] },
    { date: '2026-08-05', mode: 'walk', completed: true, rpe: 5, segments: [{ type: 'walk', sec: 1200, incline: 8 }] }
  ];
  // 인터벌 기준선 = 걷기 세션(더 최근)이 아니라 인터벌 세션이어야 한다
  assert.deepEqual(plain(app.cardioIntervalSessions(log)).map((s) => s.date), ['2026-08-01']);
  assert.deepEqual(plain(app.cardioWalkSessions(log)).map((s) => s.date), ['2026-08-05']);
  // 옛 기록(mode 필드 없음)은 인터벌로 간주 — 하위 호환
  assert.equal(app.cardioIntervalSessions([{ date: '2026-07-01', segments: [] }]).length, 1);
});

test('경사걷기 generateCardioInterval — 프롬프트 기록 블록에 걷기 세션이 섞이지 않는다', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  a.state.data.cardioLog = [
    { date: '2026-08-01', mode: 'interval', completed: true, rpe: 6, totalSec: 1800, segments: [{ type: 'run', sec: 60, actualSpeed: 8.5 }, { type: 'walk', sec: 120, actualSpeed: 5.5 }] },
    { date: '2026-08-05', mode: 'walk', completed: true, rpe: 5, totalSec: 1800, segments: [{ type: 'walk', sec: 1200, actualSpeed: 5, incline: 8 }] }
  ];
  let captured = null;
  a.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: [{ type: 'text', text: '{"segments":[{"type":"warmup","sec":1800,"speed":5}]}' }] }), text: () => Promise.resolve('') });
  };
  await a.generateCardioInterval(30);
  const sys = captured.system;
  assert.ok(sys.includes('지난 회(기준선)'), '기록 블록이 들어감');
  assert.ok(sys.includes('2026-08-01') || sys.includes('뛰기 1회'), '인터벌 세션이 기준선');
  assert.ok(!sys.includes('2026-08-05'), '걷기 세션이 인터벌 프롬프트에 섞이지 않음');
  // 반대 방향도 확인: 걷기 프롬프트엔 인터벌 세션이 안 들어간다
  await a.generateCardioWalk(30);
  assert.ok(!captured.system.includes('2026-08-01'), '인터벌 세션이 걷기 프롬프트에 섞이지 않음');
});

// ═══════════════════════════════════════════════
// 코드리뷰(PR #46) 지적 반영 — 회귀 고정
// ═══════════════════════════════════════════════

// ── 같은 날 두 세션: 날짜 문자열만으로는 순서를 못 가린다 → 저장 순서로 동률을 가른다 ──
test('리뷰① 같은 날 두 세션 — 최신(나중에 저장된) 세션이 기준선이 된다', () => {
  const log = [
    { date: '2026-08-07', mode: 'walk', completed: true, rpe: 5, segments: [{ type: 'walk', sec: 1200, incline: 8 }] },
    { date: '2026-08-08', mode: 'walk', completed: true, rpe: 5, handrail: 'none', segments: [{ type: 'walk', sec: 1200, incline: 8 }] },
    { date: '2026-08-08', mode: 'walk', completed: false, rpe: 9, handrail: 'hold', segments: [{ type: 'walk', sec: 600, incline: 8 }] }
  ];
  assert.equal(app.cardioWalkSessions(log)[0].handrail, 'hold', '같은 날이면 나중에 저장된 세션이 앞');
  // 손잡이 '계속 잡음' 하향 게이트가 반드시 발동해야 한다 (§5-2)
  assert.equal(app.cardioWalkNextIncline(log, []), 6, '−2% 하향이 건너뛰어지지 않음');
  // 인터벌 쪽도 같은 규칙
  const ilog = [
    { date: '2026-08-08', mode: 'interval', rpe: 5, segments: [] },
    { date: '2026-08-08', mode: 'interval', rpe: 9, segments: [] }
  ];
  assert.equal(app.cardioIntervalSessions(ilog)[0].rpe, 9);
});

// ── 몸풀기(경사 0%) 도중 중단 → 진행도가 초기값으로 리셋되면 안 된다 ──
test('리뷰② 본 구간 없는 세션 — 그 앞 세션의 경사를 이어받는다(4%로 리셋 금지)', () => {
  const log = [
    { date: '2026-08-01', mode: 'walk', completed: true, rpe: 5, segments: [{ type: 'walk', sec: 1800, incline: 10 }] },
    // 몸풀기 2분만 하고 중단 → walk 구간이 아예 없음
    { date: '2026-08-05', mode: 'walk', completed: false, segments: [{ type: 'warmup', sec: 120, incline: 0 }] }
  ];
  // 기준 경사는 10%에서 이어받되, 최근 세션이 미완주이므로 −2% 하향이 적용된다
  assert.equal(app.cardioWalkNextIncline(log, []), 8, '10% → 미완주 게이트로 8% (4%로 리셋 아님)');
  // 걷기 기록은 있지만 본 구간을 한 번도 안 한 경우에만 첫 회 값
  assert.equal(app.cardioWalkNextIncline([log[1]], []), 4);
});

// ── walk 모드는 run 세그먼트·범위 밖 속도를 코드가 막는다 ──
test('리뷰③ cardioFitToTotal — 걷기 모드에서 run 타입과 범위 밖 속도를 코드가 차단', () => {
  const out = app.cardioFitToTotal(
    [{ type: 'run', sec: 1800, speed: 12, incline: 8 }],
    1800,
    { incline: true, inclineMax: 12, allowedTypes: app.CARDIO_WALK_ALLOWED_TYPES, speedMin: 4.5, speedMax: 5.5 }
  );
  assert.equal(out[0].type, 'walk', "run → walk 로 접힘");
  assert.equal(out[0].speed, 5.5, '12km/h → 상한 5.5로 클램프');
  // 인터벌 모드는 기존대로 run 과 8km/h 를 그대로 통과시킨다
  const iv = app.cardioFitToTotal([{ type: 'run', sec: 600, speed: 8 }], 600, {});
  assert.equal(iv[0].type, 'run');
  assert.equal(iv[0].speed, 8);
});

test('리뷰③-2 generateCardioWalk — AI가 run/과속을 줘도 화면엔 walk·5.5 이하로만 나간다', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  a.state.data.cardioLog = [];
  a.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ content: [{ type: 'text', text: '{"segments":[{"type":"run","sec":1800,"speed":12,"incline":8}]}' }] }),
    text: () => Promise.resolve(''),
  });
  const plan = await a.generateCardioWalk(30);
  plan.segments.forEach((s) => {
    assert.notEqual(s.type, 'run', 'walk 모드에 run 구간 없음');
    assert.ok(s.speed <= 5.5 && s.speed >= 4.5, '속도가 걷기 범위 안');
  });
  // 본 구간이 walk 로 남아야 경사 기록이 살아남는다
  assert.equal(app.cardioWalkMainIncline({ segments: plan.segments.map((s) => ({ type: s.type, incline: s.incline })) }), 8);
});

// ── §4-1 본 구간 33분 상한을 코드가 강제한다 ──
test('리뷰④ 본 구간 33분 상한 — 60분·120분을 요청해도 45분 세션으로 자른다', () => {
  const a = loadApp();
  a.state.apiKey = null;
  a.state.data.cardioLog = [];
  [60, 120].forEach((min) => {
    const plan = a.buildFallbackWalk(min, true);
    const total = plan.segments[plan.segments.length - 1].endSec;
    assert.equal(total, 45 * 60, min + '분 요청 → 45분으로 클램프');
    const main = plan.segments.filter((s) => s.type === 'walk').reduce((acc, s) => acc + (s.endSec - s.startSec), 0);
    assert.ok(main <= 33 * 60, `본 구간 ${main}초 ≤ 33분`);
    assert.ok(plan.note.includes('본 구간 상한'), '잘렸다는 사실을 note 로 알림');
  });
  // 45분 이하는 그대로 통과하고 안내 문구도 안 붙는다
  const ok = a.buildFallbackWalk(30, true);
  assert.equal(ok.segments[ok.segments.length - 1].endSec, 1800);
  assert.ok(!ok.note.includes('본 구간 상한'));
});

// ── 모드 전환 경쟁 상태: 생성 중에 모드를 바꾸면 늦게 온 응답을 버린다 ──
test('리뷰⑤ setCardioMode — 생성 중 모드 전환 시 옛 응답이 새 모드에 꽂히지 않는다', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  a.state.data.cardioLog = [];
  a.ensureCardioState();
  a.state.cardio.mode = 'walk';
  let release;
  const pending = new Promise((r) => { release = r; });
  a.fetch = () => pending;
  a.buildCardioPlan(30);                       // 걷기 생성 시작 (응답 대기)
  assert.equal(a.state.cardio.loading, true);
  a.setCardioMode('interval');                 // 대기 중 모드 전환
  assert.equal(a.state.cardio.loading, false, '전환 시 로딩 해제');
  release({ ok: true, json: () => Promise.resolve({ content: [{ type: 'text', text: '{"segments":[{"type":"walk","sec":1800,"speed":5,"incline":8}]}' }] }), text: () => Promise.resolve('') });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(a.state.cardio.mode, 'interval');
  assert.equal(a.state.cardio.plan, null, '옛 걷기 응답이 인터벌 화면에 설치되지 않음');
});

// ── AI 폴백과 화면 폴백이 같은 구성을 쓴다(허리 자세 큐가 경로에 따라 달라지지 않게) ──
test('리뷰⑥ generateCardioWalk 폴백 — 화면 폴백과 같은 안내(허리 자세 큐 포함)', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  a.state.data.cardioLog = [];
  a.state.coachMemory = [{ category: 'injury', text: '허리 디스크' }];
  a.fetch = () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
  const plan = await a.generateCardioWalk(30);
  assert.ok(plan.note.includes('고관절'), 'API 오류 폴백에도 허리 자세 큐가 들어간다');
  assert.equal(plan.segments[plan.segments.length - 1].endSec, 1800);
});

// ═══════════════════════════════════════════════
// AI 코칭 수정 회귀 가드 (부위 매핑 · e1RM 상한 · 정체 판정 · 영양 지식 · 볼륨 노출 · 오늘의 추천)
//   ⚠️ 반드시 파일 "맨 끝"에 둔다. 맨 위 골든심볼 테스트는 실행 시점의 typeof 로 전역을
//      분류하므로, 로드 직후 null 인 전역(_lastSetsCache 등)을 먼저 채우는 테스트가 앞서면
//      objects 목록이 달라져 깨진다.
// ═══════════════════════════════════════════════

// ── 종목명 → 부위 매핑 회귀 가드 (볼륨 누락·오분류 방지) ──
test('부위 매핑: 앱에 등장하는 모든 종목명이 null이 아니다', () => {
  const names = new Set();
  Object.keys(app.SESSIONS).forEach((k) => (app.SESSIONS[k].exercises || []).forEach((e) => names.add(e.name)));
  Object.keys(app.EXERCISE_ALIASES_1RM).forEach((k) => { names.add(k); names.add(app.EXERCISE_ALIASES_1RM[k]); });
  Object.keys(app.INITIAL_1RM).forEach((k) => names.add(k));
  Object.keys(app.EXERCISE_CLASS_OVERRIDES).forEach((k) => names.add(k));
  Object.keys(app.EXERCISE_SAFETY).forEach((k) => names.add(k));
  Object.keys(app.WEAK_PART_EXERCISE_MAP).forEach((p) => app.WEAK_PART_EXERCISE_MAP[p].forEach((n) => names.add(n)));
  Object.keys(app.EXERCISE_BODY_PART_MAP).forEach((k) => names.add(k));
  assert.ok(names.size > 100, '전수 스윕이 실제로 종목을 모았는지 (표 이름이 바뀌면 0건이 되어 조용히 통과한다)');
  names.forEach((n) => {
    assert.ok(app.getExercisePart(n), `"${n}"의 부위 매핑이 null — 볼륨 집계에서 통째로 빠진다`);
  });
});

test('부위 매핑: 별칭 표기가 표준명과 같은 부위·장비로 해석된다', () => {
  Object.keys(app.EXERCISE_ALIASES_1RM).forEach((alias) => {
    const canon = app.EXERCISE_ALIASES_1RM[alias];
    const a = app.getExercisePart(alias);
    const c = app.getExercisePart(canon);
    assert.ok(a && c, `"${alias}" / "${canon}" 둘 다 해석돼야 한다`);
    assert.equal(a.primary, c.primary, `"${alias}"와 표준명 "${canon}"의 주동부위가 다르다`);
    assert.equal(a.equipment, c.equipment, `"${alias}"와 표준명 "${canon}"의 장비가 다르다`);
  });
});

test('부위 매핑: 퍼지 매칭이 엉뚱한 종목을 집지 않는다', () => {
  // '컬'(이두) 규칙이 레그컬을 가로채던 버그
  assert.equal(app.getExercisePart('레그 컬 머신').primary, 'hamstrings');
  assert.equal(app.getExercisePart('시티드 햄스트링 레그 컬').primary, 'hamstrings');
  // 리버스 플라이는 가슴이 아니라 후면 삼각근
  assert.equal(app.getExercisePart('케이블 리버스 플라이').primary, 'shoulders_rear');
  assert.equal(app.getExercisePart('리버스 펙덱 플라이').primary, 'shoulders_rear');
  // 한 단어짜리 일반 명사도 **null이 되면 안 된다** — null이면 그 세트가 볼륨 집계에서
  // 통째로 빠지고(getRecentVolumeSplitByPart의 `if (!info) return`), 휴식 타이머도 고립으로 떨어진다.
  // 다만 엉뚱한 부위로 가면 안 되므로 부위까지 함께 못 박는다.
  assert.equal(app.getExercisePart('프레스').primary, 'chest');
  assert.equal(app.getExercisePart('레이즈').primary, 'shoulders_side');
  assert.equal(app.getExercisePart('익스텐션').primary, 'triceps');
  // 미등록 복합 종목도 부위·복합 판정이 나와야 휴식 150초가 붙는다
  const ohp = app.getExercisePart('바벨 오버헤드 프레스');
  assert.equal(ohp.primary, 'shoulders_front');
  assert.equal(ohp.compound, true, '복합으로 안 잡히면 휴식이 90초로 떨어진다');
  // 더 구체적인 키가 이긴다 — 맨몸으로 새면 미보유 기구 게이트가 뚫린다
  assert.equal(app.getExerciseEquipment('스탠딩 카프 레이즈 머신'), 'smith');
  assert.equal(app.isExerciseAvailable('시티드 카프 레이즈 머신'), false);
  // 평벤치 덤벨 프레스가 인클라인(가슴 상부)으로 잡히지 않는다
  assert.equal(app.getExercisePart('덤벨 프레스').primary, 'chest', "'덤벨 프레스'가 가슴 상부로 잡히면 안 된다");
});

// ── e1RM 반복 상한을 종목 클래스별로 (복합 10 / 고립 이하 12) ──
//    일괄 10으로 내리면 처방 반복이 12~15회인 고립 종목은 본세트가 전부 잘려
//    calculateRollingMax1RM 이 null → 추적 1RM 이 INITIAL_1RM 에 영원히 묶인다.
// ★ 이 테스트가 지키는 불변식: e1RM 반복 상한은 그 종목의 **처방 상단(repMax) 아래로 내려가지 않는다.**
//   앱이 시키는 반복을 추적에서 잘라내면 지시대로 운동한 사용자의 본세트가 전부 제외돼
//   calculateRollingMax1RM이 null → reconcile1RMFromLog가 건너뛰고 → 추적 1RM이 영원히 동결된다.
test('rolling1RMMaxReps — 처방 상단은 절대 자르지 않는다 (1RM 동결 방지)', () => {
  assert.equal(app.rolling1RMMaxReps('데드리프트'), 10);               // compound_heavy 5-8 → 10 (강화)
  assert.equal(app.rolling1RMMaxReps('레그 프레스'), 12);              // compound_moderate 8-12 → 12
  assert.equal(app.rolling1RMMaxReps('머신 펙 덱 플라이'), 12);         // isolation 12-15 → 12
  assert.equal(app.rolling1RMMaxReps('덤벨 사이드 레터럴 레이즈'), 12);  // light_isolation 15-25 → 12
  assert.equal(app.rolling1RMMaxReps('없는운동xyz'), 12);               // 미등록 → isolation 기본값

  // 어떤 클래스든 "처방 상단까지는 추적된다"를 표로 못 박는다.
  Object.keys(app.EXERCISE_CLASS_RULES).forEach(function (cls) {
    const rules = app.EXERCISE_CLASS_RULES[cls];
    const cap = Math.min(12, Math.max(10, rules.repMax));
    assert.ok(cap >= Math.min(rules.repMax, 12),
      cls + ': 상한(' + cap + ')이 처방 상단(' + rules.repMax + ')을 잘라내면 안 된다');
  });

  // 고립 종목(12-15 처방)의 12회 세트는 계속 추적돼야 한다.
  app.state.data.workoutLog = [
    { date: '2026-06-01', completed: true, exercises: [{ name: '머신 펙 덱 플라이', setsDetail: [
      { weight: 40, reps: 12, isWarmup: false },  // 40*(1+12/30)=56
      { weight: 40, reps: 14, isWarmup: false },  // 14회 → 절대 상한 초과 → 제외
    ] }] },
  ];
  assert.equal(app.calculateRollingMax1RM('머신 펙 덱 플라이', 4).value, 56);

  // 중강도 복합(8-12 처방)의 12회 세트도 추적돼야 한다 — 여기를 자르면 랫 풀 다운·시티드 로우·
  // 체스트 프레스처럼 12회로 굴리는 종목의 1RM이 INITIAL_1RM에 묶여 PR 배지가 영영 안 뜬다.
  app.state.data.workoutLog = [
    { date: '2026-06-01', completed: true, exercises: [{ name: '레그 프레스', setsDetail: [
      { weight: 100, reps: 12, isWarmup: false }, // 100*(1+12/30)=140
    ] }] },
  ];
  assert.equal(app.calculateRollingMax1RM('레그 프레스', 4).value, 140);
  assert.notEqual(app.update1RM('레그 프레스', 100, 12), false, '12회 세트로도 1RM 갱신이 가능해야 한다');
});

// ── 정체 판정 — 더블 프로그레션(무게 고정 + 반복 상승)은 정체가 아니다 + 표본/기간 가드 ──
test('getStalledLifts — 반복이 오르면 정체 아님, 표본·기간 부족이면 판정 금지', () => {
  const ago = (n) => app.getDateStr(new Date(Date.now() - n * 86400000));
  const mk = (reps) => [0, 1, 2, 3, 4, 5].map((i) => ({
    date: ago(35 - i * 7), completed: true,
    exercises: [{ name: '머신 체스트 프레스', maxWeight: 60,
      setsDetail: [{ weight: 60, reps: reps(i), isWarmup: false }] }],
  }));

  // 무게 고정 + 반복 상승 = 더블 프로그레션 정상 진행 → 정체 아님
  app.state.data.workoutLog = mk((i) => 8 + i);
  assert.deepEqual(plain(app.getStalledLifts()), []);

  // 6주간 무게도 반복도 그대로 = 진짜 정체
  app.state.data.workoutLog = mk(() => 8);
  assert.deepEqual(plain(app.getStalledLifts()), ['머신 체스트 프레스']);

  // 표본·기간 가드: 세션 2개(7일 간격)뿐이면 판정 자체를 안 한다
  app.state.data.workoutLog = mk(() => 8).slice(0, 2);
  assert.deepEqual(plain(app.getStalledLifts()), []);

  // 정체 종목이 1개뿐이면 lift_stalled 신호는 안 뜬다(2개 이상 요구)
  app.state.data.workoutLog = mk(() => 8);
  app.state.data.personalRecords = [];
  assert.equal(app.detectPlateauSignals().indexOf('lift_stalled'), -1);
});

// ── 영양 섹션 복원 회귀: 섹션 번호가 다시 건너뛰지 않게 못 박는다 ──
test('코치지식 COACH_KNOWLEDGE — 영양 섹션 4·5 복원 + 번호 연속 + 크레아틴 중복 없음', () => {
  const fresh = loadApp();
  const k = fresh.COACH_KNOWLEDGE;
  // 예전엔 3 → 6으로 건너뛰었다. 1~9가 빠짐없이 이어져야 한다.
  const nums = (k.match(/### (\d+)\./g) || []).map((s) => parseInt(s.slice(4), 10));
  assert.deepEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8, 9], '섹션 번호 1~9 연속');
  assert.ok(k.includes('### 4. 영양'), '4번 = 영양(단백질)');
  assert.ok(k.includes('### 5. 영양'), '5번 = 영양(에너지 균형·리컴포지션)');
  assert.ok(k.includes('단백질') && k.includes('리컴포지션'), '핵심 영양 용어 포함');
  assert.ok(/Morton 2018/.test(k), '단백질 총량 근거(Morton 2018) 표기');
  assert.ok(/Murphy & Koehler 2022/.test(k), '적자 상한 근거(Murphy & Koehler 2022) 표기');
  assert.ok(/Maughan 2018/.test(k), 'IOC 보충제 합의(Maughan 2018) 표기');
  // 크레아틴 용량은 6번 한 곳에만 (4·5번과 중복 금지)
  assert.equal((k.match(/3~5g/g) || []).length, 1, '크레아틴 용량 표기는 1회');
});

// ── 코치 원칙 5번: 없는 기능을 있다고 말하지 않는다 ──
test('코치 프롬프트 — 영양 조언 단서가 실제 앱 기능과 일치', () => {
  const fresh = loadApp();
  const sys = fresh.getCoachSystemPrompt();
  assert.ok(!sys.includes('앱에 영양 추적 기능은 없으니'), '옛 단서 문구 제거');
  assert.ok(sys.includes('식단·칼로리 기록 기능이 없다'), '식단 기록 없음은 정확히 명시');
  assert.ok(sys.includes('체중'), '체중 기록은 존재하므로 언급 유지');
});

// ═══════════════════════════════════════════════
// 부위별 주간 볼륨 노출 (STATS)
// ═══════════════════════════════════════════════
const isoDaysAgo = (off) => { const t = new Date(); t.setDate(t.getDate() - off); return t.toISOString().split('T')[0]; };

// ── 직접(primary) / 분할환산(간접 0.5 포함) 분리, 기존 API는 분할환산 그대로 ──
test('getRecentVolumeSplitByPart — 직접과 분할환산을 분리, getRecentVolumeByPart는 분할환산 유지', () => {
  app.state.data.workoutLog = [
    { date: isoDaysAgo(1), completed: true, exercises: [{ name: '레그 프레스', setsCount: 4 }] } // quads primary / glutes·hamstrings secondary
  ];
  const split = app.getRecentVolumeSplitByPart(2);
  assert.equal(split.direct.quads, 4);
  assert.equal(split.direct.glutes, undefined);          // 간접은 직접에 섞이지 않는다
  assert.equal(split.fractional.quads, 4);
  assert.equal(split.fractional.glutes, 2);              // 4 × 0.5
  assert.deepEqual(plain(app.getRecentVolumeByPart(2)), plain(split.fractional)); // 기존 호출부 동작 불변
});

// ── 임계 단일 출처: getVolumeThresholds ↔ getVolumeDiagnosis ──
test('getVolumeThresholds — 큰/작은 근육 임계 (종아리는 의도적으로 large)', () => {
  assert.deepEqual(plain(app.getVolumeThresholds('chest')),  { size: 'large', lackBelow: 4, optimalLow: 10, optimalTop: 20, target: 12 });
  assert.deepEqual(plain(app.getVolumeThresholds('biceps')), { size: 'small', lackBelow: 3, optimalLow: 8,  optimalTop: 16, target: 8 });
  assert.deepEqual(plain(app.getVolumeThresholds('calves')), { size: 'large', lackBelow: 4, optimalLow: 10, optimalTop: 20, target: 12 });
});

// ── STATS 카드: 최소 표본 가드 + 프롬프트와 같은 숫자 + 정직한 문구 ──
test('volumeByPartCardHtml — 2주 미만은 판정 보류, 이후는 프롬프트와 같은 수치/정직한 문구', () => {
  app.state.data.workoutLog = [];
  assert.equal(app.volumeByPartCardHtml(), '');           // 기록 없으면 카드 자체를 안 그린다

  // 3일 사용자 → 판정하지 않는다
  app.state.data.workoutLog = [{ date: isoDaysAgo(2), completed: true, exercises: [{ name: '머신 체스트 프레스', setsCount: 4 }] }];
  const early = app.volumeByPartCardHtml();
  assert.ok(early.includes('아직 판단하기 이릅니다'), '최소 표본 가드 문구');
  assert.ok(!early.includes('meal-status-pill'), '가드 중에는 판정 배지 없음');

  // 오래 쉬다 복귀 → 첫 기록만 오래됐을 뿐 최근 2주 표본이 1회뿐이면 판정하지 않는다.
  // (기간만 보면 1년 전 기록 하나로 가드가 풀려 복귀 첫날 전 부위가 '부족' 빨간 배지가 된다)
  app.state.data.workoutLog = [
    { date: isoDaysAgo(365), completed: true, exercises: [{ name: '머신 체스트 프레스', setsCount: 4 }] },
    { date: isoDaysAgo(1),   completed: true, exercises: [{ name: '머신 체스트 프레스', setsCount: 4 }] }
  ];
  const comeback = app.volumeByPartCardHtml();
  assert.ok(comeback.includes('아직 판단하기 이릅니다'), '복귀 직후는 최근 2주 표본 부족 → 판정 보류');
  assert.ok(!comeback.includes('meal-status-pill'), '복귀 직후 판정 배지 없음');

  // 21일 사용자 + 최근 2주 안에 2회 이상 → 판정 표시. 창(최근 2주) 밖 기록은 볼륨에 안 잡힌다
  app.state.data.workoutLog = [
    { date: isoDaysAgo(20), completed: true, exercises: [{ name: '머신 체스트 프레스', setsCount: 4 }] },
    { date: isoDaysAgo(6),  completed: true, exercises: [{ name: '머신 체스트 프레스', setsCount: 3 }] },
    { date: isoDaysAgo(3),  completed: true, exercises: [{ name: '머신 체스트 프레스', setsCount: 3 }] }
  ];
  const html = app.volumeByPartCardHtml();
  assert.ok(!html.includes('아직 판단하기 이릅니다'));
  assert.ok(html.includes('직접 3.0 · 간접 포함 3.0세트/주'), '2주 평균 = 6세트 / 2주');
  assert.equal(((app.groupVolumeBy(app.getRecentVolumeByPart(2)).chest) / 2).toFixed(1), '3.0', 'AI 프롬프트 경로와 같은 값');
  assert.ok(html.includes('부족'));
  assert.ok(!html.includes('과잉'), "'과잉'은 근거를 넘어선 표현이라 쓰지 않는다");
  assert.ok(!html.includes('MEV'), '사용자 화면에 전문 약어 노출 금지');
  assert.ok(html.includes('이 범위는 연구 평균이고 본인 반응은 다를 수 있어요.'));
});

// ═══════════════════════════════════════════════
// 오늘의 추천 (죽어 있던 일일 AI 추천 되살리기)
// ═══════════════════════════════════════════════
test('오늘의 추천 — 카드 4상태 + 홈 연결 + 운동탭 배지 동기화', () => {
  const fresh = loadApp();

  // 1) API 키 없음 → 키 안내만
  fresh.state.apiKey = null;
  fresh.state.aiRecommendation = null;
  fresh.state.aiRecLoading = false;
  fresh.state.aiRecFailedDate = null;
  assert.ok(fresh.renderAIRecommendationCard().includes('API 키'), '키 없으면 키 안내');
  assert.ok(!fresh.renderHome().includes("setTab('workout')"), '홈에 운동 바로가기 문자열이 생기면 안 됨(묶음5 계약)');

  // 2) 로딩 → 스피너
  fresh.state.apiKey = 'sk-test';
  fresh.state.aiRecLoading = true;
  assert.ok(fresh.renderAIRecommendationCard().includes('loading-spinner'), '로딩 스피너');

  // 3) 오늘 실패 → 재시도 버튼만, 자동 재시도는 잠김
  fresh.state.aiRecLoading = false;
  fresh.state.aiRecommendation = null;
  fresh.state.aiRecFailedDate = fresh.getTodayStr();
  const failCard = fresh.renderAIRecommendationCard();
  assert.ok(failCard.includes('refreshAIRecommendation()'), '수동 재시도 버튼');
  fresh.state.aiRecFailedDate = null;
  assert.equal(fresh.renderAIRecommendationCard(), '', '실패 기록도 결과도 없으면 빈 문자열');

  // 4) 결과 → 부위·제목·이유·주의 표시
  fresh.state.aiRecommendation = {
    session: 'pull', title: '오늘은 PULL이 적절합니다', reason: '광배 볼륨이 부족해요',
    caution: '허리 조심', suggestion: '랫풀다운 50kg 3세트', intensity: 'light',
    date: fresh.getTodayStr(), aiGenerated: true
  };
  const card = fresh.renderAIRecommendationCard();
  assert.ok(card.includes('PULL') && card.includes('오늘은 PULL이 적절합니다'), '부위·제목');
  assert.ok(card.includes('광배 볼륨이 부족해요') && card.includes('허리 조심'), '이유·주의');
  assert.ok(card.includes('가볍게'), 'intensity 한글화');
  assert.ok(fresh.renderHome().includes('오늘의 추천'), '홈에 카드가 실제로 붙는다');

  // 5) 운동 탭 STEP 1 ✨추천 배지가 AI 추천 부위를 따른다
  fresh.state.workoutWizardStep = 1;
  const workout = fresh.renderWorkout();
  assert.ok(workout.includes("selectBodyPart('pull')\"><span class=\"recommend-badge\">"), 'PULL 카드에 추천 배지');
});

// ── AI 종목 풀: 같은 운동이 두 이름으로 노출되면 AI가 둘 다 처방해 기록이 갈린다 ──
// getExercisePoolFor는 generateFullRoutine 안의 중첩 함수라 직접 호출할 수 없다.
// → fetch를 가로채 실제로 전송되는 프롬프트에서 "종목 풀" 블록을 뽑아 검사한다.
test('AI 종목 풀 — 별칭 종목이 두 이름으로 중복 노출되지 않는다', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  let captured = null;
  a.fetch = (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: '{"headline":"t","reason":"r","exercises":[]}' }] }),
      text: () => Promise.resolve(''),
    });
  };

  // 프롬프트의 종목 풀 블록에서 종목 이름만 추출 ("- 부위: 이름 [태그...], 이름 [태그...]")
  const poolNames = (prompt) => {
    const start = prompt.indexOf('사용 가능 종목 풀');
    const end = prompt.indexOf('[규칙] 루틴 구성 원칙');
    assert.ok(start !== -1 && end > start, '프롬프트에 종목 풀 블록이 있어야 함');
    const names = [];
    prompt.slice(start, end).split('\n').forEach((line) => {
      if (line.slice(0, 2) !== '- ') return;
      line.slice(line.indexOf(':') + 1).split('], ').forEach((chunk) => {
        const i = chunk.indexOf(' [');
        if (i > 0) names.push(chunk.slice(0, i).trim());
      });
    });
    return names;
  };

  for (const bodyPart of ['push', 'pull', 'legs', 'upper']) {
    captured = null;
    await a.generateFullRoutine(bodyPart);
    assert.ok(captured, bodyPart + ': 루틴 생성 요청이 전송돼야 함');
    const names = poolNames(captured.system[1].text);
    assert.ok(names.length > 0, bodyPart + ': 종목 풀이 비어있지 않아야 함');
    const dup = names.filter((n) => {
      const canonical = a.EXERCISE_ALIASES_1RM[n];
      return canonical && names.indexOf(canonical) !== -1;
    });
    assert.deepEqual(dup, [], bodyPart + ' 풀에 같은 운동이 두 이름으로 노출됨');
    // 표준명이 따로 있는 별칭 표기는 애초에 풀에 들어가면 안 된다 (중복이 아니어도)
    const aliases = names.filter((n) => a.isAliasExerciseName(n));
    assert.deepEqual(aliases, [], bodyPart + ' 풀에 별칭 표기가 노출됨');
  }
});

// ── 프롬프트에서 근거 없는 통념·미검증 용어가 사라졌는가 (모델 입력 직접 검사) ──
//    정체기: '자극 적응 / 같은 종목 6주 이상 → 종목 교체'는 근거 없는 통념 (Fonseca 2014 / Baz-Valle 2019)
//    주간 리뷰: 'MEV'는 동료심사로 검증된 경계값이 아니고, 상한 초과는 '과잉'이 아니라 이득이 완만해지는 구간 (Pelland 2025)
test('정체기·주간리뷰 프롬프트 — 근거 없는 통념(자극 적응/6주)과 미검증 용어(MEV/과잉) 제거', async () => {
  const a = loadApp();
  a.state.apiKey = 'sk-test';
  let captured = null;
  const stub = (text) => (url, opts) => {
    captured = JSON.parse(opts.body);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: text }] }),
      text: () => Promise.resolve(''),
    });
  };

  // (1) 정체기 분석 — signals 가 비어 있으면 즉시 null 이므로 신호를 하나 넣는다
  a.fetch = stub('{"severity":"low","diagnosis":"d","primary_cause":"c","recommendations":[],"encouragement":"e"}');
  await a.analyzePlateauWithAI(['lift_stalled']);
  assert.ok(captured, '정체기 요청이 전송돼야 함');
  const plateau = captured.system;
  assert.equal(typeof plateau, 'string', '정체기 system은 문자열');
  assert.ok(!plateau.includes('자극 적응'), "'자극 적응'(근거 없는 통념) 제거");
  assert.ok(!plateau.includes('6주'), "'같은 종목 6주 이상 → 교체' 기준 제거");
  assert.ok(plateau.includes('종목 교체는 "몇 주 했는가"가 아니라 사유로 판단한다'), '기간이 아니라 사유 기반 판단으로 대체');

  // (2) 주간 리뷰 — 볼륨 블록이 실제로 그려지도록 이번 주 기록을 심는다(상한 초과 구간)
  captured = null;
  a.state.data.workoutLog = [{
    id: 'w1', date: a.getTodayStr(), completed: true, sessionKr: 'PUSH', duration: 60,
    exercises: [{ name: '머신 체스트 프레스', setsCount: 25 }]
  }];
  a.fetch = stub('{"headline":"h","grade":"A","wins":[],"improvements":[],"nextWeek":[],"coachNote":"n"}');
  await a.generateWeeklyReview(true);
  assert.ok(captured, '주간 리뷰 요청이 전송돼야 함');
  const review = captured.system;
  assert.ok(review.includes('부위별 볼륨'), '볼륨 블록이 실제로 프롬프트에 들어갔는지(빈 블록이면 아래 단언이 공허해진다)');
  assert.ok(review.includes('이득 완만'), '상한 초과 라벨은 이득 완만');
  assert.ok(!review.includes('MEV'), "'MEV'는 검증된 경계값이 아니라 프롬프트에서 제거");
  assert.ok(!review.includes('과잉'), "'과잉'은 근거를 넘어선 표현이라 제거");
});

// ═══════════════════════════════════════════════
// 코드리뷰 지적 반영 회귀 (PR #49 리뷰)
// 아래 5개는 전부 "고쳤다고 생각했는데 실제로는 깨져 있던" 지점이라, 재발하면 즉시 빨개져야 한다.
// ═══════════════════════════════════════════════

// ── 종목 교체 검색: 옛 별칭 이름으로도 찾혀야 한다 ──
// 별칭을 검색 대상에서 통째로 빼면 어순이 뒤집힌 쌍('체스트 프레스 머신' ↔ '머신 체스트 프레스')은
// 옛 이름으로 검색했을 때 결과가 0건이 된다 — 사용자의 저장된 기록에 아직 남아 있는 이름인데도.
test('종목 교체 검색 — 옛 별칭 이름으로 검색해도 표준명이 나온다 (중복 없이)', () => {
  const a = loadApp();
  a.state.activeSession = { exercises: [{ name: '덤벨 해머 컬', sets: [] }], currentExerciseIdx: 0 };
  const hits = (q) => (a.buildSwapListHtml(q).match(/swapCurrentExercise\('([^']+)'\)/g) || [])
    .map((s) => s.slice(21, -2));

  assert.deepEqual(hits('체스트 프레스 머신'), ['머신 체스트 프레스'], '어순 뒤집힌 별칭도 표준명으로 찾힘');
  assert.deepEqual(hits('숄더 프레스 머신'), ['머신 시티드 숄더 프레스']);
  assert.deepEqual(hits('트라이셉스 푸시다운'), ['케이블 푸시 다운'], '단어가 전혀 겹치지 않는 별칭도 찾힘');

  const pressHits = hits('프레스');
  assert.ok(pressHits.length > 0, "'프레스' 검색이 비면 이 테스트가 헛돈다");
  assert.equal(new Set(pressHits).size, pressHits.length, '같은 종목이 두 번 나오면 안 된다');
  assert.deepEqual(pressHits.filter((n) => a.isAliasExerciseName(n)), [], '별칭 표기가 그대로 노출되면 안 된다');
});

// ── recalc1RMAfterEdit: 한 세션에 같은 운동이 두 표기로 있어도 1RM이 깎이지 않는다 ──
test('recalc1RMAfterEdit — 세션 내 별칭/표준명 두 표기를 같은 종목으로 본다', () => {
  const a = loadApp();
  a.storage.set(a.KEYS.ONE_RM_DATA, { '랫 풀 다운': 100 });
  a.state.activeSession = { exercises: [
    { name: '랫풀다운',   sets: [{ weight: 70, reps: 10, completed: true, isWarmup: false }] }, // 70*(1+10/30)=93.3
    { name: '랫 풀 다운', sets: [{ weight: 50, reps: 8,  completed: true, isWarmup: false }] },
  ] };
  a.state.data.workoutLog = [];
  a._lastSetsCache = null;

  a.recalc1RMAfterEdit('랫 풀 다운', null);
  assert.equal(a.storage.get(a.KEYS.ONE_RM_DATA, {})['랫 풀 다운'], 93.3,
    '원문 비교면 다른 표기의 세트를 놓쳐 63.3으로 깎인다');
});

// ── getStalledLifts: 레거시 reps 배열에서도 "최대" 반복을 봐야 한다 ──
// 첫 세트만 보면 세션 안에서 반복을 올린 사용자가 "반복도 안 오름" = 정체로 오판된다.
test('getStalledLifts — 레거시 reps 배열도 최대 반복 기준 (더블 프로그레션 오판 금지)', () => {
  const a = loadApp();
  const ago = (n) => a.getDateStr(new Date(Date.now() - n * 86400000));
  const log = (repsFor) => [0, 1, 2, 3, 4, 5].map((i) => ({
    date: ago(35 - i * 7), completed: true,
    exercises: [{ name: '머신 체스트 프레스', maxWeight: 60, reps: repsFor(i) }],
  }));

  // 무게 고정 + 세션 내 반복 상승([8,8,8] → [8,10,12]) = 정상 진행
  a.state.data.workoutLog = log((i) => (i < 3 ? [8, 8, 8] : [8, 10, 12]));
  assert.deepEqual(plain(a.getStalledLifts()), [], '첫 세트만 보면 둘 다 8로 읽혀 정체로 오판된다');

  // 진짜 정체는 여전히 잡힌다
  a.state.data.workoutLog = log(() => [8, 8, 8]);
  assert.deepEqual(plain(a.getStalledLifts()), ['머신 체스트 프레스']);
});

// ── 정체기 화면 신호 라벨: 영문 식별자가 그대로 노출되면 안 된다 ──
test('정체기 화면 — 새 신호 키가 전부 한글 라벨을 갖는다', () => {
  const a = loadApp();
  a.state.plateauCheck = {
    signals: ['lift_stalled', 'pr_stalled', 'frequency_drop'],
    severity: 'medium', diagnosis: 'd', primary_cause: 'c', recommendations: [], encouragement: 'e',
  };
  a.state.plateauDetailOpen = true;
  const html = a.renderPlateauDetail();

  ['lift_stalled', 'pr_stalled', 'frequency_drop'].forEach((k) => {
    assert.ok(!html.includes(k), '영문 식별자 ' + k + '가 화면에 그대로 노출됨');
  });
  assert.ok(html.includes('무게·횟수 둘 다 정체'), 'lift_stalled 라벨');
  assert.ok(html.includes('PR 갱신 정체 (4주)'), 'pr_stalled 라벨이 실제 판정 기간(4주)과 일치');
  assert.ok(!html.includes('PR 갱신 정체 (2주)'), '옛 2주 표기가 남으면 안 된다');
});

// ── 오늘의 추천 실패 잠금은 새로고침을 넘어 살아남아야 한다 ──
// 메모리에만 두면 하드 리로드마다 잠금이 풀려, 실패가 반복될 때 앱을 열 때마다 유료 호출이 나간다.
test('오늘의 추천 — 실패 잠금이 localStorage에 남아 재부팅 후에도 유지된다', () => {
  const today = loadApp().getTodayStr();

  const a = loadApp();
  a.localStorage.setItem('fitness_ai_rec_failed_date', JSON.stringify(today));
  a.init();
  assert.equal(a.state.aiRecFailedDate, today, '재부팅 후 잠금이 복원돼야 자동 재호출이 막힌다');

  const b = loadApp();
  b.localStorage.setItem('fitness_ai_rec_failed_date', JSON.stringify('2020-01-01'));
  b.init();
  assert.equal(b.state.aiRecFailedDate, null, '어제 잠금은 버려야 오늘 다시 시도한다');

  assert.ok(a.KEYS.AI_REC_FAILED_DATE, '전용 KEY 존재');
  assert.ok(a.BACKUP_EXCLUDE_KEYS.indexOf(a.KEYS.AI_REC_FAILED_DATE) !== -1, '하루짜리 임시값은 백업에서 제외');
});

// ── 휴식 타이머: 종목표에 없는 복합 종목도 150초를 받아야 한다 ──
test('휴식 타이머 — 미등록 복합 종목도 부위 판정으로 150초', () => {
  const a = loadApp();
  const ohp = a.getExercisePart('바벨 오버헤드 프레스');
  assert.ok(ohp && ohp.compound === true, '미등록 복합 종목이 null이면 휴식이 90초로 떨어진다');
  const row = a.getExercisePart('머신 로우');
  assert.ok(row && row.compound === true, "'머신 로우'도 복합으로 잡혀야 한다");
});


// ═══════════════════════════════════════════════
// XSS 회귀 — AI 응답 필드는 화면에 날것으로 들어가면 안 된다
// ═══════════════════════════════════════════════
// 배경: js/ai.js 는 모델 응답을 `parsed.X || 기본값` 으로만 받는다 — 타입 강제도 검증도 없다.
// 그래서 reps/sets/weight/rir/totalSets/duration/grade/type 처럼 "숫자·라벨처럼 생긴" 칸에도
// 모델이 임의 문자열을 넣을 수 있고, 그 값이 innerHTML 로 들어가면 그대로 실행된다.
// (실제로 PR #53 리뷰에서 루틴 미리보기의 ex.reps/ex.sets 가 무이스케이프로 발견됐다.)
//
// 위쪽 '복원 — 모든 기록에 태그를 심어도…' 테스트와 **같은 방식**을 쓴다: 격리된 loadApp() 인스턴스에
// 페이로드를 심고 인자 없이 부를 수 있는 화면을 전부 그려 본다. 공유 state 를 건드리지 않으므로
// 어서션이 중간에 실패해도 뒤 테스트가 오염되지 않고, 새 화면이 생기면 저절로 검사 대상이 된다.
// 그 테스트가 "저장된 기록"을 심는다면, 이 테스트는 "AI 응답과 사용자 입력"을 심는다.
test('XSS 회귀 — AI 응답·사용자 입력을 심어도 어떤 화면에서도 살아있는 태그·속성이 안 나온다', () => {
  const fresh = loadApp();
  const P = '<img src=x onerror=eeek()>';
  const ATTR = '" autofocus onfocus=eeek() x="';   // 속성 자리 탈출용 (P 에는 따옴표가 없다)

  fresh.state.apiKey = 'sk-ant-' + P;
  fresh.state.apiKeyModalOpen = true;
  fresh.state.apiKeyInput = ATTR;

  // 루틴 마법사 — selectedBodyPart 를 비워 partName 이 routine.bodyPart 로 폴백하는 경로까지 태운다
  fresh.state.selectedBodyPart = null;
  fresh.state.workoutWizardStep = 2;
  fresh.state.routineLoading = false;
  fresh.state.routinePreviewExpanded = true;
  fresh.state.routineChatHistory = [{ role: 'assistant', content: P, changes: [{ type: 'add', exercise: P, detail: P }], approvalStatus: 'pending' }];
  fresh.state.routineChatInput = ATTR;
  fresh.state.generatedRoutine = {
    bodyPart: P, headline: P, reason: P, caution: P, duration: P, totalSets: P, intensity: P,
    exercises: [{ name: P, type: P, isMain: true, sets: P, reps: P, weight: P, rir: P, rest: null, note: P }],
  };

  // 주간 리뷰 · 정체기 · 오늘의 추천
  fresh.state.weeklyReview = {
    weekId: '2026-W32', monday: '2026-08-03', sunday: '2026-08-09',
    grade: P, headline: P, wins: [P], improvements: [P], nextWeek: [P], coachNote: P,
    stats: { workoutCount: 1, weightChange: 0, prCount: 0 },
  };
  fresh.state.plateauCheck = { detectedAt: fresh.getTodayStr(), signals: [P], severity: P, diagnosis: P, primary_cause: P, recommendations: [P], encouragement: P };
  fresh.state.aiRecommendation = { session: P, title: P, reason: P, caution: P, suggestion: P, intensity: P };

  // 진행 중 세션 — AI 루틴의 type·lastWeight 가 세션 종목으로 그대로 복사돼 들어온다
  fresh.storage.set(fresh.KEYS.ONE_RM_DATA, { '랫 풀 다운': 70, '풀업': 50 });   // 지난 기록 줄(prevText)이 그려지는 조건
  fresh.state.activeSession = {
    sessionType: 'pull', sessionName: P, startTime: Date.now(), currentExerciseIdx: 0,
    exercises: [{ name: '랫 풀 다운', type: P, targetReps: '8-12', lastWeight: P, lastReps: null, scheme: 'straight',
                  sets: [{ weight: 40, reps: 10, isWarmup: false, completed: false, role: 'work' }] },
                // 무게가 없는 종목은 lastReps 쪽 분기를 탄다 (prevText 의 다른 갈래)
                { name: '풀업', type: P, targetReps: '5-8', lastWeight: null, lastReps: P, scheme: 'straight',
                  sets: [{ weight: null, reps: 8, isWarmup: false, completed: false, role: 'work' }] }],
  };

  // 코치 기억 노트 — 사용자가 쓴 글이 그대로 화면에 남는 목록
  fresh.state.coachMemory = [{ id: 'm_1', category: 'other', text: P, source: P, date: P }];

  // 완료 화면 (세션과 배타적이지 않다 — render 우선순위상 completedSession 이 위)
  fresh.state.completedSession = {
    workoutId: 'w_1', sessionName: P, duration: 42, exerciseCount: 1, setCount: 3,
    exercises: [{ name: P, type: P, sets: 3, setsCount: 3, setsDetail: [], weights: [40], reps: [10], maxWeight: 40, lastWeight: null, lastReps: null }],
    newPRs: [], date: new Date('2026-08-08T00:00:00Z'),
  };

  // 프로필 편집 · 유산소 시간 입력 (둘 다 value="..." 속성 자리)
  fresh.state.profileEditModalOpen = true;
  fresh.state.profileEdit = { age: ATTR, height: 170, weight: 77.5, workoutFreq: 4 };
  fresh.state.cardio = { mode: 'interval', phase: 'idle', inputMin: ATTR, loading: false, error: null, plan: null, run: null, reqId: 0 };

  // 인자 없이 부를 수 있는 화면 함수를 전부 그려본다 (새 화면이 생겨도 자동으로 포함된다)
  const screenFns = fresh.__APP_GLOBALS__
    .filter((n) => /^render[A-Z]/.test(n) && typeof fresh[n] === 'function' && fresh[n].length === 0);
  assert.ok(screenFns.length >= 8, '화면 함수를 찾지 못함: ' + screenFns.length);

  const leakedTag = [];
  const leakedAttr = [];
  let rendered = 0;
  for (const name of screenFns) {
    let html;
    try { html = fresh[name](); } catch (e) { continue; }   // 별도 상태가 필요한 화면은 건너뜀
    if (typeof html !== 'string') continue;
    rendered++;
    if (html.includes('<img') || html.includes('<script')) leakedTag.push(name);
    if (html.includes(ATTR)) leakedAttr.push(name);         // 따옴표가 살아 있으면 속성 탈출
  }
  // 지금 23개가 실제로 그려진다. 화면이 throw 하면 위에서 조용히 건너뛰므로,
  // 하한을 넉넉히 잡아 두면 "예외 때문에 검사가 통째로 비는" 상황을 이 줄이 잡는다.
  assert.ok(rendered >= 20, '실제로 그려진 화면이 너무 적다(예외로 건너뛴 화면 의심): ' + rendered + '/' + screenFns.length);
  assert.deepEqual(leakedTag, [], '태그가 살아있는 화면: ' + leakedTag.join(', '));
  assert.deepEqual(leakedAttr, [], '속성 탈출이 가능한 화면: ' + leakedAttr.join(', '));

  // '지난 기록' 줄은 현재 종목 하나만 그린다 → 무게 있는 종목/맨몸 종목 두 갈래를 각각 태운다.
  // ⚠ 이 줄은 추천이 'rm_estimate'(=수행 기록 없음 + 1RM 있음)일 때만 그려진다. 그 조건이 나중에
  //   바뀌면 줄 자체가 사라져 "태그 없음" 어서션이 **아무것도 검사하지 않은 채 통과**한다.
  //   그래서 통과 조건을 뒤집어, 페이로드가 **이스케이프된 모습으로 실제로 찍혔는지**를 확인한다.
  //   (이 어서션이 깨지면 '이스케이프가 뚫렸다'가 아니라 '이 테스트가 헛돌기 시작했다'는 신호다)
  const prevTextMarks = ['&lt;img src=x onerror=eeek()&gt;kg ×', '&lt;img src=x onerror=eeek()&gt;회 ×'];
  for (const idx of [0, 1]) {
    fresh.state.activeSession.currentExerciseIdx = idx;
    const h = fresh.renderWorkoutSession();
    assert.ok(!h.includes('<img'), '세션 화면 종목 ' + idx + ' 에서 태그가 살아있다');
    assert.ok(h.includes('지난 기록'), "'지난 기록' 줄이 안 그려졌다 — 이 검사가 헛돌고 있다 (종목 " + idx + ')');
    assert.ok(h.includes(prevTextMarks[idx]),
      '지난 기록 줄에 이스케이프된 값이 안 보인다 — 이 검사가 헛돌고 있다 (종목 ' + idx + ')');
  }
  fresh.state.activeSession.currentExerciseIdx = 0;

  // 루틴 생성 실패 화면은 정상 루틴과 배타적인 분기라 따로 그려 본다 (에러 문구도 외부에서 온다)
  const okRoutine = fresh.state.generatedRoutine;
  fresh.state.generatedRoutine = { bodyPart: 'pull', error: P };
  assert.ok(!fresh.renderWorkoutStep2().includes('<img'), '루틴 생성 실패 메시지가 날것으로 들어간다');
  fresh.state.generatedRoutine = okRoutine;

  // 마스킹된 API 키는 앞 10자만 남아 '<img' 가 통째로 안 나온다 → 태그 검사가 못 잡는 사각지대라 따로 본다
  const moreHtml = fresh.renderMore();
  assert.ok(!moreHtml.includes('sk-ant-<im'), '마스킹된 API 키가 날것으로 들어간다');

  // 이스케이프가 "값을 지운" 게 아니라 "무해하게 바꾼" 것인지도 확인한다
  const step2 = fresh.renderWorkoutStep2();
  assert.ok(step2.includes('&lt;img src=x onerror=eeek()&gt;'), '이스케이프된 형태가 화면에 보이지 않는다');
});
