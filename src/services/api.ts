import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const TOKEN_STORAGE_KEY = "beck_token";
export const SESSION_STORAGE_KEY = "beck_crm_session_v1";
export const EMPRESA_STORAGE_KEY = "empresaActiva";

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
  window.localStorage.removeItem(EMPRESA_STORAGE_KEY);
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

const isUnauthorizedStatus = (status?: number): boolean =>
  status === 401;

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
      | "jefeobra"
      | "ingenieria"
      | "visualizador"
      | "vendedor_firemat"
      | "bodeguero"
      | "visualizador_firemat";
  };
  empresaDefault?: "beck" | "firemat";
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
  tipoLinea: "PRODUCTO" | "SERVICIO" | "MANUAL" | "PRODUCTO_FIREMAT";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  orden: number;
  gananciaPct: number;
  productoFirematId?: number;
}

export interface CotizacionUpsertPayload {
  numero?: number;
  clienteNombre: string;
  obraId?: string;
  funnelBeckId?: string | null;
  clienteBeckId?: string | null;
  contactoBeckId?: string | null;
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

export type FunnelBeckArchivoTipo =
  | "DOCUMENTO_RECIBIDO"
  | "PLANO"
  | "FOTOGRAFIA"
  | "ORDEN_COMPRA"
  | "CONTRATO"
  | "CORREO_ACEPTACION"
  | "ANTICIPO"
  | "DOCUMENTO_REQUERIDO"
  | "DOCUMENTO_RESPALDO";

export interface FunnelBeckArchivo {
  id: string;
  oportunidadId: string;
  tipo: FunnelBeckArchivoTipo;
  url: string;
  publicId: string;
  nombreArchivo?: string;
  mimeType?: string;
  bytes?: number;
  createdAt: string;
}

export interface FunnelBeckGanadaSinObra {
  id: string;
  nombreProyecto: string;
  empresa: string;
  rutEmpresa?: string;
  montoFinalGanado?: number;
  fechaCierre?: string;
  documentoRespaldo?: string;
  flujoPosterior?: string;
  clienteBeck?: {
    id: string;
    rut: string;
    razonSocial: string;
    nombreEmpresa?: string;
    direccion?: string;
    telefono?: string;
    correo?: string;
    region?: string;
    comuna?: string;
  };
  contactoBeck?: {
    id: string;
    nombre: string;
    cargo?: string;
    telefono?: string;
    correo?: string;
  };
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
  // Prospecto
  rutEmpresa?: string;
  nombreContacto?: string;
  cargoContacto?: string;
  telefonoContacto?: string;
  correoContacto?: string;
  tipoCliente?: string;
  tipoOportunidad?: string;
  // Primer contacto
  fechaPrimerContacto?: string;
  tipoContacto?: string;
  necesidadDetectada?: string;
  timingEstimado?: string;
  nivelInteres?: string;
  proximaAccion?: string;
  fechaProximaAccion?: string;
  comentariosPrimerContacto?: string;
  // Visita / levantamiento tecnico
  fechaVisita?: string;
  responsableTecnico?: string;
  asistentes?: string;
  lugarVisita?: string;
  antecedentesLevantados?: string;
  documentosRecibidos?: string;
  planos?: string;
  basesTecnicas?: string;
  especificaciones?: string;
  fotografias?: string;
  observacionesTecnicas?: string;
  necesidadOficinaTecnica?: boolean;
  proximosPasos?: string;
  // Desarrollo de propuesta
  estadoDesarrolloPropuesta?: string;
  informacionPendiente?: string;
  documentosRequeridos?: string;
  riesgoTecnico?: string;
  condicionesEspeciales?: string;
  necesidadValidacionGerencial?: boolean;
  fechaComprometidaEnvio?: string;
  comentariosInternos?: string;
  // Propuesta enviada / negociacion
  fechaEnvioPropuesta?: string;
  versionPropuesta?: string;
  numeroPropuesta?: string;
  montoPropuesto?: number;
  fechaVencimientoPropuesta?: string;
  comentariosCliente?: string;
  // Negociacion
  probabilidadCierre?: number;
  objeciones?: string;
  contrapropuestas?: string;
  ajustesSolicitados?: string;
  // Documentacion de venta
  ordenCompra?: string;
  contrato?: string;
  correoAceptacion?: string;
  anticipo?: string;
  aprobacionInternaCliente?: string;
  condicionesPago?: string;
  documentosAdministrativosPendientes?: string;
  responsableAdministrativo?: string;
  fechaFirma?: string;
  fechaInicioProyecto?: string;
  traspasadoOperaciones?: boolean;
  fechaTraspasoOperaciones?: string;
  responsableTraspasoOperaciones?: string;
  observacionesTraspasoOperaciones?: string;
  traspasadoAdministracion?: boolean;
  fechaTraspasoAdministracion?: string;
  responsableTraspasoAdministracion?: string;
  observacionesTraspasoAdministracion?: string;
  // Cierre
  estadoCierre?: string;
  motivoPerdida?: string;
  etapaPerdida?: string;
  motivoPostergacion?: string;
  fechaReactivacion?: string;
  documentoRespaldo?: string;
  flujoPosterior?: string;
  montoFinalGanado?: number;
  fechaCierre?: string;
  // Cliente Beck asociado
  clienteBeckId?: string | null;
  contactoBeckId?: string | null;
  // Punto 10
  direccionProyecto?: string | null;
  unidadNegocio?: string | null;
  observaciones?: string | null;
  urgencia?: string | null;
  observacionCamposFaltantes?: string | null;
  // Punto 12 - Campos específicos Beck
  tipoProyecto?: string | null;
  empresaMandante?: string | null;
  necesidadLevantamiento?: boolean | null;
  oficinaTecnicaAsignada?: string | null;
  duracionEstimada?: string | null;
  estadoRevisionTecnica?: string | null;
  garantiasRequeridas?: string | null;
  estadoDocumentacionVenta?: string | null;
}

export type BeckCamposCriticosError = {
  advertenciasCamposCriticos: string[];
  requiereObservacionCamposFaltantes: boolean;
  message: string;
};

export const funnelBeckAPI = {
  listar: async (): Promise<FunnelBeckOpportunity[]> => {
    const response = await api.get<ApiResponseEnvelope<FunnelBeckOpportunity[]>>(
      "/funnel-beck"
    );
    return unwrapApiResponse(response.data);
  },

  ganadasSinObra: async (): Promise<FunnelBeckGanadaSinObra[]> => {
    const response = await api.get<ApiResponseEnvelope<FunnelBeckGanadaSinObra[]>>(
      "/funnel-beck/ganadas-sin-obra"
    );
    return unwrapApiResponse(response.data);
  },

  vincularObra: async (id: string, obraId: string): Promise<FunnelBeckOpportunity> => {
    const response = await api.patch<ApiResponseEnvelope<FunnelBeckOpportunity>>(
      `/funnel-beck/${id}/obra`,
      { obraId }
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

  listarArchivos: async (oportunidadId: string): Promise<FunnelBeckArchivo[]> => {
    const response = await api.get<ApiResponseEnvelope<FunnelBeckArchivo[]>>(
      `/funnel-beck/${oportunidadId}/archivos`
    );
    return unwrapApiResponse(response.data);
  },

  subirArchivos: async (
    oportunidadId: string,
    tipo: FunnelBeckArchivoTipo,
    files: File[]
  ): Promise<FunnelBeckArchivo[]> => {
    const formData = new FormData();
    formData.append("tipo", tipo);
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post<ApiResponseEnvelope<FunnelBeckArchivo[]>>(
      `/funnel-beck/${oportunidadId}/archivos`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return unwrapApiResponse(response.data);
  },

  eliminarArchivo: async (archivoId: string): Promise<void> => {
    const response = await api.delete<ApiResponseEnvelope<{ message?: string }>>(
      `/funnel-beck/archivos/${archivoId}`
    );
    unwrapApiResponse(response.data);
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

  delete: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponseEnvelope<{ message?: string }>>(
      `/cotizaciones/${id}`
    );
    unwrapApiResponse(response.data);
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
  factor_por_holguras?: number | string | null;
  cielo_modular?: number | string | null;
  cantidad_sellos_con_factores?: number | string | null;
  aislacion?: number | string | null;
  cantidad_sellos_aislacion?: number | string | null;
  reparacion_tabique?: number | string | null;
  cantidad_final?: number | string | null;
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
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  region?: string | null;
  comuna?: string | null;
  cliente?: string | null;
  funnelBeckId?: string | null;
  funnelBeck?: {
    id: string;
    nombreProyecto?: string | null;
    empresa?: string | null;
  } | null;
  oportunidad?: {
    id: string;
    nombreProyecto?: string | null;
    empresa?: string | null;
  } | null;
  activa: boolean;
  estado?: "activa" | "inactiva" | "pausada" | "finalizada";
  usuarios?: Array<{
    id: string;
    nombre?: string;
    email?: string;
    rol?: string;
  }>;
  fecha_inicio?: string;
  fecha_termino?: string;
  created_at: string;
  updated_at: string;
}

export type ObraEstado = "activa" | "inactiva" | "pausada" | "finalizada";

export interface CrearObraInput {
  nombre: string;
  codigo?: string | null;
  direccion?: string | null;
  region?: string | null;
  comuna?: string | null;
  cliente?: string | null;
  descripcion?: string | null;
  estado: ObraEstado;
  usuariosIds?: string[];
  funnelBeckId?: string;
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

  crear: async (data: CrearObraInput) => {
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

  actualizarEstado: async (id: string, estado: ObraEstado) => {
    const response = await api.patch<Obra>(`/obras/${id}/estado`, { estado });
    return response.data;
  },

  asignarUsuarios: async (id: string, usuariosIds: string[]) => {
    const response = await api.put<Obra>(`/obras/${id}/usuarios`,{
      usuariosIds,
    });
    return response.data;
  },

  obtenerUsuarios: async (id: string) =>{
    const response = await api.get<UsuarioApi[]>(`/obras/${id}/usuarios`);
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

export interface ItemizadoMandante {
  id: string;
  codigoBeck: string | null;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ItemizadoMandantePayload = {
  codigoBeck?: string | null;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

export const itemizadosMandanteAPI = {
  listar: async (params?: { incluirInactivos?: boolean }) => {
    const response = await api.get<ItemizadoMandante[]>("/itemizados-mandante", { params });
    return response.data;
  },

  crear: async (data: ItemizadoMandantePayload) => {
    const response = await api.post<ItemizadoMandante>("/itemizados-mandante", data);
    return response.data;
  },

  actualizar: async (id: string, data: Partial<ItemizadoMandantePayload>) => {
    const response = await api.put<ItemizadoMandante>(`/itemizados-mandante/${id}`, data);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete<ItemizadoMandante>(`/itemizados-mandante/${id}`);
    return response.data;
  },
};

export type UsuarioApiRol =
  | "administrador"
  | "vendedor"
  | "terreno"
  | "ingenieria"
  | "visualizador"
  | "jefeobra"
  | "vendedor_firemat"
  | "bodeguero"
  | "visualizador_firemat";

export interface UsuarioApi {
  id: string;
  nombre: string;
  email: string;
  rol: UsuarioApiRol;
  activo: boolean;
  azureId: string | null;
  createdAt: string;
}

export type UsuarioResumen = Pick<
  UsuarioApi,
  "id" | "nombre" | "email" | "rol" | "activo"
>;

export type EstadoSolicitudOficinaTecnica =
  | "pendiente"
  | "en_revision"
  | "aprobada"
  | "rechazada"
  | "informacion_pendiente"
  | string;

export interface SolicitudOficinaTecnica {
  id: string;
  oportunidadId: string;
  estado: EstadoSolicitudOficinaTecnica;
  responsableTecnico?: string | null;
  antecedentesLevantados?: string | null;
  basesTecnicas?: string | null;
  especificaciones?: string | null;
  observacionesTecnicas?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fechaSolicitud?: string;
  [key: string]: unknown;
}

export interface CrearSolicitudOficinaTecnicaPayload {
  oportunidadId: string;
  responsableTecnico?: string;
  antecedentesLevantados?: string;
  basesTecnicas?: string;
  especificaciones?: string;
  observacionesTecnicas?: string;
}

export interface ActualizarSolicitudOficinaTecnicaPayload
  extends Partial<CrearSolicitudOficinaTecnicaPayload> {
  estado?: EstadoSolicitudOficinaTecnica;
  comentariosRevision?: string;
  fechaRevision?: string;
}

export interface OficinaTecnicaPreventaFilters {
  estado?: EstadoSolicitudOficinaTecnica | "";
  responsableTecnico?: string;
  q?: string;
}

export interface ActualizarUsuarioInput {
  nombre?: string;
  email?: string;
  rol?: UsuarioApiRol;
  activo?: boolean;
}
export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: UsuarioApiRol;
  activo?: boolean;
}

export interface EliminarUsuarioResponse {
  message: string;
}

export const usuariosAPI = {
  listar: async (params?: { rol?: UsuarioApiRol; activo?: boolean }) => {
    const response = await api.get<UsuarioApi[]>("/usuarios", { params });
    return response.data;
  },

  listarJefesObra: async (): Promise<UsuarioResumen[]> => {
    const response = await api.get<UsuarioResumen[]>("/usuarios", {
      params: { rol: "jefeobra", activo: true },
    });
    return response.data;
  },

  crear: async (data: CrearUsuarioInput) => {
    const response = await api.post<UsuarioApi>("/usuarios", data);
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

  cambiarPassword: async (id: string, data: { password: string; confirmPassword: string }) => {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/usuarios/${id}/password`,
      data
    );
    return response.data;
  },
};

export const oficinaTecnicaPreventaAPI = {
  crear: async (
    payload: CrearSolicitudOficinaTecnicaPayload
  ): Promise<SolicitudOficinaTecnica> => {
    const response = await api.post<
      ApiResponseEnvelope<SolicitudOficinaTecnica> | SolicitudOficinaTecnica
    >("/oficina-tecnica-preventa", payload);
    return unwrapItem(response.data);
  },

  listar: async (
    filters?: OficinaTecnicaPreventaFilters
  ): Promise<SolicitudOficinaTecnica[]> => {
    const response = await api.get<
      ApiResponseEnvelope<SolicitudOficinaTecnica[]> | SolicitudOficinaTecnica[]
    >("/oficina-tecnica-preventa", { params: filters });
    return unwrapArray(response.data as ApiResponseEnvelope<SolicitudOficinaTecnica[]> | SolicitudOficinaTecnica[]);
  },

  obtener: async (id: string): Promise<SolicitudOficinaTecnica> => {
    const response = await api.get<
      ApiResponseEnvelope<SolicitudOficinaTecnica> | SolicitudOficinaTecnica
    >(`/oficina-tecnica-preventa/${id}`);
    return unwrapItem(response.data);
  },

  actualizar: async (
    id: string,
    payload: ActualizarSolicitudOficinaTecnicaPayload
  ): Promise<SolicitudOficinaTecnica> => {
    const response = await api.patch<
      ApiResponseEnvelope<SolicitudOficinaTecnica> | SolicitudOficinaTecnica
    >(`/oficina-tecnica-preventa/${id}`, payload);
    return unwrapItem(response.data);
  },
};

type EmpresaParam = "beck" | "firemat";

const extractArray = (payload: unknown): UsuarioApi[] => {
  if (Array.isArray(payload)) return payload as UsuarioApi[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const env = payload as { data?: unknown };
    if (Array.isArray(env.data)) return env.data as UsuarioApi[];
  }
  return [];
};

const extractItem = (payload: unknown): UsuarioApi => {
  if (payload && typeof payload === "object" && "data" in payload) {
    const env = payload as { data?: unknown };
    if (env.data && typeof env.data === "object") return env.data as UsuarioApi;
  }
  return payload as UsuarioApi;
};

export const usuariosParametrosAPI = {
  listar: async (empresa: EmpresaParam): Promise<UsuarioApi[]> => {
    const response = await api.get<unknown>(`/${empresa}/usuarios-parametros`);
    return extractArray(response.data);
  },

  crear: async (empresa: EmpresaParam, data: CrearUsuarioInput): Promise<UsuarioApi> => {
    const response = await api.post<unknown>(`/${empresa}/usuarios-parametros`, data);
    return extractItem(response.data);
  },

  editar: async (empresa: EmpresaParam, id: string, data: ActualizarUsuarioInput): Promise<UsuarioApi> => {
    const response = await api.put<unknown>(`/${empresa}/usuarios-parametros/${id}`, data);
    return extractItem(response.data);
  },

  eliminar: async (empresa: EmpresaParam, id: string): Promise<void> => {
    await api.delete(`/${empresa}/usuarios-parametros/${id}`);
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

export type DashboardBeckRango = "hoy" | "semana" | "mes" | "completa";

export interface DashboardBeckParams {
  obraId?: string;
  rango?: DashboardBeckRango;
}

export interface DashboardBeckObra {
  id: string;
  nombre: string;
  codigo?: string | null;
}

export interface DashboardBeckKpis {
  sellosEjecutados?: number;
  totalSellos?: number;
  sellos?: number;
  metrosLineales?: number;
  metros?: number;
  pendientesIngenieria?: number;
  pendientes?: number;
  validados?: number;
  enRevision?: number;
  rechazados?: number;
  pisosConRegistros?: number;
  selladoresDistintos?: number;
}

export interface DashboardBeckProduccionPiso {
  piso?: string | null;
  sellos?: number | null;
  sellosEjecutados?: number | null;
  metrosLineales?: number | null;
  metros?: number | null;
  registros?: number | null;
}

export interface DashboardBeckProduccionSellador {
  sellador?: string | null;
  nombreSellador?: string | null;
  nombre?: string | null;
  sellos?: number | null;
  sellosEjecutados?: number | null;
  metrosLineales?: number | null;
  metros?: number | null;
  registros?: number | null;
}

export interface DashboardBeckRegistro {
  id?: string | number;
  fecha?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  obra?: string | { nombre?: string | null } | null;
  obraNombre?: string | null;
  obra_nombre?: string | null;
  piso?: string | null;
  sellador?: string | null;
  nombreSellador?: string | null;
  cantidad?: number | null;
  cantidadSellos?: number | null;
  cantidad_sellos?: number | null;
  metros?: number | null;
  metrosLineales?: number | null;
  estado?: string | null;
  tipoRegistro?: string | null;
  tipo_registro?: string | null;
}

export interface DashboardBeckResponse {
  obras: DashboardBeckObra[];
  kpis?: DashboardBeckKpis;
  resumen?: DashboardBeckKpis;
  produccionPorPiso?: DashboardBeckProduccionPiso[];
  porPiso?: DashboardBeckProduccionPiso[];
  pisos?: DashboardBeckProduccionPiso[];
  produccionPorSellador?: DashboardBeckProduccionSellador[];
  produccionPorPersona?: DashboardBeckProduccionSellador[];
  porSellador?: DashboardBeckProduccionSellador[];
  selladores?: DashboardBeckProduccionSellador[];
  ultimosRegistros?: DashboardBeckRegistro[];
  registros?: DashboardBeckRegistro[];
}

export const dashboardBeckAPI = {
  obtener: async (
    params?: DashboardBeckParams
  ): Promise<DashboardBeckResponse> => {
    const response = await api.get<
      ApiResponseEnvelope<DashboardBeckResponse> | DashboardBeckResponse
    >("/dashboard/beck", { params });
    return unwrapItem(response.data);
  },
};

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

export type ProductoFiremat = {
  id: number;
  nombre: string;
  sku?: string | null;
  descripcion?: string | null;
  precio: number;
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  minStock: number;
  activo: boolean;
  criticidad: string;
  ubicacion?: string | null;
  imagen?: string | null;
  categoria?: string | null;
  categoriaId: number;
  alertaStockBajo: boolean;
  createdAt: string;
};

export type CategoriaFiremat = {
  id: number;
  nombre: string;
};

export type ProductoFirematPayload = {
  nombre: string;
  sku?: string | null;
  descripcion?: string | null;
  categoriaId: number;
  precio: number;
  stockInicial?: number;
  minStock: number;
  ubicacion?: string | null;
  criticidad: string;
  activo: boolean;
};

export const firematCategoriasAPI = {
  listar: async (): Promise<CategoriaFiremat[]> => {
    const response = await api.get<ApiResponseEnvelope<CategoriaFiremat[]>>(
      "/firemat/categorias"
    );
    return unwrapApiResponse(response.data);
  },
};

export const firematProductosAPI = {
  listar: async (params?: {
    q?: string;
    activo?: boolean;
    categoriaId?: number;
  }): Promise<ProductoFiremat[]> => {
    const response = await api.get<ApiResponseEnvelope<ProductoFiremat[]>>(
      "/firemat/productos",
      { params }
    );
    return unwrapApiResponse(response.data);
  },

  crear: async (payload: ProductoFirematPayload): Promise<ProductoFiremat> => {
    const response = await api.post<ApiResponseEnvelope<ProductoFiremat>>(
      "/firemat/productos",
      payload
    );
    return unwrapApiResponse(response.data);
  },

  editar: async (id: number, payload: Partial<ProductoFirematPayload>): Promise<ProductoFiremat> => {
    const response = await api.put<ApiResponseEnvelope<ProductoFiremat>>(
      `/firemat/productos/${id}`,
      payload
    );
    return unwrapApiResponse(response.data);
  },

  toggleEstado: async (id: number, activo: boolean): Promise<ProductoFiremat> => {
    const response = await api.patch<ApiResponseEnvelope<ProductoFiremat>>(
      `/firemat/productos/${id}/estado`,
      { activo }
    );
    return unwrapApiResponse(response.data);
  },
};

export type FirematCotizacionEstado =
  | "BORRADOR"
  | "ENVIADA"
  | "SEGUIMIENTO"
  | "ORDEN_CONFIRMADA"
  | "GANADA"
  | "PERDIDA"
  | "POSTERGADA";

export type FirematCotizacionTipoCliente =
  | "CLIENTE_FINAL"
  | "BROKER"
  | "FERRETERIA"
  | "REDISTRIBUIDOR"
  | "INSTALADOR"
  | "COMISIONISTA"
  | "RECOMPRA";

export type FirematCotizacionLinea = {
  id?: string | number;
  productoId: number;
  productoNombre?: string;
  nombreProducto?: string;
  descripcion?: string | null;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  subtotal: number;
  producto?: ProductoFiremat | null;
};

export type FirematCotizacion = {
  id: string;
  numero?: string | number | null;
  cliente: string;
  contacto?: string | null;
  tipoCliente?: FirematCotizacionTipoCliente | string | null;
  responsable?: string | null;
  estado: FirematCotizacionEstado;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  fecha?: string | null;
  fechaCotizacion?: string | null;
  fechaVencimiento?: string | null;
  vencimiento?: string | null;
  fechaSeguimiento?: string | null;
  observaciones?: string | null;
  lineas?: FirematCotizacionLinea[];
  detalle?: FirematCotizacionLinea[];
  createdAt?: string;
  updatedAt?: string;
};

export type FirematCotizacionPayload = {
  clienteId?: string | null;
  clienteFirematId?: string | null;
  contactoId?: string | null;
  contactoFirematId?: string | null;
  cliente: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipoCliente: FirematCotizacionTipoCliente | string;
  responsable?: string | null;
  fechaVencimiento?: string | null;
  fechaSeguimiento?: string | null;
  observaciones?: string | null;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  detalles: Array<{
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    descuentoPct: number;
    observacion?: string | null;
  }>;
};

export type FirematCotizacionesResumen = {
  totalCotizaciones: number;
  borradores: number;
  enviadas: number;
  ganadas: number;
  montoTotal: number;
};

type FirematCotizacionesEnvelope = {
  success?: boolean;
  data?: FirematCotizacion[];
  resumen?: Partial<FirematCotizacionesResumen>;
  message?: string;
  error?: string;
};

const normalizeFirematCotizacionesResponse = (
  payload: FirematCotizacionesEnvelope | FirematCotizacion[]
): { data: FirematCotizacion[]; resumen: FirematCotizacionesResumen } => {
  const data = Array.isArray(payload) ? payload : payload.data ?? [];
  const resumen = Array.isArray(payload) ? undefined : payload.resumen;

  return {
    data,
    resumen: {
      totalCotizaciones: resumen?.totalCotizaciones ?? data.length,
      borradores:
        resumen?.borradores ??
        data.filter((item) => item.estado === "BORRADOR").length,
      enviadas:
        resumen?.enviadas ??
        data.filter((item) => item.estado === "ENVIADA").length,
      ganadas:
        resumen?.ganadas ??
        data.filter((item) => item.estado === "GANADA").length,
      montoTotal:
        resumen?.montoTotal ??
        data.reduce((acc, item) => acc + Number(item.total || 0), 0),
    },
  };
};

export const firematCotizacionesAPI = {
  listar: async (params?: {
    q?: string;
    estado?: FirematCotizacionEstado | "";
    desde?: string;
    hasta?: string;
  }): Promise<{ data: FirematCotizacion[]; resumen: FirematCotizacionesResumen }> => {
    const response = await api.get<FirematCotizacionesEnvelope | FirematCotizacion[]>(
      "/firemat/cotizaciones",
      { params }
    );
    const payload = response.data;
    if (!Array.isArray(payload) && payload.success === false) {
      throw new Error(payload.message ?? payload.error ?? "Error al cargar cotizaciones");
    }
    return normalizeFirematCotizacionesResponse(payload);
  },

  obtener: async (id: string): Promise<FirematCotizacion> => {
    const response = await api.get<ApiResponseEnvelope<FirematCotizacion> | FirematCotizacion>(
      `/firemat/cotizaciones/${id}`
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  crear: async (payload: FirematCotizacionPayload): Promise<FirematCotizacion> => {
    const response = await api.post<ApiResponseEnvelope<FirematCotizacion> | FirematCotizacion>(
      "/firemat/cotizaciones",
      payload
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  actualizar: async (
    id: string,
    payload: FirematCotizacionPayload
  ): Promise<FirematCotizacion> => {
    const response = await api.put<ApiResponseEnvelope<FirematCotizacion> | FirematCotizacion>(
      `/firemat/cotizaciones/${id}`,
      payload
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  cambiarEstado: async (
    id: string,
    estado: FirematCotizacionEstado
  ): Promise<FirematCotizacion> => {
    const response = await api.patch<ApiResponseEnvelope<FirematCotizacion> | FirematCotizacion>(
      `/firemat/cotizaciones/${id}/estado`,
      { estado }
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  eliminar: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponseEnvelope<{ message?: string }> | { message?: string }>(
      `/firemat/cotizaciones/${id}`
    );
    if ("success" in response.data) {
      unwrapApiResponse(response.data);
    }
  },

  descargarPdf: async (id: string): Promise<Blob> => {
    const response = await api.get<Blob>(`/firemat/cotizaciones/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },
};

export type FirematFunnelEtapa =
  | "PROSPECTO"
  | "PRIMER_CONTACTO"
  | "DESARROLLO_COTIZACION"
  | "COTIZACION_ENVIADA"
  | "ORDEN_CONFIRMADA"
  | "GANADA"
  | "PERDIDA"
  | "POSTERGADA"
  | "DESCARTADO";

export type FirematFunnelOportunidad = {
  id: string;
  clienteId?: string | null;
  clienteFirematId?: string | null;
  cliente: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipoCliente?: FirematCotizacionTipoCliente | string | null;
  rutEmpresa?: string | null;
  region?: string | null;
  comuna?: string | null;
  unidadNegocio?: string | null;
  productoId?: number | null;
  producto?: ProductoFiremat | null;
  productoNombre?: string | null;
  cantidadEstimada?: number | null;
  urgencia?: string | null;
  tipoUso?: string | null;
  necesidadSoporteTecnico?: boolean | null;
  alternativaProducto?: string | null;
  comision?: number | null;
  margenEstimado?: number | null;
  fechaComprometidaEnvio?: string | null;
  versionCotizacion?: string | null;
  comentariosCliente?: string | null;
  objeciones?: string | null;
  ordenCompra?: string | null;
  correoAceptacion?: string | null;
  condicionesComerciales?: string | null;
  coordinacionAdministrativa?: string | null;
  estadoDocumentacion?: string | null;
  traspasoAdministracion?: boolean | null;
  traspasoERP?: boolean | null;
  coordinacionDespacho?: string | null;
  estadoComercialOrden?: string | null;
  estadoDocumentacionVenta?: string | null;
  responsable?: string | null;
  etapa: FirematFunnelEtapa;
  montoEstimado?: number | null;
  probabilidadCierre?: number | null;
  proximaAccion?: string | null;
  fechaProximaAccion?: string | null;
  observaciones?: string | null;
  origen?: string | null;
  cotizacionId?: string | number | null;
  cotizacion?: FirematCotizacion | null;
  motivoPerdida?: string | null;
  motivoPostergacion?: string | null;
  fechaReactivacion?: string | null;
  documentoRespaldo?: string | null;
  flujoPosterior?: string | null;
  motivoDescarte?: string | null;
  tipoBroker?: string | null;
  fechaEstimadaDespacho?: string | null;
  fechaSeguimientoPostventa?: string | null;
  nombreOportunidad?: string | null;
  cargoContacto?: string | null;
  direccionProyecto?: string | null;
  tipoOportunidad?: string | null;
  fechaProbableCierre?: string | null;
  riesgoTecnico?: string | null;
  comentariosInternos?: string | null;
  observacionesTecnicas?: string | null;
  observacionCamposFaltantes?: string | null;
  clienteRegistrado?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FirematFunnelPayload = {
  clienteId?: string | null;
  clienteFirematId?: string | null;
  cliente: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipoCliente?: FirematCotizacionTipoCliente | string | null;
  rutEmpresa?: string | null;
  region?: string | null;
  comuna?: string | null;
  unidadNegocio?: string | null;
  productoId?: number | null;
  cantidadEstimada?: number | null;
  urgencia?: string | null;
  tipoUso?: string | null;
  necesidadSoporteTecnico?: boolean | null;
  alternativaProducto?: string | null;
  comision?: number | null;
  margenEstimado?: number | null;
  fechaComprometidaEnvio?: string | null;
  versionCotizacion?: string | null;
  comentariosCliente?: string | null;
  objeciones?: string | null;
  ordenCompra?: string | null;
  correoAceptacion?: string | null;
  condicionesComerciales?: string | null;
  coordinacionAdministrativa?: string | null;
  estadoDocumentacion?: string | null;
  traspasoAdministracion?: boolean | null;
  traspasoERP?: boolean | null;
  coordinacionDespacho?: string | null;
  estadoComercialOrden?: string | null;
  estadoDocumentacionVenta?: string | null;
  responsable?: string | null;
  etapa: FirematFunnelEtapa;
  montoEstimado?: number | null;
  probabilidadCierre?: number | null;
  proximaAccion?: string | null;
  fechaProximaAccion?: string | null;
  observaciones?: string | null;
  origen?: string | null;
  cotizacionId?: string | number | null;
  motivoPerdida?: string | null;
  motivoPostergacion?: string | null;
  fechaReactivacion?: string | null;
  documentoRespaldo?: string | null;
  flujoPosterior?: string | null;
  motivoDescarte?: string | null;
  tipoBroker?: string | null;
  fechaEstimadaDespacho?: string | null;
  fechaSeguimientoPostventa?: string | null;
  nombreOportunidad?: string | null;
  cargoContacto?: string | null;
  direccionProyecto?: string | null;
  tipoOportunidad?: string | null;
  fechaProbableCierre?: string | null;
  riesgoTecnico?: string | null;
  comentariosInternos?: string | null;
  observacionesTecnicas?: string | null;
  observacionCamposFaltantes?: string | null;
};

export type FirematCamposCriticosError = {
  advertenciasCamposCriticos: string[];
  requiereObservacionCamposFaltantes: true;
  message: string;
};

export type FunnelFirematArchivoTipo =
  | "ORDEN_COMPRA"
  | "CORREO_ACEPTACION"
  | "DOCUMENTO_RESPALDO"
  | "COTIZACION"
  | "FICHA_TECNICA"
  | "OTRO";

export interface FunnelFirematArchivo {
  id: number;
  oportunidadId: number;
  tipo: FunnelFirematArchivoTipo | string;
  url: string;
  publicId: string;
  nombreArchivo?: string | null;
  mimeType?: string | null;
  bytes?: number | null;
  etapa?: string | null;
  observaciones?: string | null;
  createdAt: string;
}

export type FirematFunnelResumen = {
  totalOportunidades: number;
  pipelineTotal: number;
  ganadas: number;
  perdidas: number;
  postergadas: number;
  cotizacionesVinculadas: number;
};

type FirematFunnelEnvelope = {
  success?: boolean;
  data?: FirematFunnelOportunidad[];
  resumen?: Partial<FirematFunnelResumen>;
  message?: string;
  error?: string;
};

const normalizeFirematFunnelResponse = (
  payload: FirematFunnelEnvelope | FirematFunnelOportunidad[]
): { data: FirematFunnelOportunidad[]; resumen: FirematFunnelResumen } => {
  const data = Array.isArray(payload) ? payload : payload.data ?? [];
  const resumen = Array.isArray(payload) ? undefined : payload.resumen;

  return {
    data,
    resumen: {
      totalOportunidades: resumen?.totalOportunidades ?? data.length,
      pipelineTotal:
        resumen?.pipelineTotal ??
        data.reduce((acc, item) => acc + Number(item.montoEstimado || 0), 0),
      ganadas:
        resumen?.ganadas ?? data.filter((item) => item.etapa === "GANADA").length,
      perdidas:
        resumen?.perdidas ?? data.filter((item) => item.etapa === "PERDIDA").length,
      postergadas:
        resumen?.postergadas ??
        data.filter((item) => item.etapa === "POSTERGADA").length,
      cotizacionesVinculadas:
        resumen?.cotizacionesVinculadas ??
        data.filter((item) => Boolean(item.cotizacionId || item.cotizacion)).length,
    },
  };
};

export const firematFunnelAPI = {
  listar: async (params?: {
    q?: string;
    etapa?: FirematFunnelEtapa | "";
    responsable?: string;
    tipoCliente?: FirematCotizacionTipoCliente | "";
    productoId?: number;
  }): Promise<{ data: FirematFunnelOportunidad[]; resumen: FirematFunnelResumen }> => {
    const response = await api.get<FirematFunnelEnvelope | FirematFunnelOportunidad[]>(
      "/firemat/funnel",
      { params }
    );
    const payload = response.data;
    if (!Array.isArray(payload) && payload.success === false) {
      throw new Error(payload.message ?? payload.error ?? "Error al cargar funnel");
    }
    return normalizeFirematFunnelResponse(payload);
  },

  obtener: async (id: string): Promise<FirematFunnelOportunidad> => {
    const response = await api.get<
      ApiResponseEnvelope<FirematFunnelOportunidad> | FirematFunnelOportunidad
    >(`/firemat/funnel/${id}`);
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  crear: async (payload: FirematFunnelPayload): Promise<FirematFunnelOportunidad> => {
    const response = await api.post<
      ApiResponseEnvelope<FirematFunnelOportunidad> | FirematFunnelOportunidad
    >("/firemat/funnel", payload);
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  actualizar: async (
    id: string,
    payload: FirematFunnelPayload
  ): Promise<FirematFunnelOportunidad> => {
    const response = await api.put<
      ApiResponseEnvelope<FirematFunnelOportunidad> | FirematFunnelOportunidad
    >(`/firemat/funnel/${id}`, payload);
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  cambiarEtapa: async (
    id: string,
    etapa: FirematFunnelEtapa,
    observacionCamposFaltantes?: string | null
  ): Promise<FirematFunnelOportunidad> => {
    const body: { etapa: FirematFunnelEtapa; observacionCamposFaltantes?: string | null } = { etapa };
    if (observacionCamposFaltantes) body.observacionCamposFaltantes = observacionCamposFaltantes;
    const response = await api.patch<
      ApiResponseEnvelope<FirematFunnelOportunidad> | FirematFunnelOportunidad
    >(`/firemat/funnel/${id}/etapa`, body);
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  listarArchivos: async (
    oportunidadId: string | number
  ): Promise<FunnelFirematArchivo[]> => {
    const response = await api.get<ApiResponseEnvelope<FunnelFirematArchivo[]>>(
      `/firemat/funnel/${oportunidadId}/archivos`
    );
    return unwrapApiResponse(response.data);
  },

  subirArchivos: async (
    oportunidadId: string | number,
    tipo: FunnelFirematArchivoTipo,
    files: File[],
    extra?: { etapa?: string | null; observaciones?: string | null }
  ): Promise<FunnelFirematArchivo[]> => {
    const formData = new FormData();
    formData.append("tipo", tipo);
    if (extra?.etapa) formData.append("etapa", extra.etapa);
    if (extra?.observaciones) {
      formData.append("observaciones", extra.observaciones);
    }
    files.forEach((file) => formData.append("files", file));

    const response = await api.post<ApiResponseEnvelope<FunnelFirematArchivo[]>>(
      `/firemat/funnel/${oportunidadId}/archivos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return unwrapApiResponse(response.data);
  },

  eliminarArchivo: async (archivoId: string | number): Promise<void> => {
    const response = await api.delete<ApiResponseEnvelope<{ message?: string }>>(
      `/firemat/funnel/archivos/${archivoId}`
    );
    unwrapApiResponse(response.data);
  },

  eliminar: async (id: string): Promise<void> => {
    const response = await api.delete<
      ApiResponseEnvelope<{ message?: string }> | { message?: string }
    >(`/firemat/funnel/${id}`);
    if ("success" in response.data) {
      unwrapApiResponse(response.data);
    }
  },
};

export type InventarioFirematItem = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  categoriaId: number;
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  minStock: number;
  estadoStock: "SIN_STOCK" | "BAJO_STOCK" | "OK";
  alertaStockBajo: boolean;
  criticidad: string;
  ubicacion?: string | null;
  activo: boolean;
  imagen?: string | null;
  precio: number;
  createdAt: string;
};

export type InventarioFirematResumen = {
  totalProductos: number;
  productosActivos: number;
  productosInactivos: number;
  productosSinStock: number;
  productosBajoStock: number;
  stockTotal: number;
  stockReservadoTotal: number;
  stockDisponibleTotal: number;
};

type InventarioApiEnvelope = {
  success: boolean;
  data: InventarioFirematItem[];
  resumen: InventarioFirematResumen;
  message?: string;
  error?: string;
};

export type MovimientoFiremat = {
  id: number;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo?: string | null;
  documento?: string | null;
  productoId: number;
  productoNombre: string;
  userId?: number | null;
  createdAt: string;
};

type MovimientosApiEnvelope = {
  success: boolean;
  data: MovimientoFiremat[];
  message?: string;
  error?: string;
};

export type VentaFiremat = {
  id: number;
  cliente: string;
  contacto?: string | null;
  cantidad: number;
  precio: number;
  total: number;
  estado: string;
  responsable?: string | null;
  fechaCierre?: string | null;
  createdAt: string;
  producto?: { id: number; nombre: string } | null;
  detalle: Array<{
    id: number;
    productoId: number;
    nombreProducto: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }>;
};

export type VentasFirematResumen = {
  totalVentas: number;
  ventasCerradas: number;
  ventasProspecto: number;
  montoTotal: number;
  montoCerrado: number;
};

type VentasApiEnvelope = {
  success: boolean;
  data: VentaFiremat[];
  resumen: VentasFirematResumen;
  message?: string;
  error?: string;
};

export const firematVentasAPI = {
  listar: async (params?: {
    q?: string;
    estado?: string;
    desde?: string;
    hasta?: string;
  }): Promise<{ data: VentaFiremat[]; resumen: VentasFirematResumen }> => {
    const res = await api.get<VentasApiEnvelope>("/firemat/ventas", { params });
    const payload = res.data;
    if (!payload.success) {
      throw new Error(payload.message ?? payload.error ?? "Error al cargar ventas");
    }
    return {
      data: payload.data ?? [],
      resumen: payload.resumen ?? {
        totalVentas: 0,
        ventasCerradas: 0,
        ventasProspecto: 0,
        montoTotal: 0,
        montoCerrado: 0,
      },
    };
  },
};

export const firematInventarioAPI = {
  listar: async (params?: {
    q?: string;
    activo?: boolean;
    categoriaId?: number;
    bajoStock?: boolean;
    criticidad?: string;
  }): Promise<{ data: InventarioFirematItem[]; resumen: InventarioFirematResumen }> => {
    const res = await api.get<InventarioApiEnvelope>("/firemat/inventario", { params });
    const payload = res.data;
    if (!payload.success) {
      throw new Error(payload.message ?? payload.error ?? "Error al cargar inventario");
    }
    return {
      data: payload.data ?? [],
      resumen: payload.resumen ?? {
        totalProductos: 0,
        productosActivos: 0,
        productosInactivos: 0,
        productosSinStock: 0,
        productosBajoStock: 0,
        stockTotal: 0,
        stockReservadoTotal: 0,
        stockDisponibleTotal: 0,
      },
    };
  },

  movimientos: async (params?: {
    productoId?: number;
    tipo?: string;
    desde?: string;
    hasta?: string;
  }): Promise<MovimientosApiEnvelope> => {
    const res = await api.get<MovimientosApiEnvelope>(
      "/firemat/inventario/movimientos",
      { params }
    );
    return res.data;
  },
};

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
    | "OBRA_CREADA"
    | "OBRA_EDITADA"
    | "OBRA_ELIMINADA";
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

// ── Clientes Beck ─────────────────────────────────────────────────────────────

export interface ContactoClienteBeck {
  id: string;
  clienteId: string;
  nombre: string;
  cargo?: string | null;
  telefono?: string | null;
  correo?: string | null;
  principal: boolean;
  activo: boolean;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteBeck {
  id: string;
  rut: string;
  razonSocial: string;
  nombreEmpresa?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  region?: string | null;
  comuna?: string | null;
  tipoCliente?: string | null;
  origen?: string | null;
  observaciones?: string | null;
  activo: boolean;
  contactos?: ContactoClienteBeck[];
  createdAt: string;
  updatedAt: string;
}

export interface ClienteBeckPayload {
  rut: string;
  razonSocial: string;
  nombreEmpresa?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  region?: string | null;
  comuna?: string | null;
  tipoCliente?: string | null;
  origen?: string | null;
  observaciones?: string | null;
  activo?: boolean;
}

export interface ContactoClienteBeckPayload {
  nombre: string;
  cargo?: string | null;
  telefono?: string | null;
  correo?: string | null;
  principal?: boolean;
  activo?: boolean;
  observaciones?: string | null;
}

export interface ImportarClientesResult {
  procesados: number;
  creados: number;
  duplicadosOmitidos: number;
  errores: number;
  duplicados?: string[];
  detallesErrores?: string[];
  advertencias?: string[];
}

type ImportarClientesRawResult = Partial<ImportarClientesResult> & {
  totalProcesados?: number;
  totalCreados?: number;
  totalDuplicados?: number;
  totalErrores?: number;
  creados?: number | Array<{ rut?: string; razonSocial?: string }>;
  duplicadosOmitidos?: number | Array<string | { rut?: string; razonSocial?: string }>;
  errores?: number | Array<string | { fila?: number; error?: string; mensaje?: string }>;
};

// Helpers para normalizar respuestas que pueden ser array directo o envelope
const unwrapArray = <T>(payload: ApiResponseEnvelope<T[]> | T[]): T[] => {
  if (Array.isArray(payload)) return payload;
  return unwrapApiResponse(payload);
};

const unwrapItem = <T>(payload: ApiResponseEnvelope<T> | T): T => {
  if (payload !== null && typeof payload === "object" && "success" in (payload as object)) {
    return unwrapApiResponse(payload as ApiResponseEnvelope<T>);
  }
  return payload as T;
};

const countFrom = (value: unknown, fallback?: number): number => {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.length;
  return fallback ?? 0;
};

const toImportDetail = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const item = value as { rut?: string; razonSocial?: string; fila?: number; error?: string; mensaje?: string };
    if (item.rut && item.razonSocial) return `${item.rut} - ${item.razonSocial}`;
    if (item.rut) return item.rut;
    if (item.fila && (item.error || item.mensaje)) return `Fila ${item.fila}: ${item.error ?? item.mensaje}`;
    if (item.error || item.mensaje) return item.error ?? item.mensaje ?? "";
  }
  return String(value);
};

const normalizeImportarClientesResult = (payload: ImportarClientesRawResult): ImportarClientesResult => ({
  procesados: countFrom(payload.procesados, payload.totalProcesados),
  creados: countFrom(payload.creados, payload.totalCreados),
  duplicadosOmitidos: countFrom(payload.duplicadosOmitidos, payload.totalDuplicados),
  errores: countFrom(payload.errores, payload.totalErrores),
  duplicados: Array.isArray(payload.duplicados)
    ? payload.duplicados.map(toImportDetail)
    : Array.isArray(payload.duplicadosOmitidos)
      ? payload.duplicadosOmitidos.map(toImportDetail)
      : undefined,
  detallesErrores: Array.isArray(payload.detallesErrores)
    ? payload.detallesErrores.map(toImportDetail)
    : Array.isArray(payload.errores)
      ? payload.errores.map(toImportDetail)
      : undefined,
  advertencias: Array.isArray(payload.advertencias)
    ? payload.advertencias.map(toImportDetail)
    : undefined,
});

export const clientesBeckAPI = {
  listar: async (params?: { q?: string; activo?: boolean }): Promise<ClienteBeck[]> => {
    const response = await api.get<ApiResponseEnvelope<ClienteBeck[]> | ClienteBeck[]>("/clientes-beck", { params });
    return unwrapArray(response.data);
  },

  buscar: async (q: string): Promise<ClienteBeck[]> => {
    const response = await api.get<ApiResponseEnvelope<ClienteBeck[]> | ClienteBeck[]>("/clientes-beck/buscar", { params: { q } });
    return unwrapArray(response.data);
  },

  obtener: async (id: string): Promise<ClienteBeck> => {
    const response = await api.get<ApiResponseEnvelope<ClienteBeck> | ClienteBeck>(`/clientes-beck/${id}`);
    return unwrapItem(response.data);
  },

  crear: async (payload: ClienteBeckPayload): Promise<ClienteBeck> => {
    const response = await api.post<ApiResponseEnvelope<ClienteBeck> | ClienteBeck>("/clientes-beck", payload);
    return unwrapItem(response.data);
  },

  actualizar: async (id: string, payload: ClienteBeckPayload): Promise<ClienteBeck> => {
    const response = await api.put<ApiResponseEnvelope<ClienteBeck> | ClienteBeck>(`/clientes-beck/${id}`, payload);
    return unwrapItem(response.data);
  },

  toggleEstado: async (id: string, activo: boolean): Promise<ClienteBeck> => {
    const response = await api.patch<ApiResponseEnvelope<ClienteBeck> | ClienteBeck>(`/clientes-beck/${id}/estado`, { activo });
    return unwrapItem(response.data);
  },

  agregarContacto: async (clienteId: string, payload: ContactoClienteBeckPayload): Promise<ContactoClienteBeck> => {
    const response = await api.post<ApiResponseEnvelope<ContactoClienteBeck> | ContactoClienteBeck>(`/clientes-beck/${clienteId}/contactos`, payload);
    return unwrapItem(response.data);
  },

  actualizarContacto: async (contactoId: string, payload: ContactoClienteBeckPayload): Promise<ContactoClienteBeck> => {
    const response = await api.put<ApiResponseEnvelope<ContactoClienteBeck> | ContactoClienteBeck>(`/clientes-beck/contactos/${contactoId}`, payload);
    return unwrapItem(response.data);
  },

  toggleEstadoContacto: async (contactoId: string, activo: boolean): Promise<ContactoClienteBeck> => {
    const response = await api.patch<ApiResponseEnvelope<ContactoClienteBeck> | ContactoClienteBeck>(`/clientes-beck/contactos/${contactoId}/estado`, { activo });
    return unwrapItem(response.data);
  },

  oportunidades: async (clienteId: string): Promise<unknown[]> => {
    const response = await api.get<ApiResponseEnvelope<unknown[]> | unknown[]>(`/clientes-beck/${clienteId}/oportunidades`);
    return unwrapArray(response.data as ApiResponseEnvelope<unknown[]> | unknown[]);
  },

  importar: async (file: File): Promise<ImportarClientesResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ApiResponseEnvelope<ImportarClientesRawResult> | ImportarClientesRawResult>(
      "/clientes-beck/importar",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return normalizeImportarClientesResult(unwrapItem(response.data));
  },
};

// ── Configuracion campos registro ─────────────────────────────────────────────

export type RolConfiguracionCamposRegistro = "jefeobra" | "trabajador";
export type ColorConfiguracionCampoRegistro = "verde" | "azul" | "rojo";

export interface CampoConfiguracionRegistro {
  campo: string;
  rol?: RolConfiguracionCamposRegistro | "terreno" | string;
  label?: string;
  nombre?: string;
  color: ColorConfiguracionCampoRegistro;
  visible: boolean;
  descripcion?: string | null;
  configurable?: boolean;
  prohibido?: boolean;
  [key: string]: unknown;
}

export type ActualizarConfiguracionCamposRegistroPayload = Array<{
  obraId?: string;
  campo: string;
  rol: RolConfiguracionCamposRegistro;
  visible: boolean;
}>;

const extractCamposRegistro = (payload: unknown): CampoConfiguracionRegistro[] => {
  if (Array.isArray(payload)) return payload as CampoConfiguracionRegistro[];

  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.data,
    record.campos,
    record.items,
    record.configuracion,
    record.registros,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as CampoConfiguracionRegistro[];

    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const nestedCandidates = [
        nested.data,
        nested.campos,
        nested.items,
        nested.configuracion,
        nested.registros,
        nested.jefeobra,
        nested.trabajador,
        nested.terreno,
      ];

      for (const nestedCandidate of nestedCandidates) {
        if (Array.isArray(nestedCandidate)) {
          return nestedCandidate as CampoConfiguracionRegistro[];
        }
      }
    }
  }

  return [];
};

export const configuracionCamposRegistroAPI = {
  obtenerPorRol: async (
    rol: RolConfiguracionCamposRegistro,
    obraId?: string
  ): Promise<CampoConfiguracionRegistro[]> => {
    const response = await api.get<unknown>("/configuracion-campos-registro", {
      params: { rol, obraId },
    });
    return extractCamposRegistro(response.data);
  },

  actualizar: async (
    payload: ActualizarConfiguracionCamposRegistroPayload
  ): Promise<CampoConfiguracionRegistro[]> => {
    const response = await api.put<unknown>("/configuracion-campos-registro", payload);
    return extractCamposRegistro(response.data);
  },
};

// ── Clientes Firemat ──────────────────────────────────────────────────────────

export interface ContactoClienteFiremat {
  id: string;
  clienteId: string;
  nombre: string;
  cargo?: string | null;
  telefono?: string | null;
  correo?: string | null;
  principal: boolean;
  activo: boolean;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteFiremat {
  id: string;
  rut?: string | null;
  nombre: string;
  razonSocial?: string | null;
  nombreEmpresa?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  email?: string | null;
  region?: string | null;
  comuna?: string | null;
  tipoCliente?: string | null;
  canalVenta?: string | null;
  activo: boolean;
  contactos?: ContactoClienteFiremat[];
  createdAt: string;
  updatedAt: string;
}

export interface ClienteFirematPayload {
  rut?: string | null;
  nombre: string;
  razonSocial?: string | null;
  nombreEmpresa?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  region?: string | null;
  comuna?: string | null;
  tipoCliente?: string | null;
  canalVenta?: string | null;
  activo?: boolean;
}

export interface ContactoClienteFirematPayload {
  nombre: string;
  cargo?: string | null;
  telefono?: string | null;
  correo?: string | null;
  principal?: boolean;
  activo?: boolean;
  observaciones?: string | null;
}

export const clientesFirematAPI = {
  listar: async (params?: { q?: string; activo?: boolean }): Promise<ClienteFiremat[]> => {
    const response = await api.get<ApiResponseEnvelope<ClienteFiremat[]> | ClienteFiremat[]>("/firemat/clientes", { params });
    return unwrapArray(response.data);
  },

  buscar: async (q: string): Promise<ClienteFiremat[]> => {
    const response = await api.get<ApiResponseEnvelope<ClienteFiremat[]> | ClienteFiremat[]>("/firemat/clientes/buscar", { params: { q } });
    return unwrapArray(response.data);
  },

  obtener: async (id: string): Promise<ClienteFiremat> => {
    const response = await api.get<ApiResponseEnvelope<ClienteFiremat> | ClienteFiremat>(`/firemat/clientes/${id}`);
    return unwrapItem(response.data);
  },

  crear: async (payload: ClienteFirematPayload): Promise<ClienteFiremat> => {
    const response = await api.post<ApiResponseEnvelope<ClienteFiremat> | ClienteFiremat>("/firemat/clientes", payload);
    return unwrapItem(response.data);
  },

  actualizar: async (id: string, payload: ClienteFirematPayload): Promise<ClienteFiremat> => {
    const response = await api.put<ApiResponseEnvelope<ClienteFiremat> | ClienteFiremat>(`/firemat/clientes/${id}`, payload);
    return unwrapItem(response.data);
  },

  toggleEstado: async (id: string, activo: boolean): Promise<ClienteFiremat> => {
    const response = await api.patch<ApiResponseEnvelope<ClienteFiremat> | ClienteFiremat>(`/firemat/clientes/${id}/estado`, { activo });
    return unwrapItem(response.data);
  },

  agregarContacto: async (clienteId: string, payload: ContactoClienteFirematPayload): Promise<ContactoClienteFiremat> => {
    const response = await api.post<ApiResponseEnvelope<ContactoClienteFiremat> | ContactoClienteFiremat>(`/firemat/clientes/${clienteId}/contactos`, payload);
    return unwrapItem(response.data);
  },

  actualizarContacto: async (contactoId: string, payload: ContactoClienteFirematPayload): Promise<ContactoClienteFiremat> => {
    const response = await api.put<ApiResponseEnvelope<ContactoClienteFiremat> | ContactoClienteFiremat>(`/firemat/clientes/contactos/${contactoId}`, payload);
    return unwrapItem(response.data);
  },

  toggleEstadoContacto: async (contactoId: string, activo: boolean): Promise<ContactoClienteFiremat> => {
    const response = await api.patch<ApiResponseEnvelope<ContactoClienteFiremat> | ContactoClienteFiremat>(`/firemat/clientes/contactos/${contactoId}/estado`, { activo });
    return unwrapItem(response.data);
  },

  oportunidades: async (clienteId: string): Promise<unknown[]> => {
    const response = await api.get<ApiResponseEnvelope<unknown[]> | unknown[]>(`/firemat/clientes/${clienteId}/oportunidades`);
    return unwrapArray(response.data as ApiResponseEnvelope<unknown[]> | unknown[]);
  },

  importar: async (file: File): Promise<ImportarClientesResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ApiResponseEnvelope<ImportarClientesRawResult> | ImportarClientesRawResult>(
      "/firemat/clientes/importar",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return normalizeImportarClientesResult(unwrapItem(response.data));
  },
};
