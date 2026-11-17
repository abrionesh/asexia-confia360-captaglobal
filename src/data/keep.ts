const DB = "asexia-radar";
const STORE = "kv";

type Pack = { at: number; json: string };

function packOf(raw: string | null): Pack | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Pack>;
    if (data && typeof data.json === "string" && typeof data.at === "number") return { at: data.at, json: data.json };
  } catch {
    return null;
  }
  return { at: 0, json: raw };
}

function newer(a: Pack | null, b: Pack | null) {
  if (!a) return b;
  if (!b) return a;
  return a.at >= b.at ? a : b;
}

function idb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise<IDBDatabase | null>((resolve) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet(key: string) {
  const db = await idb();
  if (!db) return null;
  return new Promise<string | null>((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
    req.onerror = () => resolve(null);
  });
}

async function idbSet(key: string, value: string) {
  const db = await idb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function readKeep(key: string) {
  let local: string | null = null;
  try {
    local = localStorage.getItem(key);
  } catch {
    local = null;
  }
  const saved = newer(packOf(local), packOf(await idbGet(key)));
  return saved?.json ?? null;
}

export function writeKeep(key: string, json: string) {
  const raw = JSON.stringify({ at: Date.now(), json } satisfies Pack);
  let ok = true;
  try {
    localStorage.setItem(key, raw);
  } catch {
    ok = false;
  }
  void idbSet(key, raw);
  return ok;
}
