import React from "react";
import {
  ApartmentOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const kpis = [
  { label: "Total oportunidades", value: 0, icon: <ProjectOutlined /> },
  { label: "Oportunidades activas", value: 0, icon: <ApartmentOutlined /> },
  { label: "Clientes", value: 0, icon: <TeamOutlined /> },
  { label: "Cotizaciones pendientes", value: 0, icon: <FileTextOutlined /> },
];

const TragerDashboard: React.FC = () => (
  <div className="space-y-4">
    <section className="firemat-panel px-5 py-4">
      <div className="firemat-badge">
        <span>Trager</span>
        <span className="text-[10px] uppercase tracking-wide">CRM TRAGER</span>
      </div>
      <h1 className="mt-2 text-xl font-semibold text-beck-ink">
        Centro de mando Trager
      </h1>
      <p className="mt-1 text-sm text-beck-muted">
        Seguimiento comercial de oportunidades y clientes Trager.
      </p>
    </section>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="firemat-kpi-card p-4">
          <div className="flex items-center gap-2 text-firemat-primary">
            {kpi.icon}
            <span className="text-xs text-beck-muted">{kpi.label}</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-beck-ink">
            {kpi.value}
          </p>
          <p className="mt-1 text-[11px] text-beck-muted">datos locales temporales</p>
        </div>
      ))}
    </section>

    <section className="firemat-panel p-5">
      <h2 className="text-sm font-semibold text-beck-ink">Resumen comercial</h2>
      <div className="mt-4 flex min-h-40 items-center justify-center rounded-lg border border-dashed border-firemat-border bg-white/60 text-sm text-beck-muted">
        Sin actividad registrada
      </div>
    </section>
  </div>
);

export default TragerDashboard;
