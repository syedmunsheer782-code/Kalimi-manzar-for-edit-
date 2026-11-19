import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Columns2, Pause, Pipette, Play, SkipBack, SkipForward, X} from 'lucide-react';
import {
  AspectRatioId,
  EditorToolTab,
  MediaClip,
  PipLayer,
  SocialAnimationLayer,
  SpotStroke,
  SpotStrokePoint,
  TextLayer,
} from '../types/editor';
import {
  getClipAtTime,
  getExportDimensions,
  getPipLayerDimensions,
  getTotalTimelineDuration,
  renderCompositionFrame,
} from '../utils/canvasEngine';
import {sampleCanvasPixelHex} from '../utils/chromaKey';
import {getSocialLayerBox} from '../utils/socialVectorRenderer';
import {SocialVectorGraphic} from './SocialVectorGraphic';

interface PreviewCanvasProps {
  clips: MediaClip[];
  pipLayers: PipLayer[];
  socialLayers: SocialAnimationLayer[];
  textLayers: TextLayer[];
  activeClipId: string | null;
  activePipId: string | null;
  activeSocialId: string | null;
  activeTextId: string | null;
  activeTool: EditorToolTab;
  aspectRatio: AspectRatioId;
  currentTime: number;
  isPlaying: boolean;
  mediaMap: Map<string, HTMLImageElement | HTMLVideoElement | HTMLCanvasElement>;
  mediaVersion: number;
  compareMode: boolean;
  onToggleCompare: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  // Spot removal interactive state
  spotBrushMode: 'heal' | 'erase';
  spotBrushSize: number; // 0.008..0.12
  spotBrushFeather: number; // 0..1
  pendingSpotStrokes: SpotStroke[];
  showSpotOverlay: boolean;
  onAddSpotStroke: (stroke: SpotStroke) => void;
  // Direct canvas drag for text / mask / PIP / Social vector overlays
  onDragTextPosition: (id: string, x: number, y: number) => void;
  onDragMaskPosition: (clipId: string, x: number, y: number) => void;
  onAddMaskBrushStroke?: (clipId: string, stroke: SpotStroke) => void;
  onSelectPip: (id: string) => void;
  onUpdatePip: (id: string, patch: Partial<PipLayer>) => void;
  onDeletePip?: (id: string) => void;
  onSelectSocial: (id: string) => void;
  onUpdateSocial: (id: string, patch: Partial<SocialAnimationLayer>) => void;
  // Chroma Key canvas eyedropper
  chromaEyedropperActive?: boolean;
  onPickChromaColor?: (hex: string) => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  clips,
  pipLayers,
  socialLayers,
  textLayers,
  activeClipId,
  activePipId,
  activeSocialId,
  activeTextId,
  activeTool,
  aspectRatio,
  currentTime,
  isPlaying,
  mediaMap,
  mediaVersion,
  compareMode,
  onToggleCompare,
  onTogglePlay,
  onSeek,
  spotBrushMode,
  spotBrushSize,
  spotBrushFeather,
  pendingSpotStrokes,
  showSpotOverlay,
  onAddSpotStroke,
  onDragTextPosition,
  onDragMaskPosition,
  onAddMaskBrushStroke,
  onSelectPip,
  onUpdatePip,
  onDeletePip,
  onSelectSocial,
  onUpdateSocial,
  chromaEyedropperActive = false,
  onPickChromaColor,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawSampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [compareSplit, setCompareSplit] = useState(50);
  const [draggingCompare, setDraggingCompare] = useState(false);
  const [draftPoints, setDraftPoints] = useState<SpotStrokePoint[] | null>(null);
  const [draftMaskPoints, setDraftMaskPoints] = useState<SpotStrokePoint[] | null>(null);
  const [cursorPos, setCursorPos] = useState<{x: number; y: number} | null>(null);
  const [eyedropperHover, setEyedropperHover] = useState<{
    x: number;
    y: number;
    hex: string;
  } | null>(null);
  const draggingLayerRef = useRef<'text' | 'mask' | null>(null);

  // Interactive PIP & Social vector overlay drag / corner resize / multi-touch pinch refs
  const overlayPointersRef = useRef<Map<number, {x: number; y: number}>>(new Map());
  const overlayGestureRef = useRef<{
    kind: 'pip' | 'social';
    mode: 'move' | 'resize' | 'pinch';
    layerId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startScale: number;
    startDist: number;
    centerPxX: number;
    centerPxY: number;
  } | null>(null);

  // Measure actual CSS stage size for exact device-pixel-ratio (DPR) sharp canvas scaling
  const [stageCssSize, setStageCssSize] = useState<{w: number; h: number}>({w: 960, h: 540});
  useEffect(() => {
    const box = canvasBoxRef.current;
    if (!box) return;
    const syncSize = () => {
      const rect = box.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        setStageCssSize({w: Math.round(rect.width), h: Math.round(rect.height)});
      }
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(box);
    return () => ro.disconnect();
  }, [aspectRatio]);

  const dims = getExportDimensions(aspectRatio, '1080p');
  const totalDuration = getTotalTimelineDuration(clips);
  const activeClip = clips.find((c) => c.id === activeClipId) ?? clips[0] ?? null;

  const visiblePips = pipLayers.filter(
    (p) => currentTime >= p.startTime && currentTime <= p.startTime + p.duration,
  );
  const activeVisiblePip =
    visiblePips.find((p) => p.id === activePipId) ??
    (activeTool === 'pip' ? visiblePips[visiblePips.length - 1] ?? null : null);

  const visibleSocials = socialLayers.filter(
    (s) => currentTime >= s.startTime && currentTime <= s.startTime + s.duration,
  );
  const activeVisibleSocial =
    visibleSocials.find((s) => s.id === activeSocialId) ??
    (activeTool === 'social' ? visibleSocials[visibleSocials.length - 1] ?? null : null);

  const showAlphaGrid =
    Boolean(activeClip?.mask.shape !== 'none') ||
    Boolean(activeClip?.chromaKey?.enabled && activeClip.chromaKey.strength > 0) ||
    Boolean(activeClip?.spotStrokes.some((s) => s.mode === 'erase')) ||
    (activeTool === 'spot' && spotBrushMode === 'erase');

  const isBrushMaskMode = activeTool === 'mask' && activeClip?.mask.shape === 'brush';
  const maskBrushNormSize = Math.max(0.01, ((activeClip?.mask.brushSize ?? 28) / 100) * 0.14);

  // Keep a lightweight un-keyed snapshot canvas while Eyedropper is active so users can
  // pick or refine ANY plain background color even if Chroma Key is already cutting it out
  useEffect(() => {
    if (!chromaEyedropperActive) {
      setEyedropperHover(null);
      return;
    }
    const sampleW = 480;
    const sampleH = Math.max(2, Math.round((dims.height / Math.max(1, dims.width)) * sampleW));
    if (!rawSampleCanvasRef.current) {
      rawSampleCanvasRef.current = document.createElement('canvas');
    }
    const sc = rawSampleCanvasRef.current;
    sc.width = sampleW;
    sc.height = sampleH;
    const sCtx = sc.getContext('2d', {willReadFrequently: true});
    if (!sCtx) return;

    renderCompositionFrame(sCtx, sampleW, sampleH, {
      clips: clips.map((c) => (c.chromaKey ? {...c, chromaKey: undefined} : c)),
      pipLayers: pipLayers.map((p) => (p.chromaKey ? {...p, chromaKey: undefined} : p)),
      socialLayers: [],
      skipSocialOnCanvas: true,
      textLayers: [],
      globalTime: currentTime,
      mediaMap,
      transparentBackground: false,
    });
  }, [chromaEyedropperActive, clips, pipLayers, currentTime, mediaMap, mediaVersion, dims.width, dims.height]);

  const sampleColorAtNormalized = useCallback((nx: number, ny: number): string | null => {
    const raw = rawSampleCanvasRef.current;
    if (raw && raw.width > 2 && raw.height > 2) {
      const hex = sampleCanvasPixelHex(raw, nx, ny);
      if (hex) return hex;
    }
    if (canvasRef.current) {
      return sampleCanvasPixelHex(canvasRef.current, nx, ny);
    }
    return null;
  }, []);

  // Render crisp High-DPI frame matched cleanly to devicePixelRatio whenever state or playhead updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetLong = Math.min(
      2560,
      Math.max(1280, Math.round(Math.max(stageCssSize.w, stageCssSize.h) * dpr)),
    );
    const ratio = targetLong / Math.max(dims.width, dims.height);
    const renderW = Math.max(2, Math.round(dims.width * ratio));
    const renderH = Math.max(2, Math.round(dims.height * ratio));

    if (canvas.width !== renderW || canvas.height !== renderH) {
      canvas.width = renderW;
      canvas.height = renderH;
    }

    renderCompositionFrame(ctx, renderW, renderH, {
      clips,
      pipLayers,
      socialLayers,
      // Native inline <svg> renders Social Animations at infinite vector sharpness in live preview
      skipSocialOnCanvas: true,
      textLayers,
      globalTime: currentTime,
      mediaMap,
      compareSplit: compareMode ? compareSplit : null,
      transparentBackground: showAlphaGrid,
    });

    // Draw Spot-Remove interactive stroke overlays if in spot tool
    if (activeTool === 'spot' && showSpotOverlay) {
      const slot = getClipAtTime(clips, currentTime);
      const allStrokes: SpotStroke[] = [...pendingSpotStrokes];
      if (draftPoints && draftPoints.length > 0) {
        allStrokes.push({
          id: 'draft',
          mode: spotBrushMode,
          size: spotBrushSize,
          feather: spotBrushFeather,
          points: draftPoints,
        });
      }

      if (slot && allStrokes.length > 0) {
        const mediaEl = mediaMap.get(slot.clip.id);
        const srcW =
          mediaEl instanceof HTMLVideoElement
            ? mediaEl.videoWidth || slot.clip.width
            : mediaEl instanceof HTMLImageElement
              ? mediaEl.naturalWidth || slot.clip.width
              : slot.clip.width;
        const srcH =
          mediaEl instanceof HTMLVideoElement
            ? mediaEl.videoHeight || slot.clip.height
            : mediaEl instanceof HTMLImageElement
              ? mediaEl.naturalHeight || slot.clip.height
              : slot.clip.height;
        const scaleFit = Math.min(renderW / srcW, renderH / srcH);
        const drawW = srcW * scaleFit;
        const drawH = srcH * scaleFit;
        const ox = (renderW - drawW) / 2;
        const oy = (renderH - drawH) / 2;
        const minDim = Math.min(drawW, drawH);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const st of allStrokes) {
          const r = Math.max(3, st.size * minDim);
          ctx.strokeStyle =
            st.mode === 'heal' ? 'rgba(255, 59, 48, 0.58)' : 'rgba(255, 255, 255, 0.65)';
          ctx.fillStyle = ctx.strokeStyle;
          ctx.lineWidth = r * 2;
          if (st.points.length === 1) {
            ctx.beginPath();
            ctx.arc(ox + st.points[0].x * drawW, oy + st.points[0].y * drawH, r, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(ox + st.points[0].x * drawW, oy + st.points[0].y * drawH);
            for (let i = 1; i < st.points.length; i++) {
              ctx.lineTo(ox + st.points[i].x * drawW, oy + st.points[i].y * drawH);
            }
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
    // Draw live draft Brush Mask stroke preview while painting
    if (isBrushMaskMode && draftMaskPoints && draftMaskPoints.length > 0) {
      const minDim = Math.min(renderW, renderH);
      const r = Math.max(4, maskBrushNormSize * minDim);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.lineWidth = r * 2;
      if (draftMaskPoints.length === 1) {
        ctx.beginPath();
        ctx.arc(draftMaskPoints[0].x * renderW, draftMaskPoints[0].y * renderH, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(draftMaskPoints[0].x * renderW, draftMaskPoints[0].y * renderH);
        for (let i = 1; i < draftMaskPoints.length; i++) {
          ctx.lineTo(draftMaskPoints[i].x * renderW, draftMaskPoints[i].y * renderH);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [
    clips,
    pipLayers,
    socialLayers,
    textLayers,
    currentTime,
    mediaMap,
    mediaVersion,
    dims.width,
    dims.height,
    stageCssSize.w,
    stageCssSize.h,
    compareMode,
    compareSplit,
    showAlphaGrid,
    activeTool,
    showSpotOverlay,
    pendingSpotStrokes,
    draftPoints,
    spotBrushMode,
    spotBrushSize,
    spotBrushFeather,
    isBrushMaskMode,
    draftMaskPoints,
    maskBrushNormSize,
  ]);

  const getNormalizedCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    return {
      nx: Math.max(0, Math.min(1, nx)),
      ny: Math.max(0, Math.min(1, ny)),
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      rectW: rect.width,
      rectH: rect.height,
    };
  };

  const mapCanvasToClipNormalized = (nx: number, ny: number): SpotStrokePoint | null => {
    const slot = getClipAtTime(clips, currentTime);
    if (!slot) return null;
    const mediaEl = mediaMap.get(slot.clip.id);
    const srcW =
      mediaEl instanceof HTMLVideoElement
        ? mediaEl.videoWidth || slot.clip.width
        : mediaEl instanceof HTMLImageElement
          ? mediaEl.naturalWidth || slot.clip.width
          : slot.clip.width;
    const srcH =
      mediaEl instanceof HTMLVideoElement
        ? mediaEl.videoHeight || slot.clip.height
        : mediaEl instanceof HTMLImageElement
          ? mediaEl.naturalHeight || slot.clip.height
          : slot.clip.height;
    const scaleFit = Math.min(dims.width / srcW, dims.height / srcH);
    const drawW = srcW * scaleFit;
    const drawH = srcH * scaleFit;
    const ox = (dims.width - drawW) / 2;
    const oy = (dims.height - drawH) / 2;

    const cx = (nx * dims.width - ox) / drawW;
    const cy = (ny * dims.height - oy) / drawH;
    return {
      x: Math.max(0, Math.min(1, cx)),
      y: Math.max(0, Math.min(1, cy)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedCanvasPoint(e);
    if (!pt) return;

    // Chroma Key Canvas Eyedropper: sample exact plain background color on click/tap
    if (chromaEyedropperActive) {
      const hex = sampleColorAtNormalized(pt.nx, pt.ny);
      if (hex) {
        setEyedropperHover({x: pt.px, y: pt.py, hex});
        onPickChromaColor?.(hex);
      }
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    if (compareMode && Math.abs(pt.nx * 100 - compareSplit) < 6) {
      setDraggingCompare(true);
      return;
    }

    if (activeTool === 'spot') {
      const mapped = mapCanvasToClipNormalized(pt.nx, pt.ny);
      if (mapped) {
        setDraftPoints([mapped]);
      }
      return;
    }

    if (isBrushMaskMode && activeClip) {
      setDraftMaskPoints([{x: pt.nx, y: pt.ny}]);
      return;
    }

    if (activeTool === 'text' && activeTextId) {
      draggingLayerRef.current = 'text';
      onDragTextPosition(activeTextId, Math.round(pt.nx * 100), Math.round(pt.ny * 100));
      return;
    }

    if (activeTool === 'mask' && activeClip && activeClip.mask.shape !== 'none') {
      draggingLayerRef.current = 'mask';
      onDragMaskPosition(activeClip.id, Math.round(pt.nx * 100), Math.round(pt.ny * 100));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedCanvasPoint(e);
    if (!pt) return;

    if (chromaEyedropperActive) {
      const hex = sampleColorAtNormalized(pt.nx, pt.ny);
      if (hex) {
        setEyedropperHover({x: pt.px, y: pt.py, hex});
      }
      return;
    }

    if (activeTool === 'spot' || isBrushMaskMode) {
      setCursorPos({x: pt.px, y: pt.py});
    } else if (cursorPos) {
      setCursorPos(null);
    }

    if (draggingCompare) {
      setCompareSplit(Math.max(2, Math.min(98, Math.round(pt.nx * 100))));
      return;
    }

    if (draftPoints) {
      const mapped = mapCanvasToClipNormalized(pt.nx, pt.ny);
      if (mapped) {
        setDraftPoints((prev) => (prev ? [...prev, mapped] : [mapped]));
      }
      return;
    }

    if (draftMaskPoints) {
      setDraftMaskPoints((prev) => (prev ? [...prev, {x: pt.nx, y: pt.ny}] : [{x: pt.nx, y: pt.ny}]));
      return;
    }

    if (draggingLayerRef.current === 'text' && activeTextId) {
      onDragTextPosition(activeTextId, Math.round(pt.nx * 100), Math.round(pt.ny * 100));
    } else if (draggingLayerRef.current === 'mask' && activeClip) {
      onDragMaskPosition(activeClip.id, Math.round(pt.nx * 100), Math.round(pt.ny * 100));
    }
  };

  const handlePointerUp = () => {
    setDraggingCompare(false);
    draggingLayerRef.current = null;
    if (draftPoints && draftPoints.length > 0) {
      onAddSpotStroke({
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: spotBrushMode,
        size: spotBrushSize,
        feather: spotBrushFeather,
        points: draftPoints,
      });
      setDraftPoints(null);
    }
    if (draftMaskPoints && draftMaskPoints.length > 0 && activeClip && onAddMaskBrushStroke) {
      onAddMaskBrushStroke(activeClip.id, {
        id: `mask-stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'erase',
        size: maskBrushNormSize,
        feather: activeClip.mask.feather / 100,
        points: draftMaskPoints,
      });
      setDraftMaskPoints(null);
    }
  };

  const startOverlayBodyGesture = (
    e: React.PointerEvent<HTMLDivElement>,
    kind: 'pip' | 'social',
    layer: {id: string; x: number; y: number; scale: number},
  ) => {
    e.stopPropagation();
    const box = canvasBoxRef.current;
    if (!box) return;
    if (kind === 'pip') onSelectPip(layer.id);
    else onSelectSocial(layer.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    overlayPointersRef.current.set(e.pointerId, {x: e.clientX, y: e.clientY});

    if (overlayPointersRef.current.size === 2) {
      const pts = Array.from(overlayPointersRef.current.values());
      const dist = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      overlayGestureRef.current = {
        kind,
        mode: 'pinch',
        layerId: layer.id,
        startClientX: midX,
        startClientY: midY,
        startX: layer.x,
        startY: layer.y,
        startScale: layer.scale,
        startDist: dist,
        centerPxX: 0,
        centerPxY: 0,
      };
      return;
    }

    overlayGestureRef.current = {
      kind,
      mode: 'move',
      layerId: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      startScale: layer.scale,
      startDist: 1,
      centerPxX: 0,
      centerPxY: 0,
    };
  };

  const startOverlayCornerGesture = (
    e: React.PointerEvent<HTMLDivElement>,
    kind: 'pip' | 'social',
    layer: {id: string; x: number; y: number; scale: number},
  ) => {
    e.stopPropagation();
    const box = canvasBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    if (kind === 'pip') onSelectPip(layer.id);
    else onSelectSocial(layer.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    const centerPxX = rect.left + (layer.x / 100) * rect.width;
    const centerPxY = rect.top + (layer.y / 100) * rect.height;
    const startDist = Math.max(12, Math.hypot(e.clientX - centerPxX, e.clientY - centerPxY));

    overlayGestureRef.current = {
      kind,
      mode: 'resize',
      layerId: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      startScale: layer.scale,
      startDist,
      centerPxX,
      centerPxY,
    };
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = overlayGestureRef.current;
    const box = canvasBoxRef.current;
    if (!gesture || !box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (overlayPointersRef.current.has(e.pointerId)) {
      overlayPointersRef.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    }

    const minScale = gesture.kind === 'pip' ? 10 : 30;
    const maxScale = gesture.kind === 'pip' ? 100 : 200;
    const commit = (patch: {x?: number; y?: number; scale?: number}) => {
      if (gesture.kind === 'pip') onUpdatePip(gesture.layerId, patch);
      else onUpdateSocial(gesture.layerId, patch);
    };

    if (gesture.mode === 'pinch' && overlayPointersRef.current.size >= 2) {
      const pts = Array.from(overlayPointersRef.current.values());
      const curDist = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const nextScale = Math.max(
        minScale,
        Math.min(maxScale, Math.round(gesture.startScale * (curDist / gesture.startDist))),
      );
      const nextX = Math.max(
        5,
        Math.min(95, Math.round(gesture.startX + ((midX - gesture.startClientX) / rect.width) * 100)),
      );
      const nextY = Math.max(
        5,
        Math.min(95, Math.round(gesture.startY + ((midY - gesture.startClientY) / rect.height) * 100)),
      );
      commit({scale: nextScale, x: nextX, y: nextY});
      return;
    }

    if (gesture.mode === 'move') {
      const dxPct = ((e.clientX - gesture.startClientX) / rect.width) * 100;
      const dyPct = ((e.clientY - gesture.startClientY) / rect.height) * 100;
      const nextX = Math.max(5, Math.min(95, Math.round(gesture.startX + dxPct)));
      const nextY = Math.max(5, Math.min(95, Math.round(gesture.startY + dyPct)));
      commit({x: nextX, y: nextY});
      return;
    }

    if (gesture.mode === 'resize') {
      const curDist = Math.max(10, Math.hypot(e.clientX - gesture.centerPxX, e.clientY - gesture.centerPxY));
      const nextScale = Math.max(
        minScale,
        Math.min(maxScale, Math.round(gesture.startScale * (curDist / gesture.startDist))),
      );
      commit({scale: nextScale});
    }
  };

  const handleOverlayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    overlayPointersRef.current.delete(e.pointerId);
    if (overlayPointersRef.current.size === 0 || overlayGestureRef.current?.mode === 'pinch') {
      overlayGestureRef.current = null;
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  // Compute interactive overlay visibility
  const allowInteractiveOverlays =
    !chromaEyedropperActive && activeTool !== 'spot' && activeTool !== 'mask' && !compareMode;
  const showInteractivePipHandles = allowInteractiveOverlays && visiblePips.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-black select-none">
      {/* Main Canvas Stage */}
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-[#050505]"
      >
        <div
          ref={canvasBoxRef}
          className={`relative max-w-full max-h-full flex items-center justify-center rounded-xl overflow-hidden border border-white/12 shadow-2xl ${
            showAlphaGrid ? 'alpha-checker' : 'bg-black'
          }`}
          style={{
            aspectRatio: `${dims.width} / ${dims.height}`,
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              setCursorPos(null);
              setEyedropperHover(null);
              handlePointerUp();
            }}
            className={`w-full h-full block touch-none ${
              chromaEyedropperActive || activeTool === 'spot' || isBrushMaskMode
                ? 'cursor-crosshair'
                : activeTool === 'text' || activeTool === 'mask'
                  ? 'cursor-move'
                  : 'cursor-default'
            }`}
          />

          {/* Interactive PIP Touch & Mouse Transform Handles (Drag to Move, Corners / Pinch to Resize, Direct '×' Delete) */}
          {showInteractivePipHandles &&
            visiblePips.map((pip) => {
              const isSelected = activeVisiblePip?.id === pip.id;
              const mediaEl = mediaMap.get(pip.id) ?? null;
              const boxDims = getPipLayerDimensions(dims.width, dims.height, pip, mediaEl);
              const widthPct = (boxDims.drawW / dims.width) * 100;
              const heightPct = (boxDims.drawH / dims.height) * 100;
              const showFrame = activeTool === 'pip' || isSelected;

              return (
                <div
                  key={pip.id}
                  onPointerDown={(e) => startOverlayBodyGesture(e, 'pip', pip)}
                  onPointerMove={handleOverlayPointerMove}
                  onPointerUp={handleOverlayPointerUp}
                  onPointerCancel={handleOverlayPointerUp}
                  style={{
                    left: `${pip.x}%`,
                    top: `${pip.y}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    transform: `translate(-50%, -50%) rotate(${pip.rotation}deg)`,
                  }}
                  className={`absolute touch-none cursor-move transition-shadow ${
                    showFrame
                      ? isSelected
                        ? 'border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.85)] z-20'
                        : 'border border-dashed border-white/60 hover:border-white z-10'
                      : 'border border-transparent hover:border-white/50 z-10'
                  }`}
                  aria-label={`Move or resize PIP overlay ${pip.name}`}
                >
                  {isSelected && (
                    <>
                      {/* Crisp Direct PIP Delete '×' Button on Overlay Corner */}
                      {onDeletePip && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePip(pip.id);
                          }}
                          className="absolute -top-3.5 -right-3.5 w-7 h-7 rounded-full bg-white text-black border-2 border-black shadow-lg flex items-center justify-center hover:bg-neutral-200 active:scale-90 transition-transform cursor-pointer z-30"
                          title={`Remove PIP ${pip.name}`}
                          aria-label={`Delete PIP overlay ${pip.name}`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.75]" />
                        </button>
                      )}
                      {[
                        {pos: '-top-3.5 -left-3.5', cursor: 'cursor-nwse-resize'},
                        {pos: '-bottom-3.5 -left-3.5', cursor: 'cursor-nesw-resize'},
                        {pos: '-bottom-3.5 -right-3.5', cursor: 'cursor-nwse-resize'},
                      ].map((h, i) => (
                        <div
                          key={i}
                          onPointerDown={(e) => startOverlayCornerGesture(e, 'pip', pip)}
                          onPointerMove={handleOverlayPointerMove}
                          onPointerUp={handleOverlayPointerUp}
                          onPointerCancel={handleOverlayPointerUp}
                          className={`absolute ${h.pos} w-7 h-7 flex items-center justify-center touch-none ${h.cursor}`}
                        >
                          <span className="w-3 h-3 rounded-sm bg-white border-2 border-black shadow-md" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}

          {/* Crisp Native Inline SVG Vector Social Animations (Zero Pixelation at Any DPR / Scale) */}
          {visibleSocials.map((social) => {
            const boxDims = getSocialLayerBox(dims.width, dims.height, social);
            const widthPct = (boxDims.drawW / dims.width) * 100;
            const heightPct = (boxDims.drawH / dims.height) * 100;
            const isSelected = activeVisibleSocial?.id === social.id;
            const interactive = allowInteractiveOverlays;

            return (
              <div
                key={social.id}
                onPointerDown={
                  interactive ? (e) => startOverlayBodyGesture(e, 'social', social) : undefined
                }
                onPointerMove={interactive ? handleOverlayPointerMove : undefined}
                onPointerUp={interactive ? handleOverlayPointerUp : undefined}
                onPointerCancel={interactive ? handleOverlayPointerUp : undefined}
                style={{
                  left: `${social.x}%`,
                  top: `${social.y}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute ${
                  interactive ? 'touch-none cursor-move' : 'pointer-events-none'
                } ${
                  activeTool === 'social' && isSelected
                    ? 'ring-1 ring-white/90 rounded-lg z-25'
                    : 'z-20'
                }`}
                aria-label={`Social vector animation ${social.title}`}
              >
                <SocialVectorGraphic layer={social} globalTime={currentTime} />

                {interactive && activeTool === 'social' && isSelected && (
                  <>
                    {[
                      {pos: '-top-3.5 -left-3.5', cursor: 'cursor-nwse-resize'},
                      {pos: '-top-3.5 -right-3.5', cursor: 'cursor-nesw-resize'},
                      {pos: '-bottom-3.5 -left-3.5', cursor: 'cursor-nesw-resize'},
                      {pos: '-bottom-3.5 -right-3.5', cursor: 'cursor-nwse-resize'},
                    ].map((h, i) => (
                      <div
                        key={i}
                        onPointerDown={(e) => startOverlayCornerGesture(e, 'social', social)}
                        onPointerMove={handleOverlayPointerMove}
                        onPointerUp={handleOverlayPointerUp}
                        onPointerCancel={handleOverlayPointerUp}
                        className={`absolute ${h.pos} w-7 h-7 flex items-center justify-center touch-none ${h.cursor}`}
                      >
                        <span className="w-3 h-3 rounded-sm bg-white border-2 border-black shadow-md" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}

          {/* Before / After Compare Labels */}
          {compareMode && (
            <>
              <div className="pointer-events-none absolute top-3 left-3 px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[11px] font-medium text-neutral-300">
                Original
              </div>
              <div className="pointer-events-none absolute top-3 right-3 px-2 py-0.5 rounded bg-white text-black text-[11px] font-semibold">
                Enhanced
              </div>
              <div
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-lg border border-black"
                style={{left: `${compareSplit}%`}}
              >
                <Columns2 className="w-3.5 h-3.5" />
              </div>
            </>
          )}

          {/* Spot Remove OR Custom Brush Mask Cursor Ring */}
          {(activeTool === 'spot' || isBrushMaskMode) && cursorPos && canvasRef.current && (
            <div
              className="pointer-events-none absolute rounded-full border-2"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: Math.max(
                  10,
                  (isBrushMaskMode ? maskBrushNormSize : spotBrushSize) *
                    Math.min(
                      canvasRef.current.getBoundingClientRect().width,
                      canvasRef.current.getBoundingClientRect().height,
                    ) *
                    2,
                ),
                height: Math.max(
                  10,
                  (isBrushMaskMode ? maskBrushNormSize : spotBrushSize) *
                    Math.min(
                      canvasRef.current.getBoundingClientRect().width,
                      canvasRef.current.getBoundingClientRect().height,
                    ) *
                    2,
                ),
                transform: 'translate(-50%, -50%)',
                borderColor:
                  !isBrushMaskMode && spotBrushMode === 'heal' ? '#ef4444' : '#ffffff',
                backgroundColor:
                  !isBrushMaskMode && spotBrushMode === 'heal'
                    ? 'rgba(239,68,68,0.18)'
                    : 'rgba(255,255,255,0.14)',
              }}
            />
          )}

          {/* Chroma Key Live Canvas Eyedropper Color Loupe */}
          {chromaEyedropperActive && eyedropperHover && (
            <div
              className="pointer-events-none absolute z-40 flex flex-col items-center gap-1"
              style={{
                left: eyedropperHover.x,
                top: Math.max(46, eyedropperHover.y - 44),
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/90 border border-white/60 shadow-xl">
                <span
                  className="w-4 h-4 rounded-sm border border-white/80 shrink-0"
                  style={{backgroundColor: eyedropperHover.hex}}
                />
                <span className="text-[11px] font-mono-num font-semibold text-white">
                  {eyedropperHover.hex}
                </span>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-white shadow-[0_0_0_1px_#000] flex items-center justify-center bg-black/40">
                <Pipette className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          )}

          {/* Guided Custom Mask Position Outline (Geometric Shapes) */}
          {activeTool === 'mask' &&
            activeClip &&
            activeClip.mask.shape !== 'none' &&
            activeClip.mask.shape !== 'brush' && (
              <div
                className="pointer-events-none absolute border border-dashed border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.75)] z-20"
                style={{
                  left: `${activeClip.mask.x}%`,
                  top: `${activeClip.mask.y}%`,
                  width:
                    activeClip.mask.shape === 'split' || activeClip.mask.shape === 'filmstrip'
                      ? '96%'
                      : `${Math.min(100, activeClip.mask.width)}%`,
                  height:
                    activeClip.mask.shape === 'split'
                      ? '2px'
                      : activeClip.mask.shape === 'mirror'
                        ? '96%'
                        : `${Math.min(100, activeClip.mask.height)}%`,
                  borderRadius: activeClip.mask.shape === 'circle' ? '9999px' : '8px',
                  transform: `translate(-50%, -50%) rotate(${activeClip.mask.rotation}deg)`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white border border-black absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}

          {/* Contextual Hint Overlay for Direct Manipulation */}
          {(chromaEyedropperActive ||
            activeTool === 'spot' ||
            (activeTool === 'pip' && activeVisiblePip) ||
            (activeTool === 'social' && activeVisibleSocial) ||
            (activeTool === 'text' && activeTextId) ||
            (activeTool === 'mask' && activeClip?.mask.shape !== 'none')) && (
            <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-black/80 border border-white/15 text-[11px] text-neutral-300 whitespace-nowrap z-30">
              {chromaEyedropperActive
                ? 'Tap any plain background color on canvas to pick Chroma Key color'
                : activeTool === 'spot'
                  ? spotBrushMode === 'heal'
                    ? 'Paint over any spot or blemish, then tap Apply Removal'
                    : 'Paint area to erase to transparent alpha PNG'
                  : isBrushMaskMode
                    ? 'Paint directly on canvas to draw custom brush mask'
                    : activeTool === 'pip' || activeTool === 'social'
                      ? 'Drag overlay to move · drag corners or pinch to resize · tap × to delete'
                      : activeTool === 'text'
                        ? 'Drag text directly on canvas to reposition'
                        : 'Drag directly on canvas to position custom mask'}
            </div>
          )}
        </div>
      </div>

      {/* Transport Bar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 h-12 border-t border-white/10 bg-[#080808] shrink-0">
        <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono-num">
          <span className="text-white font-semibold">{formatTime(currentTime)}</span>
          <span aria-hidden="true">/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSeek(0)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Jump to start"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="min-w-[42px] min-h-[38px] px-4 flex items-center justify-center rounded-lg bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer"
            aria-label={isPlaying ? 'Pause playback' : 'Play timeline'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => onSeek(totalDuration)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Jump to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleCompare}
          className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
            compareMode
              ? 'bg-white text-black border-white'
              : 'bg-transparent text-neutral-300 border-white/15 hover:text-white hover:border-white/35'
          }`}
          title="Before / After Split Comparison"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compare</span>
        </button>
      </div>
    </div>
  );
};
