export type MediaKind = 'photo' | 'video';

export type AspectRatioId = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9';

export type ResolutionId =
  | '4k'
  | '2k'
  | '1080p'
  | '720p'
  | '480p'
  | '360p'
  | '240p'
  | '144p';

export type EditorToolTab =
  | 'enhance'
  | 'filters'
  | 'adjust'
  | 'chroma'
  | 'pip'
  | 'social'
  | 'text'
  | 'transitions'
  | 'mask'
  | 'spot'
  | 'keyframes'
  | 'audio';

export type EnhanceModeId =
  | 'none'
  | '4k-clarity'
  | 'photo-pro'
  | 'photo-portrait'
  | 'photo-hdr'
  | 'photo-leica-bw'
  | 'photo-night'
  | 'photo-architect'
  | 'video-4k-cinema'
  | 'video-60fps-crisp'
  | 'video-lowlight'
  | 'video-broadcast'
  | 'video-noir';

export type TransitionId =
  | 'none'
  | 'cross-dissolve'
  | 'mix-fade'
  | 'fade-black'
  | 'flash-white'
  | 'pull-in'
  | 'pull-out'
  | 'whip-left'
  | 'whip-right'
  | 'whip-up'
  | 'whip-down'
  | 'slide-left'
  | 'slide-right'
  | 'spin-cw'
  | 'spin-ccw'
  | 'blur-dissolve'
  | 'wipe-horizontal'
  | 'wipe-vertical'
  | 'iris-circle'
  | 'split-open'
  | 'glitch-cut';

export type MaskShapeId =
  | 'none'
  | 'circle'
  | 'rectangle'
  | 'split'
  | 'filmstrip'
  | 'heart'
  | 'star'
  | 'diamond'
  | 'mirror'
  | 'brush';

export type EasingId = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';

export interface ChromaKeyConfig {
  enabled: boolean;
  keyColor: string; // Any hex background color (#00B140, #0047AB, #000000, #FFFFFF, etc.)
  strength: number; // 0 to 100 (color tolerance / strength — neutral 0 default)
  feather: number; // 0 to 100 (edge softening / feather — neutral 0 default)
  spillSuppression: number; // 0 to 100 (color-spill halo cleanup — neutral 0 default)
  shadowTolerance: number; // 0 to 100 (uneven backdrop light/shadow range — neutral 0 default)
}

export interface AdjustmentValues {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  exposure: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  saturation: number; // -100 to 100
  warmth: number; // -100 to 100
  sharpness: number; // 0 to 100
  clarity4k: number; // 0 to 100
  vignette: number; // 0 to 100
  grain: number; // 0 to 100
  fade: number; // 0 to 100
  sizeFilter?: number; // -100 to 100 (Size filter adjustment — starts at neutral 0 by default)
}

export interface ClipCrop {
  top: number; // 0 to 45 (%)
  right: number; // 0 to 45 (%)
  bottom: number; // 0 to 45 (%)
  left: number; // 0 to 45 (%)
}

export interface MaskConfig {
  shape: MaskShapeId;
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
  width: number; // 5 to 150 (%)
  height: number; // 5 to 150 (%)
  rotation: number; // -180 to 180 deg
  feather: number; // 0 to 100
  invert: boolean;
  brushSize?: number; // normalized 0.01..0.16
  brushStrokes?: SpotStroke[];
}

export interface KeyframeValues {
  posX: number; // -100 to 100 (% offset)
  posY: number; // -100 to 100 (% offset)
  scale: number; // 10 to 300 (%)
  rotation: number; // -360 to 360 (deg)
  opacity: number; // 0 to 100 (%)
  brightnessDelta: number; // -50 to 50
  contrastDelta: number; // -50 to 50
  maskScale: number; // 20 to 200 (%)
}

export interface KeyframeNode {
  id: string;
  time: number; // local time inside clip in seconds
  easing: EasingId;
  values: KeyframeValues;
}

export interface SpotStrokePoint {
  x: number; // normalized 0..1 relative to clip image
  y: number; // normalized 0..1 relative to clip image
}

export interface SpotStroke {
  id: string;
  mode: 'heal' | 'erase';
  size: number; // radius in normalized 0..0.15 of image min-dimension
  feather: number; // 0..1
  points: SpotStrokePoint[];
}

export interface MediaClip {
  id: string;
  name: string;
  kind: MediaKind;
  src: string; // blob URL or data URL
  processedSrc?: string; // data URL after spot removal / alpha cutout
  mimeType: string;
  width: number;
  height: number;
  duration: number; // seconds on timeline
  trimStart: number; // seconds inside source video
  sourceDuration: number; // total video duration
  speed: number; // 0.25 to 4
  scale?: number; // 10 to 300 (%) — proper visible auto-fit default 100%
  crop?: ClipCrop;
  volume: number; // 0 to 100
  muted: boolean;
  filterId: string;
  filterIntensity: number; // 0 to 100
  filterBrightness?: number; // -100 to 100
  filterSettings?: Record<string, {intensity: number; brightness: number}>;
  enhanceMode: EnhanceModeId;
  enhanceStrength: number; // 0 to 100
  adjustments: AdjustmentValues;
  chromaKey?: ChromaKeyConfig;
  mask: MaskConfig;
  keyframes: KeyframeNode[];
  spotStrokes: SpotStroke[];
  transitionOut: TransitionId;
  transitionDuration: number; // 0.2 to 2.5 seconds
}

export type TextAnimationId =
  | 'none'
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'pop-in'
  | 'zoom-out'
  | 'typewriter'
  | 'wipe-reveal'
  | 'bounce-subtle'
  | 'blur-in'
  | 'rotate-in';

export interface TextLayer {
  id: string;
  text: string;
  startTime: number; // seconds on global timeline
  duration: number; // seconds
  x: number; // 0..100 (% of canvas width)
  y: number; // 0..100 (% of canvas height)
  fontFamily: string;
  fontWeight: number;
  fontSize: number; // 16..180 (relative to 1080p height)
  letterSpacing: number; // -10..40
  lineHeight: number; // 0.8..2.2
  align: 'left' | 'center' | 'right';
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string;
  bgOpacity: number; // 0..100
  rotation: number; // -180..180
  scale: number; // 20..300 (%)
  opacity: number; // 0..100
  effectId: string; // one of 100 YouTube-style text effects
  textAnimation?: TextAnimationId; // one of 12 lightweight smooth text animations
  animSpeed: number; // 0.25..3
  keyframes: KeyframeNode[];
}

export interface AudioNRConfig {
  enabled: boolean;
  strength: number; // 0..100
  highPassHz: number; // 40..300
  lowPassHz: number; // 3000..18000
  humNotchHz: 0 | 50 | 60;
  voicePresence: number; // 0..100
  noiseGateThreshold: number; // -80..-10 dB
  normalize: boolean;
  trackName?: string;
  trackSrc?: string;
  trackMimeType?: string;
}

export interface PipLayer {
  id: string;
  name: string;
  kind: MediaKind;
  src: string;
  mimeType: string;
  width: number;
  height: number;
  startTime: number; // global timeline start (seconds)
  duration: number; // duration on timeline (seconds)
  sourceDuration: number;
  x: number; // 0..100 (% center X on canvas)
  y: number; // 0..100 (% center Y on canvas)
  scale: number; // 10..120 (% of canvas width)
  rotation: number; // -180..180 deg
  opacity: number; // 0..100 (%)
  borderRadius: number; // 0..50 (% corner roundness / circle)
  borderWidth: number; // 0..12 px crisp white frame
  volume: number; // 0..100
  muted: boolean;
  chromaKey?: ChromaKeyConfig;
}

export type SocialPlatformId = 'youtube' | 'facebook' | 'instagram';
export type SocialThemeStyle = 'brand' | 'mono-dark' | 'mono-light';

export interface SocialAnimationLayer {
  id: string;
  platform: SocialPlatformId;
  title: string; // Channel name (YouTube), Name first (Facebook), or Handle 'kalam_e_aamiria' (Instagram)
  subtitle: string;
  buttonLabel: string;
  activeButtonLabel: string;
  showActions: boolean; // YouTube: Like, Comment, Share bar
  showCursor: boolean; // Animated vector pointer clicking Subscribe / Follow
  verified: boolean; // Crisp vector verified badge
  themeStyle: SocialThemeStyle;
  startTime: number; // global timeline start (seconds)
  duration: number; // duration on timeline (seconds)
  x: number; // 0..100 (% center X on canvas)
  y: number; // 0..100 (% center Y on canvas)
  scale: number; // 25..220 (%)
  opacity: number; // 0..100 (%)
  animSpeed: number; // 0.5..2.0x
}

export interface ProjectState {
  id: string;
  name: string;
  mode: 'video' | 'photo';
  aspectRatio: AspectRatioId;
  resolution: ResolutionId;
  fps: 30 | 60;
  clips: MediaClip[];
  pipLayers?: PipLayer[];
  socialLayers?: SocialAnimationLayer[];
  textLayers: TextLayer[];
  audioNR: AudioNRConfig;
  updatedAt: number;
}

export const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  warmth: 0,
  sharpness: 0,
  clarity4k: 0,
  vignette: 0,
  grain: 0,
  fade: 0,
  sizeFilter: 0,
};

export const DEFAULT_CROP: ClipCrop = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export const DEFAULT_CHROMA_KEY: ChromaKeyConfig = {
  enabled: false,
  keyColor: '#00B140',
  strength: 0,
  feather: 0,
  spillSuppression: 0,
  shadowTolerance: 0,
};

export const DEFAULT_MASK: MaskConfig = {
  shape: 'none',
  x: 50,
  y: 50,
  width: 65,
  height: 65,
  rotation: 0,
  feather: 0,
  invert: false,
  brushSize: 28,
  brushStrokes: [],
};

export const DEFAULT_KEYFRAME_VALUES: KeyframeValues = {
  posX: 0,
  posY: 0,
  scale: 100,
  rotation: 0,
  opacity: 100,
  brightnessDelta: 0,
  contrastDelta: 0,
  maskScale: 100,
};

export const DEFAULT_AUDIO_NR: AudioNRConfig = {
  enabled: false,
  strength: 65,
  highPassHz: 110,
  lowPassHz: 12000,
  humNotchHz: 60,
  voicePresence: 35,
  noiseGateThreshold: -44,
  normalize: true,
};
