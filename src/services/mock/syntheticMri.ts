/**
 * Imagens SINTÉTICAS para a API simulada, no mesmo formato que o backend devolve:
 *
 * - um corte axial 224×224 no nível ventricular, já sem crânio (skull strip) — o
 *   que a CNN recebe;
 * - um mapa Grad-CAM em tons de cinza, calculado numa grade 7×7 (resolução da
 *   `layer4` da ResNet50) e ampliado bilinearmente, normalizado em [0, 1].
 *
 * Não são imagens médicas. Imagens reais da ADNI não podem ser redistribuídas,
 * por isso o protótipo publicado não usa nenhuma.
 */

export const IMAGE_SIZE = 224;

const CSF = 0.11;
const GM = 0.47;
const WM = 0.79;
const DEEP_GM = 0.58;

// ------------------------------------------------------------------ ruído determinístico

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

function fbm(x: number, y: number, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise(x * frequency, y * frequency);
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value;
}

// ------------------------------------------------------------------ geometria

const ell = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) =>
  Math.sqrt(((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2);

const mix = (a: number, b: number, k: number) => a + (b - a) * Math.max(0, Math.min(1, k));

function blend(base: number, target: number, e: number, softness = 0.25) {
  if (e >= 1) return base;
  if (e <= 1 - softness) return target;
  return mix(target, base, smooth((e - (1 - softness)) / softness));
}

/** Giros e sulcos a partir da superfície; a atrofia alarga os sulcos e afina o córtex. */
function cortex(depth: number, theta: number, n: number, atrophy: number, gyri: number, radius: number) {
  const wobble = valueNoise(theta * 3.1 + 5, depth * 9) - 0.5;
  const phase = (theta / (2 * Math.PI)) * gyri + (n - 0.5) * 3.2 + wobble * (0.6 + depth * 6);
  const index = Math.floor(phase);
  const p = phase - index;
  const toCenter = Math.min(p, 1 - p) * ((2 * Math.PI * radius) / gyri);
  const sulcusDepth = 0.035 + 0.13 * hash(index, 31) ** 1.3 + 0.04 * n;
  const halfWidth = 0.004 + atrophy * 0.011;

  if (depth < sulcusDepth && toCenter < halfWidth) return mix(CSF, CSF + 0.08, toCenter / halfWidth);

  const toWall =
    depth < sulcusDepth ? toCenter - halfWidth : Math.hypot(depth - sulcusDepth, toCenter) - halfWidth;
  const toCsf = Math.min(depth, toWall);
  const gmThickness = 0.028 - atrophy * 0.006 + (n - 0.5) * 0.01;
  if (toCsf < gmThickness) return GM;
  return mix(GM, WM, (toCsf - gmThickness) / 0.012);
}

/** Corte axial no nível dos ventrículos laterais, sem crânio. `a` = atrofia em [0, 1]. */
function axial(u: number, v: number, a: number, n: number) {
  const rx = 0.74 - a * 0.03;
  const ry = 0.9 - a * 0.03;
  const e = ell(u, v, 0, 0.02, rx, ry);
  if (e > 1) return 0;

  const theta = Math.atan2(v * 0.82, u);
  let value = cortex((1 - e) * Math.min(rx, ry), theta, n, a, 36, rx * 0.9);

  // fissura inter-hemisférica
  if (v < -0.2 || v > 0.44) {
    const half = 0.006 + a * 0.008;
    if (Math.abs(u) < half) value = CSF;
    else if (Math.abs(u) < half + 0.026) value = Math.min(value, GM);
  }

  // núcleos da base e tálamo
  for (const side of [-1, 1]) {
    value = blend(value, DEEP_GM, ell(u, v, side * 0.11, 0.13, 0.08, 0.1), 0.45);
    value = blend(value, DEEP_GM - 0.02, ell(u, v, side * 0.22, -0.05, 0.045, 0.13), 0.45);
  }

  // ventrículos laterais (cornos frontais e átrios): crescem com a atrofia
  const vw = 0.035 + a * 0.065;
  for (const side of [-1, 1]) {
    value = blend(value, CSF, ell(u, v, side * (0.07 + a * 0.03), -0.13, vw, 0.2), 0.3);
    value = blend(value, CSF, ell(u, v, side * (0.12 + a * 0.03), 0.3, vw * 0.85, 0.12), 0.3);
  }
  if (Math.abs(u) < 0.008 + a * 0.01 && v > 0.02 && v < 0.18) value = CSF;
  return value;
}

// ------------------------------------------------------------------ saída

function toDataUrl(gray: Float32Array) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(IMAGE_SIZE, IMAGE_SIZE);
  for (let i = 0; i < gray.length; i++) {
    const g = Math.max(0, Math.min(255, Math.round(gray[i]! * 255)));
    image.data[i * 4] = g;
    image.data[i * 4 + 1] = g;
    image.data[i * 4 + 2] = g;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export function renderSlice(atrophy: number, seed: number) {
  const size = IMAGE_SIZE;
  const raw = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 2 - 1;
      const v = (y / size) * 2 - 1;
      const n = fbm(u * 4.5 + seed * 1.7 + 11, v * 4.5 + 7);
      let value = axial(u, v, atrophy, n);
      if (value > 0) {
        value += (fbm(u * 28 + seed, v * 28, 2) - 0.5) * 0.07;
        value += (hash(x + seed * 131, y) - 0.5) * 0.035;
      }
      raw[y * size + x] = value;
    }
  }
  return toDataUrl(raw);
}

/**
 * Mapa do logit AD. Com P(AD) alta a atenção se concentra no átrio de um dos
 * ventrículos laterais; sem evidência de AD o mapa perde o foco e escorre para
 * a borda inferior — o mesmo comportamento descrito na §6.18 do README do backend.
 */
export function renderHeatmap(pAd: number, seed: number) {
  const GRID = 7;
  const side = hash(seed, 7) > 0.5 ? 1 : -1;
  const focus = { x: 3 + side * 1.1, y: 4.1 };
  const grid = new Float32Array(GRID * GRID);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const atrium = Math.exp(-(((gx - focus.x) ** 2 + (gy - focus.y) ** 2) / 1.6));
      const frontal = 0.45 * Math.exp(-(((gx - 3 - side * 0.6) ** 2 + (gy - 2) ** 2) / 1.2));
      const bottom = Math.exp(-((6 - gy) ** 2) / 0.8) * (0.6 + 0.4 * hash(gx + seed, gy));
      grid[gy * GRID + gx] =
        pAd * (atrium + frontal) + (1 - pAd) * bottom + 0.15 * hash(gx * 3 + seed, gy * 5);
    }
  }

  // ampliação bilinear 7×7 → 224×224 (como F.interpolate no gradcam.py) e normalização min-max
  const size = IMAGE_SIZE;
  const out = new Float32Array(size * size);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < size; y++) {
    const fy = Math.max(0, Math.min(GRID - 1, ((y + 0.5) / size) * GRID - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(GRID - 1, y0 + 1);
    for (let x = 0; x < size; x++) {
      const fx = Math.max(0, Math.min(GRID - 1, ((x + 0.5) / size) * GRID - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(GRID - 1, x0 + 1);
      const top = mix(grid[y0 * GRID + x0]!, grid[y0 * GRID + x1]!, fx - x0);
      const bot = mix(grid[y1 * GRID + x0]!, grid[y1 * GRID + x1]!, fx - x0);
      const value = mix(top, bot, fy - y0);
      out[y * size + x] = value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i]! - min) / (max - min + 1e-8);
  return toDataUrl(out);
}
