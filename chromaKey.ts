import {ChromaKeyConfig} from '../types/editor';

export interface ChromaPresetColor {
  id: string;
  label: string;
  hex: string;
}

export const CHROMA_PRESET_COLORS: ChromaPresetColor[] = [
  {id: 'green-studio', label: 'Green Screen', hex: '#00B140'},
  {id: 'green-bright', label: 'Neon Green', hex: '#00FF00'},
  {id: 'blue-studio', label: 'Blue Screen', hex: '#0047AB'},
  {id: 'pure-black', label: 'Pure Black', hex: '#000000'},
  {id: 'pure-white', label: 'Pure White', hex: '#FFFFFF'},
  {id: 'studio-gray', label: 'Studio Gray', hex: '#808080'},
  {id: 'chroma-red', label: 'Red', hex: '#E11D48'},
  {id: 'chroma-cyan', label: 'Cyan', hex: '#06B6D4'},
  {id: 'chroma-magenta', label: 'Magenta', hex: '#D946EF'},
  {id: 'chroma-yellow', label: 'Yellow', hex: '#FACC15'},
];

export function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (!Number.isFinite(num)) return {r: 0, g: 177, b: 64};
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/**
 * Samples an averaged 3x3 pixel neighborhood from a canvas at normalized (nx, ny)
 * so video/JPEG compression noise on a plain background doesn't skew the picked color.
 */
export function sampleCanvasPixelHex(
  canvas: HTMLCanvasElement,
  nx: number,
  ny: number,
): string | null {
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx || canvas.width < 2 || canvas.height < 2) return null;
  const cx = Math.max(1, Math.min(canvas.width - 2, Math.round(nx * (canvas.width - 1))));
  const cy = Math.max(1, Math.min(canvas.height - 2, Math.round(ny * (canvas.height - 1))));
  try {
    const img = ctx.getImageData(cx - 1, cy - 1, 3, 3).data;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    for (let i = 0; i < img.length; i += 4) {
      if (img[i + 3] < 20) continue;
      rSum += img[i];
      gSum += img[i + 1];
      bSum += img[i + 2];
      count += 1;
    }
    if (count === 0) return null;
    return rgbToHex(rSum / count, gSum / count, bSum / count);
  } catch {
    return null;
  }
}

/**
 * High-precision universal Chroma Key processor supporting ANY plain background color
 * (green, blue, red, cyan, magenta, yellow, black, white, gray, or any custom sampled hex).
 *
 * Combines:
 * 1. Adaptive YCbCr chrominance + perceptual RGB Euclidean distance (auto-blends cleanly for
 *    both saturated chroma screens AND achromatic white/black/gray plain backgrounds).
 * 2. Adjustable Shadow/Light tolerance to eliminate uneven backdrop lighting without eating subject.
 * 3. Smooth Hermite edge feathering + low-alpha fringe choke so zero leftover background stays behind.
 * 4. Universal vector color-spill suppression that removes colored halos on hair/edges for ANY key hue.
 */
export function applyChromaKeyToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: ChromaKeyConfig | undefined,
): void {
  if (!config || !config.enabled || config.strength <= 0) return;
  if (w < 2 || h < 2) return;

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    return;
  }

  const data = imageData.data;
  const {r: kr, g: kg, b: kb} = hexToRgb(config.keyColor);

  // Key color BT.709 luma & Cb/Cr chrominance
  const ky = 0.2126 * kr + 0.7152 * kg + 0.0722 * kb;
  const kcb = (kb - ky) * 0.5389;
  const kcr = (kr - ky) * 0.6350;

  // Determine how chromatic vs achromatic (black/white/gray) the picked key color is
  const kMax = Math.max(kr, kg, kb);
  const kMin = Math.min(kr, kg, kb);
  const keySat = (kMax - kMin) / 255; // 0 for pure black/white/gray, ~1 for vivid chroma
  const chromaBlend = Math.min(1, Math.max(0, (keySat - 0.08) / 0.22));

  // Normalized key chroma vector in RGB-minus-luma space for universal color-spill suppression
  const kdr = kr - ky;
  const kdg = kg - ky;
  const kdb = kb - ky;
  const kdLen = Math.hypot(kdr, kdg, kdb);
  const spillAxisR = kdLen > 1 ? kdr / kdLen : 0;
  const spillAxisG = kdLen > 1 ? kdg / kdLen : 0;
  const spillAxisB = kdLen > 1 ? kdb / kdLen : 0;

  // Map user-facing 0..100 controls into calibrated physical thresholds
  const strengthNorm = Math.max(0, Math.min(100, config.strength)) / 100;
  const featherNorm = Math.max(0, Math.min(100, config.feather)) / 100;
  const spillNorm = Math.max(0, Math.min(100, config.spillSuppression)) / 100;
  const shadowNorm = Math.max(0, Math.min(100, config.shadowTolerance)) / 100;

  // Inner threshold: anything closer than this is 100% transparent
  // Scaled smoothly so even small strength values (10-35%) give fine control and 100% reaches wide hues
  const innerDist = 8 + Math.pow(strengthNorm, 1.15) * 142;
  // Edge softening band: adds clean anti-aliased feather transition around innerDist
  const featherBand = 6 + featherNorm * 78;
  const outerDist = innerDist + featherBand;
  const invBand = 1 / Math.max(1, featherBand);

  // Luma weight decreases as shadowTolerance increases for chromatic backdrops
  // so darker folds & brighter highlights on green/blue/colored walls vanish cleanly
  const chromaLumaWeight = 0.34 * (1 - shadowNorm * 0.78);
  const spillReach = outerDist + 24 + spillNorm * 88;
  const hasSpill = spillNorm > 0.005 && chromaBlend > 0.15 && kdLen > 1;

  for (let i = 0; i < data.length; i += 4) {
    const a0 = data[i + 3];
    if (a0 === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const cb = (b - y) * 0.5389;
    const cr = (r - y) * 0.6350;

    // 1) Chromatic distance (Cb/Cr heavily weighted + controlled luma delta)
    const dCb = cb - kcb;
    const dCr = cr - kcr;
    const dY = y - ky;
    const chromaDist = Math.sqrt(
      (dCb * dCb + dCr * dCr) * 2.55 + dY * dY * (chromaLumaWeight * chromaLumaWeight),
    );

    // 2) Perceptual RGB distance (ideal for pure black, pure white, or gray plain backgrounds)
    const dr = r - kr;
    const dg = g - kg;
    const db = b - kb;
    const rgbDist = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * (1.28 - shadowNorm * 0.32);

    const dist = chromaDist * chromaBlend + rgbDist * (1 - chromaBlend);

    if (dist <= innerDist) {
      data[i + 3] = 0;
      continue;
    }

    let alphaMult = 1;
    if (dist < outerDist) {
      const t = (dist - innerDist) * invBand;
      // Smoothstep Hermite ramp for silky anti-aliased edges
      alphaMult = t * t * (3 - 2 * t);
      // Clean fringe choke eliminates faint semi-transparent leftover background dust
      if (alphaMult < 0.065) {
        data[i + 3] = 0;
        continue;
      }
      data[i + 3] = Math.round(a0 * alphaMult);
    }

    // Universal Color-Spill Suppression (removes green/blue/colored edge halos for ANY key color)
    if (hasSpill && dist < spillReach) {
      const pdr = r - y;
      const pdg = g - y;
      const pdb = b - y;
      const proj = pdr * spillAxisR + pdg * spillAxisG + pdb * spillAxisB;
      if (proj > 0) {
        // Stronger suppression on boundary/semi-transparent pixels, gentle on nearby solid pixels
        const proximity = 1 - Math.max(0, (dist - innerDist) / Math.max(1, spillReach - innerDist));
        const edgeBoost = alphaMult < 1 ? 1.15 : 0.72 + proximity * 0.38;
        const removeAmt = proj * Math.min(1, spillNorm * edgeBoost);

        let nr = r - spillAxisR * removeAmt;
        let ng = g - spillAxisG * removeAmt;
        let nb = b - spillAxisB * removeAmt;

        // Subtle edge decontamination pull toward neutral luma on semi-transparent fringe
        if (alphaMult < 0.85) {
          const fringePull = (1 - alphaMult) * spillNorm * 0.35;
          nr = nr + (y - nr) * fringePull;
          ng = ng + (y - ng) * fringePull;
          nb = nb + (y - nb) * fringePull;
        }

        data[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
        data[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
        data[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
