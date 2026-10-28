export interface GlossaryEntry {
  id: string;
  term: string;
  aka?: string;
  short: string;
}

/**
 * Glossário contextual, exibido como dica no próprio termo.
 * Termos técnicos de IA aparecem sempre traduzidos para a linguagem clínica.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "mapa-atencao",
    term: "Mapa de atenção",
    aka: "Grad-CAM",
    short:
      "Áreas quentes são as que mais aproximaram o caso do padrão de Alzheimer, qualquer que seja a sugestão final. Não é segmentação nem indica lesão; a resolução é baixa (grade 7×7 ampliada).",
  },
  {
    id: "peso-modalidade",
    term: "Peso de cada modalidade",
    aka: "SHAP",
    short:
      "Quanto da decisão veio da imagem e quanto dos dados clínicos, medido na entrada da camada que funde as duas. Peso alto não quer dizer que a modalidade esteja certa.",
  },
  {
    id: "confianca",
    term: "Confiança do modelo",
    short:
      "Quão concentradas estão as probabilidades em uma única classe. Confiança alta indica consistência, não acerto — casos fora do perfil de treino podem ter confiança alta e estar errados.",
  },
  {
    id: "adni",
    term: "ADNI",
    short:
      "Alzheimer's Disease Neuroimaging Initiative, base usada no treino. População majoritariamente norte-americana e de alta escolaridade; não validado na população brasileira.",
  },
  {
    id: "cn",
    term: "Normal",
    aka: "CN — cognitivamente normal",
    short: "Padrão compatível com envelhecimento sem comprometimento cognitivo.",
  },
  {
    id: "mci",
    term: "Comprometimento leve",
    aka: "CCL / MCI — comprometimento cognitivo leve",
    short: "Declínio cognitivo maior que o esperado para a idade, com autonomia preservada.",
  },
  {
    id: "ad",
    term: "Alzheimer",
    aka: "DA / AD — doença de Alzheimer",
    short: "Achados semelhantes aos de pacientes com doença de Alzheimer. Indica semelhança de padrão, não diagnóstico.",
  },
  {
    id: "apoe",
    term: "APOE",
    short: "Gene da apolipoproteína E. Cada alelo ε4 aumenta o risco de Alzheimer; o modelo usa o número de alelos ε4.",
  },
  {
    id: "volumetria",
    term: "Volumetria",
    aka: "FreeSurfer",
    short:
      "Volumes medidos na RM pelo FreeSurfer. O modelo usa hipocampo e ventrículos laterais divididos pelo volume intracraniano (ICV).",
  },
];

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map((entry) => [entry.id, entry]));
