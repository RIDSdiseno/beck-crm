import type ExcelJS from "exceljs";

// Logo de Beck para los Excel exportados (el mismo de public/logo.png que usan los PDF).
// Si no se puede cargar, el Excel se genera igual, sin logo.
export async function cargarLogoBeck(): Promise<ArrayBuffer | null> {
  try {
    const respuesta = await fetch("/logo.png");
    return respuesta.ok ? await respuesta.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Pone el logo (cuadrado) en la esquina superior izquierda de la hoja. */
export function insertarLogo(
  workbook: ExcelJS.Workbook,
  hoja: ExcelJS.Worksheet,
  logo: ArrayBuffer | null,
  ladoPx: number,
): void {
  if (!logo) return;
  const imagen = workbook.addImage({ buffer: logo, extension: "png" });
  hoja.addImage(imagen, { tl: { col: 0.08, row: 0.1 }, ext: { width: ladoPx, height: ladoPx } });
}
