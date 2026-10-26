import { validArtProject, type ArtProject } from "./labsArt";

const openArtworkDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("exbeam-artworks", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("画作存储暂时不可用"));
  });
export async function readArtwork(): Promise<Blob | null> {
  const database = await openArtworkDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("projects", "readonly");
    const request = transaction.objectStore("projects").get("current");
    request.onsuccess = () =>
      resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}
export async function writeArtwork(blob: Blob) {
  const database = await openArtworkDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("projects", "readwrite");
    transaction.objectStore("projects").put(blob, "current");
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function readArtworkProject(): Promise<ArtProject | null> {
  const database = await openArtworkDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("projects", "readonly");
    const request = transaction.objectStore("projects").get("layered-current");
    let result: ArtProject | null = null;
    let invalid = false;
    request.onsuccess = () => {
      if (request.result == null) return;
      if (validArtProject(request.result)) result = request.result;
      else invalid = true;
    };
    transaction.oncomplete = () => {
      database.close();
      invalid
        ? reject(new Error("原分层工程无效，未覆盖原数据"))
        : resolve(result);
    };
    transaction.onerror = transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function writeArtworkProject(
  project: ArtProject,
  flattened: Blob,
) {
  if (!validArtProject(project)) throw new Error("分层工程无效");
  const database = await openArtworkDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("projects", "readwrite");
    const store = transaction.objectStore("projects");
    // Keep the legacy PNG and editable project in the same atomic transaction.
    store.put(flattened, "current");
    store.put(project, "layered-current");
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}
