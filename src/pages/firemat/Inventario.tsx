import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
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
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  firematInventarioAPI,
  type InventarioFirematItem,
  type InventarioFirematResumen,
} from "../../services/api";

const formatDate = (value: string) => {
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : "-";
};

const criticidadColor: Record<string, string> = {
  alta: "red",
  media: "orange",
  baja: "green",
};

const estadoStockTag = (estado: InventarioFirematItem["estadoStock"]) => {
  if (estado === "SIN_STOCK") return <Tag color="red">Sin stock</Tag>;
  if (estado === "BAJO_STOCK") return <Tag color="orange">Bajo stock</Tag>;
  return <Tag color="green">OK</Tag>;
};

const columns: ColumnsType<InventarioFirematItem> = [
  {
    title: "Producto",
    key: "producto",
    width: 220,
    render: (_, row) => (
      <div className={row.alertaStockBajo ? "border-l-2 border-orange-400 pl-2" : ""}>
        <p className="font-medium text-beck-ink leading-tight">{row.nombre}</p>
        {row.descripcion && (
          <p className="text-xs text-beck-muted mt-0.5 leading-snug line-clamp-2">
            {row.descripcion}
          </p>
        )}
      </div>
    ),
  },
  {
    title: "Categoría",
    dataIndex: "categoria",
    key: "categoria",
    width: 130,
    render: (v: string | null | undefined) =>
      v ?? <span className="text-beck-muted">—</span>,
  },
  {
    title: "Stock",
    dataIndex: "stock",
    key: "stock",
    width: 80,
    align: "center",
    render: (v: number) => <span className="tabular-nums">{v}</span>,
  },
  {
    title: "Reservado",
    dataIndex: "stockReservado",
    key: "stockReservado",
    width: 90,
    align: "center",
    render: (v: number) => <span className="tabular-nums">{v}</span>,
  },
  {
    title: "Disponible",
    key: "stockDisponible",
    width: 100,
    align: "center",
    render: (_, row) =>
      row.alertaStockBajo ? (
        <Tag color="red" className="tabular-nums font-semibold">
          {row.stockDisponible}
        </Tag>
      ) : (
        <span className="tabular-nums">{row.stockDisponible}</span>
      ),
  },
  {
    title: "Mín.",
    dataIndex: "minStock",
    key: "minStock",
    width: 70,
    align: "center",
    render: (v: number) => <span className="tabular-nums">{v}</span>,
  },
  {
    title: "Estado stock",
    dataIndex: "estadoStock",
    key: "estadoStock",
    width: 120,
    render: (v: InventarioFirematItem["estadoStock"]) => estadoStockTag(v),
  },
  {
    title: "Criticidad",
    dataIndex: "criticidad",
    key: "criticidad",
    width: 100,
    render: (v: string) => {
      const lower = (v ?? "").toLowerCase();
      return (
        <Tag color={criticidadColor[lower] ?? "default"}>{v ?? "—"}</Tag>
      );
    },
  },
  {
    title: "Ubicación",
    dataIndex: "ubicacion",
    key: "ubicacion",
    width: 120,
    render: (v: string | null | undefined) =>
      v ?? <span className="text-beck-muted">—</span>,
  },
  {
    title: "Estado",
    dataIndex: "activo",
    key: "activo",
    width: 90,
    render: (v: boolean) =>
      v ? <Tag color="green">Activo</Tag> : <Tag color="default">Inactivo</Tag>,
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
  { label: "Activos", value: "true" },
  { label: "Inactivos", value: "false" },
];

const STOCK_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Solo bajo stock", value: "true" },
];

const CRITICIDAD_OPTIONS = [
  { label: "Todas", value: "" },
  { label: "Alta", value: "alta" },
  { label: "Media", value: "media" },
  { label: "Baja", value: "baja" },
];

type ResumenCardProps = {
  label: string;
  value: number;
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
      {value.toLocaleString("es-CL")}
    </p>
  </div>
);

const RESUMEN_VACIO: InventarioFirematResumen = {
  totalProductos: 0,
  productosActivos: 0,
  productosInactivos: 0,
  productosSinStock: 0,
  productosBajoStock: 0,
  stockTotal: 0,
  stockReservadoTotal: 0,
  stockDisponibleTotal: 0,
};

const FirematInventario: React.FC = () => {
  const [items, setItems] = useState<InventarioFirematItem[]>([]);
  const [resumen, setResumen] = useState<InventarioFirematResumen>(RESUMEN_VACIO);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState<"" | "true" | "false">("");
  const [bajoStock, setBajoStock] = useState<"" | "true">("");
  const [criticidad, setCriticidad] = useState("");

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof firematInventarioAPI.listar>[0] = {};
      if (q.trim()) params.q = q.trim();
      if (activo !== "") params.activo = activo === "true";
      if (bajoStock === "true") params.bajoStock = true;
      if (criticidad) params.criticidad = criticidad;

      const response = await firematInventarioAPI.listar(params);
      setItems(response.data);
      setResumen(response.resumen);
    } catch {
      void message.error("No se pudo cargar el inventario Firemat");
      setItems([]);
      setResumen(RESUMEN_VACIO);
    } finally {
      setLoading(false);
    }
  }, [q, activo, bajoStock, criticidad]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const limpiar = () => {
    setQ("");
    setActivo("");
    setBajoStock("");
    setCriticidad("");
  };

  const hayFiltros = q !== "" || activo !== "" || bajoStock !== "" || criticidad !== "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="firemat-panel">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="firemat-badge">
              <InboxOutlined style={{ fontSize: 10 }} />
              <span>Stock en tiempo real</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Inventario Firemat
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Control de stock, reservas y alertas desde el ecommerce Firemat.
            </p>
          </div>
          <Button
            className="firemat-action-button"
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
        <ResumenCard label="Total productos" value={resumen.totalProductos} />
        <ResumenCard label="Stock total" value={resumen.stockTotal} />
        <ResumenCard label="Stock reservado" value={resumen.stockReservadoTotal} />
        <ResumenCard label="Stock disponible" value={resumen.stockDisponibleTotal} />
        <ResumenCard
          label="Bajo stock"
          value={resumen.productosBajoStock}
          highlight={resumen.productosBajoStock > 0}
        />
      </div>

      {/* Filtros */}
      <section className="firemat-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por nombre o descripción"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            value={activo}
            onChange={(v) => setActivo(v as "" | "true" | "false")}
            options={ESTADO_OPTIONS}
            style={{ width: 130 }}
            placeholder="Estado"
          />
          <Select
            value={bajoStock}
            onChange={(v) => setBajoStock(v as "" | "true")}
            options={STOCK_OPTIONS}
            style={{ width: 150 }}
            placeholder="Stock"
          />
          <Select
            value={criticidad}
            onChange={(v) => setCriticidad(v as string)}
            options={CRITICIDAD_OPTIONS}
            style={{ width: 130 }}
            placeholder="Criticidad"
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
        ) : items.length === 0 ? (
          <div className="py-16">
            <Empty description="No hay productos que coincidan con los filtros" />
          </div>
        ) : (
          <Table<InventarioFirematItem>
            dataSource={items}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            rowClassName={(row) =>
              row.alertaStockBajo ? "bg-orange-50" : ""
            }
            pagination={{
              pageSize: 25,
              showSizeChanger: false,
              showTotal: (total) => `${total} productos`,
            }}
          />
        )}
      </section>
    </div>
  );
};

export default FirematInventario;
