export const MOTIVOS_DESCARTE = [
  { label: "Sin fit comercial", value: "Sin fit comercial" },
  { label: "No corresponde a Beck o Firemat", value: "No corresponde a Beck o Firemat" },
  { label: "Consulta irrelevante", value: "Consulta irrelevante" },
  { label: "Sin proyecto real", value: "Sin proyecto real" },
  { label: "Sin respuesta inicial", value: "Sin respuesta inicial" },
  { label: "Contacto duplicado", value: "Contacto duplicado" },
  { label: "Información insuficiente", value: "Información insuficiente" },
  { label: "Fuera de zona o alcance", value: "Fuera de zona o alcance" },
  { label: "Bajo potencial", value: "Bajo potencial" },
  { label: "Otro", value: "Otro" },
];

export const MOTIVOS_PERDIDA = [
  { label: "Precio", value: "Precio" },
  { label: "Competencia", value: "Competencia" },
  { label: "Timing", value: "Timing" },
  { label: "Cliente postergó decisión", value: "Cliente postergó decisión" },
  { label: "Cliente canceló proyecto", value: "Cliente canceló proyecto" },
  { label: "Proyecto adjudicado a otro proveedor", value: "Proyecto adjudicado a otro proveedor" },
  { label: "Falta de stock", value: "Falta de stock" },
  { label: "Plazo de entrega", value: "Plazo de entrega" },
  { label: "Margen insuficiente", value: "Margen insuficiente" },
  { label: "Condiciones comerciales", value: "Condiciones comerciales" },
  { label: "Falta de respuesta final", value: "Falta de respuesta final" },
  { label: "Decisión interna del cliente", value: "Decisión interna del cliente" },
  { label: "Solución técnica no compatible", value: "Solución técnica no compatible" },
  { label: "Otro", value: "Otro" },
];

export const MOTIVOS_POSTERGACION = [
  { label: "Proyecto paralizado", value: "Proyecto paralizado" },
  { label: "Obra detenida", value: "Obra detenida" },
  { label: "Compra futura", value: "Compra futura" },
  { label: "Cliente pidió retomar más adelante", value: "Cliente pidió retomar más adelante" },
  { label: "Sin fecha clara de decisión", value: "Sin fecha clara de decisión" },
  { label: "Espera de presupuesto", value: "Espera de presupuesto" },
  { label: "Espera de licitación", value: "Espera de licitación" },
  { label: "Recompra futura", value: "Recompra futura" },
  { label: "Decisión congelada", value: "Decisión congelada" },
  { label: "Otro", value: "Otro" },
];

export const normalizarMotivoSubmit = (motivo?: string, detalleOtro?: string): string => {
  if (!motivo) return "";
  if (motivo === "Otro") {
    const detalle = detalleOtro?.trim() ?? "";
    return detalle ? `Otro: ${detalle}` : "";
  }
  return motivo;
};

export const parseMotivoSelect = (value?: string | null): { select: string; detalle: string } => {
  if (!value) return { select: "", detalle: "" };
  if (value.startsWith("Otro: ")) return { select: "Otro", detalle: value.slice(6) };
  return { select: value, detalle: "" };
};
