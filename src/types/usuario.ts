export type RolUsuario =
  | "Administrador"
  | "Terreno"
  | "JefeObra"
  | "Ingenieria"
  | "Visualizador"
  | "Vendedor";

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string; // ISO
};

