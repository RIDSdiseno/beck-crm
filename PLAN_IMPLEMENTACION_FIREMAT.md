# PLAN DE IMPLEMENTACIÓN: Firemat CRM Pipeline (Secciones 8.1–8.8)

## CONTEXTO DEL PROYECTO

**Stack:**
- Frontend: React + TypeScript + Ant Design + Vite
- Backend: Express.js + Prisma ORM + PostgreSQL
- Archivos clave:
  - `back_beck_crm/prisma/firemat.schema.prisma` → modelo `FunnelFirematOpportunity`
  - `back_beck_crm/src/controllers/firemat/funnel-firemat.controller.ts`
  - `beck-crm/src/services/api.ts` → tipo `FirematFunnelPayload`
  - `beck-crm/src/pages/firemat/Funnel.tsx` → tipo `FunnelFormValues` + formulario

**Regla crítica:** No modificar texto ni lógica existente. Solo AGREGAR campos nuevos y la etapa DESCARTADO. No romper campos ya funcionando.

---

## PASO 1 — PRISMA SCHEMA (`firemat.schema.prisma`)

Agregar los siguientes campos al modelo `FunnelFirematOpportunity` **después del campo `updatedAt`**:

```prisma
// === SECCIÓN 8.1: Datos del cliente ===
rutEmpresa              String?
region                  String?
comuna                  String?
unidadNegocio           String?
// fechaIngreso → usar createdAt existente (no agregar campo nuevo)

// === SECCIÓN 8.2: Calificación ===
urgencia                String?   // valores: INMEDIATA / 1-3 MESES / 3-6 MESES / +6 MESES
tipoUso                 String?   // valores: PROPIO / ARRIENDO / MIXTO
necesidadSoporteTecnico Boolean?

// === SECCIÓN 8.3: Cotización ===
alternativaProducto     String?
comision                Float?
margenEstimado          Float?
fechaComprometidaEnvio  DateTime?

// === SECCIÓN 8.4: Seguimiento cotización ===
versionCotizacion       String?
comentariosCliente      String?
objeciones              String?

// === SECCIÓN 8.5: Orden confirmada ===
ordenCompra             String?
correoAceptacion        String?
condicionesComerciales  String?
coordinacionAdministrativa String?
estadoDocumentacion     String?
traspasoAdministracion  Boolean?
traspasoERP             Boolean?
coordinacionDespacho    String?
estadoComercialOrden    String?
estadoDocumentacionVenta String?

// === SECCIÓN 8.6: Cierre ===
// fechaCierre ya existe y se auto-asigna cuando etapa === 'GANADA' ✅
flujoPosterior          String?   // valores: POSTVENTA / ARRIENDO / NUEVO_PROYECTO

// === SECCIÓN 8.7: Descartado (nueva etapa) ===
motivoDescarte          String?
// fechaDescarte → usar updatedAt cuando etapa cambia a DESCARTADO

// === SECCIÓN 8.8: Campos de reportería ===
tipoBroker              String?
fechaEstimadaDespacho   DateTime?
fechaSeguimientoPostventa DateTime?
```

**Después de editar el schema, ejecutar:**
```bash
npx prisma migrate dev --name "add_firemat_pipeline_fields" --schema=prisma/firemat.schema.prisma
```

---

## PASO 2 — BACKEND CONTROLLER (`funnel-firemat.controller.ts`)

### 2.1 — Agregar DESCARTADO a etapas permitidas

```typescript
// ANTES:
const ETAPAS_PERMITIDAS = ['PROSPECTO','PRIMER_CONTACTO','DESARROLLO_COTIZACION','COTIZACION_ENVIADA','ORDEN_CONFIRMADA','GANADA','PERDIDA','POSTERGADA'];

// DESPUÉS:
const ETAPAS_PERMITIDAS = ['PROSPECTO','PRIMER_CONTACTO','DESARROLLO_COTIZACION','COTIZACION_ENVIADA','ORDEN_CONFIRMADA','GANADA','PERDIDA','POSTERGADA','DESCARTADO'];
```

### 2.2 — Agregar campos en `buildCreateData`

Dentro de `buildCreateData`, agregar junto a los campos existentes:

```typescript
// 8.1
...(rutEmpresa && { rutEmpresa }),
...(region && { region }),
...(comuna && { comuna }),
...(unidadNegocio && { unidadNegocio }),

// 8.2
...(urgencia && { urgencia }),
...(tipoUso && { tipoUso }),
...(necesidadSoporteTecnico !== undefined && { necesidadSoporteTecnico }),

// 8.3
...(alternativaProducto && { alternativaProducto }),
...(comision !== undefined && { comision }),
...(margenEstimado !== undefined && { margenEstimado }),
...(fechaComprometidaEnvio && { fechaComprometidaEnvio: new Date(fechaComprometidaEnvio) }),

// 8.4
...(versionCotizacion && { versionCotizacion }),
...(comentariosCliente && { comentariosCliente }),
...(objeciones && { objeciones }),

// 8.5
...(ordenCompra && { ordenCompra }),
...(correoAceptacion && { correoAceptacion }),
...(condicionesComerciales && { condicionesComerciales }),
...(coordinacionAdministrativa && { coordinacionAdministrativa }),
...(estadoDocumentacion && { estadoDocumentacion }),
...(traspasoAdministracion !== undefined && { traspasoAdministracion }),
...(traspasoERP !== undefined && { traspasoERP }),
...(coordinacionDespacho && { coordinacionDespacho }),
...(estadoComercialOrden && { estadoComercialOrden }),
...(estadoDocumentacionVenta && { estadoDocumentacionVenta }),

// 8.6
...(flujoPosterior && { flujoPosterior }),

// 8.7
...(motivoDescarte && { motivoDescarte }),

// 8.8
...(tipoBroker && { tipoBroker }),
...(fechaEstimadaDespacho && { fechaEstimadaDespacho: new Date(fechaEstimadaDespacho) }),
...(fechaSeguimientoPostventa && { fechaSeguimientoPostventa: new Date(fechaSeguimientoPostventa) }),
```

### 2.3 — Agregar los mismos campos en `buildUpdateData`

Copiar exactamente el mismo bloque del paso 2.2 dentro de `buildUpdateData`.

### 2.4 — Agregar validación para etapa DESCARTADO

Junto a la validación existente de PERDIDA y POSTERGADA, agregar:

```typescript
if (etapa === 'DESCARTADO' && !motivoDescarte) {
  return res.status(400).json({ error: 'motivoDescarte es requerido al descartar una oportunidad' });
}
```

### 2.5 — Auto-asignar fechaCierre también para GANADA (ya existe) — verificar que no se rompa

El controller ya tiene: `if (etapa === 'GANADA') data.fechaCierre = new Date();` → NO modificar.

---

## PASO 3 — FRONTEND `api.ts`

### 3.1 — Actualizar `FirematFunnelPayload`

Agregar al tipo los campos nuevos:

```typescript
// Agregar en FirematFunnelPayload:
rutEmpresa?: string;
region?: string;
comuna?: string;
unidadNegocio?: string;
urgencia?: string;
tipoUso?: string;
necesidadSoporteTecnico?: boolean;
alternativaProducto?: string;
comision?: number;
margenEstimado?: number;
fechaComprometidaEnvio?: string;
versionCotizacion?: string;
comentariosCliente?: string;
objeciones?: string;
ordenCompra?: string;
correoAceptacion?: string;
condicionesComerciales?: string;
coordinacionAdministrativa?: string;
estadoDocumentacion?: string;
traspasoAdministracion?: boolean;
traspasoERP?: boolean;
coordinacionDespacho?: string;
estadoComercialOrden?: string;
estadoDocumentacionVenta?: string;
flujoPosterior?: string;
motivoDescarte?: string;
tipoBroker?: string;
fechaEstimadaDespacho?: string;
fechaSeguimientoPostventa?: string;
```

### 3.2 — Actualizar `FirematFunnelOportunidad` (tipo de respuesta)

Agregar los mismos campos opcionales al tipo que representa la oportunidad que llega del backend.

---

## PASO 4 — FRONTEND `Funnel.tsx`

### 4.1 — Actualizar tipo `FunnelFormValues`

Agregar los mismos campos del paso 3.1 al tipo `FunnelFormValues`.

### 4.2 — Agregar etapa DESCARTADO al selector de etapas

Buscar donde se definen las opciones de `etapa` (Select con las etapas actuales) y agregar:

```tsx
<Select.Option value="DESCARTADO">Descartado</Select.Option>
```

### 4.3 — Agregar campos al formulario por sección

**SECCIÓN 8.1 — Datos del cliente** (junto a los campos `cliente`, `contacto`):
```tsx
<Form.Item name="rutEmpresa" label="RUT Empresa">
  <Input placeholder="Ej: 76.123.456-7" />
</Form.Item>
<Form.Item name="region" label="Región">
  <Input />
</Form.Item>
<Form.Item name="comuna" label="Comuna">
  <Input />
</Form.Item>
<Form.Item name="unidadNegocio" label="Unidad de Negocio">
  <Input />
</Form.Item>
```
> Nota: `fechaIngreso` → mostrar `createdAt` de la oportunidad como campo de solo lectura.

**SECCIÓN 8.2 — Calificación**:
```tsx
<Form.Item name="urgencia" label="Urgencia">
  <Select>
    <Select.Option value="INMEDIATA">Inmediata</Select.Option>
    <Select.Option value="1-3 MESES">1-3 meses</Select.Option>
    <Select.Option value="3-6 MESES">3-6 meses</Select.Option>
    <Select.Option value="+6 MESES">+6 meses</Select.Option>
  </Select>
</Form.Item>
<Form.Item name="tipoUso" label="Tipo de Uso">
  <Select>
    <Select.Option value="PROPIO">Propio</Select.Option>
    <Select.Option value="ARRIENDO">Arriendo</Select.Option>
    <Select.Option value="MIXTO">Mixto</Select.Option>
  </Select>
</Form.Item>
<Form.Item name="necesidadSoporteTecnico" label="Necesidad Soporte Técnico" valuePropName="checked">
  <Checkbox />
</Form.Item>
```

**SECCIÓN 8.3 — Cotización**:
```tsx
<Form.Item name="alternativaProducto" label="Alternativa de Producto">
  <Input.TextArea rows={2} />
</Form.Item>
<Form.Item name="comision" label="Comisión (%)">
  <InputNumber min={0} max={100} style={{ width: '100%' }} />
</Form.Item>
<Form.Item name="margenEstimado" label="Margen Estimado (%)">
  <InputNumber min={0} max={100} style={{ width: '100%' }} />
</Form.Item>
<Form.Item name="fechaComprometidaEnvio" label="Fecha Comprometida de Envío">
  <DatePicker style={{ width: '100%' }} />
</Form.Item>
```

**SECCIÓN 8.4 — Seguimiento Cotización**:
```tsx
<Form.Item name="versionCotizacion" label="Versión Cotización">
  <Input placeholder="Ej: v1, v2, v3" />
</Form.Item>
<Form.Item name="comentariosCliente" label="Comentarios del Cliente">
  <Input.TextArea rows={3} />
</Form.Item>
<Form.Item name="objeciones" label="Objeciones">
  <Input.TextArea rows={3} />
</Form.Item>
```

**SECCIÓN 8.5 — Orden Confirmada** (mostrar condicionalmente cuando `etapa === 'ORDEN_CONFIRMADA'`):
```tsx
<Form.Item name="ordenCompra" label="N° Orden de Compra">
  <Input />
</Form.Item>
<Form.Item name="correoAceptacion" label="Correo de Aceptación">
  <Input />
</Form.Item>
<Form.Item name="condicionesComerciales" label="Condiciones Comerciales">
  <Input.TextArea rows={3} />
</Form.Item>
<Form.Item name="coordinacionAdministrativa" label="Coordinación Administrativa">
  <Input.TextArea rows={2} />
</Form.Item>
<Form.Item name="estadoDocumentacion" label="Estado Documentación">
  <Select>
    <Select.Option value="PENDIENTE">Pendiente</Select.Option>
    <Select.Option value="EN_PROCESO">En proceso</Select.Option>
    <Select.Option value="COMPLETO">Completo</Select.Option>
  </Select>
</Form.Item>
<Form.Item name="traspasoAdministracion" label="Traspaso Administración" valuePropName="checked">
  <Checkbox />
</Form.Item>
<Form.Item name="traspasoERP" label="Traspaso ERP" valuePropName="checked">
  <Checkbox />
</Form.Item>
<Form.Item name="coordinacionDespacho" label="Coordinación Despacho">
  <Input.TextArea rows={2} />
</Form.Item>
<Form.Item name="estadoComercialOrden" label="Estado Comercial Orden">
  <Input />
</Form.Item>
<Form.Item name="estadoDocumentacionVenta" label="Estado Documentación Venta">
  <Input />
</Form.Item>
```

**SECCIÓN 8.6 — Cierre** (mostrar condicionalmente cuando `etapa === 'GANADA'`):
```tsx
{/* fechaCierre ya se muestra — verificar que esté en el form como campo readonly */}
<Form.Item name="flujoPosterior" label="Flujo Posterior">
  <Select>
    <Select.Option value="POSTVENTA">Postventa</Select.Option>
    <Select.Option value="ARRIENDO">Arriendo</Select.Option>
    <Select.Option value="NUEVO_PROYECTO">Nuevo Proyecto</Select.Option>
  </Select>
</Form.Item>
```

**SECCIÓN 8.7 — DESCARTADO** (mostrar condicionalmente cuando `etapa === 'DESCARTADO'`):
```tsx
<Form.Item
  name="motivoDescarte"
  label="Motivo de Descarte"
  rules={[{ required: true, message: 'Ingresa el motivo de descarte' }]}
>
  <Input.TextArea rows={3} />
</Form.Item>
```

**SECCIÓN 8.8 — Campos adicionales de reportería**:
```tsx
<Form.Item name="tipoBroker" label="Tipo Broker">
  <Input />
</Form.Item>
<Form.Item name="fechaEstimadaDespacho" label="Fecha Estimada Despacho">
  <DatePicker style={{ width: '100%' }} />
</Form.Item>
<Form.Item name="fechaSeguimientoPostventa" label="Fecha Seguimiento Postventa">
  <DatePicker style={{ width: '100%' }} />
</Form.Item>
```

### 4.4 — Mapear valores del form al payload en el submit

En la función que construye el payload antes de llamar a la API (buscar donde se llama `createFunnelOportunidad` o `updateFunnelOportunidad`), agregar todos los campos nuevos al objeto enviado. Para campos `DatePicker`, convertir con `.toISOString()` o `.format('YYYY-MM-DD')`.

### 4.5 — Poblar el form al editar (initialValues)

En el `useEffect` que carga los datos de una oportunidad existente para editar, mapear todos los campos nuevos al `form.setFieldsValue({...})`. Para campos de fecha, convertir con `dayjs(valor)`.

---

## ORDEN DE EJECUCIÓN RECOMENDADO

1. ✅ Editar `firemat.schema.prisma` → agregar todos los campos
2. ✅ Ejecutar `prisma migrate dev`
3. ✅ Editar `funnel-firemat.controller.ts` → ETAPAS_PERMITIDAS + buildCreateData + buildUpdateData + validación DESCARTADO
4. ✅ Editar `api.ts` → FirematFunnelPayload + FirematFunnelOportunidad
5. ✅ Editar `Funnel.tsx` → FunnelFormValues + campos UI + submit mapping + initialValues
6. ✅ Probar creación con nuevos campos
7. ✅ Probar edición con nuevos campos
8. ✅ Probar cambio de etapa a DESCARTADO (verificar que pide motivoDescarte)
9. ✅ Probar que GANADA sigue auto-asignando fechaCierre

---

## CAMPOS QUE YA ESTÁN IMPLEMENTADOS (NO TOCAR)

- `cliente`, `contacto`, `telefono`, `correo`, `tipoCliente` — ✅ 8.1
- `productoId`, `cantidadEstimada` — ✅ 8.2
- `responsable` — ✅ general
- `etapas` (todas menos DESCARTADO) — ✅
- `montoEstimado`, `probabilidadCierre` — ✅ 8.3
- `proximaAccion`, `fechaProximaAccion` — ✅ seguimiento
- `observaciones`, `origen` — ✅ general
- `estadoStock` — ✅
- `cotizacionId` — ✅
- `motivoPerdida`, `motivoPostergacion`, `fechaReactivacion` — ✅ 8.7 (perdida/postergada)
- `documentoRespaldo` — ✅
- `fechaCierre` (auto cuando GANADA) — ✅ 8.6

---

## NOTA SOBRE `fechaIngreso` (párrafo [227])

El campo `createdAt` del modelo ya registra automáticamente cuándo se creó la oportunidad. No agregar un campo separado `fechaIngreso`. Solo mostrarlo en el frontend como campo de solo lectura con la etiqueta "Fecha de Ingreso".
