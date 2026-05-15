import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Card, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AppstoreOutlined,
  BarChartOutlined,
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
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import {
  firematInventarioAPI,
  firematVentasAPI,
  type InventarioFirematItem,
  type InventarioFirematResumen,
  type MovimientoFiremat,
} from "../../services/api";
import { useAuth } from "../../context/useAuth";

/* ── helpers ────────────────────────────────────────────── */

const formatCLP = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);

const kpiVal = (val: number | null | undefined, fallback = "...") =>
  val == null ? fallback : val.toLocaleString("es-CL");

const TIPO_COLOR: Record<string, string> = {
  ENTRADA: "green",
  SALIDA: "red",
  AJUSTE: "blue",
  RESERVA: "orange",
  LIBERACION: "cyan",
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

/* ── tipos locales ──────────────────────────────────────── */

type VentasMesState =
  | { monto: number; cantidad: number }
  | "loading"
  | "forbidden"
  | "error";

/* ── componente principal ───────────────────────────────── */

const FirematDashboard: React.FC = () => {
  const { user } = useAuth();
  const esBodeguero = user?.rol === "Bodeguero";

  /* inventario — se carga para todos los roles */
  const [inventarioData, setInventarioData] = useState<InventarioFirematItem[]>([]);
  const [inventarioResumen, setInventarioResumen] = useState<InventarioFirematResumen | null>(null);
  const [inventarioLoading, setInventarioLoading] = useState(true);
  const [inventarioError, setInventarioError] = useState(false);

  /* movimientos — solo bodeguero */
  const [movimientos, setMovimientos] = useState<MovimientoFiremat[]>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  /* ventas — solo roles comerciales */
  const [ventasMes, setVentasMes] = useState<VentasMesState>("loading");

  useEffect(() => {
    setInventarioLoading(true);
    firematInventarioAPI
      .listar({ activo: true })
      .then((res) => {
        setInventarioData(res.data);
        setInventarioResumen(res.resumen);
      })
      .catch(() => setInventarioError(true))
      .finally(() => setInventarioLoading(false));
  }, []);

  useEffect(() => {
    if (!esBodeguero) return;
    setMovimientosLoading(true);
    firematInventarioAPI
      .movimientos()
      .then((res) => setMovimientos(res.data ?? []))
      .catch(() => {})
      .finally(() => setMovimientosLoading(false));
  }, [esBodeguero]);

  useEffect(() => {
    if (esBodeguero) {
      setVentasMes("forbidden");
      return;
    }
    firematVentasAPI
      .listar()
      .then((res) => {
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
      })
      .catch((err) => {
        setVentasMes(
          isAxiosError(err) && err.response?.status === 403 ? "forbidden" : "error"
        );
      });
  }, [esBodeguero]);

  /* datos derivados para bodeguero */
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

  /* ── render ventas KPI (rol comercial) ──────────────────── */
  const renderVentasKPI = () => {
    if (ventasMes === "loading")
      return <p className="mt-2 text-2xl font-bold text-beck-ink">...</p>;
    if (ventasMes === "forbidden")
      return (
        <Tooltip title="Tu rol no tiene acceso a datos de ventas">
          <p className="mt-2 flex items-center gap-1 text-sm text-beck-muted">
            <LockOutlined /> Sin permisos
          </p>
        </Tooltip>
      );
    if (ventasMes === "error")
      return <p className="mt-2 text-sm text-red-400">Error al cargar</p>;
    return (
      <>
        <p className="mt-2 text-2xl font-bold text-beck-ink">
          {formatCLP(ventasMes.monto)}
        </p>
        <p className="mt-0.5 text-xs text-beck-muted">
          {ventasMes.cantidad} {ventasMes.cantidad === 1 ? "venta" : "ventas"}
        </p>
      </>
    );
  };

  /* ── columnas tablas bodeguero ───────────────────────────── */
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
      render: (v: string | null) => (
        <span className="text-xs text-beck-muted">{v ?? "—"}</span>
      ),
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
        <Tag color={TIPO_COLOR[v] ?? "default"} style={{ fontSize: 11 }}>
          {v}
        </Tag>
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
        <span className="text-xs text-beck-muted">
          {dayjs(v).format("DD-MM-YYYY HH:mm")}
        </span>
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

      {/* ═══════════════ BODEGUERO ═══════════════ */}
      {esBodeguero ? (
        <>
          {/* Fila 1 — KPIs */}
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

          {/* Fila 2 — Gráfico + Productos críticos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,1.2fr]">
            {/* Gráfico productos por categoría */}
            <Card
              title={
                <span className="text-sm font-medium text-beck-ink">
                  Productos por categoría
                </span>
              }
              className="border border-slate-200 bg-white"
              styles={{
                header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 },
                body: { padding: "16px 8px 8px" },
              }}
            >
              {inventarioLoading ? (
                <div className="flex h-48 items-center justify-center text-xs text-beck-muted">
                  Cargando...
                </div>
              ) : categoriaData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-xs text-beck-muted">
                  Sin datos de categorías
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={categoriaData}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={110}
                    />
                    <RTooltip
                      formatter={(val) => [`${val ?? 0} productos`, "Cantidad"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {categoriaData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Tabla productos críticos */}
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
              styles={{
                header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 },
                body: { padding: 0 },
              }}
            >
              <Table<InventarioFirematItem>
                rowKey="id"
                columns={columnasCriticos}
                dataSource={productosCriticos}
                loading={inventarioLoading}
                size="small"
                pagination={false}
                scroll={{ y: 220 }}
                locale={{
                  emptyText: inventarioLoading
                    ? "Cargando..."
                    : "No hay productos bajo mínimo",
                }}
              />
            </Card>
          </div>

          {/* Fila 3 — Últimos movimientos */}
          <Card
            title={
              <span className="text-sm font-medium text-beck-ink">
                Últimos movimientos de inventario
              </span>
            }
            className="border border-slate-200 bg-white"
            styles={{
              header: { borderBottom: "1px solid #e2e8f0", fontSize: 13 },
              body: { padding: 0 },
            }}
          >
            <Table<MovimientoFiremat>
              rowKey="id"
              columns={columnasMovimientos}
              dataSource={ultimosMovimientos}
              loading={movimientosLoading}
              size="small"
              pagination={false}
              scroll={{ x: 680 }}
              locale={{
                emptyText: movimientosLoading
                  ? "Cargando..."
                  : "No hay movimientos registrados todavía",
              }}
            />
          </Card>
        </>
      ) : (
        /* ═══════════════ ROLES COMERCIALES ═══════════════ */
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <AppstoreOutlined />
                <span className="text-xs text-beck-muted">Productos en stock</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">
                {inventarioError ? "—" : kpiVal(inventarioResumen?.productosActivos)}
              </p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <ShoppingCartOutlined />
                <span className="text-xs text-beck-muted">Ventas del mes</span>
              </div>
              {renderVentasKPI()}
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <FireOutlined />
                <span className="text-xs text-beck-muted">Cotizaciones activas</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">—</p>
            </Card>

            <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
              <div className="flex items-center gap-2 text-firemat-primary">
                <BarChartOutlined />
                <span className="text-xs text-beck-muted">Reportes pendientes</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-beck-ink">—</p>
            </Card>
          </div>

          <Card className="firemat-panel">
            <div className="flex items-center gap-3 text-firemat-primary">
              <FireOutlined style={{ fontSize: 20 }} />
              <div>
                <p className="font-semibold text-beck-ink">Módulo en desarrollo</p>
                <p className="text-xs text-beck-muted">
                  El dashboard de Firemat estará disponible próximamente con datos
                  en tiempo real de ventas, stock e inventario.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default FirematDashboard;
