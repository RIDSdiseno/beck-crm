import React, { useEffect, useState } from "react";
import { Button, Image, Modal, Spin, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  inspeccionAPI,
  type ControlInspeccionParametro,
  type EstadoRevisionInspeccion,
  type InspeccionDetalle,
  type InspeccionEstado,
  type ResultadoParametroInspeccion,
} from "../services/api";

interface Props {
  registroId: string | null;
  open: boolean;
  onClose: () => void;
  /** El usuario actual puede confirmar una corrección enviada por el Supervisor. */
  puedeConfirmarCorreccion?: boolean;
  /** Se llama tras confirmar la corrección, para que la tabla que abrió el modal se refresque. */
  onRevisado?: () => void;
}

const revisionLabel: Record<EstadoRevisionInspeccion, string> = {
  pendiente: "Pendiente de revisión",
  validado: "Validada por Ingeniería",
  rechazado: "Rechazada por Ingeniería",
};

const revisionColor: Record<EstadoRevisionInspeccion, string> = {
  pendiente: "gold",
  validado: "green",
  rechazado: "red",
};

const estadoLabel: Record<InspeccionEstado, string> = {
  no_enviado: "No enviado",
  en_inspeccion: "En inspección",
  inspeccionado: "Inspeccionado",
};

const estadoColor: Record<InspeccionEstado, string> = {
  no_enviado: "default",
  en_inspeccion: "gold",
  inspeccionado: "green",
};

const resultadoLabel: Record<ResultadoParametroInspeccion, string> = {
  cumple: "Cumple",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
};

const resultadoColor: Record<ResultadoParametroInspeccion, string> = {
  cumple: "green",
  no_cumple: "red",
  no_aplica: "default",
};

const formatFecha = (value?: string | null): string =>
  value ? dayjs(value).format("DD-MM-YYYY HH:mm") : "-";

const getNombre = (
  aliases: Array<{ id?: string | null; nombre?: string | null } | null | undefined | string | null>
): string | null => {
  for (const value of aliases) {
    if (!value) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "object" && value.nombre) return value.nombre;
  }
  return null;
};

const getFotoUrl = (foto: string | { url?: string | null }): string | null => {
  if (typeof foto === "string") return foto.trim() || null;
  return foto?.url?.trim() || null;
};

const getFotos = (detalle: InspeccionDetalle): string[] => {
  const raw = [
    ...(Array.isArray(detalle.fotos) ? detalle.fotos : []),
    detalle.fotoInspeccionUrl,
    detalle.fotoNoConformidadUrl,
  ];
  return [
    ...new Set(
      raw
        .filter((f): f is string | { url?: string | null } => !!f)
        .map(getFotoUrl)
        .filter((f): f is string => !!f)
    ),
  ];
};

const DetalleInspeccionModal: React.FC<Props> = ({
  registroId,
  open,
  onClose,
  puedeConfirmarCorreccion,
  onRevisado,
}) => {
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<InspeccionDetalle | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const cargarDetalle = async () => {
    if (!registroId) return;
    setLoading(true);
    try {
      const data = await inspeccionAPI.obtenerDetalleInspeccion(registroId);
      setDetalle(data);
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar el detalle de la inspección");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !registroId) {
      setDetalle(null);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const data = await inspeccionAPI.obtenerDetalleInspeccion(registroId);
        if (active) setDetalle(data);
      } catch (error) {
        console.error(error);
        if (active) message.error("No se pudo cargar el detalle de la inspección");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, registroId]);

  const handleConfirmarCorreccion = async () => {
    if (!registroId) return;
    setConfirmando(true);
    try {
      await inspeccionAPI.revisarInspeccion(registroId, "validar");
      message.success("Corrección confirmada");
      await cargarDetalle();
      onRevisado?.();
    } catch (error) {
      console.error(error);
      message.error("No se pudo confirmar la corrección");
    } finally {
      setConfirmando(false);
    }
  };

  const estado = (detalle?.inspeccionEstado ?? "no_enviado") as InspeccionEstado;
  const enviadoPor = detalle ? getNombre([detalle.seleccionadoInspeccionPor]) : null;
  const supervisor = detalle ? getNombre([detalle.supervisorInspeccion]) : null;
  const observaciones = detalle?.observaciones ?? detalle?.observacion ?? null;
  const fotos = detalle ? getFotos(detalle) : [];
  const parametros = detalle?.parametros ?? [];
  const mostrarConfirmarCorreccion =
    !!puedeConfirmarCorreccion &&
    !!detalle?.correccionEnviadaAt &&
    (detalle?.inspeccionRevisionEstado ?? "pendiente") === "pendiente";

  const columnsParametros: ColumnsType<ControlInspeccionParametro> = [
    { title: "#", dataIndex: "orden", key: "orden", width: 44 },
    { title: "Parámetro", dataIndex: "parametro", key: "parametro" },
    {
      title: "Resultado",
      dataIndex: "resultado",
      key: "resultado",
      width: 110,
      render: (val: ResultadoParametroInspeccion) => (
        <Tag color={resultadoColor[val] ?? "default"}>{resultadoLabel[val] ?? val}</Tag>
      ),
    },
    {
      title: "Observación",
      dataIndex: "observacion",
      key: "observacion",
      render: (val?: string | null) => val || "-",
    },
    {
      title: "Corrección del Supervisor",
      dataIndex: "correccionObservacion",
      key: "correccionObservacion",
      render: (val: string | null | undefined, row: ControlInspeccionParametro) => {
        const fotosCorreccion = (row.fotos ?? []).map((f) => f.url).filter(Boolean);
        if (!val && fotosCorreccion.length === 0) return "-";
        return (
          <div className="space-y-1">
            {val && <div>{val}</div>}
            {fotosCorreccion.length > 0 && (
              <Image.PreviewGroup items={fotosCorreccion.map((url) => ({ src: url }))}>
                <div className="flex gap-1">
                  {fotosCorreccion.map((url, i) => (
                    <Image
                      key={url}
                      src={url}
                      alt={`Corrección ${i + 1}`}
                      width={40}
                      height={32}
                      style={{ objectFit: "cover", display: "block" }}
                      wrapperStyle={{ borderRadius: 4, overflow: "hidden", cursor: "zoom-in" }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      title="Detalle de inspección"
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnClose
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            {mostrarConfirmarCorreccion && (
              <Button type="primary" loading={confirmando} onClick={handleConfirmarCorreccion}>
                Confirmar corrección
              </Button>
            )}
          </div>
          <Button type="primary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : !detalle ? (
        <div className="py-6 text-center text-sm text-slate-500">
          No hay información de inspección disponible para este registro.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="col-span-2 flex items-center gap-2">
              <span className="font-medium text-slate-600">Estado:</span>
              <Tag color={estadoColor[estado]}>{estadoLabel[estado]}</Tag>
            </div>
            {enviadoPor && (
              <div>
                <span className="font-medium text-slate-600">Enviado por:</span> {enviadoPor}
              </div>
            )}
            {detalle.fechaSeleccionInspeccion && (
              <div>
                <span className="font-medium text-slate-600">Fecha de envío:</span>{" "}
                {formatFecha(detalle.fechaSeleccionInspeccion)}
              </div>
            )}
            {supervisor && (
              <div>
                <span className="font-medium text-slate-600">Supervisor:</span> {supervisor}
              </div>
            )}
            {detalle.fechaInspeccion && (
              <div>
                <span className="font-medium text-slate-600">Fecha de inspección:</span>{" "}
                {formatFecha(detalle.fechaInspeccion)}
              </div>
            )}
            {(detalle.resultado || detalle.conformidad) && (
              <div className="col-span-2 flex items-center gap-2">
                <span className="font-medium text-slate-600">Resultado:</span>
                {detalle.conformidad ? (
                  <Tag color={detalle.conformidad === "conforme" ? "green" : "red"}>
                    {detalle.conformidad === "conforme" ? "Conforme" : "No conforme"}
                  </Tag>
                ) : (
                  <span>{detalle.resultado}</span>
                )}
              </div>
            )}
            {observaciones && (
              <div className="col-span-2">
                <span className="font-medium text-slate-600">Observaciones:</span> {observaciones}
              </div>
            )}
            {fotos.length > 0 && (
              <div className="col-span-2 space-y-1">
                <span className="font-medium text-slate-600">Fotos:</span>
                <Image.PreviewGroup items={fotos.map((url) => ({ src: url }))}>
                  <div className="relative inline-block">
                    <Image
                      src={fotos[0]}
                      alt="Foto inspección"
                      preview={{ src: fotos[0] }}
                      style={{ height: 160, width: 240, objectFit: "cover", display: "block" }}
                      wrapperStyle={{ display: "block" }}
                    />
                    {fotos.length > 1 && (
                      <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        1 / {fotos.length}
                      </span>
                    )}
                  </div>
                  {fotos.length > 1 && (
                    <div className="mt-1 flex gap-1 overflow-x-auto">
                      {fotos.slice(1).map((url, i) => (
                        <Image
                          key={url}
                          src={url}
                          alt={`Foto ${i + 2}`}
                          preview={{ src: url }}
                          width={64}
                          height={48}
                          style={{ objectFit: "cover", flexShrink: 0, display: "block" }}
                          wrapperStyle={{
                            flexShrink: 0,
                            borderRadius: 4,
                            overflow: "hidden",
                            cursor: "zoom-in",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </Image.PreviewGroup>
              </div>
            )}
          </div>

          {estado === "inspeccionado" && (
            <div className="rounded border border-slate-200 p-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Revisión de Ingeniería:</span>
                <Tag color={revisionColor[detalle.inspeccionRevisionEstado ?? "pendiente"]}>
                  {revisionLabel[detalle.inspeccionRevisionEstado ?? "pendiente"]}
                </Tag>
              </div>
              {detalle.motivoRechazoInspeccion && (
                <div className="mt-2">
                  <span className="font-medium text-slate-600">Motivo de rechazo:</span>{" "}
                  {detalle.motivoRechazoInspeccion}
                </div>
              )}
            </div>
          )}

          {parametros.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-slate-600">
                Checklist / parámetros de inspección
              </div>
              <Table
                size="small"
                columns={columnsParametros}
                dataSource={parametros}
                rowKey={(r) => String(r.id ?? r.orden)}
                pagination={false}
                scroll={{ y: 380 }}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default DetalleInspeccionModal;
