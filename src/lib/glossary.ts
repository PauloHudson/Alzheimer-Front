export interface GlossaryEntry {
  id: string;
  term: string;
  aka?: string;
  category: "Modelo e explicação" | "Testes cognitivos" | "Neuroimagem" | "Classificação";
  short: string;
  long: string;
}

/**
 * Glossário contextual (F08 / RC04).
 * Termos técnicos de IA aparecem sempre traduzidos para a linguagem clínica.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "mapa-atencao",
    term: "Mapa de atenção",
    aka: "Grad-CAM",
    category: "Modelo e explicação",
    short: "Mostra em quais regiões da RM o modelo mais se apoiou para chegar à sugestão.",
    long: "Cores quentes (amarelo e vermelho) indicam regiões que mais influenciaram a sugestão. O mapa não é uma segmentação anatômica nem indica lesão: ele mostra onde o modelo 'olhou'. Use o controle de opacidade para conferir a anatomia por baixo do destaque.",
  },
  {
    id: "contribuicao-fatores",
    term: "Contribuição dos fatores",
    aka: "SHAP",
    category: "Modelo e explicação",
    short: "Quanto cada informação (imagem ou clínica) aproximou ou afastou o caso da classe sugerida.",
    long: "Barras para a direita aproximam o paciente da classe sugerida; barras para a esquerda afastam. O tamanho representa a força relativa da contribuição neste caso específico — não é uma regra geral sobre a doença.",
  },
  {
    id: "confianca",
    term: "Confiança do modelo",
    category: "Modelo e explicação",
    short: "Quão concentradas estão as probabilidades em uma única classe.",
    long: "É calculada a partir da distância entre a classe mais provável e a segunda. Confiança alta indica que o modelo é consistente para este caso, não que a sugestão esteja certa. Casos fora do perfil dos dados de treino podem ter confiança alta e ainda assim estar errados.",
  },
  {
    id: "feature-augmented",
    term: "Explicação aumentada por biomarcadores",
    aka: "Feature-Augmented",
    category: "Modelo e explicação",
    short: "Explicação que combina o mapa de atenção com medidas clínicas conhecidas, como volume do hipocampo.",
    long: "Além de mostrar onde o modelo olhou, a interface apresenta biomarcadores com significado clínico estabelecido, comparados a uma referência por idade e sexo. É a contribuição central do TCC M-XAI Net.",
  },
  {
    id: "adni",
    term: "ADNI",
    category: "Modelo e explicação",
    short: "Base de dados de pesquisa usada para treinar o modelo.",
    long: "Alzheimer's Disease Neuroimaging Initiative. A população é majoritariamente norte-americana, com alta escolaridade. O desempenho do modelo em outras populações, como a brasileira, ainda não foi validado.",
  },
  {
    id: "cn",
    term: "CN",
    aka: "Cognitivamente normal",
    category: "Classificação",
    short: "Padrão compatível com envelhecimento sem comprometimento cognitivo.",
    long: "Classe usada pelo modelo para pacientes cujos achados se assemelham aos de pessoas sem declínio cognitivo na base de treino.",
  },
  {
    id: "mci",
    term: "CCL",
    aka: "MCI — comprometimento cognitivo leve",
    category: "Classificação",
    short: "Declínio cognitivo maior que o esperado para a idade, com autonomia preservada.",
    long: "Nem todo paciente com CCL evolui para demência. A comparação com exames anteriores ajuda a avaliar a progressão.",
  },
  {
    id: "ad",
    term: "DA",
    aka: "AD — doença de Alzheimer",
    category: "Classificação",
    short: "Achados semelhantes aos de pacientes com diagnóstico de doença de Alzheimer.",
    long: "A sugestão do modelo indica semelhança de padrão, não diagnóstico. O diagnóstico permanece clínico e é responsabilidade do médico.",
  },
  {
    id: "mmse",
    term: "MMSE",
    aka: "Mini-Exame do Estado Mental",
    category: "Testes cognitivos",
    short: "Teste de rastreio cognitivo de 0 a 30 pontos.",
    long: "Pontuações entre 24 e 28 são limítrofes e devem ser interpretadas considerando escolaridade. O escore total não mostra quais domínios cognitivos variaram.",
  },
  {
    id: "moca",
    term: "MoCA",
    aka: "Montreal Cognitive Assessment",
    category: "Testes cognitivos",
    short: "Teste de rastreio de 0 a 30 pontos, mais sensível ao CCL que o MMSE.",
    long: "Valores abaixo de 26 sugerem comprometimento. Acrescenta-se 1 ponto para escolaridade de até 12 anos.",
  },
  {
    id: "cdr-sb",
    term: "CDR-SB",
    aka: "Clinical Dementia Rating — soma dos boxes",
    category: "Testes cognitivos",
    short: "Escala de 0 a 18 que avalia o impacto funcional do declínio cognitivo.",
    long: "Combina seis domínios (memória, orientação, julgamento, vida comunitária, lar e cuidados pessoais). Valores mais altos indicam maior comprometimento.",
  },
  {
    id: "volume-hipocampal",
    term: "Volume hipocampal",
    category: "Neuroimagem",
    short: "Volume do hipocampo medido automaticamente na RM, em cm³.",
    long: "A atrofia do hipocampo é um dos marcadores de imagem mais associados à doença de Alzheimer. O valor é comparado a uma referência normativa por idade e sexo (percentil).",
  },
  {
    id: "percentil",
    term: "Percentil normativo",
    category: "Neuroimagem",
    short: "Posição do paciente em relação a pessoas da mesma idade e sexo.",
    long: "Percentil 10 significa que 90% das pessoas da mesma idade e sexo na referência têm um valor maior. Percentis abaixo de 5 são considerados claramente reduzidos.",
  },
  {
    id: "espessura-cortical",
    term: "Espessura cortical",
    category: "Neuroimagem",
    short: "Espessura média do córtex em regiões associadas à memória, em mm.",
    long: "Afinamento do córtex entorrinal e temporal é observado precocemente na doença de Alzheimer.",
  },
  {
    id: "mta",
    term: "Escala MTA",
    aka: "Medial Temporal Atrophy (Scheltens)",
    category: "Neuroimagem",
    short: "Escala visual de 0 a 4 para atrofia do lobo temporal medial no corte coronal.",
    long: "O limiar de normalidade muda com a idade, o que torna casos limítrofes difíceis de graduar (ver cenário C01).",
  },
  {
    id: "t1-volumetrica",
    term: "Sequência T1 volumétrica",
    aka: "3D T1",
    category: "Neuroimagem",
    short: "Sequência de RM de alta resolução necessária para medir volumes cerebrais.",
    long: "Sem ela, o modelo não consegue calcular os biomarcadores volumétricos. A ausência dessa sequência foi a causa da reconvocação no cenário C03.",
  },
];

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map((entry) => [entry.id, entry]));
