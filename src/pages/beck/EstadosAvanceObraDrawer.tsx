import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import dayjs, { Dayjs } from "dayjs";
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Skeleton,
  Space,
  Table,
  Tabs,
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
  FileExcelOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  hitosObraAPI,
  indicadoresAPI,
  type HitoObra,
  type HitoObraItemizadoItem,
  type HitosObraResponse,
  type LineaEstadoAvance,
} from "../../services/api";
import { TIPOS_ESTADO_AVANCE, getTipoRegistroLabel } from "../../constants/roles";
import {
  aNumeroOrNull,
  convertirTotalesAMoneda,
  formatearMonto,
  formatearNumero,
  sumarTotales,
  type MonedaSoportada,
} from "../../utils/conversionMoneda";
import { lineasConPeriodo, obtenerValorLinea } from "../../utils/valorizacionHito";
import { saveAs } from "file-saver";
import { construirExcelEstadoAvance } from "../../utils/exportarEstadoAvance";
import { construirExcelAvanceSemanal } from "../../utils/exportarAvanceSemanal";
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

// Los estados de avance son semanales: se propone la semana siguiente al último
// (7 días desde el día después de su "Fecha hasta"). Si todavía no hay ninguno, la
// semana (lunes a domingo) del primer registro validado sin estado de avance. El
// usuario puede cambiar las fechas; el backend valida la superposición igual.
const sugerirPeriodo = (
  todosHitos: HitoObra[],
  primeraFechaSinEstado: string | null
): { desde: Dayjs | null; hasta: Dayjs | null } => {
  const conFecha = todosHitos.filter((h) => h.fechaHasta);
  let desde: Dayjs | null = null;
  if (conFecha.length > 0) {
    const ultimo = conFecha.reduce((max, h) =>
      dayjs(h.fechaHasta).isAfter(dayjs(max.fechaHasta)) ? h : max
    );
    desde = dayjs(ultimo.fechaHasta).add(1, "day");
  } else if (primeraFechaSinEstado) {
    const primera = dayjs(primeraFechaSinEstado.slice(0, 10));
    desde = primera.subtract((primera.day() + 6) % 7, "day");
  }
  return { desde, hasta: desde ? desde.add(6, "day") : null };
};

// Total del período por moneda: suma de los subtotales que calculó el backend.
const calcularTotalesHito = (hito: HitoObra): Record<MonedaSoportada, number> =>
  sumarTotales(lineasConPeriodo(hito).map(obtenerValorLinea));

// Pestañas del estado de avance: Sellos, Juntas y Tabiquería, solo las que tienen
// contrato o ejecución; un tipo fuera de esa lista va en su propia pestaña.
const tiposConLineas = (hito: HitoObra): Array<{ value: string; label: string }> => {
  const presentes = new Set(hito.lineas.map((l) => l.tipoRegistro));
  const conocidos = TIPOS_ESTADO_AVANCE.filter((t) => presentes.has(t.value));
  const otros = [...presentes]
    .filter((t) => !TIPOS_ESTADO_AVANCE.some((c) => c.value === t))
    .map((t) => ({ value: t, label: getTipoRegistroLabel(t) }));
  return [...conocidos, ...otros];
};

const formatCantidadONada = (value: number | null): React.ReactNode =>
  value === null ? <span className="text-slate-400">—</span> : formatCantidadEjecutada(value);

const EstadosAvanceObraDrawer: React.FC<Props> = ({
  open,
  onClose,
  obraId,
  obraNombre,
}) => {
  const [hitos, setHitos] = useState<HitoObra[]>([]);
  const [items, setItems] = useState<HitoObraItemizadoItem[]>([]);
  // Exportación del avance semanal: estados de avance elegidos (por defecto, todos).
  const [avanceSemanalOpen, setAvanceSemanalOpen] = useState(false);
  const [hitosParaAvance, setHitosParaAvance] = useState<string[]>([]);
  const [exportandoAvance, setExportandoAvance] = useState(false);
  const [incluirSinEjecucion, setIncluirSinEjecucion] = useState(false);
  const [registrosSinEstado, setRegistrosSinEstado] = useState<
    HitosObraResponse["registrosSinEstado"]
  >({ cantidad: 0, primeraFecha: null });
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

  const [hitoResumen, setHitoResumen] = useState<HitoObra | null>(null);

  // Indicadores UF/USD para el footer "Resumen del Hito" (conversión de
  // Total ejecutado). Se cargan una sola vez al abrir el drawer, reutilizando
  // indicadoresAPI — misma fuente que usa Resumen Económico.
  const [ufIndicador, setUfIndicador] = useState<number | null>(null);
  const [dolarIndicador, setDolarIndicador] = useState<number | null>(null);
  // Moneda de visualización del footer, por hito (cada hito puede mostrar
  // una moneda distinta sin afectar a los demás).
  const [monedaPorHito, setMonedaPorHito] = useState<Record<string, MonedaSoportada>>({});

  const cargar = async () => {
    if (!obraId) return;
    setLoading(true);
    setError(null);
    setEditandoHitoId(null);
    try {
      const data = await hitosObraAPI.listar(obraId);
      setHitos(data.hitos);
      setItems(data.items);
      setRegistrosSinEstado(data.registrosSinEstado);
      // Se recalcula cada vez que se recarga (por ejemplo, justo después de crear uno).
      const sugerido = sugerirPeriodo(data.hitos, data.registrosSinEstado.primeraFecha);
      setNuevoFechaDesde(sugerido.desde);
      setNuevoFechaHasta(sugerido.hasta);
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
    const nombre = nuevoNombre.trim() || `Estado de avance N°${hitos.length + 1}`;
    setCreando(true);
    try {
      await hitosObraAPI.crear(obraId, {
        nombre,
        fechaDesde: nuevoFechaDesde.format("YYYY-MM-DD"),
        fechaHasta: nuevoFechaHasta.format("YYYY-MM-DD"),
      });
      setNuevoNombre("");
      void message.success("Estado de avance creado");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo crear el estado de avance"));
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
      void message.success("Estado de avance actualizado");
      // El período recién guardado cambia la ejecución/subtotal por hito
      // (calculados en el backend): se recarga para traer esos valores
      // recalculados, no solo el nombre/fechas.
      await cargar();
    } catch (err) {
      // El backend sigue validando superposición de períodos: ese error
      // (400) llega tal cual al usuario, sin capturarlo como éxito.
      void message.error(getErrorMessage(err, "No se pudo actualizar el estado de avance"));
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
      void message.error(getErrorMessage(err, "No se pudo reordenar el estado de avance"));
    } finally {
      setAccionHitoId(null);
    }
  };

  const handleEliminar = async (hito: HitoObra) => {
    if (!obraId || hito.terminado) return;
    setAccionHitoId(hito.id);
    try {
      await hitosObraAPI.eliminar(obraId, hito.id);
      void message.success("Estado de avance eliminado");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo eliminar el estado de avance"));
    } finally {
      setAccionHitoId(null);
    }
  };

  // Bloqueo real: además de ocultar/deshabilitar botones, el backend rechaza
  // con 409 cualquier modificación sobre un hito terminado. Esta validación
  // de frontend evita el viaje de red inútil, no reemplaza a la del backend.
  const [exportandoHitoId, setExportandoHitoId] = useState<string | null>(null);

  const handleExportarExcel = async (hito: HitoObra) => {
    setExportandoHitoId(hito.id);
    try {
      const { buffer, nombre } = await construirExcelEstadoAvance(obraNombre ?? "", hito);
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        nombre
      );
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo generar el Excel"));
    } finally {
      setExportandoHitoId(null);
    }
  };

  const hitosCronologicos = useMemo(
    () => [...hitos].sort((a, b) => (a.fechaDesde ?? "").localeCompare(b.fechaDesde ?? "")),
    [hitos]
  );

  const abrirAvanceSemanal = () => {
    setHitosParaAvance(hitosCronologicos.map((h) => h.id));
    setAvanceSemanalOpen(true);
  };

  const handleExportarAvanceSemanal = async () => {
    const elegidos = hitosCronologicos.filter((h) => hitosParaAvance.includes(h.id));
    if (elegidos.length === 0) {
      void message.error("Selecciona al menos un estado de avance.");
      return;
    }
    setExportandoAvance(true);
    try {
      const { buffer, nombre } = await construirExcelAvanceSemanal(obraNombre ?? "", items, elegidos, {
        incluirSinEjecucion,
      });
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        nombre
      );
      setAvanceSemanalOpen(false);
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo generar el Excel"));
    } finally {
      setExportandoAvance(false);
    }
  };

  const handleTerminarHito = async (hito: HitoObra) => {
    if (!obraId || hito.terminado) return;
    setAccionHitoId(hito.id);
    try {
      await hitosObraAPI.terminar(obraId, hito.id);
      void message.success("Estado de avance terminado");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo terminar el estado de avance"));
    } finally {
      setAccionHitoId(null);
    }
  };

  const columns: ColumnsType<LineaEstadoAvance> = [
    {
      title: "Código BECK",
      key: "codigoBeck",
      width: 100,
      fixed: "left",
      render: (_: unknown, r) => r.codigoBeck || <span className="text-slate-400">—</span>,
    },
    {
      title: "Itemizado BECK",
      key: "itemizadoBeck",
      width: 220,
      render: (_: unknown, r) =>
        r.itemizadoBeck ||
        (r.itemizadoOpcionId ? (
          <span className="text-slate-400">—</span>
        ) : (
          <Tooltip title="Hay registros con este código, pero no está entre los ítems visibles de la obra.">
            <Tag color="orange">Sin ítem en la obra</Tag>
          </Tooltip>
        )),
    },
    {
      title: "Itemizado Mandante",
      key: "itemizadoMandante",
      width: 200,
      render: (_: unknown, r) => r.itemizadoMandante || <span className="text-slate-400">—</span>,
    },
    {
      title: "Contratado",
      key: "cantidadContratada",
      width: 105,
      align: "right",
      render: (_: unknown, r) => formatCantidadONada(r.cantidadContratada),
    },
    {
      title: "Anterior",
      key: "cantidadAnterior",
      width: 95,
      align: "right",
      render: (_: unknown, r) => formatCantidadEjecutada(r.cantidadAnterior),
    },
    {
      title: "Cantidad final del período",
      key: "cantidadPeriodo",
      width: 120,
      align: "right",
      render: (_: unknown, r) => (
        <span className="font-medium">{formatCantidadEjecutada(r.cantidadPeriodo)}</span>
      ),
    },
    {
      title: "Acumulado",
      key: "cantidadAcumulada",
      width: 100,
      align: "right",
      render: (_: unknown, r) => formatCantidadEjecutada(r.cantidadAcumulada),
    },
    {
      title: "Saldo",
      key: "saldo",
      width: 95,
      align: "right",
      render: (_: unknown, r) =>
        r.saldo !== null && r.saldo < 0 ? (
          <Tooltip title="Lo ejecutado supera la cantidad contratada">
            <span className="font-medium text-red-600">{formatCantidadEjecutada(r.saldo)}</span>
          </Tooltip>
        ) : (
          formatCantidadONada(r.saldo)
        ),
    },
    {
      title: "PU",
      key: "precioUnitario",
      width: 120,
      align: "right",
      render: (_: unknown, r) => (
        <span className={aNumeroOrNull(r.precioUnitario) === null ? "text-slate-400" : ""}>
          {formatearMonto(r.precioUnitario, r.moneda)}
        </span>
      ),
    },
    {
      title: "Subtotal del período",
      key: "subtotal",
      width: 140,
      align: "right",
      render: (_: unknown, r) => {
        const { valor, moneda } = obtenerValorLinea(r);
        return (
          <span className={valor === null ? "text-slate-400" : ""}>
            {formatearMonto(valor, moneda)}
          </span>
        );
      },
    },
  ];

  const renderTablaTipo = (lineas: LineaEstadoAvance[]) => (
    <Table<LineaEstadoAvance>
      columns={columns}
      dataSource={lineas}
      rowKey="clave"
      size="small"
      pagination={false}
      scroll={{ x: 1300 }}
    />
  );

  const collapseItems = useMemo(
    () =>
      hitos.map((hito, index) => {
        return {
          key: hito.id,
          label: (
            <Space direction="vertical" size={0}>
              <Space>
                <span className="font-medium">{hito.nombre}</span>
                {hito.terminado && <Tag color="default">Terminado</Tag>}
                <Tag>{hito.cantidadRegistros} registros</Tag>
                {hito.registrosAtrasados > 0 && (
                  <Tooltip title="Ejecutados antes de este período y validados después de cerrar el estado de avance anterior.">
                    <Tag color="orange">{hito.registrosAtrasados} de períodos anteriores</Tag>
                  </Tooltip>
                )}
              </Space>
              {(hito.fechaDesde || hito.fechaHasta) && (
                <span className="text-xs text-slate-400">
                  {formatFechaCorta(hito.fechaDesde)} al {formatFechaCorta(hito.fechaHasta)}
                </span>
              )}
            </Space>
          ),
          extra: (
            <Space wrap onClick={(e) => e.stopPropagation()}>
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
              <Tooltip title="Resumen económico de este estado de avance">
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => setHitoResumen(hito)}
                />
              </Tooltip>
              <Tooltip title="Exportar a Excel">
                <Button
                  size="small"
                  icon={<FileExcelOutlined />}
                  loading={exportandoHitoId === hito.id}
                  onClick={() => void handleExportarExcel(hito)}
                />
              </Tooltip>
              <Popconfirm
                title="Eliminar estado de avance"
                description={`¿Eliminar "${hito.nombre}"? Sus registros pasan al siguiente estado de avance.`}
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
              {(() => {
                const tipos = tiposConLineas(hito);
                if (tipos.length === 0) {
                  return (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin registros validados en este período ni contrato cargado en Configurar itemizados."
                    />
                  );
                }
                return (
                  <Tabs
                    size="small"
                    items={tipos.map((tipo) => ({
                      key: tipo.value,
                      label: tipo.label,
                      children: renderTablaTipo(hito.lineas.filter((l) => l.tipoRegistro === tipo.value)),
                    }))}
                  />
                );
              })()}
              <div className="flex justify-end gap-2">
                {hito.terminado ? (
                  <span className="text-slate-400 text-xs">
                    Terminado: sus registros, cantidades y precios quedaron congelados.
                  </span>
                ) : null}
                {!hito.terminado && (
                  <Popconfirm
                    title="¿Terminar este estado de avance?"
                    description="Se congelan sus registros, cantidades y precios. Lo que se valide después pasa al siguiente estado de avance."
                    okText="Terminar"
                    cancelText="Cancelar"
                    onConfirm={() => void handleTerminarHito(hito)}
                  >
                    <Button
                      size="small"
                      icon={<LockOutlined />}
                      loading={accionHitoId === hito.id}
                    >
                      Terminar estado de avance
                    </Button>
                  </Popconfirm>
                )}
              </div>

              {(() => {
                const monedaResumen = monedaPorHito[hito.id] ?? "CLP";
                const indicadores = { uf: ufIndicador, dolar: dolarIndicador };
                const ejecutadoPorMoneda = calcularTotalesHito(hito);

                const { totalConvertido: ejecutadoEnMonedaSeleccionada, monedasExcluidas } =
                  convertirTotalesAMoneda(ejecutadoPorMoneda, monedaResumen, indicadores);

                return (
                  <div className="border-t border-slate-200 pt-3 mt-1 flex justify-end">
                    <div className="w-full max-w-xs space-y-2 text-right">
                      <div className="text-xs font-medium text-slate-500">Resumen del período</div>

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
      editandoHitoId,
      nombreDraft,
      fechaDesdeDraft,
      fechaHastaDraft,
      accionHitoId,
      monedaPorHito,
      exportandoHitoId,
      ufIndicador,
      dolarIndicador,
    ]
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1200px, 98vw)"
      title={
        obraNombre
          ? `Estados de Avance — ${obraNombre}`
          : "Estados de Avance"
      }
      extra={
        <Space>
          <Button
            size="small"
            icon={<FileExcelOutlined />}
            disabled={loading || hitos.length === 0}
            onClick={abrirAvanceSemanal}
          >
            Exportar avance semanal
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            disabled={loading}
            onClick={() => void cargar()}
          >
            Recargar
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert type="error" showIcon message={error} className="mb-3" />
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-[220px]">
          <div className="text-xs text-slate-500 mb-1">Nombre (opcional)</div>
          <Input
            size="small"
            placeholder={`Ej: Estado de avance N°${hitos.length + 1}`}
            value={nuevoNombre}
            className="w-full"
            onChange={(e) => setNuevoNombre(e.target.value)}
            onPressEnter={() => void handleCrearHito()}
          />
        </div>
        <div className="w-full sm:w-[140px]">
          <div className="text-xs text-slate-500 mb-1">Fecha desde</div>
          <DatePicker
            size="small"
            format="DD-MM-YYYY"
            value={nuevoFechaDesde}
            className="w-full"
            onChange={(val) => setNuevoFechaDesde(val)}
          />
        </div>
        <div className="w-full sm:w-[140px]">
          <div className="text-xs text-slate-500 mb-1">Fecha hasta</div>
          <DatePicker
            size="small"
            format="DD-MM-YYYY"
            value={nuevoFechaHasta}
            className="w-full"
            onChange={(val) => setNuevoFechaHasta(val)}
          />
        </div>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          loading={creando}
          onClick={() => void handleCrearHito()}
          className="w-full sm:w-auto"
        >
          Agregar estado de avance
        </Button>
      </div>

      {registrosSinEstado.cantidad > 0 && (
        <Alert
          type="info"
          showIcon
          className="mb-3"
          message={`${registrosSinEstado.cantidad} registro(s) validado(s) todavía no están en ningún estado de avance`}
          description={`Fueron ejecutados desde el ${formatFechaCorta(registrosSinEstado.primeraFecha)}, después del último período. Agrega el estado de avance de esa semana para incluirlos.`}
        />
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : hitos.length === 0 ? (
        <Empty description="Esta obra aún no tiene estados de avance. Agrega el primero." />
      ) : (
        <Collapse items={collapseItems} defaultActiveKey={hitos[0] ? [hitos[0].id] : []} />
      )}

      <Modal
        open={avanceSemanalOpen}
        title="Exportar avance semanal"
        okText="Exportar Excel"
        cancelText="Cancelar"
        okButtonProps={{ icon: <FileExcelOutlined />, disabled: hitosParaAvance.length === 0 }}
        confirmLoading={exportandoAvance}
        onOk={() => void handleExportarAvanceSemanal()}
        onCancel={() => setAvanceSemanalOpen(false)}
      >
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            Cada estado de avance elegido es una columna con sus totales sin factores (S/F) y con
            factores (C/F).
          </span>
        </div>
        <Checkbox
          className="mb-2"
          checked={hitosParaAvance.length === hitosCronologicos.length}
          indeterminate={hitosParaAvance.length > 0 && hitosParaAvance.length < hitosCronologicos.length}
          onChange={(e) =>
            setHitosParaAvance(e.target.checked ? hitosCronologicos.map((h) => h.id) : [])
          }
        >
          Todos
        </Checkbox>
        <Checkbox.Group
          className="flex flex-col gap-1"
          value={hitosParaAvance}
          onChange={(valores) => setHitosParaAvance(valores as string[])}
          options={hitosCronologicos.map((h) => ({
            value: h.id,
            label: `${h.nombre} (${formatFechaCorta(h.fechaDesde)} al ${formatFechaCorta(h.fechaHasta)})${h.terminado ? " · terminado" : ""}`,
          }))}
        />
        <div className="mt-4 border-t border-slate-200 pt-3">
          <Checkbox
            checked={incluirSinEjecucion}
            onChange={(e) => setIncluirSinEjecucion(e.target.checked)}
          >
            Incluir todos los itemizados configurados en la obra
          </Checkbox>
          <div className="ml-6 text-xs text-slate-500">
            {incluirSinEjecucion
              ? "Se listan todos los ítems de la obra, también los que no tuvieron ejecución (en cero)."
              : "Solo se listan los ítems con ejecución en las semanas seleccionadas."}
          </div>
        </div>
      </Modal>

      <ResumenEconomicoDrawer
        open={hitoResumen !== null}
        onClose={() => setHitoResumen(null)}
        obraNombre={obraNombre ?? ""}
        hito={hitoResumen}
      />
    </Drawer>
  );
};

export default EstadosAvanceObraDrawer;
