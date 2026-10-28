import type { CaseStatus, CaseSummary, ClinicalCase, User } from "@/types";
import { ApiError, type Api } from "../contract";
import { getAuthToken } from "../http/client";
import { sleep, uid } from "@/lib/utils";
import { createSeed, type MockUser } from "./seed";
import { buildPrediction } from "./prediction";

/**
 * API simulada em memória, persistida no localStorage para que decisões e
 * novos casos sobrevivam a recarregamentos durante testes de usabilidade.
 */

const STORAGE_KEY = "mxai.mockdb.v5";
/** Duração simulada da inferência (skull strip + CNN + Grad-CAM). */
const PROCESSING_MS = 12_000;

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
    if (raw) return JSON.parse(raw) as MockDb;
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

/** Conclui as inferências cujo tempo simulado já passou. */
function tick() {
  let changed = false;
  for (const c of db.cases) {
    if (c.status !== "processando") continue;
    const start = (db.processingStart[c.id] ??= Date.now());
    if (Date.now() - start < PROCESSING_MS) continue;
    const generatedAt = new Date().toISOString();
    c.prediction = buildPrediction({
      ...c.patient,
      tabular: c.tabular,
      seed: Number(c.id.replace(/\D/g, "")) || 1,
      generatedAt,
    });
    c.status = "aguardando_revisao";
    c.updatedAt = generatedAt;
    changed = true;
  }
  if (changed) save();
}

const STATUS_ORDER: Record<CaseStatus, number> = {
  aguardando_revisao: 0,
  processando: 1,
  erro: 2,
  concluido: 3,
};

function toSummary(c: ClinicalCase): CaseSummary {
  return {
    id: c.id,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    examDate: c.examDate,
    patient: {
      id: c.patient.id,
      name: c.patient.name,
      code: c.patient.code,
      age: c.patient.age,
      sex: c.patient.sex,
    },
    suggested: c.prediction?.suggested,
    probabilities: c.prediction?.probabilities,
    finalDiagnosis: c.decision?.finalDiagnosis,
  };
}

const clone = <T>(value: T): T => structuredClone(value);

function ageAt(birthDate: string, date: string) {
  const birth = new Date(birthDate);
  const at = new Date(date);
  const hadBirthday = at >= new Date(at.getFullYear(), birth.getMonth(), birth.getDate());
  return at.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);
}

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

    async create(input) {
      await latency(700, 1200);
      const user = currentUser();
      const nextNumber = Math.max(...db.cases.map((c) => Number(c.id.replace(/\D/g, "")) || 0), 1000) + 1;
      const createdAt = new Date().toISOString();
      const newCase: ClinicalCase = {
        id: `caso-${nextNumber}`,
        patient: {
          id: uid("p"),
          name: input.patient.name,
          code: `PAC-${String(nextNumber - 600).padStart(4, "0")}`,
          birthDate: input.patient.birthDate,
          age: ageAt(input.patient.birthDate, input.examDate),
          sex: input.patient.sex,
          educationYears: input.patient.educationYears,
        },
        status: "processando",
        createdAt,
        updatedAt: createdAt,
        examDate: input.examDate,
        createdBy: user.name,
        tabular: input.tabular,
        notes: input.notes,
      };
      db.cases.push(newCase);
      db.processingStart[newCase.id] = Date.now();
      save();
      return clone(newCase);
    },

    async registerDecision(id, input) {
      await latency(500, 900);
      const user = currentUser();
      const c = findCase(id);
      if (c.decision) throw new ApiError("Este caso já tem uma decisão registrada.", 409, "conflict");
      if (!c.prediction) throw new ApiError("O caso ainda não tem sugestão do modelo.", 422, "not_ready");
      const now = new Date().toISOString();
      c.decision = { ...input, decidedBy: user.name, decidedAt: now };
      c.status = "concluido";
      c.updatedAt = now;
      save();
      return clone(c);
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
