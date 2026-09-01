import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Select, Space, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  inventarioBeckAPI,
  type AsignacionInventarioBeck,
  type ObraAsignable,
  type SupervisorAsignable,
  type TipoInventarioBeckItem,
} from "../services/api";

const { Text } = Typography;

type DevolverInventarioModalProps = {
  open: boolean;
  onClose: () => void;
  onDevuelto: () => void;
  /** Cuando se entrega, el modal opera fijo sobre este supervisor (uso propio del jefe de obra) y no deja elegir otro. */
  soloSupervisor?: { id: string; nombre: string } | null;
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

const DevolverInventarioModal: React.FC<DevolverInventarioModalProps> = ({ open, onClose, onDevuelto, soloSupervisor }) => {
  const [obras, setObras] = useState<ObraAsignable[]>([]);
  const [obraId, setObraId] = useState<string | null>(null);
  const [cargandoObras, setCargandoObras] = useState(false);

  const [supervisores, setSupervisores] = useState<SupervisorAsignable[]>([]);
  const [supervisoresEsFallback, setSupervisoresEsFallback] = useState(false);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [cargandoSupervisores, setCargandoSupervisores] = useState(false);

  const [asignaciones, setAsignaciones] = useState<AsignacionInventarioBeck[]>([]);
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<React.Key[]>([]);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setObraId(null);
    setSupervisorId(soloSupervisor?.id ?? null);
    setSupervisores([]);
    setSupervisoresEsFallback(false);
    setAsignaciones([]);
    setSeleccionadas([]);

    setCargandoObras(true);
    inventarioBeckAPI.obras
      .listar()
      .then(setObras)
      .catch(() => message.error("No se pudieron cargar las obras"))
      .finally(() => setCargandoObras(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (soloSupervisor) return;

    if (!open || !obraId) {
      setSupervisores([]);
      setSupervisoresEsFallback(false);
      setSupervisorId(null);
      return;
    }

    setCargandoSupervisores(true);
    setSupervisorId(null);
    inventarioBeckAPI.supervisores
      .listar(obraId)
      .then(({ supervisores: data, esFallback }) => {
        setSupervisores(data);
        setSupervisoresEsFallback(esFallback);
      })
      .catch(() => message.error("No se pudieron cargar los supervisores"))
      .finally(() => setCargandoSupervisores(false));
  }, [open, obraId, soloSupervisor]);

  useEffect(() => {
    if (!open || !obraId || !supervisorId) {
      setAsignaciones([]);
      setSeleccionadas([]);
      return;
    }

    setCargandoAsignaciones(true);
    inventarioBeckAPI.asignaciones
      .listar({ obraId, jefeObraId: supervisorId })
      .then((data) => {
        setAsignaciones(data.filter((a) => a.estado === "asignado"));
        setSeleccionadas([]);
      })
      .catch(() => message.error("No se pudieron cargar las asignaciones activas"))
      .finally(() => setCargandoAsignaciones(false));
  }, [open, obraId, supervisorId]);

  const columns: ColumnsType<AsignacionInventarioBeck> = useMemo(
    () => [
      { title: "Tipo", dataIndex: "tipoItem", width: 100, render: (v: TipoInventarioBeckItem) => TIPO_ITEM_LABEL[v] },
      {
        title: "Item",
        render: (_: unknown, row: AsignacionInventarioBeck) => row.epp?.item ?? row.implemento?.item ?? row.herramienta?.nombre ?? "-",
      },
      { title: "Cantidad", dataIndex: "cantidad", width: 90, align: "right" },
      { title: "Fecha asignación", dataIndex: "createdAt", width: 160, render: (v: string) => new Date(v).toLocaleString("es-CL") },
    ],
    []
  );

  const confirmar = async () => {
    if (seleccionadas.length === 0) {
      message.error("Selecciona al menos un item para devolver");
      return;
    }
    if (!obraId || !supervisorId) return;

    setProcesando(true);
    let exitosos = 0;
    for (const id of seleccionadas) {
      try {
        await inventarioBeckAPI.asignaciones.devolver(String(id));
        exitosos += 1;
      } catch (err) {
        message.error(getErrorMessage(err, `No se pudo devolver un item (${String(id)})`));
      }
    }

    if (exitosos > 0) {
      message.success(`${exitosos} item(s) devuelto(s) a inventario`);
      onDevuelto();
    }

    const restantes = await inventarioBeckAPI.asignaciones
      .listar({ obraId, jefeObraId: supervisorId })
      .then((data) => data.filter((a) => a.estado === "asignado"))
      .catch(() => []);
    setAsignaciones(restantes);
    setSeleccionadas([]);
    setProcesando(false);

    if (restantes.length === 0) {
      onClose();
    }
  };

  return (
    <Modal
      title="Devolver inventario a bodega"
      open={open}
      onCancel={onClose}
      onOk={() => void confirmar()}
      okText="Confirmar devolución"
      confirmLoading={procesando}
      width="94vw"
      style={{ maxWidth: 780 }}
      styles={{ body: { maxHeight: "72vh", overflowY: "auto" } }}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" className="w-full mt-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            placeholder="Selecciona una obra"
            loading={cargandoObras}
            value={obraId ?? undefined}
            onChange={setObraId}
            showSearch
            optionFilterProp="label"
            options={obras.map((obra) => ({ value: obra.id, label: obra.codigo ? `${obra.nombre} (${obra.codigo})` : obra.nombre }))}
          />
          {soloSupervisor ? (
            <Select disabled value={soloSupervisor.id} options={[{ value: soloSupervisor.id, label: soloSupervisor.nombre }]} />
          ) : (
            <Select
              placeholder={obraId ? "Selecciona un supervisor" : "Primero selecciona una obra"}
              loading={cargandoSupervisores}
              disabled={!obraId}
              value={supervisorId ?? undefined}
              onChange={setSupervisorId}
              showSearch
              optionFilterProp="label"
              options={supervisores.map((usuario) => ({ value: usuario.id, label: usuario.nombre }))}
            />
          )}
        </div>

        {!soloSupervisor && obraId && supervisoresEsFallback && (
          <Alert type="info" showIcon message="Esta obra todavía no tiene ningún supervisor vinculado. Puedes elegir cualquiera de la lista." />
        )}

        <div>
          <Text strong>Items asignados activos ({asignaciones.length})</Text>
          <Table
            className="mt-2"
            size="small"
            rowKey="id"
            dataSource={asignaciones}
            loading={cargandoAsignaciones}
            pagination={false}
            locale={{ emptyText: supervisorId ? "Este supervisor no tiene items asignados pendientes de devolución" : "Selecciona obra y supervisor" }}
            rowSelection={{ selectedRowKeys: seleccionadas, onChange: setSeleccionadas }}
            columns={columns}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default DevolverInventarioModal;
