import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, PlusOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import {
  itemizadosMandanteAPI,
  type ItemizadoMandante,
  type ItemizadoMandantePayload,
} from "../../services/api";

type FormValues = {
  codigoBeck?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
};

const ItemizadosMandante: React.FC = () => {
  const [form] = Form.useForm<FormValues>();
  const [items, setItems] = useState<ItemizadoMandante[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItemizadoMandante | null>(null);
  const [incluirInactivos, setIncluirInactivos] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await itemizadosMandanteAPI.listar({ incluirInactivos });
      setItems(data);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los itemizados mandante");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [incluirInactivos]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ codigoBeck: "", nombre: "", descripcion: "", activo: true });
    setModalOpen(true);
  };

  const openEdit = (item: ItemizadoMandante) => {
    setEditing(item);
    form.setFieldsValue({
      codigoBeck: item.codigoBeck ?? "",
      nombre: item.nombre,
      descripcion: item.descripcion ?? "",
      activo: item.activo,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: FormValues) => {
    const payload: ItemizadoMandantePayload = {
      codigoBeck: values.codigoBeck?.trim() || null,
      nombre: values.nombre.trim(),
      descripcion: values.descripcion?.trim() || null,
      activo: values.activo,
    };

    setSaving(true);
    try {
      if (editing) {
        await itemizadosMandanteAPI.actualizar(editing.id, payload);
        message.success("Itemizado actualizado");
      } else {
        await itemizadosMandanteAPI.crear(payload);
        message.success("Itemizado creado");
      }
      setModalOpen(false);
      await loadItems();
    } catch (error) {
      console.error(error);
      message.error("No se pudo guardar el itemizado");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (item: ItemizadoMandante) => {
    try {
      if (item.activo) {
        await itemizadosMandanteAPI.eliminar(item.id);
        message.success("Itemizado desactivado");
      } else {
        await itemizadosMandanteAPI.actualizar(item.id, { activo: true });
        message.success("Itemizado activado");
      }
      await loadItems();
    } catch (error) {
      console.error(error);
      message.error("No se pudo cambiar el estado");
    }
  };

  const columns: ColumnsType<ItemizadoMandante> = useMemo(() => [
    {
      title: "Código BECK",
      dataIndex: "codigoBeck",
      key: "codigoBeck",
      width: 150,
      render: (value: string | null) => value || "-",
    },
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (value: string) => <span className="font-medium text-slate-900">{value}</span>,
    },
    {
      title: "Descripción",
      dataIndex: "descripcion",
      key: "descripcion",
      render: (value: string | null) => value || "-",
    },
    {
      title: "Activo",
      dataIndex: "activo",
      key: "activo",
      width: 110,
      render: (activo: boolean) => (
        <Tag color={activo ? "green" : "default"}>{activo ? "Activo" : "Inactivo"}</Tag>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Editar
          </Button>
          <Popconfirm
            title={record.activo ? "Desactivar itemizado" : "Activar itemizado"}
            description={`¿Confirmas ${record.activo ? "desactivar" : "activar"} este itemizado?`}
            okText="Confirmar"
            cancelText="Cancelar"
            onConfirm={() => void toggleActivo(record)}
          >
            <Button
              size="small"
              icon={record.activo ? <StopOutlined /> : <CheckCircleOutlined />}
            >
              {record.activo ? "Desactivar" : "Activar"}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [items]);

  return (
    <div className="min-h-screen bg-beck-bg-light p-3 text-beck-ink md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Itemizados Mandante</h1>
          <p className="mt-1 text-sm text-slate-500">Catálogo simple para asociar registros y Código BECK.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Incluir inactivos</span>
          <Switch checked={incluirInactivos} onChange={setIncluirInactivos} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Crear
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 760 }}
        className="rounded-lg bg-white"
      />

      <Modal
        title={editing ? "Editar Itemizado Mandante" : "Crear Itemizado Mandante"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? "Guardar" : "Crear"}
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void handleSubmit(values)}
          initialValues={{ activo: true }}
        >
          <Form.Item name="codigoBeck" label="Código BECK">
            <Input maxLength={100} placeholder="Opcional" />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "Ingresa el nombre" }]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ItemizadosMandante;
