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
  FireOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  funnelBeckAPI,
  firematProductosAPI,
  clientesBeckAPI,
  type FunnelBeckOpportunity,
  type ProductoFiremat,
  type ClienteBeck,
  type ContactoClienteBeck,
  type ClienteBeckPayload,
  type ContactoClienteBeckPayload,
} from "../services/api";
import { regionesComunasChile } from "../data/regionesComunasChile";
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
  clienteBeckId?: string | null;
  contactoBeckId?: string | null;
  nombreContactoManual?: string;
  telefonoContactoManual?: string;
  correoContactoManual?: string;
  cargoContactoManual?: string;
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
};

type CotizacionEditorModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<CotizacionEditorValues>;
  onClose: () => void;
  onSubmit: (values: CotizacionEditorValues) => void;
  submitting?: boolean;
  lockFunnelSelection?: boolean;
  canManageGanancia?: boolean;
};

type LineaTabla = {
  key: string;
  tipoLinea: TipoLineaCotizacion;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  gananciaPct: number;
  productoFirematId?: number | null;
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
  source: LineaCotizacion[] | undefined,
  canManageGanancia: boolean
): LineaTabla[] =>
  source?.map((linea) => ({
    key: newKey(),
    tipoLinea: linea.tipoLinea,
    descripcion: linea.descripcion,
    cantidad: linea.cantidad,
    precioUnitario: linea.precioUnitario,
    gananciaPct: canManageGanancia ? Number(linea.gananciaPct ?? 0) : 0,
    productoFirematId: linea.productoFirematId ?? null,
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

const validarRut = (rut: string): boolean => {
  const clean = rut.replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  if (!/^[\dK]$/.test(dv)) return false;
  return true;
};

const formatRut = (raw: string): string => {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${dv}`;
};

const TIPOS_CLIENTE_OPTIONS = [
  { value: "EMPRESA", label: "Empresa" },
  { value: "PERSONA_NATURAL", label: "Persona Natural" },
  { value: "GOBIERNO", label: "Gobierno" },
  { value: "ONG", label: "ONG" },
];

const TIPO_LINEA_OPTIONS = [
  { label: "Manual", value: "MANUAL" },
  { label: "Prod. Firemat", value: "PRODUCTO_FIREMAT" },
  { label: "Producto", value: "PRODUCTO" },
  { label: "Servicio", value: "SERVICIO" },
];

const CotizacionEditorModal: React.FC<CotizacionEditorModalProps> = ({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
  submitting = false,
  lockFunnelSelection = false,
  canManageGanancia = false,
}) => {
  const [form] = Form.useForm<CotizacionEditorValues>();
  const [formEmpresa] = Form.useForm();
  const [formNuevoContacto] = Form.useForm<ContactoClienteBeckPayload>();
  const [modalWidth, setModalWidth] = useState(980);
  const [lineas, setLineas] = useState<LineaTabla[]>([]);
  const [opportunities, setOpportunities] = useState<FunnelBeckOpportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [productos, setProductos] = useState<ProductoFiremat[]>([]);
  const [productosLoading, setProductosLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteBeck[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [contactos, setContactos] = useState<ContactoClienteBeck[]>([]);
  const [contactosLoading, setContactosLoading] = useState(false);
  const [modalEmpresaOpen, setModalEmpresaOpen] = useState(false);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [comunasEmpresa, setComunasEmpresa] = useState<string[]>([]);
  const [modalNuevoContactoOpen, setModalNuevoContactoOpen] = useState(false);
  const [savingNuevoContacto, setSavingNuevoContacto] = useState(false);

  const descuento =
    (Form.useWatch("descuento", form) as number | undefined) ?? 0;
  const aplicaImpuesto =
    (Form.useWatch("aplicaImpuesto", form) as boolean | undefined) ?? true;
  const moneda =
    (Form.useWatch("moneda", form) as "CLP" | "USD" | undefined) ?? "CLP";
  const clienteBeckIdWatched =
    (Form.useWatch("clienteBeckId", form) as string | null | undefined) ?? null;
  const contactoBeckIdWatched =
    (Form.useWatch("contactoBeckId", form) as string | null | undefined) ?? null;
  const contextoOrigen: "BECK" | "FIREMAT" =
    initialValues?.origen === "FIREMAT" ? "FIREMAT" : "BECK";

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === "undefined") return;
      setModalWidth(Math.min(980, window.innerWidth - 24));
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!open) return;

    setLineas(buildLineasState(initialValues?.lineas, canManageGanancia));

    const baseFecha = initialValues?.fecha
      ? dayjs(initialValues.fecha)
      : dayjs();
    const baseVigencia = initialValues?.vigencia
      ? dayjs(initialValues.vigencia)
      : dayjs().add(30, "day");

    form.resetFields();
    form.setFieldsValue({
      numero: initialValues?.numero,
      codigo: initialValues?.codigo,
      funnelBeckId: initialValues?.funnelBeckId,
      clienteBeckId: initialValues?.clienteBeckId ?? null,
      contactoBeckId: initialValues?.contactoBeckId ?? null,
      nombreContactoManual: initialValues?.nombreContactoManual || "",
      telefonoContactoManual: initialValues?.telefonoContactoManual || "",
      correoContactoManual: initialValues?.correoContactoManual || "",
      cargoContactoManual: initialValues?.cargoContactoManual || "",
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
  }, [canManageGanancia, form, initialValues, open]);

  useEffect(() => {
    if (!open) return;
    let ignore = false;

    const loadOpportunities = async () => {
      try {
        setOpportunitiesLoading(true);
        const response = await funnelBeckAPI.listar();
        if (!ignore) setOpportunities(response);
      } catch (error) {
        if (!ignore) {
          setOpportunities([]);
          void message.error("No se pudieron cargar las oportunidades Beck");
        }
        console.error("Error al cargar oportunidades Beck:", error);
      } finally {
        if (!ignore) setOpportunitiesLoading(false);
      }
    };

    void loadOpportunities();
    return () => { ignore = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let ignore = false;

    const loadClientes = async () => {
      setClientesLoading(true);
      try {
        const data = await clientesBeckAPI.listar({ activo: true });
        if (!ignore) setClientes(data);
      } catch {
        if (!ignore) setClientes([]);
      } finally {
        if (!ignore) setClientesLoading(false);
      }
    };

    void loadClientes();
    return () => { ignore = true; };
  }, [open]);

  useEffect(() => {
    if (!clienteBeckIdWatched) {
      setContactos([]);
      return;
    }

    let ignore = false;
    const found = clientes.find((c) => c.id === clienteBeckIdWatched);

    if (found?.contactos !== undefined) {
      setContactos(found.contactos.filter((c) => c.activo));
      return;
    }

    setContactosLoading(true);
    clientesBeckAPI
      .obtener(clienteBeckIdWatched)
      .then((data) => {
        if (!ignore) setContactos((data.contactos ?? []).filter((c) => c.activo));
      })
      .catch(() => {
        if (!ignore) setContactos([]);
      })
      .finally(() => {
        if (!ignore) setContactosLoading(false);
      });

    return () => { ignore = true; };
  }, [clienteBeckIdWatched, clientes]);

  useEffect(() => {
    if (!open) return;
    if (contextoOrigen !== "FIREMAT") return;
    let ignore = false;

    const loadProductos = async () => {
      try {
        setProductosLoading(true);
        const data = await firematProductosAPI.listar({ activo: true });
        if (!ignore) setProductos(data);
      } catch {
        if (!ignore) setProductos([]);
      } finally {
        if (!ignore) setProductosLoading(false);
      }
    };

    void loadProductos();
    return () => { ignore = true; };
  }, [open, contextoOrigen]);

  const patchLinea = (key: string, fields: Partial<Omit<LineaTabla, "key">>) => {
    setLineas((prev) =>
      prev.map((linea) => (linea.key === key ? { ...linea, ...fields } : linea))
    );
  };

  const updateLinea = (
    key: string,
    field: keyof Omit<LineaTabla, "key">,
    value: string | number | null
  ) => {
    patchLinea(key, { [field]: value });
  };

  const eliminarLinea = (key: string) => {
    setLineas((prev) => prev.filter((linea) => linea.key !== key));
  };

  const agregarLinea = (
    tipoLinea: TipoLineaCotizacion,
    descripcion: string,
    precioUnitario = 0,
    productoFirematId?: number | null
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
        productoFirematId: productoFirematId ?? null,
      },
    ]);
  };

  const handleClienteChange = (value?: string) => {
    form.setFieldValue("contactoBeckId", null);
    if (!value) return;
    const found = clientes.find((c) => c.id === value);
    if (found) {
      const nombre = found.nombreEmpresa || found.razonSocial;
      form.setFieldValue("cliente", nombre);
    }
  };

  const handleQuitarCliente = () => {
    form.setFieldValue("clienteBeckId", null);
    form.setFieldValue("contactoBeckId", null);
    form.setFieldValue("cliente", "");
  };

  const handleOpportunityChange = (value?: string) => {
    form.setFieldValue("funnelBeckId", value);
    if (!value) return;

    const selectedOpportunity = opportunities.find((o) => o.id === value);
    if (!selectedOpportunity) return;

    // Si la oportunidad tiene clienteBeckId y no hay cliente seleccionado, autoseleccionar
    const oppClienteId = selectedOpportunity.clienteBeckId as string | null | undefined;
    if (oppClienteId && !clienteBeckIdWatched) {
      form.setFieldValue("clienteBeckId", oppClienteId);
      form.setFieldValue("contactoBeckId", null);
      const found = clientes.find((c) => c.id === oppClienteId);
      if (found) {
        const nombre = found.nombreEmpresa || found.razonSocial;
        const currentCliente = String(form.getFieldValue("cliente") || "").trim();
        if (!currentCliente) form.setFieldValue("cliente", nombre);
      }
    }

    const currentCliente = String(form.getFieldValue("cliente") || "").trim();
    const currentProyecto = String(form.getFieldValue("proyecto") || "").trim();
    const nextCliente =
      typeof selectedOpportunity.empresa === "string"
        ? selectedOpportunity.empresa.trim()
        : "";
    const nextProyecto = String(selectedOpportunity.nombreProyecto || "").trim();

    if (!currentCliente && nextCliente) form.setFieldValue("cliente", nextCliente);
    if ((mode === "create" || !currentProyecto) && nextProyecto)
      form.setFieldValue("proyecto", nextProyecto);
  };

  const filteredOpportunities = useMemo(() => {
    if (!clienteBeckIdWatched) return opportunities;
    return opportunities.filter((o) => {
      const oppClienteId = o.clienteBeckId as string | null | undefined;
      return !oppClienteId || oppClienteId === clienteBeckIdWatched;
    });
  }, [opportunities, clienteBeckIdWatched]);

  const selectedContact = useMemo(
    () => contactos.find((c) => c.id === contactoBeckIdWatched) ?? null,
    [contactos, contactoBeckIdWatched]
  );

  const handleCrearEmpresa = async () => {
    try {
      await formEmpresa.validateFields();
    } catch {
      return;
    }

    const values = formEmpresa.getFieldsValue() as ClienteBeckPayload & { activo: boolean };
    if (!validarRut(String(values.rut || ""))) {
      void message.error("RUT inválido");
      return;
    }

    setSavingEmpresa(true);
    try {
      const payload: ClienteBeckPayload = {
        rut: String(values.rut),
        razonSocial: values.razonSocial,
        nombreEmpresa: values.nombreEmpresa || null,
        telefono: values.telefono || null,
        correo: values.correo || null,
        region: values.region || null,
        comuna: values.comuna || null,
        tipoCliente: values.tipoCliente || null,
        activo: values.activo !== false,
      };

      const nuevoCliente = await clientesBeckAPI.crear(payload);
      const updatedClientes = await clientesBeckAPI.listar({ activo: true });
      setClientes(updatedClientes);

      form.setFieldValue("clienteBeckId", nuevoCliente.id);
      form.setFieldValue("contactoBeckId", null);
      const nombre = nuevoCliente.nombreEmpresa || nuevoCliente.razonSocial;
      form.setFieldValue("cliente", nombre);
      setContactos([]);

      setModalEmpresaOpen(false);
      void message.success(`Empresa "${nombre}" creada y seleccionada`);
    } catch {
      void message.error("No se pudo crear la empresa");
    } finally {
      setSavingEmpresa(false);
    }
  };

  const handleCrearContacto = async () => {
    try {
      await formNuevoContacto.validateFields();
    } catch {
      return;
    }

    if (!clienteBeckIdWatched) return;

    setSavingNuevoContacto(true);
    try {
      const values = formNuevoContacto.getFieldsValue() as ContactoClienteBeckPayload;
      const nuevoContacto = await clientesBeckAPI.agregarContacto(
        clienteBeckIdWatched,
        {
          nombre: values.nombre,
          cargo: values.cargo || null,
          telefono: values.telefono || null,
          correo: values.correo || null,
          principal: false,
          activo: true,
        }
      );

      const clienteActualizado = await clientesBeckAPI.obtener(clienteBeckIdWatched);
      const contactosActualizados = (clienteActualizado.contactos ?? []).filter(
        (c) => c.activo
      );
      setContactos(contactosActualizados);
      form.setFieldValue("contactoBeckId", nuevoContacto.id);

      setModalNuevoContactoOpen(false);
      formNuevoContacto.resetFields();
      void message.success(`Contacto "${values.nombre}" creado y seleccionado`);
    } catch {
      void message.error("No se pudo crear el contacto");
    } finally {
      setSavingNuevoContacto(false);
    }
  };

  const productosOptions = useMemo(
    () =>
      productos.map((p) => ({
        label: `${p.nombre}${p.alertaStockBajo ? ` ⚠ stock: ${p.stockDisponible}` : ""}`,
        value: p.id,
      })),
    [productos]
  );

  const columns: ColumnsType<LineaTabla> = [
    {
      title: "Tipo",
      dataIndex: "tipoLinea",
      key: "tipoLinea",
      width: 140,
      render: (value: TipoLineaCotizacion, record) => (
        <Select
          size="small"
          value={value}
          style={{ width: "100%" }}
          options={
                  contextoOrigen === "FIREMAT"
                    ? TIPO_LINEA_OPTIONS
                    : TIPO_LINEA_OPTIONS.filter((o) => o.value !== "PRODUCTO_FIREMAT")
                }
          onChange={(nextValue: TipoLineaCotizacion) => {
            const updates: Partial<LineaTabla> = { tipoLinea: nextValue };
            if (nextValue !== "PRODUCTO_FIREMAT") {
              updates.productoFirematId = null;
            }
            patchLinea(record.key, updates);
          }}
        />
      ),
    },
    {
      title: "Descripcion",
      dataIndex: "descripcion",
      key: "descripcion",
      render: (value: string, record) => {
        if (record.tipoLinea === "PRODUCTO_FIREMAT") {
          return (
            <Select
              size="small"
              showSearch
              style={{ width: "100%" }}
              placeholder="Buscar producto Firemat..."
              value={record.productoFirematId ?? undefined}
              loading={productosLoading}
              optionFilterProp="label"
              options={productosOptions}
              onChange={(productId: number) => {
                const prod = productos.find((p) => p.id === productId);
                if (prod) {
                  patchLinea(record.key, {
                    productoFirematId: prod.id,
                    descripcion: prod.nombre,
                    precioUnitario: prod.precio,
                  });
                }
              }}
            />
          );
        }
        return (
          <Input
            size="small"
            value={value}
            onChange={(event) =>
              updateLinea(record.key, "descripcion", event.target.value)
            }
          />
        );
      },
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
    ...(canManageGanancia
      ? [
          {
            title: "% Ganancia",
            dataIndex: "gananciaPct",
            key: "gananciaPct",
            width: 110,
            align: "right" as const,
            render: (value: number, record: LineaTabla) => (
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
        ]
      : []),
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
            canManageGanancia ? record.gananciaPct : 0
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
          canManageGanancia ? linea.gananciaPct : 0
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
  }, [aplicaImpuesto, canManageGanancia, descuento, lineas]);

  const handleFinish = (values: CotizacionEditorValues) => {
    onSubmit({
      ...values,
      lineas: lineas.map((linea, index) => {
        const subtotal = calculateLineaSubtotal(
          linea.cantidad,
          linea.precioUnitario,
          canManageGanancia ? linea.gananciaPct : 0
        );
        return {
          tipoLinea: linea.tipoLinea,
          descripcion: linea.descripcion,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          subtotal,
          orden: index + 1,
          gananciaPct: canManageGanancia ? Number(linea.gananciaPct ?? 0) : 0,
          productoFirematId:
            linea.tipoLinea === "PRODUCTO_FIREMAT"
              ? (linea.productoFirematId ?? undefined)
              : undefined,
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
              Cotizacion de sellos cortafuego · BECK
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShopOutlined className="text-amber-500" />
                Informacion del cliente
              </h3>

              {/* Cliente / empresa registrada */}
              <Form.Item<CotizacionEditorValues>
                name="clienteBeckId"
                label={
                  <span className="text-xs font-medium text-slate-800">
                    Cliente / empresa registrada
                  </span>
                }
              >
                <Select
                  showSearch
                  allowClear
                  size="small"
                  loading={clientesLoading}
                  disabled={submitting}
                  placeholder="Seleccionar cliente por RUT, razón social o nombre empresa"
                  optionFilterProp="label"
                  options={clientes.map((c) => ({
                    label: `${c.nombreEmpresa || c.razonSocial} — ${c.rut}`,
                    value: c.id,
                  }))}
                  onChange={(value) => handleClienteChange(value)}
                  notFoundContent={
                    clientesLoading ? "Cargando..." : "Sin resultados"
                  }
                />
              </Form.Item>

              {/* Cliente / empresa no registrada — solo visible si no hay cliente registrado */}
              {!clienteBeckIdWatched && (
                <Form.Item<CotizacionEditorValues>
                  name="cliente"
                  dependencies={["clienteBeckId"]}
                  label={
                    <span className="text-xs font-medium text-slate-800">
                      Cliente / empresa no registrada
                    </span>
                  }
                  rules={[
                    {
                      validator: async (_, value) => {
                        const regId = form.getFieldValue(
                          "clienteBeckId"
                        ) as string | null;
                        const nombre = String(value || "").trim();
                        if (!regId && !nombre) {
                          return Promise.reject(
                            new Error(
                              "Selecciona un cliente registrado o escribe el nombre"
                            )
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    size="small"
                    prefix={<UserOutlined className="mr-1 text-slate-400" />}
                    placeholder="Constructora XYZ, Cliente particular…"
                  />
                </Form.Item>
              )}

              {clienteBeckIdWatched && (
                <div className="mb-2 flex justify-end">
                  <Button
                    size="small"
                    danger
                    type="text"
                    className="text-[11px]"
                    onClick={handleQuitarCliente}
                  >
                    Quitar cliente asociado
                  </Button>
                </div>
              )}

              {/* Contacto — híbrido: dropdown si hay cliente Beck, inputs manuales si no */}
              {clienteBeckIdWatched ? (
                <>
                  <Form.Item<CotizacionEditorValues>
                    name="contactoBeckId"
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] text-slate-600">
                          Contacto asociado
                        </span>
                        <Button
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          className="text-[11px] p-0 h-auto leading-none"
                          disabled={submitting}
                          onClick={() => {
                            formNuevoContacto.resetFields();
                            setModalNuevoContactoOpen(true);
                          }}
                        >
                          Nuevo contacto
                        </Button>
                      </div>
                    }
                  >
                    <Select
                      showSearch
                      allowClear
                      size="small"
                      loading={contactosLoading}
                      disabled={submitting}
                      placeholder="Seleccionar contacto"
                      optionFilterProp="label"
                      options={contactos.map((c) => ({
                        label: `${c.nombre}${c.cargo ? ` — ${c.cargo}` : ""}`,
                        value: c.id,
                      }))}
                      notFoundContent="Este cliente no tiene contactos registrados"
                    />
                  </Form.Item>
                  {selectedContact && (
                    <div className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 space-y-0.5">
                      {selectedContact.telefono && (
                        <div>
                          <span className="font-medium">Teléfono:</span>{" "}
                          {selectedContact.telefono}
                        </div>
                      )}
                      {selectedContact.correo && (
                        <div>
                          <span className="font-medium">Correo:</span>{" "}
                          {selectedContact.correo}
                        </div>
                      )}
                      {selectedContact.cargo && (
                        <div>
                          <span className="font-medium">Cargo:</span>{" "}
                          {selectedContact.cargo}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      Contacto manual
                    </span>
                  </div>
                  <Form.Item<CotizacionEditorValues>
                    name="nombreContactoManual"
                    label={
                      <span className="text-[11px] text-slate-600">
                        Nombre contacto
                      </span>
                    }
                  >
                    <Input
                      size="small"
                      placeholder="Ej: Juan Pérez"
                      disabled={submitting}
                    />
                  </Form.Item>
                  <div className="grid grid-cols-2 gap-2">
                    <Form.Item<CotizacionEditorValues>
                      name="telefonoContactoManual"
                      label={
                        <span className="text-[11px] text-slate-600">
                          Teléfono contacto
                        </span>
                      }
                      rules={[
                        {
                          validator: (_, value: string) => {
                            if (!value) return Promise.resolve();
                            if (!/^(9\d{8}|56\d{9}|\+56\d{9})$/.test(value))
                              return Promise.reject(
                                new Error("Ej: 912345678 / 56912345678 / +56912345678")
                              );
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        size="small"
                        placeholder="912345678"
                        disabled={submitting}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const hasPlus = raw.startsWith("+");
                          const digits = raw.replace(/\D/g, "");
                          const maxDigits =
                            hasPlus || digits.startsWith("56") ? 11 : 9;
                          const limited = digits.slice(0, maxDigits);
                          form.setFieldValue(
                            "telefonoContactoManual",
                            hasPlus ? `+${limited}` : limited
                          );
                        }}
                      />
                    </Form.Item>
                    <Form.Item<CotizacionEditorValues>
                      name="correoContactoManual"
                      label={
                        <span className="text-[11px] text-slate-600">
                          Correo contacto
                        </span>
                      }
                      rules={[
                        {
                          validator: (_, value: string) => {
                            if (!value) return Promise.resolve();
                            if (
                              !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
                                value.trim()
                              )
                            )
                              return Promise.reject(
                                new Error("Correo inválido")
                              );
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        size="small"
                        placeholder="contacto@empresa.cl"
                        disabled={submitting}
                      />
                    </Form.Item>
                  </div>
                  <Form.Item<CotizacionEditorValues>
                    name="cargoContactoManual"
                    label={
                      <span className="text-[11px] text-slate-600">Cargo</span>
                    }
                  >
                    <Input
                      size="small"
                      placeholder="Ej: Supervisor de obra"
                      disabled={submitting}
                    />
                  </Form.Item>
                </>
              )}

              {/* Oportunidad Beck */}
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
                  placeholder={
                    clienteBeckIdWatched
                      ? "Oportunidades de este cliente"
                      : "Seleccionar oportunidad Beck"
                  }
                  optionFilterProp="label"
                  options={filteredOpportunities.map((opportunity) => ({
                    label: getOpportunityLabel(opportunity),
                    value: opportunity.id,
                  }))}
                  notFoundContent={
                    clienteBeckIdWatched
                      ? "Sin oportunidades para este cliente"
                      : "Sin oportunidades"
                  }
                  onChange={(value) => handleOpportunityChange(value)}
                />
              </Form.Item>

              {/* Crear empresa */}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                size="small"
                className="mt-1 mb-2 border-none bg-sky-500 text-xs hover:bg-sky-600"
                onClick={() => {
                  formEmpresa.resetFields();
                  setComunasEmpresa([]);
                  setModalEmpresaOpen(true);
                }}
              >
                Crear empresa
              </Button>
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
                    options={[{ label: "BECK", value: "BECK" }]}
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
                className="border-slate-200 text-slate-600"
                onClick={() => agregarLinea("MANUAL", "")}
              >
                + Linea manual
              </Button>
              {contextoOrigen === "FIREMAT" && (
                <Button
                  size="small"
                  className="border-orange-200 text-orange-600"
                  icon={<FireOutlined />}
                  onClick={() => agregarLinea("PRODUCTO_FIREMAT", "", 0)}
                >
                  + Producto Firemat
                </Button>
              )}
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
              scroll={{ x: 760 }}
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

      {/* Modal rápido: Nuevo contacto */}
      <Modal
        open={modalNuevoContactoOpen}
        onCancel={() => {
          if (!savingNuevoContacto) setModalNuevoContactoOpen(false);
        }}
        title="Agregar contacto al cliente"
        footer={null}
        width={420}
        destroyOnHidden
      >
        <Form form={formNuevoContacto} layout="vertical" size="small">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "El nombre es requerido" }]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>

          <Form.Item name="cargo" label="Cargo">
            <Input placeholder="Ej: Jefe de compras" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-3">
            <Form.Item
              name="telefono"
              label="Teléfono"
              rules={[
                {
                  validator: (_, value: string) => {
                    if (!value) return Promise.resolve();
                    if (!/^(9\d{8}|56\d{9}|\+56\d{9})$/.test(value))
                      return Promise.reject(
                        new Error("Ej: 912345678 / 56912345678")
                      );
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="912345678"
                onChange={(e) => {
                  const raw = e.target.value;
                  const hasPlus = raw.startsWith("+");
                  const digits = raw.replace(/\D/g, "");
                  const maxDigits =
                    hasPlus || digits.startsWith("56") ? 11 : 9;
                  const limited = digits.slice(0, maxDigits);
                  formNuevoContacto.setFieldValue(
                    "telefono",
                    hasPlus ? `+${limited}` : limited
                  );
                }}
              />
            </Form.Item>

            <Form.Item
              name="correo"
              label="Correo"
              rules={[
                {
                  validator: (_, value: string) => {
                    if (!value) return Promise.resolve();
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()))
                      return Promise.reject(new Error("Correo inválido"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="contacto@empresa.cl" />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 mt-3 border-t border-slate-200 pt-3">
            <Button
              size="small"
              onClick={() => setModalNuevoContactoOpen(false)}
              disabled={savingNuevoContacto}
            >
              Cancelar
            </Button>
            <Button
              size="small"
              type="primary"
              loading={savingNuevoContacto}
              className="bg-sky-500 border-none hover:bg-sky-600"
              onClick={() => {
                void handleCrearContacto();
              }}
            >
              Agregar contacto
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal rápido: Crear empresa Beck */}
      <Modal
        open={modalEmpresaOpen}
        onCancel={() => {
          if (!savingEmpresa) setModalEmpresaOpen(false);
        }}
        title="Crear empresa / cliente Beck"
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Form form={formEmpresa} layout="vertical" size="small">
          <div className="grid grid-cols-2 gap-x-3">
            <Form.Item
              name="rut"
              label="RUT"
              className="col-span-2"
              normalize={(v) => (v ? formatRut(String(v)) : v)}
              rules={[
                { required: true, message: "RUT requerido" },
                {
                  validator: (_, value) =>
                    !value || validarRut(String(value))
                      ? Promise.resolve()
                      : Promise.reject(new Error("RUT inválido")),
                },
              ]}
            >
              <Input placeholder="12.345.678-9" />
            </Form.Item>

            <Form.Item
              name="razonSocial"
              label="Razón social"
              className="col-span-2"
              rules={[{ required: true, message: "Razón social requerida" }]}
            >
              <Input placeholder="Nombre legal" />
            </Form.Item>

            <Form.Item
              name="nombreEmpresa"
              label="Nombre empresa"
              className="col-span-2"
            >
              <Input placeholder="Nombre comercial (opcional)" />
            </Form.Item>

            <Form.Item name="telefono" label="Teléfono">
              <Input placeholder="+56 9 1234 5678" />
            </Form.Item>

            <Form.Item
              name="correo"
              label="Correo"
              rules={[{ type: "email", message: "Correo inválido" }]}
            >
              <Input placeholder="contacto@empresa.cl" />
            </Form.Item>

            <Form.Item name="region" label="Región">
              <Select
                allowClear
                placeholder="Selecciona región"
                onChange={(value: string) => {
                  const found = regionesComunasChile.find(
                    (r) => r.nombre === value
                  );
                  setComunasEmpresa(found?.comunas ?? []);
                  formEmpresa.setFieldValue("comuna", undefined);
                }}
                options={regionesComunasChile.map((r) => ({
                  label: r.nombre,
                  value: r.nombre,
                }))}
              />
            </Form.Item>

            <Form.Item name="comuna" label="Comuna">
              <Select
                allowClear
                placeholder="Selecciona comuna"
                disabled={!comunasEmpresa.length}
                options={comunasEmpresa.map((c) => ({ label: c, value: c }))}
              />
            </Form.Item>

            <Form.Item name="tipoCliente" label="Tipo cliente">
              <Select
                allowClear
                placeholder="Selecciona tipo"
                options={TIPOS_CLIENTE_OPTIONS}
              />
            </Form.Item>

            <Form.Item
              name="activo"
              label="Estado activo"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch
                size="small"
                checkedChildren="Activo"
                unCheckedChildren="Inactivo"
              />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 mt-3 border-t border-slate-200 pt-3">
            <Button
              size="small"
              onClick={() => setModalEmpresaOpen(false)}
              disabled={savingEmpresa}
            >
              Cancelar
            </Button>
            <Button
              size="small"
              type="primary"
              loading={savingEmpresa}
              className="bg-sky-500 border-none hover:bg-sky-600"
              onClick={() => { void handleCrearEmpresa(); }}
            >
              Crear empresa
            </Button>
          </div>
        </Form>
      </Modal>
    </Modal>
  );
};

export default CotizacionEditorModal;
