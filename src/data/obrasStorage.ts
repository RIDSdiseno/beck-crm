import type { Obra } from "../types/obra";
import { mockObras } from "./mockObras";

const STORAGE_KEY = "beck_crm_obras_v1";

const isObra = (value: unknown): value is Obra => {
  if (!value || typeof value !== "object") return false;
  const o = value as Partial<Obra>;

  return (
    typeof o.id === "string" &&
    typeof o.nombre === "string" &&
    (o.codigo === undefined || typeof o.codigo === "string") &&
    typeof o.createdAt === "string"
  );
};

export const loadObras = (): Obra[] => {
  if (typeof window === "undefined") return mockObras;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return mockObras;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return mockObras;

    return parsed.filter(isObra);
  } catch {
    return mockObras;
  }
};

export const saveObras = (obras: Obra[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obras));
};

export const resetObras = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

