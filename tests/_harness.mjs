// 헬스앱 테스트 하네스 (zero-dependency)
// 빌드/테스트 프레임워크가 없는 정적 앱을 Node `vm` + 최소 DOM 스텁으로 로드한다.
// 분리 전: index.html 의 인라인 <script> 를 추출.
// 분리 후: js/data.js, core.js, domain.js, ai.js, screens.js 를 로드 순서대로 결합.
// → 같은 테스트가 분리 전/후 양쪽에 그대로 돌아가며, 동작 회귀를 잡는다(골든 마스터).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS_ORDER = ['data', 'core', 'domain', 'ai', 'screens'];

// 앱 JS 소스를 가져온다. 분리됐으면 js/*.js, 아니면 index.html 인라인 스크립트.
export function readAppSource() {
  const jsFiles = JS_ORDER.map((n) => path.join(ROOT, 'js', `${n}.js`));
  if (jsFiles.every((f) => fs.existsSync(f))) {
    return { mode: 'split', code: jsFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n;\n') };
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
  if (!m) throw new Error('index.html 에서 인라인 <script> 를 찾지 못했습니다');
  return { mode: 'inline', code: m[1] };
}

// 무엇이든 받아내는 만능 노드: 호출 가능 + 임의 속성 접근 + 문자열/숫자 강제변환에도 안 터짐.
function makeUniversal() {
  const fn = function () { return universal; };
  const universal = new Proxy(fn, {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === Symbol.iterator) return function* () {};
      if (prop === 'length') return 0;
      if (prop === 'nodeType') return 1;
      return universal;
    },
    set() { return true; },
    apply() { return universal; },
    construct() { return universal; },
    has() { return true; },
  });
  return universal;
}

function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

function makeDocument(universal) {
  const doc = {
    addEventListener() {}, removeEventListener() {},
    getElementById() { return universal; },
    querySelector() { return universal; },
    querySelectorAll() { return []; },
    getElementsByClassName() { return []; },
    getElementsByTagName() { return []; },
    createElement() { return universal; },
    createTextNode() { return universal; },
    body: universal, head: universal, documentElement: universal,
    cookie: '', title: '', readyState: 'complete',
  };
  return new Proxy(doc, { get: (t, p) => (p in t ? t[p] : universal), set: () => true });
}

// 앱을 로드해 모든 전역(함수·데이터표·state)이 올라간 sandbox 를 돌려준다.
// init() 와 스와이프 IIFE 등 로드시 실행 코드도 여기서 한 번 실행된다(스텁 위에서 무해하게).
export function loadApp() {
  const { code, mode } = readAppSource();
  const universal = makeUniversal();
  const sandbox = {
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    navigator: { userAgent: 'node', language: 'ko', languages: ['ko'] }, // serviceWorker 없음 → SW 등록 건너뜀
    location: { href: 'http://localhost/', pathname: '/', origin: 'http://localhost', reload() {}, assign() {} },
    history: { pushState() {}, replaceState() {}, back() {} },
    document: makeDocument(universal),
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    queueMicrotask: (fn) => Promise.resolve().then(fn),
    addEventListener() {}, removeEventListener() {},
    scrollTo() {}, scrollBy() {}, alert() {}, confirm: () => true, prompt: () => null,
    fetch: () => new Promise(() => {}), // 순수 테스트에선 호출 안 함; 호출돼도 영원히 대기(무해)
    AbortController: globalThis.AbortController,
    URL: globalThis.URL, URLSearchParams: globalThis.URLSearchParams,
    TextEncoder: globalThis.TextEncoder, TextDecoder: globalThis.TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const injected = new Set(Object.keys(sandbox)); // 하네스가 주입한 환경 전역
  vm.runInContext(code, sandbox, { filename: `app(${mode}).js` });
  // 앱이 새로 정의한 전역만 추려 비열거 속성으로 부착(스모크 테스트용).
  const appGlobals = Object.keys(sandbox).filter((k) => !injected.has(k)).sort();
  Object.defineProperty(sandbox, '__APP_GLOBALS__', { value: appGlobals, enumerable: false });
  return sandbox;
}
