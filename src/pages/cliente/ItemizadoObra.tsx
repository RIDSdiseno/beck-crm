import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, Empty, Select, Skeleton, Space, Typography, message, Modal } from "antd";
import { BuildOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import {
  clienteAPI,
  type ClienteObraResumen,
  type EstadoPreparacionItemizado,
  type ItemizadoPropuestoCliente,
} from "../../services/api";
import ItemizadoClienteView, {
  type ItemizadoClienteCambio,
  type ItemizadoClienteRow,
} from "../../components/ItemizadoClienteView";

const { Title, Text } = Typography;

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || fallback;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
};

const toRow = (item: ItemizadoPropuestoCliente): ItemizadoClienteRow => ({
  itemizadoOpcionId: item.itemizadoOpcionId,
  codigoBeck: item.codigoBeck,
  nombreBeck: item.nombreBeck,
  nombrePersonalizado: item.nombrePersonalizado,
  seleccionadoPorCliente: item.seleccionadoPorCliente,
});

const ItemizadoObra: React.FC = () => {
  const [obras, setObras] = useState<ClienteObraResumen[]>([]);
  const [loadingObras, setLoadingObras] = useState(false);
  const [obraId, setObraId] = useState<string | undefined>();

  const [estado, setEstado] = useState<EstadoPreparacionItemizado | null>(null);
  const [itemizados, setItemizados] = useState<ItemizadoPropuestoCliente[]>([]);
  const [loadingItemizados, setLoadingItemizados] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmadoAt, setConfirmadoAt] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    setLoadingObras(true);
    clienteAPI
      .obras()
      .then((data) => {
        setObras(data);
        if (data.length === 1) setObraId(data[0].id);
      })
      .catch((err) => void message.error(getErrorMessage(err, "No se pudieron cargar las obras")))
      .finally(() => setLoadingObras(false));
  }, []);

  // Avisa antes de cerrar/recargar la pestaña si hay nombres editados sin guardar.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const cargarItemizados = useCallback(async (id: string) => {
    setLoadingItemizados(true);
    setError(null);
    try {
      const resp = await clienteAPI.obtenerItemizados(id);
      setEstado(resp.obra.estadoPreparacionItemizado);
      setItemizados(resp.data);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el itemizado de la obra"));
      setEstado(null);
      setItemizados([]);
    } finally {
      setLoadingItemizados(false);
    }
  }, []);

  useEffect(() => {
    if (obraId) void cargarItemizados(obraId);
  }, [obraId, cargarItemizados]);

  const cambiarObra = (nextId: string) => setObraId(nextId);

  const handleSelectObra = (nextId: string) => {
    if (nextId === obraId) return;
    if (dirty) {
      Modal.confirm({
        title: "Cambios sin guardar",
        content:
          "Tienes nombres editados sin guardar en esta obra. Si cambias de obra, esos cambios se perderán.",
        okText: "Descartar y cambiar",
        cancelText: "Cancelar",
        onOk: () => cambiarObra(nextId),
      });
      return;
    }
    cambiarObra(nextId);
  };

  const handleGuardarCambios = useCallback(
    async (cambios: ItemizadoClienteCambio[]) => {
      if (!obraId) {
        return {
          exitosos: [],
          fallidos: cambios.map((c) => ({
            itemizadoOpcionId: c.itemizadoOpcionId,
            error: "No hay una obra seleccionada",
          })),
        };
      }

      const exitosos: string[] = [];
      const fallidos: Array<{ itemizadoOpcionId: string; error: string }> = [];

      for (const cambio of cambios) {
        try {
          // Solo se envían los campos que realmente cambiaron en esta fila.
          const payload: { nombrePersonalizado?: string | null; seleccionadoPorCliente?: boolean } = {};
          if (cambio.nombrePersonalizado !== undefined) payload.nombrePersonalizado = cambio.nombrePersonalizado;
          if (cambio.seleccionadoPorCliente !== undefined) payload.seleccionadoPorCliente = cambio.seleccionadoPorCliente;

          const resultado = await clienteAPI.actualizarItemizadoCliente(
            obraId,
            cambio.itemizadoOpcionId,
            payload
          );
          exitosos.push(cambio.itemizadoOpcionId);
          setItemizados((prev) =>
            prev.map((item) =>
              item.itemizadoOpcionId === cambio.itemizadoOpcionId
                ? {
                    ...item,
                    nombrePersonalizado: resultado.nombrePersonalizado,
                    seleccionadoPorCliente: resultado.seleccionadoPorCliente,
                  }
                : item
            )
          );
        } catch (err) {
          fallidos.push({
            itemizadoOpcionId: cambio.itemizadoOpcionId,
            error: getErrorMessage(err, "Error desconocido"),
          });
        }
      }

      return { exitosos, fallidos };
    },
    [obraId]
  );

  const handleConfirmar = useCallback(async () => {
    if (!obraId) return;
    const resultado = await clienteAPI.confirmarItemizado(obraId);
    setConfirmadoAt(resultado.itemizadoFinalizadoAt ?? null);
    await cargarItemizados(obraId);
  }, [obraId, cargarItemizados]);

  const obraSeleccionada = obras.find((o) => o.id === obraId);
  const rows = itemizados.map(toRow);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex items-center gap-3">
        <BuildOutlined style={{ fontSize: 20, color: "#d4a017" }} />
        <Title level={3} style={{ margin: 0 }}>
          Itemizado de la obra
        </Title>
      </div>

      {obras.length > 1 && (
        <Card size="small" style={{ maxWidth: 640 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Selecciona la obra cuyo itemizado quieres revisar.
            </Text>
            <Select
              showSearch
              loading={loadingObras}
              placeholder="Seleccionar obra"
              style={{ width: "100%" }}
              value={obraId}
              onChange={handleSelectObra}
              filterOption={(input, opt) =>
                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={obras.map((o) => ({
                value: o.id,
                label: o.codigo ? `${o.nombre} (${o.codigo})` : o.nombre,
              }))}
            />
          </Space>
        </Card>
      )}

      {loadingObras ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : obras.length === 0 ? (
        <Card>
          <Empty description="No tienes obras asignadas." />
        </Card>
      ) : !obraId ? (
        <Card>
          <Empty description="Selecciona una obra para ver su itemizado." />
        </Card>
      ) : (
        <ItemizadoClienteView
          modo="cliente"
          obraNombre={obraSeleccionada?.nombre}
          obraCodigo={obraSeleccionada?.codigo}
          estado={estado}
          itemizados={rows}
          loading={loadingItemizados}
          error={error}
          resetKey={`${obraId}:${estado ?? ""}`}
          confirmadoAt={confirmadoAt}
          onGuardarCambios={handleGuardarCambios}
          onConfirmar={handleConfirmar}
          onDirtyChange={setDirty}
        />
      )}
    </div>
  );
};

export default ItemizadoObra;
