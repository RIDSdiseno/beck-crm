// src/components/RegistroDetalleModal.tsx
import React, { useEffect } from "react";
import { Button, Divider, Form, Input, InputNumber, Modal, Select, Tag } from "antd";
import {
  CameraOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  FireOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { RegistroSello } from "../types/registroSello";

export type RegistroDetalleUpdateValues = {
  descripcionMaterial: string;
  modulo: string;
  piso: string;
  ejeNumerico: string;
  ejeAlfabetico: string;
  numeroSello: string;
  cantidadSellos: number;
  nombreSellador: string;
  holguraCm: number;
  accesibilidad: number;
  observaciones: string;
  estado: "pendiente" | "validado" | "rechazado";
};

type RegistroDetalleModalProps = {
  registro: RegistroSello | null;
  open: boolean;
  canEdit?: boolean;
  mode: "view" | "edit";
  saving?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onSave?: (values: RegistroDetalleUpdateValues) => void | Promise<void>;
  onDownloadPdf?: (registro: RegistroSello) => void | Promise<void>;
};

const estadoOptions = [
  { label: "Pendiente", value: "pendiente" },
  { label: "Validado", value: "validado" },
  { label: "Rechazado", value: "rechazado" },
];

const normalizeEstado = (
  estado?: string
): RegistroDetalleUpdateValues["estado"] => {
  if (estado === "validado" || estado === "rechazado") return estado;
  return "pendiente";
};

const getEstadoColor = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "validado") return "green";
  if (normalized === "rechazado") return "red";
  return "gold";
};

const getEstadoLabel = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "validado") return "Validado";
  if (normalized === "rechazado") return "Rechazado";
  return "Pendiente";
};

const RegistroDetalleModal: React.FC<RegistroDetalleModalProps> = ({
  registro,
  open,
  canEdit = false,
  mode,
  saving = false,
  onClose,
  onEdit,
  onSave,
  onDownloadPdf,
}) => {
  const [form] = Form.useForm<RegistroDetalleUpdateValues>();
  const visible = open && !!registro;
  const canEditRegistro = canEdit && mode === "edit";

  useEffect(() => {
    if (!registro) return;

    form.setFieldsValue({
      descripcionMaterial: registro.descripcionMaterial ?? registro.itemizadoBeck,
      modulo: registro.recinto,
      piso: registro.piso,
      ejeNumerico: registro.ejeNumerico,
      ejeAlfabetico: registro.ejeAlfabetico,
      numeroSello: registro.numeroSello,
      cantidadSellos: registro.cantidadSellos,
      nombreSellador: registro.nombreSellador,
      holguraCm: registro.holguraCm,
      accesibilidad: registro.accesibilidad ?? registro.cieloModular,
      observaciones: registro.observaciones ?? "",
      estado: normalizeEstado(registro.estado),
    });
  }, [form, registro]);

  if (!registro) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        title="Detalle de sello"
      >
        <p className="text-sm text-slate-500">Sin datos para mostrar.</p>
      </Modal>
    );
  }

  const fecha = dayjs(registro.fechaEjecucion).format("DD-MM-YYYY");

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      title={null}
      className="registro-detalle-modal"
      styles={{
        header: { display: "none" },
        body: { padding: 0, backgroundColor: "#ffffff" },
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
            Detalle de registro
          </p>
          <h2 className="text-sm font-semibold text-slate-900">
            Sello {registro.numeroSello || "-"} · {registro.itemizadoBeck}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1 text-orange-700">
            <FireOutlined />
            <span>{registro.cantidadSellos} sellos</span>
          </div>
          <Tag color={getEstadoColor(registro.estado)} className="m-0 text-[11px]">
            {getEstadoLabel(registro.estado)}
          </Tag>
        </div>
      </div>

      <div className="space-y-4 bg-white p-5 text-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr,1.2fr]">
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {registro.fotoUrl ? (
              <img
                src={registro.fotoUrl}
                alt="Foto sello"
                className="h-56 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src =
                    "https://via.placeholder.com/600x350.png?text=Foto+no+disponible";
                }}
              />
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-xs text-slate-500">
                <CameraOutlined className="mb-1 text-lg" />
                Sin foto asociada
              </div>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <FieldTimeOutlined className="text-[13px] text-orange-700" />
              <span>
                Ejecutado el <b>{fecha}</b> ({registro.dia || "-"})
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <EnvironmentOutlined className="text-[13px] text-orange-700" />
              <span>
                Obra: <b>{registro.obraNombre ?? "Sin obra"}</b>
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <UserOutlined className="text-[13px] text-orange-700" />
              <span>
                Usuario: <b>{registro.usuarioNombre ?? "Sin usuario"}</b>
              </span>
            </div>

            <Divider className="my-2 border-slate-200" />

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Cantidad de sellos</p>
                <p className="text-base font-semibold text-slate-900">
                  {registro.cantidadSellos}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Sellos ponderados</p>
                <p className="text-base font-semibold text-emerald-600">
                  {registro.cantidadSellosConFactor.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Holgura (cm)</p>
                <p className="text-base font-semibold text-slate-900">
                  {registro.holguraCm}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Accesibilidad</p>
                <p className="text-base font-semibold text-slate-900">
                  {registro.accesibilidad ?? registro.cieloModular}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Divider className="my-2 border-slate-200" />

        <Form
          form={form}
          layout="vertical"
          disabled={!canEditRegistro}
          onFinish={(values) => {
            void onSave?.(values);
          }}
          className="grid grid-cols-1 gap-x-3 md:grid-cols-2"
        >
          <Form.Item
            name="descripcionMaterial"
            label="Descripción material"
            className="mb-3"
          >
            <Input />
          </Form.Item>
          <Form.Item name="modulo" label="Módulo" className="mb-3">
            <Input />
          </Form.Item>
          <Form.Item name="piso" label="Piso" className="mb-3">
            <Input />
          </Form.Item>
          <Form.Item name="ejeNumerico" label="Eje numérico" className="mb-3">
            <Input />
          </Form.Item>
          <Form.Item name="ejeAlfabetico" label="Eje alfabético" className="mb-3">
            <Input />
          </Form.Item>
          <Form.Item name="numeroSello" label="N° sello" className="mb-3">
            <Input />
          </Form.Item>
          <Form.Item name="cantidadSellos" label="Cantidad sellos" className="mb-3">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="nombreSellador" label="Nombre sellador" className="mb-3">
            <Input />
          </Form.Item>
          <Form.Item name="holguraCm" label="Holgura (cm)" className="mb-3">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="accesibilidad" label="Accesibilidad" className="mb-3">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="estado" label="Estado" className="mb-3">
            <Select options={estadoOptions} />
          </Form.Item>
          <Form.Item
            name="observaciones"
            label="Observaciones"
            className="mb-3 md:col-span-2"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          {onDownloadPdf && (
            <Button
              onClick={() => {
                void onDownloadPdf(registro);
              }}
            >
              Descargar PDF
            </Button>
          )}
          <Button onClick={onClose}>Cerrar</Button>
          {canEditRegistro && (
            <Button
              type="primary"
              loading={saving}
              onClick={() => form.submit()}
            >
              Guardar cambios
            </Button>
          )}
          {!canEditRegistro && canEdit && (
            <Button type="primary" onClick={onEdit}>
              Editar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default RegistroDetalleModal;
