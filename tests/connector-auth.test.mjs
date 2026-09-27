// Zero-dependency tests for api/_lib/auth.mjs. Run: node --test tests/connector-auth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkToken, bearerToken, checkBearer, isAuthConfigured } from '../api/_lib/auth.mjs';

var GOOD = 'abcdefghij0123456789XYZ'; // 23 chars

function withToken(value, fn) {
  var prev = process.env.HEALTH_SYNC_TOKEN;
  if (value === undefined) delete process.env.HEALTH_SYNC_TOKEN;
  else process.env.HEALTH_SYNC_TOKEN = value;
  try { fn(); } finally {
    if (prev === undefined) delete process.env.HEALTH_SYNC_TOKEN;
    else process.env.HEALTH_SYNC_TOKEN = prev;
  }
}

test('fail closed — 토큰이 없으면 무엇이든 거부', () => {
  withToken(undefined, () => {
    assert.equal(isAuthConfigured(), false);
    assert.equal(checkToken(''), false);
    assert.equal(checkToken('undefined'), false);
    assert.equal(checkToken(GOOD), false);
  });
});

test('fail closed — 20자 미만이면 같은 값이어도 거부', () => {
  var short = 'a'.repeat(19);
  withToken(short, () => {
    assert.equal(isAuthConfigured(), false);
    assert.equal(checkToken(short), false);
  });
  var exact = 'b'.repeat(20);
  withToken(exact, () => {
    assert.equal(isAuthConfigured(), true);
    assert.equal(checkToken(exact), true);
  });
});

test('맞는 토큰만 통과, 틀린 토큰·길이 다름·문자열 아님은 거부', () => {
  withToken(GOOD, () => {
    assert.equal(checkToken(GOOD), true);
    assert.equal(checkToken(GOOD.slice(0, -1) + 'Q'), false, '같은 길이, 다른 값');
    assert.equal(checkToken(GOOD + 'x'), false, '더 김');
    assert.equal(checkToken(GOOD.slice(0, -1)), false, '더 짧음');
    assert.equal(checkToken(''), false);
    assert.equal(checkToken(null), false);
    assert.equal(checkToken(undefined), false);
    assert.equal(checkToken(12345), false);
  });
});

test('Bearer 헤더 읽기', () => {
  withToken(GOOD, () => {
    var ok = new Request('http://x/api/plan', { headers: { Authorization: 'Bearer ' + GOOD } });
    assert.equal(bearerToken(ok), GOOD);
    assert.equal(checkBearer(ok), true);
    assert.equal(checkBearer(new Request('http://x/api/plan', { headers: { Authorization: 'bearer ' + GOOD } })), true);
    assert.equal(checkBearer(new Request('http://x/api/plan')), false);
    assert.equal(checkBearer(new Request('http://x/api/plan', { headers: { Authorization: 'Basic ' + GOOD } })), false);
    assert.equal(checkBearer(new Request('http://x/api/plan', { headers: { Authorization: 'Bearer wrong' } })), false);
  });
});
