import type { UsuarioApiRol } from "../services/api";

export const TIPOS_REGISTRO_TERRENO: Array<{ value: string; label: string }> = [
  { value: "sello_cortafuego", label: "Sello cortafuego" },
  { value: "tabiqueria", label: "Tabiquería" },
  { value: "junta_lineal_espuma", label: "Junta lineal espuma" },
];

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
