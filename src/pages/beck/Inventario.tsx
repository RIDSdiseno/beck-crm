import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Barcode from "react-barcode";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import {
  Badge,
  Button,
  Descriptions,
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
  BarcodeOutlined,
  CheckOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  InboxOutlined,
  PlusOutlined,
  RollbackOutlined,
  SearchOutlined,
  StopOutlined,
  UploadOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  inventarioBeckAPI,
  obrasAPI,
  usuariosAPI,
  type AsignacionInventarioBeck,
  type EstadoAsignacionInventario,
  type InventarioBeckEpp,
  type InventarioBeckEppPayload,
  type InventarioBeckHerramienta,
  type InventarioBeckHerramientaPayload,
  type InventarioBeckImportResultado,
  type InventarioBeckImplemento,
  type InventarioBeckImplementoPayload,
  type Obra,
  type TipoInventarioBeckItem,
  type UsuarioResumen,
} from "../../services/api";
import { usePermisos } from "../../hooks/usePermisos";
import { useAuth } from "../../context/useAuth";
import AsignarInventarioModal from "../../components/AsignarInventarioModal";
import AsignarATrabajadorModal from "../../components/AsignarATrabajadorModal";
import DevolverInventarioModal from "../../components/DevolverInventarioModal";

const { Text, Title } = Typography;

type FiltroActivo = "activos" | "inactivos" | "todos";
type FiltroEstadoAsignacion = EstadoAsignacionInventario | "todos";
type TabKey = "epp" | "implementos" | "herramientas" | "asignaciones";

const dash = (value?: string | null) => value?.trim() || "-";
const capitalizar = (value?: string | null) => {
  const v = value?.trim();
  if (!v) return "-";
  return v.charAt(0).toLocaleUpperCase("es-CL") + v.slice(1);
};
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("es-CL") : "-");
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("es-CL") : "-");
const dateInput = (value?: string | null) => (value ? value.slice(0, 10) : undefined);

function getNombreItem(
  row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta,
  tabKey: TabKey
): string {
  const nombre = tabKey === "herramientas" ? (row as InventarioBeckHerramienta).nombre : (row as InventarioBeckEpp | InventarioBeckImplemento).item;
  return nombre?.trim() ? capitalizar(nombre) : "";
}

function tabATipoItem(tabKey: TabKey): TipoInventarioBeckItem {
  if (tabKey === "implementos") return "implemento";
  if (tabKey === "herramientas") return "herramienta";
  return "epp";
}

function getStockDisponible(
  row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta,
  tabKey: TabKey
): number {
  if (tabKey === "herramientas") return 1;
  return (row as InventarioBeckEpp | InventarioBeckImplemento).saldo ?? 0;
}

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

type EtiquetaItem = { sku: string; nombre: string };

const LABEL_W_MM = 60;
const LABEL_H_MM = 32;
const LABEL_GAP_MM = 4;
const LABEL_PAGE_MARGIN_MM = 8;

function renderBarcodeCanvas(sku: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, sku, {
    format: "CODE128",
    displayValue: true,
    fontSize: 16,
    height: 45,
    margin: 6,
  });
  return canvas;
}

function descargarEtiquetasPdf(items: EtiquetaItem[], filename: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cols = Math.max(1, Math.floor((pageW - LABEL_PAGE_MARGIN_MM * 2 + LABEL_GAP_MM) / (LABEL_W_MM + LABEL_GAP_MM)));

  let col = 0;
  let x = LABEL_PAGE_MARGIN_MM;
  let y = LABEL_PAGE_MARGIN_MM;

  items.forEach((item, index) => {
    if (index > 0) {
      col += 1;
      if (col >= cols) {
        col = 0;
        x = LABEL_PAGE_MARGIN_MM;
        y += LABEL_H_MM + LABEL_GAP_MM;
      } else {
        x += LABEL_W_MM + LABEL_GAP_MM;
      }
    }
    if (y + LABEL_H_MM > pageH - LABEL_PAGE_MARGIN_MM) {
      doc.addPage();
      col = 0;
      x = LABEL_PAGE_MARGIN_MM;
      y = LABEL_PAGE_MARGIN_MM;
    }

    doc.setDrawColor(200);
    doc.rect(x, y, LABEL_W_MM, LABEL_H_MM);

    const canvas = renderBarcodeCanvas(item.sku);
    const availW = LABEL_W_MM - 6;
    const availH = LABEL_H_MM - 12;
    const aspect = canvas.width / canvas.height;
    let imgW = availW;
    let imgH = imgW / aspect;
    if (imgH > availH) {
      imgH = availH;
      imgW = imgH * aspect;
    }
    const imgX = x + (LABEL_W_MM - imgW) / 2;
    const imgY = y + 3;
    doc.addImage(canvas.toDataURL("image/png"), "PNG", imgX, imgY, imgW, imgH);

    if (item.nombre) {
      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.text(item.nombre, x + LABEL_W_MM / 2, y + LABEL_H_MM - 3, {
        align: "center",
        maxWidth: LABEL_W_MM - 6,
      });
    }
  });

  doc.save(filename);
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
  const { user } = useAuth();
  const esSupervisor = user?.rol === "JefeObra";
  const location = useLocation();
  const pendingHerramientaId = useRef<string | null>(null);
  const lastOpenedAlertTs = useRef<number | null>(null);

  const [tab, setTab] = useState<TabKey>("epp");
  const [q, setQ] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("activos");
  const [loading, setLoading] = useState(false);

  const [epp, setEpp] = useState<InventarioBeckEpp[]>([]);
  const [implementos, setImplementos] = useState<InventarioBeckImplemento[]>([]);
  const [herramientas, setHerramientas] = useState<InventarioBeckHerramienta[]>([]);
  const [generandoSkuId, setGenerandoSkuId] = useState<string | null>(null);
  const [generandoSkuMasivo, setGenerandoSkuMasivo] = useState(false);

  const [eppModoSeleccion, setEppModoSeleccion] = useState(false);
  const [eppSeleccionados, setEppSeleccionados] = useState<React.Key[]>([]);
  const [implementosModoSeleccion, setImplementosModoSeleccion] = useState(false);
  const [implementosSeleccionados, setImplementosSeleccionados] = useState<React.Key[]>([]);
  const [herramientasModoSeleccion, setHerramientasModoSeleccion] = useState(false);
  const [herramientasSeleccionadas, setHerramientasSeleccionadas] = useState<React.Key[]>([]);

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

  const [asignarModalOpen, setAsignarModalOpen] = useState(false);
  const [asignarTrabajadorModalOpen, setAsignarTrabajadorModalOpen] = useState(false);
  const [devolverModalOpen, setDevolverModalOpen] = useState(false);
  const [asignarItemInicial, setAsignarItemInicial] = useState<{
    tipoItem: TipoInventarioBeckItem;
    itemId: string;
    nombre: string;
    stockDisponible: number;
  } | null>(null);
  const [asignarObraInicial, setAsignarObraInicial] = useState<string | null>(null);

  const [asignaciones, setAsignaciones] = useState<AsignacionInventarioBeck[]>([]);
  const [obrasFiltro, setObrasFiltro] = useState<Obra[]>([]);
  const [jefesObraFiltro, setJefesObraFiltro] = useState<UsuarioResumen[]>([]);
  const [filtroObraId, setFiltroObraId] = useState<string | null>(null);
  const [filtroJefeObraId, setFiltroJefeObraId] = useState<string | null>(null);
  const [filtroEstadoAsignacion, setFiltroEstadoAsignacion] = useState<FiltroEstadoAsignacion>("asignado");

  useEffect(() => {
    obrasAPI.listar({ activa: true }).then(setObrasFiltro).catch(() => {});
    usuariosAPI.listarJefesObra().then(setJefesObraFiltro).catch(() => {});
  }, []);

  const abrirAsignar = (row?: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta) => {
    if (esSupervisor) {
      setAsignarTrabajadorModalOpen(true);
      return;
    }
    setAsignarItemInicial(
      row
        ? { tipoItem: tabATipoItem(tab), itemId: row.id, nombre: getNombreItem(row, tab), stockDisponible: getStockDisponible(row, tab) }
        : null
    );
    setAsignarObraInicial(null);
    setAsignarModalOpen(true);
  };

  const abrirAsignarDesdeAsignacion = (row: AsignacionInventarioBeck) => {
    const itemId = row.eppId ?? row.implementoId ?? row.herramientaId ?? "";
    const nombre = capitalizar(row.epp?.item ?? row.implemento?.item ?? row.herramienta?.nombre);
    const stockDisponible =
      row.tipoItem === "herramienta"
        ? 1
        : row.tipoItem === "implemento"
          ? implementos.find((i) => i.id === itemId)?.saldo ?? 0
          : epp.find((i) => i.id === itemId)?.saldo ?? 0;
    setAsignarItemInicial({ tipoItem: row.tipoItem, itemId, nombre, stockDisponible });
    setAsignarObraInicial(row.obraId);
    setAsignarModalOpen(true);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(q, filtroActivo);
      if (tab === "epp") setEpp(await inventarioBeckAPI.epp.listar(params));
      if (tab === "implementos") setImplementos(await inventarioBeckAPI.implementos.listar(params));
      if (tab === "herramientas") setHerramientas(await inventarioBeckAPI.herramientas.listar(params));
      if (tab === "asignaciones") {
        setAsignaciones(
          await inventarioBeckAPI.asignaciones.listar({
            obraId: filtroObraId ?? undefined,
            jefeObraId: filtroJefeObraId ?? undefined,
            estado: filtroEstadoAsignacion === "todos" ? undefined : filtroEstadoAsignacion,
          })
        );
      }
    } catch {
      message.error("No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, [filtroActivo, q, tab, filtroObraId, filtroJefeObraId, filtroEstadoAsignacion]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const state = location.state as {
      herramientaId?: string;
      alertNavigationTs?: number;
    } | null;
    const ts = state?.alertNavigationTs;
    const id = state?.herramientaId;
    if (!ts || !id) return;
    if (lastOpenedAlertTs.current === ts) return;
    lastOpenedAlertTs.current = ts;
    setTab("herramientas");
    if (herramientas.length > 0) {
      const target = herramientas.find((h) => h.id === id);
      if (target) abrirEditar(target, "herramientas");
    } else {
      pendingHerramientaId.current = id;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!pendingHerramientaId.current || herramientas.length === 0) return;
    const id = pendingHerramientaId.current;
    pendingHerramientaId.current = null;
    const target = herramientas.find((h) => h.id === id);
    if (target) abrirEditar(target, "herramientas");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [herramientas]);

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

  const abrirEditar = (
    row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta,
    tabOverride?: TabKey
  ) => {
    const tabActual = tabOverride ?? tab;
    setEditing(row);
    if (tabActual === "epp") eppForm.setFieldsValue(row as InventarioBeckEpp);
    if (tabActual === "implementos") {
      const item = row as InventarioBeckImplemento;
      implementoForm.setFieldsValue({ ...item, fecha: dateInput(item.fecha) });
    }
    if (tabActual === "herramientas") {
      const item = row as InventarioBeckHerramienta;
      herramientaForm.setFieldsValue({
        ...item,
        fechaCompra: dateInput(item.fechaCompra),
        fechaMantencion: dateInput(item.fechaMantencion),
      });
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

  const generarSkuUno = async (row: InventarioBeckEpp | InventarioBeckImplemento, tabKey: "epp" | "implementos") => {
    setGenerandoSkuId(row.id);
    try {
      if (tabKey === "implementos") await inventarioBeckAPI.implementos.generarSku(row.id);
      else await inventarioBeckAPI.epp.generarSku(row.id);
      message.success("SKU generado");
      await cargar();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo generar el SKU"));
    } finally {
      setGenerandoSkuId(null);
    }
  };

  const generarSkuTodos = async (tabKey: "epp" | "implementos") => {
    setGenerandoSkuMasivo(true);
    try {
      const { actualizados } =
        tabKey === "implementos"
          ? await inventarioBeckAPI.implementos.generarSkuMasivo()
          : await inventarioBeckAPI.epp.generarSkuMasivo();
      message.success(
        actualizados > 0
          ? `Se generaron ${actualizados} SKU nuevo(s)`
          : tabKey === "implementos"
          ? "No hay implementos sin SKU"
          : "No hay EPP sin SKU"
      );
      await cargar();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo generar los SKU"));
    } finally {
      setGenerandoSkuMasivo(false);
    }
  };

  const descargarEtiquetaUna = (row: InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta, tabKey: TabKey) => {
    if (!row.sku?.trim()) {
      message.warning("Este registro no tiene SKU");
      return;
    }
    descargarEtiquetasPdf([{ sku: row.sku, nombre: getNombreItem(row, tabKey) }], `etiqueta-${row.sku}.pdf`);
  };

  const descargarEtiquetasSeleccionadas = (
    dataset: (InventarioBeckEpp | InventarioBeckImplemento | InventarioBeckHerramienta)[],
    keys: React.Key[],
    tabKey: TabKey
  ) => {
    const seleccionados = dataset.filter((row) => keys.includes(row.id));
    const items = seleccionados
      .filter((row) => row.sku?.trim())
      .map((row) => ({ sku: row.sku as string, nombre: getNombreItem(row, tabKey) }));
    const sinSku = seleccionados.length - items.length;
    if (items.length === 0) {
      message.warning("Los registros seleccionados no tienen SKU");
      return;
    }
    descargarEtiquetasPdf(items, `etiquetas-${tabKey}-${items.length}.pdf`);
    if (sinSku > 0) {
      message.warning(`${sinSku} registro(s) sin SKU no se incluyeron`);
    }
  };

  const descargarSubSkusAsignacion = (row: AsignacionInventarioBeck) => {
    if (!row.subSkus || row.subSkus.length === 0) {
      message.warning("Esta asignación no tiene sub-SKU por unidad (el ítem no tenía SKU al momento de asignar)");
      return;
    }
    const nombreItem = capitalizar(row.epp?.item ?? row.implemento?.item ?? row.herramienta?.nombre);
    const items = row.subSkus.map((sku) => ({ sku, nombre: nombreItem }));
    descargarEtiquetasPdf(items, `sub-sku-${row.id}.pdf`);
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
          {row.sku?.trim() && (
            <Button type="text" size="small" icon={<DownloadOutlined />} title="Descargar etiqueta" onClick={() => descargarEtiquetaUna(row, tab)} />
          )}
          {canEditInventario && (
            <Button type="text" size="small" icon={<EditOutlined />} title="Editar" onClick={() => abrirEditar(row)} />
          )}
          {canEditInventario && row.activo && !esSupervisor && (
            <Button type="text" size="small" icon={<UserSwitchOutlined />} title="Asignar a supervisor" onClick={() => abrirAsignar(row)} />
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

  const eppActionColumn = useMemo(
    () => ({
      title: "Acciones",
      key: "acciones",
      width: 150,
      render: (_: unknown, row: InventarioBeckEpp) => (
        <Space size="small" wrap>
          <Button type="text" size="small" icon={<EyeOutlined />} title="Ver" onClick={() => abrirDetalle(row)} />
          {row.sku?.trim() && (
            <Button type="text" size="small" icon={<DownloadOutlined />} title="Descargar etiqueta" onClick={() => descargarEtiquetaUna(row, "epp")} />
          )}
          {canEditInventario && (
            <Button type="text" size="small" icon={<EditOutlined />} title="Editar" onClick={() => abrirEditar(row)} />
          )}
          {canEditInventario && !row.sku?.trim() && (
            <Button
              type="text"
              size="small"
              icon={<BarcodeOutlined />}
              title="Generar SKU"
              loading={generandoSkuId === row.id}
              onClick={() => void generarSkuUno(row, "epp")}
            />
          )}
          {canEditInventario && row.activo && !esSupervisor && (
            <Button type="text" size="small" icon={<UserSwitchOutlined />} title="Asignar a supervisor" onClick={() => abrirAsignar(row)} />
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
    [canEditInventario, selected, tab, cargar, generandoSkuId]
  );

  const implementoActionColumn = useMemo(
    () => ({
      title: "Acciones",
      key: "acciones",
      width: 150,
      render: (_: unknown, row: InventarioBeckImplemento) => (
        <Space size="small" wrap>
          <Button type="text" size="small" icon={<EyeOutlined />} title="Ver" onClick={() => abrirDetalle(row)} />
          {row.sku?.trim() && (
            <Button type="text" size="small" icon={<DownloadOutlined />} title="Descargar etiqueta" onClick={() => descargarEtiquetaUna(row, "implementos")} />
          )}
          {canEditInventario && (
            <Button type="text" size="small" icon={<EditOutlined />} title="Editar" onClick={() => abrirEditar(row)} />
          )}
          {canEditInventario && !row.sku?.trim() && (
            <Button
              type="text"
              size="small"
              icon={<BarcodeOutlined />}
              title="Generar SKU"
              loading={generandoSkuId === row.id}
              onClick={() => void generarSkuUno(row, "implementos")}
            />
          )}
          {canEditInventario && row.activo && !esSupervisor && (
            <Button type="text" size="small" icon={<UserSwitchOutlined />} title="Asignar a supervisor" onClick={() => abrirAsignar(row)} />
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
    [canEditInventario, selected, tab, cargar, generandoSkuId]
  );

  const eppColumns: ColumnsType<InventarioBeckEpp> = [
    { title: "SKU", dataIndex: "sku", width: 110, render: dash },
    { title: "Item", dataIndex: "item", width: 200, ellipsis: true, render: (v: string) => <Text strong>{capitalizar(v)}</Text> },
    { title: "Modelo / Marca", dataIndex: "modeloMarca", width: 160, ellipsis: true, render: dash },
    { title: "Unidad", dataIndex: "unidadMedida", width: 110, render: dash },
    { title: "Talla", dataIndex: "talla", width: 90, render: dash },
    { title: "Color", dataIndex: "color", width: 100, render: dash },
    { title: "Stock", dataIndex: "saldo", width: 90, align: "right", render: (v: number) => v ?? 0 },
    { title: "Estado", dataIndex: "activo", width: 95, render: (v: boolean) => <EstadoBadge activo={v} /> },
    eppActionColumn as ColumnsType<InventarioBeckEpp>[number],
  ];

  const implementoColumns: ColumnsType<InventarioBeckImplemento> = [
    { title: "SKU", dataIndex: "sku", width: 110, render: dash },
    { title: "Item", dataIndex: "item", width: 190, ellipsis: true, render: (v: string) => <Text strong>{capitalizar(v)}</Text> },
    { title: "Modelo / Marca", dataIndex: "modeloMarca", width: 150, ellipsis: true, render: dash },
    { title: "Cantidad", dataIndex: "cantidad", width: 90, align: "right", render: (v: number) => v ?? 0 },
    { title: "Unidad", dataIndex: "unidadMedida", width: 130, render: dash },
    { title: "Talla / Medida", dataIndex: "tallaMedida", width: 120, render: dash },
    { title: "Color", dataIndex: "color", width: 100, render: dash },
    { title: "Ubicación", dataIndex: "ubicacion", width: 120, render: dash },
    { title: "Saldo", dataIndex: "saldo", width: 80, align: "right", render: (v: number) => v ?? 0 },
    { title: "Estado", dataIndex: "activo", width: 95, render: (v: boolean) => <EstadoBadge activo={v} /> },
    implementoActionColumn as ColumnsType<InventarioBeckImplemento>[number],
  ];

  const herramientaColumns: ColumnsType<InventarioBeckHerramienta> = [
    { title: "SKU", dataIndex: "sku", width: 120, render: dash },
    { title: "Nombre", dataIndex: "nombre", width: 200, ellipsis: true, render: (v: string) => <Text strong>{capitalizar(v)}</Text> },
    { title: "Marca", dataIndex: "marca", width: 120, render: dash },
    { title: "Modelo", dataIndex: "modelo", width: 150, ellipsis: true, render: dash },
    { title: "Categoría", dataIndex: "categoria", width: 130, render: dash },
    { title: "Ubicación", dataIndex: "ubicacion", width: 130, render: dash },
    { title: "F. Compra", dataIndex: "fechaCompra", width: 105, render: formatDate },
    { title: "F. Mantención", dataIndex: "fechaMantencion", width: 115, render: formatDate },
    { title: "Encargado", dataIndex: "encargado", width: 140, ellipsis: true, render: dash },
    { title: "Estado", dataIndex: "activo", width: 95, render: (v: boolean) => <EstadoBadge activo={v} /> },
    actionColumn as ColumnsType<InventarioBeckHerramienta>[number],
  ];

  const TIPO_ITEM_LABEL: Record<TipoInventarioBeckItem, string> = {
    epp: "EPP",
    implemento: "Implemento",
    herramienta: "Herramienta",
  };

  const asignacionesColumns: ColumnsType<AsignacionInventarioBeck> = [
    { title: "Fecha", dataIndex: "createdAt", width: 150, render: formatDateTime },
    { title: "Obra", width: 160, ellipsis: true, render: (_: unknown, row: AsignacionInventarioBeck) => row.obra?.nombre ?? "-" },
    { title: "Tipo", dataIndex: "tipoItem", width: 110, render: (v: TipoInventarioBeckItem) => TIPO_ITEM_LABEL[v] },
    {
      title: "Item",
      ellipsis: true,
      render: (_: unknown, row: AsignacionInventarioBeck) => capitalizar(row.epp?.item ?? row.implemento?.item ?? row.herramienta?.nombre),
    },
    { title: "Cantidad", dataIndex: "cantidad", width: 90, align: "right" },
    { title: "Asignado por", width: 160, ellipsis: true, render: (_: unknown, row: AsignacionInventarioBeck) => row.asignadoPor?.nombre ?? "-" },
    { title: "Supervisor", width: 160, ellipsis: true, render: (_: unknown, row: AsignacionInventarioBeck) => row.jefeObra?.nombre ?? "-" },
    { title: "Trabajador", width: 160, ellipsis: true, render: (_: unknown, row: AsignacionInventarioBeck) => row.trabajador?.nombre ?? "-" },
    { title: "Observación", dataIndex: "observacion", ellipsis: true, render: dash },
    {
      title: "Estado",
      dataIndex: "estado",
      width: 110,
      render: (v: EstadoAsignacionInventario) =>
        v === "devuelto" ? <Badge status="default" text="Devuelto" /> : <Badge status="processing" text="Asignado" />,
    },
    {
      title: "Sub-SKU",
      width: 180,
      ellipsis: true,
      render: (_: unknown, row: AsignacionInventarioBeck) =>
        row.subSkus && row.subSkus.length > 0 ? row.subSkus.join(", ") : "-",
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 110,
      render: (_: unknown, row: AsignacionInventarioBeck) => (
        <Space size="small" wrap>
          {row.subSkus && row.subSkus.length > 0 && (
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              title="Descargar etiquetas por unidad"
              onClick={() => descargarSubSkusAsignacion(row)}
            />
          )}
          {canEditInventario && !esSupervisor && (
            <Button
              type="text"
              size="small"
              icon={<UserSwitchOutlined />}
              title="Asignar este item en esta obra"
              onClick={() => abrirAsignarDesdeAsignacion(row)}
            />
          )}
        </Space>
      ),
    },
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
          <Form.Item name="fechaCompra" label="Fecha de compra"><Input type="date" /></Form.Item>
          <Form.Item name="fechaMantencion" label="Fecha de mantención"><Input type="date" /></Form.Item>
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
      <div className="flex flex-col gap-4">
        {selected.sku?.trim() && (
          <div className="flex justify-center overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
            <Barcode value={selected.sku} height={60} fontSize={14} margin={0} />
          </div>
        )}
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          {entries.map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {key === "activo" ? <EstadoBadge activo={Boolean(value)} /> : value == null || value === "" ? "-" : String(["fecha", "fechaCompra", "fechaMantencion"].includes(key) ? formatDate(value as string) : value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </div>
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
            <Space className="ml-auto">
              <Button icon={<UserSwitchOutlined />} onClick={() => abrirAsignar()}>
                Asignar
              </Button>
              <Button icon={<RollbackOutlined />} onClick={() => setDevolverModalOpen(true)}>
                Devolver
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={() => setImportModalOpen(true)}>
                Importar Excel
              </Button>
            </Space>
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
                  <div className="flex flex-wrap justify-end gap-2">
                    {eppModoSeleccion && eppSeleccionados.length > 0 && (
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => descargarEtiquetasSeleccionadas(epp, eppSeleccionados, "epp")}
                      >
                        Descargar etiquetas ({eppSeleccionados.length})
                      </Button>
                    )}
                    <Button
                      type={eppModoSeleccion ? "default" : undefined}
                      danger={eppModoSeleccion}
                      onClick={() => {
                        setEppModoSeleccion((v) => !v);
                        setEppSeleccionados([]);
                      }}
                    >
                      {eppModoSeleccion ? "Cancelar selección" : "Seleccionar"}
                    </Button>
                    {canEditInventario && (
                      <Button
                        icon={<BarcodeOutlined />}
                        loading={generandoSkuMasivo}
                        onClick={() => void generarSkuTodos("epp")}
                      >
                        Generar SKU faltantes
                      </Button>
                    )}
                  </div>
                  <Table
                    dataSource={epp}
                    columns={eppColumns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 1180 }}
                    pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${total} EPP` }}
                    rowSelection={eppModoSeleccion ? { selectedRowKeys: eppSeleccionados, onChange: setEppSeleccionados } : undefined}
                  />
                </Space>
              ),
            },
            {
              key: "implementos",
              label: "Implementos",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <Toolbar q={q} filtro={filtroActivo} canEdit={canEditInventario} nuevoLabel="Nuevo implemento" onQChange={setQ} onFiltroChange={setFiltroActivo} onBuscar={() => void cargar()} onNuevo={abrirCrear} />
                  <div className="flex flex-wrap justify-end gap-2">
                    {implementosModoSeleccion && implementosSeleccionados.length > 0 && (
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => descargarEtiquetasSeleccionadas(implementos, implementosSeleccionados, "implementos")}
                      >
                        Descargar etiquetas ({implementosSeleccionados.length})
                      </Button>
                    )}
                    <Button
                      type={implementosModoSeleccion ? "default" : undefined}
                      danger={implementosModoSeleccion}
                      onClick={() => {
                        setImplementosModoSeleccion((v) => !v);
                        setImplementosSeleccionados([]);
                      }}
                    >
                      {implementosModoSeleccion ? "Cancelar selección" : "Seleccionar"}
                    </Button>
                    {canEditInventario && (
                      <Button
                        icon={<BarcodeOutlined />}
                        loading={generandoSkuMasivo}
                        onClick={() => void generarSkuTodos("implementos")}
                      >
                        Generar SKU faltantes
                      </Button>
                    )}
                  </div>
                  <Table
                    dataSource={implementos}
                    columns={implementoColumns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${total} implementos` }}
                    rowSelection={implementosModoSeleccion ? { selectedRowKeys: implementosSeleccionados, onChange: setImplementosSeleccionados } : undefined}
                  />
                </Space>
              ),
            },
            {
              key: "herramientas",
              label: "Herramientas",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <Toolbar q={q} filtro={filtroActivo} canEdit={canEditInventario} nuevoLabel="Nueva herramienta" onQChange={setQ} onFiltroChange={setFiltroActivo} onBuscar={() => void cargar()} onNuevo={abrirCrear} />
                  <div className="flex flex-wrap justify-end gap-2">
                    {herramientasModoSeleccion && herramientasSeleccionadas.length > 0 && (
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => descargarEtiquetasSeleccionadas(herramientas, herramientasSeleccionadas, "herramientas")}
                      >
                        Descargar etiquetas ({herramientasSeleccionadas.length})
                      </Button>
                    )}
                    <Button
                      type={herramientasModoSeleccion ? "default" : undefined}
                      danger={herramientasModoSeleccion}
                      onClick={() => {
                        setHerramientasModoSeleccion((v) => !v);
                        setHerramientasSeleccionadas([]);
                      }}
                    >
                      {herramientasModoSeleccion ? "Cancelar selección" : "Seleccionar"}
                    </Button>
                  </div>
                  <Table
                    dataSource={herramientas}
                    columns={herramientaColumns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 1220 }}
                    pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${total} herramientas` }}
                    rowSelection={herramientasModoSeleccion ? { selectedRowKeys: herramientasSeleccionadas, onChange: setHerramientasSeleccionadas } : undefined}
                  />
                </Space>
              ),
            },
            {
              key: "asignaciones",
              label: "Asignaciones",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <Space wrap>
                      <Select<FiltroEstadoAsignacion>
                        aria-label="Filtrar asignaciones por estado"
                        className="!w-full sm:!w-[180px]"
                        value={filtroEstadoAsignacion}
                        onChange={setFiltroEstadoAsignacion}
                        options={[
                          { value: "asignado", label: "Activas" },
                          { value: "devuelto", label: "Devueltas" },
                          { value: "todos", label: "Todas" },
                        ]}
                      />
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Filtrar por obra"
                        className="!w-full sm:!w-[220px]"
                        value={filtroObraId ?? undefined}
                        onChange={(value) => setFiltroObraId(value ?? null)}
                        options={obrasFiltro.map((obra) => ({ value: obra.id, label: obra.nombre }))}
                      />
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Filtrar por supervisor"
                        className="!w-full sm:!w-[220px]"
                        value={filtroJefeObraId ?? undefined}
                        onChange={(value) => setFiltroJefeObraId(value ?? null)}
                        options={jefesObraFiltro.map((usuario) => ({ value: usuario.id, label: usuario.nombre }))}
                      />
                    </Space>
                    {canEditInventario && (
                      <Space>
                        <Button icon={<RollbackOutlined />} onClick={() => setDevolverModalOpen(true)}>
                          Devolver
                        </Button>
                        <Button type="primary" icon={<UserSwitchOutlined />} onClick={() => abrirAsignar()}>
                          Asignar
                        </Button>
                      </Space>
                    )}
                  </div>
                  <Table
                    dataSource={asignaciones}
                    columns={asignacionesColumns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 1560 }}
                    locale={{
                      emptyText: filtroEstadoAsignacion === "asignado"
                        ? "No hay asignaciones activas"
                        : filtroEstadoAsignacion === "devuelto"
                          ? "No hay asignaciones devueltas"
                          : "No hay asignaciones",
                    }}
                    pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${total} asignaciones` }}
                  />
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

      <Modal
        title="Detalle inventario"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={selected ? [
          selected.sku?.trim() && (
            <Button key="descargar" icon={<DownloadOutlined />} onClick={() => descargarEtiquetaUna(selected, tab)}>
              Descargar etiqueta
            </Button>
          ),
          canEditInventario && (
            <Button key="editar" icon={<EditOutlined />} onClick={() => abrirEditar(selected)}>Editar</Button>
          ),
        ] : null}
        width="92vw"
        style={{ maxWidth: 680 }}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
        destroyOnClose
      >
        {renderDetalle()}
      </Modal>

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

      <AsignarInventarioModal
        open={asignarModalOpen}
        onClose={() => setAsignarModalOpen(false)}
        onAsignado={() => void cargar()}
        itemInicial={asignarItemInicial}
        obraIdInicial={asignarObraInicial}
      />

      <AsignarATrabajadorModal
        open={asignarTrabajadorModalOpen}
        onClose={() => setAsignarTrabajadorModalOpen(false)}
        onAsignado={() => void cargar()}
      />

      <DevolverInventarioModal
        open={devolverModalOpen}
        onClose={() => setDevolverModalOpen(false)}
        onDevuelto={() => void cargar()}
        soloSupervisor={esSupervisor && user ? { id: user.id, nombre: user.nombre } : undefined}
      />
    </div>
  );
};

export default Inventario;
