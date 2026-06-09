import React, { useEffect, useMemo, useState } from "react";
import { message, Select, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  getConfiguracionValidacion,
  updateConfiguracionValidacion,
  type ConfiguracionValidacion,
} from "../../api/configuracionValidacion";

const { Title } = Typography;

const formatFecha = (value?: string | null): string => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

const ConfiguracionValidacionPage: React.FC = () => {
  const [data, setData] = useState<ConfiguracionValidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    void cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const reglas = await getConfiguracionValidacion();
      setData(Array.isArray(reglas) ? reglas : []);
    } catch {
      void message.error("No se pudieron cargar las reglas de validación");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNivelChange = async (id: number, nivel: "BLOQUEANTE" | "ADVERTENCIA") => {
    setUpdatingId(id);
    try {
      const updated = await updateConfiguracionValidacion(id, { nivel });
      if (updated && typeof updated === "object" && "id" in updated) {
        setData((prev) => prev.map((r) => (r.id === id ? (updated as ConfiguracionValidacion) : r)));
      }
      void message.success("Nivel actualizado");
    } catch {
      void message.error("No se pudo actualizar el nivel");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleActivoChange = async (id: number, activo: boolean) => {
    setUpdatingId(id);
    try {
      const updated = await updateConfiguracionValidacion(id, { activo });
      if (updated && typeof updated === "object" && "id" in updated) {
        setData((prev) => prev.map((r) => (r.id === id ? (updated as ConfiguracionValidacion) : r)));
      }
      void message.success(activo ? "Regla activada" : "Regla desactivada");
    } catch {
      void message.error("No se pudo actualizar el estado");
    } finally {
      setUpdatingId(null);
    }
  };

  const moduloFilters = useMemo(
    () => [...new Set(data.map((r) => r.modulo ?? ""))].filter(Boolean).map((m) => ({ text: m, value: m })),
    [data]
  );

  const columns: ColumnsType<ConfiguracionValidacion> = useMemo(
    () => [
      {
        title: "Módulo",
        dataIndex: "modulo",
        key: "modulo",
        width: 110,
        filters: moduloFilters,
        onFilter: (value, record) => (record.modulo ?? "") === value,
        render: (modulo?: string) => {
          if (modulo === "BECK") return <Tag color="blue">BECK</Tag>;
          if (modulo === "FIREMAT") return <Tag color="orange">FIREMAT</Tag>;
          return <Tag>{modulo ?? "—"}</Tag>;
        },
      },
      {
        title: "Regla",
        dataIndex: "regla",
        key: "regla",
        ellipsis: true,
        render: (val?: string) => val ?? "—",
      },
      {
        title: "Campo",
        dataIndex: "campo",
        key: "campo",
        width: 180,
        ellipsis: true,
        render: (val?: string) => val ?? "—",
      },
      {
        title: "Etiqueta",
        dataIndex: "etiqueta",
        key: "etiqueta",
        width: 200,
        render: (val?: string) => val ?? "—",
      },
      {
        title: "Nivel",
        dataIndex: "nivel",
        key: "nivel",
        width: 160,
        filters: [
          { text: "BLOQUEANTE", value: "BLOQUEANTE" },
          { text: "ADVERTENCIA", value: "ADVERTENCIA" },
        ],
        onFilter: (value, record) => (record.nivel ?? "") === value,
        render: (nivel: string | undefined, record: ConfiguracionValidacion) => {
          const safeNivel =
            nivel === "BLOQUEANTE" || nivel === "ADVERTENCIA" ? nivel : undefined;
          return (
            <Select
              value={safeNivel}
              loading={updatingId === record.id}
              disabled={updatingId === record.id}
              size="small"
              style={{ width: 140 }}
              placeholder="Sin nivel"
              onChange={(value: "BLOQUEANTE" | "ADVERTENCIA") => {
                void handleNivelChange(record.id, value);
              }}
              options={[
                {
                  value: "BLOQUEANTE",
                  label: <span style={{ color: "#cf1322" }}>BLOQUEANTE</span>,
                },
                {
                  value: "ADVERTENCIA",
                  label: <span style={{ color: "#d48806" }}>ADVERTENCIA</span>,
                },
              ]}
            />
          );
        },
      },
      {
        title: "Activo",
        dataIndex: "activo",
        key: "activo",
        width: 130,
        filters: [
          { text: "Activo", value: "activo" },
          { text: "Inactivo", value: "inactivo" },
        ],
        onFilter: (value, record) =>
          value === "activo" ? record.activo === true : record.activo === false,
        render: (activo: unknown, record) => {
          const isActivo = activo === true;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Switch
                checked={isActivo}
                loading={updatingId === record.id}
                disabled={updatingId === record.id}
                size="small"
                onChange={(checked) => {
                  void handleActivoChange(record.id, checked);
                }}
              />
              {isActivo ? (
                <Tag color="green">Activo</Tag>
              ) : (
                <Tag color="default">Inactivo</Tag>
              )}
            </div>
          );
        },
      },
      {
        title: "Última actualización",
        dataIndex: "updatedAt",
        key: "updatedAt",
        width: 180,
        render: (val?: string) => formatFecha(val),
        sorter: (a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return ta - tb;
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduloFilters, updatingId]
  );

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Reglas de Validación
        </Title>
        <p style={{ margin: "4px 0 0", color: "#8c8c8c", fontSize: 13 }}>
          Configura el nivel y estado de cada regla de validación del CRM.
        </p>
      </div>

      <Table<ConfiguracionValidacion>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 900 }}
        locale={{ emptyText: "No hay reglas de validación configuradas" }}
      />
    </div>
  );
};

export default ConfiguracionValidacionPage;
