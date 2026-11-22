// NULLADIT experimental browser identity storage.
// IndexedDB protects persistence, not against malicious origin scripts.

const DB_NAME = 'nulladit-preview-identity-v1';
const STORE = 'identities';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function operation(mode, callback) {
  const db = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = callback(tx.objectStore(STORE));
      let result;

      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(
        tx.error || new Error('Storage transaction aborted')
      );
    });
  } finally {
    db.close();
  }
}

export async function saveIdentity(identity, keys) {
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(identity)) {
    throw new Error('Invalid identity');
  }

  if (!keys?.signing?.privateKey ||
      !keys?.encryption?.privateKey) {
    throw new Error('Missing cryptographic keys');
  }

  return operation('readwrite', store =>
    store.add({ identity, keys }, identity)
  );
}

export async function loadIdentity(identity) {
  return (await operation('readonly', store =>
    store.get(identity)
  )) || null;
}

export async function listIdentities() {
  return operation('readonly', store => store.getAllKeys());
}

export async function deleteIdentity(identity) {
  return operation('readwrite', store => store.delete(identity));
}
