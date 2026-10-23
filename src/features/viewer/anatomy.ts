import type { Plane, RegionAnchor } from "@/types";

/**
 * Posições anatômicas aproximadas usadas tanto pelo renderizador da RM sintética
 * quanto pelas regiões do mapa de atenção, para que o destaque caia sobre a estrutura certa.
 *
 * Convenção radiológica: o lado direito do paciente aparece à esquerda da tela (axial e coronal).
 * No sagital, a face do paciente fica à esquerda.
 * Coordenadas em [0, 1]; `slice` é a faixa de cortes em que a estrutura é visível.
 */
export const ANATOMY = {
  hippocampusRight: {
    axial: { x: 0.36, y: 0.6, slice: [0.22, 0.42] },
    coronal: { x: 0.37, y: 0.64, slice: [0.32, 0.58] },
    sagittal: { x: 0.5, y: 0.62, slice: [0.62, 0.78] },
  },
  hippocampusLeft: {
    axial: { x: 0.64, y: 0.6, slice: [0.22, 0.42] },
    coronal: { x: 0.63, y: 0.64, slice: [0.32, 0.58] },
    sagittal: { x: 0.5, y: 0.62, slice: [0.22, 0.38] },
  },
  entorhinalRight: {
    axial: { x: 0.36, y: 0.69, slice: [0.18, 0.34] },
    coronal: { x: 0.39, y: 0.72, slice: [0.42, 0.62] },
  },
  entorhinalLeft: {
    axial: { x: 0.64, y: 0.69, slice: [0.18, 0.34] },
    coronal: { x: 0.61, y: 0.72, slice: [0.42, 0.62] },
  },
  ventricles: {
    axial: { x: 0.5, y: 0.46, slice: [0.45, 0.75] },
    coronal: { x: 0.5, y: 0.4, slice: [0.3, 0.7] },
    sagittal: { x: 0.52, y: 0.4, slice: [0.4, 0.6] },
  },
  precuneus: {
    axial: { x: 0.5, y: 0.78, slice: [0.6, 0.9] },
    sagittal: { x: 0.7, y: 0.32, slice: [0.38, 0.62] },
  },
} satisfies Record<string, Partial<Record<Plane, RegionAnchor>>>;

export type AnatomyKey = keyof typeof ANATOMY;

export const PLANE_LABEL: Record<Plane, string> = {
  axial: "Axial",
  coronal: "Coronal",
  sagittal: "Sagital",
};

/** Corte inicial sugerido por plano (passa pelos hipocampos). */
export const DEFAULT_SLICE: Record<Plane, number> = {
  axial: 0.32,
  coronal: 0.45,
  sagittal: 0.3,
};
