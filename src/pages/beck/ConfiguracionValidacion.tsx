import React, { useEffect, useMemo, useState } from "react";
import { message, Select, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocation } from "react-router-dom";
import { usePermisos } from "../../hooks/usePermisos";
import {
  getConfiguracionValidacion,
  updateConfiguracionValidacion,
  type ConfiguracionValidacion,
} from "../../api/configuracionValidacion";

const { Title } = Typography;

// ── Etapa ─────────────────────────────────────────────────────────────────────
const ETAPA_LABELS: Record<string, string> = {
  PROSPECTO: "Prospecto",
  PROSPECTO_IDENTIFICADO: "Prospecto identificado",
  PRIMER_CONTACTO: "Primer contacto",
  DESARROLLO_COTIZACION: "Desarrollo cotización",
  COTIZACION_ENVIADA: "Cotización enviada",
  COTIZACION_ELABORADA: "Cotización elaborada",
  ORDEN_CONFIRMADA: "Orden confirmada",
  EN_NEGOCIACION: "En negociación",
  DOCUMENTACION_VENTA: "Documentación venta",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
  POSTERGADA: "Postergada",
  DESCARTADO: "Descartado",
  VISITA: "Visita",
  CERRADA: "Cerrada",
};

const etapaFallback = (etapa: string): string =>
  etapa
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const formatEtapa = (etapa?: string | null): string => {
  if (!etapa) return "—";
  return ETAPA_LABELS[etapa.toUpperCase()] ?? etapaFallback(etapa);
};

// ── Regla ─────────────────────────────────────────────────────────────────────
const REGLA_LABELS: Record<string, string> = {
  CLIENTE_REQUERIDO: "Cliente requerido",
  CONTACTO_REQUERIDO: "Contacto requerido",
  RESPONSABLE_REQUERIDO: "Responsable requerido",
  RESPONSABLE_COMERCIAL_REQUERIDO: "Responsable comercial requerido",
  RUT_EMPRESA_REQUERIDO: "RUT empresa requerido",
  TELEFONO_CORREO_REQUERIDO: "Teléfono o correo requerido",
  FECHA_PROXIMA_ACCION_REQUERIDA: "Fecha próxima acción requerida",
  PROXIMA_ACCION_REQUERIDA: "Próxima acción requerida",
  UNIDAD_NEGOCIO_REQUERIDA: "Unidad de negocio requerida",
  NOMBRE_OPORTUNIDAD_REQUERIDO: "Nombre oportunidad requerido",
  MOTIVO_PERDIDA_REQUERIDO: "Motivo pérdida requerido",
  MOTIVO_POSTERGACION_REQUERIDO: "Motivo postergación requerido",
  FECHA_REACTIVACION_REQUERIDA: "Fecha reactivación requerida",
  DOCUMENTO_RESPALDO_REQUERIDO: "Documento respaldo requerido",
  FLUJO_POSTERIOR_REQUERIDO: "Flujo posterior requerido",
  MONTO_ESTIMADO_REQUERIDO: "Monto estimado requerido",
  PRODUCTO_REQUERIDO: "Producto requerido",
  COTIZACION_REQUERIDA: "Cotización requerida",
  EMPRESA_REQUERIDA: "Empresa requerida",
};

const reglaFallback = (regla: string): string => {
  const key = regla.toUpperCase();
  if (REGLA_LABELS[key]) return REGLA_LABELS[key];
  return key
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const formatRegla = (regla?: string | null): string => {
  if (!regla) return "—";
  return reglaFallback(regla);
};

// ── Campo ─────────────────────────────────────────────────────────────────────
const CAMPO_LABELS: Record<string, string> = {
  empresa: "Empresa",
  cliente: "Cliente",
  nombreContacto: "Nombre contacto",
  telefonoContacto: "Teléfono contacto",
  correoContacto: "Correo contacto",
  "telefonoContacto_correoContacto": "Teléfono o correo contacto",
  telefono: "Teléfono",
  correo: "Correo",
  "telefono_correo": "Teléfono o correo",
  rutEmpresa: "RUT empresa",
  responsable: "Responsable",
  vendedor: "Responsable comercial",
  unidadNegocio: "Unidad de negocio",
  proximaAccion: "Próxima acción",
  fechaProximaAccion: "Fecha próxima acción",
  nombreOportunidad: "Nombre oportunidad",
  motivoPerdida: "Motivo pérdida",
  motivoPostergacion: "Motivo postergación",
  fechaReactivacion: "Fecha reactivación",
  documentoRespaldo: "Documento respaldo",
  flujoPosterior: "Flujo posterior",
  montoEstimado: "Monto estimado",
  producto: "Producto",
  cotizacion: "Cotización",
  contacto: "Contacto",
};

const formatCampo = (campo?: string | null): string => {
  if (!campo) return "—";
  return CAMPO_LABELS[campo] ?? campo;
};

// ── Fecha ─────────────────────────────────────────────────────────────────────
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

// ── Componente ────────────────────────────────────────────────────────────────
const ConfiguracionValidacionPage: React.FC = () => {
  const { pathname } = useLocation();
  const moduloActual: "BECK" | "FIREMAT" = pathname.startsWith("/firemat") ? "FIREMAT" : "BECK";
  const { canEdit } = usePermisos();
  const canEditReglas = moduloActual === "BECK" ? canEdit("beck_reglas_validacion") : true;

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

  const handleNivelChange = async (id: number, nivel: "BLOQUEANTE" | "ADVERTENCIA" | "IGNORAR") => {
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

  const filteredData = useMemo(
    () => data.filter((r) => r.modulo === moduloActual),
    [data, moduloActual]
  );

  // Filtros dinámicos de etapa a partir de los datos del módulo actual
  const etapaFilters = useMemo(() => {
    const etapas = [...new Set(filteredData.map((r) => r.etapa ?? ""))];
    return etapas.map((e) => ({ text: formatEtapa(e) || "Sin etapa", value: e }));
  }, [filteredData]);

  const columns: ColumnsType<ConfiguracionValidacion> = useMemo(
    () => [
      {
        title: "Etapa",
        dataIndex: "etapa",
        key: "etapa",
        width: 190,
        filters: etapaFilters,
        onFilter: (value, record) => (record.etapa ?? "") === value,
        render: (val?: string | null) => formatEtapa(val),
      },
      {
        title: "Regla",
        dataIndex: "regla",
        key: "regla",
        ellipsis: true,
        render: (val?: string | null) => formatRegla(val),
      },
      {
        title: "Campo",
        dataIndex: "campo",
        key: "campo",
        width: 200,
        ellipsis: true,
        render: (val?: string | null) => formatCampo(val),
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
          { text: "IGNORAR", value: "IGNORAR" },
        ],
        onFilter: (value, record) => (record.nivel ?? "") === value,
        render: (nivel: string | undefined, record: ConfiguracionValidacion) => {
          const safeNivel =
            nivel === "BLOQUEANTE" || nivel === "ADVERTENCIA" || nivel === "IGNORAR"
              ? nivel
              : undefined;
          return (
            <Select
              value={safeNivel}
              loading={updatingId === record.id}
              disabled={updatingId === record.id || !canEditReglas}
              size="small"
              style={{ width: 140 }}
              placeholder="Sin nivel"
              onChange={(value: "BLOQUEANTE" | "ADVERTENCIA" | "IGNORAR") => {
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
                {
                  value: "IGNORAR",
                  label: <span style={{ color: "#8c8c8c" }}>IGNORAR</span>,
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
                disabled={updatingId === record.id || !canEditReglas}
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
    [updatingId, etapaFilters]
  );

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Reglas de Validación {moduloActual === "FIREMAT" ? "FIREMAT" : "BECK"}
        </Title>
        <p style={{ margin: "4px 0 0", color: "#8c8c8c", fontSize: 13 }}>
          Configura el nivel y estado de cada regla de validación del CRM.
        </p>
      </div>

      <Table<ConfiguracionValidacion>
        dataSource={filteredData}
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
