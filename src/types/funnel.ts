import type { ClienteBeck, ContactoClienteBeck } from "../services/api";

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
  | "cerrada";

export type FunnelEstadoCierre = "ganada" | "perdida" | "postergada";

export type FunnelDeal = {
  id: string;
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
  // Negociacion
  probabilidadCierre?: number;
  objeciones?: string;
  contrapropuestas?: string;
  ajustesSolicitados?: string;
  // Cierre
  estadoCierre?: FunnelEstadoCierre;
  motivoPerdida?: string;
  etapaPerdida?: string;
  motivoPostergacion?: string;
  fechaReactivacion?: string;
  documentoRespaldo?: string;
  flujoPosterior?: string;
  // Cliente Beck asociado
  clienteBeckId?: string | null;
  contactoBeckId?: string | null;
  clienteBeck?: ClienteBeck;
  contactoBeck?: ContactoClienteBeck;
};
