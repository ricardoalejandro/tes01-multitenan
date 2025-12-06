import { pgTable, text, uuid, timestamp, decimal, integer, boolean, date, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'instructor']);
export const userTypeEnum = pgEnum('user_type', ['admin', 'normal']);
export const statusEnum = pgEnum('status', ['active', 'inactive', 'eliminado']);
export const documentTypeEnum = pgEnum('document_type', ['DNI', 'CNE', 'Pasaporte']);
export const genderEnum = pgEnum('gender', ['Masculino', 'Femenino', 'Otro']);
export const studentStatusEnum = pgEnum('student_status', ['Activo', 'Fluctuante', 'Inactivo', 'Baja', 'Eliminado']);
export const admissionReasonEnum = pgEnum('admission_reason', ['Traslado', 'Recuperado', 'Nuevo']);
export const instructorStatusEnum = pgEnum('instructor_status', ['Activo', 'Inactivo', 'Licencia', 'Eliminado']);
export const courseStatusEnum = pgEnum('course_status', ['active', 'inactive', 'eliminado']);
export const groupStatusEnum = pgEnum('group_status', ['active', 'closed', 'finished', 'eliminado', 'merged']);
export const frequencyEnum = pgEnum('frequency', ['Diario', 'Semanal', 'Mensual']);
export const dayEnum = pgEnum('day', ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['Presente', 'Ausente', 'Tardanza', 'Justificado']);
export const counselingIndicatorEnum = pgEnum('counseling_indicator', ['frio', 'tibio', 'caliente']);

// Tables
// Sistema de autenticación y usuarios
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name'),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  userType: userTypeEnum('user_type').notNull().default('normal'),
  // Mantener role para compatibilidad temporal durante migración
  role: roleEnum('role'),
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
  active: boolean('active').notNull().default(true),
  // Nuevos campos de ubicación y gestión
  departmentId: uuid('department_id'),
  provinceId: uuid('province_id'),
  districtId: uuid('district_id'),
  branchManager: text('branch_manager'),
  levelId: uuid('level_id'),
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
  isTestData: boolean('is_test_data').notNull().default(false),
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
  transactionSubtype: text('transaction_subtype'), // 'Nuevo', 'Recuperado', 'Traslado', 'Baja Académica', etc.
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
  isTestData: boolean('is_test_data').notNull().default(false),
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
  isTestData: boolean('is_test_data').notNull().default(false),
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
  startTime: text('start_time'), // Hora de inicio (formato HH:MM)
  endTime: text('end_time'), // Hora de fin (formato HH:MM)
  frequency: frequencyEnum('frequency').notNull(),
  status: groupStatusEnum('status').notNull().default('active'),
  isScheduleGenerated: boolean('is_schedule_generated').default(false).notNull(),
  // Campos de recurrencia personalizada
  recurrenceFrequency: text('recurrence_frequency'), // 'daily' | 'weekly' | 'monthly'
  recurrenceInterval: integer('recurrence_interval').default(1),
  recurrenceDays: text('recurrence_days'), // JSON: '["monday","thursday"]'
  endDate: date('end_date'),
  maxOccurrences: integer('max_occurrences'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla: group_assistants (asistentes de clase)
export const groupAssistants = pgTable('group_assistants', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  gender: text('gender'), // 'Masculino', 'Femenino', 'Otro'
  age: integer('age'),
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
  orderIndex: integer('order_index').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  enrollmentDate: date('enrollment_date').notNull().default(sql`CURRENT_DATE`),
  status: text('status').notNull().default('active'),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla: group_sessions (calendario de sesiones del grupo)
export const groupSessions = pgTable('group_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  sessionNumber: integer('session_number').notNull(),
  sessionDate: date('session_date').notNull(),
  status: text('status').notNull().default('pendiente'), // 'pendiente' | 'dictada'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla: group_session_topics (temas por sesión/curso - copia independiente)
export const groupSessionTopics = pgTable('group_session_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => groupSessions.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  topicMode: text('topic_mode').notNull(), // 'auto' | 'selected' | 'manual'
  topicTitle: text('topic_title').notNull(),
  topicDescription: text('topic_description'),
  instructorId: uuid('instructor_id').notNull().references(() => instructors.id, { onDelete: 'restrict' }),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla: group_transactions (historial de cambios de estado)
export const groupTransactions = pgTable('group_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  transactionType: text('transaction_type').notNull(),
  description: text('description').notNull(),
  observation: text('observation'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  targetGroupId: uuid('target_group_id').references(() => classGroups.id, { onDelete: 'set null' }),
  transactionDate: timestamp('transaction_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => classSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  status: attendanceStatusEnum('status').notNull(),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// ============================================
// SISTEMA DE ROLES Y PERMISOS
// ============================================

// Tabla: roles (Roles personalizados del sistema)
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla: role_permissions (Permisos por rol y módulo)
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  module: text('module').notNull(), // 'students', 'courses', 'instructors', 'groups', 'attendance', 'counseling', 'enrollments'
  canView: boolean('can_view').notNull().default(false),
  canCreate: boolean('can_create').notNull().default(false),
  canEdit: boolean('can_edit').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueRoleModule: unique('role_permissions_role_module_unique').on(table.roleId, table.module),
}));

// Tabla: user_branch_roles (Usuario → Filial → Rol)
export const userBranchRoles = pgTable('user_branch_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserBranch: unique('user_branch_roles_user_branch_unique').on(table.userId, table.branchId),
}));

// ============================================
// ASESORÍAS FILOSÓFICAS (HISTÓRICO)
// ============================================

// Tabla: philosophical_counseling (Asesorías con datos históricos)
export const philosophicalCounseling = pgTable('philosophical_counseling', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  instructorId: uuid('instructor_id').notNull().references(() => instructors.id, { onDelete: 'restrict' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
  // Datos HISTÓRICOS del grupo (no FK - se mantienen aunque el grupo cambie)
  groupName: text('group_name').notNull(),
  groupCode: text('group_code'),
  counselingDate: date('counseling_date').notNull().default(sql`CURRENT_DATE`),
  indicator: counselingIndicatorEnum('indicator').notNull(),
  observations: text('observations').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxCounselingStudent: index('idx_counseling_student').on(table.studentId),
  idxCounselingDate: index('idx_counseling_date').on(table.counselingDate),
  idxCounselingBranch: index('idx_counseling_branch').on(table.branchId),
}));

// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

// Tabla: system_config (Configuración SMTP y global)
export const systemConfig = pgTable('system_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  configKey: text('config_key').notNull().unique(),
  configValue: text('config_value').notNull(),
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  // OAuth Google para SMTP
  oauthProvider: text('oauth_provider'), // 'google', 'microsoft', etc.
  oauthAccessToken: text('oauth_access_token'),
  oauthRefreshToken: text('oauth_refresh_token'),
  oauthTokenExpiry: timestamp('oauth_token_expiry'),
  oauthEmail: text('oauth_email'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

// ============================================
// RESETEO DE CONTRASEÑA
// ============================================

// Tabla: password_reset_tokens (Tokens temporales para reseteo)
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxResetToken: index('idx_reset_token').on(table.token),
  idxResetExpires: index('idx_reset_expires').on(table.expiresAt),
}));

// ============================================
// PLANTILLAS DE CURSOS (GLOBALES)
// ============================================

// Tabla: course_templates (Plantillas globales sin branchId)
export const courseTemplates = pgTable('course_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla: course_template_topics (Temas de plantilla)
export const courseTemplateTopics = pgTable('course_template_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => courseTemplates.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// UBICACIONES GEOGRÁFICAS (PERÚ)
// ============================================

// Tabla: departments (Departamentos del Perú)
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabla: provinces (Provincias)
export const provinces = pgTable('provinces', {
  id: uuid('id').primaryKey().defaultRandom(),
  departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
  code: text('code'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxProvincesDepartment: index('idx_provinces_department').on(table.departmentId),
}));

// Tabla: districts (Distritos)
export const districts = pgTable('districts', {
  id: uuid('id').primaryKey().defaultRandom(),
  provinceId: uuid('province_id').notNull().references(() => provinces.id, { onDelete: 'cascade' }),
  code: text('code'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxDistrictsProvince: index('idx_districts_province').on(table.provinceId),
}));

// ============================================
// NIVELES ORGANIZACIONALES
// ============================================

// Tabla: levels (Niveles de la organización)
export const levels = pgTable('levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  managerName: text('manager_name'),
  managerPhone: text('manager_phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// FERIADOS
// ============================================

// Enum para tipo de feriado
export const holidayTypeEnum = pgEnum('holiday_type', ['national', 'provincial']);

// Tabla: holidays (Feriados nacionales y provinciales)
export const holidays = pgTable('holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  date: date('date').notNull(),
  year: integer('year').notNull(),
  type: text('type').notNull(), // 'national' | 'provincial'
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxHolidaysYear: index('idx_holidays_year').on(table.year),
  idxHolidaysType: index('idx_holidays_type').on(table.type),
  idxHolidaysDate: index('idx_holidays_date').on(table.date),
}));

// ============================================
// SISTEMA DE ASISTENCIAS
// ============================================

// Tabla: session_attendance (Asistencia de estudiantes por sesión y curso)
export const sessionAttendance = pgTable('session_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => groupSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }), // NULL para retrocompatibilidad
  status: text('status').notNull().default('pendiente'), // 'pendiente' | 'asistio' | 'no_asistio' | 'tarde' | 'justificado' | 'permiso'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSessionStudentCourse: unique('session_attendance_session_student_course_unique').on(table.sessionId, table.studentId, table.courseId),
  idxSessionAttendanceSession: index('idx_session_attendance_session').on(table.sessionId),
  idxSessionAttendanceStudent: index('idx_session_attendance_student').on(table.studentId),
  idxSessionAttendanceCourse: index('idx_session_attendance_course').on(table.courseId),
}));

// Tabla: attendance_observations (Historial de observaciones por asistencia)
export const attendanceObservations = pgTable('attendance_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  attendanceId: uuid('attendance_id').notNull().references(() => sessionAttendance.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxObservationsAttendance: index('idx_observations_attendance').on(table.attendanceId),
}));

// Tabla: session_execution (Ejecución real de la sesión - puede diferir de la planificación)
export const sessionExecution = pgTable('session_execution', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().unique().references(() => groupSessions.id, { onDelete: 'cascade' }),
  actualInstructorId: uuid('actual_instructor_id').references(() => instructors.id, { onDelete: 'set null' }),
  actualAssistantId: uuid('actual_assistant_id').references(() => groupAssistants.id, { onDelete: 'set null' }),
  actualTopic: text('actual_topic'),
  actualDate: date('actual_date').notNull(),
  notes: text('notes'),
  executedBy: uuid('executed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
