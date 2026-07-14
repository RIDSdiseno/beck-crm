// src/pages/beck/Reportes.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, Table, Tag, Select, Spin, Empty, message, Tabs, DatePicker } from "antd";
import type { TableColumnsType } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  BarChartOutlined,
  PartitionOutlined,
  FireOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

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

import type { ThemeMode } from "../../hooks/useSystemTheme";
import {
  api,
  obrasAPI,
  registrosAPI,
  type Obra,
  type RendimientoAcumuladoItem,
} from "../../services/api";
import RegistroDetalleModal from "../../components/RegistroDetalleModal";
import type { RegistroSello } from "../../types/registroSello";
import { getTipoRegistroLabel } from "../../constants/roles";

type ReportesProps = {
  themeMode: ThemeMode;
};

type RegistroApiRaw = {
  id: string;
  piso?: string | null;
  cantidadSellos?: number | string | null;
  cantidad_sellos?: number | string | null;
  metrosLineales?: number | string | null;
  metros_lineales?: number | string | null;
  longitud?: number | string | null;
  longitud_m?: number | string | null;
  nombreSellador?: string | null;
  nombre_sellador?: string | null;
  holgura?: number | string | null;
  accesibilidad?: number | string | null;
  estado?: string | null;
  tipoRegistro?: string | null;
  tipo_registro?: string | null;
  obra?: { nombre?: string | null } | null;
  obra_nombre?: string | null;
  fecha?: string | null;
  diaSemana?: string | null;
  dia_semana?: string | null;
  descripcionMaterial?: string | null;
  descripcion_material?: string | null;
  observaciones?: string | null;
  ejeNumerico?: number | string | null;
  eje_numerico?: number | string | null;
  ejeAlfabetico?: string | null;
  eje_alfabetico?: string | null;
  modulo?: string | null;
  numeroSello?: string | null;
  numero_sello?: string | null;
  itemizadoBeck?: string | null;
  itemizado_beck?: string | null;
  itemizadoSacyr?: string | null;
  itemizado_sacyr?: string | null;
  fotoUrl?: string | null;
  foto_url?: string | null;
  fotosUrls?: string[] | null;
  fotos_urls?: string[] | null;
  fotos?: Array<{ url?: string | null }> | null;
  fotos_registro?: Array<{ url?: string | null }> | null;
  recinto?: string | null;
  folio?: string | null;
  FOLIO?: string | null;
  codigo_beck?: string | null;
  codigoBeck?: string | null;
};

type ApiResponse = {
  success: boolean;
  data?: RegistroApiRaw[];
};

type RegistroNorm = {
  id: string;
  cantidadSellos: number;
  metrosLineales: number;
  nombreSellador: string;
  piso: string;
  factorHolgura: number;
  cantidadSellosConFactor: number;
  tipoRegistro: string;
  obraNombre: string;
  fechaEjecucion: string;
  descripcionMaterial: string;
  estado: string;
  dia: string;
  ejeAlfabetico: string;
  ejeNumerico: string;
  recinto: string;
  numeroSello: string;
  holguraCm: number;
  observaciones: string;
  itemizadoBeck: string;
  itemizadoSacyr: string;
  fotoUrl: string | null;
  fotosUrls: string[];
  codigo: string;
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

const COLORS = [
  "#38bdf8",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#f43f5e",
  "#a855f7",
];

const ESTADOS = [
  { value: "todos", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "validado", label: "Validado" },
  { value: "rechazado", label: "Rechazado" },
];

const { RangePicker } = DatePicker;

// Mismo formato usado en Dashboard.tsx para las columnas de rendimiento por
// trabajador (rendimientoTrabajadorColumns), para que ambas pantallas
// muestren el mismo dato de forma consistente.
const rendimientoNumberFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 1,
});
const rendimientoIntegerFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 0,
});

const rendimientoTrabajadorColumns: TableColumnsType<RendimientoAcumuladoItem> = [
  {
    title: "Trabajador",
    dataIndex: "nombreSellador",
    key: "nombreSellador",
  },
  {
    title: "Total de registros",
    dataIndex: "totalRegistros",
    key: "totalRegistros",
    align: "right",
    render: (value: number) => rendimientoIntegerFormatter.format(Number(value ?? 0)),
  },
  {
    title: "Cantidad ejecutada",
    dataIndex: "cantidadEjecutadaTotal",
    key: "cantidadEjecutadaTotal",
    align: "right",
    render: (value: number) => rendimientoNumberFormatter.format(Number(value ?? 0)),
  },
  {
    title: "Rendimiento acumulado (%)",
    dataIndex: "rendimientoAcumuladoPct",
    key: "rendimientoAcumuladoPct",
    align: "right",
    render: (value: number) => `${rendimientoNumberFormatter.format(Number(value ?? 0))}%`,
  },
];

const normalizeFactorHolgura = (value: number): number => {
  if (value === 1.2 || value === 1.4 || value === 1.8) return value;
  return 1;
};

const normalizeEstado = (estado?: string | null): string => {
  if (
    estado === "en_revision" ||
    estado === "validado" ||
    estado === "rechazado"
  )
    return estado;
  return "pendiente";
};

const getEstadoColor = (estado: string): string => {
  if (estado === "en_revision") return "blue";
  if (estado === "validado") return "green";
  if (estado === "rechazado") return "red";
  return "gold";
};

const getEstadoLabel = (estado: string): string => {
  if (estado === "en_revision") return "En revisión";
  if (estado === "validado") return "Validado";
  if (estado === "rechazado") return "Rechazado";
  return "Pendiente";
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getValue = (r: any, ...keys: string[]): string => {
  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const v = r?.[key] as unknown;
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "-";
};

const getTipoRegistro = (r: RegistroNorm): string =>
  getValue(r, "tipoRegistro", "tipo_registro");

const getFotosRegistro = (r: RegistroNorm): string[] => {
  const urls: string[] = [];
  if (Array.isArray(r.fotosUrls)) urls.push(...r.fotosUrls);
  if (Array.isArray((r as unknown as { fotos_urls?: string[] }).fotos_urls))
    urls.push(...((r as unknown as { fotos_urls: string[] }).fotos_urls));
  if (r.fotoUrl) urls.push(r.fotoUrl);
  return [...new Set(urls.filter(Boolean))];
};

const normToSello = (r: RegistroNorm): RegistroSello => ({
  id: r.id,
  codigo: r.codigo,
  fechaEjecucion: r.fechaEjecucion,
  dia: r.dia,
  piso: r.piso,
  ejeAlfabetico: r.ejeAlfabetico,
  ejeNumerico: r.ejeNumerico,
  nombreSellador: r.nombreSellador,
  fotoUrl: r.fotoUrl ?? undefined,
  fotosUrls: r.fotosUrls,
  recinto: r.recinto,
  numeroSello: r.numeroSello,
  cantidadSellos: r.cantidadSellos,
  metrosLineales: r.metrosLineales,
  tipoRegistro: r.tipoRegistro,
  holguraCm: r.holguraCm,
  factorHolgura: r.factorHolgura as 1 | 1.2 | 1.4 | 1.8,
  cieloModular: 1,
  cantidadSellosConFactor: r.cantidadSellosConFactor,
  observaciones: r.observaciones,
  estado: r.estado,
  obraNombre: r.obraNombre,
  itemizadoBeck: r.itemizadoBeck,
  itemizadoSacyr: r.itemizadoSacyr,
  descripcionMaterial: r.descripcionMaterial,
});

const normalizeRaw = (r: RegistroApiRaw): RegistroNorm => {
  const cantidadSellos = Number(r.cantidadSellos ?? r.cantidad_sellos ?? 0);
  const metrosLineales = Number(
    r.metrosLineales ?? r.metros_lineales ?? r.longitud ?? r.longitud_m ?? 0
  );
  const holguraCm = Number(r.holgura ?? 0);
  const factor = normalizeFactorHolgura(holguraCm);
  const fecha = r.fecha ?? "";
  const diaSemana =
    r.diaSemana ?? r.dia_semana ?? (fecha ? dayjs(fecha).format("dddd") : "");
  const descripcionMaterial =
    r.descripcionMaterial ?? r.descripcion_material ?? "";

  const fotosDesdeRegistro = (r.fotos_registro ?? [])
    .map((f) => f.url)
    .filter((u): u is string => !!u);
  const fotosBase =
    r.fotosUrls?.filter((u): u is string => !!u) ??
    r.fotos_urls?.filter((u): u is string => !!u) ??
    (r.fotos?.map((f) => f.url).filter((u): u is string => !!u) ?? []);
  const allFotos = Array.from(new Set([...fotosBase, ...fotosDesdeRegistro]));
  const fotoUrl = allFotos[0] ?? r.fotoUrl ?? r.foto_url ?? null;
  const fotosUrls = allFotos.length > 0 ? allFotos : fotoUrl ? [fotoUrl] : [];

  return {
    id: r.id,
    codigo: r.codigoBeck ?? r.codigo_beck ?? `REG-${r.id.slice(0, 6)}`,
    cantidadSellos,
    metrosLineales,
    nombreSellador: r.nombreSellador ?? r.nombre_sellador ?? "",
    piso: r.piso ?? "",
    factorHolgura: factor,
    cantidadSellosConFactor: cantidadSellos * factor,
    tipoRegistro: r.tipoRegistro ?? r.tipo_registro ?? "",
    obraNombre: r.obra?.nombre ?? r.obra_nombre ?? "Sin obra",
    fechaEjecucion: fecha,
    descripcionMaterial,
    estado: normalizeEstado(r.estado),
    dia: diaSemana,
    ejeAlfabetico: r.ejeAlfabetico ?? r.eje_alfabetico ?? "",
    ejeNumerico: String(r.ejeNumerico ?? r.eje_numerico ?? ""),
    recinto: r.modulo ?? r.recinto ?? "",
    numeroSello: r.folio ?? r.FOLIO ?? r.numeroSello ?? r.numero_sello ?? "",
    holguraCm,
    observaciones: r.observaciones ?? "",
    itemizadoBeck:
      r.itemizadoBeck ?? r.itemizado_beck ?? descripcionMaterial ?? "",
    itemizadoSacyr: r.itemizadoSacyr ?? r.itemizado_sacyr ?? "",
    fotoUrl,
    fotosUrls,
  };
};

const Reportes: React.FC<ReportesProps> = ({ themeMode }) => {
  const isDark = themeMode === "dark";

  const [registros, setRegistros] = useState<RegistroNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [registroDetalle, setRegistroDetalle] = useState<RegistroNorm | null>(null);
  const [activeTipoRegistro, setActiveTipoRegistro] = useState<string>("sello_cortafuego");

  // Filtros exclusivos del bloque "Rendimiento por trabajador" — no afectan
  // ningún otro filtro ni componente del módulo Reportes.
  const [rendimientoObras, setRendimientoObras] = useState<Obra[]>([]);
  const [rendimientoObrasLoading, setRendimientoObrasLoading] = useState(false);
  const [rendimientoObraId, setRendimientoObraId] = useState<string | undefined>(undefined);
  const [rendimientoFechas, setRendimientoFechas] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, "day"),
    dayjs(),
  ]);
  const [rendimientoData, setRendimientoData] = useState<RendimientoAcumuladoItem[]>([]);
  const [rendimientoLoading, setRendimientoLoading] = useState(false);
  const [rendimientoError, setRendimientoError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadObras = async () => {
      setRendimientoObrasLoading(true);
      try {
        const data = await obrasAPI.listar({ activa: true });
        if (!ignore) setRendimientoObras(data);
      } catch {
        if (!ignore) setRendimientoObras([]);
      } finally {
        if (!ignore) setRendimientoObrasLoading(false);
      }
    };

    void loadObras();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadRendimiento = async () => {
      const [inicio, fin] = rendimientoFechas;
      if (!inicio || !fin) return;

      setRendimientoLoading(true);
      setRendimientoError(null);
      try {
        const data = await registrosAPI.getRendimientoAcumulado({
          fechaInicio: inicio.format("YYYY-MM-DD"),
          fechaFin: fin.format("YYYY-MM-DD"),
          obraId: rendimientoObraId,
        });
        if (!ignore) setRendimientoData(data);
      } catch (err) {
        if (!ignore) {
          setRendimientoData([]);
          setRendimientoError(
            err instanceof Error ? err.message : "No se pudo cargar el rendimiento por trabajador"
          );
        }
      } finally {
        if (!ignore) setRendimientoLoading(false);
      }
    };

    void loadRendimiento();
    return () => {
      ignore = true;
    };
  }, [rendimientoObraId, rendimientoFechas]);

  const openPhotos = (urls: string[], idx = 0) => {
    setPhotoUrls(urls);
    setPhotoIndex(idx);
    setPhotoOpen(true);
  };

  const handleDescargarPdf = async (record: { id: string | number; codigo?: string }) => {
    const id = String(record.id);
    const codigo = record.codigo || `REG-${id.slice(0, 6)}`;
    try {
      const response = await api.get<Blob>(`/registros/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `registro-${codigo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("PDF descargado correctamente");
    } catch {
      message.error("No se pudo descargar el PDF");
    }
  };

  const cargarRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse | RegistroApiRaw[]>("/registros");
      const lista = Array.isArray(res.data)
        ? res.data
        : (res.data as ApiResponse)?.data ?? [];
      setRegistros(lista.map(normalizeRaw));
    } catch {
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarRegistros();
  }, [cargarRegistros]);

  const registrosEspuma = useMemo(
    () => registros.filter((r) => r.tipoRegistro === "junta_lineal_espuma"),
    [registros]
  );

  const registrosCortafuego = useMemo(
    () => registros.filter((r) => r.tipoRegistro === "sello_cortafuego"),
    [registros]
  );

  const registrosOtros = useMemo(
    () =>
      registros.filter(
        (r) => r.tipoRegistro !== "sello_cortafuego" && r.tipoRegistro !== "junta_lineal_espuma"
      ),
    [registros]
  );

  const registrosFiltrados = useMemo(() => {
    const base =
      activeTipoRegistro === "junta_lineal_espuma"
        ? registrosEspuma
        : activeTipoRegistro === "sello_cortafuego"
        ? registrosCortafuego
        : registrosOtros;
    return filtroEstado === "todos"
      ? base
      : base.filter((r) => r.estado === filtroEstado);
  }, [activeTipoRegistro, registrosEspuma, registrosCortafuego, registrosOtros, filtroEstado]);

  const totalSellos = useMemo(
    () => registros.reduce((acc, r) => acc + r.cantidadSellos, 0),
    [registros]
  );
  const totalRegistros = registros.length;

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
        ultimoTrabajo: v.ultimoTrabajo
          ? dayjs(v.ultimoTrabajo).format("DD-MM-YYYY")
          : "—",
      }))
      .sort((a, b) => b.totalSellos - a.totalSellos);
  }, [registros]);

  const totalSelladores = resumenSellador.length;
  const promedioSellosRegistro = totalRegistros
    ? totalSellos / totalRegistros
    : 0;

  const pisosUnicos = useMemo(
    () => new Set(registros.map((r) => r.piso).filter(Boolean)).size,
    [registros]
  );

  // TODO: reemplazar por fórmula oficial SACYR cuando el cliente la entregue.
  const totalBeck = useMemo(
    () => registros.reduce((acc, r) => acc + r.cantidadSellosConFactor, 0),
    [registros]
  );
  const totalSacyr = totalBeck;

  const totalMetrosEspuma = useMemo(
    () => registrosEspuma.reduce((acc, r) => acc + r.metrosLineales, 0),
    [registrosEspuma]
  );
  const totalTramosEspuma = registrosEspuma.length;
  const totalCuadrillasEspuma = useMemo(
    () =>
      new Set(registrosEspuma.map((r) => r.nombreSellador).filter(Boolean))
        .size,
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

  const chartSellosPorPiso = useMemo(() => {
    const mapa = new Map<string, number>();
    registros.forEach((r) => {
      if (r.piso) mapa.set(r.piso, (mapa.get(r.piso) || 0) + r.cantidadSellos);
    });
    return Array.from(mapa.entries()).map(([name, sellos]) => ({
      name,
      sellos,
    }));
  }, [registros]);

  const chartEspumaPorPiso = useMemo(() => {
    const mapa = new Map<string, number>();
    registrosEspuma.forEach((r) => {
      if (r.piso)
        mapa.set(r.piso, (mapa.get(r.piso) || 0) + r.metrosLineales);
    });
    return Array.from(mapa.entries()).map(([name, metros]) => ({
      name,
      metros,
    }));
  }, [registrosEspuma]);

  const renderFotoCell = (_: unknown, r: RegistroNorm) => {
    const fotos = getFotosRegistro(r);
    const count = fotos.length;
    if (count === 0)
      return <span className="text-[11px] text-slate-500">Sin foto</span>;
    return (
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-16 overflow-hidden rounded-md border border-slate-200">
          <img src={fotos[0]} alt="foto" className="h-full w-full object-cover" />
          {count > 1 && (
            <span className="absolute bottom-0 right-0 m-0.5 rounded bg-black/70 px-1 text-[9px] text-white">
              {count}
            </span>
          )}
        </div>
        <Button
          size="small"
          type="link"
          className="p-0 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            openPhotos(fotos);
          }}
        >
          {count > 1 ? `Ver fotos (${count})` : "Ver foto"}
        </Button>
      </div>
    );
  };

  const columnsEspuma: ColumnsType<RegistroNorm> = [
    {
      title: "Tipo registro",
      key: "tipoRegistro",
      width: 160,
      render: (_: unknown, r: RegistroNorm) => getTipoRegistroLabel(getTipoRegistro(r)),
    },
    {
      title: "Descripción",
      key: "descripcion",
      width: 200,
      ellipsis: true,
      render: (_: unknown, r: RegistroNorm) => r.descripcionMaterial || "-",
    },
    {
      title: "Fecha ejecución sello",
      key: "fechaEjecucion",
      width: 150,
      render: (_: unknown, r: RegistroNorm) =>
        r.fechaEjecucion ? dayjs(r.fechaEjecucion).format("DD-MM-YYYY") : "-",
    },
    { title: "Día", dataIndex: "dia", key: "dia", width: 90 },
    { title: "Piso", dataIndex: "piso", key: "piso", width: 80 },
    {
      title: "Eje Alfabético",
      dataIndex: "ejeAlfabetico",
      key: "ejeAlfabetico",
      width: 110,
    },
    {
      title: "Eje Numérico",
      key: "ejeNumerico",
      width: 110,
      render: (_: unknown, r: RegistroNorm) =>
        r.ejeNumerico && String(r.ejeNumerico).trim() !== ""
          ? r.ejeNumerico
          : "-",
    },
    {
      title: "Nombre sellador",
      dataIndex: "nombreSellador",
      key: "nombreSellador",
      width: 150,
    },
    { title: "Foto", key: "foto", width: 190, render: renderFotoCell },
    {
      title: "Recinto",
      dataIndex: "recinto",
      key: "recinto",
      width: 150,
      ellipsis: true,
    },
    {
      title: "Longitud (m)",
      key: "longitud",
      width: 110,
      render: (_: unknown, r: RegistroNorm) =>
        r.metrosLineales > 0 ? `${r.metrosLineales.toFixed(2)} m` : "-",
    },
    {
      title: "Observaciones",
      dataIndex: "observaciones",
      key: "observaciones",
      width: 220,
      ellipsis: true,
      render: (v: string) => v || "-",
    },
    {
      title: "FOLIO",
      key: "folio",
      width: 120,
      render: (_: unknown, r: RegistroNorm) => r.numeroSello || "-",
    },
    {
      title: "Estado",
      key: "estado",
      width: 120,
      render: (_: unknown, r: RegistroNorm) => (
        <Tag color={getEstadoColor(r.estado)}>{getEstadoLabel(r.estado)}</Tag>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_: unknown, r: RegistroNorm) => (
        <div className="flex gap-1">
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); setRegistroDetalle(r); }}
          >
            Ver
          </Button>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); void handleDescargarPdf(r); }}
          >
            PDF
          </Button>
        </div>
      ),
    },
  ];

  const columnsCortafuego: ColumnsType<RegistroNorm> = [
    {
      title: "Tipo registro",
      key: "tipoRegistro",
      width: 160,
      render: (_: unknown, r: RegistroNorm) => getTipoRegistroLabel(getTipoRegistro(r)),
    },
    {
      title: "Codigo BECK",
      key: "codigoBeck",
      width: 120,
      render: (_: unknown, r: RegistroNorm) => r.codigo,
    },
    {
      title: "Itemizado BECK",
      key: "itemizadoBeck",
      width: 180,
      ellipsis: true,
      render: (_: unknown, r: RegistroNorm) => r.itemizadoBeck || "-",
    },
    {
      title: "Itemizado SACYR",
      key: "itemizadoSacyr",
      width: 180,
      ellipsis: true,
      render: (_: unknown, r: RegistroNorm) => r.itemizadoSacyr || "-",
    },
    {
      title: "Fecha ejecución sello",
      key: "fechaEjecucion",
      width: 150,
      render: (_: unknown, r: RegistroNorm) =>
        r.fechaEjecucion ? dayjs(r.fechaEjecucion).format("DD-MM-YYYY") : "-",
    },
    { title: "Día", dataIndex: "dia", key: "dia", width: 90 },
    { title: "Piso", dataIndex: "piso", key: "piso", width: 80 },
    {
      title: "Eje Alfabético",
      dataIndex: "ejeAlfabetico",
      key: "ejeAlfabetico",
      width: 110,
    },
    {
      title: "Eje Numérico",
      key: "ejeNumerico",
      width: 110,
      render: (_: unknown, r: RegistroNorm) =>
        r.ejeNumerico && String(r.ejeNumerico).trim() !== ""
          ? r.ejeNumerico
          : "-",
    },
    {
      title: "Nombre sellador",
      dataIndex: "nombreSellador",
      key: "nombreSellador",
      width: 150,
    },
    { title: "Foto", key: "foto", width: 190, render: renderFotoCell },
    {
      title: "Recinto",
      dataIndex: "recinto",
      key: "recinto",
      width: 150,
      ellipsis: true,
    },
    {
      title: "N° DEL SELLO",
      dataIndex: "numeroSello",
      key: "numeroSello",
      width: 130,
    },
    {
      title: "Cantidad de Sellos",
      dataIndex: "cantidadSellos",
      key: "cantidadSellos",
      width: 130,
    },
    {
      title: "Holgura (cm)",
      dataIndex: "holguraCm",
      key: "holguraCm",
      width: 110,
    },
    {
      title: "Observaciones",
      dataIndex: "observaciones",
      key: "observaciones",
      width: 220,
      ellipsis: true,
      render: (v: string) => v || "-",
    },
    {
      title: "FOLIO",
      key: "folio",
      width: 120,
      render: (_: unknown, r: RegistroNorm) => r.numeroSello || "-",
    },
    {
      title: "Estado",
      key: "estado",
      width: 120,
      render: (_: unknown, r: RegistroNorm) => (
        <Tag color={getEstadoColor(r.estado)}>{getEstadoLabel(r.estado)}</Tag>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_: unknown, r: RegistroNorm) => (
        <div className="flex gap-1">
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); setRegistroDetalle(r); }}
          >
            Ver
          </Button>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); void handleDescargarPdf(r); }}
          >
            PDF
          </Button>
        </div>
      ),
    },
  ];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Cargando registros..." />
      </div>
    );
  }

  const sinRegistros = registros.length === 0;

  return (
    <div className="w-full min-w-0 space-y-5">
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
            Panel analítico con ranking por sellador, avance por piso y métricas
            BECK / SACYR calculadas desde registros reales de terreno.
          </p>
        </div>
      </div>

      {sinRegistros ? (
        <Card
          className={`border ${
            isDark
              ? "bg-beck-card-dark border-beck-border-dark"
              : "bg-beck-card-light border-beck-border-light"
          }`}
        >
          <Empty
            description={
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                No hay registros cargados desde terreno.
              </span>
            }
          />
        </Card>
      ) : (
        <>
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

          {/* KPIs ponderados */}
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
                    Factor por holguras según contrato BECK.
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
                    Acumulado según cubicación.
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
                    Pisos con al menos un sello registrado.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Gráficos sellos */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr,1fr] gap-4">
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
              styles={{ body: { height: 280, padding: 8 } }}
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
                    tick={{ fontSize: 10, fill: isDark ? "#e5e7eb" : "#0f172a" }}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: isDark ? "#e5e7eb" : "#0f172a" }}
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
              styles={{ body: { height: 280, padding: 8 } }}
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

          {/* Rendimiento por trabajador — reutiliza el mismo endpoint/servicio
              que Dashboard.tsx (GET /registros/rendimiento-acumulado, que a su
              vez llama a calcularRendimientoPorTrabajador). Los filtros de obra
              y rango de fechas de este bloque son exclusivos de esta sección:
              no existen filtros de obra/fecha previos en Reportes para
              reutilizar, y no afectan ningún otro componente de la pantalla. */}
          <Card
            title={
              <div className="flex items-center gap-2 text-sm">
                <TeamOutlined className="text-amber-400" />
                <span>Rendimiento por trabajador</span>
              </div>
            }
            className={`border ${
              isDark
                ? "bg-beck-card-dark border-beck-border-dark"
                : "bg-beck-card-light border-beck-border-light"
            }`}
            styles={{ body: { padding: 16 } }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Select
                size="small"
                allowClear
                showSearch
                loading={rendimientoObrasLoading}
                placeholder="Todas las obras"
                style={{ width: 220 }}
                value={rendimientoObraId}
                onChange={(value) => setRendimientoObraId(value ?? undefined)}
                optionFilterProp="label"
                options={rendimientoObras.map((obra) => ({
                  label: obra.nombre,
                  value: obra.id,
                }))}
              />
              <RangePicker
                size="small"
                format="DD-MM-YYYY"
                value={rendimientoFechas}
                allowClear={false}
                onChange={(value) => {
                  if (value && value[0] && value[1]) {
                    setRendimientoFechas([value[0], value[1]]);
                  }
                }}
              />
            </div>

            {rendimientoError ? (
              <Empty
                description={
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                    {rendimientoError}
                  </span>
                }
              />
            ) : (
              <Table
                size="small"
                loading={rendimientoLoading}
                columns={rendimientoTrabajadorColumns}
                dataSource={rendimientoData}
                rowKey={(record, index) => `${record.nombreSellador}-${index}`}
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Sin datos para el rango y obra seleccionados" }}
              />
            )}
          </Card>

          {/* Reportes Técnicos */}
          <Card
            title={
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-6 w-6 rounded-full bg-sky-500/15 items-center justify-center text-sky-300 text-xs font-bold">
                  RT
                </span>
                <span>Reportes Técnicos</span>
              </div>
            }
            className={`border ${
              isDark
                ? "bg-beck-card-dark border-beck-border-dark"
                : "bg-beck-card-light border-beck-border-light"
            }`}
            styles={{ body: { padding: "0 16px 16px" } }}
          >
            <Tabs
              defaultActiveKey="sellos"
              onChange={(key) =>
                setActiveTipoRegistro(
                  key === "espuma"
                    ? "junta_lineal_espuma"
                    : key === "otros"
                    ? "otros"
                    : "sello_cortafuego"
                )
              }
              items={[
                {
                  key: "sellos",
                  label: (
                    <span className="flex items-center gap-1.5 text-sm">
                      <FireOutlined className="text-amber-400" />
                      <span>Sellos Cortafuego</span>
                    </span>
                  ),
                  children: (
                    <>
                      <div className="flex justify-end mb-3">
                        <Select
                          size="small"
                          value={filtroEstado}
                          onChange={setFiltroEstado}
                          options={ESTADOS}
                          style={{ width: 160 }}
                        />
                      </div>
                      {registrosCortafuego.length === 0 ? (
                        <Empty
                          description={
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                              No hay registros de sellos cortafuego cargados desde terreno.
                            </span>
                          }
                        />
                      ) : (
                        <Table
                          size="small"
                          columns={columnsCortafuego}
                          dataSource={registrosFiltrados}
                          rowKey="id"
                          pagination={{ pageSize: 10 }}
                          scroll={{ x: "max-content" }}
                        />
                      )}
                    </>
                  ),
                },
                {
                  key: "espuma",
                  label: (
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className="text-sky-400 font-medium">JL</span>
                      <span>Junta Lineal Espuma</span>
                    </span>
                  ),
                  children: (
                    <>
                      {totalTramosEspuma === 0 ? (
                        <Empty
                          description={
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                              No hay registros de junta lineal ESPUMA cargados desde terreno.
                            </span>
                          }
                        />
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                                Metros lineales ejecutados
                              </p>
                              <p className="text-2xl font-semibold text-sky-300">
                                {totalMetrosEspuma.toFixed(2)} m
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
                          <div className="h-64 sm:h-72 mb-4">
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
                                    value: "Metros",
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
                                  name="Metros"
                                  fill="#38bdf8"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <Table
                            size="small"
                            columns={columnsEspuma}
                            dataSource={registrosFiltrados}
                            rowKey="id"
                            pagination={{ pageSize: 8 }}
                            scroll={{ x: "max-content" }}
                          />
                        </>
                      )}
                    </>
                  ),
                },
                {
                  key: "otros",
                  label: (
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className="text-purple-400 font-medium">OT</span>
                      <span>Tabiquería / Otros</span>
                    </span>
                  ),
                  children: (
                    <>
                      <div className="flex justify-end mb-3">
                        <Select
                          size="small"
                          value={filtroEstado}
                          onChange={setFiltroEstado}
                          options={ESTADOS}
                          style={{ width: 160 }}
                        />
                      </div>
                      {registrosOtros.length === 0 ? (
                        <Empty
                          description={
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                              No hay registros de tabiquería u otros tipos cargados desde terreno.
                            </span>
                          }
                        />
                      ) : (
                        <Table
                          size="small"
                          columns={columnsCortafuego}
                          dataSource={registrosFiltrados}
                          rowKey="id"
                          pagination={{ pageSize: 10 }}
                          scroll={{ x: "max-content" }}
                        />
                      )}
                    </>
                  ),
                },
              ]}
            />
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
            styles={{ body: { padding: 0 } }}
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
        </>
      )}

      {/* Modal detalle registro */}
      <RegistroDetalleModal
        registro={registroDetalle ? normToSello(registroDetalle) : null}
        open={!!registroDetalle}
        mode="view"
        canEdit={false}
        saving={false}
        onClose={() => setRegistroDetalle(null)}
        onDownloadPdf={(rec) => void handleDescargarPdf(rec)}
      />

      {/* Modal fotos */}
      <Modal
        open={photoOpen}
        onCancel={() => setPhotoOpen(false)}
        footer={null}
        width="90vw"
        style={{ maxWidth: 900 }}
        styles={{ body: { padding: 0, background: "#000", borderRadius: 8 } }}
        centered
      >
        {photoUrls.length > 0 && (
          <div
            className="relative flex items-center justify-center"
            style={{ minHeight: 400, background: "#000" }}
          >
            <img
              src={photoUrls[photoIndex]}
              alt={`Foto ${photoIndex + 1}`}
              style={{
                maxHeight: "80vh",
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
            {photoUrls.length > 1 && (
              <>
                <Button
                  type="text"
                  icon={<LeftOutlined />}
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    border: "none",
                  }}
                  onClick={() =>
                    setPhotoIndex(
                      (i) => (i - 1 + photoUrls.length) % photoUrls.length
                    )
                  }
                />
                <Button
                  type="text"
                  icon={<RightOutlined />}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    border: "none",
                  }}
                  onClick={() =>
                    setPhotoIndex((i) => (i + 1) % photoUrls.length)
                  }
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: "#fff",
                    fontSize: 12,
                    background: "rgba(0,0,0,0.55)",
                    padding: "2px 12px",
                    borderRadius: 12,
                  }}
                >
                  {photoIndex + 1} / {photoUrls.length}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reportes;
