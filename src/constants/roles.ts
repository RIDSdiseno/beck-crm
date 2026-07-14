import type { UsuarioApiRol } from "../services/api";

export const TIPOS_REGISTRO_TERRENO: Array<{ value: string; label: string }> = [
  { value: "sello_cortafuego", label: "Sello cortafuego" },
  { value: "tabiqueria", label: "Tabiquería" },
  { value: "junta_lineal_espuma", label: "Junta lineal espuma" },
  { value: "otros", label: "Otros" },
];

const TIPO_REGISTRO_LABELS: Record<string, string> = {
  sello_cortafuego: "Sello cortafuego",
  tabiqueria: "Tabiquería",
  junta_lineal_espuma: "Junta lineal espuma",
  otros: "Otros",
};

export const getTipoRegistroLabel = (tipo?: string | null): string =>
  (tipo && TIPO_REGISTRO_LABELS[tipo]) || TIPO_REGISTRO_LABELS.sello_cortafuego;

const TIPO_REGISTRO_COLORS: Record<string, string> = {
  sello_cortafuego: "gold",
  tabiqueria: "purple",
  junta_lineal_espuma: "blue",
  otros: "default",
};

export const getTipoRegistroColor = (tipo?: string | null): string =>
  (tipo && TIPO_REGISTRO_COLORS[tipo]) || TIPO_REGISTRO_COLORS.sello_cortafuego;

const TIPO_REGISTRO_BADGE_CLASSES: Record<string, string> = {
  sello_cortafuego: "border border-amber-200 bg-amber-50 text-amber-700",
  tabiqueria: "border border-purple-200 bg-purple-50 text-purple-700",
  junta_lineal_espuma: "border border-blue-200 bg-blue-50 text-blue-700",
  otros: "border border-slate-200 bg-slate-50 text-slate-700",
};

export const getTipoRegistroBadgeClass = (tipo?: string | null): string =>
  (tipo && TIPO_REGISTRO_BADGE_CLASSES[tipo]) || TIPO_REGISTRO_BADGE_CLASSES.sello_cortafuego;

// Etiqueta del campo de cantidad según el tipo de registro (mismo campo cantidadSellos en backend,
// salvo junta_lineal_espuma que usa metrosLineales).
export const getCantidadLabelPorTipo = (tipo?: string | null): string => {
  if (tipo === "junta_lineal_espuma") return "Metros lineales";
  if (tipo === "tabiqueria") return "Cantidad";
  if (tipo === "otros") return "Cantidad";
  return "Cantidad de sellos";
};

export const ROLES_BECK: Array<{ value: UsuarioApiRol; label: string }> = [
  { value: "administrador", label: "Administrador" },
  { value: "vendedor", label: "Vendedor" },
  { value: "terreno", label: "Terreno" },
  { value: "ingenieria", label: "Ingeniería" },
  { value: "visualizador", label: "Visualizador" },
  { value: "jefeobra", label: "Jefe de obra" },
  { value: "cliente", label: "Cliente" },
];

export const ROLES_FIREMAT: Array<{ value: UsuarioApiRol; label: string }> = [
  { value: "vendedor_firemat", label: "Vendedor Firemat" },
  { value: "bodeguero", label: "Bodeguero" },
  { value: "visualizador_firemat", label: "Visualizador Firemat" },
];

export const ROLES_ALL = [...ROLES_BECK, ...ROLES_FIREMAT];
