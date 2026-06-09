import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
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
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  firematCategoriasAPI,
  firematProductosAPI,
  type CategoriaFiremat,
  type ImportarPdfProductosResult,
  type ProductoFiremat,
  type ProductoFirematPayload,
} from "../../services/api";
import ImportarPdfModal from "./ImportarPdfModal";

const formatCLP = (value: number | null | undefined): string => {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
};

const formatUSD = (value: number | null | undefined): string => {
  if (value == null) return "-";
  return `USD ${value.toFixed(2)}`;
};

const CRITICIDAD_OPTIONS = [
  { label: "Baja", value: "baja" },
  { label: "Media", value: "media" },
  { label: "Alta", value: "alta" },
];

const DISPONIBILIDAD_OPTIONS = [
  { label: "En stock", value: "En stock" },
  { label: "A pedido", value: "A pedido" },
  { label: "Sin stock", value: "Sin stock" },
];

const ESTADO_FILTER_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Activos", value: "true" },
  { label: "Inactivos", value: "false" },
];

type ModalMode = "crear" | "editar" | "ver" | null;

type FormValues = {
  nombre: string;
  sku?: string;
  descripcion?: string;
  categoriaId?: number;
  disponibilidad: string;
  formato?: string;
  cantidadCaja?: string;
  precioUsd?: number;
  precio: number;
  precioSugerido?: number;
  stockMinimo: number;
  ubicacion?: string;
  criticidad: string;
  activo: boolean;
};

const calcDisponible = (row: ProductoFiremat): number =>
  (row.stock ?? 0) - (row.stockReservado ?? 0);

const isBajoStock = (row: ProductoFiremat): boolean => {
  const disp = calcDisponible(row);
  return disp <= (row.minStock ?? 0);
};

/* ────────────── Modal producto ────────────── */
const ModalProducto: React.FC<{
  mode: ModalMode;
  producto: ProductoFiremat | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ mode, producto, open, onClose, onSaved }) => {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaFiremat[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const isView = mode === "ver";
  const isEdit = mode === "editar";
  const isCreate = mode === "crear";

  useEffect(() => {
    if (!open) return;

    setLoadingCats(true);
    firematCategoriasAPI.listar()
      .then((data) => setCategorias(data))
      .catch(() => setCategorias([]))
      .finally(() => setLoadingCats(false));

    if (producto && (isEdit || isView)) {
      form.setFieldsValue({
        nombre: producto.nombre,
        sku: producto.sku ?? undefined,
        descripcion: producto.descripcion ?? undefined,
        categoriaId: producto.categoriaId ?? undefined,
        disponibilidad: producto.disponibilidad ?? undefined,
        formato: producto.formato ?? undefined,
        cantidadCaja: producto.cantidadCaja ?? undefined,
        precioUsd: producto.precioUsd ?? undefined,
        precio: producto.precioClp ?? producto.precio,
        precioSugerido: producto.precioSugerido ?? undefined,
        stockMinimo: producto.stockMinimo ?? producto.minStock,
        ubicacion: producto.ubicacion ?? undefined,
        criticidad: producto.criticidad,
        activo: producto.activo,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        activo: true,
        criticidad: "baja",
        disponibilidad: "En stock",
        stockMinimo: 0,
        precio: 0,
      });
    }
  }, [open, producto, mode, form, isEdit, isView]);

  const sinCategorias = !loadingCats && categorias.length === 0;

  const handleOk = async () => {
    if (isView) { onClose(); return; }
    if (sinCategorias) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: ProductoFirematPayload = {
        nombre: values.nombre,
        sku: values.sku || null,
        descripcion: values.descripcion || null,
        categoriaId: values.categoriaId!,
        precio: values.precio,
        precioUsd: values.precioUsd ?? null,
        precioSugerido: values.precioSugerido ?? null,
        disponibilidad: values.disponibilidad,
        formato: values.formato || null,
        cantidadCaja: values.cantidadCaja?.trim() || null,
        stockMinimo: values.stockMinimo,
        ubicacion: values.ubicacion || null,
        criticidad: values.criticidad,
        activo: values.activo,
      };
      if (isCreate) {
        await firematProductosAPI.crear(payload);
        void message.success("Producto creado");
      } else if (isEdit && producto) {
        await firematProductosAPI.editar(producto.id, payload);
        void message.success("Producto actualizado");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      void message.error("No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const title = isCreate ? "Nuevo producto" : isEdit ? "Editar producto" : "Detalle producto";

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      onOk={handleOk}
      okText={isView ? "Cerrar" : "Guardar"}
      okButtonProps={{ className: "firemat-action-button" }}
      cancelButtonProps={isView ? { style: { display: "none" } } : undefined}
      confirmLoading={saving}
      width={760}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        disabled={isView}
        size="middle"
      >
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item
            name="nombre"
            label="Nombre producto"
            rules={[{ required: true, message: "Nombre requerido" }]}
            className="col-span-2"
          >
            <Input placeholder='Ej: Tubo galvanizado 1"' />
          </Form.Item>

          <Form.Item
            name="sku"
            label="SKU / Código producto"
            rules={[{ required: true, message: "SKU requerido" }]}
          >
            <Input placeholder="Ej: TUB-GAL-001" />
          </Form.Item>

          <Form.Item
            name="categoriaId"
            label="Categoría"
            rules={[{ required: true, message: "Categoría obligatoria" }]}
          >
            <Select
              showSearch
              loading={loadingCats}
              placeholder={sinCategorias ? "No existen categorías disponibles" : "Seleccionar categoría"}
              filterOption={(input, opt) =>
                (String(opt?.label ?? "")).toLowerCase().includes(input.toLowerCase())
              }
              disabled={isView || sinCategorias}
              options={categorias.map((c) => ({ label: c.nombre, value: c.id }))}
            />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción" className="col-span-2">
            <Input.TextArea rows={2} placeholder="Descripción opcional" />
          </Form.Item>

          <Form.Item
            name="disponibilidad"
            label="Disponibilidad"
            rules={[{ required: true, message: "Disponibilidad obligatoria" }]}
          >
            <Select options={DISPONIBILIDAD_OPTIONS} />
          </Form.Item>

          <Form.Item name="formato" label="Formato">
            <Input placeholder="Ej: Caja, unidad, rollo" />
          </Form.Item>

          <Form.Item
            name="cantidadCaja"
            label="Cantidad caja"
          >
            <Input placeholder="Ej: 12/CS, 24 UND, Caja 20" />
          </Form.Item>

          <Form.Item
            name="precioUsd"
            label="Precio USD"
            rules={[{ type: "number", min: 0, message: "Precio USD debe ser >= 0" }]}
          >
            <InputNumber min={0} precision={2} prefix="USD" style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="precio"
            label="Precio CLP"
            rules={[
              { required: true, message: "Precio CLP requerido" },
              { type: "number", min: 0, message: "Precio CLP debe ser >= 0" },
            ]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(v) => (Number(v?.replace(/\$\s?|\./g, "") ?? 0) as 0)}
            />
          </Form.Item>

          <Form.Item
            name="precioSugerido"
            label="Precio sugerido"
            rules={[{ type: "number", min: 0, message: "Precio sugerido debe ser >= 0" }]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(v) => (Number(v?.replace(/\$\s?|\./g, "") ?? 0) as 0)}
            />
          </Form.Item>

          <Form.Item
            name="stockMinimo"
            label="Stock mínimo"
            rules={[
              { required: true, message: "Stock mínimo requerido" },
              { type: "number", min: 0, message: "Stock mínimo debe ser >= 0" },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="ubicacion" label="Ubicación / Bodega">
            <Input placeholder="Ej: Bodega A - Pasillo 3" />
          </Form.Item>

          <Form.Item
            name="criticidad"
            label="Criticidad"
            rules={[{ required: true, message: "Criticidad obligatoria" }]}
          >
            <Select options={CRITICIDAD_OPTIONS} />
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
        </div>
      </Form>
    </Modal>
  );
};

/* ────────────── Resultado importación PDF productos ────────────── */
const ResultadoImportProductos: React.FC<{ result: ImportarPdfProductosResult }> = ({ result }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Creados", value: result.creados, color: "text-green-600" },
        { label: "Actualizados", value: result.actualizados, color: "text-blue-600" },
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

/* ────────────── Componente principal ────────────── */
const FirematProductos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState<"" | "true" | "false">("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [seleccionado, setSeleccionado] = useState<ProductoFiremat | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params: { q?: string; activo?: boolean } = {};
      if (q.trim()) params.q = q.trim();
      if (activo !== "") params.activo = activo === "true";
      const result = await firematProductosAPI.listar(params);
      setProductos(result.data);
      setTotal(result.total);
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

  const abrirCrear = () => {
    setSeleccionado(null);
    setModalMode("crear");
  };

  const abrirEditar = (row: ProductoFiremat) => {
    setSeleccionado(row);
    setModalMode("editar");
  };

  const abrirVer = (row: ProductoFiremat) => {
    setSeleccionado(row);
    setModalMode("ver");
  };

  const cerrarModal = () => {
    setModalMode(null);
    setSeleccionado(null);
  };

  const handleToggleEstado = async (row: ProductoFiremat) => {
    try {
      await firematProductosAPI.toggleEstado(row.id, !row.activo);
      void message.success(`Producto ${!row.activo ? "activado" : "desactivado"}`);
      void cargar();
    } catch {
      void message.error("No se pudo cambiar el estado");
    }
  };

  const hayFiltros = q !== "" || activo !== "";

  const columns: ColumnsType<ProductoFiremat> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
      render: (v: string | null | undefined) =>
        v ? <span className="font-mono text-xs">{v}</span> : <span className="text-beck-muted">—</span>,
    },
    {
      title: "Producto",
      key: "producto",
      width: 240,
      render: (_, row) => {
        const bajo = isBajoStock(row);
        return (
          <div className={bajo ? "border-l-2 border-red-400 pl-2" : ""}>
            <p className="font-medium text-beck-ink leading-tight">{row.nombre}</p>
            {row.descripcion && (
              <p className="text-xs text-beck-muted mt-0.5 leading-snug">
                {row.descripcion}
              </p>
            )}
          </div>
        );
      },
    },
    {
      title: "Disponibilidad",
      dataIndex: "disponibilidad",
      key: "disponibilidad",
      width: 120,
      render: (v: string | null | undefined) =>
        v ?? <span className="text-beck-muted">—</span>,
    },
    {
      title: "Formato",
      dataIndex: "formato",
      key: "formato",
      width: 100,
      render: (v: string | null | undefined) =>
        v ?? <span className="text-beck-muted">—</span>,
    },
    {
      title: "Cant. caja",
      dataIndex: "cantidadCaja",
      key: "cantidadCaja",
      width: 90,
      align: "center",
      render: (v: string | null | undefined) =>
        v?.trim() ? <span>{v}</span> : <span className="text-beck-muted">—</span>,
    },
    {
      title: "Precio USD",
      dataIndex: "precioUsd",
      key: "precioUsd",
      width: 110,
      align: "right",
      render: (v: number | null | undefined) => (
        <span className="tabular-nums">{formatUSD(v)}</span>
      ),
    },
    {
      title: "Precio CLP",
      key: "precioClp",
      width: 120,
      align: "right",
      render: (_, row) => (
        <span className="font-medium tabular-nums">
          {formatCLP(row.precioClp ?? row.precio)}
        </span>
      ),
    },
    {
      title: "Precio sugerido",
      dataIndex: "precioSugerido",
      key: "precioSugerido",
      width: 130,
      align: "right",
      render: (v: number | null | undefined) => (
        <span className="tabular-nums">{formatCLP(v)}</span>
      ),
    },
    {
      title: "Stock",
      key: "stockActual",
      width: 75,
      align: "center",
      render: (_, row) => (
        <span className="tabular-nums">{row.stockActual ?? row.stock ?? 0}</span>
      ),
    },
    {
      title: "Reservado",
      dataIndex: "stockReservado",
      key: "stockReservado",
      width: 90,
      align: "center",
      render: (v: number) => <span className="tabular-nums">{v ?? 0}</span>,
    },
    {
      title: "Disponible",
      key: "stockDisponible",
      width: 90,
      align: "center",
      render: (_, row) => {
        const disp = row.stockDisponible ?? calcDisponible(row);
        const bajo = disp <= (row.stockMinimo ?? row.minStock ?? 0);
        return bajo ? (
          <Tag color="red" className="tabular-nums font-semibold">
            {disp}
          </Tag>
        ) : (
          <span className="tabular-nums">{disp}</span>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "activo",
      key: "activo",
      width: 85,
      render: (v: boolean) =>
        v ? <Tag color="green">Activo</Tag> : <Tag color="default">Inactivo</Tag>,
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 160,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => abrirVer(row)}
            title="Ver detalle"
          />
          <Button
            size="small"
            type="link"
            onClick={() => abrirEditar(row)}
            className="px-1"
          >
            Editar
          </Button>
          <Popconfirm
            title={row.activo ? "¿Desactivar producto?" : "¿Activar producto?"}
            onConfirm={() => void handleToggleEstado(row)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" type="link" danger={row.activo} className="px-1">
              {row.activo ? "Desactivar" : "Activar"}
            </Button>
          </Popconfirm>
        </div>
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
              <AppstoreOutlined style={{ fontSize: 10 }} />
              <span>Maestro editable</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Maestro de productos Firemat
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={abrirCrear}
            >
              Nuevo producto
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => setPdfModalOpen(true)}
            >
              Importar lista de precios PDF
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

      {/* Filtros */}
      <section className="firemat-panel p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por nombre o SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            className="w-full sm:w-auto sm:min-w-[200px]"
          />
          <Select
            value={activo}
            onChange={(v) => setActivo(v as "" | "true" | "false")}
            options={ESTADO_FILTER_OPTIONS}
            style={{ width: 140 }}
            className="!w-full sm:!w-[140px]"
          />
          {hayFiltros && (
            <Button icon={<ClearOutlined />} onClick={limpiar} size="middle">
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
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 25,
              total,
              showSizeChanger: false,
              showTotal: () => `${total} productos`,
            }}
          />
        )}
      </section>

      <ModalProducto
        mode={modalMode}
        producto={seleccionado}
        open={modalMode !== null}
        onClose={cerrarModal}
        onSaved={() => void cargar()}
      />

      <ImportarPdfModal<ImportarPdfProductosResult>
        open={pdfModalOpen}
        titulo="Importar lista de precios PDF"
        onClose={() => setPdfModalOpen(false)}
        onImportado={() => void cargar()}
        importar={firematProductosAPI.importarListaPreciosPdf}
        renderResultado={(result) => <ResultadoImportProductos result={result} />}
      />
    </div>
  );
};

export default FirematProductos;
