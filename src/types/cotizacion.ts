// src/types/cotizacion.ts

<<<<<<< HEAD
export type EstadoCotizacion = "Borrador" | "Enviada" | "Aceptada" | "Rechazada";

export type Cotizacion = {
  id: number;
  numero: number; // N° correlativo en la tabla
  codigo: string; // Ej: BECK-COT-2025-001
  cliente: string;
  proyecto: string;
  origen: string; // Ej: ECONNET, Directo, Referido, etc.
  tipo: "Cliente" | "Interna" | "Servicio" | "Mantención" | "Otro";

  fecha: string;   // YYYY-MM-DD
  vigencia: string; // YYYY-MM-DD
  estado: EstadoCotizacion;

  monto: number;
  moneda: "CLP" | "USD";
=======
export type EstadoCotizacion =
  | "Borrador"
  | "Enviada"
  | "Aceptada"
  | "Rechazada"
  | "EnNegociacion"
  | "NoAdjudicada";

export type CotizacionItem = {
  id: string;
  descripcion: string;
  unidad: "unidad" | "m" | "m2" | "ml" | "servicio";
  cantidad: number;
  precioUnitario: number;
  factor?: number; // factor de holgura o complejidad
  descuentoPct?: number;
};

export type CondicionPago = {
  modalidad: "Contado" | "Credito" | "Anticipo";
  diasCredito?: number;
  anticipoPct?: number;
  notas?: string;
};

export type Cotizacion = {
  id: number;
  numero: number; // correlativo en la tabla
  codigo: string; // Ej: BECK-COT-2025-001

  // Relaciones CRM (opcionales)
  clienteId?: string;
  contactoId?: string;
  obraId?: string;
  oportunidadId?: string;
  contratoId?: string;

  cliente: string;
  proyecto: string;
  origen: string; // Ej: ECONNET, Directo, Referido, etc.
  tipo: "Cliente" | "Interna" | "Servicio" | "Mantencion" | "Otro";
  segmentoCliente?: "A" | "B" | "C";

  fecha: string; // YYYY-MM-DD
  vigencia: string; // YYYY-MM-DD
  estado: EstadoCotizacion;
  version?: number; // version del documento

  monto: number;
  moneda: "CLP" | "USD";
  descuentoPct?: number;
  ivaPct?: number;
  items?: CotizacionItem[];
  condicionPago?: CondicionPago;
>>>>>>> 68e4f8a (push 1)

  responsable: string;
  notas?: string;
};
