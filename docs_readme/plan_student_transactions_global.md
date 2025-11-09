# Plan: Sistema de Transacciones de Probacionistas con Multi-tenant Compartido

## 📊 Alcance
- [x] Frontend
- [x] Backend
- [x] Base de Datos

## 🎯 Objetivos

Implementar un sistema de gestión de probacionistas con:
1. **DNI único global** (no por filial): Un probacionista puede estar en múltiples filiales
2. **Estados simplificados**: Solo 'Alta' y 'Baja' por filial
3. **Historial de transacciones**: Bitácora completa de movimientos
4. **Importación entre filiales**: Permitir vincular probacionistas existentes a nuevas filiales

## 🗄️ Cambios en Base de Datos

### 1. Modificar tabla `students` (datos globales compartidos)
**Cambios:**
- ❌ ELIMINAR: Campo `branchId` (ya no pertenece a una sola filial)
- ❌ ELIMINAR: Campo `status` (el estado será por filial en `student_branches`)
- ❌ ELIMINAR: Campo `admissionDate` (se moverá a `student_branches`)
- ✅ AGREGAR: Constraint UNIQUE en `(document_type, dni)` a nivel GLOBAL

**Schema resultante:**
```sql
students
├── id (UUID, PK)
├── document_type ('DNI', 'CNE', 'Pasaporte')
├── dni (VARCHAR, UNIQUE GLOBAL con document_type) ⭐
├── gender ('Masculino', 'Femenino', 'Otro')
├── first_name (VARCHAR NOT NULL)
├── paternal_last_name (VARCHAR NOT NULL)
├── maternal_last_name (VARCHAR NULL)
├── email (VARCHAR NULL)
├── phone (VARCHAR NULL)
├── birth_date (DATE NULL)
├── address (TEXT NULL)
├── department (VARCHAR NULL)
├── province (VARCHAR NULL)
├── district (VARCHAR NULL)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
└── UNIQUE(document_type, dni)
```

### 2. Crear tabla `student_branches` (relación muchos a muchos)
**Nueva tabla para gestionar la relación entre probacionistas y filiales:**
```sql
student_branches
├── id (UUID, PK)
├── student_id (UUID, FK → students.id, ON DELETE CASCADE)
├── branch_id (UUID, FK → branches.id, ON DELETE CASCADE)
├── status ('Alta', 'Baja') NOT NULL DEFAULT 'Alta' ⭐
├── admission_date (DATE NOT NULL) - fecha de ingreso a esta filial
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
└── UNIQUE(student_id, branch_id) - Un probacionista solo puede estar una vez por filial
└── INDEX(branch_id, status) - Para consultas eficientes por filial
```

### 3. Crear tabla `student_transactions` (historial de movimientos)
**Nueva tabla para auditoría completa:**
```sql
student_transactions
├── id (UUID, PK)
├── student_id (UUID, FK → students.id, ON DELETE CASCADE)
├── branch_id (UUID, FK → branches.id, ON DELETE SET NULL) - puede ser NULL
├── transaction_type ('Alta', 'Baja', 'Traslado', 'Cambio de Grupo') NOT NULL
├── description (TEXT NOT NULL) - descripción del movimiento
├── observation (TEXT NULL) - motivo/observación (obligatorio en cambios de estado)
├── user_id (UUID, FK → users.id, ON DELETE SET NULL) - quien realizó la transacción
├── transaction_date (TIMESTAMP NOT NULL DEFAULT NOW())
├── created_at (TIMESTAMP)
└── INDEX(student_id, transaction_date DESC) - Para historial
└── INDEX(branch_id, transaction_date DESC) - Para reportes por filial
```

### 4. Migraciones necesarias

**Migración 004: Reestructurar students para multi-tenant compartido**
```sql
-- Paso 1: Crear tabla student_branches
CREATE TABLE student_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Alta' CHECK (status IN ('Alta', 'Baja')),
  admission_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, branch_id)
);

CREATE INDEX idx_student_branches_branch_status ON student_branches(branch_id, status);
CREATE INDEX idx_student_branches_student ON student_branches(student_id);

-- Paso 2: Migrar datos existentes de students a student_branches
INSERT INTO student_branches (student_id, branch_id, status, admission_date, created_at, updated_at)
SELECT 
  id as student_id,
  branch_id,
  CASE 
    WHEN status = 'Eliminado' THEN 'Baja'
    ELSE 'Alta'
  END as status,
  COALESCE(admission_date, created_at::date) as admission_date,
  created_at,
  updated_at
FROM students;

-- Paso 3: Crear tabla student_transactions
CREATE TABLE student_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Alta', 'Baja', 'Traslado', 'Cambio de Grupo')),
  description TEXT NOT NULL,
  observation TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_transactions_student_date ON student_transactions(student_id, transaction_date DESC);
CREATE INDEX idx_student_transactions_branch_date ON student_transactions(branch_id, transaction_date DESC);

-- Paso 4: Crear transacciones iniciales para todos los estudiantes existentes
INSERT INTO student_transactions (student_id, branch_id, transaction_type, description, transaction_date)
SELECT 
  sb.student_id,
  sb.branch_id,
  'Alta' as transaction_type,
  'Alta inicial del probacionista en el sistema' as description,
  sb.created_at as transaction_date
FROM student_branches sb;

-- Paso 5: Eliminar columnas obsoletas de students y agregar constraint UNIQUE global
ALTER TABLE students DROP COLUMN branch_id;
ALTER TABLE students DROP COLUMN status;
ALTER TABLE students DROP COLUMN admission_date;

-- Agregar constraint único global para (document_type, dni)
CREATE UNIQUE INDEX idx_students_document_dni_unique ON students(document_type, dni);
```

## 🔌 Backend

### 1. Actualizar schema de Drizzle (`backend/src/db/schema.ts`)

**Modificar tabla students:**
```typescript
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  // ELIMINADO: branchId
  // ELIMINADO: status
  // ELIMINADO: admissionDate
  documentType: varchar('document_type', { length: 20 }).notNull(),
  dni: varchar('dni', { length: 20 }).notNull(),
  gender: varchar('gender', { length: 20 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  paternalLastName: varchar('paternal_last_name', { length: 100 }).notNull(),
  maternalLastName: varchar('maternal_last_name', { length: 100 }),
  email: varchar('email', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  birthDate: date('birth_date'),
  address: text('address'),
  department: varchar('department', { length: 100 }),
  province: varchar('province', { length: 100 }),
  district: varchar('district', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueDocumentDni: unique().on(table.documentType, table.dni), // ⭐ UNIQUE GLOBAL
}));
```

**Crear tabla student_branches:**
```typescript
export const studentBranches = pgTable('student_branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('Alta'), // 'Alta' | 'Baja'
  admissionDate: date('admission_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueStudentBranch: unique().on(table.studentId, table.branchId),
  branchStatusIdx: index('idx_student_branches_branch_status').on(table.branchId, table.status),
}));
```

**Crear tabla student_transactions:**
```typescript
export const studentTransactions = pgTable('student_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'Alta' | 'Baja' | 'Traslado' | 'Cambio de Grupo'
  description: text('description').notNull(),
  observation: text('observation'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  transactionDate: timestamp('transaction_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  studentDateIdx: index('idx_student_transactions_student_date').on(table.studentId, table.transactionDate),
  branchDateIdx: index('idx_student_transactions_branch_date').on(table.branchId, table.transactionDate),
}));
```

### 2. Refactorizar rutas de estudiantes (`backend/src/routes/students.ts`)

**Nuevos endpoints:**

#### GET `/api/students` (modificado)
- Hacer JOIN con `student_branches` para filtrar por filial
- Retornar solo estudiantes vinculados a la filial actual
- Incluir campo `status` desde `student_branches`

#### GET `/api/students/:id` (modificado)
- Verificar que el estudiante esté vinculado a la filial actual
- Retornar datos del estudiante + status de la filial

#### POST `/api/students` (modificado - LÓGICA COMPLEJA)
**Validación en 2 pasos:**
1. **Verificar si el DNI existe globalmente:**
   - Si NO existe → Crear nuevo probacionista (flujo normal)
   - Si SÍ existe → Retornar 409 con datos del probacionista y filiales donde está registrado

**Flujo de creación nuevo:**
```typescript
// 1. Crear en students (datos globales)
const [student] = await db.insert(students).values({...}).returning();

// 2. Crear en student_branches (vínculo con filial)
await db.insert(studentBranches).values({
  studentId: student.id,
  branchId: request.body.branchId,
  status: 'Alta',
  admissionDate: request.body.admissionDate || new Date(),
});

// 3. Crear transacción de Alta
await db.insert(studentTransactions).values({
  studentId: student.id,
  branchId: request.body.branchId,
  transactionType: 'Alta',
  description: 'Alta inicial del probacionista en el sistema',
  userId: request.user.id, // del JWT
  transactionDate: new Date(),
});
```

**Respuesta cuando ya existe (409):**
```json
{
  "error": "Este probacionista ya está registrado",
  "type": "duplicate_student",
  "student": {
    "id": "uuid",
    "firstName": "Juan",
    "paternalLastName": "Pérez",
    "dni": "12345678",
    "branches": [
      { "branchId": "uuid", "branchName": "Filial Iquitos", "status": "Alta" }
    ]
  },
  "canImport": true
}
```

#### POST `/api/students/:id/import` (nuevo endpoint)
**Importar probacionista existente a la filial actual:**
```typescript
fastify.post('/:id/import', async (request, reply) => {
  const { id } = request.params;
  const { branchId, admissionDate, observation } = request.body;
  
  // 1. Verificar que el estudiante existe
  const student = await db.select().from(students).where(eq(students.id, id));
  if (!student) return 404;
  
  // 2. Verificar que no esté ya vinculado a esta filial
  const existing = await db.select()
    .from(studentBranches)
    .where(and(
      eq(studentBranches.studentId, id),
      eq(studentBranches.branchId, branchId)
    ));
  
  if (existing.length > 0) {
    return reply.code(409).send({ error: 'El probacionista ya está en esta filial' });
  }
  
  // 3. Crear vínculo con la filial
  await db.insert(studentBranches).values({
    studentId: id,
    branchId,
    status: 'Alta',
    admissionDate: admissionDate || new Date(),
  });
  
  // 4. Crear transacción
  await db.insert(studentTransactions).values({
    studentId: id,
    branchId,
    transactionType: 'Alta',
    description: `Importado a la filial desde otra sucursal`,
    observation,
    userId: request.user.id,
  });
  
  return { success: true, student };
});
```

#### PUT `/api/students/:id` (modificado)
**Actualizar datos del probacionista:**
- Los cambios en datos personales (nombre, DNI, etc.) se reflejan GLOBALMENTE
- NO permitir cambiar `status` aquí (usar endpoint específico)

#### PUT `/api/students/:id/status` (nuevo endpoint)
**Cambiar estado del probacionista en la filial actual:**
```typescript
fastify.put('/:id/status', async (request, reply) => {
  const { id } = request.params;
  const { branchId, status, observation } = request.body;
  
  // Validación: observation es OBLIGATORIA
  if (!observation || observation.trim() === '') {
    return reply.code(400).send({ 
      error: 'La observación es obligatoria al cambiar el estado',
      field: 'observation'
    });
  }
  
  // 1. Actualizar estado en student_branches
  await db.update(studentBranches)
    .set({ status, updatedAt: new Date() })
    .where(and(
      eq(studentBranches.studentId, id),
      eq(studentBranches.branchId, branchId)
    ));
  
  // 2. Crear transacción
  await db.insert(studentTransactions).values({
    studentId: id,
    branchId,
    transactionType: status, // 'Alta' o 'Baja'
    description: `Cambio de estado a ${status}`,
    observation,
    userId: request.user.id,
  });
  
  return { success: true };
});
```

#### GET `/api/students/:id/transactions` (nuevo endpoint)
**Obtener historial de transacciones:**
```typescript
fastify.get('/:id/transactions', async (request, reply) => {
  const { id } = request.params;
  const { branchId, page = 1, limit = 50 } = request.query;
  
  let query = db.select({
    transaction: studentTransactions,
    branch: branches,
    user: users,
  })
  .from(studentTransactions)
  .leftJoin(branches, eq(studentTransactions.branchId, branches.id))
  .leftJoin(users, eq(studentTransactions.userId, users.id))
  .where(eq(studentTransactions.studentId, id));
  
  // Filtrar por filial si se proporciona
  if (branchId) {
    query = query.where(eq(studentTransactions.branchId, branchId));
  }
  
  const transactions = await query
    .orderBy(desc(studentTransactions.transactionDate))
    .limit(limit)
    .offset((page - 1) * limit);
  
  return { data: transactions };
});
```

#### DELETE `/api/students/:id` (eliminar endpoint)
- ❌ NO permitir eliminar probacionistas
- Solo cambiar estado a 'Baja' con observación

### 3. Validaciones con Zod

**Schema base (sin branchId ni status):**
```typescript
const studentBaseSchema = z.object({
  documentType: z.enum(['DNI', 'CNE', 'Pasaporte']),
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos'),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']),
  firstName: z.string().min(1),
  paternalLastName: z.string().min(1),
  maternalLastName: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  email: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  phone: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  birthDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  address: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  department: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  province: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  district: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
});

const studentCreateSchema = studentBaseSchema.extend({
  branchId: z.string().uuid(),
  admissionDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.birthDate) {
      return new Date(data.birthDate) < new Date();
    }
    return true;
  },
  { message: 'La fecha de nacimiento debe ser anterior a hoy' }
);

const studentUpdateSchema = studentBaseSchema.partial();

const studentImportSchema = z.object({
  branchId: z.string().uuid(),
  admissionDate: z.string().optional(),
  observation: z.string().optional(),
});

const studentStatusChangeSchema = z.object({
  branchId: z.string().uuid(),
  status: z.enum(['Alta', 'Baja']),
  observation: z.string().min(5, 'La observación debe tener al menos 5 caracteres'),
});
```

## 🎨 Frontend

### 1. Actualizar interfaz Student (`src/components/modules/StudentsModule.tsx`)

**Cambios en la interfaz TypeScript:**
```typescript
interface Student {
  id: string;
  documentType: string;
  dni: string;
  gender: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  address: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
  // Campos de la relación con filial
  status: 'Alta' | 'Baja'; // desde student_branches
  admissionDate: string; // desde student_branches
  createdAt: string;
  updatedAt: string;
}

interface StudentTransaction {
  id: string;
  transactionType: 'Alta' | 'Baja' | 'Traslado' | 'Cambio de Grupo';
  description: string;
  observation: string | null;
  transactionDate: string;
  branchName: string;
  userName: string;
}
```

### 2. Modificar formulario de creación/edición

**Cambios en el estado:**
```typescript
const [formData, setFormData] = useState({
  // ... campos existentes
  // ELIMINAR: status (se manejará separadamente)
});
```

**Campo Estado:**
- Solo mostrar: Badge con 'Alta' o 'Baja'
- NO editable en el formulario principal
- Botón separado: "Cambiar Estado" → abre modal

### 3. Crear componente `StudentStatusChangeDialog`

**Modal para cambiar estado:**
```tsx
<Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        Cambiar estado: {student.firstName} {student.paternalLastName}
      </DialogTitle>
    </DialogHeader>
    <DialogBody>
      <div className="space-y-4">
        <div>
          <Label>Estado Actual</Label>
          <Badge variant={student.status === 'Alta' ? 'success' : 'danger'}>
            {student.status}
          </Badge>
        </div>
        
        <div>
          <Label>Nuevo Estado</Label>
          <Select value={newStatus} onChange={setNewStatus}>
            <option value="Alta">Alta</option>
            <option value="Baja">Baja</option>
          </Select>
        </div>
        
        <div>
          <Label>Observación/Motivo *</Label>
          <Textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Ingrese el motivo del cambio de estado (obligatorio)"
            rows={4}
            required
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      </div>
    </DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
        Cancelar
      </Button>
      <Button onClick={handleStatusChange} disabled={!observation}>
        Guardar Cambio
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. Crear componente `StudentImportDialog`

**Modal cuando se detecta DNI duplicado:**
```tsx
<Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Probacionista Existente</DialogTitle>
    </DialogHeader>
    <DialogBody>
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Este probacionista ya está registrado en el sistema.
          </p>
        </div>
        
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Datos del Probacionista</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="font-medium">Nombre:</dt>
            <dd>{existingStudent.firstName} {existingStudent.paternalLastName}</dd>
            <dt className="font-medium">DNI:</dt>
            <dd>{existingStudent.dni}</dd>
            <dt className="font-medium">Email:</dt>
            <dd>{existingStudent.email || '-'}</dd>
          </dl>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Filiales donde está registrado:</h3>
          <ul className="space-y-1">
            {existingStudent.branches.map(branch => (
              <li key={branch.branchId} className="flex items-center gap-2">
                <Badge variant={branch.status === 'Alta' ? 'success' : 'danger'}>
                  {branch.status}
                </Badge>
                <span>{branch.branchName}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <Label>Observación (opcional)</Label>
          <Textarea
            value={importObservation}
            onChange={(e) => setImportObservation(e.target.value)}
            placeholder="Motivo de la importación a esta filial"
            rows={3}
          />
        </div>
      </div>
    </DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowImportDialog(false)}>
        Cancelar
      </Button>
      <Button onClick={handleImportStudent}>
        Importar a Esta Filial
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 5. Crear componente `StudentTransactionsDialog`

**Modal para ver historial:**
```tsx
<Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        Historial de Movimientos: {student.firstName} {student.paternalLastName}
      </DialogTitle>
    </DialogHeader>
    <DialogBody>
      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <Input
          type="date"
          placeholder="Fecha desde"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
        />
        <Input
          type="date"
          placeholder="Fecha hasta"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
        />
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="Alta">Alta</option>
          <option value="Baja">Baja</option>
          <option value="Traslado">Traslado</option>
          <option value="Cambio de Grupo">Cambio de Grupo</option>
        </Select>
      </div>
      
      {/* Tabla de transacciones */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Filial</TableHead>
            <TableHead>Usuario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>
                {new Date(tx.transactionDate).toLocaleString('es-PE')}
              </TableCell>
              <TableCell>
                <Badge variant={
                  tx.transactionType === 'Alta' ? 'success' :
                  tx.transactionType === 'Baja' ? 'danger' :
                  'warning'
                }>
                  {tx.transactionType}
                </Badge>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{tx.description}</p>
                  {tx.observation && (
                    <p className="text-sm text-neutral-9 mt-1">{tx.observation}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{tx.branchName}</TableCell>
              <TableCell>{tx.userName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {transactions.length === 0 && (
        <div className="text-center py-8 text-neutral-9">
          No hay transacciones registradas
        </div>
      )}
    </DialogBody>
    <DialogFooter>
      <Button onClick={() => setShowTransactionsDialog(false)}>
        Cerrar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 6. Actualizar tabla de estudiantes

**Agregar columnas y acciones:**
```tsx
<TableRow key={student.id}>
  <TableCell>{student.dni}</TableCell>
  <TableCell>
    {student.firstName} {student.paternalLastName} {student.maternalLastName}
  </TableCell>
  <TableCell>
    <Badge variant={student.status === 'Alta' ? 'success' : 'danger'}>
      {student.status}
    </Badge>
  </TableCell>
  <TableCell>
    {new Date(student.admissionDate).toLocaleDateString('es-PE')}
  </TableCell>
  <TableCell className="text-right">
    <div className="flex gap-2 justify-end">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => showTransactions(student)}
        title="Ver historial"
      >
        <History className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleEdit(student)}
        title="Editar datos"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => showStatusChange(student)}
        title="Cambiar estado"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  </TableCell>
</TableRow>
```

### 7. Actualizar funciones de API (`src/lib/api.ts`)

**Nuevos métodos:**
```typescript
// Importar probacionista existente a la filial actual
importStudent: async (studentId: string, data: { branchId: string; admissionDate?: string; observation?: string }) => {
  const response = await axiosInstance.post(`/students/${studentId}/import`, data);
  return response.data;
},

// Cambiar estado del probacionista en la filial actual
changeStudentStatus: async (studentId: string, data: { branchId: string; status: 'Alta' | 'Baja'; observation: string }) => {
  const response = await axiosInstance.put(`/students/${studentId}/status`, data);
  return response.data;
},

// Obtener historial de transacciones
getStudentTransactions: async (studentId: string, branchId?: string, page = 1, limit = 50) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (branchId) params.append('branchId', branchId);
  const response = await axiosInstance.get(`/students/${studentId}/transactions?${params}`);
  return response.data;
},
```

## 🔗 Flujo de Integración Completo

### Flujo 1: Crear Probacionista Nuevo
```
Usuario ingresa datos del formulario
    ↓
Frontend: POST /api/students con { dni, firstName, ..., branchId }
    ↓
Backend: Validar DNI globalmente único
    ↓
¿DNI existe? → SÍ → Retornar 409 con datos del probacionista
    ↓           → Frontend muestra StudentImportDialog
    ↓
NO → Crear en `students` (datos globales)
    ↓
Crear en `student_branches` (status: 'Alta')
    ↓
Crear en `student_transactions` (tipo: 'Alta', descripción genérica)
    ↓
Retornar 201 Created
    ↓
Frontend: Mostrar toast.success() y recargar lista
```

### Flujo 2: Importar Probacionista Existente
```
Usuario hace clic en "Importar" en el modal
    ↓
Frontend: POST /api/students/:id/import con { branchId, observation }
    ↓
Backend: Verificar que no esté ya en esta filial
    ↓
Crear en `student_branches` (status: 'Alta')
    ↓
Crear en `student_transactions` (tipo: 'Alta', descripción: 'Importado...')
    ↓
Retornar 200 OK
    ↓
Frontend: Cerrar modal, mostrar toast.success(), recargar lista
```

### Flujo 3: Cambiar Estado (Alta ↔ Baja)
```
Usuario hace clic en botón "Cambiar Estado"
    ↓
Frontend: Abrir StudentStatusChangeDialog
    ↓
Usuario selecciona nuevo estado e ingresa observación (obligatoria)
    ↓
Frontend: PUT /api/students/:id/status con { branchId, status, observation }
    ↓
Backend: Validar que observation no esté vacía
    ↓
Actualizar `student_branches.status`
    ↓
Crear en `student_transactions` (tipo: status, observación del usuario)
    ↓
Retornar 200 OK
    ↓
Frontend: Cerrar modal, mostrar toast.success(), actualizar estudiante en lista
```

### Flujo 4: Ver Historial de Transacciones
```
Usuario hace clic en botón "Ver Historial"
    ↓
Frontend: GET /api/students/:id/transactions?branchId=xxx
    ↓
Backend: Consultar `student_transactions` con JOINs a `branches` y `users`
    ↓
Ordenar por `transaction_date DESC`
    ↓
Retornar lista de transacciones
    ↓
Frontend: Mostrar StudentTransactionsDialog con tabla filtrable
```

### Flujo 5: Editar Datos del Probacionista
```
Usuario edita nombre, email, teléfono, etc.
    ↓
Frontend: PUT /api/students/:id con campos modificados
    ↓
Backend: Actualizar `students` (tabla global)
    ↓
Los cambios se reflejan en TODAS las filiales donde esté el probacionista
    ↓
NO crear transacción (no es cambio de estado)
    ↓
Retornar 200 OK con estudiante actualizado
    ↓
Frontend: Cerrar modal, mostrar toast.success(), recargar lista
```

## ✅ Criterios de Aceptación

### Base de Datos
1. ✅ Tabla `students` sin `branch_id` ni `status` (datos globales)
2. ✅ Constraint UNIQUE en `(document_type, dni)` a nivel global
3. ✅ Tabla `student_branches` con relación muchos a muchos
4. ✅ Tabla `student_transactions` con historial completo
5. ✅ Migración ejecutada sin pérdida de datos

### Backend
6. ✅ Endpoint POST `/students` detecta DNI duplicado globalmente
7. ✅ Respuesta 409 incluye datos del probacionista y filiales donde está
8. ✅ Endpoint POST `/students/:id/import` funciona correctamente
9. ✅ Endpoint PUT `/students/:id/status` requiere observación obligatoria
10. ✅ Endpoint GET `/students/:id/transactions` retorna historial completo
11. ✅ Todas las transacciones se registran automáticamente
12. ✅ Validaciones Zod actualizadas y funcionando

### Frontend
13. ✅ Campo Estado solo muestra 'Alta' o 'Baja' (badge)
14. ✅ Modal `StudentImportDialog` se muestra cuando DNI existe
15. ✅ Modal `StudentStatusChangeDialog` requiere observación obligatoria
16. ✅ Modal `StudentTransactionsDialog` muestra historial completo
17. ✅ Filtros de historial funcionan (fecha, tipo)
18. ✅ Botón "Cambiar Estado" visible en cada fila
19. ✅ Botón "Ver Historial" visible en cada fila
20. ✅ Toasts apropiados (warning para 409, success para operaciones exitosas)
21. ✅ NO existe botón "Eliminar" (solo cambio de estado)

### Integración
22. ✅ Un probacionista puede estar en múltiples filiales simultáneamente
23. ✅ Cada filial maneja su propio estado (Alta/Baja) independientemente
24. ✅ Editar datos personales se refleja en todas las filiales
25. ✅ Cambiar estado solo afecta a la filial actual
26. ✅ Historial muestra transacciones de todas las filiales (o filtradas)
27. ✅ Usuario autenticado se registra en cada transacción

## 🚨 Consideraciones y Riesgos

### Alto Impacto
- **⚠️ Breaking change**: Reestructura completamente la tabla `students`
- **⚠️ Migración compleja**: Requiere mover datos existentes sin pérdida
- **⚠️ Cambio conceptual**: De multi-tenant aislado a multi-tenant compartido

### Mitigaciones
- ✅ Crear backup de BD antes de ejecutar migración
- ✅ Probar migración en entorno de desarrollo primero
- ✅ Validar integridad de datos post-migración
- ✅ Rollback plan: Script de reversión disponible

### Dependencias
- Requiere que exista tabla `users` (para `userId` en transacciones)
- Requiere autenticación JWT funcional (para obtener `request.user.id`)

### Performance
- Índices creados en `student_branches` para consultas eficientes
- Índices creados en `student_transactions` para historial rápido
- JOIN con 3 tablas en consultas de estudiantes (aceptable con índices)

## ❓ Preguntas Pendientes
- ✅ ¿Permitir deshacer cambios de estado? (NO, solo registrar en historial)
- ✅ ¿Notificar a otras filiales cuando se edita un probacionista? (NO por ahora)
- ✅ ¿Límite de filiales por probacionista? (NO, sin límite)
- ✅ ¿Exportar historial de transacciones? (FUTURO, no en este plan)

---

**Fecha de creación**: 2025-11-08  
**Estado**: Pendiente de aprobación  
**Tiempo estimado**: 8-10 horas de desarrollo + 2 horas de pruebas
