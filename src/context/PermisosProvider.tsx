import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { permisosUsuarioAPI, type ModuloBeck, type PermisoModulo } from "../services/api";
import { useAuth } from "./useAuth";
import { PermisosContext } from "./PermisosContext";

export const PermisosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permisos, setPermisos] = useState<PermisoModulo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingPermisos, setRefreshingPermisos] = useState(false);
  const loadingRef = useRef(false);

  const fetchPermisos = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setRefreshingPermisos(true);
    try {
      const data = await permisosUsuarioAPI.misPermisos();
      console.log("me permisos", data);
      setPermisos(Array.isArray(data) ? data : []);
    } catch {
      setPermisos([]);
    } finally {
      setLoading(false);
      setRefreshingPermisos(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setPermisos(null);
      return;
    }
    void fetchPermisos();
  }, [user?.id, fetchPermisos]);

  const canView = useCallback(
    (modulo: ModuloBeck): boolean => {
      // Only fall back to true during initial load (permisos === null).
      // During a refresh, permisos holds the previous data — use it instead of
      // returning true for everything, which would flash restricted modules.
      if (!permisos || !Array.isArray(permisos)) return true;
      const entry = permisos.find((p) => p.modulo === modulo);
      if (!entry) return true;
      return entry.puedeVer;
    },
    [permisos]
  );

  const canEdit = useCallback(
    (modulo: ModuloBeck): boolean => {
      if (!permisos || !Array.isArray(permisos)) return true;
      const entry = permisos.find((p) => p.modulo === modulo);
      if (!entry) return true;
      return entry.puedeEditar;
    },
    [permisos]
  );

  const value = useMemo(
    () => ({
      permisos,
      loading,
      loadingPermisos: loading,
      refreshingPermisos,
      // true once the first fetch has resolved (permisos is no longer null)
      permisosReady: permisos !== null,
      canView,
      canEdit,
      refreshPermisos: fetchPermisos,
    }),
    [permisos, loading, refreshingPermisos, canView, canEdit, fetchPermisos]
  );

  return <PermisosContext.Provider value={value}>{children}</PermisosContext.Provider>;
};
