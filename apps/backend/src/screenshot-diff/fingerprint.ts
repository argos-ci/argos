export type EqualityFingerprintOptions = {
  redThreshold?: {
    rMin: number;
    gMax: number;
    bMax: number;
    aMin: number;
  };
  dilateRadius?: 0 | 1;
  gridSize?: 8 | 16 | 32;

  /**
   * Density quantization thresholds in increasing order, in range 0..1.
   * Example for 4 bins:
   * 0 if density < t0
   * 1 if density < t1
   * 2 if density < t2
   * 3 otherwise
   */
  densityThresholds?: readonly number[];

  /**
   * If true, normalize crop to a square by padding before grid sampling.
   * Helps when bbox aspect ratios vary a lot.
   */
  padToSquare?: boolean;
};

const DEFAULTS: Required<EqualityFingerprintOptions> = {
  redThreshold: { rMin: 200, gMax: 90, bMax: 90, aMin: 16 },
  dilateRadius: 1,
  gridSize: 16,
  densityThresholds: [0.002, 0.02, 0.08],
  padToSquare: true,
};

/**
 * Returns a deterministic string suitable for equality comparisons and DB indexes.
 * Two masks that are close often map to the same fingerprint because of binning.
 */
export function fingerprintDiffForEquality(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: EqualityFingerprintOptions = {},
): string {
  const opts: Required<EqualityFingerprintOptions> = {
    redThreshold: { ...DEFAULTS.redThreshold, ...(options.redThreshold ?? {}) },
    dilateRadius: options.dilateRadius ?? DEFAULTS.dilateRadius,
    gridSize: options.gridSize ?? DEFAULTS.gridSize,
    densityThresholds: options.densityThresholds ?? DEFAULTS.densityThresholds,
    padToSquare: options.padToSquare ?? DEFAULTS.padToSquare,
  };

  const mask = extractRedMask(rgba, width, height, opts.redThreshold);
  const mask2 =
    opts.dilateRadius === 1 ? dilateRadius1(mask, width, height) : mask;

  const bbox = computeBbox(mask2, width, height);
  if (bbox == null) {
    return "empty";
  }

  const cropped = cropMask(mask2, width, bbox);

  const normalized = opts.padToSquare
    ? padBinaryToSquare(cropped.data, cropped.width, cropped.height)
    : cropped;

  const q = quantizeToGridDensity(
    normalized.data,
    normalized.width,
    normalized.height,
    opts.gridSize,
    opts.gridSize,
    opts.densityThresholds,
  );

  // q holds values 0..3 by default
  // pack two bits per cell and hash to a compact string
  const packed = pack2Bit(q);
  const h = fnv1a64(packed);

  // Include parameters in key to avoid mixing incompatible settings
  return [
    "v1",
    `g${opts.gridSize}`,
    `d${opts.dilateRadius}`,
    `t${opts.densityThresholds.join(",")}`,
    toHex64(h),
  ].join(":");
}

/* -------------------------------- internals -------------------------------- */

function extractRedMask(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  t: { rMin: number; gMax: number; bMax: number; aMin: number },
): Uint8Array {
  const out = new Uint8Array(width * height);
  const { rMin, gMax, bMax, aMin } = t;
  const n = width * height;

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = rgba[o]!;
    const g = rgba[o + 1]!;
    const b = rgba[o + 2]!;
    const a = rgba[o + 3]!;
    out[i] = r >= rMin && g <= gMax && b <= bMax && a >= aMin ? 1 : 0;
  }

  return out;
}

function dilateRadius1(
  mask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(height - 1, y + 1);

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(width - 1, x + 1);

      let v = 0;
      for (let yy = y0; yy <= y1 && v === 0; yy++) {
        const row = yy * width;
        for (let xx = x0; xx <= x1; xx++) {
          if (mask[row + xx] === 1) {
            v = 1;
            break;
          }
        }
      }

      out[y * width + x] = v;
    }
  }

  return out;
}

function computeBbox(
  mask: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[row + x] === 1) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function cropMask(
  mask: Uint8Array,
  srcWidth: number,
  bbox: { x: number; y: number; width: number; height: number },
): { data: Uint8Array; width: number; height: number } {
  const out = new Uint8Array(bbox.width * bbox.height);

  for (let yy = 0; yy < bbox.height; yy++) {
    const srcRow = (bbox.y + yy) * srcWidth;
    const dstRow = yy * bbox.width;

    for (let xx = 0; xx < bbox.width; xx++) {
      out[dstRow + xx] = mask[srcRow + (bbox.x + xx)]!;
    }
  }

  return { data: out, width: bbox.width, height: bbox.height };
}

function padBinaryToSquare(
  src: Uint8Array,
  srcW: number,
  srcH: number,
): { data: Uint8Array; width: number; height: number } {
  const side = Math.max(srcW, srcH);
  const out = new Uint8Array(side * side);

  const offX = ((side - srcW) / 2) | 0;
  const offY = ((side - srcH) / 2) | 0;

  for (let y = 0; y < srcH; y++) {
    const dstRow = (y + offY) * side;
    const srcRow = y * srcW;

    for (let x = 0; x < srcW; x++) {
      out[dstRow + (x + offX)] = src[srcRow + x]!;
    }
  }

  return { data: out, width: side, height: side };
}

/**
 * Quantize by per cell density, computed with an integral image for speed.
 */
function quantizeToGridDensity(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  gridW: number,
  gridH: number,
  thresholds: readonly number[],
): Uint8Array {
  const integral = buildIntegralImage(src, srcW, srcH);
  const out = new Uint8Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    const y0 = Math.floor((gy * srcH) / gridH);
    const y1 = Math.floor(((gy + 1) * srcH) / gridH);

    for (let gx = 0; gx < gridW; gx++) {
      const x0 = Math.floor((gx * srcW) / gridW);
      const x1 = Math.floor(((gx + 1) * srcW) / gridW);

      const area = Math.max(1, (x1 - x0) * (y1 - y0));
      const sum = rectSum(integral, srcW, x0, y0, x1, y1);
      const density = sum / area;

      out[gy * gridW + gx] = quantizeDensity(density, thresholds);
    }
  }

  return out;
}

function quantizeDensity(
  density: number,
  thresholds: readonly number[],
): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (density < thresholds[i]!) return i;
  }
  return thresholds.length;
}

/**
 * Integral image with dimensions srcW by srcH, stored as Uint32 sums.
 */
function buildIntegralImage(
  src: Uint8Array,
  srcW: number,
  srcH: number,
): Uint32Array {
  const out = new Uint32Array(srcW * srcH);

  for (let y = 0; y < srcH; y++) {
    let rowSum = 0;
    const row = y * srcW;

    for (let x = 0; x < srcW; x++) {
      rowSum += src[row + x]!;
      const above = y > 0 ? out[(y - 1) * srcW + x]! : 0;
      out[row + x] = above + rowSum;
    }
  }

  return out;
}

function rectSum(
  integral: Uint32Array,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const xa = x0 - 1;
  const ya = y0 - 1;
  const xb = x1 - 1;
  const yb = y1 - 1;

  const A = xa >= 0 && ya >= 0 ? integral[ya * w + xa]! : 0;
  const B = xb >= 0 && ya >= 0 ? integral[ya * w + xb]! : 0;
  const C = xa >= 0 && yb >= 0 ? integral[yb * w + xa]! : 0;
  const D = xb >= 0 && yb >= 0 ? integral[yb * w + xb]! : 0;

  return D - B - C + A;
}

/**
 * Packs 2 bit values into bytes.
 * Assumes values are 0..3.
 */
function pack2Bit(values: Uint8Array): Uint8Array {
  const out = new Uint8Array(Math.ceil(values.length / 4));
  for (let i = 0; i < values.length; i++) {
    const v = values[i]! & 3;
    const byteIndex = (i / 4) | 0;
    const shift = (i & 3) * 2;
    out[byteIndex] |= v << shift;
  }
  return out;
}

/**
 * 64 bit FNV 1a hash implemented with BigInt.
 * Plenty for indexing and stable equality.
 */
function fnv1a64(data: Uint8Array): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let i = 0; i < data.length; i++) {
    hash ^= BigInt(data[i]!);
    hash = (hash * prime) & 0xffffffffffffffffn;
  }

  return hash;
}

function toHex64(v: bigint): string {
  return v.toString(16).padStart(16, "0");
}
