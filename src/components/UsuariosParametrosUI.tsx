import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import { Alert, Button, Card, Form, Input, Modal, Select, Switch, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, ReloadOutlined, UserAddOutlined } from "@ant-design/icons";
import { useAuth } from "../context/useAuth";
import {
  clientesBeckAPI,
  usuariosParametrosAPI,
  usuariosAPI,
  type ClienteBeck,
  type ObraClienteBeckResumen,
  type UsuarioApi,
  type UsuarioApiRol,
} from "../services/api";

type EmpresaParam = "beck" | "firemat";

type RoleOption = { label: string; value: UsuarioApiRol };

type Props = {
  empresa: EmpresaParam;
  rolesDisponibles: RoleOption[];
  defaultRol: UsuarioApiRol;
  titulo: string;
  subtitulo: string;
  labelCrear: string;
  labelCrearCliente?: string;
};

const roleLabels: Record<UsuarioApiRol, string> = {
  administrador: "Administrador",
  vendedor: "Vendedor",
  terreno: "Terreno",
  jefeobra: "Jefe de obra",
  ingenieria: "Ingeniería",
  visualizador: "Visualizador",
  vendedor_firemat: "Vendedor Firemat",
  bodeguero: "Bodeguero",
  visualizador_firemat: "Visualizador Firemat",
  cliente: "Cliente",
};

const roleTagColor: Record<UsuarioApiRol, string> = {
  administrador: "volcano",
  vendedor: "purple",
  terreno: "green",
  jefeobra: "cyan",
  ingenieria: "gold",
  visualizador: "geekblue",
  vendedor_firemat: "orange",
  bodeguero: "lime",
  visualizador_firemat: "blue",
  cliente: "teal",
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const backendData = error.response?.data;
    if (typeof backendData === "string" && backendData.trim()) return backendData;
    if (backendData && typeof backendData === "object") {
      const apiError = backendData as { error?: unknown; message?: unknown };
      if (typeof apiError.error === "string" && apiError.error.trim()) return apiError.error;
      if (typeof apiError.message === "string" && apiError.message.trim()) return apiError.message;
    }
    if (error.response?.status === 403) {
      return "No tienes permisos para realizar esta acción";
    }
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const apiError = data as { error?: unknown; message?: unknown };
      if (typeof apiError.error === "string" && apiError.error.trim()) return apiError.error;
      if (typeof apiError.message === "string" && apiError.message.trim()) return apiError.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const INGENIERIA_BECK_ROLES = new Set<UsuarioApiRol>([
  "terreno",
  "ingenieria",
  "visualizador",
  "vendedor",
  "jefeobra",
]);

type UsuarioFormValues = {
  nombre: string;
  email: string;
  password: string;
  rol: UsuarioApiRol;
  activo: boolean;
  clienteBeckId?: string;
  obraIds?: string[];
};

type UsuarioEditFormValues = Omit<UsuarioFormValues, "password">;

const formatClienteBeck = (cliente?: ClienteBeck): string => {
  if (!cliente) return "Sin Cliente Beck";
  return [cliente.razonSocial, cliente.nombreEmpresa, cliente.rut].filter(Boolean).join(" - ");
};

const formatObra = (obra: ObraClienteBeckResumen): string =>
  [obra.nombre, obra.codigo].filter(Boolean).join(" - ");

const formatTotalObras = (total: number): string =>
  `${total} ${total === 1 ? "obra asignada" : "obras asignadas"}`;

const ObrasAsignadasReadonly: React.FC<{
  obras: ObraClienteBeckResumen[];
  loading: boolean;
  clienteBeckId?: string;
}> = ({ obras, loading, clienteBeckId }) => {
  if (!clienteBeckId) return null;

  if (loading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        Cargando obras asociadas...
      </div>
    );
  }

  if (obras.length === 0) {
    return (
      <Alert
        className="mb-2"
        type="info"
        showIcon
        message="Este cliente no tiene obras asociadas"
      />
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">
          Obras asignadas autom&aacute;ticamente
        </span>
        <Tag color="green">{formatTotalObras(obras.length)}</Tag>
      </div>
      <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
        {obras.map((obra) => (
          <div
            key={obra.id}
            className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-sm text-slate-700"
          >
            {formatObra(obra)}
          </div>
        ))}
      </div>
    </div>
  );
};

const UsuariosParametrosUI: React.FC<Props> = ({
  empresa,
  rolesDisponibles,
  defaultRol,
  titulo,
  subtitulo,
  labelCrear,
  labelCrearCliente,
}) => {
  const { user: currentUser, refreshSession } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioApi | null>(null);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm<UsuarioFormValues>();
  const [editForm] = Form.useForm<UsuarioEditFormValues>();
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  const [clientesBeck, setClientesBeck] = useState<ClienteBeck[]>([]);
  const [loadingClientesBeck, setLoadingClientesBeck] = useState(false);
  const [obrasCliente, setObrasCliente] = useState<ObraClienteBeckResumen[]>([]);
  const [editObrasCliente, setEditObrasCliente] = useState<ObraClienteBeckResumen[]>([]);
  const [loadingObrasCliente, setLoadingObrasCliente] = useState(false);
  const [loadingEditObrasCliente, setLoadingEditObrasCliente] = useState(false);
  const createRol = Form.useWatch("rol", form);
  const editRol = Form.useWatch("rol", editForm);
  const createClienteBeckId = Form.useWatch("clienteBeckId", form);
  const editClienteBeckId = Form.useWatch("clienteBeckId", editForm);

  useEffect(() => {
    let isMounted = true;

    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      setFetchError(null);
      try {
        const response = empresa === "beck"
          ? await usuariosAPI.listar({ empresa: "beck" })
          : await usuariosParametrosAPI.listar(empresa);
        if (!isMounted) return;
        setUsuarios(Array.isArray(response) ? response : []);
      } catch (error) {
        if (!isMounted) return;
        const msg = getErrorMessage(error, "No se pudieron cargar los usuarios");
        setFetchError(msg);
        message.error(msg);
      } finally {
        if (isMounted) setLoadingUsuarios(false);
      }
    };

    void fetchUsuarios();
    return () => { isMounted = false; };
  }, [reloadKey, empresa]);

  useEffect(() => {
    if (empresa !== "beck") return;
    let isMounted = true;

    const fetchClientesBeck = async () => {
      setLoadingClientesBeck(true);
      try {
        const response = await clientesBeckAPI.listar();
        if (isMounted) setClientesBeck(response);
      } catch (error) {
        if (isMounted) {
          message.error(getErrorMessage(error, "No se pudieron cargar los clientes Beck"));
        }
      } finally {
        if (isMounted) setLoadingClientesBeck(false);
      }
    };

    void fetchClientesBeck();
    return () => { isMounted = false; };
  }, [empresa]);

  const cargarObrasClienteBeck = async (
    clienteBeckId: string,
    target: "create" | "edit",
    options?: { preselectAll?: boolean }
  ) => {
    const setLoading = target === "create" ? setLoadingObrasCliente : setLoadingEditObrasCliente;
    const setObras = target === "create" ? setObrasCliente : setEditObrasCliente;
    const targetForm = target === "create" ? form : editForm;
    setLoading(true);
    try {
      const response = await clientesBeckAPI.obras(clienteBeckId);
      setObras(response);
      if (options?.preselectAll) {
        const currentClienteBeckId = targetForm.getFieldValue("clienteBeckId");
        if (currentClienteBeckId === clienteBeckId) {
          const obraIds = response.map((obra) => obra.id);
          targetForm.setFieldValue("obraIds", obraIds);
          if (obraIds.length === 0) {
            message.info("Este cliente no tiene obras asociadas");
          }
        }
      }
    } catch (error) {
      setObras([]);
      if (options?.preselectAll) {
        targetForm.setFieldValue("obraIds", []);
      }
      message.error(getErrorMessage(error, "No se pudieron cargar las obras del Cliente Beck"));
    } finally {
      setLoading(false);
    }
  };

  const handleClienteBeckChange = (clienteBeckId: string | undefined, target: "create" | "edit") => {
    const targetForm = target === "create" ? form : editForm;
    const setObras = target === "create" ? setObrasCliente : setEditObrasCliente;
    targetForm.setFieldValue("obraIds", []);
    setObras([]);
    if (clienteBeckId) {
      void cargarObrasClienteBeck(clienteBeckId, target, { preselectAll: true });
    }
  };

  const setSavingState = (id: string, saving: boolean) => {
    setSavingById((prev) => {
      const next = { ...prev };
      if (saving) next[id] = true;
      else delete next[id];
      return next;
    });
  };

  const isSaving = (id: string) => Boolean(savingById[id]);
  const refreshUsuarios = () => setReloadKey((prev) => prev + 1);
  const isCurrentIngenieriaBeck =
    empresa === "beck" && (currentUser?.rol === "Ingenieria" || currentUser?.rol === "JefeObra");
  const canChangePassword =
    currentUser?.rol === "Administrador" || currentUser?.rol === "Ingenieria" || currentUser?.rol === "JefeObra";
  const rolesForCurrentUser = useMemo(
    () =>
      isCurrentIngenieriaBeck
        ? rolesDisponibles.filter((role) => INGENIERIA_BECK_ROLES.has(role.value))
        : rolesDisponibles,
    [isCurrentIngenieriaBeck, rolesDisponibles]
  );
  const canEditUsuario = (record: UsuarioApi) =>
    !isCurrentIngenieriaBeck || record.rol !== "administrador";
  const canToggleUsuario = (record: UsuarioApi) => {
    if (!isCurrentIngenieriaBeck) return true;
    if (record.rol === "administrador") return false;
    if (currentUser?.id === record.id && record.activo) return false;
    return true;
  };
  const [createClienteMode, setCreateClienteMode] = useState(false);

  const openCrearUsuario = () => {
    setCreateClienteMode(false);
    setObrasCliente([]);
    form.setFieldsValue({
      rol: rolesForCurrentUser[0]?.value ?? defaultRol,
      activo: true,
      clienteBeckId: undefined,
      obraIds: [],
    });
    setCreateOpen(true);
  };

  const openCrearUsuarioCliente = () => {
    setCreateClienteMode(true);
    setObrasCliente([]);
    form.setFieldsValue({ rol: "cliente", activo: true, clienteBeckId: undefined, obraIds: [] });
    setCreateOpen(true);
  };

  const crearUsuario = async () => {
    try {
      const values = await form.validateFields();
      if (values.rol === "cliente") {
        if (!values.clienteBeckId) {
          message.error("Selecciona un Cliente Beck");
          return;
        }
        if (loadingObrasCliente) {
          message.error("Espera a que se carguen las obras del Cliente Beck");
          return;
        }
      }
      setCreating(true);
      const obraIdsCliente = obrasCliente.map((obra) => obra.id);
      const payload = {
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        rol: values.rol,
        activo: values.activo,
        ...(values.rol === "cliente" && {
          clienteBeckId: values.clienteBeckId,
          obraIds: obraIdsCliente,
        }),
      };
      const nuevoUsuario = empresa === "beck"
        ? await usuariosAPI.crear(payload)
        : await usuariosParametrosAPI.crear(empresa, payload);
      setUsuarios((prev) => [nuevoUsuario, ...prev]);
      form.resetFields();
      setObrasCliente([]);
      setCreateOpen(false);
      message.success("Usuario creado correctamente");
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo crear el usuario"));
    } finally {
      setCreating(false);
    }
  };

  const openEditarUsuario = async (usuario: UsuarioApi) => {
    if (!canEditUsuario(usuario)) return;
    let usuarioDetalle = usuario;
    if (empresa === "beck" && usuario.rol === "cliente") {
      try {
        usuarioDetalle = await usuariosAPI.obtener(usuario.id);
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo cargar el detalle del usuario cliente"));
      }
    }
    const clienteBeckId = usuarioDetalle.clienteBeckId ?? undefined;
    const obraIds = usuarioDetalle.obraIds ?? usuarioDetalle.obras?.map((obra) => obra.id) ?? [];
    setEditingUsuario(usuarioDetalle);
    setEditObrasCliente(usuarioDetalle.obras ?? []);
    editForm.setFieldsValue({
      nombre: usuarioDetalle.nombre,
      email: usuarioDetalle.email,
      rol: usuarioDetalle.rol,
      activo: usuarioDetalle.activo,
      clienteBeckId,
      obraIds,
    });
    if (clienteBeckId) {
      void cargarObrasClienteBeck(clienteBeckId, "edit", { preselectAll: true });
    }
    setEditPassword("");
    setEditConfirmPassword("");
    setEditPasswordError(null);
  };

  const syncCurrentSessionIfNeeded = async (updatedUsuario: UsuarioApi) => {
    if (!currentUser || currentUser.id !== updatedUsuario.id) return;
    await refreshSession();
  };

  const updateUsuario = async (
    id: string,
    patch: Partial<Pick<UsuarioApi, "nombre" | "email" | "rol" | "activo">>,
    successMsg: string
  ) => {
    setSavingState(id, true);
    try {
      const updatedUsuario = empresa === "beck"
        ? await usuariosAPI.actualizar(id, patch)
        : await usuariosParametrosAPI.editar(empresa, id, patch);
      setUsuarios((prev) => prev.map((u) => (u.id === updatedUsuario.id ? updatedUsuario : u)));
      await syncCurrentSessionIfNeeded(updatedUsuario);
      message.success(successMsg);
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo actualizar el usuario"));
    } finally {
      setSavingState(id, false);
    }
  };

  const guardarEdicionUsuario = async () => {
    if (!editingUsuario || !canEditUsuario(editingUsuario)) return;

    try {
      const values = await editForm.validateFields();
      if (values.rol === "cliente") {
        if (!values.clienteBeckId) {
          message.error("Selecciona un Cliente Beck");
          return;
        }
        if (loadingEditObrasCliente) {
          message.error("Espera a que se carguen las obras del Cliente Beck");
          return;
        }
      }
      if (
        isCurrentIngenieriaBeck &&
        (!INGENIERIA_BECK_ROLES.has(values.rol) ||
          (currentUser?.id === editingUsuario.id && values.activo === false))
      ) {
        message.error("No tienes permisos para realizar esta accion");
        return;
      }

      const hasPassword = editPassword.trim().length > 0;
      const hasConfirm = editConfirmPassword.trim().length > 0;

      if (hasPassword || hasConfirm) {
        if (!hasPassword || !hasConfirm) {
          setEditPasswordError("Ambos campos de contraseña son obligatorios");
          return;
        }
        if (editPassword.length < 8) {
          setEditPasswordError("La contraseña debe tener al menos 8 caracteres");
          return;
        }
        if (editPassword !== editConfirmPassword) {
          setEditPasswordError("Las contraseñas no coinciden");
          return;
        }
      }

      setEditing(true);
      const obraIdsCliente = editObrasCliente.map((obra) => obra.id);
      const payload = {
        nombre: values.nombre,
        email: values.email,
        rol: values.rol,
        activo: values.activo,
        ...(values.rol === "cliente" && {
          clienteBeckId: values.clienteBeckId,
          obraIds: obraIdsCliente,
        }),
      };
      const updatedUsuario = empresa === "beck"
        ? await usuariosAPI.actualizar(editingUsuario.id, payload)
        : await usuariosParametrosAPI.editar(empresa, editingUsuario.id, payload);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === updatedUsuario.id ? updatedUsuario : u))
      );
      await syncCurrentSessionIfNeeded(updatedUsuario);

      if (hasPassword) {
        await usuariosAPI.cambiarPassword(editingUsuario.id, {
          password: editPassword,
          confirmPassword: editConfirmPassword,
        });
      }

      setEditingUsuario(null);
      editForm.resetFields();
      setEditObrasCliente([]);
      setEditPassword("");
      setEditConfirmPassword("");
      setEditPasswordError(null);
      message.success(
        hasPassword
          ? "Usuario y contraseña actualizados correctamente"
          : "Usuario actualizado correctamente"
      );
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo actualizar el usuario"));
    } finally {
      setEditing(false);
    }
  };

  const safeUsuarios = Array.isArray(usuarios) ? usuarios : [];
  const activos = safeUsuarios.filter((u) => u.activo).length;
  const inactivos = safeUsuarios.length - activos;
  const isFiremat = empresa === "firemat";
  const clientesBeckById = useMemo(
    () => new Map(clientesBeck.map((cliente) => [cliente.id, cliente])),
    [clientesBeck]
  );
  const clienteBeckOptions = useMemo(
    () =>
      clientesBeck.map((cliente) => ({
        value: cliente.id,
        label: formatClienteBeck(cliente),
      })),
    [clientesBeck]
  );
  const getTagColor = (rol: string) => roleTagColor[rol as UsuarioApiRol] ?? "default";
  const getRoleLabel = (rol: string) => roleLabels[rol as UsuarioApiRol] ?? rol;

  const cardBorderClass = isFiremat
    ? "border border-[#f4c4ba] bg-gradient-to-br from-white via-[#fde8e4]/60 to-[#fde8e4]/40"
    : "border border-amber-200 bg-gradient-to-br from-white via-amber-50/60 to-orange-50/40";
  const cardHeaderBg = isFiremat ? "#fde8e4" : "#fff7ed";
  const cardHeaderBorder = isFiremat ? "1px solid #f4c4ba" : "1px solid #fed7aa";
  const activoBorderClass = isFiremat ? "border-[#f4c4ba]" : "border-amber-200";
  const buttonBg = isFiremat ? "#e05c3b" : undefined;
  const iconColorClass = isFiremat ? "text-[#e05c3b]" : "text-orange-600";

  const columns: ColumnsType<UsuarioApi> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      width: 190,
      ellipsis: true,
      render: (value: string) => (
        <span className="block truncate text-xs font-medium text-slate-900" title={value}>
          {value}
        </span>
      ),
    },
    {
      title: "Correo",
      dataIndex: "email",
      key: "email",
      width: 280,
      ellipsis: true,
      render: (_value: string, record) => (
        <div className="leading-tight">
          <span className="block truncate text-xs text-slate-700" title={record.email}>
            {record.email}
          </span>
          <span
            className="block max-w-[260px] truncate text-[11px] text-slate-400"
            title={record.azureId ?? undefined}
          >
            {record.azureId ? `Azure ID: ${record.azureId}` : "Sin vinculo Microsoft"}
          </span>
        </div>
      ),
    },
    {
      title: "Rol",
      dataIndex: "rol",
      key: "rol",
      width: 260,
      render: (_value: UsuarioApiRol, record) => (
        <div className="flex min-w-0 items-center gap-2">
          <Tag color={getTagColor(record.rol)} style={{ marginInlineEnd: 0 }}>
            {getRoleLabel(record.rol)}
          </Tag>
          <Select<UsuarioApiRol>
            size="small"
            value={record.rol}
            options={rolesForCurrentUser}
            disabled={isSaving(record.id) || !canEditUsuario(record)}
            onChange={(rol) => {
              if (rol === record.rol) return;
              if (!canEditUsuario(record)) return;
              void updateUsuario(record.id, { rol }, "Rol actualizado");
            }}
            style={{ width: 160 }}
          />
        </div>
      ),
    },
    ...(empresa === "beck"
      ? [
          {
            title: "Cliente Beck",
            key: "clienteBeck",
            width: 220,
            ellipsis: true,
            render: (_value: unknown, record: UsuarioApi) =>
              record.rol === "cliente" ? (
                <span
                  className="block truncate text-xs text-slate-700"
                  title={formatClienteBeck(clientesBeckById.get(record.clienteBeckId ?? ""))}
                >
                  {formatClienteBeck(clientesBeckById.get(record.clienteBeckId ?? ""))}
                </span>
              ) : (
                <span className="text-xs text-slate-400">-</span>
              ),
          },
          {
            title: "Cantidad obras",
            key: "cantidadObrasAsignadas",
            width: 130,
            align: "center" as const,
            render: (_value: unknown, record: UsuarioApi) =>
              record.rol === "cliente" ? (
                <Tag color={(record.cantidadObrasAsignadas ?? record.obras?.length ?? 0) > 0 ? "green" : "default"}>
                  {record.cantidadObrasAsignadas ?? record.obras?.length ?? 0}
                </Tag>
              ) : (
                <span className="text-xs text-slate-400">-</span>
              ),
          },
        ]
      : []),
    {
      title: "Activo",
      dataIndex: "activo",
      key: "activo",
      width: 100,
      align: "center",
      render: (_value: boolean, record) => (
        canToggleUsuario(record) ? (
          <Switch
            size="small"
            checked={record.activo}
            loading={isSaving(record.id)}
            onChange={(activo) => {
              if (activo === record.activo) return;
              void updateUsuario(
                record.id,
                { activo },
                activo ? "Usuario activado" : "Usuario desactivado"
              );
            }}
          />
        ) : (
          <Tag color={record.activo ? "green" : "default"}>
            {record.activo ? "Activo" : "Inactivo"}
          </Tag>
        )
      ),
    },
    {
      title: "Creado",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (value: string) => (
        <span className="text-[11px] text-slate-600">
          {dayjs(value).format("DD-MM-YYYY HH:mm")}
        </span>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 130,
      fixed: "right",
      align: "center",
      render: (_value: unknown, record) =>
        canEditUsuario(record) ? (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => void openEditarUsuario(record)}
            disabled={isSaving(record.id)}
          >
            Editar
          </Button>
        ) : (
          null
        ),
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-wide text-slate-900 sm:text-xl">
            {titulo}
          </h1>
          <p className="max-w-2xl text-[11px] text-slate-600 sm:text-xs">
            {subtitulo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {empresa === "beck" && labelCrearCliente && !isCurrentIngenieriaBeck && (
            <Button
              icon={<UserAddOutlined />}
              onClick={openCrearUsuarioCliente}
              className="border-slate-300"
            >
              {labelCrearCliente}
            </Button>
          )}
          {empresa === "beck" && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={openCrearUsuario}
              style={buttonBg ? { backgroundColor: buttonBg, borderColor: buttonBg } : undefined}
              className={!buttonBg ? "bg-orange-500" : undefined}
            >
              {labelCrear}
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={refreshUsuarios}
            loading={loadingUsuarios}
            className="border-slate-200"
          >
            Recargar
          </Button>
        </div>
      </div>

      {fetchError && (
        <Alert
          type="error"
          message={fetchError}
          showIcon
          closable
          onClose={() => setFetchError(null)}
        />
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[380px,minmax(0,1fr)]">
        <Card
          className={`${cardBorderClass} min-w-0`}
          title={
            <div className="flex items-center gap-2 text-sm">
              <UserAddOutlined className={iconColorClass} />
              <span>Gestión de usuarios</span>
            </div>
          }
          styles={{
            header: {
              backgroundColor: cardHeaderBg,
              color: "#020617",
              borderBottom: cardHeaderBorder,
              fontSize: 13,
            },
            body: { padding: 14 },
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border ${activoBorderClass} bg-white/80 p-3`}>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Activos</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{activos}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Inactivos</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{inactivos}</p>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-[11px] leading-5 text-slate-600">
              <p className="mb-3">
                Crea usuarios para que puedan ingresar a la app móvil con correo y contraseña.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={openCrearUsuario}
                  style={buttonBg ? { backgroundColor: buttonBg, borderColor: buttonBg } : undefined}
                  className={!buttonBg ? "w-full bg-orange-500" : "w-full"}
                >
                  {labelCrear}
                </Button>
                {labelCrearCliente && !isCurrentIngenieriaBeck && (
                  <Button
                    icon={<UserAddOutlined />}
                    onClick={openCrearUsuarioCliente}
                    className="w-full border-slate-300"
                  >
                    {labelCrearCliente}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card
          className="min-w-0 border border-slate-200 bg-white"
          title={
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Usuarios</span>
              <span className="text-xs text-slate-500">{safeUsuarios.length}</span>
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
          <div className="overflow-x-auto">
          <Table<UsuarioApi>
            rowKey="id"
            columns={columns}
            dataSource={safeUsuarios}
            loading={loadingUsuarios}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: empresa === "beck" ? 1460 : 1110 }}
            tableLayout="fixed"
            rowClassName={(record) => (record.activo ? "" : "opacity-70")}
            locale={{
              emptyText: loadingUsuarios ? "Cargando usuarios..." : "No hay usuarios para mostrar",
            }}
          />
          </div>
        </Card>
      </div>

      <Modal
        title={
          createClienteMode
            ? "Crear usuario cliente"
            : isFiremat
              ? "Crear usuario Firemat"
              : "Crear usuario app"
        }
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setCreateClienteMode(false);
          setObrasCliente([]);
          form.resetFields();
        }}
        onOk={crearUsuario}
        confirmLoading={creating}
        okText={createClienteMode ? labelCrearCliente ?? labelCrear : labelCrear}
        cancelText="Cancelar"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ rol: defaultRol, activo: true }}
        >
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Ingresa el nombre" }]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>
          <Form.Item
            label="Correo"
            name="email"
            rules={[
              { required: true, message: "Ingresa el correo" },
              { type: "email", message: "Correo no válido" },
            ]}
          >
            <Input placeholder={isFiremat ? "usuario@firemat.cl" : "usuario@becksoluciones.cl"} />
          </Form.Item>
          <Form.Item
            label="Contraseña"
            name="password"
            rules={[
              { required: true, message: "Ingresa una contraseña" },
              { min: 6, message: "Mínimo 6 caracteres" },
            ]}
          >
            <Input.Password placeholder="Contraseña para la app" />
          </Form.Item>
          <Form.Item
            label="Rol"
            name="rol"
            rules={[{ required: true, message: "Selecciona un rol" }]}
          >
            <Select options={rolesForCurrentUser} />
          </Form.Item>
          {empresa === "beck" && createRol === "cliente" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <Form.Item
                label="Cliente Beck"
                name="clienteBeckId"
                rules={[{ required: true, message: "Selecciona un Cliente Beck" }]}
              >
                <Select
                  showSearch
                  placeholder="Selecciona Cliente Beck"
                  loading={loadingClientesBeck}
                  options={clienteBeckOptions}
                  optionFilterProp="label"
                  onChange={(clienteBeckId) => handleClienteBeckChange(clienteBeckId, "create")}
                />
              </Form.Item>
              <Form.Item name="obraIds" hidden />
              <ObrasAsignadasReadonly
                obras={obrasCliente}
                loading={loadingObrasCliente}
                clienteBeckId={createClienteBeckId}
              />
            </div>
          )}
          <Form.Item label="Activo" name="activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Editar usuario"
        open={Boolean(editingUsuario)}
        onCancel={() => {
          if (editing) return;
          setEditingUsuario(null);
          editForm.resetFields();
          setEditObrasCliente([]);
          setEditPassword("");
          setEditConfirmPassword("");
          setEditPasswordError(null);
        }}
        onOk={() => void guardarEdicionUsuario()}
        confirmLoading={editing}
        okText="Guardar cambios"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Ingresa el nombre" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Correo"
            name="email"
            rules={[
              { required: true, message: "Ingresa el correo" },
              { type: "email", message: "Correo no válido" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Rol"
            name="rol"
            rules={[{ required: true, message: "Selecciona un rol" }]}
          >
            <Select options={rolesForCurrentUser} />
          </Form.Item>
          {empresa === "beck" && editRol === "cliente" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <Form.Item
                label="Cliente Beck"
                name="clienteBeckId"
                rules={[{ required: true, message: "Selecciona un Cliente Beck" }]}
              >
                <Select
                  showSearch
                  placeholder="Selecciona Cliente Beck"
                  loading={loadingClientesBeck}
                  options={clienteBeckOptions}
                  optionFilterProp="label"
                  onChange={(clienteBeckId) => handleClienteBeckChange(clienteBeckId, "edit")}
                />
              </Form.Item>
              <Form.Item name="obraIds" hidden />
              <ObrasAsignadasReadonly
                obras={editObrasCliente}
                loading={loadingEditObrasCliente}
                clienteBeckId={editClienteBeckId}
              />
            </div>
          )}
          <Form.Item label="Activo" name="activo" valuePropName="checked">
            <Switch
              disabled={
                isCurrentIngenieriaBeck &&
                editingUsuario?.id === currentUser?.id &&
                editingUsuario?.activo
              }
            />
          </Form.Item>
        </Form>

        {canChangePassword && (
          <div className="mt-1">
            <div className="mb-3 border-t border-slate-200 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cambiar contraseña (opcional)
              </p>
            </div>
            {editingUsuario?.azureId ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Usuario Microsoft. La contraseña se administra desde Microsoft.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">
                    Nueva contraseña
                  </label>
                  <Input.Password
                    value={editPassword}
                    onChange={(e) => {
                      setEditPassword(e.target.value);
                      setEditPasswordError(null);
                    }}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">
                    Confirmar contraseña
                  </label>
                  <Input.Password
                    value={editConfirmPassword}
                    onChange={(e) => {
                      setEditConfirmPassword(e.target.value);
                      setEditPasswordError(null);
                    }}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    status={editPasswordError ? "error" : undefined}
                  />
                  {editPasswordError && (
                    <p className="mt-1 text-xs text-red-500">{editPasswordError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UsuariosParametrosUI;
