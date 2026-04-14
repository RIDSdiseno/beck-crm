import React, { type FormEvent, useEffect, useState } from "react";
import CierreDeProyecto from "../components/Cierredeproyecto";

import {
  regionesComunasChile,
  type RegionChile,
} from "../data/regionesComunasChile";
import type { ThemeMode } from "../hooks/useSystemTheme";

type FunnelPageProps = {
  themeMode: ThemeMode;
};

type FunnelCurrency = "CLP" | "UF" | "USD";

type FunnelLeadSource =
  | "Web"
  | "Referido"
  | "Llamada"
  | "Cliente recurrente"
  | "Prospeccion"
  | "Otro";

type FunnelStage =
  | "prospecto"
  | "visita"
  | "cotizacion"
  | "enviada"
  | "negociacion"
  | "cerrada";

type FunnelDeal = {
  id: string;
  etapa: FunnelStage;
  nombreProyecto: string;
  moneda: FunnelCurrency;
  empresa?: string;
  valorEstimado?: number;
  fechaProbableCierre?: string;
  vendedor?: string;
  region?: string;
  comuna?: string;
  fuenteLead?: FunnelLeadSource;
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

type FunnelCardProps = {
  deal: FunnelDeal;
  onStageChange: (dealId: string, etapa: FunnelStage) => void;
};

type FunnelColumnProps = {
  etapa: FunnelStage;
  deals: FunnelDeal[];
  onStageChange: (dealId: string, etapa: FunnelStage) => void;
};

type FunnelModalProps = {
  open: boolean;
  draft: FunnelDraft;
  conversionReferencia: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof FunnelDraft, value: string) => void;
};

type FunnelFieldRowProps = {
  label: string;
  value: string;
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
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";

const FunnelFieldRow: React.FC<FunnelFieldRowProps> = ({ label, value }) => (
  <div className="grid grid-cols-[auto,1fr] items-start gap-2 text-xs">
    <span className="font-medium text-slate-500">{label}</span>
    <span className="text-right text-slate-700 break-words">{value}</span>
  </div>
);

const FunnelCard: React.FC<FunnelCardProps> = ({ deal, onStageChange }) => (
  <article className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition">
    <h4 className="text-sm font-semibold text-slate-900">
      {deal.nombreProyecto}
    </h4>

    {deal.empresa && (
      <p className="text-xs text-slate-500 mt-1">{deal.empresa}</p>
    )}

    {typeof deal.valorEstimado === "number" && (
      <p className="text-xs text-slate-600 mt-2 font-medium">
        {formatEstimatedValue(deal.valorEstimado, deal.moneda)}
      </p>
    )}

    {deal.fechaProbableCierre && (
      <p className="text-xs text-slate-500">
        Cierre: {formatDisplayDate(deal.fechaProbableCierre)}
      </p>
    )}

    {(deal.vendedor || deal.region || deal.comuna) && (
      <div className="mt-3 space-y-2">
        {deal.vendedor && (
          <FunnelFieldRow label="Vendedor" value={deal.vendedor} />
        )}

        {deal.region && <FunnelFieldRow label="Region" value={deal.region} />}
        {deal.comuna && <FunnelFieldRow label="Comuna" value={deal.comuna} />}
      </div>
    )}

    <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5">
      <label
        htmlFor={`etapa-${deal.id}`}
        className="block text-[11px] font-medium uppercase tracking-wide text-slate-500"
      >
        Etapa
      </label>
      <select
        id={`etapa-${deal.id}`}
        value={deal.etapa}
        onChange={(event) =>
          onStageChange(deal.id, event.target.value as FunnelStage)
        }
        className={inputClassName}
      >
        {etapas.map((etapa) => (
          <option key={etapa} value={etapa}>
            {etapasLabel[etapa]}
          </option>
        ))}
      </select>
    </div>
  </article>
);

const FunnelColumn: React.FC<FunnelColumnProps> = ({
  etapa,
  deals,
  onStageChange,
}) => (
  <div className="bg-gray-100 rounded-xl p-4 min-h-[420px] flex flex-col">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-sm text-slate-800">
        {etapasLabel[etapa]}
      </h3>
      <span className="text-xs bg-white border rounded-full px-2 py-0.5 text-slate-600">
        {deals.length}
      </span>
    </div>

    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
      {deals.length ? (
        deals.map((deal) => (
          <FunnelCard key={deal.id} deal={deal} onStageChange={onStageChange} />
        ))
      ) : (
        <p className="text-xs text-gray-400 text-center mt-4">
          Sin oportunidades
        </p>
      )}
    </div>
  </div>
);

const FunnelModal: React.FC<FunnelModalProps> = ({
  open,
  draft,
  conversionReferencia,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-orange-700">
              Funnel
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Nueva oportunidad
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Completa la informacion para registrar una nueva oportunidad
              comercial.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="funnel-nombre-proyecto"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Nombre del proyecto
              </label>
              <input
                id="funnel-nombre-proyecto"
                type="text"
                value={draft.nombreProyecto}
                onChange={(event) =>
                  onFieldChange("nombreProyecto", event.target.value)
                }
                className={inputClassName}
                placeholder="Ingresa el nombre del proyecto"
                required
              />
            </div>

            <div>
              <label
                htmlFor="funnel-empresa"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Empresa
              </label>
              <input
                id="funnel-empresa"
                type="text"
                value={draft.empresa}
                onChange={(event) =>
                  onFieldChange("empresa", event.target.value)
                }
                className={inputClassName}
                placeholder="Nombre de la empresa"
              />
            </div>

            <div>
              <label
                htmlFor="funnel-valor-estimado"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Valor estimado
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
                  className={inputClassName}
                  placeholder="Ej: 1500000"
                />
                <select
                  value={draft.moneda}
                  onChange={(event) => onFieldChange("moneda", event.target.value)}
                  className={inputClassName}
                >
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
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
              </label>
              <input
                id="funnel-fecha-cierre"
                type="date"
                value={draft.fechaProbableCierre}
                onChange={(event) =>
                  onFieldChange("fechaProbableCierre", event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="funnel-vendedor"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Vendedor
              </label>
              <input
                id="funnel-vendedor"
                type="text"
                value={draft.vendedor}
                onChange={(event) =>
                  onFieldChange("vendedor", event.target.value)
                }
                className={inputClassName}
                placeholder="Responsable comercial"
              />
            </div>

            <div>
              <label
                htmlFor="funnel-region"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Region
              </label>
              <select
                id="funnel-region"
                value={draft.region}
                onChange={(event) =>
                  onFieldChange("region", event.target.value)
                }
                className={inputClassName}
              >
                <option value="">Selecciona una region</option>
                {regionesComunasChile.map((region) => (
                  <option key={region.nombre} value={region.nombre}>
                    {region.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="funnel-comuna"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Comuna
              </label>
              <select
                id="funnel-comuna"
                value={draft.comuna}
                onChange={(event) =>
                  onFieldChange("comuna", event.target.value)
                }
                className={`${inputClassName} disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                disabled={!draft.region}
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
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="funnel-fuente-lead"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Fuente del lead
              </label>
              <select
                id="funnel-fuente-lead"
                value={draft.fuenteLead}
                onChange={(event) =>
                  onFieldChange("fuenteLead", event.target.value)
                }
                className={inputClassName}
              >
                <option value="">Selecciona una fuente</option>
                {leadSourceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="funnel-etapa"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Etapa inicial
              </label>
              <select
                id="funnel-etapa"
                value={draft.etapa}
                onChange={(event) => onFieldChange("etapa", event.target.value)}
                className={inputClassName}
              >
                {etapas.map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {etapasLabel[etapa]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Guardar oportunidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FunnelPage: React.FC<FunnelPageProps> = ({ themeMode }) => {
  void themeMode;

  const [deals, setDeals] = useState<FunnelDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<FunnelDraft>(createEmptyDraft);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [dealEnCierre, setDealEnCierre] = useState<string | null>(null);
  const [estadoCierreModal, setEstadoCierreModal] = useState<
    "ganada" | "perdida" | ""
  >("");
  const [motivoPerdidaModal, setMotivoPerdidaModal] = useState("");
  const [ufActual, setUfActual] = useState<number | null>(null);
  const [dolarActual, setDolarActual] = useState<number | null>(null);
  const [ufFecha, setUfFecha] = useState<string | null>(null);

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

          if (draft.moneda === "UF") {
            if (tieneUf) {
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
          }

          if (draft.moneda === "USD") {
            if (tieneDolar) {
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
          }

          return referencias.length > 0 ? referencias.join(" | ") : null;
        })()
      : null;

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

  const loadDeals = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/funnel-beck");
      const result = (await response.json()) as {
        success: boolean;
        data: {
          id: string;
          nombreProyecto: string;
          empresa?: string;
          valorOriginal?: number;
          monedaOriginal?: string;
          fechaProbableCierre?: string;
          vendedor?: string;
          region?: string;
          comuna?: string;
          fuenteLead?: string;
          etapa: string;
        }[];
      };

      const mapped: FunnelDeal[] = result.data.map((item) => {
        const monedaOriginal: FunnelCurrency =
          item.monedaOriginal === "CLP" ||
          item.monedaOriginal === "UF" ||
          item.monedaOriginal === "USD"
            ? item.monedaOriginal
            : "CLP";

        return {
          id: item.id,
          nombreProyecto: item.nombreProyecto,
          empresa: item.empresa,
          valorEstimado: item.valorOriginal,
          moneda: monedaOriginal,
          fechaProbableCierre: item.fechaProbableCierre
            ? item.fechaProbableCierre.slice(0, 10)
            : undefined,
          vendedor: item.vendedor,
          region: item.region,
          comuna: item.comuna,
          fuenteLead: item.fuenteLead as FunnelLeadSource | undefined,
          etapa: etapaBackendMap[item.etapa] ?? "prospecto",
        };
      });

      setDeals(mapped);
    } catch (error) {
      console.error("Error al cargar oportunidades del funnel:", error);
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUfActual = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/indicadores/uf");
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
      const response = await fetch(
        "http://localhost:5000/api/indicadores/dolar-mercado"
      );
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
    setDraft(createEmptyDraft());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDraft(createEmptyDraft());
  };

  const handleCloseCierreModal = () => {
    setCierreModalOpen(false);
    setDealEnCierre(null);
    setEstadoCierreModal("");
    setMotivoPerdidaModal("");
  };

  const handleFieldChange = (field: keyof FunnelDraft, value: string) => {
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
    const response = await fetch(
      `http://localhost:5000/api/funnel-beck/${dealId}/etapa`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = (await response.json()) as {
      success: boolean;
      error?: string;
    };

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "El backend rechazó la actualización de etapa"
      );
    }
  };

  const handleStageChange = async (dealId: string, etapa: FunnelStage) => {
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
    if (!dealEnCierre) {
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

    const nombreProyecto = draft.nombreProyecto.trim();
    const empresa = draft.empresa.trim();
    const vendedor = draft.vendedor.trim();
    const region = draft.region.trim();
    const comuna = draft.comuna.trim();
    const parsedValor = draft.valorEstimado.trim()
      ? Number(draft.valorEstimado)
      : undefined;

    if (!nombreProyecto) {
      return;
    }

    if (
      !draft.valorEstimado.trim() ||
      typeof parsedValor !== "number" ||
      !Number.isFinite(parsedValor) ||
      parsedValor <= 0
    ) {
      console.error(
        "El valor estimado es obligatorio y debe ser un número mayor a 0."
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/funnel-beck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreProyecto,
          empresa: empresa || undefined,
          valorOriginal: parsedValor,
          monedaOriginal: draft.moneda,
          fechaProbableCierre: draft.fechaProbableCierre || undefined,
          vendedor: vendedor || undefined,
          region: region || undefined,
          comuna: comuna || undefined,
          fuenteLead: draft.fuenteLead
            ? fuenteLeadFrontendToBackendMap[draft.fuenteLead]
            : undefined,
          etapa: etapaFrontendToBackendMap[draft.etapa],
        }),
      });

      const result = (await response.json()) as { success: boolean };

      if (!response.ok || !result.success) {
        throw new Error("El backend rechazó la oportunidad");
      }

      await loadDeals();
      handleCloseModal();
    } catch (error) {
      console.error("Error al guardar la oportunidad:", error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-[#f9fafb] shadow-sm">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-orange-700">
              <span className="inline-flex h-2 w-2 rounded-full bg-orange-500" />
              <span>Seguimiento comercial</span>
            </div>

            <h1 className="mt-2 text-lg font-semibold tracking-wide text-slate-900">
              Funnel
            </h1>

            <p className="mt-1 max-w-2xl text-xs text-slate-600">
              Visualiza oportunidades comerciales por etapa, crea nuevas
              oportunidades y actualiza su avance directamente desde el
              tablero.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Nueva oportunidad
          </button>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
          Cargando funnel...
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {etapas.map((etapa) => {
              const dealsForStage = deals.filter((deal) => deal.etapa === etapa);

              return (
                <FunnelColumn
                  key={etapa}
                  etapa={etapa}
                  deals={dealsForStage}
                  onStageChange={handleStageChange}
                />
              );
            })}
          </div>
        </section>
      )}

      <FunnelModal
        open={isModalOpen}
        draft={draft}
        conversionReferencia={conversionReferencia}
        onClose={handleCloseModal}
        onSubmit={handleCreateDeal}
        onFieldChange={handleFieldChange}
      />

      <CierreDeProyecto
        open={cierreModalOpen}
        estadoCierre={estadoCierreModal}
        motivoPerdida={motivoPerdidaModal}
        onChangeEstado={(value) => setEstadoCierreModal(value)}
        onChangeMotivo={setMotivoPerdidaModal}
        onConfirm={() => {
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
