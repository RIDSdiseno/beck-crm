import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Card, DatePicker, Empty, Segmented, Select, Spin, Table, type TableColumnsType } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  dashboardBeckAPI,
  obrasAPI,
  type Obra,
  type DashboardBeckValidacionIngenieria,
  type RendimientoDetalleCodigoBeck,
  type RendimientoTrabajadorDetalle,
  type RendimientoTrabajadoresParams,
} from "../../services/api";

type RendQuickRango = "hoy" | "semana" | "mes" | "completa" | "personalizado";

const rendRangoOptions: { label: string; value: RendQuickRango }[] = [
  { label: "Hoy", value: "hoy" },
  { label: "Semana", value: "semana" },
  { label: "Mes", value: "mes" },
  { label: "Completa", value: "completa" },
  { label: "Personalizado", value: "personalizado" },
];

const rendValidacionOptions: { label: string; value: "todos" | "validados" | "no_validados" }[] = [
  { label: "Todos", value: "todos" },
  { label: "Validados", value: "validados" },
  { label: "No validados", value: "no_validados" },
];

const rendSubEstadoOptions: { label: string; value: DashboardBeckValidacionIngenieria }[] = [
  { label: "Todos (no validados)", value: "no_validados" },
  { label: "Pendiente", value: "pendiente" },
  { label: "En revisión", value: "en_revision" },
  { label: "Rechazado", value: "rechazado" },
];

const RENDIMIENTO_BAR_COLOR = "#b89413";
const RENDIMIENTO_PIE_COLORS = [
  "#b89413",
  "#38bdf8",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#f43f5e",
  "#0ea5e9",
  "#84cc16",
  "#eab308",
];
const RENDIMIENTO_TOP_CODIGOS = 9;

const numberFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 0,
});

const formatNumber = (value?: number | null, decimals = false) =>
  (decimals ? numberFormatter : integerFormatter).format(Number(value ?? 0));

type RendimientoBarTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: RendimientoTrabajadorDetalle }>;
};

const RendimientoBarTooltip: React.FC<RendimientoBarTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-md border border-[#d8dcd6] bg-white/95 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-beck-ink">{item.nombreSellador}</p>
      <p>Ejecutado: {formatNumber(item.totalEjecutado, true)}</p>
      <p>Esperado: {formatNumber(item.totalEsperado, true)}</p>
      <p>
        Rendimiento global: {item.rendimientoGlobalPct === null ? "-" : `${numberFormatter.format(item.rendimientoGlobalPct)}%`}
      </p>
      <p>Registros: {formatNumber(item.totalRegistros)}</p>
      {item.codigos.length > 0 && (
        <div className="mt-1.5 border-t border-[#e5e3da] pt-1.5">
          <p className="mb-0.5 text-[10px] uppercase tracking-wide text-beck-ink-soft">
            Cumplimiento por Código BECK
          </p>
          {item.codigos.map((c) => (
            <p key={`${c.obraId}-${c.codigoBeck}`} className="flex justify-between gap-3">
              <span>
                {c.codigoBeck}
                {c.obraNombre ? ` (${c.obraNombre})` : ""}
              </span>
              <span className="font-medium">
                {c.cumplimientoPct === null ? "-" : `${numberFormatter.format(c.cumplimientoPct)}%`}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

type CodigoBeckChartItem = { codigoBeck: string; itemizadoBeck: string; cantidadEjecutada: number };

type CodigoBeckTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: CodigoBeckChartItem }>;
  total: number;
};

const CodigoBeckTooltip: React.FC<CodigoBeckTooltipProps> = ({ active, payload, total }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  const participacion = total > 0 ? (item.cantidadEjecutada / total) * 100 : 0;

  return (
    <div className="rounded-md border border-[#d8dcd6] bg-white/95 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-beck-ink">{item.codigoBeck}</p>
      {item.itemizadoBeck && item.itemizadoBeck !== item.codigoBeck && <p>{item.itemizadoBeck}</p>}
      <p>Cantidad ejecutada: {formatNumber(item.cantidadEjecutada, true)}</p>
      <p>Participación: {numberFormatter.format(participacion)}%</p>
    </div>
  );
};

const { RangePicker } = DatePicker;

/**
 * Bloque "Rendimiento por trabajador": filtros propios (obra, trabajador,
 * rango rápido, calendario, validación de Ingeniería), Gráfico 1 (rendimiento
 * por trabajador), Gráfico 2 (producción por Código BECK) y tabla de detalle.
 * Autocontenido — obtiene su propia lista de obras y su propio detalle vía
 * GET /dashboard/beck/rendimiento-trabajadores, sin depender de datos que ya
 * haya cargado la página que lo use. Se usa tanto en Dashboard.tsx como en
 * Reportes.tsx.
 */
const RendimientoPorTrabajadorPanel: React.FC = () => {
  const [obras, setObras] = useState<Obra[]>([]);

  const [rendObraId, setRendObraId] = useState<string | undefined>();
  const [rendTrabajador, setRendTrabajador] = useState<string | undefined>();
  const [rendQuickRango, setRendQuickRango] = useState<RendQuickRango>("hoy");
  const [rendFechaDesde, setRendFechaDesde] = useState<Dayjs | null>(dayjs().startOf("day"));
  const [rendFechaHasta, setRendFechaHasta] = useState<Dayjs | null>(dayjs().endOf("day"));
  const [rendValidacion, setRendValidacion] = useState<DashboardBeckValidacionIngenieria>("todos");
  const [rendData, setRendData] = useState<{
    trabajadoresDisponibles: string[];
    trabajadores: RendimientoTrabajadorDetalle[];
    detalleCodigos: RendimientoDetalleCodigoBeck[];
  } | null>(null);
  const [rendLoading, setRendLoading] = useState(false);
  const [rendError, setRendError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const cargarObras = async () => {
      try {
        const data = await obrasAPI.listar({ activa: true });
        if (!ignore) setObras(data);
      } catch {
        if (!ignore) setObras([]);
      }
    };

    void cargarObras();
    return () => {
      ignore = true;
    };
  }, []);

  const applyRendQuickRango = useCallback((value: RendQuickRango) => {
    setRendQuickRango(value);

    if (value === "personalizado") return;

    if (value === "completa") {
      setRendFechaDesde(null);
      setRendFechaHasta(null);
      return;
    }

    const now = dayjs();

    if (value === "hoy") {
      setRendFechaDesde(now.startOf("day"));
      setRendFechaHasta(now.endOf("day"));
    } else if (value === "semana") {
      setRendFechaDesde(now.subtract(6, "day").startOf("day"));
      setRendFechaHasta(now.endOf("day"));
    } else if (value === "mes") {
      setRendFechaDesde(now.startOf("month"));
      setRendFechaHasta(now.endOf("month"));
    }
  }, []);

  const handleRendRangePickerChange = useCallback((dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      setRendFechaDesde(null);
      setRendFechaHasta(null);
      setRendQuickRango("completa");
      return;
    }

    setRendFechaDesde(dates[0].startOf("day"));
    setRendFechaHasta(dates[1].endOf("day"));
    setRendQuickRango("personalizado");
  }, []);

  const fetchRendimiento = useCallback(async () => {
    setRendLoading(true);
    setRendError(null);

    try {
      const params: RendimientoTrabajadoresParams = {
        obraId: rendObraId,
        trabajador: rendTrabajador,
        validacionIngenieria: rendValidacion,
      };

      if (rendFechaDesde && rendFechaHasta) {
        params.fechaInicio = rendFechaDesde.format("YYYY-MM-DD");
        params.fechaFin = rendFechaHasta.format("YYYY-MM-DD");
      } else {
        params.rango = "completa";
      }

      const response = await dashboardBeckAPI.obtenerRendimientoTrabajadores(params);
      setRendData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el rendimiento por trabajador";
      setRendError(message);
      setRendData(null);
    } finally {
      setRendLoading(false);
    }
  }, [rendObraId, rendTrabajador, rendFechaDesde, rendFechaHasta, rendValidacion]);

  useEffect(() => {
    void fetchRendimiento();
  }, [fetchRendimiento]);

  const rendTopValidacion: "todos" | "validados" | "no_validados" =
    rendValidacion === "todos" ? "todos" : rendValidacion === "validados" ? "validados" : "no_validados";

  const periodoAplicadoLabel =
    rendFechaDesde && rendFechaHasta
      ? `Período aplicado: ${rendFechaDesde.format("DD-MM-YYYY")} al ${rendFechaHasta.format("DD-MM-YYYY")}`
      : "Período aplicado: sin límite de fecha (Completa)";

  const rendTrabajadores = rendData?.trabajadores ?? [];
  const rendDetalleCodigos = rendData?.detalleCodigos ?? [];

  const rendCodigosOrdenados = useMemo(() => {
    // El gráfico de distribución agrega por Código BECK sumando entre obras
    // (a diferencia de la tabla de detalle, que separa por obra para no mezclar
    // configuraciones de rendimiento esperado distintas).
    const agrupado = new Map<string, CodigoBeckChartItem>();
    for (const item of rendDetalleCodigos) {
      const acc = agrupado.get(item.codigoBeck) ?? {
        codigoBeck: item.codigoBeck,
        itemizadoBeck: item.itemizadoBeck,
        cantidadEjecutada: 0,
      };
      acc.cantidadEjecutada += item.cantidadEjecutada;
      agrupado.set(item.codigoBeck, acc);
    }
    return Array.from(agrupado.values()).sort((a, b) => b.cantidadEjecutada - a.cantidadEjecutada);
  }, [rendDetalleCodigos]);

  const rendTotalEjecutadoCodigos = useMemo(
    () => rendCodigosOrdenados.reduce((sum, item) => sum + item.cantidadEjecutada, 0),
    [rendCodigosOrdenados]
  );

  const rendUsaDonut = rendCodigosOrdenados.length > 0 && rendCodigosOrdenados.length <= 8;

  const { codigosParaGrafico: rendCodigosParaGrafico, ocultosCount: rendCodigosOcultos } = useMemo(() => {
    if (rendUsaDonut || rendCodigosOrdenados.length <= RENDIMIENTO_TOP_CODIGOS) {
      return { codigosParaGrafico: rendCodigosOrdenados as CodigoBeckChartItem[], ocultosCount: 0 };
    }

    const top = rendCodigosOrdenados.slice(0, RENDIMIENTO_TOP_CODIGOS);
    const resto = rendCodigosOrdenados.slice(RENDIMIENTO_TOP_CODIGOS);
    const otrosTotal = resto.reduce((sum, item) => sum + item.cantidadEjecutada, 0);

    return {
      codigosParaGrafico: [
        ...top,
        { codigoBeck: "Otros", itemizadoBeck: `${resto.length} códigos agrupados`, cantidadEjecutada: otrosTotal },
      ] as CodigoBeckChartItem[],
      ocultosCount: resto.length,
    };
  }, [rendCodigosOrdenados, rendUsaDonut]);

  const handleRendBarClick = useCallback((entry: unknown) => {
    const nombre = (entry as { nombreSellador?: string } | undefined)?.nombreSellador;
    if (!nombre) return;
    setRendTrabajador((prev) => (prev === nombre ? undefined : nombre));
  }, []);

  const detalleCodigoColumns: TableColumnsType<RendimientoDetalleCodigoBeck> = [
    {
      title: "Código BECK",
      dataIndex: "codigoBeck",
      key: "codigoBeck",
    },
    ...(!rendObraId
      ? [
          {
            title: "Obra",
            dataIndex: "obraNombre",
            key: "obraNombre",
          } as TableColumnsType<RendimientoDetalleCodigoBeck>[number],
        ]
      : []),
    {
      title: "Itemizado BECK",
      dataIndex: "itemizadoBeck",
      key: "itemizadoBeck",
    },
    {
      title: "Cantidad ejecutada",
      dataIndex: "cantidadEjecutada",
      key: "cantidadEjecutada",
      align: "right",
      render: (value) => formatNumber(value, true),
    },
    {
      title: "Cantidad esperada",
      dataIndex: "cantidadEsperada",
      key: "cantidadEsperada",
      align: "right",
      render: (value) => formatNumber(value, true),
    },
    {
      title: "Cumplimiento %",
      dataIndex: "cumplimientoPct",
      key: "cumplimientoPct",
      align: "right",
      render: (value: number | null) => (value === null ? "-" : `${numberFormatter.format(value)}%`),
    },
    {
      title: "Total registros",
      dataIndex: "totalRegistros",
      key: "totalRegistros",
      align: "right",
      render: (value) => formatNumber(value),
    },
  ];

  return (
    <Card
      className="beck-panel-soft"
      title={
        <div className="flex items-center gap-2 text-sm">
          <TeamOutlined className="text-[#a8860f]" />
          <span>Rendimiento por trabajador</span>
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
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#8a7418]">Obra</span>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Todas las obras"
              className="w-full"
              style={{ width: "100%" }}
              value={rendObraId ?? "todas"}
              options={[
                { label: "Todas las obras", value: "todas" },
                ...obras.map((obra) => ({
                  label: obra.codigo ? `${obra.codigo} - ${obra.nombre}` : obra.nombre,
                  value: obra.id,
                })),
              ]}
              onChange={(value) => setRendObraId(value === "todas" ? undefined : String(value))}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#8a7418]">Trabajador</span>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Todos los trabajadores"
              className="w-full"
              style={{ width: "100%" }}
              value={rendTrabajador ?? "todos"}
              loading={rendLoading && !rendData}
              options={[
                { label: "Todos los trabajadores", value: "todos" },
                ...(rendData?.trabajadoresDisponibles ?? []).map((nombre) => ({
                  label: nombre,
                  value: nombre,
                })),
              ]}
              onChange={(value) => setRendTrabajador(value === "todos" ? undefined : String(value))}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#8a7418]">Rango rápido</span>
            <Segmented
              block
              className="beck-segmented w-full"
              style={{ width: "100%" }}
              value={rendQuickRango}
              options={rendRangoOptions}
              onChange={(value) => applyRendQuickRango(value as RendQuickRango)}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#8a7418]">Calendario</span>
            <RangePicker
              className="w-full"
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
              allowClear
              value={rendFechaDesde && rendFechaHasta ? [rendFechaDesde, rendFechaHasta] : null}
              onChange={(dates) => handleRendRangePickerChange(dates as [Dayjs | null, Dayjs | null] | null)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-beck-ink-soft">{periodoAplicadoLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="small"
              value={rendTopValidacion}
              options={rendValidacionOptions}
              onChange={(value) => setRendValidacion(value as "todos" | "validados" | "no_validados")}
            />
            {rendTopValidacion === "no_validados" && (
              <Select
                size="small"
                style={{ width: 170 }}
                value={rendValidacion}
                options={rendSubEstadoOptions}
                onChange={(value) => setRendValidacion(value as DashboardBeckValidacionIngenieria)}
              />
            )}
          </div>
        </div>

        {rendError && (
          <Alert type="error" showIcon message="Error al cargar rendimiento por trabajador" description={rendError} />
        )}

        <Spin spinning={rendLoading}>
          {!rendLoading && !rendError && rendTrabajadores.length === 0 ? (
            <Empty description="No hay datos de rendimiento para los filtros seleccionados." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-beck-ink-soft">Rendimiento por trabajador</p>
                  <ResponsiveContainer width="100%" height={Math.max(220, rendTrabajadores.length * 46)}>
                    <BarChart data={rendTrabajadores} layout="vertical" margin={{ left: 12, right: 24, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, (dataMax: number) => Math.max(100, dataMax)]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis type="category" dataKey="nombreSellador" width={140} tick={{ fontSize: 11 }} />
                      <RechartsTooltip content={<RendimientoBarTooltip />} />
                      <ReferenceLine
                        x={100}
                        stroke="#8a7418"
                        strokeDasharray="4 4"
                        label={{ value: "100%", position: "top", fill: "#8a7418", fontSize: 11 }}
                      />
                      <Bar
                        dataKey="rendimientoGlobalPct"
                        fill={RENDIMIENTO_BAR_COLOR}
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={handleRendBarClick}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-beck-ink-soft">
                    Producción por Código BECK — {rendTrabajador ?? "Todos los trabajadores"}
                  </p>
                  {rendCodigosOrdenados.length === 0 ? (
                    <Empty description="Sin producción por Código BECK para los filtros seleccionados." />
                  ) : rendUsaDonut ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={rendCodigosParaGrafico}
                          dataKey="cantidadEjecutada"
                          nameKey="codigoBeck"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {rendCodigosParaGrafico.map((entry, index) => (
                            <Cell key={entry.codigoBeck} fill={RENDIMIENTO_PIE_COLORS[index % RENDIMIENTO_PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CodigoBeckTooltip total={rendTotalEjecutadoCodigos} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={Math.max(220, rendCodigosParaGrafico.length * 34)}>
                        <BarChart data={rendCodigosParaGrafico} layout="vertical" margin={{ left: 12, right: 24, top: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="codigoBeck" width={90} tick={{ fontSize: 11 }} />
                          <RechartsTooltip content={<CodigoBeckTooltip total={rendTotalEjecutadoCodigos} />} />
                          <Bar dataKey="cantidadEjecutada" fill={RENDIMIENTO_BAR_COLOR} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      {rendCodigosOcultos > 0 && (
                        <p className="mt-1 text-[11px] text-beck-ink-soft">
                          Mostrando los {RENDIMIENTO_TOP_CODIGOS} códigos con mayor ejecución. "Otros" agrupa{" "}
                          {rendCodigosOcultos} códigos adicionales.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Table
                rowKey={(record) => `${record.obraId}-${record.codigoBeck}`}
                size="small"
                columns={detalleCodigoColumns}
                dataSource={rendDetalleCodigos}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                locale={{ emptyText: "No hay detalle por Código BECK para los filtros seleccionados." }}
                scroll={{ x: "max-content" }}
              />
            </div>
          )}
        </Spin>
      </div>
    </Card>
  );
};

export default RendimientoPorTrabajadorPanel;
