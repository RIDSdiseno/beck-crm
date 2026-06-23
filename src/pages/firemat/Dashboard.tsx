import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Card, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  FireOutlined,
  HistoryOutlined,
  InboxOutlined,
  LockOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { NavLink } from "react-router-dom";
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
  firematCotizacionesAPI,
  firematFunnelAPI,
  firematInventarioAPI,
  firematVentasAPI,
  type FirematCotizacion,
  type InventarioFirematItem,
  type InventarioFirematResumen,
  type MovimientoFiremat,
  type VentaFiremat,
} from "../../services/api";
import { usePermisos } from "../../hooks/usePermisos";

/* ── helpers ────────────────────────────────────────────── */

const formatCLP = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);

const kpiVal = (val: number | null | undefined, fallback = "...") =>
  val == null ? fallback : val.toLocaleString("es-CL");

const formatYVentas = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
};

const TIPO_COLOR: Record<string, string> = {
  ENTRADA: "green",
  SALIDA: "red",
  AJUSTE: "blue",
  RESERVA: "orange",
  LIBERACION: "cyan",
  ENTRADA_INICIAL: "geekblue",
};

const ESTADO_COLOR: Record<string, string> = {
  SIN_STOCK: "red",
  BAJO_STOCK: "orange",
  OK: "green",
};

const ESTADO_LABEL: Record<string, string> = {
  SIN_STOCK: "Sin stock",
  BAJO_STOCK: "Bajo mínimo",
  OK: "OK",
};

const CHART_COLORS = ["#e05c3b", "#f4a17a", "#c0392b", "#f39c12", "#e67e22", "#d35400"];

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

const COTIZ_ESTADOS_ORDEN = [
  "BORRADOR",
  "ENVIADA",
  "SEGUIMIENTO",
  "ORDEN_CONFIRMADA",
  "GANADA",
  "PERDIDA",
  "POSTERGADA",
];

/* ── tipos locales ──────────────────────────────────────── */

type VentasMesState =
  | { monto: number; cantidad: number }
  | "loading"
  | "forbidden"
  | "error";

/* ── componente principal ───────────────────────────────── */

const FirematDashboard: React.FC = () => {
  const { canView } = usePermisos();
  // Show commercial KPIs only when the user can access ventas/cotizaciones modules
  const esBodeguero = !canView("firemat_ventas");

  /* inventario — todos los roles */
  const [inventarioData, setInventarioData] = useState<InventarioFirematItem[]>([]);
  const [inventarioResumen, setInventarioResumen] = useState<InventarioFirematResumen | null>(null);
  const [inventarioLoading, setInventarioLoading] = useState(true);
  const [inventarioError, setInventarioError] = useState(false);

  /* movimientos — todos los roles */
  const [movimientos, setMovimientos] = useState<MovimientoFiremat[]>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  /* ventas — roles comerciales */
  const [ventasMes, setVentasMes] = useState<VentasMesState>("loading");
  const [ventasRaw, setVentasRaw] = useState<VentaFiremat[]>([]);

  /* cotizaciones — roles comerciales */
  const [cotizaciones, setCotizaciones] = useState<FirematCotizacion[]>([]);
  const [cotizacionesLoading, setCotizacionesLoading] = useState(false);

  /* funnel — roles comerciales */
  const [oportunidadesActivas, setOportunidadesActivas] = useState<number | null>(null);

  /* ── efectos de carga ───────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      try {
        setInventarioLoading(true);
        const res = await firematInventarioAPI.listar({ activo: true });
        if (cancelled) return;
        setInventarioData(res.data);
        setInventarioResumen(res.resumen);
      } catch {
        if (!cancelled) setInventarioError(true);
      } finally {
        if (!cancelled) setInventarioLoading(false);
      }
    };
    void cargar();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      try {
        setMovimientosLoading(true);
        const res = await firematInventarioAPI.movimientos();
        if (cancelled) return;
        setMovimientos(res.data ?? []);
      } catch {
        // ignorar silenciosamente
      } finally {
        if (!cancelled) setMovimientosLoading(false);
      }
    };
    void cargar();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      if (esBodeguero) {
        if (!cancelled) setVentasMes("forbidden");
        return;
      }
      try {
        const res = await firematVentasAPI.listar();
        if (cancelled) return;
        const hoy = new Date();
        const mes = hoy.getMonth();
        const año = hoy.getFullYear();
        const delMes = res.data.filter((v) => {
          const f = new Date(v.createdAt);
          return f.getMonth() === mes && f.getFullYear() === año;
        });
        setVentasMes({
          monto: delMes.reduce((acc, v) => acc + Number(v.total || 0), 0),
          cantidad: delMes.length,
        });
        setVentasRaw(res.data);
      } catch (err) {
        if (!cancelled) {
          setVentasMes(
            isAxiosError(err) && err.response?.status === 403 ? "forbidden" : "error"
          );
        }
      }
    };
    void cargar();
    return () => { cancelled = true; };
  }, [esBodeguero]);

  useEffect(() => {
    if (esBodeguero) return;
    let cancelled = false;
    const cargar = async () => {
      try {
        setCotizacionesLoading(true);
        const res = await firematCotizacionesAPI.listar();
        if (cancelled) return;
        setCotizaciones(res.data);
      } catch {
        // ignorar silenciosamente
      } finally {
        if (!cancelled) setCotizacionesLoading(false);
      }
    };
    void cargar();
    return () => { cancelled = true; };
  }, [esBodeguero]);

  useEffect(() => {
    if (esBodeguero) return;
    let cancelled = false;
    const cargar = async () => {
      try {
        const res = await firematFunnelAPI.getDashboard();
        if (cancelled) return;
        setOportunidadesActivas(res.kpis.oportunidadesActivas);
      } catch {
        // ignorar silenciosamente
      }
    };
    void cargar();
    return () => { cancelled = true; };
  }, [esBodeguero]);

  /* ── datos derivados — bodeguero ─────────────────────── */

  const productosCriticos = useMemo(
    () =>
      inventarioData
        .filter((i) => i.estadoStock !== "OK")
        .sort((a, b) => {
          if (a.estadoStock === "SIN_STOCK" && b.estadoStock !== "SIN_STOCK") return -1;
          if (a.estadoStock !== "SIN_STOCK" && b.estadoStock === "SIN_STOCK") return 1;
          return a.stockDisponible - b.stockDisponible;
        })
        .slice(0, 8),
    [inventarioData]
  );

  const categoriaData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of inventarioData) {
      const cat = item.categoria ?? "Sin categoría";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [inventarioData]);

  const ultimosMovimientos = useMemo(
    () =>
      [...movimientos]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    [movimientos]
  );

  /* ── datos derivados — comercial ─────────────────────── */

  const productoEstadoData = useMemo(() => {
    if (!inventarioResumen) return [];
    const ok = Math.max(
      0,
      inventarioResumen.productosActivos
        - inventarioResumen.productosBajoStock
        - inventarioResumen.productosSinStock
    );
    return [
      { name: "Con stock", value: ok, fill: "#52c41a" },
      { name: "Bajo stock", value: inventarioResumen.productosBajoStock, fill: "#fa8c16" },
      { name: "Sin stock", value: inventarioResumen.productosSinStock, fill: "#ff4d4f" },
      { name: "Inactivos", value: inventarioResumen.productosInactivos, fill: "#94a3b8" },
    ].filter((d) => d.value > 0);
  }, [inventarioResumen]);

  const ventasPorMes = useMemo(() => {
    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: dayjs().subtract(11 - i, "month").format("MMM YY"),
      total: 0,
    }));
    for (const v of ventasRaw) {
      const etiqueta = dayjs(v.createdAt).format("MMM YY");
      const idx = meses.findIndex((m) => m.mes === etiqueta);
      if (idx !== -1) meses[idx].total += Number(v.total || 0);
    }
    return meses;
  }, [ventasRaw]);

  const cotizacionesPorEstado = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of cotizaciones) counts[c.estado] = (counts[c.estado] ?? 0) + 1;
    return COTIZ_ESTADOS_ORDEN
      .filter((e) => (counts[e] ?? 0) > 0)
      .map((estado) => ({
        name: COTIZ_LABELS[estado] ?? estado,
        value: counts[estado],
        fill: COTIZ_COLORES[estado] ?? "#94a3b8",
      }));
  }, [cotizaciones]);

  const cotizacionesActivasCount = useMemo(
    () => cotizaciones.filter((c) => ["BORRADOR", "ENVIADA", "SEGUIMIENTO"].includes(c.estado)).length,
    [cotizaciones]
  );

  const criticoChartData = useMemo(
    () =>
      [...inventarioData]
        .filter((i) => i.activo)
        .sort((a, b) => a.stockDisponible - b.stockDisponible)
        .slice(0, 10)
        .map((i) => ({
          nombre: i.nombre.length > 24 ? i.nombre.slice(0, 22) + "…" : i.nombre,
          stock: i.stockDisponible,
          minimo: i.minStock,
        })),
    [inventarioData]
  );

  /* ── render parciales ───────────────────────────────────── */

  const renderVentasCantidad = () => {
    if (ventasMes === "loading") return <p className="mt-2 text-2xl font-bold text-beck-ink">...</p>;
    if (ventasMes === "forbidden")
      return (
        <Tooltip title="Sin permisos de ventas">
          <p className="mt-2 flex items-center gap-1 text-sm text-beck-muted">
            <LockOutlined /> Sin permisos
          </p>
        </Tooltip>
      );
    if (ventasMes === "error") return <p className="mt-2 text-sm text-red-400">Error al cargar</p>;
    return (
      <>
        <p className="mt-2 text-2xl font-bold text-beck-ink">{ventasMes.cantidad}</p>
        <p className="mt-0.5 text-xs text-beck-muted">{ventasMes.cantidad === 1 ? "venta" : "ventas"}</p>
      </>
    );
  };

  const renderVentasMonto = () => {
    if (ventasMes === "loading") return <p className="mt-2 text-2xl font-bold text-beck-ink">...</p>;
    if (ventasMes === "forbidden")
      return (
        <Tooltip title="Sin permisos de ventas">
          <p className="mt-2 flex items-center gap-1 text-sm text-beck-muted">
            <LockOutlined /> Sin permisos
          </p>
        </Tooltip>
      );
    if (ventasMes === "error") return <p className="mt-2 text-sm text-red-400">Error al cargar</p>;
    return <p className="mt-2 text-2xl font-bold text-beck-ink">{formatCLP(ventasMes.monto)}</p>;
  };

  /* ── columnas bodeguero ─────────────────────────────────── */

  const columnasCriticos: ColumnsType<InventarioFirematItem> = [
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
      render: (v: string | null) => <span className="text-xs text-beck-muted">{v ?? "—"}</span>,
    },
    {
      title: "Stock disp.",
      dataIndex: "stockDisponible",
      key: "stockDisponible",
      width: 95,
      align: "right" as const,
      render: (v: number) => <span className="text-xs font-semibold">{v}</span>,
    },
    {
      title: "Mínimo",
      dataIndex: "minStock",
      key: "minStock",
      width: 75,
      align: "right" as const,
      render: (v: number) => <span className="text-xs text-beck-muted">{v}</span>,
    },
    {
      title: "Estado",
      dataIndex: "estadoStock",
      key: "estadoStock",
      width: 110,
      render: (v: string) => (
        <Tag color={ESTADO_COLOR[v] ?? "default"} style={{ fontSize: 11 }}>
          {ESTADO_LABEL[v] ?? v}
        </Tag>
      ),
    },
  ];

  const columnasMovimientos: ColumnsType<MovimientoFiremat> = [
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
      width: 110,
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
      render: (v: number) => <span className="text-xs font-semibold">{v}</span>,
    },
    {
      title: "Stock ant.",
      dataIndex: "stockAnterior",
      key: "stockAnterior",
      width: 85,
      align: "right" as const,
      render: (v: number) => <span className="text-xs text-beck-muted">{v}</span>,
    },
    {
      title: "Stock nuevo",
      dataIndex: "stockNuevo",
      key: "stockNuevo",
      width: 95,
      align: "right" as const,
      render: (v: number) => <span className="text-xs font-medium">{v}</span>,
    },
    {
      title: "Fecha",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 145,
      render: (v: string) => (
        <span className="text-xs text-beck-muted">{dayjs(v).format("DD-MM-YYYY HH:mm")}</span>
      ),
    },
  ];

  /* ── columnas movimientos — vista comercial ─────────────── */

  const columnasMovimientosComercial: ColumnsType<MovimientoFiremat> = [
    {
      title: "Fecha",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
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
      render: (v: number) => <span className="text-xs font-semibold">{v}</span>,
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

  /* ── accesos rápidos bodeguero ───────────────────────────── */

  const AccesosRapidos = () => (
    <div className="flex flex-wrap gap-3">
      {[
        { to: "/firemat/productos", icon: <AppstoreOutlined />, label: "Productos" },
        { to: "/firemat/inventario", icon: <InboxOutlined />, label: "Inventario" },
        { to: "/firemat/movimientos", icon: <HistoryOutlined />, label: "Movimientos" },
      ].map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-all ${
              isActive
                ? "border-[#f4c4ba] bg-[#fde8e4] text-[#e05c3b]"
                : "border-slate-200 bg-white text-beck-ink hover:border-[#f4c4ba] hover:bg-[#fde8e4] hover:text-[#e05c3b]"
            }`
          }
        >
          {icon}
          {label}
        </NavLink>
      ))}
    </div>
  );

  /* ── estilos reutilizables para cards de gráfico ─────────── */

  const cardGraficoStyles = {
    header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 },
    body: { padding: "16px 8px 12px" },
  };

  /* ── render principal ───────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-beck-ink">
            {esBodeguero ? "Panel de bodega" : "Centro de mando Firemat"}
          </h1>
          <p className="mt-1 text-sm text-beck-muted">
            {esBodeguero
              ? "Stock, inventario y movimientos en tiempo real."
              : "Control de ventas, cotizaciones, stock y distribución."}
          </p>
        </div>
        {esBodeguero && <AccesosRapidos />}
      </div>

      {/* ═══════════════════ BODEGUERO ═══════════════════ */}
      {esBodeguero ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <AppstoreOutlined />
                <span className="text-xs text-beck-muted">Productos activos</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {inventarioLoading ? "..." : inventarioError ? "—" : kpiVal(inventarioResumen?.productosActivos)}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">
                de {inventarioLoading ? "..." : kpiVal(inventarioResumen?.totalProductos)} totales
              </p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <InboxOutlined />
                <span className="text-xs text-beck-muted">Stock disponible</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {inventarioLoading ? "..." : inventarioError ? "—" : kpiVal(inventarioResumen?.stockDisponibleTotal)}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">unidades</p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-amber-500">
                <WarningOutlined />
                <span className="text-xs text-beck-muted">Bajo mínimo</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {inventarioLoading ? "..." : inventarioError ? "—" : kpiVal(inventarioResumen?.productosBajoStock)}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">productos</p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-red-500">
                <FireOutlined />
                <span className="text-xs text-beck-muted">Sin stock</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {inventarioLoading ? "..." : inventarioError ? "—" : kpiVal(inventarioResumen?.productosSinStock)}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">productos</p>
            </Card>
          </div>

          {/* Gráfico categorías + Productos críticos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,1.2fr]">
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Productos por categoría</span>}
              className="border border-slate-200 bg-white"
              styles={cardGraficoStyles}
            >
              {inventarioLoading ? (
                <div className="flex h-48 items-center justify-center text-xs text-beck-muted">Cargando...</div>
              ) : categoriaData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-xs text-beck-muted">Sin datos de categorías</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoriaData} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                    <RTooltip formatter={(val) => [`${val ?? 0} productos`, "Cantidad"]} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {categoriaData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card
              title={
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-beck-ink">Productos críticos</span>
                  {productosCriticos.length > 0 && (
                    <Tag color="red" style={{ fontSize: 11 }}>
                      {productosCriticos.length} alerta{productosCriticos.length !== 1 ? "s" : ""}
                    </Tag>
                  )}
                </div>
              }
              className="border border-slate-200 bg-white"
              styles={{ header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 }, body: { padding: 0 } }}
            >
              <Table<InventarioFirematItem>
                rowKey="id"
                columns={columnasCriticos}
                dataSource={productosCriticos}
                loading={inventarioLoading}
                size="small"
                pagination={false}
                scroll={{ y: 220 }}
                locale={{ emptyText: inventarioLoading ? "Cargando..." : "No hay productos bajo mínimo" }}
              />
            </Card>
          </div>

          {/* Últimos movimientos */}
          <Card
            title={<span className="text-sm font-medium text-beck-ink">Últimos movimientos de inventario</span>}
            className="border border-slate-200 bg-white"
            styles={{ header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 }, body: { padding: 0 } }}
          >
            <Table<MovimientoFiremat>
              rowKey="id"
              columns={columnasMovimientos}
              dataSource={ultimosMovimientos}
              loading={movimientosLoading}
              size="small"
              pagination={false}
              scroll={{ x: 680 }}
              locale={{ emptyText: movimientosLoading ? "Cargando..." : "No hay movimientos registrados todavía" }}
            />
          </Card>
        </>
      ) : (
        /* ═══════════════════ ROLES COMERCIALES ═══════════════════ */
        <>
          {/* ── Fila 1: KPIs principales (4 columnas) ── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <AppstoreOutlined />
                <span className="text-xs text-beck-muted">Productos activos</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {inventarioLoading ? "..." : inventarioError ? "—" : kpiVal(inventarioResumen?.productosActivos)}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">
                de {inventarioLoading ? "..." : kpiVal(inventarioResumen?.totalProductos)} totales
              </p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-amber-500">
                <WarningOutlined />
                <span className="text-xs text-beck-muted">Bajo stock</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {inventarioLoading ? "..." : inventarioError ? "—" : kpiVal(inventarioResumen?.productosBajoStock)}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">productos</p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-red-500">
                <FireOutlined />
                <span className="text-xs text-beck-muted">Sin stock</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {inventarioLoading ? "..." : inventarioError ? "—" : kpiVal(inventarioResumen?.productosSinStock)}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">productos</p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <ShoppingCartOutlined />
                <span className="text-xs text-beck-muted">Ventas del mes</span>
              </div>
              {renderVentasCantidad()}
            </Card>
          </div>

          {/* ── Fila 2: KPIs comerciales (3 columnas) ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <InboxOutlined />
                <span className="text-xs text-beck-muted">Monto vendido (mes)</span>
              </div>
              {renderVentasMonto()}
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <FileTextOutlined />
                <span className="text-xs text-beck-muted">Cotizaciones activas</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {cotizacionesLoading ? "..." : cotizacionesActivasCount.toLocaleString("es-CL")}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">
                de {cotizacionesLoading ? "..." : cotizaciones.length} totales
              </p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <ApartmentOutlined />
                <span className="text-xs text-beck-muted">Oportunidades activas</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {oportunidadesActivas == null ? "..." : oportunidadesActivas.toLocaleString("es-CL")}
              </p>
              <p className="mt-0.5 text-[11px] text-beck-muted">en el funnel</p>
            </Card>
          </div>

          {/* ── Fila 3: Pie charts ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Gráfico 1: Productos por estado */}
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Productos por estado</span>}
              className="border border-slate-200 bg-white"
              styles={cardGraficoStyles}
            >
              {inventarioLoading ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">Cargando...</div>
              ) : productoEstadoData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">Sin datos</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={productoEstadoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={88}
                        dataKey="value"
                        nameKey="name"
                      >
                        {productoEstadoData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RTooltip
                        formatter={(val, name) => [String(val), String(name)]}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {productoEstadoData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                        <span className="text-[11px] text-beck-muted">
                          {d.name}: <strong className="text-beck-ink">{d.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* Gráfico 4: Cotizaciones por estado */}
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Cotizaciones por estado</span>}
              className="border border-slate-200 bg-white"
              styles={cardGraficoStyles}
            >
              {cotizacionesLoading ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">Cargando...</div>
              ) : cotizacionesPorEstado.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">Sin cotizaciones</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={cotizacionesPorEstado}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={88}
                        dataKey="value"
                        nameKey="name"
                      >
                        {cotizacionesPorEstado.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RTooltip
                        formatter={(val, name) => [String(val), String(name)]}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {cotizacionesPorEstado.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                        <span className="text-[11px] text-beck-muted">
                          {d.name}: <strong className="text-beck-ink">{d.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── Fila 4: Bar charts ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Gráfico 2: Ventas por mes */}
            <Card
              title={<span className="text-sm font-medium text-beck-ink">Ventas por mes — últimos 12 meses</span>}
              className="border border-slate-200 bg-white"
              styles={cardGraficoStyles}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ventasPorMes} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYVentas} width={52} />
                  <RTooltip
                    formatter={(val) => [formatCLP(Number(val)), "Total vendido"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill="#e05c3b" radius={[4, 4, 0, 0]} name="total" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Gráfico 3: Productos críticos horizontal */}
            <Card
              title={
                <span className="text-sm font-medium text-beck-ink">
                  Productos con menor stock
                </span>
              }
              className="border border-slate-200 bg-white"
              styles={cardGraficoStyles}
            >
              {inventarioLoading ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">Cargando...</div>
              ) : criticoChartData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs text-beck-muted">Sin datos de inventario</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={criticoChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={130} />
                      <RTooltip
                        formatter={(val, name) => [
                          String(val),
                          name === "stock" ? "Stock actual" : "Mínimo requerido",
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
                      <span className="text-[11px] text-beck-muted">Stock actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ background: "#f4c4ba" }} />
                      <span className="text-[11px] text-beck-muted">Mínimo requerido</span>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── Fila 5: Últimos movimientos ── */}
          <Card
            title={
              <span className="text-sm font-medium text-beck-ink">
                Últimos movimientos de inventario
              </span>
            }
            className="border border-slate-200 bg-white"
            styles={{ header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 }, body: { padding: 0 } }}
          >
            <Table<MovimientoFiremat>
              rowKey="id"
              columns={columnasMovimientosComercial}
              dataSource={ultimosMovimientos}
              loading={movimientosLoading}
              size="small"
              pagination={false}
              scroll={{ x: 620 }}
              locale={{
                emptyText: movimientosLoading ? "Cargando..." : "No hay movimientos registrados todavía",
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default FirematDashboard;
