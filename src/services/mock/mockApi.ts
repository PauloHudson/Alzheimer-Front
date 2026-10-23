import type {
  AuditEvent,
  CaseStatus,
  CaseSummary,
  ClinicalCase,
  DashboardStats,
  DiagnosticClass,
  User,
} from "@/types";
import { ApiError, type Api } from "../contract";
import { getAuthToken } from "../http/client";
import { canDecide } from "@/lib/domain";
import { sleep, uid } from "@/lib/utils";
import { createSeed, type MockUser } from "./seed";
import { buildPrediction, profileFromIntake } from "./prediction";

/**
 * API simulada em memória, persistida no localStorage para que decisões,
 * encaminhamentos e novos casos sobrevivam a recarregamentos durante testes de usabilidade.
 */

const STORAGE_KEY = "mxai.mockdb.v3";
/** Duração simulada da inferência do modelo. */
const PROCESSING_MS = 18_000;

interface MockDb {
  users: MockUser[];
  cases: ClinicalCase[];
  sessions: Record<string, string>;
  /** Início da inferência simulada por caso (ms). Começa na primeira consulta, não na criação do seed. */
  processingStart: Record<string, number>;
}

let db: MockDb = load();

function fresh(sessions: Record<string, string> = {}): MockDb {
  return { ...createSeed(), sessions, processingStart: {} };
}

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Omit<MockDb, "processingStart"> & Partial<MockDb>;
      return { ...parsed, processingStart: parsed.processingStart ?? {} };
    }
  } catch {
    /* armazenamento indisponível (modo privado etc.) — segue em memória */
  }
  return fresh();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* ignora: os dados permanecem em memória nesta sessão */
  }
}

const latency = (min = 250, max = 650) => sleep(min + Math.random() * (max - min));

function publicUser({ password: _password, ...user }: MockUser): User {
  return user;
}

function currentUser(): MockUser {
  const token = getAuthToken();
  const userId = token ? db.sessions[token] : undefined;
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new ApiError("Sessão expirada. Entre novamente.", 401, "unauthorized");
  return user;
}

function createSession(user: MockUser) {
  const token = `mock_${uid("tk")}`;
  db.sessions[token] = user.id;
  save();
  return {
    token,
    user: publicUser(user),
    expiresAt: new Date(Date.now() + 8 * 3_600_000).toISOString(),
  };
}

function findCase(id: string) {
  const found = db.cases.find((c) => c.id === id);
  if (!found) throw new ApiError("Caso não encontrado.", 404, "not_found");
  return found;
}

function audit(c: ClinicalCase, action: AuditEvent["action"], actor: string, detail: string) {
  const at = new Date().toISOString();
  c.audit.push({ id: uid("ev"), action, actor, at, detail });
  c.updatedAt = at;
}

/** Avança casos em processamento conforme o tempo passa. */
function tick() {
  let changed = false;
  for (const c of db.cases) {
    if (c.status !== "processando") continue;
    const start = (db.processingStart[c.id] ??= Date.now() - ((c.progress ?? 0) / 100) * PROCESSING_MS);
    const elapsed = Date.now() - start;
    if (elapsed >= PROCESSING_MS) {
      c.prediction = buildPrediction(
        profileFromIntake({
          age: c.patient.age,
          sex: c.patient.sex,
          educationYears: c.patient.educationYears,
          familyHistory: c.clinical.familyHistory,
          mmse: c.clinical.mmse,
          moca: c.clinical.moca,
          cdrSb: c.clinical.cdrSb,
          generatedAt: new Date().toISOString(),
        }),
      );
      c.status = "aguardando_revisao";
      c.progress = undefined;
      audit(c, "analise_concluida", "Sistema", "Sugestão gerada pelo modelo.");
    } else {
      c.progress = Math.min(97, Math.round((elapsed / PROCESSING_MS) * 100));
    }
    changed = true;
  }
  if (changed) save();
}

const STATUS_ORDER: Record<CaseStatus, number> = {
  aguardando_revisao: 0,
  encaminhado: 1,
  processando: 2,
  pendencia: 3,
  concluido: 4,
};

function toSummary(c: ClinicalCase): CaseSummary {
  const probs = c.prediction?.probabilities;
  return {
    id: c.id,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    examDate: c.examDate,
    requestedBy: c.requestedBy,
    progress: c.progress,
    patient: {
      id: c.patient.id,
      name: c.patient.name,
      code: c.patient.code,
      age: c.patient.age,
      sex: c.patient.sex,
    },
    suggested: c.prediction?.suggested,
    confidence: c.prediction?.confidence,
    topProbability: probs ? Math.max(...Object.values(probs)) : undefined,
    finalDiagnosis: c.decision?.finalDiagnosis,
    agreement: c.decision?.agreement,
    hasOpinion: c.referrals.some((r) => r.status === "respondido"),
    pendingCount: c.pendingItems?.length ?? 0,
  };
}

const clone = <T>(value: T): T => structuredClone(value);

export const mockApi: Api = {
  auth: {
    async login({ email, password }) {
      await latency(500, 900);
      const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) {
        throw new ApiError("E-mail ou senha incorretos.", 401, "invalid_credentials");
      }
      return createSession(user);
    },

    async register(input) {
      await latency(600, 1000);
      if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        throw new ApiError("Já existe uma conta com este e-mail.", 409, "email_taken");
      }
      const user: MockUser = { id: uid("u"), ...input };
      db.users.push(user);
      return createSession(user);
    },

    async requestPasswordReset() {
      // Resposta idêntica exista ou não a conta, para não revelar e-mails cadastrados.
      await latency(500, 800);
    },

    async logout() {
      const token = getAuthToken();
      if (token) {
        delete db.sessions[token];
        save();
      }
    },
  },

  cases: {
    async list(filters = {}) {
      await latency(200, 450);
      currentUser();
      tick();
      const search = filters.search?.trim().toLowerCase();
      return db.cases
        .filter((c) => (filters.status && filters.status !== "todos" ? c.status === filters.status : true))
        .filter((c) =>
          filters.suggested && filters.suggested !== "todos" ? c.prediction?.suggested === filters.suggested : true,
        )
        .filter((c) =>
          search
            ? [c.patient.name, c.patient.code, c.id].some((field) => field.toLowerCase().includes(search))
            : true,
        )
        .sort(
          (a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .map(toSummary);
    },

    async get(id) {
      await latency(250, 500);
      currentUser();
      tick();
      return clone(findCase(id));
    },

    async stats() {
      await latency(200, 400);
      currentUser();
      tick();
      const monthAgo = Date.now() - 30 * 24 * 3_600_000;
      const count = (status: CaseStatus) => db.cases.filter((c) => c.status === status).length;
      const agreement = { concorda: 0, ajusta: 0, discorda: 0 };
      const bySuggestion: Record<DiagnosticClass, number> = { CN: 0, MCI: 0, AD: 0 };
      for (const c of db.cases) {
        if (c.decision) agreement[c.decision.agreement] += 1;
        if (c.prediction) bySuggestion[c.prediction.suggested] += 1;
      }
      const stats: DashboardStats = {
        awaitingReview: count("aguardando_revisao"),
        processing: count("processando"),
        referred: count("encaminhado"),
        pending: count("pendencia"),
        completedThisMonth: db.cases.filter(
          (c) => c.decision && new Date(c.decision.decidedAt).getTime() >= monthAgo,
        ).length,
        agreement,
        bySuggestion,
      };
      return stats;
    },

    async create(input) {
      await latency(700, 1200);
      const user = currentUser();
      const nextNumber =
        Math.max(...db.cases.map((c) => Number(c.id.replace(/\D/g, "")) || 0), 1000) + 1;
      const now = new Date();
      const birth = new Date(input.patient.birthDate);
      const hadBirthday = now >= new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      const age = now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);

      const pendingItems: string[] = [];
      if (!input.acquisition.volumetricT1) pendingItems.push("Sequência T1 volumétrica ausente — necessária para medir o hipocampo");
      if (!input.acquisition.fullCoverage) pendingItems.push("Cobertura incompleta do encéfalo");
      if (input.acquisition.motionArtifact === "grave") pendingItems.push("Artefato de movimento grave");
      if (input.clinical.mmse === undefined && input.clinical.moca === undefined)
        pendingItems.push("Nenhum teste cognitivo informado (MMSE ou MoCA)");

      const createdAt = now.toISOString();
      const newCase: ClinicalCase = {
        id: `caso-${nextNumber}`,
        patient: {
          id: uid("p"),
          name: input.patient.name,
          code: `PAC-${String(nextNumber - 600).padStart(4, "0")}`,
          birthDate: input.patient.birthDate,
          age,
          sex: input.patient.sex,
          educationYears: input.patient.educationYears,
        },
        status: pendingItems.length ? "pendencia" : "processando",
        progress: pendingItems.length ? undefined : 0,
        createdAt,
        updatedAt: createdAt,
        examDate: input.examDate,
        requestedBy: user.role === "medico_clinico" ? user.name : "Dr. Marcos Andrade",
        preparedBy: user.name,
        acquisition: input.acquisition,
        clinical: input.clinical,
        pendingItems: pendingItems.length ? pendingItems : undefined,
        priorExams: [],
        addenda: [],
        referrals: [],
        audit: [
          {
            id: uid("ev"),
            action: "caso_criado",
            actor: user.name,
            at: createdAt,
            detail: `RM (${input.fileName}) e dados clínicos enviados. Identidade do paciente confirmada.`,
          },
        ],
      };
      if (pendingItems.length) {
        audit(newCase, "pendencia", "Sistema", `Análise bloqueada: ${pendingItems.length} item(ns) em aberto.`);
      }
      db.cases.push(newCase);
      if (newCase.status === "processando") db.processingStart[newCase.id] = Date.now();
      save();
      return clone(newCase);
    },

    async registerDecision(id, input) {
      await latency(500, 900);
      const user = currentUser();
      if (!canDecide(user.role)) throw new ApiError("Seu perfil não pode registrar decisões clínicas.", 403, "forbidden");
      const c = findCase(id);
      if (c.decision) {
        throw new ApiError("Este caso já tem uma decisão registrada. Use um adendo para complementar.", 409, "conflict");
      }
      if (!c.prediction) throw new ApiError("O caso ainda não tem sugestão do modelo.", 422, "not_ready");
      c.decision = { ...input, decidedBy: user.name, decidedAt: new Date().toISOString() };
      c.status = "concluido";
      audit(c, "decisao_registrada", user.name, "Decisão registrada com justificativa.");
      save();
      return clone(c);
    },

    async addAddendum(id, text) {
      await latency(300, 600);
      const user = currentUser();
      const c = findCase(id);
      c.addenda.push({ id: uid("ad"), text, author: user.name, createdAt: new Date().toISOString() });
      audit(c, "adendo", user.name, "Adendo incluído na decisão.");
      save();
      return clone(c);
    },

    async refer(id, input) {
      await latency(500, 900);
      const user = currentUser();
      const c = findCase(id);
      if (c.status === "concluido") throw new ApiError("Casos concluídos não podem ser encaminhados.", 409, "conflict");
      c.referrals.push({
        id: uid("ref"),
        ...input,
        createdAt: new Date().toISOString(),
        createdBy: user.name,
        status: "aguardando",
      });
      c.status = "encaminhado";
      audit(c, "encaminhado", user.name, `Encaminhado à ${input.specialty} (${input.urgency}).`);
      save();
      return clone(c);
    },

    async registerOpinion(id, referralId, input) {
      await latency(500, 900);
      const user = currentUser();
      const c = findCase(id);
      const referral = c.referrals.find((r) => r.id === referralId);
      if (!referral) throw new ApiError("Encaminhamento não encontrado.", 404, "not_found");
      referral.status = "respondido";
      referral.opinion = { ...input, date: input.date ?? new Date().toISOString() };
      if (c.status === "encaminhado") c.status = "aguardando_revisao";
      audit(c, "parecer_registrado", user.name, `Parecer de ${input.author} (${input.channel}) registrado.`);
      save();
      return clone(c);
    },

    async logEvent(id, action) {
      const user = currentUser();
      const c = findCase(id);
      const last = c.audit[c.audit.length - 1];
      // Evita poluir a trilha com aberturas repetidas em sequência.
      if (action === "caso_aberto" && last?.action === "caso_aberto" && last.actor === user.name) return;
      audit(c, action, user.name, action === "caso_aberto" ? "Caso revisado." : "Relatório exportado.");
      save();
    },
  },

  demo: {
    async reset() {
      await latency(300, 500);
      db = fresh(db.sessions);
      save();
    },
  },
};
