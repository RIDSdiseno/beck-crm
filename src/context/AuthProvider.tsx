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

const isRolUsuario = (value: unknown): value is RolUsuario =>
  value === "Administrador" ||
  value === "Vendedor" ||
  value === "Terreno" ||
  value === "Ingenieria" ||
  value === "Visualizador";

const parseAuthUser = (value: unknown): AuthUser | null => {
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

const persistSession = (user: AuthUser, token: string) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
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
      return parseAuthUser(JSON.parse(raw));
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
          error instanceof Error ? error.message : "Error al iniciar sesión";

        throw new Error(errorMessage);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    clearSession();
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
