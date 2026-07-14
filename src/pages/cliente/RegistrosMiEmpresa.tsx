import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  BuildOutlined,
  CalendarOutlined,
  FileSearchOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import { getTipoRegistroLabel } from "../../constants/roles";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  clienteAPI,
  vistaClienteConfigAPI,
  type ClienteBeckVistaCliente,
  type ClienteDashboardData,
  type ClienteObraResumen,
  type ClienteRegistroColumna,
  type ClienteRegistroValidado,
  type VistaClienteConfigItem,
} from "../../services/api";
import { useAuth } from "../../context/useAuth";
import { usePermisos } from "../../hooks/usePermisos";
import RegistroDetalleFirmaModal, {
  type RegistroDetalleVisibleField,
} from "../../components/RegistroDetalleFirmaModal";
import RegistroFirmaMasivaModal from "../../components/RegistroFirmaMasivaModal";
import ItemizadoPreviewPanel from "../../components/ItemizadoPreviewPanel";

dayjs.locale("es");

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const CHART_COLORS = ["#d4a017", "#e07b54", "#5b8dd9", "#6abf69", "#9b59b6", "#e74c3c"];

const CLAVES_DEFAULT: VistaClienteConfigItem[] = [
  { clave: "total_obras", visible: true, tituloPersonalizado: null, orden: 1 },
  { clave: "registros_validados", visible: true, tituloPersonalizado: null, orden: 2 },
  { clave: "cantidad_final_total", visible: true, tituloPersonalizado: null, orden: 3 },
  { clave: "registros_mes", visible: true, tituloPersonalizado: null, orden: 4 },
  { clave: "registros_por_obra", visible: true, tituloPersonalizado: null, orden: 5 },
  { clave: "registros_por_tipo", visible: true, tituloPersonalizado: null, orden: 6 },
  { clave: "registros_por_piso", visible: true, tituloPersonalizado: null, orden: 7 },
  { clave: "registros_por_fecha", visible: true, tituloPersonalizado: null, orden: 8 },
  { clave: "obras", visible: true, tituloPersonalizado: null, orden: 9 },
];

const CLAVE_LABEL: Record<string, string> = {
  total_obras: "Total obras",
  registros_validados: "Registros validados",
  cantidad_final_total: "Cantidad final total",
  registros_mes: "Registros este mes",
  registros_por_obra: "Gráfico: Registros por obra",
  registros_por_tipo: "Gráfico: Registros por tipo",
  registros_por_piso: "Gráfico: Registros por piso",
  registros_por_fecha: "Gráfico: Registros por fecha",
  obras: "Tabla de obras",
};

const getConfigItem = (
  cfg: VistaClienteConfigItem[] | undefined,
  clave: string
): VistaClienteConfigItem => {
  if (cfg) {
    const found = cfg.find((c) => c.clave === clave);
    if (found) return found;
  }
  return CLAVES_DEFAULT.find((c) => c.clave === clave) ?? { clave, visible: true, orden: 99 };
};

const normalizarConfiguracionVista = (
  items: VistaClienteConfigItem[] | undefined | null
): VistaClienteConfigItem[] => {
  const itemsByClave = new Map((items ?? []).map((item) => [item.clave, item]));
  const defaultsNormalizados = CLAVES_DEFAULT.map((defaultItem) => {
    const item = itemsByClave.get(defaultItem.clave);
    return {
      ...defaultItem,
      ...item,
      visible: item?.visible ?? defaultItem.visible,
      tituloPersonalizado: item?.tituloPersonalizado ?? defaultItem.tituloPersonalizado ?? null,
      orden: item?.orden ?? defaultItem.orden,
    };
  });
  const extras = (items ?? [])
    .filter((item) => !CLAVES_DEFAULT.some((defaultItem) => defaultItem.clave === item.clave))
    .map((item) => ({
      ...item,
      visible: item.visible ?? true,
      tituloPersonalizado: item.tituloPersonalizado ?? null,
      orden: item.orden ?? 99,
    }));
  return [...defaultsNormalizados, ...extras].sort((a, b) => a.orden - b.orden);
};

const isVisible = (cfg: VistaClienteConfigItem[] | undefined, clave: string): boolean =>
  getConfigItem(cfg, clave).visible === true;

const getTitle = (cfg: VistaClienteConfigItem[] | undefined, clave: string, fallback: string): string => {
  const item = getConfigItem(cfg, clave);
  return item.tituloPersonalizado?.trim() || fallback;
};

const getFotos = (r: ClienteRegistroValidado): string[] => {
  const foto = r.foto ?? r.Foto ?? r.fotos;
  if (Array.isArray(foto)) return foto.filter((url): url is string => typeof url === "string" && Boolean(url));
  if (typeof foto === "string" && foto.trim()) return [foto];
  if (Array.isArray(r.fotosUrls) && r.fotosUrls.length > 0) return r.fotosUrls as string[];
  if (r.fotoUrl && typeof r.fotoUrl === "string") return [r.fotoUrl];
  if (Array.isArray(r.fotos_registro)) {
    return (r.fotos_registro as Array<{ url: string }>).map((f) => f.url).filter(Boolean);
  }
  return [];
};

const snakeToCamel = (s: string): string =>
  s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const COLUMNAS_FIJAS_KEYS = new Set(["estado", "acciones"]);

const getRegistroValue = (record: ClienteRegistroValidado, key: string): unknown => {
  if (key in record) return record[key];
  const camelKey = snakeToCamel(key);
  if (camelKey in record) return record[camelKey];
  const lowerKey = key.toLowerCase().replace(/_/g, "");
  const foundKey = Object.keys(record).find((k) => k.toLowerCase().replace(/_/g, "") === lowerKey);
  return foundKey ? record[foundKey] : undefined;
};

const getColumnaKey = (columna: ClienteRegistroColumna): string =>
  columna.key ?? columna.clave ?? columna.dataIndex ?? columna.campo ?? "";

const getColumnaTitle = (columna: ClienteRegistroColumna): string =>
  columna.title ?? columna.titulo ?? columna.label ?? getColumnaKey(columna);

const isFotoColumn = (key: string, title: string): boolean => {
  const text = `${key} ${title}`.toLowerCase();
  return text.includes("foto") || text.includes("imagen");
};

type VisibleRegistroColumn = {
  key: string;
  title: string;
  dataIndex: string;
  isFoto: boolean;
};

const renderRegistroValue = (
  value: unknown,
  record: ClienteRegistroValidado,
  key: string,
  title: string
) => {
  if (isFotoColumn(key, title)) {
    const fotos = getFotos(record);
    if (fotos.length === 0) return <Text type="secondary">-</Text>;
    return (
      <Image.PreviewGroup>
        <Space size={6} wrap>
          {fotos.slice(0, 3).map((url, index) => (
            <Image
              key={`${url}-${index}`}
              src={url}
              width={44}
              height={34}
              style={{ objectFit: "cover", borderRadius: 4 }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAATElEQVRoge3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBxAABHgAAAABJRU5ErkJggg=="
            />
          ))}
          {fotos.length > 3 && <Badge count={`+${fotos.length - 3}`} />}
        </Space>
      </Image.PreviewGroup>
    );
  }
  if (value === null || value === undefined || value === "") return <Text type="secondary">-</Text>;
  if (typeof value === "number") return value.toLocaleString("es-CL");
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (typeof value === "string" && /fecha|date/i.test(`${key} ${title}`)) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : value;
  }
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || <Text type="secondary">-</Text>;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const e = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
    if (e.response?.status === 400) return "Parámetro de cliente requerido o inválido.";
    if (e.response?.status === 403) return "No tienes permiso para ver estos datos.";
    return e.response?.data?.error ?? e.response?.data?.message ?? "Error al cargar datos.";
  }
  if (err instanceof Error) return err.message;
  return "Error desconocido.";
};

// ── Modal configuración vista cliente ─────────────────────────────────────────

interface ConfigVistaModalProps {
  open: boolean;
  titulo: string;
  onClose: () => void;
  onGuardado: (items: VistaClienteConfigItem[]) => void;
  fetchConfig: () => Promise<VistaClienteConfigItem[]>;
  saveConfig: (items: VistaClienteConfigItem[]) => Promise<VistaClienteConfigItem[]>;
}

const ConfigVistaModal: React.FC<ConfigVistaModalProps> = ({
  open,
  titulo,
  onClose,
  onGuardado,
  fetchConfig,
  saveConfig,
}) => {
  const [items, setItems] = useState<VistaClienteConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchConfig()
      .then((data) => {
        console.log("GET configuracion vista modal", data);
        const normalized = normalizarConfiguracionVista(data);
        console.log("CONFIG MODAL STATE FINAL", normalized);
        setItems(normalized);
      })
      .catch(() => {
        void message.error("No se pudo cargar la configuración");
        const normalized = normalizarConfiguracionVista(undefined);
        console.log("CONFIG MODAL STATE FINAL", normalized);
        setItems(normalized);
      })
      .finally(() => setLoading(false));
  }, [open, fetchConfig]);

  const updateItem = (clave: string, field: keyof VistaClienteConfigItem, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => (item.clave === clave ? { ...item, [field]: value } : item))
    );
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const payload = normalizarConfiguracionVista(items).map((item) => ({
        clave: item.clave,
        visible: item.visible === true,
        tituloPersonalizado: item.tituloPersonalizado?.trim() ? item.tituloPersonalizado : null,
        orden: item.orden,
      }));
      console.log("PUT configuracion vista payload", { items: payload });
      const savedItems = await saveConfig(payload);
      const normalizedSavedItems = normalizarConfiguracionVista(savedItems);
      void message.success("Configuración guardada correctamente");
      setItems(normalizedSavedItems);
      onGuardado(normalizedSavedItems);
      onClose();
    } catch {
      void message.error("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<VistaClienteConfigItem> = [
    {
      title: "Elemento",
      dataIndex: "clave",
      key: "clave",
      render: (v: string) => <Text style={{ fontSize: 12 }}>{CLAVE_LABEL[v] ?? v}</Text>,
    },
    {
      title: "Visible",
      dataIndex: "visible",
      key: "visible",
      align: "center",
      width: 80,
      render: (_v: boolean, row) => {
        console.log("SWITCH ITEM", row.clave, row.visible);
        return (
          <Switch
            size="small"
            checked={row.visible === true}
            disabled={saving}
            onChange={(val) => updateItem(row.clave, "visible", val)}
          />
        );
      },
    },
    {
      title: "Título personalizado",
      dataIndex: "tituloPersonalizado",
      key: "tituloPersonalizado",
      render: (v: string | null | undefined, row) => (
        <Input
          size="small"
          value={v ?? ""}
          disabled={saving}
          placeholder={CLAVE_LABEL[row.clave] ?? row.clave}
          onChange={(e) => updateItem(row.clave, "tituloPersonalizado", e.target.value || null)}
          style={{ fontSize: 11 }}
        />
      ),
    },
    {
      title: "Orden",
      dataIndex: "orden",
      key: "orden",
      align: "center",
      width: 80,
      render: (v: number, row) => (
        <InputNumber
          size="small"
          value={v}
          min={1}
          max={99}
          disabled={saving}
          onChange={(val) => updateItem(row.clave, "orden", val ?? 1)}
          style={{ width: 60 }}
        />
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SettingOutlined style={{ color: "#d4a017" }} />
          <span>{titulo}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={640}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          onClick={() => void handleGuardar()}
          style={{ backgroundColor: "#d4a017", borderColor: "#d4a017" }}
        >
          Guardar
        </Button>,
      ]}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <Table
          rowKey="clave"
          columns={columns}
          dataSource={[...items].sort((a, b) => a.orden - b.orden)}
          size="small"
          pagination={false}
        />
      )}
    </Modal>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const RegistrosMiEmpresa: React.FC = () => {
  const { user } = useAuth();
  const { canView } = usePermisos();

  const isAdmin = user?.rol === "Administrador";
  const isCliente = user?.rol === "Cliente";
  const isInterno = !isAdmin && !isCliente && canView("beck_vista_cliente");
  const necesitaSelector = isAdmin || isInterno;

  const [clientesBeck, setClientesBeck] = useState<ClienteBeckVistaCliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | undefined>();

  const [dashboard, setDashboard] = useState<ClienteDashboardData | null>(null);
  const [obras, setObras] = useState<ClienteObraResumen[]>([]);
  const [loadingDash, setLoadingDash] = useState(false);
  const [loadingObras, setLoadingObras] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);

  const [obraSeleccionada, setObraSeleccionada] = useState<ClienteObraResumen | null>(null);
  const [registros, setRegistros] = useState<ClienteRegistroValidado[]>([]);
  const [columnasRegistro, setColumnasRegistro] = useState<ClienteRegistroColumna[]>([]);
  const [columnasFijasRegistro, setColumnasFijasRegistro] = useState<ClienteRegistroColumna[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [validandoRegistroId, setValidandoRegistroId] = useState<string | null>(null);
  const [abriendoPdfId, setAbriendoPdfId] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<ClienteRegistroValidado | null>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [firmaMasivaOpen, setFirmaMasivaOpen] = useState(false);
  const [procesandoFirmaMasiva, setProcesandoFirmaMasiva] = useState(false);
  const [abriendoPdfConsolidado, setAbriendoPdfConsolidado] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [filtroPiso, setFiltroPiso] = useState<string | undefined>();
  const [filtroFechas, setFiltroFechas] = useState<[Dayjs, Dayjs] | null>(null);

  // Modal configuración vista
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Tabs de "Vista Cliente" (solo admin/interno): Registros vs. Itemizado de la obra
  const [activeTab, setActiveTab] = useState<"registros" | "itemizado">("registros");

  const apiParams = necesitaSelector
    ? clienteSeleccionadoId
      ? { clienteBeckId: clienteSeleccionadoId }
      : undefined
    : undefined;

  const listoParaCargar = !necesitaSelector || !!clienteSeleccionadoId;

  useEffect(() => {
    if (!necesitaSelector) return;
    setLoadingClientes(true);
    clienteAPI
      .clientesBeck()
      .then(setClientesBeck)
      .catch((err) => void message.error("No se pudieron cargar los clientes: " + getErrorMessage(err)))
      .finally(() => setLoadingClientes(false));
  }, [necesitaSelector]);

  const cargarDatos = useCallback(
    async (params?: { clienteBeckId?: string }) => {
      setErrorDatos(null);
      setLoadingDash(true);
      setLoadingObras(true);
      setObraSeleccionada(null);
      setRegistros([]);
      setColumnasRegistro([]);
      setColumnasFijasRegistro([]);
      try {
        const [dash, obrasData] = await Promise.all([
          clienteAPI.dashboard(params),
          clienteAPI.obras(params),
        ]);
        console.log("dashboard cliente configuracionVista", dash.configuracionVista);
        setDashboard({
          ...dash,
          configuracionVista: normalizarConfiguracionVista(dash.configuracionVista),
        });
        setObras(obrasData);
      } catch (err) {
        const msg = getErrorMessage(err);
        setErrorDatos(msg);
        void message.error(msg);
        setDashboard(null);
        setObras([]);
      } finally {
        setLoadingDash(false);
        setLoadingObras(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!necesitaSelector) {
      void cargarDatos(undefined);
    }
  }, [necesitaSelector, cargarDatos]);

  useEffect(() => {
    if (necesitaSelector && clienteSeleccionadoId) {
      void cargarDatos({ clienteBeckId: clienteSeleccionadoId });
    }
    if (necesitaSelector && !clienteSeleccionadoId) {
      setDashboard(null);
      setObras([]);
      setObraSeleccionada(null);
      setRegistros([]);
      setColumnasRegistro([]);
      setColumnasFijasRegistro([]);
      setErrorDatos(null);
    }
  }, [necesitaSelector, clienteSeleccionadoId, cargarDatos]);

  const abrirObra = useCallback(
    async (obra: ClienteObraResumen) => {
      setObraSeleccionada(obra);
      setRegistros([]);
      setColumnasRegistro([]);
      setBusqueda("");
      setFiltroTipo(undefined);
      setFiltroPiso(undefined);
      setFiltroFechas(null);
      setSelectedRowKeys([]);
      setLoadingRegistros(true);
      try {
        const data = await clienteAPI.registrosPorObra(obra.id, apiParams);
        console.log("REGISTROS CLIENTE RESPONSE FINAL", data);
        console.log("COLUMNAS CONFIGURABLES FINAL", data.columnasConfigurables);
        console.log("REGISTROS FINAL primer registro", data.registros?.[0]);
        setRegistros(data.registros);
        // Estado/Acciones always hardcoded at the end — filter them from dynamic columns regardless of source.
        const esFija = (c: ClienteRegistroColumna) =>
          COLUMNAS_FIJAS_KEYS.has(getColumnaKey(c).toLowerCase());
        const colsToUse = (
          data.columnasConfigurables?.length ? data.columnasConfigurables : (data.columnas ?? [])
        ).filter((c) => !esFija(c));
        const columnasFijas = data.columnasFijas?.length
          ? data.columnasFijas
          : [...(data.columnasConfigurables ?? []), ...(data.columnas ?? [])].filter(esFija);
        console.log("COLUMNAS A USAR (colsToUse)", colsToUse);
        setColumnasRegistro(colsToUse);
        setColumnasFijasRegistro(columnasFijas);
      } catch (err) {
        void message.error("No se pudieron cargar los registros: " + getErrorMessage(err));
      } finally {
        setLoadingRegistros(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clienteSeleccionadoId]
  );

  const confirmarValidacionConFirma = useCallback(
    async (firma: { pathData: string; canvasWidth: number; canvasHeight: number }) => {
      if (!detalle) return;
      const registro = detalle;
      setValidandoRegistroId(registro.id);
      try {
        const updated = await clienteAPI.validarRegistro(registro.id, firma);
        setRegistros((prev) =>
          prev.map((item) =>
            item.id === registro.id
              ? {
                  ...item,
                  ...updated,
                  estado: updated.estado ?? "Validado",
                  validadoCliente: updated.validadoCliente ?? true,
                  pdfFirmadoUrl: updated.pdfFirmadoUrl ?? item.pdfFirmadoUrl,
                  acciones: {
                    ...(item.acciones ?? {}),
                    ...(updated.acciones ?? {}),
                    puedeValidar: false,
                  },
                }
              : item
          )
        );
        void message.success("Registro validado correctamente. El PDF firmado ya está disponible.");
        // Cierra el modal y refresca: la fila de la tabla ya quedó actualizada
        // arriba; al reabrir el detalle se usará ese dato ya refrescado.
        setDetalle(null);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          void message.error("Este registro ya fue validado.");
        } else if (status === 403) {
          void message.error("No tienes permiso para validar este registro.");
        } else if (status === 400) {
          void message.error(getErrorMessage(err));
        } else {
          void message.error("No se pudo validar el registro: " + getErrorMessage(err));
        }
        // No cerramos el modal en caso de error: se mantiene la firma dibujada
        // para que el cliente pueda reintentar sin volver a firmar.
      } finally {
        setValidandoRegistroId(null);
      }
    },
    [detalle]
  );

  // Abre el PDF firmado a través del endpoint seguro del backend (valida
  // autenticación y acceso a la obra) en vez de navegar directo a la URL de
  // Cloudinary guardada en pdfFirmadoUrl.
  const abrirPdfFirmado = useCallback(async (registroId: string) => {
    setAbriendoPdfId(registroId);
    try {
      const blob = await clienteAPI.descargarPdfFirmado(registroId);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        void message.error("No tienes acceso a este registro.");
      } else if (status === 404) {
        void message.error("Este registro todavía no tiene un PDF firmado.");
      } else {
        void message.error("No se pudo abrir el PDF firmado: " + getErrorMessage(err));
      }
    } finally {
      setAbriendoPdfId(null);
    }
  }, []);

  const registrosSeleccionados = useMemo(
    () => registros.filter((r) => selectedRowKeys.includes(r.id)),
    [registros, selectedRowKeys]
  );

  // Firma masiva: la selección puede ser mixta (pendientes + ya firmados). Se
  // firman solo los pendientes y los ya firmados se omiten sin tocarlos —
  // misma clasificación que aplica el backend (validadoCliente).
  const registrosPendientesSeleccionados = useMemo(
    () => registrosSeleccionados.filter((r) => !r.validadoCliente),
    [registrosSeleccionados]
  );
  const registrosYaFirmadosSeleccionados = useMemo(
    () => registrosSeleccionados.filter((r) => Boolean(r.validadoCliente)),
    [registrosSeleccionados]
  );

  const confirmarFirmaMasiva = useCallback(
    async (firma: { pathData: string; canvasWidth: number; canvasHeight: number }) => {
      // Solo se envían los IDs pendientes: los ya firmados en la selección se
      // omiten localmente y nunca viajan en el request.
      const ids = registrosPendientesSeleccionados.map((r) => r.id);
      if (ids.length === 0) return;
      setProcesandoFirmaMasiva(true);
      try {
        const resultado = await clienteAPI.validarRegistrosMultiple(ids, firma);

        if (resultado.totalExitosos > 0) {
          const exitososPorId = new Map(resultado.exitosos.map((e) => [e.id, e]));
          setRegistros((prev) =>
            prev.map((item) => {
              const exito = exitososPorId.get(item.id);
              if (!exito) return item;
              return {
                ...item,
                validadoCliente: true,
                pdfFirmadoUrl: exito.pdfFirmadoUrl,
                estado: "Validado",
                acciones: { ...(item.acciones ?? {}), puedeValidar: false },
              };
            })
          );
        }

        const partes: string[] = [`${resultado.totalExitosos} registro(s) firmado(s) correctamente`];
        if (resultado.totalOmitidos > 0) {
          partes.push(`${resultado.totalOmitidos} omitido(s) por estar ya firmado(s)`);
        }
        if (resultado.totalFallidos > 0) {
          partes.push(`${resultado.totalFallidos} fallaron`);
        }
        const resumen = partes.join(", ") + ".";

        if (resultado.totalFallidos === 0) {
          void message.success(resumen);
          setSelectedRowKeys([]);
          setFirmaMasivaOpen(false);
        } else {
          void message.warning(resumen);
          // Deja seleccionados solo los que realmente fallaron (condición de
          // carrera), para poder reintentar sin tener que volver a marcar los
          // que ya se firmaron u omitir de nuevo los que ya estaban firmados.
          setSelectedRowKeys(resultado.fallidos.map((f) => f.id));
          setFirmaMasivaOpen(false);
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          void message.error("Uno o más registros ya fueron validados por el cliente.");
        } else if (status === 403) {
          void message.error("No tienes permiso para validar uno o más de estos registros.");
        } else if (status === 400) {
          void message.error(getErrorMessage(err));
        } else {
          void message.error("No se pudo procesar la firma masiva: " + getErrorMessage(err));
        }
        throw err;
      } finally {
        setProcesandoFirmaMasiva(false);
      }
    },
    [registrosPendientesSeleccionados]
  );

  // Igual patrón que abrirPdfFirmado: abre el PDF consolidado en una pestaña
  // nueva vía blob + URL temporal, en vez de forzar una descarga con <a
  // download>. Así el usuario decide desde el visor del navegador si lo
  // guarda, imprime o solo lo revisa.
  const handleVerPdfConsolidado = useCallback(async () => {
    const ids = registrosSeleccionados.map((r) => r.id);
    if (ids.length === 0) return;
    setAbriendoPdfConsolidado(true);
    try {
      const blob = await clienteAPI.descargarPdfConsolidado(ids);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      void message.error("No se pudo generar el PDF consolidado: " + getErrorMessage(err));
    } finally {
      setAbriendoPdfConsolidado(false);
    }
  }, [registrosSeleccionados]);

  const volver = useCallback(() => {
    setObraSeleccionada(null);
    setRegistros([]);
    setColumnasRegistro([]);
    setColumnasFijasRegistro([]);
    setSelectedRowKeys([]);
  }, []);

  const tiposUnicos = useMemo(
    () => [...new Set(registros.map((r) => r.tipoRegistro).filter(Boolean) as string[])],
    [registros]
  );
  const pisosUnicos = useMemo(
    () => [...new Set(registros.map((r) => r.piso).filter(Boolean) as string[])],
    [registros]
  );

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroTipo && r.tipoRegistro !== filtroTipo) return false;
      if (filtroPiso && r.piso !== filtroPiso) return false;
      if (filtroFechas) {
        const fecha = r.fecha ? dayjs(r.fecha) : null;
        if (!fecha) return false;
        if (fecha.isBefore(filtroFechas[0], "day")) return false;
        if (fecha.isAfter(filtroFechas[1], "day")) return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return Object.entries(r).some(([key, value]) => {
          if (["acciones", "fotos_registro", "fotosUrls"].includes(key)) return false;
          if (value === null || value === undefined) return false;
          if (Array.isArray(value)) return value.some((item) => String(item ?? "").toLowerCase().includes(q));
          if (typeof value === "object") return false;
          return String(value).toLowerCase().includes(q);
        });
      }
      return true;
    });
  }, [registros, filtroTipo, filtroPiso, filtroFechas, busqueda]);

  const kpisEfectivos = useMemo((): ClienteDashboardData | null => {
    if (!listoParaCargar || loadingDash) return null;
    if (
      dashboard &&
      (dashboard.totalObras > 0 || dashboard.totalRegistros > 0 || dashboard.cantidadFinalTotal > 0)
    ) {
      return dashboard;
    }
    if (obras.length > 0) {
      return {
        totalObras: obras.length,
        totalRegistros: obras.reduce((acc, o) => acc + (o.totalRegistros ?? 0), 0),
        cantidadFinalTotal: obras.reduce((acc, o) => acc + (o.cantidadFinalTotal ?? 0), 0),
        registrosEsteMes: dashboard?.registrosEsteMes ?? 0,
        registrosPorObra: obras.map((o) => ({ nombre: o.nombre, total: o.totalRegistros ?? 0 })),
        registrosPorTipo: dashboard?.registrosPorTipo ?? [],
        registrosPorPiso: dashboard?.registrosPorPiso ?? [],
        registrosPorFecha: dashboard?.registrosPorFecha ?? [],
        configuracionVista: dashboard?.configuracionVista,
      };
    }
    return dashboard;
  }, [dashboard, obras, listoParaCargar, loadingDash]);

  // Configuración vista efectiva (desde dashboard o defaults)
  const cfg = kpisEfectivos?.configuracionVista;

  // fetchConfig y saveConfig según contexto (general o por empresa)
  const fetchConfig = useCallback(async (): Promise<VistaClienteConfigItem[]> => {
    if (clienteSeleccionadoId) {
      const result = await vistaClienteConfigAPI.getCliente(clienteSeleccionadoId);
      return normalizarConfiguracionVista(result.items);
    }
    const result = await vistaClienteConfigAPI.getGeneral();
    return normalizarConfiguracionVista(result.items);
  }, [clienteSeleccionadoId]);

  const saveConfig = useCallback(
    async (items: VistaClienteConfigItem[]): Promise<VistaClienteConfigItem[]> => {
      if (clienteSeleccionadoId) {
        await vistaClienteConfigAPI.putCliente(clienteSeleccionadoId, { items });
        const result = await vistaClienteConfigAPI.getCliente(clienteSeleccionadoId);
        return normalizarConfiguracionVista(result.items);
      } else {
        await vistaClienteConfigAPI.putGeneral({ items });
        const result = await vistaClienteConfigAPI.getGeneral();
        return normalizarConfiguracionVista(result.items);
      }
    },
    [clienteSeleccionadoId]
  );

  const handleConfigGuardado = useCallback(
    (items: VistaClienteConfigItem[]) => {
      // Actualiza la configuración en el dashboard local sin recargar todo
      setDashboard((prev) =>
        prev ? { ...prev, configuracionVista: items } : prev
      );
    },
    []
  );

  // Título del botón y modal según contexto
  const configBtnLabel = clienteSeleccionadoId
    ? "Configurar vista de esta empresa"
    : "Configurar vista general";

  // ── Columnas tabla obras (simplificadas) ──
  const columnasObras: ColumnsType<ClienteObraResumen> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "",
      key: "accion",
      align: "right",
      render: (_: unknown, row: ClienteObraResumen) => (
        <Button
          type="primary"
          size="small"
          icon={<FileSearchOutlined />}
          onClick={() => void abrirObra(row)}
        >
          Ver registros
        </Button>
      ),
    },
  ];

  // ── Columnas tabla registros ──
  const visibleRegistroColumns = useMemo<VisibleRegistroColumn[]>(() => {
    console.log("COLUMNAS DINAMICAS RENDER - columnasRegistro state", columnasRegistro);
    return columnasRegistro.reduce<VisibleRegistroColumn[]>((acc, columna) => {
        if (columna.visible === false) return acc;
        const key = getColumnaKey(columna);
        if (!key || COLUMNAS_FIJAS_KEYS.has(key.toLowerCase())) return acc;
        const title = getColumnaTitle(columna);
        acc.push({
          title,
          key,
          dataIndex: snakeToCamel(key),
          isFoto: isFotoColumn(key, title),
        });
        return acc;
      }, []);
  }, [columnasRegistro]);

  const estadoColumnConfig = useMemo(
    () => columnasFijasRegistro.find((columna) => getColumnaKey(columna).toLowerCase() === "estado"),
    [columnasFijasRegistro]
  );
  const estadoVisible = estadoColumnConfig?.visible !== false;
  const estadoTitle = estadoColumnConfig ? getColumnaTitle(estadoColumnConfig) : "Estado";

  const columnasRegistrosDinamicas: ColumnsType<ClienteRegistroValidado> = useMemo(() => {
    const configurables = visibleRegistroColumns.map((columna) => ({
      title: columna.title,
      key: columna.key,
      dataIndex: columna.dataIndex,
      width: columna.isFoto ? 110 : 150,
      render: (_value: unknown, record: ClienteRegistroValidado) =>
        renderRegistroValue(getRegistroValue(record, columna.key), record, columna.key, columna.title),
    }));

    return [
      ...configurables,
      ...(estadoVisible
        ? [
            {
              title: estadoTitle,
              key: "estado",
              width: 130,
              render: (_value: unknown, record: ClienteRegistroValidado) => {
                const estado = record.estado ?? (record.validadoCliente ? "Validado" : "No validado");
                return <Tag color={estado === "Validado" ? "green" : "default"}>{estado}</Tag>;
              },
            },
          ]
        : []),
      {
        title: "Acciones",
        key: "acciones",
        width: 150,
        render: (_value: unknown, record: ClienteRegistroValidado) => {
          if (record.acciones?.puedeValidar) {
            return (
              <Button
                size="small"
                type="primary"
                loading={validandoRegistroId === record.id}
                onClick={(event) => {
                  event.stopPropagation();
                  // Siempre abre el detalle primero (paso 1) — la firma solo se
                  // alcanza tras revisar el detalle y presionar "Validar con firma"
                  // dentro del modal único.
                  setDetalle(record);
                }}
              >
                Validar con firma
              </Button>
            );
          }

          if (record.validadoCliente && record.pdfFirmadoUrl) {
            return (
              <Button
                size="small"
                loading={abriendoPdfId === record.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void abrirPdfFirmado(record.id);
                }}
              >
                Ver PDF
              </Button>
            );
          }

          if (record.validadoCliente) {
            // Anomalía: quedó validado pero sin PDF (ej. registro validado
            // antes de existir esta funcionalidad) — nunca dejar la celda vacía.
            return (
              <Tag color="warning" title="Este registro fue validado pero no tiene un PDF firmado asociado.">
                Sin PDF firmado
              </Tag>
            );
          }

          return <Text type="secondary">-</Text>;
        },
      },
    ];
  }, [estadoTitle, estadoVisible, validandoRegistroId, abriendoPdfId, abrirPdfFirmado, visibleRegistroColumns]);

  const detalleVisibleFields = useMemo<RegistroDetalleVisibleField[]>(() => {
    if (!detalle) return [];

    const fields = visibleRegistroColumns
      .filter((columna) => !columna.isFoto)
      .map((columna) => ({
        key: columna.key,
        label: columna.title,
        value: renderRegistroValue(
          getRegistroValue(detalle, columna.key),
          detalle,
          columna.key,
          columna.title
        ),
      }));

    if (estadoVisible) {
      const estado = detalle.estado ?? (detalle.validadoCliente ? "Validado" : "No validado");
      fields.push({
        key: "estado",
        label: estadoTitle,
        value: <Tag color={estado === "Validado" ? "green" : "default"}>{estado}</Tag>,
      });
    }

    return fields;
  }, [detalle, estadoTitle, estadoVisible, visibleRegistroColumns]);

  const mostrarFotosDetalle = useMemo(
    () => visibleRegistroColumns.some((columna) => columna.isFoto),
    [visibleRegistroColumns]
  );

  const encabezado = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BuildOutlined style={{ fontSize: 20, color: "#d4a017" }} />
          <Title level={3} style={{ margin: 0 }}>
            {necesitaSelector ? "Vista Cliente" : "Registros de mi empresa"}
          </Title>
        </div>
        {necesitaSelector && (
          <Button
            icon={<SettingOutlined />}
            onClick={() => setConfigModalOpen(true)}
            disabled={!listoParaCargar && !(!clienteSeleccionadoId)}
          >
            {configBtnLabel}
          </Button>
        )}
      </div>

      {necesitaSelector && (
        <Card size="small" style={{ maxWidth: 640 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Selecciona un cliente / empresa para ver sus obras y registros validados.
            </Text>
            <Select
              showSearch
              allowClear
              loading={loadingClientes}
              placeholder={
                <span>
                  <BuildOutlined style={{ marginRight: 6 }} />
                  Seleccionar cliente / empresa
                </span>
              }
              style={{ width: "100%" }}
              value={clienteSeleccionadoId}
              onChange={(val: string | undefined) => setClienteSeleccionadoId(val)}
              filterOption={(input, opt) =>
                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={clientesBeck.map((c) => ({
                value: c.id,
                label: `${c.razonSocial}${c.nombreEmpresa ? ` / ${c.nombreEmpresa}` : ""} — ${c.rut}`,
              }))}
              optionRender={(opt) => {
                const c = clientesBeck.find((x) => x.id === opt.value);
                if (!c) return opt.label;
                return (
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {c.razonSocial}{c.nombreEmpresa ? ` / ${c.nombreEmpresa}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {c.rut}
                      {c.correo ? ` · ${c.correo}` : ""}
                      {` · ${c.cantidadObrasAsociadas} obra${c.cantidadObrasAsociadas !== 1 ? "s" : ""}`}
                      {!c.activo && <Tag color="default" style={{ marginLeft: 6 }}>Inactivo</Tag>}
                    </div>
                  </div>
                );
              }}
            />
          </Space>
        </Card>
      )}
    </div>
  );

  // ── Vista: detalle de obra con registros ──
  const registrosBody = obraSeleccionada ? (
      <div className="w-full min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={volver}>
            Volver a obras
          </Button>
          <div>
            <Text strong style={{ fontSize: 15 }}>{obraSeleccionada.nombre}</Text>
            {obraSeleccionada.codigo && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                Código: {obraSeleccionada.codigo}
              </Text>
            )}
          </div>
        </div>

        <Card size="small">
          <Space wrap>
            <Input
              placeholder="Buscar..."
              prefix={<SearchOutlined />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              placeholder="Tipo de registro"
              value={filtroTipo}
              onChange={setFiltroTipo}
              allowClear
              style={{ width: 200 }}
              options={tiposUnicos.map((t) => ({ value: t, label: getTipoRegistroLabel(t) }))}
            />
            <Select
              placeholder="Piso"
              value={filtroPiso}
              onChange={setFiltroPiso}
              allowClear
              style={{ width: 140 }}
              options={pisosUnicos.map((p) => ({ value: p, label: p }))}
            />
            <RangePicker
              value={filtroFechas}
              onChange={(v) => setFiltroFechas(v as [Dayjs, Dayjs] | null)}
              format="DD/MM/YYYY"
              placeholder={["Desde", "Hasta"]}
            />
          </Space>
        </Card>

        {selectedRowKeys.length > 0 && (
          <Card size="small">
            <Space wrap align="center">
              <Text strong>{selectedRowKeys.length} registro(s) seleccionado(s)</Text>
              {registrosPendientesSeleccionados.length > 0 && (
                <Button type="primary" onClick={() => setFirmaMasivaOpen(true)}>
                  Firmar seleccionados ({registrosPendientesSeleccionados.length})
                </Button>
              )}
              <Button loading={abriendoPdfConsolidado} onClick={() => void handleVerPdfConsolidado()}>
                Ver PDF ({selectedRowKeys.length})
              </Button>
              <Button onClick={() => setSelectedRowKeys([])}>Limpiar selección</Button>
            </Space>
          </Card>
        )}

        <Table
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            renderCell: (_checked, _record, _index, originNode) => (
              <div onClick={(e) => e.stopPropagation()}>{originNode}</div>
            ),
          }}
          columns={columnasRegistrosDinamicas}
          dataSource={registrosFiltrados}
          loading={loadingRegistros}
          size="small"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => setDetalle(record),
            style: { cursor: "pointer" },
          })}
          locale={{ emptyText: <Empty description="Sin registros validados" /> }}
        />

        <RegistroDetalleFirmaModal
          open={detalle !== null}
          registro={detalle}
          visibleFields={detalleVisibleFields}
          showFotos={mostrarFotosDetalle}
          validando={detalle ? validandoRegistroId === detalle.id : false}
          onClose={() => setDetalle(null)}
          onConfirmarFirma={confirmarValidacionConFirma}
        />

        <RegistroFirmaMasivaModal
          open={firmaMasivaOpen}
          registros={registrosPendientesSeleccionados}
          registrosOmitidos={registrosYaFirmadosSeleccionados}
          procesando={procesandoFirmaMasiva}
          onClose={() => setFirmaMasivaOpen(false)}
          onConfirmarFirma={confirmarFirmaMasiva}
        />

        {necesitaSelector && (
          <ConfigVistaModal
            open={configModalOpen}
            titulo={configBtnLabel}
            onClose={() => setConfigModalOpen(false)}
            onGuardado={handleConfigGuardado}
            fetchConfig={fetchConfig}
            saveConfig={saveConfig}
          />
        )}
      </div>
  ) : (
    <div className="w-full min-w-0 space-y-6">
      {/* Admin/interno sin cliente seleccionado */}
      {necesitaSelector && !clienteSeleccionadoId && (
        <Card>
          <Empty
            image={<BuildOutlined style={{ fontSize: 48, color: "#d4a017" }} />}
            description={
              <Text type="secondary">
                Selecciona una empresa para ver sus obras y registros validados.
              </Text>
            }
          />
        </Card>
      )}

      {errorDatos && listoParaCargar && (
        <Alert type="error" message={errorDatos} showIcon closable onClose={() => setErrorDatos(null)} />
      )}

      {listoParaCargar && (
        <>
          {/* KPIs */}
          {loadingDash ? (
            <Row gutter={[16, 16]}>
              {[0, 1, 2, 3].map((i) => (
                <Col key={i} xs={24} sm={12} lg={6}>
                  <Card><Skeleton active paragraph={false} /></Card>
                </Col>
              ))}
            </Row>
          ) : kpisEfectivos ? (
            <Row gutter={[16, 16]}>
              {isVisible(cfg, "total_obras") && (
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title={getTitle(cfg, "total_obras", "Total obras")}
                      value={kpisEfectivos.totalObras}
                      prefix={<BuildOutlined />}
                      valueStyle={{ color: "#5b8dd9" }}
                    />
                  </Card>
                </Col>
              )}
              {isVisible(cfg, "registros_validados") && (
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title={getTitle(cfg, "registros_validados", "Registros validados")}
                      value={kpisEfectivos.totalRegistros}
                      prefix={<FileSearchOutlined />}
                      valueStyle={{ color: "#d4a017" }}
                    />
                  </Card>
                </Col>
              )}
              {isVisible(cfg, "cantidad_final_total") && (
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title={getTitle(cfg, "cantidad_final_total", "Cantidad final total")}
                      value={kpisEfectivos.cantidadFinalTotal}
                      valueStyle={{ color: "#6abf69" }}
                    />
                  </Card>
                </Col>
              )}
              {isVisible(cfg, "registros_mes") && (
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title={getTitle(cfg, "registros_mes", "Registros este mes")}
                      value={kpisEfectivos.registrosEsteMes}
                      prefix={<CalendarOutlined />}
                      valueStyle={{ color: "#e07b54" }}
                    />
                  </Card>
                </Col>
              )}
            </Row>
          ) : null}

          {/* Gráficos */}
          {kpisEfectivos && (
            <Row gutter={[16, 16]}>
              {isVisible(cfg, "registros_por_obra") && (
                <Col xs={24} lg={12}>
                  <Card title={getTitle(cfg, "registros_por_obra", "Registros por obra")} size="small">
                    {kpisEfectivos.registrosPorObra.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={kpisEfectivos.registrosPorObra} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" name="Registros" fill="#5b8dd9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty description="Sin datos" style={{ padding: "20px 0" }} />
                    )}
                  </Card>
                </Col>
              )}

              {isVisible(cfg, "registros_por_tipo") && (
                <Col xs={24} lg={12}>
                  <Card title={getTitle(cfg, "registros_por_tipo", "Registros por tipo")} size="small">
                    {kpisEfectivos.registrosPorTipo.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={kpisEfectivos.registrosPorTipo}
                            dataKey="total"
                            nameKey="tipo"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) =>
                              `${String(name)} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {kpisEfectivos.registrosPorTipo.map((_entry, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => [v ?? 0, "Registros"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty description="Sin datos" style={{ padding: "20px 0" }} />
                    )}
                  </Card>
                </Col>
              )}

              {isVisible(cfg, "registros_por_piso") && (
                <Col xs={24} lg={12}>
                  <Card title={getTitle(cfg, "registros_por_piso", "Registros por piso")} size="small">
                    {kpisEfectivos.registrosPorPiso.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={kpisEfectivos.registrosPorPiso} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="piso" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" name="Registros" fill="#e07b54" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty description="Sin datos" style={{ padding: "20px 0" }} />
                    )}
                  </Card>
                </Col>
              )}

              {isVisible(cfg, "registros_por_fecha") && (
                <Col xs={24} lg={12}>
                  <Card title={getTitle(cfg, "registros_por_fecha", "Registros por fecha")} size="small">
                    {kpisEfectivos.registrosPorFecha.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={kpisEfectivos.registrosPorFecha} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="fecha" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" name="Registros" fill="#6abf69" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty description="Sin datos" style={{ padding: "20px 0" }} />
                    )}
                  </Card>
                </Col>
              )}
            </Row>
          )}

          {/* Lista de obras */}
          {kpisEfectivos && isVisible(cfg, "obras") && (
            <Card title={getTitle(cfg, "obras", "Obras")} size="small">
              <Table
                rowKey="id"
                columns={columnasObras}
                dataSource={obras}
                loading={loadingObras}
                size="small"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                locale={{ emptyText: <Empty description="Sin obras asignadas" /> }}
              />
            </Card>
          )}
        </>
      )}

      {necesitaSelector && (
        <ConfigVistaModal
          open={configModalOpen}
          titulo={configBtnLabel}
          onClose={() => setConfigModalOpen(false)}
          onGuardado={handleConfigGuardado}
          fetchConfig={fetchConfig}
          saveConfig={saveConfig}
        />
      )}
    </div>
  );

  if (!necesitaSelector) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {encabezado}
        {registrosBody}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {encabezado}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "registros" | "itemizado")}
        items={[
          { key: "registros", label: "Registros", children: registrosBody },
          {
            key: "itemizado",
            label: "Itemizado de la obra",
            children: (
              <ItemizadoPreviewPanel
                clienteSeleccionadoId={clienteSeleccionadoId}
                obras={obras}
                loadingObras={loadingObras}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default RegistrosMiEmpresa;
