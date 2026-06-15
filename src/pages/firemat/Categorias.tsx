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

const { Title, Text } = Typography;

type CategoriaFormValues = {
  nombre: string;
};

type CategoriaRow = CategoriaFiremat & {
  productosCount?: number;
};

const Categorias = () => {
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
      console.error("Error al cargar categorías Firemat:", error);
      message.error("No se pudieron cargar las categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const categoriasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return categorias;

    return categorias.filter((categoria) =>
      categoria.nombre.toLowerCase().includes(q)
    );
  }, [categorias, busqueda]);

  const abrirCrear = () => {
    setCategoriaEditando(null);
    form.resetFields();
    setModalOpen(true);
  };

  const abrirEditar = (categoria: CategoriaRow) => {
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
    try {
      const values = await form.validateFields();
      const nombre = values.nombre.trim();

      if (!nombre) {
        message.warning("El nombre de la categoría es obligatorio");
        return;
      }

      setGuardando(true);

      if (categoriaEditando) {
        await firematCategoriasAPI.editar(categoriaEditando.id, nombre);
        message.success("Categoría actualizada correctamente");
      } else {
        await firematCategoriasAPI.crear(nombre);
        message.success("Categoría creada correctamente");
      }

      cerrarModal();
      await cargarCategorias();
    } catch (error) {
      console.error("Error al guardar categoría Firemat:", error);

      const apiError = error as {
        response?: { data?: { error?: string; message?: string } };
      };

      message.error(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          "No se pudo guardar la categoría"
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCategoria = async (categoria: CategoriaRow) => {
    try {
      await firematCategoriasAPI.eliminar(categoria.id);
      message.success("Categoría eliminada correctamente");
      await cargarCategorias();
    } catch (error) {
      console.error("Error al eliminar categoría Firemat:", error);

      const apiError = error as {
        response?: { data?: { error?: string; message?: string } };
      };

      message.error(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          "No se pudo eliminar la categoría"
      );
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
      title: "Categoría",
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
    {
      title: "Acciones",
      key: "acciones",
      width: 180,
      align: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => abrirEditar(record)}
          >
            Editar
          </Button>

          <Popconfirm
            title="Eliminar categoría"
            description={
              Number(record.productosCount || 0) > 0
                ? "Esta categoría tiene productos asociados. El backend no permitirá eliminarla."
                : "¿Seguro que quieres eliminar esta categoría?"
            }
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => eliminarCategoria(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              Categorías Firemat
            </Title>
            <Text type="secondary">
              Administra manualmente las categorías utilizadas por los productos.
            </Text>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={cargarCategorias}>
              Actualizar
            </Button>

            <Button type="primary" icon={<PlusOutlined />} onClick={abrirCrear}>
              Nueva categoría
            </Button>
          </Space>
        </div>

        <div className="mb-4">
          <Input.Search
            placeholder="Buscar categoría..."
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
        title={categoriaEditando ? "Editar categoría" : "Nueva categoría"}
        open={modalOpen}
        onCancel={cerrarModal}
        onOk={() => form.submit()}
        confirmLoading={guardando}
        okText={categoriaEditando ? "Guardar cambios" : "Crear categoría"}
        okButtonProps={{ className: "firemat-action-button" }}
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={() => { void guardarCategoria(); }}>
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[
              {
                required: true,
                message: "El nombre de la categoría es obligatorio",
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