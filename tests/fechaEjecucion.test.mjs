import assert from "node:assert/strict";
import { test } from "node:test";
import { formatFechaEjecucion } from "../src/utils/fechaEjecucion.ts";

test("Conserva el día de ejecución sin agregar una hora", () => {
  assert.equal(formatFechaEjecucion("2026-10-13T00:00:00.000Z"), "13-10-2026");
  assert.equal(formatFechaEjecucion("2026-10-08"), "08-10-2026");
  assert.equal(formatFechaEjecucion("2026-07-01T00:00:00.000Z"), "01-07-2026");
});

test("No inventa fechas para datos ausentes o inválidos", () => {
  for (const value of [null, undefined, "", "inválida", "2026-02-30", "2026-13-01"]) {
    assert.equal(formatFechaEjecucion(value), "-");
  }
  assert.equal(formatFechaEjecucion("2028-02-29"), "29-02-2028");
});
