import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  DatePicker,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import {
  funnelBeckAPI,
  type FunnelBeckDashboardData,
  type FunnelBeckDashboardParams,
  type FunnelBeckDashboardRiesgoItem,
  type FunnelBeckDashboardSinSeguimientoItem,
  type FunnelBeckDashboardVendedor,
} from "../../services/api";

const { RangePicker } = DatePicker;

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const formatClp = (v: number) => CLP.format(v);
const formatNum = (v: number) => NUM.format(v);

const formatEtapaBeck = (etapa: string): string => {
  const labels: Record<string, string> = {
    prospecto_identificado: "Prospecto identificado",
    visita_levantamiento: "Visita / levantamiento",
    cotizacion_elaborada: "Cotización elaborada",
    cotizacion_enviada: "Cotización enviada",
    en_negociacion: "En negociación",
    documentacion_venta: "Documentación venta",
    cerrada: "Cerrada",
  };
  return labels[etapa] ?? etapa.replace(/_/g, " ");
};

const etapaShortLabel = (etapa: string): string => {
  const short: Record<string, string> = {
    prospecto_identificado: "Prospecto",
    visita_levantamiento: "Visita",
    cotizacion_elaborada: "Cot. elaborada",
    cotizacion_enviada: "Cot. enviada",
    en_negociacion: "Negociación",
    documentacion_venta: "Doc. venta",
    cerrada: "Cerrada",
  };
  return short[etapa] ?? etapa;
};

const TIPO_FECHA_OPTIONS = [
  { value: "createdAt", label: "Fecha ingreso" },
  { value: "updatedAt", label: "Última actividad" },
  { value: "fechaProbableCierre", label: "Fecha probable cierre" },
  { value: "fechaCierre", label: "Fecha cierre" },
  { value: "fechaProximaAccion", label: "Fecha próxima acción" },
];

const ETAPA_OPTIONS = [
  { value: "prospecto_identificado", label: "Prospecto identificado" },
  { value: "visita_levantamiento", label: "Visita / levantamiento" },
  { value: "cotizacion_elaborada", label: "Cotización elaborada" },
  { value: "cotizacion_enviada", label: "Cotización enviada" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "documentacion_venta", label: "Documentación venta" },
  { value: "cerrada", label: "Cerrada" },
];

const ESTADO_OPTIONS = [
  { value: "activa", label: "Activa" },
  { value: "ganada", label: "Ganada" },
  { value: "perdida", label: "Perdida" },
  { value: "postergada", label: "Postergada" },
  { value: "descartada", label: "Descartada" },
];

const PIE_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"];
const BAR_COLOR_CANTIDAD = "#6366f1";
const BAR_COLOR_MONTO = "#f59e0b";

// ── Small reusable components ─────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  danger?: boolean;
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, color, danger }) => (
  <div
    className={`rounded-xl border bg-white p-4 shadow-sm ${
      danger ? "border-red-200 bg-red-50" : "border-slate-200"
    }`}
  >
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p
      className="mt-1 text-2xl font-bold"
      style={{ color: color ?? (danger ? "#dc2626" : "#17181a") }}
    >
      {value}
    </p>
    {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
  </div>
);

type ProximasCardProps = { label: string; value: number; color: string; bg: string };

const ProximasCard: React.FC<ProximasCardProps> = ({ label, value, color, bg }) => (
  <div className={`rounded-xl border p-4 shadow-sm ${bg}`}>
    <p className="text-xs font-medium uppercase tracking-wide" style={{ color }}>
      {label}
    </p>
    <p className="mt-1 text-3xl font-bold" style={{ color }}>
      {formatNum(value)}
    </p>
  </div>
);

const EmptyMsg: React.FC<{ text?: string }> = ({ text = "Sin datos" }) => (
  <p className="py-6 text-center text-xs text-slate-400">{text}</p>
);

// ── Sección Prospectos ────────────────────────────────────────────────────────

const SeccionProspectos: React.FC<{ d: NonNullable<FunnelBeckDashboardData["prospectos"]> }> = ({ d }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
      <KpiCard label="Prospectos nuevos esta semana" value={formatNum(d.nuevosSemana)} color="#6366f1" />
      <KpiCard label="Prospectos nuevos este mes" value={formatNum(d.nuevosMes)} color="#3b82f6" />
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card size="small" title="Por origen" className="rounded-xl border-slate-200 shadow-sm">
        {d.porOrigen.length === 0 ? <EmptyMsg /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.porOrigen} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="origen" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip formatter={(v) => [formatNum(v as number), "Cantidad"]} />
              <Bar dataKey="cantidad" fill={BAR_COLOR_CANTIDAD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card size="small" title="Por responsable" className="rounded-xl border-slate-200 shadow-sm">
        {d.porResponsable.length === 0 ? <EmptyMsg /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.porResponsable} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="vendedor" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip formatter={(v) => [formatNum(v as number), "Cantidad"]} />
              <Bar dataKey="cantidad" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  </div>
);

// ── Sección Pipeline Avanzado ─────────────────────────────────────────────────

const colsPipelineSimple = (labelKey: string): ColumnsType<Record<string, unknown>> => [
  { title: labelKey, dataIndex: labelKey, key: labelKey, ellipsis: true },
  { title: "Cantidad", dataIndex: "cantidad", key: "cantidad", width: 80, align: "right" as const,
    render: (v: number) => formatNum(v) },
  { title: "Monto CLP", dataIndex: "montoClp", key: "montoClp", align: "right" as const,
    render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span> },
];

const SeccionPipeline: React.FC<{ d: NonNullable<FunnelBeckDashboardData["pipelineAvanzado"]> }> = ({ d }) => {
  const colsProyecto: ColumnsType<typeof d.porProyecto[0]> = [
    { title: "Proyecto", dataIndex: "proyecto", key: "proyecto", ellipsis: true },
    { title: "Cliente", dataIndex: "cliente", key: "cliente", ellipsis: true, width: 140 },
    { title: "Vendedor", dataIndex: "vendedor", key: "vendedor", width: 120 },
    { title: "Etapa", dataIndex: "etapa", key: "etapa", width: 150,
      render: (v: string) => <Tag>{formatEtapaBeck(v)}</Tag> },
    { title: "Monto CLP", dataIndex: "montoClp", key: "montoClp", align: "right" as const,
      render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Por responsable", data: d.porResponsable, key: "vendedor" },
          { title: "Por unidad de negocio", data: d.porUnidadNegocio, key: "unidadNegocio" },
          { title: "Por origen", data: d.porOrigen, key: "origen" },
          { title: "Por tipo de cliente", data: d.porTipoCliente, key: "tipoCliente" },
          { title: "Top clientes", data: d.porCliente, key: "cliente" },
        ].map(({ title, data, key }) => (
          <Card key={key} size="small" title={title} className="rounded-xl border-slate-200 shadow-sm">
            {data.length === 0 ? <EmptyMsg /> : (
              <Table
                rowKey={key}
                columns={colsPipelineSimple(key) as ColumnsType<typeof data[0]>}
                dataSource={data as unknown as typeof data}
                size="small"
                pagination={false}
                scroll={{ x: 340 }}
              />
            )}
          </Card>
        ))}
      </div>
      <Card size="small" title="Top proyectos" className="rounded-xl border-slate-200 shadow-sm">
        {d.porProyecto.length === 0 ? <EmptyMsg /> : (
          <Table
            rowKey={(r) => r.proyecto}
            columns={colsProyecto}
            dataSource={d.porProyecto}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  );
};

// ── Sección Forecast ──────────────────────────────────────────────────────────

const SeccionForecast: React.FC<{ d: NonNullable<FunnelBeckDashboardData["forecast"]> }> = ({ d }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    {(["dias30", "dias60", "dias90"] as const).map((k) => {
      const labels = { dias30: "30 días", dias60: "60 días", dias90: "90 días" };
      const item = d[k];
      return (
        <div key={k} className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Forecast {labels[k]}
          </p>
          <p className="text-2xl font-bold text-indigo-800">{formatNum(item.cantidad)}</p>
          <p className="text-xs text-slate-500">oportunidades</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Monto total</span>
              <span className="font-mono font-medium">{formatClp(item.montoClp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monto ponderado</span>
              <span className="font-mono font-medium text-indigo-700">{formatClp(item.montoPonderadoClp)}</span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// ── Sección Ganadas ───────────────────────────────────────────────────────────

const SeccionGanadas: React.FC<{ d: NonNullable<FunnelBeckDashboardData["ganadas"]> }> = ({ d }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <KpiCard
        label="Monto ganado este mes"
        value={formatClp(d.montoGanadoMesActualClp)}
        color="#22c55e"
      />
    </div>
    <Card size="small" title="Ganadas últimos 12 meses" className="rounded-xl border-slate-200 shadow-sm">
      {d.montoGanadoUltimos12Meses.length === 0 ? <EmptyMsg /> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={d.montoGanadoUltimos12Meses} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
              width={60}
              tickFormatter={(v: number) =>
                v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`
              }
            />
            <Tooltip
              formatter={(v, name) =>
                name === "montoClp" ? [formatClp(v as number), "Monto CLP"] : [formatNum(v as number), "Cantidad"]
              }
            />
            <Legend iconSize={10} />
            <Bar yAxisId="left" dataKey="cantidad" fill={BAR_COLOR_CANTIDAD} radius={[3, 3, 0, 0]} name="Cantidad" />
            <Bar yAxisId="right" dataKey="montoClp" fill="#22c55e" radius={[3, 3, 0, 0]} name="Monto CLP" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  </div>
);

// ── Sección Motivos ───────────────────────────────────────────────────────────

const TablaMotivos: React.FC<{ data: { motivo: string; cantidad: number }[]; title: string; color: string }> = ({
  data,
  title,
  color,
}) => (
  <Card size="small" title={<span style={{ color }}>{title}</span>} className="rounded-xl border-slate-200 shadow-sm">
    {data.length === 0 ? (
      <EmptyMsg />
    ) : (
      <Table
        rowKey="motivo"
        columns={[
          { title: "Motivo", dataIndex: "motivo", key: "motivo", ellipsis: true },
          { title: "Cantidad", dataIndex: "cantidad", key: "cantidad", width: 80, align: "right" as const,
            render: (v: number) => formatNum(v) },
        ]}
        dataSource={data}
        size="small"
        pagination={false}
      />
    )}
  </Card>
);

const SeccionMotivos: React.FC<{ d: NonNullable<FunnelBeckDashboardData["motivos"]> }> = ({ d }) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <TablaMotivos data={d.perdida} title="Motivos de pérdida" color="#ef4444" />
    <TablaMotivos data={d.postergacion} title="Motivos de postergación" color="#f59e0b" />
    <TablaMotivos data={d.descarte} title="Motivos de descarte" color="#6b7280" />
  </div>
);

// ── Sección Riesgo Comercial ──────────────────────────────────────────────────

const colsRiesgo = (showUpdatedAt: boolean): ColumnsType<FunnelBeckDashboardRiesgoItem> => [
  { title: "Proyecto", dataIndex: "nombreProyecto", key: "nombreProyecto", ellipsis: true },
  { title: "Empresa", dataIndex: "empresa", key: "empresa", ellipsis: true, width: 130 },
  { title: "Vendedor", dataIndex: "vendedor", key: "vendedor", width: 110 },
  { title: "Etapa", dataIndex: "etapa", key: "etapa", width: 150,
    render: (v: string) => <Tag>{formatEtapaBeck(v)}</Tag> },
  ...(showUpdatedAt
    ? [{ title: "Última actividad", dataIndex: "updatedAt", key: "updatedAt", width: 130,
        render: (v: string) => dayjs(v).format("DD-MM-YYYY") } as const]
    : []),
  { title: "Valor CLP", dataIndex: "valorClp", key: "valorClp", align: "right" as const, width: 130,
    render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span> },
];

const SeccionRiesgo: React.FC<{ d: NonNullable<FunnelBeckDashboardData["riesgoComercial"]> }> = ({ d }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <KpiCard
        label="Oportunidades detenidas"
        value={formatNum(d.oportunidadesDetenidas.total)}
        sub={`+${d.oportunidadesDetenidas.diasSinMovimiento} días sin movimiento`}
        danger={d.oportunidadesDetenidas.total > 0}
      />
      <KpiCard
        label="Sin próxima acción"
        value={formatNum(d.oportunidadesSinProximaAccion.total)}
        danger={d.oportunidadesSinProximaAccion.total > 0}
      />
    </div>
    <Card size="small" title="Top detenidas (sin movimiento)" className="rounded-xl border-red-100 shadow-sm">
      {d.oportunidadesDetenidas.items.length === 0 ? <EmptyMsg text="Sin oportunidades detenidas" /> : (
        <Table<FunnelBeckDashboardRiesgoItem>
          rowKey="id"
          columns={colsRiesgo(true)}
          dataSource={d.oportunidadesDetenidas.items}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 800 }}
          rowClassName="bg-red-50/30"
        />
      )}
    </Card>
    <Card size="small" title="Sin próxima acción definida" className="rounded-xl border-amber-100 shadow-sm">
      {d.oportunidadesSinProximaAccion.items.length === 0 ? <EmptyMsg text="Todas tienen próxima acción" /> : (
        <Table<FunnelBeckDashboardRiesgoItem>
          rowKey="id"
          columns={colsRiesgo(false)}
          dataSource={d.oportunidadesSinProximaAccion.items as FunnelBeckDashboardRiesgoItem[]}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 720 }}
          rowClassName="bg-amber-50/30"
        />
      )}
    </Card>
  </div>
);

// ── Sección Conversión por etapa ──────────────────────────────────────────────

const SeccionConversion: React.FC<{ d: NonNullable<FunnelBeckDashboardData["conversionEtapas"]> }> = ({ d }) => {
  const colsEtapas: ColumnsType<typeof d.etapas[0]> = [
    { title: "Etapa", dataIndex: "label", key: "label" },
    { title: "Cantidad", dataIndex: "cantidad", key: "cantidad", width: 90, align: "right" as const,
      render: (v: number) => formatNum(v) },
    { title: "% sobre total", dataIndex: "porcentajeSobreTotal", key: "porcentajeSobreTotal", width: 110, align: "right" as const,
      render: (v: number) => `${v.toFixed(1)}%` },
  ];

  const colsTransiciones: ColumnsType<typeof d.transiciones[0]> = [
    { title: "Desde", dataIndex: "desdeLabel", key: "desdeLabel" },
    { title: "Hasta", dataIndex: "hastaLabel", key: "hastaLabel" },
    { title: "Cantidad desde", dataIndex: "cantidadDesde", key: "cantidadDesde", width: 110, align: "right" as const,
      render: (v: number) => formatNum(v) },
    { title: "Cantidad hasta", dataIndex: "cantidadHasta", key: "cantidadHasta", width: 110, align: "right" as const,
      render: (v: number) => formatNum(v) },
    { title: "Tasa conversión", dataIndex: "tasaConversion", key: "tasaConversion", width: 120, align: "right" as const,
      render: (v: number) => (
        <span className={v >= 50 ? "font-medium text-green-700" : v < 25 ? "font-medium text-red-600" : ""}>
          {v.toFixed(1)}%
        </span>
      ) },
  ];

  return (
    <div className="space-y-4">
      <Card size="small" title="Embudo por etapa" className="rounded-xl border-slate-200 shadow-sm">
        {d.etapas.length === 0 ? <EmptyMsg /> : (
          <Table
            rowKey="etapa"
            columns={colsEtapas}
            dataSource={d.etapas}
            size="small"
            pagination={false}
          />
        )}
      </Card>
      <Card size="small" title="Transiciones entre etapas" className="rounded-xl border-slate-200 shadow-sm">
        {d.transiciones.length === 0 ? <EmptyMsg /> : (
          <Table
            rowKey={(r) => `${r.desde}-${r.hasta}`}
            columns={colsTransiciones}
            dataSource={d.transiciones}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          />
        )}
      </Card>
      <p className="text-xs text-slate-400 italic">
        Conversión aproximada según etapa actual. El cálculo histórico exacto requerirá historial de cambios de etapa.
      </p>
    </div>
  );
};

// ── Dashboard principal ───────────────────────────────────────────────────────

interface Props {
  vendedoresDisponibles?: string[];
  unidadesNegocioDisponibles?: string[];
  origenesDisponibles?: string[];
  tiposClienteDisponibles?: string[];
  tiposOportunidadDisponibles?: string[];
  clientesDisponibles?: string[];
  proyectosDisponibles?: string[];
}

const toOpts = (values: string[]) =>
  [...new Set(values)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map((v) => ({ value: v, label: v }));

const FunnelBeckDashboard: React.FC<Props> = ({
  vendedoresDisponibles = [],
  unidadesNegocioDisponibles = [],
  origenesDisponibles = [],
  tiposClienteDisponibles = [],
  tiposOportunidadDisponibles = [],
  clientesDisponibles = [],
  proyectosDisponibles = [],
}) => {
  const [data, setData] = useState<FunnelBeckDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros existentes
  const [fechaRange, setFechaRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [tipoFecha, setTipoFecha] = useState<string>("createdAt");
  const [vendedor, setVendedor] = useState<string | undefined>();
  const [etapa, setEtapa] = useState<string | undefined>();
  const [diasSinSeg, setDiasSinSeg] = useState<number>(7);

  // Nuevos filtros
  const [unidadNegocio, setUnidadNegocio] = useState<string | undefined>();
  const [origen, setOrigen] = useState<string | undefined>();
  const [tipoCliente, setTipoCliente] = useState<string | undefined>();
  const [tipoOportunidad, setTipoOportunidad] = useState<string | undefined>();
  const [cliente, setCliente] = useState<string | undefined>();
  const [proyecto, setProyecto] = useState<string | undefined>();
  const [estado, setEstado] = useState<string | undefined>();
  const [fechaIngresoRange, setFechaIngresoRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [fechaCierreRange, setFechaCierreRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const buildParams = useCallback((): FunnelBeckDashboardParams => {
    const params: FunnelBeckDashboardParams = {
      tipoFecha,
      diasSinSeguimiento: diasSinSeg,
    };
    if (fechaRange[0]) params.fechaDesde = fechaRange[0].format("YYYY-MM-DD");
    if (fechaRange[1]) params.fechaHasta = fechaRange[1].format("YYYY-MM-DD");
    if (vendedor) params.vendedor = vendedor;
    if (etapa) params.etapa = etapa;
    if (unidadNegocio) params.unidadNegocio = unidadNegocio;
    if (origen) params.origen = origen;
    if (tipoCliente) params.tipoCliente = tipoCliente;
    if (tipoOportunidad) params.tipoOportunidad = tipoOportunidad;
    if (cliente) params.cliente = cliente;
    if (proyecto) params.proyecto = proyecto;
    if (estado) params.estado = estado;
    if (fechaIngresoRange[0]) params.fechaIngresoDesde = fechaIngresoRange[0].format("YYYY-MM-DD");
    if (fechaIngresoRange[1]) params.fechaIngresoHasta = fechaIngresoRange[1].format("YYYY-MM-DD");
    if (fechaCierreRange[0]) params.fechaCierreDesde = fechaCierreRange[0].format("YYYY-MM-DD");
    if (fechaCierreRange[1]) params.fechaCierreHasta = fechaCierreRange[1].format("YYYY-MM-DD");
    return params;
  }, [
    fechaRange, tipoFecha, vendedor, etapa, diasSinSeg,
    unidadNegocio, origen, tipoCliente, tipoOportunidad, cliente, proyecto, estado,
    fechaIngresoRange, fechaCierreRange,
  ]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await funnelBeckAPI.getDashboard(buildParams());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const setRangePreset = (preset: "hoy" | "semana" | "mes" | "anio") => {
    const today = dayjs();
    if (preset === "hoy") {
      setFechaRange([today, today]);
    } else if (preset === "semana") {
      setFechaRange([today.startOf("week"), today.endOf("week")]);
    } else if (preset === "mes") {
      setFechaRange([today.startOf("month"), today.endOf("month")]);
    } else {
      setFechaRange([today.startOf("year"), today.endOf("year")]);
    }
  };

  const clearFilters = () => {
    setFechaRange([null, null]);
    setTipoFecha("createdAt");
    setVendedor(undefined);
    setEtapa(undefined);
    setDiasSinSeg(7);
    setUnidadNegocio(undefined);
    setOrigen(undefined);
    setTipoCliente(undefined);
    setTipoOportunidad(undefined);
    setCliente(undefined);
    setProyecto(undefined);
    setEstado(undefined);
    setFechaIngresoRange([null, null]);
    setFechaCierreRange([null, null]);
  };

  const pieData = useMemo(() => {
    if (!data) return [];
    const { distribucionEstado } = data;
    return [
      { name: "Activas", value: distribucionEstado.activas },
      { name: "Ganadas", value: distribucionEstado.ganadas },
      { name: "Perdidas", value: distribucionEstado.perdidas },
      { name: "Postergadas", value: distribucionEstado.postergadas },
    ].filter((d) => d.value > 0);
  }, [data]);

  const etapasCantidadData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.porEtapa).map(([etapaKey, val]) => ({
      etapa: etapaKey,
      cantidad: val.cantidad,
    }));
  }, [data]);

  const etapasMontoData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.porEtapa).map(([etapaKey, val]) => ({
      etapa: etapaKey,
      monto: val.montoClp,
    }));
  }, [data]);

  const columnsVendedores: ColumnsType<FunnelBeckDashboardVendedor> = [
    { title: "Vendedor", dataIndex: "vendedor", key: "vendedor", width: 160 },
    { title: "Total", dataIndex: "total", key: "total", width: 70, align: "right" },
    { title: "Activas", dataIndex: "activas", key: "activas", width: 75, align: "right" },
    { title: "Ganadas", dataIndex: "ganadas", key: "ganadas", width: 80, align: "right",
      render: (v: number) => <span className="font-medium text-green-700">{formatNum(v)}</span> },
    { title: "Perdidas", dataIndex: "perdidas", key: "perdidas", width: 80, align: "right",
      render: (v: number) => <span className="font-medium text-red-600">{formatNum(v)}</span> },
    { title: "Postergadas", dataIndex: "postergadas", key: "postergadas", width: 100, align: "right",
      render: (v: number) => <span className="font-medium text-amber-600">{formatNum(v)}</span> },
    { title: "Monto total", dataIndex: "montoTotalClp", key: "montoTotalClp", align: "right",
      render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span> },
    { title: "Monto ganado", dataIndex: "montoGanadoClp", key: "montoGanadoClp", align: "right",
      render: (v: number) => <span className="font-mono text-xs text-green-700">{formatClp(v)}</span> },
  ];

  const columnsSinSeg: ColumnsType<FunnelBeckDashboardSinSeguimientoItem> = [
    { title: "Proyecto", dataIndex: "nombreProyecto", key: "nombreProyecto", ellipsis: true },
    { title: "Empresa", dataIndex: "empresa", key: "empresa", ellipsis: true, width: 140 },
    { title: "Vendedor", dataIndex: "vendedor", key: "vendedor", width: 120 },
    { title: "Etapa", dataIndex: "etapa", key: "etapa", width: 150,
      render: (v: string) => <Tag>{formatEtapaBeck(v)}</Tag> },
    { title: "Última actividad", dataIndex: "updatedAt", key: "updatedAt", width: 140,
      render: (v: string) => dayjs(v).format("DD-MM-YYYY") },
    { title: "Próxima acción", dataIndex: "fechaProximaAccion", key: "fechaProximaAccion", width: 130,
      render: (v: string | null) =>
        v ? (
          <span className={dayjs(v).isBefore(dayjs(), "day") ? "font-medium text-red-600" : ""}>
            {dayjs(v).format("DD-MM-YYYY")}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    { title: "Valor CLP", dataIndex: "valorClp", key: "valorClp", align: "right", width: 130,
      render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span> },
  ];

  const vendedoresOpts = useMemo(
    () => vendedoresDisponibles.map((v) => ({ value: v, label: v })),
    [vendedoresDisponibles]
  );

  const unidadNegocioOpts = useMemo(() => toOpts(unidadesNegocioDisponibles), [unidadesNegocioDisponibles]);
  const origenOpts = useMemo(() => toOpts(origenesDisponibles), [origenesDisponibles]);
  const tipoClienteOpts = useMemo(() => toOpts(tiposClienteDisponibles), [tiposClienteDisponibles]);
  const tipoOportunidadOpts = useMemo(() => toOpts(tiposOportunidadDisponibles), [tiposOportunidadDisponibles]);
  const clienteOpts = useMemo(() => toOpts(clientesDisponibles), [clientesDisponibles]);
  const proyectoOpts = useMemo(() => toOpts(proyectosDisponibles), [proyectosDisponibles]);

  const newSections = useMemo(() => {
    if (!data) return [];
    const items = [];
    if (data.prospectos) items.push({
      key: "prospectos",
      label: <span className="font-semibold">Prospectos</span>,
      children: <SeccionProspectos d={data.prospectos} />,
    });
    if (data.pipelineAvanzado) items.push({
      key: "pipeline",
      label: <span className="font-semibold">Pipeline avanzado</span>,
      children: <SeccionPipeline d={data.pipelineAvanzado} />,
    });
    if (data.forecast) items.push({
      key: "forecast",
      label: <span className="font-semibold">Forecast</span>,
      children: <SeccionForecast d={data.forecast} />,
    });
    if (data.ganadas) items.push({
      key: "ganadas",
      label: <span className="font-semibold">Ganadas</span>,
      children: <SeccionGanadas d={data.ganadas} />,
    });
    if (data.motivos) items.push({
      key: "motivos",
      label: <span className="font-semibold">Motivos de cierre</span>,
      children: <SeccionMotivos d={data.motivos} />,
    });
    if (data.riesgoComercial) items.push({
      key: "riesgo",
      label: <span className="font-semibold text-red-600">Riesgo comercial</span>,
      children: <SeccionRiesgo d={data.riesgoComercial} />,
    });
    if (data.conversionEtapas) items.push({
      key: "conversion",
      label: <span className="font-semibold">Conversión por etapa</span>,
      children: <SeccionConversion d={data.conversionEtapas} />,
    });
    return items;
  }, [data]);

  return (
    <div className="space-y-5 px-1 py-2">
      {/* ── Filtros ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filtros
          </Typography.Text>
          <Space size={4} wrap>
            <Button size="small" onClick={() => setRangePreset("hoy")}>Hoy</Button>
            <Button size="small" onClick={() => setRangePreset("semana")}>Esta semana</Button>
            <Button size="small" onClick={() => setRangePreset("mes")}>Este mes</Button>
            <Button size="small" onClick={() => setRangePreset("anio")}>Este año</Button>
          </Space>
        </div>

        {/* Fila 1: rango genérico + tipo fecha */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <p className="mb-1 text-xs text-slate-500">Rango de fechas</p>
            <RangePicker
              size="small"
              style={{ width: "100%" }}
              value={fechaRange}
              onChange={(vals) =>
                setFechaRange(vals ? [vals[0] ?? null, vals[1] ?? null] : [null, null])
              }
              format="DD-MM-YYYY"
              allowClear
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Tipo de fecha</p>
            <Select size="small" style={{ width: "100%" }} value={tipoFecha} onChange={setTipoFecha} options={TIPO_FECHA_OPTIONS} />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Responsable comercial</p>
            <Select size="small" style={{ width: "100%" }} value={vendedor} onChange={setVendedor}
              options={vendedoresOpts} allowClear showSearch placeholder="Todos" />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Etapa</p>
            <Select size="small" style={{ width: "100%" }} value={etapa} onChange={setEtapa}
              options={ETAPA_OPTIONS} allowClear placeholder="Todas" />
          </div>
        </div>

        {/* Fila 2: nuevos filtros */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <p className="mb-1 text-xs text-slate-500">Unidad de negocio</p>
            <Select size="small" style={{ width: "100%" }} value={unidadNegocio} onChange={setUnidadNegocio}
              options={unidadNegocioOpts} showSearch allowClear optionFilterProp="label" placeholder="Seleccionar..." />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Origen</p>
            <Select size="small" style={{ width: "100%" }} value={origen} onChange={setOrigen}
              options={origenOpts} showSearch allowClear optionFilterProp="label" placeholder="Seleccionar..." />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Tipo cliente</p>
            <Select size="small" style={{ width: "100%" }} value={tipoCliente} onChange={setTipoCliente}
              options={tipoClienteOpts} showSearch allowClear optionFilterProp="label" placeholder="Seleccionar..." />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Tipo oportunidad</p>
            <Select size="small" style={{ width: "100%" }} value={tipoOportunidad} onChange={setTipoOportunidad}
              options={tipoOportunidadOpts} showSearch allowClear optionFilterProp="label" placeholder="Seleccionar..." />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Cliente</p>
            <Select size="small" style={{ width: "100%" }} value={cliente} onChange={setCliente}
              options={clienteOpts} showSearch allowClear optionFilterProp="label" placeholder="Seleccionar..." />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Proyecto</p>
            <Select size="small" style={{ width: "100%" }} value={proyecto} onChange={setProyecto}
              options={proyectoOpts} showSearch allowClear optionFilterProp="label" placeholder="Seleccionar..." />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Estado</p>
            <Select size="small" style={{ width: "100%" }} value={estado} onChange={setEstado}
              options={ESTADO_OPTIONS} allowClear placeholder="Todos" />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Días sin seguimiento</p>
            <Select size="small" value={diasSinSeg} onChange={(v) => setDiasSinSeg(v as number)}
              options={[
                { value: 3, label: "3 días" }, { value: 7, label: "7 días" },
                { value: 14, label: "14 días" }, { value: 30, label: "30 días" },
                { value: 60, label: "60 días" },
              ]}
              style={{ width: "100%" }} />
          </div>
        </div>

        {/* Fila 3: fechas ingreso y cierre */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-slate-500">Fecha ingreso desde / hasta</p>
            <RangePicker size="small" style={{ width: "100%" }} value={fechaIngresoRange}
              onChange={(vals) => setFechaIngresoRange(vals ? [vals[0] ?? null, vals[1] ?? null] : [null, null])}
              format="DD-MM-YYYY" allowClear />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Fecha cierre desde / hasta</p>
            <RangePicker size="small" style={{ width: "100%" }} value={fechaCierreRange}
              onChange={(vals) => setFechaCierreRange(vals ? [vals[0] ?? null, vals[1] ?? null] : [null, null])}
              format="DD-MM-YYYY" allowClear />
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="primary" size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => void cargar()}>
            Aplicar filtros
          </Button>
          <Button size="small" onClick={clearFilters}>Limpiar filtros</Button>
          <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => void cargar()}>
            Recargar
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" showIcon message="Error al cargar el dashboard" description={error}
          action={<Button size="small" onClick={() => void cargar()}>Reintentar</Button>} />
      )}

      {loading && !data && <Skeleton active paragraph={{ rows: 10 }} />}

      {data && (
        <>
          {/* ── KPIs base ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            <KpiCard label="Total oportunidades" value={formatNum(data.kpis.totalOportunidades)} />
            <KpiCard label="Activas" value={formatNum(data.kpis.oportunidadesActivas)} color="#3b82f6" />
            <KpiCard label="Ganadas" value={formatNum(data.kpis.oportunidadesGanadas)} color="#22c55e" />
            <KpiCard label="Perdidas" value={formatNum(data.kpis.oportunidadesPerdidas)} color="#ef4444" />
            <KpiCard label="Postergadas" value={formatNum(data.kpis.oportunidadesPostergadas)} color="#f59e0b" />
            <KpiCard label="Pipeline total" value={formatClp(data.kpis.pipelineTotalClp)} sub="CLP total activas" color="#6366f1" />
            <KpiCard label="Monto ganado" value={formatClp(data.kpis.montoGanadoClp)} color="#22c55e" />
            <KpiCard label="Monto perdido" value={formatClp(data.kpis.montoPerdidoClp)} color="#ef4444" />
            <KpiCard label="Tasa de cierre" value={`${data.kpis.tasaCierre.toFixed(1)}%`}
              sub="ganadas / (ganadas + perdidas)" color="#6366f1" />
            <KpiCard label="Sin seguimiento" value={formatNum(data.sinSeguimiento.totalSinSeguimiento)}
              sub={`+${diasSinSeg} días sin movimiento`} danger={data.sinSeguimiento.totalSinSeguimiento > 0} />
            <KpiCard label="Acciones vencidas" value={formatNum(data.proximasAcciones.accionesVencidas)}
              danger={data.proximasAcciones.accionesVencidas > 0} />
          </div>

          {/* ── Próximas acciones ── */}
          <div>
            <Typography.Text className="mb-3 block text-sm font-semibold text-slate-700">
              Próximas acciones
            </Typography.Text>
            <div className="grid grid-cols-3 gap-3">
              <ProximasCard label="Vencidas" value={data.proximasAcciones.accionesVencidas} color="#dc2626" bg="border border-red-200 bg-red-50" />
              <ProximasCard label="Hoy" value={data.proximasAcciones.accionesHoy} color="#d97706" bg="border border-amber-200 bg-amber-50" />
              <ProximasCard label="Próximos 7 días" value={data.proximasAcciones.accionesProximos7Dias} color="#2563eb" bg="border border-blue-200 bg-blue-50" />
            </div>
          </div>

          {/* ── Gráficos base ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card size="small" title={<span className="text-sm font-semibold">Distribución por estado</span>}
              className="rounded-xl border border-slate-200 shadow-sm">
              {pieData.length === 0 ? <EmptyMsg /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
                      dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatNum(v as number)} />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card size="small" title={<span className="text-sm font-semibold">Oportunidades por etapa</span>}
              className="rounded-xl border border-slate-200 shadow-sm">
              {etapasCantidadData.length === 0 ? <EmptyMsg /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={etapasCantidadData} margin={{ top: 4, right: 8, left: 0, bottom: 56 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="etapa" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} tickFormatter={etapaShortLabel} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                    <Tooltip formatter={(v) => [formatNum(v as number), "Cantidad"]} labelFormatter={formatEtapaBeck} />
                    <Bar dataKey="cantidad" fill={BAR_COLOR_CANTIDAD} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card size="small" title={<span className="text-sm font-semibold">Monto por etapa (CLP)</span>}
              className="rounded-xl border border-slate-200 shadow-sm">
              {etapasMontoData.length === 0 ? <EmptyMsg /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={etapasMontoData} margin={{ top: 4, right: 8, left: 0, bottom: 56 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="etapa" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} tickFormatter={etapaShortLabel} />
                    <YAxis tick={{ fontSize: 10 }} width={48}
                      tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => [formatClp(v as number), "Monto CLP"]} labelFormatter={formatEtapaBeck} />
                    <Bar dataKey="monto" fill={BAR_COLOR_MONTO} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── Ranking vendedores ── */}
          <div>
            <Typography.Text className="mb-3 block text-sm font-semibold text-slate-700">Ranking vendedores</Typography.Text>
            {data.rankingVendedores.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos de vendedores</p>
            ) : (
              <Table<FunnelBeckDashboardVendedor>
                rowKey="vendedor" columns={columnsVendedores} dataSource={data.rankingVendedores}
                size="small" pagination={false} scroll={{ x: 700 }}
                className="rounded-xl border border-slate-200 shadow-sm" />
            )}
          </div>

          {/* ── Sin seguimiento ── */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <WarningOutlined className="text-amber-500" />
              <Typography.Text className="text-sm font-semibold text-slate-700">Oportunidades sin seguimiento</Typography.Text>
              {data.sinSeguimiento.totalSinSeguimiento > 0 && (
                <Tag color="orange">
                  {data.sinSeguimiento.totalSinSeguimiento} oportunidad
                  {data.sinSeguimiento.totalSinSeguimiento !== 1 ? "es" : ""} activa
                  {data.sinSeguimiento.totalSinSeguimiento !== 1 ? "s" : ""} sin movimiento en más de{" "}
                  {data.sinSeguimiento.diasSinSeguimiento} días
                </Tag>
              )}
            </div>
            {data.sinSeguimiento.oportunidadesSinSeguimiento.length === 0 ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
                Todas las oportunidades activas tienen seguimiento reciente
              </div>
            ) : (
              <Table<FunnelBeckDashboardSinSeguimientoItem>
                rowKey="id" columns={columnsSinSeg} dataSource={data.sinSeguimiento.oportunidadesSinSeguimiento}
                size="small" pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 900 }}
                className="rounded-xl border border-amber-200 shadow-sm" rowClassName="bg-amber-50/40" />
            )}
          </div>

          {/* ── Nuevas secciones KPI Punto 14 ── */}
          {newSections.length > 0 && (
            <div>
              <Typography.Text className="mb-3 block text-sm font-semibold text-slate-700">
                Análisis avanzado
              </Typography.Text>
              <Collapse
                items={newSections}
                defaultActiveKey={["prospectos", "forecast", "riesgo"]}
                className="rounded-xl border-slate-200 shadow-sm"
                size="small"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FunnelBeckDashboard;
