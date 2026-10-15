// API comercial completa de Trager (productos, cotizaciones y funnel), con los mismos tipos
// y operaciones que Firemat. Generada a partir de las definiciones de Firemat en api.ts.
// api.ts conserva sus definiciones simplificadas de Trager para las pantallas que aún las usan
// (Categorías, Clientes, resumen del funnel).
import {
  api,
  unwrapApiResponse,
  type ApiResponseEnvelope,
  type ApiResponseWithTotal,
} from "./api";

export type HistorialEtapaTrager = {
  id: number;
  oportunidadId: number;
  etapaAnterior: string | null;
  etapaNueva: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  createdAt: string;
};

export type ProductoTrager = {
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
  precioInstalador?: number | null;
  disponibilidad?: string | null;
  formato?: string | null;
  cantidadCaja?: string | null;
  stock: number;
  stockActual?: number | null;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo?: number | null;
  stockInicial?: number | null;
  minStock: number;
  ubicacion?: string | null;
  criticidad: string;
  activo: boolean;
  imagen?: string | null;
  alertaStockBajo: boolean;
  createdAt: string;
};

export type CategoriaTrager = {
  id: number;
  nombre: string;
};

export type ProductoTragerPayload = {
  nombre: string;
  sku?: string | null;
  descripcion?: string | null;
  categoriaId: number;
  precio: number;
  precioUsd?: number | null;
  precioSugerido?: number | null;
  precioInstalador?: number | null;
  disponibilidad?: string | null;
  formato?: string | null;
  cantidadCaja?: string | null;
  stockMinimo: number;
  stockInicial?: number;
  ubicacion?: string | null;
  criticidad: string;
  activo: boolean;
};

export type CategoriaTragerPayload = {
  nombre: string;
};

export const tragerCategoriasAPI = {
  listar: async (): Promise<CategoriaTrager[]> => {
    const response = await api.get<ApiResponseEnvelope<CategoriaTrager[]>>(
      "/trager/categorias"
    );
    return unwrapApiResponse(response.data);
  },

  crear: async (nombre: string): Promise<CategoriaTrager> => {
    const response = await api.post<ApiResponseEnvelope<CategoriaTrager>>(
      "/trager/categorias",
      { nombre }
    );
    return unwrapApiResponse(response.data);
  },

  editar: async (
    id: number,
    nombre: string
  ): Promise<CategoriaTrager> => {
    const response = await api.put<ApiResponseEnvelope<CategoriaTrager>>(
      `/trager/categorias/${id}`,
      { nombre }
    );
    return unwrapApiResponse(response.data);
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/trager/categorias/${id}`);
  },
};

export type ImportarPdfProductosResult = {
  modo?: "general" | "instalador";
  creados: number;
  actualizados: number;
  noEncontrados?: number;
  omitidos: number;
  errores: string[];
  advertencias?: string[];
};

export const tragerProductosAPI = {
  listar: async (params?: {
    q?: string;
    activo?: boolean;
    categoriaId?: number;
  }): Promise<{ data: ProductoTrager[]; total: number }> => {
    const response = await api.get<ApiResponseWithTotal<ProductoTrager[]> | ProductoTrager[]>(
      "/trager/productos",
      { params }
    );
    const raw = response.data;
    if (Array.isArray(raw)) {
      return { data: raw, total: raw.length };
    }
    if (!raw.success) {
      throw new Error(raw.error || raw.message || "Error en la solicitud");
    }
    const productos = Array.isArray(raw.data) ? raw.data : (raw.data as unknown as ProductoTrager[] | null) ?? [];
    const total = typeof raw.total === "number" ? raw.total : productos.length;
    return { data: productos, total };
  },

  exportar: async (params?: {
    q?: string;
    activo?: boolean;
    categoriaId?: number;
  }): Promise<Blob> => {
    const response = await api.get<Blob>("/trager/productos/exportar", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  crear: async (payload: ProductoTragerPayload, imagen?: File | null): Promise<ProductoTrager> => {
    if (imagen) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append("imagen", imagen);
      const response = await api.post<ApiResponseEnvelope<ProductoTrager>>(
        "/trager/productos",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return unwrapApiResponse(response.data);
    }
    const response = await api.post<ApiResponseEnvelope<ProductoTrager>>(
      "/trager/productos",
      payload
    );
    return unwrapApiResponse(response.data);
  },

  editar: async (id: number, payload: Partial<ProductoTragerPayload>, imagen?: File | null): Promise<ProductoTrager> => {
    if (imagen) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append("imagen", imagen);
      const response = await api.put<ApiResponseEnvelope<ProductoTrager>>(
        `/trager/productos/${id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return unwrapApiResponse(response.data);
    }
    const response = await api.put<ApiResponseEnvelope<ProductoTrager>>(
      `/trager/productos/${id}`,
      payload
    );
    return unwrapApiResponse(response.data);
  },

  toggleEstado: async (id: number, activo: boolean): Promise<ProductoTrager> => {
    const response = await api.patch<ApiResponseEnvelope<ProductoTrager>>(
      `/trager/productos/${id}/estado`,
      { activo }
    );
    return unwrapApiResponse(response.data);
  },


  asignarCategoria: async (
    productoIds: number[],
    categoriaId: number
  ): Promise<{ categoriaId: number; productosActualizados: number }> => {
    const response = await api.patch<
      ApiResponseEnvelope<{ categoriaId: number; productosActualizados: number }>
    >("/trager/productos/asignar-categoria", { productoIds, categoriaId });
    return unwrapApiResponse(response.data);
  },
};


export type TragerCotizacionEstado =
  | "BORRADOR"
  | "ENVIADA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "VENCIDA";

export type TragerCotizacionTipoCliente =
  | "CLIENTE_FINAL"
  | "BROKER"
  | "FERRETERIA"
  | "REDISTRIBUIDOR"
  | "INSTALADOR"
  | "COMISIONISTA"
  | "RECOMPRA";

export type TragerCotizacionLinea = {
  id?: string | number;
  productoId: number;
  productoNombre?: string;
  nombreProducto?: string;
  descripcion?: string | null;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  gananciaPct?: number;
  subtotal: number;
  producto?: ProductoTrager | null;
};

export type TragerCotizacion = {
  id: string;
  numero?: string | number | null;
  cliente: string;
  contacto?: string | null;
  clienteTragerId?: number | null;
  contactoTragerId?: number | null;
  telefono?: string | null;
  correo?: string | null;
  tipoCliente?: TragerCotizacionTipoCliente | string | null;
  cargo?: string | null;
  responsable?: string | null;
  estado: TragerCotizacionEstado;
  moneda?: "CLP" | "USD" | string | null;
  aplicaImpuesto?: boolean;
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
  lineas?: TragerCotizacionLinea[];
  detalle?: TragerCotizacionLinea[];
  detalles?: TragerCotizacionLinea[];
  FunnelTragerOpportunity?: Array<{ id: number }>;
  createdAt?: string;
  updatedAt?: string;
};

export type TragerCotizacionPayload = {
  clienteId?: number | string | null;
  clienteTragerId?: number | string | null;
  contactoId?: number | string | null;
  contactoTragerId?: number | string | null;
  funnelTragerId?: string | number | null;
  cliente: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipoCliente: TragerCotizacionTipoCliente | string;
  cargo?: string | null;
  responsable?: string | null;
  moneda?: "CLP" | "USD" | string;
  aplicaImpuesto?: boolean;
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
    gananciaPct?: number;
    observacion?: string | null;
  }>;
};

export type TragerCotizacionesResumen = {
  totalCotizaciones: number;
  borradores: number;
  enviadas: number;
  aceptadas: number;
  montoTotal: number;
};

type TragerCotizacionesEnvelope = {
  success?: boolean;
  data?: TragerCotizacion[];
  resumen?: Partial<TragerCotizacionesResumen>;
  message?: string;
  error?: string;
};

const normalizeTragerCotizacionesResponse = (
  payload: TragerCotizacionesEnvelope | TragerCotizacion[]
): { data: TragerCotizacion[]; resumen: TragerCotizacionesResumen } => {
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
      aceptadas:
        resumen?.aceptadas ??
        data.filter((item) => item.estado === "ACEPTADA").length,
      montoTotal:
        resumen?.montoTotal ??
        data.reduce((acc, item) => acc + Number(item.total || 0), 0),
    },
  };
};

export const tragerCotizacionesAPI = {
  listar: async (params?: {
    q?: string;
    estado?: TragerCotizacionEstado | "";
    desde?: string;
    hasta?: string;
  }): Promise<{ data: TragerCotizacion[]; resumen: TragerCotizacionesResumen }> => {
    const response = await api.get<TragerCotizacionesEnvelope | TragerCotizacion[]>(
      "/trager/cotizaciones",
      { params }
    );
    const payload = response.data;
    if (!Array.isArray(payload) && payload.success === false) {
      throw new Error(payload.message ?? payload.error ?? "Error al cargar cotizaciones");
    }
    return normalizeTragerCotizacionesResponse(payload);
  },

  obtener: async (id: string): Promise<TragerCotizacion> => {
    const response = await api.get<ApiResponseEnvelope<TragerCotizacion> | TragerCotizacion>(
      `/trager/cotizaciones/${id}`
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  crear: async (payload: TragerCotizacionPayload): Promise<TragerCotizacion> => {
    const response = await api.post<ApiResponseEnvelope<TragerCotizacion> | TragerCotizacion>(
      "/trager/cotizaciones",
      payload
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  actualizar: async (
    id: string,
    payload: TragerCotizacionPayload
  ): Promise<TragerCotizacion> => {
    const response = await api.put<ApiResponseEnvelope<TragerCotizacion> | TragerCotizacion>(
      `/trager/cotizaciones/${id}`,
      payload
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  cambiarEstado: async (
    id: string,
    estado: TragerCotizacionEstado
  ): Promise<TragerCotizacion> => {
    const response = await api.patch<ApiResponseEnvelope<TragerCotizacion> | TragerCotizacion>(
      `/trager/cotizaciones/${id}/estado`,
      { estado }
    );
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  eliminar: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponseEnvelope<{ message?: string }> | { message?: string }>(
      `/trager/cotizaciones/${id}`
    );
    if ("success" in response.data) {
      unwrapApiResponse(response.data);
    }
  },

  descargarPdf: async (id: string): Promise<Blob> => {
    const response = await api.get<Blob>(`/trager/cotizaciones/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },
};

export interface TragerDashboardKpis {
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

export interface TragerDashboardResponsable {
  responsable: string;
  total: number;
  ganadas: number;
  perdidas: number;
  postergadas: number;
  activas: number;
  montoTotalClp: number;
  montoGanadoClp: number;
}

export interface TragerDashboardSinSeguimientoItem {
  id: string;
  nombreOportunidad: string;
  cliente: string;
  responsable: string;
  etapa: string;
  updatedAt: string;
  fechaProximaAccion: string | null;
  montoEstimado: number;
}

export interface TragerDashboardProspectos {
  nuevosSemana: number;
  nuevosMes: number;
  porOrigen: { origen: string; cantidad: number }[];
  porResponsable: { responsable: string; cantidad: number }[];
}

export interface TragerDashboardPipelineAvanzado {
  porResponsable: { responsable: string; cantidad: number; montoClp: number }[];
  porUnidadNegocio: { unidadNegocio: string; cantidad: number; montoClp: number }[];
  porOrigen: { origen: string; cantidad: number; montoClp: number }[];
  porTipoCliente: { tipoCliente: string; cantidad: number; montoClp: number }[];
  porCliente: { cliente: string; cantidad: number; montoClp: number }[];
  porProyecto: { proyecto: string; cliente: string; responsable: string; etapa: string; montoClp: number }[];
}

export interface TragerDashboardForecast {
  dias30: { cantidad: number; montoClp: number; montoPonderadoClp: number };
  dias60: { cantidad: number; montoClp: number; montoPonderadoClp: number };
  dias90: { cantidad: number; montoClp: number; montoPonderadoClp: number };
}

export interface TragerDashboardGanadas {
  montoGanadoMesActualClp: number;
  montoGanadoUltimos12Meses: { mes: string; cantidad: number; montoClp: number }[];
}

export interface TragerDashboardMotivos {
  perdida: { motivo: string; cantidad: number }[];
  postergacion: { motivo: string; cantidad: number }[];
  descarte: { motivo: string; cantidad: number }[];
}

export interface TragerDashboardRiesgoItem {
  id: string;
  nombreOportunidad: string;
  cliente: string;
  responsable: string;
  etapa: string;
  updatedAt?: string;
  montoEstimado: number;
}

export interface TragerDashboardRiesgoComercial {
  oportunidadesDetenidas: {
    total: number;
    diasSinMovimiento: number;
    items: TragerDashboardRiesgoItem[];
  };
  oportunidadesSinProximaAccion: {
    total: number;
    items: Omit<TragerDashboardRiesgoItem, "updatedAt">[];
  };
}

export interface TragerDashboardConversionEtapas {
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

export interface TragerDashboardTiemposPromedio {
  tiempoPromedioDesarrolloCotizacion: number;
  tiempoPromedioCotizacionEnviada: number;
}

export interface TragerDashboardData {
  kpis: TragerDashboardKpis;
  distribucionEstado: {
    activas: number;
    ganadas: number;
    perdidas: number;
    postergadas: number;
    descartadas: number;
  };
  porEtapa: Record<string, { cantidad: number; montoClp: number }>;
  rankingResponsables: TragerDashboardResponsable[];
  sinSeguimiento: {
    totalSinSeguimiento: number;
    diasSinSeguimiento: number;
    oportunidadesSinSeguimiento: TragerDashboardSinSeguimientoItem[];
  };
  proximasAcciones: {
    accionesVencidas: number;
    accionesHoy: number;
    accionesProximos7Dias: number;
  };
  prospectos?: TragerDashboardProspectos;
  pipelineAvanzado?: TragerDashboardPipelineAvanzado;
  forecast?: TragerDashboardForecast;
  ganadas?: TragerDashboardGanadas;
  motivos?: TragerDashboardMotivos;
  riesgoComercial?: TragerDashboardRiesgoComercial;
  conversionEtapas?: TragerDashboardConversionEtapas;
  tiemposPromedio?: TragerDashboardTiemposPromedio;
}

export interface TragerDashboardParams {
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

export type TragerFunnelEtapa =
  | "PROSPECTO"
  | "PRIMER_CONTACTO"
  | "DESARROLLO_COTIZACION"
  | "COTIZACION_ENVIADA"
  | "ORDEN_CONFIRMADA"
  | "GANADA"
  | "PERDIDA"
  | "POSTERGADA"
  | "DESCARTADO";

export type TragerFunnelOportunidad = {
  id: string;
  clienteId?: number | string | null;
  clienteTragerId?: number | string | null;
  cliente: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipoCliente?: TragerCotizacionTipoCliente | string | null;
  rutEmpresa?: string | null;
  region?: string | null;
  comuna?: string | null;
  unidadNegocio?: string | null;
  lineaProducto?: string | null;
  productoId?: number | null;
  producto?: ProductoTrager | null;
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
  etapa: TragerFunnelEtapa;
  montoEstimado?: number | null;
  probabilidadCierre?: number | null;
  proximaAccion?: string | null;
  fechaProximaAccion?: string | null;
  observaciones?: string | null;
  origen?: string | null;
  cotizacionId?: string | number | null;
  cotizacion?: TragerCotizacion | null;
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

export type TragerFunnelPayload = {
  clienteId?: number | string | null;
  clienteTragerId?: number | string | null;
  cliente: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipoCliente?: TragerCotizacionTipoCliente | string | null;
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
  etapa: TragerFunnelEtapa;
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

export type TragerCamposCriticosError = {
  advertenciasCamposCriticos: string[];
  requiereObservacionCamposFaltantes: true;
  message: string;
};

export type FunnelTragerArchivoTipo =
  | "ORDEN_COMPRA"
  | "CORREO_ACEPTACION"
  | "DOCUMENTO_RESPALDO"
  | "COTIZACION"
  | "FICHA_TECNICA"
  | "OTRO";

export interface FunnelTragerArchivo {
  id: number;
  oportunidadId: number;
  tipo: FunnelTragerArchivoTipo | string;
  url: string;
  publicId: string;
  nombreArchivo?: string | null;
  mimeType?: string | null;
  bytes?: number | null;
  etapa?: string | null;
  observaciones?: string | null;
  createdAt: string;
}

export type TragerFunnelResumen = {
  totalOportunidades: number;
  pipelineTotal: number;
  ganadas: number;
  perdidas: number;
  postergadas: number;
  cotizacionesVinculadas: number;
};

type TragerFunnelEnvelope = {
  success?: boolean;
  data?: TragerFunnelOportunidad[];
  resumen?: Partial<TragerFunnelResumen>;
  message?: string;
  error?: string;
};

const normalizeTragerFunnelResponse = (
  payload: TragerFunnelEnvelope | TragerFunnelOportunidad[]
): { data: TragerFunnelOportunidad[]; resumen: TragerFunnelResumen } => {
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

export const tragerFunnelAPI = {
  listar: async (params?: {
    q?: string;
    etapa?: TragerFunnelEtapa | "";
    responsable?: string;
    tipoCliente?: TragerCotizacionTipoCliente | "";
    productoId?: number;
  }): Promise<{ data: TragerFunnelOportunidad[]; resumen: TragerFunnelResumen }> => {
    const response = await api.get<TragerFunnelEnvelope | TragerFunnelOportunidad[]>(
      "/trager/funnel",
      { params }
    );
    const payload = response.data;
    if (!Array.isArray(payload) && payload.success === false) {
      throw new Error(payload.message ?? payload.error ?? "Error al cargar funnel");
    }
    return normalizeTragerFunnelResponse(payload);
  },

  obtener: async (id: string): Promise<TragerFunnelOportunidad> => {
    const response = await api.get<
      ApiResponseEnvelope<TragerFunnelOportunidad> | TragerFunnelOportunidad
    >(`/trager/funnel/${id}`);
    return "success" in response.data
      ? unwrapApiResponse(response.data)
      : response.data;
  },

  crear: async (payload: TragerFunnelPayload): Promise<TragerFunnelOportunidad> => {
    const response = await api.post<
      ApiResponseEnvelope<TragerFunnelOportunidad> | TragerFunnelOportunidad
    >("/trager/funnel", payload);
    if ("success" in response.data) {
      const result = unwrapApiResponse(response.data);
      if (response.data.advertencias?.length) result.advertencias = response.data.advertencias;
      return result;
    }
    return response.data;
  },

  actualizar: async (
    id: string,
    payload: TragerFunnelPayload
  ): Promise<TragerFunnelOportunidad> => {
    const response = await api.put<
      ApiResponseEnvelope<TragerFunnelOportunidad> | TragerFunnelOportunidad
    >(`/trager/funnel/${id}`, payload);
    if ("success" in response.data) {
      const result = unwrapApiResponse(response.data);
      if (response.data.advertencias?.length) result.advertencias = response.data.advertencias;
      return result;
    }
    return response.data;
  },

  cambiarEtapa: async (
    id: string,
    etapa: TragerFunnelEtapa,
    observacionCamposFaltantes?: string | null
  ): Promise<TragerFunnelOportunidad> => {
    const body: { etapa: TragerFunnelEtapa; observacionCamposFaltantes?: string | null } = { etapa };
    if (observacionCamposFaltantes) body.observacionCamposFaltantes = observacionCamposFaltantes;
    const response = await api.patch<
      ApiResponseEnvelope<TragerFunnelOportunidad> | TragerFunnelOportunidad
    >(`/trager/funnel/${id}/etapa`, body);
    if ("success" in response.data) {
      const result = unwrapApiResponse(response.data);
      if (response.data.advertencias?.length) result.advertencias = response.data.advertencias;
      return result;
    }
    return response.data;
  },

  listarArchivos: async (
    oportunidadId: string | number
  ): Promise<FunnelTragerArchivo[]> => {
    const response = await api.get<ApiResponseEnvelope<FunnelTragerArchivo[]>>(
      `/trager/funnel/${oportunidadId}/archivos`
    );
    return unwrapApiResponse(response.data);
  },

  subirArchivos: async (
    oportunidadId: string | number,
    tipo: FunnelTragerArchivoTipo,
    files: File[],
    extra?: { etapa?: string | null; observaciones?: string | null }
  ): Promise<FunnelTragerArchivo[]> => {
    const formData = new FormData();
    formData.append("tipo", tipo);
    if (extra?.etapa) formData.append("etapa", extra.etapa);
    if (extra?.observaciones) {
      formData.append("observaciones", extra.observaciones);
    }
    files.forEach((file) => formData.append("files", file));

    const response = await api.post<ApiResponseEnvelope<FunnelTragerArchivo[]>>(
      `/trager/funnel/${oportunidadId}/archivos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return unwrapApiResponse(response.data);
  },

  eliminarArchivo: async (archivoId: string | number): Promise<void> => {
    const response = await api.delete<ApiResponseEnvelope<{ message?: string }>>(
      `/trager/funnel/archivos/${archivoId}`
    );
    unwrapApiResponse(response.data);
  },

  eliminar: async (id: string): Promise<void> => {
    const response = await api.delete<
      ApiResponseEnvelope<{ message?: string }> | { message?: string }
    >(`/trager/funnel/${id}`);
    if ("success" in response.data) {
      unwrapApiResponse(response.data);
    }
  },

  getHistorialEtapas: async (id: string | number): Promise<HistorialEtapaTrager[]> => {
    const response = await api.get<ApiResponseEnvelope<HistorialEtapaTrager[]>>(
      `/trager/funnel/${id}/historial-etapas`
    );
    return unwrapApiResponse(response.data);
  },

  getDashboard: async (params?: TragerDashboardParams): Promise<TragerDashboardData> => {
    const response = await api.get<ApiResponseEnvelope<TragerDashboardData>>(
      "/trager/funnel/dashboard",
      { params }
    );
    return unwrapApiResponse(response.data);
  },
};

// Ventas de Trager (mismos tipos y operaciones que Firemat).
export type VentaTrager = {
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

export type VentasTragerResumen = {
  totalVentas: number;
  ventasCerradas: number;
  ventasProspecto: number;
  montoTotal: number;
  montoCerrado: number;
};

type VentasApiEnvelope = {
  success: boolean;
  data: VentaTrager[];
  resumen: VentasTragerResumen;
  message?: string;
  error?: string;
};

export type TragerVentaDetallePayload = {
  productoId: number;
  cantidad: number;
  precio: number;
};

export type TragerVentaCrearPayload = {
  cliente: string;
  contacto?: string | null;
  responsable?: string | null;
  estado?: string;
  detalle: TragerVentaDetallePayload[];
};

export const tragerVentasAPI = {
  listar: async (params?: {
    q?: string;
    estado?: string;
    desde?: string;
    hasta?: string;
  }): Promise<{ data: VentaTrager[]; resumen: VentasTragerResumen }> => {
    const res = await api.get<VentasApiEnvelope>("/trager/ventas", { params });
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

  crear: async (payload: TragerVentaCrearPayload): Promise<VentaTrager> => {
    const res = await api.post<
      VentasApiEnvelope | { success: boolean; data: VentaTrager; message?: string; error?: string } | VentaTrager
    >("/trager/ventas", payload);
    const raw = res.data;
    if (raw && typeof raw === "object" && "success" in raw) {
      const envelope = raw as { success: boolean; data: VentaTrager; message?: string; error?: string };
      if (!envelope.success) {
        throw new Error(envelope.message ?? envelope.error ?? "Error al crear venta");
      }
      return envelope.data;
    }
    return raw as VentaTrager;
  },
};
