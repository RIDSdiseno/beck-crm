import { mockUsuarios } from "./mockUsuarios";
import type { Usuario } from "../types/usuario";

const STORAGE_KEY = "beck_crm_usuarios_v1";

const isUsuario = (value: unknown): value is Usuario => {
  if (!value || typeof value !== "object") return false;
  const u = value as Partial<Usuario>;

  return (
    typeof u.id === "string" &&
    typeof u.nombre === "string" &&
    typeof u.email === "string" &&
    (u.rol === "Administrador" || u.rol === "Terreno" || u.rol === "Visualizador") &&
    typeof u.activo === "boolean" &&
    typeof u.creadoEn === "string"
  );
};

export const loadUsuarios = (): Usuario[] => {
  if (typeof window === "undefined") return mockUsuarios;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return mockUsuarios;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return mockUsuarios;

    const usuarios = parsed.filter(isUsuario);
    return usuarios.length > 0 ? usuarios : mockUsuarios;
  } catch {
    return mockUsuarios;
  }
};

export const saveUsuarios = (usuarios: Usuario[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
};

export const resetUsuarios = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

