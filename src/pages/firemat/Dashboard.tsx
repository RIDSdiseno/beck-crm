import React, { useEffect, useState } from "react";
import { Card, message } from "antd";
import {
  FireOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { firematInventarioAPI, firematVentasAPI } from "../../services/api";

const formatCLP = (v: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v);

const FirematDashboard: React.FC = () => {
  const [productosEnStock, setProductosEnStock] = useState<number | null>(null);
  const [montoVentasMes, setMontoVentasMes] = useState<number | null>(null);
  const [cantidadVentasMes, setCantidadVentasMes] = useState<number | null>(null);

  useEffect(() => {
    firematInventarioAPI
      .listar()
      .then((res) => {
        setProductosEnStock(res.resumen.productosActivos ?? res.resumen.totalProductos ?? 0);
      })
      .catch(() => {
        void message.error("Error cargando dashboard");
      });
  }, []);

  useEffect(() => {
    firematVentasAPI
      .listar()
      .then((res) => {
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();

        const ventasDelMes = res.data.filter((v) => {
          const fecha = new Date(v.createdAt);
          return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
        });

        const monto = ventasDelMes.reduce((acc, v) => acc + Number(v.total || 0), 0);
        setMontoVentasMes(monto);
        setCantidadVentasMes(ventasDelMes.length);
      })
      .catch(() => {
        void message.error("Error cargando ventas");
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-beck-ink">
          Centro de mando Firemat
        </h1>
        <p className="mt-1 text-sm text-beck-muted">
          Control de ventas, cotizaciones, stock y distribución.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
          <div className="flex items-center gap-2 text-firemat-primary">
            <AppstoreOutlined />
            <span className="text-xs text-beck-muted">Productos en stock</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-beck-ink">
            {productosEnStock === null ? "..." : productosEnStock}
          </p>
        </Card>

        <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
          <div className="flex items-center gap-2 text-firemat-primary">
            <ShoppingCartOutlined />
            <span className="text-xs text-beck-muted">Ventas del mes</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-beck-ink">
            {montoVentasMes === null ? "..." : formatCLP(montoVentasMes)}
          </p>
          {cantidadVentasMes !== null && (
            <p className="mt-0.5 text-xs text-beck-muted">
              {cantidadVentasMes} {cantidadVentasMes === 1 ? "venta" : "ventas"}
            </p>
          )}
        </Card>

        <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
          <div className="flex items-center gap-2 text-firemat-primary">
            <FireOutlined />
            <span className="text-xs text-beck-muted">Cotizaciones activas</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-beck-ink">—</p>
        </Card>

        <Card className="firemat-kpi-card" styles={{ body: { padding: "16px" } }}>
          <div className="flex items-center gap-2 text-firemat-primary">
            <BarChartOutlined />
            <span className="text-xs text-beck-muted">Reportes pendientes</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-beck-ink">—</p>
        </Card>
      </div>

      <Card className="firemat-panel">
        <div className="flex items-center gap-3 text-firemat-primary">
          <FireOutlined style={{ fontSize: 20 }} />
          <div>
            <p className="font-semibold text-beck-ink">Módulo en desarrollo</p>
            <p className="text-xs text-beck-muted">
              El dashboard de Firemat estará disponible próximamente con datos
              en tiempo real de ventas, stock e inventario.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FirematDashboard;
