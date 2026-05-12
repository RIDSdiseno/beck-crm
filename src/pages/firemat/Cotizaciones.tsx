import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ClearOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  firematCotizacionesAPI,
  firematProductosAPI,
  type FirematCotizacion,
  type FirematCotizacionEstado,
  type FirematCotizacionPayload,
  type FirematCotizacionTipoCliente,
  type FirematCotizacionesResumen,
  type ProductoFiremat,
} from "../../services/api";
import { useAuth } from "../../context/useAuth";

const { RangePicker } = DatePicker;

type ModalMode = "crear" | "editar" | "ver";

type LineaForm = {
  productoId?: number | string;
  cantidad?: number;
  precioUnitario?: number;
  descuentoPct?: number;
  observacion?: string | null;
};

type CotizacionFormValues = {
  cliente: string;
  contacto?: string;
  tipoCliente: FirematCotizacionTipoCliente;
  responsable?: string;
  fechaVencimiento?: Dayjs | null;
  fechaSeguimiento?: Dayjs | null;
  observaciones?: string;
  lineas: LineaForm[];
};

type FirematCotizacionConDetalles = FirematCotizacion & {
  detalles?: FirematCotizacion["lineas"];
};

const ESTADOS: Array<{ label: string; value: FirematCotizacionEstado; color: string }> = [
  { label: "Borrador", value: "BORRADOR", color: "default" },
  { label: "Enviada", value: "ENVIADA", color: "blue" },
  { label: "Seguimiento", value: "SEGUIMIENTO", color: "gold" },
  { label: "Orden confirmada", value: "ORDEN_CONFIRMADA", color: "cyan" },
  { label: "Ganada", value: "GANADA", color: "green" },
  { label: "Perdida", value: "PERDIDA", color: "red" },
  { label: "Postergada", value: "POSTERGADA", color: "purple" },
];

const TIPO_CLIENTE_OPTIONS: Array<{
  label: string;
  value: FirematCotizacionTipoCliente;
}> = [
  { label: "Cliente final", value: "CLIENTE_FINAL" },
  { label: "Broker", value: "BROKER" },
  { label: "Ferretería", value: "FERRETERIA" },
  { label: "Redistribuidor", value: "REDISTRIBUIDOR" },
  { label: "Instalador", value: "INSTALADOR" },
  { label: "Comisionista", value: "COMISIONISTA" },
  { label: "Recompra", value: "RECOMPRA" },
];

const RESUMEN_VACIO: FirematCotizacionesResumen = {
  totalCotizaciones: 0,
  borradores: 0,
  enviadas: 0,
  ganadas: 0,
  montoTotal: 0,
};

const formatCLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD-MM-YYYY") : "—";
};

const getEstadoLabel = (estado: string) =>
  ESTADOS.find((item) => item.value === estado)?.label ?? estado;

const getEstadoColors = (estado: string) => {
  if (estado === "BORRADOR") return { backgroundColor: "#fef3c7", color: "#92400e" };
  if (estado === "ENVIADA") return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
  if (estado === "SEGUIMIENTO") return { backgroundColor: "#fef9c3", color: "#854d0e" };
  if (estado === "ORDEN_CONFIRMADA") return { backgroundColor: "#cffafe", color: "#155e75" };
  if (estado === "GANADA") return { backgroundColor: "#dcfce7", color: "#166534" };
  if (estado === "PERDIDA") return { backgroundColor: "#fee2e2", color: "#b91c1c" };
  if (estado === "POSTERGADA") return { backgroundColor: "#f3e8ff", color: "#6b21a8" };
  return { backgroundColor: "#e5e7eb", color: "#4b5563" };
};

const getLineas = (cotizacion: FirematCotizacionConDetalles) =>
  cotizacion.detalles ?? cotizacion.lineas ?? cotizacion.detalle ?? [];

const getStableProductoValue = (producto: ProductoFiremat, index: number) => {
  if (producto.id) return producto.id;
  return `producto-${index}`;
};

const getCotizacionFecha = (cotizacion: FirematCotizacion) =>
  cotizacion.fechaCotizacion ?? cotizacion.fecha ?? cotizacion.createdAt ?? null;

const getCotizacionVencimiento = (cotizacion: FirematCotizacion) =>
  cotizacion.fechaVencimiento ?? cotizacion.vencimiento ?? null;

const calculateLineSubtotal = (linea: LineaForm) => {
  const cantidad = Number(linea.cantidad || 0);
  const precio = Number(linea.precioUnitario || 0);
  const descuentoPct = Number(linea.descuentoPct || 0);
  return Math.round(cantidad * precio * (1 - descuentoPct / 100));
};

const calculateTotals = (lineas: LineaForm[] = []) => {
  const subtotal = lineas.reduce(
    (acc, linea) => acc + calculateLineSubtotal(linea),
    0
  );
  const descuento = lineas.reduce((acc, linea) => {
    const bruto = Number(linea.cantidad || 0) * Number(linea.precioUnitario || 0);
    return acc + Math.round(bruto * (Number(linea.descuentoPct || 0) / 100));
  }, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  return { subtotal, descuento, iva, total };
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

type ResumenCardProps = {
  label: string;
  value: string | number;
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
      {value}
    </p>
  </div>
);

const FirematCotizaciones: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm<CotizacionFormValues>();
  const lineasWatch = Form.useWatch("lineas", form) ?? [];

  const canCreate = user?.rol === "Administrador" || user?.rol === "Vendedor";
  const canEdit = canCreate;
  const canDelete = user?.rol === "Administrador";

  const [cotizaciones, setCotizaciones] = useState<FirematCotizacion[]>([]);
  const [resumen, setResumen] =
    useState<FirematCotizacionesResumen>(RESUMEN_VACIO);
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("crear");
  const [selected, setSelected] = useState<FirematCotizacion | null>(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<FirematCotizacionEstado | "">("");
  const [rango, setRango] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);

  const productMap = useMemo(
    () =>
      new Map(
        productos.map((producto, index) => [
          getStableProductoValue(producto, index),
          producto,
        ])
      ),
    [productos]
  );
  const productoOptions = useMemo(
    () =>
      productos.map((producto, index) => {
        const stableValue = getStableProductoValue(producto, index);
        return {
          key: `${stableValue}-${index}`,
          value: stableValue,
          label: `${producto.nombre} · disp. ${producto.stockDisponible}`,
        };
      }),
    [productos]
  );
  const totals = useMemo(() => calculateTotals(lineasWatch), [lineasWatch]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof firematCotizacionesAPI.listar>[0] = {};
      if (q.trim()) params.q = q.trim();
      if (estado) params.estado = estado;
      if (rango[0]) params.desde = rango[0].format("YYYY-MM-DD");
      if (rango[1]) params.hasta = rango[1].format("YYYY-MM-DD");

      const [cotizacionesResponse, productosResponse] = await Promise.all([
        firematCotizacionesAPI.listar(params),
        firematProductosAPI.listar({ activo: true }),
      ]);

      setCotizaciones(cotizacionesResponse.data);
      setResumen(cotizacionesResponse.resumen);
      setProductos(productosResponse);
    } catch {
      void message.error("No se pudieron cargar las cotizaciones Firemat");
      setCotizaciones([]);
      setResumen(RESUMEN_VACIO);
    } finally {
      setLoading(false);
    }
  }, [estado, q, rango]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const limpiar = () => {
    setQ("");
    setEstado("");
    setRango([null, null]);
  };

  const openCrear = () => {
    setSelected(null);
    setModalMode("crear");
    form.resetFields();
    form.setFieldsValue({
      tipoCliente: "CLIENTE_FINAL",
      lineas: [{ cantidad: 1, descuentoPct: 0 }],
    });
    setModalOpen(true);
  };

  const openCotizacion = async (record: FirematCotizacion, mode: ModalMode) => {
    try {
      setModalMode(mode);
      setModalOpen(true);
      const detalle = await firematCotizacionesAPI.obtener(record.id);
      console.log("DETALLE COTIZACION FIREMAT", detalle);
      console.log("DETALLES/LINEAS MAPPEADAS", getLineas(detalle));
      const lineasDetalle = getLineas(detalle).map((linea) => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad || 1),
        precioUnitario: Number(linea.precioUnitario || 0),
        descuentoPct: Number(linea.descuentoPct || 0),
      }));
      setSelected(detalle);
      form.setFieldsValue({
        cliente: detalle.cliente,
        contacto: detalle.contacto ?? "",
        tipoCliente:
          (detalle.tipoCliente as FirematCotizacionTipoCliente) ??
          "CLIENTE_FINAL",
        responsable: detalle.responsable ?? "",
        fechaVencimiento: detalle.fechaVencimiento
          ? dayjs(detalle.fechaVencimiento)
          : null,
        fechaSeguimiento: detalle.fechaSeguimiento
          ? dayjs(detalle.fechaSeguimiento)
          : null,
        observaciones: detalle.observaciones ?? "",
        lineas: lineasDetalle,
      });
    } catch {
      setModalOpen(false);
      void message.error("No se pudo cargar la cotización");
    }
  };

  const buildPayload = (values: CotizacionFormValues): FirematCotizacionPayload => {
    const detalles = (values.lineas ?? [])
      .filter((linea) => linea.productoId && Number(linea.cantidad || 0) > 0)
      .map((linea) => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad || 0),
        precioUnitario: Number(linea.precioUnitario || 0),
        descuentoPct: Number(linea.descuentoPct || 0),
        observacion: linea.observacion?.trim() || null,
      }));
    const nextTotals = calculateTotals(values.lineas ?? []);

    return {
      cliente: values.cliente.trim(),
      contacto: values.contacto?.trim() || null,
      tipoCliente: values.tipoCliente,
      responsable: values.responsable?.trim() || null,
      fechaVencimiento: values.fechaVencimiento?.format("YYYY-MM-DD") ?? null,
      fechaSeguimiento: values.fechaSeguimiento?.format("YYYY-MM-DD") ?? null,
      observaciones: values.observaciones?.trim() || null,
      subtotal: nextTotals.subtotal,
      descuento: nextTotals.descuento,
      impuesto: nextTotals.iva,
      total: nextTotals.total,
      detalles,
    };
  };

  const handleSubmit = async (values: CotizacionFormValues) => {
    if (modalMode === "ver") return;

    console.log("SUBMIT FIREMAT", values);

    const payload = buildPayload(values);
    if (!payload.detalles.length) {
      void message.error("Agrega al menos un producto a la cotización");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "editar" && selected) {
        await firematCotizacionesAPI.actualizar(selected.id, payload);
        void message.success("Cotización actualizada");
      } else {
        console.log("PAYLOAD FIREMAT", payload);
        await firematCotizacionesAPI.crear(payload);
        void message.success("Cotización creada");
      }

      setModalOpen(false);
      setSelected(null);
      form.resetFields();
      await cargar();
    } catch {
      void message.error("No se pudo guardar la cotización");
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async (
    record: FirematCotizacion,
    nextEstado: FirematCotizacionEstado
  ) => {
    try {
      await firematCotizacionesAPI.cambiarEstado(record.id, nextEstado);
      setSelected((current) =>
        current?.id === record.id ? { ...current, estado: nextEstado } : current
      );
      void message.success("Estado actualizado");
      await cargar();
    } catch {
      void message.error("No se pudo cambiar el estado");
    }
  };

  const handleEliminar = async (record: FirematCotizacion) => {
    try {
      await firematCotizacionesAPI.eliminar(record.id);
      void message.success("Cotización eliminada");
      await cargar();
    } catch {
      void message.error("No se pudo eliminar la cotización");
    }
  };

  const handlePdf = async (record: FirematCotizacion) => {
    try {
      const blob = await firematCotizacionesAPI.descargarPdf(record.id);
      downloadBlob(blob, `cotizacion-firemat-${record.id}.pdf`);
    } catch {
      void message.error("No se pudo descargar el PDF");
    }
  };

  const columns: ColumnsType<FirematCotizacion> = [
    {
      title: "Nro.",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (value) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      title: "Fecha cotización",
      key: "fecha",
      width: 140,
      render: (_, row) => (
        <span className="text-xs tabular-nums">{formatDate(getCotizacionFecha(row))}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 140,
      render: (estado: string) => {
        const colors = getEstadoColors(estado);

        return (
          <span
            style={colors}
            className="inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-medium"
          >
            {getEstadoLabel(estado)}
          </span>
        );
      },
    },
    {
      title: "Fecha de vencimiento",
      key: "vencimiento",
      width: 160,
      render: (_, row) => (
        <span className="text-xs tabular-nums">
          {formatDate(getCotizacionVencimiento(row))}
        </span>
      ),
    },
    {
      title: "Cliente",
      key: "cliente",
      width: 220,
      render: (_, row) => (
        <div>
          <p className="font-medium leading-tight text-beck-ink">{row.cliente}</p>
          {row.contacto && (
            <p className="mt-0.5 text-xs text-beck-muted">{row.contacto}</p>
          )}
        </div>
      ),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 130,
      align: "right",
      render: (value: number) => (
        <span className="font-semibold tabular-nums">{formatCLP(value)}</span>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 210,
      fixed: "right",
      render: (_, record) => (
        <Space size={4} wrap>
          <Tooltip title="Ver">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => void openCotizacion(record, "ver")}
            />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Editar">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => void openCotizacion(record, "editar")}
              />
            </Tooltip>
          )}
          <Tooltip title="PDF">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => void handlePdf(record)}
            />
          </Tooltip>
          {canDelete && (
            <Popconfirm
              title="Eliminar cotización"
              description="Esta acción no se puede deshacer."
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleEliminar(record)}
            >
              <Tooltip title="Eliminar">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const hayFiltros = q !== "" || estado !== "" || rango[0] !== null || rango[1] !== null;
  const modalReadOnly = modalMode === "ver";

  return (
    <div className="space-y-5">
      <section className="firemat-panel">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="firemat-badge">
              <FileTextOutlined style={{ fontSize: 10 }} />
              <span>Propuestas comerciales</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Cotizaciones Firemat
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Gestión de cotizaciones de productos Firemat con stock, totales y seguimiento.
            </p>
          </div>
          <Space wrap>
            <Button
              className="firemat-action-button"
              icon={<ReloadOutlined />}
              onClick={() => void cargar()}
              loading={loading}
            >
              Actualizar
            </Button>
            {canCreate && (
              <Button className="firemat-action-button" type="primary" icon={<PlusOutlined />} onClick={openCrear}>
                Nueva cotización
              </Button>
            )}
          </Space>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ResumenCard label="Total cotizaciones" value={resumen.totalCotizaciones} />
        <ResumenCard label="Borradores" value={resumen.borradores} />
        <ResumenCard label="Enviadas" value={resumen.enviadas} />
        <ResumenCard label="Ganadas" value={resumen.ganadas} />
        <ResumenCard label="Monto total" value={formatCLP(resumen.montoTotal)} highlight />
      </div>

      <section className="firemat-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por cliente, número o contacto"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            allowClear
            style={{ width: 300 }}
          />
          <Select
            value={estado}
            onChange={(value) => setEstado(value)}
            options={[
              { label: "Todos los estados", value: "" },
              ...ESTADOS.map((item) => ({ label: item.label, value: item.value })),
            ]}
            style={{ width: 190 }}
          />
          <RangePicker
            value={rango}
            onChange={(values) =>
              setRango(values ? [values[0] ?? null, values[1] ?? null] : [null, null])
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

      <section className="firemat-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : cotizaciones.length === 0 ? (
          <div className="py-16">
            <Empty description="No hay cotizaciones que coincidan con los filtros" />
          </div>
        ) : (
          <Table<FirematCotizacion>
            dataSource={cotizaciones}
            columns={columns}
            rowKey={(record, index) =>
              `${record.id ?? "cotizacion"}-${index ?? 0}`
            }
            size="small"
            scroll={{ x: 1150 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `${total} cotizaciones`,
            }}
            onRow={(record) => ({
              onDoubleClick: () => void openCotizacion(record, "ver"),
            })}
          />
        )}
      </section>

      <Modal
        title={
          modalMode === "crear"
            ? "Nueva cotización Firemat"
            : modalMode === "editar"
            ? `Editar cotización #${selected?.id ?? ""}`
            : `Cotización #${selected?.id ?? ""}`
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelected(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={modalMode === "crear" ? "Crear" : "Guardar"}
        cancelText={modalReadOnly ? "Cerrar" : "Cancelar"}
        confirmLoading={saving}
        okButtonProps={{ hidden: modalReadOnly, className: "firemat-action-button" }}
        width={980}
        destroyOnClose
      >
        {modalMode === "editar" && selected && canEdit && (
          <div className="mb-4 max-w-xs">
            <label className="mb-1 block text-sm font-medium text-beck-ink">
              Estado
            </label>
            <Select<FirematCotizacionEstado>
              value={selected.estado}
              options={ESTADOS.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              onChange={(next) => void handleCambiarEstado(selected, next)}
              className="w-full"
            />
          </div>
        )}

        <Form<CotizacionFormValues>
          form={form}
          layout="vertical"
          disabled={modalReadOnly}
          onFinish={handleSubmit}
          initialValues={{
            tipoCliente: "CLIENTE_FINAL",
            lineas: [{ cantidad: 1, descuentoPct: 0 }],
          }}
        >
          <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
            <Form.Item
              name="cliente"
              label="Cliente"
              rules={[{ required: true, message: "Ingresa el cliente" }]}
            >
              <Input placeholder="Cliente" />
            </Form.Item>
            <Form.Item name="contacto" label="Contacto">
              <Input placeholder="Nombre, teléfono o correo" />
            </Form.Item>
            <Form.Item
              name="tipoCliente"
              label="Tipo de cliente"
              rules={[{ required: true, message: "Selecciona el tipo" }]}
            >
              <Select options={TIPO_CLIENTE_OPTIONS} />
            </Form.Item>
            <Form.Item name="responsable" label="Responsable">
              <Input placeholder="Responsable comercial" />
            </Form.Item>
            <Form.Item name="fechaVencimiento" label="Fecha vencimiento">
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="fechaSeguimiento" label="Fecha seguimiento">
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item
              name="observaciones"
              label="Observaciones"
              className="md:col-span-2"
            >
              <Input.TextArea rows={3} placeholder="Notas comerciales" />
            </Form.Item>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-beck-ink">Productos</p>
            {!modalReadOnly && (
              <span className="text-xs text-beck-muted">
                El stock bajo se marca en rojo. Cantidades sobre stock muestran advertencia.
              </span>
            )}
          </div>

          <Form.List name="lineas">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map((field) => {
                  const linea = lineasWatch[field.name] ?? {};
                  const producto = linea.productoId
                    ? productMap.get(linea.productoId)
                    : undefined;
                  const cantidad = Number(linea.cantidad || 0);
                  const superaStock =
                    producto && cantidad > Number(producto.stockDisponible || 0);

                  return (
                    <div
                      key={field.key}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr,90px,130px,110px,130px,auto]">
                        <Form.Item
                          name={[field.name, "productoId"]}
                          label="Producto"
                          rules={[{ required: true, message: "Selecciona producto" }]}
                        >
                          <Select
                            showSearch
                            placeholder="Seleccionar producto"
                            optionFilterProp="label"
                            options={productoOptions}
                            onChange={(productoId) => {
                              const selectedProduct = productMap.get(productoId);
                              const current = form.getFieldValue("lineas") ?? [];
                              current[field.name] = {
                                ...current[field.name],
                                productoId,
                                precioUnitario: selectedProduct?.precio ?? 0,
                                cantidad: current[field.name]?.cantidad ?? 1,
                                descuentoPct: current[field.name]?.descuentoPct ?? 0,
                              };
                              form.setFieldValue("lineas", [...current]);
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "cantidad"]}
                          label="Cantidad"
                          rules={[{ required: true, message: "Cantidad" }]}
                        >
                          <InputNumber min={1} className="w-full" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "precioUnitario"]}
                          label="Precio unit."
                        >
                          <InputNumber min={0} className="w-full" prefix="$" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "descuentoPct"]}
                          label="Desc. %"
                        >
                          <InputNumber min={0} max={100} className="w-full" />
                        </Form.Item>
                        <div className="space-y-1">
                          <p className="text-xs text-beck-muted">Subtotal</p>
                          <p className="rounded-md border border-slate-200 bg-white px-2 py-[5px] text-right text-sm font-semibold tabular-nums">
                            {formatCLP(calculateLineSubtotal(linea))}
                          </p>
                        </div>
                        {!modalReadOnly && (
                          <div className="flex items-end">
                            <Button danger onClick={() => remove(field.name)}>
                              Quitar
                            </Button>
                          </div>
                        )}
                      </div>

                      {producto && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <Tag color={producto.alertaStockBajo ? "red" : "green"}>
                            Stock disponible: {producto.stockDisponible}
                          </Tag>
                          {producto.alertaStockBajo && (
                            <Tag color="red">Stock bajo</Tag>
                          )}
                          {superaStock && (
                            <Alert
                              type="warning"
                              showIcon
                              className="py-1"
                              message="La cantidad supera el stock disponible"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!modalReadOnly && (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => add({ cantidad: 1, descuentoPct: 0 })}
                  >
                    Agregar producto
                  </Button>
                )}
              </div>
            )}
          </Form.List>

          <div className="mt-4 ml-auto w-full max-w-sm rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <b>{formatCLP(totals.subtotal)}</b>
            </div>
            <div className="mt-1 flex justify-between text-beck-muted">
              <span>Descuento</span>
              <b>{formatCLP(totals.descuento)}</b>
            </div>
            <div className="mt-1 flex justify-between">
              <span>IVA 19%</span>
              <b>{formatCLP(totals.iva)}</b>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
              <span>Total</span>
              <b className="text-firemat-primary">{formatCLP(totals.total)}</b>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FirematCotizaciones;
