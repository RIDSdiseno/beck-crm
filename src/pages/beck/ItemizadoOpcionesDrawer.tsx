import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  itemizadoOpcionesAPI,
  type ItemizadoOpcion,
  type ItemizadoOpcionPayload,
} from "../../services/api";

type VisibleFilter = "todos" | "visible" | "oculto";

type FormValues = {
  codigoBeck?: string;
  tipo?: string;
  elementoPasante?: string;
  elementoPenetra?: string;
  materialidad?: string;
  visible: boolean;
};

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

interface Props {
  open: boolean;
  onClose: () => void;
  obraId?: string;
  obraNombre?: string;
}

const ItemizadoOpcionesDrawer: React.FC<Props> = ({ open, onClose, obraId, obraNombre }) => {
  const [opciones, setOpciones] = useState<ItemizadoOpcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCodigo, setFilterCodigo] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterPasante, setFilterPasante] = useState("");
  const [filterPenetra, setFilterPenetra] = useState("");
  const [filterMaterialidad, setFilterMaterialidad] = useState("");
  const [filterVisible, setFilterVisible] = useState<VisibleFilter>("todos");

  const [updatingVisibleId, setUpdatingVisibleId] = useState<string | null>(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingOpcion, setEditingOpcion] = useState<ItemizadoOpcion | null>(null);
  const [form] = Form.useForm<FormValues>();

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await itemizadoOpcionesAPI.listar(obraId ? { obraId } : undefined);
      const raw = response as unknown;
      const lista = Array.isArray(raw)
        ? (raw as ItemizadoOpcion[])
        : Array.isArray((raw as { data?: unknown }).data)
        ? ((raw as { data: ItemizadoOpcion[] }).data)
        : Array.isArray((raw as { items?: unknown }).items)
        ? ((raw as { items: ItemizadoOpcion[] }).items)
        : Array.isArray((raw as { opciones?: unknown }).opciones)
        ? ((raw as { opciones: ItemizadoOpcion[] }).opciones)
        : [];
      setOpciones(lista);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las opciones de itemizado"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, obraId]);

  const uniqueOptions = useMemo(() => {
    const toOpts = (vals: (string | null | undefined)[]) =>
      [...new Set(vals.filter((v): v is string => Boolean(v)))]
        .sort((a, b) => a.localeCompare(b, "es"))
        .map((v) => ({ label: v, value: v }));
    return {
      codigoBeck: toOpts(opciones.map((o) => o.codigoBeck)),
      tipo: toOpts(opciones.map((o) => o.tipo)),
      elementoPasante: toOpts(opciones.map((o) => o.elementoPasante)),
      elementoPenetra: toOpts(opciones.map((o) => o.elementoPenetra)),
      materialidad: toOpts(opciones.map((o) => o.materialidad)),
    };
  }, [opciones]);

  const filtered = useMemo(() => {
    return opciones.filter((o) => {
      if (filterCodigo && o.codigoBeck !== filterCodigo) return false;
      if (filterTipo && o.tipo !== filterTipo) return false;
      if (filterPasante && o.elementoPasante !== filterPasante) return false;
      if (filterPenetra && o.elementoPenetra !== filterPenetra) return false;
      if (filterMaterialidad && o.materialidad !== filterMaterialidad) return false;
      if (filterVisible === "visible" && !o.visible) return false;
      if (filterVisible === "oculto" && o.visible) return false;
      return true;
    });
  }, [opciones, filterCodigo, filterTipo, filterPasante, filterPenetra, filterMaterialidad, filterVisible]);

  const handleToggleVisible = async (opcion: ItemizadoOpcion, visible: boolean) => {
    if (updatingVisibleId === opcion.id) return;
    setUpdatingVisibleId(opcion.id);
    // Optimistic update para feedback inmediato
    setOpciones((prev) => prev.map((o) => (o.id === opcion.id ? { ...o, visible } : o)));
    try {
      const updated = await itemizadoOpcionesAPI.actualizarVisible(opcion.id, visible, obraId);
      setOpciones((prev) => prev.map((o) => (o.id === opcion.id ? { ...o, ...updated } : o)));
      void message.success("Visibilidad actualizada");
    } catch (err) {
      // Revertir al valor anterior si falla
      setOpciones((prev) => prev.map((o) => (o.id === opcion.id ? { ...o, visible: opcion.visible } : o)));
      void message.error(getErrorMessage(err, "No se pudo cambiar la visibilidad"));
    } finally {
      setUpdatingVisibleId(null);
    }
  };

  const handleEliminar = (opcion: ItemizadoOpcion) => {
    Modal.confirm({
      title: "Eliminar opción de itemizado",
      content: `¿Eliminar la opción "${opcion.codigoBeck || opcion.tipo || opcion.id}"? Esta acción no se puede deshacer.`,
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await itemizadoOpcionesAPI.eliminar(opcion.id);
          setOpciones((prev) => prev.filter((o) => o.id !== opcion.id));
          message.success("Opción eliminada");
        } catch (err) {
          message.error(getErrorMessage(err, "No se pudo eliminar la opción"));
        }
      },
    });
  };

  const openCrear = () => {
    setEditingOpcion(null);
    form.resetFields();
    form.setFieldsValue({ visible: true });
    setFormModalOpen(true);
  };

  const openEditar = (opcion: ItemizadoOpcion) => {
    setEditingOpcion(opcion);
    form.setFieldsValue({
      codigoBeck: opcion.codigoBeck ?? "",
      tipo: opcion.tipo ?? "",
      elementoPasante: opcion.elementoPasante ?? "",
      elementoPenetra: opcion.elementoPenetra ?? "",
      materialidad: opcion.materialidad ?? "",
      visible: opcion.visible,
    });
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: ItemizadoOpcionPayload = {
        codigoBeck: values.codigoBeck?.trim() || null,
        tipo: values.tipo?.trim() || null,
        elementoPasante: values.elementoPasante?.trim() || null,
        elementoPenetra: values.elementoPenetra?.trim() || null,
        materialidad: values.materialidad?.trim() || null,
        visible: values.visible ?? true,
      };

      if (editingOpcion) {
        await itemizadoOpcionesAPI.actualizar(editingOpcion.id, payload);
        message.success("Opción actualizada");
      } else {
        await itemizadoOpcionesAPI.crear(payload);
        message.success("Opción creada");
      }

      setFormModalOpen(false);
      form.resetFields();
      setEditingOpcion(null);
      void cargar();
    } catch (err) {
      message.error(getErrorMessage(err, "No se pudo guardar la opción"));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<ItemizadoOpcion> = [
    {
      title: "Código BECK",
      dataIndex: "codigoBeck",
      key: "codigoBeck",
      width: 130,
      render: (v: string | null) => (
        <span className="font-mono text-xs">{v || <span className="text-slate-400">—</span>}</span>
      ),
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 120,
      render: (v: string | null) => v || <span className="text-slate-400">—</span>,
    },
    {
      title: "Elemento pasante",
      dataIndex: "elementoPasante",
      key: "elementoPasante",
      render: (v: string | null) => v || <span className="text-slate-400">—</span>,
    },
    {
      title: "Elemento atravesado",
      dataIndex: "elementoPenetra",
      key: "elementoPenetra",
      render: (v: string | null) => v || <span className="text-slate-400">—</span>,
    },
    {
      title: "Materialidad",
      dataIndex: "materialidad",
      key: "materialidad",
      render: (v: string | null) => v || <span className="text-slate-400">—</span>,
    },
    {
      title: "Visible",
      dataIndex: "visible",
      key: "visible",
      width: 90,
      render: (_: unknown, record: ItemizadoOpcion) => (
        <Switch
          size="small"
          checked={Boolean(record.visible)}
          checkedChildren="Sí"
          unCheckedChildren="No"
          loading={updatingVisibleId === record.id}
          disabled={updatingVisibleId !== null && updatingVisibleId !== record.id}
          onChange={(checked) => void handleToggleVisible(record, checked)}
        />
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 150,
      render: (_: unknown, record: ItemizadoOpcion) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditar(record)}
          >
            Editar
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
  ];

  const resetFilters = () => {
    setFilterCodigo("");
    setFilterTipo("");
    setFilterPasante("");
    setFilterPenetra("");
    setFilterMaterialidad("");
    setFilterVisible("todos");
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width="min(1100px, 97vw)"
        title={obraNombre ? `Opciones de itemizado — ${obraNombre}` : "Opciones de itemizado"}
        extra={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void cargar()}
              disabled={loading}
            >
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCrear}
            >
              Agregar opción
            </Button>
          </Space>
        }
      >
        <div className="space-y-4">
          {error && (
            <Alert
              type="error"
              showIcon
              message="No se pudieron cargar las opciones"
              description={error}
            />
          )}

          {/* Filtros */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filtros
              </Typography.Text>
              <Button size="small" type="link" onClick={resetFilters} className="!px-0 text-xs">
                Limpiar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
              <Select
                size="small"
                placeholder="Código BECK"
                value={filterCodigo || undefined}
                onChange={(v: string | undefined) => setFilterCodigo(v ?? "")}
                options={uniqueOptions.codigoBeck}
                showSearch
                allowClear
                style={{ width: "100%" }}
              />
              <Select
                size="small"
                placeholder="Tipo"
                value={filterTipo || undefined}
                onChange={(v: string | undefined) => setFilterTipo(v ?? "")}
                options={uniqueOptions.tipo}
                showSearch
                allowClear
                style={{ width: "100%" }}
              />
              <Select
                size="small"
                placeholder="Elem. pasante"
                value={filterPasante || undefined}
                onChange={(v: string | undefined) => setFilterPasante(v ?? "")}
                options={uniqueOptions.elementoPasante}
                showSearch
                allowClear
                style={{ width: "100%" }}
              />
              <Select
                size="small"
                placeholder="Elem. atravesado"
                value={filterPenetra || undefined}
                onChange={(v: string | undefined) => setFilterPenetra(v ?? "")}
                options={uniqueOptions.elementoPenetra}
                showSearch
                allowClear
                style={{ width: "100%" }}
              />
              <Select
                size="small"
                placeholder="Materialidad"
                value={filterMaterialidad || undefined}
                onChange={(v: string | undefined) => setFilterMaterialidad(v ?? "")}
                options={uniqueOptions.materialidad}
                showSearch
                allowClear
                style={{ width: "100%" }}
              />
              <Select
                size="small"
                value={filterVisible}
                onChange={(v) => setFilterVisible(v)}
                options={[
                  { label: "Todos", value: "todos" },
                  { label: "Visible", value: "visible" },
                  { label: "Oculto", value: "oculto" },
                ]}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Tabla */}
          {loading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {filtered.length} de {opciones.length} opciones
                </span>
                {filtered.some((o) => !o.visible) && (
                  <Tag color="orange">Incluye opciones ocultas</Tag>
                )}
              </div>
              <Table<ItemizadoOpcion>
                rowKey="id"
                columns={columns}
                dataSource={Array.isArray(filtered) ? filtered : []}
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: false }}
                scroll={{ x: 900 }}
                rowClassName={(record) =>
                  record.visible ? "" : "opacity-60"
                }
                locale={{ emptyText: "No hay opciones de itemizado en el catálogo" }}
              />
            </>
          )}
        </div>
      </Drawer>

      {/* Modal: Agregar / Editar */}
      <Modal
        title={editingOpcion ? "Editar opción de itemizado" : "Agregar opción de itemizado"}
        open={formModalOpen}
        onCancel={() => {
          setFormModalOpen(false);
          form.resetFields();
          setEditingOpcion(null);
        }}
        onOk={() => form.submit()}
        okText={editingOpcion ? "Guardar" : "Crear"}
        cancelText="Cancelar"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => void handleFormSubmit(values)}
          initialValues={{ visible: true }}
          className="mt-4"
        >
          <Form.Item name="codigoBeck" label="Código BECK">
            <Input placeholder="Código BECK" />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo">
            <Input placeholder="Tipo de elemento" />
          </Form.Item>
          <Form.Item name="elementoPasante" label="Elemento pasante">
            <Input placeholder="Elemento pasante" />
          </Form.Item>
          <Form.Item name="elementoPenetra" label="Elemento atravesado">
            <Input placeholder="Muro, losa o tabique" />
          </Form.Item>
          <Form.Item name="materialidad" label="Materialidad">
            <Input placeholder="Materialidad" />
          </Form.Item>
          <Form.Item name="visible" label="Visible" valuePropName="checked">
            <Switch checkedChildren="Visible" unCheckedChildren="Oculto" />
          </Form.Item>
        </Form>
      </Modal>

    </>
  );
};

export default ItemizadoOpcionesDrawer;
