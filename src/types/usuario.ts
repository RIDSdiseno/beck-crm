export type RolUsuario = "Administrador" | "Terreno" | "Ingenieria" | "Visualizador";

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string; // ISO
};

