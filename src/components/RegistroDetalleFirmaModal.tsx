import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Descriptions, Image, Modal, Tag, Typography, message } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { clienteAPI, type ClienteRegistroValidado } from "../services/api";

const getErrorStatus = (err: unknown): number | undefined =>
  (err as { response?: { status?: number } })?.response?.status;

const { Text } = Typography;

const getFotos = (r: ClienteRegistroValidado): string[] => {
  const foto = r.foto ?? r.Foto ?? r.fotos;
  if (Array.isArray(foto)) return foto.filter((url): url is string => typeof url === "string" && Boolean(url));
  if (typeof foto === "string" && foto.trim()) return [foto];
  if (Array.isArray(r.fotosUrls) && r.fotosUrls.length > 0) return r.fotosUrls as string[];
  if (r.fotoUrl && typeof r.fotoUrl === "string") return [r.fotoUrl];
  if (Array.isArray(r.fotos_registro)) {
    return (r.fotos_registro as Array<{ url: string }>).map((f) => f.url).filter(Boolean);
  }
  return [];
};

const CANVAS_HEIGHT = 200;
const DEFAULT_CANVAS_WIDTH = 520;
const SIGNATURE_STROKE_WIDTH = 2.5;

type FirmaPayload = { pathData: string; canvasWidth: number; canvasHeight: number };
export type RegistroDetalleVisibleField = { key: string; label: string; value: React.ReactNode };

type Props = {
  open: boolean;
  registro: ClienteRegistroValidado | null;
  visibleFields: RegistroDetalleVisibleField[];
  showFotos: boolean;
  validando: boolean;
  onClose: () => void;
  onConfirmarFirma: (firma: FirmaPayload) => Promise<void>;
};

const RegistroDetalleFirmaModal: React.FC<Props> = ({
  open,
  registro,
  visibleFields,
  showFotos,
  validando,
  onClose,
  onConfirmarFirma,
}) => {
  const [step, setStep] = useState<"detalle" | "firma">("detalle");

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [completedPaths, setCompletedPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const currentPathRef = useRef<string>("");
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [abriendoPdf, setAbriendoPdf] = useState(false);

  const resetFirma = useCallback(() => {
    const activePointerId = activePointerIdRef.current;
    if (activePointerId !== null && svgRef.current) {
      try {
        if (svgRef.current.hasPointerCapture(activePointerId)) {
          svgRef.current.releasePointerCapture(activePointerId);
        }
      } catch {
        // El pointer puede dejar de existir si el modal se cierra durante el trazo.
      }
    }
    setCompletedPaths([]);
    setCurrentPath("");
    currentPathRef.current = "";
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
  }, []);

  const registroId = registro?.id;

  useEffect(() => {
    resetFirma();
    setStep("detalle");
  }, [registroId, resetFirma]);

  useEffect(() => {
    if (open) return;
    resetFirma();
    setStep("detalle");
  }, [open, resetFirma]);


  useEffect(() => {
    if (!open || step !== "firma" || !containerRef.current) return;

    const updateCanvasSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width < 1 || rect.height < 1) return;
      setCanvasSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [open, step]);

  const getPoint = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;

    const rawX = ((e.clientX - rect.left) / rect.width) * canvasSize.width;
    const rawY = ((e.clientY - rect.top) / rect.height) * canvasSize.height;
    const x = Math.min(canvasSize.width, Math.max(0, rawX));
    const y = Math.min(canvasSize.height, Math.max(0, rawY));

    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    isDrawingRef.current = true;

    const point = getPoint(e);
    if (!point) {
      currentPathRef.current = "";
      setCurrentPath("");
      return;
    }
    currentPathRef.current = `M ${point.x} ${point.y}`;
    setCurrentPath(currentPathRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return; // descarta el punto en vez de escribir NaN en el path

    currentPathRef.current = currentPathRef.current
      ? `${currentPathRef.current} L ${point.x} ${point.y}`
      : `M ${point.x} ${point.y}`;
    setCurrentPath(currentPathRef.current);
  };

  const finishStroke = (e?: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    isDrawingRef.current = false;

    const path = currentPathRef.current.trim();
    if (path) {
      setCompletedPaths((prev) => [...prev, path]);
    }
    currentPathRef.current = "";
    activePointerIdRef.current = null;
    setCurrentPath("");
  };

  const visiblePathData = useMemo(
    () => [...completedPaths, currentPath].filter(Boolean).join(" ").trim(),
    [completedPaths, currentPath]
  );
  const pathData = useMemo(() => completedPaths.join(" ").trim(), [completedPaths]);
  const isFirmaVacia = visiblePathData === "";

  const irAFirma = () => {
    resetFirma();
    setStep("firma");
  };
  const volverAlDetalle = () => {
    resetFirma();
    setStep("detalle");
  };

  const handleCerrar = () => {
    if (submitting) return;
    resetFirma();
    setStep("detalle");
    onClose();
  };

  const handleConfirmarFirmaClick = () => {
    if (!pathData) {
      void message.warning("Dibuja tu firma antes de confirmar.");
      return;
    }

    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;

    Modal.confirm({
      title: "Confirmación irreversible",
      content:
        "¿Estás seguro de validar este registro con tu firma? Una vez validado no se podrá deshacer y se generará el PDF final firmado.",
      okText: "Sí, validar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        setSubmitting(true);
        try {
          await onConfirmarFirma({ pathData, canvasWidth, canvasHeight });
          resetFirma();
          setStep("detalle");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  if (!registro) return null;

  const fotos = getFotos(registro);
  const puedeValidar = Boolean(registro.acciones?.puedeValidar);
  const validadoCliente = Boolean(registro.validadoCliente);
  const tienePdfFirmado = Boolean(registro.pdfFirmadoUrl);

  const handleVerPdf = async () => {
    setAbriendoPdf(true);
    try {
      const blob = await clienteAPI.descargarPdfFirmado(registro.id);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      const status = getErrorStatus(err);
      if (status === 403) {
        void message.error("No tienes acceso a este registro.");
      } else if (status === 404) {
        void message.error("Este registro todavía no tiene un PDF firmado.");
      } else {
        void message.error("No se pudo abrir el PDF firmado.");
      }
    } finally {
      setAbriendoPdf(false);
    }
  };

  const footerDetalle = (
    <div className="flex items-center justify-end gap-2">
      {validadoCliente && tienePdfFirmado && (
        <Button loading={abriendoPdf} onClick={() => void handleVerPdf()}>
          Ver PDF
        </Button>
      )}
      {validadoCliente && !tienePdfFirmado && (
        <Tag color="warning">Sin PDF firmado</Tag>
      )}
      {puedeValidar && (
        <Button type="primary" onClick={irAFirma}>
          Validar con firma
        </Button>
      )}
      <Button onClick={handleCerrar}>Cerrar</Button>
    </div>
  );

  const footerFirma = (
    <div className="flex items-center justify-between">
      <Button icon={<ClearOutlined />} onClick={resetFirma} disabled={isFirmaVacia || submitting}>
        Limpiar
      </Button>
      <div className="flex gap-2">
        <Button onClick={volverAlDetalle} disabled={submitting}>
          Volver al detalle
        </Button>
        <Button
          type="primary"
          onClick={handleConfirmarFirmaClick}
          disabled={isFirmaVacia || submitting}
          loading={submitting || validando}
        >
          Confirmar y validar
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={handleCerrar}
      title={step === "detalle" ? "Detalle del registro" : "Firma digital"}
      footer={step === "detalle" ? footerDetalle : footerFirma}
      width={step === "detalle" ? 760 : 560}
      maskClosable={!submitting}
      closable={!submitting}
      destroyOnClose
    >
      {step === "detalle" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color="green">Validado por Ingeniería</Tag>
            {validadoCliente ? (
              <Tag color="blue">Validado por cliente</Tag>
            ) : (
              <Tag color="default">Pendiente de validación del cliente</Tag>
            )}
            {registro.validadoClienteAt && (
              <Text type="secondary" className="text-xs">
                {dayjs(registro.validadoClienteAt).format("DD/MM/YYYY HH:mm")}
              </Text>
            )}
          </div>

          <Descriptions bordered size="small" column={2}>
            {visibleFields.map((field) => (
              <Descriptions.Item key={field.key} label={field.label}>
                {field.value}
              </Descriptions.Item>
            ))}
          </Descriptions>

          {showFotos ? (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Fotos
              </Text>
              {fotos.length > 0 ? (
                <Image.PreviewGroup>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {fotos.map((url, i) => (
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
              ) : (
                <Text type="secondary" className="mt-2 block text-xs">
                  Sin fotos asociadas.
                </Text>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <Text type="secondary" className="block text-sm">
            Dibuja tu firma en el recuadro con el mouse o el dedo para validar.
          </Text>

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            Esta acción es irreversible. Al confirmar, el registro quedará validado y se generará el PDF firmado.
          </div>

          <div
            ref={containerRef}
            style={{
              height: CANVAS_HEIGHT,
              border: "1.5px solid #cbd5e1",
              borderRadius: 12,
              background: "#ffffff",
              touchAction: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg
              ref={svgRef}
              width={canvasSize.width}
              height={canvasSize.height}
              viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
              preserveAspectRatio="none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerLeave={finishStroke}
              onPointerCancel={finishStroke}
              style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair", touchAction: "none" }}
            >
              {completedPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke="#111827"
                  strokeWidth={SIGNATURE_STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {currentPath ? (
                <path
                  d={currentPath}
                  stroke="#111827"
                  strokeWidth={SIGNATURE_STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>
            {isFirmaVacia ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Text type="secondary" className="text-sm">
                  Firme aquí
                </Text>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default RegistroDetalleFirmaModal;
