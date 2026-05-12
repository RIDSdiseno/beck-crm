import React from "react";

type CierreDeProyectoProps = {
  open: boolean;
  estadoCierre: "ganada" | "perdida" | "postergada" | "";
  motivoPerdida: string;
  etapaPerdida: string;
  motivoPostergacion: string;
  fechaReactivacion: string;
  documentoRespaldo: string;
  flujoPosterior: string;
  onChangeEstado: (value: "ganada" | "perdida" | "postergada") => void;
  onChangeMotivo: (value: string) => void;
  onChangeEtapaPerdida: (value: string) => void;
  onChangeMotivoPostergacion: (value: string) => void;
  onChangeFechaReactivacion: (value: string) => void;
  onChangeDocumentoRespaldo: (value: string) => void;
  onChangeFlujoPosterior: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const inputCls =
  "w-full rounded-xl border border-beck-border-light p-3 text-sm text-beck-ink-soft outline-none transition focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]";

const radioClassName = "h-4 w-4 accent-[#c7a114] focus:ring-[#f6ebba]";

const CierreDeProyecto: React.FC<CierreDeProyectoProps> = ({
  open,
  estadoCierre,
  motivoPerdida,
  etapaPerdida,
  motivoPostergacion,
  fechaReactivacion,
  documentoRespaldo,
  flujoPosterior,
  onChangeEstado,
  onChangeMotivo,
  onChangeEtapaPerdida,
  onChangeMotivoPostergacion,
  onChangeFechaReactivacion,
  onChangeDocumentoRespaldo,
  onChangeFlujoPosterior,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

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
          <div className="space-y-3">
            <textarea
              placeholder="Motivo de la perdida"
              value={motivoPerdida}
              onChange={(e) => onChangeMotivo(e.target.value)}
              className={inputCls}
              rows={3}
            />
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
          <div className="space-y-3">
            <textarea
              placeholder="Motivo de la postergacion"
              value={motivoPostergacion}
              onChange={(e) => onChangeMotivoPostergacion(e.target.value)}
              className={inputCls}
              rows={3}
            />
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
            <input
              type="text"
              placeholder="Documento de respaldo (opcional)"
              value={documentoRespaldo}
              onChange={(e) => onChangeDocumentoRespaldo(e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Flujo posterior (opcional)"
              value={flujoPosterior}
              onChange={(e) => onChangeFlujoPosterior(e.target.value)}
              className={inputCls}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="beck-btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="beck-btn-primary">
            Confirmar cierre
          </button>
        </div>
      </div>
    </div>
  );
};

export default CierreDeProyecto;
