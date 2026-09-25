import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, EyeOutlined, FilePdfOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { pdfsFirmadosAPI, type FiltrosPdf, type PaginaPdf, type PdfFirmado } from '../../services/pdfsFirmadosApi';

dayjs.extend(utc);
dayjs.extend(timezone);
const ZONA = 'America/Santiago';

async function mensajeError(error: unknown) {
  const data = (error as { response?: { data?: { error?: string } | Blob } })?.response?.data;
  if (data instanceof Blob) {
    try { return JSON.parse(await data.text()).error || 'No se pudo obtener el PDF firmado'; } catch { /* Respuesta no JSON */ }
  } else if (data?.error) return data.error;
  return 'No se pudo completar la consulta. Intenta nuevamente.';
}

export default function PdfsFirmados() {
  const [msg, contextHolder] = message.useMessage();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [obraId, setObraId] = useState<string>();
  const [firmanteId, setFirmanteId] = useState<string>();
  const [fechas, setFechas] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<PaginaPdf>({ items: [], total: 0, page: 1, limit: 25 });
  const [filtros, setFiltros] = useState<FiltrosPdf>({ obras: [], firmantes: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string>();
  const [preview, setPreview] = useState<{ url: string; registro: PdfFirmado }>();
  const fileRequest = useRef<AbortController | null>(null);
  const desde = fechas ? dayjs.tz(`${fechas[0].format('YYYY-MM-DD')} 00:00`, ZONA).toISOString() : undefined;
  // Parsear el día siguiente en su propia zona conserva los cambios de horario de Chile.
  const hasta = fechas ? dayjs.tz(`${fechas[1].add(1, 'day').format('YYYY-MM-DD')} 00:00`, ZONA).toISOString() : undefined;

  useEffect(() => {
    const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    void pdfsFirmadosAPI.filtros(controller.signal).then(data => {
      if (!controller.signal.aborted) setFiltros(data);
    }).catch(async err => {
      const text = await mensajeError(err);
      if (!controller.signal.aborted) void msg.error(text);
    });
    return () => controller.abort();
  }, [reload, msg]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await pdfsFirmadosAPI.listar({ page, limit, search: term, obraId, firmanteId, desde, hasta }, controller.signal);
        if (!controller.signal.aborted) setResult(data);
      } catch (err) {
        const text = await mensajeError(err);
        if (!controller.signal.aborted) { setResult({ items: [], total: 0, page, limit }); setError(text); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [page, limit, term, obraId, firmanteId, desde, hasta, reload]);

  useEffect(() => () => { fileRequest.current?.abort(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function abrir(registro: PdfFirmado, download = false) {
    fileRequest.current?.abort();
    const controller = new AbortController();
    fileRequest.current = controller;
    setBusy(registro.id);
    try {
      const blob = await pdfsFirmadosAPI.archivo(registro.id, download, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${registro.codigoRegistro}-firmado.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setPreview({ url, registro });
    } catch (err) {
      const text = await mensajeError(err);
      if (!controller.signal.aborted) void msg.error(text);
    } finally { if (!controller.signal.aborted) setBusy(undefined); }
  }

  const columns: ColumnsType<PdfFirmado> = [
    { title: 'Registro / sello', key: 'registro', width: 170, render: (_, r) => <><Typography.Text strong>{r.codigoRegistro}</Typography.Text><br /><Typography.Text type="secondary">Sello {r.numeroSello || '—'}</Typography.Text></> },
    { title: 'Obra', key: 'obra', width: 220, render: (_, r) => <>{r.obra.nombre}<br /><Typography.Text type="secondary">{r.obra.codigo || 'Sin código'}</Typography.Text></> },
    { title: 'Firmante', key: 'firmante', width: 240, render: (_, r) => <><Typography.Text strong>{r.firmante}</Typography.Text><br /><Typography.Text type="secondary">Cuenta: {r.validadoClientePor?.email || 'No registrada'}</Typography.Text>{!r.nombreHistorico && <><br /><Typography.Text type="secondary">Nombre de la cuenta (firma anterior)</Typography.Text></>}</> },
    { title: 'Fecha de firma', key: 'fecha', width: 170, render: (_, r) => r.validadoClienteAt ? dayjs(r.validadoClienteAt).tz(ZONA).format('DD/MM/YYYY HH:mm') : 'No registrada' },
    { title: 'Documento', key: 'documento', width: 115, render: () => <Tag color="green">Firmado</Tag> },
    { title: 'Acciones', key: 'acciones', width: 225, fixed: 'right', render: (_, r) => <Space>
      <Button icon={<EyeOutlined />} disabled={!!busy} loading={busy === r.id} onClick={() => void abrir(r)}>Ver PDF</Button>
      <Button icon={<DownloadOutlined />} disabled={!!busy} onClick={() => void abrir(r, true)} aria-label={`Descargar ${r.codigoRegistro}`} />
    </Space> },
  ];

  return <div style={{ padding: 24 }}>
    {contextHolder}
    <Card style={{ borderTop: '4px solid #FDC10B', borderRadius: 16, marginBottom: 18 }}>
      <Space align="center" wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}><FilePdfOutlined /> PDF firmados</Typography.Title><Typography.Text type="secondary">Documentos originales firmados por clientes · Fecha de firma en horario de Chile</Typography.Text></div>
        <Button icon={<ReloadOutlined />} onClick={() => setReload(value => value + 1)}>Actualizar</Button>
      </Space>
      <Space wrap style={{ marginTop: 20 }}>
        <Input prefix={<SearchOutlined />} allowClear placeholder="Buscar REG, código BECK o N° de sello" aria-label="Buscar registro o sello" value={search} onChange={event => setSearch(event.target.value)} style={{ width: 310 }} maxLength={200} />
        <Select allowClear showSearch optionFilterProp="label" placeholder="Todas las obras" aria-label="Filtrar por obra" value={obraId} style={{ width: 250 }} onChange={value => { setObraId(value); setPage(1); }} options={filtros.obras.map(o => ({ value: o.id, label: `${o.nombre}${o.codigo ? ` · ${o.codigo}` : ''}` }))} />
        <Select allowClear showSearch optionFilterProp="label" placeholder="Todas las cuentas firmantes" aria-label="Filtrar por cuenta firmante" value={firmanteId} style={{ width: 270 }} onChange={value => { setFirmanteId(value); setPage(1); }} options={filtros.firmantes.map(f => ({ value: f.id, label: `${f.nombre} · ${f.email}` }))} />
        <DatePicker.RangePicker value={fechas} format="DD/MM/YYYY" placeholder={['Firma desde', 'Firma hasta']} onChange={dates => { setFechas(dates?.[0] && dates[1] ? [dates[0], dates[1]] : null); setPage(1); }} />
        <Button onClick={() => { setSearch(''); setTerm(''); setObraId(undefined); setFirmanteId(undefined); setFechas(null); setPage(1); }}>Limpiar filtros</Button>
      </Space>
    </Card>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
    <Table<PdfFirmado> rowKey="id" columns={columns} dataSource={result.items} loading={loading} scroll={{ x: 1240 }} locale={{ emptyText: 'No hay PDF firmados para estos filtros' }}
      pagination={{ current: page, pageSize: limit, total: result.total, showSizeChanger: true, pageSizeOptions: [25, 50, 100], showTotal: total => `${total} documentos`, onChange: (next, size) => { setPage(size !== limit ? 1 : next); setLimit(size); } }} />
    <Modal open={!!preview} title={preview ? `${preview.registro.codigoRegistro} · PDF firmado original` : 'PDF firmado'} width="90vw" style={{ top: 20 }} onCancel={() => setPreview(undefined)} footer={<Button icon={<DownloadOutlined />} disabled={!!busy} onClick={() => preview && void abrir(preview.registro, true)}>Descargar original</Button>}>
      {preview && <iframe title="Vista previa del PDF firmado" src={preview.url} style={{ width: '100%', height: '72vh', border: 0 }} />}
    </Modal>
  </div>;
}
