import React, { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Switch, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { clientesTragerAPI, type ClienteTrager } from "../../services/api";

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const e = err as { response?: { data?: { error?: string } } };
    if (e.response?.data?.error) return e.response.data.error;
  }
  return fallback;
};

const formatRut = (raw: string): string => {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${dv}`;
};

function calcularDigitoVerificador(digits: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    suma += parseInt(digits[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

const validarRut = (_: unknown, value?: string): Promise<void> => {
  if (!value || !value.trim()) return Promise.resolve();
  const limpio = value.replace(/[.\-]/g, "").toUpperCase();
  if (limpio.length < 8 || limpio.length > 9 || !/^\d+[\dK]$/.test(limpio)) {
    return Promise.reject(new Error("RUT inválido"));
  }
  const dv = limpio.slice(-1);
  const digits = limpio.slice(0, -1);
  if (calcularDigitoVerificador(digits) !== dv) {
    return Promise.reject(new Error("RUT inválido (dígito verificador no coincide)"));
  }
  return Promise.resolve();
};

const validarTelefono = (_: unknown, value?: string): Promise<void> => {
  if (!value || !value.trim()) return Promise.resolve();
  const limpio = value.replace(/\s/g, "");
  if (!/^(\+?56)?9\d{8}$/.test(limpio)) {
    return Promise.reject(
      new Error("Teléfono inválido (ej: 912345678, 56912345678 o +56912345678)")
    );
  }
  return Promise.resolve();
};

type FormValues = {
  nombre: string;
  rut?: string;
  contactoNombre: string;
  contactoTelefono?: string;
  contactoCorreo: string;
};

const TragerClientes: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteTrager[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<ClienteTrager | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await clientesTragerAPI.listar();
      setClientes(data);
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudieron cargar los clientes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalOpen(true);
  };

  const abrirEditar = (cliente: ClienteTrager) => {
    setEditando(cliente);
    form.setFieldsValue({
      nombre: cliente.nombre,
      rut: cliente.rut ?? "",
      contactoNombre: cliente.contactoNombre ?? "",
      contactoTelefono: cliente.contactoTelefono ?? "",
      contactoCorreo: cliente.contactoCorreo ?? "",
    });
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editando) {
        await clientesTragerAPI.actualizar(editando.id, values);
        void message.success("Cliente actualizado");
      } else {
        await clientesTragerAPI.crear(values);
        void message.success("Cliente creado");
      }
      setModalOpen(false);
      await cargar();
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      void message.error(getErrorMessage(err, "No se pudo guardar el cliente"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (cliente: ClienteTrager, activo: boolean) => {
    try {
      await clientesTragerAPI.toggleEstado(cliente.id, activo);
      void message.success(activo ? "Cliente activado" : "Cliente desactivado");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo cambiar el estado"));
    }
  };

  const columns: ColumnsType<ClienteTrager> = [
    {
      title: "Cliente",
      dataIndex: "nombre",
      key: "nombre",
      render: (value: string) => (
        <span className="text-sm font-medium text-beck-ink">{value}</span>
      ),
    },
    {
      title: "RUT",
      dataIndex: "rut",
      key: "rut",
      render: (value?: string | null) => value || "-",
    },
    {
      title: "Contacto",
      key: "contacto",
      render: (_, record) => (
        <div className="text-xs">
          <div>{record.contactoNombre || "-"}</div>
          <div className="text-beck-muted">{record.contactoTelefono}</div>
          <div className="text-beck-muted">{record.contactoCorreo}</div>
        </div>
      ),
    },
    {
      title: "Estado",
      dataIndex: "activo",
      key: "activo",
      render: (value: boolean, record) => (
        <Switch
          size="small"
          checked={value}
          onChange={(checked) => void handleToggleEstado(record, checked)}
        />
      ),
    },
    {
      title: "",
      key: "acciones",
      render: (_, record) => (
        <Button size="small" onClick={() => abrirEditar(record)}>
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="firemat-panel px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="firemat-badge">
              <TeamOutlined />
              <span>CRM TRAGER</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-beck-ink">
              Clientes Trager
            </h1>
            <p className="mt-1 text-sm text-beck-muted">
              Cartera comercial de clientes Trager.
            </p>
          </div>
          <Button
            className="firemat-action-button"
            icon={<PlusOutlined />}
            onClick={abrirNuevo}
          >
            Nuevo cliente
          </Button>
        </div>
      </section>

      <section className="firemat-panel overflow-hidden">
        <Table<ClienteTrager>
          rowKey="id"
          columns={columns}
          dataSource={clientes}
          loading={loading}
          pagination={false}
          locale={{ emptyText: "Sin clientes" }}
          scroll={{ x: 640 }}
        />
      </section>

      <Modal
        title={editando ? "Editar cliente Trager" : "Nuevo cliente Trager"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleGuardar()}
        okText="Guardar"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" className="mt-3">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "El nombre es obligatorio" }]}
          >
            <Input placeholder="Ej: Constructora XYZ" />
          </Form.Item>
          <Form.Item name="rut" label="RUT" rules={[{ validator: validarRut }]}>
            <Input
              placeholder="Ej: 12.345.678-9"
              onChange={(e) => {
                const formatted = formatRut(e.target.value);
                form.setFieldValue("rut", formatted);
              }}
            />
          </Form.Item>
          <Form.Item
            name="contactoNombre"
            label="Nombre de contacto"
            rules={[{ required: true, message: "El nombre de contacto es obligatorio" }]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>
          <Form.Item
            name="contactoTelefono"
            label="Teléfono de contacto"
            rules={[{ validator: validarTelefono }]}
          >
            <Input placeholder="Ej: 912345678, 56912345678 o +56912345678" />
          </Form.Item>
          <Form.Item
            name="contactoCorreo"
            label="Correo de contacto"
            rules={[
              { required: true, message: "El correo de contacto es obligatorio" },
              { type: "email", message: "Correo inválido" },
            ]}
          >
            <Input placeholder="Ej: contacto@empresa.cl" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TragerClientes;
