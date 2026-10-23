import { ApiError } from "../contract";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "/api";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

/** Callback chamado quando o backend responde 401 (sessão expirada). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function request<T>(
  method: Method,
  path: string,
  options: { body?: unknown; query?: Record<string, string | undefined>; signal?: AbortSignal } = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const isForm = options.body instanceof FormData;
  const response = await fetch(url, {
    method,
    signal: options.signal,
    headers: {
      Accept: "application/json",
      ...(isForm || options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: isForm ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) onUnauthorized?.();

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    let code: string | undefined;
    try {
      const data = (await response.json()) as { message?: string; detail?: string; code?: string };
      message = data.message ?? data.detail ?? message;
      code = data.code;
    } catch {
      /* corpo vazio ou não-JSON */
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
