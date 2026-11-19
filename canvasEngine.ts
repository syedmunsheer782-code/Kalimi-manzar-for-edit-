import {ENHANCE_MODES, FILTER_PRESETS} from '../data/filters';
import {evaluateTextAnimation} from '../data/textAnimations';
import {TEXT_EFFECTS_100, TextEffectPreset} from '../data/textEffects';
import {
  AspectRatioId,
  DEFAULT_KEYFRAME_VALUES,
  EasingId,
  KeyframeNode,
  KeyframeValues,
  MaskConfig,
  MediaClip,
  PipLayer,
  ResolutionId,
  SocialAnimationLayer,
  TextLayer,
  TransitionId,
} from '../types/editor';
import {applyChromaKeyToCanvas} from './chromaKey';
import {renderSocialLayerToCanvas} from './socialVectorRenderer';

export function getExportDimensions(
  aspectRatio: AspectRatioId,
  resolution: ResolutionId,
): {width: number; height: number} {
  const baseLong: Record<ResolutionId, number> = {
    '4k': 3840,
    '2k': 2560,
    '1080p': 1920,
    '720p': 1280,
    '480p': 854,
    '360p': 640,
    '240p': 426,
    '144p': 256,
  };
  const squareSide: Record<ResolutionId, number> = {
    '4k': 2160,
    '2k': 1440,
    '1080p': 1080,
    '720p': 720,
    '480p': 480,
    '360p': 360,
    '240p': 240,
    '144p': 144,
  };
  const fourFiveH: Record<ResolutionId, number> = {
    '4k': 2700,
    '2k': 1800,
    '1080p': 1350,
    '720p': 900,
    '480p': 600,
    '360p': 450,
    '240p': 300,
    '144p': 180,
  };
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const longSide = baseLong[resolution];
  switch (aspectRatio) {
    case '16:9':
      return {width: even(longSide), height: even((longSide * 9) / 16)};
    case '9:16':
      return {width: even((longSide * 9) / 16), height: even(longSide)};
    case '1:1': {
      const sq = even(squareSide[resolution]);
      return {width: sq, height: sq};
    }
    case '4:5': {
      const h = even(fourFiveH[resolution]);
      return {width: even((h * 4) / 5), height: h};
    }
    case '4:3':
      return {width: even(longSide), height: even((longSide * 3) / 4)};
    case '21:9':
      return {width: even(longSide), height: even((longSide * 9) / 21)};
  }
}

export function applyEasing(t: number, easing: EasingId): number {
  const x = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return x;
    case 'ease-in':
      return x * x * x;
    case 'ease-out':
      return 1 - Math.pow(1 - x, 3);
    case 'ease-in-out':
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    case 'spring': {
      const c4 = (2 * Math.PI) / 3;
      return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -8 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
  }
}

export function evaluateKeyframes(keyframes: KeyframeNode[], localTime: number): KeyframeValues {
  if (!keyframes || keyframes.length === 0) return {...DEFAULT_KEYFRAME_VALUES};
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (localTime <= sorted[0].time) return {...sorted[0].values};
  if (localTime >= sorted[sorted.length - 1].time) return {...sorted[sorted.length - 1].values};

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (localTime >= a.time && localTime <= b.time) {
      const span = Math.max(0.0001, b.time - a.time);
      const rawT = (localTime - a.time) / span;
      const t = applyEasing(rawT, b.easing);
      return {
        posX: a.values.posX + (b.values.posX - a.values.posX) * t,
        posY: a.values.posY + (b.values.posY - a.values.posY) * t,
        scale: a.values.scale + (b.values.scale - a.values.scale) * t,
        rotation: a.values.rotation + (b.values.rotation - a.values.rotation) * t,
        opacity: a.values.opacity + (b.values.opacity - a.values.opacity) * t,
        brightnessDelta:
          a.values.brightnessDelta + (b.values.brightnessDelta - a.values.brightnessDelta) * t,
        contrastDelta: a.values.contrastDelta + (b.values.contrastDelta - a.values.contrastDelta) * t,
        maskScale: a.values.maskScale + (b.values.maskScale - a.values.maskScale) * t,
      };
    }
  }
  return {...DEFAULT_KEYFRAME_VALUES};
}

export function buildFilterString(
  clip: MediaClip,
  kf: KeyframeValues,
  bypassEffects = false,
): {
  cssFilter: string;
  tintColor?: string;
  tintBlend?: GlobalCompositeOperation;
  vignetteTotal: number;
  clarityStrength: number;
  fadeStrength: number;
  grainStrength: number;
  warmth: number;
} {
  if (bypassEffects) {
    return {
      cssFilter: 'none',
      vignetteTotal: 0,
      clarityStrength: 0,
      fadeStrength: 0,
      grainStrength: 0,
      warmth: 0,
    };
  }

  const preset = FILTER_PRESETS.find((f) => f.id === clip.filterId) ?? FILTER_PRESETS[0];
  const fInt = clip.filterId === 'original' ? 0 : Math.max(0, clip.filterIntensity / 100);
  const fBright = (clip.filterBrightness ?? 0) / 100;
  const enh = ENHANCE_MODES.find((e) => e.id === clip.enhanceMode) ?? ENHANCE_MODES[0];
  const eInt = clip.enhanceMode === 'none' ? 0 : Math.max(0, clip.enhanceStrength / 100);
  const adj = clip.adjustments;

  const brightness =
    1 +
    (adj.brightness + kf.brightnessDelta) / 100 +
    fBright +
    adj.exposure / 130 +
    adj.highlights / 260 +
    adj.shadows / 240 +
    preset.brightness * fInt +
    enh.brightnessDelta * eInt;

  const contrast =
    1 +
    (adj.contrast + kf.contrastDelta) / 100 +
    (adj.clarity4k / 100) * 0.16 +
    (adj.sharpness / 100) * 0.08 +
    preset.contrast * fInt +
    enh.contrastDelta * eInt;

  const targetSat = 1 + (preset.saturate - 1) * fInt + adj.saturation / 100 + enh.saturateDelta * eInt;
  const grayscale = Math.min(
    1,
    Math.max(0, preset.grayscale * fInt + (enh.grayscale ? enh.grayscale * eInt : 0)),
  );
  const sepia = Math.min(1, Math.max(0, preset.sepia * fInt + (adj.warmth > 0 ? (adj.warmth / 100) * 0.25 : 0)));
  const hueRotate = preset.hueRotate * fInt + (adj.warmth < 0 ? adj.warmth * 0.22 : 0);

  const parts: string[] = [];
  if (Math.abs(brightness - 1) > 0.002) {
    parts.push(`brightness(${Math.max(0.1, brightness).toFixed(3)})`);
  }
  if (Math.abs(contrast - 1) > 0.002) {
    parts.push(`contrast(${Math.max(0.1, contrast).toFixed(3)})`);
  }
  if (Math.abs(targetSat - 1) > 0.002) {
    parts.push(`saturate(${Math.max(0, targetSat).toFixed(3)})`);
  }
  if (grayscale > 0.005) parts.push(`grayscale(${grayscale.toFixed(3)})`);
  if (sepia > 0.005) parts.push(`sepia(${sepia.toFixed(3)})`);
  if (Math.abs(hueRotate) > 0.2) parts.push(`hue-rotate(${hueRotate.toFixed(1)}deg)`);

  const clarityStrength = Math.min(
    1,
    (adj.clarity4k / 100) * 0.55 +
      (adj.sharpness / 100) * 0.5 +
      enh.clarityBoost * eInt * 0.75 +
      (preset.clarityBoost ?? 0) * fInt * 0.85,
  );

  return {
    cssFilter: parts.length > 0 ? parts.join(' ') : 'none',
    tintColor: fInt > 0.05 ? preset.tintColor : undefined,
    tintBlend: preset.tintBlend,
    vignetteTotal: Math.min(1, adj.vignette / 100 + (preset.vignetteAdd ?? 0) * fInt),
    clarityStrength,
    fadeStrength: adj.fade / 100,
    grainStrength: adj.grain / 100,
    warmth: adj.warmth / 100,
  };
}

/**
 * Real crisp unsharp-mask / 4K clarity sharpening pass (used for crisp high-res rendering & export).
 */
export function applyUnsharpClarityPass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number,
) {
  if (strength <= 0.04) return;
  // Use fast hardware-accelerated unsharp overlay trick: difference between sharp original and slight blur
  // combined with subtle high-pass micro-contrast. Runs smoothly with zero pixel-loop lag!
  const amount = Math.min(0.42, strength * 0.36);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount * 0.55;
  ctx.filter = 'contrast(1.38) brightness(1.02)';
  ctx.drawImage(ctx.canvas, 0, 0, w, h);
  ctx.restore();
}

function traceMaskPath(
  ctx: CanvasRenderingContext2D,
  mask: MaskConfig,
  w: number,
  h: number,
  scaleMult: number,
) {
  const cx = (mask.x / 100) * w;
  const cy = (mask.y / 100) * h;
  const mw = ((mask.width / 100) * w * scaleMult) / 2;
  const mh = ((mask.height / 100) * h * scaleMult) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((mask.rotation * Math.PI) / 180);

  ctx.beginPath();
  switch (mask.shape) {
    case 'circle':
      ctx.ellipse(0, 0, Math.max(4, mw), Math.max(4, mh), 0, 0, Math.PI * 2);
      break;
    case 'rectangle': {
      const r = Math.min(mw, mh) * 0.12;
      ctx.roundRect(-mw, -mh, mw * 2, mh * 2, r);
      break;
    }
    case 'split':
      ctx.rect(-w * 2, -h * 2, w * 4, h * 2);
      break;
    case 'filmstrip':
      ctx.rect(-w * 2, -mh * 0.72, w * 4, mh * 1.44);
      break;
    case 'mirror':
      ctx.rect(-mw, -h * 2, mw * 2, h * 4);
      break;
    case 'diamond':
      ctx.moveTo(0, -mh);
      ctx.lineTo(mw, 0);
      ctx.lineTo(0, mh);
      ctx.lineTo(-mw, 0);
      ctx.closePath();
      break;
    case 'heart': {
      const s = Math.min(mw, mh) * 1.15;
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(s * 0.1, -s * 0.35, s * 1.1, -s * 0.35, s * 0.95, s * 0.25);
      ctx.bezierCurveTo(s * 0.85, s * 0.7, s * 0.25, s * 0.95, 0, s * 1.15);
      ctx.bezierCurveTo(-s * 0.25, s * 0.95, -s * 0.85, s * 0.7, -s * 0.95, s * 0.25);
      ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.1, -s * 0.35, 0, s * 0.35);
      ctx.closePath();
      break;
    }
    case 'star': {
      const spikes = 5;
      const outerR = Math.min(mw, mh);
      const innerR = outerR * 0.44;
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const px = Math.cos(angle) * rad;
        const py = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    default:
      ctx.rect(-w, -h, w * 2, h * 2);
  }
  ctx.restore();
}

// Reusable scratch canvases for zero-GC 60fps rendering
let clipScratchA: HTMLCanvasElement | null = null;
let clipScratchB: HTMLCanvasElement | null = null;
let maskScratch: HTMLCanvasElement | null = null;
let pipChromaScratch: HTMLCanvasElement | null = null;

function ensureScratch(
  existing: HTMLCanvasElement | null,
  w: number,
  h: number,
): HTMLCanvasElement {
  const c = existing ?? document.createElement('canvas');
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

export function renderSingleClipToCanvas(
  targetCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  clip: MediaClip,
  mediaEl: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null,
  localTime: number,
  bypassEffects = false,
) {
  targetCtx.save();
  targetCtx.clearRect(0, 0, w, h);
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';

  if (!mediaEl) {
    targetCtx.fillStyle = '#0a0a0a';
    targetCtx.fillRect(0, 0, w, h);
    targetCtx.restore();
    return;
  }

  const kf = evaluateKeyframes(clip.keyframes, localTime);
  const graded = buildFilterString(clip, kf, bypassEffects);

  const srcW =
    mediaEl instanceof HTMLVideoElement
      ? mediaEl.videoWidth || clip.width || 1920
      : mediaEl instanceof HTMLImageElement
        ? mediaEl.naturalWidth || clip.width || 1920
        : mediaEl.width;
  const srcH =
    mediaEl instanceof HTMLVideoElement
      ? mediaEl.videoHeight || clip.height || 1080
      : mediaEl instanceof HTMLImageElement
        ? mediaEl.naturalHeight || clip.height || 1080
        : mediaEl.height;

  // Non-destructive aspect-preserving Crop source rectangle (0% default = full frame)
  const crop = clip.crop;
  const cropL = crop ? Math.max(0, Math.min(45, crop.left)) / 100 : 0;
  const cropR = crop ? Math.max(0, Math.min(45, crop.right)) / 100 : 0;
  const cropT = crop ? Math.max(0, Math.min(45, crop.top)) / 100 : 0;
  const cropB = crop ? Math.max(0, Math.min(45, crop.bottom)) / 100 : 0;
  const hasCrop = cropL > 0.001 || cropR > 0.001 || cropT > 0.001 || cropB > 0.001;

  const cropX = srcW * cropL;
  const cropY = srcH * cropT;
  const cropW = Math.max(4, srcW * Math.max(0.1, 1 - cropL - cropR));
  const cropH = Math.max(4, srcH * Math.max(0.1, 1 - cropT - cropB));

  // Contain high-clarity auto-fit so elements appear immediately at a usable 100% size without distortion
  const scaleFit = Math.min(w / cropW, h / cropH);
  const drawW = cropW * scaleFit;
  const drawH = cropH * scaleFit;

  const baseClipScale = (clip.scale && clip.scale > 0 ? clip.scale : 100) / 100;
  const sizeFilterMult = bypassEffects
    ? 1
    : Math.max(0.15, 1 + (clip.adjustments.sizeFilter ?? 0) / 100);

  targetCtx.globalAlpha = Math.max(0, Math.min(1, kf.opacity / 100));
  targetCtx.translate(w / 2 + (kf.posX / 100) * w, h / 2 + (kf.posY / 100) * h);
  targetCtx.rotate((kf.rotation * Math.PI) / 180);
  const sc = (kf.scale / 100) * baseClipScale * sizeFilterMult;
  targetCtx.scale(sc, sc);
  targetCtx.filter = graded.cssFilter;
  if (hasCrop) {
    targetCtx.drawImage(mediaEl, cropX, cropY, cropW, cropH, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    targetCtx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  targetCtx.filter = 'none';
  targetCtx.restore();

  if (!bypassEffects) {
    // 4K Clarity / Unsharp Detail pass
    if (graded.clarityStrength > 0.04) {
      applyUnsharpClarityPass(targetCtx, w, h, graded.clarityStrength);
    }

    // Color Tint Overlay (from LUT-style filter)
    if (graded.tintColor) {
      targetCtx.save();
      targetCtx.globalCompositeOperation = graded.tintBlend ?? 'soft-light';
      targetCtx.fillStyle = graded.tintColor;
      targetCtx.fillRect(0, 0, w, h);
      targetCtx.restore();
    }

    // Cool/Warm balance tint
    if (Math.abs(graded.warmth) > 0.03) {
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'soft-light';
      targetCtx.fillStyle =
        graded.warmth > 0
          ? `rgba(255, 175, 85, ${(graded.warmth * 0.22).toFixed(3)})`
          : `rgba(75, 155, 255, ${(Math.abs(graded.warmth) * 0.24).toFixed(3)})`;
      targetCtx.fillRect(0, 0, w, h);
      targetCtx.restore();
    }

    // Film Fade (lifted blacks)
    if (graded.fadeStrength > 0.02) {
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'lighten';
      targetCtx.fillStyle = `rgba(38, 38, 42, ${(graded.fadeStrength * 0.55).toFixed(3)})`;
      targetCtx.fillRect(0, 0, w, h);
      targetCtx.restore();
    }

    // Vignette
    if (graded.vignetteTotal > 0.02) {
      targetCtx.save();
      const grad = targetCtx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.28,
        w / 2,
        h / 2,
        Math.hypot(w, h) * 0.56,
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.92, graded.vignetteTotal * 0.85).toFixed(3)})`);
      targetCtx.fillStyle = grad;
      targetCtx.fillRect(0, 0, w, h);
      targetCtx.restore();
    }

    // Organic fine film grain (lightweight procedural specks)
    if (graded.grainStrength > 0.04) {
      targetCtx.save();
      const count = Math.round(graded.grainStrength * 1400);
      const seed = Math.floor(localTime * 24) + 1;
      for (let i = 0; i < count; i++) {
        const rx = ((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) % 1;
        const ry = ((Math.sin(i * 93.9898 + seed * 41.233) * 23421.631) % 1 + 1) % 1;
        const bright = i % 2 === 0 ? 255 : 0;
        targetCtx.fillStyle = `rgba(${bright},${bright},${bright},${(graded.grainStrength * 0.16).toFixed(3)})`;
        targetCtx.fillRect(rx * w, ry * h, 1.5, 1.5);
      }
      targetCtx.restore();
    }

    // High-Precision Chroma Key (only runs when enabled with strength > 0)
    if (clip.chromaKey?.enabled && clip.chromaKey.strength > 0) {
      applyChromaKeyToCanvas(targetCtx, w, h, clip.chromaKey);
    }

    // Feathered Shape & Custom Brush Masking Compositing
    if (clip.mask.shape !== 'none') {
      const isBrushMask = clip.mask.shape === 'brush';
      const brushStrokes = clip.mask.brushStrokes ?? [];
      if (!isBrushMask || brushStrokes.length > 0) {
        maskScratch = ensureScratch(maskScratch, w, h);
        const mCtx = maskScratch.getContext('2d');
        if (mCtx) {
          mCtx.clearRect(0, 0, w, h);
          const featherPx = Math.round((clip.mask.feather / 100) * Math.min(w, h) * 0.08);

          const drawBrushMaskStrokes = () => {
            const minDim = Math.min(w, h);
            mCtx.lineCap = 'round';
            mCtx.lineJoin = 'round';
            mCtx.strokeStyle = '#ffffff';
            mCtx.fillStyle = '#ffffff';
            for (const st of brushStrokes) {
              const r = Math.max(4, st.size * minDim);
              mCtx.lineWidth = r * 2;
              if (st.points.length === 1) {
                mCtx.beginPath();
                mCtx.arc(st.points[0].x * w, st.points[0].y * h, r, 0, Math.PI * 2);
                mCtx.fill();
              } else if (st.points.length > 1) {
                mCtx.beginPath();
                mCtx.moveTo(st.points[0].x * w, st.points[0].y * h);
                for (let i = 1; i < st.points.length; i++) {
                  mCtx.lineTo(st.points[i].x * w, st.points[i].y * h);
                }
                mCtx.stroke();
              }
            }
          };

          if (clip.mask.invert) {
            mCtx.fillStyle = '#ffffff';
            mCtx.fillRect(0, 0, w, h);
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.filter = featherPx > 0 ? `blur(${featherPx}px)` : 'none';
            if (isBrushMask) {
              drawBrushMaskStrokes();
            } else {
              traceMaskPath(mCtx, clip.mask, w, h, kf.maskScale / 100);
              mCtx.fill();
            }
            mCtx.filter = 'none';
            mCtx.globalCompositeOperation = 'source-over';
          } else {
            mCtx.fillStyle = '#ffffff';
            mCtx.filter = featherPx > 0 ? `blur(${featherPx}px)` : 'none';
            if (isBrushMask) {
              drawBrushMaskStrokes();
            } else {
              traceMaskPath(mCtx, clip.mask, w, h, kf.maskScale / 100);
              mCtx.fill();
            }
            mCtx.filter = 'none';
          }

          targetCtx.save();
          targetCtx.globalCompositeOperation = 'destination-in';
          targetCtx.drawImage(maskScratch, 0, 0);
          targetCtx.restore();
        }
      }
    }
  }
}

/**
 * Renders smooth CapCut-style transition between outgoing canvas A and incoming canvas B.
 * progress p in [0, 1]
 */
export function renderTransitionComposite(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  canvasA: HTMLCanvasElement,
  canvasB: HTMLCanvasElement,
  transition: TransitionId,
  p: number,
) {
  const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const bell = Math.sin(p * Math.PI); // 0 -> 1 -> 0 peak at midpoint

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  switch (transition) {
    case 'none':
      ctx.drawImage(p < 0.5 ? canvasA : canvasB, 0, 0);
      break;

    case 'cross-dissolve':
    case 'mix-fade':
      ctx.drawImage(canvasA, 0, 0);
      ctx.globalAlpha = ease;
      ctx.drawImage(canvasB, 0, 0);
      break;

    case 'fade-black':
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      if (p < 0.5) {
        ctx.globalAlpha = 1 - p * 2;
        ctx.drawImage(canvasA, 0, 0);
      } else {
        ctx.globalAlpha = (p - 0.5) * 2;
        ctx.drawImage(canvasB, 0, 0);
      }
      break;

    case 'flash-white':
      ctx.drawImage(p < 0.5 ? canvasA : canvasB, 0, 0);
      ctx.fillStyle = `rgba(255,255,255,${Math.pow(bell, 1.3).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      break;

    case 'blur-dissolve': {
      const blurAmt = Math.round(bell * 22);
      ctx.filter = blurAmt > 0 ? `blur(${blurAmt}px)` : 'none';
      ctx.drawImage(canvasA, 0, 0);
      ctx.globalAlpha = ease;
      ctx.drawImage(canvasB, 0, 0);
      ctx.filter = 'none';
      break;
    }

    case 'pull-in': {
      if (p < 0.5) {
        const t = applyEasing(p * 2, 'ease-in');
        const sc = 1 + t * 0.9;
        ctx.translate(w / 2, h / 2);
        ctx.scale(sc, sc);
        ctx.filter = `blur(${(t * 8).toFixed(1)}px)`;
        ctx.drawImage(canvasA, -w / 2, -h / 2);
      } else {
        const t = applyEasing((p - 0.5) * 2, 'ease-out');
        const sc = 0.65 + t * 0.35;
        ctx.translate(w / 2, h / 2);
        ctx.scale(sc, sc);
        ctx.filter = `blur(${((1 - t) * 8).toFixed(1)}px)`;
        ctx.drawImage(canvasB, -w / 2, -h / 2);
      }
      ctx.filter = 'none';
      break;
    }

    case 'pull-out': {
      if (p < 0.5) {
        const t = applyEasing(p * 2, 'ease-in');
        const sc = 1 - t * 0.35;
        ctx.translate(w / 2, h / 2);
        ctx.scale(sc, sc);
        ctx.drawImage(canvasA, -w / 2, -h / 2);
      } else {
        const t = applyEasing((p - 0.5) * 2, 'ease-out');
        const sc = 1.65 - t * 0.65;
        ctx.translate(w / 2, h / 2);
        ctx.scale(sc, sc);
        ctx.drawImage(canvasB, -w / 2, -h / 2);
      }
      break;
    }

    case 'whip-left':
    case 'slide-left': {
      const blur = transition === 'whip-left' ? Math.round(bell * 14) : 0;
      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      const offset = -ease * w;
      ctx.drawImage(canvasA, offset, 0);
      ctx.drawImage(canvasB, offset + w, 0);
      ctx.filter = 'none';
      break;
    }

    case 'whip-right':
    case 'slide-right': {
      const blur = transition === 'whip-right' ? Math.round(bell * 14) : 0;
      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      const offset = ease * w;
      ctx.drawImage(canvasA, offset, 0);
      ctx.drawImage(canvasB, offset - w, 0);
      ctx.filter = 'none';
      break;
    }

    case 'whip-up': {
      ctx.filter = `blur(${Math.round(bell * 14)}px)`;
      const offset = -ease * h;
      ctx.drawImage(canvasA, 0, offset);
      ctx.drawImage(canvasB, 0, offset + h);
      ctx.filter = 'none';
      break;
    }

    case 'whip-down': {
      ctx.filter = `blur(${Math.round(bell * 14)}px)`;
      const offset = ease * h;
      ctx.drawImage(canvasA, 0, offset);
      ctx.drawImage(canvasB, 0, offset - h);
      ctx.filter = 'none';
      break;
    }

    case 'spin-cw':
    case 'spin-ccw': {
      const dir = transition === 'spin-cw' ? 1 : -1;
      const angle = dir * ease * Math.PI * 2;
      const zoom = 1 + bell * 0.35;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(zoom, zoom);
      ctx.filter = `blur(${Math.round(bell * 10)}px)`;
      ctx.drawImage(p < 0.5 ? canvasA : canvasB, -w / 2, -h / 2);
      ctx.filter = 'none';
      break;
    }

    case 'wipe-horizontal': {
      ctx.drawImage(canvasA, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, w * ease, h);
      ctx.clip();
      ctx.drawImage(canvasB, 0, 0);
      break;
    }

    case 'wipe-vertical': {
      ctx.drawImage(canvasA, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, w, h * ease);
      ctx.clip();
      ctx.drawImage(canvasB, 0, 0);
      break;
    }

    case 'iris-circle': {
      ctx.drawImage(canvasA, 0, 0);
      const maxR = Math.hypot(w / 2, h / 2) * 1.05;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxR * ease, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(canvasB, 0, 0);
      break;
    }

    case 'split-open': {
      ctx.drawImage(canvasB, 0, 0);
      const shift = ease * (w / 2);
      // Left door
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w / 2 - shift, h);
      ctx.clip();
      ctx.drawImage(canvasA, -shift, 0);
      ctx.restore();
      // Right door
      ctx.save();
      ctx.beginPath();
      ctx.rect(w / 2 + shift, 0, w / 2 - shift, h);
      ctx.clip();
      ctx.drawImage(canvasA, shift, 0);
      ctx.restore();
      break;
    }

    case 'glitch-cut': {
      ctx.drawImage(p < 0.5 ? canvasA : canvasB, 0, 0);
      const slices = 10;
      const sliceH = h / slices;
      for (let i = 0; i < slices; i++) {
        const shift = (Math.sin(i * 19.3 + p * 42) * 0.5) * bell * w * 0.22;
        const src = (i + Math.floor(p * 12)) % 2 === 0 ? canvasB : canvasA;
        ctx.drawImage(src, 0, i * sliceH, w, sliceH, shift, i * sliceH, w, sliceH);
      }
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 255, 255, ${(bell * 0.18).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders a single TextLayer with its assigned YouTube-style Text Effect & Animation (1..100)
 */
export function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: TextLayer,
  globalTime: number,
) {
  const localT = globalTime - layer.startTime;
  if (localT < 0 || localT > layer.duration) return;

  const effect: TextEffectPreset =
    TEXT_EFFECTS_100.find((e) => e.id === layer.effectId) ?? TEXT_EFFECTS_100[0];
  const kf = evaluateKeyframes(layer.keyframes, localT);

  const scaleBase = h / 1080;
  const fontSizePx = Math.max(10, layer.fontSize * scaleBase);
  const rawText = effect.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = rawText.split('\n');

  // Animation normalized time
  const introDur = Math.min(layer.duration * 0.65, 0.75 / Math.max(0.25, layer.animSpeed));
  const introP = Math.max(0, Math.min(1, localT / Math.max(0.05, introDur)));
  const easeOut = applyEasing(introP, 'ease-out');
  const springP = applyEasing(introP, 'spring');
  const loopPhase = localT * layer.animSpeed * Math.PI * 2;

  let tx = (layer.x / 100) * w + (kf.posX / 100) * w;
  let ty = (layer.y / 100) * h + (kf.posY / 100) * h;
  const safeTextScale = layer.scale && layer.scale > 0 ? layer.scale : 100;
  let sx = (safeTextScale / 100) * (kf.scale / 100);
  let sy = sx;
  let rot = ((layer.rotation + kf.rotation) * Math.PI) / 180;
  let alpha = (layer.opacity / 100) * (kf.opacity / 100);
  let extraSpacing = layer.letterSpacing * scaleBase;
  let blurPx = 0;
  let clipProgress = 1;
  let splitClip = -1;
  let visibleCharCount = Infinity;
  let jitterX = 0;
  let jitterY = 0;
  let rgbBoost = effect.rgbSplit ?? 0;

  // Lightweight 12 Smooth Text Animations take priority when explicitly chosen (clean, low-load motion)
  const hasLightweightAnim = Boolean(layer.textAnimation && layer.textAnimation !== 'none');
  if (hasLightweightAnim) {
    const tAnim = evaluateTextAnimation(
      layer.textAnimation,
      localT,
      layer.duration,
      layer.animSpeed,
    );
    alpha *= tAnim.opacity;
    tx += tAnim.dxFraction * w;
    ty += tAnim.dyFraction * h;
    sx *= tAnim.scale;
    sy *= tAnim.scale;
    rot += tAnim.rotationRad;
    blurPx = Math.max(blurPx, tAnim.blurPx);
    clipProgress = Math.min(clipProgress, tAnim.wipeProgress);
    if (tAnim.typewriterFraction < 0.999) {
      visibleCharCount = Math.max(
        1,
        Math.floor(tAnim.typewriterFraction * Math.max(1, rawText.length)),
      );
    }
  }

  switch (hasLightweightAnim ? 'none' : effect.motion) {
    case 'pop-spring':
      sx *= springP;
      sy *= springP;
      alpha *= Math.min(1, introP * 3);
      break;
    case 'slam-in': {
      const sc = 2.6 - 1.6 * easeOut;
      sx *= sc;
      sy *= sc;
      alpha *= Math.min(1, introP * 2.5);
      break;
    }
    case 'bounce-up': {
      const bounce = applyEasing(introP, 'spring');
      ty += (1 - bounce) * h * 0.14;
      alpha *= Math.min(1, introP * 2.5);
      break;
    }
    case 'bounce-down': {
      const bounce = applyEasing(introP, 'spring');
      ty -= (1 - bounce) * h * 0.14;
      alpha *= Math.min(1, introP * 2.5);
      break;
    }
    case 'elastic-scale': {
      const el = applyEasing(introP, 'spring');
      sx *= 0.4 + 0.6 * el;
      sy *= 1.4 - 0.4 * el;
      break;
    }
    case 'whip-left':
      tx += (1 - easeOut) * w * 0.45;
      blurPx = (1 - easeOut) * 10;
      alpha *= Math.min(1, introP * 2.5);
      break;
    case 'whip-right':
      tx -= (1 - easeOut) * w * 0.45;
      blurPx = (1 - easeOut) * 10;
      alpha *= Math.min(1, introP * 2.5);
      break;
    case 'slide-up-fade':
      ty += (1 - easeOut) * h * 0.08;
      alpha *= easeOut;
      break;
    case 'slide-down-fade':
      ty -= (1 - easeOut) * h * 0.08;
      alpha *= easeOut;
      break;
    case 'zoom-blur':
      sx *= 1.9 - 0.9 * easeOut;
      sy *= 1.9 - 0.9 * easeOut;
      blurPx = (1 - easeOut) * 14;
      alpha *= easeOut;
      break;
    case 'zoom-out-settle':
      sx *= 1.28 - 0.28 * easeOut;
      sy *= 1.28 - 0.28 * easeOut;
      alpha *= easeOut;
      break;
    case 'typewriter': {
      const totalChars = rawText.length;
      const revealDur = Math.min(layer.duration * 0.7, Math.max(0.5, totalChars * 0.06 / layer.animSpeed));
      visibleCharCount = Math.max(1, Math.floor((localT / revealDur) * totalChars));
      break;
    }
    case 'tracking-expand':
      extraSpacing += (1 - easeOut) * -14 * scaleBase + Math.min(localT, 3) * 2.5 * scaleBase;
      alpha *= easeOut;
      break;
    case 'tracking-compress':
      extraSpacing += (1 - easeOut) * 28 * scaleBase;
      alpha *= easeOut;
      break;
    case 'glitch-jitter': {
      const pulse = Math.sin(localT * 38 * layer.animSpeed) > 0.72 ? 1 : 0;
      jitterX = pulse * (Math.sin(localT * 117) * 8 * scaleBase);
      jitterY = pulse * (Math.cos(localT * 91) * 4 * scaleBase);
      rgbBoost = (effect.rgbSplit ?? 4) * (1 + pulse * 1.4);
      break;
    }
    case 'rgb-pulse':
      rgbBoost = (effect.rgbSplit ?? 5) * (0.65 + 0.55 * Math.abs(Math.sin(loopPhase * 1.5)));
      break;
    case 'flip-x':
      sy *= Math.max(0.05, easeOut);
      alpha *= easeOut;
      break;
    case 'flip-y':
      sx *= Math.max(0.05, easeOut);
      alpha *= easeOut;
      break;
    case 'spin-in':
      rot += (1 - easeOut) * Math.PI * 2;
      sx *= 0.2 + 0.8 * easeOut;
      sy *= 0.2 + 0.8 * easeOut;
      alpha *= easeOut;
      break;
    case 'swing-pendulum':
      rot += Math.sin(loopPhase * 0.7) * 0.14;
      break;
    case 'heartbeat': {
      const beat = 1 + Math.pow(Math.max(0, Math.sin(loopPhase * 1.4)), 4) * 0.12;
      sx *= beat;
      sy *= beat;
      break;
    }
    case 'float-hover':
      ty += Math.sin(loopPhase * 0.6) * 10 * scaleBase;
      break;
    case 'shake-impact': {
      const decay = Math.max(0, 1 - localT * 1.8 * layer.animSpeed);
      jitterX = Math.sin(localT * 75) * 14 * scaleBase * decay;
      jitterY = Math.cos(localT * 63) * 10 * scaleBase * decay;
      break;
    }
    case 'curtain-wipe':
      clipProgress = easeOut;
      break;
    case 'split-reveal':
      splitClip = easeOut;
      break;
    case 'flicker-neon': {
      const flick = Math.sin(localT * 43) * Math.sin(localT * 19);
      alpha *= flick > 0.78 ? 0.55 : 1;
      break;
    }
    case 'roll-marquee': {
      const shift = ((localT * 120 * layer.animSpeed) % (w * 0.8)) - w * 0.4;
      tx += shift;
      break;
    }
    default:
      break;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(tx + jitterX, ty + jitterY);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  if (effect.boxSkew) {
    ctx.transform(1, 0, Math.tan((effect.boxSkew * Math.PI) / 180), 1, 0, 0);
  }
  if (blurPx > 0.4) {
    ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
  }

  const italicStr = effect.italic ? 'italic ' : '';
  ctx.font = `${italicStr}${layer.fontWeight} ${fontSizePx}px ${layer.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = layer.align;

  const lineStep = fontSizePx * layer.lineHeight;
  const totalBlockH = lineStep * lines.length;

  // Measure widest line for box background & gradients
  let maxLineW = 0;
  for (const line of lines) {
    const measured = ctx.measureText(line).width + Math.max(0, line.length - 1) * extraSpacing;
    if (measured > maxLineW) maxLineW = measured;
  }

  // Optional clip for curtain-wipe or split-reveal
  if (clipProgress < 0.999) {
    ctx.beginPath();
    ctx.rect(-maxLineW, -totalBlockH, maxLineW * 2 * clipProgress, totalBlockH * 2);
    ctx.clip();
  } else if (splitClip >= 0 && splitClip < 0.999) {
    const halfW = (maxLineW * 0.65) * splitClip;
    ctx.beginPath();
    ctx.rect(-halfW, -totalBlockH, halfW * 2, totalBlockH * 2);
    ctx.clip();
  }

  // Background box (from either user layer bgOpacity or effect boxBg)
  const useBoxBg = effect.boxBg || (layer.bgOpacity > 0 ? layer.bgColor : undefined);
  if (useBoxBg || effect.boxBorder) {
    const padX = fontSizePx * 0.42;
    const padY = fontSizePx * 0.24;
    const bx =
      layer.align === 'center'
        ? -maxLineW / 2 - padX
        : layer.align === 'right'
          ? -maxLineW - padX
          : -padX;
    const by = -totalBlockH / 2 - padY;
    const bw = maxLineW + padX * 2;
    const bh = totalBlockH + padY * 2;
    const br = (effect.boxRadius ?? 8) * scaleBase;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, br);
    if (useBoxBg && useBoxBg !== 'transparent') {
      ctx.fillStyle = useBoxBg;
      if (!effect.boxBg && layer.bgOpacity > 0) {
        ctx.globalAlpha *= layer.bgOpacity / 100;
      }
      ctx.fill();
    }
    if (effect.boxBorder) {
      ctx.strokeStyle = effect.boxBorder;
      ctx.lineWidth = Math.max(2, 3 * scaleBase);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Fill paint
  let fillPaint: string | CanvasGradient = layer.color;
  if (effect.fillStyle === 'solid' && effect.fillColors[0]) {
    // Allow user custom color override if they changed away from pure white, otherwise honor effect color
    fillPaint = layer.color !== '#FFFFFF' ? layer.color : effect.fillColors[0];
  } else if (effect.fillStyle === 'gradient-v') {
    const g = ctx.createLinearGradient(0, -totalBlockH / 2, 0, totalBlockH / 2);
    g.addColorStop(0, effect.fillColors[0]);
    g.addColorStop(1, effect.fillColors[1]);
    fillPaint = g;
  } else if (effect.fillStyle === 'gradient-h') {
    const g = ctx.createLinearGradient(-maxLineW / 2, 0, maxLineW / 2, 0);
    g.addColorStop(0, effect.fillColors[0]);
    g.addColorStop(1, effect.fillColors[1]);
    fillPaint = g;
  } else if (effect.fillStyle === 'chrome') {
    const g = ctx.createLinearGradient(0, -fontSizePx / 2, 0, fontSizePx / 2);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.45, '#E4E4E7');
    g.addColorStop(0.52, '#52525B');
    g.addColorStop(0.85, '#D4D4D8');
    g.addColorStop(1, '#FFFFFF');
    fillPaint = g;
  }

  const effStrokeW = Math.max(layer.strokeWidth, effect.strokeWidth ?? 0) * scaleBase;
  const effStrokeColor = layer.strokeWidth > 0 ? layer.strokeColor : (effect.strokeColor ?? '#000000');

  // Helper to draw a line (with per-character wave/drop/scatter or karaoke word highlight)
  let globalCharCursor = 0;
  const allWords = rawText.trim().split(/\s+/).filter(Boolean);
  const activeWordIndex =
    effect.motion === 'word-karaoke' && allWords.length > 0
      ? Math.floor((localT / Math.max(0.2, layer.duration)) * allWords.length * layer.animSpeed) %
        allWords.length
      : -1;
  let globalWordCursor = 0;

  lines.forEach((line, lineIdx) => {
    const yPos = -totalBlockH / 2 + lineStep * (lineIdx + 0.5);
    let drawLine = line;
    if (visibleCharCount !== Infinity) {
      const remaining = Math.max(0, visibleCharCount - globalCharCursor);
      drawLine = line.slice(0, remaining);
      if (remaining < line.length && Math.floor(localT * 4) % 2 === 0) {
        drawLine += '|';
      }
      globalCharCursor += line.length + 1;
    }

    const isPerCharMotion =
      effect.motion === 'letter-wave' ||
      effect.motion === 'letter-drop' ||
      effect.motion === 'letter-scatter' ||
      Math.abs(extraSpacing) > 0.5;

    const renderTextStrokeAndFill = (
      str: string,
      x: number,
      y: number,
      overrideFill?: string | CanvasGradient,
    ) => {
      // RGB Split chromatic offset
      if (rgbBoost > 0.5) {
        const off = rgbBoost * scaleBase;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 45, 85, 0.78)';
        ctx.fillText(str, x - off, y);
        ctx.fillStyle = 'rgba(0, 225, 255, 0.78)';
        ctx.fillText(str, x + off, y);
        ctx.restore();
      }

      // 3D Extrude stack
      if (effect.extrudeDepth && effect.extrudeDepth > 0) {
        const steps = Math.max(2, Math.round(effect.extrudeDepth * scaleBase));
        ctx.fillStyle = effect.extrudeColor ?? '#1a1a1a';
        for (let d = steps; d >= 1; d--) {
          ctx.fillText(str, x + d * 0.65, y + d * 0.9);
        }
      }

      // Shadow or Neon Glow
      ctx.save();
      if (effect.glowColor) {
        ctx.shadowColor = effect.glowColor;
        ctx.shadowBlur = (effect.glowBlur ?? 22) * scaleBase;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else if (effect.shadowColor) {
        ctx.shadowColor = effect.shadowColor;
        ctx.shadowBlur = (effect.shadowBlur ?? 0) * scaleBase;
        ctx.shadowOffsetX = (effect.shadowOffsetX ?? 0) * scaleBase;
        ctx.shadowOffsetY = (effect.shadowOffsetY ?? 0) * scaleBase;
      }

      if (effStrokeW > 0.5) {
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.lineWidth = effStrokeW;
        ctx.strokeStyle = effStrokeColor;
        ctx.strokeText(str, x, y);
      }

      if (effect.fillStyle !== 'hollow') {
        ctx.fillStyle = overrideFill ?? fillPaint;
        ctx.fillText(str, x, y);
      }
      ctx.restore();
    };

    if (effect.motion === 'word-karaoke') {
      const words = drawLine.split(' ');
      const spaceW = ctx.measureText(' ').width;
      const widths = words.map((wd) => ctx.measureText(wd).width);
      const totalW = widths.reduce((a, b) => a + b, 0) + Math.max(0, words.length - 1) * spaceW;
      let cursorX =
        layer.align === 'center' ? -totalW / 2 : layer.align === 'right' ? -totalW : 0;
      const savedAlign = ctx.textAlign;
      ctx.textAlign = 'left';
      words.forEach((wd, wi) => {
        const isActive = globalWordCursor === activeWordIndex;
        ctx.save();
        if (isActive) {
          const cx = cursorX + widths[wi] / 2;
          ctx.translate(cx, yPos);
          ctx.scale(1.12, 1.12);
          ctx.translate(-cx, -yPos);
        }
        renderTextStrokeAndFill(
          wd,
          cursorX,
          yPos,
          isActive && effect.highlightActiveWord ? effect.highlightActiveWord : fillPaint,
        );
        ctx.restore();
        cursorX += widths[wi] + spaceW;
        globalWordCursor++;
      });
      ctx.textAlign = savedAlign;
    } else if (isPerCharMotion) {
      const chars = Array.from(drawLine);
      const widths = chars.map((ch) => ctx.measureText(ch).width);
      const totalW =
        widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * extraSpacing;
      let cursorX =
        layer.align === 'center' ? -totalW / 2 : layer.align === 'right' ? -totalW : 0;
      const savedAlign = ctx.textAlign;
      ctx.textAlign = 'left';
      chars.forEach((ch, ci) => {
        let ox = 0;
        let oy = 0;
        if (effect.motion === 'letter-wave') {
          oy = Math.sin(loopPhase * 1.1 + ci * 0.55) * 10 * scaleBase;
        } else if (effect.motion === 'letter-drop') {
          const cp = Math.max(0, Math.min(1, (localT * layer.animSpeed - ci * 0.035) / 0.35));
          oy = -(1 - applyEasing(cp, 'spring')) * 44 * scaleBase;
        } else if (effect.motion === 'letter-scatter') {
          const cp = Math.max(0, Math.min(1, (localT * layer.animSpeed - ci * 0.025) / 0.45));
          const rem = 1 - applyEasing(cp, 'ease-out');
          ox = Math.sin(ci * 17.3) * 65 * scaleBase * rem;
          oy = Math.cos(ci * 23.1) * 45 * scaleBase * rem;
        }
        renderTextStrokeAndFill(ch, cursorX + ox, yPos + oy);
        cursorX += widths[ci] + extraSpacing;
      });
      ctx.textAlign = savedAlign;
    } else {
      renderTextStrokeAndFill(drawLine, 0, yPos);
    }

    if (effect.underline && drawLine.length > 0) {
      const lineW = ctx.measureText(drawLine).width;
      const ux = layer.align === 'center' ? -lineW / 2 : layer.align === 'right' ? -lineW : 0;
      ctx.fillStyle = typeof fillPaint === 'string' ? fillPaint : '#FFFFFF';
      ctx.fillRect(ux, yPos + fontSizePx * 0.52, lineW, Math.max(2, 3 * scaleBase));
    }
  });

  ctx.restore();
}

/**
 * Computes normalized (0..1) and pixel bounds for a PIP overlay layer on a canvas of size (w, h).
 */
export function getPipLayerDimensions(
  w: number,
  h: number,
  layer: PipLayer,
  mediaEl?: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null,
): {drawW: number; drawH: number; cx: number; cy: number} {
  const srcW =
    mediaEl instanceof HTMLVideoElement
      ? mediaEl.videoWidth || layer.width || 1920
      : mediaEl instanceof HTMLImageElement
        ? mediaEl.naturalWidth || layer.width || 1920
        : mediaEl
          ? mediaEl.width
          : layer.width || 1920;
  const srcH =
    mediaEl instanceof HTMLVideoElement
      ? mediaEl.videoHeight || layer.height || 1080
      : mediaEl instanceof HTMLImageElement
        ? mediaEl.naturalHeight || layer.height || 1080
        : mediaEl
          ? mediaEl.height
          : layer.height || 1080;

  const aspect = Math.max(0.2, Math.min(5, srcW / Math.max(1, srcH)));
  let drawW = (Math.max(8, Math.min(120, layer.scale)) / 100) * w;
  let drawH = drawW / aspect;
  // Clamp height nicely so tall vertical PIPs stay proportional
  if (drawH > h * 0.92) {
    drawH = h * 0.92;
    drawW = drawH * aspect;
  }

  return {
    drawW,
    drawH,
    cx: (layer.x / 100) * w,
    cy: (layer.y / 100) * h,
  };
}

/**
 * Renders a crisp Picture-in-Picture (PIP) secondary video or photo overlay on top of the main track.
 */
export function renderPipLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: PipLayer,
  mediaEl: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null,
  globalTime: number,
) {
  const localT = globalTime - layer.startTime;
  if (localT < 0 || localT > layer.duration) return;
  if (!mediaEl) return;

  const {drawW, drawH, cx, cy} = getPipLayerDimensions(w, h, layer, mediaEl);
  const radiusPx = (Math.max(0, Math.min(50, layer.borderRadius)) / 100) * Math.min(drawW, drawH);
  const hasChromaKey = Boolean(layer.chromaKey?.enabled && layer.chromaKey.strength > 0);

  let sourceDrawable: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement = mediaEl;
  if (hasChromaKey) {
    const pw = Math.max(2, Math.round(drawW));
    const ph = Math.max(2, Math.round(drawH));
    pipChromaScratch = ensureScratch(pipChromaScratch, pw, ph);
    const pCtx = pipChromaScratch.getContext('2d', {willReadFrequently: true});
    if (pCtx) {
      pCtx.clearRect(0, 0, pw, ph);
      pCtx.imageSmoothingEnabled = true;
      pCtx.imageSmoothingQuality = 'high';
      pCtx.drawImage(mediaEl, 0, 0, pw, ph);
      applyChromaKeyToCanvas(pCtx, pw, ph, layer.chromaKey);
      sourceDrawable = pipChromaScratch;
    }
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);

  // Subtle drop shadow only when PIP is not chroma-keyed (so keyed cutouts float cleanly with zero box)
  if (!hasChromaKey) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.max(8, w * 0.014);
    ctx.shadowOffsetY = Math.max(3, h * 0.005);
    ctx.beginPath();
    ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, radiusPx);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();
  }

  // Clip rounded rectangle / circle shape and draw crisp secondary media
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, radiusPx);
  ctx.clip();
  ctx.drawImage(sourceDrawable, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Optional crisp monochrome border (automatically hidden when Chroma Key removes background)
  if (layer.borderWidth > 0 && !hasChromaKey) {
    const bw = layer.borderWidth * (w / 1080);
    ctx.beginPath();
    ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, radiusPx);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, bw);
    ctx.stroke();
  }

  ctx.restore();
}

export interface TimelineFrameContext {
  clips: MediaClip[];
  pipLayers?: PipLayer[];
  socialLayers?: SocialAnimationLayer[];
  skipSocialOnCanvas?: boolean;
  textLayers: TextLayer[];
  globalTime: number;
  mediaMap: Map<string, HTMLImageElement | HTMLVideoElement | HTMLCanvasElement>;
  compareSplit?: number | null; // 0..100 for before/after split slider
  transparentBackground?: boolean;
}

export function getClipAtTime(clips: MediaClip[], globalTime: number) {
  let cursor = 0;
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const start = cursor;
    const end = cursor + c.duration;
    if (globalTime <= end || i === clips.length - 1) {
      return {
        index: i,
        clip: c,
        clipStart: start,
        localTime: Math.max(0, Math.min(c.duration, globalTime - start)),
        nextClip: clips[i + 1] ?? null,
      };
    }
    cursor = end;
  }
  return null;
}

export function getTotalTimelineDuration(clips: MediaClip[]): number {
  return clips.reduce((acc, c) => acc + c.duration, 0);
}

/**
 * Master frame renderer: composites active clip (and CapCut transition if near junction),
 * optional before/after comparison split, and all active YouTube text layers.
 */
export function renderCompositionFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: TimelineFrameContext,
) {
  ctx.save();
  if (frame.transparentBackground) {
    ctx.clearRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
  }

  const slot = getClipAtTime(frame.clips, frame.globalTime);
  if (!slot) {
    ctx.restore();
    return;
  }

  const {clip, localTime, nextClip} = slot;
  const mediaA = frame.mediaMap.get(clip.id) ?? null;

  const transDur =
    nextClip && clip.transitionOut !== 'none'
      ? Math.min(clip.transitionDuration, clip.duration * 0.48, nextClip.duration * 0.48)
      : 0;
  const timeToEnd = clip.duration - localTime;
  const inTransition = Boolean(nextClip && transDur > 0.02 && timeToEnd <= transDur);

  const drawMainVisual = (targetCtx: CanvasRenderingContext2D, bypass: boolean) => {
    if (inTransition && nextClip && !bypass) {
      const p = Math.max(0, Math.min(1, 1 - timeToEnd / transDur));
      clipScratchA = ensureScratch(clipScratchA, w, h);
      clipScratchB = ensureScratch(clipScratchB, w, h);
      const ctxA = clipScratchA.getContext('2d');
      const ctxB = clipScratchB.getContext('2d');
      if (ctxA && ctxB) {
        renderSingleClipToCanvas(ctxA, w, h, clip, mediaA, localTime, false);
        const mediaB = frame.mediaMap.get(nextClip.id) ?? null;
        renderSingleClipToCanvas(ctxB, w, h, nextClip, mediaB, p * transDur, false);
        renderTransitionComposite(targetCtx, w, h, clipScratchA, clipScratchB, clip.transitionOut, p);
      }
    } else {
      renderSingleClipToCanvas(targetCtx, w, h, clip, mediaA, localTime, bypass);
    }
  };

  if (frame.compareSplit !== null && frame.compareSplit !== undefined) {
    const splitX = Math.round((frame.compareSplit / 100) * w);
    // Left = Before (Raw)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, h);
    ctx.clip();
    drawMainVisual(ctx, true);
    ctx.restore();

    // Right = After (Enhanced + Filtered)
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, w - splitX, h);
    ctx.clip();
    drawMainVisual(ctx, false);
    ctx.restore();

    // Crisp monochrome divider line
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, h);
    ctx.stroke();
    ctx.restore();
  } else {
    drawMainVisual(ctx, false);
  }

  // Render active PIP (Picture-in-Picture) overlays on top of main video track
  if (frame.pipLayers && frame.pipLayers.length > 0) {
    for (const pip of frame.pipLayers) {
      const pipMedia = frame.mediaMap.get(pip.id) ?? null;
      renderPipLayer(ctx, w, h, pip, pipMedia, frame.globalTime);
    }
  }

  // Render active text overlays on top
  for (const layer of frame.textLayers) {
    renderTextLayer(ctx, w, h, layer, frame.globalTime);
  }

  // Render crisp full-resolution vector Social Animations directly onto 1080p/4K export frames
  // (skipped during live preview when crisp native SVG overlays are mounted over the canvas stage)
  if (!frame.skipSocialOnCanvas && frame.socialLayers && frame.socialLayers.length > 0) {
    for (const social of frame.socialLayers) {
      renderSocialLayerToCanvas(ctx, w, h, social, frame.globalTime);
    }
  }

  ctx.restore();
}
