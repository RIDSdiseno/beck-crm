
import type { HitoObra, HitoObraItemizadoItem } from "../services/api";
import { aNumeroOrNull, type MonedaSoportada } from "./conversionMoneda";

export interface ValorFila {
  valor: number | null;
  moneda: MonedaSoportada | null;
}

// El subtotal es POR HITO (ejecución del período), no un campo global del
// item: se lee de hito.subtotales, calculado en el backend a partir de los
// registros de terreno cuya fecha cae dentro de fechaDesde/fechaHasta.
export const obtenerValorFila = (item: HitoObraItemizadoItem, hito: HitoObra): ValorFila => ({
  valor: aNumeroOrNull(hito.subtotales[item.itemizadoOpcionId]),
  moneda: item.moneda,
});

export const filaSinValorizar = (item: HitoObraItemizadoItem, hito: HitoObra): boolean => {
  const cantidadEjecutada = aNumeroOrNull(hito.cantidadesEjecutadas[item.itemizadoOpcionId]) ?? 0;
  if (cantidadEjecutada <= 0) return false;
  return obtenerValorFila(item, hito).valor === null;
};
