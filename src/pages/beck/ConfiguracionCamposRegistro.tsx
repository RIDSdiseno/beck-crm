import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  configuracionCamposRegistroAPI,
  type CampoConfiguracionRegistro,
  type ColorConfiguracionCampoRegistro,
  type RolConfiguracionCamposRegistro,
} from "../../services/api";

type RoleBlock = {
  key: RolConfiguracionCamposRegistro;
  title: string;
  description: string;
};

const roleBlocks: RoleBlock[] = [
  {
    key: "jefeobra",
    title: "Supervisor / Jefe obra",
    description: "Campos visibles para jefaturas de terreno.",
  },
  {
    key: "trabajador",
    title: "Trabajador",
    description: "Campos disponibles para usuarios de terreno.",
  },
];

const colorConfig: Record<
  ColorConfiguracionCampoRegistro,
  { label: string; tagColor: string; border: string; background: string }
> = {
  verde: {
    label: "Siempre visible",
    tagColor: "green",
    border: "border-green-200",
    background: "bg-green-50",
  },
  azul: {
    label: "Configurable",
    tagColor: "blue",
    border: "border-blue-200",
    background: "bg-blue-50",
  },
  rojo: {
    label: "Restringido",
    tagColor: "red",
    border: "border-red-200",
    background: "bg-red-50",
  },
};

const camposRegistroNuevos: CampoConfiguracionRegistro[] = [
  { campo: "factor_por_holguras", label: "Factor por holguras", color: "azul", visible: false },
  { campo: "cielo_modular", label: "Cielo modular", color: "azul", visible: false },
  { campo: "cantidad_sellos_con_factores", label: "Cantidad sellos con factores", color: "azul", visible: false },
  { campo: "aislacion", label: "AislaciÃ³n", color: "azul", visible: false },
  { campo: "cantidad_sellos_aislacion", label: "Cantidad sellos aislaciÃ³n", color: "azul", visible: false },
  { campo: "reparacion_tabique", label: "ReparaciÃ³n tabique", color: "azul", visible: false },
  { campo: "cantidad_final", label: "Cantidad final", color: "azul", visible: false },
];

const textFrom = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeColor = (field: CampoConfiguracionRegistro): ColorConfiguracionCampoRegistro => {
  const rawColor = textFrom(
    field.color ??
      field.tipo ??
      field.colorCampo ??
      field.clasificacion ??
      field.categoria
  ).toLowerCase();

  if (rawColor === "verde" || rawColor === "green") return "verde";
  if (rawColor === "rojo" || rawColor === "red") return "rojo";
  return "azul";
};

const normalizeFieldForRole = (
  role: RolConfiguracionCamposRegistro,
  field: CampoConfiguracionRegistro
): CampoConfiguracionRegistro => {
  const campo =
    textFrom(field.campo) ||
    textFrom(field.key) ||
    textFrom(field.nombreCampo) ||
    textFrom(field.nombre) ||
    textFrom(field.label) ||
    textFrom(field.id);
  const color = normalizeColor(field);
  const normalized: CampoConfiguracionRegistro = {
    ...field,
    campo,
    label:
      textFrom(field.label) ||
      textFrom(field.nombre) ||
      textFrom(field.nombreCampo) ||
      campo,
    color,
    visible: Boolean(field.visible),
  };

  if (color === "verde") {
    return { ...normalized, visible: true };
  }

  if (role === "trabajador" && color === "rojo") {
    return { ...normalized, visible: false, prohibido: true };
  }

  return normalized;
};

const withCatalogFields = (
  role: RolConfiguracionCamposRegistro,
  fields: CampoConfiguracionRegistro[]
): CampoConfiguracionRegistro[] => {
  const normalized = fields.map((field) => normalizeFieldForRole(role, field));
  const existing = new Set(normalized.map((field) => field.campo));
  return [
    ...normalized,
    ...camposRegistroNuevos
      .filter((field) => !existing.has(field.campo))
      .map((field) => normalizeFieldForRole(role, field)),
  ];
};

const isFieldLocked = (
  role: RolConfiguracionCamposRegistro,
  field: CampoConfiguracionRegistro
) =>
  field.color === "verde" ||
  field.configurable === false ||
  field.prohibido === true ||
  (role === "trabajador" && field.color === "rojo");

const ConfiguracionCamposRegistro: React.FC = () => {
  const [config, setConfig] = useState<
    Record<RolConfiguracionCamposRegistro, CampoConfiguracionRegistro[]>
  >({
    jefeobra: [],
    trabajador: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedConfig = useMemo(() => {
    return {
      jefeobra: withCatalogFields("jefeobra", config.jefeobra),
      trabajador: withCatalogFields("trabajador", config.trabajador),
    };
  }, [config]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jefeobra, trabajador] = await Promise.all([
        configuracionCamposRegistroAPI.obtenerPorRol("jefeobra"),
        configuracionCamposRegistroAPI.obtenerPorRol("trabajador"),
      ]);
      setConfig({
        jefeobra,
        trabajador,
      });
    } catch {
      setError(
        "No se pudo cargar la configuración de campos. Verifica los endpoints por rol."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const updateField = (
    role: RolConfiguracionCamposRegistro,
    fieldKey: string,
    visible: boolean
  ) => {
    setConfig((current) => {
      return {
        ...current,
        [role]: current[role].map((field) =>
          field.campo === fieldKey || field.key === fieldKey
            ? { ...field, visible }
            : field
        ),
      };
    });
  };

  const buildPayload = (
    source: Record<RolConfiguracionCamposRegistro, CampoConfiguracionRegistro[]>
  ) =>
    roleBlocks.flatMap((block) =>
      source[block.key]
        .map((field) => normalizeFieldForRole(block.key, field))
        .filter((field) => field.color === "azul")
        .map((field) => ({
          campo: field.campo,
          rol: block.key,
          visible: field.visible,
        }))
    );

  const handleSave = async () => {
    if (!normalizedConfig) return;

    try {
      setSaving(true);
      await configuracionCamposRegistroAPI.actualizar(buildPayload(normalizedConfig));
      await loadConfig();
      message.success("Configuración de campos guardada.");
    } catch {
      message.error("No se pudo guardar la configuración de campos.");
    } finally {
      setSaving(false);
    }
  };

  const getFieldsForRole = (role: RolConfiguracionCamposRegistro) => {
    return normalizedConfig[role] ?? [];
  };

  const renderField = (
    role: RolConfiguracionCamposRegistro,
    field: CampoConfiguracionRegistro
  ) => {
    const color = colorConfig[field.color] ?? colorConfig.azul;
    const locked = isFieldLocked(role, field);
    const trabajadorRojo = role === "trabajador" && field.color === "rojo";

    return (
      <div
        key={field.campo}
        className={`flex flex-col gap-3 rounded-lg border ${color.border} ${color.background} px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="min-w-0">
          <Space size={[6, 6]} wrap className="mb-1">
            <Typography.Text strong>{field.label || field.campo}</Typography.Text>
            <Tag color={color.tagColor}>{color.label}</Tag>
            {trabajadorRojo && <Tag color="red">Prohibido para trabajador</Tag>}
          </Space>
          <Typography.Text type="secondary" className="block text-xs">
            {field.descripcion || field.campo}
          </Typography.Text>
        </div>
        <Switch
          checked={field.visible}
          disabled={locked || saving}
          onChange={(checked) => updateField(role, field.campo, checked)}
          checkedChildren="Visible"
          unCheckedChildren="Oculto"
        />
      </div>
    );
  };

  const renderRoleBlock = (block: RoleBlock) => {
    const fields = getFieldsForRole(block.key);

    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <Typography.Title level={4} className="!mb-1">
            {block.title}
          </Typography.Title>
          <Typography.Text type="secondary">{block.description}</Typography.Text>
        </div>
        {fields.length ? (
          <div className="space-y-3">
            {fields.map((field) => renderField(block.key, field))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="El backend no devolvió campos para este rol."
          />
        )}
      </section>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="beck-panel-soft">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Typography.Text className="text-[11px] font-medium uppercase tracking-wide text-[#a8860f]">
              Configuración técnica
            </Typography.Text>
            <Typography.Title level={2} className="!mb-1 !mt-1">
              Visibilidad de campos de registro
            </Typography.Title>
            <Typography.Text type="secondary">
              Control visual por rol para campos de registros en terreno.
            </Typography.Text>
          </div>
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void loadConfig()}
              disabled={loading || saving}
            >
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={loading}
              onClick={() => void handleSave()}
            >
              Guardar cambios
            </Button>
          </Space>
        </div>
      </section>


      {error && (
        <Alert
          type="error"
          showIcon
          message="No se pudo cargar la configuración"
          description={error}
        />
      )}

      {loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Skeleton active paragraph={{ rows: 8 }} />
        </section>
      ) : (
        roleBlocks.map(renderRoleBlock)
      )}
    </div>
  );
};

export default ConfiguracionCamposRegistro;
