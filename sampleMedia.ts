import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_MASK,
  MediaClip,
} from '../types/editor';

/**
 * Generates crisp, high-resolution (1920x1080) procedural studio photographs entirely offline
 * so users immediately experience 4K clarity, transitions, filters, spot removal, masking,
 * and keyframes on first launch with zero external network dependencies.
 */
function generateStudioFrame(variant: 'architecture' | 'horizon' | 'portrait'): string {
  const w = 1920;
  const h = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (variant === 'architecture') {
    // High-contrast architectural monochrome light & geometric arches
    const sky = ctx.createLinearGradient(0, 0, w, h);
    sky.addColorStop(0, '#0a0a0c');
    sky.addColorStop(0.45, '#27272c');
    sky.addColorStop(1, '#08080a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Dramatic diagonal light shaft
    const beam = ctx.createLinearGradient(w * 0.15, 0, w * 0.85, h);
    beam.addColorStop(0, 'rgba(255,255,255,0.22)');
    beam.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, 0);
    ctx.lineTo(w * 0.65, 0);
    ctx.lineTo(w * 0.95, h);
    ctx.lineTo(w * 0.45, h);
    ctx.closePath();
    ctx.fill();

    // Architectural colonnade arches with crisp highlight edges
    for (let i = 0; i < 6; i++) {
      const px = 120 + i * 290;
      const colGrad = ctx.createLinearGradient(px, 0, px + 140, 0);
      colGrad.addColorStop(0, '#e5e5e5');
      colGrad.addColorStop(0.18, '#52525b');
      colGrad.addColorStop(0.85, '#141417');
      colGrad.addColorStop(1, '#050507');
      ctx.fillStyle = colGrad;
      ctx.fillRect(px, 190, 95, h - 190);

      // Arch curve
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px + 190, 320, 145, Math.PI, 0, false);
      ctx.stroke();
    }

    // Reflective obsidian floor with subtle horizon line
    const floor = ctx.createLinearGradient(0, h * 0.72, 0, h);
    floor.addColorStop(0, 'rgba(255,255,255,0.16)');
    floor.addColorStop(0.04, '#111114');
    floor.addColorStop(1, '#000000');
    ctx.fillStyle = floor;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Subtle test dust spot (great for demonstrating Spot Removal tool!)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(w * 0.74, h * 0.28, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (variant === 'horizon') {
    // Cinematic twilight mountain ridge & golden twilight reflection
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    sky.addColorStop(0, '#070b14');
    sky.addColorStop(0.55, '#1e293b');
    sky.addColorStop(0.85, '#92400e');
    sky.addColorStop(1, '#f59e0b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun glow
    const sun = ctx.createRadialGradient(w * 0.5, h * 0.58, 10, w * 0.5, h * 0.58, 420);
    sun.addColorStop(0, 'rgba(254, 243, 199, 0.95)');
    sun.addColorStop(0.3, 'rgba(245, 158, 11, 0.45)');
    sun.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    // Layered mountain silhouettes
    const layers = [
      {y: 0.62, amp: 140, freq: 0.0022, color: '#1e1b24'},
      {y: 0.68, amp: 110, freq: 0.0034, color: '#111116'},
      {y: 0.75, amp: 70, freq: 0.0048, color: '#060608'},
    ];
    layers.forEach((l, li) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) {
        const ridge =
          h * l.y -
          Math.abs(Math.sin(x * l.freq + li * 1.9)) * l.amp -
          Math.cos(x * l.freq * 2.3 + li) * (l.amp * 0.35);
        ctx.lineTo(x, ridge);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = l.color;
      ctx.fill();
    });

    // Crisp shimmer reflection band on water
    for (let i = 0; i < 42; i++) {
      const y = h * 0.78 + i * 5.2;
      const rw = Math.max(40, 340 - i * 6.5);
      ctx.fillStyle = `rgba(253, 224, 71, ${(0.28 - i * 0.005).toFixed(3)})`;
      ctx.fillRect(w * 0.5 - rw / 2 + Math.sin(i * 1.7) * 18, y, rw, 2);
    }
  } else {
    // High-clarity studio geometric sculpture with crisp rim lighting
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 60, w * 0.5, h * 0.5, w * 0.65);
    bg.addColorStop(0, '#2a2a30');
    bg.addColorStop(0.6, '#0d0d10');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Crisp concentric optical studio rings
    for (let r = 90; r <= 440; r += 48) {
      ctx.strokeStyle = `rgba(255,255,255,${(0.32 - r / 1700).toFixed(3)})`;
      ctx.lineWidth = r === 234 ? 4 : 1.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Metallic sphere centerpiece with crisp specular rim
    const sph = ctx.createRadialGradient(w * 0.44, h * 0.4, 24, w * 0.5, h * 0.5, 220);
    sph.addColorStop(0, '#ffffff');
    sph.addColorStop(0.25, '#a1a1aa');
    sph.addColorStop(0.68, '#18181b');
    sph.addColorStop(0.95, '#09090b');
    sph.addColorStop(1, '#71717a');
    ctx.fillStyle = sph;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 210, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

export function createInitialDemoClips(): MediaClip[] {
  const src1 = generateStudioFrame('architecture');
  const src2 = generateStudioFrame('horizon');
  const src3 = generateStudioFrame('portrait');

  return [
    {
      id: 'clip-1',
      name: 'Arch_Light_4K.png',
      kind: 'photo',
      src: src1,
      mimeType: 'image/png',
      width: 1920,
      height: 1080,
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
      transitionOut: 'pull-in',
      transitionDuration: 0.7,
    },
    {
      id: 'clip-2',
      name: 'Golden_Horizon_4K.png',
      kind: 'photo',
      src: src2,
      mimeType: 'image/png',
      width: 1920,
      height: 1080,
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
      transitionOut: 'whip-left',
      transitionDuration: 0.6,
    },
    {
      id: 'clip-3',
      name: 'Studio_Sphere_4K.png',
      kind: 'photo',
      src: src3,
      mimeType: 'image/png',
      width: 1920,
      height: 1080,
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
      transitionOut: 'none',
      transitionDuration: 0,
    },
  ];
}
