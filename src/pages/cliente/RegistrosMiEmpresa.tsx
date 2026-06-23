import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
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
  PictureOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
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
  type ClienteBeckVistaCliente,
  type ClienteDashboardData,
  type ClienteObraResumen,
  type ClienteRegistroValidado,
} from "../../services/api";
import { useAuth } from "../../context/useAuth";
import { usePermisos } from "../../hooks/usePermisos";

dayjs.locale("es");

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const CHART_COLORS = ["#d4a017", "#e07b54", "#5b8dd9", "#6abf69", "#9b59b6", "#e74c3c"];

const estadoColor: Record<string, string> = {
  activo: "green",
  activa: "green",
  inactivo: "default",
  inactiva: "default",
  terminado: "blue",
  terminada: "blue",
  "en ejecución": "processing",
};

const getEstadoTag = (estado?: string | null) => {
  if (!estado) return <Tag>-</Tag>;
  const key = estado.toLowerCase();
  return <Tag color={estadoColor[key] ?? "default"}>{estado}</Tag>;
};

const getFotos = (r: ClienteRegistroValidado): string[] => {
  if (Array.isArray(r.fotosUrls) && r.fotosUrls.length > 0) return r.fotosUrls as string[];
  if (r.fotoUrl && typeof r.fotoUrl === "string") return [r.fotoUrl];
  if (Array.isArray(r.fotos_registro)) {
    return (r.fotos_registro as Array<{ url: string }>).map((f) => f.url).filter(Boolean);
  }
  return [];
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

const RegistrosMiEmpresa: React.FC = () => {
  const { user } = useAuth();
  const { canView } = usePermisos();

  const isAdmin = user?.rol === "Administrador";
  const isCliente = user?.rol === "Cliente";
  // Usuario interno con permiso beck_vista_cliente pero sin ser admin ni cliente real
  const isInterno = !isAdmin && !isCliente && canView("beck_vista_cliente");
  // Cualquier rol que necesita selector para elegir cliente
  const necesitaSelector = isAdmin || isInterno;

  // ── Estado admin: selector de cliente Beck ──
  const [clientesBeck, setClientesBeck] = useState<ClienteBeckVistaCliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | undefined>();

  // ── Estado compartido ──
  const [dashboard, setDashboard] = useState<ClienteDashboardData | null>(null);
  const [obras, setObras] = useState<ClienteObraResumen[]>([]);
  const [loadingDash, setLoadingDash] = useState(false);
  const [loadingObras, setLoadingObras] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);

  // ── Estado obra seleccionada ──
  const [obraSeleccionada, setObraSeleccionada] = useState<ClienteObraResumen | null>(null);
  const [registros, setRegistros] = useState<ClienteRegistroValidado[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  // ── Estado modal detalle ──
  const [detalle, setDetalle] = useState<ClienteRegistroValidado | null>(null);

  // ── Filtros tabla de registros ──
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [filtroPiso, setFiltroPiso] = useState<string | undefined>();
  const [filtroFechas, setFiltroFechas] = useState<[Dayjs, Dayjs] | null>(null);

  // params que se pasan a la API — solo si admin/interno con cliente Beck seleccionado
  const apiParams = necesitaSelector
    ? clienteSeleccionadoId
      ? { clienteBeckId: clienteSeleccionadoId }
      : undefined
    : undefined;

  // Si admin/interno y no hay cliente seleccionado, no llamamos nada
  const listoParaCargar = !necesitaSelector || !!clienteSeleccionadoId;

  // ── Carga clientes Beck (admin e internos con permiso) ──
  useEffect(() => {
    if (!necesitaSelector) return;
    setLoadingClientes(true);
    clienteAPI
      .clientesBeck()
      .then(setClientesBeck)
      .catch((err) => void message.error("No se pudieron cargar los clientes: " + getErrorMessage(err)))
      .finally(() => setLoadingClientes(false));
  }, [necesitaSelector]);

  // ── Carga dashboard + obras ──
  const cargarDatos = useCallback(
    async (params?: { clienteBeckId?: string }) => {
      setErrorDatos(null);
      setLoadingDash(true);
      setLoadingObras(true);
      setObraSeleccionada(null);
      setRegistros([]);
      try {
        const [dash, obrasData] = await Promise.all([
          clienteAPI.dashboard(params),
          clienteAPI.obras(params),
        ]);
        if (import.meta.env.DEV) {
          console.log("dashboard cliente", dash);
          console.log("obras cliente", obrasData);
        }
        setDashboard(dash);
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

  // Carga inicial solo para rol Cliente real; admin/internos esperan selección
  useEffect(() => {
    if (!necesitaSelector) {
      void cargarDatos(undefined);
    }
  }, [necesitaSelector, cargarDatos]);

  // Re-carga cuando admin/interno cambia de cliente Beck
  useEffect(() => {
    if (necesitaSelector && clienteSeleccionadoId) {
      void cargarDatos({ clienteBeckId: clienteSeleccionadoId });
    }
    if (necesitaSelector && !clienteSeleccionadoId) {
      setDashboard(null);
      setObras([]);
      setObraSeleccionada(null);
      setRegistros([]);
      setErrorDatos(null);
    }
  }, [necesitaSelector, clienteSeleccionadoId, cargarDatos]);

  // ── Abrir obra ──
  const abrirObra = useCallback(
    async (obra: ClienteObraResumen) => {
      setObraSeleccionada(obra);
      setRegistros([]);
      setBusqueda("");
      setFiltroTipo(undefined);
      setFiltroPiso(undefined);
      setFiltroFechas(null);
      setLoadingRegistros(true);
      try {
        const data = await clienteAPI.registrosPorObra(obra.id, apiParams);
        setRegistros(data);
      } catch (err) {
        void message.error("No se pudieron cargar los registros: " + getErrorMessage(err));
      } finally {
        setLoadingRegistros(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clienteSeleccionadoId]
  );

  const volver = useCallback(() => {
    setObraSeleccionada(null);
    setRegistros([]);
  }, []);

  // ── Filtros dinámicos ──
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
        return (
          r.tipoRegistro?.toLowerCase().includes(q) ||
          r.piso?.toLowerCase().includes(q) ||
          r.modulo?.toLowerCase().includes(q) ||
          r.recinto?.toLowerCase().includes(q) ||
          r.eje?.toLowerCase().includes(q) ||
          r.numeroSello?.toLowerCase().includes(q) ||
          r.material?.toLowerCase().includes(q) ||
          r.sellador?.toLowerCase().includes(q) ||
          false
        );
      }
      return true;
    });
  }, [registros, filtroTipo, filtroPiso, filtroFechas, busqueda]);

  // ── KPIs efectivos: usa dashboard si tiene datos, si no calcula desde obras ──
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
      };
    }
    return dashboard;
  }, [dashboard, obras, listoParaCargar, loadingDash]);

  // ── Columnas tabla obras ──
  const columnasObras: ColumnsType<ClienteObraResumen> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Código",
      dataIndex: "codigo",
      key: "codigo",
      render: (v?: string | null) => v ?? "-",
    },
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
      render: (v?: string | null) => v ?? "-",
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (v?: string | null) => getEstadoTag(v),
    },
    {
      title: "Registros validados",
      dataIndex: "totalRegistros",
      key: "totalRegistros",
      align: "right",
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Cantidad final",
      dataIndex: "cantidadFinalTotal",
      key: "cantidadFinalTotal",
      align: "right",
      render: (v: number) => v?.toLocaleString("es-CL") ?? "-",
    },
    {
      title: "",
      key: "accion",
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
  const columnasRegistros: ColumnsType<ClienteRegistroValidado> = [
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      render: (v?: string | null) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
      sorter: (a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""),
    },
    { title: "Tipo", dataIndex: "tipoRegistro", key: "tipoRegistro", render: (v?: string | null) => v ?? "-" },
    { title: "Piso", dataIndex: "piso", key: "piso", render: (v?: string | null) => v ?? "-" },
    { title: "Módulo", dataIndex: "modulo", key: "modulo", render: (v?: string | null) => v ?? "-" },
    { title: "Recinto", dataIndex: "recinto", key: "recinto", render: (v?: string | null) => v ?? "-" },
    { title: "Eje", dataIndex: "eje", key: "eje", render: (v?: string | null) => v ?? "-" },
    { title: "N° Sello", dataIndex: "numeroSello", key: "numeroSello", render: (v?: string | null) => v ?? "-" },
    {
      title: "Cantidad",
      dataIndex: "cantidad",
      key: "cantidad",
      align: "right",
      render: (v?: number | null) => v?.toLocaleString("es-CL") ?? "-",
    },
    {
      title: "Cantidad final",
      dataIndex: "cantidadFinal",
      key: "cantidadFinal",
      align: "right",
      render: (v?: number | null) => v?.toLocaleString("es-CL") ?? "-",
    },
    { title: "Material", dataIndex: "material", key: "material", render: (v?: string | null) => v ?? "-" },
    { title: "Sellador", dataIndex: "sellador", key: "sellador", render: (v?: string | null) => v ?? "-" },
    { title: "Itemizado Beck", dataIndex: "itemizadoBeck", key: "itemizadoBeck", render: (v?: string | null) => v ?? "-" },
    { title: "Itemizado Mandante", dataIndex: "itemizadoMandante", key: "itemizadoMandante", render: (v?: string | null) => v ?? "-" },
    {
      title: "Fotos",
      key: "fotos",
      render: (_: unknown, row: ClienteRegistroValidado) => {
        const fotos = getFotos(row);
        return fotos.length > 0 ? (
          <Badge count={fotos.length} size="small">
            <PictureOutlined style={{ fontSize: 16, color: "#d4a017" }} />
          </Badge>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
  ];

  // ── Encabezado de página con selector admin ──
  const encabezado = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <BuildOutlined style={{ fontSize: 20, color: "#d4a017" }} />
        <Title level={3} style={{ margin: 0 }}>
          {necesitaSelector ? "Vista Cliente" : "Registros de mi empresa"}
        </Title>
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
  if (obraSeleccionada) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {encabezado}

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
              options={tiposUnicos.map((t) => ({ value: t, label: t }))}
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

        <Table
          rowKey="id"
          columns={columnasRegistros}
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

        <Modal
          open={detalle !== null}
          onCancel={() => setDetalle(null)}
          footer={<Button onClick={() => setDetalle(null)}>Cerrar</Button>}
          title="Detalle del registro"
          width={700}
        >
          {detalle && (
            <div className="space-y-4">
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Fecha">
                  {detalle.fecha ? dayjs(detalle.fecha).format("DD/MM/YYYY") : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Tipo">{detalle.tipoRegistro ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Piso">{detalle.piso ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Módulo">{detalle.modulo ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Recinto">{detalle.recinto ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Eje">{detalle.eje ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="N° Sello">{detalle.numeroSello ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Cantidad">
                  {detalle.cantidad?.toLocaleString("es-CL") ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Cantidad final">
                  {detalle.cantidadFinal?.toLocaleString("es-CL") ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Material">{detalle.material ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Sellador">{detalle.sellador ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Itemizado Beck" span={2}>
                  {detalle.itemizadoBeck ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Itemizado Mandante" span={2}>
                  {detalle.itemizadoMandante ?? "-"}
                </Descriptions.Item>
              </Descriptions>

              {getFotos(detalle).length > 0 && (
                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>Fotos</Text>
                  <Image.PreviewGroup>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {getFotos(detalle).map((url, i) => (
                        <Image
                          key={i}
                          src={url}
                          width={120}
                          height={90}
                          style={{ objectFit: "cover", borderRadius: 6 }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAATElEQVRoge3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBxAABHgAAAABJRU5ErkJggg=="
                        />
                      ))}
                    </div>
                  </Image.PreviewGroup>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // ── Vista principal ──
  return (
    <div className="w-full min-w-0 space-y-6">
      {encabezado}

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

      {/* Error de carga */}
      {errorDatos && listoParaCargar && (
        <Alert type="error" message={errorDatos} showIcon closable onClose={() => setErrorDatos(null)} />
      )}

      {/* KPIs */}
      {listoParaCargar && (
        <>
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
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total obras"
                    value={kpisEfectivos.totalObras}
                    prefix={<BuildOutlined />}
                    valueStyle={{ color: "#5b8dd9" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Registros validados"
                    value={kpisEfectivos.totalRegistros}
                    prefix={<FileSearchOutlined />}
                    valueStyle={{ color: "#d4a017" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Cantidad final total"
                    value={kpisEfectivos.cantidadFinalTotal}
                    valueStyle={{ color: "#6abf69" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Registros este mes"
                    value={kpisEfectivos.registrosEsteMes}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: "#e07b54" }}
                  />
                </Card>
              </Col>
            </Row>
          ) : null}

          {/* Gráficos */}
          {kpisEfectivos && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Registros por obra" size="small">
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

              <Col xs={24} lg={12}>
                <Card title="Registros por tipo" size="small">
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

              <Col xs={24} lg={12}>
                <Card title="Registros por piso" size="small">
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

              <Col xs={24} lg={12}>
                <Card title="Registros por fecha" size="small">
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
            </Row>
          )}

          {/* Lista de obras */}
          <Card title="Obras" size="small">
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
        </>
      )}
    </div>
  );
};

export default RegistrosMiEmpresa;
