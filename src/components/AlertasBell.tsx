import React, { useState } from "react";
import {
  BellOutlined,
  ReloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Collapse,
  Drawer,
  Empty,
  Spin,
  Tag,
  Tabs,
  Typography,
  Tooltip,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useAlertasBeck } from "../hooks/useAlertasBeck";
import { useAlertasFiremat } from "../hooks/useAlertasFiremat";

const { Text } = Typography;

const SEVERIDAD_COLOR: Record<string, string> = {
  ALTA: "red",
  MEDIA: "orange",
  BAJA: "blue",
};

type AlertaItem = {
  alertaKey: string;
  titulo: string;
  descripcion: string;
  responsable: string | null;
  severidad: "ALTA" | "MEDIA" | "BAJA";
  fechaReferencia?: string | null;
  categoria?: "FUNNEL" | "COTIZACION" | "HERRAMIENTA";
  oportunidadId?: string | number;
  cotizacionId?: string | number;
  herramientaId?: string | number;
};

const DRAWER_WIDTH = "min(420px, 92vw)";

const getBadgeColor = (nuevas: AlertaItem[]): string | undefined => {
  if (nuevas.some((a) => a.severidad === "ALTA")) return "#ef4444";
  if (nuevas.some((a) => a.severidad === "MEDIA")) return "#f59e0b";
  return undefined;
};

interface AlertaCardProps {
  alerta: AlertaItem;
  esNueva: boolean;
  onMarcarVista: (key: string) => void;
  onVerOportunidad: (alerta: AlertaItem) => void;
}

const AlertaCard: React.FC<AlertaCardProps> = ({
  alerta,
  esNueva,
  onMarcarVista,
  onVerOportunidad,
}) => (
  <div
    style={{
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: "12px 14px",
      marginBottom: 10,
      background: esNueva ? "#fffbeb" : "#f9fafb",
    }}
  >
    <div
      style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}
    >
      <Tag color={SEVERIDAD_COLOR[alerta.severidad] ?? "default"}>
        {alerta.severidad}
      </Tag>
      <Text strong style={{ flex: 1, fontSize: 13 }}>
        {alerta.titulo}
      </Text>
    </div>

    <Text
      type="secondary"
      style={{ fontSize: 12, display: "block", marginBottom: 4 }}
    >
      {alerta.descripcion}
    </Text>

    {alerta.responsable && (
      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
        Responsable: {alerta.responsable}
      </Text>
    )}

    {alerta.fechaReferencia && (
      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
        Fecha ref.:{" "}
        {new Date(alerta.fechaReferencia).toLocaleDateString("es-CL")}
      </Text>
    )}

    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
      <Button
        size="small"
        icon={<EyeOutlined />}
        onClick={() => onVerOportunidad(alerta)}
      >
        {alerta.categoria === "COTIZACION" ? "Ver cotización" : "Ver oportunidad"}
      </Button>
      {esNueva && (
        <Button
          size="small"
          type="text"
          onClick={() => onMarcarVista(alerta.alertaKey)}
        >
          Marcar como vista
        </Button>
      )}
    </div>
  </div>
);


type GrupoAlertaDef = {
  key: string;
  titulo: string;
  descripcion: string;
  filtro: (alerta: AlertaItem) => boolean;
};

const renderGrupoLabel = (titulo: string, descripcion: string, cantidad: number) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
    <div>
      <Text strong style={{ fontSize: 13 }}>{titulo}</Text>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>{descripcion}</Text>
      </div>
    </div>
    <Tag>{cantidad}</Tag>
  </div>
);

const renderAlertasAgrupadas = (
  alertas: AlertaItem[],
  esNueva: boolean,
  grupos: GrupoAlertaDef[],
  marcarVista: (key: string) => void,
  onVerAlerta: (alerta: AlertaItem) => void
) => {
  if (alertas.length === 0) {
    return (
      <Empty
        description={esNueva ? "Sin alertas nuevas" : "Sin alertas vistas"}
        imageStyle={{ height: 48 }}
      />
    );
  }

  const renderLista = (lista: AlertaItem[]) =>
    lista.length === 0 ? (
      <Empty description="Sin alertas" imageStyle={{ height: 32 }} />
    ) : (
      lista.map((a) => (
        <AlertaCard
          key={a.alertaKey}
          alerta={a}
          esNueva={esNueva}
          onMarcarVista={marcarVista}
          onVerOportunidad={onVerAlerta}
        />
      ))
    );

  return (
    <Collapse
      defaultActiveKey={grupos.map((g) => g.key)}
      items={grupos.map((g) => {
        const lista = alertas.filter(g.filtro);
        return {
          key: g.key,
          label: renderGrupoLabel(g.titulo, g.descripcion, lista.length),
          children: renderLista(lista),
        };
      })}
    />
  );
};

export const AlertasBeckBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { nuevas, vistas, loading, error, recargar, marcarVista, marcarTodasVistas } =
    useAlertasBeck();

  const badgeColor = getBadgeColor(nuevas);

  const handleVerAlerta = async (alerta: AlertaItem) => {
    await marcarVista([alerta.alertaKey]);
    setOpen(false);
    if (alerta.categoria === "HERRAMIENTA") {
      navigate("/beck/inventario", {
        state: {
          herramientaId: alerta.herramientaId,
          openFromAlert: true,
          alertNavigationTs: Date.now(),
        },
      });
      return;
    }
    navigate("/beck/funnel", {
      state: {
        oportunidadId: alerta.oportunidadId,
        openFromAlert: true,
        alertNavigationTs: Date.now(),
      },
    });
  };

  const GRUPOS_BECK: GrupoAlertaDef[] = [
    {
      key: "funnel",
      titulo: "Oportunidades (Funnel)",
      descripcion: "Seguimiento comercial de oportunidades.",
      filtro: (a) => a.categoria !== "HERRAMIENTA",
    },
    {
      key: "herramientas",
      titulo: "Herramientas",
      descripcion: "Mantenciones por vencer o vencidas.",
      filtro: (a) => a.categoria === "HERRAMIENTA",
    },
  ];

  const tabItems = [
    {
      key: "nuevas",
      label: `Nuevas (${nuevas.length})`,
      children: renderAlertasAgrupadas(
        nuevas,
        true,
        GRUPOS_BECK,
        (key) => marcarVista([key]),
        handleVerAlerta
      ),
    },
    {
      key: "vistas",
      label: `Vistas (${vistas.length})`,
      children: renderAlertasAgrupadas(
        vistas,
        false,
        GRUPOS_BECK,
        () => undefined,
        handleVerAlerta
      ),
    },
  ];

  return (
    <>
      <Tooltip title={error ? "Error al cargar alertas" : "Alertas BECK"}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          style={{
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: 8,
            background: "white",
            border: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <Badge
            count={nuevas.length}
            overflowCount={99}
            style={badgeColor ? { backgroundColor: badgeColor } : undefined}
            showZero={false}
          >
            <BellOutlined
              style={{
                fontSize: 18,
                color: error ? "#94a3b8" : "#374151",
              }}
            />
          </Badge>
        </div>
      </Tooltip>

      <Drawer
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Alertas comerciales BECK</span>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              type="text"
              onClick={recargar}
              loading={loading}
            >
              Recargar
            </Button>
          </div>
        }
        placement="right"
        width={DRAWER_WIDTH}
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: "12px 16px" } }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <>
            {nuevas.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Button block onClick={marcarTodasVistas}>
                  Marcar todas como vistas
                </Button>
              </div>
            )}
            <Tabs defaultActiveKey="nuevas" items={tabItems} />
          </>
        )}
      </Drawer>
    </>
  );
};


export const AlertasFirematBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { nuevas, vistas, loading, error, recargar, marcarVista, marcarTodasVistas } =
    useAlertasFiremat();

  const badgeColor = getBadgeColor(nuevas);

  const handleVerAlerta = async (alerta: AlertaItem) => {
    await marcarVista([alerta.alertaKey]);
    setOpen(false);
    if (alerta.categoria === "COTIZACION") {
      navigate("/firemat/cotizaciones", {
        state: {
          cotizacionId: alerta.cotizacionId,
          openFromAlert: true,
          alertNavigationTs: Date.now(),
        },
      });
      return;
    }
    navigate("/firemat/funnel", {
      state: {
        oportunidadId: alerta.oportunidadId,
        openFromAlert: true,
        alertNavigationTs: Date.now(),
      },
    });
  };

  const GRUPOS_FIREMAT: GrupoAlertaDef[] = [
    {
      key: "funnel",
      titulo: "Oportunidades (Funnel)",
      descripcion: "Seguimiento comercial de oportunidades.",
      filtro: (a) => a.categoria !== "COTIZACION",
    },
    {
      key: "cotizaciones",
      titulo: "Cotizaciones",
      descripcion: "Vencimiento y stock reservado.",
      filtro: (a) => a.categoria === "COTIZACION",
    },
  ];

  const tabItems = [
    {
      key: "nuevas",
      label: `Nuevas (${nuevas.length})`,
      children: renderAlertasAgrupadas(
        nuevas,
        true,
        GRUPOS_FIREMAT,
        (key) => marcarVista([key]),
        handleVerAlerta
      ),
    },
    {
      key: "vistas",
      label: `Vistas (${vistas.length})`,
      children: renderAlertasAgrupadas(
        vistas,
        false,
        GRUPOS_FIREMAT,
        () => undefined,
        handleVerAlerta
      ),
    },
  ];

  return (
    <>
      <Tooltip title={error ? "Error al cargar alertas" : "Alertas Firemat"}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          style={{
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: 8,
            background: "white",
            border: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <Badge
            count={nuevas.length}
            overflowCount={99}
            style={badgeColor ? { backgroundColor: badgeColor } : undefined}
            showZero={false}
          >
            <BellOutlined
              style={{
                fontSize: 18,
                color: error ? "#94a3b8" : "#f97316",
              }}
            />
          </Badge>
        </div>
      </Tooltip>

      <Drawer
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Alertas comerciales Firemat</span>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              type="text"
              onClick={recargar}
              loading={loading}
            >
              Recargar
            </Button>
          </div>
        }
        placement="right"
        width={DRAWER_WIDTH}
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: "12px 16px" } }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <>
            {nuevas.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Button block onClick={marcarTodasVistas}>
                  Marcar todas como vistas
                </Button>
              </div>
            )}
            <Tabs defaultActiveKey="nuevas" items={tabItems} />
          </>
        )}
      </Drawer>
    </>
  );
};

export const AlertasBell = AlertasBeckBell;
