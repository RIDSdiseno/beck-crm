import React, { useEffect } from "react";
import { Alert, Button, Divider, Form, Image, Input, InputNumber, Modal, Select, Tag, Tooltip } from "antd";
import {
  CameraOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  FireOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { RegistroSello } from "../types/registroSello";
import type { CampoConfiguracionRegistro, ItemizadoMandante } from "../services/api";
import {
  getTipoRegistroLabel,
  getTipoRegistroColor,
  getTipoRegistroBadgeClass,
  getCantidadLabelPorTipo,
} from "../constants/roles";

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
  onReenviarRevision?: (registro: RegistroSello) => void | Promise<void>;
  reenviarRevisionLoading?: boolean;
  showEnRevisionAlert?: boolean;
  itemizadosMandante?: ItemizadoMandante[];
  camposConfigurados?: CampoConfiguracionRegistro[];
  rendimientoSellosEsperadoDiario?: number | null;
  rendimientoReparacionEsperadoDiario?: number | null;
  showRendimientoSellos?: boolean;
  showRendimientoIndividual?: boolean;
};

const estadoOptions = [
  { label: "Pendiente", value: "pendiente" },
  { label: "En revisión", value: "en_revision" },
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

const renderDetalleJuntaLineal = (
  r: RegistroSello,
  showCampo: (key: string) => boolean = () => true
): React.ReactNode => (
  <div className="grid grid-cols-1 gap-x-3 gap-y-0 md:grid-cols-2">
    <FieldView label="Descripción" value={r.descripcionMaterial || r.itemizadoBeck} />
    <FieldView
      label="Fecha ejecucion sello"
      value={r.fechaEjecucion ? dayjs(r.fechaEjecucion).format("DD-MM-YYYY") : "-"}
    />
    <FieldView label="Día" value={r.dia} />
    <FieldView label="Piso" value={r.piso} />
    {showCampo("eje_alfabetico") && <FieldView label="Eje Alfabético" value={r.ejeAlfabetico} />}
    {showCampo("eje_numerico") && <FieldView label="Eje Numérico" value={r.ejeNumerico} />}
    <FieldView label="Nombre sellador" value={r.nombreSellador} />
    {(showCampo("recinto") || showCampo("modulo")) && <FieldView label="Recinto" value={r.recinto} />}
    <FieldView
      label="Longitud (m)"
      value={r.metrosLineales != null ? `${Number(r.metrosLineales).toFixed(2)} m` : "-"}
    />
    <FieldView label="Observaciones" value={r.observaciones} span={2} />
    {showCampo("folio") && <FieldView label="FOLIO" value={r.numeroSello} />}
    <div className="mb-3">
      <p className="mb-1 text-[11px] text-slate-500">Estado</p>
      <Tag color={getEstadoColor(r.estado)}>{getEstadoLabel(r.estado)}</Tag>
    </div>
  </div>
);

const renderDetalleSelloCortafuego = (
  r: RegistroSello,
  showCampo: (key: string) => boolean = () => true
): React.ReactNode => (
  <div className="space-y-3">
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
      {showCampo("eje_alfabetico") && <FieldView label="Eje Alfabético" value={r.ejeAlfabetico} />}
      {showCampo("eje_numerico") && <FieldView label="Eje Numérico" value={r.ejeNumerico} />}
      <FieldView label="Nombre sellador" value={r.nombreSellador} />
      {(showCampo("recinto") || showCampo("modulo")) && <FieldView label="Recinto" value={r.recinto} />}
      <FieldView label="N° DEL SELLO" value={r.numeroSello} />
      <FieldView
        label={getCantidadLabelPorTipo(r.tipoRegistro)}
        value={r.cantidadSellos != null ? String(r.cantidadSellos) : "-"}
      />
      {showCampo("holgura") && (
        <FieldView label="Holgura (cm)" value={r.holguraCm != null ? String(r.holguraCm) : "-"} />
      )}
      {showCampo("accesibilidad") && (
        <FieldView label="Accesibilidad" value={r.accesibilidad ?? r.cieloModular ?? "-"} />
      )}
      {showCampo("aislacion") && (
        <FieldView
          label="Aislación"
          value={
            Number(r.aislacion) === 1.3
              ? "APLICA (F = 1.3)"
              : Number(r.aislacion) === 1
              ? "NO APLICA (F = 1)"
              : r.aislacion != null
              ? String(r.aislacion)
              : "-"
          }
        />
      )}
      {showCampo("reparacion_tabique") && (
        <FieldView
          label="Reparación tabique"
          value={
            Number(r.reparacionTabique) === 1
              ? "APLICA (+1 sello)"
              : Number(r.reparacionTabique) === 0
              ? "NO APLICA"
              : r.reparacionTabique != null
              ? String(r.reparacionTabique)
              : "-"
          }
        />
      )}
      <FieldView label="Observaciones" value={r.observaciones} span={2} />
      {showCampo("folio") && <FieldView label="FOLIO" value={r.numeroSello} />}
      <div className="mb-3">
        <p className="mb-1 text-[11px] text-slate-500">Estado</p>
        <Tag color={getEstadoColor(r.estado)}>{getEstadoLabel(r.estado)}</Tag>
      </div>
    </div>

    {/* Cálculo automático — valores calculados por el servidor */}
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
        Cálculo automático
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {showCampo("factor_por_holguras") && (
          <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
            <p className="text-[10px] text-slate-500">Factor por holguras</p>
            <p className="text-sm font-bold text-sky-700">
              {r.factorPorHolguras != null
                ? `F = ${r.factorPorHolguras}`
                : r.factorHolgura != null
                ? `F = ${r.factorHolgura}`
                : "—"}
            </p>
          </div>
        )}
        {showCampo("cantidad_sellos_con_factores") && (
          <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
            <p className="text-[10px] text-slate-500">Cantidad con factores</p>
            <p className="text-sm font-bold text-sky-700">
              {r.cantidadSellosConFactores != null
                ? Number(r.cantidadSellosConFactores).toFixed(2)
                : r.cantidadSellosConFactor != null
                ? Number(r.cantidadSellosConFactor).toFixed(2)
                : "—"}
            </p>
          </div>
        )}
        {showCampo("cantidad_sellos_aislacion") && (
          <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
            <p className="text-[10px] text-slate-500">Cantidad aislación</p>
            <p className="text-sm font-bold text-sky-700">
              {r.cantidadSellosAislacion != null
                ? Number(r.cantidadSellosAislacion).toFixed(2)
                : "—"}
            </p>
          </div>
        )}
        {showCampo("cantidad_final") && (
          <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
            <p className="text-[10px] text-slate-500">Cantidad final</p>
            <p className="text-sm font-bold text-emerald-600">
              {r.cantidadFinal != null ? Number(r.cantidadFinal).toFixed(2) : "—"}
            </p>
          </div>
        )}
      </div>
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
  onReenviarRevision,
  reenviarRevisionLoading = false,
  showEnRevisionAlert = false,
  itemizadosMandante = [],
  camposConfigurados = [],
  rendimientoSellosEsperadoDiario,
  rendimientoReparacionEsperadoDiario,
  showRendimientoSellos = false,
  showRendimientoIndividual = false,
}) => {
  const [form] = Form.useForm<RegistroDetalleUpdateValues>();
  const visible = open && !!registro;
  const canEditRegistro = canEdit && mode === "edit";

  const esEspuma = registro?.tipoRegistro === "junta_lineal_espuma";
  const showCampo = (key: string) => isCampoVisible(camposConfigurados, key);
  const canReenviar =
    registro?.esCorreccion === true || registro?.estado === "devuelto_a_tecnico";

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
      closable={false}
      className="registro-detalle-modal"
      styles={{
        body: { padding: 0, backgroundColor: "#ffffff", maxHeight: "85vh", overflowY: "auto" },
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag
              className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${getTipoRegistroBadgeClass(
                registro.tipoRegistro
              )}`}
              color={getTipoRegistroColor(registro.tipoRegistro)}
              style={{ marginInlineEnd: 0 }}
            >
              {getTipoRegistroLabel(registro.tipoRegistro)}
            </Tag>
            {registro.esCorreccion && (
              <Tag
                color="orange"
                className="rounded-full px-3 py-0.5 text-[11px] font-semibold border border-orange-300 bg-orange-50 text-orange-700"
                style={{ marginInlineEnd: 0 }}
              >
                CORRECCIÓN
              </Tag>
            )}
          </div>
          <h2 className="mt-1 text-sm font-semibold text-slate-900">
            {registro.numeroSello
              ? `Sello ${registro.numeroSello} · `
              : ""}
            {registro.itemizadoBeck}
          </h2>
          {registro.registroOrigen && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Corrección del registro:{" "}
              <span className="font-medium text-slate-700">
                #{String(registro.registroOrigen.id).slice(0, 8)}
              </span>
            </p>
          )}
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
              <span>
                {registro.cantidadSellos}
                {registro.tipoRegistro === "sello_cortafuego" || !registro.tipoRegistro ? " sellos" : ""}
              </span>
            </div>
          )}
          <Tag color={getEstadoColor(registro.estado)} className="m-0 text-[11px]">
            {getEstadoLabel(registro.estado)}
          </Tag>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseOutlined className="text-[13px]" />
          </button>
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

            {showRendimientoSellos && (
              <>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-[13px] text-orange-700">◎</span>
                  <span>
                    Rendimiento Sellos Esperado diario:{" "}
                    <b>
                      {rendimientoSellosEsperadoDiario != null
                        ? `${rendimientoSellosEsperadoDiario} sellos/día`
                        : "Sin definir"}
                    </b>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-[13px] text-orange-700">◎</span>
                  <span>
                    Rendimiento Reparación Esperado diario:{" "}
                    <b>
                      {rendimientoReparacionEsperadoDiario != null
                        ? `${rendimientoReparacionEsperadoDiario} reparaciones/día`
                        : "Sin definir"}
                    </b>
                  </span>
                </div>
              </>
            )}

            {showRendimientoIndividual && (
              <div className="mt-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px]">
                <p className="mb-1 font-semibold uppercase tracking-wide text-indigo-700">
                  Rendimiento individual ejecutado
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Cantidad ejecutada: </span>
                    <b className="text-indigo-700">
                      {registro.cantidadEjecutada != null
                        ? Number(registro.cantidadEjecutada).toFixed(2)
                        : "Sin calcular"}
                    </b>
                  </div>
                  <div>
                    <span className="text-slate-500">Rendimiento individual: </span>
                    <b className="text-indigo-700">
                      {registro.rendimientoIndividualPct != null
                        ? `${Number(registro.rendimientoIndividualPct).toFixed(2)}%`
                        : "Sin calcular"}
                    </b>
                  </div>
                </div>
              </div>
            )}

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
                      <p className="text-slate-500">{getCantidadLabelPorTipo(registro.tipoRegistro)}</p>
                      <p className="text-base font-semibold text-slate-900">
                        {registro.cantidadSellos}
                      </p>
                    </div>
                  )}
                  {!esEspuma && (!registro.tipoRegistro || registro.tipoRegistro === "sello_cortafuego") && (
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

        {registro.esCorreccion && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Este registro corresponde a una corrección solicitada por Ingeniería."
            description={
              registro.registroOrigen?.motivoRechazo
                ? `Motivo de rechazo original: ${registro.registroOrigen.motivoRechazo}`
                : undefined
            }
            className="mb-2"
          />
        )}

        {showEnRevisionAlert && registro.estado === "en_revision" && (
          <Alert
            type="info"
            showIcon
            message="Registro en revisión por Ingeniería."
            className="mb-2"
          />
        )}

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
            {(showCampo("modulo") || showCampo("recinto")) && (
            <Form.Item name="modulo" label="Módulo" className="mb-3">
              <Input />
            </Form.Item>
            )}
            <Form.Item name="piso" label="Piso" className="mb-3">
              <Input />
            </Form.Item>
            {showCampo("eje_numerico") && (
            <Form.Item name="ejeNumerico" label="Eje numérico" className="mb-3">
              <Input />
            </Form.Item>
            )}
            {showCampo("eje_alfabetico") && (
            <Form.Item name="ejeAlfabetico" label="Eje alfabético" className="mb-3">
              <Input />
            </Form.Item>
            )}
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
              <Form.Item name="cantidadSellos" label={getCantidadLabelPorTipo(registro.tipoRegistro)} className="mb-3">
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
            {showCampo("holgura") && (
            <Form.Item name="holguraCm" label="Holgura (cm)" className="mb-3">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            )}
            {showCampo("accesibilidad") && (
            <Form.Item name="accesibilidad" label="Accesibilidad" className="mb-3">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            )}
            {showCampo("aislacion") && (
              <Form.Item name="aislacion" label="Aislación" className="mb-3">
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
              <Form.Item name="reparacionTabique" label="Reparación tabique" className="mb-3">
                <Select
                  placeholder="Seleccione"
                  options={[
                    { value: 0, label: "NO APLICA" },
                    { value: 1, label: "APLICA (+1 sello)" },
                  ]}
                />
              </Form.Item>
            )}
            {/* Cálculo automático — solo lectura, el servidor recalcula al guardar */}
            <div className="mb-3 md:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                Cálculo automático
              </p>
              <p className="mb-2 text-[10px] text-slate-500">
                El servidor recalculará estos valores al guardar los cambios.
              </p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {showCampo("factor_por_holguras") && (
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Factor por holguras</p>
                    <p className="text-sm font-bold text-sky-700">
                      {registro?.factorPorHolguras != null
                        ? `F = ${registro.factorPorHolguras}`
                        : registro?.factorHolgura != null
                        ? `F = ${registro.factorHolgura}`
                        : "—"}
                    </p>
                  </div>
                )}
                {showCampo("cantidad_sellos_con_factores") && (
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Cantidad con factores</p>
                    <p className="text-sm font-bold text-sky-700">
                      {registro?.cantidadSellosConFactores != null
                        ? Number(registro.cantidadSellosConFactores).toFixed(2)
                        : registro?.cantidadSellosConFactor != null
                        ? Number(registro.cantidadSellosConFactor).toFixed(2)
                        : "—"}
                    </p>
                  </div>
                )}
                {showCampo("cantidad_sellos_aislacion") && (
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Cantidad aislación</p>
                    <p className="text-sm font-bold text-sky-700">
                      {registro?.cantidadSellosAislacion != null
                        ? Number(registro.cantidadSellosAislacion).toFixed(2)
                        : "—"}
                    </p>
                  </div>
                )}
                {showCampo("cantidad_final") && (
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="text-[10px] text-slate-500">Cantidad final</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {registro?.cantidadFinal != null
                        ? Number(registro.cantidadFinal).toFixed(2)
                        : "—"}
                    </p>
                  </div>
                )}
              </div>
            </div>
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
          renderDetalleJuntaLineal(registro, showCampo)
        ) : (
          renderDetalleSelloCortafuego(registro, showCampo)
        )}

        {registro.motivoRechazo && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700">
              <WarningOutlined />
              Rechazo
            </h3>
            <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
              <FieldView label="Motivo de rechazo" value={registro.motivoRechazo} span={2} />
              {registro.rechazadoPor && (
                <FieldView label="Rechazado por" value={registro.rechazadoPor.nombre} />
              )}
              {registro.fechaRechazo && (
                <FieldView
                  label="Fecha de rechazo"
                  value={dayjs(registro.fechaRechazo).format("DD-MM-YYYY HH:mm")}
                />
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
          {onDownloadPdf && (
            <Button
              disabled={saving}
              onClick={() => {
                void onDownloadPdf(registro);
              }}
            >
              Descargar PDF
            </Button>
          )}
          {canReenviar && onReenviarRevision && (
            <Tooltip
              title={registro.estado === "en_revision" ? "Ya está en revisión" : undefined}
            >
              <Button
                type="primary"
                loading={reenviarRevisionLoading}
                disabled={saving || registro.estado === "en_revision"}
                onClick={() => void onReenviarRevision(registro)}
              >
                Reenviar a revisión
              </Button>
            </Tooltip>
          )}
          <Button disabled={saving} onClick={onClose}>Cerrar</Button>
          {canEditRegistro && (
            <Button
              type="primary"
              loading={saving}
              disabled={saving}
              onClick={() => form.submit()}
            >
              Guardar cambios
            </Button>
          )}
          {!canEditRegistro && canEdit && (
            <Button disabled={saving} type="primary" onClick={onEdit}>
              Editar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default RegistroDetalleModal;
