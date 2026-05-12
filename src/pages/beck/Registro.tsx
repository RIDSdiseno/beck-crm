// src/pages/RegistroSellos.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Modal, Select, Table, Tag, Switch, message, Tabs } from "antd";
import {
  PlusOutlined,
  FireOutlined,
  TableOutlined,
  DownloadOutlined,
  FilterOutlined,
  BarChartOutlined,
  ApartmentOutlined,
  TeamOutlined,
  UploadOutlined,
  FileExcelOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ThemeMode } from "../../hooks/useSystemTheme";
import dayjs, { Dayjs } from "dayjs";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
  metrosLineales?: number | string | null;
  metros_lineales?: number | string | null;
  longitud?: number | string | null;
  longitud_m?: number | string | null;
  tipoRegistro?: string | null;
  tipo_registro?: string | null;
  nombreSellador?: string | null;
  nombre_sellador?: string | null;
  holgura?: number | string | null;
  accesibilidad?: number | string | null;
  estado?: string | null;
  observaciones?: string | null;
  fotoUrl?: string | null;
  foto_url?: string | null;
  fotosUrls?: string[] | null;
  fotos_urls?: string[] | null;
  fotos?: Array<{ url?: string | null }> | null;
  itemizadoSacyr?: string | null;
  itemizado_sacyr?: string | null;
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
  metros_lineales: number;
  nombre_sellador: string;
  holgura: number;
  accesibilidad: number;
  observaciones: string;
  estado: RegistroDetalleUpdateValues["estado"];
};

type RegistroEstado = "pendiente" | "en_revision" | "validado" | "rechazado";

type ImportarResultadoHoja = {
  hoja: string;
  insertados: number;
  errores: Array<{ fila: number | string; error: string }>;
};

type ImportarResponse = {
  success: boolean;
  totalInsertados?: number;
  resultados?: ImportarResultadoHoja[];
  message?: string;
};

const normalizeEstado = (estado?: string | null): RegistroEstado => {
  if (
    estado === "en_revision" ||
    estado === "validado" ||
    estado === "rechazado"
  ) {
    return estado;
  }
  return "pendiente";
};

const getEstadoLabel = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "en_revision") return "En revisión";
  if (normalized === "validado") return "Validado";
  if (normalized === "rechazado") return "Rechazado";
  return "Pendiente";
};

const getEstadoColor = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "en_revision") return "blue";
  if (normalized === "validado") return "green";
  if (normalized === "rechazado") return "red";
  return "gold";
};

const getEstadoBadgeClass = (estado?: string): string => {
  const normalized = normalizeEstado(estado);
  if (normalized === "validado") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "en_revision") {
    return "border border-blue-200 bg-blue-50 text-blue-700";
  }
  if (normalized === "rechazado") {
    return "border border-red-200 bg-red-50 text-red-700";
  }
  return "border border-orange-200 bg-orange-50 text-orange-700";
};

const getTipoRegistroLabel = (tipo?: string | null): string => {
  if (tipo === "junta_lineal_espuma") return "Junta lineal espuma";
  return "Sello cortafuego";
};

const getTipoRegistroColor = (tipo?: string | null): string => {
  if (tipo === "junta_lineal_espuma") return "blue";
  return "gold";
};

const getTipoRegistroBadgeClass = (tipo?: string | null): string => {
  if (tipo === "junta_lineal_espuma") {
    return "border border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border border-amber-200 bg-amber-50 text-amber-700";
};

const getTipoRegistro = (registro: { tipoRegistro?: string | null }): string =>
  registro.tipoRegistro ?? "sello_cortafuego";

const getMetrosLineales = (registro: {
  metrosLineales?: number | string | null;
}): number | null => {
  const value = registro.metrosLineales ?? null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const formatFecha = (fecha?: string | null): string =>
  fecha ? dayjs(fecha).format("DD-MM-YYYY") : "-";

const getItemizadoSacyr = (r: { itemizadoSacyr?: string | null; itemizado_sacyr?: string | null }): string => {
  const value = r.itemizadoSacyr ?? r.itemizado_sacyr ?? "";
  return value && String(value).trim() !== "" ? String(value) : "-";
};

const getEjeNumerico = (r: { ejeNumerico?: number | string | null; eje_numerico?: number | string | null }): string => {
  const value = (r as { ejeNumerico?: number | string | null }).ejeNumerico ?? (r as { eje_numerico?: number | string | null }).eje_numerico ?? "";
  return value !== null && value !== undefined && String(value).trim() !== ""
    ? String(value)
    : "-";
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
  // Accept all possible field names for metros lineales
  const metrosLinealesRaw =
    r.metrosLineales ?? r.metros_lineales ?? r.longitud ?? r.longitud_m ?? 0;
  const metrosLineales = Number(metrosLinealesRaw);
  const tipoRegistro =
    r.tipoRegistro ?? r.tipo_registro ?? "sello_cortafuego";
  const nombreSellador = r.nombreSellador ?? r.nombre_sellador ?? "";
  const holguraCm = Number(r.holgura ?? 0);
  const accesibilidad = Number(r.accesibilidad ?? 0);
  const obraNombre = r.obra?.nombre ?? r.obra_nombre ?? "Sin obra";
  const usuarioNombre = r.usuario?.nombre ?? r.usuario_nombre ?? "Sin usuario";
  const fotoUrl =
    r.fotosUrls?.[0] ??
    r.fotos_urls?.[0] ??
    r.fotoUrl ??
    r.foto_url ??
    r.fotos?.[0]?.url ??
    undefined;
  const fotosUrls: string[] = (() => {
    const from: string[] =
      r.fotosUrls?.filter((u): u is string => !!u) ??
      r.fotos_urls?.filter((u): u is string => !!u) ??
      (r.fotos?.map((f) => f.url).filter((u): u is string => !!u) ?? []);
    return from.length > 0 ? from : fotoUrl ? [fotoUrl] : [];
  })();

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
    itemizadoSacyr: r.itemizadoSacyr ?? r.itemizado_sacyr ?? "",
    fechaEjecucion: fecha,
    dia: diaSemana,
    piso: r.piso ?? "",
    ejeAlfabetico,
    ejeNumerico,
    nombreSellador,
    fotoUrl,
    fotosUrls,
    recinto: r.modulo ?? "",
    numeroSello,
    cantidadSellos,
    metrosLineales,
    tipoRegistro,
    holguraCm,
    factorHolgura: normalizeFactorHolgura(holguraCm),
    cieloModular: normalizeCieloModular(accesibilidad),
    cantidadSellosConFactor:
      cantidadSellos * normalizeFactorHolgura(holguraCm),
    observaciones: r.observaciones ?? "",
  };
};

const fetchImageAsBase64 = async (
  url: string
): Promise<{ base64: string; ext: "jpeg" | "png" | "gif" } | null> => {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const ext: "jpeg" | "png" | "gif" = blob.type.includes("png")
      ? "png"
      : blob.type.includes("gif")
      ? "gif"
      : "jpeg";
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64 ? { base64, ext } : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const RegistroSellos: React.FC<RegistroSellosProps> = ({ themeMode }) => {
  void themeMode;

  const { user } = useAuth();
  const canReview =
    user?.rol === "Administrador" || user?.rol === "Ingenieria";
  const canCreateRegistro = user?.rol === "Administrador";
  const canDownloadPdf =
    user?.rol === "Administrador" || user?.rol === "Ingenieria";
  void canReview;

  // ── Tab activo ────────────────────────────────────────────────────────────
  const [activeTipoRegistro, setActiveTipoRegistro] = useState<
    "sello_cortafuego" | "junta_lineal_espuma"
  >("sello_cortafuego");

  const [openDrawer, setOpenDrawer] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importResult, setImportResult] = useState<ImportarResponse | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<RegistroSello[]>([]);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [detalleMode, setDetalleMode] = useState<"view" | "edit">("view");

  const cargarRegistros = useCallback(async () => {
    try {
      const res = await api.get<RegistrosApiResponse | RegistroApiRecord[]>(
        "/registros"
      );
      const lista = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const registrosNormalizados = lista.map(normalizeRegistro);
      setData(registrosNormalizados);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los registros");
    }
  }, []);

  useEffect(() => {
    void cargarRegistros();
  }, [cargarRegistros]);

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
    () =>
      Array.from(
        new Set(
          data
            .filter((r) => getTipoRegistro(r) === activeTipoRegistro)
            .map((r) => r.piso)
        )
      ).sort(),
    [data, activeTipoRegistro]
  );

  // Primero filtrar por tipo de registro, luego por piso/fecha
  const filteredData = useMemo(
    () =>
      data.filter((r) => {
        if (getTipoRegistro(r) !== activeTipoRegistro) return false;

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
    [data, filtroPiso, filtroFechas, activeTipoRegistro]
  );

  // KPIs — adaptados por tab
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
    const totalMetros = filteredData.reduce((acc, r) => {
      const m = getMetrosLineales(r);
      return acc + (m ?? 0);
    }, 0);
    const totalMetrosPonderado = filteredData.reduce((acc, r) => {
      const m = getMetrosLineales(r);
      return acc + (m ?? 0) * (r.factorHolgura || 1);
    }, 0);
    return {
      totalRegistros,
      totalSellos,
      totalPonderado,
      totalMetros,
      totalMetrosPonderado,
    };
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

  const esJuntaLineal = activeTipoRegistro === "junta_lineal_espuma";

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
      metros_lineales: values.metrosLineales ?? 0,
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
      title: "Tipo registro",
      dataIndex: "tipoRegistro",
      key: "tipoRegistro",
      fixed: "left",
      width: 150,
      render: (value: string | undefined) => (
        <Tag
          className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${getTipoRegistroBadgeClass(
            value
          )}`}
          color={getTipoRegistroColor(value)}
          style={{ marginInlineEnd: 0 }}
        >
          {getTipoRegistroLabel(value)}
        </Tag>
      ),
    },
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
      key: "itemizadoSacyr",
      width: 150,
      render: (_: unknown, r: RegistroSello) => getItemizadoSacyr(r),
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
      key: "ejeNumerico",
      width: 70,
      render: (_: unknown, r: RegistroSello) => getEjeNumerico(r),
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
      title: "Cantidad / Metros",
      key: "cantidadMetros",
      width: 140,
      render: (_value: unknown, record: RegistroSello) => {
        if (getTipoRegistro(record) === "junta_lineal_espuma") {
          const metros = getMetrosLineales(record);
          return (
            <span className="font-medium text-sky-700">
              {metros !== null ? metros.toFixed(2) : "—"} m
            </span>
          );
        }
        return (
          <span className="font-medium text-orange-700">
            {record.cantidadSellos} sellos
          </span>
        );
      },
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
      render: (_value: RegistroSello["fotoUrl"], record: RegistroSello) => {
        const count = record.fotosUrls?.length ?? (record.fotoUrl ? 1 : 0);
        if (count === 0) {
          return <span className="text-[11px] text-slate-500">Sin foto</span>;
        }
        const thumbUrl = record.fotosUrls?.[0] ?? record.fotoUrl;
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-16 overflow-hidden rounded-md border border-slate-200">
              <img
                src={thumbUrl}
                alt="Foto sello"
                className="h-full w-full object-cover"
              />
              {count > 1 && (
                <span className="absolute bottom-0 right-0 m-0.5 rounded bg-black/70 px-1 text-[9px] text-white">
                  {count}
                </span>
              )}
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
              {count > 1 ? `Ver fotos (${count})` : "Ver foto"}
            </Button>
          </div>
        );
      },
    },
    {
      title: "Obs.",
      dataIndex: "observaciones",
      key: "observaciones",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 130,
      render: (_value: unknown, record: RegistroSello) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setRegistroDetalle(record);
              setDetalleMode("view");
            }}
          >
            Ver
          </Button>
          {canDownloadPdf && (
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                void handleDescargarPdf(record);
              }}
            >
              PDF
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ── Columnas exclusivas para Junta Lineal Espuma ─────────────────────────
  const columnasJuntaLineal: ColumnsType<RegistroSello> = [
    {
      title: "Descripción",
      key: "descripcionJunta",
      width: 200,
      render: (_: unknown, r: RegistroSello) => r.descripcionMaterial || "-",
    },
    {
      title: "Fecha ejecucion sello",
      key: "fechaJunta",
      width: 150,
      render: (_: unknown, r: RegistroSello) => formatFecha(r.fechaEjecucion),
    },
    {
      title: "Día",
      key: "diaJunta",
      width: 90,
      render: (_: unknown, r: RegistroSello) => r.dia || "-",
    },
    {
      title: "Piso",
      key: "pisoJunta",
      width: 80,
      render: (_: unknown, r: RegistroSello) => r.piso || "-",
    },
    {
      title: "Eje Alfabético",
      key: "ejeAlfJunta",
      width: 120,
      render: (_: unknown, r: RegistroSello) => r.ejeAlfabetico || "-",
    },
    {
      title: "Eje Numérico",
      key: "ejeNumJunta",
      width: 120,
      render: (_: unknown, r: RegistroSello) => getEjeNumerico(r),
    },
    {
      title: "Nombre sellador",
      key: "selladorJunta",
      width: 160,
      render: (_: unknown, r: RegistroSello) => r.nombreSellador || "-",
    },
    {
      title: "Foto",
      key: "fotoJunta",
      width: 160,
      render: (_: unknown, r: RegistroSello) => {
        const count = r.fotosUrls?.length ?? (r.fotoUrl ? 1 : 0);
        if (count === 0) {
          return <span className="text-[11px] text-slate-500">Sin foto</span>;
        }
        const thumbUrl = r.fotosUrls?.[0] ?? r.fotoUrl;
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-16 overflow-hidden rounded-md border border-slate-200">
              <img
                src={thumbUrl}
                alt="Foto junta"
                className="h-full w-full object-cover"
              />
              {count > 1 && (
                <span className="absolute bottom-0 right-0 m-0.5 rounded bg-black/70 px-1 text-[9px] text-white">
                  {count}
                </span>
              )}
            </div>
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                setRegistroDetalle(r);
                setDetalleMode("view");
              }}
              className="p-0 text-[11px]"
            >
              {count > 1 ? `Ver fotos (${count})` : "Ver foto"}
            </Button>
          </div>
        );
      },
    },
    {
      title: "Recinto",
      key: "recintoJunta",
      width: 160,
      render: (_: unknown, r: RegistroSello) => r.recinto || "-",
    },
    {
      title: "Longitud (m)",
      key: "longitudJunta",
      width: 110,
      render: (_: unknown, r: RegistroSello) => {
        const metros = getMetrosLineales(r);
        return metros !== null ? `${metros.toFixed(2)} m` : "-";
      },
    },
    {
      title: "Observaciones",
      key: "observacionesJunta",
      width: 220,
      ellipsis: true,
      render: (_: unknown, r: RegistroSello) => r.observaciones || "-",
    },
    {
      title: "FOLIO",
      key: "folioJunta",
      width: 100,
      render: (_: unknown, r: RegistroSello) => r.numeroSello || "-",
    },
  ];

  const clavesCompactas = new Set([
    "tipoRegistro",
    "itemizadoBeck",
    "itemizadoSacyr",
    "obraNombre",
    "usuarioNombre",
    "fechaEjecucion",
    "piso",
    "recinto",
    "cantidadMetros",
    "estado",
    "factorHolgura",
    "cantidadSellosConFactor",
    "foto",
    "acciones",
  ]);

  const columnasTabla = useMemo(() => {
    if (activeTipoRegistro === "junta_lineal_espuma") return columnasJuntaLineal;
    return vistaCompleta
      ? todasLasColumnas
      : todasLasColumnas.filter(
          (c) => c.key && clavesCompactas.has(String(c.key))
        );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaCompleta, activeTipoRegistro]);

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
      metrosLineales: values.metrosLineales ?? 0,
      tipoRegistro: values.tipoRegistro,
      holguraCm: values.holguraCm,
      factorHolgura: factor,
      cieloModular: values.cieloModular,
      cantidadSellosConFactor: cantidad * factor,
      observaciones: values.observaciones,
    };

    setData((prev) => [...prev, nuevo]);
    setOpenDrawer(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = "";

    const formData = new FormData();
    formData.append("file", archivo);

    setImportando(true);
    const hide = message.loading("Importando registros...", 0);
    try {
      const res = await api.post<ImportarResponse>(
        "/registros/importar",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      hide();
      const resultado = res.data;
      setImportResult(resultado);
      setShowImportModal(true);
      await cargarRegistros();
    } catch (error) {
      hide();
      console.error(error);
      message.error("Error al importar el archivo");
    } finally {
      setImportando(false);
    }
  };

  const handleDescargarPlantilla = async () => {
    setDescargandoPlantilla(true);
    const hide = message.loading("Generando plantilla Excel…", 0);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Beck CRM";
      workbook.created = new Date();
      workbook.modified = new Date();

      const YELLOW = "FFFACC15";
      const BORDER_HEADER = "FFD97706";
      const BORDER_CELL = "FFE5E7EB";

      const buildTemplateSheet = (
        sheetName: string,
        obraText: string,
        headers: string[],
        example: Array<string | number>
      ) => {
        const ws = workbook.addWorksheet(sheetName);

        ws.mergeCells(1, 1, 1, headers.length);
        const obraCell = ws.getCell(1, 1);
        obraCell.value = obraText;
        obraCell.font = { bold: true, size: 11, color: { argb: "FF0F172A" } };
        obraCell.alignment = { horizontal: "left", vertical: "middle" };
        obraCell.border = {
          top: { style: "thin", color: { argb: BORDER_CELL } },
          left: { style: "thin", color: { argb: BORDER_CELL } },
          bottom: { style: "thin", color: { argb: BORDER_CELL } },
          right: { style: "thin", color: { argb: BORDER_CELL } },
        };
        ws.getRow(1).height = 26;

        const headerRow = ws.getRow(2);
        headerRow.height = 32;
        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: YELLOW },
          };
          cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
          cell.border = {
            top: { style: "thin", color: { argb: BORDER_HEADER } },
            left: { style: "thin", color: { argb: BORDER_HEADER } },
            bottom: { style: "medium", color: { argb: BORDER_HEADER } },
            right: { style: "thin", color: { argb: BORDER_HEADER } },
          };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        });

        const exampleRow = ws.getRow(3);
        exampleRow.height = 22;
        example.forEach((v, i) => {
          const cell = exampleRow.getCell(i + 1);
          cell.value = v;
          cell.border = {
            top: { style: "thin", color: { argb: BORDER_CELL } },
            left: { style: "thin", color: { argb: BORDER_CELL } },
            bottom: { style: "thin", color: { argb: BORDER_CELL } },
            right: { style: "thin", color: { argb: BORDER_CELL } },
          };
          cell.alignment = { vertical: "middle", wrapText: true };
          cell.font = { size: 10 };
        });

        headers.forEach((h, i) => {
          const exampleLen = String(example[i] ?? "").length;
          const headerLen = h.length;
          const width = Math.min(Math.max(headerLen, exampleLen) + 4, 38);
          ws.getColumn(i + 1).width = width;
        });

        ws.views = [{ state: "frozen", ySplit: 2 }];
      };

      // ── Hoja 1: SELLOS CORTAFUEGOS ─────────────────────────────
      const sellosHeaders = [
        "Codigo BECK",
        "Itemizado BECK",
        "Itemizado SACYR",
        "Fecha ejecucion sello",
        "Dia",
        "Piso",
        "Eje Alfabético",
        "Eje Numérico",
        "Nombre sellador",
        "Recinto",
        "N° DEL SELLO",
        "Cantidad de Sellos",
        "Holgura (cm)",
        "Observaciones",
        "Foto",
      ];
      const sellosExample: Array<string | number> = [
        179,
        "Tubería metálica de Ø ≤ 50 mm (T)",
        "SELLOS-ATR-Tuberia PEX 32 VERTICAL",
        "15-09-2025",
        "lunes",
        2,
        "D-E",
        "15-16",
        "Adonis G",
        "C.2.6.2.1",
        "2-02739",
        1,
        2,
        "REPARACION",
        "",
      ];
      buildTemplateSheet(
        "SELLOS CORTAFUEGOS",
        "Obra: Obra Demo",
        sellosHeaders,
        sellosExample
      );

      // ── Hoja 2: JUNTA LINEAL ESPUMA ────────────────────────────
      const juntaHeaders = [
        "Descripción",
        "Fecha ejecucion sello",
        "Día",
        "Piso",
        "Eje Alfabético",
        "Eje Numérico",
        "Nombre sellador",
        "Foto",
        "Recinto",
        "Longitud (m)",
        "Observaciones",
        "FOLIO",
      ];
      const juntaExample: Array<string | number> = [
        "Junta lineal con ESPUMA",
        "15-09-2025",
        "lunes",
        2,
        "A-B",
        "8-9",
        "Josue M",
        "PONER FOTO AQUÍ",
        "F.1.3_C",
        "12,78",
        "Sin observaciones",
        "JL-0001",
      ];
      buildTemplateSheet(
        "JUNTA LINEAL ESPUMA",
        "Obra: Obra Demo",
        juntaHeaders,
        juntaExample
      );

      // ── Hoja 3: INSTRUCCIONES ──────────────────────────────────
      const instrWs = workbook.addWorksheet("INSTRUCCIONES");
      instrWs.getColumn(1).width = 100;

      instrWs.mergeCells(1, 1, 1, 1);
      const instrTitle = instrWs.getCell(1, 1);
      instrTitle.value = "INSTRUCCIONES DE USO · Plantilla Beck CRM";
      instrTitle.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: YELLOW },
      };
      instrTitle.font = { bold: true, size: 13, color: { argb: "FF0F172A" } };
      instrTitle.alignment = { horizontal: "center", vertical: "middle" };
      instrTitle.border = {
        top: { style: "medium", color: { argb: BORDER_HEADER } },
        left: { style: "medium", color: { argb: BORDER_HEADER } },
        bottom: { style: "medium", color: { argb: BORDER_HEADER } },
        right: { style: "medium", color: { argb: BORDER_HEADER } },
      };
      instrWs.getRow(1).height = 34;

      const instructions: string[] = [
        '1. La obra debe existir previamente en el sistema antes de importar.',
        '2. Cambiar el texto "Obra: Obra Demo" (fila 1 de cada hoja) por el nombre real de la obra.',
        '3. No cambiar los nombres de las hojas "SELLOS CORTAFUEGOS" ni "JUNTA LINEAL ESPUMA".',
        "4. No modificar el nombre ni el orden de los encabezados (fila 2).",
        '5. Para registros de sellos cortafuego usar la columna "Cantidad de Sellos".',
        '6. Para registros de junta lineal espuma usar la columna "Longitud (m)".',
        '7. Se aceptan decimales con coma, por ejemplo 12,78.',
        '8. Cuando la plantilla esté completa, súbela usando el botón "Importar Excel" en la vista de Registro.',
        '9. Para adjuntar imágenes:',
        '   • Insertar → Imágenes → Colocar sobre celdas → Este dispositivo.',
        '   • La foto debe quedar dentro de la fila correspondiente.',
        '   • Puede insertar varias imágenes por registro.',
      ];

      instructions.forEach((text, i) => {
        const row = instrWs.getRow(2 + i);
        row.height = 28;
        const cell = row.getCell(1);
        cell.value = text;
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.font = { size: 11, color: { argb: "FF0F172A" } };
        cell.border = {
          top: { style: "thin", color: { argb: BORDER_CELL } },
          left: { style: "thin", color: { argb: BORDER_CELL } },
          bottom: { style: "thin", color: { argb: BORDER_CELL } },
          right: { style: "thin", color: { argb: BORDER_CELL } },
        };
      });

      instrWs.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer as ArrayBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "plantilla_importacion_registros_beck.xlsx"
      );
      message.success("Plantilla descargada correctamente");
    } catch (error) {
      console.error(error);
      message.error("No se pudo generar la plantilla");
    } finally {
      hide();
      setDescargandoPlantilla(false);
    }
  };

  const handleExportExcel = async () => {
    if (!filteredData.length) return;

    setExportando(true);
    const hide = message.loading("Generando Excel profesional…", 0);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Beck CRM";
      workbook.created = new Date();
      workbook.modified = new Date();

      let logoBase64 = "";
      let logoH = 70;
      const LOGO_W = 120;

      try {
        const logoRes = await fetch("/logo.png");
        if (logoRes.ok) {
          const logoBlob = await logoRes.blob();
          logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
            reader.onerror = () => reject(new Error("logo"));
            reader.readAsDataURL(logoBlob);
          });
          const objUrl = URL.createObjectURL(logoBlob);
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                logoH = Math.min(Math.round(LOGO_W * img.naturalHeight / img.naturalWidth), 90);
              }
              URL.revokeObjectURL(objUrl);
              resolve();
            };
            img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(); };
            img.src = objUrl;
          });
        }
      } catch { /* logo no disponible */ }

      const ws = workbook.addWorksheet("Registros");

      const COLS: { header: string; key: string; width: number }[] = [
        { header: "Código",           key: "codigo",          width: 14 },
        { header: "Tipo",             key: "tipo",            width: 14 },
        { header: "Itemizado SACYR",  key: "itemizadoSacyr",  width: 22 },
        { header: "Obra",             key: "obra",            width: 20 },
        { header: "Fecha",         key: "fecha",         width: 13 },
        { header: "Piso",          key: "piso",          width: 10 },
        { header: "Eje alfa",      key: "ejeAlfa",       width: 10 },
        { header: "Eje núm",       key: "ejeNum",        width: 10 },
        { header: "Sellador",      key: "sellador",      width: 20 },
        { header: "Recinto",       key: "recinto",       width: 18 },
        { header: "Cant. sellos",  key: "sellos",        width: 14 },
        { header: "Metros lin.",   key: "metros",        width: 13 },
        { header: "Holgura (cm)",  key: "holgura",       width: 13 },
        { header: "Accesibilidad", key: "accesibilidad", width: 14 },
        { header: "Estado",        key: "estado",        width: 14 },
        { header: "Observaciones", key: "observaciones", width: 30 },
        { header: "Foto",          key: "foto",          width: 18 },
      ];
      const NCOLS = COLS.length;

      ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));

      const LOGO_ROW   = 1;
      const HEADER_ROW = 3;
      const DATA_START = 4;
      const FOTO_COL     = NCOLS;
      const FOTO_COL_IDX = NCOLS - 1;
      const numericCols  = new Set([11, 12, 13, 14]);

      ws.mergeCells(LOGO_ROW, 1, LOGO_ROW, NCOLS);
      const bannerCell = ws.getCell(LOGO_ROW, 1);
      bannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      const BANNER_H = Math.max(60, logoH + 14);
      ws.getRow(LOGO_ROW).height = BANNER_H;

      if (logoBase64) {
        const logoId = workbook.addImage({ base64: logoBase64, extension: "png" });
        ws.addImage(logoId, {
          tl: { col: 0.2, row: 0.15 },
          ext: { width: LOGO_W, height: logoH },
          editAs: "oneCell",
        } as unknown as ExcelJS.ImageRange);
      }

      ws.getRow(2).height = 10;

      const headerRow = ws.getRow(HEADER_ROW);
      headerRow.height = 28;
      COLS.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.header;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFACC15" } };
        cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
        cell.border = {
          top:    { style: "thin",   color: { argb: "FFD97706" } },
          left:   { style: "thin",   color: { argb: "FFD97706" } },
          bottom: { style: "medium", color: { argb: "FFD97706" } },
          right:  { style: "thin",   color: { argb: "FFD97706" } },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });

      ws.views = [{ state: "frozen", ySplit: HEADER_ROW }];
      const lastColLetter = String.fromCharCode(64 + NCOLS);
      ws.autoFilter = `A${HEADER_ROW}:${lastColLetter}${HEADER_ROW}`;

      const thumbData = await Promise.all(
        filteredData.map((r) => {
          const url = r.fotosUrls?.[0] ?? r.fotoUrl ?? null;
          return url ? fetchImageAsBase64(url) : Promise.resolve(null);
        })
      );

      filteredData.forEach((r, idx) => {
        const excelRowNum = DATA_START + idx;
        const esSello = !r.tipoRegistro || r.tipoRegistro === "sello_cortafuego";
        const esJunta = r.tipoRegistro === "junta_lineal_espuma";
        const totalFotos  = r.fotosUrls?.length ?? (r.fotoUrl ? 1 : 0);
        const extraPhotos = Math.max(0, totalFotos - 1);

        const fotoTexto = totalFotos === 0
          ? "Sin foto"
          : extraPhotos > 0
          ? `+${extraPhotos} fotos`
          : "";

        const values: Record<string, string | number | null> = {
          codigo:          r.codigo ?? `REG-${String(r.id).slice(0, 6)}`,
          tipo:            getTipoRegistroLabel(r.tipoRegistro),
          itemizadoSacyr:  getItemizadoSacyr(r),
          obra:            r.obraNombre ?? "",
          fecha:         dayjs(r.fechaEjecucion).format("DD-MM-YYYY"),
          piso:          r.piso,
          ejeAlfa:       r.ejeAlfabetico,
          ejeNum:        getEjeNumerico(r),
          sellador:      r.nombreSellador,
          recinto:       r.recinto,
          sellos:        esSello ? r.cantidadSellos : null,
          metros:        esJunta ? (getMetrosLineales(r) ?? null) : null,
          holgura:       r.holguraCm,
          accesibilidad: r.accesibilidad ?? null,
          estado:        getEstadoLabel(r.estado),
          observaciones: r.observaciones ?? "",
          foto:          fotoTexto,
        };

        const dataRow = ws.getRow(excelRowNum);
        dataRow.height = 62;

        COLS.forEach((col, i) => {
          const cell = dataRow.getCell(i + 1);
          cell.value = values[col.key] ?? null;
          cell.border = {
            top:    { style: "thin", color: { argb: "FFE5E7EB" } },
            left:   { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right:  { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          if (numericCols.has(i + 1)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            if (typeof cell.value === "number") {
              cell.numFmt = col.key === "metros" ? "#,##0.00" : "#,##0";
            }
          } else if (col.key === "foto") {
            cell.alignment = { horizontal: "center", vertical: "bottom" };
            cell.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
          } else {
            cell.alignment = {
              vertical: "middle",
              wrapText: col.key === "observaciones",
            };
          }
        });

        const img = thumbData[idx];
        if (img) {
          const imageId = workbook.addImage({ base64: img.base64, extension: img.ext });
          ws.addImage(imageId, {
            tl:     { col: FOTO_COL_IDX, row: excelRowNum - 1 },
            ext:    { width: 90, height: 46 },
            editAs: "oneCell",
          } as unknown as ExcelJS.ImageRange);
          if (extraPhotos > 0) {
            ws.getCell(excelRowNum, FOTO_COL).note =
              `${totalFotos} fotos en total. Ver hoja "Fotos" para todas las imágenes.`;
          }
        }
      });

      // Hoja "Fotos"
      const fotosWs = workbook.addWorksheet("Fotos");
      fotosWs.columns = [
        { key: "col_a", width: 46 },
        { key: "col_b", width: 20 },
        { key: "col_c", width: 20 },
        { key: "col_d", width: 18 },
      ];

      const allImgsData = await Promise.all(
        filteredData.map((r) => {
          const urls: string[] = r.fotosUrls?.length
            ? r.fotosUrls
            : r.fotoUrl
            ? [r.fotoUrl]
            : [];
          return Promise.all(urls.slice(0, 6).map((u) => fetchImageAsBase64(u)));
        })
      );

      const FOTO_IMG_W      = 320;
      const FOTO_IMG_H      = 220;
      const FOTO_IMG_ROW_H  = 168;
      const FOTO_HDR_H      = 36;
      const FOTO_SUB_H      = 22;
      const FOTO_SPACER_H   = 10;

      fotosWs.mergeCells(1, 1, 1, 4);
      const fotosBannerCell = fotosWs.getCell(1, 1);
      fotosBannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      fotosWs.getRow(1).height = Math.max(60, logoH + 14);
      if (logoBase64) {
        const fotosLogoId = workbook.addImage({ base64: logoBase64, extension: "png" });
        fotosWs.addImage(fotosLogoId, {
          tl: { col: 0.2, row: 0.15 },
          ext: { width: LOGO_W, height: logoH },
          editAs: "oneCell",
        } as unknown as ExcelJS.ImageRange);
      }
      let fotoRow = 2;

      for (let i = 0; i < filteredData.length; i++) {
        const r    = filteredData[i];
        const imgs = allImgsData[i];
        const codigo = r.codigo ?? `REG-${String(r.id).slice(0, 6)}`;

        fotosWs.mergeCells(fotoRow, 1, fotoRow, 4);
        const hdrCell = fotosWs.getCell(fotoRow, 1);
        hdrCell.value = `${codigo}  ·  ${r.obraNombre ?? ""}`;
        hdrCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        hdrCell.font  = { bold: true, size: 11, color: { argb: "FFFACC15" } };
        hdrCell.alignment = { horizontal: "left", vertical: "middle" };
        hdrCell.border = {
          top:   { style: "medium", color: { argb: "FFFACC15" } },
          left:  { style: "medium", color: { argb: "FFFACC15" } },
          right: { style: "medium", color: { argb: "FFFACC15" } },
        };
        fotosWs.getRow(fotoRow).height = FOTO_HDR_H;
        fotoRow++;

        fotosWs.mergeCells(fotoRow, 1, fotoRow, 4);
        const subCell = fotosWs.getCell(fotoRow, 1);
        subCell.value = `Tipo: ${getTipoRegistroLabel(r.tipoRegistro)}   ·   Fecha: ${dayjs(r.fechaEjecucion).format("DD-MM-YYYY")}   ·   Estado: ${getEstadoLabel(r.estado)}`;
        subCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        subCell.font  = { size: 9, color: { argb: "FFC4C4C4" } };
        subCell.alignment = { horizontal: "left", vertical: "middle" };
        subCell.border = {
          left:   { style: "medium", color: { argb: "FFFACC15" } },
          right:  { style: "medium", color: { argb: "FFFACC15" } },
          bottom: { style: "thin",   color: { argb: "FF374151" } },
        };
        fotosWs.getRow(fotoRow).height = FOTO_SUB_H;
        fotoRow++;

        if (imgs.length === 0) {
          fotosWs.mergeCells(fotoRow, 1, fotoRow, 4);
          const noCell = fotosWs.getCell(fotoRow, 1);
          noCell.value = "Registro sin fotografías";
          noCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          noCell.font  = { italic: true, size: 10, color: { argb: "FF94A3B8" } };
          noCell.alignment = { horizontal: "center", vertical: "middle" };
          noCell.border = {
            left:   { style: "medium", color: { argb: "FFFACC15" } },
            right:  { style: "medium", color: { argb: "FFFACC15" } },
            bottom: { style: "thin",   color: { argb: "FFE2E8F0" } },
          };
          fotosWs.getRow(fotoRow).height = 32;
          fotoRow++;
        } else {
          for (let j = 0; j < imgs.length; j++) {
            const imgData = imgs[j];
            fotosWs.mergeCells(fotoRow, 1, fotoRow, 4);
            const imgCell = fotosWs.getCell(fotoRow, 1);
            imgCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
            imgCell.border = {
              left:   { style: "medium", color: { argb: "FFFACC15" } },
              right:  { style: "medium", color: { argb: "FFFACC15" } },
              top:    { style: "thin",   color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin",   color: { argb: "FFE2E8F0" } },
            };
            fotosWs.getRow(fotoRow).height = FOTO_IMG_ROW_H;

            if (imgData) {
              const imgId = workbook.addImage({ base64: imgData.base64, extension: imgData.ext });
              fotosWs.addImage(imgId, {
                tl:     { col: 0, row: fotoRow - 1 },
                ext:    { width: FOTO_IMG_W, height: FOTO_IMG_H },
                editAs: "oneCell",
              } as unknown as ExcelJS.ImageRange);
            } else {
              imgCell.value = "Error cargando imagen";
              imgCell.font  = { italic: true, size: 10, color: { argb: "FFEF4444" } };
              imgCell.alignment = { horizontal: "center", vertical: "middle" };
            }
            fotoRow++;
          }
        }

        fotosWs.mergeCells(fotoRow, 1, fotoRow, 4);
        const spacerCell = fotosWs.getCell(fotoRow, 1);
        spacerCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDDDDD" } };
        spacerCell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
        fotosWs.getRow(fotoRow).height = FOTO_SPACER_H;
        fotoRow++;
      }

      // Hoja "Resumen"
      const summaryWs = workbook.addWorksheet("Resumen");
      summaryWs.columns = [
        { key: "metrica", width: 32 },
        { key: "valor",   width: 16 },
      ];

      summaryWs.mergeCells("A1:B1");
      const titleCell = summaryWs.getCell("A1");
      titleCell.value = "RESUMEN · Beck CRM";
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      titleCell.font = { bold: true, size: 13, color: { argb: "FFFACC15" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      summaryWs.getRow(1).height = 36;

      summaryWs.getRow(2).height = 6;

      const sHeader = summaryWs.getRow(3);
      sHeader.height = 24;
      ["Métrica", "Valor"].forEach((label, i) => {
        const cell = sHeader.getCell(i + 1);
        cell.value = label;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFACC15" } };
        cell.font = { bold: true, size: 10 };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "medium" }, right: { style: "thin" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const summaryData = [
        { metrica: "Total registros",       valor: filteredData.length },
        { metrica: "Total sellos",          valor: filteredData.reduce((a, r) => a + r.cantidadSellos, 0) },
        { metrica: "Total metros lineales", valor: Number(filteredData.reduce((a, r) => a + (getMetrosLineales(r) ?? 0), 0).toFixed(2)) },
        { metrica: "Validados",             valor: filteredData.filter((r) => r.estado === "validado").length },
        { metrica: "Pendientes",            valor: filteredData.filter((r) => r.estado === "pendiente").length },
        { metrica: "En revisión",           valor: filteredData.filter((r) => r.estado === "en_revision").length },
        { metrica: "Rechazados",            valor: filteredData.filter((r) => r.estado === "rechazado").length },
      ];

      summaryData.forEach((item, i) => {
        const row = summaryWs.getRow(4 + i);
        row.height = 22;
        const mCell = row.getCell(1);
        const vCell = row.getCell(2);
        mCell.value = item.metrica;
        vCell.value = item.valor;
        [mCell, vCell].forEach((c) => {
          c.border = {
            top:    { style: "thin", color: { argb: "FFE5E7EB" } },
            left:   { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right:  { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });
        mCell.alignment = { vertical: "middle" };
        mCell.font = { size: 10 };
        vCell.alignment = { horizontal: "center", vertical: "middle" };
        vCell.font = { bold: true, size: 11 };
        if (typeof item.valor === "number") {
          vCell.numFmt = "#,##0.##";
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `BECK_registros_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
      saveAs(
        new Blob([buffer as ArrayBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
      message.success("Excel generado correctamente");
    } catch (error) {
      console.error(error);
      message.error("Error al generar el Excel");
    } finally {
      hide();
      setExportando(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header superior */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-orange-700">
            <FireOutlined className="text-[12px]" />
            <span>Panel de registro</span>
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-wide text-slate-900">
            {esJuntaLineal
              ? "Registro de junta lineal espuma"
              : "Registro de sellos · Itemizado BECK / SACYR"}
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-xl">
            {esJuntaLineal
              ? "Control diario de juntas lineales con fotos, longitud en metros y salida directa a Excel para informes de avance."
              : "Control diario de sellos con fotos, factores de holgura y salida directa a Excel para informes de avance y cubicaciones de protección pasiva contra incendios."}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {canCreateRegistro && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
              <Button
                icon={<FileExcelOutlined />}
                className="text-xs"
                loading={descargandoPlantilla}
                onClick={() => void handleDescargarPlantilla()}
              >
                Descargar plantilla Excel
              </Button>
              <Button
                icon={<UploadOutlined />}
                className="text-xs"
                loading={importando}
                onClick={() => fileInputRef.current?.click()}
              >
                Importar Excel
              </Button>
            </>
          )}
          <Button
            icon={<DownloadOutlined />}
            className="text-xs"
            loading={exportando}
            onClick={() => void handleExportExcel()}
          >
            Exportar vista a Excel
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

      {/* Tabs de tipo registro */}
      <Tabs
        activeKey={activeTipoRegistro}
        onChange={(key) =>
          setActiveTipoRegistro(
            key as "sello_cortafuego" | "junta_lineal_espuma"
          )
        }
        items={[
          {
            key: "sello_cortafuego",
            label: (
              <span className="flex items-center gap-1.5">
                <FireOutlined />
                Sellos Cortafuego
              </span>
            ),
          },
          {
            key: "junta_lineal_espuma",
            label: (
              <span className="flex items-center gap-1.5">
                <DashboardOutlined />
                Junta Lineal Espuma
              </span>
            ),
          },
        ]}
        className="mb-0"
      />

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

        {/* KPI 2: sellos / metros */}
        <Card
          className="relative overflow-hidden border bg-gradient-to-br from-white via-slate-50 to-sky-100 border-slate-200 shadow-sm"
          styles={{ body: { padding: 16 } }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-700 via-sky-500 to-amber-300" />
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {esJuntaLineal ? "Metros lineales registrados" : "Sellos registrados"}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {esJuntaLineal
                  ? resumen.totalMetros.toFixed(2)
                  : resumen.totalSellos}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {esJuntaLineal ? "Metros lineales totales" : "Conteo directo de unidades"}
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
                {esJuntaLineal ? "Metros ponderados" : "Sellos ponderados"}
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600">
                {esJuntaLineal
                  ? resumen.totalMetrosPonderado.toFixed(2)
                  : resumen.totalPonderado.toFixed(1)}
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
            <span>
              {esJuntaLineal ? "Junta Lineal Espuma" : "Itemizado BECK / SACYR"}
            </span>
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

      {/* Modal resultado importación */}
      <Modal
        title="Resultado de importación"
        open={showImportModal}
        onCancel={() => setShowImportModal(false)}
        onOk={() => setShowImportModal(false)}
        cancelButtonProps={{ style: { display: "none" } }}
      >
        {importResult && (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-800">
              Total insertados:{" "}
              <span className="text-emerald-600">
                {importResult.totalInsertados ?? 0}
              </span>
            </p>

            {importResult.resultados && importResult.resultados.length > 0 && (
              <div className="space-y-3">
                {importResult.resultados.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="font-medium text-slate-700">
                      Hoja: <span className="text-orange-700">{r.hoja}</span>
                    </p>
                    <p className="text-slate-600">
                      Insertados:{" "}
                      <span className="font-semibold text-emerald-600">
                        {r.insertados}
                      </span>
                    </p>
                    {r.errores && r.errores.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-600">
                          Errores ({r.errores.length}):
                        </p>
                        <ul className="mt-1 space-y-1">
                          {r.errores.map((err, j) => (
                            <li
                              key={j}
                              className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                            >
                              <span className="font-semibold">
                                Fila {err.fila}:
                              </span>{" "}
                              {err.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {importResult.message && (
              <p className="text-xs text-slate-500">{importResult.message}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal detalle */}
      <RegistroDetalleModal
        registro={registroDetalle}
        open={!!registroDetalle}
        mode={detalleMode}
        canEdit={false}
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
