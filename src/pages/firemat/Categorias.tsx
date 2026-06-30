import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  firematCategoriasAPI,
  type CategoriaFiremat,
} from "../../services/api";
import { usePermisos } from "../../hooks/usePermisos";

const { Title, Text } = Typography;
const EDIT_CATEGORIAS_FIREMAT_PERMISSION_MESSAGE =
  "No tienes permiso para editar categorías Firemat.";

type CategoriaFormValues = {
  nombre: string;
};

type CategoriaRow = CategoriaFiremat & {
  productosCount?: number;
};

const getCategoriasErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = error as {
    response?: { status?: number; data?: { error?: string; message?: string } };
    message?: string;
  } | null;

  if (apiError?.response?.status === 403) {
    return EDIT_CATEGORIAS_FIREMAT_PERMISSION_MESSAGE;
  }

  return (
    apiError?.response?.data?.error ||
    apiError?.response?.data?.message ||
    apiError?.message ||
    fallback
  );
};

const Categorias = () => {
  const { canEdit } = usePermisos();
  const canEditCategorias = canEdit("firemat_categorias");

  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriaEditando, setCategoriaEditando] =
    useState<CategoriaRow | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const [form] = Form.useForm<CategoriaFormValues>();

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const data = await firematCategoriasAPI.listar();
      setCategorias(data as CategoriaRow[]);
    } catch (error) {
      console.error("Error al cargar categorias Firemat:", error);
      message.error("No se pudieron cargar las categorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarCategorias();
  }, []);

  const categoriasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return categorias;

    return categorias.filter((categoria) =>
      categoria.nombre.toLowerCase().includes(q)
    );
  }, [categorias, busqueda]);

  const abrirCrear = () => {
    if (!canEditCategorias) {
      message.error(EDIT_CATEGORIAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    setCategoriaEditando(null);
    form.resetFields();
    setModalOpen(true);
  };

  const abrirEditar = (categoria: CategoriaRow) => {
    if (!canEditCategorias) {
      message.error(EDIT_CATEGORIAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    setCategoriaEditando(categoria);
    form.setFieldsValue({
      nombre: categoria.nombre,
    });
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setCategoriaEditando(null);
    form.resetFields();
  };

  const guardarCategoria = async () => {
    if (!canEditCategorias) {
      message.error(EDIT_CATEGORIAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    try {
      const values = await form.validateFields();
      const nombre = values.nombre.trim();

      if (!nombre) {
        message.warning("El nombre de la categoria es obligatorio");
        return;
      }

      setGuardando(true);

      if (categoriaEditando) {
        await firematCategoriasAPI.editar(categoriaEditando.id, nombre);
        message.success("Categoria actualizada correctamente");
      } else {
        await firematCategoriasAPI.crear(nombre);
        message.success("Categoria creada correctamente");
      }

      cerrarModal();
      await cargarCategorias();
    } catch (error) {
      console.error("Error al guardar categoria Firemat:", error);
      message.error(getCategoriasErrorMessage(error, "No se pudo guardar la categoria"));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCategoria = async (categoria: CategoriaRow) => {
    if (!canEditCategorias) {
      message.error(EDIT_CATEGORIAS_FIREMAT_PERMISSION_MESSAGE);
      return;
    }
    try {
      await firematCategoriasAPI.eliminar(categoria.id);
      message.success("Categoria eliminada correctamente");
      await cargarCategorias();
    } catch (error) {
      console.error("Error al eliminar categoria Firemat:", error);
      message.error(getCategoriasErrorMessage(error, "No se pudo eliminar la categoria"));
    }
  };

  const columns: ColumnsType<CategoriaRow> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
    },
    {
      title: "Categoria",
      dataIndex: "nombre",
      key: "nombre",
      render: (nombre: string) => <Text strong>{nombre}</Text>,
    },
    {
      title: "Productos asociados",
      dataIndex: "productosCount",
      key: "productosCount",
      width: 180,
      render: (value?: number) => (
        <Tag color={Number(value || 0) > 0 ? "blue" : "default"}>
          {Number(value || 0)}
        </Tag>
      ),
    },
    ...(canEditCategorias ? [{
      title: "Acciones",
      key: "acciones",
      width: 180,
      align: "right" as const,
      render: (_: unknown, record: CategoriaRow) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => abrirEditar(record)}
          >
            Editar
          </Button>

          <Popconfirm
            title="Eliminar categoria"
            description={
              Number(record.productosCount || 0) > 0
                ? "Esta categoria tiene productos asociados. El backend no permitira eliminarla."
                : "Seguro que quieres eliminar esta categoria?"
            }
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => void eliminarCategoria(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div className="p-6">
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              Categorias Firemat
            </Title>
            <Text type="secondary">
              Administra manualmente las categorias utilizadas por los productos.
            </Text>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void cargarCategorias()}>
              Actualizar
            </Button>

            {canEditCategorias && (
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirCrear}>
                Nueva categoria
              </Button>
            )}
          </Space>
        </div>

        <div className="mb-4">
          <Input.Search
            placeholder="Buscar categoria..."
            allowClear
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={categoriasFiltradas}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
          }}
        />
      </Card>

      <Modal
        title={categoriaEditando ? "Editar categoria" : "Nueva categoria"}
        open={modalOpen}
        onCancel={cerrarModal}
        onOk={canEditCategorias ? () => form.submit() : undefined}
        confirmLoading={guardando}
        okText={categoriaEditando ? "Guardar cambios" : "Crear categoria"}
        okButtonProps={{
          className: "firemat-action-button",
          style: canEditCategorias ? undefined : { display: "none" },
        }}
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          disabled={!canEditCategorias}
          onFinish={() => { void guardarCategoria(); }}
        >
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[
              {
                required: true,
                message: "El nombre de la categoria es obligatorio",
              },
              {
                min: 2,
                message: "El nombre debe tener al menos 2 caracteres",
              },
            ]}
          >
            <Input placeholder="Ej: Sellos cortafuego" maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Categorias;
