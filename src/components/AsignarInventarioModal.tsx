import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Typography, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  inventarioBeckAPI,
  type InventarioBeckEpp,
  type InventarioBeckHerramienta,
  type InventarioBeckImplemento,
  type ObraAsignable,
  type SupervisorAsignable,
  type TipoInventarioBeckItem,
} from "../services/api";

const { Text } = Typography;

type ItemPrecargado = {
  tipoItem: TipoInventarioBeckItem;
  itemId: string;
  nombre: string;
  stockDisponible: number;
};

type CarritoItem = {
  key: string;
  tipoItem: TipoInventarioBeckItem;
  itemId: string;
  nombre: string;
  cantidad: number;
  stockDisponible: number;
};

type AsignarInventarioModalProps = {
  open: boolean;
  onClose: () => void;
  onAsignado: () => void;
  itemInicial?: ItemPrecargado | null;
};

function getErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as { response?: { data?: { error?: string } }; message?: string } | null;
  return apiErr?.response?.data?.error || apiErr?.message || fallback;
}

function capitalizar(value?: string | null): string {
  const v = value?.trim();
  if (!v) return "";
  return v.charAt(0).toLocaleUpperCase("es-CL") + v.slice(1);
}

const AsignarInventarioModal: React.FC<AsignarInventarioModalProps> = ({ open, onClose, onAsignado, itemInicial }) => {
  const [obras, setObras] = useState<ObraAsignable[]>([]);
  const [obraId, setObraId] = useState<string | null>(null);
  const [cargandoObras, setCargandoObras] = useState(false);

  const [jefesObra, setJefesObra] = useState<SupervisorAsignable[]>([]);
  const [jefesObraEsFallback, setJefesObraEsFallback] = useState(false);
  const [jefeObraId, setJefeObraId] = useState<string | null>(null);
  const [cargandoJefes, setCargandoJefes] = useState(false);

  const [epp, setEpp] = useState<InventarioBeckEpp[]>([]);
  const [implementos, setImplementos] = useState<InventarioBeckImplemento[]>([]);
  const [herramientas, setHerramientas] = useState<InventarioBeckHerramienta[]>([]);
  const [cargandoItems, setCargandoItems] = useState(false);

  const [tab, setTab] = useState<TipoInventarioBeckItem>("epp");
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setObraId(null);
    setJefeObraId(null);
    setJefesObra([]);
    setJefesObraEsFallback(false);
    setObservacion("");
    setTab(itemInicial?.tipoItem ?? "epp");
    setCarrito(
      itemInicial
        ? [
            {
              key: `${itemInicial.tipoItem}:${itemInicial.itemId}`,
              tipoItem: itemInicial.tipoItem,
              itemId: itemInicial.itemId,
              nombre: itemInicial.nombre,
              cantidad: itemInicial.tipoItem === "herramienta" ? 1 : Math.min(1, itemInicial.stockDisponible || 1),
              stockDisponible: itemInicial.stockDisponible,
            },
          ]
        : []
    );

    setCargandoObras(true);
    inventarioBeckAPI.obras
      .listar()
      .then(setObras)
      .catch(() => message.error("No se pudieron cargar las obras"))
      .finally(() => setCargandoObras(false));

    setCargandoItems(true);
    Promise.all([
      inventarioBeckAPI.epp.listar({ activo: true }),
      inventarioBeckAPI.implementos.listar({ activo: true }),
      inventarioBeckAPI.herramientas.listar({ activo: true }),
    ])
      .then(([eppData, implementosData, herramientasData]) => {
        setEpp(eppData);
        setImplementos(implementosData);
        setHerramientas(herramientasData);
      })
      .catch(() => message.error("No se pudo cargar el inventario"))
      .finally(() => setCargandoItems(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !obraId) {
      setJefesObra([]);
      setJefesObraEsFallback(false);
      setJefeObraId(null);
      return;
    }

    setCargandoJefes(true);
    setJefeObraId(null);
    inventarioBeckAPI.supervisores
      .listar(obraId)
      .then(({ supervisores, esFallback }) => {
        setJefesObra(supervisores);
        setJefesObraEsFallback(esFallback);
      })
      .catch(() => message.error("No se pudieron cargar los supervisores"))
      .finally(() => setCargandoJefes(false));
  }, [open, obraId]);

  const opcionesPorTab = useMemo(() => {
    const idsEnCarrito = new Set(carrito.map((c) => c.key));
    return {
      epp: epp
        .filter((item) => item.saldo > 0 && !idsEnCarrito.has(`epp:${item.id}`))
        .map((item) => ({ value: item.id, label: `${capitalizar(item.item)}${item.modeloMarca ? ` — ${item.modeloMarca}` : ""} (Stock: ${item.saldo})` })),
      implemento: implementos
        .filter((item) => item.saldo > 0 && !idsEnCarrito.has(`implemento:${item.id}`))
        .map((item) => ({ value: item.id, label: `${capitalizar(item.item)}${item.modeloMarca ? ` — ${item.modeloMarca}` : ""} (Stock: ${item.saldo})` })),
      herramienta: herramientas
        .filter((item) => !idsEnCarrito.has(`herramienta:${item.id}`))
        .map((item) => ({ value: item.id, label: `${capitalizar(item.nombre)}${item.marca ? ` — ${item.marca}` : ""}${item.encargado ? ` (a cargo de ${item.encargado})` : ""}` })),
    };
  }, [epp, implementos, herramientas, carrito]);

  const agregarAlCarrito = (itemId: string) => {
    if (tab === "herramienta") {
      const herramienta = herramientas.find((h) => h.id === itemId);
      if (!herramienta) return;
      setCarrito((prev) => [
        ...prev,
        { key: `herramienta:${itemId}`, tipoItem: "herramienta", itemId, nombre: capitalizar(herramienta.nombre), cantidad: 1, stockDisponible: 1 },
      ]);
      return;
    }
    const dataset = tab === "epp" ? epp : implementos;
    const item = dataset.find((i) => i.id === itemId);
    if (!item) return;
    setCarrito((prev) => [
      ...prev,
      { key: `${tab}:${itemId}`, tipoItem: tab, itemId, nombre: capitalizar(item.item), cantidad: 1, stockDisponible: item.saldo },
    ]);
  };

  const quitarDelCarrito = (key: string) => {
    setCarrito((prev) => prev.filter((item) => item.key !== key));
  };

  const cambiarCantidad = (key: string, cantidad: number) => {
    setCarrito((prev) => prev.map((item) => (item.key === key ? { ...item, cantidad } : item)));
  };

  const confirmar = async () => {
    if (!obraId || !jefeObraId) {
      message.error("Selecciona la obra y el supervisor");
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
        jefeObraId,
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

  const TAB_LABEL: Record<TipoInventarioBeckItem, string> = { epp: "EPP", implemento: "Implementos", herramienta: "Herramientas" };

  return (
    <Modal
      title="Asignar inventario a supervisor"
      open={open}
      onCancel={onClose}
      onOk={() => void confirmar()}
      okText="Confirmar asignación"
      confirmLoading={guardando}
      width="94vw"
      style={{ maxWidth: 820 }}
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
          <Form.Item label="Supervisor" required className="!mb-0">
            <Select
              placeholder={obraId ? "Selecciona un supervisor" : "Primero selecciona una obra"}
              loading={cargandoJefes}
              disabled={!obraId}
              value={jefeObraId ?? undefined}
              onChange={setJefeObraId}
              showSearch
              optionFilterProp="label"
              options={jefesObra.map((usuario) => ({ value: usuario.id, label: usuario.nombre }))}
            />
          </Form.Item>
        </div>

        {obraId && jefesObraEsFallback && (
          <Alert
            type="info"
            showIcon
            message="Esta obra todavía no tiene ningún supervisor vinculado. Puedes elegir cualquiera de la lista."
          />
        )}

        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as TipoInventarioBeckItem)}
          items={(["epp", "implemento", "herramienta"] as const).map((key) => ({
            key,
            label: TAB_LABEL[key],
            children: (
              <Select
                mode="multiple"
                placeholder={`Buscar y agregar ${TAB_LABEL[key].toLowerCase()}...`}
                loading={cargandoItems}
                value={[]}
                onSelect={(value: string) => agregarAlCarrito(value)}
                showSearch
                optionFilterProp="label"
                options={opcionesPorTab[key]}
                className="w-full"
              />
            ),
          }))}
        />

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
              { title: "Tipo", dataIndex: "tipoItem", width: 100, render: (v: TipoInventarioBeckItem) => TAB_LABEL[v] },
              { title: "Item", dataIndex: "nombre" },
              {
                title: "Cantidad",
                dataIndex: "cantidad",
                width: 130,
                render: (_: unknown, row: CarritoItem) => (
                  <InputNumber
                    min={1}
                    max={row.tipoItem === "herramienta" ? 1 : row.stockDisponible}
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

export default AsignarInventarioModal;
