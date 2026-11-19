import JSZip from 'jszip';
import {ProjectState} from '../types/editor';

interface KmzSerializedProject {
  version: string;
  exportedAt: string;
  project: ProjectState;
  assetMap: Record<string, string>; // clipId or 'audioTrack' -> filename inside assets/
  processedMap: Record<string, string>; // clipId -> processed filename inside assets/
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getExtFromMime(mime: string, fallback = 'bin'): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  return fallback;
}

/**
 * Exports the entire offline editing project (clips, spot-removed PNGs, audio, keyframes,
 * masks, 100 text effects, transitions, filters) into a real standards-compliant .kmz ZIP archive.
 */
export async function exportProjectToKmz(project: ProjectState): Promise<Blob> {
  const zip = new JSZip();
  const assetsFolder = zip.folder('assets');
  const assetMap: Record<string, string> = {};
  const processedMap: Record<string, string> = {};

  for (const clip of project.clips) {
    try {
      const resp = await fetch(clip.src);
      const blob = await resp.blob();
      const ext = getExtFromMime(clip.mimeType || blob.type, clip.kind === 'video' ? 'mp4' : 'png');
      const fileName = `clip_${clip.id}.${ext}`;
      assetsFolder?.file(fileName, blob);
      assetMap[clip.id] = `assets/${fileName}`;
    } catch {
      // Keep original src fallback if unfetchable
    }

    if (clip.processedSrc) {
      try {
        const resp = await fetch(clip.processedSrc);
        const blob = await resp.blob();
        const fileName = `processed_${clip.id}.png`;
        assetsFolder?.file(fileName, blob);
        processedMap[clip.id] = `assets/${fileName}`;
      } catch {
        // Ignore
      }
    }
  }

  for (const pip of project.pipLayers ?? []) {
    try {
      const resp = await fetch(pip.src);
      const blob = await resp.blob();
      const ext = getExtFromMime(pip.mimeType || blob.type, pip.kind === 'video' ? 'mp4' : 'png');
      const fileName = `pip_${pip.id}.${ext}`;
      assetsFolder?.file(fileName, blob);
      assetMap[pip.id] = `assets/${fileName}`;
    } catch {
      // Keep original src fallback
    }
  }

  if (project.audioNR.trackSrc) {
    try {
      const resp = await fetch(project.audioNR.trackSrc);
      const blob = await resp.blob();
      const ext = getExtFromMime(project.audioNR.trackMimeType || blob.type, 'wav');
      const fileName = `voice_track.${ext}`;
      assetsFolder?.file(fileName, blob);
      assetMap['__audioTrack'] = `assets/${fileName}`;
    } catch {
      // Ignore
    }
  }

  // Strip temporary blob URLs from JSON payload so restored file maps cleanly
  const cleanProject: ProjectState = {
    ...project,
    clips: project.clips.map((c) => ({
      ...c,
      src: assetMap[c.id] ?? c.src,
      processedSrc: processedMap[c.id] ?? undefined,
    })),
    pipLayers: (project.pipLayers ?? []).map((p) => ({
      ...p,
      src: assetMap[p.id] ?? p.src,
    })),
    audioNR: {
      ...project.audioNR,
      trackSrc: assetMap['__audioTrack'] ?? project.audioNR.trackSrc,
    },
  };

  const payload: KmzSerializedProject = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: cleanProject,
    assetMap,
    processedMap,
  };

  // Standards-compliant doc.kml envelope so .kmz is recognized by KMZ tools as well as Kalimi Manzar
  const kmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(project.name)}</name>
    <description>Kalimi Manzar Offline 4K Video &amp; Photo Editor Project (${project.clips.length} clips, ${project.textLayers.length} text layers)</description>
    <ExtendedData>
      <Data name="format"><value>kalimi-manzar-kmz-v1</value></Data>
      <Data name="resolution"><value>${escapeXml(project.resolution)}</value></Data>
      <Data name="aspectRatio"><value>${escapeXml(project.aspectRatio)}</value></Data>
      <Data name="fps"><value>${project.fps}</value></Data>
      <Data name="projectJson"><value>project.json</value></Data>
    </ExtendedData>
  </Document>
</kml>`;

  zip.file('doc.kml', kmlDoc);
  zip.file('project.json', JSON.stringify(payload, null, 2));

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.google-earth.kmz',
    compression: 'DEFLATE',
    compressionOptions: {level: 6},
  });
}

/**
 * Loads a .kmz project file completely offline, restoring all clips, spot-healed images,
 * voice audio tracks, keyframes, masks, transitions, filters, and text layers.
 */
export async function importProjectFromKmz(file: File): Promise<ProjectState> {
  const zip = await JSZip.loadAsync(file);
  const projectFile = zip.file('project.json');
  if (!projectFile) {
    throw new Error('This .kmz file does not contain a Kalimi Manzar project.json payload.');
  }

  const rawJson = await projectFile.async('string');
  const parsed = JSON.parse(rawJson) as KmzSerializedProject;
  const restored = parsed.project;

  const restoredClips = await Promise.all(
    restored.clips.map(async (clip) => {
      let src = clip.src;
      let processedSrc = clip.processedSrc;

      const assetPath = parsed.assetMap?.[clip.id];
      if (assetPath) {
        const entry = zip.file(assetPath);
        if (entry) {
          const blob = await entry.async('blob');
          const typedBlob = new Blob([blob], {type: clip.mimeType || 'image/png'});
          src = URL.createObjectURL(typedBlob);
        }
      }

      const procPath = parsed.processedMap?.[clip.id];
      if (procPath) {
        const entry = zip.file(procPath);
        if (entry) {
          const blob = await entry.async('blob');
          processedSrc = URL.createObjectURL(new Blob([blob], {type: 'image/png'}));
        }
      }

      return {
        ...clip,
        src,
        processedSrc,
      };
    }),
  );

  const restoredPips = await Promise.all(
    (restored.pipLayers ?? []).map(async (pip) => {
      let src = pip.src;
      const assetPath = parsed.assetMap?.[pip.id];
      if (assetPath) {
        const entry = zip.file(assetPath);
        if (entry) {
          const blob = await entry.async('blob');
          const typedBlob = new Blob([blob], {type: pip.mimeType || 'image/png'});
          src = URL.createObjectURL(typedBlob);
        }
      }
      return {...pip, src};
    }),
  );

  let restoredAudioSrc = restored.audioNR.trackSrc;
  const audioPath = parsed.assetMap?.['__audioTrack'];
  if (audioPath) {
    const entry = zip.file(audioPath);
    if (entry) {
      const blob = await entry.async('blob');
      restoredAudioSrc = URL.createObjectURL(
        new Blob([blob], {type: restored.audioNR.trackMimeType || 'audio/wav'}),
      );
    }
  }

  return {
    ...restored,
    clips: restoredClips,
    pipLayers: restoredPips,
    audioNR: {
      ...restored.audioNR,
      trackSrc: restoredAudioSrc,
    },
    updatedAt: Date.now(),
  };
}

// Lightweight IndexedDB offline autosave for instant offline project recovery
const DB_NAME = 'kalimi_manzar_offline_db';
const STORE_NAME = 'autosave';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectToOfflineCache(project: ProjectState): Promise<void> {
  try {
    const kmzBlob = await exportProjectToKmz(project);
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(kmzBlob, 'latest_kmz');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silent fallback when storage quota or incognito restricts IndexedDB
  }
}

export async function loadProjectFromOfflineCache(): Promise<ProjectState | null> {
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('latest_kmz');
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!blob) return null;
    const file = new File([blob], 'autosave.kmz', {type: 'application/vnd.google-earth.kmz'});
    return await importProjectFromKmz(file);
  } catch {
    return null;
  }
}
