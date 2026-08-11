import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  inventarioBeckAPI,
  type InventarioBeckEpp,
  type InventarioBeckEppPayload,
  type InventarioBeckHerramienta,
  type InventarioBeckHerramientaPayload,
  type InventarioBeckImportResultado,
  type InventarioBeckImplemento,
  type InventarioBeckImplementoPayload,
} from "../../services/api";
import { usePermisos } from "../../hooks/usePermisos";

const { Text, Title } = Typography;

type FiltroActivo = "activos" | "inactivos" | "todos";
type TabKey = "epp" | "implementos" | "herramientas";

const dash = (value?: string | null) => value?.trim() || "-";
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("es-CL") : "-");
const dateInput = (value?: string | null) => (value ? value.slice(0, 10) : undefined);

function buildParams(q: string, filtro: FiltroActivo): { q?: string; activo?: boolean } {
  const params: { q?: string; activo?: boolean } = {};
  if (q.trim()) params.q = q.trim();
  if (filtro === "activos") params.activo = true;
  if (filtro === "inactivos") params.activo = false;
  return params;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  } | null;
  return apiErr?.response?.data?.error || apiErr?.response?.data?.message || apiErr?.message || fallback;
}

type ToolbarProps = {
  q: string;
  filtro: FiltroActivo;
  canEdit: boolean;
  nuevoLabel: string;
  onQChange: (value: string) => void;
  onFiltroChange: (value: FiltroActivo) => void;
  onBuscar: () => void;
  onNuevo: () => void;
};

const Toolbar: React.FC<ToolbarProps> = ({
  q,
  filtro,
  canEdit,
  nuevoLabel,
  onQChange,
  onFiltroChange,
  onBuscar,
  onNuevo,
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        prefix={<SearchOutlined className="text-beck-muted" />}
        placeholder="Buscar"
        value={q}
        onChange={(e) => onQChange(e.target.value)}
        onPressEnter={onBuscar}
        allowClear
        className="w-full sm:!w-[280px]"
      />
      <Select
        value={filtro}
        onChange={onFiltroChange}
        className="!w-full sm:!w-[130px]"
        options={[
          { value: "activos", label: "Activos" },
          { value: "inactivos", label: "Inactivos" },
          { value: "todos", label: "Todos" },
        ]}
      />
      <Button icon={<SearchOutlined />} onClick={onBuscar}>
        Buscar
      </Button>
    </Space>
    {canEdit && (
      <Button type="primary" icon={<PlusOutlined />} onClick={onNuevo}>
        {nuevoLabel}
      </Button>
    )}
  </div>
);

const EstadoBadge: React.FC<{ activo: boolean }> = ({ activo }) =>
  activo ? <Badge status="success" text="Activo" /> : <Badge status="default" text="Inactivo" />;

const Inventario: React.FC = () => {
  const { canEdit } = usePermisos();
  const canEditInventario = canEdit("beck_inventario");

  const [tab, setTab] = useState<TabKey>("epp");
  const [q, setQ] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("activos");
  const [loading, setLoading] = useState(false);

  const [epp, setEpp] = useState<InventarioBeckEpp[]>([]);
  const [implementos, setImplementos] = useState<InventarioBeckImplemento[]>([]);
  const [herramientas, setHerramientas] = useState<InventarioBeckHerramienta[]>([]);

  const [eppForm] = Form.useForm<InventarioBeckEppPayload>();
  const [implementoForm] = Form.useForm<InventarioBeckImplementoPayload>();
  const [herramientaForm] = Form.useForm<InventarioBeckHerramientaPayload>();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<InventarioBeckImportResultado | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(q, filtroActivo);
      if (tab === "epp") setEpp(await inventarioBeckAPI.epp.listar(params));
      if (tab === "implementos") setImplementos(await inventarioBeckAPI.implementos.listar(params));
      if (tab === "herramientas") setHerramientas(await inventarioBeckAPI.herramientas.listar(params));
    } catch {
      message.error("No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, [filtroActivo, q, tab]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirCrear = () => {
    setEditing(null);
    eppForm.resetFields();
    implementoForm.resetFields();
    herramientaForm.resetFields();
    eppForm.setFieldsValue({ activo: true, stockInicial: 0, entrada: 0, salida: 0, saldo: 0 });
    implementoForm.setFieldsValue({ activo: true, cantidad: 0, salida: 0, saldo: 0 });
    herramientaForm.setFieldsValue({ activo: true });
    setModalOpen(true);
  };

  const abrirEditar = (row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta) => {
    setEditing(row);
    if (tab === "epp") eppForm.setFieldsValue(row as InventarioBeckEpp);
    if (tab === "implementos") {
      const item = row as InventarioBeckImplemento;
      implementoForm.setFieldsValue({ ...item, fecha: dateInput(item.fecha) });
    }
    if (tab === "herramientas") {
      const item = row as InventarioBeckHerramienta;
      herramientaForm.setFieldsValue({ ...item, fecha: dateInput(item.fecha) });
    }
    setModalOpen(true);
  };

  const abrirDetalle = (row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      if (tab === "epp") {
        const values = await eppForm.validateFields();
        if (editing) await inventarioBeckAPI.epp.actualizar(editing.id, values);
        else await inventarioBeckAPI.epp.crear(values);
      }
      if (tab === "implementos") {
        const values = await implementoForm.validateFields();
        if (editing) await inventarioBeckAPI.implementos.actualizar(editing.id, values);
        else await inventarioBeckAPI.implementos.crear(values);
      }
      if (tab === "herramientas") {
        const values = await herramientaForm.validateFields();
        if (editing) await inventarioBeckAPI.herramientas.actualizar(editing.id, values);
        else await inventarioBeckAPI.herramientas.crear(values);
      }
      message.success(editing ? "Registro actualizado" : "Registro creado");
      setModalOpen(false);
      await cargar();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error(getErrorMessage(err, "No se pudo guardar el registro"));
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta) => {
    try {
      const nuevoEstado = !row.activo;
      if (tab === "epp") await inventarioBeckAPI.epp.cambiarEstado(row.id, nuevoEstado);
      if (tab === "implementos") await inventarioBeckAPI.implementos.cambiarEstado(row.id, nuevoEstado);
      if (tab === "herramientas") await inventarioBeckAPI.herramientas.cambiarEstado(row.id, nuevoEstado);
      message.success(nuevoEstado ? "Registro activado" : "Registro eliminado");
      await cargar();
      if (selected?.id === row.id) setSelected({ ...selected, activo: nuevoEstado });
    } catch {
      message.error("No se pudo cambiar el estado");
    }
  };

  const refrescarHojasImportadas = async (resultado: InventarioBeckImportResultado) => {
    const params = buildParams(q, filtroActivo);
    const requests: Promise<void>[] = [];
    if (resultado.epp) {
      requests.push(inventarioBeckAPI.epp.listar(params).then(setEpp));
    }
    if (resultado.implementos) {
      requests.push(inventarioBeckAPI.implementos.listar(params).then(setImplementos));
    }
    if (resultado.herramientas) {
      requests.push(inventarioBeckAPI.herramientas.listar(params).then(setHerramientas));
    }
    await Promise.all(requests);
  };

  const importarExcel = async () => {
    if (!importFile) {
      message.error("Selecciona un archivo .xlsx");
      return;
    }
    setImporting(true);
    try {
      const resultado = await inventarioBeckAPI.importarExcel(importFile);
      setImportResult(resultado);
      await refrescarHojasImportadas(resultado);
      setImportFile(null);
      setImportFileList([]);
      message.success("Importación completada");
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo importar el Excel"));
    } finally {
      setImporting(false);
    }
  };

  const actionColumn = useMemo(
    () => ({
      title: "Acciones",
      key: "acciones",
      width: 120,
      render: (_: unknown, row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta) => (
        <Space size="small" wrap>
          <Button type="text" size="small" icon={<EyeOutlined />} title="Ver" onClick={() => abrirDetalle(row)} />
          {canEditInventario && (
            <Button type="text" size="small" icon={<EditOutlined />} title="Editar" onClick={() => abrirEditar(row)} />
          )}
          {canEditInventario && (
            row.activo ? (
              <Popconfirm
                title="¿Eliminar registro?"
                description="Esta acción quitará este elemento del inventario. ¿Deseas continuar?"
                okText="Eliminar"
                cancelText="Cancelar"
                onConfirm={() => cambiarEstado(row)}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  title="Eliminar"
                />
              </Popconfirm>
            ) : (
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                title="Activar"
                onClick={() => cambiarEstado(row)}
              />
            )
          )}
        </Space>
      ),
    }),
    [canEditInventario, selected, tab, cargar]
  );

  const eppColumns: ColumnsType<InventarioBeckEpp> = [
    { title: "SKU", dataIndex: "sku", width: 110, render: dash },
    { title: "Item", dataIndex: "item", width: 200, ellipsis: true, render: (v: string) => <Text strong>{v}</Text> },
    { title: "Modelo / Marca", dataIndex: "modeloMarca", width: 160, ellipsis: true, render: dash },
    { title: "Unidad", dataIndex: "unidadMedida", width: 110, render: dash },
    { title: "Talla", dataIndex: "talla", width: 90, render: dash },
    { title: "Color", dataIndex: "color", width: 100, render: dash },
    { title: "Stock", dataIndex: "saldo", width: 90, align: "right", render: (v: number) => v ?? 0 },
    { title: "Estado", dataIndex: "activo", width: 95, render: (v: boolean) => <EstadoBadge activo={v} /> },
    actionColumn as ColumnsType<InventarioBeckEpp>[number],
  ];

  const implementoColumns: ColumnsType<InventarioBeckImplemento> = [
    { title: "SKU", dataIndex: "sku", width: 110, render: dash },
    { title: "Item", dataIndex: "item", width: 190, ellipsis: true, render: (v: string) => <Text strong>{v}</Text> },
    { title: "Modelo / Marca", dataIndex: "modeloMarca", width: 150, ellipsis: true, render: dash },
    { title: "Cantidad", dataIndex: "cantidad", width: 90, align: "right", render: (v: number) => v ?? 0 },
    { title: "Unidad", dataIndex: "unidadMedida", width: 130, render: dash },
    { title: "Talla / Medida", dataIndex: "tallaMedida", width: 120, render: dash },
    { title: "Color", dataIndex: "color", width: 100, render: dash },
    { title: "Ubicación", dataIndex: "ubicacion", width: 120, render: dash },
    { title: "Saldo", dataIndex: "saldo", width: 80, align: "right", render: (v: number) => v ?? 0 },
    { title: "Estado", dataIndex: "activo", width: 95, render: (v: boolean) => <EstadoBadge activo={v} /> },
    actionColumn as ColumnsType<InventarioBeckImplemento>[number],
  ];

  const herramientaColumns: ColumnsType<InventarioBeckHerramienta> = [
    { title: "SKU", dataIndex: "sku", width: 120, render: dash },
    { title: "Nombre", dataIndex: "nombre", width: 200, ellipsis: true, render: (v: string) => <Text strong>{v}</Text> },
    { title: "Marca", dataIndex: "marca", width: 120, render: dash },
    { title: "Modelo", dataIndex: "modelo", width: 150, ellipsis: true, render: dash },
    { title: "Categoría", dataIndex: "categoria", width: 130, render: dash },
    { title: "Ubicación", dataIndex: "ubicacion", width: 130, render: dash },
    { title: "Fecha", dataIndex: "fecha", width: 105, render: formatDate },
    { title: "Encargado", dataIndex: "encargado", width: 140, ellipsis: true, render: dash },
    { title: "Estado", dataIndex: "activo", width: 95, render: (v: boolean) => <EstadoBadge activo={v} /> },
    actionColumn as ColumnsType<InventarioBeckHerramienta>[number],
  ];

  const renderForm = () => {
    if (tab === "epp") {
      return (
        <Form form={eppForm} layout="vertical" className="mt-3">
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="sku" label="SKU"><Input /></Form.Item>
            <Form.Item name="item" label="Item" rules={[{ required: true, message: "El item es obligatorio" }]}><Input /></Form.Item>
            <Form.Item name="modeloMarca" label="Modelo / Marca"><Input /></Form.Item>
            <Form.Item name="unidadMedida" label="Unidad medida"><Input /></Form.Item>
            <Form.Item name="talla" label="Talla"><Input /></Form.Item>
            <Form.Item name="color" label="Color"><Input /></Form.Item>
            <Form.Item name="stockInicial" label="Stock inicial"><InputNumber min={0} precision={0} className="!w-full" /></Form.Item>
            <Form.Item name="entrada" label="Entrada"><InputNumber min={0} precision={0} className="!w-full" /></Form.Item>
            <Form.Item name="salida" label="Salida"><InputNumber min={0} precision={0} className="!w-full" /></Form.Item>
            <Form.Item name="saldo" label="Saldo"><InputNumber min={0} precision={0} className="!w-full" /></Form.Item>
            <Form.Item name="activo" label="Estado"><Select options={[{ value: true, label: "Activo" }, { value: false, label: "Inactivo" }]} /></Form.Item>
          </div>
        </Form>
      );
    }
    if (tab === "implementos") {
      return (
        <Form form={implementoForm} layout="vertical" className="mt-3">
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="sku" label="SKU"><Input /></Form.Item>
            <Form.Item name="item" label="Item" rules={[{ required: true, message: "El item es obligatorio" }]}><Input /></Form.Item>
            <Form.Item name="modeloMarca" label="Modelo / Marca"><Input /></Form.Item>
            <Form.Item name="cantidad" label="Cantidad"><InputNumber min={0} precision={0} className="!w-full" /></Form.Item>
            <Form.Item name="unidadMedida" label="Unidad de medida"><Input /></Form.Item>
            <Form.Item name="tallaMedida" label="Talla / Medida"><Input /></Form.Item>
            <Form.Item name="color" label="Color"><Input /></Form.Item>
            <Form.Item name="ubicacion" label="Ubicación"><Input /></Form.Item>
            <Form.Item name="fecha" label="Fecha"><Input type="date" /></Form.Item>
            <Form.Item name="salida" label="Salida"><InputNumber min={0} precision={0} className="!w-full" /></Form.Item>
            <Form.Item name="saldo" label="Saldo"><InputNumber min={0} precision={0} className="!w-full" /></Form.Item>
            <Form.Item name="activo" label="Estado"><Select options={[{ value: true, label: "Activo" }, { value: false, label: "Inactivo" }]} /></Form.Item>
          </div>
        </Form>
      );
    }
    return (
      <Form form={herramientaForm} layout="vertical" className="mt-3">
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item name="sku" label="SKU"><Input /></Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: "El nombre es obligatorio" }]}><Input /></Form.Item>
          <Form.Item name="marca" label="Marca"><Input /></Form.Item>
          <Form.Item name="modelo" label="Modelo"><Input /></Form.Item>
          <Form.Item name="categoria" label="Categoría"><Input /></Form.Item>
          <Form.Item name="ubicacion" label="Ubicación"><Input /></Form.Item>
          <Form.Item name="fecha" label="Fecha"><Input type="date" /></Form.Item>
          <Form.Item name="encargado" label="Encargado"><Input /></Form.Item>
          <Form.Item name="activo" label="Estado"><Select options={[{ value: true, label: "Activo" }, { value: false, label: "Inactivo" }]} /></Form.Item>
        </div>
      </Form>
    );
  };

  const renderDetalle = () => {
    if (!selected) return null;
    const entries = Object.entries(selected).filter(([key]) => !["id", "createdAt", "updatedAt"].includes(key));
    return (
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        {entries.map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {key === "activo" ? <EstadoBadge activo={Boolean(value)} /> : value == null || value === "" ? "-" : String(key === "fecha" ? formatDate(value as string) : value)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <InboxOutlined />
          </div>
          <div>
            <Title level={4} className="!mb-0 !text-slate-800">Inventario BECK</Title>
            <Text type="secondary" className="text-xs">EPP, implementos y herramientas</Text>
          </div>
          {canEditInventario && (
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => setImportModalOpen(true)}
              className="ml-auto"
            >
              Importar Excel
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Tabs
          activeKey={tab}
          onChange={(key) => {
            setTab(key as TabKey);
            setQ("");
            setFiltroActivo("activos");
          }}
          items={[
            {
              key: "epp",
              label: "EPP",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <Toolbar q={q} filtro={filtroActivo} canEdit={canEditInventario} nuevoLabel="Nuevo EPP" onQChange={setQ} onFiltroChange={setFiltroActivo} onBuscar={() => void cargar()} onNuevo={abrirCrear} />
                  <Table dataSource={epp} columns={eppColumns} rowKey="id" loading={loading} size="small" scroll={{ x: 1180 }} pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${total} EPP` }} />
                </Space>
              ),
            },
            {
              key: "implementos",
              label: "Implementos",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <Toolbar q={q} filtro={filtroActivo} canEdit={canEditInventario} nuevoLabel="Nuevo implemento" onQChange={setQ} onFiltroChange={setFiltroActivo} onBuscar={() => void cargar()} onNuevo={abrirCrear} />
                  <Table dataSource={implementos} columns={implementoColumns} rowKey="id" loading={loading} size="small" scroll={{ x: 1300 }} pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${total} implementos` }} />
                </Space>
              ),
            },
            {
              key: "herramientas",
              label: "Herramientas",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <Toolbar q={q} filtro={filtroActivo} canEdit={canEditInventario} nuevoLabel="Nueva herramienta" onQChange={setQ} onFiltroChange={setFiltroActivo} onBuscar={() => void cargar()} onNuevo={abrirCrear} />
                  <Table dataSource={herramientas} columns={herramientaColumns} rowKey="id" loading={loading} size="small" scroll={{ x: 1220 }} pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${total} herramientas` }} />
                </Space>
              ),
            },
          ]}
        />
      </section>

      <Modal
        title={editing ? "Editar registro" : "Nuevo registro"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void guardar()}
        okText={editing ? "Guardar cambios" : "Crear"}
        confirmLoading={saving}
        width="94vw"
        style={{ maxWidth: 720 }}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
        destroyOnClose
      >
        {renderForm()}
      </Modal>

      <Drawer
        title="Detalle inventario"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width="92vw"
        style={{ maxWidth: 680 }}
        extra={selected && canEditInventario ? <Button icon={<EditOutlined />} onClick={() => abrirEditar(selected)}>Editar</Button> : null}
      >
        {renderDetalle()}
      </Drawer>

      <Modal
        title="Importar Excel"
        open={importModalOpen}
        onCancel={() => {
          if (!importing) setImportModalOpen(false);
        }}
        footer={[
          <Button key="cancel" disabled={importing} onClick={() => setImportModalOpen(false)}>
            Cerrar
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<UploadOutlined />}
            loading={importing}
            disabled={!importFile}
            onClick={() => void importarExcel()}
          >
            Importar
          </Button>,
        ]}
        width="94vw"
        style={{ maxWidth: 680 }}
        destroyOnClose
      >
        <div className="mt-3 flex flex-col gap-4">
          <Upload.Dragger
            accept=".xlsx"
            maxCount={1}
            fileList={importFileList}
            beforeUpload={(file) => {
              if (!/\.xlsx$/i.test(file.name)) {
                message.error("Solo se aceptan archivos .xlsx");
                return Upload.LIST_IGNORE;
              }
              setImportFile(file);
              setImportFileList([file]);
              setImportResult(null);
              return false;
            }}
            onRemove={() => {
              setImportFile(null);
              setImportFileList([]);
            }}
            disabled={importing}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click o arrastra el archivo aquí</p>
            <p className="ant-upload-hint">Se procesan solo las hojas EPP, Implementos y Herramientas presentes.</p>
          </Upload.Dragger>

          {importResult && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Text strong>Importación completada</Text>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["epp", "implementos", "herramientas"] as const).map((key) => {
                  const resumen = importResult[key];
                  if (!resumen) return null;
                  const label = key === "epp" ? "EPP" : key === "implementos" ? "Implementos" : "Herramientas";
                  return (
                    <div key={key} className="rounded-md border border-slate-200 bg-white p-3">
                      <Text strong>{label}</Text>
                      <p className="mt-1 text-xs text-slate-600">{resumen.creados} creados</p>
                      <p className="text-xs text-slate-600">{resumen.actualizados} actualizados</p>
                      <p className="text-xs text-slate-600">{resumen.errores} con error</p>
                    </div>
                  );
                })}
              </div>
              {importResult.errores.length > 0 && (
                <div className="mt-3">
                  <Text className="text-xs font-semibold text-red-600">Errores detectados:</Text>
                  <ul className="mt-1 max-h-32 overflow-auto pl-4 text-xs text-red-600">
                    {importResult.errores.slice(0, 10).map((error, index) => (
                      <li key={`${error.hoja}-${error.fila}-${index}`}>
                        {error.hoja} fila {error.fila || "-"}: {error.motivo}
                      </li>
                    ))}
                  </ul>
                  {importResult.errores.length > 10 && (
                    <Text type="secondary" className="text-xs">
                      Se muestran los primeros 10 errores de {importResult.errores.length}.
                    </Text>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Inventario;
