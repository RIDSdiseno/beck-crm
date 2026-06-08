import { useCallback, useEffect, useState } from "react";
import { notification } from "antd";
import { alertasAPI, type AlertaBeck } from "../services/api";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const NOTIFICATION_KEY = "alertas-beck-session";

// Runtime-only memory: lives in the JS module, wiped on page reload / F5.
// Survives React navigation (module is not re-evaluated on route changes).
const notifiedInSession = new Set<string>();

interface AlertasState {
  nuevas: AlertaBeck[];
  vistas: AlertaBeck[];
  total: number;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: AlertasState = {
  nuevas: [],
  vistas: [],
  total: 0,
  loading: false,
  error: null,
};

export const useAlertasBeck = () => {
  const [state, setState] = useState<AlertasState>(INITIAL_STATE);

  const fetchAlertas = useCallback(async (showPopup: boolean) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await alertasAPI.getAlertasBeck();
      setState({
        nuevas: data.nuevas,
        vistas: data.vistas,
        total: data.total,
        loading: false,
        error: null,
      });

      if (showPopup && data.nuevas.length > 0) {
        const sinNotificar = data.nuevas.filter(
          (a) => !notifiedInSession.has(a.alertaKey)
        );

        if (sinNotificar.length > 0) {
          sinNotificar.forEach((a) => notifiedInSession.add(a.alertaKey));

          const n = sinNotificar.length;
          notification.warning({
            key: NOTIFICATION_KEY,
            message: `Tienes ${n} notificacion${n > 1 ? "es." : "."}`,
            placement: "topRight",
            duration: 6,
          });
        }
      }
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "No se pudo cargar alertas",
      }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!cancelled) await fetchAlertas(true);
    })();

    const interval = window.setInterval(() => void fetchAlertas(true), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [fetchAlertas]);

  const recargar = useCallback(() => fetchAlertas(false), [fetchAlertas]);

  const marcarVista = useCallback(
    async (alertaKeys: string[]) => {
      const keySet = new Set(alertaKeys);
      setState((prev) => {
        const moving = prev.nuevas.filter((a) => keySet.has(a.alertaKey));
        const remaining = prev.nuevas.filter((a) => !keySet.has(a.alertaKey));
        return {
          ...prev,
          nuevas: remaining,
          vistas: [...moving, ...prev.vistas],
          total: remaining.length,
        };
      });
      try {
        await alertasAPI.marcarVista(alertaKeys);
      } catch {
        await fetchAlertas(false);
      }
    },
    [fetchAlertas]
  );

  const marcarTodasVistas = useCallback(async () => {
    const keys = state.nuevas.map((a) => a.alertaKey);
    if (keys.length === 0) return;
    await marcarVista(keys);
  }, [state.nuevas, marcarVista]);

  return { ...state, recargar, marcarVista, marcarTodasVistas };
};
