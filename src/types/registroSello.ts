<<<<<<< HEAD
export type RegistroSello = {
  id: number;
=======
export type EstadoRegistro =
  | "Pendiente"
  | "Ejecutado"
  | "Observado"
  | "Reparado";

export type RegistroSello = {
  id: number;
  // relaciones CRM
  obraId?: string;
  contratoId?: string;
  frenteTrabajo?: string;
  estado?: EstadoRegistro;

>>>>>>> 68e4f8a (push 1)
  itemizadoBeck: string;
  itemizadoSacyr: string;
  fechaEjecucion: string; // ISO
  dia: string;
  piso: string;
  ejeAlfabetico: string;
  ejeNumerico: string;
  nombreSellador: string;
  fotoUrl?: string;
  recinto: string;
  numeroSello: string;
  cantidadSellos: number;
  holguraCm: number;
  factorHolgura: 1 | 1.2 | 1.4 | 1.8;
  cieloModular: 1 | 2 | 3;
  cantidadSellosConFactor: number;
  observaciones?: string;
};
