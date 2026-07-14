// src/components/NuevoRegistroDrawer.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { obrasAPI } from "../services/api";
import type { CampoConfiguracionRegistro, ItemizadoMandante } from "../services/api";
import { TIPOS_REGISTRO_TERRENO, getTipoRegistroLabel, getCantidadLabelPorTipo } from "../constants/roles";

type ObraMin = { id: string; nombre: string; codigo?: string | null };

export type NuevoRegistroValues = {
  tipoRegistro: string;
  obraId: string;
  itemizadoMandanteId?: string;
  codigoBeck?: string;
  itemizadoBeck: string;
  itemizadoSacyr?: string;
  fechaEjecucion: Dayjs;
  piso: string;
  ejeAlfabetico?: string;
  ejeNumerico?: string;
  nombreSellador: string;
  recinto?: string;
  numeroSello?: string;
  cantidadSellos?: number;
  metrosLineales?: number;
  holguraCm: number;
  factorHolgura?: 1 | 1.2 | 1.4 | 1.8;
  cieloModular: 1 | 2 | 3;
  cantidadSellosConFactores?: number;
  aislacion?: number;
  cantidadSellosAislacion?: number;
  reparacionTabique?: number;
  cantidadFinal?: number;
  fotoUrl?: string;
  fotoArchivo?: File;
  observaciones?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NuevoRegistroValues) => void | Promise<void>;
  itemizadosMandante?: ItemizadoMandante[];
  camposConfigurados?: CampoConfiguracionRegistro[];
  obrasApi?: ObraMin[];
  submitting?: boolean;
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

const getCampoConfigKey = (field: CampoConfiguracionRegistro): string =>
  normalizeCampoConfigKey(field.campo || field.key || field.nombreCampo || field.nombre || field.label || "");

const normalizeCampoConfigKey = (value: unknown): string => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized === "supervisor") return "jefeobra";
  if (normalized === "terreno") return "trabajador";
  if (normalized === "eje alfabetico") return "eje_alfabetico";
  if (normalized === "eje numerico") return "eje_numerico";
  if (normalized === "recinto") return "recinto";
  if (normalized === "modulo" || normalized === "modulo o edificio" || normalized === "edificio") return "modulo";
  if (normalized === "holgura" || normalized === "holgura cm") return "holgura";
  if (normalized === "factor por holguras") return "factor_por_holguras";
  if (normalized === "cielo modular" || normalized === "accesibilidad") return "accesibilidad";
  if (normalized.includes("cantidad") && normalized.includes("sellos") && normalized.includes("factores")) {
    return "cantidad_sellos_con_factores";
  }
  if (normalized === "aislacion") return "aislacion";
  if (normalized.includes("cantidad") && normalized.includes("sellos") && normalized.includes("aislacion")) {
    return "cantidad_sellos_aislacion";
  }
  if (normalized.includes("reparacion") && normalized.includes("tabique")) return "reparacion_tabique";
  if (normalized === "cantidad final") return "cantidad_final";
  if (normalized === "folio") return "folio";
  return String(value ?? "").trim();
};

const isCampoVisible = (
  fields: CampoConfiguracionRegistro[],
  key: string
): boolean => {
  const field = fields.find((item) => getCampoConfigKey(item) === key);
  return field ? Boolean(field.visible) : true;
};

const NuevoRegistroDrawer: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  itemizadosMandante = [],
  camposConfigurados = [],
  obrasApi,
  submitting = false,
}) => {
  const { user } = useAuth();
  const isAdministrador = user?.rol === "Administrador";

  const [form] = Form.useForm<NuevoRegistroValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [createObraOpen, setCreateObraOpen] = useState(false);
  const [obraForm] = Form.useForm<CreateObraValues>();
  const [tiposFetchedFor, setTiposFetchedFor] = useState<string | null>(null);
  const [fetchedTipos, setFetchedTipos] = useState<string[]>([]);

  const obraId = Form.useWatch("obraId", form);
  const tipoRegistro = Form.useWatch("tipoRegistro", form);

  // null while fetch pending or no obra selected; array once loaded for current obraId
  const tiposRegistroObra: string[] | null =
    obraId && tiposFetchedFor === obraId ? fetchedTipos : null;
  const loadingTipos = Boolean(obraId) && tiposFetchedFor !== obraId;

  const listaObras: ObraMin[] = obrasApi ?? obras;
  const selectedObra = listaObras.find((o) => o.id === obraId);
  const esEspuma = tipoRegistro === "junta_lineal_espuma";
  const showCampo = (key: string) => isCampoVisible(camposConfigurados, key);

  useEffect(() => {
    if (!obraId) return;
    let active = true;
    void obrasAPI.getTiposRegistro(obraId).then((tipos) => {
      if (!active) return;
      setFetchedTipos(tipos);
      setTiposFetchedFor(obraId);
      if (tipos.length === 1) {
        form.setFieldValue("tipoRegistro", tipos[0]);
      }
    }).catch(() => {
      if (active) {
        setFetchedTipos([]);
        setTiposFetchedFor(obraId);
      }
    });
    return () => { active = false; };
  }, [obraId, form]);

  const tipoOptions = useMemo(() => {
    if (!tiposRegistroObra || tiposRegistroObra.length === 0) {
      return TIPOS_REGISTRO_TERRENO;
    }
    return TIPOS_REGISTRO_TERRENO.filter((t) => tiposRegistroObra.includes(t.value));
  }, [tiposRegistroObra]);

  const cantidadSellosWatched = Form.useWatch("cantidadSellos", form);
  const holguraCmWatched = Form.useWatch("holguraCm", form);
  const cieloModularWatched = Form.useWatch("cieloModular", form);
  const aislacionWatched = Form.useWatch("aislacion", form);
  const reparacionTabiqueWatched = Form.useWatch("reparacionTabique", form);

  const preview = useMemo(() => {
    const holgura = Number(holguraCmWatched) || 0;
    const cantidad = Number(cantidadSellosWatched) || 0;
    const accesibilidad = Number(cieloModularWatched) || 1;

    let factorHolgura: number | null = null;
    let holguraAlerta = false;

    if (holgura > 0) {
      if (holgura <= 2) factorHolgura = 1;
      else if (holgura <= 4) factorHolgura = 1.2;
      else if (holgura <= 6) factorHolgura = 1.4;
      else if (holgura <= 10) factorHolgura = 1.8;
      else holguraAlerta = true;
    }

    const cantidadConFactores =
      factorHolgura !== null && cantidad > 0
        ? cantidad * factorHolgura * accesibilidad
        : null;

    const factorAislacion = Number(aislacionWatched) === 1.3 ? 1.3 : 1;
    const cantidadAislacion =
      cantidadConFactores !== null ? cantidadConFactores * factorAislacion : null;

    const repTabique = Number(reparacionTabiqueWatched) === 1 ? 1 : 0;
    const cantidadFinal =
      cantidadAislacion !== null ? cantidadAislacion + repTabique : null;

    return { factorHolgura, holguraAlerta, cantidadConFactores, factorAislacion, cantidadAislacion, cantidadFinal };
  }, [cantidadSellosWatched, holguraCmWatched, cieloModularWatched, aislacionWatched, reparacionTabiqueWatched]);

  const handleAfterOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCreateObraOpen(false);
      return;
    }
    form.resetFields();
    setFileList([]);
    if (!obrasApi) setObras(loadObras());
    form.setFieldsValue({
      fechaEjecucion: dayjs(),
      tipoRegistro: "sello_cortafuego",
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

  const tipoLabel = getTipoRegistroLabel(tipoRegistro);

  return (
    <Drawer
      placement="right"
      title={
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-orange-700 border border-amber-100">
            <FireOutlined className="text-[12px]" />
            <span>Nuevo registro · {tipoLabel}</span>
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
      width="min(736px, 100vw)"
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
        {/* Tipo de registro */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tipo de registro
          </p>
          <Form.Item
            name="tipoRegistro"
            rules={[{ required: true, message: "Selecciona el tipo" }]}
            className="mb-0"
          >
            <Select loading={loadingTipos} options={tipoOptions} />
          </Form.Item>
          {obraId && tiposRegistroObra !== null && tiposRegistroObra.length === 0 && (
            <Alert type="warning" showIcon className="mt-2" message="Esta obra no tiene tipos de registro configurados. Ingeniería debe configurarla antes de registrar." />
          )}
        </div>

        {/* Obra */}
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
                  listaObras.length ? "Selecciona una obra" : "No hay obras creadas"
                }
                options={listaObras.map((o) => ({
                  value: o.id,
                  label: o.codigo ? `${o.codigo} · ${o.nombre}` : o.nombre,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            {!obrasApi && isAdministrador && (
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

          {!obrasApi && !isAdministrador && obras.length === 0 && (
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
                <Form.Item name="itemizadoMandanteId" label="Itemizado Mandante">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Selecciona itemizado mandante"
                    optionFilterProp="label"
                    options={itemizadosMandante.map((item) => ({
                      value: item.id,
                      label: item.codigoBeck ? `${item.codigoBeck} · ${item.nombre}` : item.nombre,
                    }))}
                    onChange={(value) => {
                      const item = itemizadosMandante.find((i) => i.id === value);
                      form.setFieldsValue({
                        codigoBeck: item?.codigoBeck ?? "",
                        itemizadoBeck: item?.nombre ?? form.getFieldValue("itemizadoBeck"),
                      } as Partial<NuevoRegistroValues>);
                    }}
                  />
                </Form.Item>
                <Form.Item name="codigoBeck" label="Código BECK">
                  <Input disabled placeholder="Se completa desde Itemizado Mandante" />
                </Form.Item>
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
                {showCampo("eje_alfabetico") && (
                <Form.Item name="ejeAlfabetico" label="Eje alfabético">
                  <Input placeholder="Ej: B" />
                </Form.Item>
                )}

                {showCampo("eje_numerico") && (
                <Form.Item name="ejeNumerico" label="Eje numérico">
                  <Input placeholder="Ej: 12" />
                </Form.Item>
                )}

                <Form.Item
                  name="nombreSellador"
                  label={esEspuma ? "Nombre cuadrilla" : "Nombre sellador"}
                  rules={[{ required: true, message: "Indique el responsable" }]}
                >
                  <Input placeholder={esEspuma ? "Nombre cuadrilla" : "Nombre sellador"} />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(showCampo("recinto") || showCampo("modulo")) && (
                <Form.Item name="recinto" label="Recinto / Módulo">
                  <Input placeholder="Ej: Sala bombas" />
                </Form.Item>
                )}

                {!esEspuma && (
                  <Form.Item name="numeroSello" label="N° del sello">
                    <Input placeholder="Ej: S-0001" />
                  </Form.Item>
                )}
              </div>
            </div>

            {/* Bloque 3: Parámetros técnicos */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Parámetros técnicos
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {/* Campo condicional: cantidadSellos (cortafuego) o metrosLineales (espuma) */}
                {!esEspuma ? (
                  <Form.Item
                    name="cantidadSellos"
                    label={getCantidadLabelPorTipo(tipoRegistro)}
                    rules={[{ required: true, message: "Indique cantidad" }]}
                  >
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="metrosLineales"
                    label="Longitud ejecutada (m)"
                    rules={[{ required: true, message: "Indique longitud en metros" }]}
                  >
                    <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                  </Form.Item>
                )}

                {showCampo("holgura") && (
                <Form.Item
                  name="holguraCm"
                  label="Holgura (cm)"
                  rules={[{ required: true, message: "Indique holgura" }]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Form.Item
                  name="cieloModular"
                  label="Accesibilidad"
                  rules={[{ required: true, message: "Seleccione accesibilidad" }]}
                >
                  <Select
                    placeholder="Seleccione accesibilidad"
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

                {showCampo("aislacion") && (
                  <Form.Item name="aislacion" label="Aislación">
                    <Select
                      placeholder="Seleccione aislación"
                      options={[
                        { value: 1, label: "NO APLICA (F = 1)" },
                        { value: 1.3, label: "APLICA (F = 1.3)" },
                      ]}
                    />
                  </Form.Item>
                )}

                {showCampo("reparacion_tabique") && (
                  <Form.Item name="reparacionTabique" label="Reparación tabique">
                    <Select
                      placeholder="Seleccione"
                      options={[
                        { value: 0, label: "NO APLICA" },
                        { value: 1, label: "APLICA (+1 sello)" },
                      ]}
                    />
                  </Form.Item>
                )}

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

            {/* Cálculo automático */}
            {!esEspuma && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 md:p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  Cálculo automático
                </p>
                {preview.holguraAlerta && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                    ⚠ CORREGIR HOLGURA — El valor supera 10 cm. Corrija antes de guardar.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Factor por holgura</p>
                    <p className="text-sm font-bold text-sky-700">
                      {preview.factorHolgura !== null ? `F = ${preview.factorHolgura}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Cantidad con factores</p>
                    <p className="text-sm font-bold text-sky-700">
                      {preview.cantidadConFactores !== null
                        ? preview.cantidadConFactores.toFixed(2)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Factor aislación</p>
                    <p className="text-sm font-bold text-sky-700">
                      {preview.factorAislacion}
                    </p>
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Cantidad final</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {preview.cantidadFinal !== null
                        ? preview.cantidadFinal.toFixed(2)
                        : "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  Vista previa en tiempo real. El servidor recalcula al guardar.
                </p>
              </div>
            )}

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
                loading={submitting}
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
