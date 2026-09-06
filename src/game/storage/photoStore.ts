// Durable backing store for full-resolution captured photos.
//
// The live session keeps full-res data in an in-memory Map (store.ts's
// photoCache) for zero-latency reads. That Map doesn't survive a reload,
// and localStorage is too small for full-res image data, so this module
// mirrors every capture into IndexedDB and can rehydrate the Map from it
// after a save is loaded. Every operation degrades to a silent no-op if
// IndexedDB is unavailable or fails — the existing thumbnail fallback in
// fullUrl() already covers that case, so this is purely additive.

const DB_NAME = 'hot_photos_v1';
const STORE_NAME = 'photos';

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putPhoto(id: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(dataUrl, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // best-effort; the in-memory cache still covers the current session
  } finally {
    db.close();
  }
}

export async function getAllPhotos(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const db = await openDB();
  if (!db) return result;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          result.set(String(cursor.key), cursor.value as string);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // return whatever was gathered before the failure
  } finally {
    db.close();
  }
  return result;
}

export async function clearPhotos(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // no-op
  } finally {
    db.close();
  }
}
