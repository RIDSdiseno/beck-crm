import React, { useEffect, useState } from "react";
import { Select, Typography } from "antd";
import {
  MOTIVOS_PERDIDA,
  MOTIVOS_POSTERGACION,
  normalizarMotivoSubmit,
  parseMotivoSelect,
} from "../constants/motivosCierre";

type CierreDeProyectoProps = {
  open: boolean;
  estadoCierre: "ganada" | "perdida" | "postergada" | "";
  motivoPerdida: string;
  etapaPerdida: string;
  motivoPostergacion: string;
  fechaReactivacion: string;
  documentoRespaldo: string;
  flujoPosterior: string;
  montoFinalGanado: string;
  fechaCierre: string;
  onChangeEstado: (value: "ganada" | "perdida" | "postergada") => void;
  onChangeMotivo: (value: string) => void;
  onChangeEtapaPerdida: (value: string) => void;
  onChangeMotivoPostergacion: (value: string) => void;
  onChangeFechaReactivacion: (value: string) => void;
  onChangeDocumentoRespaldo: (value: string) => void;
  onChangeFlujoPosterior: (value: string) => void;
  onChangeMontoFinalGanado: (value: string) => void;
  onChangeFechaCierre: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const inputCls =
  "w-full rounded-xl border border-beck-border-light p-3 text-sm text-beck-ink-soft outline-none transition focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]";

const radioClassName = "h-4 w-4 accent-[#c7a114] focus:ring-[#f6ebba]";

const flujoPosteriorOptions = [
  "Traspaso a operaciones",
  "Oficina técnica",
  "Administración",
  "Facturación",
  "Planificación de proyecto",
  "ERP",
  "Otro",
] as const;

const parseFlujoPosterior = (value?: string | null): string[] => {
  if (!value) return [];

  return value
    .split(/[,;\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const serializeFlujoPosterior = (values: string[]): string =>
  values.map((item) => item.trim()).filter(Boolean).join(", ");

const CierreDeProyecto: React.FC<CierreDeProyectoProps> = ({
  open,
  estadoCierre,
  motivoPerdida,
  etapaPerdida,
  motivoPostergacion,
  fechaReactivacion,
  documentoRespaldo,
  flujoPosterior,
  montoFinalGanado,
  fechaCierre,
  onChangeEstado,
  onChangeMotivo,
  onChangeEtapaPerdida,
  onChangeMotivoPostergacion,
  onChangeFechaReactivacion,
  onChangeDocumentoRespaldo,
  onChangeFlujoPosterior,
  onChangeMontoFinalGanado,
  onChangeFechaCierre,
  onConfirm,
  onCancel,
}) => {
  const [selectPerdida, setSelectPerdida] = useState("");
  const [detallePerdida, setDetallePerdida] = useState("");
  const [selectPostergacion, setSelectPostergacion] = useState("");
  const [detallePostergacion, setDetallePostergacion] = useState("");

  useEffect(() => {
    if (open) {
      const p = parseMotivoSelect(motivoPerdida);
      setSelectPerdida(p.select);
      setDetallePerdida(p.detalle);
      const post = parseMotivoSelect(motivoPostergacion);
      setSelectPostergacion(post.select);
      setDetallePostergacion(post.detalle);
    }
    // Solo sincronizar al abrir el modal (no mientras el usuario está editando)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleSelectPerdida = (value: string) => {
    setSelectPerdida(value);
    if (value !== "Otro") {
      setDetallePerdida("");
      onChangeMotivo(value);
    } else {
      onChangeMotivo("");
    }
  };

  const handleDetallePerdida = (value: string) => {
    setDetallePerdida(value);
    onChangeMotivo(normalizarMotivoSubmit("Otro", value));
  };

  const handleSelectPostergacion = (value: string) => {
    setSelectPostergacion(value);
    if (value !== "Otro") {
      setDetallePostergacion("");
      onChangeMotivoPostergacion(value);
    } else {
      onChangeMotivoPostergacion("");
    }
  };

  const handleDetallePostergacion = (value: string) => {
    setDetallePostergacion(value);
    onChangeMotivoPostergacion(normalizarMotivoSubmit("Otro", value));
  };

  const handleConfirm = () => {
    if (estadoCierre === "perdida" && selectPerdida === "Otro" && !detallePerdida.trim()) {
      return;
    }
    if (estadoCierre === "postergada" && selectPostergacion === "Otro" && !detallePostergacion.trim()) {
      return;
    }
    onConfirm();
  };

  const flujoPosteriorValues = parseFlujoPosterior(flujoPosterior);
  const optionValues = new Set<string>(flujoPosteriorOptions);
  const flujoPosteriorSelectOptions = [
    ...flujoPosteriorOptions.map((option) => ({ value: option, label: option })),
    ...flujoPosteriorValues
      .filter((value) => !optionValues.has(value))
      .map((value) => ({ value, label: value })),
  ];

  const showErrorPerdida = estadoCierre === "perdida" && selectPerdida === "Otro" && !detallePerdida.trim();
  const showErrorPostergacion = estadoCierre === "postergada" && selectPostergacion === "Otro" && !detallePostergacion.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-beck-border-light bg-white p-5 shadow-beck-panel overflow-y-auto max-h-[90vh]">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#a8860f]">
            Funnel
          </p>
          <h3 className="text-lg font-semibold text-beck-ink">
            Cierre de proyecto
          </h3>
          <p className="text-sm text-beck-muted">
            Indica el resultado de la oportunidad.
          </p>
        </div>

        <div className="space-y-2 text-sm text-beck-ink-soft">
          <label className="flex items-center gap-2 rounded-xl border border-beck-border-light bg-[#fffbf0] px-3 py-2">
            <input
              type="radio"
              value="ganada"
              checked={estadoCierre === "ganada"}
              onChange={() => onChangeEstado("ganada")}
              className={radioClassName}
            />
            Ganada
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-beck-border-light bg-[#fffbf0] px-3 py-2">
            <input
              type="radio"
              value="perdida"
              checked={estadoCierre === "perdida"}
              onChange={() => onChangeEstado("perdida")}
              className={radioClassName}
            />
            Perdida
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-beck-border-light bg-[#fffbf0] px-3 py-2">
            <input
              type="radio"
              value="postergada"
              checked={estadoCierre === "postergada"}
              onChange={() => onChangeEstado("postergada")}
              className={radioClassName}
            />
            Postergada
          </label>
        </div>

        {estadoCierre === "perdida" && (
          <div className="space-y-2">
            <Select
              value={selectPerdida || undefined}
              onChange={handleSelectPerdida}
              placeholder="Selecciona motivo de pérdida"
              options={MOTIVOS_PERDIDA}
              className="w-full"
              allowClear
              showSearch
              optionFilterProp="label"
            />
            {selectPerdida === "Otro" && (
              <div>
                <input
                  value={detallePerdida}
                  onChange={(e) => handleDetallePerdida(e.target.value)}
                  placeholder="Especifique otro motivo"
                  className={inputCls}
                />
                {showErrorPerdida && (
                  <p className="mt-1 text-xs text-red-500">Debe especificar el motivo.</p>
                )}
              </div>
            )}
            <input
              type="text"
              placeholder="Etapa en que se perdio"
              value={etapaPerdida}
              onChange={(e) => onChangeEtapaPerdida(e.target.value)}
              className={inputCls}
            />
          </div>
        )}

        {estadoCierre === "postergada" && (
          <div className="space-y-2">
            <Select
              value={selectPostergacion || undefined}
              onChange={handleSelectPostergacion}
              placeholder="Selecciona motivo de postergación"
              options={MOTIVOS_POSTERGACION}
              className="w-full"
              allowClear
              showSearch
              optionFilterProp="label"
            />
            {selectPostergacion === "Otro" && (
              <div>
                <input
                  value={detallePostergacion}
                  onChange={(e) => handleDetallePostergacion(e.target.value)}
                  placeholder="Especifique otro motivo"
                  className={inputCls}
                />
                {showErrorPostergacion && (
                  <p className="mt-1 text-xs text-red-500">Debe especificar el motivo.</p>
                )}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Fecha de reactivacion
              </label>
              <input
                type="date"
                value={fechaReactivacion}
                onChange={(e) => onChangeFechaReactivacion(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {estadoCierre !== "" && (
          <div className="space-y-3 border-t border-beck-border-light pt-3">
            {estadoCierre === "ganada" && (
              <>
                <input
                  type="number"
                  min="0"
                  placeholder="Monto final ganado"
                  value={montoFinalGanado}
                  onChange={(e) => onChangeMontoFinalGanado(e.target.value)}
                  className={inputCls}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Fecha de cierre
                  </label>
                  <input
                    type="date"
                    value={fechaCierre}
                    onChange={(e) => onChangeFechaCierre(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </>
            )}
            <input
              type="text"
              placeholder={
                estadoCierre === "ganada"
                  ? "Documento de respaldo"
                  : "Documento de respaldo (opcional)"
              }
              value={documentoRespaldo}
              onChange={(e) => onChangeDocumentoRespaldo(e.target.value)}
              className={inputCls}
            />
            <div>
              <Typography.Text className="mb-1.5 block text-xs font-medium text-slate-600">
                {estadoCierre === "ganada"
                  ? "Flujo posterior"
                  : "Flujo posterior (opcional)"}
              </Typography.Text>
              <Select
                mode="multiple"
                value={flujoPosteriorValues}
                onChange={(values) =>
                  onChangeFlujoPosterior(serializeFlujoPosterior(values))
                }
                className="w-full"
                placeholder="Selecciona uno o más flujos"
                options={flujoPosteriorSelectOptions}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="beck-btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} className="beck-btn-primary">
            Confirmar cierre
          </button>
        </div>
      </div>
    </div>
  );
};

export default CierreDeProyecto;
