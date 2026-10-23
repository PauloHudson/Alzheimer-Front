import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string, pattern = "dd/MM/yyyy") {
  return format(parseISO(iso), pattern, { locale: ptBR });
}

export function formatDateTime(iso: string) {
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelative(iso: string) {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ptBR });
}

export function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter((part) => part.length > 2 || /^[A-Z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Minúscula só na primeira letra, preservando siglas (MMSE, MoCA) e nomes próprios (Alzheimer). */
export function lowerFirst(text: string) {
  if (/^[A-Z][A-Z0-9]/.test(text) || /^[A-Z][a-z]+[A-Z]/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}
