import React, { useEffect } from "react";
import type { AuthUser } from "../context/authContext";
import {
  authAPI,
  clearStoredSession,
  SESSION_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  EMPRESA_STORAGE_KEY,
} from "../services/api";
import type { RolUsuario } from "../types/usuario";

const CRM_ACCESS_DENIED_REDIRECT = "/login?crmAccess=denied";

const ROLE_MAP: Record<string, RolUsuario> = {
  administrador: "Administrador",
  terreno: "Terreno",
  jefeobra: "JefeObra",
  vendedor: "Vendedor",
  ingenieria: "Ingenieria",
  visualizador: "Visualizador",
  vendedor_firemat: "VendedorFiremat",
  bodeguero: "Bodeguero",
  visualizador_firemat: "VisualizadorFiremat",
};

const isCrmBlockedRole = (rol: RolUsuario): boolean =>
  rol === "Terreno" || rol === "JefeObra";

const getEmpresaPorEmail = (email?: string): "beck" | "firemat" => {
  const lower = email?.toLowerCase() ?? "";
  if (lower.endsWith("@firemat.cl")) return "firemat";
  return "beck";
};

let activeCallbackKey: string | null = null;
let activeCallbackPromise: Promise<void> | null = null;

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
    rol: ROLE_MAP[user.rol.trim().toLowerCase()] || "Visualizador",
  };
};

const redirectTo = (path: string) => {
  window.location.replace(path);
};

const AuthCallback: React.FC = () => {
  useEffect(() => {
    const rawHash = window.location.hash;
    const rawSearch = window.location.search;
    const callbackKey = `${rawSearch}|${rawHash}`;

    if (activeCallbackKey === callbackKey && activeCallbackPromise) {
      return;
    }

    const processCallback = async () => {
      const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(rawSearch);

      const error = hashParams.get("error") || searchParams.get("error");
      const token = hashParams.get("token") || searchParams.get("token");
      const empresaDefaultParam =
        hashParams.get("empresaDefault") || searchParams.get("empresaDefault");

      if (error || !token) {
        clearStoredSession();
        redirectTo("/login");
        return;
      }

      try {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);

        const meResponse = await authAPI.me();
        const authUser = parseAuthUser(meResponse);

        if (!authUser) {
          throw new Error("No se pudo obtener el usuario autenticado");
        }

        if (isCrmBlockedRole(authUser.rol)) {
          clearStoredSession();
          redirectTo(CRM_ACCESS_DENIED_REDIRECT);
          return;
        }

        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));

        let empresa: "beck" | "firemat";
        if (empresaDefaultParam === "beck" || empresaDefaultParam === "firemat") {
          empresa = empresaDefaultParam;
        } else {
          const meEmpresa = (meResponse as { empresaDefault?: string }).empresaDefault;
          if (meEmpresa === "beck" || meEmpresa === "firemat") {
            empresa = meEmpresa;
          } else {
            empresa = getEmpresaPorEmail(authUser.email);
          }
        }

        window.localStorage.setItem(EMPRESA_STORAGE_KEY, empresa);

        redirectTo(empresa === "firemat" ? "/firemat/dashboard" : "/beck/dashboard");
      } catch {
        clearStoredSession();
        redirectTo("/login");
      }
    };

    const promise = processCallback().finally(() => {
      activeCallbackKey = null;
      activeCallbackPromise = null;
    });

    activeCallbackKey = callbackKey;
    activeCallbackPromise = promise;

    void promise;
  }, []);

  return null;
};

export default AuthCallback;
