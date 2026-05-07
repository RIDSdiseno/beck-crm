import React, { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  Modal,
  Select,
  Table,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { RangePickerProps } from "antd/es/date-picker";
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
  DownloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import * as XLSX from "xlsx";

import type { ThemeMode } from "../../hooks/useSystemTheme";
import {
  cotizacionesAPI,
  type CotizacionUpsertPayload,
  type CotizacionApiRecord,
} from "../../services/api";
import CotizacionEditorModal, {
  type CotizacionEditorValues,
  type LineaCotizacion,
} from "../../components/CotizacionEditorModal";
import { useAuth } from "../../context/useAuth";

const { RangePicker } = DatePicker;

type CotizacionesProps = {
  themeMode: ThemeMode;
};

type RangeValue = [Dayjs, Dayjs] | null;

type CotizacionListItem = {
  id: string;
  numero: string;
  codigo: string;
  funnelBeckId?: string;
  cliente: string;
  proyecto: string;
  origen: string;
  tipo: string;
  fecha: string;
  vigencia: string;
  estado: string;
  total: number;
  moneda: string;
  responsable: string;
  notas: string;
  descuento: number;
  aplicaImpuesto: boolean;
  subtotal: number;
  impuesto: number;
  lineas: LineaCotizacion[];
};

const estadosOptions = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
  "Vencida",
];

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pickValue = (
  source: Record<string, unknown>,
  keys: string[]
): unknown => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
};

const toText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return fallback;
};

const normalizeEstado = (value: unknown): string => {
  const raw = toText(value, "Sin estado");
  const normalized = raw.toLowerCase();

  if (normalized === "borrador") return "Borrador";
  if (normalized === "enviada" || normalized === "enviado") return "Enviada";
  if (
    normalized === "aceptada" ||
    normalized === "aceptado" ||
    normalized === "aprobada" ||
    normalized === "aprobado"
  ) {
    return "Aceptada";
  }
  if (normalized === "rechazada" || normalized === "rechazado") {
    return "Rechazada";
  }
  if (normalized === "vencida" || normalized === "vencido") {
    return "Vencida";
  }

  return raw;
};

const normalizeMoneda = (value: unknown): string => {
  const moneda = toText(value, "CLP").toUpperCase();
  return moneda || "CLP";
};

const normalizeTipoLinea = (value: unknown): LineaCotizacion["tipoLinea"] => {
  const normalized = toText(value, "MANUAL").trim().toUpperCase();
  if (normalized === "SERVICIO") return "SERVICIO";
  if (normalized === "PRODUCTO") return "PRODUCTO";
  if (normalized === "PRODUCTO_FIREMAT") return "PRODUCTO_FIREMAT";
  return "MANUAL";
};

const normalizeTipoCotizacion = (
  value: string
): CotizacionEditorValues["tipo"] => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized === "interna") return "Interna";
  if (normalized === "servicio") return "Servicio";
  if (normalized === "mantencion") return "Mantencion";
  if (normalized === "otro") return "Otro";

  return "Cliente";
};

const calculateLineSubtotal = (
  cantidad: number,
  precioUnitario: number,
  gananciaPct = 0
) => cantidad * precioUnitario * (1 + gananciaPct / 100);

const calculateCotizacionTotals = (
  lineas: LineaCotizacion[],
  descuento: number,
  aplicaImpuesto: boolean
) => {
  const subtotal = lineas.reduce((acc, linea) => acc + linea.subtotal, 0);
  const descuentoSafe = Number.isFinite(descuento) ? descuento : 0;
  const descuentoPct = Math.min(100, Math.max(0, descuentoSafe));
  const descuentoMonto = subtotal * (descuentoPct / 100);
  const neto = Math.max(0, subtotal - descuentoMonto);
  const impuesto = aplicaImpuesto ? neto * 0.19 : 0;
  const total = neto + impuesto;

  return { subtotal, descuentoMonto, impuesto, total };
};

const extractLineas = (source: Record<string, unknown>): LineaCotizacion[] => {
  const rawLineas = pickValue(source, ["lineas"]);
  if (!Array.isArray(rawLineas)) {
    return [];
  }

  return rawLineas.flatMap((linea, index) => {
    if (!isObjectRecord(linea)) {
      return [];
    }

    const cantidad = Math.max(
      1,
      toNumber(pickValue(linea, ["cantidad", "qty"]))
    );
    const precioUnitario = toNumber(
      pickValue(linea, ["precioUnitario", "precio_unitario"])
    );
    const gananciaPct = toNumber(
      pickValue(linea, ["gananciaPct", "ganancia_pct"])
    );
    const subtotal =
      toNumber(pickValue(linea, ["subtotal"])) ||
      calculateLineSubtotal(cantidad, precioUnitario, gananciaPct);

    const rawFirematId = pickValue(linea, ["productoFirematId", "producto_firemat_id"]);
    const productoFirematId =
      rawFirematId !== undefined && rawFirematId !== null
        ? toNumber(rawFirematId) || undefined
        : undefined;

    return [
      {
        tipoLinea: normalizeTipoLinea(
          pickValue(linea, ["tipoLinea", "tipo_linea"])
        ),
        descripcion: toText(
          pickValue(linea, ["descripcion", "detalle"]),
          "Linea cotizacion"
        ),
        cantidad,
        precioUnitario,
        subtotal,
        orden: toNumber(pickValue(linea, ["orden"])) || index + 1,
        gananciaPct: Number(gananciaPct ?? 0),
        productoFirematId,
      },
    ];
  });
};

const extractCliente = (source: Record<string, unknown>): string => {
  const direct = pickValue(source, [
    "clienteNombre",
    "cliente_nombre",
    "nombreCliente",
    "cliente",
  ]);

  if (typeof direct === "string" || typeof direct === "number") {
    return toText(direct, "Sin cliente");
  }

  if (isObjectRecord(direct)) {
    return toText(
      pickValue(direct, ["nombre", "razonSocial", "razon_social", "empresa"]),
      "Sin cliente"
    );
  }

  const nestedClient = pickValue(source, ["clienteData", "cliente_data"]);
  if (isObjectRecord(nestedClient)) {
    return toText(
      pickValue(nestedClient, ["nombre", "razonSocial", "razon_social", "empresa"]),
      "Sin cliente"
    );
  }

  return "Sin cliente";
};

const mapCotizacion = (
  source: CotizacionApiRecord,
  index = 0
): CotizacionListItem => {
  let lineas = extractLineas(source);
  const numeroValue = pickValue(source, ["numero", "folio", "correlativo"]);
  const codigo = toText(
    pickValue(source, ["codigo", "codigoCotizacion", "codigo_cotizacion"])
  );
  const fecha = toText(
    pickValue(source, ["fecha", "fechaEmision", "fecha_emision", "createdAt", "created_at"])
  );
  const vigencia = toText(
    pickValue(source, ["vigencia", "fechaVencimiento", "fecha_vencimiento"])
  );
  const descuento = toNumber(pickValue(source, ["descuento"]));
  const aplicaImpuesto = toBoolean(
    pickValue(source, ["aplicaImpuesto", "aplica_impuesto"]),
    true
  );
  const subtotal =
    toNumber(pickValue(source, ["subtotal"])) ||
    lineas.reduce((acc, linea) => acc + linea.subtotal, 0);
  const impuesto = toNumber(pickValue(source, ["impuesto"]));
  const total =
    toNumber(
      pickValue(source, ["total", "total_final", "monto_total", "monto", "totalNeto"])
    ) || calculateCotizacionTotals(lineas, descuento, aplicaImpuesto).total;

  if (!lineas.length && total > 0) {
    lineas = [
      {
        tipoLinea: "PRODUCTO",
        descripcion: toText(
          pickValue(source, [
            "proyecto",
            "nombreProyecto",
            "nombre_proyecto",
            "descripcion",
          ]),
          "Item cotizacion"
        ),
        cantidad: 1,
        precioUnitario: total,
        subtotal: total,
        orden: 1,
        gananciaPct: 0,
      },
    ];
  }

  const proyecto = toText(
    pickValue(source, [
      "proyecto",
      "nombreProyecto",
      "nombre_proyecto",
      "descripcion",
    ]),
    lineas[0]?.descripcion || ""
  );

  return {
    id: toText(source.id),
    numero: numeroValue !== undefined ? toText(numeroValue) : codigo || String(index + 1),
    codigo,
    funnelBeckId:
      toText(pickValue(source, ["funnelBeckId", "funnel_beck_id"]), "") ||
      undefined,
    cliente: extractCliente(source),
    proyecto,
    origen: toText(pickValue(source, ["origen"]), "Sin origen"),
    tipo: toText(pickValue(source, ["tipo"]), "Sin tipo"),
    fecha,
    vigencia,
    estado: normalizeEstado(pickValue(source, ["estado"])),
    total,
    moneda: normalizeMoneda(
      pickValue(source, ["moneda", "moneda_total", "currency"])
    ),
    responsable: toText(pickValue(source, ["responsable", "usuarioNombre", "usuario_nombre"])),
    notas: toText(pickValue(source, ["notas", "observaciones"])),
    descuento,
    aplicaImpuesto,
    subtotal,
    impuesto,
    lineas,
  };
};

const getEstadoColors = (estado: string) => {
  if (estado === "Borrador") {
    return { backgroundColor: "#fef3c7", color: "#92400e" };
  }
  if (estado === "Enviada") {
    return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
  }
  if (estado === "Aceptada") {
    return { backgroundColor: "#dcfce7", color: "#166534" };
  }
  if (estado === "Rechazada") {
    return { backgroundColor: "#fee2e2", color: "#b91c1c" };
  }
  if (estado === "Vencida") {
    return { backgroundColor: "#ffedd5", color: "#9a3412" };
  }

  return { backgroundColor: "#E5E7EB", color: "#4B5563" };
};

const formatMoney = (value: number, moneda: string): string => {
  const prefix = moneda === "USD" ? "US$" : "$";
  return `${prefix} ${value.toLocaleString("es-CL", {
    maximumFractionDigits: 0,
  })}`;
};

const formatDate = (value: string): string => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);
  return date.isValid() ? date.format("DD-MM-YYYY") : value;
};

const toDayjsOrFallback = (value: string, fallback: Dayjs): Dayjs => {
  const date = dayjs(value);
  return date.isValid() ? date : fallback;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string" && data.trim()) {
      return data;
    }

    if (isObjectRecord(data)) {
      const apiError = data as { error?: unknown; message?: unknown };

      if (typeof apiError.error === "string" && apiError.error.trim()) {
        return apiError.error;
      }

      if (typeof apiError.message === "string" && apiError.message.trim()) {
        return apiError.message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const Cotizaciones: React.FC<CotizacionesProps> = ({ themeMode }) => {
  void themeMode;

  const { user } = useAuth();
  const canWriteCotizaciones =
    user?.rol === "Administrador" || user?.rol === "Vendedor";
  const canManageGanancia = user?.rol === "Administrador";
  const canCreateCotizaciones = canWriteCotizaciones;
  const canEditCotizaciones = canWriteCotizaciones;
  const canDeleteCotizaciones = canWriteCotizaciones;
  const [cotizaciones, setCotizaciones] = useState<CotizacionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] =
    useState<CotizacionListItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingRecord, setEditingRecord] =
    useState<CotizacionListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<string | undefined>();
  const [filtroOrigen, setFiltroOrigen] = useState<string | undefined>();
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [filtroFechas, setFiltroFechas] = useState<RangeValue>(null);
  const [searchText, setSearchText] = useState("");

  const loadCotizaciones = useCallback(async () => {
    setLoading(true);

    try {
      const response = await cotizacionesAPI.getAll();
      setCotizaciones(response.map((item, index) => mapCotizacion(item, index)));
    } catch (error) {
      setCotizaciones([]);
      message.error(getErrorMessage(error, "No se pudieron cargar las cotizaciones"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCotizaciones();
  }, [loadCotizaciones]);

  useEffect(() => {
    if (canWriteCotizaciones) {
      return;
    }

    setEditorOpen(false);
    setEditingRecord(null);
  }, [canWriteCotizaciones]);

  const origenes = useMemo(
    () =>
      Array.from(
        new Set(cotizaciones.map((cotizacion) => cotizacion.origen).filter(Boolean))
      ).sort(),
    [cotizaciones]
  );

  const tipos = useMemo(
    () =>
      Array.from(
        new Set(cotizaciones.map((cotizacion) => cotizacion.tipo).filter(Boolean))
      ).sort(),
    [cotizaciones]
  );

  const filteredData = useMemo(
    () =>
      cotizaciones.filter((cotizacion) => {
        let ok = true;

        if (filtroEstado) ok = ok && cotizacion.estado === filtroEstado;
        if (filtroOrigen) ok = ok && cotizacion.origen === filtroOrigen;
        if (filtroTipo) ok = ok && cotizacion.tipo === filtroTipo;

        if (filtroFechas) {
          if (!cotizacion.fecha) {
            return false;
          }

          const date = dayjs(cotizacion.fecha);
          if (!date.isValid()) {
            return false;
          }

          const [start, end] = filtroFechas;
          ok =
            ok &&
            !date.isBefore(start, "day") &&
            !date.isAfter(end, "day");
        }

        if (searchText.trim()) {
          const query = searchText.toLowerCase();
          ok =
            ok &&
            (cotizacion.numero.toLowerCase().includes(query) ||
              cotizacion.codigo.toLowerCase().includes(query) ||
              cotizacion.cliente.toLowerCase().includes(query) ||
              cotizacion.proyecto.toLowerCase().includes(query) ||
              cotizacion.origen.toLowerCase().includes(query));
        }

        return ok;
      }),
    [
      cotizaciones,
      filtroEstado,
      filtroOrigen,
      filtroTipo,
      filtroFechas,
      searchText,
    ]
  );

  const resumen = useMemo(() => {
    const totalCot = filteredData.length;
    const totalMonto = filteredData.reduce(
      (acc, cotizacion) => acc + cotizacion.total,
      0
    );
    const aceptadas = filteredData.filter(
      (cotizacion) => cotizacion.estado === "Aceptada"
    ).length;
    const enviadas = filteredData.filter(
      (cotizacion) => cotizacion.estado === "Enviada"
    ).length;
    const base = aceptadas + enviadas;
    const tasaExito = base > 0 ? (aceptadas / base) * 100 : 0;
    const vencen7dias = filteredData.filter((cotizacion) => {
      if (!cotizacion.vigencia) {
        return false;
      }

      const diff = dayjs(cotizacion.vigencia).diff(dayjs(), "day");
      return diff >= 0 && diff <= 7;
    }).length;

    return { totalCot, totalMonto, tasaExito, vencen7dias };
  }, [filteredData]);

  const handleRecargar = () => {
    void loadCotizaciones();
  };

  const openNuevo = () => {
    if (!canCreateCotizaciones) return;

    setEditorMode("create");
    setEditingRecord(null);
    setEditorOpen(true);
  };

  const openEditar = async (record: CotizacionListItem) => {
    if (!canEditCotizaciones) return;

    try {
      setEditorLoading(true);
      const response = await cotizacionesAPI.getById(record.id);
      setEditorMode("edit");
      setEditingRecord(mapCotizacion(response));
      setEditorOpen(true);
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo cargar la cotizacion"));
    } finally {
      setEditorLoading(false);
    }
  };

  const handleVerDetalle = async (id: string) => {
    setDetalleOpen(true);
    setDetalleLoading(true);
    setSelectedCotizacion(null);

    try {
      const response = await cotizacionesAPI.getById(id);
      setSelectedCotizacion(mapCotizacion(response));
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo cargar la cotizacion"));
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleVerPDF = async (id: string, numero?: string) => {
    try {
      const blob = await cotizacionesAPI.getPDF(id);
      const pdfBlob =
        blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);
      const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `cotizacion-${numero || id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      message.error(getErrorMessage(error, "No se pudo abrir el PDF"));
    }
  };

  const handleSaveFromModal = async (values: CotizacionEditorValues) => {
    if (!canWriteCotizaciones || saving || editorLoading) {
      return;
    }

    try {
      setSaving(true);

      const normalizedLineas: CotizacionUpsertPayload["lineas"] = (
        values.lineas ?? []
      )
        .map((linea, index) => {
          const cantidad = Math.max(1, Number(linea.cantidad || 0));
          const precioUnitario = Number(linea.precioUnitario || 0);
          const gananciaPct = canManageGanancia
            ? Number(linea.gananciaPct || 0)
            : 0;
          const tipoLinea: CotizacionUpsertPayload["lineas"][number]["tipoLinea"] =
            linea.tipoLinea === "SERVICIO"
              ? "SERVICIO"
              : linea.tipoLinea === "PRODUCTO_FIREMAT"
                ? "PRODUCTO_FIREMAT"
                : linea.tipoLinea === "MANUAL"
                  ? "MANUAL"
                  : "PRODUCTO";
          const subtotal = calculateLineSubtotal(
            cantidad,
            precioUnitario,
            gananciaPct
          );

          return {
            tipoLinea,
            descripcion: linea.descripcion.trim(),
            cantidad,
            precioUnitario,
            subtotal,
            orden: index + 1,
            gananciaPct,
            productoFirematId:
              linea.tipoLinea === "PRODUCTO_FIREMAT"
                ? (linea.productoFirematId ?? undefined)
                : undefined,
          };
        })
        .filter((linea) => linea.descripcion);

      if (!normalizedLineas.length) {
        message.error("Debes agregar al menos una linea a la cotizacion");
        return;
      }

      const descuentoRaw = Number(values.descuento ?? 0);
      const descuento = Number.isFinite(descuentoRaw)
        ? Math.min(100, Math.max(0, descuentoRaw))
        : 0;
      const aplicaImpuesto = Boolean(values.aplicaImpuesto);
      const { subtotal, impuesto, total } = calculateCotizacionTotals(
        normalizedLineas,
        descuento,
        aplicaImpuesto
      );

      const payload: CotizacionUpsertPayload = {
        numero: values.numero || undefined,
        clienteNombre: values.cliente,
        funnelBeckId: values.funnelBeckId || null,
        subtotal,
        impuesto,
        total,
        vigencia: values.vigencia.toISOString(),
        observaciones: values.notas || "",
        descuento,
        aplicaImpuesto,
        estado: values.estado.toUpperCase(),
        lineas: normalizedLineas,
      };

      let savedCotizacion: CotizacionApiRecord | null = null;

      if (editorMode === "create") {
        savedCotizacion = await cotizacionesAPI.create(payload);
      } else if (editingRecord) {
        savedCotizacion = await cotizacionesAPI.update(editingRecord.id, payload);
      }

      if (savedCotizacion) {
        const advertencias = savedCotizacion["advertencias"];
        if (Array.isArray(advertencias) && advertencias.length > 0) {
          void message.warning("Cotizacion guardada con advertencias de stock");
        }
        const mappedSavedCotizacion = mapCotizacion(savedCotizacion);
        setSelectedCotizacion((current) =>
          current?.id === mappedSavedCotizacion.id ? mappedSavedCotizacion : current
        );
      }

      setEditorOpen(false);
      setEditingRecord(null);
      await loadCotizaciones();
      message.success(
        editorMode === "create"
          ? "Cotizacion creada"
          : "Cotizacion actualizada"
      );
    } catch (error) {
      message.error(getErrorMessage(error, "Error al guardar cotizacion"));
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (!filteredData.length) {
      return;
    }

    const headers = [
      "Nro.",
      "Codigo",
      "Cliente",
      "Proyecto",
      "Origen",
      "Tipo",
      "Fecha",
      "Vigencia",
      "Estado",
      "Total",
      "Moneda",
      "Responsable",
      "Notas",
    ];

    const rows = filteredData.map((cotizacion) => [
      cotizacion.numero,
      cotizacion.codigo,
      cotizacion.cliente,
      cotizacion.proyecto,
      cotizacion.origen,
      cotizacion.tipo,
      formatDate(cotizacion.fecha),
      formatDate(cotizacion.vigencia),
      cotizacion.estado,
      cotizacion.total,
      cotizacion.moneda,
      cotizacion.responsable,
      cotizacion.notas,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cotizaciones");

    const fileName = `BECK_cotizaciones_${dayjs().format(
      "YYYYMMDD_HHmm"
    )}_vista_actual.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleRangeChange: RangePickerProps["onChange"] = (value) => {
    if (!value || !value[0] || !value[1]) {
      setFiltroFechas(null);
      return;
    }

    setFiltroFechas([value[0], value[1]] as [Dayjs, Dayjs]);
  };

  const editorInitialValues: Partial<CotizacionEditorValues> = editingRecord
    ? {
        numero: Number(editingRecord.numero) || undefined,
        funnelBeckId: editingRecord.funnelBeckId,
        cliente: editingRecord.cliente,
        proyecto: editingRecord.proyecto,
        origen: editingRecord.origen === "FIREMAT" ? "FIREMAT" : "BECK",
        tipo: normalizeTipoCotizacion(editingRecord.tipo),
        fecha: toDayjsOrFallback(editingRecord.fecha, dayjs()),
        vigencia: toDayjsOrFallback(
          editingRecord.vigencia,
          dayjs().add(15, "day")
        ),
        estado:
          editingRecord.estado === "Enviada" ||
          editingRecord.estado === "Aceptada" ||
          editingRecord.estado === "Rechazada" ||
          editingRecord.estado === "Vencida"
            ? editingRecord.estado
            : "Borrador",
        moneda: editingRecord.moneda === "USD" ? "USD" : "CLP",
        responsable: editingRecord.responsable,
        notas: editingRecord.notas,
        descuento: editingRecord.descuento,
        aplicaImpuesto: editingRecord.aplicaImpuesto,
        lineas: editingRecord.lineas,
      }
    : {
        fecha: dayjs(),
        vigencia: dayjs().add(15, "day"),
        estado: "Borrador",
        moneda: "CLP",
        origen: "BECK",
        tipo: "Cliente",
        funnelBeckId: undefined,
        cliente: "",
        descuento: 0,
        aplicaImpuesto: true,
        lineas: [],
      };

  const columnas: ColumnsType<CotizacionListItem> = [
    {
      title: "Nro.",
      dataIndex: "numero",
      key: "numero",
      width: 90,
      fixed: "left",
      render: (value: string) => (
        <span className="text-slate-500 text-xs">{value}</span>
      ),
    },
    {
      title: "Fecha cotizacion",
      dataIndex: "fecha",
      key: "fecha",
      width: 140,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 120,
      render: (estado: string) => {
        const colors = getEstadoColors(estado);

        return (
          <span
            style={colors}
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
      dataIndex: "total",
      key: "total",
      width: 150,
      align: "right",
      render: (value: number, record) => (
        <span className="font-semibold text-slate-900">
          {formatMoney(value, record.moneda)}
        </span>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 130,
      align: "center",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                void handleVerDetalle(record.id);
              }}
            />
          </Tooltip>
          {canEditCotizaciones && (
            <Tooltip title="Editar">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                disabled={saving || editorLoading}
                onClick={() => {
                  void openEditar(record);
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Ver PDF">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {
                void handleVerPDF(record.id, record.numero);
              }}
            />
          </Tooltip>
          {canDeleteCotizaciones && (
            <Tooltip title="Eliminar">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.id}
                onClick={() => {
                  Modal.confirm({
                    title: "Eliminar cotización",
                    content: "Esta acción eliminará la cotización. ¿Deseas continuar?",
                    okText: "Eliminar",
                    okButtonProps: { danger: true },
                    cancelText: "Cancelar",
                    onOk: async () => {
                      try {
                        setDeletingId(record.id);
                        await cotizacionesAPI.delete(record.id);
                        message.success("Cotización eliminada");
                        await loadCotizaciones();
                      } catch (error) {
                        message.error(
                          getErrorMessage(error, "No se pudo eliminar la cotización")
                        );
                      } finally {
                        setDeletingId(null);
                      }
                    },
                  });
                }}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <Card
        className="border border-slate-100 shadow-sm rounded-2xl bg-gradient-to-b from-white via-white to-[#f9fafb]"
        styles={{ body: { padding: 18 } }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-orange-700">
              <FileTextOutlined className="text-[12px]" />
              <span>Gestion y seguimiento de cotizaciones</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold tracking-wide text-slate-900">
              Cotizaciones
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Gestiona propuestas de sellos cortafuego por cliente, origen y
              estado. Vista conectada al backend real del CRM.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              icon={<ReloadOutlined />}
              className="text-xs"
              onClick={handleRecargar}
              loading={loading}
            >
              Recargar
            </Button>
            {canCreateCotizaciones && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="bg-orange-500 hover:bg-orange-600 border-none text-xs"
                onClick={openNuevo}
                disabled={saving || editorLoading}
              >
                Crear
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Input
            allowClear
            size="large"
            prefix={
              <SearchOutlined className="text-slate-400 text-[13px] mr-1" />
            }
            className="rounded-full max-w-xl text-xs"
            placeholder="Buscar cotizacion, cliente, proyecto u origen..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">Filtrar por origen</span>
            <Select
              allowClear
              size="small"
              placeholder="Todos los origenes"
              className="w-full"
              value={filtroOrigen}
              onChange={(value) => setFiltroOrigen(value)}
              options={origenes.map((origen) => ({
                label: origen,
                value: origen,
              }))}
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
              onChange={(value) => setFiltroEstado(value)}
              options={estadosOptions.map((estado) => ({
                label: estado,
                value: estado,
              }))}
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
              onChange={(value) => setFiltroTipo(value)}
              options={tipos.map((tipo) => ({ label: tipo, value: tipo }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">Rango de fecha</span>
            <RangePicker
              size="small"
              className="w-full"
              format="DD-MM-YYYY"
              value={filtroFechas as RangePickerProps["value"]}
              onChange={handleRangeChange}
            />
          </div>
        </div>
      </Card>

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
                Valores cargados desde backend
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
              <p className="text-[11px] text-emerald-700">Tasa de exito</p>
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
              <p className="text-[11px] text-sky-700">Vencen en los proximos 7 dias</p>
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
            disabled={!filteredData.length}
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
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
        <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">
          Mostrando {filteredData.length} de {cotizaciones.length} cotizaciones.
        </div>
      </Card>

      <Modal
        open={detalleOpen}
        onCancel={() => {
          setDetalleOpen(false);
          setSelectedCotizacion(null);
        }}
        title="Detalle de cotizacion"
        footer={[
          <Button
            key="cerrar"
            onClick={() => {
              setDetalleOpen(false);
              setSelectedCotizacion(null);
            }}
          >
            Cerrar
          </Button>,
          <Button
            key="pdf"
            type="primary"
            icon={<DownloadOutlined />}
            className="bg-sky-500 hover:bg-sky-600 border-none"
            disabled={!selectedCotizacion}
            onClick={() => {
              if (selectedCotizacion) {
                void handleVerPDF(
                  selectedCotizacion.id,
                  selectedCotizacion.numero
                );
              }
            }}
          >
            Ver PDF
          </Button>,
        ]}
      >
        {detalleLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Cargando detalle...
          </div>
        ) : selectedCotizacion ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Nro.">
              {selectedCotizacion.numero}
            </Descriptions.Item>
            <Descriptions.Item label="Codigo">
              {selectedCotizacion.codigo || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Cliente">
              {selectedCotizacion.cliente}
            </Descriptions.Item>
            <Descriptions.Item label="Proyecto">
              {selectedCotizacion.proyecto || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              {selectedCotizacion.estado}
            </Descriptions.Item>
            <Descriptions.Item label="Total">
              {formatMoney(
                selectedCotizacion.total,
                selectedCotizacion.moneda
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha">
              {formatDate(selectedCotizacion.fecha)}
            </Descriptions.Item>
            <Descriptions.Item label="Vigencia">
              {formatDate(selectedCotizacion.vigencia)}
            </Descriptions.Item>
            <Descriptions.Item label="Origen">
              {selectedCotizacion.origen || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Tipo">
              {selectedCotizacion.tipo || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Responsable">
              {selectedCotizacion.responsable || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Notas">
              {selectedCotizacion.notas || "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            No se pudo cargar el detalle.
          </div>
        )}
      </Modal>

      {editorOpen && canWriteCotizaciones && (
        <CotizacionEditorModal
          key={`${editorMode}-${editingRecord?.id ?? "new"}`}
          open={editorOpen}
          mode={editorMode}
          initialValues={editorInitialValues}
          submitting={saving}
          lockFunnelSelection={false}
          canManageGanancia={canManageGanancia}
          onClose={() => {
            if (saving) {
              return;
            }

            setEditorOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={(values) => {
            void handleSaveFromModal(values);
          }}
        />
      )}
    </div>
  );
};

export default Cotizaciones;



