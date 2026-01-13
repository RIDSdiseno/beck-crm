// src/pages/Dashboard.tsx
import React, { useMemo, useState } from "react";
import { Card, Segmented, Tag } from "antd";
import { motion } from "framer-motion";
import {
  FireOutlined,
  DeploymentUnitOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ApartmentOutlined,
  AimOutlined,
} from "@ant-design/icons";
import type { ThemeMode } from "../hooks/useSystemTheme";

type DashboardProps = {
  themeMode: ThemeMode; // se recibe, pero el tema es siempre claro
};

type TimeRange = "Hoy" | "Semana" | "Mes" | "Obra completa";

const baseKpis = {
  total: 1280,
  ponderados: 1725,
  hoy: 46,
  frentes: 6,
};

const floorData = [
  { id: "S-1", label: "Subterráneo -1", progress: 82, sellos: 310 },
  { id: "P1", label: "Piso 1", progress: 64, sellos: 420 },
  { id: "P2", label: "Piso 2", progress: 51, sellos: 295 },
  { id: "P3", label: "Piso 3", progress: 39, sellos: 255 },
];

const teams = [
  { nombre: "Equipo Norte", piso: "Piso 2", sellos: 138, factor: 1.24 },
  { nombre: "Equipo Sur", piso: "Piso 1", sellos: 112, factor: 1.18 },
  { nombre: "Equipo Subterráneo", piso: "S-1", sellos: 94, factor: 1.41 },
  { nombre: "Equipo Estructuras", piso: "Piso 3", sellos: 76, factor: 1.32 },
];

const timeRangeOptions: TimeRange[] = [
  "Hoy",
  "Semana",
  "Mes",
  "Obra completa",
];

const Dashboard: React.FC<DashboardProps> = ({ themeMode }) => {
  // solo para compatibilidad
  void themeMode;

  const [timeRange, setTimeRange] = useState<TimeRange>("Hoy");
  const [selectedFloor, setSelectedFloor] = useState<string>("P1");

  const kpis = useMemo(() => {
    const factor =
      timeRange === "Hoy"
        ? 1
        : timeRange === "Semana"
        ? 4.2
        : timeRange === "Mes"
        ? 18
        : 1; // Obra completa = base

    return {
      total:
        timeRange === "Obra completa"
          ? baseKpis.total
          : Math.round((baseKpis.total / 18) * factor),
      ponderados:
        timeRange === "Obra completa"
          ? baseKpis.ponderados
          : Math.round((baseKpis.ponderados / 18) * factor),
      hoy:
        timeRange === "Hoy"
          ? baseKpis.hoy
          : Math.round(baseKpis.hoy * factor),
      frentes: baseKpis.frentes,
    };
  }, [timeRange]);

  const selectedFloorData = floorData.find((f) => f.id === selectedFloor);

  return (
    <div className="space-y-6 pb-4">
      {/* Header + selector de rango */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold tracking-wide text-slate-900">
            Centro de mando de la obra
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-600 max-w-xl">
            Controla el avance de los sellos cortafuego y juntas de protección
            pasiva por rango de tiempo, piso y equipo. Datos mock listos para
            microservicios.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <span className="text-[11px] text-slate-600">Vista</span>
          <Segmented
            size="small"
            className="bg-amber-50/70 text-xs border border-amber-100 rounded-full w-full sm:w-auto"
            options={timeRangeOptions}
            value={timeRange}
            onChange={(value) => setTimeRange(value as TimeRange)}
          />
        </div>
      </div>

      {/* KPIs principales con iconos (paleta fuego + azul BECK) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            id: "total",
            label: "Sellos ejecutados",
            value: kpis.total,
            helper:
              timeRange === "Obra completa"
                ? "Total acumulado en la obra"
                : `Acumulado en la vista: ${timeRange.toLowerCase()}`,
            accent: "text-orange-700",
            iconBg: "bg-amber-100",
            barWidth: "w-4/5",
            icon: <FireOutlined />,
          },
          {
            id: "ponderados",
            label: "Sellos ponderados",
            value: kpis.ponderados,
            helper: "Incluye factores por holgura y tipo de cielo",
            accent: "text-red-700",
            iconBg: "bg-rose-100",
            barWidth: "w-full",
            icon: <DeploymentUnitOutlined />,
          },
          {
            id: "hoy",
            label: "Producción de la vista",
            value: kpis.hoy,
            helper: `Sellos registrados en la vista: ${timeRange.toLowerCase()}`,
            accent: "text-amber-700",
            iconBg: "bg-amber-100",
            barWidth: "w-2/5",
            icon: <ThunderboltOutlined />,
          },
          {
            id: "frentes",
            label: "Frentes activos",
            value: kpis.frentes,
            helper: "Equipos ejecutando sellos actualmente",
            accent: "text-sky-800", // azul tipo BECK
            iconBg: "bg-sky-100",
            barWidth: "w-1/3",
            icon: <TeamOutlined />,
          },
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.25 }}
            whileHover={{
              y: -4,
              boxShadow: "0 20px 45px rgba(15,23,42,0.18)", // glow azul/fuego
            }}
          >
            <Card
              className="relative overflow-hidden border bg-gradient-to-br from-[#fefce8] via-[#fffbeb] to-[#fef9c3] border-amber-200/80"
              styles={{
                body: { padding: 14 },
              }}
            >
              {/* franja superior azul/fuego tipo BECK */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f172a] via-[#f97316] to-[#facc15]" />

              {/* Glow tipo brasa */}
              <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full blur-2xl bg-orange-300/35" />

              <div className="flex items-start justify-between gap-2 pt-1.5 relative z-10">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-amber-700/90 truncate">
                    {kpi.label}
                  </p>
                  <motion.p
                    key={`${kpi.id}-${timeRange}`}
                    className={`mt-1.5 text-2xl sm:text-3xl font-semibold ${kpi.accent}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {kpi.value.toLocaleString("es-CL")}
                  </motion.p>
                </div>
                <div
                  className={`h-9 w-9 rounded-full ${kpi.iconBg} flex items-center justify-center text-sm text-orange-700 shadow-inner flex-shrink-0`}
                >
                  {kpi.icon}
                </div>
              </div>

              <p className="text-[11px] mt-1 relative z-10 text-slate-700 line-clamp-2">
                {kpi.helper}
              </p>

              {/* mini barra */}
              <div className="mt-2.5 h-1 w-full rounded-full bg-slate-200/80 overflow-hidden relative z-10">
                <div
                  className={`h-full rounded-full ${kpi.barWidth} ${
                    kpi.id === "total"
                      ? "bg-gradient-to-r from-orange-500 to-red-500"
                      : kpi.id === "ponderados"
                      ? "bg-gradient-to-r from-red-500 to-rose-500"
                      : kpi.id === "hoy"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-gradient-to-r from-sky-600 to-amber-400"
                  }`}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Zona inferior: mapa de pisos + equipos */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,1.1fr] gap-4">
        {/* Mapa de pisos */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card
            className="border bg-white border-amber-100"
            title={
              <div className="flex items-center gap-2 text-sm">
                <ApartmentOutlined className="text-orange-600" />
                <span>Mapa rápido de la obra</span>
              </div>
            }
            styles={{
              header: {
                backgroundColor: "#fff7ed", // amber-50
                color: "#020617",
                borderBottom: "1px solid #fed7aa", // amber-200
                fontSize: 13,
              },
              body: { padding: 14 },
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1.2fr] gap-4">
              {/* Tarjetas de pisos */}
              <div className="space-y-2">
                {floorData.map((floor) => {
                  const active = floor.id === selectedFloor;
                  return (
                    <motion.button
                      key={floor.id}
                      onClick={() => setSelectedFloor(floor.id)}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full rounded-xl px-3 py-2.5 flex items-center justify-between border text-left transition ${
                        active
                          ? "border-transparent bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 text-white shadow-md"
                          : "border-amber-100 bg-amber-50/40 hover:border-orange-300/80 hover:bg-amber-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs ${
                            active
                              ? "bg-white/15 text-white"
                              : "bg-amber-100 text-orange-700"
                          }`}
                        >
                          <AimOutlined />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              active ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {floor.label}
                          </p>
                          <p
                            className={`text-[11px] ${
                              active ? "text-amber-100/90" : "text-slate-700"
                            }`}
                          >
                            {floor.sellos} sellos ejecutados
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span
                          className={`text-xs font-semibold ${
                            active ? "text-white" : "text-orange-700"
                          }`}
                        >
                          {floor.progress}%
                        </span>
                        <div
                          className={`mt-1 h-1 w-16 rounded-full ${
                            active ? "bg-white/30" : "bg-slate-200"
                          } overflow-hidden`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                            style={{ width: `${floor.progress}%` }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Detalle del piso seleccionado */}
              {selectedFloorData && (
                <div className="rounded-xl border border-dashed border-orange-300 bg-gradient-to-br from-white via-amber-50 to-orange-50 p-3 text-xs">
                  <p className="text-[11px] uppercase tracking-wide mb-2 text-amber-700/90">
                    Detalle del piso seleccionado
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedFloorData.label}
                  </p>
                  <p className="text-[11px] mt-1 text-slate-700">
                    {selectedFloorData.sellos} sellos registrados en el
                    itemizado, con un avance estimado de{" "}
                    <span className="font-semibold text-orange-700">
                      {selectedFloorData.progress}%
                    </span>{" "}
                    respecto a la meta del proyecto.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-700">
                        Sellos estándar (F = 1)
                      </span>
                      <span className="font-semibold text-slate-800">
                        ~55%
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-700">
                        Holguras medias (F = 1,2 / 1,4)
                      </span>
                      <span className="font-semibold text-slate-800">
                        ~35%
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-700">
                        Holguras críticas (F = 1,8)
                      </span>
                      <span className="font-semibold text-slate-800">
                        ~10%
                      </span>
                    </li>
                  </ul>
                  <p className="mt-3 text-[10px] text-amber-800/80">
                    Datos simulados que luego se reemplazarán por consultas al
                    microservicio de reportes (por piso, factor y tipo de
                    solución cortafuego).
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Rendimiento por equipo */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card
            className="border bg-gradient-to-br from-white via-amber-50/50 to-orange-50/40 border-amber-200"
            title={
              <div className="flex items-center gap-2 text-sm">
                <TeamOutlined className="text-orange-600" />
                <span>Rendimiento por equipo</span>
              </div>
            }
            styles={{
              header: {
                backgroundColor: "#fff7ed",
                color: "#020617",
                borderBottom: "1px solid #fed7aa",
                fontSize: 13,
              },
              body: { padding: 14 },
            }}
          >
            <ul className="text-xs space-y-2">
              {teams.map((team, idx) => (
                <motion.li
                  key={team.nombre}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-orange-100/60 cursor-default"
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {team.nombre}
                    </p>
                    <p className="text-[11px] text-slate-700">
                      {team.piso} · {team.sellos} sellos registrados
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Tag
                      color={team.factor > 1.3 ? "volcano" : "green"}
                      style={{ fontSize: 11, paddingInline: 8 }}
                    >
                      F prom: {team.factor.toFixed(2)}
                    </Tag>
                  </div>
                </motion.li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-700">
              Identifica qué equipos están enfrentando holguras más exigentes y
              frentes críticos, para priorizar supervisión y apoyo técnico en la
              protección pasiva contra incendios.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
