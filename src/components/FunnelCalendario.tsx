import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { FunnelDeal, FunnelStage } from "../types/funnel";

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
  cerrada: "#16a34a",
};

const etapaLabels: Record<FunnelStage, string> = {
  prospecto: "Prospecto Identificado",
  visita: "Visita / Levantamiento",
  cotizacion: "Cotizacion Elaborada",
  enviada: "Cotizacion Enviada",
  negociacion: "En Negociacion",
  cerrada: "Cerrada",
};

const normalizeDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

export default function FunnelCalendario({
  deals,
  onOpenDetail,
}: FunnelCalendarioProps) {
  const dealsConFecha = deals.filter(
    (deal) => normalizeDate(deal.fechaProbableCierre) !== null
  );

  const events = dealsConFecha.map((deal) => ({
    id: deal.id,
    title: deal.nombreProyecto,
    date: normalizeDate(deal.fechaProbableCierre)!,
    backgroundColor: etapaColors[deal.etapa],
    borderColor: etapaColors[deal.etapa],
    extendedProps: {
      deal,
    },
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Calendario Beck
        </h2>
        <p className="text-sm text-slate-500">
          Oportunidades segun fecha probable de cierre.
        </p>
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
