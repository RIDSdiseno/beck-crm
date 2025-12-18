// src/components/NuevoRegistroDrawer.tsx
import React, { useState } from "react";
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Upload,
  message,
  Modal,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  CameraOutlined,
  PlusOutlined,
  FireOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useAuth } from "../context/useAuth";
import type { Obra } from "../types/obra";
import { loadObras, saveObras } from "../data/obrasStorage";


export type NuevoRegistroValues = {
  obraId: string;
  itemizadoBeck: string;
  itemizadoSacyr?: string;
  fechaEjecucion: Dayjs;
  piso: string;
  ejeAlfabetico?: string;
  ejeNumerico?: string;
  nombreSellador: string;
  recinto?: string;
  numeroSello?: string;
  cantidadSellos: number;
  holguraCm: number;
  factorHolgura: 1 | 1.2 | 1.4 | 1.8;
  cieloModular: 1 | 2 | 3;
  fotoUrl?: string;
  fotoArchivo?: File;
  observaciones?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NuevoRegistroValues) => void;
};

type CreateObraValues = {
  nombre: string;
  codigo?: string;
};

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `obra_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeText = (value: string): string => value.trim().toLowerCase();

const NuevoRegistroDrawer: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const { user } = useAuth();
  const isAdministrador = user?.rol === "Administrador";

  const [form] = Form.useForm<NuevoRegistroValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [createObraOpen, setCreateObraOpen] = useState(false);
  const [obraForm] = Form.useForm<CreateObraValues>();

  const obraId = Form.useWatch("obraId", form);
  const selectedObra = obras.find((o) => o.id === obraId);

  const handleAfterOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCreateObraOpen(false);
      return;
    }
    form.resetFields();
    setFileList([]);
    setObras(loadObras());
    form.setFieldsValue({
      fechaEjecucion: dayjs(),
    } as Partial<NuevoRegistroValues>);
  };

  const handleFinish = (values: NuevoRegistroValues) => {
    const file =
      fileList && fileList.length > 0
        ? (fileList[0].originFileObj as File)
        : undefined;
    onSubmit({ ...values, fotoArchivo: file });
    if (!values.fotoUrl && !file) {
      message.info("Recuerda adjuntar foto o URL en la siguiente edición.");
    }
  };

  const openCreateObra = () => {
    obraForm.resetFields();
    setCreateObraOpen(true);
  };

  const handleCreateObra = (values: CreateObraValues) => {
    if (!isAdministrador) {
      message.error("No tienes permisos para crear obras");
      return;
    }

    const nombre = values.nombre.trim();
    const codigo = values.codigo?.trim();

    if (!nombre) {
      message.error("Ingresa el nombre de la obra");
      return;
    }

    if (obras.some((o) => normalizeText(o.nombre) === normalizeText(nombre))) {
      message.error("Ya existe una obra con ese nombre");
      return;
    }

    const nueva: Obra = {
      id: createId(),
      nombre,
      codigo: codigo ? codigo : undefined,
      createdAt: new Date().toISOString(),
    };

    const next = [nueva, ...obras];
    setObras(next);
    saveObras(next);
    form.setFieldsValue({ obraId: nueva.id } as Partial<NuevoRegistroValues>);
    setCreateObraOpen(false);
    message.success("Obra creada");
  };

  return (
    <Drawer
      placement="right"
      title={
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-orange-700 border border-amber-100">
            <FireOutlined className="text-[12px]" />
            <span>Nuevo registro de sello cortafuego</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Completa los datos según el itemizado BECK y registra la evidencia
            en terreno.
          </p>
        </div>
      }
      open={open}
      onClose={onClose}
      afterOpenChange={handleAfterOpenChange}
      size="large"
      styles={{
        body: { paddingBottom: 24, backgroundColor: "#f9fafb" },
      }}
    >
      <Modal
        title="Crear obra"
        open={createObraOpen}
        onCancel={() => setCreateObraOpen(false)}
        okText="Crear"
        cancelText="Cancelar"
        onOk={() => obraForm.submit()}
        destroyOnClose
      >
        <Form<CreateObraValues>
          form={obraForm}
          layout="vertical"
          requiredMark={false}
          onFinish={handleCreateObra}
        >
          <Form.Item
            name="nombre"
            label="Nombre de la obra"
            rules={[{ required: true, message: "Ingresa el nombre" }]}
          >
            <Input placeholder="Ej: Hospital Buin Paine" />
          </Form.Item>
          <Form.Item name="codigo" label="Código (opcional)">
            <Input placeholder="Ej: OB-2025-001" />
          </Form.Item>
          <p className="text-[11px] text-slate-500">
            Solo el Administrador puede crear obras.
          </p>
        </Form>
      </Modal>

      <Form
        layout="vertical"
        form={form}
        onFinish={handleFinish}
        className="space-y-4"
      >
        {/* Paso 0: Obra (solo Admin crea) */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Obra
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,auto]">
            <Form.Item
              name="obraId"
              label="Selecciona la obra"
              rules={[{ required: true, message: "Selecciona una obra" }]}
            >
              <Select
                placeholder={
                  obras.length ? "Selecciona una obra" : "No hay obras creadas"
                }
                options={obras.map((o) => ({
                  value: o.id,
                  label: o.codigo ? `${o.codigo} · ${o.nombre}` : o.nombre,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            {isAdministrador && (
              <div className="flex items-end">
                <Button
                  icon={<PlusOutlined />}
                  onClick={openCreateObra}
                  className="text-xs"
                >
                  Crear obra
                </Button>
              </div>
            )}
          </div>

          {!isAdministrador && obras.length === 0 && (
            <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              No hay obras creadas. Pide al Administrador que cree una para
              continuar.
            </div>
          )}
        </div>

        {!selectedObra ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
            Selecciona una obra para continuar con el registro.
          </div>
        ) : (
          <>
        {/* Bloque 1: Identificación del itemizado */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Identificación del itemizado
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              name="itemizadoBeck"
              label="Itemizado BECK"
              rules={[{ required: true, message: "Ingrese itemizado BECK" }]}
            >
              <Input placeholder="Ej: BECK-001" />
            </Form.Item>
            <Form.Item name="itemizadoSacyr" label="Itemizado SACYR">
              <Input placeholder="Ej: SACYR-A12" />
            </Form.Item>

            <Form.Item
              name="fechaEjecucion"
              label="Fecha ejecución"
              rules={[{ required: true, message: "Seleccione la fecha" }]}
            >
              <DatePicker
                format="DD-MM-YYYY"
                style={{ width: "100%" }}
                placeholder="Seleccione fecha"
              />
            </Form.Item>

            <Form.Item
              name="piso"
              label="Piso"
              rules={[{ required: true, message: "Indique piso" }]}
            >
              <Input placeholder="Ej: Piso 2" />
            </Form.Item>
          </div>
        </div>

        {/* Bloque 2: Ubicación y responsable */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Ubicación y responsable
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Form.Item name="ejeAlfabetico" label="Eje alfabético">
              <Input placeholder="Ej: B" />
            </Form.Item>

            <Form.Item name="ejeNumerico" label="Eje numérico">
              <Input placeholder="Ej: 12" />
            </Form.Item>

            <Form.Item
              name="nombreSellador"
              label="Nombre sellador"
              rules={[{ required: true, message: "Indique el sellador" }]}
            >
              <Input placeholder="Nombre sellador" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="recinto" label="Recinto">
              <Input placeholder="Ej: Sala bombas" />
            </Form.Item>

            <Form.Item name="numeroSello" label="N° del sello">
              <Input placeholder="Ej: S-0001" />
            </Form.Item>
          </div>
        </div>

        {/* Bloque 3: Parámetros técnicos */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Parámetros técnicos
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Form.Item
              name="cantidadSellos"
              label="Cantidad de sellos"
              rules={[{ required: true, message: "Indique cantidad" }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="holguraCm"
              label="Holgura (cm)"
              rules={[{ required: true, message: "Indique holgura" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="factorHolgura"
              label="Factor por holguras"
              rules={[{ required: true, message: "Seleccione factor" }]}
            >
              <Select
                placeholder="Seleccione F"
                options={[
                  { value: 1, label: "F = 1 · menor a 2 cm" },
                  { value: 1.2, label: "F = 1,2 · entre 2 y 4 cm" },
                  { value: 1.4, label: "F = 1,4 · entre 4 y 6 cm" },
                  { value: 1.8, label: "F = 1,8 · entre 6 y 10 cm" },
                ]}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              name="cieloModular"
              label="Cielo modular"
              rules={[{ required: true, message: "Seleccione tipo de cielo" }]}
            >
              <Select
                placeholder="Seleccione F cielo"
                options={[
                  { value: 1, label: "F = 1 · Accesibilidad normal" },
                  {
                    value: 2,
                    label: "F = 2 · Cielo americano / estructurado",
                  },
                  { value: 3, label: "F = 3 · Cielo duro / gateras" },
                ]}
              />
            </Form.Item>

            <Form.Item name="fotoUrl" label="Foto (URL / referencia)">
              <Input
                prefix={<CameraOutlined />}
                placeholder="URL foto o ID (Cloudinary después)"
              />
            </Form.Item>
            <Form.Item label="Foto local (subida)">
              <Upload
                fileList={fileList}
                maxCount={1}
                beforeUpload={() => false}
                onChange={({ fileList: next }) => setFileList(next)}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} size="small">
                  Seleccionar archivo
                </Button>
              </Upload>
              <p className="text-[10px] text-slate-500 mt-1">
                Guardado local (mock). Para backend real, conectar a Cloudinary/S3.
              </p>
            </Form.Item>
          </div>
        </div>

        {/* Bloque 4: Observaciones */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Observaciones
          </p>
          <Form.Item name="observaciones" label={false}>
            <Input.TextArea
              rows={3}
              placeholder="Notas de supervisión, accesos, refuerzos, etc."
            />
          </Form.Item>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="primary"
            htmlType="submit"
            className="bg-orange-500 hover:bg-orange-600 border-none"
          >
            Guardar registro
          </Button>
        </div>
          </>
        )}
      </Form>
    </Drawer>
  );
};

export default NuevoRegistroDrawer;
