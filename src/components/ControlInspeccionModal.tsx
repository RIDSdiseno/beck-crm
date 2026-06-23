import React, { useEffect, useState } from "react";
import { Button, DatePicker, Form, Input, Modal, Select, Spin, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  inspeccionAPI,
  type ControlInspeccion,
  type ControlInspeccionParametro,
  type EstadoConformidadInspeccion,
  type ResultadoParametroInspeccion,
} from "../services/api";

const PARAMETROS_FIJOS: string[] = [
  "Holgura dentro de los parámetros indicados según ensayo UL",
  "Superficie limpia y libre de material excedente",
  "Aislante (lana mineral/varilla de espuma según corresponda)",
  "Lana de roca bien comprimida y colocada",
  "Tipo de sellante aplicado acorde a los ensayos UL (MC 1000,1200,150+)",
  "Espesor de sellante aplicado",
  "Espesor de la corona (aplica cuando la holgura es cero o casi nula)",
  "Masilla del sello sin poros, fisuras o grietas",
  "Dimensión del solape y espesor",
  "Dimensión y tipo de la cinta intumescente",
  "N° de vueltas de cinta intumescente",
  "Collarín bien instalado con tornillos y tarugos, pernos de anclaje o clavos de fijación directa según corresponda",
  "Cantidad de fijaciones de collarín",
  "Porcentaje de ocupación de bandejas eléctricas",
  "Manga metálica o sleeve intumescente bien instalado",
  "Mortero resistente al fuego sin poros, fisuras o grietas y a ras con la superficie",
  "Ángulo de retención instalado",
  "Manga metálica o sleeve intumescente bien instalado",
  "Mortero resistente al fuego sin poros, fisuras o grietas y a ras con la superficie",
  "Ángulo de retención instalado",
];

interface ParametroFormValue {
  resultado: ResultadoParametroInspeccion;
  observacion?: string;
}

interface FormValues {
  fecha: dayjs.Dayjs;
  ensayo?: string;
  observacion?: string;
  conformidad: EstadoConformidadInspeccion;
  parametros: ParametroFormValue[];
}

interface Props {
  registroId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const resultadoLabel: Record<ResultadoParametroInspeccion, string> = {
  cumple: "Cumple",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
};

const resultadoColor: Record<ResultadoParametroInspeccion, string> = {
  cumple: "green",
  no_cumple: "red",
  no_aplica: "default",
};

const conformidadLabel: Record<EstadoConformidadInspeccion, string> = {
  conforme: "Conforme",
  no_conforme: "No conforme",
};

const ControlInspeccionModal: React.FC<Props> = ({ registroId, open, onClose, onSaved }) => {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [control, setControl] = useState<ControlInspeccion | null>(null);
  const [modo, setModo] = useState<"crear" | "ver">("crear");

  useEffect(() => {
    if (!open || !registroId) {
      setControl(null);
      setModo("crear");
      form.resetFields();
      return;
    }

    const cargar = async () => {
      setLoading(true);
      try {
        const data = await inspeccionAPI.obtenerControl(registroId);
        if (data) {
          setControl(data);
          setModo("ver");
        } else {
          setControl(null);
          setModo("crear");
          form.setFieldsValue({
            fecha: dayjs(),
            parametros: PARAMETROS_FIJOS.map(() => ({ resultado: "no_aplica" as ResultadoParametroInspeccion, observacion: "" })),
          });
        }
      } catch {
        message.error("No se pudo cargar el control de inspección");
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, [open, registroId, form]);

  const handleGuardar = async () => {
    if (!registroId) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        fecha: values.fecha.format("YYYY-MM-DD"),
        ensayo: values.ensayo || null,
        observacion: values.observacion || null,
        conformidad: values.conformidad,
        parametros: PARAMETROS_FIJOS.map((parametro, i) => ({
          orden: i + 1,
          parametro,
          resultado: values.parametros?.[i]?.resultado ?? "no_aplica",
          observacion: values.parametros?.[i]?.observacion || null,
        })),
      };
      await inspeccionAPI.crearControl(registroId, payload);
      message.success("Control de inspección creado correctamente");
      onSaved?.();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; errorFields?: unknown };
      if (e?.errorFields) return;
      const msg =
        e?.response?.data?.error ??
        e?.response?.data?.message ??
        "No se pudo guardar el control de inspección";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const columnsVer: ColumnsType<ControlInspeccionParametro> = [
    { title: "#", dataIndex: "orden", key: "orden", width: 44 },
    { title: "Parámetro", dataIndex: "parametro", key: "parametro" },
    {
      title: "Resultado",
      dataIndex: "resultado",
      key: "resultado",
      width: 110,
      render: (val: ResultadoParametroInspeccion) => (
        <Tag color={resultadoColor[val] ?? "default"}>{resultadoLabel[val] ?? val}</Tag>
      ),
    },
    {
      title: "Observación",
      dataIndex: "observacion",
      key: "observacion",
      render: (val?: string | null) => val || "-",
    },
  ];

  const footer =
    modo === "crear"
      ? [
          <Button key="cancel" onClick={onClose}>
            Cancelar
          </Button>,
          <Button key="save" type="primary" loading={saving} onClick={() => void handleGuardar()}>
            Guardar control
          </Button>,
        ]
      : [
          <Button key="close" onClick={onClose}>
            Cerrar
          </Button>,
        ];

  return (
    <Modal
      title="Control de Inspección"
      open={open}
      onCancel={onClose}
      width={940}
      footer={footer}
      destroyOnClose
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : modo === "ver" && control ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <span className="font-medium text-slate-600">Fecha:</span>{" "}
              {control.fecha ? dayjs(control.fecha).format("DD-MM-YYYY") : "-"}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Conformidad:</span>
              <Tag color={control.conformidad === "conforme" ? "green" : "red"}>
                {conformidadLabel[control.conformidad] ?? control.conformidad}
              </Tag>
            </div>
            {control.ensayo && (
              <div className="col-span-2">
                <span className="font-medium text-slate-600">Ensayo:</span> {control.ensayo}
              </div>
            )}
            {control.observacion && (
              <div className="col-span-2">
                <span className="font-medium text-slate-600">Observación:</span> {control.observacion}
              </div>
            )}
            {(control.fotoInspeccionUrl || control.fotoNoConformidadUrl) && (
              <div className="col-span-2 space-y-1">
                {control.fotoInspeccionUrl && (
                  <div>
                    <span className="font-medium text-slate-600">Foto inspección:</span>{" "}
                    <a href={control.fotoInspeccionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Ver foto
                    </a>
                  </div>
                )}
                {control.fotoNoConformidadUrl && (
                  <div>
                    <span className="font-medium text-slate-600">Foto no conformidad:</span>{" "}
                    <a href={control.fotoNoConformidadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Ver foto
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs italic text-slate-400">
            Las fotos de inspección se integrarán en una fase posterior.
          </p>
          <Table
            size="small"
            columns={columnsVer}
            dataSource={control.parametros ?? []}
            rowKey={(r) => String(r.id ?? r.orden)}
            pagination={false}
            scroll={{ y: 380 }}
          />
        </div>
      ) : (
        <Form form={form} layout="vertical" size="small">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="fecha"
              label="Fecha"
              rules={[{ required: true, message: "La fecha es obligatoria" }]}
            >
              <DatePicker format="DD-MM-YYYY" className="w-full" />
            </Form.Item>
            <Form.Item
              name="conformidad"
              label="Conformidad"
              rules={[{ required: true, message: "La conformidad es obligatoria" }]}
            >
              <Select
                placeholder="Seleccione conformidad"
                options={[
                  { value: "conforme", label: "Conforme" },
                  { value: "no_conforme", label: "No conforme" },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="ensayo" label="Ensayo">
            <Input placeholder="Tipo de ensayo UL" />
          </Form.Item>
          <Form.Item name="observacion" label="Observación general">
            <Input.TextArea rows={2} placeholder="Observaciones generales de la inspección..." />
          </Form.Item>

          <div className="mb-2 text-xs font-medium text-slate-600">
            Parámetros de inspección
          </div>
          <div className="max-h-[380px] overflow-y-auto rounded border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-left font-medium text-slate-600">#</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">Parámetro</th>
                  <th className="w-36 px-2 py-1.5 text-left font-medium text-slate-600">Resultado</th>
                  <th className="w-44 px-2 py-1.5 text-left font-medium text-slate-600">Observación</th>
                </tr>
              </thead>
              <tbody>
                {PARAMETROS_FIJOS.map((parametro, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1 leading-snug">{parametro}</td>
                    <td className="px-2 py-1">
                      <Form.Item name={["parametros", i, "resultado"]} noStyle initialValue="no_aplica">
                        <Select
                          size="small"
                          style={{ width: 130 }}
                          options={[
                            { value: "cumple", label: "Cumple" },
                            { value: "no_cumple", label: "No cumple" },
                            { value: "no_aplica", label: "No aplica" },
                          ]}
                        />
                      </Form.Item>
                    </td>
                    <td className="px-2 py-1">
                      <Form.Item name={["parametros", i, "observacion"]} noStyle>
                        <Input size="small" placeholder="..." style={{ width: 160 }} />
                      </Form.Item>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs italic text-slate-400">
            Las fotos de inspección se integrarán en una fase posterior.
          </p>
        </Form>
      )}
    </Modal>
  );
};

export default ControlInspeccionModal;
