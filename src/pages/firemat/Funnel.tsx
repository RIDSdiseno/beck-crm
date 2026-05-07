import React from "react";
import { Card } from "antd";
import { ProjectOutlined, FireOutlined } from "@ant-design/icons";

const FirematFunnel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-beck-ink">
          Pipeline comercial Firemat
        </h1>
        <p className="mt-1 text-sm text-beck-muted">
          Gestión del embudo de ventas y oportunidades comerciales.
        </p>
      </div>

      <Card className="firemat-panel">
        <div className="flex items-center gap-3 text-firemat-primary">
          <ProjectOutlined style={{ fontSize: 20 }} />
          <div>
            <p className="font-semibold text-beck-ink">Pipeline en desarrollo</p>
            <p className="text-xs text-beck-muted">
              El pipeline comercial de Firemat estará disponible próximamente.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-center rounded-2xl border border-dashed border-firemat-border bg-firemat-surface p-12">
        <div className="text-center">
          <FireOutlined
            style={{ fontSize: 40, color: "var(--firemat-primary)" }}
          />
          <p className="mt-3 text-sm font-medium text-beck-ink">
            Funnel Firemat
          </p>
          <p className="mt-1 text-xs text-beck-muted">
            Próximamente: kanban de oportunidades y seguimiento de clientes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirematFunnel;
