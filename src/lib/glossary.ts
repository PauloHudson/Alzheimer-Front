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
      "Áreas quentes são as que mais sustentam a classe sugerida pelo modelo: num caso sugerido como normal, mostram a evidência de normalidade. Não é segmentação nem indica lesão; a resolução é baixa (grade 7×7 ampliada).",
  },
  {
    id: "peso-modalidade",
    term: "Peso de cada modalidade",
    aka: "SHAP",
    short:
      "Quanto da explicação deste caso veio da imagem e quanto dos dados clínicos: a contribuição absoluta da ressonância dividida pela soma das contribuições de todos os fatores. Peso alto não quer dizer que a modalidade esteja certa.",
  },
  {
    id: "contribuicao-fator",
    term: "Contribuição de cada fator",
    aka: "SHAP",
    short:
      "Quantos pontos de probabilidade de Alzheimer cada dado moveu neste caso, comparado a um paciente de referência com os valores médios do treino. Mostra o que pesou no modelo, não a causa da doença.",
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
    id: "icv",
    term: "Volume intracraniano",
    aka: "ICV",
    short:
      "Volume total dentro do crânio, medido na RM. Reflete o tamanho da cabeça, não a doença. O modelo divide os outros volumes por ele para comparar pessoas de tamanhos diferentes.",
  },
  {
    id: "hipocampo",
    term: "Hipocampo",
    short:
      "Soma dos volumes dos hipocampos esquerdo e direito. A estrutura é ligada à memória recente e costuma atrofiar cedo na doença de Alzheimer.",
  },
  {
    id: "ventriculos",
    term: "Ventrículos laterais",
    short:
      "Cavidades cerebrais com líquor, que aumentam quando o cérebro perde volume. O aumento não é específico de Alzheimer.",
  },
  {
    id: "idade",
    term: "Idade",
    short:
      "O modelo usa a idade na data do exame, calculada a partir do nascimento. O treino cobriu de 55 a 90 anos; fora dessa faixa a sugestão é menos confiável.",
  },
  {
    id: "escolaridade",
    term: "Escolaridade",
    short: "Anos completos de estudo formal. Escolaridade alta pode mascarar sintomas iniciais (reserva cognitiva).",
  },
  {
    id: "sexo",
    term: "Sexo",
    short: "Sexo registrado do paciente, no formato da base de treino. Entra no modelo como variável clínica.",
  },
  {
    id: "estado-civil",
    term: "Estado civil",
    short: "Dado demográfico da base de treino que também entra no modelo. Em branco, é estimado a partir de casos parecidos.",
  },
  {
    id: "data-exame",
    term: "Data do exame",
    short: "Dia em que a RM foi feita. Serve para calcular a idade do paciente no exame.",
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
