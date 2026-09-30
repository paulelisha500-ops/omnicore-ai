/* ============================================================================
   Browser persistence (IndexedDB).

   OmniCore has no server: everything a user creates lives in this browser's
   IndexedDB, scoped by `owner` (the signed-in username). A tiny change feed
   lets hooks re-read a store after any write, and a BroadcastChannel carries
   that feed to other open tabs so two windows never show stale data.
   ============================================================================ */

const DB_NAME = "omnicore";
const DB_VERSION = 1;

const SCHEMA = {
  users: { keyPath: "username" },
  docs: { keyPath: "id", indexes: ["owner"] },
  threads: { keyPath: "id", indexes: ["owner"] },
  events: { keyPath: "id", indexes: ["owner", "at"] },
  automations: { keyPath: "id", indexes: ["owner"] },
  integrations: { keyPath: "id", indexes: ["owner"] },
  notifications: { keyPath: "id", indexes: ["owner"] },
  records: { keyPath: "id", indexes: ["owner", "kind"] },
  kv: { keyPath: "key" },
};

export const STORES = Object.keys(SCHEMA);

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser has no IndexedDB, so OmniCore can't store your workspace. Try a current Chrome, Edge, Safari or Firefox."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, def] of Object.entries(SCHEMA)) {
        if (db.objectStoreNames.contains(name)) continue;
        const store = db.createObjectStore(name, { keyPath: def.keyPath });
        for (const idx of def.indexes || []) store.createIndex(idx, idx);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab upgraded the schema: close so it isn't blocked, and let the
      // next call reopen at the new version.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error("Could not open the local database."));
    req.onblocked = () => reject(new Error("Close other OmniCore tabs and reload — the local database is being upgraded."));
  });
  return dbPromise;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result;
    Promise.resolve(fn(tx.objectStore(store))).then((r) => { result = r; }, reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

/* ---------------------------------------------------------------------------
   Change feed
   --------------------------------------------------------------------------- */
const listeners = new Set();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("omnicore-db") : null;

function notify(store, fromOtherTab = false) {
  for (const fn of listeners) {
    try { fn(store); } catch { /* a broken listener must not block the others */ }
  }
  if (!fromOtherTab) channel?.postMessage(store);
}
if (channel) channel.onmessage = (e) => notify(e.data, true);

export function onDbChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------------------------------------------------------------------------
   API
   --------------------------------------------------------------------------- */
export const db = {
  async get(store, key) {
    return run(store, "readonly", (s) => wrap(s.get(key)));
  },
  async put(store, value) {
    await run(store, "readwrite", (s) => wrap(s.put(value)));
    notify(store);
    return value;
  },
  async putMany(store, values) {
    if (!values.length) return;
    await run(store, "readwrite", (s) => Promise.all(values.map((v) => wrap(s.put(v)))));
    notify(store);
  },
  async delete(store, key) {
    await run(store, "readwrite", (s) => wrap(s.delete(key)));
    notify(store);
  },
  async deleteMany(store, keys) {
    if (!keys.length) return;
    await run(store, "readwrite", (s) => Promise.all(keys.map((k) => wrap(s.delete(k)))));
    notify(store);
  },
  async all(store) {
    return run(store, "readonly", (s) => wrap(s.getAll()));
  },
  async byOwner(store, owner) {
    return run(store, "readonly", (s) => wrap(s.index("owner").getAll(owner)));
  },
  async clear(store) {
    await run(store, "readwrite", (s) => wrap(s.clear()));
    notify(store);
  },
  async count(store) {
    return run(store, "readonly", (s) => wrap(s.count()));
  },
};

export const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Ask the browser not to evict this origin's data under storage pressure. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      return await navigator.storage.persist();
    }
    return true;
  } catch {
    return false;
  }
}

export async function storageEstimate() {
  try {
    const { usage = 0, quota = 0 } = (await navigator.storage?.estimate?.()) || {};
    return { usage, quota };
  } catch {
    return { usage: 0, quota: 0 };
  }
}
