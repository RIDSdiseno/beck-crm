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
};
