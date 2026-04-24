import React, { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Button,
  Descriptions,
  Modal as AntdModal,
  Spin,
  message,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import CierreDeProyecto from "../components/Cierredeproyecto";
import FunnelCalendario from "../components/FunnelCalendario";
import CotizacionEditorModal, {
  type CotizacionEditorValues,
  type LineaCotizacion,
} from "../components/CotizacionEditorModal";
import { useAuth } from "../context/useAuth";
import {
  cotizacionesAPI,
  fetchWithAuth,
  funnelBeckAPI,
  type CotizacionApiRecord,
  type CotizacionUpsertPayload,
} from "../services/api";

import {
  regionesComunasChile,
  type RegionChile,
} from "../data/regionesComunasChile";
import type { ThemeMode } from "../hooks/useSystemTheme";
import type {
  FunnelCurrency,
  FunnelDeal,
  FunnelLeadSource,
  FunnelStage,
} from "../types/funnel";

type FunnelPageProps = {
  themeMode: ThemeMode;
};

type FunnelDraft = {
  nombreProyecto: string;
  empresa: string;
  valorEstimado: string;
  moneda: FunnelCurrency;
  fechaProbableCierre: string;
  vendedor: string;
  region: string;
  comuna: string;
  fuenteLead: FunnelLeadSource | "";
  etapa: FunnelStage;
};

type FunnelFieldErrors = Partial<Record<keyof FunnelDraft, string>>;

type FunnelCotizacionItem = {
  id: string;
  numero: string;
  codigo: string;
  funnelBeckId?: string;
  cliente: string;
  proyecto: string;
  origen: string;
  tipo: string;
  fecha: string;
  vigencia: string;
  estado: string;
  total: number;
  moneda: string;
  responsable: string;
  notas: string;
  descuento: number;
  aplicaImpuesto: boolean;
  subtotal: number;
  impuesto: number;
  lineas: LineaCotizacion[];
};

type FunnelCardProps = {
  deal: FunnelDeal;
  canEditFunnel: boolean;
  onStageChange: (dealId: string, etapa: FunnelStage) => void;
  onViewDetail: (deal: FunnelDeal) => Promise<void> | void;
  onCreateCotizacion: (deal: FunnelDeal) => void;
};

type FunnelColumnProps = {
  etapa: FunnelStage;
  deals: FunnelDeal[];
  canEditFunnel: boolean;
  onStageChange: (dealId: string, etapa: FunnelStage) => void;
  onViewDetail: (deal: FunnelDeal) => Promise<void> | void;
  onCreateCotizacion: (deal: FunnelDeal) => void;
};

type FunnelModalProps = {
  open: boolean;
  mode: "create" | "edit";
  draft: FunnelDraft;
  fieldErrors: FunnelFieldErrors;
  validationMessage: string | null;
  conversionReferencia: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof FunnelDraft, value: string) => void;
};


const etapas: FunnelStage[] = [
  "prospecto",
  "visita",
  "cotizacion",
  "enviada",
  "negociacion",
  "cerrada",
];

const etapasLabel: Record<FunnelStage, string> = {
  prospecto: "Prospecto Identificado",
  visita: "Visita / Levantamiento",
  cotizacion: "Cotizacion Elaborada",
  enviada: "Cotizacion Enviada",
  negociacion: "En Negociacion",
  cerrada: "Cerrada",
};

const leadSourceOptions: FunnelLeadSource[] = [
  "Web",
  "Referido",
  "Llamada",
  "Cliente recurrente",
  "Prospeccion",
  "Otro",
];

const createEmptyDraft = (): FunnelDraft => ({
  nombreProyecto: "",
  empresa: "",
  valorEstimado: "",
  moneda: "CLP",
  fechaProbableCierre: "",
  vendedor: "",
  region: "",
  comuna: "",
  fuenteLead: "",
  etapa: "prospecto",
});

const REQUIRED_FIELDS_MESSAGE = "Rellene los campos obligatorios marcados con *";

const validateFunnelDraft = (draft: FunnelDraft): FunnelFieldErrors => {
  const errors: FunnelFieldErrors = {};
  const nombreProyecto = draft.nombreProyecto.trim();
  const empresa = draft.empresa.trim();
  const valorEstimado = draft.valorEstimado.trim();
  const parsedValorEstimado = valorEstimado
    ? Number(valorEstimado.replace(",", "."))
    : Number.NaN;
  const fechaProbableCierre = draft.fechaProbableCierre.trim();
  const vendedor = draft.vendedor.trim();
  const region = draft.region.trim();
  const comuna = draft.comuna.trim();
  const fuenteLead = draft.fuenteLead.trim();
  const etapa = draft.etapa.trim();
  const selectedRegionData = region
    ? regionesComunasChile.find((item) => item.nombre === region)
    : undefined;

  if (!nombreProyecto) {
    errors.nombreProyecto = "El nombre del proyecto es obligatorio";
  }

  if (!empresa) {
    errors.empresa = "La empresa es obligatoria";
  }

  if (!valorEstimado) {
    errors.valorEstimado = "El valor estimado es obligatorio";
  } else if (
    !Number.isFinite(parsedValorEstimado) ||
    parsedValorEstimado <= 0
  ) {
    errors.valorEstimado = "El valor estimado debe ser mayor a 0";
  }

  if (!fechaProbableCierre) {
    errors.fechaProbableCierre = "La fecha probable de cierre es obligatoria";
  }

  if (!vendedor) {
    errors.vendedor = "El vendedor es obligatorio";
  }

  if (!region) {
    errors.region = "La region es obligatoria";
  }

  if (!comuna) {
    errors.comuna = "La comuna es obligatoria";
  } else if (
    selectedRegionData &&
    !selectedRegionData.comunas.includes(comuna)
  ) {
    errors.comuna = "La comuna no corresponde a la region seleccionada";
  }

  if (!fuenteLead) {
    errors.fuenteLead = "La fuente del lead es obligatoria";
  }

  if (!etapa) {
    errors.etapa = "La etapa inicial es obligatoria";
  }

  return errors;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pickValue = (
  source: Record<string, unknown>,
  keys: string[]
): unknown => {
  for (const key of keys) {
    const value = source[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
};

const toText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return fallback;
};

const normalizeCotizacionEstado = (value: unknown): string => {
  const raw = toText(value, "Sin estado");
  const normalized = raw.toLowerCase();

  if (normalized === "borrador") return "Borrador";
  if (normalized === "enviada" || normalized === "enviado") return "Enviada";
  if (
    normalized === "aceptada" ||
    normalized === "aceptado" ||
    normalized === "aprobada" ||
    normalized === "aprobado"
  ) {
    return "Aceptada";
  }
  if (normalized === "rechazada" || normalized === "rechazado") {
    return "Rechazada";
  }
  if (normalized === "vencida" || normalized === "vencido") {
    return "Vencida";
  }

  return raw;
};

const normalizeMoneda = (value: unknown): "CLP" | "USD" => {
  const moneda = toText(value, "CLP").toUpperCase();
  return moneda === "USD" ? "USD" : "CLP";
};

const normalizeTipoLinea = (value: unknown): "PRODUCTO" | "SERVICIO" => {
  const normalized = toText(value, "PRODUCTO").trim().toUpperCase();
  return normalized === "SERVICIO" ? "SERVICIO" : "PRODUCTO";
};

const normalizeTipoCotizacion = (
  value: string
): CotizacionEditorValues["tipo"] => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized === "interna") return "Interna";
  if (normalized === "servicio") return "Servicio";
  if (normalized === "mantencion") return "Mantencion";
  if (normalized === "otro") return "Otro";

  return "Cliente";
};

const calculateLineSubtotal = (
  cantidad: number,
  precioUnitario: number,
  gananciaPct = 0
) => cantidad * precioUnitario * (1 + gananciaPct / 100);

const calculateCotizacionTotals = (
  lineas: LineaCotizacion[],
  descuento: number,
  aplicaImpuesto: boolean
) => {
  const subtotal = lineas.reduce((acc, linea) => acc + linea.subtotal, 0);
  const descuentoSafe = Number.isFinite(descuento) ? descuento : 0;
  const descuentoPct = Math.min(100, Math.max(0, descuentoSafe));
  const descuentoMonto = subtotal * (descuentoPct / 100);
  const neto = Math.max(0, subtotal - descuentoMonto);
  const impuesto = aplicaImpuesto ? neto * 0.19 : 0;
  const total = neto + impuesto;

  return { subtotal, impuesto, total };
};

const extractCotizacionLineas = (
  source: Record<string, unknown>
): LineaCotizacion[] => {
  const rawLineas = pickValue(source, ["lineas"]);

  if (!Array.isArray(rawLineas)) {
    return [];
  }

  return rawLineas.flatMap((linea, index) => {
    if (!isObjectRecord(linea)) {
      return [];
    }

    const cantidad = Math.max(1, toNumber(pickValue(linea, ["cantidad", "qty"])));
    const precioUnitario = toNumber(
      pickValue(linea, ["precioUnitario", "precio_unitario"])
    );
    const gananciaPct = toNumber(
      pickValue(linea, ["gananciaPct", "ganancia_pct"])
    );
    const subtotal =
      toNumber(pickValue(linea, ["subtotal"])) ||
      calculateLineSubtotal(cantidad, precioUnitario, gananciaPct);

    return [
      {
        tipoLinea: normalizeTipoLinea(
          pickValue(linea, ["tipoLinea", "tipo_linea"])
        ),
        descripcion: toText(
          pickValue(linea, ["descripcion", "detalle"]),
          "Linea cotizacion"
        ),
        cantidad,
        precioUnitario,
        subtotal,
        orden: toNumber(pickValue(linea, ["orden"])) || index + 1,
        gananciaPct,
      },
    ];
  });
};

const extractCotizacionCliente = (source: Record<string, unknown>): string => {
  const direct = pickValue(source, [
    "clienteNombre",
    "cliente_nombre",
    "nombreCliente",
    "cliente",
  ]);

  if (typeof direct === "string" || typeof direct === "number") {
    return toText(direct, "Sin cliente");
  }

  if (isObjectRecord(direct)) {
    return toText(
      pickValue(direct, ["nombre", "razonSocial", "razon_social", "empresa"]),
      "Sin cliente"
    );
  }

  return "Sin cliente";
};

const mapCotizacionRecord = (
  source: CotizacionApiRecord,
  index = 0
): FunnelCotizacionItem => {
  let lineas = extractCotizacionLineas(source);
  const numeroValue = pickValue(source, ["numero", "folio", "correlativo"]);
  const codigo = toText(
    pickValue(source, ["codigo", "codigoCotizacion", "codigo_cotizacion"])
  );
  const fecha = toText(
    pickValue(source, ["fecha", "fechaEmision", "fecha_emision", "createdAt", "created_at"])
  );
  const vigencia = toText(
    pickValue(source, ["vigencia", "fechaVencimiento", "fecha_vencimiento"])
  );
  const descuento = toNumber(pickValue(source, ["descuento"]));
  const aplicaImpuesto = toBoolean(
    pickValue(source, ["aplicaImpuesto", "aplica_impuesto"]),
    true
  );
  const subtotal =
    toNumber(pickValue(source, ["subtotal"])) ||
    lineas.reduce((acc, linea) => acc + linea.subtotal, 0);
  const impuesto = toNumber(pickValue(source, ["impuesto"]));
  const total =
    toNumber(
      pickValue(source, ["total", "total_final", "monto_total", "monto", "totalNeto"])
    ) || calculateCotizacionTotals(lineas, descuento, aplicaImpuesto).total;

  if (!lineas.length && total > 0) {
    lineas = [
      {
        tipoLinea: "PRODUCTO",
        descripcion: toText(
          pickValue(source, [
            "proyecto",
            "nombreProyecto",
            "nombre_proyecto",
            "descripcion",
          ]),
          "Item cotizacion"
        ),
        cantidad: 1,
        precioUnitario: total,
        subtotal: total,
        orden: 1,
        gananciaPct: 0,
      },
    ];
  }

  const proyecto = toText(
    pickValue(source, [
      "proyecto",
      "nombreProyecto",
      "nombre_proyecto",
      "descripcion",
    ]),
    lineas[0]?.descripcion || ""
  );

  return {
    id: toText(source.id),
    numero:
      numeroValue !== undefined ? toText(numeroValue) : codigo || String(index + 1),
    codigo,
    funnelBeckId:
      toText(pickValue(source, ["funnelBeckId", "funnel_beck_id"]), "") ||
      undefined,
    cliente: extractCotizacionCliente(source),
    proyecto,
    origen: toText(pickValue(source, ["origen"]), "Sin origen"),
    tipo: toText(pickValue(source, ["tipo"]), "Sin tipo"),
    fecha,
    vigencia,
    estado: normalizeCotizacionEstado(pickValue(source, ["estado"])),
    total,
    moneda: normalizeMoneda(
      pickValue(source, ["moneda", "moneda_total", "currency"])
    ),
    responsable: toText(
      pickValue(source, ["responsable", "usuarioNombre", "usuario_nombre"])
    ),
    notas: toText(pickValue(source, ["notas", "observaciones"])),
    descuento,
    aplicaImpuesto,
    subtotal,
    impuesto,
    lineas,
  };
};

const formatCotizacionMoney = (value: number, moneda: string): string => {
  const prefix = moneda === "USD" ? "US$" : "$";
  return `${prefix} ${value.toLocaleString("es-CL", {
    maximumFractionDigits: 0,
  })}`;
};

const formatCotizacionDate = (value: string): string => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);
  return date.isValid() ? date.format("DD-MM-YYYY") : value;
};

const toDayjsOrFallback = (value: string, fallback: Dayjs): Dayjs => {
  const date = dayjs(value);
  return date.isValid() ? date : fallback;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const formatEstimatedValue = (
  value: number,
  moneda: FunnelCurrency
): string => {
  if (moneda === "UF") {
    return `UF ${new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  }

  if (moneda === "USD") {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDisplayDate = (value: string): string => {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}-${month}-${year}`;
};

const inputClassName =
  "w-full rounded-xl border border-beck-border-light bg-white px-3 py-2.5 text-sm text-beck-ink-soft outline-none transition focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]";

const disabledInputClassName =
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const inputErrorClassName =
  "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100";


const FunnelCard: React.FC<FunnelCardProps> = ({
  deal,
  canEditFunnel,
  onStageChange,
  onViewDetail,
  onCreateCotizacion,
}) => {
  void canEditFunnel;
  void onStageChange;
  void onCreateCotizacion;

  return (
    <article
      className="group cursor-pointer rounded-lg border border-beck-border-light bg-white p-2 text-xs shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-xl hover:border-yellow-400 hover:z-20"
      onClick={() => onViewDetail(deal)}
    >
      <h4 className="font-semibold leading-tight text-beck-ink">
        {deal.nombreProyecto}
      </h4>

      {typeof deal.valorEstimado === "number" && (
        <p className="mt-1 font-medium text-beck-ink-soft">
          {formatEstimatedValue(deal.valorEstimado, deal.moneda)}
        </p>
      )}

      {deal.fechaProbableCierre && (
        <p className="mt-0.5 text-beck-muted">
          Cierre: {formatDisplayDate(deal.fechaProbableCierre)}
        </p>
      )}

      <p className="mt-1 hidden text-[11px] text-beck-muted group-hover:block">
        Click para ver detalle
      </p>
    </article>
  );
};

const FunnelColumn: React.FC<FunnelColumnProps> = ({
  etapa,
  deals,
  canEditFunnel,
  onStageChange,
  onViewDetail,
  onCreateCotizacion,
}) => (
  <div className="flex min-h-[420px] w-[220px] flex-shrink-0 flex-col rounded-xl border border-[#ece8d8] bg-[#f7f6ef] p-3">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-beck-ink">
        {etapasLabel[etapa]}
      </h3>
      <span className="rounded-full border border-beck-border-light bg-white px-2 py-0.5 text-xs text-beck-ink-soft">
        {deals.length}
      </span>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto pr-1 overflow-visible">
      {deals.length ? (
        deals.map((deal) => (
          <FunnelCard
            key={deal.id}
            deal={deal}
            canEditFunnel={canEditFunnel}
            onStageChange={onStageChange}
            onViewDetail={onViewDetail}
            onCreateCotizacion={onCreateCotizacion}
          />
        ))
      ) : (
        <p className="mt-4 text-center text-xs text-beck-muted">
          Sin oportunidades
        </p>
      )}
    </div>
  </div>
);

const FunnelModal: React.FC<FunnelModalProps> = ({
  open,
  mode,
  draft,
  fieldErrors,
  validationMessage,
  conversionReferencia,
  submitting,
  onClose,
  onSubmit,
  onFieldChange,
}) => {
  if (!open) {
    return null;
  }

  const selectedRegionData: RegionChile | undefined = regionesComunasChile.find(
    (region) => region.nombre === draft.region
  );
  const comunasDisponibles = selectedRegionData?.comunas ?? [];
  const getFieldClassName = (field: keyof FunnelDraft) =>
    `${inputClassName} ${disabledInputClassName} ${
      fieldErrors[field] ? inputErrorClassName : ""
    }`;
  const renderFieldError = (field: keyof FunnelDraft) => {
    const error = fieldErrors[field];

    if (!error) {
      return null;
    }

    return (
      <p
        id={`funnel-${field}-error`}
        className="mt-1.5 text-xs font-medium text-red-600"
      >
        {error}
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-beck-border-light px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#a8860f]">
              Funnel
            </p>
            <h2 className="mt-1 text-lg font-semibold text-beck-ink">
              {mode === "create" ? "Nueva oportunidad" : "Editar oportunidad"}
            </h2>
            <p className="mt-1 text-sm text-beck-muted">
              {mode === "create"
                ? "Completa la informacion para registrar una nueva oportunidad comercial."
                : "Actualiza la informacion de la oportunidad comercial seleccionada."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="beck-btn-secondary rounded-full px-3 py-1.5"
          >
            Cerrar
          </button>
        </div>

        <form noValidate onSubmit={onSubmit} className="space-y-5 px-5 py-5">
          {validationMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
            >
              {validationMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="funnel-nombre-proyecto"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Nombre del proyecto
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id="funnel-nombre-proyecto"
                type="text"
                value={draft.nombreProyecto}
                onChange={(event) =>
                  onFieldChange("nombreProyecto", event.target.value)
                }
                disabled={submitting}
                className={getFieldClassName("nombreProyecto")}
                placeholder="Ingresa el nombre del proyecto"
                aria-invalid={Boolean(fieldErrors.nombreProyecto)}
                aria-describedby={
                  fieldErrors.nombreProyecto
                    ? "funnel-nombreProyecto-error"
                    : undefined
                }
              />
              {renderFieldError("nombreProyecto")}
            </div>

            <div>
              <label
                htmlFor="funnel-empresa"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Empresa
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id="funnel-empresa"
                type="text"
                value={draft.empresa}
                onChange={(event) => onFieldChange("empresa", event.target.value)}
                disabled={submitting}
                className={getFieldClassName("empresa")}
                placeholder="Nombre de la empresa"
                aria-invalid={Boolean(fieldErrors.empresa)}
                aria-describedby={
                  fieldErrors.empresa ? "funnel-empresa-error" : undefined
                }
              />
              {renderFieldError("empresa")}
            </div>

            <div>
              <label
                htmlFor="funnel-valor-estimado"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Valor estimado
                <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="grid grid-cols-[minmax(0,1fr),96px] gap-2">
                <input
                  id="funnel-valor-estimado"
                  type="number"
                  min="0"
                  value={draft.valorEstimado}
                  onChange={(event) =>
                    onFieldChange("valorEstimado", event.target.value)
                  }
                  disabled={submitting}
                  className={getFieldClassName("valorEstimado")}
                  placeholder="Ej: 1500000"
                  aria-invalid={Boolean(fieldErrors.valorEstimado)}
                  aria-describedby={
                    fieldErrors.valorEstimado
                      ? "funnel-valorEstimado-error"
                      : undefined
                  }
                />
                <select
                  value={draft.moneda}
                  onChange={(event) => onFieldChange("moneda", event.target.value)}
                  disabled={submitting}
                  className={`${inputClassName} ${disabledInputClassName}`}
                >
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              {renderFieldError("valorEstimado")}
              {conversionReferencia && (
                <p className="mt-1.5 text-xs text-slate-500">
                  {conversionReferencia}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="funnel-fecha-cierre"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Fecha probable de cierre
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id="funnel-fecha-cierre"
                type="date"
                value={draft.fechaProbableCierre}
                onChange={(event) =>
                  onFieldChange("fechaProbableCierre", event.target.value)
                }
                disabled={submitting}
                className={getFieldClassName("fechaProbableCierre")}
                aria-invalid={Boolean(fieldErrors.fechaProbableCierre)}
                aria-describedby={
                  fieldErrors.fechaProbableCierre
                    ? "funnel-fechaProbableCierre-error"
                    : undefined
                }
              />
              {renderFieldError("fechaProbableCierre")}
            </div>

            <div>
              <label
                htmlFor="funnel-vendedor"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Vendedor
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id="funnel-vendedor"
                type="text"
                value={draft.vendedor}
                onChange={(event) => onFieldChange("vendedor", event.target.value)}
                disabled={submitting}
                className={getFieldClassName("vendedor")}
                placeholder="Responsable comercial"
                aria-invalid={Boolean(fieldErrors.vendedor)}
                aria-describedby={
                  fieldErrors.vendedor ? "funnel-vendedor-error" : undefined
                }
              />
              {renderFieldError("vendedor")}
            </div>

            <div>
              <label
                htmlFor="funnel-region"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Region
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                id="funnel-region"
                value={draft.region}
                onChange={(event) => onFieldChange("region", event.target.value)}
                disabled={submitting}
                className={getFieldClassName("region")}
                aria-invalid={Boolean(fieldErrors.region)}
                aria-describedby={
                  fieldErrors.region ? "funnel-region-error" : undefined
                }
              >
                <option value="">Selecciona una region</option>
                {regionesComunasChile.map((region) => (
                  <option key={region.nombre} value={region.nombre}>
                    {region.nombre}
                  </option>
                ))}
              </select>
              {renderFieldError("region")}
            </div>

            <div>
              <label
                htmlFor="funnel-comuna"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Comuna
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                id="funnel-comuna"
                value={draft.comuna}
                onChange={(event) => onFieldChange("comuna", event.target.value)}
                className={getFieldClassName("comuna")}
                disabled={submitting || !draft.region}
                aria-invalid={Boolean(fieldErrors.comuna)}
                aria-describedby={
                  fieldErrors.comuna ? "funnel-comuna-error" : undefined
                }
              >
                <option value="">
                  {draft.region
                    ? "Selecciona una comuna"
                    : "Primero selecciona una region"}
                </option>
                {comunasDisponibles.map((comuna) => (
                  <option key={comuna} value={comuna}>
                    {comuna}
                  </option>
                ))}
              </select>
              {renderFieldError("comuna")}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="funnel-fuente-lead"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Fuente del lead
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                id="funnel-fuente-lead"
                value={draft.fuenteLead}
                onChange={(event) =>
                  onFieldChange("fuenteLead", event.target.value)
                }
                disabled={submitting}
                className={getFieldClassName("fuenteLead")}
                aria-invalid={Boolean(fieldErrors.fuenteLead)}
                aria-describedby={
                  fieldErrors.fuenteLead
                    ? "funnel-fuenteLead-error"
                    : undefined
                }
              >
                <option value="">Selecciona una fuente</option>
                {leadSourceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {renderFieldError("fuenteLead")}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="funnel-etapa"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Etapa inicial
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                id="funnel-etapa"
                value={draft.etapa}
                onChange={(event) => onFieldChange("etapa", event.target.value)}
                disabled={submitting}
                className={getFieldClassName("etapa")}
                aria-invalid={Boolean(fieldErrors.etapa)}
                aria-describedby={
                  fieldErrors.etapa ? "funnel-etapa-error" : undefined
                }
              >
                {etapas.map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {etapasLabel[etapa]}
                  </option>
                ))}
              </select>
              {renderFieldError("etapa")}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-beck-border-light pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="beck-btn-secondary"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="beck-btn-primary"
            >
              {submitting
                ? mode === "create"
                  ? "Creando..."
                  : "Guardando..."
                : mode === "create"
                  ? "Crear oportunidad"
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FunnelPage: React.FC<FunnelPageProps> = ({ themeMode }) => {
  void themeMode;

  const { user } = useAuth();
  const canEditFunnel =
    user?.rol === "Administrador" ||
    user?.rol === "Vendedor" ||
    user?.rol === "Terreno" ||
    user?.rol === "Ingenieria";

  const [deals, setDeals] = useState<FunnelDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "calendar">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [funnelModalMode, setFunnelModalMode] = useState<"create" | "edit">("create");
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealSaving, setDealSaving] = useState(false);
  const [dealDeletingId, setDealDeletingId] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const [draft, setDraft] = useState<FunnelDraft>(createEmptyDraft);
  const [fieldErrors, setFieldErrors] = useState<FunnelFieldErrors>({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [dealEnCierre, setDealEnCierre] = useState<string | null>(null);
  const [estadoCierreModal, setEstadoCierreModal] = useState<
    "ganada" | "perdida" | ""
  >("");
  const [motivoPerdidaModal, setMotivoPerdidaModal] = useState("");
  const [ufActual, setUfActual] = useState<number | null>(null);
  const [dolarActual, setDolarActual] = useState<number | null>(null);
  const [ufFecha, setUfFecha] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<FunnelDeal | null>(null);
  const [relatedCotizaciones, setRelatedCotizaciones] = useState<
    FunnelCotizacionItem[]
  >([]);
  const [relatedCotizacionesLoading, setRelatedCotizacionesLoading] =
    useState(false);
  const [selectedCotizacion, setSelectedCotizacion] =
    useState<FunnelCotizacionItem | null>(null);
  const [selectedCotizacionLoading, setSelectedCotizacionLoading] =
    useState(false);
  const [cotizacionEditorOpen, setCotizacionEditorOpen] = useState(false);
  const [cotizacionEditorMode, setCotizacionEditorMode] = useState<
    "create" | "edit"
  >("create");
  const [editingCotizacion, setEditingCotizacion] =
    useState<FunnelCotizacionItem | null>(null);
  const [cotizacionSaving, setCotizacionSaving] = useState(false);
  const [cotizacionEditorLockedFunnel, setCotizacionEditorLockedFunnel] =
    useState(false);
  const [cotizacionEditorContextDeal, setCotizacionEditorContextDeal] =
    useState<FunnelDeal | null>(null);
  const [cotizacionEditorLoading, setCotizacionEditorLoading] = useState(false);

  void ufFecha;

  const parsedDraftValue = draft.valorEstimado.trim()
    ? Number(draft.valorEstimado)
    : undefined;

  const conversionReferencia =
    typeof parsedDraftValue === "number" &&
    Number.isFinite(parsedDraftValue) &&
    parsedDraftValue > 0
      ? (() => {
          const referencias: string[] = [];

          const tieneUf =
            typeof ufActual === "number" &&
            Number.isFinite(ufActual) &&
            ufActual > 0;

          const tieneDolar =
            typeof dolarActual === "number" &&
            Number.isFinite(dolarActual) &&
            dolarActual > 0;

          if (draft.moneda === "CLP") {
            if (tieneUf) {
              referencias.push(
                `Equivale a ${formatEstimatedValue(
                  parsedDraftValue / ufActual,
                  "UF"
                )}`
              );
            }

            if (tieneDolar) {
              referencias.push(
                `Equivale a ${formatEstimatedValue(
                  parsedDraftValue / dolarActual,
                  "USD"
                )}`
              );
            }
          }

          if (draft.moneda === "UF" && tieneUf) {
            const valorClp = parsedDraftValue * ufActual;

            referencias.push(
              `Equivale a ${formatEstimatedValue(valorClp, "CLP")}`
            );

            if (tieneDolar) {
              referencias.push(
                `Equivale a ${formatEstimatedValue(
                  valorClp / dolarActual,
                  "USD"
                )}`
              );
            }
          }

          if (draft.moneda === "USD" && tieneDolar) {
            const valorClp = parsedDraftValue * dolarActual;

            referencias.push(
              `Equivale a ${formatEstimatedValue(valorClp, "CLP")}`
            );

            if (tieneUf) {
              referencias.push(
                `Equivale a ${formatEstimatedValue(
                  valorClp / ufActual,
                  "UF"
                )}`
              );
            }
          }

          return referencias.length > 0 ? referencias.join(" | ") : null;
        })()
      : null;

  useEffect(() => {
    if (!showValidationSummary) {
      return;
    }

    setFieldErrors(validateFunnelDraft(draft));
  }, [draft, showValidationSummary]);

  const etapaBackendMap: Record<string, FunnelStage> = {
    prospecto_identificado: "prospecto",
    visita_levantamiento: "visita",
    cotizacion_elaborada: "cotizacion",
    cotizacion_enviada: "enviada",
    en_negociacion: "negociacion",
    cerrada: "cerrada",
  };

  const etapaFrontendToBackendMap: Record<FunnelStage, string> = {
    prospecto: "prospecto_identificado",
    visita: "visita_levantamiento",
    cotizacion: "cotizacion_elaborada",
    enviada: "cotizacion_enviada",
    negociacion: "en_negociacion",
    cerrada: "cerrada",
  };

  const fuenteLeadFrontendToBackendMap: Record<FunnelLeadSource, string> = {
    Web: "web",
    Referido: "referido",
    Llamada: "llamada",
    "Cliente recurrente": "cliente_recurrente",
    Prospeccion: "prospeccion",
    Otro: "otro",
  };

  const fuenteLeadBackendToFrontendMap: Record<string, FunnelLeadSource> = {
    web: "Web",
    referido: "Referido",
    llamada: "Llamada",
    cliente_recurrente: "Cliente recurrente",
    prospeccion: "Prospeccion",
    otro: "Otro",
  };

  const mapOpportunityToDeal = (item: Record<string, unknown>): FunnelDeal => {
    const monedaOriginalValue = toText(item.monedaOriginal, "CLP");
    const monedaOriginal: FunnelCurrency =
      monedaOriginalValue === "CLP" ||
      monedaOriginalValue === "UF" ||
      monedaOriginalValue === "USD"
        ? monedaOriginalValue
        : "CLP";
    const fuenteLead = toText(item.fuenteLead, "");
    const fuenteLeadNormalizada =
      fuenteLeadBackendToFrontendMap[fuenteLead] ??
      (leadSourceOptions.includes(fuenteLead as FunnelLeadSource)
        ? (fuenteLead as FunnelLeadSource)
        : undefined);
    const valorOriginal = toNumber(item.valorOriginal);
    const fechaProbableCierre = toText(item.fechaProbableCierre, "");

    return {
      id: toText(item.id),
      nombreProyecto: toText(item.nombreProyecto),
      empresa: toText(item.empresa, "") || undefined,
      valorEstimado: valorOriginal > 0 ? valorOriginal : undefined,
      moneda: monedaOriginal,
      fechaProbableCierre: fechaProbableCierre
        ? fechaProbableCierre.slice(0, 10)
        : undefined,
      vendedor: toText(item.vendedor, "") || undefined,
      region: toText(item.region, "") || undefined,
      comuna: toText(item.comuna, "") || undefined,
      fuenteLead: fuenteLeadNormalizada,
      etapa: etapaBackendMap[toText(item.etapa)] ?? "prospecto",
    };
  };

  const dealToDraft = (deal: FunnelDeal): FunnelDraft => ({
    nombreProyecto: deal.nombreProyecto,
    empresa: deal.empresa || "",
    valorEstimado:
      typeof deal.valorEstimado === "number" && Number.isFinite(deal.valorEstimado)
        ? String(deal.valorEstimado)
        : "",
    moneda: deal.moneda,
    fechaProbableCierre: deal.fechaProbableCierre || "",
    vendedor: deal.vendedor || "",
    region: deal.region || "",
    comuna: deal.comuna || "",
    fuenteLead: deal.fuenteLead || "",
    etapa: deal.etapa,
  });

  const loadDeals = async () => {
    try {
      const opportunities = await funnelBeckAPI.listar();
      const mapped: FunnelDeal[] = opportunities.map((item) =>
        mapOpportunityToDeal(item as Record<string, unknown>)
      );

      setDeals(mapped);
    } catch (error) {
      console.error("Error al cargar oportunidades del funnel:", error);
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRelatedCotizaciones = async (dealId: string) => {
    try {
      setRelatedCotizacionesLoading(true);
      const response = await funnelBeckAPI.listarCotizaciones(dealId);
      setRelatedCotizaciones(
        response.map((item, index) => mapCotizacionRecord(item, index))
      );
    } catch (error) {
      setRelatedCotizaciones([]);
      message.error(
        getErrorMessage(error, "No se pudieron cargar las cotizaciones")
      );
    } finally {
      setRelatedCotizacionesLoading(false);
    }
  };

  const openDealDetail = async (deal: FunnelDeal) => {
    setSelectedDeal(deal);
    setRelatedCotizaciones([]);
    void loadRelatedCotizaciones(deal.id);
  };

  const closeDealDetail = () => {
    setSelectedDeal(null);
    setRelatedCotizaciones([]);
    setSelectedCotizacion(null);
    setSelectedCotizacionLoading(false);
  };

  const openCreateCotizacion = (deal: FunnelDeal) => {
    setCotizacionEditorMode("create");
    setEditingCotizacion(null);
    setCotizacionEditorContextDeal(deal);
    setCotizacionEditorLockedFunnel(true);
    setCotizacionEditorOpen(true);
  };

  const openEditCotizacion = async (cotizacion: FunnelCotizacionItem) => {
    try {
      setCotizacionEditorLoading(true);
      const response = await cotizacionesAPI.getById(cotizacion.id);

      setCotizacionEditorMode("edit");
      setEditingCotizacion(mapCotizacionRecord(response));
      setCotizacionEditorContextDeal(selectedDeal);
      setCotizacionEditorLockedFunnel(
        Boolean(cotizacion.funnelBeckId || selectedDeal?.id)
      );
      setCotizacionEditorOpen(true);
    } catch (error) {
      message.error(
        getErrorMessage(error, "No se pudo cargar la cotizacion para editar")
      );
    } finally {
      setCotizacionEditorLoading(false);
    }
  };

  const openCotizacionDetail = async (cotizacionId: string) => {
    try {
      setSelectedCotizacionLoading(true);
      setSelectedCotizacion(null);
      const response = await cotizacionesAPI.getById(cotizacionId);
      setSelectedCotizacion(mapCotizacionRecord(response));
    } catch (error) {
      message.error(
        getErrorMessage(error, "No se pudo cargar el detalle de la cotizacion")
      );
    } finally {
      setSelectedCotizacionLoading(false);
    }
  };

  const closeCotizacionDetail = () => {
    setSelectedCotizacion(null);
    setSelectedCotizacionLoading(false);
  };

  const handleVerCotizacionPDF = async (id: string, numero?: string) => {
    try {
      const blob = await cotizacionesAPI.getPDF(id);
      const pdfBlob =
        blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);
      const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `cotizacion-${numero || id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo abrir el PDF"));
    }
  };

  const handleSaveCotizacion = async (values: CotizacionEditorValues) => {
    if (cotizacionSaving || cotizacionEditorLoading) {
      return;
    }

    try {
      setCotizacionSaving(true);

      const normalizedLineas: CotizacionUpsertPayload["lineas"] = (
        values.lineas ?? []
      )
        .map((linea, index) => {
          const cantidad = Math.max(1, Number(linea.cantidad || 0));
          const precioUnitario = Number(linea.precioUnitario || 0);
          const gananciaPct = Number(linea.gananciaPct || 0);
          const tipoLinea: CotizacionUpsertPayload["lineas"][number]["tipoLinea"] =
            linea.tipoLinea === "SERVICIO" ? "SERVICIO" : "PRODUCTO";
          const subtotal = calculateLineSubtotal(
            cantidad,
            precioUnitario,
            gananciaPct
          );

          return {
            tipoLinea,
            descripcion: linea.descripcion.trim(),
            cantidad,
            precioUnitario,
            subtotal,
            orden: index + 1,
            gananciaPct,
          };
        })
        .filter((linea) => linea.descripcion);

      if (!normalizedLineas.length) {
        message.error("Debes agregar al menos una linea a la cotizacion");
        return;
      }

      const descuentoRaw = Number(values.descuento ?? 0);
      const descuento = Number.isFinite(descuentoRaw)
        ? Math.min(100, Math.max(0, descuentoRaw))
        : 0;
      const aplicaImpuesto = Boolean(values.aplicaImpuesto);
      const { subtotal, impuesto, total } = calculateCotizacionTotals(
        normalizedLineas,
        descuento,
        aplicaImpuesto
      );

      const payload: CotizacionUpsertPayload = {
        numero: values.numero || undefined,
        clienteNombre: values.cliente,
        funnelBeckId: values.funnelBeckId || null,
        subtotal,
        impuesto,
        total,
        vigencia: values.vigencia.toISOString(),
        observaciones: values.notas || "",
        descuento,
        aplicaImpuesto,
        estado: values.estado.toUpperCase(),
        lineas: normalizedLineas,
      };

      let savedCotizacion: CotizacionApiRecord | null = null;

      if (cotizacionEditorMode === "create") {
        savedCotizacion = await cotizacionesAPI.create(payload);
      } else if (editingCotizacion) {
        savedCotizacion = await cotizacionesAPI.update(
          editingCotizacion.id,
          payload
        );
      }

      if (savedCotizacion) {
        const mappedCotizacion = mapCotizacionRecord(savedCotizacion);
        setSelectedCotizacion((current) =>
          current?.id === mappedCotizacion.id ? mappedCotizacion : current
        );
      }

      if (selectedDeal?.id) {
        await loadRelatedCotizaciones(selectedDeal.id);
      }

      setCotizacionEditorOpen(false);
      setEditingCotizacion(null);
      setCotizacionEditorContextDeal(null);
      setCotizacionEditorLockedFunnel(false);
      message.success(
        cotizacionEditorMode === "create"
          ? "Cotizacion creada"
          : "Cotizacion actualizada"
      );
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo guardar la cotizacion"));
    } finally {
      setCotizacionSaving(false);
    }
  };

  const loadUfActual = async () => {
    try {
      const response = await fetchWithAuth("/indicadores/uf");
      const result = (await response.json()) as {
        success: boolean;
        data?: {
          valor: number;
          fecha: string;
        };
        error?: string;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "No fue posible cargar la UF actual");
      }

      setUfActual(result.data.valor);
      setUfFecha(result.data.fecha);
    } catch (error) {
      console.error("Error al cargar UF actual:", error);
      setUfActual(null);
      setUfFecha(null);
    }
  };

  const loadDolarActual = async () => {
    try {
      const response = await fetchWithAuth("/indicadores/dolar-mercado");
      const result = (await response.json()) as {
        success: boolean;
        data?: {
          valor: number;
          fecha?: string;
        };
        error?: string;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "No fue posible cargar el dolar actual");
      }

      setDolarActual(result.data.valor);
    } catch (error) {
      console.error("Error al cargar dolar actual:", error);
      setDolarActual(null);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    void loadDeals();
    void loadUfActual();
    void loadDolarActual();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleOpenModal = () => {
    if (!canEditFunnel || dealSaving) return;

    setFunnelModalMode("create");
    setEditingDealId(null);
    setDraft(createEmptyDraft());
    setFieldErrors({});
    setShowValidationSummary(false);
    setIsModalOpen(true);
  };

  const handleEditDeal = (deal: FunnelDeal) => {
    if (!canEditFunnel || dealSaving) return;

    closeDealDetail();

    window.setTimeout(() => {
      setFunnelModalMode("edit");
      setEditingDealId(deal.id);
      setDraft(dealToDraft(deal));
      setFieldErrors({});
      setShowValidationSummary(false);
      setIsModalOpen(true);
    }, 0);
  };

  const handleCloseModal = () => {
    if (dealSaving) {
      return;
    }

    setIsModalOpen(false);
    setFunnelModalMode("create");
    setEditingDealId(null);
    setDraft(createEmptyDraft());
    setFieldErrors({});
    setShowValidationSummary(false);
  };

  const handleCloseCierreModal = () => {
    setCierreModalOpen(false);
    setDealEnCierre(null);
    setEstadoCierreModal("");
    setMotivoPerdidaModal("");
  };

  const handleFieldChange = (field: keyof FunnelDraft, value: string) => {
    if (!canEditFunnel || dealSaving) return;

    if (field === "etapa") {
      setDraft((current) => ({
        ...current,
        etapa: value as FunnelStage,
      }));
      return;
    }

    if (field === "moneda") {
      setDraft((current) => ({
        ...current,
        moneda: value as FunnelCurrency,
      }));
      return;
    }

    if (field === "fuenteLead") {
      setDraft((current) => ({
        ...current,
        fuenteLead: value as FunnelLeadSource | "",
      }));
      return;
    }

    if (field === "region") {
      setDraft((current) => ({
        ...current,
        region: value,
        comuna: "",
      }));
      return;
    }

    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateDealStage = async (
    dealId: string,
    payload: {
      etapa: string;
      estadoCierre?: "ganada" | "perdida";
      motivoPerdida?: string;
    }
  ) => {
    if (!canEditFunnel || dealSaving) return;

    const response = await fetchWithAuth(`/funnel-beck/${dealId}/etapa`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      success: boolean;
      error?: string;
    };

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "El backend rechazo la actualizacion de etapa"
      );
    }
  };

  const handleStageChange = async (dealId: string, etapa: FunnelStage) => {
    if (!canEditFunnel || dealSaving) return;

    if (etapa === "cerrada") {
      setDealEnCierre(dealId);
      setEstadoCierreModal("");
      setMotivoPerdidaModal("");
      setCierreModalOpen(true);
      return;
    }

    try {
      await updateDealStage(dealId, {
        etapa: etapaFrontendToBackendMap[etapa],
      });

      await loadDeals();
    } catch (error) {
      console.error("Error al actualizar etapa:", error);
    }
  };

  const handleConfirmarCierre = async ({
    estadoCierre,
    motivoPerdida,
  }: {
    estadoCierre: "ganada" | "perdida";
    motivoPerdida?: string;
  }) => {
    if (!canEditFunnel || !dealEnCierre) {
      return;
    }

    const payload: {
      etapa: string;
      estadoCierre: "ganada" | "perdida";
      motivoPerdida?: string;
    } = {
      etapa: etapaFrontendToBackendMap.cerrada,
      estadoCierre,
    };

    if (motivoPerdida) {
      payload.motivoPerdida = motivoPerdida;
    }

    try {
      await updateDealStage(dealEnCierre, payload);
      handleCloseCierreModal();
      await loadDeals();
    } catch (error) {
      console.error("Error al actualizar etapa:", error);
    }
  };

  const handleCreateDeal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditFunnel || dealSaving || submitLockRef.current) return;

    const nombreProyecto = draft.nombreProyecto.trim();
    const empresa = draft.empresa.trim();
    const fechaProbableCierre = draft.fechaProbableCierre.trim();
    const vendedor = draft.vendedor.trim();
    const region = draft.region.trim();
    const comuna = draft.comuna.trim();
    const validationErrors = validateFunnelDraft(draft);
    const parsedValor = Number(draft.valorEstimado.replace(",", "."));

    setShowValidationSummary(true);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    submitLockRef.current = true;
    setFieldErrors({});

    try {
      setDealSaving(true);

      const payload = {
        nombreProyecto,
        empresa,
        valorOriginal: parsedValor,
        monedaOriginal: draft.moneda,
        fechaProbableCierre,
        vendedor,
        region,
        comuna,
        fuenteLead: draft.fuenteLead
          ? fuenteLeadFrontendToBackendMap[draft.fuenteLead]
          : undefined,
        etapa: etapaFrontendToBackendMap[draft.etapa],
      };

      const savedOpportunity =
        funnelModalMode === "create"
          ? await funnelBeckAPI.crear(payload)
          : await funnelBeckAPI.actualizar(editingDealId as string, payload);

      const mappedSavedOpportunity = mapOpportunityToDeal(
        savedOpportunity as Record<string, unknown>
      );

      if (selectedDeal?.id === mappedSavedOpportunity.id) {
        setSelectedDeal(mappedSavedOpportunity);
      }

      await loadDeals();
      setIsModalOpen(false);
      setFunnelModalMode("create");
      setEditingDealId(null);
      setDraft(createEmptyDraft());
      setFieldErrors({});
      setShowValidationSummary(false);
      message.success(
        funnelModalMode === "create"
          ? "Oportunidad creada"
          : "Oportunidad actualizada"
      );
    } catch (error) {
      message.error(
        getErrorMessage(error, "Error al guardar la oportunidad")
      );
      console.error("Error al guardar la oportunidad:", error);
    } finally {
      setDealSaving(false);
      submitLockRef.current = false;
    }
  };

  const cotizacionEditorInitialValues: Partial<CotizacionEditorValues> =
    editingCotizacion
      ? {
          numero: Number(editingCotizacion.numero) || undefined,
          funnelBeckId:
            editingCotizacion.funnelBeckId ||
            cotizacionEditorContextDeal?.id ||
            undefined,
          cliente: editingCotizacion.cliente,
          proyecto: editingCotizacion.proyecto,
          origen: editingCotizacion.origen === "FIREMAT" ? "FIREMAT" : "BECK",
          tipo: normalizeTipoCotizacion(editingCotizacion.tipo),
          fecha: toDayjsOrFallback(editingCotizacion.fecha, dayjs()),
          vigencia: toDayjsOrFallback(
            editingCotizacion.vigencia,
            dayjs().add(15, "day")
          ),
          estado:
            editingCotizacion.estado === "Enviada" ||
            editingCotizacion.estado === "Aceptada" ||
            editingCotizacion.estado === "Rechazada" ||
            editingCotizacion.estado === "Vencida"
              ? editingCotizacion.estado
              : "Borrador",
          moneda: editingCotizacion.moneda === "USD" ? "USD" : "CLP",
          responsable: editingCotizacion.responsable,
          notas: editingCotizacion.notas,
          descuento: editingCotizacion.descuento,
          aplicaImpuesto: editingCotizacion.aplicaImpuesto,
          lineas: editingCotizacion.lineas,
        }
      : {
          fecha: dayjs(),
          vigencia: dayjs().add(15, "day"),
          estado: "Borrador",
          moneda: "CLP",
          origen: "BECK",
          tipo: "Cliente",
          funnelBeckId: cotizacionEditorContextDeal?.id,
          cliente: cotizacionEditorContextDeal?.empresa || "",
          proyecto: cotizacionEditorContextDeal?.nombreProyecto || "",
          descuento: 0,
          aplicaImpuesto: true,
          lineas: [],
        };

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="beck-panel-soft">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="beck-badge">
              <span className="inline-flex h-2 w-2 rounded-full bg-beck-primary" />
              <span>Seguimiento comercial</span>
            </div>

            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Funnel
            </h1>

            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Visualiza oportunidades comerciales por etapa.
              {canEditFunnel
                ? " Crea nuevas oportunidades y actualiza su avance directamente desde el tablero."
                : " Tu perfil tiene acceso de solo lectura."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="beck-tab-group">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`beck-tab-button ${
                  viewMode === "kanban"
                    ? "beck-tab-button-active"
                    : ""
                }`}
              >
                Funnel
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`beck-tab-button ${
                  viewMode === "calendar"
                    ? "beck-tab-button-active"
                    : ""
                }`}
              >
                Calendario
              </button>
            </div>

            {canEditFunnel && (
              <button
                type="button"
                onClick={handleOpenModal}
                disabled={dealSaving}
                className="beck-btn-primary"
              >
                Nueva oportunidad
              </button>
            )}
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="beck-panel px-5 py-6 text-sm text-beck-ink-soft">
          Cargando funnel...
        </section>
      ) : viewMode === "kanban" ? (
        <section className="beck-panel">
          <div className="flex gap-4 overflow-x-auto p-4 scrollbar-thin">
            {etapas.map((etapa) => {
              const dealsForStage = deals.filter((deal) => deal.etapa === etapa);

              return (
                <FunnelColumn
                  key={etapa}
                  etapa={etapa}
                  deals={dealsForStage}
                  canEditFunnel={canEditFunnel}
                  onStageChange={handleStageChange}
                  onViewDetail={openDealDetail}
                  onCreateCotizacion={openCreateCotizacion}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <FunnelCalendario
          deals={deals}
          onOpenDetail={openDealDetail}
        />
      )}

      <FunnelModal
        open={isModalOpen && canEditFunnel}
        mode={funnelModalMode}
        draft={draft}
        fieldErrors={fieldErrors}
        validationMessage={
          showValidationSummary && Object.keys(fieldErrors).length > 0
            ? REQUIRED_FIELDS_MESSAGE
            : null
        }
        conversionReferencia={conversionReferencia}
        submitting={dealSaving}
        onClose={handleCloseModal}
        onSubmit={handleCreateDeal}
        onFieldChange={handleFieldChange}
      />

      <AntdModal
        open={Boolean(selectedDeal)}
        onCancel={closeDealDetail}
        footer={null}
        width={960}
        title={selectedDeal ? `Oportunidad: ${selectedDeal.nombreProyecto}` : "Oportunidad"}
      >
        {selectedDeal && (
          <div className="space-y-5">
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Empresa">
                {selectedDeal.empresa || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Etapa">
                {etapasLabel[selectedDeal.etapa]}
              </Descriptions.Item>
              <Descriptions.Item label="Valor estimado">
                {typeof selectedDeal.valorEstimado === "number"
                  ? formatEstimatedValue(selectedDeal.valorEstimado, selectedDeal.moneda)
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha cierre">
                {selectedDeal.fechaProbableCierre
                  ? formatDisplayDate(selectedDeal.fechaProbableCierre)
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Vendedor">
                {selectedDeal.vendedor || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Region / Comuna">
                {[selectedDeal.region, selectedDeal.comuna].filter(Boolean).join(" / ") || "-"}
              </Descriptions.Item>
            </Descriptions>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Cotizaciones vinculadas
                </h3>
                <p className="text-xs text-slate-500">
                  Cotizaciones Beck asociadas a esta oportunidad del funnel.
                </p>
              </div>

              {canEditFunnel && (
                <div className="flex items-center gap-2">
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => handleEditDeal(selectedDeal)}
                    disabled={dealSaving}
                  >
                    Editar
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={dealDeletingId === selectedDeal.id}
                    onClick={() => {
                      AntdModal.confirm({
                        title: "Eliminar oportunidad",
                        content:
                          "Esta accion eliminara la oportunidad seleccionada. ¿Deseas continuar?",
                        okText: "Eliminar",
                        okButtonProps: { danger: true },
                        cancelText: "Cancelar",
                        onOk: async () => {
                          try {
                            setDealDeletingId(selectedDeal.id);
                            await funnelBeckAPI.eliminar(selectedDeal.id);
                            message.success("Oportunidad eliminada");
                            closeDealDetail();
                            await loadDeals();
                          } catch (error) {
                            message.error(
                              getErrorMessage(error, "No se pudo eliminar la oportunidad")
                            );
                          } finally {
                            setDealDeletingId(null);
                          }
                        },
                      });
                    }}
                  >
                    Eliminar
                  </Button>
                  <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    className="border-none"
                    onClick={() => openCreateCotizacion(selectedDeal)}
                  >
                    Crear cotizacion
                  </Button>
                </div>
              )}
            </div>

            {relatedCotizacionesLoading ? (
              <div className="flex justify-center py-8">
                <Spin />
              </div>
            ) : relatedCotizaciones.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">
                        Numero
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">
                        Estado
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">
                        Total
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {relatedCotizaciones.map((cotizacion) => (
                      <tr key={cotizacion.id}>
                        <td className="px-3 py-2 text-slate-700">
                          {cotizacion.numero}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {cotizacion.estado}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatCotizacionMoney(cotizacion.total, cotizacion.moneda)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatCotizacionDate(cotizacion.fecha)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                void openCotizacionDetail(cotizacion.id);
                              }}
                            >
                              Ver
                            </Button>
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => {
                                void handleVerCotizacionPDF(
                                  cotizacion.id,
                                  cotizacion.numero
                                );
                              }}
                            >
                              PDF
                            </Button>
                            {canEditFunnel && (
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  void openEditCotizacion(cotizacion);
                                }}
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Esta oportunidad aun no tiene cotizaciones vinculadas.
              </div>
            )}
          </div>
        )}
      </AntdModal>

      <AntdModal
        open={Boolean(selectedCotizacion) || selectedCotizacionLoading}
        onCancel={closeCotizacionDetail}
        footer={null}
        width={720}
        title="Detalle de cotizacion"
      >
        {selectedCotizacionLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : selectedCotizacion ? (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Numero">
              {selectedCotizacion.numero}
            </Descriptions.Item>
            <Descriptions.Item label="Codigo">
              {selectedCotizacion.codigo || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Cliente">
              {selectedCotizacion.cliente}
            </Descriptions.Item>
            <Descriptions.Item label="Proyecto">
              {selectedCotizacion.proyecto || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              {selectedCotizacion.estado}
            </Descriptions.Item>
            <Descriptions.Item label="Total">
              {formatCotizacionMoney(
                selectedCotizacion.total,
                selectedCotizacion.moneda
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha">
              {formatCotizacionDate(selectedCotizacion.fecha)}
            </Descriptions.Item>
            <Descriptions.Item label="Vigencia">
              {formatCotizacionDate(selectedCotizacion.vigencia)}
            </Descriptions.Item>
            <Descriptions.Item label="Notas">
              {selectedCotizacion.notas || "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </AntdModal>

      {cotizacionEditorOpen && (
        <CotizacionEditorModal
          key={`${cotizacionEditorMode}-${editingCotizacion?.id ?? cotizacionEditorContextDeal?.id ?? "new"}`}
          open={cotizacionEditorOpen}
          mode={cotizacionEditorMode}
          initialValues={cotizacionEditorInitialValues}
          submitting={cotizacionSaving}
          lockFunnelSelection={cotizacionEditorLockedFunnel}
          onClose={() => {
            if (cotizacionSaving) {
              return;
            }

            setCotizacionEditorOpen(false);
            setEditingCotizacion(null);
            setCotizacionEditorContextDeal(null);
            setCotizacionEditorLockedFunnel(false);
          }}
          onSubmit={(values) => {
            void handleSaveCotizacion(values);
          }}
        />
      )}

      <CierreDeProyecto
        open={cierreModalOpen && canEditFunnel}
        estadoCierre={estadoCierreModal}
        motivoPerdida={motivoPerdidaModal}
        onChangeEstado={(value) => {
          if (!canEditFunnel || dealSaving) return;
          setEstadoCierreModal(value);
        }}
        onChangeMotivo={(value) => {
          if (!canEditFunnel || dealSaving) return;
          setMotivoPerdidaModal(value);
        }}
        onConfirm={() => {
          if (!canEditFunnel || dealSaving) return;

          if (
            estadoCierreModal !== "ganada" &&
            estadoCierreModal !== "perdida"
          ) {
            console.error(
              "Debes indicar si la oportunidad fue ganada o perdida."
            );
            return;
          }

          const motivoPerdidaNormalizado = motivoPerdidaModal.trim();

          if (
            estadoCierreModal === "perdida" &&
            !motivoPerdidaNormalizado
          ) {
            console.error(
              "Si la oportunidad fue perdida, debes indicar un motivo."
            );
            return;
          }

          void handleConfirmarCierre({
            estadoCierre: estadoCierreModal,
            motivoPerdida:
              estadoCierreModal === "perdida"
                ? motivoPerdidaNormalizado
                : undefined,
          });
        }}
        onCancel={handleCloseCierreModal}
      />
    </div>
  );
};

export default FunnelPage;



