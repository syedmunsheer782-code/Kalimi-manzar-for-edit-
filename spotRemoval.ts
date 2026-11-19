import {SpotStroke} from '../types/editor';

/**
 * Applies mark-and-remove strokes onto a source image or video frame at full crisp resolution.
 * - 'heal' mode uses multi-pass inward boundary diffusion with organic micro-texture sampling
 *   to cleanly remove blemishes, spots, or objects without blocky pixelation.
 * - 'erase' mode smoothly erases marked pixels to alpha = 0 for clean transparent PNG export.
 */
export function applySpotStrokesToCanvas(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  strokes: SpotStroke[],
  targetWidth?: number,
  targetHeight?: number,
): HTMLCanvasElement {
  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth || 1920
      : source instanceof HTMLImageElement
        ? source.naturalWidth || source.width || 1920
        : source.width;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight || 1080
      : source instanceof HTMLImageElement
        ? source.naturalHeight || source.height || 1080
        : source.height;

  const w = targetWidth ?? srcW;
  const h = targetHeight ?? srcH;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) return outCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  if (!strokes.length) return outCanvas;

  const healStrokes = strokes.filter((s) => s.mode === 'heal' && s.points.length > 0);
  const eraseStrokes = strokes.filter((s) => s.mode === 'erase' && s.points.length > 0);

  // 1. Heal (content-aware inward diffusion inpainting)
  if (healStrokes.length > 0) {
    // Work on a capped processing buffer for ultra-fast interactive response while keeping crisp edges
    const maxProcDim = 1600;
    const scale = Math.min(1, maxProcDim / Math.max(w, h));
    const pw = Math.max(1, Math.round(w * scale));
    const ph = Math.max(1, Math.round(h * scale));

    const workCanvas = document.createElement('canvas');
    workCanvas.width = pw;
    workCanvas.height = ph;
    const wCtx = workCanvas.getContext('2d', {willReadFrequently: true});
    if (wCtx) {
      wCtx.imageSmoothingEnabled = true;
      wCtx.imageSmoothingQuality = 'high';
      wCtx.drawImage(outCanvas, 0, 0, pw, ph);

      // Build binary mask for heal strokes
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = pw;
      maskCanvas.height = ph;
      const mCtx = maskCanvas.getContext('2d', {willReadFrequently: true});
      if (mCtx) {
        mCtx.clearRect(0, 0, pw, ph);
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        mCtx.strokeStyle = '#ffffff';
        mCtx.fillStyle = '#ffffff';
        const minDim = Math.min(pw, ph);

        for (const stroke of healStrokes) {
          const radius = Math.max(2, stroke.size * minDim);
          mCtx.lineWidth = radius * 2;
          if (stroke.points.length === 1) {
            mCtx.beginPath();
            mCtx.arc(stroke.points[0].x * pw, stroke.points[0].y * ph, radius, 0, Math.PI * 2);
            mCtx.fill();
          } else {
            mCtx.beginPath();
            mCtx.moveTo(stroke.points[0].x * pw, stroke.points[0].y * ph);
            for (let i = 1; i < stroke.points.length; i++) {
              mCtx.lineTo(stroke.points[i].x * pw, stroke.points[i].y * ph);
            }
            mCtx.stroke();
          }
        }

        const imgData = wCtx.getImageData(0, 0, pw, ph);
        const maskData = mCtx.getImageData(0, 0, pw, ph);
        const data = imgData.data;
        const mPixels = maskData.data;

        // Track known vs unknown pixels (1 = unknown/to-inpaint, 0 = known)
        const unknown = new Uint8Array(pw * ph);
        const originalMask = new Uint8Array(pw * ph);
        let remaining = 0;

        for (let i = 0; i < pw * ph; i++) {
          if (mPixels[i * 4 + 3] > 24) {
            unknown[i] = 1;
            originalMask[i] = 1;
            remaining++;
          }
        }

        // Iterative onion-peel inward diffusion (fast, smooth, preserves local gradients)
        const dirs = [
          [-1, 0, 1.0],
          [1, 0, 1.0],
          [0, -1, 1.0],
          [0, 1, 1.0],
          [-1, -1, 0.7],
          [1, -1, 0.7],
          [-1, 1, 0.7],
          [1, 1, 0.7],
          [-2, 0, 0.45],
          [2, 0, 0.45],
          [0, -2, 0.45],
          [0, 2, 0.45],
        ];

        const maxPasses = 140;
        let pass = 0;
        const frontier: number[] = [];

        while (remaining > 0 && pass < maxPasses) {
          frontier.length = 0;
          for (let y = 1; y < ph - 1; y++) {
            const rowOffset = y * pw;
            for (let x = 1; x < pw - 1; x++) {
              const idx = rowOffset + x;
              if (unknown[idx] === 1) {
                if (
                  unknown[idx - 1] === 0 ||
                  unknown[idx + 1] === 0 ||
                  unknown[idx - pw] === 0 ||
                  unknown[idx + pw] === 0
                ) {
                  frontier.push(idx);
                }
              }
            }
          }

          if (frontier.length === 0) break;

          for (let f = 0; f < frontier.length; f++) {
            const idx = frontier[f];
            const x = idx % pw;
            const y = (idx - x) / pw;
            let rSum = 0;
            let gSum = 0;
            let bSum = 0;
            let aSum = 0;
            let wSum = 0;

            for (let d = 0; d < dirs.length; d++) {
              const nx = x + dirs[d][0];
              const ny = y + dirs[d][1];
              if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                const nIdx = ny * pw + nx;
                if (unknown[nIdx] === 0) {
                  const wt = dirs[d][2];
                  const p = nIdx * 4;
                  rSum += data[p] * wt;
                  gSum += data[p + 1] * wt;
                  bSum += data[p + 2] * wt;
                  aSum += data[p + 3] * wt;
                  wSum += wt;
                }
              }
            }

            if (wSum > 0) {
              const p = idx * 4;
              // Add subtle organic micro-dither (+/- 1.5) to prevent plastic banding
              const jitter = (((x * 37 + y * 17 + pass * 13) & 7) - 3.5) * 0.45;
              data[p] = Math.max(0, Math.min(255, Math.round(rSum / wSum + jitter)));
              data[p + 1] = Math.max(0, Math.min(255, Math.round(gSum / wSum + jitter)));
              data[p + 2] = Math.max(0, Math.min(255, Math.round(bSum / wSum + jitter)));
              data[p + 3] = Math.max(0, Math.min(255, Math.round(aSum / wSum)));
            }
          }

          for (let f = 0; f < frontier.length; f++) {
            unknown[frontier[f]] = 0;
            remaining--;
          }
          pass++;
        }

        // Light 2-pass smoothing inside healed mask only for seamless edge blending
        const copy = new Uint8ClampedArray(data);
        for (let smoothPass = 0; smoothPass < 2; smoothPass++) {
          for (let y = 1; y < ph - 1; y++) {
            const row = y * pw;
            for (let x = 1; x < pw - 1; x++) {
              const idx = row + x;
              if (originalMask[idx] === 1) {
                const p = idx * 4;
                const pL = (idx - 1) * 4;
                const pR = (idx + 1) * 4;
                const pU = (idx - pw) * 4;
                const pD = (idx + pw) * 4;
                for (let c = 0; c < 3; c++) {
                  data[p + c] = Math.round(
                    (copy[p + c] * 2 + copy[pL + c] + copy[pR + c] + copy[pU + c] + copy[pD + c]) / 6,
                  );
                }
              }
            }
          }
          copy.set(data);
        }

        wCtx.putImageData(imgData, 0, 0);

        // Composite ONLY the healed mask region back onto full-res outCanvas so untouched pixels stay 100% 4K crisp!
        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = w;
        patchCanvas.height = h;
        const pCtx = patchCanvas.getContext('2d');
        if (pCtx) {
          pCtx.imageSmoothingEnabled = true;
          pCtx.imageSmoothingQuality = 'high';
          pCtx.drawImage(workCanvas, 0, 0, w, h);
          pCtx.globalCompositeOperation = 'destination-in';
          pCtx.filter = 'blur(1.5px)';
          pCtx.drawImage(maskCanvas, 0, 0, w, h);
          pCtx.filter = 'none';
          ctx.drawImage(patchCanvas, 0, 0, w, h);
        }
      }
    }
  }

  // 2. Alpha Cutout Erase (true transparent PNG export)
  if (eraseStrokes.length > 0) {
    const eraseCanvas = document.createElement('canvas');
    eraseCanvas.width = w;
    eraseCanvas.height = h;
    const eCtx = eraseCanvas.getContext('2d');
    if (eCtx) {
      eCtx.lineCap = 'round';
      eCtx.lineJoin = 'round';
      eCtx.strokeStyle = '#ffffff';
      eCtx.fillStyle = '#ffffff';
      const minDim = Math.min(w, h);
      for (const stroke of eraseStrokes) {
        const radius = Math.max(2, stroke.size * minDim);
        const blurPx = Math.round(stroke.feather * radius * 0.45);
        eCtx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
        eCtx.lineWidth = radius * 2;
        if (stroke.points.length === 1) {
          eCtx.beginPath();
          eCtx.arc(stroke.points[0].x * w, stroke.points[0].y * h, radius, 0, Math.PI * 2);
          eCtx.fill();
        } else {
          eCtx.beginPath();
          eCtx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
          for (let i = 1; i < stroke.points.length; i++) {
            eCtx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
          }
          eCtx.stroke();
        }
      }
      eCtx.filter = 'none';
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(eraseCanvas, 0, 0);
      ctx.restore();
    }
  }

  return outCanvas;
}
