import type { HitoObra, LineaEstadoAvance } from "../services/api";
import { aNumeroOrNull, type MonedaSoportada } from "./conversionMoneda";

export interface ValorFila {
  valor: number | null;
  moneda: MonedaSoportada | null;
}

// El subtotal es POR ESTADO DE AVANCE (ejecución del período): viene en cada línea,
// calculado en el backend con la cantidad final de los registros validados.
export const obtenerValorLinea = (linea: LineaEstadoAvance): ValorFila => ({
  valor: aNumeroOrNull(linea.subtotalPeriodo),
  moneda: linea.moneda,
});

export const lineaSinValorizar = (linea: LineaEstadoAvance): boolean =>
  linea.cantidadPeriodo > 0 && obtenerValorLinea(linea).valor === null;

export const lineasConPeriodo = (hito: HitoObra): LineaEstadoAvance[] =>
  hito.lineas.filter((l) => l.cantidadPeriodo !== 0);
