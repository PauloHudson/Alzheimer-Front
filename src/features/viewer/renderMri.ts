import type { AttentionRegion, Plane } from "@/types";
import { ANATOMY } from "./anatomy";

/**
 * Renderizador de RM SINTÉTICA (ponderada em T1) para demonstração do protótipo.
 * Não é uma imagem médica: as estruturas são aproximações geométricas posicionadas nas mesmas
 * coordenadas que o mapa de atenção (ver anatomy.ts), para que a explicação faça sentido visual.
 * Quando o backend existir, este módulo é substituído por um leitor DICOM/NIfTI (ex.: Cornerstone3D).
 */

export const MRI_SIZE = 256;
export const SLICE_COUNT = 48;

// Intensidades típicas em T1
const BG = 0.015;
const SCALP = 0.74;
const SKULL = 0.07;
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

/** 1 dentro da faixa [a, b], caindo suavemente até 0 fora dela. */
function sliceWindow(t: number, [a, b]: [number, number], falloff = 0.05) {
  if (t >= a && t <= b) return 1;
  const d = t < a ? a - t : t - b;
  return Math.max(0, 1 - d / falloff);
}

const mix = (a: number, b: number, k: number) => a + (b - a) * Math.max(0, Math.min(1, k));
const toUV = (n: number) => n * 2 - 1;

/** Mistura suave para bordas de estruturas (evita círculos com contorno duro). */
function blend(base: number, target: number, e: number, softness = 0.25) {
  if (e >= 1) return base;
  if (e <= 1 - softness) return target;
  return mix(target, base, smooth((e - (1 - softness)) / softness));
}

/**
 * Giros e sulcos: sulcos de profundidade variável a partir da superfície, revestidos por
 * substância cinzenta; o restante é substância branca. A atrofia alarga os sulcos.
 * `depth` é a distância (em unidades da imagem) até a superfície do encéfalo.
 */
function cortex(depth: number, theta: number, n: number, atrophy: number, gyri = 34, radius = 0.68) {
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

function fissure(u: number, value: number, atrophy: number) {
  const au = Math.abs(u);
  const half = 0.006 + atrophy * 0.008;
  if (au < half) return CSF;
  if (au < half + 0.026) return Math.min(value, GM);
  return value;
}

function hippocampus(
  u: number,
  v: number,
  value: number,
  plane: Plane,
  t: number,
  atrophy: number,
  side: "left" | "right",
) {
  const anchor = (side === "left" ? ANATOMY.hippocampusLeft : ANATOMY.hippocampusRight)[plane];
  if (!anchor) return value;
  const w = sliceWindow(t, anchor.slice as [number, number]);
  if (w <= 0) return value;
  const cx = toUV(anchor.x);
  const cy = toUV(anchor.y);
  const lateral = side === "left" ? 1 : -1;
  const shrink = 1 - atrophy * 0.32;

  let rx: number, ry: number, hx: number, hy: number, hrx: number, hry: number;
  if (plane === "coronal") {
    rx = 0.075 * shrink;
    ry = 0.05 * shrink;
    hx = cx + lateral * 0.055;
    hy = cy - 0.055;
    hrx = 0.028 + atrophy * 0.04;
    hry = 0.016 + atrophy * 0.022;
  } else if (plane === "axial") {
    rx = 0.05 * shrink;
    ry = 0.13 * shrink;
    hx = cx + lateral * 0.06;
    hy = cy;
    hrx = 0.016 + atrophy * 0.03;
    hry = 0.085;
  } else {
    rx = 0.17 * shrink;
    ry = 0.045 * shrink;
    hx = cx;
    hy = cy - 0.06;
    hrx = 0.13;
    hry = 0.013 + atrophy * 0.022;
  }

  const e = ell(u, v, cx, cy, rx * w, ry * w);
  value = blend(value, GM + 0.05, e, 0.35);
  const eh = ell(u, v, hx, hy, hrx * w, hry * w);
  return blend(value, CSF, eh, 0.4);
}

// ------------------------------------------------------------------ planos

interface Shape {
  e: number;
  r: number;
  cx: number;
  cy: number;
  gyri: number;
}

const shape = (u: number, v: number, cx: number, cy: number, rx: number, ry: number, gyri: number): Shape => ({
  e: ell(u, v, cx, cy, rx, ry),
  r: Math.min(rx, ry),
  cx,
  cy,
  gyri,
});

/** Forma mais próxima (menor métrica) — define de qual lobo vem a orientação dos sulcos. */
function nearest(shapes: Shape[], scale: number) {
  let best = shapes[0]!;
  for (const s of shapes) if (s.e < best.e) best = s;
  return { ...best, e: best.e / scale };
}

/** Distância aproximada (unidades da imagem) até a superfície de uma elipse, a partir da métrica `e`. */
const depthOf = (e: number, r: number) => (1 - e) * r;

function axial(u: number, v: number, t: number, a: number, n: number) {
  const s = 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.08 + 0.86 * t));
  const rx = 0.72 * s;
  const ry = 0.88 * s;
  const e = ell(u, v, 0, 0.02, rx, ry);
  if (e > 1) return BG;
  if (e > 0.958) return SCALP;
  if (e > 0.912) return SKULL;
  const eb = e / 0.892;
  if (eb > 1) return CSF;

  const theta = Math.atan2(v * 0.82, u);
  let value = cortex(depthOf(eb, Math.min(rx, ry) * 0.892), theta, n, a, 36, rx * 0.9);

  if (v < -0.2 * s || v > 0.44 * s) value = fissure(u, value, a);

  // fossa posterior (cerebelo) e tronco nos cortes inferiores
  if (t < 0.32) {
    const w = 1 - smooth(Math.max(0, (t - 0.2) / 0.12));
    const cb = ell(u, v, 0, 0.56 * s, 0.5 * s * w + 0.01, 0.28 * s * w + 0.01);
    if (cb < 1) {
      const folia = Math.abs(Math.sin(v * 95 + u * 8 + n * 6)) < 0.25;
      value = folia ? GM - 0.05 : mix(GM + 0.06, WM - 0.08, 1 - cb);
      if (Math.abs(u) < 0.01) value = CSF;
    }
    const bs = ell(u, v, 0, 0.15, 0.13, 0.11);
    if (bs < 1.25 && bs > 1) value = mix(value, CSF, 0.45);
    value = blend(value, DEEP_GM + 0.08, bs, 0.35);
  }

  // núcleos da base e tálamo
  const wDeep = sliceWindow(t, [0.44, 0.62], 0.06);
  if (wDeep > 0) {
    for (const side of [-1, 1]) {
      value = blend(value, DEEP_GM, ell(u, v, side * 0.11, 0.13, 0.09 * wDeep, 0.11 * wDeep), 0.45);
      value = blend(value, DEEP_GM - 0.02, ell(u, v, side * 0.22, -0.05, 0.05 * wDeep, 0.14 * wDeep), 0.45);
    }
  }

  // ventrículos laterais (cornos frontais e occipitais) e terceiro ventrículo
  const wV = sliceWindow(t, [0.47, 0.76], 0.06);
  if (wV > 0) {
    const vw = (0.035 + a * 0.06) * wV;
    for (const side of [-1, 1]) {
      value = blend(value, CSF, ell(u, v, side * (0.07 + a * 0.03), -0.13, vw, 0.2 * wV), 0.3);
      value = blend(value, CSF, ell(u, v, side * (0.12 + a * 0.03), 0.3, vw * 0.8, 0.11 * wV), 0.3);
    }
    if (t < 0.58 && Math.abs(u) < 0.008 + a * 0.01 && v > 0.02 && v < 0.18) value = CSF;
  }

  value = hippocampus(u, v, value, "axial", t, a, "left");
  value = hippocampus(u, v, value, "axial", t, a, "right");
  return value;
}

function coronal(u: number, v: number, t: number, a: number, n: number) {
  const head = ell(u, v, 0, -0.03, 0.8, 0.9);
  if (head > 1) return BG;
  if (head > 0.958) return SCALP;
  if (head > 0.912) return SKULL;

  const stem = sliceWindow(t, [0.18, 0.52], 0.08);
  const shapes: Shape[] = [
    shape(u, v, 0, -0.14, 0.7, 0.6, 38),
    shape(u, v, -0.46, 0.3, 0.25, 0.25, 16),
    shape(u, v, 0.46, 0.3, 0.25, 0.25, 16),
  ];
  if (stem > 0) shapes.push(shape(u, v, 0, 0.5, 0.12 * stem + 0.001, 0.3, 0));
  if (t < 0.26) shapes.push(shape(u, v, -0.24, 0.55, 0.3, 0.2, 0), shape(u, v, 0.24, 0.55, 0.3, 0.2, 0));
  const near = nearest(shapes, 0.97);
  if (near.e > 1) return CSF;

  let value = near.gyri
    ? cortex(depthOf(near.e, near.r), Math.atan2(v - near.cy, u - near.cx), n, a, near.gyri, near.r)
    : mix(DEEP_GM + 0.06, WM - 0.05, (1 - near.e) * 1.5);

  if (v < -0.26) value = fissure(u, value, a);

  // fissura lateral (Sylvius) entre lobos frontal/parietal e temporal
  const sylvian = 0.13 + 0.25 * (Math.abs(u) - 0.3) ** 2 + (n - 0.5) * 0.03;
  if (Math.abs(u) > 0.3 && Math.abs(u) < 0.6 && Math.abs(v - sylvian) < 0.006 + a * 0.01) value = CSF;

  // corpo caloso, ventrículos laterais e núcleos da base
  const wV = sliceWindow(t, [0.3, 0.74], 0.06);
  if (wV > 0) {
    if (Math.abs(v + 0.27) < 0.026 && Math.abs(u) < 0.28 * wV) value = WM + 0.07;
    for (const side of [-1, 1]) {
      value = blend(value, DEEP_GM, ell(u, v, side * 0.2, -0.03, 0.1 * wV, 0.12 * wV), 0.45);
      value = blend(
        value,
        CSF,
        ell(u, v, side * (0.075 + a * 0.03), -0.15, (0.03 + a * 0.045) * wV, (0.09 + a * 0.03) * wV),
        0.3,
      );
    }
    if (Math.abs(u) < 0.008 + a * 0.008 && v > 0 && v < 0.17) value = CSF;
  }

  if (t < 0.26) {
    for (const side of [-1, 1]) {
      const cb = ell(u, v, side * 0.24, 0.55, 0.3, 0.2);
      if (cb < 1 && Math.abs(Math.sin(v * 90 + u * 12 + n * 5)) < 0.25) value = GM - 0.05;
    }
  }

  value = hippocampus(u, v, value, "coronal", t, a, "left");
  value = hippocampus(u, v, value, "coronal", t, a, "right");
  return value;
}

function sagittal(u: number, v: number, t: number, a: number, n: number) {
  const m = Math.abs(t - 0.5) * 2;
  const k = 1 - 0.2 * m * m;
  const head = ell(u, v, 0.02, 0, 0.88 * k, 0.78 * k);
  if (head > 1) return BG;
  if (head > 0.958) return SCALP;
  if (head > 0.912) return SKULL;

  const shapes: Shape[] = [shape(u, v, -0.02, -0.12, 0.78 * k, 0.56 * k, 42)];
  if (m < 0.75) shapes.push(shape(u, v, 0.45, 0.43, 0.3 * k, 0.19 * k, 0));
  if (m < 0.22) shapes.push(shape(u, v, 0.13, 0.46, 0.1, 0.3, 0));
  if (m > 0.22) shapes.push(shape(u, v, -0.14, 0.28, 0.46 * k, 0.21 * k, 22));
  const near = nearest(shapes, 0.97);
  if (near.e > 1) return CSF;

  let value = near.gyri
    ? cortex(depthOf(near.e, near.r), Math.atan2((v - near.cy) * 1.2, u - near.cx), n, a, near.gyri, near.r)
    : mix(DEEP_GM + 0.06, WM - 0.05, (1 - near.e) * 1.5);

  // cerebelo com folhas
  const cb = ell(u, v, 0.45, 0.43, 0.3 * k, 0.19 * k);
  if (m < 0.75 && cb < 1) {
    const folia = Math.abs(Math.sin(Math.atan2(v - 0.43, u - 0.45) * 26 + n * 6)) < 0.3;
    value = folia && cb > 0.35 ? GM - 0.05 : mix(GM + 0.05, WM - 0.05, 1 - cb);
  }

  // estruturas da linha média: corpo caloso e tronco
  if (m < 0.16) {
    const cc = ell(u, v, 0, -0.06, 0.38, 0.17);
    if (cc > 0.9 && cc < 1.07 && v < -0.01) value = WM + 0.08;
    value = blend(value, DEEP_GM + 0.08, ell(u, v, 0.13, 0.46, 0.1, 0.3), 0.3);
  }
  if (m < 0.42) {
    const wv = 1 - m / 0.42;
    value = blend(value, CSF, ell(u, v, 0, -0.04, (0.28 + a * 0.06) * wv + 0.001, (0.045 + a * 0.05) * wv + 0.001), 0.3);
  }

  value = hippocampus(u, v, value, "sagittal", t, a, "left");
  value = hippocampus(u, v, value, "sagittal", t, a, "right");
  return value;
}

// ------------------------------------------------------------------ API pública

const cache = new Map<string, ImageData>();

export function sliceToT(index: number) {
  return index / (SLICE_COUNT - 1);
}

export function tToSlice(t: number) {
  return Math.round(t * (SLICE_COUNT - 1));
}

/** Imagem em tons de cinza do corte pedido. `atrophy` em [0, 1]. */
export function renderSlice(plane: Plane, sliceIndex: number, atrophy: number): ImageData {
  const key = `${plane}:${sliceIndex}:${atrophy.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const t = sliceToT(sliceIndex);
  const size = MRI_SIZE;
  const raw = new Float32Array(size * size);
  const fn = plane === "axial" ? axial : plane === "coronal" ? coronal : sagittal;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 2 - 1;
      const v = (y / size) * 2 - 1;
      const n = fbm(u * 4.5 + t * 2.3 + 11, v * 4.5 + 7);
      let value = fn(u, v, t, atrophy, n);
      if (value > BG + 0.01) {
        value += (fbm(u * 28, v * 28 + t * 9, 2) - 0.5) * 0.07;
        value *= 1 + 0.07 * -v;
      }
      value += (hash(x, y + sliceIndex * 977) - 0.5) * 0.035;
      raw[y * size + x] = value;
    }
  }

  // suavização 3×3 para aproximar o aspecto de volume parcial da RM
  const image = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= size) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= size) continue;
          const weight = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          sum += raw[yy * size + xx]! * weight;
          count += weight;
        }
      }
      const g = Math.max(0, Math.min(255, Math.round((sum / count) * 255)));
      const i = (y * size + x) * 4;
      image.data[i] = g;
      image.data[i + 1] = g;
      image.data[i + 2] = g;
      image.data[i + 3] = 255;
    }
  }

  if (cache.size > 160) cache.delete(cache.keys().next().value!);
  cache.set(key, image);
  return image;
}

// ------------------------------------------------------------------ mapa de atenção

const HEAT_SIZE = 128;

/** Paleta tipo "jet" usada por convenção em mapas Grad-CAM (azul → verde → amarelo → vermelho). */
function jet(v: number): [number, number, number] {
  const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 3)));
  const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 2)));
  const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 1)));
  return [r * 255, g * 255, b * 255];
}

export function regionVisibility(region: AttentionRegion, plane: Plane, sliceIndex: number) {
  const anchor = region.anchors[plane];
  if (!anchor) return 0;
  return sliceWindow(sliceToT(sliceIndex), anchor.slice, 0.08);
}

export function renderHeatmap(
  regions: AttentionRegion[],
  plane: Plane,
  sliceIndex: number,
  focusId?: string | null,
): ImageData {
  const size = HEAT_SIZE;
  const image = new ImageData(size, size);
  const maxWeight = Math.max(...regions.map((r) => r.weight), 0.001);
  const active = regions
    .map((r) => ({ r, vis: regionVisibility(r, plane, sliceIndex), a: r.anchors[plane] }))
    .filter((x) => x.vis > 0 && x.a);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      let acc = 0;
      for (const { r, vis, a } of active) {
        const sigma = r.radius * (plane === "sagittal" && r.id.startsWith("hipocampo") ? 1.4 : 1);
        const d2 = ((nx - a!.x) ** 2 + (ny - a!.y) ** 2) / (2 * sigma * sigma);
        const boost = focusId && focusId !== r.id ? 0.35 : 1;
        acc += (r.weight / maxWeight) * vis * boost * Math.exp(-d2);
      }
      // textura sutil para não parecer um círculo geométrico perfeito
      acc *= 0.85 + 0.3 * valueNoise(nx * 9, ny * 9);
      const value = Math.min(1, acc);
      const alpha = Math.max(0, Math.min(1, (value - 0.1) / 0.45));
      const [r, g, b] = jet(value);
      const i = (y * size + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = Math.round(alpha * 210);
    }
  }
  return image;
}

/** Converte a sugestão do modelo em um grau de atrofia para a imagem sintética. */
export function atrophyFromProbabilities(p?: { CN: number; MCI: number; AD: number }) {
  if (!p) return 0.3;
  return Math.max(0, Math.min(1, p.MCI * 0.5 + p.AD * 1.05));
}
