// GET /api/plan — the app fetches today's (KST) saved plans: { routine, cardio }, each null unless dated today.
// 401 wrong/missing code (or server token not configured).
import { checkBearer } from './_lib/auth.mjs';
import { getStore } from './_lib/store.mjs';
import { createTools } from './_lib/tools.mjs';

function json(status, body, extraHeaders) {
  var headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (extraHeaders) Object.keys(extraHeaders).forEach(function (k) { headers[k] = extraHeaders[k]; });
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

export async function handlePlan(request) {
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' }, { Allow: 'GET' });
  if (!checkBearer(request)) return json(401, { error: 'unauthorized' });
  try {
    var plans = await createTools({ store: getStore() }).getTodayPlans();
    return json(200, { routine: plans.routine, cardio: plans.cardio });
  } catch (e) {
    console.error('plan store error:', e && e.message);
    return json(500, { error: 'store_error' });
  }
}

export default { fetch: handlePlan };
