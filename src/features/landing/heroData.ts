import type { AttentionRegion } from "./showcase/types";
import { ANATOMY } from "./showcase/anatomy";

/** Regiões estáticas usadas nas vitrines (landing e login). */
export const HERO_REGIONS: AttentionRegion[] = [
  {
    id: "hipocampo-esquerdo",
    label: "Hipocampo esquerdo",
    weight: 0.82,
    radius: 0.075,
    anchors: ANATOMY.hippocampusLeft,
    description: "",
  },
  {
    id: "hipocampo-direito",
    label: "Hipocampo direito",
    weight: 0.6,
    radius: 0.075,
    anchors: ANATOMY.hippocampusRight,
    description: "",
  },
  {
    id: "cortex-entorrinal",
    label: "Córtex entorrinal",
    weight: 0.42,
    radius: 0.06,
    anchors: ANATOMY.entorhinalLeft,
    description: "",
  },
  {
    id: "ventriculos",
    label: "Ventrículos laterais",
    weight: 0.22,
    radius: 0.1,
    anchors: ANATOMY.ventricles,
    description: "",
  },
];
