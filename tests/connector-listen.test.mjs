// Tests for api/mcp/[token].mjs through the real mcp-handler (needs node_modules: npm ci; skipped without them).
// Run: node --test tests/connector-listen.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

var TOKEN = 'test-token-0123456789-abcdef';
var VERSION = '2026-07-28';
delete process.env.VERCEL;
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.CONNECTOR_STORE = 'memory';
process.env.HEALTH_SYNC_TOKEN = TOKEN;

var mcpMod = null;
var skip = false;
try {
  mcpMod = await import('../api/mcp/[token].mjs');
} catch (e) {
  if (!e || e.code !== 'ERR_MODULE_NOT_FOUND' || !String(e.message).includes('Cannot find package')) throw e;
  skip = 'node_modules 없음 (npm ci): ' + e.message.split('\n')[0];
}

function rpc(method, params) {
  var meta = {
    'io.modelcontextprotocol/protocolVersion': VERSION,
    'io.modelcontextprotocol/clientInfo': { name: 'test-client', version: '1.0.0' },
    'io.modelcontextprotocol/clientCapabilities': {}
  };
  return new Request('http://localhost/api/mcp/' + TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': VERSION,
      'Mcp-Method': method
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: Object.assign({ _meta: meta }, params) })
  });
}

function within(ms, promise) {
  var timer;
  var timeout = new Promise(function (_, reject) {
    timer = setTimeout(function () { reject(new Error('no response within ' + ms + 'ms')); }, ms);
  });
  return Promise.race([promise, timeout]).finally(function () { clearTimeout(timer); });
}

test('mcp — subscriptions/listen 은 스트림을 열지 않고 바로 -32603 으로 끝난다', { skip: skip }, async () => {
  var res = await within(2000, mcpMod.default.fetch(rpc('subscriptions/listen', { notifications: { toolsListChanged: true } })));
  var type = res.headers.get('content-type') || '';
  assert.ok(!type.includes('text/event-stream'), 'content-type: ' + type);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  var body = await within(2000, res.json());
  assert.equal(body.error.code, -32603);
  assert.equal(body.error.message, 'Subscription limit reached');
  assert.equal(body.id, 1);
});

test('mcp — tools/list 는 그대로 도구 5개', { skip: skip }, async () => {
  var res = await within(2000, mcpMod.default.fetch(rpc('tools/list', {})));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  var body = await res.json();
  assert.deepEqual(body.result.tools.map(function (t) { return t.name; }).sort(),
    ['get_saved_plans', 'get_training_context', 'save_today_cardio', 'save_week_plan', 'update_week_sessions']);
});
