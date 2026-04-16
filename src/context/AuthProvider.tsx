import React, {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RolUsuario } from "../types/usuario";
import { authAPI } from "../services/api";
import {
  AuthContext,
  type AuthUser,
  type LoginParams,
} from "./authContext";

const SESSION_KEY = "beck_crm_session_v1";
const TOKEN_KEY = "beck_token";

const isRolUsuario = (value: unknown): value is RolUsuario =>
  value === "Administrador" ||
  value === "Vendedor" ||
  value === "Terreno" ||
  value === "Ingenieria" ||
  value === "Visualizador";

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
        const response = await authAPI.login(email, password || "");

        const rolMap: Record<string, RolUsuario> = {
          administrador: "Administrador",
          terreno: "Terreno",
          vendedor: "Vendedor",
          ingenieria: "Ingenieria",
          visualizador: "Visualizador",
        };

        const authUser: AuthUser = {
          id: response.user.id,
          nombre: response.user.nombre,
          email: response.user.email,
          rol: rolMap[response.user.rol] || "Visualizador",
        };

        if (typeof window !== "undefined") {
          window.localStorage.setItem(TOKEN_KEY, response.token);
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
        }

        setUser(authUser);
        return authUser;
      } catch (error: unknown) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(SESSION_KEY);
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al iniciar sesión";

        throw new Error(errorMessage);
      }
    },
    []
  );

  const loginMicrosoft = useCallback(
    async (token: string): Promise<AuthUser> => {
      try {
        const response = await authAPI.loginMicrosoft(token);

        const rolMap: Record<string, RolUsuario> = {
          administrador: "Administrador",
          vendedor: "Vendedor",
          terreno: "Terreno",
          ingenieria: "Ingenieria",
          visualizador: "Visualizador",
        };

        const authUser: AuthUser = {
          id: response.user.id,
          nombre: response.user.nombre,
          email: response.user.email,
          rol: rolMap[response.user.rol] || "Visualizador",
        };

        if (typeof window !== "undefined") {
          window.localStorage.setItem(TOKEN_KEY, response.token);
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
        }

        setUser(authUser);
        return authUser;
      } catch (error: unknown) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(SESSION_KEY);
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error con login Microsoft";

        throw new Error(errorMessage);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({ user, login, loginMicrosoft, logout }),
    [user, login, loginMicrosoft, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
