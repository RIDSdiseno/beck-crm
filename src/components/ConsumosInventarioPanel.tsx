import { useEffect, useState } from 'react';
import { Alert, Button, Card, Select, Space, Table, Tag, Typography, message } from 'antd';
import { api } from '../services/api';

type Consumo = { id: string; nombre: string; obra: string; operario: string; supervisor: string; cantidad: number; estado: string; sub_skus: string[]; solicitado_at: string; resuelto_at: string | null; resuelto_por: string | null; observacion: string | null; motivo_rechazo: string | null };
type Page = { habilitado: boolean; items: Consumo[]; pendientes: number; hasMore: boolean };
export function ConsumosInventarioPanel({ obras }: { obras: { id: string; nombre: string }[] }) {
  const [estado, setEstado] = useState('pendiente'), [obraId, setObraId] = useState<string>();
  const [page, setPage] = useState(1), [reload, setReload] = useState(0), [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Page>({ habilitado: true, items: [], pendientes: 0, hasMore: false });
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const response = await api.get<{ data: Page }>('/inventario-beck/consumos', { params: { estado, obraId, page }, signal: controller.signal });
        if (!controller.signal.aborted) setResult(response.data.data);
      } catch { if (!controller.signal.aborted) { setError('No se pudieron obtener los consumos.'); setResult({ habilitado: true, items: [], pendientes: 0, hasMore: false }); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [estado, obraId, page, reload]);
  return <Space orientation="vertical" style={{ width: '100%' }}>
    <Card title={`Consumos informados · ${result.pendientes} pendientes`} extra={<Button onClick={() => setReload(n => n + 1)}>Actualizar</Button>}>
      <Typography.Paragraph>El supervisor confirma el consumo informado por el operario. No se reintegra ni se descuenta nuevamente stock central.</Typography.Paragraph>
      <Space wrap>
        <Select value={estado} style={{ width: 240 }} options={[{ value: 'pendiente', label: 'Pendientes de confirmación' }, { value: 'confirmado', label: 'Consumidos' }, { value: 'rechazado', label: 'Rechazados' }, { value: 'todos', label: 'Todos' }]} onChange={v => { setEstado(v); setPage(1); }} />
        <Select allowClear showSearch optionFilterProp="label" value={obraId} placeholder="Todas las obras" style={{ width: 280 }} options={obras.map(o => ({ value: o.id, label: o.nombre }))} onChange={v => { setObraId(v); setPage(1); }} />
      </Space>
    </Card>
    {!result.habilitado && <Alert type="info" title="La función se habilitará después de aplicar la migración coordinada del inventario." />}
    {!!error && <Alert type="error" title={error} />}
    <Table<Consumo> rowKey="id" loading={loading} dataSource={result.items} pagination={false} scroll={{ x: 1050 }} columns={[
      { title: 'Artículo', dataIndex: 'nombre' }, { title: 'Cantidad', dataIndex: 'cantidad', width: 90 },
      { title: 'Obra', dataIndex: 'obra' }, { title: 'Operario', dataIndex: 'operario' }, { title: 'Supervisor', dataIndex: 'supervisor' },
      { title: 'Estado', dataIndex: 'estado', render: value => <Tag color={value === 'confirmado' ? 'green' : value === 'rechazado' ? 'red' : 'gold'}>{value === 'confirmado' ? 'Consumido' : value === 'rechazado' ? 'Rechazado' : 'Pendiente'}</Tag> },
      { title: 'Fecha del aviso', dataIndex: 'solicitado_at', render: value => new Date(value).toLocaleString('es-CL') },
    ]} expandable={{ expandedRowRender: item => <Space orientation="vertical">
      <Typography.Text>Códigos: {item.sub_skus.join(', ') || 'Sin códigos unitarios'}</Typography.Text>
      <Typography.Text>Observación del operario: {item.observacion || 'Sin observación'}</Typography.Text>
      <Typography.Text>{item.resuelto_at ? `Resuelto por ${item.resuelto_por} · ${new Date(item.resuelto_at).toLocaleString('es-CL')}` : 'Esperando al supervisor'}</Typography.Text>
      {!!item.motivo_rechazo && <Typography.Text type="danger">Motivo del rechazo: {item.motivo_rechazo}</Typography.Text>}
    </Space> }} />
    <Space><Button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page}</span><Button disabled={!result.hasMore || loading} onClick={() => setPage(p => p + 1)}>Siguiente</Button></Space>
  </Space>;
}

export function PoliticaConsumoButton({ tipo, id }: { tipo: string; id: string }) {
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState<{ habilitado: boolean; consumible: boolean }>();
  const [msg, context] = message.useMessage();
  useEffect(() => { let active = true; void api.get(`/inventario-beck/consumos/politica/${tipo}/${id}`).then(r => { if (active) setPolicy(r.data.data); }).catch(() => { if (active) void msg.error('No se pudo consultar la política de consumo'); }); return () => { active = false; }; }, [id, tipo, msg]);
  async function toggle() {
    if (!policy?.habilitado || busy) return;
    setBusy(true);
    try {
      const response = await api.put(`/inventario-beck/consumos/politica/${tipo}/${id}`, { consumible: !policy.consumible });
      setPolicy(response.data.data); void msg.success('Política de consumo actualizada');
    } catch { void msg.error('No se pudo actualizar la política de consumo'); }
    finally { setBusy(false); }
  }
  return <Card size="small" title="Uso del artículo" style={{ marginBottom: 16 }}>{context}
    <Typography.Paragraph>{policy?.habilitado ? policy.consumible ? 'Consumible: el operario puede informar consumo; el supervisor debe confirmarlo.' : 'Retornable: debe devolverse. No permite informar consumo.' : 'Consumos pendientes de habilitación mediante la migración coordinada.'}</Typography.Paragraph>
    <Button disabled={!policy?.habilitado} loading={busy} onClick={() => void toggle()}>{policy?.consumible ? 'Marcar como retornable' : 'Marcar como consumible'}</Button>
  </Card>;
}
