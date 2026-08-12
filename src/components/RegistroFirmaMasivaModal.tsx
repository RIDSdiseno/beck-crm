import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input, List, Modal, Typography, message } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ClienteRegistroValidado } from "../services/api";

const { Text } = Typography;

const CANVAS_HEIGHT = 200;
const DEFAULT_CANVAS_WIDTH = 520;
const SIGNATURE_STROKE_WIDTH = 2.5;

type FirmaPayload = { nombreFirmanteCliente: string; pathData: string; canvasWidth: number; canvasHeight: number };

type Props = {
  open: boolean;
  registros: ClienteRegistroValidado[];
  registrosOmitidos?: ClienteRegistroValidado[];
  procesando: boolean;
  onClose: () => void;
  onConfirmarFirma: (firma: FirmaPayload) => Promise<void>;
};

const getRegistroLabel = (r: ClienteRegistroValidado): string => {
  const codigo = (r.codigoBeck as string | undefined) ?? (r.folio as string | undefined) ?? r.id.slice(0, 8);
  const fecha = r.fecha ? dayjs.utc(r.fecha as string).format("DD/MM/YYYY") : "-";
  const sellador = (r.nombreSellador as string | undefined) ?? (r.sellador as string | undefined) ?? "-";
  return `${codigo} · ${fecha} · ${sellador}`;
};

const RegistroFirmaMasivaModal: React.FC<Props> = ({
  open,
  registros,
  registrosOmitidos = [],
  procesando,
  onClose,
  onConfirmarFirma,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [completedPaths, setCompletedPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const currentPathRef = useRef<string>("");
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nombreFirmante, setNombreFirmante] = useState("");

  const liberarCapturaPointer = useCallback(() => {
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
  }, []);

  const limpiarDibujo = useCallback(() => {
    liberarCapturaPointer();
    setCompletedPaths([]);
    setCurrentPath("");
    currentPathRef.current = "";
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
  }, [liberarCapturaPointer]);

  const resetFirma = useCallback(() => {
    limpiarDibujo();
    setNombreFirmante("");
  }, [limpiarDibujo]);

  useEffect(() => {
    if (open) return;
    resetFirma();
  }, [open, resetFirma]);

  useEffect(() => {
    if (!open || !containerRef.current) return;

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
  }, [open]);

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
    if (!point) return;

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

  const visiblePathData = [...completedPaths, currentPath].filter(Boolean).join(" ").trim();
  const pathData = completedPaths.join(" ").trim();
  const isFirmaVacia = visiblePathData === "";
  const nombreFirmanteLimpio = nombreFirmante.trim();
  const isNombreFirmanteVacio = nombreFirmanteLimpio === "";

  const handleCerrar = () => {
    if (submitting || procesando) return;
    resetFirma();
    onClose();
  };

  const handleConfirmarClick = () => {
    if (!nombreFirmanteLimpio) {
      void message.warning("Ingresa el nombre del firmante antes de confirmar.");
      return;
    }

    if (!pathData) {
      void message.warning("Dibuja tu firma antes de confirmar.");
      return;
    }

    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;
    const n = registros.length;

    Modal.confirm({
      title: "Confirmación irreversible",
      content:
        `¿Estás seguro de validar estos ${n} registros a nombre de "${nombreFirmanteLimpio}"? ` +
        "Una vez validados no se podrá deshacer y se generará un PDF firmado individual para cada uno.",
      okText: "Sí, validar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        setSubmitting(true);
        try {
          await onConfirmarFirma({
            nombreFirmanteCliente: nombreFirmanteLimpio,
            pathData,
            canvasWidth,
            canvasHeight,
          });
          resetFirma();
        } catch {
          // Si falla, mantenemos la firma dibujada para reintentar sin firmar de nuevo.
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const loading = submitting || procesando;

  return (
    <Modal
      open={open}
      onCancel={handleCerrar}
      title="Firmar registros seleccionados"
      width="92vw"
      style={{ maxWidth: 560 }}
      styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
      maskClosable={!loading}
      closable={!loading}
      destroyOnClose
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button icon={<ClearOutlined />} onClick={limpiarDibujo} disabled={isFirmaVacia || loading}>
            Limpiar firma
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleCerrar} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="primary"
              onClick={handleConfirmarClick}
              disabled={isNombreFirmanteVacio || isFirmaVacia || loading}
              loading={loading}
            >
              Confirmar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <div>
            Esta firma se aplicará a {registros.length} registro{registros.length !== 1 ? "s" : ""} pendiente
            {registros.length !== 1 ? "s" : ""}. Esta acción es irreversible: se generará un PDF firmado individual
            por cada registro.
          </div>
          {registrosOmitidos.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {registrosOmitidos.length} registro{registrosOmitidos.length !== 1 ? "s" : ""} ya
              {registrosOmitidos.length !== 1 ? " estaban firmados" : " estaba firmado"} y
              {registrosOmitidos.length !== 1 ? " serán omitidos" : " será omitido"}.
            </div>
          )}
        </div>

        <List
          size="small"
          bordered
          dataSource={registros}
          style={{ maxHeight: 180, overflowY: "auto" }}
          renderItem={(r) => (
            <List.Item>
              <Text style={{ fontSize: 12 }}>{getRegistroLabel(r)}</Text>
            </List.Item>
          )}
        />

        <Text type="secondary" className="block text-sm">
          Dibuja tu firma en el recuadro con el mouse o el dedo para validar.
        </Text>

        <div>
          <Text strong style={{ display: "block", marginBottom: 6 }}>
            Nombre del firmante
          </Text>

          <Input
            value={nombreFirmante}
            onChange={(event) => setNombreFirmante(event.target.value)}
            placeholder="Ej: Juan Pérez"
            maxLength={255}
            showCount
            disabled={loading}
            autoComplete="name"
          />

          <Text type="secondary" className="mt-1 block text-xs">
            Escribe el nombre completo de la persona que realizará la firma.
          </Text>
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
    </Modal>
  );
};

export default RegistroFirmaMasivaModal;
