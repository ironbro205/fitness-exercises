// Remote MCP endpoint: /api/mcp/<code>. The last path segment must equal HEALTH_SYNC_TOKEN, otherwise 404.
// Serves the 2026-07-28 protocol and the 2025-era stateless fallback through mcp-handler v2.
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { checkToken } from '../_lib/auth.mjs';
import { getStore } from '../_lib/store.mjs';
import { createTools, PLAN_TYPES, CARDIO_MODES, SEGMENT_TYPES } from '../_lib/tools.mjs';

function tools() {
  return createTools({ store: getStore() });
}

var typeEnum = z.enum(PLAN_TYPES);
var weekEnum = z.enum(['this', 'next']);
var daysSchema = z.union([z.literal(3), z.literal(4), z.literal(5)]);
// Keys are checked by the pure validation (zod 4's z.record(z.enum()) would require every key).
var targetsSchema = z.record(z.string(), z.number().min(0).max(40));

var sessionInput = z.object({
  // Loose on purpose: 1–12 chars after trimming is checked by the pure validation in tools.mjs.
  label: z.string().max(40),
  type: typeEnum,
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

var weekPlanInput = z.object({
  week: weekEnum.optional(),
  days: daysSchema,
  deload: z.boolean().optional(),
  note: z.string().optional(),
  targets: targetsSchema,
  sessions: z.array(sessionInput).min(1).max(7)
});

var updateInput = z.object({
  week: weekEnum.optional(),
  upsert: z.array(sessionInput).max(7).optional(),
  remove: z.array(z.string().min(1)).optional(),
  targets: targetsSchema.optional(),
  note: z.string().optional(),
  deload: z.boolean().optional(),
  days: daysSchema.optional()
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
      '헬스앱이 마지막으로 올린 기록 스냅샷과 저장된 주간 계획을 읽기 좋은 글 하나로 돌려준다. ' +
      '글은 올린 시각(KST)과 경과 시간, 오늘 날짜와 이번 주(월~일, KST) 범위, 헬스앱 코치 안내, 사용자 정보(나이·키·체중·보유 장비), ' +
      '이번 주 계획(요일 수·디로드·부위별 목표 세트·세션별 끝남/남음과 종목·세트), 다음 주 계획(저장돼 있을 때만), 헬스앱이 센 이번 주 부위별 실제 세트, ' +
      '최근 8주 웨이트 원자료(세션별 모든 세트, 계획 세션으로 한 운동은 그 세션 label), 8주 넘게 안 한 종목의 마지막 1회, 최근 8주 유산소 원자료, 체중 기록, 종목 목록, 종목별 부위 세트 무게 순서로 되어 있다. ' +
      'type(full·upper·lower·push·pull)을 주면 종목 목록에는 그 type의 목록만 들어가고(full은 전체 목록), 주지 않으면 type별 목록이 모두 들어간다. ' +
      '앱이 계산한 추천 무게·1RM·정체 판정 같은 값은 들어 있지 않다. ' +
      '스냅샷이 아직 없으면 헬스앱을 열어 달라는 한 줄만 돌려주고, 올린 지 12시간이 넘었으면 첫 줄에 경고가 붙는다.',
    inputSchema: z.object({ type: typeEnum.optional() }),
    annotations: { readOnlyHint: true }
  }, async function (args) {
    return tools().getTrainingContext(args);
  });

  server.registerTool('save_week_plan', {
    description:
      '한 주(월요일~일요일, KST) 웨이트 계획을 헬스앱에 저장한다. 같은 주에 저장된 계획은 새 계획으로 덮어쓴다. ' +
      'week는 this(이번 주) 또는 next(다음 주)이고, 주지 않으면 오늘이 일요일(KST)일 때는 다음 주, 그 밖에는 이번 주다. ' +
      '그 주에 이미 끝난 세션(최신 스냅샷에서 그 주 그 label로 기록된 운동이 있는 세션)은 서버가 원래 모습 그대로 앞쪽에 남기고, 입력에 같은 label이 있으면 저장하지 않고 오류를 돌려준다. ' +
      'days는 3·4·5, deload는 true/false, targets는 부위 그룹 키(chest·lats 등 14개)별 주간 목표 세트(0~40)다. ' +
      'sessions는 남긴 끝난 세션을 합쳐 1~7개이고, 세션마다 label(앞뒤 공백을 뺀 1~12자, 그 주 안에서 유일), type(full·upper·lower·push·pull), 종목 1~20개를 받는다. ' +
      '종목마다 세트 1~15개이고, 세트마다 무게(kg, 0~500, 어시스트 종목은 보조 무게, null은 맨몸), 반복(1~100 정수 또는 "8-10" 같은 범위 문자열), 워밍업 여부, 휴식 초(0~600)를 받으며, 헬스앱은 이 숫자를 다시 계산하지 않고 그대로 실행한다. ' +
      '종목 이름이 스냅샷의 그 type 종목 목록(full은 전체 목록)에 하나라도 없으면 저장하지 않고, 틀린 이름마다 비슷한 목록 이름 3개를 담은 오류를 돌려준다. ' +
      '스냅샷이 아직 없거나 입력이 범위를 벗어나도 저장하지 않고 오류를 돌려준다. ' +
      '저장에 성공하면 그 주 월요일 날짜·요일 수·세션 수·id를 돌려준다.',
    inputSchema: weekPlanInput,
    annotations: { readOnlyHint: false }
  }, async function (args) {
    return tools().saveWeekPlan(args);
  });

  server.registerTool('update_week_sessions', {
    description:
      '저장된 주간 계획의 세션을 label 기준으로 고친다. upsert의 세션은 같은 label이 있으면 그 자리에서 교체하고, 없으면 맨 끝에 더한다. remove의 label은 계획에서 뺀다. ' +
      '적용 순서는 remove, upsert, 그다음 targets·note·deload·days다. targets를 주면 목표 세트 전체를 새 값으로 바꾼다. ' +
      '이미 끝난 세션의 label을 upsert나 remove에 넣으면 아무것도 저장하지 않고 오류를 돌려준다. 계획에 없는 label을 remove하거나, 고친 뒤 세션이 0개가 되거나 7개를 넘어도 저장하지 않는다. ' +
      'week는 this 또는 next이고, 주지 않으면 이번 주(KST)다. 그 주에 저장된 계획이 없으면 오류를 돌려준다. ' +
      '세션 형식과 종목 이름 검사는 save_week_plan과 같다. 계획 id는 그대로이고, 바꾸거나 더한 세션의 updatedAt만 새 시각이 된다. ' +
      '성공하면 바꾼·더한·뺀 세션 수를 돌려준다.',
    inputSchema: updateInput,
    annotations: { readOnlyHint: false }
  }, async function (args) {
    return tools().updateWeekSessions(args);
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
      '헬스앱에 저장된 이번 주(KST, 월요일 기준) 주간 계획, 다음 주 주간 계획, 오늘(KST 날짜) 유산소 플랜을 돌려준다. ' +
      '각 계획은 저장된 모양 그대로의 JSON(id 포함)이고, 저장된 것이 없으면 없다고 적는다. ' +
      '날짜가 오늘이 아닌 이전 유산소 플랜은 돌려주지 않는다. ' +
      '헬스앱이 그 계획을 이미 불러갔는지와 어느 세션이 끝났는지는 이 결과로 알 수 없다.',
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
