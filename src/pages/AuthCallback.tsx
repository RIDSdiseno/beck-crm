import React, { useEffect } from "react";
import type { AuthUser } from "../context/authContext";
import { authAPI } from "../services/api";
import type { RolUsuario } from "../types/usuario";

const TOKEN_KEY = "beck_token";
const SESSION_KEY = "beck_crm_session_v1";

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

const parseAuthUser = (value: unknown): AuthUser | null => {
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

const clearSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(SESSION_KEY);
};

const redirectTo = (path: string) => {
  window.location.replace(path);
};

const AuthCallback: React.FC = () => {
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const error = params.get("error");
      const token = params.get("token");

      window.history.replaceState(null, document.title, window.location.pathname);

      if (error || !token) {
        clearSession();
        redirectTo("/login");
        return;
      }

      try {
        window.localStorage.setItem(TOKEN_KEY, token);

        const meResponse = await authAPI.me();
        const authUser = parseAuthUser(meResponse);

        if (!authUser) {
          throw new Error("No se pudo obtener el usuario autenticado");
        }

        window.localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
        redirectTo("/");
      } catch {
        clearSession();
        redirectTo("/login");
      }
    };

    void handleAuthCallback();
  }, []);

  return <div>Procesando autenticación...</div>;
};

export default AuthCallback;
