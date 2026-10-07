import ExcelJS from "exceljs";
import dayjs from "dayjs";
import type { HitoObra, LineaEstadoAvance } from "../services/api";
import { TIPOS_ESTADO_AVANCE, getTipoRegistroLabel } from "../constants/roles";
import { cargarLogoBeck, insertarLogo } from "./logoExcel";

// Formato pedido para el estado de avance: una hoja por tipo (Sellos, Juntas,
// Tabiquería), la columna rosada con el nombre del estado de avance y las columnas
// Código BECK · Itemizado BECK · Itemizado Mandante · Cantidad final · PU · SUB TOTAL.

const ROSADO = "FFEBD3EC";
const AMARILLO = "FFF5C142";
const GRIS = "FFF2F2F2";

const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const FORMATO_MONEDA: Record<string, string> = {
  CLP: '"$" #,##0',
  UF: '"UF" #,##0.00',
  USD: '"US$" #,##0.00',
};

const fecha = (valor: string | null | undefined) => (valor ? dayjs(valor.slice(0, 10)).format("DD-MM-YYYY") : "—");

const nombreArchivo = (texto: string) => texto.replace(/[\\/:*?"<>|]+/g, "-").trim();

const tiposDelHito = (lineas: LineaEstadoAvance[]) => {
  const presentes = new Set(lineas.map((l) => l.tipoRegistro));
  const conocidos = TIPOS_ESTADO_AVANCE.filter((t) => presentes.has(t.value));
  const otros = [...presentes]
    .filter((t) => !TIPOS_ESTADO_AVANCE.some((c) => c.value === t))
    .map((t) => ({ value: t, label: getTipoRegistroLabel(t) }));
  return [...conocidos, ...otros];
};

function agregarHoja(
  workbook: ExcelJS.Workbook,
  nombreHoja: string,
  obraNombre: string,
  hito: HitoObra,
  lineas: LineaEstadoAvance[],
  logo: ArrayBuffer | null,
) {
  const hoja = workbook.addWorksheet(nombreHoja.slice(0, 31));
  hoja.columns = [
    { width: 20 },
    { width: 14 },
    { width: 46 },
    { width: 46 },
    { width: 15 },
    { width: 16 },
    { width: 18 },
  ];

  hoja.mergeCells("B1:G1");
  const titulo = hoja.getCell("B1");
  titulo.value = `${hito.nombre} — ${obraNombre}`;
  titulo.font = { bold: true, size: 13 };

  hoja.mergeCells("B2:G2");
  const estado = hito.terminado
    ? `Terminado el ${fecha(hito.terminadoAt ?? null)}`
    : "Abierto: las cantidades pueden cambiar hasta terminarlo";
  hoja.getCell("B2").value =
    `${nombreHoja} · Fecha de ejecución: ${fecha(hito.fechaDesde)} al ${fecha(hito.fechaHasta)} · ${estado}`;
  hoja.getCell("B2").font = { italic: true, color: { argb: "FF595959" } };

  // Logo arriba a la izquierda, sobre la columna del nombre del estado de avance.
  hoja.getRow(1).height = 30;
  hoja.getRow(2).height = 22;
  hoja.getRow(3).height = 22;
  insertarLogo(workbook, hoja, logo, 92);

  const filaEncabezado = 4;
  const encabezados = ["Codigo BECK", "Itemizado BECK", "Itemizado Mandante", "Cantidad final", "PU", "SUB TOTAL"];
  encabezados.forEach((texto, i) => {
    const celda = hoja.getRow(filaEncabezado).getCell(i + 2);
    celda.value = texto;
    celda.font = { bold: true };
    celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMARILLO } };
    celda.border = BORDE;
  });
  hoja.getRow(filaEncabezado).height = 32;

  const primeraFila = filaEncabezado + 1;
  lineas.forEach((linea, i) => {
    const fila = hoja.getRow(primeraFila + i);
    const formato = linea.moneda ? FORMATO_MONEDA[linea.moneda] : undefined;
    const valores: ExcelJS.CellValue[] = [
      linea.codigoBeck ?? "",
      linea.itemizadoBeck ?? (linea.itemizadoOpcionId ? "" : "Sin ítem en la obra"),
      linea.itemizadoMandante ?? "",
      linea.cantidadPeriodo,
      linea.precioUnitario,
      linea.subtotalPeriodo,
    ];
    valores.forEach((valor, j) => {
      const celda = fila.getCell(j + 2);
      celda.value = valor;
      celda.border = BORDE;
      celda.alignment = { vertical: "middle", wrapText: j === 1 || j === 2 };
    });
    fila.getCell(5).numFmt = "#,##0.00";
    if (formato) {
      fila.getCell(6).numFmt = formato;
      fila.getCell(7).numFmt = formato;
    }
  });
  const ultimaFila = primeraFila + Math.max(lineas.length, 1) - 1;
  if (lineas.length === 0) {
    hoja.mergeCells(primeraFila, 2, primeraFila, 7);
    const vacia = hoja.getCell(primeraFila, 2);
    vacia.value = "Sin cantidades en este período";
    vacia.alignment = { horizontal: "center" };
    vacia.border = BORDE;
  }

  // Columna rosada con el nombre del estado de avance, como en el formato pedido.
  hoja.mergeCells(primeraFila, 1, ultimaFila, 1);
  const etiqueta = hoja.getCell(primeraFila, 1);
  etiqueta.value = hito.nombre.toUpperCase();
  etiqueta.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  etiqueta.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROSADO } };
  etiqueta.border = BORDE;

  // Total del período por moneda (no se suman monedas distintas entre sí).
  const totales = new Map<string, number>();
  let sinValorizar = 0;
  for (const linea of lineas) {
    if (linea.subtotalPeriodo === null || !linea.moneda) {
      if (linea.cantidadPeriodo !== 0) sinValorizar += 1;
      continue;
    }
    totales.set(linea.moneda, (totales.get(linea.moneda) ?? 0) + linea.subtotalPeriodo);
  }
  let filaTotal = ultimaFila + 1;
  for (const [moneda, total] of totales) {
    const fila = hoja.getRow(filaTotal++);
    fila.getCell(6).value = `TOTAL ${moneda}`;
    fila.getCell(7).value = Math.round(total * 100) / 100;
    fila.getCell(7).numFmt = FORMATO_MONEDA[moneda] ?? "#,##0.00";
    for (const col of [6, 7]) {
      const celda = fila.getCell(col);
      celda.font = { bold: true };
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
      celda.border = BORDE;
    }
  }
  if (sinValorizar > 0) {
    hoja.mergeCells(filaTotal + 1, 2, filaTotal + 1, 7);
    const nota = hoja.getCell(filaTotal + 1, 2);
    nota.value = `${sinValorizar} ítem(s) con cantidad no se valorizaron porque no tienen PU o moneda en Configurar itemizados.`;
    nota.font = { italic: true, color: { argb: "FFC00000" } };
  }

  hoja.views = [{ state: "frozen", ySplit: filaEncabezado }];
}

/** Excel del estado de avance: una hoja por tipo con lo ejecutado en el período. */
export async function construirExcelEstadoAvance(
  obraNombre: string,
  hito: HitoObra,
  logo?: ArrayBuffer | null,
): Promise<{ buffer: ArrayBuffer; nombre: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BECK CRM";
  const logoBeck = logo === undefined ? await cargarLogoBeck() : logo;

  const conCantidad = hito.lineas.filter((l) => l.cantidadPeriodo !== 0);
  const tipos = tiposDelHito(conCantidad);
  if (tipos.length === 0) {
    agregarHoja(workbook, "Estado de avance", obraNombre, hito, [], logoBeck);
  } else {
    for (const tipo of tipos) {
      agregarHoja(
        workbook,
        tipo.label,
        obraNombre,
        hito,
        conCantidad.filter((l) => l.tipoRegistro === tipo.value),
        logoBeck,
      );
    }
  }

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  const nombre = nombreArchivo(
    `${hito.nombre} - ${obraNombre} - ${fecha(hito.fechaDesde)} al ${fecha(hito.fechaHasta)}.xlsx`,
  );
  return { buffer, nombre };
}
