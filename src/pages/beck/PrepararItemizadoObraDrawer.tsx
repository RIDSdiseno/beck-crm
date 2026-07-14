import React, { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  Modal,
  Select,
  Skeleton,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  itemizadoOpcionesAPI,
  obrasAPI,
  type ItemizadoPreparacionObraInfo,
} from "../../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  obraId?: string;
  obraNombre?: string;
};

type IncluidoFilter = "todos" | "incluidos" | "no_incluidos";

// "Preparar itemizado" solo decide qué itemizados se incluyen en la propuesta
// que verá el cliente (propuestoAlCliente). Nombre personalizado, orden y
// rendimientos se configuran aparte en ConfigurarItemizadosObraDrawer y no se
// tocan aquí. propuestoAlCliente NO activa el itemizado para la obra (eso es
// `visible`, que solo cambia cuando el cliente confirma la propuesta).
type RowState = {
  itemizadoOpcionId: string;
  codigoBeck: string | null;
  elementoPasante: string | null;
  propuestoAlCliente: boolean;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const apiError = data as { error?: unknown; message?: unknown };
      if (typeof apiError.error === "string" && apiError.error.trim())
        return apiError.error;
      if (typeof apiError.message === "string" && apiError.message.trim())
        return apiError.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const isConflict = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 409;

const PrepararItemizadoObraDrawer: React.FC<Props> = ({
  open,
  onClose,
  obraId,
  obraNombre,
}) => {
  const [obraInfo, setObraInfo] = useState<ItemizadoPreparacionObraInfo | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [baseline, setBaseline] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterIncluido, setFilterIncluido] = useState<IncluidoFilter>("todos");

  // Solo lectura tanto si el cliente ya está revisando la propuesta
  // (EN_REVISION_CLIENTE) como si ya la confirmó (FINALIZADO): en ambos
  // casos el backend rechaza cualquier intento de modificar la selección.
  const isReadOnly = obraInfo ? obraInfo.estadoPreparacionItemizado !== "PREPARACION" : false;

  const hasChanges = useMemo(() => {
    if (rows.length !== baseline.length) return true;
    return rows.some((row, idx) => {
      const base = baseline[idx];
      if (!base) return true;
      return row.propuestoAlCliente !== base.propuestoAlCliente;
    });
  }, [rows, baseline]);

  const cargar = async () => {
    if (!obraId) return;
    setLoading(true);
    setError(null);
    try {
      // "Preparar itemizado" necesita el catálogo global COMPLETO (para poder
      // proponer itemizados hoy no propuestos), a diferencia de "Configurar
      // itemizados" (ConfigurarItemizadosObraDrawer), que correctamente solo
      // muestra los ya visibles vía GET /itemizado-opciones/obra/:obraId/configuracion.
      // listarItemizadoOpciones({ obraId }) ya resuelve el valor efectivo de
      // propuestoAlCliente (config de la obra si existe, si no false) para todo
      // el catálogo, sin filtrar nada.
      const [obra, opciones] = await Promise.all([
        obrasAPI.obtenerPorId(obraId),
        itemizadoOpcionesAPI.listar({ obraId }),
      ]);

      const estado = obra.estadoPreparacionItemizado ?? "PREPARACION";

      setObraInfo({
        id: obra.id,
        estadoPreparacionItemizado: estado,
        itemizadoFinalizadoAt: obra.itemizadoFinalizadoAt ?? null,
        itemizadoFinalizadoPor: obra.itemizadoFinalizadoPor ?? null,
      });

      // Una vez FINALIZADO esta pantalla pasa a ser el resumen final del contrato:
      // ya no interesa el catálogo completo (179 ítems), solo lo que el cliente
      // efectivamente aceptó. Los rechazados (propuestos pero no seleccionados) y
      // los nunca propuestos quedan fuera — aunque Beck luego active manualmente
      // algún itemizado adicional desde "Opciones de itemizado" (excepción
      // administrativa), eso no lo vuelve "aceptado por el cliente" y no debe
      // aparecer aquí.
      const opcionesRelevantes =
        estado === "FINALIZADO"
          ? opciones.filter((item) => item.seleccionadoPorCliente === true)
          : opciones;

      const nextRows: RowState[] = opcionesRelevantes
        .map((item) => ({
          itemizadoOpcionId: item.id,
          codigoBeck: item.codigoBeck ?? null,
          elementoPasante: item.elementoPasante ?? null,
          propuestoAlCliente: item.propuestoAlCliente ?? false,
        }))
        .sort((a, b) => (a.codigoBeck ?? "").localeCompare(b.codigoBeck ?? "", "es"));

      setRows(nextRows);
      setBaseline(nextRows.map((r) => ({ ...r })));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar la preparación del itemizado"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && obraId) {
      void cargar();
    }
    if (!open) {
      setSearch("");
      setFilterIncluido("todos");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, obraId]);

  const updateRow = (id: string, patch: Partial<RowState>) => {
    if (isReadOnly) return;
    setRows((prev) =>
      prev.map((row) => (row.itemizadoOpcionId === id ? { ...row, ...patch } : row))
    );
  };

  // Total del catálogo global (todos los itemizados, sin filtrar) vs. cuántos
  // están incluidos en la propuesta de esta obra — nunca depende del filtro seleccionado.
  const incluidosCount = useMemo(() => rows.filter((row) => row.propuestoAlCliente).length, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterIncluido === "incluidos" && !row.propuestoAlCliente) return false;
      if (filterIncluido === "no_incluidos" && row.propuestoAlCliente) return false;
      if (!q) return true;
      const haystack = [row.codigoBeck, row.elementoPasante]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, filterIncluido]);

  const handleGuardar = async () => {
    if (!obraId) return;

    const ids = rows.map((r) => r.itemizadoOpcionId);
    if (new Set(ids).size !== ids.length) {
      void message.error("Se detectaron itemizados duplicados. No se puede guardar.");
      return;
    }

    setSaving(true);
    try {
      // Endpoint dedicado: solo escribe propuestoAlCliente. Nunca envía visible,
      // orden, nombrePersonalizado ni rendimientos — el backend no los toca en
      // este endpoint, así que no hace falta preservarlos ni reenviarlos.
      await itemizadoOpcionesAPI.guardarPropuestaObra(obraId, {
        items: rows.map((row) => ({
          itemizadoOpcionId: row.itemizadoOpcionId,
          propuestoAlCliente: row.propuestoAlCliente,
        })),
      });
      void message.success("Los cambios fueron guardados correctamente");
      await cargar();
    } catch (err) {
      void message.error(getErrorMessage(err, "No se pudieron guardar los cambios"));
      if (isConflict(err)) {
        await cargar();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarACliente = () => {
    if (!obraId) return;
    Modal.confirm({
      title: "Enviar itemizado al cliente",
      content:
        "Esta acción enviará la propuesta al cliente para que defina el nombre de su Itemizado Mandante. Mientras esté en revisión, Beck no podrá modificar la selección.",
      okText: "Enviar al cliente",
      cancelText: "Cancelar",
      onOk: async () => {
        setFinalizando(true);
        try {
          await obrasAPI.enviarItemizadoARevisionCliente(obraId);
          void message.success("El itemizado fue enviado al cliente para su revisión.");
          await cargar();
        } catch (err) {
          void message.error(
            getErrorMessage(err, "No se pudo enviar el itemizado al cliente")
          );
          if (isConflict(err)) {
            await cargar();
          }
        } finally {
          setFinalizando(false);
        }
      },
    });
  };

  const handleRequestClose = () => {
    if (!isReadOnly && hasChanges) {
      Modal.confirm({
        title: "Cambios sin guardar",
        content:
          "Tiene cambios sin guardar en la preparación del itemizado. Si cierra ahora, se perderán.",
        okText: "Descartar y cerrar",
        cancelText: "Cancelar",
        onOk: () => {
          setRows(baseline.map((r) => ({ ...r })));
          onClose();
        },
      });
      return;
    }
    onClose();
  };

  const columns: ColumnsType<RowState> = [
    {
      title: "Incluir en propuesta",
      key: "propuestoAlCliente",
      width: 150,
      render: (_: unknown, record: RowState) => (
        <Switch
          size="small"
          checked={record.propuestoAlCliente}
          checkedChildren="Sí"
          unCheckedChildren="No"
          disabled={isReadOnly}
          onChange={(checked) => updateRow(record.itemizadoOpcionId, { propuestoAlCliente: checked })}
        />
      ),
    },
    {
      title: "Código BECK",
      key: "codigoBeck",
      width: 130,
      render: (_: unknown, record: RowState) => (
        <span className="font-mono text-xs">
          {record.codigoBeck || <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      title: "Itemizado BECK",
      key: "itemizadoBeck",
      render: (_: unknown, record: RowState) =>
        record.elementoPasante || <span className="text-slate-400">—</span>,
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={handleRequestClose}
      width="min(900px, 96vw)"
      title={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Typography.Title level={4} className="!m-0 truncate">
                Preparación de itemizado
              </Typography.Title>
              {obraInfo?.estadoPreparacionItemizado === "FINALIZADO" ? (
                <Tag color="green" className="!m-0 shrink-0 text-sm">
                  Itemizado confirmado
                </Tag>
              ) : obraInfo?.estadoPreparacionItemizado === "EN_REVISION_CLIENTE" ? (
                <Tag color="gold" className="!m-0 shrink-0 text-sm">
                  En revisión del cliente
                </Tag>
              ) : (
                <Tag color="blue" className="!m-0 shrink-0 text-sm">
                  En preparación
                </Tag>
              )}
            </div>
            <Typography.Text type="secondary" className="block truncate text-xs">
              {obraNombre || "-"}
            </Typography.Text>
            {isReadOnly && obraInfo?.itemizadoFinalizadoAt && (
              <Typography.Text type="secondary" className="block truncate text-xs">
                {obraInfo.estadoPreparacionItemizado === "FINALIZADO"
                  ? "Confirmado por el cliente el "
                  : "Enviado al cliente el "}
                {dayjs(obraInfo.itemizadoFinalizadoAt).format("DD-MM-YYYY HH:mm")}
                {obraInfo.itemizadoFinalizadoPor?.nombre
                  ? ` por ${obraInfo.itemizadoFinalizadoPor.nombre}`
                  : obraInfo.itemizadoFinalizadoPor?.email
                  ? ` por ${obraInfo.itemizadoFinalizadoPor.email}`
                  : ""}
              </Typography.Text>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void cargar()}
              disabled={loading || saving || finalizando}
              className="shrink-0"
            >
              Recargar
            </Button>
            {!isReadOnly && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={loading || finalizando || rows.length === 0}
                onClick={() => void handleGuardar()}
                className="shrink-0"
              >
                Guardar cambios
              </Button>
            )}
            {!isReadOnly && (
              <Button
                icon={<CheckCircleOutlined />}
                loading={finalizando}
                disabled={loading || saving || rows.length === 0}
                onClick={handleEnviarACliente}
                style={{ background: "#0f766e", borderColor: "#0f766e", color: "#fff" }}
                className="shrink-0"
              >
                Enviar al cliente
              </Button>
            )}
            <Button
              onClick={handleRequestClose}
              disabled={saving || finalizando}
              className="shrink-0"
            >
              Cerrar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {obraInfo?.estadoPreparacionItemizado === "EN_REVISION_CLIENTE" && (
          <Alert
            type="info"
            showIcon
            message="Itemizado en revisión del cliente"
            description="La propuesta fue enviada al cliente y está a la espera de su confirmación. Mientras esté en revisión, Beck no puede modificar la selección desde esta pantalla."
          />
        )}

        {obraInfo?.estadoPreparacionItemizado === "FINALIZADO" && (
          <Alert
            type="info"
            showIcon
            message="Resumen final del contrato"
            description="El cliente ya confirmó el itemizado de esta obra. Esta pantalla muestra únicamente los itemizados que el cliente aceptó; los rechazados ya no se listan aquí. Para agregar un itemizado adicional que haya faltado, use Opciones de itemizado."
          />
        )}

        {error && (
          <Alert
            type="error"
            showIcon
            message="No se pudo cargar la preparación del itemizado"
            description={error}
          />
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
            <Input
              size="small"
              placeholder="Buscar por código BECK o itemizado BECK"
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              size="small"
              value={filterIncluido}
              onChange={(v) => setFilterIncluido(v)}
              options={[
                { label: "Todos", value: "todos" },
                { label: "Incluidos", value: "incluidos" },
                { label: "No incluidos", value: "no_incluidos" },
              ]}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : rows.length === 0 && !error ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              obraInfo?.estadoPreparacionItemizado === "FINALIZADO"
                ? "El cliente no aceptó ningún itemizado en esta obra."
                : "No existen itemizados en el catálogo Beck."
            }
          />
        ) : (
          <>
            <div className="text-xs text-slate-500">
              {obraInfo?.estadoPreparacionItemizado === "FINALIZADO"
                ? `${rows.length} itemizado(s) aceptado(s) por el cliente`
                : `${incluidosCount} incluidos de ${rows.length} itemizados`}
              {filteredRows.length !== rows.length
                ? ` · mostrando ${filteredRows.length} con el filtro actual`
                : ""}
            </div>
            <Table<RowState>
              rowKey="itemizadoOpcionId"
              columns={columns}
              dataSource={filteredRows}
              size="small"
              pagination={{ pageSize: 25, showSizeChanger: false }}
              scroll={{ x: 600 }}
              locale={{ emptyText: "No hay itemizados que coincidan con el filtro" }}
            />
          </>
        )}
      </div>
    </Drawer>
  );
};

export default PrepararItemizadoObraDrawer;
