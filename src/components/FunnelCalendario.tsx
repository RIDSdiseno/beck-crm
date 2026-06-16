import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { FunnelDeal, FunnelStage } from "../types/funnel";

type CalendarMode = "proximaAccion" | "fechaProbableCierre" | "fechaCierre";

type FunnelCalendarioProps = {
  deals: FunnelDeal[];
  onOpenDetail: (deal: FunnelDeal) => Promise<void> | void;
};

const etapaColors: Record<FunnelStage, string> = {
  prospecto: "#64748b",
  visita: "#2563eb",
  cotizacion: "#d97706",
  enviada: "#f97316",
  negociacion: "#7c3aed",
  documentacion: "#0891b2",
  cerrada: "#16a34a",
};

const etapaLabels: Record<FunnelStage, string> = {
  prospecto: "Prospecto Identificado",
  visita: "Visita / Levantamiento",
  cotizacion: "Cotizacion Elaborada",
  enviada: "Cotizacion Enviada",
  negociacion: "En Negociacion",
  documentacion: "Documentación de Venta",
  cerrada: "Cerrada",
};

const MODO_CIERRE_COLOR = "#94a3b8";

const calendarModeDescriptions: Record<CalendarMode, string> = {
  proximaAccion: "Oportunidades según próxima acción comercial.",
  fechaProbableCierre: "Oportunidades según fecha probable de cierre.",
  fechaCierre: "Oportunidades según fecha de cierre real.",
};

const normalizeDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const getProximaAccionColor = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fecha = new Date(dateStr);
  fecha.setHours(0, 0, 0, 0);
  if (fecha < today) return "#dc2626";
  if (fecha.getTime() === today.getTime()) return "#f59e0b";
  return "#2563eb";
};

export default function FunnelCalendario({
  deals,
  onOpenDetail,
}: FunnelCalendarioProps) {
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("proximaAccion");

  const events = (() => {
    if (calendarMode === "proximaAccion") {
      return deals
        .filter((deal) => normalizeDate(deal.fechaProximaAccion) !== null)
        .map((deal) => {
          const dateStr = normalizeDate(deal.fechaProximaAccion)!;
          const color = getProximaAccionColor(dateStr);
          return {
            id: deal.id,
            title: deal.nombreProyecto,
            date: dateStr,
            backgroundColor: color,
            borderColor: color,
            extendedProps: { deal, mode: calendarMode as CalendarMode },
          };
        });
    }

    if (calendarMode === "fechaCierre") {
      return deals
        .filter((deal) => normalizeDate(deal.fechaCierre) !== null)
        .map((deal) => ({
          id: deal.id,
          title: deal.nombreProyecto,
          date: normalizeDate(deal.fechaCierre)!,
          backgroundColor: MODO_CIERRE_COLOR,
          borderColor: MODO_CIERRE_COLOR,
          extendedProps: { deal, mode: calendarMode as CalendarMode },
        }));
    }

    return deals
      .filter((deal) => normalizeDate(deal.fechaProbableCierre) !== null)
      .map((deal) => ({
        id: deal.id,
        title: deal.nombreProyecto,
        date: normalizeDate(deal.fechaProbableCierre)!,
        backgroundColor: etapaColors[deal.etapa],
        borderColor: etapaColors[deal.etapa],
        extendedProps: { deal, mode: calendarMode as CalendarMode },
      }));
  })();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Calendario Beck
          </h2>
          <p className="text-sm text-slate-500">
            {calendarModeDescriptions[calendarMode]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
            Ver calendario por:
          </span>
          <select
            value={calendarMode}
            onChange={(e) => setCalendarMode(e.target.value as CalendarMode)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]"
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
        buttonText={{
          today: "Hoy",
        }}
        events={events}
        eventClick={(info) => {
          const deal = info.event.extendedProps.deal as FunnelDeal;
          void onOpenDetail(deal);
        }}
        eventContent={(eventInfo) => {
          const deal = eventInfo.event.extendedProps.deal as FunnelDeal;
          const mode = eventInfo.event.extendedProps.mode as CalendarMode;

          return (
            <div className="px-1 py-0.5">
              <div className="truncate text-[11px] font-semibold">
                {eventInfo.event.title}
              </div>
              {deal.empresa ? (
                <div className="truncate text-[10px] opacity-90">
                  {deal.empresa}
                </div>
              ) : null}
              {mode === "proximaAccion" && deal.proximaAccion ? (
                <div className="truncate text-[10px] opacity-90">
                  {deal.proximaAccion}
                </div>
              ) : null}
              {mode === "fechaCierre" && deal.estadoCierre ? (
                <div className="truncate text-[10px] opacity-90 capitalize">
                  {deal.estadoCierre}
                </div>
              ) : null}
              <div className="truncate text-[10px] opacity-90">
                {etapaLabels[deal.etapa]}
              </div>
            </div>
          );
        }}
        dayMaxEvents={true}
        fixedWeekCount={false}
      />
    </div>
  );
}
