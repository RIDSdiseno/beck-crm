import React, {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginResponse } from "../services/api";
import { authAPI } from "../services/api";
import type { RolUsuario } from "../types/usuario";
import {
  AuthContext,
  type AuthUser,
  type LoginParams,
} from "./authContext";

const SESSION_KEY = "beck_crm_session_v1";
const TOKEN_KEY = "beck_token";

const ROLE_MAP: Record<string, RolUsuario> = {
  administrador: "Administrador",
  terreno: "Terreno",
  vendedor: "Vendedor",
  ingenieria: "Ingenieria",
  visualizador: "Visualizador",
};

type BackendUser = {
  id?: unknown;
  nombre?: unknown;
  email?: unknown;
  rol?: unknown;
};

const isRolUsuario = (value: unknown): value is RolUsuario =>
  value === "Administrador" ||
  value === "Vendedor" ||
  value === "Terreno" ||
  value === "Ingenieria" ||
  value === "Visualizador";

const isSameAuthUser = (left: AuthUser | null, right: AuthUser): boolean =>
  Boolean(
    left &&
      left.id === right.id &&
      left.nombre === right.nombre &&
      left.email === right.email &&
      left.rol === right.rol
  );

const parseStoredAuthUser = (value: unknown): AuthUser | null => {
  if (!value || typeof value !== "object") return null;
  const user = value as Partial<AuthUser>;

  if (
    typeof user.id !== "string" ||
    typeof user.nombre !== "string" ||
    typeof user.email !== "string" ||
    !isRolUsuario(user.rol)
  ) {
    return null;
  }

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };
};

const buildAuthUser = (user: LoginResponse["user"]): AuthUser => ({
  id: user.id,
  nombre: user.nombre,
  email: user.email,
  rol: ROLE_MAP[user.rol] || "Visualizador",
});

const buildAuthUserFromBackend = (value: unknown): AuthUser | null => {
  const source =
    value && typeof value === "object" && "user" in value
      ? (value as { user?: unknown }).user
      : value;

  if (!source || typeof source !== "object") return null;

  const user = source as BackendUser;

  if (
    typeof user.id !== "string" ||
    typeof user.nombre !== "string" ||
    typeof user.email !== "string" ||
    typeof user.rol !== "string"
  ) {
    return null;
  }

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: ROLE_MAP[user.rol] || "Visualizador",
  };
};

const persistStoredUser = (user: AuthUser) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

const persistSession = (user: AuthUser, token: string) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOKEN_KEY, token);
  persistStoredUser(user);
};

const clearSession = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(SESSION_KEY);
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return parseStoredAuthUser(JSON.parse(raw));
    } catch {
      return null;
    }
  });

  const login = useCallback(
    async ({ email, password }: LoginParams): Promise<AuthUser> => {
      try {
        const response = await authAPI.login(email, password);
        const authUser = buildAuthUser(response.user);

        persistSession(authUser, response.token);
        setUser(authUser);

        return authUser;
      } catch (error: unknown) {
        clearSession();

        const errorMessage =
          error instanceof Error ? error.message : "Error al iniciar sesion";

        throw new Error(errorMessage);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    clearSession();
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthUser> => {
    const meResponse = await authAPI.me();
    const authUser = buildAuthUserFromBackend(meResponse);

    if (!authUser) {
      throw new Error("No se pudo obtener el usuario autenticado");
    }

    if (!isSameAuthUser(user, authUser)) {
      persistStoredUser(authUser);
      setUser(authUser);
    }

    return authUser;
  }, [user]);

  const value = useMemo(
    () => ({ user, login, logout, refreshSession }),
    [user, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
