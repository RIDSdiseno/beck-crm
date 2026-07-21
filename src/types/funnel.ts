import type {
  ClienteBeck,
  ContactoClienteBeck,
  FirematFunnelEtapa,
  FunnelBeckArchivo,
  SolicitudOficinaTecnica,
} from "../services/api";

export type { FirematFunnelEtapa };

export type { ClienteBeck, ContactoClienteBeck };

export type FunnelCurrency = "CLP" | "UF" | "USD";

export type FunnelLeadSource =
  | "Web"
  | "Referido"
  | "Llamada"
  | "Cliente recurrente"
  | "Prospeccion"
  | "Otro";

export type FunnelStage =
  | "prospecto"
  | "visita"
  | "cotizacion"
  | "enviada"
  | "negociacion"
  | "documentacion"
  | "cerrada";

export type FunnelEstadoCierre = "ganada" | "perdida" | "postergada" | "descartada";

export type FunnelDeal = {
  id: string;
  origen?: "BECK" | "FIREMAT";
  etapa: FunnelStage;
  nombreProyecto: string;
  moneda: FunnelCurrency;
  empresa?: string;
  valorEstimado?: number;
  fechaProbableCierre?: string;
  vendedor?: string;
  region?: string;
  comuna?: string;
  fuenteLead?: FunnelLeadSource;
  rutEmpresa?: string;
  nombreContacto?: string;
  cargoContacto?: string;
  telefonoContacto?: string;
  correoContacto?: string;
  tipoCliente?: string;
  tipoOportunidad?: string;
  fechaPrimerContacto?: string;
  tipoContacto?: string;
  necesidadDetectada?: string;
  timingEstimado?: string;
  nivelInteres?: string;
  proximaAccion?: string;
  fechaProximaAccion?: string;
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
  estadoDesarrolloPropuesta?: string;
  informacionPendiente?: string;
  documentosRequeridos?: string;
  riesgoTecnico?: string;
  condicionesEspeciales?: string;
  necesidadValidacionGerencial?: boolean;
  fechaComprometidaEnvio?: string;
  comentariosInternos?: string;
  fechaEnvioPropuesta?: string;
  versionPropuesta?: string;
  numeroPropuesta?: string;
  montoPropuesto?: number;
  fechaVencimientoPropuesta?: string;
  comentariosCliente?: string;
  probabilidadCierre?: number;
  objeciones?: string;
  contrapropuestas?: string;
  ajustesSolicitados?: string;
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
  estadoCierre?: FunnelEstadoCierre;
  motivoPerdida?: string;
  etapaPerdida?: string;
  motivoPostergacion?: string;
  observacionCierre?: string | null;
  fechaReactivacion?: string;
  etapaTablero?: FunnelStage | null;
  etapaFiremat?: FirematFunnelEtapa;
  documentoRespaldo?: string;
  flujoPosterior?: string;
  montoFinalGanado?: number;
  fechaCierre?: string;
  clienteBeckId?: string | null;
  contactoBeckId?: string | null;
  clienteBeck?: ClienteBeck;
  contactoBeck?: ContactoClienteBeck;
  archivos?: FunnelBeckArchivo[];
  solicitudesOficinaTecnica?: SolicitudOficinaTecnica[];
  obra?: {
    id: string;
    nombre?: string | null;
    codigo?: string | null;
    estado?: string | null;
    cliente?: string | null;
    direccion?: string | null;
  } | null;
  direccionProyecto?: string | null;
  unidadNegocio?: string | null;
  observaciones?: string | null;
  urgencia?: string | null;
  observacionCamposFaltantes?: string | null;
  tipoProyecto?: string | null;
  empresaMandante?: string | null;
  necesidadLevantamiento?: boolean | null;
  esReactivacion?: boolean | null;
  oficinaTecnicaAsignada?: string | null;
  duracionEstimada?: string | null;
  estadoRevisionTecnica?: string | null;
  garantiasRequeridas?: string | null;
  estadoDocumentacionVenta?: string | null;
  updatedAt?: string;
};
