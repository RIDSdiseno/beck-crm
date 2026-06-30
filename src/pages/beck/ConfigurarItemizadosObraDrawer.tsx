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
};

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

  const cargar = async () => {
    if (!obraId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await itemizadoOpcionesAPI.obtenerConfiguracionObra(obraId);
      setRows(
        items.map((item) => ({
          ...item,
          _orden: item.orden ?? null,
          _nombrePersonalizado: item.nombrePersonalizado ?? "",
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

  const handleGuardar = async () => {
    if (!obraId) return;
    setSaving(true);
    try {
      await itemizadoOpcionesAPI.guardarConfiguracionObra(obraId, {
        items: rows.map((row) => ({
          itemizadoOpcionId: row.itemizadoOpcionId,
          orden: row._orden,
          nombrePersonalizado: row._nombrePersonalizado.trim() || null,
        })),
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
      title: "Código BECK",
      key: "codigoBeck",
      width: 130,
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.codigoBeck;
        return (
          <span className="font-mono text-xs">
            {v || <span className="text-slate-400">—</span>}
          </span>
        );
      },
    },
    {
      title: "Nombre original",
      key: "elementoPasante",
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.elementoPasante;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Nombre personalizado para esta obra",
      key: "nombrePersonalizado",
      width: 240,
      render: (_: unknown, record: ConfigRow) => (
        <Input
          size="small"
          value={record._nombrePersonalizado}
          placeholder="Dejar vacío para usar nombre original"
          onChange={(e) =>
            updateNombre(record.itemizadoOpcionId, e.target.value)
          }
        />
      ),
    },
    {
      title: "Nombre final",
      key: "nombreFinal",
      render: (_: unknown, record: ConfigRow) => {
        const nombre =
          record._nombrePersonalizado.trim() ||
          record.itemizadoOpcion?.elementoPasante;
        return nombre ? (
          <span className="text-sm font-medium text-slate-800">{nombre}</span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      },
    },
    {
      title: "Tipo",
      key: "tipo",
      width: 120,
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.tipo;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Elemento atravesado",
      key: "elementoPenetra",
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.elementoPenetra;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Materialidad",
      key: "materialidad",
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.materialidad;
        return v || <span className="text-slate-400">—</span>;
      },
    },
    {
      title: "Rendimiento Sellos Esperado diario",
      key: "rendimientoSellosEsperadoDiario",
      width: 140,
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.rendimientoSellosEsperadoDiario;
        return v != null ? (
          <span className="text-xs text-slate-700">{v}</span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      },
    },
    {
      title: "Rendimiento Reparación Esperado diario",
      key: "rendimientoReparacionEsperadoDiario",
      width: 160,
      render: (_: unknown, record: ConfigRow) => {
        const v = record.itemizadoOpcion?.rendimientoReparacionEsperadoDiario;
        return v != null ? (
          <span className="text-xs text-slate-700">{v}</span>
        ) : (
          <span className="text-slate-400">—</span>
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
            Configura el orden y el nombre personalizado de los itemizados
            visibles para esta obra.
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
            scroll={{ x: 1400 }}
            locale={{ emptyText: "No hay itemizados visibles para esta obra" }}
          />
        )}
      </div>
    </Drawer>
  );
};

export default ConfigurarItemizadosObraDrawer;
