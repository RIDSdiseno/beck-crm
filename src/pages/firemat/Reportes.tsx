import React from "react";
import { Card } from "antd";
import { BarChartOutlined, FireOutlined } from "@ant-design/icons";

const FirematReportes: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-beck-ink">
          Reportes comerciales e inventario Firemat
        </h1>
        <p className="mt-1 text-sm text-beck-muted">
          Análisis de ventas, stock y rendimiento comercial.
        </p>
      </div>

      <Card className="firemat-panel">
        <div className="flex items-center gap-3 text-firemat-primary">
          <BarChartOutlined style={{ fontSize: 20 }} />
          <div>
            <p className="font-semibold text-beck-ink">Módulo en desarrollo</p>
            <p className="text-xs text-beck-muted">
              Los reportes de Firemat estarán disponibles próximamente.
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
            Reportes Firemat
          </p>
          <p className="mt-1 text-xs text-beck-muted">
            Próximamente: reportes de ventas, inventario y KPIs comerciales.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirematReportes;
