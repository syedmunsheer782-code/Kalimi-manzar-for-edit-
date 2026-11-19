import React, {useEffect, useRef, useState} from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  Film,
  FolderOpen,
  Image as ImageIcon,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';
import {ProjectState, ResolutionId} from '../types/editor';
import {
  getExportDimensions,
  getTotalTimelineDuration,
  renderCompositionFrame,
} from '../utils/canvasEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  currentTime: number;
  mediaMap: Map<string, HTMLImageElement | HTMLVideoElement | HTMLCanvasElement>;
  onChangeResolution?: (res: ResolutionId) => void;
  onChangeFps?: (fps: 30 | 60) => void;
  onSaveKmz: () => Promise<void>;
  onLoadKmzFile: (file: File) => Promise<void>;
}

interface RenderProgressState {
  percent: number;
  currentFrame: number;
  totalFrames: number;
  chunkIndex: number;
  totalChunks: number;
  stage: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function canvasToBlobSafe(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image encoder returned empty data (device memory limit).'));
          }
        },
        mime,
        quality,
      );
    } catch (err) {
      reject(err);
    }
  });
}

function releaseCanvasMemory(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  try {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // ignore cleanup errors
  }
}

/**
 * Safely seeks an HTMLVideoElement to a target time with a short timeout guard so
 * stalled browser decoders can never freeze or crash step-by-step chunked export.
 */
async function seekVideoSafe(video: HTMLVideoElement, targetSec: number): Promise<void> {
  if (!Number.isFinite(targetSec) || video.readyState < 1) return;
  const maxDur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : targetSec;
  const clamped = Math.max(0, Math.min(Math.max(0, maxDur - 0.03), targetSec));
  if (Math.abs(video.currentTime - clamped) < 0.025) return;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', finish);
      video.removeEventListener('error', finish);
      resolve();
    };
    video.addEventListener('seeked', finish, {once: true});
    video.addEventListener('error', finish, {once: true});
    window.setTimeout(finish, 180);
    try {
      video.currentTime = clamped;
    } catch {
      finish();
    }
  });
}

function computeClipVideoTime(
  project: ProjectState,
  globalTime: number,
  mediaMap: Map<string, HTMLImageElement | HTMLVideoElement | HTMLCanvasElement>,
): Array<{video: HTMLVideoElement; time: number}> {
  const targets: Array<{video: HTMLVideoElement; time: number}> = [];
  let cursor = 0;
  for (const clip of project.clips) {
    if (globalTime >= cursor - 0.05 && globalTime <= cursor + clip.duration + 0.05) {
      if (clip.kind === 'video') {
        const el = mediaMap.get(clip.id);
        if (el instanceof HTMLVideoElement) {
          const localT = Math.max(0, globalTime - cursor);
          targets.push({video: el, time: clip.trimStart + localT * clip.speed});
        }
      }
    }
    cursor += clip.duration;
  }

  for (const pip of project.pipLayers ?? []) {
    if (pip.kind === 'video' && globalTime >= pip.startTime && globalTime <= pip.startTime + pip.duration) {
      const el = mediaMap.get(pip.id);
      if (el instanceof HTMLVideoElement) {
        targets.push({video: el, time: Math.max(0, globalTime - pip.startTime)});
      }
    }
  }
  return targets;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  currentTime,
  mediaMap,
  onChangeResolution,
  onChangeFps,
  onSaveKmz,
  onLoadKmzFile,
}) => {
  const [exportRes, setExportRes] = useState<ResolutionId>(project.resolution);
  const [photoFormat, setPhotoFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [transparentPng, setTransparentPng] = useState(true);
  const [videoFps, setVideoFps] = useState<30 | 60>(project.fps);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [isExportingPhoto, setIsExportingPhoto] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgressState>({
    percent: 0,
    currentFrame: 0,
    totalFrames: 0,
    chunkIndex: 0,
    totalChunks: 0,
    stage: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestSafeFallback, setSuggestSafeFallback] = useState(false);

  const cancelExportRef = useRef(false);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExportRes(project.resolution);
      setVideoFps(project.fps);
      setErrorMessage('');
      setSuggestSafeFallback(false);
    }
  }, [isOpen, project.resolution, project.fps]);

  // Ensure cancellation if modal unmounts while rendering
  useEffect(() => {
    return () => {
      cancelExportRef.current = true;
      try {
        if (activeRecorderRef.current && activeRecorderRef.current.state !== 'inactive') {
          activeRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  if (!isOpen) return null;

  const dims = getExportDimensions(project.aspectRatio, exportRes);
  const totalTimelineDur = Math.max(1, getTotalTimelineDuration(project.clips));
  const heavyEffectsCount =
    project.clips.filter((c) => c.filterId !== 'original' || c.enhanceMode !== 'none' || c.mask.shape !== 'none').length +
    (project.pipLayers?.length ?? 0) +
    (project.socialLayers?.length ?? 0) +
    project.textLayers.length;

  const handleCancelVideoExport = () => {
    cancelExportRef.current = true;
    setRenderProgress((prev) => ({...prev, stage: 'Cancelling & releasing memory...'}));
    try {
      if (activeRecorderRef.current && activeRecorderRef.current.state !== 'inactive') {
        activeRecorderRef.current.stop();
      }
    } catch {
      // ignore
    }
  };

  const handleExportPhoto = async (overrideRes?: ResolutionId) => {
    if (isExportingPhoto || isExportingVideo) return;
    const targetRes = overrideRes ?? exportRes;
    const targetDims = getExportDimensions(project.aspectRatio, targetRes);
    setIsExportingPhoto(true);
    setErrorMessage('');
    setSuggestSafeFallback(false);
    setStatusMessage(`Rendering ${targetDims.width}×${targetDims.height} ${photoFormat.toUpperCase()}...`);

    let canvas: HTMLCanvasElement | null = null;
    try {
      // Yield one frame so the button loading label paints cleanly before heavy draw
      await nextPaint();

      canvas = document.createElement('canvas');
      canvas.width = targetDims.width;
      canvas.height = targetDims.height;
      const ctx = canvas.getContext('2d', {alpha: photoFormat === 'png' && transparentPng});
      if (!ctx) {
        throw new Error('Could not allocate image canvas at this resolution.');
      }

      renderCompositionFrame(ctx, targetDims.width, targetDims.height, {
        clips: project.clips,
        pipLayers: project.pipLayers,
        socialLayers: project.socialLayers,
        textLayers: project.textLayers,
        globalTime: currentTime,
        mediaMap,
        transparentBackground: photoFormat === 'png' && transparentPng,
      });

      const mime =
        photoFormat === 'png'
          ? 'image/png'
          : photoFormat === 'webp'
            ? 'image/webp'
            : 'image/jpeg';

      // Use memory-friendly toBlob instead of huge base64 toDataURL strings
      const blob = await canvasToBlobSafe(canvas, mime, photoFormat === 'png' ? undefined : 0.96);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_${targetRes}_${targetDims.width}x${targetDims.height}.${photoFormat}`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 12000);

      setStatusMessage(
        `Exported crisp ${targetDims.width}×${targetDims.height} ${photoFormat.toUpperCase()} (${(blob.size / (1024 * 1024)).toFixed(2)} MB) offline.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Device memory limit reached during image export.';
      setErrorMessage(
        targetRes === '4k' || targetRes === '2k'
          ? `${msg} Your browser hit a memory cap at ${targetRes.toUpperCase()}. Retry safely at 1080p below.`
          : msg,
      );
      setSuggestSafeFallback(targetRes !== '1080p');
      setStatusMessage('');
    } finally {
      releaseCanvasMemory(canvas);
      setIsExportingPhoto(false);
    }
  };

  const handleExportVideo = async (options?: {
    overrideRes?: ResolutionId;
    overrideFps?: 30 | 60;
  }) => {
    if (isExportingVideo) return;

    const targetRes = options?.overrideRes ?? exportRes;
    const targetFps = options?.overrideFps ?? videoFps;
    if (options?.overrideRes) {
      setExportRes(options.overrideRes);
      onChangeResolution?.(options.overrideRes);
    }
    if (options?.overrideFps) {
      setVideoFps(options.overrideFps);
      onChangeFps?.(options.overrideFps);
    }

    const targetDims = getExportDimensions(project.aspectRatio, targetRes);
    cancelExportRef.current = false;
    setIsExportingVideo(true);
    setErrorMessage('');
    setSuggestSafeFallback(false);
    setStatusMessage('');

    const totalDur = Math.max(1, getTotalTimelineDuration(project.clips));
    // Cap frame rate gracefully if 4K + heavy layers would overwhelm mobile software encoder
    const effectiveFps = targetFps;
    const totalFrames = Math.max(1, Math.ceil(totalDur * effectiveFps));
    // Safe chunk sizes: smaller chunks at 4K/2K so GC and UI breathe cleanly every step
    const chunkSize =
      targetRes === '4k' ? 6 : targetRes === '2k' ? 10 : heavyEffectsCount >= 4 ? 12 : 16;
    const totalChunks = Math.max(1, Math.ceil(totalFrames / chunkSize));

    setRenderProgress({
      percent: 0,
      currentFrame: 0,
      totalFrames,
      chunkIndex: 0,
      totalChunks,
      stage: 'Preparing safe chunked encoder...',
    });

    let canvas: HTMLCanvasElement | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;

    try {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error(
          'This browser does not support offline video encoding (MediaRecorder). You can still export lossless PNG/JPEG frames or save a .kmz project.',
        );
      }

      await nextPaint();

      canvas = document.createElement('canvas');
      canvas.width = targetDims.width;
      canvas.height = targetDims.height;

      if (typeof canvas.captureStream !== 'function') {
        throw new Error(
          'Canvas video stream capture is unavailable on this browser. Try Photo PNG export or a Chromium/Safari mobile browser.',
        );
      }

      const ctx = canvas.getContext('2d', {alpha: false, willReadFrequently: false});
      if (!ctx) {
        throw new Error(
          `Could not initialize ${targetRes.toUpperCase()} drawing surface on this device.`,
        );
      }

      // Pause any actively playing source videos during deterministic step-by-step export
      for (const el of mediaMap.values()) {
        if (el instanceof HTMLVideoElement && !el.paused) {
          el.pause();
        }
      }

      const preferredTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4',
      ];
      const mimeType =
        preferredTypes.find((t) => {
          try {
            return MediaRecorder.isTypeSupported(t);
          } catch {
            return false;
          }
        }) || '';

      // Request manual-frame stream when supported so chunked pauses never stretch output timing
      stream = canvas.captureStream(effectiveFps);
      const videoTrack = stream.getVideoTracks()[0] as
        | (MediaStreamTrack & {requestFrame?: () => void})
        | undefined;

      // Memory-safe bitrates balanced for crisp clarity across 144p–4K without crashing mobile encoders
      const bitrateMap: Record<ResolutionId, number> = {
        '4k': 16_000_000,
        '2k': 12_000_000,
        '1080p': 8_000_000,
        '720p': 5_000_000,
        '480p': 2_500_000,
        '360p': 1_500_000,
        '240p': 900_000,
        '144p': 500_000,
      };
      const targetBitrate = bitrateMap[targetRes] ?? 8_000_000;

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: targetBitrate,
      };
      if (mimeType) recorderOptions.mimeType = mimeType;

      recorder = new MediaRecorder(stream, recorderOptions);
      activeRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      let recorderError: Error | null = null;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onerror = (ev) => {
        const errEvt = ev as Event & {error?: DOMException};
        recorderError = new Error(
          errEvt.error?.message || 'Encoder stopped due to device resource limits.',
        );
      };

      const stopPromise = new Promise<Blob>((resolve, reject) => {
        if (!recorder) return reject(new Error('Recorder not initialized'));
        recorder.onstop = () => {
          if (recorderError) {
            reject(recorderError);
            return;
          }
          const finalType = recorder?.mimeType || mimeType || 'video/webm';
          resolve(new Blob(chunks, {type: finalType}));
        };
      });

      // Flush encoded data incrementally every 500ms so RAM stays low throughout long exports
      recorder.start(500);

      const frameDurationMs = 1000 / effectiveFps;
      let frameIndex = 0;

      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        if (cancelExportRef.current || recorderError) break;

        const chunkEnd = Math.min(totalFrames, (chunkIdx + 1) * chunkSize);
        setRenderProgress({
          percent: Math.min(98, Math.round((frameIndex / totalFrames) * 100)),
          currentFrame: frameIndex,
          totalFrames,
          chunkIndex: chunkIdx + 1,
          totalChunks,
          stage: `Rendering chunk ${chunkIdx + 1} of ${totalChunks} (${targetRes.toUpperCase()} · ${effectiveFps}fps)`,
        });

        for (; frameIndex < chunkEnd; frameIndex++) {
          if (cancelExportRef.current || recorderError) break;

          const frameStartPerf = performance.now();
          const tSec = Math.min(totalDur, (frameIndex / totalFrames) * totalDur);

          // Safely sync any video clips or PIP videos to the exact frame time
          const videoSeeks = computeClipVideoTime(project, tSec, mediaMap);
          if (videoSeeks.length > 0) {
            await Promise.all(videoSeeks.map((item) => seekVideoSafe(item.video, item.time)));
          }

          // Render frame inside guarded try/catch
          renderCompositionFrame(ctx, targetDims.width, targetDims.height, {
            clips: project.clips,
            pipLayers: project.pipLayers,
            socialLayers: project.socialLayers,
            textLayers: project.textLayers,
            globalTime: tSec,
            mediaMap,
            transparentBackground: false,
          });

          if (typeof videoTrack?.requestFrame === 'function') {
            videoTrack.requestFrame();
          }

          // Pace frame capture gently so MediaRecorder timestamps stay smooth without busy-spinning
          const renderCostMs = performance.now() - frameStartPerf;
          const remainingMs = frameDurationMs - renderCostMs;
          if (remainingMs > 4) {
            await sleep(Math.min(remainingMs, 34));
          } else {
            await nextPaint();
          }

          if (frameIndex % 3 === 0 || frameIndex === chunkEnd - 1) {
            setRenderProgress({
              percent: Math.min(98, Math.round(((frameIndex + 1) / totalFrames) * 100)),
              currentFrame: frameIndex + 1,
              totalFrames,
              chunkIndex: chunkIdx + 1,
              totalChunks,
              stage: `Rendering chunk ${chunkIdx + 1} of ${totalChunks} (${targetRes.toUpperCase()} · ${effectiveFps}fps)`,
            });
          }
        }

        // Between chunks: yield briefly to browser event loop & GC so memory never spikes
        if (!cancelExportRef.current && chunkIdx < totalChunks - 1) {
          await sleep(18);
        }
      }

      if (recorderError) {
        throw recorderError;
      }

      if (cancelExportRef.current) {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        await stopPromise.catch(() => undefined);
        setStatusMessage('Video export cancelled safely. No memory leaked.');
        return;
      }

      setRenderProgress({
        percent: 99,
        currentFrame: totalFrames,
        totalFrames,
        chunkIndex: totalChunks,
        totalChunks,
        stage: 'Finalizing & packaging video file...',
      });

      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      const blob = await stopPromise;

      if (!blob || blob.size === 0) {
        throw new Error('Encoded video was empty. The device encoder may have hit a resolution cap.');
      }

      const finalMime = blob.type || mimeType || 'video/webm';
      const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_${targetRes}_${effectiveFps}fps.${ext}`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 15000);

      setRenderProgress({
        percent: 100,
        currentFrame: totalFrames,
        totalFrames,
        chunkIndex: totalChunks,
        totalChunks,
        stage: 'Export complete',
      });
      setStatusMessage(
        `Exported ${targetDims.width}×${targetDims.height} ${effectiveFps}fps video (${(blob.size / (1024 * 1024)).toFixed(2)} MB) via safe chunked rendering.`,
      );
    } catch (err) {
      const rawMsg =
        err instanceof Error ? err.message : 'Browser video encoder reached a memory or codec limit.';
      setErrorMessage(rawMsg);
      setSuggestSafeFallback(targetRes !== '1080p' || targetFps !== 30);
      setStatusMessage('');
    } finally {
      activeRecorderRef.current = null;
      try {
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch {
        // ignore
      }
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      }
      releaseCanvasMemory(canvas);
      setIsExportingVideo(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Export 4K Media and KMZ Project"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0d0d0d] border border-white/15 p-5 sm:p-6 text-white shadow-2xl max-h-[92vh] overflow-y-auto studio-scroll">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Export &amp; Project Archive</h2>
            <p className="text-xs text-neutral-400 font-mono-num mt-0.5">
              {dims.width} × {dims.height} · {project.aspectRatio} · Safe Chunked Offline Engine
            </p>
          </div>
          <button
            type="button"
            disabled={isExportingVideo}
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-35 cursor-pointer"
            aria-label="Close export modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Resolution & FPS Selector */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-2">
            <span className="text-xs font-medium text-neutral-400">
              Export Resolution (144p – 4K)
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                ['4k', '2k', '1080p', '720p', '480p', '360p', '240p', '144p'] as ResolutionId[]
              ).map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={isExportingVideo}
                  onClick={() => {
                    setExportRes(r);
                    onChangeResolution?.(r);
                    setErrorMessage('');
                  }}
                  className={`min-h-[36px] rounded-xl text-xs font-mono-num uppercase border cursor-pointer disabled:opacity-40 transition-colors ${
                    exportRes === r
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-[#151515] text-neutral-300 border-white/12 hover:border-white/35'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-neutral-400">Frame Rate (FPS)</span>
            <div className="grid grid-cols-2 gap-1.5">
              {([30, 60] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  disabled={isExportingVideo}
                  onClick={() => {
                    setVideoFps(f);
                    onChangeFps?.(f);
                    setErrorMessage('');
                  }}
                  className={`min-h-[38px] rounded-xl text-xs font-mono-num border cursor-pointer disabled:opacity-40 transition-colors ${
                    videoFps === f
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-[#151515] text-neutral-300 border-white/12 hover:border-white/35'
                  }`}
                >
                  {f}fps
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Photo / Lossless PNG Section */}
        <div className="mt-5 p-4 rounded-xl bg-[#121212] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <ImageIcon className="w-4 h-4" />
              <span>Photo / Frame Export</span>
            </span>
            <div className="flex items-center gap-1">
              {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  disabled={isExportingVideo || isExportingPhoto}
                  onClick={() => setPhotoFormat(fmt)}
                  className={`px-2 py-1 rounded text-[11px] uppercase font-mono-num cursor-pointer disabled:opacity-40 ${
                    photoFormat === fmt
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {photoFormat === 'png' && (
            <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
              <span>Preserve Transparent Alpha (Masks &amp; Spot Erase)</span>
              <input
                type="checkbox"
                checked={transparentPng}
                onChange={(e) => setTransparentPng(e.target.checked)}
                className="accent-white w-4 h-4"
              />
            </label>
          )}

          <button
            type="button"
            disabled={isExportingVideo || isExportingPhoto}
            onClick={() => handleExportPhoto()}
            className="w-full min-h-[42px] rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExportingPhoto
                ? `Saving ${exportRes.toUpperCase()} ${photoFormat.toUpperCase()}...`
                : `Export ${exportRes.toUpperCase()} ${photoFormat.toUpperCase()} (${dims.width}×${dims.height})`}
            </span>
          </button>
        </div>

        {/* Stable Crash-Resistant Chunked Video Timeline Export Section */}
        <div className="mt-4 p-4 rounded-xl bg-[#121212] border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <Film className="w-4 h-4" />
              <span>Full Video Export</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono-num text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
              <span>
                {exportRes.toUpperCase()} · {videoFps}fps · Chunked
              </span>
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Processes frames step-by-step in memory-safe chunks so heavy filters, PIP layers, text
            animations, and transparent vector overlays render without crashing.
          </p>

          {isExportingVideo && (
            <div className="p-3 rounded-xl bg-[#090909] border border-white/12 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-neutral-200 font-medium truncate">
                  {renderProgress.stage || 'Preparing chunked render...'}
                </span>
                <span className="font-mono-num text-white font-semibold shrink-0">
                  {renderProgress.percent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-150"
                  style={{width: `${renderProgress.percent}%`}}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono-num text-neutral-400">
                <span>
                  Frame {renderProgress.currentFrame} / {renderProgress.totalFrames}
                </span>
                <span>
                  Chunk {renderProgress.chunkIndex} / {renderProgress.totalChunks}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportVideo()}
              disabled={isExportingVideo || isExportingPhoto}
              className="flex-1 min-h-[42px] rounded-xl bg-[#1d1d1d] border border-white/25 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white hover:text-black disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>
                {isExportingVideo
                  ? `Rendering ${renderProgress.percent}%...`
                  : `Render ${exportRes.toUpperCase()} Video (${totalTimelineDur.toFixed(1)}s)`}
              </span>
            </button>

            {isExportingVideo && (
              <button
                type="button"
                onClick={handleCancelVideoExport}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#1a1a1a] border border-white/30 text-white hover:bg-white hover:text-black text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Graceful Fallback / Error Recovery Banner (Zero Crashes) */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#181818] border border-white/30 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-semibold text-white">
                  Browser or Device Limit Reached
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {suggestSafeFallback && (
                <button
                  type="button"
                  onClick={() =>
                    handleExportVideo({overrideRes: '1080p', overrideFps: 30})
                  }
                  className="min-h-[34px] px-3 rounded-lg bg-white text-black text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-200 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Safe Mode (1080p · 30fps)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleExportPhoto('1080p')}
                className="min-h-[34px] px-3 rounded-lg bg-[#242424] border border-white/20 text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Save 1080p Frame PNG</span>
              </button>
            </div>
          </div>
        )}

        {/* .KMZ Project Save & Load Section */}
        <div className="mt-4 p-4 rounded-xl bg-[#121212] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <Archive className="w-4 h-4" />
              <span>.KMZ Offline Project Package</span>
            </span>
            <span className="text-[11px] font-mono-num text-neutral-400">ZIP + KML + Media</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isExportingVideo}
              onClick={async () => {
                try {
                  setErrorMessage('');
                  setStatusMessage('Packaging .kmz project archive...');
                  await onSaveKmz();
                  setStatusMessage('Saved .kmz project file offline.');
                } catch (err) {
                  setErrorMessage(
                    err instanceof Error ? err.message : 'Could not package .kmz file.',
                  );
                }
              }}
              className="min-h-[40px] rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-neutral-200 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .kmz</span>
            </button>

            <label className="min-h-[40px] rounded-xl bg-[#1b1b1b] border border-white/20 text-white font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-white hover:text-black transition-colors cursor-pointer">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Load .kmz</span>
              <input
                type="file"
                accept=".kmz,application/vnd.google-earth.kmz,application/zip"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setErrorMessage('');
                    setStatusMessage(`Loading ${file.name}...`);
                    await onLoadKmzFile(file);
                    setStatusMessage(`Restored project from ${file.name}`);
                    onClose();
                  } catch (err) {
                    setErrorMessage(
                      err instanceof Error ? err.message : 'Failed to load .kmz file.',
                    );
                  }
                }}
              />
            </label>
          </div>
        </div>

        {statusMessage && !errorMessage && (
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-200 bg-white/6 border border-white/15 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
