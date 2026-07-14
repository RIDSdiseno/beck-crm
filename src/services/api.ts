import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { message as antdMessage } from "antd";

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
    if (status === 403) {
      console.log(
        "UsuariosParametros request fallido",
        error.config?.method,
        error.config?.url,
        error.response?.status
      );
      // key prevents duplicate toasts when multiple requests fail with 403 simultaneously
      void antdMessage.error({
        content: "No tienes permiso para realizar esta acción.",
        key: "global-403",
        duration: 3,
      });
    }
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
      | "visualizador_firemat"
      | "cliente";
  };
  empresaDefault?: "beck" | "firemat" | "trager";
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
  advertencias?: string[];
}

interface ApiResponseWithTotal<T> {
  success: boolean;
  data: T;
  total?: number;
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
  responsableId?: string | null;
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
  region?: string;
  comuna?: string;
  clienteBeckId?: string | null;
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
  esReactivacion?: boolean;
}

export type BeckCamposCriticosError = {
  advertenciasCamposCriticos: string[];
  requiereObservacionCamposFaltantes: boolean;
  message: string;
};

export interface FunnelBeckDashboardKpis {
  totalOportunidades: number;
  oportunidadesActivas: number;
  oportunidadesGanadas: number;
  oportunidadesPerdidas: number;
  oportunidadesPostergadas: number;
  pipelineTotalClp: number;
  montoGanadoClp: number;
  montoPerdidoClp: number;
  tasaCierre: number;
  clientesReactivados?: number;
}

export interface FunnelBeckDashboardVendedor {
  vendedor: string;
  total: number;
  ganadas: number;
  perdidas: number;
  postergadas: number;
  activas: number;
  montoTotalClp: number;
  montoGanadoClp: number;
}

export interface FunnelBeckDashboardSinSeguimientoItem {
  id: string;
  nombreProyecto: string;
  empresa: string;
  vendedor: string;
  etapa: string;
  updatedAt: string;
  fechaProximaAccion: string | null;
  valorClp: number;
}

export interface FunnelBeckDashboardProspectos {
  nuevosSemana: number;
  nuevosMes: number;
  porOrigen: { origen: string; cantidad: number }[];
  porResponsable: { vendedor: string; cantidad: number }[];
}

export interface FunnelBeckDashboardPipelineAvanzado {
  porResponsable: { vendedor: string; cantidad: number; montoClp: number }[];
  porUnidadNegocio: { unidadNegocio: string; cantidad: number; montoClp: number }[];
  porOrigen: { origen: string; cantidad: number; montoClp: number }[];
  porTipoCliente: { tipoCliente: string; cantidad: number; montoClp: number }[];
  porCliente: { cliente: string; cantidad: number; montoClp: number }[];
  porProyecto: { proyecto: string; cliente: string; vendedor: string; etapa: string; montoClp: number }[];
}

export interface FunnelBeckDashboardForecast {
  dias30: { cantidad: number; montoClp: number; montoPonderadoClp: number };
  dias60: { cantidad: number; montoClp: number; montoPonderadoClp: number };
  dias90: { cantidad: number; montoClp: number; montoPonderadoClp: number };
}

export interface FunnelBeckDashboardGanadas {
  montoGanadoMesActualClp: number;
  montoGanadoUltimos12Meses: { mes: string; cantidad: number; montoClp: number }[];
}

export interface FunnelBeckDashboardMotivos {
  perdida: { motivo: string; cantidad: number }[];
  postergacion: { motivo: string; cantidad: number }[];
  descarte: { motivo: string; cantidad: number }[];
}

export interface FunnelBeckDashboardRiesgoItem {
  id: string;
  nombreProyecto: string;
  empresa: string;
  vendedor: string;
  etapa: string;
  updatedAt?: string;
  valorClp: number;
}

export interface FunnelBeckDashboardRiesgoComercial {
  oportunidadesDetenidas: {
    total: number;
    diasSinMovimiento: number;
    items: FunnelBeckDashboardRiesgoItem[];
  };
  oportunidadesSinProximaAccion: {
    total: number;
    items: Omit<FunnelBeckDashboardRiesgoItem, "updatedAt">[];
  };
}

export interface FunnelBeckDashboardConversionEtapas {
  etapas: {
    etapa: string;
    label: string;
    cantidad: number;
    porcentajeSobreTotal: number;
  }[];
  transiciones: {
    desde: string;
    hasta: string;
    desdeLabel: string;
    hastaLabel: string;
    cantidadDesde: number;
    cantidadHasta: number;
    tasaConversion: number;
  }[];
}

export interface FunnelBeckDashboardData {
  kpis: FunnelBeckDashboardKpis;
  distribucionEstado: {
    activas: number;
    ganadas: number;
    perdidas: number;
    postergadas: number;
  };
  porEtapa: Record<string, { cantidad: number; montoClp: number }>;
  rankingVendedores: FunnelBeckDashboardVendedor[];
  sinSeguimiento: {
    totalSinSeguimiento: number;
    diasSinSeguimiento: number;
    oportunidadesSinSeguimiento: FunnelBeckDashboardSinSeguimientoItem[];
  };
  proximasAcciones: {
    accionesVencidas: number;
    accionesHoy: number;
    accionesProximos7Dias: number;
  };
  prospectos?: FunnelBeckDashboardProspectos;
  pipelineAvanzado?: FunnelBeckDashboardPipelineAvanzado;
  forecast?: FunnelBeckDashboardForecast;
  ganadas?: FunnelBeckDashboardGanadas;
  motivos?: FunnelBeckDashboardMotivos;
  riesgoComercial?: FunnelBeckDashboardRiesgoComercial;
  conversionEtapas?: FunnelBeckDashboardConversionEtapas;
}

export interface FunnelBeckDashboardParams {
  fechaDesde?: string;
  fechaHasta?: string;
  tipoFecha?: string;
  vendedor?: string;
  etapa?: string;
  diasSinSeguimiento?: number;
  unidadNegocio?: string;
  origen?: string;
  tipoCliente?: string;
  tipoOportunidad?: string;
  cliente?: string;
  proyecto?: string;
  estado?: string;
  fechaIngresoDesde?: string;
  fechaIngresoHasta?: string;
  fechaCierreDesde?: string;
  fechaCierreHasta?: string;
}

export type HistorialEtapaBeck = {
  id: number;
  oportunidadId: string;
  etapaAnterior: string | null;
  etapaNueva: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  createdAt: string;
};

// Línea de tiempo combinada del Funnel Beck: etapas + cambios de vendedor.
// No reemplaza HistorialEtapaBeck/getHistorialEtapas — es un endpoint aparte.
export type HistorialFunnelBeckEvento = {
  tipo: "ETAPA" | "CAMBIO_VENDEDOR";
  createdAt: string;
  usuario: { id: string; nombre: string } | null;
  etapaAnterior?: string | null;
  etapaNueva?: string | null;
  vendedorAnterior?: string | null;
  vendedorNuevo?: string | null;
};

export type HistorialEtapaFiremat = {
  id: number;
  oportunidadId: number;
  etapaAnterior: string | null;
  etapaNueva: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  createdAt: string;
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

  getDashboard: async (params?: FunnelBeckDashboardParams): Promise<FunnelBeckDashboardData> => {
    const response = await api.get<ApiResponseEnvelope<FunnelBeckDashboardData>>(
      "/funnel-beck/dashboard",
      { params }
    );
    return unwrapApiResponse(response.data);
  },

  getHistorialEtapas: async (id: string): Promise<HistorialEtapaBeck[]> => {
    const response = await api.get<ApiResponseEnvelope<HistorialEtapaBeck[]>>(
      `/funnel-beck/${id}/historial-etapas`
    );
    return unwrapApiResponse(response.data);
  },

  // Línea de tiempo combinada (etapas + cambios de vendedor), en orden
  // cronológico. Endpoint nuevo, separado de getHistorialEtapas.
  getHistorial: async (id: string): Promise<HistorialFunnelBeckEvento[]> => {
    const response = await api.get<ApiResponseEnvelope<HistorialFunnelBeckEvento[]>>(
      `/funnel-beck/${id}/historial`
    );
    return unwrapApiResponse(response.data);
  },

  // Cambia únicamente el vendedor (PATCH dedicado) — no reutiliza actualizar()
  // (formulario completo de edición), que exige campos de otras etapas.
  cambiarVendedor: async (id: string, vendedor: string): Promise<FunnelBeckOpportunity> => {
    const response = await api.patch<ApiResponseEnvelope<FunnelBeckOpportunity>>(
      `/funnel-beck/${id}/vendedor`,
      { vendedor }
    );
    return unwrapApiResponse(response.data);
  },

  exportar: async (params?: Record<string, string | undefined>): Promise<Blob> => {
    const response = await api.get<Blob>("/funnel-beck/exportar", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  actualizarEstadoCierre: async (
    id: string,
    payload: {
      estadoCierre: "PERDIDA" | "POSTERGADA";
      motivoCierre: string;
      observacionCierre: string;
      fechaReactivacion?: string;
    }
  ): Promise<FunnelBeckOpportunity> => {
    const response = await api.patch<ApiResponseEnvelope<FunnelBeckOpportunity>>(
      `/funnel-beck/${id}/estado-cierre`,
      payload
    );
    return unwrapApiResponse(response.data);
  },
};

export type FunnelUnificadoOrigen = "BECK" | "FIREMAT";

export type FunnelUnificadoUnidadNegocio = "beck" | "firemat" | "mixto" | "todas";

export type FunnelUnificadoEstadoCierre =
  | "activa"
  | "ganada"
  | "perdida"
  | "postergada"
  | "descartada"
  | "todas";

export interface FunnelUnificadoItem {
  id: string;
  origen: FunnelUnificadoOrigen;
  titulo?: string;
  empresa?: string;
  cliente?: string;
  contacto?: string;
  etapa?: string;
  etapaTablero?: string;
  unidadNegocio?: string;
  monto?: number;
  probabilidad?: number;
  proximaAccion?: string;
  fechaProximaAccion?: string;
  fechaCierre?: string;
  estadoCierre?: string;
  motivoCierre?: string;
  observacionCierre?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface FunnelUnificadoMeta {
  beckIncluido: boolean;
  firematIncluido: boolean;
  total: number;
}

export interface FunnelUnificadoResponse {
  data: FunnelUnificadoItem[];
  meta: FunnelUnificadoMeta;
}

export const funnelUnificadoAPI = {
  listar: async (params?: {
    unidadNegocio?: FunnelUnificadoUnidadNegocio;
    estadoCierre?: FunnelUnificadoEstadoCierre;
  }): Promise<FunnelUnificadoResponse> => {
    const response = await api.get<{
      success: boolean;
      data: FunnelUnificadoItem[];
      meta: FunnelUnificadoMeta;
      error?: string;
      message?: string;
    }>("/funnel-unificado", { params });

    if (!response.data.success) {
      throw new Error(
        response.data.error ||
          response.data.message ||
          "No se pudo obtener el funnel unificado"
      );
    }

    return {
      data: Array.isArray(response.data.data) ? response.data.data : [],
      meta: response.data.meta,
    };
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
  tipo_registro?: string;
  descripcion_material: string;
  modulo: string;
  piso: string;
  eje_numerico: number;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  metros_lineales?: number | string | null;
  factor_por_holguras?: number | string | null;
  cielo_modular?: number | string | null;
  cantidad_sellos_con_factores?: number | string | null;
  aislacion?: number | string | null;
  cantidad_sellos_aislacion?: number | string | null;
  reparacion_tabique?: number | string | null;
  cantidad_final?: number | string | null;
  nombre_sellador: string;
  holgura: number;
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

export interface ObraOportunidadVinculada {
  id: string;
  nombreProyecto?: string | null;
  empresa?: string | null;
  region?: string | null;
  comuna?: string | null;
  clienteBeckId?: string | null;
  clienteBeck?: {
    id: string;
    rut: string;
    razonSocial: string;
    nombreEmpresa?: string | null;
  } | null;
}

export type EstadoPreparacionItemizado =
  | "PREPARACION"
  | "EN_REVISION_CLIENTE"
  | "FINALIZADO";

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
  funnelBeck?: ObraOportunidadVinculada | null;
  oportunidad?: ObraOportunidadVinculada | null;
  clienteBeckId?: string | null;
  clienteBeck?: {
    id: string;
    rut: string;
    razonSocial: string;
    nombreEmpresa?: string | null;
  } | null;
  activa: boolean;
  estado?: "activa" | "inactiva" | "pausada" | "finalizada";
  tiposRegistro?: string[];
  usuarios?: Array<{
    id: string;
    nombre?: string;
    email?: string;
    rol?: string;
  }>;
  fecha_inicio?: string;
  fecha_termino?: string;
  estadoPreparacionItemizado?: EstadoPreparacionItemizado;
  itemizadoFinalizadoAt?: string | null;
  itemizadoFinalizadoPor?: {
    id: string;
    nombre?: string | null;
    email?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export type ObraClienteBeckResumen = Pick<
  Obra,
  "id" | "nombre" | "codigo" | "estado" | "clienteBeckId"
>;

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
  clienteBeckId?: string | null;
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

  // PREPARACION → EN_REVISION_CLIENTE: envía la propuesta de itemizado al
  // cliente. A partir de este punto Beck no puede modificar la selección.
  enviarItemizadoARevisionCliente: async (obraId: string): Promise<Obra> => {
    const response = await api.patch<Obra>(`/obras/${obraId}/itemizado/enviar-a-cliente`);
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

  getTiposRegistro: async (id: string): Promise<string[]> => {
    const response = await api.get<{ tiposRegistro: string[] } | string[]>(`/obras/${id}/tipos-registro`);
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data.tiposRegistro ?? [];
  },

  putTiposRegistro: async (id: string, tiposRegistro: string[]): Promise<void> => {
    await api.put(`/obras/${id}/tipos-registro`, { tiposRegistro });
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
  | "visualizador_firemat"
  | "cliente";

export interface UsuarioApi {
  id: string;
  nombre: string;
  email: string;
  rol: UsuarioApiRol;
  activo: boolean;
  azureId: string | null;
  createdAt: string;
  clienteBeckId?: string | null;
  clienteBeck?: {
    id?: string;
    rut?: string | null;
    razonSocial?: string | null;
    nombreEmpresa?: string | null;
  } | null;
  obraIds?: string[];
  obras?: ObraClienteBeckResumen[];
  cantidadObrasAsignadas?: number;
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
  clienteBeckId?: string;
  obraIds?: string[];
}
export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: UsuarioApiRol;
  activo?: boolean;
  clienteBeckId?: string;
  obraIds?: string[];
}

export interface EliminarUsuarioResponse {
  message: string;
}

export const usuariosAPI = {
  listar: async (params?: { rol?: UsuarioApiRol; activo?: boolean; empresa?: EmpresaParam }) => {
    const response = await api.get<UsuarioApi[]>("/usuarios", { params });
    return response.data;
  },

  obtener: async (id: string) => {
    const response = await api.get<UsuarioApi>(`/usuarios/${id}`);
    return response.data;
  },

  listarJefesObra: async (): Promise<UsuarioResumen[]> => {
    const response = await api.get<UsuarioResumen[]>("/usuarios", {
      params: { rol: "jefeobra", activo: true },
    });
    return response.data;
  },

  listarComerciales: async (): Promise<UsuarioResumen[]> => {
    const response = await api.get<ApiResponseEnvelope<UsuarioResumen[]>>(
      "/usuarios/comerciales"
    );
    console.log("RAW usuarios comerciales", response.data);
    const data = unwrapApiResponse(response.data);
    console.log("UNWRAPPED usuarios comerciales", data);
    return data;
  },

  listarComercialesFiremat: async (): Promise<UsuarioResumen[]> => {
    const response = await api.get<ApiResponseEnvelope<UsuarioResumen[]>>(
      "/usuarios/comerciales-firemat"
    );
    return unwrapApiResponse(response.data);
  },

  // Alimenta el Select de Vendedor del Funnel Beck. A diferencia de
  // listarComerciales (filtro por rol), este endpoint filtra por permiso
  // efectivo (beck_funnel.puedeEditar) — no reutilizar listarComerciales
  // para este selector ni usar este método para otros consumidores.
  listarVendedoresFunnelBeck: async (): Promise<UsuarioResumen[]> => {
    const response = await api.get<ApiResponseEnvelope<UsuarioResumen[]>>(
      "/usuarios/vendedores-funnel-beck"
    );
    return unwrapApiResponse(response.data);
  },

  listarResponsablesCotizaciones: async (): Promise<UsuarioResumen[]> => {
    const response = await api.get<ApiResponseEnvelope<UsuarioResumen[]>>(
      "/usuarios/responsables-cotizaciones"
    );
    return unwrapApiResponse(response.data);
  },

  crear: async (data: CrearUsuarioInput) => {
    const response = await api.post<UsuarioApi>("/usuarios", data);
    return response.data;
  },

  actualizar: async (id: string, data: ActualizarUsuarioInput) => {
    const response = await api.put<UsuarioApi>(`/usuarios/${id}`, data);
    return response.data;
  },

  // El backend responde { usuario, obraIds, obras, cantidadObrasAsignadas } para estos
  // dos endpoints (no un array plano ni un ApiResponseEnvelope), por eso no se usa unwrapArray.
  obtenerObrasUsuario: async (id: string): Promise<ObraClienteBeckResumen[]> => {
    const response = await api.get<{ obras?: ObraClienteBeckResumen[] } | ObraClienteBeckResumen[]>(
      `/usuarios/${id}/obras`
    );
    const data = response.data;
    return Array.isArray(data) ? data : data.obras ?? [];
  },

  actualizarObrasUsuario: async (id: string, obraIds: string[]): Promise<ObraClienteBeckResumen[]> => {
    const response = await api.put<{ obras?: ObraClienteBeckResumen[] } | ObraClienteBeckResumen[]>(
      `/usuarios/${id}/obras`,
      { obraIds }
    );
    const data = response.data;
    return Array.isArray(data) ? data : data.obras ?? [];
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

export interface DashboardBeckRendimientoTrabajador {
  nombreSellador: string;
  totalRegistros: number;
  cantidadEjecutadaTotal: number;
  rendimientoAcumulado: number;
  rendimientoAcumuladoPct: number;
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
  rendimientoPorTrabajador?: DashboardBeckRendimientoTrabajador[];
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

export interface RegistrosResumen {
  pendientes: number;
  enRevision: number;
  validados: number;
  rechazados: number;
  total: number;
}

export interface RendimientoAcumuladoItem {
  nombreSellador: string;
  totalRegistros: number;
  cantidadEjecutadaTotal: number;
  rendimientoAcumulado: number;
  rendimientoAcumuladoPct: number;
}

export interface RendimientoAcumuladoParams {
  fechaInicio: string;
  fechaFin: string;
  obraId?: string;
  nombreSellador?: string;
}

export const registrosAPI = {
  resumen: async (): Promise<RegistrosResumen> => {
    const response = await api.get<RegistrosResumen | ApiResponseEnvelope<RegistrosResumen>>("/registros/resumen");
    const raw = response.data;
    if (raw && typeof raw === "object" && "success" in raw) {
      return unwrapApiResponse(raw as ApiResponseEnvelope<RegistrosResumen>);
    }
    return raw as RegistrosResumen;
  },

  // Mismo comportamiento y misma lógica de generación/unión de PDF que
  // clienteAPI.descargarPdfConsolidado — solo cambia la ruta/autorización
  // (staff interno de /beck/registro en vez del scope de Vista Cliente).
  descargarPdfConsolidado: async (registroIds: string[]): Promise<Blob> => {
    const response = await api.post<Blob>(
      "/registros/pdf-consolidado",
      { registroIds },
      { responseType: "blob" }
    );
    return response.data;
  },

  getRendimientoAcumulado: async (params: RendimientoAcumuladoParams): Promise<RendimientoAcumuladoItem[]> => {
    const response = await api.get<RendimientoAcumuladoItem[] | ApiResponseEnvelope<RendimientoAcumuladoItem[]>>(
      "/registros/rendimiento-acumulado",
      { params }
    );
    const raw = response.data;
    if (raw && typeof raw === "object" && "success" in raw) {
      return unwrapApiResponse(raw as ApiResponseEnvelope<RendimientoAcumuladoItem[]>);
    }
    return raw as RendimientoAcumuladoItem[];
  },
};

export default api;

export type ProductoFiremat = {
  id: number;
  nombre: string;
  sku?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  categoriaId: number;
  precio: number;
  precioClp?: number | null;
  precioUsd?: number | null;
  precioSugerido?: number | null;
  disponibilidad?: string | null;
  formato?: string | null;
  cantidadCaja?: string | null;
  stock: number;
  stockActual?: number | null;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo?: number | null;
  minStock: number;
  ubicacion?: string | null;
  criticidad: string;
  activo: boolean;
  imagen?: string | null;
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
  precioUsd?: number | null;
  precioSugerido?: number | null;
  disponibilidad?: string | null;
  formato?: string | null;
  cantidadCaja?: string | null;
  stockMinimo: number;
  stockInicial?: number;
  ubicacion?: string | null;
  criticidad: string;
  activo: boolean;
};

export type CategoriaFirematPayload = {
  nombre: string;
};

export const firematCategoriasAPI = {
  listar: async (): Promise<CategoriaFiremat[]> => {
    const response = await api.get<ApiResponseEnvelope<CategoriaFiremat[]>>(
      "/firemat/categorias"
    );
    return unwrapApiResponse(response.data);
  },

  crear: async (nombre: string): Promise<CategoriaFiremat> => {
    const response = await api.post<ApiResponseEnvelope<CategoriaFiremat>>(
      "/firemat/categorias",
      { nombre }
    );
    return unwrapApiResponse(response.data);
  },

  editar: async (
    id: number,
    nombre: string
  ): Promise<CategoriaFiremat> => {
    const response = await api.put<ApiResponseEnvelope<CategoriaFiremat>>(
      `/firemat/categorias/${id}`,
      { nombre }
    );
    return unwrapApiResponse(response.data);
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/firemat/categorias/${id}`);
  },
};

export type ImportarPdfProductosResult = {
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: string[];
  advertencias?: string[];
};

export const firematProductosAPI = {
  listar: async (params?: {
    q?: string;
    activo?: boolean;
    categoriaId?: number;
  }): Promise<{ data: ProductoFiremat[]; total: number }> => {
    const response = await api.get<ApiResponseWithTotal<ProductoFiremat[]> | ProductoFiremat[]>(
      "/firemat/productos",
      { params }
    );
    const raw = response.data;
    // Legacy: backend returned array directly
    if (Array.isArray(raw)) {
      return { data: raw, total: raw.length };
    }
    if (!raw.success) {
      throw new Error(raw.error || raw.message || "Error en la solicitud");
    }
    const productos = Array.isArray(raw.data) ? raw.data : (raw.data as unknown as ProductoFiremat[] | null) ?? [];
    const total = typeof raw.total === "number" ? raw.total : productos.length;
    return { data: productos, total };
  },

  crear: async (payload: ProductoFirematPayload, imagen?: File | null): Promise<ProductoFiremat> => {
    if (imagen) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append("imagen", imagen);
      const response = await api.post<ApiResponseEnvelope<ProductoFiremat>>(
        "/firemat/productos",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return unwrapApiResponse(response.data);
    }
    const response = await api.post<ApiResponseEnvelope<ProductoFiremat>>(
      "/firemat/productos",
      payload
    );
    return unwrapApiResponse(response.data);
  },

  editar: async (id: number, payload: Partial<ProductoFirematPayload>, imagen?: File | null): Promise<ProductoFiremat> => {
    if (imagen) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append("imagen", imagen);
      const response = await api.put<ApiResponseEnvelope<ProductoFiremat>>(
        `/firemat/productos/${id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return unwrapApiResponse(response.data);
    }
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

  importarListaPreciosPdf: async (file: File): Promise<ImportarPdfProductosResult> => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const response = await api.post<ApiResponseEnvelope<ImportarPdfProductosResult>>(
      "/firemat/productos/importar-lista-precios-pdf",
      formData,
      { headers: { "Content-Type": false } }
    );
    return unwrapApiResponse(response.data);
  },

  asignarCategoria: async (
    productoIds: number[],
    categoriaId: number
  ): Promise<{ categoriaId: number; productosActualizados: number }> => {
    const response = await api.patch<
      ApiResponseEnvelope<{ categoriaId: number; productosActualizados: number }>
    >("/firemat/productos/asignar-categoria", { productoIds, categoriaId });
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
  detalles?: FirematCotizacionLinea[];
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

export interface FirematDashboardKpis {
  totalOportunidades: number;
  oportunidadesActivas: number;
  oportunidadesGanadas: number;
  oportunidadesPerdidas: number;
  oportunidadesPostergadas: number;
  oportunidadesDescartadas: number;
  pipelineTotalClp: number;
  montoGanadoClp: number;
  montoPerdidoClp: number;
  tasaCierre: number;
  tasaRecompra: number;
  clientesReactivados?: number;
}

export interface FirematDashboardResponsable {
  responsable: string;
  total: number;
  ganadas: number;
  perdidas: number;
  postergadas: number;
  activas: number;
  montoTotalClp: number;
  montoGanadoClp: number;
}

export interface FirematDashboardSinSeguimientoItem {
  id: string;
  nombreOportunidad: string;
  cliente: string;
  responsable: string;
  etapa: string;
  updatedAt: string;
  fechaProximaAccion: string | null;
  montoEstimado: number;
}

export interface FirematDashboardProspectos {
  nuevosSemana: number;
  nuevosMes: number;
  porOrigen: { origen: string; cantidad: number }[];
  porResponsable: { responsable: string; cantidad: number }[];
}

export interface FirematDashboardPipelineAvanzado {
  porResponsable: { responsable: string; cantidad: number; montoClp: number }[];
  porUnidadNegocio: { unidadNegocio: string; cantidad: number; montoClp: number }[];
  porOrigen: { origen: string; cantidad: number; montoClp: number }[];
  porTipoCliente: { tipoCliente: string; cantidad: number; montoClp: number }[];
  porCliente: { cliente: string; cantidad: number; montoClp: number }[];
  porProyecto: { proyecto: string; cliente: string; responsable: string; etapa: string; montoClp: number }[];
}

export interface FirematDashboardForecast {
  dias30: { cantidad: number; montoClp: number; montoPonderadoClp: number };
  dias60: { cantidad: number; montoClp: number; montoPonderadoClp: number };
  dias90: { cantidad: number; montoClp: number; montoPonderadoClp: number };
}

export interface FirematDashboardGanadas {
  montoGanadoMesActualClp: number;
  montoGanadoUltimos12Meses: { mes: string; cantidad: number; montoClp: number }[];
}

export interface FirematDashboardMotivos {
  perdida: { motivo: string; cantidad: number }[];
  postergacion: { motivo: string; cantidad: number }[];
  descarte: { motivo: string; cantidad: number }[];
}

export interface FirematDashboardRiesgoItem {
  id: string;
  nombreOportunidad: string;
  cliente: string;
  responsable: string;
  etapa: string;
  updatedAt?: string;
  montoEstimado: number;
}

export interface FirematDashboardRiesgoComercial {
  oportunidadesDetenidas: {
    total: number;
    diasSinMovimiento: number;
    items: FirematDashboardRiesgoItem[];
  };
  oportunidadesSinProximaAccion: {
    total: number;
    items: Omit<FirematDashboardRiesgoItem, "updatedAt">[];
  };
}

export interface FirematDashboardConversionEtapas {
  etapas: {
    etapa: string;
    label: string;
    cantidad: number;
    porcentajeSobreTotal: number;
  }[];
  transiciones: {
    desde: string;
    hasta: string;
    desdeLabel: string;
    hastaLabel: string;
    cantidadDesde: number;
    cantidadHasta: number;
    tasaConversion: number;
  }[];
}

export interface FirematDashboardTiemposPromedio {
  tiempoPromedioDesarrolloCotizacion: number;
  tiempoPromedioCotizacionEnviada: number;
}

export interface FirematDashboardData {
  kpis: FirematDashboardKpis;
  distribucionEstado: {
    activas: number;
    ganadas: number;
    perdidas: number;
    postergadas: number;
    descartadas: number;
  };
  porEtapa: Record<string, { cantidad: number; montoClp: number }>;
  rankingResponsables: FirematDashboardResponsable[];
  sinSeguimiento: {
    totalSinSeguimiento: number;
    diasSinSeguimiento: number;
    oportunidadesSinSeguimiento: FirematDashboardSinSeguimientoItem[];
  };
  proximasAcciones: {
    accionesVencidas: number;
    accionesHoy: number;
    accionesProximos7Dias: number;
  };
  prospectos?: FirematDashboardProspectos;
  pipelineAvanzado?: FirematDashboardPipelineAvanzado;
  forecast?: FirematDashboardForecast;
  ganadas?: FirematDashboardGanadas;
  motivos?: FirematDashboardMotivos;
  riesgoComercial?: FirematDashboardRiesgoComercial;
  conversionEtapas?: FirematDashboardConversionEtapas;
  tiemposPromedio?: FirematDashboardTiemposPromedio;
}

export interface FirematDashboardParams {
  responsable?: string;
  etapa?: string;
  estado?: string;
  unidadNegocio?: string;
  origen?: string;
  tipoCliente?: string;
  tipoOportunidad?: string;
  cliente?: string;
  proyecto?: string;
  productoId?: number;
  diasSinSeguimiento?: number;
  fechaIngresoDesde?: string;
  fechaIngresoHasta?: string;
  fechaCierreDesde?: string;
  fechaCierreHasta?: string;
}

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
  lineaProducto?: string | null;
  productoId?: number | null;
  producto?: ProductoFiremat | null;
  productoNombre?: string | null;
  cantidadEstimada?: number | null;
  descuento?: number | null;
  stockOportunidad?: string | null;
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
  esReactivacion?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  advertencias?: string[];
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
  lineaProducto?: string | null;
  productoId?: number | null;
  cantidadEstimada?: number | null;
  descuento?: number | null;
  stockOportunidad?: string | null;
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
  esReactivacion?: boolean | null;
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
    if ("success" in response.data) {
      const result = unwrapApiResponse(response.data);
      if (response.data.advertencias?.length) result.advertencias = response.data.advertencias;
      return result;
    }
    return response.data;
  },

  actualizar: async (
    id: string,
    payload: FirematFunnelPayload
  ): Promise<FirematFunnelOportunidad> => {
    const response = await api.put<
      ApiResponseEnvelope<FirematFunnelOportunidad> | FirematFunnelOportunidad
    >(`/firemat/funnel/${id}`, payload);
    if ("success" in response.data) {
      const result = unwrapApiResponse(response.data);
      if (response.data.advertencias?.length) result.advertencias = response.data.advertencias;
      return result;
    }
    return response.data;
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
    if ("success" in response.data) {
      const result = unwrapApiResponse(response.data);
      if (response.data.advertencias?.length) result.advertencias = response.data.advertencias;
      return result;
    }
    return response.data;
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

  getHistorialEtapas: async (id: string | number): Promise<HistorialEtapaFiremat[]> => {
    const response = await api.get<ApiResponseEnvelope<HistorialEtapaFiremat[]>>(
      `/firemat/funnel/${id}/historial-etapas`
    );
    return unwrapApiResponse(response.data);
  },

  getDashboard: async (params?: FirematDashboardParams): Promise<FirematDashboardData> => {
    const response = await api.get<ApiResponseEnvelope<FirematDashboardData>>(
      "/firemat/funnel/dashboard",
      { params }
    );
    return unwrapApiResponse(response.data);
  },
};

export type InventarioFirematItem = {
  id: number;
  nombre: string;
  sku?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  categoriaId: number;
  stockInicial?: number | null;
  salidas?: number | null;
  fechaUltimaSalida?: string | null;
  entradas?: number | null;
  fechaUltimaEntrada?: string | null;
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  minStock: number;
  stockMinimo?: number | null;
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

export type ActualizarInventarioFirematPayload = {
  stockNuevo: number;
  stockInicial: number;
  salidas: number;
  fechaUltimaSalida: string | null;
  entradas: number;
  fechaUltimaEntrada: string | null;
  ubicacion?: string;
  activo?: boolean;
  motivo?: string;
};

export type ActualizarInventarioFirematResponse = {
  success: true;
  data: InventarioFirematItem;
  movimiento: MovimientoFiremat;
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

export type FirematVentaDetallePayload = {
  productoId: number;
  cantidad: number;
  precio: number;
};

export type FirematVentaCrearPayload = {
  cliente: string;
  contacto?: string | null;
  responsable?: string | null;
  estado?: string;
  detalle: FirematVentaDetallePayload[];
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

  crear: async (payload: FirematVentaCrearPayload): Promise<VentaFiremat> => {
    const res = await api.post<
      VentasApiEnvelope | { success: boolean; data: VentaFiremat; message?: string; error?: string } | VentaFiremat
    >("/firemat/ventas", payload);
    const raw = res.data;
    if (raw && typeof raw === "object" && "success" in raw) {
      const envelope = raw as { success: boolean; data: VentaFiremat; message?: string; error?: string };
      if (!envelope.success) {
        throw new Error(envelope.message ?? envelope.error ?? "Error al crear venta");
      }
      return envelope.data;
    }
    return raw as VentaFiremat;
  },
};

export type ImportarPdfInventarioResult = {
  actualizados: number;
  noEncontrados: number;
  omitidos: number;
  errores: string[];
  advertencias?: string[];
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

  actualizar: async (
    productoId: number,
    payload: ActualizarInventarioFirematPayload
  ): Promise<ActualizarInventarioFirematResponse> => {
    const response = await api.patch<ActualizarInventarioFirematResponse>(
      `/firemat/inventario/${productoId}`,
      payload
    );
    return response.data;
  },

  importarInventarioPdf: async (file: File): Promise<ImportarPdfInventarioResult> => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const response = await api.post<ApiResponseEnvelope<ImportarPdfInventarioResult>>(
      "/firemat/inventario/importar-pdf",
      formData,
      { headers: { "Content-Type": false } }
    );
    return unwrapApiResponse(response.data);
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

/* ─────────────── REPORTES FIREMAT ─────────────── */

export type FirematReportesKpis = {
  totalVentas: number;
  montoVendido: number;
  ticketPromedio: number;
  totalProductos: number;
  productosActivos: number;
  productosBajoStock: number;
  productosSinStock: number;
  stockTotal: number;
  stockDisponibleTotal: number;
  cotizacionesTotal: number;
  cotizacionesActivas: number;
  oportunidadesTotal: number;
  oportunidadesActivas: number;
};

export type FirematReporteVentaPorMes = {
  mes: string;
  cantidad: number;
  monto: number;
};

export type FirematReporteVentaPorProducto = {
  productoId: number;
  sku: string;
  nombre: string;
  cantidadVendida: number;
  montoVendido: number;
};

export type FirematReporteInventarioCritico = {
  productoId: number;
  sku: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockDisponible: number;
  minStock: number;
  estadoStock: "SIN_STOCK" | "BAJO_STOCK";
};

export type FirematReporteCotizacionPorEstado = {
  estado: string;
  cantidad: number;
  monto: number;
};

export type FirematReporteOportunidadPorEtapa = {
  etapa: string;
  cantidad: number;
  monto: number;
};

export type FirematReporteMovimientoReciente = {
  id: number;
  fecha: string;
  productoId: number;
  productoNombre: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string | null;
};

export type FirematReporteVentaDetalle = {
  id: number;
  fecha: string;
  cliente: string;
  contacto: string | null;
  responsable: string | null;
  estado: string;
  total: number;
  detalle: Array<{
    productoId: number;
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }>;
};

export type FirematReporteProductoResumen = {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  minStock: number;
  activo: boolean;
  precio: number;
  precioSugerido: number | null;
};

export type FirematReportesData = {
  kpis: FirematReportesKpis;
  ventasPorMes: FirematReporteVentaPorMes[];
  ventasPorProducto: FirematReporteVentaPorProducto[];
  inventarioCritico: FirematReporteInventarioCritico[];
  cotizacionesPorEstado: FirematReporteCotizacionPorEstado[];
  oportunidadesPorEtapa: FirematReporteOportunidadPorEtapa[];
  movimientosRecientes: FirematReporteMovimientoReciente[];
  ventasDetalle: FirematReporteVentaDetalle[];
  productosResumen: FirematReporteProductoResumen[];
};

export type FirematReportesParams = {
  fechaDesde?: string;
  fechaHasta?: string;
  categoriaId?: number;
  productoId?: number;
  estadoVenta?: string;
  estadoCotizacion?: string;
  etapaOportunidad?: string;
};

export const firematReportesAPI = {
  obtener: async (params?: FirematReportesParams): Promise<FirematReportesData> => {
    const response = await api.get<ApiResponseEnvelope<FirematReportesData>>(
      "/firemat/reportes",
      { params }
    );
    return unwrapApiResponse(response.data);
  },
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

  obras: async (clienteId: string): Promise<ObraClienteBeckResumen[]> => {
    const response = await api.get<ApiResponseEnvelope<ObraClienteBeckResumen[]> | ObraClienteBeckResumen[]>(
      `/clientes-beck/${clienteId}/obras`
    );
    return unwrapArray(response.data);
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

export type RolConfiguracionCamposRegistro = "jefeobra" | "trabajador" | "cliente" | "ingenieria";
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

// ── Itemizado Opciones ────────────────────────────────────────────────────────

export type ItemizadoOpcion = {
  id: string;
  codigoBeck?: string | null;
  tipo?: string | null;
  elementoPasante?: string | null;
  elementoPenetra?: string | null;
  materialidad?: string | null;
  visible: boolean;
  // Solo presentes cuando se consulta con `obraId` — valor efectivo de la
  // configuración por obra (false si no hay config explícita para esta obra,
  // ninguno de los dos tiene override a nivel de catálogo global).
  propuestoAlCliente?: boolean;
  seleccionadoPorCliente?: boolean;
  // Solo presentes cuando se consulta con `obraId` — valor efectivo de la
  // configuración por obra (null si no hay override para esta obra).
  nombrePersonalizado?: string | null;
  orden?: number | null;
  rendimientoSellosEsperadoDiario?: number | null;
  rendimientoReparacionEsperadoDiario?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ItemizadoOpcionPayload = {
  codigoBeck?: string | null;
  tipo?: string | null;
  elementoPasante?: string | null;
  elementoPenetra?: string | null;
  materialidad?: string | null;
  visible?: boolean;
  rendimientoSellosEsperadoDiario?: number | null;
  rendimientoReparacionEsperadoDiario?: number | null;
};

export type ItemizadoImportarResult = {
  totalFilas: number;
  importadas: number;
  omitidas: number;
  duplicadas: number;
  errores: string[];
};

export type ItemizadoOpcionConfigItem = {
  id?: string;
  obraId?: string;
  itemizadoOpcionId: string;
  orden?: number | null;
  nombrePersonalizado?: string | null;
  nombreMostrar?: string | null;
  itemizadoOpcion?: {
    codigoBeck?: string | null;
    tipo?: string | null;
    elementoPasante?: string | null;
    elementoPenetra?: string | null;
    materialidad?: string | null;
    rendimientoSellosEsperadoDiario?: number | null;
    rendimientoReparacionEsperadoDiario?: number | null;
  };
};

export type ItemizadoConfiguracionObraPayload = {
  items: Array<{
    itemizadoOpcionId: string;
    orden?: number | null;
    nombrePersonalizado?: string | null;
    visible?: boolean;
    rendimientoSellosEsperadoDiario?: number | null;
    rendimientoReparacionEsperadoDiario?: number | null;
  }>;
};

// Payload del endpoint dedicado a "Preparar itemizado" (PrepararItemizadoObraDrawer):
// solo propuestoAlCliente — nunca visible, orden, nombrePersonalizado ni rendimientos.
export type ItemizadoPropuestaObraPayload = {
  items: Array<{
    itemizadoOpcionId: string;
    propuestoAlCliente: boolean;
  }>;
};

export type ItemizadoPreparacionObraInfo = {
  id: string;
  estadoPreparacionItemizado: EstadoPreparacionItemizado;
  itemizadoFinalizadoAt: string | null;
  itemizadoFinalizadoPor: {
    id: string;
    nombre?: string | null;
    email?: string | null;
  } | null;
};

export type ItemizadoPreparacionItem = {
  id: string | null;
  obraId: string;
  itemizadoOpcionId: string;
  visible: boolean;
  orden: number | null;
  nombrePersonalizado: string | null;
  nombreMostrar: string;
  itemizadoOpcion: {
    id?: string;
    codigoBeck?: string | null;
    tipo?: string | null;
    elementoPasante?: string | null;
    elementoPenetra?: string | null;
    materialidad?: string | null;
    rendimientoSellosEsperadoDiario?: number | null;
    rendimientoReparacionEsperadoDiario?: number | null;
  };
};

export type ItemizadoPreparacionObraResponse = {
  obra: ItemizadoPreparacionObraInfo;
  data: ItemizadoPreparacionItem[];
};

export const itemizadoOpcionesAPI = {
  listar: async (params?: {
    obraId?: string;
    codigoBeck?: string;
    tipo?: string;
    elementoPasante?: string;
    elementoPenetra?: string;
    materialidad?: string;
    visible?: boolean;
  }): Promise<ItemizadoOpcion[]> => {
    const response = await api.get<ApiResponseEnvelope<ItemizadoOpcion[]> | ItemizadoOpcion[]>("/itemizado-opciones", { params });
    return unwrapArray(response.data);
  },

  obtenerPorId: async (id: string): Promise<ItemizadoOpcion> => {
    const response = await api.get<ItemizadoOpcion>(`/itemizado-opciones/${id}`);
    return response.data;
  },

  crear: async (payload: ItemizadoOpcionPayload): Promise<ItemizadoOpcion> => {
    const response = await api.post<ItemizadoOpcion>("/itemizado-opciones", payload);
    return response.data;
  },

  actualizar: async (
    id: string,
    payload: Partial<ItemizadoOpcionPayload>,
    obraId?: string
  ): Promise<ItemizadoOpcion> => {
    const response = await api.put<ItemizadoOpcion>(
      `/itemizado-opciones/${id}`,
      obraId ? { ...payload, obraId } : payload
    );
    return response.data;
  },

  actualizarVisible: async (id: string, visible: boolean, obraId?: string): Promise<ItemizadoOpcion> => {
    const response = await api.patch<ApiResponseEnvelope<ItemizadoOpcion> | ItemizadoOpcion>(
      `/itemizado-opciones/${id}/visible`,
      obraId ? { visible, obraId } : { visible }
    );
    return unwrapItem(response.data);
  },

  eliminar: async (id: string): Promise<void> => {
    await api.delete(`/itemizado-opciones/${id}`);
  },

  importarExcel: async (
    file: File,
    reemplazar?: boolean
  ): Promise<ItemizadoImportarResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const url = reemplazar
      ? "/itemizado-opciones/importar?reemplazar=true"
      : "/itemizado-opciones/importar";
    const response = await api.post<ItemizadoImportarResult>(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  obtenerConfiguracionObra: async (obraId: string): Promise<ItemizadoOpcionConfigItem[]> => {
    const response = await api.get<ApiResponseEnvelope<ItemizadoOpcionConfigItem[]> | ItemizadoOpcionConfigItem[]>(
      `/itemizado-opciones/obra/${obraId}/configuracion`
    );
    return unwrapArray(response.data);
  },

  obtenerPreparacionObra: async (obraId: string): Promise<ItemizadoPreparacionObraResponse> => {
    const response = await api.get<
      ApiResponseEnvelope<ItemizadoPreparacionItem[]> & { obra: ItemizadoPreparacionObraInfo }
    >(`/itemizado-opciones/obra/${obraId}/configuracion`);
    return { obra: response.data.obra, data: unwrapArray(response.data) };
  },

  guardarConfiguracionObra: async (
    obraId: string,
    payload: ItemizadoConfiguracionObraPayload
  ): Promise<void> => {
    await api.put(`/itemizado-opciones/obra/${obraId}/configuracion`, payload);
  },

  // Endpoint dedicado de "Preparar itemizado": solo escribe propuestoAlCliente,
  // nunca visible/orden/nombrePersonalizado/rendimientos.
  guardarPropuestaObra: async (
    obraId: string,
    payload: ItemizadoPropuestaObraPayload
  ): Promise<void> => {
    await api.put(`/itemizado-opciones/obra/${obraId}/propuesta`, payload);
  },

  // Equivalente interno (roles Beck) de clienteAPI.obtenerItemizados: misma tabla
  // que verá el cliente (itemizados propuestos + selección), usado por
  // ItemizadoPreviewPanel para la vista previa de solo lectura del administrador.
  obtenerPropuestaObra: async (
    obraId: string
  ): Promise<{ obra: ItemizadoPreparacionObraInfo; data: ItemizadoPropuestoCliente[] }> => {
    const response = await api.get<
      ApiResponseEnvelope<ItemizadoPropuestoCliente[]> & { obra: ItemizadoPreparacionObraInfo }
    >(`/itemizado-opciones/obra/${obraId}/propuesta`);
    return { obra: response.data.obra, data: unwrapArray(response.data) };
  },

  actualizarVisibleMasivoObra: async (
    obraId: string,
    visible: boolean
  ): Promise<{ success: boolean; actualizados: number; visible: boolean }> => {
    const response = await api.patch<{ success: boolean; actualizados: number; visible: boolean }>(
      `/itemizado-opciones/obra/${obraId}/visible`,
      { visible }
    );
    return response.data;
  },
};

// ── Alertas Beck ────────────────────────────────────────────────────────────

export type AlertaBeckSeveridad = "ALTA" | "MEDIA" | "BAJA";

export interface AlertaBeck {
  alertaKey: string;
  modulo: "BECK";
  tipo: string;
  oportunidadId: string;
  titulo: string;
  descripcion: string;
  responsable: string | null;
  severidad: AlertaBeckSeveridad;
  fechaReferencia?: string | null;
  diasRestantes?: number | null;
  diasAtraso?: number | null;
  url?: string;
}

export interface AlertasBeckResponse {
  nuevas: AlertaBeck[];
  vistas: AlertaBeck[];
  total: number;
}

// ── Alertas Firemat ──────────────────────────────────────────────────────────

export type AlertaFirematSeveridad = "ALTA" | "MEDIA" | "BAJA";

export interface AlertaFiremat {
  alertaKey: string;
  modulo: "FIREMAT";
  tipo: string;
  oportunidadId: number;
  titulo: string;
  descripcion: string;
  responsable: string | null;
  severidad: AlertaFirematSeveridad;
  fechaReferencia?: string | null;
  diasRestantes?: number | null;
  diasAtraso?: number | null;
  url?: string;
}

export interface AlertasFirematResponse {
  nuevas: AlertaFiremat[];
  vistas: AlertaFiremat[];
  total: number;
}

export const alertasAPI = {
  getAlertasBeck: async (): Promise<AlertasBeckResponse> => {
    const response = await api.get<AlertasBeckResponse>("/alertas/beck");
    return response.data;
  },

  marcarVista: async (alertaKeys: string[]): Promise<void> => {
    await api.post("/alertas/marcar-vista", { alertaKeys });
  },

  getAlertasFiremat: async (): Promise<AlertasFirematResponse> => {
    const response = await api.get<AlertasFirematResponse>("/alertas/firemat");
    return response.data;
  },

  marcarVistaFiremat: async (alertaKeys: string[]): Promise<void> => {
    await api.post("/alertas/firemat/marcar-vista", { alertaKeys });
  },
};

// ── Cliente (rol externo) ─────────────────────────────────────────────────────

export interface ClienteObraResumen {
  id: string;
  nombre: string;
  codigo?: string | null;
  cliente?: string | null;
  estado?: string | null;
  totalRegistros: number;
  cantidadFinalTotal: number;
}

export interface ClienteRegistroValidado {
  id: string;
  estado?: "Validado" | "No validado" | string;
  acciones?: {
    puedeValidar?: boolean;
  } | null;
  validadoCliente?: boolean | null;
  validadoClienteAt?: string | null;
  validadoClientePor?: string | null;
  pdfFirmadoUrl?: string | null;
  fecha?: string | null;
  tipoRegistro?: string | null;
  piso?: string | null;
  modulo?: string | null;
  recinto?: string | null;
  eje?: string | null;
  numeroSello?: string | null;
  cantidad?: number | null;
  cantidadFinal?: number | null;
  material?: string | null;
  sellador?: string | null;
  itemizadoBeck?: string | null;
  itemizadoMandante?: string | null;
  fotosUrls?: string[] | null;
  fotoUrl?: string | null;
  fotos_registro?: Array<{ url: string; nombre?: string }> | null;
  [key: string]: unknown;
}

export interface ClienteFirmaMasivaResultado {
  exitosos: Array<{ id: string; pdfFirmadoUrl: string }>;
  omitidos: Array<{ id: string; motivo: string }>;
  fallidos: Array<{ id: string; motivo: string }>;
  totalSolicitados: number;
  totalExitosos: number;
  totalOmitidos: number;
  totalFallidos: number;
}

export interface ClienteRegistroColumna {
  key?: string;
  clave?: string;
  dataIndex?: string;
  campo?: string;
  title?: string;
  titulo?: string;
  label?: string;
  visible?: boolean;
  orden?: number;
}

export interface ClienteRegistrosObraResponse {
  registros: ClienteRegistroValidado[];
  columnas?: ClienteRegistroColumna[];
  columnasConfigurables?: ClienteRegistroColumna[];
  columnasFijas?: ClienteRegistroColumna[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrapClienteRegistrosObra = (payload: any): ClienteRegistrosObraResponse => {
  console.log("RAW REGISTROS OBRA API (payload completo)", JSON.stringify(payload).slice(0, 400));

  // Case 1: payload ya es un array de registros (sin envelope)
  if (Array.isArray(payload)) {
    console.log("UNWRAPPED REGISTROS OBRA API (case: array-direct)", { registrosLen: (payload as unknown[]).length });
    return {
      registros: payload as ClienteRegistroValidado[],
      columnas: [],
      columnasConfigurables: [],
      columnasFijas: [],
    };
  }

  // Case 2: { success, data: [...registros], columnas, columnasConfigurables, columnasFijas }
  // El backend devuelve data como el array de registros y las columnas en la raíz del payload.
  if (Array.isArray(payload?.data)) {
    const registros = payload.data as ClienteRegistroValidado[];
    const columnasConfigurables: ClienteRegistroColumna[] =
      Array.isArray(payload.columnasConfigurables) ? payload.columnasConfigurables as ClienteRegistroColumna[] : [];
    const columnasFijas: ClienteRegistroColumna[] =
      Array.isArray(payload.columnasFijas) ? payload.columnasFijas as ClienteRegistroColumna[] : [];
    const columnas: ClienteRegistroColumna[] =
      Array.isArray(payload.columnas) && (payload.columnas as unknown[]).length > 0
        ? payload.columnas as ClienteRegistroColumna[]
        : columnasConfigurables;

    const unwrapped: ClienteRegistrosObraResponse = { registros, columnas, columnasConfigurables, columnasFijas };

    console.log("UNWRAPPED REGISTROS OBRA API (case: data=array, columnas en raíz)", {
      registrosLen: registros.length,
      columnasLen: columnas.length,
      columnasConfigLen: columnasConfigurables.length,
      columnasFijasLen: columnasFijas.length,
      primeraColumna: columnas[0],
      primeraConfigurable: columnasConfigurables[0],
    });

    return unwrapped;
  }

  // Case 3: { success, data: { registros, columnas, columnasConfigurables, columnasFijas } }
  // O directo sin envelope.
  const inner: Record<string, unknown> =
    payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data as Record<string, unknown>
      : payload as Record<string, unknown>;

  const registros: ClienteRegistroValidado[] =
    Array.isArray(inner.registros) ? inner.registros as ClienteRegistroValidado[] : [];
  const columnasConfigurables: ClienteRegistroColumna[] =
    Array.isArray(inner.columnasConfigurables) ? inner.columnasConfigurables as ClienteRegistroColumna[] : [];
  const columnasFijas: ClienteRegistroColumna[] =
    Array.isArray(inner.columnasFijas) ? inner.columnasFijas as ClienteRegistroColumna[] : [];
  const columnas: ClienteRegistroColumna[] =
    Array.isArray(inner.columnas) && (inner.columnas as unknown[]).length > 0
      ? inner.columnas as ClienteRegistroColumna[]
      : columnasConfigurables;

  const unwrapped: ClienteRegistrosObraResponse = { registros, columnas, columnasConfigurables, columnasFijas };

  console.log("UNWRAPPED REGISTROS OBRA API (case: data=object)", {
    registrosLen: registros.length,
    columnasLen: columnas.length,
    columnasConfigLen: columnasConfigurables.length,
    columnasFijasLen: columnasFijas.length,
    primeraColumna: columnas[0],
    primeraConfigurable: columnasConfigurables[0],
  });

  return unwrapped;
};

export interface VistaClienteConfigItem {
  clave: string;
  visible: boolean;
  tituloPersonalizado?: string | null;
  orden: number;
}

export interface VistaClienteConfig {
  items: VistaClienteConfigItem[];
}

type VistaClienteConfigBackendResponse = VistaClienteConfig | {
  configuracionVista?: VistaClienteConfigItem[];
};

const unwrapVistaClienteConfig = (
  payload: ApiResponseEnvelope<VistaClienteConfigBackendResponse> | VistaClienteConfigBackendResponse
): VistaClienteConfig => {
  const raw = "success" in payload ? unwrapApiResponse(payload) : payload;
  return {
    items: "items" in raw ? raw.items : raw.configuracionVista ?? [],
  };
};

export interface ClienteDashboardData {
  totalObras: number;
  totalRegistros: number;
  cantidadFinalTotal: number;
  registrosEsteMes: number;
  registrosPorObra: Array<{ nombre: string; total: number }>;
  registrosPorTipo: Array<{ tipo: string; total: number }>;
  registrosPorPiso: Array<{ piso: string; total: number }>;
  registrosPorFecha: Array<{ fecha: string; total: number }>;
  configuracionVista?: VistaClienteConfigItem[];
}

export interface ClienteUsuario {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  cantidadObrasAsignadas: number;
}

export interface ClienteBeckVistaCliente {
  id: string;
  rut: string;
  razonSocial: string;
  nombreEmpresa?: string | null;
  correo?: string | null;
  telefono?: string | null;
  region?: string | null;
  comuna?: string | null;
  activo: boolean;
  cantidadObrasAsociadas: number;
  totalRegistrosValidados: number;
}

type ClienteParams = { clienteUsuarioId?: string; clienteBeckId?: string };

// ── Permisos de módulos BECK ──────────────────────────────────────────────────

export type ModuloBeck =
  | "beck_dashboard"
  | "beck_procesamiento_ingenieria"
  | "beck_oficina_tecnica"
  | "beck_registro"
  | "beck_reportes"
  | "beck_cotizaciones"
  | "beck_movimientos"
  | "beck_obras"
  | "beck_funnel"
  | "beck_clientes"
  | "beck_vista_cliente"
  | "beck_usuarios_parametros"
  | "beck_reglas_validacion"
  // Firemat modules
  | "firemat_dashboard"
  | "firemat_funnel"
  | "firemat_cotizaciones"
  | "firemat_clientes"
  | "firemat_productos"
  | "firemat_categorias"
  | "firemat_inventario"
  | "firemat_ventas"
  | "firemat_movimientos"
  | "firemat_reportes"
  | "firemat_usuarios_parametros"
  | "beck_cambiar_empresa"
  | "firemat_cambiar_empresa";

export interface PermisoModulo {
  modulo: ModuloBeck;
  puedeVer: boolean;
  puedeEditar: boolean;
}

export interface PermisoModuloInput {
  modulo: ModuloBeck;
  puedeVer: boolean;
  puedeEditar: boolean;
}

export interface PermisosUsuarioDetalleResponse {
  usuario?: UsuarioApi;
  tienePermisosPersonalizados?: boolean;
  permisos?: PermisoModulo[];
  permisosUsuario?: PermisoModulo[];
  permisosRol?: PermisoModulo[];
  permisosEfectivos?: PermisoModulo[];
}

export interface PermisosRolResponse {
  rol: UsuarioApiRol;
  permisos: PermisoModulo[];
  permisosConfigurados?: PermisoModulo[];
  permisosEfectivos?: PermisoModulo[];
  totalUsuarios?: number;
  tienePermisosConfigurados?: boolean;
}

export type UsuarioConOverride = UsuarioApi & { tienePermisosPersonalizados?: boolean };

const unwrapPermisosResponse = (data: unknown): PermisoModulo[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data as PermisoModulo[];
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if ("data" in obj) {
      const inner = obj.data;
      if (Array.isArray(inner)) return inner as PermisoModulo[];
      if (inner && typeof inner === "object") {
        const innerObj = inner as Record<string, unknown>;
        if (Array.isArray(innerObj.permisosEfectivos)) return innerObj.permisosEfectivos as PermisoModulo[];
        if (Array.isArray(innerObj.permisos)) return innerObj.permisos as PermisoModulo[];
      }
      if (!inner) return [];
    }
    if (Array.isArray(obj.permisosEfectivos)) return obj.permisosEfectivos as PermisoModulo[];
    if (Array.isArray(obj.permisos)) return obj.permisos as PermisoModulo[];
  }
  return [];
};

const unwrapRolResponse = <T>(data: unknown): T => {
  if (!data) throw new Error("Sin datos en la respuesta");
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if ("success" in obj) {
      if (!obj.success) {
        const msg = (obj.error as string | undefined) ?? (obj.message as string | undefined) ?? "Error en la solicitud";
        throw new Error(msg);
      }
      return obj.data as T;
    }
  }
  return data as T;
};

export const permisosUsuarioAPI = {
  obtener: async (usuarioId: string): Promise<PermisoModulo[]> => {
    const response = await api.get<ApiResponseEnvelope<PermisoModulo[]> | PermisoModulo[]>(
      `/usuarios/${usuarioId}/permisos`
    );
    return unwrapPermisosResponse(response.data);
  },

  actualizar: async (usuarioId: string, permisos: PermisoModuloInput[]): Promise<PermisoModulo[]> => {
    const response = await api.put<ApiResponseEnvelope<PermisoModulo[]> | PermisoModulo[]>(
      `/usuarios/${usuarioId}/permisos`,
      { permisos }
    );
    return unwrapPermisosResponse(response.data);
  },

  obtenerDetallado: async (usuarioId: string): Promise<PermisosUsuarioDetalleResponse> => {
    const response = await api.get<unknown>(`/usuarios/${usuarioId}/permisos`);
    const raw = response.data;
    if (!raw) return {};
    if (Array.isArray(raw)) {
      return { permisosEfectivos: raw as PermisoModulo[], permisos: raw as PermisoModulo[] };
    }
    if (typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if ("data" in obj && obj.data && typeof obj.data === "object") {
        const inner = obj.data as Record<string, unknown>;
        if ("permisosEfectivos" in inner || "permisosUsuario" in inner || "permisosRol" in inner) {
          return obj.data as PermisosUsuarioDetalleResponse;
        }
        if (Array.isArray(obj.data)) {
          return { permisosEfectivos: obj.data as unknown as PermisoModulo[] };
        }
      }
      if ("permisosEfectivos" in obj || "permisosUsuario" in obj || "permisosRol" in obj) {
        return raw as PermisosUsuarioDetalleResponse;
      }
    }
    return {};
  },

  misPermisos: async (): Promise<PermisoModulo[]> => {
    const response = await api.get<ApiResponseEnvelope<PermisoModulo[]> | PermisoModulo[]>(
      `/me/permisos`
    );
    return unwrapPermisosResponse(response.data);
  },
};

export const permisosRolAPI = {
  listarRoles: async (): Promise<PermisosRolResponse[]> => {
    const response = await api.get<unknown>("/permisos/roles");
    const result = unwrapRolResponse<PermisosRolResponse[]>(response.data);
    return Array.isArray(result) ? result : [];
  },

  obtenerRol: async (rol: UsuarioApiRol): Promise<PermisosRolResponse> => {
    const response = await api.get<unknown>(`/permisos/roles/${rol}`);
    return unwrapRolResponse<PermisosRolResponse>(response.data);
  },

  actualizarRol: async (rol: UsuarioApiRol, permisos: PermisoModuloInput[]): Promise<PermisosRolResponse> => {
    const response = await api.put<unknown>(`/permisos/roles/${rol}`, { permisos });
    return unwrapRolResponse<PermisosRolResponse>(response.data);
  },

  usuariosPorRol: async (rol: UsuarioApiRol): Promise<UsuarioConOverride[]> => {
    const response = await api.get<unknown>(`/permisos/roles/${rol}/usuarios`);
    const result = unwrapRolResponse<UsuarioConOverride[]>(response.data);
    return Array.isArray(result) ? result : [];
  },
};

// ── Control de Inspección ────────────────────────────────────────────────────

export type ResultadoParametroInspeccion = "cumple" | "no_cumple" | "no_aplica";
export type EstadoConformidadInspeccion = "conforme" | "no_conforme";

export interface ControlInspeccionParametro {
  id?: string;
  controlInspeccionId?: string;
  orden: number;
  parametro: string;
  resultado: ResultadoParametroInspeccion;
  observacion?: string | null;
}

export type InspeccionEstado = "no_enviado" | "en_inspeccion" | "inspeccionado";
export type EstadoRevisionInspeccion = "pendiente" | "validado" | "rechazado";

// Nota: el control de inspección (checklist) se realiza únicamente desde la
// app móvil del supervisor. La web solo puede enviar/quitar un registro de la
// bandeja de inspección (PATCH /inspeccion) y consultar el detalle ya
// registrado (GET /inspeccion) — nunca crear el control (POST /control-inspeccion).
export interface InspeccionDetalle {
  inspeccionEstado?: InspeccionEstado;
  seleccionadoParaInspeccion?: boolean | null;
  seleccionadoInspeccionPorId?: string | null;
  seleccionadoInspeccionPor?: { id?: string; nombre?: string | null } | null;
  fechaSeleccionInspeccion?: string | null;
  supervisorInspeccionId?: string | null;
  supervisorInspeccion?: { id?: string; nombre?: string | null } | null;
  fechaInspeccion?: string | null;
  resultado?: string | null;
  conformidad?: EstadoConformidadInspeccion | null;
  observacion?: string | null;
  observaciones?: string | null;
  fotos?: Array<string | { url?: string | null }> | null;
  fotoInspeccionUrl?: string | null;
  fotoNoConformidadUrl?: string | null;
  parametros?: ControlInspeccionParametro[] | null;
  inspeccionRevisionEstado?: EstadoRevisionInspeccion | null;
  inspeccionRevisionAt?: string | null;
  inspeccionRevisionPor?: { id?: string; nombre?: string | null } | null;
  motivoRechazoInspeccion?: string | null;
  [key: string]: unknown;
}

export const inspeccionAPI = {
  marcarInspeccion: async (
    registroId: string,
    seleccionadoParaInspeccion: boolean
  ): Promise<void> => {
    await api.patch(`/registros/${registroId}/inspeccion`, {
      seleccionadoParaInspeccion,
    });
  },

  obtenerDetalleInspeccion: async (
    registroId: string
  ): Promise<InspeccionDetalle | null> => {
    try {
      const response = await api.get<
        ApiResponseEnvelope<InspeccionDetalle> | InspeccionDetalle
      >(`/registros/${registroId}/inspeccion`);
      return unwrapItem(response.data) as InspeccionDetalle;
    } catch (err) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 404) return null;
      throw err;
    }
  },

  revisarInspeccion: async (
    registroId: string,
    accion: "validar" | "rechazar",
    motivo?: string
  ): Promise<void> => {
    await api.patch(`/registros/${registroId}/inspeccion/revision`, {
      accion,
      motivo,
    });
  },
};

// ── Itemizado de la obra (revisión del cliente) ───────────────────────────────

export interface ItemizadoPropuestoCliente {
  itemizadoOpcionId: string;
  codigoBeck: string | null;
  nombreBeck: string | null;
  nombrePersonalizado: string | null;
  propuestoAlCliente: true;
  seleccionadoPorCliente: boolean;
}

export interface ItemizadoObraClienteInfo {
  id: string;
  estadoPreparacionItemizado: EstadoPreparacionItemizado;
}

export interface ItemizadosClienteResponse {
  obra: ItemizadoObraClienteInfo;
  data: ItemizadoPropuestoCliente[];
}

export interface ItemizadoConfirmadoCliente {
  id: string;
  estadoPreparacionItemizado: EstadoPreparacionItemizado;
  itemizadoFinalizadoAt: string | null;
  itemizadoFinalizadoPorId: string | null;
}

export const clienteAPI = {
  usuariosClientes: async (): Promise<ClienteUsuario[]> => {
    const response = await api.get<ApiResponseEnvelope<ClienteUsuario[]>>("/cliente/usuarios-clientes");
    return unwrapApiResponse(response.data);
  },

  clientesBeck: async (): Promise<ClienteBeckVistaCliente[]> => {
    const response = await api.get<ApiResponseEnvelope<ClienteBeckVistaCliente[]>>("/cliente/clientes-beck");
    return unwrapApiResponse(response.data);
  },

  obras: async (params?: ClienteParams): Promise<ClienteObraResumen[]> => {
    const response = await api.get<ApiResponseEnvelope<ClienteObraResumen[]>>("/cliente/obras", { params });
    return unwrapApiResponse(response.data);
  },

  registrosPorObra: async (obraId: string, params?: ClienteParams): Promise<ClienteRegistrosObraResponse> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await api.get<any>(`/cliente/obras/${obraId}/registros`, { params });
    return unwrapClienteRegistrosObra(response.data);
  },

  validarRegistro: async (
    registroId: string,
    firma: { pathData: string; canvasWidth: number; canvasHeight: number }
  ): Promise<ClienteRegistroValidado> => {
    const response = await api.patch<ApiResponseEnvelope<ClienteRegistroValidado> | ClienteRegistroValidado>(
      `/cliente/registros/${registroId}/validar`,
      firma
    );
    return unwrapItem(response.data);
  },

  // Usa el endpoint seguro (GET /cliente/registros/:id/pdf) en vez de abrir
  // pdfFirmadoUrl directo: valida autenticación + acceso a la obra en el
  // backend antes de servir el PDF. El backend responde 302 hacia Cloudinary;
  // axios sigue la redirección y entrega el PDF ya como blob.
  descargarPdfFirmado: async (registroId: string): Promise<Blob> => {
    const response = await api.get<Blob>(`/cliente/registros/${registroId}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },

  validarRegistrosMultiple: async (
    registroIds: string[],
    firma: { pathData: string; canvasWidth: number; canvasHeight: number }
  ): Promise<ClienteFirmaMasivaResultado> => {
    const response = await api.patch<ApiResponseEnvelope<ClienteFirmaMasivaResultado> | ClienteFirmaMasivaResultado>(
      "/cliente/registros/validar-multiple",
      { registroIds, ...firma }
    );
    return unwrapItem(response.data);
  },

  // Genera un único PDF consolidado con las páginas de todos los registros
  // seleccionados, respetando el orden de selección enviado.
  descargarPdfConsolidado: async (registroIds: string[]): Promise<Blob> => {
    const response = await api.post<Blob>(
      "/cliente/registros/pdf-consolidado",
      { registroIds },
      { responseType: "blob" }
    );
    return response.data;
  },

  dashboard: async (params?: ClienteParams): Promise<ClienteDashboardData> => {
    const response = await api.get<ApiResponseEnvelope<{
      kpis?: {
        totalObras?: number;
        totalRegistrosValidados?: number;
        cantidadFinalTotal?: number;
        registrosEsteMes?: number;
      };
      registrosPorObra?: Array<{ obraId?: string; nombre: string; cantidad: number }>;
      registrosPorTipo?: Array<{ tipo: string; cantidad: number }>;
      registrosPorPiso?: Array<{ piso: string; cantidad: number }>;
      registrosPorFecha?: Array<{ fecha: string; cantidad: number }>;
      configuracionVista?: VistaClienteConfigItem[];
    }>>("/cliente/dashboard", { params });
    const raw = unwrapApiResponse(response.data);
    if (import.meta.env.DEV) {
      console.log("dashboard cliente raw", raw);
    }
    return {
      totalObras: raw.kpis?.totalObras ?? 0,
      totalRegistros: raw.kpis?.totalRegistrosValidados ?? 0,
      cantidadFinalTotal: raw.kpis?.cantidadFinalTotal ?? 0,
      registrosEsteMes: raw.kpis?.registrosEsteMes ?? 0,
      registrosPorObra: (raw.registrosPorObra ?? []).map((o) => ({ nombre: o.nombre, total: o.cantidad })),
      registrosPorTipo: (raw.registrosPorTipo ?? []).map((t) => ({ tipo: t.tipo, total: t.cantidad })),
      registrosPorPiso: (raw.registrosPorPiso ?? []).map((p) => ({ piso: p.piso, total: p.cantidad })),
      registrosPorFecha: (raw.registrosPorFecha ?? []).map((f) => ({ fecha: f.fecha, total: f.cantidad })),
      configuracionVista: raw.configuracionVista,
    };
  },

  // GET /api/cliente/obras/:obraId/itemizados — mientras la obra está en
  // PREPARACION el backend responde 409 (aún no fue enviada a revisión); se
  // normaliza a una respuesta vacía en ese estado para que la pantalla
  // muestre el estado vacío en vez de un error.
  obtenerItemizados: async (obraId: string): Promise<ItemizadosClienteResponse> => {
    try {
      const response = await api.get<
        ApiResponseEnvelope<ItemizadoPropuestoCliente[]> & { obra: ItemizadoObraClienteInfo }
      >(`/cliente/obras/${obraId}/itemizados`);
      return { obra: response.data.obra, data: unwrapArray(response.data) };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        return { obra: { id: obraId, estadoPreparacionItemizado: "PREPARACION" }, data: [] };
      }
      throw err;
    }
  },

  // PATCH /api/cliente/obras/:obraId/itemizados/:itemizadoOpcionId — el cliente solo
  // puede tocar nombrePersonalizado y/o seleccionadoPorCliente; enviar solo lo que
  // cambió (omitir el otro campo lo deja intacto en el backend).
  actualizarItemizadoCliente: async (
    obraId: string,
    itemizadoOpcionId: string,
    cambios: { nombrePersonalizado?: string | null; seleccionadoPorCliente?: boolean }
  ): Promise<{ itemizadoOpcionId: string; nombrePersonalizado: string | null; seleccionadoPorCliente: boolean }> => {
    const response = await api.patch<
      ApiResponseEnvelope<{ itemizadoOpcionId: string; nombrePersonalizado: string | null; seleccionadoPorCliente: boolean }>
    >(`/cliente/obras/${obraId}/itemizados/${itemizadoOpcionId}`, cambios);
    return unwrapApiResponse(response.data);
  },

  confirmarItemizado: async (obraId: string): Promise<ItemizadoConfirmadoCliente> => {
    const response = await api.patch<ApiResponseEnvelope<ItemizadoConfirmadoCliente>>(
      `/cliente/obras/${obraId}/itemizado/confirmar`
    );
    return unwrapApiResponse(response.data);
  },
};

export const vistaClienteConfigAPI = {
  getGeneral: async (): Promise<VistaClienteConfig> => {
    const response = await api.get<ApiResponseEnvelope<VistaClienteConfigBackendResponse> | VistaClienteConfigBackendResponse>(
      "/vista-cliente/configuracion/general"
    );
    return unwrapVistaClienteConfig(response.data);
  },

  putGeneral: async (config: VistaClienteConfig): Promise<VistaClienteConfig> => {
    const response = await api.put<ApiResponseEnvelope<VistaClienteConfigBackendResponse> | VistaClienteConfigBackendResponse>(
      "/vista-cliente/configuracion/general",
      config
    );
    return unwrapVistaClienteConfig(response.data);
  },

  getCliente: async (clienteBeckId: string): Promise<VistaClienteConfig> => {
    const response = await api.get<ApiResponseEnvelope<VistaClienteConfigBackendResponse> | VistaClienteConfigBackendResponse>(
      `/vista-cliente/configuracion/cliente/${clienteBeckId}`
    );
    return unwrapVistaClienteConfig(response.data);
  },

  putCliente: async (clienteBeckId: string, config: VistaClienteConfig): Promise<VistaClienteConfig> => {
    const response = await api.put<ApiResponseEnvelope<VistaClienteConfigBackendResponse> | VistaClienteConfigBackendResponse>(
      `/vista-cliente/configuracion/cliente/${clienteBeckId}`,
      config
    );
    return unwrapVistaClienteConfig(response.data);
  },
};
