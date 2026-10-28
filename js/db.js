// پایگاه داده‌ی روی گوشی (IndexedDB)
// همه‌ی اطلاعات فقط روی همین گوشی ذخیره می‌شوند.
const DB_NAME = 'darik';
const DB_VERSION = 1;
export const STORES = ['accounts', 'transactions', 'categories', 'templates', 'loans', 'goals', 'kv'];

let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'kv' ? 'key' : 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const result = fn(t.objectStore(store));
    t.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
    t.onerror = () => reject(t.error);
  }));
}

export const all = (store) => tx(store, 'readonly', (s) => s.getAll());
export const put = (store, obj) => tx(store, 'readwrite', (s) => s.put(obj));
export const del = (store, id) => tx(store, 'readwrite', (s) => s.delete(id));

export async function kvGet(key, fallback = null) {
  const r = await tx('kv', 'readonly', (s) => s.get(key));
  return r ? r.value : fallback;
}
export const kvSet = (key, value) => put('kv', { key, value });

// شناسه‌ی یکتا برای هر رکورد
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ———— پشتیبان‌گیری ————
export async function exportAll() {
  const data = {};
  for (const s of STORES) data[s] = await all(s);
  return { app: 'darik', version: 1, exportedAt: new Date().toISOString(), data };
}
export async function importAll(backup) {
  if (!backup || backup.app !== 'darik' || !backup.data) throw new Error('این فایل پشتیبان داریک نیست.');
  const db = await open();
  await new Promise((resolve, reject) => {
    const t = db.transaction(STORES, 'readwrite');
    for (const s of STORES) {
      const os = t.objectStore(s);
      os.clear();
      for (const row of backup.data[s] || []) os.put(row);
    }
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}
