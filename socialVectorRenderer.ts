import {SocialAnimationLayer, SocialPlatformId, SocialThemeStyle} from '../types/editor';

/**
 * Pure vector SVG path definitions (normalized to 24x24 viewBox) for crisp,
 * resolution-independent rendering in both live SVG overlays and 1080p/4K Canvas exports.
 */
export const SOCIAL_VECTOR_PATHS = {
  // YouTube rounded rectangle + crisp center play triangle
  youtubeBg:
    'M23.5 6.2a3.01 3.01 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.52A3.01 3.01 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3.01 3.01 0 0 0 2.12 2.13c1.88.52 9.38.52 9.38.52s7.5 0 9.38-.52a3.01 3.01 0 0 0 2.12-2.13A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8z',
  youtubePlay: 'M9.6 15.6V8.4L15.9 12l-6.3 3.6z',
  // Bell notification icon
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  bellBody: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z',
  bellClapper: 'M13.73 21a2 2 0 0 1-3.46 0',
  // Thumbs up (Like)
  thumbsUp:
    'M7 10v12H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h4zm2 12h8.28a2 2 0 0 0 1.98-1.7l1.12-7.5A2 2 0 0 0 18.4 10.5H14V6.2A2.2 2.2 0 0 0 11.8 4h-.5L8 11v11z',
  // Comment bubble
  comment:
    'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  // Share arrow
  share: 'M15 5l6 6-6 6v-3.8c-5.2 0-8.8 1.6-11.5 5.3 1-5.1 4-9.5 11.5-10.5V5z',
  // Facebook clean 'f' glyph inside 24x24
  facebookF:
    'M15.12 5.32H17V2.14A26.1 26.1 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V6.65c0-1.05.29-1.73 1.76-1.73z',
  // Verified check icon (circle + check)
  verifiedCheck: 'M9 12.2l2.1 2.1L15.4 10',
  // Pointer cursor arrow
  cursor: 'M5 3l14 10.2-6.1 1.3-2.6 5.8L5 3z',
  // Plus icon for Follow
  plus: 'M12 5v14M5 12h14',
  // Check icon for Following / Subscribed
  check: 'M5 12.5l4.2 4.2L19 7',
};

export interface SocialPresetSpec {
  platform: SocialPlatformId;
  label: string;
  description: string;
  defaults: Omit<SocialAnimationLayer, 'id' | 'startTime' | 'duration'>;
}

export const SOCIAL_PRESETS: SocialPresetSpec[] = [
  {
    platform: 'youtube',
    label: 'YouTube Subscribe',
    description: 'Channel name · Subscribe + Like, Comment, Share',
    defaults: {
      platform: 'youtube',
      title: 'Kalimi Manzar',
      subtitle: 'Official YouTube Channel',
      buttonLabel: 'Subscribe',
      activeButtonLabel: 'Subscribed',
      showActions: true,
      showCursor: true,
      verified: true,
      themeStyle: 'brand',
      x: 50,
      y: 82,
      scale: 100,
      opacity: 100,
      animSpeed: 1,
    },
  },
  {
    platform: 'facebook',
    label: 'Facebook Follow',
    description: 'Name first · Crisp Follow animation',
    defaults: {
      platform: 'facebook',
      title: 'Kalimi Manzar',
      subtitle: 'Facebook Page',
      buttonLabel: 'Follow',
      activeButtonLabel: 'Following',
      showActions: true,
      showCursor: true,
      verified: true,
      themeStyle: 'brand',
      x: 50,
      y: 82,
      scale: 100,
      opacity: 100,
      animSpeed: 1,
    },
  },
  {
    platform: 'instagram',
    label: 'Instagram Follow',
    description: 'kalam_e_aamiria · Animated Follow badge',
    defaults: {
      platform: 'instagram',
      title: 'kalam_e_aamiria',
      subtitle: 'Instagram',
      buttonLabel: 'Follow',
      activeButtonLabel: 'Following',
      showActions: true,
      showCursor: true,
      verified: true,
      themeStyle: 'brand',
      x: 50,
      y: 82,
      scale: 100,
      opacity: 100,
      animSpeed: 1,
    },
  },
];

export interface SocialAnimFrameState {
  visible: boolean;
  alpha: number;
  offsetY: number; // logical px
  cardScale: number;
  isClicked: boolean;
  buttonPressScale: number;
  rippleProgress: number; // 0..1
  bellShakeDeg: number;
  likeProgress: number; // 0..1
  commentProgress: number; // 0..1
  shareProgress: number; // 0..1
  badgeShimmer: number; // 0..1
  cursorVisible: boolean;
  cursorX: number; // logical px inside viewBox
  cursorY: number; // logical px inside viewBox
  cursorScale: number;
  cursorOpacity: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Exact logical SVG viewBox dimensions shared identically between live SVG overlays and 4K Canvas exports.
 */
export function getSocialLogicalSize(
  platform: SocialPlatformId,
  showActions: boolean,
): {width: number; height: number} {
  if (platform === 'youtube') {
    return showActions ? {width: 580, height: 176} : {width: 580, height: 112};
  }
  if (platform === 'facebook') {
    return {width: 500, height: 108};
  }
  // Instagram
  return {width: 500, height: 108};
}

/**
 * Computes responsive high-resolution bounding box on any aspect ratio (16:9, 9:16, 1:1, 4:5)
 * at 1080p, 2K, or 4K without distortion.
 */
export function getSocialLayerBox(
  canvasW: number,
  canvasH: number,
  layer: SocialAnimationLayer,
): {drawW: number; drawH: number; cx: number; cy: number; viewW: number; viewH: number} {
  const {width: viewW, height: viewH} = getSocialLogicalSize(layer.platform, layer.showActions);
  const minDim = Math.min(canvasW, canvasH);
  // Base logical width scales proportionally to canvas minor dimension so vertical 9:16 and 16:9 stay crisp
  const baseScaleFactor = (minDim / 1080) * (canvasW < canvasH ? 1.38 : 1.04);
  const userScale = Math.max(0.25, Math.min(2.2, layer.scale / 100));
  let drawW = viewW * baseScaleFactor * userScale;
  let drawH = viewH * baseScaleFactor * userScale;

  // Prevent overflow beyond 94% of canvas width on ultra-high scales
  if (drawW > canvasW * 0.94) {
    const clampRatio = (canvasW * 0.94) / drawW;
    drawW *= clampRatio;
    drawH *= clampRatio;
  }

  return {
    drawW,
    drawH,
    cx: (layer.x / 100) * canvasW,
    cy: (layer.y / 100) * canvasH,
    viewW,
    viewH,
  };
}

/**
 * Deterministic timeline animation evaluator (0..duration) for YouTube, Facebook, and Instagram overlays.
 */
export function evaluateSocialAnimFrame(
  layer: SocialAnimationLayer,
  globalTime: number,
  previewLoop = false,
): SocialAnimFrameState {
  const speed = Math.max(0.4, Math.min(2.5, layer.animSpeed || 1));
  const rawLocal = previewLoop
    ? (globalTime * speed) % 3.6
    : globalTime - layer.startTime;

  if (!previewLoop && (rawLocal < 0 || rawLocal > layer.duration)) {
    return {
      visible: false,
      alpha: 0,
      offsetY: 0,
      cardScale: 1,
      isClicked: false,
      buttonPressScale: 1,
      rippleProgress: 0,
      bellShakeDeg: 0,
      likeProgress: 0,
      commentProgress: 0,
      shareProgress: 0,
      badgeShimmer: 0,
      cursorVisible: false,
      cursorX: 0,
      cursorY: 0,
      cursorScale: 1,
      cursorOpacity: 0,
    };
  }

  const t = previewLoop ? rawLocal : rawLocal * speed;
  const totalT = previewLoop ? 3.6 : layer.duration * speed;
  const remaining = Math.max(0, totalT - t);

  const {width: viewW, height: viewH} = getSocialLogicalSize(layer.platform, layer.showActions);

  // Entrance (0..0.48s) and Exit (last 0.42s)
  const enterP = easeOutBack(clamp01(t / 0.48));
  const enterFade = easeOutCubic(clamp01(t / 0.32));
  const exitP = previewLoop ? 1 : easeOutCubic(clamp01(remaining / 0.42));

  const alpha = enterFade * exitP * clamp01(layer.opacity / 100);
  const offsetY = (1 - enterP) * 28 + (1 - exitP) * 20;
  const cardScale = 0.88 + enterP * 0.12;

  // Click choreography: cursor moves in (0.55..1.05s), presses button (1.05..1.25s), flips state at 1.15s
  const clickTime = 1.15;
  const isClicked = t >= clickTime;

  let buttonPressScale = 1;
  if (t >= 1.04 && t <= 1.38) {
    const pressT = (t - 1.04) / 0.34;
    if (pressT < 0.35) {
      buttonPressScale = 1 - 0.11 * (pressT / 0.35);
    } else {
      buttonPressScale = 0.89 + 0.17 * easeOutBack((pressT - 0.35) / 0.65) - 0.06 * clamp01((pressT - 0.7) / 0.3);
    }
  }

  const rippleProgress = isClicked ? clamp01((t - clickTime) / 0.55) : 0;

  // YouTube bell shake right after Subscribe click
  let bellShakeDeg = 0;
  if (t >= clickTime && t <= clickTime + 0.85) {
    const bellT = (t - clickTime) / 0.85;
    bellShakeDeg = Math.sin(bellT * Math.PI * 5) * (1 - bellT) * 20;
  }

  // YouTube sequential Like -> Comment -> Share wave after Subscribe
  const likeProgress = easeOutBack(clamp01((t - 1.48) / 0.34));
  const commentProgress = easeOutBack(clamp01((t - 1.76) / 0.34));
  const shareProgress = easeOutBack(clamp01((t - 2.04) / 0.34));

  // Crisp subtle shimmer sweep across Instagram Follow badge / card
  const badgeShimmer = clamp01((t - 1.2) / 0.9);

  // Target click button coordinates inside viewBox
  const targetBtnX = layer.platform === 'youtube' ? viewW - 96 : viewW - 88;
  const targetBtnY = layer.platform === 'youtube' ? 56 : viewH / 2;

  let cursorVisible = false;
  let cursorX = targetBtnX + 54;
  let cursorY = targetBtnY + 46;
  let cursorScale = 1;
  let cursorOpacity = 0;

  if (layer.showCursor && t >= 0.52 && t <= 1.85) {
    cursorVisible = true;
    if (t < 1.05) {
      const moveP = easeOutCubic((t - 0.52) / 0.53);
      cursorX = targetBtnX + (1 - moveP) * 58;
      cursorY = targetBtnY + (1 - moveP) * 48;
      cursorOpacity = clamp01((t - 0.52) / 0.18);
    } else if (t < 1.32) {
      cursorX = targetBtnX;
      cursorY = targetBtnY;
      const tapP = (t - 1.05) / 0.27;
      cursorScale = tapP < 0.45 ? 1 - 0.18 * (tapP / 0.45) : 0.82 + 0.18 * ((tapP - 0.45) / 0.55);
      cursorOpacity = 1;
    } else {
      const leaveP = easeOutCubic((t - 1.32) / 0.53);
      cursorX = targetBtnX + leaveP * 38;
      cursorY = targetBtnY + leaveP * 36;
      cursorOpacity = 1 - leaveP;
    }
  }

  return {
    visible: true,
    alpha,
    offsetY,
    cardScale,
    isClicked,
    buttonPressScale,
    rippleProgress,
    bellShakeDeg,
    likeProgress,
    commentProgress,
    shareProgress,
    badgeShimmer,
    cursorVisible,
    cursorX,
    cursorY,
    cursorScale,
    cursorOpacity,
  };
}

export interface SocialPalette {
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  subtitleColor: string;
  dividerColor: string;
  actionBg: string;
  actionText: string;
  actionActiveBg: string;
  actionActiveText: string;
  btnBg: string;
  btnText: string;
  btnActiveBg: string;
  btnActiveText: string;
  btnActiveBorder: string;
  verifiedFill: string;
  verifiedCheck: string;
}

export function getSocialPalette(
  platform: SocialPlatformId,
  theme: SocialThemeStyle,
): SocialPalette {
  if (theme === 'mono-dark') {
    return {
      cardBg: 'transparent',
      cardBorder: 'transparent',
      titleColor: '#FFFFFF',
      subtitleColor: '#E5E5E5',
      dividerColor: 'transparent',
      actionBg: 'transparent',
      actionText: '#E5E5E5',
      actionActiveBg: 'transparent',
      actionActiveText: '#FFFFFF',
      btnBg: '#FFFFFF',
      btnText: '#000000',
      btnActiveBg: 'rgba(18, 18, 18, 0.88)',
      btnActiveText: '#FFFFFF',
      btnActiveBorder: 'rgba(255, 255, 255, 0.55)',
      verifiedFill: '#FFFFFF',
      verifiedCheck: '#000000',
    };
  }

  if (theme === 'mono-light') {
    return {
      cardBg: 'transparent',
      cardBorder: 'transparent',
      titleColor: '#0A0A0A',
      subtitleColor: '#262626',
      dividerColor: 'transparent',
      actionBg: 'transparent',
      actionText: '#171717',
      actionActiveBg: 'transparent',
      actionActiveText: '#000000',
      btnBg: '#0A0A0A',
      btnText: '#FFFFFF',
      btnActiveBg: 'rgba(245, 245, 245, 0.92)',
      btnActiveText: '#0A0A0A',
      btnActiveBorder: 'rgba(0, 0, 0, 0.35)',
      verifiedFill: '#0A0A0A',
      verifiedCheck: '#FFFFFF',
    };
  }

  // 'brand' — completely transparent floating vector graphic with authentic brand accents
  if (platform === 'youtube') {
    return {
      cardBg: 'transparent',
      cardBorder: 'transparent',
      titleColor: '#FFFFFF',
      subtitleColor: '#E5E5E5',
      dividerColor: 'transparent',
      actionBg: 'transparent',
      actionText: '#E5E5E5',
      actionActiveBg: 'transparent',
      actionActiveText: '#FFFFFF',
      btnBg: '#FF0033',
      btnText: '#FFFFFF',
      btnActiveBg: 'rgba(24, 24, 24, 0.88)',
      btnActiveText: '#FFFFFF',
      btnActiveBorder: 'rgba(255, 255, 255, 0.45)',
      verifiedFill: '#FFFFFF',
      verifiedCheck: '#0A0A0A',
    };
  }

  if (platform === 'facebook') {
    return {
      cardBg: 'transparent',
      cardBorder: 'transparent',
      titleColor: '#FFFFFF',
      subtitleColor: '#E5E5E5',
      dividerColor: 'transparent',
      actionBg: 'transparent',
      actionText: '#E5E5E5',
      actionActiveBg: 'transparent',
      actionActiveText: '#1877F2',
      btnBg: '#1877F2',
      btnText: '#FFFFFF',
      btnActiveBg: 'rgba(24, 24, 24, 0.88)',
      btnActiveText: '#FFFFFF',
      btnActiveBorder: 'rgba(24, 119, 242, 0.75)',
      verifiedFill: '#1877F2',
      verifiedCheck: '#FFFFFF',
    };
  }

  // Instagram brand accent (completely transparent floating graphic)
  return {
    cardBg: 'transparent',
    cardBorder: 'transparent',
    titleColor: '#FFFFFF',
    subtitleColor: '#E5E5E5',
    dividerColor: 'transparent',
    actionBg: 'transparent',
    actionText: '#E5E5E5',
    actionActiveBg: 'transparent',
    actionActiveText: '#FFFFFF',
    btnBg: '#E1306C',
    btnText: '#FFFFFF',
    btnActiveBg: 'rgba(24, 24, 24, 0.88)',
    btnActiveText: '#FFFFFF',
    btnActiveBorder: 'rgba(255, 255, 255, 0.5)',
    verifiedFill: '#3897F0',
    verifiedCheck: '#FFFFFF',
  };
}

function drawVectorPath(
  ctx: CanvasRenderingContext2D,
  pathD: string,
  x: number,
  y: number,
  size: number,
  options: {fill?: string; stroke?: string; lineWidth?: number},
) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  const p = new Path2D(pathD);
  if (options.fill) {
    ctx.fillStyle = options.fill;
    ctx.fill(p);
  }
  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.lineWidth ?? 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p);
  }
  ctx.restore();
}

function fitTruncatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

/**
 * Pure vector Canvas2D renderer for 1080p / 2K / 4K Photo, PNG, and Video exports.
 * Draws resolution-independent Path2D geometry and crisp native typography directly
 * at the full destination canvas resolution with zero intermediate raster scaling.
 */
export function renderSocialLayerToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  layer: SocialAnimationLayer,
  globalTime: number,
) {
  const anim = evaluateSocialAnimFrame(layer, globalTime, false);
  if (!anim.visible || anim.alpha <= 0.01) return;

  const {drawW, drawH, cx, cy, viewW, viewH} = getSocialLayerBox(canvasW, canvasH, layer);
  const scaleX = drawW / viewW;
  const scaleY = drawH / viewH;
  const pal = getSocialPalette(layer.platform, layer.themeStyle);
  const fontStack = '"Plus Jakarta Sans", "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif';

  const textHaloColor =
    layer.themeStyle === 'mono-light'
      ? 'rgba(255, 255, 255, 0.85)'
      : 'rgba(0, 0, 0, 0.78)';

  const drawHaloText = (text: string, x: number, y: number, fill: string, haloWidth = 3.8) => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = textHaloColor;
    ctx.lineWidth = haloWidth;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  ctx.save();
  ctx.globalAlpha = anim.alpha;
  ctx.translate(cx, cy + anim.offsetY * scaleY);
  ctx.scale(anim.cardScale * scaleX, anim.cardScale * scaleY);
  ctx.translate(-viewW / 2, -viewH / 2);

  // Subtle drop shadow directly on floating vector shapes & text (ZERO background card/box)
  ctx.shadowColor =
    layer.themeStyle === 'mono-light' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.82)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2.5;

  if (layer.platform === 'youtube') {
    const headerH = 108;
    // Floating YouTube Vector Emblem (no background box)
    const iconBgFill =
      layer.themeStyle === 'mono-light'
        ? '#0A0A0A'
        : layer.themeStyle === 'mono-dark'
          ? '#FFFFFF'
          : '#FF0033';
    const iconPlayFill =
      layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF';

    drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.youtubeBg, 22, 30, 50, {fill: iconBgFill});
    drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.youtubePlay, 22, 30, 50, {fill: iconPlayFill});

    // Channel Name + Verified Badge + Subtitle
    const textX = 90;
    const maxTitleW = 276;
    ctx.font = `800 25px ${fontStack}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const titleStr = fitTruncatedText(
      ctx,
      layer.title || 'Channel Name',
      maxTitleW - (layer.verified ? 26 : 0),
    );
    drawHaloText(titleStr, textX, 44, pal.titleColor, 4);

    if (layer.verified) {
      const tw = ctx.measureText(titleStr).width;
      const vx = textX + tw + 14;
      const vy = 44;
      ctx.beginPath();
      ctx.arc(vx, vy, 9, 0, Math.PI * 2);
      ctx.fillStyle = pal.verifiedFill;
      ctx.fill();
      drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.verifiedCheck, vx - 7.5, vy - 7.5, 15, {
        stroke: pal.verifiedCheck,
        lineWidth: 2.6,
      });
    }

    ctx.font = `600 14px ${fontStack}`;
    drawHaloText(
      fitTruncatedText(ctx, layer.subtitle || 'Official YouTube Channel', maxTitleW),
      textX,
      71,
      pal.subtitleColor,
      3,
    );

    // Subscribe / Subscribed Button with animated click & bell
    const btnW = 166;
    const btnH = 48;
    const btnCx = viewW - 18 - btnW / 2;
    const btnCy = headerH / 2;

    if (anim.rippleProgress > 0 && anim.rippleProgress < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - anim.rippleProgress) * 0.65;
      ctx.beginPath();
      const pad = anim.rippleProgress * 18;
      ctx.roundRect(
        btnCx - btnW / 2 - pad,
        btnCy - btnH / 2 - pad * 0.65,
        btnW + pad * 2,
        btnH + pad * 1.3,
        28,
      );
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(btnCx, btnCy);
    ctx.scale(anim.buttonPressScale, anim.buttonPressScale);
    ctx.beginPath();
    ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 24);
    ctx.fillStyle = anim.isClicked ? pal.btnActiveBg : pal.btnBg;
    ctx.fill();
    ctx.strokeStyle = anim.isClicked ? pal.btnActiveBorder : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    const labelStr = anim.isClicked
      ? layer.activeButtonLabel || 'Subscribed'
      : layer.buttonLabel || 'Subscribe';
    ctx.font = `700 16px ${fontStack}`;
    ctx.fillStyle = anim.isClicked ? pal.btnActiveText : pal.btnText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (anim.isClicked) {
      ctx.save();
      ctx.translate(-52, 0);
      ctx.rotate((anim.bellShakeDeg * Math.PI) / 180);
      drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.bellBody, -10, -10, 20, {fill: pal.btnActiveText});
      drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.bellClapper, -10, -10, 20, {
        stroke: pal.btnActiveText,
        lineWidth: 2.2,
      });
      ctx.restore();
      ctx.fillText(labelStr, 14, 1);
    } else {
      ctx.fillText(labelStr, 0, 1);
    }
    ctx.restore();

    // Transparent Floating Action Row: Like, Comment, Share (zero background boxes)
    if (layer.showActions) {
      const actions = [
        {label: 'Like', path: SOCIAL_VECTOR_PATHS.thumbsUp, p: anim.likeProgress, fillMode: true},
        {label: 'Comment', path: SOCIAL_VECTOR_PATHS.comment, p: anim.commentProgress, fillMode: false},
        {label: 'Share', path: SOCIAL_VECTOR_PATHS.share, p: anim.shareProgress, fillMode: true},
      ];
      const gap = 16;
      const itemW = (viewW - 44 - gap * 2) / 3;
      const rowCy = 136;

      actions.forEach((act, idx) => {
        const cxItem = 22 + idx * (itemW + gap) + itemW / 2;
        const active = act.p > 0.35;
        const popScale = 1 + Math.sin(clamp01(act.p) * Math.PI) * 0.14;
        const fg = active ? pal.actionActiveText : pal.actionText;

        ctx.save();
        ctx.translate(cxItem, rowCy);
        ctx.scale(popScale, popScale);
        drawVectorPath(
          ctx,
          act.path,
          -48,
          -11,
          22,
          act.fillMode ? {fill: fg} : {stroke: fg, lineWidth: 2.5},
        );
        ctx.font = `800 16px ${fontStack}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        drawHaloText(act.label, -16, 1, fg, 3.4);
        ctx.restore();
      });
    }
  } else if (layer.platform === 'facebook') {
    // FACEBOOK: Transparent Floating Emblem + Name First + Animated Follow Button
    const iconCircleFill =
      layer.themeStyle === 'mono-light'
        ? '#0A0A0A'
        : layer.themeStyle === 'mono-dark'
          ? '#FFFFFF'
          : '#1877F2';
    const iconGlyphFill = layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF';

    ctx.beginPath();
    ctx.arc(48, viewH / 2, 27, 0, Math.PI * 2);
    ctx.fillStyle = iconCircleFill;
    ctx.fill();
    drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.facebookF, 32, viewH / 2 - 16, 32, {fill: iconGlyphFill});

    const textX = 90;
    const maxTitleW = 232;
    ctx.font = `800 25px ${fontStack}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const nameStr = fitTruncatedText(
      ctx,
      layer.title || 'Page Name',
      maxTitleW - (layer.verified ? 26 : 0),
    );
    drawHaloText(nameStr, textX, 42, pal.titleColor, 4);

    if (layer.verified) {
      const tw = ctx.measureText(nameStr).width;
      const vx = textX + tw + 14;
      const vy = 42;
      ctx.beginPath();
      ctx.arc(vx, vy, 9, 0, Math.PI * 2);
      ctx.fillStyle = pal.verifiedFill;
      ctx.fill();
      drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.verifiedCheck, vx - 7.5, vy - 7.5, 15, {
        stroke: pal.verifiedCheck,
        lineWidth: 2.6,
      });
    }

    ctx.font = `600 14px ${fontStack}`;
    drawHaloText(
      fitTruncatedText(ctx, layer.subtitle || 'Facebook Page', maxTitleW),
      textX,
      69,
      pal.subtitleColor,
      3,
    );

    const btnW = 148;
    const btnH = 46;
    const btnCx = viewW - 18 - btnW / 2;
    const btnCy = viewH / 2;

    if (anim.rippleProgress > 0 && anim.rippleProgress < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - anim.rippleProgress) * 0.65;
      ctx.beginPath();
      const pad = anim.rippleProgress * 16;
      ctx.roundRect(btnCx - btnW / 2 - pad, btnCy - btnH / 2 - pad * 0.65, btnW + pad * 2, btnH + pad * 1.3, 16);
      ctx.strokeStyle = layer.themeStyle === 'brand' ? '#1877F2' : '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(btnCx, btnCy);
    ctx.scale(anim.buttonPressScale, anim.buttonPressScale);
    ctx.beginPath();
    ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.fillStyle = anim.isClicked ? pal.btnActiveBg : pal.btnBg;
    ctx.fill();
    ctx.strokeStyle = anim.isClicked ? pal.btnActiveBorder : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    const fg = anim.isClicked ? pal.btnActiveText : pal.btnText;
    const btnLabel = anim.isClicked ? layer.activeButtonLabel || 'Following' : layer.buttonLabel || 'Follow';
    drawVectorPath(
      ctx,
      anim.isClicked ? SOCIAL_VECTOR_PATHS.check : SOCIAL_VECTOR_PATHS.plus,
      -52,
      -9,
      18,
      {stroke: fg, lineWidth: 2.6},
    );
    ctx.font = `700 16px ${fontStack}`;
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(btnLabel, -26, 1);
    ctx.restore();
  } else {
    // INSTAGRAM: Transparent Floating Camera Vector + 'kalam_e_aamiria' + Follow Button/Badge
    const ix = 22;
    const iy = viewH / 2 - 28;
    const isize = 56;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ix, iy, isize, isize, 16);
    if (layer.themeStyle === 'brand') {
      const igGrad = ctx.createLinearGradient(ix, iy + isize, ix + isize, iy);
      igGrad.addColorStop(0, '#F58529');
      igGrad.addColorStop(0.35, '#DD2A7B');
      igGrad.addColorStop(0.7, '#8134AF');
      igGrad.addColorStop(1, '#515BD4');
      ctx.fillStyle = igGrad;
    } else {
      ctx.fillStyle = layer.themeStyle === 'mono-light' ? '#0A0A0A' : '#FFFFFF';
    }
    ctx.fill();

    ctx.shadowColor = 'transparent';
    const camStroke = layer.themeStyle === 'mono-dark' ? '#000000' : '#FFFFFF';
    ctx.strokeStyle = camStroke;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.roundRect(ix + 11, iy + 11, isize - 22, isize - 22, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix + isize / 2, iy + isize / 2, 8.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix + isize - 18.5, iy + 18.5, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = camStroke;
    ctx.fill();
    ctx.restore();

    const textX = 92;
    const maxTitleW = 234;
    ctx.font = `800 23px ${fontStack}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const handleStr = fitTruncatedText(
      ctx,
      layer.title || 'kalam_e_aamiria',
      maxTitleW - (layer.verified ? 26 : 0),
    );
    drawHaloText(handleStr, textX, 42, pal.titleColor, 4);

    if (layer.verified) {
      const tw = ctx.measureText(handleStr).width;
      const vx = textX + tw + 13;
      const vy = 42;
      ctx.beginPath();
      ctx.arc(vx, vy, 9, 0, Math.PI * 2);
      ctx.fillStyle = pal.verifiedFill;
      ctx.fill();
      drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.verifiedCheck, vx - 7.5, vy - 7.5, 15, {
        stroke: pal.verifiedCheck,
        lineWidth: 2.6,
      });
    }

    ctx.font = `600 14px ${fontStack}`;
    drawHaloText(
      fitTruncatedText(ctx, layer.subtitle || 'Instagram', maxTitleW),
      textX,
      69,
      pal.subtitleColor,
      3,
    );

    const btnW = 146;
    const btnH = 44;
    const btnCx = viewW - 18 - btnW / 2;
    const btnCy = viewH / 2;

    if (anim.rippleProgress > 0 && anim.rippleProgress < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - anim.rippleProgress) * 0.65;
      ctx.beginPath();
      const pad = anim.rippleProgress * 16;
      ctx.roundRect(btnCx - btnW / 2 - pad, btnCy - btnH / 2 - pad * 0.65, btnW + pad * 2, btnH + pad * 1.3, 16);
      ctx.strokeStyle = layer.themeStyle === 'brand' ? '#DD2A7B' : '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(btnCx, btnCy);
    ctx.scale(anim.buttonPressScale, anim.buttonPressScale);
    ctx.beginPath();
    ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    if (!anim.isClicked && layer.themeStyle === 'brand') {
      const btnGrad = ctx.createLinearGradient(-btnW / 2, 0, btnW / 2, 0);
      btnGrad.addColorStop(0, '#F58529');
      btnGrad.addColorStop(0.5, '#DD2A7B');
      btnGrad.addColorStop(1, '#8134AF');
      ctx.fillStyle = btnGrad;
    } else {
      ctx.fillStyle = anim.isClicked ? pal.btnActiveBg : pal.btnBg;
    }
    ctx.fill();

    ctx.strokeStyle = anim.isClicked ? pal.btnActiveBorder : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    if (anim.isClicked && anim.badgeShimmer > 0 && anim.badgeShimmer < 1) {
      ctx.save();
      ctx.clip();
      const sx = -btnW + anim.badgeShimmer * btnW * 2.4;
      const shimmerGrad = ctx.createLinearGradient(sx, -btnH / 2, sx + 48, btnH / 2);
      shimmerGrad.addColorStop(0, 'rgba(255,255,255,0)');
      shimmerGrad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
      shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimmerGrad;
      ctx.fillRect(-btnW / 2, -btnH / 2, btnW, btnH);
      ctx.restore();
    }

    const fg = anim.isClicked ? pal.btnActiveText : pal.btnText;
    const btnLabel = anim.isClicked ? layer.activeButtonLabel || 'Following' : layer.buttonLabel || 'Follow';
    if (anim.isClicked) {
      drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.check, -52, -9, 18, {stroke: fg, lineWidth: 2.6});
      ctx.font = `700 16px ${fontStack}`;
      ctx.fillStyle = fg;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(btnLabel, -26, 1);
    } else {
      ctx.font = `700 16px ${fontStack}`;
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btnLabel, 0, 1);
    }
    ctx.restore();
  }

  // Crisp Animated Vector Pointer Cursor
  if (anim.cursorVisible && anim.cursorOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = anim.alpha * anim.cursorOpacity;
    ctx.translate(anim.cursorX, anim.cursorY);
    ctx.scale(anim.cursorScale, anim.cursorScale);
    drawVectorPath(ctx, SOCIAL_VECTOR_PATHS.cursor, -6, -4, 30, {
      fill: '#FFFFFF',
      stroke: '#000000',
      lineWidth: 2.2,
    });
    ctx.restore();
  }

  ctx.restore();
}
