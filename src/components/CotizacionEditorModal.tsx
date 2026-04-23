import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Select,
  Button,
  Input,
  InputNumber,
  DatePicker,
  Table,
  Switch,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  ShopOutlined,
  UserOutlined,
  DollarOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  funnelBeckAPI,
  type FunnelBeckOpportunity,
} from "../services/api";
import type {
  CotizacionLinea,
  EstadoCotizacion,
  TipoCotizacion,
  TipoLineaCotizacion,
} from "../types/cotizacion";

export type LineaCotizacion = CotizacionLinea;

export type CotizacionEditorValues = {
  id?: number;
  numero?: number;
  codigo?: string;
  funnelBeckId?: string;
  cliente: string;
  proyecto?: string;
  origen: "BECK" | "FIREMAT";
  tipo: TipoCotizacion;
  fecha: Dayjs;
  vigencia: Dayjs;
  estado: EstadoCotizacion;
  moneda: "CLP" | "USD";
  responsable?: string;
  notas?: string;
  descuento: number;
  aplicaImpuesto: boolean;
  lineas?: LineaCotizacion[];
  tipoEntidad?: string;
  filtroOrigenCliente?: string;
  entidad?: string;
};

type CotizacionEditorModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<CotizacionEditorValues>;
  onClose: () => void;
  onSubmit: (values: CotizacionEditorValues) => void;
  submitting?: boolean;
  lockFunnelSelection?: boolean;
};

type LineaTabla = {
  key: string;
  tipoLinea: TipoLineaCotizacion;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  gananciaPct: number;
};

const estadosOptions: EstadoCotizacion[] = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
  "Vencida",
];

let lineaCounter = 0;
const newKey = () => `linea-${++lineaCounter}`;

const buildLineasState = (
  source?: LineaCotizacion[]
): LineaTabla[] =>
  source?.map((linea) => ({
    key: newKey(),
    tipoLinea: linea.tipoLinea,
    descripcion: linea.descripcion,
    cantidad: linea.cantidad,
    precioUnitario: linea.precioUnitario,
    gananciaPct: Number(linea.gananciaPct ?? 0),
  })) ?? [];

const calculateLineaSubtotal = (
  cantidad: number,
  precioUnitario: number,
  gananciaPct = 0
) => cantidad * precioUnitario * (1 + gananciaPct / 100);

const formatCurrency = (value: number, moneda: "CLP" | "USD") => {
  const prefix = moneda === "USD" ? "US$" : "$";
  return `${prefix} ${value.toLocaleString("es-CL", {
    maximumFractionDigits: 0,
  })}`;
};

const getOpportunityLabel = (opportunity: FunnelBeckOpportunity) => {
  const proyecto = String(opportunity.nombreProyecto || "").trim();
  const empresa =
    typeof opportunity.empresa === "string" ? opportunity.empresa.trim() : "";

  return empresa ? `${proyecto} - ${empresa}` : proyecto;
};

const CotizacionEditorModal: React.FC<CotizacionEditorModalProps> = ({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
  submitting = false,
  lockFunnelSelection = false,
}) => {
  const [form] = Form.useForm<CotizacionEditorValues>();
  const [modalWidth, setModalWidth] = useState(980);
  const [lineas, setLineas] = useState<LineaTabla[]>(() =>
    buildLineasState(initialValues?.lineas)
  );
  const [opportunities, setOpportunities] = useState<FunnelBeckOpportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);

  const descuento =
    (Form.useWatch("descuento", form) as number | undefined) ?? 0;
  const aplicaImpuesto =
    (Form.useWatch("aplicaImpuesto", form) as boolean | undefined) ?? true;
  const moneda =
    (Form.useWatch("moneda", form) as "CLP" | "USD" | undefined) ?? "CLP";

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === "undefined") {
        return;
      }

      setModalWidth(Math.min(980, window.innerWidth - 24));
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const baseFecha = initialValues?.fecha
      ? dayjs(initialValues.fecha)
      : dayjs();
    const baseVigencia = initialValues?.vigencia
      ? dayjs(initialValues.vigencia)
      : dayjs().add(30, "day");

    form.resetFields();
    form.setFieldsValue({
      tipoEntidad: initialValues?.tipoEntidad || "Empresa",
      filtroOrigenCliente: initialValues?.filtroOrigenCliente || "Todos",
      entidad: initialValues?.entidad,
      numero: initialValues?.numero,
      codigo: initialValues?.codigo,
      funnelBeckId: initialValues?.funnelBeckId,
      cliente: initialValues?.cliente || "",
      proyecto: initialValues?.proyecto || "",
      origen: initialValues?.origen || "BECK",
      tipo: initialValues?.tipo || "Cliente",
      fecha: baseFecha,
      vigencia: baseVigencia,
      estado: initialValues?.estado || "Borrador",
      moneda: initialValues?.moneda || "CLP",
      responsable: initialValues?.responsable || "",
      notas: initialValues?.notas || "",
      descuento: initialValues?.descuento ?? 0,
      aplicaImpuesto: initialValues?.aplicaImpuesto ?? true,
    } as CotizacionEditorValues);
  }, [form, initialValues, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let ignore = false;

    const loadOpportunities = async () => {
      try {
        setOpportunitiesLoading(true);
        const response = await funnelBeckAPI.listar();

        if (!ignore) {
          setOpportunities(response);
        }
      } catch (error) {
        if (!ignore) {
          setOpportunities([]);
          message.error("No se pudieron cargar las oportunidades Beck");
        }

        console.error("Error al cargar oportunidades Beck:", error);
      } finally {
        if (!ignore) {
          setOpportunitiesLoading(false);
        }
      }
    };

    void loadOpportunities();

    return () => {
      ignore = true;
    };
  }, [open]);

  const updateLinea = (
    key: string,
    field: keyof Omit<LineaTabla, "key">,
    value: string | number
  ) => {
    setLineas((prev) =>
      prev.map((linea) =>
        linea.key === key ? { ...linea, [field]: value } : linea
      )
    );
  };

  const eliminarLinea = (key: string) => {
    setLineas((prev) => prev.filter((linea) => linea.key !== key));
  };

  const agregarLinea = (
    tipoLinea: TipoLineaCotizacion,
    descripcion: string,
    precioUnitario = 0
  ) => {
    setLineas((prev) => [
      ...prev,
      {
        key: newKey(),
        tipoLinea,
        descripcion,
        cantidad: 1,
        precioUnitario,
        gananciaPct: 0,
      },
    ]);
  };

  const handleOpportunityChange = (value?: string) => {
    form.setFieldValue("funnelBeckId", value);

    if (!value) {
      return;
    }

    const selectedOpportunity = opportunities.find(
      (opportunity) => opportunity.id === value
    );

    if (!selectedOpportunity) {
      return;
    }

    const currentCliente = String(form.getFieldValue("cliente") || "").trim();
    const currentProyecto = String(form.getFieldValue("proyecto") || "").trim();
    const nextCliente =
      typeof selectedOpportunity.empresa === "string"
        ? selectedOpportunity.empresa.trim()
        : "";
    const nextProyecto = String(selectedOpportunity.nombreProyecto || "").trim();

    if (!currentCliente && nextCliente) {
      form.setFieldValue("cliente", nextCliente);
    }

    if ((mode === "create" || !currentProyecto) && nextProyecto) {
      form.setFieldValue("proyecto", nextProyecto);
    }
  };

  const columns: ColumnsType<LineaTabla> = [
    {
      title: "Tipo",
      dataIndex: "tipoLinea",
      key: "tipoLinea",
      width: 120,
      render: (value: TipoLineaCotizacion, record) => (
        <Select
          size="small"
          value={value}
          style={{ width: "100%" }}
          options={[
            { label: "Producto", value: "PRODUCTO" },
            { label: "Servicio", value: "SERVICIO" },
          ]}
          onChange={(nextValue) =>
            updateLinea(record.key, "tipoLinea", nextValue)
          }
        />
      ),
    },
    {
      title: "Descripcion",
      dataIndex: "descripcion",
      key: "descripcion",
      render: (value: string, record) => (
        <Input
          size="small"
          value={value}
          onChange={(event) =>
            updateLinea(record.key, "descripcion", event.target.value)
          }
        />
      ),
    },
    {
      title: "Cant.",
      dataIndex: "cantidad",
      key: "cantidad",
      width: 80,
      align: "right",
      render: (value: number, record) => (
        <InputNumber
          size="small"
          value={value}
          min={1}
          style={{ width: "100%" }}
          onChange={(nextValue) =>
            updateLinea(record.key, "cantidad", nextValue ?? 1)
          }
        />
      ),
    },
    {
      title: "P. Unitario",
      dataIndex: "precioUnitario",
      key: "precioUnitario",
      width: 120,
      align: "right",
      render: (value: number, record) => (
        <InputNumber
          size="small"
          value={value}
          style={{ width: "100%" }}
          formatter={(current) =>
            current !== undefined && current !== null
              ? `$ ${current}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              : ""
          }
          parser={(current) =>
            current ? Number(current.replace(/\$\s?|(\.)/g, "")) : 0
          }
          onChange={(nextValue) =>
            updateLinea(record.key, "precioUnitario", nextValue ?? 0)
          }
        />
      ),
    },
    {
      title: "% Ganancia",
      dataIndex: "gananciaPct",
      key: "gananciaPct",
      width: 110,
      align: "right",
      render: (value: number, record) => (
        <InputNumber
          size="small"
          value={value}
          min={0}
          max={100}
          style={{ width: "100%" }}
          formatter={(current) =>
            current !== undefined && current !== null ? `${current}%` : ""
          }
          parser={(current) =>
            current ? Number(current.replace("%", "")) : 0
          }
          onChange={(nextValue) =>
            updateLinea(record.key, "gananciaPct", nextValue ?? 0)
          }
        />
      ),
    },
    {
      title: "Subtotal",
      key: "subtotal",
      width: 120,
      align: "right",
      render: (_: unknown, record) =>
        formatCurrency(
          calculateLineaSubtotal(
            record.cantidad,
            record.precioUnitario,
            record.gananciaPct
          ),
          moneda
        ),
    },
    {
      title: "",
      key: "acciones",
      width: 44,
      align: "center",
      render: (_: unknown, record) => (
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          className="text-red-400 hover:text-red-600"
          onClick={() => eliminarLinea(record.key)}
        />
      ),
    },
  ];

  const totales = useMemo(() => {
    const subtotal = lineas.reduce(
      (acc, linea) =>
        acc +
        calculateLineaSubtotal(
          linea.cantidad,
          linea.precioUnitario,
          linea.gananciaPct
        ),
      0
    );
    const descuentoSafe = Number.isFinite(descuento) ? descuento : 0;
    const descuentoPct = Math.min(100, Math.max(0, descuentoSafe));
    const descuentoMonto = subtotal * (descuentoPct / 100);
    const neto = Math.max(0, subtotal - descuentoMonto);
    const impuesto = aplicaImpuesto ? neto * 0.19 : 0;
    const total = neto + impuesto;

    return { subtotal, descuentoPct, descuentoMonto, neto, impuesto, total };
  }, [aplicaImpuesto, descuento, lineas]);

  const handleFinish = (values: CotizacionEditorValues) => {
    onSubmit({
      ...values,
      lineas: lineas.map((linea, index) => {
        const subtotal = calculateLineaSubtotal(
          linea.cantidad,
          linea.precioUnitario,
          linea.gananciaPct
        );

        return {
          tipoLinea: linea.tipoLinea,
          descripcion: linea.descripcion,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          subtotal,
          orden: index + 1,
          gananciaPct: Number(linea.gananciaPct ?? 0),
        };
      }),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      destroyOnHidden={false}
      title={null}
      styles={{
        body: { padding: 0 },
        mask: { backdropFilter: "blur(2px)" },
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-orange-700">
              <FileTextOutlined className="text-[12px]" />
              <span>
                {mode === "create"
                  ? "Creacion de cotizacion"
                  : "Edicion de cotizacion"}
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Cotizacion de sellos cortafuego Â· BECK
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShopOutlined className="text-amber-500" />
                Informacion del cliente
              </h3>

              <Form.Item<CotizacionEditorValues>
                name="funnelBeckId"
                label={
                  <span className="text-[11px] text-slate-600">
                    Oportunidad Beck
                  </span>
                }
              >
                <Select
                  allowClear={!lockFunnelSelection}
                  showSearch
                  size="small"
                  disabled={lockFunnelSelection || submitting}
                  loading={opportunitiesLoading}
                  placeholder="Selecciona una oportunidad"
                  optionFilterProp="label"
                  options={opportunities.map((opportunity) => ({
                    label: getOpportunityLabel(opportunity),
                    value: opportunity.id,
                  }))}
                  onChange={(value) => handleOpportunityChange(value)}
                />
              </Form.Item>

              <Form.Item<CotizacionEditorValues>
                name="tipoEntidad"
                label={
                  <span className="text-[11px] text-slate-600">
                    Tipo de entidad
                  </span>
                }
              >
                <Select
                  size="small"
                  options={[
                    { label: "Empresa", value: "Empresa" },
                    { label: "Persona natural", value: "Persona" },
                    { label: "Otro", value: "Otro" },
                  ]}
                />
              </Form.Item>

              <Form.Item<CotizacionEditorValues>
                name="filtroOrigenCliente"
                label={
                  <span className="text-[11px] text-slate-600">
                    Filtrar por origen
                  </span>
                }
              >
                <Select
                  size="small"
                  options={[
                    { label: "Todos los origenes", value: "Todos" },
                    { label: "BECK", value: "BECK" },
                    { label: "FIREMAT", value: "FIREMAT" },
                  ]}
                />
              </Form.Item>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                size="small"
                className="mt-1 mb-2 border-none bg-sky-500 text-xs hover:bg-sky-600"
              >
                Crear empresa
              </Button>

              <Form.Item<CotizacionEditorValues>
                name="cliente"
                label={
                  <span className="text-[11px] text-slate-600">
                    Entidad / cliente
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: "Ingrese o seleccione el cliente",
                  },
                ]}
              >
                <Input
                  size="small"
                  prefix={<UserOutlined className="mr-1 text-slate-400" />}
                  placeholder="Nombre de la empresa o cliente"
                />
              </Form.Item>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <DollarOutlined className="text-emerald-500" />
                Configuracion
              </h3>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Form.Item<CotizacionEditorValues>
                  name="tipo"
                  label={
                    <span className="text-[11px] text-slate-600">Tipo</span>
                  }
                  rules={[{ required: true, message: "Seleccione tipo" }]}
                >
                  <Select
                    size="small"
                    options={[
                      { label: "Cliente", value: "Cliente" },
                      { label: "Interna", value: "Interna" },
                      { label: "Servicio", value: "Servicio" },
                      { label: "Mantencion", value: "Mantencion" },
                      { label: "Otro", value: "Otro" },
                    ]}
                  />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="estado"
                  label={
                    <span className="text-[11px] text-slate-600">Estado</span>
                  }
                  rules={[{ required: true, message: "Seleccione estado" }]}
                >
                  <Select
                    size="small"
                    options={estadosOptions.map((estado) => ({
                      label: estado,
                      value: estado,
                    }))}
                  />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="origen"
                  label={
                    <span className="text-[11px] text-slate-600">Origen</span>
                  }
                  rules={[{ required: true, message: "Seleccione origen" }]}
                >
                  <Select
                    size="small"
                    options={[
                      { label: "BECK", value: "BECK" },
                      { label: "FIREMAT", value: "FIREMAT" },
                    ]}
                  />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="moneda"
                  label={
                    <span className="text-[11px] text-slate-600">Moneda</span>
                  }
                  rules={[{ required: true, message: "Seleccione moneda" }]}
                >
                  <Select
                    size="small"
                    options={[
                      { label: "CLP - Pesos", value: "CLP" },
                      { label: "USD - Dolares", value: "USD" },
                    ]}
                  />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="responsable"
                  label={
                    <span className="text-[11px] text-slate-600">
                      Responsable
                    </span>
                  }
                >
                  <Input size="small" placeholder="Ej: Equipo Beck" />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="aplicaImpuesto"
                  label={
                    <span className="text-[11px] text-slate-600">
                      Aplica IVA (19%)
                    </span>
                  }
                  valuePropName="checked"
                >
                  <Switch size="small" />
                </Form.Item>
              </div>

              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Form.Item<CotizacionEditorValues>
                  name="fecha"
                  label={
                    <span className="text-[11px] text-slate-600">
                      Fecha cotizacion
                    </span>
                  }
                  rules={[{ required: true, message: "Seleccione fecha" }]}
                >
                  <DatePicker
                    size="small"
                    format="DD-MM-YYYY"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="vigencia"
                  label={
                    <span className="text-[11px] text-slate-600">
                      Vigencia
                    </span>
                  }
                  rules={[{ required: true, message: "Seleccione vigencia" }]}
                >
                  <DatePicker
                    size="small"
                    format="DD-MM-YYYY"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Form.Item<CotizacionEditorValues>
              name="proyecto"
              label="Nombre de la cotizacion / proyecto"
            >
              <Input size="small" placeholder="Sellos cortafuego obra XYZ" />
            </Form.Item>

            <Form.Item<CotizacionEditorValues> name="numero" label="Nro.">
              <InputNumber min={1} style={{ width: "100%" }} size="small" />
            </Form.Item>

            <Form.Item<CotizacionEditorValues>
              name="codigo"
              label="Codigo (opcional)"
            >
              <Input size="small" placeholder="Ej: BECK-COT-2025-021" />
            </Form.Item>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                size="small"
                className="border-sky-200 text-sky-600"
                onClick={() =>
                  agregarLinea("PRODUCTO", "Producto seleccionado", 10000)
                }
              >
                + Seleccionar producto
              </Button>
              <Button
                size="small"
                className="border-violet-200 text-violet-600"
                onClick={() => agregarLinea("PRODUCTO", "Nuevo producto")}
              >
                + Crear producto nuevo
              </Button>
              <Button
                size="small"
                className="border-emerald-200 text-emerald-600"
                onClick={() => agregarLinea("SERVICIO", "Servicio")}
              >
                + Servicio
              </Button>
            </div>

            <Table<LineaTabla>
              columns={columns}
              dataSource={lineas}
              size="small"
              pagination={false}
              scroll={{ x: 720 }}
              tableLayout="fixed"
              locale={{
                emptyText: (
                  <span className="text-[11px] text-slate-400">
                    No hay productos o servicios agregados.
                  </span>
                ),
              }}
            />

            <div className="mt-4 flex flex-col items-end">
              <div className="w-full max-w-xs space-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totales.subtotal, moneda)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Descuento global (%):</span>
                  <Form.Item<CotizacionEditorValues>
                    name="descuento"
                    className="mb-0"
                    style={{ width: 130 }}
                    rules={[
                      {
                        validator: (_, value) => {
                          const numericValue = Number(value ?? 0);

                          if (
                            Number.isFinite(numericValue) &&
                            numericValue >= 0 &&
                            numericValue <= 100
                          ) {
                            return Promise.resolve();
                          }

                          return Promise.reject(
                            new Error("Ingresa un porcentaje entre 0 y 100")
                          );
                        },
                      },
                    ]}
                  >
                    <InputNumber<number>
                      min={0}
                      max={100}
                      step={0.1}
                      size="small"
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        value !== undefined && value !== null
                          ? `${value}%`
                          : ""
                      }
                      parser={(value) => {
                        if (!value) return 0;
                        const parsed = Number(
                          value.replace("%", "").replace(",", ".")
                        );
                        return Number.isFinite(parsed) ? parsed : 0;
                      }}
                    />
                  </Form.Item>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Descuento aplicado:</span>
                  <span>{formatCurrency(totales.descuentoMonto, moneda)}</span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span>Neto:</span>
                  <span>{formatCurrency(totales.neto, moneda)}</span>
                </div>

                {aplicaImpuesto && (
                  <div className="flex justify-between text-slate-500">
                    <span>IVA (19%):</span>
                    <span>{formatCurrency(totales.impuesto, moneda)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-300 pt-1 font-semibold text-slate-900">
                  <span>Total:</span>
                  <span>{formatCurrency(totales.total, moneda)}</span>
                </div>
              </div>
            </div>
          </div>

          <Form.Item<CotizacionEditorValues> name="notas" label="Notas">
            <Input.TextArea
              rows={3}
              placeholder="Alcances, exclusiones, condiciones comerciales, etc."
            />
          </Form.Item>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px]">
            <span className="text-slate-500">
              Estado inicial: <strong>Borrador</strong>
            </span>
            <div className="flex gap-2">
              <Button size="small" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                size="small"
                type="primary"
                htmlType="submit"
                loading={submitting}
                className="border-none bg-sky-500 hover:bg-sky-600"
              >
                {mode === "create" ? "Crear cotizacion" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default CotizacionEditorModal;




