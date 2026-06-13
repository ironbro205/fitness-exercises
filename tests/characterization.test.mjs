// 헬스앱 특성화(골든 마스터) 테스트.
// 목적: index.html 분리 리팩터링이 동작을 바꾸지 않았음을 보장한다.
// 원본에서 관찰한 출력을 골든값으로 고정 → 분리 후에도 동일해야 통과.
// 테스트는 전역 "공개 함수"만 호출하므로, 파일을 어떻게 재배치해도 살아남는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp } from './_harness.mjs';

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

// ── 운동 GIF 매칭 (정확 + 토큰 퍼지 + 실패) ──
test('findExerciseGif — 정확/퍼지/미스', () => {
  assert.equal(
    app.findExerciseGif('레그 프레스'),
    'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1463-2Qh2J1e.gif',
  );
  // "머신 시티드 숄더 프레스" → 키 "숄더 프레스 머신" 토큰 전부 포함 → 매칭
  assert.equal(
    app.findExerciseGif('머신 시티드 숄더 프레스'),
    'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0603-67n3r98.gif',
  );
  assert.equal(app.findExerciseGif('없는운동xyz'), null);
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
