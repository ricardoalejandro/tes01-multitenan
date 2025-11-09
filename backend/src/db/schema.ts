import { pgTable, text, uuid, timestamp, decimal, integer, boolean, date, pgEnum, unique, index } from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'instructor']);
export const statusEnum = pgEnum('status', ['active', 'inactive', 'eliminado']);
export const documentTypeEnum = pgEnum('document_type', ['DNI', 'CNE', 'Pasaporte']);
export const genderEnum = pgEnum('gender', ['Masculino', 'Femenino', 'Otro']);
export const studentStatusEnum = pgEnum('student_status', ['Activo', 'Fluctuante', 'Inactivo', 'Baja', 'Eliminado']);
export const admissionReasonEnum = pgEnum('admission_reason', ['Traslado', 'Recuperado', 'Nuevo']);
export const instructorStatusEnum = pgEnum('instructor_status', ['Activo', 'Inactivo', 'Licencia', 'Eliminado']);
export const courseStatusEnum = pgEnum('course_status', ['active', 'inactive', 'eliminado']);
export const groupStatusEnum = pgEnum('group_status', ['active', 'closed', 'finished', 'eliminado']);
export const frequencyEnum = pgEnum('frequency', ['Diario', 'Semanal', 'Mensual']);
export const dayEnum = pgEnum('day', ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['Presente', 'Ausente', 'Tardanza', 'Justificado']);

// Tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('instructor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  codeNumber: integer('code_number').unique(),
  description: text('description'),
  status: statusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Students table (global - DNI único a nivel global, sin branchId ni status)
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentType: documentTypeEnum('document_type').notNull(),
  dni: text('dni').notNull(),
  gender: genderEnum('gender').notNull(),
  firstName: text('first_name').notNull(),
  paternalLastName: text('paternal_last_name').notNull(),
  maternalLastName: text('maternal_last_name'),
  email: text('email'),
  phone: text('phone'),
  birthDate: date('birth_date'),
  address: text('address'),
  department: text('department'),
  province: text('province'),
  district: text('district'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueDocumentDni: unique('idx_students_document_dni_unique').on(table.documentType, table.dni),
}));

// Student-Branch relationship (muchos a muchos - un probacionista puede estar en múltiples filiales)
export const studentBranches = pgTable('student_branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('Alta'), // 'Alta' | 'Baja'
  admissionDate: date('admission_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueStudentBranch: unique('student_branches_student_branch_unique').on(table.studentId, table.branchId),
}));

// Student transactions (historial de movimientos)
export const studentTransactions = pgTable('student_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  transactionType: text('transaction_type').notNull(), // 'Alta' | 'Baja' | 'Traslado' | 'Cambio de Grupo'
  description: text('description').notNull(),
  observation: text('observation'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  transactionDate: timestamp('transaction_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: courseStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courseThemes = pgTable('course_themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// New table: course_topics (replaces course_themes gradually)
export const courseTopics = pgTable('course_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const instructors = pgTable('instructors', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  documentType: documentTypeEnum('document_type').notNull(),
  dni: text('dni').notNull(),
  gender: genderEnum('gender').notNull(),
  firstName: text('first_name').notNull(),
  paternalLastName: text('paternal_last_name').notNull(),
  maternalLastName: text('maternal_last_name'),
  email: text('email'),
  phone: text('phone'),
  birthDate: date('birth_date'),
  hireDate: date('hire_date').notNull(),
  status: instructorStatusEnum('status').notNull().default('Activo'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  address: text('address'),
  department: text('department'),
  province: text('province'),
  district: text('district'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const instructorSpecialties = pgTable('instructor_specialties', {
  instructorId: uuid('instructor_id').notNull().references(() => instructors.id, { onDelete: 'cascade' }),
  specialty: text('specialty').notNull(),
});

export const classGroups = pgTable('class_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  frequency: frequencyEnum('frequency').notNull(),
  status: groupStatusEnum('status').notNull().default('active'),
  isScheduleGenerated: boolean('is_schedule_generated').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const groupSelectedDays = pgTable('group_selected_days', {
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  day: dayEnum('day').notNull(),
});

export const groupCourses = pgTable('group_courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  instructorId: uuid('instructor_id').notNull().references(() => instructors.id),
});

export const classSessions = pgTable('class_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  sessionNumber: integer('session_number').notNull(),
  date: date('date').notNull(),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  instructorId: uuid('instructor_id').notNull().references(() => instructors.id),
  generalComment: text('general_comment'),
  isAttendanceTaken: boolean('is_attendance_taken').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessionThemes = pgTable('session_themes', {
  sessionId: uuid('session_id').notNull().references(() => classSessions.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull(),
});

export const groupEnrollments = pgTable('group_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
});

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => classSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  status: attendanceStatusEnum('status').notNull(),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});
