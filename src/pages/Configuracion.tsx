import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { ThemeMode } from "../hooks/useSystemTheme";
import type { RolUsuario, Usuario } from "../types/usuario";
import { loadUsuarios, resetUsuarios, saveUsuarios } from "../data/usuariosStorage";

type ConfiguracionProps = {
  themeMode: ThemeMode;
};

type CreateUsuarioFormValues = {
  nombre: string;
  email: string;
  rol: RolUsuario;
};

const roleOptions: Array<{ label: string; value: RolUsuario }> = [
  { label: "Terreno", value: "Terreno" },
  { label: "Visualizador", value: "Visualizador" },
];

const roleTagColor: Record<RolUsuario, string> = {
  Administrador: "volcano",
  Terreno: "green",
  Visualizador: "geekblue",
};

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const Configuracion: React.FC<ConfiguracionProps> = ({ themeMode }) => {
  // solo para compatibilidad
  void themeMode;

  const [form] = Form.useForm<CreateUsuarioFormValues>();
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => loadUsuarios());

  useEffect(() => {
    saveUsuarios(usuarios);
  }, [usuarios]);

  const updateUsuario = (id: string, patch: Partial<Usuario>) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  };

  const removeUsuario = (id: string) => {
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    message.success("Usuario eliminado");
  };

  const handleReset = () => {
    resetUsuarios();
    setUsuarios(loadUsuarios());
    message.info("Usuarios restaurados a la demo");
  };

  const handleCreate = (values: CreateUsuarioFormValues) => {
    const nombre = values.nombre.trim();
    const email = normalizeEmail(values.email);

    if (!nombre) {
      message.error("Ingresa un nombre");
      return;
    }

    if (values.rol === "Administrador") {
      message.error("Solo puedes asignar rol Terreno o Visualizador");
      return;
    }

    if (usuarios.some((u) => normalizeEmail(u.email) === email)) {
      message.error("Ya existe un usuario con ese correo");
      return;
    }

    const nuevo: Usuario = {
      id: createId(),
      nombre,
      email,
      rol: values.rol,
      activo: true,
      creadoEn: new Date().toISOString(),
    };

    setUsuarios((prev) => [nuevo, ...prev]);
    form.resetFields();
    message.success("Usuario creado");
  };

  const columns: ColumnsType<Usuario> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      width: 220,
      render: (value: unknown) => (
        <span className="text-xs font-medium text-slate-900">
          {String(value)}
        </span>
      ),
    },
    {
      title: "Correo",
      dataIndex: "email",
      key: "email",
      width: 260,
      render: (value: unknown) => (
        <span className="text-xs text-slate-700">{String(value)}</span>
      ),
    },
    {
      title: "Rol",
      dataIndex: "rol",
      key: "rol",
      width: 220,
      render: (_value: unknown, record) => (
        <div className="flex items-center gap-2">
          <Tag color={roleTagColor[record.rol]} style={{ marginInlineEnd: 0 }}>
            {record.rol}
          </Tag>
          {record.rol !== "Administrador" && (
            <Select<RolUsuario>
              size="small"
              value={record.rol}
              options={roleOptions}
              onChange={(rol) => updateUsuario(record.id, { rol })}
              style={{ width: 140 }}
            />
          )}
        </div>
      ),
    },
    {
      title: "Activo",
      dataIndex: "activo",
      key: "activo",
      width: 110,
      render: (_value: unknown, record) => (
        <Switch
          size="small"
          checked={record.activo}
          onChange={(activo) => updateUsuario(record.id, { activo })}
        />
      ),
    },
    {
      title: "Creado",
      dataIndex: "creadoEn",
      key: "creadoEn",
      width: 160,
      render: (value: unknown) => (
        <span className="text-[11px] text-slate-600">
          {dayjs(String(value)).format("DD-MM-YYYY HH:mm")}
        </span>
      ),
    },
    {
      title: "",
      key: "acciones",
      width: 70,
      align: "right",
      render: (_value: unknown, record) => (
        <Popconfirm
          title="¿Eliminar usuario?"
          okText="Eliminar"
          cancelText="Cancelar"
          onConfirm={() => removeUsuario(record.id)}
        >
          <Button danger size="small" type="text" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold tracking-wide text-slate-900">
            Usuarios y roles
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-600 max-w-2xl">
            Crea usuarios para el CRM y asigna roles (Terreno o Visualizador).
            Persistencia demo en localStorage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            className="border-slate-200"
          >
            Restaurar demo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-4">
        <Card
          className="border border-amber-200 bg-gradient-to-br from-white via-amber-50/60 to-orange-50/40"
          title={
            <div className="flex items-center gap-2 text-sm">
              <UserAddOutlined className="text-orange-600" />
              <span>Crear usuario</span>
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
          <Form<CreateUsuarioFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{ rol: "Visualizador" }}
            onFinish={handleCreate}
          >
            <Form.Item
              label={
                <span className="text-xs font-medium text-slate-700">
                  Nombre
                </span>
              }
              name="nombre"
              rules={[{ required: true, message: "Ingresa el nombre" }]}
            >
              <Input placeholder="Nombre y apellido" />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-xs font-medium text-slate-700">
                  Correo
                </span>
              }
              name="email"
              rules={[
                { required: true, message: "Ingresa el correo" },
                { type: "email", message: "Correo inválido" },
              ]}
            >
              <Input placeholder="usuario@beck.cl" />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-xs font-medium text-slate-700">Rol</span>
              }
              name="rol"
              rules={[{ required: true, message: "Selecciona un rol" }]}
            >
              <Select<RolUsuario> options={roleOptions} />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              className="bg-beck-primary hover:bg-beck-primary-dark border-none"
              block
            >
              Crear usuario
            </Button>
          </Form>
        </Card>

        <Card
          className="border border-slate-200 bg-white"
          title={
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Usuarios creados</span>
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
          <Table<Usuario>
            rowKey="id"
            columns={columns}
            dataSource={usuarios}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
        </Card>
      </div>
    </div>
  );
};

export default Configuracion;
