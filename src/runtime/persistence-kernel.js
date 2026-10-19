export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function safeParse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function createRecoveryStore({ dbName, storeName, timeoutMs = 1800 }) {
  let dbPromise = null;
  const timeoutError = (label) => new Error(`${label} excedeu ${timeoutMs}ms`);
  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponível')); return; }
      let settled = false;
      const req = indexedDB.open(dbName, 1);
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        dbPromise = null;
        reject(timeoutError('Abertura do IndexedDB'));
      }, timeoutMs);
      const finish = (callback) => {
        if (settled) return false;
        settled = true;
        window.clearTimeout(timer);
        callback();
        return true;
      };
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt');
        }
      };
      req.onsuccess = () => {
        if (!finish(() => resolve(req.result))) {
          try { req.result.close(); } catch {}
        }
      };
      req.onerror = () => finish(() => { dbPromise = null; reject(req.error || new Error('Falha ao abrir armazenamento durável')); });
      req.onblocked = () => finish(() => { dbPromise = null; reject(new Error('IndexedDB bloqueado por outra sessão')); });
    });
    return dbPromise;
  }
  async function transact(mode, action, label) {
    const database = await db();
    return new Promise((resolve, reject) => {
      let settled = false;
      const tx = database.transaction(storeName, mode);
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        try { tx.abort(); } catch {}
        reject(timeoutError(label));
      }, timeoutMs);
      const finish = (callback) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        callback();
      };
      try { action(tx, (value) => finish(() => resolve(value)), (error) => finish(() => reject(error))); }
      catch (error) { finish(() => reject(error)); return; }
      tx.onerror = () => finish(() => reject(tx.error || new Error(`Falha em ${label}`)));
      tx.onabort = () => finish(() => reject(tx.error || new Error(`${label} abortado`)));
    });
  }
  return {
    async put(record) {
      return transact('readwrite', (tx, resolve, reject) => {
        const req = tx.objectStore(storeName).put(record);
        req.onerror = () => reject(req.error || new Error('Falha ao proteger estado local'));
        tx.oncomplete = () => resolve(record);
      }, 'Gravação no IndexedDB');
    },
    async get(id) {
      return transact('readonly', (tx, resolve, reject) => {
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Falha ao ler armazenamento durável'));
      }, 'Leitura do IndexedDB');
    },
    async all() {
      return transact('readonly', (tx, resolve, reject) => {
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error || new Error('Falha ao listar armazenamento durável'));
      }, 'Listagem do IndexedDB');
    },
    async remove(id) {
      return transact('readwrite', (tx, resolve, reject) => {
        const req = tx.objectStore(storeName).delete(id);
        req.onerror = () => reject(req.error || new Error('Falha ao remover checkpoint'));
        tx.oncomplete = () => resolve();
      }, 'Remoção do IndexedDB');
    },
  };
}

export function createSessionManager({ storageKey, appVersion, makeId, getRevision, intervalMs = 20000 }) {
  let heartbeatTimer = null;
  const read = () => { try { return safeParse(localStorage.getItem(storageKey)); } catch { return null; } };
  const write = (value) => { try { localStorage.setItem(storageKey, JSON.stringify(value)); return true; } catch { return false; } };
  function begin(meta) {
    const previous = read();
    const record = {
      id: makeId('session'), status: 'open', appVersion,
      startedAt: Date.now(), heartbeatAt: Date.now(), revision: getRevision(),
    };
    meta.sessionId = record.id;
    const writable = write(record);
    clearInterval(heartbeatTimer);
    if (writable) heartbeatTimer = setInterval(() => {
      const current = read();
      if (!current || current.id !== meta.sessionId) return;
      current.heartbeatAt = Date.now();
      current.revision = getRevision();
      write(current);
    }, intervalMs);
    return { record, unclean: previous?.status === 'open', degraded: !writable };
  }
  function end(meta) {
    clearInterval(heartbeatTimer);
    const current = read();
    if (!current || current.id !== meta?.sessionId) return false;
    current.status = 'closed'; current.closedAt = Date.now(); current.heartbeatAt = Date.now();
    return write(current);
  }
  return { begin, end };
}
