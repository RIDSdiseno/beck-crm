import { api } from './api';

export type PdfFirmado = {
  id: string;
  codigoRegistro: string;
  codigoBeck: string | null;
  numeroSello: string | null;
  validadoClienteAt: string | null;
  firmante: string;
  nombreHistorico: boolean;
  obra: { id: string; nombre: string; codigo: string | null };
  validadoClientePor: { id: string; nombre: string; email: string } | null;
};
export type FiltrosPdf = {
  obras: PdfFirmado['obra'][];
  firmantes: NonNullable<PdfFirmado['validadoClientePor']>[];
};
export type PaginaPdf = { items: PdfFirmado[]; total: number; page: number; limit: number };
export const pdfsFirmadosAPI = {
  listar: async (params: { page: number; limit: number; search?: string; obraId?: string; firmanteId?: string; desde?: string; hasta?: string }, signal: AbortSignal) => {
    const response = await api.get<{ data: PaginaPdf }>('/pdfs-firmados', { params, signal });
    return response.data.data;
  },
  filtros: async (signal: AbortSignal) => {
    const response = await api.get<{ data: FiltrosPdf }>('/pdfs-firmados/filtros', { signal });
    return response.data.data;
  },
  archivo: async (id: string, download: boolean, signal: AbortSignal) => {
    const response = await api.get<Blob>(`/pdfs-firmados/${encodeURIComponent(id)}/archivo`, {
      params: { download }, responseType: 'blob', signal,
    });
    return response.data;
  },
};
