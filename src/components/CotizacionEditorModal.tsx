// src/components/CotizacionEditorModal.tsx
import React, { useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Select,
  Button,
  Input,
  InputNumber,
  DatePicker,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  ShopOutlined,
  UserOutlined,
  DollarOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type { EstadoCotizacion } from "../types/cotizacion";

export type CotizacionEditorValues = {
  id?: number;
  numero?: number;
  codigo?: string;

  // datos de cotización
  cliente: string;
  proyecto?: string;
  origen: string;
  tipo: string;
  fecha: Dayjs;
  vigencia: Dayjs;
  estado: EstadoCotizacion;
  moneda: "CLP" | "USD";
  monto: number;
  responsable?: string;
  notas?: string;

  // UI cliente
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
};

type ItemTabla = {
  key: string;
  tipo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  gananciaPct: number;
  ivaPct: number;
  descuentoPct: number;
};

const estadosOptions: EstadoCotizacion[] = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
];

const CotizacionEditorModal: React.FC<CotizacionEditorModalProps> = ({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<CotizacionEditorValues>();

  // tabla de productos (estructura, aún sin lógica)
  const columns: ColumnsType<ItemTabla> = [
    { title: "Tipo", dataIndex: "tipo", key: "tipo", width: 90 },
    { title: "Descripción", dataIndex: "descripcion", key: "descripcion" },
    {
      title: "Cant.",
      dataIndex: "cantidad",
      key: "cantidad",
      width: 80,
      align: "right",
    },
    {
      title: "P. Unitario",
      dataIndex: "precioUnitario",
      key: "precioUnitario",
      width: 110,
      align: "right",
    },
    {
      title: "% Ganancia",
      dataIndex: "gananciaPct",
      key: "gananciaPct",
      width: 110,
      align: "right",
    },
    {
      title: "IVA",
      dataIndex: "ivaPct",
      key: "ivaPct",
      width: 80,
      align: "right",
    },
    {
      title: "% Desc",
      dataIndex: "descuentoPct",
      key: "descuentoPct",
      width: 90,
      align: "right",
    },
    {
      title: "Subtotal",
      key: "subtotal",
      width: 110,
      align: "right",
      render: () => "$ 0",
    },
  ];

  const monto = (Form.useWatch("monto", form) as number | undefined) || 0;

  const resumenTotales = useMemo(() => {
    const totalFinal = Number(monto || 0);
    const subtotal = totalFinal / 1.19;
    const iva = totalFinal - subtotal;
    const descuentos = 0;

    return {
      subtotalBruto: subtotal,
      descuentos,
      subtotal,
      iva,
      totalFinal,
    };
  }, [monto]);

  // inicializar formulario cada vez que se abre
  useEffect(() => {
    if (!open) return;

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
      cliente: initialValues?.cliente || "",
      proyecto: initialValues?.proyecto || "",
      origen: initialValues?.origen || "BECK",
      tipo: initialValues?.tipo || "Cliente",
      fecha: baseFecha,
      vigencia: baseVigencia,
      estado: initialValues?.estado || "Borrador",
      moneda: initialValues?.moneda || "CLP",
      monto: initialValues?.monto ?? 0,
      responsable: initialValues?.responsable || "",
      notas: initialValues?.notas || "",
    } as CotizacionEditorValues);
  }, [open, initialValues, form]);

  const handleFinish = (values: CotizacionEditorValues) => {
    onSubmit({
      ...values,
      monto: Number(values.monto || 0),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      destroyOnClose={false}
      title={null}
      bodyStyle={{ padding: 0 }}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <div className="p-5 space-y-4">
          {/* título */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-orange-700">
              <FileTextOutlined className="text-[12px]" />
              <span>
                {mode === "create"
                  ? "Creación de cotización"
                  : "Edición de cotización"}
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Cotización de sellos cortafuego · BECK
            </h2>
          </div>

          {/* panel superior: cliente + configuración */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información del cliente */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <ShopOutlined className="text-amber-500" />
                Información del cliente
              </h3>

              <Form.Item<CotizacionEditorValues>
                name="tipoEntidad"
                label={<span className="text-[11px] text-slate-600">Tipo de entidad</span>}
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
                    { label: "Todos los orígenes", value: "Todos" },
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
                className="mt-1 mb-2 bg-sky-500 hover:bg-sky-600 border-none text-xs"
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
                rules={[{ required: true, message: "Ingrese o seleccione el cliente" }]}
              >
                <Input
                  size="small"
                  prefix={<UserOutlined className="text-slate-400 mr-1" />}
                  placeholder="Nombre de la empresa o cliente"
                />
              </Form.Item>
            </div>

            {/* Configuración */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <DollarOutlined className="text-emerald-500" />
                Configuración
              </h3>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Form.Item<CotizacionEditorValues>
                  name="tipo"
                  label={<span className="text-[11px] text-slate-600">Tipo</span>}
                  rules={[{ required: true, message: "Seleccione tipo" }]}
                >
                  <Select
                    size="small"
                    options={[
                      { label: "Cliente", value: "Cliente" },
                      { label: "Interna", value: "Interna" },
                      { label: "Servicio", value: "Servicio" },
                      { label: "Mantención", value: "Mantención" },
                      { label: "Otro", value: "Otro" },
                    ]}
                  />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="estado"
                  label={<span className="text-[11px] text-slate-600">Estado</span>}
                  rules={[{ required: true, message: "Seleccione estado" }]}
                >
                  <Select
                    size="small"
                    options={estadosOptions.map((e) => ({ label: e, value: e }))}
                  />
                </Form.Item>

                <Form.Item<CotizacionEditorValues>
                  name="origen"
                  label={<span className="text-[11px] text-slate-600">Origen</span>}
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
                    <span className="text-[11px] text-slate-600">
                      Moneda de cotización
                    </span>
                  }
                  rules={[{ required: true, message: "Seleccione moneda" }]}
                >
                  <Select
                    size="small"
                    options={[
                      { label: "CLP - Pesos chilenos", value: "CLP" },
                      { label: "USD - Dólares", value: "USD" },
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
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mt-1">
                <Form.Item<CotizacionEditorValues>
                  name="fecha"
                  label={
                    <span className="text-[11px] text-slate-600">
                      Fecha cotización
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

          {/* campos generales */}
          <div className="grid gap-3 md:grid-cols-3">
            <Form.Item<CotizacionEditorValues>
              name="proyecto"
              label="Nombre de la cotización / proyecto"
            >
              <Input size="small" placeholder="Sellos cortafuego obra XYZ" />
            </Form.Item>

            <Form.Item<CotizacionEditorValues> name="numero" label="N°">
              <InputNumber min={1} style={{ width: "100%" }} size="small" />
            </Form.Item>

            <Form.Item<CotizacionEditorValues> name="codigo" label="Código (opcional)">
              <Input size="small" placeholder="Ej: BECK-COT-2025-021" />
            </Form.Item>
          </div>

          {/* productos/servicios */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap gap-2 mb-3">
              <Button size="small" className="border-sky-200 text-sky-600">
                + Seleccionar producto
              </Button>
              <Button
                size="small"
                className="border-violet-200 text-violet-600"
              >
                + Crear producto nuevo
              </Button>
              <Button size="small" className="border-emerald-200 text-emerald-600">
                + Servicio
              </Button>
              <Button size="small" className="border-amber-200 text-amber-600">
                + Descuento adicional
              </Button>
            </div>

            <Table<ItemTabla>
              columns={columns}
              dataSource={[]}
              size="small"
              pagination={false}
              locale={{
                emptyText: (
                  <span className="text-[11px] text-slate-400">
                    No hay productos o servicios agregados.
                  </span>
                ),
              }}
            />

            {/* resumen totales */}
            <div className="mt-4 flex flex-col items-end">
              <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal bruto:</span>
                  <span>
                    $
                    {" "}
                    {resumenTotales.subtotalBruto.toLocaleString("es-CL", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-red-500 mt-1">
                  <span>Descuentos:</span>
                  <span>
                    -$
                    {" "}
                    {resumenTotales.descuentos.toLocaleString("es-CL", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Subtotal:</span>
                  <span>
                    $
                    {" "}
                    {resumenTotales.subtotal.toLocaleString("es-CL", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>IVA (19%):</span>
                  <span>
                    $
                    {" "}
                    {resumenTotales.iva.toLocaleString("es-CL", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <Form.Item<CotizacionEditorValues>
                  name="monto"
                  className="mt-2 mb-0"
                  label={
                    <span className="text-[11px] font-semibold text-slate-800">
                      Total final
                    </span>
                  }
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    size="small"
                    formatter={(value) =>
                      value
                        ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                        : ""
                    }
                    parser={(value) =>
                      value ? Number(value.replace(/\$\s?|(\.)/g, "")) : 0
                    }
                  />
                </Form.Item>
              </div>
            </div>
          </div>

          {/* notas */}
          <Form.Item<CotizacionEditorValues> name="notas" label="Notas">
            <Input.TextArea
              rows={3}
              placeholder="Alcances, exclusiones, condiciones comerciales, etc."
            />
          </Form.Item>

          {/* footer */}
          <div className="mt-3 pt-3 flex items-center justify-between border-t border-slate-200 text-[11px]">
            <span className="text-slate-500">
              Estado inicial: <strong>Borrador</strong>
            </span>
            <div className="flex gap-2">
              <Button size="small" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                size="small"
                type="primary"
                htmlType="submit"
                className="bg-sky-500 hover:bg-sky-600 border-none"
              >
                {mode === "create" ? "Creando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default CotizacionEditorModal;
