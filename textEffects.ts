export type TextEffectCategory =
  | 'All'
  | 'Creator Pop'
  | 'Kinetic Intro'
  | 'Glitch & RGB'
  | '3D & Extrude'
  | 'Captions'
  | 'Cinematic'
  | 'Glow & Neon'
  | 'Reveal & Type'
  | 'Bounce & Elastic'
  | 'Minimal B&W';

export type TextMotionType =
  | 'none'
  | 'pop-spring'
  | 'slam-in'
  | 'bounce-up'
  | 'bounce-down'
  | 'elastic-scale'
  | 'whip-left'
  | 'whip-right'
  | 'slide-up-fade'
  | 'slide-down-fade'
  | 'zoom-blur'
  | 'zoom-out-settle'
  | 'typewriter'
  | 'word-karaoke'
  | 'letter-wave'
  | 'letter-drop'
  | 'letter-scatter'
  | 'tracking-expand'
  | 'tracking-compress'
  | 'glitch-jitter'
  | 'rgb-pulse'
  | 'flip-x'
  | 'flip-y'
  | 'spin-in'
  | 'swing-pendulum'
  | 'heartbeat'
  | 'float-hover'
  | 'shake-impact'
  | 'curtain-wipe'
  | 'split-reveal'
  | 'flicker-neon'
  | 'roll-marquee';

export interface TextEffectPreset {
  id: string;
  index: number; // 1..100
  name: string;
  category: Exclude<TextEffectCategory, 'All'>;
  motion: TextMotionType;
  fillStyle: 'solid' | 'gradient-v' | 'gradient-h' | 'chrome' | 'hollow';
  fillColors: [string, string];
  strokeColor?: string;
  strokeWidth?: number;
  extrudeDepth?: number;
  extrudeColor?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  glowColor?: string;
  glowBlur?: number;
  boxBg?: string;
  boxRadius?: number;
  boxSkew?: number;
  boxBorder?: string;
  rgbSplit?: number;
  uppercase?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlightActiveWord?: string;
}

export const TEXT_EFFECT_CATEGORIES: TextEffectCategory[] = [
  'All',
  'Creator Pop',
  'Kinetic Intro',
  'Glitch & RGB',
  '3D & Extrude',
  'Captions',
  'Cinematic',
  'Glow & Neon',
  'Reveal & Type',
  'Bounce & Elastic',
  'Minimal B&W',
];

type RawEffectTuple = [
  string, // name
  Exclude<TextEffectCategory, 'All'>,
  TextMotionType,
  Partial<Omit<TextEffectPreset, 'id' | 'index' | 'name' | 'category' | 'motion'>>,
];

const RAW_100_EFFECTS: RawEffectTuple[] = [
  // 1-10: Creator Pop (MrBeast / Hormozi / Shorts / YouTube Thumbnail styles)
  ['Beast Pop Gold', 'Creator Pop', 'pop-spring', {fillStyle: 'gradient-v', fillColors: ['#FFF275', '#F59E0B'], strokeColor: '#000000', strokeWidth: 10, shadowColor: '#000000', shadowOffsetY: 9, shadowBlur: 0, uppercase: true}],
  ['Viral White Slam', 'Creator Pop', 'slam-in', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 11, shadowColor: 'rgba(0,0,0,0.9)', shadowOffsetY: 10, shadowBlur: 4, uppercase: true}],
  ['Hormozi Green Pop', 'Creator Pop', 'word-karaoke', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 9, highlightActiveWord: '#22C55E', shadowColor: '#000000', shadowOffsetY: 7, uppercase: true}],
  ['Shorts Alert Red', 'Creator Pop', 'shake-impact', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#EF4444', boxRadius: 10, strokeColor: '#000000', strokeWidth: 4, uppercase: true}],
  ['Thumbnail Yellow Punch', 'Creator Pop', 'elastic-scale', {fillStyle: 'solid', fillColors: ['#FACC15', '#FACC15'], strokeColor: '#000000', strokeWidth: 12, shadowColor: '#000000', shadowOffsetX: 6, shadowOffsetY: 8, uppercase: true}],
  ['Creator Sticker Cut', 'Creator Pop', 'pop-spring', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], strokeColor: '#FFFFFF', strokeWidth: 14, shadowColor: 'rgba(0,0,0,0.65)', shadowBlur: 18, shadowOffsetY: 8, uppercase: true}],
  ['Sub Counter Beat', 'Creator Pop', 'heartbeat', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#DC2626', boxRadius: 14, shadowColor: 'rgba(220,38,38,0.45)', shadowBlur: 20, uppercase: true}],
  ['Hyper Cyan Pop', 'Creator Pop', 'bounce-up', {fillStyle: 'gradient-v', fillColors: ['#67E8F9', '#0284C7'], strokeColor: '#000000', strokeWidth: 10, shadowColor: '#000000', shadowOffsetY: 8, uppercase: true}],
  ['Comic Boom Tilt', 'Creator Pop', 'slam-in', {fillStyle: 'solid', fillColors: ['#FDE047', '#FDE047'], strokeColor: '#000000', strokeWidth: 10, extrudeDepth: 8, extrudeColor: '#EF4444', italic: true, uppercase: true}],
  ['Reaction Shout', 'Creator Pop', 'shake-impact', {fillStyle: 'gradient-v', fillColors: ['#FFFFFF', '#D4D4D8'], strokeColor: '#000000', strokeWidth: 12, boxBg: '#000000', boxSkew: -10, uppercase: true}],

  // 11-20: Kinetic Intro
  ['Whip Pan Left', 'Kinetic Intro', 'whip-left', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.75)', shadowBlur: 16, uppercase: true}],
  ['Whip Pan Right', 'Kinetic Intro', 'whip-right', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.75)', shadowBlur: 16, uppercase: true}],
  ['Zoom Blur Impact', 'Kinetic Intro', 'zoom-blur', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 5, uppercase: true}],
  ['Kinetic Stomp', 'Kinetic Intro', 'slam-in', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#111111', boxBorder: '#FFFFFF', boxRadius: 4, uppercase: true}],
  ['Speed Skew In', 'Kinetic Intro', 'whip-left', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], boxBg: '#FFFFFF', boxSkew: -14, uppercase: true, italic: true}],
  ['Spin Reveal Pro', 'Kinetic Intro', 'spin-in', {fillStyle: 'gradient-h', fillColors: ['#FFFFFF', '#A1A1AA'], strokeColor: '#000000', strokeWidth: 6, uppercase: true}],
  ['Flip X Broadcast', 'Kinetic Intro', 'flip-x', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: 'rgba(0,0,0,0.85)', boxBorder: 'rgba(255,255,255,0.4)', boxRadius: 8, uppercase: true}],
  ['Flip Y Swivel', 'Kinetic Intro', 'flip-y', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 14, uppercase: true}],
  ['Headline Ticker', 'Kinetic Intro', 'roll-marquee', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], boxBg: '#FFFFFF', boxRadius: 0, uppercase: true}],
  ['Zoom Out Settle', 'Kinetic Intro', 'zoom-out-settle', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.7)', shadowBlur: 20, uppercase: true}],

  // 21-30: Glitch & RGB
  ['RGB Split Cut', 'Glitch & RGB', 'glitch-jitter', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], rgbSplit: 6, uppercase: true}],
  ['VHS Tracking Error', 'Glitch & RGB', 'rgb-pulse', {fillStyle: 'solid', fillColors: ['#F4F4F5', '#D4D4D8'], rgbSplit: 9, shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 8, italic: true, uppercase: true}],
  ['Cyber Signal Snap', 'Glitch & RGB', 'glitch-jitter', {fillStyle: 'solid', fillColors: ['#22D3EE', '#22D3EE'], rgbSplit: 7, strokeColor: '#000000', strokeWidth: 4, uppercase: true}],
  ['Static Jitter B&W', 'Glitch & RGB', 'glitch-jitter', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 6, rgbSplit: 3, uppercase: true}],
  ['Chromatic Slam', 'Glitch & RGB', 'slam-in', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], rgbSplit: 10, uppercase: true}],
  ['Analog Ghost', 'Glitch & RGB', 'rgb-pulse', {fillStyle: 'hollow', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#FFFFFF', strokeWidth: 3, rgbSplit: 6, uppercase: true}],
  ['Terminal Glitch', 'Glitch & RGB', 'typewriter', {fillStyle: 'solid', fillColors: ['#4ADE80', '#4ADE80'], boxBg: 'rgba(0,0,0,0.88)', boxRadius: 4, rgbSplit: 3}],
  ['Overdrive Flicker', 'Glitch & RGB', 'flicker-neon', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], rgbSplit: 8, glowColor: '#EF4444', glowBlur: 18, uppercase: true}],
  ['Matrix Decode', 'Glitch & RGB', 'letter-scatter', {fillStyle: 'solid', fillColors: ['#E5E5E5', '#E5E5E5'], rgbSplit: 4, shadowColor: '#000000', shadowBlur: 10, uppercase: true}],
  ['Broadcast Distortion', 'Glitch & RGB', 'shake-impact', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#000000', boxBorder: '#FFFFFF', rgbSplit: 5, uppercase: true}],

  // 31-40: 3D & Extrude
  ['3D Obsidian Block', '3D & Extrude', 'pop-spring', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 4, extrudeDepth: 12, extrudeColor: '#262626', uppercase: true}],
  ['3D Chrome Steel', '3D & Extrude', 'zoom-out-settle', {fillStyle: 'chrome', fillColors: ['#FFFFFF', '#737373'], strokeColor: '#000000', strokeWidth: 4, extrudeDepth: 10, extrudeColor: '#171717', uppercase: true}],
  ['3D Gold Trophy', '3D & Extrude', 'elastic-scale', {fillStyle: 'gradient-v', fillColors: ['#FEF08A', '#CA8A04'], strokeColor: '#422006', strokeWidth: 4, extrudeDepth: 11, extrudeColor: '#713F12', uppercase: true}],
  ['3D Crimson Tower', '3D & Extrude', 'slam-in', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 4, extrudeDepth: 12, extrudeColor: '#991B1B', uppercase: true}],
  ['3D Ice Slab', '3D & Extrude', 'slide-up-fade', {fillStyle: 'gradient-v', fillColors: ['#E0F2FE', '#38BDF8'], strokeColor: '#0C4A6E', strokeWidth: 4, extrudeDepth: 10, extrudeColor: '#0369A1', uppercase: true}],
  ['3D Brutalist White', '3D & Extrude', 'bounce-up', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], strokeColor: '#FFFFFF', strokeWidth: 5, extrudeDepth: 10, extrudeColor: '#FFFFFF', uppercase: true}],
  ['3D Arcade Stack', '3D & Extrude', 'letter-wave', {fillStyle: 'gradient-v', fillColors: ['#FDE047', '#F97316'], strokeColor: '#000000', strokeWidth: 5, extrudeDepth: 12, extrudeColor: '#18181B', uppercase: true}],
  ['3D Titanium Bevel', '3D & Extrude', 'flip-x', {fillStyle: 'chrome', fillColors: ['#F4F4F5', '#52525B'], strokeColor: '#09090B', strokeWidth: 3, extrudeDepth: 8, extrudeColor: '#27272A', uppercase: true}],
  ['3D Hard Comic', '3D & Extrude', 'pop-spring', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 7, extrudeDepth: 14, extrudeColor: '#000000', italic: true, uppercase: true}],
  ['3D Emerald Relief', '3D & Extrude', 'zoom-blur', {fillStyle: 'gradient-v', fillColors: ['#A7F3D0', '#10B981'], strokeColor: '#064E3B', strokeWidth: 4, extrudeDepth: 10, extrudeColor: '#065F46', uppercase: true}],

  // 41-50: Captions & Subtitles
  ['YouTube Clean CC', 'Captions', 'slide-up-fade', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: 'rgba(0,0,0,0.82)', boxRadius: 8}],
  ['Karaoke Yellow Highlight', 'Captions', 'word-karaoke', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 7, highlightActiveWord: '#FACC15', uppercase: true}],
  ['Karaoke White Pill', 'Captions', 'word-karaoke', {fillStyle: 'solid', fillColors: ['#A3A3A3', '#A3A3A3'], highlightActiveWord: '#FFFFFF', boxBg: 'rgba(0,0,0,0.75)', boxRadius: 12}],
  ['Docu Lower Third', 'Captions', 'curtain-wipe', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: 'rgba(0,0,0,0.9)', boxBorder: '#FFFFFF', boxRadius: 2}],
  ['Cinema Yellow Sub', 'Captions', 'slide-up-fade', {fillStyle: 'solid', fillColors: ['#FDE047', '#FDE047'], strokeColor: '#000000', strokeWidth: 5, shadowColor: '#000000', shadowOffsetY: 3}],
  ['Reels White Box', 'Captions', 'pop-spring', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], boxBg: '#FFFFFF', boxRadius: 10}],
  ['Podcast Speaker Tag', 'Captions', 'word-karaoke', {fillStyle: 'solid', fillColors: ['#E5E5E5', '#E5E5E5'], highlightActiveWord: '#38BDF8', boxBg: 'rgba(10,10,10,0.86)', boxRadius: 10}],
  ['News Breaking Bar', 'Captions', 'whip-left', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#B91C1C', boxRadius: 2, uppercase: true}],
  ['Interview Crisp Shadow', 'Captions', 'none', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.95)', shadowBlur: 12, shadowOffsetY: 3}],
  ['Bold Dual Outline CC', 'Captions', 'bounce-up', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 10, uppercase: true}],

  // 51-60: Cinematic
  ['Epic Tracking Wide', 'Cinematic', 'tracking-expand', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 24, uppercase: true}],
  ['Noir Film Title', 'Cinematic', 'tracking-compress', {fillStyle: 'solid', fillColors: ['#F5F5F5', '#F5F5F5'], shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 18, uppercase: true}],
  ['Trailer Silver Fade', 'Cinematic', 'zoom-out-settle', {fillStyle: 'chrome', fillColors: ['#FFFFFF', '#A3A3A3'], shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 22, uppercase: true}],
  ['Gold Prestige Serif', 'Cinematic', 'tracking-expand', {fillStyle: 'gradient-v', fillColors: ['#FEF3C7', '#D97706'], shadowColor: 'rgba(0,0,0,0.85)', shadowBlur: 18, uppercase: true}],
  ['Chapter Reveal Split', 'Cinematic', 'split-reveal', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], underline: true, uppercase: true}],
  ['Documentary Curtain', 'Cinematic', 'curtain-wipe', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.75)', shadowBlur: 10}],
  ['Slow Drift Credits', 'Cinematic', 'float-hover', {fillStyle: 'solid', fillColors: ['#E5E5E5', '#E5E5E5'], shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 12, uppercase: true}],
  ['Anamorphic Glow Title', 'Cinematic', 'tracking-expand', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], glowColor: 'rgba(255,255,255,0.65)', glowBlur: 26, uppercase: true}],
  ['Focus Pull Blur', 'Cinematic', 'zoom-blur', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.7)', shadowBlur: 14}],
  ['Director Cut Framed', 'Cinematic', 'slide-down-fade', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: 'rgba(0,0,0,0.6)', boxBorder: 'rgba(255,255,255,0.6)', boxRadius: 0, uppercase: true}],

  // 61-70: Glow & Neon
  ['Pure White Halo', 'Glow & Neon', 'flicker-neon', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], glowColor: '#FFFFFF', glowBlur: 28, uppercase: true}],
  ['Electric Ice Neon', 'Glow & Neon', 'flicker-neon', {fillStyle: 'solid', fillColors: ['#E0F2FE', '#E0F2FE'], strokeColor: '#38BDF8', strokeWidth: 3, glowColor: '#0EA5E9', glowBlur: 30, uppercase: true}],
  ['Crimson Laser Glow', 'Glow & Neon', 'heartbeat', {fillStyle: 'solid', fillColors: ['#FEE2E2', '#FEE2E2'], strokeColor: '#EF4444', strokeWidth: 3, glowColor: '#DC2626', glowBlur: 30, uppercase: true}],
  ['Amber Street Sign', 'Glow & Neon', 'flicker-neon', {fillStyle: 'solid', fillColors: ['#FEF3C7', '#FEF3C7'], strokeColor: '#F59E0B', strokeWidth: 3, glowColor: '#D97706', glowBlur: 28, uppercase: true}],
  ['Emerald Tube Neon', 'Glow & Neon', 'float-hover', {fillStyle: 'solid', fillColors: ['#D1FAE5', '#D1FAE5'], strokeColor: '#10B981', strokeWidth: 3, glowColor: '#059669', glowBlur: 28, uppercase: true}],
  ['Hollow White Neon', 'Glow & Neon', 'flicker-neon', {fillStyle: 'hollow', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#FFFFFF', strokeWidth: 3, glowColor: '#FFFFFF', glowBlur: 24, uppercase: true}],
  ['Sunburst Aura', 'Glow & Neon', 'zoom-out-settle', {fillStyle: 'gradient-h', fillColors: ['#FDE047', '#F97316'], glowColor: '#F59E0B', glowBlur: 26, uppercase: true}],
  ['Moonlight Outline', 'Glow & Neon', 'float-hover', {fillStyle: 'hollow', fillColors: ['#E2E8F0', '#E2E8F0'], strokeColor: '#E2E8F0', strokeWidth: 4, glowColor: '#94A3B8', glowBlur: 22, uppercase: true}],
  ['Studio Rim Light', 'Glow & Neon', 'slide-up-fade', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], glowColor: 'rgba(255,255,255,0.75)', glowBlur: 20}],
  ['Pulse Beacon', 'Glow & Neon', 'heartbeat', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#000000', boxBorder: '#FFFFFF', glowColor: '#FFFFFF', glowBlur: 20, uppercase: true}],

  // 71-80: Reveal & Type
  ['Classic Typewriter', 'Reveal & Type', 'typewriter', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.85)', shadowBlur: 8}],
  ['Mono Box Typewriter', 'Reveal & Type', 'typewriter', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#000000', boxBorder: '#FFFFFF', boxRadius: 4}],
  ['Inverted Print Type', 'Reveal & Type', 'typewriter', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], boxBg: '#FFFFFF', boxRadius: 4}],
  ['Letter Drop Cascade', 'Reveal & Type', 'letter-drop', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 6, uppercase: true}],
  ['Letter Scatter Lock', 'Reveal & Type', 'letter-scatter', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 12, uppercase: true}],
  ['Curtain Mask Sweep', 'Reveal & Type', 'curtain-wipe', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], underline: true, uppercase: true}],
  ['Split Center Unfold', 'Reveal & Type', 'split-reveal', {fillStyle: 'gradient-v', fillColors: ['#FFFFFF', '#D4D4D8'], uppercase: true}],
  ['Slide Up Masked', 'Reveal & Type', 'slide-up-fade', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.75)', shadowBlur: 10}],
  ['Slide Down Headline', 'Reveal & Type', 'slide-down-fade', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: 'rgba(0,0,0,0.75)', boxRadius: 6, uppercase: true}],
  ['Wave Typing Flow', 'Reveal & Type', 'letter-wave', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 5}],

  // 81-90: Bounce & Elastic
  ['Rubber Elastic Pop', 'Bounce & Elastic', 'elastic-scale', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 9, uppercase: true}],
  ['Spring Jump Up', 'Bounce & Elastic', 'bounce-up', {fillStyle: 'gradient-v', fillColors: ['#FFFFFF', '#E5E5E5'], strokeColor: '#000000', strokeWidth: 8, shadowColor: '#000000', shadowOffsetY: 8, uppercase: true}],
  ['Gravity Drop Bounce', 'Bounce & Elastic', 'bounce-down', {fillStyle: 'solid', fillColors: ['#FACC15', '#FACC15'], strokeColor: '#000000', strokeWidth: 8, uppercase: true}],
  ['Ocean Letter Wave', 'Bounce & Elastic', 'letter-wave', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 7, uppercase: true}],
  ['Pendulum Swing', 'Bounce & Elastic', 'swing-pendulum', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#000000', boxBorder: '#FFFFFF', boxRadius: 10, uppercase: true}],
  ['Beat Drop Pulse', 'Bounce & Elastic', 'heartbeat', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 10, uppercase: true}],
  ['Bouncy Tag Sticker', 'Bounce & Elastic', 'pop-spring', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], boxBg: '#FACC15', boxRadius: 14, shadowColor: '#000000', shadowOffsetY: 6, uppercase: true}],
  ['Floating Cloud Bob', 'Bounce & Elastic', 'float-hover', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.65)', shadowBlur: 18}],
  ['Spin Bounce Snap', 'Bounce & Elastic', 'spin-in', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 8, uppercase: true}],
  ['Micro Quake Punch', 'Bounce & Elastic', 'shake-impact', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 9, uppercase: true}],

  // 91-100: Minimal B&W (Editorial / Leica / Pure Monochrome)
  ['Pure White Minimal', 'Minimal B&W', 'slide-up-fade', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], shadowColor: 'rgba(0,0,0,0.55)', shadowBlur: 10}],
  ['Obsidian Ink Label', 'Minimal B&W', 'curtain-wipe', {fillStyle: 'solid', fillColors: ['#000000', '#000000'], boxBg: '#FFFFFF', boxRadius: 2, uppercase: true}],
  ['Inverted Studio Bar', 'Minimal B&W', 'whip-left', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: '#000000', boxBorder: '#FFFFFF', boxRadius: 0, uppercase: true}],
  ['Swiss Grid Rule', 'Minimal B&W', 'split-reveal', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], underline: true, uppercase: true}],
  ['Hollow Wireframe', 'Minimal B&W', 'tracking-expand', {fillStyle: 'hollow', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#FFFFFF', strokeWidth: 3, uppercase: true}],
  ['Silver Editorial', 'Minimal B&W', 'zoom-out-settle', {fillStyle: 'gradient-v', fillColors: ['#FFFFFF', '#A3A3A3'], shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 12}],
  ['Monochrome Stamp', 'Minimal B&W', 'slam-in', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: 'transparent', boxBorder: '#FFFFFF', boxRadius: 4, uppercase: true}],
  ['Graphite Capsule', 'Minimal B&W', 'pop-spring', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], boxBg: 'rgba(20,20,20,0.92)', boxBorder: 'rgba(255,255,255,0.25)', boxRadius: 999}],
  ['Gallery Plinth', 'Minimal B&W', 'slide-down-fade', {fillStyle: 'solid', fillColors: ['#E5E5E5', '#E5E5E5'], boxBg: 'rgba(0,0,0,0.82)', boxRadius: 0}],
  ['Ultra Contrast Noir', 'Minimal B&W', 'letter-drop', {fillStyle: 'solid', fillColors: ['#FFFFFF', '#FFFFFF'], strokeColor: '#000000', strokeWidth: 8, shadowColor: '#000000', shadowOffsetY: 6, uppercase: true}],
];

export const TEXT_EFFECTS_100: TextEffectPreset[] = RAW_100_EFFECTS.map(
  ([name, category, motion, opts], i) => ({
    id: `yt-fx-${String(i + 1).padStart(3, '0')}`,
    index: i + 1,
    name,
    category,
    motion,
    fillStyle: opts.fillStyle ?? 'solid',
    fillColors: opts.fillColors ?? ['#FFFFFF', '#FFFFFF'],
    ...opts,
  }),
);
