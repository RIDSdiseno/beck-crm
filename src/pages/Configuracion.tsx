import React, { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import { Button, Card, Select, Switch, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, UserAddOutlined } from "@ant-design/icons";
import { useAuth } from "../context/useAuth";
import type { ThemeMode } from "../hooks/useSystemTheme";
import {
  usuariosAPI,
  type UsuarioApi,
  type UsuarioApiRol,
} from "../services/api";

type ConfiguracionProps = {
  themeMode: ThemeMode;
};

const roleOptions: Array<{ label: string; value: UsuarioApiRol }> = [
  { label: "Administrador", value: "administrador" },
  { label: "Vendedor", value: "vendedor" },
  { label: "Terreno", value: "terreno" },
  { label: "Ingenieria", value: "ingenieria" },
  { label: "Visualizador", value: "visualizador" },
];

const roleLabels: Record<UsuarioApiRol, string> = {
  administrador: "Administrador",
  vendedor: "Vendedor",
  terreno: "Terreno",
  ingenieria: "Ingenieria",
  visualizador: "Visualizador",
};

const roleTagColor: Record<UsuarioApiRol, string> = {
  administrador: "volcano",
  vendedor: "purple",
  terreno: "green",
  ingenieria: "gold",
  visualizador: "geekblue",
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string" && data.trim()) {
      return data;
    }

    if (data && typeof data === "object") {
      const apiError = data as { error?: unknown; message?: unknown };

      if (typeof apiError.error === "string" && apiError.error.trim()) {
        return apiError.error;
      }

      if (typeof apiError.message === "string" && apiError.message.trim()) {
        return apiError.message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const Configuracion: React.FC<ConfiguracionProps> = ({ themeMode }) => {
  void themeMode;

  const { user: currentUser, refreshSession } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);

      try {
        const response = await usuariosAPI.listar();

        if (!isMounted) {
          return;
        }

        setUsuarios(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        message.error(getErrorMessage(error, "No se pudieron cargar los usuarios"));
      } finally {
        if (isMounted) {
          setLoadingUsuarios(false);
        }
      }
    };

    void fetchUsuarios();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const setSavingState = (id: string, saving: boolean) => {
    setSavingById((prev) => {
      const next = { ...prev };

      if (saving) {
        next[id] = true;
      } else {
        delete next[id];
      }

      return next;
    });
  };

  const isSaving = (id: string) => Boolean(savingById[id]);

  const refreshUsuarios = () => {
    setReloadKey((prev) => prev + 1);
  };

  const syncCurrentSessionIfNeeded = async (updatedUsuario: UsuarioApi) => {
    if (!currentUser || currentUser.id !== updatedUsuario.id) {
      return;
    }

    await refreshSession();
  };

  const updateUsuario = async (
    id: string,
    patch: Partial<Pick<UsuarioApi, "rol" | "activo">>,
    successMessage: string
  ) => {
    setSavingState(id, true);

    try {
      const updatedUsuario = await usuariosAPI.actualizar(id, patch);

      setUsuarios((prev) =>
        prev.map((usuario) =>
          usuario.id === updatedUsuario.id ? updatedUsuario : usuario
        )
      );

      await syncCurrentSessionIfNeeded(updatedUsuario);
      message.success(successMessage);
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo actualizar el usuario"));
    } finally {
      setSavingState(id, false);
    }
  };

  const activos = usuarios.filter((usuario) => usuario.activo).length;
  const inactivos = usuarios.length - activos;

  const columns: ColumnsType<UsuarioApi> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      width: 220,
      render: (value: string) => (
        <span className="text-xs font-medium text-slate-900">{value}</span>
      ),
    },
    {
      title: "Correo",
      dataIndex: "email",
      key: "email",
      width: 320,
      render: (_value: string, record) => (
        <div className="leading-tight">
          <span className="block text-xs text-slate-700">{record.email}</span>
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
      width: 240,
      render: (_value: UsuarioApiRol, record) => (
        <div className="flex items-center gap-2">
          <Tag color={roleTagColor[record.rol]} style={{ marginInlineEnd: 0 }}>
            {roleLabels[record.rol]}
          </Tag>
          <Select<UsuarioApiRol>
            size="small"
            value={record.rol}
            options={roleOptions}
            disabled={isSaving(record.id)}
            onChange={(rol) => {
              if (rol === record.rol) {
                return;
              }

              void updateUsuario(record.id, { rol }, "Rol actualizado");
            }}
            style={{ width: 150 }}
          />
        </div>
      ),
    },
    {
      title: "Activo",
      dataIndex: "activo",
      key: "activo",
      width: 110,
      render: (_value: boolean, record) => (
        <Switch
          size="small"
          checked={record.activo}
          loading={isSaving(record.id)}
          onChange={(activo) => {
            if (activo === record.activo) {
              return;
            }

            void updateUsuario(
              record.id,
              { activo },
              activo ? "Usuario activado" : "Usuario desactivado"
            );
          }}
        />
      ),
    },
    {
      title: "Creado",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) => (
        <span className="text-[11px] text-slate-600">
          {dayjs(value).format("DD-MM-YYYY HH:mm")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-wide text-slate-900 sm:text-xl">
            Usuarios y roles
          </h1>
          <p className="max-w-2xl text-[11px] text-slate-600 sm:text-xs">
            Gestiona usuarios reales del CRM. Los cambios se guardan directo en el
            backend usando la sesion actual.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px,1fr]">
        <Card
          className="border border-amber-200 bg-gradient-to-br from-white via-amber-50/60 to-orange-50/40"
          title={
            <div className="flex items-center gap-2 text-sm">
              <UserAddOutlined className="text-orange-600" />
              <span>Gestion de usuarios</span>
            </div>
          }
          styles={{
            header: {
              backgroundColor: "#fff7ed",
              color: "#020617",
              borderBottom: "1px solid #fed7aa",
              fontSize: 13,
            },
            body: { padding: 14 },
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-200 bg-white/80 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Activos
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{activos}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Inactivos
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {inactivos}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-[11px] leading-5 text-slate-600">
              Aqui puedes modificar roles y gestionar el acceso de los integrantes
              del equipo, asi como activar o desactivar perfiles de la plataforma.
            </div>
          </div>
        </Card>

        <Card
          className="border border-slate-200 bg-white"
          title={
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Usuarios</span>
              <span className="text-xs text-slate-500">{usuarios.length}</span>
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
          <Table<UsuarioApi>
            rowKey="id"
            columns={columns}
            dataSource={usuarios}
            loading={loadingUsuarios}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 980 }}
            rowClassName={(record) => (record.activo ? "" : "opacity-70")}
            locale={{
              emptyText: loadingUsuarios
                ? "Cargando usuarios..."
                : "No hay usuarios para mostrar",
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default Configuracion;
