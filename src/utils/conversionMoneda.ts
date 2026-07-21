
export type MonedaSoportada = "CLP" | "UF" | "USD";

export interface IndicadoresConversion {
  uf: number | null;
  dolar: number | null;
}

export const aNumeroOrNull = (
  value: number | string | null | undefined
): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const formatearNumero = (
  value: number | string | null | undefined,
  moneda: MonedaSoportada | null
): string => {
  const n = aNumeroOrNull(value);
  if (n === null) return "—";
  const decimales = moneda === "UF" || moneda === "USD" ? 2 : 0;
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
};

export const formatearMonto = (
  value: number | string | null | undefined,
  moneda: MonedaSoportada | null
): string => {
  const n = aNumeroOrNull(value);
  if (n === null) return "—";
  const formateado = formatearNumero(n, moneda);
  return moneda ? `${moneda} ${formateado}` : formateado;
};

const aClp = (
  valor: number,
  monedaOrigen: MonedaSoportada,
  indicadores: IndicadoresConversion
): number | null => {
  if (monedaOrigen === "CLP") return valor;
  if (monedaOrigen === "UF") {
    return indicadores.uf !== null ? valor * indicadores.uf : null;
  }
  return indicadores.dolar !== null ? valor * indicadores.dolar : null; // USD
};

const deClp = (
  valorClp: number,
  monedaDestino: MonedaSoportada,
  indicadores: IndicadoresConversion
): number | null => {
  if (monedaDestino === "CLP") return valorClp;
  if (monedaDestino === "UF") {
    return indicadores.uf ? valorClp / indicadores.uf : null;
  }
  return indicadores.dolar ? valorClp / indicadores.dolar : null; // USD
};

export const convertirMonto = (
  valor: number,
  monedaOrigen: MonedaSoportada,
  monedaDestino: MonedaSoportada,
  indicadores: IndicadoresConversion
): number | null => {
  if (monedaOrigen === monedaDestino) return valor;
  const valorClp = aClp(valor, monedaOrigen, indicadores);
  if (valorClp === null) return null;
  return deClp(valorClp, monedaDestino, indicadores);
};

export const sumarTotales = (
  montos: Array<{ valor: number | null; moneda: MonedaSoportada | null }>
): Record<MonedaSoportada, number> => {
  const totales: Record<MonedaSoportada, number> = { CLP: 0, UF: 0, USD: 0 };
  for (const { valor, moneda } of montos) {
    if (valor === null || moneda === null) continue;
    totales[moneda] += valor;
  }
  return totales;
};

export interface TotalConvertido {
  totalConvertido: number;
  monedasExcluidas: MonedaSoportada[];
}

// Convierte y suma un mapa de totales por moneda (ej. el resultado de
// sumarTotales) a una única moneda destino. Si falta el indicador necesario
// para convertir alguna moneda, esa moneda queda excluida del total (nunca
// se descarta en silencio: se informa en monedasExcluidas).
export const convertirTotalesAMoneda = (
  totalesPorMoneda: Record<MonedaSoportada, number>,
  monedaDestino: MonedaSoportada,
  indicadores: IndicadoresConversion
): TotalConvertido => {
  let total = 0;
  const excluidas: MonedaSoportada[] = [];

  (Object.keys(totalesPorMoneda) as MonedaSoportada[]).forEach((moneda) => {
    const monto = totalesPorMoneda[moneda];
    if (!monto) return;
    const convertido = convertirMonto(monto, moneda, monedaDestino, indicadores);
    if (convertido === null) {
      excluidas.push(moneda);
      return;
    }
    total += convertido;
  });

  return { totalConvertido: total, monedasExcluidas: excluidas };
};
