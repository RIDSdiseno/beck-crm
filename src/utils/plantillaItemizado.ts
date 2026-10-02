import ExcelJS from "exceljs";

// El formato debe calzar con el importador de back_beck_crm
// (itemizadoOpciones.controller.ts → importarItemizadoOpciones):
//  - lee SOLO la hoja con este nombre exacto,
//  - busca los encabezados en la fila 13 (sin distinguir mayúsculas ni tildes),
//  - toma los datos desde la fila 14.
// Las filas 1 a 12 las ignora, por eso se usan para las instrucciones.
export const HOJA_ITEMIZADO = "Cálculo Material por Pasada";
const FILA_ENCABEZADOS = 13;
const FILA_INICIO_DATOS = 14;
const FILAS_PREPARADAS = 500;

type Columna = { encabezado: string; ancho: number; sugerencias?: keyof SugerenciasItemizado };

const COLUMNAS: Columna[] = [
  { encabezado: "Código", ancho: 14 },
  { encabezado: "Tipo", ancho: 20, sugerencias: "tipo" },
  { encabezado: "Elemento pasante", ancho: 46 },
  { encabezado: "Elemento penetrado", ancho: 24, sugerencias: "elementoPenetra" },
  { encabezado: "Materialidad", ancho: 20, sugerencias: "materialidad" },
];

const EJEMPLOS: string[][] = [
  ["1-140", "Metálica", "Tubería metálica de Ø ≤ 50 mm", "Losa", "Hormigón"],
  ["1-141", "Metálica", "Tubería metálica de Ø ≤ 110 mm", "Losa", "Hormigón"],
  ["1-143", "Metálica", "Tubería metálica de Ø ≤ 160 mm", "Losa", "Hormigón"],
];

const INSTRUCCIONES = [
  "Cómo completar esta plantilla:",
  "1. Escribe una opción por fila desde la fila 14. No cambies los encabezados de la fila 13 ni el nombre de esta hoja.",
  "2. Una fila se importa si tiene al menos una columna con datos. Las filas vacías se ignoran.",
  "3. Si una fila es idéntica en las 5 columnas a una opción que ya existe, se omite como duplicada: no se modifica nada.",
  "4. Mayúsculas, tildes y espacios cuentan («Metálica» y «Metalica» serían opciones distintas). Usa la lista de cada celda.",
  "5. Las opciones importadas quedan ocultas en todas las obras. Actívalas desde «Opciones de itemizado» de cada obra.",
  "6. Los rendimientos (sellos/día, reparación/día) no se cargan desde este archivo: se configuran en cada obra.",
  "7. Al importar, NO marques «Reemplazar catálogo existente»: borra todo el catálogo y la configuración de itemizado de todas las obras.",
  "Revisa la hoja «Ejemplo» para ver una plantilla completada.",
];

export type SugerenciasItemizado = {
  tipo: string[];
  elementoPenetra: string[];
  materialidad: string[];
};

const AMARILLO = "FFFACC15";
const AZUL_OSCURO = "FF0F172A";
const BORDE_ENCABEZADO = "FFD97706";
const BORDE_CELDA = "FFE5E7EB";

const borde = (argb: string): Partial<ExcelJS.Borders> => ({
  top: { style: "thin", color: { argb } },
  left: { style: "thin", color: { argb } },
  bottom: { style: "thin", color: { argb } },
  right: { style: "thin", color: { argb } },
});

function prepararEncabezados(ws: ExcelJS.Worksheet, fila: number) {
  COLUMNAS.forEach((columna, i) => {
    ws.getColumn(i + 1).width = columna.ancho;
    const celda = ws.getCell(fila, i + 1);
    celda.value = columna.encabezado;
    celda.font = { bold: true, color: { argb: AZUL_OSCURO } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMARILLO } };
    celda.alignment = { horizontal: "center", vertical: "middle" };
    celda.border = borde(BORDE_ENCABEZADO);
  });
  ws.getRow(fila).height = 22;
}

// El código va como texto: si no, Excel convierte valores como «1-12» en una fecha.
function prepararFilaDatos(ws: ExcelJS.Worksheet, fila: number) {
  COLUMNAS.forEach((_, i) => {
    const celda = ws.getCell(fila, i + 1);
    celda.border = borde(BORDE_CELDA);
    if (i === 0) celda.numFmt = "@";
  });
}

function limpiarSugerencias(valores: string[]) {
  return [...new Set(valores.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export async function construirPlantillaItemizado(
  sugerencias?: SugerenciasItemizado,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Beck CRM";
  workbook.created = new Date();

  // ── Hoja principal: la única que lee el importador ──
  const ws = workbook.addWorksheet(HOJA_ITEMIZADO, {
    views: [{ state: "frozen", ySplit: FILA_ENCABEZADOS }],
  });

  ws.mergeCells(1, 1, 1, COLUMNAS.length);
  const titulo = ws.getCell(1, 1);
  titulo.value = "Plantilla de importación — Itemizado BECK";
  titulo.font = { bold: true, size: 14, color: { argb: AZUL_OSCURO } };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMARILLO } };
  titulo.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  INSTRUCCIONES.forEach((texto, i) => {
    const fila = 3 + i;
    ws.mergeCells(fila, 1, fila, COLUMNAS.length);
    const celda = ws.getCell(fila, 1);
    celda.value = texto;
    celda.alignment = { wrapText: true, vertical: "middle" };
    celda.font = {
      bold: i === 0,
      color: { argb: i === 7 ? "FFB91C1C" : AZUL_OSCURO },
    };
    ws.getRow(fila).height = i === 0 ? 18 : 30;
  });

  prepararEncabezados(ws, FILA_ENCABEZADOS);
  for (let fila = FILA_INICIO_DATOS; fila < FILA_INICIO_DATOS + FILAS_PREPARADAS; fila++) {
    prepararFilaDatos(ws, fila);
  }

  // ── Listas de sugerencias, en una hoja oculta (el importador no la lee) ──
  const listas = sugerencias && {
    tipo: limpiarSugerencias(sugerencias.tipo),
    elementoPenetra: limpiarSugerencias(sugerencias.elementoPenetra),
    materialidad: limpiarSugerencias(sugerencias.materialidad),
  };
  if (listas) {
    const hojaListas = workbook.addWorksheet("Listas", { state: "veryHidden" });
    COLUMNAS.forEach((columna, i) => {
      const valores = columna.sugerencias ? listas[columna.sugerencias] : [];
      if (!columna.sugerencias || valores.length === 0) return;
      const letra = String.fromCharCode(65 + i);
      valores.forEach((valor, j) => {
        hojaListas.getCell(j + 1, i + 1).value = valor;
      });
      const rango = `Listas!$${letra}$1:$${letra}$${valores.length}`;
      for (let fila = FILA_INICIO_DATOS; fila < FILA_INICIO_DATOS + FILAS_PREPARADAS; fila++) {
        // Solo sugiere: no bloquea un valor nuevo que no esté en la lista.
        ws.getCell(fila, i + 1).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [rango],
          showErrorMessage: false,
        };
      }
    });
  }

  // ── Hoja de ejemplo: no se importa ──
  const ejemplo = workbook.addWorksheet("Ejemplo");
  prepararEncabezados(ejemplo, 1);
  EJEMPLOS.forEach((valores, i) => {
    prepararFilaDatos(ejemplo, 2 + i);
    valores.forEach((valor, j) => {
      ejemplo.getCell(2 + i, j + 1).value = valor;
    });
  });

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
