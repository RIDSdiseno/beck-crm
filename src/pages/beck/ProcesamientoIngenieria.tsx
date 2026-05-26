import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Select, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import type { ThemeMode } from "../../hooks/useSystemTheme";
import RegistroDetalleModal, {
  type RegistroDetalleUpdateValues,
} from "../../components/RegistroDetalleModal";
import type { RegistroSello } from "../../types/registroSello";
import { api, obrasAPI, type Obra } from "../../services/api";

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
  obra?: { nombre?: string | null } | null;
  obra_nombre?: string | null;
  usuario?: { nombre?: string | null } | null;
  usuario_nombre?: string | null;
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
    r.diaSemana ?? r.dia_semana ?? (fecha ? dayjs(fecha).format("dddd") : "");
  const descripcionMaterial =
    r.descripcionMaterial ?? r.descripcion_material ?? "";
  const ejeNumerico = String(r.ejeNumerico ?? r.eje_numerico ?? "");
  const ejeAlfabetico = r.ejeAlfabetico ?? r.eje_alfabetico ?? "";
  const numeroSello = r.numeroSello ?? r.numero_sello ?? "";
  const cantidadSellos = Number(r.cantidadSellos ?? r.cantidad_sellos ?? 0);
  const metrosLinealesRaw =
    r.metrosLineales ?? r.metros_lineales ?? r.longitud ?? r.longitud_m ?? 0;
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
  const factorHolgura = normalizeFactorHolgura(holguraCm);

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
    itemizadoBeck:
      r.itemizadoBeck ?? r.itemizado_beck ??
      (descripcionMaterial || `REG-${r.id.slice(0, 6)}`),
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
    cieloModular: normalizeCieloModular(accesibilidad),
    cantidadSellosConFactor: cantidadSellos * factorHolgura,
    observaciones: r.observaciones ?? "",
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
  const [rangoFechas, setRangoFechas] = useState<[Dayjs, Dayjs] | null>(null);

  const cargarRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<RegistrosApiResponse | RegistroApiRecord[]>(
        "/registros"
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
      if (tipoSeleccionado !== "todos" && (r.tipoRegistro ?? "sello_cortafuego") !== tipoSeleccionado) return false;
      if (obraEmpresaQuery && !getRegistroObraEmpresaSearchText(r).includes(obraEmpresaQuery)) return false;
      if (rangoFechas) {
        const d = dayjs(r.fechaEjecucion);
        const [start, end] = rangoFechas;
        if (d.isBefore(start, "day") || d.isAfter(end, "day")) return false;
      }
      return true;
    });
  }, [registros, obraSeleccionada, tipoSeleccionado, rangoFechas]);

  const limpiarFiltros = () => {
    setObraSeleccionada("");
    setTipoSeleccionado("todos");
    setRangoFechas(null);
  };

  const resumen = useMemo(() => ({
    pendientes: registros.filter((r) => normalizeEstado(r.estado) === "pendiente").length,
    enRevision: registros.filter((r) => normalizeEstado(r.estado) === "en_revision").length,
    validadosHoy: registros.filter((r) => normalizeEstado(r.estado) === "validado").length,
    rechazados: registros.filter((r) => normalizeEstado(r.estado) === "rechazado").length,
    total: registros.length,
  }), [registros]);

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
      await cargarRegistros();
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
      await cargarRegistros();
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
        {estado === "pendiente" && (
          <Button
            size="small"
            type="primary"
            className="px-2"
            loading={loadingEstado}
            onClick={() => void handleCambiarEstado(record, "en_revision")}
          >
            Iniciar revisión
          </Button>
        )}
        {estado === "en_revision" && (
          <>
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
            <Button
              size="small"
              type="primary"
              className="px-2"
              loading={loadingEstado}
              onClick={() => void handleCambiarEstado(record, "validado")}
            >
              Validar
            </Button>
            <Button
              size="small"
              danger
              className="px-2"
              loading={loadingEstado}
              onClick={() => void handleCambiarEstado(record, "rechazado")}
            >
              Rechazar
            </Button>
          </>
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
    {
      title: "Código BECK",
      key: "codigoBeck",
      width: 120,
      render: (_, r) => r.codigo || `REG-${String(r.id).slice(0, 6)}`,
    },
    {
      title: "Tipo",
      key: "tipoRegistro",
      width: 140,
      render: (_, r) => {
        const tipo = r.tipoRegistro ?? "sello_cortafuego";
        const isJunta = tipo === "junta_lineal_espuma";
        return (
          <Tag
            color={isJunta ? "blue" : "gold"}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${isJunta ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
            style={{ marginInlineEnd: 0 }}
          >
            {isJunta ? "Junta lineal espuma" : "Sello cortafuego"}
          </Tag>
        );
      },
    },
    {
      title: "Itemizado BECK",
      key: "itemizadoBeck",
      width: 180,
      ellipsis: true,
      render: (_, r) => r.itemizadoBeck || r.descripcionMaterial || "-",
    },
    {
      title: "Itemizado SACYR",
      key: "itemizadoSacyr",
      width: 180,
      ellipsis: true,
      render: (_, r) => r.itemizadoSacyr || "-",
    },
    {
      title: "Fecha ejecución sello",
      key: "fechaEjecucionSello",
      width: 150,
      render: (_, r) =>
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
      render: (_, r) => getEjeNumerico(r),
    },
    {
      title: "Nombre sellador",
      dataIndex: "nombreSellador",
      key: "nombreSellador",
      width: 150,
    },
    { title: "Foto", key: "foto", width: 190, render: renderFotoCell },
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
            <span>Registros para revisión técnica</span>
            <span className="text-xs font-normal text-slate-500">
              {filteredRegistros.length} registros
            </span>
          </div>
        }
      >
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
      />
    </div>
  );
};

export default Ingenieria;
