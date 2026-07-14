import React, { useCallback, useEffect, useState } from "react";
import { Card, Empty, Select, Space, Typography } from "antd";
import { isAxiosError } from "axios";
import {
  itemizadoOpcionesAPI,
  type ClienteObraResumen,
  type EstadoPreparacionItemizado,
} from "../services/api";
import ItemizadoClienteView, { type ItemizadoClienteRow } from "./ItemizadoClienteView";

const { Text } = Typography;

type Props = {
  clienteSeleccionadoId?: string;
  obras: ClienteObraResumen[];
  loadingObras: boolean;
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || fallback;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
};

// Vista previa de solo lectura para el administrador: reutiliza los
// endpoints internos ya existentes (nunca /api/cliente/...) porque esos
// exigen rol cliente y rechazarían al administrador.
const ItemizadoPreviewPanel: React.FC<Props> = ({ clienteSeleccionadoId, obras, loadingObras }) => {
  const [obraId, setObraId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoPreparacionItemizado | null>(null);
  const [itemizados, setItemizados] = useState<ItemizadoClienteRow[]>([]);
  const [confirmadoAt, setConfirmadoAt] = useState<string | null>(null);
  const [confirmadoPor, setConfirmadoPor] = useState<{ nombre?: string | null; email?: string | null } | null>(
    null
  );

  useEffect(() => {
    setObraId(undefined);
    setEstado(null);
    setItemizados([]);
    setError(null);
  }, [clienteSeleccionadoId]);

  const cargar = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Misma fuente que ve el cliente (itemizados propuestos + selección),
      // no la lista de "visibles" — la vista previa debe reflejar exactamente
      // lo que el cliente verá antes de confirmar.
      const { obra, data } = await itemizadoOpcionesAPI.obtenerPropuestaObra(id);
      setEstado(obra.estadoPreparacionItemizado ?? "PREPARACION");
      setConfirmadoAt(obra.itemizadoFinalizadoAt ?? null);
      setConfirmadoPor(obra.itemizadoFinalizadoPor ?? null);
      setItemizados(
        data.map((item) => ({
          itemizadoOpcionId: item.itemizadoOpcionId,
          codigoBeck: item.codigoBeck,
          nombreBeck: item.nombreBeck,
          nombrePersonalizado: item.nombrePersonalizado,
          seleccionadoPorCliente: item.seleccionadoPorCliente,
        }))
      );
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el itemizado de la obra"));
      setEstado(null);
      setItemizados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (obraId) void cargar(obraId);
  }, [obraId, cargar]);

  if (!clienteSeleccionadoId) {
    return (
      <Card>
        <Empty
          description={
            <Text type="secondary">Selecciona una empresa para ver el itemizado de sus obras.</Text>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card size="small">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Selecciona una obra para previsualizar el itemizado tal como lo verá el cliente.
          </Text>
          <Select
            showSearch
            allowClear
            loading={loadingObras}
            placeholder="Seleccionar obra"
            style={{ width: "100%", maxWidth: 420 }}
            value={obraId}
            onChange={(val: string | undefined) => setObraId(val)}
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

      {obraId && (
        <ItemizadoClienteView
          modo="preview"
          estado={estado}
          itemizados={itemizados}
          loading={loading}
          error={error}
          resetKey={obraId}
          confirmadoAt={confirmadoAt}
          confirmadoPor={confirmadoPor}
        />
      )}
    </div>
  );
};

export default ItemizadoPreviewPanel;
