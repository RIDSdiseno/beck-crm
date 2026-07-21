import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, Empty, Input, Modal, Skeleton, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircleOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { EstadoPreparacionItemizado } from "../services/api";

const { Title, Text } = Typography;

const NOMBRE_MAX_LENGTH = 255;

export type ItemizadoClienteRow = {
  itemizadoOpcionId: string;
  codigoBeck: string | null;
  nombreBeck: string | null;
  nombrePersonalizado: string | null;
  seleccionadoPorCliente: boolean;
};

type EdicionRow = {
  nombrePersonalizado?: string;
  seleccionadoPorCliente?: boolean;
};

export type ItemizadoClienteCambio = {
  itemizadoOpcionId: string;
  nombrePersonalizado?: string | null;
  seleccionadoPorCliente?: boolean;
};

export type ItemizadoClienteGuardarResultado = {
  exitosos: string[];
  fallidos: Array<{ itemizadoOpcionId: string; error: string }>;
};

export type ItemizadoClienteViewProps = {
  modo: "cliente" | "preview";
  obraNombre?: string | null;
  obraCodigo?: string | null;
  estado: EstadoPreparacionItemizado | null;
  itemizados: ItemizadoClienteRow[];
  loading: boolean;
  error?: string | null;
  resetKey: string;
  confirmadoAt?: string | null;
  confirmadoPor?: { nombre?: string | null; email?: string | null } | null;
  onGuardarCambios?: (cambios: ItemizadoClienteCambio[]) => Promise<ItemizadoClienteGuardarResultado>;
  onConfirmar?: () => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

const ItemizadoClienteView: React.FC<ItemizadoClienteViewProps> = ({
  modo,
  obraNombre,
  obraCodigo,
  estado,
  itemizados,
  loading,
  error,
  resetKey,
  confirmadoAt,
  confirmadoPor,
  onGuardarCambios,
  onConfirmar,
  onDirtyChange,
}) => {
  const editable = modo === "cliente" && estado === "EN_REVISION_CLIENTE" && !!onGuardarCambios;

  const [ediciones, setEdiciones] = useState<Record<string, EdicionRow>>({});
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    setEdiciones({});
  }, [resetKey]);

  const filasModificadas = useMemo(
    () =>
      itemizados
        .map((row) => {
          const edicion = ediciones[row.itemizadoOpcionId];
          if (!edicion) return null;

          const cambio: ItemizadoClienteCambio = { itemizadoOpcionId: row.itemizadoOpcionId };
          let cambiado = false;

          if (edicion.nombrePersonalizado !== undefined) {
            const nuevo = edicion.nombrePersonalizado.trim();
            const actual = (row.nombrePersonalizado ?? "").trim();
            if (nuevo !== actual) {
              cambio.nombrePersonalizado = nuevo || null;
              cambiado = true;
            }
          }
          if (edicion.seleccionadoPorCliente !== undefined && edicion.seleccionadoPorCliente !== row.seleccionadoPorCliente) {
            cambio.seleccionadoPorCliente = edicion.seleccionadoPorCliente;
            cambiado = true;
          }

          return cambiado ? cambio : null;
        })
        .filter((c): c is ItemizadoClienteCambio => c !== null),
    [itemizados, ediciones]
  );

  const hayCambiosSinGuardar = filasModificadas.length > 0;

  useEffect(() => {
    onDirtyChange?.(hayCambiosSinGuardar);
  }, [hayCambiosSinGuardar, onDirtyChange]);

  const getValorNombre = (row: ItemizadoClienteRow): string =>
    ediciones[row.itemizadoOpcionId]?.nombrePersonalizado ?? row.nombrePersonalizado ?? "";

  const getValorSeleccion = (row: ItemizadoClienteRow): boolean =>
    ediciones[row.itemizadoOpcionId]?.seleccionadoPorCliente ?? row.seleccionadoPorCliente;

  const handleChangeNombre = (id: string, value: string) => {
    if (!editable) return;
    setEdiciones((prev) => ({ ...prev, [id]: { ...prev[id], nombrePersonalizado: value } }));
  };

  const handleChangeSeleccion = (id: string, checked: boolean) => {
    if (!editable) return;
    setEdiciones((prev) => ({ ...prev, [id]: { ...prev[id], seleccionadoPorCliente: checked } }));
  };

  const handleGuardar = async (): Promise<boolean> => {
    if (!onGuardarCambios || filasModificadas.length === 0 || guardando) return true;
    setGuardando(true);
    try {
      const resultado = await onGuardarCambios(filasModificadas);

      setEdiciones((prev) => {
        const next = { ...prev };
        resultado.exitosos.forEach((id) => delete next[id]);
        return next;
      });

      if (resultado.fallidos.length === 0) {
        void message.success(`${resultado.exitosos.length} cambio(s) guardado(s) correctamente.`);
        return true;
      }

      void message.warning(
        `${resultado.exitosos.length} cambio(s) guardado(s), ${resultado.fallidos.length} fallaron. Corrígelos y vuelve a intentar.`
      );
      return false;
    } catch {
      void message.error("No se pudieron guardar los cambios.");
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarConfirmacion = () => {
    Modal.confirm({
      title: "Confirmar itemizado de la obra",
      content:
        "Al confirmar, solo los itemizados seleccionados quedarán activos para la obra y los nombres definidos pasarán a ser el Itemizado Mandante oficial.",
      okText: "Confirmar itemizado",
      cancelText: "Cancelar",
      onOk: async () => {
        if (!onConfirmar) return;
        setConfirmando(true);
        try {
          await onConfirmar();
          void message.success("El itemizado fue confirmado correctamente.");
        } catch {
          void message.error("No se pudo confirmar el itemizado.");
        } finally {
          setConfirmando(false);
        }
      },
    });
  };

  const handleConfirmarClick = () => {
    if (!onConfirmar) return;

    if (hayCambiosSinGuardar) {
      Modal.confirm({
        title: "Cambios sin guardar",
        content:
          "Tienes cambios sin guardar. ¿Deseas guardarlos antes de confirmar el itemizado?",
        okText: "Guardar y continuar",
        cancelText: "Cancelar",
        onOk: async () => {
          const ok = await handleGuardar();
          if (ok) ejecutarConfirmacion();
        },
      });
      return;
    }

    ejecutarConfirmacion();
  };

  const columns: ColumnsType<ItemizadoClienteRow> = [
    {
      title: "Incluir en el contrato",
      key: "seleccionadoPorCliente",
      width: 150,
      align: "center",
      render: (_: unknown, row: ItemizadoClienteRow) => (
        <Checkbox
          checked={getValorSeleccion(row)}
          disabled={!editable || guardando || confirmando}
          onChange={(e) => handleChangeSeleccion(row.itemizadoOpcionId, e.target.checked)}
        />
      ),
    },
    {
      title: "Código BECK",
      dataIndex: "codigoBeck",
      key: "codigoBeck",
      width: 140,
      render: (v: string | null) => (
        <span className="font-mono text-xs">{v || <Text type="secondary">—</Text>}</span>
      ),
    },
    {
      title: "Itemizado BECK",
      dataIndex: "nombreBeck",
      key: "nombreBeck",
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Itemizado Mandante",
      key: "nombrePersonalizado",
      render: (_: unknown, row: ItemizadoClienteRow) =>
        editable ? (
          <Input
            size="small"
            value={getValorNombre(row)}
            maxLength={NOMBRE_MAX_LENGTH}
            placeholder={row.nombreBeck ?? ""}
            disabled={guardando || confirmando}
            onChange={(e) => handleChangeNombre(row.itemizadoOpcionId, e.target.value)}
          />
        ) : (
          row.nombrePersonalizado || <Text type="secondary">—</Text>
        ),
    },
  ];

  const estadoBadge =
    estado === "EN_REVISION_CLIENTE" ? (
      <Tag color="gold">Pendiente de confirmación</Tag>
    ) : estado === "FINALIZADO" ? (
      <Tag color="green">Itemizado confirmado</Tag>
    ) : null;

  return (
    <div className="space-y-4">
      {modo === "preview" && (
        <Alert type="warning" showIcon message="Vista previa del cliente — Solo lectura" />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Title level={4} style={{ margin: 0 }} className="truncate">
            {obraNombre || "Itemizado de la obra"}
          </Title>
          {obraCodigo && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Código: {obraCodigo}
            </Text>
          )}
        </div>
        {estadoBadge}
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : estado === null || estado === "PREPARACION" ? (
        !error && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Beck aún no ha enviado el itemizado de esta obra para revisión."
          />
        )
      ) : (
        <>
          <Table<ItemizadoClienteRow>
            rowKey="itemizadoOpcionId"
            columns={columns}
            dataSource={itemizados}
            size="small"
            pagination={{ pageSize: 25, showSizeChanger: false }}
            scroll={{ x: 700 }}
            locale={{ emptyText: <Empty description="Sin itemizados" /> }}
          />

          {estado === "FINALIZADO" && confirmadoAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Confirmado el {dayjs(confirmadoAt).format("DD-MM-YYYY HH:mm")}
              {confirmadoPor?.nombre
                ? ` por ${confirmadoPor.nombre}`
                : confirmadoPor?.email
                ? ` por ${confirmadoPor.email}`
                : ""}
            </Text>
          )}

          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button
                icon={<SaveOutlined />}
                loading={guardando}
                disabled={!hayCambiosSinGuardar || confirmando}
                onClick={() => void handleGuardar()}
              >
                Guardar cambios
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={confirmando}
                disabled={guardando}
                onClick={handleConfirmarClick}
              >
                Confirmar itemizado
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ItemizadoClienteView;
