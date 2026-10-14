import type { ModuloBeck } from "../services/api";

export const ACCESOS_PLATAFORMA: Array<{ key: ModuloBeck; label: string }> = [
  { key: "beck_acceder_plataforma", label: "Acceder a Beck" },
  { key: "firemat_acceder_plataforma", label: "Acceder a Firemat" },
  { key: "trager_acceder_plataforma", label: "Acceder a Trager" },
];

export const MODULOS_TRAGER: Array<{ key: ModuloBeck; label: string }> = [
  { key: "trager_dashboard", label: "Trager · Dashboard" },
  { key: "trager_funnel", label: "Trager · Funnel" },
  { key: "trager_clientes", label: "Trager · Clientes" },
  { key: "trager_cotizaciones", label: "Trager · Cotizaciones" },
  { key: "trager_productos", label: "Trager · Productos" },
  { key: "trager_categorias", label: "Trager · Categorías" },
  { key: "trager_inventario", label: "Trager · Inventario" },
  { key: "trager_movimientos", label: "Trager · Movimientos" },
  { key: "trager_cambiar_empresa", label: "Trager · Cambiar cliente de un documento existente" },
];

export const TRAGER_NAV_MODULO: Record<string, ModuloBeck> = {
  dashboard: "trager_dashboard", funnel: "trager_funnel",
  clientes: "trager_clientes", cotizaciones: "trager_cotizaciones",
  productos: "trager_productos", categorias: "trager_categorias",
  inventario: "trager_inventario", movimientos: "trager_movimientos",
};
