import React from "react";

type CierreDeProyectoProps = {
  open: boolean;
  estadoCierre: "ganada" | "perdida" | "";
  motivoPerdida: string;
  onChangeEstado: (value: "ganada" | "perdida") => void;
  onChangeMotivo: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const radioClassName =
  "h-4 w-4 accent-[#c7a114] focus:ring-[#f6ebba]";

const CierreDeProyecto: React.FC<CierreDeProyectoProps> = ({
  open,
  estadoCierre,
  motivoPerdida,
  onChangeEstado,
  onChangeMotivo,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-beck-border-light bg-white p-5 shadow-beck-panel">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#a8860f]">
            Funnel
          </p>
          <h3 className="text-lg font-semibold text-beck-ink">
            Cierre de proyecto
          </h3>
          <p className="text-sm text-beck-muted">
            Indica si la oportunidad fue ganada o perdida.
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
        </div>

        {estadoCierre === "perdida" && (
          <textarea
            placeholder="Motivo de la perdida"
            value={motivoPerdida}
            onChange={(e) => onChangeMotivo(e.target.value)}
            className="w-full rounded-xl border border-beck-border-light p-3 text-sm text-beck-ink-soft outline-none transition focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]"
          />
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
