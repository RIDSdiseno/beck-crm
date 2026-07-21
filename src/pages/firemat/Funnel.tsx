import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useAuth } from "../../context/useAuth";
import { usePermisos } from "../../hooks/usePermisos";
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { regionesComunasChile } from "../../data/regionesComunasChile";
import {
  MOTIVOS_DESCARTE,
  MOTIVOS_PERDIDA,
  MOTIVOS_POSTERGACION,
  normalizarMotivoSubmit,
  parseMotivoSelect,
} from "../../constants/motivosCierre";
import FunnelFirematDashboard from "./FunnelFirematDashboard";
import FunnelFirematCalendario from "../../components/FunnelFirematCalendario";
const FunnelBeck = React.lazy(() => import("../beck/Funnel"));
import {
  clientesFirematAPI,
  firematCotizacionesAPI,
  firematFunnelAPI,
  type ClienteFiremat,
  type ContactoClienteFiremat,
  type ContactoClienteFirematPayload,
  firematProductosAPI,
  type FirematCotizacion,
  type FirematCotizacionPayload,
  type FirematCotizacionTipoCliente,
  type FunnelFirematArchivo,
  type FunnelFirematArchivoTipo,
  type FirematFunnelEtapa,
  type FirematFunnelOportunidad,
  type FirematFunnelPayload,
  type FirematFunnelResumen,
  type HistorialEtapaFiremat,
  type ProductoFiremat,
  usuariosAPI,
  type UsuarioResumen,
} from "../../services/api";

const { Text } = Typography;

type ModalMode = "crear" | "editar" | "ver";

type FirematEditSection =
  | "prospecto"
  | "primer_contacto"
  | "desarrollo_cotizacion"
  | "cotizacion_enviada"
  | "orden_confirmada"
  | "ganada"
  | "perdida"
  | "postergada"
  | "descartado";

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
  clienteId?: string;
  clienteFirematId?: string;
  contactoId?: string;
  contactoFirematId?: string;
  cliente: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  tipoCliente?: FirematCotizacionTipoCliente;
  rutEmpresa?: string;
  region?: string;
  comuna?: string;
  unidadNegocio?: string;
  urgencia?: string;
  tipoUso?: string;
  necesidadSoporteTecnico?: boolean;
  esReactivacion?: boolean;
  alternativaProducto?: string;
  comision?: number;
  margenEstimado?: number;
  fechaComprometidaEnvio?: Dayjs | null;
  versionCotizacion?: string;
  comentariosCliente?: string;
  objeciones?: string;
  ordenCompra?: string;
  correoAceptacion?: string;
  condicionesComerciales?: string;
  coordinacionAdministrativa?: string;
  estadoDocumentacion?: string;
  traspasoAdministracion?: boolean;
  traspasoERP?: boolean;
  coordinacionDespacho?: string;
  estadoComercialOrden?: string;
  estadoDocumentacionVenta?: string;
  lineaProducto?: string;
  productoId?: number;
  cantidadEstimada?: number;
  descuento?: number | null;
  stockOportunidad?: string;
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
  motivoPerdidaDetalle?: string;
  motivoPostergacion?: string;
  motivoPostergacionDetalle?: string;
  fechaReactivacion?: Dayjs | null;
  documentoRespaldo?: string;
  flujoPosterior?: string;
  motivoDescarte?: string;
  motivoDescarteDetalle?: string;
  tipoBroker?: string;
  fechaEstimadaDespacho?: Dayjs | null;
  fechaSeguimientoPostventa?: Dayjs | null;
  nombreOportunidad?: string;
  cargoContacto?: string;
  direccionProyecto?: string;
  tipoOportunidad?: string;
  fechaProbableCierre?: Dayjs | null;
  riesgoTecnico?: string;
  comentariosInternos?: string;
  observacionesTecnicas?: string;
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
  { label: "Firmada", value: "ORDEN_CONFIRMADA", color: "#0891b2" },
  { label: "Ganada", value: "GANADA", color: "#16a34a" },
  { label: "Perdida", value: "PERDIDA", color: "#dc2626" },
  { label: "Postergada", value: "POSTERGADA", color: "#9333ea" },
  { label: "Descartado", value: "DESCARTADO", color: "#64748b" },
];


const ETAPAS_COMERCIALES: FirematFunnelEtapa[] = [
  "PROSPECTO",
  "PRIMER_CONTACTO",
  "DESARROLLO_COTIZACION",
  "COTIZACION_ENVIADA",
  "ORDEN_CONFIRMADA",
];

const ETAPAS_CIERRE_SIN_COLUMNA: FirematFunnelEtapa[] = [
  "PERDIDA",
  "POSTERGADA",
  "DESCARTADO",
];


const ETAPAS_KANBAN = ETAPAS.filter(
  (e) => !ETAPAS_CIERRE_SIN_COLUMNA.includes(e.value)
);


const UNIDAD_NEGOCIO_STRIP: Record<string, string> = {
  Beck: "bg-[#d6b02a] text-black",
  Firemat: "bg-red-600 text-white",
  Mixto: "bg-purple-600 text-white",
};

const getUnidadNegocioVisualLabel = (
  item: FirematFunnelOportunidad
): "BECK" | "FIREMAT" | "MIXTO" => {
  if (item.unidadNegocio === "Mixto") return "MIXTO";
  if (item.unidadNegocio === "Beck") return "BECK";
  return "FIREMAT";
};

const getUnidadNegocioStripClass = (label: string): string =>
  UNIDAD_NEGOCIO_STRIP[
    label === "BECK" ? "Beck" : label === "MIXTO" ? "Mixto" : "Firemat"
  ];

const CIERRE_BANNER: Partial<
  Record<FirematFunnelEtapa, { label: string; bannerClass: string; borderClass: string }>
> = {
  PERDIDA: {
    label: "PERDIDA",
    bannerClass: "bg-red-600",
    borderClass: "border-red-400 hover:border-red-500",
  },
  POSTERGADA: {
    label: "POSTERGADA",
    bannerClass: "bg-orange-500",
    borderClass: "border-orange-400 hover:border-orange-500",
  },
  DESCARTADO: {
    label: "DESCARTADA",
    bannerClass: "bg-slate-500",
    borderClass: "border-slate-400 hover:border-slate-500",
  },
};


const resolverEtapaComercialDesdeHistorial = (
  historial: HistorialEtapaFiremat[]
): FirematFunnelEtapa => {
  for (let i = historial.length - 1; i >= 0; i -= 1) {
    const etapaNueva = historial[i]?.etapaNueva as FirematFunnelEtapa | undefined;
    if (etapaNueva && ETAPAS_COMERCIALES.includes(etapaNueva)) {
      return etapaNueva;
    }
  }
  return "PROSPECTO";
};


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

const TIPO_BROKER_OPTIONS = [
  { label: "Instalador", value: "INSTALADOR" },
  { label: "Distribuidor", value: "DISTRIBUIDOR" },
  { label: "Comisionista", value: "COMISIONISTA" },
];

const STOCK_OPORTUNIDAD_OPTIONS = [
  { label: "Sí", value: "SI" },
  { label: "No", value: "NO" },
  { label: "Parcial", value: "PARCIAL" },
];

const withLegacyOption = (
  options: Array<{ label: string; value: string }>,
  value?: string | null
) => {
  if (!value || options.some((option) => option.value === value)) return options;
  return [...options, { label: value, value }];
};

const getOptionLabel = (
  options: Array<{ label: string; value: string }>,
  value?: string | null
) => options.find((option) => option.value === value)?.label ?? value ?? "-";

const ARCHIVO_FIREMAT_TIPO_OPTIONS: Array<{
  label: string;
  value: FunnelFirematArchivoTipo;
}> = [
  { label: "Orden de compra", value: "ORDEN_COMPRA" },
  { label: "Correo aceptación", value: "CORREO_ACEPTACION" },
  { label: "Documento respaldo", value: "DOCUMENTO_RESPALDO" },
  { label: "Cotización", value: "COTIZACION" },
  { label: "Ficha técnica", value: "FICHA_TECNICA" },
  { label: "Otro", value: "OTRO" },
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

const toCloudinaryDownloadUrl = (url?: string | null): string => {
  if (!url) return "";
  if (!url.includes("/image/upload/")) return url;
  if (url.includes("/upload/fl_attachment/")) return url;
  return url.replace("/upload/", "/upload/fl_attachment/");
};

const openArchivo = (url?: string | null) => {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const downloadArchivo = (url?: string | null) => {
  const downloadUrl = toCloudinaryDownloadUrl(url);
  if (!downloadUrl) return;
  window.open(downloadUrl, "_blank", "noopener,noreferrer");
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

const ETAPAS_CERRADAS: FirematFunnelEtapa[] = ["GANADA", "PERDIDA", "DESCARTADO", "POSTERGADA"];

const getProximasAccionesByEtapa = (etapa?: FirematFunnelEtapa): Array<{ label: string; value: string }> => {
  switch (etapa) {
    case "PROSPECTO":
      return [
        { label: "Agendar llamada de prospección", value: "Agendar llamada de prospección" },
        { label: "Enviar información inicial", value: "Enviar información inicial" },
        { label: "Visita presencial inicial", value: "Visita presencial inicial" },
        { label: "Otro", value: "Otro" },
      ];
    case "PRIMER_CONTACTO":
      return [
        { label: "Reunión de levantamiento", value: "Reunión de levantamiento" },
        { label: "Enviar ficha técnica", value: "Enviar ficha técnica" },
        { label: "Cotización pendiente", value: "Cotización pendiente" },
        { label: "Seguimiento por correo", value: "Seguimiento por correo" },
        { label: "Otro", value: "Otro" },
      ];
    case "DESARROLLO_COTIZACION":
      return [
        { label: "Preparar cotización", value: "Preparar cotización" },
        { label: "Revisión técnica interna", value: "Revisión técnica interna" },
        { label: "Validar stock y precios", value: "Validar stock y precios" },
        { label: "Otro", value: "Otro" },
      ];
    case "COTIZACION_ENVIADA":
      return [
        { label: "Seguimiento cotización enviada", value: "Seguimiento cotización enviada" },
        { label: "Resolver objeciones", value: "Resolver objeciones" },
        { label: "Negociación comercial", value: "Negociación comercial" },
        { label: "Esperar respuesta cliente", value: "Esperar respuesta cliente" },
        { label: "Otro", value: "Otro" },
      ];
    case "ORDEN_CONFIRMADA":
      return [
        { label: "Gestionar documentación", value: "Gestionar documentación" },
        { label: "Coordinar despacho", value: "Coordinar despacho" },
        { label: "Traspaso a administración", value: "Traspaso a administración" },
        { label: "Otro", value: "Otro" },
      ];
    default:
      return [
        { label: "Seguimiento", value: "Seguimiento" },
        { label: "Llamada", value: "Llamada" },
        { label: "Reunión", value: "Reunión" },
        { label: "Otro", value: "Otro" },
      ];
  }
};

const needsExtraFields = (etapa: FirematFunnelEtapa) =>
  etapa === "PERDIDA" ||
  etapa === "POSTERGADA" ||
  etapa === "GANADA" ||
  etapa === "DESCARTADO";

const getStageEditSection = (
  etapa: FirematFunnelEtapa
): FirematEditSection => {
  switch (etapa) {
    case "PROSPECTO":
      return "prospecto";
    case "PRIMER_CONTACTO":
      return "primer_contacto";
    case "DESARROLLO_COTIZACION":
      return "desarrollo_cotizacion";
    case "COTIZACION_ENVIADA":
      return "cotizacion_enviada";
    case "ORDEN_CONFIRMADA":
      return "orden_confirmada";
    case "GANADA":
      return "ganada";
    case "PERDIDA":
      return "perdida";
    case "POSTERGADA":
      return "postergada";
    case "DESCARTADO":
      return "descartado";
    default:
      return "prospecto";
  }
};

const getStageActionLabel = (etapa: FirematFunnelEtapa) => {
  switch (etapa) {
    case "PROSPECTO":
      return "Rellenar prospecto";
    case "PRIMER_CONTACTO":
      return "Rellenar primer contacto";
    case "DESARROLLO_COTIZACION":
      return "Rellenar desarrollo cotizacion";
    case "COTIZACION_ENVIADA":
      return "Rellenar seguimiento cotizacion";
    case "ORDEN_CONFIRMADA":
      return "Rellenar orden confirmada";
    case "GANADA":
      return "Rellenar cierre ganado";
    case "PERDIDA":
      return "Rellenar cierre perdido";
    case "POSTERGADA":
      return "Rellenar postergacion";
    case "DESCARTADO":
      return "Rellenar descarte";
    default:
      return "Rellenar etapa";
  }
};


const getCotizacionLabel = (cotizacion: FirematCotizacion) => {
  const numero = cotizacion.numero ?? cotizacion.id;
  return `#${numero} · ${cotizacion.cliente} · ${formatCLP(cotizacion.total)}`;
};

const getClienteFirematLabel = (cliente: ClienteFiremat) => {
  const nombre =
    cliente.nombreEmpresa?.trim() ||
    cliente.nombre?.trim() ||
    cliente.razonSocial?.trim() ||
    "Cliente sin nombre";
  return `${nombre} — ${cliente.rut?.trim() || "Sin RUT"}`;
};

const getClienteFirematNombre = (cliente: ClienteFiremat) =>
  cliente.nombreEmpresa?.trim() ||
  cliente.nombre?.trim() ||
  cliente.razonSocial?.trim() ||
  "";

const getClienteFirematTipo = (cliente: ClienteFiremat) => {
  const tipo = cliente.tipoCliente?.trim();
  const map: Record<string, FirematCotizacionTipoCliente> = {
    cliente_final: "CLIENTE_FINAL",
    broker: "BROKER",
    ferreteria: "FERRETERIA",
    redistribuidor: "REDISTRIBUIDOR",
    instalador: "INSTALADOR",
    comisionista: "COMISIONISTA",
    recompra: "RECOMPRA",
    CLIENTE_FINAL: "CLIENTE_FINAL",
    BROKER: "BROKER",
    FERRETERIA: "FERRETERIA",
    REDISTRIBUIDOR: "REDISTRIBUIDOR",
    INSTALADOR: "INSTALADOR",
    COMISIONISTA: "COMISIONISTA",
    RECOMPRA: "RECOMPRA",
  };
  return tipo ? map[tipo] : undefined;
};

const getArchivoFirematTipoLabel = (tipo?: string | null) =>
  ARCHIVO_FIREMAT_TIPO_OPTIONS.find((item) => item.value === tipo)?.label ??
  tipo ??
  "Archivo";

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
  dragDisabled: boolean;
  onViewDetail: (item: FirematFunnelOportunidad) => Promise<void> | void;
};

const FirematFunnelCard: React.FC<FirematFunnelCardProps> = ({
  item,
  productoNombre,
  dragDisabled,
  onViewDetail,
}) => {
  const cierreBanner = CIERRE_BANNER[item.etapa];
  const draggingEnabled =
    !dragDisabled && !cierreBanner && item.etapa !== "GANADA";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: !draggingEnabled,
    data: { oportunidad: item },
  });

  return (
    <article
      ref={setNodeRef}
      {...(draggingEnabled ? listeners : {})}
      {...(draggingEnabled ? attributes : {})}
      data-opportunity-id={item.id}
      className={`group cursor-pointer overflow-hidden rounded-lg border bg-white text-xs shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
        cierreBanner ? cierreBanner.borderClass : "border-slate-200 hover:border-orange-300"
      } ${isDragging ? "is-dragging opacity-30 ring-2 ring-orange-300" : ""}`}
      onClick={() => void onViewDetail(item)}
    >
      <div
        className={`flex h-[18px] items-center justify-center text-[8px] font-semibold uppercase tracking-[0.08em] select-none ${getUnidadNegocioStripClass(getUnidadNegocioVisualLabel(item))}`}
      >
        {getUnidadNegocioVisualLabel(item)}
      </div>
      {cierreBanner && (
        <div
          className={`px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-white select-none ${cierreBanner.bannerClass}`}
        >
          ━━━ {cierreBanner.label} ━━━
        </div>
      )}
      <div className="p-2">
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
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined />}
          className="mt-1 !px-0 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            void onViewDetail(item);
          }}
        >
          Ver detalle
        </Button>
      </div>
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
  dragDisabled: boolean;
  onViewDetail: (item: FirematFunnelOportunidad) => Promise<void> | void;
};

const FirematFunnelColumn: React.FC<FirematFunnelColumnProps> = ({
  column,
  productoMap,
  dragDisabled,
  onViewDetail,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.value,
    disabled: dragDisabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[420px] w-[220px] shrink-0 flex-col rounded-xl border p-3 transition-colors ${
        isOver
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
                dragDisabled={dragDisabled}
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


const FirematFunnel: React.FC<{
  alertaBell?: React.ReactNode;
  embedOportunidadId?: string | null;
  onEmbedClose?: () => void;
}> = ({ alertaBell, embedOportunidadId, onEmbedClose }) => {
  const location = useLocation();
  const pendingOportunidadId = useRef<string | null>(null);
  const lastOpenedAlertTs = useRef<number | null>(null);
  const embedOpenedIdRef = useRef<string | null>(null);
  const embedHasOpenedRef = useRef(false);
  const { canView: canViewFunnel, canEdit: canEditFunnelPerm } = usePermisos();
  const canCambiarEmpresaFiremat =
    canViewFunnel("firemat_cambiar_empresa") || canEditFunnelPerm("firemat_cambiar_empresa");
  const { user } = useAuth();
  const isAdminGlobal = user?.rol === "Administrador";
  const canEditFirematFunnel = isAdminGlobal || canEditFunnelPerm("firemat_funnel");
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [form] = Form.useForm<FunnelFormValues>();
  const [cotizacionForm] = Form.useForm<CotizacionFormValues>();
  const etapaWatch = Form.useWatch("etapa", form);
  const regionWatch = Form.useWatch("region", form);
  const motivoPerdidaWatch = Form.useWatch("motivoPerdida", form);
  const motivoPostergacionWatch = Form.useWatch("motivoPostergacion", form);
  const motivoDescarteWatch = Form.useWatch("motivoDescarte", form);
  const lineasCotizacionRaw = Form.useWatch("lineas", cotizacionForm);
  const lineasCotizacionWatch = useMemo(() => lineasCotizacionRaw ?? [], [lineasCotizacionRaw]);

  const [oportunidades, setOportunidades] = useState<FirematFunnelOportunidad[]>([]);
  const [resumen, setResumen] = useState<FirematFunnelResumen>(RESUMEN_VACIO);
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [cotizaciones, setCotizaciones] = useState<FirematCotizacion[]>([]);
  const [clientesFiremat, setClientesFiremat] = useState<ClienteFiremat[]>([]);
  const [contactosCliente, setContactosCliente] = useState<ContactoClienteFiremat[]>([]);
  const [archivosFiremat, setArchivosFiremat] = useState<FunnelFirematArchivo[]>([]);
  const [uploadingArchivo, setUploadingArchivo] = useState(false);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [usuariosComercialesFiremat, setUsuariosComercialesFiremat] = useState<
    UsuarioResumen[]
  >([]);
  const [usuariosComercialesFirematLoading, setUsuariosComercialesFirematLoading] =
    useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [contactoModalOpen, setContactoModalOpen] = useState(false);
  const [contactoSaving, setContactoSaving] = useState(false);
  const [contactoForm] = Form.useForm<ContactoClienteFirematPayload>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("crear");
  const [initialEditSection, setInitialEditSection] =
    useState<FirematEditSection | null>(null);
  const [targetEtapa, setTargetEtapa] = useState<FirematFunnelEtapa | null>(null);
  const [selected, setSelected] = useState<FirematFunnelOportunidad | null>(null);
  const [cotizacionModalOpen, setCotizacionModalOpen] = useState(false);
  const [cotizacionModalMode, setCotizacionModalMode] =
    useState<ModalMode>("crear");
  const [selectedCotizacion, setSelectedCotizacion] =
    useState<FirematCotizacion | null>(null);
  const [savingCotizacion, setSavingCotizacion] = useState(false);
  const [activeDragOpportunity, setActiveDragOpportunity] =
    useState<FirematFunnelOportunidad | null>(null);

  const [etapaComercialPorId, setEtapaComercialPorId] = useState<
    Record<string, FirematFunnelEtapa>
  >({});
  const etapaComercialEnCursoRef = useRef<Set<string>>(new Set());
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [cierreTipo, setCierreTipo] = useState<
    "" | "PERDIDA" | "POSTERGADA" | "DESCARTADO"
  >("");
  const [cierreMotivoPerdida, setCierreMotivoPerdida] = useState("");
  const [cierreMotivoPerdidaDetalle, setCierreMotivoPerdidaDetalle] = useState("");
  const [cierreMotivoPostergacion, setCierreMotivoPostergacion] = useState("");
  const [cierreMotivoPostergacionDetalle, setCierreMotivoPostergacionDetalle] = useState("");
  const [cierreFechaReactivacion, setCierreFechaReactivacion] = useState<Dayjs | null>(null);
  const [cierreMotivoDescarte, setCierreMotivoDescarte] = useState("");
  const [cierreMotivoDescarteDetalle, setCierreMotivoDescarteDetalle] = useState("");
  const [cierreObservacion, setCierreObservacion] = useState("");
  const [cierreSaving, setCierreSaving] = useState(false);

  const [viewMode, setViewMode] = useState<"funnel" | "calendario" | "dashboard">("funnel");
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [historialEtapas, setHistorialEtapas] = useState<HistorialEtapaFiremat[]>([]);
  const [historialEtapasLoading, setHistorialEtapasLoading] = useState(false);
  const [historialEtapasError, setHistorialEtapasError] = useState<string | null>(null);
  const [showClienteSelector, setShowClienteSelector] = useState(false);
  const [bloqueoModalOpen, setBloqueoModalOpen] = useState(false);
  const [bloqueoBloqueos, setBloqueoBloqueos] = useState<string[]>([]);
  const [bloqueoAdvertencias, setBloqueoAdvertencias] = useState<string[]>([]);
  const [bloqueoObservacion, setBloqueoObservacion] = useState("");
  const [bloqueoRetrying, setBloqueoRetrying] = useState(false);
  const [bloqueoEtapaPendiente, setBloqueoEtapaPendiente] = useState<{
    record: FirematFunnelOportunidad;
    nextEtapa: FirematFunnelEtapa;
    etapaOrigen: FirematFunnelEtapa;
  } | null>(null);
  const [advertenciaSuccessOpen, setAdvertenciaSuccessOpen] = useState(false);
  const [advertenciaSuccessItems, setAdvertenciaSuccessItems] = useState<string[]>([]);

  const [filterEstadoOportunidad, setFilterEstadoOportunidad] = useState<
    "" | "activas" | "ganadas" | "perdidas" | "postergadas" | "descartadas"
  >("");
  const [filterUnidadNegocio, setFilterUnidadNegocio] = useState<
    "Beck" | "Firemat" | "Mixto"
  >("Firemat");
  const [beckVisibleCount, setBeckVisibleCount] = useState(0);

  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        label: producto.nombre,
        value: producto.id,
      })),
    [productos]
  );

  const responsableFirematOptions = useMemo(
    () =>
      usuariosComercialesFiremat
        .filter((u) => u.nombre || u.email)
        .map((u) => ({
          value: u.nombre || u.email,
          label: u.nombre ? `${u.nombre} — ${u.email}` : u.email,
        })),
    [usuariosComercialesFiremat]
  );

  const responsableFirematFilterOption = (
    input: string,
    option?: { label?: React.ReactNode }
  ) => {
    if (!option) return false;
    const label = typeof option.label === "string" ? option.label : String(option.label ?? "");
    return label.toLowerCase().includes(input.toLowerCase());
  };

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

  const clienteOptions = useMemo(() => {
    return clientesFiremat.map((cliente) => ({
      label: getClienteFirematLabel(cliente),
      value: cliente.id,
      clienteId: cliente.id,
    }));
  }, [clientesFiremat]);

  const contactoOptions = useMemo(
    () =>
      contactosCliente
        .filter((contacto) => contacto.activo)
        .map((contacto) => ({
          label: contacto.cargo
            ? `${contacto.nombre} — ${contacto.cargo}`
            : contacto.nombre,
          value: contacto.nombre,
          contactoId: contacto.id,
        })),
    [contactosCliente]
  );

  const regionOptions = useMemo(
    () =>
      regionesComunasChile.map((region) => ({
        label: region.nombre,
        value: region.nombre,
      })),
    []
  );

  const comunaOptions = useMemo(
    () => {
      const comunas = regionWatch
        ? regionesComunasChile.find((region) => region.nombre === regionWatch)?.comunas ?? []
        : [];

      return comunas.map((comuna) => ({
        label: comuna,
        value: comuna,
      }));
    },
    [regionWatch]
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

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const [funnelResponse, cotizacionesResponse] = await Promise.all([
        firematFunnelAPI.listar({}),
        firematCotizacionesAPI.listar({}),
      ]);

      setOportunidades(funnelResponse.data);
      setResumen(funnelResponse.resumen);
      setCotizaciones(cotizacionesResponse.data);

      try {
        const productosResponse = await firematProductosAPI.listar({ activo: true });
        setProductos(productosResponse.data);
      } catch {
        setProductos([]);
      }
    } catch {
      void message.error("No se pudo cargar el funnel Firemat");
      setOportunidades([]);
      setResumen(RESUMEN_VACIO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const pendientes = oportunidades.filter(
      (o) =>
        ETAPAS_CIERRE_SIN_COLUMNA.includes(o.etapa) &&
        !(String(o.id) in etapaComercialPorId) &&
        !etapaComercialEnCursoRef.current.has(String(o.id))
    );
    if (pendientes.length === 0) return;

    pendientes.forEach((o) => etapaComercialEnCursoRef.current.add(String(o.id)));

    void Promise.all(
      pendientes.map(async (o) => {
        const id = String(o.id);
        try {
          const historial = await firematFunnelAPI.getHistorialEtapas(o.id);
          return [id, resolverEtapaComercialDesdeHistorial(historial)] as const;
        } catch {
          return [id, "PROSPECTO" as FirematFunnelEtapa] as const;
        } finally {
          etapaComercialEnCursoRef.current.delete(id);
        }
      })
    ).then((entries) => {
      setEtapaComercialPorId((current) => {
        const next = { ...current };
        for (const [id, etapaComercial] of entries) next[id] = etapaComercial;
        return next;
      });
    });
  }, [oportunidades, etapaComercialPorId]);

  useEffect(() => {
    const state = location.state as {
      oportunidadId?: string | number;
      alertNavigationTs?: number;
    } | null;
    const ts = state?.alertNavigationTs;
    const rawId = state?.oportunidadId;
    if (!ts || rawId == null) return;
    if (lastOpenedAlertTs.current === ts) return;
    lastOpenedAlertTs.current = ts;
    const id = String(rawId);
    if (oportunidades.length > 0) {
      const target = oportunidades.find((o) => String(o.id) === id);
      if (target) void openOportunidad(target, "ver");
    } else {
      pendingOportunidadId.current = id;
    }
  }, [location.state]);

  useEffect(() => {
    if (!pendingOportunidadId.current || oportunidades.length === 0) return;
    const id = pendingOportunidadId.current;
    pendingOportunidadId.current = null;
    const target = oportunidades.find((o) => String(o.id) === id);
    if (target) void openOportunidad(target, "ver");
  }, [oportunidades]);

  useEffect(() => {
    if (!embedOportunidadId) return;
    if (embedOpenedIdRef.current === embedOportunidadId) return;
    embedOpenedIdRef.current = embedOportunidadId;
    embedHasOpenedRef.current = false;
    void openOportunidad(
      { id: embedOportunidadId } as FirematFunnelOportunidad,
      "ver"
    ).then(() => {
      embedHasOpenedRef.current = true;
    });
  }, [embedOportunidadId]);


  useEffect(() => {
    if (!embedOportunidadId) return;
    if (modalOpen) {
      embedHasOpenedRef.current = true;
      return;
    }
    if (embedHasOpenedRef.current) {
      onEmbedClose?.();
    }
  }, [modalOpen, embedOportunidadId]);

  const loadUsuariosComercialesFiremat = useCallback(async () => {
    setUsuariosComercialesFirematLoading(true);
    try {
      const usuarios = await usuariosAPI.listarComercialesFiremat();
      setUsuariosComercialesFiremat(usuarios);
    } catch {
      void message.error("No se pudo cargar la lista de responsables comerciales");
    } finally {
      setUsuariosComercialesFirematLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsuariosComercialesFiremat();
  }, [loadUsuariosComercialesFiremat]);

  const cargarClientesActivos = useCallback(async () => {
    setClientesLoading(true);
    try {
      const clientes = await clientesFirematAPI.listar({ activo: true });
      setClientesFiremat(clientes);
    } catch {
      void message.error("No se pudieron cargar los clientes Firemat");
    } finally {
      setClientesLoading(false);
    }
  }, []);

  const cargarArchivosFiremat = useCallback(
    async (oportunidadId: string | number) => {
      try {
        const archivos = await firematFunnelAPI.listarArchivos(oportunidadId);
        setArchivosFiremat(archivos);
      } catch {
        setArchivosFiremat([]);
        void message.error("No se pudieron cargar los archivos");
      }
    },
    []
  );

  const seleccionarClienteFiremat = useCallback(
    async (clienteId: string, preservarDatosOportunidad = false) => {
      setClientesLoading(true);
      try {
        const cliente = await clientesFirematAPI.obtener(clienteId);
        const contactosActivos = (cliente.contactos ?? []).filter(
          (contacto) => contacto.activo
        );

        setSelectedClienteId(cliente.id);
        setContactosCliente(contactosActivos);
        form.setFieldsValue({
          clienteId: cliente.id,
          clienteFirematId: cliente.id,
          cliente: getClienteFirematNombre(cliente),
          telefono: cliente.telefono ?? "",
          correo: cliente.email ?? cliente.correo ?? "",
          tipoCliente: getClienteFirematTipo(cliente),
          rutEmpresa: preservarDatosOportunidad
            ? form.getFieldValue("rutEmpresa")
            : cliente.rut ?? "",
          region: preservarDatosOportunidad
            ? form.getFieldValue("region")
            : cliente.region ?? "",
          comuna: preservarDatosOportunidad
            ? form.getFieldValue("comuna")
            : cliente.comuna ?? "",
          direccionProyecto: preservarDatosOportunidad
            ? form.getFieldValue("direccionProyecto")
            : cliente.direccion ?? "",
          contacto: "",
          contactoId: undefined,
          contactoFirematId: undefined,
        });
        if (!preservarDatosOportunidad) {
          setShowClienteSelector(false);
        }
      } catch {
        void message.error("No se pudo cargar el cliente Firemat");
      } finally {
        setClientesLoading(false);
      }
    },
    [form]
  );

  const limpiarClienteFirematSeleccionado = useCallback(() => {
    setSelectedClienteId(null);
    setContactosCliente([]);
    form.setFieldsValue({
      clienteId: undefined,
      clienteFirematId: undefined,
      contactoId: undefined,
      contactoFirematId: undefined,
      contacto: "",
    });
  }, [form]);

  const abrirNuevoContacto = () => {
    contactoForm.resetFields();
    contactoForm.setFieldsValue({ activo: true, principal: false });
    setContactoModalOpen(true);
  };

  const guardarNuevoContacto = async (values: ContactoClienteFirematPayload) => {
    if (!selectedClienteId) return;
    setContactoSaving(true);
    try {
      await clientesFirematAPI.agregarContacto(selectedClienteId, values);
      const cliente = await clientesFirematAPI.obtener(selectedClienteId);
      const contactosActivos = (cliente.contactos ?? []).filter(
        (contacto) => contacto.activo
      );
      setContactosCliente(contactosActivos);
      setContactoModalOpen(false);
      contactoForm.resetFields();
      void message.success("Contacto agregado");
    } catch {
      void message.error("No se pudo agregar el contacto");
    } finally {
      setContactoSaving(false);
    }
  };

  const setFormFromOportunidad = (
    oportunidad: FirematFunnelOportunidad,
    etapaOverride?: FirematFunnelEtapa
  ) => {
    form.setFieldsValue({
      clienteId: oportunidad.clienteId ?? oportunidad.clienteFirematId ?? undefined,
      clienteFirematId: oportunidad.clienteFirematId ?? oportunidad.clienteId ?? undefined,
      cliente: oportunidad.cliente,
      contacto: oportunidad.contacto ?? "",
      telefono: oportunidad.telefono ?? "",
      correo: oportunidad.correo ?? "",
      tipoCliente: oportunidad.tipoCliente as FirematCotizacionTipoCliente | undefined,
      rutEmpresa: oportunidad.rutEmpresa ?? "",
      region: oportunidad.region ?? "",
      comuna: oportunidad.comuna ?? "",
      unidadNegocio: oportunidad.unidadNegocio ?? "",
      urgencia: oportunidad.urgencia ?? undefined,
      tipoUso: oportunidad.tipoUso ?? undefined,
      necesidadSoporteTecnico: oportunidad.necesidadSoporteTecnico ?? false,
      esReactivacion: oportunidad.esReactivacion ?? false,
      alternativaProducto: oportunidad.alternativaProducto ?? "",
      comision:
        oportunidad.comision !== null && oportunidad.comision !== undefined
          ? Number(oportunidad.comision)
          : undefined,
      margenEstimado:
        oportunidad.margenEstimado !== null && oportunidad.margenEstimado !== undefined
          ? Number(oportunidad.margenEstimado)
          : undefined,
      fechaComprometidaEnvio: oportunidad.fechaComprometidaEnvio
        ? dayjs(oportunidad.fechaComprometidaEnvio)
        : null,
      versionCotizacion: oportunidad.versionCotizacion ?? "",
      comentariosCliente: oportunidad.comentariosCliente ?? "",
      objeciones: oportunidad.objeciones ?? "",
      ordenCompra: oportunidad.ordenCompra ?? "",
      correoAceptacion: oportunidad.correoAceptacion ?? "",
      condicionesComerciales: oportunidad.condicionesComerciales ?? "",
      coordinacionAdministrativa: oportunidad.coordinacionAdministrativa ?? "",
      estadoDocumentacion: oportunidad.estadoDocumentacion ?? undefined,
      traspasoAdministracion: oportunidad.traspasoAdministracion ?? false,
      traspasoERP: oportunidad.traspasoERP ?? false,
      coordinacionDespacho: oportunidad.coordinacionDespacho ?? "",
      estadoComercialOrden: oportunidad.estadoComercialOrden ?? "",
      estadoDocumentacionVenta: oportunidad.estadoDocumentacionVenta ?? "",
      lineaProducto: oportunidad.lineaProducto ?? "",
      productoId: oportunidad.productoId ?? undefined,
      cantidadEstimada: Number(oportunidad.cantidadEstimada || 0) || undefined,
      descuento:
        oportunidad.descuento !== null && oportunidad.descuento !== undefined
          ? Number(oportunidad.descuento)
          : undefined,
      stockOportunidad: oportunidad.stockOportunidad ?? undefined,
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
      ...(() => {
        const p = parseMotivoSelect(oportunidad.motivoPerdida);
        const post = parseMotivoSelect(oportunidad.motivoPostergacion);
        const desc = parseMotivoSelect(oportunidad.motivoDescarte);
        return {
          motivoPerdida: p.select,
          motivoPerdidaDetalle: p.detalle,
          motivoPostergacion: post.select,
          motivoPostergacionDetalle: post.detalle,
          motivoDescarte: desc.select,
          motivoDescarteDetalle: desc.detalle,
        };
      })(),
      fechaReactivacion: oportunidad.fechaReactivacion
        ? dayjs(oportunidad.fechaReactivacion)
        : null,
      documentoRespaldo: oportunidad.documentoRespaldo ?? "",
      flujoPosterior: oportunidad.flujoPosterior ?? undefined,
      tipoBroker: oportunidad.tipoBroker ?? "",
      fechaEstimadaDespacho: oportunidad.fechaEstimadaDespacho
        ? dayjs(oportunidad.fechaEstimadaDespacho)
        : null,
      fechaSeguimientoPostventa: oportunidad.fechaSeguimientoPostventa
        ? dayjs(oportunidad.fechaSeguimientoPostventa)
        : null,
      nombreOportunidad: oportunidad.nombreOportunidad ?? "",
      cargoContacto: oportunidad.cargoContacto ?? "",
      direccionProyecto: oportunidad.direccionProyecto ?? "",
      tipoOportunidad: oportunidad.tipoOportunidad ?? undefined,
      fechaProbableCierre: oportunidad.fechaProbableCierre
        ? dayjs(oportunidad.fechaProbableCierre)
        : null,
      riesgoTecnico: oportunidad.riesgoTecnico ?? undefined,
      comentariosInternos: oportunidad.comentariosInternos ?? "",
      observacionesTecnicas: oportunidad.observacionesTecnicas ?? "",
    });

    const clienteId = oportunidad.clienteId ?? oportunidad.clienteFirematId;
    if (clienteId) {
      void seleccionarClienteFiremat(clienteId, true);
    } else {
      limpiarClienteFirematSeleccionado();
    }
  };

  const openCrear = () => {
    setSelected(null);
    setModalMode("crear");
    setInitialEditSection(null);
    setTargetEtapa(null);
    setSelectedClienteId(null);
    setContactosCliente([]);
    setShowClienteSelector(false);
    form.resetFields();
    form.setFieldsValue({
      etapa: "PROSPECTO",
      origen: "CRM",
      probabilidadCierre: 20,
    });
    setModalOpen(true);
    void cargarClientesActivos();
    if (usuariosComercialesFiremat.length === 0 && !usuariosComercialesFirematLoading) {
      void loadUsuariosComercialesFiremat();
    }
  };

  const ETAPA_HISTORIAL_LABELS_FIREMAT: Record<string, string> = {
    PROSPECTO: "Prospecto",
    PRIMER_CONTACTO: "Primer contacto",
    DESARROLLO_COTIZACION: "Desarrollo cotización",
    COTIZACION_ENVIADA: "Cotización enviada",
    ORDEN_CONFIRMADA: "Orden confirmada",
    GANADA: "Ganada",
    PERDIDA: "Perdida",
    POSTERGADA: "Postergada",
    DESCARTADO: "Descartado",
  };

  const formatEtapaFirematHistorial = (etapa: string | null): string => {
    if (!etapa) return "Sin etapa anterior";
    const key = etapa.toUpperCase();
    if (ETAPA_HISTORIAL_LABELS_FIREMAT[key]) return ETAPA_HISTORIAL_LABELS_FIREMAT[key];
    return etapa.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const loadHistorialEtapas = async (id: string | number) => {
    setHistorialEtapasLoading(true);
    setHistorialEtapasError(null);
    setHistorialEtapas([]);
    try {
      const data = await firematFunnelAPI.getHistorialEtapas(id);
      setHistorialEtapas(data);
    } catch {
      setHistorialEtapasError("No se pudo cargar el historial de etapas");
    } finally {
      setHistorialEtapasLoading(false);
    }
  };

  const openOportunidad = async (
    record: FirematFunnelOportunidad,
    mode: ModalMode,
    etapaOverride?: FirematFunnelEtapa,
    editSection?: FirematEditSection | null
  ) => {
    try {
      setModalMode(mode);
      setInitialEditSection(mode === "editar" ? editSection ?? null : null);
      setTargetEtapa(
        mode === "editar" && editSection && etapaOverride ? etapaOverride : null
      );
      setDetalleModalOpen(false);
      setShowClienteSelector(false);
      void cargarClientesActivos();
      const detalle = await firematFunnelAPI.obtener(record.id);
      setSelected(detalle);
      setFormFromOportunidad(detalle, etapaOverride);
      if (etapaOverride) {
        form.setFieldValue("etapa", etapaOverride);
      }
      if (mode === "ver" || mode === "editar" || editSection) {
        await cargarArchivosFiremat(detalle.id);
      }
      setModalOpen(true);
    } catch {
      setModalOpen(false);
      setInitialEditSection(null);
      setTargetEtapa(null);
      void message.error("No se pudo cargar la oportunidad");
    }
  };

  const openRellenarEtapa = async (record: FirematFunnelOportunidad) => {
    try {
      void cargarClientesActivos();
      const detalle = await firematFunnelAPI.obtener(record.id);
      setSelected(detalle);
      setFormFromOportunidad(detalle);
      await cargarArchivosFiremat(detalle.id);
      form.setFieldValue("etapa", detalle.etapa);
      setInitialEditSection(getStageEditSection(detalle.etapa));
      setTargetEtapa(detalle.etapa);
      setModalMode("editar");
      setShowClienteSelector(false);
      setModalOpen(true);
    } catch {
      setModalOpen(false);
      setInitialEditSection(null);
      setTargetEtapa(null);
      void message.error("No se pudo cargar la oportunidad");
    }
  };

  const handleUploadArchivoFiremat = async (
    file: File,
    tipo: FunnelFirematArchivoTipo
  ) => {
    if (!selected) return false;

    setUploadingArchivo(true);
    try {
      const nuevos = await firematFunnelAPI.subirArchivos(
        selected.id,
        tipo,
        [file],
        { etapa: targetEtapa ?? selected.etapa }
      );
      setArchivosFiremat((current) => [...nuevos, ...current]);
      void message.success("Archivo subido");
    } catch {
      void message.error("No se pudo subir el archivo");
    } finally {
      setUploadingArchivo(false);
    }

    return false;
  };

  const handleEliminarArchivoFiremat = async (archivoId: string | number) => {
    try {
      await firematFunnelAPI.eliminarArchivo(archivoId);
      setArchivosFiremat((current) =>
        current.filter((item) => item.id !== archivoId)
      );
      void message.success("Archivo eliminado");
    } catch {
      void message.error("No se pudo eliminar el archivo");
    }
  };

  const keepString = (
    value: string | undefined,
    fallback?: string | null
  ) => {
    const clean = value?.trim();
    if (clean) return clean;
    if (initialEditSection && fallback !== undefined) return fallback ?? null;
    return null;
  };

  const keepNumber = (
    value: number | undefined,
    fallback?: number | null
  ) => {
    if (value !== undefined && value !== null) return Number(value);
    if (initialEditSection && fallback !== undefined) return fallback ?? null;
    return null;
  };

  const keepBool = (
    value: boolean | undefined,
    fallback?: boolean | null
  ) => {
    if (value !== undefined && value !== null) return value;
    if (initialEditSection && fallback !== undefined) return fallback ?? null;
    return null;
  };

  const keepDate = (
    value: Dayjs | null | undefined,
    fallback?: string | null
  ) => {
    if (value) return value.format("YYYY-MM-DD");
    if (initialEditSection && fallback !== undefined) return fallback ?? null;
    return null;
  };

  const buildPayload = (values: FunnelFormValues): FirematFunnelPayload => ({
    clienteId: values.clienteId ?? selected?.clienteId ?? selectedClienteId,
    clienteFirematId:
      values.clienteFirematId ?? selected?.clienteFirematId ?? selectedClienteId,
    cliente: values.cliente?.trim() || selected?.cliente || "",
    contacto: keepString(values.contacto, selected?.contacto),
    telefono: keepString(values.telefono, selected?.telefono),
    correo: keepString(values.correo, selected?.correo),
    tipoCliente: values.tipoCliente ?? selected?.tipoCliente ?? null,
    rutEmpresa: keepString(values.rutEmpresa, selected?.rutEmpresa),
    region: keepString(values.region, selected?.region),
    comuna: keepString(values.comuna, selected?.comuna),
    unidadNegocio: keepString(values.unidadNegocio, selected?.unidadNegocio),
    urgencia: keepString(values.urgencia, selected?.urgencia),
    tipoUso: keepString(values.tipoUso, selected?.tipoUso),
    necesidadSoporteTecnico: keepBool(
      values.necesidadSoporteTecnico,
      selected?.necesidadSoporteTecnico
    ),
    esReactivacion: keepBool(values.esReactivacion, selected?.esReactivacion),
    alternativaProducto: keepString(
      values.alternativaProducto,
      selected?.alternativaProducto
    ),
    comision: keepNumber(values.comision, selected?.comision),
    margenEstimado: keepNumber(values.margenEstimado, selected?.margenEstimado),
    fechaComprometidaEnvio: keepDate(
      values.fechaComprometidaEnvio,
      selected?.fechaComprometidaEnvio
    ),
    versionCotizacion: keepString(
      values.versionCotizacion,
      selected?.versionCotizacion
    ),
    comentariosCliente: keepString(
      values.comentariosCliente,
      selected?.comentariosCliente
    ),
    objeciones: keepString(values.objeciones, selected?.objeciones),
    ordenCompra: keepString(values.ordenCompra, selected?.ordenCompra),
    correoAceptacion: keepString(
      values.correoAceptacion,
      selected?.correoAceptacion
    ),
    condicionesComerciales: keepString(
      values.condicionesComerciales,
      selected?.condicionesComerciales
    ),
    coordinacionAdministrativa: keepString(
      values.coordinacionAdministrativa,
      selected?.coordinacionAdministrativa
    ),
    estadoDocumentacion: keepString(
      values.estadoDocumentacion,
      selected?.estadoDocumentacion
    ),
    traspasoAdministracion: keepBool(
      values.traspasoAdministracion,
      selected?.traspasoAdministracion
    ),
    traspasoERP: keepBool(values.traspasoERP, selected?.traspasoERP),
    coordinacionDespacho: keepString(
      values.coordinacionDespacho,
      selected?.coordinacionDespacho
    ),
    estadoComercialOrden: keepString(
      values.estadoComercialOrden,
      selected?.estadoComercialOrden
    ),
    estadoDocumentacionVenta: keepString(
      values.estadoDocumentacionVenta,
      selected?.estadoDocumentacionVenta
    ),
    lineaProducto: keepString(values.lineaProducto, selected?.lineaProducto),
    productoId:
      values.productoId !== undefined && values.productoId !== null
        ? Number(values.productoId)
        : initialEditSection
          ? selected?.productoId ?? null
          : null,
    cantidadEstimada: keepNumber(
      values.cantidadEstimada,
      selected?.cantidadEstimada
    ),
    descuento: keepNumber(values.descuento ?? undefined, selected?.descuento),
    stockOportunidad: keepString(
      values.stockOportunidad,
      selected?.stockOportunidad
    ),
    responsable: keepString(values.responsable, selected?.responsable),
    etapa: targetEtapa ?? values.etapa ?? selected?.etapa,
    montoEstimado: keepNumber(values.montoEstimado, selected?.montoEstimado),
    probabilidadCierre: keepNumber(
      values.probabilidadCierre,
      selected?.probabilidadCierre
    ),
    proximaAccion: keepString(values.proximaAccion, selected?.proximaAccion),
    fechaProximaAccion: keepDate(
      values.fechaProximaAccion,
      selected?.fechaProximaAccion
    ),
    observaciones: keepString(values.observaciones, selected?.observaciones),
    origen: keepString(values.origen, selected?.origen),
    cotizacionId:
      values.cotizacionId !== undefined && values.cotizacionId !== null
        ? values.cotizacionId
        : initialEditSection
          ? selected?.cotizacionId ?? null
          : null,
    motivoPerdida: keepString(
      normalizarMotivoSubmit(values.motivoPerdida, values.motivoPerdidaDetalle) || undefined,
      selected?.motivoPerdida
    ),
    motivoPostergacion: keepString(
      normalizarMotivoSubmit(values.motivoPostergacion, values.motivoPostergacionDetalle) || undefined,
      selected?.motivoPostergacion
    ),
    fechaReactivacion: keepDate(
      values.fechaReactivacion,
      selected?.fechaReactivacion
    ),
    documentoRespaldo: keepString(
      values.documentoRespaldo,
      selected?.documentoRespaldo
    ),
    flujoPosterior: keepString(values.flujoPosterior, selected?.flujoPosterior),
    motivoDescarte: keepString(
      normalizarMotivoSubmit(values.motivoDescarte, values.motivoDescarteDetalle) || undefined,
      selected?.motivoDescarte
    ),
    tipoBroker: keepString(values.tipoBroker, selected?.tipoBroker),
    fechaEstimadaDespacho: keepDate(
      values.fechaEstimadaDespacho,
      selected?.fechaEstimadaDespacho
    ),
    fechaSeguimientoPostventa: keepDate(
      values.fechaSeguimientoPostventa,
      selected?.fechaSeguimientoPostventa
    ),
    nombreOportunidad: keepString(values.nombreOportunidad, selected?.nombreOportunidad),
    cargoContacto: keepString(values.cargoContacto, selected?.cargoContacto),
    direccionProyecto: keepString(values.direccionProyecto, selected?.direccionProyecto),
    tipoOportunidad: keepString(values.tipoOportunidad, selected?.tipoOportunidad),
    fechaProbableCierre: keepDate(values.fechaProbableCierre, selected?.fechaProbableCierre),
    riesgoTecnico: keepString(values.riesgoTecnico, selected?.riesgoTecnico),
    comentariosInternos: keepString(values.comentariosInternos, selected?.comentariosInternos),
    observacionesTecnicas: keepString(values.observacionesTecnicas, selected?.observacionesTecnicas),
    observacionCamposFaltantes: selected?.observacionCamposFaltantes ?? null,
  });

  type FirematBloqueoError = { message: string; bloqueos: string[]; advertencias: string[]; puedeAvanzar: false };

  const isBloqueoError = (err: unknown): err is { response: { status: 409; data: FirematBloqueoError } } => {
    const e = err as { response?: { status?: number; data?: { bloqueos?: unknown; puedeAvanzar?: unknown } } };
    return (
      e?.response?.status === 409 &&
      (Array.isArray(e?.response?.data?.bloqueos) || e?.response?.data?.puedeAvanzar === false)
    );
  };

  const is409 = (err: unknown): boolean => {
    const e = err as { response?: { status?: number } };
    return e?.response?.status === 409;
  };

  const openBloqueoModal = (
    data: FirematBloqueoError,
    pendiente?: { record: FirematFunnelOportunidad; nextEtapa: FirematFunnelEtapa; etapaOrigen: FirematFunnelEtapa }
  ) => {
    setBloqueoBloqueos(data.bloqueos ?? []);
    setBloqueoAdvertencias(data.advertencias ?? []);
    setBloqueoObservacion("");
    setBloqueoEtapaPendiente(pendiente ?? null);
    setBloqueoModalOpen(true);
  };

  const validateStageRequirements = (values: FunnelFormValues) => {
    if (values.etapa === "PERDIDA") {
      if (!values.motivoPerdida?.trim()) {
        void message.error("Ingresa el motivo de pérdida");
        return false;
      }
      if (values.motivoPerdida === "Otro" && !values.motivoPerdidaDetalle?.trim()) {
        void message.error("Debe especificar el motivo.");
        return false;
      }
    }
    if (values.etapa === "POSTERGADA") {
      if (!values.motivoPostergacion?.trim() || !values.fechaReactivacion) {
        void message.error("Ingresa motivo de postergación y fecha de reactivación");
        return false;
      }
      if (values.motivoPostergacion === "Otro" && !values.motivoPostergacionDetalle?.trim()) {
        void message.error("Debe especificar el motivo.");
        return false;
      }
    }
    if (values.etapa === "DESCARTADO") {
      if (!values.motivoDescarte?.trim()) {
        void message.error("Ingresa el motivo de descarte");
        return false;
      }
      if (values.motivoDescarte === "Otro" && !values.motivoDescarteDetalle?.trim()) {
        void message.error("Debe especificar el motivo.");
        return false;
      }
    }
    if (values.etapa === "GANADA") {
      if (!values.documentoRespaldo?.trim()) {
        void message.error("Ingresa el documento de respaldo");
        return false;
      }
      if (!values.flujoPosterior?.trim()) {
        void message.error("Ingresa el flujo posterior (despacho, facturación, etc.)");
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
    if (modalMode === "crear" && !selectedClienteId && !values.cliente?.trim()) {
      void message.error("Selecciona un cliente registrado o ingresa un cliente no registrado");
      return;
    }
    if (!validateStageRequirements(values)) return;

    const payload = buildPayload(values);

    setSaving(true);
    try {
      let result;
      if (modalMode === "editar" && selected) {
        result = await firematFunnelAPI.actualizar(selected.id, payload);
      } else {
        result = await firematFunnelAPI.crear(payload);
      }
      setModalOpen(false);
      setSelected(null);
      setInitialEditSection(null);
      setTargetEtapa(null);
      setArchivosFiremat([]);
      limpiarClienteFirematSeleccionado();
      form.resetFields();
      await cargar();
      if (result?.advertencias?.length) {
        setAdvertenciaSuccessItems(result.advertencias);
        setAdvertenciaSuccessOpen(true);
      } else {
        void message.success(modalMode === "editar" ? "Oportunidad actualizada" : "Oportunidad creada");
      }
    } catch (error) {
      if (isBloqueoError(error)) {
        openBloqueoModal(error.response.data);
      } else if (is409(error)) {
        setBloqueoBloqueos(["No se puede completar la operación. Verifica los campos requeridos."]);
        setBloqueoAdvertencias([]);
        setBloqueoModalOpen(true);
      } else {
        const e400 = error as { response?: { status?: number; data?: { error?: string; detalles?: string[] } } };
        if (e400?.response?.status === 400 && e400?.response?.data?.error === "Motivo inválido") {
          const detalles = e400.response.data?.detalles?.join(", ") ?? "";
          void message.error(`Motivo inválido: ${detalles}`);
        } else {
          void message.error("No se pudo guardar la oportunidad");
        }
      }
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
      void openOportunidad(
        record,
        "editar",
        nextEtapa,
        getStageEditSection(nextEtapa)
      );
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
      if (updated?.advertencias?.length) {
        setAdvertenciaSuccessItems(updated.advertencias);
        setAdvertenciaSuccessOpen(true);
      } else {
        void message.success("Etapa actualizada");
      }
    } catch (error) {
      setOportunidades((current) =>
        current.map((item) =>
          item.id === record.id ? { ...item, etapa: etapaOrigen } : item
        )
      );
      setSelected((current) =>
        current?.id === record.id ? { ...current, etapa: etapaOrigen } : current
      );
      if (isBloqueoError(error)) {
        openBloqueoModal(error.response.data, { record, nextEtapa, etapaOrigen });
      } else if (is409(error)) {
        setBloqueoBloqueos(["No se puede cambiar la etapa. Verifica los campos requeridos."]);
        setBloqueoAdvertencias([]);
        setBloqueoObservacion("");
        setBloqueoEtapaPendiente({ record, nextEtapa, etapaOrigen });
        setBloqueoModalOpen(true);
      } else {
        void message.error("No se pudo cambiar la etapa");
      }
    }
  };

  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  const getOportunidadFromDragEvent = (
    event: DragStartEvent | DragEndEvent
  ): FirematFunnelOportunidad | null => {
    const data = event.active.data.current as
      | { oportunidad?: FirematFunnelOportunidad }
      | undefined;
    return (
      data?.oportunidad ??
      oportunidades.find((item) => String(item.id) === String(event.active.id)) ??
      null
    );
  };

  const handleDndDragStart = (event: DragStartEvent) => {
    if (!canEditFirematFunnel) return;
    setActiveDragOpportunity(getOportunidadFromDragEvent(event));
  };

  const handleDndDragEnd = (event: DragEndEvent) => {
    const etapaDestino = event.over?.id as FirematFunnelEtapa | undefined;
    const oportunidad = getOportunidadFromDragEvent(event);
    setActiveDragOpportunity(null);

    if (!canEditFirematFunnel || !oportunidad || !etapaDestino) return;
    if (!ETAPAS_KANBAN.some((stage) => stage.value === etapaDestino)) return;
    if (CIERRE_BANNER[oportunidad.etapa] || oportunidad.etapa === "GANADA") return;
    const etapaActual = oportunidad.etapa;
    if (etapaActual === etapaDestino) return;

    void handleCambiarEtapa(oportunidad, etapaDestino);
  };

  const handleDndDragCancel = () => {
    setActiveDragOpportunity(null);
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
    rutEmpresa: oportunidad.rutEmpresa ?? null,
    region: oportunidad.region ?? null,
    comuna: oportunidad.comuna ?? null,
    unidadNegocio: oportunidad.unidadNegocio ?? null,
    urgencia: oportunidad.urgencia ?? null,
    tipoUso: oportunidad.tipoUso ?? null,
    necesidadSoporteTecnico: oportunidad.necesidadSoporteTecnico ?? null,
    esReactivacion: oportunidad.esReactivacion ?? null,
    alternativaProducto: oportunidad.alternativaProducto ?? null,
    comision: oportunidad.comision ?? null,
    margenEstimado: oportunidad.margenEstimado ?? null,
    fechaComprometidaEnvio: oportunidad.fechaComprometidaEnvio ?? null,
    versionCotizacion: oportunidad.versionCotizacion ?? null,
    comentariosCliente: oportunidad.comentariosCliente ?? null,
    objeciones: oportunidad.objeciones ?? null,
    ordenCompra: oportunidad.ordenCompra ?? null,
    correoAceptacion: oportunidad.correoAceptacion ?? null,
    condicionesComerciales: oportunidad.condicionesComerciales ?? null,
    coordinacionAdministrativa: oportunidad.coordinacionAdministrativa ?? null,
    estadoDocumentacion: oportunidad.estadoDocumentacion ?? null,
    traspasoAdministracion: oportunidad.traspasoAdministracion ?? null,
    traspasoERP: oportunidad.traspasoERP ?? null,
    coordinacionDespacho: oportunidad.coordinacionDespacho ?? null,
    estadoComercialOrden: oportunidad.estadoComercialOrden ?? null,
    estadoDocumentacionVenta: oportunidad.estadoDocumentacionVenta ?? null,
    lineaProducto: oportunidad.lineaProducto ?? null,
    productoId: oportunidad.productoId ?? null,
    cantidadEstimada: oportunidad.cantidadEstimada ?? null,
    descuento: oportunidad.descuento ?? null,
    stockOportunidad: oportunidad.stockOportunidad ?? null,
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
    flujoPosterior: oportunidad.flujoPosterior ?? null,
    motivoDescarte: oportunidad.motivoDescarte ?? null,
    tipoBroker: oportunidad.tipoBroker ?? null,
    fechaEstimadaDespacho: oportunidad.fechaEstimadaDespacho ?? null,
    fechaSeguimientoPostventa: oportunidad.fechaSeguimientoPostventa ?? null,
    nombreOportunidad: oportunidad.nombreOportunidad ?? null,
    cargoContacto: oportunidad.cargoContacto ?? null,
    direccionProyecto: oportunidad.direccionProyecto ?? null,
    tipoOportunidad: oportunidad.tipoOportunidad ?? null,
    fechaProbableCierre: oportunidad.fechaProbableCierre ?? null,
    riesgoTecnico: oportunidad.riesgoTecnico ?? null,
    comentariosInternos: oportunidad.comentariosInternos ?? null,
    observacionesTecnicas: oportunidad.observacionesTecnicas ?? null,
  });

  const handleAbrirCierreFiremat = (record: FirematFunnelOportunidad) => {
    setCierreTipo("");
    setCierreMotivoPerdida("");
    setCierreMotivoPerdidaDetalle("");
    setCierreMotivoPostergacion("");
    setCierreMotivoPostergacionDetalle("");
    setCierreFechaReactivacion(null);
    setCierreMotivoDescarte("");
    setCierreMotivoDescarteDetalle("");
    setCierreObservacion(record.observaciones ?? "");
    setCierreModalOpen(true);
  };

  const handleConfirmarCierreFiremat = async () => {
    if (!selected) return;

    if (!cierreTipo) {
      void message.error("Selecciona el tipo de cierre");
      return;
    }

    if (cierreTipo === "PERDIDA") {
      if (!cierreMotivoPerdida) {
        void message.error("Ingresa el motivo de pérdida");
        return;
      }
      if (cierreMotivoPerdida === "Otro" && !cierreMotivoPerdidaDetalle.trim()) {
        void message.error("Debe especificar el motivo.");
        return;
      }
    }

    if (cierreTipo === "POSTERGADA") {
      if (!cierreMotivoPostergacion || !cierreFechaReactivacion) {
        void message.error("Ingresa motivo de postergación y fecha de reactivación");
        return;
      }
      if (cierreMotivoPostergacion === "Otro" && !cierreMotivoPostergacionDetalle.trim()) {
        void message.error("Debe especificar el motivo.");
        return;
      }
    }

    if (cierreTipo === "DESCARTADO") {
      if (!cierreMotivoDescarte) {
        void message.error("Ingresa el motivo de descarte");
        return;
      }
      if (cierreMotivoDescarte === "Otro" && !cierreMotivoDescarteDetalle.trim()) {
        void message.error("Debe especificar el motivo.");
        return;
      }
    }

    const payload: FirematFunnelPayload = {
      ...buildPayloadFromOportunidad(selected),
      etapa: cierreTipo,
      motivoPerdida:
        cierreTipo === "PERDIDA"
          ? normalizarMotivoSubmit(cierreMotivoPerdida, cierreMotivoPerdidaDetalle) || null
          : selected.motivoPerdida ?? null,
      motivoPostergacion:
        cierreTipo === "POSTERGADA"
          ? normalizarMotivoSubmit(cierreMotivoPostergacion, cierreMotivoPostergacionDetalle) || null
          : selected.motivoPostergacion ?? null,
      fechaReactivacion:
        cierreTipo === "POSTERGADA"
          ? cierreFechaReactivacion?.format("YYYY-MM-DD") ?? null
          : selected.fechaReactivacion ?? null,
      motivoDescarte:
        cierreTipo === "DESCARTADO"
          ? normalizarMotivoSubmit(cierreMotivoDescarte, cierreMotivoDescarteDetalle) || null
          : selected.motivoDescarte ?? null,
      observaciones: cierreObservacion.trim() || null,
    };

    setCierreSaving(true);
    try {
      const updated = await firematFunnelAPI.actualizar(selected.id, payload);
      setSelected(updated);
      setOportunidades((current) =>
        current.map((item) => (item.id === selected.id ? { ...item, ...updated } : item))
      );
      setCierreModalOpen(false);
      if (updated?.advertencias?.length) {
        setAdvertenciaSuccessItems(updated.advertencias);
        setAdvertenciaSuccessOpen(true);
      } else {
        void message.success("Oportunidad cerrada");
      }
    } catch (error) {
      if (isBloqueoError(error)) {
        openBloqueoModal(error.response.data);
      } else if (is409(error)) {
        setBloqueoBloqueos(["No se puede completar la operación. Verifica los campos requeridos."]);
        setBloqueoAdvertencias([]);
        setBloqueoModalOpen(true);
      } else {
        const e400 = error as { response?: { status?: number; data?: { error?: string; detalles?: string[] } } };
        if (e400?.response?.status === 400 && e400?.response?.data?.error === "Motivo inválido") {
          const detalles = e400.response.data?.detalles?.join(", ") ?? "";
          void message.error(`Motivo inválido: ${detalles}`);
        } else {
          void message.error("No se pudo cerrar la oportunidad");
        }
      }
    } finally {
      setCierreSaving(false);
    }
  };

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


  const getColumnaKanban = useCallback(
    (item: FirematFunnelOportunidad): FirematFunnelEtapa =>
      ETAPAS_CIERRE_SIN_COLUMNA.includes(item.etapa)
        ? etapaComercialPorId[String(item.id)] ?? "PROSPECTO"
        : item.etapa,
    [etapaComercialPorId]
  );

  const visibleOportunidades = useMemo(() => {
    if (!filterEstadoOportunidad) return oportunidades;

    if (filterEstadoOportunidad === "activas") {
      return oportunidades.filter((item) => !ETAPAS_CERRADAS.includes(item.etapa));
    }

    const etapaPorEstado: Record<string, FirematFunnelEtapa> = {
      ganadas: "GANADA",
      perdidas: "PERDIDA",
      postergadas: "POSTERGADA",
      descartadas: "DESCARTADO",
    };
    const etapaObjetivo = etapaPorEstado[filterEstadoOportunidad];
    return oportunidades.filter((item) => item.etapa === etapaObjetivo);
  }, [oportunidades, filterEstadoOportunidad]);

  const groupedByEtapa = useMemo(
    () =>
      ETAPAS_KANBAN.map((stage) => {
        const items = visibleOportunidades.filter(
          (item) => getColumnaKanban(item) === stage.value
        );
        return {
          ...stage,
          items,
          total: items.reduce((acc, item) => acc + Number(item.montoEstimado || 0), 0),
        };
      }),
    [visibleOportunidades, getColumnaKanban]
  );

  const modalReadOnly = modalMode === "ver";
  const isFocusedStageEdit = modalMode === "editar" && Boolean(initialEditSection);
  const isCreateMode = modalMode === "crear";
  const isFullEditMode = modalMode === "editar" && !initialEditSection;
  const modalWidth =
    modalReadOnly
      ? "min(920px, 95vw)"
      : isFullEditMode
      ? "min(960px, 95vw)"
      : "min(720px, 95vw)";

  const renderIdentityFields = () => (
    <>
      <Form.Item name="clienteId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="clienteFirematId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="contactoId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="contactoFirematId" hidden>
        <Input />
      </Form.Item>
    </>
  );

  const renderContactoField = () => (
    <Form.Item name="contacto" label={<>Nombre de contacto <span className="text-red-500">*</span></>}>
      {selectedClienteId ? (
        <div className="space-y-2">
          {contactoOptions.length ? (
            <Select
              options={contactoOptions}
              placeholder="Seleccionar contacto"
              allowClear
              onChange={(_, option) => {
                const selectedOption = Array.isArray(option) ? option[0] : option;
                const contactoId =
                  typeof selectedOption === "object" && selectedOption
                    ? (selectedOption as { contactoId?: string }).contactoId
                    : undefined;
                const contacto = contactosCliente.find(
                  (item) => item.id === contactoId
                );
                if (!contacto) {
                  form.setFieldsValue({
                    contacto: "",
                    contactoId: undefined,
                    contactoFirematId: undefined,
                  });
                  return;
                }

                form.setFieldsValue({
                  contactoId: contacto.id,
                  contactoFirematId: contacto.id,
                  contacto: contacto.nombre,
                  telefono: contacto.telefono || form.getFieldValue("telefono"),
                  correo: contacto.correo || form.getFieldValue("correo"),
                });
              }}
            />
          ) : (
            <Text type="secondary">Este cliente no tiene contactos registrados</Text>
          )}
          <Button
            size="small"
            type="link"
            icon={<PlusOutlined />}
            onClick={abrirNuevoContacto}
            className="!px-0"
          >
            Nuevo contacto
          </Button>
        </div>
      ) : (
        <Input placeholder="Nombre contacto" />
      )}
    </Form.Item>
  );

  const isEtapaActiva = !ETAPAS_CERRADAS.includes(etapaWatch as FirematFunnelEtapa);

  const renderProximaAccionField = () => (
    <Form.Item
      name="proximaAccion"
      label="Próxima actividad"
      rules={[{ required: isEtapaActiva, message: "La próxima actividad es requerida" }]}
    >
      <Select
        allowClear
        placeholder="Seleccionar próxima actividad"
        options={getProximasAccionesByEtapa(etapaWatch as FirematFunnelEtapa)}
      />
    </Form.Item>
  );

  const renderFechaProximaAccionField = () => (
    <Form.Item
      name="fechaProximaAccion"
      label="Fecha próxima acción"
      rules={[{ required: isEtapaActiva, message: "La fecha de próxima acción es requerida" }]}
    >
      <DatePicker format="DD-MM-YYYY" className="w-full" />
    </Form.Item>
  );

  const renderArchivoTipoRow = (
    tipo: FunnelFirematArchivoTipo,
    titulo: string
  ) => {
    const archivo = archivosFiremat.find((item) => item.tipo === tipo);

    return (
      <div
        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
        title={getArchivoFirematTipoLabel(tipo)}
      >
        <div className="min-w-0">
          <p className="font-medium text-beck-ink">{titulo}</p>
          <p className="break-words text-xs text-beck-muted">
            {archivo
              ? archivo.nombreArchivo || "Archivo adjunto"
              : "Sin archivos adjuntos"}
          </p>
        </div>
        <Space wrap>
          <Upload
            beforeUpload={(file) => handleUploadArchivoFiremat(file, tipo)}
            showUploadList={false}
            multiple={false}
          >
            <Button size="small" loading={uploadingArchivo} icon={<PaperClipOutlined />}>
              Subir
            </Button>
          </Upload>
          {archivo && (
            <>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => openArchivo(archivo.url)}
              >
                Ver
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadArchivo(archivo.url)}
              >
                Descargar
              </Button>
              <Popconfirm
                title="Eliminar archivo"
                description="Esta acción eliminará el archivo adjunto."
                okText="Eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={() => void handleEliminarArchivoFiremat(archivo.id)}
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  Eliminar
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </div>
    );
  };

  const renderArchivosEdicionFields = () => (
    <div className="rounded-lg border border-[#ead7d2] bg-[#fff7f5] p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
        Documentos de la oportunidad
      </p>
      <div className="space-y-2">
        {renderArchivoTipoRow("ORDEN_COMPRA", "Orden de compra")}
        {renderArchivoTipoRow("CORREO_ACEPTACION", "Correo de aceptación")}
        {renderArchivoTipoRow("DOCUMENTO_RESPALDO", "Documento respaldo")}
        {renderArchivoTipoRow("COTIZACION", "Cotización")}
        {renderArchivoTipoRow("FICHA_TECNICA", "Ficha técnica")}
        {renderArchivoTipoRow("OTRO", "Otro documento")}
      </div>
    </div>
  );

  const renderProspectoFields = () => {
    const hasClienteData = !isCreateMode && Boolean(selected?.cliente?.trim());
    const shouldShowSummary = hasClienteData && !showClienteSelector;

    return (
    <>
      {renderIdentityFields()}
      {shouldShowSummary ? (
        <div className="mb-4 rounded-lg border border-[#ead7d2] bg-[#fff7f5] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-beck-muted">
              Cliente / datos del prospecto
            </p>
            <Button
              size="small"
              type="link"
              onClick={() => setShowClienteSelector(true)}
              disabled={!canCambiarEmpresaFiremat}
              title={!canCambiarEmpresaFiremat ? "No tienes permiso para cambiar empresa" : undefined}
              className="!px-0 text-xs"
            >
              Cambiar cliente
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {(form.getFieldValue("cliente") as string | undefined) && (
              <div>
                <span className="text-beck-muted">Cliente / empresa:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("cliente") as string}</p>
              </div>
            )}
            {(form.getFieldValue("rutEmpresa") as string | undefined) && (
              <div>
                <span className="text-beck-muted">RUT empresa:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("rutEmpresa") as string}</p>
              </div>
            )}
            {(form.getFieldValue("contacto") as string | undefined) && (
              <div>
                <span className="text-beck-muted">Contacto:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("contacto") as string}</p>
              </div>
            )}
            {(form.getFieldValue("telefono") as string | undefined) && (
              <div>
                <span className="text-beck-muted">Teléfono:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("telefono") as string}</p>
              </div>
            )}
            {(form.getFieldValue("correo") as string | undefined) && (
              <div>
                <span className="text-beck-muted">Correo:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("correo") as string}</p>
              </div>
            )}
            {(form.getFieldValue("region") as string | undefined) && (
              <div>
                <span className="text-beck-muted">Región:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("region") as string}</p>
              </div>
            )}
            {(form.getFieldValue("comuna") as string | undefined) && (
              <div>
                <span className="text-beck-muted">Comuna:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("comuna") as string}</p>
              </div>
            )}
            {(form.getFieldValue("direccionProyecto") as string | undefined) && (
              <div className="col-span-2">
                <span className="text-beck-muted">Dirección / ubicación del proyecto:</span>
                <p className="font-medium text-beck-ink">{form.getFieldValue("direccionProyecto") as string}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-[#ead7d2] bg-[#fff7f5] p-3">
          {hasClienteData && (
            <div className="mb-2 flex justify-end">
              <Button
                size="small"
                type="link"
                disabled={!canCambiarEmpresaFiremat}
                title={!canCambiarEmpresaFiremat ? "No tienes permiso para cambiar empresa" : undefined}
                onClick={() => setShowClienteSelector(false)}
                className="!px-0 text-xs"
              >
                Cancelar
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,auto] md:items-end">
            <Form.Item label="Cliente Firemat registrado (opcional)" className="mb-0">
              <Select
                showSearch
                allowClear
                loading={clientesLoading}
                value={selectedClienteId ?? undefined}
                options={clienteOptions}
                optionFilterProp="label"
                placeholder={
                  canCambiarEmpresaFiremat
                    ? "Seleccionar cliente por RUT, nombre o razon social"
                    : "No tienes permiso para cambiar empresa"
                }
                disabled={!canCambiarEmpresaFiremat}
                onClear={() => {
                  limpiarClienteFirematSeleccionado();
                  form.setFieldValue("cliente", "");
                }}
                onChange={(clienteId) => {
                  if (clienteId) {
                    void seleccionarClienteFiremat(String(clienteId));
                    return;
                  }
                  limpiarClienteFirematSeleccionado();
                }}
              />
            </Form.Item>
            {selectedClienteId && (
              <Button onClick={limpiarClienteFirematSeleccionado}>
                Quitar cliente asociado
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {selected?.clienteRegistrado === true ? (
          <Form.Item name="cliente" hidden><Input /></Form.Item>
        ) : (
          <Form.Item
            name="cliente"
            label={<>Cliente no registrado <span className="text-red-500">*</span></>}
            rules={[
              {
                validator: (_, value: string) => {
                  if (selectedClienteId || value?.trim()) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Ingresa el cliente o selecciona uno registrado")
                  );
                },
              },
            ]}
          >
            <Input
              placeholder={
                !canCambiarEmpresaFiremat
                  ? "No tienes permiso para cambiar empresa"
                  : "Nombre cliente no registrado"
              }
              disabled={Boolean(selectedClienteId) || !canCambiarEmpresaFiremat}
            />
          </Form.Item>
        )}
        {renderContactoField()}
        <Form.Item name="cargoContacto" label="Cargo del contacto">
          <Input placeholder="Cargo o rol del contacto" />
        </Form.Item>
        <Form.Item name="responsable" label={<>Responsable comercial <span className="text-red-500">*</span></>}>
          <Select
            showSearch
            allowClear
            loading={usuariosComercialesFirematLoading}
            placeholder="Selecciona un responsable"
            filterOption={responsableFirematFilterOption}
            options={withLegacyOption(responsableFirematOptions, form.getFieldValue("responsable"))}
          />
        </Form.Item>
        <Form.Item name="telefono" label={<>Teléfono <span className="text-red-500">*</span></>} extra="Debe existir teléfono o correo">
          <Input placeholder="+56..." />
        </Form.Item>
        <Form.Item name="correo" label={<>Correo <span className="text-red-500">*</span></>} extra="Debe existir teléfono o correo">
          <Input placeholder="correo@empresa.cl" />
        </Form.Item>
        <Form.Item name="tipoCliente" label="Tipo de cliente">
          <Select options={TIPO_CLIENTE_OPTIONS} placeholder="Tipo" allowClear />
        </Form.Item>
        <Form.Item name="rutEmpresa" label={<>RUT empresa <span className="text-red-500">*</span></>}>
          <Input placeholder="76.123.456-7" />
        </Form.Item>
        <Form.Item name="region" label="Region">
          <Select
            showSearch
            allowClear
            placeholder="Seleccionar region"
            options={regionOptions}
            optionFilterProp="label"
            onChange={() => {
              form.setFieldValue("comuna", undefined);
            }}
          />
        </Form.Item>
        <Form.Item name="comuna" label="Comuna">
          <Select
            showSearch
            allowClear
            placeholder="Seleccionar comuna"
            options={comunaOptions}
            optionFilterProp="label"
            disabled={!regionWatch}
          />
        </Form.Item>
        <Form.Item name="direccionProyecto" label="Dirección / ubicación del proyecto">
          <Input placeholder="Dirección, sector o ubicación" />
        </Form.Item>
        <Form.Item name="unidadNegocio" label={<>Unidad de negocio <span className="text-red-500">*</span></>}>
          <Select
            placeholder="Seleccionar unidad de negocio"
            options={[
              { value: "Beck", label: "Beck" },
              { value: "Firemat", label: "Firemat" },
              { value: "Mixto", label: "Mixto" },
            ]}
          />
        </Form.Item>
        <Form.Item name="nombreOportunidad" label={<>Nombre del proyecto u oportunidad <span className="text-red-500">*</span></>}>
          <Input placeholder="Nombre del proyecto o descripción de la oportunidad" />
        </Form.Item>
        <Form.Item name="lineaProducto" label="Linea de producto">
          <Input placeholder="Linea de producto" />
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
        <Form.Item name="descuento" label="Descuento aplicado">
          <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
        </Form.Item>
        <Form.Item name="stockOportunidad" label="Stock disponible">
          <Select
            allowClear
            placeholder="Seleccionar stock"
            options={STOCK_OPORTUNIDAD_OPTIONS}
          />
        </Form.Item>
        <Form.Item name="tipoBroker" label="Tipo broker">
          <Select
            allowClear
            showSearch
            placeholder="Seleccionar tipo de broker"
            options={TIPO_BROKER_OPTIONS}
            optionFilterProp="label"
          />
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
        {renderProximaAccionField()}
        {renderFechaProximaAccionField()}
        <Form.Item name="origen" label="Origen">
          <Input placeholder="CRM, web, referido..." />
        </Form.Item>
        <Form.Item name="observaciones" label="Observaciones" className="md:col-span-2">
          <Input.TextArea rows={4} placeholder="Notas comerciales" />
        </Form.Item>
        <Form.Item name="tipoOportunidad" label="Tipo de oportunidad">
          <Select
            allowClear
            placeholder="Seleccionar tipo"
            options={[
              { label: "Nueva venta", value: "NUEVA_VENTA" },
              { label: "Recompra", value: "RECOMPRA" },
              { label: "Ampliación", value: "AMPLIACION" },
              { label: "Proyecto", value: "PROYECTO" },
              { label: "Servicio técnico", value: "SERVICIO_TECNICO" },
            ]}
          />
        </Form.Item>
        <Form.Item name="fechaProbableCierre" label="Fecha probable de cierre">
          <DatePicker format="DD-MM-YYYY" className="w-full" />
        </Form.Item>
        <Form.Item name="riesgoTecnico" label="Riesgo técnico">
          <Select
            allowClear
            placeholder="Seleccionar riesgo"
            options={[
              { label: "Bajo", value: "BAJO" },
              { label: "Medio", value: "MEDIO" },
              { label: "Alto", value: "ALTO" },
            ]}
          />
        </Form.Item>
        <Form.Item name="comentariosInternos" label="Comentarios internos" className="md:col-span-2">
          <Input.TextArea rows={3} placeholder="Notas internas del equipo (no visibles para el cliente)" />
        </Form.Item>
        <Form.Item name="observacionesTecnicas" label="Observaciones técnicas" className="md:col-span-2">
          <Input.TextArea rows={3} placeholder="Detalles técnicos de la oportunidad" />
        </Form.Item>
      </div>
    </>
    );
  };

  const renderPrimerContactoFields = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Form.Item name="urgencia" label="Urgencia">
        <Select
          allowClear
          placeholder="Seleccionar urgencia"
          options={[
            { label: "Inmediata", value: "INMEDIATA" },
            { label: "1-3 meses", value: "1-3 MESES" },
            { label: "3-6 meses", value: "3-6 MESES" },
            { label: "+6 meses", value: "+6 MESES" },
          ]}
        />
      </Form.Item>
      <Form.Item name="tipoUso" label="Tipo de uso">
        <Select
          allowClear
          placeholder="Seleccionar tipo de uso"
          options={[
            { label: "Propio", value: "PROPIO" },
            { label: "Arriendo", value: "ARRIENDO" },
            { label: "Mixto", value: "MIXTO" },
          ]}
        />
      </Form.Item>
      <Form.Item name="necesidadSoporteTecnico" label="Soporte tecnico">
        <Select
          allowClear
          placeholder="Requiere soporte tecnico?"
          options={[
            { label: "Si", value: true },
            { label: "No", value: false },
          ]}
        />
      </Form.Item>
      <Form.Item name="esReactivacion" label="Cliente antiguo reactivado">
        <Select
          allowClear
          placeholder="¿Es cliente reactivado?"
          options={[
            { label: "Sí", value: true },
            { label: "No", value: false },
          ]}
        />
      </Form.Item>
      {renderProximaAccionField()}
      {renderFechaProximaAccionField()}
      <Form.Item name="observaciones" label="Observaciones" className="md:col-span-2">
        <Input.TextArea rows={4} placeholder="Notas comerciales" />
      </Form.Item>
    </div>
  );

  const renderDesarrolloCotizacionFields = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Form.Item name="lineaProducto" label="Linea de producto">
        <Input placeholder="Linea de producto" />
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
      <Form.Item name="descuento" label="Descuento aplicado">
        <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
      </Form.Item>
      <Form.Item name="stockOportunidad" label="Stock disponible">
        <Select
          allowClear
          placeholder="Seleccionar stock"
          options={STOCK_OPORTUNIDAD_OPTIONS}
        />
      </Form.Item>
      <Form.Item name="alternativaProducto" label="Alternativa de producto">
        <Input.TextArea
          rows={2}
          placeholder="Producto alternativo o solucion sugerida"
        />
      </Form.Item>
      <Form.Item name="comision" label="Comision (%)">
        <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
      </Form.Item>
      <Form.Item name="margenEstimado" label="Margen estimado (%)">
        <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
      </Form.Item>
      <Form.Item name="fechaComprometidaEnvio" label="Fecha comprometida de envio">
        <DatePicker format="DD-MM-YYYY" className="w-full" />
      </Form.Item>
      <Form.Item name="versionCotizacion" label="Version cotizacion">
        <Input placeholder="Ej: v1, v2, v3" />
      </Form.Item>
      <Form.Item name="comentariosCliente" label="Comentarios del cliente" className="md:col-span-2">
        <Input.TextArea rows={2} placeholder="Comentarios recibidos del cliente" />
      </Form.Item>
      <Form.Item name="objeciones" label="Objeciones" className="md:col-span-2">
        <Input.TextArea rows={2} placeholder="Precio, plazo, stock, competencia..." />
      </Form.Item>
      <Form.Item name="probabilidadCierre" label="Probabilidad cierre">
        <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
      </Form.Item>
      {renderProximaAccionField()}
      {renderFechaProximaAccionField()}
      <Form.Item name="origen" label="Origen">
        <Input placeholder="CRM, web, referido..." />
      </Form.Item>
      <Form.Item name="cotizacionId" label="Cotizacion vinculada">
        <Select
          options={cotizacionOptions}
          placeholder="Seleccionar cotizacion"
          showSearch
          optionFilterProp="label"
          allowClear
        />
      </Form.Item>
    </div>
  );

  const renderCotizacionEnviadaFields = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Form.Item name="cotizacionId" label="Cotizacion vinculada">
        <Select
          options={cotizacionOptions}
          placeholder="Seleccionar cotizacion"
          showSearch
          optionFilterProp="label"
          allowClear
        />
      </Form.Item>
      <Form.Item name="versionCotizacion" label="Version cotizacion">
        <Input placeholder="Ej: v1, v2, v3" />
      </Form.Item>
      <Form.Item name="probabilidadCierre" label="Probabilidad cierre">
        <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
      </Form.Item>
      <Form.Item name="comentariosCliente" label="Comentarios del cliente" className="md:col-span-2">
        <Input.TextArea rows={2} placeholder="Comentarios recibidos del cliente" />
      </Form.Item>
      <Form.Item name="objeciones" label="Objeciones" className="md:col-span-2">
        <Input.TextArea rows={2} placeholder="Precio, plazo, stock, competencia..." />
      </Form.Item>
      {renderProximaAccionField()}
      {renderFechaProximaAccionField()}
      <div className="space-y-2 md:col-span-2">
        {renderArchivoTipoRow("COTIZACION", "Cotización")}
        {renderArchivoTipoRow("FICHA_TECNICA", "Ficha técnica")}
      </div>
    </div>
  );

  const renderOrdenConfirmadaFields = () => (
    <div className="rounded-lg border border-[#ead7d2] bg-[#fff7f5] p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
        Orden confirmada / documentacion de venta
      </p>
      <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
        <Form.Item name="ordenCompra" label="Orden de compra">
          <Input placeholder="Nro. orden de compra" />
        </Form.Item>
        <Form.Item name="correoAceptacion" label="Correo de aceptacion">
          <Input placeholder="Correo o referencia de aceptacion" />
        </Form.Item>
        <Form.Item name="estadoDocumentacion" label="Estado documentacion">
          <Select
            allowClear
            placeholder="Seleccionar estado"
            options={[
              { label: "Pendiente", value: "PENDIENTE" },
              { label: "En proceso", value: "EN_PROCESO" },
              { label: "Completa", value: "COMPLETA" },
            ]}
          />
        </Form.Item>
        <Form.Item name="estadoComercialOrden" label="Estado comercial orden">
          <Input placeholder="Ej: pendiente administracion, lista para despacho..." />
        </Form.Item>
        <Form.Item name="estadoDocumentacionVenta" label="Estado documentacion venta">
          <Input placeholder="Ej: OC recibida, respaldo pendiente..." />
        </Form.Item>
        <Form.Item
          name="condicionesComerciales"
          label="Condiciones comerciales"
          className="md:col-span-2"
        >
          <Input.TextArea rows={2} placeholder="Condiciones comerciales acordadas" />
        </Form.Item>
        <Form.Item
          name="coordinacionAdministrativa"
          label="Coordinacion administrativa"
          className="md:col-span-2"
        >
          <Input.TextArea rows={2} placeholder="Notas de coordinacion administrativa" />
        </Form.Item>
        <Form.Item
          name="coordinacionDespacho"
          label="Coordinacion despacho"
          className="md:col-span-2"
        >
          <Input.TextArea rows={2} placeholder="Notas de despacho si corresponde" />
        </Form.Item>
        <Form.Item name="traspasoAdministracion" label="Traspaso administracion">
          <Select
            allowClear
            placeholder="Seleccionar"
            options={[
              { label: "Si", value: true },
              { label: "No", value: false },
            ]}
          />
        </Form.Item>
        <Form.Item name="traspasoERP" label="Traspaso ERP">
          <Select
            allowClear
            placeholder="Seleccionar"
            options={[
              { label: "Si", value: true },
              { label: "No", value: false },
            ]}
          />
        </Form.Item>
        {renderProximaAccionField()}
        {renderFechaProximaAccionField()}
      </div>
      <div className="mt-3 space-y-2">
        {renderArchivoTipoRow("ORDEN_COMPRA", "Orden de compra")}
        {renderArchivoTipoRow("CORREO_ACEPTACION", "Correo de aceptación")}
        {renderArchivoTipoRow("DOCUMENTO_RESPALDO", "Documento respaldo")}
        {renderArchivoTipoRow("COTIZACION", "Cotización vinculada")}
        {renderArchivoTipoRow("OTRO", "Otro documento")}
      </div>
    </div>
  );

  const renderGanadaFields = () => (
    <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
      <Form.Item name="montoEstimado" label="Monto estimado / monto final">
        <InputNumber min={0} className="w-full" prefix="$" />
      </Form.Item>
      <Form.Item name="responsable" label="Responsable">
        <Select
          showSearch
          allowClear
          loading={usuariosComercialesFirematLoading}
          placeholder="Selecciona un responsable"
          filterOption={responsableFirematFilterOption}
          options={withLegacyOption(responsableFirematOptions, form.getFieldValue("responsable"))}
        />
      </Form.Item>
      <Form.Item
        name="documentoRespaldo"
        label="Documento respaldo"
        rules={[
          {
            required: etapaWatch === "GANADA",
            message: "Ingresa el documento de respaldo",
          },
        ]}
      >
        <Input placeholder="OC, contrato, comprobante o documento" />
      </Form.Item>
      <Form.Item name="flujoPosterior" label="Flujo posterior">
        <Select
          allowClear
          placeholder="Seleccionar flujo posterior"
          options={[
            { label: "Postventa", value: "POSTVENTA" },
            { label: "Arriendo", value: "ARRIENDO" },
            { label: "Nuevo proyecto", value: "NUEVO_PROYECTO" },
          ]}
        />
      </Form.Item>
      <div className="md:col-span-2">
        {renderArchivoTipoRow("DOCUMENTO_RESPALDO", "Documento respaldo")}
      </div>
    </div>
  );

  const renderPerdidaFields = () => (
    <>
      <Form.Item
        name="motivoPerdida"
        label="Motivo perdida"
        rules={[
          { required: etapaWatch === "PERDIDA", message: "Ingresa el motivo de perdida" },
        ]}
      >
        <Select
          placeholder="Selecciona motivo de pérdida"
          options={MOTIVOS_PERDIDA}
          allowClear
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      {motivoPerdidaWatch === "Otro" && (
        <Form.Item
          name="motivoPerdidaDetalle"
          rules={[{ required: true, message: "Debe especificar el motivo." }]}
        >
          <Input placeholder="Especifique otro motivo" />
        </Form.Item>
      )}
    </>
  );

  const renderPostergadaFields = () => (
    <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
      <div>
        <Form.Item
          name="motivoPostergacion"
          label="Motivo postergacion"
          rules={[
            {
              required: etapaWatch === "POSTERGADA",
              message: "Ingresa el motivo de postergacion",
            },
          ]}
        >
          <Select
            placeholder="Selecciona motivo de postergación"
            options={MOTIVOS_POSTERGACION}
            allowClear
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        {motivoPostergacionWatch === "Otro" && (
          <Form.Item
            name="motivoPostergacionDetalle"
            rules={[{ required: true, message: "Debe especificar el motivo." }]}
          >
            <Input placeholder="Especifique otro motivo" />
          </Form.Item>
        )}
      </div>
      <Form.Item
        name="fechaReactivacion"
        label="Fecha reactivacion"
        rules={[
          {
            required: etapaWatch === "POSTERGADA",
            message: "Ingresa la fecha de reactivacion",
          },
        ]}
      >
        <DatePicker format="DD-MM-YYYY" className="w-full" />
      </Form.Item>
      {renderProximaAccionField()}
      {renderFechaProximaAccionField()}
    </div>
  );

  const renderDescartadoFields = () => (
    <>
      <Form.Item
        name="motivoDescarte"
        label="Motivo descarte"
        rules={[
          { required: etapaWatch === "DESCARTADO", message: "Ingresa el motivo de descarte" },
        ]}
      >
        <Select
          placeholder="Selecciona motivo de descarte"
          options={MOTIVOS_DESCARTE}
          allowClear
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      {motivoDescarteWatch === "Otro" && (
        <Form.Item
          name="motivoDescarteDetalle"
          rules={[{ required: true, message: "Debe especificar el motivo." }]}
        >
          <Input placeholder="Especifique otro motivo" />
        </Form.Item>
      )}
    </>
  );

  const renderReporteriaFields = () => (
    <>
      <div className="md:col-span-3 mt-2 border-t border-[#ead7d2] pt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
          Reporteria y seguimiento Firemat
        </p>
      </div>
      <Form.Item name="tipoBroker" label="Tipo broker">
        <Select
          allowClear
          showSearch
          placeholder="Seleccionar tipo de broker"
          options={withLegacyOption(
            TIPO_BROKER_OPTIONS,
            form.getFieldValue("tipoBroker")
          )}
          optionFilterProp="label"
        />
      </Form.Item>
      <Form.Item name="fechaEstimadaDespacho" label="Fecha estimada despacho">
        <DatePicker format="DD-MM-YYYY" className="w-full" />
      </Form.Item>
      <Form.Item name="fechaSeguimientoPostventa" label="Fecha seguimiento postventa">
        <DatePicker format="DD-MM-YYYY" className="w-full" />
      </Form.Item>
    </>
  );

  const renderFocusedStageFields = () => {
    void renderReporteriaFields;
    switch (initialEditSection) {
      case "prospecto":
        return renderProspectoFields();
      case "primer_contacto":
        return renderPrimerContactoFields();
      case "desarrollo_cotizacion":
        return renderDesarrolloCotizacionFields();
      case "cotizacion_enviada":
        return renderCotizacionEnviadaFields();
      case "orden_confirmada":
        return renderOrdenConfirmadaFields();
      case "ganada":
        return renderGanadaFields();
      case "perdida":
        return renderPerdidaFields();
      case "postergada":
        return renderPostergadaFields();
      case "descartado":
        return renderDescartadoFields();
      default:
        return null;
    }
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <div className="firemat-tab-group">
              <button
                type="button"
                onClick={() => setViewMode("funnel")}
                className={`firemat-tab-button${viewMode === "funnel" ? " firemat-tab-button-active" : ""}`}
              >
                Funnel
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendario")}
                className={`firemat-tab-button${viewMode === "calendario" ? " firemat-tab-button-active" : ""}`}
              >
                Calendario
              </button>
              <button
                type="button"
                onClick={() => setViewMode("dashboard")}
                className={`firemat-tab-button${viewMode === "dashboard" ? " firemat-tab-button-active" : ""}`}
              >
                Dashboard
              </button>
            </div>
            <Button className="firemat-action-button" icon={<ReloadOutlined />} onClick={() => void cargar()} loading={loading}>
              Actualizar
            </Button>
            <Button className="firemat-action-button" type="primary" icon={<PlusOutlined />} onClick={openCrear}>
              Crear oportunidad
            </Button>
            {alertaBell}
          </div>
        </div>
      </section>

      {viewMode === "calendario" ? (
        <section className="firemat-panel p-4">
          <FunnelFirematCalendario
            oportunidades={oportunidades}
            onOpenDetail={(o) => void openOportunidad(o, "ver")}
          />
        </section>
      ) : viewMode === "dashboard" ? (
        <section className="firemat-panel p-4">
          <FunnelFirematDashboard
            responsablesDisponibles={[...new Set(oportunidades.map((o) => o.responsable).filter((v): v is string => Boolean(v)))]}
            unidadesNegocioDisponibles={[...new Set(oportunidades.map((o) => o.unidadNegocio).filter((v): v is string => Boolean(v)))]}
            origenesDisponibles={[...new Set(oportunidades.map((o) => o.origen).filter((v): v is string => Boolean(v)))]}
            tiposClienteDisponibles={[...new Set(oportunidades.map((o) => o.tipoCliente).filter((v): v is string => Boolean(v)))]}
            tiposOportunidadDisponibles={[...new Set(oportunidades.map((o) => o.tipoOportunidad).filter((v): v is string => Boolean(v)))]}
            clientesDisponibles={[...new Set(oportunidades.map((o) => o.cliente).filter((v): v is string => Boolean(v)))]}
            proyectosDisponibles={[...new Set(oportunidades.map((o) => o.nombreOportunidad).filter((v): v is string => Boolean(v)))]}
            productosDisponibles={productos.map((p) => ({ value: p.id, label: p.nombre }))}
          />
        </section>
      ) : (
        <>
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
          <span className="text-xs font-medium text-slate-500">
            Unidad de negocio:
          </span>
          <Select
            size="small"
            style={{ minWidth: 160 }}
            value={filterUnidadNegocio}
            onChange={(v) => setFilterUnidadNegocio(v ?? "Firemat")}
            options={[
              { value: "Beck", label: "Beck" },
              { value: "Firemat", label: "Firemat" },
              { value: "Mixto", label: "Mixto" },
            ]}
          />
          <span className="text-xs font-medium text-slate-500">
            Estado de oportunidad:
          </span>
          <Select
            size="small"
            style={{ minWidth: 170 }}
            value={filterEstadoOportunidad || undefined}
            onChange={(v) => setFilterEstadoOportunidad(v ?? "")}
            allowClear
            placeholder="Todas"
            options={[
              { value: "activas", label: "Activas" },
              { value: "ganadas", label: "Ganadas" },
              { value: "perdidas", label: "Perdidas" },
              { value: "postergadas", label: "Postergadas" },
              { value: "descartadas", label: "Descartadas" },
            ]}
          />
          <span className="text-xs text-slate-400">
            {filterUnidadNegocio === "Firemat" ? visibleOportunidades.length : beckVisibleCount}{" "}
            oportunidad
            {(filterUnidadNegocio === "Firemat" ? visibleOportunidades.length : beckVisibleCount) !== 1
              ? "es"
              : ""}
          </span>
        </div>
      </section>

      {filterUnidadNegocio !== "Firemat" ? (
        <React.Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spin size="large" />
            </div>
          }
        >
          <FunnelBeck
            themeMode="light"
            embedUnidadNegocio={filterUnidadNegocio}
            embedEstadoCierre={filterEstadoOportunidad}
            onVisibleCountChange={setBeckVisibleCount}
          />
        </React.Suspense>
      ) : (
        <section className="firemat-panel bg-white" style={{ overflow: "visible" }}>
          <DndContext
            sensors={dndSensors}
            onDragStart={handleDndDragStart}
            onDragEnd={handleDndDragEnd}
            onDragCancel={handleDndDragCancel}
          >
            <div
              ref={kanbanScrollRef}
              style={{ overflowX: "auto", overflowY: "visible" }}
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
                      dragDisabled={!canEditFirematFunnel}
                      onViewDetail={(item) => openOportunidad(item, "ver")}
                    />
                  ))}
                </div>
              )}
            </div>
            <DragOverlay zIndex={9999}>
              {activeDragOpportunity ? (
                <div className="w-[200px] rounded-lg border border-orange-400 bg-white p-2 text-xs shadow-2xl">
                  <h4 className="truncate font-semibold leading-tight text-beck-ink">
                    {activeDragOpportunity.cliente}
                  </h4>
                  <p className="mt-1 font-medium tabular-nums text-firemat-primary">
                    {formatCLP(activeDragOpportunity.montoEstimado)}
                  </p>
                  <p className="mt-0.5 text-beck-muted">
                    Próxima: {formatDate(activeDragOpportunity.fechaProximaAccion)}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
      )}
        </>
      )}

      <Modal
        title={
          initialEditSection !== null
            ? `Rellenar ${
                ETAPAS.find(
                  (item) => item.value === (targetEtapa ?? etapaWatch ?? selected?.etapa)
                )
                  ?.label ?? "etapa"
              }`
            : modalMode === "crear"
            ? "Crear oportunidad Firemat"
            : modalMode === "editar"
            ? `Editar oportunidad ${selected?.cliente ?? ""}`
            : `Oportunidad: ${selected?.cliente ?? ""}`
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelected(null);
          setInitialEditSection(null);
          setTargetEtapa(null);
          setArchivosFiremat([]);
          setDetalleModalOpen(false);
          setShowClienteSelector(false);
          limpiarClienteFirematSeleccionado();
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={modalMode === "crear" ? "Crear" : "Guardar"}
        cancelText="Cancelar"
        okButtonProps={{ hidden: modalReadOnly, className: "firemat-action-button" }}
        confirmLoading={saving}
        width={modalWidth}
        styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
        footer={
          modalReadOnly && selected
            ? (
              <Space>
                <Button
                  onClick={() => {
                    setModalOpen(false);
                    setSelected(null);
                    setInitialEditSection(null);
                    setTargetEtapa(null);
                    setArchivosFiremat([]);
                    setDetalleModalOpen(false);
                    setShowClienteSelector(false);
                    limpiarClienteFirematSeleccionado();
                    form.resetFields();
                  }}
                >
                  Cerrar
                </Button>
              </Space>
            )
            : undefined
        }
        destroyOnClose
      >
        {modalReadOnly && selected ? (
          <div className="space-y-5">
            {/* A. Tabla resumen compacta */}
            <Descriptions
              bordered
              size="small"
              column={2}
              className="[&_.ant-descriptions-item-content]:[word-break:normal] [&_.ant-descriptions-item-content]:[overflow-wrap:break-word]"
            >
              <Descriptions.Item label="Cliente">
                <span style={{ whiteSpace: "normal", wordBreak: "normal", overflowWrap: "break-word" }}>
                  {selected.cliente || "—"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Etapa">
                <Tag color={ETAPAS.find((e) => e.value === selected.etapa)?.color ?? "default"}>
                  {ETAPAS.find((e) => e.value === selected.etapa)?.label ?? selected.etapa}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Producto">
                <span style={{ whiteSpace: "normal", wordBreak: "normal", overflowWrap: "break-word" }}>
                  {selected.producto?.nombre ??
                    selected.productoNombre ??
                    (selected.productoId
                      ? productoMap.get(selected.productoId)?.nombre
                      : null) ??
                    "—"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Linea de producto">
                {selected.lineaProducto || "â€”"}
              </Descriptions.Item>
              <Descriptions.Item label="Descuento aplicado">
                {selected.descuento !== null && selected.descuento !== undefined
                  ? `${selected.descuento}%`
                  : "â€”"}
              </Descriptions.Item>
              <Descriptions.Item label="Stock disponible">
                {getOptionLabel(STOCK_OPORTUNIDAD_OPTIONS, selected.stockOportunidad)}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo broker">
                {getOptionLabel(TIPO_BROKER_OPTIONS, selected.tipoBroker)}
              </Descriptions.Item>
              <Descriptions.Item label="Monto estimado">
                {formatCLP(selected.montoEstimado)}
              </Descriptions.Item>
              <Descriptions.Item label="Región / Comuna">
                {[selected.region, selected.comuna].filter(Boolean).join(" / ") || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha próxima acción">
                {formatDate(selected.fechaProximaAccion)}
              </Descriptions.Item>
              <Descriptions.Item label="Responsable">
                <span style={{ whiteSpace: "normal", wordBreak: "normal", overflowWrap: "break-word" }}>
                  {selected.responsable || "—"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Tipo cliente">
                {TIPO_CLIENTE_OPTIONS.find((t) => t.value === selected.tipoCliente)?.label ??
                  selected.tipoCliente ??
                  "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Cliente antiguo reactivado">
                {selected.esReactivacion === true
                  ? "Sí"
                  : selected.esReactivacion === false
                    ? "No"
                    : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Última actividad">
                {selected.updatedAt ? dayjs(selected.updatedAt).format("DD-MM-YYYY HH:mm") : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Próxima actividad" span={2}>
                <span style={{ whiteSpace: "normal", wordBreak: "normal", overflowWrap: "break-word" }}>
                  {selected.proximaAccion || "—"}
                </span>
              </Descriptions.Item>
              {relatedCotizaciones.length > 0 && (
                <Descriptions.Item label="Cotización vinculada" span={2}>
                  {relatedCotizaciones
                    .map((cot) => `#${cot.numero ?? cot.id} · ${formatCLP(cot.total)}`)
                    .join(", ")}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* B. Cambiar etapa */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-beck-muted">Cambiar etapa</p>
              <Select<FirematFunnelEtapa>
                value={selected.etapa}
                onChange={(nextEtapa) => void handleCambiarEtapa(selected, nextEtapa)}
                style={{ width: 240 }}
                options={ETAPAS}
              />
            </div>

            {/* C. Cotizaciones vinculadas */}
            <div>
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Cotizaciones vinculadas
                </h3>
                <p className="text-xs text-slate-500">
                  Cotizaciones Firemat asociadas a esta oportunidad.
                </p>
              </div>
              {relatedCotizaciones.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-[#ead7d2]">
                  <table className="min-w-full divide-y divide-[#ead7d2] text-sm">
                    <thead className="bg-[#fff7f5]">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-beck-muted">Numero</th>
                        <th className="px-3 py-2 text-left font-medium text-beck-muted">Estado</th>
                        <th className="px-3 py-2 text-left font-medium text-beck-muted">Total</th>
                        <th className="px-3 py-2 text-left font-medium text-beck-muted">Fecha</th>
                        <th className="px-3 py-2 text-right font-medium text-beck-muted">Acciones</th>
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
                          <td className="px-3 py-2 text-slate-600">
                            {formatDate(cotizacion.fecha ?? cotizacion.fechaCotizacion ?? cotizacion.createdAt ?? null)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-2">
                              <Button size="small" icon={<EyeOutlined />} onClick={() => void openCotizacion(cotizacion, "ver")}>Ver</Button>
                              <Button size="small" icon={<DownloadOutlined />} onClick={() => void handlePdf(cotizacion)}>PDF</Button>
                              <Button size="small" icon={<EditOutlined />} onClick={() => void openCotizacion(cotizacion, "editar")}>Editar</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* D. Botones de acción */}
            <Space wrap>
              <Button
                className="firemat-action-button"
                onClick={() => void openRellenarEtapa(selected)}
              >
                {getStageActionLabel(selected.etapa)}
              </Button>
              {selected.etapa !== "GANADA" &&
                !ETAPAS_CIERRE_SIN_COLUMNA.includes(selected.etapa) && (
                  <Button danger onClick={() => handleAbrirCierreFiremat(selected)}>
                    Cerrar oportunidad
                  </Button>
                )}
              <Button
                icon={<EyeOutlined />}
                onClick={() => {
                  setDetalleModalOpen(true);
                  if (selected) void loadHistorialEtapas(selected.id);
                }}
              >
                Ver detalle
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setModalMode("editar");
                  setInitialEditSection(null);
                  setTargetEtapa(null);
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
                className="firemat-action-button"
                type="primary"
                icon={<FileTextOutlined />}
                onClick={openCrearCotizacion}
              >
                Crear cotización
              </Button>
            </Space>

            {/* E. Archivos adjuntos */}
            {archivosFiremat.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                  Archivos adjuntos
                </p>
                <div className="space-y-1">
                  {archivosFiremat.map((archivo) => (
                    <div
                      key={archivo.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-beck-ink">
                          {getArchivoFirematTipoLabel(archivo.tipo)}
                        </p>
                        <p className="text-xs text-beck-muted">
                          {archivo.nombreArchivo || "Archivo adjunto"}
                        </p>
                      </div>
                      <Space size="small">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => openArchivo(archivo.url)}>Ver</Button>
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadArchivo(archivo.url)}>Descargar</Button>
                      </Space>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
        <Form<FunnelFormValues>
          form={form}
          layout="vertical"
          preserve={true}
          disabled={modalReadOnly}
          onFinish={handleSubmit}
          initialValues={{
            etapa: "PROSPECTO",
            origen: "CRM",
            probabilidadCierre: 20,
          }}
        >
          {isCreateMode && renderProspectoFields()}
          {isFocusedStageEdit && renderFocusedStageFields()}
          {isFullEditMode && (
          <>
          <Form.Item name="clienteId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="clienteFirematId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="contactoId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="contactoFirematId" hidden>
            <Input />
          </Form.Item>
          <div className="mb-4 rounded-lg border border-[#ead7d2] bg-[#fff7f5] p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,auto] md:items-end">
              <Form.Item label="Cliente Firemat registrado (opcional)" className="mb-0">
                <Select
                  showSearch
                  allowClear
                  loading={clientesLoading}
                  value={selectedClienteId ?? undefined}
                  options={clienteOptions}
                  optionFilterProp="label"
                  placeholder="Seleccionar cliente por RUT, nombre o razón social"
                  onClear={() => {
                    limpiarClienteFirematSeleccionado();
                    form.setFieldValue("cliente", "");
                  }}
                  onChange={(clienteId) => {
                    if (clienteId) {
                      void seleccionarClienteFiremat(String(clienteId));
                      return;
                    }
                    limpiarClienteFirematSeleccionado();
                  }}
                />
              </Form.Item>
              {selectedClienteId && (
                <Button onClick={limpiarClienteFirematSeleccionado}>
                  Quitar cliente asociado
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-3 md:grid-cols-3">
            {selected?.clienteRegistrado === true ? (
              <Form.Item name="cliente" hidden><Input /></Form.Item>
            ) : (
              <Form.Item
                name="cliente"
                label={<>Cliente no registrado <span className="text-red-500">*</span></>}
                rules={[
                  {
                    validator: (_, value: string) => {
                      if (selectedClienteId || value?.trim()) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Ingresa el cliente o selecciona uno registrado")
                      );
                    },
                  },
                ]}
              >
                <Input
                  placeholder="Nombre cliente no registrado"
                  disabled={Boolean(selectedClienteId)}
                />
              </Form.Item>
            )}
            <Form.Item name="contacto" label={<>Nombre de contacto <span className="text-red-500">*</span></>}>
              {selectedClienteId ? (
                <div className="space-y-2">
                  {contactoOptions.length ? (
                    <Select
                      options={contactoOptions}
                      placeholder="Seleccionar contacto"
                      allowClear
                      onChange={(_, option) => {
                        const selectedOption = Array.isArray(option) ? option[0] : option;
                        const contactoId =
                          typeof selectedOption === "object" && selectedOption
                            ? (selectedOption as { contactoId?: string }).contactoId
                            : undefined;
                        const contacto = contactosCliente.find(
                          (item) => item.id === contactoId
                        );
                        if (!contacto) {
                          form.setFieldsValue({
                            contacto: "",
                            contactoId: undefined,
                            contactoFirematId: undefined,
                          });
                          return;
                        }

                        form.setFieldsValue({
                          contactoId: contacto.id,
                          contactoFirematId: contacto.id,
                          contacto: contacto.nombre,
                          telefono: contacto.telefono || form.getFieldValue("telefono"),
                          correo: contacto.correo || form.getFieldValue("correo"),
                        });
                      }}
                    />
                  ) : (
                    <Text type="secondary">Este cliente no tiene contactos registrados</Text>
                  )}
                  <Button
                    size="small"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={abrirNuevoContacto}
                    className="!px-0"
                  >
                    Nuevo contacto
                  </Button>
                </div>
              ) : (
                <Input placeholder="Nombre contacto" />
              )}
            </Form.Item>
            <Form.Item name="cargoContacto" label="Cargo del contacto">
              <Input placeholder="Cargo o rol del contacto" />
            </Form.Item>
            <Form.Item name="responsable" label={<>Responsable comercial <span className="text-red-500">*</span></>}>
              <Select
                showSearch
                allowClear
                loading={usuariosComercialesFirematLoading}
                placeholder="Selecciona un responsable"
                filterOption={responsableFirematFilterOption}
                options={withLegacyOption(responsableFirematOptions, form.getFieldValue("responsable"))}
              />
            </Form.Item>
            <Form.Item name="telefono" label={<>Teléfono <span className="text-red-500">*</span></>} extra="Debe existir teléfono o correo">
              <Input placeholder="+56..." />
            </Form.Item>
            <Form.Item name="correo" label={<>Correo <span className="text-red-500">*</span></>} extra="Debe existir teléfono o correo">
              <Input placeholder="correo@empresa.cl" />
            </Form.Item>
            <Form.Item name="tipoCliente" label="Tipo de cliente">
              <Select options={TIPO_CLIENTE_OPTIONS} placeholder="Tipo" allowClear />
            </Form.Item>
            <Form.Item name="rutEmpresa" label={<>RUT empresa <span className="text-red-500">*</span></>}>
              <Input placeholder="76.123.456-7" />
            </Form.Item>
            <Form.Item name="region" label="Región">
              <Select
                showSearch
                allowClear
                placeholder="Seleccionar región"
                options={regionOptions}
                optionFilterProp="label"
                onChange={() => {
                  form.setFieldValue("comuna", undefined);
                }}
              />
            </Form.Item>
            <Form.Item name="comuna" label="Comuna">
              <Select
                showSearch
                allowClear
                placeholder="Seleccionar comuna"
                options={comunaOptions}
                optionFilterProp="label"
                disabled={!regionWatch}
              />
            </Form.Item>
            <Form.Item name="direccionProyecto" label="Dirección / ubicación del proyecto">
              <Input placeholder="Dirección, sector o ubicación" />
            </Form.Item>
            <Form.Item name="unidadNegocio" label={<>Unidad de negocio <span className="text-red-500">*</span></>}>
              <Select
                placeholder="Seleccionar unidad de negocio"
                options={[
                  { value: "Beck", label: "Beck" },
                  { value: "Firemat", label: "Firemat" },
                  { value: "Mixto", label: "Mixto" },
                ]}
              />
            </Form.Item>
            <Form.Item name="nombreOportunidad" label={<>Nombre del proyecto u oportunidad <span className="text-red-500">*</span></>}>
              <Input placeholder="Nombre del proyecto o descripción de la oportunidad" />
            </Form.Item>
            <Form.Item name="urgencia" label="Urgencia">
              <Select
                allowClear
                placeholder="Seleccionar urgencia"
                options={[
                  { label: "Inmediata", value: "INMEDIATA" },
                  { label: "1-3 meses", value: "1-3 MESES" },
                  { label: "3-6 meses", value: "3-6 MESES" },
                  { label: "+6 meses", value: "+6 MESES" },
                ]}
              />
            </Form.Item>
            <Form.Item name="tipoUso" label="Tipo de uso">
              <Select
                allowClear
                placeholder="Seleccionar tipo de uso"
                options={[
                  { label: "Propio", value: "PROPIO" },
                  { label: "Arriendo", value: "ARRIENDO" },
                  { label: "Mixto", value: "MIXTO" },
                ]}
              />
            </Form.Item>
            <Form.Item name="necesidadSoporteTecnico" label="Soporte técnico">
              <Select
                allowClear
                placeholder="¿Requiere soporte técnico?"
                options={[
                  { label: "Sí", value: true },
                  { label: "No", value: false },
                ]}
              />
            </Form.Item>
            <Form.Item name="esReactivacion" label="Cliente antiguo reactivado">
              <Select
                allowClear
                placeholder="¿Es cliente reactivado?"
                options={[
                  { label: "Sí", value: true },
                  { label: "No", value: false },
                ]}
              />
            </Form.Item>
            <Form.Item name="lineaProducto" label="Linea de producto">
              <Input placeholder="Linea de producto" />
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
            <Form.Item name="descuento" label="Descuento aplicado">
              <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
            </Form.Item>
            <Form.Item name="stockOportunidad" label="Stock disponible">
              <Select
                allowClear
                placeholder="Seleccionar stock"
                options={STOCK_OPORTUNIDAD_OPTIONS}
              />
            </Form.Item>
            <Form.Item name="montoEstimado" label="Monto estimado">
              <InputNumber min={0} className="w-full" prefix="$" />
            </Form.Item>
            <div className="md:col-span-3 mt-2 border-t border-[#ead7d2] pt-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                Desarrollo de cotización y seguimiento
              </p>
            </div>
            <Form.Item name="alternativaProducto" label="Alternativa de producto">
              <Input.TextArea
                rows={2}
                placeholder="Producto alternativo o solución sugerida"
              />
            </Form.Item>
            <Form.Item name="comision" label="Comisión (%)">
              <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
            </Form.Item>
            <Form.Item name="margenEstimado" label="Margen estimado (%)">
              <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
            </Form.Item>
            <Form.Item
              name="fechaComprometidaEnvio"
              label="Fecha comprometida de enví­o"
            >
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="versionCotizacion" label="Versión cotización">
              <Input placeholder="Ej: v1, v2, v3" />
            </Form.Item>
            <Form.Item name="comentariosCliente" label="Comentarios del cliente">
              <Input.TextArea
                rows={2}
                placeholder="Comentarios recibidos del cliente"
              />
            </Form.Item>
            <Form.Item name="objeciones" label="Objeciones">
              <Input.TextArea
                rows={2}
                placeholder="Precio, plazo, stock, competencia..."
              />
            </Form.Item>
            <Form.Item
              name="etapa"
              label="Etapa"
              rules={[{ required: true, message: "Selecciona la etapa" }]}
            >
              <Select options={ETAPAS} />
            </Form.Item>
            {etapaWatch === "ORDEN_CONFIRMADA" && (
              <div className="md:col-span-3 rounded-lg border border-[#ead7d2] bg-[#fff7f5] p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                  Orden confirmada / documentación de venta
                </p>

                <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
                  <Form.Item name="ordenCompra" label="Orden de compra">
                    <Input placeholder="NÂ° orden de compra" />
                  </Form.Item>

                  <Form.Item name="correoAceptacion" label="Correo de aceptación">
                    <Input placeholder="Correo o referencia de aceptación" />
                  </Form.Item>

                  <Form.Item name="estadoDocumentacion" label="Estado documentación">
                    <Select
                      allowClear
                      placeholder="Seleccionar estado"
                      options={[
                        { label: "Pendiente", value: "PENDIENTE" },
                        { label: "En proceso", value: "EN_PROCESO" },
                        { label: "Completa", value: "COMPLETA" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="estadoComercialOrden" label="Estado comercial orden">
                    <Input placeholder="Ej: pendiente administración, lista para despacho..." />
                  </Form.Item>

                  <Form.Item
                    name="estadoDocumentacionVenta"
                    label="Estado documentación venta"
                  >
                    <Input placeholder="Ej: OC recibida, respaldo pendiente..." />
                  </Form.Item>

                  <Form.Item
                    name="condicionesComerciales"
                    label="Condiciones comerciales"
                    className="md:col-span-2"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Condiciones comerciales acordadas"
                    />
                  </Form.Item>

                  <Form.Item
                    name="coordinacionAdministrativa"
                    label="Coordinación administrativa"
                    className="md:col-span-2"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Notas de coordinación administrativa"
                    />
                  </Form.Item>

                  <Form.Item
                    name="coordinacionDespacho"
                    label="Coordinación despacho"
                    className="md:col-span-2"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Notas de despacho si corresponde"
                    />
                  </Form.Item>

                  <Form.Item
                    name="traspasoAdministracion"
                    label="Traspaso administración"
                  >
                    <Select
                      allowClear
                      placeholder="Seleccionar"
                      options={[
                        { label: "Sí­", value: true },
                        { label: "No", value: false },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="traspasoERP" label="Traspaso ERP">
                    <Select
                      allowClear
                      placeholder="Seleccionar"
                      options={[
                        { label: "Sí", value: true },
                        { label: "No", value: false },
                      ]}
                    />
                  </Form.Item>
                </div>
              </div>
            )}
            <Form.Item name="probabilidadCierre" label="Probabilidad cierre">
              <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
            </Form.Item>
            {renderProximaAccionField()}
            {renderFechaProximaAccionField()}
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
            <div className="md:col-span-3 mt-2 border-t border-[#ead7d2] pt-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                Reporterí­a y seguimiento Firemat
              </p>
            </div>
            <Form.Item name="tipoBroker" label="Tipo broker">
              <Select
                allowClear
                showSearch
                placeholder="Seleccionar tipo de broker"
                options={withLegacyOption(
                  TIPO_BROKER_OPTIONS,
                  form.getFieldValue("tipoBroker")
                )}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="fechaEstimadaDespacho" label="Fecha estimada despacho">
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item
              name="fechaSeguimientoPostventa"
              label="Fecha seguimiento postventa"
            >
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="tipoOportunidad" label="Tipo de oportunidad">
              <Select
                allowClear
                placeholder="Seleccionar tipo"
                options={[
                  { label: "Nueva venta", value: "NUEVA_VENTA" },
                  { label: "Recompra", value: "RECOMPRA" },
                  { label: "Ampliación", value: "AMPLIACION" },
                  { label: "Proyecto", value: "PROYECTO" },
                  { label: "Servicio técnico", value: "SERVICIO_TECNICO" },
                ]}
              />
            </Form.Item>
            <Form.Item name="fechaProbableCierre" label="Fecha probable de cierre">
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="riesgoTecnico" label="Riesgo técnico">
              <Select
                allowClear
                placeholder="Seleccionar riesgo"
                options={[
                  { label: "Bajo", value: "BAJO" },
                  { label: "Medio", value: "MEDIO" },
                  { label: "Alto", value: "ALTO" },
                ]}
              />
            </Form.Item>
            <Form.Item name="comentariosInternos" label="Comentarios internos" className="md:col-span-3">
              <Input.TextArea rows={3} placeholder="Notas internas del equipo (no visibles para el cliente)" />
            </Form.Item>
            <Form.Item name="observacionesTecnicas" label="Observaciones técnicas" className="md:col-span-3">
              <Input.TextArea rows={3} placeholder="Detalles técnicos de la oportunidad" />
            </Form.Item>
          </div>

          {etapaWatch === "PERDIDA" && (
            <>
              <Form.Item
                name="motivoPerdida"
                label="Motivo pérdida"
                rules={[{ required: true, message: "Ingresa el motivo de pérdida" }]}
              >
                <Select
                  placeholder="Selecciona motivo de pérdida"
                  options={MOTIVOS_PERDIDA}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              {motivoPerdidaWatch === "Otro" && (
                <Form.Item
                  name="motivoPerdidaDetalle"
                  rules={[{ required: true, message: "Debe especificar el motivo." }]}
                >
                  <Input placeholder="Especifique otro motivo" />
                </Form.Item>
              )}
            </>
          )}

          {etapaWatch === "POSTERGADA" && (
            <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
              <div>
                <Form.Item
                  name="motivoPostergacion"
                  label="Motivo postergación"
                  rules={[
                    { required: true, message: "Ingresa el motivo de postergación" },
                  ]}
                >
                  <Select
                    placeholder="Selecciona motivo de postergación"
                    options={MOTIVOS_POSTERGACION}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
                {motivoPostergacionWatch === "Otro" && (
                  <Form.Item
                    name="motivoPostergacionDetalle"
                    rules={[{ required: true, message: "Debe especificar el motivo." }]}
                  >
                    <Input placeholder="Especifique otro motivo" />
                  </Form.Item>
                )}
              </div>
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
            <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
              <Form.Item
                name="documentoRespaldo"
                label="Documento respaldo"
                rules={[{ required: true, message: "Ingresa el documento de respaldo" }]}
              >
                <Input placeholder="OC, contrato, comprobante o documento" />
              </Form.Item>
              <Form.Item
                name="flujoPosterior"
                label="Flujo posterior"
                rules={[{ required: true, message: "Selecciona el flujo posterior" }]}
              >
                <Select
                  allowClear
                  placeholder="Seleccionar flujo posterior"
                  options={[
                    { label: "Postventa", value: "POSTVENTA" },
                    { label: "Arriendo", value: "ARRIENDO" },
                    { label: "Nuevo proyecto", value: "NUEVO_PROYECTO" },
                  ]}
                />
              </Form.Item>
            </div>
          )}

          {etapaWatch === "DESCARTADO" && (
            <>
              <Form.Item
                name="motivoDescarte"
                label="Motivo descarte"
                rules={[{ required: true, message: "Ingresa el motivo de descarte" }]}
              >
                <Select
                  placeholder="Selecciona motivo de descarte"
                  options={MOTIVOS_DESCARTE}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              {motivoDescarteWatch === "Otro" && (
                <Form.Item
                  name="motivoDescarteDetalle"
                  rules={[{ required: true, message: "Debe especificar el motivo." }]}
                >
                  <Input placeholder="Especifique otro motivo" />
                </Form.Item>
              )}
            </>
          )}

          {modalMode === "editar" && selected && renderArchivosEdicionFields()}

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={4} placeholder="Notas comerciales" />
          </Form.Item>
          </>
          )}
        </Form>
        )}
      </Modal>

      <Modal
        open={cierreModalOpen}
        onCancel={() => setCierreModalOpen(false)}
        footer={null}
        width="min(480px, 95vw)"
        title="Cerrar oportunidad"
        destroyOnClose
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Tipo de cierre <span className="text-red-500">*</span>
            </label>
            <Select
              className="w-full"
              placeholder="Selecciona el tipo de cierre"
              value={cierreTipo || undefined}
              onChange={(value) => {
                setCierreTipo(value);
                setCierreMotivoPerdida("");
                setCierreMotivoPerdidaDetalle("");
                setCierreMotivoPostergacion("");
                setCierreMotivoPostergacionDetalle("");
                setCierreFechaReactivacion(null);
                setCierreMotivoDescarte("");
                setCierreMotivoDescarteDetalle("");
              }}
              options={[
                { value: "PERDIDA", label: "Perdida" },
                { value: "POSTERGADA", label: "Postergada" },
                { value: "DESCARTADO", label: "Descartada" },
              ]}
            />
          </div>

          {cierreTipo === "PERDIDA" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Motivo de pérdida <span className="text-red-500">*</span>
                </label>
                <Select
                  className="w-full"
                  placeholder="Selecciona un motivo"
                  value={cierreMotivoPerdida || undefined}
                  onChange={(value) => {
                    setCierreMotivoPerdida(value ?? "");
                    setCierreMotivoPerdidaDetalle("");
                  }}
                  options={MOTIVOS_PERDIDA}
                />
              </div>
              {cierreMotivoPerdida === "Otro" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Especifica el motivo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={cierreMotivoPerdidaDetalle}
                    onChange={(e) => setCierreMotivoPerdidaDetalle(e.target.value)}
                    placeholder="Describe el motivo..."
                  />
                </div>
              )}
            </>
          )}

          {cierreTipo === "POSTERGADA" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Motivo de postergación <span className="text-red-500">*</span>
                </label>
                <Select
                  className="w-full"
                  placeholder="Selecciona un motivo"
                  value={cierreMotivoPostergacion || undefined}
                  onChange={(value) => {
                    setCierreMotivoPostergacion(value ?? "");
                    setCierreMotivoPostergacionDetalle("");
                  }}
                  options={MOTIVOS_POSTERGACION}
                />
              </div>
              {cierreMotivoPostergacion === "Otro" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Especifica el motivo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={cierreMotivoPostergacionDetalle}
                    onChange={(e) => setCierreMotivoPostergacionDetalle(e.target.value)}
                    placeholder="Describe el motivo..."
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Fecha de reactivación <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  className="w-full"
                  format="DD-MM-YYYY"
                  value={cierreFechaReactivacion}
                  onChange={(value) => setCierreFechaReactivacion(value)}
                />
              </div>
            </>
          )}

          {cierreTipo === "DESCARTADO" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Motivo de descarte <span className="text-red-500">*</span>
                </label>
                <Select
                  className="w-full"
                  placeholder="Selecciona un motivo"
                  value={cierreMotivoDescarte || undefined}
                  onChange={(value) => {
                    setCierreMotivoDescarte(value ?? "");
                    setCierreMotivoDescarteDetalle("");
                  }}
                  options={MOTIVOS_DESCARTE}
                />
              </div>
              {cierreMotivoDescarte === "Otro" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Especifica el motivo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={cierreMotivoDescarteDetalle}
                    onChange={(e) => setCierreMotivoDescarteDetalle(e.target.value)}
                    placeholder="Describe el motivo..."
                  />
                </div>
              )}
            </>
          )}

          {cierreTipo && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Observación
              </label>
              <Input.TextArea
                rows={3}
                placeholder="Observaciones adicionales..."
                value={cierreObservacion}
                onChange={(e) => setCierreObservacion(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={() => setCierreModalOpen(false)}>Cancelar</Button>
            <Button
              type="primary"
              className="firemat-action-button"
              loading={cierreSaving}
              disabled={!cierreTipo}
              onClick={() => void handleConfirmarCierreFiremat()}
            >
              Confirmar cierre
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de detalle completo */}
      <Modal
        title={selected ? `Detalle: ${selected.nombreOportunidad ?? selected.cliente ?? "Oportunidad"}` : "Detalle"}
        open={detalleModalOpen}
        onCancel={() => {
          setDetalleModalOpen(false);
          setHistorialEtapas([]);
          setHistorialEtapasLoading(false);
          setHistorialEtapasError(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetalleModalOpen(false);
            setHistorialEtapas([]);
            setHistorialEtapasLoading(false);
            setHistorialEtapasError(null);
          }}>
            Cerrar
          </Button>,
        ]}
        width="min(860px, 95vw)"
        styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
        destroyOnClose
      >
        {selected && (
          <>
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2 }}
            className="[&_.ant-descriptions-item-content]:break-words [&_.ant-descriptions-item-label]:whitespace-normal"
          >
            <Descriptions.Item label="Nombre del proyecto u oportunidad" span={2}>
              {selected.nombreOportunidad || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Cliente / empresa">
              {selected.cliente || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Estado cliente">
              <Tag color={selected.clienteRegistrado ? "green" : "orange"}>
                {selected.clienteRegistrado ? "Cliente registrado" : "Cliente no registrado"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="RUT empresa">
              {selected.rutEmpresa || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Contacto">
              {selected.contacto || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Cargo del contacto">
              {selected.cargoContacto || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Teléfono">
              {selected.telefono || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Correo">
              {selected.correo || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Región">
              {selected.region || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Comuna">
              {selected.comuna || "—"}
            </Descriptions.Item>
            {(selected.direccionProyecto) && (
              <Descriptions.Item label="Dirección / ubicación del proyecto" span={2}>
                {selected.direccionProyecto}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Fecha de ingreso">
              {formatDate(selected.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Responsable comercial">
              {selected.responsable || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Unidad de negocio">
              {selected.unidadNegocio || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Linea de producto">
              {selected.lineaProducto || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Descuento aplicado">
              {selected.descuento !== null && selected.descuento !== undefined
                ? `${selected.descuento}%`
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Stock disponible">
              {getOptionLabel(STOCK_OPORTUNIDAD_OPTIONS, selected.stockOportunidad)}
            </Descriptions.Item>
            <Descriptions.Item label="Tipo broker">
              {getOptionLabel(TIPO_BROKER_OPTIONS, selected.tipoBroker)}
            </Descriptions.Item>
            <Descriptions.Item label="Origen del prospecto">
              {selected.origen || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Etapa del pipeline" span={2}>
              <Tag color={ETAPAS.find((e) => e.value === selected.etapa)?.color ?? "default"}>
                {ETAPAS.find((e) => e.value === selected.etapa)?.label ?? selected.etapa}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Última actividad">
              {selected.updatedAt ? dayjs(selected.updatedAt).format("DD-MM-YYYY HH:mm") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Próxima actividad">
              {selected.proximaAccion || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha de próxima acción">
              {formatDate(selected.fechaProximaAccion)}
            </Descriptions.Item>
            {selected.observaciones && (
              <Descriptions.Item label="Observaciones" span={2}>
                {selected.observaciones}
              </Descriptions.Item>
            )}
            {selected.tipoOportunidad && (
              <Descriptions.Item label="Tipo de oportunidad">
                {selected.tipoOportunidad}
              </Descriptions.Item>
            )}
            {selected.fechaProbableCierre && (
              <Descriptions.Item label="Fecha probable de cierre">
                {formatDate(selected.fechaProbableCierre)}
              </Descriptions.Item>
            )}
            {selected.riesgoTecnico && (
              <Descriptions.Item label="Riesgo técnico">
                {selected.riesgoTecnico}
              </Descriptions.Item>
            )}
            {selected.comentariosInternos && (
              <Descriptions.Item label="Comentarios internos" span={2}>
                {selected.comentariosInternos}
              </Descriptions.Item>
            )}
            {selected.observacionesTecnicas && (
              <Descriptions.Item label="Observaciones técnicas" span={2}>
                {selected.observacionesTecnicas}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* ── Historial de etapas ── */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Historial de etapas
            </h3>
            {historialEtapasLoading ? (
              <div className="flex justify-center py-6">
                <Spin size="small" />
              </div>
            ) : historialEtapasError ? (
              <p className="text-xs text-red-500">{historialEtapasError}</p>
            ) : historialEtapas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                Sin historial de etapas
              </div>
            ) : (
              <Timeline
                mode="left"
                items={historialEtapas.map((h) => ({
                  key: h.id,
                  label: (
                    <span className="text-xs text-slate-400">
                      {new Date(h.createdAt).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ),
                  children: (
                    <div className="pb-1">
                      <p className="text-sm font-medium text-slate-800">
                        {h.etapaAnterior
                          ? `${formatEtapaFirematHistorial(h.etapaAnterior)} → ${formatEtapaFirematHistorial(h.etapaNueva)}`
                          : `Inicio: ${formatEtapaFirematHistorial(h.etapaNueva)}`}
                      </p>
                      {(h.usuarioNombre ?? h.usuarioEmail) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Por: {h.usuarioNombre ?? h.usuarioEmail}
                        </p>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </div>
          </>
        )}
      </Modal>

      <Modal
        title="Nuevo contacto"
        open={contactoModalOpen}
        onCancel={() => {
          setContactoModalOpen(false);
          contactoForm.resetFields();
        }}
        destroyOnClose
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setContactoModalOpen(false);
              contactoForm.resetFields();
            }}
          >
            Cancelar
          </Button>,
          <Button
            key="submit"
            loading={contactoSaving}
            onClick={() => contactoForm.submit()}
            style={{
              backgroundColor: "#475569",
              borderColor: "#475569",
              color: "#ffffff",
            }}
          >
            Agregar
          </Button>,
        ]}
      >
        <Form
          form={contactoForm}
          layout="vertical"
          onFinish={guardarNuevoContacto}
          initialValues={{ activo: true, principal: false }}
        >
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "Ingresa el nombre" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="cargo" label="Cargo">
            <Input />
          </Form.Item>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="telefono" label="Teléfono">
              <Input placeholder="+56..." />
            </Form.Item>
            <Form.Item name="correo" label="Correo">
              <Input placeholder="correo@empresa.cl" />
            </Form.Item>
            <Form.Item name="principal" label="Contacto principal">
              <Select
                options={[
                  { label: "Sí", value: true },
                  { label: "No", value: false },
                ]}
              />
            </Form.Item>
            <Form.Item name="activo" label="Estado">
              <Select
                options={[
                  { label: "Activo", value: true },
                  { label: "Inactivo", value: false },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
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
        okButtonProps={{
          hidden: cotizacionModalMode === "ver",
          className: "firemat-action-button",
        }}
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
            <Form.Item name="contacto" label="Nombre de contacto">
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

      {/* Modal bloqueo — 409 con bloqueos y puedeAvanzar: false */}
      <Modal
        title="No se puede avanzar"
        open={bloqueoModalOpen}
        onCancel={() => {
          setBloqueoModalOpen(false);
          setBloqueoEtapaPendiente(null);
          setBloqueoObservacion("");
        }}
        destroyOnClose
        footer={[
          <Button
            key="cancelar"
            onClick={() => {
              setBloqueoModalOpen(false);
              setBloqueoEtapaPendiente(null);
              setBloqueoObservacion("");
            }}
          >
            Cancelar
          </Button>,
          ...(bloqueoEtapaPendiente
            ? [
                <Button
                  key="avanzar"
                  className="firemat-action-button"
                  disabled={!bloqueoObservacion.trim() || bloqueoRetrying}
                  loading={bloqueoRetrying}
                  onClick={async () => {
                    if (!bloqueoEtapaPendiente || !bloqueoObservacion.trim()) return;
                    const { record, nextEtapa, etapaOrigen } = bloqueoEtapaPendiente;
                    setBloqueoRetrying(true);
                    const optimisticRecord: FirematFunnelOportunidad = { ...record, etapa: nextEtapa };
                    setOportunidades((current) =>
                      current.map((item) => (item.id === record.id ? optimisticRecord : item))
                    );
                    setSelected((current) =>
                      current?.id === record.id ? { ...current, etapa: nextEtapa } : current
                    );
                    try {
                      const updated = await firematFunnelAPI.cambiarEtapa(
                        record.id,
                        nextEtapa,
                        bloqueoObservacion.trim()
                      );
                      setOportunidades((current) =>
                        current.map((item) => (item.id === record.id ? { ...item, ...updated } : item))
                      );
                      setSelected((current) => (current?.id === record.id ? updated : current));
                      setBloqueoModalOpen(false);
                      setBloqueoEtapaPendiente(null);
                      setBloqueoObservacion("");
                      if (updated?.advertencias?.length) {
                        setAdvertenciaSuccessItems(updated.advertencias);
                        setAdvertenciaSuccessOpen(true);
                      } else {
                        void message.success("Etapa actualizada con observación");
                      }
                    } catch {
                      setOportunidades((current) =>
                        current.map((item) =>
                          item.id === record.id ? { ...item, etapa: etapaOrigen } : item
                        )
                      );
                      setSelected((current) =>
                        current?.id === record.id ? { ...current, etapa: etapaOrigen } : current
                      );
                      void message.error("No se pudo avanzar la etapa");
                    } finally {
                      setBloqueoRetrying(false);
                    }
                  }}
                >
                  Avanzar con observación
                </Button>,
              ]
            : [
                <Button
                  key="entendido"
                  className="firemat-action-button"
                  onClick={() => setBloqueoModalOpen(false)}
                >
                  Entendido
                </Button>,
              ]),
        ]}
      >
        <div className="space-y-4">
          {bloqueoBloqueos.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-red-600">Reglas bloqueantes:</p>
              <ul className="list-disc pl-5 text-sm text-beck-ink space-y-1">
                {bloqueoBloqueos.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {bloqueoAdvertencias.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-amber-600">Advertencias:</p>
              <ul className="list-disc pl-5 text-sm text-beck-ink space-y-1">
                {bloqueoAdvertencias.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {bloqueoEtapaPendiente && (
            <div>
              <p className="mb-1 text-xs font-semibold text-beck-ink">
                Puedes avanzar de todos modos ingresando una observación:
              </p>
              <Input.TextArea
                rows={3}
                placeholder="Describe el motivo para avanzar con campos faltantes..."
                value={bloqueoObservacion}
                onChange={(e) => setBloqueoObservacion(e.target.value)}
                maxLength={500}
                showCount
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Modal advertencias de éxito — 200/201 con advertencias */}
      <Modal
        title="Guardado con advertencias"
        open={advertenciaSuccessOpen}
        onCancel={() => setAdvertenciaSuccessOpen(false)}
        destroyOnClose
        footer={[
          <Button
            key="ok"
            className="firemat-action-button"
            onClick={() => setAdvertenciaSuccessOpen(false)}
          >
            Entendido
          </Button>,
        ]}
      >
        <div className="space-y-3">
          <p className="text-sm text-beck-ink">La operación fue exitosa pero se detectaron las siguientes advertencias:</p>
          {advertenciaSuccessItems.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-beck-ink space-y-1">
              {advertenciaSuccessItems.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default FirematFunnel;
