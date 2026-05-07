// src/pages/RegistroSellos.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Select, Table, Tag, Switch, message } from "antd";
import {
  PlusOutlined,
  FireOutlined,
  TableOutlined,
  DownloadOutlined,
  FilterOutlined,
  BarChartOutlined,
  ApartmentOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ThemeMode } from "../../hooks/useSystemTheme";
import dayjs, { Dayjs } from "dayjs";
import * as XLSX from "xlsx";

import type { RegistroSello } from "../../types/registroSello";
import DateRangeQuickFilter from "../../components/DateRangeQuickFilter";
import RegistroDetalleModal, {
  type RegistroDetalleUpdateValues,
} from "../../components/RegistroDetalleModal";
import NuevoRegistroDrawer, {
  type NuevoRegistroValues,
} from "../../components/NuevoRegistroDrawer";
import { loadObras } from "../../data/obrasStorage";
import { api } from "../../services/api";
import { useAuth } from "../../context/useAuth";

type RegistroSellosProps = {
  themeMode: ThemeMode;
};

type RegistroApiRecord = {
  id: string;
  obraId?: string | null;
  obra_id?: string | null;
  usuarioId?: string | null;
  usuario_id?: string | null;
  fecha?: string | null;
  diaSemana?: string | null;
  dia_semana?: string | null;
  descripcionMaterial?: string | null;
  descripcion_material?: string | null;
  modulo?: string | null;
  piso?: string | null;
  ejeNumerico?: number | string | null;
  eje_numerico?: number | string | null;
  ejeAlfabetico?: string | null;
  eje_alfabetico?: string | null;
  numeroSello?: string | null;
  numero_sello?: string | null;
  cantidadSellos?: number | string | null;
  cantidad_sellos?: number | string | null;
  nombreSellador?: string | null;
  nombre_sellador?: string | null;
  holgura?: number | string | null;
  accesibilidad?: number | string | null;
  estado?: string | null;
  observaciones?: string | null;
  obra?: { nombre?: string | null } | null;
  obra_nombre?: string | null;
  usuario?: { nombre?: string | null } | null;
  usuario_nombre?: string | null;
};

type RegistrosApiResponse = {
  success: boolean;
  data?: RegistroApiRecord[];
};

type RegistroUpdateResponse = {
  success: boolean;
  data?: RegistroApiRecord;
};

type RegistroUpdatePayload = {
  descripcion_material: string;
  modulo: string;
  piso: string;
  eje_numerico: string;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  nombre_sellador: string;
  holgura: number;
  accesibilidad: number;
  observaciones: string;
  estado: RegistroDetalleUpdateValues["estado"];
};

type RegistroEstado = "pendiente" | "validado" | "rechazado";

const normalizeEstado = (estado?: string | null): RegistroEstado => {
  if (estado === "validado" || estado === "rechazado") return estado;
  return "pendiente";
};

const getEstadoLabel = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "validado") return "Validado";
  if (normalized === "rechazado") return "Rechazado";
  return "Pendiente";
};

const getEstadoColor = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "validado") return "green";
  if (normalized === "rechazado") return "red";
  return "gold";
};

const getEstadoBadgeClass = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "validado") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "rechazado") {
    return "border border-red-200 bg-red-50 text-red-700";
  }
  return "border border-orange-200 bg-orange-50 text-orange-700";
};

const normalizeFactorHolgura = (value: number): 1 | 1.2 | 1.4 | 1.8 => {
  if (value === 1.2 || value === 1.4 || value === 1.8) return value;
  return 1;
};

const normalizeCieloModular = (value: number): 1 | 2 | 3 => {
  if (value === 2 || value === 3) return value;
  return 1;
};

const normalizeRegistro = (r: RegistroApiRecord): RegistroSello => {
  const obraId = r.obraId ?? r.obra_id ?? "";
  const usuarioId = r.usuarioId ?? r.usuario_id ?? "";
  const fecha = r.fecha ?? "";
  const diaSemana =
    r.diaSemana ?? r.dia_semana ?? (fecha ? dayjs(fecha).format("dddd") : "");
  const descripcionMaterial =
    r.descripcionMaterial ?? r.descripcion_material ?? "";
  const ejeNumerico = String(r.ejeNumerico ?? r.eje_numerico ?? "");
  const ejeAlfabetico = r.ejeAlfabetico ?? r.eje_alfabetico ?? "";
  const numeroSello = r.numeroSello ?? r.numero_sello ?? "";
  const cantidadSellos = Number(r.cantidadSellos ?? r.cantidad_sellos ?? 0);
  const nombreSellador = r.nombreSellador ?? r.nombre_sellador ?? "";
  const holguraCm = Number(r.holgura ?? 0);
  const accesibilidad = Number(r.accesibilidad ?? 0);
  const obraNombre = r.obra?.nombre ?? r.obra_nombre ?? "Sin obra";
  const usuarioNombre = r.usuario?.nombre ?? r.usuario_nombre ?? "Sin usuario";

  return {
    id: r.id,
    codigo: `REG-${r.id.slice(0, 6)}`,
    obra: obraId,
    fecha,
    estado: normalizeEstado(r.estado),
    obraId,
    usuarioId,
    diaSemana,
    descripcionMaterial,
    accesibilidad,
    obraNombre,
    usuarioNombre,
    itemizadoBeck: descripcionMaterial || `REG-${r.id.slice(0, 6)}`,
    itemizadoSacyr: "",
    fechaEjecucion: fecha,
    dia: diaSemana,
    piso: r.piso ?? "",
    ejeAlfabetico,
    ejeNumerico,
    nombreSellador,
    recinto: r.modulo ?? "",
    numeroSello,
    cantidadSellos,
    holguraCm,
    factorHolgura: normalizeFactorHolgura(holguraCm),
    cieloModular: normalizeCieloModular(accesibilidad),
    cantidadSellosConFactor:
      cantidadSellos * normalizeFactorHolgura(holguraCm),
    observaciones: r.observaciones ?? "",
  };
};

const RegistroSellos: React.FC<RegistroSellosProps> = ({ themeMode }) => {
  // el tema es fijo claro, solo para compatibilidad
  void themeMode;

  const { user } = useAuth();
  const canReview =
    user?.rol === "Administrador" || user?.rol === "Ingenieria";
  const canCreateRegistro = user?.rol === "Administrador";
  const canDownloadPdf =
    user?.rol === "Administrador" || user?.rol === "Ingenieria";
  const [openDrawer, setOpenDrawer] = useState(false);

  const [data, setData] = useState<RegistroSello[]>([]);
  const [changingEstadoId, setChangingEstadoId] = useState<string | null>(null);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [detalleMode, setDetalleMode] = useState<"view" | "edit">("view");

  useEffect(() => {
    const cargarRegistros = async () => {
      try {
        const res = await api.get<RegistrosApiResponse | RegistroApiRecord[]>(
          "/registros"
        );
        const lista = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];
        const registrosNormalizados = lista.map(normalizeRegistro);

        setData(registrosNormalizados);
      } catch (error) {
        console.error(error);
        message.error("No se pudieron cargar los registros");
      }
    };

    void cargarRegistros();
  }, []);

  // filtros
  const [filtroPiso, setFiltroPiso] = useState<string | undefined>();
  const [filtroFechas, setFiltroFechas] = useState<[Dayjs, Dayjs] | null>(null);

  // vista compacta / completa
  const [vistaCompleta, setVistaCompleta] = useState(false);

  // detalle modal
  const [registroDetalle, setRegistroDetalle] = useState<RegistroSello | null>(
    null
  );

  const pisosDisponibles = useMemo(
    () => Array.from(new Set(data.map((r) => r.piso))).sort(),
    [data]
  );

  const filteredData = useMemo(
    () =>
      data.filter((r) => {
        let ok = true;

        if (filtroPiso) ok = ok && r.piso === filtroPiso;

        if (filtroFechas) {
          const d = dayjs(r.fechaEjecucion);
          const [start, end] = filtroFechas;
          ok =
            ok &&
            !d.isBefore(start, "day") &&
            !d.isAfter(end, "day");
        }

        return ok;
      }),
    [data, filtroPiso, filtroFechas]
  );

  // KPIs principales
  const resumen = useMemo(() => {
    const totalRegistros = filteredData.length;
    const totalSellos = filteredData.reduce(
      (acc, r) => acc + r.cantidadSellos,
      0
    );
    const totalPonderado = filteredData.reduce(
      (acc, r) => acc + r.cantidadSellosConFactor,
      0
    );
    return { totalRegistros, totalSellos, totalPonderado };
  }, [filteredData]);

  // Métricas extra (chips)
  const extraMetrics = useMemo(() => {
    const pisos = new Set(filteredData.map((r) => r.piso)).size;
    const selladores = new Set(filteredData.map((r) => r.nombreSellador)).size;

    const promedioHolgura =
      filteredData.length > 0
        ? filteredData.reduce((acc, r) => acc + (r.holguraCm || 0), 0) /
          filteredData.length
        : 0;

    const promedioFactorHolgura =
      filteredData.length > 0
        ? filteredData.reduce((acc, r) => acc + (r.factorHolgura || 0), 0) /
          filteredData.length
        : 0;

    return {
      pisos,
      selladores,
      promedioHolgura,
      promedioFactorHolgura,
    };
  }, [filteredData]);

  const handleCambiarEstado = async (
    record: RegistroSello,
    estado: RegistroEstado
  ) => {
    const id = String(record.id);
    setChangingEstadoId(id);
    try {
      await api.patch(`/registros/${id}/estado`, { estado });
      setData((prev) =>
        prev.map((registro) =>
          String(registro.id) === id ? { ...registro, estado } : registro
        )
      );
      message.success(`Registro ${getEstadoLabel(estado).toLowerCase()}`);
    } catch (error) {
      console.error(error);
      message.error("No se pudo actualizar el estado del registro");
    } finally {
      setChangingEstadoId(null);
    }
  };

  const handleDescargarPdf = async (record: RegistroSello) => {
    const id = String(record.id);
    const codigo = record.codigo || `REG-${id.slice(0, 6)}`;

    try {
      const response = await api.get<Blob>(`/registros/${id}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `registro-${codigo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("PDF descargado correctamente");
    } catch (error) {
      console.error(error);
      message.error("No se pudo descargar el PDF");
    }
  };

  const handleGuardarDetalle = async (
    values: RegistroDetalleUpdateValues
  ) => {
    if (!registroDetalle) return;

    const id = String(registroDetalle.id);
    const payload: RegistroUpdatePayload = {
      descripcion_material: values.descripcionMaterial,
      modulo: values.modulo,
      piso: values.piso,
      eje_numerico: values.ejeNumerico,
      eje_alfabetico: values.ejeAlfabetico,
      numero_sello: values.numeroSello,
      cantidad_sellos: values.cantidadSellos,
      nombre_sellador: values.nombreSellador,
      holgura: values.holguraCm,
      accesibilidad: values.accesibilidad,
      observaciones: values.observaciones,
      estado: values.estado,
    };

    setSavingDetalle(true);
    try {
      const response = await api.put<RegistroUpdateResponse>(
        `/registros/${id}`,
        payload
      );
      const factorHolgura = normalizeFactorHolgura(values.holguraCm);
      const registroActualizado = response.data.data
        ? normalizeRegistro(response.data.data)
        : {
            ...registroDetalle,
            descripcionMaterial: values.descripcionMaterial,
            itemizadoBeck:
              values.descripcionMaterial || registroDetalle.itemizadoBeck,
            recinto: values.modulo,
            piso: values.piso,
            ejeNumerico: values.ejeNumerico,
            ejeAlfabetico: values.ejeAlfabetico,
            numeroSello: values.numeroSello,
            cantidadSellos: values.cantidadSellos,
            nombreSellador: values.nombreSellador,
            holguraCm: values.holguraCm,
            accesibilidad: values.accesibilidad,
            cieloModular: normalizeCieloModular(values.accesibilidad),
            factorHolgura,
            cantidadSellosConFactor: values.cantidadSellos * factorHolgura,
            observaciones: values.observaciones,
            estado: values.estado,
          };

      setData((prev) =>
        prev.map((registro) =>
          String(registro.id) === id ? registroActualizado : registro
        )
      );
      setRegistroDetalle(null);
      message.success("Registro actualizado correctamente");
    } catch (error) {
      console.error(error);
      message.error("No se pudo guardar el registro");
    } finally {
      setSavingDetalle(false);
    }
  };

  // columnas tabla
  const todasLasColumnas: ColumnsType<RegistroSello> = [
    {
      title: "Itemizado BECK",
      dataIndex: "itemizadoBeck",
      key: "itemizadoBeck",
      fixed: "left",
      width: 130,
      render: (text: string) => (
        <span className="font-semibold text-orange-700">{text}</span>
      ),
    },
    {
      title: "Itemizado SACYR",
      dataIndex: "itemizadoSacyr",
      key: "itemizadoSacyr",
      width: 130,
    },
    {
      title: "Obra",
      dataIndex: "obraNombre",
      key: "obraNombre",
      width: 160,
    },
    {
      title: "Usuario",
      dataIndex: "usuarioNombre",
      key: "usuarioNombre",
      width: 150,
    },
    {
      title: "Fecha ejecución",
      dataIndex: "fechaEjecucion",
      key: "fechaEjecucion",
      width: 110,
      render: (value: string) => dayjs(value).format("DD-MM-YYYY"),
    },
    {
      title: "Día",
      dataIndex: "dia",
      key: "dia",
      width: 90,
    },
    {
      title: "Piso",
      dataIndex: "piso",
      key: "piso",
      width: 90,
    },
    {
      title: "Eje A.",
      dataIndex: "ejeAlfabetico",
      key: "ejeAlfabetico",
      width: 70,
    },
    {
      title: "Eje N.",
      dataIndex: "ejeNumerico",
      key: "ejeNumerico",
      width: 70,
    },
    {
      title: "Sellador",
      dataIndex: "nombreSellador",
      key: "nombreSellador",
      width: 150,
    },
    {
      title: "Recinto",
      dataIndex: "recinto",
      key: "recinto",
      width: 160,
    },
    {
      title: "N° sello",
      dataIndex: "numeroSello",
      key: "numeroSello",
      width: 100,
    },
    {
      title: "Cant. sellos",
      dataIndex: "cantidadSellos",
      key: "cantidadSellos",
      width: 90,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 110,
      render: (value: string) => (
        <Tag
          className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${getEstadoBadgeClass(
            value
          )}`}
          color={getEstadoColor(value)}
          style={{ marginInlineEnd: 0 }}
        >
          {getEstadoLabel(value)}
        </Tag>
      ),
    },
    {
      title: "Holgura (cm)",
      dataIndex: "holguraCm",
      key: "holguraCm",
      width: 100,
    },
    {
      title: "Factor holgura",
      dataIndex: "factorHolgura",
      key: "factorHolgura",
      width: 120,
      render: (value: number) => (
        <Tag
          color={
            value === 1
              ? "green"
              : value === 1.2
              ? "geekblue"
              : value === 1.4
              ? "orange"
              : "volcano"
          }
        >
          F = {value}
        </Tag>
      ),
    },
    {
      title: "Cielo modular",
      dataIndex: "cieloModular",
      key: "cieloModular",
      width: 150,
      render: (value: number) => {
        const label =
          value === 1
            ? "F=1 Acceso normal"
            : value === 2
            ? "F=2 Americano / estructurado"
            : "F=3 Cielo duro / gateras";
        return <span className="text-xs">{label}</span>;
      },
    },
    {
      title: "Sellos con factor",
      dataIndex: "cantidadSellosConFactor",
      key: "cantidadSellosConFactor",
      width: 130,
      render: (value: number) => value.toFixed(1),
    },
    {
      title: "Foto",
      dataIndex: "fotoUrl",
      key: "foto",
      width: 160,
      render: (_value: RegistroSello["fotoUrl"], record: RegistroSello) =>
        record.fotoUrl ? (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-16 overflow-hidden rounded-md border border-slate-200">
              <img
                src={record.fotoUrl}
                alt="Foto sello"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 right-0 m-0.5 rounded bg-black/70 px-1 text-[9px] text-white">
                HD
              </span>
            </div>
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                setRegistroDetalle(record);
                setDetalleMode("view");
              }}
              className="p-0 text-[11px]"
            >
              Ver detalle
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">Sin foto</span>
        ),
    },
    {
      title: "Obs.",
      dataIndex: "observaciones",
      key: "observaciones",
      width: 220,
      ellipsis: true,
    },
    ...(canReview
      ? [
          {
            title: "Acciones",
            key: "acciones",
            width: 220,
            render: (_value: unknown, record: RegistroSello) => {
              const estado = normalizeEstado(record.estado);
              const loading = changingEstadoId === String(record.id);

              return (
                <div className="flex flex-wrap gap-1">
                  {estado === "pendiente" && (
                    <Button
                      size="small"
                      type="primary"
                      loading={loading}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCambiarEstado(record, "validado");
                      }}
                    >
                      Validar
                    </Button>
                  )}
                  {estado === "pendiente" && (
                    <Button
                      size="small"
                      danger
                      loading={loading}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCambiarEstado(record, "rechazado");
                      }}
                    >
                      Rechazar
                    </Button>
                  )}
                  {estado !== "validado" && (
                    <Button
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        setRegistroDetalle(record);
                        setDetalleMode("edit");
                      }}
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDescargarPdf(record);
                    }}
                  >
                    PDF
                  </Button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const clavesCompactas = new Set([
    "itemizadoBeck",
    "obraNombre",
    "usuarioNombre",
    "fechaEjecucion",
    "piso",
    "recinto",
    "cantidadSellos",
    "estado",
    "factorHolgura",
    "cantidadSellosConFactor",
    "foto",
    "acciones",
  ]);

  const columnasTabla = useMemo(
    () =>
      vistaCompleta
        ? todasLasColumnas
        : todasLasColumnas.filter(
            (c) => c.key && clavesCompactas.has(String(c.key))
          ),
    [vistaCompleta] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const openNuevo = () => {
    setOpenDrawer(true);
  };

  const handleSubmit = (values: NuevoRegistroValues) => {
    const obra = loadObras().find((o) => o.id === values.obraId);
    const factor = Number(values.factorHolgura) as 1 | 1.2 | 1.4 | 1.8;
    const cantidad = Number(values.cantidadSellos || 0);

    const nuevo: RegistroSello = {
      id: data.length + 1,
      obraId: values.obraId,
      obraNombre: obra?.nombre,
      itemizadoBeck: values.itemizadoBeck,
      // 👇 aseguramos string, aunque el form permita undefined
      itemizadoSacyr: values.itemizadoSacyr || "",
      fechaEjecucion: values.fechaEjecucion.format("YYYY-MM-DD"),
      dia: dayjs(values.fechaEjecucion).format("dddd"),
      piso: values.piso,
      ejeAlfabetico: values.ejeAlfabetico || "",
      ejeNumerico: values.ejeNumerico || "",
      nombreSellador: values.nombreSellador,
      fotoUrl: values.fotoUrl,
      recinto: values.recinto || "",
      numeroSello: values.numeroSello || "",
      cantidadSellos: cantidad,
      holguraCm: values.holguraCm,
      factorHolgura: factor,
      cieloModular: values.cieloModular,
      cantidadSellosConFactor: cantidad * factor,
      observaciones: values.observaciones,
    };

    setData((prev) => [...prev, nuevo]);
    setOpenDrawer(false);
  };

  const handleExportExcel = () => {
    if (!filteredData.length) return;

    const headers = [
      "Itemizado BECK",
      "Itemizado SACYR",
      "Fecha ejecución",
      "Día",
      "Piso",
      "Eje alfabético",
      "Eje numérico",
      "Sellador",
      "Recinto",
      "N° sello",
      "Cantidad sellos",
      "Holgura (cm)",
      "Factor holgura",
      "Cielo modular",
      "Sellos con factor",
      "Foto (URL)",
      "Observaciones",
    ];

    const rows = filteredData.map((r) => [
      r.itemizadoBeck,
      r.itemizadoSacyr,
      dayjs(r.fechaEjecucion).format("DD-MM-YYYY"),
      r.dia,
      r.piso,
      r.ejeAlfabetico,
      r.ejeNumerico,
      r.nombreSellador,
      r.recinto,
      r.numeroSello,
      r.cantidadSellos,
      r.holguraCm,
      r.factorHolgura,
      r.cieloModular === 1
        ? "F=1 Acceso normal"
        : r.cieloModular === 2
        ? "F=2 Americano / estructurado"
        : "F=3 Cielo duro / gateras",
      r.cantidadSellosConFactor,
      r.fotoUrl || "",
      r.observaciones || "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sellos");

    const fileName = `BECK_sellos_${dayjs().format(
      "YYYYMMDD_HHmm"
    )}_vista_actual.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header superior */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-orange-700">
            <FireOutlined className="text-[12px]" />
            <span>Panel de registro de sellos cortafuego</span>
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-wide text-slate-900">
            Registro de sellos · Itemizado BECK / SACYR
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-xl">
            Control diario de sellos con fotos, factores de holgura y salida
            directa a Excel para informes de avance y cubicaciones de
            protección pasiva contra incendios.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            icon={<DownloadOutlined />}
            className="text-xs"
            onClick={handleExportExcel}
          >
            Exportar vista a Excel
          </Button>
          <Button icon={<FireOutlined />} disabled className="text-xs">
            Subir foto (Cloudinary pronto)
          </Button>
          {canCreateRegistro && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="bg-orange-500 hover:bg-orange-600 border-none text-xs"
              onClick={openNuevo}
            >
              Nuevo registro
            </Button>
          )}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* KPI 1: registros */}
        <Card
          className="relative overflow-hidden border bg-gradient-to-br from-[#fefce8] via-[#fffbeb] to-[#fef9c3] border-amber-200 shadow-sm"
          styles={{ body: { padding: 16 } }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f172a] via-[#f97316] to-[#facc15]" />
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-amber-700/90">
                Registros en vista
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {resumen.totalRegistros}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Filtrados por piso / fecha
              </p>
            </div>
            <TableOutlined className="text-xl text-orange-600" />
          </div>
        </Card>

        {/* KPI 2: sellos simples */}
        <Card
          className="relative overflow-hidden border bg-gradient-to-br from-white via-slate-50 to-sky-100 border-slate-200 shadow-sm"
          styles={{ body: { padding: 16 } }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-700 via-sky-500 to-amber-300" />
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Sellos registrados
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {resumen.totalSellos}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Conteo directo de unidades
              </p>
            </div>
            <FireOutlined className="text-xl text-sky-600" />
          </div>
        </Card>

        {/* KPI 3: ponderado */}
        <Card
          className="relative overflow-hidden border bg-gradient-to-br from-white via-slate-50 to-emerald-100 border-emerald-100 shadow-sm"
          styles={{ body: { padding: 16 } }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-300" />
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Sellos ponderados
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600">
                {resumen.totalPonderado.toFixed(1)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Equivalente por factor de holgura y tipo de cielo
              </p>
            </div>
            <BarChartOutlined className="text-xl text-emerald-600" />
          </div>
        </Card>
      </div>

      {/* Métricas extra (chips) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
          <ApartmentOutlined className="text-sm text-orange-600" />
          <div>
            <p className="text-[11px] text-slate-500">Pisos con registros</p>
            <p className="text-sm font-semibold text-slate-900">
              {extraMetrics.pisos}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
          <TeamOutlined className="text-sm text-sky-600" />
          <div>
            <p className="text-[11px] text-slate-500">Selladores distintos</p>
            <p className="text-sm font-semibold text-slate-900">
              {extraMetrics.selladores}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
          <FireOutlined className="text-sm text-red-500" />
          <div>
            <p className="text-[11px] text-slate-500">Promedio factor F</p>
            <p className="text-sm font-semibold text-slate-900">
              {extraMetrics.promedioFactorHolgura
                ? extraMetrics.promedioFactorHolgura.toFixed(2)
                : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
          <BarChartOutlined className="text-sm text-amber-600" />
          <div>
            <p className="text-[11px] text-slate-500">
              Holgura promedio (cm)
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {extraMetrics.promedioHolgura
                ? extraMetrics.promedioHolgura.toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros + switch vista */}
      <Card
        className="border bg-white border-slate-200 shadow-sm"
        styles={{ body: { padding: 12 } }}
      >
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 border border-amber-100">
            <FilterOutlined className="text-amber-600 text-[11px]" />
            <span className="text-slate-800">Filtros rápidos</span>
          </div>

          <Select
            allowClear
            size="small"
            placeholder="Piso"
            className="min-w-[130px]"
            value={filtroPiso}
            onChange={(value) => setFiltroPiso(value)}
            options={pisosDisponibles.map((p) => ({
              value: p,
              label: p,
            }))}
          />

          <DateRangeQuickFilter
            value={filtroFechas}
            onChange={setFiltroFechas}
            isDark={false}
          />

          <Button
            type="link"
            size="small"
            className="text-[11px] text-slate-400"
            onClick={() => {
              setFiltroPiso(undefined);
              setFiltroFechas(null);
            }}
          >
            Limpiar filtros
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              Vista compacta / completa
            </span>
            <Switch
              size="small"
              checked={vistaCompleta}
              onChange={setVistaCompleta}
            />
          </div>
        </div>
      </Card>

      {/* Tabla principal */}
      <Card
        className="border bg-white border-slate-200 shadow-sm"
        title={
          <div className="flex items-center gap-2 text-sm">
            <TableOutlined />
            <span>Itemizado BECK / SACYR</span>
          </div>
        }
        styles={{
          header: {
            backgroundColor: "rgba(248,250,252,0.98)",
            color: "#020617",
            borderBottom: "1px solid #E5E7EB",
            fontSize: 13,
          },
          body: { padding: 0 },
        }}
      >
        <Table
          columns={columnasTabla}
          dataSource={filteredData}
          rowKey="id"
          size="small"
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 8 }}
          onRow={(record) => ({
            onClick: () => {
              setRegistroDetalle(record);
              setDetalleMode("view");
            },
          })}
        />
      </Card>

      {/* Modal detalle */}
      <RegistroDetalleModal
        registro={registroDetalle}
        open={!!registroDetalle}
        mode={detalleMode}
        canEdit={
          canReview &&
          !!registroDetalle &&
          normalizeEstado(registroDetalle.estado) !== "validado"
        }
        saving={savingDetalle}
        onClose={() => setRegistroDetalle(null)}
        onEdit={() => setDetalleMode("edit")}
        onSave={handleGuardarDetalle}
        onDownloadPdf={canDownloadPdf ? handleDescargarPdf : undefined}
      />

      {/* Drawer nuevo registro (desde la derecha) */}
      {canCreateRegistro && (
        <NuevoRegistroDrawer
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default RegistroSellos;
