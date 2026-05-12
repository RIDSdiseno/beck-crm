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
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  firematCategoriasAPI,
  firematProductosAPI,
  type CategoriaFiremat,
  type ProductoFiremat,
  type ProductoFirematPayload,
} from "../../services/api";

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

const CRITICIDAD_OPTIONS = [
  { label: "Baja", value: "baja" },
  { label: "Media", value: "media" },
  { label: "Alta", value: "alta" },
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
  precio: number;
  stockInicial?: number;
  minStock: number;
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
        precio: producto.precio,
        minStock: producto.minStock,
        ubicacion: producto.ubicacion ?? undefined,
        criticidad: producto.criticidad,
        activo: producto.activo,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ activo: true, criticidad: "baja", stockInicial: 0, minStock: 0, precio: 0 });
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
        minStock: values.minStock,
        ubicacion: values.ubicacion || null,
        criticidad: values.criticidad,
        activo: values.activo,
      };
      if (isCreate) {
        payload.stockInicial = values.stockInicial ?? 0;
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
      width={600}
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
            name="precio"
            label="Precio"
            rules={[
              { required: true, message: "Precio requerido" },
              { type: "number", min: 0, message: "Precio debe ser >= 0" },
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(v) => (Number(v?.replace(/\$\s?|\./g, "") ?? 0) as 0)}
            />
          </Form.Item>

          {isCreate && (
            <Form.Item
              name="stockInicial"
              label="Stock inicial"
              rules={[{ type: "number", min: 0, message: "Stock inicial debe ser >= 0" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          )}

          <Form.Item
            name="minStock"
            label="Stock mínimo"
            rules={[{ type: "number", min: 0, message: "Stock mínimo debe ser >= 0" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
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

/* ────────────── Componente principal ────────────── */
const FirematProductos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState<"" | "true" | "false">("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [seleccionado, setSeleccionado] = useState<ProductoFiremat | null>(null);

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
      title: "Producto",
      key: "producto",
      width: 220,
      render: (_, row) => {
        const bajo = isBajoStock(row);
        return (
          <div className={bajo ? "border-l-2 border-red-400 pl-2" : ""}>
            <p className="font-medium text-beck-ink leading-tight">{row.nombre}</p>
            {row.sku && (
              <p className="text-xs text-beck-muted mt-0.5">{row.sku}</p>
            )}
            {row.descripcion && (
              <p className="text-xs text-beck-muted mt-0.5 leading-snug line-clamp-2">
                {row.descripcion}
              </p>
            )}
          </div>
        );
      },
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
      render: (v: string | null | undefined) =>
        v ? <span className="font-mono text-xs">{v}</span> : <span className="text-beck-muted">—</span>,
    },
    {
      title: "Categoría",
      dataIndex: "categoria",
      key: "categoria",
      width: 120,
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
      width: 75,
      align: "center",
      render: (v: number) => <span className="tabular-nums">{v ?? 0}</span>,
    },
    {
      title: "Reservado",
      dataIndex: "stockReservado",
      key: "stockReservado",
      width: 85,
      align: "center",
      render: (v: number) => <span className="tabular-nums">{v ?? 0}</span>,
    },
    {
      title: "Disponible",
      key: "stockDisponible",
      width: 90,
      align: "center",
      render: (_, row) => {
        const disp = calcDisponible(row);
        const bajo = disp <= (row.minStock ?? 0);
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
      title: "Stock mín.",
      dataIndex: "minStock",
      key: "minStock",
      width: 85,
      align: "center",
      render: (v: number) => <span className="tabular-nums">{v ?? 0}</span>,
    },
    {
      title: "Criticidad",
      dataIndex: "criticidad",
      key: "criticidad",
      width: 95,
      render: (v: string) => {
        const lower = (v ?? "").toLowerCase();
        return (
          <Tag color={criticidadColor[lower] ?? "default"}>
            {v ? v.charAt(0).toUpperCase() + v.slice(1) : "—"}
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
      width: 85,
      render: (v: boolean) =>
        v ? <Tag color="green">Activo</Tag> : <Tag color="default">Inactivo</Tag>,
    },
    {
      title: "Creado",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 100,
      render: (v: string) => (
        <span className="tabular-nums text-xs text-beck-muted">{formatDate(v)}</span>
      ),
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
          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={abrirCrear}
            >
              Nuevo producto
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
        <div className="flex flex-wrap items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por nombre o SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            value={activo}
            onChange={(v) => setActivo(v as "" | "true" | "false")}
            options={ESTADO_FILTER_OPTIONS}
            style={{ width: 140 }}
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
              showSizeChanger: false,
              showTotal: (total) => `${total} productos`,
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
    </div>
  );
};

export default FirematProductos;
