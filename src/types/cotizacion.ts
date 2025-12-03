// src/types/cotizacion.ts

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

  responsable: string;
  notas?: string;
};
