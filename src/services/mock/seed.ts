import type { AuditEvent, ClinicalCase, Patient, User } from "@/types";
import { buildPrediction, type PredictionProfile } from "./prediction";

/**
 * Dados de demonstração. Todos os pacientes são fictícios — vários vêm dos
 * cenários das Entregas 1 e 4 (Sr. Ivo/C02, Dona Aparecida/C03, Sr. Roberto/C04,
 * Maria Silva/narrativa da Entrega 1).
 */

export interface MockUser extends User {
  password: string;
}

export const DEMO_PASSWORD = "demo1234";

export const SEED_USERS: MockUser[] = [
  {
    id: "u_marcos",
    name: "Dr. Marcos Andrade",
    email: "medico@mxai.app",
    role: "medico_clinico",
    registry: "CRM-SP 182.334",
    institution: "Hospital Geral de São Bernardo",
    password: DEMO_PASSWORD,
  },
  {
    id: "u_cesar",
    name: "Dr. César Andrade de Melo",
    email: "neuro@mxai.app",
    role: "neurologista",
    registry: "CRM-SP 98.120",
    institution: "Centro de Referência em Demências",
    password: DEMO_PASSWORD,
  },
  {
    id: "u_bruno",
    name: "Bruno Tavares Lima",
    email: "tecnico@mxai.app",
    role: "tecnico",
    registry: "CRTR 12.345",
    institution: "Hospital Geral de São Bernardo",
    password: DEMO_PASSWORD,
  },
  {
    id: "u_helena",
    name: "Dra. Helena Siqueira Prado",
    email: "radio@mxai.app",
    role: "radiologista",
    registry: "CRM-SP 140.872",
    institution: "TeleRad Diagnósticos",
    password: DEMO_PASSWORD,
  },
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function createSeed(now = Date.now()) {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const dateOnly = (ms: number) => ago(ms).slice(0, 10);
  let auditSeq = 0;
  const ev = (action: AuditEvent["action"], actor: string, at: string, detail: string): AuditEvent => ({
    id: `ev_${++auditSeq}`,
    action,
    actor,
    at,
    detail,
  });

  const patient = (
    id: string,
    name: string,
    age: number,
    sex: Patient["sex"],
    educationYears: number,
    code: string,
  ): Patient => ({
    id,
    name,
    code,
    age,
    sex,
    educationYears,
    birthDate: `${new Date(now).getFullYear() - age}-0${(age % 9) + 1}-1${age % 9}`,
  });

  const profile = (p: Omit<PredictionProfile, "generatedAt">, generatedAt: string): PredictionProfile => ({
    ...p,
    generatedAt,
  });

  const cases: ClinicalCase[] = [];

  // ---------------------------------------------------------------- 1. Sr. Ivo — cenário C02 / tarefa T01
  {
    const created = ago(3 * HOUR);
    const analysed = ago(2.8 * HOUR);
    const opinionDate = ago(62 * DAY);
    cases.push({
      id: "caso-1042",
      patient: patient("p_ivo", "Ivo Bittencourt", 71, "M", 8, "PAC-0417"),
      status: "aguardando_revisao",
      createdAt: created,
      updatedAt: analysed,
      examDate: dateOnly(3 * HOUR),
      requestedBy: "Dr. Marcos Andrade",
      preparedBy: "Bruno Tavares Lima",
      acquisition: { volumetricT1: true, fullCoverage: true, motionArtifact: "nenhum" },
      clinical: {
        mmse: 24,
        moca: 21,
        familyHistory: false,
        chiefComplaint: "Piora perceptível da memória nas últimas semanas, relatada pelo filho.",
        clinicalQuestion: "Houve progressão em relação à avaliação de 2 meses atrás? Manter conduta ou reencaminhar?",
        familyReport:
          "Filho relata que o pai esqueceu compromissos médicos duas vezes no último mês e repete perguntas no mesmo dia.",
      },
      prediction: buildPrediction(
        profile(
          {
            probabilities: { CN: 0.16, MCI: 0.58, AD: 0.26 },
            age: 71,
            sex: "M",
            educationYears: 8,
            familyHistory: false,
            mmse: 24,
            moca: 21,
            hippocampusLeft: 2.98,
            hippocampusRight: 3.18,
            hippocampusPercentile: 9,
            entorhinalThickness: 3.02,
            entorhinalPercentile: 18,
            ventricularVolume: 41,
            ventricularPercentile: 66,
            priorMmse: 26,
          },
          analysed,
        ),
      ),
      priorExams: [
        { id: "ex-ivo-1", date: dateOnly(240 * DAY), mmse: 27 },
        {
          id: "ex-ivo-2",
          date: dateOnly(64 * DAY),
          mmse: 26,
          moca: 23,
          hippocampalVolume: 6.38,
          suggested: "MCI",
          finalDiagnosis: "MCI",
        },
      ],
      addenda: [],
      referrals: [
        {
          id: "ref-ivo-1",
          specialty: "Neurologia",
          specialist: "Dr. César Andrade de Melo",
          reason: "MMSE limítrofe (26) e laudo de RM pouco conclusivo sobre o hipocampo.",
          question: "Os achados são compatíveis com CCL ou já com doença de Alzheimer inicial?",
          urgency: "rotina",
          createdAt: ago(63 * DAY),
          createdBy: "Dr. Marcos Andrade",
          status: "respondido",
          opinion: {
            author: "Dr. César Andrade de Melo",
            specialty: "Neurologia",
            channel: "telefone",
            date: opinionDate,
            conclusion: "Compatível com comprometimento cognitivo leve, sem elementos fortes para Alzheimer neste momento.",
            criteria: [
              "Redução hipocampal discreta e simétrica, percentil ~15 para a idade",
              "MMSE 26 com escolaridade de 8 anos — dentro do limítrofe",
              "Autonomia preservada nas atividades instrumentais",
              "Sem histórico familiar de demência",
            ],
            recommendation: "Reavaliar em 6 meses com nova RM volumétrica e MoCA. Reencaminhar antes se houver piora funcional.",
          },
        },
      ],
      audit: [
        ev("encaminhado", "Dr. Marcos Andrade", ago(63 * DAY), "Encaminhado à Neurologia (rotina)."),
        ev(
          "parecer_registrado",
          "Dr. Marcos Andrade",
          opinionDate,
          "Parecer do Dr. César (telefone) registrado de forma estruturada.",
        ),
        ev("caso_criado", "Bruno Tavares Lima", created, "Nova RM e dados clínicos enviados para análise."),
        ev("analise_concluida", "Sistema", analysed, "Sugestão gerada pelo modelo."),
      ],
    });
  }

  // ---------------------------------------------------------------- 2. Maria Silva — narrativa da Entrega 1
  {
    const created = ago(26 * HOUR);
    const analysed = ago(25.7 * HOUR);
    cases.push({
      id: "caso-1039",
      patient: patient("p_maria", "Maria Silva", 72, "F", 11, "PAC-0388"),
      status: "aguardando_revisao",
      createdAt: created,
      updatedAt: analysed,
      examDate: dateOnly(26 * HOUR),
      requestedBy: "Dr. Marcos Andrade",
      preparedBy: "Bruno Tavares Lima",
      acquisition: { volumetricT1: true, fullCoverage: true, motionArtifact: "leve" },
      clinical: {
        mmse: 27,
        moca: 24,
        familyHistory: false,
        chiefComplaint: "Esquecimento de compromissos há 18 meses; viúva há 3 anos.",
        clinicalQuestion: "Esquecimento por declínio neurodegenerativo ou associado a quadro depressivo?",
        familyReport: "Filha relata desânimo, isolamento e perda de interesse desde a morte do marido.",
      },
      prediction: buildPrediction(
        profile(
          {
            probabilities: { CN: 0.42, MCI: 0.37, AD: 0.21 },
            age: 72,
            sex: "F",
            educationYears: 11,
            familyHistory: false,
            mmse: 27,
            moca: 24,
            hippocampusLeft: 3.12,
            hippocampusRight: 3.2,
            hippocampusPercentile: 31,
            entorhinalThickness: 3.31,
            entorhinalPercentile: 38,
            ventricularVolume: 33,
            ventricularPercentile: 48,
          },
          analysed,
        ),
      ),
      priorExams: [],
      addenda: [],
      referrals: [],
      audit: [
        ev("caso_criado", "Bruno Tavares Lima", created, "RM e dados clínicos enviados para análise."),
        ev("analise_concluida", "Sistema", analysed, "Sugestão gerada pelo modelo."),
      ],
    });
    const maria = cases[cases.length - 1]!;
    maria.prediction!.caveats.push(
      "Sintomas depressivos relatados pela família: quadros depressivos podem produzir queixas de memória (pseudodemência) que o modelo não avalia.",
      "Artefato de movimento leve na aquisição — volumes podem ter pequena imprecisão.",
    );
  }

  // ---------------------------------------------------------------- 3. Sebastião — padrão avançado
  {
    const created = ago(5 * HOUR);
    const analysed = ago(4.7 * HOUR);
    cases.push({
      id: "caso-1041",
      patient: patient("p_sebastiao", "Sebastião Moura", 81, "M", 4, "PAC-0402"),
      status: "aguardando_revisao",
      createdAt: created,
      updatedAt: analysed,
      examDate: dateOnly(5 * HOUR),
      requestedBy: "Dr. Marcos Andrade",
      preparedBy: "Bruno Tavares Lima",
      acquisition: { volumetricT1: true, fullCoverage: true, motionArtifact: "nenhum" },
      clinical: {
        mmse: 19,
        moca: 14,
        cdrSb: 4.5,
        familyHistory: true,
        chiefComplaint: "Desorientação espacial e dificuldade para gerir medicamentos.",
        clinicalQuestion: "Padrão de imagem compatível com doença de Alzheimer?",
      },
      prediction: buildPrediction(
        profile(
          {
            probabilities: { CN: 0.04, MCI: 0.18, AD: 0.78 },
            age: 81,
            sex: "M",
            educationYears: 4,
            familyHistory: true,
            mmse: 19,
            moca: 14,
            cdrSb: 4.5,
            hippocampusLeft: 2.41,
            hippocampusRight: 2.63,
            hippocampusPercentile: 2,
            entorhinalThickness: 2.58,
            entorhinalPercentile: 4,
            ventricularVolume: 62,
            ventricularPercentile: 93,
          },
          analysed,
        ),
      ),
      priorExams: [],
      addenda: [],
      referrals: [],
      audit: [
        ev("caso_criado", "Bruno Tavares Lima", created, "RM e dados clínicos enviados para análise."),
        ev("analise_concluida", "Sistema", analysed, "Sugestão gerada pelo modelo."),
      ],
    });
  }

  // ---------------------------------------------------------------- 4. Roberto Mendes — cenário C04, encaminhado
  {
    const created = ago(4 * DAY);
    const analysed = ago(4 * DAY - 0.3 * HOUR);
    cases.push({
      id: "caso-1031",
      patient: patient("p_roberto", "Roberto Mendes", 76, "M", 12, "PAC-0351"),
      status: "encaminhado",
      createdAt: created,
      updatedAt: ago(3.8 * DAY),
      examDate: dateOnly(4 * DAY),
      requestedBy: "Dr. Marcos Andrade",
      preparedBy: "Bruno Tavares Lima",
      acquisition: { volumetricT1: true, fullCoverage: true, motionArtifact: "nenhum" },
      clinical: {
        mmse: 26,
        moca: 22,
        familyHistory: false,
        chiefComplaint: "Episódios de desorientação; perdeu-se voltando da padaria.",
        clinicalQuestion: "Há segurança para manter a direção de veículo e a autonomia atual?",
        familyReport:
          "Filha relata que o pai se perdeu voltando da padaria e errou o pagamento de contas domésticas; insiste em continuar dirigindo.",
      },
      prediction: buildPrediction(
        profile(
          {
            probabilities: { CN: 0.11, MCI: 0.52, AD: 0.37 },
            age: 76,
            sex: "M",
            educationYears: 12,
            familyHistory: false,
            mmse: 26,
            moca: 22,
            hippocampusLeft: 2.86,
            hippocampusRight: 3.05,
            hippocampusPercentile: 12,
            entorhinalThickness: 2.94,
            entorhinalPercentile: 14,
            ventricularVolume: 46,
            ventricularPercentile: 72,
            priorMmse: 26,
          },
          analysed,
        ),
      ),
      priorExams: [
        { id: "ex-rob-1", date: dateOnly(190 * DAY), mmse: 26, moca: 24, hippocampalVolume: 6.12, suggested: "MCI" },
      ],
      addenda: [],
      referrals: [
        {
          id: "ref-rob-1",
          specialty: "Neurologia",
          specialist: "Dr. César Andrade de Melo",
          reason:
            "Divergência entre MMSE estável e relato familiar de episódios de desorientação. Sugestão do modelo: CCL com confiança moderada.",
          question: "Há indicação de restringir a direção de veículo ou de avaliação neuropsicológica antes?",
          urgency: "prioritario",
          createdAt: ago(3.8 * DAY),
          createdBy: "Dr. Marcos Andrade",
          status: "aguardando",
        },
      ],
      audit: [
        ev("caso_criado", "Bruno Tavares Lima", created, "RM e dados clínicos enviados para análise."),
        ev("analise_concluida", "Sistema", analysed, "Sugestão gerada pelo modelo."),
        ev("caso_aberto", "Dr. Marcos Andrade", ago(3.85 * DAY), "Caso revisado."),
        ev("encaminhado", "Dr. Marcos Andrade", ago(3.8 * DAY), "Encaminhado à Neurologia (prioritário)."),
      ],
    });
  }

  // ---------------------------------------------------------------- 5. Dona Aparecida — cenário C03, pendência
  {
    const created = ago(1.5 * HOUR);
    cases.push({
      id: "caso-1043",
      patient: patient("p_aparecida", "Aparecida Souza", 74, "F", 6, "PAC-0421"),
      status: "pendencia",
      createdAt: created,
      updatedAt: created,
      examDate: dateOnly(1.5 * HOUR),
      requestedBy: "Dr. Marcos Andrade",
      preparedBy: "Bruno Tavares Lima",
      acquisition: {
        volumetricT1: false,
        fullCoverage: true,
        motionArtifact: "grave",
        notes: "Paciente inquieta; pediu para sair do aparelho. Uma sequência repetida.",
      },
      clinical: {
        mmse: 23,
        familyHistory: true,
        chiefComplaint: "Esquecimento progressivo há 1 ano.",
        clinicalQuestion: "Investigação de déficit cognitivo.",
      },
      pendingItems: [
        "Sequência T1 volumétrica ausente — necessária para medir o hipocampo",
        "Artefato de movimento grave nos lobos temporais",
        "MoCA não informado",
      ],
      priorExams: [],
      addenda: [],
      referrals: [],
      audit: [
        ev("caso_criado", "Bruno Tavares Lima", created, "Caso criado com pendências de aquisição."),
        ev("pendencia", "Sistema", created, "Análise bloqueada: 2 itens obrigatórios de qualidade em aberto."),
      ],
    });
  }

  // ---------------------------------------------------------------- 6. Em processamento
  {
    const created = new Date(now - 40_000).toISOString();
    cases.push({
      id: "caso-1044",
      patient: patient("p_lucia", "Lúcia Helena Prates", 70, "F", 15, "PAC-0425"),
      status: "processando",
      progress: 35,
      createdAt: created,
      updatedAt: created,
      examDate: dateOnly(0),
      requestedBy: "Dr. Marcos Andrade",
      preparedBy: "Bruno Tavares Lima",
      acquisition: { volumetricT1: true, fullCoverage: true, motionArtifact: "nenhum" },
      clinical: {
        mmse: 25,
        moca: 23,
        familyHistory: true,
        chiefComplaint: "Dificuldade para lembrar nomes e eventos recentes.",
        clinicalQuestion: "Investigação de comprometimento cognitivo leve.",
      },
      priorExams: [],
      addenda: [],
      referrals: [],
      audit: [ev("caso_criado", "Bruno Tavares Lima", created, "RM e dados clínicos enviados para análise.")],
    });
  }

  // ---------------------------------------------------------------- 7–10. Concluídos
  const concluded: Array<{
    id: string;
    p: Patient;
    days: number;
    profile: Omit<PredictionProfile, "generatedAt">;
    clinical: ClinicalCase["clinical"];
    decision: Omit<NonNullable<ClinicalCase["decision"]>, "decidedAt" | "decidedBy">;
  }> = [
    {
      id: "caso-1028",
      p: patient("p_joana", "Joana Ferreira", 68, "F", 16, "PAC-0330"),
      days: 6,
      clinical: {
        mmse: 29,
        moca: 27,
        familyHistory: true,
        chiefComplaint: "Preocupação com memória após diagnóstico da mãe.",
        clinicalQuestion: "Há sinais de neurodegeneração?",
      },
      profile: {
        probabilities: { CN: 0.84, MCI: 0.13, AD: 0.03 },
        age: 68,
        sex: "F",
        educationYears: 16,
        familyHistory: true,
        mmse: 29,
        moca: 27,
        hippocampusLeft: 3.52,
        hippocampusRight: 3.6,
        hippocampusPercentile: 61,
        entorhinalThickness: 3.58,
        entorhinalPercentile: 64,
        ventricularVolume: 26,
        ventricularPercentile: 35,
      },
      decision: {
        agreement: "concorda",
        finalDiagnosis: "CN",
        conduct: "Tranquilizar a paciente; reavaliação clínica em 12 meses.",
        justification:
          "Volume hipocampal preservado (percentil 61) e testes cognitivos normais. Histórico familiar justifica seguimento anual.",
        evidenceIds: ["f-hipocampo-esq", "f-mmse"],
      },
    },
    {
      id: "caso-1024",
      p: patient("p_antonio", "Antônio Carlos Ribeiro", 79, "M", 5, "PAC-0311"),
      days: 9,
      clinical: {
        mmse: 18,
        moca: 13,
        cdrSb: 5,
        familyHistory: false,
        chiefComplaint: "Perda de autonomia para atividades instrumentais.",
        clinicalQuestion: "Confirmar padrão de imagem.",
      },
      profile: {
        probabilities: { CN: 0.03, MCI: 0.16, AD: 0.81 },
        age: 79,
        sex: "M",
        educationYears: 5,
        familyHistory: false,
        mmse: 18,
        moca: 13,
        cdrSb: 5,
        hippocampusLeft: 2.35,
        hippocampusRight: 2.51,
        hippocampusPercentile: 1,
        entorhinalThickness: 2.49,
        entorhinalPercentile: 3,
        ventricularVolume: 66,
        ventricularPercentile: 95,
      },
      decision: {
        agreement: "concorda",
        finalDiagnosis: "AD",
        conduct: "Iniciar acompanhamento com neurologia e orientar família sobre cuidados.",
        justification:
          "Atrofia hipocampal bilateral acentuada (percentil 1), afinamento entorrinal e impacto funcional (CDR-SB 5).",
        evidenceIds: ["f-hipocampo-esq", "f-hipocampo-dir", "f-cdr"],
      },
    },
    {
      id: "caso-1019",
      p: patient("p_teresa", "Teresa Nogueira", 66, "F", 10, "PAC-0290"),
      days: 15,
      clinical: {
        mmse: 26,
        moca: 23,
        familyHistory: false,
        chiefComplaint: "Lapsos de memória no trabalho.",
        clinicalQuestion: "CCL?",
      },
      profile: {
        probabilities: { CN: 0.27, MCI: 0.55, AD: 0.18 },
        age: 66,
        sex: "F",
        educationYears: 10,
        familyHistory: false,
        mmse: 26,
        moca: 23,
        hippocampusLeft: 3.08,
        hippocampusRight: 3.22,
        hippocampusPercentile: 22,
        entorhinalThickness: 3.18,
        entorhinalPercentile: 27,
        ventricularVolume: 31,
        ventricularPercentile: 44,
      },
      decision: {
        agreement: "ajusta",
        finalDiagnosis: "MCI",
        conduct: "Investigar causas reversíveis (TSH, B12) e reavaliar em 6 meses.",
        justification:
          "Concordo com CCL, mas a confiança é moderada e há queixa de sono ruim. Antes de concluir, descartar causas reversíveis.",
        evidenceIds: ["f-moca"],
      },
    },
    {
      id: "caso-1015",
      p: patient("p_paulo", "Paulo Roberto Dias", 73, "M", 9, "PAC-0275"),
      days: 21,
      clinical: {
        mmse: 25,
        moca: 22,
        familyHistory: false,
        chiefComplaint: "Lentificação e esquecimento há 6 meses.",
        clinicalQuestion: "Padrão neurodegenerativo?",
      },
      profile: {
        probabilities: { CN: 0.12, MCI: 0.3, AD: 0.58 },
        age: 73,
        sex: "M",
        educationYears: 9,
        familyHistory: false,
        mmse: 25,
        moca: 22,
        hippocampusLeft: 2.79,
        hippocampusRight: 2.95,
        hippocampusPercentile: 8,
        entorhinalThickness: 2.9,
        entorhinalPercentile: 12,
        ventricularVolume: 48,
        ventricularPercentile: 78,
      },
      decision: {
        agreement: "discorda",
        finalDiagnosis: "MCI",
        conduct: "Tratar hipotireoidismo recém-diagnosticado e reavaliar cognição em 3 meses.",
        justification:
          "Hipotireoidismo não tratado (TSH 14) pode explicar parte do quadro e não é considerado pelo modelo. Mantenho CCL até reavaliação.",
        evidenceIds: ["f-mmse"],
      },
    },
  ];

  for (const c of concluded) {
    const created = ago(c.days * DAY);
    const analysed = ago(c.days * DAY - 0.3 * HOUR);
    const decided = ago(c.days * DAY - 5 * HOUR);
    cases.push({
      id: c.id,
      patient: c.p,
      status: "concluido",
      createdAt: created,
      updatedAt: decided,
      examDate: dateOnly(c.days * DAY),
      requestedBy: "Dr. Marcos Andrade",
      preparedBy: "Bruno Tavares Lima",
      acquisition: { volumetricT1: true, fullCoverage: true, motionArtifact: "nenhum" },
      clinical: c.clinical,
      prediction: buildPrediction({ ...c.profile, generatedAt: analysed }),
      priorExams: [],
      decision: { ...c.decision, decidedBy: "Dr. Marcos Andrade", decidedAt: decided },
      addenda: [],
      referrals: [],
      audit: [
        ev("caso_criado", "Bruno Tavares Lima", created, "RM e dados clínicos enviados para análise."),
        ev("analise_concluida", "Sistema", analysed, "Sugestão gerada pelo modelo."),
        ev("caso_aberto", "Dr. Marcos Andrade", ago(c.days * DAY - 4.8 * HOUR), "Caso revisado."),
        ev("decisao_registrada", "Dr. Marcos Andrade", decided, "Decisão registrada com justificativa."),
      ],
    });
  }

  return { users: SEED_USERS, cases };
}
