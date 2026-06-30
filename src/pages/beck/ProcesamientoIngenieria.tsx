import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Modal, Segmented, Select, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import type { ThemeMode } from "../../hooks/useSystemTheme";
import RegistroDetalleModal, {
  type RegistroDetalleUpdateValues,
} from "../../components/RegistroDetalleModal";
import type { RegistroSello } from "../../types/registroSello";
import { api, obrasAPI, registrosAPI, inspeccionAPI, type Obra } from "../../services/api";
import { usePermisos } from "../../hooks/usePermisos";
import { useAuth } from "../../context/useAuth";
import ControlInspeccionModal from "../../components/ControlInspeccionModal";

type IngenieriaProps = {
  themeMode: ThemeMode;
};

type RegistroEstado = "pendiente" | "en_revision" | "validado" | "rechazado";

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
  itemizadoBeck?: string | null;
  itemizado_beck?: string | null;
  itemizadoSacyr?: string | null;
  itemizado_sacyr?: string | null;
  itemizadoMandanteId?: string | null;
  itemizado_mandante_id?: string | null;
  itemizadoMandanteNombre?: string | null;
  itemizadoMandante?: { id?: string | null; nombre?: string | null; codigoBeck?: string | null } | null;
  codigoBeck?: string | null;
  codigo_beck?: string | null;
  nombreSellador?: string | null;
  nombre_sellador?: string | null;
  obraNombre?: string | null;
  nombreObra?: string | null;
  empresa?: string | null;
  nombreEmpresa?: string | null;
  nombre_empresa?: string | null;
  holgura?: number | string | null;
  accesibilidad?: number | string | null;
  estado?: string | null;
  observaciones?: string | null;
  fotoUrl?: string | null;
  foto_url?: string | null;
  fotosUrls?: string[] | null;
  fotos_urls?: string[] | null;
  fotos?: Array<{ url?: string | null }> | null;
  fotos_registro?: Array<{ url?: string | null }> | null;
  obra?: { nombre?: string | null; rendimientoSellosEsperadoDiario?: number | null; rendimientoReparacionEsperadoDiario?: number | null } | null;
  rendimiento_sellos_esperado_diario?: number | null;
  rendimiento_reparacion_esperado_diario?: number | null;
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
  seleccionadoParaInspeccion?: boolean | null;
  seleccionado_para_inspeccion?: boolean | null;
  fechaSeleccionInspeccion?: string | null;
  fecha_seleccion_inspeccion?: string | null;
  seleccionadoInspeccionPorId?: string | null;
  seleccionado_inspeccion_por_id?: string | null;
  seleccionadoInspeccionPor?: { id?: string; nombre?: string | null } | null;
  seleccionado_inspeccion_por_nombre?: string | null;
  controlesInspeccion?: Array<{ id?: string; conformidad?: string | null; fecha?: string | null; createdAt?: string | null }> | null;
};

type RegistroIngenieria = RegistroSello & {
  nombreObra?: string;
  empresa?: string;
  nombreEmpresa?: string;
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

const normalizeFactorHolgura = (value: number): 1 | 1.2 | 1.4 | 1.8 => {
  if (value === 1.2 || value === 1.4 || value === 1.8) return value;
  return 1;
};

const normalizeCieloModular = (value: number): 1 | 2 | 3 => {
  if (value === 2 || value === 3) return value;
  return 1;
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  const str = String(value).trim();
  if (str === "" || str.toLowerCase() === "no aplica") return "-";
  return str;
};

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

const getMetrosLineales = (registro: { metrosLineales?: number | string | null }): number | null => {
  const value = registro.metrosLineales ?? null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
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
  if (tipo === "junta_lineal_espuma") return "border border-blue-200 bg-blue-50 text-blue-700";
  return "border border-amber-200 bg-amber-50 text-amber-700";
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

const getEjeNumerico = (r: RegistroSello): string => {
  const value = r.ejeNumerico;
  return value !== null && value !== undefined && String(value).trim() !== ""
    ? String(value)
    : "-";
};

const normalizeSearchText = (value?: string | null): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getRegistroObraNombre = (r: RegistroApiRecord): string =>
  r.obraNombre ??
  r.nombreObra ??
  r.obra?.nombre ??
  r.obra_nombre ??
  "Sin obra";

const getRegistroObraEmpresaSearchText = (r: RegistroIngenieria): string =>
  normalizeSearchText(
    [
      r.obraNombre,
      r.nombreObra,
      r.empresa,
      r.nombreEmpresa,
    ]
      .filter(Boolean)
      .join(" ")
  );

const getObraOptionLabel = (obra: Obra): string => {
  const cliente = obra.cliente?.trim();
  return cliente ? `${obra.nombre} / ${cliente}` : obra.nombre;
};

const normalizeRegistro = (r: RegistroApiRecord): RegistroIngenieria => {
  const obraId = r.obraId ?? r.obra_id ?? "";
  const usuarioId = r.usuarioId ?? r.usuario_id ?? "";
  const fecha = r.fecha ?? "";
  const diaSemana =
    r.diaSemana ?? r.dia_semana ?? (fecha ? dayjs(fecha).locale("es").format("dddd") : "");
  const descripcionMaterial = r.descripcionMaterial ?? r.descripcion_material ?? "";
  const ejeNumerico = String(r.ejeNumerico ?? r.eje_numerico ?? "");
  const ejeAlfabetico = r.ejeAlfabetico ?? r.eje_alfabetico ?? "";
  const numeroSello = r.numeroSello ?? r.numero_sello ?? "";
  const cantidadSellos = Number(r.cantidadSellos ?? r.cantidad_sellos ?? 0);
  const factorPorHolguras = r.factorPorHolguras ?? r.factor_por_holguras ?? null;
  const cieloModularRaw = r.cieloModular ?? r.cielo_modular ?? r.accesibilidad ?? 1;
  const cantidadSellosConFactores = r.cantidadSellosConFactores ?? r.cantidad_sellos_con_factores ?? null;
  const aislacion = r.aislacion ?? null;
  const cantidadSellosAislacion = r.cantidadSellosAislacion ?? r.cantidad_sellos_aislacion ?? null;
  const reparacionTabique = r.reparacionTabique ?? r.reparacion_tabique ?? null;
  const cantidadFinal = r.cantidadFinal ?? r.cantidad_final ?? null;
  const metrosLinealesRaw = r.metrosLineales ?? r.metros_lineales ?? r.longitud ?? r.longitud_m ?? 0;
  const metrosLineales = Number(metrosLinealesRaw);
  const tipoRegistro = r.tipoRegistro ?? r.tipo_registro ?? "sello_cortafuego";
  const nombreSellador = r.nombreSellador ?? r.nombre_sellador ?? "";
  const holguraCm = Number(r.holgura ?? 0);
  const accesibilidad = Number(r.accesibilidad ?? 0);
  const obraNombre = getRegistroObraNombre(r);
  const nombreObra = r.nombreObra ?? r.obra?.nombre ?? r.obra_nombre ?? "";
  const empresa = r.empresa ?? "";
  const nombreEmpresa = r.nombreEmpresa ?? r.nombre_empresa ?? "";
  const usuarioNombre = r.usuario?.nombre ?? r.usuario_nombre ?? "Sin usuario";
  const factorHolgura = normalizeFactorHolgura(Number(factorPorHolguras ?? holguraCm));
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
    nombreObra,
    empresa,
    nombreEmpresa,
    usuarioNombre,
    codigoBeck: r.codigoBeck ?? r.codigo_beck ?? r.itemizadoMandante?.codigoBeck ?? undefined,
    itemizadoBeck:
      r.itemizadoBeck ?? r.itemizado_beck ?? (descripcionMaterial || `REG-${r.id.slice(0, 6)}`),
    itemizadoMandanteId: r.itemizadoMandanteId ?? r.itemizado_mandante_id ?? r.itemizadoMandante?.id ?? undefined,
    itemizadoMandanteNombre: r.itemizadoMandanteNombre ?? r.itemizadoMandante?.nombre ?? undefined,
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
    factorHolgura,
    factorPorHolguras,
    cieloModular: normalizeCieloModular(Number(cieloModularRaw)),
    cantidadSellosConFactor: Number(cantidadSellosConFactores ?? cantidadSellos * factorHolgura),
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
    rendimientoSellosEsperadoDiario:
      r.obra?.rendimientoSellosEsperadoDiario ??
      r.rendimiento_sellos_esperado_diario ??
      null,
    rendimientoReparacionEsperadoDiario:
      r.obra?.rendimientoReparacionEsperadoDiario ??
      r.rendimiento_reparacion_esperado_diario ??
      null,
    cantidadEjecutada: r.cantidadEjecutada ?? null,
    rendimientoIndividual: r.rendimientoIndividual ?? null,
    rendimientoIndividualPct: r.rendimientoIndividualPct ?? null,
    seleccionadoParaInspeccion: Boolean(r.seleccionadoParaInspeccion ?? r.seleccionado_para_inspeccion),
    fechaSeleccionInspeccion: r.fechaSeleccionInspeccion ?? r.fecha_seleccion_inspeccion ?? null,
    seleccionadoInspeccionPorId: r.seleccionadoInspeccionPorId ?? r.seleccionado_inspeccion_por_id ?? null,
    seleccionadoInspeccionPor: r.seleccionadoInspeccionPor ?? (r.seleccionado_inspeccion_por_nombre ? { nombre: r.seleccionado_inspeccion_por_nombre } : null),
    controlesInspeccion: r.controlesInspeccion ?? [],
  };
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const KpiCard: React.FC<{
  label: string;
  value: number;
  className: string;
  valueClassName: string;
}> = ({ label, value, className, valueClassName }) => (
  <Card
    className={`border shadow-sm ${className}`}
    styles={{ body: { padding: "12px 14px" } }}
  >
    <div className="flex min-h-[54px] flex-col justify-center">
      <div className={`text-2xl font-bold leading-none ${valueClassName}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-700">{label}</div>
    </div>
  </Card>
);

const Ingenieria: React.FC<IngenieriaProps> = ({ themeMode }) => {
  void themeMode;
  const { user } = useAuth();
  const { canEdit } = usePermisos();
  const canEditIngenieria = canEdit("beck_procesamiento_ingenieria");

  const [registros, setRegistros] = useState<RegistroIngenieria[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(false);
  const [obrasLoading, setObrasLoading] = useState(false);
  const [changingEstadoId, setChangingEstadoId] = useState<string | null>(null);
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState<RegistroSello | null>(null);
  const [detalleMode, setDetalleMode] = useState<"view" | "edit">("view");
  const [obraSeleccionada, setObraSeleccionada] = useState<string>("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<"todos" | "sello_cortafuego" | "junta_lineal_espuma">("todos");
  const [filtroEstado, setFiltroEstado] = useState<"activos" | "validado" | "rechazado" | "todos">("activos");
  const [rangoFechas, setRangoFechas] = useState<[Dayjs, Dayjs] | null>(null);
  const [rechazandoRegistro, setRechazandoRegistro] = useState<RegistroSello | null>(null);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState("");
  const [motivoRechazoError, setMotivoRechazoError] = useState(false);
  const [savingRechazo, setSavingRechazo] = useState(false);
  const [resumenKpis, setResumenKpis] = useState<{ pendientes: number; enRevision: number; validados: number; rechazados: number; total: number } | null>(null);
  const [marcandoInspeccionId, setMarcandoInspeccionId] = useState<string | null>(null);
  const [controlInspeccionRegistroId, setControlInspeccionRegistroId] = useState<string | null>(null);

  const cargarRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<RegistrosApiResponse | RegistroApiRecord[]>(
        "/registros/pendientes"
      );
      const lista = Array.isArray(response.data)
        ? response.data
        : response.data?.data ?? [];
      setRegistros(lista.map(normalizeRegistro));
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los registros");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarRegistros();
  }, [cargarRegistros]);

  const cargarObras = useCallback(async () => {
    setObrasLoading(true);
    try {
      const data = await obrasAPI.listar();
      setObras(data);
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

  const cargarResumen = useCallback(async () => {
    try {
      const data = await registrosAPI.resumen();
      setResumenKpis(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void cargarResumen();
  }, [cargarResumen]);

  const obraOptions = useMemo(
    () =>
      obras
        .map((obra) => ({
          value: obra.nombre,
          label: getObraOptionLabel(obra),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [obras]
  );

  const filteredRegistros = useMemo(() => {
    const obraEmpresaQuery = normalizeSearchText(obraSeleccionada);

    return registros.filter((r) => {
      const est = normalizeEstado(r.estado);
      if (filtroEstado === "activos") {
        if (est !== "pendiente" && est !== "en_revision") return false;
      } else if (filtroEstado === "validado") {
        if (est !== "validado") return false;
      } else if (filtroEstado === "rechazado") {
        if (est !== "rechazado") return false;
      }
      if (tipoSeleccionado !== "todos" && (r.tipoRegistro ?? "sello_cortafuego") !== tipoSeleccionado) return false;
      if (obraEmpresaQuery && !getRegistroObraEmpresaSearchText(r).includes(obraEmpresaQuery)) return false;
      if (rangoFechas) {
        const d = dayjs(r.fechaEjecucion);
        const [start, end] = rangoFechas;
        if (d.isBefore(start, "day") || d.isAfter(end, "day")) return false;
      }
      return true;
    }).sort((a, b) => {
      const da = a.fechaEjecucion ? new Date(a.fechaEjecucion).getTime() : 0;
      const db = b.fechaEjecucion ? new Date(b.fechaEjecucion).getTime() : 0;
      return db - da;
    });
  }, [registros, obraSeleccionada, tipoSeleccionado, rangoFechas, filtroEstado]);

  const limpiarFiltros = () => {
    setObraSeleccionada("");
    setTipoSeleccionado("todos");
    setRangoFechas(null);
  };

  const resumen = useMemo(() => ({
    pendientes: resumenKpis?.pendientes ?? 0,
    enRevision: resumenKpis?.enRevision ?? 0,
    validadosHoy: resumenKpis?.validados ?? 0,
    rechazados: resumenKpis?.rechazados ?? 0,
    total: resumenKpis?.total ?? 0,
  }), [resumenKpis]);

  const handleCambiarEstado = async (
    record: RegistroSello,
    estado: RegistroEstado
  ) => {
    const id = String(record.id);
    setChangingEstadoId(id);
    try {
      await api.patch(`/registros/${id}/estado`, { estado });
      setRegistros((prev) =>
        prev.map((r) => String(r.id) === id ? { ...r, estado } : r)
      );
      await Promise.all([cargarRegistros(), cargarResumen()]);
      message.success(`Registro ${getEstadoLabel(estado).toLowerCase()}`);
    } catch (error) {
      console.error(error);
      message.error("No se pudo actualizar el estado del registro");
    } finally {
      setChangingEstadoId(null);
    }
  };

  const handleIniciarRevision = async (record: RegistroSello) => {
    const id = String(record.id);
    setChangingEstadoId(id);
    try {
      await api.patch(`/registros/${id}/iniciar-revision`);
      await Promise.all([cargarRegistros(), cargarResumen()]);
      message.success("Revisión iniciada");
    } catch (error) {
      const axiosErr = error as { response?: { data?: { error?: string; message?: string } } };
      const msg =
        axiosErr.response?.data?.error ??
        axiosErr.response?.data?.message ??
        "No se pudo iniciar la revisión";
      message.error(msg);
    } finally {
      setChangingEstadoId(null);
    }
  };

  const handleAbrirRechazo = (record: RegistroSello) => {
    setRechazandoRegistro(record);
    setMotivoRechazoInput("");
    setMotivoRechazoError(false);
  };

  const handleConfirmarRechazo = async () => {
    if (!rechazandoRegistro) return;
    if (!motivoRechazoInput.trim()) {
      setMotivoRechazoError(true);
      return;
    }
    const id = String(rechazandoRegistro.id);
    setSavingRechazo(true);
    try {
      await api.patch(`/registros/${id}/estado`, {
        estado: "rechazado",
        motivoRechazo: motivoRechazoInput.trim(),
      });
      setRechazandoRegistro(null);
      setMotivoRechazoInput("");
      await Promise.all([cargarRegistros(), cargarResumen()]);
      message.success("Registro rechazado. Se creó una copia para corrección.");
    } catch (error) {
      console.error(error);
      message.error("No se pudo rechazar el registro");
    } finally {
      setSavingRechazo(false);
    }
  };

  const handleEnviarInspeccion = (record: RegistroSello) => {
    Modal.confirm({
      title: "¿Enviar registro a inspección?",
      content: "El registro quedará marcado como seleccionado para control de inspección.",
      okText: "Enviar",
      cancelText: "Cancelar",
      onOk: async () => {
        const id = String(record.id);
        setMarcandoInspeccionId(id);
        try {
          await inspeccionAPI.marcarInspeccion(id, true);
          await cargarRegistros();
          message.success("Registro enviado a inspección");
        } catch (err) {
          const e = err as { response?: { data?: { error?: string; message?: string } } };
          const msg =
            e?.response?.data?.error ??
            e?.response?.data?.message ??
            "No se pudo enviar a inspección";
          message.error(msg);
        } finally {
          setMarcandoInspeccionId(null);
        }
      },
    });
  };

  const handleQuitarInspeccion = (record: RegistroSello) => {
    Modal.confirm({
      title: "¿Quitar de inspección?",
      content: "El registro dejará de estar seleccionado para control de inspección.",
      okText: "Quitar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        const id = String(record.id);
        setMarcandoInspeccionId(id);
        try {
          await inspeccionAPI.marcarInspeccion(id, false);
          await cargarRegistros();
          message.success("Registro quitado de inspección");
        } catch (err) {
          const e = err as { response?: { data?: { error?: string; message?: string } } };
          const msg =
            e?.response?.data?.error ??
            e?.response?.data?.message ??
            "No se pudo quitar de inspección";
          message.error(msg);
        } finally {
          setMarcandoInspeccionId(null);
        }
      },
    });
  };

  const handleDescargarPdf = async (record: RegistroSello) => {
    const id = String(record.id);
    const codigo = record.codigo || `REG-${id.slice(0, 6)}`;
    try {
      const response = await api.get<Blob>(`/registros/${id}/pdf`, {
        responseType: "blob",
      });
      downloadBlob(response.data, `${codigo}.pdf`);
    } catch (error) {
      console.error(error);
      message.error("No se pudo descargar el PDF del registro");
    }
  };

  const handleGuardarDetalle = async (values: RegistroDetalleUpdateValues) => {
    if (!registroDetalle) return;
    const id = String(registroDetalle.id);
    const payload: RegistroUpdatePayload = {
      descripcion_material: values.descripcionMaterial,
      modulo: values.modulo,
      piso: values.piso,
      eje_numerico: values.ejeNumerico,
      eje_alfabetico: values.ejeAlfabetico,
      numero_sello: values.numeroSello,
      cantidad_sellos: Number(values.cantidadSellos || 0),
      nombre_sellador: values.nombreSellador,
      holgura: Number(values.holguraCm || 0),
      accesibilidad: Number(values.accesibilidad || 0),
      observaciones: values.observaciones,
      estado: values.estado,
    };
    setSavingDetalle(true);
    try {
      const response = await api.put<RegistroUpdateResponse>(`/registros/${id}`, payload);
      const actualizado = response.data?.data
        ? normalizeRegistro(response.data.data)
        : {
            ...registroDetalle,
            descripcionMaterial: values.descripcionMaterial,
            recinto: values.modulo,
            piso: values.piso,
            ejeNumerico: values.ejeNumerico,
            ejeAlfabetico: values.ejeAlfabetico,
            numeroSello: values.numeroSello,
            cantidadSellos: Number(values.cantidadSellos || 0),
            nombreSellador: values.nombreSellador,
            holguraCm: Number(values.holguraCm || 0),
            accesibilidad: Number(values.accesibilidad || 0),
            factorHolgura: normalizeFactorHolgura(Number(values.holguraCm || 0)),
            cieloModular: normalizeCieloModular(Number(values.accesibilidad || 0)),
            cantidadSellosConFactor:
              Number(values.cantidadSellos || 0) *
              normalizeFactorHolgura(Number(values.holguraCm || 0)),
            observaciones: values.observaciones,
            estado: values.estado,
          };
      setRegistros((prev) =>
        prev.map((r) => String(r.id) === id ? actualizado : r)
      );
      setRegistroDetalle(actualizado);
      setDetalleMode("view");
      await Promise.all([cargarRegistros(), cargarResumen()]);
      message.success("Registro actualizado correctamente");
    } catch (error) {
      console.error(error);
      message.error("No se pudo actualizar el registro");
    } finally {
      setSavingDetalle(false);
    }
  };

  const renderFotoCell = (_: unknown, r: RegistroSello) => {
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
            setRegistroDetalle(r);
            setDetalleMode("view");
          }}
        >
          {count > 1 ? `Ver fotos (${count})` : "Ver foto"}
        </Button>
      </div>
    );
  };

  const renderAcciones = (_: unknown, record: RegistroSello) => {
    const estado = normalizeEstado(record.estado);
    const loadingEstado = changingEstadoId === String(record.id);
    const loadingInspeccion = marcandoInspeccionId === String(record.id);
    const seleccionado = record.seleccionadoParaInspeccion;
    return (
      <div className="flex flex-wrap gap-1">
        <Button
          size="small"
          className="px-2"
          onClick={() => {
            setRegistroDetalle(record);
            setDetalleMode("view");
          }}
        >
          Ver
        </Button>
        {estado === "pendiente" && canEditIngenieria && (
          <Button
            size="small"
            type="primary"
            className="px-2"
            loading={loadingEstado}
            onClick={() => void handleIniciarRevision(record)}
          >
            Iniciar revisión
          </Button>
        )}
        {estado === "en_revision" && (
          <>
            {canEditIngenieria && (
              <Button
                size="small"
                className="px-2"
                onClick={() => {
                  setRegistroDetalle(record);
                  setDetalleMode("edit");
                }}
              >
                Editar
              </Button>
            )}
            {canEditIngenieria && (
              <Button
                size="small"
                type="primary"
                className="px-2"
                loading={loadingEstado}
                onClick={() => void handleCambiarEstado(record, "validado")}
              >
                Validar
              </Button>
            )}
            {canEditIngenieria && (
              <Button
                size="small"
                danger
                className="px-2"
                onClick={() => handleAbrirRechazo(record)}
              >
                Rechazar
              </Button>
            )}
          </>
        )}
        {estado === "rechazado" && canEditIngenieria && (
          <Button
            size="small"
            className="px-2"
            loading={loadingEstado}
            onClick={() => void handleCambiarEstado(record, "pendiente")}
          >
            Reenviar a revisión
          </Button>
        )}
        {!seleccionado && canEditIngenieria && (
          <Button
            size="small"
            className="px-2"
            loading={loadingInspeccion}
            onClick={() => handleEnviarInspeccion(record)}
          >
            Enviar a inspección
          </Button>
        )}
        {seleccionado && canEditIngenieria && (
          <Button
            size="small"
            danger
            className="px-2"
            loading={loadingInspeccion}
            onClick={() => handleQuitarInspeccion(record)}
          >
            Quitar inspección
          </Button>
        )}
        {seleccionado && (
          <Button
            size="small"
            type="dashed"
            className="px-2"
            onClick={() => setControlInspeccionRegistroId(String(record.id))}
          >
            Control inspección
          </Button>
        )}
        <Button
          size="small"
          className="px-2"
          onClick={() => void handleDescargarPdf(record)}
        >
          PDF
        </Button>
      </div>
    );
  };

  const columnaInspeccion: ColumnsType<RegistroIngenieria>[number] = {
    title: "Inspección",
    key: "inspeccion",
    width: 140,
    render: (_, r) => {
      const seleccionado = r.seleccionadoParaInspeccion;
      const ultimoControl = r.controlesInspeccion?.[0];
      return (
        <div className="flex flex-col gap-1">
          <Tag
            color={seleccionado ? "gold" : "default"}
            style={{ marginInlineEnd: 0 }}
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          >
            {seleccionado ? "En inspección" : "No enviado"}
          </Tag>
          {ultimoControl?.conformidad && (
            <Tag
              color={ultimoControl.conformidad === "conforme" ? "green" : "red"}
              style={{ marginInlineEnd: 0 }}
              className="rounded-full px-2 py-0.5 text-[10px]"
            >
              {ultimoControl.conformidad === "conforme" ? "Conforme" : "No conforme"}
            </Tag>
          )}
        </div>
      );
    },
  };

  const columnaEstado: ColumnsType<RegistroIngenieria>[number] = {
    title: "Estado",
    dataIndex: "estado",
    key: "estado",
    width: 118,
    render: (estado: string) => (
      <Tag
        color={getEstadoColor(estado)}
        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
        style={{ marginInlineEnd: 0 }}
      >
        {getEstadoLabel(estado)}
      </Tag>
    ),
  };

  const columnaAcciones: ColumnsType<RegistroIngenieria>[number] = {
    title: "Acciones",
    key: "acciones",
    width: 260,
    render: renderAcciones,
  };

  const columnasUnificadas: ColumnsType<RegistroIngenieria> = [
    // 1. Código BECK
    {
      title: "Código BECK",
      key: "codigoBeck",
      width: 140,
      render: (_, r) => displayValue(r.codigoBeck),
    },
    // 2. Itemizado BECK
    {
      title: "Itemizado BECK",
      key: "itemizadoBeck",
      width: 220,
      ellipsis: true,
      render: (_, r) => (
        <div className="max-w-[220px] truncate">
          <span className="font-semibold text-orange-700">
            {displayValue(r.itemizadoBeck || r.descripcionMaterial)}
          </span>
        </div>
      ),
    },
    // 3. Itemizado Mandante
    {
      title: "Itemizado Mandante",
      key: "itemizadoMandante",
      width: 220,
      ellipsis: true,
      render: (_, r) => displayValue(r.itemizadoMandanteNombre),
    },
    // 4. Fecha ejecución de sello
    {
      title: "Fecha ejecución de sello",
      key: "fechaEjecucion",
      width: 155,
      render: (_, r) => (r.fechaEjecucion ? dayjs(r.fechaEjecucion).format("DD-MM-YYYY") : "-"),
    },
    // 5. Día
    {
      title: "Día",
      key: "dia",
      width: 90,
      render: (_, r) => displayValue(r.dia),
    },
    // 6. Piso
    {
      title: "Piso",
      key: "piso",
      width: 90,
      render: (_, r) => displayValue(r.piso),
    },
    // 7. Eje Alfabético
    {
      title: "Eje Alfabético",
      key: "ejeAlfabetico",
      width: 110,
      render: (_, r) => displayValue(r.ejeAlfabetico),
    },
    // 8. Eje Numérico
    {
      title: "Eje Numérico",
      key: "ejeNumerico",
      width: 110,
      render: (_, r) => getEjeNumerico(r),
    },
    // 9. Nombre sellador
    {
      title: "Nombre sellador",
      key: "nombreSellador",
      width: 150,
      render: (_, r) => displayValue(r.nombreSellador),
    },
    // 10. Foto
    { title: "Foto", key: "foto", width: 160, render: renderFotoCell },
    // 11. Recinto
    {
      title: "Recinto",
      key: "recinto",
      width: 160,
      render: (_, r) => displayValue(r.recinto),
    },
    // 12. Módulo o edificio
    {
      title: "Módulo o edificio",
      key: "modulo_edificio",
      width: 160,
      render: (_, r) => displayValue(r.recinto),
    },
    // 13. N° DEL SELLO
    {
      title: "N° DEL SELLO",
      key: "numero_sello",
      width: 120,
      render: (_, r) => displayValue(r.numeroSello),
    },
    // 14. Cantidad de Sellos
    {
      title: "Cantidad de Sellos",
      key: "cantidad_sellos",
      width: 140,
      render: (_, r) =>
        r.cantidadSellos != null && r.cantidadSellos !== 0 ? (
          <span className="font-medium text-orange-700">{r.cantidadSellos}</span>
        ) : "-",
    },
    // 15. Holgura (cm)
    {
      title: "Holgura (cm)",
      key: "holgura",
      width: 100,
      render: (_, r) => displayValue(r.holguraCm),
    },
    // 16. Factor por Holguras
    {
      title: "Factor por Holguras",
      key: "factor_por_holguras",
      width: 130,
      render: (_, r) => {
        const value = Number(r.factorPorHolguras ?? r.factorHolgura ?? 1);
        return (
          <Tag
            color={
              value === 1 ? "green"
              : value === 1.2 ? "geekblue"
              : value === 1.4 ? "orange"
              : "volcano"
            }
          >
            F = {formatDecimal(value)}
          </Tag>
        );
      },
    },
    // 17. Accesibilidad
    {
      title: "Accesibilidad",
      key: "accesibilidad",
      width: 150,
      render: (_, r) => {
        const v = Number(r.accesibilidad ?? r.cieloModular ?? 1);
        const label =
          v === 1 ? "F=1 Acceso normal"
          : v === 2 ? "F=2 Americano / estructurado"
          : "F=3 Cielo duro / gateras";
        return <span className="text-xs">{label}</span>;
      },
    },
    // 18. Cielo modular
    {
      title: "Cielo modular",
      key: "cieloModular",
      width: 130,
      render: (_, r) => {
        const v = r.cieloModular;
        if (v == null) return <span className="text-slate-400">—</span>;
        const label =
          v === 1 ? "F=1 Normal"
          : v === 2 ? "F=2 Americano"
          : "F=3 Cielo duro";
        return <span className="text-xs">{label}</span>;
      },
    },
    // 19. Cantidad de Sellos con Factores
    {
      title: "Cantidad de Sellos con Factores",
      key: "cantidad_sellos_con_factores",
      width: 200,
      render: (_, r) => formatDecimal(r.cantidadSellosConFactores ?? r.cantidadSellosConFactor, 2),
    },
    // 20. Aislación
    {
      title: "Aislación",
      key: "aislacion",
      width: 110,
      render: (_, r) => formatDecimal(r.aislacion, 2),
    },
    // 21. Cantidad de Sellos Aislación
    {
      title: "Cantidad de Sellos Aislación",
      key: "cantidad_sellos_aislacion",
      width: 195,
      render: (_, r) => formatDecimal(r.cantidadSellosAislacion, 2),
    },
    // 22. Reparación de tabique
    {
      title: "Reparación de tabique",
      key: "reparacion_tabique",
      width: 160,
      render: (_, r) => formatDecimal(r.reparacionTabique, 2),
    },
    // 23. Cantidad final
    {
      title: "Cantidad final",
      key: "cantidad_final",
      width: 130,
      render: (_, r) => formatDecimal(r.cantidadFinal, 2),
    },
    // 24. Observaciones
    {
      title: "Observaciones",
      key: "observaciones",
      width: 220,
      ellipsis: true,
      render: (_, r) => displayValue(r.observaciones),
    },
    // 25. FOLIO
    {
      title: "FOLIO",
      key: "folio",
      width: 110,
      render: (_, r) => displayValue(r.numeroSello),
    },
    // 26. Tipo
    {
      title: "Tipo",
      key: "tipoRegistro",
      width: 150,
      render: (_, r) => {
        const tipo = r.tipoRegistro ?? "sello_cortafuego";
        return (
          <Tag
            color={getTipoRegistroColor(tipo)}
            className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${getTipoRegistroBadgeClass(tipo)}`}
            style={{ marginInlineEnd: 0 }}
          >
            {getTipoRegistroLabel(tipo)}
          </Tag>
        );
      },
    },
    // 27-29. Rendimientos (solo Administrador / Ingeniería)
    ...(user?.rol === "Administrador" || user?.rol === "Ingenieria"
      ? [
          {
            title: "Rendimiento Sellos Esperado diario",
            key: "rendimientoSellos",
            width: 210,
            render: (_: unknown, r: RegistroIngenieria) => {
              const v = r.rendimientoSellosEsperadoDiario;
              return v != null ? (
                <span className="font-medium text-slate-700">{v} sellos/día</span>
              ) : (
                <span className="text-slate-400">Sin definir</span>
              );
            },
          } as import("antd/es/table").ColumnType<RegistroIngenieria>,
          {
            title: "Rendimiento Reparación Esperado diario",
            key: "rendimientoReparacion",
            width: 220,
            render: (_: unknown, r: RegistroIngenieria) => {
              const v = r.rendimientoReparacionEsperadoDiario;
              return v != null ? (
                <span className="font-medium text-slate-700">{v} reparaciones/día</span>
              ) : (
                <span className="text-slate-400">Sin definir</span>
              );
            },
          } as import("antd/es/table").ColumnType<RegistroIngenieria>,
          {
            title: "Rendimiento individual",
            key: "rendimientoIndividual",
            width: 160,
            render: (_: unknown, r: RegistroIngenieria) => {
              const v = r.rendimientoIndividualPct;
              return v != null ? (
                <span className="font-medium text-indigo-700">{Number(v).toFixed(2)}%</span>
              ) : (
                <span className="text-slate-400">Sin calcular</span>
              );
            },
          } as import("antd/es/table").ColumnType<RegistroIngenieria>,
        ]
      : []),
    // 30. SELECCIONADO PARA INSPECCIÓN
    {
      title: "SELECCIONADO PARA INSPECCIÓN",
      key: "seleccionadoParaInspeccion",
      width: 220,
      render: (_, r) => {
        const v = r.seleccionadoParaInspeccion;
        if (v == null) return <span className="text-slate-400">—</span>;
        return (
          <Tag
            color={v ? "gold" : "default"}
            style={{ marginInlineEnd: 0 }}
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          >
            {v ? "Sí" : "No"}
          </Tag>
        );
      },
    },
    // Extra: Cantidad / Metros
    {
      title: "Cantidad / Metros",
      key: "cantidadMetros",
      width: 140,
      render: (_, r) => {
        if ((r.tipoRegistro ?? "sello_cortafuego") === "junta_lineal_espuma") {
          const metros = getMetrosLineales(r);
          return (
            <span className="font-medium text-sky-700">
              {metros !== null ? metros.toFixed(2) : "-"} m
            </span>
          );
        }
        return (
          <span className="font-medium text-orange-700">
            {r.cantidadSellos} sellos
          </span>
        );
      },
    },
    // Extra: Cantidad ejecutada (solo Administrador / Ingeniería)
    ...(user?.rol === "Administrador" || user?.rol === "Ingenieria"
      ? [
          {
            title: "Cantidad ejecutada",
            key: "cantidadEjecutada",
            width: 140,
            render: (_: unknown, r: RegistroIngenieria) => {
              const v = r.cantidadEjecutada;
              return v != null ? (
                <span className="font-medium text-indigo-700">{Number(v).toFixed(2)}</span>
              ) : (
                <span className="text-slate-400">Sin calcular</span>
              );
            },
          } as import("antd/es/table").ColumnType<RegistroIngenieria>,
        ]
      : []),
    // Final: Obra, Inspección, Estado, Acciones
    {
      title: "Obra",
      key: "obraNombre",
      width: 160,
      render: (_, r) => r.obraNombre || "Sin obra",
    },
    columnaInspeccion,
    columnaEstado,
    columnaAcciones,
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="pt-1">
        <h1 className="text-xl font-semibold text-slate-900">
          Procesamiento Ingeniería
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Bandeja técnica para revisar, procesar, validar y rechazar registros
          cargados desde terreno.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Pendientes"
          value={resumen.pendientes}
          className="border-amber-200 bg-amber-50"
          valueClassName="text-amber-700"
        />
        <KpiCard
          label="En revisión"
          value={resumen.enRevision}
          className="border-blue-200 bg-blue-50"
          valueClassName="text-blue-700"
        />
        <KpiCard
          label="Validados"
          value={resumen.validadosHoy}
          className="border-emerald-200 bg-emerald-50"
          valueClassName="text-emerald-700"
        />
        <KpiCard
          label="Rechazados"
          value={resumen.rechazados}
          className="border-red-200 bg-red-50"
          valueClassName="text-red-700"
        />
        <KpiCard
          label="Total registros"
          value={resumen.total}
          className="border-slate-200 bg-slate-50"
          valueClassName="text-slate-700"
        />
      </div>

      <Card
        className="border border-slate-200 shadow-sm"
        styles={{
          header: {
            minHeight: 44,
            backgroundColor: "rgba(248,250,252,0.98)",
            borderBottom: "1px solid #E5E7EB",
            fontSize: 13,
          },
          body: { padding: 0 },
        }}
        title={
          <div className="flex items-center justify-between gap-3">
            <span>
              {filtroEstado === "activos"
                ? "Registros para revisión técnica"
                : filtroEstado === "validado"
                  ? "Registros validados"
                  : filtroEstado === "rechazado"
                    ? "Registros rechazados"
                    : "Todos los registros"}
            </span>
            <span className="text-xs font-normal text-slate-500">
              {filteredRegistros.length} registros
            </span>
          </div>
        }
      >
        <div className="border-b border-slate-100 px-4 py-2.5">
          <Segmented
            options={[
              { label: "Pendientes / En revisión", value: "activos" },
              { label: "Validados", value: "validado" },
              { label: "Rechazados", value: "rechazado" },
              { label: "Todos", value: "todos" },
            ]}
            value={filtroEstado}
            onChange={(v) => setFiltroEstado(v as "activos" | "validado" | "rechazado" | "todos")}
            size="small"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 px-4 py-3">
          <Select
            showSearch
            allowClear
            className="beck-obra-filter-select"
            suffixIcon={<SearchOutlined className="text-slate-400" />}
            placeholder="Buscar obra / empresa"
            value={obraSeleccionada || undefined}
            onChange={(value) => setObraSeleccionada(String(value ?? ""))}
            filterOption={(input, option) =>
              normalizeSearchText(option?.label?.toString()).includes(
                normalizeSearchText(input)
              )
            }
            optionFilterProp="label"
            options={obraOptions}
            notFoundContent={obrasLoading ? "Cargando obras..." : "Sin obras"}
            style={{ width: 320, minWidth: 280 }}
            size="small"
          />
          <Select
            allowClear
            placeholder="Todos los tipos"
            value={tipoSeleccionado === "todos" ? undefined : tipoSeleccionado}
            onChange={(v) => setTipoSeleccionado(v ?? "todos")}
            options={[
              { value: "sello_cortafuego", label: "Sellos Cortafuego" },
              { value: "junta_lineal_espuma", label: "Junta Lineal Espuma" },
            ]}
            style={{ width: 200 }}
            size="small"
          />
          <DatePicker.RangePicker
            value={rangoFechas}
            onChange={(v) => setRangoFechas(v as [Dayjs, Dayjs] | null)}
            format="DD-MM-YYYY"
            placeholder={["Fecha inicio", "Fecha fin"]}
            size="small"
            allowClear
          />
          <Button size="small" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        </div>

        <Table
          columns={columnasUnificadas}
          dataSource={filteredRegistros}
          rowKey="id"
          size="small"
          loading={loading}
          scroll={{ x: "max-content" }}
          tableLayout="auto"
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
        />
      </Card>

      <RegistroDetalleModal
        registro={registroDetalle}
        open={!!registroDetalle}
        mode={detalleMode}
        canEdit={!!registroDetalle && detalleMode === "edit"}
        saving={savingDetalle}
        onClose={() => setRegistroDetalle(null)}
        onEdit={() => {
          if (normalizeEstado(registroDetalle?.estado) === "en_revision") {
            setDetalleMode("edit");
          }
        }}
        onSave={handleGuardarDetalle}
        onDownloadPdf={handleDescargarPdf}
        showRendimientoSellos={user?.rol === "Administrador" || user?.rol === "Ingenieria"}
        rendimientoSellosEsperadoDiario={registroDetalle?.rendimientoSellosEsperadoDiario}
        rendimientoReparacionEsperadoDiario={registroDetalle?.rendimientoReparacionEsperadoDiario}
      />

      <ControlInspeccionModal
        registroId={controlInspeccionRegistroId}
        open={!!controlInspeccionRegistroId}
        onClose={() => setControlInspeccionRegistroId(null)}
        onSaved={() => void cargarRegistros()}
      />

      <Modal
        title="Rechazar registro"
        open={!!rechazandoRegistro}
        onCancel={() => setRechazandoRegistro(null)}
        footer={[
          <Button key="cancel" onClick={() => setRechazandoRegistro(null)}>
            Cancelar
          </Button>,
          <Button
            key="confirm"
            danger
            type="primary"
            loading={savingRechazo}
            onClick={() => void handleConfirmarRechazo()}
          >
            Rechazar
          </Button>,
        ]}
      >
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-700">
            Indique el motivo del rechazo.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Motivo de rechazo <span className="text-red-500">*</span>
            </label>
            <Input.TextArea
              rows={4}
              value={motivoRechazoInput}
              onChange={(e) => {
                setMotivoRechazoInput(e.target.value);
                if (e.target.value.trim()) setMotivoRechazoError(false);
              }}
              placeholder="Describe el motivo del rechazo..."
              status={motivoRechazoError ? "error" : undefined}
            />
            {motivoRechazoError && (
              <p className="mt-1 text-xs text-red-500">
                El motivo de rechazo es obligatorio.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Ingenieria;
