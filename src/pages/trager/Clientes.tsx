import React, { useState } from "react";
import { Button, Modal, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";

type ClienteTrager = {
  id: string;
  nombre: string;
  rut: string;
  contacto: string;
  estado: "Activo" | "Inactivo";
};

const columns: ColumnsType<ClienteTrager> = [
  {
    title: "Cliente",
    dataIndex: "nombre",
    key: "nombre",
    render: (value: string) => (
      <span className="text-sm font-medium text-beck-ink">{value}</span>
    ),
  },
  {
    title: "RUT",
    dataIndex: "rut",
    key: "rut",
  },
  {
    title: "Contacto",
    dataIndex: "contacto",
    key: "contacto",
  },
  {
    title: "Estado",
    dataIndex: "estado",
    key: "estado",
    render: (value: ClienteTrager["estado"]) => (
      <Tag color={value === "Activo" ? "green" : "default"}>{value}</Tag>
    ),
  },
];

const TragerClientes: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <section className="firemat-panel px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="firemat-badge">
              <TeamOutlined />
              <span>CRM TRAGER</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-beck-ink">
              Clientes Trager
            </h1>
            <p className="mt-1 text-sm text-beck-muted">
              Cartera comercial de clientes Trager.
            </p>
          </div>
          <Button
            className="firemat-action-button"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nuevo cliente
          </Button>
        </div>
      </section>

      <section className="firemat-panel overflow-hidden">
        <Table<ClienteTrager>
          rowKey="id"
          columns={columns}
          dataSource={[]}
          pagination={false}
          locale={{ emptyText: "Sin clientes" }}
          scroll={{ x: 640 }}
        />
      </section>

      <Modal
        title="Nuevo cliente Trager"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setModalOpen(false)}>
            Cerrar
          </Button>,
        ]}
      >
        <p className="text-sm text-beck-muted">
          La creacion de clientes Trager estara disponible cuando exista soporte
          de datos para este modulo.
        </p>
      </Modal>
    </div>
  );
};

export default TragerClientes;
