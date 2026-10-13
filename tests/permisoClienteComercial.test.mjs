import test from "node:test";
import assert from "node:assert/strict";
import { puedeSeleccionarClienteComercial } from "../src/utils/permisoClienteComercial.ts";

for (const modo of ["crear", "editar", "ver"]) {
  for (const editaModulo of [false, true]) {
    for (const cambiaEmpresa of [false, true]) {
      test(`${modo}: edita módulo=${editaModulo}, cambia empresa=${cambiaEmpresa}`, () => {
        const esperado = modo === "crear" ? editaModulo : modo === "editar" ? editaModulo && cambiaEmpresa : false;
        assert.equal(puedeSeleccionarClienteComercial(modo, editaModulo, cambiaEmpresa), esperado);
      });
    }
  }
}
