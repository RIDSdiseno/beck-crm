import { useContext } from "react";
import { PermisosContext, type PermisosContextValue } from "../context/PermisosContext";

export const usePermisos = (): PermisosContextValue => {
  const ctx = useContext(PermisosContext);
  if (!ctx) throw new Error("usePermisos debe usarse dentro de PermisosProvider");
  return ctx;
};
