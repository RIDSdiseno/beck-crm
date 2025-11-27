// src/pages/Cotizaciones.tsx
import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Table,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import * as XLSX from "xlsx";

import type { ThemeMode } from "../hooks/useSystemTheme";
import type { Cotizacion, EstadoCotizacion } from "../types/cotizacion";
import CotizacionEditorModal, {
  type CotizacionEditorValues, // 👈 IMPORTAR COMO TYPE
} from "../components/CotizacionEditorModal";

const { RangePicker } = DatePicker;

type CotizacionesProps = {
  themeMode: ThemeMode;
};

const estadosOptions: EstadoCotizacion[] = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
];

// 🔹 alias para el rango de fechas
type RangeValue = [Dayjs, Dayjs] | null;

const Cotizaciones: React.FC<CotizacionesProps> = ({ themeMode }) => {
  void themeMode;

  const [data, setData] = useState<Cotizacion[]>([
    {
      id: 1,
      numero: 20,
      codigo: "BECK-COT-2025-020",
      cliente: "3DENTAL SPA",
      proyecto: "Sellos cortafuego clínica dental",
      origen: "BECK", // 🔹 mock con origen BECK
      tipo: "Cliente",
      fecha: dayjs("2025-11-26").format("YYYY-MM-DD"),
      vigencia: dayjs("2025-12-26").format("YYYY-MM-DD"),
      estado: "Borrador",
      monto: 65405,
      moneda: "CLP",
      responsable: "Equipo Beck",
      notas: "Incluye salas de procedimiento y subterráneo -1.",
    },
  ]);

  // --------- estado modal ----------
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] = useState<Cotizacion | null>(null);

  // --------- filtros ----------
  const [filtroEstado, setFiltroEstado] =
    useState<EstadoCotizacion | undefined>();
  const [filtroOrigen, setFiltroOrigen] = useState<string | undefined>();

  // 🔹 usar el mismo tipo de "tipo" que en Cotizacion
  const [filtroTipo, setFiltroTipo] = useState<Cotizacion["tipo"] | undefined>();

  const [filtroFechas, setFiltroFechas] = useState<RangeValue>(null);
  const [searchText, setSearchText] = useState<string>("");

  const origenes = useMemo(
    () => Array.from(new Set(data.map((c) => c.origen))).sort(),
    [data]
  );

  // 🔹 tipos bien tipados según Cotizacion["tipo"]
  const tipos = useMemo<Cotizacion["tipo"][]>(
    () => Array.from(new Set(data.map((c) => c.tipo))).sort(),
    [data]
  );

  const filteredData = useMemo(
    () =>
      data.filter((c) => {
        let ok = true;

        if (filtroEstado) ok = ok && c.estado === filtroEstado;
        if (filtroOrigen) ok = ok && c.origen === filtroOrigen;
        if (filtroTipo) ok = ok && c.tipo === filtroTipo;

        if (filtroFechas) {
          const d = dayjs(c.fecha);
          const [start, end] = filtroFechas;
          ok =
            ok &&
            !d.isBefore(start, "day") &&
            !d.isAfter(end, "day");
        }

        if (searchText.trim()) {
          const q = searchText.toLowerCase();
          ok =
            ok &&
            (c.codigo.toLowerCase().includes(q) ||
              c.cliente.toLowerCase().includes(q) ||
              c.proyecto.toLowerCase().includes(q) ||
              c.origen.toLowerCase().includes(q));
        }

        return ok;
      }),
    [data, filtroEstado, filtroOrigen, filtroTipo, filtroFechas, searchText]
  );

  // --------- KPIs ----------
  const resumen = useMemo(() => {
    const totalCot = filteredData.length;
    const totalMonto = filteredData.reduce((acc, c) => acc + c.monto, 0);

    const aceptadas = filteredData.filter((c) => c.estado === "Aceptada").length;
    const enviadas = filteredData.filter((c) => c.estado === "Enviada").length;
    const base = aceptadas + enviadas;
    const tasaExito = base > 0 ? (aceptadas / base) * 100 : 0;

    const hoy = dayjs();
    const vencen7dias = filteredData.filter((c) => {
      const diff = dayjs(c.vigencia).diff(hoy, "day");
      return diff >= 0 && diff <= 7;
    }).length;

    return { totalCot, totalMonto, tasaExito, vencen7dias };
  }, [filteredData]);

  // --------- columnas tabla ----------
  const columnas: ColumnsType<Cotizacion> = [
    {
      title: "N°",
      dataIndex: "numero",
      key: "numero",
      width: 70,
      fixed: "left",
      render: (value) => (
        <span className="text-slate-500 text-xs">{value}</span>
      ),
    },
    {
      title: "Fecha cotización",
      dataIndex: "fecha",
      key: "fecha",
      width: 130,
      render: (value) => dayjs(value).format("DD-MM-YYYY"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 120,
      render: (estado: EstadoCotizacion) => {
        let color = "#E5E7EB";
        let text = "#4B5563";

        if (estado === "Borrador") {
          color = "#fef3c7";
          text = "#92400e";
        }
        if (estado === "Enviada") {
          color = "#dbeafe";
          text = "#1d4ed8";
        }
        if (estado === "Aceptada") {
          color = "#dcfce7";
          text = "#166534";
        }
        if (estado === "Rechazada") {
          color = "#fee2e2";
          text = "#b91c1c";
        }

        return (
          <span
            style={{ backgroundColor: color, color: text }}
            className="inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-medium"
          >
            {estado}
          </span>
        );
      },
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 130,
    },
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
      width: 220,
    },
    {
      title: "Origen",
      dataIndex: "origen",
      key: "origen",
      width: 160,
    },
    {
      title: "Total",
      dataIndex: "monto",
      key: "monto",
      width: 130,
      align: "right",
      render: (value: number, record) => (
        <span className="font-semibold text-slate-900">
          {record.moneda === "CLP" ? "$" : "US$"}{" "}
          {value.toLocaleString("es-CL")}
        </span>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 120,
      align: "center",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                console.log("Ver", record.id);
              }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditorMode("edit");
                setEditingRecord(record);
                setEditorOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                setData((prev) => prev.filter((c) => c.id !== record.id));
              }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  // --------- acciones ----------
  const openNuevo = () => {
    setEditorMode("create");
    setEditingRecord(null);
    setEditorOpen(true);
  };

  const handleExportExcel = () => {
    if (!filteredData.length) return;

    const headers = [
      "N°",
      "Código",
      "Cliente",
      "Proyecto",
      "Origen",
      "Tipo",
      "Fecha",
      "Vigencia",
      "Estado",
      "Monto",
      "Moneda",
      "Responsable",
      "Notas",
    ];

    const rows = filteredData.map((c) => [
      c.numero,
      c.codigo,
      c.cliente,
      c.proyecto,
      c.origen,
      c.tipo,
      dayjs(c.fecha).format("DD-MM-YYYY"),
      dayjs(c.vigencia).format("DD-MM-YYYY"),
      c.estado,
      c.monto,
      c.moneda,
      c.responsable,
      c.notas || "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones");

    const fileName = `BECK_cotizaciones_${dayjs().format(
      "YYYYMMDD_HHmm"
    )}_vista_actual.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleRecargar = () => {
    console.log("Recargar cotizaciones mock");
  };

  const editorInitialValues: CotizacionEditorValues | undefined =
    editingRecord
      ? {
          id: editingRecord.id,
          numero: editingRecord.numero,
          codigo: editingRecord.codigo,
          cliente: editingRecord.cliente,
          proyecto: editingRecord.proyecto,
          origen: editingRecord.origen,
          tipo: editingRecord.tipo,
          fecha: dayjs(editingRecord.fecha),
          vigencia: dayjs(editingRecord.vigencia),
          estado: editingRecord.estado,
          monto: editingRecord.monto,
          moneda: editingRecord.moneda as "CLP" | "USD",
          responsable: editingRecord.responsable,
          notas: editingRecord.notas,
        }
      : undefined;

  const handleSaveFromModal = (values: CotizacionEditorValues) => {
    const isEdit = editorMode === "edit" && editingRecord;

    const nextNumero =
      isEdit && editingRecord
        ? editingRecord.numero
        : data.length > 0
        ? Math.max(...data.map((c) => c.numero)) + 1
        : 1;

    const id =
      isEdit && editingRecord
        ? editingRecord.id
        : data.length > 0
        ? Math.max(...data.map((c) => c.id)) + 1
        : 1;

    const numero = values.numero ?? nextNumero;

    const base: Cotizacion = {
      id,
      numero,
      codigo:
        values.codigo ||
        `BECK-COT-${values.fecha.format("YYYY")}-${String(numero).padStart(
          3,
          "0"
        )}`,
      cliente: values.cliente,
      proyecto: values.proyecto || "",
      origen: values.origen,
      tipo: values.tipo,
      fecha: values.fecha.format("YYYY-MM-DD"),
      vigencia: values.vigencia.format("YYYY-MM-DD"),
      estado: values.estado,
      monto: Number(values.monto || 0),
      moneda: values.moneda,
      responsable: values.responsable || "",
      notas: values.notas,
    };

    setData((prev) => {
      if (isEdit && editingRecord) {
        return prev.map((c) => (c.id === editingRecord.id ? base : c));
      }
      return [base, ...prev];
    });

    setEditorOpen(false);
    setEditingRecord(null);
  };

  // --------- render ----------
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Panel principal */}
      <Card
        className="border border-slate-100 shadow-sm rounded-2xl bg-gradient-to-b from-white via-white to-[#f9fafb]"
        styles={{ body: { padding: 18 } }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-orange-700">
              <FileTextOutlined className="text-[12px]" />
              <span>Gestión y seguimiento de cotizaciones</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-slate-900">
              Cotizaciones
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Gestiona propuestas de sellos cortafuego por cliente, origen y
              estado. Vista pensada para Beck / Firemat y cubicaciones de
              protección pasiva.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              icon={<ReloadOutlined />}
              className="text-xs"
              onClick={handleRecargar}
            >
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="bg-orange-500 hover:bg-orange-600 border-none text-xs"
              onClick={openNuevo}
            >
              Crear
            </Button>
          </div>
        </div>

        {/* búsqueda */}
        <div className="mt-4">
          <Input
            allowClear
            size="large"
            prefix={
              <SearchOutlined className="text-slate-400 text-[13px] mr-1" />
            }
            className="rounded-full max-w-xl text-xs"
            placeholder="Buscar cotización, cliente, proyecto u origen..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* filtros */}
        <div className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">Filtrar por origen</span>
            <Select
              allowClear
              size="small"
              placeholder="Todos los orígenes"
              className="w-full"
              value={filtroOrigen}
              onChange={(value) => setFiltroOrigen(value)}
              options={origenes.map((o) => ({ label: o, value: o }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">Filtrar por estado</span>
            <Select
              allowClear
              size="small"
              placeholder="Todos los estados"
              className="w-full"
              value={filtroEstado}
              onChange={(value) =>
                setFiltroEstado(value as EstadoCotizacion)
              }
              options={estadosOptions.map((e) => ({ label: e, value: e }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">Filtrar por tipo</span>
            <Select
              allowClear
              size="small"
              placeholder="Todos los tipos"
              className="w-full"
              value={filtroTipo}
              onChange={(value) =>
                setFiltroTipo(value as Cotizacion["tipo"])
              }
              options={tipos.map((t) => ({ label: t, value: t }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">Rango de fecha</span>
            <RangePicker<Dayjs>
              size="small"
              className="w-full"
              format="DD-MM-YYYY"
              value={filtroFechas ?? undefined}
              onChange={(val) => {
                if (!val || val.length < 2 || !val[0] || !val[1]) {
                  setFiltroFechas(null);
                  return;
                }
                setFiltroFechas([val[0], val[1]]);
              }}
            />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card
          className="border border-amber-100 bg-[#fffbeb] rounded-xl shadow-sm"
          styles={{ body: { padding: 14 } }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-amber-700/90">Cotizaciones</p>
              <p className="text-xl font-semibold text-slate-900">
                {resumen.totalCot}
              </p>
              <p className="text-[11px] text-slate-500">
                En la vista actual (filtros)
              </p>
            </div>
            <FileTextOutlined className="text-lg text-orange-500" />
          </div>
        </Card>

        <Card
          className="border border-slate-100 bg-white rounded-xl shadow-sm"
          styles={{ body: { padding: 14 } }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-slate-500">Monto total</p>
              <p className="text-xl font-semibold text-slate-900">
                $ {resumen.totalMonto.toLocaleString("es-CL")}
              </p>
              <p className="text-[11px] text-slate-500">
                Solo CLP (mock de prueba)
              </p>
            </div>
            <DollarOutlined className="text-lg text-emerald-600" />
          </div>
        </Card>

        <Card
          className="border border-emerald-100 bg-emerald-50 rounded-xl shadow-sm"
          styles={{ body: { padding: 14 } }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-emerald-700">Tasa de éxito</p>
              <p className="text-xl font-semibold text-emerald-700">
                {resumen.tasaExito.toFixed(0)}%
              </p>
              <p className="text-[11px] text-emerald-700/80">
                Aceptadas / (Aceptadas + Enviadas)
              </p>
            </div>
            <CheckCircleOutlined className="text-lg text-emerald-600" />
          </div>
        </Card>

        <Card
          className="border border-sky-100 bg-sky-50 rounded-xl shadow-sm"
          styles={{ body: { padding: 14 } }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-sky-700">
                Vencen en los próximos 7 días
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {resumen.vencen7dias}
              </p>
              <p className="text-[11px] text-slate-500">
                Ideal para hacer seguimiento
              </p>
            </div>
            <ClockCircleOutlined className="text-lg text-sky-600" />
          </div>
        </Card>
      </div>

      {/* tabla */}
      <Card
        className="border border-slate-100 bg-white rounded-2xl shadow-sm"
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex items-center gap-2 text-sm">
            <FileTextOutlined />
            <span>Listado de cotizaciones</span>
          </div>
        }
        extra={
          <Button
            size="small"
            icon={<DownloadOutlined />}
            className="text-[11px]"
            onClick={handleExportExcel}
          >
            Exportar Excel
          </Button>
        }
      >
        <Table
          columns={columnas}
          dataSource={filteredData}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
        <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">
          Mostrando {filteredData.length} de {data.length} cotizaciones.
        </div>
      </Card>

      {/* modal editor */}
      <CotizacionEditorModal
        open={editorOpen}
        mode={editorMode}
        initialValues={editorInitialValues}
        onClose={() => {
          setEditorOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleSaveFromModal}
      />
    </div>
  );
};

export default Cotizaciones;
