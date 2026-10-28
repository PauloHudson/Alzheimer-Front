/** Paleta tipo "jet", a mesma do `save_gradcam_overlay` do backend (azul → verde → amarelo → vermelho). */
function jet(v: number): [number, number, number] {
  const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 3)));
  const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 2)));
  const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 1)));
  return [r * 255, g * 255, b * 255];
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Desenha o mapa em tons de cinza do backend no canvas, aplicando a paleta e uma
 * transparência proporcional ao valor — assim as áreas frias não cobrem a anatomia.
 */
export function paintHeatmap(canvas: HTMLCanvasElement, heatmap: HTMLImageElement) {
  canvas.width = heatmap.naturalWidth;
  canvas.height = heatmap.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(heatmap, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = data.data[i]! / 255;
    const [r, g, b] = jet(v);
    data.data[i] = r;
    data.data[i + 1] = g;
    data.data[i + 2] = b;
    data.data[i + 3] = Math.round(Math.max(0, Math.min(1, (v - 0.15) / 0.5)) * 220);
  }
  ctx.putImageData(data, 0, 0);
}

/** Corte + mapa numa única imagem PNG (usada no relatório impresso). */
export async function composeGradCam(sliceUrl: string, heatmapUrl: string, opacity = 0.6) {
  const [slice, heatmap] = await Promise.all([loadImage(sliceUrl), loadImage(heatmapUrl)]);
  const heat = document.createElement("canvas");
  paintHeatmap(heat, heatmap);
  const canvas = document.createElement("canvas");
  canvas.width = slice.naturalWidth;
  canvas.height = slice.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(slice, 0, 0);
  ctx.globalAlpha = opacity;
  ctx.drawImage(heat, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
