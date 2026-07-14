import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import { Alert, Button, Card, Form, Input, Modal, Select, Switch, Table, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { FormInstance } from "antd/es/form";
import { EditOutlined, KeyOutlined, ReloadOutlined, UserAddOutlined } from "@ant-design/icons";
import { useAuth } from "../context/useAuth";
import { usePermisos } from "../hooks/usePermisos";
import {
  clientesBeckAPI,
  obrasAPI,
  permisosUsuarioAPI,
  usuariosParametrosAPI,
  usuariosAPI,
  type ClienteBeck,
  type ModuloBeck,
  type ObraClienteBeckResumen,
  type PermisoModulo,
  type PermisoModuloInput,
  type PermisosUsuarioDetalleResponse,
  type UsuarioApi,
  type UsuarioApiRol,
} from "../services/api";

type EmpresaParam = "beck" | "firemat";

type RoleOption = { label: string; value: UsuarioApiRol };

const MODULOS_BECK: Array<{ key: ModuloBeck; label: string }> = [
  { key: "beck_dashboard", label: "Dashboard" },
  { key: "beck_procesamiento_ingenieria", label: "Procesamiento Ingeniería" },
  { key: "beck_oficina_tecnica", label: "Oficina Técnica" },
  { key: "beck_registro", label: "Registro" },
  { key: "beck_reportes", label: "Reportes" },
  { key: "beck_cotizaciones", label: "Cotizaciones" },
  { key: "beck_movimientos", label: "Movimientos" },
  { key: "beck_obras", label: "Obras" },
  { key: "beck_funnel", label: "Funnel" },
  { key: "beck_clientes", label: "Clientes" },
  { key: "beck_vista_cliente", label: "Vista Cliente" },
  { key: "beck_usuarios_parametros", label: "Usuarios y parámetros" },
  { key: "beck_reglas_validacion", label: "Reglas de Validación" },
];

const MODULOS_BECK_CLIENTE = MODULOS_BECK.filter(
  (modulo) => modulo.key === "beck_vista_cliente"
);

const isRolCliente = (rol?: string | null): boolean => rol?.toLowerCase() === "cliente";

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

const filtrarObrasPorClienteBeck = (
  obras: ObraClienteBeckResumen[],
  clienteBeckId?: string
): ObraClienteBeckResumen[] => {
  if (!clienteBeckId) return [];
  return obras.filter((obra) => obra.clienteBeckId === clienteBeckId);
};

// Campo sin render propio: solo mantiene "obraIds" registrado en el Form (para que
// validateFields/getFieldsValue lo incluyan), mientras el Select y los chips debajo
// se manejan a mano vía form.setFieldValue.
const HiddenObraIdsField: React.FC<{ value?: string[]; onChange?: (value: string[]) => void }> = () => null;

const ObrasClienteSelector: React.FC<{
  form: FormInstance;
  obras: ObraClienteBeckResumen[];
  loading: boolean;
  clienteBeckId?: string;
  disabled?: boolean;
}> = ({ form, obras, loading, clienteBeckId, disabled }) => {
  const selectorDisabled = disabled || !clienteBeckId;
  const selectedIds: string[] = Form.useWatch("obraIds", form) ?? [];
  const obrasPorId = useMemo(() => new Map(obras.map((obra) => [obra.id, obra])), [obras]);

  const agregarObra = (obraId: string) => {
    if (!obraId || selectedIds.includes(obraId)) return;
    form.setFieldValue("obraIds", [...selectedIds, obraId]);
  };

  const quitarObra = (obraId: string) => {
    form.setFieldValue("obraIds", selectedIds.filter((id) => id !== obraId));
  };

  return (
    <>
      <Form.Item label="Obras visibles para el cliente">
        <Select
          value={undefined}
          showSearch
          allowClear
          placeholder={clienteBeckId ? "Buscar y agregar una obra" : "Primero selecciona un Cliente Beck"}
          loading={loading}
          disabled={selectorDisabled}
          optionFilterProp="label"
          onChange={(value) => { if (typeof value === "string") agregarObra(value); }}
          options={obras
            .filter((obra) => !selectedIds.includes(obra.id))
            .map((obra) => ({ value: obra.id, label: formatObra(obra) }))}
        />
      </Form.Item>
      <Form.Item name="obraIds" hidden>
        <HiddenObraIdsField />
      </Form.Item>
      <div className="mb-1 flex flex-wrap gap-1.5">
        {selectedIds.length === 0 ? (
          <span className="text-xs text-slate-400">Sin obras seleccionadas</span>
        ) : (
          selectedIds.map((id) => {
            const obra = obrasPorId.get(id);
            return (
              <Tag
                key={id}
                closable={!selectorDisabled}
                onClose={() => quitarObra(id)}
              >
                {obra ? formatObra(obra) : id}
              </Tag>
            );
          })
        )}
      </div>
      <p className="mb-2 text-xs text-slate-400">
        Este cliente solo podrá visualizar las obras seleccionadas.
      </p>
      {clienteBeckId && !loading && obras.length === 0 && (
        <Alert
          className="mb-2"
          type="info"
          showIcon
          message="El Cliente Beck seleccionado no tiene obras disponibles"
        />
      )}
    </>
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
  const { canEdit } = usePermisos();
  const canEditModulo =
    empresa === "beck"
      ? canEdit("beck_usuarios_parametros")
      : canEdit("firemat_usuarios_parametros");
  const editPermissionMessage =
    empresa === "firemat"
      ? "No tienes permiso para editar usuarios y parámetros Firemat."
      : "No tienes permisos para realizar esta accion";
  const getWriteErrorMessage = (error: unknown, fallback: string) =>
    isAxiosError(error) && error.response?.status === 403
      ? editPermissionMessage
      : getErrorMessage(error, fallback);
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
    // Solo Administrador puede crear/editar usuarios de rol "cliente" y necesita la lista de clientes Beck.
    // Otros roles (JefeObra, Ingeniería, etc.) no tienen ese acceso y el endpoint devolvería 403.
    if (currentUser?.rol !== "Administrador") return;
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
  }, [empresa, currentUser?.rol]);

  const cargarObrasDisponibles = async (target: "create" | "edit", clienteBeckId?: string) => {
    const setLoading = target === "create" ? setLoadingObrasCliente : setLoadingEditObrasCliente;
    const setObras = target === "create" ? setObrasCliente : setEditObrasCliente;
    if (!clienteBeckId) {
      setObras([]);
      return;
    }
    setLoading(true);
    try {
      const response = await obrasAPI.listar({ activa: true });
      setObras(filtrarObrasPorClienteBeck(response, clienteBeckId));
    } catch (error) {
      setObras([]);
      message.error(getErrorMessage(error, "No se pudieron cargar las obras disponibles"));
    } finally {
      setLoading(false);
    }
  };

  const handleClienteBeckChange = (clienteBeckId: string | undefined, target: "create" | "edit") => {
    const targetForm = target === "create" ? form : editForm;
    const setObras = target === "create" ? setObrasCliente : setEditObrasCliente;
    targetForm.setFieldValue("clienteBeckId", clienteBeckId);
    targetForm.setFieldValue("obraIds", []);
    setObras([]);
  };

  // Estos efectos solo cargan las OPCIONES (obrasCliente/editObrasCliente) cuando hay
  // un Cliente Beck seleccionado. Nunca deben limpiar el valor "obraIds" del formulario:
  // esa limpieza ya la hace explicitamente handleClienteBeckChange cuando el admin cambia
  // el Cliente Beck, y hacerlo tambien aqui de forma reactiva corre el riesgo de disparar
  // con un "createClienteBeckId"/"editClienteBeckId" (Form.useWatch) que aun no reflejo
  // el ultimo form.setFieldsValue, borrando una seleccion recien cargada al abrir "Editar".
  useEffect(() => {
    if (empresa !== "beck" || !createOpen || createRol !== "cliente" || !createClienteBeckId) {
      return;
    }
    if (obrasCliente.length > 0 || loadingObrasCliente) return;
    void cargarObrasDisponibles("create", createClienteBeckId);
  }, [createClienteBeckId, createOpen, createRol, empresa, loadingObrasCliente, obrasCliente.length]);

  useEffect(() => {
    if (empresa !== "beck" || !editingUsuario || editRol !== "cliente" || !editClienteBeckId) {
      return;
    }
    if (editObrasCliente.length > 0 || loadingEditObrasCliente) return;
    void cargarObrasDisponibles("edit", editClienteBeckId);
  }, [editClienteBeckId, editObrasCliente.length, editRol, editingUsuario, empresa, loadingEditObrasCliente]);

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
  const canChangePassword = canEditModulo;
  const rolesForCurrentUser = useMemo(
    () =>
      isCurrentIngenieriaBeck
        ? rolesDisponibles.filter((role) => INGENIERIA_BECK_ROLES.has(role.value))
        : rolesDisponibles,
    [isCurrentIngenieriaBeck, rolesDisponibles]
  );
  const canEditUsuario = (record: UsuarioApi) =>
    canEditModulo && (!isCurrentIngenieriaBeck || record.rol !== "administrador");
  const canToggleUsuario = (record: UsuarioApi) => {
    if (!canEditUsuario(record)) return false;
    if (!isCurrentIngenieriaBeck) return true;
    if (record.rol === "administrador") return false;
    if (currentUser?.id === record.id && record.activo) return false;
    return true;
  };
  const [createClienteMode, setCreateClienteMode] = useState(false);

  // ── Permisos modal ──────────────────────────────────────────────────────────
  const [permisosUsuario, setPermisosUsuario] = useState<UsuarioApi | null>(null);
  const [permisosData, setPermisosData] = useState<PermisoModulo[]>([]);
  const [permisosDetalle, setPermisosDetalle] = useState<PermisosUsuarioDetalleResponse | null>(null);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [savingPermisos, setSavingPermisos] = useState(false);
  const openPermisosModal = async (usuario: UsuarioApi) => {
    setPermisosUsuario(usuario);
    setPermisosDetalle(null);
    setLoadingPermisos(true);
    try {
      const detalle = await permisosUsuarioAPI.obtenerDetallado(usuario.id);
      setPermisosDetalle(detalle);
      const permisosUsuarioExistentes =
        detalle.permisosUsuario ?? detalle.permisos ?? detalle.permisosEfectivos ?? [];
      setPermisosData(Array.isArray(permisosUsuarioExistentes) ? [...permisosUsuarioExistentes] : []);
    } catch {
      setPermisosDetalle(null);
      setPermisosData([]);
      message.error("No se pudieron cargar los permisos");
    } finally {
      setLoadingPermisos(false);
    }
  };

  const getPermisoModulo = (modulo: ModuloBeck): PermisoModulo => {
    const found = permisosData.find((p) => p.modulo === modulo);
    return found ?? { modulo, puedeVer: true, puedeEditar: true };
  };

  const getPermisoRol = (modulo: ModuloBeck): PermisoModulo => {
    const list = permisosDetalle?.permisosRol ?? [];
    return list.find((p) => p.modulo === modulo) ?? { modulo, puedeVer: true, puedeEditar: true };
  };

  const getPermisoEfectivo = (modulo: ModuloBeck): PermisoModulo => {
    const list = permisosDetalle?.permisosEfectivos ?? [];
    return list.find((p) => p.modulo === modulo) ?? { modulo, puedeVer: true, puedeEditar: true };
  };

  const modulosPermisosVisibles =
    permisosUsuario && isRolCliente(permisosUsuario.rol) ? MODULOS_BECK_CLIENTE : MODULOS_BECK;

  const setPermisoModulo = (modulo: ModuloBeck, field: "puedeVer" | "puedeEditar", value: boolean) => {
    setPermisosData((prev) => {
      const existing = prev.find((p) => p.modulo === modulo);
      let next: PermisoModulo;
      if (field === "puedeVer" && !value) {
        next = { modulo, puedeVer: false, puedeEditar: false };
      } else if (field === "puedeEditar" && value) {
        next = { modulo, puedeVer: true, puedeEditar: true };
      } else {
        next = { ...(existing ?? { modulo, puedeVer: true, puedeEditar: true }), [field]: value };
      }
      if (existing) {
        return prev.map((p) => (p.modulo === modulo ? next : p));
      }
      return [...prev, next];
    });
  };

  const guardarPermisos = async () => {
    if (!permisosUsuario) return;
    if (!canEditModulo) {
      message.error(editPermissionMessage);
      return;
    }
    setSavingPermisos(true);
    try {
      const esCliente = isRolCliente(permisosUsuario.rol);
      const permisosBase =
        permisosDetalle?.permisosUsuario ??
        permisosDetalle?.permisos ??
        permisosDetalle?.permisosEfectivos ??
        permisosData;
      const permisosBaseByModulo = new Map(permisosBase.map((permiso) => [permiso.modulo, permiso]));
      const payload: PermisoModuloInput[] = MODULOS_BECK.map(({ key }) => {
        const p = esCliente && key !== "beck_vista_cliente"
          ? permisosBaseByModulo.get(key) ?? getPermisoModulo(key)
          : getPermisoModulo(key);
        return { modulo: key, puedeVer: p.puedeVer, puedeEditar: p.puedeEditar };
      });
      await permisosUsuarioAPI.actualizar(permisosUsuario.id, payload);
      message.success("Permisos guardados correctamente");
      setPermisosUsuario(null);
    } catch (error) {
      message.error(getWriteErrorMessage(error, "No se pudieron guardar los permisos"));
    } finally {
      setSavingPermisos(false);
    }
  };

  const openCrearUsuario = () => {
    if (!canEditModulo) {
      message.error(editPermissionMessage);
      return;
    }
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
    if (!canEditModulo) {
      message.error(editPermissionMessage);
      return;
    }
    setCreateClienteMode(true);
    setObrasCliente([]);
    form.setFieldsValue({ rol: "cliente", activo: true, clienteBeckId: undefined, obraIds: [] });
    setCreateOpen(true);
  };

  const crearUsuario = async () => {
    if (!canEditModulo) {
      message.error(editPermissionMessage);
      return;
    }
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
      const obraIdsCliente = values.rol === "cliente" ? values.obraIds ?? [] : undefined;
      const payload = {
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        rol: values.rol,
        activo: values.activo,
        ...(values.rol === "cliente" && {
          clienteBeckId: values.clienteBeckId,
          obraIds: obraIdsCliente ?? [],
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
      message.error(getWriteErrorMessage(error, "No se pudo crear el usuario"));
    } finally {
      setCreating(false);
    }
  };

  const openEditarUsuario = async (usuario: UsuarioApi) => {
    if (!canEditUsuario(usuario)) {
      message.error(editPermissionMessage);
      return;
    }
    let usuarioDetalle = usuario;
    if (empresa === "beck" && usuario.rol === "cliente") {
      try {
        usuarioDetalle = await usuariosAPI.obtener(usuario.id);
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo cargar el detalle del usuario cliente"));
      }
    }
    const clienteBeckId = usuarioDetalle.clienteBeckId ?? undefined;
    // usuarioDetalle.obraIds/obras ya vienen completos (sin filtrar por estado) desde
    // usuariosAPI.obtener(id) — son la fuente de verdad de las obras asignadas.
    const obraIds = usuarioDetalle.obraIds ?? usuarioDetalle.obras?.map((obra) => obra.id) ?? [];
    const obrasAsignadas = usuarioDetalle.obras ?? [];
    let obrasParaOpciones: ObraClienteBeckResumen[] = [];
    if (usuarioDetalle.rol === "cliente") {
      setLoadingEditObrasCliente(true);
      try {
        const obrasDisponibles = await obrasAPI.listar({ activa: true });
        const obrasActivasDelCliente = filtrarObrasPorClienteBeck(obrasDisponibles, clienteBeckId);
        // Mostrar como opciones seleccionables las obras activas del Cliente Beck,
        // mas cualquier obra ya asignada (aunque no este "activa") para no perder la seleccion.
        const obrasMap = new Map(obrasActivasDelCliente.map((obra) => [obra.id, obra]));
        for (const obra of obrasAsignadas) {
          if (!obrasMap.has(obra.id)) obrasMap.set(obra.id, obra);
        }
        obrasParaOpciones = [...obrasMap.values()];
      } catch (error) {
        obrasParaOpciones = obrasAsignadas;
        message.error(getErrorMessage(error, "No se pudieron cargar las obras disponibles"));
      } finally {
        setLoadingEditObrasCliente(false);
      }
    }
    setEditObrasCliente(obrasParaOpciones);
    setEditingUsuario(usuarioDetalle);
    editForm.setFieldsValue({
      nombre: usuarioDetalle.nombre,
      email: usuarioDetalle.email,
      rol: usuarioDetalle.rol,
      activo: usuarioDetalle.activo,
      clienteBeckId,
      obraIds,
    });
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
    if (!canEditModulo) {
      message.error(editPermissionMessage);
      return;
    }
    setSavingState(id, true);
    try {
      const updatedUsuario = empresa === "beck"
        ? await usuariosAPI.actualizar(id, patch)
        : await usuariosParametrosAPI.editar(empresa, id, patch);
      setUsuarios((prev) => prev.map((u) => (u.id === updatedUsuario.id ? updatedUsuario : u)));
      await syncCurrentSessionIfNeeded(updatedUsuario);
      message.success(successMsg);
    } catch (error) {
      message.error(getWriteErrorMessage(error, "No se pudo actualizar el usuario"));
    } finally {
      setSavingState(id, false);
    }
  };

  const guardarEdicionUsuario = async () => {
    if (!editingUsuario) return;
    if (!canEditUsuario(editingUsuario)) {
      message.error(editPermissionMessage);
      return;
    }

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
      const obraIdsCliente = values.rol === "cliente" ? values.obraIds ?? [] : undefined;
      const payload = {
        nombre: values.nombre,
        email: values.email,
        rol: values.rol,
        activo: values.activo,
        ...(values.rol === "cliente" && {
          clienteBeckId: values.clienteBeckId,
          obraIds: obraIdsCliente ?? [],
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
      message.error(getWriteErrorMessage(error, "No se pudo actualizar el usuario"));
    } finally {
      setEditing(false);
    }
  };

  const safeUsuarios = Array.isArray(usuarios) ? usuarios : [];
  const usuariosInternos = safeUsuarios.filter((usuario) => usuario.rol !== "cliente");
  const usuariosCliente = safeUsuarios.filter((usuario) => usuario.rol === "cliente");
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

  const nombreColumn: ColumnsType<UsuarioApi>[number] = {
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
  };

  const correoColumn: ColumnsType<UsuarioApi>[number] = {
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
  };

  const rolColumn: ColumnsType<UsuarioApi>[number] = {
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
  };

  const clienteBeckColumn: ColumnsType<UsuarioApi>[number] = {
    title: "Cliente Beck",
    key: "clienteBeck",
    width: 260,
    ellipsis: true,
    render: (_value: unknown, record: UsuarioApi) => {
      if (!record.clienteBeckId) {
        return <span className="text-xs text-slate-400">Sin Cliente Beck</span>;
      }
      const embedded = record.clienteBeck;
      const fromMap = clientesBeckById.get(record.clienteBeckId);
      const label = embedded
        ? [embedded.razonSocial, embedded.nombreEmpresa, embedded.rut].filter(Boolean).join(" - ")
        : fromMap
          ? formatClienteBeck(fromMap)
          : record.clienteBeckId;
      return (
        <span className="block truncate text-xs text-slate-700" title={label}>
          {label}
        </span>
      );
    },
  };

  const cantidadObrasColumn: ColumnsType<UsuarioApi>[number] = {
    title: "Cantidad obras",
    key: "cantidadObrasAsignadas",
    width: 130,
    align: "center" as const,
    render: (_value: unknown, record: UsuarioApi) => {
      const total = record.cantidadObrasAsignadas ?? record.obras?.length ?? 0;
      return <Tag color={total > 0 ? "green" : "default"}>{total}</Tag>;
    },
  };

  const activoColumn: ColumnsType<UsuarioApi>[number] = {
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
  };

  const accionesColumn: ColumnsType<UsuarioApi>[number] = {
    title: "Acciones",
    key: "acciones",
    width: empresa === "beck" && currentUser?.rol === "Administrador" ? 190 : 130,
    align: "center",
    render: (_value: unknown, record) => (
      <div className="flex items-center justify-center gap-1">
        {canEditUsuario(record) && (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => void openEditarUsuario(record)}
            disabled={isSaving(record.id)}
          >
            Editar
          </Button>
        )}
        {empresa === "beck" && currentUser?.rol === "Administrador" && (
          <Tooltip title="Configurar permisos de módulos">
            <Button
              size="small"
              icon={<KeyOutlined />}
              onClick={() => void openPermisosModal(record)}
            >
              Permisos
            </Button>
          </Tooltip>
        )}
      </div>
    ),
  };

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
            render: (_value: unknown, record: UsuarioApi) => {
              if (record.rol !== "cliente") {
                return <span className="text-xs text-slate-400">-</span>;
              }
              if (!record.clienteBeckId) {
                return <span className="text-xs text-slate-400">Sin Cliente Beck</span>;
              }
              // Prefer embedded object (always available), fall back to admin map
              const embedded = record.clienteBeck;
              const fromMap = clientesBeckById.get(record.clienteBeckId);
              const label = embedded
                ? [embedded.razonSocial, embedded.nombreEmpresa, embedded.rut].filter(Boolean).join(" - ")
                : fromMap
                  ? formatClienteBeck(fromMap)
                  : record.clienteBeckId;
              return (
                <span className="block truncate text-xs text-slate-700" title={label}>
                  {label}
                </span>
              );
            },
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
      width: empresa === "beck" && currentUser?.rol === "Administrador" ? 190 : 130,
      align: "center",
      render: (_value: unknown, record) => (
        <div className="flex items-center justify-center gap-1">
          {canEditUsuario(record) && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => void openEditarUsuario(record)}
              disabled={isSaving(record.id)}
            >
              Editar
            </Button>
          )}
          {empresa === "beck" && currentUser?.rol === "Administrador" && (
            <Tooltip title="Configurar permisos de módulos">
              <Button
                size="small"
                icon={<KeyOutlined />}
                onClick={() => void openPermisosModal(record)}
              >
                Permisos
              </Button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  const usuariosInternosColumns: ColumnsType<UsuarioApi> = [
    nombreColumn,
    correoColumn,
    rolColumn,
    activoColumn,
    accionesColumn,
  ];

  const usuariosClienteColumns: ColumnsType<UsuarioApi> = [
    nombreColumn,
    correoColumn,
    clienteBeckColumn,
    cantidadObrasColumn,
    activoColumn,
    accionesColumn,
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
          {empresa === "beck" && labelCrearCliente && !isCurrentIngenieriaBeck && canEditModulo && (
            <Button
              icon={<UserAddOutlined />}
              onClick={openCrearUsuarioCliente}
              className="border-slate-300"
            >
              {labelCrearCliente}
            </Button>
          )}
          {empresa === "beck" && canEditModulo && (
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
              {canEditModulo && (
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
              )}
            </div>
          </div>
        </Card>

        {empresa === "beck" ? (
          <div className="min-w-0 space-y-4">
            <Card
              className="min-w-0 border border-slate-200 bg-white"
              title={
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>Usuarios internos</span>
                  <span className="text-xs text-slate-500">{usuariosInternos.length}</span>
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
                  columns={usuariosInternosColumns}
                  dataSource={usuariosInternos}
                  loading={loadingUsuarios}
                  size="small"
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  scroll={{ x: 960 }}
                  tableLayout="fixed"
                  rowClassName={(record) => (record.activo ? "" : "opacity-70")}
                  locale={{
                    emptyText: loadingUsuarios ? "Cargando usuarios..." : "No hay usuarios internos para mostrar",
                  }}
                />
              </div>
            </Card>

            <Card
              className="min-w-0 border border-slate-200 bg-white"
              title={
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>Usuarios cliente</span>
                  <span className="text-xs text-slate-500">{usuariosCliente.length}</span>
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
                  columns={usuariosClienteColumns}
                  dataSource={usuariosCliente}
                  loading={loadingUsuarios}
                  size="small"
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  scroll={{ x: 1060 }}
                  tableLayout="fixed"
                  rowClassName={(record) => (record.activo ? "" : "opacity-70")}
                  locale={{
                    emptyText: loadingUsuarios ? "Cargando usuarios..." : "No hay usuarios cliente para mostrar",
                  }}
                />
              </div>
            </Card>
          </div>
        ) : (
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
        )}
      </div>

      <Modal
        title={
          createClienteMode
            ? "Crear usuario cliente"
            : isFiremat
              ? "Crear usuario Firemat"
              : "Crear usuario app"
        }
        open={createOpen && canEditModulo}
        onCancel={() => {
          setCreateOpen(false);
          setCreateClienteMode(false);
          setObrasCliente([]);
          form.resetFields();
        }}
        onOk={canEditModulo ? crearUsuario : undefined}
        confirmLoading={creating}
        okText={createClienteMode ? labelCrearCliente ?? labelCrear : labelCrear}
        cancelText="Cancelar"
        okButtonProps={{ style: canEditModulo ? undefined : { display: "none" } }}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={!canEditModulo}
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
              <ObrasClienteSelector
                form={form}
                obras={obrasCliente}
                loading={loadingObrasCliente}
                clienteBeckId={createClienteBeckId}
                disabled={!canEditModulo}
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
        open={Boolean(editingUsuario) && canEditModulo}
        onCancel={() => {
          if (editing) return;
          setEditingUsuario(null);
          editForm.resetFields();
          setEditObrasCliente([]);
          setEditPassword("");
          setEditConfirmPassword("");
          setEditPasswordError(null);
        }}
        onOk={canEditModulo ? () => void guardarEdicionUsuario() : undefined}
        confirmLoading={editing}
        okText="Guardar cambios"
        cancelText="Cancelar"
        okButtonProps={{ style: canEditModulo ? undefined : { display: "none" } }}
      >
        <Form form={editForm} layout="vertical" disabled={!canEditModulo}>
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
              <ObrasClienteSelector
                form={editForm}
                obras={editObrasCliente}
                loading={loadingEditObrasCliente}
                clienteBeckId={editClienteBeckId}
                disabled={!canEditModulo}
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
      <Modal
        title={
          <div>
            <div className="text-sm font-semibold">Permisos de usuario</div>
            {permisosUsuario && (
              <div className="mt-0.5 text-xs font-normal text-slate-500">
                {permisosUsuario.nombre} — {permisosUsuario.email} —{" "}
                <Tag color={getTagColor(permisosUsuario.rol)}>{getRoleLabel(permisosUsuario.rol)}</Tag>
              </div>
            )}
          </div>
        }
        open={Boolean(permisosUsuario)}
        onCancel={() => { if (!savingPermisos) setPermisosUsuario(null); }}
        onOk={() => void guardarPermisos()}
        confirmLoading={savingPermisos}
        okText="Guardar permisos"
        cancelText="Cancelar"
        width={700}
      >
        {loadingPermisos ? (
          <div className="space-y-3 py-6" aria-hidden="true">
            <div className="h-4 w-2/3 animate-pulse rounded bg-black/5" />
            <div className="h-4 w-full animate-pulse rounded bg-black/5" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-black/5" />
            <div className="h-4 w-full animate-pulse rounded bg-black/5" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-black/5" />
          </div>
        ) : (
          <div className="mt-2">
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Estos permisos son <strong>excepciones individuales</strong> sobre el rol. La columna{" "}
              <strong>Usuario</strong> sobreescribe los permisos del rol cuando se guarda.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="py-2 text-left font-medium">Módulo</th>
                    <th className="py-2 text-center font-medium" colSpan={2}>Rol</th>
                    <th className="py-2 text-center font-medium" colSpan={2}>Usuario</th>
                    <th className="py-2 text-center font-medium" colSpan={2}>Efectivo</th>
                  </tr>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-400">
                    <th />
                    <th className="pb-1.5 text-center">Ver</th>
                    <th className="pb-1.5 text-center">Editar</th>
                    <th className="pb-1.5 text-center">Ver</th>
                    <th className="pb-1.5 text-center">Editar</th>
                    <th className="pb-1.5 text-center">Ver</th>
                    <th className="pb-1.5 text-center">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {modulosPermisosVisibles.map(({ key, label }) => {
                    const pRol = getPermisoRol(key);
                    const pUsuario = getPermisoModulo(key);
                    const pEfectivo = getPermisoEfectivo(key);
                    return (
                      <tr key={key} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 text-slate-700">{label}</td>
                        {/* Rol - solo lectura */}
                        <td className="py-2 text-center">
                          <Switch size="small" checked={pRol.puedeVer} disabled />
                        </td>
                        <td className="py-2 text-center">
                          <Switch size="small" checked={pRol.puedeEditar} disabled />
                        </td>
                        {/* Usuario - editable */}
                        <td className="py-2 text-center">
                          <Switch
                            size="small"
                            checked={pUsuario.puedeVer}
                            onChange={(val) => setPermisoModulo(key, "puedeVer", val)}
                          />
                        </td>
                        <td className="py-2 text-center">
                          <Switch
                            size="small"
                            checked={pUsuario.puedeEditar}
                            disabled={!pUsuario.puedeVer}
                            onChange={(val) => setPermisoModulo(key, "puedeEditar", val)}
                          />
                        </td>
                        {/* Efectivo - solo lectura */}
                        <td className="py-2 text-center">
                          <Switch size="small" checked={pEfectivo.puedeVer} disabled />
                        </td>
                        <td className="py-2 text-center">
                          <Switch size="small" checked={pEfectivo.puedeEditar} disabled />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default UsuariosParametrosUI;
