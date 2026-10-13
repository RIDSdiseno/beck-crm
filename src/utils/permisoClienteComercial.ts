// Elegir el cliente inicial no equivale a cambiar el cliente de un documento existente.
export function puedeSeleccionarClienteComercial(
  modo: "crear" | "editar" | "ver",
  puedeEditarModulo: boolean,
  puedeCambiarEmpresa: boolean,
): boolean {
  return puedeEditarModulo && (modo === "crear" || (modo === "editar" && puedeCambiarEmpresa));
}
