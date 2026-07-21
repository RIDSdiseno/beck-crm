import React, { useCallback, useEffect, useState } from "react";
import { usePermisos } from "../hooks/usePermisos";
import { Button, Modal, Spin, Switch, Tag, message } from "antd";
import { CheckCircleOutlined, TeamOutlined } from "@ant-design/icons";
import {
  permisosRolAPI,
  permisosUsuarioAPI,
  type ModuloBeck,
  type PermisoModulo,
  type PermisoModuloInput,
  type PermisosRolResponse,
  type PermisosUsuarioDetalleResponse,
  type UsuarioApi,
  type UsuarioApiRol,
  type UsuarioConOverride,
} from "../services/api";
import { ROLES_BECK } from "../constants/roles";

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

const ROL_TAG_COLOR: Record<UsuarioApiRol, string> = {
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

const getFromList = (list: PermisoModulo[], modulo: ModuloBeck): PermisoModulo =>
  list.find((p) => p.modulo === modulo) ?? { modulo, puedeVer: false, puedeEditar: false };

const applyToggle = (
  prev: PermisoModulo[],
  modulo: ModuloBeck,
  field: "puedeVer" | "puedeEditar",
  value: boolean,
): PermisoModulo[] => {
  const existing = prev.find((p) => p.modulo === modulo);
  let next: PermisoModulo;
  if (field === "puedeVer" && !value) {
    next = { modulo, puedeVer: false, puedeEditar: false };
  } else if (field === "puedeEditar" && value) {
    next = { modulo, puedeVer: true, puedeEditar: true };
  } else {
    next = { ...(existing ?? { modulo, puedeVer: false, puedeEditar: false }), [field]: value };
  }
  if (existing) return prev.map((p) => (p.modulo === modulo ? next : p));
  return [...prev, next];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const GestionPermisosModal: React.FC<Props> = ({ open, onClose }) => {
  const { refreshPermisos } = usePermisos();
  const [rolesInfo, setRolesInfo] = useState<PermisosRolResponse[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRol, setSelectedRol] = useState<UsuarioApiRol | null>(null);
  const [rolPermisos, setRolPermisos] = useState<PermisoModulo[]>([]);
  const [loadingRolPermisos, setLoadingRolPermisos] = useState(false);
  const [savingRol, setSavingRol] = useState(false);
  const [usuariosRol, setUsuariosRol] = useState<UsuarioConOverride[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const [excepcionUsuario, setExcepcionUsuario] = useState<UsuarioApi | null>(null);
  const [excepcionDetalle, setExcepcionDetalle] = useState<PermisosUsuarioDetalleResponse | null>(null);
  const [excepcionPermisos, setExcepcionPermisos] = useState<PermisoModulo[]>([]);
  const [loadingExcepcion, setLoadingExcepcion] = useState(false);
  const [savingExcepcion, setSavingExcepcion] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const data = await permisosRolAPI.listarRoles();
      setRolesInfo(data);
    } catch {
      message.error("No se pudieron cargar los roles");
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchRoles();
    } else {
      setSelectedRol(null);
      setRolPermisos([]);
      setUsuariosRol([]);
    }
  }, [open, fetchRoles]);

  const selectRol = async (rol: UsuarioApiRol) => {
    setSelectedRol(rol);
    setLoadingRolPermisos(true);
    setLoadingUsuarios(true);
    try {
      const [rolData, usuarios] = await Promise.all([
        permisosRolAPI.obtenerRol(rol),
        permisosRolAPI.usuariosPorRol(rol),
      ]);
      const permisosEfectivos =
        Array.isArray(rolData.permisosEfectivos) ? rolData.permisosEfectivos
        : Array.isArray(rolData.permisos) ? rolData.permisos
        : [];
      setRolPermisos(permisosEfectivos);
      setUsuariosRol(Array.isArray(usuarios) ? usuarios : []);
    } catch {
      message.error("No se pudieron cargar los datos del rol");
      setRolPermisos([]);
      setUsuariosRol([]);
    } finally {
      setLoadingRolPermisos(false);
      setLoadingUsuarios(false);
    }
  };

  const guardarPermisosRol = async () => {
    if (!selectedRol) return;
    setSavingRol(true);
    try {
      const payload: PermisoModuloInput[] = MODULOS_BECK.map(({ key }) => {
        const p = getFromList(rolPermisos, key);
        return { modulo: key, puedeVer: p.puedeVer, puedeEditar: p.puedeEditar };
      });
      await permisosRolAPI.actualizarRol(selectedRol, payload);
      message.success("Permisos del rol guardados correctamente");
      void refreshPermisos();
      const refreshed = await permisosRolAPI.obtenerRol(selectedRol);
      const permisosRefrescados =
        Array.isArray(refreshed.permisosEfectivos) ? refreshed.permisosEfectivos
        : Array.isArray(refreshed.permisos) ? refreshed.permisos
        : [];
      setRolPermisos(permisosRefrescados);
      await fetchRoles();
    } catch {
      message.error("No se pudieron guardar los permisos del rol");
    } finally {
      setSavingRol(false);
    }
  };

  const openExcepcion = async (usuario: UsuarioApi) => {
    setExcepcionUsuario(usuario);
    setExcepcionDetalle(null);
    setExcepcionPermisos([]);
    setLoadingExcepcion(true);
    try {
      const detalle = await permisosUsuarioAPI.obtenerDetallado(usuario.id);
      setExcepcionDetalle(detalle);
      const efectivos = detalle.permisosEfectivos ?? detalle.permisos ?? [];
      setExcepcionPermisos(Array.isArray(efectivos) ? [...efectivos] : []);
    } catch {
      message.error("No se pudieron cargar los permisos del usuario");
    } finally {
      setLoadingExcepcion(false);
    }
  };

  const guardarExcepcion = async () => {
    if (!excepcionUsuario) return;
    setSavingExcepcion(true);
    try {
      const payload: PermisoModuloInput[] = MODULOS_BECK.map(({ key }) => {
        const p = getFromList(excepcionPermisos, key);
        return { modulo: key, puedeVer: p.puedeVer, puedeEditar: p.puedeEditar };
      });
      console.log("payload excepción usuario", payload);
      await permisosUsuarioAPI.actualizar(excepcionUsuario.id, payload);
      message.success("Excepción guardada correctamente");
      void refreshPermisos();
      setExcepcionUsuario(null);
      if (selectedRol) {
        const usuarios = await permisosRolAPI.usuariosPorRol(selectedRol);
        setUsuariosRol(Array.isArray(usuarios) ? usuarios : []);
      }
    } catch {
      message.error("No se pudieron guardar los permisos del usuario");
    } finally {
      setSavingExcepcion(false);
    }
  };

  const getRolInfo = (rol: UsuarioApiRol) => rolesInfo.find((r) => r.rol === rol);
  const selectedRolLabel = selectedRol ? ROLES_BECK.find((r) => r.value === selectedRol)?.label ?? selectedRol : "";
  const selectedRolInfo = selectedRol ? getRolInfo(selectedRol) : null;

  return (
    <>
      <Modal
        title="Gestión de permisos"
        open={open}
        onCancel={onClose}
        footer={null}
        width={1080}
        styles={{ body: { padding: 0, overflow: "hidden" } }}
        style={{ top: 24 }}
      >
        <div className="flex" style={{ height: 580 }}>
          {/* ── Columna izquierda: lista de roles ── */}
          <div
            className="flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50"
            style={{ width: 210 }}
          >
            {loadingRoles ? (
              <div className="flex h-full items-center justify-center">
                <Spin size="small" />
              </div>
            ) : (
              <div className="p-2">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Roles
                </p>
                {ROLES_BECK.map((role) => {
                  const info = getRolInfo(role.value);
                  const isSelected = selectedRol === role.value;
                  return (
                    <button
                      key={role.value}
                      onClick={() => void selectRol(role.value)}
                      className={`mb-0.5 w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "border border-orange-200 bg-orange-50"
                          : "border border-transparent hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-medium ${
                            isSelected ? "text-orange-700" : "text-slate-700"
                          }`}
                        >
                          {role.label}
                        </span>
                        {info?.tienePermisosConfigurados && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                        )}
                      </div>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {info?.totalUsuarios ?? "—"} usuario
                        {(info?.totalUsuarios ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Panel derecho ── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {!selectedRol ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <TeamOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
                <span className="text-sm">Selecciona un rol para configurar permisos</span>
              </div>
            ) : (
              <>
                {/* Header del rol */}
                <div className="flex-shrink-0 border-b border-slate-200 bg-white px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Tag color={ROL_TAG_COLOR[selectedRol]}>{selectedRolLabel}</Tag>
                    <span className="text-xs text-slate-500">
                      {selectedRolInfo?.totalUsuarios ?? usuariosRol.length} usuario
                      {(selectedRolInfo?.totalUsuarios ?? usuariosRol.length) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Sección A: permisos del rol */}
                  <div
                    className="flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white"
                    style={{ width: 290 }}
                  >
                    <div className="px-4 py-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-700">Permisos del rol</p>
                        <Button
                          size="small"
                          type="primary"
                          loading={savingRol}
                          disabled={loadingRolPermisos}
                          onClick={() => void guardarPermisosRol()}
                          className="bg-orange-500"
                          style={{ backgroundColor: "#f97316", borderColor: "#f97316" }}
                        >
                          Guardar
                        </Button>
                      </div>
                      {loadingRolPermisos ? (
                        <div className="flex justify-center py-6">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                              <th className="pb-1.5 text-left font-medium">Módulo</th>
                              <th className="pb-1.5 text-center font-medium">Ver</th>
                              <th className="pb-1.5 text-center font-medium">Edit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MODULOS_BECK.map(({ key, label }) => {
                              const p = getFromList(rolPermisos, key);
                              return (
                                <tr key={key} className="border-b border-slate-100 last:border-0">
                                  <td className="py-1.5 text-slate-700">{label}</td>
                                  <td className="py-1.5 text-center">
                                    <Switch
                                      size="small"
                                      checked={p.puedeVer}
                                      onChange={(val) =>
                                        setRolPermisos((prev) => applyToggle(prev, key, "puedeVer", val))
                                      }
                                    />
                                  </td>
                                  <td className="py-1.5 text-center">
                                    <Switch
                                      size="small"
                                      checked={p.puedeEditar}
                                      disabled={!p.puedeVer}
                                      onChange={(val) =>
                                        setRolPermisos((prev) => applyToggle(prev, key, "puedeEditar", val))
                                      }
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Sección B: usuarios de este rol */}
                  <div className="flex-1 overflow-y-auto bg-white">
                    <div className="px-4 py-3">
                      <p className="mb-3 text-xs font-semibold text-slate-700">
                        Usuarios de este rol
                      </p>
                      {loadingUsuarios ? (
                        <div className="flex justify-center py-6">
                          <Spin size="small" />
                        </div>
                      ) : usuariosRol.length === 0 ? (
                        <p className="text-xs text-slate-400">No hay usuarios con este rol</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                              <th className="pb-1.5 text-left font-medium">Nombre</th>
                              <th className="pb-1.5 text-left font-medium">Correo</th>
                              <th className="pb-1.5 text-center font-medium">Activo</th>
                              <th className="pb-1.5 text-center font-medium">Override</th>
                              <th className="pb-1.5 font-medium" />
                            </tr>
                          </thead>
                          <tbody>
                            {usuariosRol.map((usuario) => (
                              <tr key={usuario.id} className="border-b border-slate-100 last:border-0">
                                <td className="max-w-[130px] truncate py-2 font-medium text-slate-800">
                                  {usuario.nombre}
                                </td>
                                <td className="max-w-[180px] truncate py-2 text-slate-500">
                                  {usuario.email}
                                </td>
                                <td className="py-2 text-center">
                                  <Tag
                                    color={usuario.activo ? "green" : "default"}
                                    style={{ marginInlineEnd: 0, fontSize: 10 }}
                                  >
                                    {usuario.activo ? "Sí" : "No"}
                                  </Tag>
                                </td>
                                <td className="py-2 text-center">
                                  {usuario.tienePermisosPersonalizados ? (
                                    <CheckCircleOutlined style={{ color: "#f97316", fontSize: 14 }} />
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="py-2 text-right">
                                  <Button size="small" onClick={() => void openExcepcion(usuario)}>
                                    Editar excepción
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Modal de excepción por usuario ── */}
      <Modal
        title={
          excepcionUsuario ? (
            <div>
              <div className="text-sm font-semibold">Excepción de permisos</div>
              <div className="mt-0.5 text-xs font-normal text-slate-500">
                {excepcionUsuario.nombre}
                {" — "}
                {excepcionUsuario.email}
                {" — "}
                <Tag color={ROL_TAG_COLOR[excepcionUsuario.rol]} style={{ marginInlineEnd: 0 }}>
                  {ROLES_BECK.find((r) => r.value === excepcionUsuario.rol)?.label ?? excepcionUsuario.rol}
                </Tag>
              </div>
            </div>
          ) : null
        }
        open={Boolean(excepcionUsuario)}
        onCancel={() => { if (!savingExcepcion) setExcepcionUsuario(null); }}
        onOk={() => void guardarExcepcion()}
        confirmLoading={savingExcepcion}
        okText="Guardar excepción"
        cancelText="Cancelar"
        width={700}
      >
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Los permisos personalizados sobrescriben los permisos del rol. Las columnas <strong>Rol</strong> y{" "}
          <strong>Efectivo</strong> son solo lectura; edita la columna <strong>Usuario</strong>.
        </div>

        {loadingExcepcion ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 text-left font-medium">Módulo</th>
                  <th className="py-2 text-center font-medium" colSpan={2}>
                    Rol
                  </th>
                  <th className="py-2 text-center font-medium" colSpan={2}>
                    Usuario
                  </th>
                  <th className="py-2 text-center font-medium" colSpan={2}>
                    Efectivo
                  </th>
                </tr>
                <tr className="border-b border-slate-200 text-[10px] text-slate-400">
                  <th />
                  <th className="pb-1.5 text-center">Ver</th>
                  <th className="pb-1.5 text-center">Edit</th>
                  <th className="pb-1.5 text-center">Ver</th>
                  <th className="pb-1.5 text-center">Edit</th>
                  <th className="pb-1.5 text-center">Ver</th>
                  <th className="pb-1.5 text-center">Edit</th>
                </tr>
              </thead>
              <tbody>
                {MODULOS_BECK.map(({ key, label }) => {
                  const pRol = getFromList(excepcionDetalle?.permisosRol ?? [], key);
                  const pUsuario = getFromList(excepcionPermisos, key);
                  const pEfectivo = getFromList(excepcionDetalle?.permisosEfectivos ?? [], key);
                  return (
                    <tr key={key} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 text-slate-700">{label}</td>
                      {/* Rol - read only */}
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
                          onChange={(val) =>
                            setExcepcionPermisos((prev) => applyToggle(prev, key, "puedeVer", val))
                          }
                        />
                      </td>
                      <td className="py-2 text-center">
                        <Switch
                          size="small"
                          checked={pUsuario.puedeEditar}
                          disabled={!pUsuario.puedeVer}
                          onChange={(val) =>
                            setExcepcionPermisos((prev) => applyToggle(prev, key, "puedeEditar", val))
                          }
                        />
                      </td>
                      {/* Efectivo - read only */}
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
        )}
      </Modal>
    </>
  );
};

export default GestionPermisosModal;
