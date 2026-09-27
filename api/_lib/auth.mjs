// Shared-secret check for the connector endpoints.
// Fail closed: without HEALTH_SYNC_TOKEN (or with one shorter than 20 chars) every request is rejected.
// Never log the configured token or the candidate.
import { timingSafeEqual } from 'node:crypto';

export const MIN_TOKEN_LENGTH = 20;

function configuredToken() {
  var token = process.env.HEALTH_SYNC_TOKEN;
  if (typeof token !== 'string' || token.length < MIN_TOKEN_LENGTH) return null;
  return token;
}

export function isAuthConfigured() {
  return configuredToken() !== null;
}

export function checkToken(candidate) {
  var token = configuredToken();
  if (token === null) return false;
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  var a = Buffer.from(candidate, 'utf8');
  var b = Buffer.from(token, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function bearerToken(request) {
  var header = request.headers.get('authorization');
  if (!header) return null;
  var m = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return m ? m[1] : null;
}

export function checkBearer(request) {
  return checkToken(bearerToken(request));
}
