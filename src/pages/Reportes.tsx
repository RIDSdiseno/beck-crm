// src/pages/Reportes.tsx
import React, { useMemo } from "react";
import { Card, Table, Tag, Segmented, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BarChartOutlined,
  PartitionOutlined,
  FireOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

import type { ThemeMode } from "../hooks/useSystemTheme";
import type { RegistroSello } from "../types/registroSello";

type ReportesProps = {
  themeMode: ThemeMode;
};

type ResumenItemizado = {
  key: string;
  codigo: string;
  descripcion: string;
  totalSellos: number;
  totalPonderado: number;
  pisos: string;
};

type ResumenSellador = {
  key: string;
  nombre: string;
  totalSellos: number;
  totalPonderado: number;
  registros: number;
  pisos: string;
  ultimoTrabajo: string;
};

type ResumenPiso = {
  name: string;
  sellos: number;
};

// --- Tipos y mock para Junta lineal ESPUMA ---
type RegistroEspuma = {
  id: number;
  tramo: string;
  piso: string;
  metros: number;
  cuadrilla: string;
  fecha: string; // YYYY-MM-DD
};

type ResumenEspumaTabla = {
  key: string;
  tramo: string;
  piso: string;
  metros: number;
  cuadrilla: string;
  fecha: string;
};

type ResumenEspumaPiso = {
  name: string;
  metros: number;
};

const COLORS = [
  "#38bdf8",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#f43f5e",
  "#a855f7",
];

const Reportes: React.FC<ReportesProps> = ({ themeMode }) => {
  const isDark = themeMode === "dark";

  // --- MOCK sellos (RegistroSello) ---
  const registros: RegistroSello[] = [
    {
      id: 1,
      itemizadoBeck: "BECK-001",
      itemizadoSacyr: "SACYR-A12",
      fechaEjecucion: dayjs().subtract(2, "day").format("YYYY-MM-DD"),
      dia: dayjs().subtract(2, "day").format("dddd"),
      piso: "Piso 1",
      ejeAlfabetico: "A",
      ejeNumerico: "10",
      nombreSellador: "Juan Pérez",
      fotoUrl:
        "https://res.cloudinary.com/dvqpmttci/image/upload/v1762883986/T1840G5i78GB500GBW10P_2_Supersize_hlt6je.jpg",
      recinto: "Sala bombas",
      numeroSello: "S-0001",
      cantidadSellos: 6,
      holguraCm: 4,
      factorHolgura: 1.4,
      cieloModular: 2,
      cantidadSellosConFactor: 6 * 1.4,
      observaciones: "Sector crítico por recorrido de evacuación.",
    },
    {
      id: 2,
      itemizadoBeck: "BECK-002",
      itemizadoSacyr: "SACYR-A13",
      fechaEjecucion: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      dia: dayjs().subtract(1, "day").format("dddd"),
      piso: "Piso 2",
      ejeAlfabetico: "B",
      ejeNumerico: "12",
      nombreSellador: "Carla Gómez",
      fotoUrl:
        "https://res.cloudinary.com/dvqpmttci/image/upload/v1762883986/T1840G5i78GB500GBW10P_2_Supersize_hlt6je.jpg",
      recinto: "Pasillo principal",
      numeroSello: "S-0010",
      cantidadSellos: 4,
      holguraCm: 2,
      factorHolgura: 1.2,
      cieloModular: 1,
      cantidadSellosConFactor: 4 * 1.2,
      observaciones: "Sellos en bandejas eléctricas.",
    },
    {
      id: 3,
      itemizadoBeck: "BECK-003",
      itemizadoSacyr: "SACYR-B05",
      fechaEjecucion: dayjs().format("YYYY-MM-DD"),
      dia: dayjs().format("dddd"),
      piso: "Subterráneo -1",
      ejeAlfabetico: "C",
      ejeNumerico: "5",
      nombreSellador: "Equipo estructuras",
      fotoUrl:
        "https://res.cloudinary.com/dvqpmttci/image/upload/v1762883986/T1840G5i78GB500GBW10P_2_Supersize_hlt6je.jpg",
      recinto: "Sala máquinas",
      numeroSello: "S-0200",
      cantidadSellos: 8,
      holguraCm: 7,
      factorHolgura: 1.8,
      cieloModular: 3,
      cantidadSellosConFactor: 8 * 1.8,
      observaciones: "Holguras mayores, revisar en próxima inspección.",
    },
  ];

  // --- MOCK Junta lineal · ESPUMA ---
  const registrosEspuma: RegistroEspuma[] = [
    {
      id: 1,
      tramo: "JL-ESP-001",
      piso: "Piso 1",
      metros: 12.5,
      cuadrilla: "Equipo espuma 1",
      fecha: dayjs().subtract(3, "day").format("YYYY-MM-DD"),
    },
    {
      id: 2,
      tramo: "JL-ESP-010",
      piso: "Piso 2",
      metros: 8.3,
      cuadrilla: "Equipo espuma 2",
      fecha: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
    },
    {
      id: 3,
      tramo: "JL-ESP-020",
      piso: "Subterráneo -1",
      metros: 15.1,
      cuadrilla: "Equipo espuma 1",
      fecha: dayjs().format("YYYY-MM-DD"),
    },
  ];

  // --- Agrupadores BECK / SACYR ---
  const resumenBeck: ResumenItemizado[] = useMemo(() => {
    const mapa = new Map<
      string,
      { totalSellos: number; totalPonderado: number; pisos: Set<string> }
    >();

    registros.forEach((r) => {
      const key = r.itemizadoBeck;
      if (!mapa.has(key)) {
        mapa.set(key, {
          totalSellos: 0,
          totalPonderado: 0,
          pisos: new Set(),
        });
      }
      const entry = mapa.get(key)!;
      entry.totalSellos += r.cantidadSellos;
      entry.totalPonderado += r.cantidadSellosConFactor;
      entry.pisos.add(r.piso);
    });

    return Array.from(mapa.entries()).map(([codigo, v]) => ({
      key: codigo,
      codigo,
      descripcion: `Ítem ${codigo} BECK`,
      totalSellos: v.totalSellos,
      totalPonderado: v.totalPonderado,
      pisos: Array.from(v.pisos).join(" · "),
    }));
  }, [registros]);

  const resumenSacyr: ResumenItemizado[] = useMemo(() => {
    const mapa = new Map<
      string,
      { totalSellos: number; totalPonderado: number; pisos: Set<string> }
    >();

    registros.forEach((r) => {
      const key = r.itemizadoSacyr;
      if (!mapa.has(key)) {
        mapa.set(key, {
          totalSellos: 0,
          totalPonderado: 0,
          pisos: new Set(),
        });
      }
      const entry = mapa.get(key)!;
      entry.totalSellos += r.cantidadSellos;
      entry.totalPonderado += r.cantidadSellosConFactor;
      entry.pisos.add(r.piso);
    });

    return Array.from(mapa.entries()).map(([codigo, v]) => ({
      key: codigo,
      codigo,
      descripcion: `Ítem ${codigo} SACYR`,
      totalSellos: v.totalSellos,
      totalPonderado: v.totalPonderado,
      pisos: Array.from(v.pisos).join(" · "),
    }));
  }, [registros]);

  // --- Agrupador por Sellador ---
  const resumenSellador: ResumenSellador[] = useMemo(() => {
    const mapa = new Map<
      string,
      {
        totalSellos: number;
        totalPonderado: number;
        registros: number;
        pisos: Set<string>;
        ultimoTrabajo: string;
      }
    >();

    registros.forEach((r) => {
      const key = r.nombreSellador || "Sin sellador";
      if (!mapa.has(key)) {
        mapa.set(key, {
          totalSellos: 0,
          totalPonderado: 0,
          registros: 0,
          pisos: new Set(),
          ultimoTrabajo: r.fechaEjecucion,
        });
      }
      const entry = mapa.get(key)!;
      entry.totalSellos += r.cantidadSellos;
      entry.totalPonderado += r.cantidadSellosConFactor;
      entry.registros += 1;
      entry.pisos.add(r.piso);

      if (dayjs(r.fechaEjecucion).isAfter(dayjs(entry.ultimoTrabajo))) {
        entry.ultimoTrabajo = r.fechaEjecucion;
      }
    });

    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({
        key: nombre,
        nombre,
        totalSellos: v.totalSellos,
        totalPonderado: v.totalPonderado,
        registros: v.registros,
        pisos: Array.from(v.pisos).join(" · "),
        ultimoTrabajo: dayjs(v.ultimoTrabajo).format("DD-MM-YYYY"),
      }))
      .sort((a, b) => b.totalSellos - a.totalSellos);
  }, [registros]);

  // --- Métricas principales sellos ---
  const totalBeck = useMemo(
    () => resumenBeck.reduce((acc, r) => acc + r.totalPonderado, 0),
    [resumenBeck]
  );
  const totalSacyr = useMemo(
    () => resumenSacyr.reduce((acc, r) => acc + r.totalPonderado, 0),
    [resumenSacyr]
  );

  const totalSellos = useMemo(
    () => registros.reduce((acc, r) => acc + r.cantidadSellos, 0),
    [registros]
  );
  const totalRegistros = registros.length;
  const totalSelladores = resumenSellador.length;
  const promedioSellosRegistro = totalRegistros
    ? totalSellos / totalRegistros
    : 0;

  const pisosUnicos = useMemo(
    () => new Set(registros.map((r) => r.piso)).size,
    [registros]
  );

  // --- Métricas Junta lineal ESPUMA ---
  const totalMetrosEspuma = useMemo(
    () => registrosEspuma.reduce((acc, r) => acc + r.metros, 0),
    [registrosEspuma]
  );
  const totalTramosEspuma = registrosEspuma.length;
  const totalCuadrillasEspuma = useMemo(
    () => new Set(registrosEspuma.map((r) => r.cuadrilla)).size,
    [registrosEspuma]
  );

  const chartSellosPorSellador = useMemo(
    () =>
      resumenSellador.map((s) => ({
        name: s.nombre,
        sellos: s.totalSellos,
        ponderado: Number(s.totalPonderado.toFixed(1)),
      })),
    [resumenSellador]
  );

  const chartSellosPorPiso: ResumenPiso[] = useMemo(() => {
    const mapa = new Map<string, number>();
    registros.forEach((r) => {
      mapa.set(r.piso, (mapa.get(r.piso) || 0) + r.cantidadSellos);
    });
    return Array.from(mapa.entries()).map(([name, sellos]) => ({
      name,
      sellos,
    }));
  }, [registros]);

  const chartEspumaPorPiso: ResumenEspumaPiso[] = useMemo(() => {
    const mapa = new Map<string, number>();
    registrosEspuma.forEach((r) => {
      mapa.set(r.piso, (mapa.get(r.piso) || 0) + r.metros);
    });
    return Array.from(mapa.entries()).map(([name, metros]) => ({
      name,
      metros,
    }));
  }, [registrosEspuma]);

  const dataEspumaTabla: ResumenEspumaTabla[] = useMemo(
    () =>
      registrosEspuma.map((r) => ({
        key: r.tramo,
        tramo: r.tramo,
        piso: r.piso,
        metros: r.metros,
        cuadrilla: r.cuadrilla,
        fecha: dayjs(r.fecha).format("DD-MM-YYYY"),
      })),
    [registrosEspuma]
  );

const columnsSelladores: ColumnsType<ResumenSellador> = [
  {
    title: "Sellador / equipo",
    dataIndex: "nombre",
    key: "nombre",
    width: 180,
    render: (value) => (
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-100">
          <UserOutlined className="text-[11px]" />
        </span>
          <span>{value}</span>
        </div>
      ),
    },
  {
    title: "Pisos intervenidos",
    dataIndex: "pisos",
    key: "pisos",
    width: 220,
    render: (value) => (
      <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
        {value}
      </span>
    ),
  },
  {
    title: "Registros",
    dataIndex: "registros",
      key: "registros",
      width: 90,
      sorter: (a, b) => a.registros - b.registros,
    },
    {
      title: "Sellos",
      dataIndex: "totalSellos",
      key: "totalSellos",
      width: 90,
      sorter: (a, b) => a.totalSellos - b.totalSellos,
    },
    {
      title: "Sellos ponderados",
      dataIndex: "totalPonderado",
      key: "totalPonderado",
      width: 130,
      sorter: (a, b) => a.totalPonderado - b.totalPonderado,
      render: (value: number) => value.toFixed(1),
    },
    {
      title: "Último trabajo",
      dataIndex: "ultimoTrabajo",
      key: "ultimoTrabajo",
      width: 120,
    },
  ];

  const columnsItemizado: ColumnsType<ResumenItemizado> = [
    {
      title: "Código",
    dataIndex: "codigo",
    key: "codigo",
    width: 140,
    render: (value) => (
      <Tag
        color="gold"
        className="font-mono text-xs px-2 py-1 max-w-[120px] truncate"
      >
        {value}
      </Tag>
    ),
  },
  {
      title: "Descripción",
      dataIndex: "descripcion",
      key: "descripcion",
      ellipsis: true,
    },
    {
    title: "Pisos involucrados",
    dataIndex: "pisos",
    key: "pisos",
    width: 220,
    render: (value) => (
      <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
        {value}
      </span>
    ),
  },
    {
      title: "Sellos",
      dataIndex: "totalSellos",
      key: "totalSellos",
      width: 90,
      sorter: (a, b) => a.totalSellos - b.totalSellos,
    },
    {
      title: "Sellos ponderados",
      dataIndex: "totalPonderado",
      key: "totalPonderado",
      width: 140,
      sorter: (a, b) => a.totalPonderado - b.totalPonderado,
      render: (value: number) => value.toFixed(1),
    },
  ];

  const columnsEspuma: ColumnsType<ResumenEspumaTabla> = [
    {
      title: "Tramo",
      dataIndex: "tramo",
      key: "tramo",
      width: 120,
      render: (value) => (
        <Tag color="cyan" className="font-mono text-xs px-2 py-1">
          {value}
        </Tag>
      ),
    },
    {
      title: "Piso",
      dataIndex: "piso",
      key: "piso",
      width: 120,
    },
    {
      title: "Metros lineales",
      dataIndex: "metros",
      key: "metros",
      width: 120,
      sorter: (a, b) => a.metros - b.metros,
      render: (value: number) => value.toFixed(1),
    },
    {
      title: "Cuadrilla",
      dataIndex: "cuadrilla",
      key: "cuadrilla",
    },
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      width: 120,
    },
  ];

  return (
    <div className="space-y-5 px-2 sm:px-0 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className={`text-lg font-semibold tracking-wide ${
              isDark ? "text-slate-50" : "text-slate-900"
            }`}
          >
            Reportes de obra · Sellos cortafuego y junta lineal ESPUMA
          </h1>
          <p
            className={`text-xs mt-1 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Panel analítico con ranking por sellador, avance por piso, métricas
            BECK / SACYR y cubicación de junta lineal con espuma.
          </p>
        </div>

        <Segmented
          size="small"
          disabled
          options={[
            {
              label: (
                <span className="text-xs">
                  Obra completa <span className="opacity-60">(demo)</span>
                </span>
              ),
              value: "obra",
            },
          ]}
          value="obra"
        />
      </div>

      {/* KPIs principales sellos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#050814] to-black border-beck-border-dark"
              : "bg-white border-beck-border-light"
          }`}
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
            Sellos totales
          </p>
          <div className="flex items-center gap-2">
            <FireOutlined className="text-amber-300" />
            <p className="text-2xl font-semibold text-slate-100">
              {totalSellos}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Suma de todos los sellos registrados en la obra.
          </p>
        </Card>

        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#050814] to-black border-beck-border-dark"
              : "bg-white border-beck-border-light"
          }`}
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
            Registros en sistema
          </p>
          <p className="text-2xl font-semibold text-slate-100">
            {totalRegistros}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Cada fila equivale a un punto de sellado.
          </p>
        </Card>

        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#050814] to-black border-beck-border-dark"
              : "bg-white border-beck-border-light"
          }`}
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
            Selladores / equipos
          </p>
          <div className="flex items-center gap-2">
            <UserOutlined className="text-sky-400" />
            <p className="text-2xl font-semibold text-slate-100">
              {totalSelladores}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Personas o cuadrillas con registros asignados.
          </p>
        </Card>

        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#050814] to-black border-beck-border-dark"
              : "bg-white border-beck-border-light"
          }`}
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
            Promedio sellos / registro
          </p>
          <div className="flex items-center gap-2">
            <BarChartOutlined className="text-emerald-400" />
            <p className="text-2xl font-semibold text-emerald-400">
              {promedioSellosRegistro.toFixed(1)}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Útil para ver eficiencia de cubicación en terreno.
          </p>
        </Card>
      </div>

      {/* Métricas BECK / SACYR + pisos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#050814] to-black border-beck-border-dark"
              : "bg-white border-beck-border-light"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-black/70 flex items-center justify-center text-beck-accent">
              <PartitionOutlined />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Ponderado BECK
              </p>
              <p className="text-2xl font-semibold text-beck-primary">
                {totalBeck.toFixed(1)}
              </p>
              <p className="text-[11px] text-slate-500">
                Factor por holguras y acceso según contrato BECK.
              </p>
            </div>
          </div>
        </Card>

        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#050814] to-black border-beck-border-dark"
              : "bg-white border-beck-border-light"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-black/70 flex items-center justify-center text-sky-400">
              <BarChartOutlined />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Ponderado SACYR
              </p>
              <p className="text-2xl font-semibold text-sky-400">
                {totalSacyr.toFixed(1)}
              </p>
              <p className="text-[11px] text-slate-500">
                Acumulado según itemizado SACYR de cubicación.
              </p>
            </div>
          </div>
        </Card>

        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#050814] to-black border-beck-border-dark"
              : "bg-white border-beck-border-light"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Pisos con avance
              </p>
              <p className="text-2xl font-semibold text-slate-100">
                {pisosUnicos}
              </p>
              <p className="text-[11px] text-slate-500">
                Pisos que ya tienen al menos un sello registrado.
              </p>
            </div>
            <Tooltip title="Más detalle en los gráficos inferiores.">
              <span className="text-[10px] px-2 py-1 rounded-full bg-black/60 text-slate-300">
                Distribución
              </span>
            </Tooltip>
          </div>
        </Card>
      </div>

      {/* Gráficos sellos: por sellador y por piso */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr,1fr] gap-4">
        {/* Barras por sellador */}
        <Card
          title={
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-6 w-6 rounded-full bg-slate-800 items-center justify-center text-sky-300 text-xs">
                <UserOutlined />
              </span>
              <span>Sellos por sellador / equipo</span>
            </div>
          }
          className={`border ${
            isDark
              ? "bg-beck-card-dark border-beck-border-dark"
              : "bg-beck-card-light border-beck-border-light"
          }`}
          styles={{
            body: { height: 280, padding: 8 },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartSellosPorSellador}
              margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
              barGap={6}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1f2937"
                opacity={0.4}
              />
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 10,
                  fill: isDark ? "#e5e7eb" : "#0f172a",
                }}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: isDark ? "#e5e7eb" : "#0f172a",
                }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #1f2937",
                  fontSize: 11,
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="sellos"
                name="Sellos"
                fill="#38bdf8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="ponderado"
                name="Ponderado"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie por piso */}
        <Card
          title={
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-6 w-6 rounded-full bg-amber-500/15 items-center justify-center text-amber-300 text-xs">
                <FireOutlined />
              </span>
              <span>Distribución de sellos por piso</span>
            </div>
          }
          className={`border ${
            isDark
              ? "bg-beck-card-dark border-beck-border-dark"
              : "bg-beck-card-light border-beck-border-light"
          }`}
          styles={{
            body: { height: 280, padding: 8 },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartSellosPorPiso}
                dataKey="sellos"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={(entry) => entry.name}
              >
                {chartSellosPorPiso.map((_, index) => (
                  <Cell
                    key={`cell-sellos-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip wrapperStyle={{ fontSize: 11 }} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Junta lineal ESPUMA */}
      <Card
        title={
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex h-6 w-6 rounded-full bg-sky-500/15 items-center justify-center text-sky-300 text-xs">
              JL
            </span>
            <span>Junta lineal · ESPUMA</span>
          </div>
        }
        className={`border ${
          isDark
            ? "bg-beck-card-dark border-beck-border-dark"
            : "bg-beck-card-light border-beck-border-light"
        }`}
        styles={{ body: { padding: 16 } }}
      >
        {/* KPIs espuma */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
              Metros lineales ejecutados
            </p>
            <p className="text-2xl font-semibold text-sky-300">
              {totalMetrosEspuma.toFixed(1)} m
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Longitud total de junta lineal sellada con espuma.
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
              Tramos registrados
            </p>
            <p className="text-2xl font-semibold text-slate-100">
              {totalTramosEspuma}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Cada tramo corresponde a un frente continuo de junta.
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
              Cuadrillas de espuma
            </p>
            <p className="text-2xl font-semibold text-emerald-400">
              {totalCuadrillasEspuma}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Equipos que han ejecutado junta lineal en la obra.
            </p>
          </div>
        </div>

        {/* Gráfico + tabla espuma */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1.2fr] gap-4">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartEspumaPorPiso}
                margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: isDark ? "#e5e7eb" : "#0f172a",
                  }}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: isDark ? "#e5e7eb" : "#0f172a",
                  }}
                  label={{
                    value: "Metros lineales",
                    angle: -90,
                    position: "insideLeft",
                    style: {
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#4b5563",
                    },
                  }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1f2937",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Bar
                  dataKey="metros"
                  name="Metros lineales"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <Table
              size="small"
              columns={columnsEspuma}
              dataSource={dataEspumaTabla}
              pagination={false}
              scroll={{ x: 600 }}
              tableLayout="fixed"
            />
          </div>
        </div>
      </Card>

      {/* Ranking selladores */}
      <Card
        title={
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex h-6 w-6 rounded-full bg-slate-800 items-center justify-center text-slate-100 text-xs">
              #
            </span>
            <span>Ranking de selladores / equipos</span>
          </div>
        }
        className={`border ${
          isDark
            ? "bg-beck-card-dark border-beck-border-dark"
            : "bg-beck-card-light border-beck-border-light"
        }`}
        styles={{
          body: { padding: 0 },
        }}
      >
        <div className="overflow-x-auto">
          <Table
            size="small"
            columns={columnsSelladores}
            dataSource={resumenSellador}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 750 }}
            tableLayout="fixed"
            style={{ minWidth: 720 }}
          />
        </div>
      </Card>

      {/* Tablas BECK / SACYR */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title={
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-6 w-6 rounded-full bg-beck-primary/10 items-center justify-center text-beck-primary text-xs">
                B
              </span>
              <span>Resumen por itemizado BECK</span>
            </div>
          }
          styles={{
            header: {
              backgroundColor: isDark
                ? "rgba(0,0,0,0.7)"
                : "rgba(248,250,252,0.95)",
              borderBottom: isDark ? "1px solid #202636" : "1px solid #E5E7EB",
              fontSize: 13,
            },
            body: { padding: 0 },
          }}
          className={`border ${
            isDark
              ? "bg-beck-card-dark border-beck-border-dark"
              : "bg-beck-card-light border-beck-border-light"
          }`}
        >
          <div className="w-full overflow-x-auto touch-pan-x">
            <Table
              size="small"
              columns={columnsItemizado}
              dataSource={resumenBeck}
              pagination={false}
              scroll={{ x: "max-content" }}
              tableLayout="fixed"
              className="min-w-[880px]"
            />
          </div>
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-6 w-6 rounded-full bg-sky-400/15 items-center justify-center text-sky-300 text-xs">
                S
              </span>
              <span>Resumen por itemizado SACYR</span>
            </div>
          }
          styles={{
            header: {
              backgroundColor: isDark
                ? "rgba(0,0,0,0.7)"
                : "rgba(248,250,252,0.95)",
              borderBottom: isDark ? "1px solid #202636" : "1px solid #E5E7EB",
              fontSize: 13,
            },
            body: { padding: 0 },
          }}
          className={`border ${
            isDark
              ? "bg-beck-card-dark border-beck-border-dark"
              : "bg-beck-card-light border-beck-border-light"
          }`}
        >
          <div className="w-full overflow-x-auto touch-pan-x">
            <Table
              size="small"
              columns={columnsItemizado}
              dataSource={resumenSacyr}
              pagination={false}
              scroll={{ x: "max-content" }}
              tableLayout="fixed"
              className="min-w-[880px]"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reportes;
