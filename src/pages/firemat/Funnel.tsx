import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  message,
} from "antd";
import {
  ClearOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  firematCotizacionesAPI,
  firematFunnelAPI,
  firematProductosAPI,
  type FirematCotizacion,
  type FirematCotizacionPayload,
  type FirematCotizacionTipoCliente,
  type FirematFunnelEtapa,
  type FirematFunnelOportunidad,
  type FirematFunnelPayload,
  type FirematFunnelResumen,
  type ProductoFiremat,
} from "../../services/api";

type ModalMode = "crear" | "editar" | "ver";

type LineaCotizacionForm = {
  productoId?: number | string;
  cantidad?: number;
  precioUnitario?: number;
  descuentoPct?: number;
  observacion?: string | null;
};

type CotizacionFormValues = {
  cliente: string;
  contacto?: string;
  tipoCliente: FirematCotizacionTipoCliente;
  responsable?: string;
  fechaVencimiento?: Dayjs | null;
  fechaSeguimiento?: Dayjs | null;
  observaciones?: string;
  lineas: LineaCotizacionForm[];
};

type FunnelFormValues = {
  cliente: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  tipoCliente?: FirematCotizacionTipoCliente;
  productoId?: number;
  cantidadEstimada?: number;
  responsable?: string;
  etapa: FirematFunnelEtapa;
  montoEstimado?: number;
  probabilidadCierre?: number;
  proximaAccion?: string;
  fechaProximaAccion?: Dayjs | null;
  observaciones?: string;
  origen?: string;
  cotizacionId?: string | number;
  motivoPerdida?: string;
  motivoPostergacion?: string;
  fechaReactivacion?: Dayjs | null;
  documentoRespaldo?: string;
};

const ETAPAS: Array<{
  label: string;
  value: FirematFunnelEtapa;
  color: string;
}> = [
  { label: "Prospecto", value: "PROSPECTO", color: "#6b7280" },
  { label: "Primer contacto", value: "PRIMER_CONTACTO", color: "#2563eb" },
  { label: "Desarrollo cotización", value: "DESARROLLO_COTIZACION", color: "#7c3aed" },
  { label: "Cotización enviada", value: "COTIZACION_ENVIADA", color: "#d97706" },
  { label: "|firmada", value: "ORDEN_CONFIRMADA", color: "#0891b2" },
  { label: "Ganada", value: "GANADA", color: "#16a34a" },
  { label: "Perdida", value: "PERDIDA", color: "#dc2626" },
  { label: "Postergada", value: "POSTERGADA", color: "#9333ea" },
];


const TIPO_CLIENTE_OPTIONS: Array<{
  label: string;
  value: FirematCotizacionTipoCliente;
}> = [
  { label: "Cliente final", value: "CLIENTE_FINAL" },
  { label: "Broker", value: "BROKER" },
  { label: "Ferretería", value: "FERRETERIA" },
  { label: "Redistribuidor", value: "REDISTRIBUIDOR" },
  { label: "Instalador", value: "INSTALADOR" },
  { label: "Comisionista", value: "COMISIONISTA" },
  { label: "Recompra", value: "RECOMPRA" },
];

const RESUMEN_VACIO: FirematFunnelResumen = {
  totalOportunidades: 0,
  pipelineTotal: 0,
  ganadas: 0,
  perdidas: 0,
  postergadas: 0,
  cotizacionesVinculadas: 0,
};

const formatCLP = (value?: number | null) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD-MM-YYYY") : "—";
};

const getEstadoLabel = (estado?: string | null) => {
  if (estado === "BORRADOR") return "Borrador";
  if (estado === "ENVIADA") return "Enviada";
  if (estado === "SEGUIMIENTO") return "Seguimiento";
  if (estado === "ORDEN_CONFIRMADA") return "Orden confirmada";
  if (estado === "GANADA") return "Ganada";
  if (estado === "PERDIDA") return "Perdida";
  if (estado === "POSTERGADA") return "Postergada";
  return estado ?? "—";
};

const getEstadoColor = (estado?: string | null) => {
  if (estado === "BORRADOR") return "gold";
  if (estado === "ENVIADA") return "blue";
  if (estado === "SEGUIMIENTO") return "orange";
  if (estado === "ORDEN_CONFIRMADA") return "cyan";
  if (estado === "GANADA") return "green";
  if (estado === "PERDIDA") return "red";
  if (estado === "POSTERGADA") return "purple";
  return "default";
};

const getCotizacionFecha = (cotizacion: FirematCotizacion) =>
  cotizacion.fechaCotizacion ?? cotizacion.fecha ?? cotizacion.createdAt ?? null;

const getLineasCotizacion = (cotizacion: FirematCotizacion) =>
  cotizacion.lineas ?? cotizacion.detalle ?? [];

const calculateLineSubtotal = (linea: LineaCotizacionForm) => {
  const cantidad = Number(linea.cantidad || 0);
  const precio = Number(linea.precioUnitario || 0);
  const descuentoPct = Number(linea.descuentoPct || 0);
  return Math.round(cantidad * precio * (1 - descuentoPct / 100));
};

const calculateTotals = (lineas: LineaCotizacionForm[] = []) => {
  const subtotal = lineas.reduce(
    (acc, linea) => acc + calculateLineSubtotal(linea),
    0
  );
  const descuento = lineas.reduce((acc, linea) => {
    const bruto = Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0);
    return acc + Math.round(bruto * (Number(linea.descuentoPct || 0) / 100));
  }, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  return { subtotal, descuento, iva, total };
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const needsExtraFields = (etapa: FirematFunnelEtapa) =>
  etapa === "PERDIDA" || etapa === "POSTERGADA" || etapa === "GANADA";


const getCotizacionLabel = (cotizacion: FirematCotizacion) => {
  const numero = cotizacion.numero ?? cotizacion.id;
  return `#${numero} · ${cotizacion.cliente} · ${formatCLP(cotizacion.total)}`;
};

type ResumenCardProps = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

const ResumenCard: React.FC<ResumenCardProps> = ({ label, value, highlight }) => (
  <div
    className={`firemat-kpi-card flex flex-col gap-1 rounded-2xl p-4 ${
      highlight ? "border-orange-300" : ""
    }`}
  >
    <p className="text-xs text-beck-muted">{label}</p>
    <p
      className={`text-2xl font-bold tabular-nums ${
        highlight ? "text-firemat-primary" : "text-beck-ink"
      }`}
    >
      {value}
    </p>
  </div>
);

type FirematFunnelCardProps = {
  item: FirematFunnelOportunidad;
  productoNombre?: string | null;
  isDragging: boolean;
  onDragStart: (
    event: React.DragEvent<HTMLElement>,
    item: FirematFunnelOportunidad
  ) => void;
  onDragEnd: () => void;
  onViewDetail: (item: FirematFunnelOportunidad) => Promise<void> | void;
};

const FirematFunnelCard: React.FC<FirematFunnelCardProps> = ({
  item,
  productoNombre,
  isDragging,
  onDragStart,
  onDragEnd,
  onViewDetail,
}) => {
  return (
    <article
      draggable
      data-opportunity-id={item.id}
      onDragStart={(event) => onDragStart(event, item)}
      onDragEnd={onDragEnd}
      className={`group cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-orange-300 hover:shadow-md ${
        isDragging ? "is-dragging opacity-40 ring-2 ring-orange-300" : ""
      }`}
      onClick={() => void onViewDetail(item)}
    >
      <h4 className="truncate font-semibold leading-tight text-beck-ink">
        {item.cliente}
      </h4>

      <p className="mt-1 font-medium tabular-nums text-firemat-primary">
        {formatCLP(item.montoEstimado)}
      </p>

      <p className="mt-0.5 text-beck-muted">
        Próxima: {formatDate(item.fechaProximaAccion)}
      </p>

      {productoNombre && (
        <p className="mt-1 line-clamp-2 text-beck-ink-soft">{productoNombre}</p>
      )}
    </article>
  );
};

type FirematFunnelColumnProps = {
  column: {
    label: string;
    value: FirematFunnelEtapa;
    color: string;
    items: FirematFunnelOportunidad[];
    total: number;
  };
  productoMap: Map<number, ProductoFiremat>;
  draggedOpportunityId?: string | null;
  dropOverEtapa?: FirematFunnelEtapa | null;
  onCardDragStart: (
    event: React.DragEvent<HTMLElement>,
    item: FirematFunnelOportunidad
  ) => void;
  onCardDragEnd: () => void;
  onColumnDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    etapa: FirematFunnelEtapa
  ) => void;
  onColumnDragLeave: (etapa: FirematFunnelEtapa) => void;
  onColumnDrop: (
    event: React.DragEvent<HTMLDivElement>,
    etapa: FirematFunnelEtapa
  ) => void;
  onViewDetail: (item: FirematFunnelOportunidad) => Promise<void> | void;
};

const FirematFunnelColumn: React.FC<FirematFunnelColumnProps> = ({
  column,
  productoMap,
  draggedOpportunityId,
  dropOverEtapa,
  onCardDragStart,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  onViewDetail,
}) => {
  return (
    <div
      onDragOver={(event) => onColumnDragOver(event, column.value)}
      onDragLeave={() => onColumnDragLeave(column.value)}
      onDrop={(event) => onColumnDrop(event, column.value)}
      className={`flex min-h-[420px] w-[220px] shrink-0 flex-col rounded-xl border p-3 transition-colors ${
        dropOverEtapa === column.value
          ? "drop-over border-orange-400 bg-[#fff0eb]"
          : "border-[#ead7d2] bg-[#fff7f5]"
      }`}
    >
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight text-beck-ink">
            {column.label}
          </h3>
          <span className="rounded-full border border-firemat-border bg-white px-2 py-0.5 text-xs text-beck-ink-soft">
            {column.items.length}
          </span>
        </div>
        <p className="mt-1 text-xs font-medium tabular-nums text-firemat-primary">
          {formatCLP(column.total)}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {column.items.length ? (
          column.items.map((item) => {
            const producto =
              item.producto?.nombre ??
              item.productoNombre ??
              (item.productoId ? productoMap.get(item.productoId)?.nombre : null);

            return (
              <FirematFunnelCard
                key={item.id}
                item={item}
                productoNombre={producto}
                isDragging={draggedOpportunityId === item.id}
                onDragStart={onCardDragStart}
                onDragEnd={onCardDragEnd}
                onViewDetail={onViewDetail}
              />
            );
          })
        ) : (
          <p className="mt-4 text-center text-xs text-beck-muted">
            Sin oportunidades
          </p>
        )}
      </div>
    </div>
  );
};

const FirematFunnel: React.FC = () => {
  const [form] = Form.useForm<FunnelFormValues>();
  const [cotizacionForm] = Form.useForm<CotizacionFormValues>();
  const etapaWatch = Form.useWatch("etapa", form);
  const lineasCotizacionRaw = Form.useWatch("lineas", cotizacionForm);
  const lineasCotizacionWatch = useMemo(() => lineasCotizacionRaw ?? [], [lineasCotizacionRaw]);

  const [oportunidades, setOportunidades] = useState<FirematFunnelOportunidad[]>([]);
  const [resumen, setResumen] = useState<FirematFunnelResumen>(RESUMEN_VACIO);
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [cotizaciones, setCotizaciones] = useState<FirematCotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("crear");
  const [selected, setSelected] = useState<FirematFunnelOportunidad | null>(null);
  const [cotizacionModalOpen, setCotizacionModalOpen] = useState(false);
  const [cotizacionModalMode, setCotizacionModalMode] =
    useState<ModalMode>("crear");
  const [selectedCotizacion, setSelectedCotizacion] =
    useState<FirematCotizacion | null>(null);
  const [savingCotizacion, setSavingCotizacion] = useState(false);
  const [activeDragOpportunity, setActiveDragOpportunity] =
    useState<FirematFunnelOportunidad | null>(null);
  const activeDragRef = useRef<FirematFunnelOportunidad | null>(null);
  const [dropOverEtapa, setDropOverEtapa] =
    useState<FirematFunnelEtapa | null>(null);

  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState<FirematFunnelEtapa | "">("");
  const [responsable, setResponsable] = useState("");
  const [tipoCliente, setTipoCliente] = useState<FirematCotizacionTipoCliente | "">("");
  const [productoId, setProductoId] = useState<number | undefined>();

  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        label: producto.nombre,
        value: producto.id,
      })),
    [productos]
  );

  const productoMap = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos]
  );

  const cotizacionOptions = useMemo(
    () =>
      cotizaciones.map((cotizacion) => ({
        label: getCotizacionLabel(cotizacion),
        value: cotizacion.id,
      })),
    [cotizaciones]
  );

  const cotizacionTotals = useMemo(
    () => calculateTotals(lineasCotizacionWatch),
    [lineasCotizacionWatch]
  );

  const relatedCotizaciones = useMemo(() => {
    if (!selected) return [];

    const linkedIds = new Set(
      [selected.cotizacionId, selected.cotizacion?.id]
        .filter((value): value is string | number => value !== null && value !== undefined)
        .map((value) => String(value))
    );

    const fromList = cotizaciones.filter((cotizacion) =>
      linkedIds.has(String(cotizacion.id))
    );

    if (
      selected.cotizacion &&
      !fromList.some((cotizacion) => cotizacion.id === selected.cotizacion?.id)
    ) {
      return [selected.cotizacion, ...fromList];
    }

    return fromList;
  }, [cotizaciones, selected]);

  const responsableOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        oportunidades
          .map((item) => item.responsable?.trim())
          .filter((item): item is string => Boolean(item))
      )
    );
    return values.map((value) => ({ label: value, value }));
  }, [oportunidades]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof firematFunnelAPI.listar>[0] = {};
      if (q.trim()) params.q = q.trim();
      if (etapa) params.etapa = etapa;
      if (responsable.trim()) params.responsable = responsable.trim();
      if (tipoCliente) params.tipoCliente = tipoCliente;
      if (productoId) params.productoId = productoId;

      const [funnelResponse, productosResponse, cotizacionesResponse] =
        await Promise.all([
          firematFunnelAPI.listar(params),
          firematProductosAPI.listar({ activo: true }),
          firematCotizacionesAPI.listar({}),
        ]);

      setOportunidades(funnelResponse.data);
      setResumen(funnelResponse.resumen);
      setProductos(productosResponse);
      setCotizaciones(cotizacionesResponse.data);
    } catch {
      void message.error("No se pudo cargar el funnel Firemat");
      setOportunidades([]);
      setResumen(RESUMEN_VACIO);
    } finally {
      setLoading(false);
    }
  }, [etapa, productoId, q, responsable, tipoCliente]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const limpiar = () => {
    setQ("");
    setEtapa("");
    setResponsable("");
    setTipoCliente("");
    setProductoId(undefined);
  };

  const setFormFromOportunidad = (
    oportunidad: FirematFunnelOportunidad,
    etapaOverride?: FirematFunnelEtapa
  ) => {
    form.setFieldsValue({
      cliente: oportunidad.cliente,
      contacto: oportunidad.contacto ?? "",
      telefono: oportunidad.telefono ?? "",
      correo: oportunidad.correo ?? "",
      tipoCliente: oportunidad.tipoCliente as FirematCotizacionTipoCliente | undefined,
      productoId: oportunidad.productoId ?? undefined,
      cantidadEstimada: Number(oportunidad.cantidadEstimada || 0) || undefined,
      responsable: oportunidad.responsable ?? "",
      etapa: etapaOverride ?? oportunidad.etapa,
      montoEstimado: Number(oportunidad.montoEstimado || 0) || undefined,
      probabilidadCierre:
        Number(oportunidad.probabilidadCierre || 0) || undefined,
      proximaAccion: oportunidad.proximaAccion ?? "",
      fechaProximaAccion: oportunidad.fechaProximaAccion
        ? dayjs(oportunidad.fechaProximaAccion)
        : null,
      observaciones: oportunidad.observaciones ?? "",
      origen: oportunidad.origen ?? "CRM",
      cotizacionId: oportunidad.cotizacionId ?? undefined,
      motivoPerdida: oportunidad.motivoPerdida ?? "",
      motivoPostergacion: oportunidad.motivoPostergacion ?? "",
      fechaReactivacion: oportunidad.fechaReactivacion
        ? dayjs(oportunidad.fechaReactivacion)
        : null,
      documentoRespaldo: oportunidad.documentoRespaldo ?? "",
    });
  };

  const openCrear = () => {
    setSelected(null);
    setModalMode("crear");
    form.resetFields();
    form.setFieldsValue({
      etapa: "PROSPECTO",
      origen: "CRM",
      probabilidadCierre: 20,
    });
    setModalOpen(true);
  };

  const openOportunidad = async (
    record: FirematFunnelOportunidad,
    mode: ModalMode,
    etapaOverride?: FirematFunnelEtapa
  ) => {
    try {
      setModalMode(mode);
      setModalOpen(true);
      const detalle = await firematFunnelAPI.obtener(record.id);
      setSelected(detalle);
      setFormFromOportunidad(detalle, etapaOverride);
    } catch {
      setModalOpen(false);
      void message.error("No se pudo cargar la oportunidad");
    }
  };

  const buildPayload = (values: FunnelFormValues): FirematFunnelPayload => ({
    cliente: values.cliente.trim(),
    contacto: values.contacto?.trim() || null,
    telefono: values.telefono?.trim() || null,
    correo: values.correo?.trim() || null,
    tipoCliente: values.tipoCliente ?? null,
    productoId: values.productoId ? Number(values.productoId) : null,
    cantidadEstimada: values.cantidadEstimada
      ? Number(values.cantidadEstimada)
      : null,
    responsable: values.responsable?.trim() || null,
    etapa: values.etapa,
    montoEstimado: values.montoEstimado ? Number(values.montoEstimado) : null,
    probabilidadCierre: values.probabilidadCierre
      ? Number(values.probabilidadCierre)
      : null,
    proximaAccion: values.proximaAccion?.trim() || null,
    fechaProximaAccion: values.fechaProximaAccion?.format("YYYY-MM-DD") ?? null,
    observaciones: values.observaciones?.trim() || null,
    origen: values.origen?.trim() || null,
    cotizacionId: values.cotizacionId ?? null,
    motivoPerdida: values.motivoPerdida?.trim() || null,
    motivoPostergacion: values.motivoPostergacion?.trim() || null,
    fechaReactivacion: values.fechaReactivacion?.format("YYYY-MM-DD") ?? null,
    documentoRespaldo: values.documentoRespaldo?.trim() || null,
  });

  const validateStageRequirements = (values: FunnelFormValues) => {
    if (values.etapa === "PERDIDA" && !values.motivoPerdida?.trim()) {
      void message.error("Ingresa el motivo de pérdida");
      return false;
    }
    if (
      values.etapa === "POSTERGADA" &&
      (!values.motivoPostergacion?.trim() || !values.fechaReactivacion)
    ) {
      void message.error("Ingresa motivo de postergación y fecha de reactivación");
      return false;
    }
    if (values.etapa === "GANADA") {
      if (!values.documentoRespaldo?.trim()) {
        void message.error("Ingresa el documento de respaldo");
        return false;
      }
      if (!values.montoEstimado || Number(values.montoEstimado) <= 0) {
        void message.error("Ingresa el monto final");
        return false;
      }
      if (!values.responsable?.trim()) {
        void message.error("Ingresa el responsable");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (values: FunnelFormValues) => {
    if (modalMode === "ver") return;
    if (!validateStageRequirements(values)) return;

    setSaving(true);
    try {
      const payload = buildPayload(values);
      if (modalMode === "editar" && selected) {
        await firematFunnelAPI.actualizar(selected.id, payload);
        void message.success("Oportunidad actualizada");
      } else {
        await firematFunnelAPI.crear(payload);
        void message.success("Oportunidad creada");
      }
      setModalOpen(false);
      setSelected(null);
      form.resetFields();
      await cargar();
    } catch {
      void message.error("No se pudo guardar la oportunidad");
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEtapa = async (
    record: FirematFunnelOportunidad,
    nextEtapa: FirematFunnelEtapa
  ) => {
    if (nextEtapa === record.etapa) return;
    if (needsExtraFields(nextEtapa)) {
      void openOportunidad(record, "editar", nextEtapa);
      return;
    }

    const etapaOrigen = record.etapa;
    const optimisticRecord: FirematFunnelOportunidad = {
      ...record,
      etapa: nextEtapa,
    };

    setOportunidades((current) =>
      current.map((item) => (item.id === record.id ? optimisticRecord : item))
    );
    setSelected((current) =>
      current?.id === record.id ? { ...current, etapa: nextEtapa } : current
    );

    try {
      const updated = await firematFunnelAPI.cambiarEtapa(record.id, nextEtapa);
      setOportunidades((current) =>
        current.map((item) => (item.id === record.id ? { ...item, ...updated } : item))
      );
      setSelected((current) => (current?.id === record.id ? updated : current));
      void message.success("Etapa actualizada");
    } catch {
      setOportunidades((current) =>
        current.map((item) =>
          item.id === record.id ? { ...item, etapa: etapaOrigen } : item
        )
      );
      setSelected((current) =>
        current?.id === record.id ? { ...current, etapa: etapaOrigen } : current
      );
      void message.error("No se pudo cambiar la etapa");
    }
  };

  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const mouseXDuringDragRef = useRef<number>(0);
  const dragScrollRafRef = useRef<number | null>(null);

  const stopDragScroll = useCallback(() => {
    if (dragScrollRafRef.current !== null) {
      cancelAnimationFrame(dragScrollRafRef.current);
      dragScrollRafRef.current = null;
    }
  }, []);

  const startDragScroll = useCallback(() => {
    const tick = () => {
      const container = kanbanScrollRef.current;
      if (container) {
        const { left, right } = container.getBoundingClientRect();
        const x = mouseXDuringDragRef.current;
        if (x > right - 80) container.scrollLeft += 15;
        else if (x < left + 80) container.scrollLeft -= 15;
      }
      dragScrollRafRef.current = requestAnimationFrame(tick);
    };
    dragScrollRafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const trackMouse = (e: DragEvent) => {
      mouseXDuringDragRef.current = e.clientX;
    };
    document.addEventListener("dragover", trackMouse);
    return () => document.removeEventListener("dragover", trackMouse);
  }, []);

  const handleKanbanDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    oportunidad: FirematFunnelOportunidad
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", oportunidad.id);
    activeDragRef.current = oportunidad;
    setActiveDragOpportunity(oportunidad);
    startDragScroll();
  };

  const handleDragEnd = () => {
    stopDragScroll();
    activeDragRef.current = null;
    setActiveDragOpportunity(null);
    setDropOverEtapa(null);
  };

  const handleColumnDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    etapaDestino: FirematFunnelEtapa
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropOverEtapa(etapaDestino);
  };

  const handleColumnDragLeave = (etapaDestino: FirematFunnelEtapa) => {
    setDropOverEtapa((current) => (current === etapaDestino ? null : current));
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    etapaDestino: FirematFunnelEtapa
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const oportunidad = activeDragRef.current;
    activeDragRef.current = null;
    setDropOverEtapa(null);
    setActiveDragOpportunity(null);

    if (!oportunidad || oportunidad.etapa === etapaDestino) return;

    void handleCambiarEtapa(oportunidad, etapaDestino);
  };

  const handleEliminar = async (record: FirematFunnelOportunidad) => {
    try {
      await firematFunnelAPI.eliminar(record.id);
      void message.success("Oportunidad eliminada");
      if (selected?.id === record.id) {
        setModalOpen(false);
        setSelected(null);
      }
      await cargar();
    } catch {
      void message.error("No se pudo eliminar la oportunidad");
    }
  };

  const buildPayloadFromOportunidad = (
    oportunidad: FirematFunnelOportunidad,
    cotizacionId?: string | number | null
  ): FirematFunnelPayload => ({
    cliente: oportunidad.cliente,
    contacto: oportunidad.contacto ?? null,
    telefono: oportunidad.telefono ?? null,
    correo: oportunidad.correo ?? null,
    tipoCliente: oportunidad.tipoCliente ?? null,
    productoId: oportunidad.productoId ?? null,
    cantidadEstimada: oportunidad.cantidadEstimada ?? null,
    responsable: oportunidad.responsable ?? null,
    etapa: oportunidad.etapa,
    montoEstimado: oportunidad.montoEstimado ?? null,
    probabilidadCierre: oportunidad.probabilidadCierre ?? null,
    proximaAccion: oportunidad.proximaAccion ?? null,
    fechaProximaAccion: oportunidad.fechaProximaAccion ?? null,
    observaciones: oportunidad.observaciones ?? null,
    origen: oportunidad.origen ?? null,
    cotizacionId: cotizacionId ?? oportunidad.cotizacionId ?? null,
    motivoPerdida: oportunidad.motivoPerdida ?? null,
    motivoPostergacion: oportunidad.motivoPostergacion ?? null,
    fechaReactivacion: oportunidad.fechaReactivacion ?? null,
    documentoRespaldo: oportunidad.documentoRespaldo ?? null,
  });

  const buildCotizacionPayload = (
    values: CotizacionFormValues
  ): FirematCotizacionPayload => {
    const detalles = (values.lineas ?? [])
      .filter((linea) => linea.productoId && Number(linea.cantidad || 0) > 0)
      .map((linea) => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad || 0),
        precioUnitario: Number(linea.precioUnitario || 0),
        descuentoPct: Number(linea.descuentoPct || 0),
        observacion: linea.observacion?.trim() || null,
      }));

    return {
      cliente: values.cliente.trim(),
      contacto: values.contacto?.trim() || null,
      tipoCliente: values.tipoCliente,
      responsable: values.responsable?.trim() || null,
      fechaVencimiento: values.fechaVencimiento?.format("YYYY-MM-DD") ?? null,
      fechaSeguimiento: values.fechaSeguimiento?.format("YYYY-MM-DD") ?? null,
      observaciones: values.observaciones?.trim() || null,
      subtotal: cotizacionTotals.subtotal,
      descuento: cotizacionTotals.descuento,
      impuesto: cotizacionTotals.iva,
      total: cotizacionTotals.total,
      detalles,
    };
  };

  const openCrearCotizacion = () => {
    if (!selected) return;

    const producto = selected.productoId ? productoMap.get(selected.productoId) : null;

    setSelectedCotizacion(null);
    setCotizacionModalMode("crear");
    cotizacionForm.resetFields();
    cotizacionForm.setFieldsValue({
      cliente: selected.cliente,
      contacto: [selected.contacto, selected.telefono, selected.correo]
        .filter(Boolean)
        .join(" / "),
      tipoCliente:
        (selected.tipoCliente as FirematCotizacionTipoCliente | undefined) ??
        "CLIENTE_FINAL",
      responsable: selected.responsable ?? "",
      fechaSeguimiento: selected.fechaProximaAccion
        ? dayjs(selected.fechaProximaAccion)
        : null,
      observaciones: selected.observaciones ?? "",
      lineas: selected.productoId
        ? [
            {
              productoId: selected.productoId,
              cantidad: Number(selected.cantidadEstimada || 1),
              precioUnitario: Number(producto?.precio || 0),
              descuentoPct: 0,
            },
          ]
        : [{ cantidad: 1, descuentoPct: 0 }],
    });
    setCotizacionModalOpen(true);
  };

  const openCotizacion = async (record: FirematCotizacion, mode: ModalMode) => {
    try {
      setCotizacionModalMode(mode);
      setCotizacionModalOpen(true);
      const detalle = await firematCotizacionesAPI.obtener(record.id);
      const lineasDetalle = getLineasCotizacion(detalle).map((linea) => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad || 1),
        precioUnitario: Number(linea.precioUnitario || 0),
        descuentoPct: Number(linea.descuentoPct || 0),
      }));

      setSelectedCotizacion(detalle);
      cotizacionForm.setFieldsValue({
        cliente: detalle.cliente,
        contacto: detalle.contacto ?? "",
        tipoCliente:
          (detalle.tipoCliente as FirematCotizacionTipoCliente | undefined) ??
          "CLIENTE_FINAL",
        responsable: detalle.responsable ?? "",
        fechaVencimiento: detalle.fechaVencimiento
          ? dayjs(detalle.fechaVencimiento)
          : null,
        fechaSeguimiento: detalle.fechaSeguimiento
          ? dayjs(detalle.fechaSeguimiento)
          : null,
        observaciones: detalle.observaciones ?? "",
        lineas: lineasDetalle.length ? lineasDetalle : [{ cantidad: 1, descuentoPct: 0 }],
      });
    } catch {
      setCotizacionModalOpen(false);
      void message.error("No se pudo cargar la cotización");
    }
  };

  const handleCotizacionSubmit = async (values: CotizacionFormValues) => {
    if (cotizacionModalMode === "ver") return;
    const payload = buildCotizacionPayload(values);

    if (!payload.detalles.length) {
      void message.error("Agrega al menos un producto a la cotización");
      return;
    }

    setSavingCotizacion(true);
    try {
      if (cotizacionModalMode === "editar" && selectedCotizacion) {
        await firematCotizacionesAPI.actualizar(selectedCotizacion.id, payload);
        void message.success("Cotización actualizada");
      } else {
        const nuevaCotizacion = await firematCotizacionesAPI.crear(payload);
        if (selected) {
          const updated = await firematFunnelAPI.actualizar(
            selected.id,
            buildPayloadFromOportunidad(selected, nuevaCotizacion.id)
          );
          setSelected(updated);
          setFormFromOportunidad(updated);
        }
        void message.success("Cotización creada y vinculada");
      }

      setCotizacionModalOpen(false);
      setSelectedCotizacion(null);
      cotizacionForm.resetFields();
      await cargar();
    } catch {
      void message.error("No se pudo guardar la cotización");
    } finally {
      setSavingCotizacion(false);
    }
  };

  const handlePdf = async (record: FirematCotizacion) => {
    try {
      const blob = await firematCotizacionesAPI.descargarPdf(record.id);
      downloadBlob(blob, `cotizacion-firemat-${record.id}.pdf`);
    } catch {
      void message.error("No se pudo descargar el PDF");
    }
  };

  const groupedByEtapa = useMemo(
    () =>
      ETAPAS.map((stage) => {
        const items = oportunidades.filter((item) => item.etapa === stage.value);
        return {
          ...stage,
          items,
          total: items.reduce((acc, item) => acc + Number(item.montoEstimado || 0), 0),
        };
      }),
    [oportunidades]
  );

  const hayFiltros =
    q !== "" ||
    etapa !== "" ||
    responsable !== "" ||
    tipoCliente !== "" ||
    productoId !== undefined;

  const modalReadOnly = modalMode === "ver";

  return (
    <div className="space-y-5">
      <section className="firemat-panel">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Funnel Firemat
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Seguimiento de oportunidades comerciales desde prospecto hasta cierre.
            </p>
          </div>
          <Space wrap>
            <Button className="firemat-action-button" icon={<ReloadOutlined />} onClick={() => void cargar()} loading={loading}>
              Actualizar
            </Button>
            <Button className="firemat-action-button" type="primary" icon={<PlusOutlined />} onClick={openCrear}>
              Crear oportunidad
            </Button>
          </Space>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ResumenCard label="Total oportunidades" value={resumen.totalOportunidades} />
        <ResumenCard label="Pipeline total" value={formatCLP(resumen.pipelineTotal)} highlight />
        <ResumenCard label="Ganadas" value={resumen.ganadas} />
        <ResumenCard label="Perdidas" value={resumen.perdidas} />
        <ResumenCard label="Postergadas" value={resumen.postergadas} />
        <ResumenCard label="Cotizaciones vinculadas" value={resumen.cotizacionesVinculadas} />
      </div>

      <section className="firemat-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar cliente o contacto"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            value={etapa}
            onChange={(value) => setEtapa(value)}
            options={[{ label: "Todas las etapas", value: "" }, ...ETAPAS]}
            style={{ width: 210 }}
          />
          <Select
            value={responsable}
            onChange={(value) => setResponsable(value)}
            options={[{ label: "Todos los responsables", value: "" }, ...responsableOptions]}
            style={{ width: 220 }}
          />
          <Select
            value={tipoCliente}
            onChange={(value) => setTipoCliente(value)}
            options={[{ label: "Todos los tipos", value: "" }, ...TIPO_CLIENTE_OPTIONS]}
            style={{ width: 190 }}
          />
          <Select
            value={productoId}
            onChange={(value) => setProductoId(value)}
            options={productoOptions}
            placeholder="Producto"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 240 }}
          />
          {hayFiltros && (
            <Button icon={<ClearOutlined />} onClick={limpiar}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </section>

      <section className="firemat-panel bg-white" style={{ overflow: "visible" }}>
        <div
          ref={kanbanScrollRef}
          style={{ overflowX: "auto", overflowY: "visible" }}
          onDragOver={handleKanbanDragOver}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {loading ? (
            <div className="flex justify-center py-16">
              <Spin size="large" />
            </div>
          ) : (
            <div className="flex w-max flex-nowrap gap-4 p-4 pb-5">
              {groupedByEtapa.map((column) => (
                <FirematFunnelColumn
                  key={column.value}
                  column={column}
                  productoMap={productoMap}
                  draggedOpportunityId={activeDragOpportunity?.id}
                  dropOverEtapa={dropOverEtapa}
                  onCardDragStart={handleDragStart}
                  onCardDragEnd={handleDragEnd}
                  onColumnDragOver={handleColumnDragOver}
                  onColumnDragLeave={handleColumnDragLeave}
                  onColumnDrop={handleDrop}
                  onViewDetail={(item) => openOportunidad(item, "ver")}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal
        title={
          modalMode === "crear"
            ? "Crear oportunidad Firemat"
            : modalMode === "editar"
            ? `Editar oportunidad ${selected?.cliente ?? ""}`
            : `Detalle oportunidad ${selected?.cliente ?? ""}`
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelected(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={modalMode === "crear" ? "Crear" : "Guardar"}
        cancelText={modalReadOnly ? "Cerrar" : "Cancelar"}
        okButtonProps={{ hidden: modalReadOnly }}
        confirmLoading={saving}
        width={960}
        destroyOnClose
      >
        {modalReadOnly && selected ? (
          <div className="space-y-5">
            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="Cliente">{selected.cliente || "—"}</Descriptions.Item>
              <Descriptions.Item label="Contacto">{selected.contacto || "—"}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{selected.telefono || "—"}</Descriptions.Item>
              <Descriptions.Item label="Correo">{selected.correo || "—"}</Descriptions.Item>
              <Descriptions.Item label="Etapa">
                {ETAPAS.find((item) => item.value === selected.etapa)?.label ?? selected.etapa}
              </Descriptions.Item>
              <Descriptions.Item label="Producto">
                {selected.producto?.nombre ??
                  selected.productoNombre ??
                  (selected.productoId
                    ? productoMap.get(selected.productoId)?.nombre
                    : null) ??
                  "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Cantidad estimada">
                {selected.cantidadEstimada ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Monto estimado">
                {formatCLP(selected.montoEstimado)}
              </Descriptions.Item>
              <Descriptions.Item label="Responsable">
                {selected.responsable || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Próxima acción">
                {selected.proximaAccion || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha próxima acción">
                {formatDate(selected.fechaProximaAccion)}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo de cliente">
                {TIPO_CLIENTE_OPTIONS.find((item) => item.value === selected.tipoCliente)?.label ??
                  selected.tipoCliente ??
                  "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Origen">{selected.origen || "—"}</Descriptions.Item>
              <Descriptions.Item label="Probabilidad cierre">
                {selected.probabilidadCierre !== null && selected.probabilidadCierre !== undefined
                  ? `${selected.probabilidadCierre}%`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Observaciones" span={2}>
                {selected.observaciones || "—"}
              </Descriptions.Item>
            </Descriptions>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-beck-ink">
                  Cotizaciones vinculadas
                </h3>
                <p className="text-xs text-beck-muted">
                  Cotizaciones Firemat asociadas a esta oportunidad.
                </p>
              </div>
              <Space wrap>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setModalMode("editar");
                    setFormFromOportunidad(selected);
                  }}
                >
                  Editar
                </Button>
                <Popconfirm
                  title="Eliminar oportunidad"
                  description="Esta acción no se puede deshacer."
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void handleEliminar(selected)}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Eliminar
                  </Button>
                </Popconfirm>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={openCrearCotizacion}
                >
                  Crear cotización
                </Button>
              </Space>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-beck-muted">
                Cambiar etapa
              </p>
              <Select<FirematFunnelEtapa>
                value={selected.etapa}
                onChange={(nextEtapa) => void handleCambiarEtapa(selected, nextEtapa)}
                style={{ width: 240 }}
                options={ETAPAS}
              />
            </div>

            {relatedCotizaciones.length ? (
              <div className="overflow-x-auto rounded-xl border border-[#ead7d2]">
                <table className="min-w-full divide-y divide-[#ead7d2] text-sm">
                  <thead className="bg-[#fff7f5]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-beck-muted">Nro.</th>
                      <th className="px-3 py-2 text-left font-medium text-beck-muted">Estado</th>
                      <th className="px-3 py-2 text-left font-medium text-beck-muted">Total</th>
                      <th className="px-3 py-2 text-left font-medium text-beck-muted">Fecha</th>
                      <th className="px-3 py-2 text-right font-medium text-beck-muted">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {relatedCotizaciones.map((cotizacion) => (
                      <tr key={cotizacion.id}>
                        <td className="px-3 py-2 font-mono text-xs">
                          {cotizacion.numero ?? cotizacion.id}
                        </td>
                        <td className="px-3 py-2">
                          <Tag color={getEstadoColor(cotizacion.estado)}>
                            {getEstadoLabel(cotizacion.estado)}
                          </Tag>
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatCLP(cotizacion.total)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatDate(getCotizacionFecha(cotizacion))}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => void openCotizacion(cotizacion, "ver")}
                            >
                              Ver
                            </Button>
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => void handlePdf(cotizacion)}
                            >
                              PDF
                            </Button>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => void openCotizacion(cotizacion, "editar")}
                            >
                              Editar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Sin cotizaciones vinculadas"
              />
            )}
          </div>
        ) : (
        <Form<FunnelFormValues>
          form={form}
          layout="vertical"
          disabled={modalReadOnly}
          onFinish={handleSubmit}
          initialValues={{
            etapa: "PROSPECTO",
            origen: "CRM",
            probabilidadCierre: 20,
          }}
        >
          <div className="grid grid-cols-1 gap-x-3 md:grid-cols-3">
            <Form.Item
              name="cliente"
              label="Cliente"
              rules={[{ required: true, message: "Ingresa el cliente" }]}
            >
              <Input placeholder="Cliente" />
            </Form.Item>
            <Form.Item name="contacto" label="Contacto">
              <Input placeholder="Nombre del contacto" />
            </Form.Item>
            <Form.Item name="responsable" label="Responsable">
              <Input placeholder="Responsable comercial" />
            </Form.Item>
            <Form.Item name="telefono" label="Teléfono">
              <Input placeholder="+56..." />
            </Form.Item>
            <Form.Item name="correo" label="Correo">
              <Input placeholder="correo@empresa.cl" />
            </Form.Item>
            <Form.Item name="tipoCliente" label="Tipo de cliente">
              <Select options={TIPO_CLIENTE_OPTIONS} placeholder="Tipo" allowClear />
            </Form.Item>
            <Form.Item name="productoId" label="Producto">
              <Select
                options={productoOptions}
                placeholder="Producto Firemat"
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
            <Form.Item name="cantidadEstimada" label="Cantidad estimada">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="montoEstimado" label="Monto estimado">
              <InputNumber min={0} className="w-full" prefix="$" />
            </Form.Item>
            <Form.Item
              name="etapa"
              label="Etapa"
              rules={[{ required: true, message: "Selecciona la etapa" }]}
            >
              <Select options={ETAPAS} />
            </Form.Item>
            <Form.Item name="probabilidadCierre" label="Probabilidad cierre">
              <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
            </Form.Item>
            <Form.Item name="proximaAccion" label="Próxima acción">
              <Input placeholder="Llamar, enviar ficha técnica..." />
            </Form.Item>
            <Form.Item name="fechaProximaAccion" label="Fecha próxima acción">
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="origen" label="Origen">
              <Input placeholder="CRM, web, referido..." />
            </Form.Item>
            <Form.Item name="cotizacionId" label="Cotización vinculada">
              <Select
                options={cotizacionOptions}
                placeholder="Seleccionar cotización"
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          </div>

          {etapaWatch === "PERDIDA" && (
            <Form.Item
              name="motivoPerdida"
              label="Motivo pérdida"
              rules={[{ required: true, message: "Ingresa el motivo de pérdida" }]}
            >
              <Input.TextArea rows={3} placeholder="Motivo de pérdida" />
            </Form.Item>
          )}

          {etapaWatch === "POSTERGADA" && (
            <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
              <Form.Item
                name="motivoPostergacion"
                label="Motivo postergación"
                rules={[
                  { required: true, message: "Ingresa el motivo de postergación" },
                ]}
              >
                <Input.TextArea rows={3} placeholder="Motivo de postergación" />
              </Form.Item>
              <Form.Item
                name="fechaReactivacion"
                label="Fecha reactivación"
                rules={[
                  { required: true, message: "Ingresa la fecha de reactivación" },
                ]}
              >
                <DatePicker format="DD-MM-YYYY" className="w-full" />
              </Form.Item>
            </div>
          )}

          {etapaWatch === "GANADA" && (
            <Form.Item
              name="documentoRespaldo"
              label="Documento respaldo"
              rules={[{ required: true, message: "Ingresa el documento de respaldo" }]}
            >
              <Input placeholder="OC, contrato, comprobante o documento" />
            </Form.Item>
          )}

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={4} placeholder="Notas comerciales" />
          </Form.Item>
        </Form>
        )}
      </Modal>

      <Modal
        title={
          cotizacionModalMode === "crear"
            ? "Nueva cotización Firemat"
            : cotizacionModalMode === "editar"
            ? `Editar cotización ${selectedCotizacion?.numero ?? selectedCotizacion?.id ?? ""}`
            : `Detalle cotización ${selectedCotizacion?.numero ?? selectedCotizacion?.id ?? ""}`
        }
        open={cotizacionModalOpen}
        onCancel={() => {
          setCotizacionModalOpen(false);
          setSelectedCotizacion(null);
          cotizacionForm.resetFields();
        }}
        onOk={() => cotizacionForm.submit()}
        okText={cotizacionModalMode === "crear" ? "Crear" : "Guardar"}
        cancelText={cotizacionModalMode === "ver" ? "Cerrar" : "Cancelar"}
        okButtonProps={{ hidden: cotizacionModalMode === "ver" }}
        confirmLoading={savingCotizacion}
        width={980}
        destroyOnClose
      >
        <Form<CotizacionFormValues>
          form={cotizacionForm}
          layout="vertical"
          disabled={cotizacionModalMode === "ver"}
          onFinish={handleCotizacionSubmit}
          initialValues={{
            tipoCliente: "CLIENTE_FINAL",
            lineas: [{ cantidad: 1, descuentoPct: 0 }],
          }}
        >
          <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
            <Form.Item
              name="cliente"
              label="Cliente"
              rules={[{ required: true, message: "Ingresa el cliente" }]}
            >
              <Input placeholder="Cliente" />
            </Form.Item>
            <Form.Item name="contacto" label="Contacto">
              <Input placeholder="Nombre, teléfono o correo" />
            </Form.Item>
            <Form.Item
              name="tipoCliente"
              label="Tipo de cliente"
              rules={[{ required: true, message: "Selecciona el tipo" }]}
            >
              <Select options={TIPO_CLIENTE_OPTIONS} />
            </Form.Item>
            <Form.Item name="responsable" label="Responsable">
              <Input placeholder="Responsable comercial" />
            </Form.Item>
            <Form.Item name="fechaVencimiento" label="Fecha vencimiento">
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="fechaSeguimiento" label="Fecha seguimiento">
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item
              name="observaciones"
              label="Observaciones"
              className="md:col-span-2"
            >
              <Input.TextArea rows={3} placeholder="Notas comerciales" />
            </Form.Item>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-beck-ink">Productos</p>
          </div>

          <Form.List name="lineas">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map((field) => {
                  const linea = lineasCotizacionWatch[field.name] ?? {};
                  const producto = linea.productoId
                    ? productoMap.get(Number(linea.productoId))
                    : undefined;
                  const cantidad = Number(linea.cantidad || 0);
                  const superaStock =
                    producto && cantidad > Number(producto.stockDisponible || 0);

                  return (
                    <div
                      key={field.key}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr,90px,130px,110px,130px,auto]">
                        <Form.Item
                          name={[field.name, "productoId"]}
                          label="Producto"
                          rules={[{ required: true, message: "Selecciona producto" }]}
                        >
                          <Select
                            showSearch
                            placeholder="Seleccionar producto"
                            optionFilterProp="label"
                            options={productoOptions}
                            onChange={(nextProductoId) => {
                              const selectedProduct = productoMap.get(Number(nextProductoId));
                              const current = cotizacionForm.getFieldValue("lineas") ?? [];
                              current[field.name] = {
                                ...current[field.name],
                                productoId: nextProductoId,
                                precioUnitario: selectedProduct?.precio ?? 0,
                                cantidad: current[field.name]?.cantidad ?? 1,
                                descuentoPct: current[field.name]?.descuentoPct ?? 0,
                              };
                              cotizacionForm.setFieldValue("lineas", [...current]);
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "cantidad"]}
                          label="Cantidad"
                          rules={[{ required: true, message: "Cantidad" }]}
                        >
                          <InputNumber min={1} className="w-full" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "precioUnitario"]}
                          label="Precio unit."
                        >
                          <InputNumber min={0} className="w-full" prefix="$" />
                        </Form.Item>
                        <Form.Item name={[field.name, "descuentoPct"]} label="Desc. %">
                          <InputNumber min={0} max={100} className="w-full" />
                        </Form.Item>
                        <div className="space-y-1">
                          <p className="text-xs text-beck-muted">Subtotal</p>
                          <p className="rounded-md border border-slate-200 bg-white px-2 py-[5px] text-right text-sm font-semibold tabular-nums">
                            {formatCLP(calculateLineSubtotal(linea))}
                          </p>
                        </div>
                        {cotizacionModalMode !== "ver" && (
                          <div className="flex items-end">
                            <Button danger onClick={() => remove(field.name)}>
                              Quitar
                            </Button>
                          </div>
                        )}
                      </div>

                      {producto && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <Tag color={producto.alertaStockBajo ? "red" : "green"}>
                            Stock disponible: {producto.stockDisponible}
                          </Tag>
                          {producto.alertaStockBajo && <Tag color="red">Stock bajo</Tag>}
                          {superaStock && (
                            <Alert
                              type="warning"
                              showIcon
                              className="py-1"
                              message="La cantidad supera el stock disponible"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {cotizacionModalMode !== "ver" && (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => add({ cantidad: 1, descuentoPct: 0 })}
                  >
                    Agregar producto
                  </Button>
                )}
              </div>
            )}
          </Form.List>

          <div className="mt-4 ml-auto w-full max-w-sm rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <b>{formatCLP(cotizacionTotals.subtotal)}</b>
            </div>
            <div className="mt-1 flex justify-between text-beck-muted">
              <span>Descuento</span>
              <b>{formatCLP(cotizacionTotals.descuento)}</b>
            </div>
            <div className="mt-1 flex justify-between">
              <span>IVA 19%</span>
              <b>{formatCLP(cotizacionTotals.iva)}</b>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
              <span>Total</span>
              <b className="text-firemat-primary">{formatCLP(cotizacionTotals.total)}</b>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FirematFunnel;
