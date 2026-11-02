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
    throw toApiError(response.status, await response.text());
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function toApiError(status: number, body: string) {
  let message = `Erro ${status}`;
  let code: string | undefined;
  try {
    const data = JSON.parse(body) as { message?: string; detail?: string; code?: string };
    message = data.message ?? data.detail ?? message;
    code = data.code;
  } catch {
    /* corpo vazio ou não-JSON */
  }
  return new ApiError(message, status, code);
}

/** POST multipart com progresso do envio (0–1). Usa XMLHttpRequest porque o fetch não informa o envio. */
export function upload<T>(path: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", new URL(`${BASE_URL}${path}`, window.location.origin));
    xhr.setRequestHeader("Accept", "application/json");
    if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status === 401) onUnauthorized?.();
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(toApiError(xhr.status, xhr.responseText));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch {
        reject(new ApiError("O servidor devolveu uma resposta inválida.", xhr.status));
      }
    };
    xhr.onerror = () => reject(new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo."));
    xhr.send(form);
  });
}
