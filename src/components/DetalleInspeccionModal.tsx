import React, { useEffect, useState } from "react";
import { Button, Input, Modal, Spin, Table, Tag, message } from "antd";
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
  /** El usuario actual puede validar/rechazar el resultado de la inspección. */
  puedeRevisar?: boolean;
  /** Se llama tras validar o rechazar, para que la tabla que abrió el modal se refresque. */
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
  puedeRevisar,
  onRevisado,
}) => {
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<InspeccionDetalle | null>(null);
  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [enviando, setEnviando] = useState(false);

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
      setMostrarMotivo(false);
      setMotivoRechazo("");
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

  const handleValidar = async () => {
    if (!registroId) return;
    setEnviando(true);
    try {
      await inspeccionAPI.revisarInspeccion(registroId, "validar");
      message.success("Inspección validada");
      await cargarDetalle();
      onRevisado?.();
    } catch (error) {
      console.error(error);
      message.error("No se pudo validar la inspección");
    } finally {
      setEnviando(false);
    }
  };

  const handleRechazar = async () => {
    if (!registroId) return;
    if (!motivoRechazo.trim()) {
      message.error("Indica el motivo del rechazo");
      return;
    }
    setEnviando(true);
    try {
      await inspeccionAPI.revisarInspeccion(registroId, "rechazar", motivoRechazo.trim());
      message.success("Inspección rechazada, vuelve a la cola del supervisor");
      setMostrarMotivo(false);
      setMotivoRechazo("");
      onRevisado?.();
      onClose();
    } catch (error) {
      console.error(error);
      message.error("No se pudo rechazar la inspección");
    } finally {
      setEnviando(false);
    }
  };

  const estado = (detalle?.inspeccionEstado ?? "no_enviado") as InspeccionEstado;
  const enviadoPor = detalle ? getNombre([detalle.seleccionadoInspeccionPor]) : null;
  const supervisor = detalle ? getNombre([detalle.supervisorInspeccion]) : null;
  const observaciones = detalle?.observaciones ?? detalle?.observacion ?? null;
  const fotos = detalle ? getFotos(detalle) : [];
  const parametros = detalle?.parametros ?? [];

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
  ];

  return (
    <Modal
      title="Detalle de inspección"
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="Cerrar"
      cancelButtonProps={{ style: { display: "none" } }}
      width={720}
      destroyOnClose
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
                <div className="flex flex-wrap gap-2">
                  {fotos.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt="Foto inspección"
                        className="h-16 w-24 rounded border border-slate-200 object-cover"
                      />
                    </a>
                  ))}
                </div>
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

              {puedeRevisar && (detalle.inspeccionRevisionEstado ?? "pendiente") === "pendiente" && (
                <div className="mt-3 space-y-2">
                  {!mostrarMotivo ? (
                    <div className="flex gap-2">
                      <Button type="primary" loading={enviando} onClick={handleValidar}>
                        Validar inspección
                      </Button>
                      <Button danger disabled={enviando} onClick={() => setMostrarMotivo(true)}>
                        Rechazar inspección
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input.TextArea
                        rows={2}
                        placeholder="Motivo del rechazo (obligatorio)"
                        value={motivoRechazo}
                        onChange={(e) => setMotivoRechazo(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button danger loading={enviando} onClick={handleRechazar}>
                          Confirmar rechazo
                        </Button>
                        <Button
                          disabled={enviando}
                          onClick={() => {
                            setMostrarMotivo(false);
                            setMotivoRechazo("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
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
