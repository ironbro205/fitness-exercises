// JSON key-value store for the connector.
// - On Vercel (VERCEL env set): always Vercel Blob, private access. The memory store is never used there.
// - Otherwise CONNECTOR_STORE=memory: in-process Map (local dev server and tests only).
// - Otherwise BLOB_READ_WRITE_TOKEN set: Vercel Blob.
// - Otherwise: throws a configuration error.
// @vercel/blob is imported dynamically inside the Blob branch so zero-dependency tests run without node_modules.

export const KEY_SNAPSHOT = 'fitness/snapshot.json';
export const KEY_PLAN_ROUTINE = 'fitness/plan-routine.json';
export const KEY_PLAN_CARDIO = 'fitness/plan-cardio.json';

var memoryMap = new Map();

var memoryStore = {
  kind: 'memory',
  async getJSON(key) {
    if (!memoryMap.has(key)) return null;
    return JSON.parse(memoryMap.get(key));
  },
  async setJSON(key, value) {
    memoryMap.set(key, JSON.stringify(value));
  }
};

var blobStore = {
  kind: 'blob',
  async getJSON(key) {
    var blob = await import('@vercel/blob');
    var result = await blob.get(key, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    var text = await new Response(result.stream).text();
    return JSON.parse(text);
  },
  async setJSON(key, value) {
    var blob = await import('@vercel/blob');
    await blob.put(key, JSON.stringify(value), {
      access: 'private',
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: 'application/json'
    });
  }
};

export function getStore() {
  if (process.env.VERCEL !== undefined) return blobStore;
  if (process.env.CONNECTOR_STORE === 'memory') return memoryStore;
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore;
  throw new Error('Connector store is not configured: set BLOB_READ_WRITE_TOKEN (Vercel Blob) or CONNECTOR_STORE=memory for local use.');
}

// Test helper: clears the in-process memory store.
export function resetMemoryStore() {
  memoryMap.clear();
}
