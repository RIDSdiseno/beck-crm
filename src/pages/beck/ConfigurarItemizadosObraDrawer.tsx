import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  Alert,
  Button,
  Collapse,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, SaveOutlined, SearchOutlined, UndoOutlined } from "@ant-design/icons";
import {
  obrasAPI,
  itemizadoOpcionesAPI,
  factoresHolguraAPI,
  factoresAccesibilidadAPI,
  factoresAislacionAPI,
  type ItemizadoOpcionConfigItem,
  type FactorHolguraTipoConfig,
  type TramoHolgura,
  type FactorAccesibilidadConfig,
  type FactorAislacionConfig,
  type MonedaItemizado,
} from "../../services/api";
import { TIPOS_ESTADO_AVANCE, TIPOS_REGISTRO_TERRENO } from "../../constants/roles";

type Props = {
  open: boolean;
  onClose: () => void;
  obraId?: string;
  obraNombre?: string;
};

type ConfigRow = ItemizadoOpcionConfigItem & {
  _orden: number | null;
  _nombrePersonalizado: string;
  _codigoPersonalizado: string;
  _rendimientoSellos: number | null;
  _rendimientoReparacion: number | null;
  _precioUnitario: number | null;
  _moneda: MonedaItemizado | null;
  // Contrato total por tipo de registro (cantidad contratada), para el estado de avance.
  _contratos: Record<string, number | null>;
};

type RendimientoDirtyMap = Record<
  string,
  { sellos?: boolean; reparacion?: boolean; precio?: boolean; moneda?: boolean; contratos?: boolean }
>;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const apiError = data as { error?: unknown; message?: unknown };
      if (typeof apiError.error === "string" && apiError.error.trim())
        return apiError.error;
      if (typeof apiError.message === "string" && apiError.message.trim())
        return apiError.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

// Código con que la obra ve el ítem: el propio si lo tiene, si no el del catálogo.
const codigoEnObra = (row: ConfigRow): string =>
  row._codigoPersonalizado.trim() || row.itemizadoOpcion?.codigoBeck?.trim() || "";

const describirFila = (row: ConfigRow): string =>
  [row.itemizadoOpcion?.codigoBeck, row.itemizadoOpcion?.elementoPasante]
    .filter(Boolean)
    .join(" · ");

type TramoRow = { holguraMax: number | null; factor: number | null };

const tramosToRows = (tramos: TramoHolgura[]): TramoRow[] =>
  tramos.map((t) => ({ holguraMax: t.holguraMax, factor: t.factor }));

const ConfigurarItemizadosObraDrawer: React.FC<Props> = ({
  open,
  onClose,
  obraId,
  obraNombre,
}) => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirtyRendimientos, setDirtyRendimientos] = useState<RendimientoDirtyMap>({});
  const [monedaInvalidaIds, setMonedaInvalidaIds] = useState<Set<string>>(new Set());
  const [tiposObra, setTiposObra] = useState<string[]>([]);

  // Columnas de contrato: los tipos habilitados en la obra y los que ya tienen contrato.
  const tiposContrato = useMemo(() => {
    const conContrato = new Set(
      rows.flatMap((r) => Object.keys(r._contratos).filter((t) => r._contratos[t] !== null))
    );
    const visibles = TIPOS_ESTADO_AVANCE.filter(
      (t) => tiposObra.includes(t.value) || conContrato.has(t.value)
    );
    return visibles.length > 0 ? visibles : TIPOS_ESTADO_AVANCE.slice(0, 1);
  }, [rows, tiposObra]);

  // Todas las filas son ítems visibles de la obra: dos con el mismo código serían ambiguos
  // al registrar. Se permite guardar (al renumerar se va de a uno), pero se marcan en rojo.
  const filasPorCodigoRepetido = useMemo(() => {
    const porCodigo = new Map<string, ConfigRow[]>();
    for (const row of rows) {
      const codigo = codigoEnObra(row);
      if (!codigo) continue;
      const clave = codigo.toUpperCase();
      porCodigo.set(clave, [...(porCodigo.get(clave) ?? []), row]);
    }
    return new Map([...porCodigo].filter(([, filas]) => filas.length > 1));
  }, [rows]);

  // Filtros de la tabla: solo cambian lo que se ve; al guardar se envían todas las filas.
  const [busqueda, setBusqueda] = useState("");
  const [filtroPenetra, setFiltroPenetra] = useState("");
  const [filtroMaterialidad, setFiltroMaterialidad] = useState("");

  const opcionesFiltro = useMemo(() => {
    const unicos = (valores: (string | null | undefined)[]) =>
      [...new Set(valores.filter((v): v is string => Boolean(v?.trim())))]
        .sort((a, b) => a.localeCompare(b, "es"))
        .map((v) => ({ label: v, value: v }));
    return {
      elementoPenetra: unicos(rows.map((r) => r.itemizadoOpcion?.elementoPenetra)),
      materialidad: unicos(rows.map((r) => r.itemizadoOpcion?.materialidad)),
    };
  }, [rows]);

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return rows.filter((row) => {
      if (filtroPenetra && row.itemizadoOpcion?.elementoPenetra !== filtroPenetra) return false;
      if (filtroMaterialidad && row.itemizadoOpcion?.materialidad !== filtroMaterialidad) return false;
      if (!texto) return true;
      return [
        row.itemizadoOpcion?.codigoBeck,
        row._codigoPersonalizado,
        row.itemizadoOpcion?.elementoPasante,
        row.itemizadoOpcion?.elementoPenetra,
        row.itemizadoOpcion?.materialidad,
        row._nombrePersonalizado,
      ].some((v) => v?.toLowerCase().includes(texto));
    });
  }, [rows, busqueda, filtroPenetra, filtroMaterialidad]);

  const hayFiltros = Boolean(busqueda.trim() || filtroPenetra || filtroMaterialidad);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroPenetra("");
    setFiltroMaterialidad("");
  };

  const limpiarMonedaInvalida = (id: string) => {
    setMonedaInvalidaIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const [factores, setFactores] = useState<FactorHolguraTipoConfig[]>([]);
  const [tipoActivo, setTipoActivo] = useState<string>(TIPOS_REGISTRO_TERRENO[0].value);
  const [tramosPorTipo, setTramosPorTipo] = useState<Record<string, TramoRow[]>>({});
  const [loadingFactores, setLoadingFactores] = useState(false);
  const [savingFactores, setSavingFactores] = useState(false);
  const [errorFactores, setErrorFactores] = useState<string | null>(null);

  const [accesibilidad, setAccesibilidad] = useState<FactorAccesibilidadConfig[]>([]);
  const [factorAccesibilidadEditado, setFactorAccesibilidadEditado] = useState<
    Record<number, number | null>
  >({});
  const [loadingAccesibilidad, setLoadingAccesibilidad] = useState(false);
  const [savingAccesibilidadNivel, setSavingAccesibilidadNivel] = useState<number | null>(null);
  const [errorAccesibilidad, setErrorAccesibilidad] = useState<string | null>(null);

  const [aislacion, setAislacion] = useState<FactorAislacionConfig[]>([]);
  const [factorAislacionEditado, setFactorAislacionEditado] = useState<
    Record<string, number | null>
  >({});
  const [loadingAislacion, setLoadingAislacion] = useState(false);
  const [savingAislacionEstado, setSavingAislacionEstado] = useState<string | null>(null);
  const [errorAislacion, setErrorAislacion] = useState<string | null>(null);

  const cargarAccesibilidad = async () => {
    if (!obraId) return;
    setLoadingAccesibilidad(true);
    setErrorAccesibilidad(null);
    try {
      const data = await factoresAccesibilidadAPI.listarPorObra(obraId);
      setAccesibilidad(data);
      setFactorAccesibilidadEditado(
        Object.fromEntries(data.map((cfg) => [cfg.nivel, cfg.factor]))
      );
    } catch (err) {
      setErrorAccesibilidad(
        getErrorMessage(err, "No se pudieron cargar los factores de accesibilidad")
      );
    } finally {
      setLoadingAccesibilidad(false);
    }
  };

  const cargarAislacion = async () => {
    if (!obraId) return;
    setLoadingAislacion(true);
    setErrorAislacion(null);
    try {
      const data = await factoresAislacionAPI.listarPorObra(obraId);
      setAislacion(data);
      setFactorAislacionEditado(
        Object.fromEntries(data.map((cfg) => [String(cfg.aplica), cfg.factor]))
      );
    } catch (err) {
      setErrorAislacion(
        getErrorMessage(err, "No se pudieron cargar los factores de aislación")
      );
    } finally {
      setLoadingAislacion(false);
    }
  };

  const cargarFactores = async () => {
    if (!obraId) return;
    setLoadingFactores(true);
    setErrorFactores(null);
    try {
      const data = await factoresHolguraAPI.listarPorObra(obraId);
      setFactores(data);
      setTramosPorTipo(
        Object.fromEntries(data.map((cfg) => [cfg.tipoRegistro, tramosToRows(cfg.tramos)]))
      );
    } catch (err) {
      setErrorFactores(getErrorMessage(err, "No se pudieron cargar los factores por holgura"));
    } finally {
      setLoadingFactores(false);
    }
  };

  const cargar = async () => {
    if (!obraId) return;
    setLoading(true);
    setError(null);
    setDirtyRendimientos({});
    setMonedaInvalidaIds(new Set());
    try {
      const items = await itemizadoOpcionesAPI.obtenerConfiguracionObra(obraId);
      setRows(
        items.map((item) => ({
          ...item,
          _orden: item.orden ?? null,
          _nombrePersonalizado: item.nombrePersonalizado ?? "",
          _codigoPersonalizado: item.codigoPersonalizado ?? "",
          _rendimientoSellos: item.itemizadoOpcion?.rendimientoSellosEsperadoDiario ?? null,
          _rendimientoReparacion: item.itemizadoOpcion?.rendimientoReparacionEsperadoDiario ?? null,
          _precioUnitario:
            item.precioUnitario !== null && item.precioUnitario !== undefined
              ? Number(item.precioUnitario)
              : null,
          _moneda: item.moneda ?? null,
          _contratos: { ...(item.contratos ?? {}) },
        }))
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudo cargar la configuración de itemizados")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && obraId) {
      limpiarFiltros();
      void cargar();
      obrasAPI
        .getTiposRegistro(obraId)
        .then(setTiposObra)
        .catch(() => setTiposObra([]));
      void cargarFactores();
      void cargarAccesibilidad();
      void cargarAislacion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, obraId]);

  const updateTramo = (tipo: string, index: number, patch: Partial<TramoRow>) => {
    setTramosPorTipo((prev) => ({
      ...prev,
      [tipo]: (prev[tipo] ?? []).map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  };

  const agregarTramo = (tipo: string) => {
    setTramosPorTipo((prev) => ({
      ...prev,
      [tipo]: [...(prev[tipo] ?? []), { holguraMax: null, factor: null }],
    }));
  };

  const quitarTramo = (tipo: string, index: number) => {
    setTramosPorTipo((prev) => ({
      ...prev,
      [tipo]: (prev[tipo] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleGuardarTramos = async (tipo: string) => {
    if (!obraId) return;
    const filas = tramosPorTipo[tipo] ?? [];
    const invalidas = filas.some(
      (t) => t.holguraMax === null || t.holguraMax <= 0 || t.factor === null || t.factor <= 0
    );
    if (filas.length === 0 || invalidas) {
      void message.error("Complete holgura máxima y factor (> 0) en todos los tramos");
      return;
    }

    setSavingFactores(true);
    try {
      await factoresHolguraAPI.guardarTramos(
        obraId,
        tipo,
        filas as TramoHolgura[]
      );
      void message.success("Tramos guardados correctamente");
      await cargarFactores();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudieron guardar los tramos"));
    } finally {
      setSavingFactores(false);
    }
  };

  const handleRestaurarTramos = async (tipo: string) => {
    if (!obraId) return;
    setSavingFactores(true);
    try {
      await factoresHolguraAPI.restaurarPorDefecto(obraId, tipo);
      void message.success("Tramos restaurados a los valores por defecto");
      await cargarFactores();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudieron restaurar los tramos"));
    } finally {
      setSavingFactores(false);
    }
  };

  const updateFactorAccesibilidad = (nivel: number, value: number | null) => {
    setFactorAccesibilidadEditado((prev) => ({ ...prev, [nivel]: value }));
  };

  const handleGuardarFactorAccesibilidad = async (nivel: number) => {
    if (!obraId) return;
    const valor = factorAccesibilidadEditado[nivel];
    if (valor === null || valor === undefined || valor <= 0) {
      void message.error("Ingrese un factor mayor a 0");
      return;
    }

    setSavingAccesibilidadNivel(nivel);
    try {
      await factoresAccesibilidadAPI.guardarFactor(obraId, nivel, valor);
      void message.success("Factor guardado correctamente");
      await cargarAccesibilidad();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo guardar el factor"));
    } finally {
      setSavingAccesibilidadNivel(null);
    }
  };

  const handleRestaurarFactorAccesibilidad = async (nivel: number) => {
    if (!obraId) return;
    setSavingAccesibilidadNivel(nivel);
    try {
      await factoresAccesibilidadAPI.restaurarPorDefecto(obraId, nivel);
      void message.success("Factor restaurado al valor por defecto");
      await cargarAccesibilidad();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo restaurar el factor"));
    } finally {
      setSavingAccesibilidadNivel(null);
    }
  };

  const updateFactorAislacion = (aplica: boolean, value: number | null) => {
    setFactorAislacionEditado((prev) => ({ ...prev, [String(aplica)]: value }));
  };

  const handleGuardarFactorAislacion = async (aplica: boolean) => {
    if (!obraId) return;
    const valor = factorAislacionEditado[String(aplica)];
    if (valor === null || valor === undefined || valor <= 0) {
      void message.error("Ingrese un factor mayor a 0");
      return;
    }

    setSavingAislacionEstado(String(aplica));
    try {
      await factoresAislacionAPI.guardarFactor(obraId, aplica, valor);
      void message.success("Factor guardado correctamente");
      await cargarAislacion();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo guardar el factor"));
    } finally {
      setSavingAislacionEstado(null);
    }
  };

  const handleRestaurarFactorAislacion = async (aplica: boolean) => {
    if (!obraId) return;
    setSavingAislacionEstado(String(aplica));
    try {
      await factoresAislacionAPI.restaurarPorDefecto(obraId, aplica);
      void message.success("Factor restaurado al valor por defecto");
      await cargarAislacion();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudo restaurar el factor"));
    } finally {
      setSavingAislacionEstado(null);
    }
  };

  const updateOrden = (id: string, value: number | null) => {
    setRows((prev) =>
      prev.map((row) =>
        row.itemizadoOpcionId === id ? { ...row, _orden: value } : row
      )
    );
  };

  const updateNombre = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.itemizadoOpcionId === id
          ? { ...row, _nombrePersonalizado: value }
          : row
      )
    );
  };

  const updateCodigo = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.itemizadoOpcionId === id
          ? { ...row, _codigoPersonalizado: value }
          : row
      )
    );
  };

  const updateRendimientoSellos = (id: string, value: number | null) => {
    setRows((prev) =>
      prev.map((row) =>
        row.itemizadoOpcionId === id ? { ...row, _rendimientoSellos: value } : row
      )
    );
    setDirtyRendimientos((prev) => ({
      ...prev,
      [id]: { ...prev[id], sellos: true },
    }));
  };

  const updateRendimientoReparacion = (id: string, value: number | null) => {
    setRows((prev) =>
      prev.map((row) =>
        row.itemizadoOpcionId === id ? { ...row, _rendimientoReparacion: value } : row
      )
    );
    setDirtyRendimientos((prev) => ({
      ...prev,
      [id]: { ...prev[id], reparacion: true },
    }));
  };

  const updatePrecioUnitario = (id: string, value: number | null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.itemizadoOpcionId !== id) return row;
        return value === null
          ? { ...row, _precioUnitario: null, _moneda: null }
          : { ...row, _precioUnitario: value };
      })
    );
    setDirtyRendimientos((prev) => ({
      ...prev,
      [id]:
        value === null
          ? { ...prev[id], precio: true, moneda: true }
          : { ...prev[id], precio: true },
    }));
    limpiarMonedaInvalida(id);
  };

  const updateContrato = (id: string, tipo: string, value: number | null) => {
    setRows((prev) =>
      prev.map((row) =>
        row.itemizadoOpcionId === id
          ? { ...row, _contratos: { ...row._contratos, [tipo]: value } }
          : row
      )
    );
    setDirtyRendimientos((prev) => ({
      ...prev,
      [id]: { ...prev[id], contratos: true },
    }));
  };

  const updateMoneda = (id: string, value: MonedaItemizado | null) => {
    setRows((prev) =>
      prev.map((row) => (row.itemizadoOpcionId === id ? { ...row, _moneda: value } : row))
    );
    setDirtyRendimientos((prev) => ({
      ...prev,
      [id]: { ...prev[id], moneda: true },
    }));
    limpiarMonedaInvalida(id);
  };

  const handleGuardar = async () => {
    if (!obraId) return;

    const filasInvalidas = rows.filter((row) => {
      const dirty = dirtyRendimientos[row.itemizadoOpcionId];
      if (!dirty?.precio && !dirty?.moneda) return false;
      return row._precioUnitario !== null && row._moneda === null;
    });

    if (filasInvalidas.length > 0) {
      setMonedaInvalidaIds(new Set(filasInvalidas.map((r) => r.itemizadoOpcionId)));
      void message.error("Debes seleccionar la moneda del precio unitario.");
      return;
    }
    setMonedaInvalidaIds(new Set());

    setSaving(true);
    try {
      const { advertencia } = await itemizadoOpcionesAPI.guardarConfiguracionObra(obraId, {
        items: rows.map((row) => {
          const dirty = dirtyRendimientos[row.itemizadoOpcionId];

          const item: {
            itemizadoOpcionId: string;
            orden: number | null;
            nombrePersonalizado: string | null;
            codigoPersonalizado: string | null;
            rendimientoSellosEsperadoDiario?: number | null;
            rendimientoReparacionEsperadoDiario?: number | null;
            precioUnitario?: number | null;
            moneda?: MonedaItemizado | null;
            contratos?: Record<string, number | null>;
          } = {
            itemizadoOpcionId: row.itemizadoOpcionId,
            orden: row._orden,
            nombrePersonalizado: row._nombrePersonalizado.trim() || null,
            codigoPersonalizado: row._codigoPersonalizado.trim() || null,
          };

          if (dirty?.sellos) {
            item.rendimientoSellosEsperadoDiario = row._rendimientoSellos;
          }
          if (dirty?.reparacion) {
            item.rendimientoReparacionEsperadoDiario = row._rendimientoReparacion;
          }
          if (dirty?.precio) {
            item.precioUnitario = row._precioUnitario;
          }
          if (dirty?.moneda) {
            item.moneda = row._moneda;
          }
          if (dirty?.contratos) {
            item.contratos = Object.fromEntries(
              Object.entries(row._contratos).map(([tipo, cantidad]) => [tipo, cantidad ?? null])
            );
          }

          return item;
        }),
      });
      if (advertencia) {
        void message.warning(
          "Configuración guardada, pero quedan códigos repetidos en la obra. Corrígelos antes de que se registre en terreno."
        );
      } else {
        void message.success("Configuración guardada correctamente");
      }
      await cargar();
    } catch (err) {
      void message.error(
        getErrorMessage(err, "No se pudo guardar la configuración")
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<ConfigRow> = [
    {
      title: "Código BECK",
      key: "codigoBeck",
      width: 110,
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.codigoBeck;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Código en esta obra",
      key: "codigoPersonalizado",
      width: 150,
      render: (_: unknown, record: ConfigRow) => {
        const otras = (filasPorCodigoRepetido.get(codigoEnObra(record).toUpperCase()) ?? []).filter(
          (row) => row.itemizadoOpcionId !== record.itemizadoOpcionId
        );
        return (
          <>
            <Input
              size="small"
              maxLength={100}
              status={otras.length > 0 ? "error" : undefined}
              value={record._codigoPersonalizado}
              placeholder={record.itemizadoOpcion?.codigoBeck || "Código BECK"}
              title="Solo para obras con un itemizado antiguo. Vacío = usa el código BECK."
              onChange={(e) =>
                updateCodigo(record.itemizadoOpcionId, e.target.value)
              }
            />
            {otras.length > 0 && (
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                También lo usa: {otras.map(describirFila).join("; ")}
              </Typography.Text>
            )}
          </>
        );
      },
    },
    {
      title: "Itemizado BECK",
      key: "elementoPasante",
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.elementoPasante;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Elemento atravesado",
      key: "elementoPenetra",
      width: 140,
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.elementoPenetra;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Materialidad",
      key: "materialidad",
      width: 140,
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.materialidad;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Itemizado Mandante",
      key: "nombrePersonalizado",
      width: 240,
      render: (_: unknown, record: ConfigRow) => (
        <Input
          size="small"
          value={record._nombrePersonalizado}
          placeholder="Dejar vacío para usar el itemizado BECK"
          onChange={(e) =>
            updateNombre(record.itemizadoOpcionId, e.target.value)
          }
        />
      ),
    },
    {
      title: "Orden",
      key: "orden",
      width: 90,
      render: (_: unknown, record: ConfigRow) => (
        <InputNumber
          size="small"
          min={1}
          precision={0}
          value={record._orden}
          placeholder="—"
          style={{ width: 72 }}
          onChange={(val) => updateOrden(record.itemizadoOpcionId, val)}
        />
      ),
    },
    {
      title: "Rend. Sellos/día",
      key: "rendimientoSellosEsperadoDiario",
      width: 130,
      render: (_: unknown, record: ConfigRow) => (
        <InputNumber
          size="small"
          min={0}
          precision={0}
          value={record._rendimientoSellos}
          placeholder="—"
          style={{ width: 90 }}
          onChange={(val) => updateRendimientoSellos(record.itemizadoOpcionId, val)}
        />
      ),
    },
    {
      title: "Rend. Reparación/día",
      key: "rendimientoReparacionEsperadoDiario",
      width: 140,
      render: (_: unknown, record: ConfigRow) => (
        <InputNumber
          size="small"
          min={0}
          precision={0}
          value={record._rendimientoReparacion}
          placeholder="—"
          style={{ width: 90 }}
          onChange={(val) => updateRendimientoReparacion(record.itemizadoOpcionId, val)}
        />
      ),
    },
    {
      title: "PU",
      key: "precioUnitario",
      width: 130,
      render: (_: unknown, record: ConfigRow) => {
        const usaDecimales = record._moneda === "UF" || record._moneda === "USD";
        const precision = usaDecimales ? 2 : 0;
        const step = usaDecimales ? 0.01 : 1;
        return (
          <InputNumber
            size="small"
            min={0}
            precision={precision}
            step={step}
            value={record._precioUnitario}
            placeholder="—"
            style={{ width: 110 }}
            onChange={(val) => updatePrecioUnitario(record.itemizadoOpcionId, val)}
          />
        );
      },
    },
    {
      title: "Moneda",
      key: "moneda",
      width: 100,
      render: (_: unknown, record: ConfigRow) => {
        const invalida = monedaInvalidaIds.has(record.itemizadoOpcionId);
        return (
          <Select
            size="small"
            allowClear
            status={invalida ? "error" : undefined}
            value={record._moneda ?? undefined}
            placeholder={invalida ? "Requerida" : "—"}
            style={{ width: 90 }}
            onChange={(val) => updateMoneda(record.itemizadoOpcionId, (val as MonedaItemizado) ?? null)}
            options={[
              { label: "CLP", value: "CLP" },
              { label: "UF", value: "UF" },
              { label: "USD", value: "USD" },
            ]}
          />
        );
      },
    },
    {
      title: (
        <span title="Cantidad contratada de cada ítem por tipo. El estado de avance acumula lo ejecutado y lo descuenta de aquí.">
          Contrato total (cantidad)
        </span>
      ),
      key: "contratos",
      children: tiposContrato.map((tipo) => ({
        title: tipo.label,
        key: `contrato-${tipo.value}`,
        width: 105,
        render: (_: unknown, record: ConfigRow) => (
          <InputNumber
            size="small"
            min={0}
            step={1}
            precision={2}
            value={record._contratos[tipo.value] ?? null}
            placeholder="—"
            style={{ width: 90 }}
            onChange={(v) => updateContrato(record.itemizadoOpcionId, tipo.value, v ?? null)}
          />
        ),
      })),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1200px, 98vw)"
      title={
        obraNombre
          ? `Configurar itemizados — ${obraNombre}`
          : "Configurar itemizados"
      }
      extra={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void cargar();
              void cargarFactores();
              void cargarAccesibilidad();
              void cargarAislacion();
            }}
            disabled={loading || saving}
          >
            Recargar
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={loading || rows.length === 0}
            onClick={() => void handleGuardar()}
          >
            Guardar configuración
          </Button>
          <Button onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
        </Space>
      }
    >
      <div className="space-y-4">
        <div>
          <Typography.Text type="secondary" className="text-xs">
            Obra
          </Typography.Text>
          <Typography.Title level={4} className="!mb-0 !mt-1">
            {obraNombre || "-"}
          </Typography.Title>
          <Typography.Text type="secondary" className="mt-1 block text-xs">
            Configura el Itemizado Mandante, el orden y los rendimientos de los
            itemizados visibles para esta obra (confirmados por el cliente o
            activados manualmente desde Opciones de itemizado).
          </Typography.Text>
        </div>

        <Collapse
          className="border border-slate-200"
          items={[
            {
              key: "factores-holgura",
              label: "Factores por holgura",
              children: (
                <>
                  <Typography.Text type="secondary" className="mb-3 block text-xs">
                    Define, por tipo de registro, los tramos "holgura menor o igual a X → factor Y"
                    que se usan al calcular la cantidad de sellos con factores en esta obra. Si un
                    tipo no tiene tramos propios, se usan los valores por defecto del sistema.
                  </Typography.Text>

                  {errorFactores && (
                    <Alert
                      type="error"
                      showIcon
                      message="No se pudieron cargar los factores por holgura"
                      description={errorFactores}
                      className="mb-3"
                    />
                  )}

                  {loadingFactores ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : (
                    <Tabs
              activeKey={tipoActivo}
              onChange={setTipoActivo}
              size="small"
              items={TIPOS_REGISTRO_TERRENO.map((tipo) => {
                const cfg = factores.find((f) => f.tipoRegistro === tipo.value);
                const filas = tramosPorTipo[tipo.value] ?? [];
                return {
                  key: tipo.value,
                  label: tipo.label,
                  children: (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Tag color={cfg?.personalizado ? "blue" : "default"}>
                          {cfg?.personalizado ? "Personalizado para esta obra" : "Valor por defecto del sistema"}
                        </Tag>
                        <Space size="small">
                          <Button
                            size="small"
                            icon={<UndoOutlined />}
                            disabled={!cfg?.personalizado || savingFactores}
                            onClick={() => void handleRestaurarTramos(tipo.value)}
                          >
                            Restaurar por defecto
                          </Button>
                          <Button
                            size="small"
                            onClick={() => agregarTramo(tipo.value)}
                            disabled={savingFactores}
                          >
                            Agregar tramo
                          </Button>
                          <Button
                            size="small"
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={savingFactores}
                            onClick={() => void handleGuardarTramos(tipo.value)}
                          >
                            Guardar configuración de holguras
                          </Button>
                        </Space>
                      </div>

                      <div className="space-y-2">
                        {filas.length === 0 ? (
                          <Typography.Text type="secondary" className="text-xs">
                            Sin tramos. Agregue al menos uno.
                          </Typography.Text>
                        ) : (
                          filas.map((fila, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2">
                              <Typography.Text className="w-16 shrink-0 text-xs text-slate-500">
                                Holgura ≤
                              </Typography.Text>
                              <InputNumber
                                size="small"
                                min={0.01}
                                step={0.1}
                                value={fila.holguraMax}
                                placeholder="cm"
                                onChange={(v) => updateTramo(tipo.value, idx, { holguraMax: v })}
                                style={{ width: 100 }}
                              />
                              <Typography.Text className="text-xs text-slate-500">cm → factor</Typography.Text>
                              <InputNumber
                                size="small"
                                min={0.01}
                                step={0.1}
                                value={fila.factor}
                                placeholder="factor"
                                onChange={(v) => updateTramo(tipo.value, idx, { factor: v })}
                                style={{ width: 100 }}
                              />
                              <Button
                                size="small"
                                danger
                                onClick={() => quitarTramo(tipo.value, idx)}
                                disabled={savingFactores}
                              >
                                Quitar
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ),
                };
              })}
            />
                  )}
                </>
              ),
            },
            {
              key: "factores-accesibilidad",
              label: "Accesibilidad / Cielo modular",
              children: (
                <>
                  <Typography.Text type="secondary" className="mb-3 block text-xs">
                    Define el factor que se aplica según el nivel de accesibilidad (cielo modular)
                    de cada registro al calcular la cantidad de sellos con factores en esta obra.
                    Si un nivel no tiene factor propio, se usa el valor por defecto del sistema.
                  </Typography.Text>

                  {errorAccesibilidad && (
                    <Alert
                      type="error"
                      showIcon
                      message="No se pudieron cargar los factores de accesibilidad"
                      description={errorAccesibilidad}
                      className="mb-3"
                    />
                  )}

                  {loadingAccesibilidad ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : (
                    <div className="space-y-2">
                      {accesibilidad.map((cfg) => (
                        <div
                          key={cfg.nivel}
                          className="flex flex-col gap-2 rounded border border-slate-200 p-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex flex-col gap-1">
                            <Typography.Text className="text-sm">{cfg.label}</Typography.Text>
                            <Tag color={cfg.personalizado ? "blue" : "default"} className="w-fit">
                              {cfg.personalizado ? "Personalizado para esta obra" : "Valor por defecto del sistema"}
                            </Tag>
                          </div>
                          <Space size="small" wrap>
                            <Typography.Text className="text-xs text-slate-500">Factor</Typography.Text>
                            <InputNumber
                              size="small"
                              min={0.01}
                              step={0.1}
                              value={factorAccesibilidadEditado[cfg.nivel] ?? cfg.factor}
                              onChange={(v) => updateFactorAccesibilidad(cfg.nivel, v)}
                              style={{ width: 100 }}
                            />
                            <Button
                              size="small"
                              icon={<UndoOutlined />}
                              disabled={!cfg.personalizado || savingAccesibilidadNivel === cfg.nivel}
                              onClick={() => void handleRestaurarFactorAccesibilidad(cfg.nivel)}
                            >
                              Restaurar por defecto
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              icon={<SaveOutlined />}
                              loading={savingAccesibilidadNivel === cfg.nivel}
                              onClick={() => void handleGuardarFactorAccesibilidad(cfg.nivel)}
                            >
                              Guardar
                            </Button>
                          </Space>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ),
            },
            {
              key: "factores-aislacion",
              label: "Aislación",
              children: (
                <>
                  <Typography.Text type="secondary" className="mb-3 block text-xs">
                    Define el factor que se aplica cuando la Aislación aplica y cuando no aplica
                    al calcular la cantidad de sellos con aislación en esta obra. Si un estado no
                    tiene factor propio, se usa el valor por defecto del sistema.
                  </Typography.Text>

                  {errorAislacion && (
                    <Alert
                      type="error"
                      showIcon
                      message="No se pudieron cargar los factores de aislación"
                      description={errorAislacion}
                      className="mb-3"
                    />
                  )}

                  {loadingAislacion ? (
                    <Skeleton active paragraph={{ rows: 2 }} />
                  ) : (
                    <div className="space-y-2">
                      {aislacion.map((cfg) => (
                        <div
                          key={String(cfg.aplica)}
                          className="flex flex-col gap-2 rounded border border-slate-200 p-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex flex-col gap-1">
                            <Typography.Text className="text-sm">{cfg.label}</Typography.Text>
                            <Tag color={cfg.personalizado ? "blue" : "default"} className="w-fit">
                              {cfg.personalizado ? "Personalizado para esta obra" : "Valor por defecto del sistema"}
                            </Tag>
                          </div>
                          <Space size="small" wrap>
                            <Typography.Text className="text-xs text-slate-500">Factor</Typography.Text>
                            <InputNumber
                              size="small"
                              min={0.01}
                              step={0.1}
                              value={factorAislacionEditado[String(cfg.aplica)] ?? cfg.factor}
                              onChange={(v) => updateFactorAislacion(cfg.aplica, v)}
                              style={{ width: 100 }}
                            />
                            <Button
                              size="small"
                              icon={<UndoOutlined />}
                              disabled={!cfg.personalizado || savingAislacionEstado === String(cfg.aplica)}
                              onClick={() => void handleRestaurarFactorAislacion(cfg.aplica)}
                            >
                              Restaurar por defecto
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              icon={<SaveOutlined />}
                              loading={savingAislacionEstado === String(cfg.aplica)}
                              onClick={() => void handleGuardarFactorAislacion(cfg.aplica)}
                            >
                              Guardar
                            </Button>
                          </Space>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ),
            },
          ]}
        />

        {error && (
          <Alert
            type="error"
            showIcon
            message="No se pudo cargar la configuración"
            description={error}
          />
        )}

        {!loading && filasPorCodigoRepetido.size > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`Hay códigos repetidos en esta obra: ${[...filasPorCodigoRepetido.values()]
              .map((filas) => codigoEnObra(filas[0]))
              .join(", ")}`}
            description="Se puede guardar mientras renumeras, pero cada ítem visible debe terminar con un código distinto antes de registrar en terreno: un registro con un código repetido no permite saber a qué ítem corresponde."
          />
        )}

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : rows.length === 0 && !error ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                No existen itemizados visibles para configurar.
                <br />
                Primero active itemizados desde{" "}
                <strong>Opciones de itemizado</strong>.
              </span>
            }
          />
        ) : (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Buscar y filtrar
                </Typography.Text>
                <Button size="small" type="link" onClick={limpiarFiltros} className="!px-0 text-xs">
                  Limpiar
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Input
                  size="small"
                  allowClear
                  prefix={<SearchOutlined className="text-slate-400" />}
                  placeholder="Buscar por código, itemizado o mandante"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <Select
                  size="small"
                  placeholder="Elem. atravesado"
                  value={filtroPenetra || undefined}
                  onChange={(v: string | undefined) => setFiltroPenetra(v ?? "")}
                  options={opcionesFiltro.elementoPenetra}
                  showSearch
                  allowClear
                  style={{ width: "100%" }}
                />
                <Select
                  size="small"
                  placeholder="Materialidad"
                  value={filtroMaterialidad || undefined}
                  onChange={(v: string | undefined) => setFiltroMaterialidad(v ?? "")}
                  options={opcionesFiltro.materialidad}
                  showSearch
                  allowClear
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {filasFiltradas.length} de {rows.length} itemizados
              {hayFiltros && " · al guardar se guardan todos, también los que no se ven con el filtro"}
            </div>
            <Table<ConfigRow>
              rowKey="itemizadoOpcionId"
              columns={columns}
              dataSource={filasFiltradas}
              size="small"
              pagination={{ pageSize: 25, showSizeChanger: false }}
              scroll={{ x: 1600 + 105 * tiposContrato.length }}
              locale={{
                emptyText: hayFiltros
                  ? "Ningún itemizado coincide con la búsqueda o los filtros"
                  : "No hay itemizados visibles para esta obra",
              }}
            />
          </>
        )}
      </div>
    </Drawer>
  );
};

export default ConfigurarItemizadosObraDrawer;



// YO ESTUVE AQUI: MAXIMILIANO GONZALEZ
// TERMINEN TRAGGER, GITHUB: MAXI1004
