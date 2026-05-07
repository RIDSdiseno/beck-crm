export type EstadoCotizacion =
  | "Borrador"
  | "Enviada"
  | "Aceptada"
  | "Rechazada"
  | "Vencida";

export type TipoCotizacion =
  | "Cliente"
  | "Interna"
  | "Servicio"
  | "Mantencion"
  | "Otro";

export type TipoLineaCotizacion = "PRODUCTO" | "SERVICIO" | "MANUAL" | "PRODUCTO_FIREMAT";

export type CotizacionLinea = {
  id?: string | number;
  tipoLinea: TipoLineaCotizacion;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  orden: number;
  gananciaPct: number;
  productoFirematId?: number | null;
};

export type Cotizacion = {
  id: string | number;
  numero?: number;
  codigo?: string;
  clienteNombre: string;
  funnelBeckId?: string | number | null;
  obraId?: string | number;
  vigencia: string;
  observaciones?: string;
  descuento: number;
  aplicaImpuesto: boolean;
  subtotal: number;
  impuesto: number;
  total: number;
  estado: EstadoCotizacion;
  tipo?: TipoCotizacion;
  lineas?: CotizacionLinea[];
};
