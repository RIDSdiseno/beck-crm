import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import { Alert, Button, Card, Form, Input, Modal, Select, Switch, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, ReloadOutlined, UserAddOutlined } from "@ant-design/icons";
import { useAuth } from "../context/useAuth";
import {
  usuariosParametrosAPI,
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

const UsuariosParametrosUI: React.FC<Props> = ({
  empresa,
  rolesDisponibles,
  defaultRol,
  titulo,
  subtitulo,
  labelCrear,
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
  const [form] = Form.useForm<{
    nombre: string;
    email: string;
    password: string;
    rol: UsuarioApiRol;
    activo: boolean;
  }>();
  const [editForm] = Form.useForm<{
    nombre: string;
    email: string;
    rol: UsuarioApiRol;
    activo: boolean;
  }>();

  useEffect(() => {
    let isMounted = true;

    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      setFetchError(null);
      try {
        const response = await usuariosParametrosAPI.listar(empresa);
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
    empresa === "beck" && currentUser?.rol === "Ingenieria";
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
  const openCrearUsuario = () => {
    form.setFieldsValue({
      rol: rolesForCurrentUser[0]?.value ?? defaultRol,
      activo: true,
    });
    setCreateOpen(true);
  };

  const crearUsuario = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const nuevoUsuario = await usuariosParametrosAPI.crear(empresa, {
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        rol: values.rol,
        activo: values.activo,
      });
      setUsuarios((prev) => [nuevoUsuario, ...prev]);
      form.resetFields();
      setCreateOpen(false);
      message.success("Usuario creado correctamente");
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo crear el usuario"));
    } finally {
      setCreating(false);
    }
  };

  const openEditarUsuario = (usuario: UsuarioApi) => {
    if (!canEditUsuario(usuario)) return;
    setEditingUsuario(usuario);
    editForm.setFieldsValue({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    });
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
      const updatedUsuario = await usuariosParametrosAPI.editar(empresa, id, patch);
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
      if (
        isCurrentIngenieriaBeck &&
        (!INGENIERIA_BECK_ROLES.has(values.rol) ||
          (currentUser?.id === editingUsuario.id && values.activo === false))
      ) {
        message.error("No tienes permisos para realizar esta accion");
        return;
      }

      setEditing(true);
      const updatedUsuario = await usuariosParametrosAPI.editar(
        empresa,
        editingUsuario.id,
        {
          nombre: values.nombre,
          email: values.email,
          rol: values.rol,
          activo: values.activo,
        }
      );
      setUsuarios((prev) =>
        prev.map((u) => (u.id === updatedUsuario.id ? updatedUsuario : u))
      );
      await syncCurrentSessionIfNeeded(updatedUsuario);
      setEditingUsuario(null);
      editForm.resetFields();
      message.success("Usuario actualizado correctamente");
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
            onClick={() => openEditarUsuario(record)}
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
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={openCrearUsuario}
                style={buttonBg ? { backgroundColor: buttonBg, borderColor: buttonBg } : undefined}
                className={!buttonBg ? "w-full bg-orange-500" : "w-full"}
              >
                {labelCrear}
              </Button>
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
            scroll={{ x: 1110 }}
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
        title={isFiremat ? "Crear usuario Firemat" : "Crear usuario app"}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={crearUsuario}
        confirmLoading={creating}
        okText={labelCrear}
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
              { type: "email", message: "Correo no vÃ¡lido" },
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
      </Modal>
    </div>
  );
};

export default UsuariosParametrosUI;
