import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const TOKEN_STORAGE_KEY = "beck_token";
export const SESSION_STORAGE_KEY = "beck_crm_session_v1";

let isRedirectingToLogin = false;

const isBrowser = () => typeof window !== "undefined";

export const getStoredToken = (): string | null => {
  if (!isBrowser()) {
    return null;
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim();
  return token ? token : null;
};

export const clearStoredSession = (): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};

const redirectToLogin = (): void => {
  if (!isBrowser()) {
    return;
  }

  const { pathname } = window.location;
  const isAuthRoute = pathname === "/login" || pathname === "/auth/callback";

  if (isAuthRoute || isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;
  window.location.replace("/login");
};

const isUnauthorizedStatus = (status?: number): status is 401 | 403 =>
  status === 401 || status === 403;

export const handleUnauthorizedSession = (status?: number): void => {
  if (!isUnauthorizedStatus(status)) {
    return;
  }

  clearStoredSession();
  redirectToLogin();
};

const withAuthHeaders = (headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers);
  const token = getStoredToken();

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  } else {
    requestHeaders.delete("Authorization");
  }

  return requestHeaders;
};

const resolveRequestInput = (input: RequestInfo | URL): RequestInfo | URL => {
  if (typeof input !== "string") {
    return input;
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  if (input.startsWith("/")) {
    return `${API_URL}${input}`;
  }

  return `${API_URL}/${input}`;
};

export const fetchWithAuth = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> => {
  const response = await fetch(resolveRequestInput(input), {
    ...init,
    headers: withAuthHeaders(init.headers),
  });

  handleUnauthorizedSession(response.status);

  return response;
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers);
    const token = getStoredToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.delete("Authorization");
    }

    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    handleUnauthorizedSession(status);

    return Promise.reject(error);
  }
);

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol:
      | "administrador"
      | "vendedor"
      | "terreno"
      | "ingenieria"
      | "visualizador";
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface CotizacionApiRecord {
  id: string;
  [key: string]: unknown;
}

export interface CotizacionLineaPayload {
  tipoLinea: "PRODUCTO" | "SERVICIO";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  orden: number;
  gananciaPct: number;
}

export interface CotizacionUpsertPayload {
  numero?: number;
  clienteNombre: string;
  obraId?: string;
  funnelBeckId?: string | null;
  subtotal: number;
  impuesto: number;
  total: number;
  vigencia: string;
  observaciones: string;
  descuento: number;
  aplicaImpuesto: boolean;
  estado: string;
  lineas: CotizacionLineaPayload[];
}

const unwrapApiResponse = <T>(payload: ApiResponseEnvelope<T>): T => {
  if (!payload.success) {
    throw new Error(payload.error || payload.message || "Error en la solicitud");
  }

  return payload.data;
};

export interface FunnelBeckOpportunity {
  id: string;
  nombreProyecto: string;
  empresa?: string | null;
  etapa?: string;
  [key: string]: unknown;
}

export interface FunnelBeckUpsertPayload {
  nombreProyecto: string;
  empresa?: string;
  valorOriginal: number;
  monedaOriginal: "CLP" | "UF" | "USD";
  fechaProbableCierre?: string;
  vendedor?: string;
  region?: string;
  comuna?: string;
  fuenteLead?: string;
  etapa?: string;
}

export const funnelBeckAPI = {
  listar: async (): Promise<FunnelBeckOpportunity[]> => {
    const response = await api.get<ApiResponseEnvelope<FunnelBeckOpportunity[]>>(
      "/funnel-beck"
    );
    return unwrapApiResponse(response.data);
  },

  crear: async (
    payload: FunnelBeckUpsertPayload
  ): Promise<FunnelBeckOpportunity> => {
    const response = await api.post<ApiResponseEnvelope<FunnelBeckOpportunity>>(
      "/funnel-beck",
      payload
    );
    return unwrapApiResponse(response.data);
  },

  actualizar: async (
    id: string,
    payload: FunnelBeckUpsertPayload
  ): Promise<FunnelBeckOpportunity> => {
    const response = await api.put<ApiResponseEnvelope<FunnelBeckOpportunity>>(
      `/funnel-beck/${id}`,
      payload
    );
    return unwrapApiResponse(response.data);
  },

  eliminar: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponseEnvelope<{ message?: string }>>(
      `/funnel-beck/${id}`
    );
    unwrapApiResponse(response.data);
  },

  listarCotizaciones: async (id: string): Promise<CotizacionApiRecord[]> => {
    const response = await api.get<ApiResponseEnvelope<CotizacionApiRecord[]>>(
      `/funnel-beck/${id}/cotizaciones`
    );
    return unwrapApiResponse(response.data);
  },
};

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export const cotizacionesAPI = {
  getAll: async (): Promise<CotizacionApiRecord[]> => {
    const response = await api.get<ApiResponseEnvelope<CotizacionApiRecord[]>>(
      "/cotizaciones"
    );
    return unwrapApiResponse(response.data);
  },

  getById: async (id: string): Promise<CotizacionApiRecord> => {
    const response = await api.get<ApiResponseEnvelope<CotizacionApiRecord>>(
      `/cotizaciones/${id}`
    );
    return unwrapApiResponse(response.data);
  },

  getPDF: async (id: string): Promise<Blob> => {
    const response = await api.get<Blob>(`/cotizaciones/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },

  create: async (
    payload: CotizacionUpsertPayload
  ): Promise<CotizacionApiRecord> => {
    const response = await api.post<ApiResponseEnvelope<CotizacionApiRecord>>(
      "/cotizaciones",
      payload
    );
    return unwrapApiResponse(response.data);
  },

  update: async (
    id: string,
    payload: CotizacionUpsertPayload
  ): Promise<CotizacionApiRecord> => {
    const response = await api.put<ApiResponseEnvelope<CotizacionApiRecord>>(
      `/cotizaciones/${id}`,
      payload
    );
    return unwrapApiResponse(response.data);
  },

  getVersiones: async (id: string): Promise<CotizacionApiRecord[]> => {
    const response = await api.get<ApiResponseEnvelope<CotizacionApiRecord[]>>(
      `/cotizaciones/${id}/versiones`
    );
    return unwrapApiResponse(response.data);
  },
};

export interface RegistroTerrenoInput {
  obra_id: string;
  descripcion_material: string;
  modulo: string;
  piso: string;
  eje_numerico: number;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  nombre_sellador: string;
  holgura: 1 | 1.2 | 1.4 | 1.8;
  accesibilidad: 1 | 2 | 3;
  observaciones?: string;
}

export interface RegistroTerreno extends RegistroTerrenoInput {
  id: string;
  usuario_id: string;
  fecha: string;
  dia_semana: string;
  fotos_urls: string[];
  procesado: boolean;
  created_at: string;
  updated_at: string;
}

export const registrosTerrenoAPI = {
  crear: async (
    data: RegistroTerrenoInput,
    fotos: File[]
  ): Promise<RegistroTerreno> => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    fotos.forEach((foto) => {
      formData.append("fotos", foto);
    });

    const response = await api.post<RegistroTerreno>(
      "/registros-terreno",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  listar: async (params?: { procesado?: boolean; obra_id?: string }) => {
    const response = await api.get<RegistroTerreno[]>("/registros-terreno", {
      params,
    });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get<RegistroTerreno>(`/registros-terreno/${id}`);
    return response.data;
  },

  pendientes: async () => {
    const response = await api.get<RegistroTerreno[]>(
      "/registros-terreno/pendientes"
    );
    return response.data;
  },
};

export interface ProcesamientoInput {
  registro_terreno_id: string;
  codigo: string;
  itemizado_id: string;
  notas?: string;
}

export interface Procesamiento extends ProcesamientoInput {
  id: string;
  usuario_id: string;
  total_sellos_calculado: number;
  created_at: string;
  updated_at: string;
}

export const procesamientoAPI = {
  procesar: async (data: ProcesamientoInput): Promise<Procesamiento> => {
    const response = await api.post<Procesamiento>("/procesamiento", data);
    return response.data;
  },

  listar: async (params?: { registro_terreno_id?: string }) => {
    const response = await api.get<Procesamiento[]>("/procesamiento", {
      params,
    });
    return response.data;
  },
};

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: "nuevo_registro" | "procesado" | "sistema";
  mensaje: string;
  referencia_id?: string;
  leido: boolean;
  created_at: string;
}

export const notificacionesAPI = {
  listar: async (params?: { leido?: boolean }) => {
    const response = await api.get<Notificacion[]>("/notificaciones", {
      params,
    });
    return response.data;
  },

  marcarLeida: async (id: string) => {
    const response = await api.put(`/notificaciones/${id}/leer`);
    return response.data;
  },

  marcarTodasLeidas: async () => {
    const response = await api.put("/notificaciones/leer-todas");
    return response.data;
  },

  noLeidas: async () => {
    const response = await api.get<number>("/notificaciones/no-leidas");
    return response.data;
  },
};

export interface Obra {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  cliente: string;
  activa: boolean;
  fecha_inicio?: string;
  fecha_termino?: string;
  created_at: string;
  updated_at: string;
}

export const obrasAPI = {
  listar: async (params?: { activa?: boolean }) => {
    const response = await api.get<Obra[]>("/obras", { params });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get<Obra>(`/obras/${id}`);
    return response.data;
  },

  crear: async (data: Omit<Obra, "id" | "created_at" | "updated_at">) => {
    const response = await api.post<Obra>("/obras", data);
    return response.data;
  },

  actualizar: async (
    id: string,
    data: Partial<Omit<Obra, "id" | "created_at" | "updated_at">>
  ) => {
    const response = await api.put<Obra>(`/obras/${id}`, data);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/obras/${id}`);
    return response.data;
  },
};

export interface Itemizado {
  id: string;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  precio_unitario: number;
  categoria: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export const itemizadosAPI = {
  listar: async (params?: { activo?: boolean; categoria?: string }) => {
    const response = await api.get<Itemizado[]>("/itemizados", { params });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get<Itemizado>(`/itemizados/${id}`);
    return response.data;
  },

  crear: async (
    data: Omit<Itemizado, "id" | "created_at" | "updated_at">
  ) => {
    const response = await api.post<Itemizado>("/itemizados", data);
    return response.data;
  },

  actualizar: async (
    id: string,
    data: Partial<Omit<Itemizado, "id" | "created_at" | "updated_at">>
  ) => {
    const response = await api.put<Itemizado>(`/itemizados/${id}`, data);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/itemizados/${id}`);
    return response.data;
  },
};

export type UsuarioApiRol =
  | "administrador"
  | "vendedor"
  | "terreno"
  | "ingenieria"
  | "visualizador";

export interface UsuarioApi {
  id: string;
  nombre: string;
  email: string;
  rol: UsuarioApiRol;
  activo: boolean;
  azureId: string | null;
  createdAt: string;
}

export interface ActualizarUsuarioInput {
  nombre?: string;
  email?: string;
  rol?: UsuarioApiRol;
  activo?: boolean;
}

export interface EliminarUsuarioResponse {
  message: string;
}

export const usuariosAPI = {
  listar: async () => {
    const response = await api.get<UsuarioApi[]>("/usuarios");
    return response.data;
  },

  actualizar: async (id: string, data: ActualizarUsuarioInput) => {
    const response = await api.put<UsuarioApi>(`/usuarios/${id}`, data);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete<EliminarUsuarioResponse>(`/usuarios/${id}`);
    return response.data;
  },
};

export interface DashboardStats {
  totalRegistros: number;
  registrosProcesados: number;
  registrosPendientes: number;
  totalSellos: number;
  sellosPonderados: number;
  obrasActivas: number;
  registrosHoy: number;
  obrasPorRegistros: {
    obraId: string;
    nombre: string;
    codigo: string;
    registros: number;
  }[];
}

export const statsAPI = {
  dashboard: async () => {
    const response = await api.get<DashboardStats>("/stats/dashboard");
    return response.data;
  },

  obras: async () => {
    const response = await api.get("/stats/obras");
    return response.data;
  },
};

export default api;

export type MovimientoCRMRecord = {
  id: string;
  usuarioId: string;
  modulo: "FUNNEL" | "COTIZACION" | "USUARIO" | "OBRA";
  tipo:
    | "OPORTUNIDAD_CREADA"
    | "OPORTUNIDAD_EDITADA"
    | "ETAPA_MODIFICADA"
    | "OPORTUNIDAD_ELIMINADA"
    | "COTIZACION_CREADA"
    | "COTIZACION_EDITADA"
    | "COTIZACION_ENVIADA"
    | "COTIZACION_ACEPTADA"
    | "COTIZACION_RECHAZADA"
    | "COTIZACION_ELIMINADA"
    | "USUARIO_CREADO"
    | "USUARIO_ACTIVADO"
    | "USUARIO_DESACTIVADO"
    | "ROL_CAMBIADO"
    | "OBRA_CREADA";
  entidadId?: string | null;
  descripcion: string;
  datos?: unknown;
  createdAt: string;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
};

export type MovimientosCRMResponse = {
  items: MovimientoCRMRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export const movimientosCrmAPI = {
  listar: async (params?: {
    page?: number;
    limit?: number;
    modulo?: string;
    tipo?: string;
    usuarioId?: string;
    entidadId?: string;
  }): Promise<MovimientosCRMResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.modulo) searchParams.set("modulo", params.modulo);
    if (params?.tipo) searchParams.set("tipo", params.tipo);
    if (params?.usuarioId) searchParams.set("usuarioId", params.usuarioId);
    if (params?.entidadId) searchParams.set("entidadId", params.entidadId);

    const query = searchParams.toString();
    const response = await fetchWithAuth(
      `/movimientos-crm${query ? `?${query}` : ""}`
    );
    const result =
      (await response.json()) as ApiResponseEnvelope<MovimientosCRMResponse>;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "No se pudieron cargar los movimientos");
    }

    return result.data;
  },

  getById: async (id: string): Promise<MovimientoCRMRecord> => {
    const response = await fetchWithAuth(`/movimientos-crm/${id}`);
    const result =
      (await response.json()) as ApiResponseEnvelope<MovimientoCRMRecord>;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "No se pudo cargar el movimiento");
    }

    return result.data;
  },
};
 