import {FontItem} from '../data/fonts';

export interface StoredCustomFont {
  id: string;
  name: string;
  familyName: string;
  fileName: string;
  data: ArrayBuffer;
  createdAt: number;
}

export interface AudioLibraryItem {
  id: string;
  name: string;
  mimeType: string;
  duration: number;
  sizeBytes: number;
  sourceType: 'extracted' | 'imported' | 'recorded' | 'denoised';
  peaks: number[];
  createdAt: number;
  blob: Blob;
  objectUrl?: string;
}

const LIB_DB_NAME = 'kalimi_manzar_assets_db';
const LIB_DB_VERSION = 1;
const STORE_FONTS = 'custom_fonts';
const STORE_AUDIO = 'audio_library';

function openAssetsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LIB_DB_NAME, LIB_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FONTS)) {
        db.createObjectStore(STORE_FONTS, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, {keyPath: 'id'});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ============================================================================
// CUSTOM FONTS (.TTF / .OTF) REGISTRATION & OFFLINE PERSISTENCE
// ============================================================================

export async function registerFontFaceFromBuffer(
  familyName: string,
  buffer: ArrayBuffer,
): Promise<void> {
  const face = new FontFace(familyName, buffer.slice(0));
  const loaded = await face.load();
  document.fonts.add(loaded);
}

export function storedFontToFontItem(rec: StoredCustomFont): FontItem {
  return {
    id: rec.id,
    name: rec.name,
    family: `"${rec.familyName}", -apple-system, sans-serif`,
    category: 'Custom',
    defaultWeight: 400,
    weights: [400, 600, 700, 900],
    sample: rec.name,
    isCustom: true,
  };
}

export async function importAndSaveCustomFont(file: File): Promise<FontItem> {
  const rawName = file.name.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '');
  const cleanDisplayName = rawName.replace(/[_-]+/g, ' ').trim() || 'Custom Font';
  const uniqueId = `custom-font-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const safeFamily = `KMCustom_${uniqueId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const buffer = await file.arrayBuffer();
  await registerFontFaceFromBuffer(safeFamily, buffer);

  const record: StoredCustomFont = {
    id: uniqueId,
    name: cleanDisplayName,
    familyName: safeFamily,
    fileName: file.name,
    data: buffer,
    createdAt: Date.now(),
  };

  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FONTS, 'readwrite');
      tx.objectStore(STORE_FONTS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Font is still active in memory for the current session even if IndexedDB is restricted
  }

  return storedFontToFontItem(record);
}

export async function loadAllCustomFonts(): Promise<FontItem[]> {
  try {
    const db = await openAssetsDb();
    const rows = await new Promise<StoredCustomFont[]>((resolve, reject) => {
      const tx = db.transaction(STORE_FONTS, 'readonly');
      const req = tx.objectStore(STORE_FONTS).getAll();
      req.onsuccess = () => resolve((req.result as StoredCustomFont[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    rows.sort((a, b) => b.createdAt - a.createdAt);
    const items: FontItem[] = [];
    for (const row of rows) {
      try {
        await registerFontFaceFromBuffer(row.familyName, row.data);
        items.push(storedFontToFontItem(row));
      } catch {
        // Skip corrupted font entry
      }
    }
    return items;
  } catch {
    return [];
  }
}

export async function deleteCustomFontFromDb(fontId: string): Promise<void> {
  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FONTS, 'readwrite');
      tx.objectStore(STORE_FONTS).delete(fontId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage error
  }
}

// ============================================================================
// MY AUDIO LIBRARY (OFFLINE PERSISTENT GALLERY)
// ============================================================================

export async function saveAudioToLibrary(
  item: Omit<AudioLibraryItem, 'id' | 'createdAt' | 'objectUrl'>,
): Promise<AudioLibraryItem> {
  const fullItem: AudioLibraryItem = {
    ...item,
    id: `audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };

  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      tx.objectStore(STORE_AUDIO).put(fullItem);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Keep usable in-memory
  }

  return {
    ...fullItem,
    objectUrl: URL.createObjectURL(fullItem.blob),
  };
}

export async function loadAudioLibrary(): Promise<AudioLibraryItem[]> {
  try {
    const db = await openAssetsDb();
    const rows = await new Promise<AudioLibraryItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, 'readonly');
      const req = tx.objectStore(STORE_AUDIO).getAll();
      req.onsuccess = () => resolve((req.result as AudioLibraryItem[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows.map((row) => ({
      ...row,
      objectUrl: URL.createObjectURL(row.blob),
    }));
  } catch {
    return [];
  }
}

export async function renameAudioInLibrary(id: string, nextName: string): Promise<void> {
  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_AUDIO);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as AudioLibraryItem | undefined;
        if (existing) {
          store.put({...existing, name: nextName});
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}

export async function deleteAudioFromLibrary(id: string): Promise<void> {
  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      tx.objectStore(STORE_AUDIO).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}
