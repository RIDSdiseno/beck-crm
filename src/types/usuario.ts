export type RolUsuario =
  | "Administrador"
  | "Terreno"
  | "JefeObra"
  | "Ingenieria"
  | "Visualizador"
  | "Vendedor"
  | "VendedorFiremat"
  | "Bodeguero"
  | "VisualizadorFiremat"
  | "Cliente"
  | "VendedorTrager"
  | "BodegueroTrager"
  | "VisualizadorTrager";

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string; // ISO
};

