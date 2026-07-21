import React, { useEffect, useState } from "react";
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
import { ReloadOutlined, SaveOutlined, UndoOutlined } from "@ant-design/icons";
import {
  itemizadoOpcionesAPI,
  factoresHolguraAPI,
  type ItemizadoOpcionConfigItem,
  type FactorHolguraTipoConfig,
  type TramoHolgura,
  type MonedaItemizado,
} from "../../services/api";
import { TIPOS_REGISTRO_TERRENO } from "../../constants/roles";

type Props = {
  open: boolean;
  onClose: () => void;
  obraId?: string;
  obraNombre?: string;
};

type ConfigRow = ItemizadoOpcionConfigItem & {
  _orden: number | null;
  _nombrePersonalizado: string;
  _rendimientoSellos: number | null;
  _rendimientoReparacion: number | null;
  _precioUnitario: number | null;
  _moneda: MonedaItemizado | null;
};

type RendimientoDirtyMap = Record<
  string,
  { sellos?: boolean; reparacion?: boolean; precio?: boolean; moneda?: boolean }
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
          _rendimientoSellos: item.itemizadoOpcion?.rendimientoSellosEsperadoDiario ?? null,
          _rendimientoReparacion: item.itemizadoOpcion?.rendimientoReparacionEsperadoDiario ?? null,
          _precioUnitario:
            item.precioUnitario !== null && item.precioUnitario !== undefined
              ? Number(item.precioUnitario)
              : null,
          _moneda: item.moneda ?? null,
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
      void cargar();
      void cargarFactores();
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
      await itemizadoOpcionesAPI.guardarConfiguracionObra(obraId, {
        items: rows.map((row) => {
          const dirty = dirtyRendimientos[row.itemizadoOpcionId];

          const item: {
            itemizadoOpcionId: string;
            orden: number | null;
            nombrePersonalizado: string | null;
            rendimientoSellosEsperadoDiario?: number | null;
            rendimientoReparacionEsperadoDiario?: number | null;
            precioUnitario?: number | null;
            moneda?: MonedaItemizado | null;
          } = {
            itemizadoOpcionId: row.itemizadoOpcionId,
            orden: row._orden,
            nombrePersonalizado: row._nombrePersonalizado.trim() || null,
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

          return item;
        }),
      });
      void message.success("Configuración guardada correctamente");
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
      title: "Itemizado BECK",
      key: "elementoPasante",
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.elementoPasante;
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
                      <div className="flex items-center justify-between">
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
                            <div key={idx} className="flex items-center gap-2">
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
          <Table<ConfigRow>
            rowKey="itemizadoOpcionId"
            columns={columns}
            dataSource={rows}
            size="small"
            pagination={{ pageSize: 25, showSizeChanger: false }}
            scroll={{ x: 700 }}
            locale={{ emptyText: "No hay itemizados visibles para esta obra" }}
          />
        )}
      </div>
    </Drawer>
  );
};

export default ConfigurarItemizadosObraDrawer;
