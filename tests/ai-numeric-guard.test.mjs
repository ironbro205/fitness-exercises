// 숫자 강제(aiNum) 회귀 테스트 — 유산소 구간 정규화(cardioFitToTotal)가 쓰는 파싱 경계.
//
// 배경: 구간 계획의 숫자 칸에 "300초" · "4.5km/h" · "8%" 같은 글자가 섞여 오면
// Number() 는 NaN 이라 구간이 통째로 버려진다. aiNum 이 그 값을 숫자로 접는지 지킨다.
// (앱 안 AI 호출은 삭제됐다 — AI 응답 전용 정규화 테스트는 함께 지웠다.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './_harness.mjs';

const app = loadApp();

test('aiNum — 글자 속 첫 숫자를 읽는다 (범위는 아래값 = 보수적)', () => {
  assert.equal(app.aiNum('3-4', 99), 3, '"3-4" 는 아래값 3');
  assert.equal(app.aiNum('8~12', 99), 8, '물결표 범위도 아래값');
  assert.equal(app.aiNum('40kg', 99), 40);
  assert.equal(app.aiNum('90초', 99), 90);
  assert.equal(app.aiNum('약 3세트', 99), 3, '앞이 글자여도 뒤의 숫자를 찾는다');
  assert.equal(app.aiNum('7.5', 99), 7.5);
  assert.equal(app.aiNum('-5', 99), -5, '맨 앞의 부호는 살린다');
  assert.equal(app.aiNum(42, 99), 42);
});

test('aiNum — 숫자로 읽을 수 없으면 기본값을 그대로 돌려준다', () => {
  for (const bad of ['많이', '', '   ', null, undefined, true, false, {}, [], NaN, Infinity, -Infinity]) {
    assert.equal(app.aiNum(bad, 'FALLBACK'), 'FALLBACK', `${String(bad)} 는 기본값이어야 한다`);
  }
  assert.equal(app.aiNum('많이', null), null, '기본값이 null 이면 null');
});

test('aiNum — min/max 는 자르고, positive 는 0 이하를 "값 없음"으로 본다', () => {
  assert.equal(app.aiNum(999999, 0, { max: 500 }), 500);
  assert.equal(app.aiNum(-10, 0, { min: 0 }), 0);
  assert.equal(app.aiNum(0, 'FALLBACK', { positive: true }), 'FALLBACK');
  assert.equal(app.aiNum(-3, 'FALLBACK', { positive: true }), 'FALLBACK');
  assert.equal(app.aiNum(0, 0, {}), 0, 'positive 없이는 0 도 유효한 값');
});

test('유산소 — 구간 시간 단위가 섞여도 비율이 맞는다', () => {
  // "5분"(=300초)과 "120초"가 섞여 오는 경우. 숫자만 읽으면 5:120 비율로 짜여
  // 몸풀기가 30초, 본 구간이 29분30초가 된다.
  const segs = app.cardioFitToTotal(
    [
      { type: 'warmup', sec: '5분', speed: 5, label: 'w' },
      { type: 'walk', sec: '600초', speed: 5.5, label: 'm' },
    ],
    1800,
    { defaultSpeed: { warmup: 5, walk: 5.5 }, defaultLabel: { warmup: '몸풀기', walk: '본 구간' } }
  );
  assert.ok(segs);
  assert.equal(segs[0].endSec, 600, '300:600 비율 → 30분의 1/3 = 10분');
  assert.equal(segs[1].endSec, 1800);
});

test('유산소 — 속도·경사·시간에 단위가 붙어도 구간을 버리지 않는다', () => {
  // ★기본값과 다른 속도를 일부러 쓴다 — 기본값과 같으면 "강제했는지"와 "폴백으로 떨어졌는지"를 구분할 수 없다.
  const segs = app.cardioFitToTotal(
    [
      { type: 'warmup', sec: '300초', speed: '4.5km/h', incline: '0%', label: 'w' },
      { type: 'walk', sec: '1500초', speed: '6.2 km/h', incline: '8%', label: 'm' },
    ],
    1800,
    { defaultSpeed: { warmup: 5, walk: 5.5 }, defaultLabel: { warmup: '몸풀기', walk: '본 구간' }, incline: true, inclineMax: 12 }
  );
  assert.ok(segs, 'Number("300초")=NaN 이라 예전엔 두 구간 모두 버려져 폴백으로 떨어졌다');
  assert.equal(segs.length, 2);
  assert.equal(segs[0].speed, 4.5, '"4.5km/h" 를 기본값(5)이 아니라 4.5 로 읽는다');
  assert.equal(segs[1].speed, 6.2, '"6.2 km/h" 를 기본값(5.5)이 아니라 6.2 로 읽는다');
  assert.equal(segs[1].incline, 8, '"8%" 를 0 이 아니라 8 로 읽는다');
  assert.equal(segs[segs.length - 1].endSec, 1800, '총시간 계약은 그대로');
});
