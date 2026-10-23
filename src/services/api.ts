import type { Api } from "./contract";
import { httpApi } from "./http/httpApi";
import { mockApi } from "./mock/mockApi";

/** `VITE_USE_MOCK=false` ativa o backend real; qualquer outro valor mantém a API simulada. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

export const api: Api = USE_MOCK ? mockApi : httpApi;

export { ApiError } from "./contract";
