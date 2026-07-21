import type { Key } from "react";

type ColumnWithKey = {
  key?: Key;
};

const REGISTRO_COLUMN_KEY_ALIASES: Record<string, string> = {
  eje_alfabetico: "ejeAlfabetico",
  eje_numerico: "ejeNumerico",
  itemizadoMandanteNombre: "itemizadoMandante",
};

export const REGISTRO_PROCESAMIENTO_COLUMN_ORDER = [
  "codigoBeck",
  "itemizadoBeck",
  "itemizadoMandante",
  "fechaEjecucion",
  "dia",
  "piso",
  "ejeAlfabetico",
  "ejeNumerico",
  "nombreSellador",
  "foto",
  "recinto",
  "modulo_edificio",
  "numero_sello",
  "cantidad_sellos",
  "holgura",
  "factor_por_holguras",
  "accesibilidad",
  "cieloModular",
  "cantidad_sellos_con_factores",
  "aislacion",
  "cantidad_sellos_aislacion",
  "reparacion_tabique",
  "cantidad_final",
  "observaciones",
  "folio",
  "tipoRegistro",
  "rendimientoSellos",
  "rendimientoReparacion",
  "rendimientoIndividual",
  "seleccionadoParaInspeccion",
  "cantidadMetros",
  "metros_lineales",
  "cantidadEjecutada",
  "obraNombre",
  "inspeccion",
  "estado",
  "acciones",
] as const;

const REGISTRO_COLUMN_ORDER_INDEX: Map<string, number> = new Map(
  REGISTRO_PROCESAMIENTO_COLUMN_ORDER.map((key, index) => [key, index]),
);

export function normalizarRegistroColumnKey(key: Key | undefined): string {
  const raw = String(key ?? "");
  return REGISTRO_COLUMN_KEY_ALIASES[raw] ?? raw;
}

export function ordenarColumnasRegistro<T extends ColumnWithKey>(columns: T[]): T[] {
  return [...columns].sort((a, b) => {
    const aIndex = REGISTRO_COLUMN_ORDER_INDEX.get(normalizarRegistroColumnKey(a.key)) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = REGISTRO_COLUMN_ORDER_INDEX.get(normalizarRegistroColumnKey(b.key)) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}
