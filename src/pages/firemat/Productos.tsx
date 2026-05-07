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
  AppstoreOutlined,
  ClearOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { firematProductosAPI, type ProductoFiremat } from "../../services/api";

const formatCLP = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);

const formatDate = (value: string) => {
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : "-";
};

const criticidadColor: Record<string, string> = {
  alta: "red",
  media: "orange",
  baja: "green",
};

const columns: ColumnsType<ProductoFiremat> = [
  {
    title: "Producto",
    key: "producto",
    width: 220,
    render: (_, row) => (
      <div>
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
    render: (v: string | null | undefined) => v ?? <span className="text-beck-muted">—</span>,
  },
  {
    title: "Precio",
    dataIndex: "precio",
    key: "precio",
    width: 120,
    align: "right",
    render: (v: number) => (
      <span className="font-medium tabular-nums">{formatCLP(v)}</span>
    ),
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
    title: "Criticidad",
    dataIndex: "criticidad",
    key: "criticidad",
    width: 100,
    render: (v: string) => {
      const lower = (v ?? "").toLowerCase();
      return (
        <Tag color={criticidadColor[lower] ?? "default"}>
          {v ?? "—"}
        </Tag>
      );
    },
  },
  {
    title: "Ubicación",
    dataIndex: "ubicacion",
    key: "ubicacion",
    width: 120,
    render: (v: string | null | undefined) => v ?? <span className="text-beck-muted">—</span>,
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

const FirematProductos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState<"" | "true" | "false">("");

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params: { q?: string; activo?: boolean } = {};
      if (q.trim()) params.q = q.trim();
      if (activo !== "") params.activo = activo === "true";
      const data = await firematProductosAPI.listar(params);
      setProductos(data);
    } catch {
      void message.error("No se pudieron cargar los productos Firemat");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, [q, activo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const limpiar = () => {
    setQ("");
    setActivo("");
  };

  const hayFiltros = q !== "" || activo !== "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="firemat-panel">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="firemat-badge">
              <AppstoreOutlined style={{ fontSize: 10 }} />
              <span>Catálogo sincronizado</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Maestro de productos Firemat
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Productos reales sincronizados desde el ecommerce Firemat.
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

      {/* Filtros */}
      <section className="firemat-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por nombre o descripción"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            value={activo}
            onChange={(v) => setActivo(v as "" | "true" | "false")}
            options={ESTADO_OPTIONS}
            style={{ width: 140 }}
          />
          {hayFiltros && (
            <Button
              icon={<ClearOutlined />}
              onClick={limpiar}
              size="middle"
            >
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
        ) : productos.length === 0 ? (
          <div className="py-16">
            <Empty description="No hay productos que coincidan con los filtros" />
          </div>
        ) : (
          <Table<ProductoFiremat>
            dataSource={productos}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
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

export default FirematProductos;
