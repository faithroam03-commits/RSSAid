const DB_NAME = "random-link-download-settings";
const STORE_NAME = "settings";
const FOLDER_KEY = "download-folder";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDownloadFolder(
  folder: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");

      tx.objectStore(STORE_NAME).put(folder, FOLDER_KEY);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getDownloadFolder():
  Promise<FileSystemDirectoryHandle | null> {
  const db = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(FOLDER_KEY);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function clearDownloadFolder(): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");

      tx.objectStore(STORE_NAME).delete(FOLDER_KEY);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getWritableDownloadFolder():
  Promise<FileSystemDirectoryHandle | null> {
  const folder = await getDownloadFolder();

  if (!folder) {
    return null;
  }

  type PermissionHandle = FileSystemDirectoryHandle & {
    queryPermission?: (options: {
      mode: "readwrite";
    }) => Promise<PermissionState>;
    requestPermission?: (options: {
      mode: "readwrite";
    }) => Promise<PermissionState>;
  };

  const handle = folder as PermissionHandle;
  const options = { mode: "readwrite" as const };

  const currentPermission =
    await handle.queryPermission?.(options);

  if (currentPermission === "granted") {
    return folder;
  }

  const permission =
    await handle.requestPermission?.(options);

  if (permission !== "granted") {
    throw new Error(
      "保存先フォルダへの書き込みが許可されませんでした。設定画面で保存先を確認してください。"
    );
  }

  return folder;
}