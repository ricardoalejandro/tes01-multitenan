# Plan: Mejoras Enabler + Carga de Datos de Prueba

## 📊 Alcance
- [x] Frontend
- [x] Backend
- [ ] Base de Datos (no requiere cambios de schema)

---

## 🎯 Objetivos

1. **Módulo de Carga de Datos de Prueba** - Generar datos ficticios para Probacionistas, Cursos e Instructores
2. **Toggle de Vistas en Módulos Enabler** - Cards, Lista, Compacta
3. **Corrección Global de Diálogos** - Padding, maximización, animación elegante

---

## 📐 Parte 1: Corrección de Diálogos (Prioridad Alta)

### Problemas Identificados:
1. **Muchos diálogos no pasan `onClose`** → No se muestra botón cerrar ni maximizar
2. **No usan `DialogBody`** → Sin padding correcto
3. **Animación `zoom-in-95` es brusca** → Cambiar a animación más suave

### Archivos a Corregir:

| Archivo | Estado Actual | Acción |
|---------|---------------|--------|
| `LevelsModule.tsx` | Sin `onClose`, sin `DialogBody` | Corregir |
| `LocationsModule.tsx` | Sin `onClose`, sin `DialogBody` | Corregir |
| `GroupStatusChangeDialog.tsx` | Sin `onClose`, sin `DialogBody` | Corregir |
| `UserBranchRolesDialog.tsx` | Sin `onClose`, sin `DialogBody` | Corregir |
| `UserFormDialog.tsx` | Sin `onClose`, sin `DialogBody` | Corregir |
| `GroupTransactionsDialog.tsx` | Sin `onClose`, sin `DialogBody` | Corregir |
| Otros en `src/app/` | Revisar y corregir | Revisar |

### Mejora del Componente Dialog:

```tsx
// Nueva animación más suave (slide-in + fade)
'animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ease-out'

// En lugar de:
'animate-in fade-in-0 zoom-in-95 duration-200'
```

### Estructura Correcta de Diálogo:
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent onClose={() => setIsOpen(false)}>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    <DialogBody>
      {/* Contenido con padding automático */}
    </DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={...}>Cancelar</Button>
      <Button onClick={...}>Guardar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 📐 Parte 2: Toggle de Vistas en Módulos Enabler

### Módulos a Actualizar:
- `HolidaysModule.tsx` - Feriados
- `LevelsModule.tsx` - Niveles
- `LocationsModule.tsx` - Ubicaciones

### Tipos de Vista:
1. **Tarjetas (cards)** - Grid de cards con info resumida
2. **Lista (table)** - Vista tabla actual
3. **Compacta** - Lista simplificada sin bordes

### Componente Toggle:
```tsx
// Selector de vista con iconos
<div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
  <Button variant={view === 'cards' ? 'default' : 'ghost'} size="sm">
    <LayoutGrid className="h-4 w-4" />
  </Button>
  <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm">
    <List className="h-4 w-4" />
  </Button>
  <Button variant={view === 'compact' ? 'default' : 'ghost'} size="sm">
    <AlignJustify className="h-4 w-4" />
  </Button>
</div>
```

### Persistencia:
- Guardar preferencia en `localStorage` por módulo

---

## 📐 Parte 3: Módulo de Carga de Datos de Prueba

### Ubicación:
`/admin/test-data` → `src/app/admin/test-data/page.tsx`

### UI del Módulo:

```
┌─────────────────────────────────────────────────────────┐
│ 🧪 Generador de Datos de Prueba                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Sucursal: [  Seleccione una sucursal  ▼]               │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Entidades a generar:                                ││
│ │  ☑ Probacionistas    ☑ Cursos    ☑ Instructores   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Cantidad:                                               │
│  ○ Poco (5)                                            │
│  ○ Regular (15)                                        │
│  ● Bastante (50)                                       │
│  ○ Mucho (100)                                         │
│  ○ Muchísimo (500)                                     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Vista previa:                                       ││
│ │  - 50 probacionistas serán creados                  ││
│ │  - 50 cursos serán creados                          ││
│ │  - 50 instructores serán creados                    ││
│ │  Total: 150 registros                               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                           [Cancelar] [🚀 Generar Datos]│
└─────────────────────────────────────────────────────────┘
```

### Backend - Nuevo Endpoint:

```
POST /api/system/generate-test-data
Body: {
  branchId: string,
  entities: ['students', 'courses', 'instructors'],
  quantity: 'poco' | 'regular' | 'bastante' | 'mucho' | 'muchisimo'
}
Response: {
  success: true,
  generated: {
    students: 50,
    courses: 50,
    instructors: 50
  }
}
```

### Datos Generados (usando faker-like data):

**Probacionistas:**
- Nombres peruanos realistas (Juan Pérez, María García, etc.)
- DNI aleatorio (8 dígitos)
- Email generado desde nombre
- Teléfono peruano (+51 9XX XXX XXX)
- Fecha de nacimiento (18-65 años)
- Dirección (distritos de Lima)
- Estado: Alta
- Fecha admisión: Últimos 2 años

**Cursos:**
- Nombres de cursos filosóficos/académicos
- Códigos únicos (CUR-001, CUR-002...)
- Duración: 16-48 horas
- Precio: S/. 150 - S/. 800
- Descripción generada

**Instructores:**
- Nombres peruanos
- Especialidades filosóficas
- Email profesional
- Teléfono
- Biografía corta

---

## 🔌 Cambios en Backend

### Nuevo archivo: `backend/src/routes/testData.ts`

```typescript
// POST /api/system/generate-test-data
// - Validar que usuario sea superadmin
// - Recibir branchId, entities[], quantity
// - Generar datos con lógica de nombres peruanos
// - Insertar en BD
// - Retornar conteo
```

### Registrar ruta en `index.ts`:
```typescript
import { testDataRoutes } from './routes/testData';
// ...
await fastify.register(testDataRoutes, { prefix: '/api/system' });
```

---

## 🎨 Diseño UI/UX

### Colores del Módulo Test Data:
- Header: Gradiente amarillo/naranja (warning/experimental)
- Icono: 🧪 o Flask de Lucide
- Botón generar: Azul principal

### Feedback al Usuario:
1. **Durante generación**: Spinner + "Generando X de Y..."
2. **Éxito**: Toast verde + resumen de registros creados
3. **Error**: Toast rojo + mensaje específico

### Advertencias:
- Mostrar alerta si selecciona "Muchísimo" (500)
- Confirmar antes de generar

---

## ✅ Criterios de Aceptación

### Diálogos:
1. ✅ Todos los diálogos tienen botón maximizar visible
2. ✅ Todos los diálogos tienen botón cerrar (X)
3. ✅ Padding consistente en todos los diálogos
4. ✅ Animación suave al abrir/cerrar

### Toggle de Vistas:
1. ✅ Botones de toggle visibles en header de cada módulo
2. ✅ Vista Cards muestra grid responsivo
3. ✅ Vista Lista muestra tabla actual
4. ✅ Vista Compacta muestra lista simple
5. ✅ Preferencia se guarda en localStorage

### Datos de Prueba:
1. ✅ Selector de sucursal funcional
2. ✅ Checkboxes para entidades funcionan
3. ✅ Radio buttons de cantidad funcionan
4. ✅ Vista previa muestra conteo correcto
5. ✅ Generación exitosa crea registros en BD
6. ✅ Toast de confirmación con resumen
7. ✅ Solo accesible por superadmin

---

## 🚨 Orden de Implementación

### Fase 1: Corrección de Diálogos (30 min)
1. Mejorar animación en `dialog.tsx`
2. Corregir `LevelsModule.tsx`
3. Corregir `LocationsModule.tsx`
4. Corregir otros diálogos en workspace/admin

### Fase 2: Toggle de Vistas (45 min)
1. Crear componente `ViewToggle.tsx`
2. Implementar vistas Cards y Compact en `LevelsModule.tsx`
3. Replicar en `HolidaysModule.tsx`
4. Replicar en `LocationsModule.tsx`

### Fase 3: Datos de Prueba (60 min)
1. Crear endpoint backend `testData.ts`
2. Crear página frontend `/admin/test-data`
3. Implementar generación de datos
4. Testing y ajustes

---

## ❓ Preguntas Pendientes

1. ¿Los datos de prueba deberían tener un prefijo identificable (ej: "[TEST]" en el nombre)?
2. ¿Debería haber opción de eliminar todos los datos de prueba?
3. ¿El módulo de test-data debería estar visible solo en entorno de desarrollo?

---

**Tiempo estimado total: ~2.5 horas**

¿Apruebas este plan para proceder con la implementación?
