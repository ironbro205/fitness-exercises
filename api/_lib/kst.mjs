// KST (UTC+9) date helpers — same rule as the app's getDateStr/getTodayStr (js/core.js).
var KST_OFFSET_MS = 9 * 60 * 60 * 1000;
var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 'YYYY-MM-DD' in KST.
export function kstDateStr(d) {
  if (!d) d = new Date();
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().split('T')[0];
}

// 'YYYY-MM-DD HH:MM' in KST.
export function kstDateTimeStr(d) {
  var iso = new Date(d.getTime() + KST_OFFSET_MS).toISOString();
  return iso.slice(0, 10) + ' ' + iso.slice(11, 16);
}

// Korean weekday letter for a 'YYYY-MM-DD' calendar date.
export function weekdayKr(dateStr) {
  var t = Date.parse(dateStr + 'T00:00:00Z');
  if (isNaN(t)) return '';
  return WEEKDAYS[new Date(t).getUTCDay()];
}

// Calendar arithmetic on 'YYYY-MM-DD' strings (UTC-based, so the device/server time zone never matters).
function parseDay(dateStr) {
  var t = Date.parse(String(dateStr) + 'T00:00:00Z');
  if (isNaN(t)) throw new Error('bad date string: ' + dateStr);
  return new Date(t);
}

// 'YYYY-MM-DD' n days after dateStr (n may be negative).
export function kstAddDays(dateStr, n) {
  var d = parseDay(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Monday of the Mon–Sun week containing dateStr. Sunday belongs to the week that started 6 days earlier.
export function kstWeekStart(dateStr) {
  var dow = parseDay(dateStr).getUTCDay(); // 0 = Sunday
  return kstAddDays(dateStr, dow === 0 ? -6 : 1 - dow);
}
