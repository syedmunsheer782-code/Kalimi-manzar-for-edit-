import {TextAnimationId} from '../types/editor';

export interface TextAnimationPreset {
  id: TextAnimationId;
  name: string;
  tag: string;
  cssClass: string;
}

/**
 * Lightweight set of 12 smooth Text Animations using pure GPU-friendly CSS/transform motion
 * in previews and matching lightweight math transforms in live canvas & 1080p/4K export.
 */
export const TEXT_ANIMATIONS_12: TextAnimationPreset[] = [
  {id: 'fade-in', name: 'Fade In', tag: 'Opacity', cssClass: 'tx-anim-fade-in'},
  {id: 'slide-up', name: 'Slide Up', tag: 'Translate Y', cssClass: 'tx-anim-slide-up'},
  {id: 'slide-down', name: 'Slide Down', tag: 'Translate Y', cssClass: 'tx-anim-slide-down'},
  {id: 'slide-left', name: 'Slide Left', tag: 'Translate X', cssClass: 'tx-anim-slide-left'},
  {id: 'slide-right', name: 'Slide Right', tag: 'Translate X', cssClass: 'tx-anim-slide-right'},
  {id: 'pop-in', name: 'Pop In', tag: 'Scale Pop', cssClass: 'tx-anim-pop-in'},
  {id: 'zoom-out', name: 'Zoom Out', tag: 'Scale Out', cssClass: 'tx-anim-zoom-out'},
  {id: 'typewriter', name: 'Typewriter', tag: 'Char Reveal', cssClass: 'tx-anim-typewriter'},
  {id: 'wipe-reveal', name: 'Wipe Reveal', tag: 'Clip Mask', cssClass: 'tx-anim-wipe-reveal'},
  {id: 'bounce-subtle', name: 'Bounce Subtle', tag: 'Soft Spring', cssClass: 'tx-anim-bounce-subtle'},
  {id: 'blur-in', name: 'Blur In', tag: 'Soft Focus', cssClass: 'tx-anim-blur-in'},
  {id: 'rotate-in', name: 'Rotate In', tag: 'Angle Ease', cssClass: 'tx-anim-rotate-in'},
];

export interface TextAnimTransform {
  opacity: number; // 0..1 multiplier
  dxFraction: number; // fraction of canvas width
  dyFraction: number; // fraction of canvas height
  scale: number; // scale multiplier
  rotationRad: number; // radians delta
  blurPx: number; // subtle blur px
  wipeProgress: number; // 0..1 clip-rect reveal
  typewriterFraction: number; // 0..1 character reveal (1 = all chars)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(t: number, overshoot = 1.55): number {
  const x = clamp01(t);
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
}

/**
 * Ultra-lightweight deterministic evaluator for the 12 smooth text animations.
 * Keeps frame-render cost near zero across mobile/desktop previews and chunked video exports.
 */
export function evaluateTextAnimation(
  animId: TextAnimationId | undefined,
  localT: number,
  duration: number,
  animSpeed: number,
): TextAnimTransform {
  const identity: TextAnimTransform = {
    opacity: 1,
    dxFraction: 0,
    dyFraction: 0,
    scale: 1,
    rotationRad: 0,
    blurPx: 0,
    wipeProgress: 1,
    typewriterFraction: 1,
  };

  if (!animId || animId === 'none') return identity;

  const speed = Math.max(0.25, Math.min(3, animSpeed || 1));
  const introDur = Math.min(Math.max(0.25, duration * 0.65), 0.72 / speed);
  const p = clamp01(localT / Math.max(0.05, introDur));
  const eased = easeOutCubic(p);

  switch (animId) {
    case 'fade-in':
      return {...identity, opacity: eased};

    case 'slide-up':
      return {
        ...identity,
        opacity: clamp01(p * 1.45),
        dyFraction: (1 - eased) * 0.085,
      };

    case 'slide-down':
      return {
        ...identity,
        opacity: clamp01(p * 1.45),
        dyFraction: -(1 - eased) * 0.085,
      };

    case 'slide-left':
      return {
        ...identity,
        opacity: clamp01(p * 1.45),
        dxFraction: (1 - eased) * 0.12,
      };

    case 'slide-right':
      return {
        ...identity,
        opacity: clamp01(p * 1.45),
        dxFraction: -(1 - eased) * 0.12,
      };

    case 'pop-in': {
      const pop = easeOutBack(p, 1.7);
      return {
        ...identity,
        opacity: clamp01(p * 2.4),
        scale: Math.max(0.2, 0.55 + 0.45 * pop),
      };
    }

    case 'zoom-out':
      return {
        ...identity,
        opacity: eased,
        scale: 1.32 - 0.32 * eased,
      };

    case 'typewriter': {
      const revealDur = Math.min(Math.max(0.35, duration * 0.72), 1.35 / speed);
      return {
        ...identity,
        typewriterFraction: clamp01(localT / Math.max(0.05, revealDur)),
      };
    }

    case 'wipe-reveal':
      return {
        ...identity,
        opacity: clamp01(p * 3),
        wipeProgress: eased,
      };

    case 'bounce-subtle': {
      const spring = easeOutBack(p, 1.2);
      const settle = p < 1 ? Math.sin(p * Math.PI * 2) * (1 - p) * 0.012 : 0;
      return {
        ...identity,
        opacity: clamp01(p * 2.2),
        dyFraction: (1 - spring) * 0.065 + settle,
        scale: 0.94 + 0.06 * eased,
      };
    }

    case 'blur-in':
      return {
        ...identity,
        opacity: eased,
        scale: 1.05 - 0.05 * eased,
        blurPx: (1 - eased) * 9,
      };

    case 'rotate-in':
      return {
        ...identity,
        opacity: clamp01(p * 1.6),
        scale: 0.86 + 0.14 * eased,
        rotationRad: (-(1 - eased) * 14 * Math.PI) / 180,
      };

    default:
      return identity;
  }
}
