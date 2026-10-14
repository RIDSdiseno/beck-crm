import { useEffect, useRef, useState } from 'react';
import { Button, Progress, notification, message } from 'antd';
import api from '../services/api';

interface Informe {
  id: string; titulo: string; estado: 'en_cola' | 'generando' | 'listo' | 'error';
  progreso: number; vence: string | null; error?: string;
}

/** Montado en el layout para continuar mostrando progreso al cambiar de módulo. */
export default function InformesIngenieriaTemporales() {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [errorConexion, setErrorConexion] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [avisos, contexto] = notification.useNotification();
  const anteriores = useRef(new Map<string, string>());
  useEffect(() => {
    let activo = true;
    let consultando = false;
    let autorizado = true;
    let proximaConsulta = 0;
    const consultar = async () => {
      if (consultando || !autorizado || Date.now() < proximaConsulta) return;
      consultando = true;
      try {
        const { data } = await api.get<Informe[]>('/registros/informe-ingenieria');
        if (!activo) return;
        setInformes(data);
        setErrorConexion(false);
        proximaConsulta = Date.now() + (data.some(i => ['en_cola', 'generando'].includes(i.estado)) ? 5000 : 30000);
        for (const informe of data) {
          if (anteriores.current.get(informe.id) !== informe.estado) {
            if (informe.estado === 'listo') avisos.success({ message: 'Informe PDF listo',
              description: 'Puedes descargarlo desde Informes PDF durante una hora.', duration: 8 });
            if (informe.estado === 'error') avisos.error({ message: 'No se pudo generar el informe', description: informe.error });
          }
        }
        anteriores.current = new Map(data.map(i => [i.id, i.estado]));
      } catch (error) {
        if (!activo) return;
        setErrorConexion(true);
        proximaConsulta = Date.now() + 15000;
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401 || status === 403) { autorizado = false; setInformes([]); }
      }
      finally { consultando = false; }
    };
    const actualizar = () => { proximaConsulta = 0; setAbierto(true); void consultar(); };
    void consultar();
    const timer = window.setInterval(() => void consultar(), 5000);
    window.addEventListener('informe-ingenieria-creado', actualizar);
    return () => { activo = false; window.clearInterval(timer); window.removeEventListener('informe-ingenieria-creado', actualizar); };
  }, [avisos]);

  const descargar = async (informe: Informe) => {
    setDescargando(informe.id);
    try {
      const { data } = await api.get<Blob>(`/registros/informe-ingenieria/${informe.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a'); a.href = url; a.download = 'informe-ingenieria-beck.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { message.error('No se pudo descargar. Si el informe expiró o el servidor se reinició, genera uno nuevo.'); }
    finally { setDescargando(null); }
  };
  if (!informes.length) return contexto;
  const pendientes = informes.filter(i => ['en_cola', 'generando'].includes(i.estado)).length;
  return <>{contexto}<aside className="fixed top-5 left-1/2 z-40 w-80 max-w-[calc(100vw-40px)] -translate-x-1/2 rounded-xl border border-amber-300 bg-white p-3 shadow-lg" aria-label="Informes PDF temporales">
    <Button block onClick={() => setAbierto(v => !v)} aria-expanded={abierto}>
      Informes PDF · {pendientes ? `${pendientes} en preparación` : `${informes.length} ${informes.length === 1 ? 'reciente' : 'recientes'}`} {abierto ? '▴' : '▾'}
    </Button>
    {abierto && <div className="mt-3 max-h-[min(20rem,calc(100dvh-120px))] space-y-3 overflow-y-auto">
      {errorConexion && <p className="text-xs text-amber-700">No se pudo actualizar el estado. Reintentando conexión…</p>}
      {[...informes].reverse().map(informe => <div key={informe.id} className="rounded-lg border border-slate-200 p-2">
        <p className="break-words text-sm font-semibold">{informe.titulo}</p>
        {['en_cola', 'generando'].includes(informe.estado) && <><span className="text-xs">{informe.estado === 'en_cola' ? 'En cola' : 'Generando PDF'}</span><Progress percent={informe.progreso} size="small" /></>}
        {informe.estado === 'error' && <p className="text-xs text-red-700">{informe.error}</p>}
        {informe.estado === 'listo' && <>
          <p className="my-2 text-xs text-slate-500">Disponible hasta {new Date(informe.vence!).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
          <Button size="small" onClick={() => void descargar(informe)} loading={descargando === informe.id}>Descargar PDF</Button>
        </>}
      </div>)}
    </div>}
  </aside></>;
}
