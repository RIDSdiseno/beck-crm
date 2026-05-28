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
  clientesBeckAPI,
  type ClienteBeck,
  type ClienteBeckPayload,
  type ContactoClienteBeck,
  type ContactoClienteBeckPayload,
  type ImportarClientesResult,
} from "../../services/api";
import { useAuth } from "../../context/useAuth";
import { regionesComunasChile } from "../../data/regionesComunasChile";

const { Option } = Select;
const { Text, Title } = Typography;

// ── Validación RUT chileno ────────────────────────────────────────────────────

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

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_CLIENTE = [
  { value: "EMPRESA", label: "Empresa" },
  { value: "PERSONA_NATURAL", label: "Persona Natural" },
  { value: "GOBIERNO", label: "Gobierno" },
  { value: "ONG", label: "ONG" },
];

const ORIGENES = [
  { value: "REFERIDO", label: "Referido" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "LICITACION", label: "Licitación" },
  { value: "OTRO", label: "Otro" },
];



// ── Extrae mensaje real del backend desde errores Axios ──────────────────────

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

// ── Tipos locales ─────────────────────────────────────────────────────────────

interface OportunidadResumen {
  id: string;
  nombreProyecto: string;
  empresa?: string | null;
  etapa?: string | null;
  estadoCierre?: string | null;
  valorOriginal?: number | null;
  monedaOriginal?: string | null;
  vendedor?: string | null;
  createdAt?: string | null;
}

type FiltroActivo = "todos" | "activos" | "inactivos";

// ── Componente principal ──────────────────────────────────────────────────────

const Clientes: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isReadOnly = currentUser?.rol === "Visualizador";

  // Lista
  const [clientes, setClientes] = useState<ClienteBeck[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("activos");

  // Modal crear/editar cliente
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteBeck | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [regionSeleccionada, setRegionSeleccionada] = useState<string>("");
  const [form] = Form.useForm<ClienteBeckPayload>();

  // Drawer detalle
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteBeck | null>(null);
  const [contactos, setContactos] = useState<ContactoClienteBeck[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadResumen[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal contacto
  const [contactoModalOpen, setContactoModalOpen] = useState(false);
  const [editingContacto, setEditingContacto] = useState<ContactoClienteBeck | null>(null);
  const [contactoLoading, setContactoLoading] = useState(false);
  const [contactoForm] = Form.useForm<ContactoClienteBeckPayload>();

  // Modal importar
  const [importarModalOpen, setImportarModalOpen] = useState(false);
  const [importarFile, setImportarFile] = useState<File | null>(null);
  const [importarFileList, setImportarFileList] = useState<UploadFile[]>([]);
  const [importarLoading, setImportarLoading] = useState(false);
  const [resultadoImportar, setResultadoImportar] = useState<ImportarClientesResult | null>(null);
  const [resultadoModalOpen, setResultadoModalOpen] = useState(false);

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchClientes = useCallback(
    async (params: { q?: string; activo?: boolean } = {}) => {
      setLoading(true);
      try {
        setClientes(await clientesBeckAPI.listar(params));
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
        clientesBeckAPI.obtener(clienteId),
        clientesBeckAPI.oportunidades(clienteId),
      ]);
      setSelectedCliente(cliente);
      setContactos(cliente.contactos ?? []);
      setOportunidades(opps as OportunidadResumen[]);
    } catch {
      message.error("Error al cargar detalle del cliente");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void fetchClientes({ activo: true });
  }, [fetchClientes]);

  // ── Builders de params ───────────────────────────────────────────────────

  const buildParams = (q: string, filtro: FiltroActivo) => {
    const params: { q?: string; activo?: boolean } = {};
    if (q.trim()) params.q = q.trim();
    if (filtro === "activos") params.activo = true;
    if (filtro === "inactivos") params.activo = false;
    return params;
  };

  // ── Handlers lista ────────────────────────────────────────────────────────

  const handleBuscar = () =>
    void fetchClientes(buildParams(searchInput, filtroActivo));

  const handleFiltroChange = (v: FiltroActivo) => {
    setFiltroActivo(v);
    void fetchClientes(buildParams(searchInput, v));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBuscar();
  };

  // ── Handlers modal cliente ────────────────────────────────────────────────

  const abrirCrear = () => {
    setEditingCliente(null);
    form.resetFields();
    form.setFieldsValue({ activo: true });
    setRegionSeleccionada("");
    setModalOpen(true);
  };

  const abrirEditar = (cliente: ClienteBeck) => {
    setEditingCliente(cliente);
    setRegionSeleccionada(cliente.region ?? "");
    form.setFieldsValue({
      rut: formatRut(cliente.rut),
      razonSocial: cliente.razonSocial,
      nombreEmpresa: cliente.nombreEmpresa ?? undefined,
      direccion: cliente.direccion ?? undefined,
      telefono: cliente.telefono ?? undefined,
      correo: cliente.correo ?? undefined,
      region: cliente.region ?? undefined,
      comuna: cliente.comuna ?? undefined,
      tipoCliente: cliente.tipoCliente ?? undefined,
      origen: cliente.origen ?? undefined,
      observaciones: cliente.observaciones ?? undefined,
      activo: cliente.activo,
    });
    setModalOpen(true);
  };

  const handleGuardarCliente = async (values: ClienteBeckPayload) => {
    setModalLoading(true);
    try {
      const payload: ClienteBeckPayload = {
        ...values,
        rut: formatRut(values.rut),
      };
      if (editingCliente) {
        await clientesBeckAPI.actualizar(editingCliente.id, payload);
        message.success("Cliente actualizado");
        if (selectedCliente?.id === editingCliente.id) {
          void fetchDetalle(editingCliente.id);
        }
      } else {
        await clientesBeckAPI.crear(payload);
        message.success("Cliente creado");
      }
      setModalOpen(false);
      void fetchClientes(buildParams(searchInput, filtroActivo));
    } catch (err: unknown) {
      message.error(extractBackendMsg(err, "Error al guardar cliente"));
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleEstado = async (cliente: ClienteBeck) => {
    try {
      await clientesBeckAPI.toggleEstado(cliente.id, !cliente.activo);
      message.success(`Cliente ${!cliente.activo ? "activado" : "desactivado"}`);
      void fetchClientes(buildParams(searchInput, filtroActivo));
      if (selectedCliente?.id === cliente.id) void fetchDetalle(cliente.id);
    } catch {
      message.error("Error al cambiar estado del cliente");
    }
  };

  // ── Handlers detalle ──────────────────────────────────────────────────────

  const abrirDetalle = (cliente: ClienteBeck) => {
    setSelectedCliente(cliente);
    setContactos(cliente.contactos ?? []);
    setOportunidades([]);
    setDrawerOpen(true);
    void fetchDetalle(cliente.id);
  };

  // ── Handlers contactos ────────────────────────────────────────────────────

  const abrirAgregarContacto = (cliente?: ClienteBeck) => {
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

  const abrirEditarContacto = (contacto: ContactoClienteBeck) => {
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

  const handleGuardarContacto = async (values: ContactoClienteBeckPayload) => {
    if (!selectedCliente) return;
    setContactoLoading(true);
    try {
      if (editingContacto) {
        await clientesBeckAPI.actualizarContacto(editingContacto.id, values);
        message.success("Contacto actualizado");
      } else {
        await clientesBeckAPI.agregarContacto(selectedCliente.id, values);
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

  const handleToggleContacto = async (contacto: ContactoClienteBeck) => {
    try {
      await clientesBeckAPI.toggleEstadoContacto(contacto.id, !contacto.activo);
      message.success(`Contacto ${!contacto.activo ? "activado" : "desactivado"}`);
      if (selectedCliente) {
        void fetchDetalle(selectedCliente.id);
        void fetchClientes(buildParams(searchInput, filtroActivo));
      }
    } catch {
      message.error("Error al cambiar estado del contacto");
    }
  };

  // ── Handlers importar ─────────────────────────────────────────────────────

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["RUT", "Razón Social", "Nombre Empresa", "Teléfono", "Correo", "Región", "Comuna", "Dirección", "Tipo Cliente"],
      ["77.777.777-7", "Empresa Demo SpA", "Empresa Demo", "+56912345678", "contacto@empresa.cl", "Región Metropolitana de Santiago", "Providencia", "Av. Demo 123", "Empresa"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "plantilla_clientes_beck.xlsx");
  };

  const handleImportar = async () => {
    if (!importarFile) {
      message.error("Selecciona un archivo primero");
      return;
    }
    setImportarLoading(true);
    message.loading({ content: "Importando clientes...", key: "importar", duration: 0 });
    try {
      const resultado = await clientesBeckAPI.importar(importarFile);
      setImportarModalOpen(false);
      setImportarFile(null);
      setImportarFileList([]);
      await fetchClientes(buildParams(searchInput, filtroActivo));
      setResultadoImportar(resultado);
      setResultadoModalOpen(true);
    } catch (err: unknown) {
      message.error({ content: extractBackendMsg(err, "Error al importar clientes"), key: "importar" });
    } finally {
      message.destroy("importar");
      setImportarLoading(false);
    }
  };

  // ── Columnas tabla principal ──────────────────────────────────────────────

  const columns: ColumnsType<ClienteBeck> = [
    {
      title: "RUT",
      dataIndex: "rut",
      key: "rut",
      width: 120,
      render: (v: string) => <Text className="font-mono text-xs">{v}</Text>,
    },
    {
      title: "Razón Social",
      dataIndex: "razonSocial",
      key: "razonSocial",
      width: 200,
      ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
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
      title: "Correo",
      dataIndex: "correo",
      key: "correo",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
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
      render: (_: unknown, r: ClienteBeck) => (
        <Space size={4} wrap>
          <Tag
            color="blue"
            className="cursor-pointer"
            onClick={() => abrirDetalle(r)}
            style={{ marginInlineEnd: 0 }}
          >
            {r.contactos?.length ?? 0}
          </Tag>
          {!isReadOnly && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => abrirAgregarContacto(r)}
              title="Agregar contacto"
              className="!h-5 !px-1"
            />
          )}
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 120,
      render: (_: unknown, record: ClienteBeck) => (
        <Space size="small" wrap>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => abrirDetalle(record)}
            title="Ver detalle"
          />
          {!isReadOnly && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => abrirEditar(record)}
              title="Editar"
            />
          )}
          {!isReadOnly && (
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
          )}
        </Space>
      ),
    },
  ];

  // ── Columnas contactos ────────────────────────────────────────────────────

  const contactoColumns: ColumnsType<ContactoClienteBeck> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      width: 160,
      ellipsis: true,
      render: (v: string, r: ContactoClienteBeck) => (
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
    ...(!isReadOnly ? [{
      title: "Acciones",
      key: "acciones",
      width: 90,
      render: (_: unknown, record: ContactoClienteBeck) => (
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
    }] : []),
  ];

  // ── Columnas oportunidades ────────────────────────────────────────────────

  const oppsColumns: ColumnsType<OportunidadResumen> = [
    {
      title: "Proyecto",
      dataIndex: "nombreProyecto",
      key: "nombreProyecto",
      width: 180,
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
        v ? <Tag color="amber">{v}</Tag> : "—",
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
      render: (_: unknown, r: OportunidadResumen) =>
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
            Clientes Beck
          </Title>
          <Text type="secondary" className="text-xs">
            Maestro de clientes · RUT como identificador principal
          </Text>
        </div>
        {!isReadOnly && (
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
              loading={importarLoading}
            >
              Importar Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={abrirCrear}
              disabled={importarLoading}
              className="bg-amber-500 border-amber-500 hover:!bg-amber-600 hover:!border-amber-600"
            >
              Nuevo cliente
            </Button>
          </Space>
        )}
      </div>

      {/* Filtros */}
      <Card size="small" className="border-slate-200">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <Input
            allowClear
            placeholder="Buscar por RUT, razón social o nombre empresa…"
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
        onOk={() => form.submit()}
        okText={editingCliente ? "Guardar cambios" : "Crear cliente"}
        confirmLoading={modalLoading}
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGuardarCliente}
          className="mt-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="rut"
              label="RUT"
              rules={[
                { required: true, message: "El RUT es requerido" },
                {
                  validator: (_, value: string) => {
                    if (!value) return Promise.resolve();
                    if (!validarRut(value))
                      return Promise.reject(new Error("Ingresa un RUT con formato válido"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="12.345.678-9"
                onChange={(e) => {
                  const formatted = formatRut(e.target.value);
                  form.setFieldValue("rut", formatted);
                }}
              />
            </Form.Item>

            <Form.Item
              name="razonSocial"
              label="Razón Social"
              rules={[{ required: true, message: "La razón social es requerida" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="nombreEmpresa" label="Nombre Empresa">
              <Input />
            </Form.Item>

            <Form.Item name="tipoCliente" label="Tipo de Cliente">
              <Select placeholder="Seleccionar tipo" allowClear>
                {TIPOS_CLIENTE.map((t) => (
                  <Option key={t.value} value={t.value}>
                    {t.label}
                  </Option>
                ))}
              </Select>
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
        title={
          selectedCliente
            ? selectedCliente.razonSocial
            : "Detalle cliente"
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={760}
        extra={
          selectedCliente && !isReadOnly && (
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
            <>
              <Descriptions
                column={{ xs: 1, sm: 2 }}
                size="small"
                bordered
                className="mb-4"
              >
                <Descriptions.Item label="RUT">
                  <Text className="font-mono">{selectedCliente.rut}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Razón Social">
                  <Text strong>{selectedCliente.razonSocial}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Nombre Empresa">
                  {selectedCliente.nombreEmpresa ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {TIPOS_CLIENTE.find(
                    (t) => t.value === selectedCliente.tipoCliente
                  )?.label ??
                    selectedCliente.tipoCliente ??
                    "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Teléfono">
                  {selectedCliente.telefono ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Correo">
                  {selectedCliente.correo ?? "—"}
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
                <Descriptions.Item label="Origen">
                  {ORIGENES.find((o) => o.value === selectedCliente.origen)
                    ?.label ??
                    selectedCliente.origen ??
                    "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Estado">
                  {selectedCliente.activo ? (
                    <Badge status="success" text="Activo" />
                  ) : (
                    <Badge status="default" text="Inactivo" />
                  )}
                </Descriptions.Item>
                {selectedCliente.observaciones && (
                  <Descriptions.Item label="Observaciones" span={2}>
                    {selectedCliente.observaciones}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Contactos */}
              <div className="flex items-center justify-between mb-2">
                <Text strong className="text-sm">
                  Contactos
                </Text>
                {!isReadOnly && (
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => abrirAgregarContacto()}
                  >
                    Agregar contacto
                  </Button>
                )}
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
          )}
        </Spin>
      </Drawer>

      {/* ── Modal importar clientes ── */}
      <Modal
        title="Importar clientes"
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
            className="bg-amber-500 border-amber-500 hover:!bg-amber-600 hover:!border-amber-600"
          >
            Importar
          </Button>,
        ]}
        width={560}
        destroyOnClose
      >
        <div className="flex flex-col gap-4 mt-3">
          <Text type="secondary" className="text-sm">
            Sube un archivo <strong>.xlsx</strong> o <strong>.csv</strong> con los clientes a importar.
            Los RUTs duplicados serán omitidos automáticamente.
          </Text>

          <div>
            <Text className="text-xs font-semibold text-slate-600 block mb-1">Columnas esperadas:</Text>
            <div className="flex flex-wrap gap-1">
              {["RUT", "Razón Social", "Nombre Empresa", "Teléfono", "Correo", "Región", "Comuna", "Dirección", "Tipo Cliente"].map((col) => (
                <Tag key={col} className="text-xs">{col}</Tag>
              ))}
            </div>
          </div>

          <Upload.Dragger
            accept=".xlsx,.csv"
            maxCount={1}
            fileList={importarFileList}
            beforeUpload={(file) => {
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

      {/* ── Modal resultado importación ── */}
      <Modal
        title="Resultado de la importación"
        open={resultadoModalOpen}
        onCancel={() => setResultadoModalOpen(false)}
        footer={
          <Button type="primary" onClick={() => setResultadoModalOpen(false)}>
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
                <div className="text-xs text-slate-500">Duplicados omitidos</div>
              </Card>
              <Card size="small" className="text-center">
                <div className="text-2xl font-bold text-red-500">{resultadoImportar.errores}</div>
                <div className="text-xs text-slate-500">Errores</div>
              </Card>
            </div>

            {resultadoImportar.duplicados && resultadoImportar.duplicados.length > 0 && (
              <div>
                <Text className="text-xs font-semibold text-amber-600 block mb-1">RUTs duplicados omitidos:</Text>
                <div className="flex flex-wrap gap-1">
                  {resultadoImportar.duplicados.map((rut) => (
                    <Tag key={rut} color="orange" className="text-xs">{rut}</Tag>
                  ))}
                </div>
              </div>
            )}

            {resultadoImportar.detallesErrores && resultadoImportar.detallesErrores.length > 0 && (
              <div>
                <Text className="text-xs font-semibold text-red-600 block mb-1">Errores:</Text>
                <ul className="text-xs text-red-600 pl-4 list-disc">
                  {resultadoImportar.detallesErrores.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultadoImportar.advertencias && resultadoImportar.advertencias.length > 0 && (
              <div>
                <Text className="text-xs font-semibold text-amber-600 block mb-1">Advertencias:</Text>
                <ul className="text-xs text-amber-600 pl-4 list-disc">
                  {resultadoImportar.advertencias.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal agregar / editar contacto ── */}
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

export default Clientes;
