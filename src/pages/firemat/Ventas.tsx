import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  DatePicker,
  Divider,
  Empty,
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
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  firematProductosAPI,
  firematVentasAPI,
  type FirematVentaCrearPayload,
  type ProductoFiremat,
  type VentaFiremat,
  type VentasFirematResumen,
} from "../../services/api";
import { usePermisos } from "../../hooks/usePermisos";

const { RangePicker } = DatePicker;
const EDIT_VENTAS_FIREMAT_PERMISSION_MESSAGE =
  "No tienes permiso para editar ventas Firemat.";

const getVentasErrorMessage = (err: unknown, fallback: string): string => {
  const apiErr = err as {
    response?: { status?: number; data?: { error?: string; message?: string } };
    message?: string;
  } | null;
  if (apiErr?.response?.status === 403) {
    return EDIT_VENTAS_FIREMAT_PERMISSION_MESSAGE;
  }
  return (
    apiErr?.response?.data?.error ||
    apiErr?.response?.data?.message ||
    apiErr?.message ||
    fallback
  );
};

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

type LineaDetalle = {
  _key: number;
  productoId: number | null;
  cantidad: number;
  precio: number;
};

const FirematVentas: React.FC = () => {
  const { canEdit } = usePermisos();
  const canEditVentas = canEdit("firemat_ventas");

  const [ventas, setVentas] = useState<VentaFiremat[]>([]);
  const [resumen, setResumen] = useState<VentasFirematResumen>(RESUMEN_VACIO);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [rango, setRango] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // Modal state
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [cliente, setCliente] = useState("");
  const [contacto, setContacto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [lineas, setLineas] = useState<LineaDetalle[]>([{ _key: 0, productoId: null, cantidad: 1, precio: 0 }]);
  const [erroresForm, setErroresForm] = useState<string[]>([]);
  const keyRef = useRef(1);

  const nuevaLinea = (): LineaDetalle => ({
    _key: keyRef.current++,
    productoId: null,
    cantidad: 1,
    precio: 0,
  });

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

  const abrirModal = async () => {
    if (!canEditVentas) {
      void message.error(EDIT_VENTAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    setModalAbierto(true);
    if (productos.length === 0) {
      try {
        setLoadingProductos(true);
        const res = await firematProductosAPI.listar({ activo: true });
        setProductos(res.data);
      } catch {
        void message.error("No se pudieron cargar los productos");
      } finally {
        setLoadingProductos(false);
      }
    }
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
    setCliente("");
    setContacto("");
    setResponsable("");
    setLineas([nuevaLinea()]);
    setErroresForm([]);
  };

  const agregarLinea = () => {
    if (!canEditVentas) {
      void message.error(EDIT_VENTAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    setLineas((prev) => [...prev, nuevaLinea()]);
  };

  const quitarLinea = (key: number) => {
    if (!canEditVentas) {
      void message.error(EDIT_VENTAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    setLineas((prev) => prev.filter((l) => l._key !== key));
  };

  const actualizarLinea = (key: number, campo: Partial<Omit<LineaDetalle, "_key">>) => {
    if (!canEditVentas) return;
    setLineas((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l;
        const updated = { ...l, ...campo };
        if (campo.productoId !== undefined && campo.precio === undefined) {
          const prod = productos.find((p) => p.id === campo.productoId);
          if (prod) updated.precio = prod.precio ?? 0;
        }
        return updated;
      })
    );
  };

  const total = useMemo(
    () => lineas.reduce((acc, l) => acc + l.cantidad * l.precio, 0),
    [lineas]
  );

  const validar = (): string[] => {
    const errs: string[] = [];
    if (!cliente.trim()) errs.push("El cliente es obligatorio.");
    if (lineas.length === 0) errs.push("Debe agregar al menos un producto.");
    lineas.forEach((l, i) => {
      const n = i + 1;
      if (l.productoId === null) {
        errs.push(`Línea ${n}: debe seleccionar un producto.`);
      } else {
        const prod = productos.find((p) => p.id === l.productoId);
        const stockDisp = prod ? (prod.stockDisponible ?? prod.stock) : Infinity;
        if (l.cantidad <= 0) {
          errs.push(`Línea ${n}: la cantidad debe ser mayor a 0.`);
        } else if (l.cantidad > stockDisp) {
          errs.push(`Línea ${n}: cantidad (${l.cantidad}) supera el stock disponible (${stockDisp}).`);
        }
        if (l.precio < 0) {
          errs.push(`Línea ${n}: el precio no puede ser negativo.`);
        }
      }
    });
    return errs;
  };

  const guardar = async () => {
    if (!canEditVentas) {
      void message.error(EDIT_VENTAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    const errs = validar();
    if (errs.length > 0) {
      setErroresForm(errs);
      return;
    }
    setErroresForm([]);
    try {
      setGuardando(true);
      const payload: FirematVentaCrearPayload = {
        cliente: cliente.trim(),
        contacto: contacto.trim() || null,
        responsable: responsable.trim() || null,
        estado: "CERRADO",
        detalle: lineas.map((l) => ({
          productoId: l.productoId as number,
          cantidad: l.cantidad,
          precio: l.precio,
        })),
      };
      await firematVentasAPI.crear(payload);
      void message.success("Venta creada exitosamente");
      cerrarModal();
      void cargar();
    } catch (err: unknown) {
      void message.error(getVentasErrorMessage(err, "No se pudo crear la venta"));
    } finally {
      setGuardando(false);
    }
  };

  const productoOptions = productos.map((p) => {
    const stock = p.stockDisponible ?? p.stock;
    const label = `${p.nombre}${p.sku ? ` [${p.sku}]` : ""} — Stock: ${stock}`;
    return { label, value: p.id };
  });

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
          <div className="flex gap-2">
            {canEditVentas && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => void abrirModal()}
              >
                Nueva venta
              </Button>
            )}
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
        <ResumenCard label="Total ventas" value={resumen.totalVentas} />
        <ResumenCard label="Ventas cerradas" value={resumen.ventasCerradas} />
        <ResumenCard label="Ventas prospecto" value={resumen.ventasProspecto} />
        <ResumenCard label="Monto total" value={formatCLP(resumen.montoTotal)} />
        <ResumenCard label="Monto cerrado" value={formatCLP(resumen.montoCerrado)} highlight />
      </div>

      {/* Filtros */}
      <section className="firemat-panel p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <Input
            prefix={<SearchOutlined className="text-beck-muted" />}
            placeholder="Buscar por cliente o producto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            className="w-full sm:w-auto sm:min-w-[200px]"
          />
          <Select
            value={estado}
            onChange={setEstado}
            options={ESTADO_OPTIONS}
            style={{ width: 140 }}
            className="!w-full sm:!w-[140px]"
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
              showTotal: (t) => `${t} ventas`,
            }}
          />
        )}
      </section>

      {/* Modal nueva venta */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ShoppingCartOutlined />
            <span>Nueva venta</span>
          </div>
        }
        open={modalAbierto && canEditVentas}
        onCancel={cerrarModal}
        width={800}
        footer={[
          <Button key="cancel" onClick={cerrarModal} disabled={guardando}>
            Cancelar
          </Button>,
          ...(canEditVentas
            ? [
                <Button
                  key="save"
                  type="primary"
                  onClick={() => void guardar()}
                  loading={guardando}
                >
                  Guardar venta
                </Button>,
              ]
            : []),
        ]}
        destroyOnClose
      >
        <div className="space-y-4 pt-2">
          {/* Errores de validación */}
          {erroresForm.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <ul className="list-disc list-inside space-y-1">
                {erroresForm.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Campos básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-beck-ink mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <Input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del cliente"
                disabled={!canEditVentas}
                status={erroresForm.some((e) => e.includes("cliente")) ? "error" : undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-beck-ink mb-1">
                Contacto
              </label>
              <Input
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Nombre del contacto"
                disabled={!canEditVentas}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-beck-ink mb-1">
                Responsable
              </label>
              <Input
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Responsable de la venta"
                disabled={!canEditVentas}
              />
            </div>
          </div>

          <Divider className="my-2" />

          {/* Detalle de productos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-beck-ink">Detalle de productos</h3>
              {canEditVentas && (
                <Button size="small" icon={<PlusOutlined />} onClick={agregarLinea} type="dashed">
                  Agregar producto
                </Button>
              )}
            </div>

            {loadingProductos ? (
              <div className="flex justify-center py-6">
                <Spin size="small" />
              </div>
            ) : (
              <div className="space-y-2">
                {lineas.length === 0 && (
                  <p className="text-xs text-beck-muted text-center py-4">
                    No hay productos. Haz clic en "Agregar producto".
                  </p>
                )}
                {lineas.map((linea, idx) => {
                  const prod = productos.find((p) => p.id === linea.productoId);
                  const stockDisp = prod ? (prod.stockDisponible ?? prod.stock) : null;
                  const subtotal = linea.cantidad * linea.precio;
                  const tieneErrorProducto = erroresForm.some(
                    (e) => e.includes(`Línea ${idx + 1}`) && e.includes("producto")
                  );
                  const tieneErrorCantidad = erroresForm.some(
                    (e) => e.includes(`Línea ${idx + 1}`) && e.includes("cantidad")
                  );
                  const tieneErrorPrecio = erroresForm.some(
                    (e) => e.includes(`Línea ${idx + 1}`) && e.includes("precio")
                  );

                  return (
                    <div
                      key={linea._key}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                      <div
                        className="grid gap-2 items-end"
                        style={{ gridTemplateColumns: "1fr 90px 120px 120px 36px" }}
                      >
                        <div>
                          <label className="block text-xs text-beck-muted mb-1">
                            Producto {idx + 1}
                          </label>
                          <Select
                            showSearch
                            value={linea.productoId ?? undefined}
                            onChange={(v) => actualizarLinea(linea._key, { productoId: v })}
                            options={productoOptions}
                            placeholder="Seleccionar producto"
                            className="w-full"
                            filterOption={(input, opt) =>
                              (opt?.label as string ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            }
                            status={tieneErrorProducto ? "error" : undefined}
                            disabled={!canEditVentas}
                            notFoundContent="Sin productos activos"
                          />
                          {stockDisp !== null && (
                            <p className="text-xs text-beck-muted mt-0.5">
                              Stock disponible: {stockDisp}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-beck-muted mb-1">Cantidad</label>
                          <InputNumber
                            min={1}
                            max={stockDisp ?? undefined}
                            value={linea.cantidad}
                            onChange={(v) =>
                              actualizarLinea(linea._key, { cantidad: typeof v === "number" ? v : 1 })
                            }
                            className="w-full"
                            status={tieneErrorCantidad ? "error" : undefined}
                            disabled={!canEditVentas}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-beck-muted mb-1">Precio</label>
                          <InputNumber
                            min={0}
                            value={linea.precio}
                            onChange={(v) =>
                              actualizarLinea(linea._key, { precio: typeof v === "number" ? v : 0 })
                            }
                            className="w-full"
                            status={tieneErrorPrecio ? "error" : undefined}
                            disabled={!canEditVentas}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-beck-muted mb-1">Subtotal</label>
                          <div className="flex h-8 items-center rounded border border-gray-200 bg-white px-2 text-sm font-semibold tabular-nums text-beck-ink">
                            {formatCLP(subtotal)}
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => quitarLinea(linea._key)}
                            disabled={!canEditVentas || lineas.length === 1}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total general */}
          <div className="flex justify-end pt-1">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
              <span className="text-sm font-medium text-beck-ink">Total general</span>
              <span className="text-xl font-bold tabular-nums text-firemat-primary">
                {formatCLP(total)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FirematVentas;
