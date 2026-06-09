import { api } from "../services/api";

export interface ConfiguracionValidacion {
  id: number;
  modulo: string;
  regla: string;
  campo: string;
  etiqueta: string;
  nivel: "BLOQUEANTE" | "ADVERTENCIA";
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateConfiguracionValidacionPayload {
  nivel?: "BLOQUEANTE" | "ADVERTENCIA";
  activo?: boolean;
}

const extractArray = (payload: unknown): ConfiguracionValidacion[] => {
  if (Array.isArray(payload)) return payload as ConfiguracionValidacion[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as ConfiguracionValidacion[];
    if (Array.isArray(record.items)) return record.items as ConfiguracionValidacion[];
  }
  return [];
};

const extractObject = (payload: unknown): ConfiguracionValidacion => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
      return record.data as ConfiguracionValidacion;
    }
  }
  return payload as ConfiguracionValidacion;
};

export const getConfiguracionValidacion = async (): Promise<ConfiguracionValidacion[]> => {
  const response = await api.get<unknown>("/configuracion-validacion");
  return extractArray(response.data);
};

export const updateConfiguracionValidacion = async (
  id: number,
  payload: UpdateConfiguracionValidacionPayload
): Promise<ConfiguracionValidacion> => {
  const response = await api.put<unknown>(`/configuracion-validacion/${id}`, payload);
  return extractObject(response.data);
};
