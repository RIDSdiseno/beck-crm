// src/components/RegistroDetalleModal.tsx
import React, { useEffect } from "react";
import { Button, Divider, Form, Image, Input, InputNumber, Modal, Select, Tag } from "antd";
import {
  CameraOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  FireOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { RegistroSello } from "../types/registroSello";
import type { CampoConfiguracionRegistro, ItemizadoMandante } from "../services/api";

export type RegistroDetalleUpdateValues = {
  descripcionMaterial: string;
  modulo: string;
  piso: string;
  ejeNumerico: string;
  ejeAlfabetico: string;
  numeroSello: string;
  cantidadSellos: number;
  metrosLineales: number;
  nombreSellador: string;
  holguraCm: number;
  accesibilidad: number;
  factorPorHolguras?: number;
  cieloModular?: number;
  cantidadSellosConFactores?: number;
  aislacion?: number;
  cantidadSellosAislacion?: number;
  reparacionTabique?: number;
  cantidadFinal?: number;
  observaciones: string;
  estado: "pendiente" | "en_revision" | "validado" | "rechazado";
  itemizadoMandanteId?: string;
  codigoBeck?: string;
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
  itemizadosMandante?: ItemizadoMandante[];
  camposConfigurados?: CampoConfiguracionRegistro[];
};

const estadoOptions = [
  { label: "Pendiente", value: "pendiente" },
  { label: "En revisión", value: "en_revision" },
  { label: "Validado", value: "validado" },
  { label: "Rechazado", value: "rechazado" },
];

const normalizeEstado = (
  estado?: string
): RegistroDetalleUpdateValues["estado"] => {
  if (
    estado === "en_revision" ||
    estado === "validado" ||
    estado === "rechazado"
  ) {
    return estado;
  }
  return "pendiente";
};

const getEstadoColor = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "en_revision") return "blue";
  if (normalized === "validado") return "green";
  if (normalized === "rechazado") return "red";
  return "gold";
};

const getEstadoLabel = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "en_revision") return "En revisión";
  if (normalized === "validado") return "Validado";
  if (normalized === "rechazado") return "Rechazado";
  return "Pendiente";
};

const getTipoLabel = (tipoRegistro?: string | null): string => {
  if (tipoRegistro === "junta_lineal_espuma") return "Junta lineal espuma";
  return "Sello cortafuego";
};

const getTipoColor = (tipoRegistro?: string | null): string => {
  if (tipoRegistro === "junta_lineal_espuma") return "blue";
  return "gold";
};

const getTipoBadgeClass = (tipoRegistro?: string | null): string => {
  if (tipoRegistro === "junta_lineal_espuma") {
    return "border border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border border-amber-200 bg-amber-50 text-amber-700";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFotoUrl = (foto: any): string | null => {
  if (!foto) return null;

  if (typeof foto === "string") {
    const clean = foto.trim();
    return clean.startsWith("http") ? clean : null;
  }

  if (typeof foto === "object") {
    const candidate =
      foto.url ||
      foto.secure_url ||
      foto.fotoUrl ||
      foto.src ||
      null;

    if (typeof candidate === "string") {
      const clean = candidate.trim();
      return clean.startsWith("http") ? clean : null;
    }
  }

  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFotosRegistro = (record: any): string[] => {
  const raw = [
    ...(Array.isArray(record.fotosUrls) ? record.fotosUrls : []),
    ...(Array.isArray(record.fotos_urls) ? record.fotos_urls : []),
    ...(Array.isArray(record.fotos_registro) ? record.fotos_registro : []),
    ...(Array.isArray(record.fotos) ? record.fotos : []),
    record.fotoUrl,
    record.foto_url,
  ];

  return [...new Set(raw.map(getFotoUrl).filter((x): x is string => !!x))];
};

const FieldView: React.FC<{ label: string; value: React.ReactNode; span?: number }> = ({
  label,
  value,
  span,
}) => (
  <div className={`mb-3${span === 2 ? " md:col-span-2" : ""}`}>
    <p className="mb-1 text-[11px] text-slate-500">{label}</p>
    <p className="text-sm font-medium text-slate-900">{value || "-"}</p>
  </div>
);

const getCampoConfigKey = (field: CampoConfiguracionRegistro): string =>
  String(field.campo || field.key || field.nombreCampo || field.nombre || "").trim();

const isCampoVisible = (
  fields: CampoConfiguracionRegistro[],
  key: string
): boolean => {
  const field = fields.find((item) => getCampoConfigKey(item) === key);
  return field ? Boolean(field.visible) : true;
};

const renderDetalleJuntaLineal = (r: RegistroSello): React.ReactNode => (
  <div className="grid grid-cols-1 gap-x-3 gap-y-0 md:grid-cols-2">
    <FieldView label="Descripción" value={r.descripcionMaterial || r.itemizadoBeck} />
    <FieldView
      label="Fecha ejecucion sello"
      value={r.fechaEjecucion ? dayjs(r.fechaEjecucion).format("DD-MM-YYYY") : "-"}
    />
    <FieldView label="Día" value={r.dia} />
    <FieldView label="Piso" value={r.piso} />
    <FieldView label="Eje Alfabético" value={r.ejeAlfabetico} />
    <FieldView label="Eje Numérico" value={r.ejeNumerico} />
    <FieldView label="Nombre sellador" value={r.nombreSellador} />
    <FieldView label="Recinto" value={r.recinto} />
    <FieldView
      label="Longitud (m)"
      value={r.metrosLineales != null ? `${Number(r.metrosLineales).toFixed(2)} m` : "-"}
    />
    <FieldView label="Observaciones" value={r.observaciones} span={2} />
    <FieldView label="FOLIO" value={r.numeroSello} />
    <div className="mb-3">
      <p className="mb-1 text-[11px] text-slate-500">Estado</p>
      <Tag color={getEstadoColor(r.estado)}>{getEstadoLabel(r.estado)}</Tag>
    </div>
  </div>
);

const renderDetalleSelloCortafuego = (r: RegistroSello): React.ReactNode => (
  <div className="grid grid-cols-1 gap-x-3 gap-y-0 md:grid-cols-2">
    <FieldView label="Codigo BECK" value={r.codigo} />
    <FieldView label="Itemizado BECK" value={r.itemizadoBeck} />
    <FieldView label="Itemizado SACYR" value={r.itemizadoSacyr} span={2} />
    <FieldView
      label="Fecha ejecucion sello"
      value={r.fechaEjecucion ? dayjs(r.fechaEjecucion).format("DD-MM-YYYY") : "-"}
    />
    <FieldView label="Día" value={r.dia} />
    <FieldView label="Piso" value={r.piso} />
    <FieldView label="Eje Alfabético" value={r.ejeAlfabetico} />
    <FieldView label="Eje Numérico" value={r.ejeNumerico} />
    <FieldView label="Nombre sellador" value={r.nombreSellador} />
    <FieldView label="Recinto" value={r.recinto} />
    <FieldView label="N° DEL SELLO" value={r.numeroSello} />
    <FieldView
      label="Cantidad de Sellos"
      value={r.cantidadSellos != null ? String(r.cantidadSellos) : "-"}
    />
    <FieldView
      label="Holgura (cm)"
      value={r.holguraCm != null ? String(r.holguraCm) : "-"}
    />
    <FieldView label="Factor por holguras" value={r.factorPorHolguras ?? r.factorHolgura ?? "-"} />
    <FieldView label="Cielo modular" value={r.cieloModular ?? "-"} />
    <FieldView label="Cantidad sellos con factores" value={r.cantidadSellosConFactores ?? r.cantidadSellosConFactor ?? "-"} />
    <FieldView label="AislaciÃ³n" value={r.aislacion ?? "-"} />
    <FieldView label="Cantidad sellos aislaciÃ³n" value={r.cantidadSellosAislacion ?? "-"} />
    <FieldView label="ReparaciÃ³n tabique" value={r.reparacionTabique ?? "-"} />
    <FieldView label="Cantidad final" value={r.cantidadFinal ?? "-"} />
    <FieldView label="Observaciones" value={r.observaciones} span={2} />
    <FieldView label="FOLIO" value={r.numeroSello} />
    <div className="mb-3">
      <p className="mb-1 text-[11px] text-slate-500">Estado</p>
      <Tag color={getEstadoColor(r.estado)}>{getEstadoLabel(r.estado)}</Tag>
    </div>
  </div>
);

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
  itemizadosMandante = [],
  camposConfigurados = [],
}) => {
  const [form] = Form.useForm<RegistroDetalleUpdateValues>();
  const visible = open && !!registro;
  const canEditRegistro = canEdit && mode === "edit";

  const esEspuma = registro?.tipoRegistro === "junta_lineal_espuma";
  const showCampo = (key: string) => isCampoVisible(camposConfigurados, key);

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
      metrosLineales: registro.metrosLineales ?? 0,
      nombreSellador: registro.nombreSellador,
      holguraCm: registro.holguraCm,
      accesibilidad: registro.accesibilidad ?? registro.cieloModular,
      factorPorHolguras: registro.factorPorHolguras != null ? Number(registro.factorPorHolguras) : undefined,
      cieloModular: registro.cieloModular,
      cantidadSellosConFactores: registro.cantidadSellosConFactores != null ? Number(registro.cantidadSellosConFactores) : undefined,
      aislacion: registro.aislacion != null ? Number(registro.aislacion) : undefined,
      cantidadSellosAislacion: registro.cantidadSellosAislacion != null ? Number(registro.cantidadSellosAislacion) : undefined,
      reparacionTabique: registro.reparacionTabique != null ? Number(registro.reparacionTabique) : undefined,
      cantidadFinal: registro.cantidadFinal != null ? Number(registro.cantidadFinal) : undefined,
      observaciones: registro.observaciones ?? "",
      estado: normalizeEstado(registro.estado),
      itemizadoMandanteId: registro.itemizadoMandanteId,
      codigoBeck: registro.codigoBeck,
    });
  }, [form, registro]);

  if (!registro) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        title="Detalle de registro"
      >
        <p className="text-sm text-slate-500">Sin datos para mostrar.</p>
      </Modal>
    );
  }

  const fecha = dayjs(registro.fechaEjecucion).format("DD-MM-YYYY");

  const fotos = getFotosRegistro(registro);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="min(760px, 95vw)"
      centered
      title={null}
      className="registro-detalle-modal"
      styles={{
        header: { display: "none" },
        body: { padding: 0, backgroundColor: "#ffffff", maxHeight: "85vh", overflowY: "auto" },
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <Tag
            className={`mb-1 rounded-full px-3 py-0.5 text-[11px] font-semibold ${getTipoBadgeClass(
              registro.tipoRegistro
            )}`}
            color={getTipoColor(registro.tipoRegistro)}
            style={{ marginInlineEnd: 0 }}
          >
            {getTipoLabel(registro.tipoRegistro)}
          </Tag>
          <h2 className="mt-1 text-sm font-semibold text-slate-900">
            {registro.numeroSello
              ? `Sello ${registro.numeroSello} · `
              : ""}
            {registro.itemizadoBeck}
          </h2>
          {registro.itemizadoSacyr && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              SACYR: <span className="font-medium text-slate-700">{registro.itemizadoSacyr}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {esEspuma ? (
            <div className="flex items-center gap-1 text-sky-600">
              <span>{registro.metrosLineales?.toFixed(2) ?? "0"} m</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-orange-700">
              <FireOutlined />
              <span>{registro.cantidadSellos} sellos</span>
            </div>
          )}
          <Tag color={getEstadoColor(registro.estado)} className="m-0 text-[11px]">
            {getEstadoLabel(registro.estado)}
          </Tag>
        </div>
      </div>

      <div className="space-y-4 bg-white p-5 text-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr,1.2fr]">
          {/* Fotos */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {fotos.length > 0 ? (
              <Image.PreviewGroup
                items={fotos.map((url) => ({ src: url }))}
              >
                {/* Main image */}
                <div className="relative">
                  <Image
                    src={fotos[0]}
                    alt="Foto registro"
                    preview={{ src: fotos[0] }}
                    style={{
                      height: fotos.length > 1 ? 172 : 224,
                      width: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    wrapperStyle={{ display: "block" }}
                  />
                  {fotos.length > 1 && (
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      1 / {fotos.length}
                    </span>
                  )}
                </div>
                {/* Thumbnail strip */}
                {fotos.length > 1 && (
                  <div className="flex gap-1 overflow-x-auto border-t border-slate-200 bg-white p-1.5">
                    {fotos.slice(1).map((url, i) => (
                      <Image
                        key={i}
                        src={url}
                        alt={`Foto ${i + 2}`}
                        preview={{ src: url }}
                        width={64}
                        height={48}
                        style={{ objectFit: "cover", flexShrink: 0, display: "block" }}
                        wrapperStyle={{
                          flexShrink: 0,
                          borderRadius: 4,
                          overflow: "hidden",
                          cursor: "zoom-in",
                        }}
                      />
                    ))}
                  </div>
                )}
              </Image.PreviewGroup>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-xs text-slate-500">
                <CameraOutlined className="mb-1 text-lg" />
                Sin fotos
              </div>
            )}
          </div>

          {/* Info básica */}
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

            {canEditRegistro && (
              <>
                <Divider className="my-2 border-slate-200" />
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {esEspuma ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-slate-500">Longitud ejecutada (m)</p>
                      <p className="text-base font-semibold text-sky-600">
                        {registro.metrosLineales?.toFixed(2) ?? "—"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-slate-500">Cantidad de sellos</p>
                      <p className="text-base font-semibold text-slate-900">
                        {registro.cantidadSellos}
                      </p>
                    </div>
                  )}
                  {!esEspuma && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-slate-500">Sellos ponderados</p>
                      <p className="text-base font-semibold text-emerald-600">
                        {registro.cantidadSellosConFactor.toFixed(1)}
                      </p>
                    </div>
                  )}
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
              </>
            )}
          </div>
        </div>

        <Divider className="my-2 border-slate-200" />

        {canEditRegistro ? (
          <Form
            form={form}
            layout="vertical"
            disabled={false}
            onFinish={(values) => {
              void onSave?.(values);
            }}
            className="grid grid-cols-1 gap-x-3 md:grid-cols-2"
          >
            <Form.Item
              name="itemizadoMandanteId"
              label="Itemizado Mandante"
              className="mb-3"
            >
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
                    descripcionMaterial: item?.nombre ?? form.getFieldValue("descripcionMaterial"),
                  });
                }}
              />
            </Form.Item>
            <Form.Item name="codigoBeck" label="Código BECK" className="mb-3">
              <Input disabled />
            </Form.Item>
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
            {!esEspuma && (
              <Form.Item name="numeroSello" label="N° sello" className="mb-3">
                <Input />
              </Form.Item>
            )}
            {esEspuma ? (
              <Form.Item name="metrosLineales" label="Longitud ejecutada (m)" className="mb-3">
                <InputNumber min={0} step={0.1} className="w-full" />
              </Form.Item>
            ) : (
              <Form.Item name="cantidadSellos" label="Cantidad sellos" className="mb-3">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            )}
            <Form.Item
              name="nombreSellador"
              label={esEspuma ? "Cuadrilla" : "Nombre sellador"}
              className="mb-3"
            >
              <Input />
            </Form.Item>
            <Form.Item name="holguraCm" label="Holgura (cm)" className="mb-3">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="accesibilidad" label="Accesibilidad" className="mb-3">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            {showCampo("factor_por_holguras") && (
              <Form.Item name="factorPorHolguras" label="Factor por holguras" className="mb-3">
                <InputNumber min={0} step={0.01} className="w-full" />
              </Form.Item>
            )}
            {showCampo("cielo_modular") && (
              <Form.Item name="cieloModular" label="Cielo modular" className="mb-3">
                <InputNumber min={0} step={0.01} className="w-full" />
              </Form.Item>
            )}
            {showCampo("cantidad_sellos_con_factores") && (
              <Form.Item name="cantidadSellosConFactores" label="Cantidad sellos con factores" className="mb-3">
                <InputNumber min={0} step={0.01} className="w-full" />
              </Form.Item>
            )}
            {showCampo("aislacion") && (
              <Form.Item name="aislacion" label="AislaciÃ³n" className="mb-3">
                <InputNumber min={0} step={0.01} className="w-full" />
              </Form.Item>
            )}
            {showCampo("cantidad_sellos_aislacion") && (
              <Form.Item name="cantidadSellosAislacion" label="Cantidad sellos aislaciÃ³n" className="mb-3">
                <InputNumber min={0} step={0.01} className="w-full" />
              </Form.Item>
            )}
            {showCampo("reparacion_tabique") && (
              <Form.Item name="reparacionTabique" label="ReparaciÃ³n tabique" className="mb-3">
                <InputNumber min={0} step={0.01} className="w-full" />
              </Form.Item>
            )}
            {showCampo("cantidad_final") && (
              <Form.Item name="cantidadFinal" label="Cantidad final" className="mb-3">
                <InputNumber min={0} step={0.01} className="w-full" />
              </Form.Item>
            )}
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
        ) : registro.tipoRegistro === "junta_lineal_espuma" ? (
          renderDetalleJuntaLineal(registro)
        ) : (
          renderDetalleSelloCortafuego(registro)
        )}

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
