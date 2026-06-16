import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ClearOutlined,
  FilePdfOutlined,
  InboxOutlined,
  PictureOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  firematInventarioAPI,
  type ImportarPdfInventarioResult,
  type InventarioFirematItem,
  type InventarioFirematResumen,
} from "../../services/api";
import ImportarPdfModal from "./ImportarPdfModal";

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : "-";
};

const formatDateInput = (value: string | null | undefined) => {
  if (!value) return undefined;
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : undefined;
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
    title: "Imagen",
    key: "imagen",
    width: 70,
    align: "center",
    render: (_, row) =>
      row.imagen ? (
        <img
          src={row.imagen}
          alt={row.nombre}
          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            background: "#f5f5f5",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PictureOutlined style={{ color: "#d1d5db" }} />
        </div>
      ),
  },
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
    title: "Stock inicial",
    dataIndex: "stockInicial",
    key: "stockInicial",
    width: 100,
    align: "center",
    render: (v: number | null | undefined) => (
      <span className="tabular-nums">{v ?? 0}</span>
    ),
  },
  {
    title: "Salidas",
    dataIndex: "salidas",
    key: "salidas",
    width: 80,
    align: "center",
    render: (v: number | null | undefined) => (
      <span className="tabular-nums">{v ?? 0}</span>
    ),
  },
  {
    title: "Última salida",
    dataIndex: "fechaUltimaSalida",
    key: "fechaUltimaSalida",
    width: 115,
    render: (v: string | null | undefined) => (
      <span className="tabular-nums text-xs">{formatDate(v)}</span>
    ),
  },
  {
    title: "Entradas",
    dataIndex: "entradas",
    key: "entradas",
    width: 85,
    align: "center",
    render: (v: number | null | undefined) => (
      <span className="tabular-nums">{v ?? 0}</span>
    ),
  },
  {
    title: "Última entrada",
    dataIndex: "fechaUltimaEntrada",
    key: "fechaUltimaEntrada",
    width: 120,
    render: (v: string | null | undefined) => (
      <span className="tabular-nums text-xs">{formatDate(v)}</span>
    ),
  },
  {
    title: "Stock actual",
    dataIndex: "stock",
    key: "stock",
    width: 80,
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

type InventarioFormValues = {
  stockInicial: number;
  salidas: number;
  fechaUltimaSalida?: string;
  entradas: number;
  fechaUltimaEntrada?: string;
  ubicacion?: string;
  activo: boolean;
  motivo?: string;
};

const ModalEditarInventario: React.FC<{
  item: InventarioFirematItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ item, open, onClose, onSaved }) => {
  const [form] = Form.useForm<InventarioFormValues>();
  const [saving, setSaving] = useState(false);
  const stockInicial = Form.useWatch("stockInicial", form) ?? 0;
  const salidas = Form.useWatch("salidas", form) ?? 0;
  const entradas = Form.useWatch("entradas", form) ?? 0;
  const stockActual = stockInicial - salidas + entradas;

  useEffect(() => {
    if (!open || !item) return;
    form.setFieldsValue({
      stockInicial: item.stockInicial ?? 0,
      salidas: item.salidas ?? 0,
      fechaUltimaSalida: formatDateInput(item.fechaUltimaSalida),
      entradas: item.entradas ?? 0,
      fechaUltimaEntrada: formatDateInput(item.fechaUltimaEntrada),
      ubicacion: item.ubicacion ?? undefined,
      activo: item.activo,
      motivo: undefined,
    });
  }, [form, item, open]);

  const guardar = async () => {
    if (!item) return;
    try {
      const values = await form.validateFields();
      const totalCalculado = values.stockInicial - values.salidas + values.entradas;
      if (totalCalculado < 0) {
        void message.error("El total no puede ser negativo");
        return;
      }
      setSaving(true);
      await firematInventarioAPI.actualizar(item.id, {
        stockNuevo: totalCalculado,
        stockInicial: values.stockInicial,
        salidas: values.salidas,
        fechaUltimaSalida: values.fechaUltimaSalida || null,
        entradas: values.entradas,
        fechaUltimaEntrada: values.fechaUltimaEntrada || null,
        ubicacion: values.ubicacion?.trim() || undefined,
        activo: values.activo,
        motivo: values.motivo?.trim() || undefined,
      });
      void message.success("Inventario actualizado");
      onClose();
      onSaved();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      void message.error("No se pudo actualizar el inventario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Editar inventario"
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={saving}
      okButtonProps={{ className: "firemat-action-button" }}
      onCancel={onClose}
      onOk={() => void guardar()}
      destroyOnClose
      width={760}
    >
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="Producto">
            <Input value={item?.nombre ?? ""} disabled />
          </Form.Item>
          <Form.Item label="SKU">
            <Input value={item?.sku ?? "-"} disabled />
          </Form.Item>
          <Form.Item
            name="stockInicial"
            label="Stock inicial"
            rules={[
              { required: true, message: "Stock inicial requerido" },
              { type: "number", min: 0, message: "Stock inicial debe ser >= 0" },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="salidas"
            label="Salidas"
            rules={[
              { required: true, message: "Salidas requeridas" },
              { type: "number", min: 0, message: "Salidas debe ser >= 0" },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="fechaUltimaSalida" label="Fecha última salida">
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="entradas"
            label="Entradas"
            rules={[
              { required: true, message: "Entradas requeridas" },
              { type: "number", min: 0, message: "Entradas debe ser >= 0" },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="fechaUltimaEntrada" label="Fecha última entrada">
            <Input type="date" />
          </Form.Item>
          <Form.Item
            label="Stock actual (total)"
            validateStatus={stockActual < 0 ? "error" : undefined}
            help={stockActual < 0 ? "El total no puede ser negativo" : undefined}
          >
            <InputNumber value={stockActual} precision={0} disabled style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="ubicacion" label="Ubicación">
            <Input placeholder="Ej: Bodega A - Pasillo 3" />
          </Form.Item>
          <Form.Item
            name="activo"
            label="Estado"
            rules={[{ required: true, message: "Estado obligatorio" }]}
          >
            <Select
              options={[
                { label: "Activo", value: true },
                { label: "Inactivo", value: false },
              ]}
            />
          </Form.Item>
          <Form.Item name="motivo" label="Motivo del ajuste" className="col-span-2">
            <Input.TextArea rows={3} placeholder="Describe el motivo del ajuste" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

/* ────────────── Resultado importación PDF inventario ────────────── */
const ResultadoImportInventario: React.FC<{ result: ImportarPdfInventarioResult }> = ({ result }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Actualizados", value: result.actualizados, color: "text-blue-600" },
        { label: "No encontrados", value: result.noEncontrados, color: result.noEncontrados > 0 ? "text-orange-500" : "text-gray-500" },
        { label: "Omitidos", value: result.omitidos, color: "text-gray-500" },
        { label: "Errores", value: result.errores.length, color: result.errores.length > 0 ? "text-red-500" : "text-gray-500" },
      ].map(({ label, value, color }) => (
        <div key={label} className="firemat-kpi-card rounded-xl p-3 flex flex-col gap-0.5">
          <span className="text-xs text-beck-muted">{label}</span>
          <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
        </div>
      ))}
    </div>
    {result.errores.length > 0 && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1">
        <p className="font-semibold">Errores:</p>
        <ul className="list-disc list-inside space-y-0.5">
          {result.errores.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    )}
    {result.advertencias && result.advertencias.length > 0 && (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700 space-y-1">
        <p className="font-semibold">Advertencias:</p>
        <ul className="list-disc list-inside space-y-0.5">
          {result.advertencias.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </div>
    )}
  </div>
);

const FirematInventario: React.FC = () => {
  const [items, setItems] = useState<InventarioFirematItem[]>([]);
  const [resumen, setResumen] = useState<InventarioFirematResumen>(RESUMEN_VACIO);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState<"" | "true" | "false">("");
  const [bajoStock, setBajoStock] = useState<"" | "true">("");
  const [criticidad, setCriticidad] = useState("");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<InventarioFirematItem | null>(null);

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

  const tableColumns: ColumnsType<InventarioFirematItem> = [
    ...columns,
    {
      title: "Acciones",
      key: "acciones",
      width: 90,
      render: (_, row) => (
        <Button size="small" type="link" onClick={() => setItemEditando(row)}>
          Editar
        </Button>
      ),
    },
  ];

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
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => setPdfModalOpen(true)}
            >
              Importar inventario PDF
            </Button>
            <Button
              className="firemat-action-button"
              icon={<ReloadOutlined />}
              onClick={() => void cargar()}
              loading={loading}
            >
              Actualizar
            </Button>
          </div>
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por nombre o descripción"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            className="w-full sm:w-auto sm:min-w-[200px]"
          />
          <Select
            value={activo}
            onChange={(v) => setActivo(v as "" | "true" | "false")}
            options={ESTADO_OPTIONS}
            style={{ width: 130 }}
            className="!w-full sm:!w-[130px]"
            placeholder="Estado"
          />
          <Select
            value={bajoStock}
            onChange={(v) => setBajoStock(v as "" | "true")}
            options={STOCK_OPTIONS}
            style={{ width: 150 }}
            className="!w-full sm:!w-[150px]"
            placeholder="Stock"
          />
          <Select
            value={criticidad}
            onChange={(v) => setCriticidad(v as string)}
            options={CRITICIDAD_OPTIONS}
            style={{ width: 130 }}
            className="!w-full sm:!w-[130px]"
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
            columns={tableColumns}
            rowKey="id"
            size="small"
            scroll={{ x: 1370 }}
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

      <ImportarPdfModal<ImportarPdfInventarioResult>
        open={pdfModalOpen}
        titulo="Importar inventario PDF"
        onClose={() => setPdfModalOpen(false)}
        onImportado={() => void cargar()}
        importar={firematInventarioAPI.importarInventarioPdf}
        renderResultado={(result) => <ResultadoImportInventario result={result} />}
      />

      <ModalEditarInventario
        item={itemEditando}
        open={itemEditando !== null}
        onClose={() => setItemEditando(null)}
        onSaved={() => void cargar()}
      />
    </div>
  );
};

export default FirematInventario;
