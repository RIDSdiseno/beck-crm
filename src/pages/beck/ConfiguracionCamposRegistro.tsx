import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Collapse,
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
    title: "Trabajador / Terreno",
    description: "Campos disponibles para usuarios de terreno.",
  },
  {
    key: "ingenieria",
    title: "Ingeniería",
    description: "Campos disponibles para el equipo de Ingeniería.",
  },
  {
    key: "cliente",
    title: "Cliente",
    description: "Campos visibles para usuarios cliente en la vista de registros de su empresa.",
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
  { campo: "accesibilidad", label: "Accesibilidad", color: "azul", visible: false },
  { campo: "cantidad_sellos_con_factores", label: "Cantidad sellos con factores", color: "azul", visible: false },
  { campo: "aislacion", label: "Aislación", color: "azul", visible: false },
  { campo: "cantidad_sellos_aislacion", label: "Cantidad sellos aislación", color: "azul", visible: false },
  { campo: "reparacion_tabique", label: "Reparación tabique", color: "azul", visible: false },
  { campo: "cantidad_final", label: "Cantidad final", color: "azul", visible: false },
];
const configurableCatalogKeys = new Set(camposRegistroNuevos.map((field) => field.campo));

const matrixCampoLabels: Record<string, string> = {
  eje_alfabetico: "Eje Alfabético",
  eje_numerico: "Eje Numérico",
  recinto: "Recinto",
  modulo: "Módulo o edificio",
  holgura: "Holgura (cm)",
  factor_por_holguras: "Factor por holguras",
  cantidad_sellos_con_factores: "Cantidad sellos con factores",
  cantidad_sellos_aislacion: "Cantidad sellos aislación",
  cantidad_final: "Cantidad final",
  folio: "FOLIO",
  itemizado_mandante: "Itemizado Mandante",
  codigo_beck: "Código Beck",
  itemizado_beck: "Itemizado Beck",
  fecha_ejecucion_sello: "Fecha ejecución sello",
  dia: "Día",
  diaSemana: "Día",
  piso: "Piso",
  nombre_sellador: "Nombre sellador",
  foto: "Foto",
  numero_sello: "Número sello",
  cantidad_sellos: "Cantidad sellos",
  accesibilidad: "Accesibilidad / cielo modular",
  accesibilidad_cielo_modular: "Accesibilidad / cielo modular",
  aislacion: "Aislación",
  reparacion_tabique: "Reparación tabique",
};

const MASTER_CAMPO_ORDER: string[] = [
  "codigo_beck",
  "itemizado_beck",
  "itemizado_mandante",
  "fecha_ejecucion_sello",
  "diaSemana",
  "piso",
  "eje_alfabetico",
  "eje_numerico",
  "nombre_sellador",
  "foto",
  "recinto",
  "modulo",
  "numero_sello",
  "cantidad_sellos",
  "accesibilidad",
  "holgura",
  "factor_por_holguras",
  "cantidad_sellos_con_factores",
  "aislacion",
  "cantidad_sellos_aislacion",
  "reparacion_tabique",
  "cantidad_final",
  "folio",
];
const masterCampoIndex = new Map(MASTER_CAMPO_ORDER.map((k, i) => [k, i]));

const clienteCampoLabels: Record<string, string> = {
  holgura: "Separación (cm)",
  factor_por_holguras: "Factor por separación",
};

const jefeObraConfigurableCampos = new Set([
  "eje_alfabetico",
  "eje_numerico",
  "recinto",
  "modulo",
  "holgura",
  "factor_por_holguras",
  "cantidad_sellos_con_factores",
  "cantidad_final",
  "folio",
  "itemizado_mandante",
]);

const trabajadorConfigurableCampos = new Set([
  "eje_alfabetico",
  "eje_numerico",
  "recinto",
  "modulo",
  "holgura",
]);

const trabajadorProhibidoCampos = new Set([
  "factor_por_holguras",
  "cantidad_sellos_con_factores",
  "cantidad_sellos_aislacion",
  "cantidad_final",
]);

const clienteConfigurableCampos = new Set([
  "codigo_beck",
  "itemizado_beck",
  "itemizado_mandante",
  "fecha_ejecucion_sello",
  "diaSemana",
  "piso",
  "eje_alfabetico",
  "eje_numerico",
  "nombre_sellador",
  "foto",
  "recinto",
  "modulo",
  "numero_sello",
  "cantidad_sellos",
  "accesibilidad",
  "holgura",
  "factor_por_holguras",
  "cantidad_sellos_con_factores",
  "aislacion",
  "cantidad_sellos_aislacion",
  "reparacion_tabique",
  "cantidad_final",
  "folio",
]);

const getCatalogKeysForRole = (role: RolConfiguracionCamposRegistro) => {
  if (role === "trabajador") return [...trabajadorConfigurableCampos, ...trabajadorProhibidoCampos];
  if (role === "cliente") return [...clienteConfigurableCampos];
  if (role === "ingenieria") return [...jefeObraConfigurableCampos];
  return [...jefeObraConfigurableCampos];
};

const textFrom = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const CAMPO_ALIAS_MAP: Record<string, string> = {
  codigobeck: "codigo_beck",
  itemizadobeck: "itemizado_beck",
  itemizadomandante: "itemizado_mandante",
  fechaejecucionsello: "fecha_ejecucion_sello",
  dia: "diaSemana",
  diasemana: "diaSemana",
  ejealfabetico: "eje_alfabetico",
  ejenumerico: "eje_numerico",
  nombresellador: "nombre_sellador",
  numerosello: "numero_sello",
  cantidadsellos: "cantidad_sellos",
  separacioncm: "holgura",
  factorseparacion: "factor_por_holguras",
  accesibilidadcielomodular: "accesibilidad",
  cantidadsellosconfactores: "cantidad_sellos_con_factores",
  cantidadsellosaislacion: "cantidad_sellos_aislacion",
  reparaciontabique: "reparacion_tabique",
  cantidadfinal: "cantidad_final",
  factorporholguras: "factor_por_holguras",
};

const normalizeCampoText = (value: unknown): string =>
  textFrom(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCampoKey = (value: unknown): string => {
  const raw = textFrom(value);
  if (!raw) return "";
  const fromAlias = CAMPO_ALIAS_MAP[raw.toLowerCase().replace(/[^a-z0-9]/g, "")];
  if (fromAlias) return fromAlias;
  const normalized = normalizeCampoText(value);
  if (!normalized) return "";
  if (normalized === "supervisor") return "jefeobra";
  if (normalized === "terreno") return "trabajador";
  if (normalized === "eje alfabetico") return "eje_alfabetico";
  if (normalized === "eje numerico") return "eje_numerico";
  if (normalized === "recinto") return "recinto";
  if (normalized === "modulo" || normalized === "modulo o edificio" || normalized === "edificio") return "modulo";
  if (normalized === "holgura" || normalized === "holgura cm") return "holgura";
  if (normalized === "factor por holguras") return "factor_por_holguras";
  if (normalized === "cielo modular" || normalized === "accesibilidad") return "accesibilidad";
  if (normalized.includes("cantidad") && normalized.includes("sellos") && normalized.includes("factores")) {
    return "cantidad_sellos_con_factores";
  }
  if (normalized === "aislacion") return "aislacion";
  if (normalized.includes("cantidad") && normalized.includes("sellos") && normalized.includes("aislacion")) {
    return "cantidad_sellos_aislacion";
  }
  if (normalized.includes("reparacion") && normalized.includes("tabique")) return "reparacion_tabique";
  if (normalized === "cantidad final") return "cantidad_final";
  if (normalized === "folio") return "folio";
  return textFrom(value);
};

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
    normalizeCampoKey(field.campo) ||
    normalizeCampoKey(field.key) ||
    normalizeCampoKey(field.nombreCampo) ||
    normalizeCampoKey(field.nombre) ||
    normalizeCampoKey(field.label) ||
    normalizeCampoKey(field.id);
  const isTrabajadorProhibido =
    role === "trabajador" && trabajadorProhibidoCampos.has(campo);
  const isConfigurableMatrix =
    role === "jefeobra" || role === "ingenieria"
      ? jefeObraConfigurableCampos.has(campo)
      : role === "cliente"
      ? clienteConfigurableCampos.has(campo)
      : trabajadorConfigurableCampos.has(campo);
  const color: ColorConfiguracionCampoRegistro = isTrabajadorProhibido
    ? "rojo"
    : isConfigurableMatrix || configurableCatalogKeys.has(campo)
    ? "azul"
    : normalizeColor(field);
  const normalized: CampoConfiguracionRegistro = {
    ...field,
    campo,
    label:
      (role === "cliente" ? clienteCampoLabels[campo] : undefined) ||
      matrixCampoLabels[campo] ||
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
    return { ...normalized, visible: false, prohibido: true, configurable: false };
  }

  return normalized;
};

const withCatalogFields = (
  role: RolConfiguracionCamposRegistro,
  fields: CampoConfiguracionRegistro[]
): CampoConfiguracionRegistro[] => {
  const normalized = fields.map((field) => normalizeFieldForRole(role, field));
  const existing = new Set(normalized.map((field) => field.campo));
  const merged = [
    ...normalized,
    ...getCatalogKeysForRole(role)
      .filter((campo) => !existing.has(campo))
      .map((campo) =>
        normalizeFieldForRole(role, {
          campo,
          label: (role === "cliente" ? clienteCampoLabels[campo] : undefined) || matrixCampoLabels[campo] || campo,
          color:
            role === "trabajador" && trabajadorProhibidoCampos.has(campo)
              ? "rojo"
              : "azul",
          visible: false,
        })
      ),
  ];
  const seen = new Set<string>();
  const deduped = merged.filter((field) => {
    if (seen.has(field.campo)) return false;
    seen.add(field.campo);
    return true;
  });
  return deduped.sort((a, b) => {
    const ia = masterCampoIndex.get(a.campo) ?? Infinity;
    const ib = masterCampoIndex.get(b.campo) ?? Infinity;
    return ia - ib;
  });
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
    cliente: [],
    ingenieria: [],
  });
  const [openPanels, setOpenPanels] = useState<string | string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedConfig = useMemo(() => {
    return {
      jefeobra: withCatalogFields("jefeobra", config.jefeobra),
      trabajador: withCatalogFields("trabajador", config.trabajador),
      cliente: withCatalogFields("cliente", config.cliente),
      ingenieria: withCatalogFields("ingenieria", config.ingenieria),
    };
  }, [config]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jefeobra, trabajador, cliente, ingenieria] = await Promise.all([
        configuracionCamposRegistroAPI.obtenerPorRol("jefeobra"),
        configuracionCamposRegistroAPI.obtenerPorRol("trabajador"),
        configuracionCamposRegistroAPI.obtenerPorRol("cliente"),
        configuracionCamposRegistroAPI.obtenerPorRol("ingenieria"),
      ]);
      setConfig({
        jefeobra,
        trabajador,
        cliente,
        ingenieria,
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
      const roleFields = current[role];
      const found = roleFields.some(
        (field) =>
          normalizeCampoKey(field.campo) === fieldKey ||
          normalizeCampoKey(field.key) === fieldKey
      );
      if (found) {
        return {
          ...current,
          [role]: roleFields.map((field) =>
            normalizeCampoKey(field.campo) === fieldKey ||
            normalizeCampoKey(field.key) === fieldKey
              ? { ...field, visible }
              : field
          ),
        };
      }

      return {
        ...current,
        [role]: [
          ...roleFields,
          { campo: fieldKey, label: matrixCampoLabels[fieldKey] || fieldKey, color: "azul" as const, visible },
        ],
      };
    });
  };

  const buildPayload = (
    source: Record<RolConfiguracionCamposRegistro, CampoConfiguracionRegistro[]>
  ) =>
    roleBlocks.flatMap((block) =>
      source[block.key]
        .map((field) => normalizeFieldForRole(block.key, field))
        .filter(
          (field) =>
            field.color === "azul" ||
            (block.key === "trabajador" && field.color === "rojo")
        )
        .map((field) => ({
          campo: field.campo,
          rol: block.key,
          visible:
            block.key === "trabajador" && field.color === "rojo"
              ? false
              : field.visible,
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
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Collapse
            activeKey={openPanels}
            onChange={setOpenPanels}
            bordered={false}
            style={{ background: "transparent" }}
            items={roleBlocks.map((block) => {
              const fields = getFieldsForRole(block.key);
              const visibles = fields.filter((f) => f.visible).length;
              const ocultos = fields.length - visibles;
              return {
                key: block.key,
                label: (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      {block.title}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {block.description}
                    </Typography.Text>
                    <Space size={4} style={{ marginLeft: "auto" }}>
                      <Tag color="green" style={{ margin: 0 }}>{visibles} visibles</Tag>
                      <Tag color="default" style={{ margin: 0 }}>{ocultos} ocultos</Tag>
                    </Space>
                  </div>
                ),
                children: fields.length ? (
                  <div className="space-y-3 px-2 pb-2">
                    {fields.map((field) => renderField(block.key, field))}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="El backend no devolvió campos para este rol."
                  />
                ),
              };
            })}
          />
        </section>
      )}
    </div>
  );
};

export default ConfiguracionCamposRegistro;
