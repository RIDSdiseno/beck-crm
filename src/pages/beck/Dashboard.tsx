import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Card, Empty, Segmented, Select, Spin, Table, Tag, type TableColumnsType } from "antd";
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FireOutlined,
  LineChartOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  dashboardBeckAPI,
  type DashboardBeckObra,
  type DashboardBeckProduccionPiso,
  type DashboardBeckProduccionSellador,
  type DashboardBeckRango,
  type DashboardBeckRegistro,
  type DashboardBeckResponse,
} from "../../services/api";
import type { ThemeMode } from "../../hooks/useSystemTheme";
import { getTipoRegistroLabel } from "../../constants/roles";
import RendimientoPorTrabajadorPanel from "./RendimientoPorTrabajadorPanel";

type DashboardProps = {
  themeMode: ThemeMode;
};

type RangoOption = {
  label: string;
  value: DashboardBeckRango;
};

const rangoOptions: RangoOption[] = [
  { label: "Hoy", value: "hoy" },
  { label: "Semana", value: "semana" },
  { label: "Mes", value: "mes" },
  { label: "Completa", value: "completa" },
];

const numberFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 0,
});

const formatNumber = (value?: number | null, decimals = false) =>
  (decimals ? numberFormatter : integerFormatter).format(Number(value ?? 0));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const normalizeEstado = (estado?: string | null) => {
  if (!estado) return "-";
  return estado
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w|\s\w/g, (letter) => letter.toUpperCase());
};

const estadoColor = (estado?: string | null) => {
  const value = (estado ?? "").toLowerCase();
  if (value.includes("valid")) return "green";
  if (value.includes("rechaz")) return "red";
  if (value.includes("revision") || value.includes("revisión")) return "gold";
  if (value.includes("pend")) return "orange";
  return "default";
};

const getObraName = (registro: DashboardBeckRegistro) => {
  if (typeof registro.obra === "string") return registro.obra;
  return (
    registro.obraNombre ??
    registro.obra_nombre ??
    registro.obra?.nombre ??
    "Sin obra"
  );
};

const getSelladorName = (registro: DashboardBeckRegistro) =>
  registro.sellador ?? registro.nombreSellador ?? "Sin sellador";

const getCantidadMetros = (registro: DashboardBeckRegistro) => {
  const cantidad =
    registro.cantidad ?? registro.cantidadSellos ?? registro.cantidad_sellos;
  const metros = registro.metrosLineales ?? registro.metros;

  if (cantidad != null && metros != null) {
    return `${formatNumber(cantidad)} / ${formatNumber(metros, true)} m`;
  }

  if (cantidad != null) return formatNumber(cantidad);
  if (metros != null) return `${formatNumber(metros, true)} m`;
  return "-";
};

const hasDashboardRows = (data: DashboardBeckResponse | null) =>
  Boolean(
    data &&
      ((data.produccionPorPiso ?? data.porPiso ?? data.pisos ?? []).length > 0 ||
        (
          data.produccionPorSellador ??
          data.produccionPorPersona ??
          data.porSellador ??
          data.selladores ??
          []
        ).length > 0 ||
        (data.ultimosRegistros ?? data.registros ?? []).length > 0)
  );

const Dashboard: React.FC<DashboardProps> = ({ themeMode }) => {
  void themeMode;

  const [obraId, setObraId] = useState<string | undefined>();
  const [rango, setRango] = useState<DashboardBeckRango>("hoy");
  const [obras, setObras] = useState<DashboardBeckObra[]>([]);
  const [data, setData] = useState<DashboardBeckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dashboardBeckAPI.obtener({ obraId, rango });
      setData(response);
      setObras((prev) => {
        const byId = new Map(prev.map((obra) => [obra.id, obra]));
        (response.obras ?? []).forEach((obra) => byId.set(obra.id, obra));
        return Array.from(byId.values());
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cargar el dashboard Beck";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [obraId, rango]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const kpis = data?.kpis ?? data?.resumen ?? {};
  const produccionPorPiso = data?.produccionPorPiso ?? data?.porPiso ?? data?.pisos ?? [];
  const produccionPorSellador =
    data?.produccionPorSellador ??
    data?.produccionPorPersona ??
    data?.porSellador ??
    data?.selladores ??
    [];
  const ultimosRegistros = data?.ultimosRegistros ?? data?.registros ?? [];

  const kpiCards = useMemo(
    () => [
      {
        key: "sellos",
        label: "Sellos ejecutados",
        value: kpis.sellosEjecutados ?? kpis.totalSellos ?? kpis.sellos,
        icon: <FireOutlined />,
      },
      {
        key: "metros",
        label: "Metros lineales",
        value: kpis.metrosLineales ?? kpis.metros,
        suffix: "m",
        decimals: true,
        icon: <LineChartOutlined />,
      },
      {
        key: "pendientes",
        label: "Pendientes ingeniería",
        value: kpis.pendientesIngenieria ?? kpis.pendientes,
        icon: <ClockCircleOutlined />,
      },
      {
        key: "validados",
        label: "Validados",
        value: kpis.validados,
        icon: <CheckCircleOutlined />,
      },
      {
        key: "revision",
        label: "En revisión",
        value: kpis.enRevision,
        icon: <ClockCircleOutlined />,
      },
      {
        key: "rechazados",
        label: "Rechazados",
        value: kpis.rechazados,
        icon: <CloseCircleOutlined />,
      },
      {
        key: "pisos",
        label: "Pisos con registros",
        value: kpis.pisosConRegistros,
        icon: <ApartmentOutlined />,
      },
      {
        key: "selladores",
        label: "Selladores distintos",
        value: kpis.selladoresDistintos,
        icon: <TeamOutlined />,
      },
    ],
    [kpis]
  );

  const pisoColumns: TableColumnsType<DashboardBeckProduccionPiso> = [
    {
      title: "Piso",
      dataIndex: "piso",
      key: "piso",
      render: (value) => value ?? "Sin piso",
    },
    {
      title: "Sellos",
      key: "sellos",
      align: "right",
      render: (_, record) =>
        formatNumber(record.sellos ?? record.sellosEjecutados),
    },
    {
      title: "Metros lineales",
      key: "metrosLineales",
      align: "right",
      render: (_, record) =>
        `${formatNumber(record.metrosLineales ?? record.metros, true)} m`,
    },
    {
      title: "Registros",
      dataIndex: "registros",
      key: "registros",
      align: "right",
      render: (value) => formatNumber(value),
    },
  ];

  const selladorColumns: TableColumnsType<DashboardBeckProduccionSellador> = [
    {
      title: "Sellador",
      key: "sellador",
      render: (_, record) =>
        record.sellador ?? record.nombreSellador ?? record.nombre ?? "Sin sellador",
    },
    {
      title: "Sellos",
      key: "sellos",
      align: "right",
      render: (_, record) =>
        formatNumber(record.sellos ?? record.sellosEjecutados),
    },
    {
      title: "Metros lineales",
      key: "metrosLineales",
      align: "right",
      render: (_, record) =>
        `${formatNumber(record.metrosLineales ?? record.metros, true)} m`,
    },
    {
      title: "Registros",
      dataIndex: "registros",
      key: "registros",
      align: "right",
      render: (value) => formatNumber(value),
    },
  ];

  const registrosColumns: TableColumnsType<DashboardBeckRegistro> = [
    {
      title: "Fecha",
      key: "fecha",
      render: (_, record) =>
        formatDate(record.fecha ?? record.createdAt ?? record.created_at),
      width: 150,
    },
    {
      title: "Obra",
      key: "obra",
      render: (_, record) => getObraName(record),
      width: 180,
    },
    {
      title: "Piso",
      dataIndex: "piso",
      key: "piso",
      render: (value) => value ?? "Sin piso",
      width: 100,
    },
    {
      title: "Sellador",
      key: "sellador",
      render: (_, record) => getSelladorName(record),
      width: 180,
    },
    {
      title: "Cantidad / metros",
      key: "cantidadMetros",
      align: "right",
      render: (_, record) => getCantidadMetros(record),
      width: 150,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (value) => <Tag color={estadoColor(value)}>{normalizeEstado(value)}</Tag>,
      width: 140,
    },
    {
      title: "Tipo registro",
      key: "tipoRegistro",
      render: (_, record) =>
        record.tipoRegistro ?? record.tipo_registro
          ? getTipoRegistroLabel(record.tipoRegistro ?? record.tipo_registro)
          : "-",
      width: 160,
    },
  ];

  const tableLocale = {
    emptyText: loading ? "Cargando..." : "No hay registros para esta vista",
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-wide text-beck-ink sm:text-xl">
            Dashboard Beck
          </h1>
          <p className="text-[11px] text-beck-ink-soft sm:text-xs">
            Producción, validación y registros de terreno por obra y rango.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:max-w-3xl">
          <div className="w-full space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#8a7418]">
              Obra
            </span>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Seleccionar obra"
              className="w-full"
              style={{ width: "100%" }}
              value={obraId ?? "todas"}
              loading={loading && !data}
              options={[
                { label: "Todas las obras", value: "todas" },
                ...obras.map((obra) => ({
                  label: obra.codigo ? `${obra.codigo} - ${obra.nombre}` : obra.nombre,
                  value: obra.id,
                })),
              ]}
              onChange={(value) =>
                setObraId(value === "todas" ? undefined : String(value))
              }
            />
          </div>

          <div className="w-full space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#8a7418]">
              Rango
            </span>
            <Segmented
              block
              className="beck-segmented w-full"
              style={{ width: "100%" }}
              value={rango}
              options={rangoOptions}
              onChange={(value) => setRango(value as DashboardBeckRango)}
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Error al cargar dashboard"
          description={error}
        />
      )}

      <Spin spinning={loading}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((kpi, index) => (
              <motion.div
                key={kpi.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                <Card className="beck-kpi-card" styles={{ body: { padding: 14 } }}>
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1c1d20] via-[#b89413] to-[#f2c230]" />
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] uppercase tracking-wide text-[#8a7418]">
                        {kpi.label}
                      </p>
                      <p className="mt-1.5 text-2xl font-semibold text-beck-ink sm:text-3xl">
                        {formatNumber(kpi.value, kpi.decimals)}
                        {kpi.suffix ? (
                          <span className="ml-1 text-sm text-beck-ink-soft">
                            {kpi.suffix}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#fff1b8] text-sm text-beck-ink shadow-inner">
                      {kpi.icon}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {!loading && !error && data && !hasDashboardRows(data) && (
            <Card className="beck-panel-soft">
              <Empty description="No hay registros para los filtros seleccionados" />
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card
              className="beck-panel"
              title={
                <div className="flex items-center gap-2 text-sm">
                  <ApartmentOutlined className="text-[#a8860f]" />
                  <span>Producción por piso</span>
                </div>
              }
              styles={{
                header: {
                  backgroundColor: "#fffbf0",
                  color: "#17181A",
                  borderBottom: "1px solid #d8dcd6",
                  fontSize: 13,
                },
                body: { padding: 14 },
              }}
            >
              <Table
                rowKey={(record, index) => `${record.piso ?? "piso"}-${index}`}
                size="small"
                columns={pisoColumns}
                dataSource={produccionPorPiso}
                pagination={false}
                locale={tableLocale}
                scroll={{ x: "max-content" }}
              />
            </Card>

            <Card
              className="beck-panel"
              title={
                <div className="flex items-center gap-2 text-sm">
                  <UserOutlined className="text-[#a8860f]" />
                  <span>Producción por persona / sellador</span>
                </div>
              }
              styles={{
                header: {
                  backgroundColor: "#fffbf0",
                  color: "#17181A",
                  borderBottom: "1px solid #d8dcd6",
                  fontSize: 13,
                },
                body: { padding: 14 },
              }}
            >
              <Table
                rowKey={(record, index) =>
                  `${record.sellador ?? record.nombreSellador ?? record.nombre ?? "sellador"}-${index}`
                }
                size="small"
                columns={selladorColumns}
                dataSource={produccionPorSellador}
                pagination={false}
                locale={tableLocale}
                scroll={{ x: "max-content" }}
              />
            </Card>
          </div>

          <RendimientoPorTrabajadorPanel />

          <Card
            className="beck-panel-soft"
            title={
              <div className="flex items-center gap-2 text-sm">
                <ClockCircleOutlined className="text-[#a8860f]" />
                <span>Últimos registros</span>
              </div>
            }
            styles={{
              header: {
                backgroundColor: "#fffbf0",
                color: "#17181A",
                borderBottom: "1px solid #d8dcd6",
                fontSize: 13,
              },
              body: { padding: 14 },
            }}
          >
            <Table
              rowKey={(record, index) => String(record.id ?? index)}
              size="small"
              columns={registrosColumns}
              dataSource={ultimosRegistros}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              locale={tableLocale}
              scroll={{ x: "max-content" }}
            />
          </Card>
        </div>
      </Spin>
    </div>
  );
};

export default Dashboard;
