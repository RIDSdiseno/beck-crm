import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Input,
  Select,
  Spin,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ClearOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  firematVentasAPI,
  type VentaFiremat,
  type VentasFirematResumen,
} from "../../services/api";

const { RangePicker } = DatePicker;

const formatCLP = (v: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v);

const formatDate = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD-MM-YYYY") : "—";
};

const estadoColor: Record<string, string> = {
  CERRADO: "green",
  PROSPECTO: "blue",
  PENDIENTE: "orange",
  ANULADO: "default",
};

const columns: ColumnsType<VentaFiremat> = [
  {
    title: "Cliente",
    key: "cliente",
    width: 200,
    render: (_, row) => (
      <div>
        <p className="font-medium text-beck-ink leading-tight">{row.cliente}</p>
        {row.contacto && (
          <p className="text-xs text-beck-muted mt-0.5">{row.contacto}</p>
        )}
      </div>
    ),
  },
  {
    title: "Producto principal",
    key: "producto",
    width: 180,
    render: (_, row) =>
      row.producto?.nombre ?? <span className="text-beck-muted">—</span>,
  },
  {
    title: "Cantidad",
    dataIndex: "cantidad",
    key: "cantidad",
    width: 90,
    align: "center",
    render: (v: number) => <span className="tabular-nums">{v}</span>,
  },
  {
    title: "Precio",
    dataIndex: "precio",
    key: "precio",
    width: 120,
    align: "right",
    render: (v: number) => (
      <span className="tabular-nums font-medium">{formatCLP(v)}</span>
    ),
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    width: 130,
    align: "right",
    render: (v: number) => (
      <span className="tabular-nums font-semibold">{formatCLP(v)}</span>
    ),
  },
  {
    title: "Estado",
    dataIndex: "estado",
    key: "estado",
    width: 110,
    render: (v: string) => (
      <Tag color={estadoColor[v] ?? "default"}>{v}</Tag>
    ),
  },
  {
    title: "Responsable",
    dataIndex: "responsable",
    key: "responsable",
    width: 130,
    render: (v: string | null | undefined) =>
      v ?? <span className="text-beck-muted">—</span>,
  },
  {
    title: "Fecha cierre",
    dataIndex: "fechaCierre",
    key: "fechaCierre",
    width: 110,
    render: (v: string | null | undefined) => (
      <span className="tabular-nums text-xs">{formatDate(v)}</span>
    ),
  },
  {
    title: "Creado",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 110,
    render: (v: string) => (
      <span className="tabular-nums text-xs text-beck-muted">{formatDate(v)}</span>
    ),
  },
];

const ESTADO_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Prospecto", value: "PROSPECTO" },
  { label: "Cerrado", value: "CERRADO" },
  { label: "Pendiente", value: "PENDIENTE" },
  { label: "Anulado", value: "ANULADO" },
];

const RESUMEN_VACIO: VentasFirematResumen = {
  totalVentas: 0,
  ventasCerradas: 0,
  ventasProspecto: 0,
  montoTotal: 0,
  montoCerrado: 0,
};

type ResumenCardProps = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

const ResumenCard: React.FC<ResumenCardProps> = ({ label, value, highlight }) => (
  <div className={`firemat-kpi-card flex flex-col gap-1 rounded-2xl p-4 ${highlight ? "border-orange-300" : ""}`}>
    <p className="text-xs text-beck-muted">{label}</p>
    <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-firemat-primary" : "text-beck-ink"}`}>
      {value}
    </p>
  </div>
);

const FirematVentas: React.FC = () => {
  const [ventas, setVentas] = useState<VentaFiremat[]>([]);
  const [resumen, setResumen] = useState<VentasFirematResumen>(RESUMEN_VACIO);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [rango, setRango] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof firematVentasAPI.listar>[0] = {};
      if (q.trim()) params.q = q.trim();
      if (estado) params.estado = estado;
      if (rango[0]) params.desde = rango[0].format("YYYY-MM-DD");
      if (rango[1]) params.hasta = rango[1].format("YYYY-MM-DD");

      const response = await firematVentasAPI.listar(params);
      setVentas(response.data);
      setResumen(response.resumen);
    } catch {
      void message.error("No se pudieron cargar las ventas Firemat");
      setVentas([]);
      setResumen(RESUMEN_VACIO);
    } finally {
      setLoading(false);
    }
  }, [q, estado, rango]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const limpiar = () => {
    setQ("");
    setEstado("");
    setRango([null, null]);
  };

  const hayFiltros = q !== "" || estado !== "" || rango[0] !== null || rango[1] !== null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="firemat-panel">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="firemat-badge">
              <ShoppingCartOutlined style={{ fontSize: 10 }} />
              <span>Seguimiento comercial</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Ventas Firemat
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Seguimiento comercial de ventas registradas en Firemat.
            </p>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void cargar()}
            loading={loading}
          >
            Actualizar
          </Button>
        </div>
      </section>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ResumenCard label="Total ventas" value={resumen.totalVentas} />
        <ResumenCard label="Ventas cerradas" value={resumen.ventasCerradas} />
        <ResumenCard label="Ventas prospecto" value={resumen.ventasProspecto} />
        <ResumenCard label="Monto total" value={formatCLP(resumen.montoTotal)} />
        <ResumenCard label="Monto cerrado" value={formatCLP(resumen.montoCerrado)} highlight />
      </div>

      {/* Filtros */}
      <section className="firemat-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por cliente o producto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            value={estado}
            onChange={setEstado}
            options={ESTADO_OPTIONS}
            style={{ width: 140 }}
            placeholder="Estado"
          />
          <RangePicker
            value={rango}
            onChange={(vals) =>
              setRango(vals ? [vals[0] ?? null, vals[1] ?? null] : [null, null])
            }
            format="DD-MM-YYYY"
            placeholder={["Desde", "Hasta"]}
            allowClear
          />
          {hayFiltros && (
            <Button icon={<ClearOutlined />} onClick={limpiar}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </section>

      {/* Tabla */}
      <section className="firemat-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : ventas.length === 0 ? (
          <div className="py-16">
            <Empty description="No hay ventas que coincidan con los filtros" />
          </div>
        ) : (
          <Table<VentaFiremat>
            dataSource={ventas}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            expandable={{
              rowExpandable: (row) => row.detalle?.length > 0,
              expandedRowRender: (row) => (
                <Table
                  dataSource={row.detalle}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  className="ml-8"
                  columns={[
                    { title: "Producto", dataIndex: "nombreProducto", key: "nombreProducto" },
                    {
                      title: "Cantidad",
                      dataIndex: "cantidad",
                      key: "cantidad",
                      align: "center",
                      width: 90,
                    },
                    {
                      title: "Precio",
                      dataIndex: "precio",
                      key: "precio",
                      align: "right",
                      width: 120,
                      render: (v: number) => formatCLP(v),
                    },
                    {
                      title: "Subtotal",
                      dataIndex: "subtotal",
                      key: "subtotal",
                      align: "right",
                      width: 130,
                      render: (v: number) => (
                        <span className="font-semibold">{formatCLP(v)}</span>
                      ),
                    },
                  ]}
                />
              ),
            }}
            pagination={{
              pageSize: 25,
              showSizeChanger: false,
              showTotal: (total) => `${total} ventas`,
            }}
          />
        )}
      </section>
    </div>
  );
};

export default FirematVentas;
