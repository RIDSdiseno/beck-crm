// src/pages/RegistroSellos.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DatePicker, Input, Modal, Segmented, Select, Table, Tag, Switch, Tooltip, message } from "antd";
import {
  FireOutlined,
  TableOutlined,
  DownloadOutlined,
  FilterOutlined,
  BarChartOutlined,
  ApartmentOutlined,
  TeamOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ThemeMode } from "../../hooks/useSystemTheme";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import type { RegistroSello } from "../../types/registroSello";
import RegistroDetalleModal, {
  type RegistroDetalleUpdateValues,
} from "../../components/RegistroDetalleModal";
import NuevoRegistroDrawer, {
  type NuevoRegistroValues,
} from "../../components/NuevoRegistroDrawer";
import {
  api,
  configuracionCamposRegistroAPI,
  itemizadosMandanteAPI,
  obrasAPI,
  registrosAPI,
  type CampoConfiguracionRegistro,
  type ItemizadoMandante,
  type Obra,
  type RendimientoAcumuladoItem,
  type RendimientoAcumuladoParams,
  type RolConfiguracionCamposRegistro,
} from "../../services/api";
import { useAuth } from "../../context/useAuth";
import { usePermisos } from "../../hooks/usePermisos";

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
  factorPorHolguras?: number | string | null;
  factor_por_holguras?: number | string | null;
  cieloModular?: number | string | null;
  cielo_modular?: number | string | null;
  cantidadSellosConFactores?: number | string | null;
  cantidad_sellos_con_factores?: number | string | null;
  aislacion?: number | string | null;
  cantidadSellosAislacion?: number | string | null;
  cantidad_sellos_aislacion?: number | string | null;
  reparacionTabique?: number | string | null;
  reparacion_tabique?: number | string | null;
  cantidadFinal?: number | string | null;
  cantidad_final?: number | string | null;
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
  itemizadoMandanteId?: string | null;
  itemizado_mandante_id?: string | null;
  itemizadoMandanteNombre?: string | null;
  itemizadoMandante?: { id?: string | null; nombre?: string | null; codigoBeck?: string | null } | null;
  codigoBeck?: string | null;
  codigo_beck?: string | null;
  obra?: { nombre?: string | null; rendimientoSellosEsperadoDiario?: number | null; rendimientoReparacionEsperadoDiario?: number | null } | null;
  obra_nombre?: string | null;
  usuario?: { nombre?: string | null } | null;
  usuario_nombre?: string | null;
  motivoRechazo?: string | null;
  fechaRechazo?: string | null;
  rechazadoPor?: { id?: string; nombre?: string | null } | null;
  esCorreccion?: boolean | null;
  registroOrigenId?: string | null;
  registroOrigen?: { id?: string; motivoRechazo?: string | null } | null;
  cantidadEjecutada?: number | null;
  rendimientoIndividual?: number | null;
  rendimientoIndividualPct?: number | null;
  estadoValidacionObra?: "pendiente" | "validado" | "rechazado" | null;
  validacionObraPorId?: string | null;
  validacionObraAt?: string | null;
  motivoRechazoObra?: string | null;
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
  factor_por_holguras?: number | string | null;
  cielo_modular?: number | string | null;
  cantidad_sellos_con_factores?: number | string | null;
  aislacion?: number | string | null;
  cantidad_sellos_aislacion?: number | string | null;
  reparacion_tabique?: number | string | null;
  cantidad_final?: number | string | null;
  metros_lineales: number;
  nombre_sellador: string;
  holgura: number;
  accesibilidad: number;
  observaciones: string;
  estado: RegistroDetalleUpdateValues["estado"];
  itemizadoMandanteId?: string;
  codigoBeck?: string;
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
  creados?: number;
  duplicadosOmitidos?: number;
  advertencias?: string[];
  resultados?: ImportarResultadoHoja[];
  message?: string;
};

type CreateRegistroResponse = {
  success?: boolean;
  data?: RegistroApiRecord;
  warningTipoRegistro?: boolean;
  message?: string;
};

const isNetworkOrTimeoutError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "ECONNABORTED" ||
    e.code === "ERR_NETWORK" ||
    e.code === "ERR_CANCELED" ||
    (typeof e.message === "string" && e.message.toLowerCase().includes("timeout"))
  );
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

const normalizeEstadoValidacionObra = (
  estado?: string | null
): "pendiente" | "validado" | "rechazado" => {
  if (estado === "validado" || estado === "rechazado") return estado;
  return "pendiente";
};

const getEstadoValidacionObraLabel = (estado?: string | null): string => {
  const normalized = normalizeEstadoValidacionObra(estado);
  if (normalized === "validado") return "Validado por obra";
  if (normalized === "rechazado") return "Rechazado por obra";
  return "Pendiente obra";
};

const getEstadoValidacionObraColor = (estado?: string | null): string => {
  const normalized = normalizeEstadoValidacionObra(estado);
  if (normalized === "validado") return "green";
  if (normalized === "rechazado") return "red";
  return "gold";
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

const getRegistroConfigRole = (
  rol?: string
): RolConfiguracionCamposRegistro | null => {
  if (rol === "JefeObra") return "jefeobra";
  if (rol === "Terreno") return "trabajador";
  return null;
};

const getCampoKey = (field: CampoConfiguracionRegistro): string =>
  normalizeConfigCampoKey(field.campo || field.key || field.nombreCampo || field.nombre || field.label || "");

const normalizeConfigCampoKey = (value: unknown): string => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized === "supervisor") return "jefeobra";
  if (normalized === "terreno") return "trabajador";
  if (normalized === "eje alfabetico") return "eje_alfabetico";
  if (normalized === "eje numerico") return "eje_numerico";
  if (normalized === "recinto") return "recinto";
  if (normalized === "modulo" || normalized === "modulo o edificio" || normalized === "edificio") return "modulo";
  if (normalized === "holgura" || normalized === "holgura cm") return "holgura";
  if (normalized === "factor por holguras") return "factor_por_holguras";
  if (normalized === "cielo modular" || normalized === "accesibilidad") return "accesibilidad";
  if (normalized.includes("cantidad") && normalized.includes("sellos") && normalized.includes("factores")) {
    return "cantidad_sellos_con_factores";
  }
  if (normalized === "aislacion") return "aislacion";
  if (normalized.includes("cantidad") && normalized.includes("sellos") && normalized.includes("aislacion")) {
    return "cantidad_sellos_aislacion";
  }
  if (normalized.includes("reparacion") && normalized.includes("tabique")) return "reparacion_tabique";
  if (normalized === "cantidad final") return "cantidad_final";
  if (normalized === "folio") return "folio";
  return String(value ?? "").trim();
};

const formatFecha = (fecha?: string | null): string =>
  fecha ? dayjs(fecha).format("DD-MM-YYYY") : "-";

const formatDecimal = (value?: number | string | null, decimals = 2): string => {
  if (value === null || value === undefined || value === "") return "-";
  const str = String(value).trim();
  if (str.toLowerCase() === "no aplica") return "-";
  const num = Number(str.replace(",", "."));
  if (!Number.isFinite(num)) return str;
  return num.toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

const normalizeSearchText = (value?: string | null): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Lee el primer valor no-nulo/vac\u00edo entre los aliases dados (soporta camelCase y snake_case)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getRegistroValue = (registro: Record<string, any>, aliases: string[]): unknown => {
  for (const alias of aliases) {
    const val = registro[alias];
    if (val !== null && val !== undefined && val !== "") return val;
  }
  return undefined;
};

// Aliases centralizados por campo (camelCase y snake_case)
const REGISTRO_COLUMN_ALIASES: Record<string, string[]> = {
  tipo_registro:                  ["tipoRegistro", "tipo_registro"],
  codigo_beck:                    ["codigoBeck", "codigo_beck"],
  itemizado_mandante:             ["itemizadoMandanteNombre", "itemizadoMandante"],
  itemizado_beck:                 ["itemizadoBeck", "itemizado_beck"],
  itemizado_sacyr:                ["itemizadoSacyr", "itemizado_sacyr"],
  obra:                           ["obraNombre", "obra"],
  usuario:                        ["usuarioNombre", "usuario"],
  fecha_ejecucion:                ["fechaEjecucion", "fecha_ejecucion", "fecha"],
  piso:                           ["piso"],
  eje_alfabetico:                 ["ejeAlfabetico", "eje_alfabetico"],
  eje_numerico:                   ["ejeNumerico", "eje_numerico"],
  recinto:                        ["recinto", "modulo"],
  nombre_sellador:                ["nombreSellador", "nombre_sellador"],
  holgura:                        ["holguraCm", "holgura"],
  factor_por_holguras:            ["factorPorHolguras", "factor_por_holguras", "factorHolgura"],
  cantidad_sellos:                ["cantidadSellos", "cantidad_sellos"],
  cantidad_sellos_con_factores:   ["cantidadSellosConFactores", "cantidad_sellos_con_factores", "cantidadSellosConFactor"],
  cantidad_sellos_aislacion:      ["cantidadSellosAislacion", "cantidad_sellos_aislacion"],
  cantidad_final:                 ["cantidadFinal", "cantidad_final"],
  metros_lineales:                ["metrosLineales", "metros_lineales"],
  folio:                          ["numeroSello", "folio"],
  observaciones:                  ["observaciones"],
  fotos:                          ["fotosUrls", "fotos_urls", "fotoUrl", "foto_url"],
};
void REGISTRO_COLUMN_ALIASES;

const getObraOptionLabel = (obra: Obra): string => {
  const cliente = obra.cliente?.trim();
  return cliente ? `${obra.nombre} / ${cliente}` : obra.nombre;
};

const getEjeNumerico = (r: { ejeNumerico?: number | string | null; eje_numerico?: number | string | null }): string => {
  const value = (r as { ejeNumerico?: number | string | null }).ejeNumerico ?? (r as { eje_numerico?: number | string | null }).eje_numerico ?? "";
  return value !== null && value !== undefined && String(value).trim() !== ""
    ? String(value)
    : "-";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFotoUrl = (foto: any): string | null => {
  if (!foto) return null;

  if (typeof foto === "string") {
    const clean = foto.trim();
    return clean.startsWith("http") ? clean : null;
  }

  if (typeof foto === "object") {
    const candidate =
      foto.url ||
      foto.secure_url ||
      foto.fotoUrl ||
      foto.src ||
      null;

    if (typeof candidate === "string") {
      const clean = candidate.trim();
      return clean.startsWith("http") ? clean : null;
    }
  }

  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFotosRegistro = (record: any): string[] => {
  const raw = [
    ...(Array.isArray(record.fotosUrls) ? record.fotosUrls : []),
    ...(Array.isArray(record.fotos_urls) ? record.fotos_urls : []),
    ...(Array.isArray(record.fotos_registro) ? record.fotos_registro : []),
    ...(Array.isArray(record.fotos) ? record.fotos : []),
    record.fotoUrl,
    record.foto_url,
  ];

  const result = [...new Set(raw.map(getFotoUrl).filter((x): x is string => !!x))];

  if (import.meta.env.DEV) {
    console.log("RAW FOTOS", record);
    console.log("NORMALIZADAS", result);
  }

  return result;
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  const str = String(value).trim();
  if (str === "" || str.toLowerCase() === "no aplica") return "-";
  return str;
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
    r.diaSemana ?? r.dia_semana ?? (fecha ? dayjs(fecha).locale("es").format("dddd") : "");
  const descripcionMaterial =
    r.descripcionMaterial ?? r.descripcion_material ?? "";
  const ejeNumerico = String(r.ejeNumerico ?? r.eje_numerico ?? "");
  const ejeAlfabetico = r.ejeAlfabetico ?? r.eje_alfabetico ?? "";
  const numeroSello = r.numeroSello ?? r.numero_sello ?? "";
  const cantidadSellos = Number(r.cantidadSellos ?? r.cantidad_sellos ?? 0);
  const factorPorHolguras = r.factorPorHolguras ?? r.factor_por_holguras ?? null;
  const cieloModularRaw = r.cieloModular ?? r.cielo_modular ?? r.accesibilidad ?? 1;
  const cantidadSellosConFactores =
    r.cantidadSellosConFactores ?? r.cantidad_sellos_con_factores ?? null;
  const aislacion = r.aislacion ?? null;
  const cantidadSellosAislacion =
    r.cantidadSellosAislacion ?? r.cantidad_sellos_aislacion ?? null;
  const reparacionTabique = r.reparacionTabique ?? r.reparacion_tabique ?? null;
  const cantidadFinal = r.cantidadFinal ?? r.cantidad_final ?? null;
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
  const fotosUrls = getFotosRegistro(r);
  const fotoUrl = fotosUrls[0];

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
    itemizadoMandanteId: r.itemizadoMandanteId ?? r.itemizado_mandante_id ?? r.itemizadoMandante?.id ?? undefined,
    itemizadoMandanteNombre: r.itemizadoMandanteNombre ?? r.itemizadoMandante?.nombre ?? undefined,
    codigoBeck: r.codigoBeck ?? r.codigo_beck ?? r.itemizadoMandante?.codigoBeck ?? undefined,
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
    factorHolgura: normalizeFactorHolgura(Number(factorPorHolguras ?? holguraCm)),
    cieloModular: normalizeCieloModular(Number(cieloModularRaw)),
    cantidadSellosConFactor:
      Number(cantidadSellosConFactores ?? cantidadSellos * normalizeFactorHolgura(Number(factorPorHolguras ?? holguraCm))),
    factorPorHolguras,
    cantidadSellosConFactores,
    aislacion,
    cantidadSellosAislacion,
    reparacionTabique,
    cantidadFinal,
    observaciones: r.observaciones ?? "",
    motivoRechazo: r.motivoRechazo ?? null,
    fechaRechazo: r.fechaRechazo ?? null,
    rechazadoPor: r.rechazadoPor ? { nombre: r.rechazadoPor.nombre ?? "" } : null,
    esCorreccion: r.esCorreccion ?? false,
    registroOrigenId: r.registroOrigenId ?? null,
    registroOrigen: r.registroOrigen ?? null,
    rendimientoSellosEsperadoDiario: r.obra?.rendimientoSellosEsperadoDiario ?? null,
    rendimientoReparacionEsperadoDiario: r.obra?.rendimientoReparacionEsperadoDiario ?? null,
    cantidadEjecutada: r.cantidadEjecutada ?? null,
    rendimientoIndividual: r.rendimientoIndividual ?? null,
    rendimientoIndividualPct: r.rendimientoIndividualPct ?? null,
    estadoValidacionObra: normalizeEstadoValidacionObra(r.estadoValidacionObra),
    validacionObraPorId: r.validacionObraPorId ?? null,
    validacionObraAt: r.validacionObraAt ?? null,
    motivoRechazoObra: r.motivoRechazoObra ?? null,
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
  const { canEdit, canView } = usePermisos();
  const canCreateRegistro = canEdit("beck_registro");
  const canImportarExcel = canEdit("beck_registro");
  const canEditRegistro = canEdit("beck_registro");
  const canDownloadPdf = canView("beck_registro");
  const canValidarObra = user?.rol === "Administrador" || user?.rol === "JefeObra";
  const [itemizadosMandante, setItemizadosMandante] = useState<ItemizadoMandante[]>([]);

  const [tipoSeleccionado, setTipoSeleccionado] = useState<
    "todos" | "sello_cortafuego" | "junta_lineal_espuma"
  >("todos");

  const [openDrawer, setOpenDrawer] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importResult, setImportResult] = useState<ImportarResponse | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<RegistroSello[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [camposConfigurados, setCamposConfigurados] = useState<CampoConfiguracionRegistro[]>([]);
  const [obrasLoading, setObrasLoading] = useState(false);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [savingNuevoRegistro, setSavingNuevoRegistro] = useState(false);
  const [detalleMode, setDetalleMode] = useState<"view" | "edit">("view");
  const [reenviarRevisionId, setReenviarRevisionId] = useState<string | null>(null);
  const [filtroValidacionObra, setFiltroValidacionObra] = useState<
    "pendiente" | "validado" | "rechazado" | "todos"
  >("pendiente");
  const [validandoObraId, setValidandoObraId] = useState<string | null>(null);
  const [rechazandoObraRegistro, setRechazandoObraRegistro] = useState<RegistroSello | null>(null);
  const [motivoRechazoObraInput, setMotivoRechazoObraInput] = useState("");
  const [motivoRechazoObraError, setMotivoRechazoObraError] = useState(false);
  const [savingRechazoObra, setSavingRechazoObra] = useState(false);

  // Rendimiento acumulado
  const [showRendimientoAcumuladoModal, setShowRendimientoAcumuladoModal] = useState(false);
  const [rendimientoAcumuladoLoading, setRendimientoAcumuladoLoading] = useState(false);
  const [rendimientoAcumuladoData, setRendimientoAcumuladoData] = useState<RendimientoAcumuladoItem[]>([]);
  const [rendimientoParams, setRendimientoParams] = useState<Partial<RendimientoAcumuladoParams>>({});
  const [rendimientoRangoFechas, setRendimientoRangoFechas] = useState<[Dayjs, Dayjs] | null>(null);
  const [rendimientoObraId, setRendimientoObraId] = useState<string>("");
  const [rendimientoNombreSellador, setRendimientoNombreSellador] = useState<string>("");

  const handleBuscarRendimientoAcumulado = async () => {
    if (!rendimientoRangoFechas) {
      message.warning("Selecciona un rango de fechas");
      return;
    }
    const params: RendimientoAcumuladoParams = {
      fechaInicio: rendimientoRangoFechas[0].format("YYYY-MM-DD"),
      fechaFin: rendimientoRangoFechas[1].format("YYYY-MM-DD"),
      ...(rendimientoObraId ? { obraId: rendimientoObraId } : {}),
      ...(rendimientoNombreSellador.trim() ? { nombreSellador: rendimientoNombreSellador.trim() } : {}),
    };
    setRendimientoParams(params);
    setRendimientoAcumuladoLoading(true);
    try {
      const result = await registrosAPI.getRendimientoAcumulado(params);
      setRendimientoAcumuladoData(result);
    } catch {
      message.error("No se pudo cargar el rendimiento acumulado");
    } finally {
      setRendimientoAcumuladoLoading(false);
    }
  };

  void rendimientoParams;

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
  const [obraSeleccionada, setObraSeleccionada] = useState<string>("");
  const [rangoFechas, setRangoFechas] = useState<[Dayjs, Dayjs] | null>(null);

  // vista compacta / completa
  const [vistaCompleta, setVistaCompleta] = useState(false);

  // detalle modal
  const [registroDetalle, setRegistroDetalle] = useState<RegistroSello | null>(
    null
  );

  const cargarObras = useCallback(async () => {
    setObrasLoading(true);
    try {
      const response = await obrasAPI.listar();
      setObras(response);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar las obras");
    } finally {
      setObrasLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarObras();
  }, [cargarObras]);

  useEffect(() => {
    const cargarItemizadosMandante = async () => {
      try {
        const response = await itemizadosMandanteAPI.listar();
        setItemizadosMandante(response.filter((item) => item.activo));
      } catch (error) {
        console.error(error);
      }
    };

    void cargarItemizadosMandante();
  }, []);

  const obrasDisponibles = useMemo(
    () =>
      obras
        .map((obra) => ({
          value: obra.nombre,
          label: getObraOptionLabel(obra),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [obras]
  );

  const obraSeleccionadaId = useMemo(() => {
    if (!obraSeleccionada) return undefined;
    return obras.find(
      (obra) =>
        normalizeSearchText(obra.nombre) === normalizeSearchText(obraSeleccionada)
    )?.id;
  }, [obraSeleccionada, obras]);

  useEffect(() => {
    const role = getRegistroConfigRole(user?.rol);
    if (!role) {
      setCamposConfigurados([]);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const fields = await configuracionCamposRegistroAPI.obtenerPorRol(
          role,
          obraSeleccionadaId
        );
        if (active) setCamposConfigurados(fields);
      } catch {
        if (active) setCamposConfigurados([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [obraSeleccionadaId, user?.rol]);

  const filteredData = useMemo(
    () =>
      data.filter((r) => {
        if (tipoSeleccionado !== "todos" && getTipoRegistro(r) !== tipoSeleccionado) return false;
        if (obraSeleccionada && normalizeSearchText(r.obraNombre) !== normalizeSearchText(obraSeleccionada)) return false;
        if (rangoFechas) {
          const d = dayjs(r.fechaEjecucion);
          const [start, end] = rangoFechas;
          if (d.isBefore(start, "day") || d.isAfter(end, "day")) return false;
        }
        if (
          filtroValidacionObra !== "todos" &&
          normalizeEstadoValidacionObra(r.estadoValidacionObra) !== filtroValidacionObra
        )
          return false;
        return true;
      }),
    [data, tipoSeleccionado, obraSeleccionada, rangoFechas, filtroValidacionObra]
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

  const esJuntaLineal = tipoSeleccionado === "junta_lineal_espuma";

  const handleReenviarRevision = async (record: RegistroSello) => {
    const id = String(record.id);
    setReenviarRevisionId(id);
    try {
      await api.patch(`/registros/${id}/reenviar-revision`);
      await cargarRegistros();
      setRegistroDetalle(null);
      message.success("Registro enviado nuevamente a revisión.");
    } catch (error) {
      console.error(error);
      message.error("No se pudo reenviar el registro a revisión");
    } finally {
      setReenviarRevisionId(null);
    }
  };

  const getValidacionObraErrorMessage = (error: unknown, fallback: string): string => {
    const axiosErr = error as { response?: { data?: { error?: string; message?: string } } };
    return (
      axiosErr.response?.data?.error ??
      axiosErr.response?.data?.message ??
      fallback
    );
  };

  const handleValidarObra = async (record: RegistroSello) => {
    const id = String(record.id);
    setValidandoObraId(id);
    try {
      await registrosAPI.actualizarValidacionObra(id, { estadoValidacionObra: "validado" });
      await cargarRegistros();
      message.success("Registro validado. Ahora está disponible en Procesamiento Ingeniería.");
    } catch (error) {
      console.error(error);
      message.error(getValidacionObraErrorMessage(error, "No se pudo validar el registro"));
    } finally {
      setValidandoObraId(null);
    }
  };

  const handleAbrirRechazoObra = (record: RegistroSello) => {
    setRechazandoObraRegistro(record);
    setMotivoRechazoObraInput("");
    setMotivoRechazoObraError(false);
  };

  const handleConfirmarRechazoObra = async () => {
    if (!rechazandoObraRegistro) return;
    if (!motivoRechazoObraInput.trim()) {
      setMotivoRechazoObraError(true);
      return;
    }
    const id = String(rechazandoObraRegistro.id);
    setSavingRechazoObra(true);
    try {
      await registrosAPI.actualizarValidacionObra(id, {
        estadoValidacionObra: "rechazado",
        motivoRechazoObra: motivoRechazoObraInput.trim(),
      });
      setRechazandoObraRegistro(null);
      setMotivoRechazoObraInput("");
      await cargarRegistros();
      message.success("Registro rechazado por obra");
    } catch (error) {
      console.error(error);
      message.error(getValidacionObraErrorMessage(error, "No se pudo rechazar el registro"));
    } finally {
      setSavingRechazoObra(false);
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
      factor_por_holguras: values.factorPorHolguras ?? null,
      accesibilidad: values.accesibilidad ?? values.cieloModular ?? null,
      cantidad_sellos_con_factores: values.cantidadSellosConFactores ?? null,
      aislacion: values.aislacion ?? null,
      cantidad_sellos_aislacion: values.cantidadSellosAislacion ?? null,
      reparacion_tabique: values.reparacionTabique ?? null,
      cantidad_final: values.cantidadFinal ?? null,
      metros_lineales: values.metrosLineales ?? 0,
      nombre_sellador: values.nombreSellador,
      holgura: values.holguraCm,
        observaciones: values.observaciones,
        estado: values.estado,
        itemizadoMandanteId: values.itemizadoMandanteId,
        codigoBeck: values.codigoBeck,
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
            factorPorHolguras: values.factorPorHolguras ?? null,
            cieloModular: normalizeCieloModular(values.cieloModular ?? values.accesibilidad),
            cantidadSellosConFactores: values.cantidadSellosConFactores ?? null,
            aislacion: values.aislacion ?? null,
            cantidadSellosAislacion: values.cantidadSellosAislacion ?? null,
            reparacionTabique: values.reparacionTabique ?? null,
            cantidadFinal: values.cantidadFinal ?? null,
            factorHolgura,
            cantidadSellosConFactor: values.cantidadSellosConFactores ?? values.cantidadSellos * factorHolgura,
            observaciones: values.observaciones,
            estado: values.estado,
            itemizadoMandanteId: values.itemizadoMandanteId,
            itemizadoMandanteNombre:
              itemizadosMandante.find((item) => item.id === values.itemizadoMandanteId)?.nombre ??
              registroDetalle.itemizadoMandanteNombre,
            codigoBeck: values.codigoBeck ?? registroDetalle.codigoBeck,
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

  // columnas tabla — orden exacto de la planilla de terreno Beck
  const todasLasColumnas: ColumnsType<RegistroSello> = [
    {
      title: "Obra",
      dataIndex: "obraNombre",
      key: "obraNombre",
      width: 160,
    },
    {
      title: "Tipo registro",
      dataIndex: "tipoRegistro",
      key: "tipoRegistro",
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
    // ── Planilla de terreno (orden exacto) ──────────────────────────────────
    {
      title: "Código BECK",
      dataIndex: "codigoBeck",
      key: "codigoBeck",
      width: 140,
      render: (text?: string) => displayValue(text),
    },
    {
      title: "Itemizado BECK",
      dataIndex: "itemizadoBeck",
      key: "itemizadoBeck",
      width: 220,
      render: (text: string) => (
        <div className="max-w-[220px] truncate">
          <span className="font-semibold text-orange-700">{displayValue(text)}</span>
        </div>
      ),
    },
    {
      title: "Itemizado Mandante",
      dataIndex: "itemizadoMandanteNombre",
      key: "itemizadoMandanteNombre",
      width: 220,
      render: (text?: string) => displayValue(text),
    },
    {
      title: "Fecha ejecución de sello",
      dataIndex: "fechaEjecucion",
      key: "fechaEjecucion",
      width: 155,
      render: (value: string) => (value ? dayjs(value).format("DD-MM-YYYY") : "-"),
    },
    {
      title: "Día",
      dataIndex: "dia",
      key: "dia",
      width: 90,
      render: (value?: string) => displayValue(value),
    },
    {
      title: "Piso",
      dataIndex: "piso",
      key: "piso",
      width: 90,
      render: (value?: string) => displayValue(value),
    },
    {
      title: "Eje Alfabético",
      dataIndex: "ejeAlfabetico",
      key: "eje_alfabetico",
      width: 110,
      render: (value?: string) => displayValue(value),
    },
    {
      title: "Eje Numérico",
      key: "eje_numerico",
      width: 110,
      render: (_: unknown, r: RegistroSello) => getEjeNumerico(r),
    },
    {
      title: "Nombre sellador",
      dataIndex: "nombreSellador",
      key: "nombreSellador",
      width: 150,
      render: (value?: string) => displayValue(value),
    },
    {
      title: "Foto",
      dataIndex: "fotoUrl",
      key: "foto",
      width: 160,
      render: (_value: RegistroSello["fotoUrl"], record: RegistroSello) => {
        const fotos = getFotosRegistro(record);
        const count = fotos.length;
        if (count === 0) {
          return <span className="text-slate-400">-</span>;
        }
        const thumbUrl = fotos[0];
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
              {count > 1 ? `Ver fotos (${count})` : "Ver"}
            </Button>
          </div>
        );
      },
    },
    {
      title: "Recinto",
      dataIndex: "recinto",
      key: "recinto",
      width: 160,
      render: (value?: string) => displayValue(value),
    },
    {
      title: "Módulo o edificio",
      key: "modulo_edificio",
      width: 160,
      render: (_: unknown, r: RegistroSello) => displayValue(r.recinto),
    },
    {
      title: "N° DEL SELLO",
      key: "numero_sello",
      width: 120,
      render: (_: unknown, record: RegistroSello) =>
        displayValue(
          getRegistroValue(record as unknown as Record<string, unknown>, [
            "numeroSello",
            "numero_sello",
          ]) as string
        ),
    },
    {
      title: "Cantidad de Sellos",
      key: "cantidad_sellos",
      width: 140,
      render: (_: unknown, record: RegistroSello) =>
        record.cantidadSellos != null && record.cantidadSellos !== 0 ? (
          <span className="font-medium text-orange-700">{record.cantidadSellos}</span>
        ) : "-",
    },
    {
      title: "Holgura (cm)",
      dataIndex: "holguraCm",
      key: "holgura",
      width: 100,
    },
    {
      title: "Factor por Holguras",
      key: "factor_por_holguras",
      width: 130,
      render: (_: unknown, record: RegistroSello) => {
        const value = Number(record.factorPorHolguras ?? record.factorHolgura ?? 1);
        return (
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
            F = {formatDecimal(value)}
          </Tag>
        );
      },
    },
    {
      title: "Accesibilidad",
      key: "accesibilidad",
      width: 150,
      render: (_: unknown, record: RegistroSello) => {
        const value = Number(record.accesibilidad ?? record.cieloModular ?? 1);
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
      title: "Cantidad de Sellos con Factores",
      key: "cantidad_sellos_con_factores",
      width: 200,
      render: (_: unknown, record: RegistroSello) =>
        formatDecimal(record.cantidadSellosConFactores ?? record.cantidadSellosConFactor, 2),
    },
    {
      title: "Aislación",
      key: "aislacion",
      width: 110,
      render: (_: unknown, record: RegistroSello) => formatDecimal(record.aislacion, 2),
    },
    {
      title: "Cantidad de Sellos Aislación",
      key: "cantidad_sellos_aislacion",
      width: 195,
      render: (_: unknown, record: RegistroSello) =>
        formatDecimal(record.cantidadSellosAislacion, 2),
    },
    {
      title: "Reparación de tabique",
      key: "reparacion_tabique",
      width: 160,
      render: (_: unknown, record: RegistroSello) => formatDecimal(record.reparacionTabique, 2),
    },
    {
      title: "Cantidad final",
      key: "cantidad_final",
      width: 130,
      render: (_: unknown, record: RegistroSello) => formatDecimal(record.cantidadFinal, 2),
    },
    {
      title: "Observaciones",
      dataIndex: "observaciones",
      key: "observaciones",
      width: 220,
      ellipsis: true,
      render: (value?: string) => displayValue(value),
    },
    {
      title: "FOLIO",
      key: "folio",
      width: 110,
      render: (_: unknown, record: RegistroSello) =>
        displayValue(
          getRegistroValue(record as unknown as Record<string, unknown>, [
            "numeroSello",
            "folio",
          ]) as string
        ),
    },
    // ── Columnas de gestión (fuera del orden de planilla) ───────────────────
    {
      title: "Cantidad / Metros",
      key: "cantidadMetros",
      width: 140,
      render: (_value: unknown, record: RegistroSello) => {
        if (getTipoRegistro(record) === "junta_lineal_espuma") {
          const metros = getMetrosLineales(record);
          return (
            <span className="font-medium text-sky-700">
              {metros !== null ? metros.toFixed(2) : "-"} m
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
      title: "Metros lineales",
      key: "metros_lineales",
      width: 120,
      render: (_: unknown, record: RegistroSello) => {
        const metros = getMetrosLineales(record);
        return metros !== null ? (
          <span className="font-medium text-sky-700">{metros.toFixed(2)} m</span>
        ) : "-";
      },
    },
    {
      title: "Rend. esperado diario",
      key: "rendimientoSellos",
      width: 150,
      render: (_: unknown, record: RegistroSello) => {
        const v = record.rendimientoSellosEsperadoDiario;
        return v != null ? (
          <span className="font-medium text-slate-700">{v} sellos/día</span>
        ) : (
          <span className="text-slate-400">Sin definir</span>
        );
      },
    },
    {
      title: "Rend. reparación diario",
      key: "rendimientoReparacion",
      width: 160,
      render: (_: unknown, record: RegistroSello) => {
        const v = record.rendimientoReparacionEsperadoDiario;
        return v != null ? (
          <span className="font-medium text-slate-700">{v} reparaciones/día</span>
        ) : (
          <span className="text-slate-400">Sin definir</span>
        );
      },
    },
    {
      title: "Cantidad ejecutada",
      key: "cantidadEjecutada",
      width: 140,
      render: (_: unknown, record: RegistroSello) => {
        const v = record.cantidadEjecutada;
        return v != null ? (
          <span className="font-medium text-indigo-700">{Number(v).toFixed(2)}</span>
        ) : (
          <span className="text-slate-400">Sin calcular</span>
        );
      },
    },
    {
      title: "Rendimiento individual",
      key: "rendimientoIndividual",
      width: 160,
      render: (_: unknown, record: RegistroSello) => {
        const v = record.rendimientoIndividualPct;
        return v != null ? (
          <span className="font-medium text-indigo-700">{Number(v).toFixed(2)}%</span>
        ) : (
          <span className="text-slate-400">Sin calcular</span>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 150,
      render: (value: string, record: RegistroSello) => {
        const tag = (
          <Tag
            className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${getEstadoBadgeClass(value)}`}
            color={getEstadoColor(value)}
            style={{ marginInlineEnd: 0 }}
          >
            {getEstadoLabel(value)}
          </Tag>
        );
        return (
          <div className="flex flex-col gap-1">
            {record.motivoRechazo && value === "rechazado" ? (
              <Tooltip title={`Motivo: ${record.motivoRechazo}`} placement="topLeft">
                {tag}
              </Tooltip>
            ) : (
              tag
            )}
            {record.esCorreccion && (
              <Tag
                color="orange"
                className="rounded-full px-2.5 py-0 text-[10px] font-semibold border border-orange-300 bg-orange-50 text-orange-700"
                style={{ marginInlineEnd: 0 }}
              >
                CORRECCIÓN
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Validación Obra",
      key: "validacionObra",
      width: 160,
      render: (_: unknown, record: RegistroSello) => {
        const estadoObra = record.estadoValidacionObra;
        const tag = (
          <Tag
            className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            color={getEstadoValidacionObraColor(estadoObra)}
            style={{ marginInlineEnd: 0 }}
          >
            {getEstadoValidacionObraLabel(estadoObra)}
          </Tag>
        );
        if (estadoObra === "rechazado" && record.motivoRechazoObra) {
          return (
            <Tooltip title={`Motivo: ${record.motivoRechazoObra}`} placement="topLeft">
              {tag}
            </Tooltip>
          );
        }
        return tag;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 260,
      render: (_value: unknown, record: RegistroSello) => {
        const esCorreccionEditable =
          record.esCorreccion === true && record.estado !== "en_revision";
        const canReenviar =
          canEdit("beck_registro") &&
          (record.esCorreccion === true || record.estado === "devuelto_a_tecnico") &&
          record.estado !== "en_revision";
        const estadoObra = normalizeEstadoValidacionObra(record.estadoValidacionObra);
        return (
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
            {esCorreccionEditable && canEditRegistro && (
              <Button
                size="small"
                type="primary"
                onClick={(event) => {
                  event.stopPropagation();
                  setRegistroDetalle(record);
                  setDetalleMode("edit");
                }}
              >
                Editar
              </Button>
            )}
            {canReenviar && (
              <Button
                size="small"
                loading={reenviarRevisionId === String(record.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleReenviarRevision(record);
                }}
              >
                Reenviar
              </Button>
            )}
            {canValidarObra && estadoObra === "pendiente" && (
              <Button
                size="small"
                type="primary"
                loading={validandoObraId === String(record.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleValidarObra(record);
                }}
              >
                Validar
              </Button>
            )}
            {canValidarObra && estadoObra === "pendiente" && (
              <Button
                size="small"
                danger
                onClick={(event) => {
                  event.stopPropagation();
                  handleAbrirRechazoObra(record);
                }}
              >
                Rechazar
              </Button>
            )}
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
        );
      },
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
        const fotos = getFotosRegistro(r);
        const count = fotos.length;
        if (count === 0) {
          return <span className="text-[11px] text-slate-500">Sin foto</span>;
        }
        const thumbUrl = fotos[0];
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

  void columnasJuntaLineal;

  // Todas las columnas de la planilla de terreno son obligatorias en ambas vistas
  const clavesCompactas = new Set([
    "obraNombre",
    // Planilla de terreno (orden exacto, siempre visibles)
    "tipoRegistro",
    "codigoBeck",
    "itemizadoBeck",
    "itemizadoMandanteNombre",
    "fechaEjecucion",
    "dia",
    "piso",
    "eje_alfabetico",
    "eje_numerico",
    "nombreSellador",
    "foto",
    "recinto",
    "modulo_edificio",
    "numero_sello",
    "cantidad_sellos",
    "holgura",
    "factor_por_holguras",
    "accesibilidad",
    "cantidad_sellos_con_factores",
    "aislacion",
    "cantidad_sellos_aislacion",
    "reparacion_tabique",
    "cantidad_final",
    "observaciones",
    "folio",
    // Columnas de gestión
    "cantidadMetros",
    "rendimientoSellos",
    "rendimientoReparacion",
    "cantidadEjecutada",
    "rendimientoIndividual",
    "estado",
    "validacionObra",
    "acciones",
  ]);

  const columnasTabla = useMemo(
    () => {
      // Claves ocultas según configuración del rol
      const hiddenKeys = new Set(
        camposConfigurados
          .map((field) => ({
            key: getCampoKey(field),
            visible: Boolean(field.visible),
          }))
          .filter((field) => field.key && !field.visible)
          .map((field) => field.key)
      );

      // Devuelve true si algún registro filtrado tiene valor no-vacío en alguno de los aliases
      const hasValue = (aliases: string[]): boolean =>
        filteredData.some((r) => {
          const rec = r as unknown as Record<string, unknown>;
          return aliases.some((a) => {
            const v = rec[a];
            return v !== null && v !== undefined && v !== "" &&
              !(typeof v === "number" && v === 0);
          });
        });

      const juntaLinealActive =
        tipoSeleccionado === "junta_lineal_espuma" ||
        (tipoSeleccionado === "todos" &&
          filteredData.some((r) => getTipoRegistro(r) === "junta_lineal_espuma"));

      const baseColumns = vistaCompleta
        ? todasLasColumnas
        : todasLasColumnas.filter((c) => c.key && clavesCompactas.has(String(c.key)));

      return baseColumns.filter((column) => {
        const key = column.key ? String(column.key) : "";

        // recinto y modulo_edificio comparten la misma clave de configuración
        if (key === "recinto" || key === "modulo_edificio")
          return !hiddenKeys.has("recinto") && !hiddenKeys.has("modulo");

        // En vista completa se oculta la columna combinada (se usan las independientes)
        if (key === "cantidadMetros" && vistaCompleta) return false;

        // Columnas planilla obligatorias — mostrar siempre, solo respetan hiddenKeys de rol
        if (key === "folio" || key === "numero_sello")
          return !hiddenKeys.has("folio");
        if (key === "cantidad_sellos")
          return !hiddenKeys.has("cantidad_sellos");

        // metros_lineales solo si hay juntas lineales o datos reales
        if (key === "metros_lineales") {
          if (hiddenKeys.has("metros_lineales")) return false;
          return juntaLinealActive || hasValue(["metrosLineales", "metros_lineales"]);
        }

        // Rendimientos obra — solo Administrador e Ingeniería
        if (key === "rendimientoSellos" || key === "rendimientoReparacion")
          return user?.rol === "Administrador" || user?.rol === "Ingenieria";

        // Rendimiento individual ejecutado — solo Administrador e Ingeniería
        if (key === "cantidadEjecutada" || key === "rendimientoIndividual")
          return user?.rol === "Administrador" || user?.rol === "Ingenieria";

        // itemizadoMandante: clave de columna ≠ clave de configuración (solo aplica para jefeobra)
        if (key === "itemizadoMandanteNombre") return !hiddenKeys.has("itemizado_mandante");

        // Filtro general por configuración del rol
        return !hiddenKeys.has(key);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vistaCompleta, camposConfigurados, filteredData, tipoSeleccionado, user?.rol]
  );


  const handleSubmit = async (values: NuevoRegistroValues) => {
    setSavingNuevoRegistro(true);
    try {
      const formData = new FormData();
      formData.append("obra_id", values.obraId);
      formData.append("tipo_registro", values.tipoRegistro);
      formData.append("descripcion_material", values.itemizadoBeck);
      formData.append("fecha", values.fechaEjecucion.format("YYYY-MM-DD"));
      formData.append("piso", values.piso);
      if (values.ejeAlfabetico) formData.append("eje_alfabetico", values.ejeAlfabetico);
      if (values.ejeNumerico) formData.append("eje_numerico", values.ejeNumerico);
      formData.append("nombre_sellador", values.nombreSellador);
      if (values.recinto) formData.append("modulo", values.recinto);
      if (values.numeroSello) formData.append("numero_sello", values.numeroSello);
      if (values.cantidadSellos != null) formData.append("cantidad_sellos", String(values.cantidadSellos));
      if (values.metrosLineales != null) formData.append("metros_lineales", String(values.metrosLineales));
      formData.append("holgura", String(values.holguraCm ?? 0));
      formData.append("accesibilidad", String(values.cieloModular ?? 1));
      if (values.aislacion != null) formData.append("aislacion", String(values.aislacion));
      if (values.reparacionTabique != null) formData.append("reparacion_tabique", String(values.reparacionTabique));
      if (values.observaciones) formData.append("observaciones", values.observaciones);
      if (values.fotoUrl) formData.append("foto_url", values.fotoUrl);
      if (values.itemizadoMandanteId) formData.append("itemizado_mandante_id", values.itemizadoMandanteId);
      if (values.codigoBeck) formData.append("codigo_beck", values.codigoBeck);
      if (values.itemizadoSacyr) formData.append("itemizado_sacyr", values.itemizadoSacyr);
      if (values.fotoArchivo) formData.append("foto", values.fotoArchivo);

      const res = await api.post<CreateRegistroResponse>("/registros", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.warningTipoRegistro) {
        message.warning("Registro guardado con advertencia: el tipo de registro no está configurado en la obra.");
      } else {
        message.success("Registro guardado correctamente");
      }

      await cargarRegistros();
      setOpenDrawer(false);
    } catch (error) {
      console.error(error);
      const status = (error as { response?: { status?: number; data?: { message?: string } } }).response?.status;
      const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      if (status === 400 && msg) {
        message.error(msg);
      } else {
        message.error("No se pudo guardar el registro");
      }
    } finally {
      setSavingNuevoRegistro(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (importando) return;

    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const formData = new FormData();
    formData.append("file", archivo);

    setImportando(true);
    const hide = message.loading(
      "Importando Excel, esto puede tardar si hay fotos...",
      0
    );
    try {
      const res = await api.post<ImportarResponse>(
        "/registros/importar",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 300000,
        }
      );
      hide();
      const resultado = res.data;
      setImportResult(resultado);
      setShowImportModal(true);
      await cargarRegistros();
    } catch (error) {
      hide();
      console.error(error);
      const status = (error as { response?: { status?: number } }).response?.status;
      const errMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      if (status === 400 && errMsg) {
        message.error(errMsg);
      } else if (isNetworkOrTimeoutError(error)) {
        message.warning({
          content:
            "La importación pudo haber quedado procesándose. Actualiza la vista antes de volver a importar.",
          duration: 10,
        });
      } else {
        message.error("Error al importar el archivo");
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        example: Array<string | number>,
        textColumns: string[] = []
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
          if (textColumns.includes(h)) {
            ws.getColumn(i + 1).numFmt = "@";
            const exCell = exampleRow.getCell(i + 1);
            exCell.numFmt = "@";
            exCell.value = String(example[i] ?? "");
          }
        });

        ws.views = [{ state: "frozen", ySplit: 2 }];
      };

      // ── Hoja 1: SELLOS CORTAFUEGOS ─────────────────────────────
      const sellosHeaders = [
        "Codigo BECK",
        "Itemizado BECK",
        "Itemizado Mandante",
        "Fecha ejecucion sello",
        "Día",
        "Piso",
        "Eje Alfabético",
        "Eje Numérico",
        "Nombre sellador",
        "Foto",
        "Recinto",
        "Módulo o edificio",
        "N° DEL SELLO",
        "Cantidad de Sellos",
        "Holgura (cm)",
        "Factor por Holguras",
        "Accesibilidad",
        "Cantidad de Sellos con Factores",
        "Aislación",
        "Cantidad de Sellos Aislación",
        "Reparación de tabique",
        "Cantidad final",
        "Observaciones",
        "FOLIO",
      ];
      const sellosExample: Array<string | number> = [
        "BECK-001",
        "Sello cortafuego muro",
        "Partida mandante 01",
        "29-05-2026",
        "viernes",
        1,
        "A-B",
        "1-2",
        "Juan Pérez",
        "",
        "Sala eléctrica",
        "Torre A",
        "S-001",
        2,
        "1,5",
        "1,2",
        "No aplica",
        "2,4",
        "No aplica",
        "No aplica",
        "No aplica",
        "2,4",
        "Sin observaciones",
        "F-001",
      ];
      buildTemplateSheet(
        "SELLOS CORTAFUEGOS",
        "Obra: Obra Demo",
        sellosHeaders,
        sellosExample,
        ["Codigo BECK", "Eje Alfabético", "Eje Numérico", "N° DEL SELLO", "FOLIO"]
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
        "Junta lineal espuma",
        "29-05-2026",
        "viernes",
        1,
        "A-B",
        "1-2",
        "Juan Pérez",
        "",
        "Pasillo",
        "12,5",
        "Sin observaciones",
        "J-001",
      ];
      buildTemplateSheet(
        "JUNTA LINEAL ESPUMA",
        "Obra: Obra Demo",
        juntaHeaders,
        juntaExample,
        ["Eje Alfabético", "Eje Numérico", "FOLIO"]
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
        '3. Usar la hoja SELLOS CORTAFUEGOS para registros de sellos cortafuego.',
        '4. Usar la hoja JUNTA LINEAL ESPUMA para registros de juntas lineales.',
        '5. No cambiar los nombres de las hojas ni el nombre ni el orden de los encabezados (fila 2).',
        '6. Para adjuntar fotos: Insertar → Imágenes → Colocar sobre celdas → Este dispositivo.',
        '7. La columna Foto debe quedar vacía; las imágenes se insertan embebidas sobre las celdas de esa columna.',
        '8. Se aceptan decimales con coma, por ejemplo 12,78.',
        '9. Fecha recomendada: DD-MM-YYYY o DD/MM/YYYY.',
        '10. Los valores "No aplica", "N/A" o vacío se interpretan como campo vacío.',
        '11. Eje Alfabético: ingresar el rango entre ejes, ejemplos válidos: A-B, B-C, C-D.',
        '12. Eje Numérico: ingresar el rango entre ejes, ejemplos válidos: 1-2, 2-3, 3-4.',
        '13. Cuando la plantilla esté completa, súbela usando el botón "Importar Excel" en la vista de Registro.',
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
    const baseExportData = filteredData;
    if (!baseExportData.length) return;

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

      // ── Separar por tipo ──────────────────────────────────────────────────
      const sellos = baseExportData.filter((r) => getTipoRegistro(r) === "sello_cortafuego");
      const juntas = baseExportData.filter((r) => getTipoRegistro(r) === "junta_lineal_espuma");
      const exportHiddenKeys = new Set(
        camposConfigurados
          .map((field) => ({ key: getCampoKey(field), visible: Boolean(field.visible) }))
          .filter((field) => field.key && !field.visible)
          .map((field) => field.key)
      );
      const exportFieldVisible = (key: string) => !exportHiddenKeys.has(key);

      // ── Thumbnails separados ──────────────────────────────────────────────
      const sellosThumbs = await Promise.all(
        sellos.map((r) => {
          const url = r.fotosUrls?.[0] ?? r.fotoUrl ?? null;
          return url ? fetchImageAsBase64(url) : Promise.resolve(null);
        })
      );
      const juntasThumbs = await Promise.all(
        juntas.map((r) => {
          const url = r.fotosUrls?.[0] ?? r.fotoUrl ?? null;
          return url ? fetchImageAsBase64(url) : Promise.resolve(null);
        })
      );

      type ColDef = { header: string; key: string; width: number };
      type ImgData = { base64: string; ext: "jpeg" | "png" | "gif" } | null;

      const BANNER_H = Math.max(60, logoH + 14);

      // ── Helper: banner con logo ───────────────────────────────────────────
      const addBanner = (ws: ExcelJS.Worksheet, ncols: number) => {
        ws.mergeCells(1, 1, 1, ncols);
        ws.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        ws.getRow(1).height = BANNER_H;
        if (logoBase64) {
          const logoId = workbook.addImage({ base64: logoBase64, extension: "png" });
          ws.addImage(logoId, {
            tl: { col: 0.2, row: 0.15 },
            ext: { width: LOGO_W, height: logoH },
            editAs: "oneCell",
          } as unknown as ExcelJS.ImageRange);
        }
      };

      // ── Helper: headers amarillos + freeze + autoFilter ───────────────────
      const addHeaders = (ws: ExcelJS.Worksheet, cols: ColDef[]) => {
        ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));
        ws.getRow(2).height = 10;
        const hRow = ws.getRow(3);
        hRow.height = 28;
        cols.forEach((col, i) => {
          const cell = hRow.getCell(i + 1);
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
        ws.views = [{ state: "frozen", ySplit: 3 }];
        const lastColLetter = String.fromCharCode(64 + cols.length);
        ws.autoFilter = `A3:${lastColLetter}3`;
      };

      // ── Helper: filas de datos con thumbnails ─────────────────────────────
      const fillDataRows = (
        ws: ExcelJS.Worksheet,
        cols: ColDef[],
        data: RegistroSello[],
        thumbs: ImgData[],
        getValues: (r: RegistroSello) => Record<string, string | number | null>,
        fotoKey: string,
        numericKeys: Set<string>
      ) => {
        const fotoColIdx = cols.findIndex((c) => c.key === fotoKey);
        data.forEach((r, idx) => {
          const rowNum = 4 + idx;
          const values = getValues(r);
          const dataRow = ws.getRow(rowNum);
          dataRow.height = 62;
          cols.forEach((col, i) => {
            const cell = dataRow.getCell(i + 1);
            cell.value = values[col.key] ?? null;
            cell.border = {
              top:    { style: "thin", color: { argb: "FFE5E7EB" } },
              left:   { style: "thin", color: { argb: "FFE5E7EB" } },
              bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
              right:  { style: "thin", color: { argb: "FFE5E7EB" } },
            };
            if (numericKeys.has(col.key)) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
              if (typeof cell.value === "number") {
                cell.numFmt = (col.key === "longitud" || col.key === "metros") ? "#,##0.00" : "#,##0";
              }
            } else if (col.key === fotoKey) {
              cell.alignment = { horizontal: "center", vertical: "bottom" };
              cell.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
            } else {
              cell.alignment = { vertical: "middle", wrapText: col.key === "observaciones" };
            }
          });
          const img = thumbs[idx];
          if (img && fotoColIdx >= 0) {
            const imageId = workbook.addImage({ base64: img.base64, extension: img.ext });
            ws.addImage(imageId, {
              tl:     { col: fotoColIdx, row: rowNum - 1 },
              ext:    { width: 90, height: 46 },
              editAs: "oneCell",
            } as unknown as ExcelJS.ImageRange);
          }
        });
      };

      // ══════════════════════════════════════════════════════════════════════
      // HOJA 1 · SELLOS CORTAFUEGOS
      // ══════════════════════════════════════════════════════════════════════
      const wsSellos = workbook.addWorksheet("SELLOS CORTAFUEGOS");
      const SELLOS_COLS: ColDef[] = [
        { header: "Código",          key: "codigo",         width: 14 },
        { header: "Tipo",            key: "tipo",           width: 14 },
        { header: "Obra",            key: "obra",           width: 20 },
        { header: "Fecha",           key: "fecha",          width: 13 },
        { header: "Piso",            key: "piso",           width: 10 },
        ...(exportFieldVisible("eje_alfabetico")
          ? [{ header: "Eje alfabético", key: "ejeAlfa", width: 12 }]
          : []),
        ...(exportFieldVisible("eje_numerico")
          ? [{ header: "Eje numérico", key: "ejeNum", width: 12 }]
          : []),
        { header: "Sellador",        key: "sellador",       width: 20 },
        ...(exportFieldVisible("recinto") || exportFieldVisible("modulo")
          ? [{ header: "Recinto", key: "recinto", width: 18 }]
          : []),
        { header: "Cant. sellos",    key: "sellos",         width: 14 },
        { header: "Metros lineales", key: "metros",         width: 14 },
        ...(exportFieldVisible("holgura")
          ? [{ header: "Holgura (cm)", key: "holgura", width: 13 }]
          : []),
        ...(exportFieldVisible("accesibilidad")
          ? [{ header: "Accesibilidad", key: "accesibilidad", width: 16 }]
          : []),
        ...(exportFieldVisible("factor_por_holguras")
          ? [{ header: "Factor por holguras", key: "factorPorHolguras", width: 18 }]
          : []),
        ...(exportFieldVisible("cantidad_sellos_con_factores")
          ? [{ header: "Cantidad sellos con factores", key: "cantidadSellosConFactores", width: 24 }]
          : []),
        ...(exportFieldVisible("aislacion")
          ? [{ header: "Aislación", key: "aislacion", width: 14 }]
          : []),
        ...(exportFieldVisible("cantidad_sellos_aislacion")
          ? [{ header: "Cantidad sellos aislación", key: "cantidadSellosAislacion", width: 22 }]
          : []),
        ...(exportFieldVisible("reparacion_tabique")
          ? [{ header: "Reparación tabique", key: "reparacionTabique", width: 18 }]
          : []),
        ...(exportFieldVisible("cantidad_final")
          ? [{ header: "Cantidad final", key: "cantidadFinal", width: 16 }]
          : []),
        { header: "Estado",          key: "estado",         width: 14 },
        { header: "Observaciones",   key: "observaciones",  width: 30 },
        ...(exportFieldVisible("folio")
          ? [{ header: "FOLIO", key: "folio", width: 14 }]
          : []),
        { header: "Foto",            key: "foto",           width: 18 },
      ];
      addBanner(wsSellos, SELLOS_COLS.length);
      addHeaders(wsSellos, SELLOS_COLS);
      fillDataRows(
        wsSellos,
        SELLOS_COLS,
        sellos,
        sellosThumbs,
        (r) => {
          const totalFotos = r.fotosUrls?.length ?? (r.fotoUrl ? 1 : 0);
          const extra = Math.max(0, totalFotos - 1);
          return {
            codigo:         r.codigo ?? `REG-${String(r.id).slice(0, 6)}`,
            tipo:           getTipoRegistroLabel(r.tipoRegistro),
            obra:           r.obraNombre ?? "",
            fecha:          dayjs(r.fechaEjecucion).format("DD-MM-YYYY"),
            piso:           r.piso,
            ejeAlfa:        r.ejeAlfabetico,
            ejeNum:         getEjeNumerico(r),
            sellador:       r.nombreSellador,
            recinto:        r.recinto,
            sellos:         r.cantidadSellos,
            metros:         getMetrosLineales(r) ?? null,
            holgura:        r.holguraCm,
            accesibilidad:  r.accesibilidad ?? null,
            factorPorHolguras: r.factorPorHolguras != null ? Number(r.factorPorHolguras) : null,
            cantidadSellosConFactores:
              r.cantidadSellosConFactores != null ? Number(r.cantidadSellosConFactores) : null,
            aislacion: r.aislacion != null ? Number(r.aislacion) : null,
            cantidadSellosAislacion:
              r.cantidadSellosAislacion != null ? Number(r.cantidadSellosAislacion) : null,
            reparacionTabique:
              r.reparacionTabique != null ? Number(r.reparacionTabique) : null,
            cantidadFinal: r.cantidadFinal != null ? Number(r.cantidadFinal) : null,
            estado:         getEstadoLabel(r.estado),
            observaciones:  r.observaciones ?? "",
            folio:          r.numeroSello || "-",
            foto:           totalFotos === 0 ? "Sin foto" : extra > 0 ? `+${extra} fotos` : "",
          };
        },
        "foto",
        new Set([
          "sellos",
          "metros",
          "holgura",
          "accesibilidad",
          "factorPorHolguras",
          "cantidadSellosConFactores",
          "aislacion",
          "cantidadSellosAislacion",
          "reparacionTabique",
          "cantidadFinal",
        ])
      );

      // ══════════════════════════════════════════════════════════════════════
      // HOJA 2 · JUNTA LINEAL ESPUMA
      // ══════════════════════════════════════════════════════════════════════
      const wsJuntas = workbook.addWorksheet("JUNTA LINEAL ESPUMA");
      const JUNTAS_COLS: ColDef[] = [
        { header: "Descripción",           key: "descripcion",   width: 26 },
        { header: "Fecha ejecucion sello", key: "fecha",         width: 18 },
        { header: "Día",                   key: "dia",           width: 12 },
        { header: "Piso",                  key: "piso",          width: 10 },
        ...(exportFieldVisible("eje_alfabetico")
          ? [{ header: "Eje Alfabético", key: "ejeAlfa", width: 12 }]
          : []),
        ...(exportFieldVisible("eje_numerico")
          ? [{ header: "Eje Numérico", key: "ejeNum", width: 12 }]
          : []),
        { header: "Nombre sellador",       key: "sellador",      width: 20 },
        { header: "Foto",                  key: "foto",          width: 18 },
        ...(exportFieldVisible("recinto") || exportFieldVisible("modulo")
          ? [{ header: "Recinto", key: "recinto", width: 18 }]
          : []),
        { header: "Longitud (m)",          key: "longitud",      width: 13 },
        { header: "Observaciones",         key: "observaciones", width: 30 },
        ...(exportFieldVisible("folio")
          ? [{ header: "FOLIO", key: "folio", width: 14 }]
          : []),
      ];
      addBanner(wsJuntas, JUNTAS_COLS.length);
      addHeaders(wsJuntas, JUNTAS_COLS);
      fillDataRows(
        wsJuntas,
        JUNTAS_COLS,
        juntas,
        juntasThumbs,
        (r) => {
          const totalFotos = r.fotosUrls?.length ?? (r.fotoUrl ? 1 : 0);
          return {
            descripcion:   r.descripcionMaterial || "-",
            fecha:         dayjs(r.fechaEjecucion).format("DD-MM-YYYY"),
            dia:           r.dia || "-",
            piso:          r.piso,
            ejeAlfa:       r.ejeAlfabetico,
            ejeNum:        getEjeNumerico(r),
            sellador:      r.nombreSellador,
            foto:          totalFotos === 0 ? "Sin foto" : totalFotos > 1 ? `Ver fotos (${totalFotos})` : "Ver hoja Fotos",
            recinto:       r.recinto,
            longitud:      getMetrosLineales(r) ?? null,
            observaciones: r.observaciones ?? "",
            folio:         r.numeroSello || "-",
          };
        },
        "foto",
        new Set(["longitud"])
      );

      // ══════════════════════════════════════════════════════════════════════
      // HOJA · Fotos (ambos tipos)
      // ══════════════════════════════════════════════════════════════════════
      const fotosWs = workbook.addWorksheet("Fotos");
      fotosWs.columns = [
        { key: "col_a", width: 46 },
        { key: "col_b", width: 20 },
        { key: "col_c", width: 20 },
        { key: "col_d", width: 18 },
      ];

      const allImgsData = await Promise.all(
        baseExportData.map((r) => {
          const urls: string[] = r.fotosUrls?.length
            ? r.fotosUrls
            : r.fotoUrl
            ? [r.fotoUrl]
            : [];
          return Promise.all(urls.slice(0, 6).map((u) => fetchImageAsBase64(u)));
        })
      );

      const FOTO_IMG_W     = 320;
      const FOTO_IMG_H     = 220;
      const FOTO_IMG_ROW_H = 168;
      const FOTO_HDR_H     = 36;
      const FOTO_SUB_H     = 22;
      const FOTO_SPACER_H  = 10;

      fotosWs.mergeCells(1, 1, 1, 4);
      fotosWs.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      fotosWs.getRow(1).height = BANNER_H;
      if (logoBase64) {
        const fotosLogoId = workbook.addImage({ base64: logoBase64, extension: "png" });
        fotosWs.addImage(fotosLogoId, {
          tl: { col: 0.2, row: 0.15 },
          ext: { width: LOGO_W, height: logoH },
          editAs: "oneCell",
        } as unknown as ExcelJS.ImageRange);
      }
      let fotoRow = 2;

      for (let i = 0; i < baseExportData.length; i++) {
        const r    = baseExportData[i];
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

      // ══════════════════════════════════════════════════════════════════════
      // HOJA · Resumen
      // ══════════════════════════════════════════════════════════════════════
      const summaryWs = workbook.addWorksheet("Resumen");
      summaryWs.columns = [
        { key: "metrica", width: 36 },
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
        { metrica: "Total registros",                 valor: baseExportData.length },
        { metrica: "Sellos cortafuego (registros)",   valor: sellos.length },
        { metrica: "Junta lineal espuma (registros)", valor: juntas.length },
        { metrica: "Total sellos (cantidad)",         valor: sellos.reduce((a, r) => a + r.cantidadSellos, 0) },
        { metrica: "Total metros lineales",           valor: Number(juntas.reduce((a, r) => a + (getMetrosLineales(r) ?? 0), 0).toFixed(2)) },
        { metrica: "Validados",                       valor: baseExportData.filter((r) => r.estado === "validado").length },
        { metrica: "Pendientes",                      valor: baseExportData.filter((r) => r.estado === "pendiente").length },
        { metrica: "En revisión",                     valor: baseExportData.filter((r) => r.estado === "en_revision").length },
        { metrica: "Rechazados",                      valor: baseExportData.filter((r) => r.estado === "rechazado").length },
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
              : "Registro de sellos · Itemizado BECK"}
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-xl">
            {esJuntaLineal
              ? "Control diario de juntas lineales con fotos, longitud en metros y salida directa a Excel para informes de avance."
              : "Control diario de sellos con fotos, factores de holgura y salida directa a Excel para informes de avance y cubicaciones de protección pasiva contra incendios."}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {canCreateRegistro && (
            <Button
              type="primary"
              icon={<FireOutlined />}
              className="bg-orange-500 hover:bg-orange-600 border-none text-xs"
              onClick={() => setOpenDrawer(true)}
            >
              Nuevo registro
            </Button>
          )}
          {canImportarExcel && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importando}
                onChange={(e) => void handleFileChange(e)}
              />
              <Button
                icon={<FileExcelOutlined />}
                className="text-xs"
                loading={descargandoPlantilla}
                disabled={importando}
                onClick={() => void handleDescargarPlantilla()}
              >
                Descargar plantilla Excel
              </Button>
              <Button
                icon={<UploadOutlined />}
                className="text-xs"
                loading={importando}
                disabled={importando}
                onClick={() => {
                  if (!importando) fileInputRef.current?.click();
                }}
              >
                {importando ? "Importando..." : "Importar Excel"}
              </Button>
            </>
          )}
          {(user?.rol === "Administrador" || user?.rol === "Ingenieria") && (
            <Button
              icon={<BarChartOutlined />}
              className="text-xs"
              onClick={() => setShowRendimientoAcumuladoModal(true)}
            >
              Rendimiento acumulado
            </Button>
          )}
          <Button
            icon={<DownloadOutlined />}
            className="text-xs"
            loading={exportando}
            onClick={() => void handleExportExcel()}
          >
            Exportar vista a Excel
          </Button>
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div />
            <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              size="small"
              onClick={() => {
                setObraSeleccionada("");
                setRangoFechas(null);
                setTipoSeleccionado("todos");
              }}
            >
              Limpiar filtros
            </Button>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] text-slate-500">Vista compacta / completa</span>
              <Switch
                size="small"
                checked={vistaCompleta}
                onChange={setVistaCompleta}
              />
            </div>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 text-xs xl:flex-nowrap">
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1">
            <FilterOutlined className="text-amber-600 text-[11px]" />
            <span className="text-slate-800">Filtros rápidos</span>
          </div>

          <Select
            size="small"
            className="w-[160px] min-w-[150px] shrink-0"
            allowClear
            placeholder="Todos los tipos"
            value={tipoSeleccionado === "todos" ? undefined : tipoSeleccionado}
            onChange={(value) => setTipoSeleccionado(value ?? "todos")}
            options={[
              { value: "sello_cortafuego", label: "Sellos Cortafuego" },
              { value: "junta_lineal_espuma", label: "Junta Lineal Espuma" },
            ]}
          />

          <Select
            showSearch
            allowClear
            size="small"
            className="beck-obra-filter-select beck-obra-filter-select--compact !w-[300px] min-w-[300px] shrink-0"
            placeholder="Empresa / Obra"
            value={obraSeleccionada || undefined}
            onChange={(value) => setObraSeleccionada(String(value ?? ""))}
            options={obrasDisponibles}
            optionFilterProp="label"
            notFoundContent={obrasLoading ? "Cargando obras..." : "Sin obras"}
            filterOption={(input, opt) =>
              normalizeSearchText(opt?.label?.toString()).includes(
                normalizeSearchText(input)
              )
            }
          />

          <Segmented
            size="small"
            className="shrink-0"
            value={(() => {
              if (!rangoFechas) return "todo";
              const [s, e] = rangoFechas;
              const hoy = dayjs();
              if (s.isSame(hoy, "day") && e.isSame(hoy, "day")) return "hoy";
              if (s.isSame(hoy.startOf("week"), "day") && e.isSame(hoy.endOf("week"), "day")) return "semana";
              if (s.isSame(hoy.startOf("month"), "day") && e.isSame(hoy.endOf("month"), "day")) return "mes";
              return "todo";
            })()}
            onChange={(val) => {
              const hoy = dayjs();
              if (val === "todo") { setRangoFechas(null); return; }
              if (val === "hoy") { setRangoFechas([hoy.startOf("day"), hoy.endOf("day")]); return; }
              if (val === "semana") { setRangoFechas([hoy.startOf("week"), hoy.endOf("week")]); return; }
              if (val === "mes") { setRangoFechas([hoy.startOf("month"), hoy.endOf("month")]); }
            }}
            options={[
              { label: "Toda la obra", value: "todo" },
              { label: "Hoy", value: "hoy" },
              { label: "Semana", value: "semana" },
              { label: "Mes", value: "mes" },
            ]}
          />

          <DatePicker.RangePicker
            size="small"
            format="DD-MM-YYYY"
            value={rangoFechas as [Dayjs, Dayjs] | null}
            onChange={(dates) => {
              if (!dates || !dates[0] || !dates[1]) { setRangoFechas(null); return; }
              setRangoFechas([dates[0], dates[1]]);
            }}
            placeholder={["Desde", "Hasta"]}
            allowClear
            className="w-[205px] shrink-0"
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
              {tipoSeleccionado === "junta_lineal_espuma"
                ? "Junta Lineal Espuma"
                : tipoSeleccionado === "sello_cortafuego"
                ? "Sellos Cortafuego · Itemizado BECK"
                : "Todos los registros"}
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
        <div className="border-b border-slate-100 px-4 py-2.5">
          <Segmented
            size="small"
            options={[
              { label: "Pendientes obra", value: "pendiente" },
              { label: "Validados obra", value: "validado" },
              { label: "Rechazados obra", value: "rechazado" },
              { label: "Todos", value: "todos" },
            ]}
            value={filtroValidacionObra}
            onChange={(v) =>
              setFiltroValidacionObra(v as "pendiente" | "validado" | "rechazado" | "todos")
            }
          />
        </div>
        <Table
          columns={columnasTabla}
          dataSource={filteredData}
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          tableLayout="auto"
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
            <div className="flex flex-wrap gap-4">
              <p className="font-semibold text-slate-800">
                Total insertados:{" "}
                <span className="text-emerald-600">
                  {importResult.creados ?? importResult.totalInsertados ?? 0}
                </span>
              </p>
              {importResult.duplicadosOmitidos != null &&
                importResult.duplicadosOmitidos > 0 && (
                  <p className="font-semibold text-slate-800">
                    Duplicados omitidos:{" "}
                    <span className="text-amber-600">
                      {importResult.duplicadosOmitidos}
                    </span>
                  </p>
                )}
            </div>

            {importResult.advertencias && importResult.advertencias.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  Advertencias ({importResult.advertencias.length}):
                </p>
                <ul className="space-y-1">
                  {importResult.advertencias.map((adv, i) => (
                    <li key={i} className="text-xs text-amber-700">
                      {adv}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

      {/* Modal rendimiento acumulado */}
      <Modal
        title="Rendimiento acumulado por sellador"
        open={showRendimientoAcumuladoModal}
        onCancel={() => {
          setShowRendimientoAcumuladoModal(false);
          setRendimientoAcumuladoData([]);
          setRendimientoRangoFechas(null);
          setRendimientoObraId("");
          setRendimientoNombreSellador("");
        }}
        footer={null}
        width="min(860px, 95vw)"
        centered
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap gap-3">
            <DatePicker.RangePicker
              format="DD-MM-YYYY"
              value={rendimientoRangoFechas}
              onChange={(dates) => {
                if (!dates || !dates[0] || !dates[1]) { setRendimientoRangoFechas(null); return; }
                setRendimientoRangoFechas([dates[0], dates[1]]);
              }}
              placeholder={["Fecha inicio *", "Fecha fin *"]}
              allowClear
              className="w-[240px]"
            />
            <Select
              showSearch
              allowClear
              placeholder="Obra (opcional)"
              className="w-[220px]"
              value={rendimientoObraId || undefined}
              onChange={(val) => setRendimientoObraId(String(val ?? ""))}
              filterOption={(input, option) =>
                normalizeSearchText(option?.label?.toString()).includes(normalizeSearchText(input))
              }
              options={obras.map((o) => ({ value: o.id, label: getObraOptionLabel(o) }))}
            />
            <input
              type="text"
              placeholder="Sellador (opcional)"
              value={rendimientoNombreSellador}
              onChange={(e) => setRendimientoNombreSellador(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 w-[180px]"
            />
            <Button
              type="primary"
              loading={rendimientoAcumuladoLoading}
              onClick={() => void handleBuscarRendimientoAcumulado()}
            >
              Buscar
            </Button>
          </div>

          {rendimientoAcumuladoLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Cargando...</div>
          ) : rendimientoAcumuladoData.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {rendimientoRangoFechas ? "Sin datos para los filtros seleccionados." : "Selecciona un rango de fechas y presiona Buscar."}
            </div>
          ) : (
            <Table
              size="small"
              rowKey="nombreSellador"
              dataSource={rendimientoAcumuladoData}
              pagination={false}
              scroll={{ x: "max-content" }}
              columns={[
                { title: "Sellador", dataIndex: "nombreSellador", key: "nombreSellador", width: 200 },
                { title: "Total registros", dataIndex: "totalRegistros", key: "totalRegistros", width: 130, align: "right" as const },
                {
                  title: "Cantidad ejecutada",
                  dataIndex: "cantidadEjecutadaTotal",
                  key: "cantidadEjecutadaTotal",
                  width: 160,
                  align: "right" as const,
                  render: (v: number) => Number(v).toFixed(2),
                },
                {
                  title: "Rendimiento acumulado %",
                  dataIndex: "rendimientoAcumuladoPct",
                  key: "rendimientoAcumuladoPct",
                  width: 190,
                  align: "right" as const,
                  render: (v: number) => (
                    <span className="font-semibold text-indigo-700">{Number(v).toFixed(2)}%</span>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Modal>

      {/* Modal detalle */}
      <RegistroDetalleModal
        registro={registroDetalle}
        open={!!registroDetalle}
        mode={detalleMode}
        canEdit={registroDetalle?.esCorreccion === true && registroDetalle?.estado !== "en_revision" && canEditRegistro}
        saving={savingDetalle}
        onClose={() => setRegistroDetalle(null)}
        onEdit={() => setDetalleMode("edit")}
        onSave={handleGuardarDetalle}
        onDownloadPdf={canDownloadPdf ? handleDescargarPdf : undefined}
        onReenviarRevision={handleReenviarRevision}
        reenviarRevisionLoading={!!reenviarRevisionId}
        showEnRevisionAlert
        itemizadosMandante={itemizadosMandante}
        camposConfigurados={camposConfigurados}
        showRendimientoSellos={user?.rol === "Administrador" || user?.rol === "Ingenieria"}
        showRendimientoIndividual={user?.rol === "Administrador" || user?.rol === "Ingenieria"}
        rendimientoSellosEsperadoDiario={registroDetalle?.rendimientoSellosEsperadoDiario}
        rendimientoReparacionEsperadoDiario={registroDetalle?.rendimientoReparacionEsperadoDiario}
      />

      {/* Modal rechazo validación de obra */}
      <Modal
        title="Rechazar registro (validación de obra)"
        open={!!rechazandoObraRegistro}
        onCancel={() => setRechazandoObraRegistro(null)}
        footer={[
          <Button key="cancel" onClick={() => setRechazandoObraRegistro(null)}>
            Cancelar
          </Button>,
          <Button
            key="confirm"
            danger
            type="primary"
            loading={savingRechazoObra}
            onClick={() => void handleConfirmarRechazoObra()}
          >
            Rechazar
          </Button>,
        ]}
      >
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-700">Indique el motivo del rechazo.</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Motivo de rechazo <span className="text-red-500">*</span>
            </label>
            <Input.TextArea
              rows={4}
              value={motivoRechazoObraInput}
              onChange={(e) => {
                setMotivoRechazoObraInput(e.target.value);
                if (e.target.value.trim()) setMotivoRechazoObraError(false);
              }}
              placeholder="Describe el motivo del rechazo..."
              status={motivoRechazoObraError ? "error" : undefined}
            />
            {motivoRechazoObraError && (
              <p className="mt-1 text-xs text-red-500">
                El motivo de rechazo es obligatorio.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Drawer nuevo registro (desde la derecha) */}
      {canCreateRegistro && (
        <NuevoRegistroDrawer
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          onSubmit={handleSubmit}
          itemizadosMandante={itemizadosMandante}
          camposConfigurados={camposConfigurados}
          obrasApi={obras}
          submitting={savingNuevoRegistro}
        />
      )}
    </div>
  );
};

export default RegistroSellos;
