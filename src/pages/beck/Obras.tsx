import React, { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/useAuth";
import { obrasAPI, usuariosAPI, type Obra, type UsuarioApi } from "../../services/api";

type EstadoForm = "activa" | "inactiva" | "pausada" | "finalizada";

type ObraFormValues = {
  nombre: string;
  codigo: string;
  descripcion: string;
  direccion: string;
  cliente: string;
  estado: EstadoForm;
  usuarioIds: string[];
};

type AsignarUsuariosFormValues = {
  usuarioIds: string[];
};

const estadoOptions: Array<{ label: string; value: EstadoForm }> = [
  { label: "Activa", value: "activa" },
  { label: "Inactiva", value: "inactiva" },
  { label: "Pausada", value: "pausada" },
  { label: "Finalizada", value: "finalizada" },
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

const getUsuariosAsignadosIds = (obra: Obra): string[] =>
  obra.usuarios?.map((usuario) => usuario.id) ?? [];

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

const Obras: React.FC = () => {
  const { user } = useAuth();
  const canManageObras = user?.rol !== "Visualizador";
  const [obras, setObras] = useState<Obra[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"crear" | "editar">("crear");
  const [obraSeleccionada, setObraSeleccionada] = useState<Obra | null>(null);
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loadingUsuariosObra, setLoadingUsuariosObra] = useState(false);
  const [form] = Form.useForm<ObraFormValues>();
  const [asignarForm] = Form.useForm<AsignarUsuariosFormValues>();

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
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const obrasData = await obrasAPI.listar();
        setObras(obrasData);

        if (canManageObras) {
          const usuariosData = await usuariosAPI.listar();
          setUsuarios(usuariosData);
        } else {
          setUsuarios([]);
        }
      } catch (error) {
        message.error(getErrorMessage(error, "Error al cargar los datos"));
      } finally {
        setLoading(false);
      }
    };
    void cargarDatos();
  }, [canManageObras]);

  const handleCrear = async (values: ObraFormValues) => {
    if (!canManageObras) return;

    setSaving(true);
    try {
      const payload: Parameters<typeof obrasAPI.crear>[0] = {
        nombre: values.nombre,
        descripcion: values.descripcion,
        estado: values.estado,
      };

      if (values.codigo?.trim()) {
        payload.codigo = values.codigo.trim();
      }

      const nuevaObra = await obrasAPI.crear(payload);
      if (values.usuarioIds?.length > 0) {
        await obrasAPI.asignarUsuarios(nuevaObra.id, values.usuarioIds);
      }
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
      const payload: Parameters<typeof obrasAPI.actualizar>[1] = {
        codigo: values.codigo?.trim() || "",
        nombre: values.nombre,
        direccion: values.direccion ?? "",
        cliente: values.cliente ?? "",
        estado: values.estado,
        activa: values.estado === "activa",
      };

      const obraActualizada = await obrasAPI.actualizar(
        obraSeleccionada.id,
        payload
      );
      const obraConUsuarios = await obrasAPI.asignarUsuarios(
        obraSeleccionada.id,
        values.usuarioIds ?? []
      );
      const obraFinal = {
        ...obraActualizada,
        usuarios: obraConUsuarios.usuarios ?? obraSeleccionada.usuarios,
      };
      setObras((prev) =>
        prev.map((obra) =>
          obra.id === obraSeleccionada.id ? obraFinal : obra
        )
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
      return;
    }

    void handleCrear(values);
  };

  const openCrear = () => {
    if (!canManageObras) return;

    setModalMode("crear");
    setObraSeleccionada(null);
    form.resetFields();
    form.setFieldsValue({ estado: "activa", usuarioIds: [] });
    setModalOpen(true);
  };

  const openEditar = async (obra: Obra) => {
    if (!canManageObras) return;

    setModalMode("editar");
    setModalOpen(true);
    setLoadingUsuariosObra(true);
    try {
      const [obraDetalle, usuariosData] = await Promise.all([
        obrasAPI.obtenerPorId(obra.id),
        usuariosAPI.listar(),
      ]);
      setUsuarios(usuariosData);
      setObraSeleccionada(obraDetalle);
      form.setFieldsValue({
        codigo: obraDetalle.codigo ?? "",
        nombre: obraDetalle.nombre,
        descripcion: obraDetalle.descripcion ?? "",
        direccion: obraDetalle.direccion ?? "",
        cliente: obraDetalle.cliente ?? "",
        estado: getObraEstado(obraDetalle),
        usuarioIds: getUsuariosAsignadosIds(obraDetalle),
      });
    } catch (error) {
      setModalOpen(false);
      message.error(getErrorMessage(error, "No se pudo cargar la obra"));
    } finally {
      setLoadingUsuariosObra(false);
    }
  };

  const openAsignar = async (obra: Obra) => {
    if (!canManageObras) return;

    setAsignarOpen(true);
    setLoadingUsuariosObra(true);
    try {
      const [obraDetalle, usuariosData] = await Promise.all([
        obrasAPI.obtenerPorId(obra.id),
        usuariosAPI.listar(),
      ]);
      setUsuarios(usuariosData);
      setObraSeleccionada(obraDetalle);
      asignarForm.setFieldsValue({
        usuarioIds: getUsuariosAsignadosIds(obraDetalle),
      });
    } catch (error) {
      setAsignarOpen(false);
      message.error(getErrorMessage(error, "No se pudo cargar la obra"));
    } finally {
      setLoadingUsuariosObra(false);
    }
  };

  const handleAsignarUsuarios = async (values: AsignarUsuariosFormValues) => {
    if (!canManageObras || !obraSeleccionada) return;

    setAssigning(true);
    try {
      const obraActualizada = await obrasAPI.asignarUsuarios(
        obraSeleccionada.id,
        values.usuarioIds ?? []
      );
      setObras((prev) =>
        prev.map((obra) =>
          obra.id === obraSeleccionada.id ? obraActualizada : obra
        )
      );
      message.success("Usuarios asignados correctamente");
      setAsignarOpen(false);
      setObraSeleccionada(null);
      asignarForm.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudieron asignar usuarios"));
    } finally {
      setAssigning(false);
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

  const columns: ColumnsType<Obra> = [
    {
      title: "Código",
      dataIndex: "codigo",
      key: "codigo",
      width: 140,
      render: (value: string) => (
        <span className="font-mono text-xs text-slate-700">{value || "-"}</span>
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
      title: "Estado",
      key: "estado",
      width: 120,
      render: (_: unknown, record: Obra) => {
        const estado = getObraEstado(record);

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
            width: 250,
            render: (_: unknown, record: Obra) => (
              <Space size={6} wrap>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEditar(record)}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  icon={<TeamOutlined />}
                  onClick={() => openAsignar(record)}
                >
                  Asignar
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

  const usuarioOptions = usuarios
    .filter((u) => u.activo)
    .map((u) => ({ label: `${u.nombre} · ${u.rol} · ${u.email}`, value: u.id }));

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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCrear}
          >
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
          scroll={{ x: 600 }}
          locale={{
            emptyText: loading ? "Cargando obras..." : "No hay obras registradas",
          }}
        />
      </Card>

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
          initialValues={{ estado: "activa", usuarioIds: [] }}
          className="mt-4"
        >
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

          <Form.Item name="cliente" label="Cliente">
            <Input placeholder="Cliente" />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Descripción de la obra" />
          </Form.Item>

          <Form.Item name="estado" label="Estado">
            <Select options={estadoOptions} />
          </Form.Item>

          {modalMode === "crear" && (
            <Form.Item name="usuarioIds" label="Usuarios">
              <Select
                mode="multiple"
                options={usuarioOptions}
                placeholder="Seleccionar usuarios"
                allowClear
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}
          {modalMode === "editar" && (
            <Form.Item
              name="usuarioIds"
              label="Usuarios asignados a la obra"
            >
              <Select
                mode="multiple"
                options={usuarioOptions}
                placeholder="Seleccionar usuarios"
                allowClear
                loading={loadingUsuariosObra}
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={
          obraSeleccionada
            ? `Asignar usuarios · ${obraSeleccionada.nombre}`
            : "Asignar usuarios"
        }
        open={asignarOpen}
        onCancel={() => {
          setAsignarOpen(false);
          setObraSeleccionada(null);
          asignarForm.resetFields();
        }}
        onOk={() => asignarForm.submit()}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={assigning}
        destroyOnClose
      >
        <Form
          form={asignarForm}
          layout="vertical"
          onFinish={handleAsignarUsuarios}
          initialValues={{ usuarioIds: [] }}
          className="mt-4"
        >
          <Form.Item name="usuarioIds" label="Usuarios">
            <Select
              mode="multiple"
              options={usuarioOptions}
              placeholder="Seleccionar usuarios"
              allowClear
              loading={loadingUsuariosObra}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Obras;
