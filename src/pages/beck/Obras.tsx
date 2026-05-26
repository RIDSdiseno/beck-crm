import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/useAuth";
import {
  configuracionCamposRegistroAPI,
  funnelBeckAPI,
  obrasAPI,
  type CampoConfiguracionRegistro,
  type ColorConfiguracionCampoRegistro,
  type FunnelBeckGanadaSinObra,
  type Obra,
  type ObraEstado,
  type RolConfiguracionCamposRegistro,
} from "../../services/api";
import { regionesComunasChile } from "../../data/regionesComunasChile";

type EstadoForm = ObraEstado;

type ObraFormValues = {
  nombre: string;
  codigo: string;
  descripcion: string;
  direccion: string;
  region: string;
  comuna: string;
  cliente: string;
  estado: EstadoForm;
  funnelBeckId?: string;
};

type RegistroRoleBlock = {
  key: RolConfiguracionCamposRegistro;
  title: string;
  description: string;
};

const registroRoleBlocks: RegistroRoleBlock[] = [
  {
    key: "jefeobra",
    title: "Supervisor / Jefe obra",
    description: "Campos disponibles para supervisión en terreno.",
  },
  {
    key: "trabajador",
    title: "Trabajador",
    description: "Campos disponibles para trabajadores.",
  },
];

const registroColorConfig: Record<
  ColorConfiguracionCampoRegistro,
  { label: string; tagColor: string; border: string; background: string }
> = {
  verde: {
    label: "Verde",
    tagColor: "green",
    border: "border-green-200",
    background: "bg-green-50",
  },
  azul: {
    label: "Configurable",
    tagColor: "blue",
    border: "border-blue-200",
    background: "bg-blue-50",
  },
  rojo: {
    label: "Prohibido",
    tagColor: "red",
    border: "border-red-200",
    background: "bg-red-50",
  },
};

const greenRegistroCampos = new Set(["itemizado beck", "observaciones"]);
const blueRegistroCampos = new Set([
  "cielo modular",
  "aislacion",
  "aislación",
  "reparacion de tabique",
  "reparación de tabique",
  "reparacion de tabique = aplica / no aplica",
  "reparación de tabique = aplica / no aplica",
]);
const trabajadorForbiddenCampos = new Set([
  "codigo beck",
  "código beck",
  "itemizado mandante",
  "factor por holguras",
  "cantidad de sellos con factores sin reparaciones",
  "cantidad de sellos aislacion",
  "cantidad de sellos aislación",
  "cantidad final",
  "folio",
]);

const normalizeRegistroText = (value: unknown): string =>
  typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    : "";

const textFrom = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const getRegistroCampoId = (field: CampoConfiguracionRegistro): string =>
  textFrom(field.campo) ||
  textFrom(field.key) ||
  textFrom(field.nombreCampo) ||
  textFrom(field.nombre) ||
  textFrom(field.label) ||
  textFrom(field.id);

const getRegistroCampoLabel = (field: CampoConfiguracionRegistro): string => {
  const raw =
    textFrom(field.label) ||
    textFrom(field.nombre) ||
    textFrom(field.nombreCampo) ||
    getRegistroCampoId(field);
  const normalized = normalizeRegistroText(raw);

  if (normalized.includes("reparacion de tabique")) {
    return "Reparación de tabique";
  }

  return raw;
};

const getRegistroCampoColor = (
  role: RolConfiguracionCamposRegistro,
  field: CampoConfiguracionRegistro
): ColorConfiguracionCampoRegistro => {
  const raw = normalizeRegistroText(
    field.color ??
      field.tipo ??
      field.colorCampo ??
      field.clasificacion ??
      field.categoria
  );
  const campo = normalizeRegistroText(getRegistroCampoId(field));
  const label = normalizeRegistroText(getRegistroCampoLabel(field));
  const identity = `${campo} ${label}`;

  if (greenRegistroCampos.has(campo) || greenRegistroCampos.has(label)) {
    return "verde";
  }
  if (role === "trabajador" && [...trabajadorForbiddenCampos].some((item) => identity.includes(item))) {
    return "rojo";
  }
  if ([...blueRegistroCampos].some((item) => identity.includes(item))) {
    return "azul";
  }
  if (raw === "verde" || raw === "green") return "verde";
  if (raw === "rojo" || raw === "red") return "rojo";
  return "azul";
};

const normalizeRegistroField = (
  role: RolConfiguracionCamposRegistro,
  field: CampoConfiguracionRegistro
): CampoConfiguracionRegistro => {
  const color = getRegistroCampoColor(role, field);
  const normalized: CampoConfiguracionRegistro = {
    ...field,
    campo: getRegistroCampoId(field),
    label: getRegistroCampoLabel(field),
    color,
    visible: Boolean(field.visible),
  };

  if (color === "verde") return { ...normalized, visible: true };
  if (role === "trabajador" && color === "rojo") {
    return { ...normalized, visible: false, prohibido: true };
  }
  return normalized;
};

const estadoOptions: Array<{ label: string; value: EstadoForm }> = [
  { label: "Activa", value: "activa" },
  { label: "Pausada", value: "pausada" },
  { label: "Finalizada", value: "finalizada" },
  { label: "Inactiva", value: "inactiva" },
];

const getObraEstado = (obra: Obra): EstadoForm => {
  if (
    obra.estado === "activa" ||
    obra.estado === "inactiva" ||
    obra.estado === "pausada" ||
    obra.estado === "finalizada"
  ) {
    return obra.estado;
  }
  return obra.activa ? "activa" : "inactiva";
};

const getEstadoLabel = (estado: EstadoForm): string => {
  if (estado === "activa") return "Activa";
  if (estado === "pausada") return "Pausada";
  if (estado === "finalizada") return "Finalizada";
  return "Inactiva";
};

const getEstadoColor = (estado: EstadoForm): string => {
  if (estado === "activa") return "green";
  if (estado === "pausada") return "gold";
  if (estado === "finalizada") return "blue";
  return "red";
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const apiError = data as { error?: unknown; message?: unknown };
      if (typeof apiError.error === "string" && apiError.error.trim())
        return apiError.error;
      if (typeof apiError.message === "string" && apiError.message.trim())
        return apiError.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const getOportunidadObra = (obra: Obra) =>
  obra.funnelBeck ?? obra.oportunidad ?? null;

const Obras: React.FC = () => {
  const { user } = useAuth();
  const canManageObras = user?.rol !== "Visualizador";

  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"crear" | "editar">("crear");
  const [obraSeleccionada, setObraSeleccionada] = useState<Obra | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingEstadoId, setUpdatingEstadoId] = useState<string | null>(null);
  const [oportunidadesGanadas, setOportunidadesGanadas] = useState<
    FunnelBeckGanadaSinObra[]
  >([]);
  const [loadingOportunidades, setLoadingOportunidades] = useState(false);
  const [registroDrawerOpen, setRegistroDrawerOpen] = useState(false);
  const [obraRegistro, setObraRegistro] = useState<Obra | null>(null);
  const [registroConfig, setRegistroConfig] = useState<
    Record<RolConfiguracionCamposRegistro, CampoConfiguracionRegistro[]>
  >({ jefeobra: [], trabajador: [] });
  const [registroLoading, setRegistroLoading] = useState(false);
  const [registroSaving, setRegistroSaving] = useState(false);
  const [registroError, setRegistroError] = useState<string | null>(null);
  const [form] = Form.useForm<ObraFormValues>();
  const selectedRegion = Form.useWatch("region", form);
  const comunasDisponibles =
    regionesComunasChile.find((region) => region.nombre === selectedRegion)
      ?.comunas ?? [];

  const normalizedRegistroConfig = useMemo(
    () => ({
      jefeobra: registroConfig.jefeobra.map((field) =>
        normalizeRegistroField("jefeobra", field)
      ),
      trabajador: registroConfig.trabajador.map((field) =>
        normalizeRegistroField("trabajador", field)
      ),
    }),
    [registroConfig]
  );

  const cargarObras = async () => {
    setLoading(true);
    try {
      const data = await obrasAPI.listar();
      setObras(data);
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudieron cargar las obras"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarObras();
  }, []);

  const cargarOportunidadesGanadas = async () => {
    setLoadingOportunidades(true);
    try {
      const data = await funnelBeckAPI.ganadasSinObra();
      setOportunidadesGanadas(data);
    } catch (error) {
      message.error(
        getErrorMessage(error, "No se pudieron cargar las oportunidades ganadas")
      );
    } finally {
      setLoadingOportunidades(false);
    }
  };

  const handleSeleccionarOportunidad = (oportunidadId?: string) => {
    if (!oportunidadId) return;

    const oportunidad = oportunidadesGanadas.find(
      (item) => item.id === oportunidadId
    );
    if (!oportunidad) return;

    const current = form.getFieldsValue();
    const nextValues: Partial<ObraFormValues> = {};

    if (!current.nombre?.trim()) {
      nextValues.nombre = oportunidad.nombreProyecto;
    }

    if (!current.cliente?.trim()) {
      nextValues.cliente =
        oportunidad.empresa ||
        oportunidad.clienteBeck?.razonSocial ||
        oportunidad.clienteBeck?.nombreEmpresa ||
        "";
    }

    if (!current.direccion?.trim() && oportunidad.clienteBeck?.direccion) {
      nextValues.direccion = oportunidad.clienteBeck.direccion;
    }

    if (!current.region?.trim() && oportunidad.clienteBeck?.region) {
      nextValues.region = oportunidad.clienteBeck.region;
    }

    if (!current.comuna?.trim() && oportunidad.clienteBeck?.comuna) {
      nextValues.comuna = oportunidad.clienteBeck.comuna;
    }

    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  };

  const handleCrear = async (values: ObraFormValues) => {
    if (!canManageObras) return;
    setSaving(true);
    try {
      await obrasAPI.crear({
        nombre: values.nombre.trim(),
        codigo: values.codigo?.trim() || null,
        direccion: values.direccion?.trim() || null,
        region: values.region?.trim() || null,
        comuna: values.comuna?.trim() || null,
        cliente: values.cliente?.trim() || null,
        descripcion: values.descripcion?.trim() || null,
        estado: values.estado ?? "activa",
        funnelBeckId: values.funnelBeckId || undefined,
      });
      message.success("Obra creada correctamente");
      setModalOpen(false);
      form.resetFields();
      await cargarObras();
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo crear la obra"));
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarEdicion = async (values: ObraFormValues) => {
    if (!canManageObras || !obraSeleccionada) return;
    setSaving(true);
    try {
      const payload: Partial<Omit<Obra, "id" | "created_at" | "updated_at">> = {
        codigo: values.codigo?.trim() || null,
        nombre: values.nombre,
        direccion: values.direccion ?? "",
        region: values.region ?? "",
        comuna: values.comuna ?? "",
        cliente: values.cliente ?? "",
        estado: values.estado,
        activa: values.estado === "activa",
      };

      if (values.funnelBeckId) {
        payload.funnelBeckId = values.funnelBeckId;
      }

      const obraActualizada = await obrasAPI.actualizar(obraSeleccionada.id, payload);
      setObras((prev) =>
        prev.map((obra) => (obra.id === obraSeleccionada.id ? obraActualizada : obra))
      );
      message.success("Obra actualizada correctamente");
      setModalOpen(false);
      setObraSeleccionada(null);
      form.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo actualizar la obra"));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitObra = (values: ObraFormValues) => {
    if (!canManageObras) return;
    if (modalMode === "editar") {
      void handleGuardarEdicion(values);
    } else {
      void handleCrear(values);
    }
  };

  const openCrear = () => {
    if (!canManageObras) return;
    setModalMode("crear");
    setObraSeleccionada(null);
    form.resetFields();
    form.setFieldsValue({ estado: "activa" });
    setModalOpen(true);
    void cargarOportunidadesGanadas();
  };

  const openEditar = async (obra: Obra) => {
    if (!canManageObras) return;
    setModalMode("editar");
    setModalOpen(true);
    try {
      const obraDetalle = await obrasAPI.obtenerPorId(obra.id);
      setObraSeleccionada(obraDetalle);
      form.setFieldsValue({
        codigo: obraDetalle.codigo ?? "",
        nombre: obraDetalle.nombre,
        descripcion: obraDetalle.descripcion ?? "",
        direccion: obraDetalle.direccion ?? "",
        region: obraDetalle.region ?? "",
        comuna: obraDetalle.comuna ?? "",
        cliente: obraDetalle.cliente ?? "",
        estado: getObraEstado(obraDetalle),
      });
      void cargarOportunidadesGanadas();
    } catch (error) {
      setModalOpen(false);
      message.error(getErrorMessage(error, "No se pudo cargar la obra"));
    }
  };

  const handleEliminar = (obra: Obra) => {
    if (!canManageObras) return;
    Modal.confirm({
      title: "Eliminar obra",
      content: `¿Estás seguro de eliminar "${obra.nombre}"? Esta acción no se puede deshacer.`,
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await obrasAPI.eliminar(obra.id);
          message.success("Obra eliminada");
          await cargarObras();
        } catch (error) {
          message.error(getErrorMessage(error, "No se pudo eliminar la obra"));
        }
      },
    });
  };

  const handleCambiarEstado = (obra: Obra, estado: EstadoForm) => {
    if (!canManageObras) return;

    const estadoActual = getObraEstado(obra);
    if (estadoActual === estado) return;

    Modal.confirm({
      title: "Cambiar estado de obra",
      content: `¿Cambiar "${obra.nombre}" de ${getEstadoLabel(
        estadoActual
      )} a ${getEstadoLabel(estado)}?`,
      okText: "Cambiar estado",
      cancelText: "Cancelar",
      onOk: async () => {
        setUpdatingEstadoId(obra.id);
        try {
          const obraActualizada = await obrasAPI.actualizarEstado(obra.id, estado);
          setObras((prev) =>
            prev.map((item) =>
              item.id === obra.id
                ? {
                    ...item,
                    ...obraActualizada,
                    estado,
                    activa: estado === "activa",
                  }
                : item
            )
          );
          message.success("Estado actualizado");
        } catch (error) {
          message.error(getErrorMessage(error, "No se pudo actualizar el estado"));
        } finally {
          setUpdatingEstadoId(null);
        }
      },
    });
  };

  const cargarOpcionesRegistro = async (obra: Obra) => {
    setRegistroLoading(true);
    setRegistroError(null);
    try {
      const [jefeobra, trabajador] = await Promise.all([
        configuracionCamposRegistroAPI.obtenerPorRol("jefeobra", obra.id),
        configuracionCamposRegistroAPI.obtenerPorRol("trabajador", obra.id),
      ]);
      setRegistroConfig({ jefeobra, trabajador });
    } catch (error) {
      setRegistroError(
        getErrorMessage(error, "No se pudieron cargar las opciones de registro")
      );
      setRegistroConfig({ jefeobra: [], trabajador: [] });
    } finally {
      setRegistroLoading(false);
    }
  };

  const openOpcionesRegistro = (obra: Obra) => {
    setObraRegistro(obra);
    setRegistroDrawerOpen(true);
    void cargarOpcionesRegistro(obra);
  };

  const closeOpcionesRegistro = () => {
    if (registroSaving) return;
    setRegistroDrawerOpen(false);
    setObraRegistro(null);
    setRegistroError(null);
  };

  const updateRegistroField = (
    role: RolConfiguracionCamposRegistro,
    campo: string,
    visible: boolean
  ) => {
    setRegistroConfig((current) => ({
      ...current,
      [role]: current[role].map((field) =>
        getRegistroCampoId(field) === campo ? { ...field, visible } : field
      ),
    }));
  };

  const buildRegistroPayload = () => {
    if (!obraRegistro) return [];

    return registroRoleBlocks.flatMap((block) =>
      normalizedRegistroConfig[block.key]
        .filter(
          (field) =>
            field.color === "azul" ||
            (block.key === "trabajador" && field.color === "rojo")
        )
        .map((field) => ({
          obraId: obraRegistro.id,
          campo: field.campo,
          rol: block.key,
          visible:
            block.key === "trabajador" && field.color === "rojo"
              ? false
              : field.visible,
        }))
    );
  };

  const guardarOpcionesRegistro = async () => {
    if (!obraRegistro) return;

    setRegistroSaving(true);
    try {
      await configuracionCamposRegistroAPI.actualizar(buildRegistroPayload());
      message.success("Opciones de registro guardadas");
      await cargarOpcionesRegistro(obraRegistro);
    } catch (error) {
      message.error(
        getErrorMessage(error, "No se pudieron guardar las opciones de registro")
      );
    } finally {
      setRegistroSaving(false);
    }
  };

  const renderRegistroField = (
    role: RolConfiguracionCamposRegistro,
    field: CampoConfiguracionRegistro
  ) => {
    const color = registroColorConfig[field.color] ?? registroColorConfig.azul;
    const trabajadorRojo = role === "trabajador" && field.color === "rojo";
    const locked =
      field.color === "verde" ||
      field.configurable === false ||
      field.prohibido === true ||
      trabajadorRojo;

    return (
      <div
        key={field.campo}
        className={`flex flex-col gap-3 rounded-lg border ${color.border} ${color.background} px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="min-w-0">
          <Space size={[6, 6]} wrap className="mb-1">
            <Typography.Text strong>{field.label || field.campo}</Typography.Text>
            <Tag color={color.tagColor}>{color.label}</Tag>
            {trabajadorRojo && <Tag color="red">Prohibido para trabajador</Tag>}
          </Space>
          <Typography.Text type="secondary" className="block text-xs">
            {field.descripcion || field.campo}
          </Typography.Text>
        </div>
        <Switch
          checked={field.visible}
          disabled={locked || registroSaving}
          onChange={(checked) => updateRegistroField(role, field.campo, checked)}
          checkedChildren="Visible"
          unCheckedChildren="Oculto"
        />
      </div>
    );
  };

  const renderRegistroRoleBlock = (block: RegistroRoleBlock) => {
    const fields = normalizedRegistroConfig[block.key] ?? [];

    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4">
          <Typography.Title level={5} className="!mb-1">
            {block.title}
          </Typography.Title>
          <Typography.Text type="secondary">{block.description}</Typography.Text>
        </div>
        {fields.length ? (
          <div className="space-y-3">
            {fields.map((field) => renderRegistroField(block.key, field))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No hay campos configurables para este rol."
          />
        )}
      </section>
    );
  };

  const columns: ColumnsType<Obra> = [
    {
      title: "Código",
      dataIndex: "codigo",
      key: "codigo",
      width: 140,
      render: (value: string | null | undefined) => (
        <span className="font-mono text-xs text-slate-700">
          {value?.trim() || "No aplica"}
        </span>
      ),
    },
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (value: string) => (
        <span className="text-xs font-medium text-slate-900">{value}</span>
      ),
    },
    {
      title: "Oportunidad vinculada",
      key: "oportunidad",
      width: 220,
      render: (_: unknown, record: Obra) => {
        const oportunidad = getOportunidadObra(record);
        return oportunidad?.nombreProyecto ? (
          <span className="text-xs text-slate-700">
            {oportunidad.nombreProyecto}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        );
      },
    },
    {
      title: "Estado",
      key: "estado",
      width: 150,
      render: (_: unknown, record: Obra) => {
        const estado = getObraEstado(record);
        if (canManageObras) {
          return (
            <Select
              size="small"
              value={estado}
              options={estadoOptions}
              disabled={updatingEstadoId === record.id}
              loading={updatingEstadoId === record.id}
              style={{ width: 130 }}
              onChange={(nextEstado) =>
                handleCambiarEstado(record, nextEstado as EstadoForm)
              }
            />
          );
        }

        return (
          <Tag color={getEstadoColor(estado)} style={{ marginInlineEnd: 0 }}>
            {getEstadoLabel(estado)}
          </Tag>
        );
      },
    },
    ...(canManageObras
      ? [
          {
            title: "Acciones",
            key: "acciones",
            width: 330,
            render: (_: unknown, record: Obra) => (
              <Space size={6} wrap>
                <Button
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => openOpcionesRegistro(record)}
                >
                  Opciones de registro
                </Button>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => void openEditar(record)}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleEliminar(record)}
                >
                  Eliminar
                </Button>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-wide text-slate-900 sm:text-xl">
            Obras
          </h1>
          <p className="text-[11px] text-slate-600 sm:text-xs">
            Gestiona las obras del sistema
          </p>
        </div>
        {canManageObras && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCrear}>
            Crear obra
          </Button>
        )}
      </div>

      <Card
        className="border border-slate-200 bg-white"
        title={
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Listado de obras</span>
            <span className="text-xs text-slate-500">{obras.length}</span>
          </div>
        }
        styles={{
          header: {
            backgroundColor: "#ffffff",
            color: "#020617",
            borderBottom: "1px solid #e2e8f0",
            fontSize: 13,
          },
          body: { padding: 0 },
        }}
      >
        <Table<Obra>
          rowKey="id"
          columns={columns}
          dataSource={obras}
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 760 }}
          locale={{
            emptyText: loading ? "Cargando obras..." : "No hay obras registradas",
          }}
        />
      </Card>

      <Drawer
        open={registroDrawerOpen}
        onClose={closeOpcionesRegistro}
        width="min(860px, 95vw)"
        title="Opciones de registro"
        extra={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => obraRegistro && void cargarOpcionesRegistro(obraRegistro)}
              disabled={!obraRegistro || registroLoading || registroSaving}
            >
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={registroSaving}
              disabled={!obraRegistro || registroLoading}
              onClick={() => void guardarOpcionesRegistro()}
            >
              Guardar cambios
            </Button>
            <Button onClick={closeOpcionesRegistro} disabled={registroSaving}>
              Cancelar
            </Button>
          </Space>
        }
      >
        <div className="space-y-4">
          <div>
            <Typography.Text type="secondary" className="text-xs">
              Obra
            </Typography.Text>
            <Typography.Title level={4} className="!mb-0 !mt-1">
              {obraRegistro?.nombre || "-"}
            </Typography.Title>
          </div>

          {registroError && (
            <Alert
              type="error"
              showIcon
              message="No se pudieron cargar las opciones"
              description={registroError}
            />
          )}

          {registroLoading ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <Skeleton active paragraph={{ rows: 8 }} />
            </section>
          ) : (
            registroRoleBlocks.map(renderRegistroRoleBlock)
          )}
        </div>
      </Drawer>

      <Modal
        title={modalMode === "editar" ? "Editar obra" : "Crear obra"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setObraSeleccionada(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={modalMode === "editar" ? "Guardar" : "Crear"}
        cancelText="Cancelar"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitObra}
          initialValues={{ estado: "activa" }}
          className="mt-4"
        >
          <Form.Item name="funnelBeckId" label="Oportunidad ganada">
            <Select
              allowClear
              showSearch
              loading={loadingOportunidades}
              placeholder="Seleccionar oportunidad ganada"
              optionFilterProp="label"
              onChange={(value) => handleSeleccionarOportunidad(value)}
              options={oportunidadesGanadas.map((oportunidad) => ({
                value: oportunidad.id,
                label: `${oportunidad.nombreProyecto} - ${oportunidad.empresa}`,
              }))}
              optionRender={(option) => (
                <div className="flex items-center justify-between gap-2">
                  <span>{option.label}</span>
                  <Tag color="green" style={{ marginInlineEnd: 0 }}>
                    Disponible
                  </Tag>
                </div>
              )}
            />
          </Form.Item>

          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "El nombre es requerido" }]}
          >
            <Input placeholder="Nombre de la obra" />
          </Form.Item>

          <Form.Item name="codigo" label="Código">
            <Input placeholder="Código de la obra" />
          </Form.Item>

          <Form.Item name="direccion" label="Dirección">
            <Input placeholder="Dirección de la obra" />
          </Form.Item>

          <Form.Item name="region" label="Región">
            <Select
              allowClear
              showSearch
              placeholder="Seleccionar región"
              optionFilterProp="label"
              onChange={() => form.setFieldValue("comuna", "")}
              options={regionesComunasChile.map((region) => ({
                value: region.nombre,
                label: region.nombre,
              }))}
            />
          </Form.Item>

          <Form.Item name="comuna" label="Comuna">
            <Select
              allowClear
              showSearch
              placeholder={
                selectedRegion
                  ? "Seleccionar comuna"
                  : "Primero selecciona una región"
              }
              optionFilterProp="label"
              disabled={!selectedRegion}
              options={comunasDisponibles.map((comuna) => ({
                value: comuna,
                label: comuna,
              }))}
            />
          </Form.Item>

          <Form.Item name="cliente" label="Cliente">
            <Input placeholder="Cliente" />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Descripción de la obra" />
          </Form.Item>

          <Form.Item name="estado" label="Estado">
            <Select options={estadoOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Obras;
