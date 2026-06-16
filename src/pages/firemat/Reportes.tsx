import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import {
  BarChartOutlined,
  ClearOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import {
  firematCategoriasAPI,
  firematProductosAPI,
  firematReportesAPI,
  type CategoriaFiremat,
  type FirematReporteInventarioCritico,
  type FirematReporteMovimientoReciente,
  type FirematReporteProductoResumen,
  type FirematReporteVentaDetalle,
  type FirematReportesData,
  type FirematReportesParams,
  type ProductoFiremat,
} from "../../services/api";

/* ── helpers ──────────────────────────────────────────── */

const formatCLP = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);

const formatYVentas = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
};

/* ── constantes ───────────────────────────────────────── */

const COTIZ_COLORES: Record<string, string> = {
  BORRADOR: "#94a3b8",
  ENVIADA: "#1677ff",
  SEGUIMIENTO: "#9254de",
  ORDEN_CONFIRMADA: "#13c2c2",
  GANADA: "#52c41a",
  PERDIDA: "#ff4d4f",
  POSTERGADA: "#fa8c16",
};

const COTIZ_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  SEGUIMIENTO: "Seguimiento",
  ORDEN_CONFIRMADA: "Confirmada",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
  POSTERGADA: "Postergada",
};

const ETAPA_COLORES: Record<string, string> = {
  PROSPECTO: "#1677ff",
  PRIMER_CONTACTO: "#9254de",
  DESARROLLO_COTIZACION: "#fa8c16",
  COTIZACION_ENVIADA: "#13c2c2",
  ORDEN_CONFIRMADA: "#52c41a",
  GANADA: "#52c41a",
  PERDIDA: "#ff4d4f",
  POSTERGADA: "#fa8c16",
  DESCARTADO: "#94a3b8",
};

const ETAPA_LABELS: Record<string, string> = {
  PROSPECTO: "Prospecto",
  PRIMER_CONTACTO: "Primer contacto",
  DESARROLLO_COTIZACION: "Dev. cotización",
  COTIZACION_ENVIADA: "Cotiz. enviada",
  ORDEN_CONFIRMADA: "Orden confirmada",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
  POSTERGADA: "Postergada",
  DESCARTADO: "Descartado",
};

const TIPO_COLOR: Record<string, string> = {
  ENTRADA: "green",
  SALIDA: "red",
  AJUSTE: "blue",
  RESERVA: "orange",
  LIBERACION: "cyan",
  ENTRADA_INICIAL: "geekblue",
};

const FIREMAT_BAR_COLORS = ["#e05c3b", "#f4a17a", "#c0392b", "#f39c12", "#e67e22", "#d35400"];

const ESTADO_VENTA_OPTIONS = [
  { label: "Cerrada", value: "cerrada" },
  { label: "Prospecto", value: "prospecto" },
];

const ESTADO_COTIZACION_OPTIONS = [
  { label: "Borrador", value: "BORRADOR" },
  { label: "Enviada", value: "ENVIADA" },
  { label: "Seguimiento", value: "SEGUIMIENTO" },
  { label: "Orden confirmada", value: "ORDEN_CONFIRMADA" },
  { label: "Ganada", value: "GANADA" },
  { label: "Perdida", value: "PERDIDA" },
  { label: "Postergada", value: "POSTERGADA" },
];

const ETAPA_OPORTUNIDAD_OPTIONS = [
  { label: "Prospecto", value: "PROSPECTO" },
  { label: "Primer contacto", value: "PRIMER_CONTACTO" },
  { label: "Desarrollo cotización", value: "DESARROLLO_COTIZACION" },
  { label: "Cotización enviada", value: "COTIZACION_ENVIADA" },
  { label: "Orden confirmada", value: "ORDEN_CONFIRMADA" },
  { label: "Ganada", value: "GANADA" },
  { label: "Perdida", value: "PERDIDA" },
  { label: "Postergada", value: "POSTERGADA" },
  { label: "Descartado", value: "DESCARTADO" },
];

const CARD_GRAFICO = {
  header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 },
  body: { padding: "16px 8px 12px" },
};

/* ── estilos de KPI card compartidos ─────────────────── */

const kpiBody = { body: { padding: "16px" } };

/* ── componente principal ─────────────────────────────── */

const FirematReportes: React.FC = () => {
  /* ── filtros ── */
  const [fechaRange, setFechaRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [productoId, setProductoId] = useState<number | undefined>();
  const [estadoVenta, setEstadoVenta] = useState<string | undefined>();
  const [estadoCotizacion, setEstadoCotizacion] = useState<string | undefined>();
  const [etapaOportunidad, setEtapaOportunidad] = useState<string | undefined>();

  /* ── datos para selects ── */
  const [categorias, setCategorias] = useState<CategoriaFiremat[]>([]);
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);

  /* ── reporte ── */
  const [reporte, setReporte] = useState<FirematReportesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  /* ── carga de selects en mount ── */
  useEffect(() => {
    firematCategoriasAPI.listar()
      .then((data) => setCategorias(data))
      .catch(() => setCategorias([]));

    firematProductosAPI.listar({ activo: true })
      .then((res) => setProductos(res.data))
      .catch(() => setProductos([]));
  }, []);

  /* ── función de carga de reporte ── */
  const cargarReporte = useCallback(async (params: FirematReportesParams) => {
    try {
      setLoading(true);
      setError(false);
      const data = await firematReportesAPI.obtener(params);
      setReporte(data);
    } catch {
      setError(true);
      void message.error("No se pudo cargar el reporte. Verifique la conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── carga inicial ── */
  useEffect(() => {
    void cargarReporte({});
  }, [cargarReporte]);

  /* ── handlers ── */
  const buildParams = (): FirematReportesParams => {
    const params: FirematReportesParams = {};
    if (fechaRange?.[0]) params.fechaDesde = fechaRange[0].format("YYYY-MM-DD");
    if (fechaRange?.[1]) params.fechaHasta = fechaRange[1].format("YYYY-MM-DD");
    if (categoriaId) params.categoriaId = categoriaId;
    if (productoId) params.productoId = productoId;
    if (estadoVenta) params.estadoVenta = estadoVenta;
    if (estadoCotizacion) params.estadoCotizacion = estadoCotizacion;
    if (etapaOportunidad) params.etapaOportunidad = etapaOportunidad;
    return params;
  };

  const handleActualizar = () => void cargarReporte(buildParams());

  const handleLimpiar = () => {
    setFechaRange(null);
    setCategoriaId(undefined);
    setProductoId(undefined);
    setEstadoVenta(undefined);
    setEstadoCotizacion(undefined);
    setEtapaOportunidad(undefined);
    void cargarReporte({});
  };

  const hayFiltros =
    fechaRange !== null ||
    categoriaId !== undefined ||
    productoId !== undefined ||
    estadoVenta !== undefined ||
    estadoCotizacion !== undefined ||
    etapaOportunidad !== undefined;

  /* ── datos derivados para gráficos ── */

  const ventasPorMesChart = useMemo(
    () =>
      (reporte?.ventasPorMes ?? []).map((v) => ({
        label: dayjs(v.mes + "-01").format("MMM YY"),
        monto: v.monto,
        cantidad: v.cantidad,
      })),
    [reporte]
  );

  const ventasPorProductoChart = useMemo(
    () =>
      (reporte?.ventasPorProducto ?? []).slice(0, 10).map((v) => ({
        nombre: v.nombre.length > 22 ? v.nombre.slice(0, 20) + "…" : v.nombre,
        monto: v.montoVendido,
        cantidad: v.cantidadVendida,
      })),
    [reporte]
  );

  const cotizPorEstadoChart = useMemo(
    () =>
      (reporte?.cotizacionesPorEstado ?? []).map((c) => ({
        name: COTIZ_LABELS[c.estado] ?? c.estado,
        value: c.cantidad,
        fill: COTIZ_COLORES[c.estado] ?? "#94a3b8",
      })),
    [reporte]
  );

  const oportunidadesPorEtapaChart = useMemo(
    () =>
      (reporte?.oportunidadesPorEtapa ?? []).map((o) => ({
        name: ETAPA_LABELS[o.etapa] ?? o.etapa,
        value: o.cantidad,
        fill: ETAPA_COLORES[o.etapa] ?? "#94a3b8",
      })),
    [reporte]
  );

  const invCriticoChart = useMemo(
    () =>
      (reporte?.inventarioCritico ?? []).slice(0, 10).map((i) => ({
        nombre: i.nombre.length > 24 ? i.nombre.slice(0, 22) + "…" : i.nombre,
        stock: i.stockDisponible,
        minimo: i.minStock,
      })),
    [reporte]
  );

  /* ── columnas de tablas ── */

  const columnasVentas: ColumnsType<FirematReporteVentaDetalle> = [
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      width: 110,
      render: (v: string) => (
        <span className="text-xs text-beck-muted">{dayjs(v).format("DD-MM-YYYY")}</span>
      ),
    },
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
      render: (v: string) => <span className="text-xs font-medium">{v}</span>,
    },
    {
      title: "Responsable",
      dataIndex: "responsable",
      key: "responsable",
      width: 130,
      render: (v: string | null) => (
        <span className="text-xs text-beck-muted">{v ?? "—"}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 100,
      render: (v: string) => <Tag style={{ fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 120,
      align: "right" as const,
      render: (v: number) => (
        <span className="text-xs font-semibold tabular-nums">{formatCLP(v)}</span>
      ),
    },
  ];

  const columnasProductos: ColumnsType<FirematReporteProductoResumen> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 90,
      render: (v: string) => (
        <span className="font-mono text-xs">{v || "—"}</span>
      ),
    },
    {
      title: "Producto",
      dataIndex: "nombre",
      key: "nombre",
      render: (v: string) => <span className="text-xs font-medium">{v}</span>,
    },
    {
      title: "Categoría",
      dataIndex: "categoria",
      key: "categoria",
      width: 130,
      render: (v: string) => <span className="text-xs text-beck-muted">{v}</span>,
    },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
      width: 65,
      align: "right" as const,
      render: (v: number) => <span className="text-xs tabular-nums">{v}</span>,
    },
    {
      title: "Disponible",
      dataIndex: "stockDisponible",
      key: "stockDisponible",
      width: 80,
      align: "right" as const,
      render: (v: number) => <span className="text-xs tabular-nums">{v}</span>,
    },
    {
      title: "Mínimo",
      dataIndex: "minStock",
      key: "minStock",
      width: 65,
      align: "right" as const,
      render: (v: number) => (
        <span className="text-xs text-beck-muted tabular-nums">{v}</span>
      ),
    },
    {
      title: "Precio",
      dataIndex: "precio",
      key: "precio",
      width: 110,
      align: "right" as const,
      render: (v: number) => (
        <span className="text-xs tabular-nums">{formatCLP(v)}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "activo",
      key: "activo",
      width: 72,
      render: (v: boolean) =>
        v ? (
          <Tag color="green" style={{ fontSize: 11 }}>Activo</Tag>
        ) : (
          <Tag color="default" style={{ fontSize: 11 }}>Inactivo</Tag>
        ),
    },
  ];

  const columnasMovimientos: ColumnsType<FirematReporteMovimientoReciente> = [
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      width: 125,
      render: (v: string) => (
        <span className="text-xs text-beck-muted">{dayjs(v).format("DD-MM-YY HH:mm")}</span>
      ),
    },
    {
      title: "Producto",
      dataIndex: "productoNombre",
      key: "productoNombre",
      render: (v: string) => <span className="text-xs font-medium">{v}</span>,
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 130,
      render: (v: string) => (
        <Tag color={TIPO_COLOR[v] ?? "default"} style={{ fontSize: 11 }}>{v}</Tag>
      ),
    },
    {
      title: "Cantidad",
      dataIndex: "cantidad",
      key: "cantidad",
      width: 80,
      align: "right" as const,
      render: (v: number) => <span className="text-xs font-semibold tabular-nums">{v}</span>,
    },
    {
      title: "Motivo",
      dataIndex: "motivo",
      key: "motivo",
      render: (v: string | null) => (
        <span className="text-xs text-beck-muted">{v ?? "—"}</span>
      ),
    },
  ];

  const columnasInventarioCritico: ColumnsType<FirematReporteInventarioCritico> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 90,
      render: (v: string) => (
        <span className="font-mono text-xs">{v || "—"}</span>
      ),
    },
    {
      title: "Producto",
      dataIndex: "nombre",
      key: "nombre",
      render: (v: string) => <span className="text-xs font-medium">{v}</span>,
    },
    {
      title: "Categoría",
      dataIndex: "categoria",
      key: "categoria",
      width: 130,
      render: (v: string) => <span className="text-xs text-beck-muted">{v}</span>,
    },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
      width: 65,
      align: "right" as const,
      render: (v: number) => <span className="text-xs tabular-nums">{v}</span>,
    },
    {
      title: "Disponible",
      dataIndex: "stockDisponible",
      key: "stockDisponible",
      width: 80,
      align: "right" as const,
      render: (v: number) => <span className="text-xs tabular-nums">{v}</span>,
    },
    {
      title: "Mínimo",
      dataIndex: "minStock",
      key: "minStock",
      width: 65,
      align: "right" as const,
      render: (v: number) => (
        <span className="text-xs text-beck-muted tabular-nums">{v}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estadoStock",
      key: "estadoStock",
      width: 100,
      render: (v: string) => (
        <Tag color={v === "SIN_STOCK" ? "red" : "orange"} style={{ fontSize: 11 }}>
          {v === "SIN_STOCK" ? "Sin stock" : "Bajo mínimo"}
        </Tag>
      ),
    },
  ];

  /* ── helpers de render ── */

  const renderPieLegend = (data: { name: string; value: number; fill: string }[]) => (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: d.fill }} />
          <span className="text-[11px] text-beck-muted">
            {d.name}: <strong className="text-beck-ink">{d.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );

  const kpis = reporte?.kpis;

  /* ── render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="firemat-badge">
            <BarChartOutlined style={{ fontSize: 10 }} />
            <span>Reportes</span>
          </div>
        </div>
        <h1 className="mt-2 text-xl font-semibold text-beck-ink">
          Reportes comerciales e inventario Firemat
        </h1>
        <p className="mt-1 text-sm text-beck-muted">
          Análisis de ventas, stock y rendimiento comercial.
        </p>
      </div>

      {/* ── Filtros ── */}
      <section className="firemat-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            value={fechaRange}
            onChange={(dates) =>
              setFechaRange(dates as [Dayjs | null, Dayjs | null] | null)
            }
            placeholder={["Fecha desde", "Fecha hasta"]}
            style={{ minWidth: 220 }}
          />

          <Select
            allowClear
            placeholder="Categoría"
            value={categoriaId ?? null}
            onChange={(v: number | null) => setCategoriaId(v ?? undefined)}
            showSearch
            filterOption={(input, opt) =>
              String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={categorias.map((c) => ({ label: c.nombre, value: c.id }))}
            style={{ minWidth: 160 }}
          />

          <Select
            allowClear
            placeholder="Producto"
            value={productoId ?? null}
            onChange={(v: number | null) => setProductoId(v ?? undefined)}
            showSearch
            filterOption={(input, opt) =>
              String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={productos.map((p) => ({ label: p.nombre, value: p.id }))}
            style={{ minWidth: 180 }}
          />

          <Select
            allowClear
            placeholder="Estado venta"
            value={estadoVenta ?? null}
            onChange={(v: string | null) => setEstadoVenta(v ?? undefined)}
            options={ESTADO_VENTA_OPTIONS}
            style={{ minWidth: 140 }}
          />

          <Select
            allowClear
            placeholder="Estado cotización"
            value={estadoCotizacion ?? null}
            onChange={(v: string | null) => setEstadoCotizacion(v ?? undefined)}
            options={ESTADO_COTIZACION_OPTIONS}
            style={{ minWidth: 160 }}
          />

          <Select
            allowClear
            placeholder="Etapa oportunidad"
            value={etapaOportunidad ?? null}
            onChange={(v: string | null) => setEtapaOportunidad(v ?? undefined)}
            options={ETAPA_OPORTUNIDAD_OPTIONS}
            style={{ minWidth: 180 }}
          />

          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleActualizar}
            loading={loading}
            className="firemat-action-button"
          >
            Actualizar
          </Button>

          {hayFiltros && (
            <Button icon={<ClearOutlined />} onClick={handleLimpiar}>
              Limpiar
            </Button>
          )}
        </div>
      </section>

      {/* ── Estado de carga / error ── */}
      {loading && !reporte && (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      )}

      {error && !reporte && (
        <div className="flex justify-center py-16">
          <Empty description="No se pudo cargar el reporte. Intente nuevamente." />
        </div>
      )}

      {reporte && (
        <>
          {/* ── KPIs fila 1 ── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Total ventas</p>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {kpis?.totalVentas.toLocaleString("es-CL") ?? "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">transacciones</p>
            </Card>

            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Monto vendido</p>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {kpis != null ? formatCLP(kpis.montoVendido) : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">total acumulado</p>
            </Card>

            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Ticket promedio</p>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {kpis != null ? formatCLP(kpis.ticketPromedio) : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">por venta</p>
            </Card>

            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Productos activos</p>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {kpis?.productosActivos.toLocaleString("es-CL") ?? "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">
                de {kpis?.totalProductos.toLocaleString("es-CL") ?? "—"} totales
              </p>
            </Card>
          </div>

          {/* ── KPIs fila 2 ── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Bajo stock</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {kpis?.productosBajoStock.toLocaleString("es-CL") ?? "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">productos</p>
            </Card>

            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Sin stock</p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {kpis?.productosSinStock.toLocaleString("es-CL") ?? "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">productos</p>
            </Card>

            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Cotizaciones activas</p>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {kpis?.cotizacionesActivas.toLocaleString("es-CL") ?? "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">
                de {kpis?.cotizacionesTotal.toLocaleString("es-CL") ?? "—"} totales
              </p>
            </Card>

            <Card className="firemat-kpi-card" styles={kpiBody}>
              <p className="text-xs text-beck-muted">Oportunidades activas</p>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {kpis?.oportunidadesActivas.toLocaleString("es-CL") ?? "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">
                de {kpis?.oportunidadesTotal.toLocaleString("es-CL") ?? "—"} totales
              </p>
            </Card>
          </div>

          {/* ── Gráficos fila 1: Ventas ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Ventas por mes */}
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Ventas por mes</span>}
              className="border border-slate-200 bg-white"
              styles={CARD_GRAFICO}
            >
              {ventasPorMesChart.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">
                  Sin datos de ventas
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ventasPorMesChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYVentas} width={52} />
                    <RTooltip
                      formatter={(val, name) => [
                        name === "monto" ? formatCLP(Number(val)) : String(val),
                        name === "monto" ? "Monto" : "Cantidad",
                      ]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="monto" fill="#e05c3b" radius={[4, 4, 0, 0]} name="monto" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Ventas por producto */}
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Ventas por producto — top 10</span>}
              className="border border-slate-200 bg-white"
              styles={CARD_GRAFICO}
            >
              {ventasPorProductoChart.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">
                  Sin datos de ventas
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={ventasPorProductoChart}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatYVentas} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={120} />
                    <RTooltip
                      formatter={(val) => [formatCLP(Number(val)), "Monto vendido"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="monto" radius={[0, 4, 4, 0]} name="monto">
                      {ventasPorProductoChart.map((_, i) => (
                        <Cell key={i} fill={FIREMAT_BAR_COLORS[i % FIREMAT_BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── Gráficos fila 2: Cotizaciones y Oportunidades ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Cotizaciones por estado */}
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Cotizaciones por estado</span>}
              className="border border-slate-200 bg-white"
              styles={CARD_GRAFICO}
            >
              {cotizPorEstadoChart.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">
                  Sin cotizaciones
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={cotizPorEstadoChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={88}
                        dataKey="value"
                        nameKey="name"
                      >
                        {cotizPorEstadoChart.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RTooltip
                        formatter={(val, name) => [String(val), String(name)]}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {renderPieLegend(cotizPorEstadoChart)}
                </>
              )}
            </Card>

            {/* Oportunidades por etapa */}
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Oportunidades por etapa</span>}
              className="border border-slate-200 bg-white"
              styles={CARD_GRAFICO}
            >
              {oportunidadesPorEtapaChart.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">
                  Sin oportunidades
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={oportunidadesPorEtapaChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={88}
                        dataKey="value"
                        nameKey="name"
                      >
                        {oportunidadesPorEtapaChart.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RTooltip
                        formatter={(val, name) => [String(val), String(name)]}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {renderPieLegend(oportunidadesPorEtapaChart)}
                </>
              )}
            </Card>
          </div>

          {/* ── Inventario crítico ── */}
          {(reporte.inventarioCritico.length > 0) && (
            <Card
              title={
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-beck-ink">Inventario crítico</span>
                  <Tag color="red" style={{ fontSize: 11 }}>
                    {reporte.inventarioCritico.length} producto{reporte.inventarioCritico.length !== 1 ? "s" : ""}
                  </Tag>
                </div>
              }
              className="border border-slate-200 bg-white"
              styles={{ header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 }, body: { padding: "12px 8px" } }}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Gráfico horizontal */}
                <div>
                  {invCriticoChart.length > 0 && (
                    <>
                      <ResponsiveContainer width="100%" height={Math.max(180, invCriticoChart.length * 28)}>
                        <BarChart
                          data={invCriticoChart}
                          layout="vertical"
                          margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                        >
                          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={130} />
                          <RTooltip
                            formatter={(val, name) => [
                              String(val),
                              name === "stock" ? "Stock disponible" : "Mínimo requerido",
                            ]}
                            contentStyle={{ fontSize: 12 }}
                          />
                          <Bar dataKey="stock" fill="#e05c3b" radius={[0, 4, 4, 0]} name="stock" />
                          <Bar dataKey="minimo" fill="#f4c4ba" radius={[0, 4, 4, 0]} name="minimo" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-1 flex justify-center gap-5">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: "#e05c3b" }} />
                          <span className="text-[11px] text-beck-muted">Stock disponible</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: "#f4c4ba" }} />
                          <span className="text-[11px] text-beck-muted">Mínimo requerido</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Tabla */}
                <div>
                  <Table<FirematReporteInventarioCritico>
                    rowKey="productoId"
                    columns={columnasInventarioCritico}
                    dataSource={reporte.inventarioCritico}
                    size="small"
                    pagination={{ pageSize: 10, hideOnSinglePage: true, showTotal: (t) => `${t} productos` }}
                    scroll={{ x: 560 }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ── Tablas de detalle ── */}
          <Card
            className="border border-slate-200 bg-white"
            styles={{ header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 }, body: { padding: "0 0 8px" } }}
            title={<span className="text-sm font-medium text-beck-ink">Detalle</span>}
          >
            <Tabs
              size="small"
              tabBarStyle={{ margin: "0 16px", fontSize: 13 }}
              items={[
                {
                  key: "ventas",
                  label: `Ventas (${reporte.ventasDetalle.length})`,
                  children: (
                    <div className="px-2">
                      <Table<FirematReporteVentaDetalle>
                        rowKey="id"
                        columns={columnasVentas}
                        dataSource={reporte.ventasDetalle}
                        size="small"
                        scroll={{ x: 560 }}
                        pagination={{
                          pageSize: 20,
                          showTotal: (t) => `${t} ventas`,
                          hideOnSinglePage: true,
                        }}
                        locale={{ emptyText: "Sin ventas en el período" }}
                      />
                    </div>
                  ),
                },
                {
                  key: "productos",
                  label: `Productos (${reporte.productosResumen.length})`,
                  children: (
                    <div className="px-2">
                      <Table<FirematReporteProductoResumen>
                        rowKey="id"
                        columns={columnasProductos}
                        dataSource={reporte.productosResumen}
                        size="small"
                        scroll={{ x: 720 }}
                        pagination={{
                          pageSize: 20,
                          showTotal: (t) => `${t} productos`,
                          hideOnSinglePage: true,
                        }}
                        locale={{ emptyText: "Sin productos" }}
                      />
                    </div>
                  ),
                },
                {
                  key: "movimientos",
                  label: `Movimientos recientes (${reporte.movimientosRecientes.length})`,
                  children: (
                    <div className="px-2">
                      <Table<FirematReporteMovimientoReciente>
                        rowKey="id"
                        columns={columnasMovimientos}
                        dataSource={reporte.movimientosRecientes}
                        size="small"
                        scroll={{ x: 560 }}
                        pagination={false}
                        locale={{ emptyText: "Sin movimientos recientes" }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default FirematReportes;
