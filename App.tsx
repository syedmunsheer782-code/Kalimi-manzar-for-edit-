import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Archive,
  AudioLines,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Diamond,
  Download,
  Eraser,
  FolderOpen,
  Layers,
  Palette,
  PictureInPicture2,
  Pipette,
  Redo2,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
  Upload,
  Wand2,
} from 'lucide-react';
import {ExportModal} from './components/ExportModal';
import {OfflineIndicator, PWAInstallButton} from './components/PWAInstallButton';
import {PreviewCanvas} from './components/PreviewCanvas';
import {Timeline} from './components/Timeline';
import {ToolInspector} from './components/ToolInspector';
import {FONT_LIBRARY, FontItem} from './data/fonts';
import {
  AdjustmentValues,
  AspectRatioId,
  AudioNRConfig,
  ChromaKeyConfig,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_AUDIO_NR,
  DEFAULT_CHROMA_KEY,
  DEFAULT_MASK,
  EasingId,
  EditorToolTab,
  EnhanceModeId,
  KeyframeValues,
  MaskConfig,
  MediaClip,
  PipLayer,
  ProjectState,
  ResolutionId,
  SocialAnimationLayer,
  SocialPlatformId,
  SpotStroke,
  TextLayer,
} from './types/editor';
import {analyzeAudioBlob} from './utils/audioProcessor';
import {
  getClipAtTime,
  getExportDimensions,
  getTotalTimelineDuration,
  renderCompositionFrame,
} from './utils/canvasEngine';
import {
  exportProjectToKmz,
  importProjectFromKmz,
  loadProjectFromOfflineCache,
  saveProjectToOfflineCache,
} from './utils/kmzProject';
import {
  AudioLibraryItem,
  deleteAudioFromLibrary,
  deleteCustomFontFromDb,
  importAndSaveCustomFont,
  loadAllCustomFonts,
  loadAudioLibrary,
  renameAudioInLibrary,
  saveAudioToLibrary,
} from './utils/offlineLibrary';
import {createInitialDemoClips} from './utils/sampleMedia';
import {SOCIAL_PRESETS} from './utils/socialVectorRenderer';
import {applySpotStrokesToCanvas} from './utils/spotRemoval';

const TOOL_TABS: {id: EditorToolTab; label: string; icon: React.ComponentType<{className?: string}>}[] = [
  {id: 'enhance', label: '4K Enhance', icon: Sparkles},
  {id: 'filters', label: 'Filters', icon: Palette},
  {id: 'adjust', label: 'Adjust', icon: SlidersHorizontal},
  {id: 'chroma', label: 'Chroma', icon: Pipette},
  {id: 'pip', label: 'PIP', icon: PictureInPicture2},
  {id: 'social', label: 'Social', icon: Share2},
  {id: 'text', label: 'Text 100', icon: Type},
  {id: 'transitions', label: 'Transitions', icon: Layers},
  {id: 'mask', label: 'Mask', icon: CircleDot},
  {id: 'spot', label: 'Spot PNG', icon: Eraser},
  {id: 'keyframes', label: 'Keyframes', icon: Diamond},
  {id: 'audio', label: 'Audio & NR', icon: AudioLines},
];

function createInitialProject(): ProjectState {
  const clips = createInitialDemoClips();
  return {
    id: `proj-${Date.now()}`,
    name: 'Studio Edit 4K',
    mode: 'video',
    aspectRatio: '16:9',
    resolution: '4k',
    fps: 60,
    clips,
    pipLayers: [],
    socialLayers: [],
    textLayers: [
      {
        id: 'text-1',
        text: '4K ULTRA CLARITY',
        startTime: 0.3,
        duration: 3.4,
        x: 50,
        y: 80,
        fontFamily: FONT_LIBRARY[22].family, // Anton Heavy Bold
        fontWeight: 400,
        fontSize: 78,
        letterSpacing: 3,
        lineHeight: 1.1,
        align: 'center',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 8,
        bgColor: '#000000',
        bgOpacity: 0,
        rotation: 0,
        scale: 100,
        opacity: 100,
        effectId: 'yt-fx-002',
        animSpeed: 1,
        keyframes: [],
      },
    ],
    audioNR: {...DEFAULT_AUDIO_NR},
    updatedAt: Date.now(),
  };
}

interface HistoryStack {
  past: ProjectState[];
  present: ProjectState;
  future: ProjectState[];
}

export default function App() {
  const [history, setHistory] = useState<HistoryStack>(() => ({
    past: [],
    present: createInitialProject(),
    future: [],
  }));
  const project = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const lastCoalesceRef = useRef<{key: string; time: number} | null>(null);

  const [activeTool, setActiveTool] = useState<EditorToolTab>('enhance');
  const [activeClipId, setActiveClipId] = useState<string | null>('clip-1');
  const [activePipId, setActivePipId] = useState<string | null>(null);
  const [activeSocialId, setActiveSocialId] = useState<string | null>(null);
  const [activeTextId, setActiveTextId] = useState<string | null>('text-1');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  const [isDraggingFiles, setIsDraggingFiles] = useState<boolean>(false);

  // Chroma Key tool state (neutral until adjusted; eyedropper auto-resets when leaving tab)
  const [chromaTarget, setChromaTarget] = useState<'clip' | 'pip'>('clip');
  const [chromaEyedropperActive, setChromaEyedropperActive] = useState<boolean>(false);

  // Spot remove interactive state
  const [spotBrushMode, setSpotBrushMode] = useState<'heal' | 'erase'>('heal');
  const [spotBrushSize, setSpotBrushSize] = useState<number>(0.032);
  const [spotBrushFeather, setSpotBrushFeather] = useState<number>(0.25);
  const [pendingSpotStrokes, setPendingSpotStrokes] = useState<SpotStroke[]>([]);
  const [showSpotOverlay, setShowSpotOverlay] = useState<boolean>(true);

  // Custom Fonts (.ttf / .otf) & Offline Audio Library state
  const [customFonts, setCustomFonts] = useState<FontItem[]>([]);
  const [audioLibrary, setAudioLibrary] = useState<AudioLibraryItem[]>([]);
  const [videoThumbMap, setVideoThumbMap] = useState<Record<string, string>>({});

  const mediaMapRef = useRef<Map<string, HTMLImageElement | HTMLVideoElement | HTMLCanvasElement>>(
    new Map(),
  );
  const timelineAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mediaVersion, setMediaVersion] = useState<number>(0);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const pipInputRef = useRef<HTMLInputElement | null>(null);
  const kmzInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const pipLayers = useMemo(() => project.pipLayers ?? [], [project.pipLayers]);
  const socialLayers = useMemo(() => project.socialLayers ?? [], [project.socialLayers]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2800);
  }, []);

  const replaceProjectResetHistory = useCallback((next: ProjectState) => {
    lastCoalesceRef.current = null;
    setHistory({past: [], present: next, future: []});
  }, []);

  // Load any previously autosaved offline project, custom fonts, and audio library on boot
  useEffect(() => {
    let cancelled = false;
    loadProjectFromOfflineCache().then((cached) => {
      if (!cancelled && cached && cached.clips.length > 0) {
        replaceProjectResetHistory(cached);
        setActiveClipId(cached.clips[0].id);
        setActivePipId(cached.pipLayers?.[0]?.id ?? null);
        setActiveSocialId(cached.socialLayers?.[0]?.id ?? null);
        setActiveTextId(cached.textLayers[0]?.id ?? null);
      }
    });
    loadAllCustomFonts().then((fonts) => {
      if (!cancelled && fonts.length > 0) setCustomFonts(fonts);
    });
    loadAudioLibrary().then((items) => {
      if (!cancelled && items.length > 0) setAudioLibrary(items);
    });
    return () => {
      cancelled = true;
    };
  }, [replaceProjectResetHistory]);

  // Debounced offline IndexedDB autosave
  useEffect(() => {
    const id = window.setTimeout(() => {
      saveProjectToOfflineCache(project);
    }, 2500);
    return () => window.clearTimeout(id);
  }, [project]);

  // Atomic history-aware project mutation helper with optional continuous-drag coalescing
  const mutateProject = useCallback(
    (updater: (prev: ProjectState) => ProjectState, coalesceKey?: string) => {
      setHistory((h) => {
        const next = updater(h.present);
        if (next === h.present) return h;
        const stamped: ProjectState = {...next, updatedAt: Date.now()};

        if (coalesceKey) {
          const now = Date.now();
          const last = lastCoalesceRef.current;
          if (last && last.key === coalesceKey && now - last.time < 550 && h.past.length > 0) {
            lastCoalesceRef.current = {key: coalesceKey, time: now};
            return {
              past: h.past,
              present: stamped,
              future: [],
            };
          }
          lastCoalesceRef.current = {key: coalesceKey, time: now};
        } else {
          lastCoalesceRef.current = null;
        }

        return {
          past: [...h.past.slice(-49), h.present],
          present: stamped,
          future: [],
        };
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    lastCoalesceRef.current = null;
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future.slice(0, 49)],
      };
    });
    showToast('Undo');
  }, [canUndo, showToast]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    lastCoalesceRef.current = null;
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      return {
        past: [...h.past.slice(-49), h.present],
        present: next,
        future: h.future.slice(1),
      };
    });
    showToast('Redo');
  }, [canRedo, showToast]);

  // Preload all clip and PIP overlay images / videos into mediaMapRef for zero-lag canvas rendering
  useEffect(() => {
    const map = mediaMapRef.current;
    const validIds = new Set<string>([
      ...project.clips.map((c) => c.id),
      ...pipLayers.map((p) => p.id),
    ]);
    for (const key of Array.from(map.keys())) {
      if (!validIds.has(key)) map.delete(key);
    }

    project.clips.forEach((clip) => {
      const desiredSrc = clip.processedSrc ?? clip.src;
      const existing = map.get(clip.id);
      const existingSrc =
        existing instanceof HTMLImageElement || existing instanceof HTMLVideoElement
          ? existing.dataset.loadedSrc
          : undefined;
      if (existing && existingSrc === desiredSrc) return;

      if (clip.kind === 'video' && !clip.processedSrc) {
        const vid = document.createElement('video');
        vid.src = desiredSrc;
        vid.dataset.loadedSrc = desiredSrc;
        vid.muted = clip.muted;
        vid.playsInline = true;
        vid.preload = 'auto';
        vid.crossOrigin = 'anonymous';
        vid.onloadeddata = () => {
          map.set(clip.id, vid);
          setMediaVersion((v) => v + 1);
        };
        vid.onseeked = () => {
          setMediaVersion((v) => v + 1);
        };
        map.set(clip.id, vid);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.dataset.loadedSrc = desiredSrc;
        img.onload = () => {
          map.set(clip.id, img);
          setMediaVersion((v) => v + 1);
        };
        img.src = desiredSrc;
      }
    });

    pipLayers.forEach((pip) => {
      const existing = map.get(pip.id);
      const existingSrc =
        existing instanceof HTMLImageElement || existing instanceof HTMLVideoElement
          ? existing.dataset.loadedSrc
          : undefined;
      if (existing && existingSrc === pip.src) return;

      if (pip.kind === 'video') {
        const vid = document.createElement('video');
        vid.src = pip.src;
        vid.dataset.loadedSrc = pip.src;
        vid.muted = pip.muted;
        vid.playsInline = true;
        vid.preload = 'auto';
        vid.crossOrigin = 'anonymous';
        vid.onloadeddata = () => {
          map.set(pip.id, vid);
          setMediaVersion((v) => v + 1);
        };
        vid.onseeked = () => {
          setMediaVersion((v) => v + 1);
        };
        map.set(pip.id, vid);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.dataset.loadedSrc = pip.src;
        img.onload = () => {
          map.set(pip.id, img);
          setMediaVersion((v) => v + 1);
        };
        img.src = pip.src;
      }
    });
  }, [project.clips, pipLayers]);

  // Active clip timing metadata
  const totalDuration = useMemo(() => getTotalTimelineDuration(project.clips), [project.clips]);
  const currentSlot = useMemo(
    () => getClipAtTime(project.clips, currentTime),
    [project.clips, currentTime],
  );

  const activeClip = useMemo(
    () => project.clips.find((c) => c.id === activeClipId) ?? currentSlot?.clip ?? project.clips[0] ?? null,
    [project.clips, activeClipId, currentSlot],
  );

  const activeClipTiming = useMemo(() => {
    let cursor = 0;
    for (let i = 0; i < project.clips.length; i++) {
      const c = project.clips[i];
      if (c.id === activeClip?.id) {
        return {
          index: i,
          start: cursor,
          localTime: Math.max(0, Math.min(c.duration, currentTime - cursor)),
          hasNext: i < project.clips.length - 1,
        };
      }
      cursor += c.duration;
    }
    return {index: 0, start: 0, localTime: 0, hasNext: false};
  }, [project.clips, activeClip?.id, currentTime]);

  // Sync main clip & PIP HTMLVideoElement timestamps to timeline playhead
  useEffect(() => {
    const activeVideoIds = new Set<string>();

    if (currentSlot) {
      const {clip, localTime} = currentSlot;
      const el = mediaMapRef.current.get(clip.id);
      if (el instanceof HTMLVideoElement) {
        activeVideoIds.add(clip.id);
        el.muted = clip.muted;
        el.volume = Math.max(0, Math.min(1, clip.volume / 100));
        el.playbackRate = clip.speed;
        const targetVideoTime = Math.min(
          Math.max(0, clip.trimStart + localTime * clip.speed),
          el.duration || clip.sourceDuration || 999,
        );
        if (isPlaying) {
          if (Math.abs(el.currentTime - targetVideoTime) > 0.25) {
            el.currentTime = targetVideoTime;
          }
          if (el.paused) {
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) el.pause();
          if (Math.abs(el.currentTime - targetVideoTime) > 0.04) {
            el.currentTime = targetVideoTime;
          }
        }
      }
    }

    // Sync any active PIP video layers overlapping currentTime
    pipLayers.forEach((pip) => {
      if (pip.kind !== 'video') return;
      const el = mediaMapRef.current.get(pip.id);
      if (!(el instanceof HTMLVideoElement)) return;
      const localT = currentTime - pip.startTime;
      if (localT >= 0 && localT <= pip.duration) {
        activeVideoIds.add(pip.id);
        el.muted = pip.muted;
        el.volume = Math.max(0, Math.min(1, pip.volume / 100));
        const dur = el.duration || pip.sourceDuration || pip.duration || 5;
        const targetT = dur > 0 ? localT % dur : 0;
        if (isPlaying) {
          if (Math.abs(el.currentTime - targetT) > 0.28) {
            el.currentTime = targetT;
          }
          if (el.paused) {
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) el.pause();
          if (Math.abs(el.currentTime - targetT) > 0.04) {
            el.currentTime = targetT;
          }
        }
      }
    });

    // Pause inactive video elements
    mediaMapRef.current.forEach((other, id) => {
      if (!activeVideoIds.has(id) && other instanceof HTMLVideoElement && !other.paused) {
        other.pause();
      }
    });
  }, [currentSlot, pipLayers, currentTime, isPlaying]);

  // Zero-lag 60fps requestAnimationFrame playback loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          return 0; // Seamless studio loop playback
        }
        return next;
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Import local Photos / Videos / .KMZ files completely offline
  const handleImportFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;

      // Check for .kmz project file first
      const kmzFile = arr.find((f) => f.name.toLowerCase().endsWith('.kmz'));
      if (kmzFile) {
        try {
          const restored = await importProjectFromKmz(kmzFile);
          replaceProjectResetHistory(restored);
          setActiveClipId(restored.clips[0]?.id ?? null);
          setActivePipId(restored.pipLayers?.[0]?.id ?? null);
          setActiveSocialId(restored.socialLayers?.[0]?.id ?? null);
          setActiveTextId(restored.textLayers[0]?.id ?? null);
          setCurrentTime(0);
          setIsPlaying(false);
          showToast(`Loaded project ${kmzFile.name}`);
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Invalid .kmz project file');
        }
        return;
      }

      const newClips: MediaClip[] = [];
      for (const file of arr) {
        if (/\.(ttf|otf|woff2?)$/i.test(file.name)) {
          try {
            const fontItem = await importAndSaveCustomFont(file);
            setCustomFonts((prev) => [fontItem, ...prev]);
            setActiveTool('text');
            showToast(`Added custom font "${fontItem.name}"`);
          } catch {
            showToast(`Could not load font ${file.name}`);
          }
          continue;
        }

        if (file.type.startsWith('audio/')) {
          const analyzed = await analyzeAudioBlob(file);
          const saved = await saveAudioToLibrary({
            name: file.name.replace(/\.[^.]+$/, ''),
            mimeType: file.type || 'audio/mpeg',
            duration: analyzed.duration,
            sizeBytes: file.size,
            sourceType: 'imported',
            peaks: analyzed.peaks,
            blob: file,
          });
          setAudioLibrary((prev) => [saved, ...prev]);
          mutateProject((prev) => ({
            ...prev,
            audioNR: {
              ...prev.audioNR,
              enabled: true,
              trackName: saved.name,
              trackSrc: saved.objectUrl,
              trackMimeType: saved.mimeType,
            },
          }));
          setActiveTool('audio');
          showToast(`Imported & saved "${saved.name}" to My Audio Library`);
          continue;
        }

        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          const dims = await new Promise<{w: number; h: number}>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({w: img.naturalWidth || 1920, h: img.naturalHeight || 1080});
            img.onerror = () => resolve({w: 1920, h: 1080});
            img.src = url;
          });
          newClips.push({
            id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            kind: 'photo',
            src: url,
            mimeType: file.type || 'image/png',
            width: dims.w,
            height: dims.h,
            duration: 4.0,
            trimStart: 0,
            sourceDuration: 4.0,
            speed: 1,
            scale: 100,
            volume: 100,
            muted: false,
            filterId: 'original',
            filterIntensity: 0,
            filterBrightness: 0,
            enhanceMode: 'none',
            enhanceStrength: 0,
            adjustments: {...DEFAULT_ADJUSTMENTS},
            mask: {...DEFAULT_MASK},
            keyframes: [],
            spotStrokes: [],
            transitionOut: 'cross-dissolve',
            transitionDuration: 0.7,
          });
        } else if (file.type.startsWith('video/')) {
          const url = URL.createObjectURL(file);
          const meta = await new Promise<{w: number; h: number; dur: number}>((resolve) => {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.onloadedmetadata = () =>
              resolve({
                w: vid.videoWidth || 1920,
                h: vid.videoHeight || 1080,
                dur: Math.max(1, Math.min(180, vid.duration || 5)),
              });
            vid.onerror = () => resolve({w: 1920, h: 1080, dur: 5});
            vid.src = url;
          });
          newClips.push({
            id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            kind: 'video',
            src: url,
            mimeType: file.type || 'video/mp4',
            width: meta.w,
            height: meta.h,
            duration: Number(meta.dur.toFixed(2)),
            trimStart: 0,
            sourceDuration: Number(meta.dur.toFixed(2)),
            speed: 1,
            scale: 100,
            volume: 100,
            muted: false,
            filterId: 'original',
            filterIntensity: 0,
            filterBrightness: 0,
            enhanceMode: 'none',
            enhanceStrength: 0,
            adjustments: {...DEFAULT_ADJUSTMENTS},
            mask: {...DEFAULT_MASK},
            keyframes: [],
            spotStrokes: [],
            transitionOut: 'pull-in',
            transitionDuration: 0.65,
          });
        }
      }

      if (newClips.length > 0) {
        mutateProject((prev) => ({
          ...prev,
          clips: [...prev.clips, ...newClips],
        }));
        setActiveClipId(newClips[0].id);
        showToast(`Imported ${newClips.length} crisp media ${newClips.length === 1 ? 'file' : 'files'}`);
      }
    },
    [mutateProject, replaceProjectResetHistory, showToast],
  );

  // Clip mutators (discrete actions commit immediately; continuous sliders coalesce smoothly)
  const handleUpdateClip = useCallback(
    (clipId: string, patch: Partial<MediaClip>) => {
      const isFilterTuningDrag = 'filterSettings' in patch && !('filterId' in patch);
      const isDiscrete =
        !isFilterTuningDrag &&
        ('filterId' in patch ||
          'enhanceMode' in patch ||
          'transitionOut' in patch ||
          Object.keys(patch).length > 2);
      const coalesceKey = isDiscrete
        ? undefined
        : isFilterTuningDrag
          ? `clip-${clipId}-filterTune`
          : `clip-${clipId}-${Object.keys(patch).sort().join(',')}`;
      mutateProject(
        (prev) => ({
          ...prev,
          clips: prev.clips.map((c) => (c.id === clipId ? {...c, ...patch} : c)),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handleUpdateAdjustments = useCallback(
    (clipId: string, patch: Partial<AdjustmentValues>) => {
      const keys = Object.keys(patch);
      const coalesceKey = keys.length === 1 ? `adj-${clipId}-${keys[0]}` : undefined;
      mutateProject(
        (prev) => ({
          ...prev,
          clips: prev.clips.map((c) =>
            c.id === clipId ? {...c, adjustments: {...c.adjustments, ...patch}} : c,
          ),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handleUpdateMask = useCallback(
    (clipId: string, patch: Partial<MaskConfig>) => {
      const isDiscrete =
        'shape' in patch ||
        'invert' in patch ||
        'brushStrokes' in patch ||
        Object.keys(patch).length > 2;
      const coalesceKey = isDiscrete
        ? undefined
        : `mask-${clipId}-${Object.keys(patch).sort().join(',')}`;
      mutateProject(
        (prev) => ({
          ...prev,
          clips: prev.clips.map((c) =>
            c.id === clipId ? {...c, mask: {...c.mask, ...patch}} : c,
          ),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handleAddMaskBrushStroke = useCallback(
    (clipId: string, stroke: SpotStroke) => {
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                mask: {
                  ...c.mask,
                  shape: 'brush',
                  brushStrokes: [...(c.mask.brushStrokes ?? []), stroke],
                },
              }
            : c,
        ),
      }));
    },
    [mutateProject],
  );

  // High-Precision Chroma Key handlers (Main Clip & PIP Overlay + Canvas Eyedropper)
  const handleUpdateClipChroma = useCallback(
    (clipId: string, patch: Partial<ChromaKeyConfig>) => {
      const isDiscrete = 'keyColor' in patch || 'enabled' in patch || Object.keys(patch).length > 2;
      const coalesceKey = isDiscrete
        ? undefined
        : `chroma-clip-${clipId}-${Object.keys(patch).sort().join(',')}`;
      mutateProject(
        (prev) => ({
          ...prev,
          clips: prev.clips.map((c) =>
            c.id === clipId
              ? {...c, chromaKey: {...DEFAULT_CHROMA_KEY, ...(c.chromaKey ?? {}), ...patch}}
              : c,
          ),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handleUpdatePipChroma = useCallback(
    (pipId: string, patch: Partial<ChromaKeyConfig>) => {
      const isDiscrete = 'keyColor' in patch || 'enabled' in patch || Object.keys(patch).length > 2;
      const coalesceKey = isDiscrete
        ? undefined
        : `chroma-pip-${pipId}-${Object.keys(patch).sort().join(',')}`;
      mutateProject(
        (prev) => ({
          ...prev,
          pipLayers: (prev.pipLayers ?? []).map((p) =>
            p.id === pipId
              ? {...p, chromaKey: {...DEFAULT_CHROMA_KEY, ...(p.chromaKey ?? {}), ...patch}}
              : p,
          ),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handlePickChromaColor = useCallback(
    (hex: string) => {
      const cleanHex = hex.toUpperCase();
      const targetPip =
        chromaTarget === 'pip'
          ? pipLayers.find((p) => p.id === activePipId) ?? pipLayers[0] ?? null
          : null;
      if (targetPip) {
        handleUpdatePipChroma(targetPip.id, {keyColor: cleanHex});
      } else if (activeClip) {
        handleUpdateClipChroma(activeClip.id, {keyColor: cleanHex});
      }
      setChromaEyedropperActive(false);
      showToast(`Picked Chroma Key color ${cleanHex}`);
    },
    [chromaTarget, pipLayers, activePipId, activeClip, handleUpdatePipChroma, handleUpdateClipChroma, showToast],
  );

  // '✓✓' Apply to All Timeline Clips batch handlers
  const handleApplyChromaToAllClips = useCallback(
    (config: ChromaKeyConfig) => {
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) => ({...c, chromaKey: {...config}})),
      }));
      showToast('Applied Chroma Key to all timeline clips');
    },
    [mutateProject, showToast],
  );

  const handleApplyAdjustmentsToAllClips = useCallback(
    (adjustments: AdjustmentValues) => {
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) => ({...c, adjustments: {...adjustments}})),
      }));
      showToast('Applied tone & brightness to all timeline clips');
    },
    [mutateProject, showToast],
  );

  const handleApplyFilterToAllClips = useCallback(
    (filterId: string, intensity: number, brightness: number, sizeFilter?: number) => {
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) => ({
          ...c,
          filterId,
          filterIntensity: intensity,
          filterBrightness: brightness,
          adjustments:
            sizeFilter !== undefined ? {...c.adjustments, sizeFilter} : c.adjustments,
          filterSettings: {
            ...(c.filterSettings ?? {}),
            [filterId]: {intensity, brightness},
          },
        })),
      }));
      showToast('Applied filter & tuning to all timeline clips');
    },
    [mutateProject, showToast],
  );

  const handleApplyEnhanceToAllClips = useCallback(
    (enhanceMode: EnhanceModeId, strength: number, clarity4k: number) => {
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) => ({
          ...c,
          enhanceMode,
          enhanceStrength: strength,
          adjustments: {...c.adjustments, clarity4k},
        })),
      }));
      showToast('Applied 4K Clarity & Enhance to all timeline clips');
    },
    [mutateProject, showToast],
  );

  // Split / Duplicate / Delete clips
  const handleSplitClip = useCallback(() => {
    if (!activeClip) return;
    const local = activeClipTiming.localTime;
    if (local < 0.3 || local > activeClip.duration - 0.3) {
      showToast('Move playhead inside the clip to split.');
      return;
    }
    const leftDur = Number(local.toFixed(2));
    const rightDur = Number((activeClip.duration - local).toFixed(2));
    const rightClip: MediaClip = {
      ...activeClip,
      id: `clip-${Date.now()}`,
      name: `${activeClip.name} (B)`,
      duration: rightDur,
      trimStart: activeClip.trimStart + leftDur * activeClip.speed,
      keyframes: [],
    };
    mutateProject((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === activeClip.id);
      if (idx === -1) return prev;
      const copy = [...prev.clips];
      copy[idx] = {...activeClip, duration: leftDur};
      copy.splice(idx + 1, 0, rightClip);
      return {...prev, clips: copy};
    });
    setActiveClipId(rightClip.id);
    showToast('Clip split cleanly at playhead');
  }, [activeClip, activeClipTiming.localTime, mutateProject, showToast]);

  // Freeze Frame: capture exact full-resolution frame at playhead and insert a crisp 3.0s still clip
  const handleFreezeFrame = useCallback(() => {
    if (!activeClip) return;
    const mediaEl = mediaMapRef.current.get(activeClip.id);
    let frozenSrc = activeClip.processedSrc ?? activeClip.src;
    let frozenW = activeClip.width || 1920;
    let frozenH = activeClip.height || 1080;

    if (mediaEl instanceof HTMLVideoElement && mediaEl.videoWidth > 0 && mediaEl.videoHeight > 0) {
      try {
        const c = document.createElement('canvas');
        c.width = mediaEl.videoWidth;
        c.height = mediaEl.videoHeight;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(mediaEl, 0, 0, c.width, c.height);
          frozenSrc = c.toDataURL('image/png');
          frozenW = c.width;
          frozenH = c.height;
        }
      } catch {
        // Fallback to clip source
      }
    } else if (
      mediaEl instanceof HTMLImageElement &&
      mediaEl.naturalWidth > 0 &&
      mediaEl.naturalHeight > 0
    ) {
      frozenW = mediaEl.naturalWidth;
      frozenH = mediaEl.naturalHeight;
    }

    const local = activeClipTiming.localTime;
    const canSplitInsert = local > 0.25 && local < activeClip.duration - 0.25;
    const freezeId = `clip-freeze-${Date.now()}`;
    const freezeClip: MediaClip = {
      ...activeClip,
      id: freezeId,
      name: `${activeClip.name.replace(/\.[^.]+$/, '')} (Freeze)`,
      kind: 'photo',
      src: frozenSrc,
      processedSrc: undefined,
      mimeType: 'image/png',
      width: frozenW,
      height: frozenH,
      duration: 3.0,
      trimStart: 0,
      sourceDuration: 3.0,
      speed: 1,
      keyframes: [],
      spotStrokes: [],
      transitionOut: 'none',
      transitionDuration: 0,
    };

    mutateProject((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === activeClip.id);
      if (idx === -1) return prev;
      const copy = [...prev.clips];

      if (canSplitInsert) {
        const leftDur = Number(local.toFixed(2));
        const rightDur = Number((activeClip.duration - local).toFixed(2));
        const rightClip: MediaClip = {
          ...activeClip,
          id: `clip-${Date.now()}-b`,
          name: `${activeClip.name} (B)`,
          duration: rightDur,
          trimStart: activeClip.trimStart + leftDur * activeClip.speed,
          keyframes: [],
        };
        copy[idx] = {
          ...activeClip,
          duration: leftDur,
          transitionOut: 'none',
          transitionDuration: 0,
        };
        copy.splice(idx + 1, 0, freezeClip, rightClip);
      } else {
        copy.splice(idx + 1, 0, freezeClip);
      }

      return {...prev, clips: copy};
    });

    setActiveClipId(freezeId);
    showToast('Inserted 3.0s Freeze Frame');
  }, [activeClip, activeClipTiming.localTime, mutateProject, showToast]);

  const handleDuplicateClip = useCallback(() => {
    if (!activeClip) return;
    const dup: MediaClip = {
      ...activeClip,
      id: `clip-${Date.now()}`,
      name: `${activeClip.name} Copy`,
      keyframes: activeClip.keyframes.map((k) => ({...k, id: `kf-${Date.now()}-${Math.random()}`})),
    };
    mutateProject((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === activeClip.id);
      const copy = [...prev.clips];
      copy.splice(idx + 1, 0, dup);
      return {...prev, clips: copy};
    });
    setActiveClipId(dup.id);
    showToast('Clip duplicated');
  }, [activeClip, mutateProject, showToast]);

  const handleDeleteClip = useCallback(
    (clipId: string) => {
      if (project.clips.length <= 1) return;
      mutateProject((prev) => {
        const remaining = prev.clips.filter((c) => c.id !== clipId);
        return {...prev, clips: remaining};
      });
      const fallback = project.clips.find((c) => c.id !== clipId);
      setActiveClipId(fallback?.id ?? null);
      setCurrentTime(0);
      showToast('Clip removed');
    },
    [project.clips, mutateProject, showToast],
  );

  // Convenient Mute Clip toggle next to the timeline
  const handleToggleMuteClip = useCallback(() => {
    if (!activeClip) return;
    const nextMuted = !activeClip.muted;
    mutateProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === activeClip.id ? {...c, muted: nextMuted} : c)),
    }));
    showToast(nextMuted ? `Muted "${activeClip.name}"` : `Unmuted "${activeClip.name}"`);
  }, [activeClip, mutateProject, showToast]);

  // PIP (Picture-in-Picture / Video Overlay) handlers
  const handleAddPipFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      const newPips: PipLayer[] = [];

      for (const file of arr) {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          const dims = await new Promise<{w: number; h: number}>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({w: img.naturalWidth || 1280, h: img.naturalHeight || 720});
            img.onerror = () => resolve({w: 1280, h: 720});
            img.src = url;
          });
          newPips.push({
            id: `pip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            kind: 'photo',
            src: url,
            mimeType: file.type || 'image/png',
            width: dims.w,
            height: dims.h,
            startTime: Number(Math.max(0, Math.min(Math.max(0, totalDuration - 0.5), currentTime)).toFixed(2)),
            duration: Number(Math.min(4.0, Math.max(1.5, totalDuration - currentTime || 3.5)).toFixed(2)),
            sourceDuration: 4.0,
            x: 74,
            y: 26,
            scale: 34,
            rotation: 0,
            opacity: 100,
            borderRadius: 10,
            borderWidth: 2,
            volume: 100,
            muted: false,
          });
        } else if (file.type.startsWith('video/')) {
          const url = URL.createObjectURL(file);
          const meta = await new Promise<{w: number; h: number; dur: number}>((resolve) => {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.onloadedmetadata = () =>
              resolve({
                w: vid.videoWidth || 1280,
                h: vid.videoHeight || 720,
                dur: Math.max(1, Math.min(120, vid.duration || 4)),
              });
            vid.onerror = () => resolve({w: 1280, h: 720, dur: 4});
            vid.src = url;
          });
          newPips.push({
            id: `pip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            kind: 'video',
            src: url,
            mimeType: file.type || 'video/mp4',
            width: meta.w,
            height: meta.h,
            startTime: Number(Math.max(0, Math.min(Math.max(0, totalDuration - 0.5), currentTime)).toFixed(2)),
            duration: Number(Math.min(meta.dur, Math.max(1.5, totalDuration - currentTime || meta.dur)).toFixed(2)),
            sourceDuration: Number(meta.dur.toFixed(2)),
            x: 74,
            y: 26,
            scale: 36,
            rotation: 0,
            opacity: 100,
            borderRadius: 10,
            borderWidth: 2,
            volume: 80,
            muted: false,
          });
        }
      }

      if (newPips.length > 0) {
        mutateProject((prev) => ({
          ...prev,
          pipLayers: [...(prev.pipLayers ?? []), ...newPips],
        }));
        setActivePipId(newPips[0].id);
        setActiveTool('pip');
        setMobileSheetOpen(true);
        showToast(`Added PIP overlay "${newPips[0].name}"`);
      }
    },
    [currentTime, totalDuration, mutateProject, showToast],
  );

  const handleAddPipFromClip = useCallback(
    (clip: MediaClip) => {
      const pip: PipLayer = {
        id: `pip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${clip.name} (PIP)`,
        kind: clip.kind,
        src: clip.processedSrc ?? clip.src,
        mimeType: clip.mimeType,
        width: clip.width,
        height: clip.height,
        startTime: Number(Math.max(0, Math.min(Math.max(0, totalDuration - 0.5), currentTime)).toFixed(2)),
        duration: Number(Math.min(clip.duration, Math.max(1.5, totalDuration - currentTime || 3.5)).toFixed(2)),
        sourceDuration: clip.sourceDuration,
        x: 74,
        y: 26,
        scale: 34,
        rotation: 0,
        opacity: 100,
        borderRadius: 10,
        borderWidth: 2,
        volume: 80,
        muted: clip.muted,
      };
      mutateProject((prev) => ({
        ...prev,
        pipLayers: [...(prev.pipLayers ?? []), pip],
      }));
      setActivePipId(pip.id);
      setActiveTool('pip');
      showToast(`Added "${clip.name}" as PIP overlay`);
    },
    [currentTime, totalDuration, mutateProject, showToast],
  );

  const handleUpdatePip = useCallback(
    (id: string, patch: Partial<PipLayer>) => {
      const isDiscrete = 'muted' in patch;
      const coalesceKey = isDiscrete
        ? undefined
        : `pip-${id}-${Object.keys(patch).sort().join(',')}`;
      mutateProject(
        (prev) => ({
          ...prev,
          pipLayers: (prev.pipLayers ?? []).map((p) => (p.id === id ? {...p, ...patch} : p)),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handleDeletePip = useCallback(
    (id: string) => {
      mutateProject((prev) => ({
        ...prev,
        pipLayers: (prev.pipLayers ?? []).filter((p) => p.id !== id),
      }));
      setActivePipId((cur) => (cur === id ? null : cur));
      showToast('PIP overlay removed');
    },
    [mutateProject, showToast],
  );

  // Crisp Vector Social Animations handlers (YouTube, Facebook, Instagram)
  const handleAddSocialPreset = useCallback(
    (platform: SocialPlatformId) => {
      const spec = SOCIAL_PRESETS.find((p) => p.platform === platform) ?? SOCIAL_PRESETS[0];
      const start = Number(
        Math.max(0, Math.min(Math.max(0, totalDuration - 0.5), currentTime)).toFixed(2),
      );
      const dur = Number(Math.min(4.2, Math.max(2.6, totalDuration - start || 4.0)).toFixed(2));
      const newSocial: SocialAnimationLayer = {
        ...spec.defaults,
        id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        startTime: start,
        duration: dur,
      };
      mutateProject((prev) => ({
        ...prev,
        socialLayers: [...(prev.socialLayers ?? []), newSocial],
      }));
      setActiveSocialId(newSocial.id);
      setActiveTool('social');
      showToast(`Added crisp vector ${spec.label}`);
    },
    [currentTime, totalDuration, mutateProject, showToast],
  );

  const handleUpdateSocial = useCallback(
    (id: string, patch: Partial<SocialAnimationLayer>) => {
      const isDiscrete =
        'themeStyle' in patch ||
        'verified' in patch ||
        'showCursor' in patch ||
        'showActions' in patch;
      const coalesceKey = isDiscrete
        ? undefined
        : `social-${id}-${Object.keys(patch).sort().join(',')}`;
      mutateProject(
        (prev) => ({
          ...prev,
          socialLayers: (prev.socialLayers ?? []).map((s) => (s.id === id ? {...s, ...patch} : s)),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handleDeleteSocial = useCallback(
    (id: string) => {
      mutateProject((prev) => ({
        ...prev,
        socialLayers: (prev.socialLayers ?? []).filter((s) => s.id !== id),
      }));
      setActiveSocialId((cur) => (cur === id ? null : cur));
      showToast('Social animation removed');
    },
    [mutateProject, showToast],
  );

  // Keyframe handlers
  const handleAddOrUpdateKeyframe = useCallback(
    (clipId: string, values: KeyframeValues, easing: EasingId) => {
      const localT = Number(activeClipTiming.localTime.toFixed(2));
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) => {
          if (c.id !== clipId) return c;
          const idx = c.keyframes.findIndex((k) => Math.abs(k.time - localT) < 0.08);
          const nextKfs = [...c.keyframes];
          if (idx >= 0) {
            nextKfs[idx] = {...nextKfs[idx], easing, values: {...values}};
          } else {
            nextKfs.push({
              id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              time: localT,
              easing,
              values: {...values},
            });
          }
          nextKfs.sort((a, b) => a.time - b.time);
          return {...c, keyframes: nextKfs};
        }),
      }));
    },
    [activeClipTiming.localTime, mutateProject],
  );

  const handleDeleteKeyframeAtPlayhead = useCallback(
    (clipId: string) => {
      const localT = activeClipTiming.localTime;
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) =>
          c.id === clipId
            ? {...c, keyframes: c.keyframes.filter((k) => Math.abs(k.time - localT) >= 0.08)}
            : c,
        ),
      }));
      showToast('Keyframe removed');
    },
    [activeClipTiming.localTime, mutateProject, showToast],
  );

  // Spot Removal Apply + PNG Direct Export
  const handleApplySpotRemoval = useCallback(() => {
    if (!activeClip || pendingSpotStrokes.length === 0) return;
    const mediaEl = mediaMapRef.current.get(activeClip.id);
    if (!mediaEl) return;

    const processedCanvas = applySpotStrokesToCanvas(mediaEl, pendingSpotStrokes);
    const dataUrl = processedCanvas.toDataURL('image/png');

    mutateProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) =>
        c.id === activeClip.id
          ? {
              ...c,
              processedSrc: dataUrl,
              spotStrokes: [...c.spotStrokes, ...pendingSpotStrokes],
            }
          : c,
      ),
    }));
    setPendingSpotStrokes([]);
    showToast('Spot removal applied at full crisp resolution');
  }, [activeClip, pendingSpotStrokes, mutateProject, showToast]);

  const handleResetSpotImage = useCallback(() => {
    if (!activeClip) return;
    mutateProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) =>
        c.id === activeClip.id ? {...c, processedSrc: undefined, spotStrokes: []} : c,
      ),
    }));
    setPendingSpotStrokes([]);
    showToast('Restored original unedited source');
  }, [activeClip, mutateProject, showToast]);

  const handleExportSpotPng = useCallback(() => {
    const dims = getExportDimensions(project.aspectRatio, project.resolution);
    const canvas = document.createElement('canvas');
    try {
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('Could not allocate canvas for PNG export.');
        return;
      }

      renderCompositionFrame(ctx, dims.width, dims.height, {
        clips: project.clips,
        pipLayers: project.pipLayers,
        socialLayers: project.socialLayers,
        textLayers: project.textLayers,
        globalTime: currentTime,
        mediaMap: mediaMapRef.current,
        transparentBackground: true,
      });

      canvas.toBlob((blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) {
          showToast('PNG export hit a device memory limit. Try 1080p in Export.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}_clean_spot_${dims.width}x${dims.height}.png`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 12000);
        showToast(`Exported crisp lossless PNG (${dims.width}×${dims.height})`);
      }, 'image/png');
    } catch {
      canvas.width = 0;
      canvas.height = 0;
      showToast('PNG export hit a device memory limit. Try 1080p in Export.');
    }
  }, [project, currentTime, showToast]);

  // Text layer handlers
  const handleAddText = useCallback(() => {
    const newLayer: TextLayer = {
      id: `text-${Date.now()}`,
      text: 'NEW TITLE',
      startTime: Number(Math.max(0, Math.min(totalDuration - 0.5, currentTime)).toFixed(2)),
      duration: Math.min(3.5, Math.max(1.5, totalDuration - currentTime)),
      x: 50,
      y: 50,
      fontFamily: FONT_LIBRARY[22].family,
      fontWeight: 700,
      fontSize: 76,
      letterSpacing: 1,
      lineHeight: 1.15,
      align: 'center',
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 0,
      bgColor: '#000000',
      bgOpacity: 0,
      rotation: 0,
      scale: 100,
      opacity: 100,
      effectId: 'yt-fx-001',
      textAnimation: 'none',
      animSpeed: 1,
      keyframes: [],
    };
    mutateProject((prev) => ({
      ...prev,
      textLayers: [...prev.textLayers, newLayer],
    }));
    setActiveTextId(newLayer.id);
    setActiveTool('text');
  }, [currentTime, totalDuration, mutateProject]);

  const handleUpdateText = useCallback(
    (id: string, patch: Partial<TextLayer>) => {
      const isDiscrete =
        'effectId' in patch ||
        'textAnimation' in patch ||
        'fontFamily' in patch ||
        'align' in patch ||
        'color' in patch;
      const coalesceKey = isDiscrete
        ? undefined
        : `text-${id}-${Object.keys(patch).sort().join(',')}`;
      mutateProject(
        (prev) => ({
          ...prev,
          textLayers: prev.textLayers.map((t) => (t.id === id ? {...t, ...patch} : t)),
        }),
        coalesceKey,
      );
    },
    [mutateProject],
  );

  const handleDeleteText = useCallback(
    (id: string) => {
      mutateProject((prev) => ({
        ...prev,
        textLayers: prev.textLayers.filter((t) => t.id !== id),
      }));
      setActiveTextId((cur) => (cur === id ? null : cur));
    },
    [mutateProject],
  );

  // Preview transition right before clip junction
  const handlePreviewTransition = useCallback(
    (clipId: string) => {
      let cursor = 0;
      for (const c of project.clips) {
        if (c.id === clipId) {
          const jumpTo = Math.max(0, cursor + c.duration - Math.max(0.8, c.transitionDuration) - 0.35);
          setCurrentTime(Number(jumpTo.toFixed(2)));
          setIsPlaying(true);
          return;
        }
        cursor += c.duration;
      }
    },
    [project.clips],
  );

  // Custom Font (.ttf / .otf) handlers
  const handleImportCustomFonts = useCallback(
    async (files: FileList) => {
      const added: FontItem[] = [];
      for (const file of Array.from(files)) {
        try {
          const item = await importAndSaveCustomFont(file);
          added.push(item);
        } catch {
          showToast(`Could not load font ${file.name}`);
        }
      }
      if (added.length > 0) {
        setCustomFonts((prev) => [...added, ...prev]);
        // Immediately apply the first imported custom font to the active text layer
        if (activeTextId) {
          handleUpdateText(activeTextId, {
            fontFamily: added[0].family,
            fontWeight: added[0].defaultWeight,
          });
        }
        showToast(
          added.length === 1
            ? `Added font "${added[0].name}"`
            : `Imported ${added.length} custom fonts`,
        );
      }
    },
    [activeTextId, handleUpdateText, showToast],
  );

  const handleDeleteCustomFont = useCallback(
    async (fontId: string) => {
      await deleteCustomFontFromDb(fontId);
      setCustomFonts((prev) => prev.filter((f) => f.id !== fontId));
      showToast('Custom font removed');
    },
    [showToast],
  );

  // Offline My Audio Library handlers
  const handleSaveAudioToLibrary = useCallback(
    async (item: Omit<AudioLibraryItem, 'id' | 'createdAt' | 'objectUrl'>) => {
      const saved = await saveAudioToLibrary(item);
      setAudioLibrary((prev) => [saved, ...prev]);
      showToast(`Saved "${saved.name}" to My Audio Library`);
      return saved;
    },
    [showToast],
  );

  const handleRenameAudioInLibrary = useCallback(
    async (id: string, nextName: string) => {
      await renameAudioInLibrary(id, nextName);
      setAudioLibrary((prev) =>
        prev.map((item) => (item.id === id ? {...item, name: nextName} : item)),
      );
      showToast(`Renamed audio to "${nextName}"`);
    },
    [showToast],
  );

  const handleDeleteAudioFromLibrary = useCallback(
    async (id: string) => {
      await deleteAudioFromLibrary(id);
      setAudioLibrary((prev) => {
        const target = prev.find((i) => i.id === id);
        if (target?.objectUrl) URL.revokeObjectURL(target.objectUrl);
        return prev.filter((i) => i.id !== id);
      });
      showToast('Removed audio from library');
    },
    [showToast],
  );

  // Capture crisp sample thumbnail for video clips so Filter buttons always show real visual previews
  useEffect(() => {
    if (!activeClip || activeClip.kind !== 'video') return;
    if (videoThumbMap[activeClip.id]) return;
    const el = mediaMapRef.current.get(activeClip.id);
    if (el instanceof HTMLVideoElement && el.readyState >= 2 && el.videoWidth > 0) {
      try {
        const c = document.createElement('canvas');
        c.width = 240;
        c.height = Math.max(120, Math.round((el.videoHeight / el.videoWidth) * 240));
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(el, 0, 0, c.width, c.height);
          const dataUrl = c.toDataURL('image/jpeg', 0.85);
          setVideoThumbMap((prev) => ({...prev, [activeClip.id]: dataUrl}));
        }
      } catch {
        // Ignore cross-origin or empty frame error
      }
    }
  }, [activeClip, mediaVersion, videoThumbMap]);

  const filterPreviewThumb = useMemo(() => {
    if (!activeClip) return '';
    if (activeClip.processedSrc) return activeClip.processedSrc;
    if (activeClip.kind === 'photo') return activeClip.src;
    if (videoThumbMap[activeClip.id]) return videoThumbMap[activeClip.id];
    const fallbackPhoto = project.clips.find((c) => c.kind === 'photo');
    return fallbackPhoto ? fallbackPhoto.processedSrc ?? fallbackPhoto.src : '';
  }, [activeClip, project.clips, videoThumbMap]);

  // Sync active project audio track (extracted or from My Audio Library) during timeline playback
  useEffect(() => {
    const audioEl = timelineAudioRef.current;
    if (!audioEl) return;
    const src = project.audioNR.trackSrc;
    if (!src) {
      if (!audioEl.paused) audioEl.pause();
      return;
    }
    if (audioEl.dataset.src !== src) {
      audioEl.src = src;
      audioEl.dataset.src = src;
    }
    if (isPlaying) {
      if (Math.abs(audioEl.currentTime - currentTime) > 0.35 && Number.isFinite(audioEl.duration)) {
        audioEl.currentTime = Math.min(currentTime, Math.max(0, audioEl.duration - 0.05));
      }
      if (audioEl.paused) {
        audioEl.play().catch(() => {});
      }
    } else if (!audioEl.paused) {
      audioEl.pause();
    }
  }, [project.audioNR.trackSrc, isPlaying, currentTime]);

  // .KMZ Save / Load handlers
  const handleSaveKmz = useCallback(async () => {
    const blob = await exportProjectToKmz(project);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.kmz`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast('Saved offline .kmz project file');
  }, [project, showToast]);

  const handleLoadKmzFile = useCallback(
    async (file: File) => {
      const restored = await importProjectFromKmz(file);
      replaceProjectResetHistory(restored);
      setActiveClipId(restored.clips[0]?.id ?? null);
      setActivePipId(restored.pipLayers?.[0]?.id ?? null);
      setActiveSocialId(restored.socialLayers?.[0]?.id ?? null);
      setActiveTextId(restored.textLayers[0]?.id ?? null);
      setCurrentTime(0);
      setIsPlaying(false);
      showToast(`Loaded ${file.name}`);
    },
    [replaceProjectResetHistory, showToast],
  );

  const selectTool = (tool: EditorToolTab) => {
    setActiveTool(tool);
    if (tool !== 'chroma') setChromaEyedropperActive(false);
    setMobileSheetOpen(true);
  };

  return (
    <div
      className="h-full w-full flex flex-col bg-black text-white overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFiles(true);
      }}
      onDragLeave={() => setIsDraggingFiles(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFiles(false);
        if (e.dataTransfer.files?.length) {
          handleImportFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={mediaInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.kmz"
        onChange={(e) => {
          if (e.target.files) handleImportFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={pipInputRef}
        type="file"
        multiple
        accept="video/*,image/*"
        onChange={(e) => {
          if (e.target.files) handleAddPipFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={kmzInputRef}
        type="file"
        accept=".kmz,application/vnd.google-earth.kmz,application/zip"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleLoadKmzFile(f).catch(() => showToast('Could not read .kmz file'));
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* TOP STUDIO BAR (Clean monochrome workspace bar — uploaded logo kept strictly as app icon) */}
      <header className="pt-safe shrink-0 h-14 px-3 sm:px-4 border-b border-white/10 bg-[#060606] flex items-center justify-between gap-2.5 sm:gap-3 z-30">
        {/* Zone 1: Prominent Undo / Redo + Import */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Edit history"
            className="flex items-center gap-1 p-0.5 rounded-xl bg-[#0e0e0e] border border-white/12"
          >
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`min-w-[40px] min-h-[36px] px-2 sm:px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap ${
                canUndo
                  ? 'bg-[#1c1c1c] text-white border-white/45 hover:bg-white hover:text-black active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(255,255,255,0.12)]'
                  : 'bg-transparent text-neutral-600 border-transparent cursor-not-allowed'
              }`}
              title={
                canUndo
                  ? `Undo (${history.past.length} ${history.past.length === 1 ? 'step' : 'steps'}) · Ctrl+Z`
                  : 'Nothing to undo'
              }
              aria-label="Undo"
            >
              <Undo2 className="w-[18px] h-[18px] stroke-[2.25] shrink-0" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`min-w-[40px] min-h-[36px] px-2 sm:px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap ${
                canRedo
                  ? 'bg-[#1c1c1c] text-white border-white/45 hover:bg-white hover:text-black active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(255,255,255,0.12)]'
                  : 'bg-transparent text-neutral-600 border-transparent cursor-not-allowed'
              }`}
              title={
                canRedo
                  ? `Redo (${history.future.length} ${history.future.length === 1 ? 'step' : 'steps'}) · Ctrl+Shift+Z`
                  : 'Nothing to redo'
              }
              aria-label="Redo"
            >
              <Redo2 className="w-[18px] h-[18px] stroke-[2.25] shrink-0" />
              <span className="hidden sm:inline">Redo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg bg-[#161616] border border-white/15 text-xs font-medium text-white hover:bg-white hover:text-black transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>

        {/* Zone 2: Editable Project Title + Export Resolution (1080p / 4K) & FPS (30 / 60) Quick Selector */}
        <div className="hidden md:flex items-center gap-2.5 min-w-0">
          <input
            type="text"
            value={project.name}
            onChange={(e) => mutateProject((p) => ({...p, name: e.target.value}), 'project-name')}
            aria-label="Project name"
            className="bg-transparent text-sm font-semibold text-white text-center border-b border-transparent hover:border-white/25 focus:border-white focus:outline-none px-2 py-0.5 w-36 xl:w-44 truncate"
          />

          <div
            role="group"
            aria-label="Export resolution and frame rate"
            className="flex items-center gap-1 p-0.5 rounded-lg bg-[#111111] border border-white/12 shrink-0"
          >
            {(['1080p', '4k'] as ResolutionId[]).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => mutateProject((p) => ({...p, resolution: res}))}
                className={`min-h-[28px] px-2 rounded-md text-[11px] font-mono-num uppercase transition-colors cursor-pointer whitespace-nowrap ${
                  project.resolution === res
                    ? 'bg-white text-black font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title={`Set export resolution to ${res.toUpperCase()}`}
              >
                {res}
              </button>
            ))}
            <span className="w-px h-4 bg-white/15 mx-0.5" aria-hidden="true" />
            {([30, 60] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => mutateProject((p) => ({...p, fps: f}))}
                className={`min-h-[28px] px-2 rounded-md text-[11px] font-mono-num transition-colors cursor-pointer whitespace-nowrap ${
                  project.fps === f
                    ? 'bg-white text-black font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title={`Set export frame rate to ${f}fps`}
              >
                {f}fps
              </button>
            ))}
          </div>
        </div>

        {/* Zone 3: .KMZ Quick Actions + Install PWA + Primary Export CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => kmzInputRef.current?.click()}
            className="hidden sm:inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg border border-white/15 bg-[#121212] text-xs font-medium text-neutral-200 hover:bg-white hover:text-black transition-colors cursor-pointer whitespace-nowrap"
            title="Load .kmz Project"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Load .kmz</span>
          </button>

          <button
            type="button"
            onClick={handleSaveKmz}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg border border-white/15 bg-[#121212] text-xs font-medium text-neutral-200 hover:bg-white hover:text-black transition-colors cursor-pointer whitespace-nowrap"
            title="Save .kmz Project Offline"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Save .kmz</span>
          </button>

          <PWAInstallButton />

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export {project.resolution.toUpperCase()}</span>
          </button>
        </div>
      </header>

      {/* MAIN STUDIO WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Left Tool Rail */}
        <aside className="hidden lg:flex flex-col w-[84px] shrink-0 border-r border-white/10 bg-[#070707] py-2 px-1.5 gap-1 overflow-y-auto studio-scroll">
          {TOOL_TABS.map(({id, label, icon: Icon}) => {
            const active = activeTool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTool(id);
                  if (id !== 'chroma') setChromaEyedropperActive(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 min-h-[58px] rounded-xl px-1 text-[10px] font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="leading-tight text-center">{label}</span>
              </button>
            );
          })}
        </aside>

        {/* Center Preview Stage + Multi-Track Timeline */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <PreviewCanvas
              clips={project.clips}
              pipLayers={pipLayers}
              socialLayers={socialLayers}
              textLayers={project.textLayers}
              activeClipId={activeClip?.id ?? null}
              activePipId={activePipId}
              activeSocialId={activeSocialId}
              activeTextId={activeTextId}
              activeTool={activeTool}
              aspectRatio={project.aspectRatio}
              currentTime={currentTime}
              isPlaying={isPlaying}
              mediaMap={mediaMapRef.current}
              mediaVersion={mediaVersion}
              compareMode={compareMode}
              onToggleCompare={() => setCompareMode((c) => !c)}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onSeek={(t) => {
                setIsPlaying(false);
                const clamped = Math.max(0, Math.min(totalDuration, t));
                setCurrentTime(clamped);
                const slot = getClipAtTime(project.clips, clamped);
                if (slot) setActiveClipId(slot.clip.id);
              }}
              spotBrushMode={spotBrushMode}
              spotBrushSize={spotBrushSize}
              spotBrushFeather={spotBrushFeather}
              pendingSpotStrokes={pendingSpotStrokes}
              showSpotOverlay={showSpotOverlay}
              onAddSpotStroke={(st) => setPendingSpotStrokes((prev) => [...prev, st])}
              onDragTextPosition={(id, x, y) => handleUpdateText(id, {x, y})}
              onDragMaskPosition={(cid, x, y) => handleUpdateMask(cid, {x, y})}
              onAddMaskBrushStroke={handleAddMaskBrushStroke}
              onSelectPip={(pipId) => {
                // Non-disruptive canvas layer selection: select PIP without kicking user out of current panel
                setActivePipId(pipId);
                if (activeTool === 'chroma') setChromaTarget('pip');
              }}
              onUpdatePip={handleUpdatePip}
              onDeletePip={handleDeletePip}
              onSelectSocial={(socialId) => {
                // Non-disruptive canvas layer selection: select Social layer without jarring tab jump
                setActiveSocialId(socialId);
              }}
              onUpdateSocial={handleUpdateSocial}
              chromaEyedropperActive={chromaEyedropperActive && activeTool === 'chroma'}
              onPickChromaColor={handlePickChromaColor}
            />
          </div>

          {/* Multi-Track InShot-Style Fixed Center Playhead Timeline */}
          <div className="shrink-0">
            <Timeline
              clips={project.clips}
              pipLayers={pipLayers}
              socialLayers={socialLayers}
              textLayers={project.textLayers}
              audioNR={project.audioNR}
              aspectRatio={project.aspectRatio}
              activeClipId={activeClip?.id ?? null}
              activeClipMuted={Boolean(activeClip?.muted)}
              activePipId={activePipId}
              activeSocialId={activeSocialId}
              activeTextId={activeTextId}
              currentTime={currentTime}
              onSeek={(t) => {
                setIsPlaying(false);
                const clamped = Math.max(0, Math.min(totalDuration, t));
                setCurrentTime(clamped);
                const slot = getClipAtTime(project.clips, clamped);
                if (slot) setActiveClipId(slot.clip.id);
              }}
              onSelectClip={(id) => {
                setActiveClipId(id);
                setPendingSpotStrokes([]);
              }}
              onSelectPip={(pipId) => {
                setActivePipId(pipId);
                selectTool('pip');
              }}
              onSelectSocial={(socialId) => {
                setActiveSocialId(socialId);
                selectTool('social');
              }}
              onSelectTransition={(clipId) => {
                setActiveClipId(clipId);
                selectTool('transitions');
              }}
              onSelectText={(textId) => {
                setActiveTextId(textId);
                selectTool('text');
              }}
              onAddMediaClick={() => mediaInputRef.current?.click()}
              onAddPipClick={() => pipInputRef.current?.click()}
              onSplitClip={handleSplitClip}
              onFreezeFrame={handleFreezeFrame}
              onToggleMuteClip={handleToggleMuteClip}
              onDuplicateClip={handleDuplicateClip}
              onDeleteClip={handleDeleteClip}
              onChangeAspectRatio={(ar: AspectRatioId) =>
                mutateProject((p) => ({...p, aspectRatio: ar}))
              }
              onOpenAudioTool={() => selectTool('audio')}
            />
          </div>
        </main>

        {/* Desktop Right Inspector Deck */}
        <aside className="hidden lg:flex flex-col w-[348px] xl:w-[376px] shrink-0 border-l border-white/10 bg-[#090909] overflow-y-auto studio-scroll p-4">
          <ToolInspector
            activeTool={activeTool}
            clips={project.clips}
            activeClip={activeClip}
            filterPreviewThumb={filterPreviewThumb}
            activeClipLocalTime={activeClipTiming.localTime}
            activeClipStartTime={activeClipTiming.start}
            hasNextClip={activeClipTiming.hasNext}
            aspectRatio={project.aspectRatio}
            resolution={project.resolution}
            fps={project.fps}
            compareMode={compareMode}
            textLayers={project.textLayers}
            activeTextId={activeTextId}
            pipLayers={pipLayers}
            activePipId={activePipId}
            socialLayers={socialLayers}
            activeSocialId={activeSocialId}
            totalDuration={totalDuration}
            customFonts={customFonts}
            audioNR={project.audioNR}
            audioLibrary={audioLibrary}
            spotBrushMode={spotBrushMode}
            spotBrushSize={spotBrushSize}
            spotBrushFeather={spotBrushFeather}
            pendingSpotStrokes={pendingSpotStrokes}
            showSpotOverlay={showSpotOverlay}
            onChangeSpotBrushMode={setSpotBrushMode}
            onChangeSpotBrushSize={setSpotBrushSize}
            onChangeSpotBrushFeather={setSpotBrushFeather}
            onToggleSpotOverlay={() => setShowSpotOverlay((s) => !s)}
            onUndoSpotStroke={() => setPendingSpotStrokes((p) => p.slice(0, -1))}
            onClearPendingSpots={() => setPendingSpotStrokes([])}
            onApplySpotRemoval={handleApplySpotRemoval}
            onResetSpotImage={handleResetSpotImage}
            onExportSpotPng={handleExportSpotPng}
            onChangeAspectRatio={(ar: AspectRatioId) =>
              mutateProject((p) => ({...p, aspectRatio: ar}))
            }
            onChangeResolution={(res: ResolutionId) =>
              mutateProject((p) => ({...p, resolution: res}))
            }
            onChangeFps={(f: 30 | 60) => mutateProject((p) => ({...p, fps: f}))}
            onToggleCompare={() => setCompareMode((c) => !c)}
            onUpdateClip={handleUpdateClip}
            onUpdateAdjustments={handleUpdateAdjustments}
            onUpdateMask={handleUpdateMask}
            onPreviewTransition={handlePreviewTransition}
            onAddOrUpdateKeyframe={handleAddOrUpdateKeyframe}
            onDeleteKeyframeAtPlayhead={handleDeleteKeyframeAtPlayhead}
            onSeekGlobal={(t) => {
              setIsPlaying(false);
              setCurrentTime(Math.max(0, Math.min(totalDuration, t)));
            }}
            onSelectText={setActiveTextId}
            onAddText={handleAddText}
            onDeleteText={handleDeleteText}
            onUpdateText={handleUpdateText}
            onImportCustomFonts={handleImportCustomFonts}
            onDeleteCustomFont={handleDeleteCustomFont}
            onSelectPip={setActivePipId}
            onAddPipFiles={handleAddPipFiles}
            onAddPipFromClip={handleAddPipFromClip}
            onUpdatePip={handleUpdatePip}
            onDeletePip={handleDeletePip}
            onSelectSocial={setActiveSocialId}
            onAddSocialPreset={handleAddSocialPreset}
            onUpdateSocial={handleUpdateSocial}
            onDeleteSocial={handleDeleteSocial}
            chromaTarget={chromaTarget}
            onChangeChromaTarget={setChromaTarget}
            chromaEyedropperActive={chromaEyedropperActive}
            onToggleChromaEyedropper={() => setChromaEyedropperActive((v) => !v)}
            onUpdateClipChroma={handleUpdateClipChroma}
            onUpdatePipChroma={handleUpdatePipChroma}
            onApplyChromaToAllClips={handleApplyChromaToAllClips}
            onApplyAdjustmentsToAllClips={handleApplyAdjustmentsToAllClips}
            onApplyFilterToAllClips={handleApplyFilterToAllClips}
            onApplyEnhanceToAllClips={handleApplyEnhanceToAllClips}
            onUpdateAudioNR={(patch: Partial<AudioNRConfig>) => {
              const isDiscrete = 'humNotchHz' in patch || 'trackSrc' in patch;
              mutateProject(
                (p) => ({...p, audioNR: {...p.audioNR, ...patch}}),
                isDiscrete ? undefined : `audio-${Object.keys(patch).sort().join(',')}`,
              );
            }}
            onSaveAudioToLibrary={handleSaveAudioToLibrary}
            onRenameAudioInLibrary={handleRenameAudioInLibrary}
            onDeleteAudioFromLibrary={handleDeleteAudioFromLibrary}
          />
        </aside>
      </div>

      {/* MOBILE / TABLET SLIDE-UP TOOL INSPECTOR SHEET */}
      <div className="lg:hidden shrink-0">
        {mobileSheetOpen && (
          <div className="border-t border-white/15 bg-[#0b0b0b] max-h-[42vh] flex flex-col">
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="w-full h-8 flex items-center justify-center gap-1.5 border-b border-white/8 text-[11px] text-neutral-400 hover:text-white cursor-pointer shrink-0"
            >
              <ChevronDown className="w-4 h-4" />
              <span>Hide {TOOL_TABS.find((t) => t.id === activeTool)?.label}</span>
            </button>
            <div className="overflow-y-auto studio-scroll p-3.5">
              <ToolInspector
                activeTool={activeTool}
                clips={project.clips}
                activeClip={activeClip}
                filterPreviewThumb={filterPreviewThumb}
                activeClipLocalTime={activeClipTiming.localTime}
                activeClipStartTime={activeClipTiming.start}
                hasNextClip={activeClipTiming.hasNext}
                aspectRatio={project.aspectRatio}
                resolution={project.resolution}
                fps={project.fps}
                compareMode={compareMode}
                textLayers={project.textLayers}
                activeTextId={activeTextId}
                pipLayers={pipLayers}
                activePipId={activePipId}
                socialLayers={socialLayers}
                activeSocialId={activeSocialId}
                totalDuration={totalDuration}
                customFonts={customFonts}
                audioNR={project.audioNR}
                audioLibrary={audioLibrary}
                spotBrushMode={spotBrushMode}
                spotBrushSize={spotBrushSize}
                spotBrushFeather={spotBrushFeather}
                pendingSpotStrokes={pendingSpotStrokes}
                showSpotOverlay={showSpotOverlay}
                onChangeSpotBrushMode={setSpotBrushMode}
                onChangeSpotBrushSize={setSpotBrushSize}
                onChangeSpotBrushFeather={setSpotBrushFeather}
                onToggleSpotOverlay={() => setShowSpotOverlay((s) => !s)}
                onUndoSpotStroke={() => setPendingSpotStrokes((p) => p.slice(0, -1))}
                onClearPendingSpots={() => setPendingSpotStrokes([])}
                onApplySpotRemoval={handleApplySpotRemoval}
                onResetSpotImage={handleResetSpotImage}
                onExportSpotPng={handleExportSpotPng}
                onChangeAspectRatio={(ar: AspectRatioId) =>
                  mutateProject((p) => ({...p, aspectRatio: ar}))
                }
                onChangeResolution={(res: ResolutionId) =>
                  mutateProject((p) => ({...p, resolution: res}))
                }
                onChangeFps={(f: 30 | 60) => mutateProject((p) => ({...p, fps: f}))}
                onToggleCompare={() => setCompareMode((c) => !c)}
                onUpdateClip={handleUpdateClip}
                onUpdateAdjustments={handleUpdateAdjustments}
                onUpdateMask={handleUpdateMask}
                onPreviewTransition={handlePreviewTransition}
                onAddOrUpdateKeyframe={handleAddOrUpdateKeyframe}
                onDeleteKeyframeAtPlayhead={handleDeleteKeyframeAtPlayhead}
                onSeekGlobal={(t) => {
                  setIsPlaying(false);
                  setCurrentTime(Math.max(0, Math.min(totalDuration, t)));
                }}
                onSelectText={setActiveTextId}
                onAddText={handleAddText}
                onDeleteText={handleDeleteText}
                onUpdateText={handleUpdateText}
                onImportCustomFonts={handleImportCustomFonts}
                onDeleteCustomFont={handleDeleteCustomFont}
                onSelectPip={setActivePipId}
                onAddPipFiles={handleAddPipFiles}
                onAddPipFromClip={handleAddPipFromClip}
                onUpdatePip={handleUpdatePip}
                onDeletePip={handleDeletePip}
                onSelectSocial={setActiveSocialId}
                onAddSocialPreset={handleAddSocialPreset}
                onUpdateSocial={handleUpdateSocial}
                onDeleteSocial={handleDeleteSocial}
                chromaTarget={chromaTarget}
                onChangeChromaTarget={setChromaTarget}
                chromaEyedropperActive={chromaEyedropperActive}
                onToggleChromaEyedropper={() => setChromaEyedropperActive((v) => !v)}
                onUpdateClipChroma={handleUpdateClipChroma}
                onUpdatePipChroma={handleUpdatePipChroma}
                onApplyChromaToAllClips={handleApplyChromaToAllClips}
                onApplyAdjustmentsToAllClips={handleApplyAdjustmentsToAllClips}
                onApplyFilterToAllClips={handleApplyFilterToAllClips}
                onApplyEnhanceToAllClips={handleApplyEnhanceToAllClips}
                onUpdateAudioNR={(patch: Partial<AudioNRConfig>) => {
                  const isDiscrete = 'humNotchHz' in patch || 'trackSrc' in patch;
                  mutateProject(
                    (p) => ({...p, audioNR: {...p.audioNR, ...patch}}),
                    isDiscrete ? undefined : `audio-${Object.keys(patch).sort().join(',')}`,
                  );
                }}
                onSaveAudioToLibrary={handleSaveAudioToLibrary}
                onRenameAudioInLibrary={handleRenameAudioInLibrary}
                onDeleteAudioFromLibrary={handleDeleteAudioFromLibrary}
              />
            </div>
          </div>
        )}

        {/* Mobile Bottom Ergonomic Thumb-Zone Tool Bar */}
        <nav
          aria-label="Editor tools"
          className="border-t border-white/12 bg-[#060606] pb-safe flex items-center gap-1 overflow-x-auto studio-scroll px-2 py-1.5"
        >
          {!mobileSheetOpen && (
            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className="min-w-[44px] min-h-[48px] flex flex-col items-center justify-center rounded-xl bg-white/10 text-white shrink-0 px-2 cursor-pointer"
              aria-label="Open tool controls"
            >
              <ChevronUp className="w-4 h-4" />
              <span className="text-[10px]">Open</span>
            </button>
          )}
          {TOOL_TABS.map(({id, label, icon: Icon}) => {
            const active = activeTool === id && mobileSheetOpen;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (activeTool === id && mobileSheetOpen) {
                    setMobileSheetOpen(false);
                  } else {
                    selectTool(id);
                  }
                }}
                className={`min-w-[66px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-medium shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-black font-semibold'
                    : activeTool === id
                      ? 'bg-white/12 text-white'
                      : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Drag-and-Drop Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-none">
          <div className="rounded-2xl border-2 border-dashed border-white/60 px-10 py-8 text-center space-y-2">
            <Wand2 className="w-8 h-8 text-white mx-auto" />
            <p className="text-base font-semibold text-white">
              Drop Photos, Videos, Audio, or .KMZ Project
            </p>
            <p className="text-xs text-neutral-400">
              Processed 100% locally offline at crisp 4K clarity
            </p>
          </div>
        </div>
      )}

      {/* Subtle Action Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold shadow-2xl border border-black/15 pointer-events-none">
          {toast}
        </div>
      )}

      {/* Export 4K / 1080p / PNG / Video / .KMZ Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        project={project}
        currentTime={currentTime}
        mediaMap={mediaMapRef.current}
        onChangeResolution={(res: ResolutionId) => mutateProject((p) => ({...p, resolution: res}))}
        onChangeFps={(f: 30 | 60) => mutateProject((p) => ({...p, fps: f}))}
        onSaveKmz={handleSaveKmz}
        onLoadKmzFile={handleLoadKmzFile}
      />

      {/* Timeline Synced Audio Track Element */}
      <audio ref={timelineAudioRef} className="hidden" />

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
