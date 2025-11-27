export type RegistroSello = {
  id: number;
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
