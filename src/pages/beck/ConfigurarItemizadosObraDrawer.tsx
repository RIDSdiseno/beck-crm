import React, { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Skeleton,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import {
  itemizadoOpcionesAPI,
  type ItemizadoOpcionConfigItem,
} from "../../services/api";

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
};

// Rastrea, por fila (itemizadoOpcionId), qué campos de rendimiento tocó
// realmente el usuario. Solo esos campos se incluyen en el payload de
// guardado — evita reenviar (y congelar como override) el valor resuelto
// (override ?? global) de filas que nadie editó.
type RendimientoDirtyMap = Record<string, { sellos?: boolean; reparacion?: boolean }>;

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

  const cargar = async () => {
    if (!obraId) return;
    setLoading(true);
    setError(null);
    // Cada carga (inicial, "Recargar" o refresco post-guardado) parte de un
    // snapshot limpio: ningún campo de rendimiento queda marcado como editado.
    setDirtyRendimientos({});
    try {
      const items = await itemizadoOpcionesAPI.obtenerConfiguracionObra(obraId);
      setRows(
        items.map((item) => ({
          ...item,
          _orden: item.orden ?? null,
          _nombrePersonalizado: item.nombrePersonalizado ?? "",
          // Valor efectivo ya resuelto por el backend (override por obra ?? global).
          _rendimientoSellos: item.itemizadoOpcion?.rendimientoSellosEsperadoDiario ?? null,
          _rendimientoReparacion: item.itemizadoOpcion?.rendimientoReparacionEsperadoDiario ?? null,
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, obraId]);

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

  const handleGuardar = async () => {
    if (!obraId) return;
    setSaving(true);
    try {
      await itemizadoOpcionesAPI.guardarConfiguracionObra(obraId, {
        items: rows.map((row) => {
          const dirty = dirtyRendimientos[row.itemizadoOpcionId];

          // itemizadoOpcionId, orden y nombrePersonalizado mantienen el
          // comportamiento existente: siempre se envían.
          const item: {
            itemizadoOpcionId: string;
            orden: number | null;
            nombrePersonalizado: string | null;
            rendimientoSellosEsperadoDiario?: number | null;
            rendimientoReparacionEsperadoDiario?: number | null;
          } = {
            itemizadoOpcionId: row.itemizadoOpcionId,
            orden: row._orden,
            nombrePersonalizado: row._nombrePersonalizado.trim() || null,
          };

          // Rendimientos: solo se incluye la clave si el usuario tocó ese
          // campo específico en esta fila. Si no fue tocado, se omite por
          // completo (no se envía ni siquiera como null) para que el backend
          // (hasOwnProperty) no cree/actualice un override que nadie pidió.
          // Si el usuario lo tocó y lo dejó vacío, row._rendimiento* ya vale
          // null, y ese null sí se envía intencionalmente (limpia el override).
          if (dirty?.sellos) {
            item.rendimientoSellosEsperadoDiario = row._rendimientoSellos;
          }
          if (dirty?.reparacion) {
            item.rendimientoReparacionEsperadoDiario = row._rendimientoReparacion;
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
            onClick={() => void cargar()}
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
