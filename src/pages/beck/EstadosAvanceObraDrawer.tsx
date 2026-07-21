import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import dayjs, { Dayjs } from "dayjs";
import {
  Alert,
  Button,
  Collapse,
  DatePicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Segmented,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  hitosObraAPI,
  indicadoresAPI,
  type HitoObra,
  type HitoObraItemizadoItem,
} from "../../services/api";
import {
  aNumeroOrNull,
  convertirTotalesAMoneda,
  formatearMonto,
  formatearNumero,
  sumarTotales,
  type MonedaSoportada,
} from "../../utils/conversionMoneda";
import { obtenerValorFila } from "../../utils/valorizacionHito";
import ResumenEconomicoDrawer from "./ResumenEconomicoDrawer";

const MONEDAS_RESUMEN: MonedaSoportada[] = ["CLP", "USD", "UF"];

type Props = {
  open: boolean;
  onClose: () => void;
  obraId?: string;
  obraNombre?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const apiError = data as { error?: unknown; message?: unknown };
      if (typeof apiError.error === "string" && apiError.error.trim())
        return apiError.error;
      if (typeof apiError.message === "string" && apiError.message.trim())
        return apiError.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const formatCantidadEjecutada = (value: number | string | null | undefined): string => {
  const n = aNumeroOrNull(value) ?? 0;
  return n.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Cada hito representa un período (Estado de Pago), no solo un nombre.
const formatFechaCorta = (value: string | null | undefined): string => {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : "—";
};

// Sugerencia de "Fecha desde" para el próximo hito: el día siguiente al
// "Fecha hasta" del hito más reciente (el de fechaHasta mayor). El usuario
// puede modificarla libremente; el backend valida orden y superposición de
// todas formas, así que esto es puramente una comodidad de UX.
const sugerirFechaDesde = (todosHitos: HitoObra[]): Dayjs | null => {
  const conFecha = todosHitos.filter((h) => h.fechaHasta);
  if (conFecha.length === 0) return null;
  const ultimo = conFecha.reduce((max, h) =>
    dayjs(h.fechaHasta).isAfter(dayjs(max.fechaHasta)) ? h : max
  );
  return dayjs(ultimo.fechaHasta).add(1, "day");
};

// Saldo pendiente de un itemizado para precargar un hito nuevo (sin
// cantidades guardadas):
//
//   saldoPendiente = hitoAnterior.cantidades[itemId]
//                   - hitoAnterior.cantidadesEjecutadas[itemId]
//
// "hitoAnterior" es el hito inmediatamente anterior por `orden` (no "el
// primer hito de la obra": con 3+ hitos, cada uno hereda el saldo del que
// lo precede, de forma acumulativa/encadenada). La ejecución se lee de
// hitoAnterior.cantidadesEjecutadas (YA filtrada por el período de ESE
// hito, calculada en el backend) — nunca de item.cantidadEjecutada, que
// quedó como el acumulado GLOBAL de toda la obra y ya no representa lo
// ejecutado en un período específico.
// Recibe `todosHitos` explícito (no lee el estado del componente) para que
// tanto la carga inicial (con los datos recién llegados de la API) como los
// renders posteriores usen siempre datos consistentes, nunca un cierre
// obsoleto.
const calcularSaldoPendiente = (
  todosHitos: HitoObra[],
  hito: HitoObra,
  item: HitoObraItemizadoItem
): number | null => {
  const anteriores = todosHitos.filter((h) => h.orden < hito.orden);
  if (anteriores.length === 0) return null; // no hay hito anterior: nada que heredar
  const hitoAnterior = anteriores.reduce((max, h) => (h.orden > max.orden ? h : max), anteriores[0]);
  const cantidadAnterior = aNumeroOrNull(hitoAnterior.cantidades[item.itemizadoOpcionId]);
  if (cantidadAnterior === null) return null; // el hito anterior no definió cantidad para este itemizado
  const ejecutadoPeriodoAnterior = hitoAnterior.cantidadesEjecutadas[item.itemizadoOpcionId] ?? 0;
  return Math.max(0, cantidadAnterior - ejecutadoPeriodoAnterior);
};

// Única fuente de verdad del estado editable de un hito: se construye UNA
// vez (al cargar, o al entrar en "Editar hito") con una entrada por cada
// itemizado visible en la tabla — nunca solo con las filas que el usuario
// llegue a tocar. Así "Guardar cantidades"/"Guardar cambios" siempre
// recorren exactamente lo que la tabla muestra, en vez de filtrar por
// claves modificadas.
const construirCantidadesIniciales = (
  todosHitos: HitoObra[],
  todosItems: HitoObraItemizadoItem[],
  hito: HitoObra
): Record<string, number | null> => {
  const resultado: Record<string, number | null> = {};
  for (const item of todosItems) {
    resultado[item.itemizadoOpcionId] = hito.tieneCantidadesGuardadas
      ? aNumeroOrNull(hito.cantidades[item.itemizadoOpcionId])
      : calcularSaldoPendiente(todosHitos, hito, item);
  }
  return resultado;
};

// Resumen del hito: reutiliza EXACTAMENTE los subtotales ya calculados por
// el backend (hito.subtotales, columna "Subtotal ejecutado del período") —
// no recalcula la ejecución ni el subtotal. "Ejecutado" = suma de esos
// subtotales por moneda. "Planificado" (valor total del hito) = Cantidad
// Hito × PU por fila, agrupado por moneda — es la valorización planificada,
// deliberadamente distinta de la ejecución real (mismo criterio ya usado al
// diseñar Resumen Económico: no mezclar ambas nociones).
const calcularTotalesHito = (
  hito: HitoObra,
  items: HitoObraItemizadoItem[]
): {
  ejecutadoPorMoneda: Record<MonedaSoportada, number>;
  planificadoPorMoneda: Record<MonedaSoportada, number>;
} => {
  const ejecutado = items.map((item) => ({
    valor: aNumeroOrNull(hito.subtotales[item.itemizadoOpcionId]),
    moneda: item.moneda,
  }));

  const planificado = items.map((item) => {
    const cantidadHito = aNumeroOrNull(hito.cantidades[item.itemizadoOpcionId]);
    const precioUnitario = aNumeroOrNull(item.precioUnitario);
    const valor =
      cantidadHito !== null && precioUnitario !== null ? cantidadHito * precioUnitario : null;
    return { valor, moneda: item.moneda };
  });

  return {
    ejecutadoPorMoneda: sumarTotales(ejecutado),
    planificadoPorMoneda: sumarTotales(planificado),
  };
};

type CantidadesDirty = Record<string, Record<string, number | null>>;

// "Cambios sin guardar" real: compara cada valor editable contra lo
// realmente persistido en hito.cantidades, no contra "¿existe la clave?".
// Para un hito nuevo, cualquier saldo sugerido (≠ null persistido) cuenta
// como pendiente de guardar — es dato real esperando persistirse. Para un
// hito ya guardado en edición, mientras el valor no se toque coincide con lo
// persistido y no debe marcarse como pendiente.
const hitoTieneCambiosPendientes = (
  hito: HitoObra,
  cantidadesEditadas: Record<string, number | null> | undefined
): boolean => {
  if (!cantidadesEditadas) return false;
  return Object.entries(cantidadesEditadas).some(
    ([itemizadoOpcionId, valor]) => valor !== aNumeroOrNull(hito.cantidades[itemizadoOpcionId])
  );
};

const EstadosAvanceObraDrawer: React.FC<Props> = ({
  open,
  onClose,
  obraId,
  obraNombre,
}) => {
  const [items, setItems] = useState<HitoObraItemizadoItem[]>([]);
  const [hitos, setHitos] = useState<HitoObra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoFechaDesde, setNuevoFechaDesde] = useState<Dayjs | null>(null);
  const [nuevoFechaHasta, setNuevoFechaHasta] = useState<Dayjs | null>(null);
  const [creando, setCreando] = useState(false);

  // Edición de los datos propios del hito (nombre + período). Distinto de
  // editandoCantidadesHitoId (esa es la edición de la tabla de cantidades).
  const [editandoHitoId, setEditandoHitoId] = useState<string | null>(null);
  const [nombreDraft, setNombreDraft] = useState("");
  const [fechaDesdeDraft, setFechaDesdeDraft] = useState<Dayjs | null>(null);
  const [fechaHastaDraft, setFechaHastaDraft] = useState<Dayjs | null>(null);
  const [accionHitoId, setAccionHitoId] = useState<string | null>(null);

  const [dirty, setDirty] = useState<CantidadesDirty>({});
  const [guardandoHitoId, setGuardandoHitoId] = useState<string | null>(null);
  const [editandoCantidadesHitoId, setEditandoCantidadesHitoId] = useState<string | null>(null);
  const [hitoResumen, setHitoResumen] = useState<HitoObra | null>(null);

  // Indicadores UF/USD para el footer "Resumen del Hito" (conversión de
  // Total ejecutado). Se cargan una sola vez al abrir el drawer, reutilizando
  // indicadoresAPI — misma fuente que usa Resumen Económico.
  const [ufIndicador, setUfIndicador] = useState<number | null>(null);
  const [dolarIndicador, setDolarIndicador] = useState<number | null>(null);
  // Moneda de visualización del footer, por hito (cada hito puede mostrar
  // una moneda distinta sin afectar a los demás).
  const [monedaPorHito, setMonedaPorHito] = useState<Record<string, MonedaSoportada>>({});

  const hasUnsavedChanges = useMemo(
    () => hitos.some((h) => hitoTieneCambiosPendientes(h, dirty[h.id])),
    [hitos, dirty]
  );

  const cargar = async () => {
    if (!obraId) return;
    setLoading(true);
    setError(null);
    setEditandoHitoId(null);
    setEditandoCantidadesHitoId(null);
    try {
      const data = await hitosObraAPI.listar(obraId);
      setItems(data.items);
      setHitos(data.hitos);
      // Sugerencia de período para el próximo hito: día siguiente al fin
      // del hito más reciente. Se recalcula cada vez que se recarga (por
      // ejemplo, justo después de crear un hito).
      setNuevoFechaDesde(sugerirFechaDesde(data.hitos));
      setNuevoFechaHasta(null);
      // Los hitos nuevos (sin cantidades guardadas) son siempre editables
      // desde que se cargan, sin pasar por "Editar hito": su estado
      // editable completo (con las cantidades sugeridas precargadas) debe
      // existir desde ya, para que "Guardar cantidades" envíe todas las
      // filas visibles y no solo las que el usuario tocó.
      const dirtyInicial: CantidadesDirty = {};
      for (const h of data.hitos) {
        if (!h.tieneCantidadesGuardadas) {
          dirtyInicial[h.id] = construirCantidadesIniciales(data.hitos, data.items, h);

          if (import.meta.env.DEV) {
            const anteriores = data.hitos.filter((x) => x.orden < h.orden);
            const hitoAnterior =
              anteriores.length > 0
                ? anteriores.reduce((max, x) => (x.orden > max.orden ? x : max), anteriores[0])
                : null;
            console.log(`[saldo pendiente] Hito "${h.nombre}" (orden ${h.orden})`);
            console.table(
              data.items.map((item) => {
                const cantidadAnterior = hitoAnterior
                  ? aNumeroOrNull(hitoAnterior.cantidades[item.itemizadoOpcionId])
                  : null;
                const ejecutadoPeriodoAnterior = hitoAnterior
                  ? hitoAnterior.cantidadesEjecutadas[item.itemizadoOpcionId] ?? 0
                  : 0;
                return {
                  itemizadoOpcionId: item.itemizadoOpcionId,
                  codigoBeck: item.codigoBeck,
                  cantidadAnterior,
                  ejecutadoPeriodoAnterior,
                  saldoCalculado: dirtyInicial[h.id][item.itemizadoOpcionId],
                };
              })
            );
            console.log(`[saldo pendiente] dirty["${h.id}"] =`, dirtyInicial[h.id]);
          }
        }
      }
      setDirty(dirtyInicial);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los estados de avance"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && obraId) {
      setNuevoNombre("");
      void cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, obraId]);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    (async () => {
      try {
        const [ufRes, dolarRes] = await Promise.all([
          indicadoresAPI.obtenerUf(),
          indicadoresAPI.obtenerDolar(),
        ]);
        if (cancelado) return;
        setUfIndicador(aNumeroOrNull(ufRes.data?.valor));
        setDolarIndicador(aNumeroOrNull(dolarRes.data?.valor));
      } catch {
        if (!cancelado) {
          setUfIndicador(null);
          setDolarIndicador(null);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [open]);

  const handleCrearHito = async () => {
    if (!obraId) return;
    // El período es obligatorio: cada hito representa un rango de fechas
    // real, no solo un nombre. El backend valida orden y superposición de
    // todas formas; esto solo evita un viaje de red con datos incompletos.
    if (!nuevoFechaDesde || !nuevoFechaHasta) {
      void message.error("Selecciona la fecha desde y la fecha hasta del período.");
      return;
    }
    if (nuevoFechaHasta.isBefore(nuevoFechaDesde, "day")) {
      void message.error("La fecha hasta no puede ser menor que la fecha desde.");
      return;
    }
    const nombre = nuevoNombre.trim() || `Hito ${hitos.length + 1}`;
    setCreando(true);
    try {
      await hitosObraAPI.crear(obraId, {
        nombre,
        fechaDesde: nuevoFechaDesde.format("YYYY-MM-DD"),
        fechaHasta: nuevoFechaHasta.format("YYYY-MM-DD"),
      });
      setNuevoNombre("");
      void message.success("Hito creado");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo crear el hito"));
    } finally {
      setCreando(false);
    }
  };

  // Entrar en modo edición de nombre + período. No permitido sobre un hito
  // terminado (el botón que dispara esto ya queda deshabilitado, pero se
  // valida igual aquí por si se llega a invocar de otra forma).
  const handleEditarHito = (hito: HitoObra) => {
    if (hito.terminado) return;
    setEditandoHitoId(hito.id);
    setNombreDraft(hito.nombre);
    setFechaDesdeDraft(hito.fechaDesde ? dayjs(hito.fechaDesde) : null);
    setFechaHastaDraft(hito.fechaHasta ? dayjs(hito.fechaHasta) : null);
  };

  const handleCancelarEdicionHito = () => {
    setEditandoHitoId(null);
  };

  const handleGuardarEdicionHito = async (hito: HitoObra) => {
    if (!obraId || hito.terminado) return;
    // El período es obligatorio (igual que al crear un hito): un hito
    // legado sin fechas debe completarlas antes de poder guardar.
    if (!fechaDesdeDraft || !fechaHastaDraft) {
      void message.error("Selecciona la fecha desde y la fecha hasta del período.");
      return;
    }
    if (fechaHastaDraft.isBefore(fechaDesdeDraft, "day")) {
      void message.error("La fecha hasta no puede ser menor que la fecha desde.");
      return;
    }

    const nombre = nombreDraft.trim();
    const payload: { nombre?: string; fechaDesde: string; fechaHasta: string } = {
      fechaDesde: fechaDesdeDraft.format("YYYY-MM-DD"),
      fechaHasta: fechaHastaDraft.format("YYYY-MM-DD"),
    };
    // Nombre opcional: si se deja vacío, no se envía y el nombre actual del
    // hito se conserva sin cambios (el backend solo toca lo que recibe).
    if (nombre) payload.nombre = nombre;

    setAccionHitoId(hito.id);
    try {
      await hitosObraAPI.actualizar(obraId, hito.id, payload);
      setEditandoHitoId(null);
      void message.success("Hito actualizado");
      // El período recién guardado cambia la ejecución/subtotal por hito
      // (calculados en el backend): se recarga para traer esos valores
      // recalculados, no solo el nombre/fechas.
      await cargar();
    } catch (err) {
      // El backend sigue validando superposición de períodos: ese error
      // (400) llega tal cual al usuario, sin capturarlo como éxito.
      void message.error(getErrorMessage(err, "No se pudo actualizar el hito"));
    } finally {
      setAccionHitoId(null);
    }
  };

  const handleMover = async (hito: HitoObra, direccion: -1 | 1) => {
    if (!obraId || hito.terminado) return;
    setAccionHitoId(hito.id);
    try {
      await hitosObraAPI.actualizar(obraId, hito.id, { orden: hito.orden + direccion });
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo reordenar el hito"));
    } finally {
      setAccionHitoId(null);
    }
  };

  const handleEliminar = async (hito: HitoObra) => {
    if (!obraId || hito.terminado) return;
    setAccionHitoId(hito.id);
    try {
      await hitosObraAPI.eliminar(obraId, hito.id);
      void message.success("Hito eliminado");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo eliminar el hito"));
    } finally {
      setAccionHitoId(null);
    }
  };

  // Bloqueo real: además de ocultar/deshabilitar botones, el backend rechaza
  // con 409 cualquier modificación sobre un hito terminado. Esta validación
  // de frontend evita el viaje de red inútil, no reemplaza a la del backend.
  const handleTerminarHito = async (hito: HitoObra) => {
    if (!obraId || hito.terminado) return;
    setAccionHitoId(hito.id);
    try {
      await hitosObraAPI.terminar(obraId, hito.id);
      void message.success("Hito terminado");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo terminar el hito"));
    } finally {
      setAccionHitoId(null);
    }
  };

  const updateCantidad = (
    hitoId: string,
    itemizadoOpcionId: string,
    value: number | null
  ) => {
    setDirty((prev) => ({
      ...prev,
      [hitoId]: { ...prev[hitoId], [itemizadoOpcionId]: value },
    }));
  };

  const handleGuardarCantidades = async (hito: HitoObra) => {
    if (!obraId || hito.terminado) return;
    const cantidadesEditadas = dirty[hito.id];
    if (!cantidadesEditadas || Object.keys(cantidadesEditadas).length === 0) {
      void message.info("No hay cambios de cantidades en este hito");
      return;
    }
    // El payload se construye recorriendo TODOS los itemizados visibles en
    // la tabla (items), no solo las claves que el usuario llegó a tocar:
    // el estado editable (dirty) ya viene completo desde que se activó la
    // edición (construirCantidadesIniciales), así que esto envía exactamente
    // lo que la tabla muestra. Comparación explícita con !== undefined:
    // 0 es una cantidad válida y no debe descartarse.
    const payload = items.map((item) => {
      const valor = cantidadesEditadas[item.itemizadoOpcionId];
      return {
        itemizadoOpcionId: item.itemizadoOpcionId,
        cantidadHito: valor !== undefined ? valor : null,
      };
    });

    if (import.meta.env.DEV) {
      console.table(payload);
    }

    setGuardandoHitoId(hito.id);
    try {
      await hitosObraAPI.guardarCantidades(obraId, hito.id, payload);
      setHitos((prev) =>
        prev.map((h) => {
          if (h.id !== hito.id) return h;
          const cantidades: Record<string, number | string | null> = {};
          for (const fila of payload) {
            if (fila.cantidadHito !== null && fila.cantidadHito !== undefined) {
              cantidades[fila.itemizadoOpcionId] = fila.cantidadHito;
            }
          }
          return { ...h, cantidades, tieneCantidadesGuardadas: Object.keys(cantidades).length > 0 };
        })
      );
      setDirty((prev) => {
        const next = { ...prev };
        delete next[hito.id];
        return next;
      });
      setEditandoCantidadesHitoId((prev) => (prev === hito.id ? null : prev));
      void message.success("Cantidades guardadas");
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudieron guardar las cantidades"));
    } finally {
      setGuardandoHitoId(null);
    }
  };

  const handleEditarCantidades = (hito: HitoObra) => {
    if (hito.terminado) return;
    const otroHitoId = editandoCantidadesHitoId;
    const otroHito = otroHitoId ? hitos.find((h) => h.id === otroHitoId) ?? null : null;
    const otroTieneCambios = !!otroHito && hitoTieneCambiosPendientes(otroHito, dirty[otroHito.id]);

    // Al entrar en edición, el estado editable se construye COMPLETO desde
    // los valores persistidos del hito (una entrada por cada itemizado
    // visible) — nunca queda vacío esperando a que el usuario toque algo.
    const iniciarEdicion = () => {
      setDirty((prev) => ({
        ...prev,
        [hito.id]: construirCantidadesIniciales(hitos, items, hito),
      }));
      setEditandoCantidadesHitoId(hito.id);
    };

    if (otroHito && otroHito.id !== hito.id && otroTieneCambios) {
      Modal.confirm({
        title: "Cambios sin guardar en otro hito",
        content:
          "Hay cantidades editadas sin guardar en otro hito. Si continúas, esos cambios se descartarán.",
        okText: "Descartar y continuar",
        okButtonProps: { danger: true },
        cancelText: "Volver",
        onOk: () => {
          setDirty((prev) => {
            const next = { ...prev };
            delete next[otroHito.id];
            return next;
          });
          iniciarEdicion();
        },
      });
      return;
    }
    iniciarEdicion();
  };

  const handleCancelarEdicionCantidades = (hito: HitoObra) => {
    setDirty((prev) => {
      if (!prev[hito.id]) return prev;
      const next = { ...prev };
      delete next[hito.id];
      return next;
    });
    setEditandoCantidadesHitoId(null);
  };

  const handleConfirmarGuardarCambios = (hito: HitoObra) => {
    if (hito.terminado) return;
    const cambios = dirty[hito.id];
    if (!cambios || Object.keys(cambios).length === 0) {
      void message.info("No hay cambios de cantidades en este hito");
      return;
    }
    Modal.confirm({
      title: "¿Guardar cambios del hito?",
      content: "Se modificarán las cantidades registradas para este hito.",
      okText: "Guardar cambios",
      cancelText: "Cancelar",
      onOk: () => handleGuardarCantidades(hito),
    });
  };

  const getCantidad = (hito: HitoObra, itemizadoOpcionId: string): number | null => {
    const editada = dirty[hito.id]?.[itemizadoOpcionId];
    if (editada !== undefined) return editada;
    return aNumeroOrNull(hito.cantidades[itemizadoOpcionId]);
  };

  const buildColumns = (
    hito: HitoObra,
    editable: boolean
  ): ColumnsType<HitoObraItemizadoItem> => [
    {
      title: "Código BECK",
      key: "codigoBeck",
      width: 110,
      render: (_: unknown, r) => r.codigoBeck || <span className="text-slate-400">—</span>,
    },
    {
      title: "Itemizado BECK",
      key: "itemizadoBeck",
      render: (_: unknown, r) => r.itemizadoBeck || <span className="text-slate-400">—</span>,
    },
    {
      title: "Itemizado Mandante",
      key: "itemizadoMandante",
      render: (_: unknown, r) =>
        r.itemizadoMandante || <span className="text-slate-400">—</span>,
    },
    {
      title: "Cantidad Hito",
      key: "cantidadHito",
      width: 130,
      render: (_: unknown, r) => {
        const valor = getCantidad(hito, r.itemizadoOpcionId);
        if (!editable) {
          return valor === null ? (
            <span className="text-slate-400">—</span>
          ) : (
            <span>{valor.toLocaleString("es-CL", { maximumFractionDigits: 2 })}</span>
          );
        }
        // El saldo pendiente es solo una sugerencia inicial y una referencia
        // visual (solo aplica a hitos nuevos, sin cantidades guardadas: es
        // el caso de la precarga automática). NO es un máximo: el usuario
        // puede escribir cualquier cantidad >= 0 y esa cantidad prevalece
        // tal cual sobre la sugerencia.
        const esNuevo = !hito.tieneCantidadesGuardadas;
        const saldoPendiente = esNuevo ? calcularSaldoPendiente(hitos, hito, r) : null;
        return (
          <div>
            <InputNumber
              size="small"
              min={0}
              value={valor}
              placeholder="—"
              style={{ width: 110 }}
              onChange={(val) => updateCantidad(hito.id, r.itemizadoOpcionId, val)}
            />
            {saldoPendiente !== null && (
              <div className="text-xs text-slate-400 mt-0.5">
                Pendiente disponible: {saldoPendiente.toLocaleString("es-CL", { maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Cantidad Ejecutada del período",
      key: "cantidadEjecutada",
      width: 160,
      align: "center",
      // Ejecución de ESTE hito (registros de terreno dentro de su
      // fechaDesde/fechaHasta), no la ejecución global de la obra.
      render: (_: unknown, r) => formatCantidadEjecutada(hito.cantidadesEjecutadas[r.itemizadoOpcionId]),
    },
    {
      title: "PU",
      key: "precioUnitario",
      width: 130,
      align: "right",
      render: (_: unknown, r) => (
        <span className={aNumeroOrNull(r.precioUnitario) === null ? "text-slate-400" : ""}>
          {formatearMonto(r.precioUnitario, r.moneda)}
        </span>
      ),
    },
    {
      title: "Subtotal ejecutado del período",
      key: "subtotal",
      width: 160,
      align: "right",
      render: (_: unknown, r) => {
        const { valor, moneda } = obtenerValorFila(r, hito);
        return (
          <span className={valor === null ? "text-slate-400" : ""}>
            {formatearMonto(valor, moneda)}
          </span>
        );
      },
    },
  ];

  const collapseItems = useMemo(
    () =>
      hitos.map((hito, index) => {
        const cambiosPendientes = hitoTieneCambiosPendientes(hito, dirty[hito.id]);
        const esNuevo = !hito.tieneCantidadesGuardadas;
        const enEdicionCantidades = editandoCantidadesHitoId === hito.id;
        const cantidadesEditables = !hito.terminado && (esNuevo || enEdicionCantidades);
        return {
          key: hito.id,
          label: (
            <Space direction="vertical" size={0}>
              <Space>
                <span className="font-medium">{hito.nombre}</span>
                {hito.terminado && <Tag color="default">Terminado</Tag>}
                {cambiosPendientes && <Tag color="orange">Cambios sin guardar</Tag>}
              </Space>
              {(hito.fechaDesde || hito.fechaHasta) && (
                <span className="text-xs text-slate-400">
                  {formatFechaCorta(hito.fechaDesde)} al {formatFechaCorta(hito.fechaHasta)}
                </span>
              )}
            </Space>
          ),
          extra: (
            <Space onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Subir">
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0 || accionHitoId !== null || hito.terminado}
                  onClick={() => void handleMover(hito, -1)}
                />
              </Tooltip>
              <Tooltip title="Bajar">
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={index === hitos.length - 1 || accionHitoId !== null || hito.terminado}
                  onClick={() => void handleMover(hito, 1)}
                />
              </Tooltip>
              <Tooltip title="Editar nombre y período">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={hito.terminado}
                  onClick={() => handleEditarHito(hito)}
                />
              </Tooltip>
              <Tooltip title="Resumen económico de este hito">
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => setHitoResumen(hito)}
                />
              </Tooltip>
              <Popconfirm
                title="Eliminar hito"
                description={`¿Eliminar "${hito.nombre}" y sus cantidades?`}
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
                onConfirm={() => void handleEliminar(hito)}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={hito.terminado}
                  loading={accionHitoId === hito.id}
                />
              </Popconfirm>
            </Space>
          ),
          children: editandoHitoId === hito.id ? (
            <div className="space-y-3 max-w-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">Nombre (opcional)</div>
                <Input
                  size="small"
                  value={nombreDraft}
                  placeholder={hito.nombre}
                  onChange={(e) => setNombreDraft(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Fecha desde</div>
                <DatePicker
                  size="small"
                  format="DD-MM-YYYY"
                  value={fechaDesdeDraft}
                  style={{ width: "100%" }}
                  onChange={(val) => setFechaDesdeDraft(val)}
                />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Fecha hasta</div>
                <DatePicker
                  size="small"
                  format="DD-MM-YYYY"
                  value={fechaHastaDraft}
                  style={{ width: "100%" }}
                  onChange={(val) => setFechaHastaDraft(val)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  disabled={accionHitoId === hito.id}
                  onClick={handleCancelarEdicionHito}
                >
                  Cancelar
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={accionHitoId === hito.id}
                  onClick={() => void handleGuardarEdicionHito(hito)}
                >
                  Guardar cambios
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Table<HitoObraItemizadoItem>
                columns={buildColumns(hito, cantidadesEditables)}
                dataSource={items}
                rowKey="itemizadoOpcionId"
                size="small"
                pagination={false}
                scroll={{ x: 900 }}
                locale={{
                  emptyText: (
                    <Empty
                      description="Esta obra no tiene itemizados configurados"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
              />
              <div className="flex justify-end gap-2">
                {hito.terminado ? (
                  <span className="text-slate-400 text-xs">
                    Hito terminado: sin más modificaciones.
                  </span>
                ) : esNuevo ? (
                  <Button
                    size="small"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={guardandoHitoId === hito.id}
                    disabled={!cambiosPendientes}
                    onClick={() => void handleGuardarCantidades(hito)}
                  >
                    Guardar cantidades
                  </Button>
                ) : enEdicionCantidades ? (
                  <>
                    <Button
                      size="small"
                      disabled={guardandoHitoId === hito.id}
                      onClick={() => handleCancelarEdicionCantidades(hito)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={guardandoHitoId === hito.id}
                      disabled={!cambiosPendientes}
                      onClick={() => handleConfirmarGuardarCambios(hito)}
                    >
                      Guardar cambios
                    </Button>
                  </>
                ) : (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditarCantidades(hito)}
                  >
                    Editar hito
                  </Button>
                )}
                {!hito.terminado && (
                  <Popconfirm
                    title="¿Terminar este hito?"
                    description="Después de terminarlo no se podrán modificar el nombre, las cantidades, el orden ni eliminarlo."
                    okText="Terminar hito"
                    cancelText="Cancelar"
                    onConfirm={() => void handleTerminarHito(hito)}
                  >
                    <Button
                      size="small"
                      icon={<LockOutlined />}
                      loading={accionHitoId === hito.id}
                    >
                      Terminar hito
                    </Button>
                  </Popconfirm>
                )}
              </div>

              {(() => {
                const monedaResumen = monedaPorHito[hito.id] ?? "CLP";
                const indicadores = { uf: ufIndicador, dolar: dolarIndicador };
                const { ejecutadoPorMoneda, planificadoPorMoneda } = calcularTotalesHito(hito, items);

                const { totalConvertido: ejecutadoEnMonedaSeleccionada, monedasExcluidas } =
                  convertirTotalesAMoneda(ejecutadoPorMoneda, monedaResumen, indicadores);

                // El % de avance es una razón (no depende de la moneda que el
                // usuario elija ver): se calcula siempre en CLP, moneda que
                // nunca requiere indicador para convertir.
                const ejecutadoClp = convertirTotalesAMoneda(ejecutadoPorMoneda, "CLP", indicadores).totalConvertido;
                const planificadoClp = convertirTotalesAMoneda(planificadoPorMoneda, "CLP", indicadores).totalConvertido;
                const avance =
                  planificadoClp > 0
                    ? Math.min(100, Math.max(0, Math.round((ejecutadoClp / planificadoClp) * 100)))
                    : 0;

                return (
                  <div className="border-t border-slate-200 pt-3 mt-1 flex justify-end">
                    <div className="w-full max-w-xs space-y-2 text-right">
                      <div className="text-xs font-medium text-slate-500">Resumen del Hito</div>

                      <div>
                        <div className="text-xs text-slate-400 mb-1">Moneda</div>
                        <Segmented
                          size="small"
                          options={MONEDAS_RESUMEN}
                          value={monedaResumen}
                          onChange={(val) =>
                            setMonedaPorHito((prev) => ({ ...prev, [hito.id]: val as MonedaSoportada }))
                          }
                        />
                      </div>

                      <div>
                        <div className="text-xs text-slate-400">Total ejecutado</div>
                        <div className="text-base font-semibold">
                          {monedaResumen} {formatearNumero(ejecutadoEnMonedaSeleccionada, monedaResumen)}
                        </div>
                        {monedasExcluidas.length > 0 && (
                          <div className="text-xs text-orange-500">
                            No se pudo convertir {monedasExcluidas.join(", ")} (falta indicador).
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 mb-1">Avance del hito</div>
                        <Progress percent={avance} size="small" />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ),
        };
      }),
    [
      hitos,
      items,
      dirty,
      editandoHitoId,
      nombreDraft,
      fechaDesdeDraft,
      fechaHastaDraft,
      accionHitoId,
      guardandoHitoId,
      editandoCantidadesHitoId,
      monedaPorHito,
      ufIndicador,
      dolarIndicador,
    ]
  );

  const handleRequestClose = () => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }

    Modal.confirm({
      title: "Descartar cambios sin guardar",
      content: "Hay cantidades editadas que todavia no se guardaron.",
      okText: "Descartar",
      okButtonProps: { danger: true },
      cancelText: "Volver",
      onOk: onClose,
    });
  };

  return (
    <Drawer
      open={open}
      onClose={handleRequestClose}
      width="min(1200px, 98vw)"
      title={
        obraNombre
          ? `Estados de Avance — ${obraNombre}`
          : "Estados de Avance"
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          disabled={loading}
          onClick={() => void cargar()}
        >
          Recargar
        </Button>
      }
    >
      {error && (
        <Alert type="error" showIcon message={error} className="mb-3" />
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <div className="text-xs text-slate-500 mb-1">Nombre (opcional)</div>
          <Input
            size="small"
            placeholder={`Ej: Estado de Pago N°${hitos.length + 1}`}
            value={nuevoNombre}
            style={{ width: 220 }}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onPressEnter={() => void handleCrearHito()}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Fecha desde</div>
          <DatePicker
            size="small"
            format="DD-MM-YYYY"
            value={nuevoFechaDesde}
            style={{ width: 140 }}
            onChange={(val) => setNuevoFechaDesde(val)}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Fecha hasta</div>
          <DatePicker
            size="small"
            format="DD-MM-YYYY"
            value={nuevoFechaHasta}
            style={{ width: 140 }}
            onChange={(val) => setNuevoFechaHasta(val)}
          />
        </div>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          loading={creando}
          onClick={() => void handleCrearHito()}
        >
          Agregar hito
        </Button>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : hitos.length === 0 ? (
        <Empty description="Esta obra aún no tiene hitos. Agrega el primero." />
      ) : (
        <Collapse items={collapseItems} defaultActiveKey={hitos[0] ? [hitos[0].id] : []} />
      )}

      <ResumenEconomicoDrawer
        open={hitoResumen !== null}
        onClose={() => setHitoResumen(null)}
        obraNombre={obraNombre ?? ""}
        hito={hitoResumen}
        items={items}
      />
    </Drawer>
  );
};

export default EstadosAvanceObraDrawer;
