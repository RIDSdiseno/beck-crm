import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { usePermisos } from "../../hooks/usePermisos";
import {
  oficinaTecnicaPreventaAPI,
  type EstadoSolicitudOficinaTecnica,
  type FunnelBeckArchivo,
  type SolicitudOficinaTecnica,
} from "../../services/api";

type RevisionFormValues = {
  estado: EstadoSolicitudOficinaTecnica;
  comentariosRevision?: string;
  fechaRevision?: string;
  responsableTecnico?: string;
};

type SolicitudRecord = SolicitudOficinaTecnica & Record<string, unknown>;

const estadoOptions: EstadoSolicitudOficinaTecnica[] = [
  "pendiente",
  "en_revision",
  "informacion_pendiente",
  "aprobada",
  "rechazada",
];

const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  informacion_pendiente: "Información pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

const estadoColor: Record<string, string> = {
  pendiente: "gold",
  en_revision: "blue",
  informacion_pendiente: "orange",
  aprobada: "green",
  rechazada: "red",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pick = (source: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const textFrom = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const formatDate = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const formatEtapa = (value: string): string => value.replace(/_/g, " ");

const getOpportunity = (solicitud: SolicitudRecord): Record<string, unknown> => {
  const oportunidad = pick(solicitud, [
    "oportunidad",
    "funnelBeck",
    "funnel",
    "oportunidadBeck",
  ]);
  return isRecord(oportunidad) ? oportunidad : {};
};

const getSolicitudValue = (
  solicitud: SolicitudRecord,
  solicitudKeys: string[],
  oportunidadKeys: string[] = []
): string => {
  const own = textFrom(pick(solicitud, solicitudKeys));
  if (own) return own;
  return textFrom(pick(getOpportunity(solicitud), oportunidadKeys));
};

const getFechaSolicitud = (solicitud: SolicitudRecord): string =>
  getSolicitudValue(solicitud, ["fechaSolicitud", "createdAt", "created_at"]);

const getArchivos = (solicitud: SolicitudRecord): FunnelBeckArchivo[] => {
  const own = pick(solicitud, ["archivos"]);
  if (Array.isArray(own)) return own as FunnelBeckArchivo[];

  const opportunityFiles = pick(getOpportunity(solicitud), ["archivos"]);
  return Array.isArray(opportunityFiles) ? (opportunityFiles as FunnelBeckArchivo[]) : [];
};

const getArchivoNombre = (archivo: FunnelBeckArchivo): string =>
  archivo.nombreArchivo || archivo.publicId || "Archivo adjunto";

const formatArchivoSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const EstadoTag: React.FC<{ estado?: string }> = ({ estado }) => (
  <Tag color={estadoColor[estado || ""] || "default"}>
    {estadoLabel[estado || ""] || estado || "Sin estado"}
  </Tag>
);

const OficinaTecnica: React.FC = () => {
  const { canEdit } = usePermisos();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<RevisionFormValues>();
  const [modal, modalContextHolder] = Modal.useModal();
  const [solicitudes, setSolicitudes] = useState<SolicitudOficinaTecnica[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quickActionKey, setQuickActionKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<SolicitudOficinaTecnica | null>(null);
  const [rechazoSolicitud, setRechazoSolicitud] =
    useState<SolicitudOficinaTecnica | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string | undefined>();
  const [responsableFilter, setResponsableFilter] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const isReadOnly = !canEdit("beck_oficina_tecnica");

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const data = await oficinaTecnicaPreventaAPI.listar();
      setSolicitudes(data);
      return data;
    } catch {
      message.error("No se pudieron cargar las solicitudes de Oficina Técnica");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSolicitudes();
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || loading || !solicitudes.length) return;

    const found = solicitudes.find((item) => item.id === id);
    if (found) {
      openDetail(found);
    } else {
      void (async () => {
        try {
          const detail = await oficinaTecnicaPreventaAPI.obtener(id);
          setSolicitudes((current) => {
            const exists = current.some((item) => item.id === detail.id);
            return exists
              ? current.map((item) => (item.id === detail.id ? detail : item))
              : [detail, ...current];
          });
          openDetail(detail);
        } catch {
          message.error("No se pudo abrir la solicitud indicada");
        }
      })();
    }
  }, [loading, searchParams, solicitudes]);

  const responsables = useMemo(() => {
    const values = new Set<string>();
    solicitudes.forEach((solicitud) => {
      const value = getSolicitudValue(solicitud as SolicitudRecord, [
        "responsableTecnico",
      ]);
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [solicitudes]);

  const filteredSolicitudes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return solicitudes.filter((solicitud) => {
      const record = solicitud as SolicitudRecord;
      const estado = textFrom(record.estado);
      const responsable = getSolicitudValue(record, ["responsableTecnico"]);
      const proyecto = getSolicitudValue(record, [], ["nombreProyecto", "proyecto"]);
      const empresa = getSolicitudValue(record, [], ["empresa", "cliente"]);

      if (estadoFilter && estado !== estadoFilter) return false;
      if (responsableFilter && responsable !== responsableFilter) return false;
      if (
        normalizedQuery &&
        !`${proyecto} ${empresa}`.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      return true;
    });
  }, [estadoFilter, query, responsableFilter, solicitudes]);

  const syncRevisionForm = (solicitud: SolicitudOficinaTecnica) => {
    form.setFieldsValue({
      estado: solicitud.estado || "pendiente",
      comentariosRevision: textFrom(
        pick(solicitud as SolicitudRecord, ["comentariosRevision"])
      ),
      fechaRevision: getSolicitudValue(solicitud as SolicitudRecord, [
        "fechaRevision",
      ]).slice(0, 10),
      responsableTecnico: textFrom(solicitud.responsableTecnico),
    });
  };

  const openDetail = (solicitud: SolicitudOficinaTecnica) => {
    setSelected(solicitud);
    setDrawerOpen(true);
    setSearchParams({ id: solicitud.id });
    syncRevisionForm(solicitud);
  };

  const closeDetail = () => {
    setDrawerOpen(false);
    setSelected(null);
    setSearchParams({});
  };

  const handleSaveRevision = async () => {
    if (!selected || isReadOnly) return;

    try {
      setSaving(true);
      const values = await form.validateFields();
      const updated = await oficinaTecnicaPreventaAPI.actualizar(selected.id, {
        estado: values.estado,
        comentariosRevision: values.comentariosRevision?.trim() || undefined,
        fechaRevision: values.fechaRevision || undefined,
        responsableTecnico: values.responsableTecnico?.trim() || undefined,
      });

      setSolicitudes((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setSelected(updated);

      if (values.estado === "aprobada") message.success("Solicitud aprobada.");
      else if (values.estado === "rechazada") message.success("Solicitud rechazada.");
      else if (values.estado === "informacion_pendiente") {
        message.success("Solicitó información adicional.");
      } else {
        message.success("Revisión guardada.");
      }
    } catch {
      message.error("No se pudo guardar la revisión");
    } finally {
      setSaving(false);
    }
  };

  const getSuccessMessage = (estado: EstadoSolicitudOficinaTecnica) => {
    if (estado === "en_revision") return "Solicitud tomada en revisión.";
    if (estado === "aprobada") return "Solicitud aprobada.";
    if (estado === "rechazada") return "Solicitud rechazada.";
    if (estado === "informacion_pendiente") {
      return "Se solicitá información adicional.";
    }
    return "Solicitud actualizada.";
  };

  const handleQuickAction = async (
    solicitud: SolicitudOficinaTecnica,
    estado: EstadoSolicitudOficinaTecnica,
    extraPayload: Partial<RevisionFormValues> = {}
  ) => {
    if (isReadOnly) return;

    const actionKey = `${solicitud.id}:${estado}`;

    try {
      setQuickActionKey(actionKey);
      const updated = await oficinaTecnicaPreventaAPI.actualizar(solicitud.id, {
        estado,
        ...extraPayload,
      });
      message.success(getSuccessMessage(estado));

      const refreshed = await loadSolicitudes();
      const refreshedSelected =
        refreshed.find((item) => item.id === updated.id) || updated;

      if (selected?.id === updated.id) {
        setSelected(refreshedSelected);
        syncRevisionForm(refreshedSelected);
      }
    } catch {
      message.error("No se pudo actualizar la solicitud");
    } finally {
      setQuickActionKey(null);
    }
  };

  const requestQuickAction = (
    solicitud: SolicitudOficinaTecnica,
    estado: EstadoSolicitudOficinaTecnica
  ) => {
    if (isReadOnly) return;

    if (estado === "rechazada") {
      modal.confirm({
        title: "Rechazar solicitud",
        content: "Confirma esta acción para ingresar el motivo de rechazo.",
        okText: "Continuar",
        cancelText: "Cancelar",
        okButtonProps: { danger: true },
        onOk: () => {
          setRechazoSolicitud(solicitud);
          setMotivoRechazo("");
        },
      });
      return;
    }

    if (
      estado === "aprobada" ||
      estado === "informacion_pendiente"
    ) {
      modal.confirm({
        title: estadoLabel[estado],
        content: "Confirma esta acción para la solicitud seleccionada.",
        okText: "Confirmar",
        cancelText: "Cancelar",
        onOk: () => handleQuickAction(solicitud, estado),
      });
      return;
    }

    void handleQuickAction(solicitud, estado);
  };

  const closeRechazoModal = () => {
    if (rechazando) return;
    setRechazoSolicitud(null);
    setMotivoRechazo("");
  };

  const handleConfirmarRechazo = async () => {
    if (!rechazoSolicitud || rechazando || isReadOnly) return;

    const motivo = motivoRechazo.trim();
    if (!motivo) {
      message.error("Ingresa el motivo del rechazo.");
      return;
    }

    try {
      setRechazando(true);
      await handleQuickAction(rechazoSolicitud, "rechazada", {
        comentariosRevision: motivo,
      });
      closeRechazoModal();
    } finally {
      setRechazando(false);
    }
  };

  const renderActions = (record: SolicitudOficinaTecnica) => {
    const estado = textFrom((record as SolicitudRecord).estado);
    const items = [
      estado === "pendiente"
        ? {
            key: "en_revision",
            icon: <PlayCircleOutlined />,
            label: "Tomar revisión",
          }
        : null,
      estado === "en_revision"
        ? {
            key: "aprobada",
            icon: <CheckOutlined />,
            label: "Aprobar",
          }
        : null,
      estado === "en_revision"
        ? {
            key: "rechazada",
            icon: <CloseOutlined />,
            label: "Rechazar",
            danger: true,
          }
        : null,
      estado === "en_revision"
        ? {
            key: "informacion_pendiente",
            icon: <ExclamationCircleOutlined />,
            label: "Pedir información",
          }
        : null,
    ].filter(Boolean);

    return (
      <Space size="small" wrap>
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
          Ver
        </Button>
        {!isReadOnly && items.length ? (
          <Dropdown
            trigger={["click"]}
            menu={{
              items,
              onClick: ({ key }) =>
                requestQuickAction(record, key as EstadoSolicitudOficinaTecnica),
            }}
          >
            <Button
              size="small"
              icon={<MoreOutlined />}
              loading={
                quickActionKey !== null && quickActionKey.startsWith(`${record.id}:`)
              }
            >
              Acciones
            </Button>
          </Dropdown>
        ) : null}
      </Space>
    );
  };

  const columns: TableColumnsType<SolicitudOficinaTecnica> = [
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 150,
      render: (estado: string) => <EstadoTag estado={estado} />,
    },
    {
      title: "Proyecto",
      key: "proyecto",
      render: (_, record) =>
        getSolicitudValue(record as SolicitudRecord, [], ["nombreProyecto", "proyecto"]) || "-",
    },
    {
      title: "Empresa",
      key: "empresa",
      render: (_, record) =>
        getSolicitudValue(record as SolicitudRecord, [], ["empresa", "cliente"]) || "-",
    },
    {
      title: "Responsable comercial",
      key: "vendedor",
      render: (_, record) =>
        getSolicitudValue(record as SolicitudRecord, [], ["vendedor", "responsableComercial"]) || "-",
    },
    {
      title: "Responsable técnico",
      key: "responsableTecnico",
      render: (_, record) =>
        getSolicitudValue(record as SolicitudRecord, ["responsableTecnico"]) || "-",
    },
    {
      title: "Fecha solicitud",
      key: "fechaSolicitud",
      render: (_, record) => formatDate(getFechaSolicitud(record as SolicitudRecord)),
    },
    {
      title: "Etapa oportunidad",
      key: "etapa",
      render: (_, record) =>
        formatEtapa(getSolicitudValue(record as SolicitudRecord, [], ["etapa"])) || "-",
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "right",
      render: (_, record) => renderActions(record),
    },
  ];

  const selectedRecord = selected as SolicitudRecord | null;
  const archivos = selectedRecord ? getArchivos(selectedRecord) : [];
  const renderArchivoSection = (tipo: string, title: string) => {
    const files = archivos.filter((archivo) => archivo.tipo === tipo);

    return (
      <div>
        <Typography.Text strong>{title}</Typography.Text>
        {files.length ? (
          <div className="mt-2 space-y-2">
            {files.map((archivo) => (
              <div
                key={archivo.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Typography.Text className="block truncate">
                    {getArchivoNombre(archivo)}
                  </Typography.Text>
                  <Typography.Text type="secondary" className="text-xs">
                    {[archivo.mimeType, formatArchivoSize(archivo.bytes)]
                      .filter(Boolean)
                      .join(" · ") || "Archivo adjunto"}
                  </Typography.Text>
                </div>
                <Button size="small" href={archivo.url} target="_blank" rel="noreferrer">
                  Ver / Descargar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Typography.Text type="secondary" className="mt-2 block">
            Sin archivos adjuntos
          </Typography.Text>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {modalContextHolder}
      <section className="beck-panel-soft">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Typography.Text className="text-[11px] font-medium uppercase tracking-wide text-[#a8860f]">
              Beck
            </Typography.Text>
            <h1 className="mt-1 text-2xl font-semibold text-beck-ink">
              Oficina Técnica
            </h1>
            <p className="mt-1 text-sm text-beck-muted">
              Revisión técnica preventiva de oportunidades comerciales.
            </p>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void loadSolicitudes()}>
            Actualizar
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Select
            allowClear
            placeholder="Filtrar por estado"
            value={estadoFilter}
            onChange={setEstadoFilter}
            options={estadoOptions.map((estado) => ({
              value: estado,
              label: estadoLabel[estado],
            }))}
          />
          <Select
            allowClear
            showSearch
            placeholder="Filtrar responsable técnico"
            value={responsableFilter}
            onChange={setResponsableFilter}
            options={responsables.map((responsable) => ({
              value: responsable,
              label: responsable,
            }))}
          />
          <Input.Search
            allowClear
            placeholder="Buscar proyecto / empresa"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredSolicitudes}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </section>

      <Modal
        open={Boolean(rechazoSolicitud)}
        title="Motivo de rechazo"
        okText="Rechazar solicitud"
        cancelText="Cancelar"
        onCancel={closeRechazoModal}
        onOk={() => {
          void handleConfirmarRechazo();
        }}
        okButtonProps={{ danger: true, loading: rechazando }}
        cancelButtonProps={{ disabled: rechazando }}
      >
        <Input.TextArea
          rows={4}
          value={motivoRechazo}
          onChange={(event) => setMotivoRechazo(event.target.value)}
          placeholder="Ingresa el motivo del rechazo"
          disabled={rechazando}
        />
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={closeDetail}
        title="Detalle solicitud Oficina Técnica"
        width="min(920px, 95vw)"
        extra={
          isReadOnly ? null : (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => void handleSaveRevision()}
            >
              Guardar revisión
            </Button>
          )
        }
      >
        {!selectedRecord ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : (
          <div className="space-y-5">
            <Descriptions title="Información oportunidad" bordered column={1} size="small">
              <Descriptions.Item label="Proyecto">
                {getSolicitudValue(selectedRecord, [], ["nombreProyecto", "proyecto"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Empresa">
                {getSolicitudValue(selectedRecord, [], ["empresa", "cliente"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="RUT empresa">
                {getSolicitudValue(selectedRecord, [], ["rutEmpresa", "rut_empresa"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Etapa">
                {formatEtapa(getSolicitudValue(selectedRecord, [], ["etapa"])) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Vendedor">
                {getSolicitudValue(selectedRecord, [], ["vendedor"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha probable cierre">
                {formatDate(getSolicitudValue(selectedRecord, [], ["fechaProbableCierre"]))}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="Información técnica" bordered column={1} size="small">
              <Descriptions.Item label="Responsable técnico">
                {getSolicitudValue(selectedRecord, ["responsableTecnico"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Antecedentes levantados">
                {getSolicitudValue(selectedRecord, ["antecedentesLevantados"], ["antecedentesLevantados"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Bases técnicas">
                {getSolicitudValue(selectedRecord, ["basesTecnicas"], ["basesTecnicas"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Especificaciones">
                {getSolicitudValue(selectedRecord, ["especificaciones"], ["especificaciones"]) || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Observaciones técnicas">
                {getSolicitudValue(selectedRecord, ["observacionesTecnicas"], ["observacionesTecnicas"]) || "-"}
              </Descriptions.Item>
            </Descriptions>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Typography.Title level={5} className="!mb-3">
                Archivos asociados
              </Typography.Title>
              <div className="space-y-4">
                {renderArchivoSection("DOCUMENTO_RECIBIDO", "Documentos recibidos")}
                {renderArchivoSection("PLANO", "Planos")}
                {renderArchivoSection("FOTOGRAFIA", "Fotografías")}
              </div>
            </div>

            <Form<RevisionFormValues>
              form={form}
              layout="vertical"
              disabled={isReadOnly}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <Typography.Title level={5} className="!mb-3">
                Revisión técnica
              </Typography.Title>
              <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
                <Select
                  options={estadoOptions.map((estado) => ({
                    value: estado,
                    label: estadoLabel[estado],
                  }))}
                />
              </Form.Item>
              <Form.Item name="responsableTecnico" label="Responsable técnico">
                <Input />
              </Form.Item>
              <Form.Item name="fechaRevision" label="Fecha revisión">
                <Input type="date" />
              </Form.Item>
              <Form.Item name="comentariosRevision" label="Comentarios revisión">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Form>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default OficinaTecnica;
