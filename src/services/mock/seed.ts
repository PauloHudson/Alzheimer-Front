import type { ClinicalCase, Patient, Sex, TabularInput, User } from "@/types";
import { buildPrediction } from "./prediction";

/** Dados de demonstração. Todos os pacientes são fictícios. */

export interface MockUser extends User {
  password: string;
}

export const DEMO_PASSWORD = "demo1234";

export const DEMO_USER: MockUser = {
  id: "u_demo",
  name: "Dra. Helena Prado",
  email: "medico@mxai.app",
  password: DEMO_PASSWORD,
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

interface SeedCase {
  n: number;
  name: string;
  age: number;
  sex: Sex;
  educationYears: number;
  tabular: TabularInput;
  status: ClinicalCase["status"];
  createdAgo: number;
  notes?: string;
  error?: string;
  decision?: Pick<NonNullable<ClinicalCase["decision"]>, "agreement" | "finalDiagnosis" | "justification">;
}

const CASES: SeedCase[] = [
  {
    n: 1042,
    name: "Ivo Bittencourt",
    age: 78,
    sex: "M",
    educationYears: 11,
    tabular: { apoe: "ε3/ε4", marital: "Married", icvMm3: 1_540_000, hippocampusMm3: 5_600, lateralVentriclesMm3: 58_000 },
    status: "aguardando_revisao",
    createdAgo: 3 * HOUR,
    notes: "Esquecimento de fatos recentes há cerca de 1 ano, relatado pela esposa.",
  },
  {
    n: 1041,
    name: "Maria Silva",
    age: 69,
    sex: "F",
    educationYears: 4,
    tabular: { apoe: "ε3/ε3", marital: "Widowed" },
    status: "aguardando_revisao",
    createdAgo: 9 * HOUR,
    notes: "Queixa de memória após luto recente. Volumetria não disponível.",
  },
  {
    n: 1039,
    name: "Roberto Nogueira",
    age: 74,
    sex: "M",
    educationYears: 16,
    tabular: { apoe: "ε3/ε3", marital: "Married", icvMm3: 1_610_000, hippocampusMm3: 7_400, lateralVentriclesMm3: 27_000 },
    status: "concluido",
    createdAgo: 4 * DAY,
    decision: {
      agreement: "concorda",
      finalDiagnosis: "CN",
      justification:
        "Concordo com a sugestão. Volumes hipocampais preservados para a idade e exame neurológico sem alterações. Reavaliar em 12 meses se houver nova queixa.",
    },
  },
  {
    n: 1043,
    name: "Aparecida Souza",
    age: 81,
    sex: "F",
    educationYears: 8,
    tabular: { apoe: "ε4/ε4", marital: "Widowed", icvMm3: 1_380_000, hippocampusMm3: 5_200 },
    status: "processando",
    createdAgo: 2 * 60_000,
  },
  {
    n: 1040,
    name: "José Carlos Lima",
    age: 66,
    sex: "M",
    educationYears: 12,
    tabular: { marital: "Divorced" },
    status: "erro",
    createdAgo: 2 * DAY,
    error: "A série enviada não é T1 volumétrica (MPRAGE): o skull strip não encontrou o encéfalo. Reenvie a sequência correta.",
  },
];

export function createSeed(now = Date.now()) {
  const ago = (ms: number) => new Date(now - ms).toISOString();

  const cases = CASES.map((s): ClinicalCase => {
    const birthYear = new Date(now).getFullYear() - s.age;
    const patient: Patient = {
      id: `p_${s.n}`,
      name: s.name,
      code: `PAC-${String(s.n - 600).padStart(4, "0")}`,
      birthDate: `${birthYear}-03-15`,
      age: s.age,
      sex: s.sex,
      educationYears: s.educationYears,
    };
    const createdAt = ago(s.createdAgo);
    const hasPrediction = s.status === "aguardando_revisao" || s.status === "concluido";
    const generatedAt = ago(s.createdAgo - 40_000);
    return {
      id: `caso-${s.n}`,
      patient,
      status: s.status,
      createdAt,
      updatedAt: s.decision ? ago(s.createdAgo - 6 * HOUR) : createdAt,
      examDate: createdAt.slice(0, 10),
      createdBy: DEMO_USER.name,
      tabular: s.tabular,
      notes: s.notes,
      error: s.error,
      prediction: hasPrediction
        ? buildPrediction({ ...patient, tabular: s.tabular, seed: s.n, generatedAt })
        : undefined,
      decision: s.decision && {
        ...s.decision,
        decidedBy: DEMO_USER.name,
        decidedAt: ago(s.createdAgo - 6 * HOUR),
      },
    };
  });

  return { users: [DEMO_USER], cases };
}
