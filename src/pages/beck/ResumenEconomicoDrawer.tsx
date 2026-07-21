import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Row,
  Segmented,
  Statistic,
  Typography,
} from "antd";
import {
  indicadoresAPI,
  type HitoObra,
  type HitoObraItemizadoItem,
} from "../../services/api";
import {
  aNumeroOrNull,
  convertirMonto,
  formatearMonto,
  formatearNumero,
  sumarTotales,
  type MonedaSoportada,
} from "../../utils/conversionMoneda";
import { filaSinValorizar, obtenerValorFila } from "../../utils/valorizacionHito";

type ResumenEconomicoDrawerProps = {
  open: boolean;
  onClose: () => void;
  obraNombre: string;
  hito: HitoObra | null;
  items: HitoObraItemizadoItem[];
};

type ItemizadoSinValorizar = {
  itemizadoOpcionId: string;
  codigoBeck: string | null;
  itemizadoBeck: string | null;
};

const MONEDAS: MonedaSoportada[] = ["CLP", "USD", "UF"];

const formatFecha = (fecha: string | null): string => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? fecha : d.toLocaleDateString("es-CL");
};

const ResumenEconomicoDrawer: React.FC<ResumenEconomicoDrawerProps> = ({
  open,
  onClose,
  obraNombre,
  hito,
  items,
}) => {
  const [monedaDestino, setMonedaDestino] = useState<MonedaSoportada>("CLP");
  const [uf, setUf] = useState<number | null>(null);
  const [ufFecha, setUfFecha] = useState<string | null>(null);
  const [dolar, setDolar] = useState<number | null>(null);
  const [dolarFecha, setDolarFecha] = useState<string | null>(null);
  const [loadingIndicadores, setLoadingIndicadores] = useState(false);
  const [errorIndicadores, setErrorIndicadores] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;

    const cargarIndicadores = async () => {
      setLoadingIndicadores(true);
      setErrorIndicadores(null);
      try {
        const [ufRes, dolarRes] = await Promise.all([
          indicadoresAPI.obtenerUf(),
          indicadoresAPI.obtenerDolar(),
        ]);
        if (cancelado) return;

        setUf(aNumeroOrNull(ufRes.data?.valor));
        setUfFecha(ufRes.data?.fecha ?? null);
        setDolar(aNumeroOrNull(dolarRes.data?.valor));
        setDolarFecha(dolarRes.data?.fecha ?? null);

        if (ufRes.fallback || dolarRes.fallback) {
          setErrorIndicadores(
            "Los indicadores mostrados son un valor de respaldo: la fuente oficial no respondió."
          );
        }
      } catch {
        if (!cancelado) {
          setUf(null);
          setDolar(null);
          setErrorIndicadores("No se pudieron cargar los indicadores UF/USD.");
        }
      } finally {
        if (!cancelado) setLoadingIndicadores(false);
      }
    };

    void cargarIndicadores();
    return () => {
      cancelado = true;
    };
  }, [open]);

  const { totalesOriginales, sinValorizar } = useMemo(() => {
    if (!hito) {
      return {
        totalesOriginales: sumarTotales([]),
        sinValorizar: [] as ItemizadoSinValorizar[],
      };
    }

    const montos = items.map((item) => obtenerValorFila(item, hito));
    const faltantes: ItemizadoSinValorizar[] = items
      .filter((item) => filaSinValorizar(item, hito))
      .map((item) => ({
        itemizadoOpcionId: item.itemizadoOpcionId,
        codigoBeck: item.codigoBeck,
        itemizadoBeck: item.itemizadoBeck,
      }));

    if (import.meta.env.DEV) {
      console.table(
        items.map((item) => {
          const { valor, moneda } = obtenerValorFila(item, hito);
          return {
            itemizadoOpcionId: item.itemizadoOpcionId,
            codigoBeck: item.codigoBeck,
            moneda,
            precioUnitario: aNumeroOrNull(item.precioUnitario),
            cantidadEjecutadaDelPeriodo: hito.cantidadesEjecutadas[item.itemizadoOpcionId] ?? 0,
            subtotalUsado: valor,
          };
        })
      );
    }

    return { totalesOriginales: sumarTotales(montos), sinValorizar: faltantes };
  }, [hito, items]);

  const { totalConvertido, monedasExcluidas } = useMemo(() => {
    const indicadores = { uf, dolar };
    let total = 0;
    const excluidas: MonedaSoportada[] = [];

    for (const moneda of MONEDAS) {
      const monto = totalesOriginales[moneda];
      if (monto === 0) continue; // nada que convertir en esa moneda
      const convertido = convertirMonto(monto, moneda, monedaDestino, indicadores);
      if (convertido === null) {
        excluidas.push(moneda);
        continue;
      }
      total += convertido;
    }

    return { totalConvertido: total, monedasExcluidas: excluidas };
  }, [totalesOriginales, monedaDestino, uf, dolar]);

  const sinDatos = MONEDAS.every((m) => totalesOriginales[m] === 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(480px, 96vw)"
      title={hito ? `Resumen económico — ${hito.nombre}` : "Resumen económico"}
    >
      {!hito ? (
        <Typography.Text type="secondary">
          Selecciona un hito para ver su resumen económico.
        </Typography.Text>
      ) : (
        <div className="space-y-4">
          {obraNombre && (
            <Typography.Text type="secondary" className="block text-xs">
              Obra: {obraNombre}
            </Typography.Text>
          )}

          <Alert
            type="info"
            showIcon
            message="Conversión referencial. No modifica los precios originales de los hitos."
          />

          {errorIndicadores && (
            <Alert type="warning" showIcon message={errorIndicadores} />
          )}

          <Card size="small" title="Indicadores actuales" loading={loadingIndicadores}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="UF actual">
                {uf !== null ? formatearMonto(uf, "UF") : "—"}{" "}
                <Typography.Text type="secondary" className="text-xs">
                  ({formatFecha(ufFecha)})
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="USD actual">
                {dolar !== null ? formatearMonto(dolar, "USD") : "—"}{" "}
                <Typography.Text type="secondary" className="text-xs">
                  ({formatFecha(dolarFecha)})
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {sinValorizar.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`Hay ${sinValorizar.length} itemizado(s) con cantidad en este hito que no pudieron valorizarse porque no tienen precio unitario o moneda configurada.`}
              description={
                <ul className="m-0 list-disc pl-4">
                  {sinValorizar.map((f) => (
                    <li key={f.itemizadoOpcionId}>
                      {f.codigoBeck || "—"} {f.itemizadoBeck ? `— ${f.itemizadoBeck}` : ""}
                    </li>
                  ))}
                </ul>
              }
            />
          )}

          <Divider className="!my-2" />

          <div>
            <Typography.Title level={5} className="!mb-2">
              Totales originales
            </Typography.Title>
            {sinDatos ? (
              <Typography.Text type="secondary">
                Este hito no tiene cantidades valorizables todavía.
              </Typography.Text>
            ) : (
              <Row gutter={[12, 12]}>
                {MONEDAS.filter((m) => totalesOriginales[m] !== 0).map((moneda) => (
                  <Col xs={24} sm={8} key={moneda}>
                    <Card size="small">
                      <Statistic
                        title={moneda}
                        value={totalesOriginales[moneda]}
                        valueStyle={{ fontSize: 18 }}
                        formatter={(value) => formatearNumero(Number(value), moneda)}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>

          <Divider className="!my-2" />

          <div>
            <Typography.Title level={5} className="!mb-2">
              Total convertido
            </Typography.Title>
            <Segmented
              options={MONEDAS}
              value={monedaDestino}
              onChange={(val) => setMonedaDestino(val as MonedaSoportada)}
              className="mb-3"
            />
            <Card size="small">
              <Statistic
                title={`Total en ${monedaDestino}`}
                value={totalConvertido}
                valueStyle={{ fontSize: 24 }}
                formatter={(value) => formatearNumero(Number(value), monedaDestino)}
              />
            </Card>
            {monedasExcluidas.length > 0 && (
              <Alert
                className="mt-2"
                type="warning"
                showIcon
                message={`No se pudo convertir el total en ${monedasExcluidas.join(
                  ", "
                )} por falta del indicador correspondiente. Ese monto no está incluido arriba.`}
              />
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default ResumenEconomicoDrawer;
