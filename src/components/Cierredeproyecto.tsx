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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-md space-y-4 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">
          Cierre de proyecto
        </h3>

        <p className="text-sm text-slate-500">
          Indica si la oportunidad fue ganada o perdida.
        </p>

        <div className="space-y-2 text-sm">
          <label className="flex gap-2">
            <input
              type="radio"
              value="ganada"
              checked={estadoCierre === "ganada"}
              onChange={() => onChangeEstado("ganada")}
            />
            Ganada
          </label>

          <label className="flex gap-2">
            <input
              type="radio"
              value="perdida"
              checked={estadoCierre === "perdida"}
              onChange={() => onChangeEstado("perdida")}
            />
            Perdida
          </label>
        </div>

        {estadoCierre === "perdida" && (
          <textarea
            placeholder="Motivo de la pérdida"
            value={motivoPerdida}
            onChange={(e) => onChangeMotivo(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm"
          >
            Confirmar cierre
          </button>
        </div>
      </div>
    </div>
  );
};

export default CierreDeProyecto;