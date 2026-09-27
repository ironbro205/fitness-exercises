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
