// src/pages/JuntaLinealEspuma.tsx
import React, { useMemo } from "react";
import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ThunderboltOutlined, FireOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import type { ThemeMode } from "../hooks/useSystemTheme";

type JuntaEspumaRow = {
  key: number;
  descripcion: string;
  fecha: string; // ISO
  dia: string;
  piso: string;
  ejeAlfa: string;
  ejeNum: string;
  sellador: string;
  fotoUrl?: string;
  recinto: string;
  longitud: number; // m
  observaciones?: string;
};

type Props = {
  themeMode: ThemeMode;
};

const JuntaLinealEspuma: React.FC<Props> = ({ themeMode }) => {
  const isDark = themeMode === "dark";

  // MOCK basado en tu plantilla
  const data: JuntaEspumaRow[] = [
    {
      key: 1,
      descripcion: "Junta lineal espuma en pasillo UCI",
      fecha: "2025-08-18",
      dia: "Lunes",
      piso: "Piso 1",
      ejeAlfa: "B",
      ejeNum: "12",
      sellador: "Juan Pérez",
      fotoUrl:
        "https://res.cloudinary.com/dvqpmttci/image/upload/v1762883986/T1840G5i78GB500GBW10P_2_Supersize_hlt6je.jpg",
      recinto: "Pasillo UCI",
      longitud: 12.5,
      observaciones: "Junta continua, revisada por supervisor.",
    },
    {
      key: 2,
      descripcion: "Junta lineal espuma en box de urgencia",
      fecha: "2025-08-19",
      dia: "Martes",
      piso: "Piso 1",
      ejeAlfa: "C",
      ejeNum: "8",
      sellador: "María López",
      fotoUrl:
        "https://res.cloudinary.com/dvqpmttci/image/upload/v1762883986/T1840G5i78GB500GBW10P_2_Supersize_hlt6je.jpg",
      recinto: "Box urgencia 3",
      longitud: 9.8,
      observaciones: "Se deja sellado para inspección SACYR.",
    },
  ];

  const totalLongitud = useMemo(
    () => data.reduce((a, r) => a + r.longitud, 0),
    [data]
  );

  const columns: ColumnsType<JuntaEspumaRow> = [
    {
      title: "Descripción",
      dataIndex: "descripcion",
      key: "descripcion",
      width: 220,
    },
    {
      title: "Fecha ejecución de sello",
      dataIndex: "fecha",
      key: "fecha",
      width: 160,
      render: (value: string) => dayjs(value).format("DD-MM-YYYY"),
    },
    {
      title: "Día",
      dataIndex: "dia",
      key: "dia",
      width: 100,
    },
    {
      title: "Piso",
      dataIndex: "piso",
      key: "piso",
      width: 90,
    },
    {
      title: "Eje alfabético",
      dataIndex: "ejeAlfa",
      key: "ejeAlfa",
      width: 110,
    },
    {
      title: "Eje numérico",
      dataIndex: "ejeNum",
      key: "ejeNum",
      width: 110,
    },
    {
      title: "Nombre sellador",
      dataIndex: "sellador",
      key: "sellador",
      width: 160,
    },
    {
      title: "Foto",
      dataIndex: "fotoUrl",
      key: "foto",
      width: 120,
      render: (_, record) =>
        record.fotoUrl ? (
          <a
            href={record.fotoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-amber-500 text-[11px] hover:text-amber-400"
          >
            Ver foto
          </a>
        ) : (
          <span className="text-[11px] text-slate-500">Sin foto</span>
        ),
    },
    {
      title: "Recinto",
      dataIndex: "recinto",
      key: "recinto",
      width: 170,
    },
    {
      title: "Longitud (m)",
      dataIndex: "longitud",
      key: "longitud",
      width: 120,
      align: "right",
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "Observaciones",
      dataIndex: "observaciones",
      key: "observaciones",
      width: 240,
      ellipsis: true,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className={`text-lg font-semibold tracking-wide ${
              isDark ? "text-slate-50" : "text-slate-900"
            }`}
          >
            Junta lineal · ESPUMA
          </h1>
          <p
            className={`text-xs mt-1 ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Avance de sellos ejecutados en junta lineal espuma según plantilla
            BECK / SACYR.
          </p>
        </div>
        <Tag
          color="gold"
          className={`text-[11px] px-3 py-1 rounded-full ${
            isDark ? "border border-amber-300/40" : ""
          }`}
        >
          Obra: Hospital Buin Paine · Semana 21
        </Tag>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Longitud total */}
        <Card
          styles={{ body: { padding: 16 } }}
          className={`border relative overflow-hidden ${
            isDark
              ? "bg-gradient-to-br from-[#050814] via-[#020617] to-black border-beck-border-dark"
              : "bg-gradient-to-br from-white via-slate-50 to-emerald-50 border-beck-border-light"
          }`}
        >
          <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full blur-2xl bg-emerald-400/25" />
          <p
            className={`text-[11px] uppercase tracking-wide mb-1 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Longitud total ejecutada
          </p>
          <div className="flex items-center gap-2 relative z-10">
            <ThunderboltOutlined className="text-emerald-400" />
            <p
              className={`text-2xl font-semibold ${
                isDark ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              {totalLongitud.toFixed(2)} m
            </p>
          </div>
          <p
            className={`text-[11px] mt-1 ${
              isDark ? "text-slate-500" : "text-slate-600"
            }`}
          >
            Suma de metros lineales de junta espuma ejecutada en la obra.
          </p>
        </Card>

        {/* Registros */}
        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-beck-card-dark border-beck-border-dark"
              : "bg-beck-card-light border-beck-border-light"
          }`}
        >
          <p
            className={`text-[11px] uppercase tracking-wide mb-1 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Registros en plantilla
          </p>
          <div className="flex items-center gap-2">
            <FireOutlined className="text-amber-400" />
            <p
              className={`text-2xl font-semibold ${
                isDark ? "text-slate-50" : "text-slate-900"
              }`}
            >
              {data.length}
            </p>
          </div>
          <p
            className={`text-[11px] mt-1 ${
              isDark ? "text-slate-500" : "text-slate-600"
            }`}
          >
            Cada registro corresponde a un tramo de junta lineal ejecutado.
          </p>
        </Card>

        {/* Promedio por registro */}
        <Card
          styles={{ body: { padding: 16 } }}
          className={`border ${
            isDark
              ? "bg-beck-card-dark border-beck-border-dark"
              : "bg-beck-card-light border-beck-border-light"
          }`}
        >
          <p
            className={`text-[11px] uppercase tracking-wide mb-1 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Promedio por registro
          </p>
          <p
            className={`text-2xl font-semibold ${
              isDark ? "text-slate-50" : "text-slate-900"
            }`}
          >
            {(totalLongitud / data.length).toFixed(2)} m
          </p>
          <p
            className={`text-[11px] mt-1 ${
              isDark ? "text-slate-500" : "text-slate-600"
            }`}
          >
            Metros de junta espuma promedio por tramo registrado.
          </p>
        </Card>
      </div>

      {/* Tabla */}
      <Card
        title={
          <div className="flex items-center gap-2 text-sm">
            <ThunderboltOutlined className="text-amber-400" />
            <span>Detalle junta lineal ESPUMA</span>
          </div>
        }
        styles={{
          header: {
            backgroundColor: isDark
              ? "rgba(15,23,42,0.95)"
              : "rgba(248,250,252,0.95)",
            borderBottom: isDark ? "1px solid #202636" : "1px solid #E5E7EB",
            fontSize: 13,
            color: isDark ? "#e5e7eb" : "#020617",
          },
          body: { padding: 0 },
        }}
        className={`border ${
          isDark
            ? "bg-beck-card-dark border-beck-border-dark"
            : "bg-beck-card-light border-beck-border-light"
        }`}
      >
        <Table<JuntaEspumaRow>
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default JuntaLinealEspuma;
