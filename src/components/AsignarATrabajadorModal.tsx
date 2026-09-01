import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  inventarioBeckAPI,
  type InventarioDisponibleSupervisorItem,
  type ObraAsignable,
  type SupervisorAsignable,
  type TipoInventarioBeckItem,
} from "../services/api";

const { Text } = Typography;

type CarritoItem = {
  key: string;
  tipoItem: TipoInventarioBeckItem;
  itemId: string;
  nombre: string;
  cantidad: number;
  disponible: number;
};

type AsignarATrabajadorModalProps = {
  open: boolean;
  onClose: () => void;
  onAsignado: () => void;
};

function getErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as { response?: { data?: { error?: string } }; message?: string } | null;
  return apiErr?.response?.data?.error || apiErr?.message || fallback;
}

const TIPO_ITEM_LABEL: Record<TipoInventarioBeckItem, string> = {
  epp: "EPP",
  implemento: "Implemento",
  herramienta: "Herramienta",
};

const AsignarATrabajadorModal: React.FC<AsignarATrabajadorModalProps> = ({ open, onClose, onAsignado }) => {
  const [obras, setObras] = useState<ObraAsignable[]>([]);
  const [obraId, setObraId] = useState<string | null>(null);
  const [cargandoObras, setCargandoObras] = useState(false);

  const [trabajadores, setTrabajadores] = useState<SupervisorAsignable[]>([]);
  const [trabajadoresEsFallback, setTrabajadoresEsFallback] = useState(false);
  const [trabajadorId, setTrabajadorId] = useState<string | null>(null);
  const [cargandoTrabajadores, setCargandoTrabajadores] = useState(false);

  const [miInventario, setMiInventario] = useState<InventarioDisponibleSupervisorItem[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);

  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setObraId(null);
    setTrabajadorId(null);
    setTrabajadores([]);
    setTrabajadoresEsFallback(false);
    setMiInventario([]);
    setCarrito([]);
    setObservacion("");

    setCargandoObras(true);
    inventarioBeckAPI.obras
      .listar()
      .then(setObras)
      .catch(() => message.error("No se pudieron cargar las obras"))
      .finally(() => setCargandoObras(false));
  }, [open]);

  useEffect(() => {
    if (!open || !obraId) {
      setTrabajadores([]);
      setTrabajadoresEsFallback(false);
      setTrabajadorId(null);
      setMiInventario([]);
      setCarrito([]);
      return;
    }

    setCargandoTrabajadores(true);
    setTrabajadorId(null);
    inventarioBeckAPI.trabajadores
      .listar(obraId)
      .then(({ trabajadores: data, esFallback }) => {
        setTrabajadores(data);
        setTrabajadoresEsFallback(esFallback);
      })
      .catch(() => message.error("No se pudieron cargar los trabajadores"))
      .finally(() => setCargandoTrabajadores(false));

    setCargandoInventario(true);
    setCarrito([]);
    inventarioBeckAPI.miInventario
      .listar(obraId)
      .then(setMiInventario)
      .catch(() => message.error("No se pudo cargar tu inventario disponible"))
      .finally(() => setCargandoInventario(false));
  }, [open, obraId]);

  const opciones = useMemo(() => {
    const idsEnCarrito = new Set(carrito.map((c) => c.key));
    return miInventario
      .filter((item) => !idsEnCarrito.has(`${item.tipoItem}:${item.itemId}`))
      .map((item) => ({
        value: `${item.tipoItem}:${item.itemId}`,
        label: `${item.nombre} — ${TIPO_ITEM_LABEL[item.tipoItem]} (Disponible: ${item.disponible})`,
      }));
  }, [miInventario, carrito]);

  const agregarAlCarrito = (clave: string) => {
    const item = miInventario.find((i) => `${i.tipoItem}:${i.itemId}` === clave);
    if (!item) return;
    setCarrito((prev) => [
      ...prev,
      {
        key: clave,
        tipoItem: item.tipoItem,
        itemId: item.itemId,
        nombre: item.nombre,
        cantidad: item.tipoItem === "herramienta" ? 1 : Math.min(1, item.disponible),
        disponible: item.disponible,
      },
    ]);
  };

  const quitarDelCarrito = (key: string) => {
    setCarrito((prev) => prev.filter((item) => item.key !== key));
  };

  const cambiarCantidad = (key: string, cantidad: number) => {
    setCarrito((prev) => prev.map((item) => (item.key === key ? { ...item, cantidad } : item)));
  };

  const confirmar = async () => {
    if (!obraId || !trabajadorId) {
      message.error("Selecciona la obra y el trabajador");
      return;
    }
    if (carrito.length === 0) {
      message.error("Agrega al menos un item para asignar");
      return;
    }

    setGuardando(true);
    try {
      await inventarioBeckAPI.asignaciones.crear({
        obraId,
        jefeObraId: trabajadorId,
        observacion: observacion.trim() || undefined,
        lineas: carrito.map((item) => ({ tipoItem: item.tipoItem, itemId: item.itemId, cantidad: item.cantidad })),
      });
      message.success("Inventario asignado correctamente");
      onAsignado();
      onClose();
    } catch (err) {
      message.error(getErrorMessage(err, "No se pudo crear la asignación"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title="Asignar inventario a trabajador"
      open={open}
      onCancel={onClose}
      onOk={() => void confirmar()}
      okText="Confirmar asignación"
      confirmLoading={guardando}
      width="94vw"
      style={{ maxWidth: 780 }}
      styles={{ body: { maxHeight: "72vh", overflowY: "auto" } }}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" className="w-full mt-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Form.Item label="Obra" required className="!mb-0">
            <Select
              placeholder="Selecciona una obra"
              loading={cargandoObras}
              value={obraId ?? undefined}
              onChange={setObraId}
              showSearch
              optionFilterProp="label"
              options={obras.map((obra) => ({ value: obra.id, label: obra.codigo ? `${obra.nombre} (${obra.codigo})` : obra.nombre }))}
            />
          </Form.Item>
          <Form.Item label="Trabajador" required className="!mb-0">
            <Select
              placeholder={obraId ? "Selecciona un trabajador" : "Primero selecciona una obra"}
              loading={cargandoTrabajadores}
              disabled={!obraId}
              value={trabajadorId ?? undefined}
              onChange={setTrabajadorId}
              showSearch
              optionFilterProp="label"
              options={trabajadores.map((usuario) => ({ value: usuario.id, label: usuario.nombre }))}
            />
          </Form.Item>
        </div>

        {obraId && trabajadoresEsFallback && (
          <Alert type="info" showIcon message="Esta obra todavía no tiene ningún trabajador vinculado. Puedes elegir cualquiera de la lista." />
        )}

        <Select
          mode="multiple"
          placeholder={obraId ? "Buscar y agregar de tu inventario disponible..." : "Primero selecciona una obra"}
          loading={cargandoInventario}
          disabled={!obraId}
          value={[]}
          onSelect={(value: string) => agregarAlCarrito(value)}
          showSearch
          optionFilterProp="label"
          options={opciones}
          className="w-full"
        />
        {obraId && !cargandoInventario && miInventario.length === 0 && (
          <Alert type="warning" showIcon message="No tienes ningún item de inventario asignado en esta obra todavía." />
        )}

        <div>
          <Text strong>Items a asignar ({carrito.length})</Text>
          <Table
            className="mt-2"
            size="small"
            rowKey="key"
            dataSource={carrito}
            pagination={false}
            locale={{ emptyText: "Aún no has agregado items" }}
            columns={[
              { title: "Tipo", dataIndex: "tipoItem", width: 100, render: (v: TipoInventarioBeckItem) => TIPO_ITEM_LABEL[v] },
              { title: "Item", dataIndex: "nombre" },
              {
                title: "Cantidad",
                dataIndex: "cantidad",
                width: 130,
                render: (_: unknown, row: CarritoItem) => (
                  <InputNumber
                    min={1}
                    max={row.tipoItem === "herramienta" ? 1 : row.disponible}
                    precision={0}
                    value={row.cantidad}
                    disabled={row.tipoItem === "herramienta"}
                    onChange={(value) => cambiarCantidad(row.key, Number(value) || 1)}
                  />
                ),
              },
              {
                title: "",
                key: "quitar",
                width: 50,
                render: (_: unknown, row: CarritoItem) => (
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => quitarDelCarrito(row.key)} />
                ),
              },
            ]}
          />
        </div>

        <Form.Item label="Observación (opcional)" className="!mb-0">
          <Input.TextArea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </Form.Item>
      </Space>
    </Modal>
  );
};

export default AsignarATrabajadorModal;
