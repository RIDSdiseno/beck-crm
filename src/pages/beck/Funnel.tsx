  import React, { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
  import {
    Button,
    Descriptions,
    Input,
    Modal as AntdModal,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    Timeline,
    Typography,
    message,
  } from "antd";
  import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    FileTextOutlined,
    SwapOutlined,
    UploadOutlined,
  } from "@ant-design/icons";
  import {
    DndContext,
    DragOverlay,
    PointerSensor,
    type DragEndEvent,
    type DragStartEvent,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
  } from "@dnd-kit/core";
  import dayjs, { Dayjs } from "dayjs";
  import { useLocation, useNavigate } from "react-router-dom";
  import CierreDeProyecto from "../../components/Cierredeproyecto";
  import {
    MOTIVOS_PERDIDA,
    MOTIVOS_POSTERGACION,
    normalizarMotivoSubmit,
    parseMotivoSelect,
  } from "../../constants/motivosCierre";
  import FunnelCalendario from "../../components/FunnelCalendario";
  import FunnelBeckDashboard from "./FunnelBeckDashboard";
  import CotizacionEditorModal, {
    type CotizacionEditorValues,
    type LineaCotizacion,
  } from "../../components/CotizacionEditorModal";
  import { usePermisos } from "../../hooks/usePermisos";
  import { useAuth } from "../../context/useAuth";
  import FirematFunnel from "../firemat/Funnel";
  import {
    clientesBeckAPI,
    cotizacionesAPI,
    fetchWithAuth,
    firematFunnelAPI,
    funnelBeckAPI,
    funnelUnificadoAPI,
    oficinaTecnicaPreventaAPI,
    usuariosAPI,
    type CambioVendedorAutomatico,
    type ClienteBeck,
    type ContactoClienteBeck,
    type CotizacionApiRecord,
    type CotizacionUpsertPayload,
    type FirematFunnelEtapa,
    type FunnelBeckArchivo,
    type FunnelBeckArchivoTipo,
    type FunnelBeckOpportunity,
    type FunnelBeckUpsertPayload,
    type HistorialFunnelBeckEvento,
    type SolicitudOficinaTecnica,
    type UsuarioResumen,
  } from "../../services/api";

  import {
    regionesComunasChile,
    type RegionChile,
  } from "../../data/regionesComunasChile";
  import type { ThemeMode } from "../../hooks/useSystemTheme";
  import type {
    FunnelCurrency,
    FunnelDeal,
    FunnelEstadoCierre,
    FunnelLeadSource,
    FunnelStage,
  } from "../../types/funnel";

  type FunnelPageProps = {
    themeMode: ThemeMode;
    alertaBell?: React.ReactNode;

    embedUnidadNegocio?: "Beck" | "Firemat" | "Mixto" | "Todas";
    embedEstadoCierre?: string;
    onVisibleCountChange?: (count: number) => void;
  };

  type FunnelDraft = {
    nombreProyecto: string;
    empresa: string;
    valorEstimado: string;
    moneda: FunnelCurrency;
    fechaProbableCierre: string;
    vendedor: string;
    region: string;
    comuna: string;
    fuenteLead: FunnelLeadSource | "";
    etapa: FunnelStage;
    rutEmpresa: string;
    nombreContacto: string;
    cargoContacto: string;
    telefonoContacto: string;
    correoContacto: string;
    tipoCliente: string;
    tipoOportunidad: string;
    fechaPrimerContacto: string;
    tipoContacto: string;
    necesidadDetectada: string;
    timingEstimado: string;
    nivelInteres: string;
    proximaAccion: string;
    fechaProximaAccion: string;
    comentariosPrimerContacto: string;
    fechaVisita: string;
    responsableTecnico: string;
    asistentes: string;
    lugarVisita: string;
    antecedentesLevantados: string;
    documentosRecibidos: string;
    planos: string;
    basesTecnicas: string;
    especificaciones: string;
    fotografias: string;
    observacionesTecnicas: string;
    necesidadOficinaTecnica: string;
    proximosPasos: string;
    estadoDesarrolloPropuesta: string;
    informacionPendiente: string;
    documentosRequeridos: string;
    riesgoTecnico: string;
    condicionesEspeciales: string;
    necesidadValidacionGerencial: string;
    fechaComprometidaEnvio: string;
    comentariosInternos: string;
    fechaEnvioPropuesta: string;
    versionPropuesta: string;
    numeroPropuesta: string;
    montoPropuesto: string;
    fechaVencimientoPropuesta: string;
    comentariosCliente: string;
    probabilidadCierre: string;
    objeciones: string;
    contrapropuestas: string;
    ajustesSolicitados: string;
    ordenCompra: string;
    contrato: string;
    correoAceptacion: string;
    anticipo: string;
    aprobacionInternaCliente: string;
    condicionesPago: string;
    documentosAdministrativosPendientes: string;
    responsableAdministrativo: string;
    fechaFirma: string;
    fechaInicioProyecto: string;
    traspasadoOperaciones: string;
    fechaTraspasoOperaciones: string;
    responsableTraspasoOperaciones: string;
    observacionesTraspasoOperaciones: string;
    traspasadoAdministracion: string;
    fechaTraspasoAdministracion: string;
    responsableTraspasoAdministracion: string;
    observacionesTraspasoAdministracion: string;
    documentoRespaldo: string;
    flujoPosterior: string;
    montoFinalGanado: string;
    fechaCierre: string;
    clienteBeckId: string;
    contactoBeckId: string;
    direccionProyecto: string;
    unidadNegocio: string;
    observaciones: string;
    urgencia: string;
    tipoProyecto: string;
    empresaMandante: string;
    necesidadLevantamiento: string;
    oficinaTecnicaAsignada: string;
    duracionEstimada: string;
    estadoRevisionTecnica: string;
    garantiasRequeridas: string;
    estadoDocumentacionVenta: string;
    esReactivacion: string;
  };

  type FunnelFieldErrors = Partial<Record<keyof FunnelDraft, string>>;

  type FunnelEditSection =
    | "prospecto"
    | "visita"
    | "desarrollo"
    | "negociacion"
    | "documentacion"
    | "cierre";

  const FUNNEL_EDIT_SECTIONS_ORDER: FunnelEditSection[] = [
    "prospecto",
    "visita",
    "desarrollo",
    "negociacion",
    "documentacion",
    "cierre",
  ];

  type FunnelCotizacionItem = {
    id: string;
    numero: string;
    version: number;
    codigo: string;
    funnelBeckId?: string;
    cliente: string;
    proyecto: string;
    origen: string;
    tipo: string;
    fecha: string;
    vigencia: string;
    estado: string;
    total: number;
    moneda: string;
    responsableId: string | null;
    responsableNombre: string;
    notas: string;
    descuento: number;
    aplicaImpuesto: boolean;
    subtotal: number;
    impuesto: number;
    lineas: LineaCotizacion[];
  };

  type ArchivosFunnelPorTipo = Partial<
    Record<FunnelBeckArchivoTipo, FunnelBeckArchivo[]>
  >;

  type ArchivoUploaderFunnelProps = {
    oportunidadId: string;
    tipo: FunnelBeckArchivoTipo;
    titulo: string;
    accept: string;
    multiple: boolean;
    archivos: FunnelBeckArchivo[];
    onUploaded: (archivos: FunnelBeckArchivo[]) => void;
    onDeleted: (archivoId: string) => void;
  };

  type ArchivoFunnelConfig = {
    tipo: FunnelBeckArchivoTipo;
    titulo: string;
    accept: string;
    multiple: boolean;
  };

  type FunnelCardProps = {
    deal: FunnelDeal;
    canEditFunnel: boolean;
    canOperateFiremat: boolean;
    onStageChange: (dealId: string, etapa: FunnelStage) => void;
    onViewDetail: (deal: FunnelDeal) => Promise<void> | void;
    onCreateCotizacion: (deal: FunnelDeal) => void;
  };

  type FunnelColumnProps = {
    columnKey: string;
    label: string;
    deals: FunnelDeal[];
    canEditFunnel: boolean;
    canOperateFiremat: boolean;
    onStageChange: (dealId: string, etapa: FunnelStage) => void;
    onViewDetail: (deal: FunnelDeal) => Promise<void> | void;
    onCreateCotizacion: (deal: FunnelDeal) => void;
  };

  type FunnelModalProps = {
    open: boolean;
    mode: "create" | "edit";
    draft: FunnelDraft;
    fieldErrors: FunnelFieldErrors;
    validationMessage: string | null;
    conversionReferencia: string | null;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onFieldChange: (field: keyof FunnelDraft, value: string) => void;
    selectedClienteBeck: ClienteBeck | null;
    clienteBeckResults: ClienteBeck[];
    clienteBeckSearching: boolean;
    clientesDisponibles: ClienteBeck[];
    clientesLoading: boolean;
    initialEditSection: FunnelEditSection | null;
    editVisibleSections: FunnelEditSection[] | null;
    oportunidadId: string | null;
    archivosPorTipo: ArchivosFunnelPorTipo;
    jefesObra: UsuarioResumen[];
    jefesObraLoading: boolean;
    usuariosComerciales: UsuarioResumen[];
    usuariosComercialesLoading: boolean;
    onClienteBeckSearchChange: (q: string) => void;
    onSelectClienteBeck: (cliente: ClienteBeck | null) => void;
    onSelectContactoBeck: (contacto: ContactoClienteBeck | null) => void;
    onArchivosUploaded: (archivos: FunnelBeckArchivo[]) => void;
    onArchivoDeleted: (archivoId: string) => void;
    onSaveOpportunityDraft: () => Promise<void>;
    onSolicitudOficinaCreated: () => Promise<void>;
  };


  const etapas: FunnelStage[] = [
    "prospecto",
    "visita",
    "cotizacion",
    "enviada",
    "negociacion",
    "documentacion",
    "cerrada",
  ];

  const etapasLabel: Record<FunnelStage, string> = {
    prospecto: "Prospecto Identificado",
    visita: "Visita / Levantamiento",
    cotizacion: "Cotizacion Elaborada",
    enviada: "Cotizacion Enviada",
    negociacion: "En Negociacion",
    documentacion: "Documentación de Venta",
    cerrada: "Cerrada",
  };

  const etapasLabelComun: Record<FunnelStage, string> = {
    prospecto: "Prospección",
    visita: "Primer contacto / Levantamiento",
    cotizacion: "Cotización en desarrollo",
    enviada: "Cotización enviada",
    negociacion: "Negociación",
    documentacion: "Documentación / Firmada",
    cerrada: "Ganada",
  };

  const FIREMAT_COLUMNS: { key: FirematFunnelEtapa; label: string }[] = [
    { key: "PROSPECTO", label: "Prospecto" },
    { key: "PRIMER_CONTACTO", label: "Primer contacto" },
    { key: "DESARROLLO_COTIZACION", label: "Desarrollo cotización" },
    { key: "COTIZACION_ENVIADA", label: "Cotización enviada" },
    { key: "ORDEN_CONFIRMADA", label: "Firmada" },
    { key: "GANADA", label: "Ganada" },
  ];

  const ETAPA_COMUN_A_FIREMAT: Partial<Record<string, FirematFunnelEtapa>> = {
    prospecto: "PROSPECTO",
    visita: "PRIMER_CONTACTO",
    cotizacion: "DESARROLLO_COTIZACION",
    enviada: "COTIZACION_ENVIADA",
    documentacion: "ORDEN_CONFIRMADA",
    cerrada_ganada: "GANADA",
  };

  const leadSourceOptions: FunnelLeadSource[] = [
    "Web",
    "Referido",
    "Llamada",
    "Cliente recurrente",
    "Prospeccion",
    "Otro",
  ];

  const riesgoTecnicoOptions = ["Bajo", "Medio", "Alto"] as const;
  const estadoDesarrolloPropuestaOptions = [
    "Pendiente",
    "En preparación",
    "Esperando antecedentes",
    "Revisión interna",
    "Esperando validación gerencial",
    "Lista para cotizar",
  ] as const;

  const flujoPosteriorOptions = [
    "Traspaso a operaciones",
    "Oficina técnica",
    "Administración",
    "Facturación",
    "Planificación de proyecto",
    "ERP",
    "Otro",
  ] as const;

  const visitaArchivoConfigs: ArchivoFunnelConfig[] = [
    {
      tipo: "DOCUMENTO_RECIBIDO",
      titulo: "Documentos recibidos",
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,image/*",
      multiple: true,
    },
    {
      tipo: "PLANO",
      titulo: "Planos",
      accept: ".pdf,.dwg,.dxf,image/*",
      multiple: true,
    },
    {
      tipo: "FOTOGRAFIA",
      titulo: "Fotografías",
      accept: "image/*",
      multiple: true,
    },
  ];

  const documentacionArchivoConfigs: ArchivoFunnelConfig[] = [
    {
      tipo: "ORDEN_COMPRA",
      titulo: "Orden de compra",
      accept: ".pdf,.doc,.docx,image/*",
      multiple: true,
    },
    {
      tipo: "CONTRATO",
      titulo: "Contrato",
      accept: ".pdf,.doc,.docx,image/*",
      multiple: true,
    },
    {
      tipo: "CORREO_ACEPTACION",
      titulo: "Correo de aceptación del cliente",
      accept: ".pdf,.eml,.msg,image/*",
      multiple: true,
    },
    {
      tipo: "ANTICIPO",
      titulo: "Anticipo / comprobante",
      accept: ".pdf,image/*",
      multiple: true,
    },
  ];

  const desarrolloArchivoConfigs: ArchivoFunnelConfig[] = [
    {
      tipo: "DOCUMENTO_REQUERIDO",
      titulo: "Documentos requeridos",
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,image/*",
      multiple: true,
    },
  ];

  const cierreArchivoConfigs: ArchivoFunnelConfig[] = [
    {
      tipo: "DOCUMENTO_RESPALDO",
      titulo: "Documento respaldo",
      accept: ".pdf,.doc,.docx,image/*",
      multiple: true,
    },
  ];

  const createEmptyDraft = (): FunnelDraft => ({
    nombreProyecto: "",
    empresa: "",
    valorEstimado: "",
    moneda: "CLP",
    fechaProbableCierre: "",
    vendedor: "",
    region: "",
    comuna: "",
    fuenteLead: "",
    etapa: "prospecto",
    rutEmpresa: "",
    nombreContacto: "",
    cargoContacto: "",
    telefonoContacto: "",
    correoContacto: "",
    tipoCliente: "",
    tipoOportunidad: "",
    fechaPrimerContacto: "",
    tipoContacto: "",
    necesidadDetectada: "",
    timingEstimado: "",
    nivelInteres: "",
    proximaAccion: "",
    fechaProximaAccion: "",
    comentariosPrimerContacto: "",
    fechaVisita: "",
    responsableTecnico: "",
    asistentes: "",
    lugarVisita: "",
    antecedentesLevantados: "",
    documentosRecibidos: "",
    planos: "",
    basesTecnicas: "",
    especificaciones: "",
    fotografias: "",
    observacionesTecnicas: "",
    necesidadOficinaTecnica: "",
    proximosPasos: "",
    estadoDesarrolloPropuesta: "",
    informacionPendiente: "",
    documentosRequeridos: "",
    riesgoTecnico: "",
    condicionesEspeciales: "",
    necesidadValidacionGerencial: "",
    fechaComprometidaEnvio: "",
    comentariosInternos: "",
    fechaEnvioPropuesta: "",
    versionPropuesta: "",
    numeroPropuesta: "",
    montoPropuesto: "",
    fechaVencimientoPropuesta: "",
    comentariosCliente: "",
    probabilidadCierre: "",
    objeciones: "",
    contrapropuestas: "",
    ajustesSolicitados: "",
    ordenCompra: "",
    contrato: "",
    correoAceptacion: "",
    anticipo: "",
    aprobacionInternaCliente: "",
    condicionesPago: "",
    documentosAdministrativosPendientes: "",
    responsableAdministrativo: "",
    fechaFirma: "",
    fechaInicioProyecto: "",
    traspasadoOperaciones: "",
    fechaTraspasoOperaciones: "",
    responsableTraspasoOperaciones: "",
    observacionesTraspasoOperaciones: "",
    traspasadoAdministracion: "",
    fechaTraspasoAdministracion: "",
    responsableTraspasoAdministracion: "",
    observacionesTraspasoAdministracion: "",
    documentoRespaldo: "",
    flujoPosterior: "",
    montoFinalGanado: "",
    fechaCierre: "",
    clienteBeckId: "",
    contactoBeckId: "",
    direccionProyecto: "",
    unidadNegocio: "",
    observaciones: "",
    urgencia: "",
    tipoProyecto: "",
    empresaMandante: "",
    necesidadLevantamiento: "",
    oficinaTecnicaAsignada: "",
    duracionEstimada: "",
    estadoRevisionTecnica: "",
    garantiasRequeridas: "",
    estadoDocumentacionVenta: "",
    esReactivacion: "",
  });

  const REQUIRED_FIELDS_MESSAGE = "Rellene los campos obligatorios marcados con *";

  const validateFunnelDraft = (draft: FunnelDraft): FunnelFieldErrors => {
    const errors: FunnelFieldErrors = {};
    const nombreProyecto = draft.nombreProyecto.trim();
    const empresa = draft.empresa.trim();
    const valorEstimado = draft.valorEstimado.trim();
    const parsedValorEstimado = valorEstimado
      ? Number(valorEstimado.replace(",", "."))
      : Number.NaN;
    const fechaProbableCierre = draft.fechaProbableCierre.trim();
    const vendedor = draft.vendedor.trim();
    const region = draft.region.trim();
    const comuna = draft.comuna.trim();
    const fuenteLead = draft.fuenteLead.trim();
    const etapa = draft.etapa.trim();
    const selectedRegionData = region
      ? regionesComunasChile.find((item) => item.nombre === region)
      : undefined;

    if (!nombreProyecto) {
      errors.nombreProyecto = "El nombre del proyecto es obligatorio";
    }

    if (!empresa) {
      errors.empresa = "La empresa es obligatoria";
    }

    if (!valorEstimado) {
      errors.valorEstimado = "El valor estimado es obligatorio";
    } else if (
      !Number.isFinite(parsedValorEstimado) ||
      parsedValorEstimado <= 0
    ) {
      errors.valorEstimado = "El valor estimado debe ser mayor a 0";
    }

    if (!fechaProbableCierre) {
      errors.fechaProbableCierre = "La fecha probable de cierre es obligatoria";
    }

    if (!vendedor) {
      errors.vendedor = "El vendedor es obligatorio";
    }

    if (!region) {
      errors.region = "La region es obligatoria";
    }

    if (!comuna) {
      errors.comuna = "La comuna es obligatoria";
    } else if (
      selectedRegionData &&
      !selectedRegionData.comunas.includes(comuna)
    ) {
      errors.comuna = "La comuna no corresponde a la region seleccionada";
    }

    if (!fuenteLead) {
      errors.fuenteLead = "La fuente del lead es obligatoria";
    }

    if (!etapa) {
      errors.etapa = "La etapa inicial es obligatoria";
    }

    if (draft.etapa === "cerrada") {
      if (!draft.montoFinalGanado.trim()) {
        errors.montoFinalGanado = "El monto final ganado es obligatorio";
      } else {
        const montoFinalGanado = Number(
          draft.montoFinalGanado.trim().replace(",", ".")
        );
        if (!Number.isFinite(montoFinalGanado) || montoFinalGanado <= 0) {
          errors.montoFinalGanado = "El monto final ganado debe ser mayor a 0";
        }
      }

      if (!draft.fechaCierre.trim()) {
        errors.fechaCierre = "La fecha de cierre es obligatoria";
      }

      if (!draft.documentoRespaldo.trim()) {
        errors.documentoRespaldo = "El documento de respaldo es obligatorio";
      }

      if (!draft.flujoPosterior.trim()) {
        errors.flujoPosterior = "El flujo posterior es obligatorio";
      }
    }

    const isActive = draft.etapa !== "cerrada";
    if (isActive) {
      if (!draft.proximaAccion.trim()) {
        errors.proximaAccion = "La próxima acción es obligatoria para oportunidades activas";
      }
      if (!draft.fechaProximaAccion.trim()) {
        errors.fechaProximaAccion = "La fecha de próxima acción es obligatoria para oportunidades activas";
      }
    }

    const rutEmpresa = draft.rutEmpresa.trim();
    if (rutEmpresa && !validateRut(rutEmpresa)) {
      errors.rutEmpresa = "Ingresa un RUT con formato válido";
    }

    const telefonoContacto = draft.telefonoContacto.trim();
    if (telefonoContacto && !validatePhone(telefonoContacto)) {
      errors.telefonoContacto = "El teléfono debe tener entre 8 y 12 dígitos";
    }

    const correoContacto = draft.correoContacto.trim();
    if (correoContacto && !validateEmail(correoContacto)) {
      errors.correoContacto = "El correo electrónico no es válido";
    }

    return errors;
  };

  const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

  const pickValue = (
    source: Record<string, unknown>,
    keys: string[]
  ): unknown => {
    for (const key of keys) {
      const value = source[key];

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }

    return undefined;
  };

  const toText = (value: unknown, fallback = ""): string => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || fallback;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return fallback;
  };

  const toNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.trim().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  const toBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    }

    return fallback;
  };

  const toOptionalBoolean = (value: unknown): boolean | undefined => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return toBoolean(value);
  };

  const normalizeCotizacionEstado = (value: unknown): string => {
    const raw = toText(value, "Sin estado");
    const normalized = raw.toLowerCase();

    if (normalized === "borrador") return "Borrador";
    if (normalized === "enviada" || normalized === "enviado") return "Enviada";
    if (
      normalized === "aceptada" ||
      normalized === "aceptado" ||
      normalized === "aprobada" ||
      normalized === "aprobado"
    ) {
      return "Aceptada";
    }
    if (normalized === "rechazada" || normalized === "rechazado") {
      return "Rechazada";
    }
    if (normalized === "vencida" || normalized === "vencido") {
      return "Vencida";
    }

    return raw;
  };

  const normalizeMoneda = (value: unknown): "CLP" | "USD" => {
    const moneda = toText(value, "CLP").toUpperCase();
    return moneda === "USD" ? "USD" : "CLP";
  };

  const normalizeTipoLinea = (value: unknown): "PRODUCTO" | "SERVICIO" => {
    const normalized = toText(value, "PRODUCTO").trim().toUpperCase();
    return normalized === "SERVICIO" ? "SERVICIO" : "PRODUCTO";
  };

  const normalizeTipoCotizacion = (
    value: string
  ): CotizacionEditorValues["tipo"] => {
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    if (normalized === "interna") return "Interna";
    if (normalized === "servicio") return "Servicio";
    if (normalized === "mantencion") return "Mantencion";
    if (normalized === "otro") return "Otro";

    return "Cliente";
  };

  const calculateLineSubtotal = (
    cantidad: number,
    precioUnitario: number,
    gananciaPct = 0
  ) => cantidad * precioUnitario * (1 + gananciaPct / 100);

  const calculateCotizacionTotals = (
    lineas: LineaCotizacion[],
    descuento: number,
    aplicaImpuesto: boolean
  ) => {
    const subtotal = lineas.reduce((acc, linea) => acc + linea.subtotal, 0);
    const descuentoSafe = Number.isFinite(descuento) ? descuento : 0;
    const descuentoPct = Math.min(100, Math.max(0, descuentoSafe));
    const descuentoMonto = subtotal * (descuentoPct / 100);
    const neto = Math.max(0, subtotal - descuentoMonto);
    const impuesto = aplicaImpuesto ? neto * 0.19 : 0;
    const total = neto + impuesto;

    return { subtotal, impuesto, total };
  };

  const extractCotizacionLineas = (
    source: Record<string, unknown>
  ): LineaCotizacion[] => {
    const rawLineas = pickValue(source, ["lineas"]);

    if (!Array.isArray(rawLineas)) {
      return [];
    }

    return rawLineas.flatMap((linea, index) => {
      if (!isObjectRecord(linea)) {
        return [];
      }

      const cantidad = Math.max(1, toNumber(pickValue(linea, ["cantidad", "qty"])));
      const precioUnitario = toNumber(
        pickValue(linea, ["precioUnitario", "precio_unitario"])
      );
      const gananciaPct = toNumber(
        pickValue(linea, ["gananciaPct", "ganancia_pct"])
      );
      const subtotal =
        toNumber(pickValue(linea, ["subtotal"])) ||
        calculateLineSubtotal(cantidad, precioUnitario, gananciaPct);

      return [
        {
          tipoLinea: normalizeTipoLinea(
            pickValue(linea, ["tipoLinea", "tipo_linea"])
          ),
          descripcion: toText(
            pickValue(linea, ["descripcion", "detalle"]),
            "Linea cotizacion"
          ),
          cantidad,
          precioUnitario,
          subtotal,
          orden: toNumber(pickValue(linea, ["orden"])) || index + 1,
          gananciaPct,
        },
      ];
    });
  };

  const extractCotizacionCliente = (source: Record<string, unknown>): string => {
    const direct = pickValue(source, [
      "clienteNombre",
      "cliente_nombre",
      "nombreCliente",
      "cliente",
    ]);

    if (typeof direct === "string" || typeof direct === "number") {
      return toText(direct, "Sin cliente");
    }

    if (isObjectRecord(direct)) {
      return toText(
        pickValue(direct, ["nombre", "razonSocial", "razon_social", "empresa"]),
        "Sin cliente"
      );
    }

    return "Sin cliente";
  };

  const mapCotizacionRecord = (
    source: CotizacionApiRecord,
    index = 0
  ): FunnelCotizacionItem => {
    let lineas = extractCotizacionLineas(source);
    const numeroValue = pickValue(source, ["numero", "folio", "correlativo"]);
    const codigo = toText(
      pickValue(source, ["codigo", "codigoCotizacion", "codigo_cotizacion"])
    );
    const fecha = toText(
      pickValue(source, ["fecha", "fechaEmision", "fecha_emision", "createdAt", "created_at"])
    );
    const vigencia = toText(
      pickValue(source, ["vigencia", "fechaVencimiento", "fecha_vencimiento"])
    );
    const descuento = toNumber(pickValue(source, ["descuento"]));
    const aplicaImpuesto = toBoolean(
      pickValue(source, ["aplicaImpuesto", "aplica_impuesto"]),
      true
    );
    const subtotal =
      toNumber(pickValue(source, ["subtotal"])) ||
      lineas.reduce((acc, linea) => acc + linea.subtotal, 0);
    const impuesto = toNumber(pickValue(source, ["impuesto"]));
    const total =
      toNumber(
        pickValue(source, ["total", "total_final", "monto_total", "monto", "totalNeto"])
      ) || calculateCotizacionTotals(lineas, descuento, aplicaImpuesto).total;

    if (!lineas.length && total > 0) {
      lineas = [
        {
          tipoLinea: "PRODUCTO",
          descripcion: toText(
            pickValue(source, [
              "proyecto",
              "nombreProyecto",
              "nombre_proyecto",
              "descripcion",
            ]),
            "Item cotizacion"
          ),
          cantidad: 1,
          precioUnitario: total,
          subtotal: total,
          orden: 1,
          gananciaPct: 0,
        },
      ];
    }

    const proyecto = toText(
      pickValue(source, [
        "proyecto",
        "nombreProyecto",
        "nombre_proyecto",
        "descripcion",
      ]),
      lineas[0]?.descripcion || ""
    );

    return {
      id: toText(source.id),
      numero:
        numeroValue !== undefined ? toText(numeroValue) : codigo || String(index + 1),
      version: toNumber(pickValue(source, ["version"])) || index + 1,
      codigo,
      funnelBeckId:
        toText(pickValue(source, ["funnelBeckId", "funnel_beck_id"]), "") ||
        undefined,
      cliente: extractCotizacionCliente(source),
      proyecto,
      origen: toText(pickValue(source, ["origen"]), "Sin origen"),
      tipo: toText(pickValue(source, ["tipo"]), "Sin tipo"),
      fecha,
      vigencia,
      estado: normalizeCotizacionEstado(pickValue(source, ["estado"])),
      total,
      moneda: normalizeMoneda(
        pickValue(source, ["moneda", "moneda_total", "currency"])
      ),
      responsableId:
        toText(pickValue(source, ["responsableId", "responsable_id"]), "") ||
        null,
      responsableNombre: isObjectRecord(source.responsable)
        ? toText(pickValue(source.responsable, ["nombre"]))
        : "",
      notas: toText(pickValue(source, ["notas", "observaciones"])),
      descuento,
      aplicaImpuesto,
      subtotal,
      impuesto,
      lineas,
    };
  };

  const formatCotizacionMoney = (value: number, moneda: string): string => {
    const prefix = moneda === "USD" ? "US$" : "$";
    return `${prefix} ${value.toLocaleString("es-CL", {
      maximumFractionDigits: 0,
    })}`;
  };

  const formatCotizacionDate = (value: string): string => {
    if (!value) {
      return "-";
    }

    const date = dayjs(value);
    return date.isValid() ? date.format("DD-MM-YYYY") : value;
  };

  const toDayjsOrFallback = (value: string, fallback: Dayjs): Dayjs => {
    const date = dayjs(value);
    return date.isValid() ? date : fallback;
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  };

  const formatEstimatedValue = (
    value: number,
    moneda: FunnelCurrency
  ): string => {
    if (moneda === "UF") {
      return `UF ${new Intl.NumberFormat("es-CL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)}`;
    }

    if (moneda === "USD") {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }

    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDisplayDate = (value: string): string => {
    const [year, month, day] = value.split("-");

    if (!year || !month || !day) {
      return value;
    }

    return `${day}-${month}-${year}`;
  };

  const inputClassName =
    "w-full rounded-xl border border-beck-border-light bg-white px-3 py-2.5 text-sm text-beck-ink-soft outline-none transition focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]";

  const disabledInputClassName =
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

  const inputErrorClassName =
    "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100";

  const cleanRut = (value: string): string =>
    value.replace(/[^0-9kK]/g, "").toUpperCase();

  const formatRut = (value: string): string => {
    const clean = cleanRut(value);
    if (clean.length < 2) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formatted}-${dv}`;
  };

  const validateRut = (value: string): boolean => {
    const clean = cleanRut(value);
    if (clean.length < 2) return false;
    const dv = clean.slice(-1).toUpperCase();
    const body = clean.slice(0, -1);
    if (!/^\d+$/.test(body)) return false;
    if (!/^[\dK]$/.test(dv)) return false;
    return true;
  };

  const formatPhone = (value: string): string => value.replace(/\D/g, "");

  const validatePhone = (value: string): boolean => {
    const digits = formatPhone(value);
    return digits.length >= 8 && digits.length <= 12;
  };

  const validateEmail = (value: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const parseFlujoPosterior = (value?: string | null): string[] => {
    if (!value) return [];

    return value
      .split(/[,;\n|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const serializeFlujoPosterior = (values: string[]): string =>
    values.map((item) => item.trim()).filter(Boolean).join(", ");


  const UNIDAD_NEGOCIO_STRIP: Record<string, string> = {
    Beck: "bg-[#d6b02a] text-black",
    Firemat: "bg-red-600 text-white",
    Mixto: "bg-purple-600 text-white",
  };

  const getUnidadNegocioVisualLabel = (deal: FunnelDeal): string => {
    if (deal.unidadNegocio === "Mixto") return "MIXTO";
    if (deal.origen === "FIREMAT" || deal.unidadNegocio === "Firemat") {
      return "FIREMAT";
    }
    return "BECK";
  };

  const getUnidadNegocioStripClass = (label: string): string =>
    UNIDAD_NEGOCIO_STRIP[
      label === "FIREMAT" ? "Firemat" : label === "MIXTO" ? "Mixto" : "Beck"
    ];

  const FunnelCard: React.FC<FunnelCardProps> = ({
    deal,
    canEditFunnel,
    canOperateFiremat,
    onStageChange,
    onViewDetail,
    onCreateCotizacion,
  }) => {
    void onStageChange;
    void onCreateCotizacion;
    const isFiremat = deal.origen === "FIREMAT";
    const unidadVisualLabel = getUnidadNegocioVisualLabel(deal);
    const draggingEnabled = isFiremat ? canOperateFiremat : canEditFunnel;
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: deal.id,
        disabled: !draggingEnabled,
      });

    return (
      <article
        ref={setNodeRef}
        {...(draggingEnabled ? listeners : {})}
        {...(draggingEnabled ? attributes : {})}
        className={`group cursor-pointer rounded-lg border bg-white text-xs shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-xl hover:z-20 overflow-hidden ${
          deal.estadoCierre === "perdida"
            ? "border-red-400 hover:border-red-500"
            : deal.estadoCierre === "postergada"
            ? "border-orange-400 hover:border-orange-500"
            : deal.estadoCierre === "descartada"
            ? "border-slate-400 hover:border-slate-500"
            : "border-beck-border-light hover:border-yellow-400"
        } ${isDragging ? "opacity-30" : ""}`}
        style={{
          transform: transform
            ? `translate(${transform.x}px, ${transform.y}px)`
            : undefined,
        }}
        onClick={() => void onViewDetail(deal)}
      >
        <div
          className={`flex h-[18px] items-center justify-center text-[8px] font-semibold uppercase tracking-[0.08em] select-none ${getUnidadNegocioStripClass(unidadVisualLabel)}`}
        >
          {unidadVisualLabel}
        </div>
        {deal.estadoCierre === "perdida" && (
          <div className="bg-red-600 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-white select-none">
            ━━━ PERDIDA ━━━
          </div>
        )}
        {deal.estadoCierre === "postergada" && (
          <div className="bg-orange-500 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-white select-none">
            ━━━ POSTERGADA ━━━
          </div>
        )}
        {deal.estadoCierre === "descartada" && (
          <div className="bg-slate-500 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-white select-none">
            ━━━ DESCARTADA ━━━
          </div>
        )}
        <div className="px-2 pb-2 pt-3">
        <h4 className="font-semibold leading-tight text-beck-ink">
          {deal.nombreProyecto}
        </h4>

        {deal.clienteBeck && (
          <p
            className="mt-0.5 truncate text-[10px] font-medium text-amber-700"
            title={deal.clienteBeck.nombreEmpresa || deal.clienteBeck.razonSocial || ""}
          >
            {deal.clienteBeck.nombreEmpresa || deal.clienteBeck.razonSocial}
          </p>
        )}

        {deal.contactoBeck && (
          <p
            className="truncate text-[10px] text-beck-muted"
            title={deal.contactoBeck.nombre}
          >
            {deal.contactoBeck.nombre}
            {deal.contactoBeck.cargo ? ` · ${deal.contactoBeck.cargo}` : ""}
          </p>
        )}

        {typeof deal.valorEstimado === "number" && (
          <p className="mt-1 font-medium text-beck-ink-soft">
            {formatEstimatedValue(deal.valorEstimado, deal.moneda)}
          </p>
        )}

        {deal.fechaProbableCierre && (
          <p className="mt-0.5 text-beck-muted">
            Cierre: {formatDisplayDate(deal.fechaProbableCierre)}
          </p>
        )}

        {deal.etapa === "cerrada" && deal.estadoCierre === "ganada" && !deal.obra && (
          <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            Disponible
          </span>
        )}

        {deal.obra && (
          <p className="mt-0.5 truncate text-[10px] font-medium text-cyan-700">
            Obra: {deal.obra.nombre || deal.obra.codigo || "Vinculada"}
          </p>
        )}

        {typeof deal.probabilidadCierre === "number" && (
          <p className="mt-0.5 text-beck-muted">
            Prob: {deal.probabilidadCierre}%
          </p>
        )}

        {deal.proximaAccion && (
          <p className="mt-0.5 truncate text-beck-muted" title={deal.proximaAccion}>
            Acc: {deal.proximaAccion}
          </p>
        )}

        {deal.fechaProximaAccion && (
          <p className="mt-0.5 text-beck-muted">
            Prox: {formatDisplayDate(deal.fechaProximaAccion)}
          </p>
        )}

        <p className="mt-1 hidden text-[11px] text-beck-muted group-hover:block">
          Click para ver detalle
        </p>
        </div>
      </article>
    );
  };

  const FunnelColumn: React.FC<FunnelColumnProps> = ({
    columnKey,
    label,
    deals,
    canEditFunnel,
    canOperateFiremat,
    onStageChange,
    onViewDetail,
    onCreateCotizacion,
  }) => {
    const { setNodeRef } = useDroppable({
      id: columnKey,
      disabled: !canEditFunnel && !canOperateFiremat,
    });

    return (
      <div
        ref={setNodeRef}
        className="flex min-h-[420px] w-[220px] flex-shrink-0 flex-col rounded-xl border border-[#ece8d8] bg-[#f7f6ef] p-3"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "#17181a" }}>
            {label}
          </h3>
          <span className="rounded-full border border-beck-border-light bg-white px-2 py-0.5 text-xs text-beck-ink-soft">
            {deals.length}
          </span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1 overflow-visible">
          {deals.length ? (
            deals.map((deal) => (
              <FunnelCard
                key={deal.id}
                deal={deal}
                canEditFunnel={canEditFunnel}
                canOperateFiremat={canOperateFiremat}
                onStageChange={onStageChange}
                onViewDetail={onViewDetail}
                onCreateCotizacion={onCreateCotizacion}
              />
            ))
          ) : (
            <p className="mt-4 text-center text-xs text-beck-muted">
              Sin oportunidades
            </p>
          )}
        </div>
      </div>
    );
  };

  const formatArchivoSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getArchivoNombre = (archivo: FunnelBeckArchivo): string =>
    archivo.nombreArchivo || archivo.publicId || "Archivo adjunto";

  const toCloudinaryDownloadUrl = (url?: string | null): string => {
    if (!url) return "";
    if (!url.includes("/image/upload/")) return url;
    if (url.includes("/upload/fl_attachment/")) return url;
    return url.replace("/upload/", "/upload/fl_attachment/");
  };

  const openArchivo = (url?: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadArchivo = (url?: string | null) => {
    const downloadUrl = toCloudinaryDownloadUrl(url);
    if (!downloadUrl) return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const groupArchivosFunnel = (
    archivos: FunnelBeckArchivo[]
  ): ArchivosFunnelPorTipo =>
    archivos.reduce<ArchivosFunnelPorTipo>((acc, archivo) => {
      acc[archivo.tipo] = [...(acc[archivo.tipo] ?? []), archivo];
      return acc;
    }, {});

  const ArchivoUploaderFunnel: React.FC<ArchivoUploaderFunnelProps> = ({
    oportunidadId,
    tipo,
    titulo,
    accept,
    multiple,
    archivos,
    onUploaded,
    onDeleted,
  }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleFilesSelected = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = "";

      if (!selectedFiles.length) return;

      try {
        setUploading(true);
        const uploaded = await funnelBeckAPI.subirArchivos(
          oportunidadId,
          tipo,
          selectedFiles
        );
        onUploaded(uploaded);
        message.success("Archivo subido correctamente");
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo subir el archivo"));
      } finally {
        setUploading(false);
      }
    };

    const handleDelete = (archivo: FunnelBeckArchivo) => {
      AntdModal.confirm({
        title: "Eliminar archivo",
        content: `¿Deseas eliminar ${getArchivoNombre(archivo)}?`,
        okText: "Eliminar",
        okButtonProps: { danger: true },
        cancelText: "Cancelar",
        onOk: async () => {
          try {
            setDeletingId(archivo.id);
            await funnelBeckAPI.eliminarArchivo(archivo.id);
            onDeleted(archivo.id);
            message.success("Archivo eliminado");
          } catch (error) {
            message.error(getErrorMessage(error, "No se pudo eliminar el archivo"));
          } finally {
            setDeletingId(null);
          }
        },
      });
    };

    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">{titulo}</p>
            <p className="text-xs text-slate-500">
              {archivos.length
                ? `${archivos.length} archivo${archivos.length === 1 ? "" : "s"}`
                : "Sin archivos adjuntos"}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={(event) => {
              void handleFilesSelected(event);
            }}
          />
          <Button
            type="default"
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Subir
          </Button>
        </div>

        {archivos.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {archivos.map((archivo) => (
              <li
                key={archivo.id}
                className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700">
                    {getArchivoNombre(archivo)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[archivo.mimeType, formatArchivoSize(archivo.bytes)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => openArchivo(archivo.url)}
                  >
                    Ver
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => downloadArchivo(archivo.url)}
                  >
                    Descargar
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deletingId === archivo.id}
                    onClick={() => handleDelete(archivo)}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const FunnelModal: React.FC<FunnelModalProps> = ({
    open,
    mode,
    draft,
    fieldErrors,
    validationMessage,
    conversionReferencia,
    submitting,
    onClose,
    onSubmit,
    onFieldChange,
    selectedClienteBeck,
    clienteBeckResults,
    clienteBeckSearching,
    clientesDisponibles,
    clientesLoading,
    initialEditSection,
    editVisibleSections,
    oportunidadId,
    archivosPorTipo,
    jefesObra,
    jefesObraLoading,
    usuariosComerciales,
    usuariosComercialesLoading,
    onClienteBeckSearchChange,
    onSelectClienteBeck,
    onSelectContactoBeck,
    onArchivosUploaded,
    onArchivoDeleted,
    onSaveOpportunityDraft,
    onSolicitudOficinaCreated,
  }) => {
    const { canView: canViewFunnel, canEdit: canEditFunnelPerm } = usePermisos();
    const canCambiarEmpresaBeck =
      canViewFunnel("beck_cambiar_empresa") || canEditFunnelPerm("beck_cambiar_empresa");

    const [oficinaTecnicaModalOpen, setOficinaTecnicaModalOpen] = useState(false);
    const [solicitudOficinaSaving, setSolicitudOficinaSaving] = useState(false);

    useEffect(() => {
      if (!open || !initialEditSection) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        document
          .getElementById(`funnel-section-${initialEditSection}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);

      return () => window.clearTimeout(timeoutId);
    }, [open, initialEditSection, draft.etapa]);

    if (!open) {
      return null;
    }

    const selectedRegionData: RegionChile | undefined = regionesComunasChile.find(
      (region) => region.nombre === draft.region
    );
    const comunasDisponibles = selectedRegionData?.comunas ?? [];
    const getFieldClassName = (field: keyof FunnelDraft) =>
      `${inputClassName} ${disabledInputClassName} ${
        fieldErrors[field] ? inputErrorClassName : ""
      }`;
    const renderFieldError = (field: keyof FunnelDraft) => {
      const error = fieldErrors[field];

      if (!error) {
        return null;
      }

      return (
        <p
          id={`funnel-${field}-error`}
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      );
    };

    const renderTextInput = (
      field: keyof FunnelDraft,
      label: string,
      options?: {
        type?: "text" | "date" | "number";
        placeholder?: string;
        required?: boolean;
      }
    ) => (
      <div>
        <label
          htmlFor={`funnel-${field}`}
          className="mb-1.5 block text-xs font-medium text-slate-600"
        >
          {label}
          {options?.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <input
          id={`funnel-${field}`}
          type={options?.type ?? "text"}
          value={draft[field]}
          onChange={(event) => onFieldChange(field, event.target.value)}
          disabled={submitting}
          className={getFieldClassName(field)}
          placeholder={options?.placeholder}
          aria-invalid={Boolean(fieldErrors[field])}
        />
        {renderFieldError(field)}
      </div>
    );

    const renderTextarea = (
      field: keyof FunnelDraft,
      label: string,
      placeholder?: string
    ) => (
      <div className="md:col-span-2">
        <label
          htmlFor={`funnel-${field}`}
          className="mb-1.5 block text-xs font-medium text-slate-600"
        >
          {label}
        </label>
        <textarea
          id={`funnel-${field}`}
          value={draft[field]}
          onChange={(event) => onFieldChange(field, event.target.value)}
          disabled={submitting}
          className={getFieldClassName(field)}
          rows={2}
          placeholder={placeholder}
          aria-invalid={Boolean(fieldErrors[field])}
        />
        {renderFieldError(field)}
      </div>
    );

    const renderBooleanSwitch = (field: keyof FunnelDraft, label: string) => (
      <div>
        <Typography.Text className="mb-1.5 block text-xs font-medium text-slate-600">
          {label}
        </Typography.Text>
        <Switch
          checked={draft[field] === "true"}
          onChange={(checked) => onFieldChange(field, checked ? "true" : "false")}
          disabled={submitting}
          checkedChildren="Sí"
          unCheckedChildren="No"
        />
      </div>
    );

    const renderSimpleSelect = (
      field: keyof FunnelDraft,
      label: string,
      options: readonly string[]
    ) => {
      const selectOptions = options.map((option) => ({
        value: option,
        label: option,
      }));
      const currentValue = draft[field];
      const hasCurrentValue =
        !currentValue ||
        selectOptions.some((option) => option.value === currentValue);
      const finalOptions = hasCurrentValue
        ? selectOptions
        : [
            {
              value: currentValue,
              label: currentValue,
            },
            ...selectOptions,
          ];

      return (
        <div>
          <label
            htmlFor={`funnel-${field}`}
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            {label}
          </label>
          <Select
            id={`funnel-${field}`}
            allowClear
            value={currentValue || undefined}
            onChange={(value) => onFieldChange(field, value ?? "")}
            disabled={submitting}
            className="w-full"
            options={finalOptions}
          />
        </div>
      );
    };

    const renderResponsableTecnicoSelect = () => {
      const jefeOptions = jefesObra.map((jefe) => ({
        value: `${jefe.nombre} <${jefe.email}>`,
        label: `${jefe.nombre} (${jefe.email})`,
      }));
      const hasCurrentValue =
        !draft.responsableTecnico ||
        jefeOptions.some((option) => option.value === draft.responsableTecnico);
      const options = hasCurrentValue
        ? jefeOptions
        : [
            {
              value: draft.responsableTecnico,
              label: draft.responsableTecnico,
            },
            ...jefeOptions,
          ];

      return (
        <div>
          <label
            htmlFor="funnel-responsableTecnico"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Responsable técnico / jefe de obra
          </label>
          <Select
            id="funnel-responsableTecnico"
            showSearch
            allowClear
            value={draft.responsableTecnico || undefined}
            onChange={(value) => onFieldChange("responsableTecnico", value ?? "")}
            disabled={submitting || jefesObraLoading}
            loading={jefesObraLoading}
            className="w-full"
            placeholder="Selecciona jefe de obra"
            optionFilterProp="label"
            options={options}
          />
        </div>
      );
    };

    const renderVendedorSelect = () => {
      const comercialOptions = usuariosComerciales
        .filter((u) => u.nombre || u.email)
        .map((u) => ({
          value: u.nombre || u.email,
          label: u.nombre || u.email,
          searchText: `${u.nombre ?? ""} ${u.email ?? ""}`.toLowerCase(),
        }));
      const hasCurrentValue =
        !draft.vendedor ||
        comercialOptions.some((opt) => opt.value === draft.vendedor);
      const options = hasCurrentValue
        ? comercialOptions
        : [
            {
              value: draft.vendedor,
              label: draft.vendedor,
              searchText: draft.vendedor.toLowerCase(),
            },
            ...comercialOptions,
          ];

      return (
        <div>
          <label
            htmlFor="funnel-vendedor"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Vendedor
            <span className="ml-1 text-red-500">*</span>
          </label>
          <Select
            id="funnel-vendedor"
            showSearch
            allowClear
            value={draft.vendedor || undefined}
            onChange={(value) => onFieldChange("vendedor", value ?? "")}
            disabled={submitting || usuariosComercialesLoading}
            loading={usuariosComercialesLoading}
            className="w-full"
            placeholder="Selecciona un vendedor"
            filterOption={(input, option) => {
              if (!option) return false;
              const searchText =
                typeof option.searchText === "string" ? option.searchText : "";
              return searchText.includes(input.toLowerCase());
            }}
            options={options}
            status={fieldErrors.vendedor ? "error" : undefined}
          />
          {renderFieldError("vendedor")}
        </div>
      );
    };

    const renderFlujoPosteriorSelect = () => {
      const selectedValues = parseFlujoPosterior(draft.flujoPosterior);
      const optionValues = new Set<string>(flujoPosteriorOptions);
      const options = [
        ...flujoPosteriorOptions.map((option) => ({
          value: option,
          label: option,
        })),
        ...selectedValues
          .filter((value) => !optionValues.has(value))
          .map((value) => ({ value, label: value })),
      ];

      return (
        <div className="md:col-span-2">
          <label
            htmlFor="funnel-flujoPosterior"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Flujo posterior
            {draft.etapa === "cerrada" && <span className="ml-1 text-red-500">*</span>}
          </label>
          <Select
            id="funnel-flujoPosterior"
            mode="multiple"
            value={selectedValues}
            onChange={(values) =>
              onFieldChange("flujoPosterior", serializeFlujoPosterior(values))
            }
            disabled={submitting}
            className="w-full"
            placeholder="Selecciona uno o más flujos"
            options={options}
          />
          {renderFieldError("flujoPosterior")}
        </div>
      );
    };

    const renderSolicitudArchivoList = (
      tipo: FunnelBeckArchivoTipo,
      emptyText = "Sin archivos adjuntos"
    ) => {
      const archivos = archivosPorTipo[tipo] ?? [];

      if (!archivos.length) {
        return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
      }

      return (
        <ul className="space-y-2">
          {archivos.map((archivo) => (
            <li
              key={archivo.id}
              className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Typography.Text className="block truncate">
                  {getArchivoNombre(archivo)}
                </Typography.Text>
                <Typography.Text type="secondary" className="text-xs">
                  {[archivo.mimeType, formatArchivoSize(archivo.bytes)]
                    .filter(Boolean)
                    .join(" · ") || "Archivo adjunto"}
                </Typography.Text>
              </div>
              <Space size="small">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => openArchivo(archivo.url)}
                >
                  Ver
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => downloadArchivo(archivo.url)}
                >
                  Descargar
                </Button>
              </Space>
            </li>
          ))}
        </ul>
      );
    };

    const renderOficinaTecnicaModal = () => (
      <AntdModal
        open={oficinaTecnicaModalOpen}
        onCancel={() => setOficinaTecnicaModalOpen(false)}
        width="min(860px, 95vw)"
        title="Solicitud Oficina Técnica"
        okText="Crear solicitud"
        cancelText="Cancelar"
        confirmLoading={solicitudOficinaSaving}
        onOk={async () => {
          if (draft.necesidadOficinaTecnica !== "true") {
            message.error(
              "Debes marcar que requiere oficina técnica antes de crear la solicitud."
            );
            return;
          }

          if (!oportunidadId) {
            message.error("Guarda la oportunidad antes de crear la solicitud.");
            return;
          }

          try {
            setSolicitudOficinaSaving(true);
            await onSaveOpportunityDraft();
            await oficinaTecnicaPreventaAPI.crear({
              oportunidadId,
              responsableTecnico: draft.responsableTecnico.trim() || undefined,
              antecedentesLevantados:
                draft.antecedentesLevantados.trim() || undefined,
              basesTecnicas: draft.basesTecnicas.trim() || undefined,
              especificaciones: draft.especificaciones.trim() || undefined,
              observacionesTecnicas:
                draft.observacionesTecnicas.trim() || undefined,
            });
            message.success("Solicitud enviada a Oficina Técnica.");
            setOficinaTecnicaModalOpen(false);
            await onSolicitudOficinaCreated();
          } catch (error) {
            message.error(
              getErrorMessage(error, "No se pudo crear la solicitud de Oficina Técnica")
            );
          } finally {
            setSolicitudOficinaSaving(false);
          }
        }}
        styles={{ body: { maxHeight: "72vh", overflowY: "auto" } }}
      >
        <div className="space-y-4">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Oportunidad">
              {oportunidadId || "Oportunidad en edición"}
            </Descriptions.Item>
            <Descriptions.Item label="Cliente / Empresa">
              {selectedClienteBeck?.nombreEmpresa ||
                selectedClienteBeck?.razonSocial ||
                draft.empresa ||
                "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Proyecto">
              {draft.nombreProyecto || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Responsable comercial">
              {draft.vendedor || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Responsable técnico / jefe de obra">
              {draft.responsableTecnico || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Antecedentes levantados">
              {draft.antecedentesLevantados || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bases técnicas">
              {draft.basesTecnicas || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Especificaciones">
              {draft.especificaciones || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Observaciones técnicas">
              {draft.observacionesTecnicas || "-"}
            </Descriptions.Item>
          </Descriptions>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Typography.Text strong>Archivos asociados</Typography.Text>
            <div className="space-y-3">
              <div>
                <Typography.Text className="mb-1.5 block text-sm font-medium text-slate-700">
                  Documentos recibidos
                </Typography.Text>
                {renderSolicitudArchivoList("DOCUMENTO_RECIBIDO")}
              </div>
              <div>
                <Typography.Text className="mb-1.5 block text-sm font-medium text-slate-700">
                  Planos
                </Typography.Text>
                {renderSolicitudArchivoList("PLANO")}
              </div>
              <div>
                <Typography.Text className="mb-1.5 block text-sm font-medium text-slate-700">
                  Fotografías
                </Typography.Text>
                {renderSolicitudArchivoList("FOTOGRAFIA")}
              </div>
            </div>
          </div>
        </div>
      </AntdModal>
    );

    const clienteLabel = (c: ClienteBeck) => {
      const nombre = c.nombreEmpresa || c.razonSocial || c.rut;
      return `${nombre} — ${c.rut}`;
    };

    const seenIds = new Set<string>();
    const clienteSelectOptions = [
      ...(selectedClienteBeck &&
      !clientesDisponibles.find((c) => c.id === selectedClienteBeck.id) &&
      !clienteBeckResults.find((c) => c.id === selectedClienteBeck.id)
        ? [{ value: selectedClienteBeck.id, label: clienteLabel(selectedClienteBeck) }]
        : []),
      ...clientesDisponibles.map((c) => ({ value: c.id, label: clienteLabel(c) })),
      ...clienteBeckResults
        .filter((c) => !clientesDisponibles.find((d) => d.id === c.id))
        .map((c) => ({ value: c.id, label: clienteLabel(c) })),
    ].filter((opt) => {
      if (seenIds.has(opt.value)) return false;
      seenIds.add(opt.value);
      return true;
    });

    const contactoOptions = (selectedClienteBeck?.contactos ?? [])
      .filter((c) => c.activo)
      .map((c) => ({
        value: c.id,
        label: `${c.nombre}${c.cargo ? ` — ${c.cargo}` : ""}`,
      }));
    const isRestrictedEdit = mode === "edit" && Array.isArray(editVisibleSections);
    const isFocusedStageEdit = mode === "edit" && !isRestrictedEdit && Boolean(initialEditSection);
    const showFullForm = !isFocusedStageEdit && !isRestrictedEdit;
    const showAllStageSections = mode === "edit" && !isFocusedStageEdit && !isRestrictedEdit;
    const sectionVisible = (section: FunnelEditSection) =>
      isRestrictedEdit ? (editVisibleSections as FunnelEditSection[]).includes(section) : false;
    const showProspectoSection =
      showFullForm ||
      initialEditSection === "prospecto" ||
      sectionVisible("prospecto");
    const showVisitaSection =
      showAllStageSections ||
      initialEditSection === "visita" ||
      (mode === "create" && draft.etapa === "visita") ||
      sectionVisible("visita");
    const showDesarrolloSection =
      showAllStageSections ||
      initialEditSection === "desarrollo" ||
      (mode === "create" && draft.etapa === "cotizacion") ||
      sectionVisible("desarrollo");
    const showNegociacionSection =
      showAllStageSections ||
      initialEditSection === "negociacion" ||
      (mode === "create" && ["enviada", "negociacion"].includes(draft.etapa)) ||
      sectionVisible("negociacion");
    const showDocumentacionSection =
      showAllStageSections ||
      initialEditSection === "documentacion" ||
      (mode === "create" && draft.etapa === "documentacion") ||
      sectionVisible("documentacion");
    const showCierreSection =
      showAllStageSections ||
      initialEditSection === "cierre" ||
      (mode === "create" && draft.etapa === "cerrada") ||
      sectionVisible("cierre");
    const renderArchivoUploaders = (configs: ArchivoFunnelConfig[]) => {
      if (!oportunidadId) {
        return null;
      }

      return (
        <div className="md:col-span-2 space-y-3">
          {configs.map((config) => (
            <ArchivoUploaderFunnel
              key={config.tipo}
              oportunidadId={oportunidadId}
              tipo={config.tipo}
              titulo={config.titulo}
              accept={config.accept}
              multiple={config.multiple}
              archivos={archivosPorTipo[config.tipo] ?? []}
              onUploaded={onArchivosUploaded}
              onDeleted={onArchivoDeleted}
            />
          ))}
        </div>
      );
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-beck-border-light px-5 py-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#a8860f]">
                Funnel
              </p>
              <h2 className="mt-1 text-lg font-semibold text-beck-ink">
                {mode === "create" ? "Nueva oportunidad" : "Editar oportunidad"}
              </h2>
              <p className="mt-1 text-sm text-beck-muted">
                {mode === "create"
                  ? "Completa la informacion para registrar una nueva oportunidad comercial."
                  : "Actualiza la informacion de la oportunidad comercial seleccionada."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="beck-btn-secondary rounded-full px-3 py-1.5"
            >
              Cerrar
            </button>
          </div>

          <form noValidate onSubmit={onSubmit} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {validationMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
              >
                {validationMessage}
              </div>
            )}

            {showProspectoSection && (
            <>
            {showFullForm && (
            <>
            {/* CLIENTE ASOCIADO */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Cliente asociado
                </p>
                {draft.clienteBeckId && (
                  <button
                    type="button"
                    onClick={() => onSelectClienteBeck(null)}
                    disabled={submitting}
                    className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Quitar cliente asociado
                  </button>
                )}
              </div>

              <Select
                showSearch
                allowClear
                value={draft.clienteBeckId || null}
                placeholder={canCambiarEmpresaBeck ? "Seleccionar cliente" : "No tienes permiso para cambiar empresa"}
                optionFilterProp="label"
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                onSearch={onClienteBeckSearchChange}
                onChange={(value) => {
                  if (!value) {
                    onSelectClienteBeck(null);
                    return;
                  }
                  const allClientes = [
                    ...clientesDisponibles,
                    ...clienteBeckResults.filter((c) => !clientesDisponibles.find((d) => d.id === c.id)),
                    ...(selectedClienteBeck ? [selectedClienteBeck] : []),
                  ];
                  const cliente = allClientes.find((c) => c.id === value) ?? null;
                  if (cliente) onSelectClienteBeck(cliente);
                }}
                loading={clientesLoading || clienteBeckSearching}
                disabled={submitting || !canCambiarEmpresaBeck}
                style={{ width: "100%" }}
                notFoundContent={
                  clientesLoading ? "Cargando clientes..." : "Sin resultados"
                }
                options={clienteSelectOptions}
              />

              {selectedClienteBeck && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Contacto asociado
                  </label>
                  {contactoOptions.length > 0 ? (
                    <Select
                      value={draft.contactoBeckId || null}
                      placeholder="Seleccionar contacto del cliente"
                      allowClear
                      disabled={submitting || !canCambiarEmpresaBeck}
                      onChange={(value) => {
                        if (!value) {
                          onSelectContactoBeck(null);
                          return;
                        }
                        const contacto =
                          (selectedClienteBeck.contactos ?? []).find((c) => c.id === value) ?? null;
                        onSelectContactoBeck(contacto);
                      }}
                      style={{ width: "100%" }}
                      options={contactoOptions}
                    />
                  ) : (
                    <p className="text-xs text-slate-400 py-1">
                      Este cliente no tiene contactos registrados
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor="funnel-nombre-proyecto"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Nombre del proyecto
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  id="funnel-nombre-proyecto"
                  type="text"
                  value={draft.nombreProyecto}
                  onChange={(event) =>
                    onFieldChange("nombreProyecto", event.target.value)
                  }
                  disabled={submitting}
                  className={getFieldClassName("nombreProyecto")}
                  placeholder="Ingresa el nombre del proyecto"
                  aria-invalid={Boolean(fieldErrors.nombreProyecto)}
                  aria-describedby={
                    fieldErrors.nombreProyecto
                      ? "funnel-nombreProyecto-error"
                      : undefined
                  }
                />
                {renderFieldError("nombreProyecto")}
              </div>

              <div>
                <label
                  htmlFor="funnel-empresa"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Empresa
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  id="funnel-empresa"
                  type="text"
                  value={draft.empresa}
                  onChange={(event) => onFieldChange("empresa", event.target.value)}
                  disabled={submitting || !canCambiarEmpresaBeck}
                  title={!canCambiarEmpresaBeck ? "No tienes permiso para cambiar empresa" : undefined}
                  className={getFieldClassName("empresa")}
                  placeholder="Nombre de la empresa"
                  aria-invalid={Boolean(fieldErrors.empresa)}
                  aria-describedby={
                    fieldErrors.empresa ? "funnel-empresa-error" : undefined
                  }
                />
                {renderFieldError("empresa")}
              </div>

              <div>
                <label
                  htmlFor="funnel-valor-estimado"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Valor estimado
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <div className="grid grid-cols-[minmax(0,1fr),96px] gap-2">
                  <input
                    id="funnel-valor-estimado"
                    type="number"
                    min="0"
                    value={draft.valorEstimado}
                    onChange={(event) =>
                      onFieldChange("valorEstimado", event.target.value)
                    }
                    disabled={submitting}
                    className={getFieldClassName("valorEstimado")}
                    placeholder="Ej: 1500000"
                    aria-invalid={Boolean(fieldErrors.valorEstimado)}
                    aria-describedby={
                      fieldErrors.valorEstimado
                        ? "funnel-valorEstimado-error"
                        : undefined
                    }
                  />
                  <select
                    value={draft.moneda}
                    onChange={(event) => onFieldChange("moneda", event.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                  >
                    <option value="CLP">CLP</option>
                    <option value="UF">UF</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                {renderFieldError("valorEstimado")}
                {conversionReferencia && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {conversionReferencia}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="funnel-fecha-cierre"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Fecha probable de cierre
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  id="funnel-fecha-cierre"
                  type="date"
                  value={draft.fechaProbableCierre}
                  onChange={(event) =>
                    onFieldChange("fechaProbableCierre", event.target.value)
                  }
                  disabled={submitting}
                  className={getFieldClassName("fechaProbableCierre")}
                  aria-invalid={Boolean(fieldErrors.fechaProbableCierre)}
                  aria-describedby={
                    fieldErrors.fechaProbableCierre
                      ? "funnel-fechaProbableCierre-error"
                      : undefined
                  }
                />
                {renderFieldError("fechaProbableCierre")}
              </div>

              {renderVendedorSelect()}

              <div>
                <label
                  htmlFor="funnel-region"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Region
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  id="funnel-region"
                  value={draft.region}
                  onChange={(event) => onFieldChange("region", event.target.value)}
                  disabled={submitting}
                  className={getFieldClassName("region")}
                  aria-invalid={Boolean(fieldErrors.region)}
                  aria-describedby={
                    fieldErrors.region ? "funnel-region-error" : undefined
                  }
                >
                  <option value="">Selecciona una region</option>
                  {regionesComunasChile.map((region) => (
                    <option key={region.nombre} value={region.nombre}>
                      {region.nombre}
                    </option>
                  ))}
                </select>
                {renderFieldError("region")}
              </div>

              <div>
                <label
                  htmlFor="funnel-comuna"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Comuna
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  id="funnel-comuna"
                  value={draft.comuna}
                  onChange={(event) => onFieldChange("comuna", event.target.value)}
                  className={getFieldClassName("comuna")}
                  disabled={submitting || !draft.region}
                  aria-invalid={Boolean(fieldErrors.comuna)}
                  aria-describedby={
                    fieldErrors.comuna ? "funnel-comuna-error" : undefined
                  }
                >
                  <option value="">
                    {draft.region
                      ? "Selecciona una comuna"
                      : "Primero selecciona una region"}
                  </option>
                  {comunasDisponibles.map((comuna) => (
                    <option key={comuna} value={comuna}>
                      {comuna}
                    </option>
                  ))}
                </select>
                {renderFieldError("comuna")}
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="funnel-fuente-lead"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Fuente del lead
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  id="funnel-fuente-lead"
                  value={draft.fuenteLead}
                  onChange={(event) =>
                    onFieldChange("fuenteLead", event.target.value)
                  }
                  disabled={submitting}
                  className={getFieldClassName("fuenteLead")}
                  aria-invalid={Boolean(fieldErrors.fuenteLead)}
                  aria-describedby={
                    fieldErrors.fuenteLead
                      ? "funnel-fuenteLead-error"
                      : undefined
                  }
                >
                  <option value="">Selecciona una fuente</option>
                  {leadSourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {renderFieldError("fuenteLead")}
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="funnel-etapa"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Etapa inicial
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  id="funnel-etapa"
                  value={draft.etapa}
                  onChange={(event) => onFieldChange("etapa", event.target.value)}
                  disabled={submitting}
                  className={getFieldClassName("etapa")}
                  aria-invalid={Boolean(fieldErrors.etapa)}
                  aria-describedby={
                    fieldErrors.etapa ? "funnel-etapa-error" : undefined
                  }
                >
                  {etapas.map((etapa) => (
                    <option key={etapa} value={etapa}>
                      {etapasLabel[etapa]}
                    </option>
                  ))}
                </select>
                {renderFieldError("etapa")}
              </div>
            </div>

            {/* INFORMACIÓN DEL PROYECTO */}
            <div className="border-t border-beck-border-light pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                Información del proyecto
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {renderTextInput("direccionProyecto", "Dirección / ubicación del proyecto")}
                {renderSimpleSelect("unidadNegocio", "Unidad de negocio *", ["Beck", "Firemat"])}
                {renderTextarea("observaciones", "Observaciones generales", "Comentarios u observaciones sobre la oportunidad")}
              </div>
            </div>
            </>
            )}

            {/* PROSPECTO */}
            <div id="funnel-section-prospecto" className="border-t border-beck-border-light pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                Prospecto
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="funnel-rut-empresa" className="mb-1.5 block text-xs font-medium text-slate-600">
                    RUT empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="funnel-rut-empresa"
                    type="text"
                    value={draft.rutEmpresa}
                    onChange={(e) => {
                      const clean = cleanRut(e.target.value);
                      onFieldChange("rutEmpresa", clean.length > 1 ? formatRut(clean) : clean);
                    }}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName} ${fieldErrors.rutEmpresa ? inputErrorClassName : ""}`}
                    placeholder="12.345.678-9"
                    aria-invalid={Boolean(fieldErrors.rutEmpresa)}
                  />
                  {renderFieldError("rutEmpresa")}
                </div>
                <div>
                  <label htmlFor="funnel-nombre-contacto" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Nombre contacto <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="funnel-nombre-contacto"
                    type="text"
                    value={draft.nombreContacto}
                    onChange={(e) => onFieldChange("nombreContacto", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div>
                  <label htmlFor="funnel-cargo-contacto" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Cargo
                  </label>
                  <input
                    id="funnel-cargo-contacto"
                    type="text"
                    value={draft.cargoContacto}
                    onChange={(e) => onFieldChange("cargoContacto", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    placeholder="Cargo del contacto"
                  />
                </div>
                <div>
                  <label htmlFor="funnel-telefono-contacto" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Telefono <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="funnel-telefono-contacto"
                    type="tel"
                    value={draft.telefonoContacto}
                    onChange={(e) => onFieldChange("telefonoContacto", formatPhone(e.target.value))}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName} ${fieldErrors.telefonoContacto ? inputErrorClassName : ""}`}
                    placeholder="56912345678"
                    aria-invalid={Boolean(fieldErrors.telefonoContacto)}
                  />
                  <p className="mt-1 text-xs text-slate-400">Debe existir teléfono o correo</p>
                  {renderFieldError("telefonoContacto")}
                </div>
                <div>
                  <label htmlFor="funnel-correo-contacto" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Correo <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="funnel-correo-contacto"
                    type="email"
                    value={draft.correoContacto}
                    onChange={(e) => onFieldChange("correoContacto", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName} ${fieldErrors.correoContacto ? inputErrorClassName : ""}`}
                    placeholder="contacto@empresa.cl"
                    aria-invalid={Boolean(fieldErrors.correoContacto)}
                  />
                  <p className="mt-1 text-xs text-slate-400">Debe existir teléfono o correo</p>
                  {renderFieldError("correoContacto")}
                </div>
                <div>
                  <label htmlFor="funnel-tipo-oportunidad" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Tipo oportunidad
                  </label>
                  <input
                    id="funnel-tipo-oportunidad"
                    type="text"
                    value={draft.tipoOportunidad}
                    onChange={(e) => onFieldChange("tipoOportunidad", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    placeholder="Tipo de oportunidad"
                  />
                </div>
                <div>
                  <label htmlFor="funnel-urgencia" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Urgencia
                  </label>
                  <Select
                    id="funnel-urgencia"
                    allowClear
                    value={draft.urgencia || undefined}
                    onChange={(value) => onFieldChange("urgencia", value ?? "")}
                    disabled={submitting}
                    className="w-full"
                    placeholder="Selecciona urgencia"
                    options={[
                      { value: "INMEDIATA", label: "Inmediata" },
                      { value: "1-3 MESES", label: "1-3 meses" },
                      { value: "3-6 MESES", label: "3-6 meses" },
                      { value: "+6 MESES", label: "+6 meses" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {showFullForm && (
            <>
            {/* CAMPOS ESPECÍFICOS BECK */}
            <div className="border-t border-beck-border-light pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                Campos específicos Beck
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="funnel-tipoProyecto" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Tipo de proyecto
                  </label>
                  <Select
                    id="funnel-tipoProyecto"
                    allowClear
                    value={draft.tipoProyecto || undefined}
                    onChange={(value) => onFieldChange("tipoProyecto", value ?? "")}
                    disabled={submitting}
                    className="w-full"
                    placeholder="Selecciona tipo de proyecto"
                    options={[
                      { value: "OBRA_NUEVA", label: "Obra nueva" },
                      { value: "AMPLIACION", label: "Ampliación" },
                      { value: "MANTENCION", label: "Mantención" },
                      { value: "LICITACION", label: "Licitación" },
                      { value: "REQUERIMIENTO_TECNICO", label: "Requerimiento técnico" },
                      { value: "OTRO", label: "Otro" },
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor="funnel-empresaMandante" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Empresa mandante / contratista / subcontratista
                  </label>
                  <input
                    id="funnel-empresaMandante"
                    type="text"
                    value={draft.empresaMandante}
                    onChange={(e) => onFieldChange("empresaMandante", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    placeholder="Nombre de la empresa"
                  />
                </div>
                <div>
                  <label htmlFor="funnel-oficinaTecnicaAsignada" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Oficina técnica asignada
                  </label>
                  <input
                    id="funnel-oficinaTecnicaAsignada"
                    type="text"
                    value={draft.oficinaTecnicaAsignada}
                    onChange={(e) => onFieldChange("oficinaTecnicaAsignada", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    placeholder="Oficina técnica asignada"
                  />
                </div>
                <div>
                  <label htmlFor="funnel-duracionEstimada" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Duración estimada
                  </label>
                  <input
                    id="funnel-duracionEstimada"
                    type="text"
                    value={draft.duracionEstimada}
                    onChange={(e) => onFieldChange("duracionEstimada", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    placeholder="Ej: 2 semanas, 3 meses, 45 días"
                  />
                </div>
                <div>
                  <label htmlFor="funnel-estadoRevisionTecnica" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Estado de revisión técnica
                  </label>
                  <Select
                    id="funnel-estadoRevisionTecnica"
                    allowClear
                    value={draft.estadoRevisionTecnica || undefined}
                    onChange={(value) => onFieldChange("estadoRevisionTecnica", value ?? "")}
                    disabled={submitting}
                    className="w-full"
                    placeholder="Selecciona estado"
                    options={[
                      { value: "PENDIENTE", label: "Pendiente" },
                      { value: "EN_REVISION", label: "En revisión" },
                      { value: "APROBADA", label: "Aprobada" },
                      { value: "RECHAZADA", label: "Rechazada" },
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor="funnel-estadoDocumentacionVenta" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Estado de documentación de venta
                  </label>
                  <Select
                    id="funnel-estadoDocumentacionVenta"
                    allowClear
                    value={draft.estadoDocumentacionVenta || undefined}
                    onChange={(value) => onFieldChange("estadoDocumentacionVenta", value ?? "")}
                    disabled={submitting}
                    className="w-full"
                    placeholder="Selecciona estado"
                    options={[
                      { value: "PENDIENTE", label: "Pendiente" },
                      { value: "EN_REVISION", label: "En revisión" },
                      { value: "COMPLETA", label: "Completa" },
                      { value: "INCOMPLETA", label: "Incompleta" },
                      { value: "NO_APLICA", label: "No aplica" },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="funnel-necesidadLevantamiento"
                    checked={draft.necesidadLevantamiento === "true"}
                    onChange={(checked) => onFieldChange("necesidadLevantamiento", String(checked))}
                    disabled={submitting}
                  />
                  <label htmlFor="funnel-necesidadLevantamiento" className="text-xs font-medium text-slate-600 cursor-pointer">
                    Necesidad de levantamiento en terreno
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="funnel-esReactivacion"
                    checked={draft.esReactivacion === "true"}
                    onChange={(checked) => onFieldChange("esReactivacion", String(checked))}
                    disabled={submitting}
                  />
                  <label htmlFor="funnel-esReactivacion" className="text-xs font-medium text-slate-600 cursor-pointer">
                    Cliente antiguo reactivado
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="funnel-garantiasRequeridas" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Garantías requeridas
                  </label>
                  <Input.TextArea
                    id="funnel-garantiasRequeridas"
                    value={draft.garantiasRequeridas}
                    onChange={(e) => onFieldChange("garantiasRequeridas", e.target.value)}
                    disabled={submitting}
                    rows={3}
                    placeholder="Descripción de garantías requeridas"
                  />
                </div>
              </div>
            </div>

            {/* PRIMER CONTACTO */}
            <div className="border-t border-beck-border-light pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                Primer contacto
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="funnel-fecha-primer-contacto" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Fecha primer contacto
                  </label>
                  <input
                    id="funnel-fecha-primer-contacto"
                    type="date"
                    value={draft.fechaPrimerContacto}
                    onChange={(e) => onFieldChange("fechaPrimerContacto", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                  />
                </div>
                <div>
                  <label htmlFor="funnel-tipo-contacto" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Tipo contacto
                  </label>
                  <select
                    id="funnel-tipo-contacto"
                    value={draft.tipoContacto}
                    onChange={(e) => onFieldChange("tipoContacto", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="llamada">Llamada</option>
                    <option value="email">Email</option>
                    <option value="visita">Visita</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="reunion_virtual">Reunion virtual</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="funnel-tipo-cliente" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Tipo cliente
                  </label>
                  <select
                    id="funnel-tipo-cliente"
                    value={draft.tipoCliente}
                    onChange={(e) => onFieldChange("tipoCliente", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="nuevo">Nuevo</option>
                    <option value="recurrente">Recurrente</option>
                    <option value="referido">Referido</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="funnel-timing-estimado" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Timing estimado
                  </label>
                  <input
                    id="funnel-timing-estimado"
                    type="text"
                    value={draft.timingEstimado}
                    onChange={(e) => onFieldChange("timingEstimado", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    placeholder="Ej: 3 meses"
                  />
                </div>
                <div>
                  <label htmlFor="funnel-nivel-interes" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Nivel de interes
                  </label>
                  <select
                    id="funnel-nivel-interes"
                    value={draft.nivelInteres}
                    onChange={(e) => onFieldChange("nivelInteres", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                  >
                    <option value="">Selecciona nivel</option>
                    <option value="alto">Alto</option>
                    <option value="medio">Medio</option>
                    <option value="bajo">Bajo</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="funnel-proxima-accion" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Proxima accion
                    {draft.etapa !== "cerrada" && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    id="funnel-proxima-accion"
                    type="text"
                    value={draft.proximaAccion}
                    onChange={(e) => onFieldChange("proximaAccion", e.target.value)}
                    disabled={submitting}
                    className={getFieldClassName("proximaAccion")}
                    placeholder="Describe la proxima accion"
                    aria-invalid={Boolean(fieldErrors.proximaAccion)}
                  />
                  {renderFieldError("proximaAccion")}
                </div>
                <div>
                  <label htmlFor="funnel-fecha-proxima-accion" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Fecha proxima accion
                    {draft.etapa !== "cerrada" && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    id="funnel-fecha-proxima-accion"
                    type="date"
                    value={draft.fechaProximaAccion}
                    onChange={(e) => onFieldChange("fechaProximaAccion", e.target.value)}
                    disabled={submitting}
                    className={getFieldClassName("fechaProximaAccion")}
                    aria-invalid={Boolean(fieldErrors.fechaProximaAccion)}
                  />
                  {renderFieldError("fechaProximaAccion")}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="funnel-necesidad-detectada" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Necesidad detectada
                  </label>
                  <textarea
                    id="funnel-necesidad-detectada"
                    value={draft.necesidadDetectada}
                    onChange={(e) => onFieldChange("necesidadDetectada", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    rows={2}
                    placeholder="Describe la necesidad del cliente"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="funnel-comentarios" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Comentarios
                  </label>
                  <textarea
                    id="funnel-comentarios"
                    value={draft.comentariosPrimerContacto}
                    onChange={(e) => onFieldChange("comentariosPrimerContacto", e.target.value)}
                    disabled={submitting}
                    className={`${inputClassName} ${disabledInputClassName}`}
                    rows={2}
                    placeholder="Comentarios adicionales"
                  />
                </div>
              </div>
            </div>
            </>
            )}
            </>
            )}

            {showVisitaSection && (
              <div id="funnel-section-visita" className="border-t border-beck-border-light pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                  Visita / levantamiento técnico
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderTextInput("fechaVisita", "Fecha visita", { type: "date" })}
                  {renderResponsableTecnicoSelect()}
                  {renderTextInput("asistentes", "Asistentes")}
                  {renderTextInput("lugarVisita", "Lugar visita")}
                  {renderTextarea("antecedentesLevantados", "Antecedentes levantados")}
                  {renderTextInput("basesTecnicas", "Bases técnicas")}
                  {renderTextInput("especificaciones", "Especificaciones")}
                  {renderTextInput("fechaProximaAccion", "Fecha próxima acción", { type: "date", required: draft.etapa !== "cerrada" })}
                  {renderArchivoUploaders(visitaArchivoConfigs)}
                  {renderTextarea("observacionesTecnicas", "Observaciones técnicas")}
                  {renderBooleanSwitch("necesidadOficinaTecnica", "¿Requiere oficina técnica?")}
                  {draft.necesidadOficinaTecnica === "true" && (
                    <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Typography.Text className="text-sm text-amber-800">
                          Esta oportunidad requiere revisión de oficina técnica antes de avanzar.
                        </Typography.Text>
                        <Button
                          type="primary"
                          onClick={() => setOficinaTecnicaModalOpen(true)}
                        >
                          Crear solicitud oficina técnica
                        </Button>
                      </div>
                    </div>
                  )}
                  {renderTextarea("proximosPasos", "Próximos pasos")}
                </div>
              </div>
            )}

            {showDesarrolloSection && (
              <div id="funnel-section-desarrollo" className="border-t border-beck-border-light pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                  Desarrollo de propuesta
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderSimpleSelect("estadoDesarrolloPropuesta", "Estado desarrollo propuesta", estadoDesarrolloPropuestaOptions)}
                  {renderTextarea("informacionPendiente", "Información pendiente")}
                  {renderArchivoUploaders(desarrolloArchivoConfigs)}
                  {renderSimpleSelect("riesgoTecnico", "Riesgo técnico", riesgoTecnicoOptions)}
                  {renderTextarea("condicionesEspeciales", "Condiciones especiales")}
                  {renderBooleanSwitch("necesidadValidacionGerencial", "¿Requiere validación gerencial?")}
                  {renderTextInput("fechaComprometidaEnvio", "Fecha comprometida envío", { type: "date" })}
                  {renderTextarea("comentariosInternos", "Comentarios internos")}
                </div>
              </div>
            )}

            {showNegociacionSection && (
              <div id="funnel-section-negociacion" className="border-t border-beck-border-light pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                  Propuesta enviada / negociación
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderTextInput("fechaEnvioPropuesta", "Fecha envío propuesta", { type: "date" })}
                  {renderTextInput("versionPropuesta", "Versión propuesta")}
                  {renderTextInput("numeroPropuesta", "Número propuesta")}
                  {renderTextInput("montoPropuesto", "Monto propuesto", { type: "number", placeholder: "Ej: 1500000" })}
                  {renderTextInput("fechaVencimientoPropuesta", "Fecha vencimiento propuesta", { type: "date" })}
                  <div>
                    <label htmlFor="funnel-probabilidad-cierre" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Probabilidad cierre (%)
                    </label>
                    <input
                      id="funnel-probabilidad-cierre"
                      type="number"
                      min="0"
                      max="100"
                      value={draft.probabilidadCierre}
                      onChange={(e) => onFieldChange("probabilidadCierre", e.target.value)}
                      disabled={submitting}
                      className={`${inputClassName} ${disabledInputClassName}`}
                      placeholder="0-100"
                    />
                  </div>
                  {renderTextarea("comentariosCliente", "Comentarios cliente")}
                  <div className="md:col-span-2">
                    <label htmlFor="funnel-objeciones" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Objeciones
                    </label>
                    <textarea
                      id="funnel-objeciones"
                      value={draft.objeciones}
                      onChange={(e) => onFieldChange("objeciones", e.target.value)}
                      disabled={submitting}
                      className={`${inputClassName} ${disabledInputClassName}`}
                      rows={2}
                      placeholder="Objeciones del cliente"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="funnel-contrapropuestas" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Contrapropuestas
                    </label>
                    <textarea
                      id="funnel-contrapropuestas"
                      value={draft.contrapropuestas}
                      onChange={(e) => onFieldChange("contrapropuestas", e.target.value)}
                      disabled={submitting}
                      className={`${inputClassName} ${disabledInputClassName}`}
                      rows={2}
                      placeholder="Contrapropuestas planteadas"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="funnel-ajustes-solicitados" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Ajustes solicitados
                    </label>
                    <textarea
                      id="funnel-ajustes-solicitados"
                      value={draft.ajustesSolicitados}
                      onChange={(e) => onFieldChange("ajustesSolicitados", e.target.value)}
                      disabled={submitting}
                      className={`${inputClassName} ${disabledInputClassName}`}
                      rows={2}
                      placeholder="Ajustes solicitados por el cliente"
                    />
                  </div>
                </div>
              </div>
            )}

            {showDocumentacionSection && (
              <div id="funnel-section-documentacion" className="border-t border-beck-border-light pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                  Documentación de venta
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderTextInput("ordenCompra", "Orden compra")}
                  {renderTextInput("contrato", "Contrato")}
                  {renderTextInput("correoAceptacion", "Correo de aceptación del cliente")}
                  {renderTextInput("anticipo", "Anticipo")}
                  {renderArchivoUploaders(documentacionArchivoConfigs)}
                  {renderTextInput("aprobacionInternaCliente", "Aprobación interna cliente")}
                  {renderTextInput("condicionesPago", "Condiciones pago")}
                  {renderTextarea("documentosAdministrativosPendientes", "Documentos administrativos pendientes")}
                  {renderTextInput("responsableAdministrativo", "Responsable administrativo")}
                  {renderTextInput("fechaFirma", "Fecha firma", { type: "date" })}
                  {renderTextInput("fechaInicioProyecto", "Fecha inicio proyecto", { type: "date" })}
                  <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Traspaso a operaciones
                        </p>
                        <p className="text-xs text-slate-500">
                          Registro de entrega al equipo operativo.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        ¿Traspasado a operaciones?
                        <Switch
                          checked={draft.traspasadoOperaciones === "true"}
                          disabled={submitting}
                          onChange={(checked) =>
                            onFieldChange("traspasadoOperaciones", String(checked))
                          }
                        />
                      </label>
                    </div>
                    {draft.traspasadoOperaciones === "true" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {renderTextInput("fechaTraspasoOperaciones", "Fecha traspaso operaciones", { type: "date" })}
                        {renderTextInput("responsableTraspasoOperaciones", "Responsable receptor")}
                        {renderTextarea("observacionesTraspasoOperaciones", "Observaciones traspaso")}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Traspaso a administración
                        </p>
                        <p className="text-xs text-slate-500">
                          Registro de entrega al equipo administrativo.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        ¿Traspasado a administración?
                        <Switch
                          checked={draft.traspasadoAdministracion === "true"}
                          disabled={submitting}
                          onChange={(checked) =>
                            onFieldChange("traspasadoAdministracion", String(checked))
                          }
                        />
                      </label>
                    </div>
                    {draft.traspasadoAdministracion === "true" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {renderTextInput("fechaTraspasoAdministracion", "Fecha traspaso administración", { type: "date" })}
                        {renderTextInput("responsableTraspasoAdministracion", "Responsable administrativo receptor")}
                        {renderTextarea("observacionesTraspasoAdministracion", "Observaciones")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showCierreSection && (
              <div id="funnel-section-cierre" className="border-t border-beck-border-light pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beck-muted">
                  Cierre de oportunidad
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderTextInput("montoFinalGanado", "Monto final ganado", {
                    type: "number",
                    placeholder: "Ej: 1500000",
                    required: draft.etapa === "cerrada",
                  })}
                  {renderTextInput("fechaCierre", "Fecha cierre", {
                    type: "date",
                    required: draft.etapa === "cerrada",
                  })}
                  {renderTextInput("documentoRespaldo", "Documento respaldo", {
                    required: draft.etapa === "cerrada",
                  })}
                  {renderArchivoUploaders(cierreArchivoConfigs)}
                  {renderFlujoPosteriorSelect()}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-beck-border-light pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="beck-btn-secondary"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="beck-btn-primary"
              >
                {submitting
                  ? mode === "create"
                    ? "Creando..."
                    : "Guardando..."
                  : mode === "create"
                    ? "Crear oportunidad"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
          {renderOficinaTecnicaModal()}
        </div>
      </div>
    );
  };

  type BeckBloqueoException = Error & {
    bloqueos: string[];
    advertencias: string[];
    beckBloqueo: boolean;
  };

  type ValidationMessageGroup = {
    etapa: string;
    messages: string[];
  };

  const VALIDATION_DETAIL_INLINE_LIMIT = 5;

  const isBeckBloqueoException = (e: unknown): e is BeckBloqueoException =>
    e instanceof Error && (e as BeckBloqueoException).beckBloqueo === true;

  const BLOQUEO_KEYS = ["bloqueos", "bloqueantes"];
  const ADVERTENCIA_KEYS = ["advertencias", "advertenciasCamposCriticos"];

  const pickStringArray = (
    source: Record<string, unknown> | null | undefined,
    keys: string[]
  ): string[] => {
    if (!source) return [];
    const combined: string[] = [];
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        combined.push(...(value.filter((v): v is string => typeof v === "string")));
      }
    }
    return combined;
  };

  const isBeckBloqueoAxiosError = (err: unknown): boolean => {
    const e = err as { response?: { status?: number; data?: Record<string, unknown> } };
    return (
      e?.response?.status === 409 &&
      pickStringArray(e?.response?.data, BLOQUEO_KEYS).length > 0 &&
      e?.response?.data?.puedeAvanzar === false
    );
  };

  const getBeckBloqueosFromAxiosError = (err: unknown): string[] => {
    const e = err as { response?: { data?: Record<string, unknown> } };
    return pickStringArray(e?.response?.data, BLOQUEO_KEYS);
  };

  const getBeckAdvertenciasFromBloqueoAxiosError = (err: unknown): string[] => {
    const e = err as { response?: { data?: Record<string, unknown> } };
    return pickStringArray(e?.response?.data, ADVERTENCIA_KEYS);
  };

  const formatAdvertenciaMessage = (message: string): string => {
    const text = message.trim();
    const campoMatch = text.match(/^El campo\s+(.+?)\s+es obligatori[oa](.*)$/i);

    if (campoMatch) {
      return `Falta completar ${campoMatch[1]}${campoMatch[2]}`.trim();
    }

    const requiredMatch = text.match(/^(El|La)\s+(.+?)\s+es obligatori[oa](.*)$/i);

    if (requiredMatch) {
      return `Falta completar ${requiredMatch[1].toLowerCase()} ${requiredMatch[2]}${requiredMatch[3]}`.trim();
    }

    return text
      .replace(/\bobligatorios\b/gi, "pendientes")
      .replace(/\bobligatorias\b/gi, "pendientes")
      .replace(/\bobligatorio\b/gi, "pendiente")
      .replace(/\bobligatoria\b/gi, "pendiente");
  };

  const splitValidationMessageStage = (
    message: string
  ): { etapa: string; message: string; hasStagePrefix: boolean } => {
    const trimmed = message.trim();
    const match = trimmed.match(/^\[([^\]]+)\]\s*(.+)$/);

    if (!match) {
      return { etapa: "General", message: trimmed, hasStagePrefix: false };
    }

    return {
      etapa: match[1].trim() || "General",
      message: match[2].trim(),
      hasStagePrefix: true,
    };
  };

  const groupValidationMessages = (
    messages: string[],
    formatter: (message: string) => string = (message) => message
  ): ValidationMessageGroup[] => {
    const groups = new Map<string, string[]>();

    messages.forEach((message) => {
      const parsed = splitValidationMessageStage(message);
      const formattedMessage = formatter(parsed.message);
      const current = groups.get(parsed.etapa) ?? [];
      current.push(formattedMessage);
      groups.set(parsed.etapa, current);
    });

    return Array.from(groups.entries()).map(([etapa, groupedMessages]) => ({
      etapa,
      messages: groupedMessages,
    }));
  };

  const groupPrefixedValidationMessages = (
    messages: string[]
  ): ValidationMessageGroup[] => {
    const groups = new Map<string, string[]>();

    messages.forEach((message) => {
      const parsed = splitValidationMessageStage(message);
      if (!parsed.hasStagePrefix) return;
      const current = groups.get(parsed.etapa) ?? [];
      current.push(parsed.message);
      groups.set(parsed.etapa, current);
    });

    return Array.from(groups.entries()).map(([etapa, groupedMessages]) => ({
      etapa,
      messages: groupedMessages,
    }));
  };

  const FunnelPage: React.FC<FunnelPageProps> = ({
    themeMode,
    alertaBell,
    embedUnidadNegocio,
    embedEstadoCierre,
    onVisibleCountChange,
  }) => {
    void themeMode;

    const navigate = useNavigate();
    const location = useLocation();
    const pendingOportunidadId = useRef<string | null>(null);
    const lastOpenedAlertTs = useRef<number | null>(null);
    const { canEdit, canView } = usePermisos();
    const { user } = useAuth();
    const isAdminGlobal = user?.rol === "Administrador";
    const canCambiarEmpresaBeckOperar =
      canView("beck_cambiar_empresa") || canEdit("beck_cambiar_empresa");
    const canEditFunnel =
      isAdminGlobal || canCambiarEmpresaBeckOperar || canEdit("beck_funnel");
    const canManageGanancia = canEditFunnel;
    const canViewFirematFunnel = canView("firemat_funnel") || canEdit("firemat_funnel");
    const canEditFirematFunnel = canEdit("firemat_funnel");
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      })
    );

    const [deals, setDeals] = useState<FunnelDeal[]>([]);
    const [activeDragDeal, setActiveDragDeal] = useState<FunnelDeal | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewModeInterno, setViewMode] = useState<"kanban" | "calendar" | "dashboard">("kanban");
    const viewMode = embedUnidadNegocio ? "kanban" : viewModeInterno;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [funnelModalMode, setFunnelModalMode] = useState<"create" | "edit">("create");
    const [editingDealId, setEditingDealId] = useState<string | null>(null);
    const [initialEditSection, setInitialEditSection] =
      useState<FunnelEditSection | null>(null);
    const [editVisibleSections, setEditVisibleSections] =
      useState<FunnelEditSection[] | null>(null);
    const [dealSaving, setDealSaving] = useState(false);
    const [dealDeletingId, setDealDeletingId] = useState<string | null>(null);
    const submitLockRef = useRef(false);
    const [draft, setDraft] = useState<FunnelDraft>(createEmptyDraft);
    const [fieldErrors, setFieldErrors] = useState<FunnelFieldErrors>({});
    const [showValidationSummary, setShowValidationSummary] = useState(false);
    const [cierreModalOpen, setCierreModalOpen] = useState(false);
    const [dealEnCierre, setDealEnCierre] = useState<string | null>(null);
    const [estadoCierreModal, setEstadoCierreModal] = useState<
      "ganada" | "perdida" | "postergada" | ""
    >("");
    const [motivoPerdidaModal, setMotivoPerdidaModal] = useState("");
    const [etapaPerdidaModal, setEtapaPerdidaModal] = useState("");
    const [motivoPostergacionModal, setMotivoPostergacionModal] = useState("");
    const [fechaReactivacionModal, setFechaReactivacionModal] = useState("");
    const [documentoRespaldoModal, setDocumentoRespaldoModal] = useState("");
    const [flujoPosteriorModal, setFlujoPosteriorModal] = useState("");
    const [montoFinalGanadoModal, setMontoFinalGanadoModal] = useState("");
    const [fechaCierreModal, setFechaCierreModal] = useState("");
    const [ufActual, setUfActual] = useState<number | null>(null);
    const [dolarActual, setDolarActual] = useState<number | null>(null);
    const [ufFecha, setUfFecha] = useState<string | null>(null);
    const [selectedDeal, setSelectedDeal] = useState<FunnelDeal | null>(null);
    const [fullDetailOpen, setFullDetailOpen] = useState(false);
    const [historialEtapas, setHistorialEtapas] = useState<HistorialFunnelBeckEvento[]>([]);
    const [historialEtapasLoading, setHistorialEtapasLoading] = useState(false);
    const [historialEtapasError, setHistorialEtapasError] = useState<string | null>(null);
    const [cambiarVendedorModalOpen, setCambiarVendedorModalOpen] = useState(false);
    const [cambiarVendedorValue, setCambiarVendedorValue] = useState<string | undefined>(undefined);
    const [cambiarVendedorSaving, setCambiarVendedorSaving] = useState(false);
    const [archivosFunnel, setArchivosFunnel] = useState<FunnelBeckArchivo[]>([]);
    const [archivosFunnelLoading, setArchivosFunnelLoading] = useState(false);
    const [relatedCotizaciones, setRelatedCotizaciones] = useState<
      FunnelCotizacionItem[]
    >([]);
    const [relatedCotizacionesLoading, setRelatedCotizacionesLoading] =
      useState(false);
    const [selectedCotizacion, setSelectedCotizacion] =
      useState<FunnelCotizacionItem | null>(null);
    const [selectedCotizacionLoading, setSelectedCotizacionLoading] =
      useState(false);
    const [cotizacionEditorOpen, setCotizacionEditorOpen] = useState(false);
    const [cotizacionEditorMode, setCotizacionEditorMode] = useState<
      "create" | "edit"
    >("create");
    const [editingCotizacion, setEditingCotizacion] =
      useState<FunnelCotizacionItem | null>(null);
    const [cotizacionSaving, setCotizacionSaving] = useState(false);
    const [cotizacionEditorLockedFunnel, setCotizacionEditorLockedFunnel] =
      useState(false);
    const [cotizacionEditorContextDeal, setCotizacionEditorContextDeal] =
      useState<FunnelDeal | null>(null);
    const [cotizacionEditorLoading, setCotizacionEditorLoading] = useState(false);
    const [cotizacionVersionesById, setCotizacionVersionesById] = useState<
      Record<string, FunnelCotizacionItem[]>
    >({});
    const [updatingStage, setUpdatingStage] = useState(false);
    const [cierreEstadoOpen, setCierreEstadoOpen] = useState(false);
    const [cierreEstadoStep, setCierreEstadoStep] = useState<"" | "perdida" | "postergada">("");
    const [cierreEstadoSelectMotivo, setCierreEstadoSelectMotivo] = useState("");
    const [cierreEstadoDetalleOtro, setCierreEstadoDetalleOtro] = useState("");
    const [cierreEstadoObservacion, setCierreEstadoObservacion] = useState("");
    const [cierreEstadoFechaReactivacion, setCierreEstadoFechaReactivacion] = useState("");
    const [cierreEstadoSaving, setCierreEstadoSaving] = useState(false);
    const [clienteBeckSearch, setClienteBeckSearch] = useState("");
    const [clienteBeckResults, setClienteBeckResults] = useState<ClienteBeck[]>([]);
    const [clienteBeckSearching, setClienteBeckSearching] = useState(false);
    const [selectedClienteBeck, setSelectedClienteBeck] = useState<ClienteBeck | null>(null);
    const [clientesDisponibles, setClientesDisponibles] = useState<ClienteBeck[]>([]);
    const [clientesLoading, setClientesLoading] = useState(false);
    const [jefesObra, setJefesObra] = useState<UsuarioResumen[]>([]);
    const [jefesObraLoading, setJefesObraLoading] = useState(false);
    const [usuariosComerciales, setUsuariosComerciales] = useState<UsuarioResumen[]>([]);
    const [usuariosComercialesLoading, setUsuariosComercialesLoading] = useState(false);
    const [asignarJefeModalOpen, setAsignarJefeModalOpen] = useState(false);
    const [jefeObraAsignado, setJefeObraAsignado] = useState("");
    const [asignandoJefeObra, setAsignandoJefeObra] = useState(false);
    const [exportandoExcel, setExportandoExcel] = useState(false);
    const [filterUnidadNegocioInterno, setFilterUnidadNegocio] = useState<string>("Beck");
    const [filterEstadoCierreInterno, setFilterEstadoCierre] = useState<string>("");
    const filterUnidadNegocio = embedUnidadNegocio ?? filterUnidadNegocioInterno;
    const filterEstadoCierre = embedEstadoCierre ?? filterEstadoCierreInterno;

    const canOperateFiremat =
      (filterUnidadNegocio === "Firemat" || filterUnidadNegocio === "Todas") &&
      canEditFirematFunnel;

    const [firematEmbedId, setFirematEmbedId] = useState<string | null>(null);

    const visibleDeals = useMemo(() => {
      let result = deals;

      if (filterUnidadNegocio === "Beck" || filterUnidadNegocio === "Mixto") {
        result = result.filter((d) => d.unidadNegocio === filterUnidadNegocio);
      } else if (filterUnidadNegocio === "__sin_unidad__") {
        result = result.filter((d) => !d.unidadNegocio);
      }

      if (filterEstadoCierre === "activas") {
        result = result.filter(
          (d) =>
            !d.estadoCierre ||
            (d.estadoCierre !== "ganada" &&
              d.estadoCierre !== "perdida" &&
              d.estadoCierre !== "postergada" &&
              d.estadoCierre !== "descartada")
        );
      } else if (filterEstadoCierre === "ganadas") {
        result = result.filter((d) => d.estadoCierre === "ganada");
      } else if (filterEstadoCierre === "perdidas") {
        result = result.filter((d) => d.estadoCierre === "perdida");
      } else if (filterEstadoCierre === "postergadas") {
        result = result.filter((d) => d.estadoCierre === "postergada");
      } else if (filterEstadoCierre === "descartadas") {
        result = result.filter((d) => d.estadoCierre === "descartada");
      }

      return result;
    }, [deals, filterUnidadNegocio, filterEstadoCierre]);

    useEffect(() => {
      onVisibleCountChange?.(visibleDeals.length);
    }, [visibleDeals, onVisibleCountChange]);

    const [bloqueoModalOpen, setBloqueoModalOpen] = useState(false);
    const [bloqueoBloqueos, setBloqueoBloqueos] = useState<string[]>([]);
    const [bloqueoAdvertencias, setBloqueoAdvertencias] = useState<string[]>([]);
    const [bloqueoDetalleVisible, setBloqueoDetalleVisible] = useState(false);
    const [advertenciasGuardadoOpen, setAdvertenciasGuardadoOpen] = useState(false);
    const [advertenciasGuardado, setAdvertenciasGuardado] = useState<string[]>([]);

    const [firematBloqueoOpen, setFirematBloqueoOpen] = useState(false);
    const [firematBloqueoBloqueos, setFirematBloqueoBloqueos] = useState<string[]>([]);
    const [firematBloqueoAdvertencias, setFirematBloqueoAdvertencias] = useState<string[]>([]);
    const [firematBloqueoObservacion, setFirematBloqueoObservacion] = useState("");
    const [firematBloqueoRetrying, setFirematBloqueoRetrying] = useState(false);
    const [firematBloqueoPendiente, setFirematBloqueoPendiente] = useState<{
      firematId: string;
      nuevaEtapa: FirematFunnelEtapa;
    } | null>(null);

    void ufFecha;

    useEffect(() => {
      if (!bloqueoModalOpen) return;
      setBloqueoDetalleVisible(
        bloqueoBloqueos.length + bloqueoAdvertencias.length <=
          VALIDATION_DETAIL_INLINE_LIMIT
      );
    }, [bloqueoModalOpen, bloqueoBloqueos.length, bloqueoAdvertencias.length]);

    const parsedDraftValue = draft.valorEstimado.trim()
      ? Number(draft.valorEstimado)
      : undefined;

    const conversionReferencia =
      typeof parsedDraftValue === "number" &&
      Number.isFinite(parsedDraftValue) &&
      parsedDraftValue > 0
        ? (() => {
            const referencias: string[] = [];

            const tieneUf =
              typeof ufActual === "number" &&
              Number.isFinite(ufActual) &&
              ufActual > 0;

            const tieneDolar =
              typeof dolarActual === "number" &&
              Number.isFinite(dolarActual) &&
              dolarActual > 0;

            if (draft.moneda === "CLP") {
              if (tieneUf) {
                referencias.push(
                  `Equivale a ${formatEstimatedValue(
                    parsedDraftValue / ufActual,
                    "UF"
                  )}`
                );
              }

              if (tieneDolar) {
                referencias.push(
                  `Equivale a ${formatEstimatedValue(
                    parsedDraftValue / dolarActual,
                    "USD"
                  )}`
                );
              }
            }

            if (draft.moneda === "UF" && tieneUf) {
              const valorClp = parsedDraftValue * ufActual;

              referencias.push(
                `Equivale a ${formatEstimatedValue(valorClp, "CLP")}`
              );

              if (tieneDolar) {
                referencias.push(
                  `Equivale a ${formatEstimatedValue(
                    valorClp / dolarActual,
                    "USD"
                  )}`
                );
              }
            }

            if (draft.moneda === "USD" && tieneDolar) {
              const valorClp = parsedDraftValue * dolarActual;

              referencias.push(
                `Equivale a ${formatEstimatedValue(valorClp, "CLP")}`
              );

              if (tieneUf) {
                referencias.push(
                  `Equivale a ${formatEstimatedValue(
                    valorClp / ufActual,
                    "UF"
                  )}`
                );
              }
            }

            return referencias.length > 0 ? referencias.join(" | ") : null;
          })()
        : null;

    useEffect(() => {
      if (!showValidationSummary) {
        return;
      }

      setFieldErrors(validateFunnelDraft(draft));
    }, [draft, showValidationSummary]);

    const etapaBackendMap: Record<string, FunnelStage> = {
      prospecto_identificado: "prospecto",
      visita_levantamiento: "visita",
      cotizacion_elaborada: "cotizacion",
      cotizacion_enviada: "enviada",
      en_negociacion: "negociacion",
      documentacion_venta: "documentacion",
      cerrada: "cerrada",
    };

    const etapaFrontendToBackendMap: Record<FunnelStage, string> = {
      prospecto: "prospecto_identificado",
      visita: "visita_levantamiento",
      cotizacion: "cotizacion_elaborada",
      enviada: "cotizacion_enviada",
      negociacion: "en_negociacion",
      documentacion: "documentacion_venta",
      cerrada: "cerrada",
    };

    const fuenteLeadFrontendToBackendMap: Record<FunnelLeadSource, string> = {
      Web: "web",
      Referido: "referido",
      Llamada: "llamada",
      "Cliente recurrente": "cliente_recurrente",
      Prospeccion: "prospeccion",
      Otro: "otro",
    };

    const fuenteLeadBackendToFrontendMap: Record<string, FunnelLeadSource> = {
      web: "Web",
      referido: "Referido",
      llamada: "Llamada",
      cliente_recurrente: "Cliente recurrente",
      prospeccion: "Prospeccion",
      otro: "Otro",
    };

    const mapOpportunityToDeal = (item: Record<string, unknown>): FunnelDeal => {
      const monedaOriginalValue = toText(item.monedaOriginal, "CLP");
      const monedaOriginal: FunnelCurrency =
        monedaOriginalValue === "CLP" ||
        monedaOriginalValue === "UF" ||
        monedaOriginalValue === "USD"
          ? monedaOriginalValue
          : "CLP";
      const fuenteLead = toText(item.fuenteLead, "");
      const fuenteLeadNormalizada =
        fuenteLeadBackendToFrontendMap[fuenteLead] ??
        (leadSourceOptions.includes(fuenteLead as FunnelLeadSource)
          ? (fuenteLead as FunnelLeadSource)
          : undefined);
      const valorOriginal = toNumber(item.valorOriginal);
      const fechaProbableCierre = toText(item.fechaProbableCierre, "");

      const probCierre = toNumber(item.probabilidadCierre);
      const estadoCierreRaw = toText(item.estadoCierre, "").toLowerCase();
      const estadoCierre: FunnelEstadoCierre | undefined =
        estadoCierreRaw === "ganada" ||
        estadoCierreRaw === "perdida" ||
        estadoCierreRaw === "postergada"
          ? estadoCierreRaw
          : undefined;

      const etapaTableroRaw = toText(item.etapaTablero, "");
      const etapaTablero: FunnelStage | undefined = etapaTableroRaw
        ? (etapaBackendMap[etapaTableroRaw] ?? undefined)
        : undefined;

      return {
        id: toText(item.id),
        nombreProyecto: toText(item.nombreProyecto),
        empresa: toText(item.empresa, "") || undefined,
        valorEstimado: valorOriginal > 0 ? valorOriginal : undefined,
        moneda: monedaOriginal,
        fechaProbableCierre: fechaProbableCierre
          ? fechaProbableCierre.slice(0, 10)
          : undefined,
        vendedor: toText(item.vendedor, "") || undefined,
        region: toText(item.region, "") || undefined,
        comuna: toText(item.comuna, "") || undefined,
        fuenteLead: fuenteLeadNormalizada,
        etapa: etapaBackendMap[toText(item.etapa)] ?? "prospecto",
        rutEmpresa: toText(item.rutEmpresa, "") || undefined,
        nombreContacto: toText(item.nombreContacto, "") || undefined,
        cargoContacto: toText(item.cargoContacto, "") || undefined,
        telefonoContacto: toText(item.telefonoContacto, "") || undefined,
        correoContacto: toText(item.correoContacto, "") || undefined,
        tipoCliente: toText(item.tipoCliente, "") || undefined,
        tipoOportunidad: toText(item.tipoOportunidad, "") || undefined,
        fechaPrimerContacto: toText(item.fechaPrimerContacto, "")
          ? toText(item.fechaPrimerContacto, "").slice(0, 10)
          : undefined,
        tipoContacto: toText(item.tipoContacto, "") || undefined,
        necesidadDetectada: toText(item.necesidadDetectada, "") || undefined,
        timingEstimado: toText(item.timingEstimado, "") || undefined,
        nivelInteres: toText(item.nivelInteres, "") || undefined,
        proximaAccion: toText(item.proximaAccion, "") || undefined,
        fechaProximaAccion: toText(item.fechaProximaAccion, "")
          ? toText(item.fechaProximaAccion, "").slice(0, 10)
          : undefined,
        fechaVisita: toText(item.fechaVisita, "")
          ? toText(item.fechaVisita, "").slice(0, 10)
          : undefined,
        responsableTecnico: toText(item.responsableTecnico, "") || undefined,
        asistentes: toText(item.asistentes, "") || undefined,
        lugarVisita: toText(item.lugarVisita, "") || undefined,
        antecedentesLevantados:
          toText(item.antecedentesLevantados, "") || undefined,
        documentosRecibidos: toText(item.documentosRecibidos, "") || undefined,
        planos: toText(item.planos, "") || undefined,
        basesTecnicas: toText(item.basesTecnicas, "") || undefined,
        especificaciones: toText(item.especificaciones, "") || undefined,
        fotografias: toText(item.fotografias, "") || undefined,
        observacionesTecnicas:
          toText(item.observacionesTecnicas, "") || undefined,
        necesidadOficinaTecnica: toOptionalBoolean(
          item.necesidadOficinaTecnica
        ),
        proximosPasos: toText(item.proximosPasos, "") || undefined,
        estadoDesarrolloPropuesta:
          toText(item.estadoDesarrolloPropuesta, "") || undefined,
        informacionPendiente: toText(item.informacionPendiente, "") || undefined,
        documentosRequeridos:
          toText(item.documentosRequeridos, "") || undefined,
        riesgoTecnico: toText(item.riesgoTecnico, "") || undefined,
        condicionesEspeciales:
          toText(item.condicionesEspeciales, "") || undefined,
        necesidadValidacionGerencial: toOptionalBoolean(
          item.necesidadValidacionGerencial
        ),
        fechaComprometidaEnvio: toText(item.fechaComprometidaEnvio, "")
          ? toText(item.fechaComprometidaEnvio, "").slice(0, 10)
          : undefined,
        comentariosInternos: toText(item.comentariosInternos, "") || undefined,
        fechaEnvioPropuesta: toText(item.fechaEnvioPropuesta, "")
          ? toText(item.fechaEnvioPropuesta, "").slice(0, 10)
          : undefined,
        versionPropuesta: toText(item.versionPropuesta, "") || undefined,
        numeroPropuesta: toText(item.numeroPropuesta, "") || undefined,
        montoPropuesto:
          toNumber(item.montoPropuesto) > 0
            ? toNumber(item.montoPropuesto)
            : undefined,
        fechaVencimientoPropuesta: toText(item.fechaVencimientoPropuesta, "")
          ? toText(item.fechaVencimientoPropuesta, "").slice(0, 10)
          : undefined,
        comentariosCliente: toText(item.comentariosCliente, "") || undefined,
        probabilidadCierre: probCierre > 0 ? probCierre : undefined,
        objeciones: toText(item.objeciones, "") || undefined,
        contrapropuestas: toText(item.contrapropuestas, "") || undefined,
        ajustesSolicitados: toText(item.ajustesSolicitados, "") || undefined,
        ordenCompra: toText(item.ordenCompra, "") || undefined,
        contrato: toText(item.contrato, "") || undefined,
        correoAceptacion: toText(item.correoAceptacion, "") || undefined,
        anticipo: toText(item.anticipo, "") || undefined,
        aprobacionInternaCliente:
          toText(item.aprobacionInternaCliente, "") || undefined,
        condicionesPago: toText(item.condicionesPago, "") || undefined,
        documentosAdministrativosPendientes:
          toText(item.documentosAdministrativosPendientes, "") || undefined,
        responsableAdministrativo:
          toText(item.responsableAdministrativo, "") || undefined,
        fechaFirma: toText(item.fechaFirma, "")
          ? toText(item.fechaFirma, "").slice(0, 10)
          : undefined,
        fechaInicioProyecto: toText(item.fechaInicioProyecto, "")
          ? toText(item.fechaInicioProyecto, "").slice(0, 10)
          : undefined,
        traspasadoOperaciones: toOptionalBoolean(item.traspasadoOperaciones),
        fechaTraspasoOperaciones: toText(item.fechaTraspasoOperaciones, "")
          ? toText(item.fechaTraspasoOperaciones, "").slice(0, 10)
          : undefined,
        responsableTraspasoOperaciones:
          toText(item.responsableTraspasoOperaciones, "") || undefined,
        observacionesTraspasoOperaciones:
          toText(item.observacionesTraspasoOperaciones, "") || undefined,
        traspasadoAdministracion: toOptionalBoolean(item.traspasadoAdministracion),
        fechaTraspasoAdministracion: toText(item.fechaTraspasoAdministracion, "")
          ? toText(item.fechaTraspasoAdministracion, "").slice(0, 10)
          : undefined,
        responsableTraspasoAdministracion:
          toText(item.responsableTraspasoAdministracion, "") || undefined,
        observacionesTraspasoAdministracion:
          toText(item.observacionesTraspasoAdministracion, "") || undefined,
        estadoCierre,
        etapaTablero: etapaTablero ?? undefined,
        motivoPerdida: toText(item.motivoPerdida, "") || undefined,
        etapaPerdida: toText(item.etapaPerdida, "") || undefined,
        motivoPostergacion: toText(item.motivoPostergacion, "") || undefined,
        observacionCierre: toText(item.observacionCierre, "") || undefined,
        fechaReactivacion: toText(item.fechaReactivacion, "")
          ? toText(item.fechaReactivacion, "").slice(0, 10)
          : undefined,
        documentoRespaldo: toText(item.documentoRespaldo, "") || undefined,
        flujoPosterior: toText(item.flujoPosterior, "") || undefined,
        montoFinalGanado:
          toNumber(item.montoFinalGanado) > 0
            ? toNumber(item.montoFinalGanado)
            : undefined,
        fechaCierre: toText(item.fechaCierre, "")
          ? toText(item.fechaCierre, "").slice(0, 10)
          : undefined,
        clienteBeckId: toText(item.clienteBeckId, "") || null,
        contactoBeckId: toText(item.contactoBeckId, "") || null,
        clienteBeck: isObjectRecord(item.clienteBeck)
          ? (item.clienteBeck as unknown as ClienteBeck)
          : undefined,
        contactoBeck: isObjectRecord(item.contactoBeck)
          ? (item.contactoBeck as unknown as ContactoClienteBeck)
          : undefined,
        solicitudesOficinaTecnica: Array.isArray(item.solicitudesOficinaTecnica)
          ? (item.solicitudesOficinaTecnica as SolicitudOficinaTecnica[])
          : Array.isArray(item.solicitudes_oficina_tecnica)
            ? (item.solicitudes_oficina_tecnica as SolicitudOficinaTecnica[])
            : undefined,
        obra: isObjectRecord(item.obra)
          ? {
              id: toText(item.obra.id),
              nombre: toText(item.obra.nombre, "") || undefined,
              codigo: toText(item.obra.codigo, "") || undefined,
              estado: toText(item.obra.estado, "") || undefined,
              cliente: toText(item.obra.cliente, "") || undefined,
              direccion: toText(item.obra.direccion, "") || undefined,
            }
          : undefined,
        direccionProyecto: toText(item.direccionProyecto, "") || undefined,
        unidadNegocio: toText(item.unidadNegocio, "") || undefined,
        observaciones: toText(item.observaciones, "") || undefined,
        urgencia: toText(item.urgencia, "") || undefined,
        observacionCamposFaltantes: toText(item.observacionCamposFaltantes, "") || undefined,
        tipoProyecto: toText(item.tipoProyecto, "") || undefined,
        empresaMandante: toText(item.empresaMandante, "") || undefined,
        necesidadLevantamiento: toOptionalBoolean(item.necesidadLevantamiento),
        esReactivacion: toOptionalBoolean(item.esReactivacion),
        oficinaTecnicaAsignada: toText(item.oficinaTecnicaAsignada, "") || undefined,
        duracionEstimada: toText(item.duracionEstimada, "") || undefined,
        estadoRevisionTecnica: toText(item.estadoRevisionTecnica, "") || undefined,
        garantiasRequeridas: toText(item.garantiasRequeridas, "") || undefined,
        estadoDocumentacionVenta: toText(item.estadoDocumentacionVenta, "") || undefined,
        updatedAt: toText(item.updatedAt, "") || undefined,
      };
    };

    const isFunnelStageValue = (value: string): value is FunnelStage =>
      (etapas as string[]).includes(value);

    const FIREMAT_ETAPAS_VALIDAS: FirematFunnelEtapa[] = [
      "PROSPECTO",
      "PRIMER_CONTACTO",
      "DESARROLLO_COTIZACION",
      "COTIZACION_ENVIADA",
      "ORDEN_CONFIRMADA",
      "GANADA",
      "PERDIDA",
      "POSTERGADA",
      "DESCARTADO",
    ];
    const isFirematEtapaValue = (value: string): value is FirematFunnelEtapa =>
      (FIREMAT_ETAPAS_VALIDAS as string[]).includes(value);

    const mapUnificadoItemToDeal = (
      item: Record<string, unknown>,
      origen: "BECK" | "FIREMAT"
    ): FunnelDeal => {
      const etapaRaw = toText(item.etapa, "");
      const etapaTableroRaw = toText(item.etapaTablero, "");

      const etapaTableroTraducida: FunnelStage | undefined =
        etapaBackendMap[etapaTableroRaw] ??
        (isFunnelStageValue(etapaTableroRaw) ? etapaTableroRaw : undefined);

      const etapa: FunnelStage = isFunnelStageValue(etapaRaw)
        ? etapaRaw
        : etapaTableroTraducida ?? "prospecto";
      const etapaTablero: FunnelStage | undefined = etapaTableroTraducida;

      const ETAPAS_CIERRE_FIREMAT: FirematFunnelEtapa[] = [
        "PERDIDA",
        "POSTERGADA",
        "DESCARTADO",
      ];
      const etapaFiremat: FirematFunnelEtapa | undefined =
        origen !== "FIREMAT"
          ? undefined
          : ETAPAS_CIERRE_FIREMAT.includes(etapaRaw as FirematFunnelEtapa)
            ? (etapaTableroTraducida
                ? ETAPA_COMUN_A_FIREMAT[etapaTableroTraducida]
                : undefined) ?? "PROSPECTO"
            : isFirematEtapaValue(etapaRaw)
              ? etapaRaw
              : undefined;

      const estadoCierreRaw = toText(item.estadoCierre, "").toLowerCase();
      const estadoCierre: FunnelEstadoCierre | undefined =
        estadoCierreRaw === "ganada" ||
        estadoCierreRaw === "perdida" ||
        estadoCierreRaw === "postergada" ||
        estadoCierreRaw === "descartada"
          ? (estadoCierreRaw as FunnelEstadoCierre)
          : undefined;

      const monto = toNumber(item.monto);
      const probabilidad = toNumber(item.probabilidad);
      const rawId = toText(item.id);
      const id = origen === "BECK" ? rawId.replace(/^beck_/, "") : rawId;

      return {
        id,
        origen,
        nombreProyecto:
          (origen === "FIREMAT"
            ? toText(item.cliente, "") || toText(item.titulo, "")
            : toText(item.titulo, "")) ||
          (origen === "FIREMAT" ? "Oportunidad Firemat" : "Oportunidad Beck"),
        empresa: toText(item.empresa, "") || toText(item.cliente, "") || undefined,
        moneda: "CLP",
        valorEstimado: monto > 0 ? monto : undefined,
        nombreContacto: toText(item.contacto, "") || undefined,
        etapa,
        etapaTablero,
        etapaFiremat,
        estadoCierre,
        probabilidadCierre: probabilidad > 0 ? probabilidad : undefined,
        proximaAccion: toText(item.proximaAccion, "") || undefined,
        fechaProximaAccion: toText(item.fechaProximaAccion, "")
          ? toText(item.fechaProximaAccion, "").slice(0, 10)
          : undefined,
        fechaCierre: toText(item.fechaCierre, "")
          ? toText(item.fechaCierre, "").slice(0, 10)
          : undefined,
        motivoPerdida:
          estadoCierre === "perdida"
            ? toText(item.motivoCierre, "") || undefined
            : undefined,
        motivoPostergacion:
          estadoCierre === "postergada"
            ? toText(item.motivoCierre, "") || undefined
            : undefined,
        observacionCierre: toText(item.observacionCierre, "") || undefined,
        unidadNegocio:
          toText(item.unidadNegocio, "") ||
          (origen === "FIREMAT" ? "Firemat" : undefined),
        updatedAt: toText(item.updatedAt, "") || undefined,
      };
    };

    const dealToDraft = (deal: FunnelDeal): FunnelDraft => ({
      nombreProyecto: deal.nombreProyecto,
      empresa: deal.empresa || "",
      valorEstimado:
        typeof deal.valorEstimado === "number" && Number.isFinite(deal.valorEstimado)
          ? String(deal.valorEstimado)
          : "",
      moneda: deal.moneda,
      fechaProbableCierre: deal.fechaProbableCierre || "",
      vendedor: deal.vendedor || "",
      region: deal.region || "",
      comuna: deal.comuna || "",
      fuenteLead: deal.fuenteLead || "",
      etapa: deal.etapa,
      rutEmpresa: deal.rutEmpresa || "",
      nombreContacto: deal.nombreContacto || "",
      cargoContacto: deal.cargoContacto || "",
      telefonoContacto: deal.telefonoContacto || "",
      correoContacto: deal.correoContacto || "",
      tipoCliente: deal.tipoCliente || "",
      tipoOportunidad: deal.tipoOportunidad || "",
      fechaPrimerContacto: deal.fechaPrimerContacto || "",
      tipoContacto: deal.tipoContacto || "",
      necesidadDetectada: deal.necesidadDetectada || "",
      timingEstimado: deal.timingEstimado || "",
      nivelInteres: deal.nivelInteres || "",
      proximaAccion: deal.proximaAccion || "",
      fechaProximaAccion: deal.fechaProximaAccion || "",
      comentariosPrimerContacto: "",
      fechaVisita: deal.fechaVisita || "",
      responsableTecnico: deal.responsableTecnico || "",
      asistentes: deal.asistentes || "",
      lugarVisita: deal.lugarVisita || "",
      antecedentesLevantados: deal.antecedentesLevantados || "",
      documentosRecibidos: deal.documentosRecibidos || "",
      planos: deal.planos || "",
      basesTecnicas: deal.basesTecnicas || "",
      especificaciones: deal.especificaciones || "",
      fotografias: deal.fotografias || "",
      observacionesTecnicas: deal.observacionesTecnicas || "",
      necesidadOficinaTecnica:
        typeof deal.necesidadOficinaTecnica === "boolean"
          ? String(deal.necesidadOficinaTecnica)
          : "",
      proximosPasos: deal.proximosPasos || "",
      estadoDesarrolloPropuesta: deal.estadoDesarrolloPropuesta || "",
      informacionPendiente: deal.informacionPendiente || "",
      documentosRequeridos: deal.documentosRequeridos || "",
      riesgoTecnico: deal.riesgoTecnico || "",
      condicionesEspeciales: deal.condicionesEspeciales || "",
      necesidadValidacionGerencial:
        typeof deal.necesidadValidacionGerencial === "boolean"
          ? String(deal.necesidadValidacionGerencial)
          : "",
      fechaComprometidaEnvio: deal.fechaComprometidaEnvio || "",
      comentariosInternos: deal.comentariosInternos || "",
      fechaEnvioPropuesta: deal.fechaEnvioPropuesta || "",
      versionPropuesta: deal.versionPropuesta || "",
      numeroPropuesta: deal.numeroPropuesta || "",
      montoPropuesto:
        typeof deal.montoPropuesto === "number" ? String(deal.montoPropuesto) : "",
      fechaVencimientoPropuesta: deal.fechaVencimientoPropuesta || "",
      comentariosCliente: deal.comentariosCliente || "",
      probabilidadCierre:
        typeof deal.probabilidadCierre === "number"
          ? String(deal.probabilidadCierre)
          : "",
      objeciones: deal.objeciones || "",
      contrapropuestas: deal.contrapropuestas || "",
      ajustesSolicitados: deal.ajustesSolicitados || "",
      ordenCompra: deal.ordenCompra || "",
      contrato: deal.contrato || "",
      correoAceptacion: deal.correoAceptacion || "",
      anticipo: deal.anticipo || "",
      aprobacionInternaCliente: deal.aprobacionInternaCliente || "",
      condicionesPago: deal.condicionesPago || "",
      documentosAdministrativosPendientes:
        deal.documentosAdministrativosPendientes || "",
      responsableAdministrativo: deal.responsableAdministrativo || "",
      fechaFirma: deal.fechaFirma || "",
      fechaInicioProyecto: deal.fechaInicioProyecto || "",
      traspasadoOperaciones:
        typeof deal.traspasadoOperaciones === "boolean"
          ? String(deal.traspasadoOperaciones)
          : "",
      fechaTraspasoOperaciones: deal.fechaTraspasoOperaciones || "",
      responsableTraspasoOperaciones:
        deal.responsableTraspasoOperaciones || "",
      observacionesTraspasoOperaciones:
        deal.observacionesTraspasoOperaciones || "",
      traspasadoAdministracion:
        typeof deal.traspasadoAdministracion === "boolean"
          ? String(deal.traspasadoAdministracion)
          : "",
      fechaTraspasoAdministracion: deal.fechaTraspasoAdministracion || "",
      responsableTraspasoAdministracion:
        deal.responsableTraspasoAdministracion || "",
      observacionesTraspasoAdministracion:
        deal.observacionesTraspasoAdministracion || "",
      documentoRespaldo: deal.documentoRespaldo || "",
      flujoPosterior: deal.flujoPosterior || "",
      montoFinalGanado:
        typeof deal.montoFinalGanado === "number"
          ? String(deal.montoFinalGanado)
          : "",
      fechaCierre: deal.fechaCierre || "",
      clienteBeckId: deal.clienteBeckId || "",
      contactoBeckId: deal.contactoBeckId || "",
      direccionProyecto: deal.direccionProyecto || "",
      unidadNegocio: deal.unidadNegocio || "",
      observaciones: deal.observaciones || "",
      urgencia: deal.urgencia ?? "",
      tipoProyecto: deal.tipoProyecto || "",
      empresaMandante: deal.empresaMandante || "",
      necesidadLevantamiento:
        typeof deal.necesidadLevantamiento === "boolean"
          ? String(deal.necesidadLevantamiento)
          : "",
      esReactivacion:
        typeof deal.esReactivacion === "boolean"
          ? String(deal.esReactivacion)
          : "",
      oficinaTecnicaAsignada: deal.oficinaTecnicaAsignada || "",
      duracionEstimada: deal.duracionEstimada || "",
      estadoRevisionTecnica: deal.estadoRevisionTecnica || "",
      garantiasRequeridas: deal.garantiasRequeridas || "",
      estadoDocumentacionVenta: deal.estadoDocumentacionVenta || "",
    });

    const loadDeals = async () => {
      try {
        setIsLoading(true);

        const unidadParam =
          filterUnidadNegocio === "Firemat"
            ? "firemat"
            : filterUnidadNegocio === "Todas"
              ? "todas"
              : "beck";
        const estadoParam =
          filterEstadoCierre === "activas"
            ? "activa"
            : filterEstadoCierre === "ganadas"
              ? "ganada"
              : filterEstadoCierre === "perdidas"
                ? "perdida"
                : filterEstadoCierre === "postergadas"
                  ? "postergada"
                  : "todas";

        const [unificado, beckOpportunities] = await Promise.all([
          funnelUnificadoAPI.listar({
            unidadNegocio: unidadParam,
            estadoCierre: estadoParam,
          }),
          unidadParam === "firemat"
            ? Promise.resolve<FunnelBeckOpportunity[]>([])
            : funnelBeckAPI.listar(),
        ]);

        const beckFullById = new Map(
          beckOpportunities.map((item) => [String(item.id), item])
        );

        const mapped: FunnelDeal[] = unificado.data.map((item) => {
          const record = item as unknown as Record<string, unknown>;

          if (item.origen === "FIREMAT") {
            return mapUnificadoItemToDeal(record, "FIREMAT");
          }

          const realId = toText(item.id, "").replace(/^beck_/, "");
          const full = beckFullById.get(realId);

          if (full) {
            return {
              ...mapOpportunityToDeal(full as Record<string, unknown>),
              origen: "BECK" as const,
            };
          }

          return mapUnificadoItemToDeal(record, "BECK");
        });

        setDeals(mapped);
        setSelectedDeal((current) =>
          current
            ? mapped.find((deal) => deal.id === current.id) ?? current
            : current
        );
      } catch (error) {
        console.error("Error al cargar oportunidades del funnel:", error);
        setDeals([]);
      } finally {
        setIsLoading(false);
      }
    };

    const loadRelatedCotizaciones = async (dealId: string) => {
      try {
        setRelatedCotizacionesLoading(true);
        const response = await funnelBeckAPI.listarCotizaciones(dealId);
        const cotizaciones = response
          .filter((item) => (item as { esActual?: boolean }).esActual !== false)
          .map((item, index) => mapCotizacionRecord(item, index));
        setRelatedCotizaciones(cotizaciones);

        const versionesMap: Record<string, FunnelCotizacionItem[]> = {};
        await Promise.all(
          cotizaciones.map(async (cotizacion) => {
            try {
              const versiones = await cotizacionesAPI.getVersiones(cotizacion.id);
              versionesMap[cotizacion.id] = versiones
                .filter((v) => v.id !== cotizacion.id)
                .map((v, i) => mapCotizacionRecord(v, i));
            } catch {
              versionesMap[cotizacion.id] = [];
            }
          })
        );
        setCotizacionVersionesById(versionesMap);
      } catch (error) {
        setRelatedCotizaciones([]);
        setCotizacionVersionesById({});
        message.error(
          getErrorMessage(error, "No se pudieron cargar las cotizaciones")
        );
      } finally {
        setRelatedCotizacionesLoading(false);
      }
    };

    const loadArchivosFunnel = async (deal: FunnelDeal) => {
      const embeddedArchivos = (deal as { archivos?: unknown }).archivos;

      if (Array.isArray(embeddedArchivos)) {
        setArchivosFunnelLoading(false);
        setArchivosFunnel(embeddedArchivos as FunnelBeckArchivo[]);
        return;
      }

      try {
        setArchivosFunnelLoading(true);
        const archivos = await funnelBeckAPI.listarArchivos(deal.id);
        setArchivosFunnel(archivos);
      } catch (error) {
        setArchivosFunnel([]);
        message.error(getErrorMessage(error, "No se pudieron cargar los archivos"));
      } finally {
        setArchivosFunnelLoading(false);
      }
    };

    const handleArchivosUploaded = (archivos: FunnelBeckArchivo[]) => {
      setArchivosFunnel((current) => {
        const byId = new Map(current.map((archivo) => [archivo.id, archivo]));
        archivos.forEach((archivo) => byId.set(archivo.id, archivo));
        return Array.from(byId.values());
      });
    };

    const handleArchivoDeleted = (archivoId: string) => {
      setArchivosFunnel((current) =>
        current.filter((archivo) => archivo.id !== archivoId)
      );
    };

    const ETAPA_HISTORIAL_LABELS: Record<string, string> = {
      prospecto: "Prospecto identificado",
      visita: "Visita / levantamiento",
      cotizacion: "Cotización elaborada",
      enviada: "Cotización enviada",
      negociacion: "En negociación",
      documentacion: "Documentación de venta",
      cerrada: "Cerrada",
      prospecto_identificado: "Prospecto identificado",
      visita_levantamiento: "Visita / levantamiento",
      cotizacion_elaborada: "Cotización elaborada",
      cotizacion_enviada: "Cotización enviada",
      en_negociacion: "En negociación",
      documentacion_venta: "Documentación de venta",
    };

    const formatEtapaHistorial = (etapa: string | null): string => {
      if (!etapa) return "Sin etapa anterior";
      return ETAPA_HISTORIAL_LABELS[etapa] ?? etapa.replace(/_/g, " ");
    };

    const loadHistorialEtapas = async (id: string) => {
      setHistorialEtapasLoading(true);
      setHistorialEtapasError(null);
      setHistorialEtapas([]);
      try {
        const data = await funnelBeckAPI.getHistorial(id);
        setHistorialEtapas(data);
      } catch {
        setHistorialEtapasError("No se pudo cargar el historial");
      } finally {
        setHistorialEtapasLoading(false);
      }
    };

    const openDealDetail = async (deal: FunnelDeal) => {
      if (deal.origen === "FIREMAT") {
        if (filterUnidadNegocio === "Firemat" && canViewFirematFunnel) {
          const firematId = String(deal.id).replace(/^firemat_/, "");
          setFirematEmbedId(firematId);
          return;
        }

        AntdModal.info({
          title: deal.nombreProyecto || "Oportunidad Firemat",
          okText: "Ir al funnel de Firemat",
          onOk: () => navigate("/firemat/funnel"),
          content: (
            <div className="space-y-1 text-sm">
              <p>
                <strong>Empresa:</strong> {deal.empresa || "-"}
              </p>
              <p>
                <strong>Contacto:</strong> {deal.nombreContacto || "-"}
              </p>
              <p>
                <strong>Etapa:</strong> {etapasLabel[deal.etapa] ?? deal.etapa}
              </p>
              {typeof deal.valorEstimado === "number" && (
                <p>
                  <strong>Monto:</strong>{" "}
                  {formatEstimatedValue(deal.valorEstimado, deal.moneda)}
                </p>
              )}
              {deal.proximaAccion && (
                <p>
                  <strong>Proxima accion:</strong> {deal.proximaAccion}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {filterUnidadNegocio === "Firemat"
                  ? "No tienes permiso para ver el detalle completo de Firemat."
                  : "Esta oportunidad pertenece a Firemat: cambia el filtro Unidad de negocio a Firemat para operarla, o ve a su funnel."}
              </p>
            </div>
          ),
        });
        return;
      }

      setSelectedDeal(deal);
      setArchivosFunnel([]);
      setRelatedCotizaciones([]);
      void loadArchivosFunnel(deal);
      void loadRelatedCotizaciones(deal.id);
      void loadHistorialEtapas(deal.id);
    };

    const closeDealDetail = () => {
      setSelectedDeal(null);
      setFullDetailOpen(false);
      setArchivosFunnel([]);
      setArchivosFunnelLoading(false);
      setRelatedCotizaciones([]);
      setCotizacionVersionesById({});
      setSelectedCotizacion(null);
      setSelectedCotizacionLoading(false);
      setHistorialEtapas([]);
      setHistorialEtapasLoading(false);
      setHistorialEtapasError(null);
    };

    const openCreateCotizacion = (deal: FunnelDeal) => {
      setCotizacionEditorMode("create");
      setEditingCotizacion(null);
      setCotizacionEditorContextDeal(deal);
      setCotizacionEditorLockedFunnel(true);
      setCotizacionEditorOpen(true);
    };

    const openEditCotizacion = async (cotizacion: FunnelCotizacionItem) => {
      try {
        setCotizacionEditorLoading(true);
        const response = await cotizacionesAPI.getById(cotizacion.id);

        setCotizacionEditorMode("edit");
        setEditingCotizacion(mapCotizacionRecord(response));
        setCotizacionEditorContextDeal(selectedDeal);
        setCotizacionEditorLockedFunnel(
          Boolean(cotizacion.funnelBeckId || selectedDeal?.id)
        );
        setCotizacionEditorOpen(true);
      } catch (error) {
        message.error(
          getErrorMessage(error, "No se pudo cargar la cotizacion para editar")
        );
      } finally {
        setCotizacionEditorLoading(false);
      }
    };

    const openCotizacionDetail = async (cotizacionId: string) => {
      try {
        setSelectedCotizacionLoading(true);
        setSelectedCotizacion(null);
        const response = await cotizacionesAPI.getById(cotizacionId);
        setSelectedCotizacion(mapCotizacionRecord(response));
      } catch (error) {
        message.error(
          getErrorMessage(error, "No se pudo cargar el detalle de la cotizacion")
        );
      } finally {
        setSelectedCotizacionLoading(false);
      }
    };

    const closeCotizacionDetail = () => {
      setSelectedCotizacion(null);
      setSelectedCotizacionLoading(false);
    };

    const handleVerCotizacionPDF = async (id: string, numero?: string) => {
      try {
        const blob = await cotizacionesAPI.getPDF(id);
        const pdfBlob =
          blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" });
        const url = window.URL.createObjectURL(pdfBlob);
        const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

        if (!openedWindow) {
          const link = document.createElement("a");
          link.href = url;
          link.download = `cotizacion-${numero || id}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
        }

        window.setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000);
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo abrir el PDF"));
      }
    };

    const handleSaveCotizacion = async (values: CotizacionEditorValues) => {
      if (cotizacionSaving || cotizacionEditorLoading) {
        return;
      }

      try {
        setCotizacionSaving(true);

        const normalizedLineas: CotizacionUpsertPayload["lineas"] = (
          values.lineas ?? []
        )
          .map((linea, index) => {
            const cantidad = Math.max(1, Number(linea.cantidad || 0));
            const precioUnitario = Number(linea.precioUnitario || 0);
            const gananciaPct = canManageGanancia
              ? Number(linea.gananciaPct || 0)
              : 0;
            const tipoLinea: CotizacionUpsertPayload["lineas"][number]["tipoLinea"] =
              linea.tipoLinea === "SERVICIO" ? "SERVICIO" : "PRODUCTO";
            const subtotal = calculateLineSubtotal(
              cantidad,
              precioUnitario,
              gananciaPct
            );

            return {
              tipoLinea,
              descripcion: linea.descripcion.trim(),
              cantidad,
              precioUnitario,
              subtotal,
              orden: index + 1,
              gananciaPct,
            };
          })
          .filter((linea) => linea.descripcion);

        if (!normalizedLineas.length) {
          message.error("Debes agregar al menos una linea a la cotizacion");
          return;
        }

        const descuentoRaw = Number(values.descuento ?? 0);
        const descuento = Number.isFinite(descuentoRaw)
          ? Math.min(100, Math.max(0, descuentoRaw))
          : 0;
        const aplicaImpuesto = Boolean(values.aplicaImpuesto);
        const { subtotal, impuesto, total } = calculateCotizacionTotals(
          normalizedLineas,
          descuento,
          aplicaImpuesto
        );

        const payload: CotizacionUpsertPayload = {
          numero: values.numero || undefined,
          clienteNombre: values.cliente,
          funnelBeckId: values.funnelBeckId || null,
          responsableId: values.responsableId || null,
          subtotal,
          impuesto,
          total,
          vigencia: values.vigencia.toISOString(),
          observaciones: values.notas || "",
          descuento,
          aplicaImpuesto,
          estado: values.estado.toUpperCase(),
          lineas: normalizedLineas,
        };

        let savedCotizacion: CotizacionApiRecord | null = null;

        if (cotizacionEditorMode === "create") {
          savedCotizacion = await cotizacionesAPI.create(payload);
        } else if (editingCotizacion) {
          savedCotizacion = await cotizacionesAPI.update(
            editingCotizacion.id,
            payload
          );
        }

        if (savedCotizacion) {
          const mappedCotizacion = mapCotizacionRecord(savedCotizacion);
          setSelectedCotizacion((current) =>
            current?.id === mappedCotizacion.id ? mappedCotizacion : current
          );
        }

        if (selectedDeal?.id) {
          await loadRelatedCotizaciones(selectedDeal.id);
        }

        setCotizacionEditorOpen(false);
        setEditingCotizacion(null);
        setCotizacionEditorContextDeal(null);
        setCotizacionEditorLockedFunnel(false);
        message.success(
          cotizacionEditorMode === "create"
            ? "Cotizacion creada"
            : "Cotizacion actualizada"
        );
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo guardar la cotizacion"));
      } finally {
        setCotizacionSaving(false);
      }
    };

    const loadUfActual = async () => {
      try {
        const response = await fetchWithAuth("/indicadores/uf");
        const result = (await response.json()) as {
          success: boolean;
          data?: {
            valor: number;
            fecha: string;
          };
          error?: string;
        };

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || "No fue posible cargar la UF actual");
        }

        setUfActual(result.data.valor);
        setUfFecha(result.data.fecha);
      } catch (error) {
        console.error("Error al cargar UF actual:", error);
        setUfActual(null);
        setUfFecha(null);
      }
    };

    const loadDolarActual = async () => {
      try {
        const response = await fetchWithAuth("/indicadores/dolar-mercado");
        const result = (await response.json()) as {
          success: boolean;
          data?: {
            valor: number;
            fecha?: string;
          };
          error?: string;
        };

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || "No fue posible cargar el dolar actual");
        }

        setDolarActual(result.data.valor);
      } catch (error) {
        console.error("Error al cargar dolar actual:", error);
        setDolarActual(null);
      }
    };

    const loadJefesObra = async () => {
      try {
        setJefesObraLoading(true);
        const usuarios = await usuariosAPI.listarJefesObra();
        setJefesObra(usuarios);
      } catch (error) {
        setJefesObra([]);
        console.error("Error al cargar jefes de obra:", error);
      } finally {
        setJefesObraLoading(false);
      }
    };

    const loadUsuariosComerciales = async () => {
      try {
        setUsuariosComercialesLoading(true);
        const usuarios = await usuariosAPI.listarVendedoresFunnelBeck();
        setUsuariosComerciales(usuarios);
      } catch (error) {
        console.error("Error al cargar vendedores del Funnel Beck:", error);
        message.error(getErrorMessage(error, "No se pudo cargar la lista de vendedores"));
        setUsuariosComerciales([]);
      } finally {
        setUsuariosComercialesLoading(false);
      }
    };

    useEffect(() => {
      const q = clienteBeckSearch.trim();
      if (!q) {
        setClienteBeckResults([]);
        return;
      }
      const timer = window.setTimeout(async () => {
        setClienteBeckSearching(true);
        try {
          const results = await clientesBeckAPI.buscar(q);
          setClienteBeckResults(results);
        } catch {
          setClienteBeckResults([]);
        } finally {
          setClienteBeckSearching(false);
        }
      }, 300);
      return () => window.clearTimeout(timer);
    }, [clienteBeckSearch]);

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
      void loadUfActual();
      void loadDolarActual();
      void loadJefesObra();
      void loadUsuariosComerciales();
    }, []);

    useEffect(() => {
      void loadDeals();
    }, [filterUnidadNegocio, filterEstadoCierre]);

    useEffect(() => {
      const state = location.state as {
        oportunidadId?: string;
        alertNavigationTs?: number;
      } | null;
      const ts = state?.alertNavigationTs;
      const id = state?.oportunidadId;
      if (!ts || !id) return;
      if (lastOpenedAlertTs.current === ts) return; // evitar re-apertura
      lastOpenedAlertTs.current = ts;

      if (deals.length > 0) {
        const target = deals.find((d) => d.id === id);
        if (target) void openDealDetail(target);
      } else {
        pendingOportunidadId.current = id;
      }
    }, [location.state]);

    useEffect(() => {
      if (!pendingOportunidadId.current || deals.length === 0) return;
      const id = pendingOportunidadId.current;
      pendingOportunidadId.current = null;
      const target = deals.find((d) => d.id === id);
      if (target) void openDealDetail(target);
    }, [deals]);
    /* eslint-enable react-hooks/exhaustive-deps */

    const resetClienteBeckState = () => {
      setSelectedClienteBeck(null);
      setClienteBeckSearch("");
      setClienteBeckResults([]);
    };

    const loadClientesDisponibles = async () => {
      setClientesLoading(true);
      try {
        const clientes = await clientesBeckAPI.listar({ activo: true });
        setClientesDisponibles(clientes);
      } catch {
        setClientesDisponibles([]);
      } finally {
        setClientesLoading(false);
      }
    };

    const handleClienteBeckSearchChange = (q: string) => {
      setClienteBeckSearch(q);
    };

    const handleSelectClienteBeck = (cliente: ClienteBeck | null) => {
      setSelectedClienteBeck(cliente);
      setClienteBeckSearch("");
      setClienteBeckResults([]);

      if (cliente) {
        setDraft((current) => ({
          ...current,
          clienteBeckId: cliente.id,
          contactoBeckId: "",
          empresa: cliente.nombreEmpresa || cliente.razonSocial || current.empresa,
          rutEmpresa: cliente.rut
            ? formatRut(cleanRut(cliente.rut))
            : current.rutEmpresa,
          telefonoContacto: cliente.telefono || current.telefonoContacto,
          correoContacto: cliente.correo || current.correoContacto,
          region: cliente.region || current.region,
          comuna: cliente.comuna || current.comuna,
          tipoCliente: cliente.tipoCliente || current.tipoCliente,
        }));
      } else {
        setDraft((current) => ({
          ...current,
          clienteBeckId: "",
          contactoBeckId: "",
        }));
      }
    };

    const handleSelectContactoBeck = (contacto: ContactoClienteBeck | null) => {
      setDraft((current) => ({
        ...current,
        contactoBeckId: contacto?.id ?? "",
        nombreContacto: contacto?.nombre ?? current.nombreContacto,
        cargoContacto: contacto?.cargo ?? current.cargoContacto ?? "",
        telefonoContacto: contacto?.telefono ?? current.telefonoContacto,
        correoContacto: contacto?.correo ?? current.correoContacto,
      }));
    };

    const handleExportarExcel = async () => {
      try {
        setExportandoExcel(true);
        const blob = await funnelBeckAPI.exportar();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "pipeline-beck.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success("Excel descargado correctamente");
      } catch {
        message.error("No se pudo exportar el Excel. Intenta nuevamente.");
      } finally {
        setExportandoExcel(false);
      }
    };

    const handleOpenModal = () => {
      if (!canEditFunnel || dealSaving) return;

      setFunnelModalMode("create");
      setEditingDealId(null);
      setInitialEditSection(null);
      setEditVisibleSections(null);
      setDraft(createEmptyDraft());
      setFieldErrors({});
      setShowValidationSummary(false);
      setArchivosFunnel([]);
      setArchivosFunnelLoading(false);
      resetClienteBeckState();
      setIsModalOpen(true);
      void loadClientesDisponibles();
      if (usuariosComerciales.length === 0 && !usuariosComercialesLoading) {
        void loadUsuariosComerciales();
      }
    };

    const handleEditDeal = async (
      deal: FunnelDeal,
      focusSection: FunnelEditSection | null = null,
      visibleSections: FunnelEditSection[] | null = null
    ) => {
      if (!canEditFunnel || dealSaving) return;

      closeDealDetail();
      void loadArchivosFunnel(deal);

      let clienteForEdit = deal.clienteBeck ?? null;
      if (deal.clienteBeckId && !clienteForEdit?.contactos?.length) {
        try {
          clienteForEdit = await clientesBeckAPI.obtener(deal.clienteBeckId);
        } catch {
          // keep whatever we have
        }
      }

      window.setTimeout(() => {
        setFunnelModalMode("edit");
        setEditingDealId(deal.id);
        setInitialEditSection(focusSection);
        setEditVisibleSections(visibleSections);
        setDraft(dealToDraft(deal));
        setSelectedClienteBeck(clienteForEdit);
        setClienteBeckSearch("");
        setClienteBeckResults([]);
        setFieldErrors({});
        setShowValidationSummary(false);
        setIsModalOpen(true);
        void loadClientesDisponibles();
      }, 0);
    };

    const handleCloseModal = () => {
      if (dealSaving) {
        return;
      }

      setIsModalOpen(false);
      setFunnelModalMode("create");
      setEditingDealId(null);
      setInitialEditSection(null);
      setEditVisibleSections(null);
      setDraft(createEmptyDraft());
      setFieldErrors({});
      setShowValidationSummary(false);
      setArchivosFunnel([]);
      setArchivosFunnelLoading(false);
      resetClienteBeckState();
    };

    const handleCloseCierreModal = () => {
      setCierreModalOpen(false);
      setDealEnCierre(null);
      setEstadoCierreModal("");
      setMotivoPerdidaModal("");
      setEtapaPerdidaModal("");
      setMotivoPostergacionModal("");
      setFechaReactivacionModal("");
      setDocumentoRespaldoModal("");
      setFlujoPosteriorModal("");
      setMontoFinalGanadoModal("");
      setFechaCierreModal("");
    };

    const handleFieldChange = (field: keyof FunnelDraft, value: string) => {
      if (!canEditFunnel || dealSaving) return;

      if (field === "etapa") {
        setDraft((current) => ({
          ...current,
          etapa: value as FunnelStage,
        }));
        return;
      }

      if (field === "moneda") {
        setDraft((current) => ({
          ...current,
          moneda: value as FunnelCurrency,
        }));
        return;
      }

      if (field === "fuenteLead") {
        setDraft((current) => ({
          ...current,
          fuenteLead: value as FunnelLeadSource | "",
        }));
        return;
      }

      if (field === "region") {
        setDraft((current) => ({
          ...current,
          region: value,
          comuna: "",
        }));
        return;
      }

      setDraft((current) => ({
        ...current,
        [field]: value,
      }));
    };

    type FirematBloqueoErrorResponse = {
      response: {
        status: 409;
        data: {
          bloqueos?: string[];
          advertencias?: string[];
          puedeAvanzar?: boolean;
          message?: string;
        };
      };
    };

    const isFirematBloqueoError = (
      err: unknown
    ): err is FirematBloqueoErrorResponse => {
      const e = err as {
        response?: { status?: number; data?: { bloqueos?: unknown; puedeAvanzar?: unknown } };
      };
      return (
        e?.response?.status === 409 &&
        (Array.isArray(e.response.data?.bloqueos) || e.response.data?.puedeAvanzar === false)
      );
    };

    const handleFirematStageChange = async (
      firematId: string,
      nuevaEtapa: FirematFunnelEtapa,
      observacionCamposFaltantes?: string
    ) => {
      try {
        await firematFunnelAPI.cambiarEtapa(
          firematId,
          nuevaEtapa,
          observacionCamposFaltantes
        );
        message.success("Etapa Firemat actualizada");
        setFirematBloqueoOpen(false);
        setFirematBloqueoPendiente(null);
        setFirematBloqueoObservacion("");
        void loadDeals();
      } catch (error) {
        if (isFirematBloqueoError(error)) {
          const data = error.response.data;
          setFirematBloqueoBloqueos(Array.isArray(data.bloqueos) ? data.bloqueos : []);
          setFirematBloqueoAdvertencias(
            Array.isArray(data.advertencias) ? data.advertencias : []
          );
          setFirematBloqueoPendiente({ firematId, nuevaEtapa });
          setFirematBloqueoOpen(true);
        } else {
          message.error(
            getErrorMessage(error, "No se pudo actualizar la etapa Firemat")
          );
        }
      } finally {
        setFirematBloqueoRetrying(false);
      }
    };

    const handleRetryFirematBloqueo = () => {
      if (!firematBloqueoPendiente || !firematBloqueoObservacion.trim()) return;
      setFirematBloqueoRetrying(true);
      void handleFirematStageChange(
        firematBloqueoPendiente.firematId,
        firematBloqueoPendiente.nuevaEtapa,
        firematBloqueoObservacion.trim()
      );
    };

    const updateDealStage = async (
      dealId: string,
      payload: {
        etapa: string;
        estadoCierre?: FunnelEstadoCierre;
        motivoPerdida?: string;
        etapaPerdida?: string;
        motivoPostergacion?: string;
        fechaReactivacion?: string;
        documentoRespaldo?: string;
        flujoPosterior?: string;
        montoFinalGanado?: number;
        fechaCierre?: string;
      }
    ): Promise<CambioVendedorAutomatico> => {
      if (!canEditFunnel || dealSaving) return null;

      const response = await fetchWithAuth(`/funnel-beck/${dealId}/etapa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as Record<string, unknown>;
      const bloqueosRecibidos = pickStringArray(result, BLOQUEO_KEYS);
      const advertenciasRecibidas = pickStringArray(result, ADVERTENCIA_KEYS);

      if (response.status === 409 && bloqueosRecibidos.length > 0 && result.puedeAvanzar === false) {
        const err = new Error(String(result.message ?? "No se puede avanzar")) as BeckBloqueoException;
        err.beckBloqueo = true;
        err.bloqueos = bloqueosRecibidos;
        err.advertencias = advertenciasRecibidas;
        throw err;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          String(result.error) || "El backend rechazo la actualizacion de etapa"
        );
      }

      if (advertenciasRecibidas.length > 0) {
        setAdvertenciasGuardado(advertenciasRecibidas);
        setAdvertenciasGuardadoOpen(true);
      }

      return (result.cambioVendedor as CambioVendedorAutomatico) ?? null;
    };

    const aplicarCambioVendedorAutomatico = (
      dealId: string,
      cambioVendedor: CambioVendedorAutomatico
    ) => {
      if (!cambioVendedor) return;

      setDeals((current) =>
        current.map((deal) =>
          deal.id === dealId ? { ...deal, vendedor: cambioVendedor.nuevo } : deal
        )
      );
      setSelectedDeal((current) =>
        current && current.id === dealId
          ? { ...current, vendedor: cambioVendedor.nuevo }
          : current
      );
      void loadHistorialEtapas(dealId);

      const separadorMotivo = cambioVendedor.motivo.indexOf(":");
      const motivoLabel =
        separadorMotivo === -1
          ? cambioVendedor.motivo
          : cambioVendedor.motivo.slice(0, separadorMotivo).trim();
      const motivoDetalle =
        separadorMotivo === -1
          ? null
          : cambioVendedor.motivo.slice(separadorMotivo + 1).trim();

      AntdModal.success({
        title: "Vendedor reasignado automáticamente",
        content: (
          <div>
            <p className="mb-2">
              {cambioVendedor.anterior} → {cambioVendedor.nuevo}
            </p>
            <p className="mb-0 font-medium">Motivo</p>
            <p className="mb-0">{motivoLabel}</p>
            {motivoDetalle && <p className="mb-0">{motivoDetalle}</p>}
          </div>
        ),
        okText: "Aceptar",
      });
    };

    const handleStageChange = async (dealId: string, etapa: FunnelStage, estadoCierrePreset?: "ganada" | "perdida" | "postergada") => {
      if (!canEditFunnel || dealSaving) return;

      if (etapa === "cerrada") {
        setDealEnCierre(dealId);
        setEstadoCierreModal(estadoCierrePreset ?? "");
        setMotivoPerdidaModal("");
        setMontoFinalGanadoModal("");
        setFechaCierreModal("");
        setCierreModalOpen(true);
        return;
      }

      try {
        const cambioVendedor = await updateDealStage(dealId, {
          etapa: etapaFrontendToBackendMap[etapa],
        });

        setDeals((current) =>
          current.map((deal) => (deal.id === dealId ? { ...deal, etapa, etapaTablero: etapa } : deal))
        );
        aplicarCambioVendedorAutomatico(dealId, cambioVendedor);
        void loadDeals();
      } catch (error) {
        if (isBeckBloqueoException(error)) {
          setBloqueoBloqueos(error.bloqueos);
          setBloqueoAdvertencias(error.advertencias);
          setBloqueoModalOpen(true);
        } else {
          message.error("No se pudo actualizar la etapa");
          console.error("Error al actualizar etapa:", error);
        }
      }
    };

    const handleChangeStage = async (nuevaEtapa: FunnelStage) => {
      if (!selectedDeal || updatingStage || !canEditFunnel) return;

      if (nuevaEtapa === "cerrada") {
        setDealEnCierre(selectedDeal.id);
        setEstadoCierreModal("");
        setMotivoPerdidaModal("");
        setMontoFinalGanadoModal("");
        setFechaCierreModal("");
        setCierreModalOpen(true);
        return;
      }

      try {
        setUpdatingStage(true);
        const cambioVendedor = await updateDealStage(selectedDeal.id, {
          etapa: etapaFrontendToBackendMap[nuevaEtapa],
        });
        setSelectedDeal((current) =>
          current ? { ...current, etapa: nuevaEtapa } : current
        );
        setDeals((current) =>
          current.map((deal) =>
            deal.id === selectedDeal.id ? { ...deal, etapa: nuevaEtapa } : deal
          )
        );
        message.success("Etapa actualizada");
        aplicarCambioVendedorAutomatico(selectedDeal.id, cambioVendedor);
        void loadDeals();
      } catch (error) {
        if (isBeckBloqueoException(error)) {
          setBloqueoBloqueos(error.bloqueos);
          setBloqueoAdvertencias(error.advertencias);
          setBloqueoModalOpen(true);
        } else {
          message.error(getErrorMessage(error, "No se pudo actualizar la etapa"));
        }
      } finally {
        setUpdatingStage(false);
      }
    };

    const handleDragStart = (event: DragStartEvent) => {
      if (!canEditFunnel && !canOperateFiremat) return;

      const dealId = String(event.active.id);
      const deal = deals.find((item) => item.id === dealId) ?? null;

      if (deal?.origen === "FIREMAT" && !canOperateFiremat) return;

      setActiveDragDeal(deal);
    };

    const handleDragEnd = (event: DragEndEvent) => {
      if (!canEditFunnel && !canOperateFiremat) {
        setActiveDragDeal(null);
        return;
      }

      const dealId = String(event.active.id);
      const columnKeyRaw = event.over?.id as string | undefined;

      if (!columnKeyRaw) {
        setActiveDragDeal(null);
        return;
      }

      const deal = deals.find((item) => item.id === dealId);
      if (!deal) {
        setActiveDragDeal(null);
        return;
      }

      if (deal.origen === "FIREMAT") {
        if (!canOperateFiremat) {
          setActiveDragDeal(null);
          return;
        }

        const firematId = String(deal.id).replace(/^firemat_/, "");
        const nuevaEtapaFiremat =
          filterUnidadNegocio === "Firemat"
            ? (isFirematEtapaValue(columnKeyRaw) ? columnKeyRaw : undefined)
            : ETAPA_COMUN_A_FIREMAT[columnKeyRaw];

        if (!nuevaEtapaFiremat) {
          if (filterUnidadNegocio === "Todas" && columnKeyRaw === "negociacion") {
            message.warning("Firemat no tiene una etapa equivalente a Negociación.");
          }
          setActiveDragDeal(null);
          return;
        }

        if (nuevaEtapaFiremat === deal.etapaFiremat) {
          setActiveDragDeal(null);
          return;
        }

        void handleFirematStageChange(firematId, nuevaEtapaFiremat);
        setActiveDragDeal(null);
        return;
      }

      if (!canEditFunnel) {
        setActiveDragDeal(null);
        return;
      }

      const cerradaSubcolumnMap: Record<string, "ganada" | "perdida" | "postergada"> = {
        cerrada_ganada: "ganada",
      };

      const estadoCierrePreset = cerradaSubcolumnMap[columnKeyRaw];
      const nuevaEtapa: FunnelStage = estadoCierrePreset ? "cerrada" : (columnKeyRaw as FunnelStage);

      const currentColumnKey =
        deal.estadoCierre === "ganada"
          ? "cerrada_ganada"
          : (deal.etapaTablero ?? deal.etapa);

      if (columnKeyRaw === currentColumnKey) {
        setActiveDragDeal(null);
        return;
      }

      void handleStageChange(dealId, nuevaEtapa, estadoCierrePreset);
      setActiveDragDeal(null);
    };

    const handleDragCancel = () => {
      setActiveDragDeal(null);
    };

    const handleConfirmarCierre = async ({
      estadoCierre,
      motivoPerdida,
      etapaPerdida,
      motivoPostergacion,
      fechaReactivacion,
      documentoRespaldo,
      flujoPosterior,
      montoFinalGanado,
      fechaCierre,
    }: {
      estadoCierre: FunnelEstadoCierre;
      motivoPerdida?: string;
      etapaPerdida?: string;
      motivoPostergacion?: string;
      fechaReactivacion?: string;
      documentoRespaldo?: string;
      flujoPosterior?: string;
      montoFinalGanado?: number;
      fechaCierre?: string;
    }) => {
      if (!canEditFunnel || !dealEnCierre) {
        return;
      }

      const payload: {
        etapa: string;
        estadoCierre: FunnelEstadoCierre;
        motivoPerdida?: string;
        etapaPerdida?: string;
        motivoPostergacion?: string;
        fechaReactivacion?: string;
        documentoRespaldo?: string;
        flujoPosterior?: string;
        montoFinalGanado?: number;
        fechaCierre?: string;
      } = {
        etapa: etapaFrontendToBackendMap.cerrada,
        estadoCierre,
      };

      if (motivoPerdida) payload.motivoPerdida = motivoPerdida;
      if (etapaPerdida) payload.etapaPerdida = etapaPerdida;
      if (motivoPostergacion) payload.motivoPostergacion = motivoPostergacion;
      if (fechaReactivacion) payload.fechaReactivacion = fechaReactivacion;
      if (documentoRespaldo) payload.documentoRespaldo = documentoRespaldo;
      if (flujoPosterior) payload.flujoPosterior = flujoPosterior;
      if (montoFinalGanado !== undefined) {
        payload.montoFinalGanado = montoFinalGanado;
      }
      if (fechaCierre) payload.fechaCierre = fechaCierre;

      try {
        await updateDealStage(dealEnCierre, payload);
        handleCloseCierreModal();
        await loadDeals();
      } catch (error) {
        if (isBeckBloqueoException(error)) {
          setBloqueoBloqueos(error.bloqueos);
          setBloqueoAdvertencias(error.advertencias);
          setBloqueoModalOpen(true);
        } else {
          const e400 = error as { response?: { status?: number; data?: { error?: string; detalles?: string[] } } };
          if (e400?.response?.status === 400 && e400?.response?.data?.error === "Motivo inválido") {
            const detalles = e400.response.data?.detalles?.join(", ") ?? "";
            message.error(`Motivo inválido: ${detalles}`);
          } else {
            console.error("Error al actualizar etapa:", error);
            message.error(getErrorMessage(error, "No se pudo actualizar el cierre"));
          }
        }
      }
    };

    const handleAbrirCierreEstado = (deal: FunnelDeal) => {
      const tipoPrevio = deal.estadoCierre === "perdida"
        ? "perdida"
        : deal.estadoCierre === "postergada"
        ? "postergada"
        : "";

      setCierreEstadoStep(tipoPrevio as "" | "perdida" | "postergada");

      if (tipoPrevio === "perdida" || tipoPrevio === "postergada") {
        const motivoField = tipoPrevio === "perdida" ? deal.motivoPerdida : deal.motivoPostergacion;
        const parsed = parseMotivoSelect(motivoField);
        setCierreEstadoSelectMotivo(parsed.select);
        setCierreEstadoDetalleOtro(parsed.detalle);
        setCierreEstadoObservacion(deal.observacionCierre ?? "");
        setCierreEstadoFechaReactivacion(
          tipoPrevio === "postergada" ? (deal.fechaReactivacion ?? "") : ""
        );
      } else {
        setCierreEstadoSelectMotivo("");
        setCierreEstadoDetalleOtro("");
        setCierreEstadoObservacion("");
        setCierreEstadoFechaReactivacion("");
      }

      setCierreEstadoOpen(true);
    };

    const handleGuardarEstadoCierre = async () => {
      if (!selectedDeal) return;
      const tipo = cierreEstadoStep;
      if (tipo !== "perdida" && tipo !== "postergada") {
        message.error("Selecciona el tipo de cierre");
        return;
      }

      const motivoFinal = normalizarMotivoSubmit(cierreEstadoSelectMotivo, cierreEstadoDetalleOtro);
      if (!motivoFinal.trim()) {
        message.error("Debes seleccionar un motivo.");
        return;
      }
      if (cierreEstadoSelectMotivo === "Otro" && !cierreEstadoDetalleOtro.trim()) {
        message.error("Debes especificar el detalle del motivo.");
        return;
      }
      if (tipo === "postergada" && !cierreEstadoFechaReactivacion.trim()) {
        message.error("Debes indicar la fecha de reactivación.");
        return;
      }

      try {
        setCierreEstadoSaving(true);
        await funnelBeckAPI.actualizarEstadoCierre(selectedDeal.id, {
          estadoCierre: tipo === "perdida" ? "PERDIDA" : "POSTERGADA",
          motivoCierre: motivoFinal.trim(),
          observacionCierre: cierreEstadoObservacion.trim(),
          ...(tipo === "postergada" ? { fechaReactivacion: cierreEstadoFechaReactivacion } : {}),
        });
        message.success(
          tipo === "perdida"
            ? "Oportunidad marcada como perdida."
            : "Oportunidad marcada como postergada."
        );
        setCierreEstadoOpen(false);
        await loadDeals();
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo actualizar el estado de cierre"));
      } finally {
        setCierreEstadoSaving(false);
      }
    };

    const buildFunnelUpsertPayloadForDraft = (
      draft: FunnelDraft
    ): FunnelBeckUpsertPayload => {
      const isNegociacionStage = ["enviada", "negociacion", "cerrada"].includes(
        draft.etapa
      );

      return {
        nombreProyecto: draft.nombreProyecto.trim(),
        empresa: draft.empresa.trim(),
        valorOriginal: Number(draft.valorEstimado.replace(",", ".")),
        monedaOriginal: draft.moneda,
        fechaProbableCierre: draft.fechaProbableCierre.trim(),
        vendedor: draft.vendedor.trim(),
        region: draft.region.trim(),
        comuna: draft.comuna.trim(),
        fuenteLead: draft.fuenteLead
          ? fuenteLeadFrontendToBackendMap[draft.fuenteLead]
          : undefined,
        etapa: etapaFrontendToBackendMap[draft.etapa],
        estadoCierre: draft.etapa === "cerrada" ? "ganada" : undefined,
        rutEmpresa: draft.rutEmpresa.trim() || undefined,
        nombreContacto: draft.nombreContacto.trim() || undefined,
        cargoContacto: draft.cargoContacto.trim() || undefined,
        telefonoContacto: draft.telefonoContacto.trim() || undefined,
        correoContacto: draft.correoContacto.trim() || undefined,
        tipoCliente: draft.tipoCliente.trim() || undefined,
        tipoOportunidad: draft.tipoOportunidad.trim() || undefined,
        fechaPrimerContacto: draft.fechaPrimerContacto.trim() || undefined,
        tipoContacto: draft.tipoContacto.trim() || undefined,
        necesidadDetectada: draft.necesidadDetectada.trim() || undefined,
        timingEstimado: draft.timingEstimado.trim() || undefined,
        nivelInteres: draft.nivelInteres.trim() || undefined,
        proximaAccion: draft.proximaAccion.trim() || undefined,
        fechaProximaAccion: draft.fechaProximaAccion.trim() || undefined,
        comentariosPrimerContacto:
          draft.comentariosPrimerContacto.trim() || undefined,
        fechaVisita: draft.fechaVisita.trim() || undefined,
        responsableTecnico: draft.responsableTecnico.trim() || undefined,
        asistentes: draft.asistentes.trim() || undefined,
        lugarVisita: draft.lugarVisita.trim() || undefined,
        antecedentesLevantados:
          draft.antecedentesLevantados.trim() || undefined,
        documentosRecibidos: draft.documentosRecibidos.trim() || undefined,
        planos: draft.planos.trim() || undefined,
        basesTecnicas: draft.basesTecnicas.trim() || undefined,
        especificaciones: draft.especificaciones.trim() || undefined,
        fotografias: draft.fotografias.trim() || undefined,
        observacionesTecnicas: draft.observacionesTecnicas.trim() || undefined,
        necesidadOficinaTecnica:
          draft.necesidadOficinaTecnica === "true"
            ? true
            : draft.necesidadOficinaTecnica === "false"
              ? false
              : undefined,
        proximosPasos: draft.proximosPasos.trim() || undefined,
        estadoDesarrolloPropuesta:
          draft.estadoDesarrolloPropuesta.trim() || undefined,
        informacionPendiente: draft.informacionPendiente.trim() || undefined,
        documentosRequeridos: draft.documentosRequeridos.trim() || undefined,
        riesgoTecnico: draft.riesgoTecnico.trim() || undefined,
        condicionesEspeciales: draft.condicionesEspeciales.trim() || undefined,
        necesidadValidacionGerencial:
          draft.necesidadValidacionGerencial === "true"
            ? true
            : draft.necesidadValidacionGerencial === "false"
              ? false
              : undefined,
        fechaComprometidaEnvio:
          draft.fechaComprometidaEnvio.trim() || undefined,
        comentariosInternos: draft.comentariosInternos.trim() || undefined,
        fechaEnvioPropuesta: draft.fechaEnvioPropuesta.trim() || undefined,
        versionPropuesta: draft.versionPropuesta.trim() || undefined,
        numeroPropuesta: draft.numeroPropuesta.trim() || undefined,
        montoPropuesto: draft.montoPropuesto
          ? Number(draft.montoPropuesto.replace(",", "."))
          : undefined,
        fechaVencimientoPropuesta:
          draft.fechaVencimientoPropuesta.trim() || undefined,
        comentariosCliente: draft.comentariosCliente.trim() || undefined,
        probabilidadCierre:
          isNegociacionStage && draft.probabilidadCierre
            ? Number(draft.probabilidadCierre)
            : undefined,
        objeciones: isNegociacionStage
          ? draft.objeciones.trim() || undefined
          : undefined,
        contrapropuestas: isNegociacionStage
          ? draft.contrapropuestas.trim() || undefined
          : undefined,
        ajustesSolicitados: isNegociacionStage
          ? draft.ajustesSolicitados.trim() || undefined
          : undefined,
        ordenCompra: draft.ordenCompra.trim() || undefined,
        contrato: draft.contrato.trim() || undefined,
        correoAceptacion: draft.correoAceptacion.trim() || undefined,
        anticipo: draft.anticipo.trim() || undefined,
        aprobacionInternaCliente:
          draft.aprobacionInternaCliente.trim() || undefined,
        condicionesPago: draft.condicionesPago.trim() || undefined,
        documentosAdministrativosPendientes:
          draft.documentosAdministrativosPendientes.trim() || undefined,
        responsableAdministrativo:
          draft.responsableAdministrativo.trim() || undefined,
        fechaFirma: draft.fechaFirma.trim() || undefined,
        fechaInicioProyecto: draft.fechaInicioProyecto.trim() || undefined,
        traspasadoOperaciones:
          draft.traspasadoOperaciones === "true"
            ? true
            : draft.traspasadoOperaciones === "false"
              ? false
              : undefined,
        fechaTraspasoOperaciones:
          draft.traspasadoOperaciones === "true"
            ? draft.fechaTraspasoOperaciones.trim() || undefined
            : undefined,
        responsableTraspasoOperaciones:
          draft.traspasadoOperaciones === "true"
            ? draft.responsableTraspasoOperaciones.trim() || undefined
            : undefined,
        observacionesTraspasoOperaciones:
          draft.traspasadoOperaciones === "true"
            ? draft.observacionesTraspasoOperaciones.trim() || undefined
            : undefined,
        traspasadoAdministracion:
          draft.traspasadoAdministracion === "true"
            ? true
            : draft.traspasadoAdministracion === "false"
              ? false
              : undefined,
        fechaTraspasoAdministracion:
          draft.traspasadoAdministracion === "true"
            ? draft.fechaTraspasoAdministracion.trim() || undefined
            : undefined,
        responsableTraspasoAdministracion:
          draft.traspasadoAdministracion === "true"
            ? draft.responsableTraspasoAdministracion.trim() || undefined
            : undefined,
        observacionesTraspasoAdministracion:
          draft.traspasadoAdministracion === "true"
            ? draft.observacionesTraspasoAdministracion.trim() || undefined
            : undefined,
        documentoRespaldo: draft.documentoRespaldo.trim() || undefined,
        flujoPosterior: draft.flujoPosterior.trim() || undefined,
        montoFinalGanado: draft.montoFinalGanado
          ? Number(draft.montoFinalGanado.replace(",", "."))
          : undefined,
        fechaCierre: draft.fechaCierre.trim() || undefined,
        clienteBeckId: draft.clienteBeckId || null,
        contactoBeckId: draft.contactoBeckId || null,
        direccionProyecto: draft.direccionProyecto.trim() || undefined,
        unidadNegocio: draft.unidadNegocio.trim() || undefined,
        observaciones: draft.observaciones.trim() || undefined,
        urgencia: draft.urgencia?.trim() || undefined,
        tipoProyecto: draft.tipoProyecto.trim() || undefined,
        empresaMandante: draft.empresaMandante.trim() || undefined,
        necesidadLevantamiento:
          draft.necesidadLevantamiento === "true"
            ? true
            : draft.necesidadLevantamiento === "false"
              ? false
              : undefined,
        esReactivacion:
          draft.esReactivacion === "true"
            ? true
            : draft.esReactivacion === "false"
              ? false
              : undefined,
        oficinaTecnicaAsignada: draft.oficinaTecnicaAsignada.trim() || undefined,
        duracionEstimada: draft.duracionEstimada.trim() || undefined,
        estadoRevisionTecnica: draft.estadoRevisionTecnica.trim() || undefined,
        garantiasRequeridas: draft.garantiasRequeridas.trim() || undefined,
        estadoDocumentacionVenta: draft.estadoDocumentacionVenta.trim() || undefined,
      };
    };

    const buildFunnelUpsertPayload = (): FunnelBeckUpsertPayload =>
      buildFunnelUpsertPayloadForDraft(draft);

    const handleSaveOpportunityDraftForSolicitud = async () => {
      if (!canEditFunnel || dealSaving || !editingDealId) {
        throw new Error("No se pudo guardar la oportunidad antes de crear la solicitud");
      }

      const validationErrors = validateFunnelDraft(draft);
      setShowValidationSummary(true);

      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        throw new Error("Corrige los campos obligatorios antes de crear la solicitud");
      }

      setFieldErrors({});
      setDealSaving(true);

      try {
        const savedOpportunity = await funnelBeckAPI.actualizar(
          editingDealId,
          buildFunnelUpsertPayload()
        );
        const mappedSavedOpportunity = mapOpportunityToDeal(
          savedOpportunity as Record<string, unknown>
        );

        setDeals((current) =>
          current.map((deal) =>
            deal.id === mappedSavedOpportunity.id ? mappedSavedOpportunity : deal
          )
        );
        setSelectedDeal((current) =>
          current?.id === mappedSavedOpportunity.id ? mappedSavedOpportunity : current
        );
      } catch (error) {
        throw new Error(getErrorMessage(error, "No se pudo guardar la oportunidad"));
      } finally {
        setDealSaving(false);
      }
    };

    const openAsignarJefeObra = () => {
      if (!selectedDeal) return;
      setJefeObraAsignado(selectedDeal.responsableTecnico || "");
      setAsignarJefeModalOpen(true);
    };

    const closeAsignarJefeObra = () => {
      if (asignandoJefeObra) return;
      setAsignarJefeModalOpen(false);
      setJefeObraAsignado("");
    };

    const handleGuardarAsignacionJefeObra = async () => {
      if (!selectedDeal || !canEditFunnel || asignandoJefeObra) return;

      const responsableTecnico = jefeObraAsignado.trim();
      const hadResponsableTecnico = Boolean(selectedDeal.responsableTecnico?.trim());
      if (!responsableTecnico) {
        message.error("Selecciona un jefe de obra.");
        return;
      }

      try {
        setAsignandoJefeObra(true);
        const assignmentDraft = dealToDraft({
          ...selectedDeal,
          responsableTecnico,
        });
        const savedOpportunity = await funnelBeckAPI.actualizar(
          selectedDeal.id,
          buildFunnelUpsertPayloadForDraft(assignmentDraft)
        );
        const mappedSavedOpportunity = mapOpportunityToDeal(
          savedOpportunity as Record<string, unknown>
        );

        setDeals((current) =>
          current.map((deal) =>
            deal.id === mappedSavedOpportunity.id ? mappedSavedOpportunity : deal
          )
        );
        setSelectedDeal(mappedSavedOpportunity);
        setDraft((current) =>
          editingDealId === mappedSavedOpportunity.id
            ? { ...current, responsableTecnico }
            : current
        );

        message.success(
          hadResponsableTecnico
            ? "Asignación actualizada."
            : "Jefe de obra asignado."
        );
        setAsignarJefeModalOpen(false);
        setJefeObraAsignado("");
        await loadDeals();
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo asignar el jefe de obra"));
      } finally {
        setAsignandoJefeObra(false);
      }
    };

    const openCambiarVendedorModal = () => {
      if (!selectedDeal) return;
      setCambiarVendedorValue(selectedDeal.vendedor || undefined);
      setCambiarVendedorModalOpen(true);
    };

    const closeCambiarVendedorModal = () => {
      if (cambiarVendedorSaving) return;
      setCambiarVendedorModalOpen(false);
      setCambiarVendedorValue(undefined);
    };

    const handleGuardarCambioVendedor = async () => {
      if (!selectedDeal || !canEditFunnel || cambiarVendedorSaving) return;

      const nuevoVendedor = (cambiarVendedorValue || "").trim();
      if (!nuevoVendedor) {
        message.error("Selecciona un vendedor.");
        return;
      }

      try {
        setCambiarVendedorSaving(true);
        const savedOpportunity = await funnelBeckAPI.cambiarVendedor(
          selectedDeal.id,
          nuevoVendedor
        );
        const mappedSavedOpportunity = mapOpportunityToDeal(
          savedOpportunity as Record<string, unknown>
        );

        setDeals((current) =>
          current.map((deal) =>
            deal.id === mappedSavedOpportunity.id ? mappedSavedOpportunity : deal
          )
        );
        setSelectedDeal(mappedSavedOpportunity);

        setCambiarVendedorModalOpen(false);
        setCambiarVendedorValue(undefined);
        message.success("Vendedor actualizado");

        void loadHistorialEtapas(mappedSavedOpportunity.id);
      } catch (error) {
        message.error(getErrorMessage(error, "No se pudo cambiar el vendedor"));
      } finally {
        setCambiarVendedorSaving(false);
      }
    };

    const handleCreateDeal = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canEditFunnel || dealSaving || submitLockRef.current) return;

      submitLockRef.current = true;
      setFieldErrors({});

      try {
        setDealSaving(true);

        const isFocusedStageEdit =
          funnelModalMode === "edit" &&
          !Array.isArray(editVisibleSections) &&
          Boolean(initialEditSection);

        const payload: FunnelBeckUpsertPayload = {
          ...buildFunnelUpsertPayloadForDraft(draft),
          ...(isFocusedStageEdit && { origenEdicion: "ETAPA_ENFOCADA" }),
        };
        console.log("[BECK CREATE] submit payload", payload);
        console.log("[BECK CREATE] calling backend");

        const savedRaw =
          funnelModalMode === "create"
            ? await funnelBeckAPI.crear(payload)
            : await funnelBeckAPI.actualizar(editingDealId as string, payload);

        console.log("[BECK CREATE] response", savedRaw);

        const savedRawRecord = savedRaw as Record<string, unknown>;
        const savedOpportunity =
          savedRawRecord.oportunidad && typeof savedRawRecord.oportunidad === "object"
            ? (savedRawRecord.oportunidad as typeof savedRaw)
            : savedRaw;

        const savedAdvertencias =
          Array.isArray(savedRawRecord.advertencias) ? (savedRawRecord.advertencias as string[]) : [];
        const savedCambioVendedor =
          (savedRawRecord.cambioVendedor as CambioVendedorAutomatico | undefined) ?? null;

        const mappedSavedOpportunity = mapOpportunityToDeal(
          savedOpportunity as Record<string, unknown>
        );

        if (selectedDeal?.id === mappedSavedOpportunity.id) {
          setSelectedDeal(mappedSavedOpportunity);
          void loadHistorialEtapas(mappedSavedOpportunity.id);
        }

        if (savedCambioVendedor) {
          aplicarCambioVendedorAutomatico(mappedSavedOpportunity.id, savedCambioVendedor);
        }

        await loadDeals();
        setIsModalOpen(false);
        setFunnelModalMode("create");
        setEditingDealId(null);
        setDraft(createEmptyDraft());
        setFieldErrors({});
        setShowValidationSummary(false);
        if (savedAdvertencias.length > 0) {
          setAdvertenciasGuardado(savedAdvertencias);
          setAdvertenciasGuardadoOpen(true);
        } else {
          message.success(
            funnelModalMode === "create"
              ? "Oportunidad creada"
              : "Oportunidad actualizada"
          );
        }
      } catch (error) {
        console.error("[BECK CREATE] error", error);
        if (isBeckBloqueoAxiosError(error)) {
          setBloqueoBloqueos(getBeckBloqueosFromAxiosError(error));
          setBloqueoAdvertencias(getBeckAdvertenciasFromBloqueoAxiosError(error));
          setBloqueoModalOpen(true);
        } else {
          message.error(getErrorMessage(error, "Error al guardar la oportunidad"));
        }
      } finally {
        setDealSaving(false);
        submitLockRef.current = false;
      }
    };

    const cotizacionEditorInitialValues: Partial<CotizacionEditorValues> =
      editingCotizacion
        ? {
            numero: Number(editingCotizacion.numero) || undefined,
            funnelBeckId:
              editingCotizacion.funnelBeckId ||
              cotizacionEditorContextDeal?.id ||
              undefined,
            cliente: editingCotizacion.cliente,
            proyecto: editingCotizacion.proyecto,
            origen: editingCotizacion.origen === "FIREMAT" ? "FIREMAT" : "BECK",
            tipo: normalizeTipoCotizacion(editingCotizacion.tipo),
            fecha: toDayjsOrFallback(editingCotizacion.fecha, dayjs()),
            vigencia: toDayjsOrFallback(
              editingCotizacion.vigencia,
              dayjs().add(15, "day")
            ),
            estado:
              editingCotizacion.estado === "Enviada" ||
              editingCotizacion.estado === "Aceptada" ||
              editingCotizacion.estado === "Rechazada" ||
              editingCotizacion.estado === "Vencida"
                ? editingCotizacion.estado
                : "Borrador",
            moneda: editingCotizacion.moneda === "USD" ? "USD" : "CLP",
            responsableId: editingCotizacion.responsableId,
            notas: editingCotizacion.notas,
            descuento: editingCotizacion.descuento,
            aplicaImpuesto: editingCotizacion.aplicaImpuesto,
            lineas: editingCotizacion.lineas,
          }
        : {
            fecha: dayjs(),
            vigencia: dayjs().add(15, "day"),
            estado: "Borrador",
            moneda: "CLP",
            origen: "BECK",
            tipo: "Cliente",
            funnelBeckId: cotizacionEditorContextDeal?.id,
            cliente: cotizacionEditorContextDeal?.empresa || "",
            proyecto: cotizacionEditorContextDeal?.nombreProyecto || "",
            descuento: 0,
            aplicaImpuesto: true,
            lineas: [],
          };

    const renderDetailSection = (
      title: string,
      items: Array<{ label: string; value: React.ReactNode }>
    ) => {
      const visibleItems = items.filter(
        (item) => item.value !== undefined && item.value !== null && item.value !== ""
      );

      if (!visibleItems.length) {
        return null;
      }

      return (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
          <Descriptions size="small" column={2} bordered>
            {visibleItems.map((item) => (
              <Descriptions.Item key={item.label} label={item.label}>
                {item.value || "-"}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      );
    };

    const getStageEditSection = (
      etapa: FunnelStage
    ): FunnelEditSection | null => {
      if (etapa === "prospecto") return "prospecto";
      if (etapa === "visita") return "visita";
      if (etapa === "cotizacion") return "desarrollo";
      if (etapa === "enviada" || etapa === "negociacion") return "negociacion";
      if (etapa === "documentacion") return "documentacion";
      if (etapa === "cerrada") return "cierre";
      return null;
    };

    const getSectionsUpToStage = (etapa: FunnelStage): FunnelEditSection[] => {
      const actual = getStageEditSection(etapa);
      if (!actual) return FUNNEL_EDIT_SECTIONS_ORDER;
      const idx = FUNNEL_EDIT_SECTIONS_ORDER.indexOf(actual);
      return idx === -1 ? FUNNEL_EDIT_SECTIONS_ORDER : FUNNEL_EDIT_SECTIONS_ORDER.slice(0, idx + 1);
    };

    const getStageActionLabel = (etapa: FunnelStage) => {
      if (etapa === "visita") return "Rellenar visita / levantamiento";
      if (etapa === "cotizacion") return "Rellenar desarrollo de propuesta";
      if (etapa === "enviada" || etapa === "negociacion") {
        return "Rellenar propuesta / negociación";
      }
      if (etapa === "documentacion") return "Rellenar documentación de venta";
      if (etapa === "cerrada") return "Ver / completar cierre";
      return "Rellenar campos de etapa";
    };

    const formatBooleanDetail = (value?: boolean) =>
      typeof value === "boolean" ? (value ? "Sí" : "No") : undefined;

    const formatMoneyDetail = (value?: number, moneda: FunnelCurrency = "CLP") =>
      typeof value === "number" ? formatEstimatedValue(value, moneda) : undefined;

    const formatDateDetail = (value?: string) =>
      value ? formatDisplayDate(value) : undefined;

    const formatDateTimeDetail = (value?: string) => {
      if (!value) return undefined;
      const date = dayjs(value);
      return date.isValid() ? date.format("DD-MM-YYYY HH:mm") : value;
    };

    const renderRiesgoTecnicoDetail = (value?: string) => {
      if (!value) return undefined;
      const normalized = value.trim().toLowerCase();
      const color =
        normalized === "alto"
          ? "red"
          : normalized === "medio"
            ? "gold"
            : normalized === "bajo"
              ? "green"
              : "default";

      return <Tag color={color}>{value}</Tag>;
    };

    const renderFlujoPosteriorDetail = (value?: string) => {
      const values = parseFlujoPosterior(value);

      if (!values.length) {
        return undefined;
      }

      return (
        <Space size={[4, 4]} wrap>
          {values.map((item) => (
            <Tag key={item} color="blue">
              {item}
            </Tag>
          ))}
        </Space>
      );
    };

    const getSolicitudFecha = (solicitud: SolicitudOficinaTecnica): string =>
      toText(
        pickValue(solicitud as Record<string, unknown>, [
          "fechaSolicitud",
          "createdAt",
          "created_at",
        ]),
        ""
      );

    const getUltimaSolicitudOficinaTecnica = (
      deal: FunnelDeal
    ): SolicitudOficinaTecnica | undefined => {
      const solicitudes = deal.solicitudesOficinaTecnica ?? [];

      if (!solicitudes.length) return undefined;

      return [...solicitudes].sort((a, b) => {
        const fechaA = Date.parse(getSolicitudFecha(a));
        const fechaB = Date.parse(getSolicitudFecha(b));
        return (Number.isFinite(fechaB) ? fechaB : 0) - (Number.isFinite(fechaA) ? fechaA : 0);
      })[0];
    };

    const renderOficinaTecnicaDetail = (deal: FunnelDeal) => {
      const solicitud = getUltimaSolicitudOficinaTecnica(deal);

      if (!solicitud) {
        return deal.necesidadOficinaTecnica ? (
          <Tag color="warning">Pendiente de enviar a Oficina Técnica</Tag>
        ) : undefined;
      }

      const fechaSolicitud = getSolicitudFecha(solicitud);
      const estado = toText(solicitud.estado, "pendiente");
      const estadoTagConfig: Record<string, { color: string; label: string }> = {
        pendiente: {
          color: "gold",
          label: "Pendiente Oficina Técnica",
        },
        en_revision: {
          color: "blue",
          label: "En revisión Oficina Técnica",
        },
        informacion_pendiente: {
          color: "orange",
          label: "Información pendiente Oficina Técnica",
        },
        aprobada: {
          color: "green",
          label: "Aprobada Oficina Técnica",
        },
        rechazada: {
          color: "red",
          label: "Rechazada Oficina Técnica",
        },
      };
      const estadoTag = estadoTagConfig[estado] ?? {
        color: "default",
        label: estado,
      };

      return (
        <Space size={[4, 4]} wrap>
          <Tag color={estadoTag.color}>{estadoTag.label}</Tag>
          {solicitud.responsableTecnico && (
            <Tag>{solicitud.responsableTecnico}</Tag>
          )}
          {fechaSolicitud && <Tag>{formatDisplayDate(fechaSolicitud)}</Tag>}
          <Button
            size="small"
            onClick={() => navigate(`/beck/oficina-tecnica?id=${solicitud.id}`)}
          >
            Ver solicitud oficina técnica
          </Button>
        </Space>
      );
    };

    const renderArchivosDetail = (tipo: FunnelBeckArchivoTipo) => {
      const archivos = groupArchivosFunnel(archivosFunnel)[tipo] ?? [];

      if (archivosFunnelLoading) {
        return <Spin size="small" />;
      }

      if (!archivos.length) {
        return "Sin archivos adjuntos";
      }

      return (
        <ul className="space-y-1">
          {archivos.map((archivo) => (
            <li key={archivo.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 truncate">{getArchivoNombre(archivo)}</span>
              <Space size="small">
                <Button size="small" onClick={() => openArchivo(archivo.url)}>
                  Ver
                </Button>
                <Button size="small" onClick={() => downloadArchivo(archivo.url)}>
                  Descargar
                </Button>
              </Space>
            </li>
          ))}
        </ul>
      );
    };

    const renderFullOpportunityDetail = (deal: FunnelDeal) => (
      <div className="space-y-5">
        {renderDetailSection("DATOS GENERALES", [
          { label: "Empresa", value: deal.empresa },
          { label: "Proyecto", value: deal.nombreProyecto },
          {
            label: "Cliente",
            value:
              deal.clienteBeck?.nombreEmpresa ||
              deal.clienteBeck?.razonSocial ||
              deal.empresa,
          },
          { label: "Contacto", value: deal.contactoBeck?.nombre || deal.nombreContacto },
          { label: "Correo", value: deal.contactoBeck?.correo || deal.correoContacto },
          { label: "Teléfono", value: deal.contactoBeck?.telefono || deal.telefonoContacto },
          { label: "Vendedor", value: deal.vendedor },
          { label: "Región", value: deal.region },
          { label: "Comuna", value: deal.comuna },
          { label: "Valor", value: formatMoneyDetail(deal.valorEstimado, deal.moneda) },
          { label: "Moneda", value: deal.moneda },
          { label: "Fecha cierre", value: formatDateDetail(deal.fechaProbableCierre) },
          { label: "Dirección / ubicación", value: deal.direccionProyecto },
          { label: "Unidad de negocio", value: deal.unidadNegocio },
          { label: "Urgencia", value: deal.urgencia },
          { label: "Observaciones generales", value: deal.observaciones },
          { label: "Observación por campos faltantes", value: deal.observacionCamposFaltantes },
          { label: "Última actividad", value: formatDateTimeDetail(deal.updatedAt) },
        ])}

        {renderDetailSection("PRIMER CONTACTO", [
          { label: "Fecha primer contacto", value: formatDateDetail(deal.fechaPrimerContacto) },
          { label: "Tipo contacto", value: deal.tipoContacto },
          { label: "Necesidad detectada", value: deal.necesidadDetectada },
          { label: "Tipo cliente", value: deal.tipoCliente },
          { label: "Timing estimado", value: deal.timingEstimado },
          { label: "Nivel interés", value: deal.nivelInteres },
          { label: "Próxima acción", value: deal.proximaAccion },
          { label: "Fecha próxima acción", value: formatDateDetail(deal.fechaProximaAccion) },
        ])}

        {renderDetailSection("VISITA / LEVANTAMIENTO", [
          { label: "Fecha visita", value: formatDateDetail(deal.fechaVisita) },
          { label: "Responsable técnico / jefe de obra", value: deal.responsableTecnico },
          { label: "Asistentes", value: deal.asistentes },
          { label: "Lugar visita", value: deal.lugarVisita },
          { label: "Antecedentes levantados", value: deal.antecedentesLevantados },
          { label: "Documentos recibidos", value: deal.documentosRecibidos },
          { label: "Archivos documentos recibidos", value: renderArchivosDetail("DOCUMENTO_RECIBIDO") },
          { label: "Planos", value: deal.planos },
          { label: "Archivos planos", value: renderArchivosDetail("PLANO") },
          { label: "Bases técnicas", value: deal.basesTecnicas },
          { label: "Especificaciones", value: deal.especificaciones },
          { label: "Fotografías", value: deal.fotografias },
          { label: "Archivos fotografías", value: renderArchivosDetail("FOTOGRAFIA") },
          { label: "Observaciones técnicas", value: deal.observacionesTecnicas },
          { label: "¿Requiere oficina técnica?", value: formatBooleanDetail(deal.necesidadOficinaTecnica) },
          { label: "Oficina Técnica", value: renderOficinaTecnicaDetail(deal) },
          { label: "Próximos pasos", value: deal.proximosPasos },
        ])}

        {renderDetailSection("DESARROLLO DE PROPUESTA", [
          { label: "Estado desarrollo propuesta", value: deal.estadoDesarrolloPropuesta },
          { label: "Información pendiente", value: deal.informacionPendiente },
          { label: "Archivos documentos requeridos", value: renderArchivosDetail("DOCUMENTO_REQUERIDO") },
          { label: "Riesgo técnico", value: renderRiesgoTecnicoDetail(deal.riesgoTecnico) },
          { label: "Condiciones especiales", value: deal.condicionesEspeciales },
          { label: "¿Requiere validación gerencial?", value: formatBooleanDetail(deal.necesidadValidacionGerencial) },
          { label: "Fecha comprometida envío", value: formatDateDetail(deal.fechaComprometidaEnvio) },
          { label: "Comentarios internos", value: deal.comentariosInternos },
        ])}

        {renderDetailSection("NEGOCIACIÓN", [
          { label: "Fecha envío propuesta", value: formatDateDetail(deal.fechaEnvioPropuesta) },
          { label: "Versión propuesta", value: deal.versionPropuesta },
          { label: "Número propuesta", value: deal.numeroPropuesta },
          { label: "Monto propuesto", value: formatMoneyDetail(deal.montoPropuesto, deal.moneda) },
          { label: "Fecha vencimiento propuesta", value: formatDateDetail(deal.fechaVencimientoPropuesta) },
          { label: "Probabilidad cierre", value: typeof deal.probabilidadCierre === "number" ? `${deal.probabilidadCierre}%` : undefined },
          { label: "Comentarios cliente", value: deal.comentariosCliente },
          { label: "Objeciones", value: deal.objeciones },
          { label: "Contrapropuestas", value: deal.contrapropuestas },
          { label: "Ajustes solicitados", value: deal.ajustesSolicitados },
        ])}

        {renderDetailSection("DOCUMENTACIÓN", [
          { label: "Orden compra", value: deal.ordenCompra },
          { label: "Archivo orden compra", value: renderArchivosDetail("ORDEN_COMPRA") },
          { label: "Contrato", value: deal.contrato },
          { label: "Archivo contrato", value: renderArchivosDetail("CONTRATO") },
          { label: "Correo de aceptación del cliente", value: deal.correoAceptacion },
          { label: "Archivo correo aceptación", value: renderArchivosDetail("CORREO_ACEPTACION") },
          { label: "Anticipo", value: deal.anticipo },
          { label: "Archivo anticipo", value: renderArchivosDetail("ANTICIPO") },
          { label: "Aprobación interna cliente", value: deal.aprobacionInternaCliente },
          { label: "Condiciones pago", value: deal.condicionesPago },
          { label: "Documentos administrativos pendientes", value: deal.documentosAdministrativosPendientes },
          { label: "Responsable administrativo", value: deal.responsableAdministrativo },
          { label: "Fecha firma", value: formatDateDetail(deal.fechaFirma) },
          { label: "Fecha inicio proyecto", value: formatDateDetail(deal.fechaInicioProyecto) },
          { label: "Traspasado a operaciones", value: deal.traspasadoOperaciones ? "Si" : "No" },
          {
            label: "Fecha traspaso operaciones",
            value: deal.traspasadoOperaciones
              ? formatDateDetail(deal.fechaTraspasoOperaciones)
              : undefined,
          },
          {
            label: "Responsable operaciones",
            value: deal.traspasadoOperaciones
              ? deal.responsableTraspasoOperaciones
              : undefined,
          },
          {
            label: "Observaciones operaciones",
            value: deal.traspasadoOperaciones
              ? deal.observacionesTraspasoOperaciones
              : undefined,
          },
          { label: "Traspasado a administración", value: deal.traspasadoAdministracion ? "Si" : "No" },
          {
            label: "Fecha traspaso administración",
            value: deal.traspasadoAdministracion
              ? formatDateDetail(deal.fechaTraspasoAdministracion)
              : undefined,
          },
          {
            label: "Responsable administración",
            value: deal.traspasadoAdministracion
              ? deal.responsableTraspasoAdministracion
              : undefined,
          },
          {
            label: "Observaciones administración",
            value: deal.traspasadoAdministracion
              ? deal.observacionesTraspasoAdministracion
              : undefined,
          },
        ])}

        {renderDetailSection("CIERRE", [
          {
            label: "Estado cierre",
            value: deal.estadoCierre
              ? deal.estadoCierre.charAt(0).toUpperCase() + deal.estadoCierre.slice(1)
              : deal.etapa === "cerrada"
              ? "Cerrada"
              : undefined,
          },
          { label: "Monto final ganado", value: formatMoneyDetail(deal.montoFinalGanado, deal.moneda) },
          { label: "Fecha cierre", value: formatDateDetail(deal.fechaCierre) },
          { label: "Documento respaldo", value: deal.documentoRespaldo },
          { label: "Archivo documento respaldo", value: renderArchivosDetail("DOCUMENTO_RESPALDO") },
          { label: "Flujo posterior", value: renderFlujoPosteriorDetail(deal.flujoPosterior) },
          { label: "Motivo pérdida", value: deal.motivoPerdida },
          { label: "Etapa en que se perdió", value: deal.etapaPerdida },
          { label: "Motivo postergación", value: deal.motivoPostergacion },
          { label: "Fecha tentativa de reactivación", value: formatDateDetail(deal.fechaReactivacion) },
        ])}

        {renderDetailSection("CAMPOS ESPECÍFICOS BECK", [
          { label: "Tipo de proyecto", value: deal.tipoProyecto },
          { label: "Empresa mandante / contratista / subcontratista", value: deal.empresaMandante },
          { label: "Necesidad de levantamiento en terreno", value: formatBooleanDetail(deal.necesidadLevantamiento ?? undefined) },
          { label: "Cliente antiguo reactivado", value: formatBooleanDetail(deal.esReactivacion ?? undefined) },
          { label: "Oficina técnica asignada", value: deal.oficinaTecnicaAsignada },
          { label: "Duración estimada", value: deal.duracionEstimada },
          { label: "Estado de revisión técnica", value: deal.estadoRevisionTecnica },
          { label: "Garantías requeridas", value: deal.garantiasRequeridas },
          { label: "Estado de documentación de venta", value: deal.estadoDocumentacionVenta },
        ])}
      </div>
    );

    const formatRuleCount = (count: number, singular: string, plural: string) =>
      `${count} ${count === 1 ? singular : plural}`;

    const renderValidationGroupSummary = (
      title: string,
      groups: ValidationMessageGroup[],
      color: string
    ) => {
      if (!groups.length) return null;

      return (
        <div>
          <p className="mb-1 text-xs font-semibold" style={{ color }}>
            {title}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-beck-ink">
            {groups.map((group) => (
              <li key={`${title}-${group.etapa}`}>
                <span className="font-medium">{group.etapa}:</span>{" "}
                {formatRuleCount(group.messages.length, "pendiente", "pendientes")}
              </li>
            ))}
          </ul>
        </div>
      );
    };

    const renderValidationDetailGroups = (
      title: string,
      groups: ValidationMessageGroup[],
      color: string
    ) => {
      if (!groups.length) return null;

      return (
        <div>
          <p className="mb-2 text-xs font-semibold" style={{ color }}>
            {title}
          </p>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={`${title}-${group.etapa}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="mb-1 text-xs font-semibold text-slate-700">
                  {group.etapa}
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-beck-ink">
                  {group.messages.map((message, index) => (
                    <li key={`${group.etapa}-${index}`}>{message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const renderBloqueoValidationContent = () => {
      const totalBloqueos = bloqueoBloqueos.length;
      const totalAdvertencias = bloqueoAdvertencias.length;
      const totalReglas = totalBloqueos + totalAdvertencias;
      const showToggle = totalReglas > VALIDATION_DETAIL_INLINE_LIMIT;
      const bloqueoSummaryGroups = groupPrefixedValidationMessages(bloqueoBloqueos);
      const advertenciaSummaryGroups =
        groupPrefixedValidationMessages(bloqueoAdvertencias);
      const bloqueoDetailGroups = groupValidationMessages(bloqueoBloqueos);
      const advertenciaDetailGroups = groupValidationMessages(
        bloqueoAdvertencias,
        formatAdvertenciaMessage
      );

      return (
        <div className="space-y-4">
          <p className="text-sm text-beck-ink">
            Hay {formatRuleCount(totalBloqueos, "regla bloqueante", "reglas bloqueantes")} y{" "}
            {formatRuleCount(totalAdvertencias, "advertencia pendiente", "advertencias pendientes")}.
          </p>

          {renderValidationGroupSummary(
            "Reglas bloqueantes:",
            bloqueoSummaryGroups,
            "#cf1322"
          )}
          {renderValidationGroupSummary(
            "Advertencias:",
            advertenciaSummaryGroups,
            "#d48806"
          )}

          {showToggle && (
            <Button
              type="link"
              className="!px-0"
              onClick={() => setBloqueoDetalleVisible((current) => !current)}
            >
              {bloqueoDetalleVisible ? "Ocultar detalle" : "Ver detalle"}
            </Button>
          )}

          {bloqueoDetalleVisible && (
            <div className="space-y-4 border-t border-slate-200 pt-3">
              {renderValidationDetailGroups(
                "Reglas bloqueantes:",
                bloqueoDetailGroups,
                "#cf1322"
              )}
              {renderValidationDetailGroups(
                "Advertencias:",
                advertenciaDetailGroups,
                "#d48806"
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4 md:space-y-6">
        {!embedUnidadNegocio && (
        <section className="beck-panel-soft">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="beck-badge">
                <span className="inline-flex h-2 w-2 rounded-full bg-beck-primary" />
                <span>Seguimiento comercial</span>
              </div>

              <h1 className="mt-2 text-lg font-semibold tracking-wide text-beck-ink">
                Funnel
              </h1>

              <p className="mt-1 max-w-2xl text-xs text-beck-ink-soft">
                Visualiza oportunidades comerciales por etapa.
                {canEditFunnel && " Crea nuevas oportunidades y actualiza su avance directamente desde el tablero."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="beck-tab-group">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`beck-tab-button ${
                    viewMode === "kanban"
                      ? "beck-tab-button-active"
                      : ""
                  }`}
                >
                  Funnel
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`beck-tab-button ${
                    viewMode === "calendar"
                      ? "beck-tab-button-active"
                      : ""
                  }`}
                >
                  Calendario
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("dashboard")}
                  className={`beck-tab-button ${
                    viewMode === "dashboard"
                      ? "beck-tab-button-active"
                      : ""
                  }`}
                >
                  Dashboard
                </button>
              </div>

              <Button
                icon={<DownloadOutlined />}
                loading={exportandoExcel}
                onClick={() => { void handleExportarExcel(); }}
              >
                Exportar Excel
              </Button>

              {canEditFunnel && (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  disabled={dealSaving}
                  className="beck-btn-primary"
                >
                  Nueva oportunidad
                </button>
              )}

              {alertaBell && (
                <div style={{ marginLeft: 4 }}>{alertaBell}</div>
              )}
            </div>
          </div>

          {viewMode === "kanban" && (
            <div className="flex flex-wrap items-center gap-3 border-t border-beck-border-light px-5 py-2.5">
              <span className="text-xs font-medium text-slate-500">
                Unidad de negocio:
              </span>
              <Select
                size="small"
                style={{ minWidth: 160 }}
                value={filterUnidadNegocio}
                onChange={(v) => setFilterUnidadNegocio(v ?? "Beck")}
                options={[
                  { value: "Beck", label: "Beck" },
                  { value: "Firemat", label: "Firemat" },
                  { value: "Mixto", label: "Mixto" },
                  { value: "__sin_unidad__", label: "Sin unidad" },
                  { value: "Todas", label: "Todas" },
                ]}
              />
              <span className="text-xs font-medium text-slate-500">
                Estado de oportunidad:
              </span>
              <Select
                size="small"
                style={{ minWidth: 170 }}
                value={filterEstadoCierre || undefined}
                onChange={(v) => setFilterEstadoCierre(v ?? "")}
                allowClear
                placeholder="Todas"
                options={[
                  { value: "activas", label: "Activas" },
                  { value: "ganadas", label: "Ganadas" },
                  { value: "perdidas", label: "Perdidas" },
                  { value: "postergadas", label: "Postergadas" },
                ]}
              />
              <span className="text-xs text-slate-400">
                {visibleDeals.length} oportunidad
                {visibleDeals.length !== 1 ? "es" : ""}
              </span>
            </div>
          )}
        </section>
        )}

        {viewMode === "dashboard" ? (
          <section className="beck-panel px-5 py-4">
            <FunnelBeckDashboard
              vendedoresDisponibles={[...new Set(deals.map((d) => d.vendedor).filter((v): v is string => Boolean(v)))]}
              unidadesNegocioDisponibles={[...new Set(deals.map((d) => d.unidadNegocio).filter((v): v is string => Boolean(v)))]}
              origenesDisponibles={[...new Set(deals.map((d) => d.fuenteLead).filter((v): v is FunnelLeadSource => Boolean(v)))]}
              tiposClienteDisponibles={[...new Set(deals.map((d) => d.tipoCliente).filter((v): v is string => Boolean(v)))]}
              tiposOportunidadDisponibles={[...new Set(deals.map((d) => d.tipoOportunidad).filter((v): v is string => Boolean(v)))]}
              clientesDisponibles={[...new Set(deals.map((d) => d.empresa).filter((v): v is string => Boolean(v)))]}
              proyectosDisponibles={[...new Set(deals.map((d) => d.nombreProyecto).filter((v): v is string => Boolean(v)))]}
            />
          </section>
        ) : isLoading ? (
          <section className="beck-panel px-5 py-6 text-sm text-beck-ink-soft">
            Cargando funnel...
          </section>
        ) : viewMode === "kanban" ? (
          <section className="beck-panel">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex gap-4 overflow-x-auto p-4 scrollbar-thin">
                {(() => {
                  if (filterUnidadNegocio === "Firemat") {
                    const firematColumns = FIREMAT_COLUMNS.map(({ key, label }) => ({
                      key: key as string,
                      label,
                      colDeals: visibleDeals.filter((d) => d.etapaFiremat === key),
                    }));

                    return firematColumns.map(({ key, label, colDeals }) => (
                      <FunnelColumn
                        key={key}
                        columnKey={key}
                        label={label}
                        deals={colDeals}
                        canEditFunnel={canEditFunnel}
                        canOperateFiremat={canOperateFiremat}
                        onStageChange={handleStageChange}
                        onViewDetail={openDealDetail}
                        onCreateCotizacion={openCreateCotizacion}
                      />
                    ));
                  }

                  const isTodasMode = filterUnidadNegocio === "Todas";
                  const stageLabels = isTodasMode ? etapasLabelComun : etapasLabel;

                  const baseColumns = etapas
                    .filter((e) => e !== "cerrada")
                    .map((e) => ({
                      key: e as string,
                      label: stageLabels[e],
                      colDeals: visibleDeals.filter(
                        (d) => d.estadoCierre !== "ganada" && (d.etapaTablero ?? d.etapa) === e
                      ),
                    }));

                  const closedColumns = [
                    {
                      key: "cerrada_ganada",
                      label: "Ganada",
                      colDeals: visibleDeals.filter((d) => d.estadoCierre === "ganada"),
                    },
                  ];

                  return [...baseColumns, ...closedColumns].map(({ key, label, colDeals }) => (
                    <FunnelColumn
                      key={key}
                      columnKey={key}
                      label={label}
                      deals={colDeals}
                      canEditFunnel={canEditFunnel}
                      canOperateFiremat={canOperateFiremat}
                      onStageChange={handleStageChange}
                      onViewDetail={openDealDetail}
                      onCreateCotizacion={openCreateCotizacion}
                    />
                  ));
                })()}
              </div>
              <DragOverlay>
                {activeDragDeal ? (
                  <div className="w-[190px] rounded-lg border border-yellow-400 bg-white p-2 text-xs shadow-2xl">
                    <h4 className="font-semibold leading-tight text-beck-ink">
                      {activeDragDeal.nombreProyecto}
                    </h4>

                    {typeof activeDragDeal.valorEstimado === "number" && (
                      <p className="mt-1 font-medium text-beck-ink-soft">
                        {formatEstimatedValue(
                          activeDragDeal.valorEstimado,
                          activeDragDeal.moneda
                        )}
                      </p>
                    )}

                    {activeDragDeal.fechaProbableCierre && (
                      <p className="mt-0.5 text-beck-muted">
                        Cierre: {formatDisplayDate(activeDragDeal.fechaProbableCierre)}
                      </p>
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </section>
        ) : (
          <FunnelCalendario
            deals={deals}
            onOpenDetail={openDealDetail}
          />
        )}

        <FunnelModal
          open={isModalOpen && canEditFunnel}
          mode={funnelModalMode}
          draft={draft}
          fieldErrors={fieldErrors}
          validationMessage={
            showValidationSummary && Object.keys(fieldErrors).length > 0
              ? REQUIRED_FIELDS_MESSAGE
              : null
          }
          conversionReferencia={conversionReferencia}
          submitting={dealSaving}
          onClose={handleCloseModal}
          onSubmit={handleCreateDeal}
          onFieldChange={handleFieldChange}
          selectedClienteBeck={selectedClienteBeck}
          clienteBeckResults={clienteBeckResults}
          clienteBeckSearching={clienteBeckSearching}
          clientesDisponibles={clientesDisponibles}
          clientesLoading={clientesLoading}
          initialEditSection={initialEditSection}
          editVisibleSections={editVisibleSections}
          oportunidadId={funnelModalMode === "edit" ? editingDealId : null}
          archivosPorTipo={groupArchivosFunnel(archivosFunnel)}
          jefesObra={jefesObra}
          jefesObraLoading={jefesObraLoading}
          usuariosComerciales={usuariosComerciales}
          usuariosComercialesLoading={usuariosComercialesLoading}
          onClienteBeckSearchChange={handleClienteBeckSearchChange}
          onSelectClienteBeck={handleSelectClienteBeck}
          onSelectContactoBeck={handleSelectContactoBeck}
          onArchivosUploaded={handleArchivosUploaded}
          onArchivoDeleted={handleArchivoDeleted}
          onSaveOpportunityDraft={handleSaveOpportunityDraftForSolicitud}
          onSolicitudOficinaCreated={loadDeals}
        />

        <AntdModal
          open={Boolean(selectedDeal)}
          onCancel={closeDealDetail}
          footer={null}
          width="min(960px, 95vw)"
          styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
          title={selectedDeal ? `Oportunidad: ${selectedDeal.nombreProyecto}` : "Oportunidad"}
        >
          {selectedDeal && (
            <div className="space-y-5">
              {(selectedDeal.estadoCierre === "perdida" || selectedDeal.estadoCierre === "postergada") && (
                <div className={`rounded-xl border-2 overflow-hidden ${
                  selectedDeal.estadoCierre === "perdida"
                    ? "border-red-400"
                    : "border-orange-400"
                }`}>
                  <div className={`py-2.5 text-center text-sm font-black uppercase tracking-[0.2em] text-white ${
                    selectedDeal.estadoCierre === "perdida" ? "bg-red-600" : "bg-orange-500"
                  }`}>
                    ━━━━━━━━ {selectedDeal.estadoCierre === "perdida" ? "PERDIDA" : "POSTERGADA"} ━━━━━━━━
                  </div>
                  <div className={`px-4 py-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm ${
                    selectedDeal.estadoCierre === "perdida" ? "bg-red-50" : "bg-orange-50"
                  }`}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Estado</p>
                      <p className={`font-bold uppercase ${
                        selectedDeal.estadoCierre === "perdida" ? "text-red-700" : "text-orange-700"
                      }`}>{selectedDeal.estadoCierre}</p>
                    </div>
                    {selectedDeal.estadoCierre === "perdida" && selectedDeal.motivoPerdida && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Motivo</p>
                        <p className="text-slate-800">{selectedDeal.motivoPerdida}</p>
                      </div>
                    )}
                    {selectedDeal.estadoCierre === "postergada" && selectedDeal.motivoPostergacion && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Motivo</p>
                        <p className="text-slate-800">{selectedDeal.motivoPostergacion}</p>
                      </div>
                    )}
                    {selectedDeal.observacionCierre && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Observación</p>
                        <p className="text-slate-800">{selectedDeal.observacionCierre}</p>
                      </div>
                    )}
                    {selectedDeal.estadoCierre === "perdida" && selectedDeal.fechaCierre && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Fecha</p>
                        <p className="text-slate-800">{formatDisplayDate(selectedDeal.fechaCierre)}</p>
                      </div>
                    )}
                    {selectedDeal.estadoCierre === "postergada" && selectedDeal.fechaReactivacion && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Fecha reactivación</p>
                        <p className="text-slate-800">{formatDisplayDate(selectedDeal.fechaReactivacion)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="Empresa">
                  {selectedDeal.empresa || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Valor estimado">
                  {typeof selectedDeal.valorEstimado === "number"
                    ? formatEstimatedValue(selectedDeal.valorEstimado, selectedDeal.moneda)
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Etapa">
                  {etapasLabel[selectedDeal.etapa]}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha probable cierre">
                  {selectedDeal.fechaProbableCierre
                    ? formatDisplayDate(selectedDeal.fechaProbableCierre)
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Última actividad">
                  {selectedDeal.updatedAt
                    ? formatDateTimeDetail(selectedDeal.updatedAt)
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Region / Comuna">
                  {[selectedDeal.region, selectedDeal.comuna].filter(Boolean).join(" / ") || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Próxima acción">
                  {selectedDeal.proximaAccion || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha próxima acción">
                  {selectedDeal.fechaProximaAccion
                    ? formatDisplayDate(selectedDeal.fechaProximaAccion)
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Responsable técnico / jefe de obra" span={2}>
                  {selectedDeal.responsableTecnico || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Oficina Técnica" span={2}>
                  {renderOficinaTecnicaDetail(selectedDeal) || "-"}
                </Descriptions.Item>
                {selectedDeal.clienteBeck && (
                  <Descriptions.Item label="Cliente Beck" span={2}>
                    <span className="font-medium">
                      {selectedDeal.clienteBeck.nombreEmpresa || selectedDeal.clienteBeck.razonSocial || selectedDeal.empresa || "—"}
                    </span>
                    {" "}
                    <span className="text-xs text-slate-400">({selectedDeal.clienteBeck.rut ?? selectedDeal.rutEmpresa ?? "Sin RUT"})</span>
                  </Descriptions.Item>
                )}
                {selectedDeal.contactoBeck && (
                  <Descriptions.Item label="Contacto Beck" span={2}>
                    {selectedDeal.contactoBeck.nombre}
                    {selectedDeal.contactoBeck.cargo ? ` — ${selectedDeal.contactoBeck.cargo}` : ""}
                    {selectedDeal.contactoBeck.telefono ? ` · ${selectedDeal.contactoBeck.telefono}` : ""}
                  </Descriptions.Item>
                )}
                {selectedDeal.etapa === "cerrada" && (
                  <Descriptions.Item label="Estado de cierre" span={2}>
                    {selectedDeal.estadoCierre
                      ? selectedDeal.estadoCierre.charAt(0).toUpperCase() + selectedDeal.estadoCierre.slice(1)
                      : "Cerrada"}
                  </Descriptions.Item>
                )}
                {selectedDeal.motivoPerdida && (
                  <Descriptions.Item label="Motivo de pérdida" span={2}>
                    {selectedDeal.motivoPerdida}
                  </Descriptions.Item>
                )}
                {selectedDeal.etapaPerdida && (
                  <Descriptions.Item label="Etapa en que se perdió" span={2}>
                    {selectedDeal.etapaPerdida}
                  </Descriptions.Item>
                )}
                {selectedDeal.motivoPostergacion && (
                  <Descriptions.Item label="Motivo de postergación" span={2}>
                    {selectedDeal.motivoPostergacion}
                  </Descriptions.Item>
                )}
                {selectedDeal.fechaReactivacion && (
                  <Descriptions.Item label="Fecha tentativa de reactivación" span={2}>
                    {formatDisplayDate(selectedDeal.fechaReactivacion)}
                  </Descriptions.Item>
                )}
                {selectedDeal.documentoRespaldo && (
                  <Descriptions.Item label="Documento de respaldo" span={2}>
                    {selectedDeal.documentoRespaldo}
                  </Descriptions.Item>
                )}
                {selectedDeal.flujoPosterior && (
                  <Descriptions.Item label="Flujo posterior" span={2}>
                    {renderFlujoPosteriorDetail(selectedDeal.flujoPosterior) ?? selectedDeal.flujoPosterior}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {selectedDeal.obra && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Obra vinculada
                      </h3>
                      <p className="text-xs text-slate-600">
                        {[selectedDeal.obra.nombre, selectedDeal.obra.codigo, selectedDeal.obra.estado]
                          .filter(Boolean)
                          .join(" · ") || "Obra asociada a esta oportunidad"}
                      </p>
                    </div>
                    <Button
                      size="small"
                      onClick={() => {
                        closeDealDetail();
                        navigate("/beck/obras");
                      }}
                    >
                      Ir a obra
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cotizaciones vinculadas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cotizaciones Beck asociadas a esta oportunidad del funnel.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canEditFunnel && (
                    <Button
                      type="primary"
                      onClick={() => {
                        void handleEditDeal(
                          selectedDeal,
                          getStageEditSection(selectedDeal.etapa)
                        );
                      }}
                      disabled={dealSaving}
                    >
                      {getStageActionLabel(selectedDeal.etapa)}
                    </Button>
                  )}
                  {canEditFunnel && selectedDeal.etapa === "visita" && (
                    <>
                      {selectedDeal.responsableTecnico?.trim() && (
                        <Tag color="green">Asignado</Tag>
                      )}
                      <Button
                        onClick={openAsignarJefeObra}
                        disabled={dealSaving || asignandoJefeObra}
                      >
                        {selectedDeal.responsableTecnico?.trim()
                          ? "Editar asignación"
                          : "Asignar jefe de obra"}
                      </Button>
                    </>
                  )}
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => setFullDetailOpen(true)}
                  >
                    Ver detalle
                  </Button>
                  {canEditFunnel && (
                    <>
                      <Button
                        icon={<SwapOutlined />}
                        onClick={openCambiarVendedorModal}
                        disabled={dealSaving}
                      >
                        Cambiar vendedor
                      </Button>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                          void handleEditDeal(
                            selectedDeal,
                            getStageEditSection(selectedDeal.etapa),
                            getSectionsUpToStage(selectedDeal.etapa)
                          );
                        }}
                        disabled={dealSaving}
                      >
                        Editar
                      </Button>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        loading={dealDeletingId === selectedDeal.id}
                        onClick={() => {
                          AntdModal.confirm({
                            title: "Eliminar oportunidad",
                            content:
                              "Esta accion eliminara la oportunidad seleccionada. ¿Deseas continuar?",
                            okText: "Eliminar",
                            okButtonProps: { danger: true },
                            cancelText: "Cancelar",
                            onOk: async () => {
                              try {
                                setDealDeletingId(selectedDeal.id);
                                await funnelBeckAPI.eliminar(selectedDeal.id);
                                message.success("Oportunidad eliminada");
                                closeDealDetail();
                                await loadDeals();
                              } catch (error) {
                                message.error(
                                  getErrorMessage(error, "No se pudo eliminar la oportunidad")
                                );
                              } finally {
                                setDealDeletingId(null);
                              }
                            },
                          });
                        }}
                      >
                        Eliminar
                      </Button>
                      {!selectedDeal.estadoCierre && (
                        <Button
                          danger
                          onClick={() => handleAbrirCierreEstado(selectedDeal)}
                        >
                          Cerrar oportunidad
                        </Button>
                      )}
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        className="border-none"
                        onClick={() => openCreateCotizacion(selectedDeal)}
                      >
                        Crear cotizacion
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {canEditFunnel && selectedDeal && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">
                    Cambiar etapa
                  </p>
                  <Select
                    value={selectedDeal.etapa}
                    onChange={(value) => {
                      void handleChangeStage(value);
                    }}
                    disabled={updatingStage}
                    loading={updatingStage}
                    style={{ width: 220 }}
                    className="!w-full sm:!w-[220px]"
                    options={etapas.map((etapa) => ({
                      value: etapa,
                      label: etapasLabel[etapa],
                    }))}
                  />
                </div>
              )}

              {relatedCotizacionesLoading ? (
                <div className="flex justify-center py-8">
                  <Spin />
                </div>
              ) : relatedCotizaciones.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Numero
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Estado
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Total
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Fecha
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {relatedCotizaciones.map((cotizacion) => {
                        const versiones = [
                          ...(cotizacionVersionesById[cotizacion.id] ?? []),
                        ].sort((a, b) => b.version - a.version);

                        return (
                          <React.Fragment key={cotizacion.id}>
                            <tr>
                              <td className="px-3 py-2 text-slate-700">
                                <div className="flex items-center gap-1.5">
                                  <span>{cotizacion.numero}</span>
                                  <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                                    Actual
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {cotizacion.estado}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {formatCotizacionMoney(
                                  cotizacion.total,
                                  cotizacion.moneda
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {formatCotizacionDate(cotizacion.fecha)}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="small"
                                    icon={<EyeOutlined />}
                                    onClick={() => {
                                      void openCotizacionDetail(cotizacion.id);
                                    }}
                                  >
                                    Ver
                                  </Button>
                                  <Button
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() => {
                                      void handleVerCotizacionPDF(
                                        cotizacion.id,
                                        cotizacion.numero
                                      );
                                    }}
                                  >
                                    PDF
                                  </Button>
                                  {canEditFunnel && (
                                    <Button
                                      size="small"
                                      icon={<EditOutlined />}
                                      onClick={() => {
                                        void openEditCotizacion(cotizacion);
                                      }}
                                    >
                                      Editar
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {versiones.map((version, index) => {
                              const isLast = index === versiones.length - 1;

                              return (
                                <tr
                                  key={version.id}
                                  className="bg-slate-50 text-sm text-slate-500"
                                >
                                  <td className="py-1.5 pl-8 pr-3 font-mono text-slate-500">
                                    {isLast ? "└─" : "├─"} #{version.version}
                                  </td>
                                  <td className="px-3 py-1.5 text-slate-500">
                                    {version.estado}
                                  </td>
                                  <td className="px-3 py-1.5 text-slate-500">
                                    {formatCotizacionMoney(
                                      version.total,
                                      version.moneda
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-slate-500">
                                    {formatCotizacionDate(version.fecha)}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={() => {
                                          void openCotizacionDetail(version.id);
                                        }}
                                      >
                                        Ver
                                      </Button>
                                      <Button
                                        size="small"
                                        icon={<DownloadOutlined />}
                                        onClick={() => {
                                          void handleVerCotizacionPDF(
                                            version.id,
                                            version.numero
                                          );
                                        }}
                                      >
                                        PDF
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Esta oportunidad aun no tiene cotizaciones vinculadas.
                </div>
              )}

              {/* ── Historial (etapas + cambios de vendedor) ── */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Historial
                </h3>
                {historialEtapasLoading ? (
                  <div className="flex justify-center py-6">
                    <Spin size="small" />
                  </div>
                ) : historialEtapasError ? (
                  <p className="text-xs text-red-500">{historialEtapasError}</p>
                ) : historialEtapas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                    Sin historial
                  </div>
                ) : (
                  <Timeline
                    mode="left"
                    items={[...historialEtapas].reverse().map((h, index) => ({
                      key: `${h.tipo}-${h.createdAt}-${index}`,
                      dot: h.tipo === "CAMBIO_VENDEDOR" ? (
                        <SwapOutlined className="text-amber-500" />
                      ) : undefined,
                      label: (
                        <span className="text-xs text-slate-400">
                          {new Date(h.createdAt).toLocaleString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ),
                      children:
                        h.tipo === "CAMBIO_VENDEDOR" ? (
                          <div className="pb-1">
                            <p className="text-sm font-medium text-slate-800">
                              Cambio de vendedor
                            </p>
                            <p className="text-sm text-slate-700">
                              {h.vendedorAnterior
                                ? `${h.vendedorAnterior} → ${h.vendedorNuevo}`
                                : h.vendedorNuevo}
                            </p>
                            {h.usuario?.nombre && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                Realizado por {h.usuario.nombre}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="pb-1">
                            <p className="text-sm font-medium text-slate-800">
                              {h.etapaAnterior
                                ? `${formatEtapaHistorial(h.etapaAnterior)} → ${formatEtapaHistorial(h.etapaNueva ?? "")}`
                                : `Inicio: ${formatEtapaHistorial(h.etapaNueva ?? "")}`}
                            </p>
                            {h.usuario?.nombre && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                Por: {h.usuario.nombre}
                              </p>
                            )}
                          </div>
                        ),
                    }))}
                  />
                )}
              </div>
            </div>
          )}
        </AntdModal>

        <AntdModal
          open={asignarJefeModalOpen}
          onCancel={closeAsignarJefeObra}
          title="Asignar jefe de obra / responsable técnico"
          okText="Guardar asignación"
          cancelText="Cancelar"
          onOk={() => {
            void handleGuardarAsignacionJefeObra();
          }}
          okButtonProps={{
            disabled: jefesObra.length === 0 || !jefeObraAsignado,
            loading: asignandoJefeObra,
          }}
          cancelButtonProps={{ disabled: asignandoJefeObra }}
          width="min(520px, 95vw)"
        >
          <div className="space-y-3">
            {jefesObra.length ? (
              <Select
                showSearch
                value={jefeObraAsignado || undefined}
                placeholder="Selecciona jefe de obra"
                loading={jefesObraLoading}
                disabled={asignandoJefeObra}
                onChange={(value) => setJefeObraAsignado(value)}
                className="w-full"
                options={jefesObra.map((jefe) => ({
                  value: `${jefe.nombre} <${jefe.email}>`,
                  label: `${jefe.nombre} (${jefe.email})`,
                }))}
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            ) : (
              <Typography.Text type="secondary">
                No hay jefes de obra activos disponibles.
              </Typography.Text>
            )}
          </div>
        </AntdModal>

        <AntdModal
          open={cambiarVendedorModalOpen}
          onCancel={closeCambiarVendedorModal}
          title="Cambiar vendedor"
          okText="Guardar"
          cancelText="Cancelar"
          onOk={() => {
            void handleGuardarCambioVendedor();
          }}
          okButtonProps={{
            disabled: !cambiarVendedorValue || cambiarVendedorSaving,
            loading: cambiarVendedorSaving,
          }}
          cancelButtonProps={{ disabled: cambiarVendedorSaving }}
          width="min(480px, 95vw)"
        >
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Vendedor actual
              </p>
              <Input
                value={selectedDeal?.vendedor || "-"}
                disabled
                readOnly
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Nuevo vendedor
              </p>
              <Select
                showSearch
                value={cambiarVendedorValue}
                placeholder="Selecciona un vendedor"
                loading={usuariosComercialesLoading}
                disabled={cambiarVendedorSaving}
                onChange={(value) => setCambiarVendedorValue(value)}
                className="w-full"
                options={usuariosComerciales
                  .filter((u) => u.nombre || u.email)
                  .map((u) => ({
                    value: u.nombre || u.email,
                    label: u.nombre || u.email,
                    searchText: `${u.nombre ?? ""} ${u.email ?? ""}`.toLowerCase(),
                  }))}
                filterOption={(input, option) => {
                  if (!option) return false;
                  const searchText =
                    typeof option.searchText === "string" ? option.searchText : "";
                  return searchText.includes(input.toLowerCase());
                }}
              />
            </div>
          </div>
        </AntdModal>

        <AntdModal
          open={fullDetailOpen && Boolean(selectedDeal)}
          onCancel={() => setFullDetailOpen(false)}
          footer={null}
          width="min(980px, 95vw)"
          styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
          title={selectedDeal ? `Detalle completo: ${selectedDeal.nombreProyecto}` : "Detalle completo"}
        >
          {selectedDeal ? renderFullOpportunityDetail(selectedDeal) : null}
        </AntdModal>

        <AntdModal
          open={Boolean(selectedCotizacion) || selectedCotizacionLoading}
          onCancel={closeCotizacionDetail}
          footer={null}
          width="min(720px, 95vw)"
          styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
          title="Detalle de cotizacion"
        >
          {selectedCotizacionLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : selectedCotizacion ? (
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Numero">
                {selectedCotizacion.numero}
              </Descriptions.Item>
              <Descriptions.Item label="Codigo">
                {selectedCotizacion.codigo || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Cliente">
                {selectedCotizacion.cliente}
              </Descriptions.Item>
              <Descriptions.Item label="Proyecto">
                {selectedCotizacion.proyecto || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                {selectedCotizacion.estado}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                {formatCotizacionMoney(
                  selectedCotizacion.total,
                  selectedCotizacion.moneda
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {formatCotizacionDate(selectedCotizacion.fecha)}
              </Descriptions.Item>
              <Descriptions.Item label="Vigencia">
                {formatCotizacionDate(selectedCotizacion.vigencia)}
              </Descriptions.Item>
              <Descriptions.Item label="Notas">
                {selectedCotizacion.notas || "-"}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </AntdModal>

        {cotizacionEditorOpen && (
          <CotizacionEditorModal
            key={`${cotizacionEditorMode}-${editingCotizacion?.id ?? cotizacionEditorContextDeal?.id ?? "new"}`}
            open={cotizacionEditorOpen}
            mode={cotizacionEditorMode}
            initialValues={cotizacionEditorInitialValues}
            submitting={cotizacionSaving}
            lockFunnelSelection={cotizacionEditorLockedFunnel}
            canManageGanancia={canManageGanancia}
            onClose={() => {
              if (cotizacionSaving) {
                return;
              }

              setCotizacionEditorOpen(false);
              setEditingCotizacion(null);
              setCotizacionEditorContextDeal(null);
              setCotizacionEditorLockedFunnel(false);
            }}
            onSubmit={(values) => {
              void handleSaveCotizacion(values);
            }}
          />
        )}

        {/* Modal bloqueante: No se puede avanzar (nuevo formato 409) */}
        <AntdModal
          title="No se puede avanzar"
          open={bloqueoModalOpen}
          onCancel={() => {
            setBloqueoModalOpen(false);
            setBloqueoDetalleVisible(false);
          }}
          destroyOnClose
          footer={[
            <Button
              key="entendido"
              type="primary"
              danger
              onClick={() => {
                setBloqueoModalOpen(false);
                setBloqueoDetalleVisible(false);
              }}
            >
              Entendido
            </Button>,
          ]}
        >
          {renderBloqueoValidationContent()}
        </AntdModal>

        {/* Modal bloqueante Firemat (mover tarjeta Firemat desde el tablero Beck) */}
        <AntdModal
          title="No se puede avanzar la etapa Firemat"
          open={firematBloqueoOpen}
          destroyOnClose
          onCancel={() => {
            setFirematBloqueoOpen(false);
            setFirematBloqueoPendiente(null);
            setFirematBloqueoObservacion("");
          }}
          footer={[
            <Button
              key="cancelar"
              onClick={() => {
                setFirematBloqueoOpen(false);
                setFirematBloqueoPendiente(null);
                setFirematBloqueoObservacion("");
              }}
            >
              Cancelar
            </Button>,
            <Button
              key="reintentar"
              type="primary"
              danger
              loading={firematBloqueoRetrying}
              disabled={!firematBloqueoObservacion.trim()}
              onClick={handleRetryFirematBloqueo}
            >
              Avanzar con observación
            </Button>,
          ]}
        >
          <div className="space-y-4">
            {firematBloqueoBloqueos.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold" style={{ color: "#cf1322" }}>
                  Reglas bloqueantes:
                </p>
                <ul className="list-disc pl-5 text-sm text-beck-ink space-y-1">
                  {firematBloqueoBloqueos.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {firematBloqueoAdvertencias.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold" style={{ color: "#d48806" }}>
                  Advertencias:
                </p>
                <ul className="list-disc pl-5 text-sm text-beck-ink space-y-1">
                  {firematBloqueoAdvertencias.map((a) => (
                    <li key={a}>{formatAdvertenciaMessage(a)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold text-beck-ink">
                Observación de campos faltantes (obligatoria para reintentar):
              </p>
              <Input.TextArea
                rows={3}
                value={firematBloqueoObservacion}
                onChange={(e) => setFirematBloqueoObservacion(e.target.value)}
                placeholder="Describe por que se avanza igualmente..."
              />
            </div>
          </div>
        </AntdModal>

        {/* Reutiliza el formulario/modal completo de /firemat/funnel para ver y
            editar una oportunidad Firemat sin salir de /beck/funnel. Se monta
            oculto: su propio <Modal> interno se sigue renderizando por encima
            via portal de antd. */}
        {firematEmbedId && (
          <div style={{ display: "none" }} aria-hidden="true">
            <FirematFunnel
              embedOportunidadId={firematEmbedId}
              onEmbedClose={() => {
                setFirematEmbedId(null);
                void loadDeals();
              }}
            />
          </div>
        )}

        {/* Modal guardado con advertencias (200 con advertencias) */}
        <AntdModal
          title="Guardado con advertencias"
          open={advertenciasGuardadoOpen}
          onCancel={() => setAdvertenciasGuardadoOpen(false)}
          destroyOnClose
          footer={[
            <Button
              key="ok"
              type="primary"
              onClick={() => setAdvertenciasGuardadoOpen(false)}
            >
              Entendido
            </Button>,
          ]}
        >
          <div className="space-y-3">
            <p className="text-sm text-beck-ink">
              La oportunidad fue guardada, pero con las siguientes advertencias:
            </p>
            <ul className="list-disc pl-5 text-sm text-beck-ink space-y-1">
              {advertenciasGuardado.map((a) => (
                <li key={a}>{formatAdvertenciaMessage(a)}</li>
              ))}
            </ul>
          </div>
        </AntdModal>

        <CierreDeProyecto
          open={cierreModalOpen && canEditFunnel}
          estadoCierre={estadoCierreModal}
          motivoPerdida={motivoPerdidaModal}
          etapaPerdida={etapaPerdidaModal}
          motivoPostergacion={motivoPostergacionModal}
          fechaReactivacion={fechaReactivacionModal}
          documentoRespaldo={documentoRespaldoModal}
          flujoPosterior={flujoPosteriorModal}
          montoFinalGanado={montoFinalGanadoModal}
          fechaCierre={fechaCierreModal}
          onChangeEstado={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setEstadoCierreModal(value);
          }}
          onChangeMotivo={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setMotivoPerdidaModal(value);
          }}
          onChangeEtapaPerdida={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setEtapaPerdidaModal(value);
          }}
          onChangeMotivoPostergacion={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setMotivoPostergacionModal(value);
          }}
          onChangeFechaReactivacion={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setFechaReactivacionModal(value);
          }}
          onChangeDocumentoRespaldo={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setDocumentoRespaldoModal(value);
          }}
          onChangeFlujoPosterior={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setFlujoPosteriorModal(value);
          }}
          onChangeMontoFinalGanado={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setMontoFinalGanadoModal(value);
          }}
          onChangeFechaCierre={(value) => {
            if (!canEditFunnel || dealSaving) return;
            setFechaCierreModal(value);
          }}
          onConfirm={() => {
            if (!canEditFunnel || dealSaving) return;

            if (
              estadoCierreModal !== "ganada" &&
              estadoCierreModal !== "perdida" &&
              estadoCierreModal !== "postergada"
            ) {
              message.error("Debes indicar el resultado de la oportunidad.");
              return;
            }

            if (estadoCierreModal === "perdida" && !motivoPerdidaModal.trim()) {
              message.error("Si la oportunidad fue perdida, debes indicar un motivo.");
              return;
            }

            if (estadoCierreModal === "ganada") {
              const montoFinalGanado = Number(
                montoFinalGanadoModal.trim().replace(",", ".")
              );
              if (!montoFinalGanadoModal.trim() || !Number.isFinite(montoFinalGanado) || montoFinalGanado <= 0) {
                message.error("Si la oportunidad fue ganada, debes indicar un monto final ganado.");
                return;
              }
              if (!fechaCierreModal.trim()) {
                message.error("Si la oportunidad fue ganada, debes indicar la fecha de cierre.");
                return;
              }
              if (!documentoRespaldoModal.trim()) {
                message.error("Si la oportunidad fue ganada, debes indicar el documento de respaldo.");
                return;
              }
              if (!flujoPosteriorModal.trim()) {
                message.error("Si la oportunidad fue ganada, debes indicar el flujo posterior.");
                return;
              }
            }

            const parsedMontoFinalGanado = montoFinalGanadoModal.trim()
              ? Number(montoFinalGanadoModal.trim().replace(",", "."))
              : undefined;

            if (
              parsedMontoFinalGanado !== undefined &&
              (!Number.isFinite(parsedMontoFinalGanado) ||
                parsedMontoFinalGanado <= 0)
            ) {
              message.error("El monto final ganado debe ser mayor a 0.");
              return;
            }

            void handleConfirmarCierre({
              estadoCierre: estadoCierreModal,
              motivoPerdida:
                estadoCierreModal === "perdida"
                  ? motivoPerdidaModal.trim()
                  : undefined,
              etapaPerdida:
                estadoCierreModal === "perdida"
                  ? etapaPerdidaModal.trim()
                  : undefined,
              motivoPostergacion:
                estadoCierreModal === "postergada"
                  ? motivoPostergacionModal.trim()
                  : undefined,
              fechaReactivacion:
                estadoCierreModal === "postergada"
                  ? fechaReactivacionModal.trim()
                  : undefined,
              documentoRespaldo: documentoRespaldoModal.trim() || undefined,
              flujoPosterior: flujoPosteriorModal.trim() || undefined,
              montoFinalGanado:
                estadoCierreModal === "ganada"
                  ? parsedMontoFinalGanado
                  : undefined,
              fechaCierre:
                estadoCierreModal === "ganada"
                  ? fechaCierreModal.trim()
                  : undefined,
            });
          }}
          onCancel={handleCloseCierreModal}
        />

        <AntdModal
          open={cierreEstadoOpen}
          onCancel={() => setCierreEstadoOpen(false)}
          footer={null}
          width="min(480px, 95vw)"
          title="Cerrar oportunidad"
          destroyOnClose
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Tipo de cierre <span className="text-red-500">*</span>
              </label>
              <Select
                className="w-full"
                placeholder="Selecciona el tipo de cierre"
                value={cierreEstadoStep || undefined}
                onChange={(value) => {
                  setCierreEstadoStep(value);
                  setCierreEstadoSelectMotivo("");
                  setCierreEstadoDetalleOtro("");
                  setCierreEstadoFechaReactivacion("");
                }}
                options={[
                  { value: "perdida", label: "Perdida" },
                  { value: "postergada", label: "Postergada" },
                ]}
              />
            </div>

            {cierreEstadoStep === "perdida" && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Motivo de pérdida <span className="text-red-500">*</span>
                  </label>
                  <Select
                    className="w-full"
                    placeholder="Selecciona un motivo"
                    value={cierreEstadoSelectMotivo || undefined}
                    onChange={(value) => {
                      setCierreEstadoSelectMotivo(value ?? "");
                      setCierreEstadoDetalleOtro("");
                    }}
                    options={MOTIVOS_PERDIDA}
                  />
                </div>
                {cierreEstadoSelectMotivo === "Otro" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Especifica el motivo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={cierreEstadoDetalleOtro}
                      onChange={(e) => setCierreEstadoDetalleOtro(e.target.value)}
                      placeholder="Describe el motivo..."
                    />
                  </div>
                )}
              </>
            )}

            {cierreEstadoStep === "postergada" && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Motivo de postergación <span className="text-red-500">*</span>
                  </label>
                  <Select
                    className="w-full"
                    placeholder="Selecciona un motivo"
                    value={cierreEstadoSelectMotivo || undefined}
                    onChange={(value) => {
                      setCierreEstadoSelectMotivo(value ?? "");
                      setCierreEstadoDetalleOtro("");
                    }}
                    options={MOTIVOS_POSTERGACION}
                  />
                </div>
                {cierreEstadoSelectMotivo === "Otro" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Especifica el motivo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={cierreEstadoDetalleOtro}
                      onChange={(e) => setCierreEstadoDetalleOtro(e.target.value)}
                      placeholder="Describe el motivo..."
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Fecha de reactivación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-beck-border-light bg-white px-3 py-2.5 text-sm text-beck-ink-soft outline-none transition focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]"
                    value={cierreEstadoFechaReactivacion}
                    onChange={(e) => setCierreEstadoFechaReactivacion(e.target.value)}
                  />
                </div>
              </>
            )}

            {cierreEstadoStep && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Observación
                </label>
                <textarea
                  className="w-full rounded-xl border border-beck-border-light bg-white px-3 py-2.5 text-sm text-beck-ink-soft outline-none transition focus:border-[#d6c680] focus:ring-2 focus:ring-[#f6ebba]"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  value={cierreEstadoObservacion}
                  onChange={(e) => setCierreEstadoObservacion(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={() => setCierreEstadoOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                danger={cierreEstadoStep === "perdida"}
                loading={cierreEstadoSaving}
                disabled={!cierreEstadoStep}
                onClick={() => void handleGuardarEstadoCierre()}
                className={cierreEstadoStep === "postergada" ? "!bg-orange-500 !border-orange-500 hover:!bg-orange-600" : ""}
              >
                Confirmar cierre
              </Button>
            </div>
          </div>
        </AntdModal>
      </div>
    );
  };

  export default FunnelPage;
