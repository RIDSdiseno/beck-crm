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
  HistoryOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { firematInventarioAPI, type MovimientoFiremat } from "../../services/api";

const formatDateTime = (value: string) => {
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY HH:mm") : "-";
};

const tipoTag = (tipo: string) => {
  if (tipo === "ENTRADA") return <Tag color="green">ENTRADA</Tag>;
  if (tipo === "SALIDA") return <Tag color="red">SALIDA</Tag>;
  return <Tag>{tipo}</Tag>;
};

const diferenciaCell = (diff: number) => {
  if (diff > 0)
    return <span className="tabular-nums font-semibold text-green-600">+{diff}</span>;
  if (diff < 0)
    return <span className="tabular-nums font-semibold text-red-600">{diff}</span>;
  return <span className="tabular-nums">{diff}</span>;
};

const columns: ColumnsType<MovimientoFiremat> = [
  {
    title: "Producto",
    dataIndex: "productoNombre",
    key: "productoNombre",
    width: 220,
    render: (v: string) => (
      <span className="font-medium text-beck-ink">{v}</span>
    ),
  },
  {
    title: "Tipo",
    dataIndex: "tipo",
    key: "tipo",
    width: 90,
    render: (v: string) => tipoTag(v),
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
    title: "Stock anterior",
    dataIndex: "stockAnterior",
    key: "stockAnterior",
    width: 120,
    align: "center",
    render: (v: number) => <span className="tabular-nums">{v}</span>,
  },
  {
    title: "Stock nuevo",
    dataIndex: "stockNuevo",
    key: "stockNuevo",
    width: 110,
    align: "center",
    render: (v: number) => <span className="tabular-nums">{v}</span>,
  },
  {
    title: "Diferencia",
    key: "diferencia",
    width: 95,
    align: "center",
    render: (_, row) => diferenciaCell(row.stockNuevo - row.stockAnterior),
  },
  {
    title: "Motivo",
    dataIndex: "motivo",
    key: "motivo",
    width: 160,
    render: (v: string | null | undefined) =>
      v ?? <span className="text-beck-muted">—</span>,
  },
  {
    title: "Documento",
    dataIndex: "documento",
    key: "documento",
    width: 130,
    render: (v: string | null | undefined) =>
      v ?? <span className="text-beck-muted">—</span>,
  },
  {
    title: "Fecha",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 135,
    defaultSortOrder: "descend",
    sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    render: (v: string) => (
      <span className="tabular-nums text-xs text-beck-muted">
        {formatDateTime(v)}
      </span>
    ),
  },
];

const TIPO_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "ENTRADA", value: "ENTRADA" },
  { label: "SALIDA", value: "SALIDA" },
];

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const FirematMovimientos: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoFiremat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("");
  const [rango, setRango] = useState<RangeValue>(null);
  const [q, setQ] = useState("");

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof firematInventarioAPI.movimientos>[0] = {};
      if (tipo) params.tipo = tipo;
      if (rango?.[0]) params.desde = rango[0].format("YYYY-MM-DD");
      if (rango?.[1]) params.hasta = rango[1].format("YYYY-MM-DD");

      const envelope = await firematInventarioAPI.movimientos(params);
      if (!envelope.success) {
        throw new Error(envelope.message ?? envelope.error ?? "Error");
      }
      setMovimientos(envelope.data ?? []);
    } catch {
      void message.error("Error cargando movimientos");
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, [tipo, rango]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const limpiar = () => {
    setTipo("");
    setRango(null);
    setQ("");
  };

  const hayFiltros = tipo !== "" || rango !== null || q !== "";

  const filtrados = q.trim()
    ? movimientos.filter((m) =>
        m.productoNombre.toLowerCase().includes(q.trim().toLowerCase())
      )
    : movimientos;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="firemat-panel">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="firemat-badge">
              <HistoryOutlined style={{ fontSize: 10 }} />
              <span>Solo lectura</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Movimientos de Inventario
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Historial de cambios de stock en Firemat
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

      {/* Filtros */}
      <section className="firemat-panel p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por producto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            className="w-full sm:w-auto sm:min-w-[180px]"
          />
          <Select
            value={tipo}
            onChange={(v) => setTipo(v as string)}
            options={TIPO_OPTIONS}
            style={{ width: 130 }}
            className="!w-full sm:!w-[130px]"
            placeholder="Tipo"
          />
          <DatePicker.RangePicker
            value={rango}
            onChange={(v) => setRango(v as RangeValue)}
            format="DD-MM-YYYY"
            placeholder={["Desde", "Hasta"]}
            className="!w-full sm:!w-auto"
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
        ) : filtrados.length === 0 ? (
          <div className="py-16">
            <Empty description="No hay movimientos que coincidan con los filtros" />
          </div>
        ) : (
          <Table<MovimientoFiremat>
            dataSource={filtrados}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1150 }}
            rowClassName={(row) =>
              row.tipo === "ENTRADA"
                ? "bg-green-50"
                : row.tipo === "SALIDA"
                  ? "bg-red-50"
                  : ""
            }
            pagination={{
              pageSize: 50,
              showSizeChanger: false,
              showTotal: (total) => `${total} movimientos`,
            }}
          />
        )}
      </section>
    </div>
  );
};

export default FirematMovimientos;
