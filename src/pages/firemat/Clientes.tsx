import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import {
  CheckOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import * as XLSX from "xlsx";
import {
  clientesFirematAPI,
  type ClienteFiremat,
  type ClienteFirematPayload,
  type ContactoClienteFiremat,
  type ContactoClienteFirematPayload,
  type ImportarClientesResult,
} from "../../services/api";
import { regionesComunasChile } from "../../data/regionesComunasChile";

const { Option } = Select;
const { Text, Title } = Typography;

const formatRut = (raw: string): string => {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${dv}`;
};

const TIPOS_CLIENTE = [
  { label: "Cliente final", value: "cliente_final" },
  { label: "Ferretería", value: "ferreteria" },
  { label: "Broker", value: "broker" },
  { label: "Redistribuidor", value: "redistribuidor" },
  { label: "Instalador", value: "instalador" },
  { label: "Constructora", value: "constructora" },
  { label: "Otro", value: "otro" },
];

const CANALES_VENTA = [
  { label: "Venta directa", value: "venta_directa" },
  { label: "Broker", value: "broker" },
  { label: "Ferretería", value: "ferreteria" },
  { label: "Redistribuidor", value: "redistribuidor" },
  { label: "Instalador", value: "instalador" },
  { label: "Recompra", value: "recompra" },
  { label: "Otro", value: "otro" },
];

const extractBackendMsg = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  } | null;
  return (
    e?.response?.data?.error ??
    e?.response?.data?.message ??
    e?.message ??
    fallback
  );
};

interface OportunidadFiremat {
  id: string;
  nombreProyecto?: string | null;
  empresa?: string | null;
  etapa?: string | null;
  estadoCierre?: string | null;
  valorOriginal?: number | null;
  monedaOriginal?: string | null;
  vendedor?: string | null;
  createdAt?: string | null;
}

type FiltroActivo = "todos" | "activos" | "inactivos";
type ClienteFirematEmailFields = ClienteFiremat & {
  email?: string | null;
  mail?: string | null;
};

type ClienteFirematFormValues = ClienteFirematPayload & {
  email?: string | null;
};

const ClientesFiremat: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteFiremat[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("activos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteFiremat | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [regionSeleccionada, setRegionSeleccionada] = useState<string>("");
  const [form] = Form.useForm<ClienteFirematFormValues>();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteFiremat | null>(null);
  const [contactos, setContactos] = useState<ContactoClienteFiremat[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadFiremat[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [contactoModalOpen, setContactoModalOpen] = useState(false);
  const [editingContacto, setEditingContacto] = useState<ContactoClienteFiremat | null>(null);
  const [contactoLoading, setContactoLoading] = useState(false);
  const [contactoForm] = Form.useForm<ContactoClienteFirematPayload>();

  const [importarModalOpen, setImportarModalOpen] = useState(false);
  const [importarFile, setImportarFile] = useState<File | null>(null);
  const [importarFileList, setImportarFileList] = useState<UploadFile[]>([]);
  const [importarLoading, setImportarLoading] = useState(false);
  const [resultadoImportar, setResultadoImportar] = useState<ImportarClientesResult | null>(null);
  const [resultadoModalOpen, setResultadoModalOpen] = useState(false);

  const fetchClientes = useCallback(
    async (params: { q?: string; activo?: boolean } = {}) => {
      setLoading(true);
      try {
        setClientes(await clientesFirematAPI.listar(params));
      } catch {
        message.error("Error al cargar clientes");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchDetalle = useCallback(async (clienteId: string) => {
    setLoadingDetail(true);
    try {
      const [cliente, opps] = await Promise.all([
        clientesFirematAPI.obtener(clienteId),
        clientesFirematAPI.oportunidades(clienteId),
      ]);
      setSelectedCliente(cliente);
      setContactos(cliente.contactos ?? []);
      setOportunidades(opps as OportunidadFiremat[]);
    } catch {
      message.error("Error al cargar detalle del cliente");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void fetchClientes({ activo: true });
  }, [fetchClientes]);

  const buildParams = (q: string, filtro: FiltroActivo) => {
    const params: { q?: string; activo?: boolean } = {};
    if (q.trim()) params.q = q.trim();
    if (filtro === "activos") params.activo = true;
    if (filtro === "inactivos") params.activo = false;
    return params;
  };

  const handleBuscar = () =>
    void fetchClientes(buildParams(searchInput, filtroActivo));

  const handleFiltroChange = (v: FiltroActivo) => {
    setFiltroActivo(v);
    void fetchClientes(buildParams(searchInput, v));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBuscar();
  };

  const abrirCrear = () => {
    setEditingCliente(null);
    form.resetFields();
    form.setFieldsValue({ activo: true });
    setRegionSeleccionada("");
    setModalOpen(true);
  };

  const abrirEditar = (cliente: ClienteFiremat) => {
    const clienteEmail = cliente as ClienteFirematEmailFields;
    setEditingCliente(cliente);
    setRegionSeleccionada(cliente.region ?? "");
    form.setFieldsValue({
      rut: cliente.rut ? formatRut(cliente.rut) : undefined,
      nombre: cliente.nombre,
      razonSocial: cliente.razonSocial ?? undefined,
      nombreEmpresa: cliente.nombreEmpresa ?? undefined,
      direccion: cliente.direccion ?? undefined,
      telefono: cliente.telefono ?? undefined,
      email: clienteEmail.email ?? undefined,
      region: cliente.region ?? undefined,
      comuna: cliente.comuna ?? undefined,
      tipoCliente: cliente.tipoCliente ?? undefined,
      canalVenta: cliente.canalVenta ?? undefined,
      activo: cliente.activo,
    });
    setModalOpen(true);
  };

  const handleGuardarCliente = async (values: ClienteFirematFormValues) => {
    setModalLoading(true);
    try {
      const payload: ClienteFirematPayload & { email?: string | null } = {
        ...values,
        rut: values.rut ? formatRut(values.rut) : null,
        email: values.email,
        tipoCliente: values.tipoCliente,
        canalVenta: values.canalVenta,
      };
      if (editingCliente) {
        await clientesFirematAPI.actualizar(editingCliente.id, payload);
        message.success("Cliente actualizado");
        if (selectedCliente?.id === editingCliente.id) {
          void fetchDetalle(editingCliente.id);
        }
      } else {
        await clientesFirematAPI.crear(payload);
        message.success("Cliente creado");
      }
      setModalOpen(false);
      void fetchClientes();
    } catch (err: unknown) {
      message.error(extractBackendMsg(err, "Error al guardar cliente"));
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleEstado = async (cliente: ClienteFiremat) => {
    try {
      await clientesFirematAPI.toggleEstado(cliente.id, !cliente.activo);
      message.success(`Cliente ${!cliente.activo ? "activado" : "desactivado"}`);
      void fetchClientes(buildParams(searchInput, filtroActivo));
      if (selectedCliente?.id === cliente.id) void fetchDetalle(cliente.id);
    } catch {
      message.error("Error al cambiar estado del cliente");
    }
  };

  const abrirDetalle = (cliente: ClienteFiremat) => {
    setSelectedCliente(cliente);
    setContactos(cliente.contactos ?? []);
    setOportunidades([]);
    setDrawerOpen(true);
    void fetchDetalle(cliente.id);
  };

  const abrirAgregarContacto = (cliente?: ClienteFiremat) => {
    if (cliente) {
      setSelectedCliente(cliente);
      setContactos(cliente.contactos ?? []);
      setOportunidades([]);
    }
    setEditingContacto(null);
    contactoForm.resetFields();
    contactoForm.setFieldsValue({ activo: true, principal: false });
    setContactoModalOpen(true);
  };

  const abrirEditarContacto = (contacto: ContactoClienteFiremat) => {
    setEditingContacto(contacto);
    contactoForm.setFieldsValue({
      nombre: contacto.nombre,
      cargo: contacto.cargo ?? undefined,
      telefono: contacto.telefono ?? undefined,
      correo: contacto.correo ?? undefined,
      principal: contacto.principal,
      activo: contacto.activo,
      observaciones: contacto.observaciones ?? undefined,
    });
    setContactoModalOpen(true);
  };

  const handleGuardarContacto = async (values: ContactoClienteFirematPayload) => {
    if (!selectedCliente) return;
    setContactoLoading(true);
    try {
      if (editingContacto) {
        await clientesFirematAPI.actualizarContacto(editingContacto.id, values);
        message.success("Contacto actualizado");
      } else {
        await clientesFirematAPI.agregarContacto(selectedCliente.id, values);
        message.success("Contacto agregado");
      }
      setContactoModalOpen(false);
      void fetchDetalle(selectedCliente.id);
      void fetchClientes(buildParams(searchInput, filtroActivo));
    } catch (err: unknown) {
      message.error(extractBackendMsg(err, "Error al guardar contacto"));
    } finally {
      setContactoLoading(false);
    }
  };

  const handleToggleContacto = async (contacto: ContactoClienteFiremat) => {
    try {
      await clientesFirematAPI.toggleEstadoContacto(contacto.id, !contacto.activo);
      message.success(`Contacto ${!contacto.activo ? "activado" : "desactivado"}`);
      if (selectedCliente) {
        void fetchDetalle(selectedCliente.id);
        void fetchClientes(buildParams(searchInput, filtroActivo));
      }
    } catch {
      message.error("Error al cambiar estado del contacto");
    }
  };

  // ── Columnas tabla principal ──────────────────────────────────────────────

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      [
        "RUT",
        "Nombre",
        "Razón Social",
        "Nombre Empresa",
        "Teléfono",
        "Email",
        "Región",
        "Comuna",
        "Dirección",
        "Tipo Cliente",
        "Canal Venta",
      ],
      [
        "77.777.777-7",
        "Demo",
        "Demo SpA",
        "Constructora Demo",
        "+56912345678",
        "demo@empresa.cl",
        "Región Metropolitana",
        "Providencia",
        "Av Demo 123",
        "Cliente final",
        "Venta directa",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Clientes Firemat");
    XLSX.writeFile(wb, "plantilla_clientes_firemat.xlsx");
  };

  const handleImportar = async () => {
    if (!importarFile) {
      message.error("Selecciona un archivo .xlsx o .csv primero");
      return;
    }

    setImportarLoading(true);
    message.loading({ content: "Importando clientes Firemat...", key: "importar-firemat", duration: 0 });
    try {
      const resultado = await clientesFirematAPI.importar(importarFile);
      setImportarModalOpen(false);
      setImportarFile(null);
      setImportarFileList([]);
      await fetchClientes(buildParams(searchInput, filtroActivo));
      setResultadoImportar(resultado);
      setResultadoModalOpen(true);
    } catch (err: unknown) {
      message.error({ content: extractBackendMsg(err, "Error al importar clientes Firemat"), key: "importar-firemat" });
    } finally {
      message.destroy("importar-firemat");
      setImportarLoading(false);
    }
  };

  const columns: ColumnsType<ClienteFiremat> = [
    {
      title: "RUT",
      dataIndex: "rut",
      key: "rut",
      width: 120,
      render: (v: string | null) =>
        v ? <Text className="font-mono text-xs">{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      width: 180,
      ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Razón Social",
      dataIndex: "razonSocial",
      key: "razonSocial",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Nombre Empresa",
      dataIndex: "nombreEmpresa",
      key: "nombreEmpresa",
      width: 160,
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Teléfono",
      dataIndex: "telefono",
      key: "telefono",
      width: 130,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Email",
      key: "email",
      width: 180,
      ellipsis: true,
      render: (_: unknown, record: ClienteFiremat) => {
        const cliente = record as ClienteFirematEmailFields;
        return cliente.email ?? <Text type="secondary">—</Text>;
      },
    },
    {
      title: "Región",
      dataIndex: "region",
      key: "region",
      width: 160,
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Comuna",
      dataIndex: "comuna",
      key: "comuna",
      width: 130,
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Tipo",
      dataIndex: "tipoCliente",
      key: "tipoCliente",
      width: 120,
      render: (v: string | null) =>
        v ? (
          <Tag>{TIPOS_CLIENTE.find((t) => t.value === v)?.label ?? v}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Canal Venta",
      dataIndex: "canalVenta",
      key: "canalVenta",
      width: 120,
      render: (v: string | null) =>
        v ? (
          <Tag color="volcano">{CANALES_VENTA.find((c) => c.value === v)?.label ?? v}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Estado",
      dataIndex: "activo",
      key: "activo",
      width: 90,
      render: (v: boolean) =>
        v ? (
          <Badge status="success" text="Activo" />
        ) : (
          <Badge status="default" text="Inactivo" />
        ),
    },
    {
      title: "Contactos",
      key: "contactos",
      width: 110,
      render: (_: unknown, r: ClienteFiremat) => (
        <Space size={4} wrap>
          <Tag
            color="red"
            className="cursor-pointer"
            onClick={() => abrirDetalle(r)}
            style={{ marginInlineEnd: 0 }}
          >
            {r.contactos?.length ?? 0}
          </Tag>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => abrirAgregarContacto(r)}
            title="Agregar contacto"
            className="!h-5 !px-1"
          />
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_: unknown, record: ClienteFiremat) => (
        <Space size="small" wrap>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => abrirDetalle(record)}
            title="Ver detalle"
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => abrirEditar(record)}
            title="Editar"
          />
          <Popconfirm
            title={`¿${record.activo ? "Desactivar" : "Activar"} este cliente?`}
            onConfirm={() => handleToggleEstado(record)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="text"
              size="small"
              icon={record.activo ? <StopOutlined /> : <CheckOutlined />}
              danger={record.activo}
              title={record.activo ? "Desactivar" : "Activar"}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Columnas contactos ────────────────────────────────────────────────────

  const contactoColumns: ColumnsType<ContactoClienteFiremat> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      width: 160,
      ellipsis: true,
      render: (v: string, r: ContactoClienteFiremat) => (
        <Text strong={r.principal}>{v}</Text>
      ),
    },
    {
      title: "Cargo",
      dataIndex: "cargo",
      key: "cargo",
      width: 120,
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Teléfono",
      dataIndex: "telefono",
      key: "telefono",
      width: 130,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Correo",
      dataIndex: "correo",
      key: "correo",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Principal",
      dataIndex: "principal",
      key: "principal",
      width: 90,
      render: (v: boolean) =>
        v ? <Tag color="gold">Principal</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Estado",
      dataIndex: "activo",
      key: "activo",
      width: 90,
      render: (v: boolean) =>
        v ? (
          <Badge status="success" text="Activo" />
        ) : (
          <Badge status="default" text="Inactivo" />
        ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 90,
      render: (_: unknown, record: ContactoClienteFiremat) => (
        <Space size="small" wrap>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => abrirEditarContacto(record)}
            title="Editar"
          />
          <Popconfirm
            title={`¿${record.activo ? "Desactivar" : "Activar"} contacto?`}
            onConfirm={() => handleToggleContacto(record)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="text"
              size="small"
              icon={record.activo ? <StopOutlined /> : <CheckOutlined />}
              danger={record.activo}
              title={record.activo ? "Desactivar" : "Activar"}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Columnas oportunidades ────────────────────────────────────────────────

  const oppsColumns: ColumnsType<OportunidadFiremat> = [
    {
      title: "Proyecto",
      dataIndex: "nombreProyecto",
      key: "nombreProyecto",
      width: 180,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Empresa",
      dataIndex: "empresa",
      key: "empresa",
      width: 140,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Etapa",
      dataIndex: "etapa",
      key: "etapa",
      width: 110,
      render: (v: string | null) =>
        v ? <Tag color="red">{v}</Tag> : "—",
    },
    {
      title: "Estado cierre",
      dataIndex: "estadoCierre",
      key: "estadoCierre",
      width: 120,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Valor",
      key: "valor",
      width: 130,
      render: (_: unknown, r: OportunidadFiremat) =>
        r.valorOriginal != null
          ? `${r.monedaOriginal ?? ""} ${r.valorOriginal.toLocaleString("es-CL")}`
          : "—",
    },
    {
      title: "Vendedor",
      dataIndex: "vendedor",
      key: "vendedor",
      width: 120,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Fecha",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 100,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString("es-CL") : "—",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center justify-between">
        <div>
          <Title level={4} className="!mb-0 !text-slate-800">
            Clientes Firemat
          </Title>
          <Text type="secondary" className="text-xs">
            Maestro de clientes · Nombre como identificador principal
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={descargarPlantilla}
            disabled={importarLoading}
          >
            Descargar plantilla Excel
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportarModalOpen(true)}
            disabled={importarLoading}
          >
            Importar Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={abrirCrear}
            danger
          >
            Nuevo cliente
          </Button>
        </Space>
      </div>

      {/* Filtros */}
      <Card size="small" className="border-slate-200">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <Input
            allowClear
            placeholder="Buscar por RUT, nombre, razón social o nombre empresa…"
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0"
            style={{ minWidth: 220 }}
          />
          <Select
            value={filtroActivo}
            onChange={handleFiltroChange}
            style={{ width: 140 }}
          >
            <Option value="todos">Todos</Option>
            <Option value="activos">Activos</Option>
            <Option value="inactivos">Inactivos</Option>
          </Select>
          <Button onClick={handleBuscar} loading={loading}>
            Buscar
          </Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="border-slate-200 overflow-hidden">
        <Table
          dataSource={clientes}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: "max-content" }}
          tableLayout="auto"
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (t) => `${t} clientes`,
          }}
          locale={{ emptyText: "No hay clientes registrados" }}
        />
      </Card>

      {/* ── Modal crear / editar cliente ── */}
      <Modal
        title={editingCliente ? "Editar cliente" : "Nuevo cliente"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={640}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            loading={modalLoading}
            onClick={() => form.submit()}
            style={{
              backgroundColor: "#475569",
              borderColor: "#475569",
              color: "#ffffff",
            }}
          >
            {editingCliente ? "Guardar cambios" : "Crear cliente"}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGuardarCliente}
          className="mt-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item name="rut" label="RUT">
              <Input
                placeholder="12.345.678-9"
                onChange={(e) => {
                  const formatted = formatRut(e.target.value);
                  form.setFieldValue("rut", formatted);
                }}
              />
            </Form.Item>

            <Form.Item
              name="nombre"
              label="Nombre"
              rules={[{ required: true, message: "El nombre es requerido" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="razonSocial" label="Razón Social">
              <Input />
            </Form.Item>

            <Form.Item name="nombreEmpresa" label="Nombre Empresa">
              <Input />
            </Form.Item>

            <Form.Item name="tipoCliente" label="Tipo de Cliente">
              <Select
                placeholder="Seleccionar tipo"
                allowClear
                options={TIPOS_CLIENTE}
              />
            </Form.Item>

            <Form.Item name="canalVenta" label="Canal de Venta">
              <Select
                placeholder="Seleccionar canal"
                allowClear
                options={CANALES_VENTA}
              />
            </Form.Item>

            <Form.Item
              name="telefono"
              label="Teléfono"
              rules={[
                {
                  validator: (_, value: string) => {
                    if (!value) return Promise.resolve();
                    if (!/^(9\d{8}|56\d{9}|\+56\d{9})$/.test(value))
                      return Promise.reject(new Error("Ingresa un teléfono válido"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="Ej: 912345678 / 56912345678 / +56912345678"
                onChange={(e) => {
                  const raw = e.target.value;
                  const hasPlus = raw.startsWith("+");
                  const digits = raw.replace(/\D/g, "");
                  const maxDigits = hasPlus || digits.startsWith("56") ? 11 : 9;
                  const limited = digits.slice(0, maxDigits);
                  form.setFieldValue("telefono", hasPlus ? `+${limited}` : limited);
                }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                {
                  validator: (_, value: string) => {
                    if (!value) return Promise.resolve();
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()))
                      return Promise.reject(new Error("Ingresa un email válido"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="contacto@empresa.cl" />
            </Form.Item>

            <Form.Item name="region" label="Región">
              <Select
                placeholder="Seleccionar región"
                allowClear
                showSearch
                onChange={(val: string) => {
                  setRegionSeleccionada(val ?? "");
                  form.setFieldValue("comuna", undefined);
                }}
              >
                {regionesComunasChile.map((r) => (
                  <Option key={r.nombre} value={r.nombre}>
                    {r.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="comuna" label="Comuna">
              <Select
                placeholder={regionSeleccionada ? "Seleccionar comuna" : "Primero selecciona una región"}
                allowClear
                showSearch
                disabled={!regionSeleccionada}
              >
                {(regionesComunasChile.find((r) => r.nombre === regionSeleccionada)?.comunas ?? []).map((c) => (
                  <Option key={c} value={c}>
                    {c}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="direccion" label="Dirección">
            <Input />
          </Form.Item>

          <Form.Item name="activo" label="Estado">
            <Select>
              <Option value={true}>Activo</Option>
              <Option value={false}>Inactivo</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Drawer detalle cliente ── */}
      <Drawer
        title={selectedCliente ? selectedCliente.nombre : "Detalle cliente"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={760}
        extra={
          selectedCliente && (
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                if (selectedCliente) abrirEditar(selectedCliente);
              }}
            >
              Editar
            </Button>
          )
        }
      >
        <Spin spinning={loadingDetail}>
          {selectedCliente && (
            (() => {
              const selectedClienteEmail =
                selectedCliente as ClienteFirematEmailFields;
              return (
            <>
              <Descriptions
                column={{ xs: 1, sm: 2 }}
                size="small"
                bordered
                className="mb-4"
              >
                <Descriptions.Item label="RUT">
                  <Text className="font-mono">{selectedCliente.rut ?? "—"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Nombre">
                  <Text strong>{selectedCliente.nombre}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Razón Social">
                  {selectedCliente.razonSocial ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Nombre Empresa">
                  {selectedCliente.nombreEmpresa ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {TIPOS_CLIENTE.find((t) => t.value === selectedCliente.tipoCliente)?.label ??
                    selectedCliente.tipoCliente ??
                    "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Canal Venta">
                  {CANALES_VENTA.find((c) => c.value === selectedCliente.canalVenta)?.label ??
                    selectedCliente.canalVenta ??
                    "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Teléfono">
                  {selectedCliente.telefono ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedClienteEmail.email ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Región">
                  {selectedCliente.region ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Comuna">
                  {selectedCliente.comuna ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Dirección" span={2}>
                  {selectedCliente.direccion ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Estado">
                  {selectedCliente.activo ? (
                    <Badge status="success" text="Activo" />
                  ) : (
                    <Badge status="default" text="Inactivo" />
                  )}
                </Descriptions.Item>
              </Descriptions>

              {/* Contactos */}
              <div className="flex items-center justify-between mb-2">
                <Text strong className="text-sm">
                  Contactos
                </Text>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => abrirAgregarContacto()}
                >
                  Agregar contacto
                </Button>
              </div>
              <Table
                dataSource={contactos}
                columns={contactoColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: "max-content" }}
                tableLayout="auto"
                locale={{ emptyText: "Sin contactos registrados" }}
                className="mb-4"
              />

              <Divider />

              {/* Oportunidades */}
              <Text strong className="text-sm">
                Historial de Oportunidades
              </Text>
              <Table
                dataSource={oportunidades}
                columns={oppsColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Sin oportunidades asociadas" }}
                className="mt-2"
              />
            </>
              );
            })()
          )}
        </Spin>
      </Drawer>

      {/* Modal importar clientes */}
      <Modal
        title="Importar clientes Firemat"
        open={importarModalOpen}
        onCancel={() => {
          if (!importarLoading) {
            setImportarModalOpen(false);
            setImportarFile(null);
            setImportarFileList([]);
          }
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setImportarModalOpen(false);
              setImportarFile(null);
              setImportarFileList([]);
            }}
            disabled={importarLoading}
          >
            Cancelar
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<UploadOutlined />}
            loading={importarLoading}
            onClick={() => void handleImportar()}
            danger
          >
            Importar
          </Button>,
        ]}
        width={560}
        destroyOnClose
      >
        <div className="flex flex-col gap-4 mt-3">
          <Text type="secondary" className="text-sm">
            Sube un archivo <strong>.xlsx</strong> o <strong>.csv</strong> con los clientes Firemat a importar.
            Los duplicados serán omitidos automáticamente.
          </Text>

          <div>
            <Text className="text-xs font-semibold text-slate-600 block mb-1">Columnas esperadas:</Text>
            <div className="flex flex-wrap gap-1">
              {[
                "RUT",
                "Nombre",
                "Razón Social",
                "Nombre Empresa",
                "Teléfono",
                "Email",
                "Región",
                "Comuna",
                "Dirección",
                "Tipo Cliente",
                "Canal Venta",
              ].map((col) => (
                <Tag key={col} className="text-xs">{col}</Tag>
              ))}
            </div>
          </div>

          <Upload.Dragger
            accept=".xlsx,.csv"
            maxCount={1}
            fileList={importarFileList}
            beforeUpload={(file) => {
              const isValid = /\.(xlsx|csv)$/i.test(file.name);
              if (!isValid) {
                message.error("Solo se permiten archivos .xlsx o .csv");
                return Upload.LIST_IGNORE;
              }
              setImportarFile(file);
              setImportarFileList([file]);
              return false;
            }}
            onRemove={() => {
              setImportarFile(null);
              setImportarFileList([]);
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click o arrastra el archivo aquí</p>
            <p className="ant-upload-hint">Soporta .xlsx y .csv · Máximo 1 archivo</p>
          </Upload.Dragger>
        </div>
      </Modal>

      {/* Modal resultado importación */}
      <Modal
        title="Resultado de la importación"
        open={resultadoModalOpen}
        onCancel={() => setResultadoModalOpen(false)}
        footer={
          <Button type="primary" danger onClick={() => setResultadoModalOpen(false)}>
            Cerrar
          </Button>
        }
        width={480}
        destroyOnClose
      >
        {resultadoImportar && (
          <div className="flex flex-col gap-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <Card size="small" className="text-center">
                <div className="text-2xl font-bold text-slate-800">{resultadoImportar.procesados}</div>
                <div className="text-xs text-slate-500">Procesados</div>
              </Card>
              <Card size="small" className="text-center">
                <div className="text-2xl font-bold text-green-600">{resultadoImportar.creados}</div>
                <div className="text-xs text-slate-500">Creados</div>
              </Card>
              <Card size="small" className="text-center">
                <div className="text-2xl font-bold text-amber-500">{resultadoImportar.duplicadosOmitidos}</div>
                <div className="text-xs text-slate-500">Duplicados</div>
              </Card>
              <Card size="small" className="text-center">
                <div className="text-2xl font-bold text-red-500">{resultadoImportar.errores}</div>
                <div className="text-xs text-slate-500">Errores</div>
              </Card>
            </div>

            {resultadoImportar.duplicados && resultadoImportar.duplicados.length > 0 && (
              <div>
                <Text className="text-xs font-semibold text-amber-600 block mb-1">Duplicados omitidos:</Text>
                <div className="flex flex-wrap gap-1">
                  {resultadoImportar.duplicados.map((duplicado) => (
                    <Tag key={duplicado} color="orange" className="text-xs">{duplicado}</Tag>
                  ))}
                </div>
              </div>
            )}

            {resultadoImportar.detallesErrores && resultadoImportar.detallesErrores.length > 0 && (
              <div>
                <Text className="text-xs font-semibold text-red-600 block mb-1">Errores:</Text>
                <ul className="text-xs text-red-600 pl-4 list-disc">
                  {resultadoImportar.detallesErrores.map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultadoImportar.advertencias && resultadoImportar.advertencias.length > 0 && (
              <div>
                <Text className="text-xs font-semibold text-amber-600 block mb-1">Advertencias:</Text>
                <ul className="text-xs text-amber-600 pl-4 list-disc">
                  {resultadoImportar.advertencias.map((advertencia, index) => (
                    <li key={`${advertencia}-${index}`}>{advertencia}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal agregar / editar contacto */}
      <Modal
        title={editingContacto ? "Editar contacto" : "Nuevo contacto"}
        open={contactoModalOpen}
        onCancel={() => setContactoModalOpen(false)}
        onOk={() => contactoForm.submit()}
        okText={editingContacto ? "Guardar" : "Agregar"}
        confirmLoading={contactoLoading}
        width={480}
        destroyOnClose
      >
        <Form
          form={contactoForm}
          layout="vertical"
          onFinish={handleGuardarContacto}
          className="mt-3"
        >
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "El nombre es requerido" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="cargo" label="Cargo">
            <Input />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="telefono"
              label="Teléfono"
              rules={[
                {
                  validator: (_, value: string) => {
                    if (!value) return Promise.resolve();
                    if (!/^(9\d{8}|56\d{9}|\+56\d{9})$/.test(value))
                      return Promise.reject(new Error("Ingresa un teléfono válido"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="Ej: 912345678 / 56912345678 / +56912345678"
                onChange={(e) => {
                  const raw = e.target.value;
                  const hasPlus = raw.startsWith("+");
                  const digits = raw.replace(/\D/g, "");
                  const maxDigits = hasPlus || digits.startsWith("56") ? 11 : 9;
                  const limited = digits.slice(0, maxDigits);
                  contactoForm.setFieldValue("telefono", hasPlus ? `+${limited}` : limited);
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
                      return Promise.reject(new Error("Ingresa un correo válido"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="contacto@empresa.cl" />
            </Form.Item>

            <Form.Item name="principal" label="¿Contacto principal?">
              <Select>
                <Option value={true}>Sí</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>

            <Form.Item name="activo" label="Estado">
              <Select>
                <Option value={true}>Activo</Option>
                <Option value={false}>Inactivo</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientesFiremat;
