import ExcelJS from "exceljs";
import dayjs from "dayjs";
import type { HitoObra, HitoObraItemizadoItem, LineaEstadoAvance } from "../services/api";
import { TIPOS_ESTADO_AVANCE, getTipoRegistroLabel } from "../constants/roles";
import { cargarLogoBeck, insertarLogo } from "./logoExcel";

// Avance semanal en el formato que usa la obra: una fila por ítem y, por cada estado de
// avance elegido, dos columnas: sin factores (S/F) y con factores (C/F). Al inicio, el
// total de las semanas elegidas. Una hoja por tipo (Sellos, Juntas, Tabiquería).

const AMARILLO = "FFF5C142";
const VERDE = "FFEBF1DE";
const DURAZNO = "FFFCE4D6";

const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};
const NUMERO = "#,##0.00";

const TEXTOS_TIPO: Record<string, { titulo: string; unidad: string }> = {
  sello_cortafuego: { titulo: "Avance Sellos Ejecutados de Sellos Cortafuego", unidad: "SELLOS" },
  junta_lineal_espuma: { titulo: "Avance Juntas Ejecutadas de Junta Lineal", unidad: "ML" },
  tabiqueria: { titulo: "Avance Tabiquería Ejecutada", unidad: "TABIQUERÍA" },
};

type Fila = {
  clave: string; // itemizadoOpcionId, o "codigo:X" para un código sin ítem en la obra
  codigo: string;
  elemento: string;
  seccion: string;
};

const fechaCorta = (valor: string | null) => (valor ? dayjs(valor.slice(0, 10)).format("DD-MM-YY") : "—");

const conValor = (v: string | null | undefined) => {
  const t = v?.trim();
  return t && t.toUpperCase() !== "N/A" ? t : null;
};

// Sección de la fila: elemento atravesado y materialidad del ítem (p. ej. Muro / Tabique).
const seccionDe = (elementoPenetra?: string | null, materialidad?: string | null) => {
  const partes = [conValor(elementoPenetra), conValor(materialidad)].filter(Boolean);
  return partes.length > 0 ? `PASADAS EN ${partes.join(" / ").toUpperCase()}` : "OTROS SELLOS";
};

const claveFila = (linea: LineaEstadoAvance) =>
  linea.itemizadoOpcionId ?? `codigo:${(linea.codigoBeck ?? "").trim().toUpperCase()}`;

const compararCodigo = (a: string, b: string) => a.localeCompare(b, "es", { numeric: true });

function filasDelTipo(
  items: HitoObraItemizadoItem[],
  hitos: HitoObra[],
  tipo: string,
  incluirSinEjecucion: boolean,
): Fila[] {
  const filas = new Map<string, Fila>();
  // Por defecto solo lo que tiene ejecución en las semanas elegidas; si se pide, todo
  // el itemizado configurado en la obra (también lo que va en cero).
  if (incluirSinEjecucion) {
    for (const item of items) {
      filas.set(item.itemizadoOpcionId, {
        clave: item.itemizadoOpcionId,
        codigo: item.codigoBeck ?? "",
        elemento: item.itemizadoBeck ?? "",
        seccion: seccionDe(item.elementoPenetra, item.materialidad),
      });
    }
  }
  const itemPorId = new Map(items.map((i) => [i.itemizadoOpcionId, i]));
  for (const hito of hitos) {
    for (const linea of hito.lineas) {
      if (linea.tipoRegistro !== tipo || (linea.cantidadPeriodo === 0 && linea.cantidadFisicaPeriodo === 0)) continue;
      const clave = claveFila(linea);
      if (filas.has(clave)) continue;
      const item = linea.itemizadoOpcionId ? itemPorId.get(linea.itemizadoOpcionId) : undefined;
      filas.set(clave, {
        clave,
        codigo: linea.codigoBeck ?? "",
        elemento: linea.itemizadoBeck ?? item?.itemizadoBeck ?? "Sin ítem en la obra",
        seccion: seccionDe(item?.elementoPenetra, item?.materialidad),
      });
    }
  }
  return [...filas.values()].sort(
    (a, b) =>
      (a.seccion === "OTROS SELLOS" ? 1 : 0) - (b.seccion === "OTROS SELLOS" ? 1 : 0) ||
      a.seccion.localeCompare(b.seccion, "es") ||
      compararCodigo(a.codigo, b.codigo),
  );
}

function agregarHoja(
  workbook: ExcelJS.Workbook,
  tipo: string,
  obraNombre: string,
  hitos: HitoObra[],
  filas: Fila[],
  logo: ArrayBuffer | null,
) {
  const textos = TEXTOS_TIPO[tipo] ?? { titulo: `Avance ${getTipoRegistroLabel(tipo)}`, unidad: "" };
  const etiquetaTipo = TIPOS_ESTADO_AVANCE.find((t) => t.value === tipo)?.label ?? getTipoRegistroLabel(tipo);
  const hoja = workbook.addWorksheet(etiquetaTipo.slice(0, 31));
  const totalTexto = `TOTAL ${textos.unidad} EJECUTADOS`.replace(/\s+/g, " ");
  const ultimaColumna = 4 + hitos.length * 2;

  hoja.columns = [
    { width: 13 },
    { width: 46 },
    { width: 17 },
    { width: 17 },
    ...hitos.flatMap(() => [{ width: 14 }, { width: 14 }]),
  ];

  const pintar = (celda: ExcelJS.Cell, color: string, negrita = true) => {
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    celda.font = { bold: negrita };
    celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    celda.border = BORDE;
  };

  // Bloque izquierdo: logo, título, obra y encabezados de las columnas fijas.
  hoja.mergeCells(1, 1, 3, 1);
  pintar(hoja.getCell(1, 1), AMARILLO);
  insertarLogo(workbook, hoja, logo, 88);
  hoja.mergeCells(1, 2, 2, 4);
  hoja.getCell(1, 2).value = textos.titulo;
  pintar(hoja.getCell(1, 2), AMARILLO);
  hoja.mergeCells(3, 2, 3, 4);
  hoja.getCell(3, 2).value = `Obra: ${obraNombre}`;
  pintar(hoja.getCell(3, 2), AMARILLO);
  hoja.mergeCells(4, 1, 5, 1);
  hoja.getCell(4, 1).value = "Codigo";
  pintar(hoja.getCell(4, 1), "FFFFFFFF");
  hoja.mergeCells(4, 2, 5, 2);
  hoja.getCell(4, 2).value = "Elemento";
  pintar(hoja.getCell(4, 2), "FFFFFFFF");
  hoja.getCell(4, 3).value = "SIN FACTORES";
  hoja.getCell(4, 4).value = "CON FACTORES";
  hoja.getCell(5, 3).value = `${totalTexto} (S/F)`;
  hoja.getCell(5, 4).value = `${totalTexto} (C/F)`;
  for (const [fila, col] of [[4, 3], [4, 4], [5, 3], [5, 4]]) pintar(hoja.getCell(fila, col), "FFFFFFFF");

  // Una pareja de columnas S/F y C/F por estado de avance.
  hitos.forEach((hito, i) => {
    const col = 5 + i * 2;
    hoja.mergeCells(1, col, 1, col + 1);
    hoja.getCell(1, col).value = hito.nombre.toUpperCase();
    pintar(hoja.getCell(1, col), "FFFFFFFF");
    hoja.getCell(2, col).value = `${totalTexto} EA (S/F)`;
    hoja.getCell(2, col + 1).value = `${totalTexto} EA (C/F)`;
    pintar(hoja.getCell(2, col), "FFFFFFFF");
    pintar(hoja.getCell(2, col + 1), "FFFFFFFF");
    for (const [c, color] of [[col, VERDE], [col + 1, DURAZNO]] as const) {
      hoja.mergeCells(3, c, 5, c);
      hoja.getCell(3, c).value = `${hito.nombre}\n${fechaCorta(hito.fechaDesde)}\nal\n${fechaCorta(hito.fechaHasta)}`;
      pintar(hoja.getCell(3, c), color);
    }
  });
  hoja.getRow(1).height = 20;
  hoja.getRow(2).height = 45;
  hoja.getRow(3).height = 20;
  hoja.getRow(5).height = 45;

  // Cantidades por fila (ítem) y estado de avance.
  const porHito = hitos.map((hito) => {
    const mapa = new Map<string, LineaEstadoAvance>();
    for (const linea of hito.lineas) if (linea.tipoRegistro === tipo) mapa.set(claveFila(linea), linea);
    return mapa;
  });

  let fila = 6;
  let seccionActual: string | null = null;
  const totales = new Array(2 + hitos.length * 2).fill(0) as number[];
  for (const f of filas) {
    if (f.seccion !== seccionActual) {
      seccionActual = f.seccion;
      const r = hoja.getRow(fila++);
      r.getCell(2).value = f.seccion;
      for (let c = 1; c <= ultimaColumna; c++) {
        const celda = r.getCell(c);
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMARILLO } };
        celda.font = { bold: true };
        celda.border = BORDE;
      }
    }
    const r = hoja.getRow(fila++);
    r.getCell(1).value = f.codigo;
    r.getCell(2).value = f.elemento;
    let totalSF = 0;
    let totalCF = 0;
    hitos.forEach((_, i) => {
      const linea = porHito[i].get(f.clave);
      const sf = linea?.cantidadFisicaPeriodo ?? 0;
      const cf = linea?.cantidadPeriodo ?? 0;
      totalSF += sf;
      totalCF += cf;
      r.getCell(5 + i * 2).value = sf;
      r.getCell(6 + i * 2).value = cf;
      totales[2 + i * 2] += sf;
      totales[3 + i * 2] += cf;
    });
    r.getCell(3).value = Math.round(totalSF * 100) / 100;
    r.getCell(4).value = Math.round(totalCF * 100) / 100;
    totales[0] += totalSF;
    totales[1] += totalCF;
    for (let c = 1; c <= ultimaColumna; c++) {
      const celda = r.getCell(c);
      celda.border = BORDE;
      if (c >= 3) {
        celda.numFmt = NUMERO;
        celda.alignment = { horizontal: "center" };
      }
      if (c >= 5) {
        const color = (c - 5) % 2 === 0 ? VERDE : DURAZNO;
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
      }
    }
  }

  const total = hoja.getRow(fila);
  total.getCell(2).value = "TOTAL";
  total.getCell(2).alignment = { horizontal: "right" };
  totales.forEach((valor, i) => {
    total.getCell(3 + i).value = Math.round(valor * 100) / 100;
  });
  for (let c = 1; c <= ultimaColumna; c++) {
    const celda = total.getCell(c);
    celda.font = { bold: true };
    celda.border = BORDE;
    if (c >= 3) {
      celda.numFmt = NUMERO;
      celda.alignment = { horizontal: "center" };
    }
  }

  hoja.views = [{ state: "frozen", xSplit: 4, ySplit: 5 }];
}

/** Excel de avance semanal con los estados de avance elegidos, en orden cronológico. */
export async function construirExcelAvanceSemanal(
  obraNombre: string,
  items: HitoObraItemizadoItem[],
  hitosElegidos: HitoObra[],
  opciones: { incluirSinEjecucion?: boolean; logo?: ArrayBuffer | null } = {},
): Promise<{ buffer: ArrayBuffer; nombre: string }> {
  const { incluirSinEjecucion = false, logo } = opciones;
  const logoBeck = logo === undefined ? await cargarLogoBeck() : logo;
  const hitos = [...hitosElegidos].sort((a, b) =>
    (a.fechaDesde ?? "").localeCompare(b.fechaDesde ?? "")
  );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BECK CRM";

  // Una hoja por tipo con ejecución en las semanas elegidas (Sellos si no hay ninguno).
  const tiposConDatos = new Set(
    hitos.flatMap((h) => h.lineas.filter((l) => l.cantidadPeriodo !== 0).map((l) => l.tipoRegistro))
  );
  const tipos = [
    ...TIPOS_ESTADO_AVANCE.map((t) => t.value).filter(
      (t) => tiposConDatos.has(t) || (t === "sello_cortafuego" && tiposConDatos.size === 0)
    ),
    ...[...tiposConDatos].filter((t) => !TIPOS_ESTADO_AVANCE.some((c) => c.value === t)),
  ];
  for (const tipo of tipos) {
    agregarHoja(workbook, tipo, obraNombre, hitos, filasDelTipo(items, hitos, tipo, incluirSinEjecucion), logoBeck);
  }

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  const desde = fechaCorta(hitos[0]?.fechaDesde ?? null);
  const hasta = fechaCorta(hitos[hitos.length - 1]?.fechaHasta ?? null);
  const nombre = `Avance semanal - ${obraNombre} - ${desde} al ${hasta}.xlsx`.replace(/[\\/:*?"<>|]+/g, "-");
  return { buffer, nombre };
}
