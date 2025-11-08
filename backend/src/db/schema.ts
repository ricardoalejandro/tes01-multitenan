import { pgTable, text, uuid, timestamp, decimal, integer, boolean, date, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'instructor']);
export const statusEnum = pgEnum('status', ['active', 'inactive']);
export const documentTypeEnum = pgEnum('document_type', ['DNI', 'CNE', 'Pasaporte']);
export const genderEnum = pgEnum('gender', ['Masculino', 'Femenino', 'Otro']);
export const studentStatusEnum = pgEnum('student_status', ['Activo', 'Fluctuante', 'Inactivo', 'Baja']);
export const admissionReasonEnum = pgEnum('admission_reason', ['Traslado', 'Recuperado', 'Nuevo']);
export const instructorStatusEnum = pgEnum('instructor_status', ['Activo', 'Inactivo', 'Licencia']);
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

export const students = pgTable('students', {
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
  admissionDate: date('admission_date').notNull(),
  admissionReason: admissionReasonEnum('admission_reason').notNull(),
  status: studentStatusEnum('status').notNull().default('Activo'),
  monthlyFee: decimal('monthly_fee', { precision: 10, scale: 2 }),
  address: text('address'),
  department: text('department'),
  province: text('province'),
  district: text('district'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
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
