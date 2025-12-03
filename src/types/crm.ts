// src/types/crm.ts
// Entidades base del CRM para proyectos y servicios de proteccion pasiva.

export type TipoCliente =
  | "Constructora"
  | "Hospital"
  | "Industrial"
  | "Retail"
  | "Infraestructura"
  | "DataCenter"
  | "Educacion"
  | "Otro";

export type SegmentoCliente = "A" | "B" | "C";

export type Cliente = {
  id: string;
  razonSocial: string;
  nombreFantasia?: string;
  rut?: string;
  segmento?: SegmentoCliente;
  industria?: TipoCliente;
  origen?: "Directo" | "Licita" | "Referencia" | "Web" | "Partner";
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  region?: string;
  pais?: string;
  estado?: "Activo" | "Inactivo" | "Prospecto";
  ejecutivoId?: string;
  notas?: string;
};

export type Contacto = {
  id: string;
  clienteId: string;
  nombre: string;
  cargo?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  tipo?: "Tecnico" | "Compras" | "Finanzas" | "Prevencionista" | "Operacion" | "Direccion";
  esDecisionMaker?: boolean;
};

export type Obra = {
  id: string;
  clienteId: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  region?: string;
  tipoConstruccion?:
    | "Hospital"
    | "Industrial"
    | "Comercial"
    | "Residencial"
    | "Infraestructura"
    | "DataCenter"
    | "Educacion"
    | "Otro";
  estado: "Preventa" | "Ejecucion" | "Postventa" | "Mantencion";
  etapa?: "Diseno" | "Instalacion" | "Inspeccion" | "Recepcion";
  superficieM2?: number;
  fechaInicio?: string;
  fechaTermino?: string;
  jefeObra?: string;
  pmCliente?: string;
  responsableInternoId?: string;
  notas?: string;
};

export type EtapaOportunidad =
  | "Lead"
  | "Calificado"
  | "Propuesta"
  | "Negociacion"
  | "CierreGanado"
  | "CierrePerdido";

export type Oportunidad = {
  id: string;
  clienteId: string;
  obraId?: string;
  nombre: string;
  origen?: "BECK" | "Referencia" | "Web" | "Licitacion" | "Recompra";
  tipo: "Proyecto" | "Servicio" | "Mantencion" | "Auditoria";
  etapa: EtapaOportunidad;
  probabilidad: number; // 0-100
  montoEsperado: number;
  moneda: "CLP" | "USD";
  cierreEstimado?: string; // YYYY-MM-DD
  responsableId?: string;
  cotizacionIds?: number[];
  notas?: string;
};

export type ContratoServicio = {
  id: string;
  clienteId: string;
  obraId?: string;
  codigo?: string;
  tipo: "Instalacion" | "Mantencion" | "Auditoria" | "Soporte" | "Retape" | "Inspeccion";
  estado: "Borrador" | "Vigente" | "Finalizado" | "Suspendido";
  fechaInicio?: string;
  fechaFin?: string;
  slaHoras?: number;
  vigenciaMeses?: number;
  monto: number;
  moneda: "CLP" | "USD";
  responsableId?: string;
  cotizacionId?: number;
  notas?: string;
};

export type ServicioContratado = {
  id: string;
  contratoId: string;
  descripcion: string;
  tipo?: "Sello" | "Junta" | "Consultoria" | "Mantencion" | "Capacitacion";
  unidad: "unidad" | "m" | "m2" | "ml" | "servicio";
  cantidad: number;
  precioUnitario: number;
  moneda: "CLP" | "USD";
};

export type Actividad = {
  id: string;
  tipo: "Llamada" | "Visita" | "Correo" | "Reunion" | "Inspeccion" | "Coordinacion";
  fecha: string; // ISO
  estado: "Pendiente" | "Hecha" | "Reprogramada";
  clienteId?: string;
  contactoId?: string;
  obraId?: string;
  oportunidadId?: string;
  contratoId?: string;
  responsableId?: string;
  resumen?: string;
  proximoPaso?: string;
};

export type DocumentoObra = {
  id: string;
  obraId: string;
  tipo: "Ensayo" | "Certificacion" | "CheckList" | "Plano" | "Recepcion" | "Permiso" | "Seguro";
  url?: string;
  referencia?: string;
  version?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  estado?: "Pendiente" | "Aprobado" | "Observado" | "Vencido";
  notas?: string;
};
