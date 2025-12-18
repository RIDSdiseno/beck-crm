import type { Usuario } from "../types/usuario";

export const mockUsuarios: Usuario[] = [
  {
    id: "u_admin_demo",
    nombre: "Admin Demo",
    email: "admin@beck.cl",
    rol: "Administrador",
    activo: true,
    creadoEn: "2025-01-01T09:00:00.000Z",
  },
  {
    id: "u_terreno_demo",
    nombre: "Terreno Demo",
    email: "terreno@beck.cl",
    rol: "Terreno",
    activo: true,
    creadoEn: "2025-01-02T09:00:00.000Z",
  },
  {
    id: "u_visualizador_demo",
    nombre: "Visualizador Demo",
    email: "visualizador@beck.cl",
    rol: "Visualizador",
    activo: true,
    creadoEn: "2025-01-02T09:00:00.000Z",
  },

];

