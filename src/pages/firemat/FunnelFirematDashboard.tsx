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
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
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
  firematFunnelAPI,
  type FirematDashboardData,
  type FirematDashboardParams,
  type FirematDashboardResponsable,
  type FirematDashboardRiesgoItem,
  type FirematDashboardSinSeguimientoItem,
} from "../../services/api";

const { RangePicker } = DatePicker;

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const formatClp = (v: number | null | undefined) => CLP.format(Number(v ?? 0));
const formatNum = (v: number | null | undefined) => NUM.format(Number(v ?? 0));
const safeFixed = (v: number | null | undefined, decimals = 1) =>
  Number(v ?? 0).toFixed(decimals);

const FIREMAT_PRIMARY = "#e63c1e";
const FIREMAT_PRIMARY_DARK = "#c0301a";

const ETAPA_LABELS: Record<string, string> = {
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

const ETAPA_SHORT: Record<string, string> = {
  PROSPECTO: "Prospecto",
  PRIMER_CONTACTO: "P. contacto",
  DESARROLLO_COTIZACION: "Des. cotiz.",
  COTIZACION_ENVIADA: "Cot. enviada",
  ORDEN_CONFIRMADA: "Firmada",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
  POSTERGADA: "Postergada",
  DESCARTADO: "Descartado",
};

const formatEtapa = (etapa: string | null | undefined): string => {
  if (!etapa) return "—";
  return ETAPA_LABELS[etapa] ?? etapa.replace(/_/g, " ");
};

const etapaShort = (etapa: string | null | undefined): string => {
  if (!etapa) return "";
  return ETAPA_SHORT[etapa] ?? etapa;
};

const ETAPA_OPTIONS = Object.entries(ETAPA_LABELS).map(([value, label]) => ({ value, label }));

const ESTADO_OPTIONS = [
  { value: "activa", label: "Activa" },
  { value: "ganada", label: "Ganada" },
  { value: "perdida", label: "Perdida" },
  { value: "postergada", label: "Postergada" },
  { value: "descartada", label: "Descartada" },
];

const PIE_COLORS = [FIREMAT_PRIMARY, "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"];
const BAR_CANTIDAD = "#6366f1";
const BAR_MONTO = FIREMAT_PRIMARY;

// ── Helpers ───────────────────────────────────────────────────

// Normaliza porEtapa: acepta montoClp o monto como nombre del campo
const normalizePorEtapa = (
  raw: Record<string, Record<string, unknown>> | null | undefined
): Record<string, { cantidad: number; montoClp: number }> => {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, { cantidad: number; montoClp: number }> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    result[key] = {
      cantidad: Number(v.cantidad ?? 0),
      montoClp: Number(v.montoClp ?? v.monto ?? 0),
    };
  }
  return result;
};

// Normaliza ranking: acepta responsable o vendedor como campo principal
const normalizeRanking = (
  raw: unknown[]
): FirematDashboardResponsable[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const r = (item ?? {}) as Record<string, unknown>;
    return {
      responsable: String(r.responsable ?? r.vendedor ?? "—"),
      total: Number(r.total ?? 0),
      ganadas: Number(r.ganadas ?? 0),
      perdidas: Number(r.perdidas ?? 0),
      postergadas: Number(r.postergadas ?? 0),
      activas: Number(r.activas ?? 0),
      montoTotalClp: Number(r.montoTotalClp ?? r.montoTotal ?? 0),
      montoGanadoClp: Number(r.montoGanadoClp ?? r.montoGanado ?? 0),
    };
  });
};

// Normaliza items sin seguimiento: acepta múltiples nombres de campo
const normalizeSinSeg = (raw: unknown[]): FirematDashboardSinSeguimientoItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const r = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      nombreOportunidad: String(r.nombreOportunidad ?? r.nombreProyecto ?? r.nombre ?? "—"),
      cliente: String(r.cliente ?? r.empresa ?? "—"),
      responsable: String(r.responsable ?? r.vendedor ?? "—"),
      etapa: String(r.etapa ?? ""),
      updatedAt: String(r.updatedAt ?? ""),
      fechaProximaAccion: r.fechaProximaAccion ? String(r.fechaProximaAccion) : null,
      montoEstimado: Number(r.montoEstimado ?? r.valorClp ?? r.montoClp ?? 0),
    };
  });
};

// Normaliza items de riesgo
const normalizeRiesgoItems = (raw: unknown[]): FirematDashboardRiesgoItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const r = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      nombreOportunidad: String(r.nombreOportunidad ?? r.nombreProyecto ?? r.nombre ?? "—"),
      cliente: String(r.cliente ?? r.empresa ?? "—"),
      responsable: String(r.responsable ?? r.vendedor ?? "—"),
      etapa: String(r.etapa ?? ""),
      updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
      montoEstimado: Number(r.montoEstimado ?? r.valorClp ?? r.montoClp ?? 0),
    };
  });
};

// ── Small reusable components ─────────────────────────────────

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

// ── Sección Prospectos ────────────────────────────────────────

const SeccionProspectos: React.FC<{ d: NonNullable<FirematDashboardData["prospectos"]> }> = ({
  d,
}) => {
  const porOrigen = d?.porOrigen ?? [];
  const porResponsable = d?.porResponsable ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Nuevos esta semana"
          value={formatNum(d?.nuevosSemana)}
          color={BAR_CANTIDAD}
        />
        <KpiCard
          label="Nuevos este mes"
          value={formatNum(d?.nuevosMes)}
          color="#3b82f6"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card size="small" title="Por origen" className="rounded-xl border-slate-200 shadow-sm">
          {porOrigen.length === 0 ? (
            <EmptyMsg />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porOrigen} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="origen"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                <Tooltip formatter={(v) => [formatNum(v as number), "Cantidad"]} />
                <Bar dataKey="cantidad" fill={BAR_CANTIDAD} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card
          size="small"
          title="Por responsable"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          {porResponsable.length === 0 ? (
            <EmptyMsg />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={porResponsable}
                margin={{ top: 4, right: 8, left: 0, bottom: 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="responsable"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
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
};

// ── Sección Pipeline Avanzado ─────────────────────────────────

const colsPipelineSimple = (labelKey: string): ColumnsType<Record<string, unknown>> => [
  { title: labelKey, dataIndex: labelKey, key: labelKey, ellipsis: true },
  {
    title: "Cantidad",
    dataIndex: "cantidad",
    key: "cantidad",
    width: 80,
    align: "right" as const,
    render: (v: number) => formatNum(v),
  },
  {
    title: "Monto CLP",
    dataIndex: "montoClp",
    key: "montoClp",
    align: "right" as const,
    render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span>,
  },
];

const SeccionPipeline: React.FC<{
  d: NonNullable<FirematDashboardData["pipelineAvanzado"]>;
}> = ({ d }) => {
  const porResponsable = d?.porResponsable ?? [];
  const porUnidadNegocio = d?.porUnidadNegocio ?? [];
  const porOrigen = d?.porOrigen ?? [];
  const porTipoCliente = d?.porTipoCliente ?? [];
  const porCliente = d?.porCliente ?? [];
  const porProyecto = d?.porProyecto ?? [];

  const colsProyecto: ColumnsType<(typeof porProyecto)[0]> = [
    { title: "Proyecto", dataIndex: "proyecto", key: "proyecto", ellipsis: true },
    { title: "Cliente", dataIndex: "cliente", key: "cliente", ellipsis: true, width: 140 },
    { title: "Responsable", dataIndex: "responsable", key: "responsable", width: 130 },
    {
      title: "Etapa",
      dataIndex: "etapa",
      key: "etapa",
      width: 150,
      render: (v: string) => <Tag>{formatEtapa(v)}</Tag>,
    },
    {
      title: "Monto CLP",
      dataIndex: "montoClp",
      key: "montoClp",
      align: "right" as const,
      render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Por responsable", data: porResponsable, key: "responsable" },
          { title: "Por unidad de negocio", data: porUnidadNegocio, key: "unidadNegocio" },
          { title: "Por origen", data: porOrigen, key: "origen" },
          { title: "Por tipo de cliente", data: porTipoCliente, key: "tipoCliente" },
          { title: "Top clientes", data: porCliente, key: "cliente" },
        ].map(({ title, data, key }) => (
          <Card key={key} size="small" title={title} className="rounded-xl border-slate-200 shadow-sm">
            {data.length === 0 ? (
              <EmptyMsg />
            ) : (
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
        {porProyecto.length === 0 ? (
          <EmptyMsg />
        ) : (
          <Table
            rowKey={(r) => r.proyecto}
            columns={colsProyecto}
            dataSource={porProyecto}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  );
};

// ── Sección Forecast ──────────────────────────────────────────

const SeccionForecast: React.FC<{ d: NonNullable<FirematDashboardData["forecast"]> }> = ({ d }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    {(["dias30", "dias60", "dias90"] as const).map((k) => {
      const labels = { dias30: "30 días", dias60: "60 días", dias90: "90 días" };
      const item = d?.[k] ?? { cantidad: 0, montoClp: 0, montoPonderadoClp: 0 };
      return (
        <div
          key={k}
          className="rounded-xl border p-4 shadow-sm"
          style={{ borderColor: "#f4c4ba", background: "#fff9f8" }}
        >
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: FIREMAT_PRIMARY_DARK }}
          >
            Forecast {labels[k]}
          </p>
          <p className="text-2xl font-bold" style={{ color: FIREMAT_PRIMARY }}>
            {formatNum(item.cantidad)}
          </p>
          <p className="text-xs text-slate-500">oportunidades</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Monto total</span>
              <span className="font-mono font-medium">{formatClp(item.montoClp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monto ponderado</span>
              <span className="font-mono font-medium" style={{ color: FIREMAT_PRIMARY }}>
                {formatClp(item.montoPonderadoClp)}
              </span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// ── Sección Ganadas ───────────────────────────────────────────

const SeccionGanadas: React.FC<{ d: NonNullable<FirematDashboardData["ganadas"]> }> = ({ d }) => {
  const historial = d?.montoGanadoUltimos12Meses ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard
          label="Monto ganado este mes"
          value={formatClp(d?.montoGanadoMesActualClp)}
          color="#22c55e"
        />
      </div>
      <Card
        size="small"
        title="Ganadas últimos 12 meses"
        className="rounded-xl border-slate-200 shadow-sm"
      >
        {historial.length === 0 ? (
          <EmptyMsg />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={historial} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10 }}
                allowDecimals={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                width={60}
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `$${(v / 1_000_000).toFixed(1)}M`
                    : `$${(v / 1_000).toFixed(0)}K`
                }
              />
              <Tooltip
                formatter={(v, name) =>
                  name === "montoClp"
                    ? [formatClp(v as number), "Monto CLP"]
                    : [formatNum(v as number), "Cantidad"]
                }
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconSize={10}
                wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              />
              <Bar
                yAxisId="left"
                dataKey="cantidad"
                fill={BAR_CANTIDAD}
                radius={[3, 3, 0, 0]}
                name="Cantidad"
              />
              <Bar
                yAxisId="right"
                dataKey="montoClp"
                fill="#22c55e"
                radius={[3, 3, 0, 0]}
                name="Monto CLP"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

// ── Sección Motivos ───────────────────────────────────────────

const TablaMotivos: React.FC<{
  data: { motivo: string; cantidad: number }[];
  title: string;
  color: string;
}> = ({ data, title, color }) => (
  <Card
    size="small"
    title={<span style={{ color }}>{title}</span>}
    className="rounded-xl border-slate-200 shadow-sm"
  >
    {(data ?? []).length === 0 ? (
      <EmptyMsg />
    ) : (
      <Table
        rowKey="motivo"
        columns={[
          { title: "Motivo", dataIndex: "motivo", key: "motivo", ellipsis: true },
          {
            title: "Cantidad",
            dataIndex: "cantidad",
            key: "cantidad",
            width: 80,
            align: "right" as const,
            render: (v: number) => formatNum(v),
          },
        ]}
        dataSource={data ?? []}
        size="small"
        pagination={false}
      />
    )}
  </Card>
);

const SeccionMotivos: React.FC<{ d: NonNullable<FirematDashboardData["motivos"]> }> = ({ d }) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <TablaMotivos data={d?.perdida ?? []} title="Motivos de pérdida" color="#ef4444" />
    <TablaMotivos data={d?.postergacion ?? []} title="Motivos de postergación" color="#f59e0b" />
    <TablaMotivos data={d?.descarte ?? []} title="Motivos de descarte" color="#6b7280" />
  </div>
);

// ── Sección Riesgo Comercial ──────────────────────────────────

const colsRiesgo = (showUpdatedAt: boolean): ColumnsType<FirematDashboardRiesgoItem> => [
  { title: "Oportunidad", dataIndex: "nombreOportunidad", key: "nombreOportunidad", ellipsis: true },
  { title: "Cliente", dataIndex: "cliente", key: "cliente", ellipsis: true, width: 130 },
  { title: "Responsable", dataIndex: "responsable", key: "responsable", width: 120 },
  {
    title: "Etapa",
    dataIndex: "etapa",
    key: "etapa",
    width: 150,
    render: (v: string) => <Tag>{formatEtapa(v)}</Tag>,
  },
  ...(showUpdatedAt
    ? [
        {
          title: "Última actividad",
          dataIndex: "updatedAt",
          key: "updatedAt",
          width: 130,
          render: (v: string) => (v ? dayjs(v).format("DD-MM-YYYY") : "—"),
        } as const,
      ]
    : []),
  {
    title: "Monto CLP",
    dataIndex: "montoEstimado",
    key: "montoEstimado",
    align: "right" as const,
    width: 130,
    render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span>,
  },
];

const SeccionRiesgo: React.FC<{
  d: NonNullable<FirematDashboardData["riesgoComercial"]>;
}> = ({ d }) => {
  const detenidas = d?.oportunidadesDetenidas ?? { total: 0, diasSinMovimiento: 0, items: [] };
  const sinAccion = d?.oportunidadesSinProximaAccion ?? { total: 0, items: [] };
  const itemsDetenidas = normalizeRiesgoItems(detenidas.items ?? []);
  const itemsSinAccion = normalizeRiesgoItems(sinAccion.items ?? []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard
          label="Oportunidades detenidas"
          value={formatNum(detenidas.total)}
          sub={`+${detenidas.diasSinMovimiento ?? 0} días sin movimiento`}
          danger={(detenidas.total ?? 0) > 0}
        />
        <KpiCard
          label="Sin próxima acción"
          value={formatNum(sinAccion.total)}
          danger={(sinAccion.total ?? 0) > 0}
        />
      </div>
      <Card
        size="small"
        title="Top detenidas (sin movimiento)"
        className="rounded-xl border-red-100 shadow-sm"
      >
        {itemsDetenidas.length === 0 ? (
          <EmptyMsg text="Sin oportunidades detenidas" />
        ) : (
          <Table<FirematDashboardRiesgoItem>
            rowKey="id"
            columns={colsRiesgo(true)}
            dataSource={itemsDetenidas}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 800 }}
            rowClassName="bg-red-50/30"
          />
        )}
      </Card>
      <Card
        size="small"
        title="Sin próxima acción definida"
        className="rounded-xl border-amber-100 shadow-sm"
      >
        {itemsSinAccion.length === 0 ? (
          <EmptyMsg text="Todas tienen próxima acción" />
        ) : (
          <Table<FirematDashboardRiesgoItem>
            rowKey="id"
            columns={colsRiesgo(false)}
            dataSource={itemsSinAccion}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 720 }}
            rowClassName="bg-amber-50/30"
          />
        )}
      </Card>
    </div>
  );
};

// ── Sección Conversión por etapa ──────────────────────────────

const SeccionConversion: React.FC<{
  d: NonNullable<FirematDashboardData["conversionEtapas"]>;
}> = ({ d }) => {
  const etapas = d?.etapas ?? [];
  const transiciones = d?.transiciones ?? [];

  const colsEtapas: ColumnsType<(typeof etapas)[0]> = [
    { title: "Etapa", dataIndex: "label", key: "label" },
    {
      title: "Cantidad",
      dataIndex: "cantidad",
      key: "cantidad",
      width: 90,
      align: "right" as const,
      render: (v: number) => formatNum(v),
    },
    {
      title: "% sobre total",
      dataIndex: "porcentajeSobreTotal",
      key: "porcentajeSobreTotal",
      width: 110,
      align: "right" as const,
      render: (v: number) => `${safeFixed(v)}%`,
    },
  ];

  const colsTransiciones: ColumnsType<(typeof transiciones)[0]> = [
    { title: "Desde", dataIndex: "desdeLabel", key: "desdeLabel" },
    { title: "Hasta", dataIndex: "hastaLabel", key: "hastaLabel" },
    {
      title: "Cantidad desde",
      dataIndex: "cantidadDesde",
      key: "cantidadDesde",
      width: 110,
      align: "right" as const,
      render: (v: number) => formatNum(v),
    },
    {
      title: "Cantidad hasta",
      dataIndex: "cantidadHasta",
      key: "cantidadHasta",
      width: 110,
      align: "right" as const,
      render: (v: number) => formatNum(v),
    },
    {
      title: "Tasa conversión",
      dataIndex: "tasaConversion",
      key: "tasaConversion",
      width: 120,
      align: "right" as const,
      render: (v: number) => (
        <span
          className={
            (v ?? 0) >= 50
              ? "font-medium text-green-700"
              : (v ?? 0) < 25
                ? "font-medium text-red-600"
                : ""
          }
        >
          {safeFixed(v)}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card size="small" title="Embudo por etapa" className="rounded-xl border-slate-200 shadow-sm">
        {etapas.length === 0 ? (
          <EmptyMsg />
        ) : (
          <Table
            rowKey="etapa"
            columns={colsEtapas}
            dataSource={etapas}
            size="small"
            pagination={false}
          />
        )}
      </Card>
      <Card
        size="small"
        title="Transiciones entre etapas"
        className="rounded-xl border-slate-200 shadow-sm"
      >
        {transiciones.length === 0 ? (
          <EmptyMsg />
        ) : (
          <Table
            rowKey={(r) => `${r.desde}-${r.hasta}`}
            columns={colsTransiciones}
            dataSource={transiciones}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          />
        )}
      </Card>
    </div>
  );
};

// ── Sección Tiempos promedio ──────────────────────────────────

const SeccionTiempos: React.FC<{
  d: NonNullable<FirematDashboardData["tiemposPromedio"]>;
}> = ({ d }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <KpiCard
      label="Tiempo promedio — Desarrollo cotización"
      value={`${Number(d?.tiempoPromedioDesarrolloCotizacion ?? 0)} días`}
      color={FIREMAT_PRIMARY}
    />
    <KpiCard
      label="Tiempo promedio — Cotización enviada"
      value={`${Number(d?.tiempoPromedioCotizacionEnviada ?? 0)} días`}
      color={FIREMAT_PRIMARY_DARK}
    />
  </div>
);

// ── Error boundary simple ─────────────────────────────────────

class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message ?? "Error desconocido" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[FIREMAT_DASHBOARD_ERROR]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          showIcon
          message="Error al renderizar el dashboard"
          description={this.state.errorMsg}
          action={
            <Button
              size="small"
              onClick={() => {
                this.setState({ hasError: false, errorMsg: "" });
                this.props.onRetry();
              }}
            >
              Reintentar
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

// ── Dashboard principal ───────────────────────────────────────

interface Props {
  responsablesDisponibles?: string[];
  unidadesNegocioDisponibles?: string[];
  origenesDisponibles?: string[];
  tiposClienteDisponibles?: string[];
  tiposOportunidadDisponibles?: string[];
  clientesDisponibles?: string[];
  proyectosDisponibles?: string[];
  productosDisponibles?: { value: number; label: string }[];
}

const toOpts = (values: string[]) =>
  [...new Set(values)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map((v) => ({ value: v, label: v }));

const FunnelFirematDashboard: React.FC<Props> = ({
  responsablesDisponibles = [],
  unidadesNegocioDisponibles = [],
  origenesDisponibles = [],
  tiposClienteDisponibles = [],
  tiposOportunidadDisponibles = [],
  clientesDisponibles = [],
  proyectosDisponibles = [],
  productosDisponibles = [],
}) => {
  const [rawData, setRawData] = useState<FirematDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [responsable, setResponsable] = useState<string | undefined>();
  const [etapaFiltro, setEtapaFiltro] = useState<string | undefined>();
  const [estado, setEstado] = useState<string | undefined>();
  const [unidadNegocio, setUnidadNegocio] = useState<string | undefined>();
  const [origen, setOrigen] = useState<string | undefined>();
  const [tipoCliente, setTipoCliente] = useState<string | undefined>();
  const [tipoOportunidad, setTipoOportunidad] = useState<string | undefined>();
  const [cliente, setCliente] = useState<string | undefined>();
  const [proyecto, setProyecto] = useState<string | undefined>();
  const [productoId, setProductoId] = useState<number | undefined>();
  const [diasSinSeg, setDiasSinSeg] = useState<number>(7);
  const [fechaIngresoRange, setFechaIngresoRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null]
  >([null, null]);
  const [fechaCierreRange, setFechaCierreRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null]
  >([null, null]);

  const buildParams = useCallback((): FirematDashboardParams => {
    const params: FirematDashboardParams = { diasSinSeguimiento: diasSinSeg };
    if (responsable) params.responsable = responsable;
    if (etapaFiltro) params.etapa = etapaFiltro;
    if (estado) params.estado = estado;
    if (unidadNegocio) params.unidadNegocio = unidadNegocio;
    if (origen) params.origen = origen;
    if (tipoCliente) params.tipoCliente = tipoCliente;
    if (tipoOportunidad) params.tipoOportunidad = tipoOportunidad;
    if (cliente) params.cliente = cliente;
    if (proyecto) params.proyecto = proyecto;
    if (productoId) params.productoId = productoId;
    if (fechaIngresoRange[0])
      params.fechaIngresoDesde = fechaIngresoRange[0].format("YYYY-MM-DD");
    if (fechaIngresoRange[1])
      params.fechaIngresoHasta = fechaIngresoRange[1].format("YYYY-MM-DD");
    if (fechaCierreRange[0])
      params.fechaCierreDesde = fechaCierreRange[0].format("YYYY-MM-DD");
    if (fechaCierreRange[1])
      params.fechaCierreHasta = fechaCierreRange[1].format("YYYY-MM-DD");
    return params;
  }, [
    responsable,
    etapaFiltro,
    estado,
    unidadNegocio,
    origen,
    tipoCliente,
    tipoOportunidad,
    cliente,
    proyecto,
    productoId,
    diasSinSeg,
    fechaIngresoRange,
    fechaCierreRange,
  ]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await firematFunnelAPI.getDashboard(buildParams());
      console.log("[FIREMAT_DASHBOARD_DATA]", result);
      setRawData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const clearFilters = () => {
    setResponsable(undefined);
    setEtapaFiltro(undefined);
    setEstado(undefined);
    setUnidadNegocio(undefined);
    setOrigen(undefined);
    setTipoCliente(undefined);
    setTipoOportunidad(undefined);
    setCliente(undefined);
    setProyecto(undefined);
    setProductoId(undefined);
    setDiasSinSeg(7);
    setFechaIngresoRange([null, null]);
    setFechaCierreRange([null, null]);
  };

  // Normalizar todos los campos defensivamente
  const data = useMemo(() => {
    if (!rawData) return null;
    return {
      kpis: {
        totalOportunidades: Number(rawData.kpis?.totalOportunidades ?? 0),
        oportunidadesActivas: Number(rawData.kpis?.oportunidadesActivas ?? 0),
        oportunidadesGanadas: Number(rawData.kpis?.oportunidadesGanadas ?? 0),
        oportunidadesPerdidas: Number(rawData.kpis?.oportunidadesPerdidas ?? 0),
        oportunidadesPostergadas: Number(rawData.kpis?.oportunidadesPostergadas ?? 0),
        oportunidadesDescartadas: Number(rawData.kpis?.oportunidadesDescartadas ?? 0),
        pipelineTotalClp: Number(rawData.kpis?.pipelineTotalClp ?? 0),
        montoGanadoClp: Number(rawData.kpis?.montoGanadoClp ?? 0),
        montoPerdidoClp: Number(rawData.kpis?.montoPerdidoClp ?? 0),
        tasaCierre: Number(rawData.kpis?.tasaCierre ?? 0),
        tasaRecompra: Number(rawData.kpis?.tasaRecompra ?? 0),
        clientesReactivados: Number(rawData.kpis?.clientesReactivados ?? 0),
      },
      distribucionEstado: {
        activas: Number(rawData.distribucionEstado?.activas ?? 0),
        ganadas: Number(rawData.distribucionEstado?.ganadas ?? 0),
        perdidas: Number(rawData.distribucionEstado?.perdidas ?? 0),
        postergadas: Number(rawData.distribucionEstado?.postergadas ?? 0),
        descartadas: Number(rawData.distribucionEstado?.descartadas ?? 0),
      },
      porEtapa: normalizePorEtapa(
        rawData.porEtapa as unknown as Record<string, Record<string, unknown>>
      ),
      rankingResponsables: normalizeRanking(
        (rawData.rankingResponsables ?? (rawData as unknown as Record<string, unknown>).rankingVendedores ?? []) as unknown[]
      ),
      sinSeguimiento: {
        totalSinSeguimiento: Number(rawData.sinSeguimiento?.totalSinSeguimiento ?? 0),
        diasSinSeguimiento: Number(rawData.sinSeguimiento?.diasSinSeguimiento ?? diasSinSeg),
        oportunidadesSinSeguimiento: normalizeSinSeg(
          rawData.sinSeguimiento?.oportunidadesSinSeguimiento ?? []
        ),
      },
      proximasAcciones: {
        accionesVencidas: Number(rawData.proximasAcciones?.accionesVencidas ?? 0),
        accionesHoy: Number(rawData.proximasAcciones?.accionesHoy ?? 0),
        accionesProximos7Dias: Number(rawData.proximasAcciones?.accionesProximos7Dias ?? 0),
      },
      prospectos: rawData.prospectos ?? null,
      pipelineAvanzado: rawData.pipelineAvanzado ?? null,
      forecast: rawData.forecast ?? null,
      ganadas: rawData.ganadas ?? null,
      motivos: rawData.motivos ?? null,
      riesgoComercial: rawData.riesgoComercial ?? null,
      conversionEtapas: rawData.conversionEtapas ?? null,
      tiemposPromedio: rawData.tiemposPromedio ?? null,
    };
  }, [rawData, diasSinSeg]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Activas", value: data.distribucionEstado.activas },
      { name: "Ganadas", value: data.distribucionEstado.ganadas },
      { name: "Perdidas", value: data.distribucionEstado.perdidas },
      { name: "Postergadas", value: data.distribucionEstado.postergadas },
      { name: "Descartadas", value: data.distribucionEstado.descartadas },
    ].filter((d) => d.value > 0);
  }, [data]);

  const etapasCantidadData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.porEtapa).map(([key, val]) => ({
      etapa: key,
      cantidad: val.cantidad,
    }));
  }, [data]);

  const etapasMontoData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.porEtapa).map(([key, val]) => ({
      etapa: key,
      monto: val.montoClp,
    }));
  }, [data]);

  const columnsResponsables: ColumnsType<FirematDashboardResponsable> = [
    { title: "Responsable", dataIndex: "responsable", key: "responsable", width: 160 },
    { title: "Total", dataIndex: "total", key: "total", width: 70, align: "right" },
    { title: "Activas", dataIndex: "activas", key: "activas", width: 75, align: "right" },
    {
      title: "Ganadas",
      dataIndex: "ganadas",
      key: "ganadas",
      width: 80,
      align: "right",
      render: (v: number) => (
        <span className="font-medium text-green-700">{formatNum(v)}</span>
      ),
    },
    {
      title: "Perdidas",
      dataIndex: "perdidas",
      key: "perdidas",
      width: 80,
      align: "right",
      render: (v: number) => (
        <span className="font-medium text-red-600">{formatNum(v)}</span>
      ),
    },
    {
      title: "Postergadas",
      dataIndex: "postergadas",
      key: "postergadas",
      width: 100,
      align: "right",
      render: (v: number) => (
        <span className="font-medium text-amber-600">{formatNum(v)}</span>
      ),
    },
    {
      title: "Monto total",
      dataIndex: "montoTotalClp",
      key: "montoTotalClp",
      align: "right",
      render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span>,
    },
    {
      title: "Monto ganado",
      dataIndex: "montoGanadoClp",
      key: "montoGanadoClp",
      align: "right",
      render: (v: number) => (
        <span className="font-mono text-xs text-green-700">{formatClp(v)}</span>
      ),
    },
  ];

  const columnsSinSeg: ColumnsType<FirematDashboardSinSeguimientoItem> = [
    {
      title: "Oportunidad",
      dataIndex: "nombreOportunidad",
      key: "nombreOportunidad",
      ellipsis: true,
    },
    { title: "Cliente", dataIndex: "cliente", key: "cliente", ellipsis: true, width: 140 },
    { title: "Responsable", dataIndex: "responsable", key: "responsable", width: 120 },
    {
      title: "Etapa",
      dataIndex: "etapa",
      key: "etapa",
      width: 150,
      render: (v: string) => <Tag>{formatEtapa(v)}</Tag>,
    },
    {
      title: "Última actividad",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 140,
      render: (v: string) => (v ? dayjs(v).format("DD-MM-YYYY") : "—"),
    },
    {
      title: "Próxima acción",
      dataIndex: "fechaProximaAccion",
      key: "fechaProximaAccion",
      width: 130,
      render: (v: string | null) =>
        v ? (
          <span
            className={
              dayjs(v).isBefore(dayjs(), "day") ? "font-medium text-red-600" : ""
            }
          >
            {dayjs(v).format("DD-MM-YYYY")}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: "Monto CLP",
      dataIndex: "montoEstimado",
      key: "montoEstimado",
      align: "right",
      width: 130,
      render: (v: number) => <span className="font-mono text-xs">{formatClp(v)}</span>,
    },
  ];

  const responsableOpts = useMemo(
    () => responsablesDisponibles.map((v) => ({ value: v, label: v })),
    [responsablesDisponibles]
  );
  const unidadNegocioOpts = useMemo(
    () => toOpts(unidadesNegocioDisponibles),
    [unidadesNegocioDisponibles]
  );
  const origenOpts = useMemo(() => toOpts(origenesDisponibles), [origenesDisponibles]);
  const tipoClienteOpts = useMemo(
    () => toOpts(tiposClienteDisponibles),
    [tiposClienteDisponibles]
  );
  const tipoOportunidadOpts = useMemo(
    () => toOpts(tiposOportunidadDisponibles),
    [tiposOportunidadDisponibles]
  );
  const clienteOpts = useMemo(() => toOpts(clientesDisponibles), [clientesDisponibles]);
  const proyectoOpts = useMemo(() => toOpts(proyectosDisponibles), [proyectosDisponibles]);

  const advancedSections = useMemo(() => {
    if (!data) return [];
    const items = [];
    if (data.prospectos)
      items.push({
        key: "prospectos",
        label: <span className="font-semibold">Prospectos</span>,
        children: <SeccionProspectos d={data.prospectos} />,
      });
    if (data.pipelineAvanzado)
      items.push({
        key: "pipeline",
        label: <span className="font-semibold">Pipeline avanzado</span>,
        children: <SeccionPipeline d={data.pipelineAvanzado} />,
      });
    if (data.forecast)
      items.push({
        key: "forecast",
        label: <span className="font-semibold">Forecast</span>,
        children: <SeccionForecast d={data.forecast} />,
      });
    if (data.ganadas)
      items.push({
        key: "ganadas",
        label: <span className="font-semibold">Ganadas</span>,
        children: <SeccionGanadas d={data.ganadas} />,
      });
    if (data.motivos)
      items.push({
        key: "motivos",
        label: <span className="font-semibold">Motivos de cierre</span>,
        children: <SeccionMotivos d={data.motivos} />,
      });
    if (data.riesgoComercial)
      items.push({
        key: "riesgo",
        label: <span className="font-semibold text-red-600">Riesgo comercial</span>,
        children: <SeccionRiesgo d={data.riesgoComercial} />,
      });
    if (data.conversionEtapas)
      items.push({
        key: "conversion",
        label: <span className="font-semibold">Conversión por etapa</span>,
        children: <SeccionConversion d={data.conversionEtapas} />,
      });
    if (data.tiemposPromedio)
      items.push({
        key: "tiempos",
        label: <span className="font-semibold">Tiempos promedio</span>,
        children: <SeccionTiempos d={data.tiemposPromedio} />,
      });
    return items;
  }, [data]);

  return (
    <DashboardErrorBoundary onRetry={() => void cargar()}>
      <div className="space-y-5 px-1 py-2">
        {/* ── Filtros ── */}
        <div
          className="rounded-xl border p-4"
          style={{ background: "#fff9f8", borderColor: "#f4c4ba" }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filtros
            </Typography.Text>
          </div>

          {/* Fila 1 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-slate-500">Responsable comercial</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={responsable}
                onChange={setResponsable}
                options={responsableOpts}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Todos"
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Etapa</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={etapaFiltro}
                onChange={setEtapaFiltro}
                options={ETAPA_OPTIONS}
                allowClear
                placeholder="Todas"
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Estado</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={estado}
                onChange={setEstado}
                options={ESTADO_OPTIONS}
                allowClear
                placeholder="Todos"
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Días sin seguimiento</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={diasSinSeg}
                onChange={(v) => setDiasSinSeg(v as number)}
                options={[
                  { value: 7, label: "7 días" },
                  { value: 15, label: "15 días" },
                  { value: 30, label: "30 días" },
                ]}
              />
            </div>
          </div>

          {/* Fila 2 */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-slate-500">Unidad de negocio</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={unidadNegocio}
                onChange={setUnidadNegocio}
                options={unidadNegocioOpts}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Origen</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={origen}
                onChange={setOrigen}
                options={origenOpts}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Tipo cliente</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={tipoCliente}
                onChange={setTipoCliente}
                options={tipoClienteOpts}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Tipo oportunidad</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={tipoOportunidad}
                onChange={setTipoOportunidad}
                options={tipoOportunidadOpts}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Cliente</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={cliente}
                onChange={setCliente}
                options={clienteOpts}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Proyecto</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={proyecto}
                onChange={setProyecto}
                options={proyectoOpts}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Producto</p>
              <Select
                size="small"
                style={{ width: "100%" }}
                value={productoId}
                onChange={(v) => setProductoId(v as number | undefined)}
                options={productosDisponibles}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Seleccionar..."
              />
            </div>
          </div>

          {/* Fila 3: fechas */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-slate-500">Fecha ingreso desde / hasta</p>
              <RangePicker
                size="small"
                style={{ width: "100%" }}
                value={fechaIngresoRange}
                onChange={(vals) =>
                  setFechaIngresoRange(
                    vals ? [vals[0] ?? null, vals[1] ?? null] : [null, null]
                  )
                }
                format="DD-MM-YYYY"
                allowClear
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Fecha cierre desde / hasta</p>
              <RangePicker
                size="small"
                style={{ width: "100%" }}
                value={fechaCierreRange}
                onChange={(vals) =>
                  setFechaCierreRange(
                    vals ? [vals[0] ?? null, vals[1] ?? null] : [null, null]
                  )
                }
                format="DD-MM-YYYY"
                allowClear
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void cargar()}
              style={{ background: FIREMAT_PRIMARY, borderColor: FIREMAT_PRIMARY }}
            >
              Aplicar filtros
            </Button>
            <Button size="small" onClick={clearFilters}>
              Limpiar filtros
            </Button>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void cargar()}
            >
              Recargar
            </Button>
          </div>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Error al cargar el dashboard"
            description={error}
            action={
              <Button size="small" onClick={() => void cargar()}>
                Reintentar
              </Button>
            }
          />
        )}

        {loading && !data && <Skeleton active paragraph={{ rows: 10 }} />}

        {data && (
          <>
            {/* ── KPIs base ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              <KpiCard
                label="Total oportunidades"
                value={formatNum(data.kpis.totalOportunidades)}
              />
              <KpiCard
                label="Activas"
                value={formatNum(data.kpis.oportunidadesActivas)}
                color="#3b82f6"
              />
              <KpiCard
                label="Ganadas"
                value={formatNum(data.kpis.oportunidadesGanadas)}
                color="#22c55e"
              />
              <KpiCard
                label="Perdidas"
                value={formatNum(data.kpis.oportunidadesPerdidas)}
                color="#ef4444"
              />
              <KpiCard
                label="Postergadas"
                value={formatNum(data.kpis.oportunidadesPostergadas)}
                color="#f59e0b"
              />
              <KpiCard
                label="Descartadas"
                value={formatNum(data.kpis.oportunidadesDescartadas)}
                color="#6b7280"
              />
              <KpiCard
                label="Pipeline total"
                value={formatClp(data.kpis.pipelineTotalClp)}
                sub="CLP total activas"
                color={FIREMAT_PRIMARY}
              />
              <KpiCard
                label="Monto ganado"
                value={formatClp(data.kpis.montoGanadoClp)}
                color="#22c55e"
              />
              <KpiCard
                label="Monto perdido"
                value={formatClp(data.kpis.montoPerdidoClp)}
                color="#ef4444"
              />
              <KpiCard
                label="Tasa de cierre"
                value={`${safeFixed(data.kpis.tasaCierre)}%`}
                sub="ganadas / (ganadas + perdidas)"
                color={FIREMAT_PRIMARY}
              />
              <KpiCard
                label="Tasa recompra"
                value={`${safeFixed(data.kpis.tasaRecompra)}%`}
                color="#8b5cf6"
              />
              <KpiCard
                label="Clientes reactivados"
                value={formatNum(data.kpis.clientesReactivados)}
                color="#7c3aed"
              />
              <KpiCard
                label="Sin seguimiento"
                value={formatNum(data.sinSeguimiento.totalSinSeguimiento)}
                sub={`+${diasSinSeg} días sin movimiento`}
                danger={data.sinSeguimiento.totalSinSeguimiento > 0}
              />
              <KpiCard
                label="Acciones vencidas"
                value={formatNum(data.proximasAcciones.accionesVencidas)}
                danger={data.proximasAcciones.accionesVencidas > 0}
              />
            </div>

            {/* ── Próximas acciones ── */}
            <div>
              <Typography.Text className="mb-3 block text-sm font-semibold text-slate-700">
                Próximas acciones
              </Typography.Text>
              <div className="grid grid-cols-3 gap-3">
                <ProximasCard
                  label="Vencidas"
                  value={data.proximasAcciones.accionesVencidas}
                  color="#dc2626"
                  bg="border border-red-200 bg-red-50"
                />
                <ProximasCard
                  label="Hoy"
                  value={data.proximasAcciones.accionesHoy}
                  color="#d97706"
                  bg="border border-amber-200 bg-amber-50"
                />
                <ProximasCard
                  label="Próximos 7 días"
                  value={data.proximasAcciones.accionesProximos7Dias}
                  color="#2563eb"
                  bg="border border-blue-200 bg-blue-50"
                />
              </div>
            </div>

            {/* ── Gráficos base ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card
                size="small"
                title={
                  <span className="text-sm font-semibold">Distribución por estado</span>
                }
                className="rounded-xl border border-slate-200 shadow-sm"
              >
                {pieData.length === 0 ? (
                  <EmptyMsg />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={false}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [formatNum(v as number), name as string]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconSize={10}
                        iconType="circle"
                        wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card
                size="small"
                title={
                  <span className="text-sm font-semibold">Oportunidades por etapa</span>
                }
                className="rounded-xl border border-slate-200 shadow-sm"
              >
                {etapasCantidadData.length === 0 ? (
                  <EmptyMsg />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={etapasCantidadData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 64 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="etapa"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        tickFormatter={etapaShort}
                      />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                      <Tooltip
                        formatter={(v) => [formatNum(v as number), "Cantidad"]}
                        labelFormatter={formatEtapa}
                      />
                      <Bar dataKey="cantidad" fill={BAR_CANTIDAD} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card
                size="small"
                title={<span className="text-sm font-semibold">Monto por etapa (CLP)</span>}
                className="rounded-xl border border-slate-200 shadow-sm"
              >
                {etapasMontoData.length === 0 ? (
                  <EmptyMsg />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={etapasMontoData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 64 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="etapa"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        tickFormatter={etapaShort}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        width={48}
                        tickFormatter={(v: number) =>
                          v >= 1_000_000
                            ? `$${(v / 1_000_000).toFixed(1)}M`
                            : `$${(v / 1_000).toFixed(0)}K`
                        }
                      />
                      <Tooltip
                        formatter={(v) => [formatClp(v as number), "Monto CLP"]}
                        labelFormatter={formatEtapa}
                      />
                      <Bar dataKey="monto" fill={BAR_MONTO} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* ── Ranking responsables ── */}
            <div>
              <Typography.Text className="mb-3 block text-sm font-semibold text-slate-700">
                Ranking responsables
              </Typography.Text>
              {data.rankingResponsables.length === 0 ? (
                <p className="text-xs text-slate-400">Sin datos de responsables</p>
              ) : (
                <Table<FirematDashboardResponsable>
                  rowKey="responsable"
                  columns={columnsResponsables}
                  dataSource={data.rankingResponsables}
                  size="small"
                  pagination={false}
                  scroll={{ x: 700 }}
                  className="rounded-xl border border-slate-200 shadow-sm"
                />
              )}
            </div>

            {/* ── Sin seguimiento ── */}
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <WarningOutlined className="text-amber-500" />
                <Typography.Text className="text-sm font-semibold text-slate-700">
                  Oportunidades sin seguimiento
                </Typography.Text>
                {data.sinSeguimiento.totalSinSeguimiento > 0 && (
                  <Tag color="orange">
                    {data.sinSeguimiento.totalSinSeguimiento} oportunidad
                    {data.sinSeguimiento.totalSinSeguimiento !== 1 ? "es" : ""} sin movimiento
                    en más de {data.sinSeguimiento.diasSinSeguimiento} días
                  </Tag>
                )}
              </div>
              {data.sinSeguimiento.oportunidadesSinSeguimiento.length === 0 ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
                  Todas las oportunidades activas tienen seguimiento reciente
                </div>
              ) : (
                <Table<FirematDashboardSinSeguimientoItem>
                  rowKey="id"
                  columns={columnsSinSeg}
                  dataSource={data.sinSeguimiento.oportunidadesSinSeguimiento}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  scroll={{ x: 900 }}
                  className="rounded-xl border border-amber-200 shadow-sm"
                  rowClassName="bg-amber-50/40"
                />
              )}
            </div>

            {/* ── Análisis avanzado ── */}
            {advancedSections.length > 0 && (
              <div>
                <Typography.Text className="mb-3 block text-sm font-semibold text-slate-700">
                  Análisis avanzado
                </Typography.Text>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Collapse
                    items={advancedSections}
                    defaultActiveKey={["prospectos", "forecast", "riesgo"]}
                    className="rounded-xl border-slate-200 shadow-sm"
                    size="small"
                  />
                </Space>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardErrorBoundary>
  );
};

export default FunnelFirematDashboard;
