// src/components/RegistroDetalleModal.tsx
import React from "react";
import { Modal, Descriptions, Tag, Divider } from "antd";
import {
  FireOutlined,
  EnvironmentOutlined,
  UserOutlined,
  FieldTimeOutlined,
  CameraOutlined,  
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { RegistroSello } from "../types/registroSello";

type RegistroDetalleModalProps = {
  registro: RegistroSello | null;
  open: boolean;
  onClose: () => void;
};

const RegistroDetalleModal: React.FC<RegistroDetalleModalProps> = ({
  registro,
  open,
  onClose,
}) => {
  const visible = open && !!registro;

  if (!registro) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        title="Detalle de sello"
      >
        <p className="text-sm text-slate-500">Sin datos para mostrar.</p>
      </Modal>
    );
  }

  const fecha = dayjs(registro.fechaEjecucion).format("DD-MM-YYYY");

  const cieloLabel =
    registro.cieloModular === 1
      ? "F = 1 · Acceso normal"
      : registro.cieloModular === 2
      ? "F = 2 · Cielo americano / estructurado"
      : "F = 3 · Cielo duro / gateras";

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      title={null}
      className="registro-detalle-modal"
      styles={{
        header: { display: "none" },
        body: { padding: 0 },
      }}
    >
      {/* Header custom */}
      <div className="px-5 py-4 border-b border-slate-800/40 bg-gradient-to-r from-[#151823] via-[#111321] to-[#05060b] flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Detalle de registro
          </p>
          <h2 className="text-sm font-semibold text-slate-50">
            Sello {registro.numeroSello} · {registro.itemizadoBeck}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1 text-amber-300">
            <FireOutlined />
            <span>{registro.cantidadSellos} sellos</span>
          </div>
          <Tag color="gold" className="m-0 text-[11px]">
            F holgura = {registro.factorHolgura}
          </Tag>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-5 space-y-4 bg-[#05060b] text-slate-100">
        {/* Foto + info principal */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr,1.2fr] gap-4">
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/40 flex items-center justify-center">
            {registro.fotoUrl ? (
              <img
                src={registro.fotoUrl}
                alt="Foto sello"
                className="w-full h-56 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/600x350.png?text=Foto+no+disponible";
                }}
              />
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs">
                <CameraOutlined className="text-lg mb-1" />
                Sin foto asociada
              </div>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FieldTimeOutlined className="text-[13px]" />
              <span>
                Ejecutado el <b>{fecha}</b> ({registro.dia})
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <EnvironmentOutlined className="text-[13px]" />
              <span>
                <b>{registro.piso}</b> · Eje{" "}
                <b>
                  {registro.ejeAlfabetico}
                  {registro.ejeNumerico}
                </b>{" "}
                · {registro.recinto}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <UserOutlined className="text-[13px]" />
              <span>
                Sellador: <b>{registro.nombreSellador}</b>
              </span>
            </div>

            <Divider className="my-2 border-slate-800" />

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
                <p className="text-slate-400">Cantidad de sellos</p>
                <p className="text-base font-semibold text-slate-50">
                  {registro.cantidadSellos}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
                <p className="text-slate-400">Sellos ponderados</p>
                <p className="text-base font-semibold text-emerald-400">
                  {registro.cantidadSellosConFactor.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
                <p className="text-slate-400">Holgura (cm)</p>
                <p className="text-base font-semibold text-slate-50">
                  {registro.holguraCm}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
                <p className="text-slate-400">Cielo modular</p>
                <p className="text-[11px] text-slate-100">{cieloLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detalle estructurado */}
        <Divider className="my-2 border-slate-800" />

        <Descriptions
          size="small"
          column={2}
          labelStyle={{ color: "#9CA3AF", fontSize: 11 }}
          contentStyle={{ color: "#E5E7EB", fontSize: 12 }}
        >
          <Descriptions.Item label="Itemizado BECK">
            {registro.itemizadoBeck}
          </Descriptions.Item>
          <Descriptions.Item label="Itemizado SACYR">
            {registro.itemizadoSacyr || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="N° sello">
            {registro.numeroSello}
          </Descriptions.Item>
          <Descriptions.Item label="Foto (URL)">
            {registro.fotoUrl ? (
              <a
                href={registro.fotoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 underline"
              >
                Abrir en nueva pestaña
              </a>
            ) : (
              "-"
            )}
          </Descriptions.Item>
        </Descriptions>

        {registro.observaciones && (
          <div className="mt-2">
            <p className="text-[11px] text-slate-400 mb-1">Observaciones</p>
            <p className="text-xs text-slate-200 bg-black/30 border border-slate-800 rounded-lg px-3 py-2">
              {registro.observaciones}
            </p>
          </div>
        )}

        {/* Footer simple */}
        <div className="flex justify-end mt-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800/70 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RegistroDetalleModal;
