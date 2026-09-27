// Remote MCP endpoint: /api/mcp/<code>. The last path segment must equal HEALTH_SYNC_TOKEN, otherwise 404.
// Serves the 2026-07-28 protocol and the 2025-era stateless fallback through mcp-handler v2.
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { checkToken } from '../_lib/auth.mjs';
import { getStore } from '../_lib/store.mjs';
import { createTools, SESSIONS, CARDIO_MODES, SEGMENT_TYPES } from '../_lib/tools.mjs';

function tools() {
  return createTools({ store: getStore() });
}

var sessionEnum = z.enum(SESSIONS);

var routineInput = z.object({
  session: sessionEnum,
  title: z.string().min(1),
  note: z.string().optional(),
  exercises: z.array(z.object({
    name: z.string().min(1),
    note: z.string().optional(),
    sets: z.array(z.object({
      weight: z.number().min(0).max(500).nullable(),
      reps: z.union([z.number().int().min(1).max(100), z.string().regex(/^\d{1,3}-\d{1,3}$/)]),
      warmup: z.boolean().optional(),
      restSec: z.number().int().min(0).max(600).optional()
    })).min(1).max(15)
  })).min(1).max(20)
});

var cardioInput = z.object({
  mode: z.enum(CARDIO_MODES),
  title: z.string().min(1),
  note: z.string().optional(),
  segments: z.array(z.object({
    type: z.enum(SEGMENT_TYPES),
    sec: z.number().int().min(10).max(3600),
    speed: z.number().min(0).max(20),
    incline: z.number().min(0).max(12).optional()
  })).min(1).max(60)
});

var mcpHandler = createMcpHandler(function (server) {
  server.registerTool('get_training_context', {
    description:
      '헬스앱이 마지막으로 올린 기록 스냅샷을 읽기 좋은 글 하나로 돌려준다. ' +
      '글은 올린 시각(KST)과 경과 시간, 헬스앱 코치 안내, 사용자 정보(나이·키·체중·보유 장비), 최근 8주 웨이트 원자료(세션별 모든 세트), 8주 넘게 안 한 종목의 마지막 1회, 최근 8주 유산소 원자료, 체중 기록, 종목 목록 순서로 되어 있다. ' +
      'session(push·pull·legs·upper·free)을 주면 종목 목록에는 그 세션 목록만 들어가고, 주지 않으면 세션별 목록이 모두 들어간다. ' +
      '앱이 계산한 추천 무게·1RM·정체 판정 같은 값은 들어 있지 않다. ' +
      '스냅샷이 아직 없으면 헬스앱을 열어 달라는 한 줄만 돌려주고, 올린 지 12시간이 넘었으면 첫 줄에 경고가 붙는다.',
    inputSchema: z.object({ session: sessionEnum.optional() }),
    annotations: { readOnlyHint: true }
  }, async function (args) {
    return tools().getTrainingContext(args);
  });

  server.registerTool('save_today_routine', {
    description:
      '오늘(KST 날짜) 할 웨이트 루틴 하나를 헬스앱에 저장한다. 이전에 저장된 루틴은 새 루틴으로 덮어쓴다. ' +
      '세트마다 무게(kg, 어시스트 종목은 보조 무게, null은 맨몸), 반복(1~100 정수 또는 "8-10" 같은 범위 문자열), 워밍업 여부, 휴식 초(0~600)를 받고, 헬스앱은 이 숫자를 다시 계산하지 않고 그대로 실행한다. ' +
      '종목 이름이 스냅샷의 해당 세션 종목 목록(free는 free 목록)에 하나라도 없으면 저장하지 않고, 틀린 이름마다 비슷한 목록 이름 3개를 담은 오류를 돌려준다. ' +
      '스냅샷이 아직 없거나 입력이 범위를 벗어나도 저장하지 않고 오류를 돌려준다. ' +
      '저장에 성공하면 저장된 날짜·세션·종목 수·id를 돌려준다.',
    inputSchema: routineInput,
    annotations: { readOnlyHint: false }
  }, async function (args) {
    return tools().saveTodayRoutine(args);
  });

  server.registerTool('save_today_cardio', {
    description:
      '오늘(KST 날짜) 할 트레드밀 유산소 플랜 하나를 헬스앱에 저장한다. 이전에 저장된 유산소 플랜은 새 플랜으로 덮어쓴다. ' +
      'mode는 interval 또는 walk이고, 구간마다 종류(warmup·walk·run·cooldown), 시간(초, 10~3600 정수), 속력(km/h, 0~20), 경사(%, 0~12)를 받는다. ' +
      'mode가 walk가 아니면 모든 구간의 경사는 0으로 저장된다. ' +
      '입력이 범위를 벗어나면 저장하지 않고 오류를 돌려주며, 저장에 성공하면 저장된 날짜·모드·구간 수·id를 돌려준다.',
    inputSchema: cardioInput,
    annotations: { readOnlyHint: false }
  }, async function (args) {
    return tools().saveTodayCardio(args);
  });

  server.registerTool('get_saved_plans', {
    description:
      '오늘(KST 날짜) 헬스앱에 저장된 웨이트 루틴과 유산소 플랜을 돌려준다. ' +
      '각 플랜은 저장된 모양 그대로의 JSON(id·createdAt·date 포함)이고, 오늘 저장된 것이 없으면 없다고 적는다. ' +
      '날짜가 오늘이 아닌 이전 플랜은 돌려주지 않는다. ' +
      '헬스앱이 그 플랜을 이미 불러갔는지는 이 결과로 알 수 없다.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true }
  }, async function () {
    return tools().getSavedPlans();
  });
}, {
  serverInfo: { name: 'fitness-coach', version: '1.0.0' }
});

function tokenFromPath(request) {
  var parts = new URL(request.url).pathname.split('/').filter(Boolean);
  var last = parts.length ? parts[parts.length - 1] : '';
  try { return decodeURIComponent(last); } catch (e) { return ''; }
}

function withNoStore(response) {
  var headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: headers });
}

export async function handleMcp(request) {
  if (!checkToken(tokenFromPath(request))) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  return withNoStore(await mcpHandler(request));
}

export default { fetch: handleMcp };
