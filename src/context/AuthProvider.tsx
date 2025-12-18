import React, {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RolUsuario } from "../types/usuario";
import { loadUsuarios } from "../data/usuariosStorage";
import {
  AuthContext,
  type AuthUser,
  type LoginParams,
} from "./authContext";

const SESSION_KEY = "beck_crm_session_v1";

const isRolUsuario = (value: unknown): value is RolUsuario =>
  value === "Administrador" || value === "Terreno" || value === "Visualizador";

const parseAuthUser = (value: unknown): AuthUser | null => {
  if (!value || typeof value !== "object") return null;
  const u = value as Partial<AuthUser>;

  if (
    typeof u.id !== "string" ||
    typeof u.nombre !== "string" ||
    typeof u.email !== "string" ||
    !isRolUsuario(u.rol)
  ) {
    return null;
  }

  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return parseAuthUser(JSON.parse(raw));
    } catch {
      return null;
    }
  });

  const login = useCallback(async ({ email }: LoginParams): Promise<AuthUser> => {
    const emailNorm = normalizeEmail(email);
    const usuarios = loadUsuarios();

    const found = usuarios.find((u) => normalizeEmail(u.email) === emailNorm);
    if (!found) {
      throw new Error("Usuario no encontrado");
    }
    if (!found.activo) {
      throw new Error("Usuario inactivo");
    }

    const authUser: AuthUser = {
      id: found.id,
      nombre: found.nombre,
      email: found.email,
      rol: found.rol,
    };

    setUser(authUser);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    }

    return authUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
