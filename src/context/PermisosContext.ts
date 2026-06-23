import { createContext } from "react";
import type { ModuloBeck, PermisoModulo } from "../services/api";

export type PermisosContextValue = {
  permisos: PermisoModulo[] | null;
  loading: boolean;
  loadingPermisos: boolean;
  refreshingPermisos: boolean;
  permisosReady: boolean;
  canView: (modulo: ModuloBeck) => boolean;
  canEdit: (modulo: ModuloBeck) => boolean;
  refreshPermisos: () => Promise<void>;
};

export const PermisosContext = createContext<PermisosContextValue | undefined>(undefined);
