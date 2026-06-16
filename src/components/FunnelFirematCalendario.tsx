import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { FirematFunnelEtapa, FirematFunnelOportunidad } from "../services/api";

type CalendarMode = "proximaAccion" | "fechaProbableCierre" | "fechaCierre";

type FunnelFirematCalendarioProps = {
  oportunidades: FirematFunnelOportunidad[];
  onOpenDetail: (oportunidad: FirematFunnelOportunidad) => Promise<void> | void;
};

// fechaCierre no está en el tipo oficial pero puede llegar del backend en etapas cerradas
type OportunidadConFechaCierre = FirematFunnelOportunidad & {
  fechaCierre?: string | null;
};

const ETAPA_COLORS: Record<FirematFunnelEtapa, string> = {
  PROSPECTO: "#6b7280",
  PRIMER_CONTACTO: "#2563eb",
  DESARROLLO_COTIZACION: "#7c3aed",
  COTIZACION_ENVIADA: "#d97706",
  ORDEN_CONFIRMADA: "#0891b2",
  GANADA: "#16a34a",
  PERDIDA: "#dc2626",
  POSTERGADA: "#9333ea",
  DESCARTADO: "#64748b",
};

const ETAPA_LABELS: Record<FirematFunnelEtapa, string> = {
  PROSPECTO: "Prospecto",
  PRIMER_CONTACTO: "Primer contacto",
  DESARROLLO_COTIZACION: "Desarrollo cotización",
  COTIZACION_ENVIADA: "Cotización enviada",
  ORDEN_CONFIRMADA: "Firmada",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
  POSTERGADA: "Postergada",
  DESCARTADO: "Descartado",
};

const FIREMAT_COLOR = "#ea580c";
const CIERRE_COLOR = "#94a3b8";

const MODE_DESCRIPTIONS: Record<CalendarMode, string> = {
  proximaAccion: "Oportunidades según próxima acción comercial.",
  fechaProbableCierre: "Oportunidades según fecha probable de cierre.",
  fechaCierre: "Oportunidades según fecha de cierre real.",
};

const normalizeDate = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const proximaAccionColor = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fecha = new Date(dateStr);
  fecha.setHours(0, 0, 0, 0);
  if (fecha < today) return "#dc2626";
  if (fecha.getTime() === today.getTime()) return FIREMAT_COLOR;
  return "#2563eb";
};

export default function FunnelFirematCalendario({
  oportunidades,
  onOpenDetail,
}: FunnelFirematCalendarioProps) {
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("proximaAccion");

  const events = (() => {
    if (calendarMode === "proximaAccion") {
      return oportunidades
        .filter((o) => normalizeDate(o.fechaProximaAccion) !== null)
        .map((o) => {
          const dateStr = normalizeDate(o.fechaProximaAccion)!;
          const color = proximaAccionColor(dateStr);
          return {
            id: o.id,
            title: o.nombreOportunidad ?? o.cliente,
            date: dateStr,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { oportunidad: o, mode: calendarMode },
          };
        });
    }

    if (calendarMode === "fechaCierre") {
      return (oportunidades as OportunidadConFechaCierre[])
        .filter((o) => normalizeDate(o.fechaCierre) !== null)
        .map((o) => ({
          id: o.id,
          title: o.nombreOportunidad ?? o.cliente,
          date: normalizeDate(o.fechaCierre)!,
          backgroundColor: CIERRE_COLOR,
          borderColor: CIERRE_COLOR,
          extendedProps: { oportunidad: o, mode: calendarMode },
        }));
    }

    return oportunidades
      .filter((o) => normalizeDate(o.fechaProbableCierre) !== null)
      .map((o) => {
        const color = ETAPA_COLORS[o.etapa] ?? FIREMAT_COLOR;
        return {
          id: o.id,
          title: o.nombreOportunidad ?? o.cliente,
          date: normalizeDate(o.fechaProbableCierre)!,
          backgroundColor: color,
          borderColor: color,
          extendedProps: { oportunidad: o, mode: calendarMode },
        };
      });
  })();

  return (
    <div className="rounded-2xl border border-[#ead7d2] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-beck-ink">
            Calendario Firemat
          </h2>
          <p className="text-sm text-beck-muted">
            {MODE_DESCRIPTIONS[calendarMode]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm font-medium text-slate-600">
            Ver calendario por:
          </span>
          <select
            value={calendarMode}
            onChange={(e) => setCalendarMode(e.target.value as CalendarMode)}
            className="rounded-lg border border-[#ead7d2] bg-white px-3 py-1.5 text-sm text-beck-ink outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="proximaAccion">Próximas acciones</option>
            <option value="fechaProbableCierre">Fecha probable de cierre</option>
            <option value="fechaCierre">Fecha de cierre real</option>
          </select>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="es"
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        buttonText={{ today: "Hoy" }}
        events={events}
        eventClick={(info) => {
          const oportunidad = info.event.extendedProps
            .oportunidad as FirematFunnelOportunidad;
          void onOpenDetail(oportunidad);
        }}
        eventContent={(eventInfo) => {
          const o = eventInfo.event.extendedProps
            .oportunidad as FirematFunnelOportunidad;
          const mode = eventInfo.event.extendedProps.mode as CalendarMode;
          const etapaLabel = ETAPA_LABELS[o.etapa] ?? o.etapa;
          const motivo =
            o.motivoPerdida ?? o.motivoDescarte ?? o.motivoPostergacion;

          return (
            <div className="px-1 py-0.5">
              <div className="truncate text-[11px] font-semibold">
                {eventInfo.event.title}
              </div>
              {o.cliente ? (
                <div className="truncate text-[10px] opacity-90">{o.cliente}</div>
              ) : null}
              {mode === "proximaAccion" && o.proximaAccion ? (
                <div className="truncate text-[10px] opacity-90">
                  {o.proximaAccion}
                </div>
              ) : null}
              {mode === "fechaCierre" && motivo ? (
                <div className="truncate text-[10px] capitalize opacity-90">
                  {motivo}
                </div>
              ) : null}
              <div className="truncate text-[10px] opacity-90">{etapaLabel}</div>
            </div>
          );
        }}
        dayMaxEvents={true}
        fixedWeekCount={false}
      />
    </div>
  );
}
