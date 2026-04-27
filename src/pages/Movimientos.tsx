import React, { useEffect, useMemo, useState } from "react";
import { Button, Empty, Select, Spin, Tag, message } from "antd";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  FunnelPlotOutlined,
  HomeOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  movimientosCrmAPI,
  type MovimientoCRMRecord,
} from "../services/api";

const moduloOptions = [
  { label: "Todos", value: "" },
  { label: "Funnel", value: "FUNNEL" },
  { label: "Cotizaciones", value: "COTIZACION" },
  { label: "Usuarios", value: "USUARIO" },
  { label: "Obras", value: "OBRA" },
];

const moduloLabel: Record<string, string> = {
  FUNNEL: "Funnel",
  COTIZACION: "Cotización",
  USUARIO: "Usuario",
  OBRA: "Obra",
};

const tipoLabel: Record<string, string> = {
  OPORTUNIDAD_CREADA: "Oportunidad creada",
  OPORTUNIDAD_EDITADA: "Oportunidad editada",
  ETAPA_MODIFICADA: "Etapa modificada",
  OPORTUNIDAD_ELIMINADA: "Oportunidad eliminada",
  COTIZACION_CREADA: "Cotización creada",
  COTIZACION_EDITADA: "Cotización editada",
  COTIZACION_ENVIADA: "Cotización enviada",
  COTIZACION_ACEPTADA: "Cotización aceptada",
  COTIZACION_RECHAZADA: "Cotización rechazada",
  COTIZACION_ELIMINADA: "Cotización eliminada",
  USUARIO_CREADO: "Usuario creado",
  USUARIO_ACTIVADO: "Usuario activado",
  USUARIO_DESACTIVADO: "Usuario desactivado",
  ROL_CAMBIADO: "Rol cambiado",
  OBRA_CREADA: "Obra creada",
};

const getModuloIcon = (modulo: string) => {
  if (modulo === "COTIZACION") return <FileTextOutlined />;
  if (modulo === "FUNNEL") return <FunnelPlotOutlined />;
  if (modulo === "USUARIO") return <UserOutlined />;
  if (modulo === "OBRA") return <HomeOutlined />;
  return <ClockCircleOutlined />;
};

const getModuloColor = (modulo: string) => {
  if (modulo === "COTIZACION") return "blue";
  if (modulo === "FUNNEL") return "gold";
  if (modulo === "USUARIO") return "purple";
  if (modulo === "OBRA") return "green";
  return "default";
};

const formatDate = (value: string) => {
  const date = dayjs(value);
  return date.isValid() ? date.format("HH:mm") : "-";
};

const formatDay = (value: string) => {
  const date = dayjs(value);
  if (!date.isValid()) return "Sin fecha";

  if (date.isSame(dayjs(), "day")) return "Hoy";
  if (date.isSame(dayjs().subtract(1, "day"), "day")) return "Ayer";

  return date.format("DD-MM-YYYY");
};

const formatDescription = (descripcion: string) => {
  return descripcion.replace(/\$([0-9]+)\.00/g, (_, amount: string) => {
    const value = Number(amount);
    return `$${value.toLocaleString("es-CL")}`;
  });
};

const groupByDay = (items: MovimientoCRMRecord[]) => {
  return items.reduce<Record<string, MovimientoCRMRecord[]>>((acc, item) => {
    const key = formatDay(item.createdAt);
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});
};

const MovimientosPage: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoCRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modulo, setModulo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 30;

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      ...(modulo ? { modulo } : {}),
    }),
    [page, modulo]
  );

  const movimientosPorDia = useMemo(
    () => groupByDay(movimientos),
    [movimientos]
  );

  const loadMovimientos = async () => {
    try {
      setLoading(true);
      const response = await movimientosCrmAPI.listar(queryParams);
      setMovimientos(response.items);
      setTotalPages(response.pagination.totalPages || 1);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los movimientos"
      );
      setMovimientos([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMovimientos();
  }, [queryParams]);

  return (
    <div className="space-y-5">
      <section className="beck-panel-soft">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="beck-badge">
              <span className="inline-flex h-2 w-2 rounded-full bg-beck-primary" />
              <span>Auditoría CRM</span>
            </div>

            <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
              Movimientos
            </h1>

            <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
              Historial real de acciones realizadas en oportunidades,
              cotizaciones y usuarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={modulo}
              onChange={(value) => {
                setModulo(value);
                setPage(1);
              }}
              options={moduloOptions}
              style={{ width: 180 }}
            />

            <Button
              icon={<ReloadOutlined />}
              onClick={() => void loadMovimientos()}
              loading={loading}
            >
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      <section className="beck-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : movimientos.length ? (
          <div className="space-y-6 p-5">
            {Object.entries(movimientosPorDia).map(([day, items]) => (
              <div key={day}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    {day}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="relative space-y-3 border-l border-slate-200 pl-5">
                  {items.map((movimiento) => (
                    <article
                      key={movimiento.id}
                      className="relative rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-yellow-300 hover:shadow-md"
                    >
                      <span className="absolute -left-[27px] top-4 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-yellow-400 shadow" />

                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">
                              <ClockCircleOutlined className="mr-1" />
                              {formatDate(movimiento.createdAt)}
                            </span>

                            <Tag
                              color={getModuloColor(movimiento.modulo)}
                              icon={getModuloIcon(movimiento.modulo)}
                            >
                              {moduloLabel[movimiento.modulo] ||
                                movimiento.modulo}
                            </Tag>

                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {tipoLabel[movimiento.tipo] || movimiento.tipo}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-slate-800">
                            {formatDescription(movimiento.descripcion)}
                          </p>

                          <p className="text-xs text-slate-500">
                            Usuario:{" "}
                            <span className="font-medium text-slate-700">
                              {movimiento.usuario?.nombre || "Sin usuario"}
                            </span>
                            {movimiento.usuario?.email
                              ? ` · ${movimiento.usuario.email}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12">
            <Empty description="Aún no hay movimientos registrados" />
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Anterior
        </Button>

        <span className="text-xs text-slate-500">
          Página {page} de {totalPages}
        </span>

        <Button
          disabled={page >= totalPages || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
};

export default MovimientosPage;