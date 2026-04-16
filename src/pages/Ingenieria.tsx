// src/pages/Ingenieria.tsx
import React, { useState } from "react";
import { Card, Table, Tag, Button, Modal, Form, Input, Select, message } from "antd";
import { EyeOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import type { ThemeMode } from "../hooks/useSystemTheme";

type IngenieriaProps = {
  themeMode: ThemeMode;
};

// Tipo para los registros pendientes (viene de terreno)
interface RegistroPendiente {
  id: string;
  obra_nombre: string;
  fecha: string;
  dia_semana: string;
  descripcion_material: string;
  modulo: string;
  piso: string;
  eje_numerico: number;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  nombre_sellador: string;
  holgura: number;
  accesibilidad: number;
  observaciones?: string;
  fotos_urls: string[];
  procesado: boolean;
}

// Mock data de registros pendientes
const mockRegistrosPendientes: RegistroPendiente[] = [
  {
    id: "reg001",
    obra_nombre: "Edificio Central Tower",
    fecha: "2025-01-12",
    dia_semana: "Domingo",
    descripcion_material: "Ducto eléctrico principal",
    modulo: "Módulo A",
    piso: "Piso 3",
    eje_numerico: 5,
    eje_alfabetico: "C",
    numero_sello: "SEL-2025-0045",
    cantidad_sellos: 8,
    nombre_sellador: "Juan Pérez",
    holgura: 1.2,
    accesibilidad: 2,
    observaciones: "Pasada por placa de hormigón",
    fotos_urls: ["/placeholder-foto1.jpg", "/placeholder-foto2.jpg"],
    procesado: false,
  },
  {
    id: "reg002",
    obra_nombre: "Proyecto Residencial Los Álamos",
    fecha: "2025-01-11",
    dia_semana: "Sábado",
    descripcion_material: "Ducto de ventilación",
    modulo: "Módulo B",
    piso: "Piso 2",
    eje_numerico: 3,
    eje_alfabetico: "B",
    numero_sello: "SEL-2025-0046",
    cantidad_sellos: 12,
    nombre_sellador: "María González",
    holgura: 1.4,
    accesibilidad: 1,
    observaciones: "",
    fotos_urls: ["/placeholder-foto3.jpg"],
    procesado: false,
  },
];

const Ingenieria: React.FC<IngenieriaProps> = ({ themeMode }) => {
  void themeMode; // Siempre claro

  const [registros, setRegistros] = useState<RegistroPendiente[]>(mockRegistrosPendientes);
  const [modalVisible, setModalVisible] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroPendiente | null>(null);
  const [form] = Form.useForm();

  // Calcular total de sellos automáticamente
  const calcularTotalSellos = () => {
    const cantidad = registroSeleccionado?.cantidad_sellos || 0;
    const holgura = registroSeleccionado?.holgura || 1;
    const accesibilidad = registroSeleccionado?.accesibilidad || 1;

    return (cantidad * holgura * accesibilidad).toFixed(2);
  };

  const abrirModalProcesamiento = (registro: RegistroPendiente) => {
    setRegistroSeleccionado(registro);
    setModalVisible(true);
    form.resetFields();
  };

  const handleProcesar = async (values: any) => {
    try {
      // Aquí se haría el POST al backend
      console.log("Procesando registro:", {
        registro_id: registroSeleccionado?.id,
        codigo: values.codigo,
        itemizado_id: values.itemizado_id,
        total_calculado: calcularTotalSellos(),
        notas: values.notas,
      });

      // Actualizar el estado local (mock)
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === registroSeleccionado?.id ? { ...r, procesado: true } : r
        )
      );

      message.success("Registro procesado correctamente");
      setModalVisible(false);
      setRegistroSeleccionado(null);
    } catch (error) {
      message.error("Error al procesar el registro");
    }
  };

  const columns = [
    {
      title: "Estado",
      key: "estado",
      width: 100,
      render: (_: unknown, record: RegistroPendiente) => (
        <Tag
          icon={record.procesado ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          color={record.procesado ? "success" : "warning"}
        >
          {record.procesado ? "Procesado" : "Pendiente"}
        </Tag>
      ),
    },
    {
      title: "Obra",
      dataIndex: "obra_nombre",
      key: "obra_nombre",
    },
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      render: (fecha: string, record: RegistroPendiente) => (
        <div>
          <div>{fecha}</div>
          <div className="text-xs text-slate-500">{record.dia_semana}</div>
        </div>
      ),
    },
    {
      title: "Material",
      dataIndex: "descripcion_material",
      key: "descripcion_material",
    },
    {
      title: "Ubicación",
      key: "ubicacion",
      render: (_: unknown, record: RegistroPendiente) => (
        <div className="text-xs">
          {record.piso} · Eje {record.eje_alfabetico}{record.eje_numerico}
        </div>
      ),
    },
    {
      title: "Cantidad",
      dataIndex: "cantidad_sellos",
      key: "cantidad_sellos",
      width: 100,
    },
    {
      title: "Holgura",
      dataIndex: "holgura",
      key: "holgura",
      width: 100,
    },
    {
      title: "Accesibilidad",
      dataIndex: "accesibilidad",
      key: "accesibilidad",
      width: 120,
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 120,
      render: (_: unknown, record: RegistroPendiente) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => abrirModalProcesamiento(record)}
          disabled={record.procesado}
        >
          Procesar
        </Button>
      ),
    },
  ];

  const registrosPendientes = registros.filter((r) => !r.procesado);
  const registrosProcesados = registros.filter((r) => r.procesado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard Ingeniería</h1>
        <p className="text-xs text-slate-600 mt-1">
          Procesa los registros de terreno completando el código e itemizado.
          El sistema calculará automáticamente el total de sellos.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-amber-200 bg-amber-50">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-700">{registrosPendientes.length}</div>
            <div className="text-xs text-slate-700 mt-1">Registros Pendientes</div>
          </div>
        </Card>
        <Card className="border border-green-200 bg-green-50">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-700">{registrosProcesados.length}</div>
            <div className="text-xs text-slate-700 mt-1">Registros Procesados Hoy</div>
          </div>
        </Card>
        <Card className="border border-blue-200 bg-blue-50">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-700">{registros.length}</div>
            <div className="text-xs text-slate-700 mt-1">Total de Registros</div>
          </div>
        </Card>
      </div>

      {/* Tabla de registros */}
      <Card title="Registros de Terreno" className="border border-slate-200">
        <Table
          columns={columns}
          dataSource={registros}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal de procesamiento */}
      <Modal
        title="Procesar Registro de Terreno"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setRegistroSeleccionado(null);
        }}
        footer={null}
        width={800}
      >
        {registroSeleccionado && (
          <div className="space-y-4">
            {/* Datos de terreno (solo lectura) */}
            <Card title="Información de Terreno" size="small" className="bg-slate-50">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold">Obra:</span> {registroSeleccionado.obra_nombre}
                </div>
                <div>
                  <span className="font-semibold">Fecha:</span> {registroSeleccionado.fecha} ({registroSeleccionado.dia_semana})
                </div>
                <div>
                  <span className="font-semibold">Material:</span> {registroSeleccionado.descripcion_material}
                </div>
                <div>
                  <span className="font-semibold">Ubicación:</span> {registroSeleccionado.piso} · Eje {registroSeleccionado.eje_alfabetico}{registroSeleccionado.eje_numerico}
                </div>
                <div>
                  <span className="font-semibold">Cantidad Sellos:</span> {registroSeleccionado.cantidad_sellos}
                </div>
                <div>
                  <span className="font-semibold">Holgura:</span> {registroSeleccionado.holgura}
                </div>
                <div>
                  <span className="font-semibold">Accesibilidad:</span> {registroSeleccionado.accesibilidad}
                </div>
                <div>
                  <span className="font-semibold">Sellador:</span> {registroSeleccionado.nombre_sellador}
                </div>
              </div>
            </Card>

            {/* Cálculo automático */}
            <Card title="Cálculo Automático" size="small" className="bg-green-50 border-green-200">
              <div className="text-center">
                <div className="text-xs text-slate-700 mb-2">
                  {registroSeleccionado.cantidad_sellos} × {registroSeleccionado.holgura} × {registroSeleccionado.accesibilidad} =
                </div>
                <div className="text-3xl font-bold text-green-700">
                  {calcularTotalSellos()}
                </div>
                <div className="text-xs text-slate-600 mt-1">Total de Sellos Ponderados</div>
              </div>
            </Card>

            {/* Formulario de procesamiento */}
            <Form form={form} layout="vertical" onFinish={handleProcesar}>
              <Form.Item
                label="Código"
                name="codigo"
                rules={[{ required: true, message: "El código es requerido" }]}
              >
                <Input placeholder="Ej: COD-2025-001" />
              </Form.Item>

              <Form.Item
                label="Itemizado"
                name="itemizado_id"
                rules={[{ required: true, message: "El itemizado es requerido" }]}
              >
                <Select placeholder="Selecciona un itemizado">
                  <Select.Option value="item1">SELLO-CF-01 - Sello cortafuego estándar 100mm</Select.Option>
                  <Select.Option value="item2">SELLO-CF-02 - Sello cortafuego reforzado 200mm</Select.Option>
                  <Select.Option value="item3">JUNTA-ESP-01 - Junta lineal con espuma</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="Notas (Opcional)" name="notas">
                <Input.TextArea rows={3} placeholder="Observaciones adicionales de ingeniería..." />
              </Form.Item>

              <Form.Item>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setModalVisible(false)}>Cancelar</Button>
                  <Button type="primary" htmlType="submit">
                    Procesar Registro
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Ingenieria;
