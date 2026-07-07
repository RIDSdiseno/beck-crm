import React, { useState } from "react";
import { Button, Modal, Select } from "antd";
import {
  BellOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

type ViewMode = "funnel" | "calendario" | "dashboard";

type ResumenCardProps = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

type KanbanColumn = {
  label: string;
  total: number;
  count: number;
};

const resumen = {
  totalOportunidades: 0,
  pipelineTotal: 0,
  ganadas: 0,
  perdidas: 0,
  postergadas: 0,
  cotizacionesVinculadas: 0,
};

const columnas: KanbanColumn[] = [
  { label: "Prospecto", total: 0, count: 0 },
  { label: "Primer contacto", total: 0, count: 0 },
  { label: "Desarrollo cotización", total: 0, count: 0 },
  { label: "Cotización enviada", total: 0, count: 0 },
  { label: "Firmada", total: 0, count: 0 },
  { label: "Ganada", total: 0, count: 0 },
];

const formatCLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

const ResumenCard: React.FC<ResumenCardProps> = ({ label, value, highlight }) => (
  <div
    className={`firemat-kpi-card flex flex-col gap-1 rounded-2xl p-4 ${
      highlight ? "border-orange-300" : ""
    }`}
  >
    <p className="text-xs text-beck-muted">{label}</p>
    <p
      className={`text-2xl font-bold tabular-nums ${
        highlight ? "text-firemat-primary" : "text-beck-ink"
      }`}
    >
      {value}
    </p>
  </div>
);

const EmptyCalendar: React.FC = () => (
  <section className="firemat-panel p-4">
    <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-firemat-border bg-white/70 text-sm text-beck-muted">
      Sin actividades en calendario
    </div>
  </section>
);

const EmptyDashboard: React.FC = () => (
  <section className="firemat-panel p-4">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <ResumenCard label="Oportunidades activas" value={0} />
      <ResumenCard label="Pipeline estimado" value={formatCLP(0)} highlight />
      <ResumenCard label="Clientes con seguimiento" value={0} />
    </div>
    <div className="mt-4 flex min-h-64 items-center justify-center rounded-xl border border-dashed border-firemat-border bg-white/70 text-sm text-beck-muted">
      Sin datos para el dashboard Trager
    </div>
  </section>
);

const KanbanColumn: React.FC<{ column: KanbanColumn }> = ({ column }) => (
  <div className="flex min-h-[420px] w-[220px] shrink-0 flex-col rounded-xl border border-[#ead7d2] bg-[#fff7f5] p-3 transition-colors">
    <div className="mb-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight text-beck-ink">
          {column.label}
        </h3>
        <span className="rounded-full border border-firemat-border bg-white px-2 py-0.5 text-xs text-beck-ink-soft">
          {column.count}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium tabular-nums text-firemat-primary">
        {formatCLP(column.total)}
      </p>
    </div>

    <div className="flex flex-1 items-center justify-center pr-1">
      <p className="text-center text-xs text-beck-muted">Sin oportunidades</p>
    </div>
  </div>
);

const TragerFunnel: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("funnel");
  const [modalOpen, setModalOpen] = useState(false);

  const renderMainContent = () => {
    if (viewMode === "calendario") return <EmptyCalendar />;
    if (viewMode === "dashboard") return <EmptyDashboard />;

    return (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ResumenCard label="Total oportunidades" value={resumen.totalOportunidades} />
          <ResumenCard label="Pipeline total" value={formatCLP(resumen.pipelineTotal)} highlight />
          <ResumenCard label="Ganadas" value={resumen.ganadas} />
          <ResumenCard label="Perdidas" value={resumen.perdidas} />
          <ResumenCard label="Postergadas" value={resumen.postergadas} />
          <ResumenCard label="Cotizaciones vinculadas" value={resumen.cotizacionesVinculadas} />
        </div>

        <section className="firemat-panel p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-500">
              Unidad de negocio:
            </span>
            <Select
              size="small"
              style={{ minWidth: 160 }}
              value="Trager"
              disabled
              options={[{ value: "Trager", label: "Trager" }]}
            />
            <span className="text-xs font-medium text-slate-500">
              Estado de oportunidad:
            </span>
            <Select
              size="small"
              style={{ minWidth: 170 }}
              value="todas"
              disabled
              options={[{ value: "todas", label: "Todas" }]}
            />
            <span className="text-xs text-slate-400">0 oportunidades</span>
          </div>
        </section>

        <section className="firemat-panel bg-white" style={{ overflow: "visible" }}>
          <div style={{ overflowX: "auto", overflowY: "visible" }}>
            <div className="flex w-max flex-nowrap gap-4 p-4 pb-5">
              {columnas.map((column) => (
                <KanbanColumn key={column.label} column={column} />
              ))}
            </div>
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="space-y-5">
      <section className="firemat-panel">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="firemat-badge">
              <span>Trager</span>
              <span className="text-[10px] uppercase tracking-wide">CRM TRAGER</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Funnel Trager
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Seguimiento de oportunidades comerciales desde prospecto hasta cierre.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="firemat-tab-group">
              <button
                type="button"
                onClick={() => setViewMode("funnel")}
                className={`firemat-tab-button${viewMode === "funnel" ? " firemat-tab-button-active" : ""}`}
              >
                Funnel
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendario")}
                className={`firemat-tab-button${viewMode === "calendario" ? " firemat-tab-button-active" : ""}`}
              >
                Calendario
              </button>
              <button
                type="button"
                onClick={() => setViewMode("dashboard")}
                className={`firemat-tab-button${viewMode === "dashboard" ? " firemat-tab-button-active" : ""}`}
              >
                Dashboard
              </button>
            </div>
            <Button className="firemat-action-button" icon={<ReloadOutlined />}>
              Actualizar
            </Button>
            <Button
              className="firemat-action-button"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Crear oportunidad
            </Button>
            <Button
              className="firemat-action-button"
              icon={<BellOutlined />}
              aria-label="Notificaciones Trager"
            />
          </div>
        </div>
      </section>

      {renderMainContent()}

      <Modal
        title="Crear oportunidad Trager"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setModalOpen(false)}>
            Cerrar
          </Button>,
        ]}
      >
        <p className="text-sm text-beck-muted">
          La creación de oportunidades Trager estará disponible cuando exista
          soporte de datos para este modulo.
        </p>
      </Modal>
    </div>
  );
};

export default TragerFunnel;
